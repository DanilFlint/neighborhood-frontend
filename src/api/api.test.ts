// The API runs against native Request/Response without a browser DOM.
// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { createAppStore } from '../app/store';
import { signedIn, signedOut } from '../app/auth';

const tokens = { access_token: 'old', refresh_token: 'refresh-old', expires_in: 900, username: 'user-1' };
const nextTokens = { ...tokens, access_token: 'new', refresh_token: 'refresh-new' };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const NativeRequest = globalThis.Request;
class LocalRequest extends NativeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) { super(typeof input === 'string' ? new URL(input, 'http://localhost:5173') : input, init); }
}
afterEach(() => { vi.unstubAllGlobals(); });

describe('session and API contracts', () => {
  it('should share one rotating refresh across concurrent unauthorized requests', async () => {
    vi.stubGlobal('Request', LocalRequest);
    let refreshCount = 0;
    const fetch = vi.fn(async (request: Request) => {
      if (request.url.endsWith('/auth/refresh')) {
        refreshCount++;
        expect(await request.json()).toEqual({ grant_type: 'refresh_token', refresh_token: 'refresh-old' });
        await new Promise((resolve) => setTimeout(resolve, 25));
        return json(nextTokens);
      }
      return request.headers.get('authorization') === 'Bearer new' ? json({ id: 'user-1' }) : json({}, 401);
    });
    vi.stubGlobal('fetch', fetch);
    const store = createAppStore();
    store.dispatch(signedIn(tokens));
    const results = await Promise.all([
      store.dispatch(api.endpoints.me.initiate()).unwrap(),
      store.dispatch(api.endpoints.profile.initiate('user-1')).unwrap(),
      store.dispatch(api.endpoints.account.initiate()).unwrap(),
    ]);
    expect(results).toHaveLength(3);
    expect(refreshCount).toBe(1);
    expect(store.getState().auth.tokens?.refresh_token).toBe('refresh-new');
    store.dispatch(api.util.resetApiState());
  });
  it('should clear the session after a rejected refresh', async () => {
    vi.stubGlobal('Request', LocalRequest);
    vi.stubGlobal('fetch', vi.fn(async (request: Request) => json({}, request.url.endsWith('/auth/refresh') ? 400 : 401)));
    const store = createAppStore();
    store.dispatch(signedIn(tokens));
    await store.dispatch(api.endpoints.me.initiate());
    expect(store.getState().auth.tokens).toBeNull();
    store.dispatch(api.util.resetApiState());
  });
  it('should not restore a session when logout races with refresh', async () => {
    vi.stubGlobal('Request', LocalRequest);
    const store = createAppStore();
    vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
      if (request.url.endsWith('/auth/refresh')) { store.dispatch(signedOut()); return json(nextTokens); }
      return json({}, 401);
    }));
    store.dispatch(signedIn(tokens));
    await store.dispatch(api.endpoints.me.initiate());
    expect(store.getState().auth.tokens).toBeNull();
    store.dispatch(api.util.resetApiState());
  });
  it('should send the exact Micronaut login and logout request formats', async () => {
    vi.stubGlobal('Request', LocalRequest);
    const bodies: unknown[] = [];
    vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
      bodies.push(await request.json());
      return request.url.endsWith('/logout') ? new Response(null, { status: 204 }) : json(tokens);
    }));
    const store = createAppStore();
    await store.dispatch(api.endpoints.login.initiate({ username: 'user@example.test', password: 'password-1234' })).unwrap();
    await store.dispatch(api.endpoints.logout.initiate('refresh-old')).unwrap();
    expect(bodies).toEqual([{ username: 'user@example.test', password: 'password-1234' }, { refreshToken: 'refresh-old' }]);
    store.dispatch(api.util.resetApiState());
  });
});

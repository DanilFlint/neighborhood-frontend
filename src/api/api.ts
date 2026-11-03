import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { signedIn, signedOut, type AuthState } from '../app/auth';
import type { Address, AddressCandidate, Account, Building, DirectoryItem, Locations, Me, Profile, ProfileRequest, Registration, Search, Service, ServicePage, ServiceRequest, Tokens } from './types';

const rawQuery = fetchBaseQuery({
  baseUrl: '/api/v1',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth: AuthState }).auth.tokens?.access_token;
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});
let refreshPromise: Promise<Awaited<ReturnType<typeof rawQuery>>> | null = null;
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extra) => {
  const session = () => (api.getState() as { auth: AuthState }).auth.tokens;
  const originalToken = session()?.access_token;
  let result = await rawQuery(args, api, extra);
  const url = typeof args === 'string' ? args : args.url;
  if (result.error?.status !== 401 || (url.startsWith('/auth/') && url !== '/auth/me') || !session()) return result;
  if (session()?.access_token !== originalToken) return rawQuery(args, api, extra);
  if (!refreshPromise) {
    const refreshToken = session()!.refresh_token;
    refreshPromise = (async () => {
      const refreshed = await rawQuery({ url: '/auth/refresh', method: 'POST', body: {
        grant_type: 'refresh_token', refresh_token: refreshToken,
      } }, api, extra);
      // A late refresh must not restore a session after logout or replace a new login.
      if (session()?.refresh_token === refreshToken) {
        if (refreshed.data) api.dispatch(signedIn(refreshed.data as Tokens));
        else if (refreshed.error?.status === 400 || refreshed.error?.status === 401) api.dispatch(signedOut());
      }
      return refreshed;
    })().finally(() => { refreshPromise = null; });
  }
  const refreshed = await refreshPromise;
  if (refreshed.data && session()) result = await rawQuery(args, api, extra);
  else if (refreshed.error) return { error: refreshed.error };
  return result;
};

export const api = createApi({
  reducerPath: 'neighborhoodApi', baseQuery, tagTypes: ['Me', 'Profile', 'Services'],
  endpoints: (build) => ({
    searchAddresses: build.query<AddressCandidate[], string>({ query: (q) => ({ url: '/addresses/search', params: { q } }), keepUnusedDataFor: 0 }),
    reverseAddress: build.query<AddressCandidate[], { latitude: number; longitude: number }>({ query: (params) => ({ url: '/addresses/reverse', params }), keepUnusedDataFor: 0 }),
    address: build.query<Address, string>({ query: (id) => `/addresses/${id}` }),
    selectAddress: build.mutation<Address, string>({ query: (key) => ({ url: '/addresses/select', method: 'POST', body: { key } }) }),
    health: build.query<{ status: string }, void>({ query: () => '/health' }),
    complexes: build.query<DirectoryItem[], void>({ query: () => '/residential-complexes' }),
    buildings: build.query<Building[], string>({ query: (id) => `/residential-complexes/${id}/buildings` }),
    categories: build.query<DirectoryItem[], void>({ query: () => '/categories' }),
    services: build.query<ServicePage, Search>({ query: (params) => ({ url: '/services', params }), providesTags: ['Services'] }),
    service: build.query<Service, string>({ query: (id) => `/services/${id}`, providesTags: ['Services'] }),
    userServices: build.query<ServicePage, { id: string; page: number }>({
      query: ({ id, page }) => ({ url: `/users/${id}/services`, params: { page, size: 12 } }), providesTags: ['Services'],
    }),
    profile: build.query<Profile, string>({ query: (id) => `/users/${id}`, providesTags: ['Profile'] }),
    me: build.query<Me, void>({ query: () => '/me', providesTags: ['Me'] }),
    account: build.query<Account, void>({ query: () => '/auth/me', providesTags: ['Me'] }),
    register: build.mutation<Account, Registration>({ query: (body) => ({ url: '/auth/register', method: 'POST', body }) }),
    login: build.mutation<Tokens, { username: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    logout: build.mutation<void, string>({ query: (refreshToken) => ({ url: '/auth/logout', method: 'POST', body: { refreshToken } }) }),
    saveProfile: build.mutation<Profile, ProfileRequest>({
      query: (body) => ({ url: '/me', method: 'PUT', body }), invalidatesTags: ['Me', 'Profile', 'Services'],
    }),
    saveLocations: build.mutation<Locations, Locations>({
      query: (body) => ({ url: '/me/locations', method: 'PUT', body }), invalidatesTags: ['Me', 'Profile'],
    }),
    createService: build.mutation<Service, ServiceRequest>({
      query: (body) => ({ url: '/services', method: 'POST', body }), invalidatesTags: ['Services'],
    }),
    updateService: build.mutation<Service, { id: string; body: ServiceRequest }>({
      query: ({ id, body }) => ({ url: `/services/${id}`, method: 'PUT', body }), invalidatesTags: ['Services'],
    }),
  }),
});

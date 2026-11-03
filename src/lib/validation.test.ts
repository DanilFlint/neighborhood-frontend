import { describe, expect, it } from 'vitest';
import { errorText, isContact, isHttps, isPassword, photoLines } from './validation';

describe('backend-compatible validation', () => {
  it('should validate UTF-8 byte length without trimming a password', () => {
    expect(isPassword('a'.repeat(12))).toBe(true);
    expect(isPassword('a'.repeat(11))).toBe(false);
    expect(isPassword('я'.repeat(36))).toBe(true);
    expect(isPassword('я'.repeat(37))).toBe(false);
    expect(isPassword(' '.repeat(12))).toBe(false);
    expect(isPassword(' pass word  ')).toBe(true);
  });
  it('should reject unsafe contact links and accept backend-supported paths', () => {
    expect(isContact('TELEGRAM', 'https://t.me/a')).toBe(true);
    expect(isContact('WHATSAPP', 'https://wa.me/79991234567')).toBe(true);
    for (const url of ['http://t.me/person', 'https://t.me.evil.test/person', 'https://user@t.me/person', 'https://t.me/person?x=y', 'https://t.me/person#x', 'javascript:alert(1)', 'https://t.me:8443/person']) {
      expect(isContact('TELEGRAM', url), url).toBe(false);
    }
    expect(isContact('WHATSAPP', 'https://wa.me/012345')).toBe(false);
    expect(isContact('WHATSAPP', 'https://wa.me/1234')).toBe(false);
  });
  it('should preserve photo order and omit empty lines', () => {
    expect(photoLines(' https://a.test/1\r\n\nhttps://a.test/2 ')).toEqual(['https://a.test/1', 'https://a.test/2']);
    expect(photoLines()).toEqual([]);
    expect(isHttps('http://a.test')).toBe(false);
    expect(isHttps('https://a.test/photo')).toBe(true);
  });
  it('should translate HTTP errors without exposing server messages', () => {
    expect(errorText({ status: 500, data: { message: 'private database details' } })).not.toContain('private');
    expect(errorText({ status: 409 })).toContain('email');
    expect(errorText({ status: 'FETCH_ERROR' })).toContain('Нет связи');
  });
});

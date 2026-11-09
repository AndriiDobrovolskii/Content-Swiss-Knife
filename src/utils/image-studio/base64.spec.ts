/**
 * US-10.5 T19 - the shared base64 helpers the two new services use (plan DD-9, section 7).
 *
 * PINNED CONTRACT (src/utils/image-studio/base64.ts, owner T19; pure, no `window.` / `document.`: architecture scan g):
 *   toBase64(bytes: Uint8Array): string        standard alphabet with padding
 *   fromBase64(data: string): Uint8Array
 * Logic runner. Red until T19.
 */
import { describe, it, expect } from 'vitest';
import { toBase64, fromBase64 } from './base64';

describe('base64 helpers: known vectors and round trips (T19)', () => {
  it.each([
    ['', ''], ['f', 'Zg=='], ['fo', 'Zm8='], ['foo', 'Zm9v'], ['foob', 'Zm9vYg=='], ['fooba', 'Zm9vYmE='], ['foobar', 'Zm9vYmFy'],
  ])('RFC 4648 vector %j encodes to %j and decodes back', (plain, encoded) => {
    const bytes = Uint8Array.from(Array.from(plain, (c) => c.charCodeAt(0)));
    expect(toBase64(bytes)).toBe(encoded);
    expect(Array.from(fromBase64(encoded))).toEqual(Array.from(bytes));
  });

  it('round-trips every byte value 0..255', () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect(Array.from(fromBase64(toBase64(bytes)))).toEqual(Array.from(bytes));
  });

  it('round-trips a 300 000-byte buffer without overflowing the call stack (image-sized input)', () => {
    const bytes = Uint8Array.from({ length: 300_000 }, (_, i) => (i * 31) & 255);
    const back = fromBase64(toBase64(bytes));
    expect(back.length).toBe(bytes.length);
    expect(back[0]).toBe(bytes[0]);
    expect(back[299_999]).toBe(bytes[299_999]);
    expect(back.every((b, i) => b === bytes[i])).toBe(true);
  });

  it('decodes to an empty array for an empty string', () => {
    expect(fromBase64('').length).toBe(0);
  });
});

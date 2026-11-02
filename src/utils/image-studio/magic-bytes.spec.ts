/**
 * magic-bytes.spec.ts - US-10.1 T21, client half (FR-9, FR-15, AC-2, D-19).
 *
 * The client identifies the user's file by its LEADING BYTES, never by name or extension, before it is decoded
 * (D-19: "the input image is identified by the magic bytes of the file as the user supplied it"). The BFF has its own
 * second implementation of the same four-line rule (T9); `test/image-studio/magic-bytes.parity.spec.ts` runs one
 * shared fixture table against both.
 *
 * PINNED CONTRACT
 *   src/utils/image-studio/magic-bytes.ts  exports  detectImageType(bytes: Uint8Array): 'image/png' | 'image/jpeg' | 'image/webp' | null
 *   (the MIME type is `image/jpeg` for JPG - SD-40: there is no `image/jpg`; null = not an accepted image).
 *
 * Fixtures: MAGIC_FIXTURES from the shared helper (PNG, two JPG markers, WEBP, GIF, RIFF/WAV, three truncated headers,
 * empty, text pretending to be a PNG). Not asserted: that a decodable file is accepted (the codec's job, T23).
 */
import { describe, it, expect } from 'vitest';
import { MAGIC_FIXTURES, PNG_MAGIC, padTo, makeRaster } from '../../../test/image-studio/helpers/fakes';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);

describe('detectImageType (FR-9, AC-2)', () => {
  it.each(MAGIC_FIXTURES.map((f) => [f.name, f] as const))('FR-9 / AC-2: %s', async (_name, fixture) => {
    const { detectImageType } = await load('./magic-bytes');
    expect(detectImageType(fixture.bytes)).toBe(fixture.expected);
  });

  it('AC-2: the answer comes from the bytes alone - a text file named .png is rejected and a PNG named .txt is accepted', async () => {
    const { detectImageType } = await load('./magic-bytes');
    const textBytes = new TextEncoder().encode('<html>this is not a PNG</html>');
    expect(detectImageType(textBytes)).toBeNull();
    expect(detectImageType(padTo(PNG_MAGIC, 16))).toBe('image/png');
  });

  it('FR-9: JPG is reported as image/jpeg (SD-40) for any FF D8 FF marker byte', async () => {
    const { detectImageType } = await load('./magic-bytes');
    for (const marker of [0xe0, 0xe1, 0xdb, 0xee]) {
      expect(detectImageType(padTo([0xff, 0xd8, 0xff, marker], 16)), marker.toString(16)).toBe('image/jpeg');
    }
  });

  it('FR-9: a WEBP needs BOTH "RIFF" at offset 0 and "WEBP" at offset 8 - the RIFF size field in between is ignored', async () => {
    const { detectImageType } = await load('./magic-bytes');
    const riff = [0x52, 0x49, 0x46, 0x46];
    const webp = [0x57, 0x45, 0x42, 0x50];
    expect(detectImageType(padTo([...riff, 0xff, 0xff, 0xff, 0x7f, ...webp], 20))).toBe('image/webp');
    expect(detectImageType(padTo([...riff, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x51], 20))).toBeNull(); // WEBQ
    expect(detectImageType(padTo([0x58, 0x49, 0x46, 0x46, 0, 0, 0, 0, ...webp], 20))).toBeNull(); // XIFF
  });

  it('FR-9: the check reads the start of the bytes only - a PNG signature later in the file does not count', async () => {
    const { detectImageType } = await load('./magic-bytes');
    const shifted = new Uint8Array([0, ...PNG_MAGIC, 1, 2, 3]);
    expect(detectImageType(shifted)).toBeNull();
  });

  it('FR-9: works on a subarray view (a non-zero byteOffset) and on the fake codec output', async () => {
    const { detectImageType } = await load('./magic-bytes');
    const backing = new Uint8Array([9, 9, 9, ...PNG_MAGIC, 0, 0, 0, 0]);
    expect(detectImageType(backing.subarray(3))).toBe('image/png');
    expect(detectImageType(makeRaster({ format: 'jpg', width: 3, height: 3 }))).toBe('image/jpeg');
    expect(detectImageType(makeRaster({ format: 'webp', width: 3, height: 3 }))).toBe('image/webp');
  });

  it('FR-15: it never throws on hostile input (empty, one byte)', async () => {
    const { detectImageType } = await load('./magic-bytes');
    expect(() => detectImageType(new Uint8Array(0))).not.toThrow();
    expect(detectImageType(new Uint8Array([0x89]))).toBeNull();
  });
});

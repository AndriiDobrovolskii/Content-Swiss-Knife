// @vitest-environment node
/**
 * US-10.1 T9 - BFF magic-byte image detection (FR-9 BFF half, AC-2; plan DD-20).
 *
 * PINNED CONTRACT (server/image-studio/magic-bytes.js):
 *   detectImageType(bytes: Uint8Array | Buffer) -> 'image/png' | 'image/jpeg' | 'image/webp' | null
 *   Decided from the LEADING BYTES only: PNG 89 50 4E 47 0D 0A 1A 0A; JPG FF D8 FF; WEBP = "RIFF" at 0 and "WEBP" at 8.
 *   The BFF never trusts a claimed MIME or a file name: the function takes bytes only, and the upload response carries
 *   the DETECTED type (that wiring is asserted in upload-handler.spec.ts).
 *   The same MAGIC_FIXTURES table is run against the client detector in src/utils/image-studio/magic-bytes.spec.ts and
 *   test/image-studio/magic-bytes.parity.spec.ts (T21).
 */
import { describe, it, expect } from 'vitest';
import { MAGIC_FIXTURES, makeRaster, PNG_MAGIC } from './helpers/fakes';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const path = '../../server/image-studio/magic-bytes.js';

describe('detectImageType (BFF)', () => {
  for (const f of MAGIC_FIXTURES) {
    it(`FR-9 / AC-2: ${f.name} -> ${f.expected ?? 'not an accepted image (null)'}`, async () => {
      const { detectImageType } = await load(path);
      expect(detectImageType(f.bytes)).toBe(f.expected);
    });
  }

  it('AC-2: a Node Buffer is accepted the same way as a Uint8Array', async () => {
    const { detectImageType } = await load(path);
    expect(detectImageType(Buffer.from(MAGIC_FIXTURES[0].bytes))).toBe('image/png');
    expect(detectImageType(Buffer.from(MAGIC_FIXTURES[3].bytes))).toBe('image/webp');
  });

  it('AC-2 / FR-9: a file "named .png" whose bytes are not PNG is not detected (the extension is never an input)', async () => {
    const { detectImageType } = await load(path);
    const gifNamedPng = new Uint8Array([...'GIF89a'].map((c) => c.charCodeAt(0)).concat(new Array(26).fill(0)));
    expect(detectImageType(gifNamedPng)).toBeNull();
    // The function has exactly one parameter: there is nowhere to pass a name or a claimed MIME.
    expect(detectImageType.length).toBe(1);
  });

  it('FR-9: only the leading bytes decide - a valid PNG signature followed by arbitrary data is still PNG', async () => {
    const { detectImageType } = await load(path);
    expect(detectImageType(makeRaster({ format: 'png', width: 3, height: 3, exif: true }))).toBe('image/png');
    expect(detectImageType(makeRaster({ format: 'jpg', width: 3, height: 3 }))).toBe('image/jpeg');
    expect(detectImageType(makeRaster({ format: 'webp', width: 3, height: 3, animated: true }))).toBe('image/webp');
  });

  it('FR-9: a PNG signature that is off by one byte is rejected', async () => {
    const { detectImageType } = await load(path);
    const bad = new Uint8Array(32);
    bad.set(PNG_MAGIC, 0);
    bad[7] = 0x0b; // last signature byte wrong
    expect(detectImageType(bad)).toBeNull();
  });

  it('FR-9: a signature that appears only LATER in the buffer is not detected', async () => {
    const { detectImageType } = await load(path);
    const shifted = new Uint8Array(40);
    shifted.set(PNG_MAGIC, 4);
    expect(detectImageType(shifted)).toBeNull();
  });
});

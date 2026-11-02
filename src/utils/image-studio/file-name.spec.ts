/**
 * file-name.spec.ts - US-10.1 T25 (FR-56, AC-33, SD-14, SD-39, SD-40).
 *
 * The download file name is `{product-name}_v{N}_{ratio}.{ext}`, e.g. `bambu-lab-h2d_v3_1x1.webp`: the product name
 * lower-cased with each run of characters not valid in a file name replaced by ONE hyphen (SD-14), `image` when the
 * name sanitizes to nothing, the ratio with `x` for the colon, N the version number within the CURRENT session, and the
 * extension of the DELIVERED format (`png`, `jpg`, `webp` - never `jpeg`, SD-39 / SD-40).
 *
 * PINNED CONTRACT (src/utils/image-studio/file-name.ts)
 *   buildFileName({ productName, versionNumber, aspectRatio, mimeType }) => string
 *     mimeType is the MIME of the file being delivered ('image/png' | 'image/jpeg' | 'image/webp'); any other value throws.
 *
 * Deliberately NOT asserted (the Specification does not say, so asserting it would invent a rule): how non-ASCII letters
 * such as Cyrillic are treated, and whether an underscore inside the product name survives. SD-14 fixes only the
 * lower-casing, the hyphen replacement of invalid-character runs and the `image` fallback; the tests below stay inside
 * that, plus the safety floor any file name needs (no path separators, no Windows-reserved characters, no control
 * characters, no leading dot).
 */
import { describe, it, expect } from 'vitest';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);

const base = { productName: 'Bambu Lab H2D', versionNumber: 3, aspectRatio: '1:1', mimeType: 'image/webp' };
const SAFE = /^[^<>:"/\\|?*\u0000-\u001f]+\.(png|jpg|webp)$/;

describe('buildFileName - the AC-33 example and the extension rule (FR-56, SD-39, SD-40)', () => {
  it('AC-33: "Bambu Lab H2D", v3, 1:1, WEBP gives bambu-lab-h2d_v3_1x1.webp', async () => {
    const { buildFileName } = await load('./file-name');
    expect(buildFileName(base)).toBe('bambu-lab-h2d_v3_1x1.webp');
  });

  it('SD-39: the extension follows the delivered format - png, jpg (never jpeg), webp', async () => {
    const { buildFileName } = await load('./file-name');
    expect(buildFileName({ ...base, mimeType: 'image/png' })).toBe('bambu-lab-h2d_v3_1x1.png');
    expect(buildFileName({ ...base, mimeType: 'image/jpeg' })).toBe('bambu-lab-h2d_v3_1x1.jpg');
    expect(buildFileName({ ...base, mimeType: 'image/webp' })).toBe('bambu-lab-h2d_v3_1x1.webp');
    expect(buildFileName({ ...base, mimeType: 'image/jpeg' })).not.toContain('.jpeg');
  });

  it('SD-40: a MIME type that is not one of the three delivered formats is a programming error', async () => {
    const { buildFileName } = await load('./file-name');
    for (const mimeType of ['image/gif', 'image/jpg', 'text/plain', '', undefined]) {
      expect(() => buildFileName({ ...base, mimeType }), String(mimeType)).toThrow();
    }
  });
});

describe('buildFileName - ratio and version number (FR-56, FR-23)', () => {
  it('FR-56: the colon of the aspect ratio is written as x for every offered ratio', async () => {
    const { buildFileName } = await load('./file-name');
    const expected: Record<string, string> = { '1:1': '1x1', '4:3': '4x3', '3:4': '3x4', '4:5': '4x5', '16:9': '16x9', '9:16': '9x16' };
    for (const [ratio, x] of Object.entries(expected)) {
      expect(buildFileName({ ...base, aspectRatio: ratio }), ratio).toBe(`bambu-lab-h2d_v3_${x}.webp`);
    }
  });

  it('FR-56 / FR-23: N is the version number as given - per session, gaps allowed, multi-digit numbers intact', async () => {
    const { buildFileName } = await load('./file-name');
    expect(buildFileName({ ...base, versionNumber: 1 })).toContain('_v1_');
    expect(buildFileName({ ...base, versionNumber: 5 })).toContain('_v5_');
    expect(buildFileName({ ...base, versionNumber: 12 })).toContain('_v12_');
    expect(buildFileName({ ...base, versionNumber: 103 })).toContain('_v103_');
  });

  it('FR-56: two sessions that both hold a "v1" produce the same name for the same product - the number is not made globally unique', async () => {
    const { buildFileName } = await load('./file-name');
    const a = buildFileName({ ...base, versionNumber: 1 });
    const b = buildFileName({ ...base, versionNumber: 1 });
    expect(a).toBe(b);
  });
});

describe('buildFileName - product name sanitising (SD-14)', () => {
  it('SD-14: the name is lower-cased', async () => {
    const { buildFileName } = await load('./file-name');
    expect(buildFileName({ ...base, productName: 'PRUSA MK4S' })).toBe('prusa-mk4s_v3_1x1.webp');
  });

  it('SD-14: each RUN of invalid characters becomes exactly one hyphen', async () => {
    const { buildFileName } = await load('./file-name');
    expect(buildFileName({ ...base, productName: 'Bambu   Lab' })).toBe('bambu-lab_v3_1x1.webp');
    expect(buildFileName({ ...base, productName: 'Bambu Lab / H2D' })).toBe('bambu-lab-h2d_v3_1x1.webp');
    expect(buildFileName({ ...base, productName: 'Bambu: Lab*? H2D' })).toBe('bambu-lab-h2d_v3_1x1.webp');
  });

  it('SD-14: leading and trailing invalid characters leave no leading or trailing hyphen', async () => {
    const { buildFileName } = await load('./file-name');
    expect(buildFileName({ ...base, productName: '  H2D!  ' })).toBe('h2d_v3_1x1.webp');
    expect(buildFileName({ ...base, productName: '***H2D***' })).toBe('h2d_v3_1x1.webp');
  });

  it('FR-56 failure path: a name that sanitizes to an empty string uses "image"', async () => {
    const { buildFileName } = await load('./file-name');
    for (const productName of ['', '   ', '***', '/\\:*?"<>|', '...', ' - ']) {
      expect(buildFileName({ ...base, productName }), JSON.stringify(productName)).toBe('image_v3_1x1.webp');
    }
  });

  it('FR-56 (AC-33 "otherwise image is used"): an undefined or null product name also uses "image"', async () => {
    const { buildFileName } = await load('./file-name');
    expect(buildFileName({ ...base, productName: undefined })).toBe('image_v3_1x1.webp');
    expect(buildFileName({ ...base, productName: null })).toBe('image_v3_1x1.webp');
  });

  it('SD-14: path separators and traversal sequences can never survive into the name', async () => {
    const { buildFileName } = await load('./file-name');
    for (const productName of ['../../etc/passwd', '..\\..\\windows\\system32', '/abs/path', 'C:\\temp\\x', '.hidden', '..']) {
      const out = buildFileName({ ...base, productName });
      expect(out, productName).toMatch(SAFE);
      expect(out, productName).not.toContain('..');
      expect(out.startsWith('.'), productName).toBe(false);
      expect(out, productName).not.toMatch(/[\\/]/);
    }
  });

  it('SD-14: Windows-reserved and control characters never appear in the result', async () => {
    const { buildFileName } = await load('./file-name');
    const out = buildFileName({ ...base, productName: 'a<b>c:d"e/f\\g|h?i*j\u0000k\u001fl\tm\nn' });
    expect(out).toMatch(SAFE);
    expect(out.startsWith('a-b-c-d-e-f-g-h-i-j-k-l-m-n_v3_1x1')).toBe(true);
  });

  it('FR-56: an ordinary name keeps its letters and digits and the file name always matches {name}_v{N}_{W}x{H}.{ext}', async () => {
    const { buildFileName } = await load('./file-name');
    for (const productName of ['Creality K1 Max', 'Elegoo Saturn 4 Ultra', 'a', 'X1C']) {
      expect(buildFileName({ ...base, productName })).toMatch(/^[a-z0-9-]+_v3_1x1\.webp$/);
    }
  });
});

/**
 * upload-rules.spec.ts - US-10.1 T22 (FR-10, FR-11, FR-12, SD-25, D-7, N-7, AC-3, AC-4, AC-7).
 *
 * Two pure rules, written from the FR-11 decision table and FR-10, not from the implementation:
 *   1. the FR-11 table over (longSide, size) - four mutually exclusive rows, "5 MB" = 5 242 880 B (SD-25);
 *   2. the count rule - at most five USER uploads per message; the version attached under FR-37 is outside the five.
 *
 * PINNED CONTRACT (src/utils/image-studio/upload-rules.ts; the plan names the file, not the symbols)
 *   MAX_LONG_SIDE = 2048,  MAX_UPLOAD_BYTES = 5_242_880,  MAX_UPLOADS = 5
 *   decideUpload({ longSide, size }) =>
 *       { row: 1|2|3|4; accept: boolean; downscale: boolean; reason?: 'T-2' }
 *       row 1 L<=2048 S<=5MB : accept, no downscale (the EXIF re-encode still runs - the ingest pipeline's job)
 *       row 2 L<=2048 S>5MB  : reject T-2, no downscale
 *       row 3 L>2048  S<=5MB : accept, downscale to 2048
 *       row 4 L>2048  S>5MB  : accept, downscale to 2048 (the sent bytes are then checked, D-7)
 *     Throws RangeError for a non-finite / non-positive longSide or a non-finite / negative size (a decoded image
 *     always has L >= 1; an undecodable file never reaches this table - N-7).
 *   checkSentBytes(size) => { ok: true } | { ok: false, reason: 'T-2' }     D-7: the SENT (re-encoded) bytes, <= 5 MB
 *   canAttachUpload(attachments: Array<{ kind: 'upload' | 'version' }>) => { ok: true } | { ok: false, reason: 'T-3' }
 *   countUploads(attachments) => number                                      counts kind === 'upload' only
 *
 * The reason strings are studio text ids (CONTRACT.md): T-2 size, T-3 count. T-1 (format / undecodable) is decided
 * before this table is consulted (N-7: decode failure is T-1 whatever the size) and belongs to the ingest pipeline.
 */
import { describe, it, expect } from 'vitest';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);

const MB5 = 5_242_880;

describe('constants (SD-25, FR-10, FR-11)', () => {
  it('SD-25 / FR-11 / FR-10: 5 MB is 5 242 880 B (1024-based), the long-side limit is 2048 px and the upload limit is 5', async () => {
    const m = await load('./upload-rules');
    expect(m.MAX_UPLOAD_BYTES).toBe(5_242_880);
    expect(m.MAX_LONG_SIDE).toBe(2048);
    expect(m.MAX_UPLOADS).toBe(5);
  });
});

describe('decideUpload - the FR-11 decision table, each row once (AC-4)', () => {
  it('FR-11 row 1: long side <= 2048 and size <= 5 MB is accepted, not downscaled', async () => {
    const { decideUpload } = await load('./upload-rules');
    expect(decideUpload({ longSide: 1200, size: 800_000 })).toEqual({ row: 1, accept: true, downscale: false });
  });

  it('FR-11 / FR-12 row 2: long side <= 2048 and size > 5 MB is rejected with T-2 and NOT downscaled (never silently re-encoded)', async () => {
    const { decideUpload } = await load('./upload-rules');
    const d = decideUpload({ longSide: 1500, size: 6_000_000 });
    expect(d.row).toBe(2);
    expect(d.accept).toBe(false);
    expect(d.downscale).toBe(false);
    expect(d.reason).toBe('T-2');
  });

  it('FR-11 row 3: long side > 2048 and size <= 5 MB is accepted and downscaled', async () => {
    const { decideUpload } = await load('./upload-rules');
    expect(decideUpload({ longSide: 4000, size: 3_000_000 })).toEqual({ row: 3, accept: true, downscale: true });
  });

  it('FR-11 row 4: long side > 2048 and size > 5 MB is accepted and downscaled (the sent bytes are checked afterwards, D-7)', async () => {
    const { decideUpload } = await load('./upload-rules');
    expect(decideUpload({ longSide: 6000, size: 12_000_000 })).toEqual({ row: 4, accept: true, downscale: true });
  });
});

describe('decideUpload - the boundaries (AC-4, SD-25)', () => {
  it('FR-11: L = 2048 is NOT over the limit (no downscale); L = 2049 is (downscale)', async () => {
    const { decideUpload } = await load('./upload-rules');
    expect(decideUpload({ longSide: 2048, size: 1000 }).downscale).toBe(false);
    expect(decideUpload({ longSide: 2048, size: 1000 }).row).toBe(1);
    expect(decideUpload({ longSide: 2049, size: 1000 }).downscale).toBe(true);
    expect(decideUpload({ longSide: 2049, size: 1000 }).row).toBe(3);
  });

  it('SD-25: S = 5 242 880 B is "at most 5 MB" (accepted); S = 5 242 881 B is "over 5 MB" (rejected at L <= 2048)', async () => {
    const { decideUpload } = await load('./upload-rules');
    expect(decideUpload({ longSide: 2048, size: 5_242_880 })).toEqual({ row: 1, accept: true, downscale: false });
    const over = decideUpload({ longSide: 2048, size: 5_242_881 });
    expect(over.row).toBe(2);
    expect(over.accept).toBe(false);
    expect(over.reason).toBe('T-2');
  });

  it('SD-25: S = 5 000 000 B (a decimal 5 MB) is at most 5 MB under the 1024-based reading', async () => {
    const { decideUpload } = await load('./upload-rules');
    expect(decideUpload({ longSide: 2000, size: 5_000_000 })).toEqual({ row: 1, accept: true, downscale: false });
  });

  it('FR-11: the two boundaries combine - (2049, 5 242 880) is row 3, (2049, 5 242 881) is row 4, (2048, 5 242 881) is row 2', async () => {
    const { decideUpload } = await load('./upload-rules');
    expect(decideUpload({ longSide: 2049, size: 5_242_880 }).row).toBe(3);
    expect(decideUpload({ longSide: 2049, size: 5_242_881 }).row).toBe(4);
    expect(decideUpload({ longSide: 2048, size: 5_242_881 }).row).toBe(2);
  });

  it('FR-11: every (long side, size) pair lands in exactly one row and only row 2 rejects', async () => {
    const { decideUpload } = await load('./upload-rules');
    const sides = [1, 2047, 2048, 2049, 8000];
    const sizes = [0, 1, 5_000_000, MB5, MB5 + 1, 30_000_000];
    for (const longSide of sides) {
      for (const size of sizes) {
        const d = decideUpload({ longSide, size });
        const expectedRow = longSide <= 2048 ? (size <= MB5 ? 1 : 2) : (size <= MB5 ? 3 : 4);
        expect(d.row, `${longSide}x${size}`).toBe(expectedRow);
        expect(d.accept, `${longSide}x${size}`).toBe(expectedRow !== 2);
        expect(d.downscale, `${longSide}x${size}`).toBe(longSide > 2048);
      }
    }
  });

  it('N-7: a long side that cannot be determined (NaN, 0, negative, Infinity) is a programming error, not a silent accept', async () => {
    const { decideUpload } = await load('./upload-rules');
    for (const longSide of [Number.NaN, 0, -5, Number.POSITIVE_INFINITY]) {
      expect(() => decideUpload({ longSide, size: 1000 }), String(longSide)).toThrow(RangeError);
    }
    expect(() => decideUpload({ longSide: 100, size: -1 })).toThrow(RangeError);
    expect(() => decideUpload({ longSide: 100, size: Number.NaN })).toThrow(RangeError);
  });
});

describe('checkSentBytes - the D-7 check on the re-encoded bytes (AC-4, AC-7)', () => {
  it('D-7: at most 5 242 880 B passes, 5 242 881 B is rejected with T-2', async () => {
    const { checkSentBytes } = await load('./upload-rules');
    expect(checkSentBytes(0)).toEqual({ ok: true });
    expect(checkSentBytes(5_242_880)).toEqual({ ok: true });
    expect(checkSentBytes(5_242_881)).toEqual({ ok: false, reason: 'T-2' });
    expect(checkSentBytes(30_000_000)).toEqual({ ok: false, reason: 'T-2' });
  });
});

describe('count rule (FR-10, AC-3)', () => {
  const uploads = (n: number) => Array.from({ length: n }, () => ({ kind: 'upload' as const }));
  const version = { kind: 'version' as const };

  it('FR-10: countUploads counts user uploads only - the attached version is not one of the five', async () => {
    const { countUploads } = await load('./upload-rules');
    expect(countUploads([])).toBe(0);
    expect(countUploads([...uploads(3), version])).toBe(3);
    expect(countUploads([version])).toBe(0);
  });

  it('AC-3: the first five uploads are accepted', async () => {
    const { canAttachUpload } = await load('./upload-rules');
    for (let have = 0; have < 5; have++) expect(canAttachUpload(uploads(have)), `${have} attached`).toEqual({ ok: true });
  });

  it('AC-3 / FR-10: the 6th upload is refused with the count reason T-3', async () => {
    const { canAttachUpload } = await load('./upload-rules');
    expect(canAttachUpload(uploads(5))).toEqual({ ok: false, reason: 'T-3' });
    expect(canAttachUpload(uploads(7))).toEqual({ ok: false, reason: 'T-3' });
  });

  it('FR-10 (OD-28 C-28.1): the attached version does not take a slot - 4 uploads + version accept a 5th, 5 uploads + version refuse a 6th', async () => {
    const { canAttachUpload } = await load('./upload-rules');
    expect(canAttachUpload([...uploads(4), version])).toEqual({ ok: true });
    expect(canAttachUpload([...uploads(5), version])).toEqual({ ok: false, reason: 'T-3' });
  });

  it('FR-10: an attached version alone never makes an upload count-refused', async () => {
    const { canAttachUpload } = await load('./upload-rules');
    expect(canAttachUpload([version])).toEqual({ ok: true });
  });

  it('AC-7 / FR-15: refusing the 6th returns a decision and leaves the list untouched (the other files remain attached)', async () => {
    const { canAttachUpload } = await load('./upload-rules');
    const list = uploads(5);
    const copy = structuredClone(list);
    canAttachUpload(list);
    expect(list).toEqual(copy);
  });
});

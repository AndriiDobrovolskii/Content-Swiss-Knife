/**
 * delivery.spec.ts - US-10.1 T26 (FR-54, FR-55, FR-57, FR-82 cases i-vi and x-xii, AC-31, AC-34).
 *
 * The real canvas half (white fill really white, WEBP really encodes, JPG really quality 90) is NOT provable here
 * (W-2 / V-8 / proposed V-10). These tests prove the PLUMBING against the fake codec of test/image-studio/helpers/fakes.ts:
 * identity with zero codec calls when formats are equal, and otherwise exactly one transcode carrying the right parameters
 * (target MIME, quality 90 for JPG/WEBP, fillWhite for JPG only, no maxLongSide so the native size is kept, no quality
 * for lossless PNG). The fake codec scales only when maxLongSide is passed and drops EXIF, so "dimensions equal the
 * source" is a real consequence of not passing maxLongSide.
 *
 * PINNED CONTRACT (src/utils/image-studio/delivery.ts):
 *   deliver(version: { bytes: Uint8Array; mime: ImageMime }, targetMime: ImageMime, deps: { codec: ImageCodec })
 *     : Promise<{ bytes: Uint8Array; mime: string; converted: boolean }>
 *       - S equals T: resolves { bytes: <the SAME array instance>, mime: T, converted: false }, ZERO codec calls
 *       - S differs: exactly ONE codec.transcode({ bytes, targetMime, quality?, fillWhite? }) (never maxLongSide);
 *         resolves { bytes: <codec output>, mime: <codec output mime>, converted: true }
 *       - failures REJECT with an Error whose name is 'DeliveryError' and whose `kind` is one of
 *         'bytes-unavailable' (no/empty bytes, FR-54 failure path), 'conversion-failed' (codec rejected, FR-55),
 *         'wrong-output-type' (codec returned another MIME than requested). Never a silent fallback to the source bytes.
 *   deliverForClipboard(version, deps): same result shape, target ALWAYS 'image/png' (FR-57); identity when already PNG.
 *
 * Deliberately NOT asserted: pixel values of a real canvas; the file name (file-name.spec.ts); the downloaded flag
 * (store / component specs).
 */
import { describe, it, expect } from 'vitest';
import { makeFakeCodec, makeRaster, decodeRaster, PNG_MAGIC, JPG_MAGIC, webpMagic } from '../../../test/image-studio/helpers/fakes';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const PNG = 'image/png';
const JPG = 'image/jpeg';
const WEBP = 'image/webp';
const FORMAT = { [PNG]: 'png', [JPG]: 'jpg', [WEBP]: 'webp' } as const;

/** A non-square, non-trivial size so "never resized" cannot pass by accident. */
const W = 4096;
const H = 2304;
const source = (mime: string, extra: Record<string, unknown> = {}) =>
  makeRaster({ format: FORMAT[mime as keyof typeof FORMAT], width: W, height: H, ...extra });

const startsWith = (bytes: Uint8Array, head: number[]) => head.every((b, i) => bytes[i] === b);

describe('FR-82 (i) / FR-54 / AC-31: equal formats deliver the API bytes untouched', () => {
  for (const mime of [PNG, JPG, WEBP]) {
    it(`FR-82 (i) / AC-31: ${mime} source with target ${mime} returns the identical bytes and calls no encoder`, async () => {
      const { deliver } = await load('./delivery');
      const codec = makeFakeCodec();
      const bytes = source(mime);
      const out = await deliver({ bytes, mime }, mime, { codec });
      expect(out.bytes).toBe(bytes); // same instance: no decode, no re-encode
      expect(out.mime).toBe(mime);
      expect(out.converted).toBe(false);
      expect(codec.calls).toHaveLength(0);
    });
  }
});

describe('FR-82 cross conversions: one transcode, native size, right parameters', () => {
  it('FR-82 (ii) / FR-55: PNG (transparent) to JPG calls transcode once with quality 90 and fillWhite, no maxLongSide; output is a JPG of the source size', async () => {
    const { deliver } = await load('./delivery');
    const codec = makeFakeCodec();
    const bytes = source(PNG);
    const out = await deliver({ bytes, mime: PNG }, JPG, { codec });
    expect(codec.transcodeCalls).toBe(1);
    const req = (codec.calls[0] as any).req;
    expect(req.targetMime).toBe(JPG);
    expect(req.quality).toBe(90);
    expect(req.fillWhite).toBe(true);
    expect(req.maxLongSide).toBeUndefined();
    expect(out.converted).toBe(true);
    expect(startsWith(out.bytes, [...JPG_MAGIC])).toBe(true); // FF D8 FF
    const d = decodeRaster(out.bytes)!;
    expect(d.format).toBe('jpg');
    expect([d.width, d.height]).toEqual([W, H]);
    expect(d.filledWhite).toBe(true);
    expect(d.quality).toBe(90);
  });

  it('FR-82 (xii): WEBP (transparent) to JPG fills white at quality 90 and keeps the source size', async () => {
    const { deliver } = await load('./delivery');
    const codec = makeFakeCodec();
    const out = await deliver({ bytes: source(WEBP), mime: WEBP }, JPG, { codec });
    const req = (codec.calls[0] as any).req;
    expect([req.targetMime, req.quality, req.fillWhite, req.maxLongSide]).toEqual([JPG, 90, true, undefined]);
    const d = decodeRaster(out.bytes)!;
    expect([d.format, d.width, d.height, d.filledWhite]).toEqual(['jpg', W, H, true]);
  });

  it('FR-82 (iii): JPG to WEBP is a RIFF/WEBP file at quality 90, source size, bytes differ, no white fill requested', async () => {
    const { deliver } = await load('./delivery');
    const codec = makeFakeCodec();
    const bytes = source(JPG);
    const out = await deliver({ bytes, mime: JPG }, WEBP, { codec });
    const req = (codec.calls[0] as any).req;
    expect(req.targetMime).toBe(WEBP);
    expect(req.quality).toBe(90);
    expect(req.fillWhite).not.toBe(true);
    expect(req.maxLongSide).toBeUndefined();
    expect(startsWith(out.bytes, webpMagic().slice(0, 4))).toBe(true); // 'RIFF'
    expect(String.fromCharCode(...out.bytes.slice(8, 12))).toBe('WEBP');
    const d = decodeRaster(out.bytes)!;
    expect([d.width, d.height]).toEqual([W, H]);
    expect(out.bytes).not.toEqual(bytes);
  });

  it('FR-82 (x): PNG to WEBP is a RIFF/WEBP file at quality 90, source size, bytes differ', async () => {
    const { deliver } = await load('./delivery');
    const codec = makeFakeCodec();
    const bytes = source(PNG);
    const out = await deliver({ bytes, mime: PNG }, WEBP, { codec });
    expect((codec.calls[0] as any).req.quality).toBe(90);
    expect(String.fromCharCode(...out.bytes.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...out.bytes.slice(8, 12))).toBe('WEBP');
    const d = decodeRaster(out.bytes)!;
    expect([d.width, d.height]).toEqual([W, H]);
    expect(out.bytes).not.toEqual(bytes);
  });

  it('FR-82 (iv): JPG to PNG is a lossless PNG (no quality parameter) with the answer\'s dimensions', async () => {
    const { deliver } = await load('./delivery');
    const codec = makeFakeCodec();
    const out = await deliver({ bytes: source(JPG), mime: JPG }, PNG, { codec });
    const req = (codec.calls[0] as any).req;
    expect(req.targetMime).toBe(PNG);
    expect(req.quality).toBeUndefined();
    expect(req.maxLongSide).toBeUndefined();
    expect(startsWith(out.bytes, PNG_MAGIC)).toBe(true);
    const d = decodeRaster(out.bytes)!;
    expect([d.width, d.height]).toEqual([W, H]);
  });

  it('FR-82 (xi): WEBP to PNG is a lossless PNG with the source dimensions', async () => {
    const { deliver } = await load('./delivery');
    const codec = makeFakeCodec();
    const out = await deliver({ bytes: source(WEBP), mime: WEBP }, PNG, { codec });
    expect(codec.transcodeCalls).toBe(1);
    expect((codec.calls[0] as any).req.quality).toBeUndefined();
    expect(startsWith(out.bytes, PNG_MAGIC)).toBe(true);
    const d = decodeRaster(out.bytes)!;
    expect([d.width, d.height]).toEqual([W, H]);
  });

  it('FR-82 (vi) / FR-55: a selector target that differs from the delivered format (the operator\'s choice) converts to exactly that format', async () => {
    const { deliver } = await load('./delivery');
    const codec = makeFakeCodec();
    const out = await deliver({ bytes: source(PNG), mime: PNG }, WEBP, { codec });
    expect(decodeRaster(out.bytes)!.format).toBe('webp');
    expect(out.mime).toBe(WEBP);
  });

  it('FR-55 / FR-54: the download never resizes - a 4K-class source keeps its exact dimensions through every conversion', async () => {
    const { deliver } = await load('./delivery');
    for (const [from, to] of [[PNG, JPG], [PNG, WEBP], [JPG, PNG], [JPG, WEBP], [WEBP, PNG], [WEBP, JPG]]) {
      const codec = makeFakeCodec();
      const big = makeRaster({ format: FORMAT[from as keyof typeof FORMAT], width: 5376, height: 3072 });
      const out = await deliver({ bytes: big, mime: from }, to, { codec });
      const d = decodeRaster(out.bytes)!;
      expect([d.width, d.height], `${from} -> ${to}`).toEqual([5376, 3072]);
    }
  });
});

describe('FR-55 / FR-82 failure path: a failed conversion is a typed failure, never a silent fallback', () => {
  it('FR-55: a codec that rejects makes deliver reject with DeliveryError(conversion-failed) and no bytes are returned', async () => {
    const { deliver } = await load('./delivery');
    const codec = makeFakeCodec({ transcodeFails: true });
    const err: any = await deliver({ bytes: source(PNG), mime: PNG }, JPG, { codec }).then(() => null, (e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('DeliveryError');
    expect(err.kind).toBe('conversion-failed');
  });

  it('FR-55 / D-31: a codec that answers another MIME than requested (no WEBP encoder) is DeliveryError(wrong-output-type)', async () => {
    const { deliver } = await load('./delivery');
    const codec = makeFakeCodec({ outputMimeOverride: PNG });
    const err: any = await deliver({ bytes: source(JPG), mime: JPG }, WEBP, { codec }).then(() => null, (e: unknown) => e);
    expect(err?.name).toBe('DeliveryError');
    expect(err?.kind).toBe('wrong-output-type');
  });

  it('FR-54 failure path: a version whose bytes are unavailable (empty) rejects with DeliveryError(bytes-unavailable) and calls no codec', async () => {
    const { deliver } = await load('./delivery');
    const codec = makeFakeCodec();
    const err: any = await deliver({ bytes: new Uint8Array(0), mime: PNG }, PNG, { codec }).then(() => null, (e: unknown) => e);
    expect(err?.name).toBe('DeliveryError');
    expect(err?.kind).toBe('bytes-unavailable');
    expect(codec.calls).toHaveLength(0);
  });
});

describe('FR-57 / AC-34: the clipboard copy is always PNG', () => {
  for (const mime of [PNG, JPG, WEBP]) {
    it(`FR-57 / AC-34: a ${mime} version copies as a PNG signature`, async () => {
      const { deliverForClipboard } = await load('./delivery');
      const codec = makeFakeCodec();
      const out = await deliverForClipboard({ bytes: source(mime), mime }, { codec });
      expect(startsWith(out.bytes, PNG_MAGIC)).toBe(true);
      expect(out.mime).toBe(PNG);
    });
  }

  it('FR-57: a PNG version is copied byte for byte with no encoder call; JPG and WEBP convert once, losslessly, with no resize', async () => {
    const { deliverForClipboard } = await load('./delivery');
    const png = source(PNG);
    const c1 = makeFakeCodec();
    const same = await deliverForClipboard({ bytes: png, mime: PNG }, { codec: c1 });
    expect(same.bytes).toBe(png);
    expect(c1.calls).toHaveLength(0);

    for (const mime of [JPG, WEBP]) {
      const c = makeFakeCodec();
      const out = await deliverForClipboard({ bytes: source(mime), mime }, { codec: c });
      expect(c.transcodeCalls).toBe(1);
      const req = (c.calls[0] as any).req;
      expect([req.targetMime, req.quality, req.maxLongSide]).toEqual([PNG, undefined, undefined]);
      const d = decodeRaster(out.bytes)!;
      expect([d.width, d.height]).toEqual([W, H]);
    }
  });

  it('FR-57 failure path: a clipboard conversion that fails rejects with DeliveryError and returns nothing to copy', async () => {
    const { deliverForClipboard } = await load('./delivery');
    const codec = makeFakeCodec({ transcodeFails: true });
    const err: any = await deliverForClipboard({ bytes: source(JPG), mime: JPG }, { codec }).then(() => null, (e: unknown) => e);
    expect(err?.name).toBe('DeliveryError');
  });
});

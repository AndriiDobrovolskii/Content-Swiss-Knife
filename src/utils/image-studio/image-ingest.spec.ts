/**
 * image-ingest.spec.ts - US-10.1 T23 (FR-11, FR-12, FR-13 plumbing, FR-15, FR-16, FR-81, W-2, AC-4, AC-5 plumbing half,
 * AC-7, NFR-14).
 *
 * The client ingest pipeline for ONE user-supplied image, in the order of FR-11 / OD-39 C-39.2:
 *   detect the format by magic bytes (D-19) -> probe/decode (failure = T-1 whatever the size, N-7) -> the FR-11 table ->
 *   transcode in the SAME format, downscaling to 2048 only when the long side is over 2048 -> compare the encoder's
 *   output type with the required format (D-31: mismatch = T-1) -> 5 242 880 B check on the SENT bytes (D-7: T-2) ->
 *   upload -> store the sent bytes (best effort, OD-37).
 *
 * W-2 (waiver, human-confirmed at plan approval): neither runner has a working canvas, so this spec proves the PLUMBING
 * of the EXIF removal through the injectable codec - the raw bytes never reach the upload or the store, only the codec's
 * output does, the codec runs for every accepted upload. That a REAL canvas output carries no EXIF/GPS is a browser fact
 * (check V-8 iii) and is NOT claimed here.
 *
 * PINNED CONTRACT (src/utils/image-studio/image-ingest.ts; the plan names the file and the seams, not the signature)
 *   ingestImage(input: { bytes: Uint8Array }, deps: IngestDeps): Promise<IngestResult>
 *   IngestDeps = {
 *     codec: ImageCodec;                                                        (ports.ts)
 *     upload(req: { data: string /* base64 of the sent bytes *\/ }, signal?: AbortSignal): Promise<ImageHttpResult>;
 *     storeSentBytes(fileUri: string, bytes: Uint8Array, mimeType: string): Promise<void>;   best effort, may reject
 *     onStoreFailure?(error: unknown): void;                                   called ONCE per file whose store failed
 *     signal?: AbortSignal;                                                    passed to `upload`
 *   }
 *   IngestResult =
 *     | { ok: true; fileUri: string; mimeType: string; sentBytes: Uint8Array; width: number; height: number; sentBytesStored: boolean }
 *     | { ok: false; reason: 'T-1' | 'T-2' }                                   client-side rejection (FR-15)
 *     | { ok: false; reason: 'upload'; status: number; errorField?: string }   the upload call failed (normalised, FR-61)
 *
 * ORDER NOTE (plan/spec inconsistency, reported): DD-20 lists "store sent bytes -> upload", but the IndexedDB `sentBytes`
 * store is keyed by [sessionId, fileUri] and the `fileUri` exists only after the upload; FR-16 also says the upload and the
 * send "never wait on, or depend on, the success of the store". This spec therefore pins upload THEN store.
 *
 * Not asserted: the thumbnail UI, the five-image count (upload-rules.spec.ts), the real canvas (W-2), a generated version
 * attached under FR-37 (it is never passed to this function; that is the composer's wiring, T42).
 */
import { describe, it, expect } from 'vitest';
import {
  makeFakeCodec, makeInMemorySessionStore, makeRaster, decodeRaster, containsBytes, toBase64, fromBase64,
  EXIF_MARKER, ANIMATION_MARKER, MAGIC_FIXTURES, padTo, GIF_MAGIC,
} from '../../../test/image-studio/helpers/fakes';
import type { FakeCodecOptions, RasterFormat } from '../../../test/image-studio/helpers/fakes';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);

const MB5 = 5_242_880;
const MIME: Record<RasterFormat, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

/** Builds deps whose every effect is recorded in ONE ordered log, so the pipeline order is observable. */
function harness(codecOptions: FakeCodecOptions = {}, over: { uploadResult?: (n: number) => any } = {}) {
  const log: string[] = [];
  const fake = makeFakeCodec(codecOptions);
  const codec = {
    async probe(bytes: Uint8Array) { log.push('probe'); return fake.probe(bytes); },
    async transcode(req: any) { log.push('transcode'); return fake.transcode(req); },
  };
  const uploads: Array<{ data: string; signal?: AbortSignal }> = [];
  const stored: Array<{ fileUri: string; bytes: Uint8Array; mimeType: string }> = [];
  const storeFailures: unknown[] = [];
  let storeError: Error | null = null;
  const deps = {
    codec,
    async upload(req: { data: string }, signal?: AbortSignal) {
      log.push('upload');
      uploads.push({ data: req.data, signal });
      if (over.uploadResult) return over.uploadResult(uploads.length);
      // The BFF answers with the DETECTED mime type of the bytes it received (FR-9).
      const detected = decodeRaster(fromBase64(req.data))?.mime ?? 'application/octet-stream';
      return { ok: true, body: { fileUri: `files/f${uploads.length}`, mimeType: detected } };
    },
    async storeSentBytes(fileUri: string, bytes: Uint8Array, mimeType: string) {
      log.push('store');
      if (storeError) throw storeError;
      stored.push({ fileUri, bytes, mimeType });
    },
    onStoreFailure(e: unknown) { storeFailures.push(e); },
  };
  return { deps, log, fake, uploads, stored, storeFailures, failStore: (e: Error) => { storeError = e; } };
}

const raster = (format: RasterFormat, width: number, height: number, extra: { size?: number; exif?: boolean; animated?: boolean } = {}) =>
  makeRaster({ format, width, height, ...extra });

describe('ingestImage - the happy path and its order (FR-11, FR-16, AC-4)', () => {
  it('FR-11 / FR-16: runs probe -> transcode -> upload -> store, each exactly once, in that order', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness();
    const result = await ingestImage({ bytes: raster('png', 800, 600) }, h.deps);

    expect(result.ok).toBe(true);
    expect(h.log).toEqual(['probe', 'transcode', 'upload', 'store']);
  });

  it('FR-16: the result carries the upload\'s fileUri, the DETECTED mime type, the sent bytes and the displayed size', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness();
    const result = await ingestImage({ bytes: raster('jpg', 640, 480) }, h.deps);

    expect(result.ok).toBe(true);
    expect(result.fileUri).toBe('files/f1');
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.width).toBe(640);
    expect(result.height).toBe(480);
    expect(result.sentBytesStored).toBe(true);
    expect(result.sentBytes).toBeInstanceOf(Uint8Array);
  });

  it('FR-16 / OD-12 C-12.2: the bytes stored for re-upload are IDENTICAL to the bytes that were uploaded', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness();
    const result = await ingestImage({ bytes: raster('png', 100, 100, { exif: true }) }, h.deps);

    expect(h.stored).toHaveLength(1);
    expect(h.stored[0].fileUri).toBe(result.fileUri);
    expect(h.stored[0].mimeType).toBe('image/png');
    expect(toBase64(h.stored[0].bytes)).toBe(h.uploads[0].data);
    expect(toBase64(result.sentBytes)).toBe(h.uploads[0].data);
  });

  it('FR-21 plumbing: the abort signal is handed to the upload call', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness();
    const controller = new AbortController();
    await ingestImage({ bytes: raster('png', 10, 10) }, { ...h.deps, signal: controller.signal });

    expect(h.uploads[0].signal).toBe(controller.signal);
  });

  it('FR-16: also works against the in-memory SessionStorePort fake - the sent bytes can be read back for a FILE_MISSING re-upload', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness();
    const store = makeInMemorySessionStore();
    const deps = { ...h.deps, storeSentBytes: (u: string, b: Uint8Array, m: string) => store.putSentBytes('s1', u, b, m) };
    const result = await ingestImage({ bytes: raster('webp', 50, 50) }, deps);

    const back = await store.getSentBytes('s1', result.fileUri);
    expect(back).not.toBeNull();
    expect(Array.from(back!.bytes)).toEqual(Array.from(result.sentBytes));
    expect(back!.mimeType).toBe('image/webp');
  });
});

describe('ingestImage - the encoder always runs and the raw bytes never leave (FR-13 plumbing, AC-5 plumbing half, W-2)', () => {
  it('FR-13: an image of at most 2048 px and at most 5 MB (FR-11 row 1) is STILL re-encoded - the encoder runs for every accepted upload', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness();
    await ingestImage({ bytes: raster('png', 300, 200, { size: 1000 }) }, h.deps);

    expect(h.fake.transcodeCalls).toBe(1);
  });

  it.each([['png'], ['jpg'], ['webp']] as Array<[RasterFormat]>)('AC-5 plumbing: a camera original (%s with EXIF/GPS bytes) is uploaded and stored as the encoder\'s output only', async (format) => {
    const { ingestImage } = await load('./image-ingest');
    const original = raster(format, 1000, 800, { exif: true });
    expect(containsBytes(original, EXIF_MARKER)).toBe(true); // premise: the fixture really carries GPS bytes

    const h = harness();
    const result = await ingestImage({ bytes: original }, h.deps);

    const uploaded = fromBase64(h.uploads[0].data);
    expect(containsBytes(uploaded, EXIF_MARKER)).toBe(false);
    expect(containsBytes(result.sentBytes, EXIF_MARKER)).toBe(false);
    expect(containsBytes(h.stored[0].bytes, EXIF_MARKER)).toBe(false);
    expect(decodeRaster(uploaded)).toMatchObject({ format, hasExif: false, width: 1000, height: 800 });
    // and it is not just the original with a flag flipped: the codec produced new bytes
    expect(Array.from(uploaded)).not.toEqual(Array.from(original));
  });

  it('AC-5 plumbing: the bytes handed to the upload are exactly what the codec returned (nothing else is sent)', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness();
    await ingestImage({ bytes: raster('jpg', 400, 400, { exif: true }) }, h.deps);

    const expected = await makeFakeCodec().transcode({ bytes: raster('jpg', 400, 400, { exif: true }), targetMime: 'image/jpeg', quality: 90 });
    expect(h.uploads[0].data).toBe(toBase64(expected.bytes));
  });

  it('OD-38 C-38.2: an animated WEBP is sent as the encoder\'s single-frame output - no animation chunk reaches the upload', async () => {
    const { ingestImage } = await load('./image-ingest');
    const animated = raster('webp', 320, 240, { animated: true });
    expect(containsBytes(animated, ANIMATION_MARKER)).toBe(true); // premise
    const h = harness();
    const result = await ingestImage({ bytes: animated }, h.deps);

    expect(result.ok).toBe(true);
    expect(containsBytes(fromBase64(h.uploads[0].data), ANIMATION_MARKER)).toBe(false);
    expect(decodeRaster(result.sentBytes)).toMatchObject({ format: 'webp', animated: false, width: 320, height: 240 });
  });
});

describe('ingestImage - the encoder request: same format, downscale only above 2048, quality per SD-42 (FR-11, FR-13)', () => {
  it.each([
    ['png', 'image/png', undefined],
    ['jpg', 'image/jpeg', 90],
    ['webp', 'image/webp', 90],
  ] as Array<[RasterFormat, string, number | undefined]>)('OD-38 / SD-42: a %s is re-encoded as %s with quality %s (PNG lossless, no quality)', async (format, mime, quality) => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness();
    await ingestImage({ bytes: raster(format, 500, 500) }, h.deps);

    const call = h.fake.calls.find((c) => c.kind === 'transcode') as any;
    expect(call.req.targetMime).toBe(mime);
    expect(call.req.quality).toBe(quality);
    expect(call.req.fillWhite).toBeFalsy();
  });

  it('FR-11 row 1: a 2048 px image is not downscaled (no maxLongSide)', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness();
    await ingestImage({ bytes: raster('png', 2048, 1000) }, h.deps);

    const call = h.fake.calls.find((c) => c.kind === 'transcode') as any;
    expect(call.req.maxLongSide).toBeUndefined();
  });

  it('FR-11 row 3 / AC-4: a 2049 px image is downscaled to a long side of 2048', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness();
    const result = await ingestImage({ bytes: raster('png', 2049, 1000) }, h.deps);

    const call = h.fake.calls.find((c) => c.kind === 'transcode') as any;
    expect(call.req.maxLongSide).toBe(2048);
    expect(Math.max(result.width, result.height)).toBe(2048);
  });

  it('FR-11 row 4 / AC-4: a 6000 x 4000 original of 12 MB is downscaled to 2048 and accepted when the sent bytes fit', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness();
    const result = await ingestImage({ bytes: raster('jpg', 6000, 4000, { size: 12_000_000 }) }, h.deps);

    expect(result.ok).toBe(true);
    expect(Math.max(result.width, result.height)).toBe(2048);
    expect(result.sentBytes.length).toBeLessThanOrEqual(MB5);
  });

  it('D-32: the long side is the as-displayed side the codec reports (a portrait image is measured by its height)', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness();
    await ingestImage({ bytes: raster('png', 1000, 3000) }, h.deps);

    const call = h.fake.calls.find((c) => c.kind === 'transcode') as any;
    expect(call.req.maxLongSide).toBe(2048);
  });
});

describe('ingestImage - size rules on the original and on the SENT bytes (FR-11 table, FR-12, D-7, AC-4, AC-7)', () => {
  it('FR-12 row 2: a 1500 px image over 5 MB is rejected T-2 - not re-encoded, not uploaded, not stored', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness();
    const result = await ingestImage({ bytes: raster('png', 1500, 1500, { size: 6_000_000 }) }, h.deps);

    expect(result).toEqual({ ok: false, reason: 'T-2' });
    expect(h.fake.transcodeCalls).toBe(0);
    expect(h.uploads).toHaveLength(0);
    expect(h.stored).toHaveLength(0);
  });

  it('SD-25 boundary: an original of exactly 5 242 880 B (long side <= 2048) is accepted; 5 242 881 B is rejected T-2', async () => {
    const { ingestImage } = await load('./image-ingest');
    const okRun = await ingestImage({ bytes: raster('png', 2048, 2048, { size: MB5 }) }, harness().deps);
    const badRun = await ingestImage({ bytes: raster('png', 2048, 2048, { size: MB5 + 1 }) }, harness().deps);

    expect(okRun.ok).toBe(true);
    expect(badRun).toEqual({ ok: false, reason: 'T-2' });
  });

  it('SD-25: a 5 000 000 B original is at most 5 MB and accepted', async () => {
    const { ingestImage } = await load('./image-ingest');
    expect((await ingestImage({ bytes: raster('jpg', 1800, 1800, { size: 5_000_000 }) }, harness().deps)).ok).toBe(true);
  });

  it('D-7 / OD-38 C-38.5: an original of at most 5 MB whose re-encode comes out over 5 MB is rejected T-2 and nothing is sent', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness({ outputSize: MB5 + 1 });
    const result = await ingestImage({ bytes: raster('png', 1000, 1000, { size: 100_000 }) }, h.deps);

    expect(result).toEqual({ ok: false, reason: 'T-2' });
    expect(h.fake.transcodeCalls).toBe(1);
    expect(h.uploads).toHaveLength(0);
    expect(h.stored).toHaveLength(0);
  });

  it('D-7 boundary: a re-encode of exactly 5 242 880 B passes', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness({ outputSize: MB5 });
    const result = await ingestImage({ bytes: raster('png', 1000, 1000) }, h.deps);

    expect(result.ok).toBe(true);
    expect(result.sentBytes.length).toBe(MB5);
  });

  it('AC-4 / D-7: a 2048+ px original over 5 MB whose re-encode is still over 5 MB is rejected T-2 with no upload', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness({ outputSize: MB5 + 1 });
    const result = await ingestImage({ bytes: raster('png', 4096, 4096, { size: 9_000_000 }) }, h.deps);

    expect(result).toEqual({ ok: false, reason: 'T-2' });
    expect(h.uploads).toHaveLength(0);
  });
});

describe('ingestImage - rejections with the reason T-1 (FR-9, FR-13, FR-15, D-31, N-7, AC-2, AC-7)', () => {
  it('AC-2 / FR-15: a format that is not PNG/JPG/WEBP (GIF) is rejected T-1 before the codec is consulted', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness();
    const result = await ingestImage({ bytes: padTo(GIF_MAGIC, 64) }, h.deps);

    expect(result).toEqual({ ok: false, reason: 'T-1' });
    expect(h.log).toEqual([]);
  });

  it('AC-2: every rejected magic-byte fixture of the shared table is T-1 and touches neither codec, upload nor store', async () => {
    const { ingestImage } = await load('./image-ingest');
    const rejected = MAGIC_FIXTURES.filter((f) => f.expected === null);
    expect(rejected.length).toBeGreaterThan(0);
    for (const f of rejected) {
      const h = harness();
      const result = await ingestImage({ bytes: f.bytes }, h.deps);
      expect(result, f.name).toEqual({ ok: false, reason: 'T-1' });
      expect(h.log, f.name).toEqual([]);
    }
  });

  it('N-7 / FR-11: a file that cannot be decoded is T-1 WHATEVER its size - a 6 MB undecodable PNG is T-1, not T-2', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness();
    // real PNG magic bytes, but no decodable raster behind them, 6 MB long
    const undecodable = padTo([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 6_000_000);
    const result = await ingestImage({ bytes: undecodable }, h.deps);

    expect(result).toEqual({ ok: false, reason: 'T-1' });
    expect(h.log).toEqual(['probe']);
    expect(h.uploads).toHaveLength(0);
  });

  it('N-7: a small undecodable file is T-1 too, and the probe runs before any size decision', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness({ probeFails: true });
    const result = await ingestImage({ bytes: raster('jpg', 100, 100) }, h.deps);

    expect(result).toEqual({ ok: false, reason: 'T-1' });
    expect(h.fake.transcodeCalls).toBe(0);
  });

  it('FR-13 failure path: an encoder failure is T-1 and nothing is sent or stored', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness({ transcodeFails: true });
    const result = await ingestImage({ bytes: raster('png', 100, 100) }, h.deps);

    expect(result).toEqual({ ok: false, reason: 'T-1' });
    expect(h.uploads).toHaveLength(0);
    expect(h.stored).toHaveLength(0);
  });

  it('D-31: an encoder that answers a different type than required (no WEBP encoder -> PNG) is T-1 and nothing is sent or stored', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness({ outputMimeOverride: 'image/png' });
    const result = await ingestImage({ bytes: raster('webp', 100, 100) }, h.deps);

    expect(result).toEqual({ ok: false, reason: 'T-1' });
    expect(h.uploads).toHaveLength(0);
    expect(h.stored).toHaveLength(0);
  });

  it('D-31: the type comparison is exact - a JPG encoded as PNG is also T-1', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness({ outputMimeOverride: 'image/png' });
    expect(await ingestImage({ bytes: raster('jpg', 100, 100) }, h.deps)).toEqual({ ok: false, reason: 'T-1' });
  });

  it('AC-7 / FR-15: a rejection is a returned decision, not a throw, so the caller keeps the other attachments', async () => {
    const { ingestImage } = await load('./image-ingest');
    const first = await ingestImage({ bytes: padTo(GIF_MAGIC, 16) }, harness().deps);
    const second = await ingestImage({ bytes: raster('png', 64, 64) }, harness().deps);

    expect(first.ok).toBe(false);
    expect(second.ok).toBe(true);
  });
});

describe('ingestImage - the upload and the best-effort store (FR-16, FR-81, OD-37, D-28)', () => {
  it('FR-16 / FR-61: a failed upload is returned normalised with its status and code, and nothing is stored', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness({}, { uploadResult: () => ({ ok: false, status: 415, errorField: 'UNSUPPORTED_IMAGE_TYPE' }) });
    const result = await ingestImage({ bytes: raster('png', 64, 64) }, h.deps);

    expect(result).toEqual({ ok: false, reason: 'upload', status: 415, errorField: 'UNSUPPORTED_IMAGE_TYPE' });
    expect(h.stored).toHaveLength(0);
    expect(h.log).toEqual(['probe', 'transcode', 'upload']);
  });

  it('FR-16 / SD-31: an exhausted transport failure (status 0) comes back as an upload failure the caller can offer Retry for', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness({}, { uploadResult: () => ({ ok: false, status: 0 }) });
    const result = await ingestImage({ bytes: raster('png', 64, 64) }, h.deps);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('upload');
    expect(result.status).toBe(0);
  });

  it('OD-37 / FR-16: when the sent-bytes store fails (quota) the attachment is STILL uploaded and returned ok, flagged as not stored', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness();
    h.failStore(new Error('quota'));
    const result = await ingestImage({ bytes: raster('png', 64, 64) }, h.deps);

    expect(result.ok).toBe(true);
    expect(result.fileUri).toBe('files/f1');
    expect(result.sentBytesStored).toBe(false);
    expect(h.uploads).toHaveLength(1);
  });

  it('FR-81 / D-28: a store failure is reported to the caller exactly once for that file (the caller coalesces the alert per action)', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness();
    const quota = new Error('quota');
    h.failStore(quota);
    await ingestImage({ bytes: raster('png', 64, 64) }, h.deps);

    expect(h.storeFailures).toEqual([quota]);
  });

  it('FR-81: against the in-memory SessionStorePort fake a quota failure on putSentBytes leaves the upload and the attachment intact and stores nothing', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness();
    const store = makeInMemorySessionStore();
    store.failSentBytes(new Error('QuotaExceeded'));
    const deps = { ...h.deps, storeSentBytes: (u: string, b: Uint8Array, m: string) => store.putSentBytes('s1', u, b, m) };
    const result = await ingestImage({ bytes: raster('png', 64, 64) }, deps);

    expect(result.ok).toBe(true);
    expect(result.sentBytesStored).toBe(false);
    expect(await store.getSentBytes('s1', 'files/f1')).toBeNull();
    expect(h.storeFailures).toHaveLength(1);
  });

  it('OD-37: a successful store reports no failure', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness();
    await ingestImage({ bytes: raster('png', 64, 64) }, h.deps);

    expect(h.storeFailures).toEqual([]);
  });

  it('NFR-14: an ingest of five files makes five independent runs - a store failure of one does not leak into the next', async () => {
    const { ingestImage } = await load('./image-ingest');
    const h = harness();
    const results = [];
    for (let i = 0; i < 5; i++) {
      if (i === 2) h.failStore(new Error('quota'));
      if (i === 3) h.failStore(null as unknown as Error);
      results.push(await ingestImage({ bytes: raster('png', 32 + i, 32 + i) }, h.deps));
    }
    expect(results.map((r: any) => r.ok)).toEqual([true, true, true, true, true]);
    expect(results.map((r: any) => r.sentBytesStored)).toEqual([true, true, false, true, true]);
    expect(h.storeFailures).toHaveLength(1);
    expect(new Set(results.map((r: any) => r.fileUri)).size).toBe(5);
  });
});

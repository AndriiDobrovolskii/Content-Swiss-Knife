// @vitest-environment node
/**
 * US-10.1 T5 - server-side limits of the Image Studio (Size units, FR-39, FR-40, FR-41, FR-51, FR-60, FR-66, SD-10, SD-11).
 *
 * PINNED CONTRACT (server/image-studio/constants.js), named exports; only values the Specification FIXES are asserted:
 *   MAX_BODY_BYTES          31 457 280   (30 MB, 1024-based)
 *   SIZE_TRIM_LIMIT_BYTES   18 874 368   (18 MB measure, FR-39)
 *   TOKEN_TRIM_RATIO        0.8          (80% of inputTokenLimit, FR-40)
 *   RETRY_DELAYS_MS         [1000, 2000, 4000]  (FR-60, no jitter)
 *   RATE_LIMIT_MAX          30 ; RATE_LIMIT_WINDOW_MS 3 600 000   (FR-66, FR-67)
 *   COUNT_TOKENS_CONCURRENCY 4           (SD-10)
 *   HEADROOM_BYTES          1 048 576    (SD-11)
 *   IMAGE_TOKEN_ESTIMATE    structured config { tokensPerImage: 258, source: <non-empty text containing "unverified"> } (FR-41, D-13)
 * Values the Specification delegates (upstream timeout, FILE_MISSING status set from V-2) are deliberately NOT asserted.
 */
import { describe, it, expect } from 'vitest';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const path = '../../server/image-studio/constants.js';

describe('image-studio constants', () => {
  it('FR-51: MAX_BODY_BYTES is 30 MB = 31 457 280 B', async () => {
    const c = await load(path);
    expect(c.MAX_BODY_BYTES).toBe(31_457_280);
  });

  it('FR-39: SIZE_TRIM_LIMIT_BYTES is 18 MB = 18 874 368 B', async () => {
    const c = await load(path);
    expect(c.SIZE_TRIM_LIMIT_BYTES).toBe(18_874_368);
  });

  it('FR-40: the token trim threshold is 80% of the input limit', async () => {
    const c = await load(path);
    expect(c.TOKEN_TRIM_RATIO).toBe(0.8);
  });

  it('FR-60: the retry schedule is exactly 1000, 2000, 4000 ms (three waits, four attempts)', async () => {
    const c = await load(path);
    expect(c.RETRY_DELAYS_MS).toEqual([1000, 2000, 4000]);
  });

  it('FR-66 / FR-67: the limiter allows 30 requests per 3 600 000 ms window', async () => {
    const c = await load(path);
    expect(c.RATE_LIMIT_MAX).toBe(30);
    expect(c.RATE_LIMIT_WINDOW_MS).toBe(3_600_000);
  });

  it('SD-10: at most 4 countTokens calls are in flight', async () => {
    const c = await load(path);
    expect(c.COUNT_TOKENS_CONCURRENCY).toBe(4);
  });

  it('SD-11 / FR-53: the envelope headroom is 1 MiB', async () => {
    const c = await load(path);
    expect(c.HEADROOM_BYTES).toBe(1_048_576);
  });

  it('FR-41 / D-13: IMAGE_TOKEN_ESTIMATE is a structured config of 258 tokens with a recorded source marking it unverified', async () => {
    const c = await load(path);
    expect(c.IMAGE_TOKEN_ESTIMATE.tokensPerImage).toBe(258);
    expect(typeof c.IMAGE_TOKEN_ESTIMATE.source).toBe('string');
    expect(c.IMAGE_TOKEN_ESTIMATE.source).toMatch(/unverified/i);
  });

  it('FR-39 / FR-51: the size-trim limit is below the body cap (the cap is not the trim target)', async () => {
    const c = await load(path);
    expect(c.SIZE_TRIM_LIMIT_BYTES).toBeLessThan(c.MAX_BODY_BYTES);
    expect(c.MAX_BODY_BYTES - c.HEADROOM_BYTES).toBeGreaterThan(c.SIZE_TRIM_LIMIT_BYTES);
  });
});

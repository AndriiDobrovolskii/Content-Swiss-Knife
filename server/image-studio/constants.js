/**
 * Server-side limits of the Image Studio BFF (US-10.1).
 *
 * Only the BFF reads these (the client never needs them), so they live here and not in the shared
 * `src/prompt-core/image-studio-contract.json`, which holds only what both runtimes parse. The 120 s
 * generation deadline is client-side and deliberately absent.
 *
 * All byte values are 1024-based (Specification "Size units").
 */

/** FR-51: the largest request body the image routes accept, as declared by Content-Length (30 MB). */
export const MAX_BODY_BYTES = 30 * 1024 * 1024;

/** FR-39: the history size at which the BFF starts removing old turns (18 MB measure). */
export const SIZE_TRIM_LIMIT_BYTES = 18 * 1024 * 1024;

/** FR-40: the token trim threshold, as a fraction of the model's `inputTokenLimit`. */
export const TOKEN_TRIM_RATIO = 0.8;

/** FR-60: the fixed retry schedule, no jitter. Three waits between four attempts. */
export const RETRY_DELAYS_MS = Object.freeze([1000, 2000, 4000]);

/** FR-66, FR-67: at most 30 counted generate requests per IP in a fixed window of one hour. */
export const RATE_LIMIT_MAX = 30;
export const RATE_LIMIT_WINDOW_MS = 3_600_000;

/** SD-10: at most this many `countTokens` calls are in flight at once. */
export const COUNT_TOKENS_CONCURRENCY = 4;

/** SD-11, FR-53: the envelope headroom kept between the trimmed history and the 30 MB body cap (1 MiB). */
export const HEADROOM_BYTES = 1024 * 1024;

/**
 * Per-call upstream timeout, applied through `httpOptions.timeout` on every Gemini image call
 * (DD-6, SD-30). It is deliberately far below the constructor's 20-minute client floor, which exists
 * for Doc generation and must not govern an image call. The Specification delegates the number; this is
 * a builder choice, kept under the client's 120 s deadline so one stuck attempt ends before it. The
 * total time across retries is bounded by the client abort (FR-21, SD-30), not by this value. No second
 * BFF timer exists.
 */
export const UPSTREAM_TIMEOUT_MS = 100_000;

/**
 * FR-41, D-13: the per-image token estimate used by the token trim, as structured configuration with
 * its provenance recorded. `source` is kept honest: the figure was recorded in V-7 as an estimate and
 * has not been measured independently by this repository, so it is marked unverified.
 */
export const IMAGE_TOKEN_ESTIMATE = Object.freeze({
  tokensPerImage: 258,
  source:
    'Human-supplied estimate recorded in V-7 (about 258 tokens per image part); unverified against live countTokens in this repository.',
});

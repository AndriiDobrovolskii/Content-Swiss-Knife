/**
 * The Image Studio's fixed-schedule retry loop (FR-60, FR-61, FR-21; plan DD-7, choice P-3).
 *
 * Runs `operation` up to four times, waiting exactly 1000, 2000 and 4000 ms between attempts (no jitter,
 * `RETRY_DELAYS_MS`). Provider-independent by construction: it takes an operation and classifies a failure
 * only by its numeric `status`. `server/utils/retry.js` is a different, unrelated loop and is not used.
 *
 * Retried: upstream 429, any 5xx (a bare 500 included), and any failure without a usable HTTP error status
 * (a transport failure or a timeout), which is treated as a transient 5xx-class failure.
 * Not retried: any other 4xx. The original error object is rethrown unchanged after the failing call.
 *
 * Exhaustion rejects with an `ImageStudioError` `UPSTREAM_RETRIES_EXHAUSTED` carrying the LAST upstream
 * status (429 or 5xx), or 502 when the last failure had none. Upstream text never reaches that error.
 *
 * Cancel: the injected `sleep(ms, signal)` rejects when `signal` aborts; that rejection propagates as is
 * (a cancel is not an exhausted retry) and no further operation call is made.
 */
import { RETRY_DELAYS_MS } from './constants.js';
import { ImageStudioError } from './errors.js';

/** Status given to an exhausted run whose last failure had no usable upstream status (P-3). */
const NO_STATUS_EXHAUSTED_STATUS = 502;

function isUpstreamFailureStatus(status) {
  return status === 429 || (Number.isInteger(status) && status >= 500 && status <= 599);
}

function isNonRetryableClientError(status) {
  return Number.isInteger(status) && status >= 400 && status <= 499 && status !== 429;
}

/**
 * @template T
 * @param {() => Promise<T>} operation
 * @param {{ sleep: (ms: number, signal?: AbortSignal) => Promise<void>, signal?: AbortSignal }} options
 * @returns {Promise<T>}
 */
export async function runWithRetry(operation, { sleep, signal }) {
  const attempts = RETRY_DELAYS_MS.length + 1;
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (failure) {
      const status = failure?.status;
      if (isNonRetryableClientError(status)) throw failure;
      // A cancel that surfaced as an operation failure must end the run, not start another wait.
      if (signal?.aborted) throw failure;
      if (attempt === attempts - 1) {
        throw new ImageStudioError(
          'UPSTREAM_RETRIES_EXHAUSTED',
          isUpstreamFailureStatus(status) ? status : NO_STATUS_EXHAUSTED_STATUS,
        );
      }
      await sleep(RETRY_DELAYS_MS[attempt], signal);
    }
  }
}

/**
 * async-retry.ts
 *
 * US-3.1 T2 (FR-1, NFR-2, NFR-3). A generic, provider-agnostic retry-with-backoff helper.
 *
 * Deliberately NOT `retryTransport()` (`http-retry.ts`) — that operator is RxJS-based and keyed on
 * HTTP transport-status shape (`isUpstreamTransportFailure`); reusing it would retry only a subset
 * of `groundingSpecs()`'s throw-path failures and never the empty/wrong-script paths OD-5 requires
 * covered (Implementation Plan, Rejected alternative 1). `retryAsync` takes no dependency on any
 * transport or provider shape at all — the retryability decision is entirely the caller's own
 * business-semantic predicate (NFR-2).
 */

export interface RetryOptions<T> {
  /** Attempt budget. `attempt` is called at most this many times. */
  maxAttempts: number;
  /** Whether this result should be retried, given the caller's own business semantics. */
  isRetryable: (result: T) => boolean;
  /** Base of the exponential backoff (`baseDelayMs * 2**(n-1)`). Defaults to 500ms. */
  baseDelayMs?: number;
  /**
   * Injectable so tests never depend on a real clock (NFR-3). Defaults to a real,
   * `setTimeout`-backed promise.
   */
  delay?: (ms: number) => Promise<void>;
}

const DEFAULT_BASE_DELAY_MS = 500;

function realDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calls `attempt` up to `maxAttempts` times, retrying with exponential backoff
 * (`baseDelayMs * 2**(n-1)`) whenever `isRetryable` says the result should be retried.
 *
 * Returns the first non-retryable result, or — once the attempt budget is exhausted with every
 * attempt still retryable — the LAST attempt's own result. Never synthesizes a value of its own.
 *
 * `attempt` receives the 1-based attempt number. No delay runs after the FINAL attempt: nothing
 * waits on a result nobody is going to read.
 */
export async function retryAsync<T>(
  attempt: (n: number) => Promise<T>,
  opts: RetryOptions<T>,
): Promise<T> {
  const { maxAttempts, isRetryable, baseDelayMs = DEFAULT_BASE_DELAY_MS, delay = realDelay } = opts;

  let result: T;
  for (let n = 1; n <= maxAttempts; n++) {
    result = await attempt(n);
    if (!isRetryable(result)) return result;
    if (n < maxAttempts) await delay(baseDelayMs * 2 ** (n - 1));
  }
  return result!;
}

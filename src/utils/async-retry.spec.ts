/**
 * async-retry.spec.ts
 *
 * US-3.1 T2 (FR-1, NFR-2, NFR-3). `retryAsync<T>` does not exist yet — this whole file is RED on
 * module resolution until so-builder creates `src/utils/async-retry.ts`. That is the correct
 * failure: the module IS the deliverable (Task Breakdown T2 "Files: create").
 *
 * Contract asserted here, from Implementation Plan D1 (docs/plans/US-3.1-implementation-plan.md#4):
 *   retryAsync<T>(attempt: (n: number) => Promise<T>, opts: {
 *     maxAttempts: number;
 *     isRetryable: (r: T) => boolean;
 *     baseDelayMs?: number;
 *     delay?: (ms: number) => Promise<void>;
 *   }): Promise<T>
 *
 * NFR-3 (determinism): every test here injects `delay` as a no-op/recording stub. No test waits on
 * a real timer, and no test asserts on wall-clock time.
 */
import { describe, it, expect, vi } from 'vitest';
import { retryAsync } from './async-retry';

/** Records every ms passed to `delay` and resolves immediately — no real timer anywhere. */
function noopDelay() {
  const calls: number[] = [];
  const delay = vi.fn(async (ms: number) => { calls.push(ms); });
  return { delay, calls };
}

describe('retryAsync', () => {
  it('returns the first attempt result immediately when it is not retryable', async () => {
    const { delay } = noopDelay();
    const attempt = vi.fn(async () => ({ ok: true }));
    const result = await retryAsync(attempt, { maxAttempts: 3, isRetryable: () => false, delay });
    expect(result).toEqual({ ok: true });
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(delay).not.toHaveBeenCalled();
  });

  it('retries on a retryable result and returns the first non-retryable one', async () => {
    const { delay } = noopDelay();
    const attempt = vi.fn(async (n: number) => (n < 3 ? { failure: true, n } : { failure: false, n }));
    const result = await retryAsync(attempt, {
      maxAttempts: 5,
      isRetryable: r => r.failure,
      delay,
    });
    expect(result).toEqual({ failure: false, n: 3 });
    expect(attempt).toHaveBeenCalledTimes(3);
  });

  it('retries exactly maxAttempts times on a PERSISTENTLY retryable result, then returns the last attempt', async () => {
    const { delay } = noopDelay();
    let calls = 0;
    const attempt = vi.fn(async () => { calls++; return { failure: true, calls }; });
    const result = await retryAsync(attempt, { maxAttempts: 4, isRetryable: () => true, delay });
    expect(attempt).toHaveBeenCalledTimes(4);
    // The LAST attempt's result is what is returned — not the first, not a synthesized value.
    expect(result).toEqual({ failure: true, calls: 4 });
  });

  it('stops on the first attempt whose result is not retryable, never over-calling', async () => {
    const { delay } = noopDelay();
    const attempt = vi.fn(async (n: number) => ({ failure: n < 2, n }));
    const result = await retryAsync(attempt, { maxAttempts: 10, isRetryable: r => r.failure, delay });
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ failure: false, n: 2 });
  });

  it('never calls a real timer — the injected delay stub is the only clock the function ever touches', async () => {
    const { delay, calls } = noopDelay();
    const attempt = vi.fn(async () => ({ failure: true }));
    await retryAsync(attempt, { maxAttempts: 3, isRetryable: () => true, delay });
    // One delay per retry, i.e. maxAttempts - 1 — no delay after the FINAL attempt, since nothing
    // waits on a result nobody will read.
    expect(delay).toHaveBeenCalledTimes(2);
    expect(calls.length).toBe(2);
  });

  it('backs off exponentially from baseDelayMs (baseDelayMs * 2**(n-1))', async () => {
    const { delay, calls } = noopDelay();
    const attempt = vi.fn(async () => ({ failure: true }));
    await retryAsync(attempt, { maxAttempts: 4, isRetryable: () => true, baseDelayMs: 500, delay });
    expect(calls).toEqual([500, 1000, 2000]);
  });

  it('passes the 1-based attempt number to `attempt`', async () => {
    const { delay } = noopDelay();
    const seen: number[] = [];
    const attempt = vi.fn(async (n: number) => { seen.push(n); return { failure: seen.length < 3 }; });
    await retryAsync(attempt, { maxAttempts: 5, isRetryable: r => r.failure, delay });
    expect(seen).toEqual([1, 2, 3]);
  });

  it('is provider-agnostic — takes no dependency on any transport/HTTP-status shape', async () => {
    const { delay } = noopDelay();
    // A result shape that carries no HTTP status at all still drives retry correctly — the
    // retryability decision is entirely the caller's business-semantic predicate (NFR-2).
    const attempt = vi.fn(async (n: number) => (n === 1 ? 'wrong-script' : 'ok'));
    const result = await retryAsync(attempt, {
      maxAttempts: 3,
      isRetryable: (r: string) => r !== 'ok',
      delay,
    });
    expect(result).toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(2);
  });
});

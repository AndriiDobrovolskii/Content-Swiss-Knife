/**
 * retry.spec.ts
 *
 * `withRetry` wraps every provider call in the app (9 call sites across the three providers) and
 * had NO direct test coverage — both provider specs stub it out
 * (`vi.mock('../server/utils/retry.js', () => ({ withRetry: (fn) => fn() }))`), so nothing
 * exercised the classifier itself.
 *
 * WHY THIS EXISTS. A live EXPERT3D run on 2026-08-01 17:52Z died after four successful LLM calls
 * (~40 K output tokens already paid for) when the fifth failed with `fetch failed` — Node/undici's
 * generic wrapper for a transport failure. The server log contains no `[Retry]` line at all: every
 * branch of `isRetryable` tested for a POLICY failure (429, 503, overloaded, rate_limit), where the
 * provider answered and said no. A transport failure, where nobody answered, matched none of them
 * and was rethrown on attempt 1 of 3.
 *
 * That is backwards — a transport failure is the more retryable of the two.
 *
 * The tests are split by intent: what must now be retried, and what must still fail fast. The
 * second half matters as much as the first, because retrying a deterministic error just makes every
 * genuine failure three times slower and three times more expensive.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

import { withRetry } from '../server/utils/retry.js';

/**
 * REQUIRED, not tidiness. vitest.config.ts sets neither `restoreMocks` nor `clearMocks`, so a
 * `vi.spyOn(console, 'warn')` left in place is reused by the next `vi.spyOn` on the same method —
 * the spy keeps its recorded calls. The log-content assertion below then reads "rate-limited" lines
 * left behind by the policy tests and fails, while passing in isolation.
 */
afterEach(() => vi.restoreAllMocks());

/** Fast by construction: 1 ms base delay keeps the real backoff maths on the hot path. */
const FAST = { maxRetries: 3, baseDelayMs: 1 };

/** Counts attempts so "did it retry?" is asserted on behaviour, not on a mock's call log. */
function failingTimes(n: number, error: Error) {
  let attempts = 0;
  const operation = async () => {
    attempts++;
    if (attempts <= n) throw error;
    return 'ok';
  };
  return { operation, attempts: () => attempts };
}

/** undici's real shape: a TypeError whose `cause` carries the actual code. */
function fetchFailed(code: string): Error {
  const cause: any = new Error(`${code} error`);
  cause.code = code;
  return new TypeError('fetch failed', { cause });
}

describe('withRetry — transport failures are retried', () => {
  /**
   * THE REGRESSION THIS FILE EXISTS FOR. This is the exact error that killed the 2026-08-01 run.
   */
  it('retries `fetch failed` (ECONNRESET) and succeeds', async () => {
    const { operation, attempts } = failingTimes(1, fetchFailed('ECONNRESET'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(withRetry(operation, FAST.maxRetries, FAST.baseDelayMs)).resolves.toBe('ok');
    expect(attempts()).toBe(2);
  });

  it.each([
    'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'EPIPE',
    'EHOSTUNREACH', 'ENETUNREACH',
    'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'UND_ERR_SOCKET',
  ])('retries transport code %s', async (code) => {
    const { operation, attempts } = failingTimes(1, fetchFailed(code));
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(withRetry(operation, FAST.maxRetries, FAST.baseDelayMs)).resolves.toBe('ok');
    expect(attempts()).toBe(2);
  });

  /** SDKs wrap. The code can sit two levels down, so a one-level check would miss it. */
  it('finds a transport code nested deeper in the cause chain', async () => {
    const inner: any = new Error('socket hang up');
    inner.code = 'UND_ERR_BODY_TIMEOUT';
    const middle = new Error('request failed', { cause: inner });
    const outer = new Error('[gemini] generate failed', { cause: middle });

    const { operation, attempts } = failingTimes(1, outer);
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(withRetry(operation, FAST.maxRetries, FAST.baseDelayMs)).resolves.toBe('ok');
    expect(attempts()).toBe(2);
  });

  /**
   * Composes with the SDK timeouts: an aborted request must be retried, or bounding the hang would
   * simply convert one failure mode into another.
   */
  it('retries an abort/timeout error', async () => {
    const err: any = new Error('Request was aborted.');
    err.name = 'AbortError';
    const { operation, attempts } = failingTimes(1, err);
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(withRetry(operation, FAST.maxRetries, FAST.baseDelayMs)).resolves.toBe('ok');
    expect(attempts()).toBe(2);
  });

  it.each([502, 504])('retries gateway status %i', async (status) => {
    const err: any = new Error(`Bad gateway`);
    err.status = status;
    const { operation, attempts } = failingTimes(1, err);
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(withRetry(operation, FAST.maxRetries, FAST.baseDelayMs)).resolves.toBe('ok');
    expect(attempts()).toBe(2);
  });

  /**
   * THE 2026-08-02 REGRESSION. A real EXPERT3D run lost its specs-grounding call to
   * `Retryable HTTP Error: Gateway Timeout` after 119.4s, with no `[Retry]` line — one attempt.
   *
   * This is `@google/genai`'s own wording, and the shape is the whole problem: the SDK converts a
   * retryable HTTP status into a BARE `Error` (no `status`, no `code`, `name === 'Error'`) *before*
   * its `throwErrorIfNotOK` can build the real `ApiError`. Every signal the classifier looks for is
   * stripped, so the `status === 504` branch never fires.
   *
   * The provider fix is to stop opting into that wrapper at all (see gemini-provider.spec.ts), but
   * the classifier must also recognise the message on its own — otherwise re-enabling the SDK's
   * retry loop silently un-retries every gateway failure again, exactly as it did here.
   */
  it('retries the Gemini SDK`s status-stripped `Retryable HTTP Error`', async () => {
    const err = new Error('Retryable HTTP Error: Gateway Timeout');
    expect((err as any).status).toBeUndefined();   // the point: nothing else identifies it
    expect((err as any).code).toBeUndefined();

    const { operation, attempts } = failingTimes(1, err);
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(withRetry(operation, FAST.maxRetries, FAST.baseDelayMs)).resolves.toBe('ok');
    expect(attempts()).toBe(2);
  });
});

describe('withRetry — policy failures still retried (regression)', () => {
  it.each([
    ['status 429', { status: 429 }],
    ['status 503', { status: 503 }],
  ])('retries %s', async (_label, props) => {
    const err = Object.assign(new Error('slow down'), props);
    const { operation, attempts } = failingTimes(1, err);
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(withRetry(operation, FAST.maxRetries, FAST.baseDelayMs)).resolves.toBe('ok');
    expect(attempts()).toBe(2);
  });

  it.each(['429 Too Many Requests', 'model is overloaded', 'RESOURCE_EXHAUSTED', 'rate_limit hit'])(
    'retries message %s',
    async (message) => {
      const { operation, attempts } = failingTimes(1, new Error(message));
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      await expect(withRetry(operation, FAST.maxRetries, FAST.baseDelayMs)).resolves.toBe('ok');
      expect(attempts()).toBe(2);
    },
  );
});

describe('withRetry — what must still fail fast', () => {
  /**
   * THE GUARD. Retrying a deterministic error triples the cost and the latency of every genuine
   * failure. A 400 means the request itself is wrong; sending it again cannot help.
   */
  it('throws a 400 immediately, without a second attempt', async () => {
    const err: any = new Error('invalid request: bad model name');
    err.status = 400;
    const { operation, attempts } = failingTimes(99, err);

    await expect(withRetry(operation, FAST.maxRetries, FAST.baseDelayMs)).rejects.toThrow(/invalid request/);
    expect(attempts()).toBe(1);
  });

  it('does not retry a plain application error', async () => {
    const { operation, attempts } = failingTimes(99, new Error('[gemini] blocked by safety filter'));

    await expect(withRetry(operation, FAST.maxRetries, FAST.baseDelayMs)).rejects.toThrow(/safety/);
    expect(attempts()).toBe(1);
  });

  /** A truncation guard must stay fatal here too — it is deterministic, not transient. */
  it('does not retry a truncation error', async () => {
    const { operation, attempts } = failingTimes(99, new Error('[gemini] output truncated: hit maxOutputTokens'));

    await expect(withRetry(operation, FAST.maxRetries, FAST.baseDelayMs)).rejects.toThrow(/truncated/);
    expect(attempts()).toBe(1);
  });

  it('rethrows the last error once the budget is exhausted', async () => {
    const { operation, attempts } = failingTimes(99, fetchFailed('ECONNRESET'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(withRetry(operation, 3, 1)).rejects.toThrow(/fetch failed/);
    expect(attempts()).toBe(3);
  });
});

describe('withRetry — backoff', () => {
  /**
   * Asserted rather than eyeballed: the delay expression is easy to break into a constant while
   * still looking exponential.
   */
  it('waits longer after each successive attempt', async () => {
    const delays: number[] = [];
    const sleepSpy = vi.spyOn(global, 'setTimeout').mockImplementation(((fn: any, ms?: number) => {
      delays.push(ms ?? 0);
      fn();
      return 0 as any;
    }) as any);
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { operation } = failingTimes(99, fetchFailed('ECONNRESET'));
    await expect(withRetry(operation, 3, 1000)).rejects.toThrow();

    sleepSpy.mockRestore();
    expect(delays).toHaveLength(2);
    expect(delays[1]).toBeGreaterThan(delays[0]);
    // 1000 * 2^0 and 1000 * 2^1, each plus up to 1000ms of jitter.
    expect(delays[0]).toBeGreaterThanOrEqual(1000);
    expect(delays[1]).toBeGreaterThanOrEqual(2000);
  });

  /** The log line used to hardcode "rate-limited", which would mislabel every transport retry. */
  it('names the transport cause in the retry log, not "rate-limited"', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { operation } = failingTimes(1, fetchFailed('ECONNRESET'));

    await withRetry(operation, 3, 1);

    const message = warn.mock.calls.map(c => c.join(' ')).join('\n');
    expect(message).toContain('ECONNRESET');
    expect(message).not.toContain('rate-limited');
  });
});

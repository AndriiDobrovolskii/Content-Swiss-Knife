/**
 * http-retry.spec.ts
 *
 * WHY THIS EXISTS. On 2026-08-03 a `--watch` restart landed on an in-flight generation and killed
 * it. `llm.service.ts` had no retry of any kind, so a run that had already paid for the master, slug
 * and SEO was discarded by a connection that dropped for one second. `server/utils/retry.js` cannot
 * help — the connection died beneath it.
 *
 * THE SHAPE IS THE WHOLE POINT, AND IT IS COUNTER-INTUITIVE. The obvious rule — "retry when
 * `status === 0`" — would have missed that exact failure. The Vite dev proxy does not surface an
 * upstream transport failure as a network error; it manufactures an HTTP 500 with an empty
 * `text/plain` body. The browser saw:
 *
 *     status: 500 · error: null · content-type: text/plain
 *     url: "http://localhost:3000/api/llm/vision"     ← port 3000 is Vite, not the API on 3001
 *
 * Our own server answers every failure through sendError (server/index.js:38) as
 * `res.status(...).json({ error: describeError(error) })` — always JSON, always an `error` string.
 * So the body, not the status, says who answered. The rule is one sentence: retry only when the
 * response did not come from our server at all. That is the client-side twin of isTransportFailure
 * in server/utils/retry.js, and it is what keeps the client from multiplying the server's own three
 * attempts on a provider 429/503.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Observable, defer, of, throwError, firstValueFrom } from 'rxjs';

import { isUpstreamTransportFailure, retryTransport } from './http-retry';

/** The real 2026-08-03 failure, field for field. Not a paraphrase — this is the case that a
 *  status-based rule silently fails to catch, so it is worth carrying verbatim. */
const PROXY_500 = { status: 500, statusText: 'Internal Server Error', error: null, url: 'http://localhost:3000/api/llm/vision' };

/** What sendError actually produces: a considered answer from our own server. */
const ours = (status: number, message: string) => ({ status, error: { error: message } });

afterEach(() => vi.restoreAllMocks());

describe('isUpstreamTransportFailure', () => {
  /** FIRST, because it is the one a `status === 0` rule misses — the whole reason this file exists. */
  it('catches the proxy-manufactured 500 that killed the 2026-08-03 run', () => {
    expect(isUpstreamTransportFailure(PROXY_500)).toBe(true);
  });

  it('catches a request the browser could not send at all', () => {
    expect(isUpstreamTransportFailure({ status: 0, error: new ProgressEvent('error') })).toBe(true);
  });

  it('catches a gateway status with no body of ours', () => {
    expect(isUpstreamTransportFailure({ status: 502, error: null })).toBe(true);
    expect(isUpstreamTransportFailure({ status: 504, error: '' })).toBe(true);
  });

  /**
   * THE HALF THAT MUST NOT REGRESS. A provider error reaches us as our own JSON envelope, and
   * withRetry has ALREADY spent three attempts on it. Retrying here would triple that — nine calls
   * for one failure, at full token price — and would do it on exactly the errors that cost the most.
   */
  it('never retries an answer our own server considered', () => {
    expect(isUpstreamTransportFailure(ours(500, 'Gemini overloaded'))).toBe(false);
    expect(isUpstreamTransportFailure(ours(503, 'Service Unavailable'))).toBe(false);
    expect(isUpstreamTransportFailure(ours(504, 'Gateway Timeout'))).toBe(false);
  });

  it('never retries a deterministic failure', () => {
    expect(isUpstreamTransportFailure(ours(400, 'unknown provider'))).toBe(false);
    expect(isUpstreamTransportFailure(ours(401, 'bad key'))).toBe(false);
  });

  /** A 200 that failed to parse, a thrown TypeError, anything not an HTTP response shape. */
  it('does not treat an arbitrary error as retryable', () => {
    expect(isUpstreamTransportFailure(new Error('boom'))).toBe(false);
    expect(isUpstreamTransportFailure(null)).toBe(false);
    expect(isUpstreamTransportFailure(undefined)).toBe(false);
  });
});

describe('retryTransport', () => {
  /** Counts subscriptions, so "did it retry" is answered by the source, not by a spy on the operator. */
  function failingSource<T>(failures: number, error: unknown, value: T) {
    const state = { subscribes: 0 };
    const source = defer(() => {
      state.subscribes++;
      return state.subscribes <= failures ? throwError(() => error) : of(value);
    }) as Observable<T>;
    return { source, state };
  }

  it('recovers a call that dropped twice before succeeding', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { source, state } = failingSource(2, PROXY_500, 'ok');

    await expect(firstValueFrom(source.pipe(retryTransport(3, 1)))).resolves.toBe('ok');
    expect(state.subscribes).toBe(3);
  });

  /** Giving up must surface the ORIGINAL failure — a wrapper would hide what actually happened. */
  it('gives up after the budget and rethrows the original error', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { source, state } = failingSource(99, PROXY_500, 'ok');

    await expect(firstValueFrom(source.pipe(retryTransport(3, 1)))).rejects.toBe(PROXY_500);
    expect(state.subscribes).toBe(3);
  });

  it('lets a real server error through on the first attempt', async () => {
    const serverError = ours(400, 'unknown provider "gemini-9"');
    const { source, state } = failingSource(99, serverError, 'ok');

    await expect(firstValueFrom(source.pipe(retryTransport(3, 1)))).rejects.toBe(serverError);
    expect(state.subscribes).toBe(1);
  });

  it('does not touch a call that succeeds', async () => {
    const { source, state } = failingSource(0, PROXY_500, 'ok');

    await expect(firstValueFrom(source.pipe(retryTransport(3, 1)))).resolves.toBe('ok');
    expect(state.subscribes).toBe(1);
  });

  /** The server prints `[Retry]` for the same event. A browser console should tell the same story,
   *  or a silently-recovered drop looks exactly like a call that was always fine. */
  it('announces each retry the way the server does', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { source } = failingSource(1, PROXY_500, 'ok');

    await firstValueFrom(source.pipe(retryTransport(3, 1)));

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0].join(' ')).toContain('[Retry]');
  });
});

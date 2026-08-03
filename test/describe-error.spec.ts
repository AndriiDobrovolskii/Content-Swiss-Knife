/**
 * describe-error.spec.ts
 *
 * WHY THIS EXISTS. A live generation died on 2026-08-01 and the only evidence was a 24-byte HTTP
 * body: `{"error":"fetch failed"}`. That is undici's generic wrapper — the actual reason lives on
 * `error.cause`, which `sendError` was discarding. Every network fault produced byte-identical
 * output, so the message could not distinguish "DNS is down" from "the provider hung up".
 */
import { describe, it, expect } from 'vitest';

import { describeError } from '../server/utils/describe-error.js';

/** undici's real shape: a TypeError whose `cause` carries the code. */
function fetchFailed(code: string): Error {
  const cause: any = new Error(`${code}`);
  cause.code = code;
  return new TypeError('fetch failed', { cause });
}

describe('describeError', () => {
  /** The case that motivated the helper. */
  it('appends the cause code to the wrapper message', () => {
    expect(describeError(fetchFailed('ECONNRESET'))).toBe('fetch failed: ECONNRESET');
  });

  it('walks a multi-level cause chain', () => {
    const inner: any = new Error('socket closed');
    inner.code = 'UND_ERR_SOCKET';
    const middle = new Error('request failed', { cause: inner });
    const outer = new Error('[gemini] generate failed', { cause: middle });

    expect(describeError(outer)).toBe('[gemini] generate failed: request failed: UND_ERR_SOCKET');
  });

  it('returns the plain message when there is no cause', () => {
    expect(describeError(new Error('invalid request'))).toBe('invalid request');
  });

  it('does not repeat an identical message down the chain', () => {
    const cause = new Error('fetch failed');
    expect(describeError(new Error('fetch failed', { cause }))).toBe('fetch failed');
  });

  it('uses the code when the outermost error has no message', () => {
    const err: any = new Error('');
    err.code = 'ENOTFOUND';
    expect(describeError(err)).toBe('ENOTFOUND');
  });

  /** Logging must never be the thing that brings the server down. */
  it('never returns undefined for odd inputs', () => {
    expect(describeError(null)).toBe('unknown error');
    expect(describeError(undefined)).toBe('unknown error');
    expect(describeError('plain string')).toBe('plain string');
    expect(describeError({} as any)).toBe('unknown error');
  });

  it('terminates on a self-referential cause chain', () => {
    const err: any = new Error('loop');
    err.cause = err;
    expect(describeError(err)).toBe('loop');
  });

  it('bounds a very deep chain rather than walking forever', () => {
    let err: any = new Error('deepest');
    for (let i = 0; i < 50; i++) err = new Error(`level-${i}`, { cause: err });
    expect(describeError(err).split(': ').length).toBeLessThanOrEqual(8);
  });
});

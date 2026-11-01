// @vitest-environment node
/**
 * US-10.1 T8 - the fixed-schedule retry loop (FR-60, FR-61, FR-21, NFR-5, AC-37; plan DD-7, choice P-3).
 *
 * PINNED CONTRACT (server/image-studio/retry-loop.js):
 *   runWithRetry(operation, { sleep, signal }) -> Promise<result>
 *     operation()                 an async function; a failure is an Error carrying a numeric `.status` (the upstream HTTP status)
 *     sleep(ms, signal)           injected; resolves after ms, REJECTS when `signal` aborts (no real timer in this spec)
 *     - at most 4 operation calls; waits between them are exactly 1000, 2000, 4000 ms, no jitter (offsets 0 / 1 / 3 / 7 s);
 *     - retried: upstream 429 and ANY 5xx (a bare 500 included); an error with no numeric status (transport failure, timeout)
 *       is treated as a transient 5xx-class failure and retried the same way;
 *     - NOT retried: any other 4xx - the original error object is rethrown unchanged after exactly one call and no wait;
 *     - exhaustion rejects with an ImageStudioError: code 'UPSTREAM_RETRIES_EXHAUSTED', status = the LAST upstream status
 *       (429 or 5xx), or 502 when the last failure had no numeric status;
 *     - an abort during a wait makes `sleep` reject; the loop then rejects with that rejection and makes no further operation call.
 *   server/utils/retry.js (withRetry) is not used and not changed.
 */
import { describe, it, expect } from 'vitest';
import { makeFakeClock } from './helpers/fakes';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);

const httpError = (status: number) => Object.assign(new Error(`upstream ${status}`), { status });

/** Fake sleep that advances the shared clock and records every wait. Optionally aborts the signal on the Nth wait. */
function harness({ abortOnWait }: { abortOnWait?: number } = {}) {
  const clock = makeFakeClock(0);
  const controller = new AbortController();
  const waits: number[] = [];
  const sleep = async (ms: number, signal?: AbortSignal) => {
    waits.push(ms);
    if (abortOnWait !== undefined && waits.length === abortOnWait) controller.abort();
    if (signal?.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    clock.advance(ms);
  };
  const offsets: number[] = [];
  const op = (script: Array<Error | 'ok'>, result: unknown = 'done') => {
    let i = 0;
    return async () => {
      offsets.push(clock.now());
      const step = script[Math.min(i, script.length - 1)];
      i += 1;
      if (step === 'ok') return result;
      throw step;
    };
  };
  return { clock, controller, waits, sleep, offsets, op };
}

describe('runWithRetry - the fixed 1 / 2 / 4 s schedule', () => {
  it('FR-60 / AC-37: four attempts at offsets 0, 1 s, 3 s and 7 s, waits exactly 1000 / 2000 / 4000 ms, then the exhausted answer', async () => {
    const { runWithRetry } = await load('../../server/image-studio/retry-loop.js');
    const h = harness();
    await expect(runWithRetry(h.op([httpError(503)]), { sleep: h.sleep, signal: h.controller.signal })).rejects.toMatchObject({
      code: 'UPSTREAM_RETRIES_EXHAUSTED',
      status: 503,
    });
    expect(h.offsets).toEqual([0, 1000, 3000, 7000]);
    expect(h.waits).toEqual([1000, 2000, 4000]);
  });

  it('FR-60: there is no jitter - two identical runs wait identically', async () => {
    const { runWithRetry } = await load('../../server/image-studio/retry-loop.js');
    const runs: number[][] = [];
    for (let k = 0; k < 2; k++) {
      const h = harness();
      await runWithRetry(h.op([httpError(500)]), { sleep: h.sleep, signal: h.controller.signal }).catch(() => undefined);
      runs.push(h.waits);
    }
    expect(runs[0]).toEqual([1000, 2000, 4000]);
    expect(runs[1]).toEqual([1000, 2000, 4000]);
  });

  it('FR-60: a success on the first attempt returns its value with no wait and exactly one call', async () => {
    const { runWithRetry } = await load('../../server/image-studio/retry-loop.js');
    const h = harness();
    const out = await runWithRetry(h.op(['ok'], { value: 7 }), { sleep: h.sleep, signal: h.controller.signal });
    expect(out).toEqual({ value: 7 });
    expect(h.offsets).toEqual([0]);
    expect(h.waits).toEqual([]);
  });

  it('FR-60: a success on the third attempt returns its value after waits of 1000 and 2000 ms only', async () => {
    const { runWithRetry } = await load('../../server/image-studio/retry-loop.js');
    const h = harness();
    const out = await runWithRetry(h.op([httpError(429), httpError(503), 'ok'], 'third'), { sleep: h.sleep, signal: h.controller.signal });
    expect(out).toBe('third');
    expect(h.offsets).toEqual([0, 1000, 3000]);
    expect(h.waits).toEqual([1000, 2000]);
  });
});

describe('runWithRetry - which failures are retried', () => {
  it('FR-60: upstream 429 and every 5xx are retried, a bare 500 included (4 calls each)', async () => {
    const { runWithRetry } = await load('../../server/image-studio/retry-loop.js');
    for (const status of [429, 500, 502, 503, 504, 599]) {
      const h = harness();
      await runWithRetry(h.op([httpError(status)]), { sleep: h.sleep, signal: h.controller.signal }).catch(() => undefined);
      expect(h.offsets, String(status)).toHaveLength(4);
    }
  });

  it('FR-60 / FR-61: a 4xx other than 429 is NOT retried - one call, no wait, the original error is rethrown unchanged', async () => {
    const { runWithRetry } = await load('../../server/image-studio/retry-loop.js');
    for (const status of [400, 401, 403, 404, 410, 413, 422]) {
      const h = harness();
      const err = httpError(status);
      const thrown = await runWithRetry(h.op([err]), { sleep: h.sleep, signal: h.controller.signal }).catch((e: unknown) => e);
      expect(thrown, String(status)).toBe(err);
      expect(h.offsets, String(status)).toHaveLength(1);
      expect(h.waits, String(status)).toEqual([]);
    }
  });

  it('FR-60: a non-retryable failure after a retryable one stops the loop at that point', async () => {
    const { runWithRetry } = await load('../../server/image-studio/retry-loop.js');
    const h = harness();
    const stop = httpError(400);
    const thrown = await runWithRetry(h.op([httpError(503), stop]), { sleep: h.sleep, signal: h.controller.signal }).catch((e: unknown) => e);
    expect(thrown).toBe(stop);
    expect(h.offsets).toEqual([0, 1000]);
  });
});

describe('runWithRetry - the exhausted answer (FR-61)', () => {
  it('FR-61: an exhausted 429 keeps status 429 with code UPSTREAM_RETRIES_EXHAUSTED', async () => {
    const { runWithRetry } = await load('../../server/image-studio/retry-loop.js');
    const h = harness();
    await expect(runWithRetry(h.op([httpError(429)]), { sleep: h.sleep, signal: h.controller.signal })).rejects.toMatchObject({
      code: 'UPSTREAM_RETRIES_EXHAUSTED', status: 429,
    });
  });

  it('FR-61: the status of the LAST failure is the one kept (500, 503, 502, 504 -> 504)', async () => {
    const { runWithRetry } = await load('../../server/image-studio/retry-loop.js');
    const h = harness();
    await expect(
      runWithRetry(h.op([httpError(500), httpError(503), httpError(502), httpError(504)]), { sleep: h.sleep, signal: h.controller.signal }),
    ).rejects.toMatchObject({ code: 'UPSTREAM_RETRIES_EXHAUSTED', status: 504 });
  });

  it('FR-61 / P-3: an error with no numeric status is retried like a 5xx and, when exhausted, answers 502 UPSTREAM_RETRIES_EXHAUSTED', async () => {
    const { runWithRetry } = await load('../../server/image-studio/retry-loop.js');
    for (const failure of [new Error('fetch failed'), Object.assign(new Error('timeout'), { status: 'ETIMEDOUT' }), Object.assign(new Error('x'), { status: undefined })]) {
      const h = harness();
      await expect(runWithRetry(h.op([failure]), { sleep: h.sleep, signal: h.controller.signal })).rejects.toMatchObject({
        code: 'UPSTREAM_RETRIES_EXHAUSTED', status: 502,
      });
      expect(h.offsets).toHaveLength(4);
      expect(h.waits).toEqual([1000, 2000, 4000]);
    }
  });

  it('FR-61: the exhausted error never exposes the upstream message to the browser body', async () => {
    const { runWithRetry } = await load('../../server/image-studio/retry-loop.js');
    const h = harness();
    const err = await runWithRetry(h.op([Object.assign(new Error('secret upstream detail sk-123'), { status: 503 })]), { sleep: h.sleep, signal: h.controller.signal }).catch((e: any) => e);
    expect(err.body).toEqual({ error: 'UPSTREAM_RETRIES_EXHAUSTED' });
    expect(JSON.stringify(err.body)).not.toContain('secret');
  });
});

describe('runWithRetry - Cancel (FR-21, PD-5)', () => {
  it('FR-21: aborting during the second backoff rejects and makes NO further operation call', async () => {
    const { runWithRetry } = await load('../../server/image-studio/retry-loop.js');
    const h = harness({ abortOnWait: 2 });
    await expect(runWithRetry(h.op([httpError(503)]), { sleep: h.sleep, signal: h.controller.signal })).rejects.toBeDefined();
    expect(h.offsets).toEqual([0, 1000]); // attempt 3 and 4 never happen
    expect(h.waits).toEqual([1000, 2000]);
  });

  it('FR-21: aborting during the FIRST backoff stops after one call', async () => {
    const { runWithRetry } = await load('../../server/image-studio/retry-loop.js');
    const h = harness({ abortOnWait: 1 });
    await expect(runWithRetry(h.op([httpError(500)]), { sleep: h.sleep, signal: h.controller.signal })).rejects.toBeDefined();
    expect(h.offsets).toEqual([0]);
  });

  it('FR-21: the abort rejection is not rewritten into UPSTREAM_RETRIES_EXHAUSTED (a cancel is not an exhausted retry)', async () => {
    const { runWithRetry } = await load('../../server/image-studio/retry-loop.js');
    const h = harness({ abortOnWait: 1 });
    const err = await runWithRetry(h.op([httpError(500)]), { sleep: h.sleep, signal: h.controller.signal }).catch((e: any) => e);
    expect(err.code).not.toBe('UPSTREAM_RETRIES_EXHAUSTED');
  });

  it('NFR-5: the loop passes the abort signal to sleep so a real sleep can end the wait', async () => {
    const { runWithRetry } = await load('../../server/image-studio/retry-loop.js');
    const h = harness();
    const seen: Array<AbortSignal | undefined> = [];
    const sleep = async (ms: number, signal?: AbortSignal) => { seen.push(signal); await h.sleep(ms, signal); };
    await runWithRetry(h.op([httpError(500)]), { sleep, signal: h.controller.signal }).catch(() => undefined);
    expect(seen).toHaveLength(3);
    expect(seen.every((s) => s === h.controller.signal)).toBe(true);
  });
});

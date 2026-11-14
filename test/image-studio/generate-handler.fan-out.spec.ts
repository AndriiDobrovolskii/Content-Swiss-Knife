// @vitest-environment node
/**
 * generate-handler.fan-out.spec.ts - US-10.6 T8 (FR-5, FR-7, FR-8, FR-9, FR-22, NFR-5, NFR-6; AC-1 server half, AC-3, AC-4, AC-5, AC-14a).
 *
 * `createGenerateHandler(deps)` with an `imageCount` in the request: the handler makes `granted` upstream calls in parallel under one abort
 * signal, writes ONE usage row per successful call priced at `price(model, resolution, slot.imageCount)`, and answers one `images` response with the
 * merged parts, the total `costUsd = price(model, resolution, succeeded)` and (only when imageCount > 1) a `batch` report (plan 5.0, 5.2).
 *
 * Why a separate file: the OD-16 rows of generate-handler.spec.ts are owned by T3 / T4; the new T8 cases live here so the existing file keeps only
 * its closed-table edits. The helpers are the existing handler-fakes; the limiter is the REAL createRateLimiter (the AC-4 example is 28 units used
 * and 4 asked - a fake limiter would prove nothing about the partial grant). `price` is an injected test double: unit * count, with a unit that is
 * a TEST VALUE and not a vendor price (the per-resolution prices are unrecorded, T1 check 5).
 *
 * Wire shape asserted (plan 3.2): batch = { requested, granted, succeeded, failures: [{ cause }] } present only when imageCount > 1.
 * Units: granted counts upstream calls, requested and succeeded count images (plan 5.0).
 * Deliberately NOT asserted here: the pre-call price check (T4, SEAM SM-8) and Cancel keeping partial results (FR-9 (c), G-2 unruled: the plan
 * discards the whole action on Cancel and this file asserts only that nothing is billed after it).
 */
import { describe, it, expect, vi } from 'vitest';
import { filePart, textPart, turn } from './helpers/fakes';
import { makeReq, makeRes, makeStubGemini, makeInstantSleep, makeLogSpy, upstreamError } from './helpers/handler-fakes';
import { deferred, flush } from './helpers/core-fixtures';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const FLASH = 'gemini-3.1-flash-image';
const PRO = 'gemini-3-pro-image';
const UNIT = 0.04; // test double unit price, NOT a vendor price
const IP = '198.51.100.9';

const IMG = (tag: string) => ({ inlineData: { mimeType: 'image/png', data: `data-${tag}` } });
const THOUGHT = (tag: string) => ({ thought: true, inlineData: { mimeType: 'image/png', data: `thought-${tag}` } });
const USAGE = { promptTokenCount: 100, candidatesTokenCount: 1290, thoughtsTokenCount: 10, cachedContentTokenCount: 0 };
const sdk = (parts: unknown[], finishReason = 'STOP') => ({ candidates: [{ finishReason, content: { role: 'model', parts } }], usageMetadata: USAGE });
const oneImage = (tag: string) => sdk([IMG(tag)]);
const safety = () => sdk([IMG('blocked')], 'IMAGE_SAFETY');
const empty = () => sdk([]);
const words = (t = 'I could not draw that') => sdk([{ text: t }]);

function body(over: Record<string, unknown> = {}) {
  return { model: FLASH, aspectRatio: '1:1', resolution: '1K', history: [], newTurn: { id: 'u-new', parts: [textPart('white background')] }, ...over };
}

interface Over {
  generateImage?: (args: any, n: number) => any;
  price?: any;
  insertUsage?: any;
  limiterUsed?: number;
}
async function setup(over: Over = {}) {
  const { createGenerateHandler } = await load('../../server/image-studio/handlers.js');
  const { createRateLimiter } = await load('../../server/image-studio/rate-limiter.js');
  const real = createRateLimiter({ limit: 30, windowMs: 3_600_000, now: () => 0 });
  for (let i = 0; i < (over.limiterUsed ?? 0); i++) real.tryConsume(IP);
  const limiter = {
    tryConsume: vi.fn((k: string) => real.tryConsume(k)),
    tryConsumeUpTo: vi.fn((k: string, n: number) => real.tryConsumeUpTo(k, n)),
    real,
  };
  const gemini = makeStubGemini({ generateImage: over.generateImage ?? ((_a: any, n: number) => oneImage(`c${n}`)) });
  const sleeper = makeInstantSleep();
  const logs = makeLogSpy();
  const insertUsage = over.insertUsage ?? vi.fn();
  const price = over.price ?? vi.fn((...args: unknown[]) => UNIT * (args[args.length - 1] as number));
  const handler = createGenerateHandler({
    getGemini: () => gemini, hasGeminiKey: () => true, now: () => 1_700_000_000_000, sleep: sleeper.sleep, limiter, insertUsage, price, log: logs.log,
  });
  return { handler, gemini, limiter, insertUsage, price, logs };
}
const call = async (s: any, b: unknown) => {
  const res = makeRes();
  await s.handler(makeReq(b, { ip: IP }), res);
  return res;
};
const generateCalls = (s: any) => s.gemini.calls.filter((c: any) => c.method === 'generateImage');
const rows = (s: any): any[] => s.insertUsage.mock.calls.map((c: any[]) => c[0]);

describe('imageCount omitted or 1: the one-image path is unchanged [characterization] (R-11, FR-5, AC-3)', () => {
  for (const imageCount of [undefined, 1]) {
    it(`imageCount ${String(imageCount)}: one upstream call on the tryConsume path, one row, no batch field, the same response keys as today`, async () => {
      const s = await setup();
      const res = await call(s, body(imageCount === undefined ? {} : { imageCount }));
      expect(res.statusCode).toBe(200);
      expect(Object.keys(res.body as any).sort()).toEqual(['costUsd', 'kind', 'parts', 'trimmedTurnIds', 'usage']);
      expect((res.body as any).parts).toEqual([IMG('c1')]);
      expect(generateCalls(s)).toHaveLength(1);
      expect(s.limiter.tryConsume).toHaveBeenCalledTimes(1);
      expect(s.limiter.tryConsumeUpTo).not.toHaveBeenCalled();
      expect(rows(s)).toHaveLength(1);
      expect(rows(s)[0].costUsd).toBe(UNIT);
    });
  }
});

describe('imageCount > 1: N parallel upstream calls (FR-5, AC-3)', () => {
  it('AC-3: imageCount 4 makes 4 upstream calls, answers 4 images and a batch { requested 4, granted 4, succeeded 4, failures [] }, with the batch field present', async () => {
    const s = await setup();
    const res = await call(s, body({ imageCount: 4 }));
    expect(res.statusCode).toBe(200);
    const b = res.body as any;
    expect(Object.keys(b).sort()).toEqual(['batch', 'costUsd', 'kind', 'parts', 'trimmedTurnIds', 'usage']);
    expect(b.kind).toBe('images');
    expect(b.parts).toHaveLength(4);
    expect(b.batch).toEqual({ requested: 4, granted: 4, succeeded: 4, failures: [] });
    expect(generateCalls(s)).toHaveLength(4);
  });

  it('FR-5: imageCount 2 makes exactly 2 upstream calls on the tryConsumeUpTo path with a request of 2', async () => {
    const s = await setup();
    await call(s, body({ imageCount: 2 }));
    expect(generateCalls(s)).toHaveLength(2);
    expect(s.limiter.tryConsumeUpTo).toHaveBeenCalledTimes(1);
    expect(s.limiter.tryConsumeUpTo).toHaveBeenCalledWith(IP, 2);
    expect(s.limiter.tryConsume).not.toHaveBeenCalled();
  });

  it('FR-5: every upstream call is a single-image call - no imageCount or candidate count is passed to the provider, and each gets the same contents and the SAME abort signal', async () => {
    const s = await setup();
    await call(s, body({ imageCount: 4 }));
    const calls = generateCalls(s);
    expect(calls).toHaveLength(4);
    for (const c of calls) {
      expect('imageCount' in c.args).toBe(false);
      expect(c.args.contents).toEqual(calls[0].args.contents);
      expect(c.args.signal).toBe(calls[0].args.signal);
      expect(c.args.model).toBe(FLASH);
      expect(c.args.resolution).toBe('1K');
    }
  });

  it('FR-5 / plan 1: the size and token trim run ONCE per request, not once per slot (history is not counted N times)', async () => {
    const s = await setup();
    await call(s, body({ imageCount: 4 }));
    expect(generateCalls(s)).toHaveLength(4);
    expect(s.gemini.count.countTokens).toBe(1);
  });

  it('FR-7 (a) / NFR-5: out-of-order completion gives the same parts order - the 4 calls finish in the order 4, 2, 1, 3 and the merged parts are still slot 1, 2, 3, 4', async () => {
    const gates = [1, 2, 3, 4].map(() => deferred<any>());
    const s = await setup({ generateImage: (_a, n) => gates[n - 1].promise });
    const pending = call(s, body({ imageCount: 4 }));
    await flush();
    expect(generateCalls(s)).toHaveLength(4);
    for (const n of [4, 2, 1, 3]) gates[n - 1].resolve(oneImage(`s${n}`));
    const res = await pending;
    expect((res.body as any).parts).toEqual([IMG('s1'), IMG('s2'), IMG('s3'), IMG('s4')]);
  });

  it('FR-5: the response usage is the token usage of the successful calls summed', async () => {
    const s = await setup();
    const res = await call(s, body({ imageCount: 2 }));
    expect((res.body as any).usage).toEqual({ inputTokens: 200, outputTokens: 2 * (1290 + 10) });
  });
});

describe('FR-8 / AC-4: each image counts toward the 30 per hour; a partial grant is not a rejection', () => {
  it('AC-4: with 28 used and 4 asked, the real limiter grants 2 - 2 upstream calls, 2 images, batch { requested 4, granted 2, succeeded 2 }, only 2 rows and cost for 2', async () => {
    const s = await setup({ limiterUsed: 28 });
    const res = await call(s, body({ imageCount: 4 }));
    expect(res.statusCode).toBe(200);
    const b = res.body as any;
    expect(b.kind).toBe('images');
    expect(b.parts).toHaveLength(2);
    expect(b.batch).toEqual({ requested: 4, granted: 2, succeeded: 2, failures: [] });
    expect(generateCalls(s)).toHaveLength(2);
    expect(rows(s)).toHaveLength(2);
    expect(b.costUsd).toBe(UNIT * 2);
  });

  it('AC-4: after the partial grant the key is at its limit - the next request is refused with 429 RATE_LIMIT_EXCEEDED and no upstream call', async () => {
    const s = await setup({ limiterUsed: 28 });
    await call(s, body({ imageCount: 4 }));
    const before = generateCalls(s).length;
    const next = await call(s, body({ imageCount: 1 }));
    expect(next.statusCode).toBe(429);
    expect(next.body).toEqual({ error: 'RATE_LIMIT_EXCEEDED' });
    expect(generateCalls(s)).toHaveLength(before);
  });

  it('OD-5 (b): with zero units left the whole request is refused 429 RATE_LIMIT_EXCEEDED with Retry-After, and no image is generated, counted or billed [characterization]', async () => {
    const s = await setup({ limiterUsed: 30 });
    const res = await call(s, body({ imageCount: 2 }));
    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({ error: 'RATE_LIMIT_EXCEEDED' });
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    expect(generateCalls(s)).toHaveLength(0);
    expect(s.insertUsage).not.toHaveBeenCalled();
  });

  it('FR-27: a request that fails body validation never consumes a limiter unit (order of checks unchanged)', async () => {
    const s = await setup();
    const res = await call(s, body({ imageCount: 3 }));
    expect(res.statusCode).toBe(400);
    expect(s.limiter.tryConsumeUpTo).not.toHaveBeenCalled();
    expect(s.limiter.tryConsume).not.toHaveBeenCalled();
  });

  it('OD-5 (a): a granted slot that fails still used its unit - 4 granted, 2 fail, and the key then has 26 units left, not 28', async () => {
    const s = await setup({ generateImage: (_a, n) => (n % 2 === 0 ? empty() : oneImage(`c${n}`)) });
    await call(s, body({ imageCount: 4 }));
    expect(s.limiter.real.tryConsumeUpTo(IP, 30).granted).toBe(26);
  });
});

describe('FR-9 / AC-5: partial failure shows and bills only the images that exist', () => {
  it('AC-5: 2 of 4 fail (a safety block and an empty answer) -> 200 images with the 2 successes, failures [safety, empty], 2 rows, cost for 2', async () => {
    const outcomes = [oneImage('A'), safety(), oneImage('C'), empty()];
    const s = await setup({ generateImage: (_a, n) => outcomes[n - 1] });
    const res = await call(s, body({ imageCount: 4 }));
    expect(res.statusCode).toBe(200);
    const b = res.body as any;
    expect(b.kind).toBe('images');
    expect(b.parts).toEqual([IMG('A'), IMG('C')]);
    expect(b.batch).toEqual({ requested: 4, granted: 4, succeeded: 2, failures: [{ cause: 'safety' }, { cause: 'empty' }] });
    expect(b.costUsd).toBe(UNIT * 2);
    expect(rows(s)).toHaveLength(2);
    expect(rows(s).every((r: any) => r.costUsd === UNIT)).toBe(true);
  });

  it('B-2: a text-only slot beside an image slot answers 200 images with failures [{ cause: "empty" }] and bills only the image', async () => {
    const outcomes = [oneImage('A'), words('private words')];
    const s = await setup({ generateImage: (_a, n) => outcomes[n - 1] });
    const res = await call(s, body({ imageCount: 2 }));
    const b = res.body as any;
    expect(res.statusCode).toBe(200);
    expect(b.kind).toBe('images');
    expect(b.batch.failures).toEqual([{ cause: 'empty' }]);
    expect(JSON.stringify(b)).not.toContain('private words');
    expect(rows(s)).toHaveLength(1);
  });

  it('B-2: an all-text batch answers kind text with no batch and writes no row', async () => {
    const s = await setup({ generateImage: () => words('only words') });
    const res = await call(s, body({ imageCount: 2 }));
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ kind: 'text', text: 'only words', trimmedTurnIds: [] });
    expect(generateCalls(s)).toHaveLength(2);
    expect(s.insertUsage).not.toHaveBeenCalled();
  });

  it('FR-9: when every slot is blocked the answer is the safety outcome, with no cost and no row', async () => {
    const s = await setup({ generateImage: () => safety() });
    const res = await call(s, body({ imageCount: 4 }));
    expect(res.statusCode).toBe(200);
    expect((res.body as any).kind).toBe('safety');
    expect(generateCalls(s)).toHaveLength(4);
    expect(res.body).not.toHaveProperty('costUsd');
    expect(s.insertUsage).not.toHaveBeenCalled();
  });

  it('FR-9 / FR-64: when every slot returns an empty answer the request answers 502 EMPTY_RESPONSE, no row, and every slot used a unit', async () => {
    const s = await setup({ generateImage: () => empty() });
    const res = await call(s, body({ imageCount: 4 }));
    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: 'EMPTY_RESPONSE' });
    expect(s.insertUsage).not.toHaveBeenCalled();
    expect(s.limiter.real.tryConsumeUpTo(IP, 30).granted).toBe(26);
  });

  it('FR-9 (a): an upstream failure that exhausts the retries of ONE slot is "retries_exhausted" for that image only - the other three succeed', async () => {
    // calls 1, 3, 4 are the first attempts of slots 1, 3, 4 and succeed; call 2 and every retry (5, 6, 7) belong to slot 2 and fail with a 503
    const s = await setup({ generateImage: (_a, n) => { if (n === 2 || n >= 5) throw upstreamError(503); return oneImage(`c${n}`); } });
    const res = await call(s, body({ imageCount: 4 }));
    expect(res.statusCode).toBe(200);
    const b = res.body as any;
    expect(b.parts).toHaveLength(3);
    expect(b.batch).toEqual({ requested: 4, granted: 4, succeeded: 3, failures: [{ cause: 'retries_exhausted' }] });
    expect(rows(s)).toHaveLength(3);
  });

  it('FR-9: a non-retryable upstream error (400) in one slot is reported as a failure of that slot and the others are kept', async () => {
    const s = await setup({ generateImage: (_a, n) => { if (n === 2) throw upstreamError(400); return oneImage(`c${n}`); } });
    const res = await call(s, body({ imageCount: 2 }));
    expect(res.statusCode).toBe(200);
    expect((res.body as any).batch).toEqual({ requested: 2, granted: 2, succeeded: 1, failures: [{ cause: 'retries_exhausted' }] });
  });

  it('FR-69: a usage-row write failure never changes the 200 or the images shown', async () => {
    const insertUsage = vi.fn(async () => { throw new Error('disk full'); });
    const s = await setup({ insertUsage });
    const res = await call(s, body({ imageCount: 2 }));
    expect(res.statusCode).toBe(200);
    expect((res.body as any).parts).toHaveLength(2);
    expect(insertUsage).toHaveBeenCalledTimes(2);
  });
});

describe('FILE_MISSING with several slots (US-10.1 FR-17 recovery stays reachable)', () => {
  const fileHistory = () => [turn('u1', 'user', textPart('prompt'), filePart('https://generativelanguage.googleapis.com/v1beta/files/orig1')), turn('m1', 'model', IMG('prev'))];
  const gone = () => Object.assign(new Error('Requested entity was not found: files/orig1'), { status: 404 });

  it('when every slot fails with the file-missing signature the answer is 410 FILE_MISSING and nothing is billed', async () => {
    const s = await setup({ generateImage: () => { throw gone(); } });
    const res = await call(s, body({ imageCount: 2, history: fileHistory() }));
    expect(res.statusCode).toBe(410);
    expect(generateCalls(s)).toHaveLength(2);
    expect(res.body).toEqual({ error: 'FILE_MISSING' });
    expect(s.insertUsage).not.toHaveBeenCalled();
  });

  it('when only one slot reports the file missing and another succeeds, the images are kept and the failure cause is "file_missing"', async () => {
    const s = await setup({ generateImage: (_a, n) => { if (n === 2) throw gone(); return oneImage(`c${n}`); } });
    const res = await call(s, body({ imageCount: 2, history: fileHistory() }));
    expect(res.statusCode).toBe(200);
    expect((res.body as any).batch.failures).toEqual([{ cause: 'file_missing' }]);
    expect((res.body as any).parts).toHaveLength(1);
  });
});

describe('plan 5.0 units: a call is worth the images it returns (review B-1, risk R-12)', () => {
  it('a slot that returns TWO image parts writes one row priced at price(model, resolution, 2), both images are in parts and batch.succeeded counts images', async () => {
    const outcomes = [sdk([IMG('A1'), IMG('A2')]), oneImage('B')];
    const s = await setup({ generateImage: (_a, n) => outcomes[n - 1] });
    const res = await call(s, body({ imageCount: 2 }));
    const b = res.body as any;
    expect(b.parts).toEqual([IMG('A1'), IMG('A2'), IMG('B')]);
    expect(b.batch).toEqual({ requested: 2, granted: 2, succeeded: 3, failures: [] });
    expect(s.price).toHaveBeenCalledWith(FLASH, '1K', 2);
    expect(rows(s).map((r: any) => r.costUsd)).toEqual([UNIT * 2, UNIT]);
    expect(b.costUsd).toBe(UNIT * 3);
  });

  it('a slot that returns a thought image plus a final image is billed for ONE image and its thought part stays in parts', async () => {
    const outcomes = [sdk([THOUGHT('A'), IMG('A')]), oneImage('B')];
    const s = await setup({ generateImage: (_a, n) => outcomes[n - 1] });
    const res = await call(s, body({ imageCount: 2 }));
    const b = res.body as any;
    expect(b.parts).toEqual([THOUGHT('A'), IMG('A'), IMG('B')]);
    expect(b.batch.succeeded).toBe(2);
    expect(rows(s).map((r: any) => r.costUsd)).toEqual([UNIT, UNIT]);
  });

  it('FR-21: the response costUsd equals price(model, resolution, succeeded) - the same expression over the same unit as the sum of the rows', async () => {
    const s = await setup();
    const res = await call(s, body({ imageCount: 4 }));
    expect(s.price).toHaveBeenCalledWith(FLASH, '1K', 4);
    expect((res.body as any).costUsd).toBe(UNIT * 4);
  });
});

describe('usage rows carry the model and the resolution (AC-1 server half, FR-1)', () => {
  it('a 4K request on the Pro model writes rows whose model is Pro and whose taskLabel resolution segment is 4K, and prices the pair', async () => {
    const s = await setup();
    const res = await call(s, body({ model: PRO, resolution: '4K', imageCount: 2, presetId: 'lifestyle' }));
    expect(res.statusCode).toBe(200);
    expect(s.price).toHaveBeenCalledWith(PRO, '4K', 1);
    for (const row of rows(s)) {
      expect(row.model).toBe(PRO);
      expect(row.taskLabel).toBe('image-studio|lifestyle|4K');
      expect(row.mode).toBeNull();
    }
    expect(rows(s)).toHaveLength(2);
  });
});

describe('Cancel (FR-21): nothing is written after the response closed (G-2: the whole action is discarded)', () => {
  it('closing the response while the calls are in flight writes no row and sends no body, even when the calls then complete', async () => {
    const gates = [1, 2].map(() => deferred<any>());
    const s = await setup({ generateImage: (_a, n) => gates[n - 1].promise });
    const res = makeRes();
    const pending = s.handler(makeReq(body({ imageCount: 2 }), { ip: IP }), res);
    await flush();
    expect(generateCalls(s)).toHaveLength(2);
    res.closeEarly();
    for (const c of generateCalls(s)) expect(c.args.signal.aborted).toBe(true);
    gates[0].resolve(oneImage('A'));
    gates[1].resolve(oneImage('B'));
    await pending;
    expect(s.insertUsage).not.toHaveBeenCalled();
    expect(res.body).toBeUndefined();
  });
});


// ---------------------------------------------------------------------------------------------------------------------
// v2 additions (owner rulings of 2026-11-14): the REAL price table (OD-2, OD-18) and the pre-call pair check (OD-15, SM-8 i).
// ---------------------------------------------------------------------------------------------------------------------
describe('production price wiring: the real computeImageCost is the handler price (OD-2, OD-18, AC-14)', () => {
  const realPrice = async () => (await load('../../server/usage/pricing.js')).computeImageCost;

  it('OD-2 / AC-14: 2 Pro 4K images record two rows of exactly 0.24 and answer costUsd 0.24 * 2 - the recorded cost is price(model, resolution) x generated count', async () => {
    const s = await setup({ price: await realPrice() });
    const res = await call(s, body({ model: PRO, resolution: '4K', imageCount: 2 }));
    expect(res.statusCode).toBe(200);
    expect(rows(s).map((r: any) => r.costUsd)).toEqual([0.24, 0.24]);
    expect((res.body as any).costUsd).toBe(0.24 * 2);
  });

  it('OD-2: 4 Flash 2K images cost 0.101 each (0.101 * 4 in total) and 1 Flash 1K image costs 0.067', async () => {
    const four = await setup({ price: await realPrice() });
    const res4 = await call(four, body({ resolution: '2K', imageCount: 4 }));
    expect(rows(four).every((r: any) => r.costUsd === 0.101)).toBe(true);
    expect((res4.body as any).costUsd).toBe(0.101 * 4);
    const one = await setup({ price: await realPrice() });
    const res1 = await call(one, body({ resolution: '1K' }));
    expect((res1.body as any).costUsd).toBe(0.067);
  });

  it('OD-18: the cost contains no input-image term - a request that sends input images (history with an inline image) costs exactly the output price', async () => {
    const withInput = [turn('u1', 'user', textPart('make it'), { inlineData: { mimeType: 'image/png', data: 'QUJDRA==' } }), turn('m1', 'model', IMG('prev'))];
    const s = await setup({ price: await realPrice() });
    const res = await call(s, body({ model: PRO, resolution: '2K', history: withInput }));
    expect((res.body as any).costUsd).toBe(0.134);
    expect(rows(s)[0].costUsd).toBe(0.134);
  });

  it('OD-14 Rule A: nothing is rounded in storage - three images at 0.067 record the raw product 0.067 * 3', async () => {
    const s = await setup({ price: await realPrice(), generateImage: () => sdk([IMG('a'), IMG('b'), IMG('c')]) });
    const res = await call(s, body({ resolution: '1K' }));
    expect((res.body as any).costUsd).toBe(0.067 * 3);
  });
});

describe('the price-pair check comes BEFORE the paid call (OD-15 pre-call, SM-8 i: PRICE_NOT_CONFIGURED 500)', () => {
  const unpriced = async () => {
    const { PriceNotConfiguredError } = await load('../../server/usage/pricing.js');
    return vi.fn(() => { throw new PriceNotConfiguredError(FLASH, '1K'); });
  };

  it('SM-8: an unpriced pair with imageCount 4 answers 500 PRICE_NOT_CONFIGURED, makes NO upstream call (not even a token count), consumes NO limiter unit and writes no row', async () => {
    const s = await setup({ price: await unpriced() });
    const res = await call(s, body({ imageCount: 4 }));
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'PRICE_NOT_CONFIGURED' });
    expect(s.gemini.calls).toHaveLength(0);
    expect(s.limiter.tryConsumeUpTo).not.toHaveBeenCalled();
    expect(s.limiter.tryConsume).not.toHaveBeenCalled();
    expect(s.limiter.real.tryConsumeUpTo(IP, 30).granted).toBe(30);
    expect(s.insertUsage).not.toHaveBeenCalled();
  });

  it('SM-8: the model id is logged server-side and no upstream text reaches the body', async () => {
    const s = await setup({ price: await unpriced() });
    const res = await call(s, body({ imageCount: 2 }));
    expect(res.statusCode).toBe(500);
    expect(s.logs.text()).toContain(FLASH);
    expect(Object.keys(res.body as object)).toEqual(['error']);
  });

  it('OD-15: price(model, resolution, 1) is consulted once BEFORE the first token count, and the order is price, count, limiter, generate', async () => {
    const order: string[] = [];
    const price = vi.fn((...args: unknown[]) => { order.push('price'); return UNIT * (args[args.length - 1] as number); });
    const s = await setup({ price, generateImage: () => { order.push('generate'); return oneImage('x'); } });
    const origCount = s.gemini.countTokens;
    s.gemini.countTokens = async (a: any) => { order.push('count'); return origCount(a); };
    await call(s, body({ imageCount: 2 }));
    expect(price.mock.calls[0]).toEqual([FLASH, '1K', 1]);
    expect(order.indexOf('price')).toBe(0);
    expect(order.indexOf('count')).toBeGreaterThan(order.indexOf('price'));
    expect(order.indexOf('generate')).toBeGreaterThan(order.indexOf('count'));
  });

  it('OD-15: a request refused by body validation never reaches the price check [characterization]', async () => {
    const price = vi.fn();
    const s = await setup({ price });
    const res = await call(s, body({ aspectRatio: '2:1' }));
    expect(res.statusCode).toBe(400);
    expect(price).not.toHaveBeenCalled();
  });
});

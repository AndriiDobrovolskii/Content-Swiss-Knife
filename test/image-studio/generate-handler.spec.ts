// @vitest-environment node
/**
 * generate-handler.spec.ts - US-10.1 T18 (FR-5, FR-6, FR-17, FR-21, FR-26, FR-27, FR-32, FR-43, FR-46, FR-49, FR-60..64,
 * FR-66, FR-69, FR-70, FR-80, FR-84; AC-14, AC-21, AC-24, AC-28, AC-29, AC-37..AC-40, AC-42, AC-43).
 *
 * `createGenerateHandler(deps)` from server/image-studio/handlers.js (contract: CONTRACT.md "Server contracts"), driven with
 * fake req/res (helpers/handler-fakes.ts), a stub Gemini provider, an injected clock/sleep/limiter/price/usage sink. No
 * sockets, no network, no real waiting: backoff is observed through the recorded `sleep(ms)` arguments.
 *
 * Order of checks (FR-27): body validation 400 -> key 501 -> size trim + byte test 413 -> token trim + token test 413 ->
 * ATOMIC limiter step (429) -> Gemini generate under the retry loop -> classify -> price -> usage row -> response.
 * The first failing check answers; later steps neither run nor count.
 *
 * Pinned response shapes (CONTRACT.md "Wire shapes"):
 *   200 images : { kind, parts, costUsd, usage: { inputTokens, outputTokens }, trimmedTurnIds }   (no id of any kind: FR-43)
 *   200 text   : { kind, text, trimmedTurnIds }          200 safety : { kind, reason, trimmedTurnIds }
 *   non-200    : { error } with a closed code (SD-2) or the fixed text 'Помилка API'; never trimmedTurnIds, never costUsd
 * The provider stub is called as generateImage({ model, contents, aspectRatio, resolution, signal }) with `contents` =
 * [{ role, parts }, ...] (history turns then the new user turn, ids stripped, parts untouched) and countTokens({ model,
 * contents: [turn], signal }) once per retained turn plus once for the new turn.
 * Model rows used below are the two image entries T2 adds to the shared catalogue.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { filePart, inlineImagePart, textPart, turn, PNG_MAGIC, padTo, toBase64, makeFakeClock } from './helpers/fakes';
import { makeReq, makeRes, makeStubGemini, makeInstantSleep, makeControlledSleep, makeLogSpy, upstreamError } from './helpers/handler-fakes';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const HANDLERS = '../../server/image-studio/handlers.js';
const PRICING = '../../server/usage/pricing.js';
const FLASH = 'gemini-3.1-flash-image';
const PRO = 'gemini-3.1-pro-image-preview';

const IMG = { inlineData: { mimeType: 'image/png', data: 'QUJDRA==' } };
const IMG2 = { inlineData: { mimeType: 'image/jpeg', data: 'RUZHSA==' } };
const THOUGHT_IMG = { thought: true, inlineData: { mimeType: 'image/png', data: 'dGhvdWdodA==' } };
const USAGE = { promptTokenCount: 100, candidatesTokenCount: 1290, thoughtsTokenCount: 10, cachedContentTokenCount: 0 };
const sdk = (parts: unknown[] | undefined, finishReason: string | undefined = 'STOP', extra: Record<string, unknown> = {}) => ({
  candidates: [{ ...(finishReason ? { finishReason } : {}), content: { role: 'model', parts } }], usageMetadata: USAGE, ...extra,
});

function body(over: Record<string, unknown> = {}) {
  return { model: FLASH, aspectRatio: '1:1', resolution: '1K', history: [], newTurn: { id: 'u-new', parts: [textPart('white background')] }, ...over };
}
/** U1 M1 ... Un Mn with small inline images; u1 carries a file_uri original. */
function history(pairs: number, imageChars = 8) {
  const out: any[] = [];
  for (let i = 1; i <= pairs; i++) {
    out.push(turn(`u${i}`, 'user', textPart(`prompt ${i}`), ...(i === 1 ? [filePart('https://generativelanguage.googleapis.com/v1beta/files/orig1')] : [])));
    out.push(turn(`m${i}`, 'model', inlineImagePart('image/png', 'A'.repeat(imageChars), { thoughtSignature: `sig-${i}` })));
  }
  return out;
}

interface Over {
  gemini?: any; script?: Parameters<typeof makeStubGemini>[0]; hasKey?: boolean; sleep?: any; limiter?: any;
  price?: any; insertUsage?: any;
}
async function setup(over: Over = {}) {
  const { createGenerateHandler } = await load(HANDLERS);
  const order: string[] = [];
  const gemini = over.gemini ?? makeStubGemini({
    ...(over.script ?? {}),
    countTokens: (a: any, n: number) => { order.push('count'); return over.script?.countTokens ? over.script.countTokens(a, n) : { totalTokens: 10 }; },
    generateImage: (a: any, n: number) => { order.push('generate'); return over.script?.generateImage ? over.script.generateImage(a, n) : sdk([IMG]); },
  });
  const sleeper = over.sleep ?? makeInstantSleep();
  const logs = makeLogSpy();
  const limiter = over.limiter ?? { tryConsume: vi.fn(() => { order.push('limiter'); return { allowed: true, retryAfterSeconds: 0 }; }) };
  const insertUsage = over.insertUsage ?? vi.fn();
  const price = over.price ?? vi.fn((_id: string, n: number) => n * 0.03);
  const getGemini = vi.fn(() => gemini);
  const hasGeminiKey = vi.fn(() => over.hasKey ?? true);
  const handler = createGenerateHandler({ getGemini, hasGeminiKey, now: () => 1_700_000_000_000, sleep: sleeper.sleep, limiter, insertUsage, price, log: logs.log });
  return { handler, gemini, sleeper, logs, limiter, insertUsage, price, getGemini, hasGeminiKey, order };
}
const call = async (s: any, b: unknown, ip?: string) => {
  const req = makeReq(b, { ip });
  const res = makeRes();
  await s.handler(req, res);
  return res;
};
const generateCalls = (s: any) => s.gemini.calls.filter((c: any) => c.method === 'generateImage');
const countCalls = (s: any) => s.gemini.calls.filter((c: any) => c.method === 'countTokens');

afterEach(() => { delete process.env['LLM_PROVIDER']; delete process.env['GEMINI_API_KEY']; });

// ---------------------------------------------------------------------------------------------------------------------
describe('generate handler - order of checks and what counts (FR-27, FR-66)', () => {
  it('FR-27 / FR-19 / FR-3: an invalid body is 400 INVALID_REQUEST and nothing after it runs or counts (key, tokens, limiter, Gemini)', async () => {
    const bad = [
      body({ aspectRatio: '2:1' }),
      body({ model: 'gemini-3.1-pro-preview' }), // a TEXT model id on the image route (FR-3)
      body({ resolution: '4K' }), // 4K is not allowed for Flash
      body({ newTurn: { id: 'u-new', parts: [textPart('   ')] } }), // whitespace only and no image (FR-18)
      body({ history: history(1).slice(0, 1) }), // odd-length history
      undefined,
    ];
    for (const b of bad) {
      const s = await setup();
      const res = await call(s, b);
      expect(res.statusCode, JSON.stringify(b)?.slice(0, 80)).toBe(400);
      expect(res.body).toEqual({ error: 'INVALID_REQUEST' });
      expect(s.hasGeminiKey).not.toHaveBeenCalled();
      expect(s.gemini.calls).toHaveLength(0);
      expect(s.limiter.tryConsume).not.toHaveBeenCalled();
    }
  });

  it('FR-27 / FR-5: with no key a valid body is 501 GEMINI_KEY_MISSING - nothing generated, counted, billed or logged', async () => {
    const s = await setup({ hasKey: false });
    const res = await call(s, body());
    expect(res.statusCode).toBe(501);
    expect(res.body).toEqual({ error: 'GEMINI_KEY_MISSING' });
    expect(s.gemini.calls).toHaveLength(0);
    expect(s.limiter.tryConsume).not.toHaveBeenCalled();
    expect(s.insertUsage).not.toHaveBeenCalled();
    expect(s.sleeper.waits).toEqual([]);
  });

  it('FR-27 / FR-46: a protected remainder over 18 MB is 413 PROTECTED_HISTORY_EXCEEDS_LIMIT before the limiter and before any Gemini generate call', async () => {
    const s = await setup();
    const huge = { id: 'u-new', parts: [textPart('edit'), inlineImagePart('image/png', 'Z'.repeat(18_874_368 + 1))] };
    const res = await call(s, body({ newTurn: huge }));
    expect(res.statusCode).toBe(413);
    expect(res.body).toEqual({ error: 'PROTECTED_HISTORY_EXCEEDS_LIMIT' });
    expect(generateCalls(s)).toHaveLength(0);
    expect(s.limiter.tryConsume).not.toHaveBeenCalled();
    expect(s.insertUsage).not.toHaveBeenCalled();
  });

  it('FR-27 / FR-46: a protected remainder over 80% of the token limit is the same 413, after k + 1 count calls and before the limiter', async () => {
    const s = await setup({ script: { countTokens: () => ({ totalTokens: 60_000 }) } });
    const res = await call(s, body({ history: history(1) })); // U1 + M1 + new turn = 180 000 > 80% of 131 072
    expect(res.statusCode).toBe(413);
    expect(res.body).toEqual({ error: 'PROTECTED_HISTORY_EXCEEDS_LIMIT' });
    expect(countCalls(s)).toHaveLength(3);
    expect(generateCalls(s)).toHaveLength(0);
    expect(s.limiter.tryConsume).not.toHaveBeenCalled();
  });

  it('FR-27 / FR-66: the sequence is count calls, THEN the single atomic limiter step, THEN the Gemini call - the limiter is consulted exactly once, with req.ip', async () => {
    const s = await setup();
    await call(s, body({ history: history(2) }), '198.51.100.9');
    expect(s.limiter.tryConsume).toHaveBeenCalledTimes(1);
    expect(s.limiter.tryConsume).toHaveBeenCalledWith('198.51.100.9');
    const lastCount = s.order.lastIndexOf('count');
    expect(lastCount).toBeGreaterThanOrEqual(0);
    expect(s.order.indexOf('limiter')).toBeGreaterThan(lastCount);
    expect(s.order.indexOf('generate')).toBeGreaterThan(s.order.indexOf('limiter'));
  });

  it('FR-68 / FR-27: a refused limiter step is 429 RATE_LIMIT_EXCEEDED with Retry-After in whole seconds, and generates, bills and logs nothing', async () => {
    const limiter = { tryConsume: vi.fn(() => ({ allowed: false, retryAfterSeconds: 1234 })) };
    const s = await setup({ limiter });
    const res = await call(s, body());
    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({ error: 'RATE_LIMIT_EXCEEDED' });
    expect(res.headers['retry-after']).toBe('1234');
    expect(generateCalls(s)).toHaveLength(0);
    expect(s.insertUsage).not.toHaveBeenCalled();
    expect(s.sleeper.waits).toEqual([]); // not retried by the BFF
  });

  it('FR-66 / AC-42: with the real limiter the first 30 requests of one IP pass and the 31st is 429; another IP is unaffected', async () => {
    const { createRateLimiter } = await load('../../server/image-studio/rate-limiter.js');
    const clock = makeFakeClock(5_000_000);
    const limiter = createRateLimiter({ limit: 30, windowMs: 3_600_000, now: () => clock.now() });
    const s = await setup({ limiter });
    for (let i = 1; i <= 30; i++) expect((await call(s, body(), '203.0.113.50')).statusCode, `request ${i}`).toBe(200);
    const refused = await call(s, body(), '203.0.113.50');
    expect(refused.statusCode).toBe(429);
    expect(refused.body).toEqual({ error: 'RATE_LIMIT_EXCEEDED' });
    expect(Number(refused.headers['retry-after'])).toBeGreaterThan(0);
    expect(Number(refused.headers['retry-after'])).toBeLessThanOrEqual(3600);
    expect(generateCalls(s)).toHaveLength(30); // the 31st never reached Gemini
    expect((await call(s, body(), '203.0.113.51')).statusCode).toBe(200);
  });

  it('FR-66: every counted class consumes exactly ONE unit - image, text, safety, empty response, upstream 4xx, exhausted upstream 5xx', async () => {
    const scenarios: Array<[string, Over['script']]> = [
      ['images', { generateImage: () => sdk([IMG]) }],
      ['text', { generateImage: () => sdk([{ text: 'I cannot draw that' }]) }],
      ['safety', { generateImage: () => sdk([IMG], 'IMAGE_SAFETY') }],
      ['empty response (class 4)', { generateImage: () => sdk([]) }],
      ['upstream 4xx', { generateImage: () => { throw upstreamError(400, 'bad'); } }],
      ['upstream 5xx exhausted after the BFF retries', { generateImage: () => { throw upstreamError(503, 'down'); } }],
    ];
    for (const [name, script] of scenarios) {
      const s = await setup({ script });
      await call(s, body());
      expect(s.limiter.tryConsume, name).toHaveBeenCalledTimes(1);
    }
  });

  it('FR-60 / FR-66 / FR-69: one request with BFF retries (503, 503, success) is ONE counted unit and writes ONE usage row, after waits of 1000 and 2000 ms', async () => {
    const s = await setup({ script: { generateImage: (_a, n) => { if (n < 3) throw upstreamError(503); return sdk([IMG]); } } });
    const res = await call(s, body());
    expect(res.statusCode).toBe(200);
    expect(generateCalls(s)).toHaveLength(3);
    expect(s.sleeper.waits).toEqual([1000, 2000]);
    expect(s.limiter.tryConsume).toHaveBeenCalledTimes(1);
    expect(s.insertUsage).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('generate handler - the three 200 variants (FR-24, FR-26, FR-62, FR-63, FR-70, FR-84)', () => {
  it('FR-26 class 2 / FR-24: images -> 200 { kind, parts, costUsd, usage, trimmedTurnIds } with the parts exactly as returned and nothing else (the BFF invents no turn id)', async () => {
    const s = await setup({ script: { generateImage: () => sdk([{ text: 'here you go' }, IMG]) } });
    const res = await call(s, body());
    expect(res.statusCode).toBe(200);
    const b = res.body as any;
    expect(Object.keys(b).sort()).toEqual(['costUsd', 'kind', 'parts', 'trimmedTurnIds', 'usage']);
    expect(b.kind).toBe('images');
    expect(b.parts).toEqual([{ text: 'here you go' }, IMG]);
    expect(b.trimmedTurnIds).toEqual([]);
    expect(b.usage).toEqual({ inputTokens: 100, outputTokens: 1290 + 10 });
  });

  it('FR-70: costUsd is the per-image price x the number of images; two images cost twice the unit price', async () => {
    const s = await setup({ script: { generateImage: () => sdk([IMG, IMG2]) } });
    const res = await call(s, body());
    expect(s.price).toHaveBeenCalledWith(FLASH, 2);
    expect((res.body as any).costUsd).toBeCloseTo(0.06, 10);
  });

  it('FR-84: a thought image is not priced, not counted and not a version - one thought image plus one final image costs ONE unit, the thought part stays in parts', async () => {
    const s = await setup({ script: { generateImage: () => sdk([THOUGHT_IMG, IMG]) } });
    const res = await call(s, body());
    expect(s.price).toHaveBeenCalledWith(FLASH, 1);
    expect((res.body as any).costUsd).toBeCloseTo(0.03, 10);
    expect((res.body as any).parts).toEqual([THOUGHT_IMG, IMG]);
  });

  it('FR-84: a thought image plus text with STOP is the text variant: 200 { kind: text }, no price, no row', async () => {
    const s = await setup({ script: { generateImage: () => sdk([THOUGHT_IMG, { text: 'only words' }]) } });
    const res = await call(s, body());
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ kind: 'text', text: 'only words', trimmedTurnIds: [] });
    expect(s.price).not.toHaveBeenCalled();
    expect(s.insertUsage).not.toHaveBeenCalled();
  });

  it('FR-62 / AC-38: a safety-finished candidate is 200 { kind: safety, reason } even if it holds an image; no cost, no row, no price lookup, history untouched', async () => {
    const price = vi.fn(() => { throw new Error('price must not be consulted for a safety block'); });
    const s = await setup({ price, script: { generateImage: () => sdk([IMG], 'IMAGE_PROHIBITED_CONTENT') } });
    const res = await call(s, body());
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ kind: 'safety', reason: 'IMAGE_PROHIBITED_CONTENT', trimmedTurnIds: [] });
    expect(s.insertUsage).not.toHaveBeenCalled();
    expect(price).not.toHaveBeenCalled();
  });

  it('FR-62: a prompt-level block with no candidate is 200 { kind: safety } carrying the blockReason', async () => {
    const s = await setup({ script: { generateImage: () => ({ promptFeedback: { blockReason: 'PROHIBITED_CONTENT' }, usageMetadata: USAGE }) } });
    const res = await call(s, body());
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ kind: 'safety', reason: 'PROHIBITED_CONTENT', trimmedTurnIds: [] });
    expect(s.insertUsage).not.toHaveBeenCalled();
  });

  it('FR-63 / AC-39: a text-only reply with STOP is 200 { kind: text, text }, writes no row and costs nothing', async () => {
    const s = await setup({ script: { generateImage: () => sdk([{ text: 'Please describe the product.' }]) } });
    const res = await call(s, body());
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ kind: 'text', text: 'Please describe the product.', trimmedTurnIds: [] });
    expect(s.insertUsage).not.toHaveBeenCalled();
    expect(s.price).not.toHaveBeenCalled();
  });

  it('FR-64 / SD-15: an empty or truncated reply (class 4) is 502 EMPTY_RESPONSE with no trimmedTurnIds, no cost, no row - and it was counted', async () => {
    for (const reply of [sdk([]), sdk([{ text: 'cut off' }], 'MAX_TOKENS'), { candidates: [] }]) {
      const s = await setup({ script: { generateImage: () => reply } });
      const res = await call(s, body());
      expect(res.statusCode).toBe(502);
      expect(res.body).toEqual({ error: 'EMPTY_RESPONSE' });
      expect(s.insertUsage).not.toHaveBeenCalled();
      expect(s.limiter.tryConsume).toHaveBeenCalledTimes(1);
    }
  });

  it('FR-70 / SD-26 / N-11: a paid image with no resolvable price is 500 PRICE_NOT_CONFIGURED - no row, no costUsd, no trimmedTurnIds, model id logged server-side, still a counted request', async () => {
    const pricing = await load(PRICING);
    let noPrice: unknown;
    try { pricing.computeImageCost('gemini-9-image', 1); } catch (e) { noPrice = e; }
    expect(noPrice, 'pricing.js must throw its typed PriceNotConfiguredError').toBeInstanceOf(pricing.PriceNotConfiguredError);
    const price = vi.fn(() => { throw noPrice; });
    const s = await setup({ price });
    const res = await call(s, body());
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'PRICE_NOT_CONFIGURED' });
    expect(s.insertUsage).not.toHaveBeenCalled();
    expect(s.limiter.tryConsume).toHaveBeenCalledTimes(1);
    expect(s.logs.text()).toContain(FLASH); // FR-70: the model id is logged server-side
  });

  it('FR-43: every 200 carries trimmedTurnIds - also the text and safety variants after a trim', async () => {
    const h = history(4, 6_000_000); // 4 x 6 MB inline -> the oldest pair must go
    for (const [reply, kind] of [[sdk([{ text: 'words' }]), 'text'], [sdk([IMG], 'SAFETY'), 'safety'], [sdk([IMG]), 'images']] as const) {
      const s = await setup({ script: { generateImage: () => reply } });
      const res = await call(s, body({ history: h }));
      expect((res.body as any).kind).toBe(kind);
      expect((res.body as any).trimmedTurnIds).toEqual(['m1', 'u2']);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('generate handler - trimming, history and the outbound request (FR-35, FR-39..43, FR-80)', () => {
  it('FR-40 / FR-43 / AC-24: above 80% of the input limit the oldest pair is removed, listed in trimmedTurnIds, and absent from what Gemini receives', async () => {
    // 7 turns (6 retained + the new one) x 16 000 = 112 000 > 104 857 (80% of 131 072); one pair fewer = 80 000.
    const s = await setup({ script: { countTokens: () => ({ totalTokens: 16_000 }) } });
    const res = await call(s, body({ history: history(3) }));
    expect(res.statusCode).toBe(200);
    expect((res.body as any).trimmedTurnIds).toEqual(['m1', 'u2']);
    expect(countCalls(s)).toHaveLength(7);
    const contents = generateCalls(s)[0].args.contents;
    expect(contents.map((c: any) => c.role)).toEqual(['user', 'model', 'user', 'model', 'user']); // u1, m2, u3, m3, new turn
    expect(contents[0].parts[0]).toEqual({ text: 'prompt 1' }); // the protected first user turn is kept
    expect(contents[1].parts[0].thoughtSignature).toBe('sig-2'); // m1 and u2 are gone, m2 is next
    expect(contents[2].parts[0]).toEqual({ text: 'prompt 3' });
    expect(generateCalls(s)[0].args.contents).toHaveLength(5); // u1, m2, u3, m3, new turn
  });

  it('FR-39 / FR-43 / AC-29: above 18 MB the oldest pair is removed before any token count, and k is counted after that trim', async () => {
    const s = await setup();
    const res = await call(s, body({ history: history(4, 6_000_000) }));
    expect((res.body as any).trimmedTurnIds).toEqual(['m1', 'u2']);
    expect(countCalls(s)).toHaveLength(7); // 6 retained turns + the new turn (two fewer than without the size trim)
    expect(generateCalls(s)[0].args.contents).toHaveLength(7);
  });

  it('FR-35 / AC-21: the retained turns reach Gemini unmodified - role and parts, with thoughtSignature, thought parts and file_uri intact - followed by the new user turn', async () => {
    const h = [
      turn('u1', 'user', textPart('first'), filePart('https://generativelanguage.googleapis.com/v1beta/files/orig1')),
      turn('m1', 'model', textPart('thinking...', { thought: true, thoughtSignature: 'sigA' }), inlineImagePart('image/png', 'QUJD', { thoughtSignature: 'sigB' })),
    ];
    const s = await setup();
    await call(s, body({ history: structuredClone(h), newTurn: { id: 'u2', parts: [textPart('softer shadow')] } }));
    const contents = generateCalls(s)[0].args.contents;
    expect(contents).toHaveLength(3);
    expect(contents.map((c: any) => ({ role: c.role, parts: c.parts }))).toEqual([
      { role: 'user', parts: h[0].parts },
      { role: 'model', parts: h[1].parts },
      { role: 'user', parts: [textPart('softer shadow')] },
    ]);
    for (const c of contents) expect(Object.keys(c).sort()).toEqual(['parts', 'role']); // turn ids are the BFF contract, not Gemini's
  });

  it('FR-80 / AC-43: the Gemini request carries NO system instruction - for a free-text message and for each of the five presets', async () => {
    const presets: Array<[string | undefined, string, string, string]> = [
      [undefined, FLASH, '1:1', '1K'],
      ['white-bg', FLASH, '1:1', '2K'],
      ['lifestyle', PRO, '4:3', '2K'],
      ['banner', PRO, '16:9', '2K'],
      ['social', FLASH, '4:5', '1K'],
      ['detail-closeup', PRO, '1:1', '2K'],
    ];
    for (const [presetId, model, aspectRatio, resolution] of presets) {
      const s = await setup();
      const res = await call(s, body({ model, aspectRatio, resolution, ...(presetId ? { presetId } : {}) }));
      expect(res.statusCode, String(presetId)).toBe(200);
      const args = generateCalls(s)[0].args;
      expect(Object.keys(args).sort()).toEqual(['aspectRatio', 'contents', 'model', 'resolution', 'signal']);
      expect(JSON.stringify(args)).not.toMatch(/systemInstruction|system_instruction/i);
      expect(args.model).toBe(model);
      expect(args.aspectRatio).toBe(aspectRatio);
      expect(args.resolution).toBe(resolution);
    }
  });

  it('FR-60: the model is never silently substituted - every attempt of a retried request names the requested model', async () => {
    const s = await setup({ script: { generateImage: (_a, n) => { if (n < 4) throw upstreamError(500); return sdk([IMG]); } } });
    await call(s, body({ model: PRO, resolution: '4K' }));
    expect(generateCalls(s).map((c: any) => c.args.model)).toEqual([PRO, PRO, PRO, PRO]);
  });

  it('FR-6: with LLM_PROVIDER=anthropic the image route still uses Gemini', async () => {
    process.env['LLM_PROVIDER'] = 'anthropic';
    const s = await setup();
    const res = await call(s, body());
    expect(res.statusCode).toBe(200);
    expect(s.getGemini).toHaveBeenCalled();
    expect(generateCalls(s)).toHaveLength(1);
  });

  it('FR-49 / AC-28: the handler never deletes anything on the Files API - no delete-like call is made on the provider, on a success or on an upstream failure', async () => {
    for (const script of [undefined, { generateImage: () => { throw upstreamError(500); } }] as Array<Over['script']>) {
      const stub = makeStubGemini({ ...(script ?? {}) });
      const fileDelete = vi.fn();
      stub.files = { delete: fileDelete };
      stub.delete = fileDelete;
      stub.deleteFile = fileDelete;
      const s = await setup({ gemini: stub });
      await call(s, body({ history: history(1) }));
      expect(fileDelete).not.toHaveBeenCalled();
      expect(stub.calls.every((c: any) => c.method === 'generateImage' || c.method === 'countTokens')).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('generate handler - FILE_MISSING and the error taxonomy (FR-17, FR-60, FR-61)', () => {
  const carriesFile = () => body({ history: history(1) }); // u1 holds a file_uri original
  const FILE_GONE = 'File not found or has expired: files/orig1';

  it('FR-17 / AC-21 / AC-28: an upstream 404 naming the file, on a request that carried a file_uri, is 410 FILE_MISSING - not retried, counted, no row', async () => {
    const s = await setup({ script: { generateImage: () => { throw upstreamError(404, FILE_GONE); } } });
    const res = await call(s, carriesFile());
    expect(res.statusCode).toBe(410);
    expect(res.body).toEqual({ error: 'FILE_MISSING' });
    expect(generateCalls(s)).toHaveLength(1);
    expect(s.limiter.tryConsume).toHaveBeenCalledTimes(1);
    expect(s.insertUsage).not.toHaveBeenCalled();
  });

  it('FR-17: a model-not-found 404 is passed through as the fixed API error - no 410, no FILE_MISSING', async () => {
    const s = await setup({ script: { generateImage: () => { throw upstreamError(404, 'models/gemini-3.1-flash-image is not found for API version v1beta'); } } });
    const res = await call(s, carriesFile());
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Помилка API' });
  });

  it('FR-17: the same file-naming 404 on a request that carried NO file_uri is not FILE_MISSING either', async () => {
    const s = await setup({ script: { generateImage: () => { throw upstreamError(404, FILE_GONE); } } });
    const res = await call(s, body());
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Помилка API' });
  });

  it('FR-61 / FR-17: an upstream 410 that is not the file-missing class is NOT the BFF FILE_MISSING signal', async () => {
    const s = await setup({ script: { generateImage: () => { throw upstreamError(410, 'resource gone'); } } });
    const res = await call(s, carriesFile());
    expect(res.statusCode).toBe(410);
    expect(res.body).toEqual({ error: 'Помилка API' });
  });

  it('FR-61: an upstream 501 is retried like any 5xx and is never read as GEMINI_KEY_MISSING', async () => {
    const s = await setup({ script: { generateImage: () => { throw upstreamError(501, 'not implemented'); } } });
    const res = await call(s, body());
    expect(res.statusCode).toBe(501);
    expect(res.body).toEqual({ error: 'UPSTREAM_RETRIES_EXHAUSTED' });
    expect(generateCalls(s)).toHaveLength(4);
  });

  it('FR-60 / AC-37: an upstream 429 is retried at exactly 1000/2000/4000 ms (four calls) and then answered 429 UPSTREAM_RETRIES_EXHAUSTED - distinct from RATE_LIMIT_EXCEEDED', async () => {
    const s = await setup({ script: { generateImage: () => { throw upstreamError(429, 'quota'); } } });
    const res = await call(s, body());
    expect(generateCalls(s)).toHaveLength(4);
    expect(s.sleeper.waits).toEqual([1000, 2000, 4000]);
    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({ error: 'UPSTREAM_RETRIES_EXHAUSTED' });
    expect(s.insertUsage).not.toHaveBeenCalled();
  });

  it('FR-60: a bare 500 is retried (unlike the text provider), and 5xx exhaustion keeps the original upstream status', async () => {
    const s = await setup({ script: { generateImage: () => { throw upstreamError(500, 'internal'); } } });
    const res = await call(s, body());
    expect(generateCalls(s)).toHaveLength(4);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'UPSTREAM_RETRIES_EXHAUSTED' });
  });

  it('FR-60 / plan P-3: a failure with no numeric status (transport error, per-call timeout) is retried like a 5xx and exhausted as 502 UPSTREAM_RETRIES_EXHAUSTED', async () => {
    const s = await setup({ script: { generateImage: () => { throw new Error('fetch failed'); } } });
    const res = await call(s, body());
    expect(generateCalls(s)).toHaveLength(4);
    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: 'UPSTREAM_RETRIES_EXHAUSTED' });
  });

  it('FR-61 / AC-37: an upstream 4xx other than 429 is not retried and is answered with the upstream status and the fixed text', async () => {
    for (const status of [400, 401, 403, 404]) {
      const s = await setup({ script: { generateImage: () => { throw upstreamError(status, `bad ${status}`); } } });
      const res = await call(s, body());
      expect(res.statusCode, String(status)).toBe(status);
      expect(res.body).toEqual({ error: 'Помилка API' });
      expect(generateCalls(s)).toHaveLength(1);
      expect(s.sleeper.waits).toEqual([]);
    }
  });

  it('FR-61: upstream error text never reaches the browser, and no failure body carries trimmedTurnIds or costUsd', async () => {
    for (const status of [400, 500]) {
      const s = await setup({ script: { generateImage: () => { throw upstreamError(status, 'SECRET-UPSTREAM-DETAIL project 4242'); } } });
      const res = await call(s, body({ history: history(1) }));
      const text = JSON.stringify(res.body);
      expect(text).not.toContain('SECRET-UPSTREAM-DETAIL');
      expect(text).not.toContain('4242');
      expect(Object.keys(res.body as object)).toEqual(['error']);
    }
  });

  it('FR-40 / OD-29 C-29.4: a countTokens call that fails after its retries ends the action - status kept, UPSTREAM_RETRIES_EXHAUSTED, no generate call, no limiter, no row', async () => {
    const s = await setup({ script: { countTokens: () => { throw upstreamError(503, 'down'); } } });
    const res = await call(s, body());
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'UPSTREAM_RETRIES_EXHAUSTED' });
    expect(generateCalls(s)).toHaveLength(0);
    expect(s.limiter.tryConsume).not.toHaveBeenCalled();
    expect(s.insertUsage).not.toHaveBeenCalled();
  });

  it('FR-40: a countTokens call failing non-retryably is the fixed API error without a retry and without a generate call', async () => {
    const s = await setup({ script: { countTokens: () => { throw upstreamError(400, 'bad contents'); } } });
    const res = await call(s, body());
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Помилка API' });
    expect(countCalls(s)).toHaveLength(1);
    expect(generateCalls(s)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('generate handler - usage row (FR-32, FR-69, FR-72)', () => {
  it('FR-32 / SD-7 / AC-19: a successful generation writes exactly one row labelled image-studio|<preset>|<resolution> with gemini, the model, mode null and the per-image cost', async () => {
    const s = await setup();
    await call(s, body({ model: PRO, aspectRatio: '4:3', resolution: '2K', presetId: 'lifestyle' }));
    expect(s.insertUsage).toHaveBeenCalledTimes(1);
    expect(s.insertUsage.mock.calls[0][0]).toMatchObject({
      provider: 'gemini', model: PRO, mode: null, taskLabel: 'image-studio|lifestyle|2K',
      inputTokens: 100, outputTokens: 1300, costUsd: 0.03,
    });
  });

  it('FR-32: with no preset the label carries the literal none', async () => {
    const s = await setup();
    await call(s, body({ resolution: '1K' }));
    expect(s.insertUsage.mock.calls[0][0].taskLabel).toBe('image-studio|none|1K');
  });

  it('FR-69: two images in one response are still ONE row (one row per request, not per image)', async () => {
    const s = await setup({ script: { generateImage: () => sdk([IMG, IMG2]) } });
    await call(s, body());
    expect(s.insertUsage).toHaveBeenCalledTimes(1);
  });

  it('FR-69: a failure to write the row is logged and does not change the HTTP 200 already produced', async () => {
    const insertUsage = vi.fn(() => { throw new Error('SQLITE_FULL: database or disk is full'); });
    const s = await setup({ insertUsage });
    const res = await call(s, body());
    expect(res.statusCode).toBe(200);
    expect((res.body as any).kind).toBe('images');
    expect(insertUsage).toHaveBeenCalledTimes(1);
    expect(s.logs.text()).toContain('SQLITE_FULL');
  });

  it('FR-69 / FR-64: no row for text, safety, an empty response, an upstream failure or an abort', async () => {
    const scripts: Array<Over['script']> = [
      { generateImage: () => sdk([{ text: 'words' }]) },
      { generateImage: () => sdk([IMG], 'SAFETY') },
      { generateImage: () => sdk([]) },
      { generateImage: () => { throw upstreamError(400); } },
    ];
    for (const script of scripts) {
      const s = await setup({ script });
      await call(s, body());
      expect(s.insertUsage).not.toHaveBeenCalled();
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('generate handler - Cancel / abort (FR-21, FR-66, NFR-3)', () => {
  it('FR-21 / AC-11: the SAME abort signal reaches countTokens and generateImage, and aborting stops the retry loop in the middle of a backoff - no upstream call follows', async () => {
    const sleeper = makeControlledSleep();
    const s = await setup({ sleep: sleeper, script: { generateImage: () => { throw upstreamError(503); } } });
    const res = makeRes();
    const done = s.handler(makeReq(body()), res);
    for (let i = 0; i < 100 && sleeper.pendingCount === 0; i++) await Promise.resolve();
    expect(sleeper.pendingCount).toBe(1); // inside the 1000 ms backoff
    const gen = generateCalls(s)[0].args.signal as AbortSignal;
    expect(countCalls(s)[0].args.signal).toBe(gen);
    expect(gen.aborted).toBe(false);
    res.closeEarly();
    await done;
    expect(gen.aborted).toBe(true);
    expect(generateCalls(s)).toHaveLength(1);
    expect(s.insertUsage).not.toHaveBeenCalled();
    expect(s.limiter.tryConsume).toHaveBeenCalledTimes(1); // a Cancel AFTER the Gemini call started is a counted request
  });

  it('FR-21 / FR-66: a Cancel while countTokens is still running aborts it, makes no Gemini call and is NOT a counted request', async () => {
    let seen: AbortSignal | undefined;
    const gemini = makeStubGemini({
      countTokens: (args) => new Promise((_resolve, reject) => {
        seen = args.signal;
        args.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
      }),
    });
    const s = await setup({ gemini });
    const res = makeRes();
    const done = s.handler(makeReq(body()), res);
    for (let i = 0; i < 50 && !seen; i++) await Promise.resolve();
    res.closeEarly();
    await done;
    expect(seen?.aborted).toBe(true);
    expect(generateCalls(s)).toHaveLength(0);
    expect(s.limiter.tryConsume).not.toHaveBeenCalled();
    expect(s.insertUsage).not.toHaveBeenCalled();
  });

  it('NFR-3: no log line contains the API key (even if the SDK error embeds it), the base64 payload or the user\'s prompt text', async () => {
    const KEY = 'AIzaSyTESTKEYTESTKEYTESTKEY1234567';
    process.env['GEMINI_API_KEY'] = KEY;
    const payload = toBase64(padTo(PNG_MAGIC, 4096));
    const s = await setup({ script: { generateImage: () => { throw upstreamError(500, `POST https://generativelanguage.googleapis.com/v1beta/models/x:generateContent?key=${KEY} failed`); } } });
    await call(s, body({ newTurn: { id: 'u-new', parts: [textPart('SECRET-PROMPT-TEXT make it blue'), inlineImagePart('image/png', payload)] } }));
    const text = s.logs.text();
    expect(text.length).toBeGreaterThan(0); // upstream detail is logged server-side (describeError style)
    expect(text).not.toContain(KEY);
    expect(text).not.toContain(payload.slice(0, 200));
    expect(text).not.toContain('SECRET-PROMPT-TEXT');
  });
});

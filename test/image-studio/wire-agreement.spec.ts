// @vitest-environment node
/**
 * wire-agreement.spec.ts - US-10.6 T9 and T20 (FR-4, FR-5, FR-6 (c), FR-9, FR-14; impact S1, S2, S3).
 *
 * The Image Studio chain has a server Zod schema and a client Zod schema, and BOTH default to stripping unknown keys silently. A field added to one
 * side only is therefore dropped without an error: a mock of either side cannot see it. These cross-runtime cases drive the REAL pieces through each
 * other (plan 3.2 and 9.2 "Wire agreement"):
 *
 *   (T20)  the real client request builder -> the real server `parseGenerateRequest`: `imageCount` survives (S1).
 *   (T9)   the real server handler's JSON -> the real client `parseGenerateResponse`: `batch` survives (S2), and a batch the handler can really
 *          produce - a mixed image-plus-text batch, a slot of two images (succeeded greater than granted), every closed cause - is not rejected.
 *
 * Each task runs its own cases with `npx vitest run test/image-studio/wire-agreement.spec.ts -t "\(T9\)"` (or "\(T20\)").
 * The stub Gemini is the existing handler-fakes one; no network. The `price` double is unit * count with a TEST unit, not a vendor price.
 */
import { describe, it, expect, vi } from 'vitest';
import { makeSession, textPart } from './helpers/fakes';
import { makeReq, makeRes, makeStubGemini, makeInstantSleep, makeLogSpy } from './helpers/handler-fakes';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const FLASH = 'gemini-3.1-flash-image';
const IP = '198.51.100.20';

const IMG = (tag: string) => ({ inlineData: { mimeType: 'image/png', data: `data-${tag}` } });
const USAGE = { promptTokenCount: 100, candidatesTokenCount: 1290, thoughtsTokenCount: 10 };
const sdk = (parts: unknown[], finishReason = 'STOP') => ({ candidates: [{ finishReason, content: { role: 'model', parts } }], usageMetadata: USAGE });
const causes = (): string[] => JSON.parse(readFileSync(resolve(process.cwd(), 'src/prompt-core/image-studio-contract.json'), 'utf8')).imageFailureCauses ?? [];

/** Runs the REAL generate handler once with a scripted stub Gemini and returns the exact JSON body it answered. */
async function handlerJson(imageCount: number, script: (n: number) => unknown): Promise<any> {
  const { createGenerateHandler } = await load('../../server/image-studio/handlers.js');
  const { createRateLimiter } = await load('../../server/image-studio/rate-limiter.js');
  const gemini = makeStubGemini({ generateImage: (_a: any, n: number) => script(n) });
  const handler = createGenerateHandler({
    getGemini: () => gemini, hasGeminiKey: () => true, now: () => 0, sleep: makeInstantSleep().sleep,
    limiter: createRateLimiter({ limit: 30, windowMs: 3_600_000, now: () => 0 }),
    insertUsage: vi.fn(), price: (...args: number[]) => 0.04 * args[args.length - 1], log: makeLogSpy().log,
  });
  const res = makeRes();
  await handler(makeReq({ model: FLASH, aspectRatio: '1:1', resolution: '1K', history: [], newTurn: { id: 'u-new', parts: [textPart('a mug')] }, imageCount }, { ip: IP }), res);
  expect(res.statusCode).toBe(200);
  return JSON.parse(JSON.stringify(res.body)); // exactly what crosses the wire
}

describe('FR-4 wire agreement: client request -> server request schema, imageCount survives (T20)', () => {
  const build = async (extra: Record<string, unknown>) => {
    const { buildGenerateRequest } = await load('../../src/utils/image-studio/request-builder');
    const snapshot = makeSession('s1', { pairs: 1 });
    return buildGenerateRequest(snapshot, { newTurnId: 'n-new', text: 'a white mug', model: FLASH, aspectRatio: '1:1', resolution: '1K', ...extra }).request;
  };
  const serverParse = async (request: unknown) => (await load('../../server/image-studio/request-schema.js')).parseGenerateRequest(request);

  for (const n of [2, 4]) {
    it(`S1: the client request built with imageCount ${n} reaches the server schema with imageCount ${n} (the field is not stripped by either side)`, async () => {
      const request = await build({ imageCount: n });
      expect(request.imageCount).toBe(n);
      const parsed = await serverParse(request);
      expect(parsed.imageCount).toBe(n);
    });
  }

  for (const n of [undefined, 1]) {
    it(`FR-4: a one-image request (imageCount ${String(n)}) carries NO imageCount field and still parses on the server [characterization]`, async () => {
      const request = await build(n === undefined ? {} : { imageCount: n });
      expect('imageCount' in request).toBe(false);
      const parsed = await serverParse(request);
      expect('imageCount' in parsed).toBe(false);
    });
  }
});

describe('FR-9 wire agreement: server handler JSON -> client response schema, batch survives (T9)', () => {
  const clientParse = async (body: unknown) => (await load('../../src/utils/image-studio/schemas')).parseGenerateResponse(body);

  it('S2: the batch report of a 4-image handler answer survives the client parser unchanged', async () => {
    const json = await handlerJson(4, (n) => sdk([IMG(`c${n}`)]));
    expect(json.batch).toEqual({ requested: 4, granted: 4, succeeded: 4, failures: [] });
    const parsed = await clientParse(json);
    expect(parsed.ok).toBe(true);
    expect(parsed.value.batch).toEqual(json.batch);
    expect(parsed.value.parts).toHaveLength(4);
  });

  it('S2: a partial failure (2 of 4) keeps the failures with their causes through the client parser', async () => {
    const outcomes = [sdk([IMG('A')]), sdk([IMG('x')], 'IMAGE_SAFETY'), sdk([IMG('C')]), sdk([])];
    const json = await handlerJson(4, (n) => outcomes[n - 1]);
    const parsed = await clientParse(json);
    expect(parsed.ok).toBe(true);
    expect(parsed.value.batch).toEqual({ requested: 4, granted: 4, succeeded: 2, failures: [{ cause: 'safety' }, { cause: 'empty' }] });
  });

  it('B-2: a mixed batch (one image slot, one text slot -> failures [{ cause: "empty" }]) is accepted by the client parser with the paid image', async () => {
    const outcomes = [sdk([IMG('A')]), sdk([{ text: 'words only' }])];
    const json = await handlerJson(2, (n) => outcomes[n - 1]);
    expect(json.batch.failures).toEqual([{ cause: 'empty' }]);
    const parsed = await clientParse(json);
    expect(parsed.ok).toBe(true);
    expect(parsed.value.parts).toEqual([IMG('A')]);
  });

  it('B-1: a batch in which succeeded (images) is greater than granted (calls) - a slot returned two images - is not rejected by the client parser', async () => {
    const outcomes = [sdk([IMG('A1'), IMG('A2')]), sdk([IMG('B')])];
    const json = await handlerJson(2, (n) => outcomes[n - 1]);
    expect(json.batch.granted).toBe(2);
    expect(json.batch.succeeded).toBe(3);
    const parsed = await clientParse(json);
    expect(parsed.ok).toBe(true);
    expect(parsed.value.batch.succeeded).toBe(3);
    expect(parsed.value.parts).toHaveLength(3);
  });

  it('B-2: the client parser accepts a failure entry for every cause in the shared contract list - the paid images are never rejected over a cause', async () => {
    expect(causes()).toHaveLength(4);
    const body = {
      kind: 'images', parts: [IMG('A')], costUsd: 0.04, usage: { inputTokens: 1, outputTokens: 1 }, trimmedTurnIds: [],
      batch: { requested: 4, granted: 4, succeeded: 1, failures: causes().map((cause) => ({ cause })) },
    };
    const parsed = await clientParse(body);
    expect(parsed.ok).toBe(true);
    expect(parsed.value.batch.failures.map((f: any) => f.cause)).toEqual(causes());
  });

  it('S2: a one-image handler answer has no batch and the client value has none either [characterization]', async () => {
    const json = await handlerJson(1, (n) => sdk([IMG(`c${n}`)]));
    expect('batch' in json).toBe(false);
    const parsed = await clientParse(json);
    expect(parsed.ok).toBe(true);
    expect('batch' in parsed.value).toBe(false);
  });
});

// @vitest-environment node
/**
 * upload-handler.spec.ts - US-10.1 T17 (FR-5, FR-6, FR-9, FR-16, FR-21, FR-61, NFR-3; plan DD-5, DD-13, P-5).
 *
 * `createUploadHandler(deps)` from server/image-studio/handlers.js (contract: CONTRACT.md "Server contracts"), driven with
 * fake req/res (test/image-studio/helpers/handler-fakes.ts) and a stub Gemini provider. No sockets, no network.
 *
 * Order of checks (plan choice P-5; FR-27 fixes only the generate order): body validation 400 -> magic bytes 415 ->
 * key check 501 -> Files API upload under the retry loop. The first failing check answers; later steps do not run.
 * Response on success: 200 { fileUri, mimeType } where mimeType is the one DETECTED from the bytes, never the client's claim.
 * The upload is NOT a counted request (FR-66): the limiter is never touched.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { PNG_MAGIC, JPG_MAGIC, webpMagic, GIF_MAGIC, padTo, toBase64 } from './helpers/fakes';
import { makeReq, makeRes, makeStubGemini, makeInstantSleep, makeControlledSleep, makeLogSpy, upstreamError } from './helpers/handler-fakes';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const HANDLERS = '../../server/image-studio/handlers.js';

const png = padTo(PNG_MAGIC, 64);
const jpg = padTo([...JPG_MAGIC, 0xe0], 64);
const webp = padTo(webpMagic(), 64);
const gif = padTo(GIF_MAGIC, 64);
const FILE_URI = 'https://generativelanguage.googleapis.com/v1beta/files/abc123';

/** Builds the handler with spies on every effect so "did not run" is observable. */
async function setup(over: { gemini?: any; hasKey?: boolean; sleep?: any } = {}) {
  const { createUploadHandler } = await load(HANDLERS);
  const gemini = over.gemini ?? makeStubGemini();
  const sleeper = over.sleep ?? makeInstantSleep();
  const logs = makeLogSpy();
  const getGemini = vi.fn(() => gemini);
  const hasGeminiKey = vi.fn(() => over.hasKey ?? true);
  const limiter = { tryConsume: vi.fn(() => ({ allowed: true, retryAfterSeconds: 0 })) };
  const handler = createUploadHandler({ getGemini, hasGeminiKey, now: () => 1_700_000_000_000, sleep: sleeper.sleep, limiter, insertUsage: vi.fn(), price: vi.fn(), log: logs.log });
  return { handler, gemini, sleeper, logs, getGemini, hasGeminiKey, limiter };
}
const call = async (handler: any, body: unknown, ip?: string) => {
  const req = makeReq(body, { ip });
  const res = makeRes();
  await handler(req, res);
  return { req, res };
};

afterEach(() => { delete process.env['LLM_PROVIDER']; delete process.env['GEMINI_API_KEY']; });

describe('upload handler - body validation (400) and magic bytes (415)', () => {
  it('FR-19 / FR-61: a body without a base64 string in `data` is 400 INVALID_REQUEST before any other check', async () => {
    const s = await setup();
    for (const body of [undefined, null, {}, { data: 42 }, { data: '' }, { data: ['x'] }, 'raw string']) {
      const { res } = await call(s.handler, body);
      expect(res.statusCode, JSON.stringify(body)).toBe(400);
      expect(res.body).toEqual({ error: 'INVALID_REQUEST' });
    }
    expect(s.hasGeminiKey).not.toHaveBeenCalled();
    expect(s.gemini.count.uploadFile).toBe(0);
  });

  it('FR-9 / AC-2: bytes that are not PNG, JPG or WEBP are 415 UNSUPPORTED_IMAGE_TYPE, even when the client claims image/png and a .png name', async () => {
    const s = await setup();
    for (const bytes of [gif, new Uint8Array(Array.from('just text, named x.png', (c) => c.charCodeAt(0))), padTo([0x42, 0x4d], 16) /* BMP */]) {
      const { res } = await call(s.handler, { data: toBase64(bytes), mimeType: 'image/png', fileName: 'x.png' });
      expect(res.statusCode).toBe(415);
      expect(res.body).toEqual({ error: 'UNSUPPORTED_IMAGE_TYPE' });
    }
  });

  it('FR-9 / P-5: the 415 comes BEFORE the key check and before any upstream call - with no key configured a non-image is still 415, not 501', async () => {
    const s = await setup({ hasKey: false });
    const { res } = await call(s.handler, { data: toBase64(gif) });
    expect(res.statusCode).toBe(415);
    expect(s.hasGeminiKey).not.toHaveBeenCalled();
    expect(s.getGemini).not.toHaveBeenCalled();
    expect(s.gemini.count.uploadFile).toBe(0);
  });
});

describe('upload handler - missing key (501)', () => {
  it('FR-5: a valid image with no Gemini key is 501 GEMINI_KEY_MISSING, with no upstream call and no retry', async () => {
    const s = await setup({ hasKey: false });
    const { res } = await call(s.handler, { data: toBase64(png) });
    expect(res.statusCode).toBe(501);
    expect(res.body).toEqual({ error: 'GEMINI_KEY_MISSING' });
    expect(s.gemini.count.uploadFile).toBe(0);
    expect(s.sleeper.waits).toEqual([]);
  });
});

describe('upload handler - success', () => {
  it('FR-16: a valid PNG is uploaded once and answered 200 { fileUri, mimeType } with the bytes decoded from base64', async () => {
    const s = await setup();
    const { res } = await call(s.handler, { data: toBase64(png) });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ fileUri: FILE_URI, mimeType: 'image/png' });
    expect(s.gemini.count.uploadFile).toBe(1);
    const sent = s.gemini.calls[0].args;
    expect(Array.from(sent.bytes)).toEqual(Array.from(png));
    expect(sent.mimeType).toBe('image/png');
  });

  it('FR-9 / SD-24: the MIME type comes from the DETECTED bytes - JPG and WEBP are labelled so, whatever the client claims', async () => {
    const s = await setup();
    const a = await call(s.handler, { data: toBase64(jpg), mimeType: 'image/png' });
    expect(a.res.body).toMatchObject({ mimeType: 'image/jpeg' });
    expect(s.gemini.calls[0].args.mimeType).toBe('image/jpeg');
    const b = await call(s.handler, { data: toBase64(webp), mimeType: 'image/jpeg' });
    expect(b.res.body).toMatchObject({ mimeType: 'image/webp' });
    expect(s.gemini.calls[1].args.mimeType).toBe('image/webp');
  });

  it('FR-6: the upload goes to Gemini even when LLM_PROVIDER is anthropic', async () => {
    process.env['LLM_PROVIDER'] = 'anthropic';
    const s = await setup();
    const { res } = await call(s.handler, { data: toBase64(png) });
    expect(res.statusCode).toBe(200);
    expect(s.getGemini).toHaveBeenCalled();
    expect(s.gemini.count.uploadFile).toBe(1);
  });

  it('FR-66 / FR-16: an upload is not a counted request - the limiter is never consulted, on success or failure', async () => {
    const s = await setup();
    await call(s.handler, { data: toBase64(png) });
    await call(s.handler, { data: toBase64(gif) });
    await call(s.handler, {});
    expect(s.limiter.tryConsume).not.toHaveBeenCalled();
  });

  it('FR-16: the BFF holds no image bytes after the call - a second upload does not reuse the first one\'s bytes', async () => {
    const s = await setup();
    await call(s.handler, { data: toBase64(png) });
    await call(s.handler, { data: toBase64(jpg) });
    expect(Array.from(s.gemini.calls[1].args.bytes)).toEqual(Array.from(jpg));
  });
});

describe('upload handler - retry loop and error taxonomy (FR-60, FR-61)', () => {
  it('FR-60 / FR-16: a transient 503 is retried after exactly 1000 ms and then succeeds', async () => {
    const gemini = makeStubGemini({ uploadFile: (_a, n) => { if (n === 1) throw upstreamError(503); return { uri: FILE_URI, mimeType: 'image/png' }; } });
    const s = await setup({ gemini });
    const { res } = await call(s.handler, { data: toBase64(png) });
    expect(res.statusCode).toBe(200);
    expect(gemini.count.uploadFile).toBe(2);
    expect(s.sleeper.waits).toEqual([1000]);
  });

  it('FR-60: after four failed attempts the answer is the upstream status with UPSTREAM_RETRIES_EXHAUSTED, waits 1000/2000/4000', async () => {
    const gemini = makeStubGemini({ uploadFile: () => { throw upstreamError(503, 'unavailable'); } });
    const s = await setup({ gemini });
    const { res } = await call(s.handler, { data: toBase64(png) });
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'UPSTREAM_RETRIES_EXHAUSTED' });
    expect(gemini.count.uploadFile).toBe(4);
    expect(s.sleeper.waits).toEqual([1000, 2000, 4000]);
  });

  it('FR-61: an upstream 4xx other than 429 is not retried and is answered with the fixed text and the upstream status', async () => {
    const gemini = makeStubGemini({ uploadFile: () => { throw upstreamError(400, 'bad file'); } });
    const s = await setup({ gemini });
    const { res } = await call(s.handler, { data: toBase64(png) });
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Помилка API' });
    expect(gemini.count.uploadFile).toBe(1);
    expect(s.sleeper.waits).toEqual([]);
  });

  it('FR-61: an upstream 410 is not read as the BFF FILE_MISSING signal and an upstream 501 is not read as GEMINI_KEY_MISSING', async () => {
    const g410 = makeStubGemini({ uploadFile: () => { throw upstreamError(410, 'gone'); } });
    const a = await setup({ gemini: g410 });
    const r410 = await call(a.handler, { data: toBase64(png) });
    expect(r410.res.statusCode).toBe(410);
    expect(r410.res.body).toEqual({ error: 'Помилка API' });

    const g501 = makeStubGemini({ uploadFile: () => { throw upstreamError(501, 'not implemented'); } });
    const b = await setup({ gemini: g501 });
    const r501 = await call(b.handler, { data: toBase64(png) });
    expect((r501.res.body as any).error).not.toBe('GEMINI_KEY_MISSING');
  });

  it('FR-61: upstream error text never reaches the browser - the body is a closed code or the fixed text only', async () => {
    const gemini = makeStubGemini({ uploadFile: () => { throw upstreamError(500, 'SECRET-UPSTREAM-DETAIL {"error":{"message":"quota project 4242"}}'); } });
    const s = await setup({ gemini });
    const { res } = await call(s.handler, { data: toBase64(png) });
    expect(JSON.stringify(res.body)).not.toContain('SECRET-UPSTREAM-DETAIL');
    expect(JSON.stringify(res.body)).not.toContain('4242');
    expect(Object.keys(res.body as object)).toEqual(['error']);
  });
});

describe('upload handler - abort and logging', () => {
  it('FR-21: the signal reaches the provider stub, and aborting (response closed early) stops the retry loop in the middle of a backoff', async () => {
    const gemini = makeStubGemini({ uploadFile: () => { throw upstreamError(503); } });
    const sleeper = makeControlledSleep();
    const s = await setup({ gemini, sleep: sleeper });
    const req = makeReq({ data: toBase64(png) });
    const res = makeRes();
    const done = s.handler(req, res);
    for (let i = 0; i < 50 && sleeper.pendingCount === 0; i++) await Promise.resolve();
    expect(sleeper.pendingCount).toBe(1); // standing inside the 1000 ms backoff
    const signal: AbortSignal = gemini.calls[0].args.signal;
    expect(signal).toBeDefined();
    expect(signal.aborted).toBe(false);
    res.closeEarly();
    await done;
    expect(signal.aborted).toBe(true);
    expect(gemini.count.uploadFile).toBe(1); // no further upstream call after the abort
  });

  it('FR-21: aborting while the upstream call is in flight aborts the signal handed to the stub', async () => {
    let seen: AbortSignal | undefined;
    const gemini = makeStubGemini({
      uploadFile: (args) => new Promise((_resolve, reject) => {
        seen = args.signal;
        args.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
      }),
    });
    const s = await setup({ gemini });
    const res = makeRes();
    const done = s.handler(makeReq({ data: toBase64(png) }), res);
    for (let i = 0; i < 50 && !seen; i++) await Promise.resolve();
    expect(seen?.aborted).toBe(false);
    res.closeEarly();
    await done;
    expect(seen?.aborted).toBe(true);
    expect(gemini.count.uploadFile).toBe(1);
  });

  it('NFR-3: no log line contains the API key (even when the SDK error text embeds it) or the base64 payload', async () => {
    const KEY = 'AIzaSyTESTKEYTESTKEYTESTKEY1234567';
    process.env['GEMINI_API_KEY'] = KEY;
    const gemini = makeStubGemini({ uploadFile: () => { throw upstreamError(500, `request to https://generativelanguage.googleapis.com/upload?key=${KEY} failed`); } });
    const s = await setup({ gemini });
    const payload = toBase64(padTo(PNG_MAGIC, 4096));
    await call(s.handler, { data: payload });
    const text = s.logs.text();
    expect(text.length).toBeGreaterThan(0); // the upstream detail IS logged server-side (describeError style)...
    expect(text).not.toContain(KEY); // ...but never the key
    expect(text).not.toContain(payload.slice(0, 200)); // ...nor the payload
  });
});

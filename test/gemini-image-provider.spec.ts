// @vitest-environment node
/**
 * gemini-image-provider.spec.ts - US-10.1 T16 (FR-6, FR-60 single-shot, FR-80, NFR-1; plan DD-6, C5).
 *
 * The three new single-shot methods of GeminiProvider. This file has its OWN `@google/genai` mock exposing
 * `models.generateContent`, `models.countTokens` and `files.upload`; test/gemini-provider.spec.ts (which mocks only
 * `generateContent`) is deliberately not edited.
 *
 * PINNED CONTRACT (server/providers/gemini.js, three new methods; the constructor is unchanged):
 *   generateImage({ model, contents, aspectRatio, resolution, signal }) -> resolves the SDK response object unchanged
 *       ai.models.generateContent({ model, contents, config: { responseModalities: ['TEXT','IMAGE'],
 *           imageConfig: { aspectRatio, imageSize: resolution }, abortSignal: signal, httpOptions: { timeout } } })
 *   uploadFile({ bytes, mimeType, signal }) -> resolves the SDK File object unchanged
 *       ai.files.upload({ file: Blob(bytes, type mimeType), config: { mimeType, abortSignal: signal, httpOptions: { timeout } } })
 *   countTokens({ model, contents, signal }) -> resolves the SDK response unchanged
 *       ai.models.countTokens({ model, contents, config: { abortSignal: signal, httpOptions: { timeout } } })
 * - NO systemInstruction (FR-80); `contents` is passed through untouched (FR-35: parts unmodified);
 * - `httpOptions.timeout` is a positive number SHORTER than the constructor's 20-minute client floor (that floor is for Doc
 *   generation and must not govern an image call);
 * - single-shot: never `withRetry`, never a fallback model; the SDK error is rethrown with its `status`;
 * - the constructor still has no `retryOptions` (the existing warning in gemini.js applies).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const genCalls: any[] = [];
const countCalls: any[] = [];
const uploadCalls: any[] = [];
const ctorArgs: any[] = [];
let genImpl: (req: any) => Promise<any>;
let countImpl: (req: any) => Promise<any>;
let uploadImpl: (req: any) => Promise<any>;

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor(opts: any) { ctorArgs.push(opts); }
    models = {
      generateContent: async (req: any) => { genCalls.push(req); return genImpl(req); },
      countTokens: async (req: any) => { countCalls.push(req); return countImpl(req); },
    };
    files = { upload: async (req: any) => { uploadCalls.push(req); return uploadImpl(req); } };
  },
}));

// withRetry would re-run a failing call; the image methods must never go through it.
const withRetryMock = vi.fn((fn: any, ..._rest: any[]) => fn());
vi.mock('../server/utils/retry.js', () => ({ withRetry: (fn: any, ...rest: any[]) => withRetryMock(fn, ...rest) }));

const { GeminiProvider } = await import('../server/providers/gemini.js');

const CONTENTS = [
  { id: 'u1', role: 'user', parts: [{ text: 'white background' }, { fileData: { fileUri: 'files/abc', mimeType: 'image/png' } }] },
  { id: 'm1', role: 'model', parts: [{ inlineData: { mimeType: 'image/png', data: 'AAAA' }, thoughtSignature: 'sig-1' }] },
];
const SDK_IMAGE_RESPONSE = { candidates: [{ finishReason: 'STOP', content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'QUJD' } }] } }], usageMetadata: { promptTokenCount: 10 } };
const CLIENT_FLOOR_MS = 1_200_000;

const provider = () => new GeminiProvider('test-key') as any;

beforeEach(() => {
  genCalls.length = 0; countCalls.length = 0; uploadCalls.length = 0; ctorArgs.length = 0; withRetryMock.mockClear();
  genImpl = async () => SDK_IMAGE_RESPONSE;
  countImpl = async () => ({ totalTokens: 321 });
  uploadImpl = async () => ({ uri: 'https://generativelanguage.googleapis.com/v1beta/files/xyz', mimeType: 'image/png', name: 'files/xyz' });
});

describe('GeminiProvider.generateImage - request shape (FR-6, FR-80)', () => {
  it('FR-6: asks for text AND image output with the aspect ratio and the image size in imageConfig', async () => {
    await provider().generateImage({ model: 'gemini-3.1-flash-image', contents: CONTENTS, aspectRatio: '4:5', resolution: '2K', signal: new AbortController().signal });
    expect(genCalls).toHaveLength(1);
    expect(genCalls[0].model).toBe('gemini-3.1-flash-image');
    expect(genCalls[0].config.responseModalities).toEqual(['TEXT', 'IMAGE']);
    expect(genCalls[0].config.imageConfig).toEqual({ aspectRatio: '4:5', imageSize: '2K' });
  });

  it('FR-80: the outbound request carries NO system instruction, anywhere', async () => {
    await provider().generateImage({ model: 'gemini-3.1-pro-image-preview', contents: CONTENTS, aspectRatio: '1:1', resolution: '1K', signal: new AbortController().signal });
    expect(genCalls[0].config.systemInstruction).toBeUndefined();
    expect(genCalls[0].systemInstruction).toBeUndefined();
    expect(JSON.stringify(genCalls[0])).not.toMatch(/systemInstruction/i);
  });

  it('FR-35: contents (history + new turn) reach the SDK untouched, thoughtSignature and file_uri included', async () => {
    await provider().generateImage({ model: 'gemini-3.1-flash-image', contents: structuredClone(CONTENTS), aspectRatio: '1:1', resolution: '1K', signal: new AbortController().signal });
    expect(genCalls[0].contents).toEqual(CONTENTS);
  });

  it('FR-21: the abort signal is handed to the SDK as abortSignal (so a Cancel can reach the upstream call)', async () => {
    const controller = new AbortController();
    await provider().generateImage({ model: 'gemini-3.1-flash-image', contents: CONTENTS, aspectRatio: '1:1', resolution: '1K', signal: controller.signal });
    expect(genCalls[0].config.abortSignal).toBe(controller.signal);
  });

  it('DD-6: a per-call timeout is set and is shorter than the 20-minute client-level floor', async () => {
    await provider().generateImage({ model: 'gemini-3.1-flash-image', contents: CONTENTS, aspectRatio: '1:1', resolution: '1K', signal: new AbortController().signal });
    const t = genCalls[0].config.httpOptions.timeout;
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThan(CLIENT_FLOOR_MS);
  });

  it('FR-6: the SDK response is handed back unchanged for the classifier', async () => {
    const out = await provider().generateImage({ model: 'gemini-3.1-flash-image', contents: CONTENTS, aspectRatio: '1:1', resolution: '1K', signal: new AbortController().signal });
    expect(out).toBe(SDK_IMAGE_RESPONSE);
  });
});

describe('GeminiProvider - single shot, no retry, no fallback model (FR-60)', () => {
  it('FR-60: a failing generateImage is attempted exactly once, never via withRetry, and rethrown with its status', async () => {
    const failure = Object.assign(new Error('{"error":{"code":503}}'), { status: 503 });
    genImpl = async () => { throw failure; };
    await expect(provider().generateImage({ model: 'gemini-3.1-pro-image-preview', contents: CONTENTS, aspectRatio: '1:1', resolution: '1K', signal: new AbortController().signal }))
      .rejects.toMatchObject({ status: 503 });
    expect(genCalls).toHaveLength(1);
    expect(withRetryMock).not.toHaveBeenCalled();
  });

  it('FR-60: a 429 is not retried by the provider either (the BFF retry loop owns the schedule)', async () => {
    genImpl = async () => { throw Object.assign(new Error('rate'), { status: 429 }); };
    await expect(provider().generateImage({ model: 'gemini-3.1-flash-image', contents: CONTENTS, aspectRatio: '1:1', resolution: '1K', signal: new AbortController().signal }))
      .rejects.toMatchObject({ status: 429 });
    expect(genCalls).toHaveLength(1);
  });

  it('FR-60: the model is never silently substituted - every call names the requested model, also after a failure', async () => {
    genImpl = async () => { throw Object.assign(new Error('x'), { status: 500 }); };
    await provider().generateImage({ model: 'gemini-3.1-pro-image-preview', contents: CONTENTS, aspectRatio: '1:1', resolution: '1K', signal: new AbortController().signal }).catch(() => undefined);
    expect(genCalls.map((c) => c.model)).toEqual(['gemini-3.1-pro-image-preview']);
  });

  it('FR-60: uploadFile and countTokens are single-shot too - one SDK call, no withRetry, status kept on failure', async () => {
    uploadImpl = async () => { throw Object.assign(new Error('u'), { status: 502 }); };
    countImpl = async () => { throw Object.assign(new Error('c'), { status: 504 }); };
    const signal = new AbortController().signal;
    await expect(provider().uploadFile({ bytes: new Uint8Array([1, 2, 3]), mimeType: 'image/png', signal })).rejects.toMatchObject({ status: 502 });
    await expect(provider().countTokens({ model: 'gemini-3.1-flash-image', contents: CONTENTS, signal })).rejects.toMatchObject({ status: 504 });
    expect(uploadCalls).toHaveLength(1);
    expect(countCalls).toHaveLength(1);
    expect(withRetryMock).not.toHaveBeenCalled();
  });
});

describe('GeminiProvider.uploadFile (FR-16)', () => {
  it('FR-16: uploads the bytes as a Blob of the given type with abortSignal and a per-call timeout, and returns the SDK file', async () => {
    const controller = new AbortController();
    const bytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]);
    const file = await provider().uploadFile({ bytes, mimeType: 'image/png', signal: controller.signal });
    expect(uploadCalls).toHaveLength(1);
    const req = uploadCalls[0];
    expect(req.file).toBeInstanceOf(Blob);
    expect(req.file.size).toBe(bytes.length);
    expect(req.file.type).toBe('image/png');
    expect(req.config.mimeType).toBe('image/png');
    expect(req.config.abortSignal).toBe(controller.signal);
    expect(req.config.httpOptions.timeout).toBeGreaterThan(0);
    expect(req.config.httpOptions.timeout).toBeLessThan(CLIENT_FLOOR_MS);
    expect(file).toMatchObject({ uri: 'https://generativelanguage.googleapis.com/v1beta/files/xyz' });
  });
});

describe('GeminiProvider.countTokens (FR-40)', () => {
  it('FR-40: counts the given contents for the given model with abortSignal and a per-call timeout, and returns the SDK answer', async () => {
    const controller = new AbortController();
    const out = await provider().countTokens({ model: 'gemini-3.1-flash-image', contents: CONTENTS, signal: controller.signal });
    expect(countCalls).toHaveLength(1);
    expect(countCalls[0].model).toBe('gemini-3.1-flash-image');
    expect(countCalls[0].contents).toEqual(CONTENTS);
    expect(countCalls[0].config.abortSignal).toBe(controller.signal);
    expect(countCalls[0].config.httpOptions.timeout).toBeGreaterThan(0);
    expect(countCalls[0].config.httpOptions.timeout).toBeLessThan(CLIENT_FLOOR_MS);
    expect(out).toEqual({ totalTokens: 321 });
  });
});

describe('GeminiProvider constructor is unchanged (NFR-1, DD-6)', () => {
  it('DD-6: the SDK retry wrapper stays disengaged (no retryOptions) and the client-level floor stays 20 minutes', () => {
    provider();
    expect(ctorArgs[0].httpOptions.retryOptions).toBeUndefined();
    expect(ctorArgs[0].httpOptions.timeout).toBe(CLIENT_FLOOR_MS);
    expect(ctorArgs[0].apiKey).toBe('test-key');
  });
});

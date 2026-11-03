// @vitest-environment node
/**
 * gemini-image-provider.spec.ts - US-10.1 T16 (FR-6, FR-60 single-shot, FR-80, NFR-1; plan DD-6, C5).
 *
 * The three new single-shot methods of GeminiProvider. This file has its OWN `@google/genai` mock exposing
 * `models.generateContent`, `models.countTokens`, `files.upload` and `files.delete`; test/gemini-provider.spec.ts (which
 * mocks only `generateContent`) is deliberately not edited.
 *
 * PINNED CONTRACT (server/providers/gemini.js, three new methods; the constructor is unchanged):
 *   generateImage({ model, contents, aspectRatio, resolution, signal }) -> resolves the SDK response object unchanged
 *       ai.models.generateContent({ model, contents, config: { responseModalities: ['TEXT','IMAGE'],
 *           imageConfig: { aspectRatio, imageSize: resolution }, abortSignal: signal, httpOptions: { timeout } } })
 *   uploadFile({ bytes, mimeType, signal }) -> resolves the SDK File object unchanged
 *       ai.files.upload({ file: Blob(bytes, type mimeType), config: { mimeType } })   <- NO `httpOptions` key (see below)
 *       The timeout and the Cancel are enforced BY THE PROVIDER around the SDK call, not through SDK config:
 *       - caller's signal aborted (before or during the call) -> rejects promptly with an AbortError-named error;
 *       - UPSTREAM_TIMEOUT_MS elapsed (global setTimeout) -> rejects with a TimeoutError-named error; neither error carries an
 *         HTTP `status`, so the BFF retry loop treats the abort as a Cancel (signal.aborted) and the timeout as a transient failure;
 *       - an upload that resolves after the race was lost is removed with `ai.files.delete({ name })` (no orphan Files object).
 *   countTokens({ model, contents, signal }) -> resolves the SDK response unchanged
 *       ai.models.countTokens({ model, contents, config: { abortSignal: signal, httpOptions: { timeout } } })
 * - NO systemInstruction (FR-80); `contents` is passed through untouched (FR-35: parts unmodified);
 * - on generateImage and countTokens `httpOptions.timeout` is a positive number SHORTER than the constructor's 20-minute client
 *   floor (that floor is for Doc generation and must not govern an image call); the SDK merges it and honours `abortSignal`;
 * - single-shot: never `withRetry`, never a fallback model; the SDK error is rethrown with its `status`;
 * - the constructor still has no `retryOptions` (the existing warning in gemini.js applies).
 *
 * WHY uploadFile DIFFERS (live-proven against @google/genai 1.52.0): `ai.files.upload` answers Google 404 with an empty message
 * whenever `config.httpOptions` is truthy (even `{}`), because ApiClient.uploadFile -> fetchUploadUrl REPLACES the resumable-upload
 * start headers with the passed httpOptions instead of merging them; and the upload path never reads `config.abortSignal`. The mock
 * below reproduces the 404 so that any future code passing httpOptions to `files.upload` fails here.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UPSTREAM_TIMEOUT_MS } from '../server/image-studio/constants.js';

const genCalls: any[] = [];
const countCalls: any[] = [];
const uploadCalls: any[] = [];
const deleteCalls: any[] = [];
const ctorArgs: any[] = [];
let genImpl: (req: any) => Promise<any>;
let countImpl: (req: any) => Promise<any>;
let uploadImpl: (req: any) => Promise<any>;
let deleteImpl: (req: any) => Promise<any>;

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor(opts: any) { ctorArgs.push(opts); }
    models = {
      generateContent: async (req: any) => { genCalls.push(req); return genImpl(req); },
      countTokens: async (req: any) => { countCalls.push(req); return countImpl(req); },
    };
    files = {
      // Mirrors the proven SDK 1.52.0 behaviour: a truthy `config.httpOptions` REPLACES the resumable-upload start headers
      // and Google answers 404 with an empty message. The check runs BEFORE `uploadImpl`, so no test can mask it.
      upload: async (req: any) => {
        uploadCalls.push(req);
        if (req?.config?.httpOptions) {
          throw Object.assign(new Error('{"error":{"message":"","code":404,"status":"Not Found"}}'), { name: 'ApiError', status: 404 });
        }
        return uploadImpl(req);
      },
      delete: async (req: any) => { deleteCalls.push(req); return deleteImpl(req); },
    };
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
  genCalls.length = 0; countCalls.length = 0; uploadCalls.length = 0; deleteCalls.length = 0; ctorArgs.length = 0; withRetryMock.mockClear();
  genImpl = async () => SDK_IMAGE_RESPONSE;
  countImpl = async () => ({ totalTokens: 321 });
  uploadImpl = async () => ({ uri: 'https://generativelanguage.googleapis.com/v1beta/files/xyz', mimeType: 'image/png', name: 'files/xyz' });
  deleteImpl = async () => ({});
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
    await provider().generateImage({ model: 'gemini-3-pro-image', contents: CONTENTS, aspectRatio: '1:1', resolution: '1K', signal: new AbortController().signal });
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
    await expect(provider().generateImage({ model: 'gemini-3-pro-image', contents: CONTENTS, aspectRatio: '1:1', resolution: '1K', signal: new AbortController().signal }))
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
    await provider().generateImage({ model: 'gemini-3-pro-image', contents: CONTENTS, aspectRatio: '1:1', resolution: '1K', signal: new AbortController().signal }).catch(() => undefined);
    expect(genCalls.map((c) => c.model)).toEqual(['gemini-3-pro-image']);
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

/** A promise settled from outside: lets a test hold an SDK call open and finish it AFTER the race was lost. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

/** Observe a promise without awaiting it, so an assertion can say "still pending" / "already rejected" without hanging. */
function track<T>(promise: Promise<T>) {
  const seen: { state: 'pending' | 'fulfilled' | 'rejected'; value?: T; error?: any } = { state: 'pending' };
  promise.then((value) => { seen.state = 'fulfilled'; seen.value = value; }, (error) => { seen.state = 'rejected'; seen.error = error; });
  return seen;
}

const PNG_BYTES = new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]);
const SDK_FILE = { uri: 'https://generativelanguage.googleapis.com/v1beta/files/xyz', mimeType: 'image/png', name: 'files/xyz' };

describe('SDK mock fidelity: files.upload rejects like the real SDK when httpOptions is passed (defence in depth)', () => {
  it('a truthy config.httpOptions (even an empty object) is answered with a 404 ApiError; a config without it, or with only mimeType/abortSignal, uploads', async () => {
    const { GoogleGenAI } = await import('@google/genai') as any;
    const ai = new GoogleGenAI({ apiKey: 'k' });
    const file = new Blob([PNG_BYTES], { type: 'image/png' });
    await expect(ai.files.upload({ file, config: { mimeType: 'image/png', httpOptions: { timeout: 100_000 } } })).rejects.toMatchObject({ status: 404 });
    await expect(ai.files.upload({ file, config: { mimeType: 'image/png', httpOptions: {} } })).rejects.toMatchObject({ status: 404 });
    await expect(ai.files.upload({ file, config: { mimeType: 'image/png' } })).resolves.toMatchObject({ name: 'files/xyz' });
    await expect(ai.files.upload({ file, config: { mimeType: 'image/png', abortSignal: new AbortController().signal } })).resolves.toMatchObject({ name: 'files/xyz' });
  });
});

describe('GeminiProvider.uploadFile (FR-16, FR-21, FR-60)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  const flush = () => vi.advanceTimersByTimeAsync(0);

  it('FR-16: uploads the bytes as a Blob of the given type with config { mimeType } and NO httpOptions key, and returns the SDK file unchanged', async () => {
    const controller = new AbortController();
    const pending = provider().uploadFile({ bytes: PNG_BYTES, mimeType: 'image/png', signal: controller.signal });
    const seen = track(pending);
    await flush();
    expect(uploadCalls).toHaveLength(1);
    const req = uploadCalls[0];
    expect(req.file).toBeInstanceOf(Blob);
    expect(req.file.size).toBe(PNG_BYTES.length);
    expect(req.file.type).toBe('image/png');
    expect(req.config.mimeType).toBe('image/png');
    // The defect: any httpOptions on the upload call makes Google answer 404. The KEY must be absent, not merely undefined.
    expect(Object.hasOwn(req.config, 'httpOptions')).toBe(false);
    expect(seen.state).toBe('fulfilled');
    expect(seen.value).toBe(await pending);
    expect(seen.value).toEqual(SDK_FILE);
  });

  it('FR-16: the SDK object is handed back as is (same reference, not a copy)', async () => {
    const sdkFile = { ...SDK_FILE };
    uploadImpl = async () => sdkFile;
    const out = await provider().uploadFile({ bytes: PNG_BYTES, mimeType: 'image/png', signal: new AbortController().signal });
    expect(out).toBe(sdkFile);
  });

  it('FR-16: with an ordinary upload no files.delete is issued, and no timeout timer is left running after success or after an SDK failure', async () => {
    await provider().uploadFile({ bytes: PNG_BYTES, mimeType: 'image/png', signal: new AbortController().signal });
    expect(deleteCalls).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    uploadImpl = async () => { throw Object.assign(new Error('u'), { status: 503 }); };
    await expect(provider().uploadFile({ bytes: PNG_BYTES, mimeType: 'image/png', signal: new AbortController().signal })).rejects.toMatchObject({ status: 503 });
    expect(deleteCalls).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('FR-21: a signal aborted BEFORE the call rejects promptly with an AbortError and starts no upstream upload', async () => {
    const controller = new AbortController();
    controller.abort();
    uploadImpl = () => new Promise(() => undefined); // the SDK would never answer
    const seen = track(provider().uploadFile({ bytes: PNG_BYTES, mimeType: 'image/png', signal: controller.signal }));
    await flush();
    expect(seen.state).toBe('rejected');
    expect(seen.error.name).toBe('AbortError');
    expect(Number.isInteger(seen.error.status)).toBe(false); // an abort is not an HTTP failure
    expect(uploadCalls).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('FR-21: a signal aborted DURING the SDK call rejects promptly with an AbortError even though the SDK never answers, and leaves no timer behind', async () => {
    const controller = new AbortController();
    uploadImpl = () => new Promise(() => undefined);
    const seen = track(provider().uploadFile({ bytes: PNG_BYTES, mimeType: 'image/png', signal: controller.signal }));
    await flush();
    expect(uploadCalls).toHaveLength(1);
    expect(seen.state).toBe('pending');
    controller.abort();
    await flush(); // no clock advance: the rejection must not wait for the timeout
    expect(seen.state).toBe('rejected');
    expect(seen.error.name).toBe('AbortError');
    expect(Number.isInteger(seen.error.status)).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('DD-6 (corrected): an SDK call that never answers is rejected with a TimeoutError exactly when UPSTREAM_TIMEOUT_MS elapses, not before', async () => {
    const controller = new AbortController();
    uploadImpl = () => new Promise(() => undefined);
    const seen = track(provider().uploadFile({ bytes: PNG_BYTES, mimeType: 'image/png', signal: controller.signal }));
    await vi.advanceTimersByTimeAsync(UPSTREAM_TIMEOUT_MS - 1);
    expect(seen.state).toBe('pending');
    await vi.advanceTimersByTimeAsync(1);
    expect(seen.state).toBe('rejected');
    expect(seen.error.name).toBe('TimeoutError');
    // Timeout-class = a transient failure for the retry loop: no HTTP status, and NOT a Cancel (the caller's signal is untouched).
    expect(Number.isInteger(seen.error.status)).toBe(false);
    expect(controller.signal.aborted).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('FR-60: an SDK error is rethrown unchanged (same object, its status kept), single-shot, never through withRetry', async () => {
    const failure = Object.assign(new Error('{"error":{"code":502}}'), { status: 502 });
    uploadImpl = async () => { throw failure; };
    const seen = track(provider().uploadFile({ bytes: PNG_BYTES, mimeType: 'image/png', signal: new AbortController().signal }));
    await flush();
    expect(seen.state).toBe('rejected');
    expect(seen.error).toBe(failure);
    expect(seen.error.status).toBe(502);
    expect(uploadCalls).toHaveLength(1);
    expect(withRetryMock).not.toHaveBeenCalled();
    expect(deleteCalls).toHaveLength(0);
  });

  it('FR-21: an upload that resolves AFTER an abort won the race is deleted through files.delete, by its name, so no orphan remains', async () => {
    const controller = new AbortController();
    const sdk = deferred<any>();
    uploadImpl = () => sdk.promise;
    const seen = track(provider().uploadFile({ bytes: PNG_BYTES, mimeType: 'image/png', signal: controller.signal }));
    await flush();
    controller.abort();
    await flush();
    expect(seen.state).toBe('rejected');
    expect(deleteCalls).toHaveLength(0); // nothing to delete yet
    sdk.resolve({ uri: 'https://generativelanguage.googleapis.com/v1beta/files/late', mimeType: 'image/png', name: 'files/late' });
    await flush();
    expect(deleteCalls).toEqual([{ name: 'files/late' }]);
    expect(seen.error.name).toBe('AbortError'); // the caller's outcome is not rewritten by the late result
  });

  it('DD-6 (corrected): an upload that resolves AFTER the timeout won the race is deleted through files.delete, by its name', async () => {
    const sdk = deferred<any>();
    uploadImpl = () => sdk.promise;
    const seen = track(provider().uploadFile({ bytes: PNG_BYTES, mimeType: 'image/png', signal: new AbortController().signal }));
    await vi.advanceTimersByTimeAsync(UPSTREAM_TIMEOUT_MS);
    expect(seen.state).toBe('rejected');
    expect(deleteCalls).toHaveLength(0);
    sdk.resolve({ uri: 'https://generativelanguage.googleapis.com/v1beta/files/late2', mimeType: 'image/png', name: 'files/late2' });
    await flush();
    expect(deleteCalls).toEqual([{ name: 'files/late2' }]);
    expect(seen.error.name).toBe('TimeoutError');
  });

  it('FR-21: a signal aborted AFTER the upload finished does not delete the file the caller already received', async () => {
    const controller = new AbortController();
    const out = await provider().uploadFile({ bytes: PNG_BYTES, mimeType: 'image/png', signal: controller.signal });
    controller.abort();
    await flush();
    expect(out).toEqual(SDK_FILE);
    expect(deleteCalls).toHaveLength(0);
  });
});

describe('GeminiProvider.uploadFile - the lost race never produces an unhandled rejection (FR-21)', () => {
  // Real timers on purpose: 'unhandledRejection' is emitted from the macrotask queue, which fake timers would not turn over.
  const turn = () => new Promise<void>((resolve) => setImmediate(resolve));
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => { unhandled.push(reason); };
  beforeEach(() => { unhandled.length = 0; process.on('unhandledRejection', onUnhandled); });
  afterEach(() => { process.off('unhandledRejection', onUnhandled); });

  it('a late SDK rejection after an abort is swallowed', async () => {
    const controller = new AbortController();
    const sdk = deferred<any>();
    uploadImpl = () => sdk.promise;
    const seen = track(provider().uploadFile({ bytes: PNG_BYTES, mimeType: 'image/png', signal: controller.signal }));
    await turn();
    controller.abort();
    await turn();
    expect(seen.state).toBe('rejected');
    expect(seen.error.name).toBe('AbortError');
    expect(uploadCalls).toHaveLength(1); // the SDK call was really started and is still open
    sdk.reject(Object.assign(new Error('late failure'), { status: 503 }));
    await turn(); await turn();
    expect(unhandled).toEqual([]);
    expect(deleteCalls).toHaveLength(0); // a failed upload left nothing to delete
  });

  it('a failing cleanup files.delete after a lost race is swallowed (best effort, never thrown into the process)', async () => {
    const controller = new AbortController();
    const sdk = deferred<any>();
    uploadImpl = () => sdk.promise;
    deleteImpl = async () => { throw Object.assign(new Error('delete failed'), { status: 500 }); };
    const seen = track(provider().uploadFile({ bytes: PNG_BYTES, mimeType: 'image/png', signal: controller.signal }));
    await turn();
    controller.abort();
    await turn();
    expect(seen.state).toBe('rejected');
    expect(seen.error.name).toBe('AbortError');
    sdk.resolve({ uri: 'u', mimeType: 'image/png', name: 'files/orphan' });
    await turn(); await turn();
    expect(deleteCalls).toEqual([{ name: 'files/orphan' }]); // the cleanup WAS attempted ...
    expect(unhandled).toEqual([]);                           // ... and its failure stayed contained
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

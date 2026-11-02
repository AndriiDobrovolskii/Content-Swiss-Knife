/**
 * Doubles for the server handler specs of US-10.1 (upload-handler, generate-handler). Written by the T16-T18 spec author;
 * the shared `fakes.ts` (browser-side ports) is deliberately not edited.
 *
 * Fake req/res follow the precedent of test/cors-policy.spec.ts `exchange()`: no sockets. The handler under test is the
 * real `createUploadHandler` / `createGenerateHandler` of server/image-studio/handlers.js (CONTRACT.md); only its
 * injected effects (provider, limiter, clock, sleep, usage sink, price, log) are doubles.
 *
 * Abort convention (DD-13): a handler aborts its AbortController when the RESPONSE closes before it finished. The fake res
 * therefore exposes `closeEarly()`, which emits 'close' on the res with `writableFinished === false`. (Node's IncomingMessage
 * also emits 'close' once the body is read, so a correct implementation cannot key the abort on the request alone.)
 */
import { EventEmitter } from 'node:events';

export interface FakeReq extends EventEmitter {
  body: unknown;
  ip: string;
  headers: Record<string, string>;
  method: string;
  get(name: string): string | undefined;
}
export function makeReq(body: unknown, opts: { ip?: string; headers?: Record<string, string> } = {}): FakeReq {
  const req = new EventEmitter() as FakeReq;
  req.body = body;
  req.ip = opts.ip ?? '203.0.113.7';
  req.headers = opts.headers ?? {};
  req.method = 'POST';
  req.get = (name: string) => req.headers[name.toLowerCase()];
  return req;
}

export interface FakeRes extends EventEmitter {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  headersSent: boolean;
  writableFinished: boolean;
  writableEnded: boolean;
  status(code: number): FakeRes;
  json(payload: unknown): FakeRes;
  send(payload?: unknown): FakeRes;
  end(payload?: unknown): FakeRes;
  set(name: string | Record<string, string>, value?: string): FakeRes;
  setHeader(name: string, value: string): FakeRes;
  header(name: string, value: string): FakeRes;
  getHeader(name: string): string | undefined;
  get(name: string): string | undefined;
  /** Simulate the client going away before the response finished. */
  closeEarly(): void;
}
export function makeRes(): FakeRes {
  const res = new EventEmitter() as FakeRes;
  res.statusCode = 200;
  res.body = undefined;
  res.headers = {};
  res.headersSent = false;
  res.writableFinished = false;
  res.writableEnded = false;
  const finish = (payload?: unknown) => {
    res.body = payload;
    res.headersSent = true;
    res.writableEnded = true;
    res.writableFinished = true;
    res.emit('finish');
    res.emit('close');
    return res;
  };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => finish(payload);
  res.send = (payload) => finish(payload);
  res.end = (payload) => finish(payload);
  const setHeader = (name: string, value: string) => { res.headers[name.toLowerCase()] = String(value); return res; };
  res.setHeader = setHeader;
  res.header = setHeader;
  res.set = (name, value) => {
    if (typeof name === 'string') return setHeader(name, value as string);
    for (const [k, v] of Object.entries(name)) setHeader(k, v);
    return res;
  };
  res.getHeader = (name) => res.headers[name.toLowerCase()];
  res.get = (name) => res.headers[name.toLowerCase()];
  res.closeEarly = () => { res.emit('close'); };
  return res;
}

/** A real AbortError-shaped rejection, as an abortable sleep or fetch produces. */
export const abortError = () => Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });

/** A sleep that resolves at once, recording every wait. Rejects if the signal is already aborted. */
export function makeInstantSleep() {
  const waits: number[] = [];
  return {
    waits,
    sleep: async (ms: number, signal?: AbortSignal) => {
      if (signal?.aborted) throw abortError();
      waits.push(ms);
    },
  };
}

/**
 * A sleep that blocks until the test releases it (or the signal aborts, which rejects it). Lets a test stand INSIDE a
 * backoff wait and cancel there (FR-21: "a test with an injectable clock cancels in the middle of a backoff wait").
 */
export function makeControlledSleep() {
  const waits: number[] = [];
  const pending: Array<() => void> = [];
  return {
    waits,
    get pendingCount() { return pending.length; },
    releaseAll() { for (const r of pending.splice(0)) r(); },
    sleep: (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
      if (signal?.aborted) return reject(abortError());
      waits.push(ms);
      const done = () => resolve();
      pending.push(done);
      signal?.addEventListener('abort', () => reject(abortError()), { once: true });
    }),
  };
}

export interface ProviderCall { method: 'generateImage' | 'uploadFile' | 'countTokens'; args: any }
/** A Gemini provider stub: scripted answers per method, every call recorded with its AbortSignal. */
export function makeStubGemini(script: {
  generateImage?: (args: any, n: number) => Promise<any> | any;
  uploadFile?: (args: any, n: number) => Promise<any> | any;
  countTokens?: (args: any, n: number) => Promise<any> | any;
} = {}) {
  const calls: ProviderCall[] = [];
  const count = { generateImage: 0, uploadFile: 0, countTokens: 0 };
  const wrap = (method: ProviderCall['method'], fallback: (args: any) => any) => async (args: any) => {
    calls.push({ method, args });
    count[method] += 1;
    const fn = script[method];
    return fn ? fn(args, count[method]) : fallback(args);
  };
  const stub: any = {
    calls,
    count,
    generateImage: wrap('generateImage', () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'QUJDRA==' } }] } }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 1290, thoughtsTokenCount: 10 } })),
    uploadFile: wrap('uploadFile', () => ({ uri: 'https://generativelanguage.googleapis.com/v1beta/files/abc123', mimeType: 'image/png' })),
    countTokens: wrap('countTokens', () => ({ totalTokens: 10 })),
  };
  return stub;
}

export const upstreamError = (status: number, message = `upstream ${status}`) => Object.assign(new Error(message), { status });

export function makeLogSpy() {
  const lines: unknown[][] = [];
  const record = (...args: unknown[]) => { lines.push(args); };
  // `log` is a function (CONTRACT.md); the level aliases make the spy tolerant of log.error / log.warn call sites.
  const log: any = Object.assign((...args: unknown[]) => record(...args), { error: record, warn: record, info: record });
  const text = () => lines.map((a) => a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x, Object.getOwnPropertyNames(Object(x))))).join(' ')).join('\n');
  return { log, lines, text };
}

/**
 * Fixtures shared by the "core client flow" specs of US-10.1 (request-builder, apply-response, generation-runner,
 * generation-runner.file-missing, image-studio.store.sessions, image-studio.store.generation).
 *
 * Built on `fakes.ts`; imports nothing from production code, so it is never red by itself.
 */
import { vi } from 'vitest';
import {
  makeFakeClock, makeFakeScheduler, makeInMemorySessionStore, makeRaster, makeRecordingAnnouncer, makeIdSource,
  toBase64, type FakeClock, type FakeScheduler, type InMemorySessionStore, type Part, type StoredSession, type UiLanguage,
} from './fakes';

export const PNG_B64 = toBase64(makeRaster({ format: 'png', width: 4, height: 4 }));
export const FLASH = 'gemini-3.1-flash-image';
export const PRO = 'gemini-3-pro-image';

export const imagePart = (extra: Partial<Part> = {}): Part => ({ inlineData: { mimeType: 'image/png', data: PNG_B64 }, ...extra });

export interface ImagesResponseOverrides {
  parts?: Part[];
  costUsd?: number;
  usage?: { inputTokens: number; outputTokens: number };
  trimmedTurnIds?: string[];
  [k: string]: unknown;
}
export const imagesResponse = (over: ImagesResponseOverrides = {}) => ({
  kind: 'images' as const,
  parts: [imagePart({ thoughtSignature: 'sig-new' })],
  costUsd: 0.03,
  usage: { inputTokens: 10, outputTokens: 20 },
  trimmedTurnIds: [] as string[],
  ...over,
});
export const textResponse = (text = 'I could not draw that.', trimmedTurnIds: string[] = []) => ({ kind: 'text' as const, text, trimmedTurnIds });
export const safetyResponse = (reason = 'IMAGE_SAFETY', trimmedTurnIds: string[] = []) => ({ kind: 'safety' as const, reason, trimmedTurnIds });

export type ImageHttpResult = { ok: true; body: unknown } | { ok: false; status: number; errorField?: string };
export const okBody = (body: unknown): ImageHttpResult => ({ ok: true, body });
export const failure = (status: number, errorField?: string): ImageHttpResult => ({ ok: false, status, ...(errorField ? { errorField } : {}) });

export interface Deferred<T> { promise: Promise<T>; resolve(v: T): void; reject(e: unknown): void }
export function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

/** Lets every already-queued microtask (and the promise chains they start) run. No timers involved. */
export async function flush(rounds = 60): Promise<void> {
  for (let i = 0; i < rounds; i++) await Promise.resolve();
}

/** True once `p` has settled (without awaiting it forever). */
export async function settled(p: Promise<unknown>): Promise<boolean> {
  let done = false;
  void p.then(() => { done = true; }, () => { done = true; });
  await flush();
  return done;
}

export const BUILD_BASE = { model: FLASH, aspectRatio: '1:1', resolution: '1K' } as const;

export interface GenerateCall { request: any; signal: AbortSignal | undefined; index: number }
export interface UploadCall { request: { data: string }; signal: AbortSignal | undefined; index: number }

export interface RunnerHarness {
  clock: FakeClock;
  scheduler: FakeScheduler;
  announcer: ReturnType<typeof makeRecordingAnnouncer>;
  store: InMemorySessionStore;
  ids: ReturnType<typeof makeIdSource>;
  lang: { current: 'en' | 'uk' };
  uiLanguage: UiLanguage;
  existing: Set<string>;
  generateCalls: GenerateCall[];
  uploadCalls: UploadCall[];
  /** Scripted behaviour: the n-th generate call (0-based) runs `generate[n]` (last entry repeats). */
  script: {
    generate: Array<(request: any, signal: AbortSignal | undefined) => Promise<ImageHttpResult>>;
    upload: Array<(request: { data: string }, signal: AbortSignal | undefined) => Promise<ImageHttpResult>>;
  };
  /** The dependency object handed to `createGenerationRunner(deps)` (pinned shape, see generation-runner.spec.ts). */
  deps: Record<string, unknown>;
}

/** An abort-aware pending promise: resolves `{ ok:false, status:0 }` when the signal aborts (what LlmService returns). */
export function pendingUntilAbort(signal: AbortSignal | undefined): Promise<ImageHttpResult> {
  return new Promise((resolve) => {
    signal?.addEventListener('abort', () => resolve({ ok: false, status: 0 }), { once: true });
  });
}

export function makeRunnerHarness(): RunnerHarness {
  const clock = makeFakeClock();
  const scheduler = makeFakeScheduler(clock);
  const announcer = makeRecordingAnnouncer();
  const store = makeInMemorySessionStore();
  const ids = makeIdSource('mt');
  const lang = { current: 'en' as 'en' | 'uk' };
  const uiLanguage: UiLanguage = () => lang.current;
  const existing = new Set<string>(['s1']);
  const generateCalls: GenerateCall[] = [];
  const uploadCalls: UploadCall[] = [];
  const script: RunnerHarness['script'] = { generate: [async () => okBody(imagesResponse())], upload: [] };
  let uploadSeq = 0;

  const deps = {
    generateImage: vi.fn(async (request: any, signal?: AbortSignal) => {
      const index = generateCalls.length;
      generateCalls.push({ request: structuredClone(request), signal, index });
      const fn = script.generate[Math.min(index, script.generate.length - 1)];
      return fn(request, signal);
    }),
    uploadImage: vi.fn(async (request: { data: string }, signal?: AbortSignal) => {
      const index = uploadCalls.length;
      uploadCalls.push({ request: structuredClone(request), signal, index });
      const fn = script.upload[Math.min(index, script.upload.length - 1)];
      if (fn) return fn(request, signal);
      uploadSeq += 1;
      return okBody({ fileUri: `files/new-${uploadSeq}`, mimeType: 'image/png' });
    }),
    store: { getSentBytes: store.getSentBytes.bind(store), remapFileUris: store.remapFileUris.bind(store) },
    clock,
    scheduler,
    announcer,
    uiLanguage,
    idSource: ids,
    sessionExists: async (id: string) => existing.has(id),
  };
  return { clock, scheduler, announcer, store, ids, lang, uiLanguage, existing, generateCalls, uploadCalls, script, deps };
}

/** A stored session id used across the runner specs; matches `existing` in the harness. */
export const SID = 's1';

/** Seed the harness store with `session` (so remap/getSentBytes have something to act on). */
export function seedStore(h: RunnerHarness, session: StoredSession, sent: Record<string, { bytes: Uint8Array; mimeType: string }> = {}) {
  h.store.seed(session, sent);
  h.existing.add(session.meta.id);
}

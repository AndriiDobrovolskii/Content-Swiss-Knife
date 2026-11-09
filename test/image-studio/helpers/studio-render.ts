/**
 * US-10.1 component-spec harness (owned by the UI group; imports the production tokens/store statically, so it is used
 * by `*.component.spec.ts` files only - the component runner already fails at build until the studio exists).
 *
 * It renders one studio component with the REAL root `ImageStudioStore` and the fakes of `fakes.ts` behind the DI tokens
 * of the contract, plus `HttpTestingController` for `LlmService`. Nothing here replaces the unit under test.
 *
 * PINNED UI CONTRACT (the builder must satisfy it; the Specification fixes the texts, the plan fixes the components):
 *   - every studio component (container and the three children) has `lang = input.required<'en' | 'uk'>()`;
 *   - texts come from `studioText(id, lang)`; a control's accessible name is its text id: Send X-1, Attach X-2,
 *     aspect ratio X-4, resolution X-5, model X-6, download format X-7, Download X-8, product name X-11, prompt X-12,
 *     presets X-13, remove attachment X-14, close X-15, versions X-16, full view X-17, attachment list X-25 (role=list), chat log X-26 (role=log), session list X-9 (role=list);
 *   - the control labels of T-22 are the literals in LABELS below (Cancel, Retry, New session, Edit this version,
 *     Download all versions, Copy to clipboard);
 *   - presets and chips are `<button>`s named by PRN-n / T-15a..d; preset buttons are inside a group named X-13;
 *   - the prompt is a textarea (role textbox), aspect ratio / resolution / model are `<select>`s (role combobox);
 *   - one generation status element `role="status"`, errors/notices in `role="alert"` elements;
 *   - the per-version actions (format selector X-7, Download X-8, Copy, Edit this version) live in the full-view dialog
 *     opened by clicking the version's thumbnail button (its accessible name contains `v<N>`); "Download all versions"
 *     lives in the strip.
 *
 * US-10.5 CHANGES TO THE CONTRACT (the format selector, X-7, is gone; the dialog is `app-studio-full-view`; "Download all
 * (N) .zip" lives in the feed). The additional pinned DOM contract, which the component specs of this Story assume and the
 * builder must satisfy (test_strategy section "Pinned component contract" lists it with the owner task of each line):
 *   - `app-studio-header`: heading "Image Studio" (X-30, role heading, NOT a button), a button "New session" (T-22), the
 *     plain text `· history (N)` (X-33.*);
 *   - `app-studio-feed`: `<div role="log" aria-live="off">` named X-26 (always rendered) holding, in order, the empty state or
 *     a presentational progress element (`aria-hidden="true"`, no role) or the turn cards, then the one strip, then events and
 *     Retry; the "Download all (N) .zip" button and the SynthID notice (T-19) sit OUTSIDE the log, above it;
 *   - `app-studio-turn-card`: root is an `<article>`; it holds input thumbnails (`img`, alt X-31, NOT inside a `figure`), the
 *     prompt text, chips (ratio, resolution, model, preset) as plain text, the summary line, text paragraphs and the tiles
 *     in API order, and a button "Reuse prompt" (X-37);
 *   - `app-studio-image-tile`: a `<figure aria-labelledby>` whose `<figcaption>` reads `v{N} · {W}x{H}` (or `v{N}`), holding
 *     one `img` (alt = prompt, or X T-21 when blank), buttons "Download" (X-8) and "Edit this →" (T-22.editVersion), the chip
 *     "Edit of v{n}" (X-39) and the button "Compare with v{n}" (X-38) only when the source is retained;
 *   - `app-studio-version-strip`: thumbnails only, each an `img` inside a `button` named by `v{N}`, never inside a `figure`;
 *   - `app-studio-full-view`: the only `role="dialog"` (named X-17); `app-studio-compare-slider`: one `role="slider"`.
 */
import { vi, expect } from 'vitest';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TestBed, DeferBlockBehavior } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController, TestRequest } from '@angular/common/http/testing';
import type { Type } from '@angular/core';
import {
  makeFakeClock, makeFakeScheduler, makeIdSource, makeAlertPort, makeConfirmPort, makeClipboardPort, makeSavePort,
  makeFakeCodec, makeInMemorySessionStore, makeRaster, toBase64, makeFakeLocalOffset, makeFakeArchiveBuilder,
  type StoredSession, type FakeCodecOptions, type Part,
} from './fakes';
import {
  CLOCK_PORT, SCHEDULER_PORT, ID_SOURCE_PORT, SESSION_STORE_PORT, IMAGE_CODEC_PORT, ALERT_PORT, CONFIRM_PORT,
  CLIPBOARD_PORT, SAVE_PORT, LOCAL_OFFSET_PORT, ARCHIVE_BUILDER_PORT,
} from '../../../src/services/image-studio/image-studio.tokens';
import { ImageStudioStore } from '../../../src/services/image-studio/image-studio.store';
import { StudioDeliveryService } from '../../../src/services/image-studio/studio-delivery.service';
import { StudioMediaService } from '../../../src/services/image-studio/studio-media.service';
import { buildZip } from '../../../src/utils/image-studio/zip';
import { studioText } from '../../../src/utils/image-studio/studio-texts';

export type Lang = 'en' | 'uk';

/** T-22 control labels, verbatim from the Interface text table. */
export const LABELS = {
  // US-10.5 (D-1, FR-6, FR-11): "Edit this version" -> "Edit this →"; "Download all versions" -> "Download all (N) .zip", so the
  // lookup is a pattern over N (a string name would have to know N). `generate` / `writePrompt` are the two states of the
  // send button (FR-17); `reuse` is the turn card's button. Every importer was checked: only the container and strip specs
  // read `edit` / `downloadAll`; the app-shell and clear-all specs read neither.
  en: {
    cancel: 'Cancel', retry: 'Retry', newSession: 'New session', edit: 'Edit this →', downloadAll: /^Download all \(\d+\) \.zip$/, copy: 'Copy to clipboard',
    generate: 'Generate', writePrompt: 'Write a prompt to start', reuse: 'Reuse prompt',
  },
  uk: {
    cancel: 'Скасувати', retry: 'Повторити', newSession: 'Нова сесія', edit: 'Редагувати →', downloadAll: /^Завантажити все \(\d+\) \.zip$/, copy: 'Копіювати в буфер обміну',
    generate: 'Згенерувати', writePrompt: 'Напишіть промпт для початку', reuse: 'Використати промпт',
  },
} as const;

export const MODEL_LABEL = { flash: 'Nano Banana 2, Flash', pro: 'Nano Banana Pro, Pro' } as const;
export const FLASH = 'gemini-3.1-flash-image';
export const PRO = 'gemini-3-pro-image';

export interface RenderOptions {
  lang?: Lang;
  sessions?: StoredSession[];
  sentBytes?: Record<string, Record<string, { bytes: Uint8Array; mimeType: string }>>;
  codec?: FakeCodecOptions;
  confirmAnswer?: boolean;
  /** Minutes east of UTC the fake `LOCAL_OFFSET_PORT` reports (default 0); change later with `h.offset.set(...)`. */
  offsetMinutes?: number;
  /** Extra inputs for the component (besides `lang`). */
  inputs?: Record<string, unknown>;
  /** For hosts that have no `lang` input (AppComponent): do not pass one. */
  noLangInput?: boolean;
  /**
   * testing-library's `render()` defaults to `DeferBlockBehavior.Manual`, under which a template `@defer` block never leaves its
   * initial state. A host that mounts the studio through the production `@defer (on immediate)` (AppComponent, plan P-7 / DD-25)
   * must pass `DeferBlockBehavior.Playthrough` so the lazy branch loads as it does in the browser. Left undefined for the
   * studio components themselves (they have no `@defer`), so their renders are unchanged.
   */
  deferBlockBehavior?: DeferBlockBehavior;
}

export async function renderStudio<T>(component: Type<T>, opts: RenderOptions = {}) {
  localStorage.clear();
  const lang = opts.lang ?? 'en';
  const clock = makeFakeClock();
  const scheduler = makeFakeScheduler(clock);
  const ids = makeIdSource('t');
  const alerts = makeAlertPort();
  const confirmPort = makeConfirmPort(opts.confirmAnswer ?? true);
  const clipboard = makeClipboardPort();
  const save = makeSavePort();
  const codec = makeFakeCodec(opts.codec);
  const sessionStore = makeInMemorySessionStore();
  const offset = makeFakeLocalOffset(opts.offsetMinutes ?? 0);
  const archive = makeFakeArchiveBuilder(buildZip);
  for (const s of opts.sessions ?? []) sessionStore.seed(s, opts.sentBytes?.[s.meta.id]);

  const view = await render(component, {
    ...(opts.deferBlockBehavior === undefined ? {} : { deferBlockBehavior: opts.deferBlockBehavior }),
    inputs: { ...(opts.noLangInput ? {} : { lang }), ...(opts.inputs ?? {}) } as never,
    providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: CLOCK_PORT, useValue: clock },
      { provide: SCHEDULER_PORT, useValue: scheduler },
      { provide: ID_SOURCE_PORT, useValue: ids },
      { provide: SESSION_STORE_PORT, useValue: sessionStore },
      { provide: IMAGE_CODEC_PORT, useValue: codec },
      { provide: ALERT_PORT, useValue: alerts },
      { provide: CONFIRM_PORT, useValue: confirmPort },
      { provide: CLIPBOARD_PORT, useValue: clipboard },
      { provide: SAVE_PORT, useValue: save },
      { provide: LOCAL_OFFSET_PORT, useValue: offset },
      { provide: ARCHIVE_BUILDER_PORT, useValue: archive.build },
      // In production only the container provides these two (container-scoped, plan DD-6); an isolated component render
      // has no container, so the harness provides them (plan DD-6, "test infrastructure").
      StudioDeliveryService, StudioMediaService,
    ],
  });
  const store = TestBed.inject(ImageStudioStore);
  store.setLanguage(lang);
  await store.init();
  view.detectChanges();
  await view.fixture.whenStable();
  view.detectChanges();

  const http = TestBed.inject(HttpTestingController);
  const user = userEvent.setup();

  const setLang = async (next: Lang) => {
    if (!opts.noLangInput) view.fixture.componentRef.setInput('lang', next);
    store.setLanguage(next);
    view.detectChanges();
    await view.fixture.whenStable();
  };
  // `whenStable()` only knows Angular's own pending work (zone / PendingTasks, which the HttpClient request holds until it
  // completes). The runner -> store commit chain that follows a flushed response is plain promise work over the
  // in-memory fakes (many awaits), which that stability tracking cannot see. So settle() drains it: a zero-delay REAL
  // macrotask yield runs every queued microtask (all fakes are promise-only; the injected scheduler/clock are fake, so
  // no real timer is involved), and the cycle repeats once so an effect that schedules more promise work is covered too.
  // It is a flush, not a sleep: it returns as soon as the queue is empty and never waits on wall-clock time.
  const settle = async () => {
    for (let round = 0; round < 2; round++) {
      await view.fixture.whenStable();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      view.detectChanges();
    }
    await view.fixture.whenStable();
    view.detectChanges();
  };

  return { view, store, http, user, clock, scheduler, ids, alerts, confirmPort, clipboard, save, codec, sessionStore, offset, archive, setLang, settle, lang };
}

/**
 * A MutationObserver that keeps reporting. happy-dom 20.x registers the observer's internal report callback only through a
 * `WeakRef` (MutationObserverListener constructor), and nothing else holds that arrow function, so after ANY garbage
 * collection the observer silently stops delivering records (proven with `node --expose-gc`: a write made after `gc()` is
 * never reported). A test that counts mutations is therefore GC-timing dependent. This helper calls `observe()` with the
 * global `WeakRef` temporarily replaced by a strong holder, which pins the callback for the life of the observer;
 * `disconnect()` behaves as usual.
 */
export function observeMutations(target: Node, callback: MutationCallback, init: MutationObserverInit): MutationObserver {
  const mo = new MutationObserver(callback);
  const RealWeakRef = globalThis.WeakRef;
  class StrongRef<V extends object> { constructor(private readonly v: V) {} deref() { return this.v; } }
  (globalThis as unknown as { WeakRef: unknown }).WeakRef = StrongRef;
  try { mo.observe(target, init); } finally { (globalThis as unknown as { WeakRef: unknown }).WeakRef = RealWeakRef; }
  return mo;
}

export type Harness = Awaited<ReturnType<typeof renderStudio>>;

/** Text of a studio text id in a language. */
export const t = (id: string, lang: Lang, params?: Record<string, string | number>) => studioText(id, lang, params);

/** Whitespace-normalised text of a node. */
export const textOf = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

export const png = (w = 64, h = 48, size = 2048) => makeRaster({ format: 'png', width: w, height: h, size, exif: true });
export const fileOf = (name: string, bytes: Uint8Array, type = 'image/png') =>
  new File([bytes as BlobPart], name, { type });

export function imagesBody(opts: { count?: number; costUsd?: number; trimmedTurnIds?: string[]; mime?: string } = {}) {
  const parts: Part[] = [];
  for (let i = 0; i < (opts.count ?? 1); i++) {
    parts.push({ inlineData: { mimeType: opts.mime ?? 'image/png', data: toBase64(makeRaster({ format: 'png', width: 16, height: 16, size: 200 + i })) }, thoughtSignature: `sig-${i}` });
  }
  return { kind: 'images', parts, costUsd: opts.costUsd ?? 0.03, usage: { inputTokens: 10, outputTokens: 20 }, trimmedTurnIds: opts.trimmedTurnIds ?? [] };
}

export const GENERATE_URL = '/api/image-studio/generate';
export const UPLOAD_URL = '/api/image-studio/upload';

export const expectGenerate = (h: Harness): TestRequest => h.http.expectOne(GENERATE_URL);
export const flushGenerate = async (h: Harness, body: unknown, init?: { status?: number; statusText?: string }) => {
  const req = h.http.expectOne(GENERATE_URL);
  if (init?.status && init.status >= 400) req.flush(body, { status: init.status, statusText: init.statusText ?? 'Error' });
  else req.flush(body);
  await h.settle();
  return req;
};
export const flushUploads = async (h: Harness, uris: string[]) => {
  const reqs = h.http.match(UPLOAD_URL);
  reqs.forEach((r, i) => r.flush({ fileUri: uris[i] ?? `files/auto-${i}`, mimeType: 'image/png' }));
  await h.settle();
  return reqs;
};

export const byName = {
  button: (name: string | RegExp) => screen.getByRole('button', { name }),
  queryButton: (name: string | RegExp) => screen.queryByRole('button', { name }),
  textarea: (lang: Lang) => screen.getByRole('textbox', { name: t('X-12', lang) }) as HTMLTextAreaElement,
  product: (lang: Lang) => screen.getByRole('textbox', { name: t('X-11', lang) }) as HTMLInputElement,
  select: (id: string, lang: Lang) => screen.getByRole('combobox', { name: t(id, lang) }) as HTMLSelectElement,
};

/** Wait (real polling, no fixed sleep) until `n` upload requests are open, take them out of the controller and return them. */
export async function collectUploads(h: Harness, n: number): Promise<TestRequest[]> {
  const got: TestRequest[] = [];
  await vi.waitFor(() => {
    got.push(...h.http.match(UPLOAD_URL));
    expect(got.length).toBe(n);
  });
  return got;
}

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
 */
import { vi, expect } from 'vitest';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController, TestRequest } from '@angular/common/http/testing';
import type { Type } from '@angular/core';
import {
  makeFakeClock, makeFakeScheduler, makeIdSource, makeAlertPort, makeConfirmPort, makeClipboardPort, makeSavePort,
  makeFakeCodec, makeInMemorySessionStore, makeRaster, toBase64,
  type StoredSession, type FakeCodecOptions, type Part,
} from './fakes';
import {
  CLOCK_PORT, SCHEDULER_PORT, ID_SOURCE_PORT, SESSION_STORE_PORT, IMAGE_CODEC_PORT, ALERT_PORT, CONFIRM_PORT,
  CLIPBOARD_PORT, SAVE_PORT,
} from '../../../src/services/image-studio/image-studio.tokens';
import { ImageStudioStore } from '../../../src/services/image-studio/image-studio.store';
import { studioText } from '../../../src/utils/image-studio/studio-texts';

export type Lang = 'en' | 'uk';

/** T-22 control labels, verbatim from the Interface text table. */
export const LABELS = {
  en: { cancel: 'Cancel', retry: 'Retry', newSession: 'New session', edit: 'Edit this version', downloadAll: 'Download all versions', copy: 'Copy to clipboard' },
  uk: { cancel: 'Скасувати', retry: 'Повторити', newSession: 'Нова сесія', edit: 'Редагувати цю версію', downloadAll: 'Завантажити всі версії', copy: 'Копіювати в буфер обміну' },
} as const;

export const MODEL_LABEL = { flash: 'Nano Banana 2, Flash', pro: 'Nano Banana Pro, Pro' } as const;
export const FLASH = 'gemini-3.1-flash-image';
export const PRO = 'gemini-3.1-pro-image-preview';

export interface RenderOptions {
  lang?: Lang;
  sessions?: StoredSession[];
  sentBytes?: Record<string, Record<string, { bytes: Uint8Array; mimeType: string }>>;
  codec?: FakeCodecOptions;
  confirmAnswer?: boolean;
  /** Extra inputs for the component (besides `lang`). */
  inputs?: Record<string, unknown>;
  /** For hosts that have no `lang` input (AppComponent): do not pass one. */
  noLangInput?: boolean;
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
  for (const s of opts.sessions ?? []) sessionStore.seed(s, opts.sentBytes?.[s.meta.id]);

  const view = await render(component, {
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

  return { view, store, http, user, clock, scheduler, ids, alerts, confirmPort, clipboard, save, codec, sessionStore, setLang, settle, lang };
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

/**
 * image-studio.store.generation.spec.ts - US-10.1, task T40 (FR-21, FR-22, FR-36, FR-37, FR-45, FR-47, FR-50, FR-62, FR-63, FR-64,
 * FR-74, SD-18, SD-22, SD-36, SD-37, D-4, D-5, D-12, D-23, NFR-14; AC-11, AC-12, AC-27, AC-46 store half).
 *
 * Runner: test:logic, same harness as image-studio.store.sessions.spec.ts (read its header for the lifecycle/draft API pinned by
 * task T39). src/services/image-studio/image-studio.store.ts does not exist yet: loaded at run time per test.
 *
 * PINNED GENERATION API (added by T40 to the same file):
 *   send(): Promise<void>      one user action from the current session's draft; resolves when the action has ended
 *   retry(): Promise<void>     re-sends the SAME turn (same content, ratio, resolution, model, preset); no-op unless canRetry()
 *   cancel(): void             aborts the in-flight call (FR-21)
 *   editVersion(n: number): Promise<void>   FR-37: normal state attaches version n inline to the draft (replacing any earlier one);
 *                                           blocked state creates a NEW session seeded with version n (FR-47)
 *   generating(): boolean;  canSend(): boolean;  canRetry(): boolean;  blocked(): boolean
 *   inputEnabled(): boolean    false only while a generation runs (SD-37: the blocked state keeps the input enabled)
 *   statusMessage(): string    the text of the ONE role="status" region; '' when cleared (the store implements Announcer)
 *   message(): { textId: string; params?: Record<string, string | number>; region: 'alert' } | null
 *                              the pending error/notice (T-6, T-7, T-9, T-14, T-18, T-4 ...); cleared when the next action starts
 *   events(): Array<{ kind: 'text' | 'safety'; text?: string; reason?: string; sessionId: string }>
 *                              non-history events of the CURRENT session; in memory only (D-5)
 *   On send the composer draft (text, attachments, attached version) is cleared; it is RESTORED when the turn fails, is cancelled,
 *   times out or is blocked (FR-36); after a success it stays cleared.
 *
 * statusMessage is a signal, so a test can only observe it at checkpoints; the exact number of announcer calls ("exactly twice")
 * is pinned at the runner layer (generation-runner.spec.ts) and in the component spec with a MutationObserver (AC-46).
 */
import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { Injector } from '@angular/core';
import { LlmService } from '../llm.service';
import {
  makeFakeClock, makeFakeScheduler, makeIdSource, makeInMemorySessionStore, makeAlertPort, makeConfirmPort, makeClipboardPort,
  makeSavePort, makeFakeCodec, makeSession, type StoredSession,
} from '../../../test/image-studio/helpers/fakes';
import {
  imagesResponse, textResponse, safetyResponse, okBody, failure, flush, deferred, pendingUntilAbort, PRO,
  type ImageHttpResult,
} from '../../../test/image-studio/helpers/core-fixtures';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const DAY = 86_400_000;

async function setup(opts: { seed?: StoredSession[] } = {}) {
  const tokens = await load('./image-studio.tokens');
  const { ImageStudioStore } = await load('./image-studio.store');
  const clock = makeFakeClock(100 * DAY);
  const scheduler = makeFakeScheduler(clock);
  const port = makeInMemorySessionStore();
  const alert = makeAlertPort();
  const llm = { generateImage: vi.fn(), uploadImageFile: vi.fn() };
  for (const s of opts.seed ?? []) port.seed(s);
  const providers = [
    { provide: tokens.CLOCK_PORT, useValue: clock },
    { provide: tokens.SCHEDULER_PORT, useValue: scheduler },
    { provide: tokens.ID_SOURCE_PORT, useValue: makeIdSource('gen') },
    { provide: tokens.SESSION_STORE_PORT, useValue: port },
    { provide: tokens.IMAGE_CODEC_PORT, useValue: makeFakeCodec() },
    { provide: tokens.ALERT_PORT, useValue: alert },
    { provide: tokens.CONFIRM_PORT, useValue: makeConfirmPort(true) },
    { provide: tokens.CLIPBOARD_PORT, useValue: makeClipboardPort() },
    { provide: tokens.SAVE_PORT, useValue: makeSavePort() },
    { provide: LlmService, useValue: llm },
    { provide: ImageStudioStore, useClass: ImageStudioStore },
  ];
  const injector = Injector.create({ providers });
  const store: any = injector.get(ImageStudioStore);
  /** A second page load over the same storage: a fresh store, as after a reload. */
  const reload = () => Injector.create({ providers: [...providers.slice(0, -1), { provide: ImageStudioStore, useClass: ImageStudioStore }] }).get(ImageStudioStore) as any;
  return { store, injector, clock, scheduler, port, alert, llm, reload, ImageStudioStore };
}

const aged = (id: string, ageMs: number, extra: Parameters<typeof makeSession>[1] = {}) =>
  makeSession(id, { createdAt: 100 * DAY - ageMs, lastActivity: 100 * DAY - ageMs, ...extra });

/** A pending generate call the test releases by hand; records the request and signal like LlmService does. */
function gate(llm: { generateImage: ReturnType<typeof vi.fn> }) {
  const d = deferred<ImageHttpResult>();
  llm.generateImage.mockImplementationOnce(() => d.promise);
  return d;
}

describe('Store: a running generation (FR-21, FR-74, SD-37; AC-11, AC-46)', () => {
  it('AC-11 / FR-21: while a call runs the status region shows T-16, the input and Send are locked and the model switch is inactive', async () => {
    const { store, llm } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    const g = gate(llm);
    store.setDraft({ text: 'make it blue' });

    const sending = store.send();
    await flush();

    expect(store.generating()).toBe(true);
    expect(store.statusMessage()).toBe('Generating…');
    expect(store.inputEnabled()).toBe(false);
    expect(store.canSend()).toBe(false);
    expect(store.modelSwitchLocked()).toBe(true);
    g.resolve(okBody(imagesResponse()));
    await sending;
  });

  it('FR-74 / AC-46: a success ends with T-17 carrying the new version number, then the input is enabled again', async () => {
    const { store, llm } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse()));
    store.setDraft({ text: 'make it blue' });

    await store.send();

    expect(store.statusMessage()).toBe('Version v2 is ready');
    expect(store.generating()).toBe(false);
    expect(store.inputEnabled()).toBe(true);
    expect(store.draft().text).toBe('');
    expect(store.message()).toBeNull();
  });

  it('FR-77 / FR-74: the announcements are resolved in the language at the moment they are made', async () => {
    const { store, llm } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    store.setLanguage('uk');
    const g = gate(llm);
    store.setDraft({ text: 'x' });

    const sending = store.send();
    await flush();
    expect(store.statusMessage()).toBe('Генерую…');
    g.resolve(okBody(imagesResponse()));
    await sending;

    expect(store.statusMessage()).toBe('Версію v2 готово');
  });

  it('FR-74 / SD-36: an end without a version clears the status region (it never shows T-17) and the end is conveyed by the alert region', async () => {
    const { store, llm } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    llm.generateImage.mockResolvedValueOnce(failure(503));
    store.setDraft({ text: 'x' });

    await store.send();

    expect(store.statusMessage()).toBe('');
    expect(store.message()).toMatchObject({ textId: 'T-7', region: 'alert' });
  });

  it('FR-21 / D-4: Cancel, the version strip data, the session list and New session stay available while a call runs (reads and selectSession work)', async () => {
    const { store, llm } = await setup({ seed: [aged('a', 1_000, { pairs: 2 }), aged('b', 2_000)] });
    await store.init();
    const g = gate(llm);
    store.setDraft({ text: 'x' });
    const sending = store.send();
    await flush();

    expect(store.versions().map((v: any) => v.number)).toEqual([1, 2]);
    expect(store.sessions()).toHaveLength(2);
    await store.selectSession('b');
    expect(store.currentSessionId()).toBe('b');
    g.resolve(okBody(imagesResponse()));
    await sending;
  });
});

describe('Store: the response belongs to the session that sent it (SD-22; AC-11, AC-27)', () => {
  it('SD-22: selecting another session mid-call neither aborts nor orphans the call - the result is applied to the sender, the current session is untouched', async () => {
    const { store, llm, port } = await setup({ seed: [aged('a', 1_000, { pairs: 1 }), aged('b', 2_000, { costUsd: 0.5 })] });
    await store.init();
    const g = gate(llm);
    store.setDraft({ text: 'make it blue' });
    const sending = store.send();
    await flush();
    const signal: AbortSignal = llm.generateImage.mock.calls[0][1];

    await store.selectSession('b');
    expect(signal.aborted).toBe(false);
    g.resolve(okBody(imagesResponse({ costUsd: 0.03 })));
    await sending;

    expect(store.currentSessionId()).toBe('b');
    expect(store.costUsd()).toBeCloseTo(0.5, 10);
    const sender = (await port.loadSession('a'))!;
    expect(sender.meta.versions.map((v: any) => v.number)).toEqual([1, 2]);
    expect(sender.meta.costUsd).toBeCloseTo(0.03, 10);
    expect(sender.turns).toHaveLength(4);
  });

  it('FR-21 / DD-14: the generation lives in the root store, not in a consumer - a second reference to the store sees the same in-flight call and its result', async () => {
    const { store, llm, injector, ImageStudioStore } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    const g = gate(llm);
    store.setDraft({ text: 'x' });
    const sending = store.send();
    await flush();

    // the "component" that started it is gone; only the root injector remains
    const again: any = injector.get(ImageStudioStore);
    expect(again).toBe(store);
    expect(again.generating()).toBe(true);
    g.resolve(okBody(imagesResponse()));
    await sending;

    expect(again.versions().map((v: any) => v.number)).toEqual([1, 2]);
  });

  it('SD-22: if the sending session is gone when the response arrives it is discarded - no cost, no history, no alert region message', async () => {
    const { store, llm, port } = await setup({ seed: [aged('a', 1_000, { pairs: 1 }), aged('b', 2_000)] });
    await store.init();
    const g = gate(llm);
    store.setDraft({ text: 'x' });
    const sending = store.send();
    await flush();
    await port.deleteSession('a');
    g.resolve(okBody(imagesResponse({ costUsd: 0.9 })));
    await sending;

    expect(store.generating()).toBe(false);
    expect(store.message()).toBeNull();
    expect((await port.loadSession('b'))?.meta.costUsd).toBe(0);
    expect(port.snapshot().sessions['a']).toBeUndefined();
  });

  it('D-23(b) / FR-86: a session with a generation in flight is never the eviction victim, even with the oldest stamp', async () => {
    const seed = Array.from({ length: 20 }, (_, i) => aged(`s${String(i + 1).padStart(2, '0')}`, (i + 1) * 60_000 + 1_000_000));
    const { store, llm } = await setup({ seed });
    await store.init();
    await store.selectSession('s20'); // oldest stamp
    const g = gate(llm);
    store.setDraft({ text: 'x' });
    const sending = store.send();
    await flush();
    await store.selectSession('s01');

    await store.newSession();

    const ids = store.sessions().map((s: any) => s.id);
    expect(ids).toContain('s20');
    expect(ids).not.toContain('s19');
    g.resolve(okBody(imagesResponse()));
    await sending;
  });
});

describe('Store: Cancel and timeout (FR-21, FR-22, D-5; AC-11, AC-12)', () => {
  it('AC-11 / FR-21: Cancel aborts the call, restores the composer, shows T-18 in the alert region and writes nothing', async () => {
    const { store, llm, port } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    llm.generateImage.mockImplementationOnce((_r: unknown, signal: AbortSignal) => pendingUntilAbort(signal));
    store.setDraft({ text: 'a precious prompt' });
    const commitsBefore = port.commits;

    const sending = store.send();
    await flush();
    store.cancel();
    await sending;

    expect(llm.generateImage.mock.calls[0][1].aborted).toBe(true);
    expect(store.generating()).toBe(false);
    expect(store.draft().text).toBe('a precious prompt');
    expect(store.message()).toMatchObject({ textId: 'T-18', region: 'alert' });
    expect(store.statusMessage()).toBe('');
    expect(store.inputEnabled()).toBe(true);
    expect(store.versions().map((v: any) => v.number)).toEqual([1]);
    expect(port.commits).toBe(commitsBefore);
    expect(store.costUsd()).toBe(0);
  });

  it('AC-11: a Cancel is not a Retry candidate - the operator edits or sends again', async () => {
    const { store, llm } = await setup({ seed: [aged('a', 1_000)] });
    await store.init();
    llm.generateImage.mockImplementationOnce((_r: unknown, signal: AbortSignal) => pendingUntilAbort(signal));
    store.setDraft({ text: 'x' });
    const sending = store.send();
    await flush();
    store.cancel();
    await sending;

    expect(store.canRetry()).toBe(false);
    expect(store.canSend()).toBe(true);
  });

  it('FR-21: a response that arrives after Cancel is ignored', async () => {
    const { store, llm, port } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    const g = gate(llm);
    store.setDraft({ text: 'x' });
    const sending = store.send();
    await flush();
    store.cancel();
    await sending;
    const before = structuredClone(port.snapshot());

    g.resolve(okBody(imagesResponse({ costUsd: 0.7 })));
    await flush();

    expect(port.snapshot()).toEqual(before);
    expect(store.costUsd()).toBe(0);
  });

  it('AC-12 / FR-22: at 120 000 ms the call is aborted and T-6 is shown with Retry; the content returns to the composer', async () => {
    const { store, llm, scheduler } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    llm.generateImage.mockImplementationOnce((_r: unknown, signal: AbortSignal) => pendingUntilAbort(signal));
    store.setDraft({ text: 'slow one' });
    const sending = store.send();
    await flush();
    scheduler.advance(119_999);
    expect(store.generating()).toBe(true);
    scheduler.advance(1);
    await sending;

    expect(llm.generateImage.mock.calls[0][1].aborted).toBe(true);
    expect(store.message()).toMatchObject({ textId: 'T-6', region: 'alert' });
    expect(store.canRetry()).toBe(true);
    expect(store.draft().text).toBe('slow one');
  });
});

describe('Store: failed turns and Retry (FR-36, FR-64, SD-18, FR-85; AC-12, AC-40)', () => {
  it('AC-40 / FR-64: a failed turn adds nothing to the history, exposes Retry and keeps the content in the composer', async () => {
    const { store, llm, port } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    const before = structuredClone(port.snapshot().sessions['a']);
    llm.generateImage.mockResolvedValueOnce(failure(502));
    store.setDraft({ text: 'again please' });

    await store.send();

    expect(port.snapshot().sessions['a']).toEqual(before);
    expect(store.canRetry()).toBe(true);
    expect(store.draft().text).toBe('again please');
    expect(store.message()).toMatchObject({ textId: 'T-7' });
  });

  it('FR-36 / FR-85: Retry re-sends the SAME turn as a new request; on success the history gains the turn and the error clears', async () => {
    const { store, llm } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    llm.generateImage.mockResolvedValueOnce(failure(503)).mockResolvedValueOnce(okBody(imagesResponse()));
    store.setDraft({ text: 'same words', aspectRatio: '4:5', resolution: '2K', presetId: 'social' });

    await store.send();
    await store.retry();

    expect(llm.generateImage).toHaveBeenCalledTimes(2);
    const [first, second] = llm.generateImage.mock.calls.map((c: unknown[]) => c[0]);
    expect(second).toEqual(first);
    expect(first).toMatchObject({ aspectRatio: '4:5', resolution: '2K', presetId: 'social' });
    expect(store.message()).toBeNull();
    expect(store.canRetry()).toBe(false);
    expect(store.versions().map((v: any) => v.number)).toEqual([1, 2]);
  });

  it('SD-18: Retry is offered only while the composer still holds exactly that turn - any edit makes it a new turn', async () => {
    const { store, llm } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    llm.generateImage.mockResolvedValueOnce(failure(503));
    store.setDraft({ text: 'original words' });
    await store.send();
    expect(store.canRetry()).toBe(true);

    store.setDraft({ text: 'original words, edited' });

    expect(store.canRetry()).toBe(false);
  });

  it('FR-85: a transport failure (status 0) makes exactly one generate call from the store and shows T-7 with Retry', async () => {
    const { store, llm } = await setup({ seed: [aged('a', 1_000)] });
    await store.init();
    llm.generateImage.mockResolvedValueOnce(failure(0));
    store.setDraft({ text: 'x' });

    await store.send();

    expect(llm.generateImage).toHaveBeenCalledTimes(1);
    expect(store.message()).toMatchObject({ textId: 'T-7' });
    expect(store.canRetry()).toBe(true);
  });

  it('FR-24 / D-6: a 200 listing a protected turn is an invalid response - a failed turn with T-12, nothing applied, nothing paid for the session total', async () => {
    const { store, llm, port } = await setup({ seed: [aged('a', 1_000, { pairs: 2, costUsd: 0.06 })] });
    await store.init();
    const before = structuredClone(port.snapshot().sessions['a']);
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ trimmedTurnIds: ['u1'] })));
    store.setDraft({ text: 'x' });

    await store.send();

    expect(port.snapshot().sessions['a']).toEqual(before);
    expect(store.message()).toMatchObject({ textId: 'T-12' });
    expect(store.costUsd()).toBeCloseTo(0.06, 10);
  });

  it('D-4 / FR-50: while Retry is still offered the model switch is inactive and no session is created', async () => {
    const { store, llm, port } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    llm.generateImage.mockResolvedValueOnce(failure(503));
    store.setDraft({ text: 'x' });
    await store.send();

    expect(store.canRetry()).toBe(true);
    expect(store.modelSwitchLocked()).toBe(true);
    expect(await store.switchModel(PRO)).toBe(false);
    expect(Object.keys(port.snapshot().sessions)).toEqual(['a']);
  });
});

describe('Store: the blocked state (FR-46, FR-47, SD-37, D-12; AC-29 client half)', () => {
  async function blockedSetup() {
    const ctx = await setup({ seed: [aged('a', 1_000, { pairs: 2, costUsd: 0.06 })] });
    await ctx.store.init();
    ctx.llm.generateImage.mockResolvedValueOnce(failure(413, 'PROTECTED_HISTORY_EXCEEDS_LIMIT'));
    ctx.store.setDraft({ text: 'one more tweak' });
    await ctx.store.send();
    return ctx;
  }

  it('FR-47: a 413 PROTECTED_HISTORY_EXCEEDS_LIMIT shows T-14 in the alert region with no Retry and changes nothing stored', async () => {
    const { store, port } = await blockedSetup();

    expect(store.blocked()).toBe(true);
    expect(store.message()).toMatchObject({ textId: 'T-14', region: 'alert' });
    expect(store.canRetry()).toBe(false);
    expect(port.snapshot().sessions['a'].turns).toHaveLength(4);
  });

  it('SD-37 / FR-47: only Send is disabled - the composer input stays enabled and the rejected text stays in it', async () => {
    const { store } = await blockedSetup();

    expect(store.canSend()).toBe(false);
    expect(store.inputEnabled()).toBe(true);
    expect(store.draft().text).toBe('one more tweak');
  });

  it('FR-47: viewing and New session stay available in the blocked state', async () => {
    const { store } = await blockedSetup();
    expect(store.versions().map((v: any) => v.number)).toEqual([1, 2]);
    expect(await store.newSession()).toBe(true);
  });

  it('FR-47 / FR-37: "Edit this version" in the blocked state creates a NEW session seeded with the chosen version, offered on every retained version', async () => {
    for (const n of [1, 2]) {
      const { store, port } = await blockedSetup();

      await store.editVersion(n);

      expect(store.sessions()).toHaveLength(2);
      expect(store.currentSessionId()).not.toBe('a');
      expect(store.blocked()).toBe(false);
      expect(store.draft().attachedVersion).toMatchObject({ fromVersion: n, mimeType: 'image/png' });
      expect(store.versions()).toEqual([]);
      expect(port.snapshot().sessions['a'].turns).toHaveLength(4); // the old session keeps its history
    }
  });

  it('FR-47: the exit is not subject to the composer guard - it works although the old composer still holds the rejected text', async () => {
    const { store } = await blockedSetup();
    expect(store.draft().text).toBe('one more tweak');
    await store.editVersion(2);
    expect(store.currentSessionId()).not.toBe('a');
  });

  it('D-12: the blocked state is stateless - after a reload it is gone and only the next send re-creates it', async () => {
    const { store, reload, llm } = await blockedSetup();
    expect(store.blocked()).toBe(true);

    const fresh = reload();
    await fresh.init();
    expect(fresh.blocked()).toBe(false);
    expect(fresh.canSend()).toBe(false); // empty composer: nothing to send yet
    llm.generateImage.mockResolvedValueOnce(failure(413, 'PROTECTED_HISTORY_EXCEEDS_LIMIT'));
    fresh.setDraft({ text: 'try again' });
    await fresh.send();
    expect(fresh.blocked()).toBe(true);
  });

  it('FR-61: a 413 WITHOUT that code (the generic REQUEST_BODY_TOO_LARGE) is not the blocked state', async () => {
    const { store, llm } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    llm.generateImage.mockResolvedValueOnce(failure(413, 'REQUEST_BODY_TOO_LARGE'));
    store.setDraft({ text: 'x' });
    await store.send();

    expect(store.blocked()).toBe(false);
    expect(store.message()).toMatchObject({ textId: 'T-8' });
    expect(store.canRetry()).toBe(false);
  });
});

describe('Store: "Edit this version" in the normal state (FR-37, FR-10; AC-22)', () => {
  it('AC-22 / FR-37: attaches the version inline to the draft of the SAME session - no new session', async () => {
    const { store, port } = await setup({ seed: [aged('a', 1_000, { pairs: 2 })] });
    await store.init();

    await store.editVersion(1);

    expect(store.sessions()).toHaveLength(1);
    expect(store.currentSessionId()).toBe('a');
    expect(store.draft().attachedVersion).toMatchObject({ fromVersion: 1, mimeType: 'image/png' });
    expect(Object.keys(port.snapshot().sessions)).toEqual(['a']);
  });

  it('FR-37 (D-9): at most one version is attached at a time - a second "Edit this version" replaces the first', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000, { pairs: 2 })] });
    await store.init();
    await store.editVersion(1);
    await store.editVersion(2);
    expect(store.draft().attachedVersion).toMatchObject({ fromVersion: 2 });
  });

  it('FR-37 / FR-10: the attached version is sent inline and is not an upload - the request holds it as inline data next to the five uploads', async () => {
    const { store, llm } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse()));
    await store.editVersion(1);
    store.setDraft({ text: 'new background' });

    await store.send();

    const parts = llm.generateImage.mock.calls[0][0].newTurn.parts;
    expect(parts.filter((p: any) => p.inlineData)).toHaveLength(1);
    expect(parts.some((p: any) => p.fileData)).toBe(false);
  });

  it('FR-37 (D-34): "Edit this version" with no text is a valid message', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    await store.editVersion(1);
    expect(store.draft().text).toBe('');
    expect(store.canSend()).toBe(true);
  });

  it('FR-18 (D-34): Send is disabled for an empty composer and for whitespace-only text', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    expect(store.canSend()).toBe(false);
    store.setDraft({ text: '  \n ' });
    expect(store.canSend()).toBe(false);
    store.setDraft({ text: 'a real prompt' });
    expect(store.canSend()).toBe(true);
  });
});

describe('Store: non-history replies and the trim notice (FR-36, FR-45, FR-62, FR-63; AC-24, AC-38, AC-39)', () => {
  it('FR-63 / AC-39: a text-only reply is a non-history event with Retry, creates no version and writes no usage-affecting state', async () => {
    const { store, llm, port } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    const before = structuredClone(port.snapshot().sessions['a']);
    llm.generateImage.mockResolvedValueOnce(okBody(textResponse('I cannot draw that.')));
    store.setDraft({ text: 'draw it' });

    await store.send();

    expect(store.events()).toEqual([expect.objectContaining({ kind: 'text', text: 'I cannot draw that.', sessionId: 'a' })]);
    expect(store.canRetry()).toBe(true);
    expect(store.versions().map((v: any) => v.number)).toEqual([1]);
    expect(port.snapshot().sessions['a']).toEqual(before);
    expect(store.costUsd()).toBe(0);
  });

  it('FR-62 / AC-38: a safety reply shows T-4 in the alert region, is a non-history event with Retry, and leaves the history intact', async () => {
    const { store, llm, port } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    const before = structuredClone(port.snapshot().sessions['a']);
    llm.generateImage.mockResolvedValueOnce(okBody(safetyResponse('IMAGE_SAFETY')));
    store.setDraft({ text: 'something risky' });

    await store.send();

    expect(store.message()).toMatchObject({ textId: 'T-4', region: 'alert' });
    expect(store.events()).toEqual([expect.objectContaining({ kind: 'safety', sessionId: 'a' })]);
    expect(store.canRetry()).toBe(true);
    expect(port.snapshot().sessions['a']).toEqual(before);
  });

  it('D-5 / FR-36: non-history events are NOT stored - after a reload only the accepted turns are shown', async () => {
    const { store, llm, reload } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    llm.generateImage.mockResolvedValueOnce(okBody(textResponse('words only')));
    store.setDraft({ text: 'x' });
    await store.send();
    expect(store.events()).toHaveLength(1);

    const fresh = reload();
    await fresh.init();

    expect(fresh.events()).toEqual([]);
  });

  it('D-6 / FR-45: a text reply that lists turns still applies the cut and shows T-9 with the V, M, I counts', async () => {
    const { store, llm, port } = await setup({ seed: [aged('a', 1_000, { pairs: 3 })] });
    await store.init();
    llm.generateImage.mockResolvedValueOnce(okBody(textResponse('no image this time', ['m1', 'u2'])));
    store.setDraft({ text: 'x' });

    await store.send();

    expect(port.snapshot().sessions['a'].meta.turnOrder).toEqual(['u1', 'm2', 'u3', 'm3']);
    expect(store.message()).toMatchObject({ textId: 'T-9', params: { V: 1, M: 2, I: 0 }, region: 'alert' });
    expect(store.versions().map((v: any) => v.number)).toEqual([2, 3]);
  });

  it('FR-45 / AC-24 / AC-29: an images response that lists turns appends the new version, deletes the listed turns and shows ONE T-9 notice', async () => {
    const { store, llm, port } = await setup({ seed: [aged('a', 1_000, { pairs: 3 })] });
    await store.init();
    const commitsBefore = port.commits;
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ trimmedTurnIds: ['m1', 'u2'] })));
    store.setDraft({ text: 'x' });

    await store.send();

    expect(port.commits - commitsBefore).toBe(1);
    expect(store.versions().map((v: any) => v.number)).toEqual([2, 3, 4]);
    expect(store.message()).toMatchObject({ textId: 'T-9', params: { V: 1, M: 2, I: 0 } });
    expect(store.statusMessage()).toBe('Version v4 is ready');
  });

  it('FR-45: no notice when nothing was cut', async () => {
    const { store, llm } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse()));
    store.setDraft({ text: 'x' });
    await store.send();
    expect(store.message()).toBeNull();
  });

  it('FR-36 / D-5: the next action clears the previous message and event notice state of the pending error (a new send starts clean)', async () => {
    const { store, llm } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    llm.generateImage.mockResolvedValueOnce(failure(503)).mockResolvedValueOnce(okBody(imagesResponse()));
    store.setDraft({ text: 'x' });
    await store.send();
    expect(store.message()).not.toBeNull();

    store.setDraft({ text: 'a different prompt' });
    await store.send();

    expect(store.message()).toBeNull();
  });
});

describe('Store: per-session drafts live in memory (P-4, FR-50)', () => {
  it('P-4: each session has its own composer draft; switching sessions keeps both', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000), aged('b', 2_000)] });
    await store.init();
    store.setDraft({ text: 'text for a', aspectRatio: '16:9' });

    await store.selectSession('b');
    expect(store.draft().text).toBe('');
    expect(store.draft().aspectRatio).toBe('1:1');
    store.setDraft({ text: 'text for b' });
    await store.selectSession('a');

    expect(store.draft().text).toBe('text for a');
    expect(store.draft().aspectRatio).toBe('16:9');
  });

  it('P-4: drafts are not persisted - a reload starts with an empty composer', async () => {
    const { store, reload } = await setup({ seed: [aged('a', 1_000)] });
    await store.init();
    store.setDraft({ text: 'unsent' });
    const fresh = reload();
    await fresh.init();
    expect(fresh.draft().text).toBe('');
  });
});

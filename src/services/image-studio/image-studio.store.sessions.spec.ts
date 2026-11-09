/**
 * image-studio.store.sessions.spec.ts - US-10.1, task T39 (FR-16, FR-33, FR-44, FR-48, FR-49, FR-50, FR-71, FR-81, FR-86, D-23..D-28,
 * SD-17, SD-19, SD-22, SD-32..34, SD-41, OD-37, NFR-14; AC-19 client half, AC-25, AC-26, AC-27, AC-44 client half).
 *
 * Runner: test:logic. Service pattern of src/services/content-orchestrator.ua-doc-pipeline.spec.ts: `import '@angular/compiler'`
 * first, then `Injector.create` with the DI tokens (CONTRACT.md) bound to the in-memory fakes of test/image-studio/helpers/fakes.ts.
 * LlmService is the network boundary and is replaced by a stub; the store, the real runner, request-builder, apply-response,
 * session-lifecycle, error-dispatch and studio-texts are NOT mocked (observable store behaviour only).
 * src/services/image-studio/image-studio.store.ts does not exist yet: loaded at run time per test.
 *
 * PINNED STORE API (root `@Injectable`, signals only). T40's spec (image-studio.store.generation.spec.ts) pins the generation part.
 *   Lifecycle   init(): Promise<void>         loadAndExpire(clock.now()); invalid stored records are ignored (not listed, not deleted);
 *                                              selects the session with the newest lastActivity; when NOTHING is stored it creates one
 *                                              empty session (so currentSessionId() is never null after init).
 *               refreshSessions(): Promise<void>   a later load of the list (expiry applies again, SD-33)
 *               setLanguage(lang: 'en' | 'uk'): void        default 'en'
 *               selectSession(id: string): Promise<void>
 *   Reads       sessions(): SessionMeta[]      newest lastActivity first, ties by smaller id
 *               currentSessionId(): string | null;  currentSession(): StoredSession | null;  versions(): Version[];  costUsd(): number
 *               draft(): ComposerDraft         { text, productName, presetId: string | null, model, aspectRatio, resolution,
 *                                                attachments: Attachment[], attachedVersion: { mimeType, data, fromVersion } | null }
 *                                              defaults: model 'gemini-3.1-flash-image', aspectRatio '1:1', resolution '1K', text ''
 *               Attachment = { id, fileName, fileUri, mimeType, state: 'uploading' | 'ready' | 'failed' }
 *               modelSwitchLocked(): boolean
 *   Writes      setDraft(patch: Partial<ComposerDraft>): void
 *               attach(entries: Array<{ fileUri, mimeType, fileName, bytes: Uint8Array }>): Promise<void>
 *                    one user action: adds the entries as 'ready' attachments AND stores their sent bytes best effort (OD-37): a store
 *                    failure never rejects, never drops an attachment, and raises ONE alert for the whole call (D-28)
 *               newSession(): Promise<boolean>     ConfirmPort with T-23; false when declined or when the creation failed
 *               switchModel(modelId: string): Promise<boolean>   FR-50
 *               markDownloaded(versionNumbers: number[]): Promise<void>   called by delivery code ONLY after an SD-17 success signal
 *               send(): Promise<void>
 *   Alerts      the native alert is AlertPort.alert(studioText('T-20', lang)), at most once per failing user action (FR-81, D-28).
 *
 * NOT asserted: real IndexedDB atomicity (plan R1 / N-1: the fake is all-or-nothing by construction), the focus move after an alert
 * (component spec), and the cost LINE text X-10 (component spec).
 */
import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { Injector } from '@angular/core';
import { LlmService } from '../llm.service';
import {
  makeFakeClock, makeFakeScheduler, makeIdSource, makeInMemorySessionStore, makeAlertPort, makeConfirmPort, makeClipboardPort,
  makeSavePort, makeFakeCodec, makeSession, makeRaster, toBase64, type StoredSession,
} from '../../../test/image-studio/helpers/fakes';
import { imagesResponse, okBody, failure, flush, PNG_B64, PRO } from '../../../test/image-studio/helpers/core-fixtures';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const DAY = 86_400_000;
const T20_EN = 'Could not save to browser storage: the storage quota is exceeded. Free up browser storage and try again.';
const T20_UK = 'Не вдалося зберегти у сховищі браузера: перевищено квоту. Звільніть місце у сховищі браузера та спробуйте ще раз.';
const T23_EN = 'Start a new session? The current session stays in the session list.';

async function setup(opts: { seed?: StoredSession[]; confirm?: boolean } = {}) {
  const tokens = await load('./image-studio.tokens');
  const { ImageStudioStore } = await load('./image-studio.store');
  const { StorageQuotaError } = await load('../../utils/image-studio/ports');
  const clock = makeFakeClock(100 * DAY);
  const scheduler = makeFakeScheduler(clock);
  const ids = makeIdSource('gen');
  const port = makeInMemorySessionStore();
  const alert = makeAlertPort();
  const confirm = makeConfirmPort(opts.confirm ?? true);
  const llm = { generateImage: vi.fn(), uploadImageFile: vi.fn() };
  for (const s of opts.seed ?? []) port.seed(s);
  const injector = Injector.create({
    providers: [
      { provide: tokens.CLOCK_PORT, useValue: clock },
      { provide: tokens.SCHEDULER_PORT, useValue: scheduler },
      { provide: tokens.ID_SOURCE_PORT, useValue: ids },
      { provide: tokens.SESSION_STORE_PORT, useValue: port },
      { provide: tokens.IMAGE_CODEC_PORT, useValue: makeFakeCodec() },
      { provide: tokens.ALERT_PORT, useValue: alert },
      { provide: tokens.CONFIRM_PORT, useValue: confirm },
      { provide: tokens.CLIPBOARD_PORT, useValue: makeClipboardPort() },
      { provide: tokens.SAVE_PORT, useValue: makeSavePort() },
      { provide: LlmService, useValue: llm },
      { provide: ImageStudioStore, useClass: ImageStudioStore },
    ],
  });
  const store: any = injector.get(ImageStudioStore);
  const quota = () => new StorageQuotaError();
  return { store, clock, ids, port, alert, confirm, llm, quota };
}

/** Session `id` whose last activity was `ageMs` before the fake clock's start (100 days). */
const aged = (id: string, ageMs: number, extra: Parameters<typeof makeSession>[1] = {}) => {
  const now = 100 * DAY;
  return makeSession(id, { createdAt: now - ageMs, lastActivity: now - ageMs, ...extra });
};

/** `n` sessions: creation order s1..sn ascending, last-activity order DIFFERENT (descending), all younger than a day. */
function fullStore(n = 20): StoredSession[] {
  return Array.from({ length: n }, (_, i) => aged(`s${String(i + 1).padStart(2, '0')}`, (i + 1) * 60_000 + 1_000_000)) // s01 newest activity ... s20 oldest
    .map((s, i) => ({ ...s, meta: { ...s.meta, createdAt: 1_000 + i } }));
}

describe('Store: load, expiry and selection (FR-48, SD-33, P-9; AC-25)', () => {
  it('AC-25 / FR-48: init lists stored sessions newest activity first and selects the newest', async () => {
    const { store } = await setup({ seed: [aged('old', 3 * DAY), aged('new', 1 * DAY), aged('mid', 2 * DAY)] });
    await store.init();
    expect(store.sessions().map((s: any) => s.id)).toEqual(['new', 'mid', 'old']);
    expect(store.currentSessionId()).toBe('new');
  });

  it.each([
    [604_799_999, true],
    [604_800_000, true],
    [604_800_001, false],
  ])('FR-48 / SD-33: a session %i ms past its last activity is kept=%s (strictly more than 7 x 24 h expires)', async (age, kept) => {
    const { store, port } = await setup({ seed: [aged('edge', age), aged('fresh', 1_000)] });
    await store.init();
    expect(store.sessions().map((s: any) => s.id).includes('edge')).toBe(kept);
    expect(Object.keys(port.snapshot().sessions).includes('edge')).toBe(kept);
  });

  it('FR-48: an expired session is deleted with its whole record, sent bytes included', async () => {
    const stale = aged('stale', 8 * DAY, { pairs: 1 });
    const { store, port } = await setup({ seed: [stale, aged('fresh', 1_000)] });
    port.seed(stale, { 'files/a': { bytes: new Uint8Array([1, 2, 3]), mimeType: 'image/png' } });
    await store.init();
    expect(port.snapshot().sentBytes['stale']).toBeUndefined();
  });

  it('FR-48 / SD-33: expiry runs on each later load of the list, not on a timer - a session ages out at refreshSessions()', async () => {
    const { store, clock } = await setup({ seed: [aged('a', 6 * DAY), aged('b', 1_000)] });
    await store.init();
    expect(store.sessions()).toHaveLength(2);

    clock.advance(2 * DAY);
    expect(store.sessions()).toHaveLength(2); // nothing runs by itself
    await store.refreshSessions();

    expect(store.sessions().map((s: any) => s.id)).toEqual(['b']);
  });

  it('P-9 / FR-71: a stored record that fails its schema is ignored - not listed, not counted, and NOT deleted', async () => {
    const bad = aged('bad', 1_000);
    (bad.meta as any).schemaVersion = 2; // an unknown future version is treated like a corrupt record
    const broken = aged('broken', 1_000);
    delete (broken.meta as any).turnOrder;
    const { store, port } = await setup({ seed: [aged('good', 2_000), bad, broken] });

    await store.init();

    expect(store.sessions().map((s: any) => s.id)).toEqual(['good']);
    expect(Object.keys(port.snapshot().sessions).sort()).toEqual(['bad', 'broken', 'good']);
  });

  it('FR-49: with nothing stored init creates one empty session so there is always a current session', async () => {
    const { store, port } = await setup();
    await store.init();
    expect(store.sessions()).toHaveLength(1);
    expect(store.currentSessionId()).toBe(store.sessions()[0].id);
    expect(Object.keys(port.snapshot().sessions)).toHaveLength(1);
    expect(store.versions()).toEqual([]);
  });

  it('FR-49: selectSession makes another stored session current without changing any stored data', async () => {
    const { store, port } = await setup({ seed: [aged('a', 1_000, { pairs: 1 }), aged('b', 2_000, { pairs: 2 })] });
    await store.init();
    const before = structuredClone(port.snapshot());

    await store.selectSession('b');

    expect(store.currentSessionId()).toBe('b');
    expect(store.versions().map((v: any) => v.number)).toEqual([1, 2]);
    expect(port.snapshot()).toEqual(before); // viewing is not activity (SD-32)
  });

  it('FR-71: each session has its own cost total and nothing is carried into another session', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000, { costUsd: 0.09 }), aged('b', 2_000, { costUsd: 0.5 })] });
    await store.init();
    expect(store.costUsd()).toBeCloseTo(0.09, 10);
    await store.selectSession('b');
    expect(store.costUsd()).toBeCloseTo(0.5, 10);
  });
});

describe('Store: New session and the cap of 20 (FR-49, FR-86, D-23..D-26, SD-41; AC-26)', () => {
  it('AC-26 / FR-49: New session asks T-23 once; accepting creates an empty current session and the previous one stays listed with its own data', async () => {
    const { store, confirm } = await setup({ seed: [aged('a', 1_000, { pairs: 2, costUsd: 0.06 })] });
    await store.init();

    const created = await store.newSession();

    expect(created).toBe(true);
    expect(confirm.asked).toEqual([T23_EN]);
    expect(store.sessions()).toHaveLength(2);
    expect(store.currentSessionId()).not.toBe('a');
    expect(store.versions()).toEqual([]);
    expect(store.costUsd()).toBe(0);
    await store.selectSession('a');
    expect(store.versions().map((v: any) => v.number)).toEqual([1, 2]);
    expect(store.costUsd()).toBeCloseTo(0.06, 10);
  });

  it('FR-49: the confirmation text follows the UI language at the moment it is asked', async () => {
    const { store, confirm } = await setup({ seed: [aged('a', 1_000)] });
    await store.init();
    store.setLanguage('uk');
    await store.newSession();
    expect(confirm.asked).toEqual(['Почати нову сесію? Поточна сесія залишиться у списку сесій.']);
  });

  it('AC-26 / FR-49: declining the confirmation changes nothing and creates nothing', async () => {
    const { store, port } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })], confirm: false });
    await store.init();
    const before = structuredClone(port.snapshot());

    const created = await store.newSession();

    expect(created).toBe(false);
    expect(store.currentSessionId()).toBe('a');
    expect(port.snapshot()).toEqual(before);
  });

  it('D-26 / FR-49: New session creates a row even when the current session holds no turn', async () => {
    const { store } = await setup();
    await store.init();
    await store.newSession();
    await store.newSession();
    expect(store.sessions()).toHaveLength(3);
  });

  it('FR-49 / FR-86 (OD-16 C-16.5): leaving a session deletes none of its Files API files - the store has no delete path to the server', async () => {
    const { store, llm } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    await store.newSession();
    expect(Object.keys(llm).sort()).toEqual(['generateImage', 'uploadImageFile']);
    expect(llm.generateImage).not.toHaveBeenCalled();
    expect(llm.uploadImageFile).not.toHaveBeenCalled();
  });

  it('AC-26 / FR-86: creating the 21st session deletes the session with the oldest LAST ACTIVITY (not the oldest created); 20 remain; nothing else happens', async () => {
    const { store, port, alert, confirm } = await setup({ seed: fullStore(20) });
    await store.init();
    expect(store.sessions()).toHaveLength(20);
    expect(store.currentSessionId()).toBe('s01'); // newest activity
    const oldestActivity = 's20';
    const oldestCreated = 's01';

    await store.newSession();

    const ids = store.sessions().map((s: any) => s.id);
    expect(ids).toHaveLength(20);
    expect(ids).not.toContain(oldestActivity);
    expect(ids).toContain(oldestCreated);
    expect(Object.keys(port.snapshot().sessions)).toHaveLength(20);
    expect(alert.messages).toEqual([]); // silent (C-36.1)
    expect(confirm.asked).toHaveLength(1); // only the T-23 confirmation
  });

  it('FR-86: with fewer than 20 stored sessions nothing is deleted', async () => {
    const { store, port } = await setup({ seed: fullStore(19) });
    await store.init();
    await store.newSession();
    expect(Object.keys(port.snapshot().sessions)).toHaveLength(20);
    expect(store.sessions()).toHaveLength(20);
  });

  it('FR-86 / SD-32: a session renewed by a committed write is not the one deleted - the next-oldest stamp goes instead', async () => {
    const seed = fullStore(20);
    seed[19] = aged('s20', 21 * 60_000 + 1_000_000, { pairs: 1 }); // oldest stamp, holds one version
    const { store, clock } = await setup({ seed });
    await store.init();
    await store.selectSession('s20');
    clock.advance(1_000);
    await store.markDownloaded([1]); // a committed write renews the stamp
    await store.selectSession('s01');

    await store.newSession();

    const ids = store.sessions().map((s: any) => s.id);
    expect(ids).toContain('s20');
    expect(ids).not.toContain('s19');
    expect(ids).toHaveLength(20);
  });

  it('D-23 / FR-86: the session the operator is leaving is never evicted even when it holds the oldest stamp', async () => {
    const { store } = await setup({ seed: fullStore(20) });
    await store.init();
    await store.selectSession('s20'); // the oldest stamp, and the one being left

    await store.newSession();

    const ids = store.sessions().map((s: any) => s.id);
    expect(ids).toContain('s20');
    expect(ids).not.toContain('s19'); // the next-oldest stamp is the victim
    expect(ids).toHaveLength(20);
  });

  it('SD-41 / FR-86: with all stamps equal the session with the smaller id (UTF-16 order) is the victim', async () => {
    const equal = Array.from({ length: 20 }, (_, i) => aged(`e${String(i + 1).padStart(2, '0')}`, 5_000_000));
    const { store } = await setup({ seed: equal });
    await store.init();
    await store.selectSession('e20');

    await store.newSession();

    const ids = store.sessions().map((s: any) => s.id);
    expect(ids).not.toContain('e01');
    expect(ids).toContain('e02');
  });

  it('D-24 / FR-81 / FR-86: a creation whose write fails (quota) creates nothing, deletes nothing, leaves the current session, and raises ONE alert (T-20)', async () => {
    const { store, port, alert, quota } = await setup({ seed: fullStore(20) });
    await store.init();
    const before = structuredClone(port.snapshot());
    port.failWrites(quota());

    const created = await store.newSession();

    expect(created).toBe(false);
    expect(alert.messages).toEqual([T20_EN]);
    expect(port.snapshot()).toEqual(before);
    expect(store.currentSessionId()).toBe('s01');
    expect(store.sessions()).toHaveLength(20);
  });

  it('D-25 / FR-86: a stored count above 20 (left by two tabs) is healed by the next creation - 21 stored becomes 20', async () => {
    const { store, port } = await setup({ seed: fullStore(21) });
    await store.init();

    await store.newSession();

    expect(Object.keys(port.snapshot().sessions)).toHaveLength(20);
  });

  it('FR-86: the model-switch creation path evicts the same way and never the source session of the seed', async () => {
    const seed = fullStore(20);
    seed[19] = aged('s20', 99_000_000, { pairs: 1 }); // oldest stamp AND holds a version: the seed source
    const { store } = await setup({ seed });
    await store.init();
    await store.selectSession('s20');

    const switched = await store.switchModel(PRO);

    expect(switched).toBe(true);
    const ids = store.sessions().map((s: any) => s.id);
    expect(ids).toContain('s20');
    expect(ids).toHaveLength(20);
  });
});

describe('Store: model switch starts a new session (FR-50, SD-19, D-4; AC-27)', () => {
  it('SD-19: before the session holds a version, switching the model only sets the next message\'s model - no session is created', async () => {
    const { store, port } = await setup({ seed: [aged('a', 1_000)] });
    await store.init();

    const ok = await store.switchModel(PRO);

    expect(ok).toBe(true);
    expect(store.draft().model).toBe(PRO);
    expect(store.sessions()).toHaveLength(1);
    expect(Object.keys(port.snapshot().sessions)).toEqual(['a']);
  });

  it('AC-27 / FR-50: with a version, switching Flash <-> Pro creates a NEW session on the new model, numbering restarts, no history is carried', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000, { pairs: 2, costUsd: 0.06 })] });
    await store.init();

    const ok = await store.switchModel(PRO);

    expect(ok).toBe(true);
    expect(store.sessions()).toHaveLength(2);
    expect(store.currentSessionId()).not.toBe('a');
    expect(store.currentSession()?.meta.model).toBe(PRO);
    expect(store.draft().model).toBe(PRO);
    expect(store.versions()).toEqual([]);
    expect(store.currentSession()?.meta.nextVersionNumber).toBe(1);
    expect(store.costUsd()).toBe(0);
  });

  it('AC-27 / FR-50: the new session is seeded with the LATEST version as an attached image in its composer (a seed is not a version)', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000, { pairs: 3 })] });
    await store.init();

    await store.switchModel(PRO);

    const seed = store.draft().attachedVersion;
    expect(seed).toMatchObject({ mimeType: 'image/png', fromVersion: 3 });
    expect(seed.data).toBe(toBase64(makeRaster({ format: 'png', width: 8, height: 8 })));
    expect(store.versions()).toEqual([]);
  });

  it('FR-50: the source session keeps its history, versions and cost untouched', async () => {
    const { store, port } = await setup({ seed: [aged('a', 1_000, { pairs: 2, costUsd: 0.06 })] });
    await store.init();
    const before = structuredClone(port.snapshot().sessions['a']);

    await store.switchModel(PRO);

    expect(port.snapshot().sessions['a']).toEqual(before);
  });

  it('FR-50 / D-4: the model switch is inactive while the composer holds unsent text, new uploads, or an unsent attached version', async () => {
    const { store, port } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    expect(store.modelSwitchLocked()).toBe(false);

    store.setDraft({ text: 'a half typed prompt' });
    expect(store.modelSwitchLocked()).toBe(true);
    expect(await store.switchModel(PRO)).toBe(false);
    expect(store.sessions()).toHaveLength(1);

    store.setDraft({ text: '   ' }); // whitespace is not unsent content
    expect(store.modelSwitchLocked()).toBe(false);

    await store.attach([{ fileUri: 'files/a', mimeType: 'image/png', fileName: 'a.png', bytes: new Uint8Array([1]) }]);
    expect(store.modelSwitchLocked()).toBe(true);
    expect(await store.switchModel(PRO)).toBe(false);

    store.setDraft({ attachments: [], attachedVersion: { mimeType: 'image/png', data: PNG_B64, fromVersion: 1 } });
    expect(store.modelSwitchLocked()).toBe(true);
    expect(await store.switchModel(PRO)).toBe(false);
    expect(Object.keys(port.snapshot().sessions)).toEqual(['a']);
  });

  it('FR-50 / FR-81: a seeded creation whose write fails (quota) creates no session, deletes none, and alerts once', async () => {
    const { store, port, alert, quota } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    port.failWrites(quota());

    const ok = await store.switchModel(PRO);

    expect(ok).toBe(false);
    expect(alert.messages).toEqual([T20_EN]);
    expect(store.currentSessionId()).toBe('a');
    expect(Object.keys(port.snapshot().sessions)).toEqual(['a']);
  });

  it('FR-50 / D-24: at the cap the seed is still the latest version of the source session, and the source survives the eviction that made room', async () => {
    const seed = fullStore(20);
    seed[19] = aged('s20', 99_000_000, { pairs: 1 }); // oldest stamp, holds the version to seed from
    const { store } = await setup({ seed });
    await store.init();
    await store.selectSession('s20');

    await store.switchModel(PRO);

    expect(store.draft().attachedVersion).toMatchObject({ fromVersion: 1, mimeType: 'image/png' });
    expect(store.sessions().map((x: any) => x.id)).toContain('s20');
    expect(store.sessions()).toHaveLength(20);
  });
});

describe('Store: attaching and the best-effort sent-bytes store (FR-16, FR-81, D-28, OD-37)', () => {
  const entry = (n: number) => ({ fileUri: `files/f${n}`, mimeType: 'image/png', fileName: `f${n}.png`, bytes: makeRaster({ format: 'png', width: 10 + n, height: 10, size: 40 }) });

  it('FR-16: the sent bytes of each attachment are kept under (session id, file_uri)', async () => {
    const { store, port } = await setup({ seed: [aged('a', 1_000)] });
    await store.init();

    await store.attach([entry(1), entry(2)]);

    expect(port.snapshot().sentBytes['a'].sort()).toEqual(['files/f1', 'files/f2']);
    expect((await port.getSentBytes('a', 'files/f1'))?.bytes).toEqual(entry(1).bytes);
    expect(store.draft().attachments.map((x: any) => [x.fileUri, x.state])).toEqual([['files/f1', 'ready'], ['files/f2', 'ready']]);
  });

  it('OD-37 / FR-81 / D-28: a store failure while attaching five files gives exactly ONE alert; all five stay attached and ready', async () => {
    const { store, port, alert, quota } = await setup({ seed: [aged('a', 1_000)] });
    await store.init();
    port.failSentBytes(quota());

    await store.attach([1, 2, 3, 4, 5].map(entry));

    expect(alert.messages).toEqual([T20_EN]);
    expect(store.draft().attachments).toHaveLength(5);
    expect(store.draft().attachments.every((x: any) => x.state === 'ready')).toBe(true);
    expect(port.snapshot().sentBytes['a']).toBeUndefined();
  });

  it('FR-81: the alert text follows the UI language (uk)', async () => {
    const { store, port, alert, quota } = await setup({ seed: [aged('a', 1_000)] });
    await store.init();
    store.setLanguage('uk');
    port.failSentBytes(quota());

    await store.attach([entry(1)]);

    expect(alert.messages).toEqual([T20_UK]);
  });

  it('OD-37: with the sent-bytes store failing, the attachment is still sent normally - the generate request carries every file_uri', async () => {
    const { store, port, alert, llm, quota } = await setup({ seed: [aged('a', 1_000)] });
    await store.init();
    port.failSentBytes(quota());
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse()));
    await store.attach([entry(1), entry(2)]);
    store.setDraft({ text: 'put them on a desk' });

    await store.send();

    expect(llm.generateImage).toHaveBeenCalledTimes(1);
    const parts = llm.generateImage.mock.calls[0][0].newTurn.parts;
    expect(parts.filter((p: any) => p.fileData).map((p: any) => p.fileData.fileUri)).toEqual(['files/f1', 'files/f2']);
    expect(alert.messages).toHaveLength(1); // the attach alert only; sending raised none
    expect(store.versions()).toHaveLength(1);
  });

  it('D-28: a later commit failure at Send is a different user action and may alert again', async () => {
    const { store, port, alert, llm, quota } = await setup({ seed: [aged('a', 1_000)] });
    await store.init();
    port.failSentBytes(quota());
    await store.attach([entry(1)]);
    port.failSentBytes(null);
    port.failWrites(quota());
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse()));
    store.setDraft({ text: 'x' });

    await store.send();

    expect(alert.messages).toEqual([T20_EN, T20_EN]);
  });

  it('FR-14 / FR-15: removing an attachment leaves the others in place', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000)] });
    await store.init();
    await store.attach([entry(1), entry(2), entry(3)]);
    const middle = store.draft().attachments[1].id;

    // removeAttachment is the only draft mutator besides setDraft that components use for thumbnails
    (store as any).removeAttachment(middle);

    expect(store.draft().attachments.map((x: any) => x.fileUri)).toEqual(['files/f1', 'files/f3']);
  });
});

describe('Store: committing a response (FR-44, FR-71, FR-81, SD-22, SD-32, SD-34; AC-44 client half)', () => {
  it('FR-44: a successful send commits the user turn and the model turn in ONE write and updates in-memory state only after it', async () => {
    const { store, port, llm, clock, ids } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    const commitsBefore = port.commits;
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ costUsd: 0.03 })));
    store.setDraft({ text: 'make it blue' });

    await store.send();

    expect(port.commits - commitsBefore).toBe(1);
    const stored = port.snapshot().sessions['a'];
    expect(stored.turns).toHaveLength(4);
    expect(stored.turns[2]).toMatchObject({ role: 'user', parts: [{ text: 'make it blue' }] });
    expect(stored.turns[3].role).toBe('model');
    expect(ids.issued).toContain(stored.turns[3].id);
    expect(stored.meta.versions.map((v: any) => v.number)).toEqual([1, 2]);
    expect(stored.meta.lastActivity).toBe(clock.now());
    expect(store.versions().map((v: any) => v.number)).toEqual([1, 2]);
  });

  it('AC-44 / FR-71: the running cost is the sum of costUsd of the accepted responses and survives a reload', async () => {
    const { store, port, llm } = await setup({ seed: [aged('a', 1_000)] });
    await store.init();
    llm.generateImage
      .mockResolvedValueOnce(okBody(imagesResponse({ costUsd: 0.03 })))
      .mockResolvedValueOnce(okBody(imagesResponse({ costUsd: 0.06 })));
    store.setDraft({ text: 'one' });
    await store.send();
    store.setDraft({ text: 'two' });
    await store.send();

    expect(store.costUsd()).toBeCloseTo(0.09, 10);
    expect((await port.loadSession('a'))?.meta.costUsd).toBeCloseTo(0.09, 10);
  });

  it('FR-71: a failed turn adds nothing to the cost total and nothing to the history', async () => {
    const { store, port, llm } = await setup({ seed: [aged('a', 1_000, { pairs: 1, costUsd: 0.03 })] });
    await store.init();
    const before = structuredClone(port.snapshot().sessions['a']);
    llm.generateImage.mockResolvedValueOnce(failure(503));
    store.setDraft({ text: 'again' });

    await store.send();

    expect(store.costUsd()).toBeCloseTo(0.03, 10);
    expect(port.snapshot().sessions['a']).toEqual(before);
  });

  it('SD-34 / FR-44 / FR-81: a quota error on the commit leaves the session exactly as before, raises ONE alert (T-20), offers no Retry, and returns the content to the composer', async () => {
    const { store, port, llm, alert, quota } = await setup({ seed: [aged('a', 1_000, { pairs: 1, costUsd: 0.03 })] });
    await store.init();
    const before = structuredClone(port.snapshot().sessions['a']);
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse()));
    store.setDraft({ text: 'a long careful prompt' });
    port.failWrites(quota());

    await store.send();

    expect(port.snapshot().sessions['a']).toEqual(before);
    expect(alert.messages).toEqual([T20_EN]);
    expect(store.canRetry()).toBe(false);
    expect(store.draft().text).toBe('a long careful prompt');
    expect(store.versions().map((v: any) => v.number)).toEqual([1]);
    expect(store.costUsd()).toBeCloseTo(0.03, 10);
  });

  it('SD-22: a response for a session that was deleted meanwhile (another tab) is discarded - nothing appended, no cost, no alert', async () => {
    const { store, port, llm, alert } = await setup({ seed: [aged('a', 1_000, { pairs: 1 }), aged('b', 2_000)] });
    await store.init();
    let release!: (v: unknown) => void;
    llm.generateImage.mockReturnValueOnce(new Promise((r) => { release = r; }));
    store.setDraft({ text: 'x' });

    const sending = store.send();
    await flush();
    await port.deleteSession('a'); // the other tab evicts it
    release(okBody(imagesResponse({ costUsd: 0.5 })));
    await sending;

    expect(port.snapshot().sessions['a']).toBeUndefined();
    expect(alert.messages).toEqual([]);
    expect((await port.loadSession('b'))?.meta.costUsd).toBe(0);
  });
});

describe('Store: the downloaded flag (FR-33, SD-17, SD-32, FR-81; AC-19 client half)', () => {
  it('FR-33: a version starts with downloaded=false', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000, { pairs: 2 })] });
    await store.init();
    expect(store.versions().map((v: any) => v.downloaded)).toEqual([false, false]);
  });

  it('FR-33 / SD-17: markDownloaded([2]) flags only v2, persists it, and renews the last-activity stamp (SD-32)', async () => {
    const { store, port, clock } = await setup({ seed: [aged('a', 5_000, { pairs: 3 })] });
    await store.init();
    clock.advance(1_234);

    await store.markDownloaded([2]);

    expect(store.versions().map((v: any) => v.downloaded)).toEqual([false, true, false]);
    const stored = (await port.loadSession('a'))!;
    expect(stored.meta.versions.map((v: any) => v.downloaded)).toEqual([false, true, false]);
    expect(stored.meta.lastActivity).toBe(clock.now());
  });

  it('FR-33: a ZIP flags every version it holds in one call; the flag is per version and per device', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000, { pairs: 3 })] });
    await store.init();

    await store.markDownloaded([1, 2, 3]);

    expect(store.versions().every((v: any) => v.downloaded)).toBe(true);
  });

  it('FR-33: flagging an already-flagged version again keeps it flagged and changes no other version', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000, { pairs: 2 })] });
    await store.init();
    await store.markDownloaded([1]);
    await store.markDownloaded([1]);
    expect(store.versions().map((v: any) => v.downloaded)).toEqual([true, false]);
  });

  it('FR-81 / FR-33: a flag write that fails (quota) leaves the flag unset and raises ONE alert', async () => {
    const { store, port, alert, quota } = await setup({ seed: [aged('a', 1_000, { pairs: 2 })] });
    await store.init();
    port.failWrites(quota());

    await store.markDownloaded([1, 2]);

    expect(alert.messages).toEqual([T20_EN]);
    expect(store.versions().map((v: any) => v.downloaded)).toEqual([false, false]);
    expect(port.snapshot().sessions['a'].meta.versions.map((v: any) => v.downloaded)).toEqual([false, false]);
  });

  it('FR-33: the flag is deleted with its version when a cut removes it (versions of removed turns disappear with their flags)', async () => {
    const { store, llm } = await setup({ seed: [aged('a', 1_000, { pairs: 3 })] });
    await store.init();
    await store.markDownloaded([1]);
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse({ trimmedTurnIds: ['m1', 'u2'] })));
    store.setDraft({ text: 'x' });

    await store.send();

    expect(store.versions().map((v: any) => v.number)).toEqual([2, 3, 4]);
    expect(store.versions().some((v: any) => v.downloaded)).toBe(false);
  });
});


// =====================================================================================================================
// US-10.5 store additions, sessions side (Specification FR-5, FR-14, FR-19; plan DD-11). Sibling blocks, no case above changed.
// TOP-LEVEL describes whose titles end in their owner task id (`-t "\(T15\)"`, breakdown rule R2). Logic runner.
//
// PINNED STORE ADDITIONS:
//   applyPreset(preset: PromptPreset): void                                   [T15]  replaces the composer's private pickPreset: text with the
//        product name applied, aspect ratio, resolution, model ONLY while the session holds no version, and BOTH presetId and
//        checkedPresetId = preset.id; sends nothing
//   reusePrompt(input: { prompt: string; aspectRatio: string; model: string }): void  [T17]  sets text, ratio and model through the draft
//        (no new session), lowers the resolution to the nearest the model offers when needed, never sends or calls a request port
//   T41 (owner ruling OI-B -> option 1, docs/decisions/US-10.5-open-decisions.md): Reuse prompt counts as an edit for the check mark
//        (checkedPresetId -> null) and KEEPS the wire presetId left by an earlier pick (as shipped)
// =====================================================================================================================
const presetOf = async (id: string) => (await load('../../prompt-core/prompt-presets')).findPreset(id);
const FLASH_ID = 'gemini-3.1-flash-image';

describe('US-10.5 FR-19 / FR-14 (i): applyPreset fills the composer and sets BOTH preset fields (T15)', () => {
  it('lifestyle in an empty session: text with "the product", ratio 4:5, 2K, Pro, and both fields = lifestyle', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000)] });
    await store.init();
    store.applyPreset(await presetOf('lifestyle'));
    const d = store.draft();
    expect(d.text).toBe('Lifestyle photo of the product placed in a real environment such as a workshop, an office or a classroom.');
    expect(d.aspectRatio).toBe('4:5');
    expect(d.resolution).toBe('2K');
    expect(d.model).toBe(PRO);
    expect(d.presetId).toBe('lifestyle');
    expect(d.checkedPresetId).toBe('lifestyle');
  });

  it('the product-name field is substituted into the template, and no placeholder remains', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000)] });
    await store.init();
    store.setDraft({ productName: 'Bambu X1C' });
    store.applyPreset(await presetOf('white-bg'));
    expect(store.draft().text).toBe('Product photo of Bambu X1C on a clean pure white (#FFFFFF) background, soft shadow below the product, product centred in the frame.');
    expect(store.draft().text).not.toContain('{product}');
  });

  it('the model changes only while the session holds no version: with a version, ratio, resolution and text still apply but the model stays', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    expect(store.draft().model).toBe(FLASH_ID);
    store.applyPreset(await presetOf('banner'));
    const d = store.draft();
    expect(d.model).toBe(FLASH_ID);
    expect(d.aspectRatio).toBe('16:9');
    expect(d.resolution).toBe('2K');
    expect(d.text).toContain('Wide banner image featuring the product');
    expect(d.presetId).toBe('banner');
    expect(d.checkedPresetId).toBe('banner');
  });

  it('a second pick replaces both fields - the check mark is never on two presets', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000)] });
    await store.init();
    store.applyPreset(await presetOf('white-bg'));
    store.applyPreset(await presetOf('banner'));
    expect(store.draft().presetId).toBe('banner');
    expect(store.draft().checkedPresetId).toBe('banner');
  });

  it('FR-19: choosing a preset sends nothing and leaves the prompt editable (text is plain draft state)', async () => {
    const { store, llm, port } = await setup({ seed: [aged('a', 1_000)] });
    await store.init();
    const commits = port.commits;
    store.applyPreset(await presetOf('social'));
    expect(llm.generateImage).not.toHaveBeenCalled();
    expect(port.commits).toBe(commits);
    store.setDraft({ text: `${store.draft().text} with a green background` });
    expect(store.draft().text).toBe('Social media image of the product. with a green background');
  });

  it('FR-16 / FR-19: every shipped preset leaves a resolution its model offers (4K needs Pro) - never a forbidden combination', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000)] });
    await store.init();
    const { PROMPT_PRESETS } = await load('../../prompt-core/prompt-presets');
    const { findImageModel } = await load('../../prompt-core/model-catalog');
    for (const p of PROMPT_PRESETS) {
      store.applyPreset(p);
      const d = store.draft();
      expect(findImageModel(d.model).resolutions, p.id).toContain(d.resolution);
    }
  });

  it('with the preset applied and then a send, the wire preset id and the recorded preset are both the picked id (no edit in between)', async () => {
    const { store, llm, port } = await setup({ seed: [aged('a', 1_000)] });
    await store.init();
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse()));
    store.applyPreset(await presetOf('social'));
    await store.send();
    expect(llm.generateImage.mock.calls[0][0].presetId).toBe('social');
    const turns = port.snapshot().sessions['a'].turns;
    expect((turns[turns.length - 1] as unknown as Record<string, unknown>)['presetId']).toBe('social');
  });
});

describe('US-10.5 FR-5: reusePrompt fills text, ratio and model and sends nothing (T17)', () => {
  const reuse = { prompt: 'a red mug on a table', aspectRatio: '16:9', model: FLASH_ID };

  it('sets the prompt text (replacing what was there), the aspect ratio and the model', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    store.setDraft({ text: 'old text', aspectRatio: '1:1' });
    store.reusePrompt(reuse);
    expect(store.draft().text).toBe('a red mug on a table');
    expect(store.draft().aspectRatio).toBe('16:9');
    expect(store.draft().model).toBe(FLASH_ID);
  });

  it('restoring a different model does not create a session (it only fills the form)', async () => {
    const { store, port } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    store.reusePrompt({ ...reuse, model: PRO });
    expect(store.draft().model).toBe(PRO);
    expect(Object.keys(port.snapshot().sessions)).toEqual(['a']);
    expect(store.currentSessionId()).toBe('a');
  });

  it('FR-5 failure path: when the restored model does not offer the current resolution it drops to the nearest lower one it offers (4K on Flash -> 2K)', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    store.setDraft({ model: PRO, resolution: '4K' });
    store.reusePrompt({ ...reuse, model: FLASH_ID });
    expect(store.draft().model).toBe(FLASH_ID);
    expect(store.draft().resolution).toBe('2K');
  });

  it('a resolution the restored model offers is left alone (the resolution is not restored from the card)', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    store.setDraft({ model: PRO, resolution: '4K' });
    store.reusePrompt({ ...reuse, model: PRO });
    expect(store.draft().resolution).toBe('4K');
    store.setDraft({ resolution: '1K' });
    store.reusePrompt({ ...reuse, model: PRO });
    expect(store.draft().resolution).toBe('1K');
  });

  it('it never sends: no request port call, nothing written to storage, no generation started', async () => {
    const { store, llm, port } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    const commits = port.commits;
    store.reusePrompt(reuse);
    expect(llm.generateImage).not.toHaveBeenCalled();
    expect(llm.uploadImageFile).not.toHaveBeenCalled();
    expect(port.commits).toBe(commits);
    expect(store.generating()).toBe(false);
  });

  it('after Reuse the composer can send what was restored (the button state follows the restored text)', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    expect(store.canSend()).toBe(false);
    store.reusePrompt(reuse);
    expect(store.canSend()).toBe(true);
  });
});

describe('US-10.5 FR-5 / FR-14 (owner ruling OI-B, option 1): Reuse prompt clears the check mark and keeps the wire preset id (T41)', () => {
  it('after a preset pick, Reuse clears the check mark but KEEPS the wire presetId', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    store.applyPreset(await presetOf('white-bg'));
    expect(store.draft().checkedPresetId).toBe('white-bg');

    store.reusePrompt({ prompt: 'a red mug', aspectRatio: '1:1', model: FLASH_ID });

    expect(store.draft().checkedPresetId).toBeNull();
    expect(store.draft().presetId).toBe('white-bg');
  });

  it('with no preset picked, Reuse leaves both fields null', async () => {
    const { store } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    store.reusePrompt({ prompt: 'a red mug', aspectRatio: '1:1', model: FLASH_ID });
    expect(store.draft().checkedPresetId).toBeNull();
    expect(store.draft().presetId).toBeNull();
  });

  it('a send right after Reuse carries the kept wire preset id, and the stored turn records no preset (no check mark showed)', async () => {
    const { store, llm, port } = await setup({ seed: [aged('a', 1_000, { pairs: 1 })] });
    await store.init();
    llm.generateImage.mockResolvedValueOnce(okBody(imagesResponse()));
    store.applyPreset(await presetOf('banner'));
    store.reusePrompt({ prompt: 'a red mug', aspectRatio: '16:9', model: PRO });

    await store.send();

    expect(llm.generateImage.mock.calls[0][0].presetId).toBe('banner');
    const turns = port.snapshot().sessions['a'].turns;
    expect(Object.prototype.hasOwnProperty.call(turns[turns.length - 1], 'presetId')).toBe(false);
  });
});

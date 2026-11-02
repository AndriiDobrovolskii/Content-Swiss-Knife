/**
 * generation-runner.spec.ts - US-10.1, task T33 (FR-21, FR-22, FR-34, FR-36, FR-62, FR-63, FR-64, FR-74, FR-85, SD-22, SD-27,
 * SD-30, SD-31, NFR-5, NFR-14; AC-11, AC-12, AC-21 request part, AC-38, AC-39, AC-46 plumbing).
 *
 * Runner: test:logic. src/utils/image-studio/generation-runner.ts does not exist yet; loaded at run time per test.
 *
 * SCOPE SPLIT (breakdown O-2): this file is the happy path, the 120 s deadline, Cancel, late-response discard,
 * announcements and the no-retry rule. The re-upload recovery round has its own spec (task T34), so T34 never has to
 * turn a case of this file red.
 *
 * PINNED CONTRACT:
 *
 *   createGenerationRunner(deps) -> { run(input: RunInput, cancelSignal?: AbortSignal): Promise<RunOutcome> }
 *
 *   deps = {
 *     generateImage(request, signal): Promise<ImageHttpResult>,   // LlmService.generateImage (CONTRACT.md); never retried here
 *     uploadImage(request: { data: string }, signal): Promise<ImageHttpResult>,
 *     store: { getSentBytes(sessionId, fileUri), remapFileUris(sessionId, map) },   // slice of SessionStorePort (ports.ts)
 *     clock, scheduler, announcer, uiLanguage: () => 'en' | 'uk',
 *     sessionExists(sessionId): boolean | Promise<boolean>,       // SD-22: false => the response is discarded
 *   }
 *   RunInput = { sessionId: string; snapshot: StoredSession; buildInput: BuildInput }   // BuildInput: see request-builder.spec.ts
 *
 *   One call of run() is ONE user action (Send or Retry):
 *   - builds the request from the snapshot BEFORE anything else (SD-27) and keeps no reference to the live session;
 *   - announces T-16 at start (announcer.announce, text resolved from uiLanguage() AT THAT MOMENT);
 *   - arms ONE deadline: scheduler.setTimeout(..., 120000); it is cleared when the action ends (SD-30);
 *   - calls deps.generateImage exactly once per attempt with an AbortSignal that aborts on cancel and on the deadline;
 *   - validates a 200 body with GenerateResponseSchema (schemas.ts) and returns a closed outcome:
 *       { type: 'images', sessionId, request, response }            (T-17 announced with the HIGHEST new version number)
 *       { type: 'text' | 'safety', sessionId, request, response }    (non-history events; announcer.clear())
 *       { type: 'failed', textId, retry, restore: true }             (text id per error-dispatch / FR-83; announcer.clear())
 *       { type: 'blocked', textId: 'T-14', restore: true }           (413 PROTECTED_HISTORY_EXCEEDS_LIMIT)
 *       { type: 'cancelled', restore: true }                         (announcer.clear())
 *       { type: 'discarded' }                                        (sessionExists() false when the response arrives)
 *   - the outcome promise settles at cancel/deadline time; a late response afterwards is ignored.
 *
 * NOT asserted here: that the commit succeeds (the store applies the outcome), the T-18 / error rendering (components).
 */
import { describe, it, expect } from 'vitest';
import { makeSession, turn, textPart, inlineImagePart, type StoredSession } from '../../../test/image-studio/helpers/fakes';
import {
  makeRunnerHarness, seedStore, SID, BUILD_BASE, imagesResponse, textResponse, safetyResponse, imagePart, okBody, failure,
  deferred, flush, settled, pendingUntilAbort, PNG_B64, type ImageHttpResult,
} from '../../../test/image-studio/helpers/core-fixtures';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);

async function setup(opts: { pairs?: number; snapshot?: StoredSession } = {}) {
  const { createGenerationRunner } = await load('./generation-runner');
  const h = makeRunnerHarness();
  const snapshot = opts.snapshot ?? makeSession(SID, { pairs: opts.pairs ?? 2 });
  seedStore(h, snapshot);
  const runner = createGenerationRunner(h.deps);
  const input = (text = 'make the shadow softer', extra: Record<string, unknown> = {}) => ({
    sessionId: SID, snapshot, buildInput: { ...BUILD_BASE, newTurnId: 'u-new', text, ...extra },
  });
  return { h, runner, snapshot, input };
}

describe('GenerationRunner: success path (FR-24, FR-34, FR-74, AC-10, AC-46)', () => {
  it('FR-24 / AC-14: a valid images response is returned as an `images` outcome carrying the validated response and the request', async () => {
    const { h, runner, input } = await setup();
    const response = imagesResponse({ trimmedTurnIds: [] });
    h.script.generate = [async () => okBody(response)];

    const out = await runner.run(input());

    expect(out.type).toBe('images');
    expect(out.sessionId).toBe(SID);
    expect(out.response).toEqual(response);
    expect(out.request.newTurn).toEqual({ id: 'u-new', parts: [{ text: 'make the shadow softer' }] });
    expect(h.generateCalls).toHaveLength(1);
  });

  it('FR-34 / AC-21: the request carries the retained turns unmodified, including thoughtSignature, plus the new text', async () => {
    const { h, runner, snapshot, input } = await setup({ pairs: 2 });

    await runner.run(input());

    const sent = h.generateCalls[0].request;
    expect(sent.history).toEqual(snapshot.turns);
    expect(sent.history[3].parts[0].thoughtSignature).toBe('sig-2');
    expect(sent.model).toBe('gemini-3.1-flash-image');
  });

  it('FR-74 / AC-46: a successful generation announces exactly twice - T-16 at the start and T-17 with the new version number', async () => {
    const { h, runner, input } = await setup({ pairs: 2 });

    await runner.run(input());

    expect(h.announcer.announced).toEqual(['Generating…', 'Version v3 is ready']);
  });

  it('FR-74 / OD-30 C-30.5: a two-image response announces the HIGHEST number assigned (v4 after v1..v2 + two new)', async () => {
    const { h, runner, input } = await setup({ pairs: 2 });
    h.script.generate = [async () => okBody(imagesResponse({ parts: [imagePart(), imagePart()] }))];

    await runner.run(input());

    expect(h.announcer.announced).toEqual(['Generating…', 'Version v4 is ready']);
  });

  it('FR-84: a thought image does not take a number - [thought, final] announces v3, not v4', async () => {
    const { h, runner, input } = await setup({ pairs: 2 });
    h.script.generate = [async () => okBody(imagesResponse({ parts: [imagePart({ thought: true }), imagePart()] }))];

    await runner.run(input());

    expect(h.announcer.announced[1]).toBe('Version v3 is ready');
  });

  it('FR-77 / FR-74: each announcement uses the language at the moment it is made (en at start, uk at the end)', async () => {
    const { h, runner, input } = await setup({ pairs: 2 });
    const gate = deferred<ImageHttpResult>();
    h.script.generate = [() => gate.promise];

    const p = runner.run(input());
    await flush();
    h.lang.current = 'uk';
    gate.resolve(okBody(imagesResponse()));
    await p;

    expect(h.announcer.announced).toEqual(['Generating…', 'Версію v3 готово']);
  });

  it('FR-74: a success makes no clear() call (clearing is only for ends without a version)', async () => {
    const { h, runner, input } = await setup();
    await runner.run(input());
    expect(h.announcer.clears).toBe(0);
  });

  it('SD-30 / NFR-5: the deadline timer is removed when the action ends (no timer left behind)', async () => {
    const { h, runner, input } = await setup();
    await runner.run(input());
    expect(h.scheduler.pending).toBe(0);
  });
});

describe('GenerationRunner: the single 120 s deadline (FR-22, SD-30, AC-12)', () => {
  it('AC-12 / FR-22: nothing happens at 119 999 ms; at 120 000 ms the call is aborted and the outcome is failed T-6 with Retry', async () => {
    const { h, runner, input } = await setup();
    h.script.generate = [(_r, signal) => pendingUntilAbort(signal)];

    const p = runner.run(input());
    await flush();
    h.scheduler.advance(119_999);
    expect(await settled(p)).toBe(false);
    expect(h.generateCalls[0].signal?.aborted).toBe(false);

    h.scheduler.advance(1);
    const out = await p;

    expect(out).toMatchObject({ type: 'failed', textId: 'T-6', retry: true, restore: true });
    expect(h.generateCalls[0].signal?.aborted).toBe(true);
    expect(h.scheduler.pending).toBe(0);
  });

  it('FR-22: the deadline also fires while the clock stands inside a BFF backoff (1 s + 2 s + 4 s still pending, no response yet)', async () => {
    const { h, runner, input } = await setup();
    h.script.generate = [(_r, signal) => pendingUntilAbort(signal)];

    const p = runner.run(input());
    await flush();
    for (const step of [1_000, 2_000, 4_000]) h.scheduler.advance(step);
    expect(await settled(p)).toBe(false);
    h.scheduler.advance(120_000 - 7_000);

    expect(await p).toMatchObject({ type: 'failed', textId: 'T-6' });
  });

  it('FR-22: the deadline is measured from Send, not restarted per attempt - a call that answers at 119 999 ms still succeeds', async () => {
    const { h, runner, input } = await setup();
    const gate = deferred<ImageHttpResult>();
    h.script.generate = [() => gate.promise];

    const p = runner.run(input());
    await flush();
    h.scheduler.advance(119_999);
    gate.resolve(okBody(imagesResponse()));

    expect((await p).type).toBe('images');
  });

  it('FR-22 / FR-74: a timeout is an end without a version: one announcement (T-16) and a clear(), never T-17', async () => {
    const { h, runner, input } = await setup();
    h.script.generate = [(_r, signal) => pendingUntilAbort(signal)];
    const p = runner.run(input());
    await flush();
    h.scheduler.advance(120_000);
    await p;

    expect(h.announcer.announced).toEqual(['Generating…']);
    expect(h.announcer.clears).toBe(1);
  });

  it('FR-22: a response that arrives after the deadline is ignored', async () => {
    const { h, runner, input } = await setup();
    const gate = deferred<ImageHttpResult>();
    h.script.generate = [() => gate.promise]; // ignores the signal on purpose: the vendor call is not cancelled (FR-21 failure path)
    const p = runner.run(input());
    await flush();
    h.scheduler.advance(120_000);
    const out = await p;
    gate.resolve(okBody(imagesResponse()));
    await flush();

    expect(out).toMatchObject({ type: 'failed', textId: 'T-6' });
    expect(h.announcer.announced).toEqual(['Generating…']);
  });
});

describe('GenerationRunner: Cancel (FR-21, FR-64, AC-11)', () => {
  it('AC-11 / FR-21: cancelling a pending call aborts its signal and ends as `cancelled`, content restorable, nothing in history', async () => {
    const { h, runner, input } = await setup();
    h.script.generate = [(_r, signal) => pendingUntilAbort(signal)];
    const ac = new AbortController();

    const p = runner.run(input(), ac.signal);
    await flush();
    ac.abort();
    const out = await p;

    expect(out).toEqual({ type: 'cancelled', restore: true });
    expect(h.generateCalls[0].signal?.aborted).toBe(true);
    expect(h.scheduler.pending).toBe(0);
  });

  it('FR-21: Cancel made before the HTTP call starts makes no HTTP call at all', async () => {
    const { h, runner, input } = await setup();
    const ac = new AbortController();
    ac.abort();

    const out = await runner.run(input(), ac.signal);

    expect(out.type).toBe('cancelled');
    expect(h.generateCalls).toHaveLength(0);
    expect(h.scheduler.pending).toBe(0);
  });

  it('FR-21 failure path: a late response after Cancel is ignored - the outcome stays `cancelled` and nothing more is announced', async () => {
    const { h, runner, input } = await setup();
    const gate = deferred<ImageHttpResult>();
    h.script.generate = [() => gate.promise]; // does not honour the signal
    const ac = new AbortController();

    const p = runner.run(input(), ac.signal);
    await flush();
    ac.abort();
    const out = await p;
    gate.resolve(okBody(imagesResponse()));
    await flush();

    expect(out.type).toBe('cancelled');
    expect(h.announcer.announced).toEqual(['Generating…']);
    expect(h.announcer.clears).toBe(1);
  });

  it('FR-21 / FR-74: Cancel is an end without a version - one announcement, then clear()', async () => {
    const { h, runner, input } = await setup();
    h.script.generate = [(_r, signal) => pendingUntilAbort(signal)];
    const ac = new AbortController();
    const p = runner.run(input(), ac.signal);
    await flush();
    ac.abort();
    await p;

    expect(h.announcer.announced).toEqual(['Generating…']);
    expect(h.announcer.clears).toBe(1);
  });

  it('FR-21: Cancel after the deadline is armed but before it fires wins and the timer is cleared', async () => {
    const { h, runner, input } = await setup();
    h.script.generate = [(_r, signal) => pendingUntilAbort(signal)];
    const ac = new AbortController();
    const p = runner.run(input(), ac.signal);
    await flush();
    h.scheduler.advance(60_000);
    ac.abort();

    expect((await p).type).toBe('cancelled');
    h.scheduler.advance(120_000);
    expect(h.scheduler.pending).toBe(0);
  });
});

describe('GenerationRunner: failures are never retried by the client (FR-85, SD-31, FR-64)', () => {
  it.each([[0], [500], [502], [503], [504]])('FR-85 / SD-31: status %i with no envelope makes exactly ONE generate call and ends failed T-7 with Retry', async (status) => {
    const { h, runner, input } = await setup();
    h.script.generate = [async () => failure(status)];

    const out = await runner.run(input());

    expect(h.generateCalls).toHaveLength(1);
    expect(out).toMatchObject({ type: 'failed', textId: 'T-7', retry: true, restore: true });
  });

  it('FR-64 / AC-40: a failed turn announces once (T-16), clears the region, and returns no response to apply', async () => {
    const { h, runner, input } = await setup();
    h.script.generate = [async () => failure(500)];

    const out = await runner.run(input());

    expect(h.announcer.announced).toEqual(['Generating…']);
    expect(h.announcer.clears).toBe(1);
    expect(out.response).toBeUndefined();
  });

  it.each([
    [429, 'RATE_LIMIT_EXCEEDED', 'T-13', false],
    [501, 'GEMINI_KEY_MISSING', 'T-11', false],
    [502, 'EMPTY_RESPONSE', 'T-5', true],
    [429, 'UPSTREAM_RETRIES_EXHAUSTED', 'T-7', true],
    [413, 'REQUEST_BODY_TOO_LARGE', 'T-8', false],
    [400, 'INVALID_REQUEST', 'T-12', false],
    [500, 'PRICE_NOT_CONFIGURED', 'T-12', false],
  ])('FR-61 / FR-52: status %i with code %s is a failed turn showing %s (Retry: %s)', async (status, code, textId, retry) => {
    const { h, runner, input } = await setup();
    h.script.generate = [async () => failure(status, code)];

    const out = await runner.run(input());

    expect(out).toMatchObject({ type: 'failed', textId, retry, restore: true });
    expect(h.generateCalls).toHaveLength(1);
  });

  it('FR-46 / FR-47: 413 with code PROTECTED_HISTORY_EXCEEDS_LIMIT is the `blocked` outcome (T-14), one request, no Retry', async () => {
    const { h, runner, input } = await setup();
    h.script.generate = [async () => failure(413, 'PROTECTED_HISTORY_EXCEEDS_LIMIT')];

    const out = await runner.run(input());

    expect(out).toMatchObject({ type: 'blocked', textId: 'T-14', restore: true });
    expect(h.generateCalls).toHaveLength(1);
  });

  it('FR-61: a 413 WITHOUT the protected-history code is NOT the blocked state (status alone is never enough)', async () => {
    const { h, runner, input } = await setup();
    h.script.generate = [async () => failure(413)];

    const out = await runner.run(input());

    expect(out.type).toBe('failed');
    expect(out.textId).toBe('T-8');
  });
});

describe('GenerationRunner: an invalid 200 is an error, never an empty image (FR-24, AC-14, D-6)', () => {
  const bad: Array<[string, unknown]> = [
    ['no variant (unknown kind)', { kind: 'banana', trimmedTurnIds: [] }],
    ['images without any image part', { ...imagesResponse(), parts: [{ text: 'only words' }] }],
    ['images whose only image is a thought part', { ...imagesResponse(), parts: [imagePart({ thought: true })] }],
    ['a negative costUsd', { ...imagesResponse(), costUsd: -0.01 }],
    ['a non-finite costUsd', { ...imagesResponse(), costUsd: 'NaN' }],
    ['trimmedTurnIds missing', (() => { const r: any = imagesResponse(); delete r.trimmedTurnIds; return r; })()],
    ['trimmedTurnIds not an array of strings', { ...imagesResponse(), trimmedTurnIds: [1, 2] }],
    ['trimmedTurnIds with an empty string', { ...imagesResponse(), trimmedTurnIds: [''] }],
    ['trimmedTurnIds longer than the ids the request carried (2 history turns + the new turn = 3 ids)', { ...imagesResponse(), trimmedTurnIds: ['u1', 'm1', 'u-new', 'extra'] }],
    ['an empty object', {}],
    ['null', null],
  ];
  it.each(bad)('FR-24: %s -> failed turn, no `images` outcome', async (_label, body) => {
    const { h, runner, input } = await setup({ pairs: 1 });
    h.script.generate = [async () => okBody(body)];

    const out = await runner.run(input());

    expect(out.type).toBe('failed');
    expect(out.restore).toBe(true);
    expect(out.response).toBeUndefined();
    expect(h.announcer.announced).toEqual(['Generating…']);
  });
});

describe('GenerationRunner: non-history replies (FR-36, FR-62, FR-63; AC-38, AC-39)', () => {
  it('FR-63 / AC-39: a text-only reply is a `text` outcome carrying the text and the cut list, announced as an end without a version', async () => {
    const { h, runner, input } = await setup();
    h.script.generate = [async () => okBody(textResponse('I cannot draw hands today.', ['m1', 'u2']))];

    const out = await runner.run(input());

    expect(out).toMatchObject({ type: 'text', sessionId: SID });
    expect(out.response).toEqual({ kind: 'text', text: 'I cannot draw hands today.', trimmedTurnIds: ['m1', 'u2'] });
    expect(h.announcer.announced).toEqual(['Generating…']);
    expect(h.announcer.clears).toBe(1);
  });

  it('FR-62 / AC-38: a safety reply is a `safety` outcome carrying the reason and the cut list, and is not an error', async () => {
    const { h, runner, input } = await setup();
    h.script.generate = [async () => okBody(safetyResponse('IMAGE_SAFETY', []))];

    const out = await runner.run(input());

    expect(out).toMatchObject({ type: 'safety', sessionId: SID });
    expect(out.response).toEqual({ kind: 'safety', reason: 'IMAGE_SAFETY', trimmedTurnIds: [] });
    expect(h.announcer.announced).toEqual(['Generating…']);
  });
});

describe('GenerationRunner: session scoping and snapshot discipline (SD-22, SD-27, FR-36)', () => {
  it('SD-22: a response for a session that no longer exists is `discarded`: no T-17, no outcome to apply', async () => {
    const { h, runner, input } = await setup();
    const gate = deferred<ImageHttpResult>();
    h.script.generate = [() => gate.promise];

    const p = runner.run(input());
    await flush();
    h.existing.delete(SID);
    gate.resolve(okBody(imagesResponse()));
    const out = await p;

    expect(out).toEqual({ type: 'discarded' });
    expect(h.announcer.announced).toEqual(['Generating…']);
    expect(h.announcer.clears).toBe(1);
  });

  it('SD-22: a session that still exists when the response arrives is applied to the session that sent it', async () => {
    const { h, runner, input } = await setup();
    const out = await runner.run(input());
    expect(out.sessionId).toBe(SID);
  });

  it('SD-27: the request is built from the snapshot before any append - mutating the live session afterwards changes nothing that was sent', async () => {
    const { h, runner, snapshot, input } = await setup({ pairs: 2 });
    const gate = deferred<ImageHttpResult>();
    h.script.generate = [() => gate.promise];

    const p = runner.run(input());
    await flush();
    const sentAtCall = structuredClone(h.generateCalls[0].request);
    snapshot.turns.push(turn('u-new', 'user', textPart('x')), turn('m-new', 'model', inlineImagePart('image/png', PNG_B64)));
    snapshot.meta.turnOrder.push('u-new', 'm-new');
    gate.resolve(okBody(imagesResponse()));
    const out = await p;

    expect(sentAtCall.history.map((t: any) => t.id)).toEqual(['u1', 'm1', 'u2', 'm2']);
    expect(out.request.history.map((t: any) => t.id)).toEqual(['u1', 'm1', 'u2', 'm2']);
  });

  it('FR-36: Retry re-sends the SAME turn - running the same input again sends an identical request', async () => {
    const { h, runner, input } = await setup();
    h.script.generate = [async () => failure(503), async () => okBody(imagesResponse())];

    const first = await runner.run(input('same words'));
    const second = await runner.run(input('same words'));

    expect(first.type).toBe('failed');
    expect(second.type).toBe('images');
    expect(h.generateCalls).toHaveLength(2);
    expect(h.generateCalls[1].request).toEqual(h.generateCalls[0].request);
  });

  it('FR-18: an images-only turn (file_uri parts, no text) reaches the HTTP layer with no text part', async () => {
    const { h, runner, snapshot } = await setup({ pairs: 0 });

    await runner.run({ sessionId: SID, snapshot, buildInput: { ...BUILD_BASE, newTurnId: 'u1', text: '', uploads: [{ fileUri: 'files/a', mimeType: 'image/png' }] } });

    expect(h.generateCalls[0].request.newTurn.parts).toEqual([{ fileData: { fileUri: 'files/a', mimeType: 'image/png' } }]);
  });

  it('FR-18: a message with neither text nor image is refused before any HTTP call and without an announcement', async () => {
    const { h, runner, snapshot } = await setup({ pairs: 0 });
    let thrown: any;
    try { await runner.run({ sessionId: SID, snapshot, buildInput: { ...BUILD_BASE, newTurnId: 'u1', text: '   ' } }); } catch (e) { thrown = e; }

    expect(thrown?.name ?? 'resolved').toBe('EmptyMessageError');
    expect(h.generateCalls).toHaveLength(0);
    expect(h.announcer.announced).toEqual([]);
  });
});


/**
 * generation-runner.file-missing.spec.ts - US-10.1, task T34 (FR-17, FR-21 Cancel during the re-upload, FR-22, FR-13 re-upload
 * bytes, SD-4, SD-30, D-27; AC-21 file_uri replaced after expiry, AC-28 client half).
 *
 * Runner: test:logic. src/utils/image-studio/generation-runner.ts does not exist yet; loaded at run time per test.
 * This file owns EVERY case that involves the expired-file status: generation-runner.spec.ts (task T33) deliberately has none,
 * so the builder of T34 never turns a T33 test red (AGENTS.md section 7.7).
 *
 * PINNED CONTRACT (extends the one in generation-runner.spec.ts, which is not repeated):
 *   - The recovery trigger is status 410 AND code FILE_MISSING together (FR-52, FR-61); the runner dispatches on both.
 *   - On the trigger the runner, inside the SAME user action and the SAME 120 000 ms deadline:
 *       1. collects the distinct `fileData.fileUri` values of request.history (in history order) and of request.newTurn;
 *       2. looks every one up with deps.store.getSentBytes(sessionId, uri); if ANY is missing -> outcome
 *          { type: 'failed', textId: 'T-10', restore: true } with NO upload request at all (D-27);
 *       3. uploads them SEQUENTIALLY, one deps.uploadImage({ data: <base64 of the stored sent bytes> }, signal) per uri, in that
 *          order, with no re-encode (the runner has no codec dependency);
 *       4. persists the mapping with deps.store.remapFileUris(sessionId, { oldUri: newUri, ... }) and rebuilds the request with
 *          the new URIs in history and new turn;
 *       5. repeats deps.generateImage exactly ONCE (SD-4). A second FILE_MISSING ends in T-10, no further upload.
 *   - Any other 410, or FILE_MISSING under another status, is NOT the trigger: the normal error dispatch applies.
 *   - Cancel and the deadline abort the signal handed to the pending upload or generate and end the action; no further call is made.
 */
import { describe, it, expect } from 'vitest';
import {
  makeSession, turn, textPart, filePart, makeRaster, toBase64, type StoredSession,
} from '../../../test/image-studio/helpers/fakes';
import {
  makeRunnerHarness, seedStore, SID, BUILD_BASE, imagesResponse, okBody, failure, flush, settled, pendingUntilAbort,
} from '../../../test/image-studio/helpers/core-fixtures';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);

const ORIG = 'files/orig-1';
const UP = 'files/up-1';
const MISSING = failure(410, 'FILE_MISSING');

const sentOrig = makeRaster({ format: 'png', width: 640, height: 480, size: 200 });
const sentUp = makeRaster({ format: 'jpg', width: 320, height: 200, size: 150 });

/** u1 m1 u2 m2; u1 holds the original uploaded image as a file_uri. The new turn adds one more upload. */
function snapshotWithOriginal(): StoredSession {
  const s = makeSession(SID, { pairs: 2 });
  s.turns[0] = turn('u1', 'user', textPart('make it white'), filePart(ORIG, 'image/png'));
  return s;
}

async function setup(opts: { storeBytes?: 'both' | 'orig-only' | 'none' } = {}) {
  const { createGenerationRunner } = await load('./generation-runner');
  const h = makeRunnerHarness();
  const snapshot = snapshotWithOriginal();
  const mode = opts.storeBytes ?? 'both';
  const sent: Record<string, { bytes: Uint8Array; mimeType: string }> = {};
  if (mode !== 'none') sent[ORIG] = { bytes: sentOrig, mimeType: 'image/png' };
  if (mode === 'both') sent[UP] = { bytes: sentUp, mimeType: 'image/jpeg' };
  seedStore(h, snapshot, sent);
  h.script.generate = [async () => MISSING, async () => okBody(imagesResponse())];
  const runner = createGenerationRunner(h.deps);
  const input = () => ({
    sessionId: SID, snapshot,
    buildInput: { ...BUILD_BASE, newTurnId: 'u3', text: 'softer shadow', uploads: [{ fileUri: UP, mimeType: 'image/jpeg' }] },
  });
  return { h, runner, snapshot, input };
}

describe('FILE_MISSING recovery: one re-upload round, one repeat (FR-17, SD-4, AC-21, AC-28)', () => {
  it('AC-28 / FR-17: the first expired-file answer re-uploads every file_uri of the history and the new turn, once each, in order', async () => {
    const { h, runner, input } = await setup();

    const out = await runner.run(input());

    expect(out.type).toBe('images');
    expect(h.uploadCalls).toHaveLength(2);
    expect(h.uploadCalls[0].request.data).toBe(toBase64(sentOrig));
    expect(h.uploadCalls[1].request.data).toBe(toBase64(sentUp));
  });

  it('FR-13 / OD-12 C-12.5: the bytes of the re-upload are the stored SENT bytes, identical to the first upload - no second re-encode', async () => {
    const { h, runner, input } = await setup();

    await runner.run(input());

    const reuploaded = h.uploadCalls.map((c) => Uint8Array.from(atob(c.request.data), (ch) => ch.charCodeAt(0)));
    expect(reuploaded[0]).toEqual(sentOrig);
    expect(reuploaded[1]).toEqual(sentUp);
  });

  it('SD-4 / FR-17: the generate call is repeated exactly ONCE per user action', async () => {
    const { h, runner, input } = await setup();

    await runner.run(input());

    expect(h.generateCalls).toHaveLength(2);
  });

  it('AC-21 / FR-17: the repeated request carries the replaced file_uris in the history and in the new turn, and no old one', async () => {
    const { h, runner, input } = await setup();

    await runner.run(input());

    const second = h.generateCalls[1].request;
    expect(second.history[0].parts[1]).toEqual({ fileData: { fileUri: 'files/new-1', mimeType: 'image/png' } });
    expect(second.newTurn.parts.find((p: any) => p.fileData)).toEqual({ fileData: { fileUri: 'files/new-2', mimeType: 'image/jpeg' } });
    const wire = JSON.stringify(second);
    expect(wire).not.toContain(ORIG);
    expect(wire).not.toContain(UP);
  });

  it('AC-21: apart from the replaced file_uris the repeated request equals the first (turns stay unmodified)', async () => {
    const { h, runner, input } = await setup();

    await runner.run(input());

    const norm = (r: any) => JSON.stringify(r).replaceAll(ORIG, 'U1').replaceAll(UP, 'U2').replaceAll('files/new-1', 'U1').replaceAll('files/new-2', 'U2');
    expect(norm(h.generateCalls[1].request)).toBe(norm(h.generateCalls[0].request));
  });

  it('FR-17: the new URIs are persisted - the stored turns and the stored sent bytes are re-keyed through the store port', async () => {
    const { h, runner, input } = await setup();

    await runner.run(input());

    const snap = h.store.snapshot();
    expect(snap.sessions[SID].turns[0].parts[1]).toEqual({ fileData: { fileUri: 'files/new-1', mimeType: 'image/png' } });
    expect(snap.sentBytes[SID].sort()).toEqual(['files/new-1', 'files/new-2']);
    expect(h.store.log.filter((l) => l.startsWith('remapFileUris'))).toHaveLength(1);
  });

  it('FR-17 / FR-74: the whole sequence is ONE user action - one announcement pair, one deadline timer, cleared at the end', async () => {
    const { h, runner, input } = await setup();

    await runner.run(input());

    expect(h.announcer.announced).toEqual(['Generating…', 'Version v3 is ready']);
    expect(h.scheduler.pending).toBe(0);
  });

  it('FR-17: a turn whose only references are in the new turn (no history uploads) re-uploads just those', async () => {
    const { createGenerationRunner } = await load('./generation-runner');
    const h = makeRunnerHarness();
    const snapshot = makeSession(SID, { pairs: 1 });
    seedStore(h, snapshot, { [UP]: { bytes: sentUp, mimeType: 'image/jpeg' } });
    h.script.generate = [async () => MISSING, async () => okBody(imagesResponse())];
    const runner = createGenerationRunner(h.deps);

    const out = await runner.run({ sessionId: SID, snapshot, buildInput: { ...BUILD_BASE, newTurnId: 'u2', text: 'x', uploads: [{ fileUri: UP, mimeType: 'image/jpeg' }] } });

    expect(out.type).toBe('images');
    expect(h.uploadCalls).toHaveLength(1);
    expect(h.uploadCalls[0].request.data).toBe(toBase64(sentUp));
  });
});

describe('FILE_MISSING recovery: where it stops (FR-17, D-27)', () => {
  it('FR-17: a SECOND expired-file answer ends in T-10 and makes no further upload or generate call', async () => {
    const { h, runner, input } = await setup();
    h.script.generate = [async () => MISSING, async () => MISSING];

    const out = await runner.run(input());

    expect(out).toMatchObject({ type: 'failed', textId: 'T-10', restore: true });
    expect(h.generateCalls).toHaveLength(2);
    expect(h.uploadCalls).toHaveLength(2);
    expect(h.announcer.announced).toEqual(['Generating…']);
    expect(h.announcer.clears).toBe(1);
  });

  it('D-27 / OD-37: a uri whose sent bytes were never stored ends in T-10 at the FIRST expired-file answer, with NO upload request', async () => {
    const { h, runner, input } = await setup({ storeBytes: 'none' });

    const out = await runner.run(input());

    expect(out).toMatchObject({ type: 'failed', textId: 'T-10', restore: true });
    expect(h.uploadCalls).toHaveLength(0);
    expect(h.generateCalls).toHaveLength(1);
  });

  it('D-27: when only SOME bytes are stored nothing is uploaded either (all-or-nothing, decided before the first upload)', async () => {
    const { h, runner, input } = await setup({ storeBytes: 'orig-only' });

    const out = await runner.run(input());

    expect(out).toMatchObject({ type: 'failed', textId: 'T-10' });
    expect(h.uploadCalls).toHaveLength(0);
    expect(h.generateCalls).toHaveLength(1);
    expect(h.store.log.some((l) => l.startsWith('remapFileUris'))).toBe(false);
  });

  it('D-27: the aftermath is real - every later send in that session meets the same expired file and shows T-10 again, with no upload', async () => {
    const { h, runner, input } = await setup({ storeBytes: 'none' });
    h.script.generate = [async () => MISSING];

    const first = await runner.run(input());
    const second = await runner.run(input());

    expect([first.textId, second.textId]).toEqual(['T-10', 'T-10']);
    expect(h.uploadCalls).toHaveLength(0);
  });

  it('FR-17 failure path: a failed re-upload (server error) ends as a failed turn, repeats nothing and persists no mapping', async () => {
    const { h, runner, input } = await setup();
    h.script.upload = [async () => failure(500)];

    const out = await runner.run(input());

    expect(out.type).toBe('failed');
    expect(out.restore).toBe(true);
    expect(h.generateCalls).toHaveLength(1);
    expect(h.store.log.some((l) => l.startsWith('remapFileUris'))).toBe(false);
  });
});

describe('FILE_MISSING recognition is status AND code (FR-17, FR-61)', () => {
  it.each([
    ['410 with another code', failure(410, 'SOMETHING_ELSE'), 'T-12'],
    ['410 with no envelope code', failure(410), 'T-12'],
    ['404 carrying the FILE_MISSING code (upstream 404 passes through as an ordinary error)', failure(404, 'FILE_MISSING'), 'T-12'],
    ['400 carrying the FILE_MISSING code', failure(400, 'FILE_MISSING'), 'T-12'],
  ])('FR-17: %s triggers NO re-upload and NO repeat', async (_label, result, textId) => {
    const { h, runner, input } = await setup();
    h.script.generate = [async () => result];

    const out = await runner.run(input());

    expect(out).toMatchObject({ type: 'failed', textId });
    expect(h.uploadCalls).toHaveLength(0);
    expect(h.generateCalls).toHaveLength(1);
  });
});

describe('FILE_MISSING recovery: Cancel and the deadline cover the whole round (FR-21, FR-22, SD-30)', () => {
  it('FR-21: Cancel during the re-upload makes no further upload and no repeated generate call', async () => {
    const { h, runner, input } = await setup();
    h.script.upload = [(_r, signal) => pendingUntilAbort(signal)];
    const ac = new AbortController();

    const p = runner.run(input(), ac.signal);
    await flush();
    expect(h.uploadCalls).toHaveLength(1);
    ac.abort();
    const out = await p;

    expect(out).toEqual({ type: 'cancelled', restore: true });
    expect(h.uploadCalls).toHaveLength(1); // the second file is never started
    expect(h.uploadCalls[0].signal?.aborted).toBe(true);
    expect(h.generateCalls).toHaveLength(1);
    expect(h.scheduler.pending).toBe(0);
  });

  it('FR-21: Cancel during the repeated generate call aborts it and ends `cancelled`', async () => {
    const { h, runner, input } = await setup();
    h.script.generate = [async () => MISSING, (_r, signal) => pendingUntilAbort(signal)];
    const ac = new AbortController();

    const p = runner.run(input(), ac.signal);
    await flush();
    expect(h.generateCalls).toHaveLength(2);
    ac.abort();

    expect((await p).type).toBe('cancelled');
    expect(h.generateCalls[1].signal?.aborted).toBe(true);
    expect(h.uploadCalls).toHaveLength(2);
  });

  it('FR-22 / SD-30: the single 120 000 ms deadline fires inside the re-upload round: T-6, the upload signal aborted, no repeat', async () => {
    const { h, runner, input } = await setup();
    h.script.upload = [(_r, signal) => pendingUntilAbort(signal)];

    const p = runner.run(input());
    await flush();
    h.scheduler.advance(119_999);
    expect(await settled(p)).toBe(false);
    h.scheduler.advance(1);
    const out = await p;

    expect(out).toMatchObject({ type: 'failed', textId: 'T-6', retry: true, restore: true });
    expect(h.uploadCalls[0].signal?.aborted).toBe(true);
    expect(h.generateCalls).toHaveLength(1);
  });

  it('SD-30: the deadline is NOT restarted by the repeat - time spent in the first call counts', async () => {
    const { h, runner, input } = await setup();
    h.script.generate = [
      async () => { h.scheduler.advance(100_000); return MISSING; },
      (_r, signal) => pendingUntilAbort(signal),
    ];

    const p = runner.run(input());
    await flush();
    expect(await settled(p)).toBe(false);
    h.scheduler.advance(20_000); // 100 000 + 20 000 = 120 000 since Send

    expect(await p).toMatchObject({ type: 'failed', textId: 'T-6' });
  });
});


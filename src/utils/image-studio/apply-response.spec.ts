/**
 * apply-response.spec.ts - US-10.1, task T29 (FR-23, FR-43, FR-44, FR-45, FR-84, D-6, D-18, SD-22, SD-27, SD-32;
 * AC-10, AC-13, AC-24 client half, AC-29 client half).
 *
 * Runner: test:logic. src/utils/image-studio/apply-response.ts does not exist yet; loaded at run time per test.
 *
 * PINNED CONTRACT:
 *
 *   applyResponse(snapshot: StoredSession, response: GenerateResponse, ctx: ApplyContext): ApplyResult
 *
 *   ApplyContext = {
 *     userTurn: Turn;          // the user turn exactly as it was sent (id, role 'user', parts) - becomes part of the history
 *     ids: IdSource;           // ids.next() names the NEW model turn locally (FR-43); the response never supplies it
 *     now: number;             // the injected clock reading, becomes meta.lastActivity (SD-32)
 *     model: string; aspectRatio: string; resolution: string;
 *     prompt: string;          // text sent in the turn (version label / alt source)
 *     inputFormat: 'image/png' | 'image/jpeg' | 'image/webp';   // FR-82 input format stored with each new version (D-22)
 *   }
 *   ApplyResult = {
 *     kind: 'images' | 'text' | 'safety';
 *     batch: CommitBatch | null;           // ONE object handed to SessionStorePort.commit (FR-44); null = nothing to commit
 *     newVersionNumbers: number[];         // numbers given to the new images, in API order ([] for text/safety)
 *     modelTurnId: string | null;          // id of the appended model turn ('images' only)
 *     notice: { V: number; M: number; I: number } | null;   // T-9 counts (FR-45); null when nothing was removed
 *   }
 *
 * - The function is pure: it never mutates `snapshot`. In-memory state is the caller's job and happens only after the commit.
 * - A response that lists a PROTECTED turn (the first user turn, or the model turn holding the latest version, both evaluated on
 *   `snapshot` = the history BEFORE the append, SD-27) throws an Error with `name === 'InvalidResponseError'` (FR-44, D-6).
 *   Ids not in the snapshot (including the id of the new user turn) are ignored.
 * - For `images`, `batch.putTurns` = [ctx.userTurn, the new model turn]; for `text`/`safety` it is [] (no history is added) and
 *   `batch` is null when `trimmedTurnIds` is empty.
 *
 * NOT asserted here: IndexedDB atomicity (the in-memory fake in the store specs models all-or-nothing; the real adapter has no
 * test, plan R1) and the announcement (generation-runner.spec.ts).
 */
import { describe, it, expect } from 'vitest';
import {
  makeSession, makeVersion, turn, textPart, filePart, inlineImagePart, makeIdSource,
  type StoredSession,
} from '../../../test/image-studio/helpers/fakes';
import { imagePart, imagesResponse, textResponse, safetyResponse, PNG_B64, FLASH } from '../../../test/image-studio/helpers/core-fixtures';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const mod = () => load('./apply-response');

const NOW = 5_000_000;
function ctx(over: Record<string, unknown> = {}, userId = 'u3') {
  return {
    userTurn: turn(userId, 'user', textPart('softer shadow')),
    ids: makeIdSource('model'),
    now: NOW,
    model: FLASH, aspectRatio: '4:5', resolution: '2K', prompt: 'softer shadow', inputFormat: 'image/webp',
    ...over,
  };
}

/** u1 m1 u2 m2 u3 m3 with v1 (downloaded) v2 v3; u2 carries a file_uri original, u3 carries two. */
function threePairs(): StoredSession {
  const s = makeSession('s1', { pairs: 3, costUsd: 0.09 });
  s.turns[2] = turn('u2', 'user', textPart('prompt 2'), filePart('files/x'));
  s.turns[4] = turn('u3', 'user', textPart('prompt 3'), filePart('files/y'), filePart('files/z'));
  s.meta.versions[0].downloaded = true;
  s.meta.lastActivity = 1_000_000;
  return s;
}

describe('applyResponse: images (FR-23, FR-43, FR-44, AC-10, AC-13)', () => {
  it('FR-44: appends the sent user turn and one new model turn in ONE commit batch, parts exactly as returned', async () => {
    const { applyResponse } = await mod();
    const snap = makeSession('s1', { pairs: 2, costUsd: 0.06 });
    const response = imagesResponse({ parts: [{ text: 'here you go' }, imagePart({ thoughtSignature: 'sig-xyz' })] });
    const c = ctx({}, 'u3');

    const out = applyResponse(snap, response, c);

    expect(out.kind).toBe('images');
    expect(out.batch.putTurns).toHaveLength(2);
    expect(out.batch.putTurns[0]).toEqual(c.userTurn);
    const modelTurn = out.batch.putTurns[1];
    expect(modelTurn.role).toBe('model');
    expect(modelTurn.parts).toEqual(response.parts);
    expect(out.batch.deleteTurnIds).toEqual([]);
    expect(out.batch.meta.turnOrder).toEqual(['u1', 'm1', 'u2', 'm2', 'u3', modelTurn.id]);
  });

  it('FR-43: the model turn id comes from the injected IdSource, never from the response', async () => {
    const { applyResponse } = await mod();
    const ids = makeIdSource('model');
    const response = { ...imagesResponse(), id: 'evil-from-server', modelTurnId: 'evil-from-server' };

    const out = applyResponse(makeSession('s1', { pairs: 1 }), response, ctx({ ids }, 'u2'));

    expect(out.modelTurnId).toBe('model-1');
    expect(ids.issued).toEqual(['model-1']);
    expect(out.batch.putTurns[1].id).toBe('model-1');
  });

  it('FR-23 / AC-13: the new version is numbered from nextVersionNumber and labelled with model, resolution, aspect ratio, prompt and input format', async () => {
    const { applyResponse } = await mod();
    const snap = makeSession('s1', { pairs: 2 });

    const out = applyResponse(snap, imagesResponse(), ctx({}, 'u3'));

    expect(out.newVersionNumbers).toEqual([3]);
    const v = out.batch.meta.versions.find((x: any) => x.number === 3);
    expect(v).toEqual({
      number: 3, turnId: out.modelTurnId, partIndex: 0, model: FLASH, resolution: '2K', aspectRatio: '4:5',
      prompt: 'softer shadow', inputFormat: 'image/webp', downloaded: false,
    });
    expect(out.batch.meta.nextVersionNumber).toBe(4);
  });

  it('FR-23: a response with several images numbers each consecutively in API order inside ONE model turn', async () => {
    const { applyResponse } = await mod();
    const snap = makeSession('s1', { pairs: 2 });
    const response = imagesResponse({ parts: [imagePart(), { text: 'second:' }, imagePart()] });

    const out = applyResponse(snap, response, ctx({}, 'u3'));

    expect(out.newVersionNumbers).toEqual([3, 4]);
    const fresh = out.batch.meta.versions.filter((x: any) => x.number >= 3);
    expect(fresh.map((x: any) => [x.number, x.turnId === out.modelTurnId, x.partIndex])).toEqual([[3, true, 0], [4, true, 2]]);
    expect(out.batch.meta.nextVersionNumber).toBe(5);
    expect(out.batch.putTurns.filter((t: any) => t.role === 'model')).toHaveLength(1);
  });

  it('FR-84 / D-18: a thought image gets no number and no version, but its part stays inside the stored model turn', async () => {
    const { applyResponse } = await mod();
    const thought = imagePart({ thought: true, thoughtSignature: 'th-1' });
    const response = imagesResponse({ parts: [thought, imagePart({ thoughtSignature: 'final-1' })] });

    const out = applyResponse(makeSession('s1', { pairs: 1 }), response, ctx({}, 'u2'));

    expect(out.newVersionNumbers).toEqual([2]);
    const fresh = out.batch.meta.versions.filter((x: any) => x.number >= 2);
    expect(fresh).toHaveLength(1);
    expect(fresh[0].partIndex).toBe(1);
    expect(out.batch.putTurns[1].parts).toEqual([thought, response.parts[1]]);
    expect(out.batch.meta.nextVersionNumber).toBe(3);
  });

  it('FR-71: costUsd is added to the session total; FR-44/SD-32: lastActivity becomes the injected clock reading', async () => {
    const { applyResponse } = await mod();
    const snap = makeSession('s1', { pairs: 1, costUsd: 0.06 });

    const out = applyResponse(snap, imagesResponse({ costUsd: 0.12 }), ctx({ now: 9_999 }, 'u2'));

    expect(out.batch.meta.costUsd).toBeCloseTo(0.18, 10);
    expect(out.batch.meta.lastActivity).toBe(9_999);
    expect(out.batch.meta.id).toBe('s1');
    expect(out.batch.meta.schemaVersion).toBe(1);
  });

  it('SD-27: does not mutate the snapshot it is given', async () => {
    const { applyResponse } = await mod();
    const snap = threePairs();
    const before = structuredClone(snap);

    applyResponse(snap, imagesResponse({ trimmedTurnIds: ['m1', 'u2'] }), ctx({}, 'u4'));

    expect(snap).toEqual(before);
  });
});

describe('applyResponse: the cut (FR-44, FR-45, D-6, SD-27; AC-24, AC-29)', () => {
  it('FR-44: deletes the listed turns in the same batch, removes their versions and downloaded flags, and never renumbers', async () => {
    const { applyResponse } = await mod();
    const snap = threePairs(); // v1 (downloaded) in m1, v2 in m2, v3 in m3

    const out = applyResponse(snap, imagesResponse({ trimmedTurnIds: ['m1', 'u2'] }), ctx({}, 'u4'));

    expect(out.batch.deleteTurnIds.sort()).toEqual(['m1', 'u2']);
    expect(out.batch.meta.turnOrder).toEqual(['u1', 'm2', 'u3', 'm3', 'u4', out.modelTurnId]);
    expect(out.batch.meta.versions.map((v: any) => v.number)).toEqual([2, 3, 4]);
    expect(out.batch.meta.versions.some((v: any) => v.downloaded)).toBe(false);
    expect(out.newVersionNumbers).toEqual([4]);
    expect(out.batch.meta.nextVersionNumber).toBe(5);
  });

  it('FR-23: numbering continues after a cut - surviving numbers may have gaps (v1, v5) and the next is highest-ever plus one', async () => {
    const { applyResponse } = await mod();
    // v1 in m1, then v2..v4 in m2 (three images), and the session's counter already stands at 5.
    const s = makeSession('s1', { pairs: 2 });
    s.turns[3] = turn('m2', 'model', inlineImagePart('image/png', PNG_B64), inlineImagePart('image/png', PNG_B64), inlineImagePart('image/png', PNG_B64));
    s.meta.versions = [
      makeVersion({ number: 1, turnId: 'm1' }),
      makeVersion({ number: 2, turnId: 'm2', partIndex: 0 }),
      makeVersion({ number: 3, turnId: 'm2', partIndex: 1 }),
      makeVersion({ number: 4, turnId: 'm2', partIndex: 2 }),
    ];
    s.meta.nextVersionNumber = 5;

    const out = applyResponse(s, imagesResponse({ trimmedTurnIds: [] }), ctx({}, 'u3'));

    expect(out.newVersionNumbers).toEqual([5]);
    expect(out.batch.meta.nextVersionNumber).toBe(6);
  });

  it('FR-45 / AC-24 / AC-29: the notice counts V (generated images in removed model turns), M (removed turns), I (images attached to removed user turns)', async () => {
    const { applyResponse } = await mod();
    const snap = threePairs();
    snap.turns[3] = turn('m2', 'model', inlineImagePart('image/png', PNG_B64), inlineImagePart('image/png', PNG_B64));
    snap.meta.versions = [
      makeVersion({ number: 1, turnId: 'm1' }),
      makeVersion({ number: 2, turnId: 'm2', partIndex: 0 }),
      makeVersion({ number: 3, turnId: 'm2', partIndex: 1 }),
      makeVersion({ number: 4, turnId: 'm3' }),
    ];
    snap.meta.nextVersionNumber = 5;
    // Remove the pairs (m1,u2) and (m2,u3): 4 turns, 3 generated images (v1,v2,v3), 3 attached images (x on u2; y,z on u3).
    const out = applyResponse(snap, imagesResponse({ trimmedTurnIds: ['m1', 'u2', 'm2', 'u3'] }), ctx({}, 'u4'));

    expect(out.notice).toEqual({ V: 3, M: 4, I: 3 });
  });

  it('FR-45: no notice (null) when trimmedTurnIds is empty', async () => {
    const { applyResponse } = await mod();
    expect(applyResponse(threePairs(), imagesResponse(), ctx({}, 'u4')).notice).toBeNull();
  });

  it('FR-44: ids that are not in the local session are ignored and are not counted in the notice', async () => {
    const { applyResponse } = await mod();

    const out = applyResponse(threePairs(), imagesResponse({ trimmedTurnIds: ['m1', 'u2', 'ghost-1', 'ghost-2'] }), ctx({}, 'u4'));

    expect(out.batch.deleteTurnIds.sort()).toEqual(['m1', 'u2']);
    expect(out.notice).toEqual({ V: 1, M: 2, I: 1 });
  });

  it('SD-27: the id of the NEW user turn (not in the snapshot) cannot be deleted by the same response', async () => {
    const { applyResponse } = await mod();

    const out = applyResponse(threePairs(), imagesResponse({ trimmedTurnIds: ['u4'] }), ctx({}, 'u4'));

    expect(out.batch.deleteTurnIds).toEqual([]);
    expect(out.batch.meta.turnOrder.slice(-2)[0]).toBe('u4');
  });

  it.each([
    ['the first user turn', ['u1']],
    ['the model turn holding the latest version', ['m3']],
    ['a protected turn mixed into a valid list', ['m1', 'u2', 'u1']],
  ])('FR-44 / D-6: a response listing %s is an invalid response: nothing is applied', async (_label, ids) => {
    const { applyResponse } = await mod();
    let thrown: any;
    try { applyResponse(threePairs(), imagesResponse({ trimmedTurnIds: ids as string[] }), ctx({}, 'u4')); } catch (e) { thrown = e; }
    expect(thrown).toBeInstanceOf(Error);
    expect(thrown.name).toBe('InvalidResponseError');
  });

  it('FR-44 / D-6: the guard applies to text and safety replies too', async () => {
    const { applyResponse } = await mod();
    for (const response of [textResponse('no', ['u1']), safetyResponse('SAFETY', ['m3'])]) {
      let thrown: any;
      try { applyResponse(threePairs(), response, ctx({}, 'u4')); } catch (e) { thrown = e; }
      expect(thrown?.name).toBe('InvalidResponseError');
    }
  });
});

describe('applyResponse: text and safety replies are non-history events (FR-36, FR-62, FR-63, D-6)', () => {
  it.each([
    ['text', textResponse('I cannot draw that, but here is a tip.')],
    ['safety', safetyResponse('IMAGE_SAFETY')],
  ])('FR-36: a %s reply with no cut commits nothing and creates no turn, version or cost', async (kind, response) => {
    const { applyResponse } = await mod();
    const snap = makeSession('s1', { pairs: 2, costUsd: 0.06 });

    const out = applyResponse(snap, response, ctx({}, 'u3'));

    expect(out.kind).toBe(kind);
    expect(out.batch).toBeNull();
    expect(out.newVersionNumbers).toEqual([]);
    expect(out.modelTurnId).toBeNull();
    expect(out.notice).toBeNull();
  });

  it.each([
    ['text', textResponse('words', ['m1', 'u2'])],
    ['safety', safetyResponse('PROHIBITED_CONTENT', ['m1', 'u2'])],
  ])('D-6 / FR-44: a %s reply still applies the cut (and only the cut) in one batch', async (_kind, response) => {
    const { applyResponse } = await mod();
    const snap = threePairs();

    const out = applyResponse(snap, response, ctx({}, 'u4'));

    expect(out.batch.putTurns).toEqual([]);
    expect(out.batch.deleteTurnIds.sort()).toEqual(['m1', 'u2']);
    expect(out.batch.meta.turnOrder).toEqual(['u1', 'm2', 'u3', 'm3']);
    expect(out.batch.meta.costUsd).toBe(snap.meta.costUsd);
    expect(out.batch.meta.nextVersionNumber).toBe(snap.meta.nextVersionNumber);
    expect(out.batch.meta.versions.map((v: any) => v.number)).toEqual([2, 3]);
    expect(out.batch.meta.lastActivity).toBe(NOW); // a cut is activity (SD-32)
    expect(out.notice).toEqual({ V: 1, M: 2, I: 1 });
  });

  it('FR-45: the T-9 counts are computed from the one list of the response, once, even for a safety reply', async () => {
    const { applyResponse } = await mod();
    const out = applyResponse(threePairs(), safetyResponse('SAFETY', ['m1', 'u2']), ctx({}, 'u4'));
    expect(Object.keys(out.notice).sort()).toEqual(['I', 'M', 'V']);
  });
});


/**
 * request-builder.spec.ts - US-10.1, task T28 (FR-18, FR-25, FR-34, FR-35, FR-37, SD-27; AC-8, AC-21 request part, AC-22 request part).
 *
 * Runner: test:logic. The module under test (src/utils/image-studio/request-builder.ts) does not exist yet, so it is
 * loaded at run time inside each test (one named failure per test instead of one collection error).
 *
 * PINNED CONTRACT (the plan names the module and its job, not its signature; the builder must follow this):
 *
 *   buildGenerateRequest(snapshot: StoredSession, input: BuildInput): { request: GenerateRequest; protectedTurnIds: string[] }
 *
 *   BuildInput = {
 *     newTurnId: string;                       // id of the new user turn (from the IdSource, SD-20)
 *     text?: string;                           // the composer text, verbatim (a part only when it has non-whitespace)
 *     chipId?: 'remove-background' | 'brighter' | 'softer-shadow' | 'different-angle';  // quick-edit chip (FR-31)
 *     uploads?: Array<{ fileUri: string; mimeType: string }>;   // user uploads, ALREADY on the Files API (FR-16)
 *     attachedVersion?: { mimeType: string; data: string };     // FR-37: inline base64, never a file_uri
 *     model: string; aspectRatio: string; resolution: string; presetId?: string;
 *   }
 *   GenerateRequest = { model, aspectRatio, resolution, presetId?, history: Turn[], newTurn: { id: string; parts: Part[] } }
 *
 *   - `snapshot` is the session as it is BEFORE any append (SD-27). The function never mutates it and the returned request
 *     shares no object with it (a later append to the snapshot cannot change the request).
 *   - `history` = the snapshot turns in `meta.turnOrder` order, parts untouched (FR-35).
 *   - newTurn.parts order (FR-25): text part (when present), one fileData part per upload, the attached version inline.
 *   - A message with neither non-whitespace text, nor an upload, nor an attached version (nor a chip) throws an Error whose
 *     `name` is 'EmptyMessageError' (FR-18). No filler text is ever invented.
 *   - `protectedTurnIds` = [first user turn id, id of the model turn holding the latest version] (Definitions, FR-42); [] for an
 *     empty session. A multi-image model turn is one id (protected whole).
 *
 * NOT asserted (waived, W-1 / OD-20): AC-20 "the rest of the composition is preserved" - a model-quality property.
 */
import { describe, it, expect } from 'vitest';
import {
  makeSession, turn, textPart, inlineImagePart, filePart, makeVersion, toBase64, makeRaster, containsBytes,
  type StoredSession, type Part,
} from '../../../test/image-studio/helpers/fakes';
import { BUILD_BASE, PNG_B64 } from '../../../test/image-studio/helpers/core-fixtures';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const mod = () => load('./request-builder');

const kindOf = (p: Part) => (p.text !== undefined ? 'text' : p.fileData ? 'fileData' : p.inlineData ? 'inlineData' : 'other');

/** u1 m1 u2 m2 where u1 carries a file_uri original and m2 carries a thoughtSignature and a thought part. */
function sessionWithHistory(): StoredSession {
  const s = makeSession('s1', { pairs: 2 });
  s.turns[0] = turn('u1', 'user', textPart('make it white'), filePart('files/orig-1', 'image/jpeg'));
  s.turns[3] = turn('m2', 'model',
    { text: 'thinking about it', thought: true, thoughtSignature: 'th-sig' },
    { inlineData: { mimeType: 'image/png', data: PNG_B64 }, thoughtSignature: 'sig-2' },
  );
  s.meta.versions[1] = makeVersion({ number: 2, turnId: 'm2', partIndex: 1 });
  return s;
}

describe('buildGenerateRequest: history (FR-35, AC-21)', () => {
  it('FR-35 / AC-21: carries every retained turn unmodified, including thoughtSignature, thought parts, fileData and inline versions', async () => {
    const { buildGenerateRequest } = await mod();
    const snap = sessionWithHistory();
    const before = structuredClone(snap);

    const { request } = buildGenerateRequest(snap, { ...BUILD_BASE, newTurnId: 'u3', text: 'softer shadow' });

    expect(request.history).toEqual(before.turns);
    expect(request.history[0].parts[1]).toEqual({ fileData: { fileUri: 'files/orig-1', mimeType: 'image/jpeg' } });
    expect(request.history[3].parts[0]).toEqual({ text: 'thinking about it', thought: true, thoughtSignature: 'th-sig' });
    expect(request.history[3].parts[1].thoughtSignature).toBe('sig-2');
    expect(snap).toEqual(before);
  });

  it('FR-35: follows meta.turnOrder, not the order of the stored turns array', async () => {
    const { buildGenerateRequest } = await mod();
    const snap = makeSession('s1', { pairs: 2 });
    snap.turns.reverse();

    const { request } = buildGenerateRequest(snap, { ...BUILD_BASE, newTurnId: 'u3', text: 'again' });

    expect(request.history.map((t: any) => t.id)).toEqual(['u1', 'm1', 'u2', 'm2']);
  });

  it('FR-25: carries model, aspect ratio, resolution and the preset id when a preset was used, and omits presetId otherwise', async () => {
    const { buildGenerateRequest } = await mod();
    const snap = makeSession('s1', { pairs: 0 });

    const withPreset = buildGenerateRequest(snap, { ...BUILD_BASE, newTurnId: 'u1', text: 'a mug', presetId: 'white-bg' }).request;
    const without = buildGenerateRequest(snap, { ...BUILD_BASE, newTurnId: 'u1', text: 'a mug' }).request;

    expect(withPreset).toMatchObject({ model: 'gemini-3.1-flash-image', aspectRatio: '1:1', resolution: '1K', presetId: 'white-bg' });
    expect(without.presetId).toBeUndefined();
    expect(without.history).toEqual([]);
  });
});

describe('buildGenerateRequest: the new turn (FR-18, FR-25, FR-37)', () => {
  it('FR-34 / AC-20 request shape: a text-only correction in a session holding v2 sends v2 as the model turn image plus the new text', async () => {
    const { buildGenerateRequest } = await mod();
    const snap = makeSession('s1', { pairs: 2 });

    const { request } = buildGenerateRequest(snap, { ...BUILD_BASE, newTurnId: 'u3', text: 'make the shadow softer' });

    const lastModel = request.history[request.history.length - 1];
    expect(lastModel.role).toBe('model');
    expect(lastModel.id).toBe('m2');
    expect(lastModel.parts[0].inlineData.mimeType).toBe('image/png');
    expect(lastModel.parts[0].thoughtSignature).toBe('sig-2');
    expect(request.newTurn).toEqual({ id: 'u3', parts: [{ text: 'make the shadow softer' }] });
  });

  it('FR-18 / AC-8: a text-only turn (text-to-image) holds exactly one text part', async () => {
    const { buildGenerateRequest } = await mod();
    const { request } = buildGenerateRequest(makeSession('s1'), { ...BUILD_BASE, newTurnId: 'u1', text: 'a red cube' });
    expect(request.newTurn.parts.map(kindOf)).toEqual(['text']);
  });

  it('FR-18 / AC-8: text plus images orders the parts text, then file_uri uploads, then the attached version inline', async () => {
    const { buildGenerateRequest } = await mod();
    const { request } = buildGenerateRequest(makeSession('s1', { pairs: 1 }), {
      ...BUILD_BASE, newTurnId: 'u2', text: 'combine them',
      uploads: [{ fileUri: 'files/a', mimeType: 'image/png' }, { fileUri: 'files/b', mimeType: 'image/webp' }],
      attachedVersion: { mimeType: 'image/png', data: PNG_B64 },
    });

    expect(request.newTurn.parts.map(kindOf)).toEqual(['text', 'fileData', 'fileData', 'inlineData']);
    expect(request.newTurn.parts[1]).toEqual({ fileData: { fileUri: 'files/a', mimeType: 'image/png' } });
    expect(request.newTurn.parts[3]).toEqual({ inlineData: { mimeType: 'image/png', data: PNG_B64 } });
  });

  it('FR-18 (D-34, OD-46): an images-only turn builds with image parts and NO text part', async () => {
    const { buildGenerateRequest } = await mod();
    const { request } = buildGenerateRequest(makeSession('s1'), {
      ...BUILD_BASE, newTurnId: 'u1', text: '', uploads: [{ fileUri: 'files/a', mimeType: 'image/png' }],
    });

    expect(request.newTurn.parts).toEqual([{ fileData: { fileUri: 'files/a', mimeType: 'image/png' } }]);
    expect(request.newTurn.parts.some((p: Part) => 'text' in p)).toBe(false);
  });

  it('FR-18 (D-34): an attached-version-only message ("Edit this version" with no text) is a valid turn', async () => {
    const { buildGenerateRequest } = await mod();
    const { request } = buildGenerateRequest(makeSession('s1', { pairs: 1 }), {
      ...BUILD_BASE, newTurnId: 'u2', attachedVersion: { mimeType: 'image/png', data: PNG_B64 },
    });
    expect(request.newTurn.parts.map(kindOf)).toEqual(['inlineData']);
  });

  it.each([[''], ['   '], ['\n\t  ']])('FR-18: a whitespace-only message (%j) with no image is refused and nothing is built', async (text) => {
    const { buildGenerateRequest } = await mod();
    let thrown: any;
    try { buildGenerateRequest(makeSession('s1'), { ...BUILD_BASE, newTurnId: 'u1', text }); } catch (e) { thrown = e; }
    expect(thrown).toBeInstanceOf(Error);
    expect(thrown.name).toBe('EmptyMessageError');
  });

  it('FR-18 (D-34): whitespace-only text next to an image adds no text part', async () => {
    const { buildGenerateRequest } = await mod();
    const { request } = buildGenerateRequest(makeSession('s1'), {
      ...BUILD_BASE, newTurnId: 'u1', text: '   ', uploads: [{ fileUri: 'files/a', mimeType: 'image/png' }],
    });
    expect(request.newTurn.parts.map(kindOf)).toEqual(['fileData']);
  });

  it('FR-37 / AC-22: the attached version is sent inline as base64 and never as a file_uri', async () => {
    const { buildGenerateRequest } = await mod();
    const png = toBase64(makeRaster({ format: 'png', width: 2048, height: 2048 }));
    const { request } = buildGenerateRequest(makeSession('s1', { pairs: 1 }), {
      ...BUILD_BASE, newTurnId: 'u2', text: 'new background', attachedVersion: { mimeType: 'image/png', data: png },
    });

    const inline = request.newTurn.parts.filter((p: Part) => p.inlineData);
    expect(inline).toHaveLength(1);
    expect(inline[0].inlineData.data).toBe(png);
    expect(request.newTurn.parts.some((p: Part) => p.fileData)).toBe(false);
  });

  it('FR-10 / FR-37: five uploads plus an attached version build (the attached version is outside the five)', async () => {
    const { buildGenerateRequest } = await mod();
    const uploads = [1, 2, 3, 4, 5].map((n) => ({ fileUri: `files/u${n}`, mimeType: 'image/png' }));

    const { request } = buildGenerateRequest(makeSession('s1', { pairs: 1 }), {
      ...BUILD_BASE, newTurnId: 'u2', text: 'mix', uploads, attachedVersion: { mimeType: 'image/png', data: PNG_B64 },
    });

    expect(request.newTurn.parts.filter((p: Part) => p.fileData)).toHaveLength(5);
    expect(request.newTurn.parts.filter((p: Part) => p.inlineData)).toHaveLength(1);
  });

  it("FR-31 / SD-21: a chip sends the English model-facing instruction whatever the UI language ('Make the shadow softer.')", async () => {
    const { buildGenerateRequest } = await mod();
    const { request } = buildGenerateRequest(makeSession('s1', { pairs: 1 }), {
      ...BUILD_BASE, newTurnId: 'u2', chipId: 'softer-shadow',
    });
    expect(request.newTurn.parts).toEqual([{ text: 'Make the shadow softer.' }]);
  });
});

describe('buildGenerateRequest: protected set and snapshot discipline (SD-27, FR-42)', () => {
  it('FR-42: the protected set is the first user turn and the model turn holding the latest version', async () => {
    const { buildGenerateRequest } = await mod();
    const { protectedTurnIds } = buildGenerateRequest(makeSession('s1', { pairs: 3 }), { ...BUILD_BASE, newTurnId: 'u4', text: 'x' });
    expect(protectedTurnIds).toEqual(['u1', 'm3']);
  });

  it('FR-42 (OD-30 C-30.3): a model turn holding several images is protected whole, as one id', async () => {
    const { buildGenerateRequest } = await mod();
    const s = makeSession('s1', { pairs: 2 });
    s.turns[3] = turn('m2', 'model', inlineImagePart('image/png', PNG_B64), inlineImagePart('image/png', PNG_B64));
    s.meta.versions = [
      makeVersion({ number: 1, turnId: 'm1' }),
      makeVersion({ number: 2, turnId: 'm2', partIndex: 0 }),
      makeVersion({ number: 3, turnId: 'm2', partIndex: 1 }),
    ];

    const { protectedTurnIds } = buildGenerateRequest(s, { ...BUILD_BASE, newTurnId: 'u3', text: 'x' });

    expect(protectedTurnIds).toEqual(['u1', 'm2']);
  });

  it('FR-42: an empty session has an empty protected set (the new turn is outside trimming)', async () => {
    const { buildGenerateRequest } = await mod();
    expect(buildGenerateRequest(makeSession('s1'), { ...BUILD_BASE, newTurnId: 'u1', text: 'x' }).protectedTurnIds).toEqual([]);
  });

  it('SD-27: a request built before an append is unchanged by a later append to the snapshot', async () => {
    const { buildGenerateRequest } = await mod();
    const snap = sessionWithHistory();
    const { request } = buildGenerateRequest(snap, { ...BUILD_BASE, newTurnId: 'u3', text: 'x' });
    const frozen = structuredClone(request);

    snap.turns.push(turn('u3', 'user', textPart('x')), turn('m3', 'model', inlineImagePart('image/png', PNG_B64)));
    snap.meta.turnOrder.push('u3', 'm3');
    (snap.turns[0].parts[0] as Part).text = 'MUTATED';
    (snap.turns[3].parts[1] as Part).thoughtSignature = 'MUTATED';

    expect(request).toEqual(frozen);
    expect(request.history).toHaveLength(4);
    expect(containsBytes(new TextEncoder().encode(JSON.stringify(request)), 'MUTATED')).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// US-10.5 T4 - stored display metadata never rides in the resend payload (plan DD-4; Specification FR-23, FR-17 rule 5, NFR-1).
// A sibling block; the L64 `toEqual(before.turns)` case above stays green because a turn without extras is unchanged.
// Logic runner; red until T4.
// ---------------------------------------------------------------------------------------------------------------------
describe('US-10.5 FR-23 / NFR-1: history is the {id, role, parts} projection of the stored turns (T4)', () => {
  function sessionWithExtras(): StoredSession {
    const s = makeSession('s1', { pairs: 2 });
    Object.assign(s.turns[1], { cost: 0.067, durationMs: 12_400, presetId: 'white-bg', inputRefs: [{ turnId: 'u1', partIndex: 0 }], futureField: 'x' });
    Object.assign(s.turns[3], { cost: 0.03, durationMs: 800 });
    return s;
  }

  it('a turn seeded with every extra produces a history entry with exactly the keys id, role and parts', async () => {
    const { buildGenerateRequest } = await mod();
    const snap = sessionWithExtras();
    const { request } = buildGenerateRequest(snap, { ...BUILD_BASE, newTurnId: 'u3', text: 'again' });
    for (const entry of request.history) expect(Object.keys(entry).sort()).toEqual(['id', 'parts', 'role']);
    expect(request.history.map((t: any) => t.id)).toEqual(['u1', 'm1', 'u2', 'm2']);
  });

  it('the history equals the {id, role, parts} projection of the stored turns, parts byte for byte', async () => {
    const { buildGenerateRequest } = await mod();
    const snap = sessionWithExtras();
    const { request } = buildGenerateRequest(snap, { ...BUILD_BASE, newTurnId: 'u3', text: 'again' });
    expect(request.history).toEqual(snap.turns.map((t) => ({ id: t.id, role: t.role, parts: t.parts })));
  });

  it('building the request does not modify the stored session (the extras stay stored)', async () => {
    const { buildGenerateRequest } = await mod();
    const snap = sessionWithExtras();
    const before = structuredClone(snap);
    buildGenerateRequest(snap, { ...BUILD_BASE, newTurnId: 'u3', text: 'again' });
    expect(snap).toEqual(before);
    expect((snap.turns[1] as unknown as Record<string, unknown>)['cost']).toBe(0.067);
  });

  it('the serialised request body contains none of the extra values (no cost, duration, stored preset id or references leak)', async () => {
    const { buildGenerateRequest } = await mod();
    const { request } = buildGenerateRequest(sessionWithExtras(), { ...BUILD_BASE, newTurnId: 'u3', text: 'again' });
    const body = JSON.stringify(request);
    expect(body).not.toContain('durationMs');
    expect(body).not.toContain('inputRefs');
    expect(body).not.toContain('12400');
    expect(body).not.toContain('futureField');
  });
});


// ---------------------------------------------------------------------------------------------------------------------
// US-10.6 T20 - the image count and the empty-history derived turn (FR-1, FR-3, FR-4, FR-6; AC-1, AC-2, AC-3). New describes only.
//
// PINNED CONTRACT (plan 7.2, breakdown T20): BuildInput gains
//   imageCount?: number      emitted on the request ONLY when greater than 1 (a one-image request is byte-identical to today)
//   omitHistory?: boolean    the request carries an EMPTY history; the new turn is built as always (text, uploads, then the attached version inline)
// ---------------------------------------------------------------------------------------------------------------------
describe('buildGenerateRequest: imageCount is emitted only when greater than 1 (T20)', () => {
  const base = { newTurnId: 'n-new', text: 'a white mug', model: 'gemini-3.1-flash-image', aspectRatio: '1:1', resolution: '1K' };

  it('FR-4 / AC-3: imageCount 2 and 4 are carried on the request', async () => {
    const { buildGenerateRequest } = await mod();
    for (const n of [2, 4]) expect(buildGenerateRequest(makeSession('s1', { pairs: 1 }), { ...base, imageCount: n }).request.imageCount, `n=${n}`).toBe(n);
  });

  it('FR-4: imageCount 1 and an omitted imageCount leave NO imageCount key - the request is byte-identical to a request built without the field [characterization]', async () => {
    const { buildGenerateRequest } = await mod();
    const snap = makeSession('s1', { pairs: 1 });
    const plain = buildGenerateRequest(snap, base).request;
    const one = buildGenerateRequest(snap, { ...base, imageCount: 1 }).request;
    expect('imageCount' in plain).toBe(false);
    expect('imageCount' in one).toBe(false);
    expect(JSON.stringify(one)).toBe(JSON.stringify(plain));
  });

  it('FR-4: imageCount does not alter the history, the parts or the protected set [characterization]', async () => {
    const { buildGenerateRequest } = await mod();
    const snap = makeSession('s1', { pairs: 2 });
    const plain = buildGenerateRequest(snap, base);
    const four = buildGenerateRequest(snap, { ...base, imageCount: 4 });
    expect(four.request.history).toEqual(plain.request.history);
    expect(four.request.newTurn).toEqual(plain.request.newTurn);
    expect(four.protectedTurnIds).toEqual(plain.protectedTurnIds);
  });
});

describe('buildGenerateRequest: omitHistory builds the derived-action request (T20)', () => {
  const source = { mimeType: 'image/png', data: PNG_B64 };
  const base = { newTurnId: 'n-new', model: 'gemini-3-pro-image', aspectRatio: '4:5', resolution: '4K' };

  it('FR-1 / AC-1: with omitHistory the history is EMPTY even when the session has turns, and the new turn holds the source version inline', async () => {
    const { buildGenerateRequest } = await mod();
    const snap = makeSession('s1', { pairs: 3 });
    const { request } = buildGenerateRequest(snap, { ...base, omitHistory: true, attachedVersion: source });
    expect(request.history).toEqual([]);
    expect(request.newTurn.parts).toEqual([{ inlineData: source }]);
    expect(request.resolution).toBe('4K');
    expect(request.model).toBe('gemini-3-pro-image');
  });

  it('FR-3 / AC-2: with text the new turn is the text part then the source inline (the existing order: text, uploads, attached version)', async () => {
    const { buildGenerateRequest } = await mod();
    const { request } = buildGenerateRequest(makeSession('s1', { pairs: 2 }), { ...base, text: 'a white mug', omitHistory: true, attachedVersion: source });
    expect(request.history).toEqual([]);
    expect(request.newTurn.parts).toEqual([{ text: 'a white mug' }, { inlineData: source }]);
  });

  it('an image-only derived turn is valid - no EmptyMessageError and no invented filler text [characterization]', async () => {
    const { buildGenerateRequest } = await mod();
    expect(() => buildGenerateRequest(makeSession('s1', { pairs: 1 }), { ...base, omitHistory: true, attachedVersion: source })).not.toThrow();
  });

  it('without omitHistory the history is every retained turn as before [characterization]', async () => {
    const { buildGenerateRequest } = await mod();
    const { request } = buildGenerateRequest(makeSession('s1', { pairs: 3 }), { ...base, attachedVersion: source });
    expect(request.history.map((t: any) => t.id)).toEqual(['u1', 'm1', 'u2', 'm2', 'u3', 'm3']);
  });

  it('omitHistory never mutates the snapshot and the request shares no object with it [characterization]', async () => {
    const { buildGenerateRequest } = await mod();
    const snap = makeSession('s1', { pairs: 2 });
    const before = structuredClone(snap);
    const { request } = buildGenerateRequest(snap, { ...base, omitHistory: true, attachedVersion: source });
    request.newTurn.parts.push({ text: 'appended' });
    expect(snap).toEqual(before);
  });

  it('omitHistory + imageCount: a Variation request is empty-history, source inline, imageCount carried', async () => {
    const { buildGenerateRequest } = await mod();
    const { request } = buildGenerateRequest(makeSession('s1', { pairs: 1 }), { ...base, resolution: '2K', text: 'prompt 1', imageCount: 2, omitHistory: true, attachedVersion: source });
    expect(request.history).toEqual([]);
    expect(request.imageCount).toBe(2);
    expect(request.newTurn.parts).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// US-10.6 T21 - the Style-ref sentence, ONLY the placement-independent part (FR-13, FR-14; AC-9; plan 7.2 and 7.4).
//
// PINNED CONTRACT: BuildInput.uploads entries gain `role?: 'product' | 'style-ref'`; buildGenerateRequest additionally returns `styleRefPartIndex`
// (the index in newTurn.parts of the ONE Style ref image part; absent when there is none). The sentence is STYLE_REF_INSTRUCTION (T10), sent as a
// text part of the same turn next to its image. No role field is ever placed on a Part.
//
// SM-2 is RULED (2026-11-14): the sentence goes immediately AFTER its image part, so its index is styleRefPartIndex + 1.
// ---------------------------------------------------------------------------------------------------------------------
describe('buildGenerateRequest: the Style-ref sentence immediately AFTER its image, SM-2 (T21)', () => {
  const style = { fileUri: 'files/style', mimeType: 'image/jpeg', role: 'style-ref' };
  const prod = { fileUri: 'files/prod', mimeType: 'image/png', role: 'product' };
  const base = { newTurnId: 'n-new', text: 'a white mug', model: 'gemini-3.1-flash-image', aspectRatio: '1:1', resolution: '1K' };
  const SENTENCE = 'Use this image purely as a stylistic reference, do not copy the product from it';

  it('AC-9 / SM-2: a request with a Style ref image contains the AC-9 sentence exactly once, as the text part immediately AFTER the Style ref image part', async () => {
    const { buildGenerateRequest } = await mod();
    const out = buildGenerateRequest(makeSession('s1', { pairs: 1 }), { ...base, uploads: [prod, style] });
    const parts = out.request.newTurn.parts;
    const sentenceAt = parts.map((p: Part, i: number) => (p.text === SENTENCE ? i : -1)).filter((i: number) => i >= 0);
    expect(sentenceAt).toHaveLength(1);
    expect(typeof out.styleRefPartIndex).toBe('number');
    expect(parts[out.styleRefPartIndex].fileData?.fileUri).toBe('files/style');
    expect(sentenceAt[0]).toBe(out.styleRefPartIndex + 1); // SM-2 (owner ruling 2026-11-14): the sentence goes immediately AFTER its image part
  });

  it('SM-2: when the Style ref image comes FIRST the order is text, Style ref image, sentence, Product image - the sentence still follows its own image directly', async () => {
    const { buildGenerateRequest } = await mod();
    const out = buildGenerateRequest(makeSession('s1', { pairs: 1 }), { ...base, uploads: [style, prod] });
    const parts = out.request.newTurn.parts;
    expect(out.styleRefPartIndex).toBe(1);
    expect(parts.map((p: Part) => p.text ?? p.fileData?.fileUri)).toEqual(['a white mug', 'files/style', SENTENCE, 'files/prod']);
  });

  it('AC-9: the sentence is the one exported by the prompt-core file (English, whatever the UI language)', async () => {
    const instructions = await load('../../prompt-core/image-studio-instructions');
    expect(instructions.STYLE_REF_INSTRUCTION).toBe(SENTENCE);
    const { buildGenerateRequest } = await mod();
    const out = buildGenerateRequest(makeSession('s1', { pairs: 1 }), { ...base, uploads: [style] });
    expect(out.request.newTurn.parts.some((p: Part) => p.text === instructions.STYLE_REF_INSTRUCTION)).toBe(true);
  });

  it('FR-13: the composer text stays and the Product image gets NO instruction - only the Style ref image does', async () => {
    const { buildGenerateRequest } = await mod();
    const parts = buildGenerateRequest(makeSession('s1', { pairs: 1 }), { ...base, uploads: [prod, style] }).request.newTurn.parts;
    expect(parts.filter((p: Part) => p.text === 'a white mug')).toHaveLength(1);
    expect(parts.filter((p: Part) => p.fileData?.fileUri === 'files/prod')).toHaveLength(1);
    expect(parts.filter((p: Part) => typeof p.text === 'string')).toHaveLength(2);
  });

  it('FR-13: a request with no Style ref image does not contain the sentence and reports no styleRefPartIndex [characterization]', async () => {
    const { buildGenerateRequest } = await mod();
    const out = buildGenerateRequest(makeSession('s1', { pairs: 1 }), { ...base, uploads: [prod] });
    expect(JSON.stringify(out.request)).not.toContain('stylistic reference');
    expect(out.styleRefPartIndex).toBeUndefined();
  });

  it('S3 / FR-13 (c): NO part sent to the model carries a role field - the Product and Style ref uploads are plain fileData parts with only fileUri and mimeType [characterization]', async () => {
    const { buildGenerateRequest } = await mod();
    const parts = buildGenerateRequest(makeSession('s1', { pairs: 1 }), { ...base, uploads: [prod, style] }).request.newTurn.parts;
    for (const part of parts) {
      expect(Object.keys(part), JSON.stringify(part)).not.toContain('role');
      if (part.fileData) {
        expect(Object.keys(part)).toEqual(['fileData']);
        expect(Object.keys(part.fileData).sort()).toEqual(['fileUri', 'mimeType']);
      }
    }
  });

  it('FR-14 / S3: the stored Turn-level tag never rides into history - a stored user turn with styleRefPartIndex is projected to { id, role, parts } only [characterization]', async () => {
    const { buildGenerateRequest } = await mod();
    const snap = makeSession('s1', { pairs: 1 });
    (snap.turns[0] as any).styleRefPartIndex = 1;
    const history = buildGenerateRequest(snap, { newTurnId: 'n2', text: 'next', model: 'gemini-3.1-flash-image', aspectRatio: '1:1', resolution: '1K' }).request.history;
    expect(Object.keys(history[0]).sort()).toEqual(['id', 'parts', 'role']);
  });
});

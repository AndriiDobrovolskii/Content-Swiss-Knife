/**
 * US-10.5 T11 + T12 - buildFeed: the pure view model of the results feed (plan DD-2, DD-7; Specification FR-3, FR-4, FR-9,
 * FR-13 ratified, FR-23 validity table ratified, FR-25).
 *
 * PINNED CONTRACT (src/utils/image-studio/feed.ts, owners T11 then T12; pure; imports no preset registry and no Date):
 *   buildFeed(session: StoredSession, deps: { isKnownPresetId(id: string): boolean }): { cards: FeedCard[]; mainVersionNumber: number | null }
 *   FeedCard = {
 *     key: string                    the model turn id
 *     prompt: string                 the card's first version prompt, trimmed ('' means no Reuse button)
 *     aspectRatio, resolution, model strings from the card's versions
 *     presetId?: string              only when valid AND deps.isKnownPresetId(id); otherwise the key is absent
 *     thumbs: Array<{ turnId: string; partIndex: number }>        T12: validated, non-dangling input references
 *     summary: { count: number; cost?: number; durationMs?: number }   count = versions of this turn (text parts never add)
 *     items: Array<{ kind: 'text'; text: string } | { kind: 'image'; versionNumber: number }>   API part order; thought parts and blank text excluded
 *     images: Array<{ number: number; partIndex: number; editOf?: { n: number; sourceRetained: boolean } }>   T12
 *     holdsMain: boolean             true only on the card of the retained version with the highest number
 *   }
 * Cards are oldest first. A user turn without a stored model turn yields no card (R-6). Every optional field is read through the
 * T2 readers on every build: an invalid value is "absent", never an error.
 *
 * Two top-level describe groups, selectable by `-t "\(T11\)"` and `-t "\(T12\)"` (breakdown rule R2). The module is loaded
 * dynamically so a missing module fails each case on its own and the groups can be selected one task at a time.
 * Logic runner. Red until T11 / T12.
 */
import { describe, it, expect } from 'vitest';
import {
  makeSession, turn, textPart, filePart, inlineImagePart, makeRaster, toBase64, makeIdSource,
  type StoredSession,
} from '../../../test/image-studio/helpers/fakes';
import { mixedTextImageSession, withTurnExtras, withVersionFields } from '../../../test/image-studio/helpers/sessions';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const KNOWN = ['white-bg', 'lifestyle', 'banner', 'social', 'detail-closeup'];
const deps = { isKnownPresetId: (id: string) => KNOWN.includes(id) };
const feed = async (s: StoredSession) => {
  const { buildFeed } = await load('./feed');
  return buildFeed(s, deps);
};
const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

describe('FR-3 / FR-13: buildFeed cards (T11)', () => {
  it('one card per stored model turn, oldest first, keyed by the model turn id', async () => {
    const out = await feed(makeSession('s1', { pairs: 3 }));
    expect(out.cards.map((c: any) => c.key)).toEqual(['m1', 'm2', 'm3']);
  });

  it('a session with no turn has no card and no main version', async () => {
    const out = await feed(makeSession('s1'));
    expect(out.cards).toEqual([]);
    expect(out.mainVersionNumber).toBeNull();
  });

  it('R-6: a user turn without a stored model turn (an orphan) yields no card', async () => {
    const s = makeSession('s1', { pairs: 1 });
    s.turns.push(turn('u2', 'user', textPart('orphan')));
    s.meta.turnOrder.push('u2');
    expect((await feed(s)).cards.map((c: any) => c.key)).toEqual(['m1']);
  });

  it('the card carries the trimmed first-version prompt, aspect ratio, resolution and model', async () => {
    const s = makeSession('s1', { pairs: 1 });
    Object.assign(s.meta.versions[0], { prompt: '  red mug  ', aspectRatio: '4:5', resolution: '2K', model: 'gemini-3-pro-image' });
    const [card] = (await feed(s)).cards;
    expect(card.prompt).toBe('red mug');
    expect(card.aspectRatio).toBe('4:5');
    expect(card.resolution).toBe('2K');
    expect(card.model).toBe('gemini-3-pro-image');
  });

  it('an images-only send (blank prompt) gives an empty card prompt, which is what hides "Reuse prompt"', async () => {
    const s = makeSession('s1', { pairs: 1 });
    s.meta.versions[0].prompt = '';
    expect((await feed(s)).cards[0].prompt).toBe('');
  });

  it('FR-3 (g): items are text and image in API order; thought parts and blank text are excluded', async () => {
    const s = mixedTextImageSession();
    s.turns[1].parts.splice(1, 0, textPart('   '));
    s.meta.versions[0].partIndex = 2;
    s.meta.versions[1].partIndex = 5;
    const [card] = (await feed(s)).cards;
    expect(card.items).toEqual([
      { kind: 'text', text: 'FIRST-TEXT' },
      { kind: 'image', versionNumber: 1 },
      { kind: 'text', text: 'SECOND-TEXT' },
      { kind: 'image', versionNumber: 2 },
    ]);
  });

  it('FR-3 rule 2 / FR-4: model text parts add no unit to summary.count and no tile: two images and two text parts give count 2', async () => {
    const [card] = (await feed(mixedTextImageSession())).cards;
    expect(card.summary.count).toBe(2);
    expect(card.items.filter((i: any) => i.kind === 'image')).toHaveLength(2);
  });

  it('FR-13: the main version is the retained version with the HIGHEST number, and only its card holds main', async () => {
    const out = await feed(makeSession('s1', { pairs: 3 }));
    expect(out.mainVersionNumber).toBe(3);
    expect(out.cards.map((c: any) => c.holdsMain)).toEqual([false, false, true]);
  });

  it('FR-13: with one version that card holds main', async () => {
    const out = await feed(makeSession('s1', { pairs: 1 }));
    expect(out.mainVersionNumber).toBe(1);
    expect(out.cards[0].holdsMain).toBe(true);
  });

  it('FR-13: after a cut removed the middle turns the highest RETAINED number still holds main', async () => {
    const s = makeSession('s1', { pairs: 4 });
    s.turns = s.turns.filter((t) => !['u2', 'm2', 'u3', 'm3'].includes(t.id));
    s.meta.turnOrder = ['u1', 'm1', 'u4', 'm4'];
    s.meta.versions = s.meta.versions.filter((v) => v.number === 1 || v.number === 4);
    const out = await feed(s);
    expect(out.cards.map((c: any) => c.key)).toEqual(['m1', 'm4']);
    expect(out.mainVersionNumber).toBe(4);
    expect(out.cards.map((c: any) => c.holdsMain)).toEqual([false, true]);
  });

  it('FR-13: when the turn of the main version is not in the stored turns, no card holds main (the strip then goes to the end of the feed)', async () => {
    const s = makeSession('s1', { pairs: 2 });
    s.turns = s.turns.filter((t) => t.id !== 'm2');
    const out = await feed(s);
    expect(out.mainVersionNumber).toBe(2);
    expect(out.cards.map((c: any) => c.key)).toEqual(['m1']);
    expect(out.cards.some((c: any) => c.holdsMain)).toBe(false);
  });

  it('FR-13: in a two-image turn the card holds main once and the highest number is the last image', async () => {
    const out = await feed(mixedTextImageSession());
    expect(out.mainVersionNumber).toBe(2);
    expect(out.cards).toHaveLength(1);
    expect(out.cards[0].holdsMain).toBe(true);
  });
});

describe('FR-4 / FR-23 / FR-25: buildFeed reads the stored display fields through the validity table (T11)', () => {
  it('a valid cost, durationMs and known presetId reach the card', async () => {
    const s = withTurnExtras(makeSession('s1', { pairs: 1 }), 'm1', { cost: 0.067, durationMs: 12_400, presetId: 'lifestyle' });
    const [card] = (await feed(s)).cards;
    expect(card.summary).toEqual({ count: 1, cost: 0.067, durationMs: 12_400 });
    expect(card.presetId).toBe('lifestyle');
  });

  it('FR-25: an old session (none of the fields) gives summary {count} only, no preset and no thumbnails', async () => {
    const [card] = (await feed(makeSession('s1', { pairs: 1 }))).cards;
    expect(Object.keys(card.summary)).toEqual(['count']);
    expect(card.presetId).toBeUndefined();
    expect(card.thumbs ?? []).toEqual([]);
  });

  it('FR-25: a mixed session renders each card from its own stored fields', async () => {
    const s = withTurnExtras(makeSession('s1', { pairs: 2 }), 'm2', { cost: 0.03, durationMs: 800, presetId: 'banner' });
    const [old, fresh] = (await feed(s)).cards;
    expect(Object.keys(old.summary)).toEqual(['count']);
    expect(old.presetId).toBeUndefined();
    expect(fresh.summary).toEqual({ count: 1, cost: 0.03, durationMs: 800 });
    expect(fresh.presetId).toBe('banner');
  });

  it.each([
    ['a string', 'abc'], ['a negative number', -1], ['NaN', Number.NaN], ['Infinity', Number.POSITIVE_INFINITY],
  ])('a cost that is %s is treated as absent while a valid durationMs of the same turn is kept', async (_n, bad) => {
    const s = withTurnExtras(makeSession('s1', { pairs: 1 }), 'm1', { cost: bad as number, durationMs: 5_000 });
    const [card] = (await feed(s)).cards;
    expect(has(card.summary, 'cost')).toBe(false);
    expect(card.summary.durationMs).toBe(5_000);
  });

  it('a durationMs that is negative is absent while a valid cost is kept', async () => {
    const s = withTurnExtras(makeSession('s1', { pairs: 1 }), 'm1', { cost: 0.5, durationMs: -10 });
    const [card] = (await feed(s)).cards;
    expect(has(card.summary, 'durationMs')).toBe(false);
    expect(card.summary.cost).toBe(0.5);
  });

  it('a stored zero cost and zero duration are VALID values and are kept (a free, instant generation)', async () => {
    const s = withTurnExtras(makeSession('s1', { pairs: 1 }), 'm1', { cost: 0, durationMs: 0 });
    const [card] = (await feed(s)).cards;
    expect(card.summary.cost).toBe(0);
    expect(card.summary.durationMs).toBe(0);
  });

  it.each([
    ['an id no longer in the registry', 'removed-preset'], ['a number', 7], ['an empty string', ''],
  ])('a presetId that is %s is absent: no preset chip, no error', async (_n, bad) => {
    const s = withTurnExtras(makeSession('s1', { pairs: 1 }), 'm1', { presetId: bad as string });
    const [card] = (await feed(s)).cards;
    expect(card.presetId).toBeUndefined();
  });

  it('a malformed field never throws and never hides the card', async () => {
    const s = withTurnExtras(makeSession('s1', { pairs: 1 }), 'm1', { cost: {} as unknown as number, durationMs: [] as unknown as number, presetId: null as unknown as string, inputRefs: 'x' as unknown as [] });
    const out = await feed(s);
    expect(out.cards).toHaveLength(1);
    expect(out.cards[0].summary.count).toBe(1);
  });
});

describe('FR-23 agreement: what applyResponse writes, buildFeed reads (T11)', () => {
  it('a session produced by the writer yields cost, duration, preset and input thumbnails on its card', async () => {
    const { applyResponse } = await load('./apply-response');
    const snap = makeSession('s1');
    const userTurn = turn('u1', 'user', textPart('red mug'), filePart('files/a'));
    const img = inlineImagePart('image/png', toBase64(makeRaster({ format: 'png', width: 8, height: 8 })));
    const out = applyResponse(snap, { kind: 'images', parts: [img], costUsd: 0.067, usage: { inputTokens: 1, outputTokens: 1 }, trimmedTurnIds: [] }, {
      userTurn, ids: makeIdSource('model'), now: 5_000_000, model: 'gemini-3.1-flash-image', aspectRatio: '1:1', resolution: '1K',
      prompt: 'red mug', inputFormat: 'image/png', durationMs: 12_400, presetId: 'white-bg',
    });
    const session: StoredSession = { meta: out.batch.meta, turns: out.batch.putTurns };
    const [card] = (await feed(session)).cards;
    expect(card.summary).toEqual({ count: 1, cost: 0.067, durationMs: 12_400 });
    expect(card.presetId).toBe('white-bg');
  });
});

describe('FR-3 (a) / FR-23: buildFeed thumbnails (T12)', () => {
  function withInputs(refs: unknown): StoredSession {
    const s = makeSession('s1', { pairs: 1 });
    s.turns[0] = turn('u1', 'user', textPart('blend'), filePart('files/a'), inlineImagePart('image/png', toBase64(makeRaster({ format: 'png', width: 4, height: 4 }))));
    return withTurnExtras(s, 'm1', { inputRefs: refs as [] });
  }

  it('valid references to image parts of the sent user turn become thumbnails, in order', async () => {
    const [card] = (await feed(withInputs([{ turnId: 'u1', partIndex: 1 }, { turnId: 'u1', partIndex: 2 }]))).cards;
    expect(card.thumbs).toEqual([{ turnId: 'u1', partIndex: 1 }, { turnId: 'u1', partIndex: 2 }]);
  });

  it('dangling references are dropped ONE BY ONE: missing turn, part out of range, and a part that is not an image; the good one stays', async () => {
    const [card] = (await feed(withInputs([
      { turnId: 'ghost', partIndex: 0 }, { turnId: 'u1', partIndex: 9 }, { turnId: 'u1', partIndex: 0 }, { turnId: 'u1', partIndex: 1 },
    ]))).cards;
    expect(card.thumbs).toEqual([{ turnId: 'u1', partIndex: 1 }]);
  });

  it('malformed reference entries are dropped without an error', async () => {
    const [card] = (await feed(withInputs([null, 'u1:1', { turnId: 5, partIndex: 1 }, { turnId: 'u1', partIndex: -1 }, { turnId: 'u1', partIndex: 2 }]))).cards;
    expect(card.thumbs).toEqual([{ turnId: 'u1', partIndex: 2 }]);
  });

  it('a turn without inputRefs (an old session or a text-only send) has no thumbnails', async () => {
    const [card] = (await feed(makeSession('s1', { pairs: 1 }))).cards;
    expect(card.thumbs ?? []).toEqual([]);
  });
});

describe('FR-9 / FR-23: buildFeed edit source per image (T12)', () => {
  it('images lists every version of the card with its number and part index', async () => {
    const [card] = (await feed(mixedTextImageSession())).cards;
    expect(card.images.map((i: any) => [i.number, i.partIndex])).toEqual([[1, 1], [2, 4]]);
    expect(card.images.every((i: any) => !has(i, 'editOf'))).toBe(true);
  });

  it('a valid stored source gives editOf {n, sourceRetained: true}, and only on the image that has it', async () => {
    const s = withVersionFields(makeSession('s1', { pairs: 3 }), 3, { editOfVersion: 1 });
    const cards = (await feed(s)).cards;
    expect(cards[2].images[0].editOf).toEqual({ n: 1, sourceRetained: true });
    expect(has(cards[0].images[0], 'editOf')).toBe(false);
    expect(has(cards[1].images[0], 'editOf')).toBe(false);
  });

  it('in a two-image turn only the image that edits an earlier version shows the source', async () => {
    const s = makeSession('s1', { pairs: 1 });
    const png = () => inlineImagePart('image/png', toBase64(makeRaster({ format: 'png', width: 4, height: 4 })));
    s.turns.push(turn('u2', 'user', textPart('two variants')), turn('m2', 'model', png(), png()));
    s.meta.turnOrder.push('u2', 'm2');
    s.meta.nextVersionNumber = 4;
    const base = s.meta.versions[0];
    s.meta.versions.push({ ...base, number: 2, turnId: 'm2', partIndex: 0 }, { ...base, number: 3, turnId: 'm2', partIndex: 1 });
    withVersionFields(s, 3, { editOfVersion: 1 });
    const edited = (await feed(s)).cards[1].images;
    expect(edited.map((i: any) => i.number)).toEqual([2, 3]);
    expect(has(edited[0], 'editOf')).toBe(false);
    expect(edited[1].editOf).toEqual({ n: 1, sourceRetained: true });
  });

  it('a valid source that is no longer retained keeps the chip data and says so (Compare is hidden by the tile)', async () => {
    const s = makeSession('s1', { pairs: 3 });
    s.turns = s.turns.filter((t) => t.id !== 'u1' && t.id !== 'm1');
    s.meta.turnOrder = ['u2', 'm2', 'u3', 'm3'];
    s.meta.versions = s.meta.versions.filter((v) => v.number !== 1);
    withVersionFields(s, 3, { editOfVersion: 1 });
    const cards = (await feed(s)).cards;
    expect(cards[1].images[0].editOf).toEqual({ n: 1, sourceRetained: false });
  });

  it.each([
    ['equal to its own number', 2], ['greater than its own number', 5], ['zero', 0], ['negative', -3], ['a fraction', 1.5], ['a string', '1'],
  ])('a stored source %s is invalid: no editOf, no error', async (_n, bad) => {
    const s = withVersionFields(makeSession('s1', { pairs: 2 }), 2, { editOfVersion: bad as number });
    const cards = (await feed(s)).cards;
    expect(has(cards[1].images[0], 'editOf')).toBe(false);
  });

  it('agreement with the writer: a version created with editOfVersion 1 reads back as editOf {n: 1, sourceRetained: true}', async () => {
    const { applyResponse } = await load('./apply-response');
    const snap = makeSession('s1', { pairs: 1 });
    const img = inlineImagePart('image/png', toBase64(makeRaster({ format: 'png', width: 8, height: 8 })));
    const out = applyResponse(snap, { kind: 'images', parts: [img], costUsd: 0.03, usage: { inputTokens: 1, outputTokens: 1 }, trimmedTurnIds: [] }, {
      userTurn: turn('u2', 'user', textPart('edit')), ids: makeIdSource('model'), now: 5_000_000, model: 'gemini-3.1-flash-image',
      aspectRatio: '1:1', resolution: '1K', prompt: 'edit', inputFormat: 'image/png', editOfVersion: 1,
    });
    const byId = new Map([...snap.turns, ...out.batch.putTurns].map((t) => [t.id, t]));
    const session: StoredSession = { meta: out.batch.meta, turns: out.batch.meta.turnOrder.map((id: string) => byId.get(id)) };
    const cards = (await feed(session)).cards;
    expect(cards[1].images[0].editOf).toEqual({ n: 1, sourceRetained: true });
  });
});

describe('NB-2 hardening: a card never carries more than 10 input thumbnails (T43)', () => {
  function withManyInputs(count: number): StoredSession {
    const s = makeSession('s1', { pairs: 1 });
    s.turns[0] = turn('u1', 'user', textPart('blend'), inlineImagePart('image/png', toBase64(makeRaster({ format: 'png', width: 4, height: 4 }))));
    return withTurnExtras(s, 'm1', { inputRefs: Array.from({ length: count }, () => ({ turnId: 'u1', partIndex: 1 })) as [] });
  }

  it('guard: 10 references to a real image part give 10 thumbnails', async () => {
    const [card] = (await feed(withManyInputs(10))).cards;
    expect(card.thumbs).toHaveLength(10);
  });

  it('a tampered record with 2,000 references to one real image part gives a card with exactly 10 thumbnails', async () => {
    const [card] = (await feed(withManyInputs(2_000))).cards;
    expect(card.thumbs).toEqual(Array.from({ length: 10 }, () => ({ turnId: 'u1', partIndex: 1 })));
  });
});


// ---------------------------------------------------------------------------------------------------------------------
// US-10.6 T23 - the role of an input thumbnail (FR-14, AC-9; plan 2). New describe only.
//
// PINNED CONTRACT: a stored USER turn may carry `styleRefPartIndex` (a non-negative integer pointing at one of its IMAGE parts; Turn level, never on a
// Part). buildFeed gives the matching thumbnail an optional `role: 'style-ref'`; every other thumbnail has NO `role` key. A session without the tag renders
// exactly as before, and a stored value that is not valid is read as "absent" (the image stays Product) without an error - through readTurnExtras.
// The "Style ref" LABEL text (UA / EN copy and placement) is the component task's (T32, SM-10) and is not asserted here.
// ---------------------------------------------------------------------------------------------------------------------
describe('FR-14 / AC-9: buildFeed marks the Style ref thumbnail from the stored turn tag (T23)', () => {
  /** u1 holds [text, file a (1), inline image (2)]; the model turn m1 references parts 1 and 2 of u1 as its inputs. */
  function sentWithTag(tag: unknown): StoredSession {
    const s = makeSession('s1', { pairs: 1 });
    s.turns[0] = turn('u1', 'user', textPart('blend'), filePart('files/a'), inlineImagePart('image/png', toBase64(makeRaster({ format: 'png', width: 4, height: 4 }))));
    if (tag !== 'absent') (s.turns[0] as any).styleRefPartIndex = tag;
    return withTurnExtras(s, 'm1', { inputRefs: [{ turnId: 'u1', partIndex: 1 }, { turnId: 'u1', partIndex: 2 }] as unknown as [] });
  }

  it('AC-9: the thumbnail at the tagged part index gets role "style-ref" and the other thumbnail has no role', async () => {
    const [card] = (await feed(sentWithTag(2))).cards;
    expect(card.thumbs).toEqual([{ turnId: 'u1', partIndex: 1 }, { turnId: 'u1', partIndex: 2, role: 'style-ref' }]);
    expect(has(card.thumbs[0], 'role')).toBe(false);
  });

  it('FR-14: tagging the other image marks that one instead - the role follows the stored index', async () => {
    const [card] = (await feed(sentWithTag(1))).cards;
    expect(card.thumbs).toEqual([{ turnId: 'u1', partIndex: 1, role: 'style-ref' }, { turnId: 'u1', partIndex: 2 }]);
  });

  it('FR-14: a session saved before this Story (no tag) renders exactly as before - every thumbnail is Product, no role key anywhere [characterization]', async () => {
    const [card] = (await feed(sentWithTag('absent'))).cards;
    expect(card.thumbs).toEqual([{ turnId: 'u1', partIndex: 1 }, { turnId: 'u1', partIndex: 2 }]);
    for (const thumb of card.thumbs) expect(has(thumb, 'role')).toBe(false);
  });

  it('FR-14 failure path: an invalid stored value (negative, fractional, a string, out of range, or pointing at the TEXT part) yields no role and no error [characterization]', async () => {
    for (const bad of [-1, 1.5, '2', null, 9, 0, Number.NaN, {}, [2]]) {
      const [card] = (await feed(sentWithTag(bad))).cards;
      expect(card.thumbs, JSON.stringify(bad)).toEqual([{ turnId: 'u1', partIndex: 1 }, { turnId: 'u1', partIndex: 2 }]);
    }
  });

  it('FR-14: a card whose tagged index has no thumbnail (the model turn did not reference that part) shows no role at all [characterization]', async () => {
    const s = sentWithTag(2);
    withTurnExtras(s, 'm1', { inputRefs: [{ turnId: 'u1', partIndex: 1 }] as unknown as [] });
    const [card] = (await feed(s)).cards;
    expect(card.thumbs).toEqual([{ turnId: 'u1', partIndex: 1 }]);
  });

  it('plan 3.2 / R-9: a merged N-image turn renders one card whose summary count equals the images billed [characterization]', async () => {
    const s = makeSession('s1', { pairs: 1 });
    const img = (n: number) => inlineImagePart('image/png', toBase64(makeRaster({ format: 'png', width: 8, height: 8, size: 100 + n })));
    s.turns[1] = turn('m1', 'model', img(1), img(2), img(3), img(4));
    s.meta.versions = [1, 2, 3, 4].map((n) => ({ number: n, turnId: 'm1', partIndex: n - 1, model: 'gemini-3.1-flash-image', resolution: '1K', aspectRatio: '1:1', prompt: 'p', inputFormat: 'image/png' as const, downloaded: false }));
    s.meta.nextVersionNumber = 5;
    withTurnExtras(s, 'm1', { cost: 0.16 });
    const out = await feed(s);
    expect(out.cards).toHaveLength(1);
    expect(out.cards[0].summary).toEqual({ count: 4, cost: 0.16 });
    expect(out.cards[0].images.map((i: any) => i.number)).toEqual([1, 2, 3, 4]);
  });
});

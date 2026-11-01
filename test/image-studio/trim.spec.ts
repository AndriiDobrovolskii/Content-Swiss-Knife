// @vitest-environment node
/**
 * trim.spec.ts - US-10.1 T11 (FR-40, FR-41, FR-42, FR-43, FR-46, FR-53; SD-9, SD-10; PROPOSED D-11/D-13).
 *
 * The deterministic trim of the history the BFF is about to send to Gemini.
 *
 * PINNED CONTRACT (server/image-studio/trim.js, ESM; measure.js is the 18 MB measure of measure.spec.ts):
 *   export function removalUnits(history): string[][]
 *       the trim units, oldest first, each unit the ids [M_i, U_{i+1}] for i = 1..n-1 (SD-9, FR-42). U1 and the final
 *       model turn Mn are never in a unit. The ONE seam that changes if check V-1 selects the collapse fallback.
 *   export async function trimRequest({ history, newTurn, inputTokenLimit, countTokens }):
 *       Promise<{ history: Turn[], trimmedTurnIds: string[] }>
 *       - `countTokens(turn)` is injected, resolves a number, is called once per retained turn (after the size trim) and
 *         once for the new turn (k + 1 calls), at most 4 in flight (SD-10).
 *       - size limit 18 874 368 B on the measure, token limit 80% of `inputTokenLimit`; size first, then tokens.
 *       - rejects with an error whose `.code === 'PROTECTED_HISTORY_EXCEEDS_LIMIT'` and `.status === 413` when the
 *         protected remainder (U1 + Mn + new turn) is over either limit (FR-46), BEFORE any generate call.
 *       - a rejection of `countTokens` rejects the whole trim with that same error (FR-40: no generate call follows).
 *       - never mutates its arguments; returns retained turns unmodified (same parts, same service fields).
 * Only the V-1 selected strategy (pair removal; docs/evidence/US-10.1-pre-implementation-checks.md Check V-1) is tested.
 * IMAGE_TOKEN_ESTIMATE (FR-41) applies only if V-7 shows countTokens ignores image parts; V-7 recorded that it accepts
 * them, so the estimate path is not selected and is not tested here (FR-41: "the choice is made once from the V-7 result").
 */
import { describe, it, expect } from 'vitest';
import { filePart, inlineImagePart, textPart, turn, type Turn } from './helpers/fakes';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const TRIM = '../../server/image-studio/trim.js';
const MEASURE = '../../server/image-studio/measure.js';

const MAX_BYTES = 18_874_368;
const LIMIT = 131_072;

/** U1 M1 U2 M2 ... Un Mn; every model turn holds one inline image of `imageChars` base64 characters. */
function makeHistory(pairs: number, imageChars = 100): Turn[] {
  const out: Turn[] = [];
  for (let i = 1; i <= pairs; i++) {
    out.push(turn(`u${i}`, 'user', textPart(`prompt ${i}`), ...(i === 1 ? [filePart('files/original-1')] : [])));
    out.push(turn(`m${i}`, 'model', inlineImagePart('image/png', 'A'.repeat(imageChars), { thoughtSignature: `sig-${i}` })));
  }
  return out;
}
const NEW_TURN = turn('u-new', 'user', textPart('softer shadow'));
const ids = (h: Turn[]) => h.map((t) => t.id);

/** Resolves every turn to `perTurn` tokens, recording the turns it was asked about. */
function constantCounter(perTurn: number) {
  const asked: string[] = [];
  return { asked, countTokens: async (t: Turn) => { asked.push(t.id); return perTurn; } };
}

describe('trim.js - removalUnits (SD-9, FR-42)', () => {
  it('FR-42 / SD-9: the units are the pairs (M_i, U_{i+1}), oldest first, never U1 and never the final model turn', async () => {
    const { removalUnits } = await load(TRIM);
    expect(removalUnits(makeHistory(4))).toEqual([['m1', 'u2'], ['m2', 'u3'], ['m3', 'u4']]);
  });

  it('FR-42: a history with a single pair has no unit to remove', async () => {
    const { removalUnits } = await load(TRIM);
    expect(removalUnits(makeHistory(1))).toEqual([]);
  });
});

describe('trim.js - nothing to trim', () => {
  it('FR-43 / FR-39 / FR-40: inside both limits the history is returned unmodified and trimmedTurnIds is an empty array (never absent)', async () => {
    const { trimRequest } = await load(TRIM);
    const history = makeHistory(3);
    const before = structuredClone(history);
    const { countTokens } = constantCounter(100);
    const result = await trimRequest({ history, newTurn: NEW_TURN, inputTokenLimit: LIMIT, countTokens });
    expect(result.trimmedTurnIds).toEqual([]);
    expect(result.history).toEqual(before);
    expect(history).toEqual(before); // the argument was not mutated
  });
});

describe('trim.js - size trim at 18 MB (FR-39, FR-42)', () => {
  it('FR-39 / FR-42 / FR-43: over 18 MB the OLDEST pair (M1, U2) is removed first and both halves are listed', async () => {
    const { trimRequest } = await load(TRIM);
    // four model turns of 6 MB = 24 MB; removing one pair leaves three = 18 MB <= 18 874 368 B.
    const history = makeHistory(4, 6_000_000);
    const { countTokens } = constantCounter(10);
    const result = await trimRequest({ history, newTurn: NEW_TURN, inputTokenLimit: LIMIT, countTokens });
    expect(result.trimmedTurnIds).toEqual(['m1', 'u2']);
    expect(ids(result.history)).toEqual(['u1', 'm2', 'u3', 'm3', 'u4', 'm4']);
  });

  it('FR-42: after the removal the sequence still begins with U1, still contains Mn and still alternates roles; remaining parts are untouched', async () => {
    const { trimRequest } = await load(TRIM);
    const history = makeHistory(5, 6_000_000);
    const original = structuredClone(history);
    const { countTokens } = constantCounter(10);
    const result = await trimRequest({ history, newTurn: NEW_TURN, inputTokenLimit: LIMIT, countTokens });
    expect(result.history[0].id).toBe('u1');
    expect(result.history[result.history.length - 1].id).toBe('m5');
    result.history.forEach((t: Turn, i: number) => expect(t.role).toBe(i % 2 === 0 ? 'user' : 'model'));
    for (const t of result.history) {
      expect(t).toEqual(original.find((o) => o.id === t.id)); // incl. thoughtSignature
    }
  });

  it('FR-39: several oldest units are removed until the request fits (oldest first, no gaps in the order)', async () => {
    const { trimRequest } = await load(TRIM);
    const history = makeHistory(6, 6_000_000); // 36 MB inline
    const { countTokens } = constantCounter(10);
    const result = await trimRequest({ history, newTurn: NEW_TURN, inputTokenLimit: LIMIT, countTokens });
    // 3 images (18 MB) fit, a fourth (24 MB) does not: three pairs must go.
    expect(result.trimmedTurnIds).toEqual(['m1', 'u2', 'm2', 'u3', 'm3', 'u4']);
    const { measureRequest } = await load(MEASURE);
    expect(measureRequest(result.history, NEW_TURN)).toBeLessThanOrEqual(MAX_BYTES);
  });

  it('FR-39 / FR-53: file_uri originals weigh only their reference, so many originals never trigger the size trim', async () => {
    const { trimRequest } = await load(TRIM);
    const history = [
      turn('u1', 'user', textPart('p'), ...Array.from({ length: 5 }, (_, i) => filePart(`files/o${i}`))),
      turn('m1', 'model', inlineImagePart('image/png', 'A'.repeat(100))),
    ];
    const { countTokens } = constantCounter(10);
    const result = await trimRequest({ history, newTurn: NEW_TURN, inputTokenLimit: LIMIT, countTokens });
    expect(result.trimmedTurnIds).toEqual([]);
  });

  it('FR-42 / OD-30 C-30.3: a model turn holding several images is removed whole', async () => {
    const { trimRequest } = await load(TRIM);
    const history = makeHistory(4, 100);
    history[1] = turn('m1', 'model', inlineImagePart('image/png', 'A'.repeat(10_000_000)), inlineImagePart('image/png', 'B'.repeat(10_000_000)));
    const { countTokens } = constantCounter(10);
    const result = await trimRequest({ history, newTurn: NEW_TURN, inputTokenLimit: LIMIT, countTokens });
    expect(result.trimmedTurnIds).toEqual(['m1', 'u2']);
    expect(ids(result.history)).not.toContain('m1');
  });

  it('FR-42: a multi-image model turn that holds the latest version is protected whole and is never removed', async () => {
    const { trimRequest } = await load(TRIM);
    const history = makeHistory(3, 100);
    history[5] = turn('m3', 'model', inlineImagePart('image/png', 'A'.repeat(7_000_000)), inlineImagePart('image/png', 'B'.repeat(7_000_000)));
    history[1] = turn('m1', 'model', inlineImagePart('image/png', 'C'.repeat(7_000_000)));
    const { countTokens } = constantCounter(10);
    const result = await trimRequest({ history, newTurn: NEW_TURN, inputTokenLimit: LIMIT, countTokens });
    expect(ids(result.history)).toContain('m3');
    expect(result.history.find((t: Turn) => t.id === 'm3').parts).toHaveLength(2);
  });
});

describe('trim.js - protected remainder (FR-46)', () => {
  it('FR-46 / FR-39: when only U1, Mn and the new turn remain and they exceed 18 MB the trim rejects with 413 PROTECTED_HISTORY_EXCEEDS_LIMIT', async () => {
    const { trimRequest } = await load(TRIM);
    const history = makeHistory(3, 100);
    const hugeNew = turn('u-new', 'user', textPart('edit'), inlineImagePart('image/png', 'Z'.repeat(MAX_BYTES + 1)));
    const { countTokens, asked } = constantCounter(10);
    await expect(trimRequest({ history, newTurn: hugeNew, inputTokenLimit: LIMIT, countTokens })).rejects.toMatchObject({
      code: 'PROTECTED_HISTORY_EXCEEDS_LIMIT',
      status: 413,
    });
    expect(asked).toEqual([]); // the byte test comes first: no countTokens call is made for a body that cannot fit
  });

  it('FR-46: the latest version (Mn) alone over 18 MB with the new turn is the same terminating 413, nothing is "trimmed" away from the protected set', async () => {
    const { trimRequest } = await load(TRIM);
    const history = makeHistory(3, 100);
    history[5] = turn('m3', 'model', inlineImagePart('image/png', 'A'.repeat(MAX_BYTES)));
    const { countTokens } = constantCounter(10);
    await expect(trimRequest({ history, newTurn: NEW_TURN, inputTokenLimit: LIMIT, countTokens })).rejects.toMatchObject({
      code: 'PROTECTED_HISTORY_EXCEEDS_LIMIT',
      status: 413,
    });
  });

  it('FR-46 / FR-40: when the protected remainder exceeds 80% of the token limit the trim rejects with the same 413 (checked after the byte test)', async () => {
    const { trimRequest } = await load(TRIM);
    const history = makeHistory(3, 100);
    // U1 = 61 000, Mn = 30 000, new turn = 10 000 -> 101 000 > 80% of 125 000 (100 000) even after every unit is removed.
    const counts: Record<string, number> = { u1: 61_000, m1: 1, u2: 1, m2: 1, u3: 1, m3: 30_000, 'u-new': 10_000 };
    const countTokens = async (t: Turn) => counts[t.id];
    await expect(trimRequest({ history, newTurn: NEW_TURN, inputTokenLimit: 125_000, countTokens })).rejects.toMatchObject({
      code: 'PROTECTED_HISTORY_EXCEEDS_LIMIT',
      status: 413,
    });
  });

  it('FR-46 / FR-40: a protected remainder exactly at 80% of the token limit is accepted once the oldest pair has gone (the limit is "at most 80%")', async () => {
    const { trimRequest } = await load(TRIM);
    const history = makeHistory(2, 100);
    const counts: Record<string, number> = { u1: 40_000, m1: 1, u2: 1, m2: 30_000, 'u-new': 10_000 };
    const result = await trimRequest({ history, newTurn: NEW_TURN, inputTokenLimit: 100_000, countTokens: async (t: Turn) => counts[t.id] });
    expect(result.trimmedTurnIds).toEqual(['m1', 'u2']); // 80 002 > 80 000 -> the pair goes; U1+Mn+new = 80 000 fits
  });
});

describe('trim.js - token trim at 80% (FR-40)', () => {
  it('FR-40: exactly 80% of the input limit is kept; one token over trims the oldest pair', async () => {
    const { trimRequest } = await load(TRIM);
    const history = makeHistory(3, 100);
    const at = await trimRequest({ history, newTurn: NEW_TURN, inputTokenLimit: 100_000, countTokens: async (t: Turn) => (t.id === 'u1' ? 80_000 - 6 : 1) });
    expect(at.trimmedTurnIds).toEqual([]); // 79 994 + 6 other turns (5 retained + the new one) of 1 = 80 000 exactly
    const over = await trimRequest({ history, newTurn: NEW_TURN, inputTokenLimit: 100_000, countTokens: async (t: Turn) => (t.id === 'u1' ? 80_000 - 5 : 1) });
    expect(over.trimmedTurnIds).toEqual(['m1', 'u2']); // 80 001 > 80 000
  });

  it('FR-40 / FR-43: above 80% the oldest units are removed until the sum fits; the sum is recomputed from the counts already taken', async () => {
    const { trimRequest } = await load(TRIM);
    const history = makeHistory(5, 100);
    const { countTokens, asked } = constantCounter(10_000); // 11 turns x 10 000 = 110 000 > 80 000 (limit 100 000)
    const result = await trimRequest({ history, newTurn: NEW_TURN, inputTokenLimit: 100_000, countTokens });
    expect(result.trimmedTurnIds).toEqual(['m1', 'u2', 'm2', 'u3']); // 110k -> 90k -> 70k <= 80k: two units
    expect(asked).toHaveLength(11); // k + 1 = 10 + 1, no re-count after a removal
  });

  it('FR-40: size trim first, then tokens - turns removed by the size trim are not counted (k is counted AFTER the size trim)', async () => {
    const { trimRequest } = await load(TRIM);
    const small = constantCounter(10);
    await trimRequest({ history: makeHistory(4, 100), newTurn: NEW_TURN, inputTokenLimit: LIMIT, countTokens: small.countTokens });
    const trimmed = constantCounter(10);
    const result = await trimRequest({ history: makeHistory(4, 6_000_000), newTurn: NEW_TURN, inputTokenLimit: LIMIT, countTokens: trimmed.countTokens });
    expect(result.trimmedTurnIds).toEqual(['m1', 'u2']);
    expect(small.asked).toHaveLength(9); // 8 turns + the new turn
    expect(trimmed.asked).toHaveLength(7); // two calls fewer: 6 retained turns + the new turn
    expect(trimmed.asked).not.toContain('m1');
    expect(trimmed.asked).not.toContain('u2');
    expect(trimmed.asked).toContain('u-new');
  });

  it('FR-40 / FR-43: both limits can remove turns in one request; one list names every removed turn, oldest first, size removals before token removals', async () => {
    const { trimRequest } = await load(TRIM);
    // 5 pairs of 6 MB: the size trim removes (m1,u2) and (m2,u3) [36 MB -> 18 MB for 3 images ... 5 images = 30 MB needs two pairs gone].
    const history = makeHistory(5, 6_000_000);
    // tokens: 10 retained turns after size trim... make every turn 12 000 against limit 100 000 (80 000):
    // after size trim k = 6 -> 7 x 12 000 = 84 000 > 80 000 -> one more pair goes.
    const { countTokens, asked } = constantCounter(12_000);
    const result = await trimRequest({ history, newTurn: NEW_TURN, inputTokenLimit: 100_000, countTokens });
    expect(result.trimmedTurnIds).toEqual(['m1', 'u2', 'm2', 'u3', 'm3', 'u4']);
    expect(asked).toHaveLength(7); // 6 retained after the size trim + the new turn
  });

  it('FR-40 / SD-10 / D-11: counts run concurrently but never more than 4 in flight', async () => {
    const { trimRequest } = await load(TRIM);
    let inFlight = 0;
    let max = 0;
    const waiting: Array<() => void> = [];
    const countTokens = (_t: Turn) => new Promise<number>((resolve) => {
      inFlight += 1;
      max = Math.max(max, inFlight);
      waiting.push(() => { inFlight -= 1; resolve(10); });
    });
    let settled = false;
    const run = trimRequest({ history: makeHistory(6, 100), newTurn: NEW_TURN, inputTokenLimit: LIMIT, countTokens }).finally(() => { settled = true; });
    for (let i = 0; i < 2000 && !settled; i++) {
      await Promise.resolve();
      for (const release of waiting.splice(0)) release();
    }
    await run;
    expect(max).toBeGreaterThan(1);
    expect(max).toBeLessThanOrEqual(4);
  });

  it('FR-40 / OD-29 C-29.4: one countTokens failure ends the action with that error; no result is produced', async () => {
    const { trimRequest } = await load(TRIM);
    const failure = Object.assign(new Error('upstream down'), { status: 503 });
    const countTokens = async (t: Turn) => { if (t.id === 'm2') throw failure; return 10; };
    await expect(trimRequest({ history: makeHistory(4, 100), newTurn: NEW_TURN, inputTokenLimit: LIMIT, countTokens })).rejects.toBe(failure);
  });
});

describe('trim.js - determinism (FR-42, FR-43)', () => {
  it('FR-42 / FR-43: equal input and equal counts give equal trimmedTurnIds, whatever order the counts arrive in', async () => {
    const { trimRequest } = await load(TRIM);
    const run = async (reverse: boolean) => {
      const history = makeHistory(5, 100);
      const pending: Array<() => void> = [];
      const countTokens = (t: Turn) => new Promise<number>((resolve) => {
        pending.push(() => resolve(t.id === 'u-new' ? 10_000 : 12_000));
      });
      let settled = false;
      const p = trimRequest({ history, newTurn: NEW_TURN, inputTokenLimit: 100_000, countTokens }).finally(() => { settled = true; });
      for (let i = 0; i < 2000 && !settled; i++) {
        await Promise.resolve();
        const batch = pending.splice(0);
        (reverse ? batch.reverse() : batch).forEach((f) => f());
      }
      return p;
    };
    const a = await run(false);
    const b = await run(true);
    expect(b.trimmedTurnIds).toEqual(a.trimmedTurnIds);
    expect(a.trimmedTurnIds.length).toBeGreaterThan(0);
    expect(b.history.map((t: Turn) => t.id)).toEqual(a.history.map((t: Turn) => t.id));
  });

  it('FR-43: the trim never invents or renumbers an id - every listed id was in the request', async () => {
    const { trimRequest } = await load(TRIM);
    const history = makeHistory(5, 6_000_000);
    const { countTokens } = constantCounter(10);
    const result = await trimRequest({ history, newTurn: NEW_TURN, inputTokenLimit: LIMIT, countTokens });
    const sent = new Set([...ids(history), 'u-new']);
    for (const id of result.trimmedTurnIds) expect(sent.has(id)).toBe(true);
    expect(new Set(result.trimmedTurnIds).size).toBe(result.trimmedTurnIds.length);
  });
});

describe('trim.js - the FR-53 long-session inequality', () => {
  it('FR-53: over a long session of maximum-size 4K versions (V-6 record: 6.2 MB base64) every request keeps R + G + N + H <= 31 457 280 B and the trim never fails', async () => {
    const { trimRequest } = await load(TRIM);
    const { measureRequest } = await load(MEASURE);
    const FOUR_K_BASE64 = 6_200_000; // docs/evidence/US-10.1-pre-implementation-checks.md Check V-6: 4K ~6.2 MB base64
    const H = 1_048_576; // SD-11
    const CAP = 31_457_280;
    const image = 'A'.repeat(FOUR_K_BASE64);
    const { countTokens } = constantCounter(1_000);
    let history: Turn[] = []; // the retained accepted history, as the client holds it
    for (let n = 1; n <= 12; n++) {
      // "Edit this version" worst case (D-8): the attached 4K version travels INLINE in the new user turn.
      const newTurn = n === 1
        ? turn('u1', 'user', textPart('first'), filePart('files/o1'))
        : turn(`u${n}`, 'user', textPart(`edit ${n}`), inlineImagePart('image/png', image));
      const trimmed = await trimRequest({ history, newTurn, inputTokenLimit: LIMIT, countTokens });
      const R_plus_N = measureRequest(trimmed.history, newTurn);
      const G = FOUR_K_BASE64; // largest single response in the record
      expect(R_plus_N).toBeLessThanOrEqual(MAX_BYTES);
      expect(R_plus_N + G + H).toBeLessThanOrEqual(CAP);
      // the client applies the cut, then appends the accepted user turn and the new 4K model turn
      history = [...trimmed.history, newTurn, turn(`m${n}`, 'model', inlineImagePart('image/png', image, { thoughtSignature: `s${n}` }))];
    }
    expect(history[0].id).toBe('u1');
  });
});

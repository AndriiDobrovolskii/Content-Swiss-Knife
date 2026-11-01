/**
 * The deterministic history trim of the Image Studio BFF (FR-39 to FR-43, FR-46, FR-53; DD-9, SD-9, SD-10).
 *
 * The history is the alternating sequence `U1 M1 U2 M2 ... Un Mn`. The protected set is U1 (the originals),
 * Mn (the model turn holding the latest version, protected whole even when it holds several images) and the
 * new user turn. Everything else is removed in whole pairs `(M_i, U_{i+1})`, oldest first, first by the 18 MB
 * measure (FR-39) and then by the token sum (FR-40). Both halves of every removed pair are reported.
 *
 * The trim is a pure function of the request body plus the token counts: no clock, no randomness, and the
 * order in which concurrent counts arrive never changes the result (counts are stored by position).
 *
 * `countTokens` is injected. It is called once per retained turn (after the size trim) and once for the new
 * turn (k + 1 calls), with at most `COUNT_TOKENS_CONCURRENCY` in flight. Its retry (FR-60) is the caller's
 * composition: the injected function already runs under `runWithRetry`, so a failure that reaches this module
 * is final and is rethrown unchanged, with no generate call following (FR-40).
 *
 * The collapse fallback of FR-42 is dormant (V-1 selected pair removal). `removalUnits` is the one seam that
 * changes if that selection is ever reversed. `IMAGE_TOKEN_ESTIMATE` is not used: V-7 recorded that
 * `countTokens` accepts inline and file_uri image parts, so the estimate path of FR-41 is not selected.
 */
import { COUNT_TOKENS_CONCURRENCY, SIZE_TRIM_LIMIT_BYTES, TOKEN_TRIM_RATIO } from './constants.js';
import { ImageStudioError } from './errors.js';
import { measureTurn } from './measure.js';

/**
 * The trim units, oldest first: the id pairs `[M_i, U_{i+1}]` for i = 1..n-1. U1 and the final model turn
 * Mn are never part of a unit.
 * @param {{ id: string }[]} history
 * @returns {string[][]}
 */
export function removalUnits(history) {
  const units = [];
  for (let index = 1; index + 1 < history.length - 1; index += 2) {
    units.push([history[index].id, history[index + 1].id]);
  }
  return units;
}

function protectedRemainderError() {
  return new ImageStudioError('PROTECTED_HISTORY_EXCEEDS_LIMIT');
}

/**
 * Removes whole units from the front of `units` while `total` is over `limit`, subtracting each removed
 * turn's weight. Returns the new total and how many units were consumed; the removed ids are appended to
 * `removedIds` in order.
 */
function removeWhileOver({ total, limit, units, weightOf, removedIds }) {
  let remaining = total;
  let consumed = 0;
  while (remaining > limit && consumed < units.length) {
    for (const id of units[consumed]) {
      remaining -= weightOf(id);
      removedIds.push(id);
    }
    consumed += 1;
  }
  return { remaining, consumed };
}

/**
 * Counts the tokens of every turn with at most `concurrency` calls in flight. Results are stored by
 * position, so the arrival order cannot change them. The first failure rejects with that same error and
 * no further call is started.
 */
async function countAll(turns, countTokens, concurrency) {
  const counts = new Array(turns.length);
  let next = 0;
  let failed = false;
  async function worker() {
    while (!failed && next < turns.length) {
      const position = next;
      next += 1;
      try {
        const count = await countTokens(turns[position]);
        if (!Number.isFinite(count) || count < 0) {
          throw new TypeError('countTokens must resolve a non-negative number');
        }
        counts[position] = count;
      } catch (failure) {
        failed = true;
        throw failure;
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, turns.length) }, worker);
  await Promise.all(workers);
  return counts;
}

/**
 * @param {{
 *   history: { id: string, role: string, parts: object[] }[],
 *   newTurn: { id: string, role: string, parts: object[] },
 *   inputTokenLimit: number,
 *   countTokens: (turn: object) => Promise<number>,
 * }} request
 * @returns {Promise<{ history: object[], trimmedTurnIds: string[] }>}
 * @throws {ImageStudioError} PROTECTED_HISTORY_EXCEEDS_LIMIT (413) when the protected remainder is over
 *   either limit; whatever `countTokens` rejects with, unchanged.
 */
export async function trimRequest({ history, newTurn, inputTokenLimit, countTokens }) {
  const units = removalUnits(history);
  const trimmedTurnIds = [];

  // 1. Size trim (FR-39): the 18 MB measure first.
  const byteWeights = new Map(history.map((turn) => [turn.id, measureTurn(turn)]));
  const requestBytes = measureTurn(newTurn) + [...byteWeights.values()].reduce((sum, bytes) => sum + bytes, 0);
  const sizeTrim = removeWhileOver({
    total: requestBytes,
    limit: SIZE_TRIM_LIMIT_BYTES,
    units,
    weightOf: (id) => byteWeights.get(id),
    removedIds: trimmedTurnIds,
  });
  if (sizeTrim.remaining > SIZE_TRIM_LIMIT_BYTES) throw protectedRemainderError();

  // 2. Token trim (FR-40): k + 1 counts, k taken AFTER the size trim.
  const removedBySize = new Set(trimmedTurnIds);
  const retained = history.filter((turn) => !removedBySize.has(turn.id));
  const counts = await countAll([...retained, newTurn], countTokens, COUNT_TOKENS_CONCURRENCY);
  const tokenWeights = new Map(retained.map((turn, position) => [turn.id, counts[position]]));
  const requestTokens = counts.reduce((sum, count) => sum + count, 0);
  const tokenLimit = inputTokenLimit * TOKEN_TRIM_RATIO;
  const tokenTrim = removeWhileOver({
    total: requestTokens,
    limit: tokenLimit,
    units: units.slice(sizeTrim.consumed),
    weightOf: (id) => tokenWeights.get(id),
    removedIds: trimmedTurnIds,
  });
  if (tokenTrim.remaining > tokenLimit) throw protectedRemainderError();

  const removed = new Set(trimmedTurnIds);
  return { history: history.filter((turn) => !removed.has(turn.id)), trimmedTurnIds };
}

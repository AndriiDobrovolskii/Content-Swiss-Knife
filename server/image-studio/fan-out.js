/**
 * Server fan-out of the Image Studio generate route (US-10.6 T7; plan 5.0 units, plan 5.2 steps 5 to 8, plan 3.1).
 *
 * Two pieces, no wiring (the handler uses them in T8):
 *
 *   runSlots(...)    starts `granted` upstream calls together, each under the existing retry loop, and classifies
 *                    every settled call with the unchanged `classifyResponse`. It never rejects: a failure is a
 *                    slot outcome, not an exception, so one bad call cannot hide the others.
 *   reduceSlots(...) the PURE fold of the slot outcomes into one answer. It orders by slot index (never by
 *                    completion), applies the one closed cause mapping, and sums the units.
 *
 * Units (plan 5.0). A slot is ONE upstream call. It is successful when its outcome is `images`, and its success
 * unit is the `imageCount` that call carries (the classifier's non-thought image parts), not 1. `succeeded` is the
 * sum of those counts (images) and is never clamped to `granted` (calls) or `requested` (images).
 *
 * Slot outcome shapes (what `runSlots` produces and `reduceSlots` consumes):
 *   { class: 'images', parts, imageCount, usage: { inputTokens, outputTokens }, usageMetadata? }
 *   { class: 'safety', reason } | { class: 'text', text } | { class: 'failed' }      the classifier's results
 *   { error }                                                                         a thrown upstream failure
 *
 * Rule 1: no SDK import. Rule 4: nothing here logs or returns upstream text; the words of a text-only slot are
 * dropped when other slots produced images.
 */
import { classifyResponse } from './classify-response.js';
import { ImageStudioError } from './errors.js';
import { isFileMissing } from './file-missing.js';
import { runWithRetry } from './retry-loop.js';
import { buildUsageRow } from './usage-row.js';

/** The closed code a FILE_MISSING slot carries (the handler's own recovery signal, US-10.1 FR-17). */
const FILE_MISSING_CODE = 'FILE_MISSING';

/**
 * Token usage of one response, mapped exactly as the usage row maps it (one source: `buildUsageRow`), so a slot's
 * `usage` and the row the handler writes for that slot can never disagree.
 */
function usageOf(usageMetadata) {
  const row = buildUsageRow({ model: '', resolution: '', usageMetadata, costUsd: 0 });
  return { inputTokens: row.inputTokens, outputTokens: row.outputTokens };
}

/** A thrown failure of one call: FILE_MISSING when the conjunction holds (as the one-image handler decides), else as thrown. */
function toSlotError(error, { requestCarriedFileUri, signal }) {
  if (!signal?.aborted && isFileMissing({ requestCarriedFileUri, status: error?.status, message: String(error?.message ?? '') })) {
    return new ImageStudioError(FILE_MISSING_CODE);
  }
  return error;
}

/**
 * Run `granted` upstream calls together and classify each one.
 *
 * @param {{
 *   granted: number,
 *   call: (index: number) => Promise<object>,
 *   sleep: (ms: number, signal?: AbortSignal) => Promise<void>,
 *   signal?: AbortSignal,
 *   requestCarriedFileUri?: boolean,
 * }} input `call(index)` is ONE attempt of the upstream generate call, already wrapped for per-attempt logging by the
 *   handler; this runner puts the shared retry loop (`runWithRetry`) around it, with the shared `sleep` and `signal`.
 * @returns {Promise<Array<{ index: number, outcome: object }>>} one entry per slot, in slot-index order
 */
export function runSlots({ granted, call, sleep, signal, requestCarriedFileUri = false }) {
  const slots = Array.from({ length: granted }, async (_, index) => {
    try {
      const response = await runWithRetry(() => call(index), { sleep, signal });
      const result = classifyResponse(response);
      if (result.class === 'images') {
        return {
          index,
          outcome: {
            class: 'images',
            parts: result.parts,
            imageCount: result.imageCount,
            usage: usageOf(response?.usageMetadata),
            usageMetadata: response?.usageMetadata,
          },
        };
      }
      return { index, outcome: result };
    } catch (error) {
      return { index, outcome: { error: toSlotError(error, { requestCarriedFileUri, signal }) } };
    }
  });
  return Promise.all(slots);
}

/** True for a thrown FILE_MISSING (the code the closed vocabulary gives the missing-upload condition). */
function isFileMissingError(error) {
  return error instanceof ImageStudioError && error.code === FILE_MISSING_CODE;
}

/**
 * The ONE place a failed slot is mapped to a member of the contract's `imageFailureCauses` (plan 3.1, review B-2):
 * safety -> safety; failed -> empty; text -> empty; a thrown FILE_MISSING -> file_missing; any other thrown
 * failure -> retries_exhausted. Nothing outside that list can leave this function.
 */
function causeOf(outcome) {
  if ('error' in outcome) return isFileMissingError(outcome.error) ? 'file_missing' : 'retries_exhausted';
  if (outcome.class === 'safety') return 'safety';
  return 'empty'; // failed, text, and any class the classifier may add later: an image was not produced
}

/** The outcome of the lowest-numbered slot exactly as a one-image request would answer it (a copy, or a rethrow). */
function lowestSlotAnswer(outcome) {
  if ('error' in outcome) throw outcome.error;
  if (outcome.class === 'safety') return { class: 'safety', reason: outcome.reason };
  if (outcome.class === 'text') return { class: 'text', text: outcome.text };
  return { class: 'failed' };
}

/**
 * Fold the slot outcomes into one answer. Pure: no clock, no I/O, no mutation of its input.
 *
 * @param {{ slots: Array<{ index: number, outcome: object }>, requested: number, unitPrice: number }} input
 *   `requested` is N (images); `unitPrice` is a plain number (dollars per image); `granted` is `slots.length`.
 * @returns {object} `{ class: 'images', parts, succeeded, costUsd, usage, batch? }` when at least one slot succeeded;
 *   otherwise the lowest-numbered slot's outcome (safety, text or failed), or its error is thrown.
 */
export function reduceSlots({ slots, requested, unitPrice }) {
  if (!Array.isArray(slots) || slots.length === 0) throw new Error('reduceSlots needs at least one slot');
  const ordered = [...slots].sort((a, b) => a.index - b.index);
  const granted = ordered.length;
  const successful = ordered.filter((slot) => slot.outcome.class === 'images');

  if (successful.length === 0) return lowestSlotAnswer(ordered[0].outcome);

  const parts = successful.flatMap((slot) => slot.outcome.parts);
  const succeeded = successful.reduce((sum, slot) => sum + slot.outcome.imageCount, 0);
  const usage = successful.reduce(
    (sum, slot) => ({
      inputTokens: sum.inputTokens + (slot.outcome.usage?.inputTokens ?? 0),
      outputTokens: sum.outputTokens + (slot.outcome.usage?.outputTokens ?? 0),
    }),
    { inputTokens: 0, outputTokens: 0 },
  );

  const result = { class: 'images', parts, succeeded, costUsd: unitPrice * succeeded, usage };
  if (requested > 1) {
    const failures = ordered.filter((slot) => slot.outcome.class !== 'images').map((slot) => ({ cause: causeOf(slot.outcome) }));
    result.batch = { requested, granted, succeeded, failures };
  }
  return result;
}

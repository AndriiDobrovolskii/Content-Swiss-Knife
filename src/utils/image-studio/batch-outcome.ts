import { studioText, type StudioLanguage } from './studio-texts';

/**
 * The batch report as the server sends it (US-10.6 plan 3.2, 5.0): `requested` and `succeeded` count images,
 * `granted` counts upstream calls, `failures` has one entry per failed call. No ordering between the counters is
 * assumed (a call that returned two images makes `succeeded` exceed `granted`), so nothing is clamped.
 */
export interface BatchOutcomeInput {
  requested: number;
  granted: number;
  succeeded: number;
  failures: ReadonlyArray<{ cause: string }>;
}

/** The accepted cause texts (X-57..X-60), keyed by the closed failure-cause list of the shared contract. */
const CAUSE_TEXT_IDS: Readonly<Record<string, string>> = {
  safety: 'X-57',
  empty: 'X-58',
  retries_exhausted: 'X-59',
  file_missing: 'X-60',
};

/**
 * The ordered message lines of one batch outcome (US-10.6 FR-8 (c), FR-9 (a); owner ruling SM-9 i), built here and
 * nowhere else; the lines are rendered inside the single alert, never as a second status.
 *
 * 1. the rate-limit warning (X-55), present exactly when fewer calls were granted than images were requested, with
 *    `{n}` = `succeeded` (the images that exist) and `{requested}` as reported;
 * 2. when any call failed, the summary (X-56) with `{k}` = the failed calls and `{N}` = `requested`;
 * 3. one line per DISTINCT failure cause, in first-occurrence order (X-57..X-60).
 *
 * Returns `[]` when there is nothing to say. The input is not mutated.
 */
export function describeBatchOutcome(batch: BatchOutcomeInput, lang: StudioLanguage): string[] {
  const lines: string[] = [];

  if (batch.granted < batch.requested) {
    lines.push(studioText('X-55', lang, { n: batch.succeeded, requested: batch.requested }));
  }

  if (batch.failures.length > 0) {
    lines.push(studioText('X-56', lang, { k: batch.failures.length, N: batch.requested }));
    const seen = new Set<string>();
    for (const { cause } of batch.failures) {
      if (seen.has(cause)) continue;
      seen.add(cause);
      const id = Object.prototype.hasOwnProperty.call(CAUSE_TEXT_IDS, cause) ? CAUSE_TEXT_IDS[cause] : undefined;
      if (!id) throw new Error(`Unknown batch failure cause: ${String(cause)}`);
      lines.push(studioText(id, lang));
    }
  }

  return lines;
}

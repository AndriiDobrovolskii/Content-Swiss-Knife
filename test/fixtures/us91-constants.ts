/**
 * us91-constants.ts - type-clean access to the two constants US-9.1 adds to `src/prompt-core/constants.ts`
 * (`NO_IMAGE_DEIXIS_RULE`, `LIVELINESS_RULES`) before they exist.
 *
 * Task breakdown constraint 1: every prompt-pin / master / validator / orchestrator-text spec must be type-clean
 * from the first commit, reaching new behaviour "through existing symbols and source text". A static
 * `import { NO_IMAGE_DEIXIS_RULE }` would add a missing-symbol `tsc` diagnostic to every spec that reads it and
 * would turn a whole file red by load; reading the module namespace instead keeps each assertion red on its own
 * with a message that names the missing export. Once T15 / T16 land the accessors simply return the string.
 *
 * Test helper only; nothing here asserts. Plan D4: both constants are STATIC strings (no per-store or per-run
 * interpolation), so one value serves every consumer.
 */
import * as constants from '../../src/prompt-core/constants';

const exportsOf = constants as unknown as Record<string, unknown>;

function stringExport(name: string, owner: string): string {
  const value = exportsOf[name];
  if (typeof value !== 'string') {
    throw new Error(`${name} is not exported from src/prompt-core/constants.ts as a string (created by ${owner})`);
  }
  return value;
}

/** The FR-5 `[NO PICTURE REFERENCES` block (created by T15, interpolated into the master by T27). */
export const noImageDeixisRule = (): string => stringExport('NO_IMAGE_DEIXIS_RULE', 'T15');

/** The FR-20 shared liveliness block with the self-scoping sentence (created by T16, interpolated by T32). */
export const livelinessRules = (): string => stringExport('LIVELINESS_RULES', 'T16');

/** Every exported string constant of `constants.ts`, by name (for "no other constant gains this text" checks). */
export const stringConstants = (): Array<[string, string]> =>
  Object.entries(exportsOf).filter((e): e is [string, string] => typeof e[1] === 'string');

/** Collapse every run of whitespace (including line breaks) to one space, on both sides of a comparison. */
export const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** The three FR-20 self-scoping strings (ASCII apostrophe) and the full VERBATIM sentence that contains them. */
export const SELF_SCOPING_STRINGS = [
  'govern writing a new description',
  'when the task is to translate an existing text they do not apply',
  "the source's sentences and their order are kept",
] as const;
export const SELF_SCOPING_SENTENCE =
  "These rules govern writing a new description; when the task is to translate an existing text they do not apply, and the source's sentences and their order are kept.";

/**
 * The FR-20 precedence sentence. Specification v5 labels the wording a PROPOSED DEFAULT; the owner CONFIRMED it exactly as
 * written (H-FR20PREC, answered after the first TEST_WRITING run), so it is VERBATIM and normative.
 */
export const PRECEDENCE_SENTENCE =
  'where a store voice block defines its own bullet form, heading form, tone or punctuation limits, that block wins';

/**
 * Prose the new master text must NOT contain, because existing watch-item specs scan the master and the
 * Task C / optimizer payloads for it (plan D0.7, R21): task-translate.simplified.spec.ts line 83,
 * task-c.spec.ts lines 271 and 295, image-figure-style.prompt-examples.spec.ts line 57.
 */
export const WATCH_ITEM_FORBIDDEN = /§C[1-6]|CONSUMABLES|TRANSLATE the generic descriptor|reorder it category-first|fit-content/;

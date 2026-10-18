/**
 * operator-notes.ts - the `[Operator Notes]` block of the Task A prompt (US-9.1 FR-25, FR-26, FR-27).
 *
 * Leaf module: it has only type imports. `task-a.ts` (FROZEN) interpolates `buildOperatorNotesBlock` so the
 * text, the labels and the empty rule live here, not in the frozen file or in a service (AGENTS.md section 3,
 * Rule 3). The labels are English because the prompt language is independent of the UI language.
 */
import type { OperatorNotes } from '../app/types';

export type OperatorNoteKey = keyof OperatorNotes;

/** The four form values, one string per key (an empty textarea is the empty string). */
export type OperatorNotesFormValues = Record<OperatorNoteKey, string>;

/** The four keys in the order of the form and of the block, with their confirmed English labels. */
export const OPERATOR_NOTE_FIELDS: ReadonlyArray<{ readonly key: OperatorNoteKey; readonly label: string }> = [
  { key: 'usageScenarios', label: 'Usage scenarios' },
  { key: 'testResults', label: 'Test results' },
  { key: 'previousGenerationComparison', label: 'Comparison with the previous generation' },
  { key: 'limitations', label: 'Limitations' },
];

const HEADING = '[Operator Notes]';

const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/**
 * FR-25 empty rule: `undefined`, `{}` and an object whose four values are all empty or whitespace-only are
 * "no notes" and give `undefined`. Otherwise the object is returned with the filled values as typed.
 */
export function normalizeOperatorNotes(notes?: OperatorNotes): OperatorNotes | undefined {
  if (!notes) return undefined;
  const filled: OperatorNotes = {};
  let any = false;
  for (const { key } of OPERATOR_NOTE_FIELDS) {
    if (clean(notes[key]) !== '') {
      filled[key] = notes[key];
      any = true;
    }
  }
  return any ? filled : undefined;
}

/**
 * FR-26: `''` when there are no notes; otherwise `[Operator Notes]\n` + one `<label>: <value>` line per FILLED
 * entry (values trimmed, internal line breaks kept), in the fixed order, joined by `\n`, + `\n`.
 */
export function buildOperatorNotesBlock(notes?: OperatorNotes): string {
  const normalized = normalizeOperatorNotes(notes);
  if (!normalized) return '';
  const lines = OPERATOR_NOTE_FIELDS
    .filter(({ key }) => clean(normalized[key]) !== '')
    .map(({ key, label }) => `${label}: ${clean(normalized[key])}`);
  return `${HEADING}\n${lines.join('\n')}\n`;
}

/** Form values to the object sent in `ProductInput.operatorNotes`; `undefined` when every value is empty. */
export function toOperatorNotes(values: OperatorNotesFormValues): OperatorNotes | undefined {
  return normalizeOperatorNotes({
    usageScenarios: values.usageScenarios,
    testResults: values.testResults,
    previousGenerationComparison: values.previousGenerationComparison,
    limitations: values.limitations,
  });
}

/**
 * A neutral mapping from stored notes to the four form values: each absent key becomes `''`. It encodes no
 * decision about restoring an entry that has no notes (that lives in the form-state class).
 */
export function toFormValues(notes?: OperatorNotes): OperatorNotesFormValues {
  return {
    usageScenarios: notes?.usageScenarios ?? '',
    testResults: notes?.testResults ?? '',
    previousGenerationComparison: notes?.previousGenerationComparison ?? '',
    limitations: notes?.limitations ?? '',
  };
}

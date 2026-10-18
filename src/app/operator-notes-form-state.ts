/**
 * operator-notes-form-state.ts - the four operator-note textarea values (US-9.1 FR-25, FR-31, FR-41).
 *
 * A plain class: no decorator and no `inject()`, so it is created with `new` as a field of the component and is
 * testable without an injection context. It holds the values; the empty rule, the labels and the block text live
 * in the leaf module `prompts/operator-notes.ts`.
 */
import { signal } from '@angular/core';
import { toFormValues, toOperatorNotes, type OperatorNotesFormValues } from '../prompts/operator-notes';
import type { OperatorNotes } from './types';

const emptyValues = (): OperatorNotesFormValues => toFormValues(undefined);

export class OperatorNotesFormState {
  readonly values = signal<OperatorNotesFormValues>(emptyValues());

  /** Replaces the four values (the component emits the full four-key object on every input event). */
  set(values: OperatorNotesFormValues): void {
    this.values.set(values);
  }

  /**
   * FR-31 items 2, 4, 5: an entry with notes fills the four values; an entry without notes (or `{}`) empties them,
   * so the next Generate / UA Description click resends exactly what is shown.
   */
  restore(notes?: OperatorNotes): void {
    this.set(toFormValues(notes));
  }

  /** FR-41 item 1: Clear All empties the four values. */
  clear(): void {
    this.set(emptyValues());
  }

  /**
   * `{}` when the notes are empty by the FR-25 rule, else `{ operatorNotes }`. Spread into the built input, so an
   * empty form leaves the key absent (FR-27; an explicit `operatorNotes: undefined` would still be a key).
   */
  inputPart(): { operatorNotes?: OperatorNotes } {
    const operatorNotes = toOperatorNotes(this.values());
    return operatorNotes ? { operatorNotes } : {};
  }
}

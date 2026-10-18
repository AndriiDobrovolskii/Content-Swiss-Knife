import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { OPERATOR_NOTE_FIELDS, type OperatorNoteKey, type OperatorNotesFormValues } from '../../../prompts/operator-notes';

/**
 * The four optional operator-note textareas of the Generator form (US-9.1 FR-24).
 *
 * Usage scenarios, test results, comparison with the previous generation and limitations. Every box is optional
 * (no `required`, no placeholder, no validation message). The component holds no state of its own: the parent
 * owns the four values and reacts to `valuesChange`, which emits the FULL four-key object on every input event,
 * untrimmed (the empty rule is applied downstream, FR-25). Precedent: `content-template-select.component`.
 */
@Component({
  selector: 'app-operator-notes-fields',
  standalone: true,
  templateUrl: './operator-notes-fields.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperatorNotesFieldsComponent {
  /** The four current values, one string per key. */
  values = input.required<OperatorNotesFormValues>();
  /** The four interface-language labels, keyed by the same four keys. */
  labels = input.required<Record<OperatorNoteKey, string>>();

  valuesChange = output<OperatorNotesFormValues>();

  /** The keys in the order of the form (FR-24). */
  readonly keys: readonly OperatorNoteKey[] = OPERATOR_NOTE_FIELDS.map(f => f.key);

  onInput(key: OperatorNoteKey, event: Event) {
    this.valuesChange.emit({ ...this.values(), [key]: (event.target as HTMLTextAreaElement).value });
  }
}

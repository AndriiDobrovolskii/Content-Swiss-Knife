import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';
import { CONTENT_TEMPLATES } from '../../types';
import { isSimplifiedTemplateId } from '../../../prompt-core/simplified-templates';
import { TEMPLATE_ID_LABEL_KEY, type TemplateLabelKey } from '../../content-template-labels';

/**
 * The Content Template dropdown, shared by the Generator form and the SEO-only form (US-2.2 FR-1).
 *
 * Exactly four options, in order: "Full description" (the static value `''`, meaning no templateId),
 * then the three simplified templates from CONTENT_TEMPLATES. There is deliberately no empty
 * "Select Template..." option: Full description is the default selection.
 *
 * The optional "Include Functionality (§3)" checkbox is shown only when the parent asks for it
 * (the Generator form, Accessories template). The component holds no state of its own: the parent owns
 * the selected id and the flag and reacts to the two outputs.
 */
@Component({
  selector: 'app-content-template-select',
  standalone: true,
  templateUrl: './content-template-select.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentTemplateSelectComponent {
  /** The selected template id; `''` is Full description. */
  value = input<string>('');
  /** The `TEMPLATE_LABELS` map for the active UI language. */
  labels = input.required<Record<TemplateLabelKey, string>>();
  showFunctionalityToggle = input<boolean>(false);
  functionalityChecked = input<boolean>(false);
  /** Extra classes for the `<select>`: each form styles its own focus ring. */
  selectClass = input<string>('');

  templateChange = output<string>();
  functionalityChange = output<boolean>();

  options = computed(() => [
    { value: '', label: this.labels().templateFull },
    ...CONTENT_TEMPLATES
      .filter(t => isSimplifiedTemplateId(t.id))
      .map(t => ({ value: t.id, label: this.labels()[TEMPLATE_ID_LABEL_KEY[t.id as keyof typeof TEMPLATE_ID_LABEL_KEY]] })),
  ]);

  onSelect(event: Event) {
    this.templateChange.emit((event.target as HTMLSelectElement).value);
  }

  onToggle(event: Event) {
    this.functionalityChange.emit((event.target as HTMLInputElement).checked);
  }
}

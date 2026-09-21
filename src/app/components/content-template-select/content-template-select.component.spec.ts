/**
 * US-2.2 T14 — the Content Template dropdown component (AC-1, AC-2, AC-9).
 *
 * Runs under the Angular `unit-test` builder (`npm run test:components`); the `*.component.spec.ts`
 * suffix is the runner boundary. Queries the way a user finds things — by role and accessible name —
 * and drives with user-event.
 *
 * Contract taken from plan D7: inputs `value`, `labels`, `showFunctionalityToggle`,
 * `functionalityChecked`; outputs `templateChange`, `functionalityChange`. Option values: Full
 * description is the static `''`, then the three registry ids. The component renders NO empty
 * "Select Template..." option under any state (AC-1 failure path).
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ContentTemplateSelectComponent } from './content-template-select.component';
import { TEMPLATE_LABELS } from '../../content-template-labels';

const EN_NAMES = ['Full description', 'Filaments, resins, powders', 'Accessories', 'Spare parts'];
const UA_NAMES = ['Повний опис', 'Філаменти, смоли, порошки', 'Аксесуари', 'Запчастини'];
const VALUES = ['', 'filaments-resins-powders', 'accessories', 'spare-parts'];

const inputs = (over: Record<string, unknown> = {}) => ({
  value: '',
  labels: { ...TEMPLATE_LABELS.en },
  showFunctionalityToggle: false,
  functionalityChecked: false,
  ...over,
});

describe('ContentTemplateSelectComponent — AC-1: exactly four options, in order, Full selected', () => {
  it('lists Full description, Filaments/resins/powders, Accessories, Spare parts in that order (EN)', async () => {
    await render(ContentTemplateSelectComponent, { inputs: inputs() });
    expect(screen.getAllByRole('option').map(o => o.textContent?.trim())).toEqual(EN_NAMES);
  });

  it('has exactly four options: no empty "Select Template..." option', async () => {
    await render(ContentTemplateSelectComponent, { inputs: inputs() });
    const options = screen.getAllByRole('option') as HTMLOptionElement[];
    expect(options).toHaveLength(4);
    expect(options.some(o => o.value === '' && o.textContent?.trim() !== 'Full description')).toBe(false);
    expect(screen.queryByRole('option', { name: /select template/i })).toBeNull();
  });

  it('option values are the static empty string for Full, then the three registry ids', async () => {
    await render(ContentTemplateSelectComponent, { inputs: inputs() });
    expect((screen.getAllByRole('option') as HTMLOptionElement[]).map(o => o.value)).toEqual(VALUES);
  });

  it('"Full description" is selected by default', async () => {
    await render(ContentTemplateSelectComponent, { inputs: inputs({ value: '' }) });
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.selectedOptions[0].textContent?.trim()).toBe('Full description');
  });

  it('reflects a chosen template from its value input', async () => {
    await render(ContentTemplateSelectComponent, { inputs: inputs({ value: 'spare-parts' }) });
    expect((screen.getByRole('combobox') as HTMLSelectElement).selectedOptions[0].textContent?.trim()).toBe('Spare parts');
  });
});

describe('ContentTemplateSelectComponent — AC-2: labels come from the uiLabels map, EN and UA', () => {
  it('renders the Ukrainian labels when given the UA label map', async () => {
    await render(ContentTemplateSelectComponent, { inputs: inputs({ labels: { ...TEMPLATE_LABELS.uk } }) });
    expect(screen.getAllByRole('option').map(o => o.textContent?.trim())).toEqual(UA_NAMES);
  });

  it.each([['EN', TEMPLATE_LABELS.en], ['UA', TEMPLATE_LABELS.uk]] as const)('never shows the removed consumables option (%s)', async (_lang, labels) => {
    await render(ContentTemplateSelectComponent, { inputs: inputs({ labels: { ...labels } }) });
    expect(screen.queryByRole('option', { name: /consumables|витратні/i })).toBeNull();
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });
});

describe('ContentTemplateSelectComponent — selecting a template', () => {
  it.each([
    ['Filaments, resins, powders', 'filaments-resins-powders'],
    ['Accessories', 'accessories'],
    ['Spare parts', 'spare-parts'],
  ])('choosing "%s" emits templateChange(%s)', async (name, id) => {
    const user = userEvent.setup();
    const emitted: string[] = [];
    await render(ContentTemplateSelectComponent, { inputs: inputs(), on: { templateChange: (v: string) => emitted.push(v) } });
    await user.selectOptions(screen.getByRole('combobox'), screen.getByRole('option', { name }));
    expect(emitted).toEqual([id]);
  });

  it('choosing "Full description" back emits the empty string (Full = no templateId)', async () => {
    const user = userEvent.setup();
    const emitted: string[] = [];
    await render(ContentTemplateSelectComponent, { inputs: inputs({ value: 'accessories' }), on: { templateChange: (v: string) => emitted.push(v) } });
    await user.selectOptions(screen.getByRole('combobox'), screen.getByRole('option', { name: 'Full description' }));
    expect(emitted).toEqual(['']);
  });
});

describe('ContentTemplateSelectComponent — AC-9: the "Include Functionality (§3)" checkbox', () => {
  it('is absent unless the parent asks for it (every non-Accessories template, and the SEO-only form)', async () => {
    await render(ContentTemplateSelectComponent, { inputs: inputs({ value: 'filaments-resins-powders', showFunctionalityToggle: false }) });
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('is visible with the EN label when shown', async () => {
    await render(ContentTemplateSelectComponent, { inputs: inputs({ value: 'accessories', showFunctionalityToggle: true }) });
    expect(screen.getByRole('checkbox', { name: 'Include Functionality (§3)' })).toBeDefined();
  });

  it('is visible with the UA label when shown in Ukrainian', async () => {
    await render(ContentTemplateSelectComponent, {
      inputs: inputs({ value: 'accessories', labels: { ...TEMPLATE_LABELS.uk }, showFunctionalityToggle: true }),
    });
    expect(screen.getByRole('checkbox', { name: 'Додати блок Функціональність (§3)' })).toBeDefined();
  });

  it('is unchecked by default', async () => {
    await render(ContentTemplateSelectComponent, { inputs: inputs({ value: 'accessories', showFunctionalityToggle: true, functionalityChecked: false }) });
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
  });

  it('reflects functionalityChecked when true', async () => {
    await render(ContentTemplateSelectComponent, { inputs: inputs({ value: 'accessories', showFunctionalityToggle: true, functionalityChecked: true }) });
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
  });

  it('clicking it emits functionalityChange(true)', async () => {
    const user = userEvent.setup();
    const emitted: boolean[] = [];
    await render(ContentTemplateSelectComponent, {
      inputs: inputs({ value: 'accessories', showFunctionalityToggle: true }),
      on: { functionalityChange: (v: boolean) => emitted.push(v) },
    });
    await user.click(screen.getByRole('checkbox', { name: 'Include Functionality (§3)' }));
    expect(emitted).toEqual([true]);
  });

  it('unchecking it emits functionalityChange(false)', async () => {
    const user = userEvent.setup();
    const emitted: boolean[] = [];
    await render(ContentTemplateSelectComponent, {
      inputs: inputs({ value: 'accessories', showFunctionalityToggle: true, functionalityChecked: true }),
      on: { functionalityChange: (v: boolean) => emitted.push(v) },
    });
    await user.click(screen.getByRole('checkbox'));
    expect(emitted).toEqual([false]);
  });
});

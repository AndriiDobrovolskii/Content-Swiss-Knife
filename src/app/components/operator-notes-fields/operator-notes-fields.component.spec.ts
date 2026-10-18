/**
 * US-9.1 T11 (FR-24, AC-9) - the four optional operator-note textareas of the Generator form.
 *
 * Runs under the Angular `unit-test` builder (`npm run test:components`); the `*.component.spec.ts` suffix is
 * the runner boundary. Queries the way a user finds things (role and accessible name) and asserts what the user
 * observes: four labelled text boxes, the values shown, the object emitted when the user types. No class field
 * and no CSS class is read.
 *
 * Specification FR-24 (labels confirmed by the owner, OD-2(c), 2026-10-17): four optional textareas for usage
 * scenarios, test results, comparison with the previous generation and limitations, each bound to one
 * `operatorNotes` key (FR-25), each may be left empty (no `required` constraint, no validation message), no
 * placeholder text. Labels per interface language - en: `Usage scenarios (optional)`, `Test results (optional)`,
 * `Comparison with the previous generation (optional)`, `Limitations (optional)`; uk: `Сценарії використання
 * (необов'язково)`, `Результати тестів (необов'язково)`, `Порівняння з попереднім поколінням (необов'язково)`,
 * `Обмеження (необов'язково)`.
 *
 * CONTRACT TAKEN FROM PLAN D9 (not from the Specification, flagged so a builder who chooses another shape loops
 * back instead of guessing): a standalone component `OperatorNotesFieldsComponent` in
 * `operator-notes-fields.component.ts`, with signal inputs `values` (the four strings) and `labels` (the four
 * labels, keyed by the same four `operatorNotes` keys) and an output `valuesChange` that emits the FULL
 * four-key object on every input event. The component holds no state of its own (precedent:
 * `content-template-select.component`).
 *
 * RED BY LOAD until T11 creates the component (task breakdown constraint 1). T11 is GATED on T21 (the
 * `task-a.ts` T-A4 approval, H-OD12): a textarea whose text never reaches a prompt must not ship. The
 * application wiring of the component (placement, the eight TRANSLATIONS keys, the state object) is T12 and
 * pinned in `src/app/app.component.operator-notes.spec.ts` (H-FR41TEST answered: the default split), with the state
 * object's behaviour in `src/app/operator-notes-form-state.spec.ts`.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { OperatorNotesFieldsComponent } from './operator-notes-fields.component';

const KEYS = ['usageScenarios', 'testResults', 'previousGenerationComparison', 'limitations'] as const;
type Values = Record<(typeof KEYS)[number], string>;

const EN: Values = {
  usageScenarios: 'Usage scenarios (optional)',
  testResults: 'Test results (optional)',
  previousGenerationComparison: 'Comparison with the previous generation (optional)',
  limitations: 'Limitations (optional)',
};
const UK: Values = {
  usageScenarios: "Сценарії використання (необов'язково)",
  testResults: "Результати тестів (необов'язково)",
  previousGenerationComparison: "Порівняння з попереднім поколінням (необов'язково)",
  limitations: "Обмеження (необов'язково)",
};
const EMPTY: Values = { usageScenarios: '', testResults: '', previousGenerationComparison: '', limitations: '' };

async function renderFields(labels: Values, values: Values = EMPTY) {
  const emitted: Values[] = [];
  await render(OperatorNotesFieldsComponent, {
    inputs: { values, labels },
    on: { valuesChange: (v: Values) => { emitted.push(v); } },
  });
  return emitted;
}

describe.each([['English', EN], ['Ukrainian', UK]] as const)('OperatorNotesFieldsComponent - four accessible textareas (%s labels)', (_lang, labels) => {
  it('renders exactly four text boxes', async () => {
    await renderFields(labels);
    expect(screen.getAllByRole('textbox')).toHaveLength(4);
  });

  it.each(KEYS)('renders a text box named by the %s label', async key => {
    await renderFields(labels);
    expect(screen.getByRole('textbox', { name: labels[key] }).tagName).toBe('TEXTAREA');
  });

  it('lists them in the order of FR-24: usage scenarios, test results, comparison, limitations', async () => {
    await renderFields(labels);
    const names = screen.getAllByRole('textbox').map(t => t.getAttribute('id'))
      .map(id => document.querySelector(`label[for="${id}"]`)?.textContent?.trim());
    expect(names).toEqual(KEYS.map(k => labels[k]));
  });

  it('marks none of them required and gives none a placeholder (FR-24: optional, no placeholder text)', async () => {
    await renderFields(labels);
    for (const box of screen.getAllByRole('textbox') as HTMLTextAreaElement[]) {
      expect(box.required).toBe(false);
      expect(box.hasAttribute('required')).toBe(false);
      expect(box.hasAttribute('aria-required')).toBe(false);
      expect(box.getAttribute('placeholder') ?? '').toBe('');
    }
  });

  it('shows no validation message while every box is empty', async () => {
    await renderFields(labels);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('OperatorNotesFieldsComponent - shows the values it is given', () => {
  it('each box displays its own value', async () => {
    const values: Values = { usageScenarios: 'Prototyping', testResults: 'Printed 40 parts', previousGenerationComparison: 'Quieter', limitations: 'Cable required' };
    await renderFields(EN, values);
    for (const key of KEYS) expect((screen.getByRole('textbox', { name: EN[key] }) as HTMLTextAreaElement).value).toBe(values[key]);
  });

  it('keeps a multi-line value as typed', async () => {
    await renderFields(EN, { ...EMPTY, usageScenarios: 'First scenario\nSecond scenario' });
    expect((screen.getByRole('textbox', { name: EN.usageScenarios }) as HTMLTextAreaElement).value).toBe('First scenario\nSecond scenario');
  });
});

describe('OperatorNotesFieldsComponent - typing emits the updated four-key object', () => {
  it('typing into one box emits the full object: that key changed, the other three as given', async () => {
    const emitted = await renderFields(EN, { usageScenarios: 'Prototyping', testResults: '', previousGenerationComparison: '', limitations: 'Cable required' });
    fireEvent.input(screen.getByRole('textbox', { name: EN.testResults }), { target: { value: 'Printed 40 parts' } });
    expect(emitted).toEqual([{
      usageScenarios: 'Prototyping', testResults: 'Printed 40 parts', previousGenerationComparison: '', limitations: 'Cable required',
    }]);
  });

  it('a user-event keystroke emits once per input event', async () => {
    const user = userEvent.setup();
    const emitted = await renderFields(UK);
    await user.type(screen.getByRole('textbox', { name: UK.limitations }), 'X');
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual({ ...EMPTY, limitations: 'X' });
  });

  it('emits the key as an empty string, not undefined, when the user clears a box (empty stays empty)', async () => {
    const emitted = await renderFields(EN, { ...EMPTY, testResults: 'abc' });
    fireEvent.input(screen.getByRole('textbox', { name: EN.testResults }), { target: { value: '' } });
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual(EMPTY);
    expect(Object.keys(emitted[0]).sort()).toEqual([...KEYS].sort());
  });

  it('emits nothing until the user types', async () => {
    const emitted = await renderFields(EN);
    expect(emitted).toEqual([]);
  });

  it('does not trim or normalise what the user typed (the empty rule is applied downstream, FR-25)', async () => {
    const emitted = await renderFields(EN);
    fireEvent.input(screen.getByRole('textbox', { name: EN.usageScenarios }), { target: { value: '  spaced \n' } });
    expect(emitted[0].usageScenarios).toBe('  spaced \n');
  });
});

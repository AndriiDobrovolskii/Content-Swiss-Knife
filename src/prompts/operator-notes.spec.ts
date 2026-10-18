/**
 * operator-notes.spec.ts - US-9.1 T9 (FR-25, FR-26, FR-27; AC-9): the leaf module that owns the operator-notes
 * empty rule, the `[Operator Notes]` block and the form helpers.
 *
 * The four Generator textareas (usage scenarios, test results, comparison with the previous generation,
 * limitations) travel in the new optional `ProductInput.operatorNotes`, not in `supplementalContent` (the only
 * FAQ trigger). `task-a.ts` (FROZEN, T21) emits the block through `buildOperatorNotesBlock`, so the bytes of the
 * block are pinned HERE, independently of the frozen file and of any approval.
 *
 * Everything asserted below is owner-confirmed text (OD-16, OD-17, 2026-10-17) and takes no wording latitude:
 *  - keys, in the order of FR-24: `usageScenarios`, `testResults`, `previousGenerationComparison`, `limitations`;
 *  - a value is EMPTY when undefined or when its `.trim()` is ''; `operatorNotes` is empty when undefined or
 *    all four values are empty;
 *  - the English labels (the prompt language, independent of the UI language): `Usage scenarios:`,
 *    `Test results:`, `Comparison with the previous generation:`, `Limitations:`;
 *  - each entry is one line `<label> <value>` (one space after the colon, value trimmed, internal line breaks
 *    kept as typed), entries joined by a single `\n`, heading `[Operator Notes]` on its own first line, and the
 *    block ends with `\n`; only filled entries are emitted (no line, no label, no "None provided." for an
 *    empty one); when all are empty the block is the empty string.
 *
 * The helper NAMES are the plan's (D8): `OPERATOR_NOTE_FIELDS`, `normalizeOperatorNotes`,
 * `buildOperatorNotesBlock`, `toOperatorNotes`, `toFormValues`. `toFormValues(undefined)` is a NEUTRAL mapping
 * (four empty strings); the decided restore behaviour (an entry without notes empties the textareas, OD-2 R2)
 * lives in the form-state class and is not asserted here.
 *
 * RED BY LOAD until T9 creates `src/prompts/operator-notes.ts` (task breakdown constraint 1).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  OPERATOR_NOTE_FIELDS, normalizeOperatorNotes, buildOperatorNotesBlock, toOperatorNotes, toFormValues,
} from './operator-notes';

const HEADING = '[Operator Notes]';
const KEYS = ['usageScenarios', 'testResults', 'previousGenerationComparison', 'limitations'] as const;
const LABELS = ['Usage scenarios:', 'Test results:', 'Comparison with the previous generation:', 'Limitations:'] as const;

const EMPTY_VALUES = { usageScenarios: '', testResults: '', previousGenerationComparison: '', limitations: '' };

describe('OPERATOR_NOTE_FIELDS - the ordered keys and the confirmed English labels (OD-16, OD-17)', () => {
  const serialized = JSON.stringify(OPERATOR_NOTE_FIELDS);

  it('lists the four keys in the order of FR-24', () => {
    const at = KEYS.map(k => serialized.indexOf(k));
    expect(at.every(i => i >= 0), `a key is missing from ${serialized}`).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('carries the confirmed English label of each key', () => {
    for (const label of LABELS) expect(serialized, `label ${label}`).toContain(label.replace(/:$/, ''));
  });
});

describe('the empty rule (FR-25)', () => {
  it.each([
    ['undefined', undefined],
    ['{}', {}],
    ['one empty key', { testResults: '' }],
    ['four empty strings', { ...EMPTY_VALUES }],
    ['four whitespace-only strings', { usageScenarios: ' ', testResults: '\n', previousGenerationComparison: '\t ', limitations: '  \n ' }],
    ['keys explicitly undefined', { usageScenarios: undefined, limitations: undefined }],
  ])('operatorNotes = %s is empty: normalizeOperatorNotes gives undefined and the block is the empty string', (_label, notes) => {
    expect(normalizeOperatorNotes(notes)).toBeUndefined();
    expect(buildOperatorNotesBlock(notes)).toBe('');
  });

  it('a single non-empty value makes the object non-empty, and the filled value survives normalisation', () => {
    const normalized = normalizeOperatorNotes({ usageScenarios: '  Fast prototyping  ', testResults: '' });
    expect(normalized).toBeDefined();
    expect(normalized!.usageScenarios?.trim()).toBe('Fast prototyping');
  });
});

describe('buildOperatorNotesBlock - the exact bytes of the block (FR-26, confirmed by the owner)', () => {
  it('all four filled: heading line, the four entries in the confirmed order, one \\n between them, a trailing \\n', () => {
    const block = buildOperatorNotesBlock({
      usageScenarios: 'Prototyping brackets',
      testResults: 'Printed 40 parts at 0.2 mm',
      previousGenerationComparison: 'Faster than the previous model',
      limitations: 'Cable required for the laser mode',
    });
    expect(block).toBe(
      '[Operator Notes]\n'
      + 'Usage scenarios: Prototyping brackets\n'
      + 'Test results: Printed 40 parts at 0.2 mm\n'
      + 'Comparison with the previous generation: Faster than the previous model\n'
      + 'Limitations: Cable required for the laser mode\n',
    );
  });

  it('partial fill: only the filled entries, in the confirmed order, no empty line and no "None provided."', () => {
    expect(buildOperatorNotesBlock({ limitations: 'Cable required', usageScenarios: 'Prototyping' }))
      .toBe('[Operator Notes]\nUsage scenarios: Prototyping\nLimitations: Cable required\n');
    expect(buildOperatorNotesBlock({ testResults: 'Printed 40 parts' })).toBe('[Operator Notes]\nTest results: Printed 40 parts\n');
    const partial = buildOperatorNotesBlock({ previousGenerationComparison: 'Quieter', testResults: ' ', limitations: '' });
    expect(partial).toBe('[Operator Notes]\nComparison with the previous generation: Quieter\n');
    expect(partial).not.toContain('None provided.');
    expect(partial).not.toContain('Limitations');
  });

  it('prints the entries in the confirmed order whatever order the keys were assigned in', () => {
    const block = buildOperatorNotesBlock({ limitations: 'D', previousGenerationComparison: 'C', testResults: 'B', usageScenarios: 'A' });
    expect(block).toBe(
      '[Operator Notes]\nUsage scenarios: A\nTest results: B\nComparison with the previous generation: C\nLimitations: D\n',
    );
  });

  it('trims each value but keeps its internal line breaks as typed', () => {
    const block = buildOperatorNotesBlock({ usageScenarios: '  First scenario\nSecond scenario  \n', limitations: '\n\tOne\n\nTwo ' });
    expect(block).toBe('[Operator Notes]\nUsage scenarios: First scenario\nSecond scenario\nLimitations: One\n\nTwo\n');
  });

  it('starts with the heading on its own line and ends with exactly one line break', () => {
    const block = buildOperatorNotesBlock({ usageScenarios: 'A' });
    expect(block.startsWith(`${HEADING}\n`)).toBe(true);
    expect(block.endsWith('\n')).toBe(true);
    expect(block.endsWith('\n\n')).toBe(false);
  });

  it('is English whatever the language of the values (the prompt language is not the UI language)', () => {
    const block = buildOperatorNotesBlock({ usageScenarios: 'Друк кронштейнів', limitations: 'Потрібен кабель' });
    expect(block).toBe('[Operator Notes]\nUsage scenarios: Друк кронштейнів\nLimitations: Потрібен кабель\n');
  });

  it('is a pure function: the same input gives the same block, and the input object is not mutated', () => {
    const notes = { usageScenarios: '  A  ', testResults: '' };
    const copy = structuredClone(notes);
    expect(buildOperatorNotesBlock(notes)).toBe(buildOperatorNotesBlock(notes));
    expect(notes).toEqual(copy);
  });
});

describe('toOperatorNotes / toFormValues - the form helpers (FR-25 form side, neutral mapping)', () => {
  it('toOperatorNotes: four empty or whitespace-only values give undefined (no key will be sent)', () => {
    expect(toOperatorNotes({ ...EMPTY_VALUES })).toBeUndefined();
    expect(toOperatorNotes({ usageScenarios: ' ', testResults: '\n', previousGenerationComparison: '', limitations: '\t' })).toBeUndefined();
  });

  it('toOperatorNotes: a filled form gives an object whose block is exactly the filled entries', () => {
    const notes = toOperatorNotes({ usageScenarios: 'Prototyping', testResults: '', previousGenerationComparison: '', limitations: 'Cable required' });
    expect(notes).toBeDefined();
    expect(buildOperatorNotesBlock(notes)).toBe('[Operator Notes]\nUsage scenarios: Prototyping\nLimitations: Cable required\n');
  });

  it('toFormValues: undefined and {} become four empty strings (a mapping only: no decision about restoring is encoded)', () => {
    expect(toFormValues(undefined)).toEqual(EMPTY_VALUES);
    expect(toFormValues({})).toEqual(EMPTY_VALUES);
  });

  it('toFormValues: each absent key becomes an empty string and each present key keeps its value', () => {
    expect(toFormValues({ testResults: 'Printed 40 parts' }))
      .toEqual({ usageScenarios: '', testResults: 'Printed 40 parts', previousGenerationComparison: '', limitations: '' });
  });

  it('round trip: a filled four-value form survives toOperatorNotes then toFormValues unchanged', () => {
    const values = { usageScenarios: 'A', testResults: 'B', previousGenerationComparison: 'C', limitations: 'D' };
    expect(toFormValues(toOperatorNotes(values))).toEqual(values);
  });
});

describe('operator-notes.ts is a dependency-free leaf (plan D8, NFR-5)', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'prompts', 'operator-notes.ts'), 'utf8');

  it('has only type imports: no runtime import, and nothing from @angular/core', () => {
    const imports = source.split(/\r?\n/).filter(l => /^import\s/.test(l));
    expect(imports.filter(l => !/^import\s+type\s/.test(l))).toEqual([]);
    expect(source).not.toContain('@angular/core');
  });
});

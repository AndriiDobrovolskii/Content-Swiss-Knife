/**
 * US-2.2 T14 — AC-2 / FR-2: the four Content Template labels, EN and UA, come from the `uiLabels`
 * mechanism (a pure module here so plain vitest can import it — plan B1), plus the AC-9 checkbox label
 * and the `CONTENT_TEMPLATES` list the dropdown is built from.
 *
 * FR-2 failure path: a label key missing for the active UI language must fail the build or a test —
 * never render as a raw key or blank. The `Record<TemplateLabelKey, string>` annotation gives the build
 * half; the key-set and non-empty assertions here give the test half.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEMPLATE_LABEL_KEYS, TEMPLATE_LABELS } from './content-template-labels';
import { CONTENT_TEMPLATES } from './types';
import { SIMPLIFIED_TEMPLATE_IDS } from '../prompt-core/simplified-templates';

const KEYS = ['templateFull', 'templateFilaments', 'templateAccessories', 'templateSpareParts', 'includeFunctionality'];

describe('AC-2 — the label module', () => {
  it('declares exactly the five template keys', () => {
    expect([...TEMPLATE_LABEL_KEYS].sort()).toEqual([...KEYS].sort());
  });

  it.each(['en', 'uk'] as const)('%s: every key is a non-empty string that is not the raw key', lang => {
    for (const key of KEYS) {
      const value = (TEMPLATE_LABELS[lang] as Record<string, string>)[key];
      expect(typeof value, `${lang}.${key}`).toBe('string');
      expect(value.trim().length, `${lang}.${key}`).toBeGreaterThan(0);
      expect(value, `${lang}.${key} leaks its own key`).not.toBe(key);
    }
  });

  it('EN and UA carry exactly the same key set (a key missing in one language is a failure)', () => {
    expect(Object.keys(TEMPLATE_LABELS.en).sort()).toEqual(Object.keys(TEMPLATE_LABELS.uk).sort());
    expect(Object.keys(TEMPLATE_LABELS.en).sort()).toEqual([...KEYS].sort());
  });

  it('EN renders "Full description / Filaments, resins, powders / Accessories / Spare parts"', () => {
    expect(TEMPLATE_LABELS.en.templateFull).toBe('Full description');
    expect(TEMPLATE_LABELS.en.templateFilaments).toBe('Filaments, resins, powders');
    expect(TEMPLATE_LABELS.en.templateAccessories).toBe('Accessories');
    expect(TEMPLATE_LABELS.en.templateSpareParts).toBe('Spare parts');
  });

  it('UA renders "Повний опис / Філаменти, смоли, порошки / Аксесуари / Запчастини"', () => {
    expect(TEMPLATE_LABELS.uk.templateFull).toBe('Повний опис');
    expect(TEMPLATE_LABELS.uk.templateFilaments).toBe('Філаменти, смоли, порошки');
    expect(TEMPLATE_LABELS.uk.templateAccessories).toBe('Аксесуари');
    expect(TEMPLATE_LABELS.uk.templateSpareParts).toBe('Запчастини');
  });

  it('AC-9: the checkbox label is "Include Functionality (§3)" / "Додати блок Функціональність (§3)"', () => {
    expect(TEMPLATE_LABELS.en.includeFunctionality).toBe('Include Functionality (§3)');
    expect(TEMPLATE_LABELS.uk.includeFunctionality).toBe('Додати блок Функціональність (§3)');
  });

  it('the removed consumables label key is gone', () => {
    for (const lang of ['en', 'uk'] as const) {
      expect(Object.keys(TEMPLATE_LABELS[lang])).not.toContain('consumablesTemplateName');
    }
  });
});

describe('AC-2 — app.component wires the labels into uiLabels and drops the old key', () => {
  const src = readFileSync(join(process.cwd(), 'src', 'app', 'app.component.ts'), 'utf8');
  it('spreads TEMPLATE_LABELS.en and TEMPLATE_LABELS.uk into the two TRANSLATIONS entries', () => {
    expect(src).toMatch(/\.\.\.\s*TEMPLATE_LABELS\.en/);
    expect(src).toMatch(/\.\.\.\s*TEMPLATE_LABELS\.uk/);
  });
  it('no longer defines consumablesTemplateName', () => {
    expect(src).not.toContain('consumablesTemplateName');
  });
});

describe('AC-1 / AC-2 — CONTENT_TEMPLATES holds the three simplified entries and no consumables option', () => {
  it('has exactly the three registry ids, in order', () => {
    expect(CONTENT_TEMPLATES.map(t => t.id)).toEqual([...SIMPLIFIED_TEMPLATE_IDS]);
  });
  it('every entry is offered for all four store groups', () => {
    for (const t of CONTENT_TEMPLATES) expect([...t.geo].sort()).toEqual(['ES', 'EU', 'UA', 'US']);
  });
  it('Full description is not an entry (its identity is templateId === undefined, OD-5)', () => {
    expect(CONTENT_TEMPLATES.some(t => t.id === '' || t.id === 'full')).toBe(false);
  });
  it('no entry describes a consumables schema or a 5500-character hard ceiling', () => {
    for (const t of CONTENT_TEMPLATES) expect(t.description).not.toMatch(/consumables schema|hard/i);
  });
});

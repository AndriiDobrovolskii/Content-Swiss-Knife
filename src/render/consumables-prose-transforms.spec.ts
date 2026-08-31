/**
 * consumables-prose-transforms.spec.ts
 *
 * Mirrors doc-prose-transforms.spec.ts's structure for the Consumables sibling: an exhaustiveness
 * check driven by the document itself (so a field added to the model and forgotten in the mapper
 * fails immediately), plus the production-chain behavior that motivated this module — a Latin-
 * script unit becoming Cyrillic in body prose, the way it already does for the storefront name.
 */
import { describe, it, expect } from 'vitest';

import { mapConsumablesDocText, normalizeConsumablesDocProse, NON_TEXT_PATHS } from './consumables-prose-transforms';
import { ConsumablesDescriptionDocSchema } from '../domain/consumables-doc.schema';
import type { ConsumablesDescriptionDoc } from '../domain/consumables-doc';

/** Every text-bearing field carries a distinct marker, so a missed one is identifiable. */
function docWithEveryField(): ConsumablesDescriptionDoc {
  return {
    schemaVersion: 'C1',
    locale: 'uk-UA',
    localizedName: 'name',
    hook: 'hook',
    features: {
      heading: 'feat-heading',
      items: [
        { lead: 'feat-lead-1:', text: 'feat-text-1' },
        { lead: 'feat-lead-2:', text: 'feat-text-2' },
        { lead: 'feat-lead-3:', text: 'feat-text-3' },
        { lead: 'feat-lead-4:', text: 'feat-text-4' },
      ],
    },
    applications: {
      heading: 'app-heading',
      items: [
        { lead: 'app-lead-1:', text: 'app-text-1' },
        { lead: 'app-lead-2:', text: 'app-text-2' },
        { lead: 'app-lead-3:', text: 'app-text-3' },
      ],
    },
    specGroups: [
      { heading: 'sg-heading', rows: [{ label: 'sg-label', value: 'sg-value' }] },
    ],
    storage: {
      heading: 'store-heading',
      items: [
        { lead: 'store-lead-1:', text: 'store-text-1' },
        { lead: 'store-lead-2:', text: 'store-text-2' },
      ],
    },
    cta: 'cta-text',
    figures: [{ file: 'f.jpg', alt: 'fig-alt', leadIn: 'fig-leadin', caption: 'fig-caption' }],
  };
}

/** Collects every string in the document, with its JSON path, so nothing is asserted from memory. */
function collectStrings(node: unknown, path = '', out: Array<[string, string]> = []): Array<[string, string]> {
  if (typeof node === 'string') out.push([path, node]);
  else if (Array.isArray(node)) node.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) collectStrings(v, path ? `${path}.${k}` : k, out);
  }
  return out;
}

/** Structural strings are excluded by PATH, matching NON_TEXT_PATHS. */
const isText = (path: string) => !NON_TEXT_PATHS.some(rx => rx.test(path));

describe('mapConsumablesDocText — completeness', () => {
  it('transforms every text field and leaves no prose untouched', () => {
    const mapped = mapConsumablesDocText(docWithEveryField(), () => '@');
    const missed = collectStrings(mapped).filter(([p, v]) => isText(p) && v !== '@');
    expect(missed).toEqual([]);
  });

  it('leaves structural strings alone', () => {
    const mapped = mapConsumablesDocText(docWithEveryField(), () => '@');
    expect(mapped.schemaVersion).toBe('C1');
    expect(mapped.locale).toBe('uk-UA');
    expect(mapped.figures[0].file).toBe('f.jpg');
  });

  it('does not mutate the input', () => {
    const doc = docWithEveryField();
    const before = JSON.stringify(doc);
    mapConsumablesDocText(doc, () => '@');
    expect(JSON.stringify(doc)).toBe(before);
  });

  it('keeps the result a valid document', () => {
    const mapped = mapConsumablesDocText(docWithEveryField(), t => t.toUpperCase());
    expect(ConsumablesDescriptionDocSchema.safeParse(mapped).success).toBe(true);
  });
});

/** Same NBSP unit-cyrillize.ts inserts between a number and its localized unit. */
const NBSP = ' ';

describe('normalizeConsumablesDocProse — the production chain, on Doc fields', () => {
  it('converts a Latin-script unit to Cyrillic for uk-UA', () => {
    const doc = docWithEveryField();
    doc.hook = 'Вага котушки 1 kg.';
    expect(normalizeConsumablesDocProse(doc, 'uk-UA').hook).toContain(`1${NBSP}кг`);
  });

  it('applies to every text field, not just the hook', () => {
    const doc = docWithEveryField();
    doc.cta = 'Швидкість друку 20 000 мм/хв.';
    doc.specGroups[0].rows[0].value = '1.75 mm';
    const out = normalizeConsumablesDocProse(doc, 'uk-UA');
    expect(out.cta).not.toContain('20 000');
    expect(out.specGroups[0].rows[0].value).toBe(`1,75${NBSP}мм`);
  });

  it('leaves a non-Cyrillic locale untouched — units are not converted for en-US', () => {
    const doc = docWithEveryField();
    doc.hook = 'Spool weight 1 kg.';
    expect(normalizeConsumablesDocProse(doc, 'en-US').hook).toBe('Spool weight 1 kg.');
  });

  it('leaves the document valid', () => {
    expect(ConsumablesDescriptionDocSchema.safeParse(normalizeConsumablesDocProse(docWithEveryField(), 'uk-UA')).success).toBe(true);
  });
});

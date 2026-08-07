/**
 * doc-prose-transforms.spec.ts
 *
 * The three transforms the migration keeps (report §3) operate on prose TEXT, not on structure, so
 * under the Doc pipeline they run on the Doc's text fields before rendering instead of on the
 * rendered HTML afterwards.
 *
 * THE PROPERTY THAT MATTERS IS COMPLETENESS. A walk that silently skips a field is exactly the bug
 * `forEachBlockInOrder` was extracted to prevent — two hand-written copies both missed §4, and the
 * failure was invisible until a corpus artifact happened to put a figure there. A text walk that
 * misses `figures[].alt` or `applications.items[].scenario` fails the same way: the output is
 * plausible, and one field silently keeps the un-normalized number format. So the first test below
 * is an exhaustiveness check driven by the document itself rather than by a hand-written list.
 */
import { describe, it, expect } from 'vitest';

import { mapDocText, normalizeDocProse, NON_TEXT_PATHS } from './doc-prose-transforms';
import { ProductDescriptionDocSchema } from '../domain/description-doc.schema';
import type { ProductDescriptionDoc } from '../domain/description-doc';

/** Every text-bearing field carries a distinct marker, so a missed one is identifiable. */
function docWithEveryField(): ProductDescriptionDoc {
  return {
    schemaVersion: '3.0',
    locale: 'uk-UA',
    localizedName: 'name',
    hook: 'hook',
    killerSpecs: [
      { label: 'ks-label-1', value: 'ks-value-1', why: 'ks-why-1' },
      { label: 'ks-label-2', value: 'ks-value-2', why: 'ks-why-2' },
      { label: 'ks-label-3', value: 'ks-value-3', why: 'ks-why-3' },
    ],
    keyBenefits: [
      {
        kind: 'bullets',
        items: [
          // The trailing colons are load-bearing, not decoration. The renderer joins
          // `<b>{lead}</b>{text}` with nothing of its own, so the schema rejects a pair where
          // NEITHER side carries a separator — `kb-lead-1` + `kb-text-1` rendered as
          // `<b>kb-lead-1</b>kb-text-1`. Real artifacts always carry one; this fixture did not.
          { lead: 'kb-lead-1:', text: 'kb-text-1' },
          { lead: 'kb-lead-2:', text: 'kb-text-2' },
          { lead: 'kb-lead-3:', text: 'kb-text-3' },
        ],
      },
    ],
    functionality: [
      {
        heading: 'fn-heading',
        // The video block is required, not decorative: the schema rejects a videos[] entry that no
        // block references. Leaving it out is what made the first draft of this fixture invalid.
        blocks: [
          { kind: 'paragraph', text: 'fn-para' },
          { kind: 'figure', ref: 0 },
          { kind: 'video', ref: 0 },
        ],
        subsections: [{ heading: 'sub-heading', blocks: [{ kind: 'paragraph', text: 'sub-para' }] }],
      },
    ],
    applications: {
      heading: 'app-heading',
      blocks: [{ kind: 'paragraph', text: 'app-para' }],
      items: [
        { scenario: 'app-scen-1', text: 'app-text-1' },
        { scenario: 'app-scen-2', text: 'app-text-2' },
        { scenario: 'app-scen-3', text: 'app-text-3' },
        { scenario: 'app-scen-4', text: 'app-text-4' },
      ],
    },
    compatibility: { heading: 'compat-heading', blocks: [{ kind: 'paragraph', text: 'compat-para' }] },
    packageContents: { heading: 'pkg-heading', items: ['pkg-1', 'pkg-2'] },
    specs: {
      heading: 'specs-heading',
      categories: [
        {
          title: 'cat-title',
          rows: [
            { label: 'row-label', value: 'row-value' },
            { label: 'row-label-list', value: ['list-1', 'list-2'] },
          ],
        },
      ],
    },
    cta: { heading: 'cta-heading', text: 'cta-text' },
    figures: [{ file: 'f.jpg', alt: 'fig-alt', caption: 'fig-caption' }],
    videos: [{ src: 'https://x/e/1', title: 'vid-title', caption: 'vid-caption' }],
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

describe('mapDocText — completeness', () => {
  /**
   * Driven by the document, not by a list someone maintained by hand. Add a text field to the model
   * and forget it here, and this fails — which is the whole point.
   */
  it('transforms every text field and leaves no prose untouched', () => {
    const mapped = mapDocText(docWithEveryField(), () => '@');
    const missed = collectStrings(mapped).filter(([p, v]) => isText(p) && v !== '@');
    expect(missed).toEqual([]);
  });

  it('leaves structural strings alone', () => {
    const mapped = mapDocText(docWithEveryField(), () => '@');
    expect(mapped.schemaVersion).toBe('3.0');
    expect(mapped.locale).toBe('uk-UA');
    expect(mapped.figures[0].file).toBe('f.jpg');
    expect(mapped.videos[0].src).toBe('https://x/e/1');
    expect(mapped.functionality[0].blocks[1]).toEqual({ kind: 'figure', ref: 0 });
  });

  it('does not mutate the input', () => {
    const doc = docWithEveryField();
    const before = JSON.stringify(doc);
    mapDocText(doc, () => '@');
    expect(JSON.stringify(doc)).toBe(before);
  });

  it('keeps the result a valid document', () => {
    const mapped = mapDocText(docWithEveryField(), t => t.toUpperCase());
    expect(ProductDescriptionDocSchema.safeParse(mapped).success).toBe(true);
  });

  it('handles a spec value that is a list, not just a string', () => {
    const mapped = mapDocText(docWithEveryField(), t => `[${t}]`);
    expect(mapped.specs.categories[0].rows[1].value).toEqual(['[list-1]', '[list-2]']);
  });

  it('leaves an absent optional section absent rather than inventing one', () => {
    const doc = docWithEveryField();
    delete doc.compatibility;
    delete doc.packageContents;
    const mapped = mapDocText(doc, () => '@');
    expect(mapped.compatibility).toBeUndefined();
    expect(mapped.packageContents).toBeUndefined();
  });
});

describe('normalizeDocProse — the production chain, on Doc fields', () => {
  /**
   * Order is load-bearing and is documented at the orchestrator's HTML chain: thousands separators
   * are stripped before the decimal pass so it sees one unambiguous number shape, the identifier
   * pass runs after it as the inverse, units are cyrillized before terminology so its Cyrillic
   * word-boundary lookarounds see final orthography. Relocating must preserve that, not re-derive it.
   */
  it('strips a thousands separator and localizes the decimal for uk-UA', () => {
    const doc = docWithEveryField();
    doc.hook = 'Швидкість 20 000 мм/хв за 1.75 mm.';
    const out = normalizeDocProse(doc, 'uk-UA');
    expect(out.hook).not.toContain('20 000');
    expect(out.hook).toContain('1,75');
  });

  /** The inverse pass: a comma the model wrote inside an identifier is not a decimal. */
  it('restores a dot the model turned into a comma inside an identifier', () => {
    const doc = docWithEveryField();
    doc.hook = 'Діафрагма F/2,0 та Wi-Fi 2,4G.';
    expect(normalizeDocProse(doc, 'uk-UA').hook).toContain('F/2.0');
  });

  it('normalizes terminology in prose', () => {
    const doc = docWithEveryField();
    doc.hook = 'Софт для 3D принтера.';
    expect(normalizeDocProse(doc, 'uk-UA').hook).not.toContain('Софт');
  });

  it('applies to every text field, not just the hook', () => {
    const doc = docWithEveryField();
    doc.cta.text = 'Швидкість 20 000 мм/хв.';
    doc.figures[0].caption = 'Точність 0.05 mm.';
    const out = normalizeDocProse(doc, 'uk-UA');
    expect(out.cta.text).not.toContain('20 000');
    expect(out.figures[0].caption).toContain('0,05');
  });

  it('leaves the document valid', () => {
    expect(ProductDescriptionDocSchema.safeParse(normalizeDocProse(docWithEveryField(), 'uk-UA')).success).toBe(true);
  });
});

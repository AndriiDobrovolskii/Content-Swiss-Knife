/**
 * spec-category-shape.spec.ts
 *
 * Guard against the Center 3D Print / Ortur H20 §7 collapse (2026-07-26): 15 spec rows rendered
 * as one catch-all category because the store ToV taught the model to avoid nominal headings at
 * every level, including §7's <h3> category labels.
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import {
  validateSpecCategoryShape, validateSpecCategoryShapeDoc,
  MIN_SPEC_CATEGORIES, MIN_ROWS_TO_REQUIRE_CATEGORIES,
} from './spec-category-shape';
import { DEFAULT_MIN_ROWS } from './spec-category-merge';
import type { ProductDescriptionDoc } from '../domain/description-doc';

/** Builds a §7 section from a category-label -> row-count map, in the shape the model emits
 *  (N x <h3> + <div class="table-responsive"><table>) — i.e. pre-merge, pre-finalize. */
function specsSection(categories: Array<[label: string, rows: number]>): string {
  const blocks = categories.map(([label, rowCount]) => {
    const rows = Array.from({ length: rowCount }, (_, i) =>
      `<tr><td>${label} параметр ${i + 1}</td><td>значення ${i + 1}</td></tr>`).join('');
    return `<h3>${label}</h3>\n<div class="table-responsive"><table>\n` +
      `<thead><tr><th>Параметр</th><th>Значення</th></tr></thead>\n<tbody>${rows}</tbody>\n` +
      `</table></div>`;
  });
  return `<p>Lead-in.</p>\n<section class="specs">\n<h2>Технічні характеристики</h2>\n` +
    `${blocks.join('\n')}\n</section>`;
}

const rulesOf = (issues: ReturnType<typeof validateSpecCategoryShape>) => issues.map(i => i.rule);

describe('validateSpecCategoryShape', () => {
  describe('fires', () => {
    it('on the reported shape: one category holding all 15 rows', () => {
      const issues = validateSpecCategoryShape(
        specsSection([['Загальні характеристики', 15]]), 'HTML (base)');
      expect(rulesOf(issues)).toEqual(['spec-category-collapse']);
      expect(issues[0].severity).toBe('error');
    });

    it('on 2 categories of 11/4 rows — a <= 1 threshold would wrongly pass this', () => {
      const issues = validateSpecCategoryShape(
        specsSection([['Загальні характеристики', 11], ['Безпека', 4]]), 'HTML (base)');
      expect(rulesOf(issues)).toEqual(['spec-category-collapse']);
    });

    it('on 5 categories of 2 rows — all dissolve on merge into a single catch-all', () => {
      const issues = validateSpecCategoryShape(
        specsSection([['A', 2], ['B', 2], ['C', 2], ['D', 2], ['E', 2]]), 'HTML (base)');
      expect(rulesOf(issues)).toEqual(['spec-category-collapse']);
    });

    it('propagates the caller-supplied context', () => {
      const issues = validateSpecCategoryShape(
        specsSection([['Загальні характеристики', 15]]), 'HTML (uk-UA)');
      expect(issues[0].context).toBe('HTML (uk-UA)');
    });
  });

  describe('stays silent', () => {
    it('on the EXPERT3D shape: 4 categories of 4/3/4/4 rows', () => {
      const issues = validateSpecCategoryShape(specsSection([
        ['Загальні характеристики', 4], ['Лазерний модуль', 3],
        ['Безпека', 4], ['Електроніка та підключення', 4],
      ]), 'HTML (base)');
      expect(issues).toEqual([]);
    });

    it('at the exact boundary: 3 categories of 3 rows (9 rows total)', () => {
      const html = specsSection([['A', 3], ['B', 3], ['C', 3]]);
      expect(validateSpecCategoryShape(html, 'HTML (base)')).toEqual([]);
    });

    it('below the row threshold: a single category of 8 rows stays legal', () => {
      const issues = validateSpecCategoryShape(specsSection([['Характеристики', 8]]), 'HTML (base)');
      expect(issues).toEqual([]);
    });

    it('for consumables, whose simplified §C4 schema forbids <h3> by design', () => {
      const html = specsSection([['Характеристики', 15]]);
      expect(validateSpecCategoryShape(html, 'HTML (base)', { templateId: 'consumables-resin' }))
        .toEqual([]);
      // …and still fires for the same HTML under any other template, proving the exemption is
      // what silenced it rather than the input being harmless.
      expect(validateSpecCategoryShape(html, 'HTML (base)', { templateId: 'printer' })).toHaveLength(1);
    });

    it('when the document has no <section class="specs">', () => {
      expect(validateSpecCategoryShape('<p>Just prose.</p>', 'HTML (base)')).toEqual([]);
    });
  });

  describe('repair feedback', () => {
    const detail = validateSpecCategoryShape(
      specsSection([['Загальні характеристики', 15]]), 'HTML (base)')[0].detail;

    it('reports the observed counts so the model knows the gap', () => {
      expect(detail).toContain('1 category');
      expect(detail).toContain('15 spec rows');
    });

    it('prescribes the exact markup, matching serializeCategory in spec-category-merge', () => {
      expect(detail).toContain('<div class="table-responsive"><table>');
      expect(detail).toContain('<h3>');
    });

    it('localizes the example column headers rather than hardcoding English', () => {
      expect(detail).toContain('Параметр');
      expect(detail).toContain('Значення');
      const enDetail = validateSpecCategoryShape(
        specsSection([['General', 15]]), 'HTML (base)', { locale: 'en-GB' })[0].detail;
      expect(enDetail).toContain('Parameter');
      expect(enDetail).toContain('Value');
    });

    it('forbids the formats a panicking repair pass reaches for', () => {
      expect(detail).toContain('never Markdown');
      expect(detail).toContain('never one merged table');
    });

    it('forbids editing rows — grounding/parity validators would reject that', () => {
      expect(detail).toContain('DO NOT change any row label, value, unit, or the total row count');
    });
  });

  describe('thresholds stay consistent with the prompt contract', () => {
    it('requires the same 3-category minimum the master prompt states', () => {
      expect(MIN_SPEC_CATEGORIES).toBe(3);
    });

    it('starts enforcing only where the remedy is satisfiable (3 categories x 3 rows)', () => {
      expect(MIN_ROWS_TO_REQUIRE_CATEGORIES).toBe(MIN_SPEC_CATEGORIES * DEFAULT_MIN_ROWS);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// validateSpecCategoryShapeDoc — Doc-reading sibling
//
// Added in the final-review fix wave: the migration plan dropped this guard from the Doc-path gate
// on the premise that renderDescription() guarantees §7 shape "by construction" — wrong, because
// which rows the model groups into which category is a content decision the renderer has no say
// in. Center 3D Print / Ortur H20, the incident this file's header comment documents, is Doc-
// enrolled today, so the gap was live.
// ═══════════════════════════════════════════════════════════════════════════

function docWithCategories(categories: Array<{ title: string; rows: Array<{ label: string; value: string }> }>): ProductDescriptionDoc {
  return {
    schemaVersion: '3.0',
    locale: 'uk-UA',
    localizedName: 'Ortur H20 20 W',
    hook: 'Hook.',
    killerSpecs: [
      { label: 'A', value: '1', why: 'why a' },
      { label: 'B', value: '2', why: 'why b' },
      { label: 'C', value: '3', why: 'why c' },
    ],
    keyBenefits: [],
    functionality: [],
    applications: { heading: 'Застосування', items: [] },
    specs: { heading: 'Технічні характеристики', categories },
    cta: { heading: 'CTA', text: 'Купуйте.' },
    figures: [],
    videos: [],
  };
}

const rulesOfDoc = (issues: ReturnType<typeof validateSpecCategoryShapeDoc>) => issues.map(i => i.rule);

/** Builds `n` rows named `${label} параметр {i}` / `значення {i}` — mirrors specsSection()'s row
 *  shape above, minus the HTML wrapper. */
function rows(label: string, n: number): Array<{ label: string; value: string }> {
  return Array.from({ length: n }, (_, i) => ({ label: `${label} параметр ${i + 1}`, value: `значення ${i + 1}` }));
}

describe('validateSpecCategoryShapeDoc', () => {
  describe('happy path', () => {
    it('stays silent on the EXPERT3D shape: 4 categories of 4/3/4/4 rows', () => {
      const doc = docWithCategories([
        { title: 'Загальні характеристики', rows: rows('Загальні', 4) },
        { title: 'Лазерний модуль', rows: rows('Лазерний', 3) },
        { title: 'Безпека', rows: rows('Безпека', 4) },
        { title: 'Електроніка та підключення', rows: rows('Електроніка', 4) },
      ]);
      expect(validateSpecCategoryShapeDoc(doc, 'Doc (base)')).toEqual([]);
    });

    it('stays silent below the row threshold: a single category of 8 rows', () => {
      const doc = docWithCategories([{ title: 'Характеристики', rows: rows('Х', 8) }]);
      expect(validateSpecCategoryShapeDoc(doc, 'Doc (base)')).toEqual([]);
    });

    it('stays silent at the exact boundary: 3 categories of 3 rows (9 rows total)', () => {
      const doc = docWithCategories([
        { title: 'A', rows: rows('A', 3) }, { title: 'B', rows: rows('B', 3) }, { title: 'C', rows: rows('C', 3) },
      ]);
      expect(validateSpecCategoryShapeDoc(doc, 'Doc (base)')).toEqual([]);
    });
  });

  describe('failure path', () => {
    it('fires on the reported shape: one category holding all 15 rows', () => {
      const doc = docWithCategories([{ title: 'Загальні характеристики', rows: rows('Загальні', 15) }]);
      const issues = validateSpecCategoryShapeDoc(doc, 'Doc (base)');
      expect(rulesOfDoc(issues)).toEqual(['spec-category-collapse']);
      expect(issues[0].severity).toBe('error');
      expect(issues[0].context).toBe('Doc (base)');
    });

    it('fires on 2 categories of 11/4 rows — a <= 1 threshold would wrongly pass this', () => {
      const doc = docWithCategories([
        { title: 'Загальні характеристики', rows: rows('Загальні', 11) },
        { title: 'Безпека', rows: rows('Безпека', 4) },
      ]);
      expect(rulesOfDoc(validateSpecCategoryShapeDoc(doc, 'Doc (base)'))).toEqual(['spec-category-collapse']);
    });

    it('names specs.categories[] in the repair detail, in JSON terms rather than HTML markup', () => {
      const doc = docWithCategories([{ title: 'Загальні характеристики', rows: rows('Загальні', 15) }]);
      const detail = validateSpecCategoryShapeDoc(doc, 'Doc (base)')[0].detail;
      expect(detail).toContain('specs.categories[]');
      expect(detail).toContain('1 category');
      expect(detail).toContain('15 spec rows');
      expect(detail).toContain('DO NOT change any row');
      // The Doc-model regrouping instruction must not prescribe literal HTML markup — that would be
      // wrong feedback for a JSON field and either violate the schema (HTML text in a plain field)
      // or simply be ignored.
      expect(detail).not.toContain('<h3>');
      expect(detail).not.toContain('<table>');
    });

    it('for consumables, whose simplified §C4 schema forbids categories by design', () => {
      const doc = docWithCategories([{ title: 'Характеристики', rows: rows('Х', 15) }]);
      expect(validateSpecCategoryShapeDoc(doc, 'Doc (base)', { templateId: 'consumables-resin' })).toEqual([]);
      expect(validateSpecCategoryShapeDoc(doc, 'Doc (base)', { templateId: 'printer' })).toHaveLength(1);
    });
  });

  describe('null/undefined safety', () => {
    it('handles a document with no spec categories at all', () => {
      expect(validateSpecCategoryShapeDoc(docWithCategories([]), 'Doc (base)')).toEqual([]);
    });

    it('handles a single category with zero rows', () => {
      expect(validateSpecCategoryShapeDoc(docWithCategories([{ title: 'Empty', rows: [] }]), 'Doc (base)')).toEqual([]);
    });
  });

  describe('localizes the example column headers, matching the HTML sibling', () => {
    it('uses the uk-UA headers by default and the requested locale otherwise', () => {
      const doc = docWithCategories([{ title: 'Загальні характеристики', rows: rows('Загальні', 15) }]);
      expect(validateSpecCategoryShapeDoc(doc, 'Doc (base)')[0].detail).toContain('Параметр');

      const enDoc = docWithCategories([{ title: 'General', rows: rows('General', 15) }]);
      expect(validateSpecCategoryShapeDoc(enDoc, 'Doc (base)', { locale: 'en-GB' })[0].detail).toContain('Parameter');
    });
  });
});

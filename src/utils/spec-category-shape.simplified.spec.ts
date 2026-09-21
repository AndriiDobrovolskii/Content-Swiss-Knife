/**
 * US-2.2 T7 — `spec-category-shape` re-expressed for the simplified templates (FR-8, FR-21).
 *
 * The old carve-out was `templateId === STALE_TEMPLATE_ID`. The guard flags a §7 that collapsed
 * into fewer than 3 categories of 3+ rows, which is exactly what a correct simplified §7 is (one flat
 * category), so it must stay silent for the three simplified ids — and keep firing for Full. The
 * inverse invariant (exactly one category) lives in the completeness gate and the HTML shape
 * validator, not here (D4b).
 */
import { describe, it, expect } from 'vitest';
import { validateSpecCategoryShape, validateSpecCategoryShapeDoc } from './spec-category-shape';
import { filamentsDoc, accessoriesDoc, without } from '../../test/fixtures/simplified-docs';
import type { ProductDescriptionDoc } from '../domain/description-doc';
import { STALE_TEMPLATE_ID } from '../../test/fixtures/removed-tokens';

const IDS = ['filaments-resins-powders', 'accessories'] as const;

/** One <h3> category with `rows` rows — the shape that fires the guard for Full description. */
function oneCategoryHtml(rows: number): string {
  const trs = Array.from({ length: rows }, (_, i) => `<tr><td>Параметр ${i}</td><td>${i} мм</td></tr>`).join('');
  return `<section class="specs"><h2>Технічні характеристики</h2><h3>Характеристики</h3>` +
    `<div class="table-responsive"><table><thead><tr><th>Параметр</th><th>Значення</th></tr></thead>` +
    `<tbody>${trs}</tbody></table></div></section>`;
}

/** A doc whose single category holds `rows` rows. */
function oneCategoryDoc(rows: number): ProductDescriptionDoc {
  const base = filamentsDoc() as unknown as { specs: { heading: string } };
  return {
    ...base,
    specs: {
      heading: base.specs.heading,
      categories: [{ title: 'Основні', rows: Array.from({ length: rows }, (_, i) => ({ label: `Параметр ${i}`, value: `${i} мм` })) }],
    },
  } as unknown as ProductDescriptionDoc;
}

describe('validateSpecCategoryShape (HTML) — simplified ids are exempt, Full is not', () => {
  it.each(IDS)('%s: a single 15-row category yields no collapse issue', id => {
    expect(validateSpecCategoryShape(oneCategoryHtml(15), 'HTML (base)', { templateId: id })).toEqual([]);
  });
  it('the same HTML under Full (no id) still fires — the exemption is what silences it', () => {
    expect(validateSpecCategoryShape(oneCategoryHtml(15), 'HTML (base)')).toHaveLength(1);
    expect(validateSpecCategoryShape(oneCategoryHtml(15), 'HTML (base)', { templateId: 'printer' })).toHaveLength(1);
  });
  it('a stale template id no longer has a special meaning: it behaves as Full', () => {
    expect(validateSpecCategoryShape(oneCategoryHtml(15), 'HTML (base)', { templateId: STALE_TEMPLATE_ID })).toHaveLength(1);
  });
  it('spare-parts (no §7) is silent either way', () => {
    expect(validateSpecCategoryShape('<p>Hook.</p>', 'HTML (base)', { templateId: 'spare-parts' })).toEqual([]);
  });
});

describe('validateSpecCategoryShapeDoc — simplified ids are exempt, Full is not', () => {
  it.each(IDS)('%s: a single 15-row category yields no collapse issue', id => {
    expect(validateSpecCategoryShapeDoc(oneCategoryDoc(15), 'Doc (base)', { templateId: id })).toEqual([]);
  });
  it('the same Doc under Full still fires', () => {
    expect(validateSpecCategoryShapeDoc(oneCategoryDoc(15), 'Doc (base)')).toHaveLength(1);
  });
  it('a stale template id behaves as Full', () => {
    expect(validateSpecCategoryShapeDoc(oneCategoryDoc(15), 'Doc (base)', { templateId: STALE_TEMPLATE_ID })).toHaveLength(1);
  });
  it.each(['filaments-resins-powders', 'accessories', 'spare-parts'])('%s: an omitted §7 does not throw and yields nothing', id => {
    for (const doc of [without(accessoriesDoc(), 'specs'), without(filamentsDoc(), 'specs')]) {
      expect(() => validateSpecCategoryShapeDoc(doc, 'Doc (base)', { templateId: id })).not.toThrow();
      expect(validateSpecCategoryShapeDoc(doc, 'Doc (base)', { templateId: id })).toEqual([]);
    }
  });
});

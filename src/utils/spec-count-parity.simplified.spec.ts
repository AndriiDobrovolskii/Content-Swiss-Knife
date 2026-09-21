/**
 * US-2.2 T7 — `spec-count-parity` for the simplified templates (FR-11, FR-21, AGENTS.md §4:
 * "spec count on output = spec count on input").
 *
 * Parity runs only where §7 is present. With empty source specs the check has nothing to count and
 * the Doc has no §7; the completeness gate (not this check) is what flags a §7 that should not exist.
 */
import { describe, it, expect } from 'vitest';
import { validateSpecCountParity, validateSpecCountParityDoc, countActualSpecRowsDoc } from './spec-count-parity';
import { filamentsDoc, accessoriesDoc, sparePartsDoc, without, nulled } from '../../test/fixtures/simplified-docs';
import { renderDescription } from '../render/render-description';
import type { ProductDescriptionDoc } from '../domain/description-doc';

const CANON = '| Параметр | Значення |\n|---|---|\n| Діаметр 1 | 1,75 мм |\n| Вага 1 | 1 кг |\n| Температура 1 | 200 °C |';
const NAME = 'eSUN PLA+';
const CTX = { imageBaseUrl: 'https://impresora-3d.es/image/catalog/products/', storeName: 'EXPERT3D' };

describe('Doc variant', () => {
  it('a flat single-category §7 with the same row count as the source yields no issue', () => {
    expect(validateSpecCountParityDoc(filamentsDoc(), CANON, NAME, 'Doc (base)')).toEqual([]);
    expect(validateSpecCountParityDoc(accessoriesDoc(), CANON, NAME, 'Doc (base)')).toEqual([]);
  });
  it('a two-row shortfall in the single category is an error (parity still bites where §7 is present)', () => {
    const base = filamentsDoc() as unknown as { specs: { heading: string; categories: Array<{ title: string; rows: unknown[] }> } };
    const doc = { ...base, specs: { ...base.specs, categories: [{ title: 'Основні', rows: base.specs.categories[0].rows.slice(0, 1) }] } } as unknown as ProductDescriptionDoc;
    const issues = validateSpecCountParityDoc(doc, CANON, NAME, 'Doc (base)');
    expect(issues.map(i => [i.rule, i.severity])).toEqual([['spec-count-mismatch', 'error']]);
  });
  it.each([
    ['spare parts', sparePartsDoc()],
    ['filaments with §7 omitted', without(filamentsDoc({ specCategories: 0 }), 'specs')],
    ['filaments with §7 null', nulled(filamentsDoc(), 'specs')],
  ])('%s: §7 absent -> no throw, no issue, even with a non-empty canonical table', (_n, doc) => {
    expect(() => validateSpecCountParityDoc(doc, CANON, NAME, 'Doc (base)')).not.toThrow();
    expect(validateSpecCountParityDoc(doc, CANON, NAME, 'Doc (base)')).toEqual([]);
    expect(countActualSpecRowsDoc(doc)).toBe(0);
  });
  it('empty source specs and no §7: nothing to compare', () => {
    expect(validateSpecCountParityDoc(without(filamentsDoc(), 'specs'), '', NAME, 'Doc (base)')).toEqual([]);
    expect(validateSpecCountParityDoc(without(filamentsDoc(), 'specs'), '   ', NAME, 'Doc (base)')).toEqual([]);
  });
});

describe('HTML variant', () => {
  it('a rendered flat table with three rows matches a three-row source', () => {
    const html = renderDescription(filamentsDoc(), CTX, { flatSpecs: true });
    expect(validateSpecCountParity(html, CANON, NAME, 'HTML (uk-UA)')).toEqual([]);
  });
  it('Full behaviour is unchanged: a document with no §7 and a non-empty source table still errors', () => {
    const html = '<p>Hook.</p>\n<h2>Чому варто купити?</h2><p>Text.</p>';
    const issues = validateSpecCountParity(html, CANON, NAME, 'HTML (uk-UA)');
    expect(issues.map(i => i.rule)).toEqual(['spec-count-mismatch']);
  });
  it('empty source specs: no issue whatever the HTML holds', () => {
    expect(validateSpecCountParity('<p>Hook.</p>', '', NAME, 'HTML (uk-UA)')).toEqual([]);
  });
});

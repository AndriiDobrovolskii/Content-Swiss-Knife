/**
 * US-2.2 T4 — FR-8: `renderDescription(doc, ctx, { flatSpecs: true })` renders §7 as ONE table
 * with all parameters in a single <tbody>, no <h3> category sub-heading and no category title row,
 * using the Full §7 `table-responsive` / `table table-bordered table-striped` markup.
 *
 * Full description (no option) must stay byte-identical: reconciliation and the FR-6 guarantee
 * both depend on it. With several categories the flat renderer is total and lossless (plan D4):
 * every row survives, in order, in the one <tbody>; it never throws.
 */
import { describe, it, expect } from 'vitest';
import { renderDescription, type RenderContext } from './render-description';
import { finalizeTablesForDisplay } from '../utils/table-finalize';
import { v4ValidDoc } from '../../test/fixtures/v4-docs';
import { filamentsDoc, accessoriesDoc } from '../../test/fixtures/simplified-docs';

const CTX: RenderContext = {
  imageBaseUrl: 'https://impresora-3d.es/image/catalog/products/',
  brandFolder: 'esun',
  modelFolder: 'pla-plus',
  storeName: 'EXPERT3D',
};
const FLAT = { flatSpecs: true } as const;

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');
const specsSection = (html: string) => parse(html).querySelector('section.specs');
const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;

describe('flatSpecs with one category (Filaments, Accessories)', () => {
  for (const [name, doc] of [['filaments', filamentsDoc()], ['accessories', accessoriesDoc()]] as const) {
    it(`${name}: exactly one <tbody>, no <h3>, and the category title is not rendered`, () => {
      const html = renderDescription(doc, CTX, FLAT);
      expect(count(html, /<tbody>/g)).toBe(1);
      expect(html).not.toMatch(/<h3[\s>]/);
      expect(html).not.toContain('Група 1');
      expect(html).not.toContain('ГРУПА 1');
    });

    it(`${name}: keeps the Full §7 markup — section.specs, its <h2>, table-responsive, table table-bordered table-striped`, () => {
      const html = renderDescription(doc, CTX, FLAT);
      const section = specsSection(html);
      expect(section).not.toBeNull();
      expect(section!.querySelector('h2')?.textContent).toBe('Технічні характеристики');
      expect(section!.querySelectorAll('div.table-responsive')).toHaveLength(1);
      expect(section!.querySelector('table')?.getAttribute('class')).toBe('table table-bordered table-striped');
      expect(section!.querySelectorAll('thead')).toHaveLength(1);
    });

    it(`${name}: every parameter row is present, in order, inside the single <tbody>`, () => {
      const html = renderDescription(doc, CTX, FLAT);
      const rows = [...specsSection(html)!.querySelectorAll('tbody tr')].map(tr =>
        [...tr.querySelectorAll('td')].map(td => td.textContent));
      expect(rows).toEqual([
        ['Діаметр 1', '1,75 мм'], ['Вага 1', '1 кг'], ['Температура 1', '200 °C'],
      ]);
    });

    it(`${name}: the §7 section is still followed by <hr>`, () => {
      expect(renderDescription(doc, CTX, FLAT)).toMatch(/<\/section>\s*<hr>/);
    });
  }

  it('the flat table survives table finalization untouched in structure (still one <tbody>, no <h3>, 3 rows)', () => {
    const html = finalizeTablesForDisplay(renderDescription(filamentsDoc(), CTX, FLAT), 'uk-UA', 'EXPERT3D');
    const section = specsSection(html)!;
    expect(section.querySelectorAll('tbody')).toHaveLength(1);
    expect(section.querySelectorAll('h3')).toHaveLength(0);
    expect(section.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(section.querySelector('table')?.getAttribute('class')).toBe('table table-bordered table-striped');
  });

  it('AGENTS.md §4 unit spacing: values keep the space between number and unit', () => {
    const html = renderDescription(filamentsDoc(), CTX, FLAT);
    expect(html).toContain('1,75 мм');
    expect(html).toContain('200 °C');
    expect(html).not.toMatch(/1,75мм|200°C/);
  });
});

describe('flatSpecs with several categories (D4 — defensive, lossless, never throws)', () => {
  const three = () => filamentsDoc({ specCategories: 3 });

  it('does not throw', () => {
    expect(() => renderDescription(three(), CTX, FLAT)).not.toThrow();
  });
  it('still emits exactly one <tbody>, no <h3> and no category title', () => {
    const html = renderDescription(three(), CTX, FLAT);
    expect(count(html, /<tbody>/g)).toBe(1);
    expect(html).not.toMatch(/<h3[\s>]/);
    for (const t of ['Група 1', 'Група 2', 'Група 3']) expect(html).not.toContain(t);
  });
  it('drops no row: all 9 rows appear, in category order', () => {
    const rows = [...specsSection(renderDescription(three(), CTX, FLAT))!.querySelectorAll('tbody tr td:first-child')]
      .map(td => td.textContent);
    expect(rows).toEqual([
      'Діаметр 1', 'Вага 1', 'Температура 1',
      'Діаметр 2', 'Вага 2', 'Температура 2',
      'Діаметр 3', 'Вага 3', 'Температура 3',
    ]);
  });
  it('without the option the same document renders three <h3> + three <tbody> exactly as before', () => {
    const html = renderDescription(three(), CTX);
    expect(count(html, /<tbody>/g)).toBe(3);
    expect(count(html, /<h3>/g)).toBe(3);
  });
});

describe('Full description is unchanged by the new option (FR-6 / FR-18)', () => {
  it('no option, {} and {flatSpecs:false} are byte-identical', () => {
    const doc = v4ValidDoc();
    const plain = renderDescription(doc, CTX);
    expect(renderDescription(doc, CTX, {})).toBe(plain);
    expect(renderDescription(doc, CTX, { flatSpecs: false })).toBe(plain);
  });
  it('a Full document keeps its <h3> category headings when rendered without flatSpecs', () => {
    const html = renderDescription(v4ValidDoc(), CTX);
    expect(specsSection(html)!.querySelectorAll('h3').length).toBeGreaterThan(0);
  });
  it('a single-category Full document is NOT flattened by inference (rejected alternative 7)', () => {
    const doc = v4ValidDoc();
    expect((doc as unknown as { specs: { categories: unknown[] } }).specs.categories.length).toBe(1);
    expect(specsSection(renderDescription(doc, CTX))!.querySelectorAll('h3')).toHaveLength(1);
  });
});

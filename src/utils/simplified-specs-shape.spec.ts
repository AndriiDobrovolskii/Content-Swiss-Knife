/**
 * US-2.2 T6a — `validateSimplifiedSpecsShapeHtml(html, templateId, label)`, the HTML half of the
 * FR-8 failure path (plan D4b): for a simplified template, a §7 with more than one <tbody>, an <h3>,
 * more than one parsed category or a category title row is an `error`.
 *
 * Structure is locale-independent (the function takes no locale), Full skips, and an absent §7
 * (Spare parts, or empty source specs) yields nothing.
 *
 * NOTE ON "CATEGORY TITLE ROW". The pre-flat renderer never emits a title ROW: it emits an
 * `<!-- TITLE -->` comment plus an <h3> before each table. The plan's "title row" is therefore
 * pinned here as the shape a model could plausibly produce in a single table — a full-width first
 * body row carrying only the category name — and recorded as a finding in the test strategy.
 */
import { describe, it, expect } from 'vitest';
import { validateSimplifiedSpecsShapeHtml } from './simplified-specs-shape';
import { renderDescription } from '../render/render-description';
import { filamentsDoc, accessoriesDoc } from '../../test/fixtures/simplified-docs';
import { STALE_TEMPLATE_ID } from '../../test/fixtures/removed-tokens';

const CTX = { imageBaseUrl: 'https://impresora-3d.es/image/catalog/products/', storeName: 'EXPERT3D' };
const ROWS = (n: number, p = '') => Array.from({ length: n }, (_, i) => `<tr><td>${p}Параметр ${i}</td><td>${i} мм</td></tr>`).join('\n');
const THEAD = '<thead><tr><td style="width: 45%;"><b>Параметр</b></td><td><b>Значення</b></td></tr></thead>';
const TABLE_CLASS = 'table table-bordered table-striped';

function section(body: string): string {
  return `<p><b>eSUN PLA+</b> — hook.</p>\n<section class="specs">\n<h2>Технічні характеристики</h2>\n${body}\n</section>\n<hr>\n<h2>Чому варто купити?</h2><p class="cta">CTA.</p>`;
}
const table = (tbodies: string[]) =>
  `<div class="table-responsive"><table class="${TABLE_CLASS}" style="table-layout: fixed;">\n${THEAD}\n${tbodies.map(t => `<tbody>\n${t}\n</tbody>`).join('\n')}\n</table></div>`;

const FLAT = section(table([ROWS(4)]));
const TWO_TBODY = section(table([ROWS(3), ROWS(3, 'B')]));
const WITH_H3 = section(`<h3>Основні</h3>\n${table([ROWS(4)])}`);
const TITLE_ROW = section(table([`<tr><td colspan="2"><b>Основні</b></td></tr>\n${ROWS(4)}`]));
const TWO_TABLES = section(`${table([ROWS(3)])}\n${table([ROWS(3, 'B')])}`);

const IDS = ['filaments-resins-powders', 'accessories'] as const;
const run = (html: string, id: string | undefined, label = 'HTML (uk-UA)') =>
  validateSimplifiedSpecsShapeHtml(html, id as string, label);

describe('valid flat §7', () => {
  it.each(IDS)('%s: a hand-built flat table passes', id => {
    expect(run(FLAT, id)).toEqual([]);
  });
  it('the renderer\'s own flat output passes (renderer and validator agree)', () => {
    expect(run(renderDescription(filamentsDoc(), CTX, { flatSpecs: true }), 'filaments-resins-powders')).toEqual([]);
    expect(run(renderDescription(accessoriesDoc(), CTX, { flatSpecs: true }), 'accessories')).toEqual([]);
  });
  it('an <h3> OUTSIDE §7 (an Accessories §3 sub-function) is not a violation', () => {
    const html = `<h2>Як працює</h2><h3>Підфункція</h3><p>Текст.</p>\n${FLAT}`;
    expect(run(html, 'accessories')).toEqual([]);
  });
});

describe('FR-8 violations are errors, per shape', () => {
  it.each(IDS)('%s: two <tbody> in one table', id => {
    const issues = run(TWO_TBODY, id);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every(i => i.severity === 'error')).toBe(true);
    expect(issues[0].rule).toMatch(/specs-shape/);
  });
  it.each(IDS)('%s: an <h3> category sub-heading', id => {
    const issues = run(WITH_H3, id);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every(i => i.severity === 'error')).toBe(true);
  });
  it.each(IDS)('%s: a category title row inside the single <tbody>', id => {
    const issues = run(TITLE_ROW, id);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every(i => i.severity === 'error')).toBe(true);
  });
  it.each(IDS)('%s: two tables (each with its own <tbody>)', id => {
    expect(run(TWO_TABLES, id).length).toBeGreaterThan(0);
  });
  it.each(IDS)('%s: the pre-flat renderer output for a two-category document (h3 + comment + two <tbody>) is rejected', id => {
    const legacy = renderDescription(filamentsDoc({ specCategories: 2 }), CTX);
    expect(run(legacy, id).length).toBeGreaterThan(0);
  });
  it('the reporting label becomes the issue context', () => {
    expect(run(TWO_TBODY, 'accessories', 'HTML (pl-PL)')[0].context).toBe('HTML (pl-PL)');
  });
  it('the detail tells the model what to do: one table, one <tbody>, no headings', () => {
    const d = run(TWO_TBODY, 'accessories')[0].detail;
    expect(d).toMatch(/one|single/i);
    expect(d).toMatch(/tbody|table/i);
  });
});

describe('what the rule does not touch', () => {
  it.each([TWO_TBODY, WITH_H3, TITLE_ROW, TWO_TABLES])('Full description (no id) is skipped', html => {
    expect(run(html, undefined)).toEqual([]);
  });
  it('an unknown or removed id is treated as Full', () => {
    expect(run(TWO_TBODY, STALE_TEMPLATE_ID)).toEqual([]);
  });
  it('an absent §7 yields nothing (empty source specs; Spare parts)', () => {
    const html = '<p><b>eSUN PLA+</b> — hook.</p>\n<h2>Чому варто купити?</h2><p class="cta">CTA.</p>';
    for (const id of ['filaments-resins-powders', 'accessories', 'spare-parts']) expect(run(html, id)).toEqual([]);
  });
  it('is pure: the same input gives the same issues', () => {
    expect(run(TWO_TBODY, 'accessories')).toEqual(run(TWO_TBODY, 'accessories'));
  });
});

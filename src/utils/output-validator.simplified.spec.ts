/**
 * US-2.2 T10 (FROZEN `output-validator.ts`) — `validateGeneratedHtml` with a simplified `templateId`.
 *
 * The frozen file loses its `consumables-char-limit` gate and gains ONE call to the composed
 * `validateSimplifiedTemplateHtml` (ranges + §7 shape). Observable contract:
 *   · an out-of-range paragraph is an error at any length (AC-16); a >5500-character narrative whose
 *     paragraphs are all in range adds no error (FR-16); the old char-limit rule is gone (FR-13);
 *   · a §7 with a second <tbody>, an <h3> or a category title row adds an error (FR-8);
 *   · Full description and translated locales are unaffected by the range half.
 *
 * `validateGeneratedHtml` runs dozens of unrelated rules over hand-rendered HTML, so assertions are
 * DIFFERENTIAL: the rule set of the document under test versus the rule set of the same document
 * with every paragraph mid-range. That isolates what the new call adds without pinning the noise.
 */
import { describe, it, expect } from 'vitest';
import * as outputValidator from './output-validator';
import { validateGeneratedHtml } from './output-validator';
import { renderDescription } from '../render/render-description';
import { filamentsDoc, accessoriesDoc, lazy, type SimplifiedBudget } from '../../test/fixtures/simplified-docs';
import { STALE_TEMPLATE_ID, REMOVED_EXPORTS } from '../../test/fixtures/removed-tokens';

const CTX = { imageBaseUrl: 'https://impresora-3d.es/image/catalog/products/', storeName: 'EXPERT3D' };
const NAME = 'eSUN PLA+';
const flat = (b: SimplifiedBudget = {}) => renderDescription(filamentsDoc(b), CTX, { flatSpecs: true });
const rules = (html: string, id: string | undefined, locale = 'uk-UA') =>
  new Set(validateGeneratedHtml(html, `HTML (${locale})`, NAME, locale, id ? { templateId: id } : undefined)
    .filter(i => i.severity === 'error').map(i => i.rule));
const added = (html: string, id: string | undefined, locale = 'uk-UA', baseline = flat()) => {
  const base = rules(baseline, id, locale);
  return [...rules(html, id, locale)].filter(r => !base.has(r));
};
const stripped = (h: string) => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const ID = 'filaments-resins-powders';

describe('FR-14 / AC-16 through validateGeneratedHtml', () => {
  it('a 120-word hook adds an error under a simplified id, at any length', () => {
    const html = flat({ hook: 120, block2: 90, applications: 80, compat: 30, cta: 50 });
    expect(stripped(html).length).toBeLessThan(4000);
    expect(added(html, ID).length).toBeGreaterThan(0);
  });
  it.each(['filaments-resins-powders', 'accessories', 'spare-parts'])('%s: a too-short CTA adds an error', id => {
    const html = renderDescription(id === 'accessories' ? accessoriesDoc({ cta: 20 }) : filamentsDoc({ cta: 20 }), CTX, { flatSpecs: true });
    const baseline = renderDescription(id === 'accessories' ? accessoriesDoc() : filamentsDoc(), CTX, { flatSpecs: true });
    expect(added(html, id, 'uk-UA', baseline).length).toBeGreaterThan(0);
  });
  it('a narrative above 5500 characters with every paragraph in range adds NO error (the ceiling is soft)', () => {
    const html = flat({ hook: 80, block2: 280, applications: 240, compat: 95, cta: 95 });
    expect(stripped(html).length).toBeGreaterThan(5500);
    expect(added(html, ID)).toEqual([]);
  });
  it('the same over-range document adds nothing under Full description (ranges are simplified-only)', () => {
    const html = flat({ hook: 120 });
    expect(added(html, undefined, 'uk-UA', flat())).toEqual([]);
  });
  it('a translated locale is not range-checked', () => {
    const html = flat({ hook: 120, cta: 20 });
    expect(added(html, ID, 'pl-PL')).toEqual([]);
    expect(added(html, ID, 'en-GB')).toEqual([]);
  });
});

describe('FR-13 — the legacy consumables character-limit gate is gone', () => {
  it('no `consumables-char-limit` issue is ever produced, for any id, at any length', () => {
    const huge = flat({ hook: 80, block2: 280, applications: 240, compat: 95, cta: 95 });
    for (const id of [ID, STALE_TEMPLATE_ID, undefined]) {
      const all = validateGeneratedHtml(huge, 'HTML (uk-UA)', NAME, 'uk-UA', id ? { templateId: id } : undefined);
      expect(all.map(i => i.rule)).not.toContain('consumables-char-limit');
    }
  });
  it('the consumables character-limit constant is no longer exported', () => {
    for (const name of REMOVED_EXPORTS.outputValidator) expect(name in outputValidator, name).toBe(false);
  });
});

describe('FR-8 through validateGeneratedHtml — non-flat §7 is rejected for simplified ids only', () => {
  const twoCat = lazy(() => renderDescription(filamentsDoc({ specCategories: 2 }), CTX));          // h3 + comment + two <tbody>
  const titleRow = lazy(() => flat().replace('<tbody>', '<tbody>\n<tr><td colspan="2"><b>Основні</b></td></tr>'));
  const secondTbody = lazy(() => flat().replace('</tbody>', '</tbody>\n<tbody>\n<tr><td>Ще</td><td>1 мм</td></tr>\n</tbody>'));
  const withH3 = lazy(() => flat().replace('<div class="table-responsive">', '<h3>Основні</h3>\n<div class="table-responsive">'));

  it.each([
    ['a two-category document (h3 + two <tbody>)', twoCat],
    ['a second <tbody>', secondTbody],
    ['an <h3> in §7', withH3],
    ['a category title row', titleRow],
  ])('%s adds an error for Filaments and Accessories', (_n, html) => {
    for (const id of ['filaments-resins-powders', 'accessories']) {
      expect(added(html(), id).length, id).toBeGreaterThan(0);
    }
  });
  it('a valid flat table adds no error', () => {
    expect(added(flat(), ID)).toEqual([]);
  });
  it('the shape rule is structural: it also fires for a translated locale', () => {
    expect(added(secondTbody(), ID, 'pl-PL', flat()).length).toBeGreaterThan(0);
  });
  it('Full description keeps its multi-category §7: nothing new is added by the simplified call', () => {
    const fullRules = rules(twoCat(), undefined);
    const simplifiedRules = rules(twoCat(), ID);
    expect([...simplifiedRules].some(r => !fullRules.has(r))).toBe(true);
  });
});

describe('a stale template id behaves as Full', () => {
  it('a range violation adds nothing under the stale id', () => {
    expect(added(flat({ hook: 120 }), STALE_TEMPLATE_ID)).toEqual([]);
  });
});

/**
 * US-2.2 T6 — the simplified v4 word-range validators (AC-12, AC-16, OD-11, FR-14, FR-16).
 *
 * Contract under test (from the Story/spec, not from the plan's proposed internals):
 *   · a present paragraph outside its v4 range, minimum OR maximum, is an `error` at ANY total length
 *     — "a 4000-character description with a 120-word hook is rejected";
 *   · a description whose narrative exceeds 5500 characters but keeps every present paragraph inside
 *     its range is NOT rejected (the ceiling is soft, FR-16);
 *   · ranges are enforced on the uk-UA master only and on simplified templates only (Full and
 *     translated locales skip);
 *   · the Doc entry point (Doc gate) and the HTML entry point (legacy path / final pass) agree on
 *     every shared fixture (plan V6, R3).
 *
 * Ranges: hook 40–85, Killer Specs block 90–300, applications 80–250, compatibility 30–100, CTA 50–100.
 * Boundary cases use a margin of several words: the specs do not say how an em dash or a `<b>` label
 * is counted (OD-15), so a test pinned to exactly 85/86 would assert a tokenizer, not a criterion.
 */
import { describe, it, expect } from 'vitest';
import {
  validateSimplifiedRangesDoc, validateSimplifiedRangesHtml, validateSimplifiedTemplateHtml,
} from './simplified-word-ranges';
import { renderDescription } from '../render/render-description';
import {
  filamentsDoc, accessoriesDoc, sparePartsDoc, IN_RANGE, lazy, type SimplifiedBudget, countWordsOf,
} from '../../test/fixtures/simplified-docs';
import type { ProductDescriptionDoc } from '../domain/description-doc';
import { STALE_TEMPLATE_ID } from '../../test/fixtures/removed-tokens';

const CTX = { imageBaseUrl: 'https://impresora-3d.es/image/catalog/products/', storeName: 'EXPERT3D' };
const ID = 'filaments-resins-powders';
const html = (d: ProductDescriptionDoc) => renderDescription(d, CTX, { flatSpecs: true });
const errorsOf = <T extends { severity: string }>(is: T[]) => is.filter(i => i.severity === 'error');
const docErrs = (d: ProductDescriptionDoc, id = ID, locale = 'uk-UA') => errorsOf(validateSimplifiedRangesDoc(d, id, locale, 'Doc (uk-UA)'));
const htmlErrs = (d: ProductDescriptionDoc, id = ID, locale = 'uk-UA') => errorsOf(validateSimplifiedRangesHtml(html(d), id, locale, 'HTML (uk-UA)'));
const stripped = (h: string) => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

interface Case { name: string; budget: SimplifiedBudget; bad: boolean; pathRe?: RegExp }
const CASES: Case[] = [
  { name: 'all paragraphs mid-range', budget: {}, bad: false },
  { name: 'hook 30 words (below 40)', budget: { hook: 30 }, bad: true, pathRe: /^hook/ },
  { name: 'hook 45 words (inside)', budget: { hook: 45 }, bad: false },
  { name: 'hook 80 words (inside)', budget: { hook: 80 }, bad: false },
  { name: 'hook 120 words (above 85)', budget: { hook: 120 }, bad: true, pathRe: /^hook/ },
  { name: 'Killer Specs block 60 words (below 90)', budget: { block2: 60 }, bad: true, pathRe: /^(killerSpecs|keyBenefits)/ },
  { name: 'Killer Specs block 110 words (inside)', budget: { block2: 110 }, bad: false },
  { name: 'Killer Specs block 270 words (inside)', budget: { block2: 270 }, bad: false },
  { name: 'Killer Specs block 350 words (above 300)', budget: { block2: 350 }, bad: true, pathRe: /^(killerSpecs|keyBenefits)/ },
  { name: 'applications 50 words (below 80)', budget: { applications: 50 }, bad: true, pathRe: /^applications/ },
  { name: 'applications 100 words (inside)', budget: { applications: 100 }, bad: false },
  { name: 'applications 220 words (inside)', budget: { applications: 220 }, bad: false },
  { name: 'applications 300 words (above 250)', budget: { applications: 300 }, bad: true, pathRe: /^applications/ },
  { name: 'compatibility 15 words (below 30)', budget: { compat: 15 }, bad: true, pathRe: /^compatibility/ },
  { name: 'compatibility 40 words (inside)', budget: { compat: 40 }, bad: false },
  { name: 'compatibility 90 words (inside)', budget: { compat: 90 }, bad: false },
  { name: 'compatibility 140 words (above 100)', budget: { compat: 140 }, bad: true, pathRe: /^compatibility/ },
  { name: 'CTA 30 words (below 50)', budget: { cta: 30 }, bad: true, pathRe: /^cta/ },
  { name: 'CTA 60 words (inside)', budget: { cta: 60 }, bad: false },
  { name: 'CTA 90 words (inside)', budget: { cta: 90 }, bad: false },
  { name: 'CTA 130 words (above 100)', budget: { cta: 130 }, bad: true, pathRe: /^cta/ },
];

describe('fixture sanity (guards the guard)', () => {
  it('the mid-range fixture really sits inside every range by an independent count', () => {
    const d = filamentsDoc() as unknown as { hook: string; cta: { text: string } };
    expect(countWordsOf(d.hook)).toBeGreaterThanOrEqual(40);
    expect(countWordsOf(d.hook)).toBeLessThanOrEqual(85);
    expect(countWordsOf(d.cta.text)).toBeGreaterThanOrEqual(50);
    expect(countWordsOf(d.cta.text)).toBeLessThanOrEqual(100);
  });
});

describe('FR-14 — every range, minimum and maximum, on the Doc entry point', () => {
  for (const c of CASES) {
    it(`${c.name} -> ${c.bad ? 'rejected' : 'accepted'}`, () => {
      const errs = docErrs(filamentsDoc(c.budget));
      expect(errs.length > 0).toBe(c.bad);
      if (c.bad && c.pathRe) expect(errs.some(e => c.pathRe!.test(e.path ?? ''))).toBe(true);
    });
  }
});

describe('FR-14 — the same ranges on the HTML entry point', () => {
  for (const c of CASES) {
    it(`${c.name} -> ${c.bad ? 'rejected' : 'accepted'}`, () => {
      expect(htmlErrs(filamentsDoc(c.budget)).length > 0).toBe(c.bad);
    });
  }
});

describe('V6 — Doc and HTML entry points agree on every shared fixture', () => {
  for (const c of CASES) {
    it(`${c.name}: identical verdict`, () => {
      const d = filamentsDoc(c.budget);
      expect(htmlErrs(d).length > 0).toBe(docErrs(d).length > 0);
    });
  }
  it.each([['accessories', accessoriesDoc({ hook: 120 })], ['spare-parts', sparePartsDoc({ cta: 20 })]])(
    '%s: identical verdict on a violating document', (id, d) => {
      expect(htmlErrs(d, id).length > 0).toBe(true);
      expect(docErrs(d, id).length > 0).toBe(true);
    });
});

describe('AC-16 — the hard rule beats total length; the ceiling is soft', () => {
  it('a description under 4000 characters with a 120-word hook is rejected (the Story\'s own example)', () => {
    const d = filamentsDoc({ hook: 120, block2: 90, applications: 80, compat: 30, cta: 50 });
    expect(stripped(html(d)).length).toBeLessThan(4000);
    expect(docErrs(d).length).toBeGreaterThan(0);
    expect(htmlErrs(d).length).toBeGreaterThan(0);
  });
  it('a narrative above 5500 characters with every paragraph inside its range is accepted', () => {
    const d = filamentsDoc({ hook: 80, block2: 280, applications: 240, compat: 95, cta: 95 });
    expect(stripped(html(d)).length).toBeGreaterThan(5500);
    expect(docErrs(d)).toEqual([]);
    expect(htmlErrs(d)).toEqual([]);
  });
  it('the ceiling produces no issue of any severity (not even a warning) when ranges hold', () => {
    const d = filamentsDoc({ hook: 80, block2: 280, applications: 240, compat: 95, cta: 95 });
    expect(validateSimplifiedRangesDoc(d, ID, 'uk-UA', 'Doc (uk-UA)')).toEqual([]);
    expect(validateSimplifiedRangesHtml(html(d), ID, 'uk-UA', 'HTML (uk-UA)')).toEqual([]);
  });
  it('a document over 5500 characters that ALSO breaks a range is rejected for the range, at any length', () => {
    const d = filamentsDoc({ hook: 120, block2: 280, applications: 240, compat: 95, cta: 95 });
    expect(docErrs(d).length).toBeGreaterThan(0);
  });
});

describe('scope: present paragraphs, simplified templates, uk-UA master only', () => {
  it('an absent paragraph is not checked (no §5 -> no compatibility error)', () => {
    expect(docErrs(filamentsDoc({ compat_present: false }))).toEqual([]);
    expect(htmlErrs(filamentsDoc({ compat_present: false }))).toEqual([]);
  });
  it('Spare parts checks only §1, §5, §8', () => {
    expect(docErrs(sparePartsDoc(), 'spare-parts')).toEqual([]);
    expect(docErrs(sparePartsDoc({ hook: 20 }), 'spare-parts').some(e => e.path === 'hook')).toBe(true);
  });
  it('Accessories with §3 present: §3 has no word range, however long', () => {
    expect(docErrs(accessoriesDoc({ withFunctionality: true }), 'accessories')).toEqual([]);
  });
  it.each(['pl-PL', 'en-GB', 'de-DE', 'ru-UA', 'es-ES'])('%s: a translated locale enforces no range at all (OD-4)', locale => {
    const bad = filamentsDoc({ hook: 120, cta: 20 });
    expect(docErrs(bad, ID, locale)).toEqual([]);
    expect(htmlErrs(bad, ID, locale)).toEqual([]);
  });
  it('Full description (no id) is skipped, and so is a stale template id', () => {
    const bad = filamentsDoc({ hook: 120 });
    expect(errorsOf(validateSimplifiedRangesDoc(bad, undefined as unknown as string, 'uk-UA', 'Doc'))).toEqual([]);
    expect(errorsOf(validateSimplifiedRangesDoc(bad, STALE_TEMPLATE_ID, 'uk-UA', 'Doc'))).toEqual([]);
    expect(errorsOf(validateSimplifiedRangesHtml(html(bad), undefined as unknown as string, 'uk-UA', 'HTML'))).toEqual([]);
  });
});

describe('the repair feedback states actual vs allowed', () => {
  it('names the field, the allowed range and an actual count', () => {
    const [e] = docErrs(filamentsDoc({ hook: 120 }));
    expect(e.path).toBe('hook');
    expect(e.detail).toMatch(/40/);
    expect(e.detail).toMatch(/85/);
    expect(e.detail).toMatch(/\b1[12]\d\b/);
    expect(e.context).toBe('Doc (uk-UA)');
  });
  it('a too-short paragraph is described as too short (minimum enforced, not only maximum)', () => {
    const [e] = docErrs(filamentsDoc({ hook: 30 }));
    expect(e.detail).toMatch(/\b40\b/);
  });
});

describe('validateSimplifiedTemplateHtml — the single composed entry point the frozen validator calls (D5, D9)', () => {
  const legacyHtmlL = lazy(() => renderDescription(filamentsDoc({ hook: 120, specCategories: 2 }), CTX)); // pre-flat rendering: h3 + two tbody
  it('reports a range error AND a §7 shape error in one call (uk-UA)', () => {
    const issues = errorsOf(validateSimplifiedTemplateHtml(legacyHtmlL(), ID, 'uk-UA', 'HTML (uk-UA)'));
    expect(issues.some(i => /specs-shape/.test(i.rule))).toBe(true);
    expect(issues.some(i => !/specs-shape/.test(i.rule))).toBe(true);
  });
  it('for a translated locale the range half is skipped but the shape half still runs (FR-8 is structural)', () => {
    const issues = errorsOf(validateSimplifiedTemplateHtml(legacyHtmlL(), ID, 'pl-PL', 'HTML (pl-PL)'));
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every(i => /specs-shape/.test(i.rule))).toBe(true);
  });
  it('Full description yields nothing from either half', () => {
    expect(validateSimplifiedTemplateHtml(legacyHtmlL(), undefined as unknown as string, 'uk-UA', 'HTML')).toEqual([]);
  });
  it('a valid flat document, even above 5500 characters, yields nothing', () => {
    const big = filamentsDoc({ hook: 80, block2: 280, applications: 240, compat: 95, cta: 95 });
    expect(validateSimplifiedTemplateHtml(html(big), ID, 'uk-UA', 'HTML (uk-UA)')).toEqual([]);
  });
});

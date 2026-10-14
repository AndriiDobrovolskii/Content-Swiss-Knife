/**
 * faq-gate.spec.ts — US-8.1 T5: the FAQ validation composition and the store-or-skip decision
 * (FR-9, FR-10, FR-11; AC-9, AC-16, AC-17).
 *
 * TABLE A SPEC, OWNED BY T5. The module `./faq-gate` does not exist yet, so this file is RED BY ABSENT
 * MODULE, BY DESIGN (task breakdown, constraint 4): vitest reports "Failed to resolve import
 * './faq-gate'" and `tsc` reports TS2307 in this file only. It also imports `./faq-html` (T3) and
 * `validateFaqStructuralParity` (T4), both of which exist by the time T5 lands.
 *
 * Contract (task breakdown T5, signatures fixed):
 *   FAQ_MAX_ATTEMPTS = 3
 *   FAQ_CONTRACT_RULES: ReadonlySet<string>     // faq-provider-error + the five shape ids + structural-parity-count
 *   buildFaqValidator({ context, productName, locale, master?, providerFailed? }) -> (html) => ValidationIssue[]
 *   isFaqStorable(finalIssues) -> boolean       // no issue at severity 'error' whose rule is a contract rule
 * Order of the validator's output with providerFailed false: shape issues, then (translation only)
 * parity issues, then the frozen validateGeneratedHtml issues and the non-html-output check, the last
 * two ALWAYS demoted to severity 'warning'. With providerFailed true the only issue is one
 * faq-provider-error.
 *
 * Why demote the frozen findings (plan D6): FR-10 says "after a valid master no further master call is
 * made" and "valid" is FR-9. If a frozen-validator error still drove the gate, a FR-9-valid master could
 * be regenerated and AC-1 / FR-10 would break.
 */
import { describe, it, expect } from 'vitest';
import { FAQ_MAX_ATTEMPTS, FAQ_CONTRACT_RULES, buildFaqValidator, isFaqStorable } from './faq-gate';
import { FAQ_SHAPE_RULES } from './faq-html';
import { validateFaqStructuralParity } from './structural-parity';
import { validateGeneratedHtml, type ValidationIssue } from './output-validator';
import { REPAIR_STRATEGIES, resolveLadder } from './repair-strategy';

const MASTER =
  '<h3>Чи потрібен підігрів столу?</h3><p><b>Так, рекомендовано.</b> Нагрівайте стіл до 60 °C.</p>'
  + '<h3>Яке сопло обрати?</h3><p>Для швидкості — 0,4 мм:</p><ul><li><b>0,4 мм:</b> швидкість;</li><li><b>0,2 мм:</b> деталі.</li></ul>';
const TRANSLATED =
  '<h3>Czy potrzebny jest podgrzewany stół?</h3><p><b>Tak, zalecany.</b> Rozgrzej stół do 60 °C.</p>'
  + '<h3>Jaką dyszę wybrać?</h3><p>Dla szybkości — 0,4 mm:</p><ul><li><b>0,4 mm:</b> szybkość;</li><li><b>0,2 mm:</b> detale.</li></ul>';
// Shape-valid (no tag outside h3/p/b/ul/li, no attribute) but the PROSE contains the forbidden markup
// text, which the frozen validator reports as a duplicate-product-schema ERROR.
const FROZEN_ERROR_BUT_FR9_VALID =
  '<h3>Q?</h3><p>Markup such as itemtype="https://schema.org/Product" belongs to the CMS module.</p>';

const masterValidator = (over: Partial<Parameters<typeof buildFaqValidator>[0]> = {}) =>
  buildFaqValidator({ context: 'FAQ (uk-UA)', productName: 'Bambu Lab P1S', locale: 'uk-UA', ...over });
const translationValidator = (over: Partial<Parameters<typeof buildFaqValidator>[0]> = {}) =>
  buildFaqValidator({ context: 'FAQ (pl-PL)', productName: 'Bambu Lab P1S', locale: 'pl-PL', master: MASTER, ...over });
const errors = (issues: ValidationIssue[]) => issues.filter(i => i.severity === 'error');

describe('constants', () => {
  it('FAQ_MAX_ATTEMPTS is 3 (AC-16, AC-17), independent of any user setting', () => {
    expect(FAQ_MAX_ATTEMPTS).toBe(3);
  });

  it('FAQ_CONTRACT_RULES is faq-provider-error, the five shape rules and structural-parity-count', () => {
    expect([...FAQ_CONTRACT_RULES].sort()).toEqual([
      'faq-provider-error', ...FAQ_SHAPE_RULES, 'structural-parity-count',
    ].sort());
  });
});

describe('buildFaqValidator — the master (no `master` option)', () => {
  it('a FR-9-valid master has no error issue', () => {
    expect(errors(masterValidator()(MASTER))).toEqual([]);
  });

  it.each([
    ['<br>', '<h3>Q?</h3><p>a<br>b</p>', 'faq-element-not-allowed'],
    ['an <h2>', '<h3>Q?</h3><p>a</p><h2>x</h2>', 'faq-element-not-allowed'],
    ['an unclosed <p>', '<h3>Q?</h3><p>a', 'faq-not-well-formed'],
    ['a class attribute', '<h3>Q?</h3><p class="x">a</p>', 'faq-attribute-present'],
    ['no leading <h3>', '<p>a</p>', 'faq-must-start-with-h3'],
    ['Markdown bold', '<h3>Q?</h3><p>**a**</p>', 'faq-markdown-syntax'],
  ])('%s is a contract ERROR (it drives regeneration and blocks storage)', (_name, html, rule) => {
    const found = errors(masterValidator()(html));
    expect(found.map(i => i.rule)).toContain(rule);
    expect(isFaqStorable(found)).toBe(false);
  });

  it('applies no structural-parity rule to a master', () => {
    expect(masterValidator()('<h3>Q?</h3><p>a</p>').some(i => i.rule === 'structural-parity-count')).toBe(false);
  });

  it('an empty or whitespace-only master is NOT claimed by the shape rules and is not an error (terminal "no FAQ" is the pipeline\'s)', () => {
    for (const empty of ['', '  \n\t ']) {
      expect(errors(masterValidator()(empty)), JSON.stringify(empty)).toEqual([]);
    }
  });

  it('stamps the caller context on every contract issue', () => {
    for (const i of errors(masterValidator({ context: 'FAQ (uk-UA)' })('<h3>Q?</h3><p class="x">a<br></p>'))) {
      expect(i.context).toBe('FAQ (uk-UA)');
    }
  });
});

describe('buildFaqValidator — a translation (`master` supplied): FR-3 / AC-3 / AC-17', () => {
  it('a translation with the master\'s structure has no error issue', () => {
    expect(errors(translationValidator()(TRANSLATED))).toEqual([]);
  });

  it.each([
    ['a dropped question', TRANSLATED.replace('<h3>Jaką dyszę wybrać?</h3>', '')],
    ['a dropped paragraph', TRANSLATED.replace('<p>Dla szybkości — 0,4 mm:</p>', '')],
    ['a dropped list item', TRANSLATED.replace('<li><b>0,2 mm:</b> detale.</li>', '')],
    ['an added paragraph', `${TRANSLATED}<p>An extra closing paragraph.</p>`],
    ['an empty translation', ''],
    ['a whitespace-only translation', '   \n '],
  ])('%s is a structural-parity-count ERROR, visible as an issue (AC-17)', (_name, html) => {
    const found = errors(translationValidator()(html));
    expect(found.map(i => i.rule)).toContain('structural-parity-count');
    expect(isFaqStorable(found)).toBe(false);
  });

  it('its parity issues are exactly validateFaqStructuralParity(master, html, context)', () => {
    const html = TRANSLATED.replace('<h3>Jaką dyszę wybrać?</h3>', '');
    const expected = validateFaqStructuralParity(MASTER, html, 'FAQ (pl-PL)');
    expect(expected.length).toBeGreaterThan(0);
    const got = translationValidator()(html).filter(i => i.rule === 'structural-parity-count');
    expect(got).toEqual(expected);
  });

  it('a translation that also breaks the shape reports the shape rules BEFORE the parity rule', () => {
    const html = `${TRANSLATED.replace('<h3>Jaką dyszę wybrać?</h3>', '')}<br>`;
    const order = translationValidator()(html).map(i => i.rule);
    const shape = order.findIndex(r => r === 'faq-element-not-allowed');
    const parity = order.findIndex(r => r === 'structural-parity-count');
    expect(shape).toBeGreaterThanOrEqual(0);
    expect(parity).toBeGreaterThan(shape);
  });
});

describe('buildFaqValidator — frozen validateGeneratedHtml findings are advisory (plan D6, FR-10)', () => {
  it('premise: the frozen validator really reports an ERROR for the chosen FR-9-valid text', () => {
    const direct = validateGeneratedHtml(FROZEN_ERROR_BUT_FR9_VALID, 'FAQ (uk-UA)', 'Bambu Lab P1S', 'uk-UA');
    expect(direct.some(i => i.severity === 'error')).toBe(true);
  });

  it('every frozen finding is returned with its rule id, demoted to severity "warning"', () => {
    const direct = validateGeneratedHtml(FROZEN_ERROR_BUT_FR9_VALID, 'FAQ (uk-UA)', 'Bambu Lab P1S', 'uk-UA');
    const got = masterValidator()(FROZEN_ERROR_BUT_FR9_VALID);
    for (const d of direct) {
      const mine = got.find(i => i.rule === d.rule);
      expect(mine, `frozen rule ${d.rule} is still reported`).toBeDefined();
      expect(mine!.severity).toBe('warning');
    }
    expect(errors(got)).toEqual([]);
  });

  it('a FR-9-valid text carrying a frozen-validator error is storable (no contract error)', () => {
    expect(isFaqStorable(masterValidator()(FROZEN_ERROR_BUT_FR9_VALID))).toBe(true);
  });

  it('the non-html-output check is advisory too', () => {
    for (const i of masterValidator()('plain prose with no tags at all').filter(x => x.rule === 'non-html-output')) {
      expect(i.severity).toBe('warning');
    }
  });

  it('a stylistic frozen warning (unit spacing) never blocks storage', () => {
    const got = masterValidator({ locale: 'en-GB', context: 'FAQ (en-GB)' })('<h3>Which filament?</h3><p>Use 1.75mm filament.</p>');
    expect(errors(got)).toEqual([]);
    expect(isFaqStorable(got)).toBe(true);
  });
});

describe('buildFaqValidator — provider failure (SP-1 default: one failed attempt, not an abort)', () => {
  it('when providerFailed() is true the only issue is one faq-provider-error', () => {
    const got = masterValidator({ providerFailed: () => true })(MASTER);
    expect(got).toHaveLength(1);
    expect(got[0].rule).toBe('faq-provider-error');
    expect(got[0].severity).toBe('error');
    expect(got[0].context).toBe('FAQ (uk-UA)');
    expect(got[0].path).toBeUndefined();
  });

  it('applies to a translation too, and wins over a perfectly good body', () => {
    const got = translationValidator({ providerFailed: () => true })(TRANSLATED);
    expect(got.map(i => i.rule)).toEqual(['faq-provider-error']);
  });

  it('providerFailed is read at EVERY validate call, not once at build time', () => {
    let failed = true;
    const validate = masterValidator({ providerFailed: () => failed });
    expect(validate(MASTER).map(i => i.rule)).toEqual(['faq-provider-error']);
    failed = false;
    expect(errors(validate(MASTER))).toEqual([]);
    failed = true;
    expect(validate(MASTER).map(i => i.rule)).toEqual(['faq-provider-error']);
  });

  it('a provider failure makes the artifact not storable', () => {
    expect(isFaqStorable(masterValidator({ providerFailed: () => true })(MASTER))).toBe(false);
  });
});

describe('isFaqStorable — the only storage decision', () => {
  const issue = (rule: string, severity: 'error' | 'warning'): ValidationIssue => ({ severity, rule, detail: 'x', context: 'FAQ (uk-UA)' });

  it('no issues at all is storable', () => {
    expect(isFaqStorable([])).toBe(true);
  });

  it.each([...['faq-provider-error', 'faq-not-well-formed', 'faq-element-not-allowed', 'faq-attribute-present',
    'faq-must-start-with-h3', 'faq-markdown-syntax', 'structural-parity-count']])(
    'a contract rule (%s) at severity error is NOT storable', (rule) => {
      expect(isFaqStorable([issue(rule, 'error')])).toBe(false);
    });

  it('a frozen-validator rule at severity error does not block storage', () => {
    expect(isFaqStorable([issue('duplicate-product-schema', 'error'), issue('empty-output', 'error')])).toBe(true);
  });

  it('a contract rule that is only a warning does not block storage', () => {
    expect(isFaqStorable([issue('structural-parity-count', 'warning')])).toBe(true);
  });

  it('one surviving contract error among advisory findings blocks storage', () => {
    expect(isFaqStorable([issue('unit-spacing', 'warning'), issue('faq-attribute-present', 'error'), issue('duplicate-h1', 'error')])).toBe(false);
  });
});

describe('repair strategy is unchanged: every contract rule resolves to full regeneration', () => {
  it('no contract rule is registered in REPAIR_STRATEGIES (a path-less rule needs no registration)', () => {
    expect(FAQ_CONTRACT_RULES.size, 'premise: the contract rule set is not empty').toBe(7);
    for (const rule of FAQ_CONTRACT_RULES) expect(REPAIR_STRATEGIES.has(rule), rule).toBe(false);
  });

  it('resolveLadder gives exactly ["full-regen"] for every issue the validators emit', () => {
    const emitted: ValidationIssue[] = [
      ...masterValidator()('<p class="x">a<br>**b**'),
      ...translationValidator()(''),
      ...masterValidator({ providerFailed: () => true })(MASTER),
    ].filter(i => FAQ_CONTRACT_RULES.has(i.rule));
    const rulesSeen = new Set(emitted.map(i => i.rule));
    expect(rulesSeen.size).toBeGreaterThanOrEqual(5);
    for (const i of emitted) expect(resolveLadder(i), i.rule).toEqual(['full-regen']);
  });
});

describe('purity', () => {
  it('the same input gives the same issues, twice', () => {
    const html = '<h3>Q?</h3><p class="x">a<br></p>';
    expect(masterValidator()(html)).toEqual(masterValidator()(html));
    expect(translationValidator()(html)).toEqual(translationValidator()(html));
  });
});

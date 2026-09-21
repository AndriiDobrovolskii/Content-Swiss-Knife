/**
 * heading-style.v4.spec.ts — US-2.1 validation category V8 (D4 consequence 1, impact analysis §4.2).
 *
 * WHY THIS CATEGORY EXISTS AT ALL. FR-4 gives §2 an `<h2>` it has never had, and two rules in
 * `heading-style.ts` react to a new `<h2>` without anyone asking them to:
 *
 *   `h2-nominal-heading` (`:249-276`) — Center 3D Print's Style B requires §3 `<h2>`s to state a
 *   function. A nominal §2 heading is legitimate, and the only thing that tells the linter so is
 *   membership of `MANDATED_NOMINAL_H2` — which is why T2 adds the uk-ua and ru-ua §2 strings to it
 *   rather than broadening the rule.
 *
 *   `heading-product-name-stuffing` (`:117-205`) — budgets exactly two product-named `<h2>`s per
 *   document and treats the LAST `?`-bearing `<h2>` as the §9 closing (`:181-187`). A §2 heading
 *   that named the product would spend one of those two. D4 keeps it nominal and product-free
 *   precisely so nothing else has to move, and this is where that holds or does not.
 *
 * THE VACUOUS-PASS GUARD. Until T5 renders it, a `'4.0'` document produces no §2 `<h2>` at all, so
 * "no `h2-nominal-heading` warning" would be true for entirely the wrong reason. Every test below
 * therefore asserts the new heading EXISTS first, by comparing the `<h2>` count against the same
 * document rendered as `'3.0'`.
 */
import { describe, it, expect } from 'vitest';

import { validateHeadingStyle } from './heading-style';
import { renderDescription, type RenderContext } from '../render/render-description';
import { v4ValidDoc } from '../../test/fixtures/v4-docs';
import type { ProductDescriptionDoc } from '../domain/description-doc';

const C3D = 'Center 3D Print';

/**
 * The RAW input name, kit suffix and all — which is what `validateHeadingStyle` takes. The fixture's
 * headings carry the SHORT form ("Ortur H20 20 W"), which is what `[HEADING FORM]` permits in the
 * first §3 heading and the §9 closing. Passing the short form as the raw name instead would make
 * every product-named heading read as the FULL name and fire a warning that has nothing to do with
 * v4 — a fixture artefact that would leave this suite red forever.
 */
const PRODUCT = 'Ortur H20 20 W Standard Kit';

const ctxFor = (): RenderContext => ({
  imageBaseUrl: 'https://center3dprint.com/image/catalog/Products/',
  brandFolder: 'ortur',
  modelFolder: 'h20-20w',
  storeName: C3D,
});

/**
 * The v4 fixture with §3 headings written in the locale under test. Style B's functional-opener
 * check is language-keyed — «Як …» is recognised for uk-ua and «Как …» for ru-ua — so reusing the
 * Ukrainian headings for ru-UA would flag them for a reason that has nothing to do with §2.
 */
function localeDoc(locale: string): ProductDescriptionDoc {
  const doc = v4ValidDoc({ locale });
  if (locale.toLowerCase() === 'ru-ua') {
    doc.functionality[0].heading = 'Как работает лазерный модуль';
    doc.functionality[1].heading = 'Как программное обеспечение управляет резкой';
    doc.compatibility = { ...doc.compatibility!, heading: 'Совместимость' };
    doc.applications = { ...doc.applications, heading: 'Сферы применения' };
    doc.packageContents = { ...doc.packageContents!, heading: 'Что в коробке?' };
  }
  return doc;
}

const h2Count = (html: string) => (html.match(/<h2\b/g) ?? []).length;

describe.each(['uk-UA', 'ru-UA'])('V8 — Center 3D Print / %s', locale => {
  const doc = localeDoc(locale);
  const html = renderDescription(doc, ctxFor());
  const issues = validateHeadingStyle(html, locale, C3D, PRODUCT);

  /** The guard. Without it every assertion below passes against a document that has no §2 heading. */
  it('renders one more <h2> than the same document does as `3.0`', () => {
    const asV3 = { ...doc, schemaVersion: '3.0' as const };
    expect(h2Count(html)).toBe(h2Count(renderDescription(asV3, ctxFor())) + 1);
  });

  it('raises no h2-nominal-heading warning', () => {
    const nominal = issues.filter(i => i.rule === 'h2-nominal-heading');
    expect(nominal.map(i => i.detail), JSON.stringify(nominal, null, 2)).toEqual([]);
  });

  /**
   * D4 consequence 1, as a measurement rather than an argument: the §2 heading spends none of the
   * two-product-name budget, so the §9 closing keeps its slot.
   */
  it('raises no heading-product-name-stuffing warning', () => {
    const stuffing = issues.filter(i => i.rule === 'heading-product-name-stuffing');
    expect(stuffing.map(i => i.detail), JSON.stringify(stuffing, null, 2)).toEqual([]);
  });

  it('names the product in at most two <h2>s', () => {
    const named = [...html.matchAll(/<h2\b[^>]*>([^]*?)<\/h2>/g)]
      .map(m => m[1])
      .filter(t => t.includes('Ortur H20'));
    expect(named.length).toBeLessThanOrEqual(2);
  });

  /** The §9 closing must remain the LAST `?`-bearing `<h2>`, which `:181-187` depends on. */
  it('keeps the §9 closing as the last question-form <h2>', () => {
    const questions = [...html.matchAll(/<h2\b[^>]*>([^]*?)<\/h2>/g)]
      .map(m => m[1])
      .filter(t => t.includes('?'));
    expect(questions.length).toBeGreaterThan(0);
    expect(questions[questions.length - 1]).toContain('Ortur H20');
  });
});

describe('V8 — the rule is untouched, only its input changed', () => {
  /**
   * 🔵 CHARACTERIZATION. `h2-nominal-heading` is Center 3D Print's voice, not a global rule, and
   * this Story does not widen it. A bare nominal §3 heading is still flagged for that store, and
   * still ignored for every other one — asserted so a broadened rule would be caught rather than
   * quietly accepted as "the v4 heading needed it".
   */
  it('still flags a bare nominal §3 heading for Center 3D Print', () => {
    const issues = validateHeadingStyle('<h2>ПЗ та автоматизація</h2>', 'uk-UA', C3D, PRODUCT);
    expect(issues.map(i => i.rule)).toContain('h2-nominal-heading');
  });

  it('still ignores the same heading for a store that is not Center 3D Print', () => {
    const issues = validateHeadingStyle('<h2>ПЗ та автоматизація</h2>', 'uk-UA', 'EXPERT3D', PRODUCT);
    expect(issues.filter(i => i.rule === 'h2-nominal-heading')).toEqual([]);
  });
});

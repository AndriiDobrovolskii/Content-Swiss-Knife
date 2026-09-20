/**
 * v4-headings.spec.ts — US-2.1 validation category V7, plus the FR-11 CTA resolver (T4) and the
 * renderer-side sourcing assertions for the §2 and §9 headings.
 *
 * WHAT THIS FILE IS ABOUT. v4 fixes three heading families in CODE rather than leaving them to the
 * model: the §2 Killer-Specs-and-Benefits `<h2>` (D4), both §6 package-contents variants (FR-6, D5)
 * and the §9 CTA template (FR-11, D6). The rationale is already recorded in this repository at
 * `constants.ts:97` for `DELIVERY_REGION_PHRASES`: left to the model, a fixed commercial string
 * comes back differently worded on each run, and a v4 section heading is that same class of string.
 * Without a named source, a test would have to INVENT the expected heading for nine locales.
 *
 * 🔴 TWO NAMES ARE FIXED HERE BY `TEST_WRITING`, BECAUSE THE PLAN DELIBERATELY LEFT THEM OPEN.
 * The implementation plan settles that the table is code-resident and keyed over the registry's
 * locales, and that `StoreRenderRules` gains a CTA-heading member "in the shape of
 * `killerSpecsHeaders`" — it names neither identifier. A test cannot assert against an unnamed
 * export, so this file fixes them and `so-builder` must use them:
 *
 *   · `src/prompt-core/constants.ts` exports `V4_SECTION_HEADINGS` (T2), keyed by LOWERCASE BCP47
 *     exactly as `DELIVERY_REGION_PHRASES` and `MANDATED_NOMINAL_H2` already are, each entry
 *     `{ keyBenefitsH2, packageContentsSingle, packageContentsSet, ctaTemplate }`;
 *   · `StoreRenderRules` gains `ctaHeading(locale, productShortName): string` (T4).
 *
 * WHY THE TABLE IS REACHED THROUGH THE MODULE NAMESPACE. A named import of an export that does not
 * exist yet is a link-time failure that takes the WHOLE module down — vitest then reports one
 * module error and nothing about which contract is missing. Reading it off the namespace keeps
 * every assertion below individually red, and each failure names the value it wanted.
 */
import { describe, it, expect } from 'vitest';

import * as promptConstants from './constants';
import { MANDATED_NOMINAL_H2, STORE_REGISTRY } from './constants';
import { getRenderRules } from './store-render-rules';
import { renderDescription, type RenderContext } from '../render/render-description';
import { v4ValidDoc } from '../../test/fixtures/v4-docs';

interface V4HeadingEntry {
  /** §2 — nominal and product-free. See the placeholder assertions below for why that matters. */
  keyBenefitsH2: string;
  /** §6 — a single product ("Що в коробці?" in uk-UA). */
  packageContentsSingle: string;
  /** §6 — a set ("Що входить до набору?" in uk-UA). */
  packageContentsSet: string;
  /** §9 — the commercial closing template, carrying `[Product-short]` and `[Store]`. */
  ctaTemplate: string;
}

/** T2's export, read off the namespace — `undefined` until T2 lands. See the header. */
const V4_SECTION_HEADINGS = (promptConstants as unknown as Record<string, unknown>)[
  'V4_SECTION_HEADINGS'
] as Record<string, V4HeadingEntry> | undefined;

type CtaHeadingResolver = (locale: string, productShortName: string) => string;

/** T4's member, read off the resolved rules object — `undefined` until T4 lands. */
function ctaHeadingOf(storeName: string): CtaHeadingResolver | undefined {
  return (getRenderRules(storeName) as unknown as { ctaHeading?: CtaHeadingResolver }).ctaHeading;
}

/** Every locale any store publishes, derived FROM the registry — never hand-listed (NFR-6). */
const REGISTRY_LOCALES = [
  ...new Set(Object.values(STORE_REGISTRY).flatMap(p => p.languages.map(l => l.toLowerCase()))),
].sort();

const entryFor = (locale: string): V4HeadingEntry | undefined => V4_SECTION_HEADINGS?.[locale.toLowerCase()];

// ── V7 — the heading table ───────────────────────────────────────────────────────────────────────

describe('V7 — FR-6 / FR-11 / NFR-6: the v4 heading table covers every registry locale', () => {
  /**
   * The enumeration itself is asserted, for the same reason `render-conformance.spec.ts:146-149`
   * asserts its own: a matrix that silently enumerated zero locales would report green and prove
   * nothing. Ten locales across seven stores is the shape `STORE_REGISTRY` has today.
   */
  it('derives its locale set from STORE_REGISTRY rather than a hand-written list', () => {
    expect(Object.keys(STORE_REGISTRY)).toHaveLength(7);
    expect(REGISTRY_LOCALES).toHaveLength(10);
    expect(REGISTRY_LOCALES).toContain('es-mx');
    expect(REGISTRY_LOCALES).toContain('en-us');
  });

  it.each(REGISTRY_LOCALES)('has all four entries for %s, each a non-empty string', locale => {
    const entry = entryFor(locale);
    expect(entry, `V4_SECTION_HEADINGS has no entry for ${locale}`).toBeDefined();
    for (const field of ['keyBenefitsH2', 'packageContentsSingle', 'packageContentsSet', 'ctaTemplate'] as const) {
      expect((entry as V4HeadingEntry)[field], `${locale}.${field}`).toMatch(/\S/);
    }
  });

  it('covers no locale the registry does not publish, so the two cannot drift apart', () => {
    expect(Object.keys(V4_SECTION_HEADINGS ?? {}).sort()).toEqual(REGISTRY_LOCALES);
  });

  /** FR-6 states the two uk-UA §6 variants verbatim, and the single/set choice stays the model's. */
  it('gives uk-UA the two §6 variants FR-6 names, and they differ from each other', () => {
    const uk = entryFor('uk-UA');
    expect(uk?.packageContentsSingle).toBe('Що в коробці?');
    expect(uk?.packageContentsSet).toBe('Що входить до набору?');
  });

  /**
   * D4 consequence 1, checked here rather than three tasks later. `checkProductNameStuffing`
   * (`heading-style.ts:117-205`) budgets two product-named `<h2>`s per document and treats the last
   * `?`-bearing `<h2>` as the §9 closing. A §2 heading that named the product would spend one of
   * those two and put the CTA's slot in question — so the §2 entry carries no slot at all, in
   * deliberate contrast with the §9 template, which carries exactly two.
   */
  it.each(REGISTRY_LOCALES)('gives %s a §2 heading with no interpolation slot', locale => {
    const entry = entryFor(locale);
    expect(entry, `no entry for ${locale}`).toBeDefined();
    expect((entry as V4HeadingEntry).keyBenefitsH2).not.toMatch(/\[|\{|\$\{/);
  });

  it.each(REGISTRY_LOCALES)('gives %s a §9 template carrying both [Product-short] and [Store]', locale => {
    const entry = entryFor(locale);
    expect(entry, `no entry for ${locale}`).toBeDefined();
    expect((entry as V4HeadingEntry).ctaTemplate).toContain('[Product-short]');
    expect((entry as V4HeadingEntry).ctaTemplate).toContain('[Store]');
  });

  /**
   * T2's second half. `MANDATED_NOMINAL_H2` is what stops `h2-nominal-heading` warning about a
   * legitimately nominal heading under Center 3D Print's ToV, and the §2 heading is exactly that
   * class of string — the same reason the six entries already there are there. Asserted as
   * membership rather than as a literal, so the wording stays the table's to decide.
   */
  it.each(['uk-ua', 'ru-ua'])('adds the %s §2 heading to MANDATED_NOMINAL_H2', locale => {
    const entry = entryFor(locale);
    expect(entry, `no entry for ${locale}`).toBeDefined();
    expect(MANDATED_NOMINAL_H2[locale]).toContain((entry as V4HeadingEntry).keyBenefitsH2);
  });
});

// ── FR-11 — the CTA heading resolver (T4) ────────────────────────────────────────────────────────

const STORE_LOCALE_PAIRS = Object.entries(STORE_REGISTRY).flatMap(([storeName, profile]) =>
  profile.languages.map(locale => ({ storeName, locale })),
);

describe('FR-11 / D6 — getRenderRules(store).ctaHeading interpolates the per-locale template', () => {
  it.each(STORE_LOCALE_PAIRS)(
    '$storeName / $locale — substitutes the product and the store, leaving no placeholder behind',
    ({ storeName, locale }) => {
      const resolve = ctaHeadingOf(storeName);
      expect(resolve, `${storeName}: getRenderRules(...).ctaHeading is not implemented`).toBeTypeOf('function');

      const heading = (resolve as CtaHeadingResolver)(locale, 'Ortur H20 20 W');
      expect(heading).toContain('Ortur H20 20 W');
      expect(heading).toContain(storeName);
      expect(heading).not.toContain('[Product-short]');
      expect(heading).not.toContain('[Store]');
      expect(heading.trimEnd().endsWith('?')).toBe(true);
    },
  );

  /**
   * The Center 3D Print ToV override, quoted at `constants.ts:1456-1458`: the soft «варто» form
   * «Чому варто купити [Product-short] у Center 3D Print?», which that block says REPLACES the
   * master template. `store-render-rules.ts` exists so every per-store rendering decision has one
   * home; this is the second one it answers, after `killerSpecsHeaders`.
   */
  it('honours Center 3D Print’s uk-UA «варто … у Center 3D Print» override', () => {
    const resolve = ctaHeadingOf('Center 3D Print');
    expect(resolve, 'getRenderRules("Center 3D Print").ctaHeading is not implemented').toBeTypeOf('function');
    expect((resolve as CtaHeadingResolver)('uk-UA', 'Ortur H20 20 W')).toContain('у Center 3D Print');
  });

  /** A derived view, never a copy: the resolver reads the table rather than restating the strings. */
  it('resolves from V4_SECTION_HEADINGS rather than holding its own copy of the template', () => {
    const entry = entryFor('uk-UA');
    expect(entry, 'no uk-UA entry in V4_SECTION_HEADINGS').toBeDefined();

    const resolve = ctaHeadingOf('EXPERT3D');
    expect(resolve, 'getRenderRules("EXPERT3D").ctaHeading is not implemented').toBeTypeOf('function');

    const expected = (entry as V4HeadingEntry).ctaTemplate
      .replace('[Product-short]', 'Ortur H20 20 W')
      .replace('[Store]', 'EXPERT3D');
    expect((resolve as CtaHeadingResolver)('uk-UA', 'Ortur H20 20 W')).toBe(expected);
  });

  /**
   * `killerSpecsHeaders` is unreachable on the `'4.0'` render path but still serves the `'3.0'` one
   * and `table-finalize.ts`. Becoming unused on one of two paths is not the same as being dead
   * (D8), so the existing member must survive T4 beside the new one.
   */
  it('keeps killerSpecsHeaders alongside the new member', () => {
    expect(getRenderRules('EXPERT3D').killerSpecsHeaders).toBeTypeOf('function');
    expect(getRenderRules('EXPERT3D').killerSpecsHeaders('uk-UA')).toBeDefined();
  });
});

// ── The renderer reads the tables rather than the document ───────────────────────────────────────

const CTX: RenderContext = {
  imageBaseUrl: 'https://impresora-3d.es/image/catalog/products/',
  brandFolder: 'ortur',
  modelFolder: 'h20-20w',
  storeName: 'EXPERT3D',
};

describe('FR-4 / FR-11 — the rendered `4.0` headings come from code, not from the document', () => {
  it('§2 — renders the table’s keyBenefitsH2 for the document locale', () => {
    const entry = entryFor('uk-UA');
    expect(entry, 'no uk-UA entry in V4_SECTION_HEADINGS').toBeDefined();
    const html = renderDescription(v4ValidDoc(), CTX);
    expect(html.split('\n\n')[1]).toContain(`<h2>${(entry as V4HeadingEntry).keyBenefitsH2}</h2>`);
  });

  /**
   * D6's construction guarantee: FR-11's failure path ("a heading that does not match the template
   * fails validation") is made UNREACHABLE rather than checked, because the renderer discards
   * `doc.cta.heading` on the `'4.0'` path. Asserted by handing the document a heading that is
   * obviously off-template and observing that it never reaches the output.
   */
  it('§9 — discards doc.cta.heading and assembles the CTA from the template instead', () => {
    const doc = v4ValidDoc();
    doc.cta.heading = 'Замовляйте вже сьогодні';
    const html = renderDescription(doc, CTX);

    expect(html).not.toContain('Замовляйте вже сьогодні');
    const resolve = ctaHeadingOf('EXPERT3D');
    expect(resolve, 'getRenderRules("EXPERT3D").ctaHeading is not implemented').toBeTypeOf('function');
    expect(html).toContain(`<h2>${(resolve as CtaHeadingResolver)('uk-UA', doc.localizedName)}</h2>`);
  });

  /** The `'3.0'` path is untouched: `doc.cta.heading` is still what ships. */
  it('§9 — a `3.0` document still renders its own authored cta.heading', () => {
    const doc = v4ValidDoc();
    const v3 = { ...doc, schemaVersion: '3.0' as const, cta: { ...doc.cta, heading: 'Чому купити тут?' } };
    expect(renderDescription(v3, CTX)).toContain('<h2>Чому купити тут?</h2>');
  });
});

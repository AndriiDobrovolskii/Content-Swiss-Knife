/**
 * product-name-preservation.stores.spec.ts — US-7.1 AC-4 at validator level (NFR-7), AC-1, AC-2, AC-3,
 * AC-6 (T3 / T2).
 *
 * NFR-7: AC-1 – AC-5 are verified by prompt-text assertions on the exported builders plus VALIDATOR-LEVEL
 * assertions (FR-5, both parts) on fixture outputs for EVERY STORE_REGISTRY ENTRY. This is the validator
 * half. The registry is iterated; no store is named; each store contributes its own locales and its own
 * `officialBrands` (including the two stores whose list is empty).
 *
 * Red at import time until so-builder creates product-name-preservation.ts and protected-product-name.ts.
 * The orchestrator-level, per-store halves are in content-orchestrator.protected-name-*.spec.ts.
 */
import { describe, it, expect } from 'vitest';
import { checkNameSurfaces, checkDescriptionHtml } from './product-name-preservation';
import { classifyProductName, SPEC_LISTED_BRANDS } from './protected-product-name';
import { validateSeoMetadata } from './output-validator';
import { validateSeoMetadataShape } from './seo-metadata-shape';
import { STORE_REGISTRY, getLangsForStore } from '../prompt-core/constants';
import {
  FIXTURE_A, FIXTURE_C, PART1, PART2, registryStores, compliantSlugs, shortenedSlugs, compliantSeo, shortenedSeo,
  LONG_CATEGORY,
} from '../../test/fixtures/protected-name';

const stores = registryStores().map(s => [s] as [string]);

describe.each(stores)('FR-5 on fixture outputs — store %s (AC-1, AC-2, AC-3, AC-4)', (store) => {
  const { seoLangs } = getLangsForStore(store);

  it('classification does not depend on the store: Fixture A and a brand-only name are protected, Fixture C is generic', () => {
    expect(classifyProductName(FIXTURE_A).protected).toBe(true);
    expect(classifyProductName('Bambu Lab PLA Basic Filament 1.75 mm').protected).toBe(true);
    expect(classifyProductName(FIXTURE_C).protected).toBe(false);
    expect(classifyProductName('With Spool').protected).toBe(false);
  });

  it('AC-1: a compliant Slugs set (typed name whole in every locale of this store) raises nothing', () => {
    expect(checkNameSurfaces(FIXTURE_A, { slugs: compliantSlugs(store, FIXTURE_A) })).toEqual([]);
  });

  it('AC-1: the observed bug (shortened names) is reported for EVERY locale of this store', () => {
    const issues = checkNameSurfaces(FIXTURE_A, { slugs: shortenedSlugs(store) });
    for (const [i, lang] of seoLangs.entries()) {
      const forLocale = issues.filter(x => x.path === `slugs[${i}].name`);
      expect(forLocale.length, `${lang} name`).toBeGreaterThan(0);
      expect(forLocale.every(x => x.rule === PART1 && x.severity === 'error' && x.context.includes(lang))).toBe(true);
      expect(forLocale.map(x => x.detail).join(' ')).toContain('Resin');
    }
  });

  it('AC-2: a compliant SEO set passes FR-5 AND every existing SEO validator (AC-6 regression guard)', () => {
    const seo = compliantSeo(store, FIXTURE_A);
    expect(checkNameSurfaces(FIXTURE_A, { seo })).toEqual([]);
    expect(validateSeoMetadata(seo, '').filter(i => i.severity === 'error')).toEqual([]);
    expect(validateSeoMetadataShape(seo, 'SEO metadata')).toEqual([]);
    for (const e of seo.seo_data) {
      expect(e.h1).toContain(FIXTURE_A);
      expect(e.meta_title).toContain(FIXTURE_A);
      expect(Array.from(e.meta_title).length).toBeLessThanOrEqual(55);
    }
  });

  it('AC-2: a localized category noun in the h1 is accepted when it is there, and the title may omit it', () => {
    const seo = compliantSeo(store, FIXTURE_A);
    seo.seo_data = seo.seo_data.map(e => ({ ...e, h1: `${LONG_CATEGORY} ${FIXTURE_A}` }));
    // meta_title must still start with its h1 for the existing shape rule, so only FR-5 is judged here.
    expect(checkNameSurfaces(FIXTURE_A, { seo })).toEqual([]);
  });

  it('AC-2 / AC-8: the shortened SEO set is reported at h1 and meta_title for every locale of this store', () => {
    const issues = checkNameSurfaces(FIXTURE_A, { seo: shortenedSeo(store) });
    for (const [i, lang] of seoLangs.entries()) {
      for (const field of ['h1', 'meta_title']) {
        const here = issues.filter(x => x.path === `seo_data[${i}].${field}`);
        expect(here.map(x => x.rule), `${lang} ${field}`).toEqual(expect.arrayContaining([PART1, PART2]));
      }
      expect(issues.some(x => x.path === `seo_data[${i}].meta_description` && x.rule === PART2), `${lang} meta_description`).toBe(true);
    }
  });

  it('AC-3: the altered form is reported in the description of every locale; the full designator is not', () => {
    for (const lang of seoLangs) {
      const altered = `<h1>Резервуар для смол ${'Formlabs Form Studio 1 Pro'}</h1><p>Це Form Studio 1 Pro.</p>`;
      const full = `<h1>Резервуар для смол ${FIXTURE_A}</h1><p>Це ${FIXTURE_A}.</p>`;
      expect(checkDescriptionHtml(FIXTURE_A, altered, `HTML (${lang})`).length, lang).toBeGreaterThan(0);
      expect(checkDescriptionHtml(FIXTURE_A, full, `HTML (${lang})`), lang).toEqual([]);
    }
  });

  it('every official brand of this store (and the spec-listed brands when the list is empty) makes a typed name protected and its tokens enforced', () => {
    const brands = STORE_REGISTRY[store].officialBrands.length > 0 ? STORE_REGISTRY[store].officialBrands : SPEC_LISTED_BRANDS;
    const failures: string[] = [];
    for (const brand of brands) {
      const typed = `${brand} Cleaning Kit`;
      if (!classifyProductName(typed).protected) failures.push(`${brand}: not protected`);
      const whole = { site_name: store, slugs: [{ language: seoLangs[0], name: typed, slug: typed.toLowerCase().replace(/\W+/g, '-') }] };
      const dropped = { site_name: store, slugs: [{ language: seoLangs[0], name: `${brand} Kit`, slug: 'x' }] };
      if (checkNameSurfaces(typed, { slugs: whole }).some(i => i.path === 'slugs[0].name')) failures.push(`${brand}: whole name flagged`);
      if (!checkNameSurfaces(typed, { slugs: dropped }).some(i => i.path === 'slugs[0].name')) failures.push(`${brand}: dropped token not flagged`);
    }
    expect(failures).toEqual([]);
  });

  it('a generic Fixture C is exempt on this store whatever the output looks like (AC-7)', () => {
    expect(checkNameSurfaces(FIXTURE_C, { slugs: shortenedSlugs(store), seo: shortenedSeo(store) })).toEqual([]);
    expect(checkDescriptionHtml(FIXTURE_C, '<p>Form Studio 1 Pro</p>', 'HTML (x)')).toEqual([]);
  });
});

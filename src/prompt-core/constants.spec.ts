/**
 * constants.spec.ts
 *
 * Regression guard for the pt-PT locale wiring in src/prompt-core/constants.ts:
 * STORE_REGISTRY, getLangsForStore, taskLangToIso, isoToHumanLang.
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import {
  getLangsForStore, taskLangToIso, isoToHumanLang, buildNativeLangOverlay, buildMasterUaOverlay,
  bcp47ToTaskCLang, EXPERT3D_TOV_TRANSLATION_OVERLAY, EXPERT3D_PT_LOCALE_TOV,
  EXPERT3D_ES_NATIVE_VOCAB_OVERLAY, EXPERT3D_UK_LOCALE_TOV,
  isCenter3dPrintStore, C3D_TOV_TRANSLATION_OVERLAY, C3D_UK_LOCALE_TOV, C3D_PL_LOCALE_TOV,
  C3D_TOV_BASE_OVERLAY,
  STORE_REGISTRY,
  resolveLocaleValue,
  getKillerSpecsHeaders, KILLER_SPECS_HEADERS,
} from './constants';

describe('getKillerSpecsHeaders — store-scoped §2 header override', () => {
  it('returns the impersonal pair only for Center 3D Print', () => {
    expect(getKillerSpecsHeaders('uk-UA', 'Center 3D Print')).toEqual(['Параметр', 'Практична користь']);
    expect(getKillerSpecsHeaders('uk-UA', 'Drukarka 3D')).toEqual(KILLER_SPECS_HEADERS['uk-ua']);
  });

  it('is identical to the base map for all seven other stores, in every locale', () => {
    for (const store of Object.keys(STORE_REGISTRY).filter(s => s !== 'Center 3D Print')) {
      for (const locale of Object.keys(KILLER_SPECS_HEADERS)) {
        expect(getKillerSpecsHeaders(locale, store), `${store}/${locale}`)
          .toEqual(KILLER_SPECS_HEADERS[locale]);
      }
    }
  });

  it('falls through to the base map for a locale C3D does not publish', () => {
    expect(getKillerSpecsHeaders('es-ES', 'Center 3D Print')).toEqual(KILLER_SPECS_HEADERS['es-es']);
  });

  /** table-finalize.ts depends on this undefined to trigger its document-derived fallback. */
  it('returns undefined for an unknown locale (exact-key, not resolveLocaleValue)', () => {
    expect(getKillerSpecsHeaders('xx-XX', 'Center 3D Print')).toBeUndefined();
    expect(getKillerSpecsHeaders('es-AR', '')).toBeUndefined();
  });

  it('is case-insensitive on the locale', () => {
    expect(getKillerSpecsHeaders('UK-UA', 'Center 3D Print')).toEqual(['Параметр', 'Практична користь']);
  });
});

describe('buildNativeLangOverlay', () => {
  it('EXPERT3D + PT includes the base ToV overlay and the PT locale overlay, not ES', () => {
    const overlay = buildNativeLangOverlay('PT', 'European Portuguese', 'EXPERT3D');
    expect(overlay).toContain(EXPERT3D_TOV_TRANSLATION_OVERLAY);
    expect(overlay).toContain(EXPERT3D_PT_LOCALE_TOV);
    expect(overlay).not.toContain(EXPERT3D_ES_NATIVE_VOCAB_OVERLAY);
  });

  it('EXPERT3D + ES includes the base ToV overlay and the ES vocabulary overlay, not PT', () => {
    const overlay = buildNativeLangOverlay('ES', 'Castilian Spanish', 'EXPERT3D');
    expect(overlay).toContain(EXPERT3D_TOV_TRANSLATION_OVERLAY);
    expect(overlay).toContain(EXPERT3D_ES_NATIVE_VOCAB_OVERLAY);
    expect(overlay).not.toContain(EXPERT3D_PT_LOCALE_TOV);
  });

  it('EXPERT3D + UA includes only the base ToV overlay, no PT/ES-specific text', () => {
    const overlay = buildNativeLangOverlay('UA', 'Ukrainian', 'EXPERT3D');
    expect(overlay).toContain(EXPERT3D_TOV_TRANSLATION_OVERLAY);
    expect(overlay).not.toContain(EXPERT3D_PT_LOCALE_TOV);
    expect(overlay).not.toContain(EXPERT3D_ES_NATIVE_VOCAB_OVERLAY);
  });

  it('non-EXPERT3D store gets only the generic image-caption note, no EXPERT3D overlays', () => {
    const overlay = buildNativeLangOverlay('RU', 'Russian', '3DDevice');
    expect(overlay).toContain('NATIVE RUSSIAN OUTPUT');
    expect(overlay).not.toContain(EXPERT3D_TOV_TRANSLATION_OVERLAY);
    expect(overlay).not.toContain(EXPERT3D_PT_LOCALE_TOV);
    expect(overlay).not.toContain(EXPERT3D_ES_NATIVE_VOCAB_OVERLAY);
  });
});

/**
 * Center 3D Print "Style B" ToV — isolation guard.
 *
 * The point of these tests is NOT that C3D gets the voice (one test), it is that NOTHING ELSE
 * does (the rest). Drukarka 3D is the critical case: it shares group 'EU' with Center 3D Print,
 * so a group-based predicate would silently leak Style B into its output.
 */
describe('Center 3D Print ToV — store scoping', () => {
  const OTHER_STORES = Object.keys(STORE_REGISTRY).filter(n => n !== 'Center 3D Print');

  it('isCenter3dPrintStore matches only the Center 3D Print registry key', () => {
    expect(isCenter3dPrintStore('Center 3D Print')).toBe(true);
    for (const store of OTHER_STORES) {
      expect(isCenter3dPrintStore(store)).toBe(false);
    }
  });

  it('Drukarka 3D shares group "EU" with Center 3D Print — the reason the gate is name-based', () => {
    expect(STORE_REGISTRY['Drukarka 3D'].group).toBe('EU');
    expect(STORE_REGISTRY['Center 3D Print'].group).toBe('EU');
    expect(isCenter3dPrintStore('Drukarka 3D')).toBe(false);
  });

  it('buildMasterUaOverlay for C3D includes the uk-UA Style B lexicon and no EXPERT3D text', () => {
    const overlay = buildMasterUaOverlay('Center 3D Print');
    expect(overlay).toContain(C3D_UK_LOCALE_TOV);
    expect(overlay).not.toContain(EXPERT3D_UK_LOCALE_TOV);
  });

  it('buildNativeLangOverlay for C3D + PL includes the translation overlay and the PL locale ToV', () => {
    const overlay = buildNativeLangOverlay('PL', 'Polish', 'Center 3D Print');
    expect(overlay).toContain(C3D_TOV_TRANSLATION_OVERLAY);
    expect(overlay).toContain(C3D_PL_LOCALE_TOV);
  });

  it('buildNativeLangOverlay for C3D + DE includes the translation overlay but not the PL locale ToV', () => {
    const overlay = buildNativeLangOverlay('DE', 'German', 'Center 3D Print');
    expect(overlay).toContain(C3D_TOV_TRANSLATION_OVERLAY);
    expect(overlay).not.toContain(C3D_PL_LOCALE_TOV);
  });

  it('C3D never receives EXPERT3D overlays (the two ToVs are mutually exclusive)', () => {
    const overlay = buildNativeLangOverlay('PL', 'Polish', 'Center 3D Print');
    expect(overlay).not.toContain(EXPERT3D_TOV_TRANSLATION_OVERLAY);
    expect(overlay).not.toContain(EXPERT3D_PT_LOCALE_TOV);
  });

  it('EXPERT3D never receives C3D overlays', () => {
    const overlay = buildNativeLangOverlay('ES', 'Castilian Spanish', 'EXPERT3D');
    expect(overlay).not.toContain(C3D_TOV_TRANSLATION_OVERLAY);
    expect(overlay).not.toContain(C3D_PL_LOCALE_TOV);
    expect(buildMasterUaOverlay('EXPERT3D')).not.toContain(C3D_UK_LOCALE_TOV);
  });

  /**
   * Regression: the Ortur H20 §7 collapse (2026-07-26). SIGNATURE MOVE #2 banned nominal headings
   * without scoping the ban to <h2>, so the model stopped emitting §7/§3 <h3> sub-headings
   * entirely — 0 <h3> in the C3D artifact vs 13 in EXPERT3D's.
   */
  it('the base overlay scopes the nominal-heading ban to section headings only', () => {
    expect(C3D_TOV_BASE_OVERLAY).toContain('SECTION HEADINGS ONLY');
    expect(C3D_TOV_BASE_OVERLAY).toMatch(/<h3>\) in the specifications section \(§7\)/);
    expect(C3D_TOV_BASE_OVERLAY).toMatch(/MUST be CONCISE NOMINAL PHRASES/);
  });

  it('the base overlay carries the flat-source grouping instruction', () => {
    expect(C3D_TOV_BASE_OVERLAY).toMatch(/group it into 3-6 §7 categories of AT\s+LEAST 3 rows/);
    expect(C3D_TOV_BASE_OVERLAY).toMatch(/naming every category in the target output language/i);
  });

  it('the base overlay self-check cannot re-teach the over-generalization', () => {
    // The old checklist line ("H2s are functional/question-style, not bare nominal topics") stated
    // the ban a second time, unscoped — enough on its own to reproduce the bug.
    expect(C3D_TOV_BASE_OVERLAY).not.toMatch(/\[ \] H2s are functional\/question-style/);
    expect(C3D_TOV_BASE_OVERLAY).toMatch(/§7\/§3 <h3> sub-headings are\s+still present/);
  });

  it('the translation overlay exempts <h3> sub-headings too', () => {
    expect(C3D_TOV_TRANSLATION_OVERLAY).toContain('SECTION HEADINGS ONLY');
    expect(C3D_TOV_TRANSLATION_OVERLAY).toMatch(/are\s+EXEMPT/);
    expect(C3D_TOV_TRANSLATION_OVERLAY).toMatch(/never drop, merge or convert a spec category/i);
  });

  it('NO other store receives any C3D overlay — master or native path', () => {
    for (const store of OTHER_STORES) {
      expect(buildMasterUaOverlay(store)).not.toContain(C3D_UK_LOCALE_TOV);
      for (const lang of ['PL', 'DE', 'RU', 'European English']) {
        const overlay = buildNativeLangOverlay(lang, 'Polish', store);
        expect(overlay, `${store} / ${lang}`).not.toContain(C3D_TOV_TRANSLATION_OVERLAY);
        expect(overlay, `${store} / ${lang}`).not.toContain(C3D_PL_LOCALE_TOV);
      }
    }
  });
});

describe('pt-PT locale wiring', () => {
  it('getLangsForStore("EXPERT3D") includes pt-PT in seoLangs and European English/ES/PT in transLangs', () => {
    const { seoLangs, transLangs } = getLangsForStore('EXPERT3D');
    expect(seoLangs).toContain('pt-PT');
    expect(transLangs).toEqual(['European English', 'ES', 'PT']);
  });

  it('getLangsForStore("Impresora-3D") includes pt-PT in seoLangs and European English/ES/PT in transLangs', () => {
    const { seoLangs, transLangs } = getLangsForStore('Impresora-3D');
    expect(seoLangs).toContain('pt-PT');
    expect(transLangs).toEqual(['European English', 'ES', 'PT']);
  });

  it('taskLangToIso("PT", "EXPERT3D") resolves to "pt-PT"', () => {
    expect(taskLangToIso('PT', 'EXPERT3D')).toBe('pt-PT');
  });

  it('taskLangToIso("PT", "Impresora-3D") resolves to "pt-PT"', () => {
    expect(taskLangToIso('PT', 'Impresora-3D')).toBe('pt-PT');
  });

  it('isoToHumanLang("pt-PT") returns "European Portuguese"', () => {
    expect(isoToHumanLang('pt-PT')).toBe('European Portuguese');
  });
});

describe('uk-UA master locale wiring', () => {
  it('getLangsForStore("3DDevice") excludes uk-UA (master) and maps en-GB to European English', () => {
    const { transLangs } = getLangsForStore('3DDevice');
    expect(transLangs).toEqual(['European English', 'RU']);
  });

  it('getLangsForStore("Center 3D Print") excludes uk-UA (master) in registry order', () => {
    const { transLangs } = getLangsForStore('Center 3D Print');
    expect(transLangs).toEqual(['PL', 'European English', 'DE', 'RU']);
  });

  it('getLangsForStore("Drukarka 3D") excludes uk-UA (master), leaving only PL', () => {
    const { transLangs } = getLangsForStore('Drukarka 3D');
    expect(transLangs).toEqual(['PL']);
  });

  it('bcp47ToTaskCLang maps en-GB to "European English"', () => {
    expect(bcp47ToTaskCLang('en-GB', 'UA')).toBe('European English');
  });

  it('taskLangToIso("European English", "3DDevice") resolves to "en-GB"', () => {
    expect(taskLangToIso('European English', '3DDevice')).toBe('en-GB');
  });

  it('taskLangToIso("European English", "EXPERT3D") resolves to "en-ES"', () => {
    expect(taskLangToIso('European English', 'EXPERT3D')).toBe('en-ES');
  });
});

describe('resolveLocaleValue', () => {
  const map = { 'en-gb': 'English', 'es-es': 'Spanish', 'uk-ua': 'Ukrainian' };

  it('resolves an exact key match', () => {
    expect(resolveLocaleValue(map, 'es-es', 'FALLBACK')).toBe('Spanish');
  });

  it('is case-insensitive on the exact match', () => {
    expect(resolveLocaleValue(map, 'ES-ES', 'FALLBACK')).toBe('Spanish');
  });

  it('falls back to a same-base-language key when the exact code is missing', () => {
    expect(resolveLocaleValue(map, 'es-AR', 'FALLBACK')).toBe('Spanish');
  });

  it('does not let a short base language falsely match an unrelated key (hyphen-boundary check)', () => {
    // base 'e' must not match 'en-gb' — only a hyphen-bounded prefix counts.
    expect(resolveLocaleValue(map, 'e', 'FALLBACK')).toBe('FALLBACK');
  });

  it('falls back to the provided fallback when no key matches at all', () => {
    expect(resolveLocaleValue(map, 'xx-yy', 'FALLBACK')).toBe('FALLBACK');
  });
});

describe('buildMasterUaOverlay', () => {
  it('EXPERT3D store includes the uk-UA locale ToV overlay', () => {
    const overlay = buildMasterUaOverlay('EXPERT3D');
    expect(overlay).toContain('UKRAINIAN MASTER OUTPUT');
    expect(overlay).toContain(EXPERT3D_UK_LOCALE_TOV);
  });

  it('non-EXPERT3D store gets only the image-text-override note, no EXPERT3D overlay', () => {
    const overlay = buildMasterUaOverlay('3DDevice');
    expect(overlay).toContain('UKRAINIAN MASTER OUTPUT');
    expect(overlay).not.toContain(EXPERT3D_UK_LOCALE_TOV);
  });
});

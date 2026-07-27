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
  NUMERIC_SOURCE_FIDELITY_RULES, NUMBER_FORMAT_RULES,
  FUNCTIONAL_H2_OPENERS, MANDATED_NOMINAL_H2,
  SENTENCE_LENGTH_BANDS, SENTENCE_LENGTH_RULES,
} from './constants';
import { MASTER_SYSTEM_PROMPT } from './master-system-prompt';

describe('SENTENCE_LENGTH_BANDS mirrors SENTENCE_LENGTH_RULES', () => {
  // Rows read "- uk-UA / ru-UA:    8–12     12–16    9–14      20   (comment)".
  const rows = [...SENTENCE_LENGTH_RULES.matchAll(
    /^- ([a-z]{2}-[A-Z]{2}(?: \/ [a-z]{2}-[A-Z]{2})*):\s+(\S+)\s+(\S+)\s+(\S+)\s+(\d+)/gm,
  )];

  it('parses every locale row from the prose table', () => {
    expect(rows.length).toBeGreaterThanOrEqual(7);
  });

  it('every ceiling in the prose equals the ceiling in the map', () => {
    for (const [, locales, , , , ceiling] of rows) {
      for (const loc of locales.split(' / ')) {
        expect(SENTENCE_LENGTH_BANDS[loc.toLowerCase()]?.ceiling, loc).toBe(Number(ceiling));
      }
    }
  });

  it('every map key appears in the prose table', () => {
    const inProse = new Set(rows.flatMap(r => r[1].split(' / ').map(l => l.toLowerCase())));
    for (const key of Object.keys(SENTENCE_LENGTH_BANDS)) {
      expect(inProse, key).toContain(key);
    }
  });

  /** The C3D ToV document says 25; the stricter global figure is authoritative. */
  it('keeps uk-UA at the stricter 20, not the ToV document 25', () => {
    expect(SENTENCE_LENGTH_BANDS['uk-ua'].ceiling).toBe(20);
    expect(C3D_TOV_BASE_OVERLAY).not.toMatch(/ceiling of 25|стеля 25/);
  });
});

describe('NUMERIC_SOURCE_FIDELITY_RULES — global injection', () => {
  /**
   * The rule has no home of its own: master-system-prompt.ts owns the figure/alt/figcaption
   * rules but is FROZEN. It reaches the master by riding NUMBER_FORMAT_RULES, which the master
   * interpolates — so the frozen file stays byte-identical and arch-guard needs no rebaseline.
   */
  it('is composed into NUMBER_FORMAT_RULES, its carrier into the master prompt', () => {
    expect(NUMBER_FORMAT_RULES).toContain(NUMERIC_SOURCE_FIDELITY_RULES);
  });

  it('actually reaches MASTER_SYSTEM_PROMPT', () => {
    expect(MASTER_SYSTEM_PROMPT).toContain(NUMERIC_SOURCE_FIDELITY_RULES);
  });

  it('states the manifest-caption precedence carve-out, scoped to numbers only', () => {
    expect(NUMERIC_SOURCE_FIDELITY_RULES).toContain('PRECEDENCE OVER THE MANIFEST CAPTION');
    expect(NUMERIC_SOURCE_FIDELITY_RULES).toContain('FOR NUMBERS ONLY');
    // Must not overreach into the rest of the IMAGE GROUNDING LOCK.
    expect(NUMERIC_SOURCE_FIDELITY_RULES).toContain('IMAGE GROUNDING LOCK stands');
  });

  it('prescribes a qualitative fallback rather than a guessed figure', () => {
    expect(NUMERIC_SOURCE_FIDELITY_RULES).toContain('QUALITATIVELY');
    expect(NUMERIC_SOURCE_FIDELITY_RULES).toMatch(/an alt text with a plausible-looking wrong number is a factual error/i);
  });

  it('carries a self-check line', () => {
    expect(NUMERIC_SOURCE_FIDELITY_RULES).toContain('SELF-CHECK BEFORE OUTPUT');
    expect(NUMERIC_SOURCE_FIDELITY_RULES).toContain('[ ] Re-read every alt=');
  });
});

describe('Center 3D Print ToV — §3 functional H2s (OVERRIDE #7)', () => {
  const MASTER_S3_TEMPLATES = [
    'Technology / Operating principle', 'Construction & hardware',
    'Software & automation', 'Safety', 'Certification & compliance',
  ];

  it('names all five master §3 templates, so the override can bind to them', () => {
    for (const t of MASTER_S3_TEMPLATES) {
      expect(C3D_TOV_BASE_OVERLAY, t).toContain(t);
    }
  });

  /**
   * Anti-drift against the FROZEN master: if its §3 "Recommended H2 order" ever changes, this
   * fails loudly instead of leaving OVERRIDE #7 silently bound to strings that no longer exist.
   */
  it('the five templates it names are the five the master actually emits', () => {
    // The master wraps its §3 list across lines ("Technology / Operating\n   principle").
    const flatMaster = MASTER_SYSTEM_PROMPT.replace(/\s+/g, ' ');
    for (const t of MASTER_S3_TEMPLATES) {
      expect(flatMaster, t).toContain(t);
    }
  });

  it('scopes the override to <h2> and re-affirms nominal <h3>', () => {
    expect(C3D_TOV_BASE_OVERLAY).toContain('THIS OVERRIDE GOVERNS <h2> ONLY');
    expect(C3D_TOV_BASE_OVERLAY).toMatch(/§3's and §7's <h3> sub-headings stay CONCISE NOMINAL/);
  });

  it('forbids dropping a §3 topic to dodge a functional heading', () => {
    expect(C3D_TOV_BASE_OVERLAY).toMatch(/NEVER drop or merge a §3 topic/);
  });

  /**
   * The §7-collapse guard. An earlier UNSCOPED restatement of the heading ban made the model
   * generalize from <h2> to every heading level and stop emitting <h3> spec categories. The new
   * self-check line is scoped in the same sentence, and the old ban must stay banned.
   */
  it('the new self-check line cannot re-teach the over-generalization', () => {
    expect(C3D_TOV_BASE_OVERLAY).not.toMatch(/\[ \] H2s are functional\/question-style/);
    expect(C3D_TOV_BASE_OVERLAY).toMatch(/\[ \] Every §3 <h2> uses the OVERRIDE #7 functional form/);
    expect(C3D_TOV_BASE_OVERLAY).toMatch(/§3\/§7 <h3> stay nominal labels/);
  });

  it('the uk block drops the ambiguous noun-and-noun pattern and names the observed regressions', () => {
    expect(C3D_UK_LOCALE_TOV).toMatch(/«\[Функція\] та \[функція\]» БІЛЬШЕ НЕ Є зразком/);
    expect(C3D_UK_LOCALE_TOV).toContain('«Як працює [Product]»');
    expect(C3D_UK_LOCALE_TOV).toContain('«Яке ПЗ підтримує [Product]»');
    for (const bad of ['Лазерний модуль потужністю 20 Вт', 'ПЗ та автоматизація', 'Безпека під час\nроботи']) {
      expect(C3D_UK_LOCALE_TOV, bad).toContain(bad);
    }
  });

  it('the uk block keeps both carve-outs so §7 cannot collapse', () => {
    expect(C3D_UK_LOCALE_TOV).toContain('ВИНЯТОК 1 (<h3>)');
    expect(C3D_UK_LOCALE_TOV).toContain('ВИНЯТОК 2');
  });

  it('the pl block drops its equivalent ambiguous pattern', () => {
    expect(C3D_PL_LOCALE_TOV).toMatch(/«\[Funkcja\] i \[funkcja\]» NIE jest już dozwolony/);
    expect(C3D_PL_LOCALE_TOV).toContain('Jakie oprogramowanie obsługuje');
  });

  it('the translation overlay keeps §3 question headings from re-nominalizing', () => {
    expect(C3D_TOV_TRANSLATION_OVERLAY).toContain('Oprogramowanie i automatyzacja');
    expect(C3D_TOV_TRANSLATION_OVERLAY).toContain('Software und Automatisierung');
  });

  it('the heading constants are wired into the uk overlay, not duplicated as literals', () => {
    for (const opener of FUNCTIONAL_H2_OPENERS['uk-ua']) {
      expect(C3D_UK_LOCALE_TOV, opener).toContain(`«${opener} …»`);
    }
    for (const nominal of MANDATED_NOMINAL_H2['uk-ua']) {
      expect(C3D_UK_LOCALE_TOV, nominal).toContain(nominal);
    }
  });
});

describe('Center 3D Print ToV — §4 Applications list grammar', () => {
  /**
   * Regression: the §4 run-in-semicolon override produced a single 68-word <p> in the real Ortur
   * Laser Master 3 uk-UA artifact, against a uk-UA sentence ceiling of 20 — and the model kept
   * the banned colon labels inside it anyway. §4 now follows SIGNATURE MOVE #1 like every other
   * list, which removes the conflict entirely.
   */
  it('§4 is a verb-led <ul>, with the run-in semicolon form gone', () => {
    expect(C3D_TOV_BASE_OVERLAY).not.toMatch(/REPLACED by a run-in <p> list/);
    expect(C3D_TOV_BASE_OVERLAY).not.toMatch(/separated by SEMICOLONS/);
    expect(C3D_TOV_BASE_OVERLAY).toMatch(/1\. APPLICATIONS[\s\S]{0,600}SIGNATURE MOVE #1/);
    expect(C3D_TOV_BASE_OVERLAY).toContain('[ ] Applications is a verb-led <ul>');
  });

  it('keeps OVERRIDE #2 (the functional Applications H2) unchanged', () => {
    expect(C3D_TOV_BASE_OVERLAY).toContain('Where [Product] is used');
  });

  it('caps the bold opener rather than the whole <li>, so specs are not dropped', () => {
    expect(C3D_TOV_BASE_OVERLAY).toContain('BOLD OPENER LENGTH');
    expect(C3D_TOV_BASE_OVERLAY).toMatch(/AT MOST 10 WORDS/);
    expect(C3D_TOV_BASE_OVERLAY).toMatch(/Do NOT compress a whole <li> to fit/);
  });

  it('the uk-UA master overlay carries a §4 example, since uk fixes the shape for every locale', () => {
    expect(C3D_UK_LOCALE_TOV).toContain('ДЕ ЗАСТОСОВУЮТЬ');
    expect(C3D_UK_LOCALE_TOV).toContain('ЗАБОРОНЕНО');
  });

  it('the translation overlay names the re-nominalized §4 forms as BAD', () => {
    expect(C3D_TOV_TRANSLATION_OVERLAY).not.toMatch(/run-in semicolon <p> paragraph, KEEP/);
    expect(C3D_TOV_TRANSLATION_OVERLAY).toContain('Zastosowanie:');
    expect(C3D_TOV_TRANSLATION_OVERLAY).toContain('Anwendung:');
  });
});

describe('Center 3D Print ToV — consumables mode (§C)', () => {
  it('both overlays extend the voice into §C2/§C3/§C5', () => {
    expect(C3D_TOV_BASE_OVERLAY).toContain('CONSUMABLES MODE (§C1-§C6)');
    expect(C3D_TOV_TRANSLATION_OVERLAY).toContain('CONSUMABLES MODE (§C1-§C6)');
  });

  it('carries the 2500-character budget guard that caps supporting sentences at one', () => {
    expect(C3D_TOV_BASE_OVERLAY).toContain('BUDGET GUARD');
    expect(C3D_TOV_BASE_OVERLAY).toMatch(/EXACTLY ONE supporting sentence/);
  });

  /**
   * CONSUMABLES_SIMPLIFIED_SCHEMA and CONSUMABLES_TRANSLATION_OVERLAY are shared by all eight
   * stores, so the colon rule there must NOT be edited — the C3D overlays neutralize it for this
   * store only. Both overlays are wrapped prose, so compare on collapsed whitespace.
   */
  it('neutralizes the shared colon-capitalization rule without editing it', () => {
    // Sentence-initial in the base overlay, mid-sentence in the translation one — hence toLowerCase.
    const flat = (s: string) => s.replace(/\s+/g, ' ').toLowerCase();
    for (const overlay of [C3D_TOV_BASE_OVERLAY, C3D_TOV_TRANSLATION_OVERLAY]) {
      expect(flat(overlay)).toContain('do not reintroduce a colon in order to satisfy it');
    }
  });
});

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

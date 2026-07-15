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
} from './constants';

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

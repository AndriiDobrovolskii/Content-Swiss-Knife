/**
 * constants.spec.ts
 *
 * Regression guard for the pt-PT locale wiring in src/prompt-core/constants.ts:
 * STORE_REGISTRY, getLangsForStore, taskLangToIso, isoToHumanLang.
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { getLangsForStore, taskLangToIso, isoToHumanLang } from './constants';

describe('pt-PT locale wiring', () => {
  it('getLangsForStore("EXPERT3D") includes pt-PT in seoLangs and PT in transLangs', () => {
    const { seoLangs, transLangs } = getLangsForStore('EXPERT3D');
    expect(seoLangs).toContain('pt-PT');
    expect(transLangs).toEqual(['ES', 'PT', 'UA']);
  });

  it('getLangsForStore("Impresora-3D") includes pt-PT in seoLangs and PT in transLangs', () => {
    const { seoLangs, transLangs } = getLangsForStore('Impresora-3D');
    expect(seoLangs).toContain('pt-PT');
    expect(transLangs).toEqual(['ES', 'PT', 'UA']);
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

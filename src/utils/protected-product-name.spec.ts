/**
 * protected-product-name.spec.ts — US-7.1 T2 (FR-1, FR-11, AC-4 classifier half, AC-7 generic exemption).
 *
 * `protected-product-name.ts` does not exist yet; this suite is red at import time until so-builder
 * creates it (T2). Contract (plan D2, fixed by the plan, not invented here):
 *
 *   classifyProductName(typed: string): { protected: boolean; designators: string[] }
 *   SPEC_LISTED_BRANDS: string[]   // contains 'Formlabs' and 'Bambu Lab'
 *
 * The brand set is the UNION of every STORE_REGISTRY entry's `officialBrands` (derived at CALL time,
 * never copied) plus SPEC_LISTED_BRANDS. No store is named below: per-store behaviour is exercised by
 * iterating the registry (AC-4 / NFR-4).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { classifyProductName, SPEC_LISTED_BRANDS } from './protected-product-name';
import { STORE_REGISTRY } from '../prompt-core/constants';

const isProtected = (name: string) => classifyProductName(name).protected;

describe('classifyProductName — the Specification fixtures (FR-1)', () => {
  it('Fixture A "Formlabs Form Studio 1 Resin Tank Pro" is protected', () => {
    expect(isProtected('Formlabs Form Studio 1 Resin Tank Pro')).toBe(true);
  });

  it('Fixture A reports its designator tokens: the standalone integer and the suffix word', () => {
    const { designators } = classifyProductName('Formlabs Form Studio 1 Resin Tank Pro');
    expect(designators).toEqual(expect.arrayContaining(['1', 'Pro']));
  });

  it('Fixture B "Bambu Lab PLA Basic Filament 1.75 mm" is protected (brand only)', () => {
    expect(isProtected('Bambu Lab PLA Basic Filament 1.75 mm')).toBe(true);
  });

  it('Fixture B has a brand but no designator token (so FR-5 part 2 will not scan it)', () => {
    expect(classifyProductName('Bambu Lab PLA Basic Filament 1.75 mm').designators).toEqual([]);
  });

  it.each([
    'Hardened Steel Nozzle 0.4 mm',
    'With Spool',
    'Hardened Steel Nozzle',
  ])('Fixture C generic name "%s" is NOT protected', (name) => {
    const r = classifyProductName(name);
    expect(r.protected).toBe(false);
    expect(r.designators).toEqual([]);
  });
});

describe('classifyProductName — number and unit precedence (FR-1)', () => {
  it.each([
    'Hardened Steel Nozzle 0.4 mm',
    'Hardened Steel Nozzle 0.4mm',       // attached number+unit never makes a name protected
    'Hardened Steel Nozzle 4 mm',        // the integer is part of a number+unit span
    'Hardened Steel Nozzle 4mm',
    'PLA Filament 1 kg',
    'Laser Module 20 W',
    'Laser Module 20W',
  ])('a decimal or number+unit span alone leaves "%s" generic', (name) => {
    expect(isProtected(name)).toBe(false);
  });

  it('a standalone integer followed by a word (not a unit) is a designator: "Form Studio 1 Resin Tank"', () => {
    const r = classifyProductName('Form Studio 1 Resin Tank');
    expect(r.protected).toBe(true);
    expect(r.designators).toContain('1');
  });
});

describe('classifyProductName — rule (ii) letters+digits, the 3D exemption, tokens with no digit (FR-1)', () => {
  it.each([
    ['Hardened L2 Nozzle', 'L2'],
    ['Steel X1C Nozzle', 'X1C'],
    ['Carbon F10 Plate', 'F10'],
  ])('"%s" is protected through its letters+digits token %s', (name, token) => {
    const r = classifyProductName(name);
    expect(r.protected).toBe(true);
    expect(r.designators).toContain(token);
  });

  it('the token 3D is exempt: "3D Printer Cleaning Kit" is generic', () => {
    expect(isProtected('3D Printer Cleaning Kit')).toBe(false);
  });

  it('a token with no digit does not match rule (ii): "PLA+ Filament 1.75 mm" is generic', () => {
    expect(isProtected('PLA+ Filament 1.75 mm')).toBe(false);
  });
});

describe('classifyProductName — rule (iii) suffix words (FR-1)', () => {
  it.each(['Pro', 'Plus', 'Max', 'Mini', 'Lite', 'Ultra'])(
    'the suffix word %s after a capitalised name token makes the name protected',
    (word) => {
      const r = classifyProductName(`Hardened Nozzle ${word}`);
      expect(r.protected).toBe(true);
      expect(r.designators).toContain(word);
    },
  );

  it('a suffix word that follows nothing (it is the first token) does not make a name protected', () => {
    expect(isProtected('Pro Series Nozzle')).toBe(false);
  });

  it('a lower-case suffix word is not a name token: "hardened nozzle pro" is generic', () => {
    expect(isProtected('hardened nozzle pro')).toBe(false);
  });
});

describe('classifyProductName — brands (rule i): case-sensitive, whole-word, in order (FR-1)', () => {
  it('matches a single-word brand', () => {
    expect(isProtected('Formlabs Clear Resin')).toBe(true);
  });

  it('matches a multi-word brand only as its consecutive tokens, in that order', () => {
    expect(isProtected('Bambu Lab Nozzle')).toBe(true);
    expect(isProtected('Nozzle Bambu Lab')).toBe(true);
    expect(isProtected('Lab Bambu Nozzle')).toBe(false);
    expect(isProtected('Bambu Cleaning Lab Nozzle')).toBe(false);
  });

  it('matches case-sensitively as written', () => {
    expect(isProtected('formlabs clear resin')).toBe(false);
    expect(isProtected('FORMLABS Clear Resin')).toBe(false);
  });

  it('matches whole tokens only, not a substring of a longer word', () => {
    expect(isProtected('Formlabsy Clear Resin')).toBe(false);
  });

  it('SPEC_LISTED_BRANDS carries the brands the Specification names', () => {
    expect(SPEC_LISTED_BRANDS).toEqual(expect.arrayContaining(['Formlabs', 'Bambu Lab']));
  });
});

describe('classifyProductName — edge inputs (FR-1 failure path)', () => {
  it.each(['', '   ', '\t\n'])('classifies the empty or whitespace-only input %j as generic', (name) => {
    const r = classifyProductName(name);
    expect(r.protected).toBe(false);
    expect(r.designators).toEqual([]);
  });
});

describe('classifyProductName — brand set comes from STORE_REGISTRY, never from a copy (FR-1, FR-11, NFR-4)', () => {
  const addedKeys: string[] = [];
  afterEach(() => {
    for (const k of addedKeys.splice(0)) delete (STORE_REGISTRY as Record<string, unknown>)[k];
  });

  it('premise: the registry has stores with an empty officialBrands (the FR-11 gap) and stores with brands', () => {
    const profiles = Object.values(STORE_REGISTRY);
    expect(profiles.some(p => p.officialBrands.length === 0)).toBe(true);
    expect(profiles.some(p => p.officialBrands.length > 0)).toBe(true);
  });

  it('every official brand of every registry entry makes a name protected, whichever store it came from', () => {
    const failures: string[] = [];
    for (const [store, profile] of Object.entries(STORE_REGISTRY)) {
      for (const brand of profile.officialBrands) {
        if (!classifyProductName(`${brand} Cleaning Kit`).protected) failures.push(`${store}: ${brand}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('the result for a typed name does not depend on the store: the stores with empty officialBrands still protect the spec-listed brands', () => {
    const emptyStores = Object.entries(STORE_REGISTRY).filter(([, p]) => p.officialBrands.length === 0);
    expect(emptyStores.length).toBeGreaterThan(0);
    for (const brand of SPEC_LISTED_BRANDS) {
      expect(classifyProductName(`${brand} Cleaning Kit`).protected).toBe(true);
    }
    // ...and rules (ii)/(iii) alone, which need no brand list at all.
    expect(classifyProductName('Form Studio 1 Resin Tank Pro').protected).toBe(true);
  });

  it('derives the brand set at call time: a brand added to a registry entry afterwards is honoured', () => {
    expect(classifyProductName('Zorblaxium Cleaning Kit').protected).toBe(false);
    (STORE_REGISTRY as Record<string, unknown>)['__US-7.1 probe store__'] = {
      ...Object.values(STORE_REGISTRY)[0],
      officialBrands: ['Zorblaxium'],
    };
    addedKeys.push('__US-7.1 probe store__');
    expect(classifyProductName('Zorblaxium Cleaning Kit').protected).toBe(true);
  });
});

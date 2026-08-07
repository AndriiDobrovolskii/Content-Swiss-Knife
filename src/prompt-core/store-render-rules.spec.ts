/**
 * store-render-rules.spec.ts
 *
 * The rules object is a DERIVED VIEW over STORE_REGISTRY and the existing predicates, never a
 * second copy of them — CLAUDE.md makes the registry the single source of truth. Most of these
 * tests exist to prove the view cannot drift from what it derives from, because a stale copy of a
 * store's image base or language list would be invisible until it shipped a broken `<img src>`.
 */
import { describe, it, expect } from 'vitest';

import { getRenderRules, renderContextFor } from './store-render-rules';
import { STORE_REGISTRY, getKillerSpecsHeaders } from './constants';

const STORE_NAMES = Object.keys(STORE_REGISTRY);

describe('getRenderRules — derived, not copied', () => {
  it.each(STORE_NAMES)('%s reports the registry image base verbatim', name => {
    expect(getRenderRules(name).imageBaseUrl).toBe(STORE_REGISTRY[name].imageBaseUrl);
  });

  it.each(STORE_NAMES)('%s reports the registry language list verbatim', name => {
    expect(getRenderRules(name).locales).toEqual(STORE_REGISTRY[name].languages);
  });

  it.each(STORE_NAMES)('%s delegates header resolution rather than reimplementing it', name => {
    const rules = getRenderRules(name);
    for (const locale of STORE_REGISTRY[name].languages) {
      expect(rules.killerSpecsHeaders(locale)).toEqual(getKillerSpecsHeaders(locale, name));
    }
  });

  it('carries the store name through, so a RenderContext can be built from it alone', () => {
    expect(getRenderRules('EXPERT3D').storeName).toBe('EXPERT3D');
  });

  it('falls back to the registry default for an unknown store instead of throwing', () => {
    expect(() => getRenderRules('Not A Real Store')).not.toThrow();
    expect(getRenderRules('Not A Real Store').locales).toEqual(['en-GB']);
  });
});

describe('killerSpecsHeaders — the Center 3D Print ToV override', () => {
  it('gives Center 3D Print its Style B benefit header', () => {
    expect(getRenderRules('Center 3D Print').killerSpecsHeaders('uk-UA'))
      .toEqual(['Параметр', 'Практична користь']);
  });

  it('gives every other store the default benefit header', () => {
    expect(getRenderRules('EXPERT3D').killerSpecsHeaders('uk-UA'))
      .toEqual(['Параметр', 'Ваша перевага']);
  });

  /**
   * Drukarka 3D shares group 'EU' with Center 3D Print but keeps the DEFAULT voice. This is the
   * exact leak isCenter3dPrintStore's doc comment warns about — a group-based check would hand
   * Style B to this store.
   */
  it('does not leak Style B onto the other EU-group store', () => {
    expect(getRenderRules('Drukarka 3D').killerSpecsHeaders('pl-PL'))
      .toEqual(['Parametr', 'Twoja korzyść']);
  });

  /**
   * The `undefined` return is load-bearing, not an oversight: table-finalize.ts depends on it to
   * trigger the Optimizer fallback that reuses the header text the model already wrote. Papering
   * over it with an English default here would defeat that.
   */
  it('preserves the deliberate undefined for a locale no map covers', () => {
    expect(getRenderRules('EXPERT3D').killerSpecsHeaders('es-AR')).toBeUndefined();
  });

  /** Every store × every locale it actually publishes must resolve without hitting that path. */
  it.each(STORE_NAMES)('%s resolves a header pair for every locale it publishes', name => {
    const unresolved = STORE_REGISTRY[name].languages.filter(
      l => !getRenderRules(name).killerSpecsHeaders(l),
    );
    expect(unresolved).toEqual([]);
  });
});

describe('renderContextFor', () => {
  it('builds a context from the store plus the two per-product folders', () => {
    expect(renderContextFor('EXPERT3D', 'bambu-lab', 'p2s-combo')).toEqual({
      imageBaseUrl: 'https://impresora-3d.es/image/catalog/products/',
      brandFolder: 'bambu-lab',
      modelFolder: 'p2s-combo',
      storeName: 'EXPERT3D',
    });
  });

  it('omits the folders when they are not supplied', () => {
    const ctx = renderContextFor('3DDevice');
    expect(ctx.brandFolder).toBeUndefined();
    expect(ctx.modelFolder).toBeUndefined();
  });

  /**
   * Expert-3DPrinter ships `imageBaseUrl: ''` in the registry. figureSrc() concatenates the base
   * with the folders, so an empty base silently yields a RELATIVE `<img src>` — broken on a CMS
   * page served from any other path. Refusing is the honest behaviour until the real URL is known:
   * a loud failure beats shipping images that 404.
   */
  it('refuses a store whose registry entry has no image base, rather than emitting relative URLs', () => {
    expect(() => renderContextFor('Expert-3DPrinter', 'formlabs', 'fuse-1')).toThrow(/imageBaseUrl/i);
  });

  it('names the store in that error, so the fix is obvious', () => {
    expect(() => renderContextFor('Expert-3DPrinter')).toThrow(/Expert-3DPrinter/);
  });
});

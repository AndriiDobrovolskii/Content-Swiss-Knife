// @vitest-environment node
/**
 * US-10.1 T2 (server half) - the two real image entries exist in the shared catalogue and are invisible to text
 * resolution (FR-2, FR-4, SD-8, plan DD-2 / DD-3).
 *
 * PINNED CONTRACT: server/providers/model-support.js additionally exports IMAGE_MODELS (array of the image entries),
 * findImageModel(id), isImageModel(entry), resolveImageModel(id). The image entries are read from
 * src/prompt-core/model-catalog.json (the single source) and appended AFTER all existing Gemini entries.
 * Model ids are human-supplied and unverified (V-3); they are spelled once here and in the consistency spec (T14).
 */
import { describe, it, expect } from 'vitest';
import * as support from '../../server/providers/model-support.js';
import catalog from '../../src/prompt-core/model-catalog.json';

const mod = support as any;
const FLASH = 'gemini-3.1-flash-image';
const PRO = 'gemini-3-pro-image';
const gemini = (catalog as any).providers.find((p: any) => p.id === 'gemini');
const rawById = (id: string) => gemini.models.find((m: any) => m.id === id);

describe('image entries in model-catalog.json (FR-2, SD-8)', () => {
  it('FR-2: both image entries are present in the Gemini provider', () => {
    expect(rawById(FLASH)).toBeDefined();
    expect(rawById(PRO)).toBeDefined();
  });

  it('FR-2: both are appended AFTER every existing Gemini entry, so neither is models[0]', () => {
    const ids = gemini.models.map((m: any) => m.id);
    expect(ids[0]).toBe('gemini-3.1-pro-preview');
    expect(ids.indexOf(FLASH)).toBeGreaterThan(ids.indexOf('gemini-3.6-flash'));
    expect(ids.indexOf(PRO)).toBeGreaterThan(ids.indexOf('gemini-3.6-flash'));
    // Every non-image Gemini entry precedes every image entry.
    const lastText = Math.max(...gemini.models.map((m: any, i: number) => (m.modalities?.includes('image') ? -1 : i)));
    const firstImage = Math.min(...gemini.models.map((m: any, i: number) => (m.modalities?.includes('image') ? i : 999)));
    expect(firstImage).toBeGreaterThan(lastText);
  });

  it('FR-2 / SD-8: Flash carries modalities [image], tier fast, inputTokenLimit 131072, resolutions 1K and 2K', () => {
    const e = rawById(FLASH);
    expect(e.modalities).toEqual(['image']);
    expect(e.tier).toBe('fast');
    expect(e.inputTokenLimit).toBe(131072);
    expect(e.resolutions).toEqual(['1K', '2K']);
    expect(e.label).toContain('Nano Banana 2');
  });

  it('FR-2 / SD-8: Pro carries modalities [image], tier premium, inputTokenLimit 65536, resolutions 1K, 2K and 4K', () => {
    const e = rawById(PRO);
    expect(e.modalities).toEqual(['image']);
    expect(e.tier).toBe('premium');
    expect(e.inputTokenLimit).toBe(65536);
    expect(e.resolutions).toEqual(['1K', '2K', '4K']);
    expect(e.label).toContain('Nano Banana Pro');
  });

  it('FR-4 / SD-8: neither image entry carries levels, defaultLevel or maxOutputTokens', () => {
    for (const id of [FLASH, PRO]) {
      const e = rawById(id);
      expect(e, id).toBeDefined();
      expect(e, id).not.toHaveProperty('levels');
      expect(e, id).not.toHaveProperty('defaultLevel');
      expect(e, id).not.toHaveProperty('maxOutputTokens');
    }
  });

  it('FR-2: each image id appears exactly once in the catalogue (single source, no environment override)', () => {
    expect(gemini.models.filter((m: any) => m.id === FLASH)).toHaveLength(1);
    expect(gemini.models.filter((m: any) => m.id === PRO)).toHaveLength(1);
  });
});

describe('image entries on the server view (FR-3, plan DD-2)', () => {
  it('FR-2: IMAGE_MODELS lists exactly the two image entries', () => {
    expect(mod.IMAGE_MODELS.map((m: any) => m.id).sort()).toEqual([FLASH, PRO].sort());
  });

  it('FR-2: isImageModel is true for both real entries and findImageModel resolves them', () => {
    for (const id of [FLASH, PRO]) {
      expect(mod.isImageModel(rawById(id)), id).toBe(true);
      expect(mod.findImageModel(id).id).toBe(id);
    }
    expect(mod.findImageModel('gemini-3.1-pro-preview')).toBeUndefined();
    expect(mod.findImageModel('nope')).toBeUndefined();
  });

  it('FR-3: findModel never returns an image entry (a text request naming an image id sees "not found")', () => {
    expect(rawById(FLASH)).toBeDefined(); // premise: the entry exists in the raw catalogue
    expect(support.findModel('gemini', FLASH)).toBeUndefined();
    expect(support.findModel('gemini', PRO)).toBeUndefined();
  });

  it('FR-3: defaultModel(gemini) is unchanged by the appended entries', () => {
    expect(rawById(FLASH)).toBeDefined();
    expect((support.defaultModel('gemini') as any).id).toBe('gemini-3.1-pro-preview');
  });

  it('FR-3: resolveSlot never selects an image entry, by id or by tier fallback (both tiers)', () => {
    expect(rawById(PRO)).toBeDefined();
    for (const tier of ['premium', 'fast'] as const) {
      for (const requested of [FLASH, PRO, 'nope', undefined]) {
        const slot = support.resolveSlot('gemini', { model: requested as any }, tier);
        expect([FLASH, PRO], `${tier}/${requested}`).not.toContain(slot.model);
        expect(slot.maxOutputTokens).toBeGreaterThan(0);
        expect(typeof slot.level).toBe('string');
      }
    }
  });

  it('FR-3: clampLevel for an image id falls back to a text model and never throws', () => {
    expect(rawById(FLASH)).toBeDefined();
    expect(() => support.clampLevel('gemini', FLASH, 'high')).not.toThrow();
    const level = support.clampLevel('gemini', PRO, 'high');
    expect((support.defaultModel('gemini') as any).levels).toContain(level);
  });

  it('FR-3: resolveImageModel returns the entry for each real image id', () => {
    expect(mod.resolveImageModel(FLASH).id).toBe(FLASH);
    expect(mod.resolveImageModel(PRO).id).toBe(PRO);
    expect(mod.resolveImageModel(PRO).resolutions).toEqual(['1K', '2K', '4K']);
  });

  it('FR-3: resolveImageModel rejects a text id with 400 INVALID_REQUEST even when image entries exist', () => {
    expect(mod.resolveImageModel(FLASH).id).toBe(FLASH); // premise
    let err: any = null;
    try { mod.resolveImageModel('gemini-3.6-flash'); } catch (e) { err = e; }
    expect(err).not.toBeNull();
    expect(err.status).toBe(400);
    expect(err.code).toBe('INVALID_REQUEST');
  });

  it('FR-4: every text model of every provider still passes the catalogue invariants (levels non-empty, defaultLevel inside)', () => {
    for (const p of (catalog as any).providers) {
      for (const m of p.models.filter((x: any) => !x.modalities?.includes('image'))) {
        expect(m.levels.length, m.id).toBeGreaterThan(0);
        expect(m.levels, m.id).toContain(m.defaultLevel);
      }
    }
  });
});

// @vitest-environment node
/**
 * US-10.1 T1 - the server catalogue view is image-blind (FR-3, FR-4 server side, NFR-6, plan DD-2 / P-16).
 *
 * PINNED CONTRACT (server/providers/model-support.js):
 *   textModelsOf(entries)   pure; flat list of model entries in -> only entries whose `modalities` do NOT include
 *                           'image', original order kept. Applied once to the raw JSON list so findModel, defaultModel,
 *                           resolveSlot (and its tier fallback) and clampLevel never see an image entry.
 *   isImageModel(entry)     true when entry.modalities includes 'image'.
 *   resolveImageModel(id)   returns the image entry; for a text id or an unknown id it throws an error carrying
 *                           `.status === 400` and `.code === 'INVALID_REQUEST'` (FR-3 failure path).
 *
 * THE T1 ACCEPTANCE NUANCE. The real image entries only arrive in T2, so this spec never depends on them: it feeds
 * SYNTHETIC lists to `textModelsOf` (no module mock, plan P-16). "The lookups evaluated over it" is asserted at the data
 * level: element [0] of the derived list is what `defaultModel` returns (models[0]), a tier fallback
 * `find(m => m.tier === x)` over the derived list can never return an image entry, and every surviving entry has
 * non-empty `levels` (so clampLevel's `model.levels.includes` can never see an entry without them). The accepting half of
 * `resolveImageModel` (a real image id) is T2's `model-support.entries.spec.ts`.
 *
 * Tests labelled "baseline-guard" pass today and must keep passing: they pin the unchanged text behaviour. All other
 * tests fail until T1 lands.
 */
import { describe, it, expect } from 'vitest';
import * as support from '../../server/providers/model-support.js';

const mod = support as any;

const text = (id: string, tier: 'premium' | 'fast', over: Record<string, unknown> = {}) => ({
  id, label: id, tier, levels: ['low', 'medium', 'high'], defaultLevel: 'medium', maxOutputTokens: 1000, ...over,
});
const image = (id: string, tier: 'premium' | 'fast' = 'fast') => ({
  id, label: id, tier, modalities: ['image'], inputTokenLimit: 131072, resolutions: ['1K', '2K'],
});

describe('textModelsOf (synthetic lists, no JSON module mock)', () => {
  it('FR-3: drops an image entry and keeps the text entries in their original order', () => {
    const list = [text('t-a', 'premium'), image('img-1'), text('t-b', 'fast')];
    expect(mod.textModelsOf(list).map((m: any) => m.id)).toEqual(['t-a', 't-b']);
  });

  it('FR-3: an image entry listed FIRST does not become the default model (models[0])', () => {
    const list = [image('img-1'), text('t-a', 'premium'), text('t-b', 'fast')];
    const derived = mod.textModelsOf(list);
    expect(derived[0].id).toBe('t-a');
    expect(derived.map((m: any) => m.id)).toEqual(['t-a', 't-b']);
  });

  it('FR-3: reordering the raw list (image entries moved around) never changes the derived text list', () => {
    const base = [text('t-a', 'premium'), text('t-b', 'fast'), text('t-c', 'fast')];
    const imgs = [image('img-1', 'fast'), image('img-2', 'premium')];
    const variants = [
      [...imgs, ...base],
      [base[0], imgs[0], base[1], imgs[1], base[2]],
      [...base, ...imgs],
    ];
    for (const v of variants) {
      expect(mod.textModelsOf(v).map((m: any) => m.id)).toEqual(['t-a', 't-b', 't-c']);
    }
  });

  it('FR-3: the tier fallback of resolveSlot (find by tier) over the derived list never returns an image entry', () => {
    const list = [image('img-fast', 'fast'), image('img-premium', 'premium'), text('t-a', 'premium'), text('t-b', 'fast')];
    const derived = mod.textModelsOf(list);
    expect(derived.find((m: any) => m.tier === 'fast').id).toBe('t-b');
    expect(derived.find((m: any) => m.tier === 'premium').id).toBe('t-a');
  });

  it('FR-4: every surviving entry keeps non-empty levels and a defaultLevel inside them (clampLevel can never see an entry without levels)', () => {
    const list = [image('img-1'), text('t-a', 'premium'), image('img-2'), text('t-b', 'fast')];
    const derived = mod.textModelsOf(list);
    expect(derived).toHaveLength(2);
    for (const m of derived) {
      expect(m.levels.length).toBeGreaterThan(0);
      expect(m.levels).toContain(m.defaultLevel);
    }
  });

  it('FR-3: a list holding only image entries derives to an empty list, and an empty list stays empty', () => {
    expect(mod.textModelsOf([image('img-1'), image('img-2')])).toEqual([]);
    expect(mod.textModelsOf([])).toEqual([]);
  });

  it('FR-3: an entry without a `modalities` field is a text entry and survives', () => {
    const derived = mod.textModelsOf([text('t-a', 'premium')]);
    expect(derived.map((m: any) => m.id)).toEqual(['t-a']);
  });

  it('FR-3: a text entry that lists modalities without "image" (e.g. text + vision) survives', () => {
    const derived = mod.textModelsOf([text('t-a', 'premium', { modalities: ['text', 'vision'] }), image('img-1')]);
    expect(derived.map((m: any) => m.id)).toEqual(['t-a']);
  });

  it('FR-3: textModelsOf does not mutate its input', () => {
    const list = [image('img-1'), text('t-a', 'premium')];
    const copy = JSON.parse(JSON.stringify(list));
    mod.textModelsOf(list);
    expect(list).toEqual(copy);
  });
});

describe('isImageModel', () => {
  it('FR-2: is true for an entry whose modalities include image and false for text entries', () => {
    expect(mod.isImageModel(image('img-1'))).toBe(true);
    expect(mod.isImageModel(text('t-a', 'premium'))).toBe(false);
    expect(mod.isImageModel(text('t-a', 'premium', { modalities: ['text'] }))).toBe(false);
  });
});

describe('resolveImageModel (rejection half; the accepting half needs the real entries, T2)', () => {
  const rejection = (id: unknown) => {
    try { mod.resolveImageModel(id); } catch (e) { return e as any; }
    return null;
  };

  it('FR-3: a real TEXT model id is rejected with status 400 and code INVALID_REQUEST', () => {
    const err = rejection('gemini-3.1-pro-preview');
    expect(err).not.toBeNull();
    expect(err.status).toBe(400);
    expect(err.code).toBe('INVALID_REQUEST');
  });

  it('FR-3: an unknown model id is rejected with status 400 and code INVALID_REQUEST', () => {
    const err = rejection('no-such-model');
    expect(err).not.toBeNull();
    expect(err.status).toBe(400);
    expect(err.code).toBe('INVALID_REQUEST');
  });

  it('FR-3: a missing or non-string id is rejected the same way', () => {
    for (const bad of [undefined, null, 42, '']) {
      const err = rejection(bad);
      expect(err, String(bad)).not.toBeNull();
      expect(err.status).toBe(400);
      expect(err.code).toBe('INVALID_REQUEST');
    }
  });
});

describe('existing text resolution on the real catalogue (baseline-guard, NFR-6)', () => {
  it('baseline-guard: defaultModel(gemini) is still the first Gemini entry and is a text model with levels', () => {
    const d = support.defaultModel('gemini') as any;
    expect(d.id).toBe('gemini-3.1-pro-preview');
    expect(d.levels.length).toBeGreaterThan(0);
  });

  it('baseline-guard: findModel resolves a text id and returns undefined for an unknown id', () => {
    expect((support.findModel('gemini', 'gemini-3.6-flash') as any).id).toBe('gemini-3.6-flash');
    expect(support.findModel('gemini', 'nope')).toBeUndefined();
  });

  it('baseline-guard: resolveSlot falls back by tier for an unknown model (premium and fast)', () => {
    expect(support.resolveSlot('gemini', { model: 'nope' }, 'premium').model).toBe('gemini-3.1-pro-preview');
    const fast = support.resolveSlot('gemini', { model: 'nope' }, 'fast');
    expect(['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash']).toContain(fast.model);
    expect((support.findModel('gemini', fast.model) as any).tier).toBe('fast');
  });

  it('baseline-guard: clampLevel snaps onto a level the model accepts and never throws for an unknown model id', () => {
    expect(support.clampLevel('gemini', 'gemini-3.6-flash', 'minimal')).toBe('minimal');
    expect((support.findModel('gemini', 'gemini-3.1-pro-preview') as any).levels).toContain(
      support.clampLevel('gemini', 'gemini-3.1-pro-preview', 'minimal'),
    );
    expect(() => support.clampLevel('gemini', 'not-a-model', 'high')).not.toThrow();
  });

  it('FR-3: a text request that names an image-model id takes the existing fallback (the id is "not found" for text paths)', () => {
    // The real image ids are added in T2; resolveSlot must already treat any unknown id, image or not, as a fallback.
    const slot = support.resolveSlot('gemini', { model: 'gemini-3.1-flash-image' }, 'premium');
    expect(slot.model).toBe('gemini-3.1-pro-preview');
    expect(slot.maxOutputTokens).toBeGreaterThan(0);
  });
});

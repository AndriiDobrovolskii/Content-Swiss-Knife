// @vitest-environment node
/**
 * image-model-consistency.spec.ts - US-10.1 T14 (FR-2, FR-70; plan R4, DD-2).
 *
 * The image model ids are spelled in four places (plan DD-2): the shared catalogue (source), IMAGE_PRICES keys, the preset
 * defaults in prompt-presets.ts, and tests. Check V-3 may correct an id; this spec makes that correction atomic - it fails
 * loudly until the catalogue, the price keys and the preset defaults ALL agree (FR-2 failure path).
 *
 * Contract used (other specs pin it): IMAGE_PRICES from server/usage/pricing.js; PROMPT_PRESETS[].defaults.model from
 * src/prompt-core/prompt-presets.ts (CONTRACT.md); image catalogue entries are those whose `modalities` include 'image'.
 */
import { describe, it, expect } from 'vitest';
import * as pricing from '../../server/usage/pricing.js';
import catalog from '../../src/prompt-core/model-catalog.json';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);

const catalogImageIds = (): string[] => (catalog as any).providers.flatMap((pr: any) => pr.models)
  .filter((m: any) => (m.modalities ?? []).includes('image')).map((m: any) => m.id);

describe('image model ids agree across the catalogue, the price table and the presets', () => {
  it('FR-2: the catalogue holds exactly the two verified image ids, in the Gemini provider, after every text model', () => {
    expect(catalogImageIds().sort()).toEqual(['gemini-3-pro-image', 'gemini-3.1-flash-image']);
    const gemini = (catalog as any).providers.find((pr: any) => pr.id === 'gemini');
    const idx = gemini.models.map((m: any, i: number) => ((m.modalities ?? []).includes('image') ? i : -1)).filter((i: number) => i >= 0);
    expect(Math.min(...idx)).toBeGreaterThan(0); // neither is models[0]: the default text model is unchanged
    expect(gemini.models.slice(0, Math.min(...idx)).every((m: any) => !(m.modalities ?? []).includes('image'))).toBe(true);
  });

  it('FR-2 / FR-70: IMAGE_PRICES keys equal the catalogue image ids (a V-3 correction fails here until both agree)', () => {
    expect(catalogImageIds()).toHaveLength(2);
    expect(Object.keys((pricing as any).IMAGE_PRICES ?? {}).sort()).toEqual(catalogImageIds().sort());
  });

  it('FR-2 / FR-28: every preset default model is a catalogue image id with a price, and both models are used by some preset', async () => {
    const { PROMPT_PRESETS } = await load('../../src/prompt-core/prompt-presets');
    const ids = new Set(catalogImageIds());
    const used = new Set<string>();
    for (const preset of PROMPT_PRESETS) {
      expect(ids.has(preset.defaults.model), `${preset.id} -> ${preset.defaults.model}`).toBe(true);
      expect(Object.keys((pricing as any).IMAGE_PRICES ?? {})).toContain(preset.defaults.model);
      used.add(preset.defaults.model);
    }
    expect([...used].sort()).toEqual([...ids].sort());
  });

  it('FR-70: each image catalogue entry carries the shape of SD-8 and no text-model field (the price consistency is meaningless without it)', () => {
    const ids = catalogImageIds();
    expect(ids.length).toBeGreaterThanOrEqual(2);
    for (const pr of (catalog as any).providers) for (const m of pr.models) {
      if (!(m.modalities ?? []).includes('image')) continue;
      expect(m.inputTokenLimit, m.id).toBeGreaterThan(0);
      expect(m.levels, m.id).toBeUndefined();
      expect(m.defaultLevel, m.id).toBeUndefined();
      expect(m.maxOutputTokens, m.id).toBeUndefined();
    }
  });
});

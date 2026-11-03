/**
 * model-settings.image-blind.spec.ts - US-10.1 T2 (FR-3, FR-4, NFR-6, DD-2).
 *
 * The two Gemini image models are appended to the SHARED catalogue (FR-2). The model-settings service and
 * its menu are NOT edited by this Story (plan "Not modified"): they only ever see the text-only view, so
 * an image id must never be offered, selectable or restorable as a Deep/Fast text model.
 *
 * Every test first asserts the premise "the image entries exist in the raw JSON"; without that premise the
 * blindness assertions would pass vacuously on a tree that has no image entries yet (a green test against
 * unimplemented behaviour is a defect of this stage).
 *
 * Style of src/services/model-settings.service.spec.ts: the service reads localStorage in its constructor,
 * so each case seeds storage first. No TestBed, no Injector needed (the service has no inject()).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import rawCatalog from '../prompt-core/model-catalog.json';
import { ModelSettingsService } from './model-settings.service';

const KEY = 'seo_gen_model_settings';
const FLASH = 'gemini-3.1-flash-image';
const PRO = 'gemini-3-pro-image';

const rawGemini = (): any[] => (rawCatalog.providers as any[]).find(p => p.id === 'gemini').models;
const textGeminiIds = () => rawGemini().filter(m => !m.modalities?.includes('image')).map(m => m.id);
const premise = () => {
  const ids = rawGemini().map(m => m.id);
  expect(ids, 'premise: both image entries exist in the shared catalogue').toEqual(expect.arrayContaining([FLASH, PRO]));
};

function boot(stored?: unknown): ModelSettingsService {
  if (stored === undefined) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, JSON.stringify(stored));
  return new ModelSettingsService();
}

describe('ModelSettingsService is blind to image models (FR-3, FR-4, NFR-6)', () => {
  beforeEach(() => localStorage.clear());

  it('FR-3: setDeepModel(imageId) is a no-op - the Deep slot keeps its model and level, and nothing is persisted', () => {
    premise();
    const s = boot();
    s.setDeepProvider('gemini');
    const before = s.snapshot();
    const stored = localStorage.getItem(KEY);

    s.setDeepModel(FLASH);
    s.setDeepModel(PRO);

    expect(s.snapshot()).toEqual(before);
    expect(s.deepModel()).toBe('gemini-3.1-pro-preview');
    expect(localStorage.getItem(KEY)).toBe(stored);
  });

  it('FR-3: setFastModel(imageId) is a no-op - the Fast slot keeps its model and level', () => {
    premise();
    const s = boot();
    s.setFastProvider('gemini');
    const before = s.snapshot();

    s.setFastModel(FLASH);
    s.setFastModel(PRO);

    expect(s.snapshot()).toEqual(before);
    expect(s.fastModel()).toBe('gemini-3.8-flash');
  });

  it('FR-3: a stored image id in the Deep slot falls back to a premium TEXT model on restore()', () => {
    premise();
    const s = boot({
      deep: { provider: 'gemini', model: FLASH, level: 'high' },
      fast: { provider: 'gemini', model: 'gemini-3.8-flash', level: 'low' },
    });

    expect(s.deepModel()).not.toBe(FLASH);
    expect(textGeminiIds()).toContain(s.deepModel());
    expect(s.deepSpec()!.tier).toBe('premium');
    // and the level is one the fallback model accepts (no levels-less entry was ever consulted)
    expect(s.deepSpec()!.levels).toContain(s.deepLevel());
  });

  it('FR-3: a stored image id in the Fast slot falls back to a fast-tier TEXT model on restore()', () => {
    premise();
    const s = boot({
      deep: { provider: 'gemini', model: 'gemini-3.1-pro-preview', level: 'medium' },
      fast: { provider: 'gemini', model: PRO, level: 'low' },
    });

    expect(s.fastModel()).not.toBe(PRO);
    expect(textGeminiIds()).toContain(s.fastModel());
    expect(s.fastSpec()!.tier).toBe('fast');
    expect(s.fastSpec()!.levels).toContain(s.fastLevel());
  });

  it('FR-4: the Deep and Fast option lists equal the text-only Gemini list and contain no image id', () => {
    premise();
    const s = boot();
    s.setDeepProvider('gemini');
    s.setFastProvider('gemini');

    const expected = textGeminiIds();
    expect(s.deepModels().map(m => m.id)).toEqual(expected);
    expect(s.fastModels().map(m => m.id)).toEqual(expected);
    for (const m of [...s.deepModels(), ...s.fastModels()]) {
      expect(m.id).not.toBe(FLASH);
      expect(m.id).not.toBe(PRO);
      // every offered model still has the thinking fields the settings menu renders
      expect(m.levels.length).toBeGreaterThan(0);
      expect(m.levels).toContain(m.defaultLevel);
    }
  });

  it('NFR-6: the default configuration and the Anthropic option lists are unchanged by the new catalogue entries', () => {
    premise();
    const s = boot();
    expect(s.snapshot()).toEqual({
      deep: { provider: 'anthropic', model: 'claude-sonnet-5-5', level: 'high' },
      fast: { provider: 'gemini', model: 'gemini-3.8-flash', level: 'low' },
    });
    expect(s.deepModels().map(m => m.id)).toEqual(['claude-sonnet-5-5', 'claude-sonnet-5', 'claude-haiku-4-5']);
    expect(s.fastModels().map(m => m.id)).toEqual(textGeminiIds());
    expect(s.isDefault()).toBe(true);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModelSettingsService } from './model-settings.service';

const KEY = 'seo_gen_model_settings';

/** The service reads localStorage in its constructor, so each case seeds storage first. */
function boot(stored?: unknown): ModelSettingsService {
  if (stored === undefined) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, typeof stored === 'string' ? stored : JSON.stringify(stored));
  return new ModelSettingsService();
}

describe('ModelSettingsService defaults', () => {
  beforeEach(() => localStorage.clear());

  // What everyone who never opens the settings menu gets: judgment work on Claude, mechanical
  // work on Gemini. The mixed pair IS the shipped default, not something you have to assemble.
  it('ships the mixed Anthropic-deep / Gemini-fast configuration', () => {
    expect(boot().snapshot()).toEqual({
      deep: { provider: 'anthropic', model: 'claude-sonnet-5', level: 'medium' },
      fast: { provider: 'gemini', model: 'gemini-3.6-flash', level: 'minimal' },
    });
  });

  // 'minimal', not the catalog's defaultLevel of 'medium' — the Fast slot transcribes, it does
  // not reason, and this has to match FALLBACK_FAST in server/providers/gemini.js so a request
  // with settings and one without route identically.
  it('runs the fast slot at minimal thinking, not the catalog default', () => {
    expect(boot().fastLevel()).toBe('minimal');
  });

  it('reports the default config as default', () => {
    expect(boot().isDefault()).toBe(true);
  });
});

describe('ModelSettingsService mixed providers', () => {
  beforeEach(() => localStorage.clear());

  // The point of the feature: two providers in one run. The default already mixes them one
  // way, so this drives the inverted pair to prove neither direction is special-cased.
  it('runs the two slots on different providers, either way round', () => {
    const s = boot();
    s.setDeepProvider('gemini');
    s.setFastProvider('anthropic');

    expect(s.snapshot()).toEqual({
      deep: { provider: 'gemini', model: 'gemini-3.1-pro-preview', level: 'medium' },
      fast: { provider: 'anthropic', model: 'claude-haiku-4-5', level: 'disabled' },
    });
  });

  it('leaves the other slot untouched when one slot switches provider', () => {
    const s = boot();
    s.setDeepModel('claude-sonnet-4-6');
    s.setFastProvider('gemini');

    expect(s.deepProvider()).toBe('anthropic');
    expect(s.deepModel()).toBe('claude-sonnet-4-6');
  });

  it('lands a provider switch on a model of the slot own tier', () => {
    const s = boot();
    s.setDeepProvider('gemini');
    s.setFastProvider('gemini');

    expect(s.deepModel()).toBe('gemini-3.1-pro-preview');
    expect(s.fastModel()).toBe('gemini-3.6-flash');
  });

  it('offers each slot only its own provider models', () => {
    const s = boot();
    s.setFastProvider('gemini');

    expect(s.deepModels().map(m => m.id)).toContain('claude-sonnet-5');
    expect(s.fastModels().map(m => m.id)).toEqual(['gemini-3.1-pro-preview', 'gemini-3.6-flash']);
  });

  it('ignores a model that does not belong to that slot provider', () => {
    const s = boot();
    s.setDeepModel('gemini-3.6-flash');
    expect(s.deepModel()).toBe('claude-sonnet-5');
  });

  it('ignores an unknown provider', () => {
    const s = boot();
    s.setDeepProvider('skynet' as never);
    expect(s.deepProvider()).toBe('anthropic');
  });
});

describe('ModelSettingsService persistence', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips a mixed-provider configuration', () => {
    const a = boot();
    a.setDeepProvider('gemini');
    a.setDeepModel('gemini-3.1-pro-preview');
    a.setDeepLevel('high');
    a.setFastProvider('anthropic');
    a.setFastLevel('disabled');

    expect(new ModelSettingsService().snapshot()).toEqual(a.snapshot());
  });

  it('restores nothing when storage is empty', () => {
    expect(boot().isDefault()).toBe(true);
  });

  it('ignores corrupt JSON rather than throwing', () => {
    expect(boot('{not json').isDefault()).toBe(true);
  });

  // Each slot falls back to ITS OWN default, which are no longer the same provider.
  it('falls back to defaults for an unknown provider', () => {
    const s = boot({ deep: { provider: 'skynet' }, fast: { provider: 'skynet' } });
    expect(s.deepProvider()).toBe('anthropic');
    expect(s.fastProvider()).toBe('gemini');
  });

  it('falls back to a catalog model when the stored model is gone', () => {
    const s = boot({
      deep: { provider: 'anthropic', model: 'claude-retired-9', level: 'high' },
      fast: { provider: 'anthropic', model: 'claude-haiku-4-5', level: 'disabled' },
    });
    expect(s.deepSpec()).toBeDefined();
    expect(s.deepLevel()).toBe('high');
  });

  // The scenario the catalog exists for: a level the newly-selected model cannot accept.
  it('clamps a stored level the model no longer accepts', () => {
    const s = boot({
      deep: { provider: 'gemini', model: 'gemini-3.1-pro-preview', level: 'minimal' },
      fast: { provider: 'gemini', model: 'gemini-3.6-flash', level: 'minimal' },
    });
    expect(s.deepLevel()).toBe('low');      // Pro has no 'minimal'
    expect(s.fastLevel()).toBe('minimal');  // Flash does
  });
});

describe('ModelSettingsService legacy storage', () => {
  beforeEach(() => localStorage.clear());

  // Written by the version that had one provider for both slots. Silently reverting such a
  // user to Anthropic would look like the settings menu forgot their choice.
  it('reads a single top-level provider as the provider of both slots', () => {
    const s = boot({
      provider: 'gemini',
      deep: { model: 'gemini-3.1-pro-preview', level: 'high' },
      fast: { model: 'gemini-3.6-flash', level: 'minimal' },
    });

    expect(s.snapshot()).toEqual({
      deep: { provider: 'gemini', model: 'gemini-3.1-pro-preview', level: 'high' },
      fast: { provider: 'gemini', model: 'gemini-3.6-flash', level: 'minimal' },
    });
  });

  it('falls back to defaults when the legacy provider is unknown', () => {
    const s = boot({ provider: 'skynet', deep: {}, fast: {} });
    expect(s.deepProvider()).toBe('anthropic');
    expect(s.deepModel()).toBe('claude-sonnet-5');
    expect(s.fastModel()).toBe('gemini-3.6-flash');
  });

  // A returning user configured all-Anthropic before the default went mixed. That is an
  // explicit choice and outranks the new default — moving their Fast slot to Gemini behind
  // their back would spend on a provider they never picked.
  it('keeps a stored all-Anthropic configuration instead of applying the new default', () => {
    const s = boot({
      provider: 'anthropic',
      deep: { model: 'claude-sonnet-5', level: 'medium' },
      fast: { model: 'claude-haiku-4-5', level: 'disabled' },
    });

    expect(s.snapshot()).toEqual({
      deep: { provider: 'anthropic', model: 'claude-sonnet-5', level: 'medium' },
      fast: { provider: 'anthropic', model: 'claude-haiku-4-5', level: 'disabled' },
    });
    expect(s.isDefault()).toBe(false);
  });

  // A per-slot provider is the newer, more specific statement of intent.
  it('prefers a per-slot provider over the legacy top-level one', () => {
    const s = boot({
      provider: 'gemini',
      deep: { provider: 'anthropic', model: 'claude-sonnet-5', level: 'medium' },
      fast: { model: 'gemini-3.6-flash', level: 'minimal' },
    });

    expect(s.deepProvider()).toBe('anthropic');
    expect(s.fastProvider()).toBe('gemini');
  });
});

describe('ModelSettingsService storage failures', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  // Incognito / quota-exhausted browsers throw here. A settings change must still apply for
  // the session — a persistence failure must never surface as an error mid-generation.
  it('keeps the in-memory settings correct when setItem throws', () => {
    const s = boot();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceeded'); });

    expect(() => s.setDeepProvider('gemini')).not.toThrow();
    expect(s.deepProvider()).toBe('gemini');
    expect(s.snapshot().deep.model).toBe('gemini-3.1-pro-preview');
  });

  it('falls back to defaults when getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('SecurityError'); });
    expect(new ModelSettingsService().isDefault()).toBe(true);
  });
});

describe('ModelSettingsService slot changes', () => {
  beforeEach(() => localStorage.clear());

  it('carries the level across a model change when the new model accepts it', () => {
    const s = boot();
    s.setFastProvider('gemini');
    s.setFastLevel('minimal');
    s.setFastModel('gemini-3.1-pro-preview');
    expect(s.fastLevel()).toBe('low'); // Pro has no minimal → nearest
    s.setFastModel('gemini-3.6-flash');
    expect(s.fastLevel()).toBe('low'); // Flash does have low → unchanged
  });

  it('reset() restores the defaults and clears storage', () => {
    const s = boot();
    s.setDeepProvider('gemini');
    s.setFastProvider('gemini');
    expect(localStorage.getItem(KEY)).not.toBeNull();

    s.reset();
    expect(s.isDefault()).toBe(true);
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

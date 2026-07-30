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

  // The one guarantee that matters for everyone who never opens the settings menu: the
  // pipeline must behave exactly as it did before runtime settings existed.
  it('reproduces the pre-settings Anthropic configuration', () => {
    expect(boot().snapshot()).toEqual({
      provider: 'anthropic',
      deep: { model: 'claude-sonnet-5', level: 'medium' },
      fast: { model: 'claude-haiku-4-5', level: 'disabled' },
    });
  });

  it('reports the default config as default', () => {
    expect(boot().isDefault()).toBe(true);
  });
});

describe('ModelSettingsService persistence', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips a Gemini configuration', () => {
    const a = boot();
    a.setProvider('gemini');
    a.setDeepModel('gemini-3.1-pro-preview');
    a.setDeepLevel('high');
    a.setFastModel('gemini-3.6-flash');
    a.setFastLevel('minimal');

    expect(new ModelSettingsService().snapshot()).toEqual(a.snapshot());
  });

  it('restores nothing when storage is empty', () => {
    expect(boot().isDefault()).toBe(true);
  });

  it('ignores corrupt JSON rather than throwing', () => {
    expect(boot('{not json').isDefault()).toBe(true);
  });

  it('falls back to defaults for an unknown provider', () => {
    expect(boot({ provider: 'skynet', deep: {}, fast: {} }).provider()).toBe('anthropic');
  });

  it('falls back to a catalog model when the stored model is gone', () => {
    const s = boot({
      provider: 'anthropic',
      deep: { model: 'claude-retired-9', level: 'high' },
      fast: { model: 'claude-haiku-4-5', level: 'disabled' },
    });
    expect(s.deepSpec()).toBeDefined();
    expect(s.deepLevel()).toBe('high');
  });

  // The scenario the catalog exists for: a level the newly-selected model cannot accept.
  it('clamps a stored level the model no longer accepts', () => {
    const s = boot({
      provider: 'gemini',
      deep: { model: 'gemini-3.1-pro-preview', level: 'minimal' },
      fast: { model: 'gemini-3.6-flash', level: 'minimal' },
    });
    expect(s.deepLevel()).toBe('low');      // Pro has no 'minimal'
    expect(s.fastLevel()).toBe('minimal');  // Flash does
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

    expect(() => s.setProvider('gemini')).not.toThrow();
    expect(s.provider()).toBe('gemini');
    expect(s.snapshot().deep.model).toBe('gemini-3.1-pro-preview');
  });

  it('falls back to defaults when getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('SecurityError'); });
    expect(new ModelSettingsService().isDefault()).toBe(true);
  });
});

describe('ModelSettingsService slot changes', () => {
  beforeEach(() => localStorage.clear());

  it('resets both slots when the provider changes', () => {
    const s = boot();
    s.setProvider('gemini');
    expect(s.snapshot()).toEqual({
      provider: 'gemini',
      deep: { model: 'gemini-3.1-pro-preview', level: 'medium' },
      fast: { model: 'gemini-3.6-flash', level: 'medium' },
    });
  });

  it('carries the level across a model change when the new model accepts it', () => {
    const s = boot();
    s.setProvider('gemini');
    s.setFastLevel('minimal');
    s.setFastModel('gemini-3.1-pro-preview');
    expect(s.fastLevel()).toBe('low'); // Pro has no minimal → nearest
    s.setFastModel('gemini-3.6-flash');
    expect(s.fastLevel()).toBe('low'); // Flash does have low → unchanged
  });

  it('ignores a model that does not belong to the current provider', () => {
    const s = boot();
    s.setDeepModel('gemini-3.6-flash');
    expect(s.deepModel()).toBe('claude-sonnet-5');
  });

  it('exposes only the current provider models', () => {
    const s = boot();
    expect(s.models().map(m => m.id)).toContain('claude-sonnet-5');
    s.setProvider('gemini');
    expect(s.models().map(m => m.id)).toEqual(['gemini-3.1-pro-preview', 'gemini-3.6-flash']);
  });

  it('reset() restores the defaults and clears storage', () => {
    const s = boot();
    s.setProvider('gemini');
    expect(localStorage.getItem(KEY)).not.toBeNull();

    s.reset();
    expect(s.isDefault()).toBe(true);
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

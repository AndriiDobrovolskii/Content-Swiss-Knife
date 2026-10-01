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
      deep: { provider: 'anthropic', model: 'claude-sonnet-5-5', level: 'high' },
      fast: { provider: 'gemini', model: 'gemini-3.8-flash', level: 'low' },
    });
  });

  // 'low', not the catalog's defaultLevel of 'high' (accepted as-is by the approver) — gemini-3.8-flash
  // has no 'minimal', and this has to match FALLBACK_FAST in server/providers/gemini.js so a
  // request with settings and one without route identically.
  it('runs the fast slot at low thinking, not the catalog default of high', () => {
    const s = boot();
    expect(s.fastLevel()).toBe('low');
    expect(s.fastSpec()!.defaultLevel).toBe('high');
    expect(s.fastSpec()!.levels).toContain(s.fastLevel());
  });

  it('FR-5: starts the deep slot at a level claude-sonnet-5-5 accepts', () => {
    const s = boot();
    expect(s.deepSpec()!.levels).toContain(s.deepLevel());
    expect(s.deepLevel()).toBe('high');
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
    s.setDeepModel('claude-sonnet-5');
    s.setFastProvider('gemini');

    expect(s.deepProvider()).toBe('anthropic');
    expect(s.deepModel()).toBe('claude-sonnet-5');
  });

  it('lands a provider switch on a model of the slot own tier', () => {
    const s = boot();
    s.setDeepProvider('gemini');
    s.setFastProvider('gemini');

    expect(s.deepModel()).toBe('gemini-3.1-pro-preview');
    expect(s.fastModel()).toBe('gemini-3.8-flash');
  });

  it('offers each slot only its own provider models', () => {
    const s = boot();
    s.setFastProvider('gemini');

    expect(s.deepModels().map(m => m.id)).toEqual(['claude-sonnet-5-5', 'claude-sonnet-5', 'claude-haiku-4-5']);
    expect(s.fastModels().map(m => m.id)).toEqual(['gemini-3.1-pro-preview', 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash']);
  });

  it('ignores a model that does not belong to that slot provider', () => {
    const s = boot();
    s.setDeepModel('gemini-3.6-flash');
    expect(s.deepModel()).toBe('claude-sonnet-5-5');
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
  // user to Anthropic would look like the settings menu forgot their choice. A stored 3.6 Flash
  // is no longer migrated (US-4.1 OD-3), so it stays as stored.
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
    expect(s.deepModel()).toBe('claude-sonnet-5-5');
    expect(s.fastModel()).toBe('gemini-3.8-flash');
  });

  // US-4.1 OD-3: the 3.6 -> 3.7 migration is gone. The only migration is claude-sonnet-4-6 ->
  // claude-sonnet-5-5 (see the US-4.1 describe below); every other stored model is left alone.
  it('no longer migrates a stored gemini-3.6-flash fast model', () => {
    const s = boot({
      deep: { provider: 'anthropic', model: 'claude-sonnet-5', level: 'medium' },
      fast: { provider: 'gemini', model: 'gemini-3.6-flash', level: 'low' },
    });

    expect(s.fastModel()).toBe('gemini-3.6-flash');
    expect(s.fastLevel()).toBe('low');
    expect(localStorage.getItem(KEY)).toContain('gemini-3.6-flash');
  });

  it('leaves a stored gemini-3.7-flash fast model untouched', () => {
    const s = boot({
      deep: { provider: 'anthropic', model: 'claude-sonnet-5', level: 'medium' },
      fast: { provider: 'gemini', model: 'gemini-3.7-flash', level: 'high' },
    });

    expect(s.fastModel()).toBe('gemini-3.7-flash');
    expect(s.fastLevel()).toBe('high');
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

/**
 * US-4.1 — FR-9: restore applies exactly one model migration, claude-sonnet-4-6 -> claude-sonnet-5-5,
 * and clamps the stored level into the target model's levels (FR-4). OD-3: nothing else migrates.
 */
describe('ModelSettingsService US-4.1 settings restore (FR-9)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  const stored = (deepModel: string, deepLevel: string, fast?: Record<string, unknown>) => ({
    deep: { provider: 'anthropic', model: deepModel, level: deepLevel },
    fast: fast ?? { provider: 'gemini', model: 'gemini-3.8-flash', level: 'low' },
  });

  it('moves a stored claude-sonnet-4-6 Deep slot onto claude-sonnet-5-5', () => {
    const s = boot(stored('claude-sonnet-4-6', 'medium'));
    expect(s.deepProvider()).toBe('anthropic');
    expect(s.deepModel()).toBe('claude-sonnet-5-5');
  });

  it('persists the corrected settings', () => {
    boot(stored('claude-sonnet-4-6', 'medium'));
    const persisted = JSON.parse(localStorage.getItem(KEY)!);
    expect(persisted.deep.model).toBe('claude-sonnet-5-5');
    expect(JSON.stringify(persisted)).not.toContain('claude-sonnet-4-6');
  });

  it('keeps a stored level the new model accepts (medium stays medium)', () => {
    const migrated = boot(stored('claude-sonnet-4-6', 'medium'));
    expect(migrated.deepModel()).toBe('claude-sonnet-5-5');
    expect(migrated.deepLevel()).toBe('medium');
    expect(boot(stored('claude-sonnet-4-6', 'high')).deepLevel()).toBe('high');
    expect(boot(stored('claude-sonnet-4-6', 'low')).deepLevel()).toBe('low');
  });

  // OQ-1, confirmed by the approver.
  it('clamps a stored disabled level to between_tools on the migrated model', () => {
    expect(boot(stored('claude-sonnet-4-6', 'disabled')).deepLevel()).toBe('between_tools');
  });

  it('clamps a stored minimal level to low on the migrated model', () => {
    expect(boot(stored('claude-sonnet-4-6', 'minimal')).deepLevel()).toBe('low');
  });

  it('migrates a claude-sonnet-4-6 selection in any slot, not only Deep', () => {
    const s = boot(stored('claude-sonnet-5', 'medium', { provider: 'anthropic', model: 'claude-sonnet-4-6', level: 'disabled' }));
    expect(s.fastProvider()).toBe('anthropic');
    expect(s.fastModel()).toBe('claude-sonnet-5-5');
    expect(s.fastLevel()).toBe('between_tools');
    expect(s.deepModel()).toBe('claude-sonnet-5');
  });

  it('migrates a claude-sonnet-4-6 selection stored in the legacy single-provider shape', () => {
    const s = boot({
      provider: 'anthropic',
      deep: { model: 'claude-sonnet-4-6', level: 'minimal' },
      fast: { model: 'claude-haiku-4-5', level: 'disabled' },
    });
    expect(s.deepModel()).toBe('claude-sonnet-5-5');
    expect(s.deepLevel()).toBe('low');
    expect(s.fastModel()).toBe('claude-haiku-4-5');
  });

  it('never leaves a model id that is absent from the catalog after migrating', () => {
    const s = boot(stored('claude-sonnet-4-6', 'xhigh'));
    expect(s.deepSpec()).toBeDefined();
    expect(s.deepSpec()!.levels).toContain(s.deepLevel());
    expect(s.deepLevel()).toBe('xhigh');
  });

  it('does not migrate a stored claude-sonnet-5, gemini-3.7-flash or gemini-3.6-flash selection', () => {
    const s = boot(stored('claude-sonnet-5', 'high', { provider: 'gemini', model: 'gemini-3.7-flash', level: 'minimal' }));
    expect(s.deepModel()).toBe('claude-sonnet-5');
    expect(s.fastModel()).toBe('gemini-3.7-flash');
    expect(s.fastLevel()).toBe('minimal');

    const t = boot(stored('claude-sonnet-5', 'medium', { provider: 'gemini', model: 'gemini-3.6-flash', level: 'minimal' }));
    expect(t.fastModel()).toBe('gemini-3.6-flash');
    expect(t.fastLevel()).toBe('minimal');
  });

  it('keeps a stored claude-sonnet-5-5 selection and its level untouched', () => {
    const s = boot(stored('claude-sonnet-5-5', 'max'));
    expect(s.deepModel()).toBe('claude-sonnet-5-5');
    expect(s.deepLevel()).toBe('max');
  });

  it('resolves an unknown stored model to a catalog model of the slot tier, never an absent id', () => {
    const s = boot(stored('claude-from-the-future', 'high', { provider: 'gemini', model: 'gemini-99', level: 'high' }));
    expect(s.deepModel()).toBe('claude-sonnet-5-5');
    expect(s.fastModel()).toBe('gemini-3.8-flash');
  });

  it('does not throw when persisting the migration fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceeded'); });
    let s!: ModelSettingsService;
    expect(() => { s = boot(stored('claude-sonnet-4-6', 'medium')); }).not.toThrow();
    expect(s.deepModel()).toBe('claude-sonnet-5-5');
  });

  it('clamps a level change on gemini-3.8-flash: minimal lands on low', () => {
    const s = boot();
    s.setFastLevel('minimal');
    expect(s.fastLevel()).toBe('low');
  });

  it('exposes the six Sonnet 5.5 levels as selectable deep levels', () => {
    const s = boot();
    for (const level of ['between_tools', 'low', 'medium', 'high', 'xhigh', 'max'] as const) {
      s.setDeepLevel(level as never);
      expect(s.deepLevel(), level).toBe(level);
    }
  });
});

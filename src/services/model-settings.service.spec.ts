import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModelSettingsService } from './model-settings.service';
import { MODEL_CATALOG } from '../prompt-core/model-catalog';

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
    s.setDeepModel('gemini-3.8-flash');
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
      // US-11.1 (FR-14, FR-15): a stored Gemini 3.6 Flash moves onto Gemini 3.8 Flash, which has no 'minimal' either.
      fast: { provider: 'gemini', model: 'gemini-3.6-flash', level: 'minimal' },
    });
    expect(s.deepLevel()).toBe('low');      // Pro has no 'minimal'
    expect(s.fastModel()).toBe('gemini-3.8-flash');
    expect(s.fastLevel()).toBe('low');      // neither does 3.8 Flash: the retired model's 'minimal' snaps to 'low'
  });
});

describe('ModelSettingsService legacy storage', () => {
  beforeEach(() => localStorage.clear());

  // Written by the version that had one provider for both slots. Silently reverting such a
  // user to Anthropic would look like the settings menu forgot their choice. A stored 3.6 Flash
  // (retired by US-11.1) keeps its provider and moves onto gemini-3.8-flash (FR-14).
  it('reads a single top-level provider as the provider of both slots', () => {
    const s = boot({
      provider: 'gemini',
      deep: { model: 'gemini-3.1-pro-preview', level: 'high' },
      fast: { model: 'gemini-3.6-flash', level: 'minimal' },
    });

    expect(s.snapshot()).toEqual({
      deep: { provider: 'gemini', model: 'gemini-3.1-pro-preview', level: 'high' },
      fast: { provider: 'gemini', model: 'gemini-3.8-flash', level: 'low' },
    });
  });

  it('falls back to defaults when the legacy provider is unknown', () => {
    const s = boot({ provider: 'skynet', deep: {}, fast: {} });
    expect(s.deepProvider()).toBe('anthropic');
    expect(s.deepModel()).toBe('claude-sonnet-5-5');
    expect(s.fastModel()).toBe('gemini-3.8-flash');
  });

  // US-11.1 inverts the US-4.1 OD-3 pair of cases that stood here ("no longer migrates a stored
  // gemini-3.6-flash fast model" / "leaves a stored gemini-3.7-flash fast model untouched"): both retired
  // Flash models now move onto gemini-3.8-flash on restore (FR-14), the level is kept when 3.8 Flash accepts
  // it (FR-15), and the corrected settings are written back (FR-16).
  it('migrates a stored gemini-3.6-flash fast model onto gemini-3.8-flash and persists it', () => {
    const s = boot({
      deep: { provider: 'anthropic', model: 'claude-sonnet-5', level: 'medium' },
      fast: { provider: 'gemini', model: 'gemini-3.6-flash', level: 'low' },
    });

    expect(s.fastModel()).toBe('gemini-3.8-flash');
    expect(s.fastLevel()).toBe('low');
    expect(localStorage.getItem(KEY)).toContain('gemini-3.8-flash');
    expect(localStorage.getItem(KEY)).not.toContain('gemini-3.6-flash');
  });

  it('migrates a stored gemini-3.7-flash fast model onto gemini-3.8-flash and keeps its high level', () => {
    const s = boot({
      deep: { provider: 'anthropic', model: 'claude-sonnet-5', level: 'medium' },
      fast: { provider: 'gemini', model: 'gemini-3.7-flash', level: 'high' },
    });

    expect(s.fastModel()).toBe('gemini-3.8-flash');
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
      fast: { model: 'gemini-3.8-flash', level: 'low' },
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
    s.setFastModel('gemini-3.8-flash');
    expect(s.fastLevel()).toBe('low'); // 3.8 Flash has low → unchanged
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

  // US-11.1 (FR-14, FR-17): a stored claude-sonnet-5 is still left alone; a stored gemini-3.7-flash or
  // gemini-3.6-flash Fast slot, which this case used to leave untouched, now moves onto gemini-3.8-flash.
  it('does not migrate a stored claude-sonnet-5 selection, and moves a stored gemini-3.7-flash or gemini-3.6-flash Fast slot onto gemini-3.8-flash', () => {
    const s = boot(stored('claude-sonnet-5', 'high', { provider: 'gemini', model: 'gemini-3.7-flash', level: 'minimal' }));
    expect(s.deepModel()).toBe('claude-sonnet-5');
    expect(s.fastModel()).toBe('gemini-3.8-flash');
    expect(s.fastLevel()).toBe('low');

    const t = boot(stored('claude-sonnet-5', 'medium', { provider: 'gemini', model: 'gemini-3.6-flash', level: 'minimal' }));
    expect(t.deepModel()).toBe('claude-sonnet-5');
    expect(t.fastModel()).toBe('gemini-3.8-flash');
    expect(t.fastLevel()).toBe('low');
  });

  it('keeps a stored claude-sonnet-5-5 selection and a level it lists untouched', () => {
    const s = boot(stored('claude-sonnet-5-5', 'xhigh'));
    expect(s.deepModel()).toBe('claude-sonnet-5-5');
    expect(s.deepLevel()).toBe('xhigh');
  });

  // D8' / FR-9: Sonnet 5.5 has no max; a stored max restores as xhigh (nearest listed level).
  it('restores a stored claude-sonnet-5-5 max level as xhigh', () => {
    const s = boot(stored('claude-sonnet-5-5', 'max'));
    expect(s.deepModel()).toBe('claude-sonnet-5-5');
    expect(s.deepLevel()).toBe('xhigh');
  });

  it('migrates a stored claude-sonnet-4-6 at max to claude-sonnet-5-5 at xhigh and persists it', () => {
    const s = boot(stored('claude-sonnet-4-6', 'max'));
    expect(s.deepModel()).toBe('claude-sonnet-5-5');
    expect(s.deepLevel()).toBe('xhigh');
    const persisted = JSON.parse(localStorage.getItem(KEY)!);
    expect(persisted.deep.model).toBe('claude-sonnet-5-5');
    expect(persisted.deep.level).toBe('xhigh');
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

  it('exposes the five Sonnet 5.5 levels as selectable deep levels', () => {
    const s = boot();
    expect(s.deepSpec()!.levels).toEqual(['between_tools', 'low', 'medium', 'high', 'xhigh']);
    for (const level of ['between_tools', 'low', 'medium', 'high', 'xhigh'] as const) {
      s.setDeepLevel(level as never);
      expect(s.deepLevel(), level).toBe(level);
    }
  });

  it('clamps setDeepLevel(max) on Sonnet 5.5 to xhigh', () => {
    const s = boot();
    s.setDeepLevel('max' as never);
    expect(s.deepLevel()).toBe('xhigh');
  });
});

/**
 * US-11.1 (T5) - restore moves a stored gemini-3.7-flash / gemini-3.6-flash slot onto gemini-3.8-flash
 * (FR-14..FR-17, AC-5, P-9a, P-9b). Written from the Specification and the approver's rulings, not from the
 * migration table the plan proposes.
 *
 * Binding rulings (docs/workflow/history.jsonl): P-9b = A, a migrated slot with NO stored level restores to
 * exactly `high` in each slot (asserted as `high`, never as `low` and never as mere membership of `levels`);
 * P-9a, the migration is for provider `gemini` only.
 *
 * The retired ids are literals here on purpose: this block exists to recognise them. The expectations name
 * gemini-3.8-flash and never a catalog-order outcome, so the later catalog reorder (T6) cannot turn them red.
 */
describe('ModelSettingsService US-11.1 retired Gemini Flash migration on restore (FR-14..FR-16, AC-5)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  const RETIRED = ['gemini-3.7-flash', 'gemini-3.6-flash'] as const;
  const current = { provider: 'gemini', model: 'gemini-3.8-flash', level: 'low' };
  const claude = { provider: 'anthropic', model: 'claude-sonnet-5', level: 'medium' };

  /** Stored payload with the retired id in the named slot and a healthy other slot. */
  const storedWith = (slot: 'deep' | 'fast', retired: string, level?: string) => {
    const retiredSlot = { provider: 'gemini', model: retired, ...(level === undefined ? {} : { level }) };
    return slot === 'deep' ? { deep: retiredSlot, fast: current } : { deep: claude, fast: retiredSlot };
  };
  const slotOf = (s: ModelSettingsService, slot: 'deep' | 'fast') =>
    slot === 'deep'
      ? { provider: s.deepProvider(), model: s.deepModel(), level: s.deepLevel() }
      : { provider: s.fastProvider(), model: s.fastModel(), level: s.fastLevel() };

  for (const slot of ['deep', 'fast'] as const) {
    for (const retired of RETIRED) {
      describe(`${slot} slot stored on ${retired}`, () => {
        it('restores as provider gemini / model gemini-3.8-flash', () => {
          const s = boot(storedWith(slot, retired, 'medium'));
          expect(slotOf(s, slot)).toEqual({ provider: 'gemini', model: 'gemini-3.8-flash', level: 'medium' });
        });

        it('turns a stored minimal into low, and keeps a stored low, medium or high', () => {
          expect(slotOf(boot(storedWith(slot, retired, 'minimal')), slot).level).toBe('low');
          for (const level of ['low', 'medium', 'high']) {
            expect(slotOf(boot(storedWith(slot, retired, level)), slot).level, level).toBe(level);
          }
        });

        // P-9b = A, approver ruling "P-9b A".
        it('restores to exactly high when no level was stored (P-9b = A)', () => {
          const s = boot(storedWith(slot, retired));
          expect(slotOf(s, slot)).toEqual({ provider: 'gemini', model: 'gemini-3.8-flash', level: 'high' });
        });

        it('persists the corrected settings, so the retired id is gone from storage', () => {
          boot(storedWith(slot, retired, 'minimal'));
          const persisted = JSON.parse(localStorage.getItem(KEY)!);
          expect(persisted[slot]).toEqual({ provider: 'gemini', model: 'gemini-3.8-flash', level: 'low' });
          expect(localStorage.getItem(KEY)).not.toContain(retired);
        });

        it('does not migrate again on a second restore, and writes nothing on it (FR-16)', () => {
          const first = boot(storedWith(slot, retired, 'minimal'));
          const afterFirst = first.snapshot();
          // Premise: the first restore really migrated, otherwise "no second migration" would hold vacuously.
          expect(afterFirst[slot].model, `${retired} must have been migrated by the first restore`).toBe('gemini-3.8-flash');
          const setItem = vi.spyOn(localStorage, 'setItem');

          const second = new ModelSettingsService();

          expect(second.snapshot()).toEqual(afterFirst);
          expect(setItem).not.toHaveBeenCalled();
        });

        it('never throws and never leaves a model id that is absent from the catalog, with a level the model accepts', () => {
          for (const level of [undefined, 'minimal', 'low', 'medium', 'high', 'xhigh', 'disabled', 'garbage']) {
            let s!: ModelSettingsService;
            expect(() => { s = boot(storedWith(slot, retired, level)); }, String(level)).not.toThrow();
            const spec = slot === 'deep' ? s.deepSpec() : s.fastSpec();
            expect(spec, `${retired} ${String(level)}`).toBeDefined();
            expect(spec!.levels, `${retired} ${String(level)}`).toContain(slotOf(s, slot).level);
          }
        });
      });
    }
  }

  it('leaves the other, healthy slot exactly as stored when only one slot is migrated', () => {
    const s = boot(storedWith('fast', 'gemini-3.7-flash', 'high'));
    expect(slotOf(s, 'deep')).toEqual(claude);
    const t = boot(storedWith('deep', 'gemini-3.6-flash', 'high'));
    expect(slotOf(t, 'fast')).toEqual(current);
  });

  it('migrates both slots in one restore and persists them once', () => {
    const setItem = vi.spyOn(localStorage, 'setItem');
    const s = boot({
      deep: { provider: 'gemini', model: 'gemini-3.6-flash', level: 'minimal' },
      fast: { provider: 'gemini', model: 'gemini-3.7-flash', level: 'high' },
    });
    expect(s.snapshot()).toEqual({
      deep: { provider: 'gemini', model: 'gemini-3.8-flash', level: 'low' },
      fast: { provider: 'gemini', model: 'gemini-3.8-flash', level: 'high' },
    });
    // boot() itself seeds storage once through setItem; the migration adds exactly one more write.
    expect(setItem.mock.calls.filter(([key]) => key === KEY)).toHaveLength(2);
  });

  describe('legacy payload with one top-level provider (FR-14)', () => {
    it('reads provider gemini from the top level and migrates a retired id in either slot', () => {
      for (const retired of RETIRED) {
        const s = boot({
          provider: 'gemini',
          deep: { model: retired, level: 'minimal' },
          fast: { model: retired, level: 'medium' },
        });
        expect(s.snapshot(), retired).toEqual({
          deep: { provider: 'gemini', model: 'gemini-3.8-flash', level: 'low' },
          fast: { provider: 'gemini', model: 'gemini-3.8-flash', level: 'medium' },
        });
      }
    });

    it('persists the corrected legacy payload once, in the per-slot shape', () => {
      boot({ provider: 'gemini', deep: { model: 'gemini-3.7-flash', level: 'high' }, fast: { model: 'gemini-3.6-flash', level: 'low' } });
      const persisted = JSON.parse(localStorage.getItem(KEY)!);
      expect(persisted.deep.model).toBe('gemini-3.8-flash');
      expect(persisted.fast.model).toBe('gemini-3.8-flash');
      expect(localStorage.getItem(KEY)).not.toMatch(/gemini-3\.[67]-flash/);
    });

    it('restores a retired id with no stored level to high (P-9b = A) under a top-level provider', () => {
      const s = boot({ provider: 'gemini', deep: { model: 'gemini-3.7-flash' }, fast: { model: 'gemini-3.6-flash' } });
      expect(s.deepLevel()).toBe('high');
      expect(s.fastLevel()).toBe('high');
    });
  });

  describe('provider gating (P-9a)', () => {
    // A retired Gemini id next to a non-gemini provider is an unknown id for that provider: it falls back by
    // tier as before, it is NOT moved onto a Gemini model, and nothing is written back for it.
    const premiumOfAnthropic = () => MODEL_CATALOG.find(p => p.id === 'anthropic')!.models.find(m => m.tier === 'premium')!.id;
    const fastOfAnthropic = () => MODEL_CATALOG.find(p => p.id === 'anthropic')!.models.find(m => m.tier === 'fast')!.id;

    it('leaves a retired Gemini id stored next to provider anthropic on the anthropic tier pick, with no spurious write', () => {
      for (const retired of RETIRED) {
        localStorage.clear();
        localStorage.setItem(KEY, JSON.stringify({
          deep: { provider: 'anthropic', model: retired, level: 'high' },
          fast: { provider: 'anthropic', model: retired, level: 'high' },
        }));
        const setItem = vi.spyOn(localStorage, 'setItem');

        const s = new ModelSettingsService();

        expect(s.deepProvider(), retired).toBe('anthropic');
        expect(s.deepModel(), retired).toBe(premiumOfAnthropic());
        expect(s.fastProvider(), retired).toBe('anthropic');
        expect(s.fastModel(), retired).toBe(fastOfAnthropic());
        expect(setItem, retired).not.toHaveBeenCalled();
        setItem.mockRestore();
      }
    });

    it('does the same for a retired id under a top-level legacy provider anthropic', () => {
      const s = boot({ provider: 'anthropic', deep: { model: 'gemini-3.7-flash', level: 'high' }, fast: { model: 'gemini-3.6-flash', level: 'high' } });
      expect(s.deepProvider()).toBe('anthropic');
      expect(s.fastProvider()).toBe('anthropic');
      expect(s.deepModel()).toBe(premiumOfAnthropic());
      expect(s.fastModel()).toBe(fastOfAnthropic());
    });
  });

  describe('untrusted stored ids', () => {
    // The stored model is browser storage, i.e. untrusted: an Object.prototype key must not read as a retired id.
    it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty'])(
      'a stored model %s does not count as a migration: nothing is written back and restore does not throw', (key) => {
        localStorage.setItem(KEY, JSON.stringify({
          deep: { provider: 'gemini', model: key, level: 'high' },
          fast: { provider: 'gemini', model: key, level: 'high' },
        }));
        const setItem = vi.spyOn(localStorage, 'setItem');

        let s!: ModelSettingsService;
        expect(() => { s = new ModelSettingsService(); }).not.toThrow();

        expect(setItem).not.toHaveBeenCalled();
        expect(s.deepSpec()).toBeDefined();
        expect(s.fastSpec()).toBeDefined();
      });
  });

  describe('the Sonnet 4.6 migration is unaffected (FR-17)', () => {
    it('still moves claude-sonnet-4-6 onto claude-sonnet-5-5 with the same level handling, alongside a Gemini migration', () => {
      const s = boot({
        deep: { provider: 'anthropic', model: 'claude-sonnet-4-6', level: 'disabled' },
        fast: { provider: 'gemini', model: 'gemini-3.7-flash', level: 'minimal' },
      });
      expect(s.snapshot()).toEqual({
        deep: { provider: 'anthropic', model: 'claude-sonnet-5-5', level: 'between_tools' },
        fast: { provider: 'gemini', model: 'gemini-3.8-flash', level: 'low' },
      });
      expect(localStorage.getItem(KEY)).not.toContain('claude-sonnet-4-6');
    });
  });
});

describe('ModelSettingsService US-11.1 defaults and reset (FR-18, AC-6)', () => {
  beforeEach(() => localStorage.clear());

  const DEFAULT_SNAPSHOT = {
    deep: { provider: 'anthropic', model: 'claude-sonnet-5-5', level: 'high' },
    fast: { provider: 'gemini', model: 'gemini-3.8-flash', level: 'low' },
  };

  it('with nothing stored, Deep is anthropic / claude-sonnet-5-5 at high and Fast is gemini / gemini-3.8-flash at low', () => {
    expect(boot().snapshot()).toEqual(DEFAULT_SNAPSHOT);
  });

  it('after Reset to defaults the same pair is back, whatever the user had chosen', () => {
    const s = boot();
    s.setDeepProvider('gemini');
    s.setFastProvider('anthropic');
    s.reset();
    expect(s.snapshot()).toEqual(DEFAULT_SNAPSHOT);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('both default models are in the catalog and each default level is a member of its model\'s levels', () => {
    const s = boot();
    expect(s.deepSpec(), 'default Deep model missing from the catalog').toBeDefined();
    expect(s.fastSpec(), 'default Fast model missing from the catalog').toBeDefined();
    expect(s.deepSpec()!.levels).toContain(s.deepLevel());
    expect(s.fastSpec()!.levels).toContain(s.fastLevel());
  });
});

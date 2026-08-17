import { describe, it, expect } from 'vitest';
import { MODEL_CATALOG, clampLevel, defaultModel, findModel, findProvider } from './model-catalog';
import * as serverSupport from '../../server/providers/model-support.js';

const ALL_MODELS = MODEL_CATALOG.flatMap(p => p.models.map(m => ({ provider: p.id, ...m })));

describe('model catalog integrity', () => {
  it('gives every model a defaultLevel it actually accepts', () => {
    for (const m of ALL_MODELS) {
      expect(m.levels, `${m.id} has no levels`).not.toHaveLength(0);
      expect(m.levels, `${m.id} defaultLevel not in levels`).toContain(m.defaultLevel);
    }
  });

  it('gives every model a positive output ceiling', () => {
    for (const m of ALL_MODELS) {
      expect(m.maxOutputTokens, `${m.id}`).toBeGreaterThan(0);
    }
  });

  it('keeps model ids unique within a provider', () => {
    for (const p of MODEL_CATALOG) {
      const ids = p.models.map(m => m.id);
      expect(new Set(ids).size, `duplicate model id in ${p.id}`).toBe(ids.length);
    }
  });

  it('offers each provider at least one fast-tier model for the Fast slot', () => {
    for (const p of MODEL_CATALOG) {
      expect(p.models.some(m => m.tier === 'fast'), `${p.id} has no fast-tier model`).toBe(true);
    }
  });

  // The whole point of the catalog: Gemini 3.1 Pro's API rejects 'minimal', so the settings
  // menu must never render it. Regression guard against someone "unifying" the level lists.
  it('excludes minimal from Gemini 3.1 Pro but keeps it on 3.6 and 3.7 Flash', () => {
    expect(findModel('gemini', 'gemini-3.1-pro-preview')!.levels).not.toContain('minimal');
    expect(findModel('gemini', 'gemini-3.6-flash')!.levels).toContain('minimal');
    expect(findModel('gemini', 'gemini-3.7-flash')!.levels).toContain('minimal');
  });

  // Gemini 3.1 Pro cannot turn thinking off at all.
  it('excludes disabled from every Gemini model', () => {
    for (const m of findProvider('gemini')!.models) {
      expect(m.levels, `${m.id}`).not.toContain('disabled');
    }
  });

  // Anthropic's API has no 'minimal' effort — only disabled/low/medium/high.
  it('excludes minimal from every Anthropic model', () => {
    for (const m of findProvider('anthropic')!.models) {
      expect(m.levels, `${m.id}`).not.toContain('minimal');
    }
  });
});

describe('catalog is one file, not two copies', () => {
  it('resolves the same models server-side as client-side', () => {
    for (const m of ALL_MODELS) {
      expect(serverSupport.findModel(m.provider, m.id)).toEqual(
        expect.objectContaining({ id: m.id, levels: m.levels, maxOutputTokens: m.maxOutputTokens }),
      );
    }
  });

  it('agrees on which providers exist', () => {
    for (const p of MODEL_CATALOG) expect(serverSupport.isKnownProvider(p.id)).toBe(true);
    expect(serverSupport.isKnownProvider('openai')).toBe(false);
    expect(serverSupport.isKnownProvider('nope')).toBe(false);
  });
});

describe('clampLevel', () => {
  it('passes through a level the model accepts', () => {
    expect(clampLevel('gemini', 'gemini-3.6-flash', 'minimal')).toBe('minimal');
    expect(clampLevel('gemini', 'gemini-3.7-flash', 'minimal')).toBe('minimal');
    expect(clampLevel('anthropic', 'claude-sonnet-5', 'high')).toBe('high');
  });

  // Switching Flash@minimal → Pro must land on Pro's cheapest level, preserving the user's
  // "as cheap as possible" intent rather than jumping to Pro's default of medium.
  it('snaps minimal to low on Gemini 3.1 Pro', () => {
    expect(clampLevel('gemini', 'gemini-3.1-pro-preview', 'minimal')).toBe('low');
  });

  it('snaps disabled to low on Gemini, which cannot turn thinking off', () => {
    expect(clampLevel('gemini', 'gemini-3.1-pro-preview', 'disabled')).toBe('low');
    expect(clampLevel('gemini', 'gemini-3.6-flash', 'disabled')).toBe('minimal');
  });

  // Tie between 'disabled' and 'low' resolves upward — never silently drop a user to no thinking.
  it('snaps minimal up to low on Anthropic rather than down to disabled', () => {
    expect(clampLevel('anthropic', 'claude-sonnet-5', 'minimal')).toBe('low');
  });

  it('collapses to the only level a single-level model has', () => {
    expect(clampLevel('anthropic', 'claude-haiku-4-5', 'high')).toBe('disabled');
  });

  it('falls back to the model default for garbage input', () => {
    expect(clampLevel('gemini', 'gemini-3.6-flash', 'turbo')).toBe('medium');
    expect(clampLevel('gemini', 'gemini-3.6-flash', undefined)).toBe('medium');
  });

  it('matches the server implementation on every level/model pair', () => {
    const probes = ['disabled', 'minimal', 'low', 'medium', 'high', 'bogus', undefined];
    for (const m of ALL_MODELS) {
      for (const probe of probes) {
        expect(clampLevel(m.provider, m.id, probe), `${m.id} / ${probe}`)
          .toBe(serverSupport.clampLevel(m.provider, m.id, probe));
      }
    }
  });
});

describe('resolveSlot (server-side request validation)', () => {
  it('accepts a valid slot unchanged', () => {
    expect(serverSupport.resolveSlot('gemini', { model: 'gemini-3.6-flash', level: 'minimal' }))
      .toEqual({ model: 'gemini-3.6-flash', level: 'minimal', maxOutputTokens: 65536 });
    expect(serverSupport.resolveSlot('gemini', { model: 'gemini-3.7-flash', level: 'minimal' }))
      .toEqual({ model: 'gemini-3.7-flash', level: 'minimal', maxOutputTokens: 65536 });
  });

  // A client on an older bundle must degrade, not break.
  it('falls back to a catalog model when the model is unknown', () => {
    const slot = serverSupport.resolveSlot('anthropic', { model: 'claude-from-the-future', level: 'high' });
    expect(slot.model).toBe(defaultModel('anthropic')!.id);
    expect(slot.level).toBe('high');
  });

  // Without a tier-aware fallback, a request carrying no settings would run the Fast slot on
  // the catalog's first entry — a premium model — and quietly translate on Sonnet.
  it('falls back to a fast-tier model for the fast slot', () => {
    expect(serverSupport.resolveSlot('anthropic', undefined, 'fast').model).toBe('claude-haiku-4-5');
    expect(serverSupport.resolveSlot('gemini', undefined, 'fast').model).toBe('gemini-3.7-flash');
  });

  it('falls back to a premium model for the deep slot', () => {
    expect(serverSupport.resolveSlot('anthropic', undefined, 'premium').model).toBe('claude-sonnet-5');
    expect(serverSupport.resolveSlot('gemini', undefined, 'premium').model).toBe('gemini-3.1-pro-preview');
  });

  it('clamps a level the model cannot do', () => {
    expect(serverSupport.resolveSlot('gemini', { model: 'gemini-3.1-pro-preview', level: 'minimal' }).level)
      .toBe('low');
  });

  it('uses the model default when no level is given', () => {
    expect(serverSupport.resolveSlot('anthropic', { model: 'claude-haiku-4-5' }).level).toBe('disabled');
  });

  it('survives an entirely absent slot', () => {
    const slot = serverSupport.resolveSlot('gemini', undefined);
    expect(slot.model).toBe(defaultModel('gemini')!.id);
    expect(slot.level).toBe(defaultModel('gemini')!.defaultLevel);
  });

  it('carries the model output ceiling through for the providers to use', () => {
    expect(serverSupport.resolveSlot('anthropic', { model: 'claude-haiku-4-5' }).maxOutputTokens).toBe(16000);
    expect(serverSupport.resolveSlot('anthropic', { model: 'claude-sonnet-5' }).maxOutputTokens).toBe(64000);
  });
});

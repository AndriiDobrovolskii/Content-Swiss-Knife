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
  it('excludes minimal from Gemini 3.1 Pro and 3.8 Flash but keeps it on 3.6 and 3.7 Flash', () => {
    expect(findModel('gemini', 'gemini-3.8-flash')!.levels).not.toContain('minimal');
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
    const probes = ['disabled', 'between_tools', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'bogus', undefined];
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
    expect(serverSupport.resolveSlot('gemini', undefined, 'fast').model).toBe('gemini-3.8-flash');
  });

  it('falls back to a premium model for the deep slot', () => {
    expect(serverSupport.resolveSlot('anthropic', undefined, 'premium').model).toBe('claude-sonnet-5-5');
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
    expect(serverSupport.resolveSlot('anthropic', { model: 'claude-sonnet-5-5' }).maxOutputTokens).toBe(128000);
  });
});

/**
 * US-4.1 — catalog content, written from FR-1..FR-4a, not from the implementation.
 * Exact-value assertions: the Specification fixes the vendor values, so a typo in the JSON must
 * fail here rather than ship.
 */
describe('US-4.1 catalog entries (FR-1, FR-2, FR-3)', () => {
  it('FR-1: lists claude-sonnet-5-5 as the premium first anthropic model with exactly the five Sonnet 5.5 levels (no max)', () => {
    const m = findModel('anthropic', 'claude-sonnet-5-5');
    expect(m, 'claude-sonnet-5-5 missing from catalog').toBeDefined();
    expect(m!.tier).toBe('premium');
    expect(m!.levels).toEqual(['between_tools', 'low', 'medium', 'high', 'xhigh']);
    expect(m!.levels).not.toContain('max');
    expect(m!.defaultLevel).toBe('high');
    expect(m!.maxOutputTokens).toBe(128000);
    expect(findProvider('anthropic')!.models[0].id).toBe('claude-sonnet-5-5');
    expect(defaultModel('anthropic')!.id).toBe('claude-sonnet-5-5');
  });

  it('FR-2: lists gemini-3.8-flash as the first fast gemini model with low/medium/high and no minimal', () => {
    const m = findModel('gemini', 'gemini-3.8-flash');
    expect(m, 'gemini-3.8-flash missing from catalog').toBeDefined();
    expect(m!.tier).toBe('fast');
    expect(m!.levels).toEqual(['low', 'medium', 'high']);
    expect(m!.levels).not.toContain('minimal');
    expect(m!.defaultLevel).toBe('high');
    expect(m!.maxOutputTokens).toBe(65536);

    const fastIds = findProvider('gemini')!.models.filter(x => x.tier === 'fast').map(x => x.id);
    expect(fastIds[0]).toBe('gemini-3.8-flash');
  });

  it('FR-3: no longer contains claude-sonnet-4-6', () => {
    expect(findModel('anthropic', 'claude-sonnet-4-6')).toBeUndefined();
    expect(findProvider('anthropic')!.models.map(x => x.id)).not.toContain('claude-sonnet-4-6');
    expect(serverSupport.findModel('anthropic', 'claude-sonnet-4-6')).toBeUndefined();
  });

  it('FR-3: keeps the other models selectable with their existing values', () => {
    expect(findModel('anthropic', 'claude-sonnet-5')).toEqual(expect.objectContaining({
      tier: 'premium', levels: ['disabled', 'low', 'medium', 'high'], defaultLevel: 'medium', maxOutputTokens: 64000,
    }));
    expect(findModel('anthropic', 'claude-haiku-4-5')).toEqual(expect.objectContaining({
      tier: 'fast', levels: ['disabled'], defaultLevel: 'disabled', maxOutputTokens: 16000,
    }));
    expect(findModel('gemini', 'gemini-3.1-pro-preview')).toEqual(expect.objectContaining({
      tier: 'premium', levels: ['low', 'medium', 'high'], defaultLevel: 'medium', maxOutputTokens: 65536,
    }));
    for (const id of ['gemini-3.7-flash', 'gemini-3.6-flash']) {
      expect(findModel('gemini', id)).toEqual(expect.objectContaining({
        tier: 'fast', levels: ['minimal', 'low', 'medium', 'high'], defaultLevel: 'medium', maxOutputTokens: 65536,
      }));
    }
  });

  it('FR-5: tier fallbacks land on the new models by catalog position; gemini deep default unchanged', () => {
    expect(defaultModel('gemini')!.id).toBe('gemini-3.1-pro-preview');
    expect(serverSupport.resolveSlot('anthropic', undefined, 'premium').model).toBe('claude-sonnet-5-5');
    expect(serverSupport.resolveSlot('gemini', undefined, 'fast').model).toBe('gemini-3.8-flash');
  });
});

describe('US-4.1 clamp outcomes (FR-4, FR-4a)', () => {
  type Clamp = (p: string, m: string, l: unknown) => string;
  const both: Array<[string, Clamp]> = [
    ['client', clampLevel as Clamp],
    ['server', serverSupport.clampLevel as Clamp],
  ];

  // Approver-confirmed OQ-1 outcomes.
  it('FR-4: snaps disabled to between_tools on claude-sonnet-5-5', () => {
    for (const [name, clamp] of both) {
      expect(clamp('anthropic', 'claude-sonnet-5-5', 'disabled'), name).toBe('between_tools');
    }
  });

  it('FR-4: snaps minimal up to low on claude-sonnet-5-5 (tie resolves upward)', () => {
    expect(findModel('anthropic', 'claude-sonnet-5-5'), 'claude-sonnet-5-5 missing').toBeDefined();
    for (const [name, clamp] of both) {
      expect(clamp('anthropic', 'claude-sonnet-5-5', 'minimal'), name).toBe('low');
    }
  });

  it('FR-4: returns every one of the five claude-sonnet-5-5 levels unchanged', () => {
    for (const [name, clamp] of both) {
      for (const level of ['between_tools', 'low', 'medium', 'high', 'xhigh']) {
        expect(clamp('anthropic', 'claude-sonnet-5-5', level), `${name} ${level}`).toBe(level);
      }
    }
  });

  // D1'/OQ-2: max is not a Sonnet 5.5 level; it snaps down to the top rung.
  it('FR-4: snaps max to xhigh on claude-sonnet-5-5 on client and server', () => {
    for (const [name, clamp] of both) {
      expect(clamp('anthropic', 'claude-sonnet-5-5', 'max'), name).toBe('xhigh');
    }
  });

  it('FR-4: resolves an unknown level to the model default on claude-sonnet-5-5', () => {
    for (const [name, clamp] of both) {
      expect(clamp('anthropic', 'claude-sonnet-5-5', 'turbo'), name).toBe('high');
      expect(clamp('anthropic', 'claude-sonnet-5-5', undefined), name).toBe('high');
    }
  });

  it('FR-4 / FR-8: snaps minimal and disabled to low on gemini-3.8-flash', () => {
    expect(findModel('gemini', 'gemini-3.8-flash'), 'gemini-3.8-flash missing').toBeDefined();
    for (const [name, clamp] of both) {
      expect(clamp('gemini', 'gemini-3.8-flash', 'minimal'), name).toBe('low');
      expect(clamp('gemini', 'gemini-3.8-flash', 'disabled'), name).toBe('low');
    }
  });

  it('FR-4: keeps the existing outcomes on the other catalog models', () => {
    for (const [name, clamp] of both) {
      expect(clamp('gemini', 'gemini-3.6-flash', 'disabled'), name).toBe('minimal');
      expect(clamp('gemini', 'gemini-3.7-flash', 'disabled'), name).toBe('minimal');
      expect(clamp('gemini', 'gemini-3.1-pro-preview', 'minimal'), name).toBe('low');
      expect(clamp('anthropic', 'claude-sonnet-5', 'minimal'), name).toBe('low');
      expect(clamp('anthropic', 'claude-haiku-4-5', 'xhigh'), name).toBe('disabled');
      expect(clamp('anthropic', 'claude-haiku-4-5', 'max'), name).toBe('disabled');
      expect(clamp('anthropic', 'claude-haiku-4-5', 'between_tools'), name).toBe('disabled');
      expect(clamp('anthropic', 'claude-sonnet-5', 'xhigh'), name).toBe('high');
      expect(clamp('anthropic', 'claude-sonnet-5', 'max'), name).toBe('high');
      expect(clamp('gemini', 'gemini-3.1-pro-preview', 'max'), name).toBe('high');
    }
  });

  it('FR-4: never produces a level outside the target model levels and never throws', () => {
    const probes = ['disabled', 'between_tools', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'bogus', undefined];
    for (const m of ALL_MODELS) {
      for (const [name, clamp] of both) {
        for (const probe of probes) {
          expect(m.levels, `${name} ${m.id} / ${probe}`).toContain(clamp(m.provider, m.id, probe));
        }
      }
    }
  });

  it('FR-4a: client and server agree on the new models for every probe level', () => {
    const probes = ['disabled', 'between_tools', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'turbo', undefined];
    for (const [provider, id] of [['anthropic', 'claude-sonnet-5-5'], ['gemini', 'gemini-3.8-flash']] as const) {
      expect(findModel(provider, id), `${id} missing`).toBeDefined();
      for (const probe of probes) {
        expect(clampLevel(provider, id, probe as never), `${id} / ${probe}`)
          .toBe(serverSupport.clampLevel(provider, id, probe));
      }
    }
  });
});

/**
 * US-4.1 v3 (D2', F-4): explicit `max` rows and the parity invariant. No catalog model lists
 * `max`, so `max` is an ordering member only and must clamp to each model's top rung.
 */
describe('US-4.1 v3 max rows and clamp parity invariant (FR-4, FR-4a)', () => {
  const MAX_ROWS: Array<[string, string, string]> = [
    ['anthropic', 'claude-sonnet-5-5', 'xhigh'],
    ['anthropic', 'claude-sonnet-5', 'high'],
    ['gemini', 'gemini-3.1-pro-preview', 'high'],
    ['gemini', 'gemini-3.8-flash', 'high'],
    ['gemini', 'gemini-3.7-flash', 'high'],
    ['gemini', 'gemini-3.6-flash', 'high'],
    ['anthropic', 'claude-haiku-4-5', 'disabled'],
  ];

  it.each(MAX_ROWS)('FR-4: %s %s clamps max to %s on client and server', (provider, id, expected) => {
    expect(clampLevel(provider, id, 'max'), 'client').toBe(expected);
    expect(serverSupport.clampLevel(provider, id, 'max'), 'server').toBe(expected);
  });

  it('D2: no catalog model lists max as a level', () => {
    for (const m of ALL_MODELS) expect(m.levels, m.id).not.toContain('max');
  });

  it('FR-4a: for every model x probe level, result is in the model levels, client == server, and a member level is unchanged', () => {
    const probes = ['disabled', 'between_tools', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'turbo', undefined];
    for (const m of ALL_MODELS) {
      for (const probe of probes) {
        const client = clampLevel(m.provider, m.id, probe);
        const server = serverSupport.clampLevel(m.provider, m.id, probe);
        const tag = `${m.id} / ${String(probe)}`;
        expect(m.levels, `${tag} in levels`).toContain(client);
        expect(client, `${tag} parity`).toBe(server);
        if ((m.levels as string[]).includes(probe as string)) expect(client, `${tag} member unchanged`).toBe(probe);
      }
    }
  });

  it('AC-1: the route-level resolver maps a max slot on claude-sonnet-5-5 to xhigh with the 128000 ceiling', () => {
    expect(serverSupport.resolveSlot('anthropic', { model: 'claude-sonnet-5-5', level: 'max' }))
      .toEqual({ model: 'claude-sonnet-5-5', level: 'xhigh', maxOutputTokens: 128000 });
  });
});

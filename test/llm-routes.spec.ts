import { describe, it, expect, vi } from 'vitest';

/**
 * The untrusted-input boundary: the settings menu sends { deep, fast } with every request,
 * each slot naming its own provider, and the server must validate it against the catalog
 * before it reaches an SDK.
 *
 * Tests the real server/llm-request.js. A stub `getProvider` is injected so no API keys or
 * SDK clients are needed — everything else is production code.
 */
import { BadRequest, resolveRequest, slotFor } from '../server/llm-request.js';

const ENV_PROVIDER = 'anthropic';
const made: string[] = [];
const stubProvider = (name: string) => { made.push(name); return { name }; };

const resolve = (body: any, slot: string) => resolveRequest(body, slot, ENV_PROVIDER, stubProvider);

const GEMINI_BODY = {
  deep: { provider: 'gemini', model: 'gemini-3.1-pro-preview', level: 'high' },
  fast: { provider: 'gemini', model: 'gemini-3.6-flash', level: 'minimal' },
};

/** What a browser on an older bundle still sends: one provider for both slots. */
const LEGACY_BODY = {
  provider: 'gemini',
  deep: { model: 'gemini-3.1-pro-preview', level: 'high' },
  fast: { model: 'gemini-3.6-flash', level: 'minimal' },
};

describe('slotFor', () => {
  it('routes creative modes to the deep slot and everything else to fast', () => {
    expect(slotFor('creative')).toBe('deep');
    expect(slotFor('creative-json')).toBe('deep');
    expect(slotFor('text')).toBe('fast');
    expect(slotFor('json')).toBe('fast');
  });
});

describe('slot resolution', () => {
  it('resolves the deep slot for a Deep Thinking Mode call', () => {
    expect(resolve(GEMINI_BODY, slotFor('creative')).slot)
      .toEqual({ model: 'gemini-3.1-pro-preview', level: 'high', maxOutputTokens: 65536 });
  });

  it('resolves the fast slot for a plain call', () => {
    expect(resolve(GEMINI_BODY, slotFor('json')).slot)
      .toEqual({ model: 'gemini-3.6-flash', level: 'minimal', maxOutputTokens: 65536 });
  });

  it('returns no slot for a provider with no catalog entry, keeping its own defaults', () => {
    // OpenAI is reachable only via LLM_PROVIDER and has no thinking levels.
    expect(resolve({}, 'fast', ).slot).not.toBeNull();
    expect(resolveRequest({}, 'fast', 'openai', stubProvider).slot).toBeNull();
  });
});

describe('per-slot providers', () => {
  // The whole point: one run, Task A on Claude and the translations on Gemini.
  const MIXED_BODY = {
    deep: { provider: 'anthropic', model: 'claude-sonnet-5', level: 'medium' },
    fast: { provider: 'gemini', model: 'gemini-3.6-flash', level: 'minimal' },
  };

  it('serves each slot from the provider that slot names', () => {
    expect(resolve(MIXED_BODY, 'deep').provider).toBe('anthropic');
    expect(resolve(MIXED_BODY, 'fast').provider).toBe('gemini');
  });

  it('resolves each slot against its own provider catalog', () => {
    expect(resolve(MIXED_BODY, 'deep').slot)
      .toEqual({ model: 'claude-sonnet-5', level: 'medium', maxOutputTokens: 64000 });
    expect(resolve(MIXED_BODY, 'fast').slot)
      .toEqual({ model: 'gemini-3.6-flash', level: 'minimal', maxOutputTokens: 65536 });
  });

  it('rejects an unknown provider on the slot being resolved', () => {
    expect(() => resolve({ deep: { provider: 'skynet' } }, 'deep')).toThrow(BadRequest);
  });

  // A stale client sends one provider for both slots; it must keep working.
  it('honours the legacy top-level provider when the slot names none', () => {
    expect(resolve(LEGACY_BODY, 'deep').provider).toBe('gemini');
    expect(resolve(LEGACY_BODY, 'fast').slot)
      .toEqual({ model: 'gemini-3.6-flash', level: 'minimal', maxOutputTokens: 65536 });
  });

  it('lets the slot provider win over the legacy top-level one', () => {
    const body = { provider: 'gemini', deep: { provider: 'anthropic', model: 'claude-sonnet-5' } };
    expect(resolve(body, 'deep').provider).toBe('anthropic');
    expect(resolve(body, 'fast').provider).toBe('gemini');
  });
});

describe('request validation', () => {
  // An unknown provider must be a 400, not a 500: letting it reach the factory would surface
  // a client mistake as a server fault.
  it('rejects an unknown provider with a 400', () => {
    expect(() => resolve({ provider: 'skynet' }, 'fast')).toThrow(BadRequest);
    try {
      resolve({ provider: 'skynet' }, 'fast');
      expect.unreachable('should have thrown');
    } catch (e: any) {
      expect(e.status).toBe(400);
      expect(e.message).toMatch(/Unknown LLM provider/);
    }
  });

  // OpenAI has no catalog entry on purpose — it is deliberately not offered in the menu.
  it('rejects openai from the request body even though the server can run it', () => {
    expect(() => resolve({ provider: 'openai' }, 'fast')).toThrow(/Unknown LLM provider/);
  });

  it('falls back to the env provider when the body carries no settings', () => {
    const { provider, slot } = resolve({}, 'fast');
    expect(provider).toBe('anthropic');
    expect(slot).toEqual({ model: 'claude-haiku-4-5', level: 'disabled', maxOutputTokens: 16000 });
  });

  it('survives an entirely absent body', () => {
    expect(resolve(undefined, 'deep').provider).toBe('anthropic');
  });

  // A browser running an older bundle should degrade, not break — and it must degrade to a
  // model of the right tier, so an unknown Fast-slot model never lands on a premium one.
  it('falls back to a same-tier catalog model when the requested model is unknown', () => {
    const fast = resolve({ provider: 'gemini', fast: { model: 'gemini-99-ultra', level: 'high' } }, 'fast');
    expect(fast.slot!.model).toBe('gemini-3.6-flash');
    expect(fast.slot!.level).toBe('high');

    const deep = resolve({ provider: 'gemini', deep: { model: 'gemini-99-ultra', level: 'high' } }, 'deep');
    expect(deep.slot!.model).toBe('gemini-3.1-pro-preview');
  });

  it('clamps a level the requested model cannot accept', () => {
    const { slot } = resolve({ provider: 'gemini', deep: { model: 'gemini-3.1-pro-preview', level: 'minimal' } }, 'deep');
    expect(slot!.level).toBe('low');
  });

  it('accepts a provider regardless of case', () => {
    expect(resolve({ provider: 'GEMINI' }, 'fast').provider).toBe('gemini');
  });
});

describe('usage attribution', () => {
  // Recording the boot-time LLM_PROVIDER would label every Gemini row as anthropic and make
  // the cost dashboard lie.
  it('attributes a row to the provider that served the request, not the env default', () => {
    const insertUsage = vi.fn();
    const { provider } = resolve(GEMINI_BODY, 'deep');
    insertUsage({ provider, model: 'gemini-3.1-pro-preview' });

    expect(insertUsage).toHaveBeenCalledWith(expect.objectContaining({ provider: 'gemini' }));
    expect(provider).not.toBe(ENV_PROVIDER);
  });
});

describe('provider instances', () => {
  it('asks the factory for the provider that the request named', () => {
    made.length = 0;
    expect(resolve(GEMINI_BODY, 'deep').instance).toEqual({ name: 'gemini' });
    expect(resolve({}, 'fast').instance).toEqual({ name: 'anthropic' });
    expect(made).toEqual(['gemini', 'anthropic']);
  });
});

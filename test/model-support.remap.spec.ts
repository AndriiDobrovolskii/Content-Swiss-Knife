/**
 * US-11.1 (T4) - FR-19 / AC-12: `resolveSlot()` in server/providers/model-support.js remaps the two retired
 * Gemini Flash ids onto gemini-3.8-flash.
 *
 * Written from the Specification (FR-19, P-9a, P-9b) and the approver's rulings, not from the map the plan
 * proposes. The rulings that bind this file (docs/workflow/history.jsonl):
 *   - P-9b = A: a retired-id slot with NO requested level resolves to `high` (gemini-3.8-flash's
 *     defaultLevel), in both tiers. Asserted as exactly `high`, never as mere membership of `levels`, and
 *     never as `low`.
 *   - P-9a: the remap applies to provider `gemini` only. A retired Gemini id sent with another provider is
 *     an unknown id for that provider and falls back by tier as before.
 *
 * ANCHORING (task breakdown T4): the "unknown id still falls back by tier" cases compute their expectation
 * from the catalog file (the first premium / first fast text entry), never from a literal id that the
 * later catalog swap (T6) would move, so this file stays correct on both sides of that swap.
 *
 * The retired ids appear here as literals on purpose: this file exists to recognise them (Specification
 * P-8, "a retired id may appear where the behaviour is to recognise it").
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import catalog from '../src/prompt-core/model-catalog.json';
import { resolveSlot } from '../server/providers/model-support.js';

const RETIRED = ['gemini-3.7-flash', 'gemini-3.6-flash'] as const;
const TIERS = ['premium', 'fast'] as const; // 'premium' is the Deep slot, 'fast' is the Fast slot (llm-request.js)

type RawEntry = { id: string; tier: string; modalities?: string[] };
const rawModels = (provider: string): RawEntry[] =>
  ((catalog.providers as Array<{ id: string; models: RawEntry[] }>).find(p => p.id === provider)!.models)
    .filter(m => !m.modalities?.includes('image'));
const firstOfTier = (provider: string, tier: string) => rawModels(provider).find(m => m.tier === tier)!.id;

let warn: MockInstance<typeof console.warn>;
beforeEach(() => { warn = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => { warn.mockRestore(); });

describe('resolveSlot remaps retired Gemini Flash ids (FR-19, AC-12)', () => {
  for (const retired of RETIRED) {
    for (const tier of TIERS) {
      it(`${retired} on the ${tier} tier resolves to gemini-3.8-flash with the 65536 ceiling`, () => {
        const slot = resolveSlot('gemini', { model: retired, level: 'high' }, tier);
        expect(slot.model).toBe('gemini-3.8-flash');
        expect(slot.maxOutputTokens).toBe(65536);
        expect(slot.level).toBe('high');
      });

      it(`${retired} on the ${tier} tier clamps a requested minimal to low`, () => {
        expect(resolveSlot('gemini', { model: retired, level: 'minimal' }, tier))
          .toEqual({ model: 'gemini-3.8-flash', level: 'low', maxOutputTokens: 65536 });
      });

      it(`${retired} on the ${tier} tier keeps a requested low, medium or high`, () => {
        for (const level of ['low', 'medium', 'high']) {
          const slot = resolveSlot('gemini', { model: retired, level }, tier);
          expect(slot.model, `${retired} ${tier} ${level}`).toBe('gemini-3.8-flash');
          expect(slot.level, `${retired} ${tier} ${level}`).toBe(level);
        }
      });

      // P-9b = A, approver ruling "P-9b A": exactly `high`, in BOTH tiers (the Fast-slot cost consequence is intended).
      it(`${retired} on the ${tier} tier with NO requested level resolves to exactly high (P-9b = A)`, () => {
        for (const slotArg of [{ model: retired }, { model: retired, level: undefined }]) {
          const slot = resolveSlot('gemini', slotArg, tier);
          expect(slot.model).toBe('gemini-3.8-flash');
          expect(slot.level).toBe('high');
        }
      });

      it(`${retired} on the ${tier} tier logs exactly one warning that names the retired id`, () => {
        resolveSlot('gemini', { model: retired, level: 'low' }, tier);
        expect(warn).toHaveBeenCalledTimes(1);
        const message = warn.mock.calls[0].map(String).join(' ');
        expect(message).toContain(retired);
        const other = RETIRED.find(r => r !== retired)!;
        expect(message).not.toContain(other);
      });
    }
  }

  it('logs one warning per call, not once per process', () => {
    resolveSlot('gemini', { model: 'gemini-3.7-flash' }, 'fast');
    resolveSlot('gemini', { model: 'gemini-3.6-flash' }, 'premium');
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe('resolveSlot keeps the tier fallback for every other id (FR-19 failure path)', () => {
  it('an unknown non-retired id falls back to the first premium model on the premium tier and logs nothing', () => {
    const slot = resolveSlot('gemini', { model: 'gemini-99-ultra', level: 'high' }, 'premium');
    expect(slot.model).toBe(firstOfTier('gemini', 'premium'));
    expect(warn).not.toHaveBeenCalled();
  });

  it('an unknown non-retired id falls back to the first fast model on the fast tier and logs nothing', () => {
    const slot = resolveSlot('gemini', { model: 'gemini-99-ultra', level: 'high' }, 'fast');
    expect(slot.model).toBe(firstOfTier('gemini', 'fast'));
    expect(warn).not.toHaveBeenCalled();
  });

  it('a missing slot still falls back by tier and logs nothing', () => {
    expect(resolveSlot('gemini', undefined, 'premium').model).toBe(firstOfTier('gemini', 'premium'));
    expect(resolveSlot('gemini', undefined, 'fast').model).toBe(firstOfTier('gemini', 'fast'));
    expect(warn).not.toHaveBeenCalled();
  });

  it('a retired-looking id that is not one of the two is not remapped', () => {
    for (const model of ['gemini-3.5-flash', 'gemini-3.7-flash-lite', 'GEMINI-3.7-FLASH']) {
      resolveSlot('gemini', { model, level: 'medium' }, 'premium');
    }
    expect(warn).not.toHaveBeenCalled();
  });

  // slot.model is client input: a prototype key must never read as a retired id, and must not throw.
  it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty'])(
    'the prototype key %s is not a retired id: it falls back by tier and logs nothing', (key) => {
      expect(() => resolveSlot('gemini', { model: key }, 'fast')).not.toThrow();
      expect(resolveSlot('gemini', { model: key }, 'fast').model).toBe(firstOfTier('gemini', 'fast'));
      expect(resolveSlot('gemini', { model: key }, 'premium').model).toBe(firstOfTier('gemini', 'premium'));
      expect(warn).not.toHaveBeenCalled();
    });

  it('a current model is returned unchanged with no warning', () => {
    expect(resolveSlot('gemini', { model: 'gemini-3.8-flash', level: 'low' }, 'fast'))
      .toEqual({ model: 'gemini-3.8-flash', level: 'low', maxOutputTokens: 65536 });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('resolveSlot does not remap for another provider (P-9a)', () => {
  it('a retired Gemini id sent with provider anthropic falls back by tier and logs nothing', () => {
    for (const retired of RETIRED) {
      expect(resolveSlot('anthropic', { model: retired, level: 'high' }, 'premium').model, retired)
        .toBe(firstOfTier('anthropic', 'premium'));
      expect(resolveSlot('anthropic', { model: retired, level: 'high' }, 'fast').model, retired)
        .toBe(firstOfTier('anthropic', 'fast'));
    }
    expect(warn).not.toHaveBeenCalled();
  });
});

/**
 * pricing.spec.ts
 *
 * Pins the entries in server/usage/pricing.js that are not static lookups: Gemini 3.8 Flash's
 * introductory rate expires 2027-01-01 and Gemini 4 Carbon's expires 2026-12-01 (US-11.1), so
 * getPrices() branches on the instant of the lookup instead of returning a fixed row. Everything
 * else in the file is a plain object lookup; the cases below pin the ones a typo or a substring
 * match could silently misprice.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { DEFAULT_PRICES, computeCost, getPrices } from '../server/usage/pricing.js';

/**
 * US-4.1 — FR-13..FR-15. Written from the Specification's rates, not from the implementation.
 */
describe('getPrices — claude-sonnet-5-5 (FR-13)', () => {
  const SONNET_55 = { in: 2.00, out: 10.00, cw: 4.00, cr: 0.20 };

  it('prices claude-sonnet-5-5 at 2.00 / 10.00 / 4.00 (1h cache write) / 0.20', () => {
    expect(getPrices('claude-sonnet-5-5')).toEqual(SONNET_55);
  });

  // The substring fallback would match 'claude-sonnet-5-5' against the 'claude-sonnet-5' key and
  // return the same numbers by accident; the requirement is an exact entry of its own, so a
  // later change to the Sonnet 5 rates cannot silently re-price 5.5.
  it('has an exact entry of its own, not a substring match on claude-sonnet-5', () => {
    expect(Object.prototype.hasOwnProperty.call(DEFAULT_PRICES, 'claude-sonnet-5-5')).toBe(true);
  });

  it('does not return FALLBACK_PRICE', () => {
    expect(getPrices('claude-sonnet-5-5')).not.toEqual({ in: 3.00, out: 15.00, cw: 3.75, cr: 0.30 });
  });

  it('prices a dated claude-sonnet-5-5 id with the same rates', () => {
    expect(getPrices('claude-sonnet-5-5-20260928')).toEqual(SONNET_55);
  });

  it('computes cost for 1M tokens of each kind from the 5.5 entry', () => {
    const cost = computeCost('claude-sonnet-5-5', {
      inputTokens: 1_000_000, outputTokens: 1_000_000, cacheWriteTokens: 1_000_000, cacheReadTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(2.00 + 10.00 + 4.00 + 0.20, 10);
  });
});

// getPrices(model, now) is the injectable-clock seam the plan adds (D7); typed here so this file
// compiles under the Angular builder before the seam exists.
const priceAt = getPrices as unknown as (model: string, now?: Date) => { in: number; out: number; cw: number; cr: number };

describe('getPrices — gemini-3.8-flash promo window (FR-14)', () => {
  afterEach(() => vi.useRealTimers());

  const PROMO = { in: 0.75, out: 3.75, cw: 0, cr: 0.075 };
  const STANDARD = { in: 1.50, out: 7.50, cw: 0, cr: 0.15 };

  it('charges the promo rate one millisecond before the cutover (injected instant)', () => {
    expect(priceAt('gemini-3.8-flash', new Date('2026-12-31T23:59:59.999Z'))).toEqual(PROMO);
  });

  it('charges the standard rate exactly at the cutover (injected instant)', () => {
    expect(priceAt('gemini-3.8-flash', new Date('2027-01-01T00:00:00.000Z'))).toEqual(STANDARD);
  });

  it('charges the promo rate before the cutover (system clock)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-31T23:59:59.999Z'));
    expect(getPrices('gemini-3.8-flash')).toEqual(PROMO);
  });

  it('charges the standard rate at the cutover (system clock)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-01-01T00:00:00Z'));
    expect(getPrices('gemini-3.8-flash')).toEqual(STANDARD);
  });

  it('reads the clock at each lookup, not at module load', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T00:00:00Z'));
    expect(getPrices('gemini-3.8-flash')).toEqual(PROMO);
    vi.setSystemTime(new Date('2027-06-01T00:00:00Z'));
    expect(getPrices('gemini-3.8-flash')).toEqual(STANDARD);
  });

  it('never falls through to FALLBACK_PRICE', () => {
    const price = priceAt('gemini-3.8-flash', new Date('2026-10-01T00:00:00Z'));
    expect(price.in).toBeLessThan(3.00);
    expect(price.out).toBeLessThan(15.00);
  });

  it('prices cost from the dated entry (promo) for 1M tokens of each kind', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T00:00:00Z'));
    const cost = computeCost('gemini-3.8-flash', {
      inputTokens: 1_000_000, outputTokens: 1_000_000, cacheWriteTokens: 0, cacheReadTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(0.75 + 3.75 + 0.075, 10);
  });
});

describe('getPrices — retired claude-sonnet-4-6 keeps its entry (FR-15)', () => {
  it('returns its own entry, not the claude-sonnet-4 cache-write rate', () => {
    expect(getPrices('claude-sonnet-4-6')).toEqual({ in: 3.00, out: 15.00, cw: 6.00, cr: 0.30 });
    expect(Object.prototype.hasOwnProperty.call(DEFAULT_PRICES, 'claude-sonnet-4-6')).toBe(true);
  });
});

/**
 * US-11.1 (T3) - FR-26..FR-29, NFR-7. Written from the Specification's prices (owner-confirmed and recorded in
 * docs/evidence/US-11.1-vendor-and-sdk-evidence.md, V2), not from the implementation.
 *
 * The clock is always injected (`getPrices(model, now)`) or driven with fake timers: no case reads the wall
 * clock, so the Carbon price on either side of 2026-12-01T00:00:00Z is observed deterministically (NFR-7).
 * Carbon's cutover is a UTC instant; the boundary instant itself returns the LATER price (FR-27).
 */
const FALLBACK = { in: 3.00, out: 15.00, cw: 3.75, cr: 0.30 }; // pricing.js FALLBACK_PRICE, the "unpriced model" answer
const HYDROGEN = { in: 1.50, out: 7.50, cw: 0, cr: 0.075 };
const CARBON_INTRO = { in: 2.00, out: 10.00, cw: 0, cr: 0.10 };
const CARBON_STANDARD = { in: 4.00, out: 20.00, cw: 0, cr: 0.20 };
const PRO_31 = { in: 2.00, out: 12.00, cw: 0, cr: 0.20 };

describe('getPrices - gemini-4-hydrogen is flat (FR-26)', () => {
  afterEach(() => vi.useRealTimers());

  it('prices Hydrogen at 1.50 / 7.50 / 0 / 0.075 at every instant, with no promo window', () => {
    for (const instant of [
      '2020-01-01T00:00:00.000Z', '2026-11-15T12:00:00.000Z', '2026-11-30T23:59:59.999Z',
      '2026-12-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z', '2035-06-01T00:00:00.000Z',
    ]) {
      expect(priceAt('gemini-4-hydrogen', new Date(instant)), instant).toEqual(HYDROGEN);
    }
  });

  it('prices Hydrogen the same way when the lookup reads the system clock', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'));
    expect(getPrices('gemini-4-hydrogen')).toEqual(HYDROGEN);
    vi.setSystemTime(new Date('2028-03-01T00:00:00Z'));
    expect(getPrices('gemini-4-hydrogen')).toEqual(HYDROGEN);
  });

  it('never returns FALLBACK_PRICE and never resolves to another Gemini model\'s entry', () => {
    const price = priceAt('gemini-4-hydrogen', new Date('2026-11-15T12:00:00Z'));
    expect(price).not.toEqual(FALLBACK);
    expect(price).not.toEqual(PRO_31);
    expect(price).not.toEqual(priceAt('gemini-4-carbon', new Date('2026-11-15T12:00:00Z')));
    expect(price).not.toEqual(priceAt('gemini-3.8-flash', new Date('2026-11-15T12:00:00Z')));
    expect(price).not.toEqual(priceAt('gemini-3.8-flash', new Date('2027-06-01T00:00:00Z')));
  });

  it('prices 1M tokens of each kind from the Hydrogen entry', () => {
    const cost = computeCost('gemini-4-hydrogen', {
      inputTokens: 1_000_000, outputTokens: 1_000_000, cacheWriteTokens: 0, cacheReadTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(1.50 + 7.50 + 0.075, 10);
  });
});

describe('getPrices - gemini-4-carbon introductory window ends 2026-12-01T00:00:00Z (FR-27, NFR-7)', () => {
  afterEach(() => vi.useRealTimers());

  it('charges the introductory rate one millisecond before the cutover (injected instant)', () => {
    expect(priceAt('gemini-4-carbon', new Date('2026-11-30T23:59:59.999Z'))).toEqual(CARBON_INTRO);
  });

  it('charges the standard rate exactly at the cutover (injected instant)', () => {
    expect(priceAt('gemini-4-carbon', new Date('2026-12-01T00:00:00.000Z'))).toEqual(CARBON_STANDARD);
  });

  it('charges the standard rate after the cutover and the introductory rate long before it', () => {
    expect(priceAt('gemini-4-carbon', new Date('2027-03-01T00:00:00.000Z'))).toEqual(CARBON_STANDARD);
    expect(priceAt('gemini-4-carbon', new Date('2026-11-15T12:00:00.000Z'))).toEqual(CARBON_INTRO);
    expect(priceAt('gemini-4-carbon', new Date('2026-01-01T00:00:00.000Z'))).toEqual(CARBON_INTRO);
  });

  it('charges the introductory rate before the cutover (system clock)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-30T23:59:59.999Z'));
    expect(getPrices('gemini-4-carbon')).toEqual(CARBON_INTRO);
  });

  it('charges the standard rate at the cutover (system clock)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-01T00:00:00Z'));
    expect(getPrices('gemini-4-carbon')).toEqual(CARBON_STANDARD);
  });

  // The price must be chosen on every lookup. A price captured when the module loaded would answer the
  // same on both sides of the boundary, and a long-running server would never switch.
  it('reads the clock at each lookup, not at module load: one module instance shows both prices', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T00:00:00Z'));
    expect(getPrices('gemini-4-carbon')).toEqual(CARBON_INTRO);
    vi.setSystemTime(new Date('2026-12-01T00:00:00Z'));
    expect(getPrices('gemini-4-carbon')).toEqual(CARBON_STANDARD);
    vi.setSystemTime(new Date('2026-11-20T00:00:00Z'));
    expect(getPrices('gemini-4-carbon')).toEqual(CARBON_INTRO);
  });

  it('never returns FALLBACK_PRICE and never resolves to another Gemini model\'s entry, on either side of the cutover', () => {
    for (const instant of ['2026-11-15T12:00:00.000Z', '2026-12-01T00:00:00.000Z']) {
      const price = priceAt('gemini-4-carbon', new Date(instant));
      expect(price, instant).not.toEqual(FALLBACK);
      expect(price, instant).not.toEqual(PRO_31);
      expect(price, instant).not.toEqual(HYDROGEN);
      expect(price, instant).not.toEqual(priceAt('gemini-3.8-flash', new Date(instant)));
    }
  });

  it('prices 1M tokens of each kind from the introductory entry before the cutover', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T00:00:00Z'));
    const cost = computeCost('gemini-4-carbon', {
      inputTokens: 1_000_000, outputTokens: 1_000_000, cacheWriteTokens: 0, cacheReadTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(2.00 + 10.00 + 0.10, 10);
  });

  it('prices 1M tokens of each kind from the standard entry at and after the cutover', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-01T00:00:00Z'));
    const cost = computeCost('gemini-4-carbon', {
      inputTokens: 1_000_000, outputTokens: 1_000_000, cacheWriteTokens: 0, cacheReadTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(4.00 + 20.00 + 0.20, 10);
  });
});

describe('getPrices - the existing Gemini prices are unchanged (FR-28)', () => {
  // Characterization: green before this Story and it must stay green.
  it('gemini-3.1-pro-preview is 2.00 / 12.00 / 0 / 0.20 at every instant', () => {
    for (const instant of ['2026-01-01T00:00:00.000Z', '2026-12-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z']) {
      expect(priceAt('gemini-3.1-pro-preview', new Date(instant)), instant).toEqual(PRO_31);
    }
  });

  it('gemini-3.8-flash keeps its 2027-01-01 cutover, not Carbon\'s', () => {
    expect(priceAt('gemini-3.8-flash', new Date('2026-12-01T00:00:00.000Z'))).toEqual({ in: 0.75, out: 3.75, cw: 0, cr: 0.075 });
    expect(priceAt('gemini-3.8-flash', new Date('2027-01-01T00:00:00.000Z'))).toEqual({ in: 1.50, out: 7.50, cw: 0, cr: 0.15 });
  });
});

describe('pricing.js carries no price entry and no helper for the retired Gemini Flash models (FR-29)', () => {
  const source = () => readFileSync(resolve(process.cwd(), 'server/usage/pricing.js'), 'utf8');

  it('DEFAULT_PRICES has no key for gemini-3.6-flash or gemini-3.7-flash', () => {
    expect(Object.keys(DEFAULT_PRICES)).not.toContain('gemini-3.6-flash');
    expect(Object.keys(DEFAULT_PRICES)).not.toContain('gemini-3.7-flash');
  });

  // The pattern avoids the 3.75 price literal: it needs a model name around the digits.
  it('the file names neither retired model, in an id, a helper name or a comment', () => {
    expect(source()).not.toMatch(/gemini-3\.[67]|gemini3[67]|3\.[67] Flash|Flash 3\.[67]/i);
  });

  it('the Gemini 4 entries exist as exact entries or helpers of their own', () => {
    const text = source();
    expect(text).toContain('gemini-4-hydrogen');
    expect(text).toContain('gemini-4-carbon');
    expect(text).toContain('2026-12-01T00:00:00Z');
  });
});

/**
 * pricing.spec.ts
 *
 * Pins the one entry in server/usage/pricing.js that isn't a static lookup: Gemini 3.7 Flash's
 * introductory rate expires 2027-01-01, so getPrices() branches on the current date instead of
 * returning a fixed row. Everything else in the file is a plain object lookup and doesn't need
 * a test to prove it returns what it's told to return.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';

import { DEFAULT_PRICES, computeCost, getPrices } from '../server/usage/pricing.js';

describe('getPrices — gemini-3.7-flash promo window', () => {
  afterEach(() => vi.useRealTimers());

  it('charges the introductory rate before the promo ends', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-31T23:59:59Z'));

    expect(getPrices('gemini-3.7-flash')).toEqual({ in: 0.75, out: 3.75, cw: 0, cr: 0.075 });
  });

  it('charges the standard rate once the promo ends', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-01-01T00:00:00Z'));

    expect(getPrices('gemini-3.7-flash')).toEqual({ in: 1.50, out: 7.50, cw: 0, cr: 0.15 });
  });

  // Regression guard: without an explicit entry, the substring-fallback in getPrices() cannot
  // match 'gemini-3.7-flash' against 'gemini-3.6-flash' (neither contains the other), so a
  // missing case here would silently bill every 3.7 call at FALLBACK_PRICE — 4x too high.
  it('never falls through to FALLBACK_PRICE', () => {
    const price = getPrices('gemini-3.7-flash');
    expect(price.in).toBeLessThan(3.00);
    expect(price.out).toBeLessThan(15.00);
  });
});

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

/**
 * pricing.spec.ts
 *
 * Pins the one entry in server/usage/pricing.js that isn't a static lookup: Gemini 3.7 Flash's
 * introductory rate expires 2027-01-01, so getPrices() branches on the current date instead of
 * returning a fixed row. Everything else in the file is a plain object lookup and doesn't need
 * a test to prove it returns what it's told to return.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';

import { getPrices } from '../server/usage/pricing.js';

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

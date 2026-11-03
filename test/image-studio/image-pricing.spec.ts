// @vitest-environment node
/**
 * image-pricing.spec.ts - US-10.1 T14 (FR-70, FR-84, SD-26, NFR-6).
 *
 * Per-image pricing in server/usage/pricing.js. The module already exists (token pricing for text models), so it is
 * imported statically; the NEW exports are read through a namespace cast so a missing export is a named failure, not a
 * compile error.
 *
 * PINNED CONTRACT (server/usage/pricing.js additions):
 *   export const IMAGE_PRICES: Record<string, number>        // $ per generated image, keyed by the EXACT catalogue model id
 *   export function getImagePrice(modelId): number            // exact key only; throws PriceNotConfiguredError otherwise
 *   export function computeImageCost(modelId, nonThoughtImageCount): number    // = unit price x count; 0 images = 0
 *   export class PriceNotConfiguredError extends Error        // name 'PriceNotConfiguredError', message names the model id
 *   computeCost(model, usage) THROWS for an image model (the token-rate path and FALLBACK_PRICE never apply to one)
 * The caller passes the NON-THOUGHT image count (the classifier's imageCount, FR-84); that a thought image is excluded is
 * asserted at the handler (generate-handler.spec.ts), because this helper only multiplies the count it is given.
 * Prices are the V-5 record (docs/evidence/US-10.1-pre-implementation-checks.md): Flash $0.03, Pro $0.06 per image.
 */
import { describe, it, expect } from 'vitest';
import * as pricing from '../../server/usage/pricing.js';
import catalog from '../../src/prompt-core/model-catalog.json';

const p = pricing as any;
const FLASH = 'gemini-3.1-flash-image';
const PRO = 'gemini-3-pro-image';
const catalogImageIds: string[] = (catalog as any).providers.flatMap((pr: any) => pr.models)
  .filter((m: any) => (m.modalities ?? []).includes('image')).map((m: any) => m.id);

/** The typed error must exist; `toThrowError(undefined)` would pass for ANY throw, so assert it first. */
const priceError = (): any => { expect(typeof p.PriceNotConfiguredError).toBe('function'); return p.PriceNotConfiguredError; };

describe('IMAGE_PRICES / getImagePrice (FR-70)', () => {
  it('FR-70 / V-5: the unit price is $0.03 per Flash image and $0.06 per Pro image', () => {
    expect(p.getImagePrice(FLASH)).toBeCloseTo(0.03, 10);
    expect(p.getImagePrice(PRO)).toBeCloseTo(0.06, 10);
  });

  it('FR-70: IMAGE_PRICES is keyed by the exact catalogue id', () => {
    expect(Object.keys(p.IMAGE_PRICES ?? {}).sort()).toEqual([FLASH, PRO].sort());
  });

  it('FR-70: every image model in the shared catalogue resolves to a per-image price', () => {
    expect(catalogImageIds.length).toBeGreaterThanOrEqual(2); // the catalogue holds the two image entries (T2)
    for (const id of catalogImageIds) expect(p.getImagePrice(id), id).toBeGreaterThan(0);
  });

  it('FR-70: lookup is by exact key - a near-miss or unknown id throws PriceNotConfiguredError, never a substring match', () => {
    for (const id of ['gemini-3.1-flash-image-001', 'gemini-3.1-pro-image', 'gemini-3.1-flash', 'flash', 'unknown-image-model', '']) {
      expect(typeof p.getImagePrice).toBe('function');
      expect(() => p.getImagePrice(id), id).toThrowError(priceError());
    }
  });

  it('FR-70: the image prices are NOT in the token-rate table, so the image path can never reach getPrices() or FALLBACK_PRICE', () => {
    expect(Object.keys(pricing.DEFAULT_PRICES)).not.toContain(FLASH);
    expect(Object.keys(pricing.DEFAULT_PRICES)).not.toContain(PRO);
  });
});

describe('computeImageCost (FR-70)', () => {
  it('FR-70: a response with two images costs twice the unit price', () => {
    expect(p.computeImageCost(FLASH, 2)).toBeCloseTo(0.06, 10);
    expect(p.computeImageCost(PRO, 2)).toBeCloseTo(0.12, 10);
  });

  it('FR-70: one image costs the unit price and a response with zero images costs 0', () => {
    expect(p.computeImageCost(FLASH, 1)).toBeCloseTo(0.03, 10);
    expect(p.computeImageCost(PRO, 0)).toBe(0);
  });

  it('FR-70 / FR-84: the cost is unit price x the count it is given - three non-thought images cost three units', () => {
    expect(p.computeImageCost(PRO, 3)).toBeCloseTo(0.18, 10);
  });

  it('FR-70 / SD-26: an image model with no price entry fails loudly with PriceNotConfiguredError that names the model', () => {
    expect(() => p.computeImageCost('gemini-9-image', 1)).toThrowError(priceError());
    let caught: any;
    try { p.computeImageCost('gemini-9-image', 1); } catch (e) { caught = e; }
    expect(caught.name).toBe('PriceNotConfiguredError');
    expect(String(caught.message)).toContain('gemini-9-image');
  });

  it('FR-70: an unpriced model never yields a number - in particular not the FALLBACK_PRICE token rate', () => {
    expect(typeof p.computeImageCost).toBe('function');
    let caught: unknown;
    let value: unknown = 'not-called';
    try { value = p.computeImageCost('gemini-9-image', 2); } catch (e) { caught = e; }
    expect(value).toBe('not-called');
    expect(caught).toBeInstanceOf(priceError());
  });
});

describe('computeCost guard (FR-70, NFR-6)', () => {
  it('FR-70: computeCost throws for an image model instead of applying a token rate', () => {
    for (const id of [FLASH, PRO]) {
      expect(() => pricing.computeCost(id, { inputTokens: 1000, outputTokens: 1000 }), id).toThrow();
    }
  });

  it('NFR-6: computeCost for a text model is unchanged (Claude Sonnet 5.5: $2 in / $10 out per 1M tokens)', () => {
    expect(pricing.computeCost('claude-sonnet-5-5', { inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBeCloseTo(12, 10);
  });

  it('NFR-6: getPrices for an existing text model is unchanged', () => {
    expect(pricing.getPrices('gemini-3.1-pro-preview')).toEqual({ in: 2.0, out: 12.0, cw: 0, cr: 0.2 });
  });
});

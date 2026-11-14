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
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const p = pricing as any;
const FLASH = 'gemini-3.1-flash-image';
const PRO = 'gemini-3-pro-image';
const catalogImageIds: string[] = (catalog as any).providers.flatMap((pr: any) => pr.models)
  .filter((m: any) => (m.modalities ?? []).includes('image')).map((m: any) => m.id);

/** The typed error must exist; `toThrowError(undefined)` would pass for ANY throw, so assert it first. */
const priceError = (): any => { expect(typeof p.PriceNotConfiguredError).toBe('function'); return p.PriceNotConfiguredError; };

describe('IMAGE_PRICES / getImagePrice (FR-70)', () => {
  it('FR-70 / OD-2 (owner ruling 2026-11-14; US-10.6 T3, OD-16 row): the unit price per generated image is Flash 1K $0.067, Flash 2K $0.101, Pro 1K $0.134, Pro 2K $0.134, Pro 4K $0.24', () => {
    expect(p.getImagePrice(FLASH, '1K')).toBe(0.067);
    expect(p.getImagePrice(FLASH, '2K')).toBe(0.101);
    expect(p.getImagePrice(PRO, '1K')).toBe(0.134);
    expect(p.getImagePrice(PRO, '2K')).toBe(0.134);
    expect(p.getImagePrice(PRO, '4K')).toBe(0.24);
  });

  it('FR-70: IMAGE_PRICES is keyed by the exact catalogue id', () => {
    expect(Object.keys(p.IMAGE_PRICES ?? {}).sort()).toEqual([FLASH, PRO].sort());
  });

  it('FR-70 (US-10.6 T3, OD-16 row): every (model, resolution) pair of the shared catalogue resolves to a per-image price', () => {
    expect(catalogImageIds.length).toBeGreaterThanOrEqual(2); // the catalogue holds the two image entries (T2)
    const pairs = (catalog as any).providers.flatMap((pr: any) => pr.models)
      .filter((m: any) => (m.modalities ?? []).includes('image')).flatMap((m: any) => (m.resolutions as string[]).map((r) => [m.id, r]));
    expect(pairs).toHaveLength(5);
    for (const [id, res] of pairs) expect(p.getImagePrice(id, res), `${id} ${res}`).toBeGreaterThan(0);
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
  it('FR-70 (US-10.6 T3, OD-16 row): a response with two images costs twice the unit price of its pair', () => {
    expect(p.computeImageCost(FLASH, '1K', 2)).toBe(0.067 * 2);
    expect(p.computeImageCost(PRO, '1K', 2)).toBe(0.134 * 2);
    expect(p.computeImageCost(PRO, '4K', 2)).toBe(0.24 * 2);
  });

  it('FR-70 (US-10.6 T3, OD-16 row): one image costs the unit price and a response with zero images costs 0', () => {
    expect(p.computeImageCost(FLASH, '2K', 1)).toBe(0.101);
    expect(p.computeImageCost(PRO, '4K', 0)).toBe(0);
  });

  it('FR-70 / FR-84 (US-10.6 T3, OD-16 row): the cost is unit price x the count it is given - three non-thought images cost three units, not rounded', () => {
    expect(p.computeImageCost(PRO, '2K', 3)).toBe(0.134 * 3);
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

/**
 * US-10.6 T3 - the price table is keyed by MODEL AND RESOLUTION (FR-22, FR-21, AC-14, AC-14a).
 *
 * PINNED CONTRACT (server/usage/pricing.js; plan 6 "Shape and no flat fallback"):
 *   getImagePrice(modelId, resolution): number                 both arguments required; unknown model, unknown resolution for a known
 *                                                              model, or a MISSING resolution throws PriceNotConfiguredError
 *   computeImageCost(modelId, resolution, count): number       = unit * count, NO rounding (Rule A); same throws
 *   IMAGE_PRICES: { [modelId]: { [resolution]: number } }      built from imagePrices of the shared contract JSON
 *
 * VALUES (v2 of this stage): the owner accepted the prices on 2026-11-14 (OD-2, docs/decisions/US-10.6-open-decisions.md "Owner answers"; USD per generated image):
 * Flash 1K 0.067, Flash 2K 0.101, Pro 1K 0.134, Pro 2K 0.134, Pro 4K 0.24. The earlier cases of this file that used the one-argument flat table
 * ($0.03 / $0.06, V-5) are the T3-owned rows of the approved OD-16 table (G-6) and are rewritten above to the pair arity with these values; the
 * cases of this block read the unit from the shared contract JSON so they prove "one table", and the value pins above prove the table's content.
 * OD-18: the cost is price(model, resolution) x generatedCount ONLY - no input-image or text-token term - and is not rounded (Rule A).
  */
const contractPrices = (): Record<string, Record<string, number>> =>
  JSON.parse(readFileSync(resolve(process.cwd(), 'src/prompt-core/image-studio-contract.json'), 'utf8')).imagePrices ?? {};
const catalogPairs: Array<[string, string]> = (catalog as any).providers.flatMap((pr: any) => pr.models)
  .filter((m: any) => (m.modalities ?? []).includes('image')).flatMap((m: any) => (m.resolutions as string[]).map((r) => [m.id, r] as [string, string]));

describe('US-10.6 getImagePrice by pair (T3, FR-22, AC-14a)', () => {
  it('FR-22: every (model, resolution) pair the catalogue allows resolves to the unit price held in the shared contract table', () => {
    expect(catalogPairs.length).toBeGreaterThanOrEqual(5);
    for (const [model, resolution] of catalogPairs) {
      expect(p.getImagePrice(model, resolution), `${model} ${resolution}`).toBe(contractPrices()[model]?.[resolution]);
    }
  });

  it('AC-14a: a 4K image costs more than the same model\'s 1K image and than its 2K image', () => {
    expect(p.getImagePrice(PRO, '4K')).toBeGreaterThan(p.getImagePrice(PRO, '1K'));
    expect(p.getImagePrice(PRO, '4K')).toBeGreaterThan(p.getImagePrice(PRO, '2K'));
  });

  it('AC-14a: an unknown RESOLUTION for a known model is rejected (Flash has no 4K) - never a fallback to another resolution', () => {
    expect(() => p.getImagePrice(FLASH, '4K')).toThrowError(priceError());
    expect(() => p.getImagePrice(PRO, '8K')).toThrowError(priceError());
    expect(() => p.getImagePrice(PRO, '1k')).toThrowError(priceError());
  });

  it('AC-14a: an unknown MODEL is rejected for every resolution [characterization]', () => {
    for (const resolution of ['1K', '2K', '4K']) expect(() => p.getImagePrice('gemini-9-image', resolution), resolution).toThrowError(priceError());
  });

  it('FR-22 / plan 6: a model-only call (no resolution) throws instead of billing a 4K image at a 1K price', () => {
    expect(() => p.getImagePrice(PRO)).toThrowError(priceError());
    expect(() => p.getImagePrice(PRO, undefined)).toThrowError(priceError());
    expect(() => p.getImagePrice(FLASH, '')).toThrowError(priceError());
  });

  it('FR-22: the error names both the model and the resolution so the server log can say which pair has no price', () => {
    let caught: any;
    try { p.getImagePrice(FLASH, '4K'); } catch (e) { caught = e; }
    expect(caught?.name).toBe('PriceNotConfiguredError');
    expect(String(caught?.message)).toContain(FLASH);
    expect(String(caught?.message)).toContain('4K');
  });

  it('FR-21: IMAGE_PRICES is built from the shared contract table - same models, same resolutions, same values', () => {
    expect(p.IMAGE_PRICES).toEqual(contractPrices());
  });
});

describe('US-10.6 computeImageCost by pair (T3, FR-22, FR-21)', () => {
  it('AC-14 / FR-21: for every pair and count in {1, 2, 4} the cost is exactly unit * count - one expression over one table, not rounded', () => {
    for (const [model, resolution] of catalogPairs) {
      const unit = contractPrices()[model]?.[resolution];
      expect(typeof unit, `${model} ${resolution}`).toBe('number');
      for (const count of [1, 2, 4]) {
        expect(p.computeImageCost(model, resolution, count), `${model} ${resolution} x${count}`).toBe(unit * count);
      }
    }
  });

  it('FR-22: zero images cost 0 for a priced pair', () => {
    expect(p.computeImageCost(PRO, '4K', 0)).toBe(0);
  });

  it('AC-14a: an unpriced pair never yields a number - it throws PriceNotConfiguredError for any count', () => {
    for (const count of [0, 1, 2]) {
      expect(() => p.computeImageCost(FLASH, '4K', count), `count ${count}`).toThrowError(priceError());
    }
  });

  it('plan 6: the old two-argument form (model, count) fails loudly - a stale caller cannot bill at a wrong price', () => {
    expect(() => p.computeImageCost(PRO, 2)).toThrowError(priceError());
    expect(() => p.computeImageCost(FLASH, 1)).toThrowError(priceError());
  });
});

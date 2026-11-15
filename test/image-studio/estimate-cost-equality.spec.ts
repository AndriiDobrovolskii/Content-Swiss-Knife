// @vitest-environment node
/**
 * estimate-cost-equality.spec.ts - US-10.6 T12 (FR-21, AC-14; plan 6, risk "the estimate and the recorded cost drift").
 *
 * AC-14: "the estimate and the recorded cost use the same price table, so for one successful generation they are equal". The client estimate
 * (src/utils/image-studio/estimate.ts) and the server cost (server/usage/pricing.js `computeImageCost`) are two separate code paths in two
 * runtimes; this spec runs BOTH over EVERY (model, resolution) pair the model catalogue allows and N in {1, 2, 4} and requires exact equality of one
 * expression: unit * N (Rule A, no rounding). It compares each side with the other and with the table, per image - it never asserts an exact
 * floating-point SUM OF ROWS (Specification FR-21 limitation).
 *
 * No price value is pinned: the unit is read from the shared contract JSON, so an edit of the table moves BOTH sides, and a second copy on either
 * side makes this fail.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as pricing from '../../server/usage/pricing.js';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const readJson = (rel: string): any => JSON.parse(readFileSync(resolve(process.cwd(), rel), 'utf8'));

const catalogPairs = (): Array<[string, string]> => readJson('src/prompt-core/model-catalog.json').providers
  .flatMap((p: any) => p.models)
  .filter((m: any) => (m.modalities ?? []).includes('image'))
  .flatMap((m: any) => (m.resolutions as string[]).map((r) => [m.id, r] as [string, string]));

describe('AC-14: the client estimate equals the server cost over every catalogue pair (T12)', () => {
  it('the catalogue has the five pairs this spec iterates (Flash 1K and 2K, Pro 1K, 2K and 4K) [characterization]', () => {
    expect(catalogPairs().map(([m, r]) => `${m} ${r}`).sort()).toEqual([
      'gemini-3-pro-image 1K', 'gemini-3-pro-image 2K', 'gemini-3-pro-image 4K', 'gemini-3.1-flash-image 1K', 'gemini-3.1-flash-image 2K',
    ]);
  });

  it('FR-21: for every pair and N in {1, 2, 4}, estimateCost equals computeImageCost - the number shown before sending is the number recorded', async () => {
    const { estimateCost } = await load('../../src/utils/image-studio/estimate');
    const table = readJson('src/prompt-core/image-studio-contract.json').imagePrices ?? {};
    for (const [model, resolution] of catalogPairs()) {
      for (const n of [1, 2, 4]) {
        const label = `${model} ${resolution} x${n}`;
        const estimate = estimateCost(model, resolution, n);
        const recorded = (pricing as any).computeImageCost(model, resolution, n);
        expect(typeof estimate, label).toBe('number');
        expect(estimate, label).toBe(recorded);
        expect(estimate, label).toBe(table[model]?.[resolution] * n);
      }
    }
  });

  it('FR-21: per image, the unit the server records equals the unit the estimate multiplies (N = 1 on both sides)', async () => {
    const { estimateCost } = await load('../../src/utils/image-studio/estimate');
    for (const [model, resolution] of catalogPairs()) {
      expect(estimateCost(model, resolution, 1), `${model} ${resolution}`).toBe((pricing as any).getImagePrice(model, resolution));
    }
  });

  it('AC-14a / FR-22: a pair the server cannot price is a pair the client estimate returns null for (no number is shown that could not be recorded)', async () => {
    const { estimateCost } = await load('../../src/utils/image-studio/estimate');
    expect(estimateCost('gemini-3.1-flash-image', '4K', 1)).toBeNull();
    expect(() => (pricing as any).computeImageCost('gemini-3.1-flash-image', '4K', 1)).toThrow();
  });
});

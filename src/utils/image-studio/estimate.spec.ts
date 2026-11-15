/**
 * estimate.spec.ts - US-10.6 T12 (FR-20, FR-21, AC-13, AC-14).
 *
 * PINNED CONTRACT (src/utils/image-studio/estimate.ts):
 *   estimateCost(model: string, resolution: string, n: number): number | null
 *     = unit * n, where `unit` is the price of the (model, resolution) pair read from the SHARED contract table (`imagePrices`), NOT rounded (Rule A);
 *     null when the pair has no price - no number is invented (FR-20 failure path). It forms no text (decimals of the estimate text are SM-7, deferred).
 *
 * The structural cases read the expected unit from image-studio-contract.json ("the estimate reads that one table"); the value case pins the owner's
 * OD-2 prices (2026-11-14) and the OD-18 formula price(model, resolution) x N.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');
const prices = (): Record<string, Record<string, number>> => JSON.parse(read('src/prompt-core/image-studio-contract.json')).imagePrices ?? {};
const pairs = (): Array<[string, string]> => Object.entries(prices()).flatMap(([model, byRes]) => Object.keys(byRes).map((r) => [model, r] as [string, string]));

describe('estimateCost (T12, FR-20, AC-13)', () => {
  it('AC-13: for every priced pair and N in {1, 2, 4} the estimate is exactly the contract unit price times N', async () => {
    const { estimateCost } = await load('./estimate');
    expect(pairs().length).toBeGreaterThanOrEqual(5);
    for (const [model, resolution] of pairs()) {
      for (const n of [1, 2, 4]) {
        expect(estimateCost(model, resolution, n), `${model} ${resolution} x${n}`).toBe(prices()[model][resolution] * n);
      }
    }
  });

  it('OD-2 / OD-18 (owner rulings 2026-11-14): the estimate is the accepted price per generated image times N and nothing else - no input-image term', async () => {
    const { estimateCost } = await load('./estimate');
    expect(estimateCost('gemini-3.1-flash-image', '1K', 1)).toBe(0.067);
    expect(estimateCost('gemini-3.1-flash-image', '2K', 4)).toBe(0.101 * 4);
    expect(estimateCost('gemini-3-pro-image', '1K', 2)).toBe(0.134 * 2);
    expect(estimateCost('gemini-3-pro-image', '2K', 4)).toBe(0.134 * 4);
    expect(estimateCost('gemini-3-pro-image', '4K', 4)).toBe(0.24 * 4);
  });

  it('AC-13: the estimate updates with the image count - 4 images cost exactly four times one image for the same pair', async () => {
    const { estimateCost } = await load('./estimate');
    const [model, resolution] = pairs()[0] ?? ['', ''];
    expect(estimateCost(model, resolution, 4)).toBe((estimateCost(model, resolution, 1) as number) * 4);
    expect(estimateCost(model, resolution, 2)).toBe((estimateCost(model, resolution, 1) as number) * 2);
  });

  it('AC-13: the estimate updates with the resolution - on the Pro model the 4K estimate is above the 1K and 2K estimates for the same N', async () => {
    const { estimateCost } = await load('./estimate');
    const PRO = 'gemini-3-pro-image';
    for (const n of [1, 2, 4]) {
      expect(estimateCost(PRO, '4K', n)).toBeGreaterThan(estimateCost(PRO, '1K', n));
      expect(estimateCost(PRO, '4K', n)).toBeGreaterThan(estimateCost(PRO, '2K', n));
    }
  });

  it('FR-20 failure path: a pair with no price gives null, not 0 and not a number - Flash has no 4K, an unknown model and an unknown resolution have no price', async () => {
    const { estimateCost } = await load('./estimate');
    expect(estimateCost('gemini-3.1-flash-image', '4K', 2)).toBeNull();
    expect(estimateCost('gemini-9-image', '1K', 1)).toBeNull();
    expect(estimateCost('gemini-3-pro-image', '8K', 1)).toBeNull();
    expect(estimateCost('', '', 1)).toBeNull();
  });

  it('Rule A (OD-14c): the estimate is not rounded - it is the raw product, so it can carry more than two decimals', async () => {
    const { estimateCost } = await load('./estimate');
    for (const [model, resolution] of pairs()) {
      const unit = prices()[model][resolution];
      expect(estimateCost(model, resolution, 4), `${model} ${resolution}`).toBe(unit * 4);
    }
  });

  it('FR-21 / OD-14a: the estimate module reads the shared contract and carries no price table of its own', () => {
    const source = read('src/utils/image-studio/estimate.ts');
    expect(source).toContain('image-studio-contract');
    expect(source).not.toMatch(/gemini-3(\.1)?-(flash|pro)-image['"]\s*:/);
  });
});

/**
 * image-count.spec.ts - US-10.6 T12 (FR-4 and its failure path; AC-3).
 *
 * PINNED CONTRACT (src/utils/image-studio/image-count.ts):
 *   normalizeImageCount(x: unknown): 1 | 2 | 4     a value outside {1, 2, 4} (a stale draft, code, a wrong type) becomes 1 and is never sent as a count.
 * The default of the selector is 1 (AC-3). The set {1, 2, 4} is the shared contract's `imageCounts`, so the spec reads it from the JSON rather than
 * hard-coding a second copy of the list for the "every member is kept" case.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const contractCounts = (): number[] => JSON.parse(readFileSync(resolve(process.cwd(), 'src/prompt-core/image-studio-contract.json'), 'utf8')).imageCounts ?? [];

describe('normalizeImageCount (T12, FR-4)', () => {
  it('AC-3: 1, 2 and 4 are kept as they are', async () => {
    const { normalizeImageCount } = await load('./image-count');
    expect(normalizeImageCount(1)).toBe(1);
    expect(normalizeImageCount(2)).toBe(2);
    expect(normalizeImageCount(4)).toBe(4);
  });

  it('FR-4: every member of the shared contract list is kept', async () => {
    const { normalizeImageCount } = await load('./image-count');
    expect(contractCounts()).toEqual([1, 2, 4]);
    for (const n of contractCounts()) expect(normalizeImageCount(n), String(n)).toBe(n);
  });

  it('FR-4 failure path: a number outside {1, 2, 4} becomes 1 (0, 3, 5, 8, 100, negatives, fractions, NaN, Infinity)', async () => {
    const { normalizeImageCount } = await load('./image-count');
    for (const bad of [0, 3, 5, 8, 100, -1, -4, 2.5, 1.0000001, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(normalizeImageCount(bad), String(bad)).toBe(1);
    }
  });

  it('FR-4 failure path: a value of the wrong type becomes 1 - the string "4" is not the number 4', async () => {
    const { normalizeImageCount } = await load('./image-count');
    for (const bad of ['4', '2', '', 'many', null, undefined, true, {}, [4]]) {
      expect(normalizeImageCount(bad), JSON.stringify(bad)).toBe(1);
    }
  });
});

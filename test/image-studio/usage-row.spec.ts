// @vitest-environment node
/**
 * usage-row.spec.ts - US-10.1 T15 (FR-32, FR-69, FR-72, SD-7, NFR-10).
 *
 * PINNED CONTRACT (server/image-studio/usage-row.js, ESM, pure):
 *   export function buildUsageRow({ model, presetId, resolution, usageMetadata, costUsd }): UsageRecord
 * UsageRecord has exactly the keys the existing `insertUsage` consumes (server/usage/store.js): provider, model, mode,
 * taskLabel, productName, store, lang, inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens, costUsd - no new
 * key, so no new `usage_log` column (NFR-10). `ts` is left to insertUsage (it defaults to Date.now()).
 *   - taskLabel = 'image-studio|' + (presetId ?? 'none') + '|' + resolution                           (SD-7)
 *   - provider 'gemini'; mode null (FR-72: no marker is added); store, lang, productName null       (plan DD-12, P-6)
 *   - tokens map exactly as GeminiProvider.#usage does: input = promptTokenCount, output = candidatesTokenCount +
 *     thoughtsTokenCount, cacheRead = cachedContentTokenCount, cacheWrite = 0; each missing field counts as 0.
 * Writing the row, and "a row-write failure does not change the 200", belong to the handler (generate-handler.spec.ts).
 */
import { describe, it, expect, vi } from 'vitest';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const MODULE = '../../server/image-studio/usage-row.js';

const USAGE = { promptTokenCount: 1200, candidatesTokenCount: 1290, thoughtsTokenCount: 310, cachedContentTokenCount: 40 };

describe('buildUsageRow - label and fixed columns', () => {
  it('SD-7 / FR-32: the task label is image-studio|<presetId>|<resolution> for a preset', async () => {
    const { buildUsageRow } = await load(MODULE);
    const row = buildUsageRow({ model: 'gemini-3.1-flash-image', presetId: 'white-bg', resolution: '2K', usageMetadata: USAGE, costUsd: 0.03 });
    expect(row.taskLabel).toBe('image-studio|white-bg|2K');
  });

  it('SD-7 / FR-32: with no preset the literal none stands in for the preset id', async () => {
    const { buildUsageRow } = await load(MODULE);
    for (const presetId of [undefined, null]) {
      const row = buildUsageRow({ model: 'gemini-3-pro-image', presetId, resolution: '4K', usageMetadata: USAGE, costUsd: 0.06 });
      expect(row.taskLabel).toBe('image-studio|none|4K');
    }
  });

  it('SD-7: every preset id of the registry yields a label with exactly three |-separated segments (ids contain no |)', async () => {
    const { buildUsageRow } = await load(MODULE);
    for (const id of ['white-bg', 'lifestyle', 'banner', 'social', 'detail-closeup']) {
      const label = buildUsageRow({ model: 'gemini-3.1-flash-image', presetId: id, resolution: '1K', usageMetadata: USAGE, costUsd: 0.03 }).taskLabel;
      expect(label.split('|')).toEqual(['image-studio', id, '1K']);
    }
  });

  it('FR-69 / FR-72 / plan P-6: provider is gemini, mode is null (no marker), store, lang and productName are null', async () => {
    const { buildUsageRow } = await load(MODULE);
    const row = buildUsageRow({ model: 'gemini-3.1-flash-image', presetId: 'social', resolution: '1K', usageMetadata: USAGE, costUsd: 0.03 });
    expect(row).toMatchObject({ provider: 'gemini', model: 'gemini-3.1-flash-image', mode: null, store: null, lang: null, productName: null });
  });

  it('FR-70 / FR-69: costUsd on the row is the per-image cost handed in, not tokens x rate', async () => {
    const { buildUsageRow } = await load(MODULE);
    const row = buildUsageRow({ model: 'gemini-3-pro-image', presetId: null, resolution: '2K', usageMetadata: USAGE, costUsd: 0.12 });
    expect(row.costUsd).toBe(0.12);
  });
});

describe('buildUsageRow - token mapping equals GeminiProvider.#usage', () => {
  it('FR-69: input = promptTokenCount, output = candidates + thoughts, cacheRead = cachedContentTokenCount, cacheWrite = 0', async () => {
    const { buildUsageRow } = await load(MODULE);
    const row = buildUsageRow({ model: 'gemini-3.1-flash-image', presetId: 'white-bg', resolution: '1K', usageMetadata: USAGE, costUsd: 0.03 });
    expect(row).toMatchObject({ inputTokens: 1200, outputTokens: 1290 + 310, cacheReadTokens: 40, cacheWriteTokens: 0 });
  });

  it('FR-69: missing usageMetadata fields count as 0 and absent usageMetadata does not throw', async () => {
    const { buildUsageRow } = await load(MODULE);
    expect(buildUsageRow({ model: 'm', presetId: null, resolution: '1K', usageMetadata: { promptTokenCount: 5 }, costUsd: 0 }))
      .toMatchObject({ inputTokens: 5, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 });
    expect(buildUsageRow({ model: 'm', presetId: null, resolution: '1K', usageMetadata: undefined, costUsd: 0 }))
      .toMatchObject({ inputTokens: 0, outputTokens: 0 });
  });

  it('FR-69: the mapping agrees with what the text provider reports for the same usageMetadata (single rule, two call sites)', async () => {
    const { buildUsageRow } = await load(MODULE);
    // GeminiProvider.#usage is private; its mapping is observable through generate() with a stubbed SDK elsewhere
    // (test/gemini-provider.spec.ts pins promptTokenCount 100, candidates 20, thoughts 5, cached 80 -> in 100, out 25, cr 80).
    const row = buildUsageRow({ model: 'm', presetId: null, resolution: '1K', usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 5, cachedContentTokenCount: 80 }, costUsd: 0 });
    expect([row.inputTokens, row.outputTokens, row.cacheReadTokens, row.cacheWriteTokens]).toEqual([100, 25, 80, 0]);
  });
});

describe('buildUsageRow - fits the existing usage_log table (NFR-10)', () => {
  it('NFR-10: the row has exactly the keys insertUsage consumes - no new column is introduced', async () => {
    const { buildUsageRow } = await load(MODULE);
    const row = buildUsageRow({ model: 'gemini-3.1-flash-image', presetId: 'white-bg', resolution: '1K', usageMetadata: USAGE, costUsd: 0.03 });
    const insertUsageKeys = ['provider', 'model', 'mode', 'taskLabel', 'productName', 'store', 'lang', 'inputTokens', 'outputTokens', 'cacheWriteTokens', 'cacheReadTokens', 'costUsd'];
    expect(Object.keys(row).filter((k) => k !== 'ts').sort()).toEqual([...insertUsageKeys].sort());
  });

  it('FR-72 / NFR-10: the row inserts into the REAL usage_log DDL (in-memory SQLite) and is retrievable by its exact task label', async () => {
    const { buildUsageRow } = await load(MODULE);
    vi.resetModules();
    process.env['USAGE_DB_PATH'] = ':memory:';
    const store = await import('../../server/usage/store.js');
    const row = buildUsageRow({ model: 'gemini-3.1-flash-image', presetId: 'white-bg', resolution: '2K', usageMetadata: USAGE, costUsd: 0.03 });
    store.insertUsage(row);
    const found = store.queryUsage({ taskLabel: 'image-studio|white-bg|2K' });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ provider: 'gemini', model: 'gemini-3.1-flash-image', mode: null, inputTokens: 1200, outputTokens: 1600, costUsd: 0.03, taskLabel: 'image-studio|white-bg|2K' });
    expect(store.queryUsage({ taskLabel: 'image-studio' })).toHaveLength(0); // exact match, a prefix is not queryable (FR-72)
  });
});

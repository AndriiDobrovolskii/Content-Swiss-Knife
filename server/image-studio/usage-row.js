/**
 * Usage-row builder for the Image Studio generate route (US-10.1, FR-32, FR-69, FR-72, SD-7, NFR-10).
 *
 * Builds the record the EXISTING `insertUsage` (server/usage/store.js) consumes. It adds no key, so the
 * `usage_log` table gains no column and needs no migration (NFR-10).
 *
 *   taskLabel = 'image-studio|' + (presetId ?? 'none') + '|' + resolution       (SD-7)
 *   provider 'gemini'; mode null (FR-72: no marker); store, lang, productName null
 *   tokens map exactly as GeminiProvider.#usage does: input = promptTokenCount,
 *   output = candidatesTokenCount + thoughtsTokenCount, cacheRead = cachedContentTokenCount, cacheWrite = 0;
 *   a missing field counts as 0.
 *
 * `costUsd` is the per-image cost the caller computed (computeImageCost), not tokens x rate. Writing the row,
 * and "a row-write failure does not change the 200", belong to the handler.
 */

/**
 * @param {{ model: string, presetId?: string | null, resolution: string,
 *           usageMetadata?: object, costUsd: number }} input
 * @returns {object} a record for insertUsage
 */
export function buildUsageRow({ model, presetId, resolution, usageMetadata, costUsd }) {
  const u = usageMetadata || {};
  return {
    provider: 'gemini',
    model,
    mode: null,
    taskLabel: `image-studio|${presetId ?? 'none'}|${resolution}`,
    productName: null,
    store: null,
    lang: null,
    inputTokens: u.promptTokenCount ?? 0,
    outputTokens: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0),
    cacheWriteTokens: 0,
    cacheReadTokens: u.cachedContentTokenCount ?? 0,
    costUsd,
  };
}

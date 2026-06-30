/** Normalize a generate() payload: accept a plain string or a PromptPayload object. */
export function normalizePayload(payload) {
  return typeof payload === 'string'
    ? { systemBlocks: [], userContent: payload }
    : payload;
}

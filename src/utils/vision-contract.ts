/**
 * vision-contract.ts
 *
 * Client-side contract for the Vision pre-pass output. The model is instructed
 * to return JSON-only text (see src/prompts/vision-prepass.ts); this module
 * strips any code fences, parses, and validates the shape with a hand-rolled
 * type guard (no zod dependency — mirrors the manual validation style in
 * output-validator.ts).
 *
 * On any parse/validation failure `parseVisionResult` throws, and the caller
 * falls back to the existing filename-derived alt text + `status: 'error'`.
 */

export interface VisionResult {
  /** <= 20 words, English, objective. Used as default alt text / vision description. */
  caption: string;
}

/** Caption is the constrained field — hard ceiling on word count. */
const MAX_CAPTION_WORDS = 20;

/** Remove a leading ```json / ``` fence and a trailing ``` fence, plus surrounding whitespace. */
function stripFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Parse + validate a raw Vision response string into a VisionResult.
 * @throws Error on invalid JSON or a shape/constraint violation.
 */
export function parseVisionResult(raw: string): VisionResult {
  const cleaned = stripFences(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('vision-contract: response is not valid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('vision-contract: response is not a JSON object');
  }

  const obj = parsed as Record<string, unknown>;

  const caption = obj['caption'];
  if (typeof caption !== 'string' || caption.trim().length === 0) {
    throw new Error('vision-contract: "caption" must be a non-empty string');
  }
  if (wordCount(caption) > MAX_CAPTION_WORDS) {
    throw new Error(`vision-contract: "caption" exceeds ${MAX_CAPTION_WORDS} words`);
  }

  // Any other fields the model emits (e.g. a stray "consistent") are ignored.
  return { caption: caption.trim() };
}

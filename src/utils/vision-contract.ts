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
  /** Native-Ukrainian figure label (US-5.1 FR-21). Optional; dropped when missing or not a string. */
  label?: string;
  /** Native-Ukrainian one-sentence description (US-5.1 FR-21). Optional. */
  description?: string;
  /** Native-Ukrainian one-sentence alt text (US-5.1 FR-21). Optional. */
  alt?: string;
}

/** Key names of the three optional native-Ukrainian fields, shared with the Vision prompt module. */
export const VISION_UK_FIELD_KEYS = ['label', 'description', 'alt'] as const;

/** Manifest-entry fields that `visionResultToEntryPatch` fills (a subset of ImageManifestEntry). */
export interface VisionEntryPatch {
  visionLabelUk?: string;
  visionDescriptionUk?: string;
  visionAltUk?: string;
}

/** Caption is the constrained field — hard ceiling on word count. */
const MAX_CAPTION_WORDS = 20;

/** A trimmed non-empty string, or undefined: the new optional fields never throw. */
function optionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

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

  const result: VisionResult = { caption: caption.trim() };
  const label = optionalText(obj['label']);
  const description = optionalText(obj['description']);
  const alt = optionalText(obj['alt']);
  if (label !== undefined) result.label = label;
  if (description !== undefined) result.description = description;
  if (alt !== undefined) result.alt = alt;
  // Any other fields the model emits (e.g. a stray "consistent") are ignored.
  return result;
}

/** Map a parsed result onto the three Ukrainian manifest-entry fields; absent fields stay absent. */
export function visionResultToEntryPatch(result: VisionResult): VisionEntryPatch {
  const patch: VisionEntryPatch = {};
  if (result.label !== undefined) patch.visionLabelUk = result.label;
  if (result.description !== undefined) patch.visionDescriptionUk = result.description;
  if (result.alt !== undefined) patch.visionAltUk = result.alt;
  return patch;
}

/**
 * Response classifier for the Image Studio generate route (US-10.1, FR-26, FR-62 to FR-64, FR-84; DD-10).
 *
 * Contract (pure, no SDK import - Rule 1 keeps SDK symbols inside server/providers/gemini.js, so the closed sets
 * of SD-23 are written here as string constants):
 *
 *   classifyResponse(response) ->
 *     { class: 'safety', reason }                  reason = the candidate finishReason, or the prompt-level blockReason
 *     { class: 'images', parts, imageCount }       parts = the first candidate's parts in API order, thought parts kept;
 *                                                  imageCount = valid NON-thought image parts
 *     { class: 'text', text }                      the non-thought text parts joined
 *     { class: 'failed' }                          class 4 of FR-26 (HTTP 502 EMPTY_RESPONSE at the handler)
 *
 * The FR-26 table is applied top to bottom; only the FIRST candidate is read. A value outside the closed sets
 * (the vendor may add enum members) falls through to the abnormal class, never to an empty image.
 */

/** SD-23 candidate safety set (`finishReason`). */
const CANDIDATE_SAFETY_REASONS = new Set([
  'SAFETY',
  'BLOCKLIST',
  'PROHIBITED_CONTENT',
  'SPII',
  'IMAGE_SAFETY',
  'IMAGE_PROHIBITED_CONTENT',
]);

/** SD-23 prompt-level safety set (`promptFeedback.blockReason`), read only when there is no usable candidate. */
const PROMPT_SAFETY_REASONS = new Set([
  'SAFETY',
  'BLOCKLIST',
  'PROHIBITED_CONTENT',
  'IMAGE_SAFETY',
  'MODEL_ARMOR',
  'JAILBREAK',
]);

/** SD-23 normal finish. */
const NORMAL_FINISH = 'STOP';

const FAILED = Object.freeze({ class: 'failed' });

/** @returns {boolean} */
function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A valid image part: a NON-thought part with an `image/*` inline payload and non-empty data (AC-14, FR-84). */
function isValidImagePart(part) {
  if (!isObject(part) || part.thought === true) return false;
  const inline = part.inlineData;
  return (
    isObject(inline) &&
    typeof inline.mimeType === 'string' &&
    inline.mimeType.startsWith('image/') &&
    typeof inline.data === 'string' &&
    inline.data.length > 0
  );
}

/** A non-empty, non-thought text part. */
function textOf(part) {
  if (!isObject(part) || part.thought === true) return null;
  return typeof part.text === 'string' && part.text.length > 0 ? part.text : null;
}

/**
 * @param {unknown} response SDK `GenerateContentResponse` shape
 * @returns {{class:'safety',reason:string}|{class:'images',parts:object[],imageCount:number}|{class:'text',text:string}|{class:'failed'}}
 */
export function classifyResponse(response) {
  if (!isObject(response)) return FAILED;

  const { candidates } = response;
  if (candidates !== undefined && !Array.isArray(candidates)) return FAILED;

  // No usable candidate: the prompt-level block reason is the only thing that can still classify (row 2 / row 7).
  if (candidates === undefined || candidates.length === 0) {
    const blockReason = isObject(response.promptFeedback) ? response.promptFeedback.blockReason : undefined;
    if (typeof blockReason === 'string' && PROMPT_SAFETY_REASONS.has(blockReason)) {
      return { class: 'safety', reason: blockReason };
    }
    return FAILED;
  }

  const candidate = candidates[0];
  if (!isObject(candidate)) return FAILED;

  const finishReason = typeof candidate.finishReason === 'string' ? candidate.finishReason : undefined;

  // Row 1: a safety-finished candidate is safety whatever parts it holds (its image parts are dropped).
  if (finishReason !== undefined && CANDIDATE_SAFETY_REASONS.has(finishReason)) {
    return { class: 'safety', reason: finishReason };
  }

  if (!isObject(candidate.content)) return FAILED;
  const parts = candidate.content.parts;
  if (!Array.isArray(parts)) return FAILED;

  // Row 3: at least one valid (non-thought) image part, whatever the finish reason (D-10).
  const imageCount = parts.filter(isValidImagePart).length;
  if (imageCount > 0) return { class: 'images', parts, imageCount };

  // Row 4: text only with the normal finish.
  const texts = parts.map(textOf).filter((t) => t !== null);
  if (texts.length > 0 && finishReason === NORMAL_FINISH) {
    return { class: 'text', text: texts.join('') };
  }

  // Rows 5 and 6: abnormal finish, no parts, empty text, parts of neither kind.
  return FAILED;
}

/**
 * Prompt for the Vision pre-pass (Phase 1 — single image per call).
 *
 * The returned "caption" seeds BOTH the manifest alt text and the figcaption for a public
 * PRODUCT-PAGE image, so the prompt is written to alt-text best practices (WCAG / screen-reader
 * guidance): describe the image's FUNCTION in context, front-load meaning, stay concise, never
 * keyword-stuff. Grounded on the already-known product name so the model recognizes the device
 * instead of guessing its class from pixels alone; enforces a hard JSON output contract
 * (see src/utils/vision-contract.ts, MAX_CAPTION_WORDS = 20).
 *
 * Deep Thinking Mode: the caller passes useThinking through to /llm/vision. Quality gains come
 * from the SERVER enabling Sonnet 5 adaptive thinking (thinking:{type:'adaptive'} +
 * output_config.effort) with max_tokens raised above the caption size — max_tokens caps thinking
 * and response text combined, so it needs headroom for both. Adaptive thinking lets the model
 * reason about the subject, read on-image text, and pick the single most useful sentence, WITHOUT
 * making the caption longer. (Manual budget_tokens is a 400 error on Sonnet 5.) This prompt stays
 * thinking-agnostic: it never says "think step by step" (the thinking block does that natively) —
 * it only defines WHAT a good caption is.
 *
 * @param productName  The product the image belongs to (used as grounding, never echoed).
 * @param specsExcerpt Optional short specs excerpt for extra grounding context.
 */
export function buildVisionPrepassPrompt(productName: string, specsExcerpt?: string): string {
  const name = productName.trim() || 'an unnamed product';
  const specsBlock = specsExcerpt?.trim()
    ? `\nKnown specs (silent grounding context — they inform what you recognize; the caption states only what is visible):\n${specsExcerpt.trim()}\n`
    : '';

  return `You are a product-image analyst for an e-commerce store that sells 3D printers, 3D scanners, and laser engravers/cutters.

This image is a photo of the product named: "${name}".
${specsBlock}
Your output becomes the ALT TEXT and figure caption for this image on the public product page.
Write it the way accessibility best practice demands: a screen-reader user who cannot see the
image should learn what it shows and WHY it is on this page, in one concise phrase.

OUTPUT CONTRACT — emit exactly one raw JSON object; the first character of your output is "{" and the last is "}":
{
  "caption": "string (<= 20 words, English, objective, ends on a letter or digit)"
}

Describe what is actually visible in the image, grounded by the product above.

Grounding rules:
- Treat the named product as the source of truth for the device class: when the pixels suggest a
  different class (e.g. "laser engraver" for a named 3D printer), describe the visible features
  and keep the named product's class.
- When the visible subject is unclear or generic, describe it generically (shape, color, controls,
  ports) — the generic description takes the place of any guessed device class.

ALT-TEXT RULES for "caption":

HARD LENGTH LIMIT (overrides every rule below): the caption MUST be a single phrase of 20 words
or fewer (about <= 125 characters). This ceiling wins over completeness — a caption of 21+ words
is rejected outright, so if a detail does not fit, drop it.
- COMPARISON / MULTI-PANEL / CLAIM images (two items side by side, before/after, a chart, or a
  graphic carrying model names, "vs", quantities or %): the SUBJECT of the caption is the
  comparison itself — WHAT differs and in WHICH DIRECTION (which side is less/more, or the winning
  value). Lead with that contrast in one phrase. A salient foreground object (the item in focus,
  the nicer-looking result) must NOT replace the comparison as the subject: when the scene
  contrasts two states, captioning only the appealing object is a REJECTED caption. Name the two
  things compared and the direction of the result — do not enumerate every panel or label.

Within that limit, apply these in priority order:
- FUNCTION OVER APPEARANCE: state what the image demonstrates about the product — a capability,
  mode, result, accessory, workflow step, or comparison — not just how it looks. Example intent:
  a chart image → "Comparison of engraving speed across three power modes", not "A chart with bars".
- FRONT-LOAD MEANING: put the most important information in the first few words; assistive tech
  and search snippets may truncate the tail.
- BE SPECIFIC AND MEASURABLE: name the visible material, mode, part, or numeric property. Where a
  marketing adjective ("amazing", "beautiful", "innovative", "high-quality") would appear,
  substitute the visible property it implies ("0.06 mm laser spot", "enclosed Class-1 housing").
- COMPONENT IDENTITY: name a specific internal part or sub-assembly only when its form in the
  image is unambiguous. When the exact part is uncertain, or two component types could be
  confused, use a more general true description ("the head assembly", "an internal module", "the
  control panel") rather than committing to a subsystem the pixels do not confirm. An on-image
  text label (a material name, a mode, a number) may be folded in, but a label must never be used
  to infer a component type it does not itself establish.
- READ ON-IMAGE TEXT selectively: fold in only the ONE most meaningful label, engraved word, or
  heading; never transcribe multiple text elements or every label present.
- NO REDUNDANT OPENER: never begin with "Image of", "Photo of", "Picture of", "Screenshot of",
  "A photo showing", etc. — screen readers already announce "image". Start with the subject noun.
- NO KEYWORD-STUFFING: one natural phrase, not a comma-pile of search terms; the product name is
  already known — repeat it only if genuinely clarifying.
- English only. Main subject first. End the string on a letter or digit (final punctuation omitted).`;
}
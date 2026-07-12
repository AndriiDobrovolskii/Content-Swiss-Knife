/**
 * Prompt for the Vision pre-pass (Phase 1 — single image per call).
 *
 * Grounds the analysis on the already-known product name so the model
 * recognizes the device instead of guessing its class from pixels alone, and
 * enforces a hard JSON output contract (see src/utils/vision-contract.ts).
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

Style rules for "caption":
- Objective, technical register; where a marketing adjective ("amazing", "beautiful", "innovative")
  would appear, substitute the visible property it implies ("enclosed build chamber",
  "dual-extruder toolhead").
- Main subject first, then specifics.
- Maximum 20 words. English only. End the string on a letter or digit (final punctuation omitted).`;
}

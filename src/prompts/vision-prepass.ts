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
    ? `\nKnown specs (context only, do not restate verbatim):\n${specsExcerpt.trim()}\n`
    : '';

  return `You are a product-image analyst for an e-commerce store that sells 3D printers, 3D scanners, and laser engravers/cutters.

This image is a photo of the product named: "${name}".
${specsBlock}
Describe what is actually visible in the image, grounded by the product above.

Grounding rules:
- Do NOT assert a device class (e.g. "3D printer", "laser engraver", "scanner") that contradicts the named product. The named product is the source of truth for what the device is.
- If the visible subject is unclear or generic, describe it generically (shape, color, controls, ports) rather than guessing a device class.

Style rules for "caption":
- Objective and technical — no marketing adjectives ("amazing", "beautiful", "innovative").
- Main subject first, then specifics.
- Maximum 20 words. English only. No trailing punctuation.

Output contract — return ONLY this JSON object, no prose, no code fences:
{
  "caption": "string (<= 20 words, English, objective)"
}`;
}

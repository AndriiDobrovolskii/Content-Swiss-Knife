/**
 * Prompt for the Vision pre-pass (Phase 1 — single image per call).
 * Returns a short technical description used as default alt text in the image manifest.
 */
export function buildVisionPrepassPrompt(): string {
  return `You are a technical product image analyst for a 3D printing and scanning e-commerce store.

Analyze this product image and write a concise technical description.

Rules:
- Objective and technical — no marketing adjectives ("amazing", "beautiful", "innovative").
- Main subject first, then specifics. E.g. "Blue laser scanning interface with multi-mode selector".
- Maximum 20 words.
- English only.
- Return ONLY the description text. No introductory phrases, no quotes, no trailing punctuation.`;
}

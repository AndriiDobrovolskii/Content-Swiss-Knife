/**
 * Instruction text the Image Studio sends to the image model (US-10.6 FR-13, AC-9).
 *
 * A non-frozen sibling of `master-system-prompt.ts` (AGENTS.md section 9) and `prompt-presets.ts`: the studio sends
 * its `contents` directly and does not use the generation prompt payload, so these sentences are plain constants,
 * kept out of services and utils (AGENTS.md section 3 Rule 3).
 *
 * The file is shaped to take further instruction constants later. It carries no Upscale or Variation text on
 * purpose (owner ruling SM-12 (i): Upscale sends the image alone, Variation sends the original prompt).
 */

/**
 * Sent with an image attached in the Style ref role, as its own text part immediately AFTER that image part (SM-2).
 * Verbatim from AC-9: no trailing full stop, never translated.
 */
export const STYLE_REF_INSTRUCTION =
  'Use this image purely as a stylistic reference, do not copy the product from it';

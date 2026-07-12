export function buildImageAltPrompt(): string {
  return `Generate professional, technical SEO alt text for this product image.

OUTPUT CONTRACT: emit exactly one alt-text string — plain text, maximum 20 words, starting with the
main subject noun and ending on a letter or digit (surrounding quotes, markup, and trailing
punctuation omitted).

Rules:
1. Describe specifics: mention technical specs visible in the image (wavelengths, spot sizes,
   material types).
2. Compare: when the image shows a comparison, describe the before/after or left/right differences.
3. Lead with function: focus on the result of the technology shown.
4. Write in a scientific, precise, professional register; where a marketing adjective ("amazing",
   "beautiful") would appear, substitute the measurable property it implies ("amazing detail" →
   "0.05 mm feature resolution").
5. Structure: main subject first, then technical details and the specific machine/process.
6. Open with the subject itself: where "This image shows a printed bracket" would appear,
   write "Printed bracket…".`;
}

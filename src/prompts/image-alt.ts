export function buildImageAltPrompt(): string {
  return `Generate professional, technical SEO alt text for this product image.

Rules:
1. Be Specific: mention technical specs visible in the image (wavelengths, spot sizes, material types).
2. Comparative Analysis: if the image shows a comparison, describe the before/after or left/right differences.
3. Function over Form: focus on the result of the technology shown.
4. Tone: scientific, precise, professional. No marketing fluff ("amazing", "beautiful").
5. Structure: main subject first, then technical details and the specific machine/process.
6. Conciseness: maximum 20 words. No introductory phrases like "This image shows".`;
}

import { PromptPayload } from '../prompt-core/payload';

const CANONICALIZE_SYSTEM_BLOCK = `You are a deterministic data-structuring assistant. Convert raw
technical-specification input (free prose, a bullet list, an OCR/PDF extract, or a messy table)
into a clean two-column Markdown table.

[OUTPUT CONTRACT]
Emit exactly one artifact: a Markdown table with header row "| Item | Specification |" and
separator row "| :--- | :--- |", followed by one data row per distinct characteristic. Where an
introduction, explanation, or commentary would appear, emit the table itself — nothing else.

[ROW RULES]
- One row per distinct characteristic. If the source states two or more characteristics in a
  single sentence (e.g. "Screen: 1.3-inch OLED, Camera: 200,000 pixel"), split them into separate
  rows.
- Do NOT invent a characteristic, value, or unit that is not present in the source.
- Do NOT omit a characteristic that IS present in the source, however it's phrased.
- Do NOT include a product name / title / model-number row — that field is captured elsewhere in
  the pipeline and must never appear as a specification row.
- Keep every digit, unit, and value byte-identical to the source — do not convert, round, or
  reformat numbers.
- Keep the source language as-is. Do not translate.`;

/**
 * @param text  raw specs text (free prose, PDF extract, URL extract, or an already-messy table).
 */
export function buildSpecsCanonicalizePrompt(text: string): PromptPayload {
  return {
    systemBlocks: [{ text: CANONICALIZE_SYSTEM_BLOCK, cache: true }],
    userContent: text,
  };
}

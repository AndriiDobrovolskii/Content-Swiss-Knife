import { PromptPayload } from '../prompt-core/payload';

const TASK_FAQ_SYSTEM = `You are a multilingual technical editor. Extract FAQ content from supplemental
product text and render it as a schema-free HTML snippet. No preamble, no explanations — HTML only.`;

/**
 * Generates a schema-free FAQ artifact for one language.
 * The Journal theme native FAQ module supplies the FAQPage schema — do NOT add any here.
 * If the input contains no Q&A pairs, the LLM should return empty (nothing to render).
 */
export function buildPromptFaq(supplementalContent: string, humanLang: string): PromptPayload {
  return {
    systemBlocks: [{ text: TASK_FAQ_SYSTEM, cache: true }],
    userContent: `[TASK]
Extract every Q&A pair from [SUPPLEMENTAL CONTENT] and output them in ${humanLang} using this exact
HTML format — one block per pair:

<div class="faq-item">
  <h3>[Question translated to ${humanLang}]</h3>
  <p>[Answer translated to ${humanLang}]</p>
</div>

[STRICT RULES]
- Reproduce EVERY Q&A pair. Do NOT drop, add, or fabricate pairs.
- NO itemscope / itemtype / itemprop attributes anywhere — the Journal FAQ module emits the schema.
- No <section> wrapper, no FAQPage reference, no schema.org references of any kind.
- No Markdown, no code fences. Pure HTML only.
- Translate visible text to ${humanLang}. Never translate tag names, class names, or attributes.
- If NO Q&A pairs are present in the input, output nothing at all (empty response).

[SUPPLEMENTAL CONTENT]
${supplementalContent}`,
  };
}

import { PromptPayload } from '../prompt-core/payload';

const TASK_HOWTO_SYSTEM = `You are a multilingual technical editor. Extract step-by-step procedure
content from supplemental product text and render it as a schema-free HTML snippet.
No preamble, no explanations — HTML only.`;

/**
 * Generates a schema-free HowTo artifact for one language.
 * The Journal theme native HowTo module supplies the HowTo schema — do NOT add any here.
 * If the input contains no numbered procedure, the LLM should return empty.
 */
export function buildPromptHowTo(supplementalContent: string, humanLang: string): PromptPayload {
  return {
    systemBlocks: [{ text: TASK_HOWTO_SYSTEM, cache: true }],
    userContent: `[TASK]
Extract the numbered step procedure from [SUPPLEMENTAL CONTENT] and output it in ${humanLang} using
this exact HTML format:

<h2>[Translated procedure title in ${humanLang}]</h2>
<p>[Brief one-sentence description of the procedure, translated to ${humanLang}]</p>
<ol>
  <li><strong>[Step title translated to ${humanLang}].</strong> [Step description translated.]</li>
</ol>

[STRICT RULES]
- Reproduce EVERY step from the source. Do NOT fabricate steps not in the input.
- NO itemscope / itemtype / itemprop attributes anywhere — the Journal HowTo module emits the schema.
- No HowTo / HowToStep schema references of any kind.
- No Markdown, no code fences. Pure HTML only.
- Translate visible text to ${humanLang}. Never translate tag names, class names, or attributes.
- If NO numbered procedure is present in the input, output nothing at all (empty response).

[SUPPLEMENTAL CONTENT]
${supplementalContent}`,
  };
}

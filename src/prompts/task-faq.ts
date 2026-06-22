import { PromptPayload } from '../prompt-core/payload';

const TASK_FAQ_SYSTEM = `You are an experienced SEO specialist who professionally optimizes commercial sites
in 3D printing, equipment, and additive manufacturing. You write expert, technically accurate, relevant
FAQ blocks for product pages. Always argue the advantages of the specific product in question.
No preamble, no explanations — output the FAQ artifact only.`;

/**
 * Generates a schema-free FAQ artifact for one language, per Schema v3 Appendix "Промт FAQ".
 * The Journal theme native FAQ module supplies the FAQPage schema — do NOT add any here.
 *
 * Output format (v3): each item is a plain-text question in <h3> followed immediately by an
 * HTML answer (allowed tags only). No wrapper <div>/class — the app parser walks <h3> + siblings.
 * If the inputs contain nothing answerable, the model returns an empty response.
 */
export function buildPromptFaq(
  productName: string,
  originalDescription: string,
  techSpecs: string,
  supplementalContent: string,
  humanLang: string,
): PromptPayload {
  return {
    systemBlocks: [{ text: TASK_FAQ_SYSTEM, cache: true }],
    userContent: `[TASK]
Create an expert FAQ block for "${productName}" in ${humanLang}, based ONLY on the provided sources.

[CONTENT RULES]
- Answer-first: the first sentence of each answer is a direct, clear answer to the question. Details and
  argued advantages come after.
- Conciseness & UX: keep questions short (≈5–7 words) and phrased like a real person solving a practical
  task — not encyclopedic. Focus on the outcome for the buyer.
- Count: 5–7 question/answer pairs (adapt down if the sources are thin).
- Sources: use ONLY facts from [Original Description], [Tech Specs] and [Supplemental Content]. No "water",
  no generic filler (e.g. "it depends on your needs"). If a question cannot be answered from the input,
  do NOT invent it — choose a different question. Answers must be self-sufficient (understandable without
  reading the main description).

[QUESTION TYPES — pick the most relevant for this product]
- Use-cases: which tasks, industries (prototyping, dentistry, jewellery, engineering) or conditions it
  suits best ("What is…?" explainer questions also welcome).
- Compatibility & integration: which equipment, software or materials it works with; adapters/modules needed?
- Pain-points: how it improves the workflow (automation, speed, accuracy, less waste).
- Operation & maintenance: setup difficulty for a beginner, consumable lifespan, operating requirements
  (temperature, ventilation, care). How-to questions ("How to avoid print warping off the bed?").
- Advantages & package: why this brand/model beats alternatives; what's in the box (does it work out of
  the box?); comparison questions ("How does A differ from B?").

[OUTPUT FORMAT — STRICT]
Emit one block per pair, in this exact shape, with NO wrapper element:
<h3>[Question in ${humanLang} — plain text, no HTML]</h3>
<p>[Answer in ${humanLang} — first sentence is the direct answer.]</p>

- Question (Q): plain text only, no HTML tags.
- Answer (A): clean HTML using ONLY these tags: <b>, <strong>, <ul>, <li>, <p>, <a>.
- <table> is STRICTLY FORBIDDEN (CMS FAQ tables do not scroll on mobile) — render every comparison or
  list as <ul>/<li>.
- Do NOT use <div>, class, style, itemscope/itemtype/itemprop, or Markdown / code fences (no \`\`\`).
- Translate visible text to ${humanLang}. Never translate brand/model names — keep them in Latin script.
- If NO answerable questions can be formed from the input, output nothing at all (empty response).

[Original Description]
${originalDescription || 'None provided.'}

[Tech Specs]
${techSpecs || 'None provided.'}

[Supplemental Content]
${supplementalContent || 'None provided.'}`,
  };
}

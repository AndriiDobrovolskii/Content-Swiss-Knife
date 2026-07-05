import { PromptPayload } from '../prompt-core/payload';

const TASK_FAQ_SYSTEM = `You are an experienced SEO specialist who professionally optimizes commercial sites
in 3D printing, equipment, and additive manufacturing. You write expert, technically accurate, relevant
FAQ blocks for product pages. Always argue the advantages of the specific product in question.
No preamble, no explanations — output the FAQ artifact only.`;

/**
 * Generates a schema-free FAQ artifact for one language, per Schema v3.0 §8.
 * The Journal theme native FAQ module supplies the FAQPage schema — do NOT add any here.
 *
 * Output format (v3): each item is a plain-text question in <h3> followed immediately by an
 * HTML answer (allowed tags: <p>, <strong>, <b>, <ul>, <li>). No wrapper <div>/class —
 * the app parser walks <h3> + siblings.
 * If the inputs contain nothing answerable, the model returns an empty response.
 *
 * @param currencySymbol  Store's currency symbol (e.g. "€", "₴", "zł", "$").
 *                        Used to enforce correct currency formatting for any prices in the FAQ.
 * @param localeOverlay   Optional per-locale ToV overlay (e.g. buildNativeLangOverlay() output) —
 *                        same mechanism Task A uses for native generation, so locale-specific
 *                        vocabulary/orthography/calque rules also reach this separate FAQ call.
 */
export function buildPromptFaq(
  productName: string,
  originalDescription: string,
  techSpecs: string,
  supplementalContent: string,
  humanLang: string,
  currencySymbol: string,
  localeOverlay?: string,
): PromptPayload {
  const overlay = localeOverlay?.trim() ? `\n\n[LOCALE OVERLAY]\n${localeOverlay.trim()}` : '';
  return {
    systemBlocks: [{ text: TASK_FAQ_SYSTEM, cache: true }],
    userContent: `[TASK]
Create an expert FAQ block for "${productName}" in ${humanLang}, based ONLY on the provided sources.${overlay}

[CONTENT RULES]
- Answer-first: the first sentence of each answer is a direct, clear answer to the question. Details and
  argued advantages come after.
- Conciseness & UX: keep questions short (≈5–7 words) and phrased like a real person solving a practical
  task — not encyclopedic. Focus on the outcome for the buyer.
- Count: 3–5 question/answer pairs. 5 is the absolute maximum per Schema v3.0 §8 — do NOT exceed it.
- Sources: use ONLY facts from [Original Description], [Tech Specs] and [Supplemental Content]. No "water",
  no generic filler (e.g. "it depends on your needs"). If a question cannot be answered from the input,
  do NOT invent it — choose a different question. Answers must be self-sufficient (understandable without
  reading the main description).
- CURRENCY: if source content includes prices, always format them using the store currency symbol
  "${currencySymbol}". Do NOT copy USD ($) prices for non-USD stores — either convert using the symbol
  "${currencySymbol}" or omit the price if the exact local price is unknown.

[QUESTION TYPES — pick the most relevant for this product]
- Use-cases: which tasks, industries (prototyping, dentistry, jewellery, engineering) or conditions it
  suits best ("What is…?" explainer questions also welcome).
- Compatibility & integration: which equipment, software or materials it works with; adapters/modules needed?
- Pain-points: how it improves the workflow (automation, speed, accuracy, less waste).
- Operation & maintenance: setup difficulty for a beginner, consumable lifespan, operating requirements
  (temperature, ventilation, care). How-to questions ("How to avoid print warping off the bed?").
- Advantages & package: why this brand/model beats alternatives; what's in the box (does it work out of
  the box?); comparison questions ("How does A differ from B?").

[QUESTION RULES]
- Formulate as real customers ask — not as technical documentation.
- Each answer: 2–4 sentences, factual, no filler. Answer-first principle.
- Avoid: "It depends on your needs" — that answer has no value.
- Answers must be self-contained — understandable without reading the main description.

[OUTPUT FORMAT — Schema v3.0 §8 artifact]
Each item: <h3>Question text?</h3> followed immediately by <p>Answer text.</p>
Allowed answer tags: <p>, <strong>, <b>, <ul>, <li>.
NO wrapper divs, NO class attributes, NO FAQPage/schema.org markup.

[Original Description]:
${originalDescription || 'Not provided.'}

[Tech Specs]:
${techSpecs || 'Not provided.'}

[Supplemental Content]:
${supplementalContent || 'Not provided.'}`,
  };
}
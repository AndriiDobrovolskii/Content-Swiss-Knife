import { PromptPayload } from '../prompt-core/payload';

const TASK_FAQ_SYSTEM = `You are an experienced SEO specialist who professionally optimizes commercial sites
in 3D printing, equipment, and additive manufacturing. You write expert, technically accurate, relevant
FAQ blocks for product pages. Always argue the advantages of the specific product in question.
Output the FAQ artifact only: the first character of your output is the "<" of the first <h3>.`;

/**
 * Generates a schema-free FAQ artifact for one language, per Schema v3.0 §8.
 * The Journal theme native FAQ module supplies the FAQPage schema — the artifact stays schema-free.
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
Create an expert FAQ block for "${productName}" in ${humanLang}, based exclusively on the provided sources.${overlay}

[OUTPUT CONTRACT — Schema v3.0 §8 artifact]
Emit exactly one artifact: 3–5 question/answer pairs — 5 is the hard maximum per Schema v3.0 §8.
Each pair: <h3>Question text?</h3> followed immediately by the answer, composed only of these tags:
<p>, <strong>, <b>, <ul>, <li>. Start the output at the first <h3>; end it after the last answer's
closing tag (wrapper divs, class attributes, and FAQPage/schema.org markup stay out — the CMS FAQ
module supplies the schema). When zero questions are answerable from the sources, return an empty
response.

[CONTENT RULES]
- Answer-first: the first sentence of each answer is a direct, clear answer to the question;
  details and argued advantages come after. Each answer: 2–4 sentences, factual.
- Questions: keep each ≈5–7 words, phrased as real customers ask when solving a practical task —
  conversational, focused on the buyer outcome.
- Self-sufficiency: write every answer to be understandable without reading the main description.
- Sources: draw every fact from [Original Description], [Tech Specs] and [Supplemental Content].
  When a candidate question lacks source facts to answer it, choose a different question that the
  sources do answer. Where a filler answer like "it depends on your needs" would appear, substitute
  the concrete deciding factor from the sources ("choose the 0.4 mm nozzle for speed and the
  0.2 mm for fine detail").
- CURRENCY: format every price that appears with the store currency symbol "${currencySymbol}".
  Where a USD ($) price appears in the source for a non-USD store, state the commercial fact with
  zero price figures instead ("available to order") — the exact local price lives on the price tag,
  outside the FAQ.

[QUESTION TYPES — pick the most relevant for this product]
- Use-cases: which tasks, industries (prototyping, dentistry, jewellery, engineering) or conditions
  it suits best ("What is…?" explainer questions also welcome).
- Compatibility & integration: which equipment, software or materials it works with;
  adapters/modules needed?
- Pain-points: how it improves the workflow (automation, speed, accuracy, less waste).
- Operation & maintenance: setup difficulty for a beginner, consumable lifespan, operating
  requirements (temperature, ventilation, care). How-to questions ("How to avoid print warping
  off the bed?").
- Advantages & package: why this brand/model beats alternatives; what's in the box (does it work
  out of the box?); comparison questions ("How does A differ from B?").

[Original Description]:
${originalDescription || 'Not provided.'}

[Tech Specs]:
${techSpecs || 'Not provided.'}

[Supplemental Content]:
${supplementalContent || 'Not provided.'}`,
  };
}

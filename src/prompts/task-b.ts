import { getStore } from '../prompt-core/constants';
import { PromptPayload } from '../prompt-core/payload';

/**
 * @deprecated Currency is no longer injected into the Task B prompt. Price is not
 * available at this pipeline stage; price/priceCurrency are emitted via Schema.org
 * Offer microdata instead. Retained only for backward compatibility with existing
 * importers — do not use for new SEO-metadata logic.
 */
export function resolveCurrencySymbol(storeName: string): string {
  return getStore(storeName).currencySymbol;
}

const TASK_B_SYSTEM = `You are an SEO specialist for 3D-technology e-commerce stores.
Output is always raw JSON only — no preamble, no Markdown fences, no explanations.`;

// NOTE: This block is STATIC (no interpolation) to keep the system-block prompt cache stable.
// All per-request data (store, product, languages, context) lives in userContent.
const TASK_B_INSTRUCTION = `TASK B — GENERATE SEO METADATA (RAW JSON ONLY, no Markdown, no fences).

[FIELD TYPES] All four fields are strings. Counts are GRAPHEME counts: every symbol
(✅ ➔ ✨ | + % !) and every accented/Cyrillic character counts as exactly 1.

— H1 —
Formula: "[Product] [Model/Series]". Strip marketing fluff (Buy / Best Price / New / Cheap / Sale).
Strictly technical. This exact string is the TITLE CORE — reuse it verbatim at the start of meta_title.
Example: "Creality K1 Max" (NOT "Buy Creality K1 Max Cheap").

— meta_title —
Base form: "[H1 core] - [Benefit] | [Site Suffix]".
The title MUST begin with the H1 core, character-for-character (this aligns title↔H1 and resists
Google rewrites; numbers/model codes present in both are preserved ~97% of the time).
Apply this DEGRADATION CASCADE in order until the title fits the per-locale Title budget below:
  1. Full form: "[H1 core] - [Benefit] | [Site Suffix]".
  2. If over budget → DROP the benefit: "[H1 core] | [Site Suffix]".
  3. If still over budget → DROP the suffix: "[H1 core]".
  4. The H1 core is NEVER truncated and NEVER cut mid-word. If even the bare core exceeds budget,
     return the bare core unchanged (over-budget is acceptable only for the irreducible core).
Symbols in titles: DEFAULT NONE. Do not add ✅/➔/✨ to titles unless the model name itself contains one.
No flag/package/complex emoji anywhere.

— meta_description —
Pattern: Hook + Solution + Spec + CTA. Start with a verb.
FRONT-LOAD the primary keyword + USP + one hard spec (size / speed / build volume / power) inside the
first 115 characters (mobile-safe zone — this part must read complete even when truncated on mobile).
End with a CTA + ➔ (or the locale equivalent), as a desktop bonus tail.
Do NOT invent prices, discounts, currency values, or availability — that data is not provided here and
is emitted separately via Schema.org Offer. Never fabricate numbers you were not given.
Symbols ✅ / ➔ are allowed ONLY in the description, and NEVER at the very start or very end of the string
(a leading/trailing symbol is ignored or stripped by search engines). One symbol max.

— PER-LOCALE BUDGETS (grapheme counts) —
Title / Description max. German runs longer and renders wider; Cyrillic is wider than Latin.
  en-GB, en-US, en-ES : Title ≤ 60 | Desc ≤ 150
  es-ES, es-MX        : Title ≤ 60 | Desc ≤ 150
  pl-PL               : Title ≤ 60 | Desc ≤ 150
  uk-UA, ru-UA        : Title ≤ 55 | Desc ≤ 150
  de-DE               : Title ≤ 50 | Desc ≤ 150
  (any other locale)  : Title ≤ 55 | Desc ≤ 150
Count graphemes before returning. If over budget, apply the title cascade or shorten the description
Hook/Spec — but always keep the front-loaded keyword + USP intact.

— FEW-SHOT ANCHORS —
Short product (benefit kept, en-US, budget 60/150):
  H1: "Creality K1 Max"
  meta_title: "Creality K1 Max - 600mm/s CoreXY 3D Printer | 3DDevice"   (54)
  meta_description: "Print large parts fast with the Creality K1 Max: 300×300×300mm build, 600mm/s, AI camera. Order yours today ➔"   (110)
Long product (benefit dropped, then suffix dropped to fit de-DE budget 50):
  H1: "Anycubic Photon Mono M5s Pro 14K"
  meta_title: "Anycubic Photon Mono M5s Pro 14K"   (32, core only; "- Harz-3D-Drucker | EXPERT3D" would overflow)
  meta_description: "Drucken Sie hochpräzise Modelle mit dem Anycubic Photon Mono M5s Pro: 14K-Display, 13,6×7,6cm, schneller Harzdruck. Jetzt bestellen ➔"   (133)

— OUTPUT SHAPE —
{"site_name":"…","seo_data":[{"language":"…","h1":"…","meta_title":"…","meta_description":"…"}]}
Return exactly one entry per requested language.`;

export function buildPromptB(
  storeName: string,
  productName: string,
  languages: string[],
  contextHtmlOrDescription?: string,
): PromptPayload {
  const store = getStore(storeName);
  const context = contextHtmlOrDescription
    ? `\n[CONTEXT — extract a USP/spec from here]:\n${contextHtmlOrDescription.substring(0, 1000)}` : '';
  const userContent = `[INPUT DATA]
[Store Name]: "${storeName}"
[Site Suffix]: "${store.siteSuffix}"
[Product Name]: "${productName}"
[Target Languages]: ${languages.join(', ')}${context}`;
  return {
    systemBlocks: [
      { text: TASK_B_SYSTEM,        cache: true },
      { text: TASK_B_INSTRUCTION,   cache: true },
    ],
    userContent,
  };
}

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
PRIMARY RULE — CONSUME, DO NOT GENERATE: When the [LOCALIZED NAMES] block in [INPUT DATA]
provides a name for this locale, use that string VERBATIM (character-for-character) as the
\`h1\` field AND the TITLE CORE. It is already localized upstream (word order, head-noun
translation, number format, locale decimal separator) and MUST match the storefront
product-name field byte-for-byte. Never re-order, re-translate, reformat, transliterate,
or strip it.
FALLBACK — only when NO localized name is given for this locale: derive the core via the
formula "[Product] [Model/Series]", strip fluff (Buy / Best Price / New / Cheap / Sale),
keep it strictly technical. Example: "Creality K1 Max" (NOT "Buy Creality K1 Max Cheap").
The resulting string (consumed or fallback) is the TITLE CORE used by meta_title below.

— meta_title —
MUST begin with the H1 core verbatim (character-for-character). This aligns title↔H1 and
resists Google rewrites; shared model numbers/specs are preserved ~97% of the time.
[Site Suffix] comes from [INPUT DATA] — use it VERBATIM. Never copy, infer, or reuse
suffixes from the examples below; "StoreName" in anchors is a structural placeholder only.
[Site Suffix] is MANDATORY — present at steps 1 AND 2. Drop only when step 2 still overflows.
Apply this DEGRADATION CASCADE in order until the result fits the per-locale Title budget:
  1. "[H1 core] - [Benefit] | [Site Suffix]"    ← normal case
  2. "[H1 core] | [Site Suffix]"               ← drop benefit, KEEP suffix
  3. "[H1 core]"                               ← drop suffix (LAST RESORT only)
  4. H1 core is NEVER truncated mid-word. If bare core itself exceeds budget, return it unchanged.
Symbols: DEFAULT NONE in titles. Do not add ✅ ➔ ✨ unless already in the product name.
No flag, package, or complex emoji anywhere.

— meta_description —
Pattern: Hook + Solution + Spec + CTA. MUST start with a verb in EVERY locale (including de-DE).
FRONT-LOAD: primary keyword + USP + one hard spec (size / speed / build volume / power) within the
first 115 characters — this zone must read as complete even when truncated on mobile (>60% of traffic).
Close with a locale-native CTA phrase ending in ➔ as a desktop-visible tail:
  en → "Order now ➔"  |  pl → "Zamów ➔"  |  de → "Jetzt bestellen ➔"
  uk → "Замовте зараз ➔"  |  ru → "Закажите сейчас ➔"  |  es → "Compra ahora ➔"
Symbol rules:
  • ✅ and ➔ allowed only in the description; one symbol max total.
  • Do NOT place ✅ or ➔ as a standalone character at the very start of the string.
  • ➔ closing a CTA phrase at the end of the string ("Order now ➔") is EXPLICITLY ALLOWED.
Do NOT invent prices, discounts, currency values, or availability — not provided here;
those are emitted separately via Schema.org Offer. Never fabricate numbers not given in the input.

— PER-LOCALE BUDGETS (grapheme counts) —
German runs 20–30% longer; Cyrillic renders wider than Latin — budgets reflect this.
  en-GB, en-US, en-ES : Title ≤ 60 | Desc ≤ 150
  es-ES, es-MX        : Title ≤ 60 | Desc ≤ 150
  pl-PL               : Title ≤ 60 | Desc ≤ 150
  uk-UA, ru-UA        : Title ≤ 55 | Desc ≤ 150
  de-DE               : Title ≤ 50 | Desc ≤ 150
  (any other locale)  : Title ≤ 55 | Desc ≤ 150
Count graphemes BEFORE returning. If over budget: apply title cascade; shorten description
Hook/Spec — never cut the front-loaded keyword + USP.

— FEW-SHOT ANCHORS —
"StoreName" below is a placeholder — always substitute the exact [Site Suffix] from [INPUT DATA].

ANCHOR 1 — short product → step 1 full form (en-US, budget 60 / 150):
  H1:               "Creality K1 Max"
  meta_title:       "Creality K1 Max - 600mm/s CoreXY 3D Printer | StoreName"     [55 ✓ step 1]
  meta_description: "Print large parts fast: Creality K1 Max, 300×300×300mm build, 600mm/s speed, AI lidar camera included. Order now ➔"  [114 ✓ mobile-safe]

ANCHOR 2 — medium product → step 2, suffix kept (en-US, budget 60):
  H1:               "Bambu Lab PETG Translucent Orange 1.75mm 1kg"                [44]
  step 1 attempt:   "Bambu Lab PETG Translucent Orange 1.75mm 1kg - AMS Filament | StoreName"  → 70 > 60 ✗
  step 2 result:    "Bambu Lab PETG Translucent Orange 1.75mm 1kg | StoreName"     [55 ✓ suffix kept]
  meta_description: "Get crystal-clear PETG parts fast: Bambu Lab PETG Translucent Orange, 1.75mm ±0.03mm, 1kg, RFID chip for AMS. Order now ➔"  [121 ✓ CTA from char 110]

ANCHOR 3 — same product → step 3, bare core (de-DE, budget 50):
  H1:               "Bambu Lab PETG Translucent Orange 1.75mm 1kg"                [44]
  step 2 attempt:   "Bambu Lab PETG Translucent Orange 1.75mm 1kg | StoreName"   → 55 > 50 ✗
  step 3 result:    "Bambu Lab PETG Translucent Orange 1.75mm 1kg"                [44 ✓ bare core]
  meta_description: "Drucken Sie transparente Bauteile mit Bambu Lab PETG Translucent Orange: 1,75mm ±0,03mm, 1kg, RFID-Chip für AMS. Jetzt bestellen ➔"  [130 ✓ CTA from char 113]

ANCHOR 4 — localized name as core (uk-UA, budget 55): localized name PROVIDED = category-first.
  Localized name: "Сопло Bambu Lab загартована сталь 0,4 мм"
  h1:               "Сопло Bambu Lab загартована сталь 0,4 мм"                    [verbatim — NOT re-ordered to brand-first, NOT re-translated]
  meta_title:       "Сопло Bambu Lab загартована сталь 0,4 мм | StoreName"        [≈52 ✓ step 2, suffix kept]
  meta_description: "Друкуйте точні деталі: сопло Bambu Lab із загартованої сталі 0,4 мм, підвищена зносостійкість. Замовте зараз ➔"
  Note: the core is the localized name UNCHANGED; the cascade only appends/drops the benefit and suffix around it.

— OUTPUT SHAPE —
{"site_name":"…","seo_data":[{"language":"…","h1":"…","meta_title":"…","meta_description":"…"}]}
Return exactly one entry per requested language.`;

export function buildPromptB(
  storeName: string,
  productName: string,
  languages: string[],
  contextHtmlOrDescription?: string,
  localizedNames?: Record<string, string>,   // BCP-47 lang → localized product name (Task Slug)
): PromptPayload {
  const store = getStore(storeName);
  const context = contextHtmlOrDescription
    ? `\n[CONTEXT — extract a USP/spec from here]:\n${contextHtmlOrDescription.substring(0, 1000)}` : '';
  const namesBlock = localizedNames && Object.keys(localizedNames).length
    ? '\n[LOCALIZED NAMES — use VERBATIM as h1 + title core, one per locale]:\n' +
      languages
        .map(l => `  ${l}: "${localizedNames[l] ?? '(none — use formula fallback)'}"`)
        .join('\n')
    : '';
  const userContent = `[INPUT DATA]
[Store Name]: "${storeName}"
[Site Suffix]: "${store.siteSuffix}"
[Product Name]: "${productName}"
[Target Languages]: ${languages.join(', ')}${namesBlock}${context}`;
  return {
    systemBlocks: [
      { text: TASK_B_SYSTEM,        cache: true },
      { text: TASK_B_INSTRUCTION,   cache: true },
    ],
    userContent,
  };
}

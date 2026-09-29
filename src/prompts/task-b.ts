import { getStore, NO_LEAKED_REASONING_CLAUSE, NO_LEAKED_REASONING_JSON_ADDENDUM } from '../prompt-core/constants';
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
Output is always raw JSON only — no preamble, no Markdown fences, no explanations.

${NO_LEAKED_REASONING_CLAUSE}
${NO_LEAKED_REASONING_JSON_ADDENDUM}`;

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
meta_title itself NEVER carries a site-name suffix — the approved template has none.
[Site Suffix] still comes from [INPUT DATA] and is still used VERBATIM, but ONLY to populate
the JSON's own top-level "site_name" field (see OUTPUT SHAPE below) — never copy, infer, or
append it inside meta_title. "StoreName" in the few-shot anchors below is a placeholder for
that separate field only, not a component of any meta_title example.
Apply this DEGRADATION CASCADE in order until the result fits the per-locale Title budget:
  1. "[H1 core] - [Localized Category] [Spec]"   ← normal case
  2. "[H1 core] - [Localized Category]"          ← drop [Spec], keep [Localized Category]
  3. "[H1 core]·"                                ← LAST RESORT: drop [Localized Category] and
     [Spec] both, but append a single "·" mark. NEVER return the bare H1 core alone.
[Localized Category] is a short, locale-native generic category term for the product (e.g.
"Colector de Polvo" for es-ES) — derive it from [CONTEXT] below; never invent one, never leave
it in English. [Spec] is the single most differentiating technical value present in [CONTEXT]
(e.g. "6 L"). If [CONTEXT] gives no usable spec value, skip straight to step 2; if it gives
neither, skip straight to step 3 — never emit an empty or placeholder [Localized Category]/[Spec].
H1 core is NEVER truncated mid-word, at any step, including step 3. meta_title is NEVER byte-identical to h1: step 3's "·" mark exists specifically so this can never happen.
If "[H1 core]·" itself still exceeds the per-locale budget, return it anyway, unchanged — never
drop the "·" to force a fit, and never truncate the H1 core to force a fit.
Symbols: DEFAULT NONE in titles beyond step 3's own "·" mark. Do not add ✅ ➔ ✨ unless already
in the product name.
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
German runs 20–30% longer; Cyrillic renders wider than Latin — the de-DE budget reflects this.
These budgets sit BELOW the hard acceptance limit (55) on purpose: a real but thin margin of 1
character for the general rows, 4 for de-DE. You cannot count your own characters, so AIM LOW
and let the cascade degrade early. Never treat a budget as a target to fill.
  en-GB, en-US, en-ES : Title ≤ 54 | Desc ≤ 150
  es-ES, es-MX        : Title ≤ 54 | Desc ≤ 150
  pl-PL               : Title ≤ 54 | Desc ≤ 150
  uk-UA, ru-UA        : Title ≤ 54 | Desc ≤ 150
  de-DE               : Title ≤ 51 | Desc ≤ 150
  (any other locale)  : Title ≤ 54 | Desc ≤ 150
Count graphemes BEFORE returning. If over budget: apply title cascade; shorten description
Hook/Spec — never cut the front-loaded keyword + USP.

— FEW-SHOT ANCHORS —

ANCHOR 1 — short product → step 1 full form (en-US, budget 54 / 150):
  H1:               "Creality K1 Max"
  meta_title:       "Creality K1 Max - CoreXY 3D Printer 600mm/s"                 [43 ✓ step 1]
  meta_description: "Print large parts fast: Creality K1 Max, 300×300×300mm build, 600mm/s speed, AI lidar camera included. Order now ➔"  [114 ✓ mobile-safe]

ANCHOR 2 — medium product → step 2, Spec dropped (en-US, budget 54):
  H1:               "Bambu Lab PETG Orange 1kg"                                   [25]
  step 1 attempt:   "Bambu Lab PETG Orange 1kg - Genuine PETG Filament 1.75mm"   → 56 > 54 ✗
  step 2 result:    "Bambu Lab PETG Orange 1kg - PETG Filament"                   [41 ✓ step 2]
  meta_description: "Get crystal-clear PETG parts fast: Bambu Lab PETG Translucent Orange, 1.75mm ±0.03mm, 1kg, RFID chip for AMS. Order now ➔"  [121 ✓ CTA from char 110]

ANCHOR 3 — long product → step 3, bare core plus mark (de-DE, budget 51):
  H1:               "Bambu Lab PETG Translucent Orange 1.75mm 1kg"                [44]
  step 2 attempt:   "Bambu Lab PETG Translucent Orange 1.75mm 1kg - Transparentes Filament"   → 69 > 51 ✗
  step 3 result:    "Bambu Lab PETG Translucent Orange 1.75mm 1kg·"                [45 ✓ step 3]
  meta_description: "Drucken Sie transparente Bauteile mit Bambu Lab PETG Translucent Orange: 1,75mm ±0,03mm, 1kg, RFID-Chip für AMS. Jetzt bestellen ➔"  [130 ✓ CTA from char 113]

ANCHOR 4 — localized name as core (uk-UA, budget 54): localized name PROVIDED = category-first.
  Localized name: "Сопло Bambu Lab 0,4 мм"
  h1:               "Сопло Bambu Lab 0,4 мм"                                      [verbatim — NOT re-ordered to brand-first, NOT re-translated]
  meta_title:       "Сопло Bambu Lab 0,4 мм - Латунне сопло 5 шт"                 [43 ✓ step 1]
  meta_description: "Друкуйте точні деталі: сопло Bambu Lab із загартованої сталі 0,4 мм, підвищена зносостійкість. Замовте зараз ➔"
  Note: the core is the localized name UNCHANGED; the cascade only appends/drops [Localized Category]/[Spec]/the "·" mark around it — never re-touches the core itself.

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
    ? (() => {
        const specsMatch = contextHtmlOrDescription.match(/<section class="specs">[\s\S]*?<\/section>/);
        const proseExcerpt = contextHtmlOrDescription.substring(0, specsMatch ? 500 : 1000);
        const specsExcerpt = specsMatch ? specsMatch[0].substring(0, 500) : '';
        const excerpt = specsExcerpt ? `${proseExcerpt}\n${specsExcerpt}` : proseExcerpt;
        return `\n[CONTEXT — extract [Localized Category] and [Spec] from here]:\n${excerpt}`;
      })()
    : '';
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

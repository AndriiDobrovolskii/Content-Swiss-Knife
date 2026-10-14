import { MASTER_SYSTEM_PROMPT } from '../prompt-core/master-system-prompt';
import { buildDeliveryRegionBlock, taskLangToIso, US_MEASUREMENT_RULES, PRODUCT_NAME_LOCALIZATION, EXPERT3D_TOV_TRANSLATION_OVERLAY, EXPERT3D_PT_LOCALE_TOV, isExpert3dStore, C3D_TOV_TRANSLATION_OVERLAY, isCenter3dPrintStore, UNIT_LOCALIZATION_RULES, UK_SOURCE_ANTICALQUE, NO_LEAKED_REASONING_CLAUSE } from '../prompt-core/constants';
import { PromptPayload } from '../prompt-core/payload';
import { isSimplifiedTemplateId } from '../prompt-core/simplified-templates';
import { SIMPLIFIED_TRANSLATION_CLAUSE } from './simplified-template-blocks';

const IMAGE_PRESERVATION_MANIFEST = `[IMAGE MANIFEST]
TRANSLATION PASS — NOT base generation: [BASE HTML] below already contains the FINAL, approved
<figure> blocks (image figures AND video-embed figures wrapping an <iframe>) from the
source-language description. PRESERVE every existing <figure>...</figure> block exactly as
structured: do NOT strip, remove, regenerate, reorder, merge, split, add, or duplicate any
<figure>, <img>, or <iframe> element. Every attribute stays byte-identical — src, href, loading,
decoding, inline style, width/height — with THREE exceptions: translate the visible text inside
<figcaption> (including its <b> lead-in label) into the target language, translate the <img>
alt="" attribute value into the target language, and translate the <iframe> title="" attribute
value into the target language (it is the frame's accessible name, read aloud by screen readers,
so it must never stay in the source language). Do not otherwise alter the meaning, wording
length, or structure of the figcaption/alt/title beyond translating them; model names, brand
names and numerals stay unchanged. If [BASE HTML] contains zero <figure> blocks, do not
invent any.`;

/**
 * Appended to every Task C variant. The observed regression this guards against: the uk-UA
 * master says «Технічні характеристики» and the de-DE/pl-PL translation comes back
 * "Technische Daten des 3D-Scanners XGRIDS L2 Pro 32/300 Standard Package" — the translator
 * "helpfully" restores a product name the master deliberately dropped, in every heading.
 */
const HEADING_FIDELITY = `[HEADING FIDELITY]
Translate each heading in the form it arrives. NEVER add a product name to a heading that does
not already contain one in [BASE HTML], and never expand a short brand+model name into the full
name with its configuration code or package suffix. If the source heading has no product name,
neither does yours.`;

const HAS_FIGURE_MARKUP = /<figure\b/i;

/**
 * Count `<h3>` category blocks inside `<section class="specs">` so the preservation
 * instruction can state an exact, non-negotiable number instead of asking the model to
 * count for itself (the failure this guards against: the fast model silently dropping
 * repeated/near-identical spec categories while translating — see 2026-07-15 es-ES
 * regression, xTool M1 Ultra SafetyPro, where 4 of 5 categories were dropped).
 */
function countSpecCategories(html: string): number {
  const section = html.match(/<section\s+class="specs"[\s\S]*?<\/section>/i);
  if (!section) return 0;
  return (section[0].match(/<h3\b/gi) ?? []).length;
}

function buildSpecTablePreservation(count: number): string {
  return `[SPEC TABLE PRESERVATION]
TRANSLATION PASS — NOT base generation: [BASE HTML] below contains exactly ${count} <h3>+<table>
category block(s) under <section class="specs">. Reproduce ALL ${count} of them — do NOT omit,
merge, split, or summarize any category, even when categories look repetitive or near-identical
to each other. Translate only the <h3> category label and the <table> cell text (plus locale
number formatting); keep every row and every category exactly as structured. Dropping a category
is a failed translation, not an acceptable shortcut.`;
}

const STANDALONE_SNIPPET_NOTE = `[STANDALONE SNIPPET]
This is a short, self-contained text/HTML fragment submitted directly for translation — not an
excerpt of a longer product description. Translate the [BASE HTML] content below exactly as given;
do not ask for additional context, a Store Name, or a fuller description. Do NOT wrap the output in
any tag, link, or structure (e.g. <a>, <button>, <div>, <p>) that is not already present in the
input — if the input is plain text with no tags, the output must be plain translated text only,
with no added markup, even if the phrase reads like a button or link label.`;

function deriveStoreLabel(storeName: string, targetLang: string): string {
  if (storeName.trim()) return storeName.trim();
  const match = targetLang.match(/\(([^)]+)\)\s*$/);
  return match ? match[1] : 'N/A — standalone snippet, not tied to a specific store';
}

function pack(
  instruction: string,
  html: string,
  storeLabel: string,
  localizedName?: string,
  deliveryBlock = '',
): PromptPayload {
  const context = HAS_FIGURE_MARKUP.test(html) ? IMAGE_PRESERVATION_MANIFEST : STANDALONE_SNIPPET_NOTE;
  const specCount = countSpecCategories(html);
  const specBlock = specCount > 0 ? `\n\n${buildSpecTablePreservation(specCount)}` : '';
  // Dynamic per-product — belongs in userContent, never in a cached system block.
  const h1Lock = localizedName?.trim()
    ? `\n\n[H1 LOCK — NON-NEGOTIABLE]\nThe <h1> of your output MUST be exactly, character-for-character:\n"${localizedName.trim()}"\nDo not re-translate, re-order, reformat, transliterate or truncate it. It is the storefront\nproduct-name field and the SEO meta_title core; any deviation desynchronizes the page.`
    : '';
  return {
    systemBlocks: [
      { text: MASTER_SYSTEM_PROMPT, cache: true },
      { text: instruction, cache: true },
    ],
    userContent: `[Store Name]: ${storeLabel}${deliveryBlock ? '\n' + deliveryBlock : ''}${h1Lock}\n\n${context}${specBlock}\n\n[BASE HTML]:\n${html}`,
  };
}

export function buildPromptC(
  html: string,
  targetLang: string,
  storeName: string,
  websiteGroup?: string,
  templateId?: string,
  opts?: { localizedName?: string; sourceLocale?: string; contentKind?: 'description' | 'faq' },
): PromptPayload {
  // FAQ translation is a separate, additive variant (US-8.1): selected only by the explicit option.
  if (opts?.contentKind === 'faq') {
    return buildFaqTranslationPayload(html, targetLang, storeName, websiteGroup, opts.sourceLocale);
  }
  // Select the localization-specific instruction first…
  let instruction: string;
  let expert3dEsSelected = false;
  let expert3dPtSelected = false;
  if (targetLang === 'European English' || targetLang === 'European English (EXPERT3D)') {
    instruction = EU_EN_INSTRUCTION;
  } else if ((targetLang === 'Ukrainian' && websiteGroup === 'US') || targetLang === 'Ukrainian (Expert-3DPrinter)') {
    instruction = US_UK_INSTRUCTION;
  } else if (targetLang.includes('American English') || targetLang.includes('American Spanish')) {
    instruction = usInstruction(targetLang);
  } else if (targetLang === 'Spanish (EXPERT3D)' || (targetLang === 'ES' && isExpert3dStore(storeName))) {
    instruction = EXPERT3D_ES_INSTRUCTION;
    expert3dEsSelected = true;
  } else if (targetLang === 'Portuguese (EXPERT3D)' || (targetLang === 'PT' && isExpert3dStore(storeName))) {
    instruction = EXPERT3D_PT_INSTRUCTION;
    expert3dPtSelected = true;
  } else {
    instruction = genericInstruction(targetLang);
  }

  // Applies to every variant — see HEADING_FIDELITY's own doc-comment for the regression.
  instruction += `\n\n${HEADING_FIDELITY}`;

  // …then, for a simplified content template (US-2.2), append the "translate only what the master
  // holds" clause so omitted paragraphs stay omitted and no length limit is enforced.
  if (isSimplifiedTemplateId(templateId)) {
    instruction += `\n\n${SIMPLIFIED_TRANSLATION_CLAUSE}`;
  }

  // EXPERT3D Tone of Voice: formal register + forbidden calques + brand voice.
  // Skipped for ES because EXPERT3D_ES_INSTRUCTION already embeds these rules —
  // appending the overlay on top would duplicate them for the same language version.
  if (!expert3dEsSelected && !expert3dPtSelected && (isExpert3dStore(storeName) || targetLang.includes('(EXPERT3D)'))) {
    instruction += `\n\n${EXPERT3D_TOV_TRANSLATION_OVERLAY}`;
  }

  // Center 3D Print "Style B" Tone of Voice: verb-led benefit bullets must survive translation.
  // Placed after the simplified-template clause so the omitted-paragraph rule still wins where
  // both apply — this ToV then governs bullet grammar inside the paragraphs that are present.
  if (isCenter3dPrintStore(storeName)) {
    instruction += `\n\n${C3D_TOV_TRANSLATION_OVERLAY}`;
  }

  // Source-language interference guard. Only fires when translating FROM the uk-UA master —
  // the standalone Translator (no sourceLocale) is unaffected.
  if (opts?.sourceLocale === 'uk-UA') {
    const antiCalque = UK_SOURCE_ANTICALQUE[targetLang];
    if (antiCalque) instruction += `\n\n${antiCalque}`;
  }

  // The delivery region is the STORE's, not the target language's — a uk-UA artifact for a
  // Polish store still ships to Poland and the EU. Omitted entirely (and NOT thrown on) for the
  // standalone Translator, which has no store and no CTA to get wrong.
  const deliveryBlock = storeName.trim()
    ? buildDeliveryRegionBlock(storeName, taskLangToIso(targetLang, storeName))
    : '';

  return pack(instruction, html, deriveStoreLabel(storeName, targetLang), opts?.localizedName, deliveryBlock);
}

// ── Generic (default) translation instruction ──────────────────────────────

function genericInstruction(targetLang: string): string {
  return `TASK C — TRANSLATE HTML TO ${targetLang} (pure HTML body only).
Standalone, complete description. Numeric values IDENTICAL. Preserve structure, classes, inline
styles, <hr> after </section>. Translate visible text + alt="" / title="". Never translate
tags/IDs/classes/URLs/hrefs. Keep brand/model names in Latin script and localize embedded units/quantities: apply
[PRODUCT NAME LOCALIZATION] (a protected name is kept verbatim).
Never alter <img src="">.
${UNIT_LOCALIZATION_RULES}
[NUMBERS] Use the locale decimal/thousands separator everywhere — body prose, headings, captions,
AND spec-table <td> cells alike (Ukrainian/Russian/Polish/Spanish/German → decimal comma). This
includes numbers embedded in a repeated Product Name (e.g. in the spec-table heading or closing
CTA). Never change the digits themselves or the unit — only the separator punctuation localizes.
${PRODUCT_NAME_LOCALIZATION}
[LABELS TO TRANSLATE]
- "Technical specifications" → translate naturally to ${targetLang}. NO product name: the
  source header carries none and adding one is a heading regression.
- "What's in the box" → Ukrainian: "Комплектація" | Russian: "Комплектация" | Polish: "Co w zestawie"
  | German: "Lieferumfang" | Spanish: "Contenido del paquete"
- Brand-guarantee sentence → translate fully
COMMERCIAL CLOSING H2: it is a "why-buy from store" question. Translate it naturally to ${targetLang}
as such (e.g. "Why buy [Product-short] from [Store]?"). Keep trust signals + the brand-guarantee sentence in
the body. Do NOT rewrite it into a transactional "Buy [Product] — price…" headline.
No geographic, brand/store, or added-claim changes. Return ONLY raw HTML.

${NO_LEAKED_REASONING_CLAUSE}`;
}

// ── Specialized variant instructions (localization-specific only; role/format inherited from master) ──

const EU_EN_INSTRUCTION = `TASK C — EUROPEAN ENGLISH COPY EDITING & LOCALIZATION (pure HTML body only).
[EDGE CASE — SAME LANGUAGE INPUT]
If the input is already in English, treat this as Copy Editing & Polishing: apply all European
Localization rules, improve flow, fix grammar, ensure "native European marketing" feel.
Do NOT output the same text unchanged.

[LOCALIZATION RULES]
- STRICTLY British/European English: "colour", "customise", "fibre", "optimise". NOT American English.
- Metric units only (mm, °C, kg). Do NOT use Imperial.
- Tone: Direct, confident, professional but accessible.

${PRODUCT_NAME_LOCALIZATION}

[LABELS TO ADAPT (European English)]
- "Technical specifications" → keep in English, British style. No product name.
- "What's in the Box" → keep (capitalise "Box")
- Commercial closing H2 → "why-buy" British/European English: "Why buy the [Product-short] from [Store]?". Keep the store-trust signals and brand guarantee in the body.
[CONSTRAINTS]
- Do NOT translate Brand/Model Names (Creality, Ender, Bambu Lab); keep English brand-first order and "pcs" (see [PRODUCT NAME LOCALIZATION]).
- Do NOT alter <img src="…"> URLs.
- Do NOT add marketing claims not in the source.
- Translate alt="…" and title="…" attribute values.
- Return ONLY the HTML content.

${NO_LEAKED_REASONING_CLAUSE}`;

const US_UK_INSTRUCTION = `TASK C — UKRAINIAN TRANSLATION FOR US MARKET (pure HTML body only).
Translate the input into high-converting Ukrainian for a product sold in the US market.

[MEASUREMENT CONSTRAINT — CRITICAL]
If the source contains Imperial units (inches, lbs), the Ukrainian translation MUST preserve
those Imperial units (дюйми, фунти). Do NOT convert them to Metric.
${UNIT_LOCALIZATION_RULES}
[US EXCEPTION] Imperial units from the source stay Imperial (дюйми, фунти) — the
[MEASUREMENT CONSTRAINT] above overrides; never convert to Metric.
[NUMBERS] Use a decimal comma everywhere in Ukrainian output — running text, headings, captions,
AND spec-table <td> cells alike ("1.75 mm" → "1,75 мм"). This includes numbers embedded in a
repeated Product Name. Never change the digits or the unit — only the separator localizes.

${PRODUCT_NAME_LOCALIZATION}

[LABELS TO TRANSLATE (Ukrainian)]
- "Technical specifications" → «Технічні характеристики» (без назви товару)
- "What's in the box" → "Комплектація"
- Commercial closing H2 → "why-buy" Ukrainian: «Чому купити [Product-short] в [Store]?». Keep the store-trust signals and brand guarantee in the body.
- Brand-guarantee sentence → translate fully

[STYLE]
- Tone: Direct, confident, professional but accessible.
- Anti-anglicism: "друк" not "прінт", "ПЗ" not "софт". Established tech terms may stay. Material
  TRADE NAMES ("Nylon 12 Powder", "Nylon 11 GF Powder", "PA12") are proper names — keep verbatim
  in Latin, never "нейлон 12". Generic "nylon" (not the trade name) → paraphrase, don't
  transliterate: "зі склонаповненого нейлону" (GF grades) / "з композитного нейлону" (composite
  grades).

[CONSTRAINTS]
- Do NOT translate Brand/Model Names; "pcs" → "шт."; apply [PRODUCT NAME LOCALIZATION] (a protected name is kept verbatim).
- Do NOT alter <img src="…"> URLs.
- Do NOT add new information.
- Translate alt="…" and title="…".
- Return ONLY the HTML content.

${NO_LEAKED_REASONING_CLAUSE}`;

const EXPERT3D_ES_INSTRUCTION = `TASK C — CASTILIAN SPANISH LOCALIZATION FOR EXPERT3D (pure HTML body only).
Translate/adapt into natural, persuasive Castilian Spanish (es-ES) for EXPERT3D in Valencia, Spain.

[EDGE CASE — SAME LANGUAGE]
If the input is already in Spanish, apply Castilian style improvements and SEO optimization.

[LABELS TO TRANSLATE (Castilian Spanish)]
- "Technical specifications" → "Especificaciones técnicas" (sin el nombre del producto)
- "What's in the box" → "Contenido del paquete"
- Commercial closing H2 → "why-buy" Castilian: "¿Por qué comprar [Product-short] en EXPERT3D?". Keep the store-trust signals and brand guarantee in the body.
- SHOWROOM EXCLUSION: EXPERT3D has no physical showroom — remove any showroom/visit/demo benefit if present in the source CTA.
- Brand-guarantee sentence → translate fully

[CONTENT FIDELITY — TRANSLATE ONLY, DO NOT REWRITE]
This is a translation task, not a content rewrite. Translate the language only — do not invent,
substitute, remove, or "localize" any fact from the source. Brand names, addresses, emails, phone
numbers, carrier names, prices, and country/city references all carry over from the source
exactly; only render them in Castilian Spanish where they are natural-language text (e.g. a
country name like "Ukraine" → "Ucrania" — translate the word, don't change which country it
names). Never replace one entity's real data (address, email, phone, brand) with another's.

[NUMBERS] Use a decimal comma everywhere in Castilian Spanish output — running text, headings,
captions, AND spec-table <td> cells alike ("1.75 mm" → "1,75 mm"). This includes numbers embedded
in a repeated Product Name. Never change the digits or the unit — only the separator localizes.

${PRODUCT_NAME_LOCALIZATION}

[STYLE — CASTILIAN SPANISH — EXPERT3D ToV]
- REGISTER: formal "usted" throughout (B2B industrial capital equipment) — NEVER "tú"/"te"/"tu".
  Active voice: "It is recommended" → "le recomendamos" / "recomendamos".
- Expert-consultant voice: factual, precise, no marketing fluff. Every claim carries a figure or
  a mechanism (Fact → Mechanism → Consequence). Do NOT use: revolucionario, innovador, puntero,
  el mejor, increíble, la elección perfecta, imprescindible.
- Vocabulary: Ordenador, Móvil, Vídeo (accented), Fichero.
  Tech: "Resina" (not "Resin"), "Laminador" (slicer), "Plataforma" (bed).
- Focus on verifiable precision, reliability and professional finishes — stated with specifics.

[CONSTRAINTS]
- Keep brand/model names in original Latin script (Creality, Bambu Lab); es-ES uses "uds"; apply [PRODUCT NAME LOCALIZATION] (a protected name is kept verbatim).
- Do NOT alter <img src="…"> URLs or change hrefs to "#".
- Do NOT add information not in the source.
- Translate alt="…" and title="…".
- Return ONLY the HTML content.

${NO_LEAKED_REASONING_CLAUSE}`;

const EXPERT3D_PT_INSTRUCTION = `TASK C — EUROPEAN PORTUGUESE LOCALIZATION FOR EXPERT3D (pure HTML body only).
Translate/adapt into natural, persuasive European Portuguese (pt-PT) for EXPERT3D, sold to the
Portugal market and shipped from Valencia, Spain.

[EDGE CASE — SAME LANGUAGE]
If the input is already Portuguese, convert any Brazilian forms to European Portuguese and apply
SEO optimization. Never leave pt-BR vocabulary (arquivo/tela/usuário) in the output.

[LABELS TO TRANSLATE (European Portuguese)]
- "Technical specifications" → "Especificações técnicas" (sem o nome do produto)
- "What's in the box" → "Conteúdo da embalagem"
- Commercial closing H2 → "why-buy" European Portuguese: "Porquê comprar [Product-short] na EXPERT3D?".
  Keep the store-trust signals and brand guarantee in the body.
- SHOWROOM EXCLUSION: EXPERT3D has no physical showroom — remove any showroom/visit/demo benefit.
- Brand-guarantee sentence → translate fully.

[CONTENT FIDELITY — TRANSLATE ONLY, DO NOT REWRITE]
This is a translation task, not a content rewrite. Translate the language only — do not invent,
substitute, remove, or "localize" any fact from the source. Brand names, addresses, emails, phone
numbers, carrier names, prices, and country/city references all carry over from the source
exactly; only render them in European Portuguese where they are natural-language text (e.g. a
country name like "Ukraine" → "Ucrânia" — translate the word, don't change which country it
names). Never replace one entity's real data (address, email, phone, brand) with another's.

[NUMBERS] Decimal comma everywhere (running text, headings, captions, spec-table <td> cells,
and numbers embedded in a repeated Product Name): "1.75 mm" → "1,75 mm". Never change digits or unit.

${PRODUCT_NAME_LOCALIZATION}

${EXPERT3D_PT_LOCALE_TOV}

[CONSTRAINTS]
- Keep brand/model names in original Latin script (Creality, Bambu Lab); pt-PT count abbreviation is "un.";
  apply [PRODUCT NAME LOCALIZATION] (a protected name is kept verbatim).
- Do NOT alter <img src="…"> URLs or change hrefs to "#".
- Do NOT add information not in the source.
- Translate alt="…" and title="…".
- Return ONLY the HTML content.

${NO_LEAKED_REASONING_CLAUSE}`;

function usInstruction(targetLang: string): string {
  const isEnglish = targetLang.includes('American English');
  const languageLabel = isEnglish ? 'American English (en-US)' : 'US/Latin American Spanish (es-US)';
  const labelsBlock = isEnglish
    ? `[LABELS TO ADAPT (American English)]
- "Technical specifications" → keep in English. No product name.
- "What's in the box" → "What's in the Box"
- Commercial closing H2 → "why-buy" American English: "Why buy the [Product-short] from [Store] in Houston, TX?". Keep the store-trust signals and brand guarantee in the body.`
    : `[LABELS TO TRANSLATE (US Spanish es-MX)]
- "Technical specifications" → "Especificaciones técnicas" (sin el nombre del producto)
- "What's in the box" → "Contenido del paquete"
- Commercial closing H2 → "why-buy" Spanish: "¿Por qué comprar [Product-short] en [Store]?". Keep the store-trust signals and brand guarantee in the body.
- Brand-guarantee sentence → translate fully`;

  return `TASK C — ${languageLabel.toUpperCase()} LOCALIZATION FOR US MARKET (pure HTML body only).
Translate/adapt into ${languageLabel} for the US market.

[EDGE CASE — SAME LANGUAGE]
If the input is already in the target language, treat as Copy Editing & Polishing: apply all US
localization rules, improve flow, ensure "native US marketing" feel.

${US_MEASUREMENT_RULES}

${PRODUCT_NAME_LOCALIZATION}

${labelsBlock}

[LOCALIZATION TABLE]
| Source Concept       | Action / Replacement                              |
|----------------------|---------------------------------------------------|
| "3DDevice"           | Replace with "Expert-3DPrinter"                   |
| Ukraine / Kyiv       | Replace with "USA" / "Texas" / "Houston"          |
| Nova Poshta          | Replace with "US carriers (UPS, FedEx)"           |
| Specific UA delivery | Replace with the [Delivery Region] given above     |
| UA Phone Numbers     | Replace with "our Texas support team"             |
| "3D Plastic"         | Replace with "Filament" (EN) / "Filamento" (ES)  |

[STYLE]
- Follow the [SENTENCE LENGTH] budget for the target locale (US bands are the tightest).
- Benefit-first: "Print warp-free ABS parts thanks to the enclosed chamber."
- US tone: Direct, confident, professional. No "It is important to note that…".

[CONSTRAINTS]
- Do NOT translate Brand/Model Names (Creality, Ender, Bambu Lab); English keeps brand-first + "pcs"; es-MX uses "pzas"; apply [PRODUCT NAME LOCALIZATION] (a protected name is kept verbatim).
- Do NOT alter <img src="…"> URLs.
- Do NOT add new information.
- Translate alt="…" and title="…".
- Return ONLY the HTML content.

${NO_LEAKED_REASONING_CLAUSE}`;
}

// ── FAQ translation variant (US-8.1) ────────────────────────────────────────
// Selected ONLY by the explicit `opts.contentKind === 'faq'` — never by sniffing the HTML (a
// description already carries <h3> spec categories). A FAQ is five elements — <h3>, <p>, <b>,
// <ul>, <li> — so the variant omits MASTER_SYSTEM_PROMPT and every description-only block (closing
// commercial H2, delivery-region sentence, H1 LOCK, spec-table preservation, image manifest,
// section labels). Shared blocks from constants.ts are reused only where they carry no
// description-structure text; the rest are restated compactly below.

const FAQ_TRANSLATION_SYSTEM = `TASK C — TRANSLATE A PRODUCT FAQ (pure HTML body only).
You are a professional technical translator and localizer for an e-commerce store. The input is a FAQ
that was already written and approved in Ukrainian: question headings followed by their answers.
Translate it into the target language given in the next system block.

[ELEMENT-FOR-ELEMENT TRANSLATION — NON-NEGOTIABLE]
Translate the FAQ element for element. Keep every <h3>, <p>, <ul> and <li> of the input, in the same
order and nesting, adding none: do not split, merge, drop, reorder, summarize or expand anything. N
questions in means N questions out; M list items in means M list items out. Do not add an
introduction, a conclusion, a heading, a closing paragraph or any new answer.

[ALLOWED MARKUP]
The only tags are <h3> (a question), <p>, <b>, <ul> and <li>. <b> is the only emphasis tag: keep each
<b> exactly where the input has it, around the translation of the same words, and never convert it
to another tag. Output HTML only — no Markdown, no <br>, no wrapper element, no attributes, no
code fence.

[FIDELITY]
Translate the language only. Every number, model code, brand name and fact carries over exactly; do
not invent, remove or "improve" any claim. Keep brand and model names in Latin script as written in
the input (do not translate, expand, shorten or reorder them); only the embedded unit abbreviations,
quantity abbreviations and number separators localize, as the language rules in the next block say.
Keep a single space between a number and its unit.

${NO_LEAKED_REASONING_CLAUSE}`;

const FAQ_LANGUAGE_NAMES: Record<string, string> = {
  PL: 'Polish', RU: 'Russian', DE: 'German', UA: 'Ukrainian', ES: 'Spanish', PT: 'Portuguese',
};

const FAQ_PRODUCT_NAME_NOTE = `[PRODUCT NAMES]
A product, brand or model name that appears in a question or an answer keeps its Latin-script form.
Translate a generic descriptive word only when it is a plain common noun in the sentence; never
translate, transliterate, expand or shorten the brand or the model. Count abbreviations and unit
abbreviations follow the unit rules above.`;

const FAQ_NUMBERS_DECIMAL_COMMA = `[NUMBERS] Use the decimal comma and a space as the thousands separator in every number, in
questions and answers alike ("1.75 mm" → "1,75 mm"; "12,500" → "12 500"). Never change the digits
or the unit — only the separator punctuation localizes.`;

const FAQ_NUMBERS_DECIMAL_DOT = `[NUMBERS] Use the decimal point and a comma as the thousands separator in every number ("1.75 mm",
"12,500"). Never change the digits or the unit.`;

const FAQ_EXPERT3D_ES_RULES = `[LANGUAGE — CASTILIAN SPANISH (es-ES) FOR EXPERT3D]
Translate into natural Castilian Spanish (es-ES). REGISTER: formal "usted" throughout — NEVER "tú"/"te"/"tu".
Expert-consultant voice: factual and precise, no marketing fluff. Vocabulary: Ordenador, Móvil, Vídeo,
Fichero, "Resina", "Laminador" (slicer), "Plataforma" (bed). The count abbreviation is "uds".
${UNIT_LOCALIZATION_RULES}
${FAQ_NUMBERS_DECIMAL_COMMA}
${FAQ_PRODUCT_NAME_NOTE}`;

const FAQ_EXPERT3D_PT_RULES = `[LANGUAGE — EUROPEAN PORTUGUESE (pt-PT) FOR EXPERT3D]
Translate into natural European Portuguese (pt-PT), NOT Brazilian. REGISTER: formal third person —
never "tu"; "estar a + infinitivo", never the Brazilian gerund. Vocabulary: ecrã (not tela), ficheiro
(not arquivo), utilizador (not usuário), rato (not mouse), equipa (not time), "plataforma de
impressão" (bed), "bico" (nozzle). Post-1990 orthography. The count abbreviation is "un.".
${UNIT_LOCALIZATION_RULES}
${FAQ_NUMBERS_DECIMAL_COMMA}
${FAQ_PRODUCT_NAME_NOTE}`;

const FAQ_EU_EN_RULES = `[LANGUAGE — EUROPEAN ENGLISH]
Translate into STRICTLY British/European English: "colour", "customise", "fibre", "optimise" — NOT
American English. If the input is already English, copy-edit it into native European English; do
not return it unchanged.
[MEASUREMENT] Metric units only (mm, °C, kg). Do NOT use Imperial. Keep unit abbreviations as written.
Keep brand-first order and "pcs" for counts. Tone: direct, confident, professional but accessible.
${FAQ_NUMBERS_DECIMAL_DOT}
${FAQ_PRODUCT_NAME_NOTE}`;

const FAQ_US_UK_RULES = `[LANGUAGE — UKRAINIAN FOR THE US MARKET]
Translate into natural, high-converting Ukrainian for a product sold in the US market.
[MEASUREMENT] Imperial units from the source (inches, lbs) stay Imperial (дюйми, фунти) — never convert them to Metric.
${UNIT_LOCALIZATION_RULES}
${FAQ_NUMBERS_DECIMAL_COMMA}
[STYLE] Direct and professional. Anti-anglicism: "друк" not "прінт", "ПЗ" not "софт"; established tech
terms may stay. The count abbreviation is "шт.".
${FAQ_PRODUCT_NAME_NOTE}`;

function faqUsRules(targetLang: string): string {
  const isEnglish = targetLang.includes('American English');
  const label = isEnglish ? 'American English (en-US)' : 'US/Latin American Spanish (es-US)';
  return `[LANGUAGE — ${label.toUpperCase()} FOR THE US MARKET]
Translate/adapt into ${label} for the US market. If the input is already in the target language,
copy-edit it into native US wording; do not return it unchanged.
${US_MEASUREMENT_RULES}
${UNIT_LOCALIZATION_RULES}
${FAQ_NUMBERS_DECIMAL_DOT}
[STYLE] Direct, confident, professional; benefit-first. ${isEnglish ? 'Keep brand-first order and "pcs" for counts.' : 'The count abbreviation is "pzas".'}
Do not carry Ukraine-specific carriers, phone numbers or places into the US text; use neutral wording
("our support team") instead and invent no specifics.
${FAQ_PRODUCT_NAME_NOTE}`;
}

function faqGenericRules(targetLang: string): string {
  const name = FAQ_LANGUAGE_NAMES[targetLang] ?? targetLang;
  return `[LANGUAGE — ${name.toUpperCase()}]
Translate into natural, native ${name} — idiomatic technical writing, not a word-for-word rendering.
Keep a direct, professional tone.
${UNIT_LOCALIZATION_RULES}
${FAQ_NUMBERS_DECIMAL_COMMA}
${FAQ_PRODUCT_NAME_NOTE}`;
}

const FAQ_C3D_TOV = `[CENTER 3D PRINT ToV — FAQ]
Keep the Center 3D Print voice: a service engineer-consultant explaining what the machine does for
the reader. A bold lead-in that is a verb plus a benefit claim ending in a period stays a verb plus a
benefit claim ending in a period — never re-nominalize it into a noun label plus a colon. The
machine stays the grammatical subject. Keep every question heading in question form.`;

function buildFaqLanguageInstruction(targetLang: string, storeName: string, websiteGroup?: string, sourceLocale?: string): string {
  // Same dispatch conditions as the description path in buildPromptC.
  let instruction: string;
  let expert3dLocaleRules = false;
  if (targetLang === 'European English' || targetLang === 'European English (EXPERT3D)') {
    instruction = FAQ_EU_EN_RULES;
  } else if ((targetLang === 'Ukrainian' && websiteGroup === 'US') || targetLang === 'Ukrainian (Expert-3DPrinter)') {
    instruction = FAQ_US_UK_RULES;
  } else if (targetLang.includes('American English') || targetLang.includes('American Spanish')) {
    instruction = faqUsRules(targetLang);
  } else if (targetLang === 'Spanish (EXPERT3D)' || (targetLang === 'ES' && isExpert3dStore(storeName))) {
    instruction = FAQ_EXPERT3D_ES_RULES;
    expert3dLocaleRules = true;
  } else if (targetLang === 'Portuguese (EXPERT3D)' || (targetLang === 'PT' && isExpert3dStore(storeName))) {
    instruction = FAQ_EXPERT3D_PT_RULES;
    expert3dLocaleRules = true;
  } else {
    instruction = faqGenericRules(targetLang);
  }

  // EXPERT3D Tone of Voice: skipped for ES/PT, whose FAQ rules above already carry the formal register.
  if (!expert3dLocaleRules && (isExpert3dStore(storeName) || targetLang.includes('(EXPERT3D)'))) {
    instruction += `\n\n${EXPERT3D_TOV_TRANSLATION_OVERLAY}`;
  }
  if (isCenter3dPrintStore(storeName)) instruction += `\n\n${FAQ_C3D_TOV}`;

  // Same source-language interference guard as the description path.
  if (sourceLocale === 'uk-UA') {
    const antiCalque = UK_SOURCE_ANTICALQUE[targetLang];
    if (antiCalque) instruction += `\n\n${antiCalque}`;
  }
  return instruction;
}

function buildFaqTranslationPayload(
  html: string,
  targetLang: string,
  storeName: string,
  websiteGroup: string | undefined,
  sourceLocale: string | undefined,
): PromptPayload {
  return {
    systemBlocks: [
      { text: FAQ_TRANSLATION_SYSTEM, cache: true },
      { text: buildFaqLanguageInstruction(targetLang, storeName, websiteGroup, sourceLocale), cache: true },
    ],
    // Dynamic per-product data stays out of the cached system blocks.
    userContent: `[Store Name]: ${deriveStoreLabel(storeName, targetLang)}\n\n[BASE FAQ HTML]:\n${html}`,
  };
}
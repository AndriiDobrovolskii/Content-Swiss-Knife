import { MASTER_SYSTEM_PROMPT } from '../prompt-core/master-system-prompt';
import { US_MEASUREMENT_RULES, CYRILLIC_UNIT_RULES, PRODUCT_NAME_LOCALIZATION, CONSUMABLES_TRANSLATION_OVERLAY, EXPERT3D_TOV_TRANSLATION_OVERLAY, isExpert3dStore } from '../prompt-core/constants';
import { US_MEASUREMENT_RULES, PRODUCT_NAME_LOCALIZATION, CONSUMABLES_TRANSLATION_OVERLAY, EXPERT3D_TOV_TRANSLATION_OVERLAY, isExpert3dStore, UNIT_LOCALIZATION_RULES } from '../prompt-core/constants';
import { PromptPayload } from '../prompt-core/payload';

function pack(instruction: string, html: string): PromptPayload {
  return {
    systemBlocks: [
      { text: MASTER_SYSTEM_PROMPT, cache: true },
      { text: instruction, cache: true },
    ],
    userContent: `[BASE HTML]:\n${html}`,
  };
}

export function buildPromptC(
  html: string,
  targetLang: string,
  storeName: string,
  websiteGroup?: string,
  templateId?: string,
): PromptPayload {
  // Select the localization-specific instruction first…
  let instruction: string;
  let expert3dEsSelected = false;
  if (targetLang === 'European English' || targetLang === 'European English (EXPERT3D)') {
    instruction = EU_EN_INSTRUCTION;
  } else if ((targetLang === 'Ukrainian' && websiteGroup === 'US') || targetLang === 'Ukrainian (Expert-3DPrinter)') {
    instruction = US_UK_INSTRUCTION;
  } else if (targetLang.includes('American English') || targetLang.includes('American Spanish')) {
    instruction = usInstruction(targetLang);
  } else if (targetLang === 'Spanish (EXPERT3D)' || (targetLang === 'ES' && isExpert3dStore(storeName))) {
    instruction = EXPERT3D_ES_INSTRUCTION;
    expert3dEsSelected = true;
  } else {
    instruction = genericInstruction(targetLang);
  }

  // …then, for consumables, append the overlay so the simplified §C1–§C6 structure and the
  // 2500-char limit survive translation regardless of which variant was chosen above.
  if (templateId === 'consumables-resin') {
    instruction += `\n\n${CONSUMABLES_TRANSLATION_OVERLAY}`;
  }

  // EXPERT3D Tone of Voice: formal register + forbidden calques + brand voice.
  // Skipped for ES because EXPERT3D_ES_INSTRUCTION already embeds these rules —
  // appending the overlay on top would duplicate them for the same language version.
  if (!expert3dEsSelected && (isExpert3dStore(storeName) || targetLang.includes('(EXPERT3D)'))) {
    instruction += `\n\n${EXPERT3D_TOV_TRANSLATION_OVERLAY}`;
  }

  return pack(instruction, html);
}

// ── Generic (default) translation instruction ──────────────────────────────

function genericInstruction(targetLang: string): string {
  return `TASK C — TRANSLATE HTML TO ${targetLang} (pure HTML body only).
Standalone, complete description. Numeric values IDENTICAL. Preserve structure, classes, inline
styles, <hr> after </section>. Translate visible text + alt="" / title="". Never translate
tags/IDs/classes/URLs/hrefs. Keep brand/model names in Latin script, but TRANSLATE the generic descriptor and reorder it
category-first, and localize embedded units/quantities — see [PRODUCT NAME LOCALIZATION].
Never alter <img src="">.
${CYRILLIC_UNIT_RULES}
${UNIT_LOCALIZATION_RULES}
[NUMBERS] Use the locale decimal/thousands separator everywhere — body prose, headings, captions,
AND spec-table <td> cells alike (Ukrainian/Russian/Polish/Spanish/German → decimal comma). This
includes numbers embedded in a repeated Product Name (e.g. in the spec-table heading or closing
CTA). Never change the digits themselves or the unit — only the separator punctuation localizes.
${PRODUCT_NAME_LOCALIZATION}
[LABELS TO TRANSLATE]
- "Technical specifications of the [Product Name]" → translate naturally to ${targetLang}
- "What's in the box" → Ukrainian: "Комплектація" | Russian: "Комплектация" | Polish: "Co w zestawie"
  | German: "Lieferumfang" | Spanish: "Contenido del paquete"
- Brand-guarantee sentence → translate fully
COMMERCIAL CLOSING H2: it is a "why-buy from store" question. Translate it naturally to ${targetLang}
as such (e.g. "Why buy [Product] from [Store]?"). Keep trust signals + the brand-guarantee sentence in
the body. Do NOT rewrite it into a transactional "Buy [Product] — price…" headline.
No geographic, brand/store, or added-claim changes. Return ONLY raw HTML.`;
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
- "Technical specifications of the [Product Name]" → keep in English, British style
- "What's in the Box" → keep (capitalise "Box")
- Commercial closing H2 → "why-buy" British/European English: "Why buy the [Product] from [Store]?". Keep the store-trust signals and brand guarantee in the body.
[CONSTRAINTS]
- Do NOT translate Brand/Model Names (Creality, Ender, Bambu Lab); keep English brand-first order and "pcs" (see [PRODUCT NAME LOCALIZATION]).
- Do NOT alter <img src="…"> URLs.
- Do NOT add marketing claims not in the source.
- Translate alt="…" and title="…" attribute values.
- Return ONLY the HTML content.`;

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
- "Technical specifications of the [Product Name]" → "Технічні характеристики [Product Name]"
- "What's in the box" → "Комплектація"
- Commercial closing H2 → "why-buy" Ukrainian: "Чому купити [Product] в [Store]?". Keep the store-trust signals and brand guarantee in the body.
- Brand-guarantee sentence → translate fully

[STYLE]
- Tone: Direct, confident, professional but accessible.
- Anti-anglicism: "друк" not "прінт", "ПЗ" not "софт". Established tech terms may stay.

[CONSTRAINTS]
- Do NOT translate Brand/Model Names; TRANSLATE the generic descriptor, reorder it category-first, "pcs" → "шт." (see [PRODUCT NAME LOCALIZATION]).
- Do NOT alter <img src="…"> URLs.
- Do NOT add new information.
- Translate alt="…" and title="…".
- Return ONLY the HTML content.`;

const EXPERT3D_ES_INSTRUCTION = `TASK C — CASTILIAN SPANISH LOCALIZATION FOR EXPERT3D (pure HTML body only).
Translate/adapt into natural, persuasive Castilian Spanish (es-ES) for EXPERT3D in Valencia, Spain.

[EDGE CASE — SAME LANGUAGE]
If the input is already in Spanish, apply Castilian style improvements and SEO optimization.

[LABELS TO TRANSLATE (Castilian Spanish)]
- "Technical specifications of the [Product Name]" → "Especificaciones técnicas del [Product Name]"
- "What's in the box" → "Contenido del paquete"
- Commercial closing H2 → "why-buy" Castilian: "¿Por qué comprar [Product] en EXPERT3D?". Keep the store-trust signals and brand guarantee in the body.
- SHOWROOM EXCLUSION: EXPERT3D has no physical showroom — remove any showroom/visit/demo benefit if present in the source CTA.
- Brand-guarantee sentence → translate fully

[LOCALIZATION TABLE]
| Source Concept       | Action / Replacement                                   |
|----------------------|--------------------------------------------------------|
| "3DDevice"           | Replace with "EXPERT3D"                                |
| Ukraine / Kyiv       | Replace with "España" / "Valencia"                     |
| Specific UA carriers | Replace with "envío urgente 24/48h"                    |
| UA Phone Numbers     | Replace with "nuestro soporte técnico"                 |
| Prices in UAH/USD    | REMOVE specific prices; use "excelente calidad-precio" |
| "3D Plastic"         | Replace with "Filamento"                               |

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
- Keep brand/model names in original Latin script (Creality, Bambu Lab); TRANSLATE the generic descriptor, reorder it category-first, es-ES uses "uds" (see [PRODUCT NAME LOCALIZATION]).
- Do NOT alter <img src="…"> URLs or change hrefs to "#".
- Do NOT add information not in the source.
- Translate alt="…" and title="…".
- Return ONLY the HTML content.`;

function usInstruction(targetLang: string): string {
  const isEnglish = targetLang.includes('American English');
  const languageLabel = isEnglish ? 'American English (en-US)' : 'US/Latin American Spanish (es-US)';
  const labelsBlock = isEnglish
    ? `[LABELS TO ADAPT (American English)]
- "Technical specifications of the [Product Name]" → keep in English
- "What's in the box" → "What's in the Box"
- Commercial closing H2 → "why-buy" American English: "Why buy the [Product] from [Store] in Houston, TX?". Keep the store-trust signals and brand guarantee in the body.`
    : `[LABELS TO TRANSLATE (US Spanish es-MX)]
- "Technical specifications of the [Product Name]" → "Especificaciones técnicas del [Product Name]"
- "What's in the box" → "Contenido del paquete"
- Commercial closing H2 → "why-buy" Spanish: "¿Por qué comprar [Product] en [Store]?". Keep the store-trust signals and brand guarantee in the body.
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
| Specific UA delivery | Replace with "Fast shipping across the USA"       |
| UA Phone Numbers     | Replace with "our Texas support team"             |
| "3D Plastic"         | Replace with "Filament" (EN) / "Filamento" (ES)  |

[STYLE]
- Follow the [SENTENCE LENGTH] budget for the target locale (US bands are the tightest).
- Benefit-first: "Print warp-free ABS parts thanks to the enclosed chamber."
- US tone: Direct, confident, professional. No "It is important to note that…".

[CONSTRAINTS]
- Do NOT translate Brand/Model Names (Creality, Ender, Bambu Lab); English keeps brand-first + "pcs", es-MX translates descriptor category-first + "pzas" (see [PRODUCT NAME LOCALIZATION]).
- Do NOT alter <img src="…"> URLs.
- Do NOT add new information.
- Translate alt="…" and title="…".
- Return ONLY the HTML content.`;
}
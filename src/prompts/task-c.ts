import { MASTER_SYSTEM_PROMPT } from '../prompt-core/master-system-prompt';
import { US_MEASUREMENT_RULES } from '../prompt-core/constants';
import { PromptPayload } from '../prompt-core/payload';

function pack(instruction: string, html: string): PromptPayload {
  return {
    systemBlocks: [
      { text: MASTER_SYSTEM_PROMPT, cache: true },
      { text: instruction,          cache: true },
    ],
    userContent: `[BASE HTML]:\n${html}`,
  };
}

export function buildPromptC(html: string, targetLang: string, storeName: string, websiteGroup?: string): PromptPayload {
  if (targetLang === 'European English' || targetLang === 'European English (EXPERT3D)') {
    return pack(EU_EN_INSTRUCTION, html);
  }
  if ((targetLang === 'Ukrainian' && websiteGroup === 'US') || targetLang === 'Ukrainian (Expert-3DPrinter)') {
    return pack(US_UK_INSTRUCTION, html);
  }
  if (targetLang.includes('American English') || targetLang.includes('American Spanish')) {
    return pack(usInstruction(targetLang), html);
  }
  if (targetLang === 'Spanish (EXPERT3D)' || (targetLang === 'ES' && ['EXPERT3D','Impresora-3D'].includes(storeName))) {
    return pack(EXPERT3D_ES_INSTRUCTION, html);
  }

  return pack(`TASK C — TRANSLATE HTML TO ${targetLang} (pure HTML body only).
Standalone, complete description. Specs/values/units IDENTICAL. Preserve structure, classes, inline
styles, microdata, <hr> after </section>. Translate visible text + alt="" / title="". Never translate
tags/IDs/classes/URLs/hrefs. Keep brand/model names in Latin script. Never alter <img src="">.
Translate labels: Expert Verdict / Tech Tip / "Technical specifications of the [Product]" /
"What's in the box" / "Why choose [Store]?" / brand-guarantee sentence / FAQ & HowTo headers.
No geographic, brand/store, or added-claim changes. Return ONLY raw HTML.`, html);
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

[LABELS TO ADAPT (European English)]
- "Expert Verdict:" → keep as "Expert Verdict:" (British capitalisation)
- "Tech Tip:" → keep as "Tech Tip:"
- "Technical specifications of the [Product Name]" → keep in English, British style
- "What's in the Box" → keep (capitalise "Box")
- "Why choose [Store]?" → keep

[CONSTRAINTS]
- Do NOT translate Brand/Model Names (Creality, Ender, Bambu Lab).
- Do NOT alter <img src="…"> URLs.
- Do NOT add marketing claims not in the source.
- Translate alt="…" and title="…" attribute values.
- Return ONLY the HTML content.`;

const US_UK_INSTRUCTION = `TASK C — UKRAINIAN TRANSLATION FOR US MARKET (pure HTML body only).
Translate the input into high-converting Ukrainian for a product sold in the US market.

[MEASUREMENT CONSTRAINT — CRITICAL]
If the source contains Imperial units (inches, lbs), the Ukrainian translation MUST preserve
those Imperial units (дюйми, фунти). Do NOT convert them to Metric.

[LABELS TO TRANSLATE (Ukrainian)]
- "Expert Verdict:" → "Експертний висновок:"
- "Tech Tip:" → "Порада фахівця:"
- "Technical specifications of the [Product Name]" → "Технічні характеристики [Product Name]"
- "What's in the box" → "Комплектація"
- "Why choose [Store]?" → "Чому обрати [Store]?"
- Brand-guarantee sentence → translate fully

[STYLE]
- Tone: Direct, confident, professional but accessible.
- Anti-anglicism: "друк" not "прінт", "ПЗ" not "софт". Established tech terms may stay.

[CONSTRAINTS]
- Do NOT translate Brand/Model Names.
- Do NOT alter <img src="…"> URLs.
- Do NOT add new information.
- Translate alt="…" and title="…".
- Return ONLY the HTML content.`;

const EXPERT3D_ES_INSTRUCTION = `TASK C — CASTILIAN SPANISH LOCALIZATION FOR EXPERT3D (pure HTML body only).
Translate/adapt into natural, persuasive Castilian Spanish (es-ES) for EXPERT3D in Valencia, Spain.

[EDGE CASE — SAME LANGUAGE]
If the input is already in Spanish, apply Castilian style improvements and SEO optimization.

[LABELS TO TRANSLATE (Castilian Spanish)]
- "Expert Verdict:" → "Veredicto del experto:"
- "Tech Tip:" → "Consejo técnico:"
- "Technical specifications of the [Product Name]" → "Especificaciones técnicas del [Product Name]"
- "What's in the box" → "Contenido del paquete"
- "Why choose EXPERT3D?" → "¿Por qué elegir EXPERT3D?"
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

[STYLE — CASTILIAN SPANISH]
- Use "Tú" (Tuteo). Creates trust in Spain.
- Active voice. Instead of "It is recommended" → "Te recomendamos".
- Vocabulary: Ordenador, Móvil, Vídeo (accented), Fichero.
  Tech: "Resina" (not "Resin"), "Laminador" (slicer), "Plataforma" (bed).
- Focus on "acabados profesionales" and "fiabilidad".

[CONSTRAINTS]
- Keep brand/model names in original Latin script (Creality, Bambu Lab).
- Do NOT alter <img src="…"> URLs or change hrefs to "#".
- Do NOT add information not in the source.
- Translate alt="…" and title="…".
- Return ONLY the HTML content.`;

function usInstruction(targetLang: string): string {
  const isEnglish = targetLang.includes('American English');
  const languageLabel = isEnglish ? 'American English (en-US)' : 'US/Latin American Spanish (es-US)';
  const labelsBlock = isEnglish
    ? `[LABELS TO ADAPT (American English)]
- "Expert Verdict:" → keep as "Expert Verdict:"
- "Tech Tip:" → keep as "Tech Tip:"
- "Technical specifications of the [Product Name]" → keep in English
- "What's in the box" → "What's in the Box"
- "Why choose [Store]?" → keep`
    : `[LABELS TO TRANSLATE (US Spanish es-MX)]
- "Expert Verdict:" → "Veredicto del experto:"
- "Tech Tip:" → "Consejo técnico:"
- "Technical specifications of the [Product Name]" → "Especificaciones técnicas del [Product Name]"
- "What's in the box" → "Contenido del paquete"
- "Why choose [Store]?" → "¿Por qué elegir [Store]?"
- Brand-guarantee sentence → translate fully`;

  return `TASK C — ${languageLabel.toUpperCase()} LOCALIZATION FOR US MARKET (pure HTML body only).
Translate/adapt into ${languageLabel} for the US market.

[EDGE CASE — SAME LANGUAGE]
If the input is already in the target language, treat as Copy Editing & Polishing: apply all US
localization rules, improve flow, ensure "native US marketing" feel.

${US_MEASUREMENT_RULES}

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
- Break long sentences into shorter US-style punchy ones.
- Benefit-first: "Print warp-free ABS parts thanks to the enclosed chamber."
- US tone: Direct, confident, professional. No "It is important to note that…".

[CONSTRAINTS]
- Do NOT translate Brand/Model Names (Creality, Ender, Bambu Lab).
- Do NOT alter <img src="…"> URLs.
- Do NOT add new information.
- Translate alt="…" and title="…".
- Return ONLY the HTML content.`;
}

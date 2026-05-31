import { SYSTEM_INSTRUCTION } from './system-instruction';

/**
 * Builds Task C prompt — translates base HTML to a target language.
 * Handles special cases: US variants, EXPERT3D Spanish, European English polish.
 */
export function buildPromptC(html: string, targetLang: string, storeName: string, websiteGroup?: string): string {
  // Route special-case variants to dedicated prompts
  if (targetLang === 'European English' || targetLang === 'European English (EXPERT3D)') {
    return buildEuropeanEnglishPrompt(html);
  }
  if ((targetLang === 'Ukrainian' && websiteGroup === 'US') || targetLang === 'Ukrainian (Expert-3DPrinter)') {
    return buildUsUkrainianPrompt(html);
  }
  if (targetLang.includes('American English') || targetLang.includes('American Spanish')) {
    return buildUsPrompt(html, targetLang);
  }
  if (targetLang === 'Spanish (EXPERT3D)') {
    return buildExpert3dSpanishPrompt(html);
  }

  // Standard translation
  const systemInstruction = SYSTEM_INSTRUCTION.replace('{{STORE_NAME}}', storeName);
  return `${systemInstruction}

TASK C — TRANSLATE HTML TO TARGET LANGUAGE
OUTPUT: Pure translated HTML body only. No JSON, no Markdown, no code fences.

[INPUT]
[Base HTML]: (see below)
[Target Language]: ${targetLang}
[Store Name]: ${storeName}

[TRANSLATION FIDELITY — CRITICAL]
- Produce a complete, standalone HTML description.
- Technical specifications, numeric values, and units must remain IDENTICAL.
- Preserve the exact HTML structure, classes, inline styles, and microdata.
- Keep the metric spacing rule ("1.75 mm", not "1.75mm").

[LABELS TO TRANSLATE into ${targetLang}]
- "Expert Verdict:" header
- "Technical specifications of the [Product Name]" header
- "What's in the box" header
- "Why choose [Store Name]?" header
- Brand-guarantee sentence, if present
- Any HowTo / FAQ headers

[ANTI-ANGLICISM — for non-English targets]
Use native equivalents: in Ukrainian "друк" not "прінт", "ПЗ" not "софт".
Established industry terms with no native equivalent (filament, nozzle, extruder) may stay.

[SITE-SPECIFIC OVERRIDE]
If [Store Name] is "EXPERT3D" and [Target Language] is Spanish (es-ES), the orchestrator
will apply URL replacements after this step.

[FORMAT]
Keep <hr> after each </section>. Output the translated HTML body only.

[STRICT TRANSLATION CONSTRAINTS]
1. NO GEOGRAPHIC CHANGES: translate country/city names literally.
2. NO BRAND/STORE CHANGES: keep store names and phone numbers as-is.
3. NO ADDED CLAIMS: do not add warranties, shipping promises, or services not in the source.
4. HTML Integrity: never translate tag names, IDs, classes, URLs, or hrefs.
   Translate visible text AND alt="…" / title="…" attribute values — including all <img> alt texts
   that come from the image manifest.
5. Keep Brand Names (Creality, Formlabs, Bambu Lab) in Latin script. Do NOT transliterate.
6. IMAGE URLs: never alter <img src="…"> values. Only translate the alt attribute text.

CRITICAL OUTPUT RULE: Return ONLY the raw HTML. No markdown code blocks, no extra text.

[BASE HTML]:
${html}`;
}

// ── Specialized variant prompts ─────────────────────────────────────────────

function buildEuropeanEnglishPrompt(html: string): string {
  return `[ROLE]
You are a Native European Marketing Copywriter & Localization Expert.
Your goal is to translate/adapt product descriptions into high-converting European English (en-GB/en-EU).

[EDGE CASE — SAME LANGUAGE INPUT]
If the input is already in English, treat this as a Copy Editing & Polishing task:
apply all European Localization rules, improve flow, fix grammar, ensure "native European marketing" feel.
Do NOT output the same text unchanged.

[LOCALIZATION RULES]
- STRICTLY British/European English: "colour", "customise", "fibre", "optimise". NOT American English.
- Metric units only (mm, °C, kg). Do NOT use Imperial.
- Tone: Direct, confident, professional but accessible.

[NEGATIVE CONSTRAINTS]
- Do NOT translate Brand/Model Names (Creality, Ender, Bambu Lab → keep in English).
- Do NOT alter <img src="…"> URLs.
- Do NOT add marketing claims not in the source.

[HTML RULES]
- Return ONLY the HTML content. No markdown code blocks.
- Preserve <p>, <div>, <ul>, <section>, <strong> tags.
- Translate alt="…" and title="…" attribute values.
- Keep <hr> after each </section>.

[INPUT CONTENT]:
${html}`;
}

function buildUsUkrainianPrompt(html: string): string {
  return `[ROLE]
You are a Native Ukrainian Marketing Copywriter & Localization Expert.
Translate the input into high-converting Ukrainian for a product sold in the US market.

[MEASUREMENT CONSTRAINT — CRITICAL]
If the source contains Imperial units (inches, lbs), the Ukrainian translation MUST preserve
those Imperial units (дюйми, фунти). Do NOT convert them to Metric.

[STYLE RULES]
- Tone: Direct, confident, professional but accessible.
- Anti-anglicism: "друк" not "прінт", "ПЗ" not "софт". Established tech terms may stay.

[NEGATIVE CONSTRAINTS]
- Do NOT translate Brand/Model Names.
- Do NOT alter <img src="…"> URLs.
- Do NOT add new information.

[HTML RULES]
- Return ONLY the HTML content. No markdown code blocks.
- Preserve structure tags and microdata.
- Translate alt="…" and title="…".

[INPUT CONTENT]:
${html}`;
}

const US_MEASUREMENT_RULES = `[MEASUREMENT SYSTEM — MIXED US STANDARD]
CONVERT to Imperial: Printer Dimensions → inches, Build Volume → inches, Printer Weight → lbs, Filament Spool Weight → lbs.
KEEP in Metric: Layer Thickness (μm), Filament Diameter (mm), Nozzle (mm), Temperature (°C), Speed (mm/s), Resin Volume (L/ml).`;

function buildUsPrompt(html: string, targetLang: string): string {
  const isEnglish = targetLang.includes('American English');
  const languageLabel = isEnglish ? 'American English (en-US)' : 'US/Latin American Spanish (es-US)';

  return `[ROLE]
You are a Native US Marketing Copywriter & Localization Expert based in Houston, Texas.
Translate/adapt the input into ${languageLabel} for the US market.

[EDGE CASE — SAME LANGUAGE]
If the input is already in the target language, treat it as Copy Editing & Polishing:
apply all US localization rules, improve flow, ensure "native US marketing" feel.

${US_MEASUREMENT_RULES}

[LOCALIZATION TABLE]
| Source Concept       | Action / Replacement                              |
|----------------------|---------------------------------------------------|
| "3DDevice"           | Replace with "Expert-3DPrinter"                   |
| Ukraine / Kyiv       | Replace with "USA" / "Texas" / "Houston"          |
| Nova Poshta          | Replace with "US carriers (UPS, FedEx)"           |
| Specific UA delivery | Replace with "Fast shipping across the USA"       |
| UA Phone Numbers     | Replace with "our Texas support team"             |
| "3D Plastic"         | Replace with "Filament" (EN) / "Filamento" (ES)  |

[STYLE RULES]
- Change the rhythm: break long sentences into shorter US-style punchy ones.
- Benefit-first: "Print warp-free ABS parts thanks to the enclosed chamber."
- US tone: Direct, confident, professional. No "It is important to note that…".

[NEGATIVE CONSTRAINTS]
- Do NOT translate Brand/Model Names (Creality, Ender, Bambu Lab).
- Do NOT alter <img src="…"> URLs.
- Do NOT add new information.

[HTML RULES]
- Return ONLY the HTML content. No markdown code blocks.
- Preserve structure tags and microdata.
- Translate alt="…" and title="…".
- Keep <hr> after each </section>.

[INPUT CONTENT]:
${html}`;
}

function buildExpert3dSpanishPrompt(html: string): string {
  return `[ROLE]
You are a Native Spanish Copywriter & Localization Expert based in Valencia, Spain.
Translate/adapt the input into natural, persuasive Castilian Spanish (es-ES) for EXPERT3D.

[EDGE CASE — SAME LANGUAGE]
If the input is already in Spanish, apply Castilian style improvements and SEO optimization.

[LOCALIZATION TABLE]
| Source Concept       | Action / Replacement                              |
|----------------------|---------------------------------------------------|
| "3DDevice"           | Replace with "EXPERT3D"                           |
| Ukraine / Kyiv       | Replace with "España" / "Valencia"                |
| Specific UA carriers | Replace with "envío urgente 24/48h"               |
| UA Phone Numbers     | Replace with "nuestro soporte técnico"            |
| Prices in UAH/USD    | REMOVE specific prices; use "excelente calidad-precio" |
| "3D Plastic"         | Replace with "Filamento"                          |

[STYLE RULES — CASTILIAN SPANISH]
- Use "Tú" (Tuteo). Creates trust in Spain.
- Active voice. Instead of "It is recommended" → "Te recomendamos".
- Vocabulary: Ordenador, Móvil, Vídeo (accented), Fichero.
  Tech: "Resina" (not "Resin"), "Laminador" (slicer), "Plataforma" (bed).
- Focus on "acabados profesionales" and "fiabilidad".

[MEASUREMENT] Keep mm, cm, kg, °C. Do NOT use Imperial.

[NEGATIVE CONSTRAINTS]
- Keep brand/model names in original Latin script (Creality, Bambu Lab).
- Do NOT alter <img src="…"> URLs or change hrefs to "#".
- Do NOT add information not in the source.

[HTML RULES]
- Return ONLY the HTML content. No markdown code blocks.
- Preserve structure tags and microdata.
- Translate alt="…" and title="…".
- Keep <hr> after each </section>.

[INPUT CONTENT]:
${html}`;
}

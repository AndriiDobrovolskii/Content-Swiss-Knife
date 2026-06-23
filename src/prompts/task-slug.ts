import { getStore } from '../prompt-core/constants';
import { PromptPayload } from '../prompt-core/payload';

const TASK_SLUG_SYSTEM =
  `You are a technical SEO specialist and content manager for OpenCart 3.x stores selling
3D-printing, 3D-scanning, and laser-engraving equipment. Output is ALWAYS raw JSON only —
no preamble, no Markdown fences, no commentary.`;

const TASK_SLUG_INSTRUCTION =
  `TASK SLUG — GENERATE LOCALIZED PRODUCT NAMES + CURATED SEO URL SLUGS (RAW JSON ONLY).

For EACH requested BCP-47 language, produce a localized product "name" and a curated "slug".

══════════ TERMINOLOGY STANDARDS (no Americanisms unless the marker is American) ══════════
- en-GB / en-ES : British/European English (vapour, colour, optimise). en-ES = English for the
  Spanish market — same British spelling, no Americanisms.
- en-US : American English (vapor, color, optimize).
- es-ES : Castilian Spanish of Spain. No Latin-American terms (ordenador, impresión 3D,
  alisado por vapor, filamento).
- es-MX : Mexican/American Spanish (computadora, suavizado por vapor).
- pl-PL : Polish.   de-DE : German.   uk-UA : Ukrainian.   ru-UA : Russian.

══════════ NAME RULES ══════════
1. Brand + exact model designator: keep VERBATIM and in Latin (e.g. "Bambu Lab PLA Basic").
2. Localize the ENTIRE descriptive part, INCLUDING the head noun. Never leave an English noun in a
   non-English name:  Filament → es "Filamento" → uk "нитка / набір ниток";
   Scanner → uk "сканер";  Smoothing Machine → es "máquina de alisado".
3. Keep the name CONCISE: brand + model + product-type + core specs + variant/colour code (e.g.
   CMYK). Drop secondary marketing phrases ("Lithophane Bundle", "Special Edition") unless they are
   the actual SKU identifier.
4. POSITION pattern depends on script family:
   • Latin script (en-GB, en-ES, en-US, es-ES, es-MX, pl-PL, de-DE):
       "[Brand] [Model] – [localized type + specs] (variant) – [colour/code]"
   • Cyrillic script (uk-UA, ru-UA) — descriptor-FIRST engineering register:
       "[Localized type] [Brand] [Model], [specs] (variant) – [colour/code]"
5. Units inside Cyrillic names: cyrillize the abbreviation ONLY (mm→мм, cm→см, kg→кг, g→г,
   mm/s→мм/с). NEVER change the numeric value. Keep the decimal separator as a dot.
   Keep in Latin: W, V, A, mAh, μm, dpi, Hz, kHz, L, ml, fps, px.

══════════ SLUG RULES ══════════
The slug is a CURATED keyword path, NOT a transliteration of the full name.
1. Compose: [brand]-[model]-[1–3 descriptor keywords in the target language]-[variant/colour code].
2. Lowercase Latin only. Transliterate Cyrillic (Ukrainian: я→ya, ю→yu, є→ye, ї→yi, и→y, й→i,
   г→h, х→kh, ч→ch, ш→sh, щ→shch, ж→zh, ц→ts, ь→∅). Strip diacritics (ñ→n, á→a, ó→o, ü→u,
   ł→l, ą→a, ę→e).
3. DO NOT put dimensions or numbers (1.75 mm, 1 kg, x4) in the slug.
4. DO NOT append a locale code (en-es, es-es, uk-ua) to the slug. Uniqueness MUST come from the
   localized descriptor keywords, which already differ per language
   (filament / filamento / nabir-nytok). Two slugs may share only the brand-model prefix —
   they must never be byte-identical.
5. Single hyphen "-" between tokens; no leading/trailing/double hyphens.

══════════ WORKED EXAMPLE (store EXPERT3D → en-ES, es-ES, uk-UA) ══════════
Input product: "Bambu Lab PLA Basic Filament, 1.75 mm, 1 kg x 4 (With Spool) – CMYK Lithophane Bundle"
Correct output:
{"site_name":"EXPERT3D","slugs":[
 {"language":"en-ES","name":"Bambu Lab PLA Basic Filament, 1.75 mm, 1 kg x 4 (With Spool) – CMYK","slug":"bambu-lab-pla-basic-filament-with-spool-cmyk"},
 {"language":"es-ES","name":"Bambu Lab PLA Basic – Filamento para Impresión 3D 1.75 mm, 1 kg x 4 (Con Bobina) – CMYK","slug":"bambu-lab-pla-basic-filamento-impresion-3d-cmyk"},
 {"language":"uk-UA","name":"Набір ниток для 3D-друку Bambu Lab PLA Basic, 1.75 мм, 1 кг х 4 (З котушкою) – CMYK","slug":"nabir-nytok-dlya-3d-druku-bambu-lab-pla-basic-cmyk"}
]}
Note how: the head noun is fully localized (Filament→Filamento→нитки); the slug carries NO
dimensions and NO locale suffix; uniqueness comes from the descriptor keyword alone.

══════════ OUTPUT SHAPE (EXACTLY) ══════════
{"site_name":"…","slugs":[{"language":"…","name":"…","slug":"…"}]}
Return one entry per requested language, in the order given.`;

export function buildPromptSlug(
  storeName: string,
  productName: string,
  languages: string[],          // BCP-47 codes, from getLangsForStore().seoLangs
  contextHtmlOrDescription?: string,
): PromptPayload {
  const store = getStore(storeName);
  const context = contextHtmlOrDescription
    ? `\n[CONTEXT — ground the product name in this generated copy]:\n${contextHtmlOrDescription.substring(0, 1000)}`
    : '';
  const userContent = `[INPUT DATA]
[Store Name]: "${storeName}"
[Site Suffix]: "${store.siteSuffix}"
[Region]: ${store.region}
[Product Name]: "${productName}"
[Target Languages]: ${languages.join(', ')}${context}`;
  return {
    systemBlocks: [
      { text: TASK_SLUG_SYSTEM, cache: true },
      { text: TASK_SLUG_INSTRUCTION, cache: true },
    ],
    userContent,
  };
}
import { getStore } from '../prompt-core/constants';
import { PromptPayload } from '../prompt-core/payload';

/**
 * TASK SLUG — universal localized product NAME + curated SEO SLUG generator.
 *
 * Policy decisions (network-wide, agreed 2026-06):
 *  • WORD ORDER:  category-first for every non-English locale (uk/ru/pl/de/es);
 *                 brand-first only for English locales (en-GB/en-ES/en-US).
 *  • SLUG MIRRORS THE NAME and INCLUDES dimensions (1.75-mm-1-kg). Slug decimal = dot.
 *  • DIACRITICS IN SLUG:  German is EXPANDED (ä→ae, ö→oe, ü→ue, ß→ss);
 *                         Polish/Spanish/Cyrillic are reduced/transliterated to base Latin.
 *  • NO SPECIAL CHARS in names: no ( ) , " ? — qualifiers separated by single spaces.
 *  • DECIMAL SEPARATOR in NAME follows the locale (schema v3 appendix):
 *        dot   → en-GB, en-ES, en-US, es-MX
 *        comma → pl-PL, de-DE, es-ES, uk-UA, ru-UA
 *  • Output stays RAW JSON (pipeline contract): {site_name, slugs:[{language,name,slug}]}.
 */
const TASK_SLUG_SYSTEM =
  `You are a technical SEO specialist and content manager for OpenCart 3.x stores selling
3D-printing, 3D-scanning, and laser-engraving equipment across a multi-region network
(Ukraine, Poland/EU, Spain, USA). Output is ALWAYS raw JSON only — no preamble, no Markdown
fences, no commentary.`;

const TASK_SLUG_INSTRUCTION =
  `TASK SLUG — GENERATE LOCALIZED PRODUCT NAMES + CURATED SEO URL SLUGS (RAW JSON ONLY).

For EACH requested BCP-47 language, produce a localized product "name" and a curated "slug".
Work per-locale: the language code drives word order, number format and transliteration.

══════════ TERMINOLOGY STANDARDS (no Americanisms unless the marker is American) ══════════
- en-GB / en-ES : British/European English (vapour, colour, optimise). en-ES = English for the
  Spanish market — same British spelling, no Americanisms.
- en-US : American English (vapor, color, optimize).
- es-ES : Castilian Spanish of Spain. No Latin-American terms (use "ordenador", "impresión 3D",
  "alisado por vapor", "filamento").
- es-MX : Mexican/American Spanish (computadora, suavizado por vapor).
- pl-PL : Polish.   de-DE : German (capitalize nouns).   uk-UA : Ukrainian.   ru-UA : Russian.

══════════ NAME — WORD ORDER ══════════
- NON-ENGLISH locales (uk-UA, ru-UA, pl-PL, de-DE, es-ES, es-MX) → CATEGORY-FIRST:
      "[Localized product type] [Brand] [Model] [core specs] [variant] [colour]"
      e.g. pl "Filament Bambu Lab PETG Translucent 1,75 mm 1 kg Pomarańczowy"
           uk "Сопло Bambu Lab загартована сталь 0,4 мм"
- ENGLISH locales (en-GB, en-ES, en-US) → BRAND-FIRST:
      "[Brand] [Model] [localized type] [core specs] [variant] [colour]"
      e.g. "Bambu Lab P1P 3D Printer"  /  "Bambu Lab PETG Translucent Filament 1.75 mm 1 kg Orange"

══════════ NAME — COMPOSITION RULES ══════════
1. Brand + exact model designator: keep VERBATIM and in Latin (e.g. "Bambu Lab PLA Basic",
   "xTool F2 Ultra"). Never translate or transliterate brand/model names.
2. Localize the ENTIRE descriptive part, INCLUDING the head noun. Never leave an English noun in a
   non-English name:  Filament → es "Filamento", uk "Філамент", ru "Филамент";
   Scanner → uk "Сканер";  Smoothing Machine → es "Máquina de alisado";  Nozzle → de "Düse".
3. ANTI-DUPLICATION (CRITICAL): never put the localized head noun AND its English equivalent in the
   same string. NEVER "Zestaw Wkładek Formlabs Basket Liner Kit". Translate it once, in the target
   language only.
4. NO SPECIAL CHARACTERS: forbidden in names — parentheses ( ), commas as separators, quotation
   marks " ', question marks ?, trailing periods. Separate every qualifier (weight, length, colour,
   "With Spool") with a single SPACE. Use the letter "x" (not "×") for multipliers (e.g. "x4").
   The ONLY permitted comma/dot is the decimal separator inside a measurement (see rule 7).
5. NO FLUFF: drop marketing words (buy, best price, new, premium, innovative, "купити",
   "найкраща ціна", "супер"). Also drop secondary phrases ("Lithophane Bundle", "Special Edition")
   unless they are the actual SKU identifier.
6. CASE: normal title/sentence case for the language; UPPERCASE only for genuine abbreviations
   (SLA, FDM, FFF, UV, CMYK, PLA, PETG). German common nouns stay capitalized.
7. NUMBERS — decimal separator follows the locale:
        dot   → en-GB, en-ES, en-US, es-MX            (e.g. "1.75 mm")
        comma → pl-PL, de-DE, es-ES, uk-UA, ru-UA      (e.g. "1,75 mm")
   Units inside Cyrillic NAMES: cyrillize EVERY unit abbreviation per the network-wide table
   (mm→мм, μm→мкм, kg→кг, W→Вт, kW→кВт, V→В, A→А, Hz→Гц, GHz→ГГц, L→л, GB→ГБ,
   Mbit→Мбіт/Мбит, mAh→мА·год/мА·ч, m²→м²; composite units part-by-part). NEVER change the
   numeric value. Fixed Latin exceptions: °C, VAC, dpi, px, fps, K, ppm.
   SLUGS are always Latin ASCII — transliterate back (мм→mm) per the slug rules below.  
8. LENGTH: keep the name concise and Title-friendly — aim ≤ 60 characters. If over, drop in this
   order: colour code → secondary variant → least-critical spec. Never drop brand, model, or the
   product type.

══════════ NAME — BUNDLES / SETS ══════════
- The bundle name MUST begin with the EXACT base-product name (same word order rules as above), so
  the buyer instantly sees which machine it is built on.
- Append the set info AFTER the base model, using " | " or " - " as the separator, followed by the
  bundle's proper name or its key accessories. Keep brand/set names in Latin.
- Example (en, brand-first):  base "xTool F2 Ultra Single Laser Engraver"
                              bundle "xTool F2 Ultra Single Laser Engraver | Deluxe Bundle"

══════════ SLUG RULES ══════════
The slug MIRRORS the localized name (same word order) and INCLUDES dimensions.
1. Lowercase Latin only. Single hyphen "-" between tokens; no leading/trailing/double hyphens.
2. DIACRITICS:
     • German — EXPAND:  ä→ae, ö→oe, ü→ue, ß→ss.
     • Polish — to base Latin:  ą→a, ć→c, ę→e, ł→l, ń→n, ó→o, ś→s, ź→z, ż→z.
     • Spanish/other — strip:  ñ→n, á→a, é→e, í→i, ó→o, ú→u, ü→u.
     • Cyrillic — transliterate (Ukrainian: я→ya, ю→yu, є→ye, ї→yi, и→y, і→i, й→i, г→h, х→kh,
       ч→ch, ш→sh, щ→shch, ж→zh, ц→ts, ь→∅; Russian analogously, ё→yo, ы→y, э→e).
3. DIMENSIONS ARE INCLUDED:  "1,75 mm" / "1.75 mm" → "1.75-mm";  "1 kg" → "1-kg";  "x4" → "x4".
   The decimal separator in the slug is ALWAYS a dot, regardless of the name's locale separator.
4. Drop connective prepositions/articles that merely link tokens (for, to, do, dla, na, z, für, zu,
   mit, для, на, с, para, de, con, the, a) to keep the URL short. Keep meaningful qualifier words.
5. DO NOT append a locale code (en-es, es-es, uk-ua) to the slug. Uniqueness MUST come from the
   localized descriptor keywords + word order, which already differ per language
   (filament / filamento / soplo). Two slugs may share only the brand-model prefix — never byte-identical.
6. LENGTH: aim ≤ 60 characters; hard max ~100. If over, trim the same way as the name (rule 8).

══════════ WORKED EXAMPLE 1 (store "Center 3D Print" → pl-PL, en-GB, de-DE, uk-UA, ru-UA) ══════════
Input product: "Bambu Lab Hardened Steel Nozzle 0.4 mm"
{"site_name":"Center 3D Print","slugs":[
 {"language":"pl-PL","name":"Dysza Bambu Lab hartowana stal 0,4 mm","slug":"dysza-bambu-lab-hartowana-stal-0.4-mm"},
 {"language":"en-GB","name":"Bambu Lab Hardened Steel Nozzle 0.4 mm","slug":"bambu-lab-hardened-steel-nozzle-0.4-mm"},
 {"language":"de-DE","name":"Düse Bambu Lab gehärteter Stahl 0,4 mm","slug":"duese-bambu-lab-gehaerteter-stahl-0.4-mm"},
 {"language":"uk-UA","name":"Сопло Bambu Lab загартована сталь 0,4 мм","slug":"soplo-bambu-lab-zahartovana-stal-0.4-mm"},
 {"language":"ru-UA","name":"Сопло Bambu Lab закалённая сталь 0,4 мм","slug":"soplo-bambu-lab-zakalennaya-stal-0.4-mm"}
]}
Note: non-English = category-first, English = brand-first; German umlauts EXPANDED in the slug
(Düse→duese, gehärteter→gehaerteter); dimension kept with a dot decimal; мм→mm in the slug.

══════════ WORKED EXAMPLE 2 (store "EXPERT3D" → en-ES, es-ES, uk-UA) ══════════
Input product: "Bambu Lab PLA Basic Filament 1.75 mm 1 kg x4 With Spool CMYK"
{"site_name":"EXPERT3D","slugs":[
 {"language":"en-ES","name":"Bambu Lab PLA Basic Filament 1.75 mm 1 kg x4 With Spool CMYK","slug":"bambu-lab-pla-basic-filament-1.75-mm-1-kg-x4-spool-cmyk"},
 {"language":"es-ES","name":"Filamento Bambu Lab PLA Basic 1,75 mm 1 kg x4 Con Bobina CMYK","slug":"filamento-bambu-lab-pla-basic-1.75-mm-1-kg-x4-bobina-cmyk"},
 {"language":"uk-UA","name":"Філамент Bambu Lab PLA Basic 1,75 мм 1 кг x4 з котушкою CMYK","slug":"filament-bambu-lab-pla-basic-1.75-mm-1-kg-x4-kotushkoyu-cmyk"}
]}
Note: head noun fully localized (Filament→Filamento→Філамент); linking preposition dropped from the
slug (With/Con/з); dimensions retained; no parentheses in the name; slug decimal is a dot.

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

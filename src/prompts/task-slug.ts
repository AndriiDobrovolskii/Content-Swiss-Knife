import { getStore, UNIT_LOCALIZATION_RULES } from '../prompt-core/constants';
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
 *  • NAME CHARACTER SET: letters, digits, single spaces, locale decimal separator only —
 *    qualifiers separated by single spaces.
 *  • DECIMAL SEPARATOR in NAME follows the locale (schema v3 appendix):
 *        dot   → en-GB, en-ES, en-US, es-MX
 *        comma → pl-PL, de-DE, es-ES, uk-UA, ru-UA
 *  • Output stays RAW JSON (pipeline contract): {site_name, slugs:[{language,name,slug}]}.
 */
const TASK_SLUG_SYSTEM =
  `You are a technical SEO specialist and content manager for OpenCart 3.x stores selling
3D-printing, 3D-scanning, and laser-engraving equipment across a multi-region network
(Ukraine, Poland/EU, Spain, USA). Emit exactly one raw JSON object per request: the first
character of your output is "{" and the last is "}".`;

const TASK_SLUG_INSTRUCTION =
  `TASK SLUG — GENERATE LOCALIZED PRODUCT NAMES + CURATED SEO URL SLUGS (RAW JSON ONLY).

OUTPUT CONTRACT — emit exactly one JSON object of this exact shape, one entry per requested
language, in the order given:
{"site_name":"…","slugs":[{"language":"…","name":"…","slug":"…"}]}

For EACH requested BCP-47 language, produce a localized product "name" (≤ 60 characters target)
and a curated "slug" (≤ 60 characters target, 100 hard max). Work per-locale: the language code
drives word order, number format and transliteration.

══════════ TERMINOLOGY STANDARDS (locale marker drives the variant) ══════════
- en-GB / en-ES : British/European English (vapour, colour, optimise — replaces vapor, color,
  optimize). en-ES = English for the Spanish market — same British spelling.
- en-US : American English (vapor, color, optimize — replaces vapour, colour, optimise).
- es-ES : Castilian Spanish of Spain ("ordenador", "impresión 3D", "alisado por vapor",
  "filamento" — replaces Latin-American "computadora", "suavizado por vapor").
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
1. Keep brand + exact model designator VERBATIM and in Latin (e.g. "Bambu Lab PLA Basic",
   "xTool F2 Ultra") in every locale: where a translation or transliteration of the brand/model
   would appear ("Бамбу Лаб"), write the Latin original ("Bambu Lab").
2. Localize the ENTIRE descriptive part, INCLUDING the head noun, into the target language:
   Filament → es "Filamento", uk "Філамент", ru "Филамент"; Scanner → uk "Сканер";
   Smoothing Machine → es "Máquina de alisado"; Nozzle → de "Düse".
3. SINGLE-RENDER (CRITICAL): render the head noun exactly once, in the target language only —
   where the localized noun and its English source would both appear ("Zestaw Wkładek Formlabs
   Basket Liner Kit"), keep the localized form and the Latin brand/model ("Zestaw wkładek
   Formlabs Basket").
4. CHARACTER SET: compose names from letters, digits, and single spaces; the only permitted
   comma/dot is the decimal separator inside a measurement (rule 7). Substitutions for source
   punctuation: parenthesized qualifier "(4-pack)" → space-separated token "x4"; comma-separated
   qualifiers → space-separated; multiplier sign "×" → letter "x"; quotation marks and trailing
   periods → dropped. Separate every qualifier (weight, length, colour, "With Spool") with a
   single SPACE.
5. VOCABULARY: compose the name only from category, brand, model, spec, variant, and colour
   tokens. Marketing words in the source (buy, best price, new, premium, innovative, "купити",
   "найкраща ціна", "супер") → dropped. Secondary phrases ("Lithophane Bundle", "Special
   Edition") → dropped when decorative, kept when they are the actual SKU identifier.
6. CASE: normal title/sentence case for the language; UPPERCASE for genuine abbreviations only
   (SLA, FDM, FFF, UV, CMYK, PLA, PETG). German common nouns stay capitalized.
7. NUMBERS — decimal separator follows the locale:
        dot   → en-GB, en-ES, en-US, es-MX            (e.g. "1.75 mm")
        comma → pl-PL, de-DE, es-ES, uk-UA, ru-UA      (e.g. "1,75 mm")
   Units inside Cyrillic names (uk-UA / ru-UA): see the same rule used everywhere else in the
   pipeline —
   ${UNIT_LOCALIZATION_RULES}
   SLUGS are always Latin ASCII — transliterate back (мм→mm) per the slug rules below.
8. LENGTH: keep the name concise and Title-friendly — aim ≤ 60 characters. Brand, model, and the
   product type appear in every name regardless of length; when over 60, drop in this order:
   colour code → secondary variant → least-critical spec.

══════════ NAME — BUNDLES / SETS ══════════
- Begin the bundle name with the EXACT base-product name (same word order rules as above), so
  the buyer instantly sees which machine it is built on.
- Append the set info AFTER the base model, using " | " or " - " as the separator, followed by the
  bundle's proper name or its key accessories. Keep brand/set names in Latin.
- Example (en, brand-first):  base "xTool F2 Ultra Single Laser Engraver"
                              bundle "xTool F2 Ultra Single Laser Engraver | Deluxe Bundle"

══════════ SLUG RULES ══════════
The slug MIRRORS the localized name (same word order) and INCLUDES dimensions.
1. Compose the slug from lowercase Latin tokens joined by single hyphens "-"; the slug starts and
   ends on an alphanumeric character (every hyphen sits between two tokens).
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
5. UNIQUENESS comes from the localized descriptor keywords + word order, which already differ per
   language (filament / filamento / soplo): where a locale-code suffix ("-en-es", "-uk-ua") would
   be appended, rely on those localized descriptors instead. Two locales' slugs may share only the
   brand-model prefix — every full slug in the set is a distinct string.
6. LENGTH: aim ≤ 60 characters; hard max 100. When over, trim the same way as the name (rule 8).

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
Note: head noun rendered once, fully localized (Filament→Filamento→Філамент); linking preposition
dropped from the slug (With/Con/з); dimensions retained; name uses plain space-separated tokens;
slug decimal is a dot.`;

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

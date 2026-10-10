import { getStore, UNIT_LOCALIZATION_RULES } from '../prompt-core/constants';
import { PromptPayload } from '../prompt-core/payload';
import { usesSlugContextEnrichment } from '../prompt-core/slug-context-enrichment-flag';

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
0. PROTECTED NAME CARVE-OUT (CRITICAL — read before rules 1-8). When the request carries a
   [PROTECTED PRODUCT NAME] block, the typed Product Name is a brand/model name and is NOT
   localized: every token of it, in the typed order, untranslated and verbatim, appears once as
   one unbroken span in EVERY locale's "name", and its slugified form appears in every "slug".
   This OVERRIDES rules 2, 3, 5 and 8 below for that span (no descriptive word of the typed name is
   translated, dropped, shortened, re-ordered or split to make room, and the 60-character aim never
   removes one). A localized category noun MAY be added in front of the span in non-English
   locales (never inside it, never in place of one of its tokens, and not at all when the typed
   name already starts with a category word); English locales use the typed name as is. Only
   rule 7 applies inside the span: locale number and unit formatting. Without a
   [PROTECTED PRODUCT NAME] block, rules 1-8 apply exactly as written.
1. Keep brand + exact model designator VERBATIM and in Latin (e.g. "Bambu Lab PLA Basic",
   "xTool F2 Ultra") in every locale: where a translation or transliteration of the brand/model
   would appear ("Бамбу Лаб"), write the Latin original ("Bambu Lab").
2. Localize the ENTIRE descriptive part, INCLUDING the head noun, into the target language (a
   PROTECTED name is the exception — rule 0):
   Filament → es "Filamento", uk "Філамент", ru "Филамент"; Scanner → uk "Сканер";
   Smoothing Machine → es "Máquina de alisado"; Nozzle → de "Düse".
3. SINGLE-RENDER (CRITICAL; does not apply inside a PROTECTED name — rule 0): render the head
   noun exactly once, in the target language only —
   where the localized noun and its English source would both appear ("Zestaw Wkładek Formlabs
   Basket Liner Kit"), keep the localized form and the Latin brand/model ("Zestaw wkładek
   Formlabs Basket").
4. CHARACTER SET — GOVERNS THE DESCRIPTIVE PART OF THE NAME ONLY (category, qualifiers,
   colour), NEVER the brand/model span:
   MODEL-DESIGNATOR PUNCTUATION IS PART OF THE MODEL, not source punctuation to normalize. A
   slash, hyphen, plus or dot INSIDE the brand/model token — "L2 Pro 32/300", "X1-Carbon",
   "P1S+", "F/2.0" — is a character of the designator, and rule 1 (VERBATIM) WINS over this
   character set for that span, in every locale. NEVER substitute a space for a slash:
   "32/300" → "32 300" reads as a thousands-separated number (thirty-two thousand three
   hundred), and the pipeline's number normalizer then collapses it to "32300" — the model
   designator is destroyed in the name, the H1, the meta title and every description body.
   For the descriptive part: compose from letters, digits, and single spaces; the only permitted
   comma/dot is the decimal separator inside a measurement (rule 7). Substitutions for source
   punctuation: parenthesized qualifier "(4-pack)" → space-separated token "x4"; comma-separated
   qualifiers → space-separated; multiplier sign "×" → letter "x"; quotation marks and trailing
   periods → dropped. Separate every qualifier (weight, length, colour, "With Spool") with a
   single SPACE.
5. VOCABULARY: compose the name only from category, brand, model, spec, variant, and colour
   tokens. Marketing words in the source (buy, best price, new, premium, innovative, "купити",
   "найкраща ціна", "супер") → dropped. Secondary phrases ("Lithophane Bundle", "Special
   Edition") → dropped when decorative, kept when they are the actual SKU identifier. Nothing is
   dropped from inside a PROTECTED name (rule 0).
6. CASE: normal title/sentence case for the language; UPPERCASE for genuine abbreviations only
   (SLA, FDM, FFF, UV, CMYK, PLA, PETG). German common nouns stay capitalized.
7. NUMBERS — decimal separator follows the locale:
        dot   → en-GB, en-ES, en-US, es-MX            (e.g. "1.75 mm")
        comma → pl-PL, de-DE, es-ES                    (e.g. "1,75 mm")
        comma + CYRILLIC unit → uk-UA, ru-UA           (e.g. "1,75 мм", "20 Вт" — never "20 W")
   Units inside Cyrillic names (uk-UA / ru-UA): see the same rule used everywhere else in the
   pipeline —
   ${UNIT_LOCALIZATION_RULES}
   SLUGS are always Latin ASCII — transliterate back (мм→mm) per the slug rules below.
8. LENGTH: keep the name concise and Title-friendly — aim ≤ 60 characters. Brand, model, and the
   product type appear in every name regardless of length; when over 60, drop in this order:
   colour code → secondary variant → least-critical spec. For a PROTECTED name the whole typed
   name outranks the 60-character aim: the name may be longer, and only the optional localized
   category noun and tokens outside the typed name may be dropped (rule 0).

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
   For a PROTECTED name the slugified typed name is never trimmed (it may exceed 100 if the typed
   name alone does); trim only tokens outside it.

══════════ WORKED EXAMPLE 1 (store "Center 3D Print" → pl-PL, en-GB, de-DE, uk-UA, ru-UA) ══════════
Input product: "Bambu Lab Hardened Steel Nozzle 0.4 mm"   (a PROTECTED name: brand "Bambu Lab")
{"site_name":"Center 3D Print","slugs":[
 {"language":"pl-PL","name":"Dysza Bambu Lab Hardened Steel Nozzle 0,4 mm","slug":"dysza-bambu-lab-hardened-steel-nozzle-0.4-mm"},
 {"language":"en-GB","name":"Bambu Lab Hardened Steel Nozzle 0.4 mm","slug":"bambu-lab-hardened-steel-nozzle-0.4-mm"},
 {"language":"de-DE","name":"Düse Bambu Lab Hardened Steel Nozzle 0,4 mm","slug":"duese-bambu-lab-hardened-steel-nozzle-0.4-mm"},
 {"language":"uk-UA","name":"Сопло Bambu Lab Hardened Steel Nozzle 0,4 мм","slug":"soplo-bambu-lab-hardened-steel-nozzle-0.4-mm"},
 {"language":"ru-UA","name":"Сопло Bambu Lab Hardened Steel Nozzle 0,4 мм","slug":"soplo-bambu-lab-hardened-steel-nozzle-0.4-mm"}
]}
Note: the typed name is kept whole and untranslated in every locale — only the localized category
noun is added IN FRONT of it (non-English); English = the typed name as is. German umlauts are
EXPANDED in the slug (Düse→duese); the dimension keeps a dot decimal in the slug; мм→mm in the slug.

══════════ WORKED EXAMPLE 2 (store "EXPERT3D" → en-ES, es-ES, pt-PT, uk-UA) ══════════
Input product: "Bambu Lab PLA Basic Filament 1.75 mm 1 kg x4 With Spool CMYK"   (a PROTECTED name: brand "Bambu Lab")
{"site_name":"EXPERT3D","slugs":[
 {"language":"en-ES","name":"Bambu Lab PLA Basic Filament 1.75 mm 1 kg x4 With Spool CMYK","slug":"bambu-lab-pla-basic-filament-1.75-mm-1-kg-x4-with-spool-cmyk"},
 {"language":"es-ES","name":"Filamento Bambu Lab PLA Basic Filament 1,75 mm 1 kg x4 With Spool CMYK","slug":"filamento-bambu-lab-pla-basic-filament-1.75-mm-1-kg-x4-with-spool-cmyk"},
 {"language":"pt-PT","name":"Filamento Bambu Lab PLA Basic Filament 1,75 mm 1 kg x4 With Spool CMYK","slug":"filamento-bambu-lab-pla-basic-filament-1.75-mm-1-kg-x4-with-spool-cmyk"},
 {"language":"uk-UA","name":"Філамент Bambu Lab PLA Basic Filament 1,75 мм 1 кг x4 With Spool CMYK","slug":"filament-bambu-lab-pla-basic-filament-1.75-mm-1-kg-x4-with-spool-cmyk"}
]}
Note: the typed name (descriptive words "Filament", "With Spool" included) is kept whole and
untranslated; the localized category noun is only added in front of it (non-English); the number
and unit are the only parts that take locale formatting (1.75→1,75, mm→мм, kg→кг); name uses plain
space-separated tokens; slug decimal is a dot. Every locale's slug still contains the full slugified
typed name.

══════════ WORKED EXAMPLE 3 — A MODEL DESIGNATOR CONTAINING A SLASH (rule 4) ══════════
Both examples above have punctuation-free models, which is exactly why rule 4's character set
used to read as absolute. It is not.
Input product: "XGRIDS L2 Pro 32/300 Standard Package"
{"site_name":"Center 3D Print","slugs":[
 {"language":"en-GB","name":"XGRIDS L2 Pro 32/300 Standard Package","slug":"xgrids-l2-pro-32-300-standard-package"},
 {"language":"pl-PL","name":"Skaner 3D XGRIDS L2 Pro 32/300 Standard Package","slug":"skaner-3d-xgrids-l2-pro-32-300-standard-package"},
 {"language":"uk-UA","name":"3D сканер XGRIDS L2 Pro 32/300 Standard Package","slug":"3d-skaner-xgrids-l2-pro-32-300-standard-package"}
]}
Note: the slash SURVIVES in every "name" and becomes a hyphen ONLY in the "slug", where the
lowercase-Latin-and-hyphens charset genuinely requires it. "32 300" and "32300" are both WRONG.
The packaging words "Standard Package" are part of the typed name, so they stay untranslated too.`;

// Appended as its own system block — only for stores on SLUG_CONTEXT_ENRICHMENT_STORES — so
// TASK_SLUG_INSTRUCTION above stays byte-identical for every other store's prompt (and its cache).
const TASK_SLUG_CONTEXT_ENRICHMENT =
  `══════════ CONTEXT ENRICHMENT — KILLER-SPEC SUFFIX (ONLY IF [CONTEXT] IS PROVIDED) ══════════
If a [CONTEXT] block is present, extract exactly ONE primary technical specification (e.g.
accuracy, speed, build volume, power) that best differentiates this product — never a marketing
phrase, never more than one. Append it organically to the END of the localized "name", using the
format "[Localized Name of Spec] [Value]". The "slug" field you emit is regenerated deterministically
by the pipeline from "name" and never read back from you — appending the suffix to "name" alone is
sufficient; still fill "slug" in with your best transliteration for a valid, complete response.
CRITICAL: translate the NAME of the specification into the target language; keep the VALUE (number
+ unit) as written in [CONTEXT], converted per the NUMBERS rule above (decimal separator per
locale). Do not invent a specification that is not actually present in [CONTEXT]. A tier/edition
identifier already in the product name ("Standard Edition") stays VERBATIM before this suffix —
never dropped to make room for it.
If [CONTEXT] contains no clean, differentiating spec (only marketing language, or only qualified/
ranged values with no single clean number+unit), omit this suffix entirely — a plain name with no
suffix is always an acceptable, expected output, not a failure.

WORKED EXAMPLE (store "Center 3D Print" → uk-UA, ru-UA, pl-PL)
Input product: "Revopoint MetroY Ultra Standard Edition", [CONTEXT] mentions "Accuracy 0.015 mm"
{"site_name":"Center 3D Print","slugs":[
 {"language":"uk-UA","name":"3D сканер Revopoint MetroY Ultra Standard Edition точність 0,015 мм","slug":"3d-skaner-revopoint-metroy-ultra-standard-edition-tochnist-0.015-mm"},
 {"language":"ru-UA","name":"3D сканер Revopoint MetroY Ultra Standard Edition точность 0,015 мм","slug":"3d-skaner-revopoint-metroy-ultra-standard-edition-tochnost-0.015-mm"},
 {"language":"pl-PL","name":"Skaner 3D Revopoint MetroY Ultra Standard Edition dokładność 0,015 mm","slug":"skaner-3d-revopoint-metroy-ultra-standard-edition-dokladnosc-0.015-mm"}
]}
Note: uk/ru transliterate "точність"/"точность" differently once the pipeline derives the slug
from this name, giving natural per-locale uniqueness with no "-uk"/"-ru" collision suffix needed;
"Standard Edition" survives verbatim before the suffix.`;

export function buildPromptSlug(
  storeName: string,
  productName: string,
  languages: string[],          // BCP-47 codes, from getLangsForStore().seoLangs
  contextHtmlOrDescription?: string,
): PromptPayload {
  const store = getStore(storeName);
  // 4000, not 1000: a blind 1000-char prefix is often entirely §1's hook paragraph, cutting off
  // before §2a's killer-specs table ever appears — the model then has nothing there to ground the
  // name in beyond the hook. Still a prefix, not the whole document: this window is for the
  // model's own name-grounding, a different concern from the deterministic killer-spec suffix
  // extractor (killer-spec-from-html.ts), which scans the FULL string regardless of this limit.
  const context = contextHtmlOrDescription
    ? `\n[CONTEXT — ground the product name in this generated copy]:\n${contextHtmlOrDescription.substring(0, 4000)}`
    : '';
  const userContent = `[INPUT DATA]
[Store Name]: "${storeName}"
[Site Suffix]: "${store.siteSuffix}"
[Region]: ${store.region}
[Product Name]: "${productName}"
[Target Languages]: ${languages.join(', ')}${context}`;
  const systemBlocks = [
    { text: TASK_SLUG_SYSTEM, cache: true },
    { text: TASK_SLUG_INSTRUCTION, cache: true },
  ];
  if (usesSlugContextEnrichment(storeName)) {
    systemBlocks.push({ text: TASK_SLUG_CONTEXT_ENRICHMENT, cache: true });
  }
  return { systemBlocks, userContent };
}

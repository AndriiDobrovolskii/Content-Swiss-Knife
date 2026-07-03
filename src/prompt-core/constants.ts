import type { WebsiteGroup } from '../app/types';

/** Canonical per-store registry. THE single place store facts are defined. */
export interface StoreProfile {
  group: WebsiteGroup;
  region: string;
  currency: string;
  currencySymbol: string;
  languages: string[];
  imageBaseUrl: string;
  siteSuffix: string;
}

export const STORE_REGISTRY: Record<string, StoreProfile> = {
  '3DDevice': { group: 'UA', region: 'Ukraine 🇺🇦', currency: 'UAH (₴)', currencySymbol: '₴', languages: ['en-GB', 'uk-UA', 'ru-UA'], imageBaseUrl: 'https://3ddevice.com.ua/image/catalog/products/', siteSuffix: '3DDevice' },
  '3DPrinter': { group: 'UA', region: 'Ukraine 🇺🇦', currency: 'UAH (₴)', currencySymbol: '₴', languages: ['en-GB', 'uk-UA', 'ru-UA'], imageBaseUrl: 'https://3dprinter.com.ua/image/catalog/Products/', siteSuffix: '3DPrinter' },
  '3DScanner': { group: 'UA', region: 'Ukraine 🇺🇦', currency: 'UAH (₴)', currencySymbol: '₴', languages: ['en-GB', 'uk-UA', 'ru-UA'], imageBaseUrl: 'https://3dscanner.com.ua/image/catalog/Products/', siteSuffix: '3DScanner' },
  'Center 3D Print': { group: 'EU', region: 'Poland & EU 🇵🇱', currency: 'PLN (zł) / EUR (€)', currencySymbol: 'zł', languages: ['pl-PL', 'en-GB', 'de-DE', 'uk-UA', 'ru-UA'], imageBaseUrl: 'https://center3dprint.com/image/catalog/Products/', siteSuffix: 'C3D' },
  'Drukarka 3D': { group: 'EU', region: 'Poland 🇵🇱', currency: 'PLN (zł)', currencySymbol: 'zł', languages: ['pl-PL', 'uk-UA'], imageBaseUrl: 'https://drukarka-3d.com.pl/image/catalog/products/', siteSuffix: 'Drukarka 3D' },
  'EXPERT3D': { group: 'ES', region: 'Valencia, Spain 🇪🇸', currency: 'EUR (€)', currencySymbol: '€', languages: ['en-ES', 'es-ES', 'uk-UA'], imageBaseUrl: 'https://impresora-3d.es/image/catalog/products/', siteSuffix: 'EXPERT3D' },
  'Impresora-3D': { group: 'ES', region: 'Valencia, Spain 🇪🇸', currency: 'EUR (€)', currencySymbol: '€', languages: ['en-ES', 'es-ES', 'uk-UA'], imageBaseUrl: 'https://impresora-3d.es/image/catalog/products/', siteSuffix: 'EXPERT3D' },
  'Expert-3DPrinter': { group: 'US', region: 'Houston, TX 🇺🇸', currency: 'USD ($)', currencySymbol: '$', languages: ['en-US', 'es-MX', 'uk-UA'], imageBaseUrl: '', siteSuffix: 'Expert-3DPrinter' },
};

export function getStore(name: string): StoreProfile {
  return STORE_REGISTRY[name] ?? {
    group: 'EU', region: 'Global/EU', currency: 'EUR (€)', currencySymbol: '€',
    languages: ['en-GB'], imageBaseUrl: '', siteSuffix: name,
  };
}

/**
 * EXPERT3D / Impresora-3D — the two ES-group storefronts that share one Tone of Voice.
 * The single predicate that gates every EXPERT3D-only ToV injection (Task A voice block,
 * Task C translation overlay). Equivalent to group === 'ES' but named for intent.
 */
export function isExpert3dStore(name: string): boolean {
  return name === 'EXPERT3D' || name === 'Impresora-3D';
}

function bcp47ToTaskCLang(lang: string, group: WebsiteGroup): string {
  if (lang === 'uk-UA') return group === 'US' ? 'Ukrainian' : 'UA';
  if (lang === 'ru-UA') return 'RU';
  if (lang === 'pl-PL') return 'PL';
  if (lang === 'de-DE') return 'DE';
  if (lang === 'es-ES') return 'ES';
  if (lang === 'es-MX') return 'American Spanish';
  return lang;
}

/** Derives seoLangs and transLangs from STORE_REGISTRY — the single source of truth. */
export function getLangsForStore(storeName: string): { seoLangs: string[]; transLangs: string[] } {
  const store = getStore(storeName);
  return {
    seoLangs: store.languages,
    transLangs: store.languages
      .filter(lang => !lang.startsWith('en-'))
      .map(lang => bcp47ToTaskCLang(lang, store.group)),
  };
}

/** Reverse mapping: internal task label → BCP47 ISO code, given the store name. */
export function taskLangToIso(taskLabel: string, storeName: string): string {
  const store = getStore(storeName);
  for (const lang of store.languages) {
    if (bcp47ToTaskCLang(lang, store.group) === taskLabel) return lang;
  }
  return taskLabel;
}

/** Human-readable language name for LLM prompts, keyed by BCP47 ISO code. */
export function isoToHumanLang(iso: string): string {
  const map: Record<string, string> = {
    'en-GB': 'British English',
    'en-ES': 'English (for Spain, European style)',
    'en-US': 'American English',
    'uk-UA': 'Ukrainian',
    'ru-UA': 'Russian',
    'pl-PL': 'Polish',
    'de-DE': 'German',
    'es-ES': 'Castilian Spanish',
    'es-MX': 'Mexican Spanish',
  };
  return map[iso] ?? iso;
}

/** Brand lists per store group. */
export const BRANDS_ES = ['Raise3D', 'Formlabs', 'xTool', 'Shining3D', 'XGRIDS', 'PUDU', 'Metal3D'];
export const BRANDS_DEFAULT = [
  'KLEMA', 'Formlabs', 'CreatBot', 'Raise3D', 'UltiMaker', 'MakerBot', 'Markforged', 'Omni 3D',
  'Shining3D', 'Peel 3D', 'Creaform', 'Revopoint', 'Scantech', 'Surphaser', 'Thunk3D', 'E-PLUS 3D',
  'Fastform', 'xTool', 'Magigoo', 'Aesub', 'Bambu Lab', 'PUDU', 'Metal3D',
];

/**
 * Brand-guarantee sentence used in the COMMERCIAL CLOSING / CTA-TRUST block (Schema v3 §9).
 * Variant: "100% authenticity + fair price" — niches with counterfeit risk (3D printing/scanning).
 * Alternatives if needed:
 *   - "genuine products"   — if price transparency not needed
 *   - "expert support"    — complex technical products
 *   - "transparent pricing" — if price transparency matters
 */
export const BRAND_GUARANTEE_EN =
  `As an official representative of [Brand], we guarantee 100% authenticity, fair price, authorized service, and an official warranty.`;

/**
 * Locale-aware decimal/thousands separator rules (Schema v3 Appendix).
 * Applies EVERYWHERE a number is written — body prose, headings, captions, CTA copy, AND
 * spec-table cells alike — for every generated language. Only the separator punctuation
 * localizes; the digits themselves and the unit must stay identical to the source
 * (CLAUDE.md "don't change values or units" governs the quantity, not its notation).
 */
export const NUMBER_FORMAT_RULES = `[NUMBER FORMATTING — by locale, applies everywhere]
Format every decimal/large number per the target locale's separator convention — in running
text, headings, captions, AND spec-table <td> cells alike. Never change the digits or the
unit; only the separator punctuation localizes.
- uk-UA / ru-UA: decimal comma, thousands non-breaking space  → 1 234 567,89
- pl-PL:         decimal comma, thousands non-breaking space  → 1 234 567,89
- de-DE:         decimal comma, thousands dot (or space)      → 1.234.567,89
- es-ES:         decimal comma, thousands dot (or space)      → 1.234.567,89
- en-GB / en-ES: decimal dot, thousands comma                 → 1,234,567.89
- en-US:         decimal dot, thousands comma                 → 1,234,567.89
- es-US / es-MX (US market, CLDR): decimal dot, thousands comma → 1,234,567.89`;

/**
 * Per-locale sentence-length budget. A LANGUAGE-LEVEL quality rule (like NUMBER_FORMAT_RULES),
 * NOT a store/ToV overlay: it applies to EVERY task, EVERY store, EVERY generated and translated
 * language version, and is injected once into the master prompt. Values are words-per-sentence,
 * calibrated per language because the same meaning costs a different word count across languages
 * (German compounds + verb-final frame → fewest words; Romance expansion → most; Slavic drops
 * articles but words run longer). The English band is grounded in the comprehension curve
 * (~14 words ≈ 90% comprehension, sharp drop after 25); other bands are derived from the
 * language-adapted readability formulas + text-expansion factors. Averages over a section, with a
 * hard per-sentence ceiling. Also the AEO/GEO sweet spot: answer engines extract the first 1–2
 * sentences of a section, so the opening sentence must be short and self-contained.
 */
export const SENTENCE_LENGTH_RULES = `[SENTENCE LENGTH — by locale, applies everywhere, every language version]
Write to a words-per-sentence budget calibrated for the TARGET language. Values are averages across
the section; never exceed the hard ceiling for any single sentence. Vary length for rhythm (mix
short and medium) — do NOT make every sentence the same length.
Sections: HERO = opening/intro paragraph · BODY = feature→benefit + technical-explanation prose ·
FAQ = the FIRST sentence of every answer (supporting sentences may sit at the BODY band).
                    HERO     BODY      FAQ-1st   ceiling
- en-GB / en-ES:    9–14     15–18     10–15     25
- en-US:            8–12     14–17     9–14      22
- de-DE:            8–12     12–15     8–13      18   (compounds + Satzklammer — keep shortest)
- es-ES:            10–15    16–20     12–16     27   (Romance expansion — highest budget)
- es-MX:            9–13     14–18     10–15     24
- pl-PL:            8–13     13–17     10–15     22
- uk-UA / ru-UA:    8–12     12–16     9–14      20   (no articles, long words — split long clauses)
UNIVERSAL (all locales): one idea per sentence; open each section AND each FAQ answer with a
complete, self-contained statement (answer-first); front-load subject + key attribute (product +
spec) at the sentence start; anchor technical sentences on a concrete figure. Avoid nested/
subordinate pile-ups (uk/ru дієприслівникові звороти; de Schachtelsätze).
[ON TRANSLATION] "Preserve structure" governs HTML only (sections, classes, <hr>) — NOT sentence
boundaries. If a source English sentence would exceed the TARGET band, SPLIT it; if the target
language is terser, you may MERGE. Re-fit to the target band instead of mirroring English sentence
structure 1:1 (critical for de-DE and uk-UA/ru-UA).`;

/** US mixed measurement rule — the ONLY copy. */
export const US_MEASUREMENT_RULES = `[MEASUREMENT SYSTEM — MIXED US STANDARD]
CONVERT to Imperial: Printer Dimensions → inches, Build Volume → inches, Printer Weight → lbs, Filament Spool Weight → lbs (oz for small samples).
KEEP in Metric: Layer Thickness → μm, Filament Diameter → mm, Nozzle → mm, Temperature → °C, Print Speed → mm/s, Resin Volume → L/ml.`;

/**
 * Single source of truth for unit-abbreviation localization across the whole pipeline.
 * Interpolated into MASTER_SYSTEM_PROMPT, task-c (generic + US_UK) and referenced by task-slug.
 * Language-driven, not store-driven: applies to uk-UA / ru-UA output on EVERY storefront.
 * Deterministic backstops: number-format-fixer (spacing) and output-validator
 * (latin-unit-in-cyrillic-text warning).
 */
export const UNIT_LOCALIZATION_RULES = `[UNIT LOCALIZATION]
LATIN-SCRIPT LANGUAGES (en-GB/en-US/en-ES, pl-PL, de-DE, es-ES, es-MX): keep ALL international
unit abbreviations unchanged (mm, kg, W, kW, GHz, GB…). Never invent localized abbreviations.
Lowercase "l" for litre in pl (litr); "L" acceptable in en/de.

CYRILLIC LANGUAGES (uk-UA, ru-UA) — cyrillize EVERY unit abbreviation in ALL visible text,
including spec-table cells, alt="", title="", figcaptions and repeated Product Names.
Only the abbreviation script changes; the numeric value NEVER changes. Spacing rule still
applies ("200 mm" → "200 мм", "10W" → "10 Вт").
  Length:      mm→мм, cm→см, m→м, km→км, μm/µm→мкм, nm→нм
  Mass:        kg→кг, g→г, mg→мг
  Power:       W→Вт, kW→кВт, mW→мВт
  Voltage:     V→В, kV→кВ, mV→мВ
  Current:     A→А, mA→мА
  Frequency:   Hz→Гц, kHz→кГц, MHz→МГц, GHz→ГГц
  Volume:      L/l→л, ml→мл
  Data:        GB→ГБ, MB→МБ, TB→ТБ
  Bitrate:     Mbit/Mb→Мбіт (uk) / Мбит (ru), Gbit→Гбіт (uk) / Гбит (ru)
  Speed:       mm/s→мм/с, m/s→м/с
  Area/Volume: m²→м², m³→м³, cm²→см², cm³→см³
  Capacity:    mAh→мА·год (uk) / мА·ч (ru)
  Rotation:    rpm→об/хв (uk) / об/мин (ru)
  Time:        min→хв. (uk) / мин. (ru), h→год. (uk) / ч (ru), s→с
  Composite units cyrillize part-by-part (kg/h → кг/год (uk) / кг/ч (ru)).
KEEP UNCHANGED in uk/ru (fixed exception list — technical convention): °C, °F, VAC / V AC
(full form "вольт змінного струму / вольт переменного тока" is too long for tables/UI),
dpi, px, fps, K (colour temperature, e.g. "6500 K"), ppm, and any inch marks in US-market
content. Any unit NOT listed anywhere above: keep as in source, do not guess.
[NUMBER SEPARATOR REMINDER] Decimal comma for uk/ru/pl/de/es-ES ("1.5 kW" → "1,5 кВт");
decimal dot for en-GB/en-US/en-ES/es-MX. Separator rules live in [NUMBER FORMATTING].`;

export const METRIC_MEASUREMENT_RULES = `[MEASUREMENT] Use standard Metric units (mm, kg, °C).
SPACING IS MANDATORY: a single space between number and unit everywhere (body, table cells, alt text).
✅ "10 W", "1.75 mm", "200 °C", "-5 °C – 50 °C"   ❌ "10W", "1.75mm", "200°C"
Normalize spacing even if the source omits it ("10W" → "10 W").`;

/**
 * Product-name localization rule (Schema v3 §0/§7/§9 consistency) — THE single copy.
 * Shared by the master system prompt (Task A/B native generation) AND Task C (translation),
 * so the Product Name localizes identically no matter which path produced the language version.
 * Behaviour: the GENERIC DESCRIPTIVE CATEGORY (e.g. "Reflective Markers") is TRANSLATED and, for
 * non-English locales, placed FIRST (category-first); brand/sub-brand/model stay Latin in the
 * middle; embedded units, number separators, and the count abbreviation localize. English keeps
 * brand-first order. Count abbreviation split: es-ES "uds" vs es-MX "pzas".
 */
export const PRODUCT_NAME_LOCALIZATION = `[PRODUCT NAME LOCALIZATION — localize the Product Name in EVERY place it appears]
The Product Name recurs in the hook <p>, the §2 killer-specs table heading, spec-table <h2>/<h3>,
the §7 "Technical specifications of the [Product Name]" header, figure captions, and the §9
commercial-closing H2 — render it in ONE consistent localized form across all of them.

Split the Product Name into three parts and treat each differently:
1. GENERIC DESCRIPTIVE CATEGORY — the common noun(s) naming WHAT the product is
   ("Reflective Markers", "Filament", "Resin", "Build Plate", "Cleaning Kit"). TRANSLATE it into the
   target language using natural, normative terminology (anti-anglicism rules apply).
2. BRAND / SUB-BRAND / MODEL — proper names ("Shining3D", "EinScan", "EINSTAR VEGA", "Bambu Lab",
   "Creality Ender") AND material/consumable TRADE NAMES ("Nylon 12 Powder", "Nylon 11 GF Powder",
   "PA12", "PETG-CF"). KEEP in original Latin script — NEVER translate or transliterate, even when
   the same word appears generically elsewhere in the text (see anti-anglicism rule for the
   generic-noun case).
3. EMBEDDED SPECS — dimensions and quantities ("12 mm", "1500 pcs"). Localize units, number
   separators and the count abbreviation (below); never change the digits.

WORD ORDER:
- English (en-GB / en-ES / en-US): brand-first → [Brand Model] [Descriptive] [specs].
- uk-UA / ru-UA / pl-PL / de-DE / es-ES / es-MX: category-first → [Translated descriptive]
  [Brand Model] [specs].

COUNT / QUANTITY ABBREVIATION ("pcs" / "pieces" / "units" / "pack"):
  Ukrainian (uk-UA) → "шт."  ·  Russian (ru-UA) → "шт."  ·  Polish (pl-PL) → "szt."  ·
  German (de-DE) → "Stk"  ·  Castilian Spanish (es-ES) → "uds"  ·
  Mexican Spanish (es-MX) → "pzas"  ·  English (en-GB / en-ES / en-US) → "pcs".
  uk/ru/pl carry a trailing period (correct abbreviation orthography); de/es/en do not.
  This form is identical everywhere the count appears — Product Name, spec-table quantity rows,
  running text — never drop the period in one place and keep it in another.
UNITS → follow the unit rules above ([CYRILLIC UNITS] / [UNITS]): "12 mm" → uk/ru "12 мм"; keep
Latin for en/pl/de/es. NUMBER SEPARATORS → follow the number-format rules above ([NUMBER FORMATTING]
/ [NUMBERS]). The digits never change.

WORKED EXAMPLE — source "Shining3D EinScan Reflective Markers 12 mm 1500 pcs":
  en-GB / en-ES / en-US → Shining3D EinScan Reflective Markers 12 mm 1500 pcs
  es-ES → Marcadores reflectantes Shining3D EinScan 12 mm 1500 uds
  es-MX → Marcadores reflectantes Shining3D EinScan 12 mm 1500 pzas
  uk-UA → Відбиваючі маркери Shining3D EinScan 12 мм 1500 шт.
  ru-UA → Маркеры отражающие Shining3D EinScan 12 мм 1500 шт.
  pl-PL → Markery odbijające Shining3D EinScan 12 mm 1500 szt.
  de-DE → Reflektive Marker Shining3D EinScan 12 mm 1500 Stk

EDGE CASE — if the name is purely brand + model with NO generic descriptor (e.g. "Bambu Lab X1
Carbon"), there is nothing to translate or reorder: keep brand/model Latin and only localize the
embedded units / numbers / counts.
Never add, drop, or invent tokens; aside from the descriptive↔brand reordering above, preserve token
order and identical numeric values — only the translated descriptor, unit script, separators, and
count abbreviation change.`;

/**
 * Simplified HTML schema for consumable products (filament / resin / adhesive).
 * Used by task-a.ts when templateId === 'consumables-resin'.
 * Overrides Schema v3.0 §1–§9. All other master-prompt rules stay in effect:
 * unit cyrillization, number separators, no H1, no microdata, anti-anglicism.
 * Hard visible-text limit: 2 500 characters (HTML tags stripped).
 */
export const CONSUMABLES_SIMPLIFIED_SCHEMA =
  `[CONSUMABLES SIMPLIFIED SCHEMA — overrides Schema v3.0 §1–§9]
Product is a consumable material (filament / resin / adhesive). Use this schema exclusively.
IGNORE: §1 Hook, §2 Killer Specs, §3 Functionality, §4 Applications, §5 Compatibility,
        §6 Package Contents, §9 CTA-TRUST from the master [CONTENT STRUCTURE].
KEEP ALL OTHER MASTER RULES: unit cyrillization, number separators, no H1, no microdata, anti-anglicism.

TARGET LENGTH: ~2100 visible characters (HTML tags stripped). HARD CEILING: 2500 — validation FAILS above this.
You cannot count your own characters, so AIM LOW (~2100) to leave headroom; budget words, do not measure.
Translations into German/Russian/Spanish expand 10–30% vs. English — that headroom is what keeps them under 2500.
Write efficiently — never pad to a minimum length.

SECTIONS — emit in this exact order, no extras:

§C1 HOOK  (plain <p>, 40–60 words)
  What the material is + base polymer/chemistry. Core differentiating property.
  Primary workflow it serves. No heading. No <section> wrapper.
  ANTI-REPETITION: identify the descriptive root in the Product Name (e.g. "Reflective"/"Marker",
  "Filament"/"PLA"). State that concept ONCE. If you need to reference it again in the same
  paragraph, use a different word or a pronoun — NEVER a cognate of the same root (e.g. do not
  follow "Reflective Markers" with "retroreflective… marker-based"). Before finalizing, re-read the
  hook and rewrite if any root/cognate appears twice.
  BODY-WIDE ANTI-REPETITION (§C1–§C6): the same rule applies across the WHOLE description, not just
  the hook. Within any one bullet or paragraph, do not repeat a content root in successive sentences
  (e.g. "виявлення… виявлення", "діапазону… діапазону", "range… range"). Vary with domain synonyms:
  detection→capture/registration, range→reach/distance, target/marker→point/reference point. Spec
  values are exempt — never alter a number or unit to avoid repetition.

§C2 FEATURES & MATERIAL PROPERTIES  (<h2> + <ul>, 4–6 items)
  en H2: "Features & Material Properties"
  Each <li>: <b>[Feature label.]</b> [1–2 sentences — concrete outcome, no marketing fluff.]

§C3 APPLICATIONS  (<h2> + <ul>, 3–4 items)
  en H2: "Applications"
  Each <li>: <b>[Scenario]:</b> [1 sentence on what this material enables here.]

§C4 PRINT SETTINGS + SPEC TABLES  (one <h2> per parameter group)
  en H2: "Print Settings" (required if printing parameters are provided)
  Optional: one-sentence print tip (e.g. active-cooling recommendation).
  Table: <div class="table-responsive"><table><tbody>
    <tr><td>[Parameter]</td><td>[Value + unit]</td></tr>
  </tbody></table></div>
  PARAMETER LABELS: each [Parameter] must read as a self-contained noun phrase ("Inner diameter",
  "Markers per sheet", "Total markers") — never a clipped sentence fragment.
  COUNT/QUANTITY ROWS (MANDATORY): a quantity row is any row whose Value is a count of discrete
  items (markers/sheets/pieces/units per sheet/pack/box, or a grand total). EVERY such row MUST
  carry the count abbreviation in its Value cell — no bare integers. Apply it uniformly: if the
  total row has it, the per-sheet and per-pack rows MUST have it too. Localized form:
    en "15 pcs" · uk/ru "15 шт." (WITH trailing period) · pl "15 szt." · de "15 Stk" ·
    es-ES "15 uds" · es-MX "15 pzas".
  Self-check before output: scan every quantity row; if any shows a bare number, add the abbreviation.
  If mechanical properties provided → add separate <h2> + table. en H2: "Mechanical Properties"
  If physical properties provided   → add separate <h2> + table. en H2: "Physical Properties"
  NO <thead>. NO <h3>. NEVER invent parameter values.

§C5 STORAGE GUIDELINES  (<h2> + <ul>, 2–3 items)
  en H2: "Storage Guidelines"
  Each <li>: <b>[Label]:</b> [concrete storage/handling instruction.]

§C6 CLOSING CTA  (<hr> + plain <p>, 1–2 sentences)
  Product name + store name + availability/shipping.
  One internal category link where contextually natural. No <p class="cta">. No H2.

FORBIDDEN for consumables:
  §2 Killer-Specs 3-column table · §3 Functionality H2/H3 blocks · §5 Compatibility section
  §6 Package Contents · <section class="specs"> · itemprop / microdata · <h3> · <p class="cta">`;
/**
* Translation overlay for consumables. Appended to whichever task-c instruction is
* selected when templateId === 'consumables-resin'. Stops the translator from re-inflating
* the simplified §C1–§C6 structure into a printer/scanner-style description, and carries the
* 2500-char limit into every target language (DE/RU expand vs EN). Single source of truth.
*/
export const CONSUMABLES_TRANSLATION_OVERLAY =
  `[CONSUMABLES MODE — TRANSLATION OVERLAY — these rules WIN over any [LABELS]/closing-H2 instruction above]
The source uses the CONSUMABLES SIMPLIFIED SCHEMA (§C1–§C6), NOT Schema v3.0.
Translate it AS-IS. Do NOT restructure it into a printer/scanner-style description.

- NO "What's in the box" / Package Contents section exists here. If a [LABELS] line mentions one, IGNORE it — emit none.
- The closing CTA is a plain <p> after <hr> (§C6). DO NOT convert it into a "Why buy … from [Store]?" H2 block. Keep it a short closing paragraph.
- DO NOT add Killer-Specs 3-column table, Functionality, or Compatibility sections — they are absent from the source.
- Translate only the §C2/§C3/§C4/§C5 H2 headings actually present.
- COLON CAPITALIZATION in §C2/§C3/§C5 items ("<b>Label:</b> continuation"): for uk-UA, ru-UA,
  pl-PL — lowercase the first letter after the colon (it introduces an explanation of the bold
  label, not a new sentence; house style — uk "Великі об'єкти: автомобільні панелі…" NOT
  "…: Автомобільні…"). For de-DE keep the German default (capitalize when a complete clause
  follows — that is correct German orthography). For en-GB/en-ES/en-US keep the English default
  (capitalized, as a sentence).
- SPEC-TABLE PARAMETER RE-NOMINALIZATION: translating a §C4 quantity [Parameter] (EN "Markers per
  sheet" / "Sheets per pack" / "Total markers") word-for-word often lands in the genitive/partitive
  case and reads like a clipped sentence — WRONG, e.g. uk "Маркерів на аркуші", ru "Маркеров на
  листе". Rephrase as a clean nominative noun phrase, adding a quantity head-noun if needed: uk
  "Кількість маркерів на аркуші" / "Кількість аркушів у наборі" / "Загальна кількість маркерів";
  ru "Количество маркеров на листе" / "Количество листов в наборе" / "Общее количество маркеров";
  pl "Liczba znaczników na arkusz" / "Liczba arkuszy w opakowaniu" / "Łączna liczba znaczników".
  Apply the same nominative-phrase check to every other §C4 label in the target language.
- COUNT-ABBREVIATION CONSISTENCY: if the source table's quantity rows carry the count abbreviation
  inconsistently, FIX it on translation — every quantity row gets the same localized abbreviation,
  not just the total row. Forms: uk/ru "шт." (WITH trailing period), pl "szt.", de "Stk",
  es-ES "uds", es-MX "pzas". Add it to any quantity row that shows a bare integer.
- BODY-WIDE ANTI-REPETITION also applies to the translation: do not let a content root repeat in
  successive sentences of any §C1–§C6 bullet/paragraph; vary with target-language synonyms. Never
  alter spec values to do so.
- ANTI-ANGLICISM (target language only — applies to uk-UA, ru-UA, pl-PL, de-DE, es-ES, es-MX):
  before finalizing, scan the draft for unnecessary English loanwords/calques and replace with the
  native term, using this classification:
    BAD (jargon/anglicism/morphological calque) — e.g. uk "ретровідбиваючі" (mechanical "-ючі" calque,
    not a real Ukrainian adjective form), "прінт", "софт".
    GOOD (native/normative equivalent) — uk "світловідбивальний" or, in technical/ДСТУ context,
    "світлоповертальний" (replaces "ретровідбиваючі"); "друк" (not "прінт"); "ПЗ" (not "софт").
    ALLOWED (no direct native equivalent — established technical/industry term, keep as-is):
    filament, nozzle, extruder, scanner/skaner/сканер, USB, Wi-Fi.
  Prefer the literary/normative adjective form over inventing a hybrid calque of the English or
  Russian root. When in doubt whether a term is BAD or ALLOWED, default to the native form.
  EDITOR-LOCKED TERMS (uk-UA, confirmed against gold-edited reference, takes precedence over any
  literal translation): "reference point(s)" → "реперна(-і) точка(-и)" (NOT "опорна точка" /
  "референсна точка"); "digitisation/digitalization" → "оцифрування" (already standard — do not
  drift to "діджитизація"/"цифровізація"). Apply the same precedence logic in ru/pl/de/es when an
  equivalent editor-confirmed term exists in the glossary.

HARD LIMIT: translated visible text (HTML tags stripped) MUST stay at or below 2100 characters (ceiling 2500).
Since you cannot count characters, COMPRESS structurally: keep §C2/§C3/§C5 bullets to one short sentence each, drop adjectives. Never pad, never add sentences.
If the target language expands vs. the source, COMPRESS §C2/§C3/§C5 prose to stay under the limit. Never pad, never add sentences.
Preserve every spec-table row and numeric value verbatim (only localize unit/separator as instructed above).`;

/**
 * EXPERT3D Tone of Voice — BASE-GENERATION overlay (Task A only, EXPERT3D/Impresora-3D).
 * Added as an extra CACHED system block AFTER master + task-a instruction, so the shared
 * master+task prefix stays byte-stable (cache hit) for every other store and EXPERT3D just
 * gets one additional cached suffix (its own cache slot). Encodes brand character, the
 * forbidden-word list and the Fact -> Mechanism -> Consequence formula. Product-agnostic:
 * no product-specific few-shots that would bias unrelated categories. Register and loanword
 * rules are per-locale and live in EXPERT3D_TOV_TRANSLATION_OVERLAY instead.
 */
export const EXPERT3D_TOV_BASE_OVERLAY =
  `[EXPERT3D BRAND VOICE — applies to this store's base generation and every language version]
Write as EXPERT3D: a technical partner that sells solutions, not boxes. The narrator is an
experienced engineering consultant who knows the product and respects the reader's time —
not a salesperson, not an enthusiast.

TONE:
- Confident, never boastful. Technically precise, but readable without a glossary.
- Emotionally neutral: no excitement, no exclamation marks.
- Every claim is backed by a concrete figure or a mechanism — never vague.
- Respect the reader: do not explain the obvious; do surface the non-obvious.

VOICE FORMULA (apply throughout — especially "Why it matters" cells, key benefits, applications):
  Fact -> Mechanism -> User consequence.
  e.g. "A 0.2 mm nozzle forms a narrower extrusion path, sharpening the boundary between colour
  overlap zones." — parameter + how it works + what the buyer gets, in one sentence.

FORBIDDEN WORDS (all languages — extends the master fluff ban): revolutionary, innovative,
cutting-edge, advanced, best, incredible, amazing, fantastic, perfect choice, must-have,
top product, game-changer, "quality on point", "exceeds expectations", "buy now", "don't miss
out". Replace each with a specific fact or number.
  BAD  "High-quality filament / excellent print results / easy to use"
  GOOD "±0.02 mm diameter tolerance across all four spools / even colour saturation on 0.2 mm
       details / no manual profile calibration when HEX values match"

Keep the schema's mandated section order and headings — the ToV changes the WORDING and the
evidence discipline, not the structure. In Applications, every entry states a concrete scenario
plus what makes THIS product the right tool for it (the differentiator vs alternatives), never
just the industry name.`;

/**
 * EXPERT3D Tone of Voice — TRANSLATION overlay (Task C, EXPERT3D/Impresora-3D locales).
 * Appended to whichever task-c instruction is selected — same mechanism as
 * CONSUMABLES_TRANSLATION_OVERLAY. Carries the per-locale FORMAL register, the es-ES
 * forbidden-calque list and the uk-UA forbidden-word stems into every EXPERT3D language
 * version and preserves the brand voice through translation. These rules WIN over any
 * conflicting [STYLE]/register line above (notably the legacy "use tú" line — B2B industrial
 * capital equipment uses the formal register).
 */
export const EXPERT3D_TOV_TRANSLATION_OVERLAY =
  `[EXPERT3D ToV — TRANSLATION OVERLAY — these rules WIN over any [STYLE]/register line above]
Preserve the EXPERT3D brand voice: expert-consultant, factual, no marketing fluff. Do NOT
introduce forbidden words in the target language (revolucionario/innovador/puntero/el mejor/
increíble/la elección perfecta/imprescindible ; революційний/інноваційний/ідеальний/неймовірний/
найкращий). Keep the Fact -> Mechanism -> Consequence shape of each claim.

REGISTER (formal, mandatory — this is B2B industrial capital equipment):
- es-ES / es-MX: formal "usted" throughout — verbs, possessives (le garantizamos, le asesora,
  su línea, aproveche). NEVER "tú" / "te" / "tu".
- uk-UA: formal "Ви" (з великої), technical and direct, no pathos.
- pl-PL: formal Pan/Pani — never bezpośrednie "ty".
- en-ES / en-GB: neutral, impersonal industrial tone (English has no tú/usted).

FORBIDDEN CALQUES (es-ES / es-MX — replace the English calque with natural Spanish; match
inflected forms too, e.g. huella/huellas, puente/puentes):
- huella (= footprint) -> superficie de ocupación / espacio de instalación
- de extremo a extremo (= end-to-end) -> de principio a fin / integral
- producción puente (= bridge manufacturing) -> producción de transición
- fixtures (untranslated) -> fijaciones / utillajes de sujeción
- envases protésicos (= socket, wrong term) -> encajes protésicos
- útiles (= tooling) -> utillajes
- over-literal flujo de trabajo (= workflow, overused) -> flujo de producción / proceso

FORBIDDEN STEMS (uk-UA — drop or replace with a concrete fact): революцій-, інновацій-,
ідеальн-, неймовірн-, найкращ- (when unproven).

COLON CAPITALIZATION in "<b>Label:</b> continuation" list items and figcaptions: for uk-UA /
ru-UA / pl-PL lowercase the first letter after the colon (it introduces an explanation of the
bold label, not a new sentence). For de-DE and all English keep the default capital.`;
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

/** Per-group language config. */
export const GROUP_CONFIG: Record<WebsiteGroup, { seoLangs: string[]; transLangs: string[] }> = {
  UA: { seoLangs: ['EN', 'UA', 'RU'], transLangs: ['UA', 'RU'] },
  EU: { seoLangs: ['EN', 'PL', 'DE', 'UA', 'RU'], transLangs: ['PL', 'DE', 'UA', 'RU'] },
  ES: { seoLangs: ['EN', 'ES', 'en-ES', 'uk-UA'], transLangs: ['ES', 'European English', 'Ukrainian'] },
  US: { seoLangs: ['en-US', 'es-US', 'uk-UA'], transLangs: ['American Spanish', 'Ukrainian'] },
};

/** Brand lists per store group. */
export const BRANDS_ES = ['Raise3D', 'Formlabs', 'xTool', 'Shining3D', 'XGRIDS', 'PUDU', 'Metal3D'];
export const BRANDS_DEFAULT = [
  'KLEMA', 'Formlabs', 'CreatBot', 'Raise3D', 'UltiMaker', 'MakerBot', 'Markforged', 'Omni 3D',
  'Shining3D', 'Peel 3D', 'Creaform', 'Revopoint', 'Scantech', 'Surphaser', 'Thunk3D', 'E-PLUS 3D',
  'Fastform', 'xTool', 'Magigoo', 'Aesub', 'Bambu Lab', 'PUDU', 'Metal3D',
];

export function officialBrand(productName: string, storeName: string): string {
  const list = ['EXPERT3D', 'Impresora-3D'].includes(storeName) ? BRANDS_ES : BRANDS_DEFAULT;
  return list.find(b => productName.toLowerCase().includes(b.toLowerCase())) ?? '';
}

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

/** US mixed measurement rule — the ONLY copy. */
export const US_MEASUREMENT_RULES = `[MEASUREMENT SYSTEM — MIXED US STANDARD]
CONVERT to Imperial: Printer Dimensions → inches, Build Volume → inches, Printer Weight → lbs, Filament Spool Weight → lbs (oz for small samples).
KEEP in Metric: Layer Thickness → μm, Filament Diameter → mm, Nozzle → mm, Temperature → °C, Print Speed → mm/s, Resin Volume → L/ml.`;

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
   "Creality Ender"). KEEP in original Latin script — NEVER translate or transliterate.
3. EMBEDDED SPECS — dimensions and quantities ("12 mm", "1500 pcs"). Localize units, number
   separators and the count abbreviation (below); never change the digits.

WORD ORDER:
- English (en-GB / en-ES / en-US): brand-first → [Brand Model] [Descriptive] [specs].
- uk-UA / ru-UA / pl-PL / de-DE / es-ES / es-MX: category-first → [Translated descriptive]
  [Brand Model] [specs].

COUNT / QUANTITY ABBREVIATION ("pcs" / "pieces" / "units" / "pack"):
  Ukrainian (uk-UA) → "шт"  ·  Russian (ru-UA) → "шт"  ·  Polish (pl-PL) → "szt"  ·
  German (de-DE) → "Stk"  ·  Castilian Spanish (es-ES) → "uds"  ·
  Mexican Spanish (es-MX) → "pzas"  ·  English (en-GB / en-ES / en-US) → "pcs".
UNITS → follow the unit rules above ([CYRILLIC UNITS] / [UNITS]): "12 mm" → uk/ru "12 мм"; keep
Latin for en/pl/de/es. NUMBER SEPARATORS → follow the number-format rules above ([NUMBER FORMATTING]
/ [NUMBERS]). The digits never change.

WORKED EXAMPLE — source "Shining3D EinScan Reflective Markers 12 mm 1500 pcs":
  en-GB / en-ES / en-US → Shining3D EinScan Reflective Markers 12 mm 1500 pcs
  es-ES → Marcadores reflectantes Shining3D EinScan 12 mm 1500 uds
  es-MX → Marcadores reflectantes Shining3D EinScan 12 mm 1500 pzas
  uk-UA → Відбиваючі маркери Shining3D EinScan 12 мм 1500 шт
  ru-UA → Маркеры отражающие Shining3D EinScan 12 мм 1500 шт
  pl-PL → Markery odbijające Shining3D EinScan 12 mm 1500 szt
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

HARD TEXT LIMIT: total visible text (HTML tags stripped) MUST NOT exceed 2500 characters.
Write efficiently — do not pad to fill a minimum length.

SECTIONS — emit in this exact order, no extras:

§C1 HOOK  (plain <p>, 40–60 words)
  What the material is + base polymer/chemistry. Core differentiating property.
  Primary workflow it serves. No heading. No <section> wrapper.

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
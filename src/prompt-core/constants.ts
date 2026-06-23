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
  '3DDevice':         { group: 'UA', region: 'Ukraine 🇺🇦',        currency: 'UAH (₴)',            currencySymbol: '₴',  languages: ['en-GB','uk-UA','ru-UA'],                 imageBaseUrl: 'https://3ddevice.com.ua/image/catalog/products/',   siteSuffix: '3DDevice' },
  '3DPrinter':        { group: 'UA', region: 'Ukraine 🇺🇦',        currency: 'UAH (₴)',            currencySymbol: '₴',  languages: ['en-GB','uk-UA','ru-UA'],                 imageBaseUrl: 'https://3dprinter.com.ua/image/catalog/Products/',  siteSuffix: '3DPrinter' },
  '3DScanner':        { group: 'UA', region: 'Ukraine 🇺🇦',        currency: 'UAH (₴)',            currencySymbol: '₴',  languages: ['en-GB','uk-UA','ru-UA'],                 imageBaseUrl: 'https://3dscanner.com.ua/image/catalog/Products/',  siteSuffix: '3DScanner' },
  'Center 3D Print':  { group: 'EU', region: 'Poland & EU 🇵🇱',    currency: 'PLN (zł) / EUR (€)', currencySymbol: 'zł', languages: ['pl-PL','en-GB','de-DE','uk-UA','ru-UA'], imageBaseUrl: 'https://center3dprint.com/image/catalog/Products/', siteSuffix: 'Center 3D Print' },
  'Drukarka 3D':      { group: 'EU', region: 'Poland 🇵🇱',         currency: 'PLN (zł)',           currencySymbol: 'zł', languages: ['pl-PL','uk-UA'],                         imageBaseUrl: 'https://drukarka-3d.com.pl/image/catalog/products/', siteSuffix: 'Drukarka 3D' },
  'EXPERT3D':         { group: 'ES', region: 'Valencia, Spain 🇪🇸', currency: 'EUR (€)',            currencySymbol: '€',  languages: ['en-ES','es-ES','uk-UA'],                 imageBaseUrl: 'https://impresora-3d.es/image/catalog/products/',   siteSuffix: 'EXPERT3D' },
  'Impresora-3D':     { group: 'ES', region: 'Valencia, Spain 🇪🇸', currency: 'EUR (€)',            currencySymbol: '€',  languages: ['en-ES','es-ES','uk-UA'],                 imageBaseUrl: 'https://impresora-3d.es/image/catalog/products/',   siteSuffix: 'EXPERT3D' },
  'Expert-3DPrinter': { group: 'US', region: 'Houston, TX 🇺🇸',    currency: 'USD ($)',            currencySymbol: '$',  languages: ['en-US','es-MX','uk-UA'],                 imageBaseUrl: '',                                                  siteSuffix: 'Expert-3DPrinter' },
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
  UA: { seoLangs: ['EN','UA','RU'],                 transLangs: ['UA','RU'] },
  EU: { seoLangs: ['EN','PL','DE','UA','RU'],       transLangs: ['PL','DE','UA','RU'] },
  ES: { seoLangs: ['EN','ES','en-ES','uk-UA'],      transLangs: ['ES','European English','Ukrainian'] },
  US: { seoLangs: ['en-US','es-US','uk-UA'],        transLangs: ['American Spanish','Ukrainian'] },
};

/** Brand lists per store group. */
export const BRANDS_ES = ['Raise3D','Formlabs','xTool','Shining3D','XGRIDS','PUDU','Metal3D'];
export const BRANDS_DEFAULT = [
  'KLEMA','Formlabs','CreatBot','Raise3D','UltiMaker','MakerBot','Markforged','Omni 3D',
  'Shining3D','Peel 3D','Creaform','Revopoint','Scantech','Surphaser','Thunk3D','E-PLUS 3D',
  'Fastform','xTool','Magigoo','Aesub','Bambu Lab','PUDU','Metal3D',
];

export function officialBrand(productName: string, storeName: string): string {
  const list = ['EXPERT3D','Impresora-3D'].includes(storeName) ? BRANDS_ES : BRANDS_DEFAULT;
  return list.find(b => productName.toLowerCase().includes(b.toLowerCase())) ?? '';
}

/**
 * Brand-guarantee sentence used in the COMMERCIAL CLOSING / CTA-TRUST block (Schema v3 §9).
 * Variant: "genuine products" — best for niches with counterfeit risk (3D printing/scanning).
 * Alternatives if needed:
 *   - "100% authenticity" — premium brands (Bambu Lab, Formlabs)
 *   - "expert support"    — complex technical products
 *   - "transparent pricing" — if price transparency matters
 */
export const BRAND_GUARANTEE_EN =
  `As an official representative of [Brand], we guarantee genuine products, authorized service, and an official warranty.`;

/**
 * Locale-aware decimal/thousands separator rules (Schema v3 Appendix).
 * Applies to free-text numbers in body copy ONLY — spec table numeric values and units
 * are reproduced verbatim from the source and must NEVER be reformatted (CLAUDE.md hard rule).
 */
export const NUMBER_FORMAT_RULES = `[NUMBER FORMATTING — by locale, body copy only]
Format large/decimal numbers in running text per the target locale. NEVER reformat spec-table
values or change any numeric value — this rule is about separators in prose only.
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

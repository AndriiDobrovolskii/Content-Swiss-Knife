import { SeoResponse } from '../app/types';

/**
 * Post-generation validation of the hard acceptance criteria from Schema v3.0.
 *
 * These checks are deterministic and run AFTER the LLM produces output, so that a
 * model slip (duplicate Product schema, over-length meta, broken lazy-loading, etc.)
 * is surfaced instead of shipping silently. The validator never mutates output — it
 * only reports. The orchestrator decides how to surface the issues.
 */

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: ValidationSeverity;
  rule: string;
  detail: string;
  /** Which artifact the issue belongs to, e.g. "HTML (UA)" or "SEO meta (uk-UA)". */
  context: string;
}

const MAX_META_TITLE = 55;
const MAX_META_DESCRIPTION = 155;

const COMMA_DECIMAL_LOCALES = new Set(['uk-UA', 'ru-UA', 'pl-PL', 'de-DE', 'es-ES', 'pt-PT']);
const NBSP_THOUSANDS_LOCALES = new Set(['uk-UA', 'ru-UA', 'pl-PL', 'pt-PT']); // de-DE/es-ES allow dot OR space

/**
 * Heuristic check for the locale decimal/thousands separator (Schema v3 Appendix), run on the
 * full HTML including spec-table cells — the separator localizes everywhere, not just in prose.
 * Dot-decimal locales (en-*, es-US, es-MX) need no check: the source's dot is already correct.
 */
function checkNumberFormatting(html: string, locale: string | undefined, issues: ValidationIssue[], context: string): void {
  if (!locale || !COMMA_DECIMAL_LOCALES.has(locale)) return;

  const text = html.replace(/\s(?:href|src)="[^"]*"/gi, ''); // drop URLs to cut false positives

  // Decimal point where a comma is required. Excludes multi-part versions (1.2.3) and
  // v-prefixed versions (v1.5). Known limitation: a bare two-part version like "AMS 2.0"
  // can still false-positive — accepted, severity stays 'warning'.
  const dotDecimal = text.match(/(?<![\w.])\d+\.(?!\d{3}(?!\d))\d+(?!\.\d)/);
  if (dotDecimal) {
    issues.push({
      severity: 'warning',
      rule: 'decimal-separator',
      detail: `Decimal point used where ${locale} requires a comma (e.g. "${dotDecimal[0]}").`,
      context,
    });
  }

  // EN-style comma-grouped thousands. A single ",ddd" group (e.g. "1,234") is a VALID decimal
  // number in a comma-decimal locale ("1,234 kg" = 1.234 kg) — must not flag that. Only flag
  // when unambiguous: two+ comma groups ("1,234,567") or a comma group followed by a
  // dot-decimal tail ("1,234.56" — mixes EN thousands with a dot decimal).
  const commaThousands = text.match(/\d{1,3}(?:,\d{3}){2,}\b|\d{1,3},\d{3}\.\d+\b/);
  if (commaThousands) {
    issues.push({
      severity: 'warning',
      rule: 'thousands-separator',
      detail: `English-style comma-grouped thousands found where ${locale} expects space/dot grouping (e.g. "${commaThousands[0]}").`,
      context,
    });
  }
}

/**
 * EXPERT3D ToV forbidden calques (es-ES). locale 'es-ES' is exclusive to EXPERT3D/Impresora-3D
 * in STORE_REGISTRY, so keying on it is equivalent to gating on the store. Warning-only:
 * "huella" can be legitimate (huella de carbono), so it flags rather than blocks. Single-word
 * ambiguous items (útiles / flujo de trabajo) are left to the prompt overlay, not the validator.
 */
const ES_FORBIDDEN_CALQUES: Array<{ re: RegExp; fix: string }> = [
  { re: /\bhuellas?\b/i, fix: 'superficie de ocupación / espacio de instalación' },
  { re: /\bde extremo a extremo\b/i, fix: 'de principio a fin / integral' },
  { re: /\bproducci[oó]n puentes?\b/i, fix: 'producción de transición' },
  { re: /\bfixtures?\b/i, fix: 'fijaciones / utillajes de sujeción' },
  { re: /\benvases prot[eé]sicos?\b/i, fix: 'encajes protésicos' },
];

function checkExpert3dSpanishCalques(html: string, locale: string | undefined, issues: ValidationIssue[], context: string): void {
  if (locale !== 'es-ES') return;
  const text = html.replace(/<[^>]*>/g, ' ');
  for (const { re, fix } of ES_FORBIDDEN_CALQUES) {
    const m = text.match(re);
    if (m) {
      issues.push({
        severity: 'warning',
        rule: 'es-forbidden-calque',
        detail: `Anglicism/calque "${m[0]}" — use "${fix}" (EXPERT3D ToV §7.3).`,
        context,
      });
    }
  }
}

/**
 * EXPERT3D ToV forbidden calques (pt-PT). locale 'pt-PT' is exclusive to EXPERT3D/Impresora-3D
 * in STORE_REGISTRY. Warning-only. Flags Brazilianisms and anglicism calques; ambiguous single
 * words are left to the prompt asset, not the validator ("pegada de carbono" is legitimate).
 */
const PT_FORBIDDEN_CALQUES: Array<{ re: RegExp; fix: string }> = [
  { re: /\barquivos?\b/i, fix: 'ficheiro(s) (pt-BR calque)' },
  { re: /\btelas?\b/i, fix: 'ecrã(s) (pt-BR calque)' },
  { re: /\busu[aá]rios?\b/i, fix: 'utilizador(es) (pt-BR calque)' },
  { re: /\bperformance\b/i, fix: 'desempenho' },
  { re: /\bde ponta a ponta\b/i, fix: 'integral / de princípio a fim' },
  { re: /\bpegada de instala[cç][aã]o\b/i, fix: 'área de instalação / ocupação' },
];

function checkExpert3dPortugueseCalques(html: string, locale: string | undefined, issues: ValidationIssue[], context: string): void {
  if (locale !== 'pt-PT') return;
  const text = html.replace(/<[^>]*>/g, ' ');
  for (const { re, fix } of PT_FORBIDDEN_CALQUES) {
    const m = text.match(re);
    if (m) {
      issues.push({
        severity: 'warning',
        rule: 'pt-forbidden-calque',
        detail: `Anglicism/Brazilianism "${m[0]}" — use "${fix}" (EXPERT3D ToV pt-PT).`,
        context,
      });
    }
  }
}

/**
 * Latin SI units left uncyrillized in uk-UA / ru-UA output ([UNIT LOCALIZATION]).
 * Warning-only. Most of the fixed Latin exception list from the rule (°C, °F, dpi, px, fps,
 * K, ppm) is deliberately absent from the pattern, so those never fire. VAC / "V AC" is the
 * one exception that DOES need an explicit carve-out: it shares the bare "V" token with the
 * genuine voltage unit, so "V" only matches when NOT immediately followed by (optional space
 * +) "AC". Runs on text with the product name and href/src values already stripped (same
 * guard as unit-spacing) — Latin units inside a brand/model suffix like "Ortur … 10W" are the
 * name, not prose. Composite units flag on their first Latin part (e.g. "kg" inside "kg/h") —
 * the fix message covers the whole unit.
 */
const LATIN_UNIT_IN_CYRILLIC =
  /\d\s?(mm\/s|m\/s|kHz|MHz|GHz|Hz|mAh|mA|mV|kV|kW|mW|Mbit|Gbit|µm|μm|nm|mm²|mm³|cm²|cm³|m²|m³|mm|cm|km|kg|mg|ml|GB|MB|TB|rpm|V(?!\s?AC)|[WAglLm])(?![\w²³])/;

function checkCyrillicUnitLocalization(
  strippedHtml: string,
  locale: string | undefined,
  issues: ValidationIssue[],
  context: string,
): void {
  if (locale !== 'uk-UA' && locale !== 'ru-UA') return;
  const text = strippedHtml.replace(/<[^>]*>/g, ' ');
  const m = text.match(LATIN_UNIT_IN_CYRILLIC);
  if (m) {
    issues.push({
      severity: 'warning',
      rule: 'latin-unit-in-cyrillic-text',
      detail: `Latin unit "${m[1]}" in ${locale} output — cyrillize per [UNIT LOCALIZATION] (e.g. W→Вт, mm→мм, GHz→ГГц). Fixed Latin exceptions: °C, VAC, dpi, px, fps, K, ppm.`,
      context,
    });
  }
}

/** Counts visible characters by code point (so emoji/➔ count as 1, matching CMS limits). */
function charLength(s: string): number {
  return Array.from(s).length;
}

// ── Consumables char-limit helpers ─────────────────────────────────────────

/** Hard limit on visible text for consumable products (templateId = 'consumables-resin'). */
const CONSUMABLES_MAX_STRIPPED_CHARS = 2500;

/**
 * Strip HTML tags and decode common entities to get the visible character count
 * as a CMS or reader would see it.
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Public exports for the deterministic consumables trimmer (utils/consumables-trim.ts). */
export const CONSUMABLES_CHAR_LIMIT = CONSUMABLES_MAX_STRIPPED_CHARS;
export function strippedVisibleLength(html: string): number {
  return charLength(stripHtmlTags(html));
}

/**
 * Matches `name` even where fixNumberFormatting has since inserted a space between a digit
 * and an immediately-following unit letter (e.g. product name typed as "10W" but appearing
 * as "10 W" in the generated output after unit-spacing normalization). Only that digit/letter
 * boundary is made flexible; everything else in the name still matches literally.
 */
function buildProductNamePattern(name: string): RegExp {
  const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const flexible = escaped.replace(/(\d)(?=[A-Za-zµμ])/g, '$1\\s?');
  return new RegExp(flexible, 'g');
}

/**
 * Validates a single generated HTML body artifact.
 * @param html        the HTML body
 * @param context     label for reporting, e.g. "HTML (base/en)" or "HTML (UA)"
 * @param productName optional product name; occurrences are excluded from the
 *                    unit-spacing check to avoid false positives on model-name
 *                    suffixes like "Ortur R2 Smart Laser Engraver 10W".
 * @param locale      optional BCP47 locale (e.g. "uk-UA", "es-ES") for the decimal/thousands
 *                    separator check. Must be the real locale, not the internal task label —
 *                    "es-ES" (comma) and "es-US"/"es-MX" (dot) need different expectations.
 */
export function validateGeneratedHtml(
  html: string,
  context: string,
  productName?: string,
  locale?: string,
  options?: { templateId?: string },
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!html || !html.trim()) {
    issues.push({ severity: 'error', rule: 'empty-output', detail: 'Generated HTML is empty.', context });
    return issues;
  }

  // CONSUMABLES: hard char-count gate (visible text only, HTML stripped).
  if (options?.templateId === 'consumables-resin') {
    const len = charLength(stripHtmlTags(html));
    if (len > CONSUMABLES_MAX_STRIPPED_CHARS) {
      const over = len - CONSUMABLES_MAX_STRIPPED_CHARS;
      const liToCut = Math.ceil(over / 90) + 1; // ~90 visible chars per bullet, +1 buffer
      issues.push({
        severity: 'error',
        rule: 'consumables-char-limit',
        detail: `Visible text is ${len} chars; ceiling ${CONSUMABLES_MAX_STRIPPED_CHARS} (you are ${over} over). ` +
          `You cannot count characters, so make STRUCTURAL cuts: remove ${liToCut} entire <li> items ` +
          `(start with §C5 Storage, then §C3 Applications), shorten the §C1 hook to one sentence, drop adjectives in §C2. ` +
          `Aim for ~2100 for safety. NEVER remove or alter any spec-table row or numeric value.`,
        context,
      });
    }
  }

  // CRITICAL: <h1> in description body creates a duplicate H1 (CMS auto-generates H1).
  if (/<h1\b/i.test(html)) {
    issues.push({
      severity: 'error',
      rule: 'duplicate-h1',
      detail: 'Body contains <h1> — H1 is auto-generated by CMS; adding it manually creates a duplicate H1 that breaks SEO.',
      context,
    });
  }

  // CRITICAL: no schema.org/Product entity in the description body.
  if (/itemtype\s*=\s*["']https?:\/\/schema\.org\/Product(?![A-Za-z])/i.test(html)) {
    issues.push({
      severity: 'error',
      rule: 'duplicate-product-schema',
      detail: 'Body contains itemtype="schema.org/Product" — duplicates the CMS JSON-LD Product (GSC critical error).',
      context,
    });
  }

  // CRITICAL: FAQPage in body duplicates Journal theme's native FAQPage module.
  if (/itemtype\s*=\s*["']https?:\/\/schema\.org\/FAQPage(?![A-Za-z])/i.test(html)) {
    issues.push({
      severity: 'error',
      rule: 'no-faqpage-in-body',
      detail: 'Body contains itemtype="schema.org/FAQPage" — Journal module emits this; use faq_[ISO].html artifact instead.',
      context,
    });
  }

  // CRITICAL: HowTo in body duplicates Journal theme's native HowTo module.
  if (/itemtype\s*=\s*["']https?:\/\/schema\.org\/HowTo(?![A-Za-z])/i.test(html)) {
    issues.push({
      severity: 'error',
      rule: 'no-howto-in-body',
      detail: 'Body contains itemtype="schema.org/HowTo" — Journal module emits this; use howto_[ISO].html artifact instead.',
      context,
    });
  }

  // CRITICAL: PropertyValue microdata forbidden per Schema v3.0 §7 (plain HTML tables only).
  if (/itemprop\s*=\s*["']additionalProperty["']/i.test(html)) {
    issues.push({
      severity: 'error',
      rule: 'no-propertyvalue-in-body',
      detail: 'Body contains itemprop="additionalProperty" (PropertyValue) — spec tables must be plain HTML per Schema v3.0 §7.',
      context,
    });
  }

  // Leftover markdown fences.
  if (/```/.test(html)) {
    issues.push({ severity: 'error', rule: 'markdown-fence', detail: 'Output contains ``` markdown code fences.', context });
  }

  // <br> used for spacing (forbidden — semantic elements only).
  if (/<br\s*\/?>/i.test(html)) {
    issues.push({ severity: 'warning', rule: 'br-spacing', detail: 'Output contains <br> tags (use semantic spacing, not <br>).', context });
  }

  // Number glued to a unit, e.g. "1.75mm" or "200°C".
  // Strip href/src values first so URL slugs (e.g. /product/300mm-s) don't fire false positives.
  const htmlForUnitCheck = (productName?.trim()
    ? html.replace(buildProductNamePattern(productName), '\x00PRODUCT_NAME\x00')
    : html
  ).replace(/\s(?:href|src)="[^"]*"/gi, '');

  const gluedUnit = htmlForUnitCheck.match(/\d(?:W|mm|cm|°C|kg|µm|μm|mm\/s|MPa|GPa)\b/);
  if (gluedUnit) {
    issues.push({
      severity: 'warning',
      rule: 'unit-spacing',
      detail: `Missing space between number and unit (e.g. "${gluedUnit[0]}").`,
      context,
    });
  }

  // ASCII 'x' used as dimension separator instead of × (U+00D7).
  // Pattern: digit, optional spaces, lowercase 'x', optional spaces, digit — e.g. "1 x 4", "144x108"
  const asciiDimSep = htmlForUnitCheck.match(/\d\s*[x]\s*\d/);
  if (asciiDimSep) {
    issues.push({
      severity: 'warning',
      rule: 'dimension-separator',
      detail: `ASCII "x" used as dimension separator (e.g. "${asciiDimSep[0]}") — use × (U+00D7) per Schema v3.0 §7.`,
      context,
    });
  }

  // Decimal/thousands separator per locale — runs on the raw html (not the productName-stripped
  // variant above): a wrong separator inside a repeated Product Name must still be flagged.
  checkNumberFormatting(html, locale, issues, context);
  checkExpert3dSpanishCalques(html, locale, issues, context);
  checkExpert3dPortugueseCalques(html, locale, issues, context);
  // Uncyrillized Latin units (uk/ru) — runs on the name/URL-stripped variant: units inside a
  // brand/model suffix stay Latin by design ([PRODUCT NAME LOCALIZATION] keeps model codes as-is).
  checkCyrillicUnitLocalization(htmlForUnitCheck, locale, issues, context);

  // Image lazy-loading rule: first <img> must NOT be lazy; every subsequent one must be.
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const imgs = Array.from(doc.querySelectorAll('img'));
    imgs.forEach((img, i) => {
      const isLazy = img.getAttribute('loading') === 'lazy';
      if (i === 0 && isLazy) {
        issues.push({ severity: 'error', rule: 'lcp-image-lazy', detail: 'First image has loading="lazy" (LCP image must load eagerly).', context });
      }
      if (i > 0 && !isLazy) {
        issues.push({ severity: 'error', rule: 'image-not-lazy', detail: `Image #${i + 1} is missing loading="lazy".`, context });
      }
    });

    // Figure-wrapping rules (advisory).
    imgs.forEach((img, i) => {
      if (!img.closest('figure')) {
        issues.push({ severity: 'warning', rule: 'img-not-in-figure', detail: `Image #${i + 1} is not wrapped in a <figure>.`, context });
      }
    });
    Array.from(doc.querySelectorAll('figure')).forEach((fig, i) => {
      if (fig.querySelector('img') && !fig.querySelector('figcaption')) {
        issues.push({ severity: 'warning', rule: 'figure-missing-figcaption', detail: `<figure> #${i + 1} contains an image but no <figcaption>.`, context });
      }
    });
  } catch {
    // DOMParser unavailable (non-browser) — skip the image checks.
  }

  return issues;
}

/**
 * Validates the SEO metadata JSON against the hard meta rules.
 * @param seo            the parsed SEO response
 * @param currencySymbol expected currency symbol that meta_description must contain
 */
export function validateSeoMetadata(seo: SeoResponse | null, currencySymbol: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!seo || !Array.isArray(seo.seo_data) || seo.seo_data.length === 0) {
    issues.push({ severity: 'error', rule: 'seo-empty', detail: 'SEO metadata is missing or has no entries.', context: 'SEO meta' });
    return issues;
  }

  for (const entry of seo.seo_data) {
    const ctx = `SEO meta (${entry.language || '?'})`;

    const titleLen = charLength(entry.meta_title ?? '');
    if (titleLen > MAX_META_TITLE) {
      issues.push({ severity: 'error', rule: 'meta-title-length', detail: `meta_title is ${titleLen} chars (max ${MAX_META_TITLE}).`, context: ctx });
    }

    const desc = entry.meta_description ?? '';
    const descLen = charLength(desc);
    if (descLen > MAX_META_DESCRIPTION) {
      issues.push({ severity: 'error', rule: 'meta-description-length', detail: `meta_description is ${descLen} chars (max ${MAX_META_DESCRIPTION}).`, context: ctx });
    }
    if (!desc.includes('➔')) {
      issues.push({ severity: 'warning', rule: 'meta-description-cta', detail: 'meta_description does not end with the CTA arrow "➔".', context: ctx });
    }
    if (currencySymbol && !desc.includes(currencySymbol)) {
      issues.push({ severity: 'warning', rule: 'meta-description-currency', detail: `meta_description does not include the currency symbol "${currencySymbol}".`, context: ctx });
    }
  }

  return issues;
}
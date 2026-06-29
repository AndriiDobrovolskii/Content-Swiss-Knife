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

const COMMA_DECIMAL_LOCALES = new Set(['uk-UA', 'ru-UA', 'pl-PL', 'de-DE', 'es-ES']);
const NBSP_THOUSANDS_LOCALES = new Set(['uk-UA', 'ru-UA', 'pl-PL']); // de-DE/es-ES allow dot OR space

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
    // CONSUMABLES: hard char-count gate (visible text only, HTML stripped).
    if (options?.templateId === 'consumables-resin') {
      const stripped = stripHtmlTags(html);
      const len = charLength(stripped);
      if (len > CONSUMABLES_MAX_STRIPPED_CHARS) {
        issues.push({
          severity: 'warning',
          rule: 'consumables-char-limit',
          detail: `Consumables description is ${len} stripped chars (limit ${CONSUMABLES_MAX_STRIPPED_CHARS}). Trim §C2/§C3/§C4 prose.`,
          context,
        });
      }
    }
    return issues;
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
    ? html.replaceAll(productName.trim(), '\x00PRODUCT_NAME\x00')
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
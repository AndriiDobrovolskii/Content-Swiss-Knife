import { SeoResponse } from '../app/types';

/**
 * Post-generation validation of the hard acceptance criteria from CLAUDE.md.
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

/** Counts visible characters by code point (so emoji/➔ count as 1, matching CMS limits). */
function charLength(s: string): number {
  return Array.from(s).length;
}

/**
 * Validates a single generated HTML body artifact.
 * @param html  the HTML body
 * @param context label for reporting, e.g. "HTML (base/en)" or "HTML (UA)"
 */
export function validateGeneratedHtml(html: string, context: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!html || !html.trim()) {
    issues.push({ severity: 'error', rule: 'empty-output', detail: 'Generated HTML is empty.', context });
    return issues;
  }

  // CRITICAL: no schema.org/Product entity in the description body (matches Product,
  // not PropertyValue/ProductGroup, via a non-word boundary after "Product").
  if (/itemtype\s*=\s*["']https?:\/\/schema\.org\/Product(?![A-Za-z])/i.test(html)) {
    issues.push({
      severity: 'error',
      rule: 'duplicate-product-schema',
      detail: 'Body contains itemtype="schema.org/Product" — duplicates the CMS JSON-LD Product (GSC critical error).',
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

  // Number glued to a unit, e.g. "1.75mm" or "200°C" (must be "1.75 mm" / "200 °C").
  const gluedUnit = html.match(/\d(?:mm|cm|°C|kg|µm|μm|mm\/s|MPa|GPa)\b/);
  if (gluedUnit) {
    issues.push({
      severity: 'warning',
      rule: 'unit-spacing',
      detail: `Missing space between number and unit (e.g. "${gluedUnit[0]}").`,
      context,
    });
  }

  // Image lazy-loading rule: first <img> must NOT be lazy; every subsequent one must be.
  // DOMParser is available in the browser runtime (same as html-cleaner.ts).
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

/**
 * product-name-consistency.ts
 *
 * The product name must read identically wherever it appears — H1, meta, slug and body prose.
 * Nothing checked that before this.
 *
 * IT CANNOT BE GUARANTEED BY CONSTRUCTION. The body HTML is generated at pipeline step 1, but the
 * localized product name is only produced at step 2 (Task Slug) and consumed verbatim by Task B at
 * step 3. Task A never sees it, so agreement between them is coincidence, not design. A shipped
 * artifact read "Ortur H20 20 Вт" in H1/meta/slug and "Ortur H20 20 W" in the body.
 *
 * unit-cyrillize.ts removes the unit-script half of that divergence deterministically; this
 * catches whatever remains, including divergences it cannot fix (a different word order, a
 * dropped sub-model, a translated brand).
 *
 * WARNING SEVERITY, and it runs post-hoc in runOutputValidation rather than in the master repair
 * gate — at gate time the name does not exist yet.
 *
 * Pure functions, no LLM.
 */

import type { ValidationIssue } from './output-validator';
import type { SeoResponse, SlugResponse } from '../app/types';
import { LATIN_TO_CYRILLIC_UNITS } from './unit-tables';

/** Cyrillic unit -> the Latin spellings that map onto it. */
const CYRILLIC_TO_LATIN_UNITS = new Map<string, string[]>();
for (const [latin, { uk, ru }] of Object.entries(LATIN_TO_CYRILLIC_UNITS)) {
  for (const cyr of [uk, ru].filter((u): u is string => !!u)) {
    CYRILLIC_TO_LATIN_UNITS.set(cyr, [...(CYRILLIC_TO_LATIN_UNITS.get(cyr) ?? []), latin]);
  }
}

const NUMBER_THEN_UNIT = /(\d+(?:[.,]\d+)?)[   ]?([^\s\d<>«»,.;:()]+)/gu;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** Latin brand/model tokens — the part of a name that never translates. */
function brandTokens(name: string): string[] {
  return name
    .split(/\s+/)
    .map(t => t.replace(/^[«"'(]+|[»"'),.;:]+$/g, ''))
    .filter(t => /^[A-Za-z][A-Za-z0-9-]*$/.test(t) && t.length >= 2);
}

/** Text content only — a unit inside a URL is not a product-name occurrence. */
function visibleText(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

/**
 * @param html          generated HTML for one locale
 * @param localizedName the authoritative name for this locale, from Task Slug
 * @param locale        BCP47, for the message only
 * @param context       reporting label, e.g. "HTML (base)"
 */
export function validateProductNameConsistency(
  html: string,
  localizedName: string | undefined,
  locale: string,
  context: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!html?.trim() || !localizedName?.trim()) return issues;

  const body = visibleText(html);

  // 1. Unit-script drift: the name carries a Cyrillic unit, the body the Latin equivalent.
  const reported = new Set<string>();
  for (const [, digits, unit] of localizedName.matchAll(NUMBER_THEN_UNIT)) {
    const latinForms = CYRILLIC_TO_LATIN_UNITS.get(unit);
    if (!latinForms) continue;
    for (const latin of latinForms) {
      const drifted = new RegExp(`${esc(digits)}[ \\u00A0\\u202F]?${esc(latin)}(?![\\p{L}\\p{N}])`, 'u');
      if (!drifted.test(body) || reported.has(`${digits}${unit}`)) continue;
      reported.add(`${digits}${unit}`);
      issues.push({
        severity: 'warning',
        rule: 'product-name-unit-script-drift',
        detail:
          `The product name is "${localizedName}" (H1, meta and slug all use "${digits} ${unit}"), ` +
          `but the body writes "${digits} ${latin}" with a Latin unit. The storefront name field ` +
          `is authoritative — the body must match it character for character. ` +
          `[UNIT LOCALIZATION] requires Cyrillic units in ${locale}, including inside a repeated ` +
          `product name.`,
        context,
      });
    }
  }

  // 2. The name is missing entirely — §7's and §9's H2 templates both interpolate [Product], so
  //    absence means the model invented a second name for the same thing.
  const tokens = brandTokens(localizedName);
  if (tokens.length > 0 && !tokens.some(t => body.includes(t))) {
    issues.push({
      severity: 'warning',
      rule: 'product-name-absent-from-body',
      detail:
        `None of the product name's brand/model tokens (${tokens.join(', ')}) appears anywhere in ` +
        `the body, although the localized name is "${localizedName}". The body is probably using a ` +
        `different name for the same product.`,
      context,
    });
  }

  return issues;
}

/**
 * Cross-artifact check, run once per generation rather than per locale: Task B is instructed to
 * consume the Task Slug name VERBATIM as its h1, so any difference means that contract broke.
 */
export function validateProductNameH1SlugAgreement(
  seo: SeoResponse | null,
  slugs: SlugResponse | null,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!seo?.seo_data?.length || !slugs?.slugs?.length) return issues;

  const byLang = new Map(slugs.slugs.map(s => [s.language, s.name]));
  const norm = (s: string) => s.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

  for (const item of seo.seo_data) {
    const slugName = byLang.get(item.language);
    if (!slugName || !item.h1) continue;
    if (norm(item.h1) === norm(slugName)) continue;
    issues.push({
      severity: 'warning',
      rule: 'product-name-h1-slug-mismatch',
      detail:
        `H1 is "${item.h1}" but the slug name for the same locale is "${slugName}". Task B must ` +
        `consume the localized name verbatim, so these should be identical; the storefront ` +
        `product-name field will not match the page H1.`,
      context: `SEO (${item.language})`,
    });
  }

  return issues;
}

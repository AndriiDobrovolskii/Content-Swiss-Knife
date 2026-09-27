/**
 * seo-metadata-shape.ts
 *
 * US-3.1 T9 (FR-8, FR-9; plan D6). A sibling module to `output-validator.ts` — that file is FROZEN
 * and not authorized for this Story (OD-4's resolution), so the two new `meta_title`/`h1` checks
 * AC-4/AC-5 require live here instead, following the existing `heading-style.ts` /
 * `slug-validator.ts` / `product-name-consistency.ts` precedent of a sibling validation module.
 *
 * Two checks, per `seo_data[i]` entry:
 *   - `meta-title-h1-identical`   (error) — `h1` and `meta_title` must always differ (AC-5). A
 *     model literally echoing `h1` into `meta_title` is a distinct failure mode from the template
 *     violations below, and can arise even when the template shape otherwise looks fine (e.g. a
 *     title with no tail at all).
 *   - `meta-title-template-shape` (error) — `meta_title` must follow the single approved template,
 *     `{H1} - {Localized Category} {Spec}` (AC-4): no `| {site_name}` suffix anywhere, the `h1`
 *     value verbatim at the start (no mid-word truncation of the H1 core), and strictly longer than
 *     `h1` with a dash separator immediately following the `h1` prefix. Any one of these three
 *     conditions failing raises ONE issue for that entry — the conditions are alternative ways the
 *     same template requirement can break, not three independent rules.
 *
 * Both are silent when `h1` is absent — the same convention `product-name-consistency.ts:124`
 * already uses: there is nothing to compare a `meta_title` against without a real `h1`.
 *
 * Neither check is registered in `REPAIR_STRATEGIES` (repair-strategy.ts) — Out of scope for this
 * Story (see Task Breakdown T9's own Notes) — both fall through to `resolveLadder`'s
 * `['full-regen']` default despite carrying a `path`.
 */
import type { ValidationIssue } from './output-validator';
import type { SeoResponse } from '../app/types';

/**
 * A dash-shaped separator (hyphen, en dash or em dash) followed by at least one more character —
 * an appended tail with no separator at all, or a `meta_title` no longer than its own `h1` prefix,
 * both fail to match this.
 */
const DASH_TAIL = /^\s*[-–—]\s*\S/;

export function validateSeoMetadataShape(seo: SeoResponse | null, context: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!seo || !Array.isArray(seo.seo_data)) return issues;

  for (const [i, entry] of seo.seo_data.entries()) {
    const h1 = entry.h1 ?? '';
    if (!h1.trim()) continue; // nothing to compare against — see this module's own doc comment

    const metaTitle = entry.meta_title ?? '';
    const path = `seo_data[${i}].meta_title`;

    if (metaTitle === h1) {
      issues.push({
        severity: 'error',
        rule: 'meta-title-h1-identical',
        detail: `meta_title is byte-identical to h1 ("${h1}") — they must always differ.`,
        context,
        path,
      });
    }

    const hasSuffix = metaTitle.includes(' | ');
    const startsWithH1 = metaTitle.startsWith(h1);
    const hasDashTail = DASH_TAIL.test(metaTitle.slice(h1.length));
    if (hasSuffix || !startsWithH1 || !hasDashTail) {
      issues.push({
        severity: 'error',
        rule: 'meta-title-template-shape',
        detail:
          `meta_title ("${metaTitle}") does not follow the approved template ` +
          `"{H1} - {Localized Category} {Spec}" — it must start with the h1 value ("${h1}") ` +
          `verbatim (no mid-word truncation), continue with a dash separator, and carry no ` +
          `"| {site_name}" suffix.`,
        context,
        path,
      });
    }
  }

  return issues;
}

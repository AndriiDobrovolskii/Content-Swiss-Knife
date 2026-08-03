import { SLUG_PATTERN } from '../prompt-core/slug-utils';
import { invariantCore } from '../prompt-core/product-name-core';
import type { SlugResponse } from '../app/types';
import type { ValidationIssue } from './output-validator';

/**
 * A digit group that looks like a mangled model designator: "32 300". Once the slug step
 * substitutes a space for the slash in "32/300", the number normalizer reads it as a thousands
 * separator and collapses it to "32300" — so by the time anyone sees the artifact the original
 * is unrecoverable. Flagging the intermediate shape is the only place to catch it.
 */
const MANGLED_DESIGNATOR = /\b\d{1,3} \d{3}\b/;

/**
 * @param slug        the generated slug payload
 * @param sourceName  optional raw product name. When given, every localized `name` must still
 *                    contain the name's INVARIANT CORE — brand + model + configuration code.
 *                    Compared on the core, not the whole string: the descriptive part is
 *                    SUPPOSED to differ per locale ("3D сканер …" vs "… 3D Scanner …").
 */
export function validateSlugs(slug: SlugResponse | null, sourceName = ''): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!slug || !slug.slugs?.length) {
    issues.push({
      rule: 'slug-empty',
      severity: 'error',
      context: 'Slugs',
      detail: 'No slug data was produced.',
    });
    return issues;
  }

  const seen = new Map<string, string>(); // slug → first language that used it
  // Indexed so slug-charset can emit a machine-addressable `path` for tier-0 repair.
  for (const [i, item] of slug.slugs.entries()) {
    const ctx = `Slug (${item.language})`;
    if (!item.slug?.trim()) {
      issues.push({ rule: 'slug-blank', severity: 'error', context: ctx, detail: 'Slug is empty.' });
      continue;
    }
    if (!SLUG_PATTERN.test(item.slug)) {
      issues.push({
        rule: 'slug-charset',
        severity: 'error',
        context: ctx,
        detail: `Slug "${item.slug}" contains characters outside [a-z0-9-] or has stray hyphens.`,
        path: `slugs[${i}].slug`,
      });
    }
    const prior = seen.get(item.slug);
    if (prior) {
      issues.push({
        rule: 'slug-duplicate',
        severity: 'error',
        context: ctx,
        detail: `Slug "${item.slug}" duplicates the ${prior} slug.`,
      });
    } else {
      seen.set(item.slug, item.language);
    }

    // 'error' severity, not a thrown Error: validateSlugs feeds the repair gate, so an issue
    // triggers a regeneration and reaches the downloadable report, whereas a throw would crash
    // the run and bypass both. 'error' already blocks acceptance — that is the mechanism.
    const core = sourceName.trim() ? invariantCore(sourceName).trim() : '';
    if (core && item.name && !item.name.includes(core)) {
      issues.push({
        rule: 'slug-name-designator-lost',
        severity: 'error',
        context: ctx,
        detail:
          `Localized name "${item.name}" no longer contains the product's invariant core ` +
          `"${core}". Brand, model and any configuration code carry across every locale ` +
          `byte-for-byte; only the descriptive part is translated.`,
        path: `slugs[${i}].name`,
      });
    }

    if (item.name && MANGLED_DESIGNATOR.test(item.name)) {
      issues.push({
        rule: 'slug-name-designator-lost',
        severity: 'error',
        context: ctx,
        detail:
          `Localized name "${item.name}" contains a "NNN NNN" digit group. That is either a ` +
          `model designator whose separator was replaced by a space ("32/300" → "32 300"), or ` +
          `a thousands separator the number normalizer will silently delete. Neither survives.`,
        path: `slugs[${i}].name`,
      });
    }
  }
  return issues;
}

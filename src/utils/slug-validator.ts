import { SLUG_PATTERN } from '../prompt-core/slug-utils';
import type { SlugResponse } from '../app/types';
import type { ValidationIssue } from './output-validator';

export function validateSlugs(slug: SlugResponse | null): ValidationIssue[] {
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
  }
  return issues;
}

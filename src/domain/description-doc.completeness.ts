/**
 * description-doc.completeness.ts
 *
 * The template completeness gate (US-2.2 D3). Widening the shared schema (FR-17) makes §2-§7
 * omittable so the simplified templates can drop paragraphs; on its own that would let a FULL
 * description that forgets §3 or §7 validate. This sibling gate closes that hole:
 *
 *  - Full (templateId undefined, or any id that is not a simplified template): every paragraph
 *    that was mandatory before this Story is an `error` when absent. §5 and §6 stay optional.
 *  - Simplified: a paragraph the template requires is an `error` when absent; a paragraph it
 *    excludes is a `warning` (`template-excluded-paragraph`) when present. Nothing is stripped
 *    silently (the spec leaves stray output unspecified, plan R7).
 *  - Simplified §7 shape (FR-8, D4b): a present `specs` must carry exactly ONE category. That is
 *    the Doc-level equivalent of "one <tbody>, no <h3>, no title row", which only exist in
 *    rendered HTML.
 *
 * Pure: imports only types and the template registry. Not a frozen file.
 */
import type { ProductDescriptionDoc } from './description-doc';
import type { ValidationIssue } from '../utils/output-validator';
import { isSimplifiedTemplateId, paragraphsFor } from '../prompt-core/simplified-templates';

export interface CompletenessOptions {
  /** Accessories only: §3 was requested. Ignored for every other template. */
  includeFunctionality?: boolean;
  /** Whether the run has non-empty source specifications (FR-11: no specs -> no §7). */
  hasSpecs?: boolean;
}

const CONTEXT = 'Doc';

/** The document key(s) that carry each optional v4 paragraph. */
const KEYS_BY_PARAGRAPH: Record<number, Array<keyof ProductDescriptionDoc>> = {
  2: ['killerSpecs', 'keyBenefits'],
  3: ['functionality'],
  4: ['applications'],
  5: ['compatibility'],
  6: ['packageContents'],
  7: ['specs'],
};

/** What Full description required before US-2.2 (schema-wise): everything except §5 and §6. */
const FULL_REQUIRED: Array<keyof ProductDescriptionDoc> = [
  'killerSpecs', 'keyBenefits', 'functionality', 'applications', 'specs', 'cta',
];

const present = (doc: ProductDescriptionDoc, key: keyof ProductDescriptionDoc): boolean =>
  doc[key] !== undefined && doc[key] !== null;

export function validateTemplateCompleteness(
  doc: ProductDescriptionDoc,
  templateId: string | undefined,
  options: CompletenessOptions = {},
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isSimplifiedTemplateId(templateId)) {
    for (const key of FULL_REQUIRED) {
      if (!present(doc, key)) {
        issues.push({
          severity: 'error',
          rule: 'template-missing-paragraph',
          detail: `A full description requires "${String(key)}", but it is missing. Add the paragraph.`,
          context: CONTEXT,
          path: String(key),
        });
      }
    }
    return issues;
  }

  const includeFunctionality = options.includeFunctionality === true;
  const hasSpecs = options.hasSpecs !== false;
  const wanted = new Set(paragraphsFor(templateId, { includeFunctionality }));

  for (const [num, keys] of Object.entries(KEYS_BY_PARAGRAPH)) {
    const n = Number(num);
    const isWanted = wanted.has(n);
    for (const key of keys) {
      const has = present(doc, key);
      const path = String(key);

      if (!isWanted) {
        if (has) {
          issues.push({
            severity: 'warning',
            rule: 'template-excluded-paragraph',
            detail: `The "${templateId}" template does not include paragraph §${n} ("${path}"), but the document carries it. Omit it.`,
            context: CONTEXT,
            path,
          });
        }
        continue;
      }

      // §5 is conditional on source data: present or absent are both fine.
      if (n === 5) continue;

      if (n === 7) {
        if (hasSpecs && !has) {
          issues.push({
            severity: 'error',
            rule: 'template-missing-paragraph',
            detail: 'Source specifications were provided, so paragraph §7 ("specs") is required, but it is missing.',
            context: CONTEXT,
            path,
          });
        } else if (!hasSpecs && has) {
          issues.push({
            severity: 'warning',
            rule: 'template-specs-without-source',
            detail: 'No source specifications were provided, so paragraph §7 ("specs") must be omitted.',
            context: CONTEXT,
            path,
          });
        }
        continue;
      }

      if (!has) {
        issues.push({
          severity: 'error',
          rule: 'template-missing-paragraph',
          detail: `The "${templateId}" template requires paragraph §${n} ("${path}"), but it is missing. Add it.`,
          context: CONTEXT,
          path,
        });
      }
    }
  }

  // §8 (cta) is required everywhere; the schema enforces it, this keeps the gate self-contained.
  if (!present(doc, 'cta')) {
    issues.push({
      severity: 'error',
      rule: 'template-missing-paragraph',
      detail: 'Paragraph §8 ("cta") is required, but it is missing.',
      context: CONTEXT,
      path: 'cta',
    });
  }

  // FR-8 / D4b: a simplified §7 is one flat table = exactly one category.
  if (doc.specs && doc.specs.categories.length !== 1) {
    issues.push({
      severity: 'error',
      rule: 'simplified-specs-shape',
      detail:
        `specs.categories has ${doc.specs.categories.length} entries; a simplified template's §7 needs ` +
        `exactly one category, no headings. Merge every parameter row into a single category.`,
      context: CONTEXT,
      path: 'specs.categories',
    });
  }

  return issues;
}

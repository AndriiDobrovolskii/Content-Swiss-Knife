/**
 * simplified-specs-shape.ts
 *
 * HTML half of the FR-8 failure path (US-2.2 plan D4b). A simplified template's §7 is ONE flat
 * table: one <tbody>, no <h3> category sub-heading, no category title row. This validator
 * reads the rendered (or model-authored, on the legacy HTML path) §7 region and reports every
 * violation as an `error`, so the standard repair/retry path fires.
 *
 * WHY THIS IS ITS OWN FILE. `output-validator.ts` is FROZEN (AGENTS.md §9); logic lives here and the
 * frozen file gains one call (through `simplified-word-ranges.ts`), the same sibling-file pattern as
 * `image-manifest-coverage.ts` and `spec-category-shape.ts`.
 *
 * Structure is locale-independent, so callers run this for every locale. Full description (and any
 * unknown or stale id) is skipped, and an absent §7 (Spare parts, or empty source specs) yields
 * nothing. Imports only the ValidationIssue type and `parseSpecCategories`.
 */
import type { ValidationIssue } from './output-validator';
import { parseSpecCategories } from './spec-category-merge';
import { isSimplifiedTemplateId } from '../prompt-core/simplified-templates';

const RULE = 'simplified-specs-shape';

/** A body row that is only a heading: a single (row-spanning) cell holding nothing but <b>/<strong> text. */
function isTitleRow(tr: Element): boolean {
  const cells = Array.from(tr.children).filter(c => c.tagName === 'TD' || c.tagName === 'TH');
  if (cells.length !== 1) return false;
  const cell = cells[0];
  return cell.children.length > 0
    && Array.from(cell.children).every(c => c.tagName === 'B' || c.tagName === 'STRONG');
}

export function validateSimplifiedSpecsShapeHtml(
  html: string,
  templateId: string | undefined,
  label: string,
): ValidationIssue[] {
  if (!isSimplifiedTemplateId(templateId)) return [];

  const sectionMatch = html.match(/<section\s+class="specs">([\s\S]*?)<\/section>/i);
  if (!sectionMatch) return [];

  const region = new DOMParser().parseFromString(`<div>${sectionMatch[1]}</div>`, 'text/html').body;
  const problems: string[] = [];

  const tables = region.querySelectorAll('table').length;
  if (tables > 1) problems.push(`${tables} tables`);

  const tbodies = region.querySelectorAll('tbody').length;
  if (tbodies > 1) problems.push(`${tbodies} <tbody> blocks`);

  if (region.querySelector('h3')) problems.push('an <h3> category sub-heading');

  const parsed = parseSpecCategories(html);
  if (parsed && parsed.categories.length > 1) problems.push(`${parsed.categories.length} categories`);

  const titleRows = Array.from(region.querySelectorAll('tbody tr')).filter(isTitleRow).length;
  if (titleRows > 0) problems.push('a category title row');

  if (problems.length === 0) return [];

  return [{
    severity: 'error',
    rule: RULE,
    detail:
      `§7 must be one single table with one <tbody>: no category sub-headings (<h3>), no category title ` +
      `rows, no second table. Found: ${problems.join(', ')}. Merge every parameter row into one table.`,
    context: label,
    path: 'specs.categories',
  }];
}

/**
 * spec-category-shape.ts
 *
 * Repair-gate guard for §7 category structure on the uk-UA MASTER.
 *
 * Guards the failure observed on Center 3D Print / Ortur H20 (2026-07-26): the store's Style B
 * ToV told the model that headings must never be bare nominal topics, the model generalized that
 * from <h2> to EVERY heading level, and since a §7 category label is inherently nominal
 * ("Лазерний модуль", "Безпека") it stopped emitting <h3> categories altogether — collapsing 15
 * spec rows into one catch-all category. Both prompts were corrected; this is the deterministic
 * backstop, because the same pressure exists for any future store voice.
 *
 * Runs BEFORE mergeSmallSpecCategories (validation happens inside the repair gate, the merge
 * after it), so it sees the model's raw N x <h3>+<table> shape and must PREDICT the merged one —
 * see SURVIVING CATEGORIES below.
 *
 * Pure function, no DOM mutation, no LLM. Mirrors specs-grounding.ts / structural-parity.ts:
 * imports only the ValidationIssue type from the frozen output-validator.
 */

import type { ValidationIssue } from './output-validator';
import type { ProductDescriptionDoc } from '../domain/description-doc';
import { parseSpecCategories, DEFAULT_MIN_ROWS } from './spec-category-merge';
import { SPEC_TABLE_HEADERS, resolveLocaleValue } from '../prompt-core/constants';

/**
 * Minimum number of merge-surviving categories §7 must carry. Matches the "3-6 categories"
 * contract stated in MASTER_SYSTEM_PROMPT §7 — the guard and the prompt must demand the same
 * thing, or a 2-category split passes validation while violating the instruction.
 */
export const MIN_SPEC_CATEGORIES = 3;

/**
 * Row count below which the guard stays silent. 9 = MIN_SPEC_CATEGORIES x DEFAULT_MIN_ROWS, i.e.
 * the smallest total that can actually satisfy the remedy. Below it, demanding 3 categories of
 * >= 3 rows is unsatisfiable, so firing would send the repair gate after an impossible fix.
 */
export const MIN_ROWS_TO_REQUIRE_CATEGORIES = MIN_SPEC_CATEGORIES * DEFAULT_MIN_ROWS;

/**
 * Flags a §7 section that collapsed into too few spec categories.
 *
 * SURVIVING CATEGORIES: only categories with >= DEFAULT_MIN_ROWS rows are counted, because
 * mergeSmallSpecCategories dissolves everything smaller into one "Загальні відомості" block.
 * Counting emitted categories instead would pass "5 categories of 2 rows", which merges down to
 * the single catch-all category this guard exists to prevent.
 *
 * @param options.templateId  'consumables-resin' disables the check — the consumables simplified
 *                            schema (§C4) forbids <h3> outright, so every consumable would fire.
 * @param options.locale      Drives the example column headers in the repair message; defaults to
 *                            the uk-UA master's.
 */
export function validateSpecCategoryShape(
  html: string,
  context: string,
  options?: { templateId?: string; locale?: string },
): ValidationIssue[] {
  if (options?.templateId === 'consumables-resin') return [];

  const parsed = parseSpecCategories(html);
  if (!parsed) return []; // no <section class="specs"> — nothing to judge

  const { categories } = parsed;
  const totalRows = categories.reduce((sum, cat) => sum + cat.rows.length, 0);
  const surviving = categories.filter(cat => cat.rows.length >= DEFAULT_MIN_ROWS).length;

  if (totalRows < MIN_ROWS_TO_REQUIRE_CATEGORIES) return [];
  if (surviving >= MIN_SPEC_CATEGORIES) return [];

  const [paramHeader, valueHeader] = resolveLocaleValue(
    SPEC_TABLE_HEADERS, options?.locale ?? 'uk-ua', SPEC_TABLE_HEADERS['uk-ua'],
  );

  // Prescriptive, not merely diagnostic: this string is fed back to the model by
  // appendRepairFeedback, and a repair pass told only "this is wrong" tends to invent a new
  // format (a merged table, or Markdown). The literal wrapper below mirrors serializeCategory()
  // in spec-category-merge.ts, so a repaired artifact parses identically to a first-pass one.
  const detail =
    `The specifications section (§7) collapsed into ${surviving} ` +
    `categor${surviving === 1 ? 'y' : 'ies'} of ${DEFAULT_MIN_ROWS}+ rows for ${totalRows} spec ` +
    `rows (minimum ${MIN_SPEC_CATEGORIES} required). Distribute the rows into ` +
    `${MIN_SPEC_CATEGORIES}-6 logical semantic groups — e.g. optics/laser or print engine, ` +
    `safety, electronics & connectivity, dimensions & mechanics, software. Emit each group as an ` +
    `<h3> holding the category name IN THE TARGET OUTPUT LANGUAGE, immediately followed by that ` +
    `group's own table in exactly this shape: ` +
    `<div class="table-responsive"><table><thead><tr><th>${paramHeader}</th>` +
    `<th>${valueHeader}</th></tr></thead><tbody><tr><td>Label</td><td>Value</td></tr></tbody>` +
    `</table></div>. Each group needs at least ${DEFAULT_MIN_ROWS} rows. HTML only — never ` +
    `Markdown, and never one merged table. DO NOT change any row label, value, unit, or the ` +
    `total row count: this is a regrouping of existing rows, nothing else.`;

  return [{ severity: 'error', rule: 'spec-category-collapse', detail, context }];
}

/**
 * Doc-reading sibling of validateSpecCategoryShape.
 *
 * ADDED IN THE FINAL-REVIEW FIX WAVE, NOT PORTED WITH THE OTHER TASK 1 SIBLINGS. The migration plan
 * originally dropped this guard from the Doc-path gate on the premise that `renderDescription()`
 * guarantees §7 category shape "by construction." That premise is wrong: the renderer faithfully
 * renders whatever `SpecCategory[]` shape the model hands it — it does not decide how many
 * categories exist or how rows are grouped into them. That grouping is a model JUDGMENT CALL, the
 * same content decision the HTML-reading version guards against, and the module's own docstring
 * above names the real incident this exists for: Center 3D Print / Ortur H20 (2026-07-26), a store
 * that is Doc-enrolled today. Dropping the check on the Doc path would silently reopen that exact
 * failure mode for every enrolled store.
 *
 * SURVIVING CATEGORIES, DOC VERSION: same rule as the HTML sibling — only categories with
 * `>= DEFAULT_MIN_ROWS` rows count, because mergeSmallSpecCategories-equivalent logic downstream
 * dissolves anything smaller into one catch-all. Here that is simply
 * `doc.specs.categories.filter(c => c.rows.length >= DEFAULT_MIN_ROWS).length` — no HTML to parse,
 * the Doc already carries `SpecCategory[]` directly.
 *
 * REPAIR FEEDBACK IS JSON-SHAPED, NOT HTML-SHAPED. The HTML sibling's `detail` prescribes literal
 * `<h3>`/`<table>` markup, because that is what a full HTML regeneration needs to hear. That
 * markup would be actively wrong feedback for a Doc regeneration — the model would either emit HTML
 * inside a JSON string field (a schema violation) or ignore the instruction. This version instead
 * asks for a `specs.categories[]` regrouping in JSON terms.
 *
 * @param doc     the ProductDescriptionDoc under validation
 * @param context reporting label, e.g. "Doc (base)"
 * @param options.templateId 'consumables-resin' disables the check — same carve-out as the HTML
 *                            sibling (the Doc pipeline never runs for consumables in the first
 *                            place — see doc-pipeline-flag.ts — but the parameter is accepted for
 *                            symmetry with the HTML sibling's call shape).
 * @param options.locale      drives the example column headers in the repair message; defaults to
 *                            the uk-UA master's.
 */
export function validateSpecCategoryShapeDoc(
  doc: ProductDescriptionDoc,
  context: string,
  options?: { templateId?: string; locale?: string },
): ValidationIssue[] {
  if (options?.templateId === 'consumables-resin') return [];

  const categories = doc.specs.categories;
  const totalRows = categories.reduce((sum, cat) => sum + cat.rows.length, 0);
  const surviving = categories.filter(cat => cat.rows.length >= DEFAULT_MIN_ROWS).length;

  if (totalRows < MIN_ROWS_TO_REQUIRE_CATEGORIES) return [];
  if (surviving >= MIN_SPEC_CATEGORIES) return [];

  const [paramHeader, valueHeader] = resolveLocaleValue(
    SPEC_TABLE_HEADERS, options?.locale ?? 'uk-ua', SPEC_TABLE_HEADERS['uk-ua'],
  );

  const detail =
    `specs.categories[] collapsed into ${surviving} ` +
    `categor${surviving === 1 ? 'y' : 'ies'} of ${DEFAULT_MIN_ROWS}+ rows for ${totalRows} spec ` +
    `rows (minimum ${MIN_SPEC_CATEGORIES} required). Regroup specs.categories into ` +
    `${MIN_SPEC_CATEGORIES}-6 logical semantic groups — e.g. optics/laser or print engine, ` +
    `safety, electronics & connectivity, dimensions & mechanics, software. Each SpecCategory needs ` +
    `a "title" naming the group IN THE TARGET OUTPUT LANGUAGE (e.g. "${paramHeader}" / ` +
    `"${valueHeader}" are the column labels a renderer would use for its table, not a category ` +
    `title) and at least ${DEFAULT_MIN_ROWS} "rows". DO NOT change any row's label, value, or unit, ` +
    `and do not change the total row count: this is a regrouping of existing rows into different ` +
    `categories, nothing else.`;

  return [{ severity: 'error', rule: 'spec-category-collapse', detail, context }];
}

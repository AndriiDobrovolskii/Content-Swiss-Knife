/**
 * table-finalize.ts
 *
 * Decision-free HTML rewrites applied to EVERY locale variant (uk-UA master + every Task C
 * translation) independently, as the LAST step before storing/displaying content — strictly
 * AFTER repair-gate/validation has accepted the artifact. Because validateStructuralParity
 * already guarantees every translation mirrors the master's category/row structure 1:1 before
 * this runs, applying the same pure transform to each locale independently cannot cause
 * cross-locale drift — there is no decision left to make, only re-rendering.
 *
 * Pure functions, no LLM.
 */

import { getKillerSpecsHeaders } from '../prompt-core/constants';

/**
 * §7 spec-table presentation, fixed by the store owner against the live OpenCart/Journal
 * theme. These four literals ARE the contract — `render-description.ts` reproduces them and
 * `table-finalize.spec.ts` asserts them byte-for-byte, so change them in one place only.
 *
 * The header row is deliberately `<td><b>…</b></td>` rather than `<th>`. That is a worse
 * accessibility story — a screen reader will not associate data cells with the header — and
 * it was chosen anyway, explicitly, because it is what the theme's own templates emit. Do
 * not "fix" it to `<th scope="col">" without asking: it is a decision, not an oversight.
 */
const SPEC_TABLE_CLASS = 'table table-bordered table-striped';
const SPEC_TABLE_STYLE = 'table-layout: fixed;';
const SPEC_PARAM_COL_STYLE = 'width: 45%;';

// Marker phrases for the §2 "why it matters" header cell, one per locale family — see
// master-system-prompt.ts §2. Deliberately more complete than output-validator.ts's
// checkLeadInCapitalization regex, which is missing the pl-PL/de-DE phrases — that gap is
// pre-existing and out of scope to fix there (output-validator.ts is frozen), but this new
// detector doesn't need to inherit it.
const WHY_IT_MATTERS_MARKERS = [
  'Чому це важливо', 'Why it matters', 'Por qué es importante',
  'Porque é importante', 'Dlaczego to ważne', 'Warum es wichtig ist',
];

/**
 * Collapses a 3-column killer-specs table (Specification | Value | Why it matters) into 2
 * columns (Parameter+Value combined | Why it matters), replacing the header row with the
 * locale-appropriate pair. Runs on already-validated HTML — output-validator's
 * checkLeadInCapitalization() has already run against the 3-column shape by this point.
 *
 * Detection is deliberately layered to avoid mistaking an unrelated 3-column table (e.g. a
 * filament-compatibility or bundle-contents table) for killer-specs: the candidate table must
 * (a) not be inside <section class="specs">, (b) have exactly 3 header cells, AND (c) contain
 * one of the known "why it matters" marker phrases in its header row. A table matching (a)+(b)
 * but not (c) is left untouched.
 */
export function collapseKillerSpecsToTwoColumns(html: string, locale = '', storeName = ''): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const candidate = Array.from(doc.querySelectorAll('table'))
    .find(t => !t.closest('section.specs') && t.querySelectorAll('thead th').length === 3);
  if (!candidate) {
    console.warn('[table-finalize] No 3-column table found outside section.specs — skipping 2-column collapse');
    return html;
  }

  const headerText = candidate.querySelector('thead')?.textContent ?? '';
  const table = WHY_IT_MATTERS_MARKERS.some(marker => headerText.includes(marker)) ? candidate : null;
  if (!table) {
    console.warn('[table-finalize] Found a 3-column table outside section.specs but no "why it matters" marker in its header — leaving it untouched (likely an unrelated table, e.g. compatibility/comparison)');
    return html;
  }

  // Locale-agnostic fallback: the Optimizer (unlike Task A/C) never has a known store OR locale,
  // and its input can be in ANY language, not just STORE_REGISTRY's set. When `locale` isn't a
  // recognized key, reuse the header text the model already wrote for THIS table instead of
  // defaulting to English — the artifact is its own source of truth for what language it's in.
  // `storeName` only selects WHICH header map is consulted (see getKillerSpecsHeaders); it never
  // affects this fallback, so the Optimizer path behaves identically with or without a store.
  const ths = Array.from(table.querySelectorAll('thead th'));
  const [paramHeader, benefitHeader] =
    getKillerSpecsHeaders(locale, storeName) ??
    [ths[0]?.textContent?.trim() || 'Parameter', ths[2]?.textContent?.trim() || 'Why it matters'];

  for (const row of Array.from(table.querySelectorAll('tbody tr'))) {
    const cells = row.querySelectorAll('td');
    if (cells.length !== 3) continue; // malformed row — skip defensively
    const [specCell, valueCell, whyCell] = Array.from(cells);
    const merged = doc.createElement('td');
    merged.textContent = `${specCell.textContent?.trim()}: ${valueCell.textContent?.trim()}`;
    row.replaceChild(merged, specCell);
    row.removeChild(valueCell);
    void whyCell; // stays as-is, now the 2nd column
  }

  const thead = table.querySelector('thead tr');
  if (thead) {
    thead.innerHTML = `<th>${paramHeader}</th><th>${benefitHeader}</th>`;
  }

  return doc.body.innerHTML;
}

/**
 * Reads the two column labels a §7 table already carries, tolerating both the shape the
 * MODEL emits (`<th>Параметр</th><th>Значення</th>`) and the shape this function emits
 * (`<td><b>Параметр</b></td>`), which is what makes the whole transform idempotent.
 *
 * Returns null when the table has no header row at all. The caller then borrows another
 * category's labels rather than substituting English ones — every §7 category in one
 * artifact shares the same pair, and injecting "Parameter/Value" into a Ukrainian document
 * would be a worse outcome than omitting the header. Same reasoning as the Optimizer
 * fallback in collapseKillerSpecsToTwoColumns above: the artifact is its own source of
 * truth for what language it is in.
 */
function readHeaderLabels(table: Element): [string, string] | null {
  const cells = Array.from(table.querySelectorAll(':scope > thead > tr:first-child > th, :scope > thead > tr:first-child > td'));
  if (cells.length < 2) return null;
  const first = cells[0].textContent?.trim() ?? '';
  const second = cells[1].textContent?.trim() ?? '';
  return first && second ? [first, second] : null;
}

/** `.las` + `.ply` as separate <li> → "las, .ply" in one cell. See the §7 prompt rule. */
function collapseListCellsToCommaText(table: Element): void {
  for (const list of Array.from(table.querySelectorAll('td > ul, td > ol'))) {
    const items = Array.from(list.querySelectorAll(':scope > li'))
      .map(li => li.textContent?.trim() ?? '')
      .filter(Boolean);
    list.replaceWith(list.ownerDocument.createTextNode(items.join(', ')));
  }
}

/**
 * Applies the store's §7 presentation to each per-category <h3>+<table> block inside
 * <section class="specs">. Only mutates HTML inside that section; everything else is
 * preserved verbatim. Pure and idempotent.
 *
 * REPLACED flattenSpecCategoriesToColspanTable, which merged the N category blocks into one
 * table with colspan header rows. The store's template is the per-category shape — which is
 * also what the model already emits (master §7: "One logical category = one <h3> + one
 * table"), so this now only decorates that structure instead of rebuilding it. Category and
 * row counts are therefore preserved by construction, which the old flattener could not
 * claim.
 */
export function restyleSpecTables(html: string): string {
  const sectionMatch = html.match(/<section\s+class="specs">([\s\S]*?)<\/section>/i);
  if (!sectionMatch) return html;

  const doc = new DOMParser().parseFromString(`<div>${sectionMatch[1]}</div>`, 'text/html');
  const root = doc.body.firstElementChild!;

  const tables = Array.from(root.querySelectorAll('table'));
  // Borrowed from the first category that has a header row — see readHeaderLabels.
  const fallbackLabels = tables.map(readHeaderLabels).find(Boolean) ?? null;

  for (const table of tables) {
    table.setAttribute('class', SPEC_TABLE_CLASS);
    table.setAttribute('style', SPEC_TABLE_STYLE);
    collapseListCellsToCommaText(table);

    const labels = readHeaderLabels(table) ?? fallbackLabels;
    if (!labels) continue;

    const thead = table.querySelector(':scope > thead') ?? table.insertBefore(doc.createElement('thead'), table.firstChild);
    thead.innerHTML =
      `<tr><td style="${SPEC_PARAM_COL_STYLE}"><b>${labels[0]}</b></td><td><b>${labels[1]}</b></td></tr>`;
  }

  // <!-- CATEGORY --> marker before each <h3>, so the exported HTML stays scannable when a
  // human opens it in the CMS source view. Skipped when one is already there, which is what
  // keeps a second pass a no-op.
  for (const h3 of Array.from(root.querySelectorAll('h3'))) {
    const previous = h3.previousSibling?.nodeType === 3 && !h3.previousSibling.textContent?.trim()
      ? h3.previousSibling.previousSibling
      : h3.previousSibling;
    if (previous?.nodeType === 8) continue; // Node.COMMENT_NODE — already marked
    h3.parentNode?.insertBefore(doc.createComment(` ${(h3.textContent ?? '').trim().toUpperCase()} `), h3);
  }

  const restyled = `<section class="specs">${root.innerHTML}</section>`;
  return html.slice(0, sectionMatch.index!) + restyled + html.slice(sectionMatch.index! + sectionMatch[0].length);
}

/** Composed entry point — call once per locale, after validation/repair-gate acceptance. */
export function finalizeTablesForDisplay(html: string, locale = '', storeName = ''): string {
  return restyleSpecTables(collapseKillerSpecsToTwoColumns(html, locale, storeName));
}

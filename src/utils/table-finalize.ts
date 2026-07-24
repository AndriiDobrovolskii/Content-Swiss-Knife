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

import { KILLER_SPECS_HEADERS } from '../prompt-core/constants';

const DEFAULT_HEADERS: [string, string] = KILLER_SPECS_HEADERS['en-gb'];

// OpenCart's default theme table CSS doesn't visually separate a colspan category-header row
// from ordinary rows — a deliberate, isolated inline-style exception (see CLAUDE.md's own
// precedent for the <figure> wrapper styles). Centralized here so a future palette/spacing
// tweak is a one-line change instead of a find-and-replace.
const CATEGORY_HEADER_STYLE = 'text-align: center; padding: 10px; font-weight: bold;';

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
export function collapseKillerSpecsToTwoColumns(html: string, locale = ''): string {
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

  // Locale-agnostic fallback: the Optimizer (unlike Task A/C) never has a known store locale, and
  // its input can be in ANY language, not just STORE_REGISTRY's set. When `locale` isn't a
  // recognized key, reuse the header text the model already wrote for THIS table instead of
  // defaulting to English — the artifact is its own source of truth for what language it's in.
  const ths = Array.from(table.querySelectorAll('thead th'));
  const [paramHeader, benefitHeader] =
    KILLER_SPECS_HEADERS[locale.toLowerCase()] ??
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
 * Flattens the (already merged, per spec-category-merge.ts) N x <h3>+<table> blocks inside
 * <section class="specs"> into ONE <table> with full-width colspan category-header rows.
 * Only mutates HTML inside <section class="specs">; everything else is preserved verbatim.
 */
export function flattenSpecCategoriesToColspanTable(html: string): string {
  const sectionMatch = html.match(/<section\s+class="specs">([\s\S]*?)<\/section>/i);
  if (!sectionMatch) return html;

  const doc = new DOMParser().parseFromString(`<div>${sectionMatch[1]}</div>`, 'text/html');
  const root = doc.body.firstElementChild!;
  const h2 = root.querySelector('h2')?.outerHTML ?? '';

  const rowsHtml: string[] = [];
  for (const child of Array.from(root.children)) {
    if (child.tagName === 'H3') {
      rowsHtml.push(`<tr><th colspan="2" style="${CATEGORY_HEADER_STYLE}">${child.textContent}</th></tr>`);
    } else if (child.matches('div.table-responsive, table')) {
      const table = child.matches('table') ? child : child.querySelector('table');
      for (const tr of Array.from(table?.querySelectorAll('tbody tr') ?? [])) {
        rowsHtml.push(tr.outerHTML);
      }
    }
  }

  const combined =
    `<section class="specs">\n${h2}\n` +
    `<div class="table-responsive"><table>\n${rowsHtml.join('\n')}\n</table></div>\n` +
    `</section>`;

  return html.slice(0, sectionMatch.index!) + combined + html.slice(sectionMatch.index! + sectionMatch[0].length);
}

/** Composed entry point — call once per locale, after validation/repair-gate acceptance. */
export function finalizeTablesForDisplay(html: string, locale = ''): string {
  return flattenSpecCategoriesToColspanTable(collapseKillerSpecsToTwoColumns(html, locale));
}

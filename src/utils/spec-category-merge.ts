/**
 * spec-category-merge.ts
 *
 * Deterministic pre-translation pass over the uk-UA master's <section class="specs">.
 * Dissolves any category with fewer than `minRows` rows into a "Загальні відомості" category,
 * always placed first. Runs BEFORE Task C — output shape is unchanged from what Task C,
 * countSpecCategories(), validateStructuralParity, and validateSpecsGrounding already expect:
 * N x <h3>+<table> pairs inside <section class="specs">. Only N and the row distribution change.
 *
 * Pure function, no mutation of caller's input, no LLM. Mirrors specs-grounding.ts's style of
 * scoping to <section class="specs">.
 */

import { BASE_CATEGORY_LABELS, SPEC_TABLE_HEADERS, resolveLocaleValue } from '../prompt-core/constants';

export const DEFAULT_MIN_ROWS = 3;
const DEFAULT_LOCALE = 'uk-ua';

interface SpecCategory {
  label: string;
  rows: string[]; // each a full "<tr>...</tr>" string, tbody rows only
}

/** Parses <section class="specs"> into its <h2> and ordered {label, rows[]} category blocks.
 *  Returns null if the section is absent. Everything outside the section is preserved verbatim
 *  in `before`/`after` — this function never touches HTML outside its own section. */
function parseSpecCategories(html: string): { before: string; h2: string; categories: SpecCategory[]; after: string } | null {
  const sectionMatch = html.match(/<section\s+class="specs">([\s\S]*?)<\/section>/i);
  if (!sectionMatch) return null;
  const before = html.slice(0, sectionMatch.index!);
  const after = html.slice(sectionMatch.index! + sectionMatch[0].length);

  const doc = new DOMParser().parseFromString(`<div>${sectionMatch[1]}</div>`, 'text/html');
  const root = doc.body.firstElementChild!;
  const h2 = root.querySelector('h2')?.outerHTML ?? '';
  const categories: SpecCategory[] = [];
  let currentH3: Element | null = null;

  for (const child of Array.from(root.children)) {
    if (child.tagName === 'H3') {
      currentH3 = child;
    } else if (currentH3 && child.matches('div.table-responsive, table')) {
      const table = child.matches('table') ? child : child.querySelector('table');
      const rows = Array.from(table?.querySelectorAll('tbody tr') ?? []).map(tr => tr.outerHTML);
      categories.push({ label: currentH3.textContent?.trim() ?? '', rows });
      currentH3 = null;
    }
  }
  return { before, h2, categories, after };
}

function serializeCategory(cat: SpecCategory, headers: [param: string, value: string]): string {
  const [paramHeader, valueHeader] = headers;
  return `<h3>${cat.label}</h3>\n` +
    `<div class="table-responsive"><table>\n` +
    `<thead><tr><th>${paramHeader}</th><th>${valueHeader}</th></tr></thead>\n` +
    `<tbody>${cat.rows.join('')}</tbody>\n` +
    `</table></div>`;
}

/**
 * Dissolves categories with < minRows rows into a single "General Information"-equivalent
 * category (localized per `locale`, default Ukrainian — see BASE_CATEGORY_LABELS), placed first.
 * If a category with that exact label already exists, its rows are kept in place and absorb the
 * dissolved rows (not duplicated as a second base-category block). No-op (returns input
 * unchanged) if <section class="specs"> is absent, or if nothing needs merging — callers must not
 * assume this function always mutates.
 */
export function mergeSmallSpecCategories(html: string, minRows: number = DEFAULT_MIN_ROWS, locale: string = DEFAULT_LOCALE): string {
  const parsed = parseSpecCategories(html);
  if (!parsed) return html;

  const baseLabel = resolveLocaleValue(BASE_CATEGORY_LABELS, locale, BASE_CATEGORY_LABELS[DEFAULT_LOCALE]);
  const headers = resolveLocaleValue(SPEC_TABLE_HEADERS, locale, SPEC_TABLE_HEADERS[DEFAULT_LOCALE]);

  const { before, h2, categories, after } = parsed;
  const kept: SpecCategory[] = [];
  const dissolvedRows: string[] = [];
  let baseCategory: SpecCategory | null = null;

  for (const cat of categories) {
    if (cat.label === baseLabel) {
      baseCategory = cat;
      continue; // handled after the loop, at the front
    }
    if (cat.rows.length < minRows) {
      dissolvedRows.push(...cat.rows);
    } else {
      kept.push(cat);
    }
  }

  if (dissolvedRows.length === 0 && !baseCategory) {
    return html; // nothing to merge — return input verbatim
  }

  const merged: SpecCategory = {
    label: baseLabel,
    rows: [...(baseCategory?.rows ?? []), ...dissolvedRows],
  };

  const finalCategories = [merged, ...kept];
  const rebuiltSection =
    `<section class="specs">\n${h2}\n` +
    finalCategories.map(cat => serializeCategory(cat, headers)).join('\n') +
    `\n</section>`;

  return before + rebuiltSection + after;
}

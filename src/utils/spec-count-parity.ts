import type { ValidationIssue, ValidationSeverity } from './output-validator';

/**
 * spec-count-parity.ts
 *
 * Supplementary anti-hallucination/anti-omission guard: checks that the number of rows in the
 * generated §7 Technical Specifications table matches the number of characteristics in the
 * canonical source input. Complements specs-grounding.ts's per-row label/numeric/Latin-token
 * grounding (which catches WHICH rows are wrong) with a row-COUNT check (which catches when the
 * total is off even if every individual row happens to pass grounding — e.g. a swapped row, or
 * a silently dropped one).
 *
 * WHY THIS READS `input.specs` DIRECTLY, NOT `groundingSpecs`
 * groundingSpecs() (content-orchestrator.service.ts) produces prose translated for label
 * matching — not guaranteed to preserve table structure, and dependent on a translation call
 * succeeding. Row counting needs none of that: a Markdown table's row boundaries are language-
 * independent. This module reads `input.specs` as-is, assuming it is already a canonical
 * "| Item | Specification |" table — true for the MD ingestion path, and true for Text/PDF/URL
 * paths once reviewed through the SpecsCanonicalizer. If no such table is detected, this
 * validator no-ops rather than guessing — see `countExpectedSpecRows`.
 *
 * WHY "EXPECTED" ISN'T A RAW LINE COUNT
 * Two source-level exclusions apply before counting, both taken directly from
 * master-system-prompt.ts §7 COMPLETENESS:
 *   1. A row whose value is empty/"N/A" is legitimately skipped by Task A — COMPLETENESS says
 *      so explicitly ("skip rows whose value is empty / 'N/A'").
 *   2. A row that states the product's own name is legitimately excluded — it becomes the H1,
 *      never a §7 row.
 * "Expected" = canonical input rows minus both of the above. Neither exclusion is invented here;
 * both mirror instructions Task A already receives.
 *
 * WHY isProductNameRow CHECKS THE LABEL FIRST, NOT JUST THE VALUE
 * The master prompt's exclusion rule is about the row's identity ("a Product Name / Title /
 * Model-identifier row"), not about the value matching a separate database field. Manufacturer
 * sheets rarely phrase a name row identically to a typed Name field (missing/extra brand prefix,
 * a "Model: X" label with just "X" as the value), so label-based detection is the primary,
 * high-confidence signal; normalized value-containment is only a fallback for a generically
 * labeled row whose value still clearly names the product.
 */

const MD_ROW_RE = /^\s*\|(.+)\|\s*$/;

function rowCells(line: string): string[] | null {
  const m = line.match(MD_ROW_RE);
  if (!m) return null;
  return m[1].split('|').map(c => c.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every(c => /^:?-{2,}:?$/.test(c));
}

/**
 * 1-indexed line numbers that look like canonical table rows (start with "|") but fail
 * MD_ROW_RE's well-formed shape — typically a missing closing "|". Such a line is skipped by
 * parseCanonicalRows, understating `expected` with no signal (real case:
 * "| **Laser Head Power** | 20W" in the Ortur H20 source sheet).
 */
export function findMalformedTableLines(markdown: string): number[] {
  return markdown.split('\n')
    .map((line, i) => ({ line, num: i + 1 }))
    .filter(({ line }) => /^\s*\|/.test(line) && !MD_ROW_RE.test(line))
    .map(({ num }) => num);
}

/**
 * Locates a canonical Markdown table by its header+separator pair (e.g. "| Item |
 * Specification |" followed by "| :--- | :--- |") — this anchors the table start regardless of
 * what precedes it (a heading, prose, blank lines), and regardless of what language the header
 * cells are written in. Returns the data rows only (header/separator excluded). Returns an empty
 * array when no such pair is found — callers treat that as "cannot verify," not "zero rows."
 *
 * LIMITATION: assumes cell values contain no literal "|" character — true for the technical-spec
 * domain this pipeline targets (dimensions, units, model numbers).
 */
function parseCanonicalRows(markdown: string): Array<{ item: string; spec: string }> {
  const lines = markdown.split('\n');
  let start = -1;
  for (let i = 0; i < lines.length - 1; i++) {
    const header = rowCells(lines[i]);
    const sep = rowCells(lines[i + 1]);
    if (header && header.length >= 2 && sep && isSeparatorRow(sep)) { start = i + 2; break; }
  }
  if (start === -1) return [];

  const rows: Array<{ item: string; spec: string }> = [];
  for (let i = start; i < lines.length; i++) {
    const cells = rowCells(lines[i]);
    if (!cells) break; // table ends at the first non-table line
    if (cells.length < 2) continue;
    rows.push({ item: cells[0] ?? '', spec: cells[1] ?? '' });
  }
  return rows;
}

const EMPTY_VALUE_RE = /^\s*(n\/a|-|—|none|немає|н\/д)?\s*$/i;

function isEmptyValue(spec: string): boolean {
  return EMPTY_VALUE_RE.test(spec);
}

/** Row labels that, on their own, unambiguously mean "this row IS the product's identity" —
 *  matched only after stripping markdown emphasis/trailing colon and normalizing whitespace, so
 *  a legitimately different spec like "Compatible Nozzle Model" or "Camera Model" does NOT
 *  false-match just because it contains the word "model". */
const PRODUCT_NAME_LABELS = new Set([
  'product name', 'model name', 'model', 'model identifier', 'model number', 'title',
  'назва', 'назва товару', 'назва продукту', 'модель',
]);

function normalizeLabel(item: string): string {
  return item.toLowerCase().replace(/[*_`]/g, '').replace(/:\s*$/, '').trim();
}

function normalizeForNameMatch(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function isProductNameRow(item: string, spec: string, productName: string): boolean {
  if (PRODUCT_NAME_LABELS.has(normalizeLabel(item))) return true;
  if (!productName?.trim() || !spec?.trim()) return false;
  const normSpec = normalizeForNameMatch(spec);
  const normName = normalizeForNameMatch(productName);
  const shorter = normSpec.length < normName.length ? normSpec : normName;
  if (shorter.length < 4) return false; // avoid over-matching on trivially short strings
  return normSpec === normName || normSpec.includes(normName) || normName.includes(normSpec);
}

/**
 * The canonical source's §7-eligible parameter LABELS, after the same two exclusions
 * countExpectedSpecRows applies (empty/"N/A" values, and the product-name row — which becomes
 * the H1 and must never appear as a spec row per master-system-prompt.ts §7 COMPLETENESS).
 *
 * Exported because specs-grounding.ts needs the same list for its repair guidance. Deriving both
 * the count and the list from one function means they cannot disagree — a bug the fix that
 * introduced this function replaced had them derived independently, and the parser leaked the
 * Product Name row into the model's "allowed parameters", instructing it to add a row §7
 * forbids.
 *
 * @returns [] when no canonical table is detected (callers treat that as "cannot verify").
 */
export function expectedSpecParameterLabels(canonicalSpecs: string, productName: string): string[] {
  return parseCanonicalRows(canonicalSpecs)
    .filter(({ item, spec }) => !isEmptyValue(spec) && !isProductNameRow(item, spec, productName))
    .map(({ item }) => item.replace(/[*_`]/g, '').trim());
}

/**
 * @param canonicalSpecs  `input.specs` as submitted — expected to already be a canonical
 *                        "| Item | Specification |" table (see module doc).
 * @param productName     `input.name` — used to detect and exclude a Product Name source row.
 * @returns the expected §7 row count, or 0 if no canonical table was detected (caller no-ops).
 */
export function countExpectedSpecRows(canonicalSpecs: string, productName: string): number {
  return expectedSpecParameterLabels(canonicalSpecs, productName).length;
}

/** Sums <tbody><tr> rows across every table inside <section class="specs"> — mirrors the
 *  scoping used by specs-grounding.ts's validateSpecsGrounding. */
export function countActualSpecRows(html: string): number {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(html, 'text/html');
  } catch {
    return -1; // DOMParser unavailable — sentinel, caller no-ops
  }
  const specTables = Array.from(doc.querySelectorAll('section.specs table'));
  return specTables.reduce((sum, t) => sum + t.querySelectorAll('tbody tr').length, 0);
}

/**
 * Validate that the §7 spec-table row count matches the canonical source's expected count.
 * Severity depends on direction and magnitude:
 * - Extra rows (actual > expected) always stay 'warning' — already independently caught, per
 *   row, by validateSpecsGrounding.
 * - A shortfall of 1 row stays 'warning' — imperfect product-name matching and N/A-value
 *   detection (see module doc) are both real false-positive surfaces for an off-by-one, and the
 *   repair feedback here states only the counts, never WHICH row is missing, so escalating a
 *   false positive would force the model to invent a row just to satisfy the number.
 * - A shortfall of 2+ rows escalates to 'error' (triggers the repair gate) — a gap that large is
 *   far more likely real data loss than a detection miss.
 *
 * @param html            the master HTML from Task A
 * @param canonicalSpecs  `input.specs` as submitted (NOT groundingSpecs — see module doc)
 * @param productName     `input.name`
 * @param context         reporting label, e.g. "HTML (uk-UA)"
 */
export function validateSpecCountParity(
  html: string,
  canonicalSpecs: string,
  productName: string,
  context: string,
): ValidationIssue[] {
  if (!html?.trim() || !canonicalSpecs?.trim()) return [];

  const issues: ValidationIssue[] = [];

  // Independent of the count check below — a malformed row is a source-data-quality problem
  // regardless of whether the counts happen to match by coincidence.
  const malformed = findMalformedTableLines(canonicalSpecs);
  if (malformed.length > 0) {
    issues.push({
      severity: 'warning',
      rule: 'spec-table-malformed-row',
      detail: `Source spec table has malformed row(s) at line(s) ${malformed.join(', ')} — likely a ` +
        `missing closing "|". These rows are silently excluded from row counting, so the ` +
        `expected count above may be understated.`,
      context,
    });
  }

  const expected = countExpectedSpecRows(canonicalSpecs, productName);
  if (expected === 0) return issues; // no canonical table detected — cannot verify count parity

  const actual = countActualSpecRows(html);
  if (actual < 0) return issues; // DOMParser unavailable

  if (actual === expected) return issues;

  const detail = `§7 spec-table row count is ${actual}, expected ${expected} (canonical input rows, ` +
    `excluding empty/"N/A" values and the product-name row).`;

  if (actual > expected) {
    issues.push({ severity: 'warning', rule: 'spec-count-mismatch', detail, context });
    return issues;
  }

  const shortfall = expected - actual;
  const severity: ValidationSeverity = shortfall >= 2 ? 'error' : 'warning';
  issues.push({
    severity,
    rule: 'spec-count-mismatch',
    detail: severity === 'error'
      ? `${detail} Restore only parameters that are literally present in the provided source ` +
        `specifications. Never invent a parameter, value, or unit to satisfy the count.`
      : detail,
    context,
  });
  return issues;
}

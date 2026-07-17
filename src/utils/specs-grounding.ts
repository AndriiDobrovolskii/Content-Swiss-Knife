/**
 * specs-grounding.ts
 *
 * Deterministic anti-hallucination guard for the technical-specifications table.
 *
 * WHY THIS EXISTS
 * Task A (master generation) can invent a spec row that has no basis in the
 * source `input.specs` (observed: a phantom "Throughput | 0330 kg/hr" row that then
 * propagated through Task C into every locale). CLAUDE.md requires "spec count on
 * output = spec count on input"; this module enforces it.
 *
 * DESIGN
 * - Grounds on the ROW LABEL, not the value: a hallucinated value can coincidentally
 *   match a real source number (0330 → 330 = build dimension), but an invented label
 *   ("Throughput") is absent from the source entirely.
 * - Scoped to <section class="specs"> tables only — the "why it matters" key-specs
 *   table contains derived numbers and must NOT be grounded. Within scope, each spec is
 *   a <tbody> <tr> with plain <td> cells (label = first <td>); the <thead> header row and
 *   the top key-specs table are both excluded.
 * - Runs at the pipeline's ground-truth master stage only (labels + source in the master's
 *   language — currently uk-UA; was English before the uk-UA master pivot). Never on Task C
 *   translations, which by definition can't be grounded against the original-language source.
 * - Pure function, no DOM mutation, no LLM. Mirrors output-validator.ts style.
 *
 * NOT frozen. output-validator.ts stays untouched (we import only its type).
 */

import type { ValidationIssue } from './output-validator';

/** Words too generic to serve as grounding evidence for a label. */
const LABEL_STOPWORDS = new Set([
  'the', 'and', 'for', 'per', 'with', 'without', 'type', 'size', 'mode',
  'max', 'maximum', 'min', 'minimum', 'value', 'rate', 'total', 'general',
  'overview', 'recommended', 'optional', 'supported', 'compatible',
]);

/** Minimum significant-word length considered evidence. */
const MIN_LABEL_WORD_LEN = 4;

/**
 * Normalize free text to a lowercase token stream for lexical containment checks.
 * Decimal comma → dot so "61,5" and "61.5" compare equal; punctuation → spaces.
 */
function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/(\d),(\d)/g, '$1.$2')   // decimal comma → dot (keeps 61,5 == 61.5)
    .replace(/[^\p{L}\p{N}\s.]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Significant words from a spec label (lowercased, stopwords + short words removed). */
function significantWords(label: string): string[] {
  return normalizeText(label)
    .split(' ')
    .map(w => w.replace(/\.$/, ''))   // strip trailing abbreviation dot (Temp. → temp)
    .filter(w => w.length >= MIN_LABEL_WORD_LEN && !LABEL_STOPWORDS.has(w));
}

/**
 * Validate that every <section class="specs"> spec row is grounded in the source specs.
 *
 * @param html        base English HTML from Task A
 * @param sourceSpecs the raw source specs string (input.specs)
 * @param context     reporting label, e.g. "HTML (base)"
 * @returns one 'spec-row-not-grounded' error per ungrounded row (empty if all grounded
 *          or if no <section class="specs"> table exists)
 */
export function validateSpecsGrounding(
  html: string,
  sourceSpecs: string,
  context: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!html?.trim() || !sourceSpecs?.trim()) return issues;

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(html, 'text/html');
  } catch {
    return issues; // DOMParser unavailable — skip (same guard style as output-validator)
  }

  const specTables = Array.from(doc.querySelectorAll('section.specs table'));
  if (specTables.length === 0) return issues; // nothing in scope → no-op

  const sourceNorm = normalizeText(sourceSpecs);

  for (const table of specTables) {
    // Iterate <tbody> rows only — the <thead> "Parameter | Value" header row is not a spec.
    for (const row of Array.from(table.querySelectorAll('tbody tr'))) {
      // Label = first data cell. The schema uses plain <td> cells only — no <th scope="row">
      // and no PropertyValue microdata (forbidden per Schema v3.0 §7).
      const labelCell = row.querySelector('td');
      if (!labelCell) continue;

      const label = (labelCell.textContent ?? '').trim();
      if (!label) continue;

      const words = significantWords(label);
      if (words.length === 0) continue; // label had only generic words — cannot ground, skip

      const grounded = words.some(w => {
        // Unicode-aware boundary (not \b): JS \b is defined over ASCII \w only, even with
        // /u, so a Cyrillic word like "робоча" never satisfies \bробоча\b — it silently
        // never matches, turning every non-Latin label into a false "hallucination". The
        // \p{L}/\p{N} lookaround below still prevents 'film' from matching inside
        // 'filament', but works correctly for Cyrillic (and any other) scripts too.
        const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'u').test(sourceNorm);
      });
      if (!grounded) {
        issues.push({
          severity: 'error',
          rule: 'spec-row-not-grounded',
          detail:
            `Spec row "${label}" has no support in the source specs — likely a hallucinated ` +
            `row. Remove any spec-table row whose parameter is not present in the provided ` +
            `source specifications. Do not invent values or units.`,
          context,
        });
      }
    }
  }

  return issues;
}

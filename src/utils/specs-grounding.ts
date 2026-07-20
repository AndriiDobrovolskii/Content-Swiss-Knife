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
 * - A row is grounded by EITHER of two independent signals (OR'd):
 *   1. Stemmed label match — the row's label (first <td>) shares a stemmed significant word
 *      with `sourceSpecs`. Stemming (not exact match) absorbs grammatical-case drift between
 *      two independent translations of the same term (see caller: `sourceSpecs` is expected to
 *      already be in the master's language, typically via a one-off translation upstream).
 *   2. Numeric anchor — the row's value (second <td>) has numbers, and ALL of them appear as
 *      exact tokens (not a substring — "0330" ≠ "330") in `sourceSpecs`. Digits survive
 *      translation 1:1, so this is a deterministic anchor even when a label's wording drifts
 *      to a synonym the stemmed match doesn't catch (e.g. "Build Volume" → "Об'єм друку" vs.
 *      "Робоча зона" across two independent LLM translation passes).
 *   An invented row (observed: a phantom "Throughput | 0330 kg/hr" row that then propagated
 *   through Task C into every locale) has neither: an invented label matches no source word,
 *   and requiring ALL numbers in a row (not just one) keeps a fabricated value from
 *   coincidentally grounding off an unrelated real source number. CLAUDE.md requires "spec
 *   count on output = spec count on input"; this module enforces it.
 * - Scoped to <section class="specs"> tables only — the "why it matters" key-specs
 *   table contains derived numbers and must NOT be grounded. Within scope, each spec is
 *   a <tbody> <tr> with plain <td> cells (label = first <td>, value = second); the <thead>
 *   header row and the top key-specs table are both excluded.
 * - Runs at the pipeline's ground-truth master stage only, against `sourceSpecs` in the
 *   master's language (currently uk-UA) — callers are responsible for localizing
 *   `input.specs` (typically pasted in the manufacturer's original language) before calling
 *   this, since grounding raw non-uk-UA text here would false-positive on every translated
 *   label. Never on Task C translations, which by definition can't be grounded against the
 *   original-language source.
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
 * Cheap, symmetric stem for alphabetic words: truncates a likely inflectional ending.
 * Two independent translations of the same source term often land on the same root but a
 * different grammatical case (Ukrainian "сопло" vs. an inflected "...сопла..." elsewhere in a
 * sentence) — applying the same truncation to both sides of the comparison lets those match
 * without needing real morphological analysis. Digit-only tokens pass through untouched.
 */
function stem(word: string): string {
  if (/^\d/.test(word)) return word;
  if (word.length >= 7) return word.slice(0, -2);
  if (word.length >= 5) return word.slice(0, -1);
  return word;
}

/**
 * Number tokens with enough digits to serve as grounding evidence (≥2 digits, decimal point
 * doesn't count toward that total) — excludes trivial single-digit coincidences (e.g. a lone "5"
 * from "5-inch").
 */
function extractNumberTokens(text: string): string[] {
  const matches = normalizeText(text).match(/\d+(?:\.\d+)?/g) ?? [];
  return matches.filter(n => n.replace('.', '').length >= 2);
}

/**
 * Validate that every <section class="specs"> spec row is grounded in the source specs.
 *
 * @param html        the master HTML from Task A
 * @param sourceSpecs the source specs, already localized into the master's language by the
 *                    caller (NOT necessarily raw `input.specs` verbatim — see DESIGN above)
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
  // Symmetric stemming: source words are stemmed the same way as label words, so exact matches
  // (the common case) are unaffected while inflected/near-synonym forms gain a chance to match.
  const sourceStems = new Set(
    sourceNorm.split(' ')
      .map(w => w.replace(/\.$/, ''))
      .filter(w => w.length >= MIN_LABEL_WORD_LEN)
      .map(stem),
  );
  const sourceNumbers = new Set(extractNumberTokens(sourceSpecs));

  for (const table of specTables) {
    // Iterate <tbody> rows only — the <thead> "Parameter | Value" header row is not a spec.
    for (const row of Array.from(table.querySelectorAll('tbody tr'))) {
      // Label = first data cell, value = second. The schema uses plain <td> cells only — no
      // <th scope="row"> and no PropertyValue microdata (forbidden per Schema v3.0 §7).
      const cells = Array.from(row.querySelectorAll('td'));
      const labelCell = cells[0];
      if (!labelCell) continue;

      const label = (labelCell.textContent ?? '').trim();
      if (!label) continue;

      const words = significantWords(label);
      if (words.length === 0) continue; // label had only generic words — cannot ground, skip

      // Numeric anchor: translation preserves digits 1:1, so a row's numbers stay a reliable
      // signal even when its label's wording drifts between two independent translation passes.
      // Requires ALL of the row's numbers to match (not a substring — "0330" ≠ "330") so a
      // fabricated value can't coincidentally ground off an unrelated real source number.
      const valueNumbers = cells[1] ? extractNumberTokens(cells[1].textContent ?? '') : [];
      const numericGrounded = valueNumbers.length > 0 && valueNumbers.every(n => sourceNumbers.has(n));

      const labelGrounded = words.some(w => sourceStems.has(stem(w)));

      const grounded = numericGrounded || labelGrounded;
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

/**
 * True when `text` already appears to be in a Cyrillic-script language (e.g. an admin pasted
 * already-localized uk-UA specs). Used upstream to skip a redundant translation call before
 * grounding — ratio-based rather than "any Cyrillic char" so an English sheet with a stray
 * Cyrillic brand name or two doesn't trigger a false skip.
 */
export function isAlreadyCyrillic(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return false;
  const cyrillic = text.match(/\p{Script=Cyrillic}/gu) ?? [];
  return cyrillic.length / letters.length > 0.3;
}

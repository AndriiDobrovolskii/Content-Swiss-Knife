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
 * - A row is grounded by ANY of three independent signals (OR'd):
 *   1. Stemmed label match — the row's label (first <td>) shares a stemmed significant word
 *      with `sourceSpecs`. Stemming (not exact match) absorbs grammatical-case drift between
 *      two independent translations of the same term (see caller: `sourceSpecs` is expected to
 *      already be in the master's language, typically via a one-off translation upstream).
 *   2. Numeric anchor — the row's value (second <td>) has numbers, and ALL of them appear as
 *      exact tokens (not a substring — "0330" ≠ "330") in `sourceSpecs`. Digits survive
 *      translation 1:1, so this is a deterministic anchor even when a label's wording drifts
 *      to a synonym the stemmed match doesn't catch (e.g. "Build Volume" → "Об'єм друку" vs.
 *      "Робоча зона" across two independent LLM translation passes).
 *   3. Latin-token anchor — the row's value has a Latin-script technical loanword (material or
 *      interface code — "PEI", "eMMC", "USB") that also appears in `sourceSpecs`. These stay
 *      untranslated across independent translation passes (unlike prose words), so they anchor
 *      rows the other two signals miss: no qualifying number (an "Included Build Plate Type"
 *      row) or only a trivial single-digit one ("8 GB" storage, below the numeric anchor's
 *      ≥2-digit floor).
 *   An invented row (observed: a phantom "Throughput | 0330 kg/hr" row that then propagated
 *   through Task C into every locale) has none of the three: an invented label matches no
 *   source word, requiring ALL numbers in a row (not just one) keeps a fabricated value from
 *   coincidentally grounding off an unrelated real source number, and a fabricated value
 *   typically doesn't happen to reuse a real source loanword. CLAUDE.md requires "spec count on
 *   output = spec count on input"; this module enforces it.
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
import { stripCodeFences } from './html-cleaner';

/** Words too generic to serve as grounding evidence for a label. */
const LABEL_STOPWORDS = new Set([
  'the', 'and', 'for', 'per', 'with', 'without', 'type', 'size', 'mode',
  'max', 'maximum', 'min', 'minimum', 'value', 'rate', 'total', 'general',
  'overview', 'recommended', 'optional', 'supported', 'compatible',
]);

/** Minimum significant-word length considered evidence. */
const MIN_LABEL_WORD_LEN = 4;

/** Below this absolute count, a cluster of failures is plausibly real hallucination, so the
 *  breaker stays out of the way even on a small table where the ratio alone would trip. */
const MASS_FAILURE_MIN_ROWS = 3;

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
 * Latin-script technical tokens (material/interface codes — PEI, USB, eMMC, ABS, IEEE) that
 * Ukrainian technical writing keeps verbatim instead of translating (see
 * task-translate.ts's Ukrainian config: "material trade names ... stay verbatim in Latin").
 * ≥3 chars so a bare unit remnant (a stray "C" or "W") doesn't create noise. No word-boundary
 * anchoring needed — the character class itself stops at the first non-Latin-alnum character,
 * so e.g. "USB" extracts cleanly out of "USB-порт".
 */
function extractLatinTokens(text: string): string[] {
  return (text.match(/[a-z][a-z0-9]{2,}/gi) ?? []).map(t => t.toLowerCase());
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
  const sourceLatinTokens = new Set(extractLatinTokens(sourceSpecs));

  // Denominator = rows actually GRADED, not rows scanned. Rows that exit early (empty label, or
  // a label of only generic/short words) can never fail, so counting them inflates the
  // denominator and suppresses the breaker — MIN_LABEL_WORD_LEN filters short Ukrainian labels
  // ("Тип", "ПЗ") in practice, not just in theory.
  let evaluatedRows = 0;
  const failedLabels: string[] = [];

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
      const valueText = cells[1]?.textContent ?? '';
      const valueNumbers = cells[1] ? extractNumberTokens(valueText) : [];
      const numericGrounded = valueNumbers.length > 0 && valueNumbers.every(n => sourceNumbers.has(n));

      // Loanword anchor: a material/interface code (PEI, eMMC, USB) surviving translation
      // untouched is reliable evidence even when the row has no qualifying number (e.g. an
      // "Included Build Plate Type" row) or only a trivial single-digit one (e.g. "8 GB" storage).
      const valueLatinTokens = cells[1] ? extractLatinTokens(valueText) : [];
      const latinTokenGrounded = valueLatinTokens.some(t => sourceLatinTokens.has(t));

      const labelGrounded = words.some(w => sourceStems.has(stem(w)));

      evaluatedRows++;
      const grounded = numericGrounded || latinTokenGrounded || labelGrounded;
      if (!grounded) {
        failedLabels.push(label);
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

  // A model that fabricates more than half a spec table is not a realistic failure mode; a
  // broken or degraded grounding source is. Prefer shipping an unverified table over deleting a
  // verified one — the gate may only narrow output when it trusts its own input.
  if (issues.length >= MASS_FAILURE_MIN_ROWS && issues.length > evaluatedRows / 2) {
    return [{
      severity: 'warning',
      rule: 'spec-row-not-grounded-mass-failure',
      detail:
        `${issues.length} of ${evaluatedRows} graded spec-table rows failed grounding. Mass ` +
        `failure across half a table is far more likely a broken/degraded grounding source ` +
        `(e.g. a failed specs translation) than mass hallucination, so the per-row grounding ` +
        `guard is disabled for this artifact rather than deleting rows it cannot verify. ` +
        `Rows: ${failedLabels.join(', ')}.`,
      context,
    }];
  }

  return issues;
}

/** Unicode script names this codebase grounds against. Typed, not `string`, so a typo is a
 *  compile error rather than a runtime SyntaxError inside `new RegExp`. */
export type MasterScript = 'Cyrillic' | 'Latin';

const SCRIPT_RATIO_THRESHOLD = 0.3;

/** Ratio of letters in `text` belonging to `script`. 0 when there are no letters at all. */
function scriptRatio(text: string, script: MasterScript): number {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return 0;
  const matches = text.match(new RegExp(`\\p{Script=${script}}`, 'gu')) ?? [];
  return matches.length / letters.length;
}

/**
 * True when `text` already appears to be in a Cyrillic-script language (e.g. an admin pasted
 * already-localized uk-UA specs). Used upstream to skip a redundant translation call before
 * grounding — ratio-based rather than "any Cyrillic char" so an English sheet with a stray
 * Cyrillic brand name or two doesn't trigger a false skip.
 */
export function isAlreadyCyrillic(text: string): boolean {
  return scriptRatio(text, 'Cyrillic') > SCRIPT_RATIO_THRESHOLD;
}

/**
 * Sanitizes a raw LLM translation before it is used as validateSpecsGrounding's grounding source.
 *
 * Never returns text outside the master's script, and never falls back to the untranslated input
 * — both reintroduce the exact false-positive mode this guard exists to prevent (see the Ortur
 * H20 incident: an English grounding source made every translated label an unfalsifiable
 * "hallucination" and the repair gate deleted 8 of 15 real rows).
 *
 * '' means "grounding disabled for this run" — the same contract as validateSpecsGrounding's own
 * empty-source no-op. Callers MUST surface that state (see `specs-grounding-disabled` in
 * content-orchestrator.service.ts) rather than letting it pass silently.
 */
export function sanitizeGroundedTranslation(
  translated: string | null | undefined,
  script: MasterScript,
): string {
  const cleaned = stripCodeFences(translated ?? '').trim();
  if (!cleaned) return '';
  return scriptRatio(cleaned, script) > SCRIPT_RATIO_THRESHOLD ? cleaned : '';
}

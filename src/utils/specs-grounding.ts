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
import type { ProductDescriptionDoc } from '../domain/description-doc';
import { extractBlocks } from './block-repair';
import { stripCodeFences } from './html-cleaner';
import { stripThousandsSeparators } from './number-format-fixer';
import { countActualSpecRows, countActualSpecRowsDoc } from './spec-count-parity';

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
  // Thousands separators collapse FIRST, on the raw string, using the very function already
  // applied to the generated HTML by number-format-fixer.ts. Sharing it — rather than
  // re-deriving it here — is the point: two drifted copies of this logic are what broke the
  // numeric anchor in the first place (a source-side "20,000" and an HTML-side "20000" could
  // never match once the HTML side had its separators stripped and the source side didn't).
  //
  // Order matters twice over:
  //   • before punctuation→space, so "420 × 300" still has its "×" and cannot glue into "420300";
  //   • before decimal-comma→dot, so "20,000" resolves as a thousands group, while "61,5"
  //     (1 digit, not a 3-digit group) falls through to the decimal rule untouched.
  return stripThousandsSeparators(s)
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
 * @param allowedParams the source's §7-eligible parameter labels, from
 *                      spec-count-parity.ts's expectedSpecParameterLabels(). Used only to give
 *                      the repair model something to reconcile against; grounding decisions are
 *                      unaffected. Defaults to [] so existing 3-arg call sites keep working (the
 *                      guidance clause is then omitted rather than fabricated).
 * @returns one 'spec-row-not-grounded' error per ungrounded row (empty if all grounded
 *          or if no <section class="specs"> table exists)
 */
export function validateSpecsGrounding(
  html: string,
  sourceSpecs: string,
  context: string,
  allowedParams: readonly string[] = [],
  options: { labelAnchorTrusted?: boolean } = {},
): ValidationIssue[] {
  // Is a label mismatch real evidence?
  //
  // Only when the model wrote that label from the SAME text this function grounds against. When it
  // wrote from the English sheet and `sourceSpecs` is a separate Ukrainian translation, the two are
  // independent renderings of one term: "Alarm Method" becomes "Спосіб сповіщення" in the table and
  // something else in the source, and stem() truncates endings, so "спосіб" and "метод" — two
  // ordinary renderings of "Method" — share nothing. A real run shipped 15 correct rows with one
  // flagged, and which one changed between runs.
  //
  // Defaults to true so callers that predate the flag keep today's severity.
  const labelAnchorTrusted = options.labelAnchorTrusted ?? true;
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

  // COUNT-PARITY PRECONDITION
  //
  // When the table has exactly as many rows as the source has §7-eligible parameters, a
  // fabricated row is arithmetically impossible: inventing one necessarily makes actual >
  // expected. Under exact parity an unmatched row can therefore only be an artifact of matching
  // against a TRANSLATION of the source, never a hallucination — so the guard stands down.
  //
  // Real incident (XGRIDS L2 Pro 16/120, 2026-07-28): `Роздільна здатність | 1 × 1 Мп` was
  // reported as ungrounded while the source plainly carries a `Resolution` parameter. It missed
  // all three anchors for mechanical reasons — every number in the value is a single digit (below
  // extractNumberTokens' ≥2-digit floor), the unit is Cyrillic so there is no Latin token, and the
  // translated source rendered the label with different wording. Its two neighbours in the same
  // category passed only by luck of value shape (one had a Latin loanword, one had 3-digit
  // numbers). A verdict decided by the shape a value happens to take is not evidence about the
  // source.
  //
  // Same reasoning the mass-failure breaker below already applies: the gate may only narrow
  // output when it trusts its own input.
  //
  // ACCEPTED COST: a 1-for-1 swap (delete a real row, invent a fake one) preserves the count and
  // becomes invisible here. That is a far rarer failure than the translation-wording drift seen
  // twice in consecutive runs, and the phantom row this module was written for
  // ("Throughput | 0330 kg/hr") was an ADDITION, which parity still catches.
  //
  // The count comes from countActualSpecRows rather than being recomputed here, and that is
  // load-bearing: the grading loop below scopes rows with `tbody tr`, and so does
  // countActualSpecRows. A stricter selector here could declare parity while the loop still had
  // rows to fail (or the reverse). Because allowedParams.length === countExpectedSpecRows() is an
  // already-tested invariant, this predicate is exactly "validateSpecCountParity has nothing to
  // say about this table" — one rule expressed in two places, not two rules.
  if (allowedParams.length > 0) {
    const actualRows = countActualSpecRows(html);
    if (actualRows >= 0 && actualRows === allowedParams.length) return issues;
  }

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

  // Addressing for block-scoped repair. A label that drifted between two independent translations
  // of the same English parameter ("Child Lock" -> "Дитячий замок" in the grounding source,
  // "Блокування від дітей" in the table) is a real and recurring case. The claim is correct — the
  // wordings do differ — but the remedy this rule's own text asks for is "correct only its label",
  // and that used to cost a full regeneration: the instrument that once deleted 8 of 15 live rows.
  //
  // Scoped to section.specs so a §2 Killer-Specs cell holding the same text cannot be addressed by
  // mistake, and each cell is claimed at most once so two rows sharing a label stay distinct.
  const specLabelCells = extractBlocks(html).filter(
    b => b.tag === 'td' && b.ancestors.some(a => a.tag === 'section' && a.classes.includes('specs')),
  );
  const claimedCells = new Set<number>();
  const addressLabelCell = (label: string): string | undefined => {
    const wanted = label.replace(/\s+/g, ' ');
    const cell = specLabelCells.find(b => !claimedCells.has(b.index) && b.text === wanted);
    if (!cell) return undefined;
    claimedCells.add(cell.index);
    return `block[${cell.index}]`;
  };

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
        // Numbers and Latin codes survive translation unchanged, so a value that carried either
        // and still did not match is evidence about the CONTENT, not about wording. That stays an
        // error whatever the label anchor is worth.
        const valueCarriedEvidence = valueNumbers.length > 0 || valueLatinTokens.length > 0;
        failedLabels.push(label);
        issues.push({
          severity: labelAnchorTrusted || valueCarriedEvidence ? 'error' : 'warning',
          rule: 'spec-row-not-grounded',
          detail:
            `Spec row "${label}" is not supported by the source specifications. Reconcile before ` +
            `removing: if it corresponds to one of the allowed parameters under different ` +
            `wording, KEEP the row and correct only its label to match. Remove the row only if ` +
            `it corresponds to no allowed parameter. Never invent values or units.` +
            // Repeated HERE, not only in the companion spec-rows-allowed-parameters issue: the
            // block-repair prompt hands over each issue's `detail` verbatim, so without the list
            // in this one the model is told to correct a label with nothing to correct it to.
            (allowedParams.length > 0
              ? ` ALLOWED PARAMETERS (pick exactly one, and write its name in the language of the `
                + `table — do not copy the English wording): ${allowedParams.join(', ')}.`
              : ''),
          context,
          path: addressLabelCell(label),
        });
      }
    }
  }

  // Emitted once per artifact, only when at least one row failed — gives the repair model the
  // reconciliation target the per-row messages refer to, without repeating the whole list N times.
  if (issues.length > 0 && allowedParams.length > 0) {
    issues.push({
      // Follows the rows it accompanies: a companion message shouting "error" over a set of
      // warnings would put the artifact back into the repair loop this downgrade exists to keep
      // it out of.
      severity: issues.some(i => i.severity === 'error') ? 'error' : 'warning',
      rule: 'spec-rows-allowed-parameters',
      detail:
        `ALLOWED PARAMETERS (the complete set of §7-eligible parameters in the source ` +
        `specifications): ${allowedParams.join(', ')}. Every §7 row must correspond to exactly ` +
        `one of these. Do not add a parameter that is not on this list, and do not add a row for ` +
        `the product's own name.`,
      context,
    });
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

/**
 * Doc-reading sibling of validateSpecsGrounding — reads doc.specs.categories[].rows[] directly
 * instead of parsing <section class="specs"> tables out of rendered HTML. Same three grounding
 * signals (stemmed label / numeric anchor / Latin-token anchor), same count-parity precondition,
 * same mass-failure circuit breaker; only the traversal and the addressing differ:
 * `specs.categories[N].rows[M]` (0-indexed) instead of the HTML version's `block[N]`.
 *
 * SpecRow.value is `string | string[]` (a multi-valued parameter, e.g. EXPERT3D's nested-<ul>
 * cells). Multiple values are joined with a space before numeric/Latin-token extraction — the
 * same "read the cell as one blob of text" treatment `cells[1]?.textContent` gives a rendered
 * `<ul>` inside a `<td>` in the HTML version.
 *
 * @param doc           the ProductDescriptionDoc under validation
 * @param sourceSpecs   see validateSpecsGrounding
 * @param context       reporting label, e.g. "Doc (base)"
 * @param allowedParams see validateSpecsGrounding
 * @param options       see validateSpecsGrounding
 */
export function validateSpecsGroundingDoc(
  doc: ProductDescriptionDoc,
  sourceSpecs: string,
  context: string,
  allowedParams: readonly string[] = [],
  options: { labelAnchorTrusted?: boolean } = {},
): ValidationIssue[] {
  const labelAnchorTrusted = options.labelAnchorTrusted ?? true;
  const issues: ValidationIssue[] = [];
  if (!sourceSpecs?.trim()) return issues;
  if (doc.specs.categories.length === 0) return issues; // nothing in scope → no-op

  // COUNT-PARITY PRECONDITION — see validateSpecsGrounding's own comment for the full rationale.
  // countActualSpecRowsDoc has no -1 "DOMParser unavailable" sentinel to guard against, unlike its
  // HTML-reading counterpart.
  if (allowedParams.length > 0) {
    const actualRows = countActualSpecRowsDoc(doc);
    if (actualRows === allowedParams.length) return issues;
  }

  const sourceNorm = normalizeText(sourceSpecs);
  const sourceStems = new Set(
    sourceNorm.split(' ')
      .map(w => w.replace(/\.$/, ''))
      .filter(w => w.length >= MIN_LABEL_WORD_LEN)
      .map(stem),
  );
  const sourceNumbers = new Set(extractNumberTokens(sourceSpecs));
  const sourceLatinTokens = new Set(extractLatinTokens(sourceSpecs));

  let evaluatedRows = 0;
  const failedRows: Array<{ path: string; label: string }> = [];

  for (let catIndex = 0; catIndex < doc.specs.categories.length; catIndex++) {
    const category = doc.specs.categories[catIndex];
    for (let rowIndex = 0; rowIndex < category.rows.length; rowIndex++) {
      const row = category.rows[rowIndex];
      const path = `specs.categories[${catIndex}].rows[${rowIndex}]`;

      const label = (row.label ?? '').trim();
      if (!label) continue;

      const words = significantWords(label);
      if (words.length === 0) continue; // label had only generic words — cannot ground, skip

      const valueText = Array.isArray(row.value) ? row.value.join(' ') : (row.value ?? '');
      const valueNumbers = extractNumberTokens(valueText);
      const numericGrounded = valueNumbers.length > 0 && valueNumbers.every(n => sourceNumbers.has(n));

      const valueLatinTokens = extractLatinTokens(valueText);
      const latinTokenGrounded = valueLatinTokens.some(t => sourceLatinTokens.has(t));

      const labelGrounded = words.some(w => sourceStems.has(stem(w)));

      evaluatedRows++;
      const grounded = numericGrounded || latinTokenGrounded || labelGrounded;
      if (!grounded) {
        const valueCarriedEvidence = valueNumbers.length > 0 || valueLatinTokens.length > 0;
        failedRows.push({ path, label });
        issues.push({
          severity: labelAnchorTrusted || valueCarriedEvidence ? 'error' : 'warning',
          rule: 'spec-row-not-grounded',
          detail:
            `Spec row at ${path} (label "${label}") is not supported by the source ` +
            `specifications. Reconcile before removing: if it corresponds to one of the allowed ` +
            `parameters under different wording, KEEP the row and correct only its label to ` +
            `match. Remove the row only if it corresponds to no allowed parameter. Never invent ` +
            `values or units.` +
            (allowedParams.length > 0
              ? ` ALLOWED PARAMETERS (pick exactly one, and write its name in the language of the `
                + `table — do not copy the English wording): ${allowedParams.join(', ')}.`
              : ''),
          context,
          path,
        });
      }
    }
  }

  // Emitted once per artifact, only when at least one row failed — see validateSpecsGrounding.
  if (issues.length > 0 && allowedParams.length > 0) {
    issues.push({
      severity: issues.some(i => i.severity === 'error') ? 'error' : 'warning',
      rule: 'spec-rows-allowed-parameters',
      detail:
        `ALLOWED PARAMETERS (the complete set of §7-eligible parameters in the source ` +
        `specifications): ${allowedParams.join(', ')}. Every specs.categories[].rows[] entry must ` +
        `correspond to exactly one of these. Do not add a parameter that is not on this list, and ` +
        `do not add a row for the product's own name.`,
      context,
    });
  }

  // A model that fabricates more than half a spec table is not a realistic failure mode; a
  // broken or degraded grounding source is — see validateSpecsGrounding's own comment.
  if (issues.length >= MASS_FAILURE_MIN_ROWS && issues.length > evaluatedRows / 2) {
    return [{
      severity: 'warning',
      rule: 'spec-row-not-grounded-mass-failure',
      detail:
        `${issues.length} of ${evaluatedRows} graded spec-table rows failed grounding. Mass ` +
        `failure across half a table is far more likely a broken/degraded grounding source ` +
        `(e.g. a failed specs translation) than mass hallucination, so the per-row grounding ` +
        `guard is disabled for this artifact rather than deleting rows it cannot verify. ` +
        `Rows: ${failedRows.map(r => `${r.path} ("${r.label}")`).join(', ')}.`,
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
 * Why grounding was switched off for a run.
 *
 * Three different causes collapse to the same observable state — an empty grounding source — and
 * the code used to keep no evidence of which one fired. A run then reported "specs grounding was
 * DISABLED" with nothing to act on, and the message named the script cause even when the call had
 * thrown, which is simply untrue.
 */
export type GroundingFailure =
  | { kind: 'provider-error' }
  | { kind: 'empty' }
  | { kind: 'wrong-script'; ratio: number; threshold: number; sample: string };

export interface GroundingInspection {
  /** Usable grounding source, or '' when there is none. */
  text: string;
  failure?: GroundingFailure;
}

/** How much of a rejected translation to quote. Enough to recognise it, not enough to flood a report. */
const SAMPLE_LENGTH = 120;

/**
 * sanitizeGroundedTranslation, with the reason attached.
 *
 * The sample matters as much as the ratio: it is what distinguishes "the model echoed the English
 * sheet back" (a prompt problem) from "something else came back" (a provider problem). Without it
 * the ratio alone says only that the text was not Ukrainian, which was never in doubt.
 */
export function inspectGroundedTranslation(
  translated: string | null | undefined,
  script: MasterScript,
): GroundingInspection {
  const cleaned = stripCodeFences(translated ?? '').trim();
  if (!cleaned) return { text: '', failure: { kind: 'empty' } };

  const ratio = scriptRatio(cleaned, script);
  if (ratio > SCRIPT_RATIO_THRESHOLD) return { text: cleaned };

  return {
    text: '',
    failure: {
      kind: 'wrong-script',
      ratio: Number(ratio.toFixed(2)),
      threshold: SCRIPT_RATIO_THRESHOLD,
      sample: cleaned.length > SAMPLE_LENGTH ? `${cleaned.slice(0, SAMPLE_LENGTH)}…` : cleaned,
    },
  };
}

/** Human-readable cause, for the `specs-grounding-disabled` warning. */
export function describeGroundingFailure(failure: GroundingFailure): string {
  switch (failure.kind) {
    case 'provider-error':
      return 'the specs-translation call failed (provider error) — see the server log for the stack trace';
    case 'empty':
      return 'the specs-translation call returned empty text';
    case 'wrong-script':
      return `the translation came back in the wrong script (${failure.ratio} of letters vs a `
        + `${failure.threshold} threshold). It returned: "${failure.sample}"`;
  }
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
  return inspectGroundedTranslation(translated, script).text;
}

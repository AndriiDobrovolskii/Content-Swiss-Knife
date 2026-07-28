/**
 * sentence-length.ts
 *
 * Flags sentences that exceed the per-locale hard ceiling in SENTENCE_LENGTH_RULES.
 *
 * Nothing enforced that ceiling before this: it existed only as prompt text, and real generations
 * repeatedly broke it — a 68-word run-in span, then a 27-word sentence against the uk-UA ceiling
 * of 20. (The Center 3D Print ToV document says 25; the stricter global figure is authoritative,
 * see the note on SENTENCE_LENGTH_BANDS.)
 *
 * WARNING SEVERITY. Sentence segmentation is heuristic in any language and especially so in one
 * with abbreviation-heavy technical prose, so a false split must not be able to fail correct text.
 *
 * NOT store-gated: SENTENCE_LENGTH_RULES is explicitly a language-level rule — "applies to EVERY
 * task, EVERY store, EVERY generated and translated language version". Locale-gated only, by the
 * band lookup.
 *
 * Pure function, no LLM.
 */

import type { ValidationIssue } from './output-validator';
import { SENTENCE_LENGTH_BANDS } from '../prompt-core/constants';
import { LATIN_TO_CYRILLIC_UNITS } from './unit-tables';
import { extractBlocks, type HtmlBlockAncestor } from './block-repair';

/**
 * The old `el.closest('table, figcaption, section.specs')`, expressed against the ancestor chain
 * extractBlocks reports. A <p> is never itself one of these, so testing ancestors only is
 * equivalent to closest(), which also matches the element itself.
 */
function isExcludedScope(a: HtmlBlockAncestor): boolean {
  return a.tag === 'table' || a.tag === 'figcaption'
    || (a.tag === 'section' && a.classes.includes('specs'));
}

/**
 * A terminator ends a sentence only when whitespace and then an opening quote or an uppercase
 * letter follow. That single condition disposes of the three hazards without any word list:
 *   "шт. і …"      next char is lowercase          -> no split
 *   "1,75" / "0.05"  next char is a digit, no space  -> no split
 *   "… та ін. і"   lowercase                        -> no split
 * Only "abbreviation followed by a capitalised word" survives, which ABBREVIATIONS handles.
 */
const SENTENCE_BREAK = /([.!?…])["»)\]]?\s+(?=[«"'([]?\p{Lu})/gu;

/**
 * Residual guard: a terminator directly after one of these is an abbreviation dot, not a full
 * stop, even when the next word is capitalised. Lowercased comparison, longest-first.
 */
const ABBREVIATIONS = [
  'т. д', 'т. п', 'т. е', 'т. ч', 'та ін', 'и др', 'напр', 'рис', 'табл', 'див',
  'шт', 'мм', 'см', 'кг', 'год', 'хв', 'мин', 'грн', 'ін', 'ст', 'вул', 'обл',
];

/** Units that merge into the preceding number when counting words — see countWords. */
const UNIT_WORDS = new Set<string>([
  ...Object.keys(LATIN_TO_CYRILLIC_UNITS),
  ...Object.values(LATIN_TO_CYRILLIC_UNITS).flatMap(m => [m.uk, m.ru].filter((u): u is string => !!u)),
  '°C', '°F', 'K', 'dpi', 'px', 'fps', 'ppm', '%', '×', 'x',
]);

function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  for (const match of text.matchAll(SENTENCE_BREAK)) {
    const end = (match.index ?? 0) + match[0].length;
    const candidate = text.slice(start, (match.index ?? 0) + 1);
    const head = candidate.slice(0, -1).trimEnd().toLowerCase();
    const isAbbrev =
      ABBREVIATIONS.some(a => head.endsWith(a)) || /(?:^|\s)\p{Lu}$/u.test(candidate.slice(0, -1));
    if (isAbbrev) continue;
    out.push(text.slice(start, (match.index ?? 0) + 1).trim());
    start = end;
  }
  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out.filter(Boolean);
}

/**
 * Words per sentence.
 *
 * SENTENCE_LENGTH_RULES is a READING-EFFORT budget and never defines "word", so this reads a spec
 * string as the single chunk a reader actually parses:
 *   - a token counts only if it contains a letter or a digit ("—", "·", "(" do not);
 *   - a unit token immediately after a number merges into it: "20 Вт" = 1;
 *   - a dimension chain merges: "330 × 330 × 565 мм" = 1;
 *   - a hyphenated compound is 1.
 * All four make the counter MORE PERMISSIVE than a naive split — the correct bias for a warning.
 * The reported 27-word sentence still fires comfortably.
 */
export function countWords(sentence: string): number {
  const tokens = sentence.split(/\s+/).filter(t => /[\p{L}\p{N}]/u.test(t));
  let count = 0;
  let previousWasNumeric = false;
  for (const raw of tokens) {
    const token = raw.replace(/^[«"'([]+|[»"')\],.;:!?]+$/g, '');
    const isNumeric = /^\d[\d.,]*$/.test(token);
    const isUnit = UNIT_WORDS.has(token);
    const isSeparator = token === '×' || token === 'x';
    if (previousWasNumeric && (isUnit || isSeparator || isNumeric)) {
      previousWasNumeric = isNumeric || isSeparator;
      continue; // merged into the number that opened the chain
    }
    count++;
    previousWasNumeric = isNumeric;
  }
  return count;
}

/**
 * @param html    generated HTML for one locale
 * @param locale  BCP47; an unmapped locale returns no issues rather than guessing a ceiling
 * @param context reporting label, e.g. "HTML (base)"
 */
export function validateSentenceLength(
  html: string,
  locale: string,
  context: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!html?.trim()) return issues;

  const band = SENTENCE_LENGTH_BANDS[locale.toLowerCase()];
  if (!band) return issues;

  const seen = new Set<string>();
  // Body prose only. Spec-table cells are not sentences; figcaptions are governed by the figure
  // rules and no rule asks to shorten them; headings are not prose either.
  for (const block of extractBlocks(html)) {
    if (block.tag !== 'p' && block.tag !== 'li') continue;
    if (block.ancestors.some(isExcludedScope)) continue;

    for (const sentence of splitSentences(block.text)) {
      const words = countWords(sentence);
      if (words <= band.ceiling) continue;
      const key = sentence.slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push({
        severity: 'warning',
        rule: 'sentence-too-long',
        detail:
          `Sentence of ${words} words exceeds the ${locale} hard ceiling of ${band.ceiling} ` +
          `([SENTENCE LENGTH]). Split it into two shorter sentences: "${sentence}"`,
        context,
        // Addressed the way the block patcher resolves it. Numbering MUST come from extractBlocks:
        // a validator counting only <p> and a patcher counting <h2> too would disagree about which
        // block is number 1, and the repair would rewrite the wrong paragraph while reporting
        // success — a silent corruption, not a visible failure.
        path: `block[${block.index}]`,
        // Structured operands, never re-parsed out of `detail`.
        measured: { actual: words, limit: band.ceiling, unit: 'words' },
      });
    }
  }

  return issues;
}

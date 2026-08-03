/**
 * structural-parity.ts
 *
 * Deterministic structural isomorphism check between the uk-UA master and one translation.
 *
 * This is the enforcement mechanism behind the master→translation architecture: a translation that
 * is not structurally identical to its master is a FAILED translation, not a stylistic variant.
 * Errors are fed back through runRepairGate() like any other validation error.
 *
 * Scope is deliberately narrow — element counts and media identity. Prose length is NOT checked
 * (target languages legitimately expand/contract vs Ukrainian).
 *
 * NOT frozen. output-validator.ts stays untouched (we import only its type). Mirrors
 * specs-grounding.ts's shape: pure function, no DOM mutation, no LLM.
 */

import type { ValidationIssue } from './output-validator';

/** Count non-overlapping matches of a tag. */
function count(html: string, re: RegExp): number {
  return (html.match(re) ?? []).length;
}

/** Ordered list of every src="" on the given tag. */
function srcList(html: string, tag: 'img' | 'iframe'): string[] {
  const re = new RegExp(`<${tag}\\b[^>]*\\bsrc="([^"]*)"`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

const COUNTED_TAGS: Array<{ label: string; re: RegExp }> = [
  { label: '<section>',    re: /<section\b/gi },
  { label: '<h2>',         re: /<h2\b/gi },
  { label: '<h3>',         re: /<h3\b/gi },
  { label: '<hr>',         re: /<hr\b/gi },
  { label: '<figure>',     re: /<figure\b/gi },
  { label: '<figcaption>', re: /<figcaption\b/gi },
  { label: '<table>',      re: /<table\b/gi },
  { label: '<tr>',         re: /<tr\b/gi },
  { label: '<td>',         re: /<td\b/gi },
  { label: '<li>',         re: /<li\b/gi },
];

export function validateStructuralParity(
  master: string,
  translated: string,
  context: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const { label, re } of COUNTED_TAGS) {
    const expected = count(master, re);
    const actual = count(translated, re);
    if (expected !== actual) {
      issues.push({
        severity: 'error',
        rule: 'structural-parity-count',
        detail: `${label} count is ${actual} but the uk-UA master has ${expected}. The translation must preserve the master's structure exactly — do not add, drop, merge or split elements.`,
        context,
      });
    }
  }

  for (const tag of ['img', 'iframe'] as const) {
    const expected = srcList(master, tag);
    const actual = srcList(translated, tag);
    const same = expected.length === actual.length && expected.every((s, i) => s === actual[i]);
    if (!same) {
      issues.push({
        severity: 'error',
        rule: 'structural-parity-media',
        detail: `<${tag}> src list diverges from the uk-UA master. Expected (in order): [${expected.join(', ')}]. Got: [${actual.join(', ')}]. Every src must be carried over byte-identical and in the same order.`,
        context,
      });
    }
  }

  return issues;
}

/**
 * Deterministically restores every media `src` in a translation to its master value.
 *
 * WHY THIS IS NOT A PROMPT FIX. A real artifact shipped broken: in the 2026-08-01 EXPERT3D run the
 * es-ES translation came back with the image folder rewritten from `L2-Pro-32-300` to
 * `L2-Pro-32–300` — an EN DASH (U+2013), because Spanish typography uses one for numeric ranges and
 * the model applied it inside a URL. All seven images 404'd.
 *
 * validateStructuralParity() caught it and named both lists exactly. The repair gate then spent its
 * entire budget and the model never fixed it, because this is a systematic transform rather than a
 * random slip — re-prompting in Spanish reproduces it. `task-c.ts` already says every attribute
 * stays byte-identical including `src`, and the model overrode that instruction anyway.
 *
 * The master's src list is known, so the right value never has to be asked for. This is the tier-0
 * rung: no LLM, no tokens, and it cannot fail the way re-prompting just did.
 *
 * SCOPE IS EXACTLY `src`, AND NOTHING ELSE. `alt`, `figcaption`, `title` and all prose are
 * legitimately translated and must survive untouched — this is a translation, not a copy.
 *
 * REFUSES TO GUESS WHEN THE COUNTS DIFFER. Positional restoration is only meaningful when the two
 * lists line up; with an image dropped or added there is no defensible mapping, and mapping anyway
 * would silently attach the wrong picture to a caption. That case is `structural-parity-count`'s to
 * report, and it is left to fire. Each tag is decided independently, so a broken `<img>` list does
 * not block an `<iframe>` restore.
 *
 * Pure string rewriting, no DOM — same contract as the rest of this module.
 */
export function restoreMediaSrcs(
  translated: string,
  master: string,
): { html: string; restored: number } {
  let html = translated;
  let restored = 0;

  for (const tag of ['img', 'iframe'] as const) {
    const expected = srcList(master, tag);
    const actual = srcList(html, tag);
    // Counts must match, or positional mapping is meaningless — see the note above.
    if (expected.length !== actual.length) continue;
    if (expected.every((s, i) => s === actual[i])) continue;

    let i = 0;
    html = html.replace(
      // String.raw, so `\b` stays a word boundary. In a plain template literal it is the BACKSPACE
      // escape (U+0008) and the pattern silently matches nothing.
      new RegExp(String.raw`(<${tag}\b[^>]*\bsrc=")([^"]*)(")`, 'gi'),
      (whole, open, current, close) => {
        const want = expected[i++];
        if (want === undefined || want === current) return whole;
        restored++;
        return `${open}${want}${close}`;
      },
    );
  }

  return { html, restored };
}

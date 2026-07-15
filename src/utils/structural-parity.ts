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

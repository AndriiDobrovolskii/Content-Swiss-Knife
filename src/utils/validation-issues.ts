/**
 * validation-issues.ts
 *
 * Helpers for accumulating ValidationIssue lists across pipeline stages.
 *
 * The orchestrator collects issues at several points in a run — the master repair gate, the
 * per-language gates, slug generation, and a final post-hoc sweep. Those stages must ACCUMULATE,
 * not replace: a warning is only ever displayed, so dropping it deletes the entire value of a
 * warning-severity check. The final sweep re-validates artifacts the earlier stages already
 * looked at, so merging alone would double-report; hence the dedupe.
 *
 * Pure functions, no LLM.
 */

import type { ValidationIssue } from './output-validator';

/**
 * Identity of an issue for dedupe purposes. `detail` is included because several rules emit one
 * issue per offending element with the offender quoted inside `detail` (h2-nominal-heading,
 * sentence-too-long, alt-numeric-not-grounded) — keying on rule+context alone would collapse
 * genuinely distinct findings into one.
 */
function issueKey(i: ValidationIssue): string {
  return `${i.severity}::${i.rule}::${i.context ?? ''}::${i.detail ?? ''}`;
}

/** First occurrence wins, order preserved — earlier stages are closer to where the issue arose. */
export function dedupeIssues(issues: readonly ValidationIssue[]): ValidationIssue[] {
  const seen = new Set<string>();
  const out: ValidationIssue[] = [];
  for (const issue of issues) {
    const key = issueKey(issue);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(issue);
  }
  return out;
}

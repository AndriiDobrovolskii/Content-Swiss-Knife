import { PromptPayload } from '../prompt-core/payload';
import { ValidationIssue } from './output-validator';

export interface RepairGateOptions<T> {
  label: string;
  maxRepairs: number;
  basePayload: PromptPayload;
  produce: (payload: PromptPayload) => Promise<T>;
  validate: (artifact: T) => ValidationIssue[];
  withFeedback: (payload: PromptPayload, errors: ValidationIssue[]) => PromptPayload;
  onAttempt?: (attempt: number, errorCount: number) => void;
}

export interface RepairAttemptRecord {
  attempt: number;
  /** The error-severity issues that triggered this attempt (fed to withFeedback). */
  issuesBefore: ValidationIssue[];
  /** Full validate() result after the regeneration. */
  issuesAfter: ValidationIssue[];
  /** issuesBefore entries that do NOT reappear in issuesAfter — the repair actually fixed these. */
  resolved: ValidationIssue[];
  /** issuesBefore entries that still appear in issuesAfter — the repair did not fix these. */
  persisted: ValidationIssue[];
  /**
   * issuesAfter entries that were NOT in issuesBefore — errors this repair INTRODUCED.
   *
   * A repair with introduced.length > 0 is a net regression even when resolved.length > 0, and is
   * the usual reason a strictly-better comparison ties and discards an otherwise good attempt.
   * Without this field `resolved` and `persisted` are both subsets of issuesBefore, so whether a
   * repair made the artifact WORSE is unmeasurable.
   */
  introduced: ValidationIssue[];
}

export interface RepairGateResult<T> {
  artifact: T;
  finalIssues: ValidationIssue[];
  repairsUsed: number;
  attempts: RepairAttemptRecord[];
  /**
   * Which attempt produced the shipped artifact. 0 = the initial generation (no repair applied).
   *
   * Because ties keep the earliest attempt, this is NOT always equal to repairsUsed — a repair can
   * be spent, recorded in attempts[], and then discarded. Without this field the report cannot
   * distinguish "repair worked" from "repair worked and was thrown away".
   */
  shippedAttempt: number;
}

export async function runRepairGate<T>(opts: RepairGateOptions<T>): Promise<RepairGateResult<T>> {
  let artifact = await opts.produce(opts.basePayload);
  let issues = opts.validate(artifact);
  let repairsUsed = 0;
  const attempts: RepairAttemptRecord[] = [];

  const errCount = (is: ValidationIssue[]) => is.filter(i => i.severity === 'error').length;
  const issueKey = (i: ValidationIssue) => `${i.rule}::${i.context}`;
  // `attempt` tracks which generation `best` currently holds, so the report can state what actually
  // shipped rather than inferring it from repairsUsed.
  let best = { artifact, issues, errors: errCount(issues), attempt: 0 };

  while (repairsUsed < opts.maxRepairs) {
    if (best.errors === 0) break;
    const issuesBefore = issues.filter(i => i.severity === 'error');
    opts.onAttempt?.(repairsUsed + 1, errCount(issues));
    artifact = await opts.produce(opts.withFeedback(opts.basePayload, issuesBefore));
    issues = opts.validate(artifact);
    repairsUsed++;

    const afterKeys = new Set(issues.map(issueKey));
    const beforeKeys = new Set(issuesBefore.map(issueKey));
    attempts.push({
      attempt: repairsUsed,
      issuesBefore,
      issuesAfter: issues,
      resolved: issuesBefore.filter(i => !afterKeys.has(issueKey(i))),
      persisted: issuesBefore.filter(i => afterKeys.has(issueKey(i))),
      // Errors only: a warning appearing after a repair is not a regression worth spending a
      // repair attempt on, and counting it would inflate the run-level regression metric.
      introduced: issues.filter(i => i.severity === 'error' && !beforeKeys.has(issueKey(i))),
    });

    const e = errCount(issues);
    // Strictly-better wins; ties keep earliest. Deliberately conservative — do not relax this
    // without a separate argument, but DO record which attempt won so the report can say so.
    if (e < best.errors) best = { artifact, issues, errors: e, attempt: repairsUsed };
  }

  return {
    artifact: best.artifact,
    finalIssues: best.issues,
    repairsUsed,
    attempts,
    shippedAttempt: best.attempt,
  };
}

export function appendRepairFeedback(
  payload: PromptPayload,
  errors: ValidationIssue[],
): PromptPayload {
  const feedbackLines = errors
    .map(i => `- [${i.severity.toUpperCase()}] ${i.rule}: ${i.detail}${i.context ? ` (${i.context})` : ''}`)
    .join('\n');

  const block = [
    '',
    '[VALIDATION FEEDBACK — REVISION REQUIRED]',
    'Your previous output failed these mandatory acceptance checks.',
    'Return a corrected, complete output that resolves every item. No commentary, no code fences.',
    feedbackLines,
  ].join('\n');

  return {
    ...payload,
    userContent: `${payload.userContent}\n${block}`,
  };
}

export interface RepairArtifactReport {
  label: string;
  repairsUsed: number;
  attempts: RepairAttemptRecord[];
  finalIssues: ValidationIssue[];
  /** 'clean' = no repair needed. 'repaired' = repair fixed all errors. 'unresolved' = errors remain after maxRepairs. */
  status: 'clean' | 'repaired' | 'unresolved';
  /** Which attempt shipped. Required, not optional — see RepairGateResult.shippedAttempt. Making it
   *  optional would let a caller silently drop the signal, which is the bug this field exists to fix. */
  shippedAttempt: number;
}

export function toArtifactReport(label: string, result: RepairGateResult<unknown>): RepairArtifactReport {
  const finalErrors = result.finalIssues.filter(i => i.severity === 'error').length;
  const status: RepairArtifactReport['status'] =
    result.repairsUsed === 0 ? 'clean' : finalErrors === 0 ? 'repaired' : 'unresolved';
  return {
    label,
    repairsUsed: result.repairsUsed,
    attempts: result.attempts,
    finalIssues: result.finalIssues,
    status,
    shippedAttempt: result.shippedAttempt,
  };
}

export interface RepairReportMeta {
  product: string;
  store: string;
  generatedAt: string; // ISO timestamp
}

/**
 * Renders repair-gate reports as Markdown, optimized for prompt-engineering review:
 * the recurring-failures table comes first so a persistent rule failure (the kind worth
 * fixing in a system block instead of paying for repeated repair-gate retries) is visible
 * without reading the full per-artifact log.
 */
export function formatRepairReportMarkdown(reports: RepairArtifactReport[], meta: RepairReportMeta): string {
  const lines: string[] = [];
  const repaired = reports.filter(r => r.status !== 'clean');
  // Computed once and appended in BOTH branches below. Previously this lived inside the
  // repaired.length === 0 early return, so any run that needed a repair silently dropped every
  // warning — exactly the situation a mass-deletion incident produces (Bug E).
  const warnings = reports.flatMap(r =>
    r.finalIssues.filter(i => i.severity === 'warning').map(i => ({ ...i, label: r.label })));

  lines.push(`# Repair Gate Report — ${meta.product} (${meta.store})`);
  lines.push('');
  lines.push(`Generated: ${meta.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Artifacts checked: ${reports.length}`);
  lines.push(`- Artifacts that needed a repair: ${repaired.length}`);
  lines.push(`- Artifacts still failing after maxRepairs: ${reports.filter(r => r.status === 'unresolved').length}`);
  lines.push(`- Total repair attempts spent: ${reports.reduce((sum, r) => sum + r.repairsUsed, 0)}`);
  // Repairs that were paid for and then thrown away by the tie-break. A non-zero value here next to
  // a non-zero regression count means repair instructions are broad enough to damage neighbouring
  // fields — a prompt problem. A non-zero value with zero regressions means the tie-break itself is
  // discarding equal-scoring improvements.
  lines.push(`- Repairs spent but discarded: ${reports.reduce((sum, r) => sum + Math.max(0, r.repairsUsed - r.shippedAttempt), 0)}`);
  lines.push(`- Total repair regressions introduced: ${reports.reduce((sum, r) => sum + r.attempts.reduce((n, a) => n + a.introduced.length, 0), 0)}`);
  lines.push('');

  if (repaired.length === 0) {
    if (warnings.length === 0) {
      lines.push('No repairs were needed — every artifact passed validation on the first generation.');
      return lines.join('\n');
    }
    lines.push('No repairs were needed — every artifact passed validation on the first generation.');
    lines.push('');
    lines.push('## Warnings (no repairs needed)');
    lines.push('');
    for (const issue of warnings) {
      lines.push(`- [${issue.label}] \`${issue.rule}\` — ${issue.detail}`);
    }
    return lines.join('\n');
  }

  // ── Recurring rule failures — the prompt-engineering signal ──
  //
  // The "Fixed by repair?" column is computed against what SHIPPED (finalIssues), not against
  // per-attempt bookkeeping. The old version read `agg.persisted > 0 ? no : yes`, which reported
  // ✅ yes for a rule whose fix was recorded in attempts[] and then discarded by the
  // strictly-better tie-break — crediting a repair that never shipped.
  interface RuleAgg {
    rule: string;
    /** How often this rule BLOCKED acceptance (resolved + persisted). Introduced is counted
     *  separately so ranking keeps meaning "how often did this rule stand in the way". */
    occurrences: number;
    introduced: number;
    contexts: Set<string>;
    resolved: number;
    persisted: number;
    sampleDetail: string;
  }
  const byRule = new Map<string, RuleAgg>();
  const agg = (issue: ValidationIssue): RuleAgg => {
    const existing = byRule.get(issue.rule)
      ?? { rule: issue.rule, occurrences: 0, introduced: 0, contexts: new Set<string>(), resolved: 0, persisted: 0, sampleDetail: issue.detail };
    existing.contexts.add(issue.context);
    byRule.set(issue.rule, existing);
    return existing;
  };

  // Rules whose fix was resolved on THIS artifact, keyed per report label. The pairing below must
  // stay per-artifact: a run covers several artifacts (SEO meta for uk-UA/en-GB/pl-PL), and a global
  // "somebody resolved it somewhere" would label a rule 'fixed then discarded' when one locale was
  // fixed-then-discarded while another was never fixed at all — merging a gate problem with a prompt
  // problem and hiding the harder one.
  const resolvedByLabel = new Map<string, Set<string>>();
  const shippedByLabel = new Map<string, Set<string>>();

  for (const report of reports) {
    const resolvedHere = new Set<string>();
    for (const attempt of report.attempts) {
      for (const issue of attempt.resolved) {
        const a = agg(issue); a.occurrences++; a.resolved++;
        resolvedHere.add(issue.rule);
      }
      for (const issue of attempt.persisted) {
        const a = agg(issue); a.occurrences++; a.persisted++; a.sampleDetail = issue.detail;
      }
      // Included in the row set so a regression that ships is rankable at all. Without this a rule
      // that only ever appeared as `introduced` has no row, and Defect B survives in the table.
      for (const issue of attempt.introduced) {
        const a = agg(issue); a.introduced++; a.sampleDetail = issue.detail;
      }
    }
    resolvedByLabel.set(report.label, resolvedHere);
    shippedByLabel.set(
      report.label,
      new Set(report.finalIssues.filter(i => i.severity === 'error').map(i => i.rule)),
    );
  }
  const ranked = [...byRule.values()].sort((a, b) => b.occurrences - a.occurrences);

  /** Number of artifacts that shipped this rule as an unresolved error. */
  const shippedCount = (rule: string) =>
    [...shippedByLabel.values()].filter(s => s.has(rule)).length;

  /** True when SOME single artifact both resolved the rule and still shipped it broken. */
  const fixedThenDiscarded = (rule: string) =>
    reports.some(r => shippedByLabel.get(r.label)?.has(rule) && resolvedByLabel.get(r.label)?.has(rule));

  lines.push('## Recurring rule failures (fix candidates for prompts/system blocks)');
  lines.push('');
  lines.push('| Rule | Occurrences | Introduced | Contexts | Fixed by repair? |');
  lines.push('|---|---|---|---|---|');
  for (const a of ranked) {
    const shipped = shippedCount(a.rule);
    // Precedence when both patterns occur across artifacts: 'fixed then discarded' wins. It is the
    // rarer and more actionable signal, and Contexts still lists every affected artifact.
    const fixedCol = shipped === 0
      ? '✅ yes'
      : fixedThenDiscarded(a.rule)
        ? '⚠️ fixed then discarded'
        : `❌ no (${shipped} still failing)`;
    lines.push(`| \`${a.rule}\` | ${a.occurrences} | ${a.introduced} | ${[...a.contexts].join(', ')} | ${fixedCol} |`);
  }
  lines.push('');
  lines.push('Rules marked "❌ no" cost repair-gate attempts AND still shipped broken — highest priority.');
  lines.push('Rules marked "⚠️ fixed then discarded" point at the GATE, not the prompt: the repair worked,');
  lines.push('but the whole-artifact strictly-better comparison threw it away — usually because the same');
  lines.push('attempt introduced a regression elsewhere (see the Introduced column). Fixing the prompt');
  lines.push('will not help these; narrowing what a repair is allowed to rewrite will.');
  lines.push('Rules with "yes" but occurrences > 1 are the best ROI for prompt fixes: the model reliably');
  lines.push('gets it wrong on attempt 1 but reliably fixes it when told — meaning a clearer instruction');
  lines.push('up front should get it right the first time, at zero extra API cost.');
  lines.push('');

  // ── Per-artifact detail ──
  lines.push('## Per-artifact detail');
  lines.push('');
  for (const report of repaired) {
    lines.push(`### ${report.label} — ${report.status} (${report.repairsUsed} attempt${report.repairsUsed === 1 ? '' : 's'})`);
    lines.push('');
    // 0 = the initial generation. When this is less than repairsUsed, every attempt above it was
    // paid for and discarded.
    lines.push(`- Shipped attempt: ${report.shippedAttempt} of ${report.repairsUsed}`);
    lines.push('');
    for (const attempt of report.attempts) {
      lines.push(`**Attempt ${attempt.attempt}**`);
      for (const issue of attempt.resolved) {
        lines.push(`- ✅ fixed: \`${issue.rule}\` — ${issue.detail}`);
      }
      for (const issue of attempt.persisted) {
        lines.push(`- ❌ still failing: \`${issue.rule}\` — ${issue.detail}`);
      }
      // Rendered inside this attempt's block, not as a flat list at the end of the artifact, so the
      // causal story reads at a glance: "attempt 1 fixed the title but broke the description".
      for (const issue of attempt.introduced) {
        lines.push(`- ⚠️ introduced: \`${issue.rule}\` — ${issue.detail}`);
      }
      lines.push('');
    }
    if (report.status === 'unresolved') {
      lines.push(`**Shipped with unresolved errors:**`);
      for (const issue of report.finalIssues.filter(i => i.severity === 'error')) {
        lines.push(`- \`${issue.rule}\` — ${issue.detail}`);
      }
      lines.push('');
    }
  }

  if (warnings.length > 0) {
    lines.push('## Warnings');
    lines.push('');
    for (const issue of warnings) {
      lines.push(`- [${issue.label}] \`${issue.rule}\` — ${issue.detail}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

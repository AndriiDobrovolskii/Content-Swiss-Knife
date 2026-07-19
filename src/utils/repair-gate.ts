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
}

export interface RepairGateResult<T> {
  artifact: T;
  finalIssues: ValidationIssue[];
  repairsUsed: number;
  attempts: RepairAttemptRecord[];
}

export async function runRepairGate<T>(opts: RepairGateOptions<T>): Promise<RepairGateResult<T>> {
  let artifact = await opts.produce(opts.basePayload);
  let issues = opts.validate(artifact);
  let repairsUsed = 0;
  const attempts: RepairAttemptRecord[] = [];

  const errCount = (is: ValidationIssue[]) => is.filter(i => i.severity === 'error').length;
  const issueKey = (i: ValidationIssue) => `${i.rule}::${i.context}`;
  let best = { artifact, issues, errors: errCount(issues) };

  while (repairsUsed < opts.maxRepairs) {
    if (best.errors === 0) break;
    const issuesBefore = issues.filter(i => i.severity === 'error');
    opts.onAttempt?.(repairsUsed + 1, errCount(issues));
    artifact = await opts.produce(opts.withFeedback(opts.basePayload, issuesBefore));
    issues = opts.validate(artifact);
    repairsUsed++;

    const afterKeys = new Set(issues.map(issueKey));
    attempts.push({
      attempt: repairsUsed,
      issuesBefore,
      issuesAfter: issues,
      resolved: issuesBefore.filter(i => !afterKeys.has(issueKey(i))),
      persisted: issuesBefore.filter(i => afterKeys.has(issueKey(i))),
    });

    const e = errCount(issues);
    if (e < best.errors) best = { artifact, issues, errors: e }; // strictly-better wins; ties keep earliest
  }

  return { artifact: best.artifact, finalIssues: best.issues, repairsUsed, attempts };
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
}

export function toArtifactReport(label: string, result: RepairGateResult<unknown>): RepairArtifactReport {
  const finalErrors = result.finalIssues.filter(i => i.severity === 'error').length;
  const status: RepairArtifactReport['status'] =
    result.repairsUsed === 0 ? 'clean' : finalErrors === 0 ? 'repaired' : 'unresolved';
  return { label, repairsUsed: result.repairsUsed, attempts: result.attempts, finalIssues: result.finalIssues, status };
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
  lines.push('');

  if (repaired.length === 0) {
    lines.push('No repairs were needed — every artifact passed validation on the first generation.');
    return lines.join('\n');
  }

  // ── Recurring rule failures — the prompt-engineering signal ──
  interface RuleAgg { rule: string; occurrences: number; contexts: Set<string>; resolved: number; persisted: number; sampleDetail: string; }
  const byRule = new Map<string, RuleAgg>();
  for (const report of reports) {
    for (const attempt of report.attempts) {
      for (const issue of attempt.resolved) {
        const agg = byRule.get(issue.rule) ?? { rule: issue.rule, occurrences: 0, contexts: new Set(), resolved: 0, persisted: 0, sampleDetail: issue.detail };
        agg.occurrences++; agg.resolved++; agg.contexts.add(issue.context);
        byRule.set(issue.rule, agg);
      }
      for (const issue of attempt.persisted) {
        const agg = byRule.get(issue.rule) ?? { rule: issue.rule, occurrences: 0, contexts: new Set(), resolved: 0, persisted: 0, sampleDetail: issue.detail };
        agg.occurrences++; agg.persisted++; agg.contexts.add(issue.context); agg.sampleDetail = issue.detail;
        byRule.set(issue.rule, agg);
      }
    }
  }
  const ranked = [...byRule.values()].sort((a, b) => b.occurrences - a.occurrences);

  lines.push('## Recurring rule failures (fix candidates for prompts/system blocks)');
  lines.push('');
  lines.push('| Rule | Occurrences | Contexts | Fixed by repair? |');
  lines.push('|---|---|---|---|');
  for (const agg of ranked) {
    const fixedCol = agg.persisted > 0 ? `⚠️ no (${agg.persisted} still failing)` : '✅ yes';
    lines.push(`| \`${agg.rule}\` | ${agg.occurrences} | ${[...agg.contexts].join(', ')} | ${fixedCol} |`);
  }
  lines.push('');
  lines.push('Rules with "no" above cost repair-gate attempts AND still shipped broken — highest priority.');
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
    for (const attempt of report.attempts) {
      lines.push(`**Attempt ${attempt.attempt}**`);
      for (const issue of attempt.resolved) {
        lines.push(`- ✅ fixed: \`${issue.rule}\` — ${issue.detail}`);
      }
      for (const issue of attempt.persisted) {
        lines.push(`- ❌ still failing: \`${issue.rule}\` — ${issue.detail}`);
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

  return lines.join('\n');
}

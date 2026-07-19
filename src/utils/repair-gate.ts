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

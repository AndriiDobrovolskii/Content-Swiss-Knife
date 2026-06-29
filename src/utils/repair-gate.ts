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

export interface RepairGateResult<T> {
  artifact: T;
  finalIssues: ValidationIssue[];
  repairsUsed: number;
}

export async function runRepairGate<T>(opts: RepairGateOptions<T>): Promise<RepairGateResult<T>> {
  let artifact = await opts.produce(opts.basePayload);
  let issues = opts.validate(artifact);
  let repairsUsed = 0;

  const errCount = (is: ValidationIssue[]) => is.filter(i => i.severity === 'error').length;
  let best = { artifact, issues, errors: errCount(issues) };

  while (repairsUsed < opts.maxRepairs) {
    if (best.errors === 0) break;
    opts.onAttempt?.(repairsUsed + 1, errCount(issues));
    artifact = await opts.produce(opts.withFeedback(opts.basePayload, issues.filter(i => i.severity === 'error')));
    issues = opts.validate(artifact);
    repairsUsed++;
    const e = errCount(issues);
    if (e < best.errors) best = { artifact, issues, errors: e }; // strictly-better wins; ties keep earliest
  }

  return { artifact: best.artifact, finalIssues: best.issues, repairsUsed };
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
    systemBlocks: payload.systemBlocks,
    userContent: `${payload.userContent}\n${block}`,
  };
}

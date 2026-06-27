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

  while (repairsUsed < opts.maxRepairs) {
    const errors = issues.filter(i => i.severity === 'error');
    if (errors.length === 0) break;

    opts.onAttempt?.(repairsUsed + 1, errors.length);
    const repairPayload = opts.withFeedback(opts.basePayload, errors);
    artifact = await opts.produce(repairPayload);
    issues = opts.validate(artifact);
    repairsUsed++;
  }

  return { artifact, finalIssues: issues, repairsUsed };
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

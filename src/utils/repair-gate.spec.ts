import { describe, it, expect, vi } from 'vitest';
import { runRepairGate, appendRepairFeedback, formatRepairReportMarkdown, RepairArtifactReport } from './repair-gate';
import { PromptPayload } from '../prompt-core/payload';
import { ValidationIssue } from './output-validator';

const BASE_PAYLOAD: PromptPayload = {
  systemBlocks: [{ text: 'sys', cache: true }],
  userContent: 'user',
};

const makeIssue = (rule: string, severity: 'error' | 'warning' = 'error'): ValidationIssue => ({
  severity,
  rule,
  detail: `detail for ${rule}`,
  context: `ctx-${rule}`,
});

describe('appendRepairFeedback', () => {
  it('appends the validation feedback block to userContent', () => {
    const errors: ValidationIssue[] = [makeIssue('meta-title-length')];
    const result = appendRepairFeedback(BASE_PAYLOAD, errors);
    expect(result.userContent).toContain('[VALIDATION FEEDBACK — REVISION REQUIRED]');
    expect(result.userContent).toContain('[ERROR] meta-title-length');
    expect(result.userContent).toContain('detail for meta-title-length');
    expect(result.userContent).toContain('(ctx-meta-title-length)');
  });

  it('preserves the original userContent as a prefix', () => {
    const errors: ValidationIssue[] = [makeIssue('seo-empty')];
    const result = appendRepairFeedback(BASE_PAYLOAD, errors);
    expect(result.userContent.startsWith('user')).toBe(true);
  });

  it('does not mutate the original payload', () => {
    appendRepairFeedback(BASE_PAYLOAD, [makeIssue('seo-empty')]);
    expect(BASE_PAYLOAD.userContent).toBe('user');
  });

  it('preserves the systemBlocks reference unchanged (cache stability)', () => {
    const result = appendRepairFeedback(BASE_PAYLOAD, [makeIssue('seo-empty')]);
    expect(result.systemBlocks).toBe(BASE_PAYLOAD.systemBlocks);
  });

  it('formats warning issues with [WARNING] prefix', () => {
    const errors: ValidationIssue[] = [makeIssue('meta-description-cta', 'warning')];
    const result = appendRepairFeedback(BASE_PAYLOAD, errors);
    expect(result.userContent).toContain('[WARNING] meta-description-cta');
  });

  it('includes all supplied errors when multiple are present', () => {
    const errors: ValidationIssue[] = [makeIssue('rule-a'), makeIssue('rule-b')];
    const result = appendRepairFeedback(BASE_PAYLOAD, errors);
    expect(result.userContent).toContain('- [ERROR] rule-a');
    expect(result.userContent).toContain('- [ERROR] rule-b');
  });

  it('omits the context segment when context is an empty string', () => {
    const err: ValidationIssue = { severity: 'error', rule: 'some-rule', detail: 'detail', context: '' };
    const result = appendRepairFeedback(BASE_PAYLOAD, [err]);
    expect(result.userContent).not.toContain('()');
    expect(result.userContent).toContain('[ERROR] some-rule: detail');
  });
});

describe('runRepairGate', () => {
  it('returns artifact with repairsUsed=0 when there are no errors', async () => {
    const artifact = { value: 'ok' };
    const produce = vi.fn().mockResolvedValue(artifact);
    const validate = vi.fn().mockReturnValue([]);

    const result = await runRepairGate({
      label: 'test',
      maxRepairs: 2,
      basePayload: BASE_PAYLOAD,
      produce,
      validate,
      withFeedback: appendRepairFeedback,
    });

    expect(result.artifact).toBe(artifact);
    expect(result.repairsUsed).toBe(0);
    expect(result.finalIssues).toEqual([]);
    expect(produce).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry when validate returns only warnings', async () => {
    const artifact = { value: 'warning-only' };
    const produce = vi.fn().mockResolvedValue(artifact);
    const validate = vi.fn().mockReturnValue([makeIssue('cta-missing', 'warning')]);

    const result = await runRepairGate({
      label: 'test',
      maxRepairs: 2,
      basePayload: BASE_PAYLOAD,
      produce,
      validate,
      withFeedback: appendRepairFeedback,
    });

    expect(produce).toHaveBeenCalledTimes(1);
    expect(result.repairsUsed).toBe(0);
    expect(result.finalIssues).toHaveLength(1);
  });

  it('retries up to maxRepairs when errors persist, returns the earliest attempt when none improve', async () => {
    const artifacts = [{ v: 1 }, { v: 2 }, { v: 3 }];
    const produce = vi.fn()
      .mockResolvedValueOnce(artifacts[0])
      .mockResolvedValueOnce(artifacts[1])
      .mockResolvedValueOnce(artifacts[2]);
    const validate = vi.fn().mockReturnValue([makeIssue('seo-empty')]);

    const result = await runRepairGate({
      label: 'test',
      maxRepairs: 2,
      basePayload: BASE_PAYLOAD,
      produce,
      validate,
      withFeedback: appendRepairFeedback,
    });

    expect(produce).toHaveBeenCalledTimes(3); // initial + 2 repairs
    expect(result.repairsUsed).toBe(2);
    expect(result.artifact).toBe(artifacts[0]);
    expect(result.finalIssues).toHaveLength(1);

    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0].attempt).toBe(1);
    expect(result.attempts[0].issuesBefore).toHaveLength(1);
    expect(result.attempts[0].resolved).toHaveLength(0);
    expect(result.attempts[0].persisted).toHaveLength(1);
    expect(result.attempts[0].persisted[0].rule).toBe('seo-empty');
    expect(result.attempts[1].attempt).toBe(2);
    expect(result.attempts[1].resolved).toHaveLength(0);
    expect(result.attempts[1].persisted).toHaveLength(1);
  });

  it('stops retrying as soon as all errors are resolved', async () => {
    const goodArtifact = { value: 'fixed' };
    const produce = vi.fn()
      .mockResolvedValueOnce({ value: 'bad' })
      .mockResolvedValueOnce(goodArtifact);
    const validate = vi.fn()
      .mockReturnValueOnce([makeIssue('seo-empty')])
      .mockReturnValueOnce([]);

    const result = await runRepairGate({
      label: 'test',
      maxRepairs: 3,
      basePayload: BASE_PAYLOAD,
      produce,
      validate,
      withFeedback: appendRepairFeedback,
    });

    expect(produce).toHaveBeenCalledTimes(2);
    expect(result.repairsUsed).toBe(1);
    expect(result.artifact).toBe(goodArtifact);

    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0].attempt).toBe(1);
    expect(result.attempts[0].issuesBefore).toHaveLength(1);
    expect(result.attempts[0].issuesAfter).toHaveLength(0);
    expect(result.attempts[0].resolved).toHaveLength(1);
    expect(result.attempts[0].resolved[0].rule).toBe('seo-empty');
    expect(result.attempts[0].persisted).toHaveLength(0);
  });

  it('calls onAttempt with the attempt number and error count (not total issue count)', async () => {
    const onAttempt = vi.fn();
    const produce = vi.fn()
      .mockResolvedValueOnce({ value: 'bad' })
      .mockResolvedValueOnce({ value: 'ok' });
    // 2 errors + 1 warning on first validate
    const validate = vi.fn()
      .mockReturnValueOnce([makeIssue('rule-a'), makeIssue('rule-b'), makeIssue('warn-c', 'warning')])
      .mockReturnValueOnce([]);

    await runRepairGate({
      label: 'test',
      maxRepairs: 2,
      basePayload: BASE_PAYLOAD,
      produce,
      validate,
      withFeedback: appendRepairFeedback,
      onAttempt,
    });

    expect(onAttempt).toHaveBeenCalledTimes(1);
    expect(onAttempt).toHaveBeenCalledWith(1, 2); // 2 errors, not 3 total
  });

  it('passes only errors (not warnings) to withFeedback', async () => {
    const withFeedback = vi.fn().mockReturnValue(BASE_PAYLOAD);
    const produce = vi.fn()
      .mockResolvedValueOnce({ value: 'bad' })
      .mockResolvedValueOnce({ value: 'ok' });
    const validate = vi.fn()
      .mockReturnValueOnce([makeIssue('rule-err'), makeIssue('rule-warn', 'warning')])
      .mockReturnValueOnce([]);

    await runRepairGate({
      label: 'test',
      maxRepairs: 2,
      basePayload: BASE_PAYLOAD,
      produce,
      validate,
      withFeedback,
    });

    expect(withFeedback).toHaveBeenCalledTimes(1);
    const passedIssues: ValidationIssue[] = withFeedback.mock.calls[0][1];
    expect(passedIssues).toHaveLength(1);
    expect(passedIssues[0].rule).toBe('rule-err');
  });

  it('always passes basePayload (not accumulated payload) to withFeedback', async () => {
    const withFeedback = vi.fn().mockReturnValue({ ...BASE_PAYLOAD, userContent: 'modified' });
    const produce = vi.fn()
      .mockResolvedValueOnce({ v: 1 })
      .mockResolvedValueOnce({ v: 2 })
      .mockResolvedValueOnce({ v: 3 });
    const validate = vi.fn()
      .mockReturnValueOnce([makeIssue('rule-a')])
      .mockReturnValueOnce([makeIssue('rule-b')])
      .mockReturnValueOnce([]);

    await runRepairGate({
      label: 'test',
      maxRepairs: 3,
      basePayload: BASE_PAYLOAD,
      produce,
      validate,
      withFeedback,
    });

    expect(withFeedback).toHaveBeenCalledTimes(2);
    expect(withFeedback.mock.calls[0][0]).toBe(BASE_PAYLOAD);
    expect(withFeedback.mock.calls[1][0]).toBe(BASE_PAYLOAD);
  });

  it('performs no retries when maxRepairs is 0', async () => {
    const produce = vi.fn().mockResolvedValue({ value: 'bad' });
    const validate = vi.fn().mockReturnValue([makeIssue('seo-empty')]);

    const result = await runRepairGate({
      label: 'test',
      maxRepairs: 0,
      basePayload: BASE_PAYLOAD,
      produce,
      validate,
      withFeedback: appendRepairFeedback,
    });

    expect(produce).toHaveBeenCalledTimes(1);
    expect(result.repairsUsed).toBe(0);
  });

  it('propagates exceptions thrown by produce without catching them', async () => {
    const produce = vi.fn().mockRejectedValue(new Error('LLM error'));

    await expect(
      runRepairGate({
        label: 'test',
        maxRepairs: 2,
        basePayload: BASE_PAYLOAD,
        produce,
        validate: vi.fn(),
        withFeedback: appendRepairFeedback,
      })
    ).rejects.toThrow('LLM error');
  });
});

describe('formatRepairReportMarkdown', () => {
  const META = { product: 'Test Product', store: 'Test Store', generatedAt: '2026-07-19T12:00:00.000Z' };

  it('ranks a rule that recurs across artifacts above a rule that only fails once, and marks fixed-by-repair correctly', () => {
    const recurringIssueA = makeIssue('figcaption-missing');
    const recurringIssueB = makeIssue('figcaption-missing');
    const persistingIssue = makeIssue('spec-count-mismatch');

    const reports: RepairArtifactReport[] = [
      {
        label: 'HTML (base)',
        repairsUsed: 1,
        finalIssues: [],
        status: 'repaired',
        attempts: [
          {
            attempt: 1,
            issuesBefore: [recurringIssueA],
            issuesAfter: [],
            resolved: [recurringIssueA],
            persisted: [],
          },
        ],
      },
      {
        label: 'HTML (es-ES)',
        repairsUsed: 1,
        finalIssues: [persistingIssue],
        status: 'unresolved',
        attempts: [
          {
            attempt: 1,
            issuesBefore: [recurringIssueB, persistingIssue],
            issuesAfter: [persistingIssue],
            resolved: [recurringIssueB],
            persisted: [persistingIssue],
          },
        ],
      },
    ];

    const md = formatRepairReportMarkdown(reports, META);

    const tableStart = md.indexOf('## Recurring rule failures');
    const figcaptionIdx = md.indexOf('`figcaption-missing`', tableStart);
    const specCountIdx = md.indexOf('`spec-count-mismatch`', tableStart);
    expect(tableStart).toBeGreaterThan(-1);
    expect(figcaptionIdx).toBeGreaterThan(-1);
    expect(specCountIdx).toBeGreaterThan(-1);
    expect(figcaptionIdx).toBeLessThan(specCountIdx); // recurring rule (2 occurrences) ranked first

    const figcaptionRow = md.split('\n').find(l => l.includes('`figcaption-missing`'))!;
    const specCountRow = md.split('\n').find(l => l.includes('`spec-count-mismatch`'))!;
    expect(figcaptionRow).toContain('2'); // occurrences
    expect(figcaptionRow).toContain('✅ yes');
    expect(specCountRow).toContain('⚠️ no');

    // Recurring-failures table appears before the per-artifact detail section.
    expect(md.indexOf('## Recurring rule failures')).toBeLessThan(md.indexOf('## Per-artifact detail'));
  });

  it('returns a short "no repairs needed" message when every report is clean', () => {
    const reports: RepairArtifactReport[] = [
      { label: 'HTML (base)', repairsUsed: 0, finalIssues: [], status: 'clean', attempts: [] },
    ];

    const md = formatRepairReportMarkdown(reports, META);

    expect(md).toContain('No repairs were needed');
    expect(md).not.toContain('## Recurring rule failures');
  });
});

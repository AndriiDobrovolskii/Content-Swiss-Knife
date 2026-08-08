import { describe, it, expect, vi } from 'vitest';
import { runRepairGate, appendRepairFeedback, formatRepairReportMarkdown, toArtifactReport, RepairArtifactReport, RepairGateResult } from './repair-gate';
import { validateSlugs } from './slug-validator';
import type { SlugResponse } from '../app/types';
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

  it('reports shippedAttempt=0 when the initial generation is already clean', async () => {
    const result = await runRepairGate({
      label: 'test',
      maxRepairs: 2,
      basePayload: BASE_PAYLOAD,
      produce: vi.fn().mockResolvedValue({ v: 0 }),
      validate: vi.fn().mockReturnValue([]),
      withFeedback: appendRepairFeedback,
    });

    expect(result.shippedAttempt).toBe(0);
    expect(result.repairsUsed).toBe(0);
  });

  it('reports shippedAttempt=1 when attempt 1 strictly improves', async () => {
    const result = await runRepairGate({
      label: 'test',
      maxRepairs: 1,
      basePayload: BASE_PAYLOAD,
      produce: vi.fn().mockResolvedValueOnce({ v: 0 }).mockResolvedValueOnce({ v: 1 }),
      validate: vi.fn()
        .mockReturnValueOnce([makeIssue('rule-a'), makeIssue('rule-b')])
        .mockReturnValueOnce([makeIssue('rule-a')]),
      withFeedback: appendRepairFeedback,
    });

    expect(result.shippedAttempt).toBe(1);
    expect(result.finalIssues).toHaveLength(1);
  });

  it('records a repair that fixed one locale but broke another as introduced, and ships attempt 0', async () => {
    // The exact shape of repair-report_Center 3D Print_Ortur-H20-20-W_1785166974266.md: attempt 1
    // resolved the en-GB error and introduced a pl-PL one, tying on total error count. The
    // strictly-better tie-break therefore kept attempt 0 — and the old report credited the repair.
    const enGb: ValidationIssue = { severity: 'error', rule: 'meta-title-length', detail: 'meta_title is 57 chars (max 55).', context: 'SEO meta (en-GB)' };
    const plPl: ValidationIssue = { severity: 'error', rule: 'meta-title-length', detail: 'meta_title is 58 chars (max 55).', context: 'SEO meta (pl-PL)' };

    const result = await runRepairGate({
      label: 'SEO metadata',
      maxRepairs: 1,
      basePayload: BASE_PAYLOAD,
      produce: vi.fn().mockResolvedValueOnce({ v: 'attempt0' }).mockResolvedValueOnce({ v: 'attempt1' }),
      validate: vi.fn().mockReturnValueOnce([enGb]).mockReturnValueOnce([plPl]),
      withFeedback: appendRepairFeedback,
    });

    expect(result.shippedAttempt).toBe(0);
    expect(result.artifact).toEqual({ v: 'attempt0' });
    expect(result.attempts[0].resolved).toHaveLength(1);
    expect(result.attempts[0].persisted).toHaveLength(0);
    expect(result.attempts[0].introduced).toHaveLength(1);
    expect(result.attempts[0].introduced[0].context).toBe('SEO meta (pl-PL)');

    const md = formatRepairReportMarkdown(
      [toArtifactReport('SEO metadata', result)],
      { product: 'Ortur H20 20 W', store: 'Center 3D Print', generatedAt: '2026-07-27T15:35:00.829Z' },
    );
    const row = md.split('\n').find(l => l.includes('`meta-title-length`') && l.startsWith('|'))!;
    expect(row).toContain('⚠️ fixed then discarded');
    expect(row).not.toContain('✅ yes');
    // The two statements that used to contradict each other must now agree.
    expect(md).toContain('**Shipped with unresolved errors:**');
    expect(md).toContain('- Shipped attempt: 0 of 1');
  });

  it('records no introduced entries when the repair resolves everything', async () => {
    const result = await runRepairGate({
      label: 'test',
      maxRepairs: 2,
      basePayload: BASE_PAYLOAD,
      produce: vi.fn().mockResolvedValueOnce({ v: 0 }).mockResolvedValueOnce({ v: 1 }),
      validate: vi.fn().mockReturnValueOnce([makeIssue('rule-a')]).mockReturnValueOnce([]),
      withFeedback: appendRepairFeedback,
    });

    expect(result.attempts[0].introduced).toHaveLength(0);
    expect(result.shippedAttempt).toBe(1);
  });

  it('counts only error severity as introduced, never warnings', async () => {
    const result = await runRepairGate({
      label: 'test',
      maxRepairs: 1,
      basePayload: BASE_PAYLOAD,
      produce: vi.fn().mockResolvedValueOnce({ v: 0 }).mockResolvedValueOnce({ v: 1 }),
      validate: vi.fn()
        .mockReturnValueOnce([makeIssue('rule-a')])
        .mockReturnValueOnce([makeIssue('new-warning', 'warning'), makeIssue('new-error')]),
      withFeedback: appendRepairFeedback,
    });

    expect(result.attempts[0].introduced.map(i => i.rule)).toEqual(['new-error']);
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

describe('runRepairGate — tiered repair ladder', () => {
  const seoArtifact = (titles: string[], slugs: string[] = []) => ({
    site_name: 'Store',
    seo_data: titles.map((meta_title, i) => ({ language: `L${i}`, meta_title })),
    slugs: slugs.map((slug, i) => ({ language: `L${i}`, slug })),
  });

  const titleIssue = (index: number, actual: number): ValidationIssue => ({
    severity: 'error',
    rule: 'meta-title-length',
    detail: `meta_title is ${actual} chars (max 55).`,
    context: `SEO meta (L${index})`,
    path: `seo_data[${index}].meta_title`,
    measured: { actual, limit: 55, unit: 'chars' },
  });

  const slugIssue = (index: number): ValidationIssue => ({
    severity: 'error',
    rule: 'slug-charset',
    detail: 'bad charset',
    context: `Slug (L${index})`,
    path: `slugs[${index}].slug`,
  });

  it('attempts field-scoped BEFORE deterministic for meta-title-length', async () => {
    // THE regression guard for the B3/B4 contradiction. A global "all tier 0 first" sweep would
    // truncate the title before the model ever saw it, making tier 1 unreachable and the ladder
    // decorative. This test fails against such an implementation.
    const long = 'Ortur H20 20 W Laser Engraver for Wood Acrylic and Steel | C3D';
    const repairField = vi.fn().mockResolvedValue('Ortur H20 20 W Laser Engraver | C3D');
    const produce = vi.fn().mockResolvedValue(seoArtifact([long]));
    const validate = vi.fn()
      .mockReturnValueOnce([titleIssue(0, 62)])
      .mockReturnValue([]);

    const result = await runRepairGate({
      label: 'SEO metadata',
      maxRepairs: 1,
      basePayload: BASE_PAYLOAD,
      produce,
      validate,
      withFeedback: appendRepairFeedback,
      repairField,
    });

    expect(repairField).toHaveBeenCalledTimes(1);
    const shipped = result.artifact as ReturnType<typeof seoArtifact>;
    // The LLM's wording survived — NOT a blunt truncation of the original.
    expect(shipped.seo_data[0].meta_title).toBe('Ortur H20 20 W Laser Engraver | C3D');
    expect(result.repairsUsed).toBe(0); // no full regeneration was spent
    expect(produce).toHaveBeenCalledTimes(1);
  });

  it('escalates to deterministic when the tier-1 result is still too long', async () => {
    const long = 'A'.repeat(80);
    // The model returns something still over the limit; the ladder must fall through to truncation.
    const repairField = vi.fn().mockResolvedValue('B'.repeat(70));
    const produce = vi.fn().mockResolvedValue(seoArtifact([long]));
    const validate = vi.fn()
      .mockReturnValueOnce([titleIssue(0, 80)])
      .mockReturnValueOnce([titleIssue(0, 70)])
      .mockReturnValue([]);

    const result = await runRepairGate({
      label: 'SEO metadata',
      maxRepairs: 1,
      basePayload: BASE_PAYLOAD,
      produce,
      validate,
      withFeedback: appendRepairFeedback,
      repairField,
    });

    const shipped = result.artifact as ReturnType<typeof seoArtifact>;
    expect(repairField).toHaveBeenCalledTimes(1);
    expect(Array.from(shipped.seo_data[0].meta_title).length).toBeLessThanOrEqual(55);
    expect(shipped.seo_data[0].meta_title.startsWith('B')).toBe(true); // truncated the TIER-1 output
  });

  it('resolves a tier-0-only rule with zero LLM calls', async () => {
    const produce = vi.fn().mockResolvedValue(seoArtifact([], ['Bad Slug!']));
    const repairField = vi.fn();
    const validate = vi.fn().mockReturnValueOnce([slugIssue(0)]).mockReturnValue([]);

    const result = await runRepairGate({
      label: 'Slugs', maxRepairs: 2, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback, repairField,
    });

    expect(produce).toHaveBeenCalledTimes(1); // no regeneration
    expect(repairField).not.toHaveBeenCalled(); // no field-scoped call either
    expect(result.repairsUsed).toBe(0);
    expect((result.artifact as ReturnType<typeof seoArtifact>).slugs[0].slug).toBe('bad-slug');
  });

  it('dispatches mixed ladders in one pass by ACTIVE tier, not by tier order', async () => {
    const repairField = vi.fn().mockResolvedValue('Short title | C3D');
    const produce = vi.fn().mockResolvedValue(seoArtifact(['X'.repeat(80)], ['Bad Slug!']));
    const validate = vi.fn()
      .mockReturnValueOnce([titleIssue(0, 80), slugIssue(0)])
      .mockReturnValue([]);

    const result = await runRepairGate({
      label: 'mixed', maxRepairs: 1, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback, repairField,
    });

    const shipped = result.artifact as ReturnType<typeof seoArtifact>;
    expect(shipped.slugs[0].slug).toBe('bad-slug');           // tier 0
    expect(shipped.seo_data[0].meta_title).toBe('Short title | C3D'); // tier 1
    expect(repairField).toHaveBeenCalledTimes(1);
    expect(produce).toHaveBeenCalledTimes(1);
  });

  it('changes exactly one addressed field and leaves every sibling identical', async () => {
    // Monotonicity — the primary justification for the ladder. Full regeneration has no such
    // property, which is how it fixes en-GB and breaks pl-PL.
    const original = seoArtifact(['Y'.repeat(80), 'fine title']);
    const produce = vi.fn().mockResolvedValue(original);
    const validate = vi.fn().mockReturnValueOnce([titleIssue(0, 80)]).mockReturnValue([]);

    const result = await runRepairGate({
      label: 'SEO metadata', maxRepairs: 1, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback,
      repairField: vi.fn().mockResolvedValue('Fixed title'),
    });

    const shipped = result.artifact as ReturnType<typeof seoArtifact>;
    expect(shipped.seo_data[0].meta_title).toBe('Fixed title');
    expect(shipped.seo_data[1]).toBe(original.seo_data[1]); // same reference
    expect(shipped.site_name).toBe(original.site_name);
  });

  it('sends a minimal tier-1 payload that shares systemBlocks by reference', async () => {
    // Cache stability: the shared prefix must be byte-identical, and the full product context must
    // NOT ride along to correct one string.
    let seen: PromptPayload | undefined;
    const repairField = vi.fn().mockImplementation(async (p: PromptPayload) => {
      seen = p;
      return 'Short';
    });
    const validate = vi.fn().mockReturnValueOnce([titleIssue(0, 80)]).mockReturnValue([]);

    await runRepairGate({
      label: 'SEO metadata', maxRepairs: 1, basePayload: BASE_PAYLOAD,
      produce: vi.fn().mockResolvedValue(seoArtifact(['Z'.repeat(80)])),
      validate, withFeedback: appendRepairFeedback, repairField,
    });

    expect(seen!.systemBlocks).toBe(BASE_PAYLOAD.systemBlocks);
    expect(seen!.userContent).not.toContain(BASE_PAYLOAD.userContent);
    expect(seen!.userContent).toContain('Limit: 55');
  });

  it('still spends a full regeneration for an issue with no ladder above full-regen', async () => {
    const produce = vi.fn()
      .mockResolvedValueOnce(seoArtifact(['ok']))
      .mockResolvedValueOnce(seoArtifact(['ok']));
    const unaddressable = makeIssue('spec-count-mismatch');
    const validate = vi.fn().mockReturnValueOnce([unaddressable]).mockReturnValue([]);

    const result = await runRepairGate({
      label: 'SEO metadata', maxRepairs: 1, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback,
      repairField: vi.fn(),
    });

    expect(produce).toHaveBeenCalledTimes(2); // ladder could not help; tier 2 ran
    expect(result.repairsUsed).toBe(1);
  });

  it('falls through to the deterministic rung when no repairField executor is supplied', async () => {
    // Without an executor the field-scoped rung is unusable, but the ladder must still ADVANCE past
    // it to its deterministic terminator rather than stalling. maxRepairs is 0 so no full
    // regeneration can mask the result — this isolates the ladder.
    const produce = vi.fn().mockResolvedValue(seoArtifact(['W'.repeat(80)]));
    const validate = vi.fn().mockReturnValueOnce([titleIssue(0, 80)]).mockReturnValue([]);

    const result = await runRepairGate({
      label: 'SEO metadata', maxRepairs: 0, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback,
    });

    const shipped = result.artifact as ReturnType<typeof seoArtifact>;
    expect(Array.from(shipped.seo_data[0].meta_title).length).toBeLessThanOrEqual(55);
    expect(produce).toHaveBeenCalledTimes(1); // no regeneration was needed or spent
  });

  it('gives two issues in the SAME context but different paths independent ladders', async () => {
    // issueKey is rule::context, which separates en-GB from pl-PL but NOT two findings inside one
    // artifact. validation-issues.ts:17-22 already says so: for sentence-too-long and friends,
    // "keying on rule+context alone would collapse genuinely distinct findings into one".
    //
    // Shared cursor, two issues, a 3-rung ladder: pass 0 advances it twice, so pass 1 reads rung 2
    // — 'full-regen' — and the deterministic terminator never runs for EITHER title. Twelve
    // sentence-too-long findings in one HTML (base) is the case this has to survive.
    const sameContext = (index: number, actual: number): ValidationIssue => ({
      ...titleIssue(index, actual),
      context: 'SEO meta (uk-UA)', // deliberately identical for both
    });
    const produce = vi.fn().mockResolvedValue(seoArtifact(['W'.repeat(80), 'Z'.repeat(80)]));
    const repairField = vi.fn().mockResolvedValue('B'.repeat(70)); // still over the limit
    const validate = vi.fn()
      .mockReturnValueOnce([sameContext(0, 80), sameContext(1, 80)])
      .mockReturnValueOnce([sameContext(0, 70), sameContext(1, 70)])
      .mockReturnValue([]);

    const result = await runRepairGate({
      label: 'SEO metadata', maxRepairs: 0, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback, repairField,
    });

    const shipped = result.artifact as ReturnType<typeof seoArtifact>;
    expect(Array.from(shipped.seo_data[0].meta_title).length).toBeLessThanOrEqual(55);
    expect(Array.from(shipped.seo_data[1].meta_title).length).toBeLessThanOrEqual(55);
  });

  // ── Warnings on the ladder, via the block-scoped tier ────────────────────────

  const sentenceWarning = (path = 'block[0]'): ValidationIssue => ({
    severity: 'warning',
    rule: 'sentence-too-long',
    detail: 'Sentence of 21 words exceeds the uk-UA hard ceiling of 20. Split it into two.',
    context: 'HTML (base)',
    path,
    measured: { actual: 21, limit: 20, unit: 'words' },
  });

  it('sends a repairable warning to the block tier and ships the rewrite', async () => {
    // The whole point of the feature: 14 sentence-too-long warnings used to be printed and
    // ignored, because the loop never started while the error count was zero.
    const produce = vi.fn().mockResolvedValue('<p>Одне дуже довге речення.</p>');
    const repairBlocks = vi.fn().mockResolvedValue('<p>Одне дуже. Довге речення.</p>');
    const validate = vi.fn().mockReturnValueOnce([sentenceWarning()]).mockReturnValue([]);

    const result = await runRepairGate<string>({
      label: 'HTML (base)', maxRepairs: 1, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback, repairBlocks,
    });

    expect(repairBlocks).toHaveBeenCalledTimes(1);
    expect(repairBlocks.mock.calls[0][1]).toEqual([sentenceWarning()]); // the issues on that rung
    expect(result.artifact).toBe('<p>Одне дуже. Довге речення.</p>');
    expect(produce).toHaveBeenCalledTimes(1); // no regeneration was spent on a warning
  });

  it('states the measured shortfall on the second block rung, not the first', async () => {
    // The two-rung ladder existed but both rungs sent the same words, so a model that had just
    // missed the ceiling was asked again with no idea it had missed. EXPERT3D XGRIDS L2 Pro
    // (2026-07-29) ran with both rungs and still shipped the warning.
    const produce = vi.fn().mockResolvedValue('<p>довге</p>');
    const repairBlocks = vi.fn()
      .mockResolvedValueOnce('<p>трохи коротше</p>')   // applied, but still over the ceiling
      .mockResolvedValue('<p>коротко</p>');
    const validate = vi.fn()
      .mockReturnValueOnce([sentenceWarning()])                                        // 21 words
      .mockReturnValueOnce([{ ...sentenceWarning(), measured: { actual: 23, limit: 20, unit: 'words' } }])
      .mockReturnValue([]);

    await runRepairGate<string>({
      label: 'HTML (base)', maxRepairs: 0, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback, repairBlocks,
    });

    expect(repairBlocks).toHaveBeenCalledTimes(2);
    // First rung: the validator's own detail, untouched.
    expect(repairBlocks.mock.calls[0][1][0].detail).toBe(sentenceWarning().detail);
    // Second rung: the deficit is named, and the arithmetic is the issue's own operands.
    const retryDetail: string = repairBlocks.mock.calls[1][1][0].detail;
    expect(retryDetail).toContain('THE PREVIOUS ATTEMPT DID NOT SATISFY THIS CONSTRAINT');
    expect(retryDetail).toContain('still 23 words against a limit of 20');
    expect(retryDetail).toContain('Remove at least 3 more words');
  });

  it('does not escalate a finding that carries no measured operands', async () => {
    // Without operands there is no shortfall to state, so the instruction must go out unchanged
    // rather than gain a sentence built from undefined.
    const unmeasured = { ...sentenceWarning(), measured: undefined };
    const produce = vi.fn().mockResolvedValue('<p>довге</p>');
    const repairBlocks = vi.fn().mockResolvedValueOnce('<p>інше</p>').mockResolvedValue('<p>ще інше</p>');
    const validate = vi.fn()
      .mockReturnValueOnce([unmeasured])
      .mockReturnValueOnce([unmeasured])
      .mockReturnValue([]);

    await runRepairGate<string>({
      label: 'HTML (base)', maxRepairs: 0, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback, repairBlocks,
    });

    expect(repairBlocks).toHaveBeenCalledTimes(2);
    expect(repairBlocks.mock.calls[1][1][0].detail).toBe(unmeasured.detail);
  });

  it('does not escalate when the retry finding is already within its limit', async () => {
    // A stale-but-satisfied measurement must not produce "remove at least -1 more words".
    const produce = vi.fn().mockResolvedValue('<p>довге</p>');
    const repairBlocks = vi.fn().mockResolvedValueOnce('<p>інше</p>').mockResolvedValue('<p>ще інше</p>');
    const satisfied = { ...sentenceWarning(), measured: { actual: 18, limit: 20, unit: 'words' as const } };
    const validate = vi.fn()
      .mockReturnValueOnce([sentenceWarning()])
      .mockReturnValueOnce([satisfied])
      .mockReturnValue([]);

    await runRepairGate<string>({
      label: 'HTML (base)', maxRepairs: 0, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback, repairBlocks,
    });

    expect(repairBlocks.mock.calls[1][1][0].detail).toBe(satisfied.detail);
  });

  it('never escalates a warning to full regeneration, even when the fix does not take', async () => {
    // A warning the cheap rungs cannot fix stays reported. Spending a whole-artifact rewrite on a
    // stylistic finding would trade a cosmetic problem for a correctness risk.
    const produce = vi.fn().mockResolvedValue('<p>Одне дуже довге речення.</p>');
    const repairBlocks = vi.fn().mockResolvedValue('<p>Одне дуже довге речення.</p>');
    const validate = vi.fn().mockReturnValue([sentenceWarning()]);

    const result = await runRepairGate<string>({
      label: 'HTML (base)', maxRepairs: 2, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback, repairBlocks,
    });

    expect(produce).toHaveBeenCalledTimes(1);
    // Two rungs, both spent, then the ladder ends — it never reaches full-regen. The count is 2
    // rather than 1 because sentence-too-long now gets a retry; the property under test is that
    // the escalation stops here, not how many cheap attempts it makes.
    expect(repairBlocks).toHaveBeenCalledTimes(2);
    expect(result.repairsUsed).toBe(0);
    expect(result.finalIssues).toEqual([sentenceWarning()]); // still reported, honestly
  });

  it('leaves an unaddressable warning alone', async () => {
    // No path — nothing for a tier to rewrite. It must behave exactly as it did before the ladder.
    const produce = vi.fn().mockResolvedValue('<p>Текст.</p>');
    const repairBlocks = vi.fn();
    const validate = vi.fn().mockReturnValue([{ ...sentenceWarning(), path: undefined }]);

    await runRepairGate<string>({
      label: 'HTML (base)', maxRepairs: 1, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback, repairBlocks,
    });

    expect(repairBlocks).not.toHaveBeenCalled();
    expect(produce).toHaveBeenCalledTimes(1);
  });

  it('keeps a warning-only fix, which leaves the error count unchanged at zero', async () => {
    // The regression guard compares errors. A pass that only cleared warnings moves that count by
    // nothing, so a "strictly fewer errors" rule would discard every warning fix ever made.
    const produce = vi.fn().mockResolvedValue('<p>довге</p>');
    const repairBlocks = vi.fn().mockResolvedValue('<p>коротке</p>');
    const validate = vi.fn().mockReturnValueOnce([sentenceWarning()]).mockReturnValue([]);

    const result = await runRepairGate<string>({
      label: 'HTML (base)', maxRepairs: 0, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback, repairBlocks,
    });

    expect(result.artifact).toBe('<p>коротке</p>');
    expect(result.finalIssues).toEqual([]);
  });

  it('counts how many block findings actually went away, not just how many patches landed', async () => {
    // A patch can be applied, pass every structural check, and still leave the sentence too long —
    // exactly what the first real run did, and `applied: 10` said nothing about it. Two findings
    // here; only one of them ever clears.
    const produce = vi.fn().mockResolvedValue('<p>довге</p><p>довге</p>');
    const repairBlocks = vi.fn()
      .mockResolvedValueOnce('<p>коротке</p><p>трохи коротше</p>')
      .mockResolvedValueOnce('<p>коротке</p><p>усе ще задовге</p>');
    const validate = vi.fn()
      .mockReturnValueOnce([sentenceWarning('block[0]'), sentenceWarning('block[1]')])
      .mockReturnValue([sentenceWarning('block[1]')]);

    const result = await runRepairGate<string>({
      label: 'HTML (base)', maxRepairs: 0, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback, repairBlocks,
    });

    expect(result.blockScopedResolved).toBe(1);
  });

  it('re-runs the block tier on the artifact that actually shipped after a regeneration won', async () => {
    // The ladder runs BEFORE the regeneration loop, on an artifact that loop may then replace.
    // When a regeneration wins on errors, `best` becomes an artifact the block tier has never
    // seen, and every patch made earlier is discarded along with the artifact it was applied to.
    // The first real run only kept its 10 patches because the regeneration happened to lose.
    const produce = vi.fn()
      .mockResolvedValueOnce('<p>перший, задовгий</p>')
      .mockResolvedValueOnce('<p>регенерований, задовгий</p>');
    const repairBlocks = vi.fn()
      .mockResolvedValueOnce('<p>перший, виправлений</p>')
      .mockResolvedValueOnce('<p>регенерований, виправлений</p>');
    const validate = vi.fn()
      .mockReturnValueOnce([makeIssue('spec-count-mismatch'), sentenceWarning()]) // initial: 1 error + 1 warning
      .mockReturnValueOnce([makeIssue('spec-count-mismatch')])                    // after ladder: warning fixed
      .mockReturnValueOnce([sentenceWarning()])                                   // regeneration: error gone, warning back
      .mockReturnValue([]);                                                       // after the final block pass

    const result = await runRepairGate<string>({
      label: 'HTML (base)', maxRepairs: 1, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback, repairBlocks,
    });

    expect(produce).toHaveBeenCalledTimes(2);
    expect(repairBlocks).toHaveBeenCalledTimes(2); // once on the ladder, once on what shipped
    expect(result.artifact).toBe('<p>регенерований, виправлений</p>');
    expect(result.finalIssues).toEqual([]);
  });

  it('rolls the final block pass back if it increased the error count', async () => {
    const produce = vi.fn()
      .mockResolvedValueOnce('<p>перший</p>')
      .mockResolvedValueOnce('<p>регенерований</p>');
    const repairBlocks = vi.fn().mockResolvedValue('<p>зіпсований</p>');
    const validate = vi.fn()
      .mockReturnValueOnce([makeIssue('spec-count-mismatch')])   // initial: 1 error, no block work
      .mockReturnValueOnce([sentenceWarning()])                  // regeneration wins: 0 errors
      .mockReturnValue([makeIssue('seo-empty')]);                // final pass made it worse

    const result = await runRepairGate<string>({
      label: 'HTML (base)', maxRepairs: 1, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback, repairBlocks,
    });

    expect(result.artifact).toBe('<p>регенерований</p>');
    expect(result.finalIssues).toEqual([sentenceWarning()]);
  });

  it('does not spend a final pass when the ladder already handled this artifact', async () => {
    // No regeneration won, so `best` is the artifact the ladder worked on and its cursors still
    // mean something. A further pass here would be a third attempt, past the two-rung cap.
    const produce = vi.fn().mockResolvedValue('<p>задовге</p>');
    const repairBlocks = vi.fn().mockResolvedValue('<p>задовге</p>');
    const validate = vi.fn().mockReturnValue([sentenceWarning()]);

    await runRepairGate<string>({
      label: 'HTML (base)', maxRepairs: 0, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback, repairBlocks,
    });

    expect(repairBlocks).toHaveBeenCalledTimes(2); // the two ladder rungs, and no more
  });

  it('does not destroy a paid-for artifact when a registered rule carries a malformed path', async () => {
    // parsePath throws by design, and the intent — fail loudly rather than look like "nothing to
    // fix" — is right. What was wrong is the price: the exception went through runRepairGate and
    // out of generate(), taking an artifact that had already been generated and paid for. Loud
    // must mean "this issue is not patchable", not "lose the work".
    const artifact = seoArtifact(['W'.repeat(80)]);
    const produce = vi.fn().mockResolvedValue(artifact);
    const malformed: ValidationIssue = { ...titleIssue(0, 80), path: 'seo_data.meta_title' };
    const validate = vi.fn().mockReturnValue([malformed]);

    const result = await runRepairGate({
      label: 'SEO metadata', maxRepairs: 0, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback,
      repairField: vi.fn().mockResolvedValue('Short'),
    });

    expect(result.artifact).toBe(artifact);
    expect(result.finalIssues).toEqual([malformed]);
  });

  it('escalates a malformed path to full-regen instead of retrying it', async () => {
    const produce = vi.fn()
      .mockResolvedValueOnce(seoArtifact(['W'.repeat(80)]))
      .mockResolvedValueOnce(seoArtifact(['ok']));
    const malformed: ValidationIssue = { ...titleIssue(0, 80), path: 'seo_data.meta_title' };
    const validate = vi.fn().mockReturnValueOnce([malformed]).mockReturnValue([]);

    const result = await runRepairGate({
      label: 'SEO metadata', maxRepairs: 1, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback,
      repairField: vi.fn(),
    });

    expect(produce).toHaveBeenCalledTimes(2); // the ladder gave up, tier 2 ran
    expect(result.repairsUsed).toBe(1);
  });

  // ── The ladder must not be allowed to make things worse ──────────────────────
  //
  // The full-regen loop below has always had this discipline (strictly better wins, ties keep the
  // earliest). The ladder had none: whatever it produced became the shipped state unconditionally.
  // That was survivable while only errors entered the ladder; it is not once warnings do, because
  // then a purely stylistic pass can ship a worse artifact.

  it('ships the PRE-ladder artifact when the ladder increased the error count', async () => {
    const original = seoArtifact([], ['Bad Slug!']);
    const produce = vi.fn().mockResolvedValue(original);
    const validate = vi.fn()
      .mockReturnValueOnce([slugIssue(0)])                                   // 1 error going in
      .mockReturnValueOnce([makeIssue('spec-count-mismatch'), makeIssue('seo-empty')]) // 2 coming out
      .mockReturnValue([]);

    // maxRepairs 0 so the full-regen loop cannot mask the result — this isolates the ladder.
    const result = await runRepairGate({
      label: 'Slugs', maxRepairs: 0, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback,
    });

    expect(result.artifact).toBe(original);            // same reference — the ladder's work was dropped
    expect(result.finalIssues).toEqual([slugIssue(0)]); // and so were its issues
  });

  it('ships the PRE-ladder artifact when the ladder traded a repairable error for an unrepairable one', async () => {
    // The concrete path: slugify coerces "Ortur H20!" and "ortur-h20" to the same string, so a
    // slug-charset error (ladder-repairable, tier 0) becomes slug-duplicate — which has no
    // registered strategy and therefore costs a full regeneration. The COUNT is unchanged, so a
    // plain count guard misses it. What must not happen is the ladder manufacturing work that only
    // the instrument it exists to avoid can do.
    const original = seoArtifact([], ['Bad Slug!', 'bad-slug']);
    const produce = vi.fn().mockResolvedValue(original);
    const duplicate: ValidationIssue = {
      severity: 'error', rule: 'slug-duplicate', detail: 'duplicate', context: 'Slug (L1)',
    };
    const validate = vi.fn()
      .mockReturnValueOnce([slugIssue(0)])
      .mockReturnValueOnce([duplicate])
      .mockReturnValue([]);

    const result = await runRepairGate({
      label: 'Slugs', maxRepairs: 0, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback,
    });

    expect(result.artifact).toBe(original);
    expect(result.finalIssues).toEqual([slugIssue(0)]);
  });

  it('keeps the ladder result when it strictly reduced the error count', async () => {
    // The guard must not fire on the happy path — this is the behaviour every other ladder test
    // depends on, asserted here directly so a too-eager guard fails loudly.
    const produce = vi.fn().mockResolvedValue(seoArtifact([], ['Bad Slug!']));
    const validate = vi.fn().mockReturnValueOnce([slugIssue(0)]).mockReturnValue([]);

    const result = await runRepairGate({
      label: 'Slugs', maxRepairs: 0, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback,
    });

    expect((result.artifact as ReturnType<typeof seoArtifact>).slugs[0].slug).toBe('bad-slug');
    expect(result.finalIssues).toEqual([]);
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
        shippedAttempt: 1,
        attempts: [
          {
            attempt: 1,
            issuesBefore: [recurringIssueA],
            issuesAfter: [],
            resolved: [recurringIssueA],
            persisted: [],
            introduced: [],
          },
        ],
      },
      {
        label: 'HTML (es-ES)',
        repairsUsed: 1,
        finalIssues: [persistingIssue],
        status: 'unresolved',
        shippedAttempt: 1,
        attempts: [
          {
            attempt: 1,
            issuesBefore: [recurringIssueB, persistingIssue],
            issuesAfter: [persistingIssue],
            resolved: [recurringIssueB],
            persisted: [persistingIssue],
            introduced: [],
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
    expect(specCountRow).toContain('❌ no'); // A3: unresolved-and-shipped is now ❌, ⚠️ is reserved for fixed-then-discarded

    // Recurring-failures table appears before the per-artifact detail section.
    expect(md.indexOf('## Recurring rule failures')).toBeLessThan(md.indexOf('## Per-artifact detail'));
  });

  it('gives a rule that only ever appeared as introduced a row reading "no"', () => {
    // Without `introduced` in the row set this rule has no row at all, and a regression that
    // shipped stays invisible in the prioritization table — Defect B surviving the fix.
    const shipped = makeIssue('meta-description-length');
    const reports: RepairArtifactReport[] = [
      {
        label: 'SEO metadata',
        repairsUsed: 1,
        finalIssues: [shipped],
        status: 'unresolved',
        shippedAttempt: 1,
        attempts: [{
          attempt: 1,
          issuesBefore: [makeIssue('meta-title-length')],
          issuesAfter: [shipped],
          resolved: [makeIssue('meta-title-length')],
          persisted: [],
          introduced: [shipped],
        }],
      },
    ];

    const md = formatRepairReportMarkdown(reports, META);
    const row = md.split('\n').find(l => l.includes('`meta-description-length`') && l.startsWith('|'))!;
    expect(row).toBeDefined();
    expect(row).toContain('❌ no (1 still failing)');
    expect(md).toContain('- ⚠️ introduced: `meta-description-length`');
    expect(md).toContain('- Total repair regressions introduced: 1');
  });

  it('scopes "fixed then discarded" per artifact, never across artifacts', () => {
    // Artifact A: resolved the rule but shipped it anyway (gate problem).
    // Artifact B: never resolved it and shipped it (prompt problem).
    // A global pairing would collapse both into one label; the Contexts column must still show both.
    const ruleA: ValidationIssue = { severity: 'error', rule: 'meta-title-length', detail: '57 chars', context: 'SEO meta (en-GB)' };
    const ruleB: ValidationIssue = { severity: 'error', rule: 'meta-title-length', detail: '58 chars', context: 'SEO meta (pl-PL)' };

    const reports: RepairArtifactReport[] = [
      {
        label: 'SEO metadata (en-GB)',
        repairsUsed: 1,
        finalIssues: [ruleA],
        status: 'unresolved',
        shippedAttempt: 0,
        attempts: [{ attempt: 1, issuesBefore: [ruleA], issuesAfter: [ruleB], resolved: [ruleA], persisted: [], introduced: [ruleB] }],
      },
      {
        label: 'SEO metadata (pl-PL)',
        repairsUsed: 1,
        finalIssues: [ruleB],
        status: 'unresolved',
        shippedAttempt: 1,
        attempts: [{ attempt: 1, issuesBefore: [ruleB], issuesAfter: [ruleB], resolved: [], persisted: [ruleB], introduced: [] }],
      },
    ];

    const md = formatRepairReportMarkdown(reports, META);
    const row = md.split('\n').find(l => l.includes('`meta-title-length`') && l.startsWith('|'))!;
    expect(row).toContain('⚠️ fixed then discarded');
    expect(row).toContain('SEO meta (en-GB)');
    expect(row).toContain('SEO meta (pl-PL)');
  });

  it('does not read "yes" when one artifact resolved a rule that a DIFFERENT artifact shipped broken', () => {
    // The inverse of the scoping guard: resolution on artifact A must not clear artifact B's failure.
    const rule: ValidationIssue = { severity: 'error', rule: 'spec-count-mismatch', detail: 'd', context: 'HTML (uk-UA)' };
    const reports: RepairArtifactReport[] = [
      {
        label: 'HTML (uk-UA)',
        repairsUsed: 1,
        finalIssues: [],
        status: 'repaired',
        shippedAttempt: 1,
        attempts: [{ attempt: 1, issuesBefore: [rule], issuesAfter: [], resolved: [rule], persisted: [], introduced: [] }],
      },
      {
        label: 'HTML (pl-PL)',
        repairsUsed: 0,
        finalIssues: [rule],
        status: 'unresolved',
        shippedAttempt: 0,
        attempts: [],
      },
    ];

    const md = formatRepairReportMarkdown(reports, META);
    const row = md.split('\n').find(l => l.includes('`spec-count-mismatch`') && l.startsWith('|'))!;
    expect(row).not.toContain('✅ yes');
    expect(row).toContain('❌ no (1 still failing)');
  });

  it('returns a short "no repairs needed" message when every report is clean', () => {
    const reports: RepairArtifactReport[] = [
      { label: 'HTML (base)', repairsUsed: 0, finalIssues: [], status: 'clean', attempts: [], shippedAttempt: 0 },
    ];

    const md = formatRepairReportMarkdown(reports, META);

    expect(md).toContain('No repairs were needed');
    expect(md).not.toContain('## Recurring rule failures');
  });

  it('lists warning-severity finalIssues under a dedicated section when every report is clean but warnings exist', () => {
    const warning = makeIssue('decimal-separator', 'warning');
    const reports: RepairArtifactReport[] = [
      { label: 'HTML (uk-UA)', repairsUsed: 0, finalIssues: [warning], status: 'clean', attempts: [], shippedAttempt: 0 },
    ];

    const md = formatRepairReportMarkdown(reports, META);

    expect(md).toContain('No repairs were needed');
    // Renamed from "(no repairs needed)": with warnings now repairable, one appearing here means a
    // repair did not happen or did not work — the old heading would assert the opposite.
    expect(md).toContain('## Warnings (not repaired)');
    expect(md).toContain('[HTML (uk-UA)]');
    expect(md).toContain('`decimal-separator`');
    expect(md).toContain('detail for decimal-separator');
    expect(md).not.toContain('## Recurring rule failures');
  });

  it('surfaces warnings from a CLEAN artifact even when another artifact needed a repair — the exact bug being fixed', () => {
    const warning = makeIssue('spec-row-not-grounded-mass-failure', 'warning');
    const reports: RepairArtifactReport[] = [
      {
        label: 'HTML (base)',
        repairsUsed: 1,
        finalIssues: [],
        status: 'repaired',
        shippedAttempt: 1,
        attempts: [{ attempt: 1, issuesBefore: [makeIssue('seo-empty')], issuesAfter: [], resolved: [makeIssue('seo-empty')], persisted: [], introduced: [] }],
      },
      { label: 'HTML (uk-UA)', repairsUsed: 0, finalIssues: [warning], status: 'clean', attempts: [], shippedAttempt: 0 },
    ];

    const md = formatRepairReportMarkdown(reports, META);

    expect(md).toContain('## Warnings');
    expect(md).toContain('[HTML (uk-UA)]');
    expect(md).toContain('`spec-row-not-grounded-mass-failure`');
    // Not the early-return-branch heading — a repair DID happen this run.
    expect(md).not.toContain('## Warnings (not repaired)');
  });

  it('surfaces a warning that belongs to a REPAIRED artifact itself, not just a sibling clean one', () => {
    const warning = makeIssue('spec-count-mismatch', 'warning');
    const reports: RepairArtifactReport[] = [
      {
        label: 'HTML (base)',
        repairsUsed: 1,
        finalIssues: [warning],
        status: 'repaired',
        shippedAttempt: 1,
        attempts: [{ attempt: 1, issuesBefore: [makeIssue('seo-empty')], issuesAfter: [warning], resolved: [makeIssue('seo-empty')], persisted: [], introduced: [] }],
      },
    ];

    const md = formatRepairReportMarkdown(reports, META);

    expect(md).toContain('## Warnings');
    expect(md).toContain('[HTML (base)]');
    expect(md).toContain('`spec-count-mismatch`');
  });

  it('prints no empty "## Warnings" heading when a repair happened but no warnings exist anywhere', () => {
    const reports: RepairArtifactReport[] = [
      {
        label: 'HTML (base)',
        repairsUsed: 1,
        finalIssues: [],
        status: 'repaired',
        shippedAttempt: 1,
        attempts: [{ attempt: 1, issuesBefore: [makeIssue('seo-empty')], issuesAfter: [], resolved: [makeIssue('seo-empty')], persisted: [], introduced: [] }],
      },
    ];

    const md = formatRepairReportMarkdown(reports, META);

    expect(md).not.toContain('## Warnings');
  });
});

describe('formatRepairReportMarkdown — local block patches', () => {
  const META = { product: 'Ortur H20 20 W', store: 'EXPERT3D', generatedAt: '2026-07-28T10:00:00.000Z' };

  const clean = (label: string, blockPatches?: RepairArtifactReport['blockPatches']): RepairArtifactReport => ({
    label, repairsUsed: 0, attempts: [], finalIssues: [], status: 'clean', shippedAttempt: 0, blockPatches,
  });

  it('reports resolved separately from applied, so an ineffective patch is visible', () => {
    // The gap between the two is the signal the first real run hid: 10 patches applied, and no way
    // to tell from the report that one of them left the sentence over its ceiling.
    const md = formatRepairReportMarkdown([
      clean('HTML (uk-UA)', { applied: 10, resolved: 9, rejected: 0, rejections: [] }),
    ], META);
    expect(md).toContain('- Local block patches applied: 10');
    expect(md).toContain('- Local block findings resolved: 9');
    expect(md).toMatch(/10 applied.*9 resolved/);
  });

  it('does NOT claim nothing was needed when block patches were applied', () => {
    // The exact untruthfulness class PR #50 fixed: a report that reads "no repairs were needed"
    // while the artifact was in fact rewritten. A block patch IS a repair — a cheaper one.
    const md = formatRepairReportMarkdown([clean('HTML (uk-UA)', { applied: 3, resolved: 3, rejected: 0, rejections: [] })], META);
    expect(md).not.toContain('No repairs were needed');
  });

  it('still says nothing was needed when truly nothing happened', () => {
    expect(formatRepairReportMarkdown([clean('HTML (uk-UA)')], META)).toContain('No repairs were needed');
  });

  it('counts applied and rejected block patches in the summary', () => {
    const md = formatRepairReportMarkdown([
      clean('HTML (uk-UA)', { applied: 3, resolved: 3, rejected: 1, rejections: ['block[4]: changed the numbers'] }),
      clean('HTML (PL)', { applied: 2, resolved: 2, rejected: 0, rejections: [] }),
    ], META);
    expect(md).toContain('- Local block patches applied: 5');
    expect(md).toContain('- Local block patches rejected: 1');
  });

  it('says why a patch was rejected, per artifact', () => {
    // A silent rejection is indistinguishable from "the model had nothing to fix" — and the
    // difference is the whole signal about whether the repair prompt is working.
    const md = formatRepairReportMarkdown([
      clean('HTML (uk-UA)', { applied: 1, resolved: 1, rejected: 1, rejections: ['block[4]: the replacement changed the numbers in the block'] }),
    ], META);
    expect(md).toContain('## Local patches');
    expect(md).toContain('HTML (uk-UA)');
    expect(md).toContain('the replacement changed the numbers in the block');
  });

  it('omits the section entirely when the block tier never ran', () => {
    expect(formatRepairReportMarkdown([clean('HTML (uk-UA)')], META)).not.toContain('## Local patches');
  });
});

describe('toArtifactReport — preValidationFixes', () => {
  const okResult = (): RepairGateResult<unknown> => ({
    artifact: {}, finalIssues: [], repairsUsed: 0, attempts: [], blockScopedResolved: 0, shippedAttempt: 0,
  });

  it('carries the supplied fixes through', () => {
    const report = toArtifactReport('HTML (uk-UA)', okResult(), undefined, [{ rule: 'bullet-lead-collision', count: 6 }]);
    expect(report.preValidationFixes).toEqual([{ rule: 'bullet-lead-collision', count: 6 }]);
  });

  it('is undefined when nothing is supplied', () => {
    const report = toArtifactReport('HTML (uk-UA)', okResult());
    expect(report.preValidationFixes).toBeUndefined();
  });

  it('is undefined for an empty array, not an empty array — matches blockPatches\' "absent means nothing happened" contract', () => {
    const report = toArtifactReport('HTML (uk-UA)', okResult(), undefined, []);
    expect(report.preValidationFixes).toBeUndefined();
  });
});

describe('formatRepairReportMarkdown — explaining why, not just what', () => {
  const META = { product: 'Ortur R2 1.3W IR (1064 nm)', store: 'EXPERT3D', generatedAt: '2026-08-07T09:09:04.553Z' };

  it('annotates a still-failing issue with no registered strategy — no cheap repair path existed', () => {
    // bullet-lead-collision has and needs no registered strategy (see bullet-lead-punctuation.ts) —
    // it always falls straight through resolveLadder's ['full-regen'] fallback.
    const persisted: ValidationIssue = {
      severity: 'error', rule: 'bullet-lead-collision',
      detail: 'The bold lead-in "X" has no separator...', context: 'HTML (uk-UA)',
    };
    const reports: RepairArtifactReport[] = [{
      label: 'HTML (uk-UA)', repairsUsed: 1, finalIssues: [persisted], status: 'unresolved', shippedAttempt: 1,
      attempts: [{ attempt: 1, issuesBefore: [persisted], issuesAfter: [persisted], resolved: [], persisted: [persisted], introduced: [] }],
    }];

    const md = formatRepairReportMarkdown(reports, META);
    expect(md).toContain('❌ still failing: `bullet-lead-collision`');
    expect(md).toContain('(no targeted repair strategy — relies on full-document regeneration)');
  });

  it('does not annotate an issue that DOES have a registered strategy', () => {
    // slug-charset is registered (tier 0, deterministic) — a persisted occurrence means the
    // strategy ran and still failed, which is a different, worse signal; the note must not claim
    // "no strategy" when one exists and simply didn't land.
    const persisted: ValidationIssue = {
      severity: 'error', rule: 'slug-charset', detail: 'bad charset', context: 'Slug (en-ES)',
      path: 'slugs[0].slug',
    };
    const reports: RepairArtifactReport[] = [{
      label: 'Slugs', repairsUsed: 1, finalIssues: [persisted], status: 'unresolved', shippedAttempt: 1,
      attempts: [{ attempt: 1, issuesBefore: [persisted], issuesAfter: [persisted], resolved: [], persisted: [persisted], introduced: [] }],
    }];

    const md = formatRepairReportMarkdown(reports, META);
    expect(md).toContain('❌ still failing: `slug-charset`');
    expect(md).not.toContain('no targeted repair strategy');
  });

  it('states the fixed/introduced arithmetic behind a discarded attempt', () => {
    // The exact shape of the 2026-08-07 Ortur R2 1.3W IR report: attempt 1 fixed 4
    // slug-name-designator-lost errors and introduced 4 slug-charset errors — net tie, discarded,
    // attempt 0 (4 errors) shipped instead.
    const fixed = Array.from({ length: 4 }, (_, i) => ({ ...makeIssue('slug-name-designator-lost'), context: `Slug (L${i})` }));
    const introduced = Array.from({ length: 4 }, (_, i) => ({ ...makeIssue('slug-charset'), context: `Slug (L${i})` }));
    const original = fixed.map(i => ({ ...i })); // what's still shipping — attempt 0's own 4 errors
    const reports: RepairArtifactReport[] = [{
      label: 'Slugs', repairsUsed: 1, finalIssues: original, status: 'unresolved', shippedAttempt: 0,
      attempts: [{ attempt: 1, issuesBefore: original, issuesAfter: introduced, resolved: fixed, persisted: [], introduced }],
    }];

    const md = formatRepairReportMarkdown(reports, META);
    expect(md).toContain(
      '- Discarded: fixed 4 error(s), introduced 4 new error(s) (slug-charset) — net change +0, ' +
      'not strictly better than the 4 error(s) this attempt started from.',
    );
  });

  it('does not print a discard line for the attempt that actually shipped', () => {
    const resolved = [makeIssue('meta-title-length')];
    const reports: RepairArtifactReport[] = [{
      label: 'SEO metadata', repairsUsed: 1, finalIssues: [], status: 'repaired', shippedAttempt: 1,
      attempts: [{ attempt: 1, issuesBefore: resolved, issuesAfter: [], resolved, persisted: [], introduced: [] }],
    }];

    const md = formatRepairReportMarkdown(reports, META);
    expect(md).not.toContain('- Discarded:');
  });

  it('does not print a discard line for a later attempt merely edged out, with nothing of its own introduced', () => {
    const ruleA = makeIssue('rule-a');
    const reports: RepairArtifactReport[] = [{
      label: 'test', repairsUsed: 2, finalIssues: [ruleA], status: 'unresolved', shippedAttempt: 1,
      attempts: [
        { attempt: 1, issuesBefore: [ruleA, makeIssue('rule-b')], issuesAfter: [ruleA], resolved: [makeIssue('rule-b')], persisted: [ruleA], introduced: [] },
        { attempt: 2, issuesBefore: [ruleA], issuesAfter: [ruleA], resolved: [], persisted: [ruleA], introduced: [] },
      ],
    }];

    const md = formatRepairReportMarkdown(reports, META);
    expect(md).not.toContain('- Discarded:');
  });

  it('adds a pre-validation-normalizations summary line when a normalizer fixed something before validation ran', () => {
    const reports: RepairArtifactReport[] = [{
      label: 'HTML (uk-UA)', repairsUsed: 0, finalIssues: [], status: 'clean', shippedAttempt: 0, attempts: [],
      preValidationFixes: [{ rule: 'bullet-lead-collision', count: 6 }],
    }];

    const md = formatRepairReportMarkdown(reports, META);
    expect(md).toContain('- Pre-validation normalizations applied: 6 (bullet-lead-collision: 6)');
  });

  it('sums pre-validation fixes for the same rule across artifacts', () => {
    const reports: RepairArtifactReport[] = [
      { label: 'HTML (base)', repairsUsed: 0, finalIssues: [], status: 'clean', shippedAttempt: 0, attempts: [], preValidationFixes: [{ rule: 'bullet-lead-collision', count: 2 }] },
      { label: 'HTML (uk-UA)', repairsUsed: 0, finalIssues: [], status: 'clean', shippedAttempt: 0, attempts: [], preValidationFixes: [{ rule: 'bullet-lead-collision', count: 6 }] },
    ];

    const md = formatRepairReportMarkdown(reports, META);
    expect(md).toContain('- Pre-validation normalizations applied: 8 (bullet-lead-collision: 8)');
  });

  it('omits the pre-validation-normalizations line entirely when nothing was normalized', () => {
    const reports: RepairArtifactReport[] = [
      { label: 'HTML (base)', repairsUsed: 0, finalIssues: [], status: 'clean', shippedAttempt: 0, attempts: [] },
    ];

    const md = formatRepairReportMarkdown(reports, META);
    expect(md).not.toContain('Pre-validation normalizations');
  });
});

// ── heading-product-name-stuffing — one registered strategy, two artifact shapes ──
//
// Regression coverage for the 2026-08 EXPERT3D Ortur F10 10W incident: this rule used to be
// checked (sometimes) but never repaired anywhere, on either pipeline. These tests exercise the
// REAL registered strategy (repair-strategy.ts), not a stand-in, so a future edit to its ladder
// or its path-addressing assumptions fails here first.
describe('heading-product-name-stuffing — one ladder serving two artifact shapes', () => {
  const headingWarning = (path: string): ValidationIssue => ({
    severity: 'warning',
    rule: 'heading-product-name-stuffing',
    detail:
      'The <h2> "Ortur F10 10 W — Engraving and Cutting" contains the FULL product name. Per ' +
      '[HEADING FORM] no heading may carry the configuration code or the package/kit suffix — ' +
      'use the short form "Ortur F10 10W" in the first §3 heading and the §9 closing, and a ' +
      'generic category noun everywhere else.',
    context: 'en-ES — heading form',
    path,
  });

  it('resolves an HTML "block[i]" path via the block-scoped rung — field-scoped harmlessly no-ops first', async () => {
    // This is the Task C shape: a plain HTML string, addressed by block-repair.ts's grammar.
    const produce = vi.fn().mockResolvedValue('<h2>Ortur F10 10 W — Engraving and Cutting</h2>');
    const repairField = vi.fn(); // must NEVER be called — getAtPath can't address "block[0]" on a string
    const repairBlocks = vi.fn().mockResolvedValue('<h2>Ortur F10 10W — Engraving and Cutting</h2>');
    const validate = vi.fn()
      .mockReturnValueOnce([headingWarning('block[0]')])
      .mockReturnValue([]);

    const result = await runRepairGate<string>({
      label: 'HTML (en-ES)', maxRepairs: 1, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback, repairField, repairBlocks,
    });

    expect(repairField).not.toHaveBeenCalled();
    expect(repairBlocks).toHaveBeenCalledTimes(1);
    expect(repairBlocks.mock.calls[0][1]).toEqual([headingWarning('block[0]')]);
    expect(result.artifact).toBe('<h2>Ortur F10 10W — Engraving and Cutting</h2>');
    expect(result.finalIssues).toEqual([]);
    expect(produce).toHaveBeenCalledTimes(1); // a warning never reaches full regeneration
  });

  it('resolves a Doc "doc.arrayProp[i].leafProp" path via the field-scoped rung — block-scoped never runs', async () => {
    // This is the runDocGate shape: { doc: { functionality: [...] } }, addressed by
    // repair-strategy.ts's wrapperProp grammar.
    type DocLike = { doc: { functionality: { heading: string }[] } };
    const artifact = (): DocLike => ({ doc: { functionality: [{ heading: 'Ortur F10 10 W — Engraving and Cutting' }] } });
    const produce = vi.fn().mockResolvedValue(artifact());
    const repairField = vi.fn().mockResolvedValue('Ortur F10 10W — Engraving and Cutting');
    const repairBlocks = vi.fn(); // must never be called — this issue never reaches that rung
    const validate = vi.fn()
      .mockReturnValueOnce([headingWarning('doc.functionality[0].heading')])
      .mockReturnValue([]);

    const result = await runRepairGate<DocLike>({
      label: 'Doc (base)', maxRepairs: 1, basePayload: BASE_PAYLOAD,
      produce, validate, withFeedback: appendRepairFeedback, repairField, repairBlocks,
    });

    expect(repairField).toHaveBeenCalledTimes(1);
    expect(repairBlocks).not.toHaveBeenCalled();
    expect(result.artifact.doc.functionality[0].heading).toBe('Ortur F10 10W — Engraving and Cutting');
    expect(result.finalIssues).toEqual([]);
    expect(produce).toHaveBeenCalledTimes(1);
  });
});

// ── Slug generation used to have NO repair gate at all (2026-08 EXPERT3D Ortur F10 10W) ──
//
// validateSlugs only ever ran in the post-hoc, advisory-only runOutputValidation pass; the real
// generation call sites were a bare try/catch around generateJson with no validate/repair step.
// This exercises the REAL validateSlugs against runRepairGate, the composition now wired into
// content-orchestrator.service.ts, so a future edit that silently drops that wiring fails here.
describe('validateSlugs feeding a real repair loop', () => {
  const slugArtifact = (name: string): SlugResponse => ({
    site_name: 'EXPERT3D',
    slugs: [{ language: 'en-ES', name, slug: 'ortur-f10-laser-engraver-10-w' }],
  });

  it('a slug-name-designator-lost error triggers full regeneration instead of only being reported', async () => {
    const produce = vi.fn()
      .mockResolvedValueOnce(slugArtifact('Ortur F10 Laser Engraver 10 W')) // drops the invariant core "Ortur F10 10W"
      .mockResolvedValueOnce(slugArtifact('Ortur F10 10W Laser Engraver')); // corrected on retry

    const result = await runRepairGate<SlugResponse>({
      label: 'Slugs',
      maxRepairs: 1,
      basePayload: BASE_PAYLOAD,
      produce,
      validate: json => validateSlugs(json, 'Ortur F10 10W'),
      withFeedback: appendRepairFeedback,
    });

    expect(produce).toHaveBeenCalledTimes(2); // the retry that used to never happen
    expect(result.repairsUsed).toBe(1);
    expect(result.finalIssues).toEqual([]);
    expect(result.artifact.slugs[0].name).toBe('Ortur F10 10W Laser Engraver');
  });

  it('the feedback names the exact invariant core, not a generic message', () => {
    const issues = validateSlugs(slugArtifact('Ortur F10 Laser Engraver 10 W'), 'Ortur F10 10W');
    const payload = appendRepairFeedback(BASE_PAYLOAD, issues);

    expect(payload.userContent).toContain('Ortur F10 10W');
  });
});

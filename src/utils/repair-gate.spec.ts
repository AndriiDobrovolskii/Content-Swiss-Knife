import { describe, it, expect, vi } from 'vitest';
import { runRepairGate, appendRepairFeedback, formatRepairReportMarkdown, toArtifactReport, RepairArtifactReport } from './repair-gate';
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
    expect(md).toContain('## Warnings (no repairs needed)');
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
    expect(md).not.toContain('## Warnings (no repairs needed)');
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

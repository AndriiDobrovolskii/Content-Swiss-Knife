/**
 * doc-repair-recovery.spec.ts
 *
 * The recovery contract for the Doc path, tested against the REAL `runRepairGate` with a mocked
 * model call — not against a mocked gate. The gate's no-try/catch behaviour (repair-gate.ts:112
 * and :339) is the thing that made this necessary, so stubbing it out would test nothing.
 *
 * Modelled on the orchestrator's actual shape: a `docIssues` closure written by `produce` and read
 * by `validate`, which is the pattern that file already uses for `restoredVideos`.
 *
 * An earlier draft of the plan proposed forcing a real failure by temporarily tightening a schema
 * bound and reverting afterwards. This replaces it: deterministic, free, permanent, and it protects
 * against the regression instead of merely observing it once.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

import { runRepairGate, appendRepairFeedback } from '../utils/repair-gate';
import {
  docSchemaIssues, assertDocRendered, isUnrepairableGenerationError, providerDetail,
} from './doc-schema-issues';
import { ProductDescriptionDocSchema } from '../domain/description-doc.schema';
import type { ValidationIssue } from '../utils/output-validator';
import type { PromptPayload } from '../prompt-core/payload';

// vitest.config.ts sets neither restoreMocks nor clearMocks, so a mock left in place leaks into
// every later test in this file and into other files sharing the module registry. Restore locally
// rather than flipping the global flag, which would change behaviour for all 65 spec files at once.
afterEach(() => vi.restoreAllMocks());

const BASE: PromptPayload = {
  systemBlocks: [{ text: 'master', cache: true }, { text: 'task', cache: true }],
  userContent: '[INPUT DATA]',
};

/** Minimal valid Doc — enough to satisfy the schema. */
function validDoc() {
  return {
    schemaVersion: '3.0' as const,
    locale: 'uk-UA',
    localizedName: 'Test Product',
    hook: 'A hook sentence.',
    killerSpecs: [
      { key: 'a', label: 'A', value: '1', why: 'why a' },
      { key: 'b', label: 'B', value: '2', why: 'why b' },
      { key: 'c', label: 'C', value: '3', why: 'why c' },
    ],
    keyBenefits: [{ kind: 'paragraph' as const, text: 'Benefit.' }],
    functionality: [{ heading: 'How it works', blocks: [{ kind: 'paragraph' as const, text: 'It works.' }] }],
    applications: {
      heading: 'Applications',
      items: [
        { scenario: 'One. ', text: 'a' }, { scenario: 'Two. ', text: 'b' },
        { scenario: 'Three. ', text: 'c' }, { scenario: 'Four. ', text: 'd' },
      ],
    },
    specs: { heading: 'Specs', categories: [{ title: 'Cat', rows: [{ label: 'L', value: 'V' }] }] },
    cta: { heading: 'CTA', text: 'Buy it.' },
    figures: [],
    videos: [],
  };
}

/** A Doc the schema rejects — killerSpecs below the 3-entry minimum. */
function invalidDoc() {
  return { ...validDoc(), killerSpecs: [{ key: 'a', label: 'A', value: '1', why: 'only one' }] };
}

/** What Angular hands the Doc branch when the proxy answers `{ error: describeError(err) }`. */
const HTTP_TRUNCATION = {
  status: 500,
  message: 'Http failure response for /api/llm/generate: 500 Internal Server Error',
  error: { error: '[anthropic] output truncated: hit max_tokens (128000) on claude-sonnet-4-6 / creative-json. Raise the model\'s maxOutputTokens in model-catalog.json or lower the thinking level.' },
};

/**
 * Reproduces the orchestrator's Doc branch: short-circuit the deterministic provider guards, then
 * parse, stash issues on failure, and return '' so the gate sees a failed attempt rather than an
 * exception. Kept faithful to content-orchestrator.service.ts — a helper that skipped the
 * short-circuit would let these tests pass while production behaved differently.
 *
 * The short-circuit only throws on the FIRST call: content-orchestrator.service.ts's
 * `isFirstHtmlAAttempt` flag, mirrored here as a variable scoped to this single `makeProduce()`
 * call (i.e. fresh per test, same as the real flag is fresh per generate() invocation). A later
 * call (a repair attempt) already has a `best` artifact the gate can fall back to, so it converts
 * to issues instead of throwing.
 */
function makeProduce(llm: { generate: (p: PromptPayload) => Promise<unknown> }, stash: ValidationIssue[]) {
  let isFirstAttempt = true;
  return async (payload: PromptPayload): Promise<string> => {
    const isInitialAttempt = isFirstAttempt;
    isFirstAttempt = false;
    stash.length = 0;
    try {
      const raw = await llm.generate(payload);
      ProductDescriptionDocSchema.parse(raw);
      return '<p>rendered</p>';
    } catch (err) {
      if (isInitialAttempt && isUnrepairableGenerationError(err)) throw new Error(providerDetail(err) ?? String(err));
      stash.push(...docSchemaIssues(err, 'HTML (base)'));
      return '';
    }
  };
}

describe('Doc path recovery — a rejected Doc is repaired, not fatal', () => {
  it('retries instead of propagating the throw, and succeeds on attempt 2', async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce(invalidDoc())
      .mockResolvedValueOnce(validDoc());
    const docIssues: ValidationIssue[] = [];

    const result = await runRepairGate<string>({
      label: 'HTML (base)',
      maxRepairs: 2,
      basePayload: BASE,
      produce: makeProduce({ generate }, docIssues),
      validate: () => [...docIssues],
      withFeedback: appendRepairFeedback,
    });

    expect(generate).toHaveBeenCalledTimes(2);
    expect(result.artifact).toBe('<p>rendered</p>');
    expect(result.finalIssues.filter(i => i.severity === 'error')).toHaveLength(0);
    expect(result.repairsUsed).toBe(1);
  });

  /**
   * The reason the conversion exists. Without it the retry prompt would carry
   * "empty-output: Generated HTML is empty" — a symptom, not the cause — and the model would have
   * nothing to act on.
   */
  it('tells the model which field it got wrong', async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce(invalidDoc())
      .mockResolvedValueOnce(validDoc());
    const docIssues: ValidationIssue[] = [];

    await runRepairGate<string>({
      label: 'HTML (base)',
      maxRepairs: 2,
      basePayload: BASE,
      produce: makeProduce({ generate }, docIssues),
      validate: () => [...docIssues],
      withFeedback: appendRepairFeedback,
    });

    const retryPayload = generate.mock.calls[1][0] as PromptPayload;
    expect(retryPayload.userContent).toContain('killerSpecs');
    expect(retryPayload.userContent).toContain('VALIDATION FEEDBACK');
    // The cached prefix must be untouched, or every repair pays full price.
    expect(retryPayload.systemBlocks).toEqual(BASE.systemBlocks);
  });

  it('survives a non-schema throw, such as unparseable JSON', async () => {
    const generate = vi.fn()
      .mockRejectedValueOnce(new SyntaxError('Unexpected token } in JSON at position 42'))
      .mockResolvedValueOnce(validDoc());
    const docIssues: ValidationIssue[] = [];

    const result = await runRepairGate<string>({
      label: 'HTML (base)',
      maxRepairs: 2,
      basePayload: BASE,
      produce: makeProduce({ generate }, docIssues),
      validate: () => [...docIssues],
      withFeedback: appendRepairFeedback,
    });

    expect(result.artifact).toBe('<p>rendered</p>');
  });
});

describe('Doc path recovery — exhausting the budget must not ship nothing', () => {
  /**
   * THE SECOND HOLE. When every attempt fails, the gate returns its least-bad artifact — which is
   * `''` — and an EMPTY DESCRIPTION would be saved. Failing loudly is correct here; silently
   * persisting nothing is not.
   */
  it('the gate really does hand back an empty artifact when all attempts fail', async () => {
    const generate = vi.fn().mockResolvedValue(invalidDoc());
    const docIssues: ValidationIssue[] = [];

    const result = await runRepairGate<string>({
      label: 'HTML (base)',
      maxRepairs: 1,
      basePayload: BASE,
      produce: makeProduce({ generate }, docIssues),
      validate: () => [...docIssues],
      withFeedback: appendRepairFeedback,
    });

    expect(result.artifact).toBe('');
    expect(result.finalIssues.some(i => i.severity === 'error')).toBe(true);
  });

  it('assertDocRendered throws on that empty artifact rather than letting it through', () => {
    expect(() => assertDocRendered('', 'HTML (base)', [
      { severity: 'error', rule: 'doc-schema', detail: 'killerSpecs: too small', context: 'HTML (base)' },
    ])).toThrow(/HTML \(base\)/);
  });

  it('names the schema failures in the thrown error, so the log is actionable', () => {
    expect(() => assertDocRendered('   ', 'HTML (base)', [
      { severity: 'error', rule: 'doc-schema', detail: 'killerSpecs: too small', context: 'HTML (base)' },
    ])).toThrow(/killerSpecs/);
  });

  it('lets a real artifact through untouched', () => {
    expect(() => assertDocRendered('<p>rendered</p>', 'HTML (base)', [])).not.toThrow();
  });
});

/**
 * The mirror image of everything above: repair is the right answer for a Doc the model got wrong,
 * and the WRONG answer for a request the provider could not complete at all.
 *
 * A Sonnet 4.6 @ high `Doc (base)` call runs for minutes. When one truncated, the gate spent its
 * whole budget re-issuing a request that truncates identically every time — up to an hour of paid
 * calls ending in "empty-output". server/utils/retry.js already refuses to retry "a truncation
 * guard" for exactly this reason; these tests hold the repair gate to the same rule.
 */
describe('Doc path recovery — a deterministic provider failure is not repairable', () => {
  it('spends no repair attempts on a truncation', async () => {
    const generate = vi.fn().mockRejectedValue(HTTP_TRUNCATION);
    const docIssues: ValidationIssue[] = [];

    await expect(runRepairGate<string>({
      label: 'HTML (base)',
      maxRepairs: 3,
      basePayload: BASE,
      produce: makeProduce({ generate }, docIssues),
      validate: () => [...docIssues],
      withFeedback: appendRepairFeedback,
    })).rejects.toThrow(/hit max_tokens/);

    // One call, not four. This number is the whole point of the test.
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('surfaces the provider instruction, not the HTTP status', async () => {
    const generate = vi.fn().mockRejectedValue(HTTP_TRUNCATION);
    const docIssues: ValidationIssue[] = [];

    await expect(runRepairGate<string>({
      label: 'HTML (base)',
      maxRepairs: 3,
      basePayload: BASE,
      produce: makeProduce({ generate }, docIssues),
      validate: () => [...docIssues],
      withFeedback: appendRepairFeedback,
    })).rejects.toThrow(/lower the thinking level/);
  });

  // The contrast that makes the split meaningful: a schema failure keeps every attempt it had.
  it('still spends the budget on a schema failure, which repair can fix', async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce(invalidDoc())
      .mockResolvedValueOnce(validDoc());
    const docIssues: ValidationIssue[] = [];

    const result = await runRepairGate<string>({
      label: 'HTML (base)',
      maxRepairs: 3,
      basePayload: BASE,
      produce: makeProduce({ generate }, docIssues),
      validate: () => [...docIssues],
      withFeedback: appendRepairFeedback,
    });

    expect(generate).toHaveBeenCalledTimes(2);
    expect(result.artifact).toBe('<p>rendered</p>');
  });

  /**
   * The regression this whole describe block exists to prevent going forward: an unrepairable
   * error on a REPAIR attempt (not the initial one) must not discard the `best` a prior attempt
   * already earned. Attempt 0 renders real content but is validated against an extra, external
   * finding (simulating validateGeneratedHtml() catching something docIssues alone would not) —
   * so a repair attempt is genuinely triggered. That attempt then hits a truncation. Before the
   * isInitialAttempt guard, makeProduce's throw would propagate out of runRepairGate uncaught and
   * this test would reject; now it must resolve with attempt 0's own artifact intact.
   */
  it('preserves attempt 0’s artifact when a later repair attempt is unrepairable', async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce(validDoc())
      .mockRejectedValueOnce(HTTP_TRUNCATION);
    const docIssues: ValidationIssue[] = [];
    const externalFinding: ValidationIssue = {
      severity: 'error', rule: 'html-check', detail: 'a separate validator found something', context: 'test',
    };

    const result = await runRepairGate<string>({
      label: 'HTML (base)',
      maxRepairs: 1,
      basePayload: BASE,
      produce: makeProduce({ generate }, docIssues),
      validate: () => [...docIssues, externalFinding],
      withFeedback: appendRepairFeedback,
    });

    expect(generate).toHaveBeenCalledTimes(2);
    expect(result.artifact).toBe('<p>rendered</p>');
    expect(result.shippedAttempt).toBe(0);
    expect(result.finalIssues).toEqual([externalFinding]);
  });
});

/**
 * doc-schema-issues.spec.ts
 *
 * Converts a rejected Doc into the ValidationIssue[] the repair gate already speaks.
 *
 * WHY THIS EXISTS. On the Doc path `ProductDescriptionDocSchema.parse()` THROWS, and
 * `runRepairGate` calls `produce()` with no try/catch (repair-gate.ts:112 and :339 — its only try
 * block is the tier-1 field path). So a malformed Doc killed the whole generation: no retry, no
 * repair, no fallback. The HTML path never had that failure mode, because generateText returns a
 * string and the transforms cannot throw on content.
 *
 * Turning the throw into issues lets the existing machinery do its job — and, critically, lets
 * `appendRepairFeedback` tell the model WHICH FIELD it got wrong instead of the useless
 * "empty-output: Generated HTML is empty" it would otherwise send.
 */
import { describe, it, expect } from 'vitest';

import {
  docSchemaIssues, DOC_SCHEMA_RULE, isUnrepairableGenerationError, providerDetail,
} from './doc-schema-issues';
import { ProductDescriptionDocSchema } from '../domain/description-doc.schema';

/** A Doc that fails several ways at once, so the field paths are distinguishable. */
function brokenDoc(): unknown {
  return {
    schemaVersion: '3.0',
    locale: 'uk-UA',
    localizedName: 'Test',
    hook: 'A hook.',
    killerSpecs: [{ label: 'a', value: 'b', why: 'c' }], // needs 3–4
    keyBenefits: [],                                     // needs ≥1
    functionality: [],                                   // needs ≥1
    applications: { heading: 'h', items: [] },           // needs 4–8
    specs: { heading: 'h', categories: [] },             // needs ≥1
    cta: { heading: 'h', text: 't' },
    figures: [],
    videos: [],
  };
}

function issuesFor(doc: unknown) {
  const result = ProductDescriptionDocSchema.safeParse(doc);
  expect(result.success, 'fixture was supposed to be invalid').toBe(false);
  return docSchemaIssues(result.error, 'HTML (base)');
}

describe('docSchemaIssues', () => {
  it('produces at least one issue per distinct broken field', () => {
    const issues = issuesFor(brokenDoc());
    expect(issues.length).toBeGreaterThanOrEqual(4);
  });

  /** Everything here must be an error: a warning would not trigger a repair attempt. */
  it('marks every issue as an error, so the gate actually retries', () => {
    expect(issuesFor(brokenDoc()).every(i => i.severity === 'error')).toBe(true);
  });

  /**
   * THE POINT OF THE WHOLE CONVERSION. appendRepairFeedback interpolates `detail` into the retry
   * prompt, so the field path is what tells the model what to fix. Without it the model is told
   * only that its output was rejected.
   */
  it('names the offending field path in the detail', () => {
    const details = issuesFor(brokenDoc()).map(i => i.detail).join('\n');
    expect(details).toContain('killerSpecs');
    expect(details).toContain('keyBenefits');
    expect(details).toContain('applications.items');
  });

  it('carries a stable rule name so the issue can be counted and filtered', () => {
    expect(issuesFor(brokenDoc()).every(i => i.rule === DOC_SCHEMA_RULE)).toBe(true);
  });

  it('passes the caller’s context through', () => {
    expect(issuesFor(brokenDoc()).every(i => i.context === 'HTML (base)')).toBe(true);
  });

  it('reports a nested path in full, not just its root', () => {
    const doc = brokenDoc() as Record<string, unknown>;
    doc['specs'] = { heading: 'h', categories: [{ title: 't', rows: [{ label: 'l', value: [] }] }] };
    expect(issuesFor(doc).map(i => i.detail).join('\n')).toMatch(/specs\.categories\.0\.rows\.0\.value/);
  });

  /**
   * A non-zod failure — malformed JSON that never reached the schema, or any other throw inside
   * produce() — must still become a reportable issue rather than escaping as an exception. That is
   * the whole reason the caller can wrap its work in one try/catch.
   */
  it('converts a plain Error into a single issue instead of rethrowing', () => {
    const issues = docSchemaIssues(new Error('Unexpected token } in JSON at position 42'), 'HTML (base)');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].detail).toContain('Unexpected token');
  });

  it('never returns an empty array, which would let a failed attempt look clean', () => {
    expect(docSchemaIssues(undefined, 'ctx').length).toBeGreaterThan(0);
    expect(docSchemaIssues(null, 'ctx').length).toBeGreaterThan(0);
    expect(docSchemaIssues('a bare string', 'ctx').length).toBeGreaterThan(0);
  });

  /**
   * The repair prompt used to be handed Angular's HTTP wording instead of the provider's. The
   * server log said `hit max_tokens (64000) on claude-sonnet-4-6` while the model was told "500
   * Internal Server Error" — a sentence it can do nothing with.
   */
  it('reports the provider sentence from a proxy failure, not the HTTP status', () => {
    const detail = docSchemaIssues(HTTP_TRUNCATION, 'HTML (base)')[0].detail;
    expect(detail).toContain('hit max_tokens');
    expect(detail).not.toContain('Internal Server Error');
  });
});

/** What Angular hands the Doc branch when the proxy answers `{ error: describeError(err) }`. */
const HTTP_TRUNCATION = {
  status: 500,
  message: 'Http failure response for /api/llm/generate: 500 Internal Server Error',
  error: { error: '[anthropic] output truncated: hit max_tokens (64000) on claude-sonnet-4-6 / creative-json.' },
};

describe('providerDetail', () => {
  it('digs the real sentence out of the proxy envelope', () => {
    expect(providerDetail(HTTP_TRUNCATION)).toContain('hit max_tokens');
  });

  it('falls back to message when there is no envelope', () => {
    expect(providerDetail(new Error('boom'))).toBe('boom');
    expect(providerDetail('a bare string')).toBe('a bare string');
  });

  it('returns undefined when there is nothing to read', () => {
    expect(providerDetail(undefined)).toBeUndefined();
    expect(providerDetail(null)).toBeUndefined();
    expect(providerDetail({})).toBeUndefined();
  });
});

/**
 * The classification server/utils/retry.js already applies — "a truncation guard" and "a safety
 * block" must fail fast — extended to the repair gate, which never knew about it. Repairing a
 * truncation costs up to 3 more deep calls and cannot succeed: the same request truncates the
 * same way.
 */
describe('isUnrepairableGenerationError', () => {
  it('catches a truncation from either provider', () => {
    expect(isUnrepairableGenerationError(HTTP_TRUNCATION)).toBe(true);
    expect(isUnrepairableGenerationError(
      new Error('[gemini] generate truncated: hit maxOutputTokens on gemini-3.1-pro-preview.'),
    )).toBe(true);
  });

  it('catches a safety block from either provider', () => {
    expect(isUnrepairableGenerationError(
      new Error('[anthropic] request refused by safety classifier on claude-sonnet-4-6 / creative-json.'),
    )).toBe(true);
    expect(isUnrepairableGenerationError(
      new Error('[gemini] generate blocked by safety filter (SAFETY) on gemini-3.1-pro-preview.'),
    )).toBe(true);
  });

  it('catches an OpenAI content-filter block', () => {
    expect(isUnrepairableGenerationError(
      new Error('[openai] response blocked by content filter on gpt-4o / creative-json.'),
    )).toBe(true);
  });

  // The defence-in-depth path: json-parse.js's own truncation guard, for JSON that never closes.
  // Same failure class as a provider's max_tokens truncation — the request cannot succeed as-is.
  it('catches a json-parse truncation', () => {
    expect(isUnrepairableGenerationError(
      new Error('[json-parse] response truncated: unterminated string at end of input.'),
    )).toBe(true);
    expect(isUnrepairableGenerationError(
      new Error('[json-parse] response truncated: 2 unclosed container(s) at end of input.'),
    )).toBe(true);
  });

  // The whole point of the split: a schema failure IS repairable and must keep its attempts.
  it('leaves a schema failure to the repair gate', () => {
    const result = ProductDescriptionDocSchema.safeParse(brokenDoc());
    expect(isUnrepairableGenerationError(result.success ? null : result.error)).toBe(false);
    expect(isUnrepairableGenerationError(new Error('Unexpected token } in JSON at position 42'))).toBe(false);
  });

  // Deliberately excluded: transient, and a retry can legitimately succeed.
  it('does not short-circuit a timeout or a bodyless 500', () => {
    expect(isUnrepairableGenerationError(new Error('Request timed out.'))).toBe(false);
    expect(isUnrepairableGenerationError({ status: 500, message: 'Http failure response', error: null })).toBe(false);
  });

  it('says no when there is nothing to classify', () => {
    expect(isUnrepairableGenerationError(undefined)).toBe(false);
    expect(isUnrepairableGenerationError({})).toBe(false);
  });
});

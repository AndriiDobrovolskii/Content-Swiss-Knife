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

import { docSchemaIssues, DOC_SCHEMA_RULE } from './doc-schema-issues';
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
});

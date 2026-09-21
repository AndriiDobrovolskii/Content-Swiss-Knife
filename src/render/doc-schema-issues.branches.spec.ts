/**
 * US-2.2 (loop-back from QUALITY_GATE) — the remaining fallback branches of providerDetail and
 * docSchemaIssues, asserted by the message a repair prompt would actually carry.
 */
import { describe, it, expect } from 'vitest';
import { docSchemaIssues, providerDetail, DOC_SCHEMA_RULE } from './doc-schema-issues';

describe('providerDetail fallbacks', () => {
  it('unwraps a plain-string proxy body', () => {
    expect(providerDetail({ error: 'upstream said no', message: 'Http failure 500' })).toBe('upstream said no');
  });

  it('an empty-string body falls through to error.message', () => {
    expect(providerDetail({ error: '', message: 'Http failure 500' })).toBe('Http failure 500');
  });

  it('a non-string, non-object body falls through to error.message', () => {
    expect(providerDetail({ error: 42, message: 'Http failure 500' })).toBe('Http failure 500');
  });

  it('an object body whose inner error is not a string falls through to error.message', () => {
    expect(providerDetail({ error: { error: 7 }, message: 'boom' })).toBe('boom');
  });

  it('returns undefined when nothing usable exists', () => {
    expect(providerDetail({ error: '', message: 5 })).toBeUndefined();
    expect(providerDetail(null)).toBeUndefined();
  });
});

describe('docSchemaIssues detail formatting', () => {
  it('an issue with an empty path is reported against (root)', () => {
    const [issue] = docSchemaIssues({ issues: [{ path: [], message: 'Required' }] }, 'ctx');
    expect(issue).toEqual({ severity: 'error', rule: DOC_SCHEMA_RULE, detail: '(root): Required', context: 'ctx' });
  });

  it('an issue with a non-array path is reported against (root)', () => {
    const [issue] = docSchemaIssues({ issues: [{ path: 'specs', message: 'Bad' }] }, 'ctx');
    expect(issue.detail).toBe('(root): Bad');
  });

  it('an issue without a message says "invalid value" and keeps the dotted path', () => {
    const [issue] = docSchemaIssues({ issues: [{ path: ['specs', 'categories', 0] }] }, 'ctx');
    expect(issue.detail).toBe('specs.categories.0: invalid value');
  });
});

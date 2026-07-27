/**
 * validation-issues.spec.ts
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { dedupeIssues } from './validation-issues';
import type { ValidationIssue } from './output-validator';

const issue = (over: Partial<ValidationIssue> = {}): ValidationIssue => ({
  severity: 'warning',
  rule: 'some-rule',
  detail: 'some detail',
  context: 'HTML (base)',
  ...over,
});

describe('dedupeIssues', () => {
  it('collapses identical issues reported by two stages', () => {
    expect(dedupeIssues([issue(), issue()])).toHaveLength(1);
  });

  it('preserves order, keeping the first occurrence', () => {
    const first = issue({ detail: 'first' });
    const second = issue({ detail: 'second' });
    expect(dedupeIssues([first, second, first])).toEqual([first, second]);
  });

  /**
   * Several rules emit one issue per offending element with the offender quoted in `detail`.
   * Keying on rule+context alone would collapse genuinely distinct findings into one.
   */
  it('keeps issues that share a rule and context but differ in detail', () => {
    const a = issue({ rule: 'h2-nominal-heading', detail: 'The heading "ПЗ та автоматизація"…' });
    const b = issue({ rule: 'h2-nominal-heading', detail: 'The heading "Безпека під час роботи"…' });
    expect(dedupeIssues([a, b])).toHaveLength(2);
  });

  it('distinguishes the same finding in different artifacts', () => {
    const uk = issue({ context: 'HTML (base)' });
    const pl = issue({ context: 'HTML (Polish)' });
    expect(dedupeIssues([uk, pl])).toHaveLength(2);
  });

  it('distinguishes severity', () => {
    expect(dedupeIssues([issue({ severity: 'error' }), issue({ severity: 'warning' })])).toHaveLength(2);
  });

  it('is a no-op on an empty list', () => {
    expect(dedupeIssues([])).toEqual([]);
  });
});

/**
 * master-system-prompt.spec.ts
 *
 * Regression guard for the §7 COMPLETENESS Product Name exclusion clause — resolves the "does
 * Product Name count toward input row count" ambiguity flagged during the Ortur H20
 * spec-row-not-grounded investigation. Text-presence assertions only, against a
 * whitespace-normalized copy of the prompt so line-wrap/reformatting changes don't false-positive
 * this test; MASTER_SYSTEM_PROMPT is a static heredoc string, not independently invokable.
 */

import { describe, it, expect } from 'vitest';
import { MASTER_SYSTEM_PROMPT } from './master-system-prompt';

const normalized = MASTER_SYSTEM_PROMPT.replace(/\s+/g, ' ');

/**
 * §7 FLAT SOURCE rule — added after the Center 3D Print / Ortur H20 collapse (2026-07-26), where
 * a flat 15-row source spec list produced one catch-all category. The old COMPLETENESS wording
 * ("count categories & rows first, emit exactly that many") reads, for uncategorized input, as
 * "emit one category"; EXPERT3D grouped anyway, but that was model inference, not instruction.
 */
describe('MASTER_SYSTEM_PROMPT — §7 FLAT SOURCE: semantic grouping', () => {
  it('forbids a single catch-all category when the source supplies no categories', () => {
    expect(normalized).toMatch(/FLAT SOURCE \(no categories given\)/i);
    expect(normalized).toMatch(/do NOT emit a single catch-all category/i);
  });

  it('states the 3–6 category target with a minimum row count per category', () => {
    expect(normalized).toMatch(/Emit 3[–-]6 categories, each its own <h3> \+ table/i);
    expect(normalized).toMatch(/each holding at least 3 rows/i);
  });

  it('requires category names in the target output language, not the English exemplars', () => {
    expect(normalized).toMatch(/Write each category name in the TARGET OUTPUT LANGUAGE/i);
    expect(normalized).toMatch(/name the CONCEPT, they are never the literal label to emit/i);
  });

  it('scopes the rule to uncategorized input only, deferring to COMPLETENESS otherwise', () => {
    expect(normalized).toMatch(/applies ONLY when the input supplies no categories of its own/i);
  });

  it('forbids grouping from altering labels, values, units or the row count', () => {
    expect(normalized).toMatch(
      /never changes a row's label, value, unit, or the total row count/i);
  });
});

describe('MASTER_SYSTEM_PROMPT — §7 COMPLETENESS: Product Name row exclusion', () => {
  it('instructs excluding a Product Name/Title/Model row from the §7 count and output', () => {
    expect(normalized).toMatch(/EXCLUDE a Product Name \/ Title \/ Model-identifier row/i);
  });

  it('states the row belongs to the H1, not §7', () => {
    expect(normalized).toMatch(/belongs to the H1, never to §7/i);
  });

  it('states the count is unaffected when no such row exists in the input', () => {
    expect(normalized).toMatch(/nothing changes: every remaining row counts/i);
  });
});

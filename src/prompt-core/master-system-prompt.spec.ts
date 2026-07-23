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

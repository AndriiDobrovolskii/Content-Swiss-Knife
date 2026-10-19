/**
 * master-system-prompt.source-scope.spec.ts - US-9.1 FR-42 / FR-44 item 1 (task breakdown P1; owner task T43).
 *
 * The operator-notes feature was withdrawn (Story v5, 2026-10-19). The two `[SOURCE FIDELITY]` bullets of the master
 * system prompt, `STRICT INPUT SCOPE` and `INTERNAL RECONCILIATION`, must therefore name the three input blocks that
 * `task-a.ts` really emits and must not name an `[Operator Notes]` block no prompt carries (FR-42, PROPOSED DEFAULT of
 * OD-21 option (a): the pre-Story wording).
 *
 * The literals are written HERE, from the Specification (FR-42 Assert-present / Assert-absent), not copied from any run
 * of the code or from the golden. Comparison is case-sensitive over whitespace-collapsed text (Specification
 * "Assertion convention"), because the master wraps these sentences across source lines.
 *
 *   Assert present: `the provided [Raw Description], [Technical Specs] or [Supplemental Content]`,
 *                   `scan the three input blocks for numbers that describe the SAME quantity`.
 *   Assert absent:  `Operator Notes`, `operatorNotes`, `the input blocks you were given`.
 *
 * FROZEN file under test (`src/prompt-core/master-system-prompt.ts`): this spec only READS it. RED until T43 reverts the
 * two bullets (the owner's per-file "modify" instruction is requested by the builder). Distinct from the surviving
 * `master-system-prompt.liveliness.spec.ts` (which pins that `STRICT INPUT SCOPE` is still present).
 */
import { describe, it, expect } from 'vitest';
import { MASTER_SYSTEM_PROMPT } from './master-system-prompt';

const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();
const MASTER = collapse(MASTER_SYSTEM_PROMPT);

describe('FR-42 / FR-44 item 1: the master names the three input blocks that exist (Assert present)', () => {
  it.each([
    'the provided [Raw Description], [Technical Specs] or [Supplemental Content]',
    'scan the three input blocks for numbers that describe the SAME quantity',
  ])('MASTER_SYSTEM_PROMPT contains %j', literal => {
    expect(MASTER).toContain(literal);
  });
});

describe('FR-42 / FR-44 item 1: the master names no operator-notes block (Assert absent)', () => {
  it.each(['Operator Notes', 'operatorNotes', 'the input blocks you were given'])('MASTER_SYSTEM_PROMPT does not contain %j', literal => {
    expect(MASTER).not.toContain(literal);
  });

  it('the case-insensitive form does not occur either ("operator notes" in prose)', () => {
    expect(MASTER).not.toMatch(/operator[ _-]?notes?/i);
  });
});

/**
 * constants.numeric-source-rules.spec.ts - US-9.1 byte pin of `NUMERIC_SOURCE_FIDELITY_RULES` (task breakdown P11; plan W7, R11).
 *
 * RELOCATED UNCHANGED from the deleted `content-orchestrator.operator-notes.spec.ts` (task breakdown P0): the pin guards a text
 * that no requirement edits (FR-30 / OD-20(2) of the withdrawn feature never extended it, and FR-44 item 4.1 keeps it as is), and
 * no surviving spec pins it by bytes (`task-c.spec.ts` asserts presence only). It is NOT a test of the withdrawn feature, so NFR-14's
 * last sentence ("no test of a surviving requirement is touched, weakened or deleted") applies and the pin moves, it is not lost.
 *
 * The digest and the length are those of the text as it stood on the commit the Story branch was cut from (`6546db8`); the text is
 * not edited by any requirement of this Story. Green on arrival, stays green T45 to T49.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { NUMERIC_SOURCE_FIDELITY_RULES } from './constants';

/** NUMERIC_SOURCE_FIDELITY_RULES as it stood on the commit the Story branch was cut from (not edited by this Story). */
const PRE_STORY_NUMERIC_RULES_SHA256 = '4d18ed53c2c5507b69601ef782dd18ef3589c21e75db94760a794766f1a16190';
const PRE_STORY_NUMERIC_RULES_LENGTH = 1776;

describe('NUMERIC_SOURCE_FIDELITY_RULES is byte-unchanged from the branch base (relocated pin)', () => {
  it('does not mention operator notes', () => {
    expect(NUMERIC_SOURCE_FIDELITY_RULES).not.toContain('Operator');
    expect(NUMERIC_SOURCE_FIDELITY_RULES).not.toContain('operator notes');
  });

  it('has the sha256 digest and the length it had on the branch base', () => {
    const digest = createHash('sha256').update(NUMERIC_SOURCE_FIDELITY_RULES, 'utf8').digest('hex');
    expect(digest).toBe(PRE_STORY_NUMERIC_RULES_SHA256);
    expect(NUMERIC_SOURCE_FIDELITY_RULES.length).toBe(PRE_STORY_NUMERIC_RULES_LENGTH);
  });
});

/**
 * master-system-prompt.grounding-lock.spec.ts - US-9.1 T29 (FR-8, hunk M4; and the `shown here` half of FR-6):
 * the IMAGE GROUNDING LOCK restricts claims ABOUT THE IMAGE, not product facts.
 *
 * The lock currently suppresses the product facts the paragraph above a figure needs (it permits the
 * paragraph to "reference the image only descriptively (\"the head assembly shown here...\")"). FR-8 adds a
 * first bullet separating claims about the image from product facts, and changes the example to a plain
 * product-fact form.
 *
 * FROZEN file `src/prompt-core/master-system-prompt.ts`; no "modify" instruction exists (H-OD12).
 *
 * Specification FR-8 (confirmed normative, OD-13), collapsed whitespace:
 *   Assert present: `restricts claims ABOUT THE IMAGE`, `does not restrict product facts`.
 *   Assert absent:  `the lead-in may reference the image only descriptively` (the head of the old example) and
 *   `shown here` (also FR-6 / AC-2, asserted over the WHOLE master).
 * `IMAGE GROUNDING LOCK stands` is asserted by `constants.spec.ts` against `NUMERIC_SOURCE_FIDELITY_RULES`;
 * that constant is NOT changed by this requirement (the guard below keeps its text out of the master change).
 * The remaining lock bullets (lexical-only distinctness, COMPARISON, FILENAME-INFERRED) are kept.
 */
import { describe, it, expect } from 'vitest';
import { groundingLockBlock, MASTER } from '../../test/fixtures/us91-master';
import { NUMERIC_SOURCE_FIDELITY_RULES } from './constants';

describe('FR-8: the lock restricts claims about the image and not product facts (M4)', () => {
  it.each(['restricts claims ABOUT THE IMAGE', 'does not restrict product facts'])('the IMAGE GROUNDING LOCK block contains %j', literal => {
    expect(groundingLockBlock()).toContain(literal);
  });

  it('Assert absent: "the lead-in may reference the image only descriptively"', () => {
    expect(MASTER).not.toContain('the lead-in may reference the image only descriptively');
  });
});

describe('FR-6 / AC-2: "shown here" is gone from the whole master', () => {
  it('Assert absent: "shown here"', () => {
    expect(MASTER).not.toContain('shown here');
  });
});

describe('FR-8: the rest of the lock is kept (green on arrival, stays green)', () => {
  it.each(['DISTINCTNESS IS LEXICAL ONLY', 'FILENAME-INFERRED entries', 'A manifest caption tagged COMPARISON'])(
    'the lock still contains %j', literal => {
      expect(groundingLockBlock()).toContain(literal);
    },
  );

  it('"IMAGE GROUNDING LOCK stands" stays in NUMERIC_SOURCE_FIDELITY_RULES, which this requirement does not edit', () => {
    expect(NUMERIC_SOURCE_FIDELITY_RULES.replace(/\s+/g, ' ')).toContain('IMAGE GROUNDING LOCK stands');
  });
});

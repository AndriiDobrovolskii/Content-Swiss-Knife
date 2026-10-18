/**
 * master-system-prompt.operator-notes.spec.ts - US-9.1 T31 (FR-29, hunk M6, AC-9): `[SOURCE FIDELITY]` names the
 * operator notes as an allowed FACT source, and the "three input blocks" wording becomes neutral.
 *
 * Without this the model would refuse to use an operator-supplied fact (STRICT INPUT SCOPE lists only the three
 * original blocks), and "scan the three input blocks" would be false once a fourth block exists.
 *
 * FROZEN file `src/prompt-core/master-system-prompt.ts`; no "modify" instruction exists (H-OD12). T31 is also
 * GATED on T21 (the `task-a.ts` T-A4 item): the master must not name a block no task emits (plan-review N14);
 * the tests are written regardless and stay red until both exist.
 *
 * Specification FR-29, collapsed whitespace:
 *   1. STRICT INPUT SCOPE bullet - Assert present: `[Operator Notes]` inside that bullet, with the three
 *      existing names kept (`[Raw Description]`, `[Technical Specs]`, `[Supplemental Content]`); no other fact
 *      source is added.
 *   2. INTERNAL RECONCILIATION bullet - Assert absent (in the master): the literal `three input blocks`, and in
 *      that bullet any cardinal number or number word directly followed by `input blocks` / `input sources`
 *      (the expression `\b(?:\d+|one|two|three|four|five)\s+input\s+(?:blocks|sources)\b`). Assert present
 *      (kept): `INTERNAL RECONCILIATION (before writing): scan the` and `for numbers that describe the SAME
 *      quantity`. The reworded bullet refers to the input blocks without stating how many there are and covers
 *      the [Operator Notes] block when present. Prose beyond the literals is the builder's (H-OD13).
 *   OPEN NOTE (non-blocking; the OD-20 answer neither confirms nor changes it): whether other places in the
 *   `[SOURCE FIDELITY]` block count or enumerate input blocks. A search finds none, and the "no other
 *   count-of-blocks wording" test below keeps it that way. The category 9 / R22 reach tests (block 0 of Task C
 *   description translation and of the optimizer names `[Operator Notes]` while their `userContent` does not)
 *   are in `task-c.master-reach.spec.ts` and `optimizer.master-reach.spec.ts`.
 *
 * `NUMERIC_SOURCE_FIDELITY_RULES` is NOT edited (OD-20(2), decided): its text is pinned by
 * `content-orchestrator.operator-notes.spec.ts` and `task-c.spec.ts` line 20.
 */
import { describe, it, expect } from 'vitest';
import { sourceFidelityBullet, MASTER } from '../../test/fixtures/us91-master';

describe('FR-29 item 1: STRICT INPUT SCOPE names [Operator Notes] next to the three existing sources', () => {
  const bullet = () => sourceFidelityBullet('STRICT INPUT SCOPE');

  it('contains [Operator Notes]', () => {
    expect(bullet()).toContain('[Operator Notes]');
  });

  it.each(['[Raw Description]', '[Technical Specs]', '[Supplemental Content]'])('keeps the existing source name %s', name => {
    expect(bullet()).toContain(name);
  });

  it('keeps the rest of the rule (no figures, origin stories, comparisons or percentages the input does not state)', () => {
    expect(bullet()).toContain('Add nothing from outside knowledge of the brand or product line');
  });
});

describe('FR-29 item 2: INTERNAL RECONCILIATION no longer counts the input blocks', () => {
  const bullet = () => sourceFidelityBullet('INTERNAL RECONCILIATION');

  it('Assert absent (in the master): "three input blocks"', () => {
    expect(MASTER).not.toContain('three input blocks');
  });

  it('Assert absent (in the bullet): a number or number word directly followed by "input blocks" or "input sources"', () => {
    expect(bullet()).not.toMatch(/\b(?:\d+|one|two|three|four|five)\s+input\s+(?:blocks|sources)\b/);
  });

  it.each(['INTERNAL RECONCILIATION (before writing): scan the', 'for numbers that describe the SAME quantity'])(
    'Assert present (kept): %j', literal => {
      expect(bullet()).toContain(literal);
    },
  );

  it('covers the [Operator Notes] block when present', () => {
    expect(bullet()).toMatch(/\[Operator Notes\]|operator notes/i);
  });

  it('keeps the structural-evidence rules that follow (the rest of the bullet is not edited)', () => {
    expect(bullet()).toContain('using structural evidence ALREADY INSIDE the input');
    expect(bullet()).toContain('Never emit two different counts of the same thing in one document.');
  });
});

describe('FR-29 open note: no other count-of-blocks wording anywhere in the master (the same search the Specification ran)', () => {
  it.each(['three input', 'three blocks', 'both blocks', 'all three'])('the master does not contain %j', phrase => {
    expect(MASTER).not.toContain(phrase);
  });
});

describe('FR-29: no other fact source is added to STRICT INPUT SCOPE', () => {
  it('names exactly the four bracketed block names', () => {
    const names = sourceFidelityBullet('STRICT INPUT SCOPE').match(/\[[A-Z][A-Za-z ]+\]/g) ?? [];
    expect([...new Set(names)].sort()).toEqual(['[Operator Notes]', '[Raw Description]', '[Supplemental Content]', '[Technical Specs]']);
  });
});

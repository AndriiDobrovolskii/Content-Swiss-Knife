/**
 * task-a-doc.figure-placement.spec.ts - US-9.1 T17 (FR-10, AC-3) and the OD-19 (1b) Assert-absent pin.
 *
 * FR-10: the Doc pipeline's FIGURE PLACEMENT instruction no longer asks for a paragraph "that introduces what
 * the image shows". It asks that every figure Block be immediately preceded by a paragraph Block of the same
 * subsection that STATES A PRODUCT FACT from the source and NEVER REFERS TO THE PICTURE, that a figure moved out
 * of §2 carries that obligation, and that the same holds for the figure's caption and alt.
 *   Assert present (in `TASK_A_DOC_INSTRUCTION`, collapsed whitespace, case-sensitive): `no orphan images`
 *   (existing, pinned by `task-a-doc.v4.spec.ts`), `states a product fact from the source`, `never refers to
 *   the picture`, `The same holds for every figure's "caption" and "alt"`.
 *   Assert absent: `introduces what the image shows`, `place the lead-in paragraph beside it`.
 * The restated block is ILLUSTRATIVE (H-OD13: prose beyond the literals is the builder's).
 *
 * OD-19 (1b), decided by the owner on 2026-10-18 ("(1b) no"): the Doc instructions - `TASK_A_DOC_INSTRUCTION`
 * and the simplified Doc instructions - do NOT mention the `[Operator Notes]` block. The block was withdrawn with the
 * operator-notes feature (Story v5), and this absence-shaped assertion stays true. GREEN ON ARRIVAL, stays green. The former
 * stray-property-through-a-cast case was removed (task breakdown P0): FR-44 item 2 now covers the payloads in
 * `task-a.user-content.golden.spec.ts`.
 *
 * The simplified Doc templates ("a paragraph block that introduces it", `simplified-template-blocks.ts`) are
 * NOT part of this requirement (Q-SIMPL "no", decided 2026-10-18) and are not asserted either way here.
 */
import { describe, it, expect } from 'vitest';
import { TASK_A_DOC_INSTRUCTION } from './task-a-doc';
import { buildSimplifiedDocInstruction } from './simplified-template-blocks';
import { SIMPLIFIED_TEMPLATE_IDS } from '../prompt-core/simplified-templates';
import { collapse } from '../../test/fixtures/us91-constants';

const instruction = collapse(TASK_A_DOC_INSTRUCTION);

describe('FR-10: the Doc FIGURE PLACEMENT instruction asks for a fact paragraph that does not point at the picture (Assert present)', () => {
  it.each([
    'no orphan images',
    'states a product fact from the source',
    'never refers to the picture',
    'The same holds for every figure\'s "caption" and "alt"',
  ])('contains the literal %j', literal => {
    expect(instruction).toContain(literal);
  });
});

describe('FR-10: the old introducing-paragraph wording is gone (Assert absent)', () => {
  it.each(['introduces what the image shows', 'place the lead-in paragraph beside it'])('does not contain %j', literal => {
    expect(instruction).not.toContain(literal);
  });
});

describe('OD-19 (1b): the Doc instructions do not mention [Operator Notes] (green on arrival, stays green)', () => {
  it('TASK_A_DOC_INSTRUCTION does not', () => {
    expect(TASK_A_DOC_INSTRUCTION).not.toContain('[Operator Notes]');
    expect(TASK_A_DOC_INSTRUCTION).not.toContain('Operator Notes');
  });

  it.each([...SIMPLIFIED_TEMPLATE_IDS])('buildSimplifiedDocInstruction(%s) does not', id => {
    expect(buildSimplifiedDocInstruction(id)).not.toContain('Operator Notes');
  });

});

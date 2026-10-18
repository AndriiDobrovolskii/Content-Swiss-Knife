/**
 * master-system-prompt.video-placement.spec.ts - US-9.1 T28 (FR-9, hunk M3, AC-2/AC-3): `[VIDEO]` places the
 * embed after a body paragraph that states a product fact and never points at the video.
 *
 * FROZEN file `src/prompt-core/master-system-prompt.ts`; no "modify" instruction exists (H-OD12), so these tests
 * stay red until it does and the frozen file is never touched by this stage.
 *
 * Specification FR-9 (confirmed normative by the owner, OD-13, 2026-10-17), collapsed whitespace:
 *   Assert present: `Place every embed directly after a body paragraph of its sub-section`,
 *   `never points at the video`.
 *   Assert absent:  `Introduce every embed with a lead-in <p>`.
 *   Assert present (existing, kept; pinned by master-system-prompt.spec.ts): `place it in §3 FUNCTIONALITY`,
 *   `before §7 TECHNICAL SPECIFICATIONS`, `MANDATORY WHEN PRESENT`.
 * The earlier sentence in the master that describes the CONTRACT (`one lead-in <p> + one <iframe>`, the
 * `[OUTPUT CONTRACT]` header line) is NOT edited by this requirement. Prose around the literals is the builder's
 * (H-OD13). The consumers of the master that must stay green (the amended Task C guard, the FAQ-negative slices
 * of `faq-pipeline.ts`, the D15 oracle) are re-run by the builder; they are not duplicated here.
 */
import { describe, it, expect } from 'vitest';
import { videoBlock, MASTER } from '../../test/fixtures/us91-master';

describe('FR-9: [VIDEO] places the embed after a fact paragraph and never points at it (M3)', () => {
  it.each(['Place every embed directly after a body paragraph of its sub-section', 'never points at the video'])(
    'the [VIDEO] block contains the literal %j', literal => {
      expect(videoBlock()).toContain(literal);
    },
  );

  it('Assert absent: "Introduce every embed with a lead-in <p>"', () => {
    expect(MASTER).not.toContain('Introduce every embed with a lead-in <p>');
  });

  it.each(['place it in §3 FUNCTIONALITY', 'before §7 TECHNICAL SPECIFICATIONS', 'MANDATORY WHEN PRESENT'])(
    'the existing placement literal %j is kept in [VIDEO] (green on arrival, stays green)', literal => {
      expect(videoBlock()).toContain(literal);
    },
  );

  it('keeps "Emit exactly one copy per language version" (one embed per language version)', () => {
    expect(videoBlock()).toContain('Emit exactly one copy per language version');
  });

  it('the contract line "one lead-in <p> + one <iframe>" in [OUTPUT CONTRACT] is not edited by FR-9 (green on arrival)', () => {
    expect(MASTER).toContain('one lead-in <p> + one <iframe>');
  });
});

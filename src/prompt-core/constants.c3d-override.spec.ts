/**
 * constants.c3d-override.spec.ts - US-9.1 T18 (FR-12, AC-3): Center 3D Print OVERRIDE #5 compares the figcaption
 * opener with the PARAGRAPH ABOVE THE FIGURE, no longer with a "preceding lead-in <p>".
 *
 * The Specification fixes both literals (collapsed whitespace, case-sensitive):
 *   Assert absent:  `The lead-in must still differ from the alt text and from the preceding lead-in <p>`
 *   Assert present: `The opener must still differ from the alt text and from the paragraph above the figure`
 * Everything else in `C3D_TOV_BASE_OVERLAY` is untouched by this requirement; the existing C3D pins of
 * `constants.spec.ts` (lines 118-170) stay and are not edited. Prose beyond the literals is the builder's
 * (H-OD13, OVERRIDE #5 wording latitude).
 *
 * FR-23 item 1 / AC-8: `C3D_TOV_BASE_OVERLAY` is NOT given the APPLICATIONS or HEADINGS rules of FR-22 (its
 * OVERRIDE #1 and SIGNATURE MOVE #2 already cover them) and carries no liveliness text (those rules live in the
 * shared master block). Those absences are green on arrival and must stay green.
 */
import { describe, it, expect } from 'vitest';
import { C3D_TOV_BASE_OVERLAY } from './constants';
import { collapse } from '../../test/fixtures/us91-constants';

const overlay = collapse(C3D_TOV_BASE_OVERLAY);

describe('FR-12: C3D OVERRIDE #5 compares the opener with the paragraph above the figure', () => {
  it('Assert absent: the old lead-in comparison', () => {
    expect(overlay).not.toContain('The lead-in must still differ from the alt text and from the preceding lead-in <p>');
  });

  it('Assert present: the opener must still differ from the alt text and from the paragraph above the figure', () => {
    expect(overlay).toContain('The opener must still differ from the alt text and from the paragraph above the figure');
  });

  it('OVERRIDE #5 still replaces the "LEAD-IN LABEL" figcaption form with a verb-led opener (FR-12 changes one sentence only)', () => {
    expect(overlay).toContain('FIGCAPTION lead-in "<b>LEAD-IN LABEL:</b> description": REPLACED by a verb-led');
  });
});

describe('FR-23 item 1 / AC-8: the C3D overlay gains no FR-22 rule and no liveliness text (green on arrival, stays green)', () => {
  it.each(['states the mechanism that makes THIS product the right tool', 'functional headings'])('does not contain the FR-22 string %j', literal => {
    expect(overlay).not.toContain(literal);
  });

  it('does not carry the shared liveliness rules (SCENE, RHYTHM, HOOK live in the master only)', () => {
    expect(overlay).not.toContain('SCENE RULE');
    expect(overlay).not.toContain('a statement, not a question');
    expect(overlay).not.toContain('more than twice per document');
  });
});

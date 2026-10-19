/**
 * master-system-prompt.placement.spec.ts - US-9.1 T30 (FR-6, FR-7, hunk M5, AC-2): PLACEMENT uses "preceding
 * paragraph" and no longer teaches the pointing phrasing, while a narrative `<p>` stays required above every
 * figure.
 *
 * Today the PLACEMENT block says `LEAD-IN: precede every <figure> with a <p> - a SUBSTANTIVE NARRATIVE SENTENCE`,
 * suggests the template "The image below shows..." and the example "visible here", and tells the model to
 * "Give lead-in and figcaption separate jobs". FR-7 replaces those bullets so the paragraph above a figure is
 * ordinary body text stating a product fact, written as if the image did not exist; the figcaption carries the
 * link to the picture.
 *
 * FROZEN file `src/prompt-core/master-system-prompt.ts`; no "modify" instruction exists (H-OD12).
 *
 * Specification (confirmed normative, OD-13), collapsed whitespace:
 *   FR-7 Assert present (in the master): `PRECEDING PARAGRAPH`, `reads as if the image did not exist`, `the
 *   figcaption carries the link to the picture`, `see [NO PICTURE REFERENCES]`, `Give the paragraph and the
 *   figcaption separate jobs`.
 *   FR-7 Assert absent: `LEAD-IN: precede every <figure>`, `visible here`, `Give lead-in and figcaption
 *   separate jobs`, `The image below shows`.
 *   FR-6 Assert absent: `SUBSTANTIVE NARRATIVE SENTENCE`, `The image below shows` (and `shown here`, owned by T29).
 *   FR-6 Assert present: `every <figure> in the document therefore has a narrative <p> directly above it` (the
 *   existing SPACING sentence, kept).
 * The replaced bullets are in the PLACEMENT part, AFTER `FIGURE FORMAT`, hence outside the span that
 * `master-system-prompt.image-markers.spec.ts` pins; that spec, `image-figure-style.prompt-examples.spec.ts`
 * (which pins `FIGURE FORMAT - wrap every image` and `short scannable description of what the image shows`,
 * unedited per FR-21) and the amended Task C guard stay green.
 */
import { describe, it, expect } from 'vitest';
import { placementBlock, MASTER } from '../../test/fixtures/us91-master';

describe('FR-7: PLACEMENT defines the paragraph above a figure as a fact paragraph (Assert present)', () => {
  it.each([
    'PRECEDING PARAGRAPH',
    'reads as if the image did not exist',
    'the figcaption carries the link to the picture',
    'see [NO PICTURE REFERENCES]',
    'Give the paragraph and the figcaption separate jobs',
  ])('the PLACEMENT block contains the literal %j', literal => {
    expect(placementBlock()).toContain(literal);
  });
});

describe('FR-6 / FR-7: the pointing phrasing is gone (Assert absent)', () => {
  it.each([
    'LEAD-IN: precede every <figure>',
    'visible here',
    'Give lead-in and figcaption separate jobs',
    'The image below shows',
    'SUBSTANTIVE NARRATIVE SENTENCE',
  ])('the master does not contain %j', literal => {
    expect(MASTER).not.toContain(literal);
  });
});

describe('FR-6: a narrative <p> is still required directly above every figure (green on arrival, stays green)', () => {
  it('keeps the SPACING sentence', () => {
    expect(placementBlock()).toContain('every <figure> in the document therefore has a narrative <p> directly above it');
  });

  it('keeps the other PLACEMENT rules: SPACING and SECTION ANCHORS', () => {
    expect(placementBlock()).toContain('SPACING: separate every pair of <figure> blocks with');
    expect(placementBlock()).toContain('SECTION ANCHORS');
  });
});

describe('FR-21 (T30): FIGURE FORMAT is untouched - pinned by image-figure-style.prompt-examples.spec.ts (green on arrival, stays green)', () => {
  it.each(['FIGURE FORMAT — wrap every image in a <figure> with a <figcaption>', 'short scannable description of what the image shows'])(
    'the master still contains %j', literal => {
      expect(MASTER).toContain(literal);
    },
  );
});

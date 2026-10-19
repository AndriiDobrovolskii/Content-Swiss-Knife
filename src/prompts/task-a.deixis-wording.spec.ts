/**
 * task-a.deixis-wording.spec.ts - US-9.1 FR-11 (AC-3): `task-a.ts` stops asking for an introducing lead-in.
 * FROZEN file `src/prompts/task-a.ts`; three independent items, one `describe` per OWNER TASK (task breakdown
 * constraint 2) so no describe stays red for a reason a later task owns:
 *   - T24 (T-A1) `TASK_A_INSTRUCTION`, a cached SYSTEM block: the clause `an image still needs its own lead-in
 *     <p>` becomes a requirement that a figure needs a body `<p>` directly above it that never refers to the
 *     picture. Observed as `buildPromptA(...).systemBlocks[1].text` (the constant is private).
 *   - T22 (T-A2) `buildVideoBlock`, a USERCONTENT text present only when the description has a video embed. The
 *     old span is replaced by the new, pointer-free span (the new sentence is VERBATIM from FR-11 item 2, which
 *     the Specification composed to satisfy the owner's HUMAN_SPEC_APPROVAL instruction).
 *   - T23 (T-A3) `buildMarkerBlock`, a USERCONTENT text present only when a marker is matched. The OLD span must
 *     be gone.
 * The byte-level "nothing else moved" guarantee for the two userContent spans is in
 * `task-a.user-content.golden.spec.ts` (FR-27 Tier B); this file pins the wording.
 *
 * H-FR11I3 ANSWERED (owner: "accept the proposed default marker block wording exactly as written", Specification v5
 * FR-11 item 3): the NEW marker span is VERBATIM and normative, asserted below next to the absence of the old span and
 * the preservation of the surrounding marker rules.
 *
 * Gated on H-OD12: no "modify src/prompts/task-a.ts" instruction exists; these tests stay red until it does,
 * and the frozen file is never touched by this stage. If an item is refused the specs written for it stay red
 * and are reconciled by a TEST_WRITING loop-back after the human's scope decision (breakdown, Reading guide 8).
 */
import { describe, it, expect } from 'vitest';
import { buildCase } from '../../test/fixtures/task-a-user-content-inputs';
import { collapse } from '../../test/fixtures/us91-constants';

const systemBlock1 = collapse(buildCase('es/full/plain').systemBlocks[1].text);

// ── T24 (task-a.ts T-A1): TASK_A_INSTRUCTION ──────────────────────────────────────────────────────────

describe('FR-11 item 1 (T24, T-A1): TASK_A_INSTRUCTION - a figure needs a body <p> above it that never refers to the picture', () => {
  it('Assert present: "a figure needs a body <p> directly above it, and that <p> never refers to the picture"', () => {
    expect(systemBlock1).toContain('a figure needs a body <p> directly above it, and that <p> never refers to the picture');
  });

  it('Assert absent: "an image still needs its own lead-in <p>"', () => {
    expect(systemBlock1).not.toContain('an image still needs its own lead-in <p>');
  });

  it('Assert present (preserved; AC-3 requires it and no existing spec asserts it by name): "Do not place a <figure> directly after a </ul>"', () => {
    expect(systemBlock1).toContain('Do not place a <figure> directly after a </ul>');
  });

  it('the consistency instructions FR-11 says are NOT pointing wording are untouched (green on arrival, stays green)', () => {
    expect(systemBlock1).toContain("keep every image's alt, figcaption and lead-in consistent with its manifest caption");
    expect(systemBlock1).toContain('LISTS OVER RUN-ON SENTENCES');
  });

  it('the change stays in the cached system block: the instruction is the same for every store (NFR-1)', () => {
    const texts = ['ua', 'eu', 'es', 'us'].map(g => buildCase(`${g}/full/plain`).systemBlocks[1].text);
    expect(new Set(texts).size).toBe(1);
  });
});

// ── T22 (task-a.ts T-A2): buildVideoBlock ─────────────────────────────────────────────────────────────

const VIDEO_OLD =
  'Introduce each with its own lead-in <p> in the body language, and place it in §3 FUNCTIONALITY, before §7. The lead-in must not restate the figcaption.';
const VIDEO_NEW =
  'Place each directly after a body paragraph of its sub-section, written in the body language, that states a product fact and does not refer to the video, and place it in §3 FUNCTIONALITY, before §7. That paragraph must not restate the figcaption.';

describe.each(['es/video/one-embed', 'es/video/two-embeds+manifest', 'eu/video/custom', 'us/video/legacy'])(
  'FR-11 item 2 (T22, T-A2): buildVideoBlock - %s', name => {
    const content = () => buildCase(name).userContent;

    it('Assert present: the new span, VERBATIM', () => {
      expect(content()).toContain(VIDEO_NEW);
    });

    it('Assert absent: the old span (both of its sentences)', () => {
      expect(content()).not.toContain(VIDEO_OLD);
      expect(content()).not.toContain('Introduce each with its own lead-in <p>');
      expect(content()).not.toContain('The lead-in must not restate the figcaption.');
    });

    it('Assert present (pinned today by task-a.spec.ts): "§3 FUNCTIONALITY, before §7" is intact', () => {
      expect(content()).toContain('§3 FUNCTIONALITY, before §7');
    });

    it('"written in the body language" is attached to the paragraph, not to a lead-in instruction', () => {
      expect(content()).toContain('a body paragraph of its sub-section, written in the body language');
    });

    it('the replaced sentences contain no pointer word: no "below", «нижче» or "нижче" inside the new span', () => {
      expect(VIDEO_NEW).not.toMatch(/below|нижче/i); // the literal itself is pointer-free
      const at = content().indexOf('Place each directly after a body paragraph of its sub-section');
      expect(at, 'the new span is missing').toBeGreaterThanOrEqual(0);
      const span = content().slice(at, at + VIDEO_NEW.length);
      expect(span).toBe(VIDEO_NEW);
      expect(span).not.toMatch(/below|нижче/i);
    });

    it('the rest of the block keeps its two references to the manifest list (they point at manifest lines, not at the video)', () => {
      expect(content()).toContain('every src below appears exactly once');
      expect(content()).toContain('the "source title" below');
    });
  },
);

// ── T23 (task-a.ts T-A3): buildMarkerBlock ────────────────────────────────────────────────────────────

describe.each(['es/marker/one', 'us/marker/legacy'])('FR-11 item 3 (T23, T-A3): buildMarkerBlock - %s', name => {
  const content = () => buildCase(name).userContent;

  it('Assert present: the new span VERBATIM, exactly once', () => {
    const span = 'at the end of the paragraph that states the product fact the image belongs to (the paragraph never mentions the picture);';
    expect(content()).toContain(span);
    expect(content().split(span).length - 1).toBe(1);
  });

  it('Assert absent: the old span "at the end of the sentence that introduces what the image shows;"', () => {
    expect(content()).not.toContain('at the end of the sentence that introduces what the image shows;');
  });

  it('the marker block and its other rules are still there (FR-11: nothing else in the block changes)', () => {
    expect(content()).toContain('[IMAGE MARKERS] — COUNT=1.');
    expect(content()).toContain('Copy every marker CHARACTER FOR CHARACTER');
    expect(content()).toContain('Each marker appears EXACTLY ONCE in the output.');
    expect(content()).toContain('never in a heading, list item, bullet, table cell, §2, §7, an attribute or a meta field');
  });
});

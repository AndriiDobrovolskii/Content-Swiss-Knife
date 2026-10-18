/**
 * output-validator.image-manifest-wording.spec.ts - US-9.1 T25 (FR-13 image half, AC-3): the
 * `image-manifest-missing` repair message asks for a body paragraph that states a product fact, no longer for
 * "a substantive lead-in <p>".
 *
 * The repair cycle feeds this `detail` back to the model; with the old wording it would re-introduce the
 * pointing phrasing the Story removes elsewhere (source analysis S6). FROZEN file `src/utils/output-validator.ts`
 * (hunk O1: one string); the exact approval-request text is in the task breakdown, T25. No "modify" instruction
 * exists yet (H-OD12): these tests stay red until it does, and nothing here touches the frozen file.
 *
 * Specification FR-13 (collapsed whitespace, case-sensitive):
 *   Assert absent:  `a substantive lead-in <p> directly above it`
 *   Assert present: `a body <p> directly above it (a product fact that does not point at the picture)`;
 *   the filename-verbatim and never-adjacent-to-another-`<figure>` clauses are KEPT.
 * Rule id, severity ('error'), context and the structure of the message are unchanged; the repair-gate specs
 * (`repair-gate.spec.ts`) stay green and unedited. Wording beyond the literals is the builder's (H-OD13).
 */
import { describe, it, expect } from 'vitest';
import { validateGeneratedHtml } from './output-validator';
import { collapse } from '../../test/fixtures/us91-constants';

const MANIFEST = [{ urlFilename: 'a.jpg' }, { urlFilename: 'b.jpg' }];
const HTML_MISSING_B =
  '<p>Опис продукту.</p><figure><img src="https://cdn.example/x/y/a.jpg" alt="alt" decoding="async"><figcaption>c</figcaption></figure>';

const missing = () => {
  const issues = validateGeneratedHtml(HTML_MISSING_B, 'HTML (uk-UA)', undefined, 'uk-UA', { imageManifest: MANIFEST });
  return issues.filter(i => i.rule === 'image-manifest-missing');
};

describe('FR-13 (image half): the image-manifest-missing detail asks for a fact paragraph', () => {
  it('still raises exactly one error for the absent manifest image, naming the file and the context', () => {
    expect(missing()).toHaveLength(1);
    expect(missing()[0].severity).toBe('error');
    expect(missing()[0].context).toBe('HTML (uk-UA)');
    expect(missing()[0].detail).toContain('"b.jpg"');
  });

  it('Assert absent: "a substantive lead-in <p> directly above it"', () => {
    expect(collapse(missing()[0].detail)).not.toContain('a substantive lead-in <p> directly above it');
  });

  it('Assert present: "a body <p> directly above it (a product fact that does not point at the picture)"', () => {
    expect(collapse(missing()[0].detail)).toContain('a body <p> directly above it (a product fact that does not point at the picture)');
  });

  it('keeps the "never adjacent to another <figure>" and "filename verbatim" clauses', () => {
    expect(collapse(missing()[0].detail)).toContain('never adjacent to another <figure>');
    expect(collapse(missing()[0].detail)).toContain('filename verbatim');
  });

  it('keeps pointing the model at [IMAGE HANDLING] for the figure format', () => {
    expect(collapse(missing()[0].detail)).toContain('Insert its <figure> per [IMAGE HANDLING]');
  });

  it('the sibling rules image-manifest-duplicate and image-unknown-src are not part of this change (guards)', () => {
    const dup = `<p>t</p>${HTML_MISSING_B}<p>t</p>${HTML_MISSING_B}`;
    const issues = validateGeneratedHtml(dup, 'ctx', undefined, 'uk-UA', { imageManifest: MANIFEST });
    expect(issues.find(i => i.rule === 'image-manifest-duplicate')?.detail).toContain('appears 2 times');
    expect(collapse(issues.find(i => i.rule === 'image-manifest-duplicate')!.detail)).not.toContain('a body <p>');
  });
});

/**
 * image-figure-style.prompt-examples.spec.ts - US-5.1 T11: the two example figures in the FROZEN
 * master system prompt carry the FR-14 layout (FR-22 consequence 2, AC-9 (l), (m)).
 *
 * This is a SEPARATE file from `image-figure-style.spec.ts` on purpose (task breakdown v8, T8 note and
 * T11): the three production surfaces are turned green by T8, the two master-prompt example lines only
 * by T11, which is the one task allowed to edit that FROZEN file. Putting both in one file would leave
 * a red case in T8's commit.
 *
 * Written BEFORE the example lines change, from Specification FR-22 consequence 2 and H-8 item 4:
 * the two `<figure style="...">` example lines move from `width: fit-content` to `width: max-content`
 * and nothing else about the example block changes. The expected layout is written out as literals from
 * the Specification, so the failure while the prompt is unchanged is a wrong value, not a missing import.
 */
import { describe, it, expect } from 'vitest';
import { MASTER_SYSTEM_PROMPT } from '../prompt-core/master-system-prompt';

const FIGURE = 'display: block; width: max-content; max-width: 100%; margin: 4px auto;';
const IMG = 'max-width: 100%; height: auto; display: block;';
const FIGCAPTION = 'text-align: left;';

/** The heading LINE of the example block (the words FIGURE FORMAT are also mentioned earlier in the prompt). */
const START = MASTER_SYSTEM_PROMPT.indexOf('FIGURE FORMAT — wrap every image');
/** The FIGURE FORMAT block: from its heading line to the end of the second example figure. */
const BLOCK = MASTER_SYSTEM_PROMPT.slice(START, MASTER_SYSTEM_PROMPT.indexOf('</figure>', MASTER_SYSTEM_PROMPT.indexOf('</figure>', START) + 1) + '</figure>'.length);
const FIGURE_LINES = BLOCK.split('\n').filter(l => l.trim().startsWith('<figure'));

describe('master prompt example figures - FR-22 consequence 2, AC-9 (l)', () => {
  it('has the FIGURE FORMAT block with two example figures (Image #1 eager, Images #2+ lazy)', () => {
    expect(START).toBeGreaterThanOrEqual(0);
    expect(FIGURE_LINES).toHaveLength(2);
    expect(BLOCK).toContain('Image #1 (LCP');
    expect(BLOCK).toContain('Images #2+ (lazy)');
  });

  it.each([0, 1])('example figure %i carries exactly the FR-14 figure style (max-content)', i => {
    expect(FIGURE_LINES[i].trim()).toBe(`<figure style="${FIGURE}">`);
  });

  it('keeps the example <img> style and the left-aligned example figcaption', () => {
    const imgLines = BLOCK.split('\n').filter(l => l.trim().startsWith('<img'));
    expect(imgLines).toHaveLength(2);
    imgLines.forEach(l => expect(l).toContain(`style="${IMG}"`));
    const captionLines = BLOCK.split('\n').filter(l => l.trim().startsWith('<figcaption'));
    expect(captionLines).toHaveLength(2);
    captionLines.forEach(l => expect(l).toContain(`<figcaption style="${FIGCAPTION}">`));
  });

  it('keeps the first example eager (no loading attribute) and the second lazy, decoding="async" on both', () => {
    const imgLines = BLOCK.split('\n').filter(l => l.trim().startsWith('<img'));
    expect(imgLines[0]).not.toContain('loading=');
    expect(imgLines[1]).toContain('loading="lazy"');
    imgLines.forEach(l => expect(l).toContain('decoding="async"'));
  });

  it('no longer teaches the former fit-content width anywhere in the master prompt', () => {
    expect(MASTER_SYSTEM_PROMPT).not.toContain('fit-content');
  });
});

describe('master prompt example block - AC-9 (m): only the two figure-style lines moved', () => {
  /**
   * The whole example block as it stood before US-5.1, with the two `<figure style>` lines carrying the new
   * width. Written from the Specification (FR-22: "the figure style with max-content; the figcaption
   * carrying style text-align: left"), not copied from a run: the only difference from the pre-Story
   * block is the token on those two lines.
   */
  const EXPECTED_BLOCK = [
    'FIGURE FORMAT — wrap every image in a <figure> with a <figcaption>:',
    '  Image #1 (LCP — eager):',
    `    <figure style="${FIGURE}">`,
    `      <img src="URL" alt="ALT" decoding="async" style="${IMG}">`,
    `      <figcaption style="${FIGCAPTION}"><b>LEAD-IN LABEL:</b> short scannable description of what the image shows</figcaption>`,
    '    </figure>',
    '  Images #2+ (lazy):',
    `    <figure style="${FIGURE}">`,
    `      <img src="URL" alt="ALT" loading="lazy" decoding="async" style="${IMG}">`,
    `      <figcaption style="${FIGCAPTION}"><b>LEAD-IN LABEL:</b> short scannable description of what the image shows</figcaption>`,
    '    </figure>',
  ].join('\n');

  it('the example block equals the pre-Story block with the two figure-style lines on max-content', () => {
    expect(BLOCK.replace(/\r\n/g, '\n')).toBe(EXPECTED_BLOCK);
  });
});

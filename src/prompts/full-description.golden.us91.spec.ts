/**
 * full-description.golden.us91.spec.ts - US-9.1 NFR-9 / plan D11: the "regenerated" pins for
 * `test/fixtures/golden/full-description-prompts.json`.
 *
 * The whole-payload goldens of `full-description.golden.spec.ts` fail BY DESIGN once the prompts change
 * (`systemBlocks` change by design: FR-5 to FR-9, FR-10, FR-11 item 1, FR-12, FR-20, FR-22, FR-29). The builder
 * regenerates the JSON in the SAME commit as each change, with a reviewed diff limited to the changed text and
 * NEVER with `-u` (US-7.1 precedent: an unmodified `full-description.golden.spec.ts` plus these pins). These
 * assertions make "regenerated" observable: a golden that still holds the pre-Story text fails here even if the
 * builder was reverted, and a regeneration that moved the wrong case is visible in the "does not move" group.
 *
 * This file READS the JSON; it never writes it. One `describe` per OWNER task (breakdown constraint 2), so each
 * stays red only until its own task regenerates the golden:
 *   T17 doc/* block 1 (FR-10) - T18 the c3d overlay block (FR-12) - T19 the expert3d overlay block (FR-22) - T22 the three
 *   EXPERT3D video cases' userContent (FR-11 item 2) - T24 html/* block 1 (FR-11 item 1) - T27..T32 block 0 of
 *   the 10 master-embedding cases (doc/*, html/*, c/*) - and the cases that must NOT move.
 * Only Specification literals are asserted (wording latitude beyond them is the builder's, H-OD13). The FROZEN
 * tasks (T22, T24, T27..T32) are gated on H-OD12; red until then. T31 is also gated on T21.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PromptPayload } from '../prompt-core/payload';

const GOLDEN: Record<string, PromptPayload> = JSON.parse(
  readFileSync(join(process.cwd(), 'test', 'fixtures', 'golden', 'full-description-prompts.json'), 'utf8'),
);
const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
const names = (re: RegExp) => Object.keys(GOLDEN).filter(n => re.test(n));
const block = (name: string, i: number) => collapse(GOLDEN[name].systemBlocks[i]?.text ?? '');
const overlayOf = (name: string) => collapse(GOLDEN[name].systemBlocks.slice(2).map(b => b.text).join('\n'));
const user = (name: string) => collapse(GOLDEN[name].userContent);

const MASTER_CASES = names(/^(doc|html|c)\//);
const TRANSLATE_CASES = names(/^translate\//);

describe('premise: the golden holds the cases this spec addresses', () => {
  it('10 master-embedding cases and 2 translate cases', () => {
    expect(MASTER_CASES).toHaveLength(10);
    expect(TRANSLATE_CASES).toHaveLength(2);
    expect(names(/^doc\//)).toHaveLength(3);
    expect(names(/^html\//)).toHaveLength(4);
    expect(names(/^c\//)).toHaveLength(3);
  });
});

describe('T17 (FR-10): doc/* block 1 carries the fact-paragraph FIGURE PLACEMENT and not the introducing wording', () => {
  it.each(names(/^doc\//))('%s', name => {
    expect(block(name, 1)).toContain('states a product fact from the source');
    expect(block(name, 1)).toContain('never refers to the picture');
    expect(block(name, 1)).not.toContain('introduces what the image shows');
    expect(block(name, 1)).toContain('no orphan images');
  });
});

describe('T18 (FR-12): the Center 3D Print overlay block compares the opener with the paragraph above the figure', () => {
  it.each(names(/c3d/))('%s', name => {
    expect(overlayOf(name)).toContain('The opener must still differ from the alt text and from the paragraph above the figure');
    expect(overlayOf(name)).not.toContain('The lead-in must still differ from the alt text and from the preceding lead-in <p>');
  });
});

describe('T19 (FR-22): the EXPERT3D overlay block carries APPLICATIONS and HEADINGS and the amended line', () => {
  it.each(names(/expert3d/).filter(n => !n.startsWith('c/')))('%s', name => {
    for (const literal of ['states the mechanism that makes THIS product the right tool', 'functional headings', 'only for §3 <h2>', '<h3> stay nominal', 'at most one colon or dash per heading']) {
      expect(overlayOf(name), literal).toContain(literal);
    }
    expect(overlayOf(name)).not.toContain("Keep the schema's mandated section order and headings");
  });
});

describe('T22 (FR-11 item 2): the userContent of the EXPERT3D video cases carries the new video span only', () => {
  const OLD = 'Introduce each with its own lead-in <p> in the body language, and place it in §3 FUNCTIONALITY, before §7. The lead-in must not restate the figcaption.';
  const NEW = 'Place each directly after a body paragraph of its sub-section, written in the body language, that states a product fact and does not refer to the video, and place it in §3 FUNCTIONALITY, before §7. That paragraph must not restate the figcaption.';
  const VIDEO_CASES = names(/expert3d/).filter(n => !n.startsWith('c/') && user(n).includes('[VIDEO MANIFEST]'));

  it('premise: exactly three EXPERT3D cases carry a video manifest', () => {
    expect(VIDEO_CASES).toHaveLength(3);
  });

  it.each(VIDEO_CASES)('%s', name => {
    expect(user(name)).toContain(NEW);
    expect(user(name)).not.toContain(OLD);
  });

  it('the cases without a video manifest are untouched by the span (no stray copy of the new sentence)', () => {
    for (const name of MASTER_CASES.filter(n => !VIDEO_CASES.includes(n))) expect(user(name), name).not.toContain(NEW);
  });
});

describe('T24 (FR-11 item 1): html/* block 1 (TASK_A_INSTRUCTION) carries the new figure clause', () => {
  it.each(names(/^html\//))('%s', name => {
    expect(block(name, 1)).toContain('a figure needs a body <p> directly above it, and that <p> never refers to the picture');
    expect(block(name, 1)).not.toContain('an image still needs its own lead-in <p>');
    expect(block(name, 1)).toContain('Do not place a <figure> directly after a </ul>');
  });
});

describe('T27 to T32: block 0 of every master-embedding case carries the new master text', () => {
  it.each(MASTER_CASES)('%s (T27) [NO PICTURE REFERENCES', name => { expect(block(name, 0)).toContain('[NO PICTURE REFERENCES'); });
  it.each(MASTER_CASES)('%s (T28) [VIDEO] placement', name => {
    expect(block(name, 0)).toContain('Place every embed directly after a body paragraph of its sub-section');
    expect(block(name, 0)).not.toContain('Introduce every embed with a lead-in <p>');
  });
  it.each(MASTER_CASES)('%s (T29) grounding lock', name => {
    expect(block(name, 0)).toContain('restricts claims ABOUT THE IMAGE');
    expect(block(name, 0)).not.toContain('shown here');
  });
  it.each(MASTER_CASES)('%s (T30) placement', name => {
    expect(block(name, 0)).toContain('PRECEDING PARAGRAPH');
    expect(block(name, 0)).not.toContain('SUBSTANTIVE NARRATIVE SENTENCE');
    expect(block(name, 0)).not.toContain('The image below shows');
  });
  it.each(MASTER_CASES)('%s (T31, gated on T21) source scope', name => {
    expect(block(name, 0)).toContain('[Operator Notes]');
    expect(block(name, 0)).not.toContain('three input blocks');
  });
  it.each(MASTER_CASES)('%s (T32) liveliness and the self-scoping sentence', name => {
    for (const literal of ['govern writing a new description', 'when the task is to translate an existing text they do not apply', "the source's sentences and their order are kept"]) {
      expect(block(name, 0), literal).toContain(literal);
    }
  });
});

describe('FR-23 / NFR-9: what must NOT move in the regenerated golden (green on arrival, stays green)', () => {
  it.each(TRANSLATE_CASES)('%s carries none of the new master text (buildTranslatePrompt has no master)', name => {
    const all = collapse(GOLDEN[name].systemBlocks.map(b => b.text).join('\n') + GOLDEN[name].userContent);
    for (const literal of ['[NO PICTURE REFERENCES', 'PRECEDING PARAGRAPH', 'govern writing a new description', '[Operator Notes]']) {
      expect(all.includes(literal), `${name}: ${literal}`).toBe(false);
    }
  });

  it.each(names(/^c\//))('%s: block 1 and userContent (the Task C instruction) carry none of the Task A / master hunks', name => {
    const rest = collapse(`${block(name, 1)} ${user(name)}`);
    for (const literal of ['[NO PICTURE REFERENCES', 'a figure needs a body <p>', 'states a product fact from the source', 'PRECEDING PARAGRAPH', 'govern writing a new description']) {
      expect(rest.includes(literal), `${name}: ${literal}`).toBe(false);
    }
  });
});

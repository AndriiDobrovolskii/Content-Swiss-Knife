/**
 * master-system-prompt.no-picture-references.spec.ts - US-9.1 T27 (FR-5, hunks M1 + M2, AC-2 first part).
 *
 * FROZEN file `src/prompt-core/master-system-prompt.ts`: hunk M1 adds `NO_IMAGE_DEIXIS_RULE` to the existing
 * `./constants` import, hunk M2 interpolates it as a block of its own OUTSIDE `[IMAGE HANDLING]`. The master is
 * `systemBlocks[0]` of Task A for every store, and also of the Task C description translation and of the
 * optimizer (those reach pins are in `task-c.master-reach.spec.ts` and `optimizer.master-reach.spec.ts`).
 * No per-file "modify" instruction exists (H-OD12): these tests are red until it does, the frozen file is never
 * touched by this stage, and if the hunk is refused the tests stay red until the human's scope decision
 * (breakdown, Reading guide 8).
 *
 * FR-5: the master contains a block whose heading begins `[NO PICTURE REFERENCES`, defined as a constant and
 * interpolated OUTSIDE the `[IMAGE HANDLING]` block. The existing `master-system-prompt.image-markers.spec.ts`
 * (which forbids `${...}` inside that block and pins its lines up to `FIGURE FORMAT`) must pass UNMODIFIED, and
 * the `[NO PICTURE REFERENCES` heading must not sit between the `[IMAGE HANDLING]` heading and the end of that
 * block as that spec delimits it (`START = indexOf('\n[IMAGE HANDLING]\n')`, `END = indexOf('\nFIGURE FORMAT')`).
 *
 * NFR-1: the constant is static, so the cached prefix stays byte-identical across every store.
 */
import { describe, it, expect } from 'vitest';
import { MASTER_SYSTEM_PROMPT } from './master-system-prompt';
import { STORE_REGISTRY } from './constants';
import { buildPromptA } from '../prompts/task-a';
import { noImageDeixisRule, collapse } from '../../test/fixtures/us91-constants';

const HEADING = '\n[IMAGE HANDLING]\n';
const START = MASTER_SYSTEM_PROMPT.indexOf(HEADING) + 1;
const END = MASTER_SYSTEM_PROMPT.indexOf('\nFIGURE FORMAT', START);

describe('FR-5: the master carries the [NO PICTURE REFERENCES block (M1 + M2)', () => {
  it('MASTER_SYSTEM_PROMPT contains a block whose heading begins "[NO PICTURE REFERENCES"', () => {
    expect(MASTER_SYSTEM_PROMPT).toContain('[NO PICTURE REFERENCES');
  });

  it('the constant\'s whole text occurs in MASTER_SYSTEM_PROMPT (interpolated, not paraphrased), once', () => {
    const rule = collapse(noImageDeixisRule());
    const master = collapse(MASTER_SYSTEM_PROMPT);
    expect(master).toContain(rule);
    expect(master.split(rule).length - 1).toBe(1);
  });

  it('within the block: the words "figcaption" and "alt" and the phrases «на зображенні», «на фото», «нижче», "deleted, not reworded"', () => {
    const rule = collapse(noImageDeixisRule());
    const at = collapse(MASTER_SYSTEM_PROMPT).indexOf(rule);
    const block = collapse(MASTER_SYSTEM_PROMPT).slice(at, at + rule.length);
    expect(block).toContain('figcaption');
    expect(block).toMatch(/\balt\b/);
    for (const phrase of ['«на зображенні»', '«на фото»', '«нижче»', 'deleted, not reworded']) expect(block).toContain(phrase);
  });
});

describe('FR-5: the block sits OUTSIDE [IMAGE HANDLING] (the image-markers span stays untouched)', () => {
  it('the [IMAGE HANDLING] heading and the FIGURE FORMAT line are still locatable', () => {
    expect(START).toBeGreaterThanOrEqual(1);
    expect(END).toBeGreaterThan(START);
  });

  it('the heading "[NO PICTURE REFERENCES" is not located between the [IMAGE HANDLING] heading and FIGURE FORMAT', () => {
    const at = MASTER_SYSTEM_PROMPT.indexOf('[NO PICTURE REFERENCES');
    expect(at, 'the block is absent').toBeGreaterThanOrEqual(0);
    expect(at < START || at >= END, `heading at ${at} is inside the [IMAGE HANDLING] span ${START}..${END}`).toBe(true);
    expect(MASTER_SYSTEM_PROMPT.indexOf('[NO PICTURE REFERENCES', at + 1), 'the heading occurs twice').toBe(-1);
  });

  it('no part of the constant\'s text lies inside the [IMAGE HANDLING] span', () => {
    const span = MASTER_SYSTEM_PROMPT.slice(START, END);
    expect(span).not.toContain('NO PICTURE REFERENCES');
    expect(span).not.toContain('deleted, not reworded');
  });

  it('the [IMAGE HANDLING] span itself carries no ${...} interpolation (source text, as the image-markers spec requires)', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const source = readFileSync(join(process.cwd(), 'src', 'prompt-core', 'master-system-prompt.ts'), 'utf8').replace(/\r\n/g, '\n');
    const s = source.indexOf(HEADING);
    const e = source.indexOf('\nFIGURE FORMAT', s);
    expect(source.slice(s, e)).not.toContain('${');
  });
});

describe('NFR-1 / D4: the block reaches Task A for every store and keeps the cached prefix byte-identical', () => {
  const task = (store: string) => buildPromptA({
    website: { name: store, group: STORE_REGISTRY[store].group, url: 'https://x.example' },
    name: 'Creality Ender-3 V3 SE', description: 'Budget FDM printer.', specs: '',
  });

  it.each(Object.keys(STORE_REGISTRY))('store %s: systemBlocks[0] is the master and contains the block', store => {
    const block0 = task(store).systemBlocks[0];
    expect(block0.text).toBe(MASTER_SYSTEM_PROMPT);
    expect(block0.cache).toBe(true);
    expect(block0.text).toContain('[NO PICTURE REFERENCES');
  });

  it('the first two cached blocks are identical across every store', () => {
    const prefixes = Object.keys(STORE_REGISTRY).map(s => JSON.stringify(task(s).systemBlocks.slice(0, 2)));
    expect(new Set(prefixes).size).toBe(1);
  });
});

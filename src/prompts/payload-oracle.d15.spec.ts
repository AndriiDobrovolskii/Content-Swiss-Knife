/**
 * payload-oracle.d15.spec.ts - US-9.1 D15 / D13 category 20 / category 17: the pre-change oracle for the
 * optimizer and the Task C FAQ variant.
 *
 * Specification FR-23 items 4 and 5: the optimizer's block 1 and `userContent`, every block of the Task C FAQ
 * variant, and the whole `buildTranslatePrompt` payload are byte-unchanged by this Story. Before this spec
 * "unchanged" was an empty `git diff` reading, which proves the file and not the payload: an edit to a
 * constant these payloads interpolate (`NO_LEAKED_REASONING_CLAUSE`, a `FAQ_*` constant) would have passed
 * every existing test.
 *
 * CHARACTERIZATION TEST, GREEN FROM THE START BY DESIGN and green after EVERY later task. The digests in
 * `test/fixtures/golden/optimizer-faq-pre-change.json` were captured from the commit the Story branch was cut
 * from (header `_meta.base`), before any edit to `constants.ts` or `master-system-prompt.ts`. Never
 * regenerate them, never pass `-u`: a red result here means a block FR-23 says is unchanged HAS changed, and
 * the fix is in the code (AGENTS.md section 7.7).
 *
 * Optimizer block 0 is not digested: it IS the master, so it is asserted `toBe(MASTER_SYSTEM_PROMPT)` and the
 * fixture never has to follow a master edit. The Task C FAQ variant and `buildTranslatePrompt` carry no
 * master at all, so no master fragment may appear in any of their blocks.
 *
 * What this does NOT do: it does not close R7a (optimizer behaviour under the new master) or R1a (translator
 * behaviour); it only makes "unchanged" a tested claim.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MASTER_SYSTEM_PROMPT } from '../prompt-core/master-system-prompt';
import {
  OPTIMIZER_CASES, faqVariantCases, TRANSLATE_CASES,
} from '../../test/fixtures/optimizer-faq-pre-change-inputs';
import { registryPairs } from '../../test/fixtures/task-c-description-inputs';

interface Digest { sha256: string; length: number }
type BlockDigest = Digest & { cache?: boolean };
interface PayloadRecord { systemBlocks: BlockDigest[]; userContent: Digest }
interface OptimizerRecord { blockCount: number; block0Cache: boolean; block1: BlockDigest; userContent: Digest }
interface Oracle {
  _meta: { base: string; baseShort: string };
  optimizer: Record<string, OptimizerRecord>;
  faqVariant: Record<string, PayloadRecord>;
  translate: Record<string, PayloadRecord>;
}

const ORACLE: Oracle = JSON.parse(
  readFileSync(join(process.cwd(), 'test', 'fixtures', 'golden', 'optimizer-faq-pre-change.json'), 'utf8'),
);
const sha = (t: string) => createHash('sha256').update(t, 'utf8').digest('hex');

/** A few distinctive, long master fragments: none of them may occur in a payload that carries no master. */
const MASTER_FRAGMENTS = [
  MASTER_SYSTEM_PROMPT.slice(0, 300),
  MASTER_SYSTEM_PROMPT.slice(Math.floor(MASTER_SYSTEM_PROMPT.length / 2), Math.floor(MASTER_SYSTEM_PROMPT.length / 2) + 300),
  MASTER_SYSTEM_PROMPT.slice(-300),
  'IMAGE GROUNDING LOCK',
  '[IMAGE HANDLING]',
];

const OPT = OPTIMIZER_CASES;
const FAQ = faqVariantCases();

describe('D15 oracle - the fixture is a pre-change capture and covers its input set', () => {
  it('the header names a 40-hex BASE commit', () => {
    expect(ORACLE._meta.base).toMatch(/^[0-9a-f]{40}$/);
    expect(ORACLE._meta.baseShort).toBe(ORACLE._meta.base.slice(0, 7));
  });

  it('holds exactly the cases the input file builds (guards against a silently shrunk suite)', () => {
    expect(Object.keys(ORACLE.optimizer).sort()).toEqual(Object.keys(OPT).sort());
    expect(Object.keys(ORACLE.faqVariant).sort()).toEqual(Object.keys(FAQ).sort());
    expect(Object.keys(ORACLE.translate).sort()).toEqual(Object.keys(TRANSLATE_CASES).sort());
  });

  it('the FAQ set covers the 16 store x non-master-language pairs of the Task C description golden', () => {
    expect(registryPairs()).toHaveLength(16);
    for (const p of registryPairs()) {
      expect(Object.keys(FAQ).some(k => k.startsWith(`${p.store} | ${p.lang} | `)), `${p.store}/${p.lang}`).toBe(true);
    }
  });

  it('the optimizer set covers a product name, no product name, figures and a pointer sentence', () => {
    const names = Object.keys(OPT);
    expect(names.some(n => n.startsWith('with-name/'))).toBe(true);
    expect(names.some(n => n.startsWith('no-name/'))).toBe(true);
    expect(names.some(n => n.endsWith('/figures'))).toBe(true);
    expect(names.some(n => n.endsWith('/pointer-sentence'))).toBe(true);
  });
});

describe('FR-23 item 4 - the optimizer: block 0 IS the master, block 1 and userContent are byte-unchanged', () => {
  it.each(Object.keys(OPT))('%s: block 0 is the live MASTER_SYSTEM_PROMPT and keeps its cache flag', name => {
    const built = OPT[name]();
    expect(built.systemBlocks.length, 'number of system blocks').toBe(ORACLE.optimizer[name].blockCount);
    expect(built.systemBlocks[0].text === MASTER_SYSTEM_PROMPT, 'block 0 is not the master').toBe(true);
    expect(built.systemBlocks[0].cache).toBe(ORACLE.optimizer[name].block0Cache);
  });

  it.each(Object.keys(OPT))('%s: block 1 (the optimizer instruction) is byte-equal to the pre-change digest', name => {
    const built = OPT[name]();
    const rec = ORACLE.optimizer[name].block1;
    expect(built.systemBlocks[1].text.length, 'block 1 length').toBe(rec.length);
    expect(sha(built.systemBlocks[1].text) === rec.sha256, 'block 1 bytes differ from the pre-change capture').toBe(true);
    expect(built.systemBlocks[1].cache).toBe(rec.cache);
  });

  it.each(Object.keys(OPT))('%s: userContent is byte-equal to the pre-change digest', name => {
    const built = OPT[name]();
    const rec = ORACLE.optimizer[name].userContent;
    expect(built.userContent.length, 'userContent length').toBe(rec.length);
    expect(sha(built.userContent) === rec.sha256, 'userContent bytes differ from the pre-change capture').toBe(true);
  });
});

describe('FR-23 item 5 - the Task C FAQ variant: every block and userContent byte-unchanged, no master anywhere', () => {
  it.each(Object.keys(FAQ))('%s: every system block and userContent is byte-equal to the pre-change digest', key => {
    const built = FAQ[key]();
    const rec = ORACLE.faqVariant[key];
    expect(built.systemBlocks.length, 'number of system blocks').toBe(rec.systemBlocks.length);
    built.systemBlocks.forEach((b, i) => {
      expect(b.text.length, `systemBlocks[${i}] length`).toBe(rec.systemBlocks[i].length);
      expect(sha(b.text) === rec.systemBlocks[i].sha256, `systemBlocks[${i}] bytes differ`).toBe(true);
      expect(b.cache, `systemBlocks[${i}] cache flag`).toBe(rec.systemBlocks[i].cache);
    });
    expect(built.userContent.length, 'userContent length').toBe(rec.userContent.length);
    expect(sha(built.userContent) === rec.userContent.sha256, 'userContent bytes differ').toBe(true);
  });

  it('no block of any FAQ variant payload is, or contains a fragment of, the master', () => {
    for (const key of Object.keys(FAQ)) {
      const p = FAQ[key]();
      for (const [i, b] of p.systemBlocks.entries()) {
        expect(b.text === MASTER_SYSTEM_PROMPT, `${key} block ${i} is the master`).toBe(false);
        for (const frag of MASTER_FRAGMENTS) expect(b.text.includes(frag), `${key} block ${i} carries a master fragment`).toBe(false);
      }
      for (const frag of MASTER_FRAGMENTS) expect(p.userContent.includes(frag), `${key} userContent carries a master fragment`).toBe(false);
    }
  });
});

describe('D13 category 17 - buildTranslatePrompt carries no master and is byte-unchanged', () => {
  it.each(Object.keys(TRANSLATE_CASES))('%s: every block and userContent is byte-equal to the pre-change digest', key => {
    const built = TRANSLATE_CASES[key]();
    const rec = ORACLE.translate[key];
    expect(built.systemBlocks.length).toBe(rec.systemBlocks.length);
    built.systemBlocks.forEach((b, i) => {
      expect(b.text.length, `systemBlocks[${i}] length`).toBe(rec.systemBlocks[i].length);
      expect(sha(b.text) === rec.systemBlocks[i].sha256, `systemBlocks[${i}] bytes differ`).toBe(true);
      expect(b.cache).toBe(rec.systemBlocks[i].cache);
    });
    expect(sha(built.userContent) === rec.userContent.sha256, 'userContent bytes differ').toBe(true);
  });

  it('no block of any buildTranslatePrompt payload is, or contains a fragment of, the master', () => {
    for (const key of Object.keys(TRANSLATE_CASES)) {
      const p = TRANSLATE_CASES[key]();
      for (const [i, b] of p.systemBlocks.entries()) {
        expect(b.text === MASTER_SYSTEM_PROMPT, `${key} block ${i} is the master`).toBe(false);
        for (const frag of MASTER_FRAGMENTS) expect(b.text.includes(frag), `${key} block ${i} carries a master fragment`).toBe(false);
      }
    }
  });
});

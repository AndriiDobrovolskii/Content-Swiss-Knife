/**
 * task-c.description-bytes.spec.ts — US-8.1 AC-18 / FR-13.
 *
 * "For a non-FAQ input (a full description), the prompt built by `task-c.ts` is byte-identical to the
 * one built before this Story — description translation is unchanged."
 *
 * CHARACTERIZATION TEST, GREEN FROM THE START BY DESIGN (task breakdown T1, "The one characterization
 * test"). The golden `test/fixtures/golden/task-c-description-prompts.json` was captured by
 * TEST_WRITING from the UNMODIFIED `src/prompts/task-c.ts`, before T1 touches that FROZEN file. It
 * must stay green after T1; if it goes red the FAQ edit changed a description prompt. Never regenerate
 * the golden, never pass `-u`.
 *
 * The golden stores a SHA-256 digest and the character length of every system block and of
 * `userContent` (the full prompts would be ~35 KB of master prompt per case), plus the `cache` flag.
 *
 * This spec never passes `contentKind`, not even `'description'`, so it type-checks against the
 * unmodified file (task breakdown constraint 2). That `undefined` / absent `contentKind` means
 * "description" is pinned from the other side by `task-c.faq.spec.ts`.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { descriptionCases, registryPairs } from '../../test/fixtures/task-c-description-inputs';

interface Digest { sha256: string; length: number }
interface GoldenCase { systemBlocks: Array<Digest & { cache?: boolean }>; userContent: Digest }

const GOLDEN: Record<string, GoldenCase> = JSON.parse(
  readFileSync(join(process.cwd(), 'test', 'fixtures', 'golden', 'task-c-description-prompts.json'), 'utf8'),
);
const sha = (t: string) => createHash('sha256').update(t, 'utf8').digest('hex');
const CASES = descriptionCases();

describe('AC-18 / FR-13: description translation prompts are byte-identical to the pre-Story golden', () => {
  it('premise: the registry yields 16 store x non-master-language pairs (the figure the Specification names)', () => {
    expect(registryPairs()).toHaveLength(16);
  });

  it('premise: the golden holds exactly the cases the fixture builds (guards against a silently shrunk suite)', () => {
    expect(Object.keys(GOLDEN).sort()).toEqual(Object.keys(CASES).sort());
    // 16 pairs x (4 corpus variants + 2 snippet variants), each pair with AND without opts.
    expect(Object.keys(GOLDEN)).toHaveLength(16 * 6);
  });

  it('every pair is covered both without opts and with opts', () => {
    for (const p of registryPairs()) {
      const keys = Object.keys(GOLDEN).filter(k => k.startsWith(`${p.store} | ${p.lang} | `));
      expect(keys.some(k => k.endsWith('/no-opts')), `${p.store}/${p.lang} without opts`).toBe(true);
      expect(keys.some(k => /source-locale/.test(k)), `${p.store}/${p.lang} with opts`).toBe(true);
    }
  });

  for (const key of Object.keys(CASES)) {
    it(`${key}: system blocks, cache flags and userContent are byte-equal to the golden`, () => {
      const built = CASES[key]();
      const golden = GOLDEN[key];
      expect(built.systemBlocks.length, 'number of system blocks').toBe(golden.systemBlocks.length);
      built.systemBlocks.forEach((b, i) => {
        expect(b.text.length, `systemBlocks[${i}] length`).toBe(golden.systemBlocks[i].length);
        expect(sha(b.text) === golden.systemBlocks[i].sha256, `systemBlocks[${i}] bytes differ`).toBe(true);
        expect(b.cache, `systemBlocks[${i}] cache flag`).toBe(golden.systemBlocks[i].cache);
      });
      expect(built.userContent.length, 'userContent length').toBe(golden.userContent.length);
      expect(sha(built.userContent) === golden.userContent.sha256, 'userContent bytes differ').toBe(true);
    });
  }

  it('is a pure function of its input: two builds of every case are identical', () => {
    for (const key of Object.keys(CASES)) {
      expect(JSON.stringify(CASES[key]())).toBe(JSON.stringify(CASES[key]()));
    }
  });
});

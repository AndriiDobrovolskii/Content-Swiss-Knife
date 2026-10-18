/**
 * task-c-description-guard.ts - the comparison used by `src/prompts/task-c.description-bytes.spec.ts`, exposed
 * as a pure function so the guard can be shown to FAIL on test data (US-9.1 T20, plan-review N17).
 *
 * WHY IT IS A FUNCTION. The amended guard (owner decision Q1, option (b)) compares block 0 of every Task C
 * description prompt with the LIVE master and keeps block 1, the cache flags and `userContent` pinned by
 * digest. Its negative demonstration must not need a frozen-file edit (`task-c.ts` is FROZEN and a temporary
 * one-character edit of it would be an AGENTS.md section 9 edit without a "modify" instruction), so the
 * comparison takes the record and the live master as arguments: a test feeds it an in-memory mutated copy of a
 * record, and the real JSON is never touched.
 *
 * What the guard stops pinning (named, not silent, AGENTS.md section 7.7): the master's bytes for the 96 cases
 * by digest. The master text stays pinned by the master specs and by the reviewed regeneration of
 * `full-description-prompts.json`. What it newly proves: block 0 of every Task C description prompt IS the
 * master. It cannot show that the master changed unintentionally.
 */
import { createHash } from 'node:crypto';
import type { PromptPayload } from '../../src/prompt-core/payload';

export interface Digest { sha256: string; length: number }
export interface GoldenCase { systemBlocks: Array<Digest & { cache?: boolean }>; userContent: Digest }

const sha = (t: string) => createHash('sha256').update(t, 'utf8').digest('hex');

/**
 * Differences between a built payload and its golden record; an empty array means the case passes.
 *  - the block count is pinned;
 *  - block 0: `text` must equal `liveMaster`; its `cache` flag is pinned; its recorded digest and length are
 *    NOT read (they describe the pre-Story master);
 *  - every other block: `length`, `sha256` and `cache` are pinned;
 *  - `userContent`: `length` and `sha256` are pinned.
 */
export function compareCaseToRecord(built: PromptPayload, golden: GoldenCase, liveMaster: string): string[] {
  const problems: string[] = [];
  if (built.systemBlocks.length !== golden.systemBlocks.length) {
    problems.push(`number of system blocks: ${built.systemBlocks.length} !== ${golden.systemBlocks.length}`);
    return problems;
  }
  built.systemBlocks.forEach((b, i) => {
    if (i === 0) {
      if (b.text !== liveMaster) problems.push('systemBlocks[0] is not the live MASTER_SYSTEM_PROMPT');
    } else {
      if (b.text.length !== golden.systemBlocks[i].length) problems.push(`systemBlocks[${i}] length`);
      if (sha(b.text) !== golden.systemBlocks[i].sha256) problems.push(`systemBlocks[${i}] bytes differ`);
    }
    if (b.cache !== golden.systemBlocks[i].cache) problems.push(`systemBlocks[${i}] cache flag`);
  });
  if (built.userContent.length !== golden.userContent.length) problems.push('userContent length');
  if (sha(built.userContent) !== golden.userContent.sha256) problems.push('userContent bytes differ');
  return problems;
}

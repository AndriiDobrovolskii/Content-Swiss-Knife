/**
 * task-c.description-bytes.spec.ts - US-8.1 AC-18 / FR-13, AMENDED by US-9.1 T20 (FR-23, NFR-9, plan D0.2
 * option (b), owner decision Q1 of 2026-10-18).
 *
 * "For a non-FAQ input (a full description), the prompt built by `task-c.ts` is byte-identical to the
 * one built before this Story - description translation is unchanged."
 *
 * US-9.1 AMENDMENT (AGENTS.md section 7.7: a requirement changed the rule of this guard, so the change is
 * NAMED here and not made silently). `task-c.ts` embeds `MASTER_SYSTEM_PROMPT` as `systemBlocks[0]`, and
 * US-9.1 edits the master by design (FR-5, FR-20), so block 0 of all 96 cases moves. Specification FR-23
 * requires only that block 1 and `userContent` of all 96 cases stay byte-identical. The guard therefore:
 *   - still pins the block COUNT per case;
 *   - compares block 0 `text` with the LIVE `MASTER_SYSTEM_PROMPT` (`toBe`-equivalent) and still pins its
 *     `cache` flag per case;
 *   - still pins block 1 and `userContent` by `length` and `sha256` (and block 1 by `cache`) per case;
 *   - never reads the recorded block-0 digest and length: the 96 block-0 records (`b01074fa...5433`, 45 387)
 *     describe the PRE-STORY master and are unread; `test/fixtures/golden/task-c-description-prompts.json`
 *     stays BYTE-UNCHANGED (the premise test below pins that they are still the pre-Story records);
 *   - is GREEN ON ARRIVAL and after the master edit (block 0 equals the master both before and after), so
 *     it needs no co-commit with any master task and no digest is ever bumped.
 * What it stops pinning: the master's bytes for 96 cases by digest (still pinned by the master specs and by
 * the reviewed regeneration of `full-description-prompts.json`). What it newly proves: block 0 of every Task C
 * description prompt IS the master. It cannot show that the master changed unintentionally.
 *
 * CHARACTERIZATION TEST, GREEN FROM THE START BY DESIGN (task breakdown T20). The golden was captured by
 * US-8.1 TEST_WRITING from the unmodified `task-c.ts`. Never regenerate the golden, never pass `-u`; block 0
 * now follows the live master, but the JSON itself is not regenerated for any reason.
 *
 * The comparison lives in `test/fixtures/task-c-description-guard.ts` as a pure function, so the guard can be
 * shown to FAIL on in-memory test data (the negative demonstration below). That demonstration deliberately
 * does NOT edit `task-c.ts`, `task-translate.ts` or `simplified-template-blocks.ts`, even temporarily:
 * `task-c.ts` is FROZEN (plan-review N17).
 *
 * This spec never passes `contentKind`, not even `'description'`, so it type-checks against the
 * unmodified file (task breakdown constraint 2). That `undefined` / absent `contentKind` means
 * "description" is pinned from the other side by `task-c.faq.spec.ts`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { descriptionCases, registryPairs } from '../../test/fixtures/task-c-description-inputs';
import { compareCaseToRecord, type GoldenCase } from '../../test/fixtures/task-c-description-guard';
import { MASTER_SYSTEM_PROMPT } from '../prompt-core/master-system-prompt';

const GOLDEN: Record<string, GoldenCase> = JSON.parse(
  readFileSync(join(process.cwd(), 'test', 'fixtures', 'golden', 'task-c-description-prompts.json'), 'utf8'),
);
const CASES = descriptionCases();
const KEYS = Object.keys(CASES);

describe('AC-18 / FR-13 / US-9.1 FR-23: description translation prompts - block 0 is the live master, the rest is byte-identical to the golden', () => {
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

  it('premise (R24): the JSON is untouched - all 96 block-0 records still describe the PRE-STORY master and are not read', () => {
    const block0 = new Set(Object.values(GOLDEN).map(c => `${c.systemBlocks[0].sha256}:${c.systemBlocks[0].length}:${c.systemBlocks[0].cache}`));
    expect([...block0]).toEqual(['b01074fa9f4e345da920f208f2391183c026a1d4290dc5281eb4d78c8bcb5433:45387:true']);
  });

  for (const key of KEYS) {
    it(`${key}: block 0 is the live master; block 1, cache flags and userContent are byte-equal to the golden`, () => {
      expect(compareCaseToRecord(CASES[key](), GOLDEN[key], MASTER_SYSTEM_PROMPT)).toEqual([]);
    });
  }

  it('is a pure function of its input: two builds of every case are identical', () => {
    for (const key of KEYS) {
      expect(JSON.stringify(CASES[key]())).toBe(JSON.stringify(CASES[key]()));
    }
  });
});

describe('US-9.1 T20 - negative demonstration on TEST DATA: the amended guard can still fail (no frozen file is edited)', () => {
  const key = KEYS[0];
  const built = () => CASES[key]();
  const record = (): GoldenCase => structuredClone(GOLDEN[key]);
  const flip = (hex: string) => (hex[0] === '0' ? '1' : '0') + hex.slice(1);

  it('control: the unmutated record passes', () => {
    expect(compareCaseToRecord(built(), record(), MASTER_SYSTEM_PROMPT)).toEqual([]);
  });

  it('fails on a one-character change to the block-1 record', () => {
    const r = record();
    r.systemBlocks[1].sha256 = flip(r.systemBlocks[1].sha256);
    expect(compareCaseToRecord(built(), r, MASTER_SYSTEM_PROMPT)).toEqual(['systemBlocks[1] bytes differ']);
  });

  it('fails on a one-character change to the userContent record', () => {
    const r = record();
    r.userContent.sha256 = flip(r.userContent.sha256);
    expect(compareCaseToRecord(built(), r, MASTER_SYSTEM_PROMPT)).toEqual(['userContent bytes differ']);
  });

  it('fails when the block-1 length or the userContent length record changes', () => {
    const r = record();
    r.systemBlocks[1].length += 1;
    r.userContent.length += 1;
    expect(compareCaseToRecord(built(), r, MASTER_SYSTEM_PROMPT)).toEqual(['systemBlocks[1] length', 'userContent length']);
  });

  it('fails when the block count or a cache flag in the record changes', () => {
    const extra = record();
    extra.systemBlocks.push({ sha256: 'x', length: 1, cache: true });
    expect(compareCaseToRecord(built(), extra, MASTER_SYSTEM_PROMPT)).toEqual(['number of system blocks: 2 !== 3']);
    const flag = record();
    flag.systemBlocks[0].cache = !flag.systemBlocks[0].cache;
    expect(compareCaseToRecord(built(), flag, MASTER_SYSTEM_PROMPT)).toEqual(['systemBlocks[0] cache flag']);
  });

  it('fails when block 0 is not the master it is compared with', () => {
    expect(compareCaseToRecord(built(), record(), `${MASTER_SYSTEM_PROMPT} `)).toEqual(['systemBlocks[0] is not the live MASTER_SYSTEM_PROMPT']);
  });

  it('does NOT read the recorded block-0 digest or length (option (b): the master may change without a digest bump)', () => {
    const r = record();
    r.systemBlocks[0].sha256 = flip(r.systemBlocks[0].sha256);
    r.systemBlocks[0].length += 1000;
    expect(compareCaseToRecord(built(), r, MASTER_SYSTEM_PROMPT)).toEqual([]);
  });
});

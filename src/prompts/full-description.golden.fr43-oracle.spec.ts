/**
 * full-description.golden.fr43-oracle.spec.ts - US-9.1 FR-43 ORACLE PIN (task breakdown P2; owner task T43).
 *
 * FR-43: after the master revert (FR-42) the golden `test/fixtures/golden/full-description-prompts.json` is regenerated in
 * the same commit, with a reviewed diff limited to the two `[SOURCE FIDELITY]` bullets in `systemBlocks[0]` of the ten
 * master-embedding cases, and "its oracle is independent of the generator" (AGENTS.md 7.7).
 *
 * THIS SPEC IS THAT INDEPENDENT ORACLE, as far as a persistent test can be: it reads the golden as DATA (never writes it)
 * and asserts, for each of the ten cases, that `systemBlocks[0]` holds the FR-42 Assert-present literals and contains no
 * `Operator Notes`. The literals are written here from the Specification and the branch-base text (`6546db8`), not copied
 * from the golden or from the master. The comparison "new block 0 equals old block 0 with the two bullets replaced" cannot be
 * persistent (the old text leaves the tree at T43); it is T43 / T50 acceptance evidence.
 *
 * The golden is NOT written, substituted or committed by TEST_WRITING: the builder regenerates it in T43 (raw-text
 * substitution, plan W6) in the same commit as the master revert. So this spec is RED ON ARRIVAL (the golden still holds the
 * notes-bearing bullets) and turns green in T43. The surviving `full-description.golden.spec.ts` (byte equality of the
 * golden with the live master) is not edited and stays green until, and at, T43.
 *
 * Count facts recorded for RECONCILIATION (corrected Specification reading, P14 item 3): `[Operator Notes]` occurs 20 times on
 * 10 lines of the golden today (two per case), not "ten times"; the Assert-absent below is on the string `Operator Notes`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PromptPayload } from '../prompt-core/payload';

const GOLDEN_PATH = join(process.cwd(), 'test', 'fixtures', 'golden', 'full-description-prompts.json');
const GOLDEN: Record<string, PromptPayload> = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8'));
const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();
const MASTER_CASES = Object.keys(GOLDEN).filter(n => /^(doc|html|c)\//.test(n));
const block0 = (name: string): string => collapse(GOLDEN[name].systemBlocks[0]?.text ?? '');

describe('FR-43 oracle pin: premise', () => {
  it('the golden holds exactly the ten master-embedding cases (doc 3, html 4, c 3)', () => {
    expect(MASTER_CASES).toHaveLength(10);
    expect(MASTER_CASES.filter(n => n.startsWith('doc/'))).toHaveLength(3);
    expect(MASTER_CASES.filter(n => n.startsWith('html/'))).toHaveLength(4);
    expect(MASTER_CASES.filter(n => n.startsWith('c/'))).toHaveLength(3);
  });
});

describe('FR-43 oracle pin: systemBlocks[0] of the ten cases carries the FR-42 wording (Assert present)', () => {
  it.each([
    'the provided [Raw Description], [Technical Specs] or [Supplemental Content]',
    'scan the three input blocks for numbers that describe the SAME quantity',
  ])('every master-embedding case contains %j', literal => {
    const missing = MASTER_CASES.filter(n => !block0(n).includes(literal));
    expect(missing, `cases whose block 0 lacks the literal`).toEqual([]);
  });
});

describe('FR-43 oracle pin: no case of the golden mentions Operator Notes (Assert absent)', () => {
  it('systemBlocks[0] of the ten cases contains neither "Operator Notes" nor "operatorNotes"', () => {
    const offenders = MASTER_CASES.filter(n => /Operator Notes|operatorNotes/.test(block0(n)));
    expect(offenders, 'cases whose block 0 still names the withdrawn block').toEqual([]);
  });

  it('the whole golden file does not contain the string "Operator Notes" (any block, any case)', () => {
    expect(readFileSync(GOLDEN_PATH, 'utf8').includes('Operator Notes'), 'the golden still holds Operator Notes').toBe(false);
  });
});

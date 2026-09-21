/**
 * full-description.golden.spec.ts — US-2.2 AC-6 / FR-6 / NFR-6.
 *
 * With no `templateId` ("Full description", OD-5) every prompt builder must return the bytes it
 * returned BEFORE this Story. The goldens were captured from the pre-edit tree (see
 * test/fixtures/full-description-inputs.ts). This spec is a regression guard: it passes today and
 * must stay green at every task, including after the frozen task-a.ts / task-c.ts edits (T9) and
 * the constants.ts purge (T13).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GOLDEN_CASES } from '../../test/fixtures/full-description-inputs';
import type { PromptPayload } from '../prompt-core/payload';

const GOLDEN: Record<string, PromptPayload> = JSON.parse(
  readFileSync(join(process.cwd(), 'test', 'fixtures', 'golden', 'full-description-prompts.json'), 'utf8'),
);

describe('Full description prompts are byte-identical to the pre-Story goldens (FR-6, NFR-6)', () => {
  it('has a golden for every case (guards against a silently shrunk suite)', () => {
    expect(Object.keys(GOLDEN).sort()).toEqual(Object.keys(GOLDEN_CASES).sort());
    expect(Object.keys(GOLDEN).length).toBeGreaterThanOrEqual(12);
  });

  for (const name of Object.keys(GOLDEN_CASES)) {
    it(`${name}: systemBlocks and userContent are byte-equal`, () => {
      const built = GOLDEN_CASES[name]();
      const golden = GOLDEN[name];
      expect(built.systemBlocks.length).toBe(golden.systemBlocks.length);
      built.systemBlocks.forEach((b, i) => {
        expect(b.text === golden.systemBlocks[i].text, `systemBlocks[${i}].text differs`).toBe(true);
        expect(b.cache).toBe(golden.systemBlocks[i].cache);
      });
      expect(built.userContent === golden.userContent, 'userContent differs').toBe(true);
    });
  }

  it('is a pure function of its input: two builds of the same input are identical (NFR-6)', () => {
    for (const name of Object.keys(GOLDEN_CASES)) {
      expect(JSON.stringify(GOLDEN_CASES[name]())).toBe(JSON.stringify(GOLDEN_CASES[name]()));
    }
  });
});

/**
 * optimizer.master-reach.spec.ts - US-9.1 D13 category 18 and 9 (R22), FR-23 item 4: the optimizer embeds the
 * master as `systemBlocks[0]` and therefore inherits the new master text; its own instruction and `userContent`
 * are byte-unchanged (pinned by the D15 oracle, `payload-oracle.d15.spec.ts`).
 *
 * `optimizer.ts` is NOT edited (Q-OPT option 1, decided 2026-10-18). Its `TASK_OPTIMIZE_INSTRUCTION` keeps its
 * own "lead-in" - the figcaption `<b>` label, not a lead-in `<p>` - and is not asserted here. The residual risk
 * that the liveliness rules and the "deleted, not reworded" rule read oddly for a restructuring task (R7a) is
 * declared and no test can show it. One describe per owner task (breakdown constraint 2): T27, T31 (INVERTED for the operator-notes withdrawal, FR-42), T32.
 * Frozen master hunks are gated on H-OD12; red until then.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MASTER_SYSTEM_PROMPT } from '../prompt-core/master-system-prompt';
import { OPTIMIZER_CASES } from '../../test/fixtures/optimizer-faq-pre-change-inputs';
import { noImageDeixisRule, livelinessRules, collapse, SELF_SCOPING_STRINGS } from '../../test/fixtures/us91-constants';

const CASES = Object.keys(OPTIMIZER_CASES).map(k => [k] as [string]);

describe.each(CASES)('T27 / category 18: optimizer %s - NO_IMAGE_DEIXIS_RULE reaches block 0', key => {
  it('block 0 is the live master and carries the constant; the optimizer instruction does not', () => {
    const built = OPTIMIZER_CASES[key]();
    expect(built.systemBlocks[0].text === MASTER_SYSTEM_PROMPT).toBe(true);
    expect(built.systemBlocks[0].cache).toBe(true);
    expect(built.systemBlocks[0].text).toContain('[NO PICTURE REFERENCES');
    expect(collapse(built.systemBlocks[0].text)).toContain(collapse(noImageDeixisRule()));
    expect(built.systemBlocks[1].text).not.toContain('[NO PICTURE REFERENCES');
  });
});

describe.each(CASES)('T32 / categories 18 and 19: optimizer %s - LIVELINESS_RULES and the self-scoping strings reach block 0', key => {
  it('block 0 carries the shared block and the three strings', () => {
    const text = collapse(OPTIMIZER_CASES[key]().systemBlocks[0].text);
    expect(text).toContain(collapse(livelinessRules()));
    for (const literal of SELF_SCOPING_STRINGS) expect(text, literal).toContain(literal);
  });
});

// INVERTED by US-9.1 TEST_WRITING (operator-notes withdrawal, FR-42; NFR-9 / NFR-14, AGENTS.md 7.7): block 0 must no longer name an
// [Operator Notes] block. RED until T43 reverts the master (the sanctioned red window).
describe.each(CASES)('T31 inverted / category 9 (R22, FR-42): optimizer %s - no block of the payload mentions Operator Notes', key => {
  it('block 0 (the master) does not name Operator Notes and the optimizer payload has no notes block', () => {
    const built = OPTIMIZER_CASES[key]();
    expect(built.systemBlocks[0].text).not.toContain('Operator Notes');
    expect(built.systemBlocks[1].text).not.toContain('[Operator Notes]');
    expect(built.userContent).not.toContain('[Operator Notes]');
  });
});

describe('FR-23 item 2/4: optimizer.ts names none of the new constants (green on arrival)', () => {
  it('src/prompts/optimizer.ts (read as text)', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'prompts', 'optimizer.ts'), 'utf8');
    for (const name of ['NO_IMAGE_DEIXIS_RULE', 'LIVELINESS_RULES', 'Operator Notes', 'image-deixis']) {
      expect(source.includes(name), `optimizer.ts mentions ${name}`).toBe(false);
    }
  });
});

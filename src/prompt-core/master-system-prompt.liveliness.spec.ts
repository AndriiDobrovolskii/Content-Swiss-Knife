/**
 * master-system-prompt.liveliness.spec.ts - US-9.1 T32 (FR-20, FR-21, hunk M7, AC-8): the shared liveliness block
 * reaches every store through the cached master, and the self-scoping sentence travels with it
 * (D13 category 19, Task A half).
 *
 * FROZEN file `src/prompt-core/master-system-prompt.ts`: hunk M7 adds `LIVELINESS_RULES` to the existing
 * `./constants` import and interpolates it as a static block. SCENE, RHYTHM, HONEST LIMITS and HOOK are ONE
 * shared constant, so the master stays byte-identical across every store (the cached prefix). The constant
 * itself is pinned in `constants.liveliness.spec.ts`; its reach into Task C description translation and the
 * optimizer in `task-c.master-reach.spec.ts` / `optimizer.master-reach.spec.ts`. No "modify" instruction exists
 * (H-OD12): red until it does; the frozen file is never touched by this stage.
 *
 * Specification FR-20 Assert present, in `systemBlocks[0].text` of `buildPromptA` for EACH of the seven
 * STORE_REGISTRY stores (collapsed whitespace): the SCENE, RHYTHM, HONEST LIMITS and HOOK literals,
 * `[SENTENCE LENGTH]` named as the authority, `apply only where §3 exists`, and the self-scoping strings
 * (`govern writing a new description`, `when the task is to translate an existing text they do not apply`,
 * `the source's sentences and their order are kept`). Each store's block 0 equals `MASTER_SYSTEM_PROMPT`.
 * Assert present (existing, kept; INVARIANT START unchanged): `"<b>[Product]</b> — [Category] for [use-case],
 * featuring [key specs]."` and `none of them varies the start`.
 *
 * DEFERRED (H-FR20PREC, not written): the precedence sentence is a PROPOSED DEFAULT (see the T16 spec header).
 *
 * The FR-20 Assert-absent (`9–17`, `9-17`, `at most two consecutive`, `two consecutive sentences`, no
 * digit-range-plus-`word`, no sentence-length number other than `6`) is applied to the liveliness CONSTANT in
 * the T16 spec and NOT to the whole master, whose `[SENTENCE LENGTH]` block carries the bands.
 */
import { describe, it, expect } from 'vitest';
import { STORE_REGISTRY } from './constants';
import { MASTER_SYSTEM_PROMPT } from './master-system-prompt';
import { buildPromptA } from '../prompts/task-a';
import { livelinessRules, collapse, SELF_SCOPING_STRINGS, SELF_SCOPING_SENTENCE, WATCH_ITEM_FORBIDDEN } from '../../test/fixtures/us91-constants';
import { MASTER, sourceFidelityBullet } from '../../test/fixtures/us91-master';

const FR20_LITERALS = [
  'open each §3 <h2> section with one short sentence naming the task or constraint the reader faces',
  'a statement, not a question',
  'does not apply to §1',
  'at least one sentence of 6 words or fewer',
  'more than twice per document',
  'surface the non-obvious constraint in the paragraph where it matters',
  '[use-case]',
  'names the task the buyer solves',
  'apply only where §3 exists',
  '[SENTENCE LENGTH]',
];

const task = (store: string) => buildPromptA({
  website: { name: store, group: STORE_REGISTRY[store].group, url: 'https://x.example' },
  name: 'Creality Ender-3 V3 SE', description: 'Budget FDM printer.', specs: '',
});

describe.each(Object.keys(STORE_REGISTRY).map(s => [s] as [string]))('FR-20 (T32): store %s receives the shared liveliness block through the cached master', store => {
  it('systemBlocks[0] is the master and carries the SCENE, RHYTHM, HONEST LIMITS and HOOK literals', () => {
    const block0 = task(store).systemBlocks[0];
    expect(block0.text).toBe(MASTER_SYSTEM_PROMPT);
    const text = collapse(block0.text);
    for (const literal of FR20_LITERALS) expect(text, literal).toContain(literal);
  });

  it('systemBlocks[0] carries the three self-scoping strings (category 19, Task A half)', () => {
    const text = collapse(task(store).systemBlocks[0].text);
    for (const literal of SELF_SCOPING_STRINGS) expect(text, literal).toContain(literal);
  });
});

describe('FR-20 (T32): the master contains the whole liveliness constant, once, as the one shared block', () => {
  it('the constant\'s collapsed text occurs exactly once in the collapsed master', () => {
    const rules = collapse(livelinessRules());
    expect(MASTER).toContain(rules);
    expect(MASTER.split(rules).length - 1).toBe(1);
  });

  it('the full self-scoping sentence occurs exactly once in the master (no second copy, no per-consumer copy)', () => {
    expect(MASTER.split(SELF_SCOPING_SENTENCE).length - 1).toBe(1);
  });

  it('adds none of the forbidden watch-item prose to the master (the master-scanning specs stay green)', () => {
    expect(MASTER_SYSTEM_PROMPT).not.toMatch(WATCH_ITEM_FORBIDDEN);
  });
});

describe('FR-20 / FR-21 (T32): INVARIANT START and the tone limits are unchanged (green on arrival, stay green)', () => {
  it.each([
    '"<b>[Product]</b> — [Category] for [use-case], featuring [key specs]."',
    'none of them varies the start',
  ])('the master still contains %j', literal => {
    expect(MASTER).toContain(literal);
  });

  it('STRICT INPUT SCOPE is still present (it is extended by FR-29, T31)', () => {
    expect(sourceFidelityBullet('STRICT INPUT SCOPE')).toContain('STRICT INPUT SCOPE');
  });
});

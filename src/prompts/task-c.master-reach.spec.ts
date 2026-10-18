/**
 * task-c.master-reach.spec.ts - US-9.1 D13 categories 16, 17, 19 and 9 (R22): the master reaches Task C
 * DESCRIPTION translation through block 0 (`pack()` embeds `MASTER_SYSTEM_PROMPT` as `systemBlocks[0]`), and
 * reaches nothing else of Task C.
 *
 * Specification FR-23 items 3 and 5 (owner decision on plan-review blocker B1; Q1 option (b) answered):
 * `task-c.ts` and `task-translate.ts` are NOT edited, yet the description-translation prompt's block 0 changes
 * by design and carries the new master text; its block 1 and `userContent` stay byte-identical (the amended
 * guard `task-c.description-bytes.spec.ts` and the D15 oracle pin those); the Task C FAQ variant and
 * `buildTranslatePrompt` carry no master and do not change at all.
 *
 * ONE DESCRIBE PER OWNER (task breakdown constraint 2), so no describe stays red for a reason a later task owns:
 *   - T27 `NO_IMAGE_DEIXIS_RULE` reach (owner: the master hunk M1+M2),
 *   - T31 R22 `[Operator Notes]` named in block 0 although `userContent` never carries it (master hunk M6),
 *   - T32 `LIVELINESS_RULES` reach and the three self-scoping strings (master hunk M7),
 *   - stay-green: the FAQ variant and `buildTranslatePrompt` carry none of it; `task-c.ts` / `task-translate.ts`
 *     are read as TEXT and name none of the new constants (one interpolation reaches every payload; no
 *     per-consumer text, plan D0.5).
 * The new constants are read through `test/fixtures/us91-constants.ts` (type-clean before T15 / T16).
 * Frozen master hunks are gated on H-OD12; the tests stay red until then and the frozen files are untouched.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MASTER_SYSTEM_PROMPT } from '../prompt-core/master-system-prompt';
import { buildPromptC } from './task-c';
import { registryPairs, CORPUS_MASTER_HTML } from '../../test/fixtures/task-c-description-inputs';
import { faqVariantCases, TRANSLATE_CASES } from '../../test/fixtures/optimizer-faq-pre-change-inputs';
import { noImageDeixisRule, livelinessRules, collapse, SELF_SCOPING_STRINGS } from '../../test/fixtures/us91-constants';

const PAIRS = registryPairs().map(p => [`${p.store} / ${p.lang}`, p] as const);
const description = (p: (typeof PAIRS)[number][1], withOpts: boolean) =>
  buildPromptC(CORPUS_MASTER_HTML, p.lang, p.store, p.group, undefined, withOpts ? { sourceLocale: 'uk-UA' } : undefined);

describe.each(PAIRS)('T27 / category 16: Task C description translation, %s - NO_IMAGE_DEIXIS_RULE reaches block 0', (_label, p) => {
  it.each([false, true])('(opts: %s) block 0 equals the live master and contains [NO PICTURE REFERENCES and the constant; block 1 does not', withOpts => {
    const built = description(p, withOpts);
    expect(built.systemBlocks).toHaveLength(2);
    expect(built.systemBlocks[0].text === MASTER_SYSTEM_PROMPT, 'block 0 is not the live master').toBe(true);
    expect(built.systemBlocks[0].cache).toBe(true);
    expect(built.systemBlocks[0].text).toContain('[NO PICTURE REFERENCES');
    expect(collapse(built.systemBlocks[0].text)).toContain(collapse(noImageDeixisRule()));
    expect(built.systemBlocks[1].text).not.toContain('[NO PICTURE REFERENCES');
    expect(built.userContent).not.toContain('[NO PICTURE REFERENCES');
  });
});

describe.each(PAIRS)('T32 / categories 16 and 19: Task C description translation, %s - LIVELINESS_RULES and the self-scoping sentence reach block 0', (_label, p) => {
  it.each([false, true])('(opts: %s) block 0 is the live master and contains the shared block and the three self-scoping strings', withOpts => {
    const built = description(p, withOpts);
    expect(built.systemBlocks[0].text === MASTER_SYSTEM_PROMPT).toBe(true);
    const text = collapse(built.systemBlocks[0].text);
    expect(text).toContain(collapse(livelinessRules()));
    for (const literal of SELF_SCOPING_STRINGS) expect(text, literal).toContain(literal);
  });
});

describe('T31 / category 9 (R22): block 0 of Task C description translation names [Operator Notes] while its userContent never carries it', () => {
  it.each(PAIRS)('%s', (_label, p) => {
    const built = description(p, true);
    expect(built.systemBlocks[0].text, 'the master bullet that names the block is missing').toContain('[Operator Notes]');
    expect(built.systemBlocks[1].text).not.toContain('[Operator Notes]');
    expect(built.userContent).not.toContain('[Operator Notes]');
  });
});

describe('FR-23 item 5 / category 17: the Task C FAQ variant and buildTranslatePrompt carry none of the new master text (green on arrival, stay green)', () => {
  const ABSENT = ['[NO PICTURE REFERENCES', ...SELF_SCOPING_STRINGS, 'SCENE RULE'];
  const allText = (p: { systemBlocks: Array<{ text: string }>; userContent: string }) =>
    collapse([...p.systemBlocks.map(b => b.text), p.userContent].join('\n'));

  it('no FAQ-variant payload (48 cases) contains the block, the self-scoping strings or the shared constants text', () => {
    for (const [key, build] of Object.entries(faqVariantCases())) {
      const text = allText(build());
      for (const literal of ABSENT) expect(text.includes(literal), `${key}: ${literal}`).toBe(false);
    }
  });

  it('no buildTranslatePrompt payload contains them either', () => {
    for (const [key, build] of Object.entries(TRANSLATE_CASES)) {
      const text = allText(build());
      for (const literal of ABSENT) expect(text.includes(literal), `${key}: ${literal}`).toBe(false);
    }
  });
});

describe('FR-23 item 2: the translation files name none of the new constants (no per-consumer text; green on arrival)', () => {
  it.each(['task-c.ts', 'task-translate.ts'])('src/prompts/%s (read as text)', file => {
    const source = readFileSync(join(process.cwd(), 'src', 'prompts', file), 'utf8');
    for (const name of ['NO_IMAGE_DEIXIS_RULE', 'LIVELINESS_RULES', 'Operator Notes', 'image-deixis']) {
      expect(source.includes(name), `${file} mentions ${name}`).toBe(false);
    }
  });
});

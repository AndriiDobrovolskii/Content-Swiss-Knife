/**
 * faq-pipeline.master-leak.spec.ts - US-9.1 (finding F7): the FAQ-negative helper of `test/fixtures/faq-pipeline.ts` still
 * discriminates once the Story has inserted text into the description master.
 *
 * The helper's two original positional slices (master characters 0..400 and 3000..3400) read the LIVE master, so the Story's
 * insertions (FR-5, FR-6..FR-9, FR-20, FR-29) shift everything after them. The helper now also checks windows over the constants
 * the Story adds (`NO_IMAGE_DEIXIS_RULE`, `LIVELINESS_RULES`) and the Story's other master literals (see the comment in the
 * fixture; whole-master windows were measured and rejected because a FAQ prompt legitimately shares text with the master).
 * This file tests THE HELPER on synthetic payloads, so the discrimination does not depend on the master's current offsets, and it
 * must keep passing, unedited, before and after tasks T27..T32 land. Test code only: the payloads are built here.
 *
 * The LIVELINESS_RULES describe is red until T16 creates the constant (the accessor throws a message naming it).
 */
import { describe, it, expect } from 'vitest';
import { MASTER_SYSTEM_PROMPT } from '../src/prompt-core/master-system-prompt';
import type { PromptPayload } from '../src/prompt-core/payload';
import { faqTranslationPromptProblems, looksLikeDescriptionPrompt, US91_MASTER_LITERALS } from './fixtures/faq-pipeline';
import { noImageDeixisRule, livelinessRules } from './fixtures/us91-constants';

/** A well-formed FAQ translation system prompt (passes every positive rule of the helper), plus whatever extra block is given. */
const FAQ_SYSTEM =
  'Translate the FAQ element-for-element. The structure has <h3>, <p>, <ul> and <li> elements; do not add any element and keep every one.';
const payload = (extraBlock?: string): PromptPayload => ({
  systemBlocks: [{ text: FAQ_SYSTEM, cache: true }, ...(extraBlock === undefined ? [] : [{ text: extraBlock, cache: false }])],
  userContent: '<h3>[de] Q</h3><p>A</p>',
} as PromptPayload);
const leakProblem = 'the description MASTER_SYSTEM_PROMPT is part of the prompt';
const reported = (block: string) => faqTranslationPromptProblems(payload(block)).includes(leakProblem);

describe('control: the helper accepts a clean FAQ translation prompt', () => {
  it('a well-formed FAQ prompt with no master text has no problem', () => {
    expect(faqTranslationPromptProblems(payload())).toEqual([]);
    expect(looksLikeDescriptionPrompt(payload())).toBe(false);
  });
});

describe('the original positional slices still work (kept, never narrowed)', () => {
  it.each([['0..400', 0], ['3000..3400', 3000]])('the master slice %s in a system block is reported', (_name, at) => {
    expect(reported(MASTER_SYSTEM_PROMPT.slice(at, at + 400))).toBe(true);
  });

  it('the whole master is reported', () => {
    expect(reported(MASTER_SYSTEM_PROMPT)).toBe(true);
  });
});

describe('the helper catches a fragment of NO_IMAGE_DEIXIS_RULE wherever the master puts it (T15 constant, offset-independent)', () => {
  const rule = () => noImageDeixisRule();

  it('the whole rule is reported', () => {
    expect(reported(rule())).toBe(true);
  });

  it('every 300-character fragment of the rule, at stride 37, is reported', () => {
    const text = rule();
    expect(text.length, 'premise: the rule is long enough to slide a window over').toBeGreaterThanOrEqual(400);
    const missed: number[] = [];
    for (let at = 0; at + 300 <= text.length; at += 37) if (!reported(text.slice(at, at + 300))) missed.push(at);
    expect(missed, `fragments at these offsets slipped through: ${missed.join(', ')}`).toEqual([]);
  });

  it('the rule\'s last 300 characters are reported', () => {
    expect(reported(rule().slice(-300))).toBe(true);
  });
});

describe('the helper catches a fragment of LIVELINESS_RULES wherever the master puts it (T16 constant, offset-independent)', () => {
  it('the whole block is reported', () => {
    expect(reported(livelinessRules())).toBe(true);
  });

  it('every 300-character fragment, at stride 37, is reported', () => {
    const text = livelinessRules();
    expect(text.length, 'premise: the block is long enough to slide a window over').toBeGreaterThanOrEqual(400);
    const missed: number[] = [];
    for (let at = 0; at + 300 <= text.length; at += 37) if (!reported(text.slice(at, at + 300))) missed.push(at);
    expect(missed, `fragments at these offsets slipped through: ${missed.join(', ')}`).toEqual([]);
  });
});

describe('the helper catches the text the Story adds to the master by literal (position-independent)', () => {
  it.each([...US91_MASTER_LITERALS])('a system block containing %j is reported as a master leak', literal => {
    expect(reported(`Some FAQ rule. ${literal} and more.`)).toBe(true);
  });

  it('the literals list holds the FR-5, FR-6, FR-8, FR-9, FR-20 and FR-29 anchors, so nobody silently shortens it', () => {
    expect(US91_MASTER_LITERALS).toEqual(expect.arrayContaining([
      '[NO PICTURE REFERENCES',
      'PRECEDING PARAGRAPH',
      'restricts claims ABOUT THE IMAGE',
      'Place every embed directly after a body paragraph of its sub-section',
      'where a store voice block defines its own bullet form',
      "the source's sentences and their order are kept",
      '[Operator Notes]',
    ]));
    expect(US91_MASTER_LITERALS.length).toBeGreaterThanOrEqual(11);
  });
});

/**
 * constants.liveliness.spec.ts - US-9.1 T16 (FR-20, FR-21, AC-8): the shared `LIVELINESS_RULES` constant,
 * including the FR-20 self-scoping sentence (category 19, constant half).
 *
 * SCENE, RHYTHM, HONEST LIMITS and HOOK are ONE shared constant, interpolated (T32, frozen) into the master
 * system prompt so every store receives them; this file pins the CONSTANT. Its reach into Task A for the seven
 * stores, into Task C description translation and into the optimizer is pinned in
 * `master-system-prompt.liveliness.spec.ts`, `task-c.master-reach.spec.ts` and `optimizer.master-reach.spec.ts`.
 *
 * ASSERT PRESENT (Specification FR-20, over whitespace-collapsed text): the SCENE, RHYTHM, HONEST LIMITS and
 * HOOK literals, `[SENTENCE LENGTH]` named as the authority for sentence-length numbers, `apply only where §3
 * exists`, and the three self-scoping strings plus the full VERBATIM sentence (owner, Q-SCOPE, 2026-10-18; ASCII
 * apostrophe).
 *
 * ASSERT ABSENT, AS THE SPECIFICATION WORDS IT (plan-review N10, binding): `9–17`, `9-17`, `at most two
 * consecutive`, `two consecutive sentences`, any digit-range-plus-`word` expression, and NO SENTENCE-LENGTH
 * NUMBER OTHER THAN `6`. This is NOT "the block has no digit": the required literals contain `§1`, `§3` and
 * `<h2>`, which are section references and a tag name. It is applied to the liveliness constant, never to the
 * whole master, whose `[SENTENCE LENGTH]` block carries the per-locale bands.
 *
 * DEFERRED (H-FR20PREC, not written here): the precedence sentence `where a store voice block defines its own
 * bullet form, heading form, tone or punctuation limits, that block wins` is a PROPOSED DEFAULT that the
 * Specification labels unconfirmed. Story AC-8 requires the idea, but the exact words are the human's to
 * confirm; a test of the proposed wording would choose the default for them. See the AC matrix, DEFERRED.
 *
 * Prose beyond the literals is the builder's (H-OD13). The constant is read through
 * `test/fixtures/us91-constants.ts`: type-clean before T16, each test red on its own.
 */
import { describe, it, expect } from 'vitest';
import { STORE_REGISTRY, EXPERT3D_TOV_BASE_OVERLAY, C3D_TOV_BASE_OVERLAY } from './constants';
import {
  livelinessRules, collapse, SELF_SCOPING_STRINGS, SELF_SCOPING_SENTENCE, WATCH_ITEM_FORBIDDEN,
} from '../../test/fixtures/us91-constants';

const text = () => collapse(livelinessRules());

describe('LIVELINESS_RULES - Assert present (FR-20)', () => {
  it.each([
    'open each §3 <h2> section with one short sentence naming the task or constraint the reader faces',
    'a statement, not a question',
    'does not apply to §1',
    'at least one sentence of 6 words or fewer',
    'more than twice per document',
    'surface the non-obvious constraint in the paragraph where it matters',
    '[use-case]',
    'names the task the buyer solves',
    'apply only where §3 exists',
  ])('contains the literal %j', literal => {
    expect(text()).toContain(literal);
  });

  it('names [SENTENCE LENGTH] inside the shared block as the authority for sentence-length numbers', () => {
    expect(text()).toContain('[SENTENCE LENGTH]');
  });
});

describe('LIVELINESS_RULES - the self-scoping sentence, VERBATIM (FR-20, Q-SCOPE; category 19, constant half)', () => {
  it.each(SELF_SCOPING_STRINGS)('contains the Assert-present string %j', literal => {
    expect(text()).toContain(literal);
  });

  it('contains the full sentence VERBATIM (ASCII apostrophe), once', () => {
    expect(text()).toContain(SELF_SCOPING_SENTENCE);
    expect(text().split(SELF_SCOPING_SENTENCE).length - 1).toBe(1);
  });

  it('the superseded v4 wording ("headings" in the kept-list) is not used', () => {
    expect(text()).not.toContain("the source's sentences, headings and order are kept");
  });
});

describe('LIVELINESS_RULES - Assert absent as the Specification words it (FR-20, plan-review N10)', () => {
  it.each(['9–17', '9-17', 'at most two consecutive', 'two consecutive sentences'])('does not contain %j', literal => {
    expect(text()).not.toContain(literal);
  });

  it('contains no digit-range-plus-"word" expression ("N-M words", "N–M-word band")', () => {
    expect(text()).not.toMatch(/\d+\s*[-–]\s*\d+[\s-]*words?\b/i);
  });

  it('states no sentence-length number other than 6 (section references and tag names are not numbers of that kind)', () => {
    const withoutSectionRefsAndTags = text().replace(/§\d+/g, '').replace(/<\/?h\d>/gi, '');
    const numbers = withoutSectionRefsAndTags.match(/\d+/g) ?? [];
    expect(numbers.filter(n => n !== '6'), `numbers found: ${numbers.join(', ')}`).toEqual([]);
    expect(numbers.length, 'the rule "at least one sentence of 6 words or fewer" is the one number').toBeGreaterThanOrEqual(1);
  });
});

describe('LIVELINESS_RULES - static, shared text (NFR-1, NFR-5, D4)', () => {
  it('has no per-store or per-run content: no store name, no currency symbol, no unresolved interpolation', () => {
    const raw = livelinessRules();
    for (const [store, profile] of Object.entries(STORE_REGISTRY)) {
      expect(raw, `store name ${store}`).not.toContain(store);
      expect(raw, `currency symbol ${profile.currencySymbol}`).not.toContain(profile.currencySymbol);
    }
    expect(raw).not.toContain('${');
    expect(raw).not.toContain('undefined');
  });

  it('contains none of §C1 to §C6, CONSUMABLES, "TRANSLATE the generic descriptor", "reorder it category-first", "fit-content" (watch items, R21)', () => {
    expect(livelinessRules()).not.toMatch(WATCH_ITEM_FORBIDDEN);
  });

  it('does not repeat the tone limits of the ToV blocks (FR-21: each block keeps its own; the shared block adds no emotion)', () => {
    expect(text()).not.toContain('Exclamation marks in the body');
    expect(text()).not.toContain('Emotionally neutral: no excitement');
  });
});

describe('FR-21 (T16): each ToV block keeps its own tone limits - preserved text, green on arrival', () => {
  it('EXPERT3D_TOV_BASE_OVERLAY still says "Emotionally neutral: no excitement, no exclamation marks."', () => {
    expect(collapse(EXPERT3D_TOV_BASE_OVERLAY)).toContain('Emotionally neutral: no excitement, no exclamation marks.');
  });

  it.each(['Exclamation marks in the body: ZERO', 'at most 1 per 400 words', 'instructional, calm'])(
    'C3D_TOV_BASE_OVERLAY still contains %j', literal => {
      expect(collapse(C3D_TOV_BASE_OVERLAY)).toContain(literal);
    },
  );
});

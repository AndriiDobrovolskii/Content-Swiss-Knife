/**
 * task-a.user-content.golden.spec.ts - US-9.1 FR-27 / AC-9 / D14: the `userContent` byte oracle.
 *
 * "Today's" `userContent` is a
 * golden captured from the commit the Story branch was cut from, BEFORE any edit to `task-a.ts`
 * (`test/fixtures/golden/task-a-user-content.json`, header `_meta.base`). It holds `userContent` only (plus
 * the Doc-wrapper remainder), so later master / instruction edits can never invalidate it, and it is never
 * regenerated to make a test pass (AGENTS.md section 7.7).
 *
 * TIERS (Specification FR-27, confirmed by the owner, OD-18):
 *  - Tier A (strict): no video embed and no matched marker. `buildPromptA(...).userContent`
 *    equals the golden byte for byte. GREEN ON ARRIVAL and after every task.
 *  - Tier B (equal except the FR-11 spans): the input has a video embed, a matched marker, or both. The
 *    expected text is the golden with the FR-11 OLD span replaced by the NEW span. RED until the owner task
 *    of the span lands: the video span is T22 (task-a.ts T-A2), the marker span is T23 (task-a.ts T-A3).
 *  - Doc wrapper: `buildPromptADoc(...).userContent` starts with the base `userContent` and the remainder
 *    (run facts and, with a hookPattern, the `[§1 HOOK PATTERN]` suffix) equals the golden's remainder, with
 *    and without a hookPattern. GREEN ON ARRIVAL.
 *
 * H-FR11I3 ANSWERED (owner: "accept the proposed default marker block wording exactly as written", Specification v5
 * FR-11 item 3): the marker NEW span is VERBATIM and normative, so the Tier B marker and video+marker cases also
 * assert the exact equality "the golden with the old span(s) replaced by the new span(s)". The prefix / suffix /
 * old-span-absent assertions written before the answer are kept as they were.
 *
 * US-9.1 operator-notes WITHDRAWAL (Story v5, Specification v7; task breakdown P0 / P5): the former "empty
 * notes" block (`withNotes` cast helper and `EMPTY_NOTES`) was removed with the feature it served. Its job is taken
 * over by the FR-44 item 2 block at the end of this file (a stray `operatorNotes` property is inert, and no input
 * of the set yields an `[Operator Notes]` block). The Tier A / Tier B body above is unchanged (FR-27).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPromptA } from './task-a';
import { buildPromptADoc } from './task-a-doc';
import type { ProductInput } from '../app/types';
import {
  USER_CONTENT_CASES, caseNames, buildCase, buildDocCase, docBaseInput, ORACLE_HOOK, type Tier,
} from '../../test/fixtures/task-a-user-content-inputs';

interface GoldenCase { tier: Tier; userContent: string; docRemainder: { noHook: string; withHook: string } }
interface Golden { _meta: { base: string; baseShort: string; taskAChecksumAtBase: string }; cases: Record<string, GoldenCase> }

const GOLDEN: Golden = JSON.parse(
  readFileSync(join(process.cwd(), 'test', 'fixtures', 'golden', 'task-a-user-content.json'), 'utf8'),
);

/** FR-11 item 2: the video span. The new span is VERBATIM from the Specification (composed per the owner's instruction). */
const VIDEO_OLD =
  'Introduce each with its own lead-in <p> in the body language, and place it in §3 FUNCTIONALITY, before §7. The lead-in must not restate the figcaption.';
const VIDEO_NEW =
  'Place each directly after a body paragraph of its sub-section, written in the body language, that states a product fact and does not refer to the video, and place it in §3 FUNCTIONALITY, before §7. That paragraph must not restate the figcaption.';
/** FR-11 item 3: the marker span. The new span is VERBATIM from the Specification (H-FR11I3 answered: accepted as written). */
const MARKER_OLD = 'at the end of the sentence that introduces what the image shows;';
const MARKER_NEW = 'at the end of the paragraph that states the product fact the image belongs to (the paragraph never mentions the picture);';

const namesOf = (tier: Tier) => caseNames().filter(n => GOLDEN.cases[n].tier === tier);
const countOf = (haystack: string, needle: string) => haystack.split(needle).length - 1;

describe('FR-27 oracle - the fixture is a pre-change capture and covers the input set (D14, OD-18)', () => {
  it('the header names a 40-hex BASE commit and the task-a.ts checksum recorded at that commit', () => {
    expect(GOLDEN._meta.base).toMatch(/^[0-9a-f]{40}$/);
    expect(GOLDEN._meta.baseShort).toBe(GOLDEN._meta.base.slice(0, 7));
    expect(GOLDEN._meta.taskAChecksumAtBase).toMatch(/^[0-9a-f]{64}$/);
  });

  it('holds exactly the cases the input file builds (guards against a silently shrunk suite)', () => {
    expect(Object.keys(GOLDEN.cases).sort()).toEqual(caseNames().sort());
  });

  it('covers one store of each STORE_REGISTRY group, Full description and a simplified template, and the three Tier B shapes', () => {
    const groupsCovered = new Set(namesOf('A').map(n => n.split('/')[0]));
    expect([...groupsCovered].sort()).toEqual(['es', 'eu', 'ua', 'us']);
    expect(namesOf('A').some(n => n.includes('/full/'))).toBe(true);
    expect(namesOf('A').some(n => n.includes('/simplified/'))).toBe(true);
    expect(namesOf('A').some(n => USER_CONTENT_CASES[n].input.customInstructions)).toBe(true);
    expect(namesOf('A').some(n => USER_CONTENT_CASES[n].input.imageManifest)).toBe(true);
    expect(namesOf('A').some(n => USER_CONTENT_CASES[n].override)).toBe(true);
    expect(namesOf('B-video').length).toBeGreaterThanOrEqual(2);
    expect(namesOf('B-marker').length).toBeGreaterThanOrEqual(1);
    expect(namesOf('B-both').length).toBeGreaterThanOrEqual(1);
  });

  it('premise: no Tier A golden contains a video manifest or a marker block; every Tier B golden contains the old span(s)', () => {
    for (const n of namesOf('A')) {
      expect(GOLDEN.cases[n].userContent, n).not.toContain('[VIDEO MANIFEST]');
      expect(GOLDEN.cases[n].userContent, n).not.toContain('[IMAGE MARKERS]');
    }
    for (const n of namesOf('B-video')) expect(countOf(GOLDEN.cases[n].userContent, VIDEO_OLD), n).toBe(1);
    for (const n of namesOf('B-marker')) expect(countOf(GOLDEN.cases[n].userContent, MARKER_OLD), n).toBe(1);
    for (const n of namesOf('B-both')) {
      expect(countOf(GOLDEN.cases[n].userContent, VIDEO_OLD), n).toBe(1);
      expect(countOf(GOLDEN.cases[n].userContent, MARKER_OLD), n).toBe(1);
    }
  });
});

describe('FR-27 Tier A - userContent is byte-equal to the pre-change golden (green on arrival, stays green)', () => {
  it.each(namesOf('A'))('%s: buildPromptA(...).userContent equals the golden', name => {
    expect(buildCase(name).userContent === GOLDEN.cases[name].userContent, 'userContent differs from the golden').toBe(true);
  });
});

describe('FR-27 Tier B video (T22, task-a.ts T-A2) - equal to the golden except the FR-11 item 2 span', () => {
  it.each(namesOf('B-video'))('%s: userContent equals the golden with the old video span replaced by the new span', name => {
    const expected = GOLDEN.cases[name].userContent.replace(VIDEO_OLD, VIDEO_NEW);
    expect(buildCase(name).userContent === expected, 'userContent differs from the golden beyond the FR-11 video span').toBe(true);
  });

  it.each(namesOf('B-video'))('%s: the old span is gone and "§3 FUNCTIONALITY, before §7" is intact', name => {
    const built = buildCase(name).userContent;
    expect(built).not.toContain('Introduce each with its own lead-in <p>');
    expect(built).not.toContain('The lead-in must not restate the figcaption.');
    expect(built).toContain('§3 FUNCTIONALITY, before §7');
  });
});

describe('FR-27 Tier B marker (T23, task-a.ts T-A3) - equal to the golden except the FR-11 item 3 span, exact wording', () => {
  it.each(namesOf('B-marker'))('%s: userContent equals the golden with the old marker span replaced by the new span', name => {
    const golden = GOLDEN.cases[name].userContent;
    expect(countOf(golden, MARKER_OLD), 'premise: the golden holds the old span once').toBe(1);
    const expected = golden.replace(MARKER_OLD, MARKER_NEW);
    expect(buildCase(name).userContent === expected, 'userContent differs from the golden beyond the FR-11 marker span').toBe(true);
  });

  it.each(namesOf('B-marker'))('%s: the new span occurs exactly once', name => {
    expect(countOf(buildCase(name).userContent, MARKER_NEW)).toBe(1);
  });

  it.each(namesOf('B-marker'))('%s: everything before and after the old marker span is unchanged and the old span is gone', name => {
    const golden = GOLDEN.cases[name].userContent;
    const at = golden.indexOf(MARKER_OLD);
    const before = golden.slice(0, at);
    const after = golden.slice(at + MARKER_OLD.length);
    const built = buildCase(name).userContent;
    expect(built.startsWith(before), 'text before the marker span changed').toBe(true);
    expect(built.endsWith(after), 'text after the marker span changed').toBe(true);
    expect(built).not.toContain(MARKER_OLD);
  });
});

describe('FR-27 Tier B video + marker - both spans move, nothing else does', () => {
  it.each(namesOf('B-both'))('%s: userContent equals the golden with BOTH old spans replaced by the new spans', name => {
    const expected = GOLDEN.cases[name].userContent.replace(VIDEO_OLD, VIDEO_NEW).replace(MARKER_OLD, MARKER_NEW);
    expect(buildCase(name).userContent === expected, 'userContent differs from the golden beyond the two FR-11 spans').toBe(true);
  });

  it.each(namesOf('B-both'))('%s: the video span is replaced, the marker span is replaced, the rest is unchanged', name => {
    const afterVideo = GOLDEN.cases[name].userContent.replace(VIDEO_OLD, VIDEO_NEW);
    const at = afterVideo.indexOf(MARKER_OLD);
    const before = afterVideo.slice(0, at);
    const after = afterVideo.slice(at + MARKER_OLD.length);
    const built = buildCase(name).userContent;
    expect(built.startsWith(before), 'text before the marker span (video span applied) changed').toBe(true);
    expect(built.endsWith(after), 'text after the marker span changed').toBe(true);
    expect(built).not.toContain(MARKER_OLD);
    expect(built).not.toContain('Introduce each with its own lead-in <p>');
  });
});

describe('FR-27 Doc wrapper - the remainder after the base userContent equals the golden remainder (green on arrival)', () => {
  it.each(caseNames())('%s: without a hookPattern', name => {
    const c = USER_CONTENT_CASES[name];
    const base = buildPromptA(docBaseInput(c), c.override).userContent;
    const doc = buildDocCase(name, false).userContent;
    expect(doc.startsWith(base), 'the Doc userContent no longer starts with the base userContent').toBe(true);
    expect(doc.slice(base.length) === GOLDEN.cases[name].docRemainder.noHook, 'Doc remainder differs').toBe(true);
  });

  it.each(caseNames())('%s: with a hookPattern', name => {
    const c = USER_CONTENT_CASES[name];
    const base = buildPromptA(docBaseInput(c), c.override).userContent;
    const doc = buildDocCase(name, true).userContent;
    expect(doc.startsWith(base), 'the Doc userContent no longer starts with the base userContent').toBe(true);
    expect(doc.slice(base.length) === GOLDEN.cases[name].docRemainder.withHook, 'Doc remainder with hook differs').toBe(true);
  });

  it('the Doc wrapper is a pure function of its input: two builds are identical', () => {
    for (const name of caseNames()) {
      expect(buildDocCase(name, true).userContent).toBe(buildDocCase(name, true).userContent);
      expect(JSON.stringify(buildPromptADoc(USER_CONTENT_CASES[name].input))).toBe(JSON.stringify(buildPromptADoc(USER_CONTENT_CASES[name].input)));
    }
  });
});

// ── FR-44 item 2 (task breakdown P5; owner task T44): the withdrawn [Operator Notes] block is gone from userContent ───────────
//
// Written from the Specification (FR-44 item 2), not from the plan's proposed code:
//  (a) for every input of the FR-27 set, `userContent` of `buildPromptA` and of `buildPromptADoc` (with and without a
//      `hookPattern`) holds no `[Operator Notes]` block;
//  (b) an input that carries a stray, NON-EMPTY `operatorNotes` property (what a browser that ran the withdrawn feature may
//      still hold in a stored history entry) gives a payload byte-identical to the same input without the property.
// The stray property is attached through `unknown` and a `Record<string, unknown>` (never a typed literal), so this block
// compiles BOTH while `ProductInput.operatorNotes` still exists AND after T49 removes it (an uncast literal would fail the tsc
// excess-property check that `npm run lint` runs over test/**). Block (b) is RED until T44 removes the `[Operator Notes]`
// emission from the FROZEN `task-a.ts`; block (a) is green on arrival for inputs without notes and stays so.

const STRAY_VALUES: Array<[string, unknown]> = [
  ['four non-empty strings', {
    usageScenarios: 'STRAY-NOTE-7731: prototyping brackets',
    testResults: 'STRAY-NOTE-7731: printed 40 parts at 0.2 mm',
    previousGenerationComparison: 'STRAY-NOTE-7731: quieter than the previous model',
    limitations: 'STRAY-NOTE-7731: cable required',
  }],
  ['one non-empty key', { limitations: 'STRAY-NOTE-7731: cable required' }],
];

/** Attaches a stray `operatorNotes` through `unknown`: compiles before and after `ProductInput.operatorNotes` is removed (T49). */
const withStrayNotes = (input: ProductInput, value: unknown): ProductInput => {
  const loose: Record<string, unknown> = { ...input, operatorNotes: value };
  return loose as unknown as ProductInput;
};

describe('FR-44 item 2 (a): no input of the FR-27 set yields an [Operator Notes] block in userContent', () => {
  it.each(caseNames())('%s: buildPromptA', name => {
    expect(buildCase(name).userContent).not.toContain('[Operator Notes]');
  });
  it.each(caseNames())('%s: buildPromptADoc without a hookPattern', name => {
    expect(buildDocCase(name, false).userContent).not.toContain('[Operator Notes]');
  });
  it.each(caseNames())('%s: buildPromptADoc with a hookPattern', name => {
    expect(buildDocCase(name, true).userContent).not.toContain('[Operator Notes]');
  });
});

describe.each(STRAY_VALUES)('FR-44 item 2 (b): a stray operatorNotes property (%s) changes no payload', (_label, value) => {
  it.each(caseNames())('%s: buildPromptA payload is byte-identical to the payload without the property', name => {
    const c = USER_CONTENT_CASES[name];
    const withProp = buildPromptA(withStrayNotes(c.input, value), c.override);
    expect(withProp.userContent).not.toContain('STRAY-NOTE-7731');
    expect(JSON.stringify(withProp) === JSON.stringify(buildPromptA(c.input, c.override)), 'a stray operatorNotes reached the payload').toBe(true);
  });

  it.each(caseNames())('%s: buildPromptADoc payload (without and with a hookPattern) is byte-identical to the payload without the property', name => {
    const c = USER_CONTENT_CASES[name];
    for (const withHook of [false, true]) {
      const hookPattern = withHook ? ORACLE_HOOK : undefined;
      const withProp = buildPromptADoc(withStrayNotes(c.input, value), c.override, hookPattern);
      expect(withProp.userContent, `hook=${withHook}`).not.toContain('STRAY-NOTE-7731');
      expect(JSON.stringify(withProp) === JSON.stringify(buildDocCase(name, withHook)), `a stray operatorNotes reached the Doc payload (hook=${withHook})`).toBe(true);
    }
  });
});

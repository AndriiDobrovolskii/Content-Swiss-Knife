/**
 * task-a-doc.v4.spec.ts — US-2.1 validation categories V10 and the structural half of V6.
 *
 * WHY A SECOND SPEC FILE BESIDE `task-a-doc.spec.ts`. That file pins the v3 contract and every test
 * in it is green; two of them — `pins the schema version the validator expects` (`"3.0"`) and the
 * `bullets 3–8` / prose-field clauses — describe text T7 rewrites. Nothing here edits, skips or
 * re-authors any of them: `so-builder` updates the `"3.0"` assertion in that file as part of T7,
 * which is a contract change, not a weakening. Keeping the v4 contract in its own file means the
 * two can be read apart.
 *
 * WHAT IS NOT HERE. The FR-14 hook-pattern parameter rides in `userContent`, and asserting that
 * needs a real `HookPattern` value from `src/prompt-core/hook-pattern.ts`, which T6 creates. That
 * assertion lives in `src/services/content-orchestrator.hook-pattern.spec.ts`, where the service
 * layer that selects the pattern is also under test — importing the missing module here would fail
 * this whole file at load time and report nothing about the prompt contract.
 *
 * ALSO NOT HERE, and it is a real gap rather than an omission: `task-a-doc.ts:18`'s stale "NOT
 * WIRED INTO PRODUCTION" header, which T7 corrects, is a `//` comment. It is not reachable through
 * any export, so no test can assert it. Recorded in the test generation report.
 */
import { describe, it, expect } from 'vitest';

import { buildPromptADoc, TASK_A_DOC_INSTRUCTION } from './task-a-doc';
import { buildPromptA } from './task-a';
import type { ProductInput } from '../app/types';

function input(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    name: 'Ortur H20 20 W',
    website: { name: 'EXPERT3D' },
    description: '<p>Laser engraver.</p>',
    specs: 'Power: 20 W',
    ...overrides,
  } as ProductInput;
}

// ── V10 — the v4 prompt contract ─────────────────────────────────────────────────────────────────

describe('V10 / FR-15 — the Doc instruction pins schemaVersion 4.0 and never 3.0', () => {
  it('asks for "schemaVersion": "4.0"', () => {
    expect(TASK_A_DOC_INSTRUCTION).toContain('"schemaVersion": "4.0"');
  });

  /**
   * FR-30's negative, at the prompt layer: there is no downgrade path, so the model is never shown
   * `"3.0"` as an option. FR-15 makes a `'3.0'` emission from a new generation a defect, which a
   * fallback would turn into a silent violation rather than a graceful degradation.
   */
  it('offers the model no "3.0" anywhere to fall back to', () => {
    expect(TASK_A_DOC_INSTRUCTION).not.toContain('"3.0"');
  });
});

describe('V10 / FR-3, FR-4, FR-17 — §2 is one heading over one merged list of at most 8', () => {
  it('states the combined ceiling of 8 and v4’s target of 6', () => {
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/at most 8|no more than 8|maximum of 8|≤\s*8/i);
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/\b6\b/);
  });

  /**
   * FR-4's composition clause, asserted where the model actually reads the shape: the SHAPE block's
   * `keyBenefits` line. Today it reads `"keyBenefits": [ <Block> ]`, and `<Block>` is defined three
   * lines later as any of paragraph / bullets / figure / video — which is precisely the union D7's
   * schema check now rejects at `['keyBenefits', i, 'kind']`. Asserting on the shape line rather
   * than on a prose phrase keeps the test off T7's wording choices.
   */
  it('no longer offers the full <Block> union for keyBenefits, and names bullets on that line', () => {
    expect(TASK_A_DOC_INSTRUCTION).not.toMatch(/"keyBenefits":\s*\[\s*<Block>/);
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/"keyBenefits":[^\n]*bullets/i);
  });

  /** FR-4's "mobile-First UX (жодних таблиць)" — §2 carries no table at all under v4. */
  it('tells the model §2 carries no table', () => {
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/§\s*2[^]{0,300}?\btable\b/i);
  });

  /** The §2a three-column table is v3's shape; the contract must not still describe it as §2a. */
  it('no longer describes §2 as the two-part «§2a table + §2b benefits» split', () => {
    expect(TASK_A_DOC_INSTRUCTION).not.toMatch(/§2a|§2b/);
  });
});

describe('V10 / FR-9, FR-10 — a §7 spec value is a single string', () => {
  /** The v3 wording this replaces is `:99-103`, "a string, or an array of strings". */
  it('states that specs.categories[].rows[].value is a string, with no array alternative', () => {
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/rows\[\]\.value[^]{0,200}?\bstring\b/i);
    expect(TASK_A_DOC_INSTRUCTION).not.toMatch(/array of strings/i);
  });

  it('tells the model to comma-join a multi-value parameter into that one string', () => {
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/comma[- ]join|join .{0,40}with a comma|comma[- ]separated/i);
  });
});

describe('V10 / FR-27, FR-28 — §3 functionality', () => {
  it('states that §3 is mandatory', () => {
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/§\s*3[^]{0,200}?(mandatory|required|always)/i);
  });

  /**
   * The human's settled Decision 1, at the prompt layer. The schema rejects a one-`<h3>` group
   * (V2); the prompt is what stops the model producing one in the first place, so the repair gate
   * is a backstop rather than the first line of defence.
   */
  it('states that an <h3> opens only when a group has 2 or more distinct sub-functions', () => {
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/2 or more|at least 2|two or more/i);
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/sub-?function/i);
  });

  /** FR-27 point 3 — §3 has no volume limit in any locale, unlike every other section. */
  it('states that §3 carries no word limit', () => {
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/§\s*3[^]{0,300}?(no (word |volume )?limit|unlimited|не встановлюється)/i);
  });

  /** FR-28 — declared unenforced prose by the Specification, so the prompt is its only home. */
  it('forbids restating the same characteristic from one §3 block to the next', () => {
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/duplicat|repeat|paraphras|restate/i);
  });

  /**
   * FR-29 — the functionality bullets floor of 3 is unchanged, and this clause is its prompt-layer
   * mitigation. GREEN ON ARRIVAL (`task-a-doc.ts:110-112`): the assertion is that T7 does NOT
   * delete it while rewriting everything around it.
   */
  it('keeps the paragraph escape hatch that stands in for an under-filled bullets Block', () => {
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/bullets.*must have at least 3 items/i);
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/paragraph.*instead/i);
  });
});

describe('V10 / FR-6, FR-11 — the two code-resident headings, as the model hears them', () => {
  it('tells the model the §6 heading is exactly one of the two strings for its locale', () => {
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/packageContents[^]{0,300}?heading/i);
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/Що в коробці\?/);
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/Що входить до набору\?/);
  });

  /** FR-11 — one localized commercial `<h2>` and exactly one `<p>`. */
  it('states the §9 CTA is a single paragraph under the localized commercial heading', () => {
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/cta[^]{0,300}?(one|single) paragraph/i);
  });

  /**
   * FR-6's conditional half: neither §5 nor §6 may be invented when the input lacks the data.
   * 🔵 CHARACTERIZATION — green on arrival (`task-a-doc.ts:60-61`, "omit when absent"). FR-6 does
   * not change the conditional emission rule; the assertion is that T7 does not lose it.
   */
  it('states that §5 and §6 are emitted only when the source carries that data', () => {
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/compatibility[^]{0,200}?omit|omit .{0,60}absent/i);
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/§\s*5|compatibility/i);
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/§\s*6|packageContents/i);
  });
});

describe('V10 / FR-17.3, FR-18, FR-19 — the word volumes are instructions, never a gate', () => {
  it.each([
    ['§1 hook 40–85', /40\s*[–-]\s*85/],
    ['§2 block 90–300', /90\s*[–-]\s*300/],
    ['§4 applications 80–250', /80\s*[–-]\s*250/],
    ['§9 CTA 50–100', /50\s*[–-]\s*100/],
  ])('carries the %s volume', (_label, pattern) => {
    expect(TASK_A_DOC_INSTRUCTION).toMatch(pattern);
  });

  /**
   * The superseded v3 numerals live in `master-system-prompt.ts` (block 0), not here — this file
   * has never carried a word range at all. Their removal is NI-1..NI-4 and is asserted in
   * `master-system-prompt.v4.spec.ts`, where the assertion is red rather than vacuous.
   */
  /**
   * FR-18 at the prompt layer. Each volume must arrive as an INSTRUCTION, never as a rejection
   * criterion — the clause most easily violated by adding a well-intentioned "or the generation is
   * invalid" beside a range. Checked on the line each range actually sits on, for all four ranges,
   * so it is not a restatement of the four positive assertions above.
   */
  it.each([
    ['§1', /[^\n]*40\s*[–-]\s*85[^\n]*/],
    ['§2', /[^\n]*90\s*[–-]\s*300[^\n]*/],
    ['§4', /[^\n]*80\s*[–-]\s*250[^\n]*/],
    ['§9', /[^\n]*50\s*[–-]\s*100[^\n]*/],
  ])('attaches no rejection language to the %s volume', (label, pattern) => {
    const line = TASK_A_DOC_INSTRUCTION.match(pattern)?.[0] ?? '';
    expect(line, `no ${label} volume line found at all`).toMatch(/\S/);
    expect(line).not.toMatch(/reject|invalid|fails? validation|must be within/i);
  });
});

describe('V10 / FR-23, FR-24 — the media obligations that travel with the §2 merge', () => {
  /**
   * FR-4 displaces figure content out of §2, and §4's schema admits no video — so §3 is the only
   * unconditional destination a displaced embed has (D9). `buildVideoBlock` in FROZEN `task-a.ts`
   * already says so; T7 restates it here so the Doc path does not depend on reading it out of the
   * HTML-path video block, and `task-a.ts` needs no edit.
   */
  it('names §3 as where a video embed goes', () => {
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/§\s*3[^]{0,200}?video|video[^]{0,200}?§\s*3/i);
  });

  /**
   * AGENTS.md §4's "no orphan images" — the one §4 criterion the renderer cannot make unviolatable,
   * because block ordering is the model's. Relocating a figure out of §2 carries the obligation
   * with it.
   */
  it('keeps the lead-in <p> obligation attached to every figure', () => {
    // Not a bare /lead-?in/: the SHAPE block already carries "// optional lead-in" for §4's
    // `blocks`, which would make a loose match pass today for entirely the wrong reason.
    expect(TASK_A_DOC_INSTRUCTION).toMatch(/no orphan|preceded by a[^]{0,40}<p>|lead-in <p>/i);
  });
});

// ── V6 — NFR-1 caching separation, the part that needs no pattern value ──────────────────────────

describe('V6 / NFR-1 — the block layout the frozen builder assembled is preserved', () => {
  /** 🔵 CHARACTERIZATION — green today, and it must stay green through T7. */
  it('keeps buildPromptA’s master block byte-identical, so the cached prefix still hits', () => {
    expect(buildPromptADoc(input()).systemBlocks[0]).toEqual(buildPromptA(input()).systemBlocks[0]);
  });

  it('replaces only index 1, and leaves it cacheable', () => {
    const doc = buildPromptADoc(input());
    expect(doc.systemBlocks[1].text).toBe(TASK_A_DOC_INSTRUCTION);
    expect(doc.systemBlocks.every(b => b.cache === true)).toBe(true);
  });

  /**
   * C-2, in its observable form. The FR-14 parameter must be OPTIONAL in the change that
   * introduces it: `buildPromptADoc` has exactly two call sites and both are two-argument, so a
   * required third parameter breaks the build at T7, before T8 wires the service.
   */
  it('still accepts the two-argument call both existing call sites make', () => {
    expect(() => buildPromptADoc(input())).not.toThrow();
    expect(buildPromptADoc(input()).userContent).toBe(buildPromptA(input()).userContent);
  });
});

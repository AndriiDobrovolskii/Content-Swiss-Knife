/**
 * master-system-prompt.v4.spec.ts — the tests for T12's five negative invariants.
 *
 * 🔴 `src/prompt-core/master-system-prompt.ts` IS FROZEN (AGENTS.md §9) AND ITS PER-FILE APPROVAL
 * WAS GRANTED BY THE HUMAN AT HUMAN_PLAN_APPROVAL (2026-09-21), for T12, together with the
 * obligation that `bash arch-guard.sh --rebaseline` land in the SAME commit. Nothing in this file
 * edits that module; it states what must become true of it.
 *
 * WHY THE TESTS ARE SHAPED AS NEGATIVES. Plan v2's D13 replaced a six-clause line-range table with
 * five invariants, because a line-range enumeration cannot be shown to be exhaustive and that one
 * was not — it missed a clause three lines inside a range it already claimed. The same discipline
 * applies here: each test asserts that a superseded rule is ABSENT FROM THE WHOLE PROMPT, not that
 * six particular lines were edited. An implementer who finds a further clause violating an
 * invariant is inside the approved surface, and these tests will say so.
 *
 * WHY THE PROMPT TEXT AND NOT THE SOURCE FILE. `MASTER_SYSTEM_PROMPT` is `systemBlocks[0]` on every
 * path, and `TASK_A_DOC_INSTRUCTION` says "Every [CONTENT STRUCTURE] rule about WHAT each section
 * contains still applies" (`task-a-doc.ts:41`) — which imports ALL of block 0's content rules into
 * the Doc path. So the subject is the string the model receives, and a `//` comment in the source
 * is deliberately out of reach. That is why human decision 3's `master-system-prompt.ts:6` label is
 * NOT asserted here: line 6 is a source comment. Line 212's
 * `[CONTENT STRUCTURE — Product Description Schema v3.0]` IS in the prompt, and is asserted below.
 *
 * WHAT MUST NOT BE TOUCHED TO MAKE THIS GREEN. `master-system-prompt.spec.ts` pins the §5
 * item-count floor, §7 FLAT SOURCE and the `[VIDEO]` anchor; `constants.spec.ts` flattens the whole
 * prompt and asserts against it. Both stay green WITHOUT being modified — weakening a pin to fit an
 * edit is an AGENTS.md §7.7 violation, not a fix.
 */
import { describe, it, expect } from 'vitest';

import { MASTER_SYSTEM_PROMPT } from './master-system-prompt';

/** Occurrences of a literal, so a failure reports how many are left rather than merely "some". */
const occurrences = (needle: string): number => MASTER_SYSTEM_PROMPT.split(needle).length - 1;

/**
 * One numbered clause of `[CONTENT STRUCTURE]`, e.g. "2. …" up to "3. ".
 *
 * Anchored inside that block rather than on the first "2. " in the prompt: `[BRAND / NAMING]`
 * further up has its own numbered list, and slicing on the document-wide first match reads the
 * wrong text — which is how a §2 assertion can pass while §2 is untouched.
 */
function contentStructureClause(n: number): string {
  const body = MASTER_SYSTEM_PROMPT.slice(MASTER_SYSTEM_PROMPT.indexOf('[CONTENT STRUCTURE'));
  const start = body.search(new RegExp(`^${n}\\. `, 'm'));
  if (start === -1) return '';
  const end = body.search(new RegExp(`^${n + 1}\\. `, 'm'));
  return body.slice(start, end === -1 ? undefined : end);
}

describe('NI-1 / FR-1 — no clause states a §1 hook word range other than 40–85', () => {
  it('has removed every occurrence of the superseded 40–75', () => {
    // Three hits today: the section map (`:27`), the clause head (`:216`) and the restatement
    // three lines INSIDE that clause (`:218`) — the instance that proves a claimed range was not
    // read to its end.
    expect(occurrences('40–75')).toBe(0);
  });

  it('states 40–85 in both the section map and the §1 clause', () => {
    expect(occurrences('40–85')).toBeGreaterThanOrEqual(2);
  });
});

describe('NI-2 / FR-4 — no clause states or implies the v3 §2', () => {
  it('has removed every occurrence of the superseded 90–200', () => {
    expect(occurrences('90–200')).toBe(0);
  });

  /** The §2a three-column table block and its per-locale column headers (`:228-246`). */
  it('no longer prints a §2 Killer Specs table template', () => {
    expect(MASTER_SYSTEM_PROMPT).not.toContain('<th>Specification</th><th>Value</th><th>Why it matters</th>');
    expect(MASTER_SYSTEM_PROMPT).not.toMatch(/Killer Specs table/i);
  });

  /** `:226-227` — "heading level none, wrapper none" is what denies §2 the `<h2>` FR-4 requires. */
  it('no longer says §2 carries no heading and no wrapper', () => {
    expect(contentStructureClause(2)).not.toMatch(/heading level none/i);
  });

  /** `:247-248` — a `<p>` per benefit is exactly what T3 rejects at `['keyBenefits', i, 'kind']`. */
  it('no longer offers a <p> per benefit', () => {
    expect(MASTER_SYSTEM_PROMPT).not.toMatch(/one <p> or <ul><li> per benefit/i);
  });

  /** `:459-461` — the `[IMAGE HANDLING]` block routes leftover figures into §2, which FR-4 forbids. */
  it('no longer routes a figure into §2 body text, nor weaves figures into §2 prose', () => {
    expect(MASTER_SYSTEM_PROMPT).not.toMatch(/§2 body text/i);
    expect(MASTER_SYSTEM_PROMPT).not.toMatch(/weave all figures into §2/i);
  });

  it('states the merged §2 shape — one heading over one list, and no table', () => {
    const clause = contentStructureClause(2);
    expect(clause, 'the §2 clause of [CONTENT STRUCTURE] could not be located').toMatch(/\S/);
    expect(clause).toMatch(/<ul>|<li>/);
    expect(clause).not.toMatch(/<table>/);
  });
});

describe('NI-3 / FR-27 — no clause states a §3 word range', () => {
  it('has removed every occurrence of the superseded 150–2,000', () => {
    expect(occurrences('150–2,000')).toBe(0);
  });

  /**
   * Tier-2 `:42`. "compress the narrative sections (§1, §3, §4) toward their lower word bounds"
   * names a bound §3 no longer has. §1 and §4 keep theirs, so the clause survives with §3 dropped
   * rather than being deleted.
   */
  it('no longer asks the model to compress §3 toward a lower word bound it no longer has', () => {
    expect(MASTER_SYSTEM_PROMPT).not.toContain('(§1, §3, §4) toward their lower word bounds');
    expect(MASTER_SYSTEM_PROMPT).toMatch(/toward their lower word bounds/);
  });
});

describe('NI-4 / FR-11 — the §9 range reads 50–100 and the uk-UA template is the «варто» form', () => {
  it('has removed every occurrence of the superseded 80–150', () => {
    expect(occurrences('80–150')).toBe(0);
  });

  it('states 50–100 for §9, in the section map and in the clause', () => {
    expect(occurrences('50–100')).toBeGreaterThanOrEqual(2);
  });

  /**
   * `:356`. Block 0 is the only authority there is for a §9 word volume (FR-17.3 makes volumes
   * prompt-only), and it currently states the wrong number AND the superseded template. Because
   * `task-c.ts:87` imports this constant, the stale template primes the TRANSLATION path for all
   * nine locales too.
   */
  it('carries the v4 uk-UA CTA template and not the superseded «Чому купити» one', () => {
    expect(MASTER_SYSTEM_PROMPT).toContain('Чому варто купити [Product-short] в [Store]?');
    expect(MASTER_SYSTEM_PROMPT).not.toContain('"Чому купити [Product-short] в [Store]?"');
  });
});

describe('NI-5 / FR-6 — §6 states no heading text and no <ul>', () => {
  /** `:296` — the heading is code-resident per FR-6 / D4 / D5; the prompt must not author one. */
  it('no longer prints a §6 heading string', () => {
    expect(MASTER_SYSTEM_PROMPT).not.toMatch(/What's in the box<\/h2>/i);
  });

  /**
   * `:32`, the in-band section map — reachable only by reading that map as a unit, which is the
   * sweep a line-range method cannot perform. §6 is an `<ol>` under D17.
   */
  it('no longer describes §6 as 1 <h2> + 1 <ul> in the section map', () => {
    const sectionMapLine = MASTER_SYSTEM_PROMPT.split('\n').find(l => /§6 PACKAGE CONTENTS/.test(l)) ?? '';
    expect(sectionMapLine, 'the §6 section-map line is missing entirely').toMatch(/\S/);
    expect(sectionMapLine).not.toContain('<ul>');
  });
});

describe('T12 tier 2 — the six consistency repairs', () => {
  /** `:103` — §7 is the only table left, so "Killer Specs and §7 alike" names a construct that went. */
  it('scopes the plain-HTML table instruction to §7 alone', () => {
    expect(MASTER_SYSTEM_PROMPT).not.toContain('Killer Specs and §7 alike');
  });

  /** `:153-154` — v4 routes §2's killer-spec parameters into a `<ul>`, so "all parameters" is false. */
  it('no longer routes ALL parameters into tables', () => {
    expect(MASTER_SYSTEM_PROMPT).not.toContain('route all\n  parameters into tables');
    expect(MASTER_SYSTEM_PROMPT).not.toMatch(/route all\s+parameters into tables/);
  });

  /** `:221` — the rule (give every number one home) survives; only the destination is renamed. */
  it('keeps the give-every-number-one-home rule while renaming its destination', () => {
    expect(MASTER_SYSTEM_PROMPT).toMatch(/Give every number a\s+single home/);
    expect(MASTER_SYSTEM_PROMPT).not.toMatch(/destined for the Killer Specs table/);
  });

  /** `:309` — §7's column-header block back-references a §2 table that no longer exists. */
  it('states §7’s column convention without referring back to a §2 table', () => {
    expect(MASTER_SYSTEM_PROMPT).not.toMatch(/matching the §2 table's\s+convention/);
  });

  /**
   * 🔵 THE ONE POSITIVE CHECK, AND THE REASON IT EXISTS. COLON CAPITALIZATION and BOLD-LABEL
   * SEPARATION (`:270-272`) are scoped to "§2b", a label the edit removes — but both rules still
   * govern the merged §2 `<li><b>…</b>…</li>` items, and T5's `bold-label-glue` clearance argument
   * DEPENDS on BOLD-LABEL SEPARATION surviving. Deleting live coverage to tidy a stale label is an
   * AGENTS.md §7.7-class move. GREEN ON ARRIVAL: this asserts a relabel, not a deletion.
   */
  it('keeps COLON CAPITALIZATION and BOLD-LABEL SEPARATION in the prompt', () => {
    expect(MASTER_SYSTEM_PROMPT).toContain('COLON CAPITALIZATION');
    expect(MASTER_SYSTEM_PROMPT).toContain('BOLD-LABEL SEPARATION');
  });

  it('no longer scopes either of those two rules to the retired «§2b» label', () => {
    expect(MASTER_SYSTEM_PROMPT).not.toMatch(/§2b/);
  });
});

describe('The schema label the human fixed at HUMAN_PLAN_APPROVAL', () => {
  /**
   * Human decision 3. `master-system-prompt.ts:212` is IN the prompt text, so it is assertable;
   * `:6` is a source comment and is not — see this file's header.
   */
  it('names the content structure Schema v4.0', () => {
    expect(MASTER_SYSTEM_PROMPT).toContain('[CONTENT STRUCTURE — Product Description Schema v4.0]');
    expect(MASTER_SYSTEM_PROMPT).not.toContain('Schema v3.0');
  });
});

describe('Explicitly NOT in the §9 request — swept, and confirmed to agree with v4', () => {
  /**
   * D13's exclusion list, asserted so a later reader does not re-open a closed clause and so an
   * over-broad edit is caught. Each of these is a rule the edit must LEAVE ALONE.
   * 🔵 ALL GREEN ON ARRIVAL — they are guards against collateral damage, not new behaviour.
   */
  it.each([
    ['the 25,000-character document cap', '25,000 characters'],
    ['§4’s 80–250 volume and 4–8 entries', '80–250'],
    ['§5’s conditional 30–100', '30–100'],
    ['§6’s conditional emission rule', 'CONDITIONAL'],
  ])('leaves %s in place', (_label, needle) => {
    expect(MASTER_SYSTEM_PROMPT).toContain(needle);
  });

  /**
   * D4 consequence 1 restated as a check on block 0: `:133-136`'s "AT MOST TWO <h2> … may contain
   * [Product-short]" stays TRUE without an edit, because the new §2 heading is nominal and
   * product-free. If the edit ever gave §2 a product-named heading, this clause would have to
   * change too — and it must not.
   */
  it('keeps the AT MOST TWO product-named <h2> budget unchanged', () => {
    expect(MASTER_SYSTEM_PROMPT).toMatch(/AT MOST TWO/);
  });

  it('keeps the multi-value comma-join rule and the video-in-§3 placement', () => {
    expect(MASTER_SYSTEM_PROMPT).toMatch(/ONE comma-separated string/i);
    expect(MASTER_SYSTEM_PROMPT).toMatch(/§3 FUNCTIONALITY/);
  });
});

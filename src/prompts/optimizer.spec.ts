import { describe, it, expect } from 'vitest';
import { buildOptimizerPrompt } from './optimizer';

describe('buildOptimizerPrompt', () => {
  const html = '<p>Some input HTML.</p>';

  it('userContent matches the pre-selector shape: [INPUT HTML] header + the raw input', () => {
    const payload = buildOptimizerPrompt(html);
    expect(payload.userContent).toBe(
      `[INPUT HTML] — existing description to restructure and optimize:\n${html}`,
    );
  });

  it('adds a [Product Name] line when productName is provided', () => {
    const payload = buildOptimizerPrompt(html, 'xTool F2');
    expect(payload.userContent).toBe(
      `[INPUT HTML] — existing description to restructure and optimize:\n[Product Name]: xTool F2\n${html}`,
    );
  });

  it('systemBlocks stay byte-identical across calls (still cache-stable)', () => {
    const noName = buildOptimizerPrompt(html);
    const withName = buildOptimizerPrompt(html, 'xTool F2');
    expect(withName.systemBlocks).toEqual(noName.systemBlocks);
    expect(withName.systemBlocks[0].cache).toBe(true);
    expect(withName.systemBlocks[1].cache).toBe(true);
  });

  it('the cached task instruction carries a hard OUTPUT LANGUAGE constraint', () => {
    const payload = buildOptimizerPrompt(html);
    const taskInstruction = payload.systemBlocks[1].text;
    expect(taskInstruction).toContain('OUTPUT LANGUAGE (HARD CONSTRAINT)');
    expect(taskInstruction).toContain('Write 100% of the');
    expect(taskInstruction).toContain('output in that one language');
    expect(taskInstruction).toContain('zero');
    expect(taskInstruction).toContain('language switching partway through');
  });

  it('the OUTPUT LANGUAGE constraint explicitly excludes brand/domain names as a language signal', () => {
    const payload = buildOptimizerPrompt(html);
    const taskInstruction = payload.systemBlocks[1].text;
    expect(taskInstruction).toContain('Do NOT let brand names, company names, or any URL\'s domain/path');
  });
});

/**
 * US-2.1 — the Optimizer follows v4, by a HUMAN DECISION RECORDED AT HUMAN_PLAN_APPROVAL (2026-09-21).
 *
 * 🔴 THIS IS TRACED TO NO FR AND NO AC, DELIBERATELY. The approved Specification does not reach
 * `src/prompts/optimizer.ts`; the human directed this change as a consequence of the shared-prompt
 * edit, and it is recorded in `docs/tests/US-2.1-test-generation-report.md` as a recorded human
 * decision so RECONCILIATION does not later read it as untraced scope creep.
 *
 * WHY IT NEEDED A TEST AT ALL. `optimizer.ts` reuses `MASTER_SYSTEM_PROMPT`'s `[CONTENT STRUCTURE]`
 * as its target shape, and its own task instruction then depends BY NAME on constructs v4 deletes —
 * "the §2a Killer Specs highlight table (3–4 rows, Specification / Value / Why it matters)" at
 * `:53`, "keep the §2a highlight table additive" at `:61`, "§2a/§7 column headers" at `:21` and
 * "both the §2a highlight table and the full §7 table" at `:40`. After T12 makes NI-2 true of the
 * master, those clauses name a table the schema it points at no longer has. The existing suite
 * above passes either way, so it could not have caught this.
 *
 * WHAT THE DECISION REQUIRES: the instruction is SEMANTICALLY REWRITTEN for v4, not renamed — the
 * model must be told to transform any legacy §2a table into the single merged `<ul>` of at most 8
 * items, to format §6 as an `<ol>`, and to comma-join multi-value §7 cells.
 *
 * NOT ASSERTED, AND IT IS A REAL GAP: human decision 3 also relabels `optimizer.ts:6` to
 * "Schema v4.0". Line 6 is inside a `//` comment block and is not reachable through
 * `buildOptimizerPrompt`, so no test can observe it. The label at `:49`, which IS in the emitted
 * instruction, is asserted below.
 */
describe('buildOptimizerPrompt — the v4 target shape (recorded human decision, 2026-09-21)', () => {
  const instruction = () => buildOptimizerPrompt('<p>Some input HTML.</p>').systemBlocks[1].text;

  it('names the target schema v4.0, not v3.0', () => {
    expect(instruction()).toContain('Schema v4.0');
    expect(instruction()).not.toContain('Schema v3.0');
  });

  it('no longer directs the model to reproduce a §2a Killer Specs highlight table', () => {
    const text = instruction();
    expect(text).not.toMatch(/§2a/);
    expect(text).not.toMatch(/highlight table/i);
    expect(text).not.toMatch(/Specification \/ Value \/ Why it matters/);
  });

  it('tells the model to merge a legacy §2 table into one <ul> of at most 8 items', () => {
    const text = instruction();
    expect(text).toMatch(/<ul>|<li>/);
    expect(text).toMatch(/at most 8|no more than 8|maximum of 8|≤\s*8/i);
  });

  it('tells the model to format §6 package contents as an <ol>', () => {
    const text = instruction();
    expect(text).toMatch(/<ol>/);
    expect(text).toMatch(/§\s*6|package contents/i);
  });

  it('tells the model to comma-join a multi-value §7 cell into one row', () => {
    expect(instruction()).toMatch(/comma[- ]join|comma[- ]separated/i);
  });

  /** The rewrite must not disturb what the existing suite above pins — caching included. */
  it('keeps both system blocks cacheable and byte-stable', () => {
    const a = buildOptimizerPrompt('<p>A.</p>');
    const b = buildOptimizerPrompt('<p>B.</p>');
    expect(a.systemBlocks).toEqual(b.systemBlocks);
    expect(a.systemBlocks.every(block => block.cache === true)).toBe(true);
  });
});

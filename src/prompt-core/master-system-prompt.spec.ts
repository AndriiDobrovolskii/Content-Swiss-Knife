/**
 * master-system-prompt.spec.ts
 *
 * Regression guard for the §7 COMPLETENESS Product Name exclusion clause — resolves the "does
 * Product Name count toward input row count" ambiguity flagged during the Ortur H20
 * spec-row-not-grounded investigation. Text-presence assertions only, against a
 * whitespace-normalized copy of the prompt so line-wrap/reformatting changes don't false-positive
 * this test; MASTER_SYSTEM_PROMPT is a static heredoc string, not independently invokable.
 */

import { describe, it, expect } from 'vitest';
import { MASTER_SYSTEM_PROMPT } from './master-system-prompt';

const normalized = MASTER_SYSTEM_PROMPT.replace(/\s+/g, ' ');

/**
 * §7 FLAT SOURCE rule — added after the Center 3D Print / Ortur H20 collapse (2026-07-26), where
 * a flat 15-row source spec list produced one catch-all category. The old COMPLETENESS wording
 * ("count categories & rows first, emit exactly that many") reads, for uncategorized input, as
 * "emit one category"; EXPERT3D grouped anyway, but that was model inference, not instruction.
 */
describe('MASTER_SYSTEM_PROMPT — §7 FLAT SOURCE: semantic grouping', () => {
  it('forbids a single catch-all category when the source supplies no categories', () => {
    expect(normalized).toMatch(/FLAT SOURCE \(no categories given\)/i);
    expect(normalized).toMatch(/do NOT emit a single catch-all category/i);
  });

  it('states the 3–6 category target with a minimum row count per category', () => {
    expect(normalized).toMatch(/Emit 3[–-]6 categories, each its own <h3> \+ table/i);
    expect(normalized).toMatch(/each holding at least 3 rows/i);
  });

  it('requires category names in the target output language, not the English exemplars', () => {
    expect(normalized).toMatch(/Write each category name in the TARGET OUTPUT LANGUAGE/i);
    expect(normalized).toMatch(/name the CONCEPT, they are never the literal label to emit/i);
  });

  it('scopes the rule to uncategorized input only, deferring to COMPLETENESS otherwise', () => {
    expect(normalized).toMatch(/applies ONLY when the input supplies no categories of its own/i);
  });

  it('forbids grouping from altering labels, values, units or the row count', () => {
    expect(normalized).toMatch(
      /never changes a row's label, value, unit, or the total row count/i);
  });
});

describe('MASTER_SYSTEM_PROMPT — §7 COMPLETENESS: Product Name row exclusion', () => {
  it('instructs excluding a Product Name/Title/Model row from the §7 count and output', () => {
    expect(normalized).toMatch(/EXCLUDE a Product Name \/ Title \/ Model-identifier row/i);
  });

  it('states the row belongs to the H1, not §7', () => {
    expect(normalized).toMatch(/belongs to the H1, never to §7/i);
  });

  it('states the count is unaffected when no such row exists in the input', () => {
    expect(normalized).toMatch(/nothing changes: every remaining row counts/i);
  });
});

describe('MASTER_SYSTEM_PROMPT — [VIDEO]: a real anchor and a real obligation', () => {
  it('no longer points the embed at "Deep Dive", a section that does not exist', () => {
    // The §1–§9 schema never had a section by that name, so the one placement instruction for
    // video addressed nowhere. This is the root of the dropped-iframe bug.
    expect(normalized).not.toMatch(/Deep Dive/i);
  });

  it('anchors the iframe in §3 and keeps it ahead of §7', () => {
    expect(normalized).toMatch(/place it in §3 FUNCTIONALITY/i);
    expect(normalized).toMatch(/before\s+§7 TECHNICAL SPECIFICATIONS/i);
  });

  it('states that an embed in the input is mandatory in the output', () => {
    expect(normalized).toMatch(/MANDATORY WHEN PRESENT/);
    expect(normalized).toMatch(/never a way to save characters against the global cap/i);
  });

  it('lists the video in the OUTPUT CONTRACT, which claims to be complete', () => {
    expect(normalized).toMatch(/VIDEO EMBED — conditional/i);
  });

  it('admits the attributes an iframe needs, despite the body whitelist', () => {
    // "preserve verbatim" contradicted the whitelist, which excluded exactly the attributes
    // without which a YouTube embed does not play.
    expect(normalized).toMatch(/EXCEPTION — <iframe>/);
    for (const attr of ['title', 'allow', 'allowfullscreen', 'referrerpolicy']) {
      expect(normalized).toContain(attr);
    }
  });
});

/**
 * §5 LIST COMPATIBILITY — item-count floor. Added after a real generation
 * (Ortur R2 1.3W IR, 2 confirmed compatible accessories) failed outright: the schema requires at
 * least 3 items in a bullets list, but §5 told the model only to include source-confirmed items,
 * with no floor — unlike §4 Applications, which states its own "Write 4–8 entries". The model
 * correctly wrote 2 items rather than fabricate a 3rd, the schema rejected the document, and the
 * repair loop had no way to satisfy a constraint that required inventing data. See
 * description-doc.schema.spec.ts's "§5 compatibility — relaxed bullets floor" for the schema-side
 * half of this fix.
 */
describe('MASTER_SYSTEM_PROMPT — §5 LIST COMPATIBILITY: item-count floor', () => {
  it('states the 3-item floor for lists in this section', () => {
    expect(normalized).toMatch(/Lists in this section need at least 3 entries/i);
  });

  it('routes a sub-3-item case to a paragraph instead of padding the list', () => {
    expect(normalized).toMatch(/When fewer than 3 source-confirmed\s+items exist, do not pad the list/i);
    expect(normalized).toMatch(/write one short paragraph instead \(no <ul>\)/i);
  });
});

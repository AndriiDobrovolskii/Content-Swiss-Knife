import { describe, it, expect } from 'vitest';
import { buildPromptB } from './task-b';
import { validateSeoMetadata } from '../utils/output-validator';

/**
 * The prompt↔validator agreement guard.
 *
 * This is the bug that shipped: the prompt authorized "Title ≤ 60" for six locales while
 * validateSeoMetadata rejects anything over a FLAT 55. A production run then failed
 * meta-title-length at "SEO meta (en-GB)" with 57 characters — the model obeying its instruction
 * exactly and being punished for it. Nothing in the suite noticed, because nothing compared the two.
 *
 * The assertion is deliberately BEHAVIOURAL — it runs the real validator rather than importing a
 * constant. MAX_META_TITLE is private to the frozen output-validator.ts, and exporting it just to
 * test it would mean touching a second frozen file. Driving the validator proves the property that
 * actually matters: nothing the prompt permits can fail the gate.
 */
describe('meta_title budgets never exceed what the validator accepts', () => {
  const prompt = buildPromptB('Expert-3DPrinter', 'X', ['en-US']).systemBlocks.map(b => b.text).join('\n');

  // Rows read "  en-GB, en-US, en-ES : Title ≤ 48 | Desc ≤ 150".
  const rows = [...prompt.matchAll(/^\s{2}([\w-]+(?:, [\w-]+)*|\(any other locale\))\s*: Title ≤ (\d+)/gm)];

  it('parses every budget row from the prompt', () => {
    expect(rows.length).toBeGreaterThanOrEqual(6);
  });

  it.each(rows.map(r => [r[1].trim(), Number(r[2])]))(
    'a title at the full %s budget (%i chars) passes the validator',
    (_locales, budget) => {
      const issues = validateSeoMetadata(
        { site_name: 'S', seo_data: [{ language: 'en-GB', h1: 'h', meta_title: 'x'.repeat(budget), meta_description: 'd ➔' }] } as never,
        '',
      );
      expect(issues.filter(i => i.rule === 'meta-title-length')).toHaveLength(0);
    },
  );

  /**
   * RECALIBRATED for US-3.1 T10 (FR-13(c), OD-8; AGENTS.md §7.7). The property this test guarded
   * — "the model has real margin to overshoot" — is no longer true by design: OD-8 accepts a
   * 1-character margin against the untouched 55-char ceiling for the general-row budgets (4 for
   * de-DE), because es-ES's own approved-template reference example (53 characters) already
   * leaves no room under a stricter budget. Swapping in a new heuristic that merely *sounds*
   * similar (e.g. some other percentage) would misstate what the Specification actually accepts,
   * so this is renamed and recalibrated to check the two things that remain true and are worth
   * guarding: (1) each row's budget equals its Specification-stated value EXACTLY — ceiling − 1 for
   * the general rows, ceiling − 4 for de-DE — sourced from FR-13(c)'s own numbers, not a proxy
   * percentage; and (2) the relational invariant that de-DE's budget stays strictly tighter than
   * the general rows' (preserving `task-b.ts`'s own deliberate "German runs longer" design intent).
   * This still catches a real regression — a locale accidentally left at the old ≤48/≤45 numbers,
   * budgets that collapse the de-DE gap, or a budget that crosses 55 — without claiming a margin
   * the Specification no longer provides.
   */
  it('every budget equals ceiling-1 (general rows) or ceiling-4 (de-DE) exactly — the reconciled OD-8 numbers', () => {
    const fails = (n: number) => validateSeoMetadata(
      { site_name: 'S', seo_data: [{ language: 'en-GB', h1: 'h', meta_title: 'x'.repeat(n), meta_description: 'd ➔' }] } as never,
      '',
    ).some(i => i.rule === 'meta-title-length');

    let ceiling = 0;
    for (let n = 1; n <= 200; n++) if (!fails(n)) ceiling = n;
    expect(ceiling).toBe(55); // the untouched, FROZEN output-validator.ts ceiling

    const deDeRows = rows.filter(r => /de-DE/i.test(r[1]));
    const generalRows = rows.filter(r => !/de-DE/i.test(r[1]));
    expect(deDeRows.length).toBeGreaterThan(0);
    expect(generalRows.length).toBeGreaterThan(0);

    for (const [locales, budgetStr] of generalRows) {
      expect(Number(budgetStr), `general row "${locales}"`).toBe(ceiling - 1); // 54
    }
    for (const [locales, budgetStr] of deDeRows) {
      expect(Number(budgetStr), `de-DE row "${locales}"`).toBe(ceiling - 4); // 51
    }
  });

  it('de-DE stays strictly tighter than every general row (the deliberate "German runs longer" gap is preserved)', () => {
    const deDeBudget = Math.min(...rows.filter(r => /de-DE/i.test(r[1])).map(r => Number(r[2])));
    const generalBudgets = rows.filter(r => !/de-DE/i.test(r[1])).map(r => Number(r[2]));
    for (const b of generalBudgets) expect(deDeBudget).toBeLessThan(b);
  });

  it('never demonstrates an over-budget title as a ✓ example', () => {
    // The anchors are the strongest signal in the prompt. A ✓ example above its own budget teaches
    // the model to exceed it, which no budget line can undo.
    const anchors = [...prompt.matchAll(/^\s+(?:meta_title|step \d result):\s+"([^"]+)"\s+\[(?:≈)?(\d+) ✓/gm)];
    expect(anchors.length).toBeGreaterThanOrEqual(4);
    for (const [, title, claimed] of anchors) {
      // The bracketed count must be truthful, and within the tightest budget in the table.
      expect([...title].length, `stated count for "${title}"`).toBe(Number(claimed));
      expect([...title].length, `"${title}" vs tightest budget`)
        .toBeLessThanOrEqual(Math.min(...rows.map(r => Number(r[2]))));
    }
  });
});

describe('buildPromptB', () => {
  const STORE = 'Expert-3DPrinter';  // valid store in STORE_REGISTRY (en-US + uk-UA languages)
  const PRODUCT = 'Bambu Lab X1C';
  const LANGS = ['en-US', 'uk-UA'];

  it('includes LOCALIZED NAMES block when localizedNames provided', () => {
    const payload = buildPromptB(STORE, PRODUCT, LANGS, undefined, {
      'en-US': 'Bambu Lab X1C',
      'uk-UA': 'Принтер Bambu Lab X1C',
    });
    expect(payload.userContent).toContain('[LOCALIZED NAMES — use VERBATIM as h1 + title core, one per locale]:');
    expect(payload.userContent).toContain('  en-US: "Bambu Lab X1C"');
    expect(payload.userContent).toContain('  uk-UA: "Принтер Bambu Lab X1C"');
  });

  it('uses fallback label for locales missing from localizedNames', () => {
    const payload = buildPromptB(STORE, PRODUCT, LANGS, undefined, {
      'en-US': 'Bambu Lab X1C',
      // uk-UA intentionally absent
    });
    expect(payload.userContent).toContain('  uk-UA: "(none — use formula fallback)"');
  });

  it('omits LOCALIZED NAMES block when localizedNames is undefined', () => {
    const payload = buildPromptB(STORE, PRODUCT, LANGS);
    expect(payload.userContent).not.toContain('[LOCALIZED NAMES');
  });

  it('omits LOCALIZED NAMES block when localizedNames is empty object', () => {
    const payload = buildPromptB(STORE, PRODUCT, LANGS, undefined, {});
    expect(payload.userContent).not.toContain('[LOCALIZED NAMES');
  });

  it('systemBlocks are identical regardless of localizedNames (cache stability)', () => {
    const without = buildPromptB(STORE, PRODUCT, LANGS);
    const with_ = buildPromptB(STORE, PRODUCT, LANGS, undefined, { 'en-US': 'X' });
    expect(without.systemBlocks[0].text).toBe(with_.systemBlocks[0].text);
    expect(without.systemBlocks[1].text).toBe(with_.systemBlocks[1].text);
  });

  it('systemBlocks have cache:true on both blocks', () => {
    const payload = buildPromptB(STORE, PRODUCT, LANGS);
    expect(payload.systemBlocks).toHaveLength(2);
    expect(payload.systemBlocks[0].cache).toBe(true);
    expect(payload.systemBlocks[1].cache).toBe(true);
  });

  it('localizedNames block appears after [Target Languages] and before [CONTEXT]', () => {
    const payload = buildPromptB(STORE, PRODUCT, LANGS, 'some html context', {
      'en-US': 'X',
      'uk-UA': 'Х',
    });
    const namesIdx = payload.userContent.indexOf('[LOCALIZED NAMES');
    const ctxIdx = payload.userContent.indexOf('[CONTEXT');
    const langsIdx = payload.userContent.indexOf('[Target Languages]');
    expect(namesIdx).toBeGreaterThan(langsIdx);
    expect(namesIdx).toBeLessThan(ctxIdx);
  });

  /**
   * US-3.1 T10, D11(a)/(a) continued (FR-13(a)). `buildPromptB()`'s excerpt-construction code
   * (lines 112-140) replaces the blind `contextHtmlOrDescription.substring(0, 1000)` truncation
   * with a two-slice construction: a description containing the literal production marker
   * `<section class="specs">` pulls a ≤500-char prose slice PLUS a ≤500-char slice from that
   * section; a description without one (the `generateSeoMetadata()` call site, which passes
   * plain-text `input.description`) pulls the full 1000-char prose slice, BYTE-IDENTICAL to
   * today's behaviour on that one call site — not a regression.
   */
  describe('FR-13(a) — buildPromptB() excerpt widening', () => {
    it('a context containing <section class="specs"> pulls a prose slice AND a specs slice', () => {
      const prose = 'P'.repeat(600);
      const specsBlock = `<section class="specs"><table><tr><td>Weight</td><td>500 g</td></tr></table></section>`;
      const context = `${prose}${specsBlock}`;
      const payload = buildPromptB(STORE, PRODUCT, LANGS, context);
      expect(payload.userContent).toContain('Weight');
      expect(payload.userContent).toContain('500 g');
      // The prose slice is capped at 500 in this branch, not the full 600.
      expect(payload.userContent).not.toContain('P'.repeat(600));
    });

    it('a context with NO <section class="specs"> pulls the full 1000-char prose slice, unchanged from today', () => {
      const context = 'X'.repeat(1200);
      const payload = buildPromptB(STORE, PRODUCT, LANGS, context);
      expect(payload.userContent).toContain('X'.repeat(1000));
      expect(payload.userContent).not.toContain('X'.repeat(1001));
    });

    it('the [CONTEXT] label still begins with the literal substring "[CONTEXT" (block-order test\'s own anchor)', () => {
      const payload = buildPromptB(STORE, PRODUCT, LANGS, 'plain description context');
      const idx = payload.userContent.indexOf('[CONTEXT');
      expect(idx).toBeGreaterThan(-1);
    });

    it('the [CONTEXT] label now names [Localized Category] and [Spec] as what to extract, not a bare USP/spec', () => {
      const payload = buildPromptB(STORE, PRODUCT, LANGS, 'plain description context');
      const label = payload.userContent.slice(payload.userContent.indexOf('[CONTEXT'), payload.userContent.indexOf('[CONTEXT') + 120);
      expect(label).toMatch(/\[Localized Category\]/);
      expect(label).toMatch(/\[Spec\]/);
    });
  });
});

/**
 * US-3.1 T10 (FR-13(a)/(b)/(c)/(d)) — the rewritten "— meta_title —" block (TASK_B_INSTRUCTION,
 * lines 39-51) and its four few-shot anchors (lines 81-106), all under OD-3+OD-7+OD-9's combined
 * §9 authorization.
 */
describe('TASK_B_INSTRUCTION — meta_title block (T10, FR-13(a)-(d))', () => {
  const promptText = buildPromptB('Expert-3DPrinter', 'X', ['en-US']).systemBlocks.map(b => b.text).join('\n');

  it('(a) defines [Localized Category] and [Spec] — the undefined [Benefit] placeholder is gone', () => {
    expect(promptText).not.toMatch(/\[Benefit\]/);
    expect(promptText).toMatch(/\[Localized Category\]/);
    expect(promptText).toMatch(/\[Spec\]/);
  });

  it('(d) meta_title never carries a mandatory or default site-name suffix — neither line 44\'s nor line 47\'s mandate survives', () => {
    // Line 44's old sentence.
    expect(promptText).not.toMatch(/\[Site Suffix\] is MANDATORY/i);
    // Line 47's old, second, independent suffix-retention instruction.
    expect(promptText).not.toMatch(/KEEP suffix/i);
    expect(promptText).toMatch(/meta_title[\s\S]{0,200}NEVER[\s\S]{0,60}site-name suffix/i);
  });

  it('(d) the site_name-sourcing sentence survives, re-scoped to the JSON\'s site_name field only', () => {
    // The ONLY instruction anywhere in TASK_B_INSTRUCTION for how the model derives the JSON's
    // own top-level site_name field (Implementation Plan D11's load-bearing find) — removing it
    // outright alongside lines 44/47 would silently regress that field to an unguided value.
    expect(promptText).toMatch(/\[Site Suffix\][\s\S]{0,200}VERBATIM/i);
    expect(promptText).toMatch(/site_name/);
  });

  it('(b) no rung of the cascade may ever return the bare H1 core unmodified — the terminal overflow rule is fixed too', () => {
    // The OLD, defective line 49 text this Story removes.
    expect(promptText).not.toContain('If bare core itself exceeds budget, return it unchanged.');
    // A differentiation marker must be appended after the H1 core (never substituted inside it —
    // OD-10's own resolution) and the new overflow rule must forbid dropping it to force a fit.
    expect(promptText).toMatch(/H1 core[\s\S]{0,120}(NEVER|never) (byte-identical|identical) to h1/i);
  });

  it('(b) the H1-core-verbatim-prefix guarantee (line 40) is unchanged — the core is still consumed, not generated', () => {
    expect(promptText).toMatch(/MUST begin with the H1 core verbatim/i);
  });

  it('(c) the per-locale budget table row format is preserved — the row-parsing regex above still matches every row', () => {
    const rowsAfter = [...promptText.matchAll(/^\s{2}([\w-]+(?:, [\w-]+)*|\(any other locale\))\s*: Title ≤ (\d+)/gm)];
    expect(rowsAfter.length).toBeGreaterThanOrEqual(6);
  });

  it('(c) the budget table\'s own descriptive text states an honest margin, not the stale "7 characters" claim', () => {
    // The table's own text must not still claim the old, now-false 7-character cushion.
    expect(promptText).not.toMatch(/AIM LOW[\s\S]{0,400}7 characters?/i);
  });

  describe('few-shot anchors (lines 81-106) — none ends in a site suffix, none is h1-identical', () => {
    const anchors = [...promptText.matchAll(/(?:meta_title|step \d result):\s+"([^"]+)"/gm)];

    it('finds all four anchors', () => {
      expect(anchors.length).toBeGreaterThanOrEqual(4);
    });

    it('no anchor example ends in a "| StoreName" (or any site-suffix-shaped) segment', () => {
      for (const [, title] of anchors) {
        expect(title, title).not.toMatch(/\|\s*StoreName/i);
      }
    });

    /**
     * Anchor 3's own "LAST RESORT" example (line 98) is the exact case Specification v3/v4
     * demonstrated firing — byte-identical to its own H1 (line 96). Cross-checks every anchor's
     * `meta_title`/`step N result` value against every H1/localized-name value declared anywhere
     * in the same anchors block, so this is not limited to Anchor 3 specifically.
     */
    it('no anchor\'s meta_title/step-result value is byte-identical to any H1 value declared in the same block', () => {
      const h1Values = [...promptText.matchAll(/(?:H1|h1|Localized name):\s+"([^"]+)"/gm)].map(m => m[1]);
      expect(h1Values.length).toBeGreaterThan(0);
      for (const [, title] of anchors) {
        expect(h1Values, title).not.toContain(title);
      }
    });
  });
});

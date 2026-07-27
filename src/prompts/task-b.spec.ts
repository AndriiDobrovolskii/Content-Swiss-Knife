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

  it('leaves real headroom rather than sitting exactly on the ceiling', () => {
    // A budget equal to the ceiling passes the check above but still fails in practice: the model
    // cannot count, so it needs room to overshoot. Find the ceiling by probing the validator.
    const fails = (n: number) => validateSeoMetadata(
      { site_name: 'S', seo_data: [{ language: 'en-GB', h1: 'h', meta_title: 'x'.repeat(n), meta_description: 'd ➔' }] } as never,
      '',
    ).some(i => i.rule === 'meta-title-length');

    let ceiling = 0;
    for (let n = 1; n <= 200; n++) if (!fails(n)) ceiling = n;

    for (const [, budget] of rows.map(r => [r[1], Number(r[2])] as const)) {
      expect(budget, `budget ${budget} vs ceiling ${ceiling}`).toBeLessThanOrEqual(Math.floor(ceiling * 0.9));
    }
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
});

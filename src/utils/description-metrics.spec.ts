/**
 * description-metrics.spec.ts - US-9.1 T34 (FR-32, FR-33; AC-10): the pure metrics core of
 * `tools/measure-description.ts`, on small HAND-COMPUTABLE fixtures. The CLI itself is `test/measure-description.cli.spec.ts`.
 *
 * ONLY THE CONFIRMED DEFINITIONS ARE PINNED. Specification FR-32: D-1 and D-2 follow FR-17 (confirmed by the
 * owner, OD-8, 2026-10-18); D-6 (section cutting) and D-8 (the causal-particle count) are confirmed. D-3 (word),
 * D-4 (prose block and sentence), D-5 (mean and sigma), D-7 (hook) and the D-9 half (number token,
 * "absent from the input") are PROPOSED DEFAULTS that no decision touched (OD-10 stays open, human question
 * H-OD10): they are DEFERRED here - no test asserts a word count, a sentence count, a mean, a sigma, the hook
 * length, a number token or an "absent from the input" decision, and the per-section short-sentence count of
 * D-6 (which needs D-3 and D-4) is not asserted either. Fixtures below are chosen so that EVERY plausible
 * reading of the undecided definitions agrees with the asserted values (no digits, plain whitespace-separated
 * Cyrillic words; the causal particles sit in `<p>` outside any figure).
 *
 * CONTRACT CHOSEN BY TEST_WRITING (the plan fixes only "pure functions for D-1 to D-10 and the hard-violation
 * decision; a parse function and a deixis collector are parameters; returns a report plus `hardViolations:
 * string[]`", D12, and that the module imports only types so the CLI can load it under native type stripping):
 *
 *   measureDescription(
 *     { html, inputTexts, locale },
 *     { parse: (html: string) => Document, collect: typeof collectFigureDeixisFromDocument },
 *   ): { deixisHits: number; figuresWithoutParagraphAbove: number; consecutiveFigures: number;
 *        connectiveCount: number; hardViolations: string[] }   // report may carry further keys
 *
 * `connectiveCount` is D-8 (whole-word «тож» in any letter case plus «Тому» with a capital Т; lowercase «тому»
 * is a pronoun form and is not counted). A builder who prefers other names loops back through TEST_WRITING;
 * the behaviours are the Specification's.
 *
 * RED BY LOAD until T34 (`description-metrics.ts`), and T34 needs T3. Soft items (FR-35) are reported and never
 * change `hardViolations` (FR-33).
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { measureDescription } from './description-metrics';
import { collectFigureDeixisFromDocument } from './image-deixis';

const deps = { parse: (html: string) => new DOMParser().parseFromString(html, 'text/html'), collect: collectFigureDeixisFromDocument };
const INPUT = ['Лазерний гравер для майстерні.'];
const run = (html: string) => measureDescription({ html, inputTexts: INPUT, locale: 'uk-UA' }, deps);

const FIG = (n: number, alt = 'Задня панель', caption = 'Задня панель') =>
  `<figure><img src="p${'abcdefghij'[n]}.jpg" alt="${alt}"><figcaption>${caption}</figcaption></figure>`;
const POINTER = 'Ряд із трьох круглих модулів ззаду показано на зображенні.';
const PLAIN = 'Гравер працює з деревом і металом.';
const CLEAN = `<p>${PLAIN}</p>${FIG(0)}<p>${PLAIN}</p>${FIG(1)}<p>Сенсорний екран запускає сканування.</p>`;

describe('D-1: deixis hits are carrier instances over every figure, video figure included (reading B)', () => {
  it('counts the paragraph, the figcaption and the alt of one figure as three hits', () => {
    const html = `<p>${POINTER}</p><figure><img src="a.jpg" alt="Три кадри показують модулі"><figcaption>Колаж показує три модулі</figcaption></figure>`;
    expect(run(html).deixisHits).toBe(3);
  });

  it('counts the paragraph above a VIDEO figure', () => {
    const video = '<figure><iframe src="https://www.youtube.com/embed/abc123" title="Огляд"></iframe><figcaption>Відеоогляд</figcaption></figure>';
    expect(run(`<p>Нижче розміщено відео з оглядом пристрою.</p>${video}`).deixisHits).toBe(1);
  });

  it('counts a clean document as zero', () => {
    expect(run(CLEAN).deixisHits).toBe(0);
  });

  it('does not count a pointer phrase in a paragraph that is not directly above a figure', () => {
    expect(run(`<p>${POINTER}</p><p>${PLAIN}</p>${FIG(0)}`).deixisHits).toBe(0);
  });
});

describe('D-2: figures without a paragraph above, and consecutive figures (independent counts)', () => {
  it('a figure after a heading is a figure without a paragraph above', () => {
    expect(run(`<h3>Панель</h3>${FIG(0)}`).figuresWithoutParagraphAbove).toBe(1);
  });

  it('a figure that is the first child counts once; a figure after a paragraph does not count', () => {
    expect(run(`<section>${FIG(0)}</section><p>${PLAIN}</p>${FIG(1)}`).figuresWithoutParagraphAbove).toBe(1);
  });

  it('two figures in a row: the second counts as consecutive AND as without a paragraph above', () => {
    const report = run(`<p>${PLAIN}</p>${FIG(0)}${FIG(1)}`);
    expect(report.consecutiveFigures).toBe(1);
    expect(report.figuresWithoutParagraphAbove).toBe(1);
  });

  it('three figures in a row give two consecutive figures', () => {
    expect(run(`<p>${PLAIN}</p>${FIG(0)}${FIG(1)}${FIG(2)}`).consecutiveFigures).toBe(2);
  });

  it('a clean document has neither', () => {
    const report = run(CLEAN);
    expect(report.figuresWithoutParagraphAbove).toBe(0);
    expect(report.consecutiveFigures).toBe(0);
  });
});

describe('D-8: the «тож» + «Тому» count (whole words; lowercase «тому» is a pronoun form and is not counted)', () => {
  it('counts «тож» in any letter case and «Тому» with a capital Т', () => {
    expect(run('<p>Тож гравер швидкий. Він точний, тож зручний. Тому майстер економить час.</p>').connectiveCount).toBe(3);
  });

  it('does not count lowercase «тому» (as in «тому що») nor a longer word that contains the particle', () => {
    expect(run('<p>Гравер зручний тому що він точний. Тожсамий результат не рахується.</p>').connectiveCount).toBe(0);
  });

  it('counts them in list items too, but not in a figcaption or a heading', () => {
    const html = '<h2>Тож заголовок</h2><ul><li>Тож перший пункт.</li></ul>'
      + '<figure><img src="a.jpg" alt="Тож"><figcaption>Тому підпис</figcaption></figure>';
    expect(run(html).connectiveCount).toBe(1);
  });
});

describe('FR-33: the hard-violation decision', () => {
  it('a clean document has no hard violation', () => {
    expect(run(CLEAN).hardViolations).toEqual([]);
  });

  it.each([
    ['a deixis hit (any carrier)', `<p>${POINTER}</p>${FIG(0)}`],
    ['a figure without a paragraph above', `<h3>Панель</h3>${FIG(0)}`],
    ['two figures in a row', `<p>${PLAIN}</p>${FIG(0)}${FIG(1)}`],
  ])('%s is a hard violation', (_name, html) => {
    expect(run(html).hardViolations.length).toBeGreaterThan(0);
  });

  it('soft items never change the decision: a «тож»-heavy, otherwise clean document has no hard violation', () => {
    const heavy = `<p>${Array(7).fill('Тож гравер швидкий.').join(' ')}</p>${FIG(0)}`;
    const report = run(heavy);
    expect(report.connectiveCount).toBe(7);
    expect(report.hardViolations).toEqual([]);
  });

  it('is a pure function of its input: two runs give the same report', () => {
    expect(JSON.stringify(run(CLEAN))).toBe(JSON.stringify(run(CLEAN)));
  });
});

describe('the module is a dependency-free leaf that takes the parser and the collector as parameters (D12)', () => {
  it('uses the injected parse function', () => {
    const parse = vi.fn(deps.parse);
    measureDescription({ html: CLEAN, inputTexts: INPUT, locale: 'uk-UA' }, { ...deps, parse });
    expect(parse).toHaveBeenCalled();
  });

  it('has only type imports, so the CLI can load it under native type stripping', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'utils', 'description-metrics.ts'), 'utf8');
    expect(source.split(/\r?\n/).filter(l => /^import\s/.test(l) && !/^import\s+type\s/.test(l))).toEqual([]);
  });
});

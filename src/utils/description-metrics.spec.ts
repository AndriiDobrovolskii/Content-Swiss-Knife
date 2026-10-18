/**
 * description-metrics.spec.ts - US-9.1 T34 (FR-32, FR-33; AC-10): the pure metrics core of
 * `tools/measure-description.ts`, on small HAND-COMPUTABLE fixtures. The CLI itself is `test/measure-description.cli.spec.ts`.
 *
 * EVERY DEFINITION OF FR-32 IS PINNED. D-1, D-2, D-6, D-8 and D-10 were confirmed in earlier rounds; D-3 (word), D-4 (prose
 * block and sentence), D-5 (mean and sigma), D-7 (hook) and the D-9 half (number token, "absent from the input") were
 * PROPOSED DEFAULTS that the owner CONFIRMED as written (H-OD10 answered). The first describes (D-1, D-2, D-8, FR-33) use
 * fixtures chosen so that every reading of the then-undecided definitions agreed (no digits, plain whitespace-separated
 * Cyrillic words); the describes after the "H-OD10 ANSWERED" banner at the end of the file pin D-3 to D-7 and D-9, and the
 * per-section short-sentence count of D-6, on hand-computed fixtures.
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

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════
// H-OD10 ANSWERED (owner: "confirm the proposed default metric definitions D-3, D-4, D-5, D-7 and D-9 as written",
// Specification FR-32). The definitions below are therefore pinned, each on a fixture whose expected value is computed
// BY HAND from the definition's text, never from a run. Report keys beyond the ones above are a contract CHOSEN BY
// TEST_WRITING (the Specification names the metrics, not the property names):
//   sentenceCount, meanSentenceWords, sigmaSentenceWords (D-4, D-5), hookWordCount (D-7),
//   shortSentencesPerSection: number[] (D-6, one entry per §3 section, in document order),
//   absentNumbers: string[] (D-9; each distinct absent number once; reported in the original OR the normalised form,
//   so the tests compare through the Specification's own normalisation).
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════

/** D-9 normalisation, written from the Specification: remove the group spaces (space, U+00A0, U+202F), replace `,` by `.`. */
const normalise = (n: string) => n.replace(/[ \u00A0\u202F]/g, '').replace(',', '.');
const absentOf = (html: string, inputTexts: string[] = INPUT) =>
  measureDescription({ html, inputTexts, locale: 'uk-UA' }, deps).absentNumbers.map(normalise).sort();
const runWith = (html: string, inputTexts: string[]) => measureDescription({ html, inputTexts, locale: 'uk-UA' }, deps);

describe('D-3 word (observed through the hook word count, D-7)', () => {
  const hookWords = (inner: string) => run(`<p>${inner}</p>`).hookWordCount;

  it('a whitespace-separated token with a letter or digit is a word: «0,03» and «3D-модель» are one word each', () => {
    // Лазерний гравер точний швидкий, 0,03 мм і 3D-модель.  -> 8 words; the dash and × are not words
    expect(hookWords('Лазерний гравер — точний × швидкий, 0,03 мм і 3D-модель.')).toBe(8);
  });

  it('a standalone dash, «×», «...» and other punctuation tokens are not words', () => {
    expect(hookWords('Один — два × три ... чотири – п\'ять')).toBe(5);
  });

  it('NBSP and thin spaces separate words like an ordinary space', () => {
    expect(hookWords('Потужність\u00A020\u00A0Вт')).toBe(3);
    expect(hookWords('Потужність\u200920\u2009Вт')).toBe(3);
    expect(hookWords('Потужність\u202F20\u202FВт')).toBe(3);
  });

  it('runs of whitespace and line breaks do not create empty words', () => {
    expect(hookWords('Один   два\n\n  три')).toBe(3);
  });
});

describe('D-7 hook: the word count of the first <p> in document order', () => {
  it('is the first <p>, not the heading and not a later paragraph', () => {
    expect(run('<h1>Назва товару з багатьох слів</h1><p>Раз два три.</p><p>Чотири п\'ять.</p>').hookWordCount).toBe(3);
  });

  it('is counted in whole words of that paragraph only', () => {
    expect(run('<p>Один.</p><p>Це довге друге речення не є хуком.</p>').hookWordCount).toBe(1);
  });
});

describe('D-4 prose block and sentence', () => {
  const sentences = (html: string) => run(html).sentenceCount;

  it('a sentence ends at . ! ? or … followed by whitespace and an uppercase letter, and at the end of the block', () => {
    // Один два. | Три чотири! | П'ять шість? | Сім…   -> 4 (the last ends at the end of the block)
    expect(sentences('<p>Один два. Три чотири! П\'ять шість? Сім…</p>')).toBe(4);
  });

  it('a sentence also ends before a digit, «, or "', () => {
    expect(sentences('<p>Версія 2. 3 режими доступні.</p>')).toBe(2);
    expect(sentences('<p>Гравер працює. «Тож» результат.</p>')).toBe(2);
    expect(sentences('<p>Гравер працює. "Тож" результат.</p>')).toBe(2);
  });

  it('a full stop followed by a LOWERCASE letter does not end the sentence', () => {
    expect(sentences('<p>Модель v. два працює швидко.</p>')).toBe(1);
  });

  it('a decimal such as 0,03 or 3.5 (no whitespace after the separator) never ends a sentence', () => {
    expect(sentences('<p>Крок 0,03 мм і 3.5 мм точно.</p>')).toBe(1);
  });

  it('a block without closing punctuation is one sentence', () => {
    expect(sentences('<p>Без крапки наприкінці</p>')).toBe(1);
  });

  it('runs of whitespace and line breaks inside a block are collapsed before cutting', () => {
    expect(sentences('<p>Один\n   два.\nТри чотири.</p>')).toBe(2);
  });

  it('empty fragments are not sentences', () => {
    expect(sentences('<p>Один.  </p><p></p><p>   </p>')).toBe(1);
  });

  it('every <p> and <li> outside a <figure> is a prose block', () => {
    expect(sentences('<p>Перший. Другий.</p><ul><li>Третій. Четвертий.</li><li>П\'ятий.</li></ul>')).toBe(5);
  });

  it('headings, table cells, figcaptions, alt text and anything inside a <figure> are NOT prose blocks', () => {
    const html = '<h2>Заголовок один. Два.</h2>'
      + '<table><tr><td>Клітина один. Два.</td></tr></table>'
      + '<figure><img src="a.jpg" alt="Альт один. Два."><figcaption><p>Підпис один. Ще.</p>Підпис три. Чотири.</figcaption></figure>'
      + '<p>Єдине речення.</p>';
    expect(sentences(html)).toBe(1);
  });
});

describe('D-5 mean and population standard deviation of words per sentence', () => {
  it('two sentences of 2 and 4 words: mean 3, sigma 1 (divide by the number of sentences)', () => {
    const r = run('<p>Один два. Раз два три чотири.</p>');
    expect(r.sentenceCount).toBe(2);
    expect(r.meanSentenceWords).toBeCloseTo(3, 9);
    expect(r.sigmaSentenceWords).toBeCloseTo(1, 9);
  });

  it('four sentences of 1, 1, 1 and 5 words: mean 2, sigma sqrt(3) (population, not sample)', () => {
    const r = run('<p>Так. Ні. Так. Раз два три чотири п\'ять.</p>');
    expect(r.sentenceCount).toBe(4);
    expect(r.meanSentenceWords).toBeCloseTo(2, 9);
    expect(r.sigmaSentenceWords).toBeCloseTo(Math.sqrt(3), 9);
  });

  it('one sentence: its word count is the mean and sigma is 0', () => {
    const r = run('<p>Раз два три чотири п\'ять.</p>');
    expect(r.meanSentenceWords).toBeCloseTo(5, 9);
    expect(r.sigmaSentenceWords).toBeCloseTo(0, 9);
  });

  it('pools the sentences of ALL prose blocks (paragraphs and list items), not per block', () => {
    // 2, 4 (paragraph) and 6 (list item): mean 4, variance (4+0+4)/3 = 8/3
    const r = run('<p>Один два. Раз два три чотири.</p><ul><li>Раз два три чотири п\'ять шість.</li></ul>');
    expect(r.meanSentenceWords).toBeCloseTo(4, 9);
    expect(r.sigmaSentenceWords).toBeCloseTo(Math.sqrt(8 / 3), 9);
  });

  it('words in figcaptions, headings and table cells are outside the pool', () => {
    const r = run('<h2>Раз два три чотири п\'ять шість сім вісім дев\'ять десять</h2><p>Один два.</p><table><tr><td>Дуже довга клітина таблиці з багатьма словами.</td></tr></table>');
    expect(r.meanSentenceWords).toBeCloseTo(2, 9);
    expect(r.sigmaSentenceWords).toBeCloseTo(0, 9);
  });
});

describe('D-6 per-section count of sentences of at most 6 words (reported per §3 section, never thresholded)', () => {
  const LONG = 'Це довге речення має більше ніж шість слів.'; // 8 words
  const DOC = '<h1>Назва</h1><p>Хук один.</p>'
    + `<h2>Огляд</h2><p>Коротко.</p><p>${LONG}</p>`                                  // the first <h2> section is the §2 block: not a §3 section
    + `<h2>Перший</h2><p>Коротко. ${LONG}</p>`                                       // 1 short
    + `<h2>Другий</h2><p>Два слова тут.</p><ul><li>Ще одне коротке.</li></ul><p>${LONG}</p>` // 2 short (paragraph + list item)
    + `<h2>Третій</h2><p>Тільки ${LONG.toLowerCase()}</p>`                           // 0 short
    + '<hr><h2>Характеристики</h2><p>Коротко.</p>';                                  // after the first top-level <hr>: not §3

  it('lists one count per §3 section, in document order, skipping the §2 block and everything after the first <hr>', () => {
    expect(run(DOC).shortSentencesPerSection).toEqual([1, 2, 0]);
  });

  it('a sentence of exactly 6 words is short; one of 7 words is not', () => {
    const six = 'Раз два три чотири п\'ять шість.';
    const seven = 'Раз два три чотири п\'ять шість сім.';
    expect(run(`<h2>Огляд</h2><p>${six}</p><h2>Секція</h2><p>${six} ${seven}</p>`).shortSentencesPerSection).toEqual([1]);
  });

  it('a top-level <section> ends the §3 sections as well', () => {
    const html = `<h2>Огляд</h2><p>${LONG}</p><h2>Перший</h2><p>Коротко.</p><section><h2>Далі</h2><p>Коротко.</p></section>`;
    expect(run(html).shortSentencesPerSection).toEqual([1]);
  });

  it('sentences inside a figure of the section do not count (D-4)', () => {
    const html = `<h2>Огляд</h2><p>${LONG}</p><h2>Перший</h2><p>${LONG}</p><figure><img src="a.jpg" alt="x"><figcaption>Коротко.</figcaption></figure>`;
    expect(run(html).shortSentencesPerSection).toEqual([0]);
  });

  it('is only a report: many empty sections change no hard decision', () => {
    const html = `<h2>Огляд</h2><p>${LONG}</p><h2>А</h2><p>${LONG}</p><h2>Б</h2><p>${LONG}</p>`;
    const r = run(html);
    expect(r.shortSentencesPerSection).toEqual([0, 0]);
    expect(r.hardViolations).toEqual([]);
  });
});

describe('D-9 number tokens, normalisation and "absent from the input"', () => {
  it('reports a generated number that the input does not contain, normalised', () => {
    expect(absentOf('<p>Потужність 20 Вт і крок 0,03 мм.</p>', ['Потужність 20 Вт'])).toEqual(['0.03']);
  });

  it('is empty when every generated number is in the input', () => {
    expect(absentOf('<p>Потужність 20 Вт і крок 0,03 мм.</p>', ['Потужність 20 Вт, крок 0,03 мм'])).toEqual([]);
  });

  it('removes the group spaces the Specification lists (space, NBSP U+00A0, narrow NBSP U+202F) before comparing: «1 000», «1\u00A0000» and «1\u202F000» all equal «1000»', () => {
    expect(absentOf('<p>Ресурс 1 000 годин.</p>', ['Ресурс 1000 годин'])).toEqual([]);
    expect(absentOf('<p>Ресурс 1\u00A0000 годин.</p>', ['Ресурс 1000 годин'])).toEqual([]);
    expect(absentOf('<p>Ресурс 1\u202F000 годин.</p>', ['Ресурс 1000 годин'])).toEqual([]);
    expect(absentOf('<p>Ресурс 1000 годин.</p>', ['Ресурс 1 000 годин'])).toEqual([]);
  });

  it('treats «,» and «.» as the same decimal separator', () => {
    expect(absentOf('<p>Крок 3.5 мм.</p>', ['Крок 3,5 мм'])).toEqual([]);
    expect(absentOf('<p>Крок 3,5 мм.</p>', ['Крок 3.5 мм'])).toEqual([]);
  });

  it('does not equate different numbers: «3,5» is not «35» and «20» is not «200»', () => {
    expect(absentOf('<p>Крок 3,5 мм.</p>', ['Крок 35 мм'])).toEqual(['3.5']);
    expect(absentOf('<p>Потужність 20 Вт.</p>', ['Потужність 200 Вт'])).toEqual(['20']);
  });

  it('a number directly adjacent to a letter is not a number token: L2, 3D, 4K, Wi-Fi6, H20 yield none', () => {
    expect(absentOf('<p>Модель L2, 3D-друк, екран 4K, Wi-Fi6 і Ortur H20.</p>', ['Без чисел'])).toEqual([]);
  });

  it('a number followed by a space and a unit IS a token', () => {
    expect(absentOf('<p>Швидкість 300 мм/с.</p>', ['Без чисел'])).toEqual(['300']);
  });

  it('reads the visible text only: src, href, style and alt attribute values are not read', () => {
    const html = '<p>Без чисел.</p><figure><img src="photo-2048.jpg" alt="Панель 8812" style="width: 640px"><figcaption>Панель</figcaption></figure><p><a href="/p/9999">Посилання</a></p>';
    expect(absentOf(html, ['Без чисел'])).toEqual([]);
  });

  it('reads headings, table cells and figcaptions as visible text', () => {
    // Elements are separated by line breaks so that no reading of "visible text" can glue «111» and «222» into one token.
    const html = ['<h2>Модуль 111</h2>', '<table><tr><td>222</td></tr></table>', '<figure><img src="a.jpg" alt=""><figcaption>Підпис 333</figcaption></figure>'].join('\n');
    expect(absentOf(html, ['Без чисел'])).toEqual(['111', '222', '333']);
  });

  it('reports each distinct absent number once, however often it is repeated', () => {
    expect(absentOf('<p>Вага 55 кг.</p><p>Ще раз 55 кг і знову 55.</p><p>Вага 56 кг.</p>', ['Без чисел'])).toEqual(['55', '56']);
  });

  it('the input side is the number tokens of EVERY text given (description, specs, name, notes)', () => {
    const html = '<p>Потужність 40 Вт, вага 7,5 кг, крок 12 мм, тест 90 с.</p>';
    expect(absentOf(html, ['Опис без чисел'])).toEqual(['12', '40', '7.5', '90'].sort());
    expect(absentOf(html, ['Опис без чисел', 'Потужність 40 Вт', 'вага 7,5 кг', 'крок 12 мм', 'тест 90 с'])).toEqual([]);
  });

  it('a number found only in a text the script was NOT given is reported as absent', () => {
    expect(absentOf('<p>Потужність 40 Вт, тест 90 с.</p>', ['Потужність 40 Вт'])).toEqual(['90']);
  });

  it('the input side is read for number tokens by the same rule: «H20» in the input grounds no «20»', () => {
    expect(absentOf('<p>Потужність 20 Вт.</p>', ['Модель H20'])).toEqual(['20']);
  });
});

describe('FR-33: a number absent from the input is a hard violation', () => {
  it('has a hard violation when a generated number is absent from the input', () => {
    expect(runWith('<p>Потужність 40 Вт.</p>', ['Без чисел']).hardViolations.length).toBeGreaterThan(0);
  });

  it('has none when every generated number is in the input (and nothing else is wrong)', () => {
    expect(runWith('<p>Потужність 40 Вт.</p>', ['Потужність 40 Вт']).hardViolations).toEqual([]);
  });

  it('absent numbers are reported even when another hard violation is present', () => {
    const r = runWith(`<p>${POINTER}</p>${FIG(0)}<p>Вага 77 кг.</p>`, ['Без чисел']);
    expect(r.absentNumbers.map(normalise)).toEqual(['77']);
    expect(r.deixisHits).toBeGreaterThan(0);
    expect(r.hardViolations.length).toBeGreaterThan(0);
  });
});

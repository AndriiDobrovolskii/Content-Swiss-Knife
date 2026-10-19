/**
 * output-validator.image-deixis.spec.ts - US-9.1 T26 (FR-18, AC-7 first sentence, NFR-12): `validateGeneratedHtml`
 * itself emits the rule `image-deixis` at level `warning` for a picture-reference phrase in the paragraph directly
 * above a figure, using the locale of the artifact being validated.
 *
 * FROZEN file `src/utils/output-validator.ts` (hunk O2: one import, one call inside the existing `DOMParser`
 * `try`, reusing the parsed `doc`). AC-7 requires the VALIDATOR to emit the rule, which is why a sibling cannot
 * replace the frozen edit. No "modify" instruction exists yet (H-OD12); these tests stay red until it does.
 *
 * THE CARRIER TABLE IS NORMATIVE (FR-18):
 *   | carrier                          | validateGeneratedHtml                              |
 *   | paragraph directly above a figure| emits `image-deixis`, level `warning`              |
 *   | `<figcaption>`                   | does NOT emit `image-deixis` or `image-caption-deixis` |
 *   | `alt` of an `<img>`              | does NOT emit any deixis rule                      |
 * and a phrase such as «нижче -10 °C» in a paragraph that is not directly above a figure gives nothing. The
 * level is `warning` and is not `error`; the finding does not block generation and does not trigger the repair
 * cycle (no `REPAIR_STRATEGIES` / `NON_REGENERABLE_RULES` entry exists or is added).
 *
 * The cases below that expect NO finding are guards that hold before and after; the "emits" cases are red.
 */
import { describe, it, expect } from 'vitest';
import { validateGeneratedHtml } from './output-validator';
import { REPAIR_STRATEGIES, NON_REGENERABLE_RULES, isLadderCandidate } from './repair-strategy';

const POINTER_UK = 'Ряд із трьох круглих модулів ззаду показано на зображенні.';
const FIGURE = (alt = 'Задня панель', caption = '<b>Задня панель:</b> три круглі модулі', src = 'a.jpg', first = true) =>
  `<figure><img src="https://cdn.example/x/y/${src}" alt="${alt}"${first ? '' : ' loading="lazy"'} decoding="async"><figcaption>${caption}</figcaption></figure>`;

const deixisIssues = (html: string, locale = 'uk-UA', context = 'HTML (uk-UA)') =>
  validateGeneratedHtml(html, context, undefined, locale).filter(i => /deixis/.test(i.rule));

describe('FR-18: validateGeneratedHtml emits image-deixis for the paragraph carrier', () => {
  it('emits exactly one warning for a pointer paragraph directly above a figure, with the given context', () => {
    const issues = deixisIssues(`<p>${POINTER_UK}</p>${FIGURE()}`);
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('image-deixis');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].context).toBe('HTML (uk-UA)');
    expect(issues[0].path, 'a document-level finding carries no path').toBeUndefined();
  });

  it('emits one warning per figure whose paragraph above has a hit', () => {
    const html = `<p>${POINTER_UK}</p>${FIGURE()}<p>Звичайний абзац про продукт.</p>${FIGURE('Інша панель', 'Інша', 'b.jpg', false)}`
      + `<p>Нижче розміщено відео з оглядом пристрою.</p>${FIGURE('Ще панель', 'Ще', 'c.jpg', false)}`;
    expect(deixisIssues(html).filter(i => i.rule === 'image-deixis')).toHaveLength(2);
  });

  it('judges the paragraph by the artifact locale: an English pointer paragraph warns for en-GB and not for uk-UA', () => {
    const html = `<p>The row of three round modules is shown in the image.</p>${FIGURE('Back panel', 'Back panel')}`;
    expect(deixisIssues(html, 'en-GB')).toHaveLength(1);
    expect(deixisIssues(html, 'uk-UA')).toEqual([]);
  });

  it('a video figure counts as a figure: the paragraph above it is a carrier', () => {
    const video = '<figure><iframe src="https://www.youtube.com/embed/abc123" title="Огляд" loading="lazy"></iframe><figcaption>Відеоогляд</figcaption></figure>';
    expect(deixisIssues(`<p>Нижче розміщено відео з оглядом пристрою.</p>${video}`).filter(i => i.rule === 'image-deixis')).toHaveLength(1);
  });
});

describe('FR-18 carrier table: nothing else produces a finding (guards, green on arrival)', () => {
  it('«нижче -10 °C» in a paragraph that is not directly above a figure gives no finding (the AC-7 negative)', () => {
    expect(deixisIssues(`<p>Не використовуйте пристрій за температури нижче -10 °C.</p><p>Інший абзац.</p>${FIGURE()}`)).toEqual([]);
  });

  it('a pointer paragraph separated from the figure by a heading gives no finding', () => {
    expect(deixisIssues(`<p>${POINTER_UK}</p><h3>Задня панель</h3>${FIGURE()}`)).toEqual([]);
  });

  it('the figcaption carrier gives NO image-deixis and NO image-caption-deixis from validateGeneratedHtml', () => {
    const html = `<p>Звичайний абзац про продукт.</p>${FIGURE('Задня панель', 'Колаж показує три модулі')}`;
    expect(deixisIssues(html)).toEqual([]);
  });

  it('the alt carrier gives no deixis rule at all', () => {
    const html = `<p>Звичайний абзац про продукт.</p>${FIGURE('Три кадри показують модулі', 'Задня панель')}`;
    expect(deixisIssues(html)).toEqual([]);
  });

  it('an undefined locale (an existing caller) gives no finding and does not throw', () => {
    expect(() => validateGeneratedHtml(`<p>${POINTER_UK}</p>${FIGURE()}`, 'ctx')).not.toThrow();
    expect(validateGeneratedHtml(`<p>${POINTER_UK}</p>${FIGURE()}`, 'ctx').filter(i => /deixis/.test(i.rule))).toEqual([]);
  });

  it('HTML without a figure gives no finding', () => {
    expect(deixisIssues(`<h2>Опис</h2><p>${POINTER_UK}</p>`)).toEqual([]);
  });
});

describe('NFR-12: the new finding is a warning that never feeds the repair cycle', () => {
  it('has no repair strategy and is not a ladder candidate, and no NON_REGENERABLE_RULES entry was added for it', () => {
    expect(REPAIR_STRATEGIES.has('image-deixis')).toBe(false);
    expect(REPAIR_STRATEGIES.has('image-caption-deixis')).toBe(false);
    expect(NON_REGENERABLE_RULES.has('image-deixis')).toBe(false);
    const issue = { severity: 'warning' as const, rule: 'image-deixis', detail: 'x', context: 'ctx' };
    expect(isLadderCandidate(issue)).toBe(false);
  });

  it('adds no error: a document whose only finding is a pointer paragraph has no error from the new rule', () => {
    const issues = validateGeneratedHtml(`<p>${POINTER_UK}</p>${FIGURE()}`, 'HTML (uk-UA)', undefined, 'uk-UA');
    expect(issues.filter(i => /deixis/.test(i.rule) && i.severity === 'error')).toEqual([]);
  });
});

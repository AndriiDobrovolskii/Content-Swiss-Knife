/**
 * sentence-length.spec.ts
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { validateSentenceLength, countWords } from './sentence-length';

const p = (t: string) => `<p>${t}</p>`;
const run = (html: string, locale = 'uk-UA') => validateSentenceLength(html, locale, 'HTML (base)');

/** The real 27-word sentence from the QA pass; uk-UA ceiling is 20. */
const TOO_LONG =
  'Лазерний модуль потужністю 20 Вт підходить як для гравіювання, так і для різання дерева, ' +
  'акрилу та подібних матеріалів, а на нержавіючій сталі відтворює понад 380 відтінків кольору.';

describe('validateSentenceLength', () => {
  it('flags the reported 27-word sentence and quotes it with its count', () => {
    const issues = run(p(TOO_LONG));
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('sentence-too-long');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].detail).toMatch(/exceeds the uk-UA hard ceiling of 20/);
    expect(issues[0].detail).toContain('380 відтінків кольору');
  });

  it('accepts the two-sentence rewrite of it', () => {
    const fixed =
      'Лазерний модуль потужністю 20 Вт підходить як для гравіювання, так і для різання дерева, ' +
      'акрилу та подібних матеріалів. На нержавіючій сталі він відтворює понад 380 відтінків кольору.';
    expect(run(p(fixed))).toEqual([]);
  });

  it('is a strict >, so a sentence exactly at the ceiling passes', () => {
    const exactly20 = Array.from({ length: 20 }, (_, i) => `слово${i}`).join(' ') + '.';
    expect(countWords(exactly20)).toBe(20);
    expect(run(p(exactly20))).toEqual([]);
    expect(run(p(`${exactly20.slice(0, -1)} іще.`))).toHaveLength(1);
  });

  describe('sentence splitting hazards', () => {
    it('does not split on an abbreviation followed by a capital', () => {
      const text = 'Комплект містить 500 шт. Наступний етап — калібрування столу.';
      expect(run(p(text))).toEqual([]); // two short sentences, neither over ceiling
    });

    it('does not split inside a decimal number', () => {
      expect(run(p('Товщина 1,75 мм забезпечує стабільну подачу. Допуск 0.05 мм.'))).toEqual([]);
    });

    it('does not split on a lowercase continuation', () => {
      const long = `Цей верстат ${Array.from({ length: 25 }, (_, i) => `слово${i}`).join(' ')} та ін. і далі.`;
      expect(run(p(long))).toHaveLength(1); // one long sentence, not two short ones
    });
  });

  describe('word counting', () => {
    it('merges a unit into the number it follows', () => {
      expect(countWords('Модуль 20 Вт працює.')).toBe(3);
      expect(countWords('Module 20 W runs.')).toBe(3);
    });

    it('merges a dimension chain into one word', () => {
      expect(countWords('Робочий стіл 330 × 330 × 565 мм вміщує великі деталі.')).toBe(6);
    });

    it('does not count bare punctuation as a word', () => {
      expect(countWords('Корпус — закритий.')).toBe(2);
    });

    it('counts a hyphenated compound once', () => {
      expect(countWords('Кварцово-трубчасті нагрівачі гріють.')).toBe(3);
    });
  });

  describe('scope', () => {
    it('ignores spec-table cells, which are not sentences', () => {
      const cell = Array.from({ length: 40 }, (_, i) => `слово${i}`).join(' ');
      expect(run(`<table><tbody><tr><td>${cell}.</td></tr></tbody></table>`)).toEqual([]);
    });

    it('ignores figcaptions', () => {
      const caption = Array.from({ length: 40 }, (_, i) => `слово${i}`).join(' ');
      expect(run(`<figure><figcaption>${caption}.</figcaption></figure>`)).toEqual([]);
    });

    it('ignores everything inside section.specs', () => {
      const long = Array.from({ length: 40 }, (_, i) => `слово${i}`).join(' ');
      expect(run(`<section class="specs"><p>${long}.</p></section>`)).toEqual([]);
    });

    it('checks <li> as well as <p>', () => {
      expect(run(`<ul><li>${TOO_LONG}</li></ul>`)).toHaveLength(1);
    });
  });

  describe('locale bands', () => {
    it('uses the de-DE ceiling of 18', () => {
      const s = Array.from({ length: 19 }, (_, i) => `Wort${i}`).join(' ') + '.';
      expect(run(p(s), 'de-DE')).toHaveLength(1);
      expect(run(p(s), 'es-ES')).toEqual([]); // es-ES ceiling is 27
    });

    it('returns nothing for an unmapped locale rather than guessing', () => {
      expect(run(p(TOO_LONG), 'xx-XX')).toEqual([]);
    });
  });

  it('returns nothing for empty html', () => {
    expect(run('')).toEqual([]);
  });
});

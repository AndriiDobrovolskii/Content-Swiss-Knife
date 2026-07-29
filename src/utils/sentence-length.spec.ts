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

  /**
   * Regression suite for the XGRIDS L2 Pro 23:14 run: 3 of its 9 sentence-too-long warnings were
   * §2b bullets of the form `<li><b>Label:</b> sentence</li>`. A colon is not a sentence
   * terminator, so measuring el.textContent counted label + sentence as ONE sentence:
   *
   *   4 + 19 = 23   |   6 + 15 = 21   |   8 + 14 = 22
   *
   * Every one of the three sentences is under the ceiling on its own. The domain model has always
   * treated these as separate fields — BulletItem { lead, text } in description-doc.ts, rendered
   * by renderBullets as `<b>${lead}</b>${text}`.
   */
  describe('bold lead-in is a label, not part of the sentence', () => {
    const li = (t: string) => `<ul><li>${t}</li></ul>`;

    it('accepts the three real bullets from the run (23, 21 and 22 words with their labels)', () => {
      const bullets = [
        `<b>Миттєва кольорова хмара точок:</b> алгоритм LixelUpSample™ обробляє дані на льоту, ` +
        `тому оператор отримує готовий результат одразу в полі, без окремого етапу камеральної обробки.`,

        `<b>16-канальний LiDAR з діапазоном 0,5–120 м:</b> один прохід охоплює великі об'єкти — ` +
        `від будівельного майданчика до ділянки траси — без додаткових точок стояння.`,

        `<b>Ступінь захисту IP54 та діапазон -20 °C – 50 °C:</b> сканер продовжує роботу на ` +
        `майданчику чи в кар'єрі за пилу, вологи та перепадів температури.`,
      ];
      for (const b of bullets) expect(run(li(b))).toEqual([]);
    });

    it('a lead-in ending in a full stop counts too — the signal is position, not punctuation', () => {
      // Center 3D Print's house style; the space lives inside the <b>.
      const bullet =
        `<b>Складається за лічені хвилини. </b>Тришарова конструкція розкладається без інструментів, ` +
        `а фіксатори утримують раму жорстко навіть на нерівній підлозі майстерні.`;
      expect(run(li(bullet))).toEqual([]);
    });

    it('measures the lead-in itself, so an over-long "label" is still reported', () => {
      const longLead = Array.from({ length: 25 }, (_, i) => `слово${i}`).join(' ');
      const issues = run(li(`<b>${longLead}:</b> коротке речення.`));
      expect(issues).toHaveLength(1);
      expect(issues[0].detail).toContain('слово24');
      // The reported sentence must be the LEAD ALONE. Without this the test also passes on the
      // old behaviour, where lead+sentence were one 27-word blob that happened to contain
      // "слово24" — i.e. it would not discriminate.
      expect(issues[0].detail).not.toContain('коротке речення');
      expect(issues[0].detail).toContain('of 25 words');
    });

    it('bold in the MIDDLE of a sentence splits nothing', () => {
      const withInlineBold = TOO_LONG.replace('гравіювання', '<b>гравіювання</b>');
      expect(run(p(withInlineBold))).toHaveLength(1);
    });

    it('an <li> with no bold lead-in is measured exactly as before', () => {
      expect(run(li(TOO_LONG))).toHaveLength(1);
    });

    it('does not silence the real long paragraphs from the same run', () => {
      const real29 =
        `Обертовий LiDAR, дві панорамні камери та 6DOF IMU працюють як єдина система: ` +
        `алгоритм Multi-SLAM об'єднує їхні дані в реальному часі, тому оператор бачить ` +
        `остаточний результат ще до завершення маршруту.`;
      expect(run(p(real29))).toHaveLength(1);
    });
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

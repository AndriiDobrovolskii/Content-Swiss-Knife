/**
 * alt-numeric-fidelity.spec.ts
 *
 * Guards the deterministic half of the "invented figure in alt text" fix. The prompt half lives
 * in NUMERIC_SOURCE_FIDELITY_RULES (constants.ts) and vision-prepass.ts.
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { validateAltNumericFidelity } from './alt-numeric-fidelity';

const SPECS = [
  'Потужність лазера | 20 Вт',
  'Робоче поле | 400 x 400 мм',
  'Швидкість гравіювання | 20000 мм/хв',
  'Точність позиціонування | 0,05 мм',
  'Вага | 12,5 кг',
].join('\n');

const figure = (alt: string, caption = 'Підпис без чисел.') =>
  `<figure><img src="https://cdn.example.com/ortur/h20/head.jpg" alt="${alt}" decoding="async">` +
  `<figcaption>${caption}</figcaption></figure>`;

describe('validateAltNumericFidelity', () => {
  /** The exact defect that motivated this validator. */
  it('fails an alt claiming a wattage the specs do not state', () => {
    const issues = validateAltNumericFidelity(figure('лазерна головка 40 Вт'), SPECS, 'HTML (base)');
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('alt-numeric-not-grounded');
    expect(issues[0].severity).toBe('error');
    expect(issues[0].detail).toContain('40 Вт');
    expect(issues[0].context).toBe('HTML (base)');
  });

  it('passes an alt whose figure IS in the specs', () => {
    expect(validateAltNumericFidelity(figure('лазерна головка 20 Вт'), SPECS, 'x')).toEqual([]);
  });

  it('passes a figure stated only in the manifest caption, when the caller supplies it', () => {
    const sources = `${SPECS}\nManifest: close-up of the 32 mm focal lens`;
    expect(validateAltNumericFidelity(figure('об`єктив 32 мм'), sources, 'x')).toEqual([]);
  });

  it('flags the same defect inside a <figcaption>, not just an alt', () => {
    const issues = validateAltNumericFidelity(figure('чиста головка', 'Гравіює на 60000 мм/хв.'), SPECS, 'x');
    expect(issues).toHaveLength(1);
    expect(issues[0].detail).toContain('60000');
  });

  /**
   * The master is uk-UA while sources may be mixed-script, so units are deliberately not
   * compared — matching five languages' unit spellings would fail correct output far more often
   * than it would catch a defect.
   */
  it('matches across unit spellings (Вт / W) and decimal notation (0,05 / 0.05)', () => {
    expect(validateAltNumericFidelity(figure('laser head 20 W'), SPECS, 'x')).toEqual([]);
    expect(validateAltNumericFidelity(figure('точність 0.05 mm'), SPECS, 'x')).toEqual([]);
    expect(validateAltNumericFidelity(figure('вага 12.5 kg'), SPECS, 'x')).toEqual([]);
  });

  it('ignores numbers with no unit — model names and counts are not specs', () => {
    expect(validateAltNumericFidelity(figure('Ortur Laser Master 3 на столі'), SPECS, 'x')).toEqual([]);
    expect(validateAltNumericFidelity(figure('панель керування H20'), SPECS, 'x')).toEqual([]);
  });

  it('ignores single-digit figures — deliberately conservative for a hard gate', () => {
    expect(validateAltNumericFidelity(figure('ріже акрил 3 мм'), SPECS, 'x')).toEqual([]);
  });

  it('reports each distinct unsupported figure once, not once per occurrence', () => {
    const issues = validateAltNumericFidelity(
      figure('головка 40 Вт', 'Модуль 40 Вт крупним планом, 40 Вт потужності.'),
      SPECS,
      'x',
    );
    // one for the alt, one for the figcaption — but not three for the figcaption's repeats
    expect(issues).toHaveLength(2);
  });

  it('never inspects body prose, only image text', () => {
    const html =
      `<p>Верстат ріже на 99999 мм/хв у режимі чернетки.</p>` +
      `<table><tbody><tr><td>Ресурс</td><td>50000 год</td></tr></tbody></table>` +
      figure('лазерна головка 20 Вт');
    expect(validateAltNumericFidelity(html, SPECS, 'x')).toEqual([]);
  });

  describe('no-op guards', () => {
    it('returns nothing when sources are empty (grounding disabled is a real state)', () => {
      expect(validateAltNumericFidelity(figure('головка 40 Вт'), '', 'x')).toEqual([]);
      expect(validateAltNumericFidelity(figure('головка 40 Вт'), '   ', 'x')).toEqual([]);
    });

    it('returns nothing for empty html or an artifact with no images', () => {
      expect(validateAltNumericFidelity('', SPECS, 'x')).toEqual([]);
      expect(validateAltNumericFidelity('<p>Опис без зображень.</p>', SPECS, 'x')).toEqual([]);
    });

    it('does not crash on an empty alt', () => {
      expect(validateAltNumericFidelity(figure(''), SPECS, 'x')).toEqual([]);
    });
  });
});

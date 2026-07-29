/**
 * alt-numeric-fidelity.spec.ts
 *
 * Guards the deterministic half of the "invented figure in alt text" fix. The prompt half lives
 * in NUMERIC_SOURCE_FIDELITY_RULES (constants.ts) and vision-prepass.ts.
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { validateAltNumericFidelity, sourceNumbers } from './alt-numeric-fidelity';

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


describe('sourceNumbers', () => {
  const nums = (text: string) => [...sourceNumbers(text)];

  it('does NOT merge two separate numbers across a space', () => {
    // The defect that threw away two correct block patches: "Ortur H20 20 Вт" matched as one
    // token "20 20" and canonicalised to a phantom 2020. Rewriting the phrase legitimately made
    // the phantom vanish, and the patch was rejected for "dropping" a number that never existed.
    expect(nums('Ortur H20 20 Вт')).toEqual(['20']);
    expect(nums('Ortur H20 потужністю 20 Вт')).toEqual(['20']);
  });

  it('does not merge across a RUN of spaces either', () => {
    // HTML-derived text can carry doubled whitespace; the grouping rule must not depend on there
    // being exactly one space.
    expect(nums('H20  20 Вт')).toEqual(['20']);
  });

  it('still groups thousands, with one space or several', () => {
    expect(nums('20 000 мм/хв')).toEqual(['20000']);
    expect(nums('20  000 мм/хв')).toEqual(['20000']);
  });

  it('keeps decimal and mixed grouping intact', () => {
    expect(nums('1 234,5')).toEqual(['1234.5']);
    expect(nums('1.234,5')).toEqual(['1234.5']);
    expect(nums('1,75 мм')).toEqual(['1.75']);
  });

  it('treats a dimension chain as separate figures', () => {
    expect(nums('420 × 300 мм')).toEqual(['420', '300']);
  });

  it('keeps a leading minus that sits on a word boundary', () => {
    // Without the sign, a patch that quietly dropped it would compare equal and be accepted.
    expect(nums('Зберігання за -20 °C')).toEqual(['-20']);
  });

  it('does NOT read a hyphen between two numbers as a sign', () => {
    // "300-400 мм" is a range, not 300 and minus 400. Reading it as a sign would replace the
    // noise this fix removes with new noise.
    expect(nums('300-400 мм')).toEqual(['300', '400']);
  });
});

describe('alt numbers: the product name is not a claim', () => {
  const run = (alt: string) => validateAltNumericFidelity(figure(alt), SPECS, 'HTML (base)');

  it('does not read "H20 20 Вт" as a claim of 2020', () => {
    // The regression this run produced. sourceNumbers was fixed last iteration and the commit
    // claimed the alt side was covered too — it was not: the alt side reads NUMBER_WITH_UNIT,
    // a second regex with the same whitespace-spanning flaw. A correct alt was reported as
    // inventing a figure, and the false error cost a full regeneration.
    expect(run('Лазерний модуль Ortur H20 20 Вт')).toEqual([]);
  });

  it('still fails a genuinely invented wattage next to the model name', () => {
    // The guard must not be blunted: 40 Вт is nowhere in the specs.
    expect(run('Лазерний модуль Ortur H20 40 Вт')).toHaveLength(1);
  });

  it('handles the unit forms the pipeline actually produces', () => {
    const NBSP = String.fromCharCode(0xa0);
    expect(run(`Швидкість 20000${NBSP}мм/хв`)).toEqual([]);   // NBSP, as fixNumberFormatting writes it
    expect(run('Швидкість 20000мм/хв')).toEqual([]);          // no space before the unit
    expect(run('Точність 0,05 мм')).toEqual([]);              // decimal comma
    expect(run('Вага 12,5 кг')).toEqual([]);                  // decimal comma, second unit
  });

  it('treats a thousands group as one figure, not two', () => {
    const grouped = 'Швидкість гравіювання | 20 000 мм/хв';
    expect(validateAltNumericFidelity(figure('Швидкість 20 000 мм/хв'), grouped, 'HTML (base)')).toEqual([]);
  });

  it('reads a range as two figures, both of which must be grounded', () => {
    const src = 'Робоча температура | 20-25 °C';
    expect(validateAltNumericFidelity(figure('Робоча температура 20-25 °C'), src, 'HTML (base)')).toEqual([]);
  });
});

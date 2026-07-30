/**
 * decimal-separator.spec.ts
 *
 * Three jobs:
 *  1. real measurements localize — every comma-decimal that the EXPERT3D XGRIDS L2 Pro run
 *     produced correctly must keep working;
 *  2. identifiers do NOT localize, regardless of word order — this is the regression that shipped
 *     ("USB-кабель 3,1" in faq_uk-UA.html) and the class of latent bugs behind it;
 *  3. the ROUND TRIP: output-validator.ts is FROZEN, so the fixer cannot import its pattern.
 *     These tests are what stop the two drifting apart.
 */

import { describe, it, expect } from 'vitest';
import { fixDecimalSeparator } from './decimal-separator';
import { validateGeneratedHtml } from './output-validator';

const UA = 'uk-UA';

/** decimal-separator issues the validator still reports for `html`. */
function decimalIssues(html: string, locale = UA) {
  return validateGeneratedHtml(html, 'test', undefined, locale)
    .filter(i => i.rule === 'decimal-separator');
}

describe('fixDecimalSeparator — measurements localize', () => {
  // Every comma-decimal the real run produced, quoted from
  // Knowlege/expert3d_..._2026-07-29_1946/. If one of these stops converting, the fix has
  // over-corrected.
  const measurements: ReadonlyArray<readonly [string, string, string]> = [
    ['metres', '<p>від 0.5 м до 120 м</p>', '<p>від 0,5 м до 120 м</p>'],
    ['kilograms', '<p>60 см × 60 см × 15 см, 2.5 кг</p>', '<p>60 см × 60 см × 15 см, 2,5 кг</p>'],
    ['volts', '<td>14.4 В</td>', '<td>14,4 В</td>'],
    ['watt-hours (composite unit absent from unit-tables)', '<td>46.8 Вт·год</td>', '<td>46,8 Вт·год</td>'],
    ['centimetres', '<td>0.5 см</td>', '<td>0,5 см</td>'],
    ['weight with a trailing parenthetical', '<td>1.7 кг (без акумулятора)</td>', '<td>1,7 кг (без акумулятора)</td>'],
    ['gigahertz', '<p>2.4 ГГц</p>', '<p>2,4 ГГц</p>'],
    ['millimetres', '<p>1.75 мм</p>', '<p>1,75 мм</p>'],
  ];

  it.each(measurements)('localizes %s', (_label, input, expected) => {
    expect(fixDecimalSeparator(input, UA)).toBe(expected);
  });

  it('localizes a range whose unit sits at the far end', () => {
    // "від 0,5 до 120 м" — the FAQ's phrasing. The unit belongs to the SECOND number, so a
    // naive "unit must follow immediately" rule would silently stop converting this.
    expect(fixDecimalSeparator('<p>радіусу сканування від 0.5 до 120 м</p>', UA))
      .toBe('<p>радіусу сканування від 0,5 до 120 м</p>');
  });

  it('localizes inside a dimension chain', () => {
    expect(fixDecimalSeparator('<p>1.5 × 2.5 × 3.5 см</p>', UA)).toBe('<p>1,5 × 2,5 × 3,5 см</p>');
  });

  it('localizes Latin units, since this runs before cyrillizeUnits', () => {
    expect(fixDecimalSeparator('<p>46.8 Wh, 1.75 mm, 2.5 kg</p>', UA))
      .toBe('<p>46,8 Wh, 1,75 mm, 2,5 kg</p>');
  });

  it('localizes across a non-breaking space, which fixNumberFormatting inserts', () => {
    expect(fixDecimalSeparator('<p>1.75 мм</p>', UA)).toBe('<p>1,75 мм</p>');
  });

  it('rewrites every occurrence, not just the first', () => {
    expect(fixDecimalSeparator('<p>1.75 мм, 0.5 мм, 46.8 Вт</p>', UA))
      .toBe('<p>1,75 мм, 0,5 мм, 46,8 Вт</p>');
  });

  it('is idempotent', () => {
    const once = fixDecimalSeparator('<p>46.8 Вт·год</p>', UA);
    expect(fixDecimalSeparator(once, UA)).toBe(once);
  });
});

describe('fixDecimalSeparator — identifiers keep their dots, in any word order', () => {
  // THE REGRESSION. Both spellings appeared in ONE run: the description wrote "Кабель USB 3.1"
  // and the FAQ wrote "USB-кабель 3.1". The old positional lookbehind only saved the first,
  // which is exactly why the rule is now an allow-list instead.
  it('keeps USB 3.1 when the model puts the noun first (the FAQ spelling that broke)', () => {
    const html = '<p>USB-кабель 3.1 та інструкцію користувача</p>';
    expect(fixDecimalSeparator(html, UA)).toBe(html);
  });

  it('keeps USB 3.1 when the token sits directly before the number (the description spelling)', () => {
    expect(fixDecimalSeparator('<li>Кабель USB 3.1 та посібник користувача</li>', UA))
      .toBe('<li>Кабель USB 3.1 та посібник користувача</li>');
    expect(fixDecimalSeparator('<td>USB 3.1 Gen2</td>', UA)).toBe('<td>USB 3.1 Gen2</td>');
  });

  const identifiers: ReadonlyArray<readonly [string, string]> = [
    ['Cyrillic version noun', '<p>версія 1.0 прошивки</p>'],
    ['manual version in a heading', '<p>User Manual (V1.0)</p>'],
    ['semver', '<p>Firmware 1.0.2</p>'],
    ['lens aperture', '<p>Діафрагма F/2.0</p>'],
    ['lowercase aperture', '<p>f/1.8</p>'],
    ['Wi-Fi standard family', '<p>802.11a/b/g/n/ac</p>'],
    ['bare standard number', '<p>Bluetooth: 802.11</p>'],
    ['band designator glued to G', '<p>2.4G WiFi 2412–2472 МГц</p>'],
    ['PCIe generation', '<p>PCIe 4.0</p>'],
    ['SATA generation', '<p>SATA 3.0</p>'],
    ['Type-C revision', '<p>Type-C 3.2</p>'],
    ['USB version behind a Polish noun', '<p>kabel USB 3.1 oraz instrukcja</p>'],
  ];

  it.each(identifiers)('keeps %s byte-identical', (_label, html) => {
    expect(fixDecimalSeparator(html, UA)).toBe(html);
  });

  it('never touches a URL in href or src', () => {
    const html = '<p><a href="https://example.com/a.1/spec-2.5">1.75 мм</a>'
      + '<img src="https://cdn.example.com/v1.5/img-2.75.jpg" alt="2.5 мм"></p>';
    const out = fixDecimalSeparator(html, UA);
    expect(out).toContain('href="https://example.com/a.1/spec-2.5"');
    expect(out).toContain('src="https://cdn.example.com/v1.5/img-2.75.jpg"');
    expect(out).toContain('>1,75 мм<');
    expect(out).toContain('alt="2,5 мм"'); // alt is in mapHtmlText's allow-list
  });
});

describe('fixDecimalSeparator — the accepted trade-off', () => {
  it('leaves a unit-less decimal alone, by design', () => {
    // Stated as a decision, not discovered as a surprise: converting only measurements means a
    // bare decimal keeps its dot and may leave a validator warning. That is the strict-subset
    // rule — a missed value costs a warning, a wrong one silently edits a spec. The block-repair
    // rung (wired for the FAQ gate) is what can still reach such a warning.
    const html = '<p>коефіцієнт 1.5 у розрахунку</p>';
    expect(fixDecimalSeparator(html, UA)).toBe(html);
    expect(decimalIssues(html).length).toBeGreaterThan(0); // the validator still says so
  });
});

describe('fixDecimalSeparator — locale gating', () => {
  it('is a no-op for a dot-decimal locale', () => {
    const html = '<p>46.8 Wh</p>';
    expect(fixDecimalSeparator(html, 'en-GB')).toBe(html);
    expect(fixDecimalSeparator(html, 'es-MX')).toBe(html);
  });

  it('applies to every comma-decimal locale the validator checks', () => {
    for (const locale of ['uk-UA', 'ru-UA', 'pl-PL', 'de-DE', 'es-ES', 'pt-PT']) {
      expect(fixDecimalSeparator('<p>46.8 W</p>', locale)).toBe('<p>46,8 W</p>');
    }
  });

  it('returns the input unchanged for empty html or an unknown locale', () => {
    expect(fixDecimalSeparator('', UA)).toBe('');
    expect(fixDecimalSeparator('<p>46.8 Вт</p>', 'xx-XX')).toBe('<p>46.8 Вт</p>');
  });
});

describe('round trip — everything the fixer converts satisfies the frozen validator', () => {
  // Note the direction. The fixer is deliberately NARROWER than the validator, so "no warnings
  // remain" is not the claim — "nothing the fixer touched is still wrong" is.
  it('clears the warning the EXPERT3D L2 Pro FAQ actually produced', () => {
    const html = '<p>Ємність акумулятора — 46.8 Вт·год за напруги 14.4 В.</p>';
    expect(decimalIssues(html)).toHaveLength(1);
    expect(decimalIssues(fixDecimalSeparator(html, UA))).toHaveLength(0);
  });

  it('leaves nothing for the validator across a mixed measurement document', () => {
    const html = '<p>1.75 мм, 0.5 мм, 2.4 ГГц, 46.8 Вт·год</p>'
      + '<table><tr><td>Напруга</td><td>14.4 В</td></tr></table>';
    expect(decimalIssues(fixDecimalSeparator(html, UA))).toHaveLength(0);
  });

  it('does not convert what the validator never flagged', () => {
    for (const html of [
      '<p>Діафрагма F/2.0</p>',
      '<p>User Manual (V1.0)</p>',
      '<p>802.11a/b/g/n/ac</p>',
      '<td>USB 3.1 Gen2</td>',
    ]) {
      expect(decimalIssues(html)).toHaveLength(0);
      expect(fixDecimalSeparator(html, UA)).toBe(html);
    }
  });
});

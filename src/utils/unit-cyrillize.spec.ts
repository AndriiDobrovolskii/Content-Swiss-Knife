/**
 * unit-cyrillize.spec.ts
 *
 * The brand/model-safety block is the load-bearing part: this transform rewrites shipped text for
 * uk-UA/ru-UA on ALL eight stores, so a wrong swap corrupts a product name silently.
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { cyrillizeUnits } from './unit-cyrillize';

const uk = (s: string) => cyrillizeUnits(s, 'uk-UA');
const ru = (s: string) => cyrillizeUnits(s, 'ru-UA');
const NBSP = ' ';

describe('cyrillizeUnits', () => {
  it('converts the reported case', () => {
    expect(uk('<p>Ortur H20 20 W — лазерний гравер.</p>'))
      .toBe(`<p>Ortur H20 20${NBSP}Вт — лазерний гравер.</p>`);
  });

  it('converts the common units', () => {
    expect(uk('400 mm')).toBe(`400${NBSP}мм`);
    expect(uk('1,75 mm')).toBe(`1,75${NBSP}мм`);
    expect(uk('12,5 kg')).toBe(`12,5${NBSP}кг`);
    expect(uk('1,5 kW')).toBe(`1,5${NBSP}кВт`);
    expect(uk('24 V')).toBe(`24${NBSP}В`);
    expect(uk('50 Hz')).toBe(`50${NBSP}Гц`);
    expect(uk('256 GB')).toBe(`256${NBSP}ГБ`);
  });

  it('prefers the longest unit match', () => {
    expect(uk('1,5 kW')).toBe(`1,5${NBSP}кВт`);       // not "1,5 к" + W
    expect(uk('2000 mAh')).toBe(`2000${NBSP}мА·год`); // not mA + h
    expect(uk('300 mm/s')).toBe(`300${NBSP}мм/с`);    // not mm + /s
  });

  it('uses ru forms where they differ from uk', () => {
    expect(uk('2000 mAh')).toBe(`2000${NBSP}мА·год`);
    expect(ru('2000 mAh')).toBe(`2000${NBSP}мА·ч`);
    expect(uk('300 rpm')).toBe(`300${NBSP}об/хв`);
    expect(ru('300 rpm')).toBe(`300${NBSP}об/мин`);
  });

  it('converts a whole dimension chain', () => {
    expect(uk('330 × 330 × 565 mm')).toBe(`330 × 330 × 565${NBSP}мм`);
  });

  describe('exception list stays Latin', () => {
    for (const untouched of ['25 °C', '-5 °F', '24 V AC', '24 VAC', '6500 K', '600 dpi', '1920 px', '30 fps', '50 ppm']) {
      it(`leaves "${untouched}" unchanged`, () => {
        expect(uk(untouched)).toBe(untouched);
      });
    }
  });

  describe('brand and model codes stay intact', () => {
    for (const name of [
      'Ortur H20', 'Ortur Laser Master 3', 'PA12', 'Nylon 12', 'PETG-CF', 'EinScan H2',
      'Creality K1 Max', 'Bambu Lab A1 mini', 'TPU 95A', 'Shore 60A', 'LU2-10A', 'X_1A',
      'Nylon 12 GF', '4K', '8K',
    ]) {
      it(`leaves "${name}" unchanged`, () => {
        expect(uk(name)).toBe(name);
      });
    }
  });

  /**
   * The guard inspects the whole digit RUN, not just the character before the matched digit —
   * stricter than number-format-fixer, which rewrites "LU2-10A" to "LU2-10 A". A stray space is
   * survivable there; a Latin->Cyrillic swap inside a model code is not.
   */
  it('still converts a genuine bare amperage, which has no code prefix', () => {
    expect(uk('max output 10A')).toBe(`max output 10${NBSP}А`);
    expect(uk('rated current 5A')).toBe(`rated current 5${NBSP}А`);
  });

  it('never touches src or href, but does convert alt and title', () => {
    const html = '<img src="https://cdn.example.com/20w/head.jpg" alt="головка 20 W" title="20 W">';
    const out = uk(html);
    expect(out).toContain('src="https://cdn.example.com/20w/head.jpg"');
    expect(out).toContain(`alt="головка 20${NBSP}Вт"`);
    expect(out).toContain(`title="20${NBSP}Вт"`);
  });

  it('is a strict no-op for non-Cyrillic locales', () => {
    const html = '<p>Ortur H20 20 W, 400 mm, 12,5 kg</p>';
    for (const locale of ['en-GB', 'pl-PL', 'de-DE', 'es-ES', 'en-US']) {
      expect(cyrillizeUnits(html, locale), locale).toBe(html);
    }
  });

  it('is idempotent', () => {
    const once = uk('<p>Модуль 20 W і стіл 400 mm.</p>');
    expect(uk(once)).toBe(once);
  });

  it('handles empty input', () => {
    expect(uk('')).toBe('');
  });

  /** fixNumberFormatting runs first and normalizes the gap, but the input may already be tight. */
  it('accepts a missing or non-breaking gap between number and unit', () => {
    expect(uk('20W')).toBe(`20${NBSP}Вт`);
    expect(uk(`20${NBSP}W`)).toBe(`20${NBSP}Вт`);
  });
});

/**
 * terminology-normalize.spec.ts
 *
 * Regression guard for src/utils/terminology-normalize.ts.
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { normalizeTerminology, canonicalizeMultiInOne } from './terminology-normalize';

describe('normalizeTerminology — trademark', () => {
  it('normalizes "Pin-Point™ Positioning" to the canonical form', () => {
    expect(normalizeTerminology('The Pin-Point™ Positioning system.')).toBe('The Pin-point Positioning™ system.');
  });

  it('normalizes "Pinpoint Positioning" (no hyphen) to the canonical form', () => {
    expect(normalizeTerminology('Uses Pinpoint Positioning for accuracy.')).toBe('Uses Pin-point Positioning™ for accuracy.');
  });

  it('normalizes "Pin point Positioning" (space instead of hyphen)', () => {
    expect(normalizeTerminology('Pin point Positioning™ technology.')).toBe('Pin-point Positioning™ technology.');
  });

  it('leaves the already-canonical form unchanged (idempotent)', () => {
    const canonical = 'Pin-point Positioning™ system.';
    expect(normalizeTerminology(canonical)).toBe(canonical);
    expect(normalizeTerminology(normalizeTerminology(canonical))).toBe(canonical);
  });

  it('applies regardless of locale (e.g. the uk-UA master)', () => {
    expect(normalizeTerminology('Технологія Pin-Point™ Positioning.', 'uk-UA')).toBe('Технологія Pin-point Positioning™.');
  });
});

describe('normalizeTerminology — ES terminology', () => {
  it('replaces "laminado en caliente" with "estampación en caliente" for es-ES', () => {
    expect(normalizeTerminology('El proceso de laminado en caliente aplica la lámina.', 'es-ES'))
      .toBe('El proceso de estampación en caliente aplica la lámina.');
  });

  it('preserves initial capitalization', () => {
    expect(normalizeTerminology('Laminado en caliente es el proceso.', 'es-ES'))
      .toBe('Estampación en caliente es el proceso.');
  });

  it('does NOT touch it for other locales', () => {
    const text = 'El proceso de laminado en caliente aplica la lámina.';
    expect(normalizeTerminology(text, 'pt-PT')).toBe(text);
    expect(normalizeTerminology(text)).toBe(text);
  });
});

describe('normalizeTerminology — PT terminology', () => {
  it('replaces "foilagem" with "estampagem a quente" for pt-PT', () => {
    expect(normalizeTerminology('Modo de lâmina e acessórios de foilagem.', 'pt-PT'))
      .toBe('Modo de lâmina e acessórios de estampagem a quente.');
  });

  it('does NOT touch it for other locales', () => {
    const text = 'Modo de lâmina e acessórios de foilagem.';
    expect(normalizeTerminology(text, 'es-ES')).toBe(text);
  });

  it('translates the voltage-line "AC" to "CA"', () => {
    expect(normalizeTerminology('Tensão: 100–240 V ~ AC, 50/60 Hz', 'pt-PT'))
      .toBe('Tensão: 100–240 V ~ CA, 50/60 Hz');
  });

  it('replaces "baseball" with "basebol"', () => {
    expect(normalizeTerminology('uma bola de baseball gravada', 'pt-PT'))
      .toBe('uma bola de basebol gravada');
  });

  it('adds the missing accent to "poster" -> "póster"', () => {
    expect(normalizeTerminology('um poster impresso emoldurado', 'pt-PT'))
      .toBe('um póster impresso emoldurado');
  });

  it('does not double-fix an already-accented "póster"', () => {
    const text = 'um póster impresso emoldurado';
    expect(normalizeTerminology(text, 'pt-PT')).toBe(text);
  });
});

describe('normalizeTerminology — xTool software name (universal, S1)', () => {
  it('replaces "xTool Studio" with "xTool Creative Space" regardless of locale', () => {
    expect(normalizeTerminology('<td>Supported software</td><td>xTool Studio</td>'))
      .toBe('<td>Supported software</td><td>xTool Creative Space</td>');
    expect(normalizeTerminology('<td>Сумісне ПЗ</td><td>xTool Studio</td>', 'uk-UA'))
      .toBe('<td>Сумісне ПЗ</td><td>xTool Creative Space</td>');
  });
});

describe('normalizeTerminology — es-ES typography', () => {
  it('converts a pure numeric range hyphen to an en-dash', () => {
    expect(normalizeTerminology('cubre 3-4 herramientas, hasta 100-240 V', 'es-ES'))
      .toBe('cubre 3–4 herramientas, hasta 100–240 V');
  });

  it('does not touch a digit-hyphen-word compound like "4-in-1"', () => {
    const text = 'el sistema 4-in-1 xTool';
    expect(normalizeTerminology(text, 'es-ES')).toBe(text);
  });

  it('does NOT apply to other locales', () => {
    const text = 'cubre 3-4 herramientas';
    expect(normalizeTerminology(text, 'pt-PT')).toBe(text);
  });
});

describe('normalizeTerminology — uk-UA (2026-07-16 EXPERT3D find/replace audit)', () => {
  it('fixes the three grammar-agreement errors', () => {
    expect(normalizeTerminology('тонкий фанер обробляється швидше', 'uk-UA'))
      .toBe('тонка фанера обробляється швидше');
    expect(normalizeTerminology('порівняно з однофункціональною лазерною техніку', 'uk-UA'))
      .toBe('порівняно з однофункціональною лазерною технікою');
    expect(normalizeTerminology('гравіюються без ручного розмітки кожного оберту', 'uk-UA'))
      .toBe('гравіюються без ручної розмітки кожного оберту');
  });

  it('generalizes root-swap fixes across declined forms (тамблер -> термостакан)', () => {
    expect(normalizeTerminology('від тамблерів до спортивного інвентарю', 'uk-UA'))
      .toBe('від термостаканів до спортивного інвентарю');
    expect(normalizeTerminology('обробки тамблера на насадці', 'uk-UA'))
      .toBe('обробки термостакана на насадці');
    expect(normalizeTerminology('на тамблери, брелоки та коробки', 'uk-UA'))
      .toBe('на термостакани, брелоки та коробки');
  });

  it('generalizes root-swap fixes across declined forms (постер -> плакат)', () => {
    expect(normalizeTerminology('друкований постер у рамці', 'uk-UA'))
      .toBe('друкований плакат у рамці');
  });

  it('generalizes and preserves capitalization (розхідні -> витратні)', () => {
    expect(normalizeTerminology('Розхідні матеріали — фільтри, леза', 'uk-UA'))
      .toBe('Витратні матеріали — фільтри, леза');
  });

  it('fixes "гальванізований" -> "оцинкований"', () => {
    expect(normalizeTerminology('нержавіюча сталь, гальванізований метал', 'uk-UA'))
      .toBe('нержавіюча сталь, оцинкований метал');
  });

  it('fixes the "плоттер" (double-т) spelling but leaves correct "плотер" alone', () => {
    expect(normalizeTerminology('принтер та плоттер для малювання', 'uk-UA'))
      .toBe('принтер та плотер для малювання');
    const correct = 'лазерний гравер, плотер-різак, принтер';
    expect(normalizeTerminology(correct, 'uk-UA')).toBe(correct);
  });

  it('replaces standalone "софт" with "програма" but not "софту"/"софтом"', () => {
    expect(normalizeTerminology('софт розпізнає їх одним знімком', 'uk-UA'))
      .toBe('програма розпізнає їх одним знімком');
    const withCaseEnding = 'робота із софтом і софту';
    expect(normalizeTerminology(withCaseEnding, 'uk-UA')).toBe(withCaseEnding);
  });

  it('applies the narrow literal-phrase fixes (Russisms, calques, consistency)', () => {
    expect(normalizeTerminology('фільтри (8 шт.), ключі (2 шт.), змазка, набір', 'uk-UA'))
      .toBe('фільтри (8 шт.), ключі (2 шт.), мастило, набір');
    expect(normalizeTerminology('друкуюча голівка наносить візерунок', 'uk-UA'))
      .toBe('друкувальна голівка наносить візерунок');
    expect(normalizeTerminology('<h3>Партійне опрацювання та Snapshot Preview</h3>', 'uk-UA'))
      .toBe('<h3>Пакетна обробка та Snapshot Preview</h3>');
    expect(normalizeTerminology('гравіювання деревʼяного підстаканника з текстом', 'uk-UA'))
      .toBe("гравіювання дерев'яної підставки під чашку з текстом");
    expect(normalizeTerminology('орнамент-вінка на деревʼяному підстаканнику', 'uk-UA'))
      .toBe("орнамент-вінка на дерев'яній підставці під чашку");
    expect(normalizeTerminology('Комплект SafetyPro додає повітряочищувач AP2', 'uk-UA'))
      .toBe('Комплект SafetyPro додає очищувач повітря AP2');
    expect(normalizeTerminology('доповнює цю схему повітряочищувачем AP2', 'uk-UA'))
      .toBe('доповнює цю схему очищувачем повітря AP2');
    expect(normalizeTerminology('<li><b>Повітряочищувач SafetyPro™ AP2</b></li>', 'uk-UA'))
      .toBe('<li><b>Очищувач повітря SafetyPro™ AP2</b></li>');
    expect(normalizeTerminology('на дереві, папері, акрилі й канвасі', 'uk-UA'))
      .toBe('на дереві, папері, акрилі й полотні');
    expect(normalizeTerminology('струменевий друк: папір, картон, дерево, канвас, акрил', 'uk-UA'))
      .toBe('струменевий друк: папір, картон, дерево, полотно, акрил');
    expect(normalizeTerminology('ротаційний ніж і мат FabricGrip проходять денім', 'uk-UA'))
      .toBe('ротаційний ніж і килимок FabricGrip проходять денім');
    expect(normalizeTerminology('<li><b>Мати для різання:</b> LightGrip</li>', 'uk-UA'))
      .toBe('<li><b>Килимки для різання:</b> LightGrip</li>');
    expect(normalizeTerminology('<li>Мати для різання LightGrip та FabricGrip</li>', 'uk-UA'))
      .toBe('<li>Килимки для різання LightGrip та FabricGrip</li>');
    expect(normalizeTerminology('це багатофункціональний верстат для крафтового виробництва', 'uk-UA'))
      .toBe('це багатофункціональний верстат для художньо-ремісничого виробництва');
    expect(normalizeTerminology('Приклади крафтових проєктів: декор для дому', 'uk-UA'))
      .toBe('Приклади художньо-ремісничих проєктів: декор для дому');
    expect(normalizeTerminology('набором окремих інструментів для крафту', 'uk-UA'))
      .toBe('набором окремих інструментів для ручного виробництва');
    expect(normalizeTerminology('маркерами без обмеження по висоті', 'uk-UA'))
      .toBe('маркерами без обмеження за висотою');
  });

  it('translates the voltage-line "AC" to "(змінний струм)"', () => {
    expect(normalizeTerminology('Напруга: 100–240 В ~ AC, 50/60 Гц', 'uk-UA'))
      .toBe('Напруга: 100–240 В (змінний струм), 50/60 Гц');
  });

  it('normalizes all U+02BC apostrophes to U+0027, last', () => {
    expect(normalizeTerminology('деревʼяна модель будиночка, бейсбольним мʼячем', 'uk-UA'))
      .toBe("дерев'яна модель будиночка, бейсбольним м'ячем");
  });

  it('does NOT apply any uk-UA rule to other locales', () => {
    const text = 'Розхідні матеріали, змазка, тонкий фанер обробляється';
    expect(normalizeTerminology(text, 'es-ES')).toBe(text);
    expect(normalizeTerminology(text)).toBe(text);
  });

  it('matches the full user-vetted ground-truth correction byte-for-byte', () => {
    const original = readFileSync(
      join(__dirname, '__fixtures__/description_uk-UA.original.html'), 'utf8',
    );
    const corrected = readFileSync(
      join(__dirname, '__fixtures__/description_uk-UA.corrected.html'), 'utf8',
    );
    // The fixture reflects only the 30 uk-UA find/replace rules — it predates the separate,
    // universal S1 fix (xTool Studio -> xTool Creative Space), which normalizeTerminology also
    // applies unconditionally. Account for that one extra, intentional diff.
    const expected = corrected.replace('xTool Studio', 'xTool Creative Space');
    expect(normalizeTerminology(original, 'uk-UA')).toBe(expected);
  });
});

describe('canonicalizeMultiInOne', () => {
  it('canonicalizes English to the hyphenated "N-in-N" form', () => {
    expect(canonicalizeMultiInOne('xTool M1 Ultra 20W 4 in 1 Laser Engraver', 'en-ES'))
      .toBe('xTool M1 Ultra 20W 4-in-1 Laser Engraver');
    expect(canonicalizeMultiInOne('the 4-in-1 SafetyPro Bundle', 'en-GB'))
      .toBe('the 4-in-1 SafetyPro Bundle');
  });

  it('canonicalizes Ukrainian to the spaced "N в N" form (no hyphen)', () => {
    expect(canonicalizeMultiInOne('Комплект xTool M1 Ultra 20 Вт 4-в-1 SafetyPro', 'uk-UA'))
      .toBe('Комплект xTool M1 Ultra 20 Вт 4 в 1 SafetyPro');
    expect(canonicalizeMultiInOne('Лазерний гравер 20 Вт 4 в 1', 'uk-UA'))
      .toBe('Лазерний гравер 20 Вт 4 в 1');
  });

  it('leaves other locales untouched', () => {
    const text = 'Grabadora láser xTool M1 Ultra 20 W 4 en 1';
    expect(canonicalizeMultiInOne(text, 'es-ES')).toBe(text);
  });

  it('is a no-op with no locale', () => {
    const text = '4 in 1 and 4 в 1, unchanged';
    expect(canonicalizeMultiInOne(text)).toBe(text);
  });
});

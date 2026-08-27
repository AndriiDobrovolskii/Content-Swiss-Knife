import { describe, it, expect } from 'vitest';
import {
  normalizeSlug, ensureUniqueSlugs, SLUG_PATTERN, stripSlugStopwords,
  buildSlugWithSpec, enforceSlugLength, SLUG_VALUE_PATTERN,
} from './slug-utils';

describe('normalizeSlug', () => {
  it('transliterates Ukrainian Cyrillic to latin', () => {
    expect(normalizeSlug('Станція хімічного згладжування')).toBe('stantsiya-khimichnoho-zhladzhuvannya');
  });

  it('strips Spanish diacritics', () => {
    expect(normalizeSlug('Máquina de impresión')).toBe('maquina-de-impresion');
  });

  it('strips Polish diacritics', () => {
    expect(normalizeSlug('Wygładzania parą')).toBe('wygladzania-para');
  });

  it('lowercases mixed-case input', () => {
    expect(normalizeSlug('Bambu Lab X1 Carbon')).toBe('bambu-lab-x1-carbon');
  });

  it('collapses repeated separators and trims leading/trailing hyphens', () => {
    expect(normalizeSlug('  --3D Printer!!  ')).toBe('3d-printer');
  });

  it('always produces output matching SLUG_PATTERN', () => {
    const result = normalizeSlug('Étape  de  finissage—vapeur (V2)');
    expect(result).toMatch(SLUG_PATTERN);
  });

  it('preserves decimal dot between digits (1.75 mm)', () => {
    expect(normalizeSlug('1.75 mm')).toBe('1.75-mm');
  });

  it('preserves decimal dot in a full filament name', () => {
    expect(normalizeSlug('Filament 0.4 mm 1 kg')).toBe('filament-0.4-mm-1-kg');
  });

  it('decimal slug matches SLUG_PATTERN', () => {
    expect(normalizeSlug('PETG 1.75 mm 1 kg Orange')).toMatch(SLUG_PATTERN);
  });

  it('converts a comma decimal to a dot (uk-UA/ru-UA)', () => {
    expect(normalizeSlug('Точність 0,015 мм')).toBe('tochnist-0.015-mm');
  });

  it('converts a comma decimal to a dot (pl-PL)', () => {
    expect(normalizeSlug('Dokladnosc 0,015 mm')).toBe('dokladnosc-0.015-mm');
  });

  it('converts a comma decimal to a dot (de-DE)', () => {
    expect(normalizeSlug('Genauigkeit 0,015 mm')).toBe('genauigkeit-0.015-mm');
  });

  it('converts a comma decimal to a dot (es-ES)', () => {
    expect(normalizeSlug('Precision 0,015 mm')).toBe('precision-0.015-mm');
  });

  it('comma-decimal slug matches SLUG_PATTERN', () => {
    expect(normalizeSlug('Filament 1,75 mm 1 kg', 'uk-UA')).toMatch(SLUG_PATTERN);
  });
});

describe('normalizeSlug — Cyrillic unit canonicalization', () => {
  it('canonicalizes кг to kg, not the phonetic kh', () => {
    expect(normalizeSlug('Філамент 1 кг')).toBe('filament-1-kg');
  });

  it('canonicalizes Вт to w, not the phonetic vt', () => {
    expect(normalizeSlug('Потужність 20 Вт')).toBe('potuzhnist-20-w');
  });

  it('canonicalizes см to cm, not the phonetic sm', () => {
    expect(normalizeSlug('Висота 15 см')).toBe('vysota-15-cm');
  });

  it('canonicalizes мкм to um, not the phonetic mkm', () => {
    expect(normalizeSlug('Точність 20 мкм')).toBe('tochnist-20-um');
  });

  it('canonicalizes В (volt) to v, and А (ampere) to a', () => {
    expect(normalizeSlug('Напруга 12 В')).toBe('napruha-12-v');
    expect(normalizeSlug('Струм 5 А')).toBe('strum-5-a');
  });

  it('canonicalizes uk год/хв and ru ч/мин to h/min', () => {
    expect(normalizeSlug('Час друку 2 год')).toBe('chas-druku-2-h');
    expect(normalizeSlug('Час друку 2 ч', 'ru-UA')).toBe('chas-druku-2-h');
  });

  it('does not touch a unit-shaped substring inside an ordinary word', () => {
    // "загартована" contains "г" (a unit token) but is not preceded by a digit+space, so it
    // must fall through to the normal phonetic transliteration untouched.
    expect(normalizeSlug('Bambu Lab загартована сталь')).toBe('bambu-lab-zahartovana-stal');
  });

  it('does not touch the full word "годин" even when it follows a number', () => {
    // "год" is a unit token, but "годин" is a whole different word — the token match requires
    // a non-letter/digit boundary right after it, which "и" fails.
    expect(normalizeSlug('за 5 годин')).toBe('za-5-hodyn');
  });
});

describe('normalizeSlug — locale-aware Cyrillic transliteration', () => {
  it('defaults to the Ukrainian scheme (и→y) when no language is given', () => {
    expect(normalizeSlug('принтер')).toBe('prynter');
  });

  it('uses the Russian scheme (и→i) for a ru-* language', () => {
    expect(normalizeSlug('принтер', 'ru-UA')).toBe('printer');
  });

  it('diverges on г and й, not just и', () => {
    expect(normalizeSlug('гарячий', 'uk-UA')).toBe('haryachyi');
    expect(normalizeSlug('гарячий', 'ru-UA')).toBe('garyachiy');
  });

  it('never leaves й untransliterated (would otherwise split the word on a stray hyphen)', () => {
    expect(normalizeSlug('швидкий', 'uk-UA')).toBe('shvydkyi');
    expect(normalizeSlug('швидкий', 'ru-UA')).toBe('shvidkiy');
  });

  it('omitting language is equivalent to explicit uk-UA', () => {
    expect(normalizeSlug('гарячий')).toBe(normalizeSlug('гарячий', 'uk-UA'));
  });

  it('overrides ё to the standard "yo" only for ru-*, since it does not exist in Ukrainian', () => {
    expect(normalizeSlug('ё')).toBe('e');
    expect(normalizeSlug('ё', 'ru-UA')).toBe('yo');
  });

  it('resolves the reported uk/ru collision: identical Cyrillic name, distinct slugs per locale', () => {
    const name = '3D-принтер Creality Ender-5 Max';
    const uk = normalizeSlug(stripSlugStopwords(name), 'uk-UA');
    const ru = normalizeSlug(stripSlugStopwords(name), 'ru-UA');
    expect(uk).not.toBe(ru);
    expect(uk).toContain('prynter');
    expect(ru).toContain('printer');
  });
});

describe('stripSlugStopwords', () => {
  it('removes prepositions from each language group', () => {
    expect(stripSlugStopwords('Impresora 3D para Elegoo')).toBe('Impresora 3D Elegoo');
    expect(stripSlugStopwords('3D принтер для роботи')).toBe('3D принтер роботи');
    expect(stripSlugStopwords('Drukarka 3D dla domu')).toBe('Drukarka 3D domu');
    expect(stripSlugStopwords('Düse für Bambu Lab')).toBe('Düse Bambu Lab');
    expect(stripSlugStopwords('Filamento con Bobina')).toBe('Filamento Bobina');
  });

  it('removes Title Case prepositions case-insensitively', () => {
    expect(stripSlugStopwords('Impresora 3D Para Elegoo')).toBe('Impresora 3D Elegoo');
    expect(stripSlugStopwords('Düse Für Bambu Lab')).toBe('Düse Bambu Lab');
    expect(stripSlugStopwords('Принтер Для Роботи')).toBe('Принтер Роботи');
  });

  it('removes a preposition glued to punctuation', () => {
    expect(stripSlugStopwords('Impresora 3D para, Elegoo')).toBe('Impresora 3D Elegoo');
    expect(stripSlugStopwords('Принтер (для) роботи')).toBe('Принтер роботи');
  });

  it('removes a preposition embedded in an already-hyphenated slug', () => {
    expect(normalizeSlug(stripSlugStopwords('impresora-3d-para-elegoo'))).toBe('impresora-3d-elegoo');
  });

  it('round-trips a hyphenated designator unchanged', () => {
    expect(normalizeSlug(stripSlugStopwords('X1-Carbon'))).toBe('x1-carbon');
    expect(normalizeSlug(stripSlugStopwords('xgrids-l2-pro-32-300'))).toBe('xgrids-l2-pro-32-300');
  });

  it('does not remove a stopword substring inside a longer token', () => {
    expect(stripSlugStopwords('Українська назва')).toBe('Українська назва');
  });

  it('keeps an uppercase single-letter designator even when it matches a stopword', () => {
    expect(stripSlugStopwords('Model Z 1.75 mm')).toBe('Model Z 1.75 mm');
    expect(stripSlugStopwords('Type A')).toBe('Type A');
  });

  it('is idempotent and handles an empty string', () => {
    expect(stripSlugStopwords('')).toBe('');
    const once = stripSlugStopwords('Filamento con Bobina');
    expect(stripSlugStopwords(once)).toBe(once);
  });
});

describe('ensureUniqueSlugs', () => {
  it('returns slugs unchanged when already unique', () => {
    const items = [
      { language: 'en-GB', slug: 'vapour-smoothing-machine' },
      { language: 'uk-UA', slug: 'stantsiya-zglazhuvannya' },
    ];
    expect(ensureUniqueSlugs(items)).toEqual([
      'vapour-smoothing-machine',
      'stantsiya-zglazhuvannya',
    ]);
  });

  it('appends a language descriptor on collision', () => {
    const items = [
      { language: 'en-GB', slug: 'smoothing-machine' },
      { language: 'en-US', slug: 'smoothing-machine' },
    ];
    expect(ensureUniqueSlugs(items)).toEqual([
      'smoothing-machine',
      'smoothing-machine-us',
    ]);
  });

  it('appends a numeric suffix when the descriptor still collides', () => {
    const items = [
      { language: 'en-US', slug: 'smoothing-machine' },
      { language: 'en-US', slug: 'smoothing-machine' },
      { language: 'en-US', slug: 'smoothing-machine' },
    ];
    expect(ensureUniqueSlugs(items)).toEqual([
      'smoothing-machine',
      'smoothing-machine-us',
      'smoothing-machine-2',
    ]);
  });
});

describe('SLUG_VALUE_PATTERN', () => {
  it('accepts every real killerSpecs[].value shape found in the corpus', () => {
    for (const v of ['20 Вт', '420 × 300 мм', '20000 мм/хв', '0,11 mm', '165 × 165 × 300 mm', '10 W', '98 мм', '200000 пікселів']) {
      expect(v).toMatch(SLUG_VALUE_PATTERN);
    }
  });

  it('rejects a qualifier-prefixed or ranged value', () => {
    for (const v of ['≤ 0,015 mm', '<30 Вт', '0,02–0,05 мм', '0,015 мм (режим метрології)', '±0.02 mm']) {
      expect(v).not.toMatch(SLUG_VALUE_PATTERN);
    }
  });
});

describe('buildSlugWithSpec', () => {
  it('appends a resolved spec as a suffix', () => {
    expect(buildSlugWithSpec('bambu-lab-h20', { key: 'power', value: '20 Вт' }, 'uk-UA'))
      .toBe('bambu-lab-h20-potuzhnist-20-w');
  });

  it('localizes the label per target language, same key and value', () => {
    expect(buildSlugWithSpec('ortur-h20', { key: 'power', value: '20 Вт' }, 'pl-PL'))
      .toBe('ortur-h20-moc-20-w');
  });

  it('returns the base slug unchanged when resolved is null', () => {
    expect(buildSlugWithSpec('ortur-h20', null, 'uk-UA')).toBe('ortur-h20');
  });

  it('returns the base slug unchanged when the key has no registry label', () => {
    expect(buildSlugWithSpec('ortur-h20', { key: 'smart-camera', value: '200000 пікселів' }, 'uk-UA'))
      .toBe('ortur-h20');
  });

  it('returns the base slug unchanged when the value fails SLUG_VALUE_PATTERN', () => {
    expect(buildSlugWithSpec('ortur-h20', { key: 'accuracy', value: '≤ 0,015 mm' }, 'uk-UA'))
      .toBe('ortur-h20');
  });

  it('returns the base slug unchanged for an unmapped locale', () => {
    expect(buildSlugWithSpec('ortur-h20', { key: 'power', value: '20 Вт' }, 'fr-FR')).toBe('ortur-h20');
  });

  it('produces the dot-decimal form, not a hyphenated one', () => {
    expect(buildSlugWithSpec('scanner-x', { key: 'accuracy', value: '0,015 мм' }, 'uk-UA'))
      .toBe('scanner-x-tochnist-0.015-mm');
  });
});

describe('enforceSlugLength', () => {
  it('joins base and suffix unchanged when under the limit', () => {
    expect(enforceSlugLength('ortur-h20', 'power-20-w', 100)).toBe('ortur-h20-power-20-w');
  });

  it('trims the suffix from the end, never the base, when over the limit', () => {
    const base = 'a'.repeat(90);
    const result = enforceSlugLength(base, 'power-twenty-watts-of-laser-engraving-strength', 100);
    expect(result.startsWith(base)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(100);
  });

  it('drops the suffix entirely when the base alone is already at the limit', () => {
    const base = 'a'.repeat(100);
    expect(enforceSlugLength(base, 'power-20-w', 100)).toBe(base);
  });

  it('never leaves a trailing hyphen after trimming', () => {
    const base = 'a'.repeat(95);
    const result = enforceSlugLength(base, 'power-20-w', 100);
    expect(result.endsWith('-')).toBe(false);
  });
});

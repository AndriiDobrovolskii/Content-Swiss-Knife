/**
 * US-10.5 T9 - Ukrainian transliteration for the archive name (Specification FR-12 Proposed (iii), ratified: the Ukrainian national
 * transliteration, Cabinet of Ministers resolution No. 55 of 2010, position-dependent letters included; plan DD-8).
 *
 * PINNED CONTRACT (src/utils/image-studio/transliterate-uk.ts, owner T9; pure):
 *   transliterateUk(text: string): string
 *       Cyrillic letters map to Latin per the national scheme; the soft sign and every apostrophe are dropped; non-Cyrillic
 *       characters are returned unchanged (the kebab step of buildArchiveName turns them into hyphens). Case is not asserted
 *       here (the kebab step lower-cases): every comparison lower-cases the result.
 * The expected spellings are the official examples of the resolution (place names), written from the scheme, not from the code.
 * Logic runner. Red until T9. It must not reuse or change src/prompt-core/slug-utils.ts (a different, BGN-style table).
 */
import { describe, it, expect } from 'vitest';
import { transliterateUk } from './transliterate-uk';

const lo = (s: string) => transliterateUk(s).toLowerCase();

describe('FR-12 (iii): the national scheme, official examples (T9)', () => {
  it.each([
    ['Алушта', 'alushta'], ['Борщагівка', 'borshchahivka'], ['Вінниця', 'vinnytsia'], ['Гадяч', 'hadiach'],
    ['Ґалаґан', 'galagan'], ['Дніпро', 'dnipro'], ['Житомир', 'zhytomyr'], ['Закарпаття', 'zakarpattia'],
    ['Київ', 'kyiv'], ['Луганськ', 'luhansk'], ['Миколаїв', 'mykolaiv'], ['Ужгород', 'uzhhorod'],
    ['Феодосія', 'feodosiia'], ['Харків', 'kharkiv'], ['Цвіт', 'tsvit'], ['Чернігів', 'chernihiv'],
    ['Шостка', 'shostka'], ['Щербаки', 'shcherbaky'],
  ])('%s gives %s', (cyr, latin) => {
    expect(lo(cyr)).toBe(latin);
  });
});

describe('FR-12 (iii): position-dependent letters є ї й ю я (T9)', () => {
  it.each([
    ['Єнакієве', 'yenakiieve'],      // є: ye at the start of a word, ie elsewhere
    ['Їжакевич', 'yizhakevych'],     // ї: yi at the start, i elsewhere
    ['Йосипівка', 'yosypivka'],      // й: y at the start, i elsewhere
    ['Юрій', 'yurii'],               // ю: yu at the start; й at the end is i
    ['Яготин', 'yahotyn'],           // я: ya at the start, ia elsewhere
    ['Борисполя', 'boryspolia'],     // я in the middle/end: ia
    ['Олексій', 'oleksii'],          // й after a vowel: i
  ])('%s gives %s', (cyr, latin) => {
    expect(lo(cyr)).toBe(latin);
  });

  it('the start of a LATER word counts as a word start: "червоний юрій" gives "chervonyi yurii"', () => {
    expect(lo('червоний юрій')).toBe('chervonyi yurii');
  });
});

describe('FR-12 (iii): зг is "zgh", the soft sign and apostrophes are dropped (T9)', () => {
  it('зг gives zgh (not zh): Згорани -> zghorany, Розгон -> rozghon', () => {
    expect(lo('Згорани')).toBe('zghorany');
    expect(lo('Розгон')).toBe('rozghon');
  });

  it('a lone з before another letter and a lone г after another letter keep their ordinary letters (z, h)', () => {
    expect(lo('зуб')).toBe('zub');
    expect(lo('нога')).toBe('noha');
  });

  it('the soft sign is dropped: Ольга -> olha, день -> den', () => {
    expect(lo('Ольга')).toBe('olha');
    expect(lo('день')).toBe('den');
  });

  it.each([["Кам'янець", 'kamianets'], ['Кам’янець', 'kamianets'], ['Камʼянець', 'kamianets'], ['Кам`янець', 'kamianets']])(
    'the apostrophe form %s is dropped: %s', (cyr, latin) => {
      expect(lo(cyr)).toBe(latin);
    });
});

describe('FR-12: the product phrase of the Specification and pass-through (T9)', () => {
  it('"Червоні кросівки" gives "chervoni krosivky" (the kebab step then joins it as chervoni-krosivky)', () => {
    expect(lo('Червоні кросівки')).toBe('chervoni krosivky');
  });

  it('Latin letters, digits, spaces and punctuation pass through unchanged', () => {
    expect(transliterateUk('Red mug 2, 100%')).toBe('Red mug 2, 100%');
  });

  it('a character with no Latin mapping (CJK) is not turned into a Latin letter', () => {
    expect(transliterateUk('图')).not.toMatch(/[a-z]/i);
  });

  it('an empty string stays empty', () => {
    expect(transliterateUk('')).toBe('');
  });
});

/**
 * US-10.5 T6 - plural categories and count messages (Specification "Plural forms", FR-2, FR-4; plan DD-12).
 *
 * PINNED CONTRACT (src/utils/image-studio/plural.ts, owner T6):
 *   pluralCategory(lang: 'en' | 'uk', n: number): 'one' | 'few' | 'many'
 *       en: 'one' for exactly 1, 'many' otherwise (0 included); uk: the CLDR cardinal rule quoted in the Specification:
 *       one when n mod 10 = 1 and n mod 100 != 11; few when n mod 10 is 2..4 and n mod 100 is not 12..14; many otherwise.
 *   studioCount(id: string, lang, n: number, params?): string
 *       resolves `${id}.${pluralCategory(lang, n)}` through studioText with {N} = n (extra params are merged); an unknown family
 *       id throws, exactly like studioText.
 * The expected categories below are written from the Specification text, not read back from the implementation.
 * Logic runner. Red until T6.
 */
import { describe, it, expect } from 'vitest';
import { pluralCategory, studioCount } from './plural';

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

describe('FR-2 / FR-4: pluralCategory for uk follows the CLDR cardinal rule (T6)', () => {
  const ONE = [1, 21, 31, 101, 121, 1001];
  const FEW = [2, 3, 4, 22, 23, 24, 32, 102, 103, 104, 122];
  const MANY = [0, ...range(5, 20), ...range(25, 30), 100, 111, 112, 113, 114, 211, 212, 1000];

  it.each(ONE)('uk %i is "one"', (n) => expect(pluralCategory('uk', n)).toBe('one'));
  it.each(FEW)('uk %i is "few"', (n) => expect(pluralCategory('uk', n)).toBe('few'));
  it.each(MANY)('uk %i is "many"', (n) => expect(pluralCategory('uk', n)).toBe('many'));

  it('every integer 0..30 plus 101, 111, 121 falls in exactly one category and the three lists above cover them (no gap in the table)', () => {
    const covered = new Set([...ONE, ...FEW, ...MANY]);
    for (const n of [...range(0, 30), 101, 111, 121]) expect(covered.has(n), String(n)).toBe(true);
  });
});

describe('FR-2 / FR-4: pluralCategory for en (T6)', () => {
  it('1 is "one"; 0, 2 and larger numbers are "many" (the Specification: singular for exactly 1, plural otherwise including 0)', () => {
    expect(pluralCategory('en', 1)).toBe('one');
    expect(pluralCategory('en', 0)).toBe('many');
    expect(pluralCategory('en', 2)).toBe('many');
    expect(pluralCategory('en', 21)).toBe('many');
    expect(pluralCategory('en', 101)).toBe('many');
  });
});

describe('FR-2 / FR-4: studioCount fills {N} with the right form (T6)', () => {
  it('sessions, en: "1 session", "0 sessions", "2 sessions", "20 sessions"', () => {
    expect(studioCount('X-32', 'en', 1)).toBe('1 session');
    expect(studioCount('X-32', 'en', 0)).toBe('0 sessions');
    expect(studioCount('X-32', 'en', 2)).toBe('2 sessions');
    expect(studioCount('X-32', 'en', 20)).toBe('20 sessions');
  });

  it('sessions, uk: "1 сесія" (one), "2 сесії" (few), "5 сесій" (many), "21 сесія", "11 сесій", "22 сесії"', () => {
    expect(studioCount('X-32', 'uk', 1)).toBe('1 сесія');
    expect(studioCount('X-32', 'uk', 2)).toBe('2 сесії');
    expect(studioCount('X-32', 'uk', 5)).toBe('5 сесій');
    expect(studioCount('X-32', 'uk', 21)).toBe('21 сесія');
    expect(studioCount('X-32', 'uk', 11)).toBe('11 сесій');
    expect(studioCount('X-32', 'uk', 22)).toBe('22 сесії');
    expect(studioCount('X-32', 'uk', 0)).toBe('0 сесій');
  });

  it('images, en and uk: "1 image" / "3 images"; "1 зображення" (one), "2 зображення" (few), "5 зображень" (many)', () => {
    expect(studioCount('X-34', 'en', 1)).toBe('1 image');
    expect(studioCount('X-34', 'en', 3)).toBe('3 images');
    expect(studioCount('X-34', 'uk', 1)).toBe('1 зображення');
    expect(studioCount('X-34', 'uk', 2)).toBe('2 зображення');
    expect(studioCount('X-34', 'uk', 5)).toBe('5 зображень');
  });

  it('history, both languages: the count appears in "· history (N)" / "· історія (N)" whatever the category', () => {
    for (const n of [0, 1, 2, 5, 21]) {
      expect(studioCount('X-33', 'en', n)).toBe(`· history (${n})`);
      expect(studioCount('X-33', 'uk', n)).toBe(`· історія (${n})`);
    }
  });

  it('an unknown family id throws instead of rendering an empty string (the studioText contract is kept)', () => {
    expect(() => studioCount('X-999', 'en', 1)).toThrow();
  });
});

/**
 * US-10.5 T9 - the "Download all" archive name (Story v5 AC-6; Specification FR-12, owner ruling on Q5 / OD-26; plan DD-8).
 *
 * PINNED CONTRACT (src/utils/image-studio/archive-name.ts, owner T9; pure, no `Date`: architecture scan g):
 *   buildArchiveName(sessionName: string, epochMs: number): string      `{YYYYMMDD-HHMMSS}-{K}.zip`, UTC
 *   cutToWordBoundary(k: string, limit: number): string                the owner's cut rule on the already-normalised kebab string
 * where K is the kebab string of the Specification's ratified order: transliterate (Ukrainian national scheme), lower-case, replace
 * every run of characters outside a-z0-9 by one hyphen, trim leading and trailing hyphens; the 40-character limit, the window of the
 * first 41 characters and "the last hyphen" are all counted on K. An empty K gives `{timestamp}-image-studio-versions.zip`.
 *
 * The five vectors of FR-12 are the Specification's own (computed there for the ruled rule), not read back from the code.
 * The instant is a plain epoch value: this spec never reads the wall clock (NFR-4). Logic runner. Red until T9.
 */
import { describe, it, expect } from 'vitest';
import { buildArchiveName, cutToWordBoundary } from './archive-name';

const utc = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0) => Date.UTC(y, mo - 1, d, h, mi, s);
const T = utc(2026, 11, 8, 18, 15, 30);
const stem = (name: string, t = T) => buildArchiveName(name, t).replace(/^\d{8}-\d{6}-/, '').replace(/\.zip$/, '');

describe('FR-12: the Story example and the timestamp (T9)', () => {
  it('Story AC-6: "Red sneakers on white" at 2026-11-08 18:15:30 UTC is 20261108-181530-red-sneakers-on-white.zip', () => {
    expect(buildArchiveName('Red sneakers on white', T)).toBe('20261108-181530-red-sneakers-on-white.zip');
  });

  it.each([
    [utc(2026, 11, 8, 23, 59, 59), '20261108-235959'],
    [utc(2026, 11, 9, 0, 0, 0), '20261109-000000'],
    [utc(2028, 2, 29, 12, 0, 0), '20280229-120000'],       // a leap day
    [utc(2026, 12, 31, 23, 59, 59), '20261231-235959'],
    [utc(2027, 1, 1, 0, 0, 0), '20270101-000000'],
    [utc(2026, 1, 5, 3, 7, 9), '20260105-030709'],         // zero padding of every field
  ])('the timestamp of instant %i is UTC %s', (t, ts) => {
    expect(buildArchiveName('mug', t)).toBe(`${ts}-mug.zip`);
  });

  it('the timestamp does not depend on any local offset (no offset argument exists; UTC is used)', () => {
    expect(buildArchiveName('mug', T)).toBe(buildArchiveName('mug', T));
    expect(buildArchiveName('mug', T).startsWith('20261108-181530-')).toBe(true);
  });
});

describe('FR-12: the five vectors of the ruled cut rule (T9)', () => {
  it.each([
    ['Red sneakers on white', 'red-sneakers-on-white', 21],
    ['A red sneaker on a white background with a soft shadow', 'a-red-sneaker-on-a-white-background-with', 40],
    ['Red sneakers on a white background with a soft shadow', 'red-sneakers-on-a-white-background-with', 39],
    ['Leather hiking boots with waterproof membrane and red laces', 'leather-hiking-boots-with-waterproof', 36],
    ['Pneumonoultramicroscopicsilicovolcanoconiosisextra shoes', 'pneumonoultramicroscopicsilicovolcanocon', 40],
  ])('vector %#: "%s" gives the name part %s (%i characters)', (prompt, expected, length) => {
    expect(stem(prompt)).toBe(expected);
    expect(expected).toHaveLength(length);
  });

  it('the owner\'s earlier mid-word example (a-red-sneaker-on-a-white-backgrou) is NOT produced for its likely prompt', () => {
    expect(stem('A red sneaker on a white background')).toBe('a-red-sneaker-on-a-white-background');
    expect(stem('A red sneaker on a white background')).not.toBe('a-red-sneaker-on-a-white-backgrou');
  });
});

describe('FR-12: cutToWordBoundary on the kebab string (T9)', () => {
  it('a string of at most 40 characters is returned unchanged', () => {
    expect(cutToWordBoundary('short-name', 40)).toBe('short-name');
    expect(cutToWordBoundary('a'.repeat(40), 40)).toBe('a'.repeat(40));
  });

  it('a 40-character word followed by a hyphen at position 41 is kept whole at exactly 40 characters (the ruled boundary case)', () => {
    expect(cutToWordBoundary(`${'a'.repeat(40)}-b`, 40)).toBe('a'.repeat(40));
  });

  it('cuts before the LAST hyphen that lies within the first 41 characters', () => {
    const k = `${'a'.repeat(10)}-${'b'.repeat(10)}-${'c'.repeat(30)}`; // hyphens at positions 11 and 22; c-run has none
    expect(cutToWordBoundary(k, 40)).toBe(`${'a'.repeat(10)}-${'b'.repeat(10)}`);
  });

  it('with no hyphen in the first 41 characters it hard-cuts at exactly 40', () => {
    expect(cutToWordBoundary('x'.repeat(60), 40)).toBe('x'.repeat(40));
    expect(cutToWordBoundary(`${'x'.repeat(41)}-y`, 40)).toBe('x'.repeat(40));
  });

  it('the result is never longer than the limit and never ends in a hyphen, for every length from 38 to 60 of a hyphen-every-5 string', () => {
    for (let len = 38; len <= 60; len++) {
      const k = Array.from({ length: len }, (_, i) => ((i + 1) % 6 === 0 ? '-' : 'k')).join('').replace(/-$/, 'k');
      const out = cutToWordBoundary(k, 40);
      expect(out.length, `len ${len}`).toBeLessThanOrEqual(40);
      expect(out.endsWith('-'), `len ${len}`).toBe(false);
      expect(out.length, `len ${len}`).toBeGreaterThan(0);
    }
  });
});

describe('FR-12: normalisation order - transliterate, lower-case, runs to one hyphen, trim (T9)', () => {
  it('upper case becomes lower case', () => {
    expect(stem('RED Sneakers')).toBe('red-sneakers');
  });

  it('runs of spaces, punctuation and symbols become ONE hyphen; leading and trailing ones are trimmed', () => {
    expect(stem('  --a  b__c!!d??  ')).toBe('a-b-c-d');
    expect(stem('mug (blue) / 250 ml')).toBe('mug-blue-250-ml');
  });

  it('Ukrainian is transliterated before the kebab step: "Червоні кросівки" gives chervoni-krosivky', () => {
    expect(stem('Червоні кросівки')).toBe('chervoni-krosivky');
  });

  it('the 40 limit is counted AFTER transliteration (a transliterated letter can take several Latin characters)', () => {
    // each "щ" is "shch" (4 characters): ten of them are 40 characters, eleven are 44 -> hard cut at 40
    expect(stem('щ'.repeat(11))).toBe('shch'.repeat(10));
    // 30 x "ю": "yu" + 29 x "iu" = 60 characters, no hyphen -> hard cut at 40
    expect(stem('ю'.repeat(30))).toBe(`yu${'iu'.repeat(19)}`);
  });

  it('a character with no Latin mapping is a special character (it becomes a hyphen, never a stray symbol)', () => {
    expect(stem('mug 图 blue')).toBe('mug-blue');
  });

  it('the name part never ends or begins with a hyphen and only contains a-z, 0-9 and hyphens', () => {
    for (const p of ['Red sneakers on white', '  Крутий   ЧАЙНИК!! ', 'a'.repeat(39) + ' b c d', '!!!x!!!', 'ß ü ö']) {
      const s = stem(p);
      expect(s, p).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(s.length, p).toBeLessThanOrEqual(40);
    }
  });
});

describe('FR-12 failure path: an empty name part falls back to image-studio-versions (T9)', () => {
  it.each([[''], ['   '], ['!!!'], ['—…—'], ['图图图'], ['ьььь']])('the session name %j gives {timestamp}-image-studio-versions.zip', (name) => {
    expect(buildArchiveName(name, T)).toBe('20261108-181530-image-studio-versions.zip');
  });

  it('a valid file name is always produced: no "undefined", no double hyphen, ends with .zip', () => {
    for (const name of ['', 'a', '---', 'Red sneakers on white', 'Червоні кросівки', 'щ'.repeat(50)]) {
      const out = buildArchiveName(name, T);
      expect(out).toMatch(/^\d{8}-\d{6}-[a-z0-9]+(?:-[a-z0-9]+)*\.zip$/);
      expect(out).not.toContain('undefined');
    }
  });
});

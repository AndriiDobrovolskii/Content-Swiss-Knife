/**
 * US-2.2 T1 — the simplified-template registry (`simplified-templates.ts`).
 *
 * Covers AC-3, AC-4, AC-5, AC-9 (flag), AC-12 (table values), AC-14 (ceiling value).
 *
 * CONTRACT ASSUMED HERE (the plan names the exports but not their return shapes; recorded in the
 * test strategy so the builder conforms to the tests, not the other way round):
 *   · `paragraphsFor(id, { includeFunctionality })` returns the ORDERED list of v4 paragraph
 *     NUMBERS (1..9) that the template requests. Data-conditional paragraphs (§5, §7) are listed:
 *     "conditional on source data" is a property of the prompt, not of the set (FR-10, FR-11).
 *   · `V4_WORD_RANGES` exposes `{ min, max }` per paragraph under the keys hook, block2 (Killer
 *     Specs + Key Benefits), applications, compatibility, cta, faq.
 *   · `countWords(text)` counts whitespace-delimited words of tag-stripped text.
 */
import { describe, it, expect } from 'vitest';
import {
  SIMPLIFIED_TEMPLATE_IDS,
  isSimplifiedTemplateId,
  paragraphsFor,
  V4_WORD_RANGES,
  NARRATIVE_SOFT_CEILING,
  countWords,
} from './simplified-templates';
import { STALE_TEMPLATE_ID } from '../../test/fixtures/removed-tokens';

describe('template ids and the guard', () => {
  it('registers exactly the three simplified ids, in dropdown order', () => {
    expect([...SIMPLIFIED_TEMPLATE_IDS]).toEqual(['filaments-resins-powders', 'accessories', 'spare-parts']);
  });

  it('isSimplifiedTemplateId is true for each registered id', () => {
    for (const id of SIMPLIFIED_TEMPLATE_IDS) expect(isSimplifiedTemplateId(id)).toBe(true);
  });

  it('is false for undefined and empty string (Full description carries no id — OD-5)', () => {
    expect(isSimplifiedTemplateId(undefined)).toBe(false);
    expect(isSimplifiedTemplateId('')).toBe(false);
  });

  it('is false for a stale template id and for unknown ids (D14: stale ids degrade to Full)', () => {
    expect(isSimplifiedTemplateId(STALE_TEMPLATE_ID)).toBe(false);
    expect(isSimplifiedTemplateId('full')).toBe(false);
    expect(isSimplifiedTemplateId('Accessories')).toBe(false);
  });
});

describe('paragraph sets (AC-3, AC-4, AC-5)', () => {
  it('Filaments/resins/powders requests 1, 2, 4, 5, 7, 8 and never 3, 6, 9', () => {
    const set = paragraphsFor('filaments-resins-powders', { includeFunctionality: false });
    expect([...set]).toEqual([1, 2, 4, 5, 7, 8]);
    expect(set).not.toContain(3);
    expect(set).not.toContain(6);
    expect(set).not.toContain(9);
  });

  it('Filaments ignores the functionality flag (it is an Accessories-only control)', () => {
    expect([...paragraphsFor('filaments-resins-powders', { includeFunctionality: true })]).toEqual([1, 2, 4, 5, 7, 8]);
  });

  it('Accessories with the flag unchecked requests 1, 2, 5, 7, 8 (no §3)', () => {
    const set = paragraphsFor('accessories', { includeFunctionality: false });
    expect([...set]).toEqual([1, 2, 5, 7, 8]);
    for (const n of [3, 4, 6, 9]) expect(set).not.toContain(n);
  });

  it('Accessories with the flag checked requests 1, 2, 3, 5, 7, 8 (still no §4, §6, §9)', () => {
    const set = paragraphsFor('accessories', { includeFunctionality: true });
    expect([...set]).toEqual([1, 2, 3, 5, 7, 8]);
    for (const n of [4, 6, 9]) expect(set).not.toContain(n);
  });

  it('Spare parts requests only 1, 5, 8 whatever the flag says', () => {
    expect([...paragraphsFor('spare-parts', { includeFunctionality: false })]).toEqual([1, 5, 8]);
    expect([...paragraphsFor('spare-parts', { includeFunctionality: true })]).toEqual([1, 5, 8]);
  });

  it('no simplified template ever requests §6 or §9 (FAQ stays with Full description)', () => {
    for (const id of SIMPLIFIED_TEMPLATE_IDS) {
      for (const flag of [true, false]) {
        const set = paragraphsFor(id, { includeFunctionality: flag });
        expect(set).not.toContain(6);
        expect(set).not.toContain(9);
      }
    }
  });
});

describe('v4 word ranges and the soft ceiling (AC-12, AC-14, OD-11)', () => {
  it('encodes the v4 ranges, minimum and maximum', () => {
    expect(V4_WORD_RANGES.hook).toMatchObject({ min: 40, max: 85 });
    expect(V4_WORD_RANGES.block2).toMatchObject({ min: 90, max: 300 });
    expect(V4_WORD_RANGES.applications).toMatchObject({ min: 80, max: 250 });
    expect(V4_WORD_RANGES.compatibility).toMatchObject({ min: 30, max: 100 });
    expect(V4_WORD_RANGES.cta).toMatchObject({ min: 50, max: 100 });
    expect(V4_WORD_RANGES.faq).toMatchObject({ min: 150, max: 400 });
  });

  it('the narrative ceiling is 5500 characters', () => {
    expect(NARRATIVE_SOFT_CEILING).toBe(5500);
  });

  it('no legacy consumables limit survives in the table (hook 40–60, ~4700 target)', () => {
    expect(V4_WORD_RANGES.hook.max).not.toBe(60);
    expect(JSON.stringify(V4_WORD_RANGES)).not.toMatch(/4700/);
  });
});

describe('countWords — the single counter both validators share (D5)', () => {
  it('counts whitespace-delimited words and ignores tags', () => {
    expect(countWords('<b>eSUN PLA+</b> — один два три')).toBeGreaterThanOrEqual(5);
    expect(countWords('<p>один два три</p>')).toBe(3);
  });
  it('is 0 for empty and whitespace-only text', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \n ')).toBe(0);
  });
  it('does not count tag names or attributes as words', () => {
    expect(countWords('<p class="cta" style="x: y">слово</p>')).toBe(1);
  });
});

/**
 * faq-form.spec.ts — US-8.1 T9: `isFaqFormComplete`, the Generate-enablement predicate of the FAQ
 * Generator (AC-11, AC-12; FR-16, FR-17).
 *
 * TABLE A SPEC, OWNED BY T9. The module `./faq-form` does not exist yet, so this file is RED BY ABSENT
 * MODULE, BY DESIGN (task breakdown, constraint 4): vitest reports "Failed to resolve import
 * './faq-form'" and `tsc` reports TS2307 in this file only.
 *
 * Contract (task breakdown T9):
 *   interface FaqFormValues { website: WebsiteOption | null; productName: string; supplementalContent: string }
 *   isFaqFormComplete(values): boolean
 *   true only when a store is selected AND productName.trim() !== '' AND supplementalContent.trim() !== ''.
 *   Original Description and Tech Specs are NOT parameters: they are optional context (AC-12).
 *
 * AC-11: "The Generate action is disabled while any of Product Name, Store or Supplemental Content is
 * empty (whitespace-only counts as empty), and enabled once all three are filled."
 */
import { describe, it, expect } from 'vitest';
import { isFaqFormComplete, type FaqFormValues } from './faq-form';
import { WEBSITE_OPTIONS } from '../app/types';

const SITE = WEBSITE_OPTIONS[0];
const FILLED: FaqFormValues = { website: SITE, productName: 'Bambu Lab P1S', supplementalContent: 'Q: does it need a heated bed? A: yes, 60 °C.' };

describe('AC-11: Generate is enabled only when Store, Product Name and Supplemental Content are all filled', () => {
  it('all three filled: complete', () => {
    expect(isFaqFormComplete(FILLED)).toBe(true);
  });

  it('no store selected: incomplete', () => {
    expect(isFaqFormComplete({ ...FILLED, website: null })).toBe(false);
  });

  it.each([[''], ['   '], ['\t\n '], [' ']])('Product Name %j (empty or whitespace-only) counts as empty', (name) => {
    expect(isFaqFormComplete({ ...FILLED, productName: name })).toBe(false);
  });

  it.each([[''], ['   '], ['\n\n\t  \n']])('Supplemental Content %j (empty or whitespace-only) counts as empty', (text) => {
    expect(isFaqFormComplete({ ...FILLED, supplementalContent: text })).toBe(false);
  });

  it('every single missing field blocks, in every combination', () => {
    const fields: Array<keyof FaqFormValues> = ['website', 'productName', 'supplementalContent'];
    for (let mask = 0; mask < 8; mask++) {
      const values: FaqFormValues = {
        website: mask & 1 ? SITE : null,
        productName: mask & 2 ? 'P1S' : '',
        supplementalContent: mask & 4 ? 'notes' : '',
      };
      expect(isFaqFormComplete(values), fields.map((f, i) => `${String(f)}:${mask & (1 << i) ? 'set' : 'empty'}`).join(' ')).toBe(mask === 7);
    }
  });

  it('surrounding whitespace around real content does not make a field empty', () => {
    expect(isFaqFormComplete({ ...FILLED, productName: '  P1S  ', supplementalContent: '\n notes \n' })).toBe(true);
  });

  it.each(WEBSITE_OPTIONS.map(w => [w.name, w] as const))('store %s (every registry store) completes the form', (_name, website) => {
    expect(isFaqFormComplete({ ...FILLED, website })).toBe(true);
  });
});

describe('AC-12: Original Description and Tech Specs are optional context', () => {
  it('the predicate takes no description or specs, so leaving them blank can never block Generate', () => {
    // FaqFormValues carries exactly three fields; handing the predicate only those must be enough.
    const onlyThree: FaqFormValues = { website: SITE, productName: 'P1S', supplementalContent: 'notes' };
    expect(Object.keys(onlyThree).sort()).toEqual(['productName', 'supplementalContent', 'website']);
    expect(isFaqFormComplete(onlyThree)).toBe(true);
  });

  it('extra fields a caller may hold (description, specs) change nothing', () => {
    const withExtras = { ...FILLED, description: '', specs: '' } as FaqFormValues;
    expect(isFaqFormComplete(withExtras)).toBe(true);
    expect(isFaqFormComplete({ ...withExtras, description: 'x', specs: 'y' } as FaqFormValues)).toBe(true);
  });
});

describe('purity', () => {
  it('does not mutate its argument and gives the same answer twice', () => {
    const values = { ...FILLED };
    const snapshot = JSON.stringify(values);
    expect(isFaqFormComplete(values)).toBe(isFaqFormComplete(values));
    expect(JSON.stringify(values)).toBe(snapshot);
  });
});

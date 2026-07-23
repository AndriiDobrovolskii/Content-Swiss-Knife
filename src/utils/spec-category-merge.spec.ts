import { describe, it, expect } from 'vitest';
import { mergeSmallSpecCategories } from './spec-category-merge';

function category(label: string, rowCount: number): string {
  const rows = Array.from({ length: rowCount }, (_, i) => `<tr><td>${label} row ${i}</td><td>${i}</td></tr>`).join('');
  return `<h3>${label}</h3><div class="table-responsive"><table><thead><tr><th>Параметр</th><th>Значення</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function section(h2: string, categories: string): string {
  return `<section class="specs">${h2}${categories}</section>`;
}

describe('mergeSmallSpecCategories', () => {
  it('dissolves a 1-row category into Загальні відомості, placed first', () => {
    const h2 = '<h2>Технічні характеристики Anycubic Kobra 3</h2>';
    const html = section(h2, category('Матеріали', 1) + category('Продуктивність', 4));
    const result = mergeSmallSpecCategories(html);

    const doc = new DOMParser().parseFromString(result, 'text/html');
    const h3s = Array.from(doc.querySelectorAll('section.specs h3')).map(h => h.textContent);
    expect(h3s).toEqual(['Загальні відомості', 'Продуктивність']);

    const firstTable = doc.querySelectorAll('section.specs table')[0];
    expect(firstTable.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('dissolves a 2-row category (below the default 3-row threshold)', () => {
    const html = section('<h2>Specs</h2>', category('A', 2) + category('B', 3));
    const result = mergeSmallSpecCategories(html);
    const doc = new DOMParser().parseFromString(result, 'text/html');
    expect(Array.from(doc.querySelectorAll('section.specs h3')).map(h => h.textContent)).toEqual(['Загальні відомості', 'B']);
  });

  it('keeps a 3-row category as its own block (meets the threshold)', () => {
    const html = section('<h2>Specs</h2>', category('A', 3) + category('B', 3));
    const result = mergeSmallSpecCategories(html);
    const doc = new DOMParser().parseFromString(result, 'text/html');
    expect(Array.from(doc.querySelectorAll('section.specs h3')).map(h => h.textContent)).toEqual(['A', 'B']);
  });

  it('keeps a 4-row category as its own block', () => {
    const html = section('<h2>Specs</h2>', category('A', 1) + category('B', 4));
    const result = mergeSmallSpecCategories(html);
    const doc = new DOMParser().parseFromString(result, 'text/html');
    expect(Array.from(doc.querySelectorAll('section.specs h3')).map(h => h.textContent)).toEqual(['Загальні відомості', 'B']);
  });

  it('absorbs dissolved rows into an existing Загальні відомості category instead of duplicating it', () => {
    const html = section('<h2>Specs</h2>', category('Загальні відомості', 2) + category('Матеріали', 1) + category('Продуктивність', 4));
    const result = mergeSmallSpecCategories(html);
    const doc = new DOMParser().parseFromString(result, 'text/html');
    const h3s = Array.from(doc.querySelectorAll('section.specs h3')).map(h => h.textContent);
    expect(h3s).toEqual(['Загальні відомості', 'Продуктивність']);
    expect(h3s.filter(h => h === 'Загальні відомості').length).toBe(1);

    const firstTable = doc.querySelectorAll('section.specs table')[0];
    expect(firstTable.querySelectorAll('tbody tr').length).toBe(3); // 2 original + 1 dissolved
  });

  it('is a no-op when all categories already meet the threshold', () => {
    const html = section('<h2>Specs</h2>', category('A', 3) + category('B', 5));
    expect(mergeSmallSpecCategories(html)).toBe(html);
  });

  it('is a no-op when <section class="specs"> is absent', () => {
    const html = '<p>No specs here.</p>';
    expect(mergeSmallSpecCategories(html)).toBe(html);
  });

  it('preserves the original <h2> text verbatim, including the interpolated product name', () => {
    const h2 = '<h2>Технічні характеристики Anycubic Kobra 3</h2>';
    const html = section(h2, category('Матеріали', 1) + category('Продуктивність', 4));
    const result = mergeSmallSpecCategories(html);
    expect(result).toContain(h2);
  });

  it('preserves HTML before and after <section class="specs"> untouched', () => {
    const before = '<p>Intro paragraph.</p>';
    const after = '<hr><section class="faq"><p>FAQ</p></section>';
    const html = before + section('<h2>Specs</h2>', category('A', 1) + category('B', 4)) + after;
    const result = mergeSmallSpecCategories(html);
    expect(result.startsWith(before)).toBe(true);
    expect(result.endsWith(after)).toBe(true);
  });

  it('an explicit minRows still works with the new (minRows, locale) signature', () => {
    const html = section('<h2>Specs</h2>', category('A', 4) + category('B', 5));
    // minRows=5 dissolves the 4-row category too, unlike the default threshold of 3.
    const result = mergeSmallSpecCategories(html, 5);
    const doc = new DOMParser().parseFromString(result, 'text/html');
    expect(Array.from(doc.querySelectorAll('section.specs h3')).map(h => h.textContent)).toEqual(['Загальні відомості', 'B']);
  });

  it('localizes the base-category label and table headers for a non-default locale', () => {
    const html = section('<h2>Specs</h2>', category('A', 1) + category('B', 4));
    const result = mergeSmallSpecCategories(html, 3, 'es-es');
    const doc = new DOMParser().parseFromString(result, 'text/html');
    const h3s = Array.from(doc.querySelectorAll('section.specs h3')).map(h => h.textContent);
    expect(h3s).toEqual(['Información general', 'B']);
    const firstThead = doc.querySelectorAll('section.specs thead')[0];
    expect(firstThead.textContent).toBe('ParámetroValor');
  });

  it('resolves an unrecognized-but-related locale (es-AR) to the Spanish labels via prefix fallback', () => {
    const html = section('<h2>Specs</h2>', category('A', 1) + category('B', 4));
    const result = mergeSmallSpecCategories(html, 3, 'es-AR');
    const doc = new DOMParser().parseFromString(result, 'text/html');
    expect(doc.querySelector('section.specs h3')?.textContent).toBe('Información general');
  });

  it('falls back to the uk-ua labels for a fully unrecognized locale', () => {
    const html = section('<h2>Specs</h2>', category('A', 1) + category('B', 4));
    const result = mergeSmallSpecCategories(html, 3, 'xx-yy');
    const doc = new DOMParser().parseFromString(result, 'text/html');
    expect(doc.querySelector('section.specs h3')?.textContent).toBe('Загальні відомості');
  });
});

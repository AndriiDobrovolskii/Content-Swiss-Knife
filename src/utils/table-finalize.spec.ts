import { describe, it, expect } from 'vitest';
import { collapseKillerSpecsToTwoColumns, flattenSpecCategoriesToColspanTable, finalizeTablesForDisplay } from './table-finalize';

function killerSpecsTable(whyHeader = 'Чому це важливо'): string {
  return (
    `<p>Hook paragraph.</p>` +
    `<table><thead><tr><th>Характеристика</th><th>Значення</th><th>${whyHeader}</th></tr></thead>` +
    `<tbody>` +
    `<tr><td>Об'єм друку</td><td>250x250x260 мм</td><td>Досить місця для великих моделей.</td></tr>` +
    `<tr><td>Швидкість друку</td><td>500 мм/с</td><td>Швидший друк без втрати якості.</td></tr>` +
    `</tbody></table>`
  );
}

function lookAlikeTable(): string {
  return (
    `<table><thead><tr><th>Filament</th><th>Compatible</th><th>Notes</th></tr></thead>` +
    `<tbody><tr><td>PLA</td><td>Yes</td><td>Default profile</td></tr></tbody></table>`
  );
}

function category(label: string, rowCount: number): string {
  const rows = Array.from({ length: rowCount }, (_, i) => `<tr><td>${label} row ${i}</td><td>${i}</td></tr>`).join('');
  return `<h3>${label}</h3><div class="table-responsive"><table><thead><tr><th>Параметр</th><th>Значення</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

describe('collapseKillerSpecsToTwoColumns', () => {
  it('merges Specification+Value into one cell and swaps the header to the localized 2-column pair', () => {
    const result = collapseKillerSpecsToTwoColumns(killerSpecsTable(), 'uk-UA');
    const doc = new DOMParser().parseFromString(result, 'text/html');
    const table = doc.querySelector('table')!;

    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent);
    expect(headers).toEqual(['Параметр', 'Ваша перевага']);

    const firstRow = table.querySelectorAll('tbody tr')[0];
    const cells = Array.from(firstRow.querySelectorAll('td')).map(td => td.textContent);
    expect(cells).toEqual(["Об'єм друку: 250x250x260 мм", 'Досить місця для великих моделей.']);
  });

  it('falls back to the English header pair for an unmapped locale', () => {
    const result = collapseKillerSpecsToTwoColumns(killerSpecsTable('Why it matters'), 'xx-XX');
    const doc = new DOMParser().parseFromString(result, 'text/html');
    const headers = Array.from(doc.querySelectorAll('thead th')).map(th => th.textContent);
    expect(headers).toEqual(['Parameter', 'Your Advantage']);
  });

  it('is a no-op when the only table present is inside section.specs', () => {
    const html = `<section class="specs">${category('A', 3)}</section>`;
    expect(collapseKillerSpecsToTwoColumns(html, 'uk-UA')).toBe(html);
  });

  it('leaves an unrelated 3-column table untouched (no "why it matters" marker) and still collapses the real killer-specs table', () => {
    const html = killerSpecsTable() + lookAlikeTable();
    const result = collapseKillerSpecsToTwoColumns(html, 'uk-UA');
    const doc = new DOMParser().parseFromString(result, 'text/html');
    const tables = doc.querySelectorAll('table');

    expect(Array.from(tables[0].querySelectorAll('thead th')).map(th => th.textContent)).toEqual(['Параметр', 'Ваша перевага']);
    expect(Array.from(tables[1].querySelectorAll('thead th')).map(th => th.textContent)).toEqual(['Filament', 'Compatible', 'Notes']);
  });
});

describe('flattenSpecCategoriesToColspanTable', () => {
  it('flattens N category blocks into one table with colspan header rows, preserving row order and content', () => {
    const h2 = '<h2>Технічні характеристики Anycubic Kobra 3</h2>';
    const html = `<section class="specs">${h2}${category('Матеріали', 2)}${category('Продуктивність', 2)}</section>`;
    const result = flattenSpecCategoriesToColspanTable(html);
    const doc = new DOMParser().parseFromString(result, 'text/html');

    expect(doc.querySelectorAll('section.specs table').length).toBe(1);
    expect(doc.querySelector('section.specs h2')?.outerHTML).toBe(h2);

    const rows = Array.from(doc.querySelectorAll('section.specs table tr'));
    expect(rows[0].querySelector('th[colspan="2"]')?.textContent).toBe('Матеріали');
    expect(rows[1].textContent).toContain('Матеріали row 0');
    expect(rows[2].textContent).toContain('Матеріали row 1');
    expect(rows[3].querySelector('th[colspan="2"]')?.textContent).toBe('Продуктивність');
    expect(rows[4].textContent).toContain('Продуктивність row 0');
    expect(rows[5].textContent).toContain('Продуктивність row 1');
  });

  it('is a no-op when <section class="specs"> is absent', () => {
    const html = '<p>No specs here.</p>';
    expect(flattenSpecCategoriesToColspanTable(html)).toBe(html);
  });

  it('preserves HTML before and after section.specs untouched', () => {
    const before = '<p>Intro.</p>';
    const after = '<hr>';
    const html = before + `<section class="specs"><h2>Specs</h2>${category('A', 2)}</section>` + after;
    const result = flattenSpecCategoriesToColspanTable(html);
    expect(result.startsWith(before)).toBe(true);
    expect(result.endsWith(after)).toBe(true);
  });
});

describe('finalizeTablesForDisplay', () => {
  it('applies both transforms together', () => {
    const html = killerSpecsTable() + `<section class="specs"><h2>Specs</h2>${category('A', 2)}</section>`;
    const result = finalizeTablesForDisplay(html, 'uk-UA');
    const doc = new DOMParser().parseFromString(result, 'text/html');

    expect(Array.from(doc.querySelectorAll('table')[0].querySelectorAll('thead th')).map(th => th.textContent)).toEqual(['Параметр', 'Ваша перевага']);
    expect(doc.querySelectorAll('section.specs table').length).toBe(1);
    expect(doc.querySelector('section.specs table th[colspan="2"]')?.textContent).toBe('A');
  });
});

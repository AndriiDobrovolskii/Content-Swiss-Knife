import { describe, it, expect } from 'vitest';
import { collapseKillerSpecsToTwoColumns, restyleSpecTables, finalizeTablesForDisplay } from './table-finalize';
import { STORE_REGISTRY, KILLER_SPECS_HEADERS } from '../prompt-core/constants';

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

  /**
   * Style B confines direct second-person address to the operating-tips block and the CTA, but
   * the default §2 benefit header ("Ваша перевага") is injected here deterministically, never
   * written by the model — so it violated that rule on every C3D product and no prompt rule
   * could reach it. Store-scoped override; the other seven stores are untouched.
   */
  describe('Center 3D Print impersonal §2 headers', () => {
    const headersOf = (html: string) =>
      Array.from(new DOMParser().parseFromString(html, 'text/html')
        .querySelectorAll('thead th')).map(th => th.textContent);

    const C3D_EXPECTED: Record<string, [string, string]> = {
      'uk-UA': ['Параметр', 'Практична користь'],
      'ru-UA': ['Параметр', 'Практическая польза'],
      'pl-PL': ['Parametr', 'Praktyczna korzyść'],
      'de-DE': ['Parameter', 'Praktischer Nutzen'],
      'en-GB': ['Parameter', 'Practical benefit'],
    };

    it('uses the impersonal pair in all five Center 3D Print languages', () => {
      for (const [locale, pair] of Object.entries(C3D_EXPECTED)) {
        expect(headersOf(collapseKillerSpecsToTwoColumns(killerSpecsTable(), locale, 'Center 3D Print')), locale)
          .toEqual(pair);
      }
    });

    it('covers exactly the languages STORE_REGISTRY declares for the store', () => {
      expect(Object.keys(C3D_EXPECTED).sort())
        .toEqual([...STORE_REGISTRY['Center 3D Print'].languages].sort());
    });

    /** The isolation half: Drukarka 3D shares group 'EU', so a group-based gate would leak here. */
    it('every other store keeps the current second-person header, byte-identical', () => {
      for (const store of Object.keys(STORE_REGISTRY).filter(s => s !== 'Center 3D Print')) {
        expect(headersOf(collapseKillerSpecsToTwoColumns(killerSpecsTable(), 'uk-UA', store)), store)
          .toEqual(KILLER_SPECS_HEADERS['uk-ua']);
      }
    });

    it('an unmapped locale still falls back to the document header, C3D included', () => {
      expect(headersOf(collapseKillerSpecsToTwoColumns(killerSpecsTable('Why it matters'), 'xx-XX', 'Center 3D Print')))
        .toEqual(['Характеристика', 'Why it matters']);
    });

    it('omitting storeName behaves exactly as before (Optimizer path)', () => {
      expect(headersOf(collapseKillerSpecsToTwoColumns(killerSpecsTable(), 'uk-UA')))
        .toEqual(KILLER_SPECS_HEADERS['uk-ua']);
    });
  });

  it("derives the fallback pair from the document's own header text for an unmapped locale", () => {
    const result = collapseKillerSpecsToTwoColumns(killerSpecsTable('Why it matters'), 'xx-XX');
    const doc = new DOMParser().parseFromString(result, 'text/html');
    const headers = Array.from(doc.querySelectorAll('thead th')).map(th => th.textContent);
    expect(headers).toEqual(['Характеристика', 'Why it matters']);
  });

  it('derives a Spanish fallback pair from the document when no locale is passed (Optimizer path)', () => {
    const spanishTable =
      `<p>Hook paragraph.</p>` +
      `<table><thead><tr><th>Especificación</th><th>Valor</th><th>Por qué es importante</th></tr></thead>` +
      `<tbody>` +
      `<tr><td>Volumen de impresión</td><td>250x250x260 mm</td><td>Suficiente espacio para modelos grandes.</td></tr>` +
      `</tbody></table>`;
    const result = collapseKillerSpecsToTwoColumns(spanishTable);
    const doc = new DOMParser().parseFromString(result, 'text/html');
    const headers = Array.from(doc.querySelectorAll('thead th')).map(th => th.textContent);
    expect(headers).toEqual(['Especificación', 'Por qué es importante']);
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

describe('restyleSpecTables', () => {
  it('keeps one table per category and applies the store theme classes', () => {
    const h2 = '<h2>Технічні характеристики</h2>';
    const html = `<section class="specs">${h2}${category('Матеріали', 2)}${category('Продуктивність', 2)}</section>`;
    const doc = new DOMParser().parseFromString(restyleSpecTables(html), 'text/html');

    const tables = doc.querySelectorAll('section.specs table');
    expect(tables.length).toBe(2);
    expect(doc.querySelector('section.specs h2')?.outerHTML).toBe(h2);
    expect(Array.from(doc.querySelectorAll('section.specs h3')).map(h => h.textContent))
      .toEqual(['Матеріали', 'Продуктивність']);

    for (const table of Array.from(tables)) {
      expect(table.getAttribute('class')).toBe('table table-bordered table-striped');
      expect(table.getAttribute('style')).toBe('table-layout: fixed;');
    }
  });

  it('rewrites the header row to <td><b>…</b></td>, reusing the labels the model wrote', () => {
    const html = `<section class="specs"><h2>Specs</h2>${category('Матеріали', 1)}</section>`;
    const doc = new DOMParser().parseFromString(restyleSpecTables(html), 'text/html');

    const headerCells = Array.from(doc.querySelectorAll('section.specs thead td'));
    expect(headerCells.map(td => td.textContent)).toEqual(['Параметр', 'Значення']);
    expect(headerCells.map(td => td.firstElementChild?.tagName)).toEqual(['B', 'B']);
    expect(headerCells[0].getAttribute('style')).toBe('width: 45%;');
    expect(headerCells[1].hasAttribute('style')).toBe(false);
    // The <th> shape is gone — the theme's templates use <td>. See the const doc-comment.
    expect(doc.querySelectorAll('section.specs th').length).toBe(0);
  });

  it('preserves every category and every data row — the count is the contract', () => {
    const html = `<section class="specs"><h2>Specs</h2>${category('A', 3)}${category('B', 5)}${category('C', 2)}</section>`;
    const doc = new DOMParser().parseFromString(restyleSpecTables(html), 'text/html');

    expect(doc.querySelectorAll('section.specs h3').length).toBe(3);
    expect(doc.querySelectorAll('section.specs tbody tr').length).toBe(10);
  });

  it('collapses a multi-value <ul> cell into comma-separated text', () => {
    const html =
      `<section class="specs"><h2>Specs</h2><h3>Вихідні дані</h3>` +
      `<div class="table-responsive"><table><thead><tr><th>Параметр</th><th>Значення</th></tr></thead>` +
      `<tbody><tr><td>Формати</td><td><ul><li>.las</li><li>.ply</li></ul></td></tr></tbody></table></div>` +
      `</section>`;
    const doc = new DOMParser().parseFromString(restyleSpecTables(html), 'text/html');

    expect(doc.querySelector('section.specs tbody tr td:last-child')?.textContent).toBe('.las, .ply');
    expect(doc.querySelectorAll('section.specs ul').length).toBe(0);
  });

  it('borrows another category\'s labels when a table has no header row, rather than defaulting to English', () => {
    const headerless = `<h3>Б</h3><div class="table-responsive"><table><tbody><tr><td>x</td><td>y</td></tr></tbody></table></div>`;
    const html = `<section class="specs"><h2>Specs</h2>${category('А', 1)}${headerless}</section>`;
    const doc = new DOMParser().parseFromString(restyleSpecTables(html), 'text/html');

    const second = doc.querySelectorAll('section.specs table')[1];
    expect(Array.from(second.querySelectorAll('thead td')).map(td => td.textContent))
      .toEqual(['Параметр', 'Значення']);
  });

  it('emits an uppercase comment marker before each <h3>', () => {
    const html = `<section class="specs"><h2>Specs</h2>${category('Системні параметри', 1)}</section>`;
    expect(restyleSpecTables(html)).toContain('<!-- СИСТЕМНІ ПАРАМЕТРИ -->');
  });

  it('is idempotent — a second pass changes nothing', () => {
    const html = `<section class="specs"><h2>Specs</h2>${category('Матеріали', 2)}${category('Точність', 3)}</section>`;
    const once = restyleSpecTables(html);
    expect(restyleSpecTables(once)).toBe(once);
  });

  it('is a no-op when <section class="specs"> is absent', () => {
    const html = '<p>No specs here.</p>';
    expect(restyleSpecTables(html)).toBe(html);
  });

  it('preserves HTML before and after section.specs untouched', () => {
    const before = '<p>Intro.</p>';
    const after = '<hr>';
    const html = before + `<section class="specs"><h2>Specs</h2>${category('A', 2)}</section>` + after;
    const result = restyleSpecTables(html);
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
    expect(doc.querySelector('section.specs h3')?.textContent).toBe('A');
    expect(doc.querySelector('section.specs table')?.getAttribute('class')).toBe('table table-bordered table-striped');
  });

  it('threads storeName through to the killer-specs collapse', () => {
    const html = killerSpecsTable() + `<section class="specs"><h2>Specs</h2>${category('A', 2)}</section>`;
    const result = finalizeTablesForDisplay(html, 'uk-UA', 'Center 3D Print');
    const doc = new DOMParser().parseFromString(result, 'text/html');

    expect(Array.from(doc.querySelectorAll('table')[0].querySelectorAll('thead th')).map(th => th.textContent))
      .toEqual(['Параметр', 'Практична користь']);
  });
});

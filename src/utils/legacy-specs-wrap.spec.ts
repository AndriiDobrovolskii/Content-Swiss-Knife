/**
 * legacy-specs-wrap.spec.ts
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { wrapLegacySpecTables } from './legacy-specs-wrap';

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('wrapLegacySpecTables', () => {
  it('wraps a single legacy div-wrapped table in a section.specs envelope, dropping <br>', () => {
    const html =
      `<h3>Друк</h3>` +
      `<div style="overflow-x: auto; overflow-y: auto">` +
      `<table><tbody><tr><td>Швидкість<br></td><td>100 мм/с</td></tr></tbody></table>` +
      `</div>`;
    const doc = parse(wrapLegacySpecTables(html));

    const section = doc.querySelector('section.specs')!;
    expect(section).not.toBeNull();
    expect(section.querySelector('h2')!.textContent).toBe('Технічні характеристики');
    expect(section.querySelector('h3')!.textContent).toBe('Друк');
    expect(section.querySelector('div.table-responsive')).not.toBeNull();
    expect(section.querySelector('br')).toBeNull();
    expect(section.querySelector('td')!.textContent).toBe('Швидкість');

    // Legacy wrapper's inline style is gone — the table now sits in a plain table-responsive div.
    expect(doc.querySelector('div[style*="overflow"]')).toBeNull();

    // Exactly one <hr>, immediately after </section>.
    const hr = section.nextElementSibling;
    expect(hr?.tagName).toBe('HR');
  });

  it('captures multiple legacy category blocks, each with its own <h3>, in document order', () => {
    // Note: happy-dom's DOMParser drops <!-- comment --> nodes on parse (same limitation
    // table-finalize.ts sidesteps by only ever creating comments itself, never round-tripping
    // ones from raw input) — so comment-marker preservation isn't exercised here, only in a
    // real browser DOMParser.
    const html =
      `<p>Опис товару.</p>\n` +
      `<h3>Друк</h3>\n` +
      `<div style="overflow-x:auto"><table><tbody><tr><td>A</td><td>1</td></tr></tbody></table></div>\n` +
      `<h3>Живлення</h3>\n` +
      `<div style="overflow-x:auto"><table><tbody><tr><td>B</td><td>2</td></tr></tbody></table></div>`;
    const doc = parse(wrapLegacySpecTables(html));

    const section = doc.querySelector('section.specs')!;
    const h3s = Array.from(section.querySelectorAll('h3')).map(h => h.textContent);
    expect(h3s).toEqual(['Друк', 'Живлення']);
    expect(section.querySelectorAll('div.table-responsive')).toHaveLength(2);
    expect(section.querySelectorAll('table')).toHaveLength(2);
  });

  it('is a no-op when no legacy wrapper divs are present', () => {
    const html = `<p>Nothing to see here.</p><table><tbody><tr><td>A</td></tr></tbody></table>`;
    expect(wrapLegacySpecTables(html)).toBe(html);
  });

  it('normalizes a legacy wrapper outside section.specs without duplicating the section', () => {
    const html =
      `<section class="specs"><h2>Технічні характеристики</h2><p>Existing content.</p></section>` +
      `<div style="overflow-x:auto"><table><tbody><tr><td>A</td></tr></tbody></table></div>`;
    const doc = parse(wrapLegacySpecTables(html));

    expect(doc.querySelectorAll('section.specs')).toHaveLength(1);
    expect(doc.querySelector('section.specs')!.textContent).toContain('Existing content.');
    expect(doc.querySelector('div[style*="overflow"]')).toBeNull();

    // The outside table is normalized but stays OUTSIDE the existing section.
    const outsideDiv = doc.querySelector('body > div.table-responsive');
    expect(outsideDiv).not.toBeNull();
    expect(outsideDiv!.closest('section.specs')).toBeNull();
  });

  it('normalizes a legacy wrapper table sitting before an existing section.specs, leaving it in place', () => {
    const html =
      `<h2>Características Principales</h2>` +
      `<div style="overflow-x: auto; overflow-y: auto"><table><tbody><tr><td>Feature<br></td><td>Benefit</td></tr></tbody></table></div>` +
      `<hr>` +
      `<section class="specs"><h2>Технічні характеристики</h2><p>Real specs.</p></section>`;
    const doc = parse(wrapLegacySpecTables(html));

    expect(doc.querySelectorAll('section.specs')).toHaveLength(1);
    const highlightDiv = doc.querySelector('body > div.table-responsive');
    expect(highlightDiv).not.toBeNull();
    expect(highlightDiv!.closest('section.specs')).toBeNull();
    expect(highlightDiv!.querySelector('br')).toBeNull();
    expect(highlightDiv!.querySelector('td')!.textContent).toBe('Feature');
  });

  it('is idempotent', () => {
    const html =
      `<h3>Друк</h3>` +
      `<div style="overflow-x: auto"><table><tbody><tr><td>A<br></td><td>1</td></tr></tbody></table></div>`;
    const once = wrapLegacySpecTables(html);
    const twice = wrapLegacySpecTables(once);
    expect(twice).toBe(once);
  });
});

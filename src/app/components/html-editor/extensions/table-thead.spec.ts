import { describe, it, expect } from 'vitest';
import { reconstructTableThead } from './table-thead';

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('reconstructTableThead', () => {
  it('wraps a leading all-<th> row in <thead> and the rest in <tbody>', () => {
    const html = `<table><tbody><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></tbody></table>`;
    const doc = parse(reconstructTableThead(html));
    expect(doc.querySelector('thead > tr > th')).not.toBeNull();
    expect(doc.querySelectorAll('thead th')).toHaveLength(2);
    expect(doc.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(doc.querySelectorAll('tbody td')).toHaveLength(2);
  });

  it('leaves a table with no header row untouched (all rows stay in tbody)', () => {
    const html = `<table><tbody><tr><td>1</td><td>2</td></tr></tbody></table>`;
    const doc = parse(reconstructTableThead(html));
    expect(doc.querySelector('thead')).toBeNull();
    expect(doc.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('leaves a mixed first row (th + td) untouched — not a pure header row', () => {
    const html = `<table><tbody><tr><th>A</th><td>B</td></tr></tbody></table>`;
    const doc = parse(reconstructTableThead(html));
    expect(doc.querySelector('thead')).toBeNull();
  });

  it('is idempotent', () => {
    const html = `<table><tbody><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></tbody></table>`;
    const once = reconstructTableThead(html);
    const twice = reconstructTableThead(once);
    expect(twice).toBe(once);
  });

  it('handles multiple tables independently', () => {
    const html =
      `<table><tbody><tr><th>A</th></tr><tr><td>1</td></tr></tbody></table>` +
      `<table><tbody><tr><td>x</td></tr></tbody></table>`;
    const doc = parse(reconstructTableThead(html));
    const tables = doc.querySelectorAll('table');
    expect(tables[0].querySelector('thead')).not.toBeNull();
    expect(tables[1].querySelector('thead')).toBeNull();
  });

  it('handles rows with no wrapping <tbody> at all (Table.renderHTML no longer emits one)', () => {
    const html = `<table><tr><th>A</th></tr><tr><td>1</td></tr></table>`;
    const doc = parse(reconstructTableThead(html));
    expect(doc.querySelector('thead > tr > th')).not.toBeNull();
    expect(doc.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('unwraps a lone <p> that is a <td>\'s only child', () => {
    const html = `<table><tr><td><p>Значення</p></td></tr></table>`;
    const doc = parse(reconstructTableThead(html));
    expect(doc.querySelector('td > p')).toBeNull();
    expect(doc.querySelector('td')?.textContent).toBe('Значення');
  });

  it('unwraps a lone <p> that is a <th>\'s only child', () => {
    const html = `<table><tr><th><p>Заголовок</p></th></tr></table>`;
    const doc = parse(reconstructTableThead(html));
    expect(doc.querySelector('th > p')).toBeNull();
    expect(doc.querySelector('th')?.textContent).toBe('Заголовок');
  });

  it('does not unwrap a cell whose content is a list (not a lone <p>)', () => {
    const html = `<table><tr><td><ul><li>A</li><li>B</li></ul></td></tr></table>`;
    const doc = parse(reconstructTableThead(html));
    expect(doc.querySelector('td > ul')).not.toBeNull();
  });

  it('does not unwrap a cell with multiple block children', () => {
    const html = `<table><tr><td><p>Intro</p><ul><li>A</li></ul></td></tr></table>`;
    const doc = parse(reconstructTableThead(html));
    expect(doc.querySelector('td > p')).not.toBeNull();
    expect(doc.querySelector('td > ul')).not.toBeNull();
  });

  it('is idempotent with the <p>-unwrap step included', () => {
    const html = `<table><tbody><tr><th><p>A</p></th></tr><tr><td><p>1</p></td></tr></tbody></table>`;
    const once = reconstructTableThead(html);
    const twice = reconstructTableThead(once);
    expect(twice).toBe(once);
  });
});

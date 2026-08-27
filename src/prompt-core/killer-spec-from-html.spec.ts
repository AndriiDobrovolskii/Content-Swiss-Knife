import { describe, it, expect } from 'vitest';
import { extractKillerSpecFromHtml } from './killer-spec-from-html';

const MARKED_HTML =
  `<p>Опис.</p><div class="table-responsive" data-section="killer-specs"><table>` +
  `<thead><tr><th>Параметр</th><th>Ваша перевага</th></tr></thead><tbody>` +
  `<tr data-spec-key="power" data-spec-value="20 Вт"><td>Потужність лазера: 20 Вт</td><td>Чому це важливо.</td></tr>` +
  `<tr data-spec-key="speed" data-spec-value="20000 мм/хв"><td>Швидкість: 20000 мм/хв</td><td>Чому це важливо.</td></tr>` +
  `</tbody></table></div><h2>Далі</h2>`;

describe('extractKillerSpecFromHtml', () => {
  it('reads the first data-spec-key/data-spec-value pair inside the killer-specs section', () => {
    expect(extractKillerSpecFromHtml(MARKED_HTML)).toEqual({ key: 'power', value: '20 Вт' });
  });

  it('returns null for legacy HTML with no markers at all', () => {
    const legacy =
      '<div class="table-responsive"><table><tbody>' +
      '<tr><td>Потужність лазера: 20 Вт</td><td>Чому це важливо.</td></tr>' +
      '</tbody></table></div>';
    expect(extractKillerSpecFromHtml(legacy)).toBeNull();
  });

  it('returns null when the section marker is present but no row carries the attributes', () => {
    const noRowMarkers =
      '<div data-section="killer-specs"><table><tbody>' +
      '<tr><td>Потужність лазера: 20 Вт</td><td>x</td></tr>' +
      '</tbody></table></div>';
    expect(extractKillerSpecFromHtml(noRowMarkers)).toBeNull();
  });

  it('returns null for an empty or unrelated string', () => {
    expect(extractKillerSpecFromHtml('')).toBeNull();
    expect(extractKillerSpecFromHtml('<p>Не має нічого спільного.</p>')).toBeNull();
  });

  it('decodes HTML entities in the attribute values', () => {
    const html = '<div data-section="killer-specs"><table><tbody>' +
      '<tr data-spec-key="ratio" data-spec-value="16:9 &amp; 4:3"><td>x</td><td>y</td></tr>' +
      '</tbody></table></div>';
    expect(extractKillerSpecFromHtml(html)).toEqual({ key: 'ratio', value: '16:9 & 4:3' });
  });
});

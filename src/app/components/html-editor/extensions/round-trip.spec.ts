/**
 * round-trip.spec.ts
 *
 * Schema-level fidelity tests for TIPTAP_EXTENSIONS. No live Editor/EditorView
 * is mounted here (happy-dom doesn't support everything an interactive
 * EditorView needs) — instead this uses ProseMirror's own
 * DOMParser.fromSchema / DOMSerializer.fromSchema directly, which are pure
 * DOM parsing/construction operations happy-dom handles fine. This is the
 * TDD anchor for the whole TipTap migration: get schema fidelity right here
 * before wiring anything into the Angular component.
 *
 * RUN: npm run test
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath, URL as NodeURL } from 'node:url';
import { describe, it, expect } from 'vitest';
import { getSchema } from '@tiptap/core';
import { DOMParser as PMDOMParser, DOMSerializer } from '@tiptap/pm/model';
import { validateStructuralParity } from '../../../../utils/structural-parity';
import { TIPTAP_EXTENSIONS } from './index';

const schema = getSchema(TIPTAP_EXTENSIONS);

function roundTrip(html: string): string {
  const dom = new DOMParser().parseFromString(html, 'text/html');
  const doc = PMDOMParser.fromSchema(schema).parse(dom.body);
  const fragment = DOMSerializer.fromSchema(schema).serializeFragment(doc.content);
  const wrapper = document.createElement('div');
  wrapper.appendChild(fragment);
  return wrapper.innerHTML;
}

const FIXTURE_PATH = fileURLToPath(
  new NodeURL('../../../../utils/__fixtures__/description_uk-UA.original.html', import.meta.url),
);

describe('TIPTAP_EXTENSIONS — full-fixture round-trip', () => {
  it('preserves structural counts/media identity with zero edits (real generator output)', () => {
    const original = readFileSync(FIXTURE_PATH, 'utf-8');
    const roundTripped = roundTrip(original);
    const issues = validateStructuralParity(original, roundTripped, 'TipTap round-trip fixture');
    expect(issues).toEqual([]);
  });
});

describe('imageFigure — attribute fidelity', () => {
  it('preserves first-image eager loading (no loading attr) and subsequent lazy loading', () => {
    const html =
      `<figure style="display: block; width: fit-content; max-width: 100%; margin: 4px auto;">` +
      `<img src="a.jpg" alt="First" decoding="async" style="max-width: 100%; height: auto; display: block;">` +
      `<figcaption style="text-align: left;"><b>Lead-in:</b> caption text</figcaption></figure>` +
      `<figure style="display: block; width: fit-content; max-width: 100%; margin: 4px auto;">` +
      `<img src="b.jpg" alt="Second" loading="lazy" decoding="async" style="max-width: 100%; height: auto; display: block;">` +
      `<figcaption style="text-align: left;">Second caption</figcaption></figure>`;

    const result = roundTrip(html);
    const doc = new DOMParser().parseFromString(result, 'text/html');
    const imgs = Array.from(doc.querySelectorAll('img'));
    expect(imgs).toHaveLength(2);
    expect(imgs[0].hasAttribute('loading')).toBe(false);
    expect(imgs[1].getAttribute('loading')).toBe('lazy');
    imgs.forEach(img => expect(img.getAttribute('decoding')).toBe('async'));
    expect(doc.querySelectorAll('figcaption')).toHaveLength(2);
    // This app's convention uses <b> exclusively for lead-ins (see
    // extensions/index.ts's BoldAsB) — must round-trip as <b>, not <strong>.
    expect(doc.querySelector('figcaption b')?.textContent).toBe('Lead-in:');
  });
});

describe('videoEmbedFigure — attribute fidelity', () => {
  it('preserves iframe attrs and a hand-edited caption verbatim (not regenerated)', () => {
    const html =
      `<figure style="width: 100%; max-width: 1140px; margin: 0 auto 20px; aspect-ratio: 16 / 9;">` +
      `<iframe src="https://youtube.invalid/embed/xyz?rel=0" title="Demo" ` +
      `style="width: 100%; height: 100%; border: 0;" loading="lazy" ` +
      `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ` +
      `referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>` +
      `<figcaption>This caption was hand-edited, not the templated default</figcaption></figure>`;

    const result = roundTrip(html);
    const doc = new DOMParser().parseFromString(result, 'text/html');
    const iframe = doc.querySelector('iframe')!;
    expect(iframe.getAttribute('src')).toBe('https://youtube.invalid/embed/xyz?rel=0');
    expect(iframe.getAttribute('allow')).toContain('accelerometer');
    expect(iframe.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
    expect(iframe.hasAttribute('allowfullscreen')).toBe(true);
    expect(iframe.getAttribute('loading')).toBe('lazy');
    expect(doc.querySelector('figcaption')?.textContent).toBe(
      'This caption was hand-edited, not the templated default',
    );
  });
});

describe('schema.org microdata — passthrough via genericBlock/globalAttributes', () => {
  it('preserves PropertyValue microdata on table rows/cells', () => {
    const html =
      `<table><tbody>` +
      `<tr itemprop="additionalProperty" itemscope itemtype="https://schema.org/PropertyValue">` +
      `<th itemprop="name" scope="row">Вага</th><td itemprop="value">17 кг</td></tr>` +
      `</tbody></table>`;

    const result = roundTrip(html);
    const doc = new DOMParser().parseFromString(result, 'text/html');
    const row = doc.querySelector('tr')!;
    expect(row.getAttribute('itemprop')).toBe('additionalProperty');
    expect(row.hasAttribute('itemscope')).toBe(true);
    expect(row.getAttribute('itemtype')).toBe('https://schema.org/PropertyValue');
    expect(doc.querySelector('th')?.getAttribute('itemprop')).toBe('name');
    expect(doc.querySelector('td')?.getAttribute('itemprop')).toBe('value');
  });

  it('preserves nested FAQPage/Question/Answer microdata sections', () => {
    const html =
      `<section itemscope itemtype="https://schema.org/FAQPage">` +
      `<div itemprop="mainEntity" itemscope itemtype="https://schema.org/Question">` +
      `<h3 itemprop="name">Question text?</h3>` +
      `<div itemprop="acceptedAnswer" itemscope itemtype="https://schema.org/Answer">` +
      `<p itemprop="text">Answer text.</p></div></div></section>`;

    const result = roundTrip(html);
    const doc = new DOMParser().parseFromString(result, 'text/html');
    const section = doc.querySelector('section')!;
    expect(section.getAttribute('itemtype')).toBe('https://schema.org/FAQPage');
    expect(section.hasAttribute('itemscope')).toBe(true);
    const question = section.querySelector('div[itemprop="mainEntity"]')!;
    expect(question.getAttribute('itemtype')).toBe('https://schema.org/Question');
    expect(question.querySelector('h3')?.getAttribute('itemprop')).toBe('name');
    const answer = question.querySelector('div[itemprop="acceptedAnswer"]')!;
    expect(answer.getAttribute('itemtype')).toBe('https://schema.org/Answer');
    expect(answer.querySelector('p')?.getAttribute('itemprop')).toBe('text');
  });

  it('never introduces a forbidden schema.org/Product itemtype', () => {
    const html = `<section><h2>Title</h2><p>Some text with no microdata at all.</p></section>`;
    const result = roundTrip(html);
    expect(result).not.toContain('schema.org/Product');
  });
});

describe('generic block passthrough', () => {
  it('preserves div.table-responsive and section.specs tag+attrs verbatim', () => {
    const html =
      `<section class="specs"><h2>Specs</h2>` +
      `<div class="table-responsive"><table><tbody><tr><td>A</td></tr></tbody></table></div>` +
      `</section>`;
    const result = roundTrip(html);
    const doc = new DOMParser().parseFromString(result, 'text/html');
    expect(doc.querySelector('section.specs')).not.toBeNull();
    expect(doc.querySelector('section.specs > div.table-responsive > table')).not.toBeNull();
  });

  it('preserves a combined §7 spec table with colspan category-header <th> rows (post table-finalize.ts)', () => {
    const html =
      `<section class="specs"><h2>Technical specifications of the Anycubic Kobra 3</h2>` +
      `<div class="table-responsive"><table>` +
      `<tr><th colspan="2" style="text-align: center; padding: 10px; font-weight: bold; background-color: #f5f5f5;">Загальні відомості</th></tr>` +
      `<tr><td>Матеріал</td><td>PLA</td></tr>` +
      `<tr><td>Вага</td><td>5 кг</td></tr>` +
      `<tr><th colspan="2" style="text-align: center; padding: 10px; font-weight: bold; background-color: #f5f5f5;">Продуктивність</th></tr>` +
      `<tr><td>Швидкість</td><td>500 мм/с</td></tr>` +
      `</table></div>` +
      `</section>`;
    const result = roundTrip(html);
    const doc = new DOMParser().parseFromString(result, 'text/html');

    expect(doc.querySelectorAll('section.specs table')).toHaveLength(1);
    const headerRows = doc.querySelectorAll('section.specs th[colspan="2"]');
    expect(headerRows).toHaveLength(2);
    expect(headerRows[0].textContent).toBe('Загальні відомості');
    expect(headerRows[1].textContent).toBe('Продуктивність');
    expect(doc.querySelectorAll('section.specs td')).toHaveLength(6);
  });

  it('correctly types header vs. data cells (th vs td) through the round-trip', () => {
    const html = `<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>`;
    const result = roundTrip(html);
    const doc = new DOMParser().parseFromString(result, 'text/html');
    expect(doc.querySelectorAll('th')).toHaveLength(2);
    expect(doc.querySelectorAll('td')).toHaveLength(2);
  });

  it('auto-wraps bare inline text in a <div>/<section> in a stable paragraph (no re-wrapping on a second pass)', () => {
    const html = `<div>Bare inline text with no <p> wrapper</div>`;
    const once = roundTrip(html);
    const twice = roundTrip(once);
    expect(twice).toBe(once);
  });
});

describe('table rendering — no TipTap-invented noise', () => {
  it('never emits a <colgroup> or an auto-generated width style on <table>', () => {
    const html = `<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>`;
    const result = roundTrip(html);
    expect(result).not.toContain('colgroup');
    expect(result).not.toContain('<col ');
    expect(result).not.toMatch(/<table[^>]*style=/);
  });

  it('omits default colspan="1"/rowspan="1" but preserves a real merged-cell span', () => {
    const html = `<table><tbody><tr><td>A</td><td colspan="2">B</td></tr></tbody></table>`;
    const result = roundTrip(html);
    const doc = new DOMParser().parseFromString(result, 'text/html');
    const cells = doc.querySelectorAll('td');
    expect(cells[0].hasAttribute('colspan')).toBe(false);
    expect(cells[0].hasAttribute('rowspan')).toBe(false);
    expect(cells[1].getAttribute('colspan')).toBe('2');
  });
});

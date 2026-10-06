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
import { DOMParser as PMDOMParser, DOMSerializer, type Node as PMNode } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { validateStructuralParity } from '../../../../utils/structural-parity';
import { stripTiptapArtifacts } from '../../../../utils/html-cleaner';
import { reconstructTableThead } from './table-thead';
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

/**
 * What the user actually gets when they copy out of the editor: the schema round-trip above
 * plus the two post-serialize fix-ups, in the order HtmlEditorComponent applies them
 * (html-editor.component.ts:428-429). Several artifact shapes — §7's <thead>, bare <li> —
 * are only correct AFTER those run, so asserting them against bare roundTrip() would be
 * testing an intermediate state the user never sees.
 */
function roundTripForCopy(html: string): string {
  return reconstructTableThead(stripTiptapArtifacts(roundTrip(html)));
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
      `<figure style="display: block; width: max-content; max-width: 100%; margin: 4px auto;">` +
      `<img src="a.jpg" alt="First" decoding="async" style="max-width: 100%; height: auto; display: block;">` +
      `<figcaption style="text-align: left;"><b>Lead-in:</b> caption text</figcaption></figure>` +
      `<figure style="display: block; width: max-content; max-width: 100%; margin: 4px auto;">` +
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

  // Post table-finalize.ts restyleSpecTables: one <h3> + one themed table per category,
  // header row made of <td><b>…</b></td> rather than <th>.
  const specCategory = (title: string, rows: string) =>
    `<!-- ${title.toUpperCase()} --><h3>${title}</h3>` +
    `<div class="table-responsive"><table class="table table-bordered table-striped" style="table-layout: fixed;">` +
    `<thead><tr><td style="width: 45%;"><b>Параметр</b></td><td><b>Значення</b></td></tr></thead>` +
    `<tbody>${rows}</tbody></table></div>`;

  it('preserves the per-category §7 spec tables, their theme classes and their column widths', () => {
    const html =
      `<section class="specs"><h2>Технічні характеристики</h2>` +
      specCategory('Загальні відомості', `<tr><td>Матеріал</td><td>PLA</td></tr><tr><td>Вага</td><td>5 кг</td></tr>`) +
      specCategory('Продуктивність', `<tr><td>Швидкість</td><td>500 мм/с</td></tr>`) +
      `</section>`;
    const doc = new DOMParser().parseFromString(roundTripForCopy(html), 'text/html');

    const tables = doc.querySelectorAll('section.specs table');
    expect(tables).toHaveLength(2);
    expect(Array.from(doc.querySelectorAll('section.specs h3')).map(h => h.textContent))
      .toEqual(['Загальні відомості', 'Продуктивність']);

    for (const table of Array.from(tables)) {
      expect(table.getAttribute('class')).toBe('table table-bordered table-striped');
      expect(table.getAttribute('style')).toBe('table-layout: fixed;');
    }

    // The <thead>/<tbody> split must survive. TipTap serializes every row into one <tbody>;
    // reconstructTableThead restores the split, and it only recognizes this table's all-<td>
    // header row because of the <b>-wrapping branch added for exactly this shape.
    expect(doc.querySelectorAll('section.specs thead')).toHaveLength(2);
    const headerCells = Array.from(doc.querySelectorAll('section.specs thead td'));
    expect(headerCells.map(td => td.textContent)).toEqual(['Параметр', 'Значення', 'Параметр', 'Значення']);
    expect(headerCells[0].getAttribute('style')).toBe('width: 45%;');

    expect(doc.querySelectorAll('section.specs tbody tr')).toHaveLength(3);
  });

  it('keeps a <ul> inside a table cell — the reason TableCell content stays block+', () => {
    const html =
      `<table><tbody><tr><td>Формати</td><td><ul><li>.las</li><li>.ply</li></ul></td></tr></tbody></table>`;
    const doc = new DOMParser().parseFromString(roundTripForCopy(html), 'text/html');
    expect(Array.from(doc.querySelectorAll('td ul li')).map(li => li.textContent)).toEqual(['.las', '.ply']);
  });

  it('returns bare <li>, not <li><p>…</p></li>, so the editor stops rewriting every list', () => {
    const html = `<ul><li><b>Друкує великі деталі.</b> Робоча зона 330 × 330 мм.</li><li>Другий пункт.</li></ul>`;
    const result = roundTripForCopy(html);
    const doc = new DOMParser().parseFromString(result, 'text/html');

    expect(doc.querySelectorAll('li p')).toHaveLength(0);
    expect(doc.querySelector('li')?.innerHTML).toBe('<b>Друкує великі деталі.</b> Робоча зона 330 × 330 мм.');
    expect(roundTripForCopy(result)).toBe(result); // idempotent
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

// ---------------------------------------------------------------------------------------------
// US-6.1 (T3) - a YouTube/Vimeo iframe inside plain wrapper <div>s survives the round trip.
// Written before the embedIframe node exists, from Story AC-1/2/4/5/8 and Specification v5
// FR-1, FR-2, FR-4, FR-5, FR-10, FR-11. Iframe markup is the exact shape from
// Knowledge/Issues/1/yt-iframe.txt. Equality is DOM-level (Assumption A-4).
// ---------------------------------------------------------------------------------------------

const EMBED = {
  src: 'https://www.youtube.com/embed/Y9C9_tiOsbQ?rel=0',
  title: 'Demostración práctica de las capacidades del robot humanoide',
  loading: 'lazy',
  allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
  referrerpolicy: 'strict-origin-when-cross-origin',
  style: 'width: 100%; aspect-ratio: 16 / 9; border: none;',
};

const embedIframeHtml = (src = EMBED.src) =>
  `<iframe src="${src}" title="${EMBED.title}" loading="${EMBED.loading}" allow="${EMBED.allow}" ` +
  `referrerpolicy="${EMBED.referrerpolicy}" allowfullscreen="" style="${EMBED.style}"></iframe>`;

const WRAPPER_STYLES = [
  'width: 100%; max-width: 1000px; aspect-ratio: 16 / 9; margin: 4px auto;',
  'max-width: 1200px; width: 100%; margin: 0 auto;',
  'position: relative; padding: 2px;',
];

/** n nested divs (outermost first, styles from WRAPPER_STYLES) around `inner`. */
function wrapInDivs(n: number, inner: string): string {
  let html = inner;
  for (let i = n - 1; i >= 0; i--) html = `<div style="${WRAPPER_STYLES[i]}">${html}</div>`;
  return html;
}

function parsePm(html: string): PMNode {
  const dom = new DOMParser().parseFromString(html, 'text/html');
  return PMDOMParser.fromSchema(schema).parse(dom.body);
}

function serializeDoc(doc: PMNode): string {
  const fragment = DOMSerializer.fromSchema(schema).serializeFragment(doc.content);
  const wrapper = document.createElement('div');
  wrapper.appendChild(fragment);
  return wrapper.innerHTML;
}

function bodyOf(html: string): HTMLElement {
  return new DOMParser().parseFromString(html, 'text/html').body;
}

describe('div-wrapped YouTube iframe - attributes and wrappers survive (US-6.1 AC-1, AC-2)', () => {
  it.each([1, 2, 3])('keeps the iframe attributes and the wrapper divs for N = %i wrappers', n => {
    const body = bodyOf(roundTrip(wrapInDivs(n, embedIframeHtml())));

    // AC-1: iframe present exactly once, attributes equal to the input
    const iframes = body.querySelectorAll('iframe');
    expect(iframes).toHaveLength(1);
    const iframe = iframes[0];
    expect(iframe.getAttribute('src')).toBe(EMBED.src);
    expect(iframe.getAttribute('title')).toBe(EMBED.title);
    expect(iframe.getAttribute('allow')).toBe(EMBED.allow);
    expect(iframe.getAttribute('referrerpolicy')).toBe(EMBED.referrerpolicy);
    expect(iframe.getAttribute('loading')).toBe(EMBED.loading);
    expect(iframe.hasAttribute('allowfullscreen')).toBe(true);
    expect(iframe.getAttribute('style')).toBe(EMBED.style);

    // AC-2: every wrapper keeps its style, in the original nesting order, iframe innermost
    let node: Element = body;
    for (let i = 0; i < n; i++) {
      const child = node.firstElementChild!;
      expect(child.tagName).toBe('DIV');
      expect(child.getAttribute('style')).toBe(WRAPPER_STYLES[i]);
      node = child;
    }
    expect(node.firstElementChild).toBe(iframe);
    // no substituted element in place of the iframe
    expect(body.querySelectorAll('p')).toHaveLength(0);
  });
});

describe('two div-wrapped iframes keep their order (US-6.1 AC-4)', () => {
  it('returns both src values in the original order', () => {
    const first = 'https://www.youtube.com/embed/AAAAAAAAAAA';
    const second = 'https://player.vimeo.com/video/222';
    const html = wrapInDivs(2, embedIframeHtml(first)) + wrapInDivs(2, embedIframeHtml(second));
    const srcs = Array.from(bodyOf(roundTrip(html)).querySelectorAll('iframe')).map(f => f.getAttribute('src'));
    expect(srcs).toEqual([first, second]);
  });
});

describe('editing elsewhere leaves a div-wrapped iframe untouched (US-6.1 AC-5)', () => {
  it('outputs the embed chain unchanged after typing in a paragraph below it', () => {
    const embed = wrapInDivs(2, embedIframeHtml());
    const html = `<p>Intro text</p>${embed}<p>Closing paragraph</p>`;
    const before = bodyOf(roundTrip(html));
    expect(before.querySelectorAll('iframe')).toHaveLength(1); // the embed exists to begin with

    const state = EditorState.create({ doc: parsePm(html) });
    let closingPos = -1;
    state.doc.descendants((node, pos) => {
      if (node.isText && node.text === 'Closing paragraph') closingPos = pos;
      return true;
    });
    expect(closingPos).toBeGreaterThanOrEqual(0);
    const edited = state.apply(state.tr.insertText('EDITED ', closingPos)).doc;
    const after = bodyOf(serializeDoc(edited));

    expect(after.querySelector('p:last-of-type')?.textContent).toBe('EDITED Closing paragraph');
    // same embed chain, attribute for attribute, in the same position
    expect(after.children[1].outerHTML).toBe(before.children[1].outerHTML);
    expect(after.children[1].querySelector('iframe')?.getAttribute('src')).toBe(EMBED.src);
  });
});

describe('text beside a div-wrapped iframe (US-6.1 AC-8)', () => {
  const html = `<div style="${WRAPPER_STYLES[0]}">${embedIframeHtml()}Watch the full demo</div>`;

  it('keeps the sibling text in the editor document and in the output, after the iframe', () => {
    const doc = parsePm(html);
    expect(doc.textContent).toContain('Watch the full demo');

    const wrapper = bodyOf(serializeDoc(doc)).firstElementChild!;
    expect(wrapper.getAttribute('style')).toBe(WRAPPER_STYLES[0]);
    const iframe = wrapper.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(wrapper.textContent).toContain('Watch the full demo');
    // order relative to the iframe is preserved: the text follows the iframe
    const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT);
    let marker: Node | null = null;
    while (walker.nextNode()) {
      if (walker.currentNode.textContent?.includes('Watch')) marker = walker.currentNode;
    }
    expect(marker).not.toBeNull();
    expect(iframe!.compareDocumentPosition(marker!) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('keeps the sibling text editable: typed characters appear in the output at the edited position', () => {
    const state = EditorState.create({ doc: parsePm(html) });
    let textPos = -1;
    state.doc.descendants((node, pos) => {
      if (node.isText && node.text?.includes('Watch the full demo')) textPos = pos;
      return true;
    });
    expect(textPos).toBeGreaterThanOrEqual(0);

    const edited = state.apply(state.tr.insertText('XYZ', textPos + 'Watch '.length)).doc;
    const wrapper = bodyOf(serializeDoc(edited)).firstElementChild!;
    expect(wrapper.textContent).toContain('Watch XYZthe full demo');
    expect(wrapper.querySelector('iframe')?.getAttribute('src')).toBe(EMBED.src);
  });
});

describe('div-wrapped iframe round trip is deterministic (US-6.1 NFR-2)', () => {
  it('yields the same output for the same input, and keeps the iframe', () => {
    const html = wrapInDivs(2, embedIframeHtml());
    const a = roundTrip(html);
    expect(roundTrip(html)).toBe(a);
    expect(bodyOf(a).querySelectorAll('iframe')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------------------------
// US-6.1 (T3, plan v2 D6) - genericBlock.renderHTML writes `style` verbatim and leaves every
// other attribute exactly as before. Additive guards for the narrow serialisation edit.
// ---------------------------------------------------------------------------------------------

describe('genericBlock - wrapper style is returned verbatim (US-6.1 AC-2, plan v2 D6)', () => {
  it.each([
    'margin: 0 auto;',
    'max-width: 1200px; width: 100%; margin: 0 auto;',
    'width: 100%; max-width: 1000px; aspect-ratio: 16 / 9; margin: 4px auto;',
  ])('does not re-serialise the style of a plain wrapper div: %s', style => {
    const out = bodyOf(roundTrip(`<div style="${style}"><p>text</p></div>`));
    expect(out.firstElementChild!.getAttribute('style')).toBe(style);
  });

  it('keeps class, id, itemprop, itemtype and itemscope unchanged on a div and a section', () => {
    const html =
      `<section class="specs" id="s1" itemscope itemtype="https://schema.org/FAQPage">` +
      `<div class="a b" id="d1" itemprop="mainEntity" itemscope itemtype="https://schema.org/Question">` +
      `<p>x</p></div></section>`;
    const section = bodyOf(roundTrip(html)).firstElementChild!;
    expect(section.tagName).toBe('SECTION');
    expect(section.getAttribute('class')).toBe('specs');
    expect(section.getAttribute('id')).toBe('s1');
    expect(section.getAttribute('itemtype')).toBe('https://schema.org/FAQPage');
    expect(section.hasAttribute('itemscope')).toBe(true);
    expect(section.hasAttribute('style')).toBe(false);
    const div = section.firstElementChild!;
    expect(div.tagName).toBe('DIV');
    expect(div.getAttribute('class')).toBe('a b');
    expect(div.getAttribute('id')).toBe('d1');
    expect(div.getAttribute('itemprop')).toBe('mainEntity');
    expect(div.getAttribute('itemtype')).toBe('https://schema.org/Question');
    expect(div.hasAttribute('itemscope')).toBe(true);
    expect(div.hasAttribute('style')).toBe(false);
  });

  it('skips null attributes: a bare div gets no empty style, class, id or microdata attribute', () => {
    const div = bodyOf(roundTrip('<div><p>x</p></div>')).firstElementChild!;
    expect(div.tagName).toBe('DIV');
    expect(div.getAttributeNames()).toEqual([]);
  });

  it('skips only the missing attributes: a div with just a class carries just a class', () => {
    const div = bodyOf(roundTrip('<div class="only"><p>x</p></div>')).firstElementChild!;
    expect(div.getAttributeNames()).toEqual(['class']);
  });
});

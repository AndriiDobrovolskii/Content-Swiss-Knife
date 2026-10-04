/**
 * image-placeholder-html.spec.ts - US-5.1 T9: marker substitution on generated HTML (the legacy,
 * non-Doc path) and the HTML end-append primitive, reworked for Specification v9.
 *
 * v9 changes (FR-4, FR-14, FR-21, FR-22, A-14, A-16): the figure's label, description and alt are the three
 * native-Ukrainian Vision texts of the manifest entry, with Ukrainian fallbacks; the figure style is
 * `max-content`; the step also reports the two FR-21 caption warnings. The marker algorithm itself (hosting,
 * same-section lead-in, split, duplicate removal, idempotence) is unchanged and is re-verified here.
 *
 * CONTRACT PINNED HERE (plan D4; shapes chosen by TEST_WRITING, see the test strategy):
 *   applyImagePlaceholdersHtml(html, manifest, imageBase, folders, opts?) -> { html, report }
 *   appendFigureAtEndHtml(html, figureParts, imageBase, folders)          -> string
 *   folders = { brandFolder?, modelFolder? }; opts = { cyrillicCheck? } (A-15; default on); report has the
 *   same shape as the Doc step's report, its `warnings` now also carrying the FR-21 caption warnings.
 *   OQ-4 HTML boundaries: <h1>, <h2>, <hr>, <section>, </section>. <h3> is NOT a boundary.
 */
import { describe, it, expect } from 'vitest';
import { applyImagePlaceholdersHtml, appendFigureAtEndHtml } from './image-placeholder-html';
import { buildFigureParts } from './image-placeholder';
import { wrapImageFigures } from './image-figure';
import { validateGeneratedHtml } from './output-validator';
import {
  IMAGE_BASE, FOLDERS, LAMP, KETTLE, MARKER, LAMP_ALT, LAMP_VISION, LAMP_LABEL_UK, LAMP_DESC_UK, LAMP_ALT_UK, FALLBACK_LABEL,
  MODEL_CAPTION, entry, legacyEntry, collapse, hasCyrillic,
} from '../../test/fixtures/image-placeholder/fixtures';

const apply = (html: string, manifest = [LAMP], base = IMAGE_BASE) =>
  applyImagePlaceholdersHtml(html, manifest, base, FOLDERS);
const dom = (html: string) => new DOMParser().parseFromString(html, 'text/html');
const LAMP_SRC = `${IMAGE_BASE}acme/lamp/desk-lamp.jpg`;
const FIGURE_STYLE = 'display: block; width: max-content; max-width: 100%; margin: 4px auto;';
const IMG_STYLE = 'max-width: 100%; height: auto; display: block;';
const ENGLISH_STRINGS = /Image:|Product image|\bView\b/;

/** Counts opening vs closing tags for the container elements this step may split or wrap. */
function balanced(html: string): boolean {
  return ['p', 'figure', 'figcaption', 'b', 'strong', 'li', 'td', 'section'].every(tag => {
    const open = (html.match(new RegExp(`<${tag}(?=[\\s>])`, 'g')) ?? []).length;
    const close = (html.match(new RegExp(`</${tag}>`, 'g')) ?? []).length;
    return open === close;
  });
}
const noFigureInParagraph = (html: string): boolean => !/<p[^>]*>(?:(?!<\/p>)[\s\S])*<figure/.test(html);
const textOfParagraphs = (html: string): string[] =>
  Array.from(dom(html).querySelectorAll('p')).map(p => collapse(p.textContent ?? ''));

const MODEL_FIGURE =
  `<figure style="${FIGURE_STYLE}"><img src="${LAMP_SRC}" alt="old alt">` +
  `<figcaption><b>Photo:</b> ${MODEL_CAPTION}</figcaption></figure>`;

describe('hosting position — FR-3 (AC-2), FR-4, FR-6, FR-7', () => {
  it('splits the paragraph at the marker into <p>, <figure>, <p> and removes the marker text', () => {
    const { html, report } = apply(`<h1>Lamp</h1><p>Before text ${MARKER} after text.</p>`);
    const d = dom(html);
    expect(html).not.toContain(MARKER);
    expect(textOfParagraphs(html)).toEqual(['Before text', 'after text.']);
    expect(d.querySelectorAll('figure')).toHaveLength(1);
    expect(noFigureInParagraph(html)).toBe(true);
    expect(balanced(html)).toBe(true);
    expect(report.unmatched).toEqual([]);
    expect(report.notPlaced).toEqual([]);
  });

  it('builds a full <img> with src, the Ukrainian alt, and a figcaption with the Ukrainian <b> label (FR-4, FR-14, FR-21)', () => {
    const { html } = apply(`<p>Lead ${MARKER} tail.</p>`);
    const figure = dom(html).querySelector('figure')!;
    const img = figure.querySelector('img')!;
    expect(img.getAttribute('src')).toBe(LAMP_SRC);
    expect(img.getAttribute('alt')).toBe(LAMP_ALT_UK);
    const caption = figure.querySelector('figcaption')!;
    expect(caption.querySelector('b')!.textContent).toBe(LAMP_LABEL_UK);
    expect(collapse(caption.textContent!)).toBe(`${LAMP_LABEL_UK} ${LAMP_DESC_UK}`);
    expect(caption.textContent!.trim()).not.toBe(img.getAttribute('alt'));
  });

  it('never shows the legacy English altText or caption in a marker figure (A-16), and no English string', () => {
    const { html } = apply(`<p>Lead ${MARKER} tail.</p>`);
    expect(html).not.toContain(LAMP_ALT);
    expect(html).not.toContain(LAMP_VISION);
    expect(dom(html).querySelector('figure')!.outerHTML).not.toMatch(ENGLISH_STRINGS);
  });

  it('gives the figure the exact FR-14 layout straight out of the step: max-content figure, img style, left figcaption (AC-9 g)', () => {
    const { html } = apply(`<p>Lead ${MARKER} tail.</p>`);
    const figure = dom(html).querySelector('figure')!;
    expect(figure.getAttribute('style')).toBe(FIGURE_STYLE);
    expect(figure.querySelector('img')!.getAttribute('style')).toBe(IMG_STYLE);
    expect(figure.querySelector('img')!.getAttribute('decoding')).toBe('async');
    expect(figure.querySelector('figcaption')!.getAttribute('style')).toBe('text-align: left;');
    expect(html).not.toContain('fit-content');
  });

  it('uses the Ukrainian fallbacks, silently, for an entry created before this Story (FR-4, FR-21, AC-9 i)', () => {
    const { html, report } = apply(`<p>Lead ${MARKER} tail.</p>`, [legacyEntry()]);
    const figure = dom(html).querySelector('figure')!;
    expect(figure.querySelector('b')!.textContent).toBe(FALLBACK_LABEL);
    expect(collapse(figure.querySelector('figcaption')!.textContent!)).toBe(`${FALLBACK_LABEL} desk lamp.`);
    expect(figure.querySelector('img')!.getAttribute('alt')).toBe('desk lamp');
    expect(html).not.toMatch(ENGLISH_STRINGS);
    expect(report.warnings).toEqual([]);
  });

  it('forms a relative src from the brand and model folders when the image base is empty (A-3, OD-13)', () => {
    const { html } = apply(`<p>Lead ${MARKER} tail.</p>`, [LAMP], '');
    expect(dom(html).querySelector('img')!.getAttribute('src')).toBe('acme/lamp/desk-lamp.jpg');
  });

  it('puts the lead-in from the nearest preceding paragraph when the marker starts its own paragraph', () => {
    const { html, report } = apply(`<p>Lead-in sentence.</p><p>${MARKER} Tail sentence.</p>`);
    expect(textOfParagraphs(html)).toEqual(['Lead-in sentence.', 'Tail sentence.']);
    const figure = dom(html).querySelector('figure')!;
    expect(figure.previousElementSibling!.tagName).toBe('P');
    expect(report.notPlaced).toEqual([]);
  });

  it('accepts a lead-in that is not adjacent: a list may sit between lead-in and figure (H-5)', () => {
    const { html, report } = apply(`<p>Lead-in sentence.</p><ul><li>One</li></ul><p>${MARKER}</p>`);
    expect(dom(html).querySelectorAll('figure')).toHaveLength(1);
    expect(report.notPlaced).toEqual([]);
    expect(balanced(html)).toBe(true);
  });

  it('crosses an <h3>: it is not a section boundary (OQ-4)', () => {
    const { html, report } = apply(`<h2>Section</h2><p>Lead-in sentence.</p><h3>Sub</h3><p>${MARKER}</p>`);
    expect(dom(html).querySelectorAll('figure')).toHaveLength(1);
    expect(report.notPlaced).toEqual([]);
  });

  it('emits no empty paragraph for a marker that is a whole paragraph or ends one', () => {
    const { html } = apply(`<p>Lead-in sentence.</p><p>${MARKER}</p><p>Another lead. ${MARKER}</p>`);
    for (const p of Array.from(dom(html).querySelectorAll('p'))) expect((p.textContent ?? '').trim()).not.toBe('');
  });

  it('processes several markers in one paragraph in order and loses no text', () => {
    const { html } = apply('<p>Alpha [desk-lamp.jpg] Beta [kettle-side.jpg] Gamma.</p>', [LAMP, KETTLE]);
    expect(textOfParagraphs(html)).toEqual(['Alpha', 'Beta', 'Gamma.']);
    const srcs = Array.from(dom(html).querySelectorAll('img')).map(i => i.getAttribute('src')!.split('/').pop());
    expect(srcs).toEqual(['desk-lamp.jpg', 'kettle-side.jpg']);
    expect(balanced(html)).toBe(true);
  });

  it('closes and reopens an inline <b> around the marker so both halves stay balanced', () => {
    const { html } = apply(`<p><b>Bold start ${MARKER} bold end</b> plain tail.</p>`);
    expect(balanced(html)).toBe(true);
    expect(noFigureInParagraph(html)).toBe(true);
    expect(html).not.toContain(MARKER);
  });

  it('matches a .webp marker by originalFilename and places the .jpg output file (A-5)', () => {
    const webp = entry({ originalFilename: 'desk-lamp.webp', urlFilename: 'desk-lamp.jpg' });
    const { html, report } = apply('<p>Lead [desk-lamp.webp] tail.</p>', [webp]);
    expect(dom(html).querySelector('img')!.getAttribute('src')).toBe(LAMP_SRC);
    expect(report.unmatched).toEqual([]);
    expect(html).not.toContain('[desk-lamp.webp]');
  });
});

describe('section boundaries and demotion — FR-6, OQ-4, binding note 1', () => {
  it.each([
    ['<h2>', '<h2>One</h2><p>First.</p><h2>Two</h2><p>[desk-lamp.jpg] Tail.</p><p>After.</p>'],
    ['<h1>', '<h1>One</h1><p>First.</p><h1>Two</h1><p>[desk-lamp.jpg] Tail.</p><p>After.</p>'],
    ['<hr>', '<p>First.</p><hr><p>[desk-lamp.jpg] Tail.</p><p>After.</p>'],
    ['</section>', '<section><p>First.</p></section><section><p>[desk-lamp.jpg] Tail.</p><p>After.</p></section>'],
  ])('does not take a lead-in across a %s: the marker becomes non-hosting', (_label, body) => {
    const { html, report } = apply(body);
    expect(report.notPlaced).toEqual(['desk-lamp.jpg']);
    expect(html).not.toContain(MARKER);
    expect(textOfParagraphs(html)).toContain('Tail.');
    // The image is not at the marker: "Tail." is not followed by a figure (a trailing block keeps the
    // OQ-5 end-append figure from sitting right after it).
    const tail = Array.from(dom(html).querySelectorAll('p')).find(p => collapse(p.textContent ?? '') === 'Tail.')!;
    expect(tail.nextElementSibling?.tagName).not.toBe('FIGURE');
    expect(balanced(html)).toBe(true);
  });

  it('treats a marker with no text before it at the very start of the document as non-hosting', () => {
    const { html, report } = apply(`<p>${MARKER} Opening sentence.</p>`);
    expect(report.notPlaced).toEqual(['desk-lamp.jpg']);
    expect(textOfParagraphs(html)[0]).toBe('Opening sentence.');
  });

  it('demotes a marker whose lead-in text equals the figcaption text (FR-13)', () => {
    const { report } = apply(`<p>${LAMP_LABEL_UK} ${LAMP_DESC_UK}</p><p>${MARKER}</p>`);
    expect(report.notPlaced).toEqual(['desk-lamp.jpg']);
  });
});

describe('non-hosting elements — FR-6, FR-5 (H-3), FR-7', () => {
  it.each([
    ['list item', '<ul><li>Item text [desk-lamp.jpg]</li></ul>', 'li', 'Item text'],
    ['table cell', '<table><tr><td>Cell [desk-lamp.jpg]</td></tr></table>', 'td', 'Cell'],
    ['h2 heading', '<h2>Heading [desk-lamp.jpg]</h2><p>Body.</p>', 'h2', 'Heading'],
    ['h3 heading', '<h3>Sub heading [desk-lamp.jpg]</h3><p>Body.</p>', 'h3', 'Sub heading'],
  ])('removes a marker in a %s, warns, and keeps the surrounding text', (_label, body, selector, expected) => {
    const { html, report } = apply(`<p>Lead-in.</p>${body}`);
    expect(html).not.toContain(MARKER);
    expect(collapse(dom(html).querySelector(selector)!.textContent ?? '')).toBe(expected);
    expect(report.notPlaced).toEqual(['desk-lamp.jpg']);
    const w = report.warnings.find(x => x.rule === 'image-placeholder-not-placed');
    expect(w).toBeDefined();
    expect(w!.severity).toBe('warning');
    expect(w!.detail).toContain('desk-lamp.jpg');
    expect(balanced(html)).toBe(true);
  });

  it('appends the figure at the end, before trailing JSON-LD, when a non-hosting marker has no model figure (OQ-5)', () => {
    const ld = '<script type="application/ld+json">{"@type":"Product"}</script>';
    const { html } = apply(`<p>Lead-in.</p><ul><li>Item [desk-lamp.jpg]</li></ul><p class="cta">Buy now.</p>${ld}`);
    const d = dom(html);
    expect(d.querySelectorAll('figure')).toHaveLength(1);
    expect(html.lastIndexOf('<figure')).toBeGreaterThan(html.indexOf('Buy now.'));
    expect(html.lastIndexOf('<figure')).toBeLessThan(html.indexOf('<script'));
    expect(html.trimEnd().endsWith('</script>')).toBe(true);
  });

  it('keeps a model-placed figure for the file when the marker is non-hosting: the image appears once (H-3)', () => {
    const { html, report } = apply(`<p>Lead-in.</p>${MODEL_FIGURE}<ul><li>Item [desk-lamp.jpg]</li></ul>`);
    const d = dom(html);
    expect(d.querySelectorAll('img')).toHaveLength(1);
    expect(html).toContain(MODEL_CAPTION);
    expect(report.notPlaced).toEqual(['desk-lamp.jpg']);
    expect(html).not.toContain(MARKER);
  });
});

describe('single rendering and model duplicates — FR-5, FR-11', () => {
  it('drops a model-emitted figure for the same file when the marker is hosting', () => {
    const { html } = apply(`<p>Lead-in.</p>${MODEL_FIGURE}<p>Marker lead ${MARKER} tail.</p>`);
    const imgs = Array.from(dom(html).querySelectorAll('img'));
    expect(imgs).toHaveLength(1);
    expect(imgs[0].getAttribute('src')).toBe(LAMP_SRC);
    expect(html).not.toContain(MODEL_CAPTION);
    expect(html).toContain(LAMP_DESC_UK);
    expect(balanced(html)).toBe(true);
  });

  it('drops a bare model <img> for the same file when the marker is hosting', () => {
    const { html } = apply(`<p>Lead-in.</p><img src="${LAMP_SRC}" alt="bare"><p>Marker lead ${MARKER} tail.</p>`);
    const imgs = Array.from(dom(html).querySelectorAll('img'));
    expect(imgs).toHaveLength(1);
    expect(imgs[0].getAttribute('alt')).toBe(LAMP_ALT_UK);
  });

  it('renders the first marker for a file and only removes the marker text of later ones (Story Q2)', () => {
    const { html } = apply(`<p>Alpha ${MARKER} Beta.</p><p>Gamma ${MARKER} Delta.</p>`);
    expect(dom(html).querySelectorAll('img')).toHaveLength(1);
    expect(html).not.toContain(MARKER);
    expect(textOfParagraphs(html)).toContain('Gamma Delta.');
  });

  it('is idempotent: a second run changes nothing and adds no figure or warning (FR-11)', () => {
    const first = apply(`<p>Alpha ${MARKER} Beta.</p><p>Next [ghost.jpg] end.</p>`);
    const second = apply(first.html);
    expect(second.html).toBe(first.html);
    expect(second.report.warnings).toEqual([]);
    expect(second.report.unmatched).toEqual([]);
    expect(dom(second.html).querySelectorAll('figure')).toHaveLength(1);
  });
});

describe('unmatched placeholders — FR-9 (AC-5)', () => {
  it('removes the marker, keeps the text, adds no image, and reports the file once', () => {
    const { html, report } = apply('<p>First [ghost.jpg] paragraph.</p><p>Second [ghost.jpg] paragraph.</p>', []);
    expect(html).not.toContain('[ghost.jpg]');
    expect(textOfParagraphs(html)).toEqual(['First paragraph.', 'Second paragraph.']);
    expect(dom(html).querySelectorAll('img')).toHaveLength(0);
    expect(report.unmatched).toEqual(['ghost.jpg']);
    const warnings = report.warnings.filter(w => w.rule === 'unmatched-image-placeholder');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe('warning');
    expect(warnings[0].detail).toContain('ghost.jpg');
    expect(balanced(html)).toBe(true);
  });

  it.each([
    ['status error', entry({ status: 'error' })],
    ['status pending', entry({ status: 'pending' })],
    ['no usable urlFilename', entry({ urlFilename: '' })],
  ])('treats an entry with %s as unmatched', (_label, unusable) => {
    const { html, report } = apply(`<p>Alpha ${MARKER} Beta.</p>`, [unusable]);
    expect(report.unmatched).toEqual(['desk-lamp.jpg']);
    expect(dom(html).querySelectorAll('img')).toHaveLength(0);
  });
});

describe('text that is not a placeholder, and non-text content — FR-10 (AC-6), FR-1, H-2', () => {
  it.each(['[note]', '[1]', '[Image.jpg]', '[my image.jpg]', '[a.png]'])(
    'leaves %s exactly as written, with no warning',
    text => {
      const input = `<p>Alpha ${text} Beta.</p>`;
      const { html, report } = apply(input);
      expect(html).toBe(input);
      expect(report.warnings).toEqual([]);
      expect(report.unmatched).toEqual([]);
    },
  );

  it('ignores markers in meta tags, attributes, JSON-LD, script and style while still processing visible text', () => {
    const input =
      '<meta name="description" content="Buy [ghost.jpg] now">' +
      '<p>Lead-in.</p>' +
      '<img src="https://x.test/other.jpg" alt="Shows [ghost.jpg]">' +
      `<p>Visible ${MARKER} tail.</p>` +
      '<style>.a::after{content:"[ghost.jpg]"}</style>' +
      '<script type="application/ld+json">{"description":"[ghost.jpg] [desk-lamp.jpg]"}</script>';
    const { html, report } = apply(input);
    expect(html).toContain('content="Buy [ghost.jpg] now"');
    expect(html).toContain('alt="Shows [ghost.jpg]"');
    expect(html).toContain('content:"[ghost.jpg]"');
    expect(html).toContain('{"description":"[ghost.jpg] [desk-lamp.jpg]"}');
    expect(report.unmatched).toEqual([]);
    expect(report.warnings.filter(w => /ghost/.test(w.detail))).toEqual([]);
    // The visible marker was processed.
    expect(textOfParagraphs(html)).toContain('Visible');
    expect(Array.from(dom(html).querySelectorAll('img')).some(i => i.getAttribute('src') === LAMP_SRC)).toBe(true);
  });

  it('does not count a marker that only occurs in an attribute as seen (FR-17 relies on this)', () => {
    const { report } = apply(`<p>Plain.</p><img src="https://x.test/o.jpg" alt="${MARKER}">`);
    expect(report.seen.size).toBe(0);
  });

  it('records visible markers as seen, matched or not', () => {
    const { report } = apply(`<p>A ${MARKER} B [ghost.jpg] C [note].</p>`);
    expect([...report.seen].sort()).toEqual(['desk-lamp.jpg', 'ghost.jpg']);
  });
});

describe('the result satisfies AGENTS.md section 4 under the existing pipeline — FR-13, FR-14 (AC-3)', () => {
  const PAGE =
    `<h1>Lamp</h1><section><h2>Overview</h2><p>Opening paragraph.</p>` +
    `<p>Alpha [desk-lamp.jpg] Beta [kettle-side.jpg] Gamma.</p></section><hr>`;

  it('first image eager, later images lazy, decoding async, styled figures, figcaptions present', () => {
    const { html } = apply(PAGE, [LAMP, KETTLE]);
    const wrapped = dom(wrapImageFigures(html));
    const imgs = Array.from(wrapped.querySelectorAll('img'));
    expect(imgs).toHaveLength(2);
    expect(imgs[0].hasAttribute('loading')).toBe(false);
    expect(imgs[1].getAttribute('loading')).toBe('lazy');
    imgs.forEach(i => expect(i.getAttribute('decoding')).toBe('async'));
    wrapped.querySelectorAll('figure').forEach(f => {
      expect(f.getAttribute('style')).toBe(FIGURE_STYLE);
      expect(f.querySelector('figcaption')).not.toBeNull();
    });
  });

  it('raises none of the frozen validator image rules, with the manifest as coverage input', () => {
    const { html } = apply(PAGE, [LAMP, KETTLE]);
    const issues = validateGeneratedHtml(wrapImageFigures(html), 'HTML (uk-UA)', 'Lamp', 'uk-UA', {
      imageManifest: [{ urlFilename: 'desk-lamp.jpg' }, { urlFilename: 'kettle-side.jpg' }],
    });
    const imageRules = [
      'lcp-image-lazy', 'image-not-lazy', 'img-not-in-figure', 'figure-missing-figcaption',
      'image-manifest-missing', 'image-manifest-duplicate', 'image-unknown-src', 'lead-in-capitalization',
    ];
    expect(issues.filter(i => imageRules.includes(i.rule))).toEqual([]);
  });

  it('never nests a figure in a paragraph, and every figure has a preceding paragraph', () => {
    const { html } = apply(PAGE, [LAMP, KETTLE]);
    expect(noFigureInParagraph(html)).toBe(true);
    dom(html).querySelectorAll('figure').forEach(f => {
      let prev = f.previousElementSibling;
      while (prev && prev.tagName !== 'P') prev = prev.previousElementSibling;
      expect(prev).not.toBeNull();
      expect(collapse(prev!.textContent ?? '')).not.toBe(collapse(f.querySelector('figcaption')!.textContent ?? ''));
    });
  });
});

describe('what the step must not touch — FR-15, FR-16', () => {
  it('leaves a video embed, a spec table and the <hr> separators unchanged', () => {
    const video = '<figure><iframe src="https://www.youtube.com/embed/abc123"></iframe><figcaption>Video</figcaption></figure>';
    const table = '<table><tr><td>Power</td><td>20 W</td></tr></table>';
    const { html } = apply(`<p>Lead ${MARKER} tail.</p>${video}${table}<hr>`);
    expect(html).toContain(video);
    expect(html).toContain(table);
    expect(html).toContain('<hr>');
    expect(html).not.toMatch(/<br/i);
  });

  it('returns the input unchanged and an empty report when there is no marker (NFR-8)', () => {
    const input = '<h1>Lamp</h1><p>Plain paragraph.</p><hr>';
    const { html, report } = apply(input);
    expect(html).toBe(input);
    expect(report.seen.size).toBe(0);
    expect(report.warnings).toEqual([]);
  });
});

describe('appendFigureAtEndHtml — the OQ-5 end-append primitive (review F-4)', () => {
  const parts = buildFigureParts(LAMP, { cyrillicCheck: true });
  const append = (html: string) => appendFigureAtEndHtml(html, parts, IMAGE_BASE, FOLDERS);

  it('adds one figure after the last visible block, preceded by that block as lead-in', () => {
    const out = append('<p>First.</p><p class="cta">Last paragraph.</p>');
    const figure = dom(out).querySelector('figure')!;
    expect(figure.querySelector('img')!.getAttribute('src')).toBe(LAMP_SRC);
    expect(figure.previousElementSibling!.textContent).toBe('Last paragraph.');
    expect(figure.nextElementSibling).toBeNull();
    expect(noFigureInParagraph(out)).toBe(true);
  });

  it('keeps trailing JSON-LD last', () => {
    const ld = '<script type="application/ld+json">{"@type":"Product"}</script>';
    const out = append(`<p>Last paragraph.</p>\n${ld}`);
    expect(out.lastIndexOf('<figure')).toBeLessThan(out.indexOf('<script'));
    expect(out.trimEnd().endsWith(ld)).toBe(true);
  });

  it('keeps trailing meta tags after the figure as well', () => {
    const out = append('<p>Last paragraph.</p><meta name="robots" content="index">');
    expect(out.lastIndexOf('<figure')).toBeLessThan(out.indexOf('<meta'));
  });

  it('builds a figure that the existing wrapImageFigures pass leaves structurally intact (idempotent)', () => {
    const out = append('<p>Last paragraph.</p>');
    const img = dom(wrapImageFigures(out)).querySelector('img')!;
    expect(img.hasAttribute('loading')).toBe(false);
    expect(img.getAttribute('decoding')).toBe('async');
    expect(img.getAttribute('src')).toBe(LAMP_SRC);
    expect(dom(wrapImageFigures(out)).querySelectorAll('figure')).toHaveLength(1);
  });

  it('forms a relative src for an empty image base', () => {
    const out = appendFigureAtEndHtml('<p>Last.</p>', parts, '', FOLDERS);
    expect(dom(out).querySelector('img')!.getAttribute('src')).toBe('acme/lamp/desk-lamp.jpg');
  });

  it('writes a figcaption with the Ukrainian <b> label and the Ukrainian description, and the Ukrainian alt', () => {
    const figure = dom(append('<p>Last.</p>')).querySelector('figure')!;
    const caption = figure.querySelector('figcaption')!;
    expect(caption.querySelector('b')!.textContent).toBe(LAMP_LABEL_UK);
    expect(caption.textContent).toContain(LAMP_DESC_UK);
    expect(figure.querySelector('img')!.getAttribute('alt')).toBe(LAMP_ALT_UK);
    expect(figure.outerHTML).not.toMatch(ENGLISH_STRINGS);
  });

  it('gives the appended figure the max-content layout and a left-aligned figcaption (FR-22)', () => {
    const figure = dom(append('<p>Last.</p>')).querySelector('figure')!;
    expect(figure.getAttribute('style')).toBe(FIGURE_STYLE);
    expect(figure.querySelector('figcaption')!.getAttribute('style')).toBe('text-align: left;');
  });
});

describe('FR-21 caption warnings on the HTML path (AC-9 h, i; NFR-9)', () => {
  const rules = (ws: { rule: string }[]): string[] => ws.map(w => w.rule);
  const KETTLE_SAME_LABEL = entry({
    id: 'img-2', originalFilename: 'kettle-side.jpg', urlFilename: 'kettle-side.jpg', visionLabelUk: LAMP_LABEL_UK,
  });

  it('raises one image-caption-not-native warning, naming the file, when a recorded field has no Cyrillic letter', () => {
    const { report, html } = apply(`<p>Lead ${MARKER} tail.</p>`, [entry({ visionAltUk: 'English alt only' })]);
    const w = report.warnings.filter(x => x.rule === 'image-caption-not-native');
    expect(w).toHaveLength(1);
    expect(w[0].severity).toBe('warning');
    expect(w[0].detail).toContain('desk-lamp.jpg');
    expect(hasCyrillic(w[0].detail)).toBe(true);
    // The fallback applies; the figure is still placed.
    expect(dom(html).querySelector('img')!.getAttribute('alt')).toBe('desk lamp');
  });

  it('raises one image-caption-duplicate-label warning for the later figure and keeps both captions (rule 5)', () => {
    const { report, html } = apply('<p>Alpha [desk-lamp.jpg] Beta [kettle-side.jpg] Gamma.</p>', [LAMP, KETTLE_SAME_LABEL]);
    const w = report.warnings.filter(x => x.rule === 'image-caption-duplicate-label');
    expect(w).toHaveLength(1);
    expect(w[0].detail).toContain('kettle-side.jpg');
    const labels = Array.from(dom(html).querySelectorAll('figcaption b')).map(b => b.textContent);
    expect(labels).toEqual([LAMP_LABEL_UK, LAMP_LABEL_UK]);
  });

  it('counts a figure appended at the end (non-hosting marker) in document order for the duplicate check', () => {
    const body = `<p>Alpha ${MARKER} Beta.</p><ul><li>Item [kettle-side.jpg]</li></ul><p>Closing paragraph.</p>`;
    const { report } = apply(body, [LAMP, KETTLE_SAME_LABEL]);
    expect(rules(report.warnings)).toContain('image-caption-duplicate-label');
    expect(report.warnings.find(x => x.rule === 'image-caption-duplicate-label')!.detail).toContain('kettle-side.jpg');
  });

  it('exempts the fallback label: two legacy entries repeat it with no warning', () => {
    const k = legacyEntry({ id: 'img-2', originalFilename: 'kettle-side.jpg', urlFilename: 'kettle-side.jpg' });
    const { report } = apply('<p>Alpha [desk-lamp.jpg] Beta [kettle-side.jpg] Gamma.</p>', [legacyEntry(), k]);
    expect(report.warnings).toEqual([]);
  });

  it('never raises an error-severity issue for a caption problem (NFR-9)', () => {
    const { report } = apply(`<p>Lead ${MARKER} tail.</p>`, [entry({ visionLabelUk: 'Image:', visionAltUk: 'English' })]);
    expect(report.warnings.length).toBeGreaterThan(0);
    for (const w of report.warnings) expect(w.severity).toBe('warning');
  });

  it('with cyrillicCheck off the English text is used as recorded and raises no caption warning (A-15)', () => {
    const english = entry({ visionLabelUk: 'Green laser result:', visionDescriptionUk: 'A laser burns wood.', visionAltUk: 'Laser on wood' });
    const { html, report } = applyImagePlaceholdersHtml(`<p>Lead ${MARKER} tail.</p>`, [english], IMAGE_BASE, FOLDERS, { cyrillicCheck: false });
    expect(report.warnings).toEqual([]);
    expect(dom(html).querySelector('img')!.getAttribute('alt')).toBe('Laser on wood');
    expect(dom(html).querySelector('figcaption b')!.textContent).toBe('Green laser result:');
  });

  it('is idempotent with respect to the caption warnings: a second run adds none (FR-11)', () => {
    const first = apply(`<p>Lead ${MARKER} tail.</p>`, [entry({ visionAltUk: 'English alt only' })]);
    const second = apply(first.html, [entry({ visionAltUk: 'English alt only' })]);
    expect(second.html).toBe(first.html);
    expect(second.report.warnings).toEqual([]);
  });
});

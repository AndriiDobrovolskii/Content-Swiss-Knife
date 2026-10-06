/**
 * editor-html-pipeline.spec.ts  (US-6.1)
 *
 * Written BEFORE the implementation, from the Story's AC-1..AC-9 and Specification v5
 * (FR-1..FR-13, NFR-1, NFR-2). Every assertion is derived from a requirement, never from
 * observed output.
 *
 * Runner: `npm run test:logic` (vitest + happy-dom). No Angular, no TestBed, no live TipTap
 * Editor (plan D9): the editor-local pipeline is exercised as pure functions plus the real
 * schema (getSchema + ProseMirror DOMParser/DOMSerializer) and the real
 * validateStructuralParity. The two call-site swaps in html-editor.component.ts are NOT
 * covered here (manual Copy HTML QA, plan D9).
 *
 * The module under test does not exist yet; this file is red until T1 creates it:
 *   filterEmbedIframes(html)   - T1, FR-7/8/9 (+ FR-6 figure skip)
 *   sanitizeEditorHtml(html)   - T1, NFR-1
 *   finalizeCopyHtml(rawHtml)  - T1 (created) / T2 (used)
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath, URL as NodeURL } from 'node:url';
import { describe, it, expect } from 'vitest';
import { getSchema } from '@tiptap/core';
import { DOMParser as PMDOMParser, DOMSerializer, type Node as PMNode } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { validateStructuralParity } from '../../../utils/structural-parity';
import { TIPTAP_EXTENSIONS } from './extensions/index';
import { filterEmbedIframes, sanitizeEditorHtml, finalizeCopyHtml } from './editor-html-pipeline';

const schema = getSchema(TIPTAP_EXTENSIONS);

// ---- shared helpers ---------------------------------------------------------------------

function iframesOf(html: string): HTMLIFrameElement[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.querySelectorAll('iframe'));
}

function parseToPm(html: string): PMNode {
  const dom = new DOMParser().parseFromString(html, 'text/html');
  return PMDOMParser.fromSchema(schema).parse(dom.body);
}

function serializePm(doc: PMNode): string {
  const fragment = DOMSerializer.fromSchema(schema).serializeFragment(doc.content);
  const wrapper = document.createElement('div');
  wrapper.appendChild(fragment);
  return wrapper.innerHTML;
}

/** What the component does on load: sanitize once; that value is both the baseline and the editor content. */
function loadBaseline(input: string): string {
  return sanitizeEditorHtml(input);
}

/** What the component does on Copy HTML with no edits: editor.getHTML() then the copy fix-ups. */
function copyOutputUnedited(baseline: string): string {
  return finalizeCopyHtml(serializePm(parseToPm(baseline)));
}

function iframeParityIssues(baseline: string, output: string) {
  return validateStructuralParity(baseline, output, 'HTML Editor').filter(
    i => i.rule === 'structural-parity-media' && i.detail.startsWith('<iframe>'),
  );
}

const YT = 'https://www.youtube.com/embed/Y9C9_tiOsbQ?rel=0';
const ALLOWED_IFRAME =
  `<iframe src="${YT}" title="Demo" loading="lazy" allowfullscreen=""` +
  ` style="width: 100%; aspect-ratio: 16 / 9; border: none;"></iframe>`;

function wrapped(iframeSrc: string, extra = ''): string {
  return `<p>Before</p><div style="max-width: 1000px;"><iframe src="${iframeSrc}"></iframe>${extra}</div><p>After</p>`;
}

// ============================================================================================
// T1 - filterEmbedIframes / sanitizeEditorHtml / finalizeCopyHtml
// ============================================================================================

describe('T1 filterEmbedIframes - hostname rule (FR-7, AC-7)', () => {
  const REMOVED: Array<[string, string]> = [
    ['unknown host', 'https://example.com/embed/1'],
    ['allow-listed name in the query string', 'https://evil.example/?x=youtube.com'],
    ['allow-listed name as a prefix of the host (youtube.com.evil.example)', 'https://youtube.com.evil.example/embed/1'],
    ['allow-listed name in the path', 'https://evil.example/youtube.com'],
    ['no dot boundary (notyoutube.com)', 'https://notyoutube.com/embed/1'],
    ['userinfo (youtube.com@evil.example)', 'https://youtube.com@evil.example/'],
    ['no dot boundary on a vimeo host (notvimeo.com)', 'https://notvimeo.com/1'],
  ];

  it.each(REMOVED)('removes a div-wrapped iframe: %s', (_label, src) => {
    const out = filterEmbedIframes(wrapped(src));
    expect(iframesOf(out)).toHaveLength(0);
    // only the iframe goes: wrapper div and surrounding content stay (A-7b)
    const doc = new DOMParser().parseFromString(out, 'text/html');
    expect(doc.querySelector('div')?.getAttribute('style')).toBe('max-width: 1000px;');
    expect(doc.body.textContent).toContain('Before');
    expect(doc.body.textContent).toContain('After');
  });

  it('removes a bare (unwrapped) off-list iframe', () => {
    const out = filterEmbedIframes(`<p>x</p><iframe src="https://example.com/embed/1"></iframe>`);
    expect(iframesOf(out)).toHaveLength(0);
  });

  it('removes an off-list iframe nested as figure > div > iframe (only a direct figure child is exempt)', () => {
    const out = filterEmbedIframes(
      `<figure><div><iframe src="https://evil.example/embed/1"></iframe></div><figcaption>c</figcaption></figure>`,
    );
    expect(iframesOf(out)).toHaveLength(0);
  });

  const KEPT: Array<[string, string]> = [
    ['www.youtube.com with a query string', 'https://www.youtube.com/embed/Y9C9_tiOsbQ?rel=0'],
    ['youtube.com apex', 'https://youtube.com/embed/x'],
    ['a youtube.com subdomain', 'https://m.youtube.com/embed/x'],
    ['youtu.be', 'https://youtu.be/x'],
    ['player.vimeo.com', 'https://player.vimeo.com/video/1'],
    ['vimeo.com', 'https://vimeo.com/1'],
  ];

  it.each(KEPT)('keeps a div-wrapped iframe and does not rewrite its src: %s', (_label, src) => {
    const out = filterEmbedIframes(wrapped(src));
    const frames = iframesOf(out);
    expect(frames).toHaveLength(1);
    expect(frames[0].getAttribute('src')).toBe(src);
  });

  it('keeps every other attribute of a kept iframe untouched', () => {
    const out = filterEmbedIframes(`<div>${ALLOWED_IFRAME}</div>`);
    const [frame] = iframesOf(out);
    expect(frame.getAttribute('title')).toBe('Demo');
    expect(frame.getAttribute('loading')).toBe('lazy');
    expect(frame.hasAttribute('allowfullscreen')).toBe(true);
    expect(frame.getAttribute('style')).toBe('width: 100%; aspect-ratio: 16 / 9; border: none;');
  });

  it('removes only the off-list iframe when allowed and off-list iframes are mixed, keeping order', () => {
    const html =
      `<div><iframe src="https://www.youtube.com/embed/first"></iframe></div>` +
      `<div><iframe src="https://evil.example/embed/x"></iframe></div>` +
      `<div><iframe src="https://vimeo.com/2"></iframe></div>`;
    const srcs = iframesOf(filterEmbedIframes(html)).map(f => f.getAttribute('src'));
    expect(srcs).toEqual(['https://www.youtube.com/embed/first', 'https://vimeo.com/2']);
  });
});

describe('T1 filterEmbedIframes - protocol rule (FR-8, AC-7)', () => {
  const REMOVED: Array<[string, string]> = [
    ['ftp: with an allow-listed hostname', 'ftp://youtube.com/x'],
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:text/html,<b>x</b>'],
    ['blob:', 'blob:https://www.youtube.com/0b1c'],
  ];

  it.each(REMOVED)('removes a div-wrapped iframe with %s', (_label, src) => {
    const out = filterEmbedIframes(wrapped(src));
    expect(iframesOf(out)).toHaveLength(0);
  });

  it('keeps http: with an allow-listed hostname', () => {
    const out = filterEmbedIframes(wrapped('http://www.youtube.com/embed/x'));
    const frames = iframesOf(out);
    expect(frames).toHaveLength(1);
    expect(frames[0].getAttribute('src')).toBe('http://www.youtube.com/embed/x');
  });
});

describe('T1 filterEmbedIframes - empty, missing and unparsable src (FR-9, AC-7)', () => {
  it('removes an iframe with an empty src', () => {
    expect(iframesOf(filterEmbedIframes(`<div><iframe src=""></iframe></div>`))).toHaveLength(0);
  });

  it('removes an iframe with no src attribute', () => {
    expect(iframesOf(filterEmbedIframes(`<div><iframe title="x"></iframe></div>`))).toHaveLength(0);
  });

  it('removes an iframe whose src new URL() cannot parse', () => {
    expect(iframesOf(filterEmbedIframes(wrapped('http://')))).toHaveLength(0);
    expect(iframesOf(filterEmbedIframes(wrapped('not a url at all')))).toHaveLength(0);
  });

  it('removes a relative src (no base to parse against)', () => {
    expect(iframesOf(filterEmbedIframes(wrapped('/embed/1')))).toHaveLength(0);
  });

  it('removes a protocol-relative src (cannot be parsed without a base)', () => {
    expect(iframesOf(filterEmbedIframes(wrapped('//www.youtube.com/embed/x')))).toHaveLength(0);
  });
});

describe('T1 filterEmbedIframes - figure-wrapped iframes are untouched (FR-6, A-6)', () => {
  it('keeps a figure > iframe with an off-list host exactly as it is', () => {
    const html =
      `<figure><iframe src="https://youtube.invalid/embed/xyz?rel=0" title="Demo"></iframe>` +
      `<figcaption>cap</figcaption></figure>`;
    const frames = iframesOf(filterEmbedIframes(html));
    expect(frames).toHaveLength(1);
    expect(frames[0].getAttribute('src')).toBe('https://youtube.invalid/embed/xyz?rel=0');
    expect(frames[0].getAttribute('title')).toBe('Demo');
  });
});

describe('T1 filterEmbedIframes - determinism (NFR-2)', () => {
  it('returns the same output for the same input, twice', () => {
    const html = wrapped('https://evil.example/x') + wrapped(YT);
    expect(filterEmbedIframes(html)).toBe(filterEmbedIframes(html));
  });
});

describe('T1 sanitizeEditorHtml - composition with sanitizeUntrustedHtml (NFR-1, FR-9)', () => {
  it('removes (not merely empties) an iframe whose javascript: src the base sanitizer blanked', () => {
    expect(iframesOf(sanitizeEditorHtml(wrapped('javascript:alert(1)')))).toHaveLength(0);
  });

  it('removes (not merely empties) an iframe whose data: src the base sanitizer blanked', () => {
    expect(iframesOf(sanitizeEditorHtml(wrapped('data:text/html,<b>x</b>')))).toHaveLength(0);
  });

  it('still strips <script>, <style> and on* attributes around a kept iframe', () => {
    const html =
      `<script>alert(1)</script><style>p{color:red}</style>` +
      `<div><iframe src="${YT}" onload="alert(2)"></iframe></div>`;
    const out = sanitizeEditorHtml(html);
    expect(out).not.toContain('<script');
    expect(out).not.toContain('<style');
    const frames = iframesOf(out);
    expect(frames).toHaveLength(1);
    expect(frames[0].hasAttribute('onload')).toBe(false);
    expect(frames[0].getAttribute('src')).toBe(YT);
  });
});

describe('T1 finalizeCopyHtml - the Copy HTML / Source-mode gate (plan D9)', () => {
  it('filters an off-list div-wrapped iframe that reached the raw editor HTML', () => {
    const out = finalizeCopyHtml(`<div style="a: b;"><iframe src="https://evil.example/x"></iframe></div><p>kept</p>`);
    expect(iframesOf(out)).toHaveLength(0);
    expect(out).toContain('kept');
  });

  it('keeps an allowed div-wrapped iframe with its src byte-identical', () => {
    const out = finalizeCopyHtml(`<div style="a: b;"><iframe src="${YT}"></iframe></div>`);
    const frames = iframesOf(out);
    expect(frames).toHaveLength(1);
    expect(frames[0].getAttribute('src')).toBe(YT);
  });

  it('applies the base sanitizer too (on* attributes removed)', () => {
    const out = finalizeCopyHtml(`<p onclick="alert(1)">x</p>`);
    expect(out).not.toContain('onclick');
  });

  it('is deterministic (NFR-2)', () => {
    const raw = `<div><iframe src="${YT}"></iframe></div>`;
    expect(finalizeCopyHtml(raw)).toBe(finalizeCopyHtml(raw));
  });
});

// ============================================================================================
// T2 - baseline taken after load-time sanitization (FR-12, AC-9)
// ============================================================================================

describe('T2 structural-parity baseline after load-time sanitization (FR-12, AC-9)', () => {
  const REMOVED: Array<[string, string]> = [
    ['off-list host', 'https://evil.example/embed/1'],
    ['notyoutube.com look-alike', 'https://notyoutube.com/embed/1'],
    ['userinfo look-alike', 'https://youtube.com@evil.example/'],
    ['ftp: protocol', 'ftp://youtube.com/x'],
    ['javascript: src', 'javascript:alert(1)'],
    ['empty src', ''],
  ];

  it.each(REMOVED)('raises no iframe structure message for a pasted iframe removed by sanitization: %s', (_l, src) => {
    const input = wrapped(src);
    const baseline = loadBaseline(input);
    const output = copyOutputUnedited(baseline);

    expect(iframesOf(baseline)).toHaveLength(0); // baseline is taken AFTER the filter
    expect(iframesOf(output)).toHaveLength(0);   // and the iframe is not in the Copy HTML output
    expect(iframeParityIssues(baseline, output)).toEqual([]);
  });

  it('applies the same gate to Source-mode style input (raw HTML given straight to finalizeCopyHtml)', () => {
    const output = finalizeCopyHtml(wrapped('https://evil.example/embed/1'));
    expect(iframesOf(output)).toHaveLength(0);
  });
});

// ============================================================================================
// T3 - copy-path parity with the embedIframe node (FR-3, FR-13, AC-3, AC-9)
// ============================================================================================

describe('T3 Copy HTML structure check with an allowed div-wrapped iframe (FR-3, AC-3)', () => {
  it.each([1, 2, 3])('raises no iframe structure message on an unedited document wrapped in %i divs', n => {
    let html = ALLOWED_IFRAME;
    for (let i = 0; i < n; i++) html = `<div style="max-width: ${1000 + i}px;">${html}</div>`;
    const baseline = loadBaseline(`<p>Intro</p>${html}<p>Outro</p>`);
    const output = copyOutputUnedited(baseline);

    expect(iframesOf(baseline)).toHaveLength(1);
    expect(iframesOf(output).map(f => f.getAttribute('src'))).toEqual([YT]); // not vacuous: the iframe is really in the output
    expect(iframeParityIssues(baseline, output)).toEqual([]);
  });
});

describe('T3 a kept iframe that is changed or lost still triggers the warning (FR-13, AC-9)', () => {
  function embedPos(doc: PMNode): { pos: number; node: PMNode } {
    let found: { pos: number; node: PMNode } | null = null;
    doc.descendants((node, pos) => {
      if (node.type.name === 'embedIframe') found = { pos, node };
      return true;
    });
    if (!found) throw new Error('no embedIframe node in the document: the iframe was not preserved');
    return found;
  }

  const baseline = loadBaseline(wrapped(YT));

  it('warns when the iframe is deleted during editing', () => {
    const state = EditorState.create({ doc: parseToPm(baseline) });
    const { pos, node } = embedPos(state.doc);
    const edited = state.apply(state.tr.delete(pos, pos + node.nodeSize)).doc;
    const output = finalizeCopyHtml(serializePm(edited));

    const issues = iframeParityIssues(baseline, output);
    expect(issues).toHaveLength(1);
    expect(issues[0].detail).toContain(YT);
  });

  it('warns when the iframe src is changed during editing', () => {
    const state = EditorState.create({ doc: parseToPm(baseline) });
    const { pos, node } = embedPos(state.doc);
    const changed = 'https://www.youtube.com/embed/CHANGED';
    const edited = state.apply(state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: changed })).doc;
    const output = finalizeCopyHtml(serializePm(edited));

    const issues = iframeParityIssues(baseline, output);
    expect(issues).toHaveLength(1);
    expect(issues[0].detail).toContain(YT);
    expect(issues[0].detail).toContain(changed);
  });
});

describe('T3 zero-edit parity of a real generator document through the new pipeline (FR-13 guard)', () => {
  it('reports no structural difference for description_uk-UA.original.html', () => {
    const path = fileURLToPath(new NodeURL('../../../utils/__fixtures__/description_uk-UA.original.html', import.meta.url));
    const baseline = loadBaseline(readFileSync(path, 'utf-8'));
    const output = copyOutputUnedited(baseline);
    expect(validateStructuralParity(baseline, output, 'HTML Editor')).toEqual([]);
  });
});

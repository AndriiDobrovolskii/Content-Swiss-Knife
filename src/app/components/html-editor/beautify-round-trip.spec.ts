/**
 * beautify-round-trip.spec.ts
 *
 * Safety net for Phase A: confirms js-beautify's inserted indentation/newlines
 * are whitespace-insignificant to ProseMirror's HTML parser, i.e. beautifying
 * the Source view and then re-parsing it back into the editor is lossless.
 * Written and run before wiring beautifyHtml() into toggleSourceMode().
 *
 * RUN: npm run test
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath, URL as NodeURL } from 'node:url';
import { describe, it, expect } from 'vitest';
import { getSchema } from '@tiptap/core';
import { DOMParser as PMDOMParser, DOMSerializer } from '@tiptap/pm/model';
import { validateStructuralParity } from '../../../utils/structural-parity';
import { TIPTAP_EXTENSIONS } from './extensions';
import { beautifyHtml } from './source-view';

const schema = getSchema(TIPTAP_EXTENSIONS);

function reparse(html: string): string {
  const dom = new DOMParser().parseFromString(html, 'text/html');
  const doc = PMDOMParser.fromSchema(schema).parse(dom.body);
  const fragment = DOMSerializer.fromSchema(schema).serializeFragment(doc.content);
  const wrapper = document.createElement('div');
  wrapper.appendChild(fragment);
  return wrapper.innerHTML;
}

const FIXTURE_PATH = fileURLToPath(
  new NodeURL('../../../utils/__fixtures__/description_uk-UA.original.html', import.meta.url),
);

describe('beautifyHtml — round-trip safety through ProseMirror', () => {
  it('preserves structural counts/media identity on the real generator fixture after beautify + re-parse', () => {
    const original = readFileSync(FIXTURE_PATH, 'utf-8');
    const beautified = beautifyHtml(original);
    const reparsed = reparse(beautified);
    const issues = validateStructuralParity(original, reparsed, 'beautify round-trip fixture');
    expect(issues).toEqual([]);
  });

  it('does not create a stray whitespace text node inside an inline mark (<b>) on re-parse', () => {
    const html = '<p>text <b>bold word</b> more <a href="#">link text</a> end</p>';
    const beautified = beautifyHtml(html);
    const reparsed = reparse(beautified);
    const doc = new DOMParser().parseFromString(reparsed, 'text/html');
    expect(doc.querySelector('b')?.textContent).toBe('bold word');
    expect(doc.querySelector('a')?.textContent).toBe('link text');
  });
});

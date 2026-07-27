// @vitest-environment node
/**
 * render-description.node.spec.ts
 *
 * Regression guard for the BFF-portability constraint: render-description.ts must run under plain
 * Node, with no DOM APIs.
 *
 * This needs its own file because vitest.config.ts sets `environment: 'happy-dom'` GLOBALLY —
 * `document` and `DOMParser` are defined in the default test environment, so a browser-API leak
 * would pass silently there. The docblock above overrides the environment for this file only.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderDescription } from './render-description';
import type { ProductDescriptionDoc } from '../domain/description-doc';

const doc: ProductDescriptionDoc = {
  schemaVersion: '3.0',
  locale: 'uk-UA',
  localizedName: 'Test Product',
  hook: 'Hook <b>text</b>.',
  killerSpecs: [
    { label: 'A', value: '1', why: 'Why A.' },
    { label: 'B', value: '2', why: 'Why B.' },
    { label: 'C', value: '3', why: 'Why C.' },
  ],
  keyBenefits: [{ kind: 'paragraph', text: 'A benefit.' }],
  functionality: [
    {
      heading: 'Functionality',
      blocks: [{ kind: 'paragraph', text: 'Body.' }, { kind: 'figure', ref: 0 }],
      subsections: [{ heading: 'Detail', blocks: [{ kind: 'figure', ref: 1 }] }],
    },
  ],
  applications: {
    heading: 'Applications',
    items: [
      { scenario: 'One:', text: 'a.' },
      { scenario: 'Two:', text: 'b.' },
      { scenario: 'Three:', text: 'c.' },
      { scenario: 'Four:', text: 'd.' },
    ],
  },
  specs: { heading: 'Specs', categories: [{ title: 'Cat', rows: [{ label: 'L', value: 'V' }] }] },
  cta: { heading: 'Why buy?', text: 'Because.' },
  figures: [
    { file: 'a.jpg', alt: 'A', caption: '<b>A:</b> caption.' },
    { file: 'b.jpg', alt: 'B', caption: '<b>B:</b> caption.' },
  ],
};

describe('render-description Node safety', () => {
  it('is undefined in this environment (proving the override took effect)', () => {
    // Guards the guard: if the docblock ever stops being honoured, the execution proof below
    // becomes vacuous and this assertion is what catches it.
    expect(typeof globalThis.document).toBe('undefined');
  });

  it('renders under plain Node without touching a DOM API', () => {
    const html = renderDescription(doc, {
      imageBaseUrl: 'https://example.com/img/',
      brandFolder: 'brand',
      modelFolder: 'model',
    });

    expect(html).toContain('<section class="specs">');
    expect(html).toContain('src="https://example.com/img/brand/model/a.jpg"');
    expect(html).toContain('<h3>Detail</h3>');
    // First image eager, second lazy — the full contract, exercised outside the browser.
    expect(html.match(/<img\b[^>]*>/g)!.map(t => t.includes('loading="lazy"'))).toEqual([false, true]);
  });

  it('contains no reference to a browser global in its source', () => {
    const path = fileURLToPath(new URL('./render-description.ts', import.meta.url));
    const source = readFileSync(path, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
      .replace(/\/\/.*$/gm, ''); // line comments

    // Comments are stripped first: this file's own prose legitimately names these APIs, and so
    // does render-description.ts's header, which explains why it avoids them.
    expect(source).not.toMatch(/DOMParser|document\.|window\./);
  });
});

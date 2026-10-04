/**
 * image-figure.spec.ts
 *
 * Regression guard for src/utils/image-figure.ts — the deterministic post-step
 * that wraps generated product images in a <figure>/<figcaption>. The value of
 * doing this in code is that the inline styles, `decoding="async"`, and the
 * first-eager / rest-lazy loading rule are normalized deterministically while
 * the LLM-authored `src`, `alt`, and figcaption text are preserved. These tests
 * lock that contract.
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { wrapImageFigures } from './image-figure';

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('wrapImageFigures', () => {
  it('wraps a bare <img> in a <figure> with the canonical styles', () => {
    const html = `<p>Lead-in.</p><img src="a.jpg" alt="A">`;
    const doc = parse(wrapImageFigures(html));

    const figure = doc.querySelector('figure');
    expect(figure).not.toBeNull();
    expect(figure!.getAttribute('style')).toBe('display: block; width: max-content; max-width: 100%; margin: 4px auto;');

    const img = figure!.querySelector(':scope > img');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('style')).toBe('max-width: 100%; height: auto; display: block;');
  });

  it('normalizes an LLM-emitted <figure><img><figcaption> and preserves the <b> lead-in', () => {
    const html = `<p>Lead-in.</p><figure style="x"><img src="a.jpg" alt="A" style="y">` +
      `<figcaption style="z"><b>Result:</b> copper structures</figcaption></figure>`;
    const figure = parse(wrapImageFigures(html)).querySelector('figure')!;

    expect(figure.getAttribute('style')).toContain('width: max-content');
    const figcaption = figure.querySelector(':scope > figcaption')!;
    expect(figcaption.getAttribute('style')).toBe('text-align: left;');
    expect(figcaption.innerHTML).toBe('<b>Result:</b> copper structures');
  });

  it('keeps the first image eager and makes every subsequent image lazy', () => {
    const html = `<p>A</p><img src="a.jpg" alt="A"><p>B</p><img src="b.jpg" alt="B"><p>C</p><img src="c.jpg" alt="C">`;
    const imgs = Array.from(parse(wrapImageFigures(html)).querySelectorAll('img'));

    expect(imgs[0].hasAttribute('loading')).toBe(false);
    expect(imgs[1].getAttribute('loading')).toBe('lazy');
    expect(imgs[2].getAttribute('loading')).toBe('lazy');
    imgs.forEach(img => expect(img.getAttribute('decoding')).toBe('async'));
  });

  it('strips a stray loading="lazy" from the first (LCP) image', () => {
    const html = `<p>A</p><img src="a.jpg" alt="A" loading="lazy">`;
    const img = parse(wrapImageFigures(html)).querySelector('img')!;
    expect(img.hasAttribute('loading')).toBe(false);
  });

  it('unwraps a <figure> nested inside a <p> (invalid HTML)', () => {
    const html = `<p>Lead-in.</p><p><img src="a.jpg" alt="A"></p>`;
    const doc = parse(wrapImageFigures(html));
    expect(doc.querySelector('p figure')).toBeNull();
    expect(doc.body.querySelector(':scope > figure')).not.toBeNull();
    // the separate lead-in <p> survives
    expect(doc.querySelector('p')!.textContent).toBe('Lead-in.');
  });

  it('preserves src and alt verbatim', () => {
    const html = `<img src="https://cdn/x/y/z.jpg" alt="Precise scan demo">`;
    const img = parse(wrapImageFigures(html)).querySelector('img')!;
    expect(img.getAttribute('src')).toBe('https://cdn/x/y/z.jpg');
    expect(img.getAttribute('alt')).toBe('Precise scan demo');
  });

  it('returns HTML unchanged when there are no images', () => {
    const html = `<section><p>No images here.</p></section>`;
    const doc = parse(wrapImageFigures(html));
    expect(doc.querySelector('figure')).toBeNull();
    expect(doc.querySelector('p')!.textContent).toBe('No images here.');
  });

  it('is idempotent — re-running yields the same structure', () => {
    const html = `<p>A</p><img src="a.jpg" alt="A"><p>B</p><img src="b.jpg" alt="B">`;
    const once = wrapImageFigures(html);
    const twice = wrapImageFigures(once);
    expect(twice).toBe(once);
  });
});

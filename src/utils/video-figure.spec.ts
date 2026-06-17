/**
 * video-figure.spec.ts
 *
 * Regression guard for src/utils/video-figure.ts — the deterministic post-step
 * that wraps generated YouTube/Vimeo iframes in a <figure>/<figcaption>. The
 * value of doing this in code is that `src` is preserved and the attribute set
 * is normalized deterministically; these tests lock that contract.
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { wrapVideoFigures } from './video-figure';

const PRODUCT = 'Acme X1';

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('wrapVideoFigures', () => {
  it('wraps a YouTube embed in figure > div(aspect-ratio) > iframe + figcaption', () => {
    const html = `<p>Watch it in action.</p><p><iframe src="https://www.youtube.com/embed/abc123"></iframe></p>`;
    const doc = parse(wrapVideoFigures(html, PRODUCT));

    const figure = doc.querySelector('figure');
    expect(figure).not.toBeNull();
    expect(figure!.getAttribute('style')).toContain('max-width: 1140px');

    const aspectDiv = figure!.querySelector(':scope > div');
    expect(aspectDiv!.getAttribute('style')).toContain('aspect-ratio: 16 / 9');

    const iframe = aspectDiv!.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.getAttribute('style')).toBe('width: 100%; height: 100%; border: 0;');

    const figcaption = figure!.querySelector(':scope > figcaption');
    expect(figcaption!.textContent).toBe(`Video review of ${PRODUCT}`);
  });

  it('ensures rel=0 while preserving the rest of the src', () => {
    const html = `<p><iframe src="https://www.youtube.com/embed/abc123?start=10"></iframe></p>`;
    const src = parse(wrapVideoFigures(html, PRODUCT)).querySelector('iframe')!.getAttribute('src')!;
    expect(src).toContain('start=10');
    expect(src).toContain('rel=0');
    expect(src.startsWith('https://www.youtube.com/embed/abc123')).toBe(true);
  });

  it('ensures the standard attribute set and purges others', () => {
    const html = `<p><iframe src="https://www.youtube.com/embed/abc" width="560" height="315" frameborder="0"></iframe></p>`;
    const iframe = parse(wrapVideoFigures(html, PRODUCT)).querySelector('iframe')!;
    expect(iframe.getAttribute('loading')).toBe('lazy');
    expect(iframe.getAttribute('allow')).toContain('picture-in-picture');
    expect(iframe.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
    expect(iframe.hasAttribute('allowfullscreen')).toBe(true);
    // purged
    expect(iframe.hasAttribute('width')).toBe(false);
    expect(iframe.hasAttribute('height')).toBe(false);
    expect(iframe.hasAttribute('frameborder')).toBe(false);
  });

  it('handles youtu.be and vimeo URLs', () => {
    const youtu = `<p><iframe src="https://youtu.be/xyz"></iframe></p>`;
    const vimeo = `<p><iframe src="https://player.vimeo.com/video/12345"></iframe></p>`;
    expect(parse(wrapVideoFigures(youtu, PRODUCT)).querySelector('figure figcaption')).not.toBeNull();
    const vimeoIframe = parse(wrapVideoFigures(vimeo, PRODUCT)).querySelector('figure iframe')!;
    expect(vimeoIframe.getAttribute('src')).toContain('player.vimeo.com/video/12345');
  });

  it('replaces the iframe\'s <p> with the <figure> and leaves the preceding lead-in <p> untouched', () => {
    const html = `<p>Here is the video.</p><p><iframe src="https://www.youtube.com/embed/abc"></iframe></p>`;
    const doc = parse(wrapVideoFigures(html, PRODUCT));
    // lead-in <p> preserved
    const leadIn = doc.querySelector('p');
    expect(leadIn!.textContent).toBe('Here is the video.');
    // no <figure> nested inside a <p>
    expect(doc.querySelector('p figure')).toBeNull();
    // figure is a top-level sibling
    expect(doc.body.querySelector(':scope > figure')).not.toBeNull();
  });

  it('synthesizes title="{productName} video" when absent', () => {
    const html = `<p><iframe src="https://www.youtube.com/embed/abc"></iframe></p>`;
    const iframe = parse(wrapVideoFigures(html, PRODUCT)).querySelector('iframe')!;
    expect(iframe.getAttribute('title')).toBe(`${PRODUCT} video`);
  });

  it('preserves an existing iframe title', () => {
    const html = `<p><iframe src="https://www.youtube.com/embed/abc" title="Hands-on demo"></iframe></p>`;
    const iframe = parse(wrapVideoFigures(html, PRODUCT)).querySelector('iframe')!;
    expect(iframe.getAttribute('title')).toBe('Hands-on demo');
  });

  it('leaves a non-video iframe (e.g. a map) untouched', () => {
    const html = `<p><iframe src="https://maps.google.com/maps?q=here"></iframe></p>`;
    const doc = parse(wrapVideoFigures(html, PRODUCT));
    expect(doc.querySelector('figure')).toBeNull();
    expect(doc.querySelector('iframe')!.getAttribute('src')).toBe('https://maps.google.com/maps?q=here');
  });

  it('returns HTML unchanged when there are no iframes', () => {
    const html = `<section><p>No videos here.</p></section>`;
    const doc = parse(wrapVideoFigures(html, PRODUCT));
    expect(doc.querySelector('figure')).toBeNull();
    expect(doc.querySelector('p')!.textContent).toBe('No videos here.');
  });
});

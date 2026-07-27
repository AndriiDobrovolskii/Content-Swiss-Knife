/**
 * html-text-walk.spec.ts
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { mapHtmlText } from './html-text-walk';

const shout = (t: string) => t.toUpperCase();

describe('mapHtmlText', () => {
  it('transforms text nodes', () => {
    expect(mapHtmlText('<p>hello</p>', shout)).toBe('<p>HELLO</p>');
  });

  it('never touches src or href, however tempting the value looks', () => {
    const html = '<a href="/catalog/mm"><img src="https://cdn.example.com/20w.jpg" alt="a 20w head"></a>';
    const out = mapHtmlText(html, shout);
    expect(out).toContain('href="/catalog/mm"');
    expect(out).toContain('src="https://cdn.example.com/20w.jpg"');
    expect(out).toContain('alt="A 20W HEAD"');
  });

  it('transforms only the attributes in the allow-list', () => {
    const html = '<img alt="alpha" title="beta" class="gamma">';
    expect(mapHtmlText(html, shout, ['alt'])).toBe('<img alt="ALPHA" title="beta" class="gamma">');
    expect(mapHtmlText(html, shout, ['alt', 'title'])).toBe('<img alt="ALPHA" title="BETA" class="gamma">');
  });

  it('leaves tag names and structure untouched', () => {
    const html = '<section class="specs"><table><tbody><tr><td>x</td></tr></tbody></table></section>';
    expect(mapHtmlText(html, t => t.replace('x', 'y'))).toBe(
      '<section class="specs"><table><tbody><tr><td>y</td></tr></tbody></table></section>',
    );
  });

  it('is a no-op with an identity transform', () => {
    const html = '<p>Текст <b>жирний</b></p><img src="a.jpg" alt="alt">';
    expect(mapHtmlText(html, t => t)).toBe(html);
  });
});

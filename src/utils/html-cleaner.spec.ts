/**
 * html-cleaner.spec.ts
 *
 * Regression guard for src/utils/html-cleaner.ts — the deterministic cleanup
 * pass behind the Optimizer's "Clean Structure (Fast)" button (and the
 * finishing pass after the AI "Optimize HTML" path). Locks the newer
 * Schema.org microdata strip, table simplification, HowTo/FAQ flattening, and
 * figure-wrapping behavior.
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { cleanHtmlStructure, stripTiptapArtifacts, sanitizeUntrustedHtml } from './html-cleaner';

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('cleanHtmlStructure — microdata stripping', () => {
  it('removes itemscope, itemtype, and itemprop from arbitrary elements', () => {
    const html = `<div itemscope itemtype="https://schema.org/Product"><p itemprop="description">Text</p></div>`;
    const doc = parse(cleanHtmlStructure(html));
    const div = doc.querySelector('div')!;
    const p = doc.querySelector('p')!;
    expect(div.hasAttribute('itemscope')).toBe(false);
    expect(div.hasAttribute('itemtype')).toBe(false);
    expect(p.hasAttribute('itemprop')).toBe(false);
    expect(p.textContent).toBe('Text');
  });
});

describe('cleanHtmlStructure — table simplification', () => {
  const dirtyTable = `
    <div class="table-responsive">
      <table class="table table-striped table-hover table-bordered">
        <thead><tr><th scope="col">Key Specification</th><th scope="col">Value</th></tr></thead>
        <tbody>
          <tr itemprop="additionalProperty" itemscope itemtype="https://schema.org/PropertyValue">
            <th scope="row" itemprop="name">Battery Life</th>
            <td itemprop="value">Approx. 2 h</td>
          </tr>
        </tbody>
      </table>
    </div>`;

  it('strips table classes but keeps the .table-responsive wrapper', () => {
    const doc = parse(cleanHtmlStructure(dirtyTable));
    expect(doc.querySelector('div.table-responsive')).not.toBeNull();
    expect(doc.querySelector('table')!.hasAttribute('class')).toBe(false);
  });

  it('strips scope from header th but keeps header text unchanged', () => {
    const doc = parse(cleanHtmlStructure(dirtyTable));
    const headerThs = doc.querySelectorAll('thead th');
    headerThs.forEach(th => expect(th.hasAttribute('scope')).toBe(false));
    expect(headerThs[0].textContent).toBe('Key Specification');
    expect(headerThs[1].textContent).toBe('Value');
  });

  it('converts a tbody row-label <th> into a plain <td>', () => {
    const doc = parse(cleanHtmlStructure(dirtyTable));
    const row = doc.querySelector('tbody tr')!;
    expect(row.querySelector('th')).toBeNull();
    const cells = row.querySelectorAll('td');
    expect(cells).toHaveLength(2);
    expect(cells[0].textContent).toBe('Battery Life');
    expect(cells[0].hasAttribute('itemprop')).toBe(false);
    expect(cells[1].textContent).toBe('Approx. 2 h');
  });
});

describe('cleanHtmlStructure — HowTo flattening', () => {
  it('unwraps a HowTo section, preserving its existing heading verbatim', () => {
    const html = `<section itemscope itemtype="https://schema.org/HowTo">
      <h2 itemprop="name">How to start the robot</h2>
      <p itemprop="description">Intro text.</p>
      <div itemprop="step" itemscope itemtype="https://schema.org/HowToStep">
        <h3 itemprop="name">Step 1</h3>
        <p itemprop="text">Do the thing.</p>
      </div>
    </section>`;
    const doc = parse(cleanHtmlStructure(html));

    expect(doc.querySelector('section')).toBeNull();
    expect(doc.querySelector('[itemscope], [itemtype], [itemprop]')).toBeNull();
    expect(doc.querySelector('h2')!.textContent).toBe('How to start the robot');
    expect(doc.querySelector('h3')!.textContent).toBe('Step 1');
    expect(doc.querySelectorAll('p')[1].textContent).toBe('Do the thing.');
  });
});

describe('cleanHtmlStructure — FAQ flattening', () => {
  const faqSection = `<section itemscope itemtype="https://schema.org/FAQPage">
    <div itemprop="mainEntity" itemscope itemtype="https://schema.org/Question">
      <h3 itemprop="name">Does it float?</h3>
      <div itemprop="acceptedAnswer" itemscope itemtype="https://schema.org/Answer">
        <p itemprop="text">No.</p>
      </div>
    </div>
  </section>`;

  it('inserts a "Frequently Asked Questions" heading when none precedes the section', () => {
    const doc = parse(cleanHtmlStructure(`<hr>${faqSection}`));
    expect(doc.querySelector('section')).toBeNull();
    const headings = Array.from(doc.querySelectorAll('h2'));
    expect(headings[0].textContent).toBe('Frequently Asked Questions');
    expect(doc.querySelector('h3')!.textContent).toBe('Does it float?');
    expect(doc.querySelectorAll('p').length).toBeGreaterThan(0);
    expect(doc.querySelector('p')!.textContent).toBe('No.');
  });

  it('does not insert a duplicate heading when one already precedes the section', () => {
    const doc = parse(cleanHtmlStructure(`<h2>FAQ</h2>${faqSection}`));
    const headings = Array.from(doc.querySelectorAll('h2'));
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe('FAQ');
  });

  it('leaves no Schema.org attributes anywhere after flattening', () => {
    const doc = parse(cleanHtmlStructure(faqSection));
    expect(doc.querySelector('[itemscope], [itemtype], [itemprop]')).toBeNull();
  });
});

describe('cleanHtmlStructure — image figure wrapping', () => {
  it('wraps a bare <img> in a <figure> without inventing a <figcaption>', () => {
    const doc = parse(cleanHtmlStructure(`<p>Lead-in.</p><img src="a.jpg" alt="A">`));
    const figure = doc.querySelector('figure')!;
    expect(figure).not.toBeNull();
    expect(figure.querySelector('figcaption')).toBeNull();
    expect(figure.getAttribute('style')).toBe('display: block; width: fit-content; max-width: 100%; margin: 4px auto;');
    const img = figure.querySelector('img')!;
    expect(img.getAttribute('decoding')).toBe('async');
  });
});

describe('cleanHtmlStructure — idempotency', () => {
  it('produces the same output when run twice', () => {
    const html = `<div itemscope itemtype="https://schema.org/Product">
      <div class="table-responsive"><table class="table"><thead><tr><th scope="col">A</th></tr></thead>
      <tbody><tr><th scope="row">Row</th><td>Val</td></tr></tbody></table></div>
      <img src="a.jpg" alt="A"></div>`;
    const once = cleanHtmlStructure(html);
    const twice = cleanHtmlStructure(once);
    expect(twice).toBe(once);
  });
});

describe('stripTiptapArtifacts', () => {
  it('removes a trailing empty <p> left by StarterKit\'s TrailingNode extension', () => {
    const html = `<p>Real content</p><p></p>`;
    const doc = parse(stripTiptapArtifacts(html));
    expect(doc.body.children.length).toBe(1);
    expect(doc.body.lastElementChild?.textContent).toBe('Real content');
  });

  it('leaves already-clean HTML untouched', () => {
    const html = `<div class="table-responsive"><table><tbody><tr><td>A</td></tr></tbody></table></div><figure><img src="a.jpg" alt="A"><figcaption>Cap</figcaption></figure>`;
    expect(stripTiptapArtifacts(html)).toBe(html);
  });

  it('is idempotent', () => {
    const html = `<p>Real content</p><p></p>`;
    const once = stripTiptapArtifacts(html);
    const twice = stripTiptapArtifacts(once);
    expect(twice).toBe(once);
  });
});

describe('sanitizeUntrustedHtml', () => {
  it('strips inline event-handler attributes', () => {
    const html = `<p onclick="alert(1)">Text</p>`;
    const doc = parse(sanitizeUntrustedHtml(html));
    expect(doc.querySelector('p')?.hasAttribute('onclick')).toBe(false);
    expect(doc.querySelector('p')?.textContent).toBe('Text');
  });

  it('strips javascript: URLs from href', () => {
    const html = `<a href="javascript:alert(1)">Link</a>`;
    const doc = parse(sanitizeUntrustedHtml(html));
    expect(doc.querySelector('a')?.hasAttribute('href')).toBe(false);
  });

  it('strips data: URLs from src', () => {
    const html = `<img src="data:text/html,<script>alert(1)</script>" alt="A">`;
    const doc = parse(sanitizeUntrustedHtml(html));
    expect(doc.querySelector('img')?.hasAttribute('src')).toBe(false);
  });

  it('removes <script> and <style> tags entirely', () => {
    const html = `<p>Text</p><script>alert(1)</script><style>p{color:red}</style>`;
    const doc = parse(sanitizeUntrustedHtml(html));
    expect(doc.querySelector('script')).toBeNull();
    expect(doc.querySelector('style')).toBeNull();
  });

  it('leaves safe hrefs/srcs and normal attributes untouched', () => {
    const html = `<a href="https://example.com" class="link">Link</a><img src="/img/a.jpg" alt="A">`;
    expect(sanitizeUntrustedHtml(html)).toBe(html);
  });
});

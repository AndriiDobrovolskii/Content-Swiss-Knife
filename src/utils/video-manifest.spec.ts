/**
 * video-manifest.spec.ts
 *
 * The regression guard for the reported bug: a YouTube iframe in the source description
 * disappeared from the generated output whenever images were also uploaded.
 *
 * The fixture is the real embed from the EXPERT3D XGRIDS L2 Pro run (2026-07-29).
 */

import { describe, it, expect } from 'vitest';
import {
  extractVideoEmbeds,
  restoreMissingVideos,
  validateVideoCoverage,
  videoKey,
} from './video-manifest';
import { wrapVideoFigures } from './video-figure';

const PRODUCT = 'Lixel L2 Pro';
const SRC = 'https://www.youtube.com/embed/Bw2xL_gL7zc';

/** The iframe exactly as it appeared in the reported input description. */
const SOURCE_IFRAME =
  `<iframe width="1337" height="752" src="${SRC}" `
  + `title="Lixel L2 Pro: The Harness System for Hands-Free 3D Scanning" frameborder="0" `
  + `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" `
  + `referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;

/** A description shaped like the real input: Markdown prose with an inline iframe. */
const SOURCE_DESCRIPTION = `# Lixel L2 Pro - Product Description

**Precision Redefined**

The Lixel L2 Pro fuses LiDAR, visual sensors, and IMU with AI.

${SOURCE_IFRAME}

## Fully integrated and deeply optimized`;

/** Generated HTML shaped like the real artifact: figures in the body, §7 in section.specs. */
const GENERATED_HTML = `<p>Вступ.</p>
<h2>Функціональність</h2>
<p>Опис.</p>
<figure><img src="https://cdn/x.jpg" alt="a"><figcaption>Підпис</figcaption></figure>
<section class="specs"><h2>Технічні характеристики</h2><table><tr><td>Вага</td><td>1,7 кг</td></tr></table></section>`;

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');

describe('videoKey', () => {
  it('treats an embed and its rel=0 form as the same video', () => {
    // ensureRel0 rewrites the src downstream. Comparing URLs would make a restored embed look
    // missing on the next pass and splice a duplicate.
    expect(videoKey(SRC)).toBe(videoKey(`${SRC}?rel=0`));
  });

  it('identifies the same video across youtu.be, /embed/ and watch?v= forms', () => {
    expect(videoKey('https://youtu.be/Bw2xL_gL7zc')).toBe(videoKey(SRC));
    expect(videoKey('https://www.youtube.com/watch?v=Bw2xL_gL7zc')).toBe(videoKey(SRC));
  });

  it('separates different videos, and vimeo from youtube', () => {
    expect(videoKey(SRC)).not.toBe(videoKey('https://www.youtube.com/embed/OTHER-id'));
    expect(videoKey('https://player.vimeo.com/video/12345'))
      .not.toBe(videoKey('https://player.vimeo.com/video/54321'));
  });

  it('does not collapse two unrecognised hosts onto one key', () => {
    expect(videoKey('https://example.com/a')).not.toBe(videoKey('https://example.com/b'));
  });
});

describe('extractVideoEmbeds', () => {
  it('finds the iframe inside Markdown-ish prose', () => {
    const embeds = extractVideoEmbeds(SOURCE_DESCRIPTION);
    expect(embeds).toHaveLength(1);
    expect(embeds[0].src).toBe(SRC);
    expect(embeds[0].title).toContain('Harness System');
  });

  it('deduplicates the same video appearing twice', () => {
    expect(extractVideoEmbeds(`${SOURCE_IFRAME}\n\n${SOURCE_IFRAME}`)).toHaveLength(1);
  });

  it('ignores a non-video iframe', () => {
    expect(extractVideoEmbeds('<iframe src="https://maps.google.com/maps?q=x"></iframe>')).toEqual([]);
  });

  it('returns nothing for prose with no embed, or empty input', () => {
    expect(extractVideoEmbeds('Just a description with no video.')).toEqual([]);
    expect(extractVideoEmbeds('')).toEqual([]);
  });
});

describe('restoreMissingVideos', () => {
  const embeds = extractVideoEmbeds(SOURCE_DESCRIPTION);

  it('is a no-op when the model already emitted the embed — the common path', () => {
    const html = `<p>Лід.</p><iframe src="${SRC}"></iframe>${GENERATED_HTML}`;
    const result = restoreMissingVideos(html, embeds, PRODUCT, 'uk-UA');
    expect(result.restored).toEqual([]);
    expect(result.html).toBe(html);
  });

  it('is a no-op when the emitted embed already carries rel=0', () => {
    const html = `<iframe src="${SRC}?rel=0"></iframe>${GENERATED_HTML}`;
    expect(restoreMissingVideos(html, embeds, PRODUCT, 'uk-UA').restored).toEqual([]);
  });

  it('restores a dropped embed before section.specs, with a lead-in <p>', () => {
    // The reported failure, reproduced: images shipped, iframe did not.
    expect(GENERATED_HTML).not.toContain('iframe');

    const { html, restored } = restoreMissingVideos(GENERATED_HTML, embeds, PRODUCT, 'uk-UA');
    expect(restored).toHaveLength(1);

    const doc = parse(html);
    const iframe = doc.querySelector('iframe')!;
    expect(iframe.getAttribute('src')).toBe(SRC); // verbatim; ensureRel0 is wrapVideoFigures' job

    // Positioned ahead of §7, which must stay media-free.
    expect(iframe.compareDocumentPosition(doc.querySelector('section.specs')!))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    // Every figure needs a narrative <p> above it, and it must not restate the figcaption.
    const lead = iframe.previousElementSibling!;
    expect(lead.tagName).toBe('P');
    expect(lead.textContent).toContain(PRODUCT);
    expect(lead.textContent).not.toBe(`Відеоогляд ${PRODUCT}`);
  });

  it('falls back to the last table when there is no section.specs', () => {
    // §2's Killer Specs table is the FIRST table, so the anchor has to be the last one.
    const html = '<p>Лід.</p><table><tr><td>Killer</td></tr></table>'
      + '<h2>Далі</h2><table><tr><td>Специфікації</td></tr></table>';
    const doc = parse(restoreMissingVideos(html, embeds, PRODUCT, 'uk-UA').html);

    const iframe = doc.querySelector('iframe')!;
    const tables = doc.querySelectorAll('table');
    expect(iframe.compareDocumentPosition(tables[0])).toBe(Node.DOCUMENT_POSITION_PRECEDING);
    expect(iframe.compareDocumentPosition(tables[1])).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('appends at the end when there is no anchor at all', () => {
    const doc = parse(restoreMissingVideos('<p>Тільки текст.</p>', embeds, PRODUCT, 'uk-UA').html);
    expect(doc.querySelector('iframe')).not.toBeNull();
    expect(doc.body.lastElementChild!.tagName).toBe('IFRAME');
  });

  it('produces exactly one <figure> with one <figcaption> after wrapVideoFigures', () => {
    // wrapVideoFigures is documented as NOT idempotent — a double-wrap nests a second <figure>
    // and duplicates the caption. Restoration must hand it a bare iframe, never a finished figure.
    const restoredHtml = restoreMissingVideos(GENERATED_HTML, embeds, PRODUCT, 'uk-UA').html;
    const doc = parse(wrapVideoFigures(restoredHtml, PRODUCT, 'uk-UA'));

    const videoFigures = Array.from(doc.querySelectorAll('figure')).filter(f => f.querySelector('iframe'));
    expect(videoFigures).toHaveLength(1);
    expect(videoFigures[0].querySelectorAll('figcaption')).toHaveLength(1);
    expect(videoFigures[0].querySelector('figure')).toBeNull(); // no nesting
    expect(videoFigures[0].querySelector('figcaption')!.textContent).toBe(`Відеоогляд ${PRODUCT}`);
    // …and the restored iframe went through the normal attribute contract.
    expect(doc.querySelector('iframe')!.getAttribute('src')).toContain('rel=0');
    expect(doc.querySelector('iframe')!.getAttribute('loading')).toBe('lazy');
  });

  it('does not carry the source-language title onto the repaired iframe', () => {
    // The fixture embed carries an English YouTube title. Restoration is the one path with no
    // model in the loop, so copying that title through would nail an English accessible name
    // onto a uk-UA artifact. Leaving it off lets wrapVideoFigures supply the uk fallback.
    const sourceTitle = 'Lixel L2 Pro: The Harness System for Hands-Free 3D Scanning';
    expect(embeds[0].title).toBe(sourceTitle); // guard: the fixture really does carry one

    const bare = parse(restoreMissingVideos(GENERATED_HTML, embeds, PRODUCT, 'uk-UA').html);
    expect(bare.querySelector('iframe')!.hasAttribute('title')).toBe(false);

    const wrapped = restoreMissingVideos(GENERATED_HTML, embeds, PRODUCT, 'uk-UA').html;
    const iframe = parse(wrapVideoFigures(wrapped, PRODUCT, 'uk-UA')).querySelector('iframe')!;
    expect(iframe.getAttribute('title')).toBe(`Відео: ${PRODUCT}`);
    expect(iframe.getAttribute('title')).not.toBe(sourceTitle);
  });

  it('does not disturb the image figures already in the document', () => {
    const { html } = restoreMissingVideos(GENERATED_HTML, embeds, PRODUCT, 'uk-UA');
    const doc = parse(html);
    expect(doc.querySelectorAll('img')).toHaveLength(1);
    expect(doc.querySelector('img')!.getAttribute('src')).toBe('https://cdn/x.jpg');
    expect(doc.querySelector('section.specs table')).not.toBeNull();
  });

  it('is a no-op when the source had no video', () => {
    expect(restoreMissingVideos(GENERATED_HTML, [], PRODUCT, 'uk-UA'))
      .toEqual({ html: GENERATED_HTML, restored: [] });
  });

  it('is idempotent — a second pass restores nothing', () => {
    const once = restoreMissingVideos(GENERATED_HTML, embeds, PRODUCT, 'uk-UA').html;
    expect(restoreMissingVideos(once, embeds, PRODUCT, 'uk-UA').restored).toEqual([]);
  });
});

describe('validateVideoCoverage', () => {
  const embeds = extractVideoEmbeds(SOURCE_DESCRIPTION);

  it('reports an error when a source embed is missing', () => {
    const issues = validateVideoCoverage(GENERATED_HTML, embeds, 'HTML (uk-UA)');
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('video-embed-missing');
    expect(issues[0].severity).toBe('error');
    expect(issues[0].detail).toContain(SRC);
    expect(issues[0].path).toBeUndefined(); // resolves to full-regen, not a block patch
  });

  it('is silent once the embed is present, in either src form', () => {
    expect(validateVideoCoverage(`<iframe src="${SRC}"></iframe>`, embeds, 'x')).toEqual([]);
    expect(validateVideoCoverage(`<iframe src="${SRC}?rel=0"></iframe>`, embeds, 'x')).toEqual([]);
  });

  it('is silent after restoration — the net should never fire in practice', () => {
    const { html } = restoreMissingVideos(GENERATED_HTML, embeds, PRODUCT, 'uk-UA');
    expect(validateVideoCoverage(html, embeds, 'HTML (uk-UA)')).toEqual([]);
  });

  it('is silent when the source had no video at all', () => {
    expect(validateVideoCoverage(GENERATED_HTML, [], 'x')).toEqual([]);
  });
});

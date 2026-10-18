/**
 * video-manifest.deixis.spec.ts - US-9.1 T5 (FR-15, AC-4): the detector agrees that every restored-embed
 * lead-in template is free of picture references.
 *
 * "Each rendered template returns `findImageDeixis(...) === null`" (task breakdown T5, Covers). It depends on
 * T2 (`image-deixis.ts`), which is why it is its own file: RED BY LOAD until T2 exists, while the AC-4 word
 * checks in `video-manifest.pointer-free.spec.ts` are red only until T5 rewrites the templates.
 */
import { describe, it, expect } from 'vitest';
import { extractVideoEmbeds, restoreMissingVideos } from './video-manifest';
import { findImageDeixis } from './image-deixis';

const PRODUCT = 'Ortur Laser Master 3';
const EMBEDS = extractVideoEmbeds('<iframe src="https://www.youtube.com/embed/abc123XYZ" title="Overview"></iframe>');
const HTML = '<p>Intro paragraph.</p><section class="specs"><table><tr><td>1</td></tr></table></section>';

const BASE_LANGUAGES: Array<[string, string]> = [
  ['uk', 'uk-UA'], ['ru', 'ru-UA'], ['en', 'en-GB'], ['pl', 'pl-PL'], ['de', 'de-DE'], ['es', 'es-ES'], ['pt', 'pt-PT'],
];

function restoredLeadIn(locale: string): string {
  const { html } = restoreMissingVideos(HTML, EMBEDS, PRODUCT, locale);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.querySelector('iframe')!.previousElementSibling!.textContent ?? '';
}

describe('FR-15 / AC-4: findImageDeixis finds no picture reference in any restored-embed lead-in', () => {
  it.each(BASE_LANGUAGES)('%s (%s): findImageDeixis(rendered template, locale) is null', (_lang, locale) => {
    const text = restoredLeadIn(locale);
    expect(text).toContain(PRODUCT);
    expect(findImageDeixis(text, locale), `the detector matched: "${text}"`).toBeNull();
  });

  it('the English fallback used for an unknown language is also null under the English detector', () => {
    const text = restoredLeadIn('ja-JP');
    expect(findImageDeixis(text, 'en-GB')).toBeNull();
  });
});

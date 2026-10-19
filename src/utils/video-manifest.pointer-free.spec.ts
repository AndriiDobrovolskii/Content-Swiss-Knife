/**
 * video-manifest.pointer-free.spec.ts - US-9.1 T5 (FR-15, AC-4) and T6 (FR-13 video half).
 *
 * T5: no entry of `LEAD_IN_TEMPLATES` (the lead-in `<p>` that code inserts above a RESTORED video embed)
 * contains a spatial pointer, in any of the seven base languages. The templates are private, so they are
 * observed through the public `restoreMissingVideos`, which renders the template for a locale into the
 * paragraph directly above the re-inserted iframe. AC-4's words, case-insensitively: «нижче», «below»,
 * «ниже», «poniżej», «unten», «abaixo», «siguiente».
 *
 * T6: the `video-embed-missing` detail (the text the repair cycle feeds back to the model) stops asking for
 * an introducing lead-in and asks for a body paragraph, a product fact that does not point at the video.
 *
 * WORDING LATITUDE (H-OD13, open). The Appendix E sentences and the exact new message prose beyond the
 * Specification's literals are the builder's within the owner's pending answer; this spec asserts ONLY the
 * AC-4 words and the Specification FR-13 / FR-15 literals, so any pointer-free wording passes. The detector
 * check (`findImageDeixis(...) === null` for each rendered template) needs T2 and lives in
 * `video-manifest.deixis.spec.ts` so this file does not turn red-by-load on a module T5 only depends on.
 *
 * T5's template assertions are RED until the templates are rewritten; the unknown-language fallback and the
 * product-name assertions are guards that hold before and after.
 */
import { describe, it, expect } from 'vitest';
import {
  extractVideoEmbeds, restoreMissingVideos, validateVideoCoverage, validateVideoCoverageDoc,
} from './video-manifest';

const PRODUCT = 'Ortur Laser Master 3';
const EMBED_SRC = 'https://www.youtube.com/embed/abc123XYZ';
const EMBEDS = extractVideoEmbeds(`<iframe src="${EMBED_SRC}" title="Overview"></iframe>`);
const HTML_WITHOUT_VIDEO = '<p>Intro paragraph.</p><section class="specs"><table><tr><td>1</td></tr></table></section>';

/** AC-4 / FR-15 words, lower case; the check lower-cases the rendered text. */
const POINTER_WORDS = ['нижче', 'below', 'ниже', 'poniżej', 'unten', 'abaixo', 'siguiente'];

/** The seven base languages of FR-15, each with a locale the store registry uses for it. */
const BASE_LANGUAGES: Array<[string, string]> = [
  ['uk', 'uk-UA'], ['ru', 'ru-UA'], ['en', 'en-GB'], ['pl', 'pl-PL'], ['de', 'de-DE'], ['es', 'es-ES'], ['pt', 'pt-PT'],
];

/** The text of the paragraph that code inserted directly above the restored iframe. */
function restoredLeadIn(locale?: string): string {
  const { html, restored } = restoreMissingVideos(HTML_WITHOUT_VIDEO, EMBEDS, PRODUCT, locale);
  expect(restored, 'the embed was not restored').toHaveLength(1);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const iframe = doc.querySelector('iframe');
  expect(iframe, 'no iframe was inserted').not.toBeNull();
  const lead = iframe!.previousElementSibling;
  expect(lead?.tagName, 'no <p> directly above the restored iframe').toBe('P');
  return lead!.textContent ?? '';
}

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();

describe('FR-15 / AC-4: the restored-embed lead-in contains no spatial pointer', () => {
  it.each(BASE_LANGUAGES)('%s (%s): none of the AC-4 words appears, case-insensitively', (_lang, locale) => {
    const text = restoredLeadIn(locale).toLowerCase();
    const found = POINTER_WORDS.filter(w => text.includes(w));
    expect(found, `pointer word(s) in the rendered template: "${restoredLeadIn(locale)}"`).toEqual([]);
  });

  it.each(BASE_LANGUAGES)('%s (%s): the rendered sentence still names the product', (_lang, locale) => {
    expect(restoredLeadIn(locale)).toContain(PRODUCT);
  });

  it('the restored lead-in <p> is still inserted directly above the iframe (the <p> + iframe contract of AGENTS.md section 4)', () => {
    const { html } = restoreMissingVideos(HTML_WITHOUT_VIDEO, EMBEDS, PRODUCT, 'uk-UA');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelectorAll('iframe')).toHaveLength(1);
    expect(doc.querySelector('iframe')!.previousElementSibling?.tagName).toBe('P');
    expect(doc.querySelector('iframe')!.getAttribute('src')).toBe(EMBED_SRC);
  });

  it.each(['en-ES', 'en-US', 'es-MX', 'UK-ua', 'PL', 'de'])('looks the template up by the lower-cased primary subtag (%s) and stays pointer-free', locale => {
    const text = restoredLeadIn(locale).toLowerCase();
    expect(text).toContain(PRODUCT.toLowerCase());
    expect(POINTER_WORDS.filter(w => text.includes(w))).toEqual([]);
  });

  it.each(['ja-JP', 'xx', ''])('an unknown language (%j) falls back to the English template, which is also pointer-free', locale => {
    const text = restoredLeadIn(locale);
    expect(text).toBe(restoredLeadIn('en-GB'));
    expect(POINTER_WORDS.filter(w => text.toLowerCase().includes(w))).toEqual([]);
  });

  it('an omitted locale also falls back to the English template', () => {
    expect(restoredLeadIn(undefined)).toBe(restoredLeadIn('en-GB'));
  });
});

describe('FR-13 (video half): the video-embed-missing detail asks for a body paragraph, not a lead-in', () => {
  const issue = () => validateVideoCoverage(HTML_WITHOUT_VIDEO, EMBEDS, 'HTML (uk-UA)')[0];
  const detail = () => collapse(issue().detail);

  it('keeps the rule id, the error severity, the context and no path (a document-level finding)', () => {
    expect(validateVideoCoverage(HTML_WITHOUT_VIDEO, EMBEDS, 'HTML (uk-UA)')).toHaveLength(1);
    expect(issue().rule).toBe('video-embed-missing');
    expect(issue().severity).toBe('error');
    expect(issue().context).toBe('HTML (uk-UA)');
    expect(issue().path).toBeUndefined();
    expect(issue().detail).toContain(EMBED_SRC);
  });

  it('Assert absent: "introduced by its own lead-in <p>"', () => {
    expect(detail()).not.toContain('introduced by its own lead-in <p>');
  });

  it('Assert present: "placed after a body paragraph of its sub-section (no pointer to the video)"', () => {
    expect(detail()).toContain('placed after a body paragraph of its sub-section (no pointer to the video)');
  });

  it('keeps the "src copied VERBATIM" clause and the "§3 FUNCTIONALITY — before §7 Technical Specifications" placement', () => {
    expect(detail()).toContain('src copied VERBATIM');
    expect(detail()).toContain('§3 FUNCTIONALITY — before §7 Technical Specifications');
  });

  it('the Doc sibling validateVideoCoverageDoc is not part of this change: it still names doc.videos and carries no FR-13 wording', () => {
    const doc = validateVideoCoverageDoc([], EMBEDS, 'Doc (uk-UA)')[0];
    expect(doc.rule).toBe('video-embed-missing');
    expect(collapse(doc.detail)).toContain('doc.videos');
    expect(collapse(doc.detail)).not.toContain('placed after a body paragraph of its sub-section');
  });

  it('is still silent when the video is present or the source has none (no regression of the net)', () => {
    const withVideo = `${HTML_WITHOUT_VIDEO}<iframe src="${EMBED_SRC}?rel=0"></iframe>`;
    expect(validateVideoCoverage(withVideo, EMBEDS, 'HTML (uk-UA)')).toEqual([]);
    expect(validateVideoCoverage(HTML_WITHOUT_VIDEO, [], 'HTML (uk-UA)')).toEqual([]);
  });
});

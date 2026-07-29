/**
 * video-figure.ts
 *
 * Deterministic post-step for the generation path: wraps generated
 * YouTube/Vimeo `<iframe>` embeds in a <figure> with a templated, LOCALIZED
 * <figcaption> (see FIGCAPTION_TEMPLATES). Runs after Task A fence-strip in
 * ContentOrchestratorService.generate(), before the master HTML is stored and
 * handed to Task B/C.
 *
 * Why code, not a prompt rule: iframe attributes (src, allow, referrerpolicy…)
 * are fragile; an LLM rewriting them risks broken embeds. Here `src` is
 * preserved byte-for-byte (only `rel=0` is ensured) and the attribute set is
 * normalized deterministically. The `[VIDEO]` rule keeps emitting the verbatim
 * source iframe with a lead-in <p>; that lead-in is a separate sibling and is
 * left untouched.
 *
 */

import { ensureRel0 } from './video-url';

/** Canonical attribute set every video iframe must end up with. */
const IFRAME_STYLE = 'width: 100%; height: 100%; border: 0;';
const ALLOW_VALUE =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
const REFERRERPOLICY_VALUE = 'strict-origin-when-cross-origin';

const FIGURE_STYLE = 'width: 100%; max-width: 1140px; margin: 0 auto 20px; aspect-ratio: 16 / 9;';
const FIGCAPTION_STYLE = 'text-align: center; font-size: 14px; color: #666; margin-top: 10px;';

/**
 * Figcaption template per language, keyed by the BCP47 PRIMARY SUBTAG.
 *
 * This caption used to be hardcoded English and was emitted into the uk-UA master, which two
 * places in the repo already recorded as a defect: description-doc.ts notes that real artifacts
 * carry the target-language form ("Відеоогляд …"), and test/render-reconciliation.report.md logs
 * the same divergence between the renderer and this file.
 *
 * Keyed on the primary subtag, not the full locale, so en-GB/en-US/en-ES and es-ES/es-MX each
 * resolve without enumerating every region. An unmapped language falls back to English — the
 * previous behaviour exactly, so no locale can regress into a missing caption.
 *
 * Every form places the product name last and uninflected: product names are Latin brand strings
 * that stay nominative, which keeps the templates grammatical without case handling.
 */
const FIGCAPTION_TEMPLATES: Readonly<Record<string, (product: string) => string>> = {
  en: p => `Video review of ${p}`,
  uk: p => `Відеоогляд ${p}`,
  ru: p => `Видеообзор ${p}`,
  pl: p => `Recenzja wideo ${p}`,
  de: p => `Video-Review zu ${p}`,
  es: p => `Vídeo-reseña de ${p}`,
  pt: p => `Análise em vídeo de ${p}`,
};

/** The figcaption text for one product in one locale. Exported for the spec. */
export function videoFigcaption(productName: string, locale?: string): string {
  const lang = (locale ?? '').toLowerCase().split('-')[0];
  return (FIGCAPTION_TEMPLATES[lang] ?? FIGCAPTION_TEMPLATES['en'])(productName);
}

/**
 * Is this iframe a YouTube/Vimeo video embed (as opposed to a map or a widget)?
 *
 * Exported so video-manifest.ts recognises exactly the same set of embeds this wrapper does. A
 * second copy of the host list is how "the extractor found it but the wrapper ignored it" starts.
 */
export function isVideoSrc(src: string): boolean {
  return src.includes('youtube.com') || src.includes('youtu.be') || src.includes('vimeo.com');
}

/**
 * Wrap every YouTube/Vimeo iframe in `html` into the corrected figure structure.
 * Non-video iframes and iframe-free HTML are returned untouched.
 *
 * @param locale BCP47 for the figcaption language; omitted falls back to English.
 */
export function wrapVideoFigures(html: string, productName: string, locale?: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  doc.querySelectorAll('iframe').forEach(iframe => {
    const src = iframe.getAttribute('src') || '';
    if (!isVideoSrc(src)) return; // leave maps / other iframes alone

    // 1. src — preserve verbatim, ensure rel=0.
    iframe.setAttribute('src', ensureRel0(src));

    // 2. Normalize attributes: preserve existing title, purge the rest, then
    //    set the canonical set.
    const existingTitle = iframe.getAttribute('title');
    Array.from(iframe.attributes)
      .map(a => a.name)
      .filter(name => name !== 'src')
      .forEach(name => iframe.removeAttribute(name));

    iframe.setAttribute('style', IFRAME_STYLE);
    iframe.setAttribute('title', existingTitle && existingTitle.trim() ? existingTitle : `${productName} video`);
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('allow', ALLOW_VALUE);
    iframe.setAttribute('referrerpolicy', REFERRERPOLICY_VALUE);
    iframe.setAttribute('allowfullscreen', '');

    // 3. Build figure(aspect-ratio) > iframe + figcaption.
    const figure = doc.createElement('figure');
    figure.setAttribute('style', FIGURE_STYLE);

    const figcaption = doc.createElement('figcaption');
    figcaption.setAttribute('style', FIGCAPTION_STYLE);
    figcaption.textContent = videoFigcaption(productName, locale);

    // 4. Splice into the DOM. If the iframe sits directly inside a <p>, replace
    //    that <p> with the <figure> (a <figure> inside <p> is invalid HTML).
    //    The separate lead-in <p> sibling that precedes it is untouched.
    const parent = iframe.parentElement;
    if (parent && parent.tagName === 'P') {
      parent.replaceWith(figure);
    } else {
      iframe.replaceWith(figure);
    }
    figure.appendChild(iframe);
    figure.appendChild(figcaption);
  });

  return doc.body.innerHTML;
}

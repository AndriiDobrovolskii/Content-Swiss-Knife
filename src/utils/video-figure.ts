/**
 * video-figure.ts
 *
 * Deterministic post-step for the generation path: wraps generated
 * YouTube/Vimeo `<iframe>` embeds in a <figure> with a templated <figcaption>
 * ("Video review of {productName}"). Runs after Task A fence-strip in
 * ContentOrchestratorService.generate(), before the English HTML is stored and
 * handed to Task B/C.
 *
 * Why code, not a prompt rule: iframe attributes (src, allow, referrerpolicy…)
 * are fragile; an LLM rewriting them risks broken embeds. Here `src` is
 * preserved byte-for-byte (only `rel=0` is ensured) and the attribute set is
 * normalized deterministically. The `[VIDEO]` rule keeps emitting the verbatim
 * source iframe with a lead-in <p>; that lead-in is a separate sibling and is
 * left untouched.
 *
 * The rel=0 / URL handling mirrors html-cleaner.ts section 6 (ported, not
 * imported, to keep this PR contained — a shared normalizeVideoIframe() is
 * tracked follow-up debt).
 */

/** Canonical attribute set every video iframe must end up with. */
const IFRAME_STYLE = 'width: 100%; height: 100%; border: 0;';
const ALLOW_VALUE =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
const REFERRERPOLICY_VALUE = 'strict-origin-when-cross-origin';

const FIGURE_STYLE = 'width: 100%; max-width: 1140px; margin: 0 auto 20px;';
const ASPECT_DIV_STYLE = 'aspect-ratio: 16 / 9;';
const FIGCAPTION_STYLE = 'text-align: center; font-size: 14px; color: #666; margin-top: 10px;';

function isVideoSrc(src: string): boolean {
  return src.includes('youtube.com') || src.includes('youtu.be') || src.includes('vimeo.com');
}

/** Ensure `rel=0` on the iframe src, preserving the URL otherwise (html-cleaner §6 logic). */
function ensureRel0(src: string): string {
  try {
    const isProtocolRelative = src.startsWith('//');
    if (src.startsWith('http') || isProtocolRelative) {
      const urlObj = new URL(isProtocolRelative ? 'https:' + src : src);
      if (urlObj.searchParams.get('rel') !== '0') {
        urlObj.searchParams.set('rel', '0');
        return isProtocolRelative ? urlObj.toString().replace(/^https:/, '') : urlObj.toString();
      }
      return src;
    }
    // Relative path / other — string fallback.
    if (!src.includes('rel=0')) {
      const separator = src.includes('?') ? '&' : '?';
      return `${src}${separator}rel=0`;
    }
    return src;
  } catch {
    if (!src.includes('rel=0')) {
      const separator = src.includes('?') ? '&' : '?';
      return `${src}${separator}rel=0`;
    }
    return src;
  }
}

/**
 * Wrap every YouTube/Vimeo iframe in `html` into the corrected figure structure.
 * Non-video iframes and iframe-free HTML are returned untouched.
 */
export function wrapVideoFigures(html: string, productName: string): string {
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

    // 3. Build figure > div(aspect-ratio) > iframe, + figcaption below the box.
    const figure = doc.createElement('figure');
    figure.setAttribute('style', FIGURE_STYLE);

    const aspectDiv = doc.createElement('div');
    aspectDiv.setAttribute('style', ASPECT_DIV_STYLE);

    const figcaption = doc.createElement('figcaption');
    figcaption.setAttribute('style', FIGCAPTION_STYLE);
    figcaption.textContent = `Video review of ${productName}`;

    // 4. Splice into the DOM. If the iframe sits directly inside a <p>, replace
    //    that <p> with the <figure> (a <figure> inside <p> is invalid HTML).
    //    The separate lead-in <p> sibling that precedes it is untouched.
    const parent = iframe.parentElement;
    if (parent && parent.tagName === 'P') {
      parent.replaceWith(figure);
    } else {
      iframe.replaceWith(figure);
    }
    aspectDiv.appendChild(iframe);
    figure.appendChild(aspectDiv);
    figure.appendChild(figcaption);
  });

  return doc.body.innerHTML;
}

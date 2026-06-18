/**
 * image-figure.ts
 *
 * Deterministic post-step for the generation path: wraps every generated
 * product `<img>` in a <figure> with a <figcaption>, normalizing the fragile,
 * non-semantic scaffolding (exact inline styles, `decoding="async"`, and the
 * first-eager / rest-lazy loading rule). Runs after Task A fence-strip (and on
 * each Task C translation) in ContentOrchestratorService.generate().
 *
 * Why code, not a prompt rule: the figure structure carries a lot of fixed,
 * easy-to-get-wrong detail (inline styles, decoding, which image stays eager for
 * LCP, "no <figure> inside <p>"). An LLM rewriting that per image drifts. Here
 * the LLM authors only what it alone can — `src`, `alt`, and the semantic
 * <figcaption> text (with its <b> lead-in) — and this step guarantees the rest
 * byte-for-byte. Mirrors the same split used by video-figure.ts.
 */

/** Canonical inline styles every image figure must end up with (from the spec example). */
const FIGURE_STYLE = 'display: block; width: max-content; max-width: 100%; margin: 4px auto;';
const IMG_STYLE = 'max-width: 100%; height: auto; display: block;';
const FIGCAPTION_STYLE = 'text-align: left;';

/**
 * Wrap every `<img>` in `html` into the canonical figure structure.
 * The first image in document order stays eager (LCP); the rest get
 * `loading="lazy"`. HTML with no images is returned untouched. Idempotent —
 * re-running on already-wrapped HTML re-asserts the same structure.
 */
export function wrapImageFigures(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const imgs = Array.from(doc.querySelectorAll('img'));

  imgs.forEach((img, index) => {
    // 1. Normalize the <img> itself.
    img.setAttribute('style', IMG_STYLE);
    img.setAttribute('decoding', 'async');
    if (index === 0) {
      img.removeAttribute('loading'); // first image = LCP, loads eagerly
    } else {
      img.setAttribute('loading', 'lazy');
    }

    // 2. Ensure a <figure> wrapper. Reuse one the LLM already emitted; otherwise
    //    create it and pull a trailing <figcaption> sibling (if any) inside.
    let figure: Element;
    const parent = img.parentElement;
    if (parent && parent.tagName === 'FIGURE') {
      figure = parent;
    } else {
      figure = doc.createElement('figure');
      img.replaceWith(figure);
      figure.appendChild(img);
      const next = figure.nextElementSibling;
      if (next && next.tagName === 'FIGCAPTION') {
        figure.appendChild(next);
      }
    }
    figure.setAttribute('style', FIGURE_STYLE);

    // 3. Normalize an existing figcaption's style — preserve its inner HTML
    //    (the LLM-authored <b> lead-in) verbatim.
    const figcaption = figure.querySelector(':scope > figcaption');
    if (figcaption) {
      figcaption.setAttribute('style', FIGCAPTION_STYLE);
    }

    // 4. A <figure> is invalid inside a <p>; if the LLM nested it, hoist it out.
    //    A separate lead-in <p> sibling preceding the figure is left untouched.
    const figParent = figure.parentElement;
    if (figParent && figParent.tagName === 'P') {
      figParent.replaceWith(figure);
    }
  });

  return doc.body.innerHTML;
}

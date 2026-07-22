/**
 * video-embed-figure-node.ts
 *
 * Tier-1 fidelity node for the generator pipeline's canonical video-embed
 * structure (see video-figure.ts): a <figure> wrapping a YouTube/Vimeo
 * <iframe> and a <figcaption>. Modeled as one atomic node (unlike
 * imageFigure) — there is no per-app requirement to hand-edit a video
 * caption's rich text, so it is stored as a plain attribute string and never
 * regenerated on parse, guaranteeing a user's caption edit survives a
 * load->edit->copy round-trip.
 *
 * parseHTML only claims a <figure> containing an <iframe>, so it never
 * collides with imageFigure's <figure>-wrapping-<img>. Attribute values are
 * read from the nested <iframe>/<figcaption> via each attribute's own
 * parseHTML, not from the <figure> element itself.
 *
 * Default attribute values mirror video-figure.ts's constants (copied, not
 * imported — this node is Angular/editor-side and intentionally decoupled
 * from the generation-pipeline util, which takes a productName this
 * component doesn't have).
 */

import { Node } from '@tiptap/core';

const FIGURE_STYLE = 'width: 100%; max-width: 1140px; margin: 0 auto 20px; aspect-ratio: 16 / 9;';
const IFRAME_STYLE = 'width: 100%; height: 100%; border: 0;';
const ALLOW_VALUE =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
const REFERRERPOLICY_VALUE = 'strict-origin-when-cross-origin';

function nestedIframe(element: HTMLElement): HTMLElement | null {
  return element.querySelector(':scope > iframe');
}

export const VideoEmbedFigure = Node.create({
  name: 'videoEmbedFigure',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: null as string | null,
        parseHTML: (element: HTMLElement) => nestedIframe(element)?.getAttribute('src') ?? null,
      },
      title: {
        default: null as string | null,
        parseHTML: (element: HTMLElement) => nestedIframe(element)?.getAttribute('title') ?? null,
      },
      // Preserved verbatim — never regenerated from a template on parse.
      figcaption: {
        default: '',
        parseHTML: (element: HTMLElement) =>
          element.querySelector(':scope > figcaption')?.textContent ?? '',
      },
      style: {
        default: FIGURE_STYLE,
        parseHTML: (element: HTMLElement) => element.getAttribute('style') ?? FIGURE_STYLE,
      },
      iframeStyle: {
        default: IFRAME_STYLE,
        parseHTML: (element: HTMLElement) => nestedIframe(element)?.getAttribute('style') ?? IFRAME_STYLE,
      },
      allow: {
        default: ALLOW_VALUE,
        parseHTML: (element: HTMLElement) => nestedIframe(element)?.getAttribute('allow') ?? ALLOW_VALUE,
      },
      referrerpolicy: {
        default: REFERRERPOLICY_VALUE,
        parseHTML: (element: HTMLElement) =>
          nestedIframe(element)?.getAttribute('referrerpolicy') ?? REFERRERPOLICY_VALUE,
      },
      allowfullscreen: {
        default: true,
        parseHTML: (element: HTMLElement) => nestedIframe(element)?.hasAttribute('allowfullscreen') ?? true,
      },
      loading: {
        default: 'lazy',
        parseHTML: (element: HTMLElement) => nestedIframe(element)?.getAttribute('loading') ?? 'lazy',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        priority: 60,
        getAttrs: (dom: HTMLElement | string) => (dom instanceof HTMLElement && nestedIframe(dom) ? {} : false),
      },
    ];
  },

  renderHTML({ node }) {
    const { src, title, figcaption, style, iframeStyle, allow, referrerpolicy, allowfullscreen, loading } =
      node.attrs as {
        src: string | null;
        title: string | null;
        figcaption: string;
        style: string;
        iframeStyle: string;
        allow: string;
        referrerpolicy: string;
        allowfullscreen: boolean;
        loading: string;
      };

    const iframeAttrs: Record<string, string> = {
      src: src ?? '',
      style: iframeStyle,
      allow,
      referrerpolicy,
      loading,
    };
    if (title) iframeAttrs['title'] = title;
    if (allowfullscreen) iframeAttrs['allowfullscreen'] = '';

    return ['figure', { style }, ['iframe', iframeAttrs], ['figcaption', {}, figcaption]];
  },
});

// Insertion (toolbar "Insert media" button) goes through
// `editor.chain().focus().insertContent({ type: 'videoEmbedFigure', attrs: { src, figcaption } })`
// directly from the component — the component applies `ensureRel0()` (from
// `src/utils/video-url.ts`, reused as-is) to the pasted URL before inserting,
// rather than this node exposing its own custom command, keeping this file
// schema-only.

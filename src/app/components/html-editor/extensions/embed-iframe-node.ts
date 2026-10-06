/**
 * embed-iframe-node.ts  (US-6.1)
 *
 * Atomic block node that preserves a bare (non-figure) <iframe> -- typically a pasted
 * YouTube/Vimeo embed inside nested wrapper <div>s -- with its attributes stored verbatim.
 *
 * It is a `block`-group node so GenericBlock (`content: 'block+'`) accepts it directly and
 * ProseMirror never auto-fills an empty <p></p> in its place. It is NOT a security gate:
 * editor-html-pipeline.ts (filterEmbedIframes) already removed off-list iframes before the
 * schema sees the HTML. Figure-parented iframes stay with videoEmbedFigure.
 */

import { Node } from '@tiptap/core';

const STRING_ATTRS = ['src', 'title', 'allow', 'referrerpolicy', 'loading', 'style', 'width', 'height', 'frameborder'] as const;

export const EmbedIframe = Node.create({
  name: 'embedIframe',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    const attrs: Record<string, unknown> = {};
    for (const name of STRING_ATTRS) {
      attrs[name] = {
        default: null as string | null,
        parseHTML: (element: HTMLElement) => element.getAttribute(name),
        renderHTML: () => ({}),
      };
    }
    attrs['allowfullscreen'] = {
      default: false,
      parseHTML: (element: HTMLElement) => element.hasAttribute('allowfullscreen'),
      renderHTML: () => ({}),
    };
    return attrs;
  },

  parseHTML() {
    return [
      {
        tag: 'iframe',
        getAttrs: (dom: HTMLElement | string) =>
          dom instanceof HTMLElement && dom.parentElement?.tagName === 'FIGURE' ? false : {},
      },
    ];
  },

  renderHTML({ node }) {
    // Built as a real element (not a [tag, attrs] spec) so `style` is written with
    // setAttribute, byte-for-byte. ProseMirror's spec renderer assigns `style` through
    // `dom.style.cssText`, which re-serialises the value (and mangles `border: none` under
    // happy-dom). Verbatim preservation is this node's whole purpose.
    const el = document.createElement('iframe');
    for (const name of STRING_ATTRS) {
      const value = node.attrs[name] as string | null;
      if (value !== null && value !== undefined) el.setAttribute(name, value);
    }
    if (node.attrs['allowfullscreen']) el.setAttribute('allowfullscreen', '');
    return el;
  },
});

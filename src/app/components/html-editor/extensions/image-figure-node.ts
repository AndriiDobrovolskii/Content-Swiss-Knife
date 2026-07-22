/**
 * image-figure-node.ts
 *
 * Tier-1 fidelity node for the generator pipeline's canonical image
 * structure (see CLAUDE.md's "Hard rules for output HTML" + image-figure.ts):
 * a <figure> wrapping an <img> and an optional <figcaption>. Modeled as three
 * node types so the caption stays genuinely editable (cursor/marks/IME) while
 * the image itself stays a non-editable atom — mirrors how CKEditor's own
 * Image+Caption behaved from a user's perspective.
 *
 * parseHTML only claims a <figure> whose first element child is an <img>,
 * so it never collides with videoEmbedFigure's <figure>-wrapping-<iframe>.
 */

import { Node, mergeAttributes } from '@tiptap/core';

const FIGURE_STYLE = 'display: block; width: fit-content; max-width: 100%; margin: 4px auto;';
const IMG_STYLE = 'max-width: 100%; height: auto; display: block;';
const FIGCAPTION_STYLE = 'text-align: left;';

export const FigureImg = Node.create({
  name: 'figureImg',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      style: { default: IMG_STYLE },
      decoding: { default: 'async' },
      // Presence/absence is the eager (first image, LCP) vs. lazy signal —
      // must not be defaulted on parse, only on insert (see component).
      loading: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'img' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)];
  },
});

export const ImageFigcaption = Node.create({
  name: 'figcaption',
  content: 'inline*',

  addAttributes() {
    return {
      style: { default: FIGCAPTION_STYLE },
    };
  },

  parseHTML() {
    return [{ tag: 'figcaption' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['figcaption', mergeAttributes(HTMLAttributes), 0];
  },
});

export const ImageFigure = Node.create({
  name: 'imageFigure',
  group: 'block',
  content: 'figureImg figcaption?',
  isolating: true,

  addAttributes() {
    return {
      style: { default: FIGURE_STYLE },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        priority: 55,
        getAttrs: (dom: HTMLElement | string) =>
          dom instanceof HTMLElement && dom.firstElementChild?.tagName === 'IMG' ? {} : false,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['figure', mergeAttributes(HTMLAttributes), 0];
  },
});

/**
 * global-attributes.ts
 *
 * Belt-and-suspenders layer: guarantees class/style/id (and schema.org
 * microdata on block-level types) survive across every node/mark type in
 * this schema, independent of whether each node's own addAttributes()
 * already listed them individually.
 */

import { Extension } from '@tiptap/core';

export const GlobalAttributes = Extension.create({
  name: 'globalAttributes',

  addGlobalAttributes() {
    return [
      {
        types: [
          'heading',
          'paragraph',
          'blockquote',
          'bulletList',
          'orderedList',
          'listItem',
          'horizontalRule',
        ],
        attributes: {
          class: { default: null },
          style: { default: null },
          id: { default: null },
          // FAQPage/HowTo microdata stamps itemprop directly on leaf elements
          // (e.g. <h3 itemprop="name">, <p itemprop="text">) — not just on
          // their wrapping <div>/<section> (already covered by genericBlock).
          itemprop: { default: null },
        },
      },
      {
        types: ['link'],
        attributes: {
          style: { default: null },
          id: { default: null },
        },
      },
    ];
  },
});

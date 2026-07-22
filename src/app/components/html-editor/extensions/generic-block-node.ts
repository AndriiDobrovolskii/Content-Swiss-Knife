/**
 * generic-block-node.ts
 *
 * Tier-2 passthrough node: the catch-all for <div> and <section> (including
 * schema.org FAQPage/HowTo <section>s and the generator pipeline's
 * `<div class="table-responsive">` table wrapper), preserving tag name and
 * all attributes verbatim. Nothing else in this editor's schema claims
 * these two tags, so this is the only place they can be represented — without
 * it, any bare <div>/<section> the pipeline or a human paste introduces
 * would be silently dropped on parse with no way to reintroduce it.
 *
 * Deliberately NOT restricted to specific classes (e.g. only
 * div.table-responsive) — that would reintroduce the exact data-loss problem
 * this node exists to prevent for every *other* div/section shape.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { MICRODATA_ATTRS } from './attr-helpers';

export const GenericBlock = Node.create({
  name: 'genericBlock',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      // Excluded from rendered HTMLAttributes (`rendered: false`) — used only
      // to pick the output tag name in renderHTML below.
      tagName: { default: 'div', rendered: false },
      class: { default: null as string | null },
      style: { default: null as string | null },
      id: { default: null as string | null },
      ...MICRODATA_ATTRS,
    };
  },

  parseHTML() {
    return [
      { tag: 'div', getAttrs: () => ({ tagName: 'div' }) },
      { tag: 'section', getAttrs: () => ({ tagName: 'section' }) },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [node.attrs['tagName'], mergeAttributes(HTMLAttributes), 0];
  },
});

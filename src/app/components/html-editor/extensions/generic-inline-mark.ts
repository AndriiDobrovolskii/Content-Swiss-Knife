/**
 * generic-inline-mark.ts
 *
 * Tier-2 passthrough mark for <span> (and any other inline wrapper not
 * otherwise modeled by a real mark in this schema). Without this, an
 * LLM- or user-authored `<span style="color:red">` would be silently
 * unwrapped to plain text on the very first parse, with no toolbar action
 * able to reintroduce it — Highlight only claims <mark>, so there is no
 * overlap. Lowest parse priority so real marks match first when applicable.
 */

import { Mark, mergeAttributes } from '@tiptap/core';

export const GenericInlineSpan = Mark.create({
  name: 'genericInlineSpan',

  addAttributes() {
    return {
      class: { default: null as string | null },
      style: { default: null as string | null },
      id: { default: null as string | null },
    };
  },

  parseHTML() {
    return [{ tag: 'span', priority: 10 }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});

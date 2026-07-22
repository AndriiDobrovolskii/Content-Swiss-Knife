/**
 * extensions/index.ts
 *
 * Assembled TipTap schema for HtmlEditorComponent. See CLAUDE.md's "Hard
 * rules for output HTML" and this directory's individual files for the
 * rationale behind each piece — this barrel just wires them together.
 */

import StarterKit from '@tiptap/starter-kit';
import Bold from '@tiptap/extension-bold';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { mergeAttributes } from '@tiptap/core';

import { FigureImg, ImageFigcaption, ImageFigure } from './image-figure-node';
import { VideoEmbedFigure } from './video-embed-figure-node';
import { Table, TableRow, TableCell, TableHeader } from './table-extensions';
import { GenericBlock } from './generic-block-node';
import { GenericInlineSpan } from './generic-inline-mark';
import { GlobalAttributes } from './global-attributes';
import { SearchReplace } from './search-replace-extension';

// This app's own convention (hard rules, image-figure.ts, every real
// fixture) uses <b> exclusively for bold lead-ins — StarterKit's bundled
// Bold always serializes to <strong>, which would rewrite every existing
// <b> on a zero-edit round-trip. Disable StarterKit's copy and use one
// configured to emit <b> instead; parseHTML still matches both tags.
const BoldAsB = Bold.extend({
  renderHTML({ HTMLAttributes }) {
    return ['b', mergeAttributes(HTMLAttributes), 0];
  },
});

export const TIPTAP_EXTENSIONS = [
  StarterKit.configure({
    // These four are superseded by this directory's own custom nodes/marks —
    // disable StarterKit's versions so there's exactly one node per tag.
    link: { openOnClick: false },
    bold: false,
  }),
  BoldAsB,
  Subscript,
  Superscript,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Table,
  TableRow,
  TableCell,
  TableHeader,
  ImageFigure,
  FigureImg,
  ImageFigcaption,
  VideoEmbedFigure,
  GenericBlock,
  GenericInlineSpan,
  GlobalAttributes,
  SearchReplace,
];

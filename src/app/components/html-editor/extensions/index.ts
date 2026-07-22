/**
 * extensions/index.ts
 *
 * Assembled TipTap schema for HtmlEditorComponent. See CLAUDE.md's "Hard
 * rules for output HTML" and this directory's individual files for the
 * rationale behind each piece — this barrel just wires them together.
 */

import StarterKit from '@tiptap/starter-kit';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';

import { FigureImg, ImageFigcaption, ImageFigure } from './image-figure-node';
import { VideoEmbedFigure } from './video-embed-figure-node';
import { Table, TableRow, TableCell, TableHeader } from './table-extensions';
import { GenericBlock } from './generic-block-node';
import { GenericInlineSpan } from './generic-inline-mark';
import { GlobalAttributes } from './global-attributes';

export const TIPTAP_EXTENSIONS = [
  StarterKit.configure({
    // These four are superseded by this directory's own custom nodes/marks —
    // disable StarterKit's versions so there's exactly one node per tag.
    link: { openOnClick: false },
  }),
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
];

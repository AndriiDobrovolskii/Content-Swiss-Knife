/**
 * table-extensions.ts
 *
 * Tier-1 fidelity overrides on @tiptap/extension-table: add class/style/id
 * and schema.org PropertyValue microdata attrs (itemprop/itemscope/itemtype,
 * plus `scope` on cells) required by CLAUDE.md's hard rules for spec tables,
 * plus fixes for TipTap default-rendering noise this app's tables never had:
 *
 * - `Table`'s default renderHTML unconditionally calls the package's
 *   `createColGroup()`, emitting `<colgroup><col style="min-width:...">`
 *   and a `style="min-width:...px"` on `<table>` itself, regardless of the
 *   `resizable` option (confirmed in
 *   node_modules/@tiptap/extension-table/dist/index.js) — this app's real
 *   fixtures never carry inline table width styling, so this is overridden
 *   away entirely below. This also drops the extra `<tbody>` wrapper the
 *   default renderHTML placed around the content hole; table-thead.ts's
 *   reconstructTableThead() already tolerates rows with no tbody wrapper
 *   at all (its selector covers both cases).
 * - `TableCell`/`TableHeader`'s default `colspan`/`rowspan` attrs
 *   (`default: 1`) render unconditionally with no built-in way to omit the
 *   default — overridden below to omit when equal to 1 (a real merged cell
 *   still renders its non-default value).
 *
 * <thead>/<tbody> reconstruction is deliberately NOT done here (see
 * table-thead.ts) — parsing already handles thead/tbody-wrapped tables with
 * zero schema changes (verified empirically: ProseMirror's DOMParser skips
 * unmatched wrapper elements and parses their <tr> children directly), and
 * the serialize-side gap can't be fixed via renderHTML at all — a
 * DOMOutputSpec has exactly one content hole, so "first row into <thead>,
 * rest into <tbody>" isn't expressible as a schema-level toDOM. That's
 * handled as a post-serialize string transform instead.
 */

import { mergeAttributes } from '@tiptap/core';
import { Table as BaseTable, TableRow as BaseTableRow, TableCell as BaseTableCell, TableHeader as BaseTableHeader } from '@tiptap/extension-table';
import { MICRODATA_ATTRS } from './attr-helpers';

const COMMON_ATTRS = {
  class: { default: null as string | null },
  style: { default: null as string | null },
  id: { default: null as string | null },
};

/** Omit colspan/rowspan from rendered output when they're just the default (1). */
function omitDefaultSpanAttr(name: 'colspan' | 'rowspan') {
  return {
    default: 1,
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes[name] === 1 ? {} : { [name]: attributes[name] },
  };
}

export const Table = BaseTable.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...COMMON_ATTRS,
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ['table', mergeAttributes(HTMLAttributes), 0];
  },
}).configure({ resizable: false });

export const TableRow = BaseTableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...COMMON_ATTRS,
      ...MICRODATA_ATTRS,
    };
  },
});

export const TableCell = BaseTableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...COMMON_ATTRS,
      ...MICRODATA_ATTRS,
      scope: { default: null as string | null },
      colspan: omitDefaultSpanAttr('colspan'),
      rowspan: omitDefaultSpanAttr('rowspan'),
    };
  },
});

export const TableHeader = BaseTableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...COMMON_ATTRS,
      ...MICRODATA_ATTRS,
      scope: { default: null as string | null },
      colspan: omitDefaultSpanAttr('colspan'),
      rowspan: omitDefaultSpanAttr('rowspan'),
    };
  },
});

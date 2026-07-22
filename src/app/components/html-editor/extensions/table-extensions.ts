/**
 * table-extensions.ts
 *
 * Tier-1 fidelity overrides on @tiptap/extension-table: add class/style/id
 * and schema.org PropertyValue microdata attrs (itemprop/itemscope/itemtype,
 * plus `scope` on cells) required by CLAUDE.md's hard rules for spec tables.
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

import { Table as BaseTable, TableRow as BaseTableRow, TableCell as BaseTableCell, TableHeader as BaseTableHeader } from '@tiptap/extension-table';
import { MICRODATA_ATTRS } from './attr-helpers';

const COMMON_ATTRS = {
  class: { default: null as string | null },
  style: { default: null as string | null },
  id: { default: null as string | null },
};

export const Table = BaseTable.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...COMMON_ATTRS,
    };
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
    };
  },
});

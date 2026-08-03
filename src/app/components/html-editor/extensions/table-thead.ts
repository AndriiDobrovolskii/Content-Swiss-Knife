/**
 * table-thead.ts
 *
 * Post-serialize fix-up for `editor.getHTML()` output — table-specific
 * normalization that can't be expressed at the TipTap schema level:
 *
 * 1. <thead>/<tbody> reconstruction: TipTap's Table node always renders
 *    every row into a single <tbody> (ProseMirror's DOMOutputSpec has
 *    exactly one content hole, so a schema-level renderHTML override cannot
 *    split "first row" into <thead> and "the rest" into <tbody> — verified
 *    empirically, see table-extensions.ts). Parsing already handles
 *    <thead>/<tbody>-wrapped input with zero schema changes, so this only
 *    needs to run at copy-time, not load-time.
 * 2. Lone-<p>-per-cell unwrap: TableCell/TableHeader's content model is
 *    `block+` (required so <ul>/<li> inside a cell — present in real
 *    fixtures — keeps working), so a cell that originally held bare text
 *    gets ProseMirror's implicit-paragraph-wrapping on parse. Not fixable
 *    in the schema without breaking list-in-cell support, so unwrapped here
 *    when the <p> is a cell's ONLY child (a cell with a <ul> or multiple
 *    blocks is left untouched).
 *
 * Pure DOM transform, no ProseMirror/editor involvement — same style as
 * wrapImageFigures()/stripTiptapArtifacts().
 */
/**
 * Two header-row shapes exist in real artifacts and both must be restored to <thead>:
 *
 *  1. All cells are <th> — the §2 killer-specs table.
 *  2. All cells are <td> whose ONLY child is a <b> — the §7 spec tables. That shape comes
 *     from the store's OpenCart/Journal template (see table-finalize.ts), which uses <td>
 *     rather than <th> deliberately. Without this branch the round-trip silently drops
 *     §7's <thead> on every artifact, because shape 2 never matched the <th> test.
 *
 * Shape 2 additionally requires the table to have more than one row, so a single-row table
 * of bolded cells is left alone rather than being reclassified as a headless header.
 */
function isHeaderRow(row: Element, rowCount: number): boolean {
  const cells = Array.from(row.children);
  if (cells.length === 0) return false;
  if (cells.every(cell => cell.tagName === 'TH')) return true;
  return (
    rowCount > 1 &&
    cells.every(
      cell =>
        cell.tagName === 'TD' && cell.childNodes.length === 1 && cell.firstElementChild?.tagName === 'B',
    )
  );
}

export function reconstructTableThead(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');

  doc.querySelectorAll('td, th').forEach(cell => {
    const onlyChild = cell.firstElementChild;
    const wrapsOnlyParagraph = onlyChild?.tagName === 'P' && cell.childNodes.length === 1;
    if (wrapsOnlyParagraph) {
      while (onlyChild!.firstChild) cell.insertBefore(onlyChild!.firstChild, onlyChild!);
      onlyChild!.remove();
    }
  });

  doc.querySelectorAll('table').forEach(table => {
    const rows = Array.from(table.querySelectorAll(':scope > tbody > tr, :scope > tr'));
    if (rows.length === 0) return;

    const firstRow = rows[0];
    if (!isHeaderRow(firstRow, rows.length)) return;

    const bodyRows = rows.slice(1);
    const thead = doc.createElement('thead');
    thead.appendChild(firstRow);
    const tbody = doc.createElement('tbody');
    bodyRows.forEach(row => tbody.appendChild(row));

    // Replace whatever wrapper(s) currently hold the rows with the
    // reconstructed thead/tbody pair, preserving position within <table>.
    table.querySelectorAll(':scope > tbody, :scope > thead').forEach(el => el.remove());
    table.appendChild(thead);
    table.appendChild(tbody);
  });

  return doc.body.innerHTML;
}

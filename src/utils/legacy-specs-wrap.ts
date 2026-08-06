/**
 * legacy-specs-wrap.ts
 *
 * Two responsibilities, one always-on and one conditional:
 *
 * 1. UNCONDITIONALLY normalizes every legacy `<div style="overflow-x: auto; …">` wrapper
 *    around a `<table>` into a plain `<div class="table-responsive">`, stripping stray
 *    `<br>` tags found inside it. Runs document-wide regardless of whether the document
 *    already has a `<section class="specs">` — a legacy wrapper can appear anywhere: a
 *    §2a-style highlight table, a table inside supplemental HowTo/FAQ content, or a still-
 *    unsectioned §7 block. Table class/style/thead-cell decoration is deliberately NOT done
 *    here — that's table-finalize.ts's restyleSpecTables job, which only touches content
 *    already inside <section class="specs">.
 *
 * 2. CONDITIONALLY builds the missing <section class="specs">…</section><hr> envelope
 *    around the normalized tables, but only when the document has no <section class="specs">
 *    at all yet — building a second one would be wrong when a real §7 section already
 *    exists elsewhere in the document.
 *
 * Pure, no LLM.
 */

const SPECS_HEADING_TEXT = 'Технічні характеристики';

function isWhitespaceText(node: Node): boolean {
  return node.nodeType === 3 && !(node.textContent ?? '').trim();
}

function previousSignificantSibling(node: Node): Node | null {
  let p = node.previousSibling;
  while (p && isWhitespaceText(p)) p = p.previousSibling;
  return p;
}

function nextSignificantSibling(node: Node): Node | null {
  let n = node.nextSibling;
  while (n && isWhitespaceText(n)) n = n.nextSibling;
  return n;
}

/**
 * Walks a table-responsive div backward to find where its category block actually starts:
 * an immediately-preceding <h3> heading and/or HTML comment marker, preserved verbatim per
 * the app's canonical §7 shape (see table-finalize.ts restyleSpecTables). Stops at the first
 * node that isn't one of those — unrelated preceding content is left where it is.
 */
function findBlockStart(div: Element): Node {
  let start: Node = div;
  const prev = previousSignificantSibling(start);
  if (prev && prev.nodeType === 1 && (prev as Element).tagName === 'H3') {
    start = prev;
    const beforeHeading = previousSignificantSibling(start);
    if (beforeHeading && beforeHeading.nodeType === 8) {
      start = beforeHeading;
    }
  } else if (prev && prev.nodeType === 8) {
    start = prev;
  }
  return start;
}

export function wrapLegacySpecTables(html: string): string {
  if (!html) return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');

  const legacyWrappers = Array.from(doc.querySelectorAll('div[style]')).filter(div => {
    const style = (div.getAttribute('style') ?? '').toLowerCase();
    return (style.includes('overflow-x') || style.includes('overflow-y')) && div.querySelector('table');
  });
  if (legacyWrappers.length === 0) return html;

  // Always normalize the wrapper markup itself — a legacy overflow-styled div is never the
  // app's own presentation, wherever it appears in the document.
  const tableResponsiveDivs: Element[] = [];
  for (const wrapper of legacyWrappers) {
    wrapper.querySelectorAll('br').forEach(br => br.remove());

    const tables = Array.from(wrapper.querySelectorAll('table'));
    const replacements = tables.map(table => {
      const div = doc.createElement('div');
      div.setAttribute('class', 'table-responsive');
      div.appendChild(table);
      return div;
    });
    wrapper.replaceWith(...replacements);
    tableResponsiveDivs.push(...replacements);
  }

  // A real §7 section already exists — building a second <section class="specs"> would be
  // wrong. Leave the just-normalized table-responsive divs wherever they already sit (e.g. a
  // §2a highlight table near the top, or a table inside supplemental HowTo/FAQ content).
  if (doc.querySelector('section.specs')) return doc.body.innerHTML;

  const first = tableResponsiveDivs[0];
  const last = tableResponsiveDivs[tableResponsiveDivs.length - 1];
  const start = findBlockStart(first);
  const parent = start.parentNode;
  if (!parent) return doc.body.innerHTML;

  // Collect every sibling from the computed start through the last table-responsive div,
  // in document order — this naturally sweeps up any intermediate category blocks (each
  // with its own <h3>/comment) that sit between the first and last legacy wrapper.
  const collected: Node[] = [];
  for (let cursor: Node | null = start; cursor; cursor = cursor.nextSibling) {
    collected.push(cursor);
    if (cursor === last) break;
  }

  const section = doc.createElement('section');
  section.setAttribute('class', 'specs');
  parent.insertBefore(section, start);

  // Absorb an already-present matching heading right before the block instead of duplicating
  // it; otherwise author a fresh one. (Re-running this pass is guarded by the section.specs
  // check above, so this only matters for legacy content that already carries this exact
  // heading outside any section.)
  let heading: Element | null = null;
  const before = previousSignificantSibling(section);
  if (before && before.nodeType === 1 && (before as Element).tagName === 'H2' &&
      (before.textContent ?? '').trim() === SPECS_HEADING_TEXT) {
    heading = before as Element;
    heading.remove();
  }
  if (!heading) {
    heading = doc.createElement('h2');
    heading.textContent = SPECS_HEADING_TEXT;
  }
  section.appendChild(heading);

  for (const node of collected) {
    section.appendChild(node);
  }

  const after = nextSignificantSibling(section);
  if (!(after && after.nodeType === 1 && (after as Element).tagName === 'HR')) {
    section.parentNode?.insertBefore(doc.createElement('hr'), section.nextSibling);
  }

  return doc.body.innerHTML;
}

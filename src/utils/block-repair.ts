/**
 * block-repair.ts
 *
 * Addressable prose blocks inside generated HTML, for repair that replaces ONE block instead of
 * regenerating the whole artifact.
 *
 * Why htmlparser2 and not DOMParser: a rewriter needs byte offsets. A DOM round-trip normalises
 * markup on serialisation (attribute quoting, implied tags), so splicing through it would rewrite
 * bytes nobody asked to touch — and nearly every validator in this directory is a regex over the
 * HTML string. Offsets let us replace exactly the addressed range and leave every other byte alone.
 * htmlparser2 also needs no DOM, so this module works in tests without happy-dom and never skips
 * silently the way sentence-length.ts does when DOMParser is unavailable.
 *
 * Pure function, no LLM.
 */

import { parseDocument } from 'htmlparser2';

/**
 * Prose containers only. Deliberately excludes <section>/<div> (wrappers, not prose) and inline
 * tags (<b>, <a> — a sentence is not confined to one of them).
 */
const BLOCK_TAGS = new Set(['p', 'li', 'figcaption', 'td', 'h2', 'h3']);

export interface HtmlBlock {
  /** Position in the returned list. This is what `path` addresses as `block[i]`. */
  index: number;
  tag: string;
  /** Offset of the opening '<'. */
  start: number;
  /** Offset one past the closing '>' — `html.slice(start, end)` is `outerHTML`. */
  end: number;
  /** The original bytes. Never re-serialised. */
  outerHTML: string;
  /**
   * Entity-decoded, whitespace-collapsed visible text.
   *
   * Matched against validator output, which measures `textContent` — i.e. decoded text. Comparing
   * against the raw slice would fail on every block containing &nbsp; or &amp;, and the pipeline
   * emits NBSP deliberately (fixNumberFormatting writes NUM<NBSP>UNIT). JS `\s` covers U+00A0, so
   * the collapse below normalises it to a plain space in one step.
   */
  text: string;
}

/** Structural view of what parseDocument returns; avoids a direct dependency on `domhandler`. */
interface ParsedNode {
  type: string;
  name?: string;
  data?: string;
  children?: ParsedNode[];
  startIndex?: number | null;
  endIndex?: number | null;
}

function visibleText(node: ParsedNode): string {
  if (node.type === 'text') return node.data ?? '';
  return (node.children ?? []).map(visibleText).join('');
}

/**
 * Every addressable block, in document order.
 *
 * Nested blocks are BOTH returned (an outer <li> and the <li> inside its nested list). Picking the
 * innermost, and refusing to patch two overlapping ranges in one pass, is the caller's job — this
 * function reports structure, it does not resolve conflicts.
 */
export function extractBlocks(html: string): HtmlBlock[] {
  if (!html) return [];

  const doc = parseDocument(html, { withStartIndices: true, withEndIndices: true });
  const blocks: HtmlBlock[] = [];

  const walk = (node: ParsedNode): void => {
    if (node.type === 'tag' && node.name && BLOCK_TAGS.has(node.name)
      && typeof node.startIndex === 'number' && typeof node.endIndex === 'number') {
      const start = node.startIndex;
      const end = node.endIndex + 1; // endIndex is inclusive; callers want a slice-able bound
      blocks.push({
        index: blocks.length,
        tag: node.name,
        start,
        end,
        outerHTML: html.slice(start, end),
        text: visibleText(node).replace(/\s+/g, ' ').trim(),
      });
    }
    for (const child of node.children ?? []) walk(child);
  };

  // Pre-order DFS is already document order, and it visits an enclosing block before the blocks
  // nested inside it.
  for (const child of (doc as unknown as ParsedNode).children ?? []) walk(child);

  return blocks;
}

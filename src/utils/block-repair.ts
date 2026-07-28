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
import { sourceNumbers as numbersIn } from './alt-numeric-fidelity';

/**
 * Prose containers only. Deliberately excludes <section>/<div> (wrappers, not prose) and inline
 * tags (<b>, <a> — a sentence is not confined to one of them).
 */
const BLOCK_TAGS = new Set(['p', 'li', 'figcaption', 'td', 'h2', 'h3']);

export interface HtmlBlockAncestor {
  tag: string;
  classes: string[];
}

export interface HtmlBlock {
  /** Position in the returned list. This is what `path` addresses as `block[i]`. */
  index: number;
  tag: string;
  /**
   * Enclosing elements, outermost first.
   *
   * Callers need scope decisions the offsets alone cannot answer — sentence-length skips prose
   * inside a spec table or a figcaption, which used to be `el.closest('table, figcaption,
   * section.specs')`. Carrying the chain here is what lets a validator make that call while still
   * numbering blocks the way the patcher does.
   */
  ancestors: HtmlBlockAncestor[];
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
  attribs?: Record<string, string>;
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

  const walk = (node: ParsedNode, ancestors: HtmlBlockAncestor[]): void => {
    if (node.type === 'tag' && node.name && BLOCK_TAGS.has(node.name)
      && typeof node.startIndex === 'number' && typeof node.endIndex === 'number') {
      const start = node.startIndex;
      const end = node.endIndex + 1; // endIndex is inclusive; callers want a slice-able bound
      blocks.push({
        index: blocks.length,
        tag: node.name,
        ancestors,
        start,
        end,
        outerHTML: html.slice(start, end),
        text: visibleText(node).replace(/\s+/g, ' ').trim(),
      });
    }
    const inner = node.type === 'tag' && node.name
      ? [...ancestors, { tag: node.name, classes: (node.attribs?.['class'] ?? '').split(/\s+/).filter(Boolean) }]
      : ancestors;
    for (const child of node.children ?? []) walk(child, inner);
  };

  // Pre-order DFS is already document order, and it visits an enclosing block before the blocks
  // nested inside it.
  for (const child of (doc as unknown as ParsedNode).children ?? []) walk(child, []);

  return blocks;
}

// ── Path addressing ───────────────────────────────────────────────────────────
//
// One form: `block[i]`, indexing extractBlocks() output. Deliberately NOT the arrayProp[i].leafProp
// grammar of repair-strategy.ts — that one addresses a JSON artifact, this one a string, and
// conflating them would let a JSON path resolve against HTML and silently rewrite the wrong thing.

const BLOCK_PATH_RE = /^block\[(\d+)\]$/;

function parseBlockPath(path: string): number {
  const m = BLOCK_PATH_RE.exec(path);
  if (!m) throw new Error(`block-repair: unsupported block path "${path}" (expected block[i])`);
  return Number(m[1]);
}

/** The outerHTML a path addresses, or undefined when the index is out of range. */
export function getBlock(html: string, path: string): string | undefined {
  return extractBlocks(html)[parseBlockPath(path)]?.outerHTML;
}

/**
 * Replaces one addressed block, byte-for-byte everywhere else.
 *
 * Throws when the path does not resolve — same reasoning as setAtPath in repair-strategy.ts: a
 * silent no-op would let a failed repair look like a successful one.
 */
export function setBlock(html: string, path: string, value: string): string {
  const index = parseBlockPath(path);
  const block = extractBlocks(html)[index];
  if (!block) throw new Error(`block-repair: index ${index} is out of range — the HTML has fewer blocks`);
  return html.slice(0, block.start) + value + html.slice(block.end);
}

/**
 * Applies several block replacements in one pass, keyed by block index.
 *
 * Two properties this exists to guarantee, neither of which survives naive per-patch application:
 *
 *   1. Offsets stay valid. Replacements change length, so splicing left-to-right shifts every
 *      later range. Applying in DESCENDING start order means every range still to be written lies
 *      entirely before the bytes already rewritten. The result does not depend on the order the
 *      caller supplied patches in.
 *   2. Overlapping ranges are never both written. A nested <li> is contained in its enclosing
 *      <li>; writing both would have the outer replacement swallow the inner one. The innermost
 *      wins — it is the more specific fix, and it is what issue-to-block assignment picked.
 *
 * An index addressing no block is ignored rather than throwing: patches come from a model, and one
 * hallucinated index should not discard the rest of a good response.
 */
export function applyBlockPatches(html: string, patches: ReadonlyMap<number, string>): string {
  if (patches.size === 0) return html;

  const blocks = extractBlocks(html);
  const targets = [...patches.entries()]
    .map(([index, replacement]) => ({ block: blocks[index], replacement }))
    .filter((t): t is { block: HtmlBlock; replacement: string } => !!t.block)
    // Descending start: deeper blocks start later, so the innermost of an enclosing pair is seen
    // first and claims the range. This same order is what makes the splice below safe.
    .sort((a, b) => b.block.start - a.block.start);

  const accepted: { block: HtmlBlock; replacement: string }[] = [];
  for (const target of targets) {
    const overlaps = accepted.some(
      a => a.block.start < target.block.end && target.block.start < a.block.end,
    );
    if (!overlaps) accepted.push(target);
  }

  let out = html;
  for (const { block, replacement } of accepted) {
    out = out.slice(0, block.start) + replacement + out.slice(block.end);
  }
  return out;
}

// ── Request planning ──────────────────────────────────────────────────────────

export interface BlockPatchRequest {
  index: number;
  outerHTML: string;
  /** Validator `detail` strings, verbatim. They are already written as instructions to a model. */
  instructions: string[];
  /** Visible text of the preceding block, or '' at the start of the document. Read-only context. */
  before: string;
  /** Visible text of the following block, or '' at the end of the document. Read-only context. */
  after: string;
}

/**
 * Turns per-block instructions into one request per block.
 *
 * Input is keyed BY BLOCK, not by issue, and that is the point: two issues in the same paragraph
 * must produce one combined rewrite. Two separate patches would splice against offsets the first
 * one already invalidated, or overwrite each other.
 *
 * Neighbouring blocks ride along as read-only context. Without them a model handed an isolated
 * "<p>Він має швидкість 50 мм/с…</p>" resolves the pronoun by substituting the product name,
 * because it cannot see that the name was already given in the previous paragraph — the local fix
 * lands, and the prose around it reads worse.
 *
 * Takes a Map rather than ValidationIssue[] deliberately: grouping by `ValidationIssue.path`
 * belongs to the caller, and `path` does not exist on the type until the tiered-ladder work lands.
 * This keeps the module independent of that change.
 */
export function planBlockPatches(
  html: string,
  instructionsByIndex: ReadonlyMap<number, readonly string[]>,
): BlockPatchRequest[] {
  const blocks = extractBlocks(html);
  return [...instructionsByIndex.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([index, instructions]) => {
      const block = blocks[index];
      if (!block || instructions.length === 0) return [];
      return [{
        index,
        outerHTML: block.outerHTML,
        instructions: [...instructions],
        before: blocks[index - 1]?.text ?? '',
        after: blocks[index + 1]?.text ?? '',
      }];
    });
}

// ── Response parsing ──────────────────────────────────────────────────────────

/**
 * Reads `<patch block="i">…</patch>` elements out of a model response.
 *
 * XML rather than JSON because the payload IS HTML: asking a model to escape double quotes inside
 * a JSON string buys a SyntaxError and a wasted attempt for nothing. Here there is no escaping
 * contract at all — the inner bytes are lifted verbatim by offset.
 *
 * Everything outside a <patch> element is ignored, so commentary and code fences cost nothing.
 * A block the model chose not to return is simply left alone; that is a valid answer, not an error.
 */
export function parsePatchResponse(response: string): Map<number, string> {
  const patches = new Map<number, string>();
  if (!response) return patches;

  const doc = parseDocument(response, { withStartIndices: true, withEndIndices: true });

  const walk = (node: ParsedNode): void => {
    if (node.type === 'tag' && node.name === 'patch') {
      const raw = node.attribs?.['block'];
      const index = raw !== undefined && /^\d+$/.test(raw) ? Number(raw) : null;
      const children = node.children ?? [];
      const first = children[0];
      const last = children[children.length - 1];
      if (index !== null && !patches.has(index)
        && typeof first?.startIndex === 'number' && typeof last?.endIndex === 'number') {
        const inner = response.slice(first.startIndex, last.endIndex + 1).trim();
        // First occurrence wins, matching dedupeIssues in validation-issues.ts. An empty patch is
        // dropped rather than applied — blanking a paragraph is never the intended repair.
        if (inner) patches.set(index, inner);
      }
      return; // never look for a <patch> inside a <patch>
    }
    for (const child of node.children ?? []) walk(child);
  };

  for (const child of (doc as unknown as ParsedNode).children ?? []) walk(child);
  return patches;
}

// ── Patch verification ────────────────────────────────────────────────────────
//
// Deterministic, per block, before anything is spliced. These checks are the reason a block-scoped
// repair is safe to spend on a mere warning: the worst outcome of a bad model response is that the
// block stays exactly as it was.
//
// Scope is what can be decided from the two fragments alone. Whether the ORIGINATING RULE is now
// satisfied, and whether the artifact as a whole got worse, are the caller's checks — it owns the
// validators; this module owns structure.

/** The single root element of a fragment, or null when the fragment is not exactly one element. */
function singleRoot(fragment: string): ParsedNode | null {
  const doc = parseDocument(fragment, { withStartIndices: true, withEndIndices: true });
  const significant = ((doc as unknown as ParsedNode).children ?? []).filter(
    n => n.type !== 'text' || (n.data ?? '').trim() !== '',
  );
  if (significant.length !== 1) return null;
  return significant[0].type === 'tag' ? significant[0] : null;
}

/**
 * Ordered identity of every link and embed inside a block.
 *
 * Ordered, not a set: two images swapping places is a real change even though the multiset is
 * equal, and IMAGE MANIFEST placement rules care about which paragraph an image sits in.
 */
function mediaSignature(node: ParsedNode): string[] {
  const out: string[] = [];
  const walk = (n: ParsedNode): void => {
    if (n.type === 'tag' && n.name) {
      const attribs = n.attribs ?? {};
      if (n.name === 'img' || n.name === 'iframe') out.push(`${n.name}:${attribs['src'] ?? ''}`);
      if (n.name === 'a') out.push(`a:${attribs['href'] ?? ''}`);
    }
    for (const child of n.children ?? []) walk(child);
  };
  walk(node);
  return out;
}

function attributeSignature(node: ParsedNode): string {
  const attribs = node.attribs ?? {};
  return Object.keys(attribs).sort().map(k => `${k}=${attribs[k]}`).join('|');
}

/**
 * Why this patch must be thrown away, or null when it may be applied.
 *
 * @param original    the block's current outerHTML
 * @param replacement what the model returned for it
 */
export function rejectPatch(original: string, replacement: string): string | null {
  const before = singleRoot(original);
  const after = singleRoot(replacement);

  if (!before) return 'the original block did not parse as exactly one element';
  if (!after) {
    // Covers the common failure: splitting a long sentence into two <p> instead of two sentences
    // inside one <p>. That changes document structure, which a local repair must never do.
    return 'the replacement is not exactly one element — keep the fix inside the original block';
  }

  if (before.name !== after.name) {
    return `the replacement changed the root tag from <${before.name}> to <${after.name}>`;
  }

  if (attributeSignature(before) !== attributeSignature(after)) {
    return 'the replacement changed a root attribute';
  }

  const mediaBefore = mediaSignature(before);
  const mediaAfter = mediaSignature(after);
  if (mediaBefore.length !== mediaAfter.length || mediaBefore.some((m, i) => m !== mediaAfter[i])) {
    return 'the replacement changed an img/iframe src or an a href';
  }

  // Set, not multiset: a legitimate sentence split can legitimately repeat a figure
  // ("…швидкість 50 мм/с. Швидкість 50 мм/с дає…"). What must not happen is a number appearing
  // that was not there, or one disappearing — the "don't change spec values" rule.
  const numbersBefore = numbersIn(visibleText(before));
  const numbersAfter = numbersIn(visibleText(after));
  const invented = [...numbersAfter].filter(n => !numbersBefore.has(n));
  const dropped = [...numbersBefore].filter(n => !numbersAfter.has(n));
  if (invented.length > 0 || dropped.length > 0) {
    return `the replacement changed the numbers in the block`
      + (invented.length ? ` (invented: ${invented.join(', ')})` : '')
      + (dropped.length ? ` (dropped: ${dropped.join(', ')})` : '');
  }

  return null;
}

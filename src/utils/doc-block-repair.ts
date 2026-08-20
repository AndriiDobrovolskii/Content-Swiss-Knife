/**
 * doc-block-repair.ts
 *
 * Doc-shaped sibling of block-repair.ts: addressable prose fields inside a ProductDescriptionDoc,
 * for repair that replaces ONE field instead of regenerating the whole document.
 *
 * Pure functions, no LLM.
 *
 * WHY THIS EXISTS SEPARATELY FROM repair-strategy.ts's getAtPath/setAtPath: those already resolve
 * arrayProp[i].leafProp-style paths against any object graph, and would be enough on their own if
 * every ValidationIssue.path addressed a string. It does not. validateSentenceLengthDoc
 * (sentence-length.ts) addresses a `{kind:'paragraph', text}` Block by the BLOCK'S OWN path (e.g.
 * "functionality[0].blocks[0]"), not "...blocks[0].text" — confirmed directly against real output:
 * "Sentence of 22 words at functionality[0].blocks[0] exceeds..." carries no `.text` suffix. So
 * getAtPath on that path resolves to the Block object, not a string, and repair-gate.ts's own
 * generic tiers (which require `typeof value === 'string'`) silently skip it. This module unwraps
 * that one extra hop when needed, and rewraps it on write, so the rest of the repair pipeline never
 * has to know the difference between a bare Prose field and a paragraph Block.
 *
 * It also special-cases `doc.hook`: validateSentenceLengthDoc calls `check(doc.hook, 'hook')`, a
 * path with no '.' and no '[i]'. repair-strategy.ts's parsePath deliberately rejects a single
 * indexless segment ("a single segment must carry an index") as its guard against a caller
 * accidentally dropping an array index — so getAtPath(doc, 'hook') throws. Correct behaviour for
 * that guard, wrong for this one legitimate root-leaf path, so it is read/written directly here
 * instead of going through the generic walker.
 */

import { parseDocument } from 'htmlparser2';
import type { Block, ProductDescriptionDoc } from '../domain/description-doc';
import { getAtPath, setAtPath } from './repair-strategy';
import { sourceNumbers as numbersIn } from './alt-numeric-fidelity';

export interface DocBlock {
  path: string;
  text: string;
}

function isRootLeaf(path: string): boolean {
  return !path.includes('.') && !path.includes('[');
}

function isParagraphBlock(value: unknown): value is Extract<Block, { kind: 'paragraph' }> {
  return !!value && typeof value === 'object' && (value as { kind?: unknown }).kind === 'paragraph'
    && typeof (value as { text?: unknown }).text === 'string';
}

/**
 * Resolves the rewritable prose at `path`, or undefined when the path addresses something this
 * module does not know how to rewrite: not a string, not a `{kind:'paragraph', text}` Block. A
 * documented no-op — the same contract heading-product-name-stuffing's shared ladder already relies
 * on for a path-shape mismatch (see repair-strategy.ts) — so a validator emitting a path this
 * module cannot address degrades harmlessly instead of throwing out of an LLM-adjacent executor.
 *
 * `path` is Doc-RELATIVE (e.g. "keyBenefits[0].items[0].text", "hook"), resolved directly against
 * the unwrapped ProductDescriptionDoc — never the `doc.`-prefixed wrapper-relative form
 * heading-style.ts emits against DocAttempt. Callers are responsible for passing the unwrapped Doc.
 */
export function getDocBlock(doc: ProductDescriptionDoc, path: string): DocBlock | undefined {
  try {
    const value = isRootLeaf(path)
      ? (doc as unknown as Record<string, unknown>)[path]
      : getAtPath(doc, path);
    if (typeof value === 'string') return { path, text: value };
    if (isParagraphBlock(value)) return { path, text: value.text };
    return undefined;
  } catch {
    // getAtPath throws on a malformed or unsupported path (repair-strategy.ts's own guard against a
    // dropped array index, or a genuinely broken path). A repair must never be able to crash the
    // pipeline over an address it cannot resolve — treat it the same as "not addressable".
    return undefined;
  }
}

/**
 * Writes `text` back at `path`, preserving container shape: rewraps into `{ ...block, text }` when
 * the original value was a paragraph Block rather than a bare string, writes the Doc property
 * directly for a root-leaf path, and defers to setAtPath (repair-strategy.ts) otherwise.
 *
 * setAtPath is already copy-on-write — every write constructs a new object/array slice rather than
 * mutating in place — so a caller's `doc === originalDoc` reference check to detect "did anything
 * change" already works correctly here with no extra cloning.
 *
 * Caller must have proven the path resolves via getDocBlock first; this throws on a path
 * getDocBlock returned undefined for (same "loud on a caller bug" contract as setAtPath).
 */
export function setDocBlock(doc: ProductDescriptionDoc, path: string, text: string): ProductDescriptionDoc {
  if (isRootLeaf(path)) return { ...doc, [path]: text };
  const value = getAtPath(doc, path);
  const next: unknown = isParagraphBlock(value) ? { ...value, text } : text;
  return setAtPath(doc, path, next);
}

const ALLOWED_PROSE_TAGS = new Set(['b', 'strong']);
const TAG_RE = /<\/?([a-zA-Z][\w-]*)[^>]*>/g;

/**
 * Why this patch must be thrown away, or null when it may be applied.
 *
 * Narrower than block-repair.ts's rejectPatch: Doc Prose carries only optional <b>/<strong> inline
 * tags and no root element or media (description-doc.ts's own Prose contract), so there is no
 * tag/attribute IDENTITY to check the way an HTML block's root element has one — only vocabulary and
 * balance.
 */
export function rejectDocPatch(original: string, replacement: string): string | null {
  if (!replacement.trim()) return 'the replacement is empty';

  const opens: Record<string, number> = {};
  const closes: Record<string, number> = {};
  let m: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(replacement))) {
    const name = m[1].toLowerCase();
    if (!ALLOWED_PROSE_TAGS.has(name)) {
      return `the replacement introduced a <${m[1]}> tag — Doc prose may carry only <b>/<strong>`;
    }
    const isClose = m[0].startsWith('</');
    (isClose ? closes : opens)[name] = ((isClose ? closes : opens)[name] ?? 0) + 1;
  }
  for (const name of ALLOWED_PROSE_TAGS) {
    if ((opens[name] ?? 0) !== (closes[name] ?? 0)) {
      return `the replacement has unbalanced <${name}> tags`;
    }
  }

  const strip = (s: string) => s.replace(/<\/?(?:b|strong)>/gi, '');
  const numbersBefore = numbersIn(strip(original));
  const numbersAfter = numbersIn(strip(replacement));
  const invented = [...numbersAfter].filter(n => !numbersBefore.has(n));
  const dropped = [...numbersBefore].filter(n => !numbersAfter.has(n));
  if (invented.length > 0 || dropped.length > 0) {
    return 'the replacement changed the numbers in the field'
      + (invented.length ? ` (invented: ${invented.join(', ')})` : '')
      + (dropped.length ? ` (dropped: ${dropped.join(', ')})` : '');
  }

  return null;
}

export interface DocPatchRequest {
  path: string;
  text: string;
  /** Validator `detail` strings, verbatim. Already written as instructions to a model. */
  instructions: string[];
}

/**
 * Turns per-path instructions into one request per path — mirrors block-repair.ts's
 * planBlockPatches, grouping BY PATH so two over-long sentences inside the same field become one
 * combined rewrite rather than two LLM calls each working from a value the other has invalidated.
 *
 * No before/after neighbour context, unlike planBlockPatches: a Doc path already addresses one
 * whole prose field as the unit handed to the model, not an arbitrarily-sliced HTML block that can
 * be smaller than the natural prose grouping. Revisit only if a real run shows pronoun drift.
 */
export function planDocBlockPatches(
  doc: ProductDescriptionDoc,
  instructionsByPath: ReadonlyMap<string, readonly string[]>,
): DocPatchRequest[] {
  const requests: DocPatchRequest[] = [];
  for (const [path, instructions] of instructionsByPath) {
    if (instructions.length === 0) continue;
    const block = getDocBlock(doc, path);
    if (!block) continue; // documented no-op — see getDocBlock
    requests.push({ path, text: block.text, instructions: [...instructions] });
  }
  return requests;
}

interface ParsedNode {
  type: string;
  name?: string;
  attribs?: Record<string, string>;
  children?: ParsedNode[];
  startIndex?: number | null;
  endIndex?: number | null;
}

/**
 * Reads `<patch path="...">…</patch>` elements out of a model response.
 *
 * Reuses htmlparser2's parseDocument — the exact parser block-repair.ts's own parsePatchResponse
 * already relies on for the identical job. It is lenient HTML-soup parsing, not strict XML: a tag
 * only opens on '<' immediately followed by a name character, so literal domain text like "< 2 мм"
 * or "> 50 %" (both realistic in this store's spec prose) is read as text, not markup. No new
 * fragile parsing is introduced by choosing this over a strict XML library.
 *
 * Everything outside a <patch> element is ignored, so commentary and code fences cost nothing. A
 * field the model chose not to return is simply left alone; that is a valid answer, not an error.
 */
export function parseDocPatchResponse(response: string): Map<string, string> {
  const patches = new Map<string, string>();
  if (!response) return patches;

  const doc = parseDocument(response, { withStartIndices: true, withEndIndices: true });

  const walk = (node: ParsedNode): void => {
    if (node.type === 'tag' && node.name === 'patch') {
      const path = node.attribs?.['path'];
      const children = node.children ?? [];
      const first = children[0];
      const last = children[children.length - 1];
      if (path && !patches.has(path)
        && typeof first?.startIndex === 'number' && typeof last?.endIndex === 'number') {
        const inner = response.slice(first.startIndex, last.endIndex + 1).trim();
        // First occurrence wins, matching parsePatchResponse. An empty patch is dropped rather than
        // applied — blanking a field is never the intended repair.
        if (inner) patches.set(path, inner);
      }
      return; // never look for a <patch> inside a <patch>
    }
    for (const child of node.children ?? []) walk(child);
  };

  for (const child of (doc as unknown as ParsedNode).children ?? []) walk(child);
  return patches;
}

/**
 * Applies several field replacements in one pass.
 *
 * UNLIKE block-repair.ts's applyBlockPatches, no descending-offset or overlap machinery is needed:
 * each patch is an independent JSON address (setAtPath produces a new object per write), and
 * setDocBlock re-reads the CURRENT doc for every write, so sequential application composes
 * correctly regardless of order. That is the structural simplification the JSON shape gets for free
 * over byte-offset HTML splicing, which block-repair.ts's offset math exists specifically to handle.
 */
export function applyDocPatches(
  doc: ProductDescriptionDoc,
  patches: ReadonlyMap<string, string>,
): ProductDescriptionDoc {
  let next = doc;
  for (const [path, text] of patches) next = setDocBlock(next, path, text);
  return next;
}

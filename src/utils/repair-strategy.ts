/**
 * repair-strategy.ts
 *
 * Rule-keyed repair ladders. Product-independent by construction: a strategy is selected by rule
 * identity, never by store, locale, or product.
 *
 * Ordering principle — cheapest instrument that can actually satisfy the constraint, with a
 * deterministic terminator so the ladder always ends:
 *   tier 0 deterministic  — no LLM. Mechanically determinable fixes.
 *   tier 1 field-scoped   — one field in, one field out. ~200 tokens.
 *   tier 2 full-regen     — today's behaviour. Last resort, and the only tier that can regress
 *                           parts of the artifact it was not asked to touch.
 *
 * The ladder order is PER RULE, not global. meta-title-length runs tier 1 BEFORE tier 0 because its
 * wording carries SEO value worth preserving; slug-charset never leaves tier 0 because there is no
 * judgement in it. See runRepairGate's active-tier dispatch — a global "all tier 0, then all tier 1"
 * sweep would invert meta-title-length's ladder and make tier 1 unreachable.
 */

import type { ValidationIssue } from './output-validator';
import { SLUG_PATTERN } from '../prompt-core/slug-utils';

export type RepairTier = 'deterministic' | 'field-scoped' | 'block-scoped' | 'full-regen';

export interface RepairStrategy {
  /** Ordered rungs. 'full-regen' is implicit after the last one and never listed. */
  ladder: RepairTier[];
  /** tier 0 — pure. Returns the corrected value, or null when it cannot satisfy the constraint. */
  deterministic?: (current: string, issue: ValidationIssue) => string | null;
  /** tier 1 — the instruction body for a minimal field-scoped payload. */
  fieldInstruction?: (current: string, issue: ValidationIssue) => string;
}

// ── Path addressing ────────────────────────────────────────────────────────────
//
// A path is dot-separated segments, each either `prop` or `prop[i]`:
//   seo_data[2].meta_title       leaf inside an array element
//   slugs[0]                     element-level replacement
//   doc.functionality[2].heading runDocGate's `{ doc, issues }` wrapper: a Doc validator's own
//                                path is relative to the Doc, not to the artifact
//                                runRepairGate<DocAttempt> actually holds, so its emitter
//                                prefixes it with the wrapper's own property name.
//   doc.cta.heading              plain object hops, no array anywhere
//   doc.functionality[0].subsections[1].heading      arbitrary depth, several array hops
//
// WHY THIS IS A WALKER NOW, AND WHY THAT IS STILL SAFE. This used to be one regex allowing exactly
// one array index and one optional leading hop, because a general dotted walker looked like it
// would have to accept "seo_data.meta_title" — a dropped array index, almost always a caller bug,
// which must fail loudly rather than become a silent no-op. That restriction cost real defects:
// heading-style.ts emits six Doc heading shapes and only `doc.functionality[i].heading` parsed, so
// findings on `doc.cta.heading`, `doc.specs.heading` and any nested `subsections[j].heading` could
// be reported but never repaired (the field-scoped rung is the ONLY instrument the warning-only
// heading rule has on a Doc — see REPAIR_STRATEGIES' heading-product-name-stuffing entry).
//
// The dropped-index bug is now caught by the DATA rather than by the string: a segment carrying no
// index whose value IS an array throws "unsupported path". That rejects "seo_data.meta_title"
// exactly as before while letting "doc.cta.heading" — object hops all the way down — resolve. Two
// grammar-level rejections remain, since no data can decide them: a malformed segment, and a
// single segment with no index ("nonsense"), which is a bare property name rather than an address.
//
// Every hop guards for a missing intermediate. The walk is N deep now, so a Doc without a `cta`
// must produce a named error, never a TypeError from dereferencing undefined.
//
// ONE SEMANTIC TIGHTENING came with this: the array-without-index check applies to the LAST segment
// too, so a path whose leaf is an array (`doc.figures`) now throws where the old code returned the
// array and let applyTier advance quietly on "not a string". No rule emits such a path today —
// every `path` in the codebase addresses a string leaf — and a rule that started to would be making
// the same dropped-index mistake, so failing loudly is the intended reading.

interface Segment { prop: string; index?: number }

const SEGMENT_RE = /^([A-Za-z_$][\w$]*)(?:\[(\d+)\])?$/;

function parsePath(path: string): Segment[] {
  const raw = path.split('.');
  const segments: Segment[] = [];
  for (const part of raw) {
    const m = SEGMENT_RE.exec(part);
    if (!m) throw new Error(`repair-strategy: unsupported path "${path}" (segment "${part}" is not prop or prop[i])`);
    segments.push({ prop: m[1], index: m[2] === undefined ? undefined : Number(m[2]) });
  }
  // A lone property name is an address to nothing — "nonsense" names no field of any artifact this
  // gate repairs. Kept a hard error so a caller bug cannot degrade into a silent no-op.
  if (segments.length === 1 && segments[0].index === undefined) {
    throw new Error(`repair-strategy: unsupported path "${path}" (a single segment must carry an index, e.g. "slugs[0]")`);
  }
  return segments;
}

/**
 * Descends one segment. `mutating` selects the contract: reads degrade to undefined on a missing
 * hop, writes throw — a silent no-op would let a failed repair look like a successful one.
 * Returns undefined only in the read case.
 */
function step(container: unknown, seg: Segment, path: string, mutating: boolean): unknown {
  if (container === null || container === undefined) {
    if (!mutating) return undefined;
    throw new Error(`repair-strategy: cannot resolve "${seg.prop}" in path "${path}" — the containing value is missing`);
  }
  const value = (container as Record<string, unknown>)[seg.prop];

  if (seg.index === undefined) {
    // The dropped-index caller bug — see the note above. Loud in BOTH directions: a read that
    // quietly returned undefined here is exactly the silent no-op this check exists to prevent.
    if (Array.isArray(value)) {
      throw new Error(`repair-strategy: unsupported path "${path}" ("${seg.prop}" is an array addressed without an index)`);
    }
    return value;
  }

  if (!Array.isArray(value)) {
    if (!mutating) return undefined;
    throw new Error(`repair-strategy: "${seg.prop}" is not an array on the artifact`);
  }
  if (value[seg.index] === undefined) {
    if (!mutating) return undefined;
    throw new Error(`repair-strategy: index ${seg.index} is out of range for "${seg.prop}"`);
  }
  return value[seg.index];
}

/** Reads the value a `path` addresses, or undefined when any hop is missing. */
export function getAtPath(artifact: unknown, path: string): unknown {
  let current: unknown = artifact;
  for (const seg of parsePath(path)) {
    current = step(current, seg, path, false);
    if (current === undefined) return undefined;
  }
  return current;
}

/**
 * Returns a copy with exactly one leaf replaced. Everything not on the addressed route keeps its
 * original reference, so a caller can prove monotonicity by identity: any sibling that changed
 * identity was rewritten by something other than this function.
 *
 * Throws when the path does not resolve — a silent no-op would let a failed repair look like a
 * successful one.
 */
export function setAtPath<T>(artifact: T, path: string, value: unknown): T {
  const segments = parsePath(path);

  const write = (container: unknown, depth: number): unknown => {
    const seg = segments[depth];
    const last = depth === segments.length - 1;
    // Validates this hop and surfaces the same errors a read would skip past.
    const child = step(container, seg, path, true);
    // Named for the hop that is actually missing, not the one below it: with `doc.cta` absent,
    // "cannot resolve \"cta\"" points at the gap, while descending first would blame "heading".
    if (!last && (child === null || child === undefined)) {
      throw new Error(`repair-strategy: cannot resolve "${seg.prop}" in path "${path}" — the value is missing`);
    }
    const next = last ? value : write(child, depth + 1);
    const base = container as Record<string, unknown>;

    if (seg.index === undefined) return { ...base, [seg.prop]: next };
    const arr = (base[seg.prop] as unknown[]).slice();
    arr[seg.index] = next;
    return { ...base, [seg.prop]: arr };
  };

  return write(artifact, 0) as T;
}

// ── Tier-0 primitives ──────────────────────────────────────────────────────────

/**
 * Cuts `text` to `limit` characters on a word boundary.
 *
 * A trailing " | Suffix" segment is preserved when one exists and still fits — task-b.ts's own
 * meta_title example uses the "Product - spec | StoreName" convention, and blindly cutting the tail
 * would drop the store name, which is the part with the least redundancy.
 *
 * This is a CORRECTNESS terminator, not a quality path: its output is deliberately worse prose than
 * a tier-1 rewrite, which is exactly why meta-title-length attempts tier 1 first. Returns null when
 * it cannot get under the limit without producing an empty string.
 */
export function truncateAtWordBoundary(text: string, limit: number): string | null {
  const chars = Array.from(text.trim());
  if (chars.length <= limit) return text.trim();

  const sepIndex = text.lastIndexOf(' | ');
  if (sepIndex > 0) {
    const suffix = text.slice(sepIndex); // includes " | "
    const head = text.slice(0, sepIndex);
    const headBudget = limit - Array.from(suffix).length;
    // Only worth preserving when the suffix leaves room for a non-trivial head.
    if (headBudget >= 8) {
      const cutHead = cutOnWordBoundary(head, headBudget);
      if (cutHead) return `${cutHead}${suffix}`;
    }
  }

  return cutOnWordBoundary(text, limit);
}

function cutOnWordBoundary(text: string, limit: number): string | null {
  const chars = Array.from(text.trim());
  if (chars.length <= limit) return text.trim();
  const clipped = chars.slice(0, limit).join('');
  const lastSpace = clipped.lastIndexOf(' ');
  const cut = (lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).replace(/[\s\-–—|,:;.]+$/, '').trim();
  return cut.length > 0 ? cut : null;
}

/**
 * Coerces a string into SLUG_PATTERN: lowercase, [a-z0-9-], no stray or repeated hyphens.
 *
 * The final SLUG_PATTERN.test is not belt-and-braces — it is the contract. Returning null rather
 * than a still-invalid string is what lets the gate report the repair as failed instead of
 * substituting a value that fails validation again on the next pass.
 */
export function slugify(text: string): string | null {
  const out = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics exposed by NFKD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return out.length > 0 && SLUG_PATTERN.test(out) ? out : null;
}

// ── Registry ───────────────────────────────────────────────────────────────────
//
// Nothing is added here by analogy. Each rule needs its own argument for why a cheap instrument
// can satisfy its constraint, and sentence-too-long earned its block rung by that route.
//
// spec-row-not-grounded is DELIBERATELY ABSENT, and it was registered once and removed. Repair is
// only worth attaching to a finding that is TRUE, and this one is not reliably true: it grounds a
// §7 label by stem-matching against a SECOND, independent translation of the same English
// parameter, so "Alarm Method" rendered as "Спосіб сповіщення" in the table and something else in
// the grounding source counts as unsupported. A real run shipped a §7 table with 15 correct rows
// and one flagged, and WHICH one changed between runs. Repairing on that means instructing the
// model to rename a correctly named row — worse than leaving it alone. Terminology and tone rules
// stay out for the older reason: they are genuine prose-quality judgements.

export const REPAIR_STRATEGIES: ReadonlyMap<string, RepairStrategy> = new Map<string, RepairStrategy>([
  [
    'meta-title-length',
    {
      // Tier 1 FIRST: meta-title wording carries SEO value. Tier 0 is the guaranteed terminator.
      ladder: ['field-scoped', 'deterministic'],
      deterministic: (current, issue) => {
        const limit = issue.measured?.limit;
        return typeof limit === 'number' ? truncateAtWordBoundary(current, limit) : null;
      },
      fieldInstruction: (current, issue) => {
        const actual = issue.measured?.actual ?? Array.from(current).length;
        const limit = issue.measured?.limit ?? 0;
        const surplus = Math.max(0, actual - limit);
        // State the arithmetic the model cannot do for itself. Read from `measured` — never
        // regex-parsed back out of `detail`.
        return [
          'Shorten this meta_title so it fits the character limit.',
          `Current length: ${actual} characters. Limit: ${limit}. Remove at least ${surplus}.`,
          'Keep the product name and the store suffix after " | " if one is present.',
          'Return ONLY the corrected title as plain text — no quotes, no commentary, no JSON.',
          '',
          current,
        ].join('\n');
      },
    },
  ],
  [
    'slug-charset',
    {
      // Fully mechanical — never worth an LLM call.
      ladder: ['deterministic'],
      deterministic: current => slugify(current),
    },
  ],
  [
    'sentence-too-long',
    {
      // The exclusion note above said prose rules each need their own argument. Here it is.
      //
      // What made a prose rule dangerous was never the judgement — it was the instrument. Fixing a
      // 21-word sentence used to mean regenerating the whole description, and full regeneration is
      // free to break the paragraphs it was not asked about. A block rewrite cannot: it replaces
      // one addressed block, and utils/block-repair.ts's rejectPatch throws the rewrite away unless
      // the tag, attributes, media and numbers all survive it. The worst outcome is that the block
      // is left exactly as it was.
      //
      // No deterministic rung: where to split a sentence is a genuine judgement, and a mechanical
      // split at the midpoint produces two ungrammatical halves. No fieldInstruction either — the
      // block executor groups every finding in a block into ONE rewrite, which a per-issue rung
      // cannot express. The instruction is the validator's own `detail`, verbatim.
      // TWO rungs of the same instrument, because one is demonstrably not enough. On the first
      // real run the model split an independent tail off the paragraph and left a three-item
      // enumeration intact: the sentence was still 26 words against a ceiling of 20 — patched,
      // accepted, unresolved, no retry. The second attempt starts from the already-improved text
      // and from a request narrowed to one block instead of eleven.
      //
      // Not three: a sentence that survives two explicit instructions is one the instruction
      // cannot break, and it should reach the report honestly rather than burn a third call.
      ladder: ['block-scoped', 'block-scoped'],
    },
  ],
  [
    'heading-product-name-stuffing',
    {
      // Warning-only, by construction (see checkProductNameStuffing/checkProductNameStuffingDoc):
      // resolveLadder never appends 'full-regen' after a warning's own ladder, so the rungs below
      // are the ONLY instruments this rule can ever be repaired by — without this strategy the
      // rule was unconditionally "reported, never repaired" (see isLadderCandidate's doc comment
      // and the 2026-08 EXPERT3D Ortur F10 10W incident this strategy was added to close).
      //
      // TWO rungs serving TWO artifact shapes with ONE shared ladder, not a mistake — this rule
      // fires on both a Doc (`path` like "doc.functionality[2].heading", repair-strategy.ts's
      // wrapperProp addressing) and an HTML string (`path` like "block[5]", block-repair.ts's own
      // grammar). Each tier's executor only acts when the path shape actually matches what it
      // knows how to address, and is a documented, harmless no-op otherwise:
      //   - field-scoped calls getAtPath/setAtPath (repair-strategy.ts), which understands
      //     "doc.…[i].leaf" but returns undefined for "block[5]" (a plain string has no `.block`
      //     property) — applyTier reads that as "nothing to replace" and just advances the cursor.
      //   - block-scoped calls repairBlocks, which for an HTML artifact is block-repair.ts's
      //     getBlock/setBlock (understands "block[5]") and for a Doc artifact is doc-tier.ts's
      //     Doc-shaped executor (runDocGate now wires one — see content-orchestrator.service.ts).
      //     The Doc executor resolves paths against the UNWRAPPED ProductDescriptionDoc, so a
      //     "doc."-prefixed wrapper-relative path (what this rule's own field-scoped rung already
      //     resolved on the first pass) still no-ops on the second rung — harmless for the same
      //     reason as before, just "wrong prefix for this executor" rather than "no executor
      //     exists".
      // So on a Doc artifact this ladder resolves in one field-scoped pass; on an HTML artifact
      // the field-scoped pass harmlessly no-ops and the SECOND pass reaches block-scoped, which
      // does the real work via whichever gate's `repairBlocks: this.blockRepairer(...)` is wired
      // (Task C, the consumables master, FAQ — see content-orchestrator.service.ts).
      ladder: ['field-scoped', 'block-scoped'],
      fieldInstruction: (current, issue) => [
        'Rewrite this heading so it satisfies the constraint below. Return ONLY the corrected',
        'heading text as plain text — no quotes, no HTML tags, no commentary.',
        '',
        // issue.detail already names the exact required short form (productShort(productName)),
        // computed once by the validator — never re-derived here, so the instruction always
        // matches whatever this run's product actually is.
        issue.detail,
        '',
        `Current heading: "${current}"`,
      ].join('\n'),
    },
  ],
]);

/**
 * May this issue enter the ladder at all?
 *
 * Errors always could. Warnings are new, and admitted narrowly: a warning must be ADDRESSABLE
 * (it carries a `path`) and REGISTERED (its rule has a strategy). A warning failing either test
 * behaves exactly as it did before the ladder existed — reported, never repaired — which keeps the
 * un-migrated rules in output-validator.ts unaffected.
 */
export function isLadderCandidate(issue: ValidationIssue): boolean {
  if (issue.severity === 'error') return true;
  return !!issue.path && REPAIR_STRATEGIES.has(issue.rule);
}

/**
 * The ladder for one issue, always terminated by 'full-regen'.
 *
 * Returns ['full-regen'] — today's behaviour, unchanged — for any rule with no registered strategy
 * OR no `path`. That fallback is what makes the whole feature additive: an un-migrated rule behaves
 * exactly as it did before the ladder existed.
 */
export function resolveLadder(issue: ValidationIssue): RepairTier[] {
  const strategy = REPAIR_STRATEGIES.get(issue.rule);
  if (!strategy || !issue.path) return ['full-regen'];
  // A warning never reaches full regeneration. That instrument rewrites the whole artifact and is
  // free to break fields it was not asked about; spending it on a stylistic finding trades a
  // cosmetic problem for a correctness risk. A warning that its cheap rungs cannot fix stays
  // reported, exactly as before — which is also what keeps it honest when the fix genuinely fails.
  if (issue.severity === 'warning') return [...strategy.ladder];
  return [...strategy.ladder, 'full-regen'];
}

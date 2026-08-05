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
// Three forms:
//   arrayProp[i].leafProp        'seo_data[2].meta_title', 'slugs[0].slug'
//   arrayProp[i]                 'slugs[0]'  — element-level replacement
//   wrapperProp.arrayProp[i]...  'doc.functionality[2].heading' — ONE optional leading
//                                 object-property hop before the array form, added for
//                                 runDocGate's `{ doc, issues }` wrapper: a Doc validator's
//                                 own path (e.g. `functionality[2].heading`, relative to the
//                                 Doc) is not relative to the artifact runRepairGate<DocAttempt>
//                                 actually holds, so its emitter prefixes it with the wrapper's
//                                 own property name.
// Anything else throws. A malformed path from a future rule must fail loudly rather than be
// mistaken for "nothing to fix". Deliberately NOT a general dotted-path walker: an unbracketed
// path like "seo_data.meta_title" stays unsupported (see repair-strategy.spec.ts) because it is
// almost always a caller bug — the array index was dropped, not intentionally omitted — and a
// walker that quietly accepted it would turn that bug into a silent no-op instead of a thrown
// error. The one addition here is a SINGLE named hop, not arbitrary nesting.

const PATH_RE = /^(?:([A-Za-z_$][\w$]*)\.)?([A-Za-z_$][\w$]*)\[(\d+)\](?:\.([A-Za-z_$][\w$]*))?$/;

function parsePath(path: string): { wrapperProp?: string; arrayProp: string; index: number; leafProp?: string } {
  const m = PATH_RE.exec(path);
  if (!m) throw new Error(`repair-strategy: unsupported path "${path}" (expected arrayProp[i], arrayProp[i].leafProp, or wrapperProp.arrayProp[i].leafProp)`);
  return { wrapperProp: m[1], arrayProp: m[2], index: Number(m[3]), leafProp: m[4] };
}

/** Reads the value a `path` addresses, or undefined when any hop is missing. */
export function getAtPath(artifact: unknown, path: string): unknown {
  const { wrapperProp, arrayProp, index, leafProp } = parsePath(path);
  const base = wrapperProp
    ? (artifact as Record<string, unknown> | null)?.[wrapperProp]
    : artifact;
  const arr = (base as Record<string, unknown> | null)?.[arrayProp];
  if (!Array.isArray(arr)) return undefined;
  const element = arr[index];
  if (element === undefined) return undefined;
  return leafProp ? (element as Record<string, unknown>)[leafProp] : element;
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
  const { wrapperProp, arrayProp, index, leafProp } = parsePath(path);
  const root = artifact as unknown as Record<string, unknown>;
  const base = (wrapperProp ? root?.[wrapperProp] : root) as Record<string, unknown> | undefined;
  const arr = base?.[arrayProp];
  if (!Array.isArray(arr)) throw new Error(`repair-strategy: "${arrayProp}" is not an array on the artifact`);
  if (arr[index] === undefined) throw new Error(`repair-strategy: index ${index} is out of range for "${arrayProp}"`);

  const nextArr = arr.slice();
  nextArr[index] = leafProp
    ? { ...(arr[index] as Record<string, unknown>), [leafProp]: value }
    : value;
  if (!wrapperProp) return { ...root, [arrayProp]: nextArr } as unknown as T;
  return {
    ...root,
    [wrapperProp]: { ...(base as Record<string, unknown>), [arrayProp]: nextArr },
  } as unknown as T;
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
      //   - block-scoped calls repairBlocks (block-repair.ts's getBlock/setBlock), which
      //     understands "block[5]" but never receives a Doc-shaped issue at all, because
      //     runDocGate does not wire a repairBlocks executor (block-scoped repair for the Doc path
      //     is still out of scope — see runDocGate's own comment).
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

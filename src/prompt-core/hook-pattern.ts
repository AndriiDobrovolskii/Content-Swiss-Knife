/**
 * hook-pattern.ts
 *
 * Which v4 §1 structural pattern a given product's hook uses.
 *
 * WHAT THIS EXISTS TO PREVENT. v4 §1 is «Антиконвеєр»: the opening paragraph must not read as
 * though it came off a production line. Left to the model, it does — generation is stateless per
 * product (OD-3), so the model has no memory of the previous product and no way to vary against it.
 * Every description in a batch opens the same way, and the batch reads as a template with the
 * nouns swapped.
 *
 * WHY A PURE FUNCTION AND NOT A COUNTER. NFR-5 forbids a run counter and a wall clock by name, and
 * both would make the output depend on how many other products were generated first — the same
 * product would draw a different hook on a re-run, which breaks reproducibility for a feature whose
 * whole purpose is variety ACROSS products, not across runs. Keying on the product itself gives
 * variety between neighbours in a batch while keeping any one product's hook stable forever.
 *
 * DETERMINISM ALONE IS NOT THE REQUIREMENT, which is the trap FR-14 is written against. A selector
 * returning pattern 1 for everything satisfies "deterministic, service-side, at least 4 patterns"
 * in full while making AC-9 unachievable for any batch. So FR-14 also states a DISTRIBUTION
 * property, and that is why the index below hashes the WHOLE `name` + `website` pair rather than a
 * character of it: `name.charCodeAt(0) % 4` is deterministic, cheap, and gives every Creality
 * product in a catalogue the same hook shape.
 *
 * The selection is made by the SERVICE layer before the prompt payload is built (T8), and the
 * chosen pattern's instruction rides in `userContent` — the one block payload.ts documents as
 * "dynamic, never cached". Putting it in a cached system block would pin one pattern across every
 * product sharing the cache prefix, which is the same failure as a constant selector.
 */

/** One v4 §1 structural opening. `instruction` is prompt text; `id` is what logs and tests name. */
export interface HookPattern {
  id: string;
  instruction: string;
}

/**
 * The v4 §1 structural patterns.
 *
 * Five rather than the plan's floor of four, and they are STRUCTURES rather than topics: each one
 * fixes what the first two sentences DO, not what they are about. A topic list would collapse back
 * into sameness the moment two products in a batch shared a topic.
 *
 * None of them states a word range, a tag or a section rule. Those belong to the task instruction
 * (`task-a-doc.ts`) and the master prompt, and restating them here would give the model two
 * authorities for the same rule that could later disagree.
 */
export const HOOK_PATTERNS: readonly HookPattern[] = [
  {
    id: 'problem-first',
    instruction:
      'Open §1 with the concrete production problem this product removes — the failure, delay or ' +
      'manual step the reader recognises from their own workflow — and only then name the product ' +
      'as what resolves it.',
  },
  {
    id: 'spec-anchor',
    instruction:
      'Open §1 with the single most decisive technical value of this product and what it makes ' +
      'possible in practice. Lead with that value, not with the product category.',
  },
  {
    id: 'scenario',
    instruction:
      'Open §1 inside one concrete working scenario — a specific job, material or batch this ' +
      'product is used for — and let the product enter the sentence as the tool doing that job.',
  },
  {
    id: 'contrast',
    instruction:
      'Open §1 by contrasting this product with the class of equipment it replaces or upgrades ' +
      'from, stating the practical difference the operator feels. Do not disparage a named ' +
      'competitor; contrast with the category.',
  },
  {
    id: 'outcome',
    instruction:
      'Open §1 with the measurable outcome the operator gets — throughput, accuracy, finish or ' +
      'cost per part — and attribute it to the specific capability of this product that delivers it.',
  },
];

/**
 * FNV-1a over the whole input, 32-bit.
 *
 * Written with `reduce` rather than a loop because the module must hold no mutable binding at all
 * (NFR-5, asserted against the source text itself): purity here is a property a reviewer and a
 * test can both read off the file, not something to infer from behaviour.
 *
 * `Array.from` iterates CODE POINTS, so a product name outside the BMP hashes as one unit rather
 * than as two surrogate halves — Cyrillic model names are ordinary BMP characters, but a name
 * carrying an emoji or a rare CJK ideograph would otherwise split mid-character.
 *
 * `Math.imul` keeps the multiply in 32-bit integer space; `>>> 0` keeps the accumulator unsigned,
 * so the final modulo never sees a negative operand and never returns a negative index.
 */
function fnv1a(input: string): number {
  return Array.from(input).reduce(
    (hash, character) => Math.imul(hash ^ (character.codePointAt(0) ?? 0), 16777619) >>> 0,
    2166136261,
  );
}

/**
 * The v4 §1 structural pattern for one product at one store.
 *
 * Pure, total and deterministic: the same `name` + `website` yields the same pattern on every call,
 * in every process, forever (NFR-5). The same product at a DIFFERENT store may draw a different
 * pattern, which is FR-14's explicit consequence rather than a side effect — a store's catalogue is
 * what a reader browses, so that is the axis variety has to hold along.
 *
 * The two fields are joined with U+0000, a character neither a product name nor a store name can
 * contain. Concatenating them bare would make ("Ortur H2", "0 EXPERT3D") and ("Ortur H20",
 * " EXPERT3D") hash identically — a collision class that is invisible until two real products
 * happen to straddle the boundary.
 */
export function selectHookPattern(name: string, website: string): HookPattern {
  return HOOK_PATTERNS[fnv1a(`${name}\u0000${website}`) % HOOK_PATTERNS.length];
}

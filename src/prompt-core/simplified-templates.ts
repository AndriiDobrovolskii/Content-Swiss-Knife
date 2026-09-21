/**
 * Simplified content templates (US-2.2): the single source of truth for the three simplified
 * templates. Full description is NOT here: its identity is `templateId === undefined` (OD-5).
 *
 * Pure and dependency-free on purpose: FROZEN prompt files and the validator may import it
 * without adding dependency edges (AGENTS.md §9, sibling-file pattern).
 */

export const SIMPLIFIED_TEMPLATE_IDS = ['filaments-resins-powders', 'accessories', 'spare-parts'] as const;

export type SimplifiedTemplateId = (typeof SIMPLIFIED_TEMPLATE_IDS)[number];

/** Unknown, empty or stale ids (a stale persisted id) are false and behave as Full (D14). */
export function isSimplifiedTemplateId(id?: string | null): id is SimplifiedTemplateId {
  return typeof id === 'string' && (SIMPLIFIED_TEMPLATE_IDS as readonly string[]).includes(id);
}

/**
 * The ordered v4 paragraph numbers (1..9) a template requests. §5 (compatibility) and §7
 * (specifications) stay listed even though the prompt makes them conditional on source data
 * (FR-10, FR-11). Accessories gets §3 only when the functionality flag is set (FR-9).
 */
export function paragraphsFor(
  templateId: SimplifiedTemplateId,
  opts: { includeFunctionality?: boolean } = {},
): number[] {
  switch (templateId) {
    case 'filaments-resins-powders':
      return [1, 2, 4, 5, 7, 8];
    case 'accessories':
      return opts.includeFunctionality ? [1, 2, 3, 5, 7, 8] : [1, 2, 5, 7, 8];
    case 'spare-parts':
      return [1, 5, 8];
  }
}

export interface WordRange {
  min: number;
  max: number;
}

/** v4 word ranges per paragraph. `block2` is the merged Killer Specs + Key Benefits block. */
export const V4_WORD_RANGES = {
  hook: { min: 40, max: 85 },
  block2: { min: 90, max: 300 },
  applications: { min: 80, max: 250 },
  compatibility: { min: 30, max: 100 },
  cta: { min: 50, max: 100 },
  faq: { min: 150, max: 400 },
} as const satisfies Record<string, WordRange>;

/** Max items in the merged killerSpecs + keyBenefits list. */
export const BLOCK2_MAX_ITEMS = 8;

/** Soft ceiling on narrative characters; the v4 word ranges win over it (OD-11). It never yields an issue. */
export const NARRATIVE_SOFT_CEILING = 5500;

/**
 * Whitespace-delimited word count of tag-stripped text. Shared by both validator entry points.
 * A token with no letter or digit (an em dash, a bare bullet mark) is punctuation, not a word.
 */
export function countWords(text: string): number {
  const plain = text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
  const words = plain.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w));
  return words.length;
}

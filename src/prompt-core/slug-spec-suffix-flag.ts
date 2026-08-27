/**
 * slug-spec-suffix-flag.ts
 *
 * Which stores append a deterministic killer-spec suffix to generated URL slugs (e.g.
 * "-power-20-w"), sourced from `ProductDescriptionDoc.killerSpecs[0]`.
 *
 * WHY A ROLLOUT LIST AND NOT A GLOBAL SWITCH, mirroring doc-pipeline-flag.ts's DOC_PIPELINE_STORES.
 * This changes a URL a store may publish and index — a bad first run is not just a bad HTML block,
 * it is a bad slug an editor may already have approved and shipped. Unproven at any scale beyond
 * the two hand-verified corpus docs used to design it, both from one product family (laser
 * engravers). Flipping every store at once would make the first broad test of this feature a
 * production event on every storefront's URLs simultaneously.
 *
 * OPT-IN, NEVER OPT-OUT. A store absent from the list keeps generating slugs exactly as before —
 * no suffix, current behavior — so enabling this feature is always a deliberate, reviewable,
 * one-line addition, never an accidental side effect of another change.
 */
export const SLUG_SPEC_SUFFIX_STORES: readonly string[] = [];

export function usesSlugSpecSuffix(storeName: string): boolean {
  return SLUG_SPEC_SUFFIX_STORES.includes(storeName);
}

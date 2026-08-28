/**
 * slug-context-enrichment-flag.ts
 *
 * Which stores let the Slug task append a killer-spec suffix to the generated product name (e.g.
 * "... точність 0,015 мм"), read directly out of whatever `[CONTEXT]` `buildPromptSlug` receives —
 * Doc-pipeline HTML or raw pasted text alike, since the LLM reads it, not code.
 *
 * WHY A ROLLOUT LIST AND NOT A GLOBAL SWITCH, mirroring doc-pipeline-flag.ts's DOC_PIPELINE_STORES.
 * `[CONTEXT]` is already populated for every store today (Task A HTML in the main pipeline,
 * unconditionally; the Slug-only UI's description field once populated) — so without a gate this
 * rule activates for every product on every store the instant it ships. This changes a URL a store
 * may publish and index; flipping every store at once would make the first broad test of this a
 * production event on every storefront simultaneously.
 *
 * OPT-IN, NEVER OPT-OUT. A store absent from the list gets the prompt exactly as it reads today —
 * no suffix, current behavior — so enabling this feature is always a deliberate, one-line addition.
 */
// "Center 3D Print" enabled 2026-08-28, after a live probe across Slug-only, Generator, and UA
// Description modes all passed (Rule 9 correctly picked one clean spec and localized it per
// language in every run), and after fixing the one real defect the probe surfaced —
// invariantCore's "Laser" gap (#113), unrelated to this feature but blocking clean output for
// this store's laser-engraver products specifically.
export const SLUG_CONTEXT_ENRICHMENT_STORES: readonly string[] = ['Center 3D Print'];

export function usesSlugContextEnrichment(storeName: string): boolean {
  return SLUG_CONTEXT_ENRICHMENT_STORES.includes(storeName);
}

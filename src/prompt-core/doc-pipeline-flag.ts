/**
 * doc-pipeline-flag.ts
 *
 * Which stores generate through the Doc pipeline (model emits a ProductDescriptionDoc,
 * renderDescription() builds the HTML) rather than asking the model for HTML directly.
 *
 * WHY A ROLLOUT LIST AND NOT A GLOBAL SWITCH. The live probe passed 4/4 — a real model produced a
 * valid Doc that rendered with zero validator errors — but that is ONE product, ONE store, ONE
 * locale. It settles feasibility; it does not measure reliability. Flipping every store at once
 * would make the first broad test of the model half of the pipeline a production event.
 *
 * OPT-IN, NEVER OPT-OUT. A store absent from the list keeps the HTML path, so adding a store to
 * STORE_REGISTRY can never silently enrol it in an unproven pipeline. Widening the rollout is one
 * line here, and the tests check that every listed store exists and can actually render.
 */
import { STORE_REGISTRY } from './constants';

/**
 * EXPERT3D is the store the live probe exercised, so it is the only one with direct evidence
 * behind it. Add a store here only after a probe run for it looks right.
 */
export const DOC_PIPELINE_STORES: readonly string[] = ['EXPERT3D'];

/**
 * Consumables are excluded unconditionally, and this is a proven impossibility rather than caution.
 * A §C1–§C6 artifact cannot be expressed as a ProductDescriptionDoc at all: both MANDATORY fields
 * have no source in it — there is no `<thead>` killer-specs table for §2a, and no
 * `<section class="specs">` for §7 (§C4 "Склад комплекту" is a bare `div.table-responsive` sitting
 * inside an `<h2>` group, a position the model has no slot for). Consumables need their own
 * document model; until they have one, they stay on the HTML path. See the §C tests in
 * test/tools/scaffold-doc.spec.ts.
 */
export function usesDocPipeline(storeName: string, templateId?: string): boolean {
  if (templateId === 'consumables-resin') return false;
  if (!DOC_PIPELINE_STORES.includes(storeName)) return false;
  // A store with no image base cannot render — renderContextFor() throws rather than emit relative
  // <img src>. Checked here too so a registry edit cannot turn an enabled store into a hard failure.
  return !!STORE_REGISTRY[storeName]?.imageBaseUrl;
}

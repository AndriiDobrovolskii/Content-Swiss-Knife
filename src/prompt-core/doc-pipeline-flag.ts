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
 * Add a store here only after the evidence supports it.
 *
 * EXPERT3D came first — the live probe exercised it, and by 2026-08-02 it had a clean run
 * (`generation_log`: one `ok` with zero repairs, one `repaired`, no `failed-schema`) whose four
 * locales passed every acceptance criterion by inspection.
 *
 * The UA group followed. Their readiness was verified rather than assumed: `KILLER_SPECS_HEADERS`
 * (§2a), `SPEC_TABLE_HEADERS` (§7) and `FIGCAPTION_TEMPLATES` (video) all cover `uk-ua`, `ru-ua`
 * and `en-gb`; all three stores have a real `imageBaseUrl`; and `masterScriptFor` is 'Cyrillic',
 * the same as EXPERT3D.
 *
 * Two things are genuinely first-time on this path, so watch the first run of each: `ru-UA` has
 * never rendered through the Doc pipeline, and these stores take the DEFAULT Tone of Voice
 * (neither isExpert3dStore nor isCenter3dPrintStore), which the Doc pipeline has never exercised.
 *
 * Center 3D Print came next, and it was the last store that needed CODE before it could be
 * enrolled rather than just evidence. It is the only store with a ToV override
 * (`KILLER_SPECS_HEADERS_C3D`) and the only user of the §5b `operatingTips` slot, and its overlay
 * instructs the model to "Emit an H2 'Tips for operating [Product]'" — which the Doc contract
 * forbids, while the correct action (populate `operatingTips`) was stated nowhere. Resolved in
 * `TASK_A_DOC_INSTRUCTION`, whose §5b clause interpolates `OPERATING_TIPS_H2_MARKERS` so the
 * heading stays detectable by `tov-second-person.ts`.
 *
 * `Drukarka 3D` needed no code at all — 2 locales, default voice, no override, no §5b — and
 * completes the rollout.
 *
 * EVERY LIVE STORE IS NOW ON THIS LIST. The one absentee is `Expert-3DPrinter`, a placeholder that
 * is not yet trading: its `imageBaseUrl` is `''`, so `renderContextFor()` refuses it by design
 * rather than emitting relative `<img src>`. It joins when it has its own CDN path — it must NOT
 * borrow the Spanish store's domain.
 *
 * The list stays OPT-IN even now that it is complete: a store added to STORE_REGISTRY must be
 * named here too, so a new storefront cannot be enrolled in the Doc pipeline by accident.
 */
export const DOC_PIPELINE_STORES: readonly string[] = [
  'EXPERT3D',
  '3DDevice', '3DPrinter', '3DScanner',
  'Center 3D Print',
  'Drukarka 3D',
];

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

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
 * (`KILLER_SPECS_HEADERS_C3D`). An earlier §5b `operatingTips` slot and its "Tips for operating
 * [Product]" instruction have since been removed entirely — the PDP stays scoped to pre-purchase
 * content; post-purchase operating/safety tips no longer ship in the description.
 *
 * `Drukarka 3D` needed no code at all — 2 locales, default voice, no override — and
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
 * Whether a store's Task A runs through the Doc pipeline. Every template (Full description and the
 * three simplified content templates alike) takes the pipeline the store is enrolled in; the
 * template id plays no part (US-2.2 FR-7). The parameter is accepted so call sites keep passing it
 * and a later template-specific rule has a place to land; it is deliberately ignored today.
 */
export function usesDocPipeline(storeName: string, _templateId?: string): boolean {
  if (!DOC_PIPELINE_STORES.includes(storeName)) return false;
  // A store with no image base cannot render — renderContextFor() throws rather than emit relative
  // <img src>. Checked here too so a registry edit cannot turn an enabled store into a hard failure.
  return !!STORE_REGISTRY[storeName]?.imageBaseUrl;
}

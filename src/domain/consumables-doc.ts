/**
 * consumables-doc.ts
 *
 * The typed content model for the CONSUMABLES SIMPLIFIED SCHEMA (§C1–§C6) — a separate document
 * family from ProductDescriptionDoc, not a variant of it. doc-pipeline-flag.ts documents why:
 * a §C artifact has no killer-specs table (§2a) and no <section class="specs"> (§7), both mandatory
 * on ProductDescriptionDoc, so it cannot be expressed there at all.
 *
 * ZERO RUNTIME DEPENDENCIES BY CONTRACT, same as description-doc.ts. Prose/BulletItem are imported
 * type-only from that module — erased at compile time, so this stays as portable as its sibling.
 *
 * Runtime validation lives in consumables-doc.schema.ts (zod). Rendering lives in
 * ../render/render-consumables.ts. Neither concern belongs in this file.
 */
import type { Prose, BulletItem } from './description-doc';

export type { Prose, BulletItem };

/**
 * §C4 — one table per parameter group ("Print Settings", "Mechanical Properties", "Physical
 * Properties", or a product-specific heading like "Склад комплекту" / Kit Contents — the one real
 * accepted §C artifact in the corpus uses exactly that last heading, not "Print Settings", which is
 * why this is a free-text heading rather than an enum). Zero or more groups: the schema text marks
 * the section "required if printing parameters are provided", so a product with none of them omits
 * §C4 entirely.
 */
export interface SpecGroup {
  heading: string;
  rows: { label: string; value: string }[];
}

export interface ConsumablesDescriptionDoc {
  /** Distinct from ProductDescriptionDoc's '3.0' — a document can never satisfy the wrong schema. */
  schemaVersion: 'C1';
  /** BCP47, e.g. "uk-UA". */
  locale: string;
  /** Authoritative localized product name. */
  localizedName: string;

  /** §C1 — one paragraph, no heading, no <section> wrapper. */
  hook: Prose;
  /** §C2 — 4–6 items. */
  features: { heading: string; items: BulletItem[] };
  /** §C3 — 3–4 items. BulletItem.lead carries the scenario label. */
  applications: { heading: string; items: BulletItem[] };
  /** §C4 — 0–3 groups. See SpecGroup's doc comment for why this is an array, not fixed slots. */
  specGroups: SpecGroup[];
  /** §C5 — 2–3 items. */
  storage: { heading: string; items: BulletItem[] };
  /** §C6 — plain closing paragraph after <hr>. No heading, no class="cta". */
  cta: Prose;

  // Figures are deliberately NOT modelled yet (2026-08-08). task-a.ts's buildImageBlock runs
  // unconditionally for consumables inputs too, so a generation CAN receive an image manifest, but
  // CONSUMABLES_SIMPLIFIED_SCHEMA never states where a figure would go and the one real corpus
  // fixture (3ddevice-formlabs-fuse1-uptime-kit) carries zero images. Modelling this without a real
  // accepted artifact to reconcile against would be exactly the kind of speculative shape the main
  // Doc migration's own report (test/render-reconciliation.report.md) warns against. Add it once a
  // real consumables artifact with an image exists.
}

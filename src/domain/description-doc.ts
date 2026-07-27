/**
 * description-doc.ts
 *
 * The typed content model the LLM will produce instead of raw HTML (Schema v3.0 §1–§9).
 *
 * ZERO DEPENDENCIES BY CONTRACT. This module is the shared vocabulary between the Angular app,
 * the (future) BFF renderer, and the validation layer. Adding an import here breaks that contract.
 *
 * Runtime validation lives in description-doc.schema.ts (zod). Rendering lives in
 * ../render/render-description.ts. Neither concern belongs in this file.
 */

/** Prose fields may contain <b>…</b> and nothing else. Enforced by the schema, sanitized by the renderer. */
export type Prose = string;

export interface KillerSpec {
  /** e.g. "Об'єм друку" */
  label: string;
  /** e.g. "250x250x260 мм" */
  value: string;
  /** §2 "why it matters" cell. */
  why: Prose;
}

export interface BulletItem {
  /** Rendered inside <b>. Ends with its own punctuation — the renderer adds none. */
  lead: string;
  text: Prose;
}

export type Block =
  | { kind: 'paragraph'; text: Prose }
  | { kind: 'bullets'; items: BulletItem[] }
  /** Index into ProductDescriptionDoc.figures. */
  | { kind: 'figure'; ref: number };

export interface Subsection {
  /**
   * Rendered as <h2> at the top level and <h3> when nested one level deep. Localized by the model.
   */
  heading: string;
  blocks: Block[];
  /**
   * Nested sub-headings (§3 legitimately uses H2/H3 — see the master prompt's
   * "§3 FUNCTIONALITY … 150–2,000 words, H2/H3", and every real artifact carries them).
   *
   * Depth is capped at 2 by ProductDescriptionDocSchema, which models the two levels as two
   * distinct non-recursive shapes rather than allowing arbitrary nesting. The type stays
   * self-referential because that keeps the renderer's recursion natural; the schema is the gate.
   */
  subsections?: Subsection[];
}

export interface SpecRow {
  label: string;
  value: string;
}

export interface SpecCategory {
  /** Rendered as the colspan=2 category header row. */
  title: string;
  rows: SpecRow[];
}

export interface Figure {
  /** Filename ONLY (e.g. "high-prec-scan.jpg"). The renderer builds the full src. */
  file: string;
  alt: string;
  caption: Prose;
}

export interface ProductDescriptionDoc {
  schemaVersion: '3.0';
  /** BCP47, e.g. "uk-UA". */
  locale: string;
  /** Authoritative localized product name — replaces the [H1 LOCK] prompt block in task-c.ts. */
  localizedName: string;

  /** §1 */
  hook: Prose;
  /** §2a — 3–4 rows. */
  killerSpecs: KillerSpec[];
  /** §2b */
  keyBenefits: Block[];
  /** §3 — one Subsection per H2. */
  functionality: Subsection[];
  /** §4 */
  applications: { heading: string; items: { scenario: string; text: Prose }[] };
  /** §5 — conditional. */
  compatibility?: Subsection;
  /** §6 — conditional. */
  packageContents?: { heading: string; items: string[] };
  /** §7 */
  specs: { heading: string; categories: SpecCategory[] };
  /** §9 */
  cta: { heading: string; text: Prose };

  /** Flat manifest. Blocks reference entries by index. Order = manifest order. */
  figures: Figure[];
}

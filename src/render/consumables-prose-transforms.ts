/**
 * consumables-prose-transforms.ts
 *
 * The Consumables sibling of doc-prose-transforms.ts — same job (rewrite a Doc's prose TEXT fields
 * before rendering, not the rendered HTML after), same production transform chain, but typed for
 * ConsumablesDescriptionDoc instead of ProductDescriptionDoc. A separate module, not a shared one:
 * consumables-doc.schema.ts documents why this document family duplicates rather than imports from
 * its sibling — the two families are independent by design, and coupling them for a few lines of
 * plumbing is the wrong trade.
 *
 * WHY THIS EXISTS. renderConsumablesDoc() (render-consumables.ts) is pure and total, same contract
 * as renderDescription() — Doc in, HTML out, cannot fail. Normalization is a different job (locale-
 * aware, text-rewriting) with different inputs, and the main ProductDescriptionDoc pipeline already
 * keeps it separate for that reason (see doc-prose-transforms.ts's own doc comment). Before this
 * file existed, runConsumablesDocGate's produce() called renderConsumablesDoc() directly with no
 * equivalent step — so a Latin-script unit ("1 kg") never became Cyrillic ("1 кг") in Consumables/
 * Accessories body prose, even though the storefront name field (Task Slug) always did. This module
 * closes that gap.
 *
 * DOM-FREE, like its sibling and like the renderer.
 */
import type { BulletItem, ConsumablesDescriptionDoc, ConsumablesFigure, SpecGroup } from '../domain/consumables-doc';
import { fixNumberFormatting } from '../utils/number-format-fixer';
import { fixDecimalSeparator } from '../utils/decimal-separator';
import { restoreIdentifierDots } from '../utils/identifier-decimal';
import { cyrillizeUnits } from '../utils/unit-cyrillize';
import { normalizeTerminology, canonicalizeMultiInOne } from '../utils/terminology-normalize';

/** A pure text→text rewrite. Duplicated from doc-prose-transforms.ts's identical alias — see the
 *  module doc comment for why this family doesn't import from its sibling. */
export type TextTransform = (text: string) => string;

/**
 * Strings that are NOT prose, addressed by JSON path.
 *
 *   schemaVersion / locale — machine values
 *   figures[].file         — a filename; normalizing "1.75" inside it would break the URL
 */
export const NON_TEXT_PATHS: readonly RegExp[] = [
  /^schemaVersion$/,
  /^locale$/,
  /^figures\[\d+\]\.file$/,
];

const mapBullets = (items: BulletItem[], fn: TextTransform): BulletItem[] =>
  items.map(i => ({ lead: fn(i.lead), text: fn(i.text) }));

const mapSpecGroup = (g: SpecGroup, fn: TextTransform): SpecGroup => ({
  heading: fn(g.heading),
  rows: g.rows.map(r => ({ label: fn(r.label), value: fn(r.value) })),
});

const mapFigure = (f: ConsumablesFigure, fn: TextTransform): ConsumablesFigure => ({
  file: f.file,
  alt: fn(f.alt),
  leadIn: fn(f.leadIn),
  caption: fn(f.caption),
});

/**
 * Applies `fn` to every prose-bearing field, returning a NEW document.
 *
 * Explicit field-by-field rebuild, not a generic deep walk — same reasoning as mapDocText: a
 * generic walk would rewrite `figures[].file` too, silently corrupting a filename that happens to
 * contain "1.75". Being explicit costs a few lines and makes an omission compile-visible instead of
 * a silent runtime gap.
 */
export function mapConsumablesDocText(doc: ConsumablesDescriptionDoc, fn: TextTransform): ConsumablesDescriptionDoc {
  return {
    schemaVersion: doc.schemaVersion,
    locale: doc.locale,
    localizedName: fn(doc.localizedName),

    hook: fn(doc.hook),
    features: { heading: fn(doc.features.heading), items: mapBullets(doc.features.items, fn) },
    applications: { heading: fn(doc.applications.heading), items: mapBullets(doc.applications.items, fn) },
    specGroups: doc.specGroups.map(g => mapSpecGroup(g, fn)),
    storage: { heading: fn(doc.storage.heading), items: mapBullets(doc.storage.items, fn) },
    cta: fn(doc.cta),

    figures: doc.figures.map(f => mapFigure(f, fn)),
  };
}

/**
 * The production normalization chain, applied to Doc text fields.
 *
 * IDENTICAL CHAIN AND ORDER TO doc-prose-transforms.ts's normalizeDocProse — copied, not re-derived,
 * so the two Doc families cannot silently diverge in behavior. See that function's doc comment for
 * why each step is where it is.
 */
export function normalizeConsumablesDocProse(doc: ConsumablesDescriptionDoc, locale: string): ConsumablesDescriptionDoc {
  return mapConsumablesDocText(doc, text =>
    canonicalizeMultiInOne(
      normalizeTerminology(
        cyrillizeUnits(
          restoreIdentifierDots(fixDecimalSeparator(fixNumberFormatting(text), locale), locale),
          locale,
        ),
        locale,
      ),
      locale,
    ),
  );
}

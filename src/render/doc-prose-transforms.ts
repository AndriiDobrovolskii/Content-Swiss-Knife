/**
 * doc-prose-transforms.ts
 *
 * The post-processing transforms that SURVIVE the migration, relocated from "post-process the
 * rendered HTML" to "transform the Doc's text fields before rendering" (report §3).
 *
 * Three transforms die with the HTML path — `stripCodeFences` (JSON parsing replaces it) and
 * `wrapVideoFigures` / `wrapImageFigures` (the renderer emits canonical figures directly). The rest
 * operate on prose TEXT and have no structural dependency, so they move here unchanged.
 *
 * WHY THIS IS A SEPARATE MODULE FROM THE RENDERER. `renderDescription()` is pure and total — "this
 * function CANNOT fail". Normalization is a different job with different inputs (it is locale-aware
 * and text-rewriting), and folding it in would make the renderer's output depend on orthography
 * rules. Doc in → Doc out, then render.
 *
 * DOM-FREE, like the renderer. All five underlying transforms are string-based, so this module
 * inherits that and stays portable to the BFF.
 */
import type {
  Block,
  BulletItem,
  ProductDescriptionDoc,
  SpecCategory,
  Subsection,
} from '../domain/description-doc';
import { fixNumberFormatting } from '../utils/number-format-fixer';
import { fixDecimalSeparator } from '../utils/decimal-separator';
import { restoreIdentifierDots } from '../utils/identifier-decimal';
import { cyrillizeUnits } from '../utils/unit-cyrillize';
import { normalizeTerminology, canonicalizeMultiInOne } from '../utils/terminology-normalize';

/** A pure text→text rewrite. The underlying transforms accept HTML, and Prose is a subset of it. */
export type TextTransform = (text: string) => string;

/**
 * Strings that are NOT prose, addressed by JSON path.
 *
 * Exported so the spec can drive its completeness check off the same list the implementation uses,
 * rather than off a second copy that could disagree with it.
 *
 *   schemaVersion / locale — machine values
 *   *.kind                 — the Block discriminant
 *   figures[].file         — a filename; normalizing "1.75" inside it would break the URL
 *   videos[].src           — a URL, for the same reason
 */
export const NON_TEXT_PATHS: readonly RegExp[] = [
  /^schemaVersion$/,
  /^locale$/,
  /\.kind$/,
  /^figures\[\d+\]\.file$/,
  /^videos\[\d+\]\.src$/,
];

const mapBullets = (items: BulletItem[], fn: TextTransform): BulletItem[] =>
  items.map(i => ({ lead: fn(i.lead), text: fn(i.text) }));

const mapBlock = (b: Block, fn: TextTransform): Block => {
  switch (b.kind) {
    case 'paragraph':
      return { kind: 'paragraph', text: fn(b.text) };
    case 'bullets':
      return { kind: 'bullets', items: mapBullets(b.items, fn) };
    // figure and video carry only an index — nothing to rewrite. Returned as-is rather than
    // reconstructed, so a future Block variant with text cannot slip through silently: adding one
    // means the switch stops being exhaustive and the compiler says so.
    case 'figure':
    case 'video':
      return b;
  }
};

const mapSubsection = (s: Subsection, fn: TextTransform): Subsection => ({
  heading: fn(s.heading),
  blocks: s.blocks.map(b => mapBlock(b, fn)),
  ...(s.subsections ? { subsections: s.subsections.map(sub => mapSubsection(sub, fn)) } : {}),
});

const mapCategory = (c: SpecCategory, fn: TextTransform): SpecCategory => ({
  title: fn(c.title),
  rows: c.rows.map(r => ({
    label: fn(r.label),
    // A multi-valued parameter is a list — map each entry, do not join and re-split.
    value: Array.isArray(r.value) ? r.value.map(fn) : fn(r.value),
  })),
});

/**
 * Applies `fn` to every prose-bearing field, returning a NEW document.
 *
 * Written as an explicit field-by-field rebuild rather than a generic deep walk. A generic walk
 * would rewrite `figures[].file` and `videos[].src` too — a filename or URL containing "1.75" would
 * be silently corrupted by the number normalizer — and it could not distinguish a Block's `kind`
 * discriminant from prose. Being explicit costs a few lines and makes the omissions compile-visible.
 *
 * The spec's completeness test drives itself off the document, so a field added to the model and
 * forgotten here fails immediately.
 */
export function mapDocText(doc: ProductDescriptionDoc, fn: TextTransform): ProductDescriptionDoc {
  return {
    schemaVersion: doc.schemaVersion,
    locale: doc.locale,
    localizedName: fn(doc.localizedName),

    hook: fn(doc.hook),
    killerSpecs: doc.killerSpecs.map(s => ({ label: fn(s.label), value: fn(s.value), why: fn(s.why) })),
    keyBenefits: doc.keyBenefits.map(b => mapBlock(b, fn)),
    functionality: doc.functionality.map(s => mapSubsection(s, fn)),
    applications: {
      heading: fn(doc.applications.heading),
      ...(doc.applications.blocks
        ? { blocks: doc.applications.blocks.map(b => mapBlock(b, fn) as typeof b) }
        : {}),
      items: doc.applications.items.map(i => ({ scenario: fn(i.scenario), text: fn(i.text) })),
    },
    ...(doc.compatibility ? { compatibility: mapSubsection(doc.compatibility, fn) } : {}),
    ...(doc.packageContents
      ? { packageContents: { heading: fn(doc.packageContents.heading), items: doc.packageContents.items.map(fn) } }
      : {}),
    specs: {
      heading: fn(doc.specs.heading),
      categories: doc.specs.categories.map(c => mapCategory(c, fn)),
    },
    cta: { heading: fn(doc.cta.heading), text: fn(doc.cta.text) },

    figures: doc.figures.map(f => ({ file: f.file, alt: fn(f.alt), caption: fn(f.caption) })),
    videos: doc.videos.map(v => ({ src: v.src, title: fn(v.title), caption: fn(v.caption) })),
  };
}

/**
 * The production normalization chain, applied to Doc text fields.
 *
 * ORDER IS COPIED FROM THE ORCHESTRATOR'S HTML CHAIN, NOT RE-DERIVED, and its reasons are recorded
 * there:
 *
 *   1. fixNumberFormatting   strips thousands separators, so the decimal pass below sees one
 *                            unambiguous number shape per value.
 *   2. fixDecimalSeparator   localizes a decimal — only when a unit follows it.
 *   3. restoreIdentifierDots the inverse: a comma the MODEL wrote inside an identifier (F/2,0,
 *                            2,4G) is not a decimal. Nothing else catches those; the validator only
 *                            looks for the opposite.
 *   4. cyrillizeUnits        after (1) so it sees a canonical NUM<NBSP>UNIT shape, and before (5)
 *                            so terminology's Cyrillic word-boundary lookarounds see final
 *                            orthography.
 *   5. normalizeTerminology  anglicism removal.
 *   6. canonicalizeMultiInOne
 *
 * (4)–(5) is a documented convention rather than a correctness requirement — both are idempotent
 * and independent — but it is preserved so the two pipelines cannot diverge while both exist.
 */
export function normalizeDocProse(doc: ProductDescriptionDoc, locale: string): ProductDescriptionDoc {
  return mapDocText(doc, text =>
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

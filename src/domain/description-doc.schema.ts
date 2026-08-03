/**
 * description-doc.schema.ts
 *
 * Runtime validation boundary for ProductDescriptionDoc. Imported by the orchestrator and the
 * repair gate — NEVER by the renderer. Keeping zod out of render-description.ts is what makes
 * that module dependency-free and portable to the BFF.
 */
import { z } from 'zod';
import { forEachBlockInOrder } from './description-doc';
import type { ProductDescriptionDoc } from './description-doc';

/**
 * Prose allows `<b>` and `<strong>`. Any other tag is a schema error, not something to sanitize away.
 *
 * Both, because master-system-prompt.ts §[FORMAT] mandates both and gives them different jobs —
 * `<strong>` for brands/model/USPs, `<b>` for inline spec scannability. The allow-list is still an
 * allow-list: `<em>`, `<a>` and everything else remain errors.
 */
const PROSE_FORBIDDEN = /<(?!\/?(?:b|strong)\s*>)[^>]+>/;
const Prose = z.string().min(1).refine(s => !PROSE_FORBIDDEN.test(s), {
  message: 'Prose fields may contain only <b> and <strong> tags; no other HTML is permitted.',
});

/**
 * A tag, as opposed to a bare `<`. Deliberately requires a LETTER right after `<` or `</`, because
 * real spec values start with one: the 3DDevice artifact ships `<30 Вт`, and `≤ 0,5 см` / `1/2"`
 * are neighbours of it. A guard keying on `<` alone would reject correct documents.
 */
const TAG_LIKE = /<\/?[a-zA-Z][^>]*>/;

/**
 * Fields the renderer passes through `esc()` rather than `prose()` — headings, labels, values,
 * bullet leads, alt text. They are contractually plain text, and STRICTER than Prose: even `<b>`
 * is wrong here, because for a bullet lead the renderer supplies the `<b>` wrapper itself.
 *
 * Why this is a schema rule and not just a prompt rule: on 2026-08-02 a model wrote
 * `"lead": "<b>Транспортування:</b>"`. `text` beside it was `Prose`, so the same behaviour there
 * would have been a caught, repairable error — but `lead` was bare `z.string().min(1)`, so it
 * passed validation, got escaped, and shipped as literal `&lt;b&gt;` inside the renderer's own
 * `<b>`. Identical input, opposite outcomes, one field apart. Guarding here routes it into the
 * repair gate, which names the offending field and gets it fixed.
 */
const NonEmpty = z.string().min(1).refine(s => !TAG_LIKE.test(s), {
  message: 'Plain-text fields may not contain HTML tags — the renderer applies all formatting.',
});

const KillerSpecSchema = z.object({ label: NonEmpty, value: NonEmpty, why: Prose });

/**
 * `<li><b>{lead}</b>{text}</li>` — the renderer joins these with NOTHING of its own, deliberately.
 * render-description.ts:174-183 has the corpus evidence: Center 3D Print writes the space INSIDE
 * the bold (`<b>Складається за лічені хвилини. </b>`), EXPERT3D writes it outside
 * (`<b>Гравіювання деревини:</b> гравер…`). One injected space reproduces neither, so the
 * whitespace is authored content and the renderer must not guess.
 *
 * That leaves one case the renderer cannot save: NEITHER side carries a separator, which is wrong
 * under every store's convention. The 3DDevice run shipped `<b>Топографічне знімання</b>Дальність
 * лідара 300 м`. Rejecting only that case keeps both conventions intact.
 *
 * 🔴 `\p{L}\p{N}` WITH THE /u FLAG, NEVER `\w`. JavaScript's `\w` is ASCII [A-Za-z0-9_].
 * masterScriptFor returns 'Cyrillic' for all seven stores, so a `\w` rule would match NONE of the
 * real cases — including the one above — and would also miss Polish ł ą ę ś ż ź ć ń ó and German
 * ä ö ü ß, i.e. Drukarka 3D and Center 3D Print. output-validator.ts:209 already carries a comment
 * about this exact trap.
 */
const ENDS_WITH_ALNUM = /[\p{L}\p{N}]$/u;
const STARTS_WITH_ALNUM = /^[\p{L}\p{N}]/u;

const BulletItemSchema = z.object({ lead: NonEmpty, text: Prose }).refine(
  i => !(ENDS_WITH_ALNUM.test(i.lead) && STARTS_WITH_ALNUM.test(i.text)),
  {
    message:
      'A bullet lead and its text run together — neither side carries a separator. Put the space '
      + 'or punctuation at the end of "lead" or the start of "text"; the renderer adds none.',
    path: ['lead'],
  },
);

/**
 * Block is a flat union — a figure references the manifest by index rather than nesting, so there
 * is no recursion here and no need for z.lazy.
 */
const BlockSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('paragraph'), text: Prose }),
  z.object({ kind: z.literal('bullets'), items: z.array(BulletItemSchema).min(3).max(8) }),
  z.object({ kind: z.literal('figure'), ref: z.number().int().nonnegative() }),
  z.object({ kind: z.literal('video'), ref: z.number().int().nonnegative() }),
]);

/** §4 admits prose and figures only — see the note on `applications.blocks`. */
const ApplicationsBlockSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('paragraph'), text: Prose }),
  z.object({ kind: z.literal('figure'), ref: z.number().int().nonnegative() }),
]);

/**
 * Depth 2 — a leaf subsection, rendered as <h3>. It has no `subsections` key, so the two-level cap
 * is enforced by the SHAPE of the schema rather than by a depth-counting refinement. That is why
 * neither z.lazy nor a recursive z.ZodType annotation appears in this file.
 *
 * `.strict()` is load-bearing, not decoration. Zod objects STRIP unknown keys by default rather
 * than rejecting them, so without it a third nesting level would be silently discarded and the
 * document would parse as valid — the cap would be a lie. Strict mode turns that into the error it
 * should be, and as a bonus rejects hallucinated fields anywhere in a subsection.
 */
const LeafSubsectionSchema = z.object({
  heading: NonEmpty,
  blocks: z.array(BlockSchema),
}).strict();

/**
 * Depth 1 — rendered as <h2>; its children render as <h3>.
 *
 * `blocks` may be EMPTY when the section exists only to introduce its <h3> children. A corpus
 * artifact does exactly that: "Безпечна експлуатація Ortur H20 20 W" carries no prose of its own,
 * just two subsections. The old `.min(1)` on blocks would have rejected a real, accepted document.
 * What must never be empty is BOTH at once — a heading with no content under it is a defect, and
 * the refinement below says so.
 */
const SubsectionSchema = LeafSubsectionSchema.extend({
  subsections: z.array(LeafSubsectionSchema).optional(),
}).refine(
  s => s.blocks.length > 0 || (s.subsections?.length ?? 0) > 0,
  { message: 'A subsection needs at least one block or at least one nested subsection.' },
);

export const ProductDescriptionDocSchema = z.object({
  schemaVersion: z.literal('3.0'),
  locale: NonEmpty,
  localizedName: NonEmpty,

  hook: Prose,
  killerSpecs: z.array(KillerSpecSchema).min(3).max(4),
  keyBenefits: z.array(BlockSchema).min(1),
  functionality: z.array(SubsectionSchema).min(1),
  applications: z.object({
    heading: NonEmpty,
    // Narrower than BlockSchema on purpose. `bullets` would give §4 a second <ul> alongside
    // `items`, which already is its list — two competing mechanisms in one section, and no
    // artifact shows it. `video` is excluded on the same evidence rule: the renderer supports it,
    // but nothing in the corpus puts one here, and this schema describes what is proven.
    //
    // Same technique the subsection depth cap uses: the TS type stays the wider shape so the
    // renderer needs no special case, and the schema is the gate.
    blocks: z.array(ApplicationsBlockSchema).optional(),
    items: z.array(z.object({ scenario: NonEmpty, text: Prose })).min(4).max(8),
  }),
  compatibility: SubsectionSchema.optional(),
  // §5b — same shape as §5, deliberately a separate field. See the note on ProductDescriptionDoc
  // .operatingTips for why this is a missing slot rather than a rename of `compatibility`.
  operatingTips: SubsectionSchema.optional(),
  packageContents: z.object({ heading: NonEmpty, items: z.array(NonEmpty).min(1) }).optional(),
  specs: z.object({
    heading: NonEmpty,
    categories: z.array(z.object({
      title: NonEmpty,
      // A value is one string or a non-empty list of them — see SpecRow. An EMPTY list is rejected
      // rather than rendered as a bare <ul></ul>: a parameter with no value is a defect, and the
      // string branch already covers "one value".
      rows: z.array(z.object({
        label: NonEmpty,
        value: z.union([NonEmpty, z.array(NonEmpty).min(1)]),
      })).min(1),
    })).min(1),
  }),
  cta: z.object({ heading: NonEmpty, text: Prose }),

  figures: z.array(z.object({ file: NonEmpty, alt: NonEmpty, caption: Prose })),
  videos: z.array(z.object({ src: NonEmpty, title: NonEmpty, caption: Prose })),
})
// Cross-field: every figure ref must be in range, and no figure may be referenced twice or zero times.
//
// `doc` is annotated explicitly rather than inferred — see the TSCONFIG NOTE at the bottom of this
// file. Without the annotation zod hands back an all-optional shape here and the body does not
// compile.
.superRefine((doc: ProductDescriptionDoc, ctx) => {
  // Figure and video refs are collected into SEPARATE buckets. A shared counter would let a
  // {kind:'video'} block satisfy a figure slot (and vice versa), which passes every other check
  // and silently drops media at render time.
  const figureRefs: number[] = [];
  const videoRefs: number[] = [];
  // Traversal is shared with the renderer via forEachBlockInOrder — see its doc comment for why
  // this is not written out a second time here.
  forEachBlockInOrder(doc, b => {
    if (b.kind === 'figure') figureRefs.push(b.ref);
    else if (b.kind === 'video') videoRefs.push(b.ref);
  });

  /** Each manifest entry referenced exactly once, no gaps, no strays. */
  const checkRefs = (refs: number[], manifestLength: number, field: 'figures' | 'videos') => {
    const sorted = [...refs].sort((a, b) => a - b);
    const expected = Array.from({ length: manifestLength }, (_, i) => i);
    if (sorted.length !== expected.length || sorted.some((r, i) => r !== expected[i])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message:
          `Every ${field === 'figures' ? 'figure' : 'video'} must be referenced exactly once. ` +
          `${field}.length=${manifestLength}, refs=[${sorted.join(', ')}].`,
      });
    }
  };

  checkRefs(figureRefs, doc.figures.length, 'figures');
  checkRefs(videoRefs, doc.videos.length, 'videos');
});

/**
 * Compile-time guard against the schema and the hand-written interface drifting apart.
 *
 * Direction: interface → inferred. It proves every ProductDescriptionDoc field exists in the schema
 * with a compatible type, so renaming or retyping a field on one side without the other is a
 * compile error.
 *
 * KNOWN LIMITATION: it does NOT prove the reverse — a field present only in the schema and absent
 * from the interface slips through. The stronger `inferred → interface` direction is what we want,
 * and it is what the TSCONFIG NOTE below is about.
 */
const _typeCheck: z.infer<typeof ProductDescriptionDocSchema> = {} as ProductDescriptionDoc;
void _typeCheck;

/*
 * TSCONFIG NOTE — why this file is shaped the way it is.
 *
 * Zod v3 documents `strictNullChecks` as a hard requirement for its type inference. This repo's
 * tsconfig.json does not enable it (no "strict", no "strictNullChecks"), so every property in
 * `z.infer<typeof ProductDescriptionDocSchema>` comes back OPTIONAL regardless of what the schema
 * actually requires. Two consequences, both worked around above rather than fixed here:
 *
 *   1. the superRefine callback needs an explicit `doc: ProductDescriptionDoc` annotation;
 *   2. `_typeCheck` runs interface → inferred, which is the weaker of the two directions.
 *
 * Enabling `strictNullChecks` was measured against the whole codebase and produces ZERO errors —
 * it is a one-line tsconfig change whenever the team wants the stronger guarantees. It was left
 * out of this PR deliberately to keep the diff inside its stated scope, not because it is risky.
 *
 * Do not "simplify" the two workarounds above without turning the flag on first; they will
 * silently stop compiling.
 */

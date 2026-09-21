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
// FR-6 / D5 — §6's heading is validated AGAINST the code-resident table rather than restated here.
// New import direction for this file (src/domain → src/prompt-core) and deliberately one-way:
// constants.ts imports only ../app/types and ../utils/specs-grounding, nothing from src/domain, so
// there is no cycle. Recorded because the TSCONFIG NOTE below documents that inference here is
// fragile and a reviewer will ask.
import { resolveV4SectionHeadings } from '../prompt-core/constants';

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

/**
 * v4 §1's «Незмінний старт» — see the FR-1 rule in the version-guarded refinement at the bottom of
 * this file, which is its only consumer.
 *
 * Lazy `.*?` so the FIRST `</b>` closes the name rather than the last: a hook that bolds a spec
 * later in the sentence must still be measured on its opening element. `[\s\S]` rather than `.`
 * because a model may wrap the hook across lines and `.` would not cross one.
 */
const HOOK_INVARIANT_START = /^<b>[\s\S]*?<\/b> — /;

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
 *
 * Parameterized on the bullets floor: §5 compatibility gets a relaxed floor of 2 (source-bounded —
 * a datasheet may confirm just 2 physical accessories). keyBenefits is model-authored but ALSO
 * relaxed to 2, based on empirical evidence of repair-budget exhaustion (2026-08-17): a live run
 * shipped a "bullets" Block with only 2 items, the ladder had no cheaper repair than a full
 * document regeneration (see doc-schema-issues.ts / repair-strategy.ts), and the budget ran out
 * before the model produced a valid Doc.
 *
 * functionality remains strictly at 3 pending its own evidence of the same failure — a
 * DELIBERATE, ACCEPTED GAP, not an oversight. TASK_A_DOC_INSTRUCTION's escape hatch ("use a
 * paragraph Block instead of an under-filled bullets Block") is worded generically and applies to
 * functionality too, so the mitigation is already in place at the prompt layer; only the schema
 * safety net is narrower here than for keyBenefits. Revisit immediately if this same crash recurs
 * on functionality.
 */
function makeBlockSchema(minBulletItems: number) {
  return z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('paragraph'), text: Prose }),
    z.object({ kind: z.literal('bullets'), items: z.array(BulletItemSchema).min(minBulletItems).max(8) }),
    z.object({ kind: z.literal('figure'), ref: z.number().int().nonnegative() }),
    z.object({ kind: z.literal('video'), ref: z.number().int().nonnegative() }),
  ]);
}
const BlockSchema = makeBlockSchema(3);
const RelaxedBlockSchema = makeBlockSchema(2);

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
function makeLeafSubsectionSchema(blockSchema: typeof BlockSchema) {
  return z.object({
    heading: NonEmpty,
    blocks: z.array(blockSchema),
  }).strict();
}
const LeafSubsectionSchema = makeLeafSubsectionSchema(BlockSchema);
const RelaxedLeafSubsectionSchema = makeLeafSubsectionSchema(RelaxedBlockSchema);

/**
 * Depth 1 — rendered as <h2>; its children render as <h3>.
 *
 * `blocks` may be EMPTY when the section exists only to introduce its <h3> children. A corpus
 * artifact does exactly that: "Безпечна експлуатація Ortur H20 20 W" carries no prose of its own,
 * just two subsections. The old `.min(1)` on blocks would have rejected a real, accepted document.
 * What must never be empty is BOTH at once — a heading with no content under it is a defect, and
 * the refinement below says so.
 */
function makeSubsectionSchema(leafSchema: typeof LeafSubsectionSchema) {
  return leafSchema.extend({
    subsections: z.array(leafSchema).optional(),
  }).refine(
    s => s.blocks.length > 0 || (s.subsections?.length ?? 0) > 0,
    { message: 'A subsection needs at least one block or at least one nested subsection.' },
  );
}
const SubsectionSchema = makeSubsectionSchema(LeafSubsectionSchema);
// §5 compatibility only — a datasheet may confirm just 2 physical accessories. See RelaxedBlockSchema.
const RelaxedSubsectionSchema = makeSubsectionSchema(RelaxedLeafSubsectionSchema);

/**
 * US-2.2 FR-17: omit-or-null for a paragraph a simplified template may leave out. `null` is
 * normalised to `undefined` so every consumer (renderer, validators, walkers) sees one absent shape.
 * Bounds on the inner schema still apply whenever the paragraph is present (OD-13c).
 */
function omittable<T extends z.ZodTypeAny>(schema: T) {
  return schema.nullish().transform(v => v ?? undefined);
}

export const ProductDescriptionDocSchema = z.object({
  schemaVersion: z.enum(['3.0', '4.0']),
  locale: NonEmpty,
  localizedName: NonEmpty,

  hook: Prose,
  killerSpecs: omittable(z.array(KillerSpecSchema).min(3).max(4)),
  // RelaxedBlockSchema (floor 2), not BlockSchema — see the comment on RelaxedBlockSchema above.
  keyBenefits: omittable(z.array(RelaxedBlockSchema).min(1)),
  functionality: omittable(z.array(SubsectionSchema).min(1)),
  applications: omittable(z.object({
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
  })),
  compatibility: omittable(RelaxedSubsectionSchema),
  packageContents: omittable(z.object({ heading: NonEmpty, items: z.array(NonEmpty).min(1) })),
  specs: omittable(z.object({
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
  })),
  cta: z.object({ heading: NonEmpty, text: Prose }),

  figures: z.array(z.object({ file: NonEmpty, alt: NonEmpty, caption: Prose })),
  // .nullish().transform(v => v ?? []): unlike `figures`, the source manifest is often empty (most
  // products have no video), and the prompt's [VIDEO MANIFEST] block is then omitted entirely (see
  // buildVideoBlock in task-a.ts) — leaving the model with no positive instruction to emit
  // "videos": [] rather than dropping the key or writing null. Tolerating both here means the
  // overwhelmingly common no-video case never costs a repair-gate attempt.
  //
  // NOT `.default([])`: zod v3's `.default()` only substitutes for `undefined`, not an explicit
  // `null` — a model that writes "videos": null would still fail `doc.videos.length` in the
  // superRefine below. The transform normalizes both nullish values to [] uniformly.
  videos: z.array(z.object({ src: NonEmpty, title: NonEmpty, caption: Prose }))
    .nullish()
    .transform(v => v ?? []),
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
})
/**
 * Every v4-only rule, behind ONE version guard.
 *
 * WHY A SECOND REFINEMENT RATHER THAN TIGHTER FIELD SCHEMAS. The rules below would each be
 * shorter as a `.max()`, a `.min(2)` or a narrowed union on the field itself — and every one of
 * those would apply to `'3.0'` too. The corpus is full of documents that legitimately violate all
 * of them: a functionality group with a single `<h3>`, a §2 carrying a paragraph and a figure, an
 * array `SpecRow.value`, a combined §2 list of twelve items. Those documents are CACHED — they
 * are re-parsed on every re-render and must keep parsing forever (NFR-8, OD-2). So the guard is
 * the design, not an optimization: one early return, and no bound a `'3.0'` document parses
 * through moves at all.
 *
 * WHY THE PATHS ARE SPELLED OUT. `doc-schema-issues.ts` joins `issue.path` with `.` and
 * `repair-strategy.ts` resolves that dotted string to decide whether a failure is a tier-0
 * single-field fix or a full-document regeneration. An issue raised at the document root degrades
 * every one of these into a regeneration against a budget FR-30 can exhaust.
 */
.superRefine((doc: ProductDescriptionDoc, ctx) => {
  if (doc.schemaVersion !== '4.0') return;

  // FR-1 / AC-1 — v4 §1's «Незмінний старт». The hook opens with the product name in <b>…</b>,
  // then a space, an em dash and a space; what follows the dash is what the five §1 patterns vary.
  //
  // This is the structural half of FR-1, which states that a hook not in this form "is a structural
  // defect and the generation is rejected by structural validation". Until now nothing rejected it:
  // the prompt instructed the form (block 0's §1 clause) and the renderer emitted `<p>${prose(...)}</p>`
  // without inspecting it.
  //
  // WHY `<b>` AND NOT ALSO `<strong>`. `Prose` admits both, and [FORMAT] tells the model to use
  // <strong> for brands and model names — so a generation opening `<strong>Name</strong> — …` is
  // plausible and would be rejected here. That is deliberate and narrow: FR-1 and AC-1 both name
  // <b> specifically, and v4 §1's own five patterns are written `<b>[Назва]</b> — …`. Widening the
  // rule would make the schema admit a shape the renderer's §2 <b> convention does not use.
  // Recorded as a finding rather than decided silently.
  //
  // U+2014 EM DASH, not U+2013. The same character AC-2's rendered killer-spec form pins.
  if (!HOOK_INVARIANT_START.test(doc.hook)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['hook'],
      message:
        'A 4.0 §1 hook opens with the invariant start: the product name wrapped in <b></b>, then ' +
        'a space, an em dash (—) and a space, and only then the category. Rewrite the opening so ' +
        'it reads "<b>{product name}</b> — {category} …"; vary what follows the dash, never the start.',
    });
  }

  // FR-4 — §2 is exactly one <h2> over one <ul>, so every §2 Block must be `bullets`.
  // EVERY offending Block is named, not just the first: an implementation that stops at the first
  // one leaves the model repairing a single field per attempt against the FR-30 budget.
  (doc.keyBenefits ?? []).forEach((block, i) => {
    if (block.kind !== 'bullets') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['keyBenefits', i, 'kind'],
        message:
          `§2 of a 4.0 document is one merged list: every keyBenefits Block must be "bullets", ` +
          `but this one is "${block.kind}". Move it to §3 functionality or §4 applications.`,
      });
    }
  });

  // FR-17 — the ceiling is on the COMBINED rendered list, which is why no single field owns it and
  // why the issue sits at `keyBenefits`. `measured` carries the operands so the tier-1 repair
  // instruction can state the exact surplus instead of restating the rule (D7, R2).
  const benefitItems = (doc.keyBenefits ?? []).reduce(
    (n, block) => n + (block.kind === 'bullets' ? block.items.length : 0),
    0,
  );
  const killerCount = doc.killerSpecs?.length ?? 0;
  const combined = killerCount + benefitItems;
  if (combined > 8) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['keyBenefits'],
      message:
        `§2 renders killerSpecs and keyBenefits as ONE list of at most 8 items, but this document ` +
        `would render ${combined} (${killerCount} killer specs + ${benefitItems} benefits). ` +
        `Remove ${combined - 8}.`,
      params: { measured: { actual: combined, limit: 8, unit: 'items' } },
    });
  }

  // FR-10 — a §7 value is a single string for 4.0; multiple values are comma-joined BY THE MODEL
  // into one row (FR-9). The `'3.0'` array branch stays legal on its own path.
  (doc.specs?.categories ?? []).forEach((category, c) => {
    category.rows.forEach((row, r) => {
      if (Array.isArray(row.value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['specs', 'categories', c, 'rows', r, 'value'],
          message:
            `A 4.0 §7 value is one string. Comma-join the ${row.value.length} values into a ` +
            `single row instead of listing them.`,
        });
      }
    });
  });

  // FR-27 / the human's settled Decision 1 — a §3 group opens <h3> sub-headings only when it has
  // 2+ distinct sub-functions.
  //
  // FIRES ON length === 1 ONLY, and that is deliberate rather than a loose `< 2`. An absent
  // `subsections` is the common shape (a group with prose and no sub-headings), and `[]` is
  // equivalent to absent — both render no <h3> at all, so neither is the defect this rule is
  // about. The defect is a lone <h3>, a heading level opened for one child.
  //
  // It is ALSO why `makeSubsectionSchema` is not given a `.min(2)`: that factory builds the shape
  // shared by `functionality` and, via RelaxedSubsectionSchema, by §5 `compatibility` — so a bound
  // there would reject cached `'3.0'` documents AND govern a section FR-27 says nothing about.
  (doc.functionality ?? []).forEach((group, i) => {
    if (group.subsections?.length === 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['functionality', i, 'subsections'],
        message:
          `A §3 group opens <h3> sub-headings only when it has 2 or more distinct sub-functions. ` +
          `This group has one: fold it into the group's own blocks, or split the function in two.`,
      });
    }
  });

  // FR-6 / D5 — §6's heading stays model-authored, but for 4.0 it must be one of the two
  // code-resident entries for the document's locale, so the single-vs-set CHOICE stays with the
  // model while the WORDING stops drifting between regenerations of the same product.
  if (doc.packageContents) {
    const headings = resolveV4SectionHeadings(doc.locale);
    const allowed = headings
      ? [headings.packageContentsSingle, headings.packageContentsSet]
      : [];
    if (headings && !allowed.includes(doc.packageContents.heading)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['packageContents', 'heading'],
        message:
          `§6's heading for ${doc.locale} must be exactly one of ${allowed.map(h => `"${h}"`).join(' or ')} ` +
          `— use the first for a single product and the second for a set.`,
      });
    }
  }
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

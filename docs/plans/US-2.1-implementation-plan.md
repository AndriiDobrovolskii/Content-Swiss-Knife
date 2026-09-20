---
artifact: implementation_plan
story: US-2.1
version: 2
status: APPROVED
owner: so-planner
created_at: 2026-09-20T14:00:00Z
updated_at: 2026-09-21T10:00:00Z
supersedes: docs/plans/US-2.1-implementation-plan.md#1
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 2
  - key: open_decisions
    version: 2
  - key: impact_analysis
    version: 1
  - key: plan_review
    version: 1
  - key: task_breakdown
    version: 1
open_decisions_blocking: false
---

# Implementation Plan — US-2.1: Migrate product descriptions to the v4.0 UA content schema

## Revision note (v2)

This is the **v2 revision**, produced after `so-plan-reviewer` returned `CHANGES_REQUIRED` on v1
(`docs/reviews/plans/US-2.1-plan-review.md` v1) with three blocking findings. Every finding was
re-verified against primary source in this run before being acted on; all three are facts.

| Review finding | Resolved in v2 by |
|---|---|
| 1 — the §9 approval surface for `master-system-prompt.ts` is enumerated by line number and the enumeration leaks | **D13, rewritten.** The request is now expressed as five **negative invariants** derived FR by FR — *what must no longer be true in this file* — with the clause list demoted from scope to evidence, and with the completeness method stated and reproducible (three exhaustive sweeps over the whole 471-line file). The surface grows from six clauses to sixteen tier-1 clauses plus six tier-2 consistency repairs. `:356`'s «Чому купити» template is folded in. |
| 2 — FR-6 / AC-5 require §6 to be an `<ol>` and nothing in the plan makes it one | **D17, new.** The `<ol>` is a renderer decision and it lands **inside D8's `schemaVersion` branch**, not unconditionally. D5 now cross-references it; D8's "Nothing else in `renderDescription` changes" sentence — the sentence the review cited as the reason the gap existed — is deleted and replaced. V15 is the validation category that checks it. |
| 3 — a fixture task creating `'4.0'` builders cannot end in a commit with `npm run lint` green | **A new plan-level section, "Constraints on decomposition" (C-1).** Expressed as a sequencing constraint derived from repository fact, so `so-implementation-planner` cannot re-break it, and with the merge of the `'3.0'` baseline into the widening change explicitly forbidden. |

Carried non-blocking item: `test/tools/scaffold-doc.mjs` now has a stated disposition in
*Explicitly NOT modified*.

**What v2 deliberately does not change.** Everything the review verified as sound is kept as it
stood, by number: the FROZEN narrowing from four files to one; D3's scoping of the human's settled
Decision 1; the L1–L7 leak closure and the `'3.0'` corpus acceptance checks; Architecture Rule 2;
`STORE_REGISTRY` as sole source; the `systemBlocks` / `userContent` separation; R3 and R6 as judged
residuals; the hook-pattern parameter's optionality. **No design decision is renumbered** — D1–D16
and R1–R8 mean what they meant in v1, so a re-review does not have to re-derive them. New material
takes new numbers (D17, R9, R10, V15, C-1).

All eleven Open Decisions remain SETTLED; none is re-opened, re-answered or substituted. The
Specification is APPROVED and v2 required no change to it: FR-6 states the `<ol>` plainly, FR-11
states 50–100 plainly, FR-4 states the §2 composition plainly. Every defect was a partially
incomplete reading of a correct Specification.

---

## Approach

Everything v4 changes about a *document* is expressed in one place — a **version-guarded
document-level `superRefine` on the widened `ProductDescriptionDocSchema`** — and everything v4
changes about *rendered shape* is expressed in one other place, a **`schemaVersion` branch inside
`renderDescription`**. The schema keeps `schemaVersion: z.enum(['3.0','4.0'])` with every field at
its current widest shape, so every cached `'3.0'` document parses byte-unchanged and every new
`'4.0'` rule is an additive refinement that simply does not run for `'3.0'`. The three headings v4
fixes in code (§2, §6, §9) come from one new per-locale constant beside `DELIVERY_REGION_PHRASES`,
keyed over the ten `STORE_REGISTRY` locales. The v4 prompt rules for the Doc path live entirely in
non-frozen `task-a-doc.ts`, whose `TASK_A_DOC_INSTRUCTION` already replaces `systemBlocks[1]`
wholesale; the FR-14 hook-pattern index is computed by a new pure selector in the service layer and
appended to `userContent`, which is never cached. Two of the three FROZEN files the Story named turn
out to need no edit at all, verified against the code; the one that does —
`master-system-prompt.ts` — is an explicit AGENTS.md §9 **STOP** recorded below as a set of negative
invariants over the whole file, not an assumption and not a line-range sample.

---

## The structural fact this plan is built on

A `ProductDescriptionDoc` exists **only for uk-UA** (impact analysis §0: both `buildPromptADoc`
call sites pass `'Ukrainian (uk-UA)'`; `buildPromptC(html: string, …)` translates rendered HTML).
So `schemaVersion` and every Zod bound govern exactly one locale, and the other nine inherit v4 as
HTML shape.

This plan does **not** attempt to give the other nine a version. It relies on the mechanism that
already polices them: `validateStructuralParity` counts `<section>`, `<h2>`, `<h3>`, `<hr>`,
`<figure>`, `<figcaption>`, `<table>`, `<tr>`, `<td>` **and `<li>`** in the translation against the
master (`structural-parity.ts:33-43`, verified again this run). A v4 master gains an `<h2>`, loses a
`<table>` and carries a bounded `<li>` count in §2; a translation that does not reproduce all three
fails `structural-parity-count`. That is the whole enforcement story for the nine locales, and it
needs no new code.

**One blind spot in that mechanism is now known and recorded.** `COUNTED_TAGS` contains neither
`<ol>` nor `<ul>` — verified by reading the array in full this run. The §6 list-element change of
D17 is therefore invisible to structural parity in both directions. See R9.

---

## Design decisions

### D1 — Version scoping: one widened schema plus a version-guarded `superRefine`

**Decision.** `ProductDescriptionDocSchema` keeps its single object shape. Two changes:

1. `schemaVersion: z.literal('3.0')` → `z.enum(['3.0', '4.0'])` (FR-15).
2. A second `.superRefine((doc, ctx) => { if (doc.schemaVersion !== '4.0') return; … })` carrying
   **every** v4-only rule: the FR-4 §2 composition restriction, the FR-10 string-only spec value,
   the FR-17 combined §2 ceiling, the FR-27 `subsections` bound (D3), and the FR-6 §6 heading
   membership check (D5).

Every field keeps its current widest shape: `keyBenefits: z.array(RelaxedBlockSchema).min(1)`,
`SpecRow.value: z.union([NonEmpty, z.array(NonEmpty).min(1)])`, `subsections` optional and
unbounded. Nothing is narrowed in place.

**Why.** This is the only expression that closes every leak the impact analysis measured (L1, L2,
L3, L4) with one mechanism instead of four. A leak happens when a v4 bound is written into a shape
a `'3.0'` document also parses through; a rule that first reads `doc.schemaVersion` cannot leak by
construction. It also preserves the two things this file's own comments say are load-bearing: the
`.strict()` depth cap and the shared `forEachBlockInOrder` figure-ref check, both of which stay
exactly where they are.

**Corpus fixture compatibility (required by the skill).** Both committed corpus items
(`test/fixtures/corpus/center-3d-print-ortur-h20-20w`, `expert3d-ortur-h20-20w`) are
`schemaVersion: "3.0"`. Under this design they parse **unchanged** — the enum admits `'3.0'`, no
existing bound moves, and the new refinement returns immediately for them. **No fixture is
regenerated and none needs to be.** `test/render-reconciliation.spec.ts`, which reproduces both
byte-for-byte, is the cheapest early detector that this held (see D8).

**Rejected — `z.discriminatedUnion('schemaVersion', [V3, V4])`.** It duplicates the ~50-line object
body, forces the `forEachBlockInOrder` ref-check `superRefine` and the `_typeCheck` guard to exist
twice or be re-attached to the union, and makes every *shared* future change a two-place edit. The
file's TSCONFIG NOTE (`description-doc.schema.ts:258-275`) already documents that inference here is
fragile without `strictNullChecks`; doubling the shape doubles that fragility for no behaviour gain.

**Rejected — a parse-time upcast (`'3.0'` → `'4.0'` on read).** It defeats OD-2 outright: an upcast
document is then held to v4 bounds it was never generated under, so a cached single-`<h3>` group or
an array spec value becomes a parse failure. OD-2's entire stated rationale is cache preservation.

### D2 — The TypeScript interface moves with the schema, and stays the wider shape

**Decision.** `description-doc.ts`: `schemaVersion: '3.0' | '4.0'`. Nothing else changes —
`SpecRow.value` stays `string | string[]`, `keyBenefits` stays `Block[]`, `subsections` stays
optional.

**Why.** The compile-time guard at `description-doc.schema.ts:255` runs interface → inferred, so the
two files must move together or the build breaks. Keeping the type at the union of both versions is
this file's established idiom, stated in its own comment at `:171-173`: *"the TS type stays the
wider shape so the renderer needs no special case, and the schema is the gate."* The renderer
branches on a runtime value (D8); it does not need two types to do that.

**This is the change C-1 sequences against.** `description-doc.ts:122` is today the literal
`schemaVersion: '3.0';` — re-verified this run. Until D2 lands, no `'4.0'`-typed value can exist
anywhere `tsc` looks, and `tsc` looks at `test/**` too. See *Constraints on decomposition*.

### D3 — The human's Decision 1, scoped to the §3 `'4.0'` emission path

The HUMAN_SPEC_APPROVAL decision stands: FR-27's H3 rule is a **strict validated check**, not
prompt-only. The illustrative mechanism (`.min(2)` on `subsections`) is what this plan changes; the
check itself is not weakened.

**Decision.** `makeSubsectionSchema` (`:142-149`) is **not touched**. The bound is emitted from the
D1 refinement, iterating `doc.functionality` only:

> for each `functionality[i]`, when `subsections` is present and `subsections.length < 2`, add a
> custom issue at path `['functionality', i, 'subsections']` — "a §3 group opens `<h3>`
> sub-headings only when it has 2 or more distinct sub-functions (v4 §3, :364-366); a single
> sub-function belongs in this group's own `blocks`."

**Why this, and not `.min(2)` on the factory.** `makeSubsectionSchema` builds **one** shape used by
`functionality` (`:163`) and, via `RelaxedSubsectionSchema` (`:152`), by `compatibility` (`:176`).
An unconditional `.min(2)` therefore does two things FR-27 does not ask for and OD-2 forbids:

- it rejects any cached `'3.0'` document with one `<h3>` under an H2 — the shape OD-2 exists to
  preserve, and the shape the corpus **cannot** demonstrate either way (impact analysis §5: group
  counts are 0/0/0/2/0 and 2/0/0/3/0/5/3, so no fixture has exactly one);
- it applies the bound to §5 compatibility, which FR-27's text governs not at all.

This closes leak **L1** and answers unknown **U4**: the requirement is §3-only and version-scoped,
the current factory is shared, so the bound moves out of the factory rather than the factory being
split.

**It keeps a repair target.** The issue carries a full dotted path, which
`doc-schema-issues.ts:118-120` joins (`functionality.2.subsections`) and `repair-strategy.ts:39-61`
resolves for a tier-0 fix. Unlike the FR-17 ceiling (D7), this check names a field, so the repair
ladder is not degraded to full-document regeneration for it.

**`subsections: []`.** An empty array already fails the existing "at least one block or at least one
nested subsection" refine when `blocks` is also empty, and is otherwise legal. The new rule fires
only on `length === 1`, so an absent or empty `subsections` is untouched — a §3 group with no
sub-headings at all remains correct v4 output.

### D4 — U1 decided: the §2 `<h2>` is code-resident, not a new schema field

**The question.** FR-4 requires §2 to render one `<h2>`; §2 has no heading today
(`renderKillerSpecs`, `render-description.ts:240-252`, emits only the table) and no field to hold
one — `killerSpecs` is `KillerSpec[] {label,value,why}` and `keyBenefits` is a bare `Block[]`. The
Specification is silent, unlike FR-6 and FR-11 which make their headings code-resident.

**Decision. A code-resident per-locale table.** One new export in `src/prompt-core/constants.ts`,
beside `DELIVERY_REGION_PHRASES` (`:97`), holding all three v4 heading families this Story fixes in
code — §2, §6 (both variants) and the §9 CTA template — keyed over the ten `STORE_REGISTRY` locales
(NFR-6). One constant, not three, because they share a key set, a rationale and a test.

**Why, with the blast radii compared as the task requires.**

| | New schema field (`keyBenefitsHeading`) | Code-resident table |
|---|---|---|
| Cached `'3.0'` documents | **Breaks them** if required (no such key exists); if optional, the renderer needs a fallback string anyway — i.e. the table, plus a field | Zero schema surface, zero `'3.0'` risk |
| Blast radius | schema + interface + `_typeCheck` + prompt slot + repair path + every hand-authored fixture | one constant + one renderer read |
| `h2-nominal-heading` (`heading-style.ts:249-276`) | model-authored text cannot be allow-listed by prefix; the rule would have to be broadened for Center 3D Print in Cyrillic locales | a **known exact string** joins `MANDATED_NOMINAL_H2`, closing the warning deterministically |
| Testability | a test must invent the expected heading for ten locales | the table *is* the expected value |
| Consistency | contradicts FR-6/FR-11, which this same Story makes code-resident | same class of string, same treatment |

The cached-document row is decisive on its own. The `h2-nominal-heading` row is what turns the
decision from defensible into correct.

**Two consequences this plan states rather than discovers later.**

1. **The §2 heading carries no product name.** `checkProductNameStuffing`
   (`heading-style.ts:117-205`) budgets two product-named `<h2>`s per document, and `:181-187`
   treats the last `<h2>` with a `?` as the §9 closing — which the FR-11 CTA still is. A nominal,
   product-free §2 heading («Ключові характеристики та переваги») spends none of that budget, so the
   CTA keeps its slot and nothing else has to move. This is also what keeps
   `master-system-prompt.ts:133-136` ("AT MOST TWO `<h2>` … may contain [Product-short]") **true
   without an edit** — see D13's exclusion list.
2. **Adding the uk-ua / ru-ua §2 strings to `MANDATED_NOMINAL_H2` changes Center 3D Print prompt
   text**, because that array is interpolated into `C3D_UK_LOCALE_TOV` (`constants.ts:1452`) and
   iterated by `constants.spec.ts:209`. This is **intended**, not collateral: the §2 heading should
   be nominal under that store's ToV for exactly the reason the other six entries are.

### D5 — FR-6: the §6 heading table is the source of truth, enforced as a membership check

**Decision.** `packageContents.heading` stays a model-authored field (so `'3.0'` documents keep
parsing and the renderer needs no change). For `'4.0'`, the D1 refinement asserts that
`packageContents.heading` is **one of the two table entries for `doc.locale`** — the single-product
heading or the set heading — and emits the issue at path `['packageContents', 'heading']`.

**Why a membership check rather than renderer assembly (the D6 treatment).** §6 has a genuine
choice the renderer cannot make: "Що в коробці?" for a single product versus "Що входить до
набору?" for a set. Only the model knows which the input describes. A membership check keeps that
choice with the model, removes the free text, gives the table its authority, and — because it names
a field — gives the repair ladder a tier-0 target. Adding a `kind: 'single' | 'set'` discriminator
to `packageContents` would work too but costs a schema field and a `'3.0'` compatibility question
for no behaviour the membership check does not already deliver.

**Scope of D5, stated so the second half of FR-6 is not read into it.** D5 decides the §6
**heading** and nothing else. FR-6's other half — that the §6 section *is an `<ol>`* — is a property
of the list element, which no schema check can reach because `packageContents.items` is
`z.array(NonEmpty).min(1)` (`description-doc.schema.ts:177`, re-verified this run), a plain string
array. It is decided in **D17**.

### D6 — FR-11: the CTA heading is assembled by the renderer from a per-locale template

**Decision.** For `'4.0'`, `renderDescription` builds the §9 `<h2>` from the code-resident template
for `doc.locale`, interpolating the product short name (from `doc.localizedName`) and the store name
(from `RenderContext.storeName` → `STORE_REGISTRY`, NFR-6). `doc.cta.heading` is retained in the
schema and used unchanged on the `'3.0'` path. The template is resolved through
`getRenderRules(storeName)` in `src/prompt-core/store-render-rules.ts`, **not** read from
`constants.ts` at the call site.

**Why `store-render-rules.ts`.** Center 3D Print has a ToV override for this exact heading — the
soft «варто» form that *"REPLACES the master's «Чому купити [Product-short] в [Store]?» template"*
(`constants.ts:1456-1458`). That is a per-store rendering decision, and that module exists so every
one of them has one home (`store-render-rules.ts:1-11`). It is the same shape as the existing
`killerSpecsHeaders` override.

**Why renderer-assembled rather than a membership check.** Unlike §6 there is no choice to preserve:
the template is fully determined by locale and store. Assembling it makes FR-11's failure path
("a heading that does not match the template … fails validation") **unreachable by construction**,
which is this renderer's stated contract — *"If a rule can be violated by this renderer, the
renderer is wrong"* (`render-description.ts:9`).

**`cta.heading` is deliberately left unvalidated against the template on the `'4.0'` path.** The
model is still instructed to write it and the schema still requires it `NonEmpty`, but the renderer
discards it in favour of the template, and Task C translates the *rendered* HTML — so the model's
string reaches nothing downstream. The consequence, stated rather than left to inference: a model
that writes a poor heading there produces correct output and no signal. That is the intended
trade — FR-11's failure path is closed by construction in the direction that matters (what ships can
never be off-template), and adding a membership check on a discarded field would spend repair
attempts on a string no reader ever sees. The field is retained solely so `'3.0'` documents keep
parsing and rendering.

**The v3 template in the cached master is still wrong, and D13 fixes it.** Because the renderer
discards `doc.cta.heading`, `master-system-prompt.ts:356`'s «Чому купити …» cannot reach shipped
uk-UA output through the Doc path. It still primes the model, and — since `task-c.ts:87` imports
`MASTER_SYSTEM_PROMPT` — primes the **translation** path for all nine locales with a superseded
template. v1 carried this as a non-blocking note; v2 folds it into the §9 request (D13, NI-4) rather
than leaving a second §9 round for it.

### D7 — U3 decided: FR-4 §2 composition and the FR-17 combined ceiling live in the **schema**, not the validator

**Decision.** Both checks are issues from the D1 refinement. **No rule is added to
`validateGeneratedHtml`, and `output-validator.ts` is not edited.**

- **FR-4 §2 composition:** for `'4.0'`, every Block in `keyBenefits` must have `kind === 'bullets'`.
  A `paragraph`, `figure` or `video` Block there is an issue at `['keyBenefits', i, 'kind']`.
- **FR-17 combined ceiling:** for `'4.0'`, `killerSpecs.length + Σ(keyBenefits[i].items.length)`
  must be ≤ 8. The issue is emitted at path `['keyBenefits']` with `measured: { actual, limit: 8,
  unit: 'items' }` so the repair prompt can state the exact surplus.

**Why not the validator, stated as the choice the task demands.** `validateGeneratedHtml(html,
context, productName?, locale?, options?)` (`output-validator.ts:491-497`) takes **no Doc and no
version, by construction**. This is not a scoping problem that care can solve — it is the layer's
shape. A §2-composition or ceiling rule placed there fires on:

- `'3.0'`-rendered HTML, which OD-2 exists to keep renderable; and
- all **nine** translated locales, which never had a `schemaVersion` to scope against at all.

Threading a synthetic version into the translated path would mean inventing a document property for
locales that have no document. The schema layer has the discriminator natively, so the checks go
there.

**Why not "both".** The only thing a validator copy would add is coverage of the nine translated
locales — and `validateStructuralParity` already covers them for exactly these two properties, by
counting `<h2>`, `<table>` and `<li>` against the master. A second, version-blind copy would
duplicate that coverage while re-introducing the `'3.0'` leak it was added to avoid.

**Accepted residual, stated plainly.** The ≤8 ceiling is enforced on the uk-UA master and inherited
by the nine translations through `<li>` parity. A translation that both dropped and added an `<li>`
would satisfy parity while violating the ceiling's intent. Task C does not author list items, so
this is theoretical; it is recorded rather than closed.

**FR-17's own consequence, carried:** a cross-collection ceiling names no single field, so
`repair-strategy.ts` has no tier-0 target for it and it degrades to a fuller regeneration. That is
the class of miss that exhausted the budget on 2026-08-17 and caused the `keyBenefits` floor to be
relaxed (`description-doc.schema.ts:82-95`). FR-29 forbids changing either floor as a side effect of
this Story, and this plan changes neither. FR-30's outcome (D16) is what happens if it exhausts.

### D8 — The renderer gets one `schemaVersion` branch; the `'3.0'` path is not touched

**Decision.** `renderDescription` (`render-description.ts:307`) branches once on version, in three
places, all of which are stated here:

```
doc.schemaVersion === '4.0'
  ? renderKeyBenefitsV4(doc, ctx)     // new — §2
  : renderKillerSpecs(doc, ctx)       // unchanged, verbatim
```

`renderKeyBenefitsV4` emits exactly one `<h2>` (D4's table for `doc.locale`) and exactly one `<ul>`,
whose items are, in order:

1. each `killerSpecs` entry as `<li><b>{label}: {value}</b> — {why}</li>`;
2. each `keyBenefits` bullets item as `<li><b>{lead}</b>{text}</li>` — the existing `renderBullets`
   item shape, reused unchanged.

The `'4.0'` path emits **no `<table>`** in §2 and no other element between the `<h2>` and the
`</ul>`. The §9 CTA heading branches the same way (D6). **The §6 list element branches the same way
(D17).** Those three are the complete set of version-conditional points in `renderDescription`;
every other function in the file is untouched.

> **v1 said "Nothing else in `renderDescription` changes."** That sentence was false — it is what
> let FR-6's `<ol>` fall out of the plan entirely (review finding 2), and it is deleted. The
> enumeration above replaces it: §2 composition, the §9 CTA heading, and the §6 list element.

**Why the composition is spelled out here.** Three details are load-bearing and would otherwise be
guessed:

- **`{label}: {value}` is carried verbatim from the `'3.0'` cell** (`:244`), so the same content
  reads the same way across a version change.
- **The renderer supplies ` — ` between the bold lead and the benefit**, because FR-3 states the
  item form as `<b>lead</b> — benefit` and because, unlike a `BulletItem`, the §2 killer-spec lead
  is *composed by the renderer*, not authored. The "whitespace is authored content" rule
  (`:180-188`) applies to fields the model wrote; it does not apply to a string this function built.
  Mechanically: the lead is `esc(label) + ': ' + esc(value)` inside the `<b>`, then a **literal
  U+2014 em dash** surrounded by spaces outside it, then `prose(why)`. `esc()` replaces only
  `& < > "`, so the dash passes through as the character — never `&mdash;`, which a test must not
  expect. The form is also clear of `bold-label-glue` (`output-validator.ts:333-341`) on **both** of
  that rule's conditions: it needs `.` or `:` immediately before `</b>` — a spec value usually ends
  in a digit or unit — **and** a letter immediately after it, which the space forbids outright.
- **`keyBenefits` bullets items are flattened into the one `<ul>`**, not rendered as one `<ul>` per
  Block. FR-4 requires a single list; D7's composition check guarantees the renderer only ever sees
  `bullets` Blocks there for `'4.0'`.

**Why the branch and not an unconditional rewrite.** This is leak **L6**, and it is the one the
corpus catches. Both fixtures are `'3.0'` with §2 as a bare `<div class="table-responsive"><table>`
and no `<h2>`; `test/render-reconciliation.spec.ts` reproduces them byte-for-byte. A version-scoped
branch leaves both green, and a green reconciliation run is this plan's cheapest early signal that
nothing leaked.

**`killerSpecsHeaders` is unreachable on the `'4.0'` path, and must not be deleted.** It still
serves the `'3.0'` renderer path and `table-finalize.ts`, and `store-render-rules.spec.ts` asserts
the delegation for every registry entry. Becoming unused on one of two paths is not the same as
being dead.

**AGENTS.md §4 criteria the renderer must keep satisfying**, and where each stays enforced:

| §4 criterion | Where it holds after this change |
|---|---|
| First `<img>` eager, every later one lazy; `decoding="async"` | `figurePositions` → `forEachBlockInOrder`, unchanged (D9); policed by `lcp-image-lazy` / `image-not-lazy` |
| `<figure>` + `<figcaption>`, `width: fit-content`, no `<figure>` in `<p>` | `renderFigure`, unchanged — and §4 governs over the v4 Appendix's `max-content` (FR-23) |
| **No orphan images** (each `<figure>` preceded by a `<p>` lead-in); the lead-in must not duplicate the `<figcaption>`, and `alt` must not either | A **prompt** obligation, not a renderer guarantee — `master-system-prompt.ts:445`. FR-4 displaces figures out of §2 into §3, where the same obligation applies, so `TASK_A_DOC_INSTRUCTION` restates it for the relocated content (D12). Named here because it is the one §4 criterion the renderer cannot make unviolatable |
| **Figure *placement* is a prompt obligation too, and the cached master contradicts FR-4** | `master-system-prompt.ts:459-461` routes leftover figures into "§2 body text" and instructs "weave all figures into §2–§5 prose". The renderer cannot correct this: a `figure` Block in `keyBenefits` is rejected by D7's schema check with a tier-0 path but no legal target in block 0's instructions. **This row is why `:459-461` is in the §9 request (D13, NI-2).** v1's version of this table did not carry this row, and that omission is review finding 1's most expensive single instance |
| Video `<iframe>` markup, `rel=0`, localized title/figcaption | `renderVideo`, unchanged; survival by `validateVideoCoverageDoc` |
| No `<h1>`; no `schema.org/Product` microdata | renderer emits neither; `duplicate-h1` / `duplicate-product-schema` |
| `<hr>` after each `</section>` | §7 stays the only `<section>` and the only `<hr>`, unchanged — including after D17, which changes a list element inside a bare `<h2>` group, not a `<section>` |
| Spec count out = in; units in the value column | `spec-count-parity.ts`, `spec-category-shape.ts`, both unchanged |
| Number/unit spacing | `unit-spacing` rule, unchanged; FR-16 localizes punctuation only |

**One coverage change, recorded.** `checkLeadInCapitalization`'s killer-specs branch
(`output-validator.ts:281-297`) matches a `<table>` containing "Чому це важливо" and checks its last
cell. On the `'4.0'` path that table no longer exists, so the branch stops firing — it loses its
subject rather than failing. The same content lands as `<li>` items, which `bullet-colon-case`
(`:306-319`) and `bold-label-glue` (`:333-341`) do cover. Net coverage is not reduced; the rule that
applies changes. This is a finding, not a defect, and it requires no edit.

### D9 — No new collection, therefore no `forEachBlockInOrder` edit

**Decision.** This plan introduces **no new collection** on `ProductDescriptionDoc`. The §2 heading
comes from a constant (D4), not a field; the FR-4 restriction narrows an existing collection rather
than adding one; the CTA template is resolved at render time (D6); D17 changes a tag, not a shape.
`forEachBlockInOrder` (`description-doc.ts:175-189`) is therefore **unchanged**, and
`figurePositions` keeps visiting every section that can hold a figure.

**Why this is stated rather than assumed.** It is the named residual risk in the impact analysis
(§4.4) and the constraint carried into this stage: a figure the walk never visits resolves to
position 0, ships without `loading="lazy"`, and trips `lcp-image-lazy` — silently, until a figure
actually lands there. FR-4 displaces figure and video content out of §2 into §3 functionality and §4
applications, both of which the walk already visits (`:186-187`). The hazard does not fire.

**§4 admits no video** (`ApplicationsBlockSchema`, `description-doc.schema.ts:109-112`, narrowed
deliberately in both the type and the schema), and §5 compatibility is emitted only when the source
carries it (FR-6). **§3 functionality is therefore the only unconditional destination for a video
embed displaced from §2** — and `buildVideoBlock` in frozen `task-a.ts:117` already instructs
exactly that ("place it in §3 FUNCTIONALITY, before §7"). The prompt and the shape agree, which is
part of why `task-a.ts` needs no edit (D13). `TASK_A_DOC_INSTRUCTION` restates the §3 destination so
the Doc path does not depend on reading it out of the HTML-path video block.

### D10 — FR-16: a targeted `NUMBER_FORMAT_RULES` edit, and no new detector

**Decision.** In `src/prompt-core/constants.ts` (**not** FROZEN), inside `NUMBER_FORMAT_RULES`
(`:489-501`), replace **only** the two group-3 lines and insert one:

- `de-DE: decimal comma, thousands dot (or space) → 1.234.567,89` → non-breaking space
- `es-ES: decimal comma, thousands dot (or space) → 1.234.567,89` → non-breaking space
- add `pt-PT: decimal comma, thousands non-breaking space`

The group-2 line stays **byte-identical**, because `ua-translation-style-guide.spec.ts:49` asserts
the exact substring `'uk-UA / ru-UA: decimal comma, thousands non-breaking space'`. Group 1 already
matches the decision, including `es-US / es-MX` (`:499`), so **`es-MX` needs no code delta at all** —
FR-16's group-1 placement is already what the constant says. `src/utils/number-format-fixer.ts`
(also not FROZEN) is configured for the same three groups.

`master-system-prompt.ts:83` only *interpolates* this constant, so FR-16 forces **no §9 edit**.

**No new detector is added, and that is a decision.** The impact analysis (§4.1) established that
`NBSP_THOUSANDS_LOCALES` (`output-validator.ts:44`) is declared and never referenced anywhere in the
repository — dead code — and that the live `thousands-separator` rule (`:93-102`) only flags
English-style comma grouping, so it cannot tell a dot from a non-breaking space. Switching de-DE and
es-ES therefore ships with **no automated detector**. Arming one would mean editing FROZEN
`output-validator.ts` for a rule no FR requires, and that rule would fire on `'3.0'` output and on
translated locales alike. **Accepted residual**, carried to review rather than closed. If a human
later wants it closed, the established route is a non-frozen sibling module in the shape of
`image-manifest-coverage.ts` — named here so the option is on record, not proposed as work.

### D11 — FR-14 / NFR-1: the pattern index is a pure selector in the service layer, and rides in `userContent`

**Decision.**

1. New pure module `src/prompt-core/hook-pattern.ts`: `HOOK_PATTERNS` (the v4 §1 structural
   patterns, at least 4) and `selectHookPattern(name: string, website: string): HookPattern` — a
   deterministic index over the **whole** `name` + `website` pair (OD-3).
2. `content-orchestrator.service.ts` calls it **before** building the payload — it is the only layer
   that sees `input.name` and `input.website` pre-prompt (`:860`, `:1305`) — and passes the selected
   pattern to `buildPromptADoc`.
3. `buildPromptADoc` appends the pattern instruction to **`userContent`**, the block `payload.ts:7`
   documents as *"dynamic, never cached"*. It is appended to the inherited `base.userContent`; the
   frozen builder is not modified.

**The new parameter is optional, and that is a correctness requirement, not a style preference.**
`buildPromptADoc(input: ProductInput, baseLanguageOverride?: string)` (`task-a-doc.ts:122`) has
exactly two call sites, `content-orchestrator.service.ts:860` and `:1305`, both two-argument. A
required third parameter breaks `tsc` at the moment the signature changes and before the service is
wired, so the parameter must be optional in its own change. The optional form also leaves
`task-a-doc.spec.ts:38` green unmodified, which matters under AGENTS.md §7.7. This is stated at the
plan level so a decomposition cannot reintroduce the break; see C-2.

**Why `userContent` is the only legal home (NFR-1).** `PromptPayload` is `systemBlocks[0]` = master
(cached) and `[1]` = task template (cached), plus `userContent`. A per-product value placed in
either cached block changes the cached prefix on **every single product**, which is a total cache
miss rate — the economics AGENTS.md §3 protects. `userContent` already carries every other
per-product value.

**Why a separate pure module.** FR-14 requires more than determinism: the selection must
**distribute** — reachable across all patterns, not constant, not a function of `website` alone, not
a function of one character of `name`. That is a property of a function, and a pure exported
function is directly assertable over generated input pairs without a curated fixture (NFR-5). Buried
inside the service it would be testable only through the orchestrator.

**Rejected — model-side rotation.** Generation is stateless per product (OD-3); the model has no
memory of the previous product and cannot rotate. **Rejected — a run counter or wall clock.** NFR-5
forbids both: the same `name` + `website` must yield the same pattern on every run.

### D12 — The v4 prompt contract lives entirely in `task-a-doc.ts`

**Decision.** `TASK_A_DOC_INSTRUCTION` is updated to state the v4 contract for the Doc path:

- `"schemaVersion": "4.0"` (`:48`) — FR-15;
- §2 as one heading + one merged list: `keyBenefits` admits **`bullets` Blocks only**, the combined
  `killerSpecs` + benefits item count is **at most 8** with 6 as the v4 target, and no table,
  paragraph, figure or video (FR-3, FR-4, FR-17) — replacing the §2b note at `:53`;
- §7 `value` is **a string**, multiple values comma-joined by the model (FR-9, FR-10) — replacing
  `:99-103` ("a string, or an array of strings");
- §3: mandatory, H2 per functional group, **H3 only when a group has 2+ distinct sub-functions**, no
  volume limit, v4's recommended H2 order carried as a recommendation (FR-27); the anti-duplication
  and ≥2-sentences clauses as prompt instructions (FR-28);
- §6 heading: exactly one of the two table strings for the document's locale (FR-6, D5);
- §9 CTA: the localized commercial H2 form and a single paragraph (FR-11, D6);
- the v4 word volumes — 40–85 / 90–300 / 80–250 / 50–100 — as **instructions only**, never as a
  rejection criterion (FR-17 point 3, FR-18, FR-19);
- the FR-14 selected pattern, appended to `userContent` (D11);
- the §3 destination for a displaced video embed, and the lead-in `<p>` obligation that travels with
  a figure relocated out of §2 (D9, D8's §4 table).

The existing "at least 3 items or use a paragraph Block" escape hatch (`:110-112`) stays as written:
FR-29 forbids changing the functionality bullets floor, and that clause is its prompt-layer
mitigation.

**§6's list element is deliberately NOT a prompt instruction.** `packageContents.items` is a plain
string array and the model emits no tags there — `task-a-doc.ts:93-95` puts `packageContents.items`
in the PLAIN-TEXT field list explicitly. `<ol>` versus `<ul>` is unreachable from the prompt and is
decided in D17.

**`systemBlocks` / `userContent` separation is preserved.** `buildPromptADoc` continues to return
`base.systemBlocks` with index 1 replaced and index 0 plus any ToV overlay untouched
(`task-a-doc.ts:124-129`), and `cache: true` stays on the task block. The only new dynamic value
goes to `userContent` (D11). No block is merged, split or uncached.

**The stale header comment at `task-a-doc.ts:18` is corrected.** It reads "NOT WIRED INTO
PRODUCTION"; the orchestrator selects `buildPromptADoc` whenever `usesDocPipeline(...)` is true,
which is six of seven stores (`content-orchestrator.service.ts:859-862`). A false header on the
file this Story's prompt work concentrates in is a trap for the next reader.

### D13 — FROZEN-file position (AGENTS.md §9) — REWRITTEN IN v2

The FROZEN set is exactly five files, per `.arch-guard-checksums`, read this run. Position on each,
**with evidence, because two of the Story's four named files turn out not to need editing**:

| File | Position | Evidence |
|---|---|---|
| `src/prompts/task-b.ts` | **Not touched** | SEO is out of scope (OD-8, FR-26) |
| `src/prompts/task-c.ts` | **Inspect only; no edit planned** | It translates rendered HTML and carries no version. v4 structure reaches it as HTML shape and is policed by `structural-parity`. If inspection finds a §7 `<h3>` preservation count that the §2 change invalidates, that becomes a §9 request at that point — not before (R6) |
| `src/utils/output-validator.ts` | **No edit required** | See below |
| `src/prompts/task-a.ts` | **No edit required** | See below |
| `src/prompt-core/master-system-prompt.ts` | **§9 STOP — explicit request below** | See below |

**`output-validator.ts` — no edit required.** Verified: the file contains **zero** occurrences of
`schemaVersion`, `SpecRow` or `ProductDescriptionDoc`. It is an HTML-only validator with no document
input. Neither of OD-8's two named deltas is expressible at the layer it operates on — there is no
version literal to widen and no spec-value union to narrow. Every one of its ~37 live rules was
enumerated and checked against a correct `'4.0'` render: none counts `<table>` or `<h2>`, none checks
heading sequence, and the only table-dependent rule (`checkLeadInCapitalization`'s killer-specs
branch, `:281-297`) is *conditional on the table existing* and therefore stops firing rather than
failing (D8). FR-16 needs no rule here either (D10). **Re-verified in v2 for D17:** the file contains
**zero** occurrences of `<ol>` or `<ul>` as rule subjects, so the §6 list-element change adds no
validator work and breaks no rule. **OD-8 is not contradicted** — "accept `'4.0'`, string-only spec
values" describes the intent that the validator must not reject v4-shaped output, and it does not.
The scope simply narrows once the layer is read.

**`task-a.ts` — no edit required, and this supersedes the impact analysis.** The impact analysis
(§1.1 row 3 and Hazard 4 bullet 1) states that `task-a.ts:20` ("CRITICAL: §2 … has NO H2 heading")
forces a frozen-file edit. Primary-source evidence says otherwise: that line lives in
`TASK_A_INSTRUCTION`, which is `systemBlocks[1]` (`task-a.ts:168`), and `buildPromptADoc` **replaces
index 1 wholesale** with `TASK_A_DOC_INSTRUCTION` (`task-a-doc.ts:125-127`). The line never reaches
the Doc path. What `task-a.ts` *does* contribute to that path is `base.userContent` (`:149-162`),
which was read in full: input data, official brand, delivery region, image manifest, video manifest,
template hint, custom instructions and the keyword line. Nothing there contradicts a v4 rule, and
`buildVideoBlock`'s "place it in §3 FUNCTIONALITY" (`:117`) actively **agrees** with FR-4 and D9. The
one place `TASK_A_INSTRUCTION` is still live is the plain-HTML path, taken by `Expert-3DPrinter`
alone — which D14 disposes of. Recorded as a **non-blocking finding** against the impact analysis
rather than a loop-back: one row is wrong, the survey's other work stands, and correcting it costs a
paragraph.

---

#### `master-system-prompt.ts` — the AGENTS.md §9 STOP

This plan does **not** grant the edit. It states the request and the work stops here until a human
gives explicit per-file approval in session.

**Why v1's version of this request was defective, stated so the correction is auditable.** v1
enumerated six line ranges and called the surface complete. A line-range enumeration cannot be shown
to be exhaustive, and this one was not: it missed a restatement block no range over
`[CONTENT STRUCTURE]` can reach (`:27-34`), it missed a clause **inside** a range it already claimed
(`:218`, inside `:216`), and it missed three clauses stating rules the Specification reverses
(`:247-248`, `:351`, `:459-461`). The consequence was not cosmetic: as scoped, v1 **manufactured**
risk R4 rather than closing it — after the edit, cached block 0 would still have permitted a `<p>`
and a `<figure>` in §2 while block 1 and the schema forbade both, producing schema rejections with no
tier-0 repair target. v2 replaces the method.

##### The method, and how completeness was established

The request is expressed as **negative invariants** — what must no longer be true in this file —
derived one per Specification requirement that reverses a v3 rule. The clause list below each
invariant is **evidence for the invariant, not the scope of the edit**: an implementer who finds a
further clause violating an invariant is inside the approved surface, not outside it.

Completeness was established by three independent exhaustive sweeps over the **whole 471-line
file**, not over the `[CONTENT STRUCTURE]` excerpt. Each is reproducible by the reviewer:

1. **Numeral sweep** — every superseded v3 numeral, matched exhaustively rather than sampled:

   | Superseded numeral | Replaced by | Occurrences found | Lines |
   |---|---|---|---|
   | `40–75` | FR-1 → 40–85 | **3** | `:27`, `:216`, `:218` |
   | `90–200` | FR-4 → 90–300 | **2** | `:28`, `:225` |
   | `150–2,000` | FR-27 → no limit | **2** | `:29`, `:250` |
   | `80–150` | FR-11 → 50–100 | **2** | `:34`, `:351` |

2. **Construct sweep** — every occurrence of each construct v4 deletes or changes: `table` (20 hits,
   each triaged against the section it governs — §7's twelve are untouched), the §6 `<ul>`, and the
   uk-UA CTA template string.

3. **Cross-reference sweep** — every in-band reference to a changed section: `§2` (7 hits), `§3`
   (11), `§6` (3), plus the `[IMAGE HANDLING]` placement block. This is the sweep that reaches
   `:459-461`, `:270-272` and `:309`, none of which contains a superseded numeral.

The in-band section map at `:26-38` is read as a **unit** rather than by line, because it restates
every section's whole contract and is the structure v1's method could not reach at all.

**Reading convention, stated because v1's defect lived in exactly this gap.** A sweep hit is cited
below **at its clause's full extent, not at the matched line**. `:250` in the numeral table and
`:250-251` in NI-3 are the same hit; so are `:225` and `:226-227` under NI-2, and `:216` and `:218`
under NI-1. This is the discipline whose absence let v1 claim `:216` while leaving `:218` — a
restatement three lines inside the same clause — outside the request. Where a sweep hit and an
invariant's evidence differ in line numbers, the invariant's range is the wider one and it governs.

##### The §9 request

> **Edit `src/prompt-core/master-system-prompt.ts` so that the following five statements become
> true of the file.**
>
> **NI-1 (FR-1).** No clause states a §1 hook word range other than **40–85**.
> *Evidence:* `:27` (section map), `:216` (clause head), `:218` (**inside the `:216` clause** — the
> instance that proves a claimed range was not read to its end).
>
> **NI-2 (FR-4).** No clause states or implies that §2 contains a `<table>`; that §2 carries no
> heading and no wrapper; that §2's word range is 90–200; that Key Benefits may be rendered as a
> `<p>`; or that a figure may be placed in §2.
> *Evidence:* `:28` (section map), `:225` (clause head), `:226-227` ("heading level none, wrapper
> none"), `:228-246` (the §2a three-column table block and its per-locale column headers),
> `:247-248` ("2b. WRITE Key Benefits directly under the table — one `<p>` or `<ul><li>` per
> benefit" — a `paragraph` Block is exactly what D7's schema check rejects at
> `['keyBenefits', i, 'kind']`, and the clause also references a table `:228-246` removes),
> `:459-461` ("If images remain after §4 is exhausted, place them in §5 (Compatibility) or **§2 body
> text** … weave all figures into §2–§5 prose").
>
> **NI-3 (FR-27).** No clause states a §3 word range.
> *Evidence:* `:29` (section map), `:250-251` (clause head).
>
> **NI-4 (FR-11).** No clause states a §9 word range other than **50–100**, and the uk-UA CTA
> template reads «**Чому варто купити** [Product-short] в [Store]?».
> *Evidence:* `:34` (section map), `:351` (clause head), `:356` (the uk-UA template). Word volumes
> are **prompt-only** by FR-17.3, so for §9 block 0 is the only authority there is and it currently
> states the wrong number.
>
> **NI-5 (FR-6).** No clause states the §6 heading text, and no clause states that §6's list is a
> `<ul>`.
> *Evidence:* `:32` (section map, "conditional, 1 `<h2>` + 1 `<ul>`"), `:296`
> (`<h2>What's in the box</h2> + <ul>`). The heading is code-resident per FR-6 and D4/D5; the list
> element is an `<ol>` per FR-6 and D17. `:32` is reachable only by the section-map sweep.
>
> **Tier 2 — consistency repairs inside the same approval.** These clauses do not state a reversed
> rule; they reference a construct the edit removes or renames, and left alone they leave the cached
> prompt internally incoherent. They are listed separately so the human can see that one approval
> covers two severities, not so that a dangling reference is passed off as a reversed rule.
>
> | Line(s) | What it references | Required treatment |
> |---|---|---|
> | `:42` | "compress the narrative sections (§1, §3, §4) toward their lower word bounds" | §3 has no bound after NI-3; keep §1/§4, drop §3 from the list |
> | `:103` | "Write every table (Killer Specs and §7 alike) as plain HTML" | §7 only |
> | `:153-154` | "Reserve `<ul><li>` for key features … 'What's in the box'; route all parameters into tables" | Lands twice: v4 routes §2's killer-spec parameters into a `<ul>`, and §6 becomes an `<ol>`. Re-scope "route all parameters into tables" to §7 |
> | `:221` | "a value destined for the Killer Specs **table** lives there" | Rename to the §2 list; the rule itself (give every number one home) survives |
> | `:270-272` | COLON CAPITALIZATION and BOLD-LABEL SEPARATION, both scoped to "§2b" | **Relabel to the merged §2 list — do NOT delete.** Both rules still apply to `<li><b>…</b>…</li>` items, and D8's `bold-label-glue` clearance argument depends on BOLD-LABEL SEPARATION surviving. Deleting them would weaken live coverage to tidy a name |
> | `:309` | "matching the **§2 table's** convention" (in §7's column-header block) | Restate §7's convention without the §2 back-reference |
>
> **Explicitly NOT in this request** — swept, read, and confirmed to agree with v4. Listed so the
> human can see the surface was decided rather than sampled, and so a later reader does not re-open
> a closed clause:
>
> | Line(s) | Why it stays |
> |---|---|
> | `:40` GLOBAL HARD CAP 25,000 characters | A **document-level** cap, not a §3 word range. FR-27 removes §3's *word* limit; no FR touches the character cap, and `:252-253` ("compress §1/§4 first and keep §3 substantive") already resolves the two correctly |
> | `:133-136` HEADING FORM, "AT MOST TWO `<h2>` may contain [Product-short]" | Still true after §2 gains an `<h2>`: D4's §2 heading is nominal and product-free, so it spends none of the budget |
> | `:139` "Keep every `<h2>` to 8 words or fewer" | The §2 heading is 4 words |
> | `:262` §4 "80–250 words", "Write 4–8 entries" | Already matches FR-5 |
> | `:279` §5 "CONDITIONAL, 30–100 words" | FR-6's conditional emission is already instructed; no FR states a §5 word volume, so 30–100 is not reversed |
> | `:295` §6 "CONDITIONAL — emit only when present in input" | Already matches FR-6's conditional half |
> | `:341-343` "Render a multi-value cell as ONE comma-separated string" | Already matches FR-9 |
> | `:380-382` "place it in §3 FUNCTIONALITY … always before §7" | Already matches FR-24 and D9 |
>
> **Why the edit cannot be avoided.** `MASTER_SYSTEM_PROMPT` is `systemBlocks[0]` on the Doc path
> and is cached; `TASK_A_DOC_INSTRUCTION` explicitly says *"Every [CONTENT STRUCTURE] rule about
> WHAT each section contains still applies"* (`task-a-doc.ts:41`, verified). Every clause above is
> exactly such a rule. That sentence is also why the invariant list must be complete: it imports
> **all** of block 0's content rules into the Doc path, so any one left stating a v3 rule
> contradicts block 1 and the schema at once.
>
> **Blast radius of the edit, stated with the request.** `MASTER_SYSTEM_PROMPT` is also imported by
> FROZEN `task-c.ts:87` (the translation path — all nine locales) and by `src/prompts/optimizer.ts`,
> which *"Reuses MASTER_SYSTEM_PROMPT's Schema v3.0 §1–§9 [CONTENT STRUCTURE]"* (`optimizer.ts:6`).
> **Disposition:** both are intended to follow v4 — Task C translates v4-rendered HTML and should
> not be primed with contradicted v3 §2 rules, and the Optimizer's whole purpose is to bring an
> existing description to the current standard. NI-4's template correction and NI-5's `<ol>` reach
> the translation path specifically and are the two the nine locales most directly inherit. Neither
> consumer is named by an FR, so neither gains new work in this Story; they inherit the corrected
> text. Stated so it is not discovered as an unexplained diff.
>
> **The edit is targeted.** `master-system-prompt.spec.ts` pins the §5 item-count floor (`:103`),
> §7 FLAT SOURCE (`:22`) and the `[VIDEO]` anchor (`:62`), and `constants.spec.ts` flattens the whole
> prompt and asserts against it (`:103-104`, `:143`). Every change above must be made without
> disturbing any of them, and **without modifying either spec file** — weakening a pin to fit an edit
> is an AGENTS.md §7.7 violation, not a fix.
>
> `bash arch-guard.sh --rebaseline` must be committed **in the same commit** as the edit (NFR-7,
> AGENTS.md §9).
>
> **If approval is withheld, STOP.** Do not reach for the rejected `[CONTENT STRUCTURE]` override
> below as a way around it; that alternative was rejected on its merits and rejecting the §9 request
> does not revive it.

**Rejected — override `[CONTENT STRUCTURE]` from `task-a-doc.ts` instead of editing it.** The
precedent exists in that very file: `TASK_A_DOC_INSTRUCTION` already supersedes `[FORMAT]`
(`:39-41`). It loses on two grounds. First, `[FORMAT]`'s override is a **serialization** switch —
HTML versus JSON — that a model cannot half-apply; "§2 is a table with no heading" (cached block 0)
versus "§2 is one `<h2>` and one `<ul>`, no table" (cached block 1) is a **structural**
contradiction it can, and the failure would be a partially-v4 §2 that no single check names.
Second, the one clean sentence that keeps `COLON_CAPITALIZATION_RULE`, BOLD-LABEL SEPARATION, §5
ROUTING, §7 FLAT SOURCE and the `[HEADING FORM]` references alive on the Doc path would have to
become a per-clause exception list — and the v2 sweep makes that concrete: it would need at least
sixteen exceptions, which is strictly more fragile than correcting the source.

**Rejected — adding the missing lines to v1's six-clause table.** It fixes the symptom and leaves
the defect. The table would still be a line-range enumeration presented to a human as a complete
approval surface, with no stated way to verify that it is one; the next clause anyone adds to this
471-line file would silently fall outside it. The review's own words are the standard adopted here:
the request must be expressed as *what must no longer be true in this file*, with the line list as
evidence rather than as the scope.

### D14 — U2 decided: `Expert-3DPrinter` is excluded until it can render

**Decision.** `Expert-3DPrinter` is **out of reach of this Story**, and `doc-pipeline-flag.ts`,
`DOC_PIPELINE_STORES` and `STORE_REGISTRY.imageBaseUrl` are **not modified**.

**Why.** Three verified facts (impact analysis §6.2): it is absent from `DOC_PIPELINE_STORES`
(`doc-pipeline-flag.ts:51-56`), so the orchestrator takes the plain-HTML `buildPromptA` branch and
no `ProductDescriptionDoc` — hence no `schemaVersion` — is ever produced for it; its `imageBaseUrl`
is `''`, so `renderContextFor()` refuses it by design and `render-conformance.spec.ts:136-137` puts
its three store-locale pairs in the UNRENDERABLE bucket; and `doc-pipeline-flag.ts:43` records it as
*"a placeholder that is not yet trading"*. No FR names `doc-pipeline-flag.ts`, and enrolling the
store requires a real CDN path this Story cannot supply. Enrolling it would also be the first broad
test of the Doc pipeline on a store with no evidence behind it, which that file's opt-in rationale
exists to prevent.

**What the exclusion costs, stated as a residual rather than hidden.**

- FR-15 ("every new generation emits `'4.0'`") is satisfied for the **six** Doc-pipeline stores.
  `Expert-3DPrinter` emits no document of any version and therefore violates nothing; it also
  demonstrates nothing.
- FR-16's `es-MX` group-1 placement, and the D4 heading-table entries for `en-US` and `es-MX`, have
  **no renderable path exercising them end to end**. The entries are still authored — NFR-6 keys the
  table over all ten `STORE_REGISTRY` locales — and are unit-tested against the registry; they are
  simply not exercised through a render.
- `TASK_A_INSTRUCTION`'s v3 §2 line stays live on exactly one non-trading store's plain-HTML path.
  This is the second reason `task-a.ts` needs no edit (D13).

The store joins when it has its own `imageBaseUrl` and is added to `DOC_PIPELINE_STORES` — one line,
in its own Story, on the evidence bar that file already sets.

### D15 — FR-13: the FAQ prompt gains the v4 numbers and nothing else

**Decision.** `src/prompts/task-faq.ts` (not FROZEN) carries v4 §9's 3–5 pairs, 2–4 factual
sentences per answer and 150–400 words. **The trigger is unchanged** — a FAQ is produced only when
supplemental content is supplied (OD-10) — and the call architecture is unchanged. Nothing makes FAQ
markup reachable from the description body; FR-13's prohibition is satisfied because the FAQ is a
separate artifact and always has been.

### D16 — FR-30: no new mechanism, and no downgrade path is introduced

**Decision.** No code is added for FR-30. `assertDocRendered` (`doc-schema-issues.ts:144-174`)
already throws with the unresolved schema failures named, on the stated grounds that persisting an
empty description is *"a silent data loss that surfaces days later"*. This plan's obligation is
**negative**: it introduces no `'4.0'` → `'3.0'` fallback anywhere. D1 emits `'4.0'` from the prompt
and validates it in the schema; there is no code path that retries as `'3.0'`, and none is added.
FR-15 would make such a fallback a silent violation rather than a graceful degradation.

### D17 — NEW IN v2. FR-6's §6 list element is an `<ol>`, inside D8's `schemaVersion` branch

**The question the review found unanswered.** FR-6 and AC-5 both require, in the same words, that
"the section is an `<ol>`" under the localized heading. Today `render-description.ts:337-338` emits:

```
parts.push(`<h2>${esc(doc.packageContents.heading)}</h2>\n<ul>\n${items}\n</ul>`);
```

— a `<ul>`, unconditionally. Re-verified this run at `render-description.ts:336-339`. v1 reached
this nowhere: D5 decided only the §6 *heading*, D8 asserted "nothing else in `renderDescription`
changes", and no file list named the element.

**Why it can only be decided here.** `packageContents.items` is `z.array(NonEmpty).min(1)`
(`description-doc.schema.ts:177`) — a plain **string** array. The model emits no tags into it;
`task-a-doc.ts:93-95` lists `packageContents.items` among the PLAIN-TEXT fields that "ADMIT NO TAGS
AT ALL". The list element is therefore the renderer's choice alone, unreachable from the prompt and
unexpressible as a schema rule. It is an architecture decision, which is why it loops back here
rather than to the task planner.

**Decision. The `<ol>` is version-scoped: it is the third point of D8's `schemaVersion` branch.**

```
doc.schemaVersion === '4.0' ? '<ol>…</ol>' : '<ul>…</ul>'
```

The `<h2>` and the `<li>` items are unchanged on both paths; only the list container branches.

**Why version-scoped rather than unconditional.** FR-15 and OD-2 settle it in one sentence: a
`'3.0'` document "keeps the previous handling rules **wherever they differ**". `<ul>` is such a
rule — it is the element every already-shipped `'3.0'` artifact carries — and nothing in the
Specification applies the v4 `<ol>` retroactively. FR-6's `<ol>` clause sits in a requirement about
v4 output; AC-5 is an acceptance criterion for the v4 migration; FR-10's string-only rule and FR-4's
§2 composition are both scoped to `'4.0'` by explicit text, and this is the same class of change.
Unconditional would mean a re-render of a cached `'3.0'` document silently producing HTML different
from what shipped — the drift OD-2's cache-preservation rationale exists to prevent — and it would
do so for a change no requirement asks to be retroactive.

**The corpus is not evidence either way, and this is stated so it does not read as safety.**
Neither committed corpus item carries `packageContents` at all — verified this run by grepping both
`.doc.json` files, which return no match. `test/render-reconciliation.spec.ts` would therefore stay
byte-for-byte green under *either* choice. The reconciliation harness, which is this plan's cheapest
detector everywhere else, is blind here. That is precisely why the decision has to rest on FR-15's
text and why it needs a validation category of its own (V15) rather than inheriting D8's.

**Cost of the branch, stated.** One conditional in one `if (doc.packageContents)` block. It does not
touch `figurePositions` or `forEachBlockInOrder` (D9 — a tag change is not a new collection), it
adds no schema surface, and it changes no `<section>` or `<hr>` count, so D8's §4 table is unaffected
in every row.

**Rejected — an unconditional `<ol>`.** Simpler by one conditional, and untestably so: it changes
cached `'3.0'` render output against FR-15's explicit "keeps the previous handling rules wherever
they differ", for a change no requirement makes retroactive, in a place the corpus cannot detect.
The saving is one ternary; the cost is a silent divergence between a shipped artifact and its
re-render.

**Rejected — a `listStyle` field on `packageContents`.** It would make the element model-authored,
which contradicts the same instinct FR-6 applies to the heading — a fixed structural choice is not
the model's to make — and it would add a schema field with a `'3.0'` compatibility question for a
decision that has exactly one correct answer per version.

**Accepted residual → R9.** `structural-parity` counts neither `<ol>` nor `<ul>`, so a translated
locale that reverts the `<ol>` to a `<ul>` is not detected, while FR-20 requires v4 structure in
every locale.

---

## Constraints on decomposition

These are plan-level constraints, not tasks and not an ordering. `so-implementation-planner` owns
the order; these bound what any order may do. Each is derived from repository fact re-verified this
run, and each exists because a decomposition that ignores it produces a commit that cannot be green.

### C-1 — No `'4.0'`-typed artifact may be committed before the `schemaVersion` union is widened

**The facts.** `src/domain/description-doc.ts:122` is the literal `schemaVersion: '3.0';` until D2
lands. `tsconfig.json` `include` carries `"test/**/*"`, deliberately — its own comment records that
"`test/**` was invisible to `npm run lint` until now … a type error in a spec surfaced as nothing at
all". `npm run lint` is `tsc --noEmit` (`package.json:11`).

**The constraint.** Any fixture, builder or helper producing a value typed as
`ProductDescriptionDoc` with `schemaVersion: '4.0'` must land **at or after** the change that widens
the union (D2). A change that creates `'4.0'`-typed values before it cannot end in a commit with
`npm run lint` green, and therefore fails AGENTS.md §6 item 1 and §13's "a commit is one complete,
working change". Red *tests* between changes are the intended TDD state; a red type-check is not.

**Typing them loosely does not lift the constraint.** `renderDescription` takes a
`ProductDescriptionDoc`, so any fixture the renderer consumes must be that type; the valid-`'4.0'`
builder and the per-locale conformance variant are both consumed by rendering categories (V3, V14).

**And the `'3.0'` baseline must NOT be merged into the widening change to satisfy this.** The
hand-authored `'3.0'` fixtures (V1's four leak shapes) typecheck against today's schema and must be
committed **against the unmodified schema**, because that is the whole of their evidentiary value:
a `'3.0'` shape that passes only after the schema moved proves nothing about the schema not having
moved. Collapsing the two into one change destroys the baseline. The correct shape is a split — the
`'3.0'` family early, the `'4.0'` family at or after D2 — not a merge.

### C-2 — The `buildPromptADoc` hook-pattern parameter is optional in the change that introduces it

`buildPromptADoc(input, baseLanguageOverride?)` has exactly two call sites, both two-argument
(`content-orchestrator.service.ts:860`, `:1305`). A required parameter breaks `tsc` in the change
that adds it, before the service is wired. It must be optional, in its own change, for the same §13
reason as C-1. See D11.

### C-3 — Contract before consumer

D4's heading table precedes D5's membership check and D6's resolver; D2's widened union precedes
D8's and D17's renderer branches; D11's `HookPattern` type precedes the `buildPromptADoc` parameter,
which precedes the service wiring. These are type dependencies, not preferences.

### C-4 — The §9 stop is a precondition of the `master-system-prompt.ts` change alone

D13's approval gates exactly one change. It must not be made a precondition of the other eleven:
blocking the whole Story on a human gate converts a gate into a stall. The cost of that choice is
R4's window, which is stated as a cost rather than hidden.

---

## Files to create / modify

Derived from the impact analysis §1, not re-surveyed.

### Create

| File | What it holds |
|---|---|
| `src/prompt-core/hook-pattern.ts` | `HOOK_PATTERNS` (≥4 v4 §1 structural patterns) and the deterministic, distributing `selectHookPattern(name, website)` (D11) |

### Modify — domain

| File | Change |
|---|---|
| `src/domain/description-doc.schema.ts` | `schemaVersion` → `z.enum(['3.0','4.0'])`; one new version-guarded `superRefine` carrying FR-4 composition, FR-10 string-only value, FR-17 combined ceiling, FR-27 subsections bound, FR-6 §6 heading membership (D1, D3, D5, D7) |
| `src/domain/description-doc.ts` | `schemaVersion: '3.0' \| '4.0'`. Nothing else — the `_typeCheck` guard moves them together (D2). C-1 sequences against this line |

### Modify — prompt

| File | Change |
|---|---|
| `src/prompts/task-a-doc.ts` | `TASK_A_DOC_INSTRUCTION` → the v4 contract; the optional FR-14 pattern parameter, appended to `userContent`; the stale `:18` header corrected (D11, D12, C-2) |
| `src/prompt-core/constants.ts` | New per-locale heading constant (§2, §6 ×2, §9 CTA template) beside `DELIVERY_REGION_PHRASES`; `MANDATED_NOMINAL_H2` gains the uk-ua / ru-ua §2 entries; `NUMBER_FORMAT_RULES` targeted group-3 + `pt-PT` edit (D4, D10) |
| `src/prompts/task-faq.ts` | v4 §9 numbers; trigger unchanged (D15) |
| `src/prompt-core/master-system-prompt.ts` | **FROZEN — §9 request only, ungranted.** The five negative invariants NI-1..NI-5 and the six tier-2 consistency repairs of D13. The line lists there are evidence, not scope |

### Modify — render

| File | Change |
|---|---|
| `src/render/render-description.ts` | One `schemaVersion` branch with three points: §2 composition (`renderKeyBenefitsV4`), the §9 CTA heading from the template, and the §6 `<ol>`. `renderKillerSpecs` and every other function unchanged (D6, D8, D17) |
| `src/prompt-core/store-render-rules.ts` | `StoreRenderRules` gains the CTA-heading template resolver, honouring the Center 3D Print override, in the shape of `killerSpecsHeaders` (D6) |

### Modify — service

| File | Change |
|---|---|
| `src/services/content-orchestrator.service.ts` | Calls `selectHookPattern` pre-prompt and passes the result to `buildPromptADoc` (D11) |

### Modify — utils

| File | Change |
|---|---|
| `src/utils/number-format-fixer.ts` | Configured for the three FR-16 groups (D10) |

### Explicitly NOT modified

`src/prompts/task-a.ts` (D13), `src/utils/output-validator.ts` (D13), `src/prompts/task-b.ts`,
`src/prompts/task-c.ts` (inspect only, R6), `src/domain/description-doc.ts`'s
`forEachBlockInOrder` (D9), `src/prompt-core/doc-pipeline-flag.ts` (D14),
`src/utils/structural-parity.ts`, `src/utils/repair-strategy.ts`,
`src/render/doc-schema-issues.ts` (D16), and the whole consumables pipeline —
`src/prompts/task-a-consumables-doc.ts`, `src/domain/consumables-doc.schema.ts`,
`renderConsumablesDoc` (OD-6).

**`test/tools/scaffold-doc.mjs` stays a `'3.0'` instrument** (carried review item). It writes
`schemaVersion: '3.0'` at `:317` and `scaffold-doc.spec.ts:241` asserts exactly that. No FR names it,
and no `'4.0'` item is added to `test/fixtures/corpus/` by this Story, so the scaffolder is never
exercised on v4 here. Stated rather than left silent so the first person who tries to grow the
corpus with a v4 item finds the answer already written rather than assuming an omission.

**No `server/**` file is reached**, so `server/usage/store.js`'s migration-free
`CREATE TABLE IF NOT EXISTS` reality is not in play (impact analysis Hazard 7).

---

## Validation strategy

**Every category lands in `npm run test:logic` (vitest).** The only `*.component.spec.ts` in the
repository is `model-settings.component.spec.ts`, and nothing in FR-1..FR-30 reaches
`src/app/components/` (impact analysis Hazard 6). `npm test` runs both runners; the component runner
gains no work. `so-test-writer` owns the tests themselves; this section names the categories so a
missing one is visible now.

| # | Category | Asserts | File(s) |
|---|---|---|---|
| V1 | **`'3.0'` compatibility (the leak suite)** | A `'3.0'` document with (a) a single-`<h3>` functionality group, (b) a `paragraph` / `figure` / `video` Block in §2, (c) an array `SpecRow.value`, (d) a combined §2 list over 8 items **still parses**. Closes L1/L2/L3/L4 as regressions, and these shapes are **absent from both corpus items** (impact §5), so they must be hand-authored. Per C-1 these fixtures are `'3.0'`-typed and land before the widening | `src/domain/description-doc.schema.spec.ts` |
| V2 | **`'4.0'` enforcement** | Each of the same four shapes **fails** under `'4.0'`, at the expected dotted path (`functionality.1.subsections`, `keyBenefits.0.kind`, `specs.categories.0.rows.0.value`, `keyBenefits`) | `src/domain/description-doc.schema.spec.ts` |
| V3 | **Renderer version branch — §2** | A `'4.0'` doc renders exactly one `<h2>` and one `<ul>` in §2, no `<table>`, the merged item order, and the `<b>lead</b> — benefit` form; a `'3.0'` doc renders the table shape unchanged | `src/render/render-description.spec.ts` |
| V4 | **Corpus reconciliation stays green** | Both `'3.0'` fixtures still reproduce byte-for-byte. This is the L6 detector and the cheapest early signal — **for §2 and the CTA only; it is blind to V15, see D17** | `test/render-reconciliation.spec.ts` (unchanged) |
| V5 | **Hook pattern index** | Determinism (same `name`+`website` → same pattern, NFR-5) **and distribution** (every pattern reachable over distinct pairs; not constant; not a function of `website` alone; not a function of one character of `name`) — FR-14's property asserted against the system, not a curated fixture | `src/prompt-core/hook-pattern.spec.ts` (new) |
| V6 | **NFR-1 caching separation** | `buildPromptADoc` puts the pattern in `userContent`; `systemBlocks[0]` and the overlay survive; index 1 is the Doc instruction; `cache: true` unchanged. Two different products yield different `userContent` with **identical** `systemBlocks` | `src/prompts/task-a-doc.spec.ts` |
| V7 | **Heading tables** | Every `STORE_REGISTRY` locale has a §2, §6-single, §6-set and §9-template entry, with the key set **derived from the registry** (NFR-6). Registry-count tripwire (`toHaveLength(7)`) unaffected | `src/prompt-core/constants.spec.ts` |
| V8 | **Heading-style interaction** | A rendered `'4.0'` document for Center 3D Print in uk-UA / ru-UA raises **no** `h2-nominal-heading`, and `heading-product-name-stuffing` still sees at most two product-named `<h2>`s | `src/utils/heading-style.spec.ts` |
| V9 | **FR-16 targeted edit** | `ua-translation-style-guide.spec.ts:49` stays green (group-2 line byte-identical); new assertions for the corrected de-DE / es-ES lines and the added `pt-PT` line; `es-MX` unchanged | `src/prompt-core/ua-translation-style-guide.spec.ts`, `src/prompt-core/constants.spec.ts` |
| V10 | **Prompt contract** | `TASK_A_DOC_INSTRUCTION` states `"4.0"`, string-only §7 value, bullets-only §2, the ≤8 ceiling, the §3 H3 rule. And `task-a.spec.ts` stays green **unmodified**, which is the evidence that `task-a.ts` was not edited | `src/prompts/task-a-doc.spec.ts`, `src/prompts/task-a.spec.ts` |
| V11 | **Structural parity across the nine locales** | A v4 master and a translation that drops the §2 `<h2>`, re-adds a `<table>`, or changes the `<li>` count all fail `structural-parity-count` — the mechanism this plan relies on in place of a validator rule (D7). **And the negative half:** a translation that swaps `<ol>` for `<ul>` does **not** fail, which is R9 asserted rather than assumed | `src/utils/structural-parity.spec.ts` |
| V12 | **FR-18 / FR-19 negative check** | No schema or validator rule rejects on word count; an 86-word hook parses and renders | `src/domain/description-doc.schema.spec.ts` |
| V13 | **FR-30 exhaustion** | An unrepairable `'4.0'` generation throws with the schema failures named and persists nothing; **no path emits `'3.0'` as a fallback** | `src/services/content-orchestrator.doc-gate.spec.ts` |
| V14 | **Conformance across stores** | `render-conformance.spec.ts` passes for a `'4.0'` `conformanceDoc(locale)`; `Expert-3DPrinter` stays in the UNRENDERABLE bucket (D14) | `test/render-conformance.spec.ts` |
| **V15** | **NEW IN v2 — §6 list element, both versions** | A hand-authored `'3.0'` document **carrying `packageContents`** renders `<h2>` + `<ul>`; the `'4.0'` document renders `<h2>` + `<ol>`; the `<li>` items and the heading are identical on both paths. **This category cannot be delegated to V4:** neither corpus item carries `packageContents`, so reconciliation is green under either choice and detects nothing (D17). Without V15 the D17 branch ships unchecked in both directions. **Its two halves separate under C-1:** the `'3.0'` `<ul>` assertion is `'3.0'`-typed, is unconstrained by C-1, and is *strongest committed against the unmodified renderer* — it is the assertion that proves D17 changed no cached behaviour, and it proves nothing if it first runs after the branch exists. The `'4.0'` `<ol>` assertion is `'4.0'`-typed and lands at or after D2. Do not bind the category as one unit to the later change | `src/render/render-description.spec.ts` |

**Coverage.** `src/domain/**`, `src/render/**`, `src/prompt-core/**` and `src/utils/**` are all in
the v8 include list, so every file this plan modifies except
`src/services/content-orchestrator.service.ts` is measured against the AGENTS.md §5 floors.

**The corpus cannot supply the `'4.0'` side, and that is a finding, not a surprise.**
`test/render-reconciliation.report.md` §5 records that the corpus is two items of the same product,
and the impact analysis measured that neither carries a `'4.0'` document, a non-`bullets` §2 Block,
a video, `packageContents`, `compatibility`, an array spec value or a single-`<h3>` group. The
reconciliation corpus is the wrong instrument for `'4.0'` **by construction** — it reconciles
against artifacts production has already shipped, and production has shipped no v4 artifact.
Hand-authored fixtures are required for both sides of V1, V2 and V15, and C-1 governs when each
family may land.

---

## Risks

| # | Risk | How it surfaces |
|---|---|---|
| R1 | **The §9 approval for `master-system-prompt.ts` is not granted.** Without it, the cached master prompt keeps telling the model §2 is a table with no heading, while the task block says otherwise | IMPLEMENTATION cannot start on the §2 prompt work. It is a gate, not a silent failure — D13 makes the stop explicit. C-4 confines the gate to one change |
| R2 | **The combined §2 ceiling has no tier-0 repair target** and degrades to fuller regeneration — the same class of miss that exhausted the budget on 2026-08-17 | Repeated `failed-schema` / budget exhaustion on §2. Visible in the generation log and as an FR-30 throw. Mitigated by the `measured` operands (D7) letting the tier-1 instruction state the exact surplus |
| R3 | **Group-3 separators ship with no detector.** A de-DE artifact keeping `1.234.567,89` produces zero validator issues (D10) | Only by human review of a de-DE or es-ES artifact. Recorded as an accepted residual with a named route to close it later |
| R4 | **Two contradictory §2 rule sets in one cached prompt.** *Restated in v2.* In v1 this risk was **manufactured by the plan itself**: the six-clause §9 request left block 0 permitting a `<p>` and a `<figure>` in §2 while block 1 and the schema forbade both. D13's NI-2 closes that by construction — the invariant is violated by *any* such clause, not only by six named ones. The risk that remains is the original one: if R1 resolves toward the rejected `task-a-doc.ts` override, the contradiction returns | A partially-v4 §2 that no single check names, reaching the repair ladder as a schema rejection with no tier-0 target. Which is why the override was rejected (D13) and why rejecting the §9 request does not revive it |
| R5 | **A hand-authored `'4.0'` fixture encodes the plan's assumption rather than real model output.** No production v4 artifact exists to reconcile against | Only on the first live generation. `test/doc-generation-live.spec.ts` exists for this and is opt-in (`LIVE_DOC_TEST=1`); it is never part of the gate |
| R6 | **`task-c.ts` inspection finds a §7 `<h3>` preservation count invalidated by the §2 change**, turning "inspect only" into a second §9 request | During inspection, before implementation. D13 states the condition rather than assuming the outcome. v2 note: the goal that inspection serves — one complete approval surface asked for **once** — is now actually achievable, because D13 no longer leaks from inside `master-system-prompt.ts` |
| R7 | **The §2 `<h2>` shifts `structural-parity` counts in all three of `<h2>`, `<table>` and `<li>` simultaneously.** A translation that reproduces two of the three fails loudly | `structural-parity-count` errors on the first v4 translation run — a loud failure, which is the desired behaviour |
| R8 | **NFR-3 (retrieval separate from generation) has no automated check.** A green arch-guard is not evidence it holds | Only by review. Nothing in this plan moves web search or page fetch into a generation path; `so-implementation-verifier` checks it by reading the diff |
| **R9** | **NEW IN v2. The §6 `<ol>` is invisible to structural parity.** `COUNTED_TAGS` (`structural-parity.ts:33-43`) counts `<li>` but neither `<ol>` nor `<ul>`, verified by reading the array in full. A translated locale that renders §6 as a `<ul>` reproduces every counted tag and passes, while FR-20 requires the v4 structure in every locale | **Not automatically.** Only by human review of a translated artifact, or by the V11 negative assertion which records the gap rather than closing it. **Accepted, not closed:** arming it means adding two tags to `COUNTED_TAGS`, which would retroactively fail every cached `'3.0'` translation pair that legitimately carries a `<ul>`, for a locale set that has no `schemaVersion` to scope against — the same version-blindness argument D7 makes about the validator. The route to close it later is the same sibling-module shape named in D10 |
| **R10** | **NEW IN v2. A decomposition re-merges the fixture families and breaks the type-check.** C-1 forbids `'4.0'`-typed artifacts before the union widens, *and* forbids merging the `'3.0'` baseline into the widening change to satisfy it. Satisfying one by violating the other is the obvious wrong turn | Immediately and loudly, in the direction that matters: a premature `'4.0'` fixture fails `npm run lint` at its own commit. The *other* direction is silent — a merged baseline still goes green, and the loss is evidentiary, not mechanical. C-1 states the reason in the artifact so review can check it by reading, since no command can |

---

## Rejected alternatives

| Rejected | In favour of | Reason |
|---|---|---|
| `z.discriminatedUnion('schemaVersion', […])` | D1 — widened enum + guarded refine | Duplicates the object body and the ref-check refine; doubles the inference fragility the file's TSCONFIG NOTE already documents |
| Parse-time `'3.0'` → `'4.0'` upcast | D1 | Holds cached documents to bounds they were never generated under — defeats OD-2 outright |
| `.min(2)` on `makeSubsectionSchema` | D3 — a §3-only, `'4.0'`-only refine | One shared factory feeds `functionality` and `compatibility`; the bound would reject cached single-`<h3>` documents and govern §5, which FR-27 does not |
| A new `keyBenefitsHeading` schema field | D4 — code-resident table | Breaks every cached `'3.0'` document if required; can't be allow-listed in `MANDATED_NOMINAL_H2`; leaves a test with no expected string |
| Renderer-assembled §6 heading | D5 — membership check | The single-vs-set choice is information only the model has |
| A §6 `kind: 'single' \| 'set'` discriminator | D5 | Adds schema surface and a `'3.0'` compatibility question for behaviour the membership check already delivers |
| **An unconditional §6 `<ol>`** | **D17 — inside the version branch** | Changes cached `'3.0'` render output against FR-15's "keeps the previous handling rules wherever they differ", for a change no requirement makes retroactive, in the one place the reconciliation corpus cannot detect it (neither fixture carries `packageContents`). Saving: one ternary |
| **A `listStyle` field on `packageContents`** | **D17** | Makes a fixed structural choice model-authored — the same instinct FR-6 rejects for the heading — and adds a `'3.0'` compatibility question for a decision with one correct answer per version |
| FR-4 / FR-17 checks in `validateGeneratedHtml` | D7 — schema only | `validateGeneratedHtml` has no Doc and no version **by construction**; the rule would fire on `'3.0'` HTML and on nine locales that never had a version |
| The same checks in **both** layers | D7 | The only gain is the nine translated locales, and `structural-parity` already counts `<h2>`, `<table>` and `<li>` against the master |
| **Adding `<ol>` / `<ul>` to `COUNTED_TAGS`** | **R9 — accepted residual** | Retroactively fails every cached `'3.0'` translation pair that legitimately carries a `<ul>`, for a locale set with no `schemaVersion` to scope against — D7's version-blindness argument, applied to parity |
| An unconditional §2 renderer rewrite | D8 — version branch | Breaks both corpus fixtures byte-for-byte (leak L6) — and the branch turns that same harness into the early detector |
| Deleting `killerSpecsHeaders` as dead | D8 | Still used by the `'3.0'` path and `table-finalize.ts`; `store-render-rules.spec.ts` asserts the delegation for every registry entry |
| Overriding `[CONTENT STRUCTURE]` from `task-a-doc.ts` | D13 — the §9 request | A structural contradiction between two cached blocks is half-appliable in a way `[FORMAT]`'s serialization switch is not; and v2's sweep makes the exception list concrete at **sixteen** clauses |
| **Adding the missing lines to v1's six-clause table** | **D13 — negative invariants** | Fixes the symptom, keeps the defect: a line-range list presented as a complete approval surface with no way to verify that it is one. The next clause added to this 471-line file falls silently outside it |
| **Deleting `:270-272` (COLON CAPITALIZATION, BOLD-LABEL SEPARATION) along with the §2b name** | D13 tier 2 — relabel | Both rules still govern the merged §2 `<li>` items, and D8's `bold-label-glue` clearance argument depends on BOLD-LABEL SEPARATION surviving. Deleting live coverage to tidy a stale label is an AGENTS.md §7.7-class move |
| Editing `output-validator.ts` per OD-8 | D13 — no edit | Verified: no `schemaVersion`, no `SpecRow`, no Doc, and no `<ol>`/`<ul>` rule; neither delta is expressible at that layer |
| Editing `task-a.ts` per the impact analysis | D13 — no edit | `TASK_A_INSTRUCTION` is `systemBlocks[1]`, which `buildPromptADoc` replaces wholesale |
| Enrolling `Expert-3DPrinter` in `DOC_PIPELINE_STORES` | D14 — exclusion | Its `imageBaseUrl` is `''` so it cannot render; no FR names `doc-pipeline-flag.ts`; a CDN path is not this Story's to supply |
| Arming a group-3 thousands detector | D10 — accepted residual | Requires editing FROZEN `output-validator.ts` for a rule no FR requires, and it would fire on `'3.0'` and translated output |
| A cached `systemBlock` for the FR-14 pattern | D11 — `userContent` | A per-product value in a cached block is a 100% cache-miss rate (NFR-1, AGENTS.md §3) |
| **Merging the `'3.0'` baseline fixtures into the schema-widening change** | **C-1 — a split** | The baseline's evidentiary value is that it passes against the *unmodified* schema. Merged, it proves nothing about the schema not having moved |

---

## Traceability

Every `FR-n` maps to at least one design decision or named file.

| FR | Design decision / file |
|---|---|
| FR-1 hook, single `<p>`, fixed opening | D12 (`task-a-doc.ts`), D13 (§9 request, **NI-1**: `:27`, `:216`, `:218`) |
| FR-2 hook 2–4 technical values | D12 — prompt-only by the Specification's own text |
| FR-3 `killerSpecs` 3–4, `<b>lead</b> — benefit` | D8 (renderer item form), D12; count already pinned at `description-doc.schema.ts:160` |
| FR-4 §2 = one `<h2>` + one `<ul>` ≤ 8, no table | **D1, D4, D7, D8, D12, D13 (NI-2, incl. `:247-248` and `:459-461`)** |
| FR-5 applications 4–8 | unchanged bound at `:174`; D12 restates it; `master-system-prompt.ts:262` already agrees (D13 exclusion list) |
| FR-6 §5/§6 conditional; §6 heading code-resident; **§6 is an `<ol>`** | **D4, D5 (heading), D17 (`<ol>`)**, D13 (§9 request, **NI-5**: `:32`, `:296`), V15 |
| FR-7 one `<h3>` + table per category | unchanged `renderSpecs`; `spec-category-shape.ts` unchanged |
| FR-8 no list or `<br>` in a value cell | D1 (string-only value makes a nested list unrepresentable for `'4.0'`); `br-spacing` unchanged |
| FR-9 multi-value comma-joined in one row | **D1** (string-only), D12 (prompt joins); `master-system-prompt.ts:341-343` already agrees (D13 exclusion list) |
| FR-10 string-only scoped to `'4.0'` | **D1** |
| FR-11 CTA, localized commercial H2, 50–100 | **D6**, D4 (template in the same constant), D12, D13 (§9 request, **NI-4**: `:34`, `:351`, `:356`) |
| FR-12 no `<h1>` | renderer emits none; `duplicate-h1` unchanged (D8 table) |
| FR-13 FAQ separate, 3–5 pairs | **D15** |
| FR-14 deterministic, distributing pattern index | **D11**, C-2, V5 |
| FR-15 every new generation emits `'4.0'`; `'3.0'` keeps its own rules | **D1** (enum), D12 (prompt), D14 (scope of "every"), **D17** (the "wherever they differ" clause is what scopes the `<ol>`) |
| FR-16 three separator groups, `es-MX` in group 1 | **D10** |
| FR-17 item counts validated; §2 ceiling cross-collection; volumes prompt-only | **D7**, D1, D12 |
| FR-18 no rejection on word count | **D7** (volumes stay prompt-only), V12 |
| FR-19 volumes measured on rendered uk-UA only | D12; nothing added to the translate path |
| FR-20 v4 structure preserved in every locale | **D7** rationale, `structural-parity.ts` unchanged, V11 — **and R9**, the one property parity cannot see |
| FR-21 unit spacing, value fidelity | D8 table (`unit-spacing` unchanged); D10 localizes punctuation only |
| FR-22 spec-count parity under comma-joining | D8 table; `spec-count-parity.ts` unchanged |
| FR-23 figure structure and lazy-loading | **D9**, D8 table — **including the placement row that puts `:459-461` in the §9 request** |
| FR-24 video survival and iframe markup | **D9** (§3 is the only unconditional destination), D8 table; `master-system-prompt.ts:380-382` already agrees (D13 exclusion list) |
| FR-25 markup discipline | D8 table (`<hr>` after the one `</section>`, no Markdown) |
| FR-26 standing criteria; `meta-description-currency` stays disarmed | **D13** — `output-validator.ts` is not edited, so the rule cannot be "fixed" |
| FR-27 §3 mandatory, H2/H3 rule, no volume limit | **D3**, D12, D13 (§9 request, **NI-3**: `:29`, `:250-251`; and tier-2 `:42`) |
| FR-28 distinct technical aspects, no restatement | D12 — declared unenforced prose by the Specification |
| FR-29 no change to the functionality bullets floor | D3 (the factory is untouched), D12 (the escape-hatch clause stays) |
| FR-30 exhaustion fails loudly, never downgrades | **D16** |
| NFR-1 prompt-caching separation | **D11**, D12, V6 |
| NFR-2 provider independence | No behaviour here depends on the active provider |
| NFR-3 retrieval separation | Nothing in this plan moves search or fetch into generation (R8) |
| NFR-4 secrets | No API key path is touched |
| NFR-5 determinism | **D11**, V5 |
| NFR-6 `STORE_REGISTRY` the only source | **D4** (table keyed over registry locales), D6 (store name), V7 |
| NFR-7 FROZEN discipline | **D13** |
| NFR-8 cache preservation | **D1**, D3, D8, **D17**; V1, V4 and V15 are its evidence |

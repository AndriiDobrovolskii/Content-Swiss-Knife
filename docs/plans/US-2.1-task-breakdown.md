---
artifact: task_breakdown
story: US-2.1
version: 2
status: APPROVED
owner: so-implementation-planner
created_at: 2026-09-20T16:00:00Z
updated_at: 2026-09-21T10:00:00Z
supersedes: docs/plans/US-2.1-task-breakdown.md#1
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 2
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 2
  - key: plan_review
    version: 1
  - key: task_breakdown
    version: 1
open_decisions_blocking: false
---

# Task Breakdown — US-2.1: Migrate product descriptions to the v4.0 UA content schema

Thirteen tasks. The architecture is decided in `docs/plans/US-2.1-implementation-plan.md` **v2**
(D1..D17, C-1..C-4, V1..V15, R1..R10); nothing here re-decides it. This document decides **order**,
**per-task track**, and **what a person or a gate sees when each task is done**.

## Revision note (v2)

This is the v2 revision, decomposed from implementation plan **v2**, after `so-plan-reviewer`
returned `CHANGES_REQUIRED` on the v1 plan and the v1 breakdown reviewed together
(`docs/reviews/plans/US-2.1-plan-review.md` v1). Two of the three blocking findings land here.

| Review finding | Closed in v2 by |
|---|---|
| 1 — the §9 request for `master-system-prompt.ts` is enumerated by line number and the enumeration leaks | **T12, rewritten.** The request is no longer a six-clause table. It is plan v2's five negative invariants **NI-1..NI-5**, each with its evidence clauses, carried together with the **three-sweep completeness method** over the whole 471-line file and the **reading convention** that cites a hit at its clause's full extent. Surface: **sixteen tier-1 clauses** (NI-1 ×3, NI-2 ×6, NI-3 ×2, NI-4 ×3 including `:356`, NI-5 ×2) plus **six tier-2 consistency repairs**. T12's acceptance check changes shape with it — from "the six clauses read v4" to one reproducible check per invariant. The approval remains **UNGRANTED**, and `arch-guard.sh --rebaseline` still lands in the same commit |
| 2 — FR-6's `<ol>` reached no design decision and no task | **T13, new** (plan v2 D17). The §6 list element branches on `schemaVersion` inside `renderDescription`, in its own commit, with V15 as its acceptance check. v1 missed this entirely: its FR-6 row was T2/T3/T7/T12, all heading-side |
| 3 — T1 could not end in a commit with `npm run lint` green | **The T1 / T3 fixture split** (plan v2 C-1). T1 keeps the **six `'3.0'` builders** — they typecheck against today's `description-doc.ts:122` and carry the anti-tautology baseline. The **`'4.0'` family moves to T3**, the change that widens the union. T1 and T3 are **not** merged: merging destroys the baseline evidence (C-1, R10) |

**Task ids are stable.** T1–T12 mean exactly what they meant in v1, so every finding carried
forward from the v1 review still names the thing it named. **T13 is the only new id** and it is new
because D17 is new. Execution order is therefore not ascending: T13 runs between T5 and T6. The
*Execution order* block below is the authority on sequence; ids are identity, not order.

Three v1 statements are **deleted rather than carried**, because plan v2 falsified them:

- T1's note that "the `'4.0'` builders carry placeholder `packageContents.heading` values until T2
  lands … the ordering is self-correcting" — the `'4.0'` family now lands at T3, which depends on
  T2, so its headings are real from the first line they exist.
- T5's claim, inherited from v1 D8, that the §2 branch and the CTA heading are the whole of the
  renderer change. They are two of **three** points; T13 is the third.
- T12's "the six clauses, and nothing else".

Everything the review verified as sound is kept by name: the twelve-task shape (now thirteen),
T1-first for the `'3.0'` baseline, T12-last for the FROZEN task, `test/fixtures/v4-docs.ts` as the
fixture location, the three track-forced task pairs, the optional hook-pattern parameter in its own
commit, and the technique of discharging a plan decision that produces no task as an explicit
**negative acceptance check**.

## Track assignment rule used throughout

`docs/workflow/stage-map.yaml` `skills_by_track` defines the tracks by path:

| Track | Paths |
|---|---|
| `angular` | `src/app`, `src/services`, `src/render`, `src/domain`, `src/utils` |
| `server` | `server/**` |
| `prompt` | `src/prompts`, `src/prompt-core` |

No task in this Story touches `server/**`. `test/**` belongs to no track, so a task whose only
files are fixtures takes **the track of the surface it serves** — `ProductDescriptionDoc` objects
for `src/domain` and `src/render`, hence `angular` (T1). Every other task's track is read straight
off its files, and **no task spans two tracks**. This is why three of the plan's single-line
entries become task pairs: D11's selector (`src/prompt-core`, prompt) and its orchestrator wiring
(`src/services`, angular); D10's `NUMBER_FORMAT_RULES` edit (`src/prompt-core`, prompt) and its
`number-format-fixer.ts` counterpart (`src/utils`, angular); D6's CTA resolver
(`src/prompt-core`, prompt) and the renderer that consumes it (`src/render`, angular).

---

## Execution order

```
T1  '3.0' fixtures ───────┐
T2  heading table ────────┼──→ T3  schema + '4.0' fixtures ──┐
                          └──→ T4  CTA resolver ─────────────┴──→ T5  renderer §2/§9
                                                                    └──→ T13 §6 <ol>
T6  hook-pattern ──→ T7  task-a-doc ──→ T8  orchestrator
                       └──────────────→ T12 master-system-prompt  [§9 GATE]
T2 ──(same file)──→ T9  NUMBER_FORMAT_RULES ──→ T10 number-format-fixer
T11 task-faq  (independent of everything)
```

Suggested linear order:
**T1 → T2 → T3 → T4 → T5 → T13 → T6 → T7 → T8 → T9 → T10 → T11 → T12.**

Task sections below are written in that execution order, not in id order.

**Parallelisable groups**, stated because it is information the builder can use:

| Group | Tasks | Constraint |
|---|---|---|
| A | T1, T2, T6, T11 | Four independent starts. T1 and T2 are both prerequisites of T3, so starting them together shortens the critical path |
| B | T3, T4, T7, T9 | T3 needs T1+T2; T4 needs T2; T7 needs T6; T9 needs T2 **for file sequencing only** |
| C | T5, T8, T10, T12 | T5 needs T3+T4; T8 needs T6+T7; T10 needs T9; T12 needs T7 **and the ungranted §9 approval** |
| D | T13 | Needs T3 logically and T5 by file sequencing. Not parallel with T5 — same file, same function |

**Two edges are sequencing, not logic, and both are recorded so nobody assumes independence and
produces a conflict:**

- **T2 → T9.** Both edit `src/prompt-core/constants.ts` in unrelated regions (the new heading table
  beside `DELIVERY_REGION_PHRASES` at `:97`; `NUMBER_FORMAT_RULES` at `:489-501`). Either order is
  correct.
- **T5 → T13.** Both edit `src/render/render-description.ts`, and both edit statements inside
  `renderDescription` (`:307`). T13 has no logical dependency on T5's §2 work — its real dependency
  is T3 — but they cannot run in parallel on one working tree.

### Why T1 is first (risk-first rationale)

The plan's central bet is **D1**: that widening `schemaVersion` to an enum and putting every v4
rule behind a version-guarded `superRefine` closes leaks L1–L4 **without moving any bound a cached
`'3.0'` document parses through** (NFR-8, OD-2). The instrument that falsifies that bet is the V1
leak suite — and the impact analysis measured that **the reconciliation corpus cannot supply it**:
neither committed fixture carries a single-`<h3>` functionality group, a non-`bullets` §2 Block, a
video, `packageContents`, `compatibility` or an array `SpecRow.value` (impact analysis §5).

So the fixtures must exist before the change they police, and — this is the decisive part — the
`'3.0'` fixtures must be shown to parse **against the unmodified schema**. Authored in the same
commit as the refinement, they prove nothing: a fixture written beside a new rule is a fixture
shaped by that rule, and the baseline becomes a tautology. Authored first, with
`src/domain/description-doc.schema.ts` untouched, they are evidence that these are legitimate
pre-existing cached shapes. That is the whole value of V1, and it is only available at T1.

**v2 adds a second thing T1 is the only place to get**, and plan v2's V15 says so in those words:
the `'3.0'` `<ul>` assertion for §6 is *strongest committed against the unmodified renderer*. It is
the assertion that proves D17 changed no cached behaviour, and it proves nothing if it first runs
after the branch exists. So V15 splits across T1 and T13 rather than binding as one unit to T13.

T2 is second because it is the **contract** three later tasks consume: the §6 heading membership
check in T3's refinement, the §2 and §9 strings T4 and T5 render, and the real
`packageContents.heading` values T3's `'4.0'` builders carry. Contract before consumer (C-3).

### How C-1 is satisfied, in both directions (R10)

C-1 forbids a `'4.0'`-typed artifact before the union widens, **and** forbids merging the `'3.0'`
baseline into the widening change to satisfy it. Satisfying one by violating the other is the wrong
turn the plan names.

| Direction | Where it is enforced |
|---|---|
| No `'4.0'`-typed value before D2 | **T1's acceptance check 3** — `npm run lint` green at T1's commit, and `test/fixtures/v4-docs.ts` contains **no** `'4.0'` literal at all. Observable by grep, not by inference |
| The `'3.0'` baseline is not absorbed into the widening | **T3's acceptance check 5** — the commit's diff of `test/fixtures/v4-docs.ts` is **additive**: the six `'3.0'` builder bodies committed at T1 are byte-unchanged. R10's silent direction — a merged baseline still goes green and loses only evidence — is the one no command catches, so it is made a diff-shaped check |

### Where the §9 stop sits, and why it is last rather than first

`src/prompt-core/master-system-prompt.ts` is the **one** FROZEN file this Story edits (T12), and
its per-file approval is **UNGRANTED**. It is ordered last for one reason, which is plan v2's C-4:
it is the only task whose precondition is a human decision, and blocking twelve tasks on it would
convert a gate into a stall. **The request itself must be put to the human at the start of
IMPLEMENTATION**, not when T12 comes up — together with T12's precondition step 1 (the `task-c.ts`
inspection, R6), so the approval surface is stated once and completely rather than widened halfway
through. v2 is the first version in which that goal is actually achievable: the v1 surface leaked
from inside `master-system-prompt.ts` independently of whatever the `task-c.ts` inspection returns.

The cost of this ordering is stated, not hidden: between T7 landing and T12 landing, cached
`systemBlocks[0]` says §2 is a table with no heading and cached `systemBlocks[1]` says it is one
`<h2>` and one `<ul>`. That is **R4** as plan v2 restates it — NI-2 closes by construction the half
v1 manufactured (block 0 permitting a `<p>` and a `<figure>` in §2 after the edit), and the residual
is the original bounded window, plus the return of the contradiction only if R1 resolves toward the
rejected `task-a-doc.ts` override. If approval is withheld, the builder **stops**; it does not reach
for the rejected override.

---

## T1 — Hand-author the `'3.0'` document fixture baseline

| | |
|---|---|
| **Track** | `angular` — the fixtures are `ProductDescriptionDoc` objects for `src/domain` and `src/render`; `test/**` carries no track of its own |
| **Depends on** | none |
| **FROZEN (AGENTS.md §9)** | no — no file in this task is in the §9 list or in `.arch-guard-checksums` |

### What changes

The repository gains the cached-document shapes it has never had. Nothing in `src/**` changes, and
no behaviour changes: this task builds the instrument that every later task is measured with, and
it captures the two baselines that are only capturable **before** the code moves — the `'3.0'`
parse baseline (V1) and the `'3.0'` §6 `<ul>` render baseline (V15, first half).

The committed corpus is two items of one product, both `'3.0'`, both uk-UA, and the impact analysis
measured six shapes absent from it — exactly the shapes this Story's new rules turn on. This module
supplies them as named, hand-authored builders so that four spec files in three directories assert
against **one** set of documents rather than four divergent copies.

**This task authors `'3.0'` builders only.** The `'4.0'` family belongs to T3 (C-1).

### Files

| File | Change |
|---|---|
| `test/fixtures/v4-docs.ts` | **create** — exported builder functions returning `ProductDescriptionDoc` values with `schemaVersion: '3.0'`. Each builder's doc-comment names the requirement and the leak it exists for. The module is named for the Story, not for one version: T3 adds the `'4.0'` family to this same file |

**The `'3.0'` family — the OD-2 cache shapes, each of which must keep parsing forever:**

| Builder | Shape | Leak / requirement |
|---|---|---|
| single-`<h3>` functionality group | one `functionality[i].subsections` of length 1 | L1 / FR-27 |
| non-`bullets` §2 | `keyBenefits` carrying a `paragraph`, a `figure` and a `video` Block | L3 / FR-4 |
| array spec value | at least one `specs.categories[].rows[].value` as `string[]` | L2 / FR-10 |
| over-ceiling §2 | `killerSpecs` 4 + a `bullets` Block of 8 → 12 combined items | L4 / FR-17 |
| §5 + §6 present | `compatibility` and `packageContents` both populated — **this is also V15's `'3.0'` subject**, and neither corpus item carries `packageContents` at all (D17, verified by grep of both `.doc.json` files) | FR-6, V15 |
| video present | a `video` Block in `functionality` | FR-24 |

All six typecheck against `src/domain/description-doc.ts:122` as it stands today
(`schemaVersion: '3.0';`, a literal type) and parse against `description-doc.schema.ts` unmodified —
`subsections` optional and unbounded (`:142-152`), `keyBenefits: z.array(RelaxedBlockSchema).min(1)`
(`:162`), the `SpecRow.value` union (`:187`), and no combined ceiling anywhere.

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/domain/description-doc.schema.spec.ts` — the V1 `'3.0'`-compatibility block | `test:logic` | NFR-8, OD-2; the regression baseline for L1, L2, L3, L4 |
| `src/render/render-description.spec.ts` — **V15's `'3.0'` half only** | `test:logic` | FR-6 / D17 baseline: a `'3.0'` document carrying `packageContents` renders `<h2>` + `<ul>` |

The V2, V3, V8, V11, V14 blocks and **V15's `'4.0'` half** also import this module and **stay red**
until their own tasks land. That is the intended TDD state, not a defect in this task.

### Acceptance check

1. `npx vitest run src/domain/description-doc.schema.spec.ts` passes the V1 `'3.0'` block **with
   `git diff --stat src/domain/` empty** — every legacy shape parses against the schema exactly as
   it stands today.
2. `npx vitest run src/render/render-description.spec.ts` passes V15's `'3.0'` half **with
   `git diff --stat src/render/` empty** — the §6 `<ul>` is recorded as pre-existing behaviour
   against the unmodified renderer, which is the only state in which that assertion is evidence.
3. **`npm run lint` is green at this commit**, and `test/fixtures/v4-docs.ts` declares **no `'4.0'`
   document** — `git grep -n "schemaVersion: '4\.0'" -- test/fixtures/v4-docs.ts` returns nothing.
   (Grep the quoted literal, not the bare string `4.0`: builder doc-comments legitimately mention
   v4.0 in prose, and a check that fails on a comment is not runnable.) This is the observable form
   of C-1 and it is what closes review finding 3: `tsconfig.json` includes `test/**/*` and
   `npm run lint` is `tsc --noEmit`, so a `'4.0'`-typed value here would be a red type-check, not a
   red test. See the cross-stage note below for what this check does **not** cover.
4. The module exports one builder for each of the six `'3.0'` shapes in the table above. A shape
   with no builder is a missing fixture, not a footnote.

### Notes

**Why `test/fixtures/` and not `src/domain/__fixtures__/`.** `vitest.config.ts` coverage `include`
is `src/utils/**`, `src/prompt-core/**`, `src/render/**`, `src/domain/**` with `src/domain/**` held
at 95/95/90/95. A fixture module under `src/domain/` enters that measurement, and an exported
builder that a later task stops calling would drop the directory below its floor for a reason
unrelated to the code under test. `test/**` is outside the coverage include, is already the home of
`test/fixtures/corpus/`, and is inside `tsconfig.json`'s `include`, so `npm run lint` typechecks it.
There is no lint import-boundary rule in this repository (lint is `tsc --noEmit`; there is no eslint
config), and `test/` → `src/` imports are already known-good
(`test/render-conformance.spec.ts` imports `STORE_REGISTRY`). The plan review recorded no change
requested on this choice.

**This is a task-level location choice, not an architecture decision.** The plan requires
hand-authored fixtures for both sides of V1, V2 and V15 but names no file. If `so-test-writer`
prefers another location, moving the module changes no task's meaning.

**Do not add a `'4.0'` item to `test/fixtures/corpus/`.** That harness reconciles the renderer
against artifacts **production has already shipped**, and production has shipped no v4 artifact
(D1, D8, `test/render-reconciliation.report.md` §5). A hand-authored corpus triple would make
`render-reconciliation.spec.ts` assert the plan's assumption back to itself. This is **R5**, and
keeping the v4 fixtures out of the corpus directory is what bounds it. `test/tools/scaffold-doc.mjs`
stays a `'3.0'` instrument for the same reason — it writes `schemaVersion: '3.0'` at `:317` and
`scaffold-doc.spec.ts:241` asserts exactly that. Do not touch it.

**Do not pull the `'4.0'` family forward to "finish the module".** C-1 and R10: it cannot typecheck
until T3 widens the union, and this task must end green.

**The cross-stage import boundary, stated because C-1 does not reach it.** C-1 governs what a
*task* may commit. It says nothing about the stage before: `TEST_WRITING` runs as a whole stage
ahead of IMPLEMENTATION, so by the time T1 starts, `src/domain/description-doc.schema.spec.ts`
already carries its V2 block and `src/render/render-description.spec.ts` its V15 `'4.0'` half —
both referencing builders that do not exist until T3 — and `test/fixtures/v4-docs.ts` itself does
not exist until this task. Because `npm run lint` is `tsc --noEmit` over `test/**/*`, an unresolved
import or a missing export is a **red type-check, not a red test**, and the same standard that
produced review finding 3 applies to it. T1's check 3 is therefore scoped to *this task's own
file*; whether `npm run lint` is green across the whole tree at T1's commit depends on the form
`TEST_WRITING` gives its `'4.0'`-consuming blocks, which is `so-test-writer`'s to decide and not
this breakdown's to prescribe. It is carried to `so-plan-reviewer` as finding 7 rather than
assumed away.

---

## T2 — Add the v4 code-resident heading table to `constants.ts`

| | |
|---|---|
| **Track** | `prompt` |
| **Depends on** | none |
| **FROZEN (AGENTS.md §9)** | no — `src/prompt-core/constants.ts` is **not** in the §9 list (the Specification's Scope row says so explicitly) |

### What changes

The three headings v4 fixes in code stop being strings nobody owns. One new per-locale constant,
beside `DELIVERY_REGION_PHRASES` (`constants.ts:97`), holds the §2 Killer-Specs-and-Benefits
heading, both §6 variants (single product / set) and the §9 CTA template, keyed over the ten
`STORE_REGISTRY` locales. `MANDATED_NOMINAL_H2` gains the uk-ua and ru-ua §2 entries, which makes
the new §2 heading a known allowed nominal for Center 3D Print instead of a warning.

### Files

| File | Change |
|---|---|
| `src/prompt-core/constants.ts` | **modify** — (a) new exported per-locale constant with four entries per locale: §2 heading, §6 single, §6 set, §9 CTA template; keys **derived from `STORE_REGISTRY`**, not hand-listed (NFR-6). (b) `MANDATED_NOMINAL_H2` (`:1399`) gains the uk-ua and ru-ua §2 heading strings |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/constants.spec.ts` — V7 | `test:logic` | FR-6, FR-11, NFR-6 (D4) |

### Acceptance check

Every locale in `STORE_REGISTRY` — all ten, `en-US` and `es-MX` included — has all four entries,
and the test derives its key set **from the registry** so that adding a store locale without a table
entry fails. `Object.keys(STORE_REGISTRY)).toHaveLength(7)` at
`test/render-conformance.spec.ts:147` stays green.

And, checked here rather than three tasks later: **the §2 heading string for every locale contains
no product-name slot and no interpolation placeholder** — contrast the §9 CTA template, which has
exactly two (product short name, store name). A §2 heading that names the product spends one of the
two product-named `<h2>`s `checkProductNameStuffing` (`heading-style.ts:117-205`) budgets, and
`:181-187` needs the last `?`-bearing `<h2>` to remain the §9 closing.

### Notes

**The `MANDATED_NOMINAL_H2` addition changes Center 3D Print prompt text, and that is intended.**
That array is interpolated into `C3D_UK_LOCALE_TOV` (`constants.ts:1452`) and iterated by
`constants.spec.ts:209`. D4 consequence 2 states this is the correct treatment for a §2 heading
under that store's ToV, for the same reason the existing six entries are there. Both call sites must
stay green.

One constant, not three: D4 says the three families share a key set, a rationale and a test.
Splitting them would be batching in reverse.

The §6 entries are the **heading** only. The §6 list element is not a string and is not here — it is
T13 (D17).

---

## T3 — Widen `schemaVersion`, add the version-guarded refinement, and land the `'4.0'` fixtures

| | |
|---|---|
| **Track** | `angular` |
| **Depends on** | T1 (the baseline it must not disturb, and the module it extends), T2 (the §6 heading table its membership check reads and its `'4.0'` builders draw from) |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

The domain model admits two versions. `schemaVersion` becomes `z.enum(['3.0','4.0'])` and a second
document-level `superRefine` carries **every** v4-only rule behind one early return
(`if (doc.schemaVersion !== '4.0') return;`). No existing bound moves, so every cached `'3.0'`
document parses exactly as before; every v4 rule is additive and simply does not run for `'3.0'`.

**The `'4.0'` fixture family lands in this same commit**, because this is the first commit in which
a `'4.0'`-typed value typechecks (C-1) and because these fixtures are what this task's own
acceptance check is measured against. Fixtures sit with the change that moves them.

### Files

| File | Change |
|---|---|
| `src/domain/description-doc.schema.ts` | **modify** — `schemaVersion` literal → enum; one new version-guarded `superRefine` carrying: FR-4 §2 composition (`keyBenefits[i].kind === 'bullets'`, issue at `['keyBenefits', i, 'kind']`); FR-10 string-only `SpecRow.value` (issue at `['specs','categories',c,'rows',r,'value']`); FR-17 combined ceiling `killerSpecs.length + Σ keyBenefits[i].items.length ≤ 8` (issue at `['keyBenefits']`, carrying `measured: { actual, limit: 8, unit: 'items' }`); FR-27 subsections bound (issue at `['functionality', i, 'subsections']` when `subsections` is present with `length < 2`); FR-6 §6 heading membership against T2's table for `doc.locale` (issue at `['packageContents','heading']`) |
| `src/domain/description-doc.ts` | **modify** — `schemaVersion: '3.0' \| '4.0'`. **Nothing else** |
| `test/fixtures/v4-docs.ts` | **modify — additive only** — the `'4.0'` builder family (below). The six `'3.0'` builder bodies from T1 are **not** re-authored |

**The `'4.0'` family:**

| Builder | Shape |
|---|---|
| valid uk-UA v4 document | `bullets`-only §2, ≤ 8 combined items, string-only spec values, functionality groups with 0 or ≥ 2 subsections, and **`packageContents` populated with a `heading` drawn from T2's table** — the `packageContents` is not optional decoration: it is V15's `'4.0'` subject at T13 and there is no other fixture carrying one |
| per-locale variant | the same document parameterised by locale, for Center 3D Print `uk-UA` / `ru-UA` (V8) and for the conformance locale sweep (V14) |
| four negatives | each of T1's first four `'3.0'` leak shapes, re-emitted as `'4.0'`, for V2 |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/domain/description-doc.schema.spec.ts` — V1, V2, V12 | `test:logic` | FR-4, FR-6, FR-8, FR-9, FR-10, FR-15, FR-17, FR-18, FR-27, FR-29, NFR-8 |

### Acceptance check

Five things, all observable:

1. **Both committed corpus documents still parse.** `ProductDescriptionDocSchema.safeParse` returns
   `success: true` for `test/fixtures/corpus/center-3d-print-ortur-h20-20w.doc.json` and
   `expert3d-ortur-h20-20w.doc.json`, unmodified on disk. This is the L4 detector (an unconditional
   document-level refine would fire on them); T5 carries the separate L6 one.
2. **Every T1 `'3.0'` fixture still parses**, and every `'4.0'` negative fails **at its exact dotted
   path** — `functionality.1.subsections`, `keyBenefits.0.kind`,
   `specs.categories.0.rows.0.value`, `keyBenefits` — as `doc-schema-issues.ts:118-120` joins them.
3. **The FR-17 issue carries its operands**: `measured: { actual, limit: 8, unit: 'items' }`, so the
   tier-1 repair instruction can state the exact surplus.
4. **The negative check, read off the diff** (D9): `forEachBlockInOrder`
   (`description-doc.ts:175-189`) is byte-unchanged, and `ProductDescriptionDoc` gains **no new
   collection** — the only line changed in `description-doc.ts` is the `schemaVersion` union. A new
   collection the walk never visits resolves a figure to position 0 and ships it without
   `loading="lazy"`; this diff is what proves none was introduced.
5. **The C-1 pair, both halves** (R10): `npm run lint` is green — the `'4.0'` builders typecheck
   **because** the union widened in this same commit — **and** `git diff` on
   `test/fixtures/v4-docs.ts` is purely additive, with the six `'3.0'` builder bodies from T1
   byte-unchanged. A baseline rewritten here to fit the new schema is exactly the evidence loss C-1
   forbids, and it is silent to every command, so it is checked by reading the diff.

V12 is part of the same check: an 86-word hook parses and renders (FR-18 — no word-count rejection
is added anywhere).

### Notes

**Why the `'4.0'` fixtures are here and not a task of their own.** They cannot exist earlier (C-1),
they are consumed by this task's own V2 assertions — so a later task would leave T3's acceptance
check unverifiable — and the skill's ordering rule puts fixtures with the change that moves them. A
separate fixture-only commit after T3 would also be the "cleanup task" that rule exists to prevent.

**`makeSubsectionSchema` (`:142-149`) is not touched.** It builds one shape shared by
`functionality` (`:163`) and, via `RelaxedSubsectionSchema` (`:152`), by `compatibility` (`:176`).
`.min(2)` on the factory would reject cached `'3.0'` documents with a single `<h3>` — the shape OD-2
exists to preserve — and would govern §5, which FR-27 does not. The human's settled Decision 1 is
implemented as the refine at `functionality.<i>.subsections`, and the check is not weakened by
moving it: it still rejects, it still names a field, and it still has a tier-0 repair target.

**New import direction:** `src/domain/description-doc.schema.ts` → `src/prompt-core/constants.ts`,
for the §6 membership check. That is new for this file. **No cycle**: `constants.ts` imports only
`../app/types` and `../utils/specs-grounding`, and nothing from `src/domain`. Recorded because the
file's own TSCONFIG NOTE (`:258-275`) documents that inference here is fragile, and a reviewer will
ask.

`subsections: []` stays legal — the new rule fires only on `length === 1`. The `.strict()` depth cap
and the existing shared `forEachBlockInOrder` figure-ref `superRefine` (`:212`, `:220`) stay exactly
where they are; the new refine is added beside them, not merged into them.

`description-doc.ts` and `description-doc.schema.ts` move in **one** commit: the compile-time guard
at `description-doc.schema.ts:255` runs interface → inferred and breaks the build if they diverge.

---

## T4 — Add the CTA heading template resolver to `store-render-rules.ts`

| | |
|---|---|
| **Track** | `prompt` |
| **Depends on** | T2 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

`StoreRenderRules` gains a CTA-heading resolver in the shape of the existing `killerSpecsHeaders`,
so the §9 heading is answered in the one module that exists to answer "what does rendering for store
X mean". Center 3D Print's ToV override — the soft «варто» form that `constants.ts:1456-1458` says
*replaces* the master template — is honoured there rather than at the renderer's call site.

### Files

| File | Change |
|---|---|
| `src/prompt-core/store-render-rules.ts` | **modify** — `StoreRenderRules` gains a CTA-heading member resolving T2's per-locale template for the store, interpolating product short name and store name; `getRenderRules` delegates to `constants.ts` and stores no copy |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/store-render-rules.spec.ts` | `test:logic` | FR-11, NFR-6 (D6) |

### Acceptance check

For every `STORE_REGISTRY` store × locale pair the resolver returns the interpolated heading;
Center 3D Print in uk-UA returns the «варто» override form and every other store returns the master
template. The existing `killerSpecsHeaders` delegation assertions for every registry entry stay
green.

### Notes

**A derived view, never a copy** — the module header (`:12-17`) makes this the file's standing rule:
delegate to `constants.ts`, do not restate the strings here, or the two rot apart.

**Do not delete `killerSpecsHeaders`.** It is unreachable on the `'4.0'` render path but still
serves the `'3.0'` path and `table-finalize.ts` (D8). Unused on one of two paths is not dead.

---

## T5 — Branch `renderDescription` on `schemaVersion` and render the v4 §2 and §9

| | |
|---|---|
| **Track** | `angular` |
| **Depends on** | T3 (the version it branches on, the composition guarantee it relies on, and the `'4.0'` fixtures it renders), T4 (the CTA template) |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

§2 stops being a table for `'4.0'` documents. `renderDescription` (`render-description.ts:307`)
renders, for `'4.0'`, one `<h2>` (T2's table entry for `doc.locale`) and one `<ul>` merging
`killerSpecs` then `keyBenefits` bullets items; `'3.0'` calls `renderKillerSpecs` verbatim,
unchanged. The §9 CTA heading branches the same way — assembled from T4's template for `'4.0'`,
`doc.cta.heading` for `'3.0'`.

**This task is two of D8's three version-conditional points.** The third — the §6 list element — is
**T13**, in its own commit. v1's "nothing else in `renderDescription` changes" is deleted; the
complete enumeration is §2 composition (here), the §9 CTA heading (here), the §6 list element
(T13).

### Files

| File | Change |
|---|---|
| `src/render/render-description.ts` | **modify** — the `schemaVersion` branch for §2 (new `renderKeyBenefitsV4`) and for the §9 CTA heading (from `getRenderRules(...)`). `renderKillerSpecs`, `renderFigure`, `renderVideo`, `renderSpecs`, `figurePositions` and everything else unchanged |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/render/render-description.spec.ts` — V3 | `test:logic` | FR-3, FR-4, FR-11, FR-25 |
| `test/render-reconciliation.spec.ts` — V4, **unchanged file** | `test:logic` | NFR-8, leak L6 |
| `test/render-conformance.spec.ts` — V14 | `test:logic` | FR-20, D14 |
| `src/utils/heading-style.spec.ts` — V8 | `test:logic` | D4 consequence 1, impact analysis §4.2 |

### Acceptance check

1. A `'4.0'` document renders §2 as **exactly one `<h2>`** — the T2 string for `doc.locale` — and
   **exactly one `<ul>`**, with **zero `<table>`** between them; items in order `killerSpecs` first,
   then `keyBenefits` bullets items flattened into that same list; the killer-spec item form is
   `<b>{label}: {value}</b> — {why}` with a **literal U+2014**, not `&mdash;` (`esc()` replaces only
   `& < > "`, so a test asserting the entity is asserting the wrong thing).
2. The `'3.0'` arm of the branch calls `renderKillerSpecs` **unchanged** — verifiable from the diff:
   `renderKillerSpecs`'s body is untouched and the branch is the only new call site.
3. `test/render-reconciliation.spec.ts` is green on **both** corpus items, byte-for-byte, with the
   fixtures unmodified on disk. This is the byte-identity reference for item 2 — the two committed
   artifacts *are* the accepted `'3.0'` §2 shape — and it is the cheapest L6 detector, which is the
   reason the branch exists at all.
4. `test/render-conformance.spec.ts` passes for a `'4.0'` `conformanceDoc(locale)`, and
   `Expert-3DPrinter` stays in the `UNRENDERABLE` bucket (`:136-137`) — the observable form of D14's
   exclusion.
5. A rendered `'4.0'` document for Center 3D Print in `uk-UA` and `ru-UA` raises **no**
   `h2-nominal-heading` issue, and `heading-product-name-stuffing` still sees at most two
   product-named `<h2>`s.
6. The negative check (D13): `git diff --stat src/utils/output-validator.ts` is **empty**. Its
   `checkLeadInCapitalization` killer-specs branch losing its subject is a recorded finding, not a
   reason to edit a FROZEN file.

### Notes

`test/render-conformance.spec.ts:54` builds a `'3.0'` document today, so making V14 run against a
`'4.0'` `conformanceDoc(locale)` is a **spec-file edit owned by TEST_WRITING**. It is deliberately
not in this task's Files list; check 4 consumes the result rather than producing it. (Carried from
the plan review's consequential notes.)

The lead is `esc(label) + ': ' + esc(value)` **inside** the `<b>`, the em dash with spaces
**outside** it, then `prose(why)`. The renderer supplies that separator because it composes the
lead; the "whitespace is authored content" rule (`:180-188`) governs fields the model wrote. The
form is clear of `bold-label-glue` (`output-validator.ts:333-341`) on both of that rule's
conditions — and that clearance depends on BOLD-LABEL SEPARATION surviving T12's tier-2 relabel, so
those two tasks are coupled by an argument even though they share no file.

`checkLeadInCapitalization`'s killer-specs branch (`output-validator.ts:281-297`) matches a `<table>`
containing "Чому це важливо" and therefore **stops firing** on the `'4.0'` path — it loses its
subject rather than failing. The same content lands as `<li>` items, which `bullet-colon-case` and
`bold-label-glue` cover. Recorded finding (D8), **not** a defect.

`doc.cta.heading` is deliberately discarded on the `'4.0'` path and left unvalidated against the
template (D6). Do not add a membership check for it: Task C translates the *rendered* HTML, so the
model's string reaches nothing downstream.

**Do not fold T13 into this commit** to "finish the branch". Its reasons are in T13's Notes.

---

## T13 — Render the §6 package-contents list as an `<ol>` for `'4.0'`  *(new in v2 — D17)*

| | |
|---|---|
| **Track** | `angular` |
| **Depends on** | T3 (the widened union and the `'4.0'` fixture carrying `packageContents`); **T5 by file sequencing only** — same file, same function, no logical dependency |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

§6 becomes an ordered list for `'4.0'` documents and stays a `<ul>` for `'3.0'` ones. Today
`render-description.ts:336-339` emits `<h2>` + `<ul>` unconditionally — re-verified this run. FR-6
and AC-5 both require, in the same words, that the package-contents section "is an `<ol>`" under
the localized heading. This is the third and last of D8's version-conditional points.

The `<h2>` and the `<li>` items are unchanged on both paths; only the list container branches.

### Files

| File | Change |
|---|---|
| `src/render/render-description.ts` | **modify** — inside the existing `if (doc.packageContents)` block (`:336-339`), the list container becomes `doc.schemaVersion === '4.0' ? '<ol>…</ol>' : '<ul>…</ul>'`. The heading line and the `items` map (`esc(i)` per entry) are untouched |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/render/render-description.spec.ts` — **V15's `'4.0'` half** | `test:logic` | FR-6, AC-5, FR-15 / OD-2 (D17) |
| `src/render/render-description.spec.ts` — **V15's `'3.0'` half, green since T1 and unmodified** | `test:logic` | the evidence that D17 changed no cached behaviour |
| `src/utils/structural-parity.spec.ts` — V11's negative half | `test:logic` | **R9 asserted, not closed** — a translation swapping `<ol>` for `<ul>` does *not* fail parity. **Green on arrival, not turned green here:** `structural-parity.ts` is unchanged by this Story, so the assertion holds from the moment `TEST_WRITING` writes it. T13's role is supplying the `'4.0'` fixture pair it is stated against and keeping it green |

### Acceptance check

1. A `'4.0'` document carrying `packageContents` renders **`<h2>` + `<ol>…</ol>`**; the `'3.0'`
   document carrying `packageContents` (T1's builder) renders **`<h2>` + `<ul>…</ul>`**; the heading
   string and every `<li>` item are **byte-identical on both paths**.
2. V15's `'3.0'` half — committed at T1 against the unmodified renderer — is **still green and still
   unmodified**. Weakening or re-authoring it to fit the branch would erase the only evidence that
   cached `'3.0'` output is unchanged, which is an AGENTS.md §7.7 move, not a fix.
3. The diff is the list container and nothing else: `<section>` and `<hr>` counts are unchanged
   (§6 is not a `<section>`), `figurePositions` and `forEachBlockInOrder` are untouched (D9 — a tag
   change is not a new collection), and no schema surface moves.
4. **The negative, stated because it is the trap here:** `test/render-reconciliation.spec.ts` being
   green is **not** evidence for this task. Neither corpus item carries `packageContents` — verified
   by grepping both `.doc.json` files (D17) — so reconciliation is byte-for-byte green under *either*
   choice of element. V15 is the only detector this change has, in both directions.

### Notes

**Why this is its own commit rather than part of T5.** Four reasons, stated so the "should have been
one commit" objection is answered rather than left open: it discharges a different requirement
(FR-6 / AC-5, not FR-3 / FR-4 / FR-11); it has its own validation category (V15) because the
instrument that covers T5 is blind to it; the detector split means its `'3.0'` half had to be
committed nine tasks earlier, so binding the category to one commit is impossible anyway; and it is
independently revertable, which for the one change in this Story with no corpus coverage is worth a
commit boundary. This is the task the v1 breakdown did not have at all (review finding 2).

**Version-scoped, not unconditional — this is decided in D17 and must not be "simplified".** FR-15
says a `'3.0'` document "keeps the previous handling rules **wherever they differ**", and `<ul>` is
such a rule: it is the element every already-shipped `'3.0'` artifact carries. An unconditional
`<ol>` would make a re-render of a cached document differ from what shipped, for a change no
requirement makes retroactive, in the one place the corpus cannot detect it. The saving would be one
ternary.

**R9, accepted and asserted rather than closed.** `structural-parity.ts`'s `COUNTED_TAGS`
(`:33-43`) counts `<li>` but neither `<ol>` nor `<ul>`, so a translated locale that reverts §6 to a
`<ul>` reproduces every counted tag and passes, while FR-20 asks for v4 structure in every locale.
**Do not add `<ol>` / `<ul>` to `COUNTED_TAGS`** — it would retroactively fail every cached `'3.0'`
translation pair that legitimately carries a `<ul>`, for a locale set with no `schemaVersion` to
scope against (D7's version-blindness argument applied to parity). V11's negative half records the
gap; closing it is a future Story in the sibling-module shape D10 names.

The §6 **heading** is not this task — it is code-resident (T2) and enforced as a membership check
(T3). This task changes a tag.

---

## T6 — Create the hook-pattern selector module

| | |
|---|---|
| **Track** | `prompt` |
| **Depends on** | none — independent of T1–T5, T13 and of T9–T11 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

A new pure module answers "which v4 §1 structural pattern does this product's hook use", with no
state, no clock and no counter. It is a function, so its distribution property is directly
assertable over generated input pairs instead of through the orchestrator.

### Files

| File | Change |
|---|---|
| `src/prompt-core/hook-pattern.ts` | **create** — `HOOK_PATTERNS` (the v4 §1 structural patterns, **at least 4**) and `selectHookPattern(name: string, website: string): HookPattern`, a deterministic index over the **whole** `name` + `website` pair |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/hook-pattern.spec.ts` — V5, **new file** | `test:logic` | FR-14, NFR-5 |

### Acceptance check

`HOOK_PATTERNS.length >= 4`; the same `name` + `website` yields the same pattern on every call
(NFR-5); and the **distribution** properties FR-14 requires, each asserted separately: every pattern
is reachable over a set of distinct pairs, the selection is not constant, not a function of
`website` alone, and not a function of any single character of `name`. The module contains no
`Math.random`, no `Date`, and no module-level mutable state.

### Notes

Determinism alone does not deliver the rotation — a constant selector satisfies NFR-5 in full while
making AC-9 unachievable for any batch. That is why FR-14 states the distribution property and why
V5 asserts it against the system rather than a curated fixture.

Model-side rotation is rejected: generation is stateless per product (OD-3), so the model has no
memory of the previous product.

---

## T7 — Carry the v4 contract into `TASK_A_DOC_INSTRUCTION` and thread the hook pattern into `userContent`

| | |
|---|---|
| **Track** | `prompt` |
| **Depends on** | T6 (the `HookPattern` type it accepts) |
| **FROZEN (AGENTS.md §9)** | **no — and that is a verified scope correction.** `src/prompts/task-a.ts` needs **no edit**: its "§2 has NO H2 heading" line lives in `TASK_A_INSTRUCTION` = `systemBlocks[1]` (`task-a.ts:168`), which `buildPromptADoc` replaces wholesale (`task-a-doc.ts:125-127`), so it never reaches the Doc path. Supersedes impact analysis §1.1 row 3 and Hazard 4 bullet 1; independently confirmed by the plan review |

### What changes

The Doc path's task block states the v4 contract. Everything v4 asks of the model on this path is
expressed here, in a non-frozen file, and the per-product hook pattern rides in `userContent` — the
one block `payload.ts:7` documents as "dynamic, never cached".

### Files

| File | Change |
|---|---|
| `src/prompts/task-a-doc.ts` | **modify** — `TASK_A_DOC_INSTRUCTION` → the v4 contract (below); `buildPromptADoc` gains an **optional** third parameter for the selected pattern and appends its instruction to `base.userContent`; the stale `:18` header ("NOT WIRED INTO PRODUCTION") corrected |

The contract clauses, from D12: `"schemaVersion": "4.0"` (`:48`); §2 as one heading + one merged
list, `bullets` Blocks only, combined ≤ 8 with 6 as the v4 target, no table / paragraph / figure /
video (replacing the §2b note at `:53`); §7 `value` **a string**, multiple values comma-joined by the
model (replacing `:99-103`); §3 mandatory, H2 per functional group, **H3 only when a group has 2+
distinct sub-functions**, no volume limit, v4's H2 order as a recommendation; the FR-28
anti-duplication and ≥2-sentence clauses as instructions; §6 heading exactly one of the two table
strings for the document's locale; §9 CTA as the localized commercial H2 plus one paragraph; the four
word volumes 40–85 / 90–300 / 80–250 / 50–100 as **instructions only**; the §3 destination for a
displaced video embed and the lead-in `<p>` obligation travelling with a relocated figure.

**§6's list element is deliberately not a prompt clause** (D12): `packageContents.items` is a plain
string array and `task-a-doc.ts:93-95` puts it among the PLAIN-TEXT fields that admit no tags at
all. `<ol>` is unreachable from the prompt; it is T13.

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/task-a-doc.spec.ts` — V6, V10 | `test:logic` | FR-1..FR-6, FR-9, FR-13 prompt side, FR-15, FR-17 point 3, FR-19, FR-24, FR-27, FR-28, FR-29, NFR-1 |
| `src/prompts/task-a.spec.ts` — V10, **unchanged file** | `test:logic` | the evidence that `task-a.ts` was not edited |

### Acceptance check

1. `buildPromptADoc(input, baseLanguageOverride, pattern)` puts the pattern instruction in
   **`userContent`** and nowhere else; `systemBlocks[0]` and any ToV overlay are byte-identical to
   what `buildPromptA` returned; index 1 is `TASK_A_DOC_INSTRUCTION` with `cache: true` unchanged.
   No block is merged, split or uncached (NFR-1, AGENTS.md §3).
2. The instruction text states, assertably: `"4.0"`, bullets-only §2, the ≤ 8 combined ceiling,
   string-only §7 value, and the §3 "H3 only when 2+ sub-functions" rule.
3. `git diff --stat src/prompts/task-a.ts` is **empty**, `src/prompts/task-a.spec.ts` is unmodified
   and green, and `bash arch-guard.sh` reports no frozen-file change for this commit.
4. **C-2, observable:** the third parameter is **optional** — `task-a-doc.spec.ts:38` stays green
   without modification, and `npm run lint` is green with both existing two-argument call sites
   (`content-orchestrator.service.ts:860`, `:1305`) untouched in this commit.

### Notes

**The third parameter must be optional in this commit** (C-2). T8 is a separate task on a different
track; a required parameter here breaks the build before T8 lands, and this task would not end
green. T7 threads it; T8 supplies the real value.

The existing "at least 3 items or use a paragraph Block" escape hatch (`:110-112`) **stays as
written** — FR-29 forbids changing the functionality bullets floor, and that clause is its
prompt-layer mitigation.

`buildVideoBlock` in frozen `task-a.ts:117` already instructs "place it in §3 FUNCTIONALITY, before
§7", which **agrees** with FR-4 and D9. Restate the §3 destination here so the Doc path does not
depend on reading it out of the HTML-path video block — do not edit `task-a.ts` to do it.

From this commit until T12 lands, cached block 1 states v4's §2 while cached block 0 still states
v3's. That is R4's window, accepted under C-4 and closed by T12.

---

## T8 — Select the hook pattern in the orchestrator and pass it to the prompt builder

| | |
|---|---|
| **Track** | `angular` |
| **Depends on** | T6 (the selector), T7 (the parameter to pass it to) |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

The service layer — the only layer that sees `input.name` and `input.website` before the payload is
built — selects the pattern and hands it to `buildPromptADoc`. FR-14's "by the service layer, before
the prompt payload is built" becomes true rather than merely possible.

### Files

| File | Change |
|---|---|
| `src/services/content-orchestrator.service.ts` | **modify** — call `selectHookPattern(input.name, input.website)` before building the payload at both `buildPromptADoc` call sites (`:860`, `:1305`) and pass the result through |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/services/content-orchestrator.ua-doc-pipeline.spec.ts` | `test:logic` | FR-14, NFR-1, NFR-5 |

### Acceptance check

For a given product input, the payload `buildPromptADoc` returns carries the pattern that
`selectHookPattern(input.name, input.website)` returns for that same pair — and it is in
`userContent`, not in either cached `systemBlock`. Two different products drawing different patterns
produce two different `userContent` strings with **identical** `systemBlocks`, which is the
observable form of the caching guarantee.

### Notes

Both call sites, not one. `:860` and `:1305` are the two `buildPromptADoc` entries and both pass
`'Ukrainian (uk-UA)'`; a pattern selected at one and not the other makes rotation depend on which
code path a run took.

A `HookPattern` **value** crosses into the service; the instruction **string** stays inside
`task-a-doc.ts` (AGENTS.md §3 rule 3 — no prompt text in services).

The selector is pure (T6). Do not memoise it here, do not seed it from a run counter, and do not let
the model choose — each defeats FR-14 in a different direction.

---

## T9 — Correct `NUMBER_FORMAT_RULES` group 3 and add `pt-PT`

| | |
|---|---|
| **Track** | `prompt` |
| **Depends on** | T2 — **same-file sequencing only**, no logical dependency |
| **FROZEN (AGENTS.md §9)** | no — `constants.ts` is not FROZEN; `master-system-prompt.ts:83` only *interpolates* this constant, so FR-16 forces no §9 edit |

### What changes

`de-DE` and `es-ES` stop being told "thousands dot (or space)" and are fixed on the non-breaking
space; `pt-PT` gains a rule it has never had. Groups 1 and 2 already match the decision and do not
move.

### Files

| File | Change |
|---|---|
| `src/prompt-core/constants.ts` | **modify** — inside `NUMBER_FORMAT_RULES` (`:489-501`): replace the two group-3 lines (`de-DE`, `es-ES`) and insert one `pt-PT` line. **Three lines. Nothing else in the block** |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/ua-translation-style-guide.spec.ts` — V9 | `test:logic` | FR-16 group-2 tripwire |
| `src/prompt-core/constants.spec.ts` — V9 | `test:logic` | FR-16 groups 1 and 3 |

### Acceptance check

`ua-translation-style-guide.spec.ts:49` is green — the group-2 line is **byte-identical**, still
containing the exact substring `'uk-UA / ru-UA: decimal comma, thousands non-breaking space'`. The
`de-DE` and `es-ES` lines read non-breaking space; a `pt-PT` line exists; the `es-US / es-MX` group-1
line (`:499`) is **unchanged** — FR-16's `es-MX` placement needs no code delta. The commit's diff of
`constants.ts` is three lines inside that block and nothing else.

### Notes

A wholesale rewrite of the block fails a deliberate existing test that exists to keep
`NUMBER_FORMAT_RULES` and the UA translation style guide from contradicting each other inside the
same system prompt. That is the constraint; targeted is not a preference here.

**Accepted residual (R3, D10): this ships with no automated detector.** `NBSP_THOUSANDS_LOCALES`
(`output-validator.ts:44`) is declared and never referenced anywhere in the repository, and the live
`thousands-separator` rule (`:93-102`) only flags English-style comma grouping. **Do not add a
detector in this task** — it is out of scope and it would be a §9 edit.

---

## T10 — Configure `number-format-fixer` for the three FR-16 groups

| | |
|---|---|
| **Track** | `angular` |
| **Depends on** | T9 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

The fixer's locale grouping matches the prompt's. `de-DE`, `es-ES` and `pt-PT` are handled as
comma-decimal / non-breaking-space-thousands, so the fixer does not re-introduce the dot grouping the
prompt now forbids.

### Files

| File | Change |
|---|---|
| `src/utils/number-format-fixer.ts` | **modify** — configured for the three FR-16 groups; `stripThousandsSeparators` / `ensureUnitSpaces` (`:70`) are where the group-3 change lands |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/number-format-fixer.spec.ts` | `test:logic` | FR-16, FR-21 |
| `src/utils/decimal-separator.spec.ts` — **unchanged file** | `test:logic` | the fixer-to-validator round trip |

### Acceptance check

A `de-DE`, `es-ES` or `pt-PT` input of `1.234.567,89` comes out with a non-breaking space between
thousands groups and a comma decimal; group-1 and group-2 locales are byte-unchanged; and **no digit
and no unit is altered, and the space between number and unit survives** (FR-21 — localization
changes punctuation only). `decimal-separator.spec.ts` stays green: it binds the fixer to the frozen
validator by round trip, and `COMMA_DECIMAL_LOCALES` already contains all three group-3 locales, so
the decimal half needs no change.

### Notes

`decimal-separator.ts:52` and `identifier-decimal.ts:33` each hold their own copy of
`COMMA_DECIMAL_LOCALES`, explicitly mirroring the frozen validator. **Do not touch those copies** —
group 3's decimal comma is already correct in all three, and editing a mirror of a frozen file to
"tidy" it is how the three drift apart.

---

## T11 — Carry the v4 §9 numbers into the FAQ prompt

| | |
|---|---|
| **Track** | `prompt` |
| **Depends on** | none — independent of every other task |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

The FAQ prompt states v4's numbers: 3–5 question/answer pairs, 2–4 factual sentences per answer,
150–400 words. Nothing else about the FAQ changes.

### Files

| File | Change |
|---|---|
| `src/prompts/task-faq.ts` | **modify** — the v4 §9 numbers in the instruction text |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/task-faq.spec.ts` | `test:logic` | FR-13 |

### Acceptance check

The FAQ instruction states 3–5 pairs, 2–4 factual sentences per answer and 150–400 words. **The
trigger is unchanged** — a FAQ is still produced only when supplemental content is supplied
(OD-10) — and the call architecture is unchanged: this commit's diff touches instruction text and no
control flow, and no code path makes FAQ markup reachable from the description body (FR-13).

### Notes

v4 §9 is «Рекомендовано», not mandatory. Making the FAQ unconditional is explicitly out of scope
(OD-10) and would be scope creep against an APPROVED Specification.

---

## T12 — [FROZEN, §9 GATE] Make plan v2's five negative invariants true of the master system prompt

| | |
|---|---|
| **Track** | `prompt` |
| **Depends on** | T7 — and on **explicit per-file human approval, which is UNGRANTED** |
| **FROZEN (AGENTS.md §9)** | **YES — `src/prompt-core/master-system-prompt.ts`. This task MUST STOP and obtain explicit per-file approval before editing it** |

### Preconditions, in order, before a single character is edited

1. **Inspect FROZEN `src/prompts/task-c.ts`** (read only — no edit). D13 holds it at "inspect only";
   **R6** is that the inspection finds a §7 `<h3>` preservation count invalidated by the §2 change,
   which would turn it into a **second** §9 request. Do this first so the approval surface is
   complete and the human is asked **once**. Plan v2 is the first version in which that goal is
   achievable, because the request below no longer leaks from inside `master-system-prompt.ts`.
2. **Put the §9 request to the human** — the five invariants, the sweep method that establishes their
   completeness, the six tier-2 repairs, and the blast radius. Then **STOP**.
3. Edit only after explicit per-file approval is given in session (AGENTS.md §9, NFR-7).

**This request should be raised at the start of IMPLEMENTATION**, not when T12 comes up in the order,
so the human has the whole window to decide while T1–T11 and T13 proceed (C-4).

### The request — five negative invariants, not a line list

The request is **what must no longer be true of this file**, one invariant per Specification
requirement that reverses a v3 rule. The clause references are **evidence for each invariant, not
the scope of the edit**: an implementer who finds a further clause violating an invariant is
**inside** the approved surface, not outside it. That sentence is the whole correction to v1, whose
six-clause table was presented to a human as a complete surface and was not one.

**The completeness method, carried from D13 so the reviewer can reproduce it.** Three independent
exhaustive sweeps over the **whole 471-line file**, not over the `[CONTENT STRUCTURE]` excerpt:

1. **Numeral sweep** — every superseded v3 numeral, matched exhaustively rather than sampled:
   `40–75` (3 hits: `:27`, `:216`, `:218`), `90–200` (2: `:28`, `:225`), `150–2,000` (2: `:29`,
   `:250`), `80–150` (2: `:34`, `:351`).
2. **Construct sweep** — every occurrence of each construct v4 deletes or changes: `table` (20 hits,
   each triaged against the section it governs — §7's twelve are untouched), the §6 `<ul>`, and the
   uk-UA CTA template string.
3. **Cross-reference sweep** — every in-band reference to a changed section: `§2` (7), `§3` (11),
   `§6` (3), plus the `[IMAGE HANDLING]` placement block. This is the sweep that reaches `:459-461`,
   `:270-272` and `:309`, none of which contains a superseded numeral.

The in-band section map at `:26-38` is read as a **unit**, because it restates every section's whole
contract and is the structure a line-range method cannot reach. **Reading convention:** a sweep hit
is cited at its clause's full extent, not at the matched line — `:250` and `:250-251` are the same
hit, as are `:225` and `:226-227`, and `:216` and `:218`. Where a sweep hit and an invariant's
evidence differ in line numbers, the invariant's range is the wider one and it governs.

> **Edit `src/prompt-core/master-system-prompt.ts` so that these five statements become true.**
>
> **NI-1 (FR-1).** No clause states a §1 hook word range other than **40–85**.
> *Evidence:* `:27`, `:216`, `:218` (inside the `:216` clause).
>
> **NI-2 (FR-4).** No clause states or implies that §2 contains a `<table>`; that §2 carries no
> heading and no wrapper; that §2's word range is 90–200; that Key Benefits may be rendered as a
> `<p>`; or that a figure may be placed in §2.
> *Evidence:* `:28`, `:225`, `:226-227`, `:228-246` (the §2a three-column table block and its
> per-locale column headers), `:247-248` (a `paragraph` Block is exactly what T3 rejects at
> `['keyBenefits', i, 'kind']`), `:459-461` (routes leftover images into "§2 body text" and weaves
> figures into §2–§5 prose).
>
> **NI-3 (FR-27).** No clause states a §3 word range. *Evidence:* `:29`, `:250-251`.
>
> **NI-4 (FR-11).** No clause states a §9 word range other than **50–100**, and the uk-UA CTA
> template reads «**Чому варто купити** [Product-short] в [Store]?».
> *Evidence:* `:34`, `:351`, `:356`. Word volumes are prompt-only by FR-17.3, so for §9 block 0 is
> the only authority there is and it currently states the wrong number.
>
> **NI-5 (FR-6).** No clause states the §6 heading text, and no clause states that §6's list is a
> `<ul>`. *Evidence:* `:32` (section map, reachable only by the section-map sweep), `:296`. The
> heading is code-resident (T2, T3); the list element is an `<ol>` (T13).

**Tier 2 — six consistency repairs inside the same approval.** They state no reversed rule; they
reference a construct the edit removes or renames, and left alone they leave the cached prompt
internally incoherent. Listed separately so the human sees one approval covering two severities.

| Line(s) | What it references | Required treatment |
|---|---|---|
| `:42` | "compress the narrative sections (§1, §3, §4) toward their lower word bounds" | §3 has no bound after NI-3; keep §1/§4, drop §3 from the list |
| `:103` | "Write every table (Killer Specs and §7 alike) as plain HTML" | §7 only |
| `:153-154` | "Reserve `<ul><li>` for key features … 'What's in the box'; route all parameters into tables" | **New in v2; verified present this run.** Lands twice: v4 routes §2's killer-spec parameters into a `<ul>`, and §6 becomes an `<ol>`. Re-scope "route all parameters into tables" to §7 |
| `:221` | "a value destined for the Killer Specs **table** lives there" | Rename to the §2 list; the rule itself (give every number one home) survives |
| `:270-272` | COLON CAPITALIZATION and BOLD-LABEL SEPARATION, both scoped to "§2b" | **RELABEL to the merged §2 list — DO NOT DELETE.** Both rules still govern `<li><b>…</b>…</li>` items, and T5's `bold-label-glue` clearance argument depends on BOLD-LABEL SEPARATION surviving. Deleting live coverage to tidy a stale label is an AGENTS.md §7.7-class move |
| `:309` | "matching the **§2 table's** convention" (in §7's column-header block) | Restate §7's convention without the §2 back-reference |

**Explicitly NOT in this request**, swept and confirmed to agree with v4 (D13's exclusion list, kept
so a later reader does not re-open a closed clause): `:40` (the 25,000-character document cap),
`:133-136` (AT MOST TWO product-named `<h2>` — still true, because D4's §2 heading is nominal and
product-free), `:139` (8-word `<h2>` cap), `:262` (§4), `:279` (§5), `:295` (§6 conditional),
`:341-343` (multi-value comma-joined), `:380-382` (video in §3).

**Why it cannot be avoided.** `MASTER_SYSTEM_PROMPT` is `systemBlocks[0]` on the Doc path, and
`TASK_A_DOC_INSTRUCTION` says *"Every [CONTENT STRUCTURE] rule about WHAT each section contains still
applies"* (`task-a-doc.ts:41`). That sentence imports **all** of block 0's content rules into the Doc
path, which is also why the invariant list must be complete rather than enumerated.

**Blast radius, stated with the request.** `MASTER_SYSTEM_PROMPT` is imported by FROZEN
`task-c.ts:87` (the translation path — all nine locales) and by `src/prompts/optimizer.ts:6`. Both
are **intended** to inherit the corrected text; NI-4's template correction and NI-5's `<ol>` are the
two the nine locales inherit most directly. Neither consumer gains new work in this Story.

### Files

| File | Change |
|---|---|
| `src/prompt-core/master-system-prompt.ts` | **modify — FROZEN** — the smallest edit that makes NI-1..NI-5 true, plus the six tier-2 repairs |
| `.arch-guard-checksums` | **modify** — `bash arch-guard.sh --rebaseline`, committed **in the same commit** as the edit (NFR-7, AGENTS.md §9) |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/master-system-prompt.spec.ts` — **must stay green unmodified** | `test:logic` | the §5 item-count floor (`:103`), §7 FLAT SOURCE (`:22`), the `[VIDEO]` anchor (`:62`) |
| `src/prompt-core/constants.spec.ts` — **must stay green unmodified** | `test:logic` | `:103-104`, `:143` flatten the whole prompt and assert against it |
| `src/prompts/optimizer.spec.ts` — **must stay green unmodified** | `test:logic` | `optimizer.ts:6` reuses `MASTER_SYSTEM_PROMPT`'s §1–§9 `[CONTENT STRUCTURE]`. Checked: it asserts only against the optimizer's own task instruction and pins nothing about §2, §3 or §6, so it should pass untouched. Named so that if it does break, the cause is not hunted for somewhere unrelated |

Plus whatever `TEST_WRITING` adds for the invariants themselves.

### Acceptance check

Invariant-shaped, one check per invariant, each reproducible by re-running the sweep that found it.
"The six clauses read v4" is **not** the check any more — that was the defect.

1. **NI-1:** the file contains **zero** occurrences of `40–75`, and every §1 hook range reads 40–85.
2. **NI-2:** **zero** occurrences of `90–200`; no clause states §2 carries a `<table>`, has "heading
   level none, wrapper none", admits a `<p>` per benefit, or places a figure in §2 (`:459-461`
   included). The §2a three-column table block is gone.
3. **NI-3:** **zero** occurrences of `150–2,000`, and no §3 word range anywhere.
4. **NI-4:** **zero** occurrences of `80–150`; the §9 range reads 50–100; the uk-UA CTA template
   reads «Чому варто купити [Product-short] в [Store]?».
5. **NI-5:** no §6 heading text is stated, and no clause states §6's list is a `<ul>` — including the
   section map at `:32`.
6. **Tier 2, and the one that is a *positive* check:** all six rows are treated, and
   **COLON CAPITALIZATION and BOLD-LABEL SEPARATION are still present in the file** after the edit,
   scoped to the merged §2 list. Grep for both rule names must return hits. A relabel that removes
   them is a §7.7 violation, and T5's `bold-label-glue` clearance argument depends on the second one.
7. `master-system-prompt.spec.ts`, `constants.spec.ts` and `optimizer.spec.ts` are green **without
   being modified**.
8. `bash arch-guard.sh` reports clean, and `.arch-guard-checksums` is in the **same commit** as the
   `master-system-prompt.ts` change — one commit, not two.

### Notes

**If approval is withheld, STOP.** Do not override `[CONTENT STRUCTURE]` from `task-a-doc.ts`
instead: D13 rejects that by name, and v2's sweep makes the cost concrete — the exception list would
need at least sixteen entries. `[FORMAT]`'s existing override is a *serialization* switch a model
cannot half-apply; "§2 is a table with no heading" versus "§2 is one `<h2>` and one `<ul>`" is a
*structural* contradiction it can. Rejecting the §9 request does not revive the rejected
alternative.

**R4 as plan v2 restates it.** The half v1 manufactured — block 0 still permitting a `<p>` and a
`<figure>` in §2 after the edit — is closed **by construction**, because NI-2 is violated by any such
clause rather than by six named ones. What remains is the bounded T7→T12 window, and the return of
the contradiction only if R1 resolves toward the rejected override.

The edit is targeted, like T9's. `task-c.ts:87` and `optimizer.ts:6` both consume this constant, so
a clause removed carelessly changes three paths at once.

---

## Coverage

### Plan decision → task

| Decision | Task(s) |
|---|---|
| D1 — widened enum + version-guarded `superRefine` | T3 |
| D2 — the interface moves with the schema, stays the wider shape | T3 |
| D3 — Decision 1 as a `functionality.<i>.subsections` refine, factory untouched | T3 |
| D4 — U1: the §2 `<h2>` is code-resident | T2 (the table), T5 (the renderer reads it) |
| D5 — FR-6 §6 **heading** as a membership check | T2 (the table), T3 (the check), T7 (the prompt rule) |
| D6 — FR-11 CTA assembled by the renderer from a per-locale template | T2 (the template), T4 (the resolver), T5 (the assembly) |
| D7 — U3: FR-4 composition and the FR-17 ceiling live in the schema, not the validator | T3; the "validator not edited" half is a negative acceptance check on T5 |
| D8 — one `schemaVersion` branch in the renderer, **three points** | T5 (§2 composition, §9 CTA heading), **T13 (§6 list element)** |
| D9 — no new collection, therefore no `forEachBlockInOrder` edit | **no task of its own** — a negative acceptance check on **T3** (check 4) and again on **T13** (check 3) |
| D10 — targeted `NUMBER_FORMAT_RULES` edit, no new detector | T9, T10 |
| D11 — FR-14 pure selector in `prompt-core`, wired in the service, riding in `userContent` | T6, T7, T8 |
| D12 — the v4 prompt contract lives in `task-a-doc.ts` | T7 |
| D13 — FROZEN position, NI-1..NI-5 + six tier-2 repairs | T12 (`master-system-prompt.ts`); the "no edit required" findings for `task-a.ts` and `output-validator.ts` are negative acceptance checks on **T7** (check 3) and **T5** (check 6) |
| D14 — U2: `Expert-3DPrinter` excluded until it can render | **no task** — an exclusion; observable as T5's `UNRENDERABLE`-bucket check. `doc-pipeline-flag.ts`, `DOC_PIPELINE_STORES` and `imageBaseUrl` are **not** modified by any task |
| D15 — FAQ prompt gains the v4 numbers and nothing else | T11 |
| D16 — FR-30: no new mechanism, no downgrade path | **no task** — a negative decision. `assertDocRendered` (`doc-schema-issues.ts:144-174`) already throws; V13 is a characterization test that no path emits `'3.0'` as a fallback |
| **D17 — FR-6's §6 list element is an `<ol>`, version-scoped** | **T13** |

### Plan constraint → where it is enforced

| Constraint | Task(s) and the observable form |
|---|---|
| **C-1** — no `'4.0'`-typed artifact before the union widens, and no merge of the `'3.0'` baseline into the widening | **T1** (acceptance check 3: lint green, no `'4.0'` literal in the fixture module) and **T3** (acceptance check 5: lint green *because* the union widened, and the `'3.0'` builder bodies byte-unchanged in an additive diff) |
| **C-2** — the hook-pattern parameter is optional in the change that introduces it | **T7** (acceptance check 4: `task-a-doc.spec.ts:38` green unmodified, lint green with both two-argument call sites untouched) |
| **C-3** — contract before consumer | The order itself: T2 → T3/T4; T2/T4 → T5; T3 → T5 and T3 → T13; T6 → T7 → T8 |
| **C-4** — the §9 stop gates one change only | **T12** alone carries the stop; no other task lists it as a precondition, and the R4 window is stated as the accepted cost in T7's and T12's Notes |

### Validation category → task

| Category | Task |
|---|---|
| V1 `'3.0'` compatibility (leak suite) | T1 (authored and green against the unmodified schema), T3 (still green after the widening) |
| V2 `'4.0'` enforcement | T3 |
| V3 renderer version branch — §2 | T5 |
| V4 corpus reconciliation stays green | T5 |
| V5 hook pattern index | T6 |
| V6 NFR-1 caching separation | T7 |
| V7 heading tables | T2 |
| V8 heading-style interaction | T5 |
| V9 FR-16 targeted edit | T9 |
| V10 prompt contract | T7 |
| V11 structural parity, incl. the R9 negative half | T13 (the negative half rides with the `<ol>`; `structural-parity.ts` is not edited) |
| V12 FR-18 / FR-19 negative check | T3 |
| V13 FR-30 exhaustion | **no task** — characterization only (D16) |
| V14 conformance across stores | T5 |
| **V15 §6 list element, both versions** | **split by design: T1 (the `'3.0'` `<ul>` half, against the unmodified renderer) and T13 (the `'4.0'` `<ol>` half)** |

### Risk → where it is carried

| Risk | Carried in |
|---|---|
| R1 §9 approval not granted | T12's preconditions; the stop is explicit and the Story does not stall on it (C-4) |
| R2 no tier-0 target for the §2 ceiling | T3 (the `measured` operands are an acceptance check) |
| R3 group-3 separators ship with no detector | T9's Notes — accepted, not closed |
| R4 two contradictory §2 rule sets in one cached prompt | T7's Notes (window opens), T12's Notes (window closes; NI-2 closes the manufactured half by construction) |
| R5 a hand-authored `'4.0'` fixture encodes the plan's assumption | T1's Notes (no `'4.0'` item in `test/fixtures/corpus/`) and T3 (the fixtures live outside the corpus) |
| R6 `task-c.ts` inspection may widen the request | T12 precondition 1 |
| R7 §2 `<h2>` shifts three parity counts at once | T5 — a loud failure, which is the desired behaviour |
| R8 NFR-3 has no automated check | no task — review-time; `so-implementation-verifier` reads the diff |
| **R9 the §6 `<ol>` is invisible to structural parity** | **T13's Notes and V11's negative half — asserted, not closed; `COUNTED_TAGS` must not be widened** |
| **R10 a decomposition re-merges the fixture families** | **T1 check 3 and T3 check 5 — the two halves of C-1, one of which no command catches** |

### Plan file → task

| File | Task |
|---|---|
| `src/prompt-core/hook-pattern.ts` (create) | T6 |
| `src/domain/description-doc.schema.ts` | T3 |
| `src/domain/description-doc.ts` | T3 |
| `src/prompts/task-a-doc.ts` | T7 |
| `src/prompt-core/constants.ts` | T2 (heading table, `MANDATED_NOMINAL_H2`), T9 (`NUMBER_FORMAT_RULES`) |
| `src/prompts/task-faq.ts` | T11 |
| `src/prompt-core/master-system-prompt.ts` | T12 |
| `src/render/render-description.ts` | T5 (§2, §9 CTA), **T13 (§6 list element)** |
| `src/prompt-core/store-render-rules.ts` | T4 |
| `src/services/content-orchestrator.service.ts` | T8 |
| `src/utils/number-format-fixer.ts` | T10 |
| `.arch-guard-checksums` | T12 |
| `test/fixtures/v4-docs.ts` (create, then extend) | **T1 (`'3.0'` family) and T3 (`'4.0'` family)** — discharges the plan's *Validation strategy* requirement for hand-authored fixtures on both sides of V1, V2 and V15; the plan names the need but no file |
| **Explicitly NOT modified** — `task-a.ts`, `output-validator.ts`, `task-b.ts`, `task-c.ts` (inspect only, T12 precondition 1), `forEachBlockInOrder`, `doc-pipeline-flag.ts`, `structural-parity.ts`, `repair-strategy.ts`, `doc-schema-issues.ts`, `test/tools/scaffold-doc.mjs`, the whole consumables pipeline | no task; `task-a.ts` and `output-validator.ts` are negative acceptance checks (T7 check 3, T5 check 6) |

### Requirement → task

| FR / NFR | Task(s) |
|---|---|
| FR-1 hook form and range | T7, T12 (NI-1) |
| FR-2 hook technical values | T7 (prompt-only by the Specification's own text) |
| FR-3 `killerSpecs` 3–4, `<b>lead</b> — benefit` | T5 (item form), T7; the 3–4 bound is already pinned and unmoved (T3's diff) |
| FR-4 §2 = one `<h2>` + one `<ul>` ≤ 8, no table | T2, T3, T5, T7, T12 (NI-2) |
| FR-5 applications 4–8 | T7 — bound unchanged at `description-doc.schema.ts:174` |
| FR-6 §5/§6 conditional; §6 heading code-resident; **§6 is an `<ol>`** | T2, T3, T7, T12 (NI-5) — **and T13 for the `<ol>`**. This row is the one v1 got wrong (review finding 2) |
| FR-7 one `<h3>` + table per category | **no task** — `renderSpecs` and `spec-category-shape.ts` unchanged; standing coverage |
| FR-8 no list or `<br>` in a value cell | T3 — string-only makes a nested list unrepresentable for `'4.0'` |
| FR-9 multi-value comma-joined in one row | T3, T7 |
| FR-10 string-only scoped to `'4.0'` | T3 |
| FR-11 CTA under the localized commercial H2 | T2, T4, T5, T7, T12 (NI-4 — the 50–100 range and the «варто» template) |
| FR-12 no `<h1>` | **no task** — the renderer emits none; `duplicate-h1` unchanged |
| FR-13 FAQ separate, 3–5 pairs | T11 |
| FR-14 deterministic, distributing pattern index | T6, T7, T8 |
| FR-15 every new generation emits `'4.0'`; `'3.0'` keeps its own rules | T3 (the enum), T7 (the prompt), **T13** (the "wherever they differ" clause is what version-scopes the `<ol>`) — scope per D14 |
| FR-16 three separator groups, `es-MX` in group 1 | T9, T10 |
| FR-17 item counts, cross-collection §2 ceiling, prompt-only volumes | T3, T7 |
| FR-18 no rejection on word count | T3 — a **negative** requirement; V12 is its check |
| FR-19 volumes measured on rendered uk-UA only | T7 — nothing is added to the translate path |
| FR-20 v4 structure preserved in every locale | **no task** — `structural-parity.ts` unchanged; V11 is a characterization test, **and R9 is the one property it cannot see (T13)** |
| FR-21 unit spacing, value fidelity | T10; `unit-spacing` unchanged |
| FR-22 spec-count parity under comma-joining | **no task** — `spec-count-parity.ts` unchanged |
| FR-23 figure structure and lazy-loading | T5 (rendered order), T3 (the no-new-collection check), T7 (the lead-in obligation), T12 (NI-2 stops block 0 routing figures into §2) |
| FR-24 video survival and iframe markup | T7 (§3 as the only unconditional destination), T5 (`renderVideo` unchanged) |
| FR-25 markup discipline | T5, T13 (no `<section>` / `<hr>` count change) |
| FR-26 standing criteria; `meta-description-currency` stays disarmed | **no task** — `output-validator.ts` is not edited (T5 check 6) |
| FR-27 §3 mandatory, H2/H3 rule, no volume limit | T3, T7, T12 (NI-3, tier-2 `:42`) |
| FR-28 distinct aspects, no restatement | T7 — declared unenforced prose by the Specification |
| FR-29 no change to the functionality bullets floor | T3 (factory untouched), T7 (escape-hatch clause stays) |
| FR-30 exhaustion fails loudly, never downgrades | **no task** — D16 |
| NFR-1 prompt-caching separation | T7, T8 |
| NFR-2 provider independence | **no task** — nothing here depends on the active provider |
| NFR-3 retrieval separation | **no task** — review-time only (R8) |
| NFR-4 secrets | **no task** — no API-key path is touched |
| NFR-5 determinism | T6 |
| NFR-6 `STORE_REGISTRY` the only source | T2, T4 |
| NFR-7 FROZEN discipline | T12 |
| NFR-8 cache preservation | T1, T3, T5, **T13** |

### Acceptance criterion → task

| AC | Task(s) |
|---|---|
| AC-1 | T7, T12 |
| AC-2 | T5, T7 |
| AC-3 | T2, T3, T5, T7, T12 |
| AC-4 | T7 (bound unchanged) |
| **AC-5** | T2, T3, T7, T12 (heading + conditional emission) **and T13 (the `<ol>`)** — v1 reached this criterion only in part, which was review finding 2 |
| AC-6 | T3, T7 (§7 shape itself unchanged) |
| AC-7 | T2, T4, T5, T7 |
| AC-8 | T11; no-`<h1>` standing |
| AC-9 | T6, T8 — FR-14's distribution property; the consecutive-pair window is a `TEST_WRITING` fixture-curation matter |
| AC-10 | T5 (first-image-eager in rendered order), T9, T10 (separators) |
| AC-11 | T3, T7 |

### Task → plan item (the reverse direction)

| Task | Discharges |
|---|---|
| T1 | the plan's hand-authored-fixture requirement, `'3.0'` half; V1's baseline and V15's `'3.0'` baseline; C-1's first half; NFR-8 evidence |
| T2 | D4, D5 (table), D6 (template); NFR-6; V7 |
| T3 | D1, D2, D3, D5 (check), D7, D9 (negative); C-1's second half; V1, V2, V12; FR-4, FR-6, FR-8..FR-10, FR-15, FR-17, FR-18, FR-27, FR-29 |
| T4 | D6; FR-11, NFR-6 |
| T5 | D8 (points 1 and 2), D13 (`output-validator.ts` not edited), D14 (observable); V3, V4, V8, V14; FR-3, FR-4, FR-11, FR-23, FR-25 |
| **T13** | **D17; V15's `'4.0'` half and V11's R9 negative; FR-6, AC-5, FR-15, NFR-8** |
| T6 | D11 (selector); V5; FR-14, NFR-5 |
| T7 | D12, D11 (`userContent`), D13 (`task-a.ts` not edited), C-2; V6, V10; FR-1..FR-6, FR-9, FR-15, FR-17.3, FR-19, FR-24, FR-27..FR-29, NFR-1 |
| T8 | D11 (wiring); FR-14, NFR-1 |
| T9 | D10 (prompt side); V9; FR-16 |
| T10 | D10 (fixer side); FR-16, FR-21 |
| T11 | D15; FR-13 |
| T12 | D13 (NI-1..NI-5 + six tier-2 repairs), C-4; FR-1, FR-4, FR-6, FR-11, FR-23, FR-27, NFR-7 |

No task maps to nothing, and no task discharges a plan item the implementation plan does not contain.

---

## Tasks that are not here, argued rather than omitted

| Candidate | Why there is no task |
|---|---|
| A separate `'4.0'`-fixture task between T3 and T5 | The `'4.0'` builders cannot exist before T3 (C-1) and are consumed by T3's own V2 acceptance check, so a later task would leave T3 unverifiable. Fixtures sit with the change that moves them |
| Edit `src/prompts/task-a.ts` (the Story's Scope row and impact analysis §1.1 expect it) | Its "§2 has NO H2 heading" line is in `TASK_A_INSTRUCTION` = `systemBlocks[1]`, which `buildPromptADoc` replaces wholesale. Verified in both files and confirmed by the plan review. A negative acceptance check on T7 |
| Edit `src/utils/output-validator.ts` (OD-8 named it) | Zero occurrences of `schemaVersion`, `SpecRow` or `ProductDescriptionDoc`, and — re-verified for D17 — zero `<ol>` / `<ul>` rule subjects. Neither OD-8 delta is expressible there. A negative acceptance check on T5 |
| Add `<ol>` / `<ul>` to `structural-parity.ts`'s `COUNTED_TAGS` to close R9 | Retroactively fails every cached `'3.0'` translation pair that legitimately carries a `<ul>`, for a locale set with no `schemaVersion` to scope against. Rejected in plan v2; R9 is accepted and asserted by V11's negative half |
| A standalone `task-c.ts` inspection task | It produces no file and no commit, so it cannot be a task under AGENTS.md §13. It is **precondition step 1 of T12** |
| A group-3 thousands-separator detector | Would require editing FROZEN `output-validator.ts` for a rule no FR requires, and would fire on `'3.0'` and translated output alike. Accepted residual **R3** |
| Enrolling `Expert-3DPrinter` in `DOC_PIPELINE_STORES` | Its `imageBaseUrl` is `''`, no FR names `doc-pipeline-flag.ts`, and a CDN path is not this Story's to supply (D14) |
| Updating `test/tools/scaffold-doc.mjs` to emit `'4.0'` | Plan v2 dispositions it: it stays a `'3.0'` instrument. No FR names it, and no `'4.0'` item joins `test/fixtures/corpus/` in this Story |
| A `'3.0'` → `'4.0'` fallback or migration path | FR-30 and D16 forbid it. The obligation is negative; V13 asserts none exists |
| Anything in the consumables pipeline, or §7 conditional-omission behaviour | Explicitly out of scope (OD-6 and the Specification's Out-of-scope section) |

---

## Findings carried to `so-plan-reviewer`

1. **Review findings 2 and 3 are closed here, and each is checkable by reading one row.** Finding 2 →
   **T13** with V15 as its detector and an explicit statement that reconciliation is *not* evidence.
   Finding 3 → the **T1 / T3 split**, with C-1's two halves made observable as T1 check 3 (grep, no
   `'4.0'` literal, lint green) and T3 check 5 (additive diff, `'3.0'` bodies byte-unchanged).
   Finding 1 is plan v2's D13, transcribed into **T12** as invariants plus the sweep method, with the
   acceptance check re-shaped from clause-counting to invariant-checking.
2. **Task ids are stable from v1; T13 is the only new id**, so every carried-forward finding still
   names the task it named. Execution order is not ascending by design.
3. **The AGENTS.md §9 FROZEN surface is one file, not four**, and the approval is still **UNGRANTED**.
   `task-c.ts` remains a read-only inspection that may widen it (R6).
4. **`test/fixtures/v4-docs.ts` is a task-level location choice** spanning two commits (T1, T3). The
   coverage-floor argument for keeping it out of `src/domain/**` is in T1's Notes; the review
   requested no change to it.
5. **R3, R6 and the new R9 are accepted residuals**, carried in T9, T12 and T13 respectively rather
   than closed. R9 is asserted by V11's negative half — the test records the gap instead of hiding
   it.
6. **One coupling crosses tasks without sharing a file:** T5's `bold-label-glue` clearance argument
   depends on BOLD-LABEL SEPARATION surviving T12's tier-2 relabel of `:270-272`. T12's acceptance
   check 6 is a *positive* grep for exactly that reason.
7. **C-1's shape has a cross-stage edge this breakdown cannot close, and it is finding 3's class one
   level up.** `TEST_WRITING` commits its specs before any task runs, and `npm run lint` is
   `tsc --noEmit` over `test/**/*`, so spec blocks importing the `'4.0'` builders (V2, V15's `'4.0'`
   half, V14's `'4.0'` conformance doc) reference exports that do not exist until **T3**. A missing
   export is a red type-check, not a red test. Whether the tree is lint-green at TEST_WRITING's own
   commit and at T1's is a property of the **form** those blocks are written in — `so-test-writer`'s
   decision, not a task-ordering one, which is why no task here claims it. Stated so the gate is
   applied to the right stage rather than discovered at T1. T1's Notes carry the same paragraph.

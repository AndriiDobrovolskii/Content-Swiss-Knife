---
artifact: test_strategy
story: US-2.1
version: 4
status: DRAFT
owner: so-test-writer
created_at: 2026-09-21T12:00:00Z
updated_at: 2026-09-23T12:00:00Z
supersedes: docs/tests/US-2.1-test-strategy.md#3
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 2
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
  - key: plan_review
    version: 2
  - key: pipeline_status
    version: 4
  - key: reconciliation_report
    version: 2
open_decisions_blocking: false
---

# Test Strategy — US-2.1: Migrate product descriptions to the v4.0 UA content schema

## 0b. v4 — RECONCILIATION loop-back: three reject branches, one file

`RECONCILIATION` returned `CHANGES_REQUIRED` with loop-back key `changes_required_tests`
(resolves to `TEST_WRITING`). Three rules were already implemented but no test would notice their
removal: the `HOOK_INVARIANT_START` guard (AC-1 / FR-1, N11 `<b>`-only strictness human-confirmed),
`killerSpecs` `.min(3).max(4)` (AC-2) and `applications.items` `.min(4).max(8)` (AC-4).

Scope of v4: one appended block `V16` in `src/domain/description-doc.schema.v4.spec.ts` (logic
runner; pure Zod, no Angular). Assertions are written from the criteria: reject paths are asserted
exactly (`['hook']`, `['killerSpecs']`, `['applications.items']`), boundaries on both sides. The
hook tests are 4.0-only; a 3.0 document with a non-conforming hook stays accepted (OD-2). Nothing
outside `*.spec.ts` changed; no existing assertion touched. These tests are green on first run by
construction; the anti-vacuity evidence (guard removed -> red) is in the report section 10.

Not tested, deliberately: the 3.0 behaviour of the two count bounds (they are unconditional and
predate this Story; the reconciliation asked for 4.0 only).

## 0a. v3 — the N9 ruling, and the one thing it changed

`IMPLEMENTATION` returned `CHANGES_REQUIRED` a second time, with loop-back key
`changes_required_tests`, on a **single** issue: N9. The human ruling recorded in
`docs/workflow/history.jsonl` at `2026-09-22T15:00:00Z` resolved N9 **in favour of FR-16**. FR-16's
group-2 standard — under which `uk-UA` **preserves** its thousands grouping — is the v4 standard,
and it overrides the locale-blind behaviour two pre-existing spec files encode. Those two files are
updated to expect preservation.

**Scope of v3: three assertions in two files. Nothing else in this suite is re-authored.**

| File | Sites | Was | Is |
|---|---|---|---|
| `src/render/doc-prose-transforms.spec.ts` | 2 (`hook`, `cta.text`) | `expect(...).not.toContain('20 000')` | `expect(...).toContain(\`20${NBSP}000\`)` **and** `.not.toContain('20000')` |
| `src/render/consumables-prose-transforms.spec.ts` | 1 (`cta`) | `expect(out.cta).not.toContain('20 000')` | `expect(out.cta).toContain(\`20${NBSP}000\`)` **and** `.not.toContain('20000')` |

**The character, derived from FR-16 rather than taken from the loop-back prompt.** FR-16's group
table (`docs/specifications/US-2.1-spec.md:373`) gives group 2 — `uk-UA`, `ru-UA`, `pl-PL` —
"thousands: non-breaking space" **in words**. The table's rendered example `1 234 567,89` is typed
with ordinary U+0020 in the Markdown source, as is `NUMBER_FORMAT_RULES`'
(`src/prompt-core/constants.ts:626`) — those are source-typing artifacts and are **not** the
authority. The codepoint is settled from the code that FR-16 governs: `number-format-fixer.ts:158`
defines `const NBSP = '\u00A0'`, and group 3's `regroupDotThousands` (`:73-75`) emits **that**
constant as its output separator. **U+00A0 NO-BREAK SPACE** is therefore the only character this
codebase ever nominates as an output thousands separator, and it is what these tests assert.
U+202F appears only inside `stripThousandsSeparators`' *input* character class
(`[ \u00A0\u202F]`, `:124`) — a tolerated input, never a target. **Not** U+202F, **not** U+0020.

**Why the fixture input changed too, and why that is not scope creep.** The three tests previously
fed a U+0020-grouped number. Under FR-16 a U+0020-grouped `uk-UA` number is **non-conformant
input**, about which FR-16 says nothing; the group-2 branch preserves it only incidentally, because
`processTextNode` (`:112`) is a blanket no-op for that group. Asserting on it would state a
property of the *implementation* rather than of the *requirement*. The inputs are therefore the
FR-16-conformant U+00A0 form, and the assertion is that **that** form survives the chain. This is
the skill's "write the assertion from the criterion, not from the proposed implementation" rule
applied literally.

**The separator is a named code-point constant, never a literal.** `doc-prose-transforms.spec.ts`
gains `const NBSP_U00A0 = String.fromCharCode(0xa0)`; `consumables-prose-transforms.spec.ts` reuses
the `NBSP` constant it already declares at `:95` (verified U+00A0 by hexdump). An invisible
character in a diff is unreviewable, and this loop-back turns on a human ruling about exactly which
character is expected, so it must be readable as such.

**This is not an AGENTS.md §7.7 weakening, and the approver said so explicitly.** The assertions
move to match an approved functional requirement, not to accommodate an implementation. They also
got **stronger**, not weaker: each site replaced one negative (`not.toContain`) with a **positive**
assertion of the required form plus a retained negative that the flattened `20000` does not appear.
Deleting the negative and stopping there was available and was not taken.

**These three tests are RED at the end of this stage, and that is the gate working.** The two
`fixNumberFormatting` call sites that make them green —
`src/render/doc-prose-transforms.ts:156` and `src/render/consumables-prose-transforms.ts:97`, both
still calling `fixNumberFormatting(text)` with no locale — are `IMPLEMENTATION`'s. Verified
directly against the fixer: `fixNumberFormatting(input, '', 'uk-UA')` returns the U+00A0 group
intact, while `fixNumberFormatting(input)` flattens it to `20000`. See the test generation report §9.

## 0. v2 — what the loop-back changed, and what it did not

`IMPLEMENTATION` returned `CHANGES_REQUIRED` with loop-back key `changes_required_tests` against
two **test-side** defects. v1's strategy is unchanged in substance; two files were corrected and
three statements in v1 that the completed implementation made false are restated here.

| Defect | File | Resolution |
|---|---|---|
| The source-scan test could not run at all under the configured environment | `src/prompt-core/hook-pattern.spec.ts` | `URL` is now imported as `NodeURL` from `node:url`. See §8 |
| Two assertions were mutually unsatisfiable against one string — `"schemaVersion": "3.0"` required present *and* absent | `src/prompts/task-a-doc.spec.ts:82` vs `src/prompts/task-a-doc.v4.spec.ts:50` | The v3 pin is superseded; `task-a-doc.spec.ts` now pins `"4.0"`. See §9 |

**No assertion was weakened, deleted or relaxed to fit the implementation.** The source-scan test
asserts exactly the three negatives it asserted in v1, and `task-a-doc.spec.ts` keeps a positive
version pin rather than dropping one. Nothing under `src/` that is not a `*.spec.ts` was touched,
and `vitest.config.ts` was not touched.

## 1. The shape of this suite

Fifteen validation categories (V1..V15), one new fixture module, thirteen new spec files and one
edited spec file. **Every file runs in the logic runner** (`npm run test:logic`, `vitest run`): none
is named `*.component.spec.ts`, nothing in FR-1..FR-30 reaches `src/app/components/`, and the
component runner gains no work — which is what the implementation plan's *Validation strategy*
section already predicted.

The governing constraint on file layout was **runtime module resolution, not taste**. At the time
this suite was authored, three artifacts it asserts against did not exist: `src/prompt-core/hook-pattern.ts`
(T6), a new export in `constants.ts` (T2) and a new member on `StoreRenderRules` (T4). A *named*
import of a missing export is a link-time failure that takes a whole module down and reports one
error about the module rather than one failure per contract. So:

- **New behaviour that needs a not-yet-existing artifact goes in its own new spec file**, never
  appended to an existing green one. `constants.spec.ts`, `heading-style.spec.ts`,
  `render-description.spec.ts`, `description-doc.schema.spec.ts`,
  `master-system-prompt.spec.ts`, `structural-parity.spec.ts`, `number-format-fixer.spec.ts`,
  `render-conformance.spec.ts` and `render-reconciliation.spec.ts` are **not edited**.
- The one exception at v1 was `src/prompts/optimizer.spec.ts`, which is appended to — every import
  it needs already resolves, so the new block cannot take the existing five tests down.
- **v3 adds a third and fourth exception**, both on the N9 ruling and both outside the thirteen
  new files: `src/render/doc-prose-transforms.spec.ts` (two assertions) and
  `src/render/consumables-prose-transforms.spec.ts` (one). These are **pre-existing** tests that
  predate this Story — last touched at `021f467` and `2747ad8` respectively, with
  `git log 0622de6~1..HEAD --` on them empty — encoding the legacy locale-blind behaviour FR-16
  supersedes. §0a carries the reasoning; every other test in both files is byte-identical.
- **v2 adds a second exception**: `src/prompts/task-a-doc.spec.ts`, whose single superseded
  `schemaVersion` assertion is updated in place. v1 listed that file as not edited and recorded
  the update as T7's; `so-builder` correctly declined it because it may not edit tests, so it is
  settled here instead. §9 carries the reasoning.

## 2. What is tested at which level

| # | Category | Level | File | Runner |
|---|---|---|---|---|
| V1 | `'3.0'` compatibility — the leak suite | Zod schema, pure | `src/domain/description-doc.schema.v4.spec.ts` | logic |
| V2 | `'4.0'` enforcement, at the exact dotted path | Zod schema, pure | `src/domain/description-doc.schema.v4.spec.ts` | logic |
| V3 | Renderer version branch — §2 composition | Renderer, pure | `src/render/render-description.v4.spec.ts` | logic |
| V4 | Corpus reconciliation stays green | Corpus harness | `test/render-reconciliation.spec.ts` — **unchanged, not re-authored** | logic |
| V5 | Hook-pattern index — determinism **and** distribution | Pure function | `src/prompt-core/hook-pattern.spec.ts` | logic |
| V6 | NFR-1 caching separation | Prompt builder + service | `src/prompts/task-a-doc.v4.spec.ts`, `src/services/content-orchestrator.hook-pattern.spec.ts` | logic |
| V7 | The code-resident heading tables | Constants + renderer | `src/prompt-core/v4-headings.spec.ts` | logic |
| V8 | Heading-style interaction with the new §2 `<h2>` | Validator over rendered HTML | `src/utils/heading-style.v4.spec.ts` | logic |
| V9 | FR-16 targeted `NUMBER_FORMAT_RULES` edit | Constant text | `src/prompt-core/number-format-rules.v4.spec.ts` | logic |
| V10 | The v4 prompt contract | Prompt text | `src/prompts/task-a-doc.v4.spec.ts` | logic |
| V11 | Structural parity across the nine locales, **incl. the R9 negative** | Pure validator | `src/utils/structural-parity.v4.spec.ts` | logic |
| V12 | FR-18 / FR-19 negative — no word-count rejection | Zod schema + renderer | `src/domain/description-doc.schema.v4.spec.ts`, `src/render/render-description.v4.spec.ts` | logic |
| V13 | FR-30 exhaustion, and the no-downgrade negative | Pure function + source scan | `src/render/doc-schema-issues.v4.spec.ts` | logic |
| V14 | Conformance across stores × locales, `'4.0'` | Renderer + validator matrix | `test/render-conformance.v4.spec.ts` | logic |
| V15 | §6 list element, both versions | Renderer, pure | `src/render/render-description.v4.spec.ts` | logic |
| — | T12's five negative invariants (NI-1..NI-5) + six tier-2 repairs | Prompt text | `src/prompt-core/master-system-prompt.v4.spec.ts` | logic |
| — | T10's fixer half of FR-16 | Pure function | `src/utils/number-format-fixer.v4.spec.ts` | logic |
| — | T11's FAQ numbers | Prompt text | `src/prompts/task-faq.v4.spec.ts` | logic |
| — | The Optimizer, by recorded human decision | Prompt text | `src/prompts/optimizer.spec.ts` (**appended**) | logic |

**Angular services use `Injector.create`, not TestBed.** `content-orchestrator.hook-pattern.spec.ts`
opens with `import '@angular/compiler'` and boots `ContentOrchestratorService` through
`Injector.create` with stub `LlmService` / `RetrievalService` / `HistoryService` providers — the
pattern `content-orchestrator.ua-doc-pipeline.spec.ts` documents and the same DI Angular uses at
runtime, without pulling in TestBed, zone.js or platform-browser-dynamic.

## 3. Fixtures

`test/fixtures/v4-docs.ts` — one module, two families.

**Why here.** `vitest.config.ts` holds `src/domain/**` at 95/95/90/95 coverage; a fixture module
there enters that measurement, and an exported builder a later task stops calling would drop the
directory below its floor for a reason unrelated to the code under test. `test/**` is outside the
coverage `include`, is already the home of `test/fixtures/corpus/`, and is inside `tsconfig.json`'s
`include` so `npm run lint` still typechecks it.

**The `'3.0'` family — six builders, one per shape the corpus does not have.** Single-`<h3>`
functionality group (L1), non-`bullets` §2 (L3), array `SpecRow.value` (L2), over-ceiling §2 (L4),
§5 + §6 populated (FR-6 / V15), video in §3 (FR-24). These typecheck against
`description-doc.ts:122` as it stands and parse against the unmodified schema; that is their whole
evidentiary value, and their bodies must stay byte-stable across T1 and T3 (T3, check 5).

**The `'4.0'` family — split by what consumes it.** `ProductDescriptionDocSchema.safeParse` takes
`unknown`, so every schema negative is returned as `unknown` and needs no `ProductDescriptionDoc`
type. Only `v4ValidDoc()` and `v4ConformanceDoc(locale)` feed `renderDescription`, and they go
through the single documented `asSchemaVersion4()` cast. See §6.

**Reuse before inventing.** `test/fixtures/corpus/` is reused unchanged by
`render-reconciliation.spec.ts` (V4) and by `content-orchestrator.hook-pattern.spec.ts`, which
drives the orchestrator with the real `expert3d-ortur-h20-20w.doc.json`. **No `'4.0'` item is added
to the corpus** (plan R5): that harness reconciles against artifacts production has already
shipped, and production has shipped no v4 artifact, so a hand-authored triple would make the
harness assert the plan's own assumption back to itself.

## 4. Two names and two signatures this stage fixes, because the plan left them open

A test cannot assert against an unnamed export. Where the approved plan settles the *behaviour* but
names no identifier, `TEST_WRITING` fixes one and `so-builder` must use it. All four are flagged in
the spec files themselves as well as here.

| Artifact | Fixed here as | Task |
|---|---|---|
| The per-locale v4 heading table | `V4_SECTION_HEADINGS`, keyed by **lowercase** BCP47 (as `DELIVERY_REGION_PHRASES` and `MANDATED_NOMINAL_H2` already are), entries `{ keyBenefitsH2, packageContentsSingle, packageContentsSet, ctaTemplate }` | T2 |
| The CTA heading resolver on `StoreRenderRules` | `ctaHeading(locale: string, productShortName: string): string` | T4 |
| The FR-17 ceiling issue's operands | a zod custom issue carrying `params.measured = { actual, limit: 8, unit: 'items' }` — zod v3's only channel for structured data on a custom issue, and the shape `repair-gate.ts:177-178` / `repair-strategy.ts:245-252` read once it reaches a `ValidationIssue` | T3 |
| The locale-aware number fixer | `fixNumberFormatting(html, productName, locale)` — the locale **optional**, for the same C-2 reason the hook-pattern parameter is | T10 |

`HOOK_PATTERNS`, `selectHookPattern(name, website)` and `buildPromptADoc`'s optional third
parameter are named by the plan itself (D11, C-2) and are not this stage's invention.

## 5. AC-9's rotation window — the residual routed here

The Specification routes AC-9's "fixture batch and rotation window" to `TEST_WRITING`, and FR-14
states in so many words that the no-two-consecutive property is "satisfiable for a curated fixture
batch" and is "a test-design matter".

**Decision.** AC-9 is asserted in two layers, both in `src/prompt-core/hook-pattern.spec.ts`:

1. **The distribution property, against the system.** Over 24 catalogue names × 7 registry
   websites: every pattern reachable, the selection not constant, not a function of `website`
   alone, not a function of any single character of `name`, and the same product able to draw
   different patterns at different stores. This is what FR-14 added over bare determinism, and it
   closes the constant-selector hole — a selector returning pattern 1 for every product satisfies
   NFR-5 in full while making AC-9 unachievable for any batch.
2. **The rotation window, derived rather than hard-coded.** Over the same 24-name catalogue in
   order: fewer than half the adjacent pairs repeat; a run of **5** consecutive products with no
   two adjacent patterns alike exists; and the catalogue spreads across *every* pattern rather than
   alternating between two.

   **Why derived.** A hard-coded batch pins one particular hash: the first legitimate change to
   `selectHookPattern` would force whoever made it to edit this test, which is precisely the
   pressure AGENTS.md §7.7 exists to keep off a suite.

   **Why five.** The plan floors `HOOK_PATTERNS` at 4, so an evenly distributing index differs on
   ~3/4 of adjacent pairs. A run of 8 occurs at a given start with probability ~(3/4)⁷ ≈ 0.13 and a
   correct selector can miss it across 24 items entirely; a run of 5 needs (3/4)⁴ ≈ 0.32 per start
   over 20 starts and is effectively certain. Requiring 8 would have made this the one test that
   can be red *after* a correct implementation. The repeat-rate assertion beside it is the one a
   constant selector cannot dodge — it repeats on all 23 pairs.

**Word-volume tolerance (the other TEST_WRITING residual).** OD-9 recorded a soft ~±15% tolerance
against rendered text. **No test in this suite measures a word volume as a pass/fail criterion**,
because FR-18 is the system behaviour and it says the opposite: nothing may reject on word count.
The volumes are asserted only as *prompt text* (V10) and as the *absence* of any rejection (V12).
A tolerance band is therefore not needed and is not introduced.

## 6. The `'4.0'` typing boundary, and how this commit stays lint-green on it

`npm run lint` is `tsc --noEmit` and `tsconfig.json` includes `test/**/*`, so a spec importing a
`'4.0'`-typed builder cannot typecheck until T3 widens `schemaVersion` (`description-doc.ts:122` is
the literal `'3.0'` today). The plan reviewer drew the boundary this suite is held to, and it is
satisfied as follows:

| Category | Needs `ProductDescriptionDoc`? | How it is written |
|---|---|---|
| V2's four negatives, V12's parse half | **No** — `safeParse(data: unknown)` | `v4Negatives.*` and `v4LongHookDoc()` return `unknown`; the version is bumped on a plain object spread, with no type claimed |
| V3, V14, V15's `'4.0'` half | **Yes** — `renderDescription(doc: ProductDescriptionDoc, …)` | one documented helper, `asSchemaVersion4()`, carrying a single `as unknown as` cast with a comment naming C-1/D2 and telling T3 to delete it |

That is the whole of the `'4.0'` typing question, and it contributed **zero** type errors. The
eight errors v1 left standing were of a different class entirely — a module and a parameter that
genuinely did not exist yet. **At v2 all eight are gone**: T3 widened the union, T6 created the
module and T7 added the optional parameter, and `npm run lint` exits 0 with no output. The test
generation report §3 records the measurement.

## 7. What is deliberately NOT unit-tested, and why

| Not tested | Why |
|---|---|
| FR-2's "2–4 technical values", FR-3's benefit clause, FR-5's scenario explanation, FR-28's anti-duplication and ≥2-sentence clauses | The Specification declares each a **property of prose** that carries no automated check. They are prompt instructions and review criteria. Asserting them would mean inventing a judgement no validator makes |
| The word volumes as output measurements | FR-18. A length check here would be the exact defect that requirement is written against |
| `master-system-prompt.ts:6` and `optimizer.ts:6` (human decision 3's "Schema v4.0" relabel) | Both are `//` source comments, not reachable through any export. The in-band labels — `master-system-prompt.ts:212` and `optimizer.ts:49` — **are** asserted. Recorded as a known gap, not an omission |
| `task-a-doc.ts:18`'s stale "NOT WIRED INTO PRODUCTION" header (T7) | Same reason: a source comment with no exported surface |
| A group-3 thousands-separator detector | R3. `NBSP_THOUSANDS_LOCALES` is dead code and the live rule only flags English-style comma grouping. Arming one means editing FROZEN `output-validator.ts` for a rule no FR requires |
| NFR-2 (provider independence), NFR-3 (retrieval separation), NFR-4 (secrets) | No behaviour in this Story touches a provider, a retrieval path or an API-key path. NFR-3 has no automated check at all (plan R8) and is `so-implementation-verifier`'s, by reading the diff |
| The consumables pipeline; §7 conditional-omission behaviour | Explicitly out of scope (OD-6 and the Specification's Out-of-scope section) |

## 8. Determinism

No `sleep`, no retry-until-pass, no unseeded randomness, no network. The hook-pattern catalogue and
website list are fixed literals; the conformance matrix is enumerated from `STORE_REGISTRY`; the
orchestrator spec drives a `vi.fn()` stub and never reaches a provider. `assertDocRendered` and
`validateStructuralParity` are pure. Nothing in this suite is time-dependent.

**The one environment dependency, and how it is handled (v2).** `vitest.config.ts:23` runs the
logic suite under **happy-dom**, whose global `URL` resolves every specifier against
`http://localhost:3000/` and ignores a `file://` base. So `fileURLToPath(new URL('./x.ts', import.meta.url))`
throws `ERR_INVALID_URL_SCHEME` — the one construct in this suite that reads a source file off
disk, `hook-pattern.spec.ts`'s NFR-5 purity scan, hit exactly that. **Resolved by importing
`URL as NodeURL` from `node:url`**, the precedent `src/app/components/html-editor/beautify-round-trip.spec.ts:13`
already sets in this repository. The assertion is byte-for-byte the one v1 wrote; only the URL
constructor changed, and the test now actually reads `hook-pattern.ts` before asserting against it.

The two alternatives were rejected: a `// @vitest-environment node` pragma switches the
environment of the **whole file**, including the twelve behavioural tests that have nothing to do
with the file system, and editing `vitest.config.ts` was out of bounds and would have moved the
whole suite off the environment `output-validator`'s `DOMParser` checks depend on. **Any future
test in this repository that reads a file off disk must use `NodeURL`** — the failure mode is a
thrown `ERR_INVALID_URL_SCHEME` that looks nothing like the property under test.

## 9. Existing tests this suite must NOT break, and the five it deliberately leans on

Untouched and green: `description-doc.schema.spec.ts`, `render-description.spec.ts`,
`render-reconciliation.spec.ts`, `render-conformance.spec.ts`, `task-a.spec.ts`,
`master-system-prompt.spec.ts`, `constants.spec.ts`,
`structural-parity.spec.ts`, `number-format-fixer.spec.ts`, `decimal-separator.spec.ts`,
`store-render-rules.spec.ts`, `scaffold-doc.spec.ts`. **`task-a-doc.spec.ts` left this list at v2**
— one assertion in it is updated, for the reasons three bullets down; the file's other twelve tests
are untouched and green.

**`doc-prose-transforms.spec.ts` and `consumables-prose-transforms.spec.ts` are edited at v3**, and
are the only two files this stage touches on this attempt. Three assertions in them stated the
legacy locale-blind behaviour FR-16 group 2 supersedes; §0a records the ruling, the derived
codepoint and why the change strengthens rather than weakens them. **They are the suite's only red
at the end of this stage** — sixteen other tests in the same two files stay green and prove the
edit did not take either module down.

Five files are load-bearing for a decision in this suite:

- `ua-translation-style-guide.spec.ts:49` pins the exact group-2 substring — the reason D10's edit
  must be three lines and not a rewrite. V9 restates the same assertion from the v4 side.
- `render-conformance.spec.ts:193-196` asserts the §2a header pair, a table v4 deletes. **This is
  why V14 is a parallel matrix rather than a flipped fixture**: flipping `conformanceDoc()` to
  `'4.0'` would make that correct assertion permanently red and the only route to green would be to
  weaken it.
- `task-a-doc.spec.ts:82` pinned `"schemaVersion": "3.0"`. **v1 recorded this as T7's to update and
  said "nothing in this suite touches it"; that was wrong, and this is the correction.** `so-builder`
  may not edit tests, so T7 could only rewrite the prompt and leave the assertion contradicting
  `task-a-doc.v4.spec.ts:50`, which requires `"3.0"` to be ABSENT from the same string. The two are
  mutually unsatisfiable; one of them had to be the live contract. **The v4 assertion is**, on three
  citations verified against the approved Specification rather than taken on trust:
  - **FR-15** (`docs/specifications/US-2.1-spec.md:354`) — "Every new LLM generation emits a
    document with `schemaVersion: '4.0'`". `'3.0'` "remains accepted" at the **schema** and in
    **rendering**, for documents already cached — which is `description-doc.schema.spec.ts`'s and
    `render-description.spec.ts`'s subject, not the prompt's. FR-15's failure path names "a new
    generation emitting `'3.0'`" as a defect outright.
  - **FR-30**, cited by FR-15:363 — "A generation that cannot produce a valid `'4.0'` document does
    not fall back to `'3.0'`."
  - **Plan D16** (`docs/plans/US-2.1-implementation-plan.md:777-784`) — "D1 emits `'4.0'` from the
    prompt … there is no code path that retries as `'3.0'`, and none is added."

  So `task-a-doc.spec.ts` now pins `"schemaVersion": "4.0"`. This is a **contract change, not a
  weakening**: the test still asserts a positive, still names an exact string, and the file's own
  v4 sibling already anticipated it in its header. The other tests in `task-a-doc.spec.ts` —
  including the `bullets 3–8` and prose-field clauses v1 flagged as text T7 rewrites — are
  untouched and all still pass.
- `task-a.spec.ts` green and unmodified is the evidence FROZEN `task-a.ts` was not edited.
- `master-system-prompt.spec.ts` and `constants.spec.ts` green and unmodified is T12's acceptance
  check 7. Weakening either to fit the §9 edit is an AGENTS.md §7.7 violation, not a fix.

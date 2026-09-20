---
artifact: test_strategy
story: US-2.1
version: 1
status: DRAFT
owner: so-test-writer
created_at: 2026-09-21T12:00:00Z
updated_at: 2026-09-21T12:00:00Z
supersedes: null
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
open_decisions_blocking: false
---

# Test Strategy — US-2.1: Migrate product descriptions to the v4.0 UA content schema

## 1. The shape of this suite

Fifteen validation categories (V1..V15), one new fixture module, thirteen new spec files and one
edited spec file. **Every file runs in the logic runner** (`npm run test:logic`, `vitest run`): none
is named `*.component.spec.ts`, nothing in FR-1..FR-30 reaches `src/app/components/`, and the
component runner gains no work — which is what the implementation plan's *Validation strategy*
section already predicted.

The governing constraint on file layout is **runtime module resolution, not taste**. Three
artifacts this suite asserts against do not exist yet: `src/prompt-core/hook-pattern.ts` (T6), a new
export in `constants.ts` (T2) and a new member on `StoreRenderRules` (T4). A *named* import of a
missing export is a link-time failure that takes a whole module down and reports one error about
the module rather than one failure per contract. So:

- **New behaviour that needs a not-yet-existing artifact goes in its own new spec file**, never
  appended to an existing green one. `constants.spec.ts`, `heading-style.spec.ts`,
  `render-description.spec.ts`, `description-doc.schema.spec.ts`, `task-a-doc.spec.ts`,
  `master-system-prompt.spec.ts`, `structural-parity.spec.ts`, `number-format-fixer.spec.ts`,
  `render-conformance.spec.ts` and `render-reconciliation.spec.ts` are **not edited**.
- The one exception is `src/prompts/optimizer.spec.ts`, which is appended to — every import it
  needs already resolves, so the new block cannot take the existing five tests down.

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

That is the whole of the `'4.0'` typing question, and it contributes **zero** type errors. The
eight errors this stage does leave standing are of a different class entirely — a module and a
parameter that genuinely do not exist yet — and are enumerated in the test generation report with
the task that clears each.

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

## 9. Existing tests this suite must NOT break, and the five it deliberately leans on

Untouched and green: `description-doc.schema.spec.ts`, `render-description.spec.ts`,
`render-reconciliation.spec.ts`, `render-conformance.spec.ts`, `task-a.spec.ts`,
`task-a-doc.spec.ts`, `master-system-prompt.spec.ts`, `constants.spec.ts`,
`structural-parity.spec.ts`, `number-format-fixer.spec.ts`, `decimal-separator.spec.ts`,
`store-render-rules.spec.ts`, `scaffold-doc.spec.ts`.

Five of them are load-bearing for a decision in this suite:

- `ua-translation-style-guide.spec.ts:49` pins the exact group-2 substring — the reason D10's edit
  must be three lines and not a rewrite. V9 restates the same assertion from the v4 side.
- `render-conformance.spec.ts:193-196` asserts the §2a header pair, a table v4 deletes. **This is
  why V14 is a parallel matrix rather than a flipped fixture**: flipping `conformanceDoc()` to
  `'4.0'` would make that correct assertion permanently red and the only route to green would be to
  weaken it.
- `task-a-doc.spec.ts:82` pins `"schemaVersion": "3.0"`; T7 updates it as a contract change. Nothing
  in this suite touches it.
- `task-a.spec.ts` green and unmodified is the evidence FROZEN `task-a.ts` was not edited.
- `master-system-prompt.spec.ts` and `constants.spec.ts` green and unmodified is T12's acceptance
  check 7. Weakening either to fit the §9 edit is an AGENTS.md §7.7 violation, not a fix.

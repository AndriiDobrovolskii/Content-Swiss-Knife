---
artifact: test_strategy
story: US-8.1
version: 2
status: ARCHIVED
owner: so-test-writer
created_at: 2026-10-14T19:45:00Z
updated_at: 2026-10-15T17:00:00Z
supersedes: docs/tests/US-8.1-test-strategy.md#1
inputs_consumed:
  - key: story
    version: 3
  - key: specification
    version: 3
  - key: impact_analysis
    version: 2
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 4
  - key: plan_review
    version: 4
open_decisions_blocking: false
---

> **Revision v2 (2026-10-15).** v1 (below, unchanged) covered Specification v2 (FR-1 to FR-23, T1 to T13), all built and green. v2 adds
> the section "v2 addendum: the FAQ Generator layout delta (FR-24 to FR-28, NFR-9; T14 to T17)" at the end of this file. Nothing in v1 is
> reworded; the v1 section "The red state, by spec table" describes the state at v1 TEST_WRITING and is history.

# Test Strategy - US-8.1: one master FAQ translated into the store languages, `<b>` not `<strong>`, standalone FAQ Generator

## Approach

Everything runs under `npm run test:logic` (vitest, happy-dom). No file is named `*.component.spec.ts`, so `npm run test:components` has nothing new, and `server/**` (node:test) is untouched, exactly as the task breakdown states. Every assertion is written from the Story's `AC-n` and Specification v2 (`FR-n`), not from the planned implementation and not from captured model output. The model is stubbed at the `LlmService` boundary only; the orchestrator, `runRepairGate`, the prompt builders, the number / unit / terminology normalisers and the validators are the real ones.

Services are driven with the repository's established pattern (`import '@angular/compiler'` first, `Injector.create`, never TestBed). The shared harness reuses the US-7.1 routing mock and pipeline routes (`test/fixtures/protected-name.ts`) so `generate()` / `generateUaContent()` reach every prompt builder on any registry store; no description fixture is invented.

## The red state, by spec table (task breakdown, "Spec ownership and the allowlist")

**Table A - allowlisted, each owned by one task; may carry a missing-symbol `tsc` diagnostic until the owner lands**

| Spec | Red because | Owner | Runtime red reason |
|---|---|---|---|
| `src/prompts/task-c.faq.spec.ts` | `contentKind` option absent (TS2353) | T1 | assertion failures: the description prompt is returned |
| `src/utils/faq-html.spec.ts` | module `faq-html` absent | T3 | red by absent module, by design |
| `src/utils/structural-parity.faq.spec.ts` | `validateFaqStructuralParity` export absent (TS2724) | T4 | `TypeError: ... validateFaqStructuralParity is not a function` |
| `src/utils/faq-gate.spec.ts` | module `faq-gate` absent (also imports `faq-html`, `validateFaqStructuralParity`) | T5 | red by absent module, by design |
| `src/services/content-orchestrator.faq-standalone.spec.ts` | `generateFaqOnly` absent (TS2339) | T8 | `TypeError: ... generateFaqOnly is not a function` |
| `src/utils/faq-form.spec.ts` | module `faq-form` absent | T9 | red by absent module, by design |
| `src/app/tab-descriptors.spec.ts` | module `tab-descriptors` absent; `'faq-generator'` not an `AppMode` | T10 | red by absent module, by design |

**Table B - type-clean from the start (zero `tsc` diagnostics at every task), red only by assertion failure or green throughout**

| Spec | State | Turned green by |
|---|---|---|
| `src/prompts/task-faq.spec.ts` (extended) | 3 new tests red, rest green | T2 |
| `src/services/content-orchestrator.faq-pipeline.spec.ts` (Generator groups, UA Description groups) | mostly red, guards green | T6 (Generator), T7 (UA) |
| `src/services/content-orchestrator.simplified.spec.ts` (R6 block rewritten) | 5 rewritten tests red, 24 green | T6 (Generator part), T7 (UA part) |
| `src/app/app.component.template-wiring.spec.ts` (extended) | 20 new pins red, 13 green | T9 (`TOOL_LABEL`, `AppMode`), T11 (component), T12 (template) |
| `src/prompts/task-c.description-bytes.spec.ts` | green throughout (characterization) | none; T1 keeps it green |

Table B specs and the shared fixtures (`test/fixtures/faq-pipeline.ts`, `test/fixtures/task-c-description-inputs.ts`) import only symbols that exist before T1 (constraint 1a, and the plan-review note that non-spec helpers obey the same rule). Where a table A spec needs a new symbol it uses it plainly (no `@ts-expect-error`, no `as any`), so the diagnostic is of an allowed missing-symbol kind and disappears when the owner lands.

## What is tested at which level

| Layer | Spec | What it asserts |
|---|---|---|
| Prompt text, FROZEN `task-c.ts` | `task-c.faq.spec.ts` | FR-12 items 1 to 3 over all 16 store x language pairs: element-for-element wording, the nine description-only markers absent, no master system prompt, per-language rule identity kept, NFR-4 caching |
| Prompt bytes, FROZEN `task-c.ts` | `task-c.description-bytes.spec.ts` | AC-18 / FR-13: 16 pairs x 6 variants (with and without `opts`, simplified template) byte-equal to a golden captured from the UNMODIFIED file |
| Prompt text, `task-faq.ts` | `task-faq.spec.ts` | AC-6: `<b>` listed, `<strong>` absent from the contract and from the whole payload |
| Pure functions | `faq-html.spec.ts`, `structural-parity.faq.spec.ts`, `faq-gate.spec.ts`, `faq-form.spec.ts` | AC-3, AC-7, AC-8, AC-9, AC-11, AC-12, AC-16/17 storability, FR-22, FR-23 |
| Pure function | `tab-descriptors.spec.ts` | AC-4 and AC-13 UI side; Generator mode unchanged (hand-derived literals for all 7 stores) |
| Service, through public methods | `faq-pipeline.spec.ts` | AC-1, AC-2, AC-3, AC-4, AC-5, AC-7, AC-8, AC-9, AC-14 (parity), AC-16, AC-17, FR-21, FR-23, in Generator AND UA Description, per store |
| Service | `faq-standalone.spec.ts` | AC-12 to AC-15, FR-16 / FR-18 failure paths, the same rules as Generator |
| Source-text pins | `app.component.template-wiring.spec.ts` | AC-10, AC-11, AC-12 wiring in `app.component.{ts,html}` (repository idiom; `AppComponent` has no spec by prior decision) |

## Binding constraints and where each is met

| Constraint | How |
|---|---|
| 1. Split orchestrator specs | `faq-pipeline.spec.ts` (T6/T7) and `faq-standalone.spec.ts` (T8); every `generateFaqOnly` reference is in the latter |
| 1a. Table B imports nothing new | `faq-pipeline`, `simplified` (R6), `task-faq`, `template-wiring`, `description-bytes` and both fixtures import only pre-existing symbols; proved by `tsc` (see the generation report) |
| 2. `description-bytes` never passes `contentKind` | it does not; it type-checks and passes against the unmodified `task-c.ts` |
| 3. `template-wiring` is source-text only | strings only, no import of anything T9 to T12 create |
| 4. Four module-absent specs named | `faq-html`, `faq-gate`, `faq-form`, `tab-descriptors`: "red by absent module, by design" |
| 5. `tab-descriptors` literals, no snapshot | 7 stores written out by hand from `app.component.ts:583-629`; no `toMatchSnapshot` |
| 6. Table and `tsc` listing in the report | generation report |
| T6 / T7 empty master terminal and provider-throw | pipeline spec, both entry points: "an empty or whitespace-only master response is terminal" and "the master call itself throws" / "a translation call throws" |

## Fixtures

No FAQ fixture exists in `test/fixtures/corpus/` (impact analysis: the corpus has no FAQ and no `<strong>` example), so one small authored set is added: `FAQ_MASTER_HTML` (2 questions, 2 paragraphs, 1 list of 2 items, a bold lead sentence and bold lead-ins), its `<strong>` twin, and an invalid twin (`<br>` and `<h2>`), in `test/fixtures/faq-pipeline.ts`. The orchestrator specs reuse the corpus Ortur H20 20 W Doc through `pipelineRoutes` for the description side. The AC-18 golden stores SHA-256 digests and lengths (the full prompts would be about 35 KB of master prompt per case).

## Determinism

No sleeps, no retry-until-pass, no unseeded randomness, no network, no wall clock. Provider failures are thrown synchronously by the stub. The corpus HTML input of the golden has its line endings normalised so a CRLF checkout and an LF checkout produce the same digests.

## What is deliberately not unit-tested, and why

| Not tested | Why |
|---|---|
| AC-20 (`arch-guard.sh` exits 0 after `--rebaseline`; `.arch-guard-checksums` in the same commit) | mechanical, not behaviour: asserted by `bash arch-guard.sh` and the T1 `git diff` acceptance, and by QUALITY_GATE |
| The T6 "stub block repairer returns `<strong>`" case | unreachable through public behaviour: nothing in the FAQ validator chain (`validateGeneratedHtml`, the FR-9 shape check, parity) emits a block-scoped (`block[i]`) issue, so `repairBlocks` is never invoked for a FAQ. AC-7 is instead asserted on every text that reaches storage and on the master handed to translation |
| Rendered tab panels, button states in a real browser | `AppComponent` has no spec by a standing decision; covered by `tab-descriptors.spec.ts` (data) and source-text pins (wiring); a browser check is a manual QUALITY_GATE concern |
| `tools/feedback-form/create-form.gs` (T9) | no test depends on it; reviewed by reading |
| `README.md` (T13) | documentation only |
| Wording quality of free model text (FR-21 beyond the normaliser, FR-23 anglicisms beyond the normaliser, SP-2 number / unit / name preservation in FAQ translations) | review criteria per NFR-8; SP-2 has no FR |
| OD-6 (thinking tier, protected-name block for FAQ translation), OD-8 (surfacing a skipped language), OD-9(e) (TXT of a FAQ-only run) | undecided; no requirement exists, so no test pins a choice |

## Pins that go beyond the Specification text (flagged for RECONCILIATION)

These come from the approved task breakdown, not from an `AC-n`: the history entry's content and the progress line `FAQ Generation Done!` (T8), `content().website` recorded on a standalone result (T8's AC-13 shape), the label convention that a FAQ translation call's label starts with `FAQ` and is not a generation call (plan D5, T6 notes), the fixed cap of 3 independent of the user repair setting (plan Rejected 8), and the source-text pin names `faqDescription` / `faqSpecs` / `faqSupplementalContent` only as the pattern `this.faq*()`.

---

## v2 addendum: the FAQ Generator layout delta (FR-24 to FR-28, NFR-9; T14 to T17)

Source: Story v3 (AC-21 to AC-26), Specification v3, implementation plan v2 (D12 to D16, verification matrix), task breakdown v4 (T14 to T17,
"v4 test-state classification", constraints V4-1 to V4-7), plan review v4 and the approver's HUMAN_PLAN_APPROVAL instructions (N2, N3, N4 binding; N5 recommended).
T1 to T13 and their tests are built and green and are neither re-opened nor modified: this delta adds **one new spec file and no edit to any existing test** (V4-1).

### Approach

One new spec, `src/app/app.component.faq-layout.spec.ts`, under `npm run test:logic` (vitest). It reads `src/app/app.component.html`, `src/app/app.component.ts` and the shared
`source-input.component.{html,ts}` as TEXT (CRLF normalised), in the idiom of `app.component.template-wiring.spec.ts` ("no `AppComponent` spec" is a standing decision: heavy DI, and
`happy-dom` has no layout engine). It is not named `*.component.spec.ts`, so `test:components` gains no file. It imports no module a task creates, no Angular package and not `AppComponent`:
it is **table B** with **zero `tsc` diagnostics** at every task, and the empty compile allowlist of the task breakdown holds. Every red pin fails at runtime by assertion ("expected X, got Y"),
never by a load error.

One template condition is **evaluated**, not pattern-matched: the `@if (...)` guarding the empty-state block is extracted with a balanced-parenthesis scan from the block holding `uiLabels().noContentYet`
and run with stubbed `appMode()`, `content()` and `isGenerating()` through `new Function` (repository-owned text only; plan review N6). The extractor fails closed: a condition that is not a plain
JS expression of those three reads, or a block that is not found, throws and the test fails (V4-4). The FR-28 oracle is a literal copy of today's condition, not derived from the new template.

### State classification and tag convention (V4-3, plan review N2)

| Tag in the test title | Meaning | `-t` selector |
|---|---|---|
| `(owner T14)` .. `(owner T17)` | red first; fails on the current tree; turned green by that task | `-t "owner T15"` etc. |
| `[baseline-guard]` | green on the current tree by design (FR-28 / NFR-9 regression guard or a premise assertion); fails only if a task goes wrong | `-t "baseline-guard"` |

Mixed baseline states were split into separate tests (N2): the FR-24 "during a run" row is its own `[baseline-guard]` test (already false today through the existing `!isGenerating()`), while
before a run, after a FAQ-only run and after a no-FAQ run are three separate `(owner T15)` tests; "exactly three source inputs" and "`[required]="true"` still present" are `[baseline-guard]`
tests and carry no owner tag; the FR-27 parity is two tests (the equality half is a guard, "contains the new key" is `(owner T14)`). No title contains both markers.

### What is tested at which level

| Req / AC | Pin (all in `src/app/app.component.faq-layout.spec.ts`) | State at TEST_WRITING |
|---|---|---|
| FR-24 / AC-21 | evaluated empty-state condition, `faq-generator`: before a run, after a FAQ-only run, after a no-FAQ run, each `false`; text contains `appMode() !== 'faq-generator'` | red, T15 |
| FR-24 / AC-21 | during a run `false` for every content state; the condition holds no `hasOutput` / `hasFaqOutput` / `faqArtifacts`; `noContentYet` and `fillFormStart` once each, in one block with its own `fa-file-code` | guards |
| FR-28 / AC-26 | evaluated condition equals the literal oracle of today's condition for `generator`, `ua-generator`, `seo-generator`, `slug-generator` over a 48-state grid including the trap state (stale `faqArtifacts`, empty output fields) | guards |
| FR-28 / AC-26 | `generatorForm` Supplemental input bound to the exact key `supplementalContent`, no `[required]`, field order unchanged; SEO, Slug and `generatorForm` blocks never bind the new key; `en` / `uk` shared literals unchanged | guards |
| FR-25 / AC-22 (structure) | after the tab bar's `</header>`, once the validation panel, repair panel and empty-state block are removed only the container's opening tag remains; container class tokens hold no `flex` token, `grid`, `items-*`, `justify-*`, `h-full`, `min-h-*`; FAQ panel root holds no `h-full`, `min-h-*`, `justify-*`, `items-center`, `mt-*`, `pt-*` | guards |
| FR-26 / AC-23 | strictly increasing anchors: Store, Product Name, Supplemental, Description, Specs, toggle; first `app-source-input` of the FAQ form is the Supplemental one | red, T16 |
| FR-26 / AC-23 | each of the six anchors found exactly once and exactly three source inputs (premise) | guard |
| FR-27 / AC-24 | FAQ Supplemental input `[label]="uiLabels().supplementalContentRequired"`; exact-key count of `uiLabels().supplementalContent` is 1 in the template and 1 in `generatorForm`; the new key is read once, in the FAQ form | red, T17 |
| FR-27 / AC-24 | `en` value `'Supplemental Content (Required)'` (no "Optional"); `uk` value `Додатковий контент (Обов'язково)` with U+0027, not U+2019 / U+02BC, not "Опціонально", differs from `en`; key present in both blocks | red, T14 |
| FR-27 / AC-24 | whole-dictionary `en` / `uk` key-set parity (no one-sided key, no duplicate; 170 / 170 today) | guard |
| FR-27 / AC-24, AC-25 (marker, plan review N5) | the FAQ Supplemental input is given `[required]="true"`; the shared `source-input` component renders `*` from `@if (required)` next to the label and defaults `required` to false | guards |
| AC-25 (enablement) | no new test: `faq-form.spec.ts` (`isFaqFormComplete`) and the wiring pins on `isFaqFormValid` and the Generate button stay green and unmodified | existing |
| NFR-9 | no new test of its own: every pin above needs no LLM; "no prompt / `STORE_REGISTRY` / FROZEN / data-field change" is a diff property checked by the gate (`bash arch-guard.sh`, unchanged `.arch-guard-checksums`, `git diff --stat`) | gate |

### Matching discipline (plan review N3), as encoded

- `uiLabels().supplementalContent` is a prefix of `uiLabels().supplementalContentRequired`; every count and binding check uses an exact-key match (negative lookahead `(?![\w$])`), so a substring count (2 before and after T17) cannot make the pin unsatisfiable or vacuous.
- `fa-file-code` occurs twice in the template; the icon check is scoped to the empty-state block text only.
- `@for (tab of tabDescriptors()` occurs in the tab bar and in the result view; the FR-25 slice starts after the `</header>` that closes the tab bar and a premise test asserts it contains neither the loop nor the tablist.
- Every group opens with premise assertions (block found and non-trivial, anchors found once, key sets non-empty) so a mis-slice fails loudly.

### Diff range for the whole-delta NFR-9 check (plan review N4)

The first v4 task is **T15**, not T14. The whole-delta diff property is checked against "the commit before the first v4 task", never "the commit before T14". The HEAD at which the tests were written is `4c5f37e`; the TEST_WRITING commit that adds the spec and these three docs sits directly on it, and T15 is the first implementation commit after that. So the range is `git diff --stat 4c5f37e..HEAD` (it then lists the new spec and the three test docs, plus `src/app/app.component.html` and `src/app/app.component.ts`, plus whatever other `docs/` files later stages commit, and no other source file), or `git diff --stat <the test-writing commit>..HEAD` for the implementation alone (only `src/app/app.component.html` and `src/app/app.component.ts`). No diff-range check is encoded as a test (it would depend on repository history).

### Deliberately not unit-tested, and why

| Not tested | Why |
|---|---|
| **AC-22 geometry**: the active FAQ panel's top edge sits one container padding (`p-8`, 32 px) below the tab bar and is not vertically centred | **No automated test.** The repository has no layout engine (`happy-dom` has none) and no browser-test tool. It is a **manual browser check by the operator at HUMAN_PR_APPROVAL** (approver's N1 confirmation; plan D16 / OD-15 default), recorded there; RECONCILIATION must treat it as a recorded claim, not pipeline evidence. The class-token pins are only its structural proxy |
| Rendered DOM of the labels and the `*` | source-text pins only (standing decision); the shared component's marker is pinned at its source (N5) |
| The pre-run empty tab strip (OD-11), the blank area after a no-FAQ run (OD-16), panels above the result (OD-12) | accepted defaults, not requirements; visible in the manual check |
| OD-13 Ukrainian label | implemented as the labelled default; the one literal and its pin change if the human decides otherwise |

### Pins that go beyond the Specification text (flagged for RECONCILIATION)

The "no `hasOutput` / `hasFaqOutput` / `faqArtifacts` in the condition" and "condition text contains `appMode() !== 'faq-generator'`" pins come from plan D16 and are implementation-shaped (plan review N8: a behaviourally equivalent form would trip the text pin; the evaluated pins are the real guard). The FR-25 class-token pins are a structural proxy for AC-22, as above.

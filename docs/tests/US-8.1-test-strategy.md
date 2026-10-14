---
artifact: test_strategy
story: US-8.1
version: 1
status: DRAFT
owner: so-test-writer
created_at: 2026-10-14T19:45:00Z
updated_at: 2026-10-14T19:45:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 2
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 1
  - key: task_breakdown
    version: 3
  - key: plan_review
    version: 3
open_decisions_blocking: false
---

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

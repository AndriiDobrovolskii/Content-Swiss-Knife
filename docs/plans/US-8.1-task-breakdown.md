---
artifact: task_breakdown
story: US-8.1
version: 4
status: ARCHIVED
owner: so-implementation-planner
created_at: 2026-10-14T20:00:00Z
updated_at: 2026-10-15T15:00:00Z
supersedes: docs/plans/US-8.1-task-breakdown.md#3
inputs_consumed:
  - key: story
    version: 3
  - key: specification
    version: 3
  - key: impact_analysis
    version: 2
  - key: implementation_plan
    version: 2
open_decisions_blocking: false
---

# Task breakdown: US-8.1 (one master FAQ, translated; `<b>` not `<strong>`; standalone FAQ Generator)

> **Revision v4 (2026-10-15).** v3 (APPROVED) planned T1 to T13 for Specification v2 (FR-1 to FR-23). All thirteen are **built and
> committed** on this branch (status table below). Specification v3 (APPROVED at HUMAN_SPEC_APPROVAL, c7098af) adds FR-24 to FR-28
> and NFR-9 (Story v3, AC-21 to AC-26: the FAQ Generator screen layout), designed in implementation plan v2 as D12 to D16. This
> revision adds **T14 to T17** for that delta only. T1 to T13 keep their text; they are marked DONE and are not re-planned,
> re-opened or re-tested here. The status goes back to `DRAFT`: plan review and `HUMAN_PLAN_APPROVAL` run again against v4.
> Task breakdown v3 is `SUPERSEDED` by this file (the file path is unchanged; v3's exact text is recoverable with `git show b6ceebe:docs/plans/US-8.1-task-breakdown.md`). v3's `plan_review`
> input (plan_review v3, which reviewed the v1 plan) is not consumed here: it predates plan v2 and is stale for this revision.
> Everything below that speaks in the present or future tense about T1 to T13 is the v3 text, kept as written; the status table
> says what happened.

Task count: **17** (T1 to T13 DONE, T14 to T17 new). The v2 delta is **four tasks in two files** (`src/app/app.component.html`,
`src/app/app.component.ts`), all track `angular`, none FROZEN, plus **one new spec file** written by `TEST_WRITING`
(`src/app/app.component.faq-layout.spec.ts`, `test:logic`). Nothing in the delta touches a prompt, `STORE_REGISTRY`, a FROZEN file,
`.arch-guard-checksums`, a golden, a fixture, `server/**` or any already-built FR-1 to FR-23 file.

## Revision notes (v3 to v4, design delta D12 to D16)

| Item | Change in v4 |
|---|---|
| T1 to T13 | Text kept intact; each marked DONE with its commit (status table). Their tests lists, files, acceptance checks and the v3 gate convention are not rewritten. The two post-T13 loop-back fixes (8c89bce, 1ac82e1) are recorded below the status table as fixes, not as tasks. |
| New tasks | **T14** (label key `supplementalContentRequired` in both `TRANSLATIONS` blocks, D15), **T15** (empty-state guard conjunct, D12, which also satisfies FR-25 per D13), **T16** (Supplemental Content input moved directly after Product Name, D14), **T17** (relabel binding in the FAQ form, D15). |
| Ordering | Contract before consumer: T14 (the key) before T17 (the binding that reads it). Riskiest first: T15 (the only edit that can change another mode's screen). T14 and T15 are independent, in disjoint files. T15, T16, T17 are serial because they all edit `app.component.html`. |
| New spec | `src/app/app.component.faq-layout.spec.ts` is a **table B** spec: it reads `app.component.html` / `.ts` as text and imports nothing a task of this Story creates. It must carry **zero** `tsc` diagnostics at every task, from the first commit. Its pins are red or green at baseline as classified in "v4 test-state classification". |
| Gate | The v3 per-task gate applies. For T14 to T17 the allowlist is empty (table A is empty and the delta adds no table A spec), so `npm run lint` and `npm run build` must exit 0 after every one of them. See "v4 per-task gate". |
| Coverage | Extended: plan items D12 to D16 and FR-24 to FR-28 / NFR-9 map to T14 to T17, and a full AC-1 to AC-26 table is added. |
| Open points | Carried forward and updated (section "Open points carried to HUMAN_PLAN_APPROVAL"); nothing is decided by this breakdown. |

## Task status (T1 to T13 are built; T14 to T17 are planned)

| Task | Status | Commit |
|---|---|---|
| T1 FAQ variant in `task-c.ts` + re-baseline (FROZEN, operator-approved) | DONE | da59195 |
| T2 `<b>` not `<strong>` in the FAQ generation prompt | DONE | 3698434 |
| T3 `faq-html.ts` | DONE | c7197f0 |
| T4 `validateFaqStructuralParity` | DONE | d09f092 |
| T5 `faq-gate.ts` | DONE | 54ee224 |
| T6 `runFaqPipeline` / `storeFaq`, `generate()` | DONE (the FR-21 English-translation assertion was a test defect, corrected by the test-only commit c62e30a) | f3343e1 |
| T7 `generateUaContent()` wiring | DONE | 7f534d7 |
| T8 `generateFaqOnly()` | DONE | 9f20a15 |
| T9 `faq-generator` `AppMode`, `TOOL_LABEL`, `faq-form.ts`, feedback form entry | DONE | e8dcf56 |
| T10 `deriveTabDescriptors` | DONE | 3e9db41 |
| T11 FAQ Generator component state | DONE | 88670be |
| T12 FAQ Generator mode button, form, Generate button | DONE | c04096a |
| T13 README | DONE | 7a0613e |
| T14 label key `supplementalContentRequired` in both `TRANSLATIONS` blocks | planned | n/a |
| T15 exclude `faq-generator` from the empty-state condition | planned | n/a |
| T16 move the Supplemental Content input directly after Product Name | planned | n/a |
| T17 bind the FAQ Supplemental Content label to the new key | planned | n/a |

Post-T13 loop-back fixes (not tasks of this breakdown, recorded for accuracy): 8c89bce (registry-derived language name in the FAQ
variant of `task-c.ts`, under a second and separate section 9 grant; `MASTER_LOCALE` in `tab-descriptors.ts`) and 1ac82e1
(`validateFaqShape` fails closed on markup the tag pass cannot see). Neither is re-planned here.

13 tasks (v3 text). Exactly one task (T1) edits a FROZEN file (`src/prompts/task-c.ts`, under the operator's
recorded AGENTS.md section 9 permission) and it carries the section 9 stop. No task edits
`master-system-prompt.ts`, `output-validator.ts`, `task-a.ts`, `task-b.ts`, `constants.ts`,
`payload.ts`, `repair-strategy.ts`, `zip-generator.ts`, `server/**`, `src/domain/**` or
`src/render/**` (plan D1, D8, D10).

All tests run in `test:logic` (vitest, `src/**/*.spec.ts`, `test/**/*.spec.ts`). No task adds a
`*.component.spec.ts`, so `test:components` (Karma) is not involved and `server/**` (node:test)
is untouched. Test file names are the plan's proposals except where this document constrains them
(section "Constraints on TEST_WRITING"); `so-test-writer` creates them before IMPLEMENTATION starts.

## Revision notes (v2 to v3, loop-back `changes_required_tasks`, attempt 2 of 3)

| Review item (plan_review v2) | Change in v3 |
|---|---|
| R4 (allowlist contradicted TEST_WRITING constraint 1: `faq-pipeline.spec.ts` was declared type-clean from the start but was to import `faq-gate` / `faq-html`) | **Route (a) chosen and applied everywhere:** specs that are type-clean from the start (table B) may import no symbol that a task of this Story creates. The "plus `faq-gate` and `faq-html`" clause is gone from constraint 1; a general import rule (constraint 1a) and a report requirement (constraint 6) are added; the ownership section is split into table A (allowlisted, owner task named) and table B (never allowlisted); the compile gate admits zero diagnostics in table B specs at every task; the T2, T6, T7, T8, T9 acceptance lines are restated. The rewritten R6 block of `simplified.spec.ts` is covered explicitly. The rest of the document was swept for the same class (see "Sweep result" after the allowlist table). |
| NB: open points list | The per-task gate convention and the "cannot find module" departure from `so-test-writer` are now items in "Open points carried to HUMAN_PLAN_APPROVAL". |
| NB: T8 `Depends on` | Now `T6, T7`; the execution order and the dependency line agree. |
| NB: `npm run build` observable | The compile rule is judged with `tsc --noEmit` as the proxy (same `tsconfig.json`, same diagnostics, one-line grep format). The Angular build prints `[ERROR] TS2307: ...` with the path on a following line, so it is not grep-filterable per file; it is only required to exit 0 from T10 on. |
| NB: T6 enumeration | T6 now lists the empty / whitespace-only master (terminal: one call, no retry, nothing stored, no translation call) and the translation provider-throw case (one attempt, language skipped when exhausted, others kept). T7 mirrors both for the UA mode. |

## Revision notes (v1 to v2, loop-back `changes_required_tasks`, attempt 1 of 3)

| Review item | Change in v2 |
|---|---|
| R1 (lint/build gate unachievable with red specs on the branch) | The header gate is redefined as the **per-task gate** with an explicit, per-task allowlist of red specs (table below). `lint` and `build` are judged by diagnostics, not by exit code, until T10; from T10 on both must be fully clean. Every task's acceptance check now refers to this gate instead of claiming "lint and build pass". |
| R2 (characterization claims) | Only **one** characterization test is green from the start (T1's byte-identity golden). T10's claim is withdrawn: its Generator-mode expectations are hand-derived literals, not a captured snapshot, and the spec is red by load failure until T10. |
| R3 (undefined interfaces) | Signatures for `buildFaqValidator` / `isFaqStorable` (T5) and `deriveTabDescriptors` with its `TabDescriptorContext` (T10) are stated. The other new functions' signatures are also restated for completeness (T3, T4, T9). |
| NB: T1 stop wording | T1 now requires the operator's instruction in the builder's own session. |
| NB: T9 `Depends on` and `create-form.gs` | `Depends on: none` and the execution-order text agree; the `create-form.gs` edit is marked as scope beyond the Story Surface and impact analysis, to be confirmed at plan approval. |
| NB: FAQ-only TXT download | Recorded as an explicit open point under OD-9 (section "Open points carried to HUMAN_PLAN_APPROVAL"); not decided here. |
| NB: `threw` flag, `MASTER_LOCALE`, T6 size | Added as notes on T5 and T6. |

## Per-task gate (replaces the v1 "gate green")

Tests are written for the whole Story before any task runs (AGENTS.md section 5), so the red specs
of later tasks are on the branch while an earlier task lands. `tsconfig.json` includes `src/**/*`
and `test/**/*`, `npm run lint` is `tsc --noEmit`, and `ng build` uses the same `tsconfig.json`.
A red spec that imports a module, export, option or method that does not exist yet therefore makes
`tsc` report TS2307 / TS2305 / TS2339 / TS2353 in that spec file (precedent: the US-5.1 and US-7.1
test generation reports). The v1 wording "lint and build pass" for T1 to T9 could not be met.

A task is **gate-green** when all of the following hold after its commit:

1. **Own tests.** Every test the task owns passes.
2. **No regression.** Every test that passed before the task still passes (both runners; this task
   set touches `test:logic` only). A spec that fails to load because a later task's module is absent
   was not passing before and is not counted.
3. **Compile gate.** `npx tsc --noEmit` (the body of `npm run lint`) reports:
   - **zero diagnostics in any file that is not a spec**, and
   - **zero diagnostics in any type-clean-from-the-start spec** (table B below), at every task and
     from the first commit, and
   - **zero diagnostics in any allowlisted spec (table A) whose owner task is already committed on
     the branch**, and
   - diagnostics in the table A specs still owned by later tasks only of the missing-symbol kinds:
     TS2307 / TS2305 (module or export absent), TS2339 (method or property absent), TS2353 (option
     key absent), and TS2322 / TS2345 where the only cause is a union member or parameter type a
     later task creates (for example the `'faq-generator'` literal before T9).

   Observable check (also the proxy for the build):
   `npx tsc --noEmit 2>&1 | grep "error TS" | grep -v -E "<allowlist>"` prints nothing, where
   `<allowlist>` is the alternation of the spec paths in the "Remaining red specs" column for this
   task, written as `(path1|path2)\(` so that only diagnostics located in those files are excused.
   `npm run build` type-checks the same program (`angular.json` points at `tsconfig.json`), so its
   diagnostics are the same set; Angular prints them as `[ERROR] TS2307: ...` with the file path on
   the following line, which is why `tsc` is the instrument. The build is required to exit 0 only
   from T10 on (its exit code is expected to be non-zero while the allowlist is non-empty).
4. **Frozen baseline.** `bash arch-guard.sh` exits 0.
5. **Scope.** `git diff` for the commit lists only the files in the task's Files table.

From **T10** on the allowlist is empty: `npm run lint` and `npm run build` must exit 0 and the full
compile is clean. The full suite (both runners, coverage, build, arch-guard) is proved green only by
`QUALITY_GATE`, after T13. This convention is an interpretation of AGENTS.md section 6 and
`so-builder` "definition of done" item 3 ("`npm run lint` is clean") for a tests-first branch; it
changes no threshold and skips no check, and it is surfaced to the human for HUMAN_PLAN_APPROVAL.

### Spec ownership and the allowlist

**Table A: specs that may carry a missing-symbol diagnostic until their owner lands** (the allowlist
members). Each is created red by TEST_WRITING and is owned by exactly one task, which turns it
type-clean and green. Such a spec may import only symbols that exist at the end of its owner task.

| Spec file | Red because | Owned by |
|---|---|---|
| `src/prompts/task-c.faq.spec.ts` | `contentKind` option on `buildPromptC` absent | T1 |
| `src/utils/faq-html.spec.ts` | module `faq-html` absent | T3 |
| `src/utils/structural-parity.faq.spec.ts` | `validateFaqStructuralParity` export absent | T4 |
| `src/utils/faq-gate.spec.ts` | module `faq-gate` absent (it may also import `faq-html` and `validateFaqStructuralParity`, which exist by T5) | T5 |
| `src/services/content-orchestrator.faq-standalone.spec.ts` | `generateFaqOnly` method absent | T8 |
| `src/utils/faq-form.spec.ts` | module `faq-form` absent | T9 |
| `src/app/tab-descriptors.spec.ts` | module `tab-descriptors` absent; `'faq-generator'` not yet in `AppMode` | T10 |

**Table B: specs that are type-clean from the start** (red only at runtime by assertion failure, or
green throughout). They are never in the allowlist, so the compile gate admits zero diagnostics in
them after every task. To make that true they may import **only symbols that exist on the branch
before T1**: no `faq-html`, `faq-gate`, `faq-form` or `tab-descriptors`, no
`validateFaqStructuralParity`, no `FAQ_*` constant, no `contentKind` option, no `generateFaqOnly`,
no `'faq-generator'` `AppMode` literal. They reach the new behaviour only through symbols that
exist today (`ContentOrchestratorService.generate` / `generateUaContent` with a stubbed `llm`,
`buildPromptFaq`, the text of source files) and use literals where a new constant would be
convenient (for example `3` for the attempt cap, the rule-id strings).

| Spec file | State | Tasks that turn it green |
|---|---|---|
| `src/prompts/task-faq.spec.ts` (extended) | red at runtime | T2 |
| `src/services/content-orchestrator.faq-pipeline.spec.ts` (Generator and UA Description groups) | red at runtime | T6 (Generator groups), T7 (UA groups) |
| `src/services/content-orchestrator.simplified.spec.ts` (R6 block rewritten by TEST_WRITING) | red at runtime | T6 (Generator part), T7 (UA part) |
| `src/app/app.component.template-wiring.spec.ts` (extended) | red at runtime | T9 (`TOOL_LABEL` pins), T11 (component pins), T12 (template pins) |
| `src/prompts/task-c.description-bytes.spec.ts` | green throughout | none (T1 keeps it green) |

Specs that already exist and are untouched stay green and are listed per task as "existing, already
green".

Remaining red specs (the allowlist, table A members only) after each task, in the execution order below:

| After | Remaining red specs that may carry a diagnostic |
|---|---|
| T1 | faq-html, structural-parity.faq, faq-gate, faq-standalone, faq-form, tab-descriptors |
| T2 | same as after T1 |
| T3 | structural-parity.faq, faq-gate, faq-standalone, faq-form, tab-descriptors |
| T4 | faq-gate, faq-standalone, faq-form, tab-descriptors |
| T5 | faq-standalone, faq-form, tab-descriptors |
| T6, T7 | faq-standalone, faq-form, tab-descriptors |
| T8 | faq-form, tab-descriptors |
| T9 | tab-descriptors |
| T10, T11, T12, T13 | none (table A is empty; table B specs are still held to zero diagnostics) |

If the group A tasks (T2, T3, T4) are done in a different order, the allowlist is always "the table A
specs owned by tasks not yet committed on the branch".

**Sweep result (same class as R4).** Every spec in this Story was checked against the imports it could
need and the allowlist rows it would then require:

- `faq-pipeline.spec.ts` and `simplified.spec.ts` (the R4 cases): table B; no new import; no
  allowlist row needed.
- `task-faq.spec.ts`: only `buildPromptFaq` (exists); table B.
- `task-c.description-bytes.spec.ts`: no `contentKind`; table B (constraint 2).
- `app.component.template-wiring.spec.ts`: strings only, no `AppMode` or `faq-form` import; table B
  (constraint 3). Its pins for T9, T11 and T12 are runtime-red until those tasks land.
- `faq-gate.spec.ts`: imports `faq-html` (T3) and `validateFaqStructuralParity` (T4) in addition to
  `faq-gate`; both exist before T5 because T5 depends on T3 and T4, and the spec is allowlisted until
  T5 anyway.
- `faq-standalone.spec.ts`: references `generateFaqOnly` (T8) and may import `faq-html` / `faq-gate`
  (exist by T8); allowlisted until T8.
- `tab-descriptors.spec.ts`: uses the `'faq-generator'` literal (T9) and `deriveTabDescriptors` (T10);
  allowlisted until T10, which is after T9, so no gap.
- `task-c.faq.spec.ts`, `faq-html.spec.ts`, `structural-parity.faq.spec.ts`, `faq-form.spec.ts`: each
  needs only its own owner's symbol (plus symbols of earlier tasks); allowlisted until the owner.
- No other row in the document names a spec absent from tables A and B; the "existing, already green"
  specs are untouched by TEST_WRITING and import nothing new.

### Constraints on TEST_WRITING (so the gate above is achievable)

1. **Split the orchestrator specs.** `content-orchestrator.faq-pipeline.spec.ts` holds the Generator
   and UA Description groups (T6, T7); the `generateFaqOnly` groups (T8) go in a separate
   `content-orchestrator.faq-standalone.spec.ts`. Otherwise one `generateFaqOnly` reference would keep
   the T6/T7 spec from type-checking and their acceptance checks could not run.
1a. **Table B specs import nothing a task of this Story creates.** `faq-pipeline.spec.ts`, the
   rewritten R6 block of `simplified.spec.ts`, `task-faq.spec.ts`, the template-wiring spec and the
   byte-identity spec use only symbols that exist before T1 (full list in the table B paragraph). In
   particular the orchestrator specs do **not** import `faq-gate` or `faq-html` (not even for a
   constant or a type): they drive the service through its public methods with a stubbed `llm`, count
   calls by `taskLabel`, and assert on `content()`, so nothing in them can fail to compile because T3
   or T5 has not landed. Behaviour that `faq-gate` / `faq-html` own is pinned in their own specs (T3,
   T5), not re-imported here. A spec that needs a new symbol belongs in table A with an owner task
   whose end state contains that symbol.
2. **`task-c.description-bytes.spec.ts` must not pass `contentKind`**, not even `'description'`: it
   must type-check and be green against the unmodified `task-c.ts`. Its "with `opts`" cases use
   `{ sourceLocale: 'uk-UA' }` and the other existing option keys only. (A case of 1a.)
3. **`app.component.template-wiring.spec.ts`** keeps to source-text pins (it reads
   `app.component.ts` / `.html` as strings) and imports nothing that T9 to T12 create. (A case of 1a.)
4. **Specs for brand-new modules** (`faq-html`, `faq-gate`, `faq-form`, `tab-descriptors`) fail at
   load with "module not found" until their task lands. That is unavoidable for a tests-first
   specification of a new module, and it is the recorded red state, not a broken test. The test
   generation report must list these four by name as "red by absent module, by design" and must show
   the runtime failure reason for every other new or extended spec ("expected X, got Y").
   `so-test-writer` says "cannot find module is a broken test, not a red one": that applies to a
   spec that is meant to exercise an existing module. This departure from the skill's literal text is
   listed under "Open points carried to HUMAN_PLAN_APPROVAL".
5. **`tab-descriptors.spec.ts` Generator-mode expectations are hand-derived literals**, not a snapshot
   (see T10). No `toMatchSnapshot`, no `-u`.
6. **Report requirement.** The test generation report lists, per spec, its table (A or B) and the
   exact `tsc --noEmit` diagnostics on the branch after TEST_WRITING: only table A paths may appear,
   each with a missing-symbol kind. Any diagnostic in a table B spec is a defect to fix before the
   stage ends.

## v4 delta: gate, test state and constraints for T14 to T17

This section applies to T14 to T17 only. It extends, and does not replace, the v3 text above.

### v4 per-task gate

The v3 gate (items 1 to 5) holds with these specialisations:

1. **Own tests.** Every pin the task owns (selected with `-t "owner T<n>"`, see constraint V4-3) passes.
2. **No regression.** Every test that passed before the task still passes in `test:logic` (the whole suite was 184 files, all green,
   after T13 and the loop-back fixes; the figure to compare against is the run taken immediately before the task), including every pin of
   `app.component.template-wiring.spec.ts` (with its `>= 3` line-count pin at lines 236 to 239) and `app.component.export-guard.spec.ts`.
   The baseline-green guards of the new spec must stay green after every task. Pins owned by a later task (still red) are not counted
   as regressions.
3. **Compile gate, empty allowlist.** Table A is empty and the delta adds no table A spec, so `npx tsc --noEmit` reports **zero**
   diagnostics and `npm run lint` and `npm run build` exit **0** after every one of T14 to T17. This is stricter than the v3 gate for
   T1 to T9, and it is achievable because the new spec is a source-text spec (it imports no module that a task creates, and no
   `AppComponent`), so it can never carry a missing-symbol diagnostic. `npm run test:components` also exits 0 (two files, 32 tests, no file added).
4. **Frozen baseline.** `bash arch-guard.sh` exits 0 and `.arch-guard-checksums` is **byte-unchanged** (`git diff --stat` does not list it);
   no `--rebaseline`, no section 9 stop (nothing here is FROZEN; the section 9 grants recorded for `task-c.ts` covered FR-1 to FR-23 only and are neither used nor extended).
5. **Scope.** `git diff` for the commit lists only the files in the task's Files table (NFR-9 diff property).

The full suite with coverage is proved green only by `QUALITY_GATE`, after T17.

### The new spec is table B, with zero diagnostics

`src/app/app.component.faq-layout.spec.ts` (`test:logic`; matches `src/**/*.spec.ts`, does not match `*.component.spec.ts`, so
`test:components` gains no file) is **table B**. It reads `src/app/app.component.html` and `src/app/app.component.ts` **as text**, in the
idiom of `app.component.template-wiring.spec.ts` and `app.component.export-guard.spec.ts`, and evaluates one template condition against
stubbed `appMode`, `content` and `isGenerating`. It imports **no** symbol that any task of this Story creates (no `faq-form`,
`tab-descriptors`, `faq-gate`, `faq-html`, no `FAQ_*` constant), nothing that exists only after T14 (the key is a string in the source
text, never an import), and not `AppComponent` or any Angular package. It is therefore never in the allowlist, never red by load failure, and carries zero
`tsc` diagnostics at every task and from the TEST_WRITING commit onward. A diagnostic in this file at any time is a defect in the spec, to be fixed before TEST_WRITING ends.
Its red pins fail at runtime by assertion ("expected X, got Y"); none fails by "module not found". The "cannot find module" red state
accepted in v3 for the four brand-new-module specs does **not** extend to this delta.

### v4 test-state classification (so TEST_WRITING and the builder do not misread it)

Not every pin fails before its task lands. A green pin at baseline is a **regression guard** (FR-28 / NFR-9): it exists to fail if a
task goes wrong, not to drive a change. It is not "a test that exercises nothing", and TEST_WRITING must not make it red to look like a test-first pin.

| State on the current tree (before T14) | Pins | Owner of the change that turns it green (or keeps it green) |
|---|---|---|
| **Red first** | FR-24 / AC-21: the extracted empty-state `@if` condition, evaluated for `faq-generator`, is `false` in every grid state (before a run, during a run, after a FAQ-only run, after a no-FAQ run); the condition text contains `appMode() !== 'faq-generator'` | T15 |
| **Red first** | FR-26 / AC-23: the strictly increasing anchor order Store, Product Name, Supplemental `valueChange`, Description `valueChange`, Specs `valueChange`, `toggleSeoThinking()`; the first `<app-source-input` of the FAQ form is the Supplemental one | T16 |
| **Red first** | FR-27 / AC-24, template side: the FAQ Supplemental input has `[label]="uiLabels().supplementalContentRequired"`; `uiLabels().supplementalContent` (exact key) occurs exactly once in the whole template, inside `generatorForm` | T17 |
| **Red first** | FR-27 / AC-24, source side: `en` carries `supplementalContentRequired: 'Supplemental Content (Required)'` (no "Optional"); `uk` carries the key with runtime value `Додатковий контент (Обов'язково)` (apostrophe U+0027; not "Опціонально"; no U+2019 or U+02BC; differs from English); the `en` and `uk` key sets are equal **and contain** the new key | T14 |
| **Green at baseline [baseline-guard]** | FR-24: `noContentYet` and `fillFormStart` each occur once, in one block that also holds the `fa-file-code` icon; the condition holds no `hasOutput`, `hasFaqOutput` or `faqArtifacts` | stays green through T15 |
| **Green at baseline [baseline-guard]** | FR-28 / AC-26 empty state: for `generator`, `ua-generator`, `seo-generator`, `slug-generator`, over a state grid that includes the trap states (stale `faqArtifacts` with empty output fields; `seoData` or `slugData` set; `mainHtmlUa` set; `isGenerating`), the evaluated condition equals an oracle that is a **literal copy of today's condition** (`appMode() !== 'generator' && !mainHtmlUa && !seoData && !slugData && !isGenerating()`) | must stay green at T15 (the task that can break it), T16, T17 |
| **Green at baseline [baseline-guard]** | FR-28 / AC-26 forms and labels: the `generatorForm` Supplemental input is bound to `uiLabels().supplementalContent` (not the new key) and has no `[required]`; the order of the `description.set`, `specs.set`, `supplementalContent.set` targets in `generatorForm` is unchanged; `en.supplementalContent` is still `'Supplemental Content (Optional)'` and `uk.supplementalContent` still `'Додатковий контент (Опціонально)'`; the SEO and Slug form blocks do not bind the new key | must stay green at T14, T16, T17 |
| **Green at baseline [baseline-guard]** | FR-27 parity, whole dictionary: the `en` and `uk` top-level key sets are equal (170 and 170 today, none one-sided). The "contains the new key" half is red-first (above); the equality half is a guard that turns red only if the key is added to one block only | must stay green at T14 (add to both blocks in the same commit) |
| **Green at baseline [baseline-guard]** | FR-25 / AC-22 structure: between the tab bar's closing `</header>` and the first `@for (tab of tabDescriptors()`, once the validation `<details>`, the repair `<details>` and the empty-state block are removed, only the scroll container's opening tag remains; the container's class tokens hold no `flex` token, `grid`, `items-*`, `justify-*`, `h-full` or `min-h-*`; the FAQ result panel root carries no `h-full`, `min-h-*`, `justify-*`, `items-center`, `mt-*`, `pt-*` | stays green through T15, T16, T17 (none may add a wrapper or class) |
| **Existing, unmodified, already green** | `app.component.template-wiring.spec.ts` (including `>= 3` `app-source-input` in the FAQ form at 213 to 217, the single `faqSupplementalContent` input with `[required]="true"` at 333 to 341, the `faqForm()` extraction helper, and the line-count pin at 236 to 239), `app.component.export-guard.spec.ts`, `faq-form.spec.ts`, `content-orchestrator.faq-standalone.spec.ts` (FR-18: `mainHtmlUa === ''` etc.) | must stay green through every task; none is edited |

FR-25's geometric clause (AC-22: the panel's top edge is the container's top padding below the tab bar, not vertically centred) has
**no automated pin and no task**. It is the manual browser check (OD-15 default), recorded by `QUALITY_GATE` (see the open points). It is
not pipeline evidence, and `RECONCILIATION` must treat it as a recorded claim.

### Constraints on TEST_WRITING for the v4 delta

V4-1. **One new file, no edits to existing specs.** The pins live in `src/app/app.component.faq-layout.spec.ts` (name fixed by plan D16).
   `app.component.template-wiring.spec.ts`, `app.component.export-guard.spec.ts` and every other existing spec are not edited, weakened or
   excluded (AGENTS.md section 7.7); this also keeps the brittle `>= 3` line-count pin at template-wiring lines 236 to 239 visibly undisturbed.
V4-2. **Table B, source text, zero diagnostics.** As above. The spec normalises CRLF (`text.split('\r\n').join('\n')`) like the wiring spec,
   uses the same extraction idioms (FAQ form block = from `\n    @else if (appMode() === 'faq-generator')` to the next `\n    @else`; `en` block =
   from `const TRANSLATIONS` to `\n  uk: {`; `uk` block = from `\n  uk: {` to the first `\n};` after it; keys by the four-space regex `^    (\w+):`),
   and **starts each group with premise assertions** (block found, slice non-empty) so a mis-slice fails loudly instead of passing vacuously.
V4-3. **Owner tags in titles.** Every `it` title (or its `describe`) carries its requirement id (FR-24 .. FR-28, NFR-9) **and** the owner
   marker `(owner T14)`, `(owner T15)`, `(owner T16)`, `(owner T17)` for a red-first pin, or `[baseline-guard]` for a baseline-green regression
   guard, so each task's acceptance check can select its own pins with `-t "owner T<n>"` and run the guards with `-t "baseline-guard"`. The `[baseline-guard]` token is a unique token that appears in **no** red-first title, and no guard title contains an `owner T` marker; a pin with a red half and a guard half (the FR-27 key-set parity) is **split into two tests**, so `-t "baseline-guard"` never selects a pin that is still red and `-t "owner T<n>"` never selects a guard.
V4-4. **The condition pin fails closed.** The `@if (...)` guarding the empty-state block is extracted with a balanced-parenthesis scan
   starting at the block that contains `noContentYet`, and evaluated with stubbed `appMode`, `content`, `isGenerating`. If extraction or
   evaluation throws or finds nothing, the test **fails** (it never skips). The FR-28 oracle is a literal copy of today's condition, not a
   re-derivation from the new template.
V4-5. **Apostrophe.** The `uk` pin compares the runtime value after turning the source escape `\'` into `'` and asserts code point U+0027,
   rejecting U+2019 and U+02BC (plan R16).
V4-6. **Report requirement.** The test generation report lists, for this spec, its table (B), the exact `tsc --noEmit` result on the branch
   after TEST_WRITING (**zero** diagnostics), and for every pin its baseline state: red-first with the runtime failure reason ("expected X,
   got Y") and its owner task, or baseline-green guard with the task whose change it protects. Any red-first pin that fails by a load
   error, and any diagnostic in the file, is a defect to fix before the stage ends.
V4-7. **No pin in the existing wiring spec is reused as evidence for a delta requirement** unless the AC matrix names it as existing; the
   FR-25 / AC-22 geometric clause is listed as "manual, QUALITY_GATE", not as covered by a pin.

## Execution order

1. **T1** FAQ variant in `task-c.ts` + re-baseline (prompt, FROZEN) — first, alone
2. **Parallel group A** (mutually independent, disjoint files): **T2** `task-faq.ts` tag list,
   **T3** `faq-html.ts`, **T4** `validateFaqStructuralParity`
3. **T5** `faq-gate.ts` (needs T3, T4)
4. **T6** `runFaqPipeline` + `storeFaq` + `generate()` wiring (needs T1, T3, T4, T5)
5. **T7** `generateUaContent()` wiring (needs T6)
6. **T8** `generateFaqOnly()` (needs T6, T7)
7. **T9** `faq-generator` AppMode, `TOOL_LABEL`, `isFaqFormComplete`, feedback-form entry
   (logically independent of T1 to T8; it is placed here only because T9, T10 and T11 all edit
   `app.component.ts` and must be serial)
8. **T10** extract `deriveTabDescriptors` + new tab cases (needs T9)
9. **T11** component state, `generateFaqOnly()` call, labels (needs T8, T9, T10)
10. **T12** template: mode button, FAQ form, Generate button, extended-view conditions (needs T11)
11. **T13** README (needs T12)

Serial constraints: T6, T7, T8 all edit `content-orchestrator.service.ts`, so they are serial; T8's
acceptance check also runs the whole `faq-pipeline.spec.ts`, including the UA groups T7 owns. T9, T10, T11 all edit `app.component.ts`,
so they are serial. T12 edits only `app.component.html`.

Dependencies: T1<-none; T2<-none; T3<-none; T4<-none; T5<-T3,T4; T6<-T1,T3,T4,T5; T7<-T6; T8<-T6,T7;
T9<-none; T10<-T9; T11<-T8,T9,T10; T12<-T11; T13<-T12.

### v4 execution order (T14 to T17)

T1 to T13 are built (status table); the order above is history. The remaining order is:

12. **T15** exclude `faq-generator` from the empty-state condition (`app.component.html` only). First, because it is the riskiest edit of the delta.
13. **T14** add the label key `supplementalContentRequired` to both `TRANSLATIONS` blocks (`app.component.ts` only). **Independent of T15**
    (disjoint files, no shared pin); it may run before or in parallel with T15. It is listed second only because T15 carries the risk. It must land
    before T17.
14. **T16** move the Supplemental Content input directly after Product Name (`app.component.html`). Logically independent; serial after T15
    only because both edit the same file.
15. **T17** bind the FAQ Supplemental Content label to the new key (`app.component.html`; needs T14 and T16).

Parallelisable group: **T14 and T15** (mutually independent, disjoint files). Serial constraint: T15, T16, T17 all edit
`app.component.html`, so they run in that order, one commit each.

Dependencies (v4): T14<-none; T15<-none; T16<-none (logical; serial after T15 for the shared file); T17<-T14,T16. T1 to T13 are built and
are the baseline for all four.

## Risk-first rationale

T1 is first because the plan's one load-bearing assumption (D4/D8: dropping `MASTER_SYSTEM_PROMPT`
inside `task-c.ts` is enough for FR-12 item 3, so no second section 9 stop is needed) and the one
FROZEN edit with a human-gated stop both live there; discovering that the assumption fails, or that
the permission is not honoured in the builder's session, costs one task now and the whole
orchestrator chain later. It is also the only task that can silently change every description
translation prompt (FR-13), so it must land while the byte-identity golden is the only thing it can
disturb.

### Risk-first rationale (v4 delta)

T15 is first in the delta because it is the only edit that can change another mode's screen. The empty-state block is shared by
`ua-generator`, `seo-generator`, `slug-generator` and `faq-generator`, and `content` is one signal shared by all modes (`setMode()` does not reset
it), so a wrong guard (for example one derived from `hasOutput()` or `faqArtifacts`) would silently hide or show the block in the wrong mode (plan
R13). The condition pin (evaluated against a literal oracle of today's condition, trap states included) proves or breaks that approach
immediately, and it is the pin that fails closed if the condition ever stops being evaluable. T14 is independent and low risk (two string
literals, one parity pin). T16 and T17 are presentational and each is guarded by pins that already exist.

## Open points carried to HUMAN_PLAN_APPROVAL

These are recorded here because the Open Decisions log is not an output of this stage. They add no
requirement and no task; the orchestrator is asked to surface them. This list is the v3 list updated for the v2 delta: the
v4 items come first, then the standing items with wording corrected to what happened. **Nothing here is decided by this breakdown.**

### v4 items (the FAQ Generator layout delta)

- **OD-15 — manual browser check for AC-22's geometric clause (required, not automated).** No task and no automated pin verifies that the
  active FAQ panel's top edge sits one container padding (`p-8`, 32 px) below the tab bar's bottom edge and is not vertically centred; the
  repository has no layout engine (`happy-dom` has none) and no browser-test tool. The plan's default is the structure pin (T15 plus the
  FR-25 guards) plus a **manual** check in DevTools, recorded by `QUALITY_GATE` (who, when, result). `RECONCILIATION` must read it as a
  recorded claim, not pipeline evidence. The human may require a stronger check at this gate.
- **OD-13 — Ukrainian label default.** T14 implements the labelled default `Додатковий контент (Обов'язково)` (ASCII apostrophe U+0027) in the
  `uk` block. The Specification flagged it for human approval; the approval of Specification v3 carried the default. The English text is fixed by
  AC-24. If the human chooses other wording, the change is one literal in T14 and its pin.
- **OD-16 — blank central area after a run that stores no FAQ.** T15 removes the only "nothing was produced" cue for `faq-generator`. No message is added by any task
  (the failure-state message stays with OD-8). Accepted as flagged.
- **OD-11 — pre-run tab strip.** The tab-bar `<header>` (line 1289) is rendered for `faq-generator` unconditionally, so before a run it is an
  empty bordered strip. No task hides it, because that would rewrite line 1289 and disturb the `>= 3` pin and no requirement asks for it.
- **OD-12 — validation and repair panels stay above the result.** FR-25 is asserted for the case with no such panel; in a run that skips a language a panel
  can appear and FR-25 then holds only vacuously. No task reorders the panels.
- **OD-17 — `alertFillFields` wording.** Unchanged; a FAQ-only alert would need a new key and a branch in `generateFaqOnly()`, and is not planned.
- **OD-14 (tab labels) and OD-10 (FAQ Generator only).** Defaults implemented: tab labels and styling are untouched; the Generator, UA Description, SEO and
  Slug screens and the shared `supplementalContent` key are untouched (guarded at T14, T15 and T17).

### Standing items (from v3, wording aligned with what happened)

- **OD-9(e) — export of a FAQ-only run (still open, not decided, not in scope of this revision).** `downloadTextPackage` (`zip-generator.ts`)
  ignores `faqArtifacts`. T11 made `hasOutput()` true for a FAQ-only result, so the TXT control appears for a FAQ-only run and saves a file with only the header;
  the ZIP carries an empty `description_uk-UA.html` (pre-existing behaviour for SEO-only and Slug-only runs). T11 and T12 changed no download code and hid
  nothing. Options for the human: (1) accept as is; (2) hide the TXT control for `faq-generator` (a one-binding template change, which would be a new task);
  (3) make `downloadTextPackage` include the FAQ text (a `zip-generator.ts` edit, a new task and a Specification decision). **No v4 task touches this.**
- **OD-6 seam (still open, not in scope of this revision).** Protected-name block, thinking tier and extra normalisers for FAQ translation: T6 built the single
  `faqTranslationPayload(...)` seam at today's behaviour; the human should answer at the gate. No v4 task touches it.
- **Other open points left open and not in scope here:** OD-8 (skipped-language wording and severity), OD-9 (tab layout, history restore, empty `description_uk-UA.html`
  in a standalone ZIP), OD-18 to OD-20 (carried SP-1 to SP-3 handling). The review loop-backs already closed on the built code (8c89bce, 1ac82e1)
  are not reopened by this revision.
- **`tools/feedback-form/create-form.gs` (T9, built).** The v3 text flagged this file as outside the Story's Surface and the first impact analysis. It was presented
  at the v3 HUMAN_PLAN_APPROVAL (2026-10-14T16:00:08Z, approved with no approver comment) and T9 was then built with that one `'FAQ Generator'` dropdown entry (e8dcf56),
  without a test. The approval note records only OD-6, OD-8, OD-9(e) and SP-1..SP-3 as not decided, so this file is not an open question; it is retained for the record. The v4
  delta does not touch it and needs no new decision on it.
- **Per-task gate convention (interpretation of AGENTS.md section 6, applied during T1 to T9).** Presented at the same v3 gate and applied while building: because tests were
  written for the whole Story before any task ran, `npm run lint` / `npm run build` could not exit 0 until T10 (table A specs carried missing-symbol diagnostics); the gate
  admitted zero diagnostics outside table A specs whose owner had not landed, zero in table B always, and exit 0 from T10. It changed no threshold and skipped no check. Retained
  for the record. For T14 to T17 it is simpler and stricter: no allowlist, lint and build exit 0 after every task (see "v4 per-task gate"); v4 needs no new decision on it.
- **"Cannot find module" red state (departure from `so-test-writer` text).** Presented at the v3 gate and applied: it was accepted for the four brand-new-module specs of FR-1
  to FR-23 (`faq-html`, `faq-gate`, `faq-form`, `tab-descriptors`), listed by name in the test generation report as "red by absent module, by design", with a runtime
  failure reason for every other spec. Those specs are built and green. The v4 delta needs **no** such departure: its one new spec is table B and, where red, fails by
  assertion. Retained for the record; v4 needs no new decision on it.
- **Plan wording to acknowledge (R10).** "Snapshot generated from the pre-extraction function" could not be done mechanically; T10 used hand-derived literals plus a
  move-only diff check. A risk-mitigation wording, not a design decision; the plan file is not edited by this stage.
- **What the rejected gate asked for, and what it did not.** v4 exists because the operator rejected HUMAN_PR_APPROVAL (2026-10-15T10:06:10Z) with exactly two UI
  change requests, re-routed to the Story and the Specification at 10:11:05Z: (1) FAQ Generator central area: remove the empty-state block and put the result directly
  under the version tabs (AC-21, AC-22; T15); (2) FAQ Generator form: Supplemental Content directly under Product Name, labelled "Required" (AC-23 to AC-25; T14, T16, T17).
  Those two requests are the whole scope of T14 to T17 (AC-26 keeps every other mode unchanged). The same note records that the operator had already tried the FAQ Generator
  in a browser and found everything else working; that is the operator's statement, not a recorded AC-22 geometry check, so the OD-15 manual check above is still required.
  **Not in scope of that follow-up** (they stay open points, none is decided by v4): OD-9(e), OD-6, OD-8, OD-9, OD-11, OD-12, OD-14, OD-16 and OD-17 as listed above.

### Not in scope of this revision

No task of v4 addresses OD-9(e), OD-6, OD-8, OD-9, the TXT download, the pre-run tab strip (OD-11), the panel order (OD-12), a failure-state
message (OD-16/OD-8), the `alertFillFields` text (OD-17), the version-tab labels (OD-14), or a stronger-than-manual AC-22 geometry check. They stay open points
with their labelled defaults. If the human decides any of them differently at this gate, that is a new Specification decision and a new task, not an edit to
T14 to T17.

---

## T1 — Add the additive FAQ translation variant to `task-c.ts` and re-baseline the checksums
> **Status (v4): DONE**, commit da59195. Built; text below is the v3 plan, not re-opened.

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | none |
| **FROZEN (AGENTS.md §9)** | `src/prompts/task-c.ts` — this task MUST perform the section 9 stop before editing it (see Notes). `src/prompt-core/master-system-prompt.ts` is NOT authorised: needing it is a new stop. |

### What changes
`buildPromptC` gains an optional `contentKind: 'description' | 'faq'` in its `opts`. When absent
(or `'description'`) the function returns exactly what it returns today. When `'faq'`, an early
branch builds a payload with its own cached `FAQ_TRANSLATION_SYSTEM` block (no `MASTER_SYSTEM_PROMPT`),
a cached per-language FAQ instruction picked by the same store/group/language dispatch as the
description path, and a `userContent` that has no delivery-region, H1 LOCK, spec-table or closing-CTA
text. `.arch-guard-checksums` is re-baselined in the same commit.

### Files
| File | Change |
|---|---|
| `src/prompts/task-c.ts` | modify (FROZEN, authorised): widen `opts` type, one early `return` at the top of `buildPromptC`, new constants and builder functions appended below the existing code. No existing line of the description path changes. |
| `.arch-guard-checksums` | modify: re-baselined via `bash arch-guard.sh --rebaseline`, same commit. Diff must show only the `src/prompts/task-c.ts` line. |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/task-c.faq.spec.ts` | `test:logic` | AC-19, FR-12 items 1 to 3 (element-for-element, per-language rules kept, forbidden-marker scan: `</section>`, `<hr`, `<h2`, `COMMERCIAL CLOSING`, `CTA`, `H1 LOCK`, `Technical specifications`, `What's in the box`, `[Delivery`; no `MASTER_SYSTEM_PROMPT` text), NFR-4 (all `systemBlocks` `cache: true`, stable across calls, dynamic data only in `userContent`), the dispatch per store/language |
| `src/prompts/task-c.description-bytes.spec.ts` (+ golden `test/fixtures/golden/task-c-description-prompts.json`) | `test:logic` | AC-18, FR-13: 16 store x non-master-language pairs, each with and without `opts`, byte-identical to the golden |
| `src/prompts/task-c.spec.ts`, `src/prompts/full-description.golden.spec.ts` (existing, already green) | `test:logic` | FR-13 guard: stay green with no `-u` |

**The one characterization test.** `task-c.description-bytes.spec.ts` and its golden are GREEN when
this task starts, not failing: the golden is captured by TEST_WRITING from the **unmodified**
`task-c.ts` and committed before any `task-c.ts` hunk exists (plan R6). It is type-clean against the
unmodified file (it never passes `contentKind`, see "Constraints on TEST_WRITING" item 2). It counts
as this task's proof: green before the edit, green after it. Only `task-c.faq.spec.ts` starts failing.
It is the only characterization test in this Story that is green from the start.

### Acceptance check
- Before the edit: `bash arch-guard.sh` exits 0 and `npx vitest run src/prompts/task-c.description-bytes.spec.ts` passes (proves the golden was taken from the unmodified file).
- After the edit: `npx vitest run src/prompts/task-c.faq.spec.ts src/prompts/task-c.description-bytes.spec.ts src/prompts/task-c.spec.ts src/prompts/full-description.golden.spec.ts` passes with no golden regenerated and no `-u`.
- `bash arch-guard.sh` exits 0 after `bash arch-guard.sh --rebaseline`; `git diff --stat` for the commit lists `src/prompts/task-c.ts` and `.arch-guard-checksums` together, and the checksum diff is one line.
- `git diff src/prompts/task-c.ts` shows only: the widened `opts` type, the early `return`, and appended code (no removed or modified existing line other than the signature's type).
- Per-task gate, compile rule: allowlist after T1 (see table); `task-c.faq.spec.ts` carries no diagnostic any more.

### Notes
- **Section 9 stop (carried into the task).** Before the first edit the builder stops and states, in `pipeline_status`: the file (`src/prompts/task-c.ts`), the exact change (additive FAQ variant, early branch, FR-14) and why (FR-12/FR-13 cannot be met in any other file, because `buildPromptC` is the dispatch point). AGENTS.md section 9 requires explicit approval "in the current session": the builder therefore needs the operator's explicit instruction "modify `src/prompts/task-c.ts`" **given in the builder's own session**. Story v2 (2026-10-14) records that the operator gave that permission earlier; the builder quotes it as the record of the earlier grant, but it is not itself the instruction. If the instruction is not present in the builder's session, the builder asks for it and waits; it does not edit, and does not infer approval from the Story. The permission is for this one file and does not extend to any other.
- **Second stop, if needed.** If the FAQ variant cannot satisfy FR-12 item 3 without editing `master-system-prompt.ts` (or `constants.ts` to make a shared block reusable, which would change description bytes), that is a NEW section 9 stop: state exactly what and why, and wait. The plan's resolution is to restate any needed rule compactly inside `FAQ_TRANSLATION_SYSTEM`.
- Recognition is the explicit `contentKind` option only; never sniff `<h3>` (plan Rejected 5).
- The FR-12 item 3 audit applies to every reused shared block (`PRODUCT_NAME_LOCALIZATION`, ToV overlays, `UK_SOURCE_ANTICALQUE`, `UNIT_LOCALIZATION_RULES`): a block carrying description-structure text (closing CTA, `[HEADING FORM]`) is replaced by a short FAQ-specific equivalent written in `task-c.ts`.
- Do not add the protected-name block or Spanish URL replacements (OD-6 seam is in T6).
- Per-language FAQ wording covers the same dispatch conditions as the description path: EU English, US Ukrainian, American English/Spanish, EXPERT3D ES and PT, generic.

---

## T2 — Replace `<strong>` with `<b>` in the FAQ generation prompt
> **Status (v4): DONE**, commit 3698434. Built; text below is the v3 plan, not re-opened.

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | none (independent of T3 and T4) |
| **FROZEN (AGENTS.md §9)** | no (`task-faq.ts` is not on the FROZEN list) |

### What changes
The FAQ generation prompt's output contract and its header doc comment list `<p>, <b>, <ul>, <li>`
and no longer list `<strong>`. Nothing else in the prompt changes.

### Files
| File | Change |
|---|---|
| `src/prompts/task-faq.ts` | modify: drop `<strong>` from the permitted-tag list and from the header comment |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/task-faq.spec.ts` (extended) | `test:logic` | AC-6, FR-6: `<b>` is listed, `<strong>` is absent from the built prompt |
| `src/prompts/task-faq.v4.spec.ts` (existing, already green) | `test:logic` | overlay and cache stability unchanged |

### Acceptance check
`npx vitest run src/prompts/task-faq.spec.ts src/prompts/task-faq.v4.spec.ts` passes; `grep -n "strong" src/prompts/task-faq.ts` returns no match for the tag list or header comment; per-task gate compile rule holds (allowlist after T2 is unchanged from T1; `task-faq.spec.ts` is a table B spec and carries no diagnostic).

### Notes
`buildPromptFaq`'s signature is unchanged. This prompt is the uk-UA master prompt, so a change here reaches every language of every store (N-1 translations, 16 pairs): keep the diff to the tag list only.

---

## T3 — Add the `<strong>` to `<b>` conversion and the FAQ shape validator
> **Status (v4): DONE**, commit c7197f0. Built; text below is the v3 plan, not re-opened.

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none (independent of T2 and T4) |
| **FROZEN (AGENTS.md §9)** | no (the check lives in a new sibling because `output-validator.ts` is FROZEN and not touched) |

### What changes
New pure module `faq-html.ts` with `convertStrongToB(html)` (tag-name rename only, case-insensitive,
total, idempotent, attributes untouched, `<b>` untouched) and `validateFaqShape(html, context)` (a
stack-based tokenizer, not `DOMParser`) emitting `faq-not-well-formed`, `faq-element-not-allowed`,
`faq-attribute-present`, `faq-must-start-with-h3` and `faq-markdown-syntax`; empty or whitespace-only
input yields no issues.

**Signatures (fixed so TEST_WRITING can write against them).**
```ts
export const FAQ_ALLOWED_ELEMENTS: ReadonlySet<string>;      // 'h3','p','b','ul','li'
export const FAQ_SHAPE_RULES: readonly string[];             // the five rule ids above
export function convertStrongToB(html: string): string;
export function validateFaqShape(html: string, context: string): ValidationIssue[];
// ValidationIssue from '../utils/output-validator' (type import only).
// Every issue: severity 'error', no `path`, `context` = the argument.
```

### Files
| File | Change |
|---|---|
| `src/utils/faq-html.ts` | create: `convertStrongToB`, `validateFaqShape`, the allowed-element set `h3,p,b,ul,li`, the contract rule-id constants |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/utils/faq-html.spec.ts` | `test:logic` | AC-7 (plain, uppercase, with attribute, nested, already `<b>`, idempotent, total on garbage), AC-8 (bold lead sentence preserved byte for byte), AC-9 (unclosed, mismatched, `<br>`, `<h2>`, `class`, `itemtype`, not starting `<h3>`, empty yields nothing), FR-22 (Markdown rule), FR-23 (`itemtype` rejected) |

### Acceptance check
`npx vitest run src/utils/faq-html.spec.ts` passes; the module has no DOM, clock or random call
(NFR-8) and imports nothing from `output-validator.ts` except the `ValidationIssue` type;
`<p><b>Lead.</b> Rest.</p>` round-trips unchanged; a `<strong class="x">` becomes `<b class="x">` and
is then reported as `faq-attribute-present`; per-task gate compile rule holds (allowlist after T3;
`faq-html.spec.ts` carries no diagnostic).

### Notes
`<br>` is excluded by the element whitelist. The narrow Markdown patterns are `**x**`, line-leading `#{1,6} ` and backtick fences, which do not occur in legitimate FAQ text. Do not use `DOMParser` (it repairs the defects AC-9 must detect and the logic runner has no DOM).

---

## T4 — Add the FAQ-only structural parity comparison
> **Status (v4): DONE**, commit d09f092. Built; text below is the v3 plan, not re-opened.

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none (independent of T2 and T3) |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
`structural-parity.ts` gains `validateFaqStructuralParity(master, translated, context)`, counting
`<h3>`, `<p>`, `<ul>` and `<li>` and emitting `rule: 'structural-parity-count'` in the existing issue
shape. The existing `validateStructuralParity`, `COUNTED_TAGS` and `restoreMediaSrcs` are untouched.

**Signature.**
```ts
export function validateFaqStructuralParity(master: string, translated: string, context: string): ValidationIssue[];
// Same parameter order and issue shape (severity 'error', rule 'structural-parity-count', no `path`)
// as the existing validateStructuralParity.
```

### Files
| File | Change |
|---|---|
| `src/utils/structural-parity.ts` | modify: append `validateFaqStructuralParity` only |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/utils/structural-parity.faq.spec.ts` | `test:logic` | AC-3, AC-19, FR-3: accepts equal counts; rejects a dropped or added `h3`, `p`, `ul`, `li`; rejects an empty translation (counts 0 against the master's) |
| `src/utils/structural-parity.spec.ts`, `structural-parity.v4.spec.ts`, `structural-parity-restore.spec.ts`, `simplified-translation-parity.spec.ts` (existing, already green) | `test:logic` | NFR-7: description parity unchanged |

### Acceptance check
`npx vitest run src/utils/structural-parity.faq.spec.ts src/utils/structural-parity.spec.ts src/utils/structural-parity.v4.spec.ts src/utils/structural-parity-restore.spec.ts src/utils/simplified-translation-parity.spec.ts` passes unmodified; `git diff` shows no changed line in `validateStructuralParity` or `COUNTED_TAGS`; the call at `html-editor.component.ts:413` is untouched; per-task gate compile rule holds (allowlist after T4).

### Notes
Regexes are `<p\b`, `<ul\b`, `<h3\b`, `<li\b` so `<pre` does not count as `<p>`. No `<b>` count and no media check (plan D3). The FAQ is selected by calling this function, never by sniffing HTML.

---

## T5 — Add the FAQ validation composition and the store-or-skip decision
> **Status (v4): DONE**, commit 54ee224. Built; text below is the v3 plan, not re-opened.

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T3, T4 |
| **FROZEN (AGENTS.md §9)** | no (imports the frozen `validateGeneratedHtml`, does not edit it) |

### What changes
New pure module `faq-gate.ts` with `FAQ_MAX_ATTEMPTS = 3`, `buildFaqValidator(opts)` (contract errors:
`faq-provider-error`, the `validateFaqShape` rules, and `structural-parity-count` for translations;
every issue from the frozen `validateGeneratedHtml` and the `non-html-output` check demoted to
`severity: 'warning'`), and `isFaqStorable(finalIssues)` (true when no contract rule is present at
error severity).

**Signatures (fixed so TEST_WRITING can write against them).**
```ts
export const FAQ_MAX_ATTEMPTS = 3;

/** Rule ids that are contract errors: faq-provider-error, the five validateFaqShape ids,
 *  and structural-parity-count. */
export const FAQ_CONTRACT_RULES: ReadonlySet<string>;

export interface FaqValidatorOptions {
  /** Human display string used as `context` on every issue, e.g. 'FAQ (uk-UA)' or 'FAQ (pl-PL)'. */
  context: string;
  /** Passed to the frozen validateGeneratedHtml as its `productName` argument. */
  productName: string;
  /** BCP-47 locale of the artifact being validated; passed as validateGeneratedHtml's `locale`. */
  locale: string;
  /** The stored uk-UA master HTML. PRESENT => the artifact is a translation and
   *  validateFaqStructuralParity(master, html, context) is applied. ABSENT => it is the master. */
  master?: string;
  /** Read at EVERY validate call. When it returns true the only issue returned is one
   *  faq-provider-error (severity 'error', no `path`, so resolveLadder gives ['full-regen']). */
  providerFailed?: () => boolean;
}

/** Returns the `validate` callback for runRepairGate<string>. Pure and deterministic. */
export function buildFaqValidator(opts: FaqValidatorOptions): (html: string) => ValidationIssue[];

/** true when finalIssues has no issue with severity 'error' and rule in FAQ_CONTRACT_RULES.
 *  Frozen-validator findings (demoted to 'warning') never make an artifact unstorable. */
export function isFaqStorable(finalIssues: readonly ValidationIssue[]): boolean;
```
Behaviour pinned by these signatures: with `providerFailed?.() === false`, the result is, in order,
the `validateFaqShape` issues, then (translation only) the `validateFaqStructuralParity` issues, then
the frozen `validateGeneratedHtml(html, opts.context, opts.productName, opts.locale)` issues and the
`non-html-output` check, the last two both with `severity` forced to `'warning'`. An empty or
whitespace-only `html` yields no shape issues (master: terminal empty, not storable-by-content but not
a contract error; translation: the parity rule rejects it).

### Files
| File | Change |
|---|---|
| `src/utils/faq-gate.ts` | create |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/utils/faq-gate.spec.ts` | `test:logic` | FR-9, FR-10, FR-11 (storability), AC-9 (a still-invalid FAQ is not storable), AC-17 (final parity failure stays visible as an issue), `resolveLadder` equals `['full-regen']` for every new rule id (pins that `repair-strategy.ts` stays unchanged), frozen-validator findings are demoted and never block storage, `providerFailed` true yields exactly one `faq-provider-error`, `FAQ_MAX_ATTEMPTS === 3` |
| `src/utils/repair-strategy.spec.ts`, `repair-gate.spec.ts` (existing, already green) | `test:logic` | ladder and gate semantics unchanged |

### Acceptance check
`npx vitest run src/utils/faq-gate.spec.ts src/utils/repair-strategy.spec.ts src/utils/repair-gate.spec.ts` passes; a FR-9-valid text carrying a frozen-validator finding yields no contract error (plan R3); `git diff` shows no change to `src/utils/repair-strategy.ts` or `src/utils/output-validator.ts`; per-task gate compile rule holds (allowlist after T5).

### Notes
`FAQ_MAX_ATTEMPTS` is a fixed constant, independent of the user-tunable `maxRepairs()` signal (plan Rejected 8). The attempt convention is plan D5: one attempt equals one `produce` call, so the gate is run with `maxRepairs = FAQ_MAX_ATTEMPTS - 1`. The impact analysis listed `repair-strategy.ts` as a likely change; the plan verified that a path-less rule already resolves to `['full-regen']`, so no task edits it. `providerFailed` is a callback, not a boolean, because the closure flag is set inside `produce` after the validator is built; the caller (T6) must reset that flag at the start of every `produce` call, otherwise one early throw would taint a later successful attempt.

---

## T6 — Introduce the single-master FAQ pipeline and use it in `generate()`
> **Status (v4): DONE**, commit f3343e1 (plus the test-only correction c62e30a). Built; text below is the v3 plan, not re-opened.

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T1, T3, T4, T5 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
`ContentOrchestratorService` gains a private `runFaqPipeline(input, useThinking)` and the `storeFaq`
choke point, and `generate()` Step 5 calls it in place of the per-language FAQ loop. The pipeline:
returns before any call when Supplemental Content is blank (FR-5); skips with a `console.warn` and no
call when the store does not list `MASTER_LOCALE` (SP-3); generates the uk-UA master through
`runRepairGate` (cap 3, a provider throw counts as one failed attempt); decides store-or-skip after
the gate (empty = terminal no-FAQ, surviving contract error = not stored and no translation);
translates sequentially into `getLangsForStore(store).transLangs` with `contentKind: 'faq'`
(translation labels not starting `FAQ (`), skipping a language that never passes; pushes surviving
`finalIssues` into `validationIssues`; wraps every gate call in try/catch so the method never throws.
`convertStrongToB` runs after `stripCodeFences` and before the number/unit/terminology chain, wraps
`repairBlocks`, and runs again in `storeFaq`.

### Files
| File | Change |
|---|---|
| `src/services/content-orchestrator.service.ts` | modify: add `runFaqPipeline`, `storeFaq`, the single `faqTranslationPayload(...)` seam (OD-6), replace `generate()` Step 5's inline FAQ loop with a call before `runOutputValidation` |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/services/content-orchestrator.faq-pipeline.spec.ts` (Generator-mode groups; table B: imports no new module) | `test:logic` | For each of the 7 stores (N = 2 to 5, including `Drukarka 3D` with one translation), in Generator mode, calls counted by `taskLabel`: AC-1 (exactly one `FAQ (uk-UA)` call), AC-2 (an entry per store language), AC-5 (blank and whitespace-only supplemental: zero FAQ calls, empty `faqArtifacts`), AC-7 (a `<strong>` stub on every call stores zero `<strong>` and costs no extra attempt), AC-8, AC-9, AC-16 (master invalid 3 times: 3 master calls, no translation, empty `faqArtifacts`, description retained; a provider throw is one attempt, does not abort the run, and table finalisation and history still happen; an empty or whitespace-only master response is terminal: exactly one `FAQ (uk-UA)` call, no retry, nothing stored, no translation call, description retained), AC-17 (a translation failing 3 times is skipped and the others kept; a translation whose provider throws is one failed attempt, the language is skipped once its 3 attempts are spent, the other languages are kept and the run does not abort), FR-21 (`1.75mm` stored as `1.75 mm`), FR-23 (terminology normaliser still applied), a stub block repairer that returns `<strong>` never leaves it in storage |
| `src/services/content-orchestrator.simplified.spec.ts` (R6 block rewritten by TEST_WRITING; table B: imports no new module) | `test:logic` | AC-1, AC-2: the Generator-mode part of the rewritten R6 block |
| `src/services/content-orchestrator.doc-gate.spec.ts`, `content-orchestrator.ua-doc-pipeline.spec.ts`, `content-orchestrator.protected-name-*.spec.ts`, `content-orchestrator.image-placeholder.spec.ts`, `seo-currency-wiring.spec.ts` (existing, already green) | `test:logic` | NFR-7: other orchestrator behaviour unchanged |

### Acceptance check
`npx vitest run src/services/content-orchestrator.faq-pipeline.spec.ts src/services/content-orchestrator.simplified.spec.ts` shows the Generator-mode groups passing (UA-mode groups belong to T7; the standalone spec file belongs to T8 and is not run here); every other orchestrator spec still passes; `bash arch-guard.sh` exits 0 (no prompt role string in the service, Rule 3); per-task gate compile rule holds (allowlist after T6 is `faq-standalone`, `faq-form`, `tab-descriptors`; `faq-pipeline.spec.ts` and `simplified.spec.ts` are table B specs and carry no diagnostic at all, before or after this task, because they import nothing that T3, T5 or a later task creates).

### Notes
- This task closes silent-failure risks 1 (partly), 2, 3 and 4 for the Generator path. The two near-identical inline FAQ blocks must be replaced, not wrapped. It is the largest task (one file, cohesive); the builder should expect it to be the long one.
- Master call: `buildPromptFaq` with `humanLang = isoToHumanLang('uk-UA')`, `store.currencySymbol`, the uk-UA native overlay, label `FAQ (uk-UA)`. Translation call: `buildPromptC(master, taskLang, input.website.name, store.group, undefined, { sourceLocale: MASTER_LOCALE, contentKind: 'faq' })`, label `FAQ translation (${iso})`. Prefer the `MASTER_LOCALE` constant over a `'uk-UA'` literal in the new code.
- The gate's `validate` is `buildFaqValidator({ context, productName: input.name, locale, master?, providerFailed: () => threw })` (T5). The closure flag `threw` is reset to `false` at the start of every `produce` call.
- Languages come from `getLangsForStore`/`MASTER_LOCALE`; no literal language list or currency symbol (NFR-5). No retrieval call (NFR-2). `useThinking` is passed as the description loop passes it; no `withProtectedNameBlock`, no `applySpanishExpert3dReplacements` (plan OD-6 default, one place to change).
- Block-scoped repair calls (`Block repair — …`) are not counted as attempts.

---

## T7 — Use the shared FAQ pipeline in `generateUaContent()`
> **Status (v4): DONE**, commit 7f534d7. Built; text below is the v3 plan, not re-opened.

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T6 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
`generateUaContent()` Step 4 (uk-UA-only FAQ with no locale overlay) is replaced by a call to
`runFaqPipeline`, so UA Description produces the FAQ for every store language through the identical
pipeline. The post-FAQ code (validation, table finalisation, history) is unchanged.

### Files
| File | Change |
|---|---|
| `src/services/content-orchestrator.service.ts` | modify: replace `generateUaContent()` Step 4 with the shared call |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/services/content-orchestrator.faq-pipeline.spec.ts` (UA Description groups) | `test:logic` | AC-4 and FR-4 orchestrator side: per store, `faqArtifacts` has an entry for every store language (size N, not 1); FR-5 blank supplemental makes no call; AC-16/AC-17 in UA mode; FR-19 pipeline parity with Generator mode (same call labels); the empty / whitespace-only master terminal case and the translation provider-throw case in UA mode |
| `src/services/content-orchestrator.simplified.spec.ts` (UA part of rewritten R6 block) | `test:logic` | `FAQ (uk-UA)` once for a UA run, plus translations |
| `src/services/content-orchestrator.ua-doc-pipeline.spec.ts` (existing, already green) | `test:logic` | UA pipeline unchanged apart from the FAQ |

### Acceptance check
`npx vitest run src/services/content-orchestrator.faq-pipeline.spec.ts src/services/content-orchestrator.simplified.spec.ts src/services/content-orchestrator.ua-doc-pipeline.spec.ts` passes entirely (Generator and UA groups) for all 7 stores; `grep -n "buildPromptFaq" src/services/content-orchestrator.service.ts` shows it used only inside `runFaqPipeline`; per-task gate compile rule holds (allowlist after T7 is unchanged from T6; both new-behaviour specs it runs are table B and carry no diagnostic).

### Notes
Plan risk R1: leaving this call site untouched shows as `faqArtifacts` of size 1. The UA call site previously passed no native overlay; the shared pipeline now does (FR-19, intended).

---

## T8 — Add the standalone `generateFaqOnly()` orchestrator method
> **Status (v4): DONE**, commit 9f20a15. Built; text below is the v3 plan, not re-opened.

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T6, T7 (T8's acceptance check runs the whole `faq-pipeline.spec.ts`, whose UA groups T7 turns green; both edit the same file) |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
`generateFaqOnly(input, useThinking)` sits beside `generateSeoMetadata` / `generateSlugs`. It returns
at once with no state change and no call when Supplemental Content is blank (the defence-in-depth
guard); otherwise it resets `content` to the AC-13 shape (`mainHtmlUa: ''`, `translations: {}`,
`seoData: null`, `slugData: null`, `website`, `faqArtifacts: {}`, `mainHtmlLocale: 'uk-UA'`), resets
`validationIssues`, `repairReport` and patch tallies, then within `withProgress` runs
`runFaqPipeline`, writes one history entry and sets progress "FAQ Generation Done!". It makes no
description, SEO or slug call and no `runOutputValidation` / `finalizeTablesForDisplay`.

**Signature.** `async generateFaqOnly(input: ProductInput, useThinking: boolean): Promise<void>`,
same parameter style as `generateSeoMetadata` / `generateSlugs`.

### Files
| File | Change |
|---|---|
| `src/services/content-orchestrator.service.ts` | modify: add `generateFaqOnly` |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/services/content-orchestrator.faq-standalone.spec.ts` | `test:logic` | AC-12 (blank Original Description and Tech Specs still generate; filled ones reach the master prompt as context), AC-13 (no `buildPromptA`/`B`/slug call; `mainHtmlUa === ''`, `translations === {}`, `seoData` and `slugData` null; `faqArtifacts` an entry per store language, all 7 stores), AC-14 (same call counts and labels as Generator mode; FR-7/FR-9/FR-10/FR-11 rules apply), AC-15 (exactly one history entry for a completed run), FR-16 failure path (whitespace-only supplemental: zero calls, state unchanged), FR-18 failure path (master fails: `faqArtifacts` stays empty, other fields keep the AC-13 values) |

### Acceptance check
`npx vitest run src/services/content-orchestrator.faq-standalone.spec.ts src/services/content-orchestrator.faq-pipeline.spec.ts` passes entirely; the other orchestrator specs still pass; `git diff` shows `zip-generator.ts` and the description paths untouched; per-task gate compile rule holds (allowlist after T8; `faq-standalone.spec.ts` carries no diagnostic).

### Notes
`generateFaqOnly` always passes `input.description` and `input.specs` through to `buildPromptFaq` as grounding (FR-17). The empty `description_uk-UA.html` entry in a standalone ZIP is pre-existing behaviour for SEO-only and Slug-only runs and stays unchanged (OD-9 default). The TXT download of a FAQ-only run is the open point recorded under OD-9(e); this task changes no download code.

---

## T9 — Register the `faq-generator` mode, its feedback label and the form predicate
> **Status (v4): DONE**, commit e8dcf56. Built; text below is the v3 plan, not re-opened.

| | |
|---|---|
| **Track** | angular (the `create-form.gs` line is a non-track config edit, see Notes) |
| **Depends on** | none (logically independent; executed after T8 only to keep the `app.component.ts` edits T9, T10, T11 serial) |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
`AppMode` gains `'faq-generator'`; `TOOL_LABEL` (a `Record<AppMode, string>`, so it must change in the
same commit to keep `tsc` green) gains `'FAQ Generator'`; the pure predicate
`isFaqFormComplete({website, productName, supplementalContent})` (whitespace-only counts as empty)
is created; the feedback form's tool dropdown gains the same entry.

**Signature.**
```ts
export interface FaqFormValues {
  website: WebsiteOption | null;               // same type as the component's other selectedWebsite signals
  productName: string;
  supplementalContent: string;
}
export function isFaqFormComplete(values: FaqFormValues): boolean;
// true only when a store is selected AND productName.trim() !== '' AND supplementalContent.trim() !== ''.
// Original Description and Tech Specs are not parameters (AC-12).
```

### Files
| File | Change |
|---|---|
| `src/app/types.ts` | modify: `AppMode` + `'faq-generator'` |
| `src/app/app.component.ts` | modify: `TOOL_LABEL` entry only (nothing else in this task) |
| `src/utils/faq-form.ts` | create: `isFaqFormComplete`, `FaqFormValues` |
| `tools/feedback-form/create-form.gs` | modify: add the `'FAQ Generator'` dropdown entry (per the comment on `TOOL_LABEL`) |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/utils/faq-form.spec.ts` | `test:logic` | AC-11, FR-16: any of Product Name, Store, Supplemental Content empty is incomplete; whitespace-only is empty; all three filled is complete; Original Description and Tech Specs are not required (AC-12) |
| `src/app/app.component.template-wiring.spec.ts` (extended; `TOOL_LABEL` pin group) | `test:logic` | AC-10, FR-15: label `FAQ Generator` present in `TOOL_LABEL` and `AppMode` (source-text pin) |

### Acceptance check
`npx vitest run src/utils/faq-form.spec.ts src/app/app.component.template-wiring.spec.ts` shows the predicate and `TOOL_LABEL` groups passing (the template groups belong to T12; the spec is table B and carries no diagnostic); the per-task gate compile rule holds (allowlist after T9: `tab-descriptors.spec.ts` only) and, because it admits zero diagnostics in non-spec files, it proves the `Record<AppMode, string>` exhaustiveness: no `AppMode` consumer was missed.

### Notes
- **Scope growth to confirm at plan approval.** `tools/feedback-form/create-form.gs` is an Apps Script the operator deploys separately. It is not in the Story's Surface and not in the impact analysis. It is justified only by the comment on `TOOL_LABEL` ("Keep in sync with the dropdown options in tools/feedback-form/create-form.gs") and is one dropdown string. It has no test; it is reviewed by reading. If the human declines it at HUMAN_PLAN_APPROVAL, drop that one Files row; no test depends on it.
- If lint reveals another exhaustive consumer of `AppMode`, fix it here, not in a later task.

---

## T10 — Extract `deriveTabDescriptors` and add the UA-Description and FAQ-only tab cases
> **Status (v4): DONE**, commit 3e9db41. Built; text below is the v3 plan, not re-opened.

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T9 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
The body of the `tabDescriptors` computed (`app.component.ts:583-629`) moves into a pure
`deriveTabDescriptors(ctx)`; the computed becomes a thin call that gathers `ctx`. Two behaviours are
added: `ua-generator` returns one description tab plus one FAQ tab for every language that has a
`faqArtifacts` entry (uk-UA first), and `faq-generator` returns FAQ tabs only (no `html` tab, no SEO
tab; uk-UA first). `_autoSelectTab` does not add the `'seo'` id for `faq-generator`. Existing tab ids
are reused: `faq-html` for uk-UA, `faq-trans-${iso}` for the others.

**Signatures (fixed so TEST_WRITING can write against them).**
```ts
// src/app/tab-descriptors.ts
import type { AppMode, TabDescriptor } from './types';

export interface TabDescriptorLabels {
  /** uiLabels().uaGenerator — label of the single uk-UA description tab in ua-generator mode. */
  uaGenerator: string;
  /** uiLabels().translation — suffix of a translation tab: `${taskKey} ${translation}`. */
  translation: string;
  /** baseOutputLabel() — label of the master `html` tab in Generator mode. */
  baseOutput: string;
  /** baseFaqTabLabel() — label of the master FAQ tab (`faq-html`) in Generator and faq-generator modes. */
  baseFaqTab: string;
}

export interface TabDescriptorContext {
  appMode: AppMode;
  /** Already resolved by the caller as `content().website?.name ?? selectedWebsite()?.name ?? ''`.
   *  Empty string => deriveTabDescriptors returns [] for every mode (as the computed does today). */
  storeName: string;
  /** content().mainHtmlLocale. Undefined => the historical "first en-* language" master. */
  mainHtmlLocale: string | undefined;
  /** content().translations; ONLY key presence is read (key = Task C language key, e.g. 'UA'). */
  translations: Readonly<Record<string, string>>;
  /** content().faqArtifacts; ONLY key presence is read (key = BCP-47 ISO). */
  faqArtifacts: Readonly<Record<string, string>> | undefined;
  labels: TabDescriptorLabels;
}

export function deriveTabDescriptors(ctx: TabDescriptorContext): TabDescriptor[];
```
Rules (the module resolves the store itself with `getStore(ctx.storeName)` and the task key with
`bcp47ToTaskCLang(iso, store.group)`, both from `../prompt-core/constants`, exactly as the computed
does; STORE_REGISTRY stays the only source of languages):

- Every mode other than `ua-generator` and `faq-generator`: the existing algorithm, unchanged
  (master tab, optional `faq-html`, translation tab only when `translations[taskKey]` exists, optional
  `faq-trans-${iso}` tab when `faqArtifacts[iso]` exists).
- `ua-generator`: `{ id:'html', label: labels.uaGenerator, ... iso:'uk-UA', isFaq:false }`, then FAQ
  tabs: uk-UA as `{ id:'faq-html', label:'FAQ' (as today), iso:'uk-UA', isFaq:true }`, then for each
  other store language with a `faqArtifacts` entry, in `store.languages` order,
  `{ id:`faq-trans-${iso}`, label:`${taskKey} FAQ`, type:'faq-translation', color:'green', iso, taskKey, isFaq:true }`.
- `faq-generator`: FAQ tabs only, uk-UA first (`faq-html`, label `labels.baseFaqTab`), then the others
  as in `ua-generator`; no `html` tab and no `trans-*` tab even when `translations` is non-empty.
- A language with no `faqArtifacts` entry yields no tab for it (FR-4 failure path).

### Files
| File | Change |
|---|---|
| `src/app/tab-descriptors.ts` | create: `deriveTabDescriptors`, `TabDescriptorContext`, `TabDescriptorLabels` |
| `src/app/app.component.ts` | modify: `tabDescriptors` delegates; `_autoSelectTab` skips `'seo'` for `faq-generator` |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/app/tab-descriptors.spec.ts` | `test:logic` | AC-4 UI side (a FAQ tab per language, uk-UA first, all 7 stores), AC-13 UI side / plan R9 (`mainHtmlUa: ''`, `translations: {}`, populated `faqArtifacts` renders FAQ tabs and no `html`/SEO tab), plan R10 (Generator-mode expected tab arrays for all 7 stores, written as literals, equal the output for the pre-extraction algorithm) |

### Acceptance check
- `npx vitest run src/app/tab-descriptors.spec.ts` passes.
- **Move-only check, run by the builder before and after the edit.** `git diff -w --color-moved=zebra src/app/app.component.ts` (or `git show HEAD:src/app/app.component.ts` against the new `tab-descriptors.ts`) shows the body of the non-`ua-generator` branch relocated with only `this.x()` to `ctx.x` substitutions and no change to loop order, ids, labels, colors or the `continue` condition. This is the mechanical evidence for plan R10, because the pre-extraction function cannot be executed (see Notes).
- The Generator-mode expectations are not regenerated or edited to make a diff pass; a missing FAQ entry for a language yields no tab for it.
- Per-task gate compile rule holds with an **empty allowlist**: `npm run lint` and `npm run build` exit 0.

### Notes
**No characterization test is green from the start here (v1 claim withdrawn).** The pre-extraction
logic is a `computed` inside `AppComponent` (`src/app/app.component.ts:583-629`) reading
`this.content()`, `this.selectedWebsite()`, `this.uiLabels()`, `this.baseOutputLabel()` and
`this.baseFaqTabLabel()`. `AppComponent` is a decorated, `templateUrl`-bound component with heavy DI
and, by a standing decision, has no spec, so it cannot be instantiated in the logic runner and nothing
can be mechanically "captured" from it. The Generator-mode expectations in `tab-descriptors.spec.ts`
are therefore **hand-derived literals** that TEST_WRITING writes by reading `app.component.ts:583-629`
at the commit before T10, from `STORE_REGISTRY` language order and `bcp47ToTaskCLang`, with sentinel
label strings in `TabDescriptorLabels` so label wiring is visible. The spec imports
`deriveTabDescriptors`, so the whole file is **red by load failure** (absent module) until this task
creates it; the test generation report records it as "red by absent module, by design" (see
"Constraints on TEST_WRITING" item 4). Plan R10's phrase "a snapshot generated from the pre-extraction
function" is superseded by this paragraph plus the move-only check above. Behaviour for every mode
other than `ua-generator` and `faq-generator` must be identical. `_autoSelectTab` change:
`if (mode !== 'slug-generator' && mode !== 'faq-generator') ids.add('seo')`.

---

## T11 — Add the FAQ Generator component state and its `generateFaqOnly()` call
> **Status (v4): DONE**, commit 88670be. Built; text below is the v3 plan, not re-opened.

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T8, T9, T10 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
`AppComponent` gains the signals `faqSelectedWebsite`, `faqProductName`, `faqDescription`,
`faqSpecs`, `faqSupplementalContent`; `isFaqFormValid` (computed from `isFaqFormComplete`); a
`generateFaqOnly()` that re-checks `isFaqFormValid()` and returns without any call otherwise, builds
the `ProductInput` (description and specs as optional grounding) and calls the orchestrator with the
shared Extended Thinking value (`seoUseThinking`); an `activeProductName` branch; a `clearAll()`
branch that clears the FAQ signals and `faqArtifacts`; `hasFaqOutput`, included in `hasOutput` so
existing download controls appear; and the `TRANSLATIONS` en and uk entries (mode label
`FAQ Generator` in both languages, form title, button label).

### Files
| File | Change |
|---|---|
| `src/app/app.component.ts` | modify: signals, `isFaqFormValid`, `generateFaqOnly`, `activeProductName`, `clearAll`, `hasFaqOutput`/`hasOutput`, `TRANSLATIONS` |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/app/app.component.template-wiring.spec.ts` (extended; component source-text pin groups) | `test:logic` | AC-10 (label in both UI languages; the shared toggle binding `seoUseThinking` / `toggleSeoThinking()`), AC-11/FR-16 failure path (`generateFaqOnly` returns on `!isFaqFormValid()` before any orchestrator call), AC-12 (description and specs reach `ProductInput`), plan D9 (`activeProductName`, `clearAll`, `hasOutput` branches) |
| `src/app/app.component.export-guard.spec.ts` (existing, already green) | `test:logic` | `downloadZip` / `downloadText` bodies unchanged in shape |

### Acceptance check
`npx vitest run src/app/app.component.template-wiring.spec.ts src/app/app.component.export-guard.spec.ts` shows the component-source groups passing and the export guard still green (the HTML groups belong to T12); the compile gate has an empty allowlist: `npm run lint` and `npm run build` exit 0; `git diff` does not touch `downloadZip` / `downloadText`.

### Notes
Do not add an `AppComponent` spec (prior deliberate decision; it would also add a third file to `test:components`). The Extended Thinking toggle is the existing `seoUseThinking` signal shared by SEO and Slug (AC-10 "the same toggle"). `restoreHistory` is unchanged (OD-9 default). No download code changes (OD-9(e) is open).

---

## T12 — Add the FAQ Generator mode button, form and Generate button to the template
> **Status (v4): DONE**, commit c04096a. Built; text below is the v3 plan, not re-opened.

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T11 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
`app.component.html` gains: a mode button in the vacant cell of the UA row of the `grid-cols-2`
switcher; an `@else if (appMode()==='faq-generator')` form modelled on the SEO and Slug forms
(`app-source-input` for Description, Tech Specs and Supplemental Content, Store and Product Name
inputs, the shared Extended Thinking toggle, **no** `content-template-select`); a Generate button in
the button chain bound to `isGenerating() || !isFaqFormValid()`; `'faq-generator'` added to the three
generator/ua/seo/slug conditions (about lines 930, 1174, 1183) and the header `@if`; and the SEO tab
button hidden for the FAQ mode.

### Files
| File | Change |
|---|---|
| `src/app/app.component.html` | modify |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/app/app.component.template-wiring.spec.ts` (extended; template groups) | `test:logic` | AC-10 (the `FAQ Generator` mode button and toggle binding in the template), AC-11 (Generate `[disabled]` binding on `isGenerating() \|\| !isFaqFormValid()`), AC-12 (Original Description and Tech Specs inputs present and not part of the validity binding), `content-template-select` still used exactly twice, the SEO tab hidden for `faq-generator`, the FAQ mode present in the three extended-view conditions |

### Acceptance check
`npx vitest run src/app/app.component.template-wiring.spec.ts` passes entirely; `npm run build` exits 0 (template type-check) and `npm run lint` exits 0; `grep -c "content-template-select" src/app/app.component.html` equals the pre-change count.

### Notes
The FAQ tab panels already render from `faqArtifacts[tab.iso]` through `parseFaqItems` and `safeHtml`; no panel markup is added. A rendered-in-browser check of the new mode is a manual QUALITY_GATE concern, not an acceptance check here. Do not hide the TXT download control for `faq-generator` unless OD-9(e) is answered that way (then it is a one-binding change in this task). The UI criteria AC-10 to AC-12 are verified here by source-text pins, the repository's established idiom; RECONCILIATION should read those pins critically.

---

## T13 — Document the single-master FAQ and the FAQ Generator in the README
> **Status (v4): DONE**, commit 7a0613e. Built; text below is the v3 plan, not re-opened.

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T12 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
`README.md` is updated at the places the Story names: the "FAQ / HowTo artifacts" bullet, "How
generation works" step 5, Usage step 3, and the "Tools & modes" section (one master FAQ translated
into the store languages, `<b>` not `<strong>`, the new FAQ Generator mode).

### Files
| File | Change |
|---|---|
| `README.md` | modify |

### Tests to turn green
no test — this task changes no behaviour, because it edits documentation only.

### Acceptance check
`grep -n "FAQ Generator" README.md` returns a match in "Tools & modes"; the "FAQ / HowTo artifacts" bullet and "How generation works" step 5 no longer describe a per-language FAQ; Usage step 3 mentions the new mode; `npm run lint` and `npm run build` still exit 0.

### Notes
Describe only what is implemented (one uk-UA master, sequential translation, retry limit of 3, skip on failure). Do not document OD-6/OD-8 choices as decided.

---

## T14 — Add the FAQ-only label key `supplementalContentRequired` to both `TRANSLATIONS` blocks

> **Status (v4): planned** (new in v4, design delta D15).

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none (T1 to T13 are built). Independent of T15 (disjoint files); must land before T17. |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
The `en` and `uk` blocks of the `TRANSLATIONS` literal each gain one key, `supplementalContentRequired`, placed immediately after the existing
`supplementalContent` line of that block, so that the T17 template binding reads a key that exists in both UI languages (contract before consumer). The
existing `supplementalContent` key is **not** changed: it is read by the Generator and UA Description form too (FR-28). No logic, signal, computed,
predicate or type changes.

| Block | Line to add (source text) |
|---|---|
| `en` (after the `supplementalContent` line, about line 147) | `supplementalContentRequired: 'Supplemental Content (Required)',` |
| `uk` (after the `supplementalContent` line, about line 320) | `supplementalContentRequired: 'Додатковий контент (Обов\'язково)',` |

### Files
| File | Change |
|---|---|
| `src/app/app.component.ts` | modify: two lines, one in each `TRANSLATIONS` block, nothing else |

### Tests to turn green
Written by `TEST_WRITING` before this task starts; they exist and are red.

| Test file | Runner | Covers |
|---|---|---|
| `src/app/app.component.faq-layout.spec.ts` (new; pins tagged `(owner T14)`) | `test:logic` | FR-27 / AC-24, source side: `en` carries the key with `'Supplemental Content (Required)'`, no "Optional"; `uk` carries the key, runtime value `Додатковий контент (Обов'язково)` with apostrophe U+0027, not "Опціонально", no U+2019 / U+02BC, different from the English value; the `en` and `uk` key sets are equal and both contain the new key (red first on the "contains the new key" half) |
| same file (pins tagged `[baseline-guard]`, green at baseline) | `test:logic` | FR-28 / AC-26: `en.supplementalContent` is still `'Supplemental Content (Optional)'` and `uk.supplementalContent` still `'Додатковий контент (Опціонально)'`; the key-set equality (170 and 170 today) stays green because the key is added to both blocks in this one commit |

### Acceptance check
- `npx vitest run src/app/app.component.faq-layout.spec.ts -t "owner T14"` passes; `-t "baseline-guard"` still passes (the pins owned by T15 to T17 are not run here and may still be red).
- `npx vitest run src/app/app.component.template-wiring.spec.ts src/app/app.component.export-guard.spec.ts` passes unmodified.
- `git diff` lists only `src/app/app.component.ts` and adds exactly two lines; the shared `supplementalContent` lines are unchanged.
- Compile gate with the empty allowlist: `npx tsc --noEmit` reports zero diagnostics (an unescaped apostrophe in the `uk` literal is a syntax error and fails here), `npm run lint` and `npm run build` exit 0; `bash arch-guard.sh` exits 0 with `.arch-guard-checksums` unchanged.

### Notes
- The apostrophe in `Обов'язково` is ASCII U+0027 (verified in the Specification bytes, plan D15). In the single-quoted `uk` block it is written `\'`, as the existing `обов\'язкові` already is. Do not use U+2019 or U+02BC.
- The `*` of the required marker is not part of the string; it comes from `[required]="true"`.
- The Ukrainian text is the OD-13 labelled default; do not resolve OD-13 here.
- Whether `ng build` would fail on a one-sided key is unverified (`tsconfig.json` sets no `strict` / `strictTemplates`); the whole-dictionary parity pin, not the build, is what catches it.

---

## T15 — Exclude `faq-generator` from the empty-state condition

> **Status (v4): planned** (new in v4, design delta D12 and D13).

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none (T1 to T13 are built). First task of the delta because it is the riskiest; independent of T14 (disjoint files). |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
In the result view, the single `@if` that guards the "no content yet" block (`noContentYet` / `fillFormStart`, `fa-file-code` icon) gains exactly one conjunct,
`appMode() !== 'faq-generator' &&`, directly after `appMode() !== 'generator' &&` and before `!content().mainHtmlUa`. For every other mode the new
expression is logically identical to today's, so SEO Generator, Slug Generator and UA Description render the block exactly when they do now (FR-28, by construction).
For `faq-generator` the conjunct is false in every state, so the block is absent before a run, during a run and after a run, including a run that stores no FAQ (FR-24).
This one edit also satisfies FR-25's structural clauses (plan D13): in the no-panel case the FAQ result panel becomes the first content below the tab bar.
No component logic, data field or other template line changes.

```
before: @if (appMode() !== 'generator' && !content().mainHtmlUa && !content().seoData && !content().slugData && !isGenerating())
after:  @if (appMode() !== 'generator' && appMode() !== 'faq-generator' && !content().mainHtmlUa && !content().seoData && !content().slugData && !isGenerating())
```

### Files
| File | Change |
|---|---|
| `src/app/app.component.html` | modify: the condition at line 1447 only. Lines 279, 1032, 1280, 1289 and 1316 are **not** touched. |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/app/app.component.faq-layout.spec.ts` (new; pins tagged `(owner T15)`, red first) | `test:logic` | FR-24 / AC-21: the extracted `@if` condition evaluated with `appMode = 'faq-generator'` is `false` for every grid state (empty content and not generating; generating; after a FAQ-only run with `mainHtmlUa ''`, `translations {}`, `seoData null`, `slugData null`, `faqArtifacts` populated; after a no-FAQ run with everything empty); the condition text contains `appMode() !== 'faq-generator'` |
| same file (pins tagged `[baseline-guard]`, green at baseline, **must stay green**) | `test:logic` | FR-28 / AC-26: the same condition for `generator`, `ua-generator`, `seo-generator`, `slug-generator` equals the literal oracle of today's condition over the state grid incl. trap states (stale `faqArtifacts` with empty output fields; `seoData` / `slugData` / `mainHtmlUa` set; `isGenerating`); `noContentYet` and `fillFormStart` occur once each in one block with the `fa-file-code` icon; the condition holds no `hasOutput`, `hasFaqOutput` or `faqArtifacts`. FR-25 / AC-22 structure guards (nothing between the tab bar and the result except the validation panel, the repair panel and, until now, the empty-state block; no centring or height class on the container or on the FAQ panel root) |
| `src/app/app.component.template-wiring.spec.ts`, `app.component.export-guard.spec.ts`, `src/services/content-orchestrator.faq-standalone.spec.ts` (existing, already green) | `test:logic` | the `>= 3` line-count pin at 236 to 239 is undisturbed because lines 1032, 1280, 1289 and 1316 are untouched; FR-18 data fields (`mainHtmlUa ''` etc.) unchanged |

### Acceptance check
- `npx vitest run src/app/app.component.faq-layout.spec.ts -t "owner T15"` passes; `-t "baseline-guard"` passes (the FR-28 oracle comparison is the proof that no other mode changed).
- `npx vitest run src/app/app.component.template-wiring.spec.ts src/app/app.component.export-guard.spec.ts src/services/content-orchestrator.faq-standalone.spec.ts` passes unmodified.
- `git diff -U0 src/app/app.component.html` shows **one** changed line (1447) and the hunk adds only `appMode() !== 'faq-generator' && `; `git diff` lists no other file.
- Compile gate, empty allowlist: `npx tsc --noEmit` zero diagnostics; `npm run lint` and `npm run build` exit 0 (template type-check); `npm run test:components` exits 0; `bash arch-guard.sh` exits 0, `.arch-guard-checksums` unchanged.
- Manual (not this task's acceptance, recorded at QUALITY_GATE): the AC-22 geometric check in a browser (open point OD-15).

### Notes
- Do **not** derive the exclusion from `hasOutput()`, `hasFaqOutput()` or `faqArtifacts`, make the FAQ-only result non-empty, add a wrapper `@if`, hide it with CSS, add an `isFaqOnlyMode` computed, or reformat / wrap / extract any of lines 1032, 1280, 1289, 1316 (plan Rejected 13 to 15, risks R13 and R17). The condition must stay a single expression of `appMode()`, `content()` and `isGenerating()` so the spec can evaluate it.
- `content` is one shared signal across modes and `setMode()` does not reset it; that is why the guard is by mode and not by data.
- The tab-bar `<header>` (line 1289) stays rendered for `faq-generator` (OD-11); the validation and repair panels stay above the result (OD-12).
- Keep the file's existing line endings.

---

## T16 — Move the Supplemental Content input directly after Product Name in the FAQ form

> **Status (v4): planned** (new in v4, design delta D14).

| | |
|---|---|
| **Track** | angular |
| **Depends on** | none logically; serial after T15 only because both edit `app.component.html`. |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
In the FAQ Generator form block (`@else if (appMode() === 'faq-generator')`), the Supplemental Content `<app-source-input>` is cut from after Tech Specs
(lines 625 to 633) and pasted between the Product Name `<div class="space-y-2">` (ends line 604) and the Original Description input. The resulting DOM
order is Target Website select, Product Name input, Supplemental Content, Original Description, Tech Specs, then the Deep Thinking toggle (FR-26; DOM order is the keyboard
tab order). The moved element is byte-identical: same attributes, **including `[required]="true"`**, `[value]="faqSupplementalContent()"`,
`(valueChange)="faqSupplementalContent.set($event)"`, the same 8-space indent, and the **same `[label]` binding** (it is relabelled by T17, not here).

### Files
| File | Change |
|---|---|
| `src/app/app.component.html` | modify: move one `app-source-input` element inside the FAQ form block; no attribute changes |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/app/app.component.faq-layout.spec.ts` (new; pins tagged `(owner T16)`, red first) | `test:logic` | FR-26 / AC-23: in the FAQ form block the character indices of these anchors are strictly increasing: the Store `<select ... (change)="onFaqWebsiteChange($event)"`, the Product Name `<input ... (input)="updateFaqProductName($event)"`, `(valueChange)="faqSupplementalContent.set($event)"`, `(valueChange)="faqDescription.set($event)"`, `(valueChange)="faqSpecs.set($event)"`, `toggleSeoThinking()`; the first `<app-source-input` of the block is the Supplemental one and the block still has exactly three |
| same file (`[baseline-guard]` pins) | `test:logic` | FR-28 and FR-25 guards stay green: the `generatorForm` Supplemental input and its order of `description.set`, `specs.set`, `supplementalContent.set` are untouched; no wrapper or class is added around the FAQ panel or the container |
| `src/app/app.component.template-wiring.spec.ts` (existing, already green; **must stay green unmodified**) | `test:logic` | `>= 3` `app-source-input` in the FAQ form (213 to 217); exactly one input with `(valueChange)="faqSupplementalContent.set($event)"` containing `[value]="faqSupplementalContent()"` and `[required]="true"` (333 to 341); the `faqForm()` extraction helper (start `\n    @else if (appMode() === 'faq-generator')`, end at the next 4-space `\n    @else`); the `>= 3` line-count pin (236 to 239) |

### Acceptance check
- `npx vitest run src/app/app.component.faq-layout.spec.ts -t "owner T16"` passes; `-t "baseline-guard"` passes.
- `npx vitest run src/app/app.component.template-wiring.spec.ts src/app/app.component.export-guard.spec.ts` passes unmodified (the existing FAQ-form pins prove `[required]="true"`, the single `faqSupplementalContent` input and the extraction helper are intact).
- `git diff -w --color-moved=zebra src/app/app.component.html` shows the nine-line element **relocated unchanged** (a pure move: no added or removed attribute), and `git diff` lists no other file.
- Compile gate, empty allowlist: `npx tsc --noEmit` zero diagnostics; `npm run lint` and `npm run build` exit 0; `npm run test:components` exits 0; `bash arch-guard.sh` exits 0, `.arch-guard-checksums` unchanged.

### Notes
- Five independent signals back the five inputs, so order is a template-only matter: no signal, predicate (`isFaqFormComplete`) or handler changes; `README.md` needs no change (it names no field order).
- The move keeps the 8-space indent and adds no 4-space `@else` line, so the existing `faqForm()` helper does not truncate the block (plan R20). Do not re-indent.
- Do not relabel here; T17 owns the `[label]` binding. Splitting the move from the relabel keeps each commit to one requirement (FR-26, then FR-27).

---

## T17 — Bind the FAQ Supplemental Content label to the new key

> **Status (v4): planned** (new in v4, design delta D15).

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T14 (the key must exist in both `TRANSLATIONS` blocks first), T16 (same element; avoids editing a moving target in `app.component.html`) |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
The `[label]` binding of the FAQ form's Supplemental Content `<app-source-input>` changes from `uiLabels().supplementalContent` to
`uiLabels().supplementalContentRequired`, so the English label reads "Supplemental Content (Required) *" (the `*` comes from `[required]="true"`, unchanged). The
`generatorForm` template (used by Generator and UA Description) keeps `uiLabels().supplementalContent` and its "(Optional)" text (FR-28). `placeholderSupplemental`
stays shared. `source-input.component.*` is not edited.

### Files
| File | Change |
|---|---|
| `src/app/app.component.html` | modify: the one `[label]` binding of the FAQ form's Supplemental input (line 626 before T16; about line 606 after it). Line 279 is **not** touched. |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/app/app.component.faq-layout.spec.ts` (new; pins tagged `(owner T17)`, red first) | `test:logic` | FR-27 / AC-24, template side: in the FAQ form block the Supplemental `app-source-input` has `[label]="uiLabels().supplementalContentRequired"` and still has `[required]="true"`; `uiLabels().supplementalContent` (the exact key, not the `...Required` one) occurs exactly once in the whole template, inside `generatorForm` |
| same file (`[baseline-guard]` pins) | `test:logic` | FR-28 / AC-26: the `generatorForm` input is still bound to `uiLabels().supplementalContent` and has no `[required]`; the SEO and Slug form blocks do not bind the new key |
| `src/app/app.component.template-wiring.spec.ts` (existing, already green; **must stay green unmodified**) | `test:logic` | the single required `faqSupplementalContent` input (333 to 341) and AC-25 enablement pins (`isFaqFormValid`, Generate `[disabled]`) |
| `src/utils/faq-form.spec.ts` (existing, already green) | `test:logic` | AC-25 / FR-16: `isFaqFormComplete` is untouched; the delta changes no predicate |

### Acceptance check
- `npx vitest run src/app/app.component.faq-layout.spec.ts` passes **entirely** (T14, T15, T16, T17 pins and all guards): this is the first point at which every pin of the new spec is green.
- `npx vitest run src/app/app.component.template-wiring.spec.ts src/app/app.component.export-guard.spec.ts src/utils/faq-form.spec.ts` passes unmodified.
- `git diff -U0` shows **one** changed line in `app.component.html` (the `[label]` binding); `git diff` lists no other file.
- Compile gate, empty allowlist: `npx tsc --noEmit` zero diagnostics; `npm run lint` and `npm run build` exit 0 (the template type-check reads the new key); `npm run test:components` exits 0; `bash arch-guard.sh` exits 0, `.arch-guard-checksums` unchanged.
- Whole-delta diff property (NFR-9 b), checked once here against the four delta commits (the spec file itself is added by TEST_WRITING, before T14, and is not a task output): `git diff --stat <commit before T14>..HEAD` lists only `src/app/app.component.html`, `src/app/app.component.ts` and the new spec (plus docs); no FROZEN file, no `.arch-guard-checksums`, no golden or fixture.

### Notes
- Relabelling the shared key instead would change three forms at once (FR-28) and no existing test would notice; the guards exist for that reason (plan R14).
- A label literal or a ternary on the shared binding is rejected (plan Rejected 16 and 17).

---

## Coverage table

### Plan item to tasks

| Plan item | Task(s) |
|---|---|
| D1 domain model: no change | none by design (no `src/domain/**` edit; corpus untouched) |
| D2 FAQ chain (prompt, normaliser, validator, store) | T2, T1, T3, T5, T6 |
| D3 FAQ structural parity | T4 |
| D4 FROZEN `task-c.ts` FAQ variant | T1 |
| D5 single-master pipeline, attempts, provider error, safety net, OD-6 seam | T6 (T7, T8 call sites) |
| D6 validation composition, store-or-skip | T5, T6 |
| D7 `convertStrongToB`, `validateFaqShape` | T3 (placement in T6) |
| D8 `PromptPayload` unchanged, caching, `master-system-prompt.ts` not edited | T1 (no edit elsewhere) |
| D9 Angular surface: `types.ts`, `TOOL_LABEL` | T9 |
| D9 `isFaqFormComplete` | T9 |
| D9 `deriveTabDescriptors`, `_autoSelectTab` | T10 |
| D9 signals, `generateFaqOnly()`, `activeProductName`, `clearAll`, `hasOutput`, `TRANSLATIONS` | T11 |
| D9 template | T12 |
| D9 `create-form.gs` | T9 (scope growth to confirm) |
| D9 `README.md` | T13 |
| D10 server: none | none by design |
| D11 `generateFaqOnly` and history | T8 |
| File `src/prompts/task-faq.ts` | T2 |
| File `src/prompts/task-c.ts` + `.arch-guard-checksums` | T1 |
| File `src/utils/structural-parity.ts` | T4 |
| File `src/services/content-orchestrator.service.ts` | T6, T7, T8 |
| Files `faq-html.ts`, `faq-gate.ts`, `faq-form.ts`, `tab-descriptors.ts` | T3, T5, T9, T10 |
| Not changed: `repair-strategy.ts`, `output-validator.ts`, `zip-generator.ts`, `html-editor.component.ts` | no task edits them; T5 pins `repair-strategy` behaviour, T4 pins editor-path parity |
| Risks R1 to R12 | R1 T6/T7; R2 T5/T6; R3 T5; R4 T6; R5 T1; R6 T1; R7 T4/T6 (parity + retries); R8 T6; R9 T10; R10 T10 (hand-derived literals + move-only diff, supersedes the "snapshot" wording); R11 T1; R12 T6 |

### `FR-n` / AC to tasks

| Requirement | AC | Task(s) |
|---|---|---|
| FR-1 | AC-1, AC-14 | T6, T8 |
| FR-2 | AC-2 | T6 |
| FR-3 | AC-3, AC-19 | T4, T5, T6 |
| FR-4 | AC-4 | T7, T10 |
| FR-5 | AC-5 | T6, T7, T8 |
| FR-6 | AC-6 | T2 |
| FR-7 | AC-7 | T3, T6 |
| FR-8 | AC-8 | T3, T6 |
| FR-9 | AC-9 | T3, T5, T6 |
| FR-10 | AC-16 | T5, T6 |
| FR-11 | AC-17 | T5, T6 |
| FR-12 | AC-19 | T1 |
| FR-13 | AC-18 | T1 |
| FR-14 | AC-20 | T1 |
| FR-15 | AC-10 | T9, T11, T12 |
| FR-16 | AC-11 | T9, T11, T12, T8 (guard) |
| FR-17 | AC-12 | T8, T11, T12 |
| FR-18 | AC-13 | T8, T10 |
| FR-19 | AC-14 | T6, T8 |
| FR-20 | AC-15 | T8 |
| FR-21 | (section 4) | T6 (normaliser chain kept), T1 (prompt rules) |
| FR-22 | (section 4) | T3 |
| FR-23 | (section 4) | T3 (attributes), T6 (terminology normaliser), T1 (prompt rules) |
| NFR-1, NFR-5 | | T6 (no provider branch, `getLangsForStore`) |
| NFR-2 | | T6 (no retrieval call; reviewed by reading) |
| NFR-3, NFR-4 | | T1, T2 |
| NFR-6 | | none needed (no `server/**`, no key path); T6 uses the existing LLM path |
| NFR-7 | | T4, T6, T10 (unchanged-behaviour specs named in each task) |
| NFR-8 | | T3, T4, T5 |

Every task maps to at least one plan item and one requirement: T1 (D4; FR-12/13/14), T2 (D2; FR-6),
T3 (D7; FR-7/8/9/22), T4 (D3; FR-3), T5 (D6; FR-9/10/11), T6 (D5; FR-1/2/5/7/10/11/19/21/23),
T7 (D5; FR-4), T8 (D11; FR-17/18/19/20), T9 (D9; FR-15/16), T10 (D9; FR-4/18), T11 (D9; FR-15/16/17),
T12 (D9; FR-15/16/17), T13 (D9; Story README scope).

## Coverage table (v4 additions for implementation plan v2 and Specification v3)

### Plan v2 item to tasks

| Plan v2 item | Task(s) |
|---|---|
| D12 FR-24 and the empty-state half of FR-28: one conjunct at the single condition (`app.component.html` line 1447) | T15 |
| D13 FR-25: no reorder, no wrapper; satisfied structurally by D12; panels stay (OD-12), strip stays (OD-11), blank area accepted (OD-16) | T15 (the only edit); T16 and T17 must not add a wrapper or class (FR-25 guards) |
| D14 FR-26: Supplemental Content input moved directly after Product Name | T16 |
| D15 FR-27 and the label half of FR-28: new FAQ-only key in both `TRANSLATIONS` blocks; the template binding | T14 (key, both blocks), T17 (binding) |
| D16 verification: one new source-text spec `src/app/app.component.faq-layout.spec.ts`, `test:logic`, existing tests unmodified | written by TEST_WRITING (no task creates it); turned green by T14, T15, T16, T17 per the classification table; AC-22 geometric clause = manual check, no task |
| v2 Files: `app.component.html` (line 1447; FAQ form move; `[label]`) | T15, T16, T17 |
| v2 Files: `app.component.ts` (`TRANSLATIONS`, both blocks) | T14 |
| v2 Files: the new spec | TEST_WRITING (not a task output) |
| v2 Not changed: `types.ts`, `tab-descriptors.ts`, `faq-form.ts`, `source-input.component.*`, `src/services/**`, `src/prompts/**`, `src/prompt-core/**`, `src/domain/**`, `src/render/**`, `server/**`, `README.md`, `tools/**`, `.arch-guard-checksums`, fixtures, goldens, every existing spec | no task edits them; each v4 task's acceptance check lists only its own file(s) in `git diff` and an unchanged `.arch-guard-checksums` |
| v2 FROZEN / STORE_REGISTRY / prompt / server position: no stop needed | none by design; no v4 task is FROZEN |
| v2 Risks R13 to R20 | R13 T15 (oracle with trap states); R14 T17 (shared-key guards); R15 T14 (parity pin); R16 T14 (U+0027 pin, lint); R17 T15, T16, T17 (lines 1032/1280/1289/1316 untouched, `git diff -U0`); R18 manual check (open point); R19 accepted defaults (open points); R20 T16 (8-space indent kept, existing helper pins) |
| v2 Rejected alternatives 13 to 24 | no task; T15 and T17 notes carry the prohibitions |

### `FR-n` / AC to tasks (v4 additions)

| Requirement | AC | Task(s) |
|---|---|---|
| FR-24 | AC-21 | T15 |
| FR-25 | AC-22 | T15 (structural clauses; T16 and T17 keep the guards green); geometric clause: manual check at QUALITY_GATE, no task |
| FR-26 | AC-23 | T16 |
| FR-27 | AC-24, AC-25 | T14 (source side, both languages), T17 (template side); AC-25 enablement is FR-16 and is untouched, held by the existing `faq-form.spec.ts` and wiring pins (T17 re-runs them) |
| FR-28 | AC-26 | T15 (empty state), T14 and T17 (labels); guards re-run at every v4 task; T16 holds the `generatorForm` guards |
| NFR-9 | | T14 to T17: pins need no LLM; diff property (only the two app files and the new spec; no FROZEN file; checksums unchanged) checked in T17's acceptance check and by IMPLEMENTATION_VERIFICATION; geometric clause manual |
| FR-1 to FR-23, NFR-1 to NFR-8 | | Unchanged; T1 to T13 stand (DONE) |

### Full AC-1 to AC-26 to tasks

| AC | Task(s) | AC | Task(s) |
|---|---|---|---|
| AC-1 | T6, T8 | AC-14 | T6, T8 |
| AC-2 | T6 | AC-15 | T8 |
| AC-3 | T4, T5, T6 | AC-16 | T5, T6 |
| AC-4 | T7, T10 | AC-17 | T5, T6 |
| AC-5 | T6, T7, T8 | AC-18 | T1 |
| AC-6 | T2 | AC-19 | T1, T4, T5, T6 |
| AC-7 | T3, T6 | AC-20 | T1 |
| AC-8 | T3, T6 | AC-21 | T15 |
| AC-9 | T3, T5, T6 | AC-22 | T15 (structure); manual geometric check at QUALITY_GATE |
| AC-10 | T9, T11, T12 | AC-23 | T16 |
| AC-11 | T8, T9, T11, T12 | AC-24 | T14, T17 |
| AC-12 | T8, T11, T12 | AC-25 | existing (FR-16 predicate, T9 / T11 / T12), re-run by T16 and T17; the required marker is kept by T16 and T17 |
| AC-13 | T8, T10 | AC-26 | T14, T15, T17 (guards re-run at T16) |

Every v4 task maps to at least one plan v2 item and one requirement: T14 (D15; FR-27, FR-28), T15 (D12, D13; FR-24, FR-25, FR-28),
T16 (D14; FR-26), T17 (D15; FR-27, FR-28). Every plan v2 decision D12 to D16 and every FR-24 to FR-28 / NFR-9 is reachable through at
least one task, except the AC-22 geometric clause, which is a recorded manual check by design (OD-15), not an unplanned gap.

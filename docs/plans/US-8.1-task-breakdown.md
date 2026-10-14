---
artifact: task_breakdown
story: US-8.1
version: 3
status: APPROVED
owner: so-implementation-planner
created_at: 2026-10-14T20:00:00Z
updated_at: 2026-10-15T00:00:00Z
supersedes: docs/plans/US-8.1-task-breakdown.md#2
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 2
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 1
  - key: plan_review
    version: 2
open_decisions_blocking: false
---

# Task breakdown: US-8.1 (one master FAQ, translated; `<b>` not `<strong>`; standalone FAQ Generator)

13 tasks. Exactly one task (T1) edits a FROZEN file (`src/prompts/task-c.ts`, under the operator's
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

## Risk-first rationale

T1 is first because the plan's one load-bearing assumption (D4/D8: dropping `MASTER_SYSTEM_PROMPT`
inside `task-c.ts` is enough for FR-12 item 3, so no second section 9 stop is needed) and the one
FROZEN edit with a human-gated stop both live there; discovering that the assumption fails, or that
the permission is not honoured in the builder's session, costs one task now and the whole
orchestrator chain later. It is also the only task that can silently change every description
translation prompt (FR-13), so it must land while the byte-identity golden is the only thing it can
disturb.

## Open points carried to HUMAN_PLAN_APPROVAL

These are recorded here because the Open Decisions log is not an output of this stage. They add no
requirement and no task; the orchestrator is asked to surface them for the OD-9 / OD-6 entries.

- **OD-9(e) — export of a FAQ-only run (open, not decided).** `downloadTextPackage`
  (`zip-generator.ts:84-113`) ignores `faqArtifacts`. T11 makes `hasOutput()` true for a FAQ-only
  result, so the TXT download control would appear and save a file containing only the header; the
  ZIP carries an empty `description_uk-UA.html` (pre-existing behaviour for SEO-only and Slug-only
  runs, plan OD-9 default). Options for the human: (1) accept the TXT as is; (2) hide the TXT control
  for `faq-generator` (a one-binding change in T12 if chosen); (3) make `downloadTextPackage` include
  the FAQ text (a `zip-generator.ts` edit, which would need a new task and a Specification decision).
  Until answered, T11 and T12 change no download code and hide nothing.
- **OD-6 seam** (protected-name block, thinking tier, extra normalisers for FAQ translation): wired
  behind the single `faqTranslationPayload(...)` seam in T6 at today's behaviour; the human should
  answer at the gate.
- **`tools/feedback-form/create-form.gs`** (T9) is outside the Story's Surface and the impact
  analysis; confirm at approval or drop that one line from T9.
- **Per-task gate convention (interpretation of AGENTS.md section 6).** Because tests exist for the
  whole Story before any task runs, `npm run lint` / `npm run build` cannot exit 0 until T10 (table A
  specs carry missing-symbol diagnostics). v3 therefore defines a per-task gate: zero diagnostics
  outside the table A specs whose owner has not landed, zero in table B specs always, exit 0 from
  T10, the full gate at QUALITY_GATE after T13. It is an interpretation of AGENTS.md section 6 item 1
  and `so-builder` definition-of-done item 3 for a tests-first branch; it changes no threshold and
  skips no check. The human is asked to confirm it.
- **Departure from `so-test-writer` text ("cannot find module is a broken test, not a red one").**
  Constraint 4 accepts "module not found" as the red state for the four brand-new-module specs
  (`faq-html`, `faq-gate`, `faq-form`, `tab-descriptors`), with the test generation report listing
  them by name ("red by absent module, by design") and a runtime failure reason required for every
  other spec. This matches the US-5.1 / US-7.1 precedent but departs from the skill's literal
  wording; the human is asked to confirm it, or to direct TEST_WRITING to add empty module stubs
  instead (which would add source files this breakdown does not list).
- **Plan wording to acknowledge.** Plan risk R10 says the Generator tab snapshot is "generated from
  the pre-extraction function". That cannot be done mechanically (`AppComponent` is not
  instantiable in the logic runner). T10 supersedes it with hand-derived expected literals plus a
  move-only diff check. This is a risk-mitigation wording, not a design decision; the plan file is
  not edited by this stage.

---

## T1 — Add the additive FAQ translation variant to `task-c.ts` and re-baseline the checksums

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

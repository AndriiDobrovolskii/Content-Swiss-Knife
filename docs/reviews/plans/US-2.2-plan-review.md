---
artifact: plan_review
story: US-2.2
version: 2
status: APPROVED
owner: so-plan-reviewer
created_at: 2026-09-21T18:00:00Z
updated_at: 2026-09-21T19:45:00Z
supersedes: docs/reviews/plans/US-2.2-plan-review.md@v1
inputs_consumed:
  - key: specification
    version: 1
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
open_decisions_blocking: false
---

# Plan Review: US-2.2 — Simplified v4 content-template schemas and Content Template dropdown (v2)

**Verdict:** PASS
**Loop-back:** none

> `PASS` here is **not** human approval. Only `/so:approve` records that (AGENTS.md §10).

## Summary

Re-review after the loop-back on v1 (CHANGES_REQUIRED: B1 label seam, B2 FR-8 failure path). Both blockers were re-verified against the plan, the task breakdown and the source tree, not against the revision notes. Both are resolved. No new blocking defect was introduced by the revision. All seven axes are clear.

## Blocker re-verification

**B1 (FR-2 label seam) — resolved.**
- Source check: `TRANSLATIONS` is a non-exported const at `src/app/app.component.ts:30`, exposed via `uiLabels = computed(() => TRANSLATIONS[this.uiLanguage()])` (L414), with `consumablesTemplateName` at L179 (en) and L349 (uk). The v1 finding was accurate.
- Fix: D7 and T14 extract only the template labels into a pure Angular-free module `src/app/content-template-labels.ts` (`TEMPLATE_LABELS: { en: Record<TemplateLabelKey,string>; uk: ... }`), spread into both `TRANSLATIONS` entries. Both entries are object literals keyed en/uk, so the spread is feasible and `uiLabels()` keeps its shape.
- Test: `src/app/content-template-labels.spec.ts` does not match the vitest exclude `**/*.component.spec.ts` and matches `include: src/**/*.spec.ts` (`vitest.config.ts` L42/L47), so it runs under `test:logic`. It asserts non-empty strings, equal EN/UK key sets and the pinned FR-2 strings. The `Record<TemplateLabelKey,string>` annotation makes a missing key a build error, which gives the FR-2 failure path. The component spec is `*.component.spec.ts` under `test:components`.
- Task/plan agreement: D7, the files list, the validation table ("Label completeness"), T14 (files, tests, coverage row) and the traceability row all agree. The old `ui-labels.spec.ts` is dropped consistently.

**B2 (FR-8 failure path) — resolved.**
- Enforcement points are now named on both paths, `error` severity so the standard repair/retry fires, simplified templates only:
  - Doc path: rule `simplified-specs-shape` in `validateTemplateCompleteness` (T5), `specs.categories.length !== 1` (including empty) errors at `specs.categories`. Wired into the Doc gate `validate` closure in T12. The plan correctly argues that `<tbody>`, `<h3>` and title rows cannot exist in the Doc model, so single-category is the Doc-level equivalent.
  - HTML path and final pass: new `src/utils/simplified-specs-shape.ts` (T6a) errors on more than one `<tbody>`, any `<h3>`, more than one parsed category, or a title row; reuses the existing `parseSpecCategories` (`spec-category-merge.ts:32`, verified). Composed with the range check in `validateSimplifiedTemplateHtml` (T6), and called from the frozen `output-validator.ts` through one call (T10). `validateGeneratedHtml` is what the orchestrator uses for legacy, base, translated-locale and final passes (calls at L737, 909, 1002, 1119, 1354, 1428 receive `templateId`), so translated locales are covered too. The shape check is locale-independent (T6 states this).
  - `flatSpecs` with several categories is now defined (D4, T4): total, lossless, never throws, concatenates rows into one `<tbody>`, no `<h3>` or title row, defensive only.
  - The T7 collapse-check skip remains and its interaction is stated (exactly-one is enforced by T5/T6a/T6, not by `spec-category-shape`).
- Tests: the Doc rule, three HTML violation fixtures (two `<tbody>`, `<h3>`, title row), the valid flat table, Full multi-category untouched, and the orchestrator repair-loop case are all in T4, T5, T6a, T6, T10 and T12. Runner is `test:logic` everywhere.
- Ordering: T6a before T6 before T10; T5/T6/T4 before T12. Contract before consumer holds. T6 has no frozen-file edit (sibling file), T10 keeps the single frozen call.

## 1. Specification coverage (re-derived, both directions)

FR to task, re-derived from each task's What/Tests fields:

| FR | Tasks | Verdict |
|---|---|---|
| FR-1 | T14 | covered |
| FR-2 | T14 (labels module + spec) | covered (B1 closed) |
| FR-3, FR-4, FR-5 | T1, T5, T8, T9, T12 | covered |
| FR-6 | T1 goldens, T8, T9, T13 | covered |
| FR-7 | T9, T11, T12 | covered |
| FR-8 | T4, T5, T6a, T6, T7, T8, T10, T12 | covered, positive and failure path (B2 closed) |
| FR-9 | T2, T8, T14 | covered |
| FR-10, FR-11 | T5, T7, T8 | covered |
| FR-12 | T8, T9 (existing rules) | covered |
| FR-13 | T1, T8, T10, T13 | covered |
| FR-14, FR-16 | T6, T10, T12 | covered |
| FR-15 | T1, T8 | covered |
| FR-17, FR-18 | T3, T4 | covered |
| FR-19 | T8, T9, T12, T15 | covered |
| FR-20 | T11, T13, T16 | covered |
| FR-21..FR-25 | T3, T6a, T7, T10, T15 | covered as constraints |
| NFR-1..NFR-7 | T8, T9, T6, T12, T10, T17 | covered |

AC-1..AC-16 all reachable through their FRs per the spec matrix.

Task to plan item: T1..T17 and T6a each map to D1..D14 (including D4b). No orphan task. No scope creep against the Specification's *Out of scope* section by name: no FAQ §9 schema change, no extra templates or detector, no migration of published descriptions, no Customize-panel change beyond keeping it working, no non-master length enforcement, no `meta-description-currency` arming, no retrieval/provider/usage change (T16 is a comment only, covered by FR-20). The optional extraction of shared render helpers and the new `simplified-specs-shape.ts` serve FR-8/FR-20 and are inside scope.

## 2. FROZEN files (AGENTS.md §9)

| Task | Frozen file | §9 stop | Sibling pattern | Verdict |
|---|---|---|---|---|
| T9 | `task-a.ts`, `task-c.ts` | yes, per file, citing OD-9 | yes (`simplified-template-blocks.ts`) | ok |
| T10 | `output-validator.ts` | yes | yes (`simplified-word-ranges.ts` composing `simplified-specs-shape.ts`) | ok |
| T17 | checksums of the three | yes, git-diff check | n/a | ok |
| all others | none; `task-b.ts` and `master-system-prompt.ts` explicitly untouched | n/a | n/a | ok |

The revision did not add any frozen-file edit: the HTML shape check was routed through the existing single T10 call. The plan does not assume approval it lacks; OD-9 is cited and the stop is retained per file.

## 3. Architecture rules (AGENTS.md §3)

Rule 1 clear (no provider code). **Rule 2 checked deliberately:** clear; the new validators are pure post-generation checks, the registry has no imports, no search or fetch in any task. Rule 3 clear (all prompt text in `src/prompts/simplified-template-blocks.ts` and `src/prompt-core`). Rule 4 clear (static ids and labels only; the labels module is pure). Rule 5 protected by goldens (T1) and corpus reconciliation (T3). `STORE_REGISTRY` remains the only source of locales and currency (master-locale constant reused; `DOC_PIPELINE_STORES` unchanged). `systemBlocks` are not collapsed into `userContent` (block [1] replaced on the Doc path; legacy overlay in user turn; per-run data uncached).

## 4. prompt → schema → renderer → validator

All four links touched, kept in agreement through one registry and the D11 table plus the T15 four-template consistency test, which now also asserts the flat §7 shape rule. Ordering: T1, T2, T3 then T4/T5/T6a/T7, T6, T8, T9, T10, T11, T12, T13, T14. Contract before consumer holds, including the new T6a to T6 to T10 chain. The AGENTS.md §4 criteria list is complete for what changes.

## 5. Task quality

All tasks have the eight fields with observable acceptance checks. Each can end in one green commit (§13); T3 is deliberately wide and justified. Merge unit A (T3 + T5 + T12, in practice T11 as well) is declared, so the interim window is acknowledged. No task spans two tracks. Riskiest first (registry and goldens). Fixtures sit with their change. T14 now depends on T9, resolving the interim `CONTENT_TEMPLATES` hazard.

## 6. Test strategy

Every task names files and runner; T2, T16 and T17 justify no test. Component spec is `*.component.spec.ts` under `test:components`; the labels spec is `test:logic`. Failure paths from the FRs (FR-2 missing key, FR-8 multi-category) now have runnable tests. Nothing weakens, skips or excludes an existing test; deletions are authorised by OD-14 and the rest are rewritten.

## 7. Impact-analysis fidelity

Plan consumed the survey and resolved its unknowns (1, 2, 3, 6). New files (`content-template-labels.ts`, `simplified-specs-shape.ts`, the select component) are creations, not unsurveyed edits. `app.component.ts` was already surveyed. No loop-back to IMPACT_ANALYSIS needed.

## Non-blocking findings

- N1. T14 checks that the labels spread compiles against `TRANSLATIONS`' inferred type; a builder should keep `consumablesTemplateName` removal and the spread in the same commit so `uiLabels()` consumers in `app.component.html` do not break.
- N2. T6's `validateSimplifiedTemplateHtml` shape detector relies on the pre-flat renderer's title-row shape being pinned by fixture; the test note already requires this. Keep that fixture generated from the renderer, not hand-written.
- N3. Carried from v1 and unchanged: R6 (FAQ artifact step still runs for simplified templates) must be surfaced to the human at HUMAN_PLAN_APPROVAL as a possible new Open Decision; R4/R5/R7 remain accepted trade-offs consistent with spec silence.
- N4. Merge unit A should be enforced at PR level: the PR must contain T3, T5, T11 and T12 together.

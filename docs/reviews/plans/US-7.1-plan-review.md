---
artifact: plan_review
story: US-7.1
version: 1
status: ARCHIVED
owner: so-plan-reviewer
created_at: 2026-10-09T18:30:00Z
updated_at: 2026-10-09T18:30:00Z
supersedes: null
inputs_consumed:
  - key: specification
    version: 4
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 1
  - key: task_breakdown
    version: 1
open_decisions_blocking: false
---

# Plan Review: US-7.1 — Keep the operator's product name intact

**Verdict:** PASS
**Loop-back:** n/a

> `PASS` here is **not** human approval. Only `/so:approve` records that (AGENTS.md §10).

## Summary

The plan and task breakdown are buildable as written. The baseline T1-T14 reaches every FR and AC without editing any FROZEN file. T15 (the only FROZEN edit, `task-c.ts`, F-1) is correctly conditional and isolated. No blocking defect was found. Several residuals (below) can be accepted at the plan gate or tidied at TEST_WRITING.

## 1. Specification coverage (re-derived, both directions)

| FR | Reached by task(s) | Verdict |
|---|---|---|
| FR-1 | T2 | covered |
| FR-2 | T6, T8, T10, T12 (+T15) | covered |
| FR-3 | T5, T9, T12, T14 | covered |
| FR-4 | T4, T13 | covered |
| FR-5 | T1, T3, T13, T14 | covered |
| FR-6 | T10, T12, T14 (+T15) | covered |
| FR-7 | T3, T11, T14 | covered (Optimizer wiring point loosely specified, see non-blocking 3) |
| FR-8 | T7, T13 | covered |
| FR-9 | T9 | covered |
| FR-10 | T5, T14 | covered |
| FR-11 | T2, T12 | covered (see non-blocking 2) |
| FR-12..14 | T14 regression set | covered (regression guards) |
| NFR-1..7 | T6/T8/T12, none (no provider/retrieval/UI touched), T2/T12, T1-T3, prompt-text assertions | covered |

AC re-derivation: AC-1 T5/T9/T14; AC-2 T4/T13; AC-3 T3/T10/T14; AC-4 T12 (+T13/T14 recommended); AC-5 T3/T11/T14; AC-6 T1/T14; AC-7 T2/T3; AC-8 T3/T13; AC-9 T9. All AC-1..AC-9 are reachable.

| Task | Traces to | Verdict |
|---|---|---|
| T1-T3 | D2 → FR-1, FR-5 | ok |
| T4 | D2/D7 → FR-4 | ok |
| T5 | D2/D7 → FR-10 | ok |
| T6 | D2/D5 → FR-2, NFR-1 | ok |
| T7 | D7 → FR-8 | ok |
| T8-T11 | D6 → FR-2, FR-3, FR-6, FR-7, FR-9 | ok |
| T12-T14 | D7 → FR-2..FR-8, FR-10 | ok |
| T15 | D4 F-1 → FR-2, FR-6 | ok, optional hardening |

Scope creep checked against the Specification Out-of-scope list by name: no renaming of input/registry/providers; no other prompt behaviour change; `invariantCore` untouched; no Product Name input for Translator/Optimizer; no positive "name must appear" clause; `meta-description-currency` stays disarmed; no unapproved FROZEN edit; generic-name behaviour unchanged. Clear. Plan rejected-alternative 6 (no repair loop for Slugs/HTML) honours FR-3/FR-6.

## 2. FROZEN files (AGENTS.md §9)

| Task | Frozen file touched | §9 stop present? | Sibling-file pattern used? | Verdict |
|---|---|---|---|---|
| T1-T14 | none (verified: T8 edits `src/prompt-core/constants.ts`, which is not in the §9 list; `master-system-prompt.ts` only interpolates the constant at line 87, so its bytes and checksum are unchanged; Task B is fed `localizedNames` rather than edited) | n/a | yes (new siblings; `task-a-doc.ts` for the Doc path) | ok |
| T15 | `src/prompts/task-c.ts` | yes (stop + approval recorded before edit, re-baseline in the same commit) | n/a (optional) | ok |

T15 isolation: T15 depends only on T8; no other task depends on T15; the plan states the baseline is complete without it (R1 accepted). Skipping T15 changes no other task. Only the "(T15)" parentheticals in the coverage tables and the conditional TEST_WRITING assertion are affected.

Plan assumes approval it does not have: no (F-1 explicitly "does NOT assume it is granted").

## 3. Architecture rules (AGENTS.md §3)

| Rule | Checked | Finding |
|---|---|---|
| 1 — no direct SDK outside `server/providers/` | yes | clear; no provider/SDK code |
| **2 — retrieval separate from generation** | yes, deliberately | clear; all new modules are pure and model-free; no search or fetch added, and none mixed into generation |
| 3 — prompt text out of services | yes | clear; prompt text lives in `src/prompt-core/protected-name-block.ts`, `constants.ts` and `src/prompts/*`; the orchestrator only wraps payloads |
| 4 — no key in the bundle | yes | clear; nothing added |
| 5 — no existing feature broken | yes | regression set in T14 plus goldens reviewed; clear |
| `STORE_REGISTRY` sole source of locales/currency | yes | clear; brand set derived from `STORE_REGISTRY` at call time; `SPEC_LISTED_BRANDS` is brands, not locales |
| `systemBlocks` not collapsed into `userContent` | yes | clear; the per-product block is appended to `userContent` only and T6/T12 assert `systemBlocks` deep-equal |

## 4. prompt → schema → renderer → validator

- Links touched: prompt (constant, Slugs, Doc, Translator, Optimizer, dynamic block) and validator (new sibling checks). Schema and renderer unchanged (D1, D3).
- Stay in agreement: yes; `localizedName` stays a string, no field added or ignored.
- Contract-before-consumer ordering holds: yes (T1 → T2 → T3 → consumers T7/T13/T14; T6/T8 before T12).
- §4 criteria list complete: yes (meta lengths/CTA/no currency, unit spacing, spec-count parity, figures/video, anglicisms).

## 5. Task quality

| Check | Result |
|---|---|
| All eight fields present on every task | Present (track, depends, FROZEN flag, what changes, files, tests, acceptance check, notes) |
| Acceptance checks observable | yes |
| Each task could end in one green commit (§13) | yes; T14 is the largest (see non-blocking 5) |
| No task spans two tracks | yes |
| Ordered by dependency and risk, riskiest first, rationale stated | yes (classifier/tokenisation first, OD-11/OD-13 bounded to one module each) |
| Fixture updates sit with the change that moves them | yes (goldens in T8-T11; T15 for Task C) |

## 6. Test strategy

| Check | Result |
|---|---|
| Every task names test files **and** runner | yes, all `test:logic`; the unnamed orchestrator specs (T8 constant assertions, T12, T13, T14) are acceptable as "named by TEST_WRITING" and sit beside `content-orchestrator.repair-field-wiring.spec.ts`; the existing specs the tasks extend all exist (`repair-strategy.spec.ts`, `task-slug.spec.ts`, `task-a-doc.spec.ts`, `task-translate.spec.ts`, `optimizer.spec.ts`, `full-description.golden.spec.ts`, `spec-count-parity.spec.ts`) |
| Component specs named `*.component.spec.ts` | n/a, no component work |
| Untested tasks justify changing no behaviour | n/a, every task has tests |
| Failure paths from the FRs are covered | yes (still-shortened, 429, malformed JSON in T13; generic/empty name returns `[]`; 54-code-point boundary; over-100 slug) |
| Nothing relies on weakening/skipping a test (§7.7) | yes; AC-9 rewrites assertions the Specification itself invalidates (see non-blocking 4) |

## 7. Impact-analysis fidelity

- Plan consumed the survey rather than re-deriving it: yes.
- Files touched but not surveyed: none found.

## Verdict rationale

All seven axes are clear with no blocking defect: no baseline task edits a FROZEN file, coverage is complete in both directions, ordering respects contract-before-consumer, and T15 is cleanly separable. The residuals are refinements for the task owner or TEST_WRITING, not grounds for a loop-back.

## Non-blocking findings

1. Arch-guard baseline drift (affects T15 only). The project notes that the frozen-file checksums for `task-a.ts` and `task-c.ts` may lag legitimate commits. If F-1 is approved, `bash arch-guard.sh --rebaseline` would also bless any prior drift. Before running it, check `git diff` on those files. A human can note this at the gate.
2. AC-4 / FR-11 per-store iteration is stated in T12 and plan D10, but T13 and T14 (the SEO and Slugs/description behaviour) do not repeat it. TEST_WRITING should iterate `STORE_REGISTRY` there too.
3. FR-7 Optimizer: `optimize()` has no `runOutputValidation` hook; T14 says only "where a product name is supplied". The plan's claim that the `PRODUCT_NAME_LOCALIZATION` constant reaches the Optimizer by interpolation is not accurate (`optimizer.ts` does not import it). Behaviour is still delivered by T11's own sentence and the T6 block, which is self-contained. TEST_WRITING and the builder should pin the report-only surfacing point for the Optimizer.
4. Ownership of AC-9 spec edits. T9 lists legacy spec edits in an implementation task, but builders do not modify tests. These rewrites should be done in TEST_WRITING (red against the old prompt) and T9 should only change the prompt and regenerate the golden. Not a weakening, since the Specification mandates the change.
5. Sizing. T14 bundles three behaviours in one file (report-only validation, Optimizer check, protected slug trim). It is still one reviewable commit, but may be split by the implementer if the gate shows strain. T12 to T14 are serial on one file by design.
6. Open defaults OD-11, OD-12 and OD-13 are still OPEN in the spec; plan R7 bounds the reversal cost to one module each. A human decision at the plan gate on F-1 (approve or skip T15) is the only item that changes the task list.

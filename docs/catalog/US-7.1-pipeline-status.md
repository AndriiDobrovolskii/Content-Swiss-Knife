---
artifact: pipeline_status
story: US-7.1
version: 1
status: DRAFT
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-10-09T20:00:00Z
updated_at: 2026-10-09T20:00:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 4
  - key: implementation_plan
    version: 1
  - key: task_breakdown
    version: 1
  - key: plan_review
    version: 1
  - key: test_strategy
    version: 1
  - key: ac_test_matrix
    version: 1
---

# Pipeline status: US-7.1

| Task | Track | Status | Commit |
|---|---|---|---|
| T1 tokenisation | angular | DONE | ac03ac6 |
| T2 classifier | angular | DONE | 1bcc724 |
| T3 preservation checks | angular | DONE (7 stores-spec cases red, see Findings F1) | bb6f0c5 |
| T4 SEO core name | angular | DONE | 0c22e07 |
| T5 protected slug trim | prompt | DONE | 32320fc |
| T6 protected-name block | prompt | DONE | 12c56dd |
| T7 repair-strategy entries | angular | DONE (1 pre-existing test red, see Findings F2) | f6762dc |
| T8 precedence clause | prompt | DONE (golden byte-equality red until T15, by design) | 8dd783b |
| T9 Slugs prompt | prompt | DONE | 223e454 |
| T10 Doc prompt | prompt | DONE | 077685e |
| T11 Translator + Optimizer prompts | prompt | DONE | fac6a40 |
| T12 wrap payloads | angular | DONE | 2d2fcf6 |
| T13 SEO gate + seoCoreName | angular | DONE | 184073f |
| T14 report-only validation + protected slug trim | angular | DONE | 365b50e |
| T15 Task C inline sentences (FROZEN, F-1 approved) | prompt | DONE | a37826a |

## Results (real runs)
- After T1..T7 and T9..T14: task-named specs green; see per-task notes below.
- Final `npx vitest run` (test:logic, after T15): `Test Files 2 failed | 173 passed (175)`, `Tests 8 failed | 5168 passed | 3 skipped (5179)`.
- The 8 failures are exactly: 7 x `product-name-preservation.stores.spec.ts` "AC-1: a compliant Slugs set ... raises nothing" (one per registry store) and 1 x `repair-strategy.spec.ts` "registers exactly the intended rules and nothing by analogy".
- `npm run lint` (`tsc --noEmit`): clean after T6 onward (before that only the missing-module errors of specs awaiting their modules).
- `npm run test:components` (Karma/`ng test`): not run; no component or Angular template was touched, and the local `ng test --browsers` setup lacks the browser provider package.
- `bash arch-guard.sh`: passes after T15 re-baseline (before the edit it reported no drift).

## Findings (changes_required_tests, not fixed here: the builder does not own tests)
- F1. `test/fixtures/protected-name.ts` `compliantSlugs()` returns `slug: 'ignored-recomputed-by-the-pipeline'` and `product-name-preservation.stores.spec.ts` ("AC-1: a compliant Slugs set (typed name whole in every locale of this store) raises nothing") passes that raw set to `checkNameSurfaces`. FR-5 part 1 requires the typed name's slugified form to be contained in every `slug`, so a placeholder slug is a real violation by the approved Specification. The orchestrator-level specs are green because the pipeline recomputes slugs from names before the check. Suggested test fix: give the "compliant" fixture a real slug (derive it with `normalizeSlug(stripSlugStopwords(name), language)`), or assert only the `.name` paths in that case.
- F2. `src/utils/repair-strategy.spec.ts` "registers exactly the intended rules and nothing by analogy" pins the exact `REPAIR_STRATEGIES` key list, while the new T7 tests in the same file require `product-name-token-missing` and `product-name-shortened-form` to be registered. The two cannot both pass. Suggested test fix: add the two rule ids to the pinned list (same recalibration US-3.1 made for its rules).

## Notes
- Golden file `test/fixtures/golden/full-description-prompts.json` regenerated once, after T15, from `GOLDEN_CASES`. Diff reviewed: every `userContent` unchanged; `systemBlocks` changed only by (a) the leading PROTECTED NAME PRECEDENCE clause inside the shared `PRODUCT_NAME_LOCALIZATION` text (master + Task C), (b) the Doc `localizedName` instruction, (c) the Translator `[BRAND AND MODEL NAMES]` paragraph, (d) the five rewritten inline Task C sentences. The 18 golden byte-equality cases are therefore red between T8 and T15 by design.
- T15: FROZEN edit confined to `src/prompts/task-c.ts` (5 sentences). `git diff` of `task-a.ts` was empty and `arch-guard.sh` reported only `task-c.ts` before `--rebaseline`; `.arch-guard-checksums` diff is the single `task-c.ts` line, committed with the edit.
- Not edited: task-a.ts, task-b.ts, master-system-prompt.ts, output-validator.ts, any `.spec.ts` or fixture content, `invariantCore`.
- T12/T13/T14 were built together in `content-orchestrator.service.ts` and split into three commits by reconstructing each intermediate state; each intermediate state type-checks and its task specs pass.
- Surfacing points wired per the test-generation report: `generateSeoMetadata` validationIssues overwrite, `generateSlugs`, `optimize()` (merged, replacing only prior `Optimizer output` findings), and `runOutputValidation` for `generate()` / `generateUaContent()`.
- QUALITY_GATE not run (owned by so-gate-enforcer).

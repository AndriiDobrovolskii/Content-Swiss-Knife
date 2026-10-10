---
artifact: test_generation_report
story: US-7.1
version: 2
status: ARCHIVED
owner: so-test-writer
created_at: 2026-10-09T19:30:00Z
updated_at: 2026-10-09T20:00:00Z
supersedes: 1
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 4
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 1
  - key: task_breakdown
    version: 1
  - key: plan_review
    version: 1
  - key: open_decisions
    version: 2
open_decisions_blocking: false
---

# Test Generation Report - US-7.1

## Files changed (tests and test fixtures only)

No implementation code, FROZEN file, generated fixture or golden JSON was edited. `git status` outside `docs/` lists only the files below.

**New specs (11)** - `src/utils/product-name-tokens.spec.ts`, `src/utils/protected-product-name.spec.ts`, `src/utils/product-name-preservation.spec.ts`, `src/utils/product-name-preservation.stores.spec.ts`, `src/utils/protected-seo-name.spec.ts`, `src/prompt-core/protected-slug.spec.ts`, `src/prompt-core/protected-name-block.spec.ts`, `src/prompt-core/protected-name-precedence.spec.ts`, `src/services/content-orchestrator.protected-name-wiring.spec.ts`, `src/services/content-orchestrator.protected-name-repair-gate.spec.ts`, `src/services/content-orchestrator.protected-name-validation.spec.ts`.

**New shared test fixture (1, not a spec)** - `test/fixtures/protected-name.ts` (routing mock `LlmService`, `Injector.create` boot, Fixture A/C, compliant and shortened Slugs/SEO builders, pipeline routes reusing the corpus Doc).

**Extended existing specs (8)** - `src/utils/repair-strategy.spec.ts` (+9 tests), `src/prompts/task-slug.spec.ts` (+15), `src/prompts/task-a-doc.spec.ts` (+5), `src/prompts/task-translate.spec.ts` (+13), `src/prompts/optimizer.spec.ts` (+3), `src/prompts/task-c.spec.ts` (+24), `src/prompts/full-description.golden.spec.ts` (+4), and `src/services/content-orchestrator.repair-field-wiring.spec.ts` (3 existing tests rewritten, see below). No existing spec imports a not-yet-existing module: the 6 pre-existing tests in `task-slug.spec.ts` (and every other extended file's old tests) keep running green.

**Rewritten, not weakened** - the US-3.1 T15 describe in `content-orchestrator.repair-field-wiring.spec.ts` (es-ES, pt-PT, uk-UA). `generateJson` was pinned to ONE call; the name `Formlabs Optical Cleaning Cloths x100` is protected under FR-1 and the long-H1 canonicalizer drops it from `meta_title`, so after US-7.1 the gate legitimately spends its repair (2 calls) and keeps the part-1 finding in `finalIssues`. Diff: 3 lines deleted (`toHaveBeenCalledTimes(1)`), a documented helper added, all prefix-shape assertions untouched. These three are the only pre-existing tests that are red now, and they are red by design.

## Baseline (before any test was written)

`npx vitest run` on the clean tree (the unrelated working-tree changes are `docs/` only):

```
Test Files  164 passed (164)
     Tests  4578 passed | 3 skipped (4581)
```

## Observed run (after the tests were written)

Command: `npx vitest run` (whole `test:logic` suite, JSON reporter), run three times as the suite grew; the last run, after the final edit:

```
suites 1100  tests 4922  passed 4719  failed 200  pending 3  failedSuites 81
```

Every failing file is one of the 19 files above; **no other file contains a failure**. The 4578 baseline tests all still pass except the 3 deliberately rewritten ones. Per file (RED / green-by-design guards):

| File | Collected | RED | Green guards | Red reason (real) |
|---|---|---|---|---|
| `src/utils/product-name-tokens.spec.ts` | not collected (~60 cases) | import | - | `Failed to resolve import "./product-name-tokens" from "src/utils/product-name-tokens.spec.ts". Does the file exist?` |
| `src/utils/protected-product-name.spec.ts` | not collected (~45) | import | - | `Failed to resolve import "./protected-product-name"` |
| `src/utils/product-name-preservation.spec.ts` | not collected (~85) | import | - | `Failed to resolve import "./product-name-preservation"` |
| `src/utils/product-name-preservation.stores.spec.ts` | not collected (9 x 7 stores) | import | - | same module |
| `src/utils/protected-seo-name.spec.ts` | not collected (9) | import | - | `Failed to resolve import "./protected-seo-name"` |
| `src/prompt-core/protected-slug.spec.ts` | not collected (10) | import | - | `Failed to resolve import "./protected-slug"` |
| `src/prompt-core/protected-name-block.spec.ts` | not collected (~14) | import | - | `Failed to resolve import "./protected-name-block"` |
| `src/prompt-core/protected-name-precedence.spec.ts` | 20 | 17 | 3 | `expected -1 to be greater than or equal to 0` (marker absent); `expected '[ROLE]\nYou are an expert technical c...' to contain '[PROTECTED PRODUCT NAME]'` |
| `src/prompts/task-slug.spec.ts` | 21 | 9 | 12 | `names that translate, drop or re-order a token of "Bambu Lab Hardened Steel Nozzle 0.4 mm": expected [ ...(4) ] to deeply equal []`; `slugs missing "bambu-lab-hardened-steel-nozzle-0.4-mm"`; `expected 'NAME - COMPOSITION RULES ...' to contain '[PROTECTED PRODUCT NAME]'` |
| `src/prompts/task-a-doc.spec.ts` | 38 | 3 | 35 | `expected '"localizedName": "<product name as it...' to match /protected/i` |
| `src/prompts/task-translate.spec.ts` | 32 | 11 | 21 | `expected 'TRANSLATE THE INPUT INTO ENGLISH (BRI...' to match /brand[^.\n]{0,40}model...` (all 10 languages + the unknown-label fallback) |
| `src/prompts/optimizer.spec.ts` | 14 | 1 | 13 | `expected 'TASK OPTIMIZE - REWRITE AN EXISTING H...' to match /brand...model.../i` |
| `src/prompts/task-c.spec.ts` | 55 | 22 | 33 | `still contains "TRANSLATE the generic descriptor"`; `still contains "translates descriptor category-first (es-MX variant)"` (11 branches each; the European English branch never carried the sentence) |
| `src/prompts/full-description.golden.spec.ts` | 18 | 2 | 16 | the goldens still hold the pre-Story text |
| `src/utils/repair-strategy.spec.ts` | 70 | 4 | 66 | `expected false to be true` (rule ids unregistered); `expected undefined to be defined` |
| `src/services/content-orchestrator.protected-name-wiring.spec.ts` | 89 | 36 | 53 | `expected '[INPUT DATA]\n[Store Name]: 3DDevice\...' to contain '[PROTECTED PRODUCT NAME]'` (Task A, Slugs, Task B, Task C, per store); `expected -1 to be greater than 143` |
| `src/services/content-orchestrator.protected-name-repair-gate.spec.ts` | 77 | 56 | 21 | `expected [ { kind: 'json', ...(2) } ] to have a length of 2 but got 1` (the shortened set is accepted unrepaired today); `pl-PL: expected 'Резервуар для смоли Formlabs Form Stu...' to be 'Formlabs Form Studio 1 Resin Tank Pro'` |
| `src/services/content-orchestrator.protected-name-validation.spec.ts` | 82 | 36 | 46 | `expected 0 to be greater than 0` (no FR-5 finding); `en-GB: expected 'en-gb-formlabs-form-studio-1-filler9-...' to contain 'formlabs-form-studio-1-resin-tank-pro'` |
| `src/services/content-orchestrator.repair-field-wiring.spec.ts` | 7 | 3 | 4 | `expected "vi.fn()" to be called 2 times, but got 1 times` (rewritten tests) |

Type check: `npx tsc --noEmit` (the `lint` script) reports exactly the 8 `TS2307: Cannot find module` errors for the 7 new-module specs and nothing else - no type error in any test.

**Right-reason review.** All 200 collected red tests fail on an assertion with a clear expected/actual (prompt text, call count, payload content, slug content, finding absent). The 7 specs that are not collected fail at import because the module under test is NEW: that is the contract the Story creates, not a broken test. Two additional protections against a vacuous red or a vacuous green: (1) the precedence-clause ordering test asserts the marker exists before comparing positions (an absent marker is `-1` and would satisfy `-1 < n`); (2) the shortened SEO mock is proved, with the REAL `validateSeoMetadata` and `validateSeoMetadataShape`, to pass every existing check, so the red reason is the call count, not a fixture that already trips an old rule.

## What the new tests were checked against

- **Fixtures A, B, C** are inline (Specification Definitions). `test/fixtures/corpus/` holds two items of one product (`Ortur H20 20 W`); neither has a decimal+unit protected name, so it cannot stand in for Fixtures A/B (known gap, `test/render-reconciliation.report.md` line 211). The corpus Doc IS reused as the Doc body of the pipeline runs.
- **Pipeline reach (verified by running, not assumed).** `generate()` reaches Task A/Doc, Slugs, Task B and every Task C locale on all 7 registry stores in about 15-60 ms each; the six Doc-pipeline stores need `brandFolder: 'ortur'`, `modelFolder: 'h20/h20-20w'` (the corpus Doc's image paths) or the Doc fails its schema. A mock that answers a field-scoped repair with placeholder markup corrupts the Doc, so repair calls are answered with an empty string.
- **No sleep, no retry, no randomness, no network, no clock.**

## Findings for the next stages

1. **Unknown 2 / risk R6 (language-consistency, heading rules) - resolved by running the existing validators on a uk-UA fixture with Latin `Resin Tank`.** `validateLanguageConsistency`: no finding for a realistic Cyrillic hook carrying the full name (and none for the shortened name); `validateProductNameConsistency`: none. One existing, unchanged rule fires and is recorded, not masked: `heading-product-name-stuffing` (warning) when the FULL typed name sits in a heading (`Чому купити Formlabs Form Studio 1 Resin Tank Pro в EXPERT3D?`); `validateGeneratedHtml` flags a manual `<h1>` in the body. So AC-3 must not be satisfied by putting the full name in headings (OD-6 keeps heading short forms). No mask is needed and none is added.
2. **Surfacing points** (also in the strategy): `generateSeoMetadata` overwrites `validationIssues` with `validateSeoMetadata` only; `generateSlugs` sets `slugFinalIssues` and never calls `runOutputValidation`; `optimize()` never touches `validationIssues`. T13/T14 must merge the FR-5 results at those three points.
3. **Optimizer reach.** `optimizer.ts` does not import `PRODUCT_NAME_LOCALIZATION`, but its `systemBlocks[0]` is `MASTER_SYSTEM_PROMPT`, which interpolates it - so T8 reaches the Optimizer's master block (asserted) and T11 adds the optimizer-specific sentence (asserted on `systemBlocks[1]`).
4. **Example 2 of the Slugs prompt** drops `With` from its slug although `with` is not in `SLUG_STOPWORDS`; the pipeline re-derives slugs from names and keeps it. A conforming rewrite keeps `with`.
5. **Long-H1 canonicalizer** (unchanged, FR-4 failure path): for a protected name whose h1 reaches 54 code points the canonicalizer still cuts `meta_title`; FR-5 part 1 now reports it. `seoCoreName` (T4) keeps the h1 under 54 by dropping the category; the existing US-3.1 T15 tests exercise the other regime and were rewritten accordingly.
6. **Existing orchestrator specs with protected names** (`Ortur F10 10W`, `Ortur H20 20 W`; both protected by FR-1): traced, not just assumed. The corpus Doc only ever writes `Ortur H20` (no last token `W`) or the full `Ortur H20 20 Вт`, so FR-5 part 2 cannot flag it; the SEO/slug stubs in `ua-doc-pipeline`, `grounding-*`, `doc-gate` carry the full name. The wrapped `userContent` appears in those payloads but none of those specs compares `userContent` for equality. If the gate nevertheless shows one of them red after IMPLEMENTATION, that is `changes_required_tests` for TEST_WRITING, not a reason to edit the spec in the builder's commit.
7. **Reading the OD-11 / OD-12 / OD-13 defaults.** The classifier, `seoCoreName` and tokenisation specs each pin the carried defaults in exactly one module spec, so a reversal at the spec gate rewrites one file: `protected-product-name.spec.ts` (OD-11), `protected-seo-name.spec.ts` plus the "SEO core name fed to Task B" describe (OD-12), `product-name-tokens.spec.ts` (OD-13).

## Coverage gaps

- No corpus fixture covers a protected name with a decimal+unit; Fixtures A/B/C are inline. A corpus item for Fixture A would need a hand-verified Doc and uk-UA HTML, which cannot be produced offline.
- Translator and Optimizer-without-`[Product Name]` (AC-5) are prompt-text only by the Specification's own limitation (OD-7).
- FR-5 part 2 blind spots (NFR-7) are asserted to stay undetected, not covered.
- Live-model confirmation (Fixture A on EXPERT3D in all six modes) is manual release evidence outside the suite.
- Every spec that needs a new module is red at import; its internal expectations cannot be executed until T1-T6 exist. They were checked against the Specification line by line (examples named in FR-1 and FR-5 are used verbatim) and the type check passes; the first implementation run is the real proof.
- `test:components` (Karma) and `server/**` (node:test) are untouched; none of the changed code is reachable from them.

## Verification checklist (so-test-writer)

- [x] No component spec; no spec named `*.component.spec.ts`; service specs use `Injector.create` with `import '@angular/compiler'` first (via the shared fixture and each spec).
- [x] Every `AC-n` has a row in the matrix with a real file and test name.
- [x] Assertions written from the criteria; none copied from an actual run; no test's only assertion is `toBeTruthy()`.
- [x] Corpus Doc reused; new fixtures justified above.
- [x] No sleep / randomness / network.
- [x] Tests actually run; failing output recorded above.
- [x] Pre-existing tests still pass (4578 baseline; the 3 rewritten ones are the deliberate exception).

## Revision v2 - loop-back attempt 1 (two test defects found by IMPLEMENTATION)

1. `test/fixtures/protected-name.ts` `compliantSlugs()`: the placeholder slug `ignored-recomputed-by-the-pipeline` was itself an FR-5 part 1 violation when passed straight to `checkNameSurfaces`. The compliant fixture now carries `slugify(typed)`. The check is not weakened: `shortenedSlugs()` is unchanged and the negative per-locale cases still assert findings.
2. `src/utils/repair-strategy.spec.ts` "registers exactly the intended rules": added `product-name-shortened-form` and `product-name-token-missing` in sorted position (the T7 tests require them).

Observed after the fix: `npx vitest run` - 175 files passed, 5176 tests passed, 3 skipped (live probes), 0 failed (previously 8 failed / 5168 passed). The AC-test matrix is unaffected (no AC/test mapping changed).

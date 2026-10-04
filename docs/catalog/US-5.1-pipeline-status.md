---
artifact: pipeline_status
story: US-5.1
version: 7
status: ARCHIVED
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-10-02T00:00:00Z
updated_at: 2026-10-04T11:00:00Z
supersedes: docs/catalog/US-5.1-pipeline-status.md@v6
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 9
  - key: open_decisions
    version: 6
  - key: impact_analysis
    version: 3
  - key: implementation_plan
    version: 6
  - key: task_breakdown
    version: 8
  - key: plan_review
    version: 8
  - key: test_strategy
    version: 6
  - key: ac_test_matrix
    version: 6
open_decisions_blocking: false
---

# Pipeline Status — US-5.1

Verdict: `PASS`. All tasks T0..T13 are done and the whole source tree is committed and green. The two specs withheld in v6
(fixed by TEST_WRITING, test strategy and AC matrix v6) were committed on this re-entry, each as its own commit. No test,
fixture, coverage setting or production file was edited by the builder. Nothing pushed, no PR.

Branch: `feat/US-5.1-image-placeholder-substitution`, cut from the current HEAD of `docs/US-4.1-archive`.
Base SHA (T0, human decision HQ-1 = (a), supersedes "branch from main"): `ef085099c1a0f1ab90b82c56ea2eeb15b457996f`
(`ef08509`). The branch name did not exist before. The PR will carry the US-4.1 archive commit (accepted by the human).
The working tree was carried across unchanged (`git status --short` identical before and after the switch).
HQ-2: no `docs/**` file was committed.

## Tasks

| Task | Commit | Outcome | Evidence on the staged tree (stash `--keep-index --include-untracked` proof: lint, test:logic, test:components, build, arch-guard) |
|---|---|---|---|
| T0 | (branch only) | done | `git branch --show-current` = Story branch; HEAD = `ef08509`; status unchanged |
| T4 | `134cdcc` | done | vision-contract spec 27 green; all gates green |
| T1 | `ba4a142` | done | hook/cta extra spec green; all gates green |
| T3 | `e83b82d` | done | validators spec green; all gates green |
| T5 | `1dc0cc3` | done | vision-prepass spec 11 green; all gates green |
| T6 | `8a2d3d4` | done | `app.component.ts` diff is the 2-line patch; all gates green |
| T7 | `e7b7884` | done | openai provider spec (cap 1000) green; all gates green |
| T8 | `b7e27ac`, `fc4bbf1` | done | all listed specs green, corpus: exactly 14 substitutions per `.uk-UA.html`; `image-figure-style.spec.ts` committed in `fc4bbf1` (staged-tree proof: lint, test:logic 4436 passed, test:components 32, arch-guard, build) |
| T9 | `06ee67a`, `dd5f039` | done | leaf, html, validate specs green; `image-placeholder-doc.spec.ts` committed in `dd5f039` (staged-tree proof: lint, test:logic 4506 passed, test:components 32, arch-guard, build); no English string left in production |
| T10 | `9403539` | done | orchestrator spec 40/40 green incl. numeric-grounding case (a) on both paths; `.arch-guard-checksums` untouched in this commit |
| T11 | `df52e88` | done | FROZEN A1 + A2 together; see below |
| T12 | `17beda8` | done | AGENTS.md diff is exactly one line (section 4, `fit-content` to `max-content`) |
| T13 | (no commit) | done | verification below |

Each commit was proven green on its exact staged contents (lint, `test:logic`, `test:components`, `build` via the
other tasks' `ng test` run, `bash arch-guard.sh`). Commit messages carry the two attribution lines.

## Defects reported to TEST_WRITING in v6 (resolved by TEST_WRITING; builder did not edit either file)

1. `src/utils/image-figure-style.spec.ts`, describe "agreement between the surfaces and the shared module": the two cases
   "exports the three constants with exactly the specified literals" and "renderer, wrapImageFigures and the editor node
   all carry the one IMAGE_FIGURE_STYLE" call `loadStyleModule()` (returns a Promise) without `await`. `m.IMAGE_FIGURE_STYLE`
   is `undefined`; both fail, and `npm run lint` (`tsc --noEmit`) fails on the file (TS2339 at lines 174-176, 184-186).
   Fix: `const m = await loadStyleModule();` in both. `src/utils/image-figure-style.ts` exists and exports the three
   specified literals, so the cases pass once awaited (checked by reading the module values). All other cases of the file
   pass. The file is untracked and uncommitted; the plan assigns it whole to T8.
2. `src/utils/image-placeholder-doc.spec.ts`, case "does not rename the later label automatically (no rewording)":
   `SAME_LABEL_KETTLE` is `entry({ id, originalFilename: 'kettle-side.jpg', urlFilename: 'kettle-side.jpg', visionLabelUk })`
   built on the LAMP defaults, so its `visionDescriptionUk` is the lamp description; the case expects the kettle description
   `Сталевий чайник, вигляд збоку.`, which the entry does not carry. Fix: add the kettle description to that entry (or use
   `KETTLE` with the label overridden). The other 258 cases of the four step specs pass. The file is untracked and
   uncommitted; the plan assigns it whole to T9.

Both fixed in test artifacts v6; re-entry committed them (two commits, by explicit path, no production change).

## FROZEN footprint (T11, T13)

Approvals A1 and A2 (H-8) from `docs/workflow/history.jsonl`, cited in the T11 commit message.
- `task-a.ts` numstat 17/1 against the base `ef08509` (added import, `buildMarkerBlock`, one modified template line).
- `master-system-prompt.ts` numstat 5/2: 3 lines of FR-20 text, and exactly the two example figure lines, `fit-content`
  to `max-content`, nothing else. CRLF working-copy line endings were preserved (one accidental LF conversion by `sed` was
  repaired before the checksum was taken).
- Before rebaselining, the HEAD baseline differed for exactly `task-a.ts` and `master-system-prompt.ts`; `task-b.ts`,
  `task-c.ts` and `output-validator.ts` matched and are in no commit. After `--rebaseline`, `git diff HEAD -- .arch-guard-checksums`
  moved exactly those two rows, and `bash arch-guard.sh` passes.
- Golden `test/fixtures/golden/full-description-prompts.json`: the TEST_WRITING-left golden already equals what the prompt builds
  (golden spec byte-equal, so no regeneration changed it). Review against HEAD: 12 keys in both; exactly 10 entries differ
  (`c/eu-en`, `c/expert3d-es`, `c/us-uk`, `doc/c3d`, `doc/expert3d`, `doc/expert3d+hook`, `html/c3d+customTemplate`,
  `html/expert3d`, `html/legacy`, `html/legacy+lang`); only `systemBlocks[0].text` differs, by the FR-20 insertion and the
  two token substitutions; `userContent` is equal in all 12; the two `translate/*` entries are identical; no input has a marker.

## T13 verification (against base `ef08509`)

1. `git diff --name-only ef08509..HEAD` lists as FROZEN only `task-a.ts` and `master-system-prompt.ts`.
2. numstat 17/1 and 5/2 as above; the two removed lines of the master prompt are the two example figure lines.
3. `.arch-guard-checksums` diff is only those two rows; `bash arch-guard.sh`: ALL CHECKS PASSED.
4. `fit-content` survivors: the two `src/utils/__fixtures__/description_uk-UA.{original,corrected}.html` (U-15, unedited),
   historical docs and `Knowledge/` issue captures, specs that assert its absence, and the `full-description-inputs.ts`
   header note. None in production code; none in `AGENTS.md`.
5. Re-entry on the real tree: `npm run test:coverage`: 163 files, 4506 passed, 0 failed, 3 skipped (pre-existing). `npm run lint`
   clean. `git status --short` shows only orchestrator-owned `docs/**` (modified tracked harness files and untracked
   `US-5.1-*` artifacts); no source file is uncommitted.

The full QUALITY_GATE report was not run (next stage).

## Notes and non-blocking findings

- `numericFidelitySources` now also joins `visionLabelUk`, `visionDescriptionUk`, `visionAltUk`. The HTML path keeps passing
  `markerManifest` to it (unchanged from the v5 wiring), the Doc path still passes `imgManifest`.
- `cyrillicCheck` is derived from the master-locale constant (`MASTER_LOCALE`) against a `VISION_TEXT_LANGUAGE` constant in the
  orchestrator; no store or locale list was added.
- Legacy path: the finaliser looks the shipped HTML up in a per-run `reportByHtml` map to see the already-placed figures
  (N-5); when block repair changed the HTML, the lookup misses and the duplicate-label check sees only the appended figures.
- Finaliser signatures gained an optional trailing options parameter (`cyrillicCheck`, `placed`); existing call shapes still work.
- `src/utils/doc-block-repair.ts` was NOT edited. Carried finding (N-9): a too-long sentence inside `hookExtra` is measured
  under path `hook`, so the root-leaf `hook` repair addresses `doc.hook` only; not addressed by any task, the human should know.
- Whole-call Vision failure still unmatches the marker with the spec-literal warning (OI-8, unchanged).

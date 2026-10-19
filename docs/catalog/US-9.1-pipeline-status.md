---
artifact: pipeline_status
story: US-9.1
version: 5
status: ARCHIVED
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-10-18T16:16:00Z
updated_at: 2026-10-19T15:31:00Z
supersedes: docs/catalog/US-9.1-pipeline-status.md#4
inputs_consumed:
  - key: story
    version: 6
  - key: specification
    version: 8
  - key: open_decisions
    version: 6
  - key: impact_analysis
    version: 6
  - key: implementation_plan
    version: 7
  - key: task_breakdown
    version: 6
  - key: plan_review
    version: 6
  - key: test_strategy
    version: 5
  - key: ac_test_matrix
    version: 5
open_decisions_blocking: false
---

# Pipeline status: US-9.1 (IMPLEMENTATION, round 4: removal of the withdrawn operator-notes feature, T43 to T49)

Branch `feat/US-9.1-no-picture-references-and-livelier-descriptions`, Node v24.15.0, run of 2026-10-19 (UTC). Branch base `6546db8` (ancestor of HEAD, exit 0); `09f87dc` is an ancestor of HEAD (exit 0).
Rounds 1 to 3 further down are history: their task ids T1 to T42 are retired; this round executes T43 to T49 of task breakdown (executed under v5, records refreshed against v6).
Records refresh (version 5, RECORDS-REFRESH): only this file was revised, to follow Story v6 / Specification v8 / Plan v7 / Task breakdown v6, under which the AC-11 / AC-12 hard script criteria are WAIVED by the owner (not measured; Story v6, 2026-10-19). No task was re-run; the T43 to T50 results and commit hashes are unchanged; HEAD at the refresh is 313f727 and the non-doc tree is unchanged.

**Result of round 4: PASS for T43 to T49 (seven committing tasks, eight commits including the TEST_WRITING test commit).** The T50 checks that can be run were run on the final tree (below); T51 (manual live runs) is SUPERSEDED by the owner's AC-11 / AC-12 waiver (Spec v8 FR-34 / FR-35, Story v6): it is not pending, not manual, not executed, and not replaced by another task.
No test file or coverage setting was edited by the builder (the golden `full-description-prompts.json` is a builder-owned fixture per plan B1 and was regenerated in T43). No push, no Pull Request, no `--no-verify`, no history rewrite;
`docs/workflow/workflow-state.yaml` and `history.jsonl` were not written. Draft PR #142 was not touched.

## Human decisions in force (round 4)

- FROZEN files, owner, verbatim, `docs/workflow/history.jsonl` ts 2026-10-19T14:40:00Z, actor sbruhov@gmail.com: `modify master-system-prompt.ts, modify task-a.ts, так`; withdrawal hunks only (T43: the two [SOURCE FIDELITY] bullets; T44: the import and the interpolation prefix);
  local commits authorised on this branch. `task-b.ts`, `task-c.ts`, `output-validator.ts` were not opened.

## Task table (round 4)

| Task | Track | Status | Commit |
|---|---|---|---|
| TEST_WRITING work (P0 to P14: 200 red = 32 sanctioned P3/P4 inversions + 168 new pins; 8 operator-notes specs deleted) | test | COMMITTED first, as its own commit (precedent 3f9ae29); docs artifacts left uncommitted for the orchestrator | 1b73c8a |
| T43 master [SOURCE FIDELITY] bullets back to `6546db8` + golden regenerated (FROZEN, approved) | prompt | DONE | fd9b052 |
| T44 `task-a.ts` stops emitting `[Operator Notes]` (FROZEN, approved) | prompt | DONE | 439cc1e |
| T45 orchestrator numeric-fidelity sources | angular | DONE | 19ed848 |
| T46 Generator operator-notes form removed (component, state class, `app.component.ts/.html` to base bytes) | angular | DONE | 4556cb4 |
| T47 four `--notes-*` flags removed from `tools/measure-description.ts` (+ comment in `description-metrics.ts`) | angular | DONE | 291bc1e |
| T48 `src/prompts/operator-notes.ts` deleted | prompt | DONE | bad5161 |
| T49 `src/app/types.ts` to base bytes | angular | DONE | 86b0d62 |
| T50 verification (no commit) | prompt | RUN on the final tree, see below; the full QUALITY_GATE is a separate stage and was not run | - |
| T51 live acceptance runs after the master revert | - | SUPERSEDED by the owner's AC-11 / AC-12 waiver (Story v6, Spec v8, Plan v7 OD-32, Task breakdown v6): not pending, not executed, no replacement task, not a precondition for QUALITY_GATE | - |

## Per-task notes (round 4)

- **T43**: the two bullets restored from the `6546db8` blob by a scratchpad script (line endings preserved). Measured block 0 delta: the bullets region is 582 characters at HEAD and 452 at `6546db8`, a difference of **130 characters**, equal to the STOP figure (134 bytes).
  `git diff 6546db8 -- src/prompt-core/master-system-prompt.ts` has zero hunks inside [SOURCE FIDELITY] (grep count 0); the residual hunks are the import, `NO_IMAGE_DEIXIS_RULE`, video, grounding lock, PLACEMENT and `LIVELINESS_RULES`.
  Golden: plan-W6 raw-text substitution (throwaway script in the scratchpad, not committed): the JSON-escaped HEAD region replaced by the JSON-escaped `6546db8` region, needle found exactly 10 times, never parse/stringify of the file, no `-u`.
  `git diff --numstat HEAD~1` for the golden: **10 added / 10 deleted**; `Operator Notes` occurs 0 times in the file. Scripted check (reads old and new golden as data, region taken from the `6546db8` blob): 12 keys unchanged in order; exactly 10 changed
  (`doc/expert3d`, `doc/expert3d+hook`, `doc/c3d`, `html/expert3d`, `html/legacy`, `html/legacy+lang`, `html/c3d+customTemplate`, `c/expert3d-es`, `c/eu-en`, `c/us-uk`); for each, new block 0 equals old block 0 with the two bullets replaced by the `6546db8` literals (true x10),
  everything outside block 0 identical (true x10), delta 130 characters in every case (the `c/*` delta equals the Task A delta). `bash arch-guard.sh --rebaseline` then `bash arch-guard.sh` exit 0; `.arch-guard-checksums` moved exactly the master line
  (`57d54839...` to `0fe9a169...`); `task-c.ts` stays `619c45a9...`. `git diff 6546db8 -- test/fixtures/golden/task-c-description-prompts.json` is empty. P1 to P4 and the P10 master block green.
- **T44**: removed `import { buildOperatorNotesBlock } ...` and the `${buildOperatorNotesBlock(input.operatorNotes)}` prefix only. `git diff 6546db8 -- src/prompts/task-a.ts` has exactly 3 hunks (the FR-11 hunks); `git grep` for `operator-notes|operatorNotes|OperatorNotes` in the file is empty;
  the checksum moved exactly the `task-a.ts` line (`dc98fd7a...` to `dc49a440...`). P5 (124 stray-property tests in `task-a.user-content.golden.spec.ts`) went green.
- **T45**: the import, the FR-30 doc-comment paragraph and the `...OPERATOR_NOTE_FIELDS.map(...)` line removed; `git diff 6546db8` for the service is exactly the two FR-14 text lines (4 changed lines). P6 green.
- **T46**: `app.component.ts` and `.html` restored to the `6546db8` blob (every hunk of their diff against base was operator-notes only; the diff against base is now empty), the state class and the component folder deleted. `npm run build` (AOT) succeeds; `npm run test:components` 2 files / 32 tests.
- **T47**: header comment, `FLAGS`, `FILE_FLAGS`, `USAGE`, the D-10 sentence and the `description-metrics.ts` comment. P8 (9 tests) green; `git grep -i` with the widened P10 token set over `tools` and `description-metrics.ts` is empty.
- **T48**: `git grep -n "operator-notes" -- src tools server ':!*.spec.ts'` empty; `tsc` and the AOT build green with no importer left.
- **T49**: `git diff 6546db8 -- src/app/types.ts` empty; the stray-property specs (P5, P6, P7, P9a) still compile because they attach the key through `unknown`.

Per-task gate: after each task the whole logic suite was re-run and the failing set shrank monotonically to the later tasks' own pins (200 red at the start; 158 after T43; 33 after T44; 23 after T45; 15 after T46; 4 source-scan pins owned by T48/T49 after T47; 0 after T49).
`npm run lint` (tsc --noEmit) reported zero diagnostics at every task; `bash arch-guard.sh` exited 0 at every task.

## Verification evidence (real output, final tree of round 4, HEAD 86b0d62)

```
$ npx vitest run                               # npm run test:logic
 Test Files  221 passed (221)
      Tests  7569 passed | 3 skipped (7572)

$ npm run test:components
 Test Files  2 passed (2)
      Tests  32 passed (32)

$ npm run lint                                 # tsc --noEmit
(no output, exit 0)

$ npm run build                                # AOT; only the pre-existing CommonJS (jszip) bailout warnings
Output location: C:\Work\Content-Swiss-Knife\dist

$ bash arch-guard.sh
  ALL CHECKS PASSED
```

T50-style checks run on the final tree:

| Check | Result |
|---|---|
| `git merge-base --is-ancestor 6546db8 HEAD` and `... 09f87dc HEAD` | exit 0 and exit 0 |
| `git diff 6546db8 -- src/app/types.ts src/app/app.component.ts src/app/app.component.html` | empty |
| `git diff 6546db8 -- src/services/content-orchestrator.service.ts` | exactly the two FR-14 text lines |
| `git diff 6546db8 -- src/prompts/task-a.ts` | 3 hunks (FR-11 only) |
| hunks of `git diff 6546db8 -- master-system-prompt.ts` inside [SOURCE FIDELITY] | 0 |
| `git diff --numstat 09f87dc -- test/fixtures/golden/full-description-prompts.json` | 10 / 10 |
| `git diff 09f87dc -- .arch-guard-checksums` | exactly the `task-a.ts` and `master-system-prompt.ts` lines |
| `git diff 09f87dc -- task-c-description-prompts.json task-a-user-content.json optimizer-faq-pre-change.json` | empty |
| `git diff 09f87dc --name-only` over `server`, `src/domain`, `src/render`, `output-validator.ts`, `task-a-doc.ts`, `task-c.ts`, `optimizer.ts`, `history.service.ts` (non-spec) | nothing |
| `git diff 09f87dc --name-only -- src/utils/description-metrics.spec.ts src/prompt-core/master-system-prompt.liveliness.spec.ts` | nothing (B4) |
| widened P10 token scan over non-spec `src`, `tools`, `server` | no hit; the five deleted modules are gone from `git ls-files`; `test/operator-notes-source-scan.spec.ts` green |
| AC sweep specs of T50 | all part of the 221-file logic run, 0 failed |
| P14: base `6546db8`, line-322 successor describe, 20 occurrences, W6 mechanism recorded in the `ac_test_matrix` and the `test_strategy` | present (`grep` finds `6546db8` and `W6` in both files); not re-validated line by line, RECONCILIATION reads them |

Not run here (separate stage): the full QUALITY_GATE (coverage, validate:harness). T51 is superseded by the AC-11 / AC-12 waiver, so no live run exists or is owed. The 3 skipped tests are pre-existing.

## Findings (round 4)

- The `docs/` files modified in the working tree by earlier stages (story, specification, plan, breakdown, test artifacts, `workflow-state.yaml`, `history.jsonl`) were NOT committed by the removal tasks; this status file is committed on its own.
- A `git checkout 6546db8 -- <files>` plus `git rm` batch was refused once by the permission classifier; the same end state was reached with `git show 6546db8:<path> > <path>` and `git rm` per file (same bytes, empty diff against base).
- Residual (plan R5, rewritten in Plan v7): UNMEASURED and OWNER-ACCEPTED. The headline outcomes of AC-11 / AC-12 (hard script criteria) are waived by the owner and were not measured; no live evidence is claimed, and the pre-T43 live evidence (produced under the notes-bearing master, 130 characters longer) is not relied on. T51 is superseded. This file does not disclose the waiver to the reader of the result: the `ac_test_matrix` rows, RECONCILIATION (`non_blocking_findings`, never "passed" or "measured") and the PR "how verified" line do. The waiver is bound to the delivery as committed (Plan v7 OD-29).
- The round 1 to 3 text below that mentions operator notes (T8..T13, T21, T31, T38..T40, the notes part of T35) describes work this round removed; it is history, not current state.

---

# History: rounds 1 to 3 (content of version 3)

# Pipeline status: US-9.1 (IMPLEMENTATION, round 3, track prompt + angular)

Branch `feat/US-9.1-no-picture-references-and-livelier-descriptions`, Node v24.15.0, round 3 run of 2026-10-18 (UTC, `date -u` 19:59 at start, 20:07 at the last command).
BASE (read from the fixture headers, never `git merge-base HEAD main`): `6546db83ef4005e9d6a57baf51adf0b35df8d3c7`; `git merge-base --is-ancestor 6546db8 HEAD` exit 0.

**Result of round 3: PASS (every task done except the manual T36/T42).** Finding F8 was fixed by TEST_WRITING (test artifacts v3, `master-system-prompt.no-picture-references.spec.ts` 18 tests). T30, T31, T32 are committed
(one commit each, each with the regenerated golden and the rebaselined checksums); T33 and the re-verification of T37/T20/T1 ran on the final tree. Nothing was weakened, skipped or regenerated with `-u`; no test file was touched;
no push, no PR. T36 and T42 are manual, owner-run (H-OD11); T41 is not built (the Node check passed).

## Human decisions in force (verbatim sources: `docs/workflow/history.jsonl`, last events)

- FROZEN files (AGENTS.md section 9), owner, verbatim: `modify src/prompts/task-a.ts, modify src/utils/output-validator.ts, modify src/prompt-core/master-system-prompt.ts`; US-9.1 hunks only, this session.
  NOT covered and never opened: `src/prompts/task-b.ts`, `src/prompts/task-c.ts`. Owner's order: rest of `task-a.ts`, `output-validator.ts` (round 1), `master-system-prompt.ts` last; one commit per task with
  `bash arch-guard.sh --rebaseline` and `.arch-guard-checksums` in the same commit.
- Answered: H-OD13 (restated Specification text normative; baseline fixtures tracked), H-FR41TEST (default split), H-FR20PREC (proposed precedence sentence exactly as written), H-FR11I3 (proposed marker block wording exactly as written),
  H-OD10 (D-3, D-4, D-5, D-7, D-9 as written), H-OD11 (live runs are MANUAL by the QA operator, 3 marker-built + 3 non-marker products of their choice).

## Task table

| Task | Track | Status | Commit |
|---|---|---|---|
| H-OD13 baseline files | - | DONE (round 1) | 964468c |
| T1, T37, T20 oracles (verify) | prompt | VERIFIED (round 1); re-run round 2: `payload-oracle.d15`, `task-c.description-bytes`, `task-a.user-content.golden` = 3 files / 410 tests green | 3f9ae29 |
| T2, T3 detector and carriers | angular | DONE (round 1) | 39ae78b, 1b132d0 |
| T2/T3 narrowing (finding F6) | angular | DONE (round 2) | 3ef0f1a |
| T4 .. T9, T14, T15, T17 | angular / prompt | DONE (round 1) | dc5f589, de730c4, 40b4f57, 3be4378, 28ba099, 1a335c7, 8dbd980, 48ae4d6, dd9c242 |
| T21, T22 `task-a.ts` (FROZEN, approved) | prompt | DONE (round 1) | 7397081, 7c8fae9 |
| T10, T11, T25, T26 | angular | DONE (round 1) | 46d9a15, 9176be3, ff8ad92, 7958c7f |
| T40 `OperatorNotesFormState` | angular | DONE | 24bee59 |
| T12 notes field, placement, eight label keys | angular | DONE | 9472ade |
| T13 `buildGeneratorInput` spreads `inputPart()` | angular | DONE | 6033a80 |
| T38 `restoreHistory` calls `restore` | angular | DONE | 510604c |
| T39 `clearAll` resets both cases | angular | DONE | fe29f88 |
| T16 `LIVELINESS_RULES` | prompt | DONE | 4945ff5 |
| T18 C3D OVERRIDE #5 + golden | prompt | DONE | 9bbfd50 |
| T19 EXPERT3D overlay + golden | prompt | DONE | fb0b24b |
| T23 `task-a.ts` T-A3 marker block (FROZEN, approved) | prompt | DONE | 266cd9c |
| T24 `task-a.ts` T-A1 figure clause + golden (FROZEN, approved) | prompt | DONE | 87fb3c0 |
| T34 `description-metrics` | angular | DONE | b7b2ef8 |
| T35 `tools/measure-description.ts` | angular | DONE; Node check passed (see evidence) | 990cb32 |
| T41 D12 launcher (conditional) | angular | NOT BUILT: the Node check passed, the task is dropped by its own condition | - |
| T27 master M1+M2 `NO_IMAGE_DEIXIS_RULE` + golden (FROZEN, approved) | prompt | DONE | a0e33a5 |
| T28 master M3 `[VIDEO]` + golden (FROZEN, approved) | prompt | DONE | 3110e94 |
| T29 master M4 IMAGE GROUNDING LOCK + golden (FROZEN, approved) | prompt | DONE | 18cad1f |
| T30 master M5 PLACEMENT + golden (FROZEN, approved) | prompt | DONE (round 3; F8 fixed by TEST_WRITING v3) | ecaa2fd |
| T31 master M6 `[Operator Notes]` + golden (FROZEN, approved) | prompt | DONE (round 3; T21 gate satisfied: 7397081) | 6db2885 |
| T32 master M7 `LIVELINESS_RULES` + golden (FROZEN, approved) | prompt | DONE (round 3) | d5d207a |
| T33 consumer checkpoint (verification only) | prompt | VERIFIED (round 3, see below); no commit | - |
| T36 live acceptance runs | prompt | manual, owner-run (H-OD11) | - |
| T42 live translation comparison | prompt | manual, owner-run, optional (H-OD11) | - |

## Per-task notes (round 2)

Every task: full `npx vitest run --reporter=json` before and after, compared test by test (a task passes only with zero NEW failing ids), `npx tsc --noEmit`, `bash arch-guard.sh`, one commit.

- **T40**: plain class, `signal` from `@angular/core` and the leaf module only; `signal()` works without an injection context under the logic runner (the spec's first test and 28/28 green). 28 tests.
- **T12**: field `readonly operatorNotesState = new OperatorNotesFormState()`, `operatorNotesLabels` computed, eight keys `operatorNotes{UsageScenarios,TestResults,PreviousGenerationComparison,Limitations}` in en and uk, the component once in the Generator form after
  the custom instructions and before the Expert-3DPrinter-hidden image block. T13: one spread line. T38: one statement. T39: one line in each of the two independent `clearAll` cases.
- **T2/T3 narrowing (F6)**: the open `on|in|auf|en|na + any word` tails of the participle patterns became picture-noun tails; `frame`/`clip` only as subject of a show verb or before below/above (`frames`, `clips?`); `ролик`
  alone removed and `відео`/`видео` followed by `-` excluded; German picture nouns became exact inflections (no `Bildschirm`, `Fotopolymerharz`); Portuguese gained `imagem`. `image-deixis.spec.ts` 108/108, import-cycle spec green, no positive lost.
- **T16**: the constant follows the Specification's illustrative block with the owner-confirmed precedence sentence opening the block and the verbatim self-scoping sentence last. `grep -nE "§C[1-6]|CONSUMABLES|TRANSLATE the generic descriptor|reorder it category-first|fit-content"` over the constant: no match (exit 1). `constants.liveliness.spec.ts` and `faq-pipeline.master-leak.spec.ts` green (52 tests).
- **T18**: one sentence; golden regenerated with a throw-away spec (deleted afterwards, trailing newline added to match the tracked file); reviewed diff: that sentence in the two `c3d` Task A cases (blocks of the C3D overlay), nothing else.
- **T19**: reviewed diff by case and block: block 2 (the EXPERT3D overlay) of `doc/expert3d`, `doc/expert3d+hook`, `html/expert3d`; the other nine cases unchanged.
- **T23**: the marker span exactly as the owner accepted it. Rebaseline printed `CHECKS FAILED` once (by design) and the next run `ALL CHECKS PASSED`. **T24**: the clause exactly as the breakdown words it; reviewed golden diff: block 1 of the four `html/*` cases only.
  `.arch-guard-checksums` `task-a.ts`: `d126ab91...` -> `4b4c8b5d...` (T23) -> `dc98fd7a...` (T24).
- **T34**: leaf module, `import type` only; parser and collector are parameters. `description-metrics.spec.ts` 61/61. **Calibration cross-check against the Specification's disclosure table** (real CLI output on the tracked baseline files, input `x`):
  reference `creality-pika-uk-v2.html`: sentences 80, mean 12.61, sigma 5.90, hook 47, "тож"+"Тому" 2, 13 sections, 0 deixis hits; defective `description_uk-UA.html`: 98, 10.92, 4.84, 53, 7, 13 sections. All equal the table.
- **T35**: see the Node check below. `test/measure-description.cli.spec.ts` 30/30. A bare HTML fragment is wrapped in `<html><body>` before parsing because linkedom keeps top-level fragments out of `body`.
- **T27, T28, T29**: each golden diff verified programmatically to be a single contiguous insertion or replacement, identical in block 0 of exactly ten cases (`doc/expert3d`, `doc/expert3d+hook`, `doc/c3d`, `html/expert3d`, `html/legacy`, `html/legacy+lang`,
  `html/c3d+customTemplate`, `c/expert3d-es`, `c/eu-en`, `c/us-uk`); `translate/uk-user`, `translate/de-internal`, every block 1 and every `userContent` unchanged; `git diff --exit-code` over `task-c-description-prompts.json`, `task-c.ts`, `task-translate.ts`,
  `optimizer.ts`, `simplified-template-blocks.ts` exits 0 after each; zero new failures (the master-scanning watch specs, the amended Task C guard and the FAQ specs stayed green). Checksum of `master-system-prompt.ts`:
  `75eb4d0b...` -> `05cc22ca...` (T27) -> `d40d8228...` (T28) -> `39d1aa50...` (T29).

### The Node check (T35 steps 1 and 2)

```
$ node --version
v24.15.0                                   (>= 22.18: native type stripping, no launcher needed; T41 dropped)
$ node tools/measure-description.ts --html f.html --input f.txt     # one real run on a fixture pair
v24.15.0
locale: uk-UA
HARD
  deixis hits (paragraph above, figcaption, alt): 0
  figures without a paragraph above: 0
  consecutive figures: 0
  numbers absent from the input: 0
...
RESULT: no hard violation                  (exit 0)
```

The `.ts` entry loads, the explicit `.ts` imports of the two leaf modules resolve, and `linkedom` parses. `git diff package.json` is empty (no dependency added); no `engines` / `.nvmrc`.

### Round 3: T30, T31, T32 and the T33 checkpoint

Method per task (as in round 2): the hunk is applied exactly as the Specification (FR-7 restated bullets, verbatim) and the plan (Appendix B; import plus `${LIVELINESS_RULES}` after `${SENTENCE_LENGTH_RULES}`) word it; `test/fixtures/golden/full-description-prompts.json`
regenerated with a throw-away spec (deleted afterwards; no `-u`) in the SAME commit; the golden diff is verified programmatically against `HEAD`; `bash arch-guard.sh --rebaseline` in the same commit; the whole logic suite run before and after and
compared test by test (a task passes only with zero NEW failing ids); `npx tsc --noEmit`; `bash arch-guard.sh`.

| Task | Commit | Golden delta (block 0 of the same ten cases: `doc/expert3d`, `doc/expert3d+hook`, `doc/c3d`, `html/expert3d`, `html/legacy`, `html/legacy+lang`, `html/c3d+customTemplate`, `c/expert3d-es`, `c/eu-en`, `c/us-uk`) | Suite before -> after | New failures | `master-system-prompt.ts` checksum |
|---|---|---|---|---|---|
| T30 | ecaa2fd | one contiguous replacement: the `LEAD-IN` bullet and the `Give lead-in and figcaption separate jobs` bullet become the three FR-7 bullets | 130 -> 110 failed | 0 | `39d1aa50...` -> `f7deb579...` |
| T31 | 6db2885 | one contiguous replacement spanning the STRICT INPUT SCOPE and INTERNAL RECONCILIATION sentences (Appendix B wording) | 110 -> 72 failed | 0 | -> `448f3ffe...` |
| T32 | d5d207a | a pure insertion (nothing removed): the `LIVELINESS` block after `${SENTENCE_LENGTH_RULES}` | 72 -> 0 failed | 0 | -> `57d54839...` |

In every golden diff: `translate/uk-user`, `translate/de-internal`, every block 1 and every `userContent` unchanged; the pre-Story `src/prompts/full-description.golden.spec.ts` (10 byte-equal tests) green after each regeneration;
`faq-pipeline.master-leak.spec.ts` and the FAQ positional slices green (not edited). `git diff --exit-code` over `task-c-description-prompts.json`, `task-c.ts`, `task-translate.ts`, `optimizer.ts`, `simplified-template-blocks.ts` exited 0 after each task.
The T30 hunk's specs (`master-system-prompt.placement`, `no-picture-references` 18/18, `image-markers`, the pre-Story golden), T31's (`operator-notes`, `task-c`, `optimizer`, `task-a-doc`, `task-translate.simplified`: 140 tests) and T32's
(`liveliness`, `task-c.master-reach`, `optimizer.master-reach`, `full-description.golden.us91`) are green. The image-markers span bytes are unchanged (its spec is green).

**T33 (verification only)**: the consumer specs of the breakdown (`task-c`, `task-c.faq`, `content-orchestrator.faq-standalone`, `optimizer`, `protected-name-precedence`, `image-figure-style.prompt-examples`, `task-c.description-bytes` (T20), `image-markers`,
`output-integrity-wiring`, `task-translate.simplified`, `task-c.master-reach`, `optimizer.master-reach`, `master-system-prompt.liveliness`, `faq-pipeline.master-leak`): 12 files / 612 tests green; the D15 oracle (`payload-oracle.d15`), `task-a.user-content.golden` and
`full-description.golden.us91` are part of the whole suite, which is 0 failed. File level: `git diff 6546db8 --exit-code` over `task-b.ts`, `task-c.ts`, `task-translate.ts`, `optimizer.ts`, `simplified-template-blocks.ts`,
`test/fixtures/golden/task-c-description-prompts.json` exits 0; the `.arch-guard-checksums` entries of `task-b.ts` and `task-c.ts` equal their values at 6546db8; `git diff 489fb4a` (the TEST_WRITING v3 commit) changed only `.arch-guard-checksums`,
`master-system-prompt.ts` and the golden `full-description-prompts.json` (the other golden fixtures, including the D15 `optimizer-faq-pre-change.json`, are byte-identical). Payload level: the amended Task C guard (T20, 96 cases, block 0 = live master) and the reach specs are green.
**Declared residual risks that no gate shows** (accepted by the owner): the translation-side behavioural risk (R1a, R1d: the self-scoping sentence of `LIVELINESS_RULES` versus FR-5's `deleted, not reworded`), the optimizer inheritance (R7a: the sentence does not name the
optimizer's task) and R22 (block 0 of Task C description translation and of the optimizer names `[Operator Notes]` although their `userContent` never carries it).
**T1 / T37 / T20 re-verified on the final tree**: `payload-oracle.d15`, `task-c.description-bytes`, `task-a.user-content.golden` green in the full run (221 files, 0 failed).

## Verification evidence (real output, final state of round 3)

```
$ npx vitest run --reporter=dot                        # npm run test:logic
 Test Files  221 passed (221)
      Tests  7620 passed | 3 skipped (7623)            # 0 failed; round 3 started at 130 failed / 7490 passed

$ npx tsc --noEmit                                     # npm run lint
(no output, exit 0)

$ bash arch-guard.sh
  ALL CHECKS PASSED

$ npm run test:components
 Test Files  3 passed (3)
      Tests  55 passed (55)

$ git diff 6546db8 --exit-code --stat -- src/prompts/task-b.ts src/prompts/task-c.ts src/prompts/task-translate.ts src/prompts/optimizer.ts src/prompts/simplified-template-blocks.ts test/fixtures/golden/task-c-description-prompts.json
(no output, exit 0)
```

The 3 skipped tests are pre-existing (3 skipped in round 2 as well; none added by this story). `git diff 6546db8 -- package.json vitest.config.ts`: empty. `.arch-guard-checksums` against BASE: only `task-a.ts`, `master-system-prompt.ts`, `output-validator.ts` differ.

## Findings

- **F8 (CLOSED in round 3 by TEST_WRITING v3; originally: T30 blocked, the test, not the code, had to change)**: `src/prompt-core/master-system-prompt.no-picture-references.spec.ts`, test "the heading "[NO PICTURE REFERENCES" is not located between the [IMAGE HANDLING] heading and FIGURE FORMAT",
  ends with `expect(MASTER_SYSTEM_PROMPT.indexOf('[NO PICTURE REFERENCES', at + 1), 'the heading occurs twice').toBe(-1)`. It passes with T27 and fails the moment T30 inserts the Specification's FR-7 literal `see [NO PICTURE REFERENCES]` (FR-7 Assert present,
  normative, confirmed by the owner; also asserted by `master-system-prompt.placement.spec.ts`), because that literal contains the prefix `[NO PICTURE REFERENCES`. Both cannot pass: the master must contain `see [NO PICTURE REFERENCES]` and must not contain the prefix twice.
  The intent of the check is "the block heading is not duplicated". A satisfiable form keys the second search on the heading itself (`'\n[NO PICTURE REFERENCES —'` or `'[NO PICTURE REFERENCES — body'`), or counts occurrences of `\n[NO PICTURE REFERENCES` at a line start. The builder did not
  edit the test and did not commit T30 (committing it would turn a previously green test red, a half-state).
- F1..F7 of round 1 are closed: F1, F2 (fixed in the specs), F3 (the component runner is green: 55 tests), F4 (T40, T12, T13, T38, T39 built against the new tests), F5 (T23, T24 built), F6 (T2/T3 narrowed), F7 (the `faq-pipeline` fixture and its guard spec were taken on by TEST_WRITING;
  `faq-pipeline.master-leak.spec.ts` is green with `LIVELINESS_RULES` present).
- **Known limits of the detector (not covered by any test; for the live runs T36)**: the picture-noun + optional word + show verb pattern (`image sensor displays ...`, `Bild ... zeigt`) can still flag a product sentence whose subject merely begins with a picture noun
  ("The photo sensor shows the focus"). The F6 sentences are all clean. A hit in a live run is a reported violation, never auto-fixed.
- The happy-dom stderr line `Failed to load iframe page "https://www.youtube.com/embed/abc123". Iframe page loading is disabled.` printed by `description-metrics.spec.ts` (video-figure test) is a logged DOMException from the test environment; the test passes.
- `docs/workflow/history.jsonl` and the workflow state files were not touched by this run.

## Open items

| Open | Blocks |
|---|---|
| T36 / T42 | manual, owner-run (H-OD11); T36 needs the finished master, which now exists (HEAD d5d207a plus this status commit) |

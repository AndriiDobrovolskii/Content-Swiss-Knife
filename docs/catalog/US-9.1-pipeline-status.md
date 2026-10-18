---
artifact: pipeline_status
story: US-9.1
version: 3
status: DRAFT
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-10-18T16:16:00Z
updated_at: 2026-10-18T20:08:00Z
supersedes: docs/catalog/US-9.1-pipeline-status.md#2
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 5
  - key: open_decisions
    version: 4
  - key: impact_analysis
    version: 4
  - key: implementation_plan
    version: 4
  - key: task_breakdown
    version: 3
  - key: plan_review
    version: 3
  - key: test_strategy
    version: 3
  - key: ac_test_matrix
    version: 3
  - key: test_generation_report
    version: 3
open_decisions_blocking: false
---

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

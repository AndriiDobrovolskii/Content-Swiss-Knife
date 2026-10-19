---
artifact: pr_summary
story: US-9.1
version: 1
status: ARCHIVED
owner: so-pr-preparer
created_at: 2026-10-19T15:56:00Z
updated_at: 2026-10-19T15:56:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 6
  - key: specification
    version: 8
  - key: implementation_report
    version: 3
  - key: quality_gate_report
    version: 3
  - key: verification_report
    version: 3
  - key: security_review
    version: 3
  - key: reconciliation_report
    version: 4
open_decisions_blocking: false
---

# Drafted Pull Request — US-9.1 (UPDATE of draft PR #142)

> **Not opened, not updated, not pushed.** This is drafted content only. `so-pr-creator` pushes
> and updates the Pull Request, and only on a separate explicit human instruction. Approving
> `HUMAN_PR_APPROVAL` (2026-10-19T15:52:50Z) did not carry that approval (AGENTS.md section 10).

## Decisions and open items for the human BEFORE any push (not resolved by this draft)

1. **Nothing has been pushed.** `origin/feat/US-9.1-no-picture-references-and-livelier-descriptions`
   is at `09f87dc`; local HEAD is `313f727` (9 local commits `1b73c8a..313f727`). Draft PR #142
   (base `main` `08d9609`, head `09f87dc`, 51 commits, `mergeable_state: clean`) still shows the
   state from before the operator-notes withdrawal and the waiver.
2. **~20 docs files are UNCOMMITTED and must be committed before any push.** `git status`
   shows 20 modified files, all under `docs/`: the Story (v6), specification (v8), plan, task
   breakdown, test artifacts, clarification/impact/decisions/spec-review/plan-review records,
   the five reports (implementation, quality gate, verification, security, reconciliation),
   `docs/catalog/US-9.1-pipeline-status.md`, `docs/workflow/workflow-state.yaml` and
   `docs/workflow/history.jsonl`. This file (`docs/pr/US-9.1-pr-summary.md`) is a 21st, new
   file. If they are not committed, the pushed branch carries code whose approvals, waiver and
   gate records are absent (the verifier's F1: the 14:40Z FROZEN-approval event the two FROZEN
   removal commits cite is itself not in HEAD). Committing them is a separate step with its own
   instruction; this stage did not do it.
3. **The PR title and body on GitHub are stale and must be replaced, not appended to.** The
   current title names "operator notes" (withdrawn) and the body says AC-11/AC-12 are "not yet
   evidenced", lists 7620 / 55 test counts and claims `validate:harness` passed. Every one of
   those is superseded below.
4. **Branch is 5 commits behind `origin/main`** as of the last local fetch (merge base
   `6546db8`; `origin/main` `08d9609` has PRs #137-#141). No file in `6546db8..origin/main`
   overlaps any file this branch changes, and `git merge-tree --write-tree origin/main HEAD`
   exits 0 (clean). No rebase is needed to open; the human decides whether to update the branch.
   Local `main` is stale (`1b444e2`); do not compare against it. GitHub's own
   `mergeable_state` was last read as `clean` for head `09f87dc`.
5. **The PR ships with its two headline outcomes unmeasured** (AC-11 / AC-12 WAIVED). The
   human approved with that disclosed; the reviewer must see it in the body, which it does.
6. **Keep the PR in draft** until items 1 and 2 are done; marking it ready for review is the
   human's step.

## Title

```
feat(US-9.1): no picture references in generated descriptions and livelier uk-UA text
```

## Body

```markdown
Closes US-9.1 — Stop generated descriptions from pointing at their pictures and make the uk-UA
text less dry (Creality Pika regression).

**Read this first: AC-11 and AC-12 (live-run acceptance) were WAIVED by the owner (Story v6,
2026-10-19) and were NOT measured.** There is no `tools/measure-description.ts` output, no
product list and no run count for them. The two headline outcomes of the Story — 0 picture
references and 0 invented numbers in real generations — rest on the owner's word ("accepted on
my manual testing"), not on script evidence. The gate, review and tests below prove the prompt
text, the detector, the validator and the measurement script; they do not prove model behaviour.

## What changed

- **No picture references.** The shared master prompt gets a `[NO PICTURE REFERENCES]` rule
  (`NO_IMAGE_DEIXIS_RULE`), the Vision pre-pass asks for product facts instead of picture
  descriptions, the seven video `LEAD_IN_TEMPLATES` lose their spatial pointers, and the Doc /
  HTML figure placement now asks for a preceding body paragraph that states a product fact. A
  new detector (`src/utils/image-deixis.ts`, seven base languages) feeds `validateGeneratedHtml`
  (`image-deixis`, level `warning`) and `figureCaptionWarnings` (`image-caption-deixis`, level
  `warning`). Warnings never block output.
- **Livelier text.** A shared `LIVELINESS_RULES` block (SCENE, RHYTHM, HONEST LIMITS, HOOK) is
  interpolated into the master after `SENTENCE_LENGTH_RULES`; a store's own voice block wins on
  conflict, and the block states it governs writing a new description while a translation keeps
  the source's sentences. The EXPERT3D overlay gets APPLICATIONS and HEADINGS wording.
- **Measurement script.** `tools/measure-description.ts` + `src/utils/description-metrics.ts`
  compute the acceptance metrics (AC-10). The script exists and is tested; it was not run on live
  output (see above).
- **Operator-notes feature: added earlier in this branch, then withdrawn by the owner (Story v5).**
  The four optional Generator textareas, `ProductInput.operatorNotes`, the `[Operator Notes]`
  prompt block and the `numericFidelitySources` extension were removed again in the last 8
  commits. The net diff against `main` contains none of that code: `types.ts`, `app.component.ts`
  and `.html` are byte-equal to base, `git grep -i "operator.\?notes" -- src tools server
  ':!*.spec.ts'` returns nothing, and exclusion pins fail if it comes back. The earlier
  add/remove commits remain in branch history.
- **Baseline fixtures.** Three reference files from the git-ignored `Knowledge/Issues/4` are
  tracked under `test/fixtures/baseline/` (owner decision H-OD13).

Net against `main` (`6546db8`..HEAD, non-docs): 63 files, 49 added and 14 modified, 0 deleted,
+7511 / -94. 60 commits.

## Why

Creality Pika (store EXPERT3D, uk-UA) produced 35 picture references (paragraph above each of 19
figures and 16 of 19 figcaptions: «показано на зображенні», «На фото…», «Колаж показує…») and
dry text (81 sentences, mean 12.2 words, «тож» 7 times, hook describing a photo). Six independent
prompt/utility sources asked for or modelled that phrasing; the figcaption is the Vision
pre-pass `description` copied unedited, so fixing only the description prompt would not have
fixed captions. Source: Story `docs/stories/US-9.1-no-picture-references-and-livelier-descriptions.md`
(Observed section) and `Knowledge/Issues/4/`.

## How the acceptance criteria were verified

Full matrix: `docs/tests/US-9.1-ac-test-matrix.md` (v5). Reconciliation
(`docs/reconciliation/US-9.1-reconciliation-report.md` v4) checked every criterion at three
levels: a matrix row exists, the named test file and test exist, and the test body would fail
if the criterion were violated.

| AC | Verified by | Result |
|---|---|---|
| AC-1 | `src/prompts/vision-prepass.no-picture-references.spec.ts` | pass |
| AC-2 | `src/prompt-core/constants.no-image-deixis.spec.ts`, `master-system-prompt.{no-picture-references,video-placement,grounding-lock,placement}.spec.ts`, `src/prompts/full-description.golden.us91.spec.ts`, `task-c.master-reach.spec.ts`, `optimizer.master-reach.spec.ts` | pass |
| AC-3 | `src/prompts/task-a-doc.figure-placement.spec.ts`, `task-a.deixis-wording.spec.ts`, `task-a.user-content.golden.spec.ts`, `src/prompt-core/constants.c3d-override.spec.ts`, `src/utils/output-validator.image-manifest-wording.spec.ts`, `video-manifest.pointer-free.spec.ts`, `src/services/content-orchestrator.deixis-messages.spec.ts` | pass |
| AC-4 | `src/utils/video-manifest.pointer-free.spec.ts`, `video-manifest.deixis.spec.ts` | pass |
| AC-5 | `src/utils/image-deixis.spec.ts` | pass |
| AC-6 | `src/utils/image-deixis.spec.ts` (`collectFigureDeixis`) | pass |
| AC-7 | `src/utils/output-validator.image-deixis.spec.ts`, `image-placeholder.deixis.spec.ts`, `image-deixis.spec.ts`, `image-deixis.import-cycle.spec.ts` | pass |
| AC-8 | `src/prompt-core/constants.liveliness.spec.ts`, `master-system-prompt.liveliness.spec.ts`, `constants.expert3d.spec.ts`, `constants.c3d-override.spec.ts`, `src/prompts/task-c.description-bytes.spec.ts`, `payload-oracle.d15.spec.ts`, `src/utils/structural-parity.sentence-blind.spec.ts` | pass; residual declared a gap (below) |
| AC-9 | withdrawn (Story v5); exclusion pins: `test/operator-notes-source-scan.spec.ts`, `src/app/app.component.no-operator-notes.spec.ts`, `src/prompt-core/constants.numeric-source-rules.spec.ts`, `master-system-prompt.source-scope.spec.ts`, `src/prompts/full-description.golden.fr43-oracle.spec.ts`, `src/services/content-orchestrator.stray-operator-notes.spec.ts`, `history.service.legacy-entry.spec.ts` | pass as a traced withdrawal |
| AC-10 | `src/utils/description-metrics.spec.ts`, `test/measure-description.cli.spec.ts` (spawns the real script) | pass |
| AC-11 | none: no test, no run, no script output | **WAIVED by the owner (Story v6, 2026-10-19), NOT MEASURED** |
| AC-12 | none: no test, no run, no script output; the AC-10 specs are the instrument, not evidence | **WAIVED by the owner (Story v6, 2026-10-19), NOT MEASURED** (soft and manual items not evidenced either) |

Reconciliation ran the 38 spec files the matrix names for AC-1..AC-8, AC-10 and the exclusion
pins: 1318 tests, 1318 passed. AC-1..AC-8 and AC-10 clear all three levels; AC-9 clears as a
withdrawal; AC-11 and AC-12 are listed as non-blocking findings F1/F2 and are not reported as
passed or measured. The waiver is a recorded Story amendment (v6) backed by the human-approved
Specification v8 reading rule (OD-27(b)); it covers the delivery as committed at the time of the
decision (the last source commit `86b0d62` precedes it; HEAD `313f727` is docs-only).

## Test plan

Real commands, real results — from `docs/verification/US-9.1-quality-gate-report.md` (v3), run
on HEAD `313f727`, Node v24.15.0, on the non-doc tree identical to what the PR contains.

- [x] `npm run lint` — exit 0 (`tsc --noEmit`, no output)
- [x] `npm test` — **run 1 FAILED (exit 1), run 2 passed (exit 0)** on the same unchanged tree.
  Run 2: logic 221 files / 7569 passed / 3 skipped (7572); components 2 files / 32 passed. Run 1:
  220 files passed / 1 failed; 7568 passed / 1 failed (see "Disclosed flake")
- [x] `npm run test:coverage` — exit 0; global 94.37 statements / 88.12 branches / 96.41
  functions / 95.02 lines (floors 80/75/80/80); `src/domain` 99.26 / 97.19 / 100 / 99.17;
  `src/render` 100 / 98 / 100 / 100; `src/prompt-core` 96.1 / 88.7 / 100 / 97.62; every floor holds
- [x] `npm run build` — exit 0 (three known pre-existing CommonJS warnings: `file-saver`,
  `js-beautify`, `jszip`)
- [x] `bash arch-guard.sh` — exit 0 (Rules 1, 3, 4 OK; "All frozen files unchanged" = the five
  checksums match; `--rebaseline` was not run by the gate)
- [ ] `npm run validate:harness` — not applicable, not run (no `.claude/` skill, harness file or
  harness tool changed; the `docs/workflow/` data files are orchestrator records, not harness)
- [ ] **Not done, by waiver:** the six live acceptance runs of AC-11/AC-12 with
  `node tools/measure-description.ts --html <generated> --input <original>`. A reviewer who wants
  evidence rather than the owner's word can still run them; the procedure is retained in the
  Specification (FR-34).
- [ ] Read the diffs of the 14 FROZEN-file commits and the regenerated
  `test/fixtures/golden/full-description-prompts.json` (block 0 of ten cases only).

Test-count history, so no deletion is hidden: BASE `6546db8` logic 185 files / 6380 + 3 skipped,
components 2 / 32; before the operator-notes removal logic 221 / 7620 + 3 skipped, components
3 / 55; now logic 221 / 7569 + 3 skipped, components 2 / 32. The drop is the owner-decided
removal of the operator-notes feature's own specs (12 files deleted, 7 added, see the
implementation report); skipped count unchanged at 3 (pre-existing live-proxy tests).

### Disclosed flake

`test/removal.spec.ts:73` ("no CONSUMABLES_ constant … referenced anywhere", US-2.2) timed out at
the default 5000 ms in the first `npm test` run of the final gate (under full-suite worker load;
the test text-scans the whole tree). On the same unchanged tree it passed in the second `npm
test`, in the coverage run, and alone in 402 ms (19/19 in the file; reconciliation re-ran it:
19 passed). It is a timing flake, not an assertion failure, belongs to US-2.2, is not a US-9.1
criterion and was NOT fixed here; a loaded machine can reproduce the red run. A per-test timeout
would be a separate test-writing change.

## Rules checked that nothing automates

- **Architecture Rule 2** (retrieval separate from generation): the verifier read the removal
  diff of `content-orchestrator.service.ts` (6 deleted lines), `app.component.ts/.html`,
  `task-a.ts`, `tools/measure-description.ts` and `types.ts`, and scanned added production lines
  for `fetch(`, `serper`, `ground`, `anthropic`, `api key`, URLs: no hit. `server/**`,
  `RetrievalProvider` and `RetrievalService` are not in the diff; no fetch/search was added to
  generation and no model call to retrieval. Google Grounding is not reintroduced. Holds.
- **AGENTS.md section 4 criteria in play** (the prompt changed): verified for prompt text,
  validator and fixtures only. `output-validator.ts` has no change since `09f87dc`;
  `meta-description-currency` stays disarmed (pinned by `seo-currency-wiring.spec.ts`). Section 4
  compliance of **real generations** (spec count in = out, figures, video embed in every
  language, meta limits, 0 picture references, 0 invented numbers) is **not verified** — that is
  what the waived AC-11/AC-12 runs were for.
- **STORE_REGISTRY as the only source:** holds (no locale, language list or currency added; one
  pre-existing `?? 'uk-UA'` default in the developer CLI, unchanged, verifier F4).
- **Prompt-caching block separation:** holds (the `task-a.ts` diff changes only the `userContent`
  template; block 0 shrinks by static text only).
- **FROZEN files:** `task-a.ts`, `master-system-prompt.ts` and `output-validator.ts` were edited
  with the owner's per-file "modify <filename>" instructions (2026-10-18 for the original
  hunks; 2026-10-19 for the operator-notes withdrawal hunks). 14 commits touch a FROZEN file and
  each carries `.arch-guard-checksums` re-baselined in the same commit. `task-b.ts` and
  `task-c.ts` are byte-identical to base. See the audit note below.

## Security

Review: `docs/reviews/security/US-9.1-security-review.md` (v3) — PASS, 0 blocking, 1
non-blocking, 4 observations, plus one stated coverage limit. All five surfaces (secret
containment, DomSanitizer bypass, editor schema, prompt injection, proxy/errors/telemetry) are
CLEAR; the attack surface is smaller than at `09f87dc` and no new `bypassSecurityTrust*` call,
setting, dependency or `server/**` change was introduced.

- **N-1 (non-blocking, residual of the withdrawn feature; not widened):** `HistoryService` is
  unchanged. A history entry saved while the operator-notes feature existed keeps a clear-text
  `operatorNotes` key in `localStorage` (`seo_gen_history`) until it rotates out of the 20-item
  list or the user clears history. It is never read, never reaches a prompt or a template (a
  pinned spec proves it inert), and NFR-13 forbids a migration. **Optional note for operators:**
  anyone who typed confidential material into those fields can use "Clear History" to remove it.
- **L-1 (coverage limit created by the waiver, not a finding):** no live generated output exists
  for the final prompt and the review could not inspect any. Unreviewed at runtime: whether real
  model output (from real Serper-fetched pages and `supplementalContent` / `customInstructions`)
  ever contains injected or unsafe markup, `javascript:`/`data:` URLs or text obeying an
  instruction hidden in a fetched page. The static argument (every generated string passes
  `html-cleaner.ts` and the validator before `safeHtml`) and their unit tests stand; one
  inspected live generation would close it, outside this Story.
- **O-1..O-4 (pre-existing observations, unchanged):** unrestricted `cors()`; unchecked
  `localStorage` parse (stray keys inert); stored `item.output` restored through the single
  `bypassSecurityTrustHtml`; `supplementalContent` / `customInstructions` are unfenced free text
  in `userContent`.

## Notes for the reviewer

- **Waiver (repeated because it is the main risk).** AC-11/AC-12 are waived and unmeasured; no
  script output, product list or run count exists. Nothing in this PR proves a model told these
  things stops pointing at pictures; what is proven is that the prompt text is delivered, the
  detector and validator behave, and the instruments work. The detector reports only forms its
  patterns know, and no live figcaption was read, so unknown forms are unobserved (reconciliation
  F3).
- **Audit note on the FROZEN-file approval record (`docs/workflow/history.jsonl`).** The
  "modify master-system-prompt.ts, modify task-a.ts, так" owner-instruction event the withdrawal
  commits `fd9b052` and `439cc1e` cite carries the timestamp `2026-10-19T14:40:00Z`, which is an
  ESTIMATED stamp (the orchestrator wrote stage times between 07:50Z and 16:40Z that day from
  estimate, not the clock; a disclosure event records this). It is LATER than both commits
  (authored 12:15:50Z and 12:17:48Z). The owner's words were sent at about 11:51Z, before the
  commits, as shown by the local, off-repo Claude Code session transcript (corroboration, not
  tamper-proof evidence). The scope wording "withdrawal hunks only" in that event is the
  orchestrator's paraphrase; the owner's verbatim words name only the two files plus "так". The
  hunk limits come from plan v6 T43/T44 and OD-25, and the diff stays inside them. The history
  file is not monotonic by `ts` for the same reason. Git alone cannot prove the approval
  preceded the commits.
- **Known residuals, declared not hidden:** AC-8 translator/optimizer behaviour under the
  shared master block 0 cannot be tested in the gate (Task C description translations and the
  optimizer inherit the master text through `systemBlocks[0]`; pinned only by the golden `c/*`
  cases); FR-44 item 3b is proven by absence of the reading code, not by executing
  `restoreHistory`.
- **Dropped guard:** the test "a number only in `supplementalContent` is not grounded by it"
  went with the withdrawn FR-30 (reconciliation judged it non-blocking). No test turns red if
  someone later adds `supplementalContent` to `numericFidelitySources`.
- **Matrix defect (reconciliation F6):** the `AC-8 (residual R1a, R1d, R7a)` row in the AC-test
  matrix reads "green" with test file `-`; it is an untestable residual, not a passing test.
- **Question carried from the first draft of this PR:** confirm that
  `test/fixtures/baseline/prompt-changes.spec.md` (an internal planning document) should stay in
  git history.
- Operator-notes add and withdraw commits are both in this branch's history by design (the
  owner's decision to withdraw came mid-delivery); review the net diff, not the intermediate
  commits.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Pre-flight record

| Check | Result |
|---|---|
| All four upstream reports opened, verdict `PASS` | Yes. quality_gate_report v3 PASS, verification_report v3 PASS (6 non-blocking findings), security_review v3 PASS (0 blocking), reconciliation_report v4 PASS (non-blocking F1-F7). implementation_report v3 also opened (gate outcome PASS). All five front matter `status: APPROVED`; HUMAN_PR_APPROVAL recorded in `history.jsonl` at 2026-10-19T15:52:50Z. |
| Quality gate has real output for all six commands | Five of six have real recorded output (lint, npm test runs 1 and 2, coverage, build, arch-guard); the sixth, `validate:harness`, is recorded N/A with decision evidence and was not run. Run 1 of `npm test` is a recorded red. |
| Verifier addressed Rule 2 | Yes, section 1 of verification_report v3 (diff read; "holds"). |
| No unresolved blocking security finding | Yes: 0 blocking; N-1 non-blocking, O-1..O-4 observations, L-1 stated limit. |
| Every `AC-n` cleared all three reconciliation levels | AC-1..AC-8 and AC-10: yes. AC-9: yes as a traced withdrawal. **AC-11 and AC-12: NO, WAIVED by the owner (Story v6) and unmeasured**; reconciliation lists them as non-blocking findings under the approved OD-27(b) reading rule and a human accepted that at HUMAN_PR_APPROVAL. Disclosed in the body. |
| Commits contain only what `task_breakdown` named | Round-4 commits (`1b73c8a..86b0d62`) map to T43-T49 (verifier section 7, re-read against `git diff --stat`); `313f727` is one docs file. Earlier-round scope was checked in earlier verifier versions; baseline-fixture commit `964468c` is owner decision H-OD13. No drive-by refactor found. |
| No fixup-run, no `--no-verify`, no phase batching | 60 commits, all `type(US-9.1): ...` subjects in English, none is a "fix typo / fix again" run. Three subjects contain "fix" (`3ef0f1a` narrows the detector patterns; `156d99f` adds tests for answered questions and fixes two defective specs; `5035e96` a spec assertion) — each is a self-contained logical change, noted not blocking. No `--no-verify` mention in any message, no active hook in `.git/hooks`; git cannot prove a skipped hook. One Story only, no phase batching. |
| Commit message format and attribution | Every one of the 60 commits ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (the 9 new ones too); author Sergiy Bruhov on all; subject lines conform to `type(US-9.1): ...`. |
| Frozen-file change has same-commit re-baseline | Yes: 14 of 14 commits that touch a FROZEN file also list `.arch-guard-checksums` (`7397081`, `7c8fae9`, `ff8ad92`, `7958c7f`, `266cd9c`, `87fb3c0`, `a0e33a5`, `3110e94`, `18cad1f`, `ecaa2fd`, `6db2885`, `d5d207a`, `fd9b052`, `439cc1e`). Approval-record timing caveat disclosed in the body. |
| No secret in any commit, including removed ones | Yes: no `.env`/key/pem filenames and no key-shaped string (`sk-ant-`, `AIza`, private key blocks, bearer tokens) in added lines of any commit in `6546db8..HEAD` (including deleted-later code). |
| `.env.example` current with placeholders | Yes: no setting added or renamed (`git diff 6546db8..HEAD` on `.env.example`, `README.md`, `server/`, `package.json`, `angular.json`, `tsconfig.json`, `vitest.config.ts`, `arch-guard.sh` is empty); `.env.example` already carries placeholders only. |
| Nothing was pushed, opened or merged | Yes. Only read-only git/GitHub calls were made (`git log/show/diff/merge-tree/rev-parse`, one GitHub `pull_request_read`). |

---
artifact: verification_report
story: US-9.1
version: 3
status: APPROVED
owner: so-implementation-verifier
stage: IMPLEMENTATION_VERIFICATION
created_at: 2026-10-19T15:45:00Z
updated_at: 2026-10-19T15:45:00Z
supersedes: 2
inputs_consumed:
  - key: story
    version: 6
  - key: specification
    version: 8
  - key: implementation_plan
    version: 7
  - key: task_breakdown
    version: 6
  - key: implementation_report
    version: 3
  - key: quality_gate_report
    version: 3
open_decisions_blocking: false
---

# Implementation Verification - US-9.1 (track prompt), round 3 (records refresh after the AC-11/AC-12 waiver)

Verdict: **PASS** (6 non-blocking findings). HEAD `313f727`. The reports were not used as evidence; each check below is against
the diff, git objects, `docs/workflow/history.jsonl` and, for the approval time only, the local Claude Code session transcript.
The mechanical gate was not re-run (different job).

**Tree state, confirmed.** `git diff HEAD -- src tools test server .arch-guard-checksums arch-guard.sh package.json` is empty,
`git status --untracked-files=all` lists no path outside `docs/`, and the 20 modified files are all `docs/`. The non-doc tree at
HEAD is the tree v2 verified (`09f87dc..HEAD`: 38 non-doc files, 752 insertions / 1773 deletions). Story v6 / Spec v8 / Plan v7 /
Tasks v6 reach no source, prompt, golden, server or tool file (the waiver is a record change), so the v2 code conclusions are
re-derived below from the diff rather than copied, and hold.

## 1. Architecture Rule 2 (retrieval separate from generation) - holds

Review-only check (arch-guard does not implement Rule 2). Read in this round: the whole removal diff of
`content-orchestrator.service.ts` (6 deleted lines: the `OPERATOR_NOTE_FIELDS` import, one `numericFidelitySources` entry, a
doc comment), `app.component.ts` / `.html` (removals only: component import, form state, labels, `inputPart()` spread,
`restore`/`clear`), `task-a.ts` (one import and one `userContent` interpolation removed; `buildImageBlock`, `buildVideoBlock`,
`buildMarkerBlock` untouched local string builders), `tools/measure-description.ts` (four flags removed; still offline), `types.ts`
(types removed). Added-line scan of the non-spec, non-fixture diff for `fetch(|serper|ground|anthropic|api key|http(s)://`: no hit.
`server/**`, `RetrievalProvider`, `RetrievalService` are not in the diff; no fetch/search was added to generation and no model
call to retrieval. Google Grounding not reintroduced.

## 2. AGENTS.md section 4 HTML criteria (prompt changed) - holds for text and fixtures; real generations unverified

- `git diff 09f87dc HEAD -- master-system-prompt.ts` is exactly two hunks in `[SOURCE FIDELITY]` (STRICT INPUT SCOPE,
  INTERNAL RECONCILIATION), +2/-3 lines. No [VIDEO], [IMAGE HANDLING], PLACEMENT, SPACING, SEO, figure/`figcaption`/`loading`/
  `decoding`, video-embed, spec-fidelity or `<hr>` text is in the diff. `git diff 6546db8 HEAD` on the master has 0 lines
  mentioning `SOURCE FIDELITY` or `Operator`: the two bullets are byte-equal to the branch base text.
- Golden `full-description-prompts.json`: 10 changed lines, each the `text` of `systemBlocks[0]` of the ten cases; `cache` and
  `userContent` lines are context only. `task-a.ts` change is limited to the `userContent` template.
- `output-validator.ts`: zero diff since `09f87dc` and since base. **`meta-description-currency` stays disarmed**: the validator,
  `src/services/seo-currency-wiring.spec.ts` and the orchestrator's disarming comment block (`content-orchestrator.service.ts`
  line 96 onward) are untouched.
- Not touched by the removal: Product itemtype, number-unit spacing, spec-count fidelity, meta limits, no-Markdown, `<hr>`.
- **Limit (F3, unchanged in substance).** Story v6 records AC-11 and AC-12 as WAIVED (owner, 2026-10-19, "not measured"). There
  is still no live model output for the post-removal prompt, no `tools/measure-description.ts` output, no product list and no run
  count. Section 4 compliance of **real generations** (spec count in = out, figures, video embed in every language, meta limits,
  no anglicisms, 0 picture references, 0 invented numbers) is **not verified** by this report; it was verified for prompt text,
  validator and fixtures only. The waiver changes the acceptance status, not that fact.

## 3. STORE_REGISTRY as the only source - holds

Added-line scan of the non-spec diff for locale codes, currency characters and URLs: the only hit is the `--locale uk-UA` usage
comment of `tools/measure-description.ts`. `task-a.ts` still takes the image base URL from `store.imageBaseUrl`. No language
list, locale set or currency was added. (The `?? 'uk-UA'` default at `measure-description.ts:85` is pre-existing: F4.)

## 4. Prompt-caching block separation - holds

The `task-a.ts` diff has no line containing `systemBlocks` or `cache`; it changes only the `userContent` template. `[Operator
Notes]` left `userContent`. Block 0 (master) shrinks by static text only; no per-store or per-run interpolation entered the cached
block. `task-a-doc.ts` and `constants.ts` have zero diff.

## 5. FROZEN files (section 9)

| File | Changed `09f87dc..HEAD` | Evidence |
|---|---|---|
| `src/prompts/task-b.ts` | no | zero diff and no commit in the range; blob hash equals the `.arch-guard-checksums` line |
| `src/prompts/task-c.ts` | no | same |
| `src/utils/output-validator.ts` | no | same |
| `src/prompt-core/master-system-prompt.ts` | `fd9b052` only | 2 hunks, T43 withdrawal |
| `src/prompts/task-a.ts` | `439cc1e` only | import + interpolation, T44 withdrawal |

- **Same-commit re-baseline (recomputed this round):** CRLF-filtered blob hash (`git cat-file --filters`, the form arch-guard
  hashes) of master at `fd9b052` = `0fe9a169...`, equal to the checksum line in that commit; task-a at `439cc1e` = `dc49a440...`,
  equal to the line in that commit. Each commit changes exactly one checksum line. All five HEAD blobs equal the five lines of the
  HEAD `.arch-guard-checksums`. The other removal commits (`19ed848`, `4556cb4`, `291bc1e`, `bad5161`, `86b0d62`) touch no FROZEN
  file and no checksum line.
- **Hunk fidelity to the grant:** the two commits' hunks are exactly "T43: the two [SOURCE FIDELITY] bullets" and "T44: import +
  interpolation of `buildOperatorNotesBlock`", every other US-9.1 hunk of both files kept.
- **Recorded approvals (`docs/workflow/history.jsonl`, actor `sbruhov@gmail.com`):**
  - `2026-10-18T15:24:23Z` (committed in HEAD): verbatim `modify src/prompts/task-a.ts, modify src/utils/output-validator.ts,
    modify src/prompt-core/master-system-prompt.ts`, one instruction per file, "this session only", task-b.ts/task-c.ts not
    covered. Session transcript timestamp of the owner message: `2026-10-18T15:24:13Z` (10 s earlier than the log). It covers the
    original US-9.1 hunks. The removal does **not** rely on it (F5).
  - `2026-10-19T14:40:00Z` (working tree only, F1): verbatim `modify master-system-prompt.ts, modify task-a.ts, так`. This is the
    grant the removal rests on; see F1/F2 for what it proves.
  - `task-b.ts`, `task-c.ts`, `output-validator.ts`: unchanged by the removal commits.
- The check passes on the code side (approval recorded by file, hunks within scope, re-baseline in the same commit). The
  evidential limits of the approval record are F1/F2 below.

## 6. Angular and server conventions - holds

The removal deletes a standalone component and a plain-class form state (no `NgModule`, no RxJS, no DI) and reduces the `imports`
array of the standalone `AppComponent`. No SDK import, no prompt string in a service, no `server/**` or `package.json` diff, no
secret or log line, no usage-store schema change. Residual scan of `operator.?notes|operatorNotes` over production code: zero hits;
remaining hits are specs/fixtures carrying the absence pins and the legacy-history test. A legacy `operatorNotes` property on a
stored history entry is ignored (not read by `restoreHistory` or `buildGeneratorInput`).

## 7. Scope discipline

Every changed production file maps to T43-T49 (master T43, task-a T44, orchestrator T45, component/state/app wiring T46, CLI flags
T47, leaf module T48, type T49). Comment/usage text edits in `description-metrics.ts` and `measure-description.ts` describe the
removed flags. Non-production edits: spec files (8 deleted, others new or edited), two fixtures, the golden JSON. No drive-by
refactor, rename or unrelated comment deletion found. The Story v6 / Spec v8 / Plan v7 / Tasks v6 refresh changed only `docs/` files (uncommitted).

## Findings (all non-blocking)

| ID | Finding |
|---|---|
| F1 | **Confirmed, still open.** The `2026-10-19T14:40:00Z` approval event is not in HEAD: `git show HEAD:docs/workflow/history.jsonl` has 0 occurrences of it (585 lines at HEAD; 624 in the working tree = 39 added lines, 0 deleted or changed). `fd9b052` and `439cc1e` therefore sit in a committed tree whose approval record, and the disclosure event of F2, are uncommitted. Git cannot attest when, or whether, those lines were written. Fix: commit them with the stage record. |
| F2 | **Confirmed and re-characterised.** v2 guessed "local-time mislabelled"; the 12:41:12Z event instead discloses that `ts` values between `07:50:00Z` and `16:40:00Z` were written by the orchestrator as estimated stage times, not read from the clock ("order is correct, absolute times are not"). The 14:40:00Z approval stamp is in that range, so it is an estimate. Real times: the owner message `modify master-system-prompt.ts, modify task-a.ts, так` is in the Claude Code session transcript at `2026-10-19T11:51:38Z`; `fd9b052` is authored `12:15:50Z`, `439cc1e` `12:17:48Z` (author times). The estimated stamp (14:40Z) postdates both commits by about 2h25m; the real order is approval (11:51:38Z) then commits (+24 min). Events from `12:41:12Z` on use the real clock (transcript owner messages at `14:41:50Z`, `14:50:04Z` match the log within seconds). Side effect: the file is not monotonic by `ts` (the `12:41:12Z` disclosure follows the `16:40:00Z` event); anything that sorts by `ts` misorders it. The disclosure gives a time range, not a list of affected events. |
| F3 | Carried from v1/v2, now owner-accepted: AC-11/AC-12 are WAIVED (Story v6; "not measured"); no live output exists for the final prompt. Section 4 criteria on real generations, and the headline outcomes (0 picture references, 0 invented numbers), remain unverified by any evidence in the tree or record; the only statement is the owner's unmeasured "manual testing" (no script output, products or run count). |
| F4 | Carried: `tools/measure-description.ts:85` defaults `locale` to `'uk-UA'` outside `constants.ts` (developer CLI; `MASTER_LOCALE` exists). Unchanged by the removal. |
| F5 | The 2026-10-18 grant says "this session only"; the removal rests on the separate 2026-10-19 grant, so no reliance on the older grant remains. |
| F6 | The scope limit "withdrawal hunks only, `--rebaseline` in the same commit, FR-11 hunks kept" in the 14:40Z event is the orchestrator's paraphrase; the owner's verbatim words name only the two files plus "так". The hunk limits come from plan v6 T43/T44 and OD-25 (a proposed default accepted at the spec gate), not from the owner's sentence. The diff stays inside them either way. |

## What an auditor can and cannot prove from the record

Can prove (from git alone): the only FROZEN edits since `09f87dc` are the two hunks above; each is re-baselined in its own commit
and the checksum lines match the blobs; task-b.ts, task-c.ts and output-validator.ts are byte-identical; the commit messages say
"owner-approved" (self-asserted); a 2026-10-18 grant for the same three files is committed in history and matches the owner's
session message to within 10 s.

Can prove (adding the local, off-repo session transcript): the owner sent exactly `modify master-system-prompt.ts, modify
task-a.ts, так` at `2026-10-19T11:51:38Z`, before both FROZEN commits. This source is a local file, not committed, not signed,
and editable by anyone with the machine; it is corroboration, not tamper-proof evidence.

Cannot prove: that the approval preceded the commits from `history.jsonl` alone (its stamp is an estimate that postdates them, the
event is uncommitted, and file line order is not attested by git); that the actor field `sbruhov@gmail.com` is more than the
orchestrator's attribution; that the owner authorised the narrower "withdrawal hunks only" scope (F6); that any live generation
meets section 4 (F3); the real time of any other event in the 07:50-16:40Z estimated range without the transcript.

## Which checks were review-only

Rule 2 (no tool checks it); FROZEN approval, its scope and the same-commit re-baseline (arch-guard compares only checksums, not
approval, scope or commit); hunk-vs-approval fidelity; prompt-caching block structure (no test pins block counts for the changed
text); STORE_REGISTRY literal scan (partly pinned by NFR specs; the CLI default is not); survival of the section 4 wording. The
disarmed `meta-description-currency` rule is pinned by `seo-currency-wiring.spec.ts`; the diff does not touch it.

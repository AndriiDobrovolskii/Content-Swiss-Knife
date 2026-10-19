---
artifact: reconciliation_report
story: US-9.1
version: 4
status: APPROVED
owner: so-reconciliation-reviewer
stage: RECONCILIATION
created_at: 2026-10-19T12:48:07Z
updated_at: 2026-10-19T16:20:00Z
supersedes: docs/reconciliation/US-9.1-reconciliation-report.md#3
inputs_consumed:
  - {key: story, version: 6}
  - {key: specification, version: 8}
  - {key: ac_test_matrix, version: 5}
  - {key: implementation_report, version: 3}
  - {key: verification_report, version: 3}
  - {key: quality_gate_report, version: 3}
  - {key: security_review, version: 3}
open_decisions_blocking: false
---

# US-9.1 Reconciliation Report, round 4 (branch feat/US-9.1-no-picture-references-and-livelier-descriptions, BASE 6546db8, HEAD 313f727)

Verdict: **PASS**, with non-blocking findings. AC-1 to AC-8 and AC-10 clear all three levels. AC-9 is a withdrawn criterion, proven by
exclusion pins. **AC-11 and AC-12 are WAIVED (owner, Story v6, 2026-10-19; not measured).** They are not reported here as passed, covered or
measured, and the headline outcomes of the Story (0 picture references, 0 invented numbers) are **unmeasured**. This result is not human
approval (AGENTS.md section 10); `HUMAN_PR_APPROVAL` is where a human accepts or rejects the unmeasured outcome.

## Why a waiver can sit beside a PASS (the one judgement in this round)

The skill says `PASS` requires every `AC-n` to clear three levels and that there is no partial pass. A waived criterion cannot clear
level 2 or 3, so the question is whether this stage may let it through. I did not decide that myself. What changed since v3 (BLOCKED):

1. **A recorded, versioned Story amendment exists.** Story v6 "Amendment" carries the owner's decision verbatim ("Waive the AC-11/AC-12
   hard script criteria for US-9.1; accepted on my manual testing"; `docs/workflow/history.jsonl`, actor sbruhov@gmail.com, ts
   2026-10-19T14:50:23Z), a "What changed / Why" note, and a version bump. This is route (a) of my v3 report, in the form v3 named.
   The criterion text is kept unchanged and marked WAIVED; the Story says outright that nothing was measured.
2. **The approved Specification tells this stage what to do with a waived row.** Specification v8 (FR-34, FR-35, wording of OD-26 to
   OD-32) was approved by a human at HUMAN_SPEC_APPROVAL (history, 2026-10-19T15:10:58Z, "Approver comment: none", PROPOSED DEFAULTS
   accepted as written). OD-27(b): RECONCILIATION "records them as waived and unmeasured, lists them in `non_blocking_findings`, and does
   not report them as passed or as measured". Matrix v5 carries the same reading rule. So the waiver is a human-approved rule for this
   stage, not my inference, and not a criterion I weakened: the Story still states AC-11/AC-12; the owner changed how they are accepted.
3. **The skill's constraint is honoured, not bypassed.** It forbids accepting a weakened criterion quietly and says such a decision
   belongs to a human. Here a human decided, in writing, at two gates. Nothing in this report calls AC-11/AC-12 satisfied.
4. **Scope of the waiver holds at HEAD.** The waiver covers "the delivery as committed at the time of the decision" (FR-34 waiver
   record). Every prompt-bearing commit (`fd9b052` 15:15:50+03:00, `439cc1e` 15:17:48+03:00, i.e. 12:15Z and 12:17Z) and the last source
   commit (`86b0d62`, 12:26:49Z) precede the decision at 14:50:23Z; HEAD `313f727` (12:29:32Z) is docs-only, and `git status` shows
   no non-doc change. The delivery is what the owner waived.

If the human does not accept an unmeasured delivery, the way back is the owner's, not a loop key of this stage: withdraw the waiver by
a new Story amendment and run the measurement script (FR-34's retained procedure).

## Three-level check per criterion

L1 = a matrix row exists. L2 = the named file and test exist (opened or grepped). L3 = the body was read and a violation of the
criterion would fail it.

| AC | L1 | L2 | L3 | Basis |
|---|---|---|---|---|
| AC-1 | yes | yes | yes | `vision-prepass.no-picture-references.spec.ts`: literals asserted inside the UKRAINIAN FIELDS block and the Grounding section; `says what the image shows` absent (`not.toContain`); `one sentence`, `differ`, `NUMBERS ARE THE HIGHEST-RISK ELEMENT` kept. Bodies re-spot-read this session. It proves the prompt instructs (the AC says "instructs"); model obedience was AC-11. |
| AC-2 | yes | yes | yes | Constant text, single interpolation outside `[IMAGE HANDLING]`, heading unique at line start, block 0 of all 7 stores, forbidden phrases absent, narrative `<p>` rule kept; the inverted T31/R22 describes assert the FR-42 literals and the absence of notes text. |
| AC-3 | yes | yes | yes | New wording present and old wording absent for each named text, pinned phrases kept; the `task-a.ts` change is the AC-3 wording only (net diff of `content-orchestrator.service.ts` vs base = the two `lead-in` to `preceding` words). |
| AC-4 | yes | yes | yes | 7 languages x 7 pointer words absent; each rendered template gives `findImageDeixis(...) === null`. |
| AC-5 | yes | yes | yes | Required uk positives and negatives (including «Сенсорний екран запускає сканування й показує 3D-модель») read in `image-deixis.spec.ts`; 2 + 2 per other language; primary-subtag mapping; unknown language gives `null`; 11 precision negatives. |
| AC-6 | yes | yes | yes | Paragraph, figcaption and alt reported with carrier; non-adjacent paragraph (heading, `<hr>`, `<ul>`, `<table>`, another `<figure>` between) not reported. |
| AC-7 | yes | yes | yes | `output-validator.image-deixis.spec.ts`: rule `image-deixis` at `warning` for the paragraph carrier, none for «нижче -10 °C» outside a figure, none for figcaption/alt carriers; `image-placeholder.deixis.spec.ts`: `image-caption-deixis` at `warning`. |
| AC-8 | yes | yes | yes, declared residual | One shared `LIVELINESS_RULES` in block 0 of all 7 stores, FR-22 literals in the EXPERT3D overlay only, tone limits kept, translation/optimizer block 0 = master with block 1 and `userContent` unchanged, self-scoping sentence verbatim. Residual: translator/optimizer behaviour under the shared block is untestable in the gate (Specification note G; owner-accepted). |
| AC-9 | yes | yes | yes, as a withdrawal | Withdrawn in Story v5. A withdrawn criterion has no behaviour to prove; the exclusion pins (FR-42, FR-43, FR-44 items 1 to 5, source scan, NFR-14 relocations) fail if the feature returns. Probes P-A to P-D (v3, carried, tree unchanged) turn them red. |
| AC-10 | yes | yes | yes | `description-metrics.spec.ts` (hand-computed D-1 to D-9) and `measure-description.cli.spec.ts` (spawns the real script: header, exit 0 clean, non-zero per carrier, figure without paragraph, consecutive figures, absent number; soft items never change the status; the four `--notes-*` flags exit 2). The script is the instrument; its existence is not evidence for AC-11/AC-12. |
| AC-11 | yes (row states WAIVED) | n/a | n/a | **WAIVED (owner, Story v6, 2026-10-19; not measured).** No test file, no run, no output. Non-blocking finding F1. |
| AC-12 | yes (row states WAIVED) | n/a | n/a | **WAIVED (owner, Story v6, 2026-10-19; not measured)** for the hard criterion; soft items not evidenced; manual review rests on the owner's statement. Non-blocking finding F2. |

Level 2 detail. The matrix names 51 distinct `*.spec.ts` strings. 38 resolve to tracked files (all 38 were run, below). 5 are bare
basenames in the matrix's abbreviations (`constants.c3d-override`, `constants.expert3d`, `constants.liveliness`,
`master-system-prompt.liveliness`, `vision-prepass.no-picture-references`) and resolve under `src/prompt-core/` and `src/prompts/`.
8 are the deleted operator-notes specs named only in the NFR-14 trace table, where their absence is the point; they are absent from
`git ls-files`. No live row names a missing file. No `.skip`, `.todo`, `.only`, `xit`, `xdescribe`, `skipIf` in the 38 files.
`toBeTruthy` none; `toBeDefined` three hits, all in `content-orchestrator.simplified.spec.ts` (138, 274, 428) as harness-call guards in a
spec that backs the FAQ-trigger reading of FR-44 item 4.2, not as its assertion.

## Drift from the approved Specification (v8)

- **FRs silently dropped: none.** FR-1 to FR-23, FR-27, FR-32 to FR-39 map to production code or verified preserve-only constraints.
  FR-24 to FR-26, FR-28 to FR-31, FR-40, FR-41 are withdrawn stubs with no implementation, correctly. FR-42 to FR-44 and NFR-13 to
  NFR-15 are implemented (base-bytes check below). FR-34 and FR-35 are WAIVED: their retained procedure was not performed, as the
  Specification says.
- **Behaviour changed during coding: none found.** `types.ts`, `app.component.ts`, `app.component.html`, `history.service.ts` equal
  the base `6546db8`; `git grep -i "operator.\?notes" HEAD -- src tools server ':!*.spec.ts'` returns nothing.
- **Scope added: none.** Out of scope items (`runFaqPipeline`, `faq-form.ts`, `task-b/c.ts`, `task-translate.ts`, `optimizer.ts`,
  `server/**`, `package.json`) have no diff.
- **Criteria reinterpreted: none that weaken an AC.** AC-9's tests are absence pins, the correct reading of a withdrawal. AC-11/AC-12
  are not reinterpreted: they are waived, and this report says so rather than counting any test as their proof.

## Judged items

1. **Dropped guard, OD-20(2) ("a number only in `supplementalContent` is not grounded by it"): non-blocking under NFR-14.** It guarded
   the non-extension of `numericFidelitySources` that belonged to the withdrawn FR-30, recorded as moot in Specification v7. No live FR
   or AC requires it; the function at HEAD equals base for this logic, so no surviving requirement's test was touched. What is lost: no
   test turns red if someone adds `supplementalContent` to the sources. If the owner wants it, it is a small `so-test-writer`
   addition; the Story does not ask for it.
2. **Dropped guard, whitespace-only notes and the empty object do not start the FAQ: non-blocking, closed.** Notes-only; the notes
   field no longer exists. The surviving trigger guard is intact: `content-orchestrator.simplified.spec.ts` block at line 322
   (`whitespace-only supplemental content counts as "not provided"`), and `stray-operator-notes` item 4.2 covers a non-blank stray value
   with no `supplementalContent`, with a control that FAQ calls ARE made when `supplementalContent` is set.
3. **Flake of `test/removal.spec.ts:73`: non-blocking, no loop-back, not mine to fix.** The quality gate disclosed it (one of three
   full runs on the unchanged tree: a 5000 ms vitest timeout, not an assertion mismatch; green in the second `npm test`, in the coverage
   run and alone in 402 ms). I ran it alone this session: 19 of 19 passed, 1.95 s. It belongs to US-2.2 (AC-13 / FR-20, commit
   `0fbbec0`), appears in no row of this matrix, and tests none of US-9.1's criteria. It scans the whole tree and is sensitive to worker
   load. It is a gate-reliability note for QUALITY_GATE / a follow-up (an explicit per-test timeout), outside this Story.

## Non-blocking findings

- **F1 (AC-11, waived, unmeasured).** No `tools/measure-description.ts` output, no product list (Creality Pika, a Center 3D Print
  product, a 3DDevice product), no run count (six, with a non-marker run), no recorded prompt version. The headline outcome, 0 picture
  references on live runs (baseline 35), is unmeasured and accepted on the owner's word. Nothing proves a model told these things stops
  pointing at pictures; what is proven is that the prompt text is delivered and the instruments work.
- **F2 (AC-12, waived, unmeasured).** 0 numbers absent from the input is unmeasured. The soft items (at least 2 of 3) are not evidenced
  by any recorded run. The manual fact review rests on the owner's statement only (OD-28(b) default: not waived, not evidenced).
- **F3 (detector reach, v3 N4, now permanently open).** The detector reports only forms its patterns know. Because no live figcaption was
  read, forms it has no pattern for are unobserved.
- **F4 (same root cause, other stages).** Security review L-1 (no live generated output inspected for injected or unsafe content) and
  the verifier's note that section 4 HTML compliance on real generation is unverified.
- **F5 (carried).** AC-8 translator/optimizer residual (note G); FR-44 item 3b is proven by absence of the reading code, not by
  executing `restoreHistory` (plan R9); the master-revert effect on Task C and the optimizer is pinned only by the golden `c/*` cases,
  P3 and P4.
- **F6 (matrix defect, new).** Matrix v5 row `AC-8 (residual R1a, R1d, R7a)` (line 121) has test file `-` yet reads "green (committed;
  guard, stays green; observed in this run)" and "built (guard)": the same misleading shape as v3 N1, now only on an untestable residual.
  Report to `so-test-writer` on its next revision; I do not edit the matrix.
- **F7 (history).** v3 N1 (AC-11/AC-12 rows misstated) and N2 are closed by matrix v5 (rows say WAIVED, no green/built; AC-9 rows state
  both TEST_WRITING and current state). The 14:40:00Z FROZEN-approval stamp and clock skew noted by the verifier, and security N-1
  (legacy `operatorNotes` stays in `localStorage` until rotation, no migration per NFR-13), are recorded by those stages and not repeated.

## Evidence (real runs and reads, this session)

- HEAD `313f727`, committed 2026-10-19T15:29:32+03:00; `git status --short` shows only `docs/**` modified; `git diff --stat 86b0d62 HEAD`
  = one doc file (`docs/catalog/US-9.1-pipeline-status.md`). Security v3, verification v3, quality gate v3 all PASS and current (inputs
  cite Story 6 / Specification 8).
- `npx vitest run` over the 38 spec files the matrix names for AC-1 to AC-8, AC-10 and the exclusion pins: **38 files, 1318 tests, 1318
  passed** (same as v3, unchanged tree).
- `npx vitest run test/removal.spec.ts`: 1 file, 19 passed.
- Greps over the 38 files for skip/todo/only/xit/xdescribe/skipIf (none) and toBeTruthy/toBeDefined (the three above).
- Net diffs against base `6546db8`: `types.ts`, `app.component.ts`, `app.component.html`, `history.service.ts` empty;
  `content-orchestrator.service.ts` differs by exactly the two `lead-in` to `preceding` words.
- Carried, not re-run (tree unchanged since v3): mutation probes P-A to P-D (each turns named pins red: 27, 160, 3 and 5 failures)
  and v1's probes M1, M2, M3, M8 for AC-1 to AC-8.
- Not available and not invented: any `measure-description.ts` output, generated HTML from a live run, product list, run count.

## Summary

- Levels 1 to 3: AC-1 to AC-8 and AC-10 clear; AC-9 clears as a traced withdrawal; AC-11 and AC-12 are WAIVED (owner, Story v6,
  2026-10-19; not measured) and listed as non-blocking findings under the approved Specification's OD-27 reading rule.
- No FR dropped, no behaviour changed, no scope added, no criterion reinterpreted. No loop-back key is named.
- PASS is not human approval. A human at HUMAN_PR_APPROVAL should see that this delivery ships with its two headline outcomes
  unmeasured.

---
artifact: specification_review
story: US-9.1
version: 8
status: ARCHIVED
owner: so-spec-reviewer
created_at: 2026-10-19T15:04:00Z
updated_at: 2026-10-19T15:04:00Z
supersedes: docs/reviews/specifications/US-9.1-spec-review.md#7
inputs_consumed:
  - key: story
    version: 6
  - key: specification
    version: 8
  - key: open_decisions
    version: 6
open_decisions_blocking: false
---

# Spec Review: US-9.1 — No picture references and livelier descriptions (Creality Pika regression)

**Verdict:** PASS
**Loop-back:** n/a

> A `PASS` here is **not** human approval. Approval is recorded only by `/so:approve` (AGENTS.md §10). Specification v8 is a
> `DRAFT`; the approval of v7 does not cover it (Story v6). Nothing in this review waives a criterion, resolves an Open
> Decision, or answers OD-21 to OD-32. A plain `/so:approve` would accept the PROPOSED DEFAULTS of FR-42 to FR-44, NFR-13 to
> NFR-15 (OD-21 to OD-25) and the waiver wording of FR-34 and FR-35 (OD-26 to OD-32) as written; that decision is the human's.

This is review v8, a focused re-review of Specification v8 against Story v6 and Open Decisions v6. It supersedes review v7
(overwritten at the same path). Input currency: Story v6 `DRAFT`, Specification v8 `DRAFT` (`supersedes ...#7`), Open Decisions
v6 `DRAFT`, `open_decisions_blocking: false`; none is `SUPERSEDED`; no Open Decision is `blocking: true`. The Specification
contains no `TBD`, `TODO`, `FIXME` or `???`. `HEAD` = `313f727`; `src` and `tools` are clean against `HEAD`.

## Summary

v8 does what Story v6 asks and no more: the AC-11/AC-12 criterion text is retained, marked WAIVED and described as unmeasured,
never as passed; the new defaults are labelled as proposals and none of OD-26 to OD-32 is closed. AC-1 to AC-12 trace. I found
no blocking defect. What remains is a handful of leftovers the change did not reach (live-run wording in FR-32 D-10, one
unqualified failure path in FR-35, an over-reaching sentence in the Scope Locales row, a trace-row phrase "covered at unit
level"), recorded below as non-blocking and worth one cleanup pass before the human reads it.

## What was checked against what

- **Scope-creep check without a v7 copy.** The brief says the Specification was never committed; in fact `HEAD` holds an old
  v5 (`2bed351`), not v7. A v7 to v8 diff is therefore still impossible, so I diffed the working copy against that v5 for the
  regions v8 is supposed not to have touched: FR-1 to FR-23, FR-32 and FR-33, FR-36 to FR-39. Every difference is an edit that
  an earlier, already-reviewed revision (v6, v7) or v8's declared change list accounts for (the FR-1, FR-5, FR-20, FR-21
  cross-references to the waiver; the FR-11 "committed under owner-approved grants" wording; the FR-21 pointer to FR-42; the
  removal of operator-notes text in FR-32 D-10, FR-38, FR-39). No requirement text beyond Story v6 was added or rewritten in
  those ranges. NFR-1 to NFR-15, FR-24 to FR-31, FR-40 to FR-44 were read in full and read as in v7 (cross-checked against
  review v7's quotations: FR-44 items 4a, 4b, 5, NFR-13 `09f87dc`, NFR-15 hashes, the unchanged "once approved" residue in FR-13).
- **History events cited by v8.** `docs/workflow/history.jsonl` line 611 (`ts` 2026-10-19T14:50:23Z) carries the waiver
  sentence verbatim; line 609 (14:42:16Z) carries the owner context. Both quotations in the revision note match.
- **Stores.** The Scope names `3DDevice`, `3DPrinter`, `3DScanner`, `Center 3D Print`, `Drukarka 3D`, `EXPERT3D`,
  `Expert-3DPrinter` with groups UA, UA, UA, EU, EU, ES, US; `src/prompt-core/constants.ts` lines 71 to 77 agree. v8 adds no
  store, locale or currency value.

## 1. Acceptance-criterion coverage

Matrix re-derived from Story v6's AC text and the FR text, not read from the Specification's table.

| AC | Story v6 says | Specification satisfies it via | Verdict |
|---|---|---|---|
| AC-1 | Vision pre-pass `description`/`alt` rules, grounding sentence, kept phrases | FR-1 to FR-4 | covered |
| AC-2 | `[NO PICTURE REFERENCES` constant outside `[IMAGE HANDLING]`; three phrases gone; narrative `<p>` kept | FR-5, FR-6 (FR-7 to FR-9) | covered |
| AC-3 | Doc/`task-a.ts`/C3D/validator/orchestrator wording; pinned phrases kept | FR-10 to FR-14, FR-27, FR-36, FR-37 | covered |
| AC-4 | `LEAD_IN_TEMPLATES` free of pointer words | FR-15 | covered |
| AC-5 | `findImageDeixis` seven base languages | FR-16 | covered |
| AC-6 | `collectFigureDeixis` three carriers | FR-17 | covered |
| AC-7 | `image-deixis` / `image-caption-deixis` at `warning` | FR-18, FR-19 | covered |
| AC-8 | shared liveliness block; EXPERT3D-only additions; file-level translation statement | FR-20 to FR-23 | covered |
| AC-9 | withdrawn (v5) | stubs FR-24 to FR-26, FR-28 to FR-31, FR-40, FR-41; exclusions falsifiable via FR-42 to FR-44 | covered as a withdrawal |
| AC-10 | script reports the metrics, exits non-zero on a hard violation | FR-32, FR-33 (unchanged; OD-30 default) | covered |
| AC-11 | hard script criteria; **WAIVED (v6)** | FR-34 (text retained, WAIVED), FR-36 | traced; waived, not measured |
| AC-12 | hard numbers, soft 2 of 3, manual; hard criterion **WAIVED (v6)** | FR-35 (text retained, hard criterion WAIVED) | traced; waived, not measured |

All 44 `### FR-` headings are present; nothing is added, removed or renumbered. FRs tracing to no live AC: FR-42 to FR-44,
NFR-13 to NFR-15 (as in v7; the Specification says so in note I and the matrix footer), plus the preserve-only FR-37 to FR-39 as
the footer lists them. The waiver rows (AC-11, AC-12) say "WAIVED and unmeasured; not passed and not measured" and cite no test
and no run. Clear.

## 2. Non-verifiable language

- **FR-34 waiver record (1)** — "the waiver covers the delivery as committed at the time of the owner's decision ... any later
  change to a prompt-bearing file of this Story needs the owner to restate the waiver".
  - A test would have to invent: which commit is "the delivery as committed at the time" (the tree at the decision, `ts`
    14:50:23Z, is `313f727`, and `src`/`tools` have not changed since, but the Specification names neither) and which files are
    "prompt-bearing" (Scope lists files, but the phrase does not point at that list). Labelled PROPOSED DEFAULT (OD-29), so it is
    the human's to accept; N1 below.
- **FR-20 failure path** — "so it is judged only by the owner's manual testing". **FR-21 guidance** — "the effect is judged by
  the owner's manual testing".
  - A test would have to invent: the judgement. No judgement is recorded; the owner accepted the headline outcome, nothing was
    assessed against a criterion. N3 below.
- **FR-34 / FR-35 waiver paragraphs, "nothing in this Specification may be read as saying that the runs will be performed"** —
  checkable, and checked: it is contradicted by two phrases in FR-32 D-10 (N2).
- No other new vague sentence found in the v8 additions. "A plain `/so:approve` would accept ..." is process, checkable against
  the Conventions paragraph.

## 3. Contradictions with the Story

- **Waiver description vs Story v6.** Story v6 says the hard script criteria of AC-11 and AC-12 are waived on the owner's manual
  testing, are NOT measured, no output/product list/run count exists, the headline outcome is accepted on the owner's word, the
  soft and manual items are "likewise not evidenced", and the criterion text is kept unchanged. FR-34, FR-35, the Summary, the
  revision note and both trace rows say the same, in the same terms. The word "passed" appears only in negations. Clear.
- **FR-34 / FR-35 vs OD table vs trace rows vs Summary/Scope.** The OD table rows OD-26 to OD-32, FR-34's waiver record
  (defaults of OD-27, OD-29, OD-32), FR-35's paragraph (OD-28 (b)), the AC-11/AC-12 trace rows, the Summary and the Scope
  (Stores) row agree with each other and with Open Decisions v6's PROPOSED DEFAULTS (compared entry by entry). Clear, apart from
  the leftovers below.
- **Leftover 1 (N2): live-run wording in FR-32 D-10.** FR-32 is declared untouched (OD-30 default) and the change table claims
  "'Live-run' wording that implied the runs will happen made conditional or marked WAIVED" without naming FR-32. D-10 still says
  "(so for the three acceptance runs the operator passes description and specs)" and "if the first live runs show false reports
  from such text, the exemption is a new requirement for the human to decide". Both read as if runs will happen, against FR-34's
  own sentence.
- **Leftover 2 (N4): FR-35 failure path** — "a hard-criterion failure is a failed acceptance". It is introduced as conditional
  ("only if a live run is ever performed") but is unqualified about the waiver, while FR-34's failure path and waiver record (2)
  say a later failing run is reported and "does not by itself void the waiver". The two sentences cannot both be applied
  without a reader choosing.
- **Leftover 3 (N5): FR-33 failure path** — "this requirement is the failure path of FR-34/FR-35" is now a pointer to
  requirements that are waived; harmless, stale.
- **Leftover 4 (N6): FROZEN by-name instruction.** The Scope row and OD-12 row record the 2026-10-19T07:50:00Z instruction
  ("modify для task-a.ts та master-system-prompt.ts, шлях 1") and say the owner restates it in the editing session. Story v6's
  Scope row cites a different instruction, "modify master-system-prompt.ts, modify task-a.ts, так" (`history.jsonl` line 603,
  `ts` 2026-10-19T14:40:00Z), which the Specification does not mention. v8 nevertheless says Story v6 "corrected its own row to
  agree with these records, so the earlier discrepancy is closed". The statement is incomplete rather than false, and v8 grants
  nothing; OD-25 stays open as recorded.

## 4. Scope creep

- Out of scope section present and non-empty: **yes** (19 bullets). v8 adds three, each tied to the waiver: not performing the
  runs or producing script output, not changing the script/`description-metrics.ts`/tests (OD-30 default, labelled), no live check
  of the AC-8 residual or other output languages (OD-31/OD-15). All are consequences of Story v6.
- v8 adds no requirement. The waiver record (three numbered items inside FR-34) prescribes what downstream records must say; it
  is a PROPOSED DEFAULT of OD-27/OD-29/OD-32 and labelled as such in the same paragraph. It decides nothing the Story did not,
  beyond the labelled proposals.
- **Undeclared edit (N7, cosmetic):** the Conventions paragraph gained the OD-26 to OD-32 sentences and the "plain
  `/so:approve`" clause, and the Open-questions lead-in and Out-of-scope lead item changed; the v8 change table lists the
  lead-in and Out of scope but not Conventions. The edit is about the same waiver.
- No Open Decision is silently resolved: every waiver-derived default cites its OD and says it is a proposal; the OD table
  marks OD-26 to OD-32 "OPEN ... Not an owner decision"; the OD-11/OD-10/OD-14 "moot-by-waiver" marks follow Open Decisions
  v6's own status lines, and the recorded resolutions are kept as history.

## 5. Missing edge cases, boundaries and failure paths

| Area | Checked | Finding |
|---|---|---|
| FR failure paths | FR-34, FR-35 failure paths are made conditional; FR-42 to FR-44 unchanged | one unqualified sentence in FR-35 (N4) |
| Locale fan-out (uk-UA master to derived locales) | Scope (Locales), FR-23, note G | unchanged; clear. The waiver removes no check that covered a translated language (AC-11/AC-12 never did, OD-31) |
| Store scope vs `STORE_REGISTRY` | seven keys and groups against `constants.ts` lines 71 to 77 | clear |
| §4 invariants that must survive | FR-36 to FR-39 unchanged against v5 apart from removed operator-notes text | clear. The trace row calls FR-36 "covered at unit level" for the AC-11 structure half; the Specification states no unit test for it (N3) |
| Provider behaviour | NFR-12 unchanged | clear |
| Empty / boundary inputs | no change by v8 | clear |

## 6. Compliance with AGENTS.md

| Check | Result |
|---|---|
| §4 criteria in play quoted **verbatim** and cited | FR-36 to FR-39 carry the §4 quotations; unchanged by v8 (compared to v5 and to review v7). clear |
| §9 FROZEN-file impact named and acknowledged | three files named, stop acknowledged, `--rebaseline` in the same commit; v8 grants nothing. The 14:40Z instruction is not cited (N6). clear |
| §3 architecture rules not violated, incl. Rule 2 | NFR-3 unchanged. clear |
| §11 no blocking Open Decision left unaddressed | OD-1 to OD-32, none `blocking: true`; the Specification resolves none. clear |
| No implementation design leaked in | v8 adds none; NFR-13 to NFR-15 carry the plan-level detail recorded in review v7 (N4 there, carried) |

## Verdict rationale

`PASS`: all six axes are clear of blocking defects. The Story's change is applied faithfully, the waiver is described as
unmeasured and owner-accepted everywhere that matters, every new default is a labelled proposal, and no Open Decision is closed.
Not `CHANGES_REQUIRED`: the leftovers (N2 to N6) are wording that does not change what any stage must build or test, and each is
fixable by the owner of the Specification in one pass; none misstates the waiver as a pass or a measurement. It is not human
approval; the Specification stays a `DRAFT` until `/so:approve`, and the human is asked to accept the PROPOSED DEFAULTS
of OD-21 to OD-32 by a plain approval, which the document says plainly.

**Blocking findings:** none.

## Non-blocking findings

- **N1.** Waiver scope is not anchored: FR-34 waiver record (1) does not name the commit or the files. Suggest naming `313f727`
  (the `HEAD` at the decision; `src` and `tools` unchanged since) or leaving it to OD-29 as an explicit open item, and pointing
  "prompt-bearing file" at the Scope row's file list. The owner can also answer OD-29 in the approval comment.
- **N2.** FR-32 D-10: change "for the three acceptance runs the operator passes description and specs" and "if the first live
  runs show false reports" to conditional wording ("if runs are ever performed"), or add FR-32 to the v8 change table with a
  one-sentence conditional. Without it FR-34's sentence "nothing in this Specification may be read as saying that the runs will
  be performed" is false as written. The v8 change table's claim that live-run wording was made conditional is not complete.
- **N3.** (a) Scope (Locales), "the ban rests on the warning and on the owner's manual testing": for non-uk-UA languages the
  languages covered by the manual testing are not recorded (OD-29 (b), OD-31); "rests on" says more than the sources establish.
  (b) FR-20 failure path "judged only by the owner's manual testing" and FR-21 "the effect is judged by the owner's manual
  testing": no judgement is on record; "accepted on the owner's word (Story v6)" is the wording the rest of the Specification
  uses. (c) AC-11 trace row: "FR-36 (preserve-only §4 structure constraint, covered at unit level)" next to a half of AC-11
  ("no figure without a paragraph above, no two figures in a row") that only the script measures (FR-17, FR-32 D-2) and that is now
  unmeasured; the Specification states no unit test for FR-36, and FR-1's failure path says prompt wording cannot be proven by one.
  Suggest "preserve-only; no unit test is specified; unmeasured".
- **N4.** FR-35 failure path: qualify "a hard-criterion failure is a failed acceptance" with "reported, and does not by itself
  void the waiver (FR-34 waiver record (2), OD-29 default)".
- **N5.** FR-33 failure path "this requirement is the failure path of FR-34/FR-35": stale after the waiver; cosmetic.
- **N6.** Scope (FROZEN) row and OD-12 row do not cite the owner's by-name restatement of `history.jsonl` line 603 (14:40:00Z),
  which says it "covers the withdrawal hunks only (OD-25 default)" and which Story v6 does cite; the sentence "so the earlier
  discrepancy is closed" is stronger than the records support. OD-25 stays open.
- **N7.** The v8 change table omits the Conventions paragraph edit (cosmetic).
- **N8.** Carried from review v7, unchanged: the OD-21 row and note I Q-A quote `main` as a moving reference (FR-42 itself uses
  `120dcbc`); FR-13 "asserted VERBATIM once approved" for already-committed strings; FR-44 item 3 and NFR-13 to NFR-15 are
  plan/test-level material with no live AC, labelled as proposals; Open Decisions v5-era observations (OD-10, OD-13 owner events of
  2026-10-18 not applied) stand.
- **N9.** Downstream records are stale against Story v6 and Specification v8 and are the orchestrator's to re-run: the impact
  analysis, plan (T51, R5, OD-32), task breakdown, test artifacts and the reconciliation report (still BLOCKED on AC-11/AC-12).
  This review neither reads nor corrects them.

## Evidence

Commands run and what they showed (no check is reported that was not run):

- `git rev-parse --short HEAD` = `313f727`; `git merge-base main HEAD` = `120dcbc`; `git diff --stat HEAD -- src tools` empty.
- `git show HEAD:docs/specifications/US-9.1-spec.md | head`: `version: 5`, `status: APPROVED` (so no v7 copy exists to diff);
  `git log --oneline -- docs/specifications/US-9.1-spec.md`: `2bed351` only.
- Region diffs of the working copy against that v5 for FR-1..FR-23, FR-32..FR-33 and the Generated-HTML section (FR-36..FR-39):
  only the edits named in "What was checked against what".
- `grep -c "^### FR-"` on the Specification = 44; `grep -nE "TBD|TODO|FIXME|\?\?\?"` found no placeholder.
- `grep -i "live[- ]run|live runs|acceptance run|first live"` on the Specification: sites reviewed one by one; unconditional
  leftovers found in FR-32 D-10 only.
- `docs/workflow/history.jsonl` lines 586, 603, 609, 611 (07:50:00Z withdrawal, 14:40:00Z by-name instruction, 14:42:16Z owner
  context, 14:50:23Z waiver): waiver and context quotations match the Specification and Story v6.
- `src/prompt-core/constants.ts` lines 71 to 77: seven `STORE_REGISTRY` keys and groups as the Scope row states.
- Open Decisions v6 entries OD-26 to OD-32 (lines 987 to 1134) compared with the Specification's defaults: each PROPOSED DEFAULT
  is reproduced faithfully and labelled a proposal.

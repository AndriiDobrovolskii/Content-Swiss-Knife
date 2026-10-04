---
artifact: specification_review
story: US-5.1
version: 9
status: ARCHIVED
owner: so-spec-reviewer
created_at: 2026-10-02T00:00:00Z
updated_at: 2026-10-04T01:00:00Z
supersedes: docs/reviews/specifications/US-5.1-spec-review.md#8
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 9
  - key: open_decisions
    version: 6
open_decisions_blocking: false
---

# Spec Review: US-5.1 — Replace [file-name.ext] markers in Original Description with the matching uploaded image at the same position in the final description

**Verdict:** PASS
**Loop-back:** none

> This `PASS` is a verdict about the document only. It is NOT human approval. Approval is recorded
> only by `/so:approve` (AGENTS.md section 10).

## Summary

Review v9 covers Specification v9 (DRAFT, supersedes v8) and supersedes review v8. The single blocking
finding of v8 (B-1, Open Decisions log lagging H-8) is closed: log v6 exists, records H-8 as RESOLVED, marks
OD-26 and OD-27 REVERSED with history kept, records the section 9 authorisation of the two example figure
lines separately from the earlier approval, records the AGENTS.md section 4 amendment, and records A-14/A-15/A-16
as confirmed; `open_decisions_blocking: false`; the Specification consumes log v6. The v8 non-blocking items
N-1..N-4 and N-6 are addressed (details below, with two small residues). H-8 is applied faithfully. No
contradiction, scope creep or untestable claim was introduced that rises to blocking. Several non-blocking items
remain for the human at the gate.

## B-1 (review v8): closed

| Needed in log v6 (review v8) | Found in `docs/decisions/US-5.1-open-decisions.md` v6 |
|---|---|
| H-8 items 1-6 as RESOLVED | "H-8 - RESOLVED (human decision, recorded v6)", items 1-6, event wording unadjusted; index row `H-8 RESOLVED` |
| OD-26 (b), OD-27 (a) REVERSED, history kept | Index rows "REVERSED by H-8 (v6)"; entries retained with v6 status SUPERSEDED |
| Section 9 authorisation of the two example figure lines, separate from 09:25:44Z / 09:28:48Z | "Section 9 authorisation (v6)": identifies by content, HEAD 400/405 vs working tree 403/408, "separate from, and additional to" |
| Section 4 amendment recorded | Recorded under H-8, planner follow-up flagged as going beyond the event |
| A-14, A-15, A-16 confirmed | "A-14, A-15, A-16 - CONFIRMED by the human (v6)", wording evidence only, N-1 flag recorded |
| `open_decisions_blocking: false` | Yes (front matter) |
| Spec bumps `inputs_consumed` to log v6 | Yes (`open_decisions` version 6, `specification_review` 8) |

## Fidelity of H-8 (re-checked against the history.jsonl HUMAN_REJECTED event of 2026-10-03T18:20:00Z and the `note` of workflow-state.yaml; the two texts are identical)

| Human item | Applied in v9 | Evidence |
|---|---|---|
| (1) width `max-content`, Spec states it amends section 4, overrules OD-26 b | Yes | Dedicated section "Amendment of AGENTS.md section 4"; FR-14 quotes the current `fit-content` bullet verbatim (matches AGENTS.md line 214) and states the amendment separately |
| (2) figcaption `style="text-align: left;"` | Yes | H-8 item 2, FR-14, FR-22, AC-9 (g) |
| (3) all non-video figures; overrules OD-27 a | Yes | Scope row, FR-22, AC-9 (l); FR-21 language rules correctly not widened; video untouched (FR-15, FR-22 item 5) |
| (3) section 9 for lines 403 and 408 | Yes | H-8 item 4, Scope FROZEN row, NFR-1, FR-22 item 2, AC-9 (m). Verified in the tree: the two lines are the `fit-content` example figure lines (HEAD 400/405, working tree 403/408), example figcaptions already carry `text-align: left`, img lines already match the HTML scheme |
| (4) A-16 confirmed | Yes | A-16 CONFIRMED, FR-4 |
| (5) A-14, A-15 confirmed | Yes | H-8 item 5 now quotes the human's words and says "nothing more"; the rule ids, generic list and Cyrillic scope are attributed to the Specification, not the human (v8 N-1 addressed in the body of H-8 item 5; residue N-1 below) |
| HTML scheme (first image no `loading`, decoding async, style strings) | Yes | Header scheme, H-8 item 6, FR-13, FR-14, AC-9 (g); strings character-identical to the event |

## Status of v8 non-blocking findings

| v8 | Status in v9 |
|---|---|
| N-1 H-8 item 5 over-attribution | Addressed in H-8 item 5; small residue in A-14 (see N-1 below) |
| N-2 FR-22 / AC-9 (l) testable claim | Addressed: FR-22 "Testable scope (A-17)", failure path, AC-9 (l) and A-17 limit the deterministic claim to renderer, substitution step and standard fallback; legacy-path model HTML best-effort via updated examples. A-17 is flagged for confirmation |
| N-3 FR-22 consequence 3/4 without AC | Addressed: AC-9 (n) and (o) added, traced in the matrix; (n) labelled "proposed, needs confirmation"; AGENTS.md text update flagged as a planner task needing human confirmation (Amendment section, Scope row, Out of scope, "Confirmation also requested") |
| N-4 identify lines by content, diff against HEAD | Addressed: every mention says "identified by content", AC-9 (m) and the golden/arch-guard paragraph diff against HEAD |
| N-6 stale text | Addressed: Open questions cite log v6; FR-4 failure-path sentence reworded and clear; FR-21 rule 1 collapses multiple trailing colons; AC-9 items now in order in the AC-9 section (matrix rows (j), (f) remain out of order, trivial) |
| N-5, N-7, N-8 | Carried (below) |

## 1. Acceptance-criterion coverage

Re-derived from the Story (AC-1..AC-6), not read back. AC-1 -> FR-1; AC-2 -> FR-2..FR-7, FR-17..FR-20; AC-3 ->
FR-13..FR-16, FR-4, FR-21, FR-22; AC-4 -> FR-12, FR-7, FR-6, FR-21, FR-22; AC-5 -> FR-9; AC-6 -> FR-10, FR-1. Each
mapped requirement satisfies, not merely mentions, its AC. FRs with no Story AC (FR-8, FR-11, FR-17..FR-22) trace
to recorded human decisions (OD-7/OD-10, H-1, H-7, H-8, OD-25) and are declared. Clear.

## 2. Non-verifiable language

- FR-22 headline "every non-video `<figure>`": narrowed by the Testable scope paragraph; the deterministic claim is
  now exactly stated. Clear, subject to A-17 confirmation.
- AC-9 (n) "passes the HTML editor round trip and the HTML cleaning step with the figure style and the figcaption
  style unchanged": testable in principle, but it does not name which editor/cleaning component is meant or what the
  round trip is. A test would have to choose the component and the harness. See N-2.
- AC-9 (o) "the delivered suite has no weaker assertion than before": checkable by diff review only, not by a failing
  test; acceptable as a review criterion, flagged N-3.
- FR-21 "image-specific" and "one sentence": explicitly declared not deterministically checked. Clear.

## 3. Contradictions with the Story

None new. The Story is unchanged; the Q1, Q4, Q5, line 66 and AC-3 overrides remain declared in Background. The width
change amends AGENTS.md section 4, not the Story, and is declared.

## 4. Scope creep

Out of scope section present and non-empty (16 bullets). FR-22 widening is a human decision (H-8 item 3). Items not
literally asked for by the human are marked as proposals needing confirmation: FR-22 consequence 3 / AC-9 (n),
consequence 4 / AC-9 (o), the AGENTS.md section 4 text update (planner task), A-17. See N-2.

## 5. Missing edge cases, boundaries and failure paths

Every FR carries a failure path. Locale fan-out (FR-12, FR-22, AC-9 (j)), store scope (NFR-6, A-3, A-13/A-15),
section 4 invariants (FR-13..FR-16, FR-22), provider behaviour (NFR-12), empty/boundary inputs (empty manifest, no
markers, marker at document start, empty halves) are all covered. Clear.

## 6. Compliance with AGENTS.md

- Section 4 criteria quoted verbatim and cited (FR-13..FR-16); the one amended rule is stated explicitly as an
  amendment and the verbatim quote is not falsified. Compared with AGENTS.md lines 207-233: match.
- The AGENTS.md section 4 planner task is correctly flagged as NOT authorised until the human confirms it at the
  spec gate, and is carried in four places (Amendment section, Scope row, Out of scope, confirmation list), with the
  fallback that the amendment is carried by the Specification alone if declined. Clear.
- Section 9: exactly two files editable, each edit class tied to a recorded approval event and now also to log v6;
  `task-b.ts`, `task-c.ts`, `output-validator.ts` not editable; any other line is a section 9 stop.
- Rules 1, 2, 4 and prompt caching: NFR-2..NFR-5, NFR-7 no violation; step is deterministic with no retrieval.
- Section 11: no blocking Open Decision; log current.
- Implementation design leak: carried N-5.

## Verdict rationale

`PASS`. All six axes are clear. B-1 of review v8 is closed by log v6, the Specification consumes log v6, H-8 is
applied faithfully and completely, and N-2/N-3 (testable scope, ACs for consequences 3/4) are addressed with the
planner task correctly held for human confirmation. The remaining findings are wording and gate-confirmation items,
none of which makes a test unable to fail on a required behaviour or contradicts the Story or a human decision.
This verdict does not approve anything; `HUMAN_SPEC_APPROVAL` is a separate human act.

## Non-blocking findings

- **N-1** A-14's trailing parenthetical says "The human confirmed the Ukrainian fallbacks and
  `image-caption-not-native` explicitly". The event contains only "A-14 and A-15 (Ukrainian fallbacks) confirmed";
  log v6 itself notes the human did not itemise the rule ids. Reword to match H-8 item 5 / log v6 ("fallbacks"
  only). Also H-8 item 4 (Spec line about the section 9 authorisation) has a stray `**` and a missing word
  ("... `master-system-prompt.ts` the two example figure lines only**").
- **N-2** AC-9 (n) is stated as a criterion that must hold ("AC-9 ... is satisfied when all of the following hold")
  while being "proposed, needs confirmation". If the human declines FR-22 consequence 3, AC-9 (n) and the editor/
  cleaning scope must be removed; if accepted it reaches components (editor, HTML cleaning) not named in Scope or
  Impact. Name the component(s), or move the item to the plan, and keep it a gate question.
- **N-3** AC-9 (o) "no weaker assertion than before" is reviewable only by diff; fine as a review criterion, not as an
  automated test. The Scope "Figure scope" row repeats "all non-video figures" without the A-17 limit; the limit is
  stated in FR-22, A-17 and AC-9 (l) (confirm A-17 at the gate).
- **N-4** The Background still carries lengthy history of v2..v8 rejections; harmless but long. The matrix lists AC-9
  (j) and (f) after (o).
- **N-5** (carried) FR-19/FR-20/AC-9 name helper, file and fixture identifiers (`preExtractPlaceholders`, golden file,
  `arch-guard --rebaseline`): plan/test detail.
- **N-6** Assumptions still awaiting the human, unchanged: A-1..A-10, A-12, A-13, A-17, Q-A..Q-D, the proposed planner
  AGENTS.md section 4 text update, FR-22 consequence 3 (AC-9 (n)); OD-18 and OD-20..OD-24 OPEN and non-blocking.
- **N-7** (carried) Model compliance with FR-19/FR-20 and the quality of the Vision Ukrainian text are verifiable only
  by the human-verified live re-runs named in the Specification.

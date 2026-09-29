---
artifact: clarification_report
story: US-3.1
version: 3
status: ARCHIVED
owner: so-clarifier
created_at: 2026-09-22T21:00:00Z
updated_at: 2026-09-22T21:00:00Z
supersedes: docs/evidence/US-3.1-clarification-report.md#2
inputs_consumed:
  - key: story
    version: 1
  - key: open_decisions
    version: 3
  - key: clarification_report
    version: 2
  - key: specification
    version: 4
open_decisions_blocking: false
---

# US-3.1 — Clarification Report (v3, attempt 3)

## Verdict: Ready for Specification

This is a re-run of CLARIFICATION triggered from downstream, not from a new Owner answer to a v1/v2
CLARIFICATION question. SPECIFICATION itself opened a new blocking Open Decision, **OD-7**, after
v2 of this report and its companion `open_decisions` artifact were already filed: SPEC_REVIEW v3
found, and Specification v4 (`docs/specifications/US-3.1-spec.md#4`, FR-13(c)) confirmed and
recorded, that making AC-4's approved `meta_title` template actually reachable at the normal-case
cascade rung requires editing `src/prompts/task-b.ts`'s per-locale Title budget table (lines
67-79) — a FROZEN-file section OD-3's existing §9 grant does not cover (OD-3's own text: authorized
scope "matches exactly what AC-4 requires and nothing broader," naming only the mandatory-suffix
instruction and the four few-shot anchors). `so-spec-writer` correctly declined to widen its own
authorization and returned `BLOCKED`, opening OD-7 for a human §9 grant rather than guessing. **The
Story Owner (sbruhov@gmail.com) has now answered OD-7.** This round logs that answer in
`docs/decisions/US-3.1-open-decisions.md` (v3), verifies it independently against the actual source
files rather than accepting it at face value, and re-assesses whether any blocking Open Decision
remains for this Story overall. Verification surfaced one precisely quantified residual, recorded as
new non-blocking **OD-8**, which does not reopen OD-7 and does not block Specification from
resuming.

**No blocking Open Decision remains.** OD-1 through OD-6 were already resolved as of v2; OD-7 is
resolved in this round; OD-8 is opened non-blocking and delegated to SPECIFICATION.

## Sources read (this round)

`docs/specifications/US-3.1-spec.md` (v4, specifically the Background section's v4 changelog and
FR-13(c)/Open questions, which recorded OD-7 as so-spec-writer raised it); `docs/decisions/US-3.1-
open-decisions.md` (v2, the artifact being superseded, specifically OD-3's verification note, and
now inlined in full into v3 rather than referenced); `docs/evidence/US-3.1-clarification-report.md`
(v2, the artifact being superseded); `src/prompts/task-b.ts` lines 42-107 (re-read in full to
confirm the budget table's current numbers, line range, and its own stated "AIM LOW... BELOW the
hard acceptance limit" design principle); `Knowledge/Issues/First_Batch/meta-titles.txt` (re-read in
full; all four example `meta_title` strings independently character-counted word-by-word, not read
from the source's own "Длина" column); `AGENTS.md` §9 (lines 440-465, the FROZEN procedure and
list — confirms `task-b.ts` is FROZEN and the required "modify [filename]" phrasing); `AGENTS.md` §4
(line 227, the hard `meta_title ≤ 55 chars` acceptance criterion); `src/utils/output-validator.ts`
lines 41, 654-668 (confirms `MAX_META_TITLE = 55`, the `meta-title-length` `error`-severity check,
and that this file is untouched by any authorization in this Story).

## What OD-7 resolved, and how it was verified

**Owner's resolution (verbatim):** *"Yes, as Owner, I extend the §9 FROZEN authorization for
task-b.ts. I grant full permission to modify the 'per-locale Title budget table' section (lines
67-79). Please update the character budgets in this table for all locales so they comfortably fit
the new approved template {Product Name} - {Localized Category} {Spec}. Per the previously provided
meta-titles.txt file, the safe range for this template is 45-60 characters. Make sure the new prompt
budget does not contradict these numbers and does not provoke unnecessary repair cycles."*

**Scope match, verified.** The Owner names `task-b.ts` and says "modify," satisfying AGENTS.md §9's
own required phrasing — the same form OD-3's earlier grant used. The section named, "per-locale
Title budget table," is confirmed still at lines 67-79 in the live file and matches exactly the
section Specification v4 flagged as outside OD-3's existing grant. "For all locales" closes a
completeness gap a narrower grant would have left: the table has six locale-groups, but
`meta-titles.txt` supplies reference examples for only four.

**Numeric basis, independently re-verified.** This round independently character-counted (not
re-derived from the Specification's own arithmetic) all four `meta-titles.txt` example titles:
en-ES **50** chars, es-ES **53** chars, pt-PT **49** chars, uk-UA **47** chars — confirming
Specification v4's correction of the source document's own "Длина" column, which under-counts three
of the four rows by one character (49/53/50/48 as printed). Against `task-b.ts`'s live budgets
(≤48 for en-GB/en-US/en-ES, es-ES/es-MX, pl-PL, uk-UA/ru-UA and "(any other locale)"; ≤45 for
de-DE): en-ES is over budget by 2, es-ES by 5, pt-PT (via "(any other locale)") by 1; uk-UA sits 1
character **under** its budget, not at it. This independently confirms the gap OD-7 exists to close
is real and matches FR-8's arithmetic in Specification v4.

**The achievable numeric window is narrow — quantified precisely, not merely flagged.** The Owner's
cited "45-60 characters" is the *display*-safety range `meta-titles.txt` itself states for the
rendered title (that source mixes a "51–60" per-row note with a "45–55" summary line; "45-60" spans
both). Read literally as an instruction for the table's `≤` budget field itself, the top of that
range collides with a constraint this authorization does not reach: `task-b.ts`'s own table states,
in the very block being edited, that its budgets "sit BELOW the hard acceptance limit on
purpose... AIM LOW" (lines 69-71) — and that hard acceptance limit is `output-validator.ts`'s
`MAX_META_TITLE = 55`, an `error`-severity check in a FROZEN file this Story does not authorize
touching. Doing the arithmetic precisely: the longest measured reference locale-shape (es-ES) is 53
characters, so the budget must be **≥ 53** for that locale-shape to reach the normal-case rung at
all, and **< 55** to respect the untouched ceiling. **The achievable window is therefore only {53,
54} — one to two characters of margin, against the table's current seven (55−48).** The table's own
"a title at the budget still has room to spare" design principle is not really satisfiable within
that thinned window. This is not treated as reopening OD-7 as blocking — the Owner unambiguously
answered the question actually asked (may the table be edited, and on what basis) — but it is a
real, quantified constraint that Specification must apply deliberately rather than by silent
inference, so it is recorded as new **OD-8** (non-blocking) rather than folded silently into a
number Specification is left to guess at.

**A further residual beyond the numeric window: long product names.** The {53, 54} window and the
53-character reference figure both come from one sampled product ("Makera Cyclone Dust Collector").
A product whose name or localized category term is longer will produce a template-built title that
exceeds the untouched 55-character hard ceiling **regardless of what the budget is set to** — no
budget value keeps that generation both template-shaped and within the ceiling; the cascade must
degrade by design for that product. This is a materially different situation from "the budget was
set too low," and is not something OD-7's grant (scoped only to `task-b.ts`) can resolve on its own,
since the ceiling lives in `output-validator.ts`, a different FROZEN file no authorization in this
Story reaches. Recorded as part of OD-8.

**de-DE and the locales `meta-titles.txt` does not sample.** The Owner's "for all locales" also
covers de-DE, pl-PL, en-GB, en-US, es-MX and ru-UA, none of which has a reference example.
`task-b.ts`'s own table already carries the relevant signal for at least de-DE (line 68: "German
runs 20–30% longer... the de-DE budget reflects this," which is why its current budget is tighter at
≤45, not ≤48) — extrapolating proportionate numbers for these rows, within the same narrow
below-55 window, is a Specification/Planning-level exercise, not a further Open Decision.

**OD-7 itself resolves cleanly** — the authorization was granted unambiguously, matched exactly to
the scope FR-13(c) needed. The numeric-precision and long-name residuals are recorded separately as
OD-8, non-blocking.

## New Open Decision opened this round

**OD-8 (non-blocking, delegated to SPECIFICATION).** Given OD-7's grant reaches only the budget
table (not `output-validator.ts`'s untouched 55-char ceiling), the only budget values that both fit
the sampled locales and respect that ceiling are 53 or 54 characters — a 1-2 character margin,
against the table's currently designed 7. Separately, a product with a longer name than the QA
sample makes the template unreachable at any budget, by design, not by mis-calibration. Whether
Specification (a) sets the affected budgets at the top of the {53,54} window and documents the
thinned margin as an accepted tradeoff, and (b) documents the long-name case as an accepted,
inherent cascade-degradation outcome (parallel to FR-7's own accepted `productShort()`
false-positive cost) rather than a defect, is a downstream precision/documentation decision this
stage cannot make on product-catalog knowledge it does not have. See `open_decisions` (v3), OD-8,
for the full write-up. The window is non-empty today, so this does not block Specification from
resuming.

## Re-assessment: does any blocking Open Decision remain?

No. OD-1 through OD-6 were resolved as of v2 (none `blocking: true`); OD-7 is resolved in this
round; OD-8 is opened non-blocking. This Story has no open blocking question as of this round.

## Impact areas (updated)

- **Prompt / FROZEN files:** OD-7 adds a second, explicitly authorized edit inside `task-b.ts`, on
  top of OD-3's existing grant — the per-locale Title budget table (lines 67-79), in addition to
  OD-3's mandatory-suffix instruction and four few-shot anchors. Both land in the same FROZEN file;
  a single same-commit `bash arch-guard.sh --rebaseline` covers both when implemented together.
  Nothing changes about the two D3/OD-3-authorized files this Story already covers
  (`master-system-prompt.ts`, `task-a.ts`) or the confirmed no-edit-needed `task-c.ts`.
  `output-validator.ts`'s 55-char ceiling remains untouched and out of scope — see OD-8.
- **All other impact areas** (export/download behaviour, generated HTML, uk-UA fan-out, generation
  invariants, dependencies): unchanged from v2 — OD-7/OD-8 are scoped entirely within `task-b.ts`'s
  already-identified surface and do not touch any new file or mechanism.

## Verdict rationale

OD-7, the one remaining blocking Open Decision this Story had accumulated (raised by SPECIFICATION,
not by this stage), is now resolved by the Owner with an answer independently verified against the
live `task-b.ts` table, independently re-counted `meta-titles.txt` reference lengths, and the
untouched FROZEN hard ceiling in `output-validator.ts`. Verification quantified a real residual — a
narrow {53,54} achievable budget window and a long-product-name case the grant cannot fully resolve
— recorded as OD-8, non-blocking, rather than silently resolved or silently dropped. No blocking
Open Decision remains for this Story.

**This Story is Ready for Specification** — concretely, ready for SPECIFICATION to resume from its
`BLOCKED` v4 state and produce a v5 that applies OD-7's grant to FR-13(c) and carries OD-8 forward
explicitly.

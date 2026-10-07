---
artifact: clarification_report
story: US-6.2
version: 3
status: DRAFT
owner: so-clarifier
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-07T00:00:00Z
supersedes: docs/evidence/US-6.2-clarification-report.md#2
inputs_consumed:
  - key: story
    version: 3
  - key: open_decisions
    version: 3
open_decisions_blocking: false
---

# US-6.2 - Clarification Report (v3)

**Verdict: Ready for Specification.** Five non-blocking Open Decisions remain (OD-8, OD-9, OD-10, OD-11, OD-12) in
`docs/decisions/US-6.2-open-decisions.md` v3. OD-1 to OD-7 are resolved by the human decisions in Story v3 (2026-10-06).

## What is clear

- Actor, defect, expectation and reproduction (`Knowledge/Issues/1/strong-tags.txt`) are stated.
- Fix layer (human decided): delete the `<b>` to `<strong>` block in `src/utils/html-cleaner.ts:164-169`, no compensating logic;
  replace the `[FORMAT]` emphasis sentence in the FROZEN `src/prompt-core/master-system-prompt.ts` (lines 475-476) with a `<b>`
  for all emphasis rule; `src/prompts/optimizer.ts` is not modified; `bash arch-guard.sh --rebaseline` and `.arch-guard-checksums`
  in the same commit. Explicit AGENTS.md section 9 permission is recorded in the Story (2026-10-06), so the FROZEN stop is satisfied.
- Entry points: `optimize()` and Fast `cleanStructureOnly()` (both through `cleanHtmlStructure`); HTML editor, renderer out of scope.
- ACs: AC-1, AC-2, AC-3, AC-5, AC-6, AC-7 are deterministic unit checks on the shared cleaner; AC-4 and AC-8 are text assertions
  and a diff check on the FROZEN file; AC-9 is `bash arch-guard.sh` after rebaseline; AC-10 is `npm run test:logic` green.
- AGENTS.md section 4 criteria in play: figcaption `<b>` lead-in (consistent with the new rule). Spec-count parity, figure
  structure and video survival are not touched by a tag-name change; keep them in the regression run.

## Locale and uk-UA fan-out (examined explicitly)

Story v3 declares all stores and all STORE_REGISTRY locales. The master prompt is the shared system block 0 of Task A (the uk-UA
master that every other locale is translated from, AGENTS.md section 8), Task C (translation), the Optimizer and, through
`buildPromptA`, the Doc pipeline. So the edit reaches every store, not only the Optimizer. `task-b.ts` and `task-translate.ts` do
not send the master. Prompt-cache note: the cached master block changes once. No store, locale or currency is named in the Story,
so there is no STORE_REGISTRY conflict. Already-generated masters keep their `<strong>`; this is not an open question, only an
assumption for the spec.

## Read-only findings of this run (Story Q4)

- Only `master-system-prompt.ts:475-476` holds the sentence in `src`; other restatements of the rule are in
  `task-a-doc.ts:96` and `simplified-template-blocks.ts:127` (Doc path, not FROZEN, not named in the Story: OD-11) and in comments
  (`description-doc.ts`, `description-doc.schema.ts`, `render-description.spec.ts:758`, `test/render-reconciliation.report.md`).
- No existing spec asserts the sentence text. `test/fixtures/golden/full-description-prompts.json` embeds it (13 matches) and
  `full-description.golden.spec.ts` demands byte equality, so the golden will fail after the FROZEN edit (OD-12).
- The three sentences in `[FORMAT]` share lines 475-477, so "lines 475-476" is not a clean boundary for AC-8 (OD-10).
- `bash arch-guard.sh` is green now; rebaseline will change only `master-system-prompt.ts`.
- Story `track: angular` but the FROZEN prompt edit is prompt-track work; the planner assigns per-task tracks.

## What remains open (all non-blocking)

- OD-8 (Story Q2): `itemprop` on a bold tag is dropped by the existing microdata strip; AC-7 covers `class` only.
- OD-9 (Story Q3): no deterministic enforcement of a figcaption `<b>` lead-in; accepted limitation by default.
- OD-10 (Story Q1): density cap dropped? trailing sentences verbatim? sentence boundary for AC-8.
- OD-11 (Story Q4): Doc-path prompt strings still say "Reserve `<strong>`".
- OD-12 (Story Q4): golden fixture regeneration is not named in the Story's Surface.

None blocks the specification: each has a default the spec can state for the human to overturn at HUMAN_SPEC_APPROVAL.

## Previous-run items

OD-1 to OD-6 (v1) and OD-7 to OD-9 (v2): all accounted for in the decisions log. None dropped. The existing Specification (v1,
approved against Story v2), the plan, the task breakdown and the impact analysis consumed older Story versions and are stale; they
must be re-run against Story v3 and this report.

---
artifact: open_decisions
story: US-6.2
version: 3
status: DRAFT
owner: so-clarifier
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-07T00:00:00Z
supersedes: docs/decisions/US-6.2-open-decisions.md#2
inputs_consumed:
  - key: story
    version: 3
  - key: open_decisions
    version: 2
open_decisions_blocking: false
---

# US-6.2 - Open Decisions (v3)

Re-run against Story v3. The human decisions of 2026-10-06 (no `optimizer.ts` override; explicit AGENTS.md section 9
permission to edit the FROZEN `master-system-prompt.ts`; plain deletion of the cleaner block) settle OD-1 to OD-7.
Still open and carried forward: OD-8 (Story Q2), OD-9 (Story Q3). New or re-scoped by this run: OD-10 (Story Q1),
OD-11 and OD-12 (Story Q4 findings). None is blocking; each can be written into the Specification as a stated contract
or labelled assumption, and the human can overturn any of them at HUMAN_SPEC_APPROVAL.

## Resolved by human (Story v3)

| id | Question (short) | Resolution, with source |
|---|---|---|
| OD-1 | Fix layer | Now: cleaner (delete `html-cleaner.ts:164-169`) + FROZEN master prompt edit. The `optimizer.ts` override option is rejected. Story v3 Context "Human decisions", Scope "Touches FROZEN files?". |
| OD-2 | AC-4 falsifiability | AC-4 is a master-prompt text contract (sentence absent, `[FORMAT]` states `<b>` for all emphasis), asserted against the exported prompt. Live-model proof stays out of scope (manual run = release evidence). |
| OD-3 | Mechanism: restore vs stop converting | Block deleted, "no compensating logic" (Story v3 Context). |
| OD-4 | Entry points | `optimize()` and Fast `cleanStructureOnly()` in scope; HTML editor and renderer out of scope. |
| OD-5 | Attributes / nesting / AC-3 counting | AC-3 counts outside `h2`-`h4`; AC-7 covers `class`. Residual `itemprop` question is OD-8. |
| OD-6 | AGENTS.md section 4 figcaption `<b>` vs `<strong>` | Story v3: section 4 `<b>` lead-in is "consistent with the new rule". Residual enforcement gap is OD-9. |
| OD-7 (v2) | Does the `optimizer.ts` override beat master line 475 in the live model | Moot: the override is rejected (Story v3), and the conflicting master sentence is itself replaced. Model obedience to the new wording is still not provable by tests; the manual run is the release evidence (Story Out of scope). |

## OD-8 (Story Q2) - Other cleaner steps and attributes on bold tags - blocking: false

**Question.** Does anything in `cleanHtmlStructure` besides the deleted rewrite strip attributes from `<b>`/`<strong>`, and is
dropping `itemprop` on a bold tag acceptable given AC-7 covers only `class`?

**What was checked.** Carried from v2 (code reading, `html-cleaner.ts`): the generic microdata strip at `:279-283` removes
`itemscope`, `itemtype` and `itemprop`; `class` is untouched; heading hygiene (`:117-129`) unwraps bold in `h2`-`h4` (AC-5,
intended). Nothing was executed. The Story states the same finding but records no human decision on it.

**Why it cannot be inferred.** Whether an `itemprop` on bold is a defect or intended hygiene is a product call; the Story leaves
the question open.

**Impact if unresolved.** Low. A `<b itemprop=...>` loses that attribute, which AC-7 does not cover; a spec writer would
otherwise have to decide whether to widen AC-7.

**Default a spec may carry:** AC-7 covers `class` only; microdata stripping on bold is existing behaviour, out of scope.

## OD-9 (Story Q3) - No deterministic enforcement of the figcaption `<b>` lead-in - blocking: false

**Question.** A `<strong>` lead-in in an input `<figcaption>` stays `<strong>` through the cleaner (AC-2, AC-6). Is that accepted,
or is a deterministic figcaption-only normalisation wanted?

**What was checked.** Carried from v2: the Optimizer path (`content-orchestrator.service.ts:1753-1773`) does not call the FROZEN
`output-validator.ts` (it runs `stripCodeFences`, `cleanHtmlStructure`, `finalizeTablesForDisplay`; the repair gate validates
language consistency only); `output-validator.ts` matches the literal `<b>` only (`:274,312,335`) and matters for the Generator
pipeline. The Fast path has no model, so an input `<strong>` figcaption lead-in passes through by design. Story v3 excludes
compensating logic.

**Why it cannot be inferred.** Whether the gap is acceptable is a product call; the Story says "accepted as a limitation" but
frames it as a question.

**Impact if unresolved.** A figcaption `<strong>` can reach Optimizer or Fast-path output, against AGENTS.md section 4.

**Default a spec may carry:** documented limitation, not a requirement; the new master wording is the only enforcement.

## OD-10 (Story Q1) - Density cap and trailing sentences in the replaced `[FORMAT]` text - blocking: false

**Question.** The sentence being replaced reads (lines 475-476): "Reserve `<strong>` for brands / main model / core USPs at a
density of 2-3 per 500 characters maximum; use `<b>` for inline spec scannability. Emit only tags that wrap content." followed by
"Keep a high text-to-HTML ratio." (line 477). Does a density cap carry over to the `<b>`-for-all-emphasis rule, and where exactly
does the replaced sentence end (do "Emit only tags that wrap content." and "Keep a high text-to-HTML ratio." stay byte-identical,
as AC-8 requires every other line to be)?

**What was checked.** `master-system-prompt.ts:468-477` read: the three sentences share lines 475-477, so "the sentence on lines
475-476" is not a clean line boundary (line 476 also holds "Emit only tags that wrap content."). The human instruction names only
the `<strong>` rule. Other prompts copy the cap: none in `optimizer.ts`, `task-a.ts`, `task-c.ts`. No source decides the cap.

**Why it cannot be inferred.** Dropping the cap removes a existing (calibrated) bold-density limit and may let the model over-bold;
keeping it changes the human's wording. Either is a guess.

**Impact if unresolved.** The Specification must state the exact new `[FORMAT]` text and AC-8's byte-identical boundary. AC-8
("changes only the emphasis sentence") is only checkable once that boundary and the cap are fixed.

**Default a spec may carry (Story's own assumption):** density cap dropped; the two trailing sentences stay unchanged; spec
quotes the replacement text verbatim so the human approves it at HUMAN_SPEC_APPROVAL.

## OD-11 (Story Q4, part 1) - Other prompts that restate the "reserve strong" rule - blocking: false

**Question.** Are `src/prompts/task-a-doc.ts:96` and `src/prompts/simplified-template-blocks.ts:127`, which repeat "Reserve
`<strong>` for brands / main model / core USPs; use `<b>` for inline scannability", in scope for change, left as is, or listed
as a known inconsistency?

**What was checked (read-only grep).** `MASTER_SYSTEM_PROMPT` is sent by: `task-a.ts:173` (Task A, the uk-UA master), `task-c.ts:89`
(translation of the master to non-uk-UA locales), `optimizer.ts:117` (Optimizer). The Doc pipeline `buildPromptADoc` calls
`buildPromptA`, so it also carries the master as block 0 and its task block overrules `[FORMAT]` (`task-a-doc.ts:34`). `task-b.ts`
and `task-translate.ts` do not import the master. The Doc-path prose rule (`PROSE FIELDS ADMIT <b> and <strong>`, asserted by
`task-a-doc.spec.ts:104,166`) and the renderer admit both tags; the sentence "Reserve `<strong>`" also appears in comments in
`description-doc.ts:17-19`, `description-doc.schema.ts:22`, `render-description.spec.ts:758` and `test/render-reconciliation.report.md:334`.
None of these files is named in the Story's Surface.

**Why it cannot be inferred.** The Story scopes the doc renderer out but is silent on these two prompt strings, which would now
disagree with the master text ("`<b>` for all emphasis") for Doc-path and simplified-template runs.

**Impact if unresolved.** Doc-path generation keeps instructing `<strong>` for brands while the master says `<b>`; the Story's
"Observed" defect is the Optimizer/Fast path, so behaviour there is not worsened. A specification writer would otherwise guess
whether to touch `task-a-doc.ts` (not on the FROZEN list) and `simplified-template-blocks.ts`.

**Default a spec may carry:** leave both untouched and record the residual inconsistency as out of scope; comments referencing the
old sentence are stale documentation only.

## OD-12 (Story Q4, part 2) - Golden fixture embeds the removed sentence - blocking: false

**Question.** `test/fixtures/golden/full-description-prompts.json` contains the old sentence (13 matching lines) and
`src/prompts/full-description.golden.spec.ts` asserts every prompt builder output is byte-equal to it. Is regenerating that
fixture part of this Story (AC-10)?

**What was checked.** grep of `src` and `test`: no existing spec asserts the sentence text itself (`master-system-prompt*.spec.ts`,
`optimizer.spec.ts`, `task-a.spec.ts`, `constants.spec.ts`, `output-integrity-wiring.spec.ts`, `render-description.spec.ts`
contain no assertion on it; `render-description.spec.ts:758` is a comment). The golden spec's header says goldens were captured from
a pre-Story-2.2 tree and must stay green. The Story Surface lists "prompt specs", not fixtures, and AC-10 speaks of specs.

**Why it cannot be inferred.** Regenerating a byte-identity golden is a deliberate act the Story does not name; it changes a
regression fixture whose purpose is to detect prompt drift.

**Impact if unresolved.** `npm run test:logic` fails on the golden spec after the FROZEN edit, so AC-10 cannot be met unless the
fixture is regenerated; a spec would otherwise guess whether to regenerate or edit the spec.

**Default a spec may carry:** regenerate only the affected `systemBlocks` text in the golden, diff reviewed to show the single
sentence change, as a test-writer task; AC-10's "no test deleted or weakened otherwise" holds.

## Resolved from cited sources

- **Locale/store scope and uk-UA fan-out (re-examined).** Story v3 Scope says all of STORE_REGISTRY and all locales and states the
  master is shared text. AGENTS.md section 8 confirms Task A builds the uk-UA master from which Task C translates every other locale,
  so the edit reaches every store and locale through the master (Task A, Task C, Optimizer, Doc pipeline via `buildPromptA`). No
  store, locale or currency is named, so no `STORE_REGISTRY` conflict. Already-generated artifacts keep their `<strong>`; a Task C
  translation preserves tags it is given. Not an open question: scope is decided by the Story, impact analysis lists the pipelines.
- **Arch-guard baseline.** `bash arch-guard.sh` currently exits 0 with "All frozen files unchanged", so `--rebaseline` after the
  approved edit changes only the `master-system-prompt.ts` checksum (no unrelated drift; the stale-baseline memory note is historical).
- **Existing tests of the conversion.** None assert b-to-strong; new tests are needed in `src/utils/html-cleaner.spec.ts` and
  the master prompt spec.
- **Track.** Story is `track: angular` while AC-4/AC-8/AC-9 touch the prompt-core FROZEN file; the task breakdown assigns per-task
  tracks (artifact-schema.md). Reported as a finding for the planner, not an Open Decision.

## Change history

- **v1** - OD-1 to OD-6 raised (OD-1, OD-2 blocking).
- **v2** - OD-1 to OD-6 resolved; Story Q1/Q2/Q3 carried as OD-7/OD-8/OD-9.
- **v3** - OD-1 to OD-7 resolved-by-human via Story v3 (override rejected, FROZEN edit permitted). OD-8, OD-9 carried. New: OD-10 (Story Q1
  density cap / sentence boundary), OD-11 and OD-12 (Story Q4 findings: other prompt restatements, golden fixture). All non-blocking.

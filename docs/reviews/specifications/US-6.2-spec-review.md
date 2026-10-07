---
artifact: specification_review
story: US-6.2
version: 2
status: APPROVED
owner: so-spec-reviewer
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-07T00:00:00Z
supersedes: docs/reviews/specifications/US-6.2-spec-review.md#1
inputs_consumed:
  - key: story
    version: 3
  - key: specification
    version: 2
  - key: open_decisions
    version: 3
open_decisions_blocking: false
---

# Spec Review: US-6.2 — Keep `<b>` and `<strong>` exactly as supplied (re-review)

**Verdict:** PASS
**Loop-back:** n/a

> A `PASS` here is **not** human approval. Approval is recorded only by `/so:approve`
> (AGENTS.md §10).

## Summary

Re-review of Specification v2 against Story v3 (AC-1..AC-10) and Open Decisions v3. Review v1 (spec v1 / Story v2) is stale and superseded. The staleness contract holds: the Specification consumed Story v3, open_decisions v3 and clarification_report v3, which are the current versions. The Specification covers all ten ACs, quotes the exact old sentence correctly, covers the golden fixture under FR-10 and contains no `optimizer.ts` override language. Only non-blocking findings remain.

## 1. Acceptance-criterion coverage

Matrix re-derived from Story v3.

| AC | Story says | Specification satisfies it via | Verdict |
|---|---|---|---|
| AC-1 | `<b>X</b>` stays `<b>`, no `<strong>` | FR-1 | covered |
| AC-2 | `<strong>X</strong>` stays, no `<b>` | FR-2 | covered |
| AC-3 | Mixed input: equal counts outside h2-h4 | FR-3 | covered |
| AC-4 | Master prompt: old sentence absent, `[FORMAT]` states `<b>` for all emphasis, test on exported text | FR-4 (exact old and new text quoted) | covered |
| AC-5 | Heading bold still unwrapped | FR-5 | covered |
| AC-6 | Fast path `cleanStructureOnly()` keeps both | FR-6 | covered |
| AC-7 | `class` and tag name kept | FR-7 | covered |
| AC-8 | FROZEN diff limited to the emphasis sentence; `optimizer.ts` unmodified | FR-8 | covered |
| AC-9 | `arch-guard.sh` exits 0 after `--rebaseline`; checksums in the same commit | FR-9 | covered |
| AC-10 | Existing specs follow new wording; `test:logic` green; nothing deleted or weakened | FR-10 | covered; includes the golden fixture |

Every FR (FR-1 to FR-10) traces to an AC. Scope creep: none. NFR-1 to NFR-5 are constraints and add no behaviour.

## 2. Non-verifiable language

None blocking. Every FR names a fixed input, an observable output and a pass/fail condition. FR-4 is asserted on the exported prompt text, FR-8 and FR-9 on `git diff` and `arch-guard.sh`, and FR-1 to FR-3 and FR-5 to FR-7 on fixed strings. Model obedience is explicitly excluded (A-1, Out of scope). One soft spot: FR-10 "no test deleted or weakened otherwise" is a review-time judgement rather than a mechanical check. It is carried verbatim from AC-10 and is acceptable.

## 3. Contradictions with the Story

None. Scope tables compared directly: stores and locales are "all STORE_REGISTRY". The FROZEN edit is limited to `master-system-prompt.ts` under the §9 permission recorded in Story v3. The Story's Out of scope list is carried over, with additions the Story already decided or deferred (A-6 stale prompts and comments, `itemprop`, figcaption enforcement). The Specification states the density cap is dropped, which is the Story's own Q1 assumption and is recorded as OD-10.

## 4. Scope creep

Out of scope section present and non-empty (11 items). No `optimizer.ts` override or preservation clause is required anywhere. `optimizer.ts` appears only as "not modified" (Summary, Background, FR-8 and Out of scope), which matches AC-8.

## 5. Missing edge cases, boundaries and failure paths

| Area | Finding |
|---|---|
| FR failure paths | Every FR states one. Clear. |
| Locale fan-out (uk-UA master to derived locales) | Addressed in the Scope row Locales. The shared master text reaches Task A (uk-UA), Task C (translations), the Optimizer and the Doc pipeline via `buildPromptA`. Already generated descriptions are not regenerated. Clear. |
| Store scope | No store, locale or currency is named or changed. Clear. |
| §4 invariants | The figure/figcaption criterion is quoted. The others are stated as unchanged and left to the existing suites (NFR-3). Clear. |
| Provider behaviour | NFR-2: provider independent, `systemBlocks` not collapsed. Clear. |
| Empty and boundary inputs | FR-1 and FR-2 failure paths cover input with no bold; the note under FR-3 covers nested, empty and non-list bold. Clear. |

## 6. Compliance with AGENTS.md

| Check | Result |
|---|---|
| §4 quoted verbatim | Yes. The figure/figcaption criterion is quoted and cited. |
| §9 FROZEN impact | Named: only `master-system-prompt.ts`, under the human's permission in Story v3. `task-a/b/c.ts` and `output-validator.ts` are listed as unedited (Scope, NFR-4). FR-9 requires `--rebaseline` and the checksum file in the same commit. Clear. |
| §3 rules | NFR-5 covers Rules 2 and 4. NFR-2 covers prompt caching and system-block separation. Clear. |
| §11 blocking Open Decisions | `open_decisions_blocking: false`. OD-8 to OD-12 are carried as labelled non-blocking assumptions and not resolved by the Specification. Clear. |
| Implementation-design leakage | FRs state behaviour. File and function names appear only as Story-given surfaces. Clear. |

### Code verification (read-only)

- `src/utils/html-cleaner.ts:164-169` is exactly the `<b>` to `<strong>` block that copies only `innerHTML`, as claimed.
- The master prompt is at `src/prompt-core/master-system-prompt.ts` (not `src/prompts/`). `[FORMAT]` lines 468-477 were byte-inspected. The old text quoted in FR-4 matches the file exactly: the "2–3" en dash is present and there is a newline after "500". The old text ends at "scannability.". Replacing it with `Use <b> for all emphasis (brands, models, specifications).` leaves ` Emit only tags that wrap` + newline + `content. Keep a high text-to-HTML ratio.` byte-identical. The OD-10 boundary is sound. The FR-4 old-text quote is a precise exact-substring anchor.
- The golden claim holds. `test/fixtures/golden/full-description-prompts.json` contains the master sentence ("…at a density of 2–3 per 500\ncharacters maximum…") 10 times. It also contains the shorter doc-path variant ("Reserve `<strong>`… for inline scannability.") that comes from `task-a-doc.ts:96` and `simplified-template-blocks.ts:127`. `full-description.golden.spec.ts:30-35` asserts `systemBlocks[i].text` equality byte for byte. **Not a gap:** FR-10 and OD-12 explicitly cover regenerating the fixture with only the FR-4 sentence changed, as part of AC-10. The doc-path variant is unchanged under A-6, so the regenerated diff touches only the master-sentence occurrences.
- `.arch-guard-checksums:4` records `src/prompt-core/master-system-prompt.ts`, and `arch-guard.sh:115` and `:162` list it and provide `--rebaseline`. FR-9 is consistent.
- The working tree shows no source or test edits yet (only docs), so nothing has been implemented ahead of approval.

## Verdict rationale

All six axes are clear. The old sentence is quoted exactly, the trailing sentences are demonstrably byte-identical after the substring replacement, and the golden fixture is covered under AC-10. FROZEN scope, the rebaseline requirement and the `optimizer.ts` exclusion are consistent with Story v3.

## Non-blocking findings

- **FR-8 quotes the trailing sentences joined.** "`Emit only tags that wrap content. Keep a high text-to-HTML ratio.`" is quoted as one line, while the file has a line break after "wrap". The "byte-identical" claim is correct, but a test or diff check must compare the real text including the newline. Optional: say "including the existing line break".
- **FR-10 fixture count.** The Specification does not state that the doc-path variant of the sentence stays in the fixture (A-6). The planner should expect the regenerated diff to change only the 10 master-sentence occurrences, not the doc-path variant.
- **Release evidence run** (A-1) is unplanned in the workflow. Record it at reconciliation.
- **Story `track: angular`** while FR-4, FR-8 and FR-9 touch prompt-core. Per-task tracks belong to the task breakdown (planner), not a spec defect.

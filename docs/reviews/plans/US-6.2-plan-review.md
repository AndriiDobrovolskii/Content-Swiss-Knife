---
artifact: plan_review
story: US-6.2
version: 2
status: ARCHIVED
owner: so-plan-reviewer
created_at: 2026-10-07T00:00:00Z
updated_at: 2026-10-07T05:45:00Z
supersedes: docs/reviews/plans/US-6.2-plan-review.md#1
inputs_consumed:
  - key: story
    version: 3
  - key: specification
    version: 2
  - key: impact_analysis
    version: 2
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
open_decisions_blocking: false
---

# Plan Review: US-6.2 — Keep `<b>` and `<strong>` exactly as supplied (v2, re-review)

**Verdict:** PASS
**Loop-back:** n/a

> `PASS` here is **not** human approval. Only `/so:approve` records that (AGENTS.md §10).

## Summary

v1 of this review judged the obsolete `optimizer.ts`-override plan and is superseded; it is stale and no part of it is relied
on. Staleness contract: plan v2, task breakdown v2, impact analysis v2, specification v2 (APPROVED) and Story v3 are the current
versions, and all were consumed. The v2 plan is buildable as written: one pure deletion in the cleaner (T1) and one FROZEN
exact-substring swap with golden regeneration and rebaseline in one commit (T2). All code claims below were re-verified
read-only against the working tree.

## 1. Specification coverage (re-derived, both directions)

| FR | Reached by task(s) | Verdict |
|---|---|---|
| FR-1, FR-2, FR-3 | T1 | covered |
| FR-5 (heading hygiene, code runs earlier, regression test) | T1 | covered |
| FR-6 (Fast path composition test) | T1 | covered |
| FR-7 (`class`) | T1 | covered |
| FR-4 (prompt text) | T2 (swap + master-system-prompt.spec.ts) | covered |
| FR-8 (FROZEN diff limited; optimizer.ts no diff) | T2 diff checks | covered |
| FR-9 (rebaseline same commit, one line) | T2 | covered |
| FR-10 (existing tests/golden follow wording) | T2 | covered |
| NFR-1..5 | gate on each commit; NFR-4 via T2 §9 note | covered |

AC-1..AC-10 map 1:1 to FR-1..FR-10 (spec matrix) and are therefore all reachable. Task to plan: T1 -> D1, D4; T2 -> D2, D3,
D4, rebaseline step; M1 -> spec Out of scope (live obedience as manual evidence), not a builder task. Scope creep checked
against *Out of scope* by name: no optimizer.ts clause, no `task-a-doc.ts` / `simplified-template-blocks.ts` edit, no
`strong -> b` normalisation, no other FROZEN file, no stale-comment edits (`render-description.spec.ts:758` comment and
`description-doc*.ts` comments are explicitly left alone), no `itemprop` preservation. Clear.

## 2. FROZEN files (AGENTS.md §9)

| Task | Frozen file touched | §9 stop present? | Sibling-file pattern used? | Verdict |
|---|---|---|---|---|
| T1 | none (`html-cleaner.ts`) | n/a | n/a | ok |
| T2 | `src/prompt-core/master-system-prompt.ts` only | yes: first-step note, permission recorded in Story v3 (2026-10-06, Story lines 52, 56, 67), STOP rule for any other FROZEN file | no; plan states why (the sentence lives in the FROZEN constant itself) | ok |

Verified: Story v3 records the explicit §9 permission and names only `master-system-prompt.ts`; `task-a/b/c.ts` and
`output-validator.ts` are listed as untouched; `git status` shows no modified file under `src`. Plan assumes approval it does
not have: no (the approval it relies on is recorded in the Story).

## 3. Architecture rules (AGENTS.md §3)

| Rule | Checked | Finding |
|---|---|---|
| 1 — no direct SDK outside `server/providers/` | yes | None introduced. |
| **2 — retrieval separate from generation** | yes, deliberately | Neither task touches search, page fetch or orchestration; a text deletion and a static sentence swap. Clear. |
| 3 — prompt text out of services | yes | Prompt text change stays in `src/prompt-core/`. |
| 4 — no key in the bundle | yes | No secret surface. |
| 5 — no existing feature broken | yes | `cleanHtmlStructure` consumers (`content-orchestrator.service.ts`, `html-cleaner.spec.ts`, `image-figure-style.spec.ts`, `test/render-reconciliation.spec.ts`) have no assertion on `<b>` -> `<strong>`; the `<b>` hits are figcaption cases. Lines 164-169 of `html-cleaner.ts` are the comment plus one self-contained `querySelectorAll('b')` loop. |
| `STORE_REGISTRY` sole source | yes | Nothing locale/currency related added. |
| `systemBlocks` not collapsed | yes | Payload shape unchanged; one cached block changes by one sentence (D6, one-time cache miss). |

## 4. prompt → schema → renderer → validator

- Links touched: prompt only (plus the cleaner on the HTML path). No schema, renderer or validator change; `output-validator.ts` untouched.
- Stay in agreement: yes (D5).
- Contract-before-consumer ordering holds: yes. T1 and T2 share no symbol; the T2 internal order (prompt, then golden fixture that consumes it) is within one commit.
- §4 criteria: figcaption `<b>` lead-in is the only one in play; the list is complete and consistent with the new wording (OD-9 limitation recorded).

## 5. Task quality

| Check | Result |
|---|---|
| All eight fields present on every task | Yes (track, depends, FROZEN flag, files, tests+runner, acceptance, commit; rationale in the breakdown header). |
| Acceptance checks observable | Yes (red/green cases, `git diff` shapes, exactly 10 changed sentences, exactly one changed checksum line, arch-guard exit 0). |
| Each task could end in one green commit (§13) | Yes. T1: deleting the rewrite breaks no existing spec. T2: the golden spec fails until the JSON is regenerated and arch-guard fails until rebaselined, so FROZEN edit + master-prompt tests + regenerated golden + `.arch-guard-checksums` are one commit, as stated in plan and breakdown. |
| No task spans two tracks | Yes (T1 angular, T2 prompt). |
| Ordered by dependency and risk, rationale stated | Yes; independent tasks, rationale given and honest about it. |
| Fixture updates sit with the change that moves them | Yes (golden JSON in T2 with the FROZEN edit). |

## 6. Test strategy

| Check | Result |
|---|---|
| Every task names test files and runner | Yes, `test:logic` (vitest) for both. |
| Component specs named `*.component.spec.ts` | n/a, none. |
| Untested tasks justify changing no behaviour | n/a. |
| Failure paths from the FRs are covered | Yes (absent-sentence / present-sentence both asserted; no-`<strong>`-introduced mirror cases). |
| Nothing relies on weakening/skipping a test (§7.7) | Yes. Grep over `src` and `test` for the old wording finds only the FROZEN file, `task-a-doc.ts`, `simplified-template-blocks.ts`, `description-doc.ts` and a comment in `render-description.spec.ts:758`; no spec asserts it, so FR-10 reduces to the golden fixture. |

## 7. Impact-analysis fidelity

- Plan consumed the survey rather than re-deriving it: yes (v2 both).
- Files touched but not surveyed: none.

## Independent verifications requested

- **master-system-prompt.ts 468-477:** confirmed. `[FORMAT]` sits at 468; the old sentence is at 475-476 (`...of 2–3 per 500` / `characters maximum; use <b> for inline spec scannability.`), followed on 476-477 by ` Emit only tags that wrap` / `content. Keep a high text-to-HTML ratio.` The dash is U+2013. Searching the source for the spec's old string with a bare LF break gives 1 hit when CR is ignored; byte-for-byte the plan's old/new text equals the spec FR-4 text (same wording, en dash, newline after "500", and "Emit only tags that wrap" + newline + "content." preserved).
- **Golden JSON:** parsed, the old sentence occurs exactly once in `systemBlocks[0].text` of each of the 10 named cases (doc/expert3d, doc/expert3d+hook, doc/c3d, html/expert3d, html/legacy, html/legacy+lang, html/c3d+customTemplate, c/expert3d-es, c/eu-en, c/us-uk) = 10, and in neither `translate/uk-user` nor `translate/de-internal`. The other 3 raw "Reserve <strong>" hits (13 total) are the `task-a-doc`/simplified variants (A-6), which the plan keeps byte-identical.
- **Write-back preserves formatting:** `JSON.stringify(parsed, null, 2)` with `\n` replaced by `\r\n` plus a trailing `\r\n` is byte-identical to the file as it is (CRLF, 2-space indent, literal non-ASCII, no `\u` escapes). So a parse/replace/write-back script is safe if it re-emits CRLF; the plan's "identical indent, trailing newline, no re-escaping" wording is feasible, and the 10-sentence diff check backs it.
- **arch-guard rebaseline:** `--rebaseline` writes the checksums of all five FROZEN files from the current working tree (`arch-guard.sh` 161-165), so it would also absorb any drift. Today `bash arch-guard.sh` reports all five unchanged (exit 0, no drift in the stale-baseline files), so after the swap exactly one line (master-system-prompt.ts) changes. The plan's guard (git diff --stat/status before; exactly one changed line after; otherwise revert and STOP) is sufficient.
- **M1:** not claimed anywhere; labelled PENDING, human-owned.
- **optimizer.ts override language:** none remains; the only mentions are in "rejected alternatives" / out-of-scope contexts.

## Verdict rationale

All seven axes are clear: no design defect (no `changes_required`), no decomposition defect (no `changes_required_tasks`), and the
approved Specification v2 is a sound basis (no `changes_required_specification`). No input is stale, superseded or blocked.

## Non-blocking findings

- Working-tree line endings: `master-system-prompt.ts` and the golden JSON are CRLF on disk (index is LF, `core.autocrlf=true`). The template literal is LF at runtime, but an Edit tool match of a multi-line old string may need to tolerate CRLF. The builder must keep CRLF unchanged in the file and confirm with `git diff` showing only the 475-477 region; the plan's "must match once" check already fails loudly if it does not match. The golden script must write CRLF back.
- T1-before-T2 is stated as convention, not dependency; acceptable.
- Residual risks the pipeline cannot close: A-1 (live model obedience, M1 only), dropped density cap (A-4), `task-a-doc.ts:96` and `simplified-template-blocks.ts:127` still saying "Reserve `<strong>`" on the Doc pipeline (A-6), figcaption `<strong>` not normalised (OD-9). All recorded in the plan.
- This `PASS` is not human approval; HUMAN_PLAN_APPROVAL is still required.

---
artifact: verification_report
story: US-2.2
version: 1
status: ARCHIVED
owner: so-implementation-verifier
stage: IMPLEMENTATION_VERIFICATION
created_at: 2026-09-21T23:30:00Z
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 1
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
  - key: implementation_report
    version: 2
  - key: quality_gate_report
    version: 2
---

# Implementation Verification - US-2.2

Verdict: **PASS** (with non-blocking findings). Basis: the working-tree diff against HEAD, read directly; not the reports.

## 1. Rule 2 - retrieval separate from generation: HOLDS
Read: `git diff` of `content-orchestrator.service.ts`, `llm.service.ts`, `doc-pipeline-flag.ts`, `task-a.ts`, `task-c.ts`, `task-a-doc.ts`, `task-translate.ts`, and the new `simplified-template-blocks.ts`, `simplified-templates.ts`, `simplified-word-ranges.ts`, `simplified-specs-shape.ts`, `description-doc.completeness.ts`.
- The orchestrator diff adds only imports of completeness/range validators, a `flatSpecs` render option and a video-embed count. It removes the consumables gate. A grep of the diff for serper/retriev/fetch finds nothing added. The only "ground" hits are lines deleted with the consumables gate; the Doc gate still calls `validateSpecsGroundingDoc` and the `groundingSpecs()` translation step (present at HEAD and now).
- The new files are pure text builders and validators: no fetch, no model call, no `RetrievalProvider`/`RetrievalService` reference. No Google Grounding reintroduced. `server/` changed only by a comment in `store.js`.

## 2. AGENTS.md section 4 - HTML criteria (changed: prompt, schema, renderer, validator)
Checked against the diff and the code that produces the output:
- Product itemtype: renderer diff adds no `schema.org/Product`. OK.
- Number-unit space: the section-7 prompt text tells the model to keep "1.75 mm"; the renderer does not alter values. Flat spec rows call `esc()` on label/value and join array values, so values and units are unchanged. OK.
- Spec count parity: `spec-count-parity.ts` returns early only when the doc omitted section 7 (no specs supplied). Flat renderer concatenates all categories' rows (lossless). OK. The completeness gate rejects a multi-category simplified Doc.
- Figures and video: `renderFigure` is untouched apart from a comment; media rendering is not modified. The orchestrator now counts source video embeds for every template (FR-23). Not exercised against a live model here.
- `meta_title`/`meta_description`: no diff in `validateSeoMetadata`. **`meta-description-currency` remains a `warning` and untouched (still disarmed).** OK.
- HTML only / `<hr>` after section: flat specs path keeps `<section class="specs">` + `<hr>`. The absent-paragraph branches emit no markup. OK.
- Limitation: I read code, not fresh model output; no live sample exists in the artifacts.

## 3. STORE_REGISTRY: HOLDS
`constants.ts` diff is deletions plus comment edits (consumables overlays/schema removed). Grep of the new src files (excluding specs) for locale codes, currency symbols and URLs: none. Locale-dependent output stays in `getRenderRules`/`V4_SECTION_HEADINGS`. `types.ts` gained `geo: ['UA','EU','ES','US']` on the three template entries. This mirrors the pre-existing `consumables-resin` entry shape (`geo` field of `CONTENT_TEMPLATES`, not a language list); non-blocking note.

## 4. Prompt-caching separation: HOLDS
- `task-a-doc.ts`: `systemBlocks[1]` is swapped for a fixed per-template string with `cache: true`; per-run facts (empty specs, Accessories checkbox, conditional section 5) go into `userContent` (uncached). Full description path is byte-identical (verified by the golden guard per the reports, and by reading the branch: `templateId` undefined leaves `TASK_A_DOC_INSTRUCTION`).
- `task-a.ts` (legacy HTML path): overlay is appended to `userContent`; `systemBlocks` array is structurally unchanged (`MASTER_SYSTEM_PROMPT`, `TASK_A_INSTRUCTION`, overlays, all `cache: true`).
- `task-translate.ts` / `task-c.ts`: clause appended to the cached instruction, but it is a fixed string per template id, so it forks a bounded number of cache slots, not per run. OK.

## 5. FROZEN files (section 9): approved and re-baselined
- Changed among the five: `task-a.ts`, `task-c.ts`, `output-validator.ts`. **`master-system-prompt.ts` and `task-b.ts` are untouched** (empty diff). `task-faq.ts` (not frozen) also has no diff.
- Approval: OD-9 in `docs/decisions/US-2.2-open-decisions.md` (human, 2026-09-21) names exactly those three files. The diffs are minimal: imports, one call each, and deletions of consumables text. No new prompt wording in the frozen files (all in the sibling `simplified-template-blocks.ts`).
- `.arch-guard-checksums` diff: exactly three lines changed (those three files); master prompt and task-b lines unchanged. Re-baselined in the working tree; it must be committed in the same commit as the frozen edits. Nothing is committed yet, so the same-commit condition is satisfiable but not yet true. **Action for the committer.**
- F1 (human, Option A): the two `CONSUMABLES MODE` notes in `constants.ts` were deleted (constants is not FROZEN, but golden-guarded). The diff shows only deletions plus comment edits there. The golden file `test/fixtures/golden/` is untracked in this working tree, so I could not diff the 3 re-captured entries against a HEAD baseline; the "only three entries, text only removed" claim rests on the implementation report (review-only, not independently reproduced).
- `output-validator.ts` diff: deletes the consumables char-limit gate, adds one `validateSimplifiedTemplateHtml` call; `validateSeoMetadata` untouched.

## 6. Angular/server conventions: OK
New `ContentTemplateSelectComponent` uses signal inputs and outputs, `@for`/`@if`, plain HTML `<select>`; wired into standalone `AppComponent` imports. No NgModule, no RxJS added, no SDK import, no prompt string in a service, no secret path touched. `server/usage/store.js` change is a comment only (no schema change, so the no-migration concern does not apply).

## 7. Scope discipline: OK with notes
The diff matches the task breakdown (T1-T17) and OD-14 authorized deletions (consumables files, fixtures, scaffold pins, reconciliation spec). The null-safety edits in `doc-prose-transforms`, `bullet-lead-punctuation`, `heading-style`, `sentence-length`, `specs-grounding`, `tov-second-person` are the T3 optional-paragraph consequence, not drive-bys. Untouched-file comment edits (`repair-strategy.ts`, `render-description.ts` doc comments) are consumables-name purges under OD-14. The working tree is on branch `feat/US-2.1-migrate-descriptions-to-v4-schemas` although US-2.1 is archived; branch hygiene is for the PR stage (not blocking).

## 8. Open item: CTA/FAQ section numbering inconsistency
Evidence:
- Story, tests, `simplified-template-blocks.ts`: CTA = section 8, FAQ = section 9.
- FROZEN `master-system-prompt.ts` (lines 34-35, 134, 348-352) and `task-faq.ts`: CTA = section 9, FAQ/HowTo = section 8. Full `TASK_A_DOC_INSTRUCTION` still says "cta (section 9)" (`task-a-doc.ts:160`), consistent with the master.
- Effect: a simplified-template request carries the master prompt (CTA = section 9) plus an instruction that says "section 8 CTA" and, for Spare parts, "EXCLUDED: section 9 content" (in master numbering, section 9 is the CTA). The instruction states it supersedes and names the JSON keys (`cta`, `hook`, ...), which the renderer maps regardless of numbers, so output structure is not numbering-dependent on the Doc path. On the legacy HTML path (Expert-3DPrinter), ambiguity is larger but the overlay lists "section 8 CTA: 50-100 words" explicitly.
- Classification: **NON-BLOCKING, needs a human decision.** No AGENTS.md rule is violated; the Story itself fixes the numbering (accepted spec, OD-8 says follow Story), and reconciling means editing FROZEN files beyond the OD-9 approval (master prompt) or changing Story-pinned tests. It is a prompt-quality risk, not a compliance defect. Options for the human: (a) accept as is; (b) renumber the simplified blocks to master numbering (CTA = section 9, FAQ = section 8) and update the pinned tests (touches spec and tests, `changes_required_plan`); (c) separately approve a master-prompt edit. Recommend a live-sample check on a Spare parts run before merge to confirm the model emits the CTA and no FAQ.

## 9. Findings
| # | Severity | Finding |
|---|---|---|
| 1 | Non-blocking | CTA/FAQ numbering conflict (section 8 above); human decision. |
| 2 | Non-blocking | Frozen edits and `.arch-guard-checksums` are uncommitted; must land in ONE commit (section 9). |
| 3 | Non-blocking | Golden re-capture (F1, 3 entries) not independently verifiable: golden dir is untracked, no HEAD baseline; relies on the implementation report. |
| 4 | Non-blocking | Strict null checks are off; optional-paragraph readers were hand-audited by the builder (`tsc --strictNullChecks`). Did not re-run (read-only role). |
| 5 | Non-blocking | Branch name still says US-2.1. |

## 10. Checks that no command would have caught (review-only)
Rule 2; the section 9 approval-to-file mapping and same-commit re-baseline condition; systemBlocks/userContent separation for the new prompt paths; disarmed `meta-description-currency`; the CTA/FAQ numbering cross-check between frozen and new prompt text.

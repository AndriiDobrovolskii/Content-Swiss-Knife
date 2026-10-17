---
artifact: reconciliation_report
story: US-8.1
version: 3
status: APPROVED
owner: so-reconciliation-reviewer
created_at: 2026-10-16T09:00:00Z
updated_at: 2026-10-16T09:00:00Z
supersedes: docs/reconciliation/US-8.1-reconciliation-report.md#2
inputs_consumed:
  - {key: story, version: 3}
  - {key: specification, version: 3}
  - {key: ac_test_matrix, version: 4}
  - {key: implementation_report, version: 5}
  - {key: verification_report, version: 5}
  - {key: security_review, version: 4}
open_decisions_blocking: false
---

# US-8.1 Reconciliation Report v3 (branch feat/US-8.1-single-master-faq, base 27b01b8, HEAD ac62fe4)

Verdict: **PASS**. All 26 acceptance criteria of Story v3 clear all three levels. The one exception by design is the geometric clause of AC-22, which has no automated test and is assigned to a manual operator check at HUMAN_PR_APPROVAL (OD-15); that assignment is recorded (see "AC-22 geometric clause") and is not treated as a gap. v2 (PASS against Story v2 / Spec v2, 20 ACs, HEAD 16db315) is stale: it predates the v3 change of requirements and the layout delta T14-T17 (AC-21 to AC-26). This revision supersedes it; v2 stays in git history. This PASS is not human approval (AGENTS.md section 10).

## What changed since v2, and what that means for the evidence

`git diff 16db315..HEAD -- src test server tools package.json arch-guard.sh .arch-guard-checksums` lists exactly three files: `src/app/app.component.html` (+11/-11), `src/app/app.component.ts` (+2) and the new `src/app/app.component.faq-layout.spec.ts` (485 lines). No prompt, service, util, fixture, golden, FROZEN file or checksum changed. So every test file and every production file behind AC-1 to AC-20 is byte-identical to what v2 read. For those criteria I did not carry v2's verdicts by assertion: I re-ran their specs, re-confirmed that the named tests exist, spot-read the pinning bodies and re-ran four fresh mutation probes (below). The new criteria AC-21 to AC-26 were reconciled from scratch.

Preconditions: security_review v4 is PASS on this HEAD; the verification report v5 is PASS; implementation report v5 records the gate green. All inputs are current (Story v3, Spec v3 APPROVED, matrix v4, implementation report v5, verification report v5); none is SUPERSEDED, so there is no staleness.

## Evidence (real runs, this session)

- `npx vitest run` on the 13 spec files the matrix names (faq-layout, template-wiring, tab-descriptors, faq-form, faq-gate, faq-html, structural-parity.faq, task-faq, task-c.faq, task-c.description-bytes, faq-pipeline, faq-standalone, simplified): **13 files, 1250 tests, 1250 passed** (v2: 1213; +37 is exactly the new layout spec).
- Grep for `.skip`, `.todo`, `xit(`, `xdescribe` in the new layout spec: 0 hits. No assertion backing an AC is `toBeTruthy()` / `toBeDefined()` alone, and none was copied from actual output (the AC-26 oracle is a literal copy of the pre-change condition, written by TEST_WRITING before the implementation, not derived from the template).
- `bash arch-guard.sh` on HEAD: "ALL CHECKS PASSED", exit 0. `git log 27b01b8..HEAD -- src/prompts/task-c.ts .arch-guard-checksums` lists only `da59195` and `8c89bce`, each with `.arch-guard-checksums` in the same commit (`git show --stat` confirms both). `git diff 27b01b8..HEAD --stat` over `task-a.ts`, `task-b.ts`, `master-system-prompt.ts`, `output-validator.ts` is empty.
- Level 2 for matrix v4: every named file exists; the `describe`/`it` titles named by the matrix were found in the files (grep of the distinctive titles in all 12 pre-existing specs, and the full layout spec read).

### Mutation probes (detached throwaway worktree under the scratchpad at HEAD ac62fe4, `node_modules` junctioned; each mutation applied, specs run, tree reset; worktree removed, main tree untouched, `git worktree list` shows only the main tree, `node_modules` intact)

| # | Mutation | Specs run | Result |
|---|---|---|---|
| M1 | AC-21: remove the `appMode() !== 'faq-generator'` conjunct from the empty-state condition (revert T15) | layout + wiring (79 tests) | 4 failed: the four `(owner T15)` tests (before a run, after a FAQ-only run, after a no-FAQ run, condition text) |
| M2 | AC-26: also exclude `slug-generator` from the empty state | same | 1 failed: the `slug-generator` oracle-equality guard |
| M3 | AC-22 structure: insert `<div class="h-8">banner</div>` between the tab bar `</header>` and the result container | same | 2 failed: "nothing but the scroll container's opening tag remains" and the scroll-container class-token test |
| M4 | AC-22 structure: add `justify-center` to the scroll container | same | 1 failed: the no-flex/grid/items/justify/h-full/min-h token test |
| M5 | AC-23: swap Original Description above Supplemental Content (Supplemental no longer directly under Product Name) | same | 2 failed: the T16 order test and the first-source-input test |
| M6 | AC-24: FAQ label bound back to the shared `supplementalContent` key | same | 3 failed: FAQ label binding, shared key used once, new key read once |
| M6b | AC-24: en `supplementalContentRequired` value set to "Supplemental Content (Optional)" | same | 2 failed: en value pin and "no Optional" pin |
| M7 | AC-25: remove `[required]="true"` from the FAQ Supplemental input | same | 2 failed: layout `[required]="true"` guard and the wiring pin "is the required one" |
| M8 | AC-25: `isFaqFormValid` fed `faqDescription()` instead of `faqSupplementalContent()` | same | 2 failed (wiring: predicate arguments, validity does not read Original Description/Tech Specs) |
| M9 | AC-26: Generator/UA Description form relabelled with the Required key | same | 4 failed: generatorForm label and "do not bind the FAQ-only key" guards, and the two shared-key count pins |
| M10 | AC-24/25: remove the `*` marker from `source-input.component.html` | same | 1 failed: the shared-component `*` guard |
| M11 | AC-24: Ukrainian label changed to "Опціонально" | same | 2 failed: uk value pin and uk "no Опціонально" pin |
| A | AC-7: `convertStrongToB` made the identity | utils + pipeline + standalone (2961 tests) | 57 failed |
| B | AC-16/17: `FAQ_MAX_ATTEMPTS` 3 to 2 | same | 98 failed |
| C | AC-11/12/25: the `isFaqFormComplete` Supplemental check removed | faq-form + wiring + standalone (189 tests) | 4 failed |
| D | AC-6: FAQ prompt lists `<strong>` instead of `<b>` | task-faq (10 tests) | 4 failed |

Probes A-D are fresh probes of AC-7, AC-16/AC-17, AC-11/AC-12 and AC-6. The v2 probes (AC-19 translation call, AC-1/AC-14 master language, AC-15 history) were not repeated; the code and tests behind them did not change since v2 (see above), and the AC-19 integration, AC-1/AC-14 and AC-15 bodies were not re-read in this session.

## Three-level check per criterion

L1 = matrix row exists. L2 = named file and test opened/found. L3 = body read (or, for AC-1 to AC-20, confirmed unchanged since the v2 body reading and spot-confirmed by the probes above) and a violation of the criterion would fail it.

| AC | L1 | L2 | L3 | Why |
|---|---|---|---|---|
| AC-1 | yes | yes | yes | Per store (7), both entry points: labels of all FAQ generation calls equal exactly one uk-UA call; none for another language. Carried from v2 (unchanged files). |
| AC-2 | yes | yes | yes | Every store language in `faqArtifacts`; uk-UA entry equals the master; one translation call per other language carrying the master. Carried from v2. |
| AC-3 | yes | yes | yes | h3/p/ul/li counts compared; parity validator rejects dropped and added elements; a differing translation is retried and skipped, not stored. |
| AC-4 | yes | yes | yes (data) | Pipeline UA copy of every master/translation test for 7 stores; `deriveTabDescriptors` per store. Limitation, unchanged: tabs are asserted as data, not rendered DOM. |
| AC-5 | yes | yes | yes | 42 guard tests: blank/whitespace/undefined Supplemental gives zero FAQ calls and an empty `faqArtifacts`. |
| AC-6 | yes | yes | yes | Output-contract section sliced and asserted to list `<b>` and not `<strong>`; whole prompt free of `<strong>`. Probe D: 4 fail. |
| AC-7 | yes | yes | yes | Model returning `<strong>` on every call stores zero `<strong>` in every language, text kept in `<b>`, no extra attempt. Probe A: 57 fail. |
| AC-8 | yes | yes | yes | Exact bold-lead string asserted in every stored language, plus byte-for-byte conversion tests. |
| AC-9 | yes | yes | yes | Independent well-formedness checker on every stored FAQ; shape-gate cases (unclosed, mismatched, 11 disallowed elements, attributes, B-1 fail-closed cases); invalid text regenerated and never stored. |
| AC-10 | yes | yes | yes, with a stated limit | Wiring pins bind the mode button to the `faqGenerator` key (resolves to "FAQ Generator" in both label maps), the same switcher as SEO and Slug buttons, and the shared Extended Thinking signal; service tests prove the toggle reaches the master call. Source-text pins, not rendered DOM; "alongside" is presence in the same switcher/row. |
| AC-11 | yes | yes | yes | `isFaqFormComplete` over all 8 combinations and whitespace-only inputs; Generate `[disabled]` pinned verbatim; predicate arguments pinned to the three signals; service guard makes no call. Probes C, M7, M8. Residual: U+00A0-only input untested. |
| AC-12 | yes | yes | yes | Blank description/specs do not block; when filled they reach the master prompt; predicate takes exactly three arguments. Probes C, M8. |
| AC-13 | yes | yes | yes | Per store: `mainHtmlUa` `''`, `translations` `{}`, `seoData`/`slugData` null, `faqArtifacts` for every language, no description/SEO/slug call; stale result replaced. |
| AC-14 | yes | yes | yes | Standalone vs `runGenerate`: equal labels, equal master prompts, equal translation prompts; AC-7/8/9/16/17 groups re-run through `generateFaqOnly`. |
| AC-15 | yes | yes | yes (mock boundary) | `historyAdd` called exactly once with input and per-language FAQ. `HistoryService.add` is a stub in the spec, as in v2. |
| AC-16 | yes | yes | yes | Exactly 3 master attempts, then nothing stored and no translation; cap independent of `maxRepairs`; provider throw counts as an attempt; empty master terminal. Probe B: 98 fail. |
| AC-17 | yes | yes | yes | Failing language gets exactly 3 attempts and no entry; others kept; provider-error and empty variants. Probe B. |
| AC-18 | yes | yes | yes | 96-case SHA-256 golden committed before the first `task-c.ts` edit and untouched since; description prompts byte-identical. |
| AC-19 | yes | yes | yes (both halves) | Builder half (`task-c.faq`, `structural-parity.faq`) and the production-wiring half (pipeline and standalone "AC-19 integration", 7 stores x 3 entry points, with a discrimination control). Wiring half carried from v2 (v2 mutation killed 21 tests). |
| AC-20 | yes | n/a (mechanical by design) | yes | `bash arch-guard.sh` exit 0 now; `task-c.ts` edits in exactly two commits, each with `.arch-guard-checksums`; no other FROZEN file touched. |
| AC-21 | yes | yes | yes | See below. |
| AC-22 | yes | yes | structural clauses: yes; geometric clause: manual by design | See below. |
| AC-23 | yes | yes | yes | See below. |
| AC-24 | yes | yes | yes, with a stated limit | See below. |
| AC-25 | yes | yes | yes | See below. |
| AC-26 | yes | yes | yes | See below. |

## AC-21 to AC-26 in detail (new in Story v3)

**AC-21 (no empty-state block in FAQ Generator).** The test extracts the real `@if (...)` condition of the block holding `uiLabels().noContentYet` from `app.component.html` and evaluates it with stubbed `appMode()`, `content()`, `isGenerating()` (fail-closed: any condition that is not a plain expression of those three reads throws, the test fails, never skips). It asserts false for `faq-generator` before a run, after a FAQ-only run (`mainHtmlUa` empty, `seoData`/`slugData` null, `faqArtifacts` populated), after a run that stored no FAQ, and during a run over the whole content grid. Premise tests prove the block, its single `noContentYet` / `fillFormStart` occurrence and its own `fa-file-code` icon are found in one block, so the "no text, no icon" clauses follow from the block never rendering. I read the real diff: the condition gained exactly `appMode() !== 'faq-generator'`; no data-derived term. M1 reverts it and 4 tests fail. FR-18 is untouched (the data fields still empty, covered by the AC-13 standalone tests), so AC-21 is met by the template, not by changing data. Clears.

**AC-22 (result directly under the version tabs).** Structural clauses 1 and 2 are pinned by four tests: the text between the tab bar's `</header>` and the result `@for` reduces, once the validation panel, repair panel and empty-state block are removed, to only the scroll container's opening tag (M3 inserts an element and fails it); the container's class tokens contain no `flex`, `grid`, `items-*`, `justify-*`, `h-full`, `min-h-*` (M4 fails it); the FAQ result panel root carries no `h-full`, `min-h-*`, `justify-*`, `items-center`, `mt-*`, `pt-*`. Premises prove the slice is the right region (contains none of the tab-bar markers, contains the three known siblings), so a mis-slice fails loudly. A violation of the structural part would fail these tests. Clears for the structural part. See the next section for the geometric clause.

**AC-23 (field order).** The FAQ form block is isolated; each of six anchors (Store select, Product Name input, Supplemental, Original Description, Tech Specs, Deep Thinking toggle) must occur exactly once and appear in the stated order; the first of exactly three source inputs must be the Supplemental one. I read the diff: the Supplemental input moved intact (attributes byte-identical) to directly after the Product Name `</div>`. M5 (swapping Original Description above Supplemental) fails both order tests. Clears.

**AC-24 (label reads Required, with `*`, no Optional).** Three joints are pinned separately: (1) the FAQ Supplemental input's `[label]` is exactly `uiLabels().supplementalContentRequired`, and the shared `supplementalContent` key is read once in the whole template, inside `generatorForm`; (2) the en value is exactly "Supplemental Content (Required)" and contains no "Optional", the uk value is exactly "Додатковий контент (Обов'язково)" with the ASCII apostrophe, no U+2019/U+02BC, no "Опціонально", and the key exists in both `TRANSLATIONS` blocks with whole-dictionary key parity; (3) the shared source-input component renders `{{ label }} @if (required) { <span>*</span> }` and defaults to not required, and the FAQ input passes `[required]="true"`. I read the real `source-input.component.html`: the `*` is rendered right after the label. M6, M6b, M7, M10, M11 each fail the relevant pin. Stated limit: the rendered string "Supplemental Content (Required) *" is the composition of three source-text facts, not a rendered-DOM assertion (the repository has no AppComponent DOM spec by standing decision). AC-24 fixes the English text only; the Ukrainian wording is the OD-13 labelled default and still needs the human's confirmation.

**AC-25 (mandatory field).** No new test is claimed by the matrix and none is needed: the delta changes no predicate, signal or handler. The criterion is covered by existing tests that I confirmed fail on violation: `isFaqFormComplete` (all 8 combinations, whitespace-only), the wiring pins on `[disabled]="isGenerating() || !isFaqFormValid()"`, the predicate's three signal arguments (M8 rewires one: fails) and the Supplemental input being the single required one (M7 removes `[required]`: fails), plus the `*` marker guards. Probe C removes the Supplemental check from the predicate: 4 fail. Clears.

**AC-26 (other modes unchanged).** The evaluated empty-state condition is compared, over a 48-state grid (including trap states with a stale populated `faqArtifacts` while output fields are empty), against a literal copy of the pre-change condition for `generator`, `ua-generator`, `seo-generator`, `slug-generator`; the oracle itself is proven to discriminate. The `generatorForm` Supplemental input is pinned to the exact shared key with no `[required]`, its field order (description, specs, supplemental) is pinned, the en/uk "(Optional)" / "(Опціонально)" values of the shared key are pinned, and the SEO/Slug/Generator forms are pinned not to bind the FAQ-only key. M2 and M9 each fail. Non-blocking limit: the grid covers four modes; the other `AppMode` values (optimizer, translator, image-tools, copywriter, readability, html-editor, dashboard) are covered by construction, not by a pin, because the only change is one extra conjunct that names `faq-generator`, which I confirmed by reading the diff.

## AC-22 geometric clause (manual check, OD-15): assignment verified

The clause "the active panel's top edge is one container padding (`p-8`, 32 px) below the tab bar's bottom edge, not vertically centred" has no automated test, by design. I verified the assignment is recorded in the pipeline's own artifacts: matrix v4 row "AC-22 (geometric clause)" and Coverage (v4) ("a manual browser check by the operator at HUMAN_PR_APPROVAL ... a recorded claim, not pipeline evidence"); Specification v3 FR-25 and NFR-9 (OD-15 default carried, "verified manually"); the Spec's Out of scope (the operator's earlier manual browser test is a recorded claim, not evidence); implementation report v5 sections 1, 4 and 5; quality gate report v5 ("Browser / manual check: NOT performed ... assigned to a manual check by the operator at HUMAN_PR_APPROVAL (OD-15); this stage did not perform or substitute it"); and the layout spec's own header. Not treated as a gap. Two housekeeping notes (non-blocking, N-2 and N-3 below): the stage name is inconsistent across upstream artifacts, and no gate mechanism enforces the manual check.

## Drift from the approved Specification v3

- Requirements dropped: none. FR-1 to FR-23 are implemented by code unchanged since v2 (diff proves it); FR-24 (T15), FR-26 (T16), FR-27 (T14, T17), FR-28 (T15 conjunct plus untouched generatorForm) and FR-25 (structure unchanged, no element added between tab bar and result) each map to a diff hunk I read.
- Behaviour changed during coding: none. The whole production delta is three hunks in `app.component.html` (the conjunct, the moved input with an unchanged attribute set, the `[label]` rebind) and two `TRANSLATIONS` entries.
- Scope added: none found. Checked by name against Out of scope: no other mode's layout, labels, field order or empty state changed; no version-tab relabel; the Generate-guard alert text still names Original Description (`alertFillFields`, unchanged, OD-17); the FAQ result block's content and copy buttons untouched; no `task-*`, `master-system-prompt`, `output-validator`, `STORE_REGISTRY`, prompt or data-field change (NFR-9 holds from the real diff).
- Criterion reinterpreted: none. The only place a test asserts less than the full criterion is AC-22's geometry (assigned to the manual check by the Spec) and the rendered-DOM composition of AC-24 (stated above); in both the weaker form is the Specification's own declared method (FR-25 "How this is checked", NFR-9).

## Where the Story is wrong

No Story error found; `story_drift` is not needed. AC-21 to AC-26 are mutually consistent with AC-1 to AC-20 (AC-21 and AC-13 hold together because the fix is in the template, not the data). The consequence the Spec flags in OD-16 (AC-21 removes the only "nothing produced" cue) is a Story-level consequence that the human accepted knowingly, not a Story error.

## Open Decisions and points the human still has to decide

None of these is resolved by this review and none blocks an AC.

- **OD-13:** the Ukrainian-interface label "Додатковий контент (Обов'язково)" is the labelled default, implemented and pinned (one literal and one pin change if the human picks another wording).
- **OD-15:** the AC-22 geometric clause is a manual browser check by the operator; record who/when/result at HUMAN_PR_APPROVAL. The operator's earlier statement that the FAQ Generator "works" is a claim, not a record of this specific check.
- **OD-12 / OD-16:** validation/repair panels stay above the result, so a run with a skipped language shows a panel and AC-22 then holds only vacuously for that run; a run that stores no FAQ now shows a blank central area (AC-21 removed the only cue). Both are accepted defaults, flagged.
- **OD-17:** the Generate-guard alert still lists "Original Description" as mandatory in FAQ Generator. Unchanged by design; now more visibly inconsistent with the form (the field is optional).
- Carried from v2 and unchanged: OD-1, OD-3, OD-4, OD-5, OD-7 (encoded in tests as Spec defaults); OD-6, OD-8, OD-9(e), OD-19, OD-20 (no AC depends on them); security N-3 (`\s` in `PERMITTED_TAG`) and the raw `<` behaviour; the B-1 additions (comments/PI/CDATA rejection) that go beyond the literal FR-9 text and are justified by security finding B-1.

## Non-blocking findings

- **N-1:** matrix v4 "State now (v4)" column still reads `RED` for the T14, T15, T16 and T17 rows (and the v4 header says "no implementation of T14 to T17 exists yet"). All are green at HEAD (1250/1250). Stale status text only; the matrix owner (so-test-writer) should refresh it. I did not edit the matrix. The same applies to the v3 "Coverage" paragraph (AC-1 to AC-19 only), which the v4 addendum supersedes.
- **N-2:** the stage assigned to the manual AC-22 check is inconsistent upstream: matrix v4, implementation report v5 and quality gate report v5 say HUMAN_PR_APPROVAL; plan D16, task breakdown and the pipeline status say QUALITY_GATE. HUMAN_PR_APPROVAL is the assignment used here (per the delivery decision) and is the one that actually follows this stage.
- **N-3:** nothing in `stage-map.yaml` or the HUMAN_PR_APPROVAL required artifacts carries the manual check as a checklist item, so it is enforced only by being written down. The PR summary and the approval prompt should surface it explicitly.
- **N-4:** AC-21 to AC-24 and AC-26 are source-text and evaluated-condition pins, not rendered DOM; this is the repository idiom for `AppComponent` (plan review N7) and was flagged by the matrix. The rendered result is exactly what the manual check covers.
- **N-5:** carried from verification v5: `faq-layout.spec.ts` uses `'en-GB'` / `'de-DE'` as stub keys of a `faqArtifacts` object; they are inputs to the empty-state grid, not a language list.

## Checklist

- [x] Every AC-n (1..26) of Story v3 processed at three levels; none skipped.
- [x] Level 2 by opening files and running them: 13 spec files, 1250 tests, all passed.
- [x] Level 3 for AC-21 to AC-26 by reading the full layout spec body and the real template/source-input/diff, and by 12 mutation probes against the layout and wiring specs; for AC-1 to AC-20 by confirming files unchanged since the v2 body reading, spot-confirming with four fresh mutation probes (A to D); not every AC-1 to AC-20 body was re-read line by line in this session (stated above).
- [x] No `toBeTruthy()`-only, copied-from-actual, skipped or todo test backs a criterion.
- [x] Every FR-1 to FR-28 checked for a dropped implementation; scope additions checked against Out of scope by name.
- [x] AC-22 geometric clause: assignment to a manual operator check at HUMAN_PR_APPROVAL verified as recorded; not treated as a gap.
- [x] Throwaway worktree removed; repository tree and `node_modules` untouched; no test, code, matrix, Specification or Story edited; no workflow-state or history file written.
- [x] Verdict PASS, so no loop-back (for reference, the keys under RECONCILIATION are `changes_required`, `changes_required_tests`, `story_drift`).
- [x] This PASS is not human approval.

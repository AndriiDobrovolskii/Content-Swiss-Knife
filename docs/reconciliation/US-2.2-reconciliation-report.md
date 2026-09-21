---
artifact: reconciliation_report
story: US-2.2
version: 1
status: ARCHIVED
owner: so-reconciliation-reviewer
created_at: 2026-09-21T23:55:00Z
updated_at: 2026-09-21T23:55:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 1
  - key: ac_test_matrix
    version: 3
  - key: implementation_report
    version: 2
  - key: verification_report
    version: 1
  - key: security_review
    version: 1
open_decisions_blocking: false
---

# Reconciliation Report - US-2.2, simplified v4 content-template schemas

**Verdict: PASS**, with non-blocking findings. This PASS is not human approval (AGENTS.md section 10).

All 16 acceptance criteria (AC-1..AC-16, including the out-of-order AC-10..AC-16) clear Level 1 (matrix row), Level 2 (named file and tests exist, opened) and Level 3 (test body would fail on violation). All 25 spec files named by the matrix exist (plus `simplified-translation-parity.spec.ts` and `simplified-media-survival.spec.ts`, which the matrix cites in the FR-19/FR-21..25 table). Grep for `.skip`/`.todo`/`xit`/`xdescribe` under `src/` and `test/`: only `describe.skipIf(!LIVE)` in `test/doc-generation-live.spec.ts`, which backs no AC (this is the 3 skipped tests in the gate count). No AC is backed by a skipped test.

## Three-level table

| AC | L1 | L2 | L3 | Basis (test bodies read) |
|---|---|---|---|---|
| AC-1 | yes | yes | yes | Component spec asserts 4 options in order via `getAllByRole('option')`, values `['', ids...]`, no "select template" option, default selected text "Full description". Wiring spec asserts the component is used exactly twice (Generator, SEO-only), no `Select Template...` left in html. I confirmed in `app.component.html` both usages bind the same `selectedTemplateId()` (default `signal('')`, pinned). |
| AC-2 | yes | yes | yes | Exact EN and UA strings pinned in `content-template-labels.spec.ts`; same key set; rendered UA labels in component; `TEMPLATE_LABELS.en/uk` spread into `uiLabels`; consumables key and option absent. |
| AC-3 | yes | yes | yes | `paragraphMentions` reads the built prompt: requested {1,2,4,5,7,8}, not {3,6,9}; JSON shape has no functionality/packageContents/faq key. Repeated on legacy path, registry and through `generate()`. Excluded-paragraph negation is detected by clause, so a prompt that requests an excluded paragraph fails. |
| AC-4 | yes | yes | yes | Checked: 1,2,3,5,7,8 and not 4,6,9; unchecked: no 3; missing flag equals unchecked; flag ignored for other templates. |
| AC-5 | yes | yes | yes | Requests exactly 1,5,8; 2,3,4,6,7,9 not requested; no killerSpecs/.../faq keys in the JSON shape. |
| AC-6 | yes | yes | yes, with the F1 amendment below | Golden spec compares `systemBlocks[i].text`, `cache` and `userContent` byte-for-byte for 12 cases (Doc, HTML, legacy, translate, task-c). Guard against a shrunk suite included. Empty-string and stale id equal Full. |
| AC-7 | yes | yes | yes | Flat renderer: one `<tbody>`, no `<h3>`, no category title, `table-responsive` / `table table-bordered table-striped`, all rows in order. Cross-store matrix (20 pairs x 2 templates) asserts one section, one tbody, zero `<h3>`, one `<hr>`. Prompt states single-table explicitly (regex on prompt). Enforcement: two-category output rejected with "exactly one category". |
| AC-8 | yes | yes | yes (loose) | Prompt spec asserts the section 5 clause is conditional on source data for Filaments and Accessories; schema accepts omitted section 5; completeness accepts docs with and without section 5. Wording regex is broad (see N3). Model behaviour is not testable here; prompt and schema are the reachable proof. |
| AC-9 | yes | yes | yes | Component: checkbox absent unless `showFunctionalityToggle`, EN and UA labels exact, emits true/false. Wiring: exactly one of two usages enables the toggle and its condition names `accessories`; SEO-only usage binds nothing. Prompt: checked vs unchecked differ only in `userContent`, section 3 requested only when checked. Orchestrator `generate()` asserts flag reaches the prompt and the section 3 heading renders only when checked. |
| AC-10 | yes | yes | yes | Conformance (20 pairs x 3 templates): html starts with `<p><b>{name}</b> — `, zero `<h1>`, last `<h2>` text equals the store's localized CTA heading and its next sibling is `<p>`. Schema keeps hook invariant on simplified docs. |
| AC-11 | yes | yes | yes | `safeParse` accepts each of sections 2,3,4,5,6,7 (and 9) omitted or null, all omitted at once; rejects missing or null hook and cta at the right issue path. Fixture-sanity test guards the guard. 64-combination render and per-walker absent-paragraph tests back the consequences. |
| AC-12 | yes | yes | yes | Prompt asserts v4 ranges per template (40-85, 90-300, 80-250, 30-100, 50-100) present only for included paragraphs, and legacy limits (40-60, 4700, 4-6/3-4/2-3, section C, "consumable") absent. Killer Specs at most 8 and applications 4-8 for Filaments. CTA single-paragraph shape is covered by AC-10 rendering. |
| AC-13 | yes | yes | yes | `test/removal.spec.ts` asserts 15 removed paths do not exist and a repo-wide scan of `src/`, `test/`, `server/` for six removed tokens returns nothing (with an anti-empty-walk guard). I confirmed the working tree deletes the named files. |
| AC-14 | yes | yes | yes | For all three templates: 5500, "soft", priority/exceed wording, tag stripping, figcaption/alt exclusion; not stated as hard; Full prompt has no 5500. |
| AC-15 | yes | yes | yes | Empty and whitespace-only specs: per-run text negates section 7 and never touches cached blocks; non-empty: section 7 requested. Orchestrator: empty specs render has no `<table` and no specs heading; completeness gate rejects `hasSpecs` true with section 7 absent. |
| AC-16 | yes | yes | yes | 21 range cases (min and max) on Doc and HTML entry points with identical verdicts; the Story's own example (under 4000 chars, 120-word hook) rejected; over 5500 chars with all ranges in bounds returns `[]` at every severity; over 5500 and over-range rejected. Through frozen `validateGeneratedHtml` and through `generate()` (retry on 120-word hook, no retry at more than 5500 characters). Non-master locales, Full and stale ids skip. |

## Human-approved items judged

- **F1 (two "CONSUMABLES MODE" notes deleted from `constants.ts`, golden re-captured for 3 entries).** This is a human-approved amendment of AC-6's "byte-identical" for exactly the shared-constant text that carried the removed consumables notes; AC-13 requires that text gone, so AC-6 and AC-13 could not both hold literally. The golden spec still fully asserts byte equality against the re-captured goldens, and `constants.spec.ts:254` pins the notes absent. I did not treat this as a reinterpretation. Limitation: `test/fixtures/golden/` is untracked so I could not diff the three re-captured entries against a pre-Story baseline (same limit as verification finding 3); the goldens now contain zero "CONSUMABLES MODE" occurrences, consistent with a text-only deletion. Recommend the human confirm the golden diff once at the PR gate.
- **R6 (FAQ artifact data-driven).** Consistent with the Story: "FAQ stays with Full description" is about description section 9, not the separate FAQ artifact (Step 5). Tests assert the FAQ artifact runs for any template only when supplemental content is non-blank (all store languages; UA-only mode gives one uk-UA artifact), is skipped otherwise, uses an identical FAQ prompt across templates, and the simplified description contains no FAQ heading. Orchestrator code (`input.supplementalContent?.trim()`) matches. No AC contradicted.

## Drift from the approved Specification

- **FRs dropped:** none found. FR-1..FR-20 each map to a delivered module or test (registry, flat renderer, completeness, ranges, shape, prompts on both paths, translation clause, removal, orchestrator, dropdown); FR-21..FR-25 are AGENTS.md section 4 constraints covered by the conformance matrix.
- **Behaviour changed in coding:** none against an AC. The only deviation is F1 (approved).
- **Scope added:** none. Checked against Out of scope by name: Full schema and section 9 unchanged; no further templates or auto-detector; no migration; Customize panel untouched; no non-master range enforcement (skip tests prove it); `meta-description-currency` not armed (verification section 2); retrieval, providers and usage untouched (only a SQL comment in `server/usage/store.js`).
- **Criteria reinterpreted:** none. Where a test is looser than the Story (AC-8 wording regex; AC-3..AC-5 read prompt prose by section-number clauses) the meaning tested is the Story's; see N3.
- **Story wrong (story_drift):** none.

## Non-blocking findings

- **N1 (open, human decision): CTA/FAQ section numbering.** Story, tests and the new simplified blocks use CTA = section 8 and FAQ = section 9; the FROZEN master prompt and `task-faq.ts` use CTA = section 9 and FAQ/HowTo = section 8. The Story itself fixes the Story numbering, all sixteen ACs are stated in it, and the Doc path emits by JSON key, so no AC is contradicted and the tests correctly assert the Story's numbering. Same as verification section 8: quality risk, not a compliance defect. Recommend a live Spare parts sample before merge; renumbering needs a spec/test revision or a separate approval for the frozen master prompt.
- **N2: F1 golden re-capture not independently diffable** (untracked goldens); see above.
- **N3: AC-8 and AC-3..AC-5 rely on prompt-prose heuristics.** They prove what the prompt says, not model output, which is the strongest reachable proof for a prompt-level AC. The AC-8 regex (`only if/when`, `if the source`, `unless`) is permissive; a future rewording could pass with weaker meaning. Acceptable for this Story.
- **N4: `includeFunctionality` reset-on-template-change and non-persistence (OD-6) are source-text pins** in `app.component.template-wiring.spec.ts` (no AppComponent test by plan decision), not behavioural tests. The behaviour of AC-9 itself is covered behaviourally in the component and orchestrator specs.
- **N5: Frozen edits and `.arch-guard-checksums` are uncommitted** and must land in one commit (verification finding 2); branch name still says US-2.1.

## Result Envelope

```yaml
stage: RECONCILIATION
skill: so-reconciliation-reviewer
story: US-2.2
result:
  verdict: PASS
  loop_back_stage: null
  summary: >
    All 16 ACs have a matrix row, an existing named test, and a test body that would fail on
    violation (F1 golden re-capture and R6 data-driven FAQ judged as human-approved and
    consistent with the ACs). No dropped FRs, no scope added, no Story drift. PASS is not
    human approval.
artifacts_written:
  - key: reconciliation_report
    path: docs/reconciliation/US-2.2-reconciliation-report.md
    version: 1
    status: DRAFT
inputs_consumed:
  - {key: story, version: 1}
  - {key: specification, version: 1}
  - {key: ac_test_matrix, version: 3}
  - {key: implementation_report, version: 2}
  - {key: verification_report, version: 1}
  - {key: security_review, version: 1}
blocking_issues: []
non_blocking_findings:
  - "N1 CTA/FAQ numbering conflict between Story/simplified blocks (CTA=8, FAQ=9) and frozen master prompt/task-faq (CTA=9, FAQ=8): human decision, no AC contradicted"
  - "N2 F1 golden re-capture of 3 entries not diffable against a pre-Story baseline (goldens untracked)"
  - "N3 AC-8 and AC-3..AC-5 are prompt-prose assertions with a permissive AC-8 wording regex"
  - "N4 OD-6 flag reset/persistence pinned by source-text, not behaviour"
  - "N5 frozen edits + .arch-guard-checksums uncommitted, must land in one commit; branch name says US-2.1"
evidence:
  - "Opened and read bodies of: content-template-select.component.spec, app.component.template-wiring.spec, content-template-labels.spec, task-a-doc.simplified.spec, full-description.golden.spec, render-description.flat-specs.spec, render-conformance.simplified.spec, description-doc.schema.simplified.spec, simplified-word-ranges.spec, content-orchestrator.simplified.spec, removal.spec"
  - "Existence and skip scan over all matrix-named spec files: all present, zero skip/todo except describe.skipIf(!LIVE) in test/doc-generation-live.spec.ts (backs no AC)"
  - "Tests were not re-run by this stage; gate results are taken from implementation_report v2"
```

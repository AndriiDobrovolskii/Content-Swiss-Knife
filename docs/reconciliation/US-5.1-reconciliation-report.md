---
artifact: reconciliation_report
story: US-5.1
version: 3
status: ARCHIVED
owner: so-reconciliation-reviewer
created_at: 2026-10-03T00:00:00Z
updated_at: 2026-10-04T12:00:00Z
supersedes: docs/reconciliation/US-5.1-reconciliation-report.md@v2
inputs_consumed:
  - {key: story, version: 1}
  - {key: specification, version: 9}
  - {key: ac_test_matrix, version: 6}
  - {key: implementation_report, version: 3}
  - {key: verification_report, version: 3}
---

# US-5.1 Reconciliation Report (v3, whole Story against Spec v9, HEAD dd5f039, base ef08509)

Verdict: PASS. This PASS is not human approval (AGENTS.md section 10).

## Evidence

- The working tree is clean outside `docs/`; all specs are committed (T8 fc4bbf1, T9 dd5f039 and earlier).
- Level 2 was done mechanically and by hand. All 22 spec files named by matrix v6 exist. Every backticked test title in
  the matrix (351 strings extracted; the 38 non-matches are Markdown-parse noise, not titles; `%s/%i/%j` rows matched on
  their fixed prefix) was found in the committed spec sources and in the vitest JSON listing.
- Read-only run: `npx vitest run` over the 22 files gave 633 tests, 633 passed, 0 failed, 0 skipped, 0 todo.
  No `.skip`, `.todo`, `.only`, `xit` or `xdescribe` in any file backing a criterion.
- `bash arch-guard.sh` exits 0, "ALL CHECKS PASSED".
- `git diff ef08509..HEAD` over `task-b.ts`, `task-c.ts`, `output-validator.ts` is empty. `task-a.ts` is +17/-1 and
  `master-system-prompt.ts` is +5/-2, as AC-9 (f) / (m) require.
- `git diff ef08509..HEAD -- server/providers/openai.js` is the single line `max_tokens` 300 to 1000.

## Three-level check per criterion

L1 = row in matrix v6. L2 = named file and test exist. L3 = assertion body read; a violation would fail it.

| Id | L1 | L2 | L3 | Evidence read |
|---|---|---|---|---|
| AC-1 | yes | yes | yes | `it.each` asserts exact extracted file names (jpg, webp, `a--b`, `-a`); order, duplicates, inline markup, regex statefulness; Doc and HTML "seen" cases. |
| AC-2 | yes | yes | yes | Block-kind sequences `[paragraph, figure, paragraph]`, exact lead-in and tail text, no empty paragraph, marker absent from the whole text, hook and CTA hosting through `hookExtra` / `cta.extra` with render order, model-figure replacement, orchestrator end-to-end (alt equals the recorded Ukrainian alt, `generateText` never called, no repair). |
| AC-3 | yes | yes | yes | `FIGURE`, `IMG` and `FIGCAPTION` are literal strings inside `image-figure-style.spec.ts`, not imported from production, so they are not copied from actual output. Eager/lazy by document order, `decoding="async"`, no figure in `<p>`, zero frozen-validator image rules. |
| AC-4 | yes | yes | yes | Every `DOC_PIPELINE_STORES` entry, Consumables, Expert-3DPrinter (empty base, legacy path), carriers on schema 3.0 and 4.0, carrier-aware validators, locale inheritance through the master. See N-3. |
| AC-5 | yes | yes | yes | Marker removed, text kept, no figure, exactly one `warning` naming the file, no repair spent, once per run. Unmatched statuses (error, pending, no urlFilename) covered. |
| AC-6 | yes | yes | yes | `it.each` of non-grammar tokens asserts output equals input with no warning; attributes, JSON-LD, meta, script, style ignored; unchanged document returns an empty report. |
| AC-9 (a) | yes | yes | yes | `COUNT=N` and every file verbatim for 1/2/3 markers, de-duplication, unmatched and mangled excluded, Expert-3DPrinter with a `None` manifest block, store independence. |
| AC-9 (b) | yes | yes | yes | Byte-equal `userContent` against goldens for 4 HTML and 3 Doc no-marker cases; neutral-token equivalence. |
| AC-9 (c) | yes | yes | yes | No marker file name or `COUNT=` in any system block for 4 stores; `systemBlocks` deep-equal between marker and no-marker input. |
| AC-9 (d) | yes | yes | yes | One case per `DOC_PIPELINE_STORES` entry asserts `COUNT=2` and the verbatim list; system blocks free of marker data. |
| AC-9 (e) | yes | yes | yes | Six FR-20 properties asserted on the added text (property 3 is a regex, which is real but wording-tolerant), HEAD-pinned additions-only, no `${}`. Import-cycle spec present. |
| AC-9 (f) | yes | n/a | n/a | Mechanical, not a unit test. Diff and arch-guard re-run by this reviewer (see Evidence). Reported as a manual item. |
| AC-9 (g) | yes | yes | yes | Exact style literals on renderer, `wrapImageFigures`, editor node and step output; first image without `loading`. |
| AC-9 (h) | yes | yes | yes | Cyrillic on label, description and alt; colon collapse; generic-label equality only; `Фото: ` prefix; escaping; duplicate-label warning for the LATER figure naming that file without rewording; warnings are Ukrainian. |
| AC-9 (i) | yes | yes | yes | Silent Ukrainian fallbacks for legacy entries; one not-native warning per file; no English string (source-text checks); `cyrillicCheck` on and off; orchestrator ladder exhaustion. |
| AC-9 (j) | yes | yes | yes | Translation call receives a master that already contains the figure `src` and no marker. |
| AC-9 (k) | yes | yes | yes | No sentinel in prompts; byte-identical prompts with and without the Ukrainian fields; Vision contract tolerant parse (non-string label dropped, caption-only reply); `OP` asserts `max_tokens` is 1000. The Vision prompt text is checked structurally (four keys, "directly in Ukrainian"); see M-2. |
| AC-9 (l) | yes | yes | yes | Three surfaces plus agreement test, `not.toContain('fit-content')`, video untouched, `FIGURE` literal, snapshot, corpus reconciliation. |
| AC-9 (m) | yes | yes | yes (unit) | `MASTER_SYSTEM_PROMPT` has no `fit-content`; the example lines equal the pre-Story block with only the width swapped; golden suite. The line-count diff is mechanical (M-3). |
| AC-9 (n) | yes | yes | yes | `round-trip`, `cleanHtmlStructure`, `html-cleaner` and `image-figure` specs pin `max-content`. |
| AC-9 (o) | yes | n/a | n/a | Grep check, not a unit test (M-4). |

Only two `toBeDefined()` uses exist in the backing specs. Both are followed by value assertions (`severity`, `detail`
contains the file name). Expected values are literal fixtures, the pinned HEAD snapshot, or manifest-derived, not
copied from actual output. No level-3 failure was found.

## Manual / human verification items (NOT counted as covered by tests)

- M-1 Model compliance: whether the live model keeps `[file.jpg]` markers and honours the relocation rule. AC-9 (a)-(e)
  prove only that the instruction is delivered. The human's live re-run of
  `expert3d_agibot_d1_ultra_2026-10-03_1217` is OUTSTANDING and not automatable. Backstop: the FR-17/FR-18 ladder
  (regeneration, then end-append with a Ukrainian warning), which is tested.
- M-2 Vision quality: native Ukrainian label, description and alt from the live Vision call, an image-specific
  label, and no generic output. Tests check the parser and the prompt text, not model behaviour.
- M-3 AC-9 (f) / (m) frozen footprint: diff checks (`task-a.ts` +17/-1, `master-system-prompt.ts` +5/-2, only two
  checksum rows, `task-b`/`task-c`/`output-validator` absent) were re-run by this reviewer and hold. They remain
  diff/arch-guard checks, to be re-checked at the PR gate.
- M-4 OI-2 / AC-9 (o) grep: `fit-content` remains only in two untouched ground-truth fixtures
  (`src/utils/__fixtures__/description_uk-UA.{original,corrected}.html`), the comment header in
  `test/fixtures/full-description-inputs.ts`, negative assertions in specs, and `Knowledge/Issues/*` historical
  output. It does not appear in `src`, `server`, prompts or `AGENTS.md` (section 4 now says `max-content`).
- M-5 Live re-run / visual check of an uploaded-image description (position, rendering width) in the browser.

## FR drift check

FR-1..FR-22 each have an implementation (marker modules, carriers, orchestrator wiring on Doc and legacy paths,
finalisers, `buildMarkerBlock`, master sentence, shared figure style, Vision contract). No FR silently dropped. Diff
scope matches the verification report: only `task-a.ts` and `master-system-prompt.ts` are frozen files touched, under
recorded human approvals. Out-of-scope items are untouched. No criterion is reinterpreted: each test asserts the
Story's or Spec's stated behaviour, not a weaker one. The Story itself is not contradicted (AC-9 is spec-level and
does not weaken any Story AC), so no `story_drift`.

## Carried gap N-9 (reported, accepted by the human at HUMAN_PLAN_APPROVAL, not a defect of this diff)

A too-long sentence inside `hookExtra` is measured by the carrier-aware validators under path `hook` (via
`hookText(doc)`). The root-leaf `hook` repair in `doc-block-repair.ts` can edit only `doc.hook`, not the split hook
paragraph in `hookExtra`, and `doc-block-repair.ts` is intentionally unedited. Such an issue may therefore not be
repairable by the targeted repair and falls to the regular ladder or ships as a residual length finding. The matrix
has no row for this. The validators are tested (`flags a too-long sentence that sits in hookExtra`) but the repair
behaviour is not, by design.

## Blocking issues

None.

## Non-blocking findings

- N-1 Matrix v6 text for AC-9 (o) says the "three production constants" still contain `fit-content`. They no longer
  do, since T8 migrated them. Stale prose only; the grep in M-4 is the real state.
- N-2 Verification report v3 section 2 still describes the caption via the `Image:` label constants and the `View `
  alt prefix. Code and tests (`IMAGE_CAPTION_LABEL` absent, `Фото: `, Ukrainian fallbacks) contradict that sentence.
  Documentation inconsistency; the implementation matches Spec v9.
- N-3 AC-4 "every schema" is exercised end-to-end for every Doc store plus the Consumables template; the shared Doc
  path keeps the risk low.
- N-4 Carried from v2: warning gate labels (`HTML (base)` / `HTML (uk-UA)`) versus Spec wording; pinned by `OR`
  tests, no AC depends on the literal.
- N-5 Carried from v2: TOKEN_RE quadratic backtracking on pathological input in `image-placeholder-html.ts`
  (security F-1 of the earlier review). The v3 security review lists no finding on it, so the status is unconfirmed.
- N-6 N-9 gap above, carried.
- N-7 The `.arch-guard-checksums` rows for `task-a.ts` and `master-system-prompt.ts` were rebaselined in the same
  commit as the edits (df52e88), under recorded approval.

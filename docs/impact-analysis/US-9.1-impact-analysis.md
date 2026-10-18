---
artifact: impact_analysis
story: US-9.1
version: 4
status: DRAFT
owner: so-impact-analyzer
created_at: 2026-10-17T16:09:47Z
updated_at: 2026-10-18T10:23:49Z
supersedes: docs/impact-analysis/US-9.1-impact-analysis.md#3
inputs_consumed:
  - key: story
    version: 4
  - key: specification
    version: 5
  - key: open_decisions
    version: 4
open_decisions_blocking: false
---

# Impact analysis: US-9.1 (no picture references and livelier descriptions)

> **Change note, v3 to v4 (revision run after the owner's 2026-10-18 plan-gate answers; Specification v5 `APPROVED`, Open Decisions v4).**
> v3 recorded Specification v4 and Open Decisions v3. Re-verified in the tree in this run (HEAD `6546db8`, branch
> `feat/US-9.1-no-picture-references-and-livelier-descriptions`, `git status` over `src test tools server package.json` clean,
> `bash arch-guard.sh`: ALL CHECKS PASSED). v3's survey stands except for the items below; sections not named here are kept
> verbatim from v3. Items marked **(v4)** in the text are the changes.
> 1. **FR-41 / `clearAll` (new).** `clearAll()` in `src/app/app.component.ts` (line 1061) has two textually identical,
>    independent bodies, `case 'generator'` (lines 1063-1082) and `case 'ua-generator'` (lines 1084-1103); each resets
>    `supplementalContent` and `customInstructions` and neither can be covered by editing the other. Reach and tests: new section
>    "FR-41 / clearAll: reach (v4)".
> 2. **FR-20 literal changed (Q-SCOPE).** v3 cited the old literal in "FR-20 and FR-23: where the new master text lands" (the three
>    Assert-present strings) and in Silent-failure risk 14 ("the source's sentences, headings and order are kept"). Both corrected;
>    the third string is now `the source's sentences and their order are kept`. The blast radius does not change (same constant, same
>    three payload families); what changes is the wording the presence tests pin.
> 3. **OD-19 closed ("(1b) no, (2) yes").** `[Operator Notes]` must be absent from every instruction text in `task-a-doc.ts` and
>    present in `buildPromptA(...).userContent` for Expert-3DPrinter. Which paths and prompts that reaches: new section "OD-19 / OD-20
>    consequences (v4)". Unknown 5 is closed.
> 4. **OD-20 closed.** `NUMERIC_SOURCE_FIDELITY_RULES` text not extended and `supplementalContent` not added to
>    `numericFidelitySources` (the asymmetry stays by decision); the script input set is D-10. Unknown 7 is closed; Silent-failure risk
>    12 re-stated as a decided, still silent asymmetry.
> 5. **OD-9 accepted with a condition (Node >= 22.18, else the D12 launcher).** The repository pins no Node version at all (no
>    `engines`, no `.nvmrc`, `.node-version`, `.tool-versions`, `volta`, `packageManager`, no CI directory); only `@types/node ^22.14.0`
>    and the local Node v24.15.0 exist. Recorded in hazard 6 and Unknown 4.
> 6. **Q-OPT answer (note on silent risk 15).** The optimizer's "lead-in" is the figcaption `<b>` label, and the optimizer inherits
>    PLACEMENT from the master; Silent-failure risk 15 re-stated on that reading (its text no longer speaks of a lead-in `<p>`
>    contradicting the master). **Q1(b) answer:** `task-c.description-bytes.spec.ts` will compare block 0 with the live
>    `MASTER_SYSTEM_PROMPT` and keep block 1 and `userContent` pinned per case; consequences in Silent-failure risk 16 and 21 and in
>    the fixture section (the block-0 record in `task-c-description-prompts.json` is no longer needed by the guard).
> 7. Other owner answers recorded (Q-TRANS options 1+3, Q-CODEALT "no", Q-SIMPL "no", OD-2 R1/R2, OD-7/8/14/18 accepted as built, OD-11 in
>    part, OD-12 order as intent) and their only impact consequences noted where they apply. Open and non-blocking now: OD-10 D-3 to
>    D-5, D-7, the D-9 half of (4); OD-11 residue; OD-12; OD-13 rest; OD-15.
> **FROZEN files stay flagged. No per-file FROZEN approval is claimed** (the owner's order `task-a.ts`, `output-validator.ts`,
> `master-system-prompt.ts` last is INTENT only). No solution is designed.

> **Change note, v2 to v3 (loop-back attempt 1 of 3 after PLAN_REVIEW v1 CHANGES_REQUIRED, blocker B1; revision run).** v2 recorded
> Specification v3 and Story v3; the Specification is now v4 (`status: APPROVED` in its front matter, as the caller states; its own
> revision note still calls v4 a `DRAFT` pending the gate, which is superseded by the front matter) and the Story is v4 (AC-8 last sentence restated at file level). Re-verified in the tree
> in this run (HEAD `6546db8`, no `src`/`test` change since v2, `bash arch-guard.sh`: ALL CHECKS PASSED; sha256 over both golden
> fixtures re-computed: 96 task-c cases share ONE block-0 record `b01074fa...5433` / 45 387 chars; `full-description-prompts.json`
> block 0 is `b01074fa9f4e` in 10 of 12 cases, `151c04990596` in the 2 `translate/*`). v2's survey stands. Only these items changed:
> 1. **FR-23 is now file level AND payload level** (Spec v4 items 2-5). v2 flagged the v3 wording as unsatisfiable; the Specification
>    now states exactly what v2 surveyed. Where v2 said "the Spec's FR-23 headline is not satisfied" and "NFR-9 omits the guard",
>    those two findings are **closed by the Specification** and the text below is corrected. Q1 (how the Task C digest guard returns
>    to green) is now an explicit OPEN plan-gate item in FR-23, still not decided anywhere.
> 2. **NFR-9 now carries the list** (Spec v4 NFR-9 items 1-3). Every named file and count was checked; one count and three consumers
>    were added or sharpened (section "NFR-9 list: verified", new). One test the list omits and that directly tests the inheritance
>    was found: `src/prompt-core/master-system-prompt.image-markers.spec.ts` (property 6).
> 3. **FR-20 now has a self-scoping sentence** that travels with the shared liveliness constant, so it reaches block 0 of `buildPromptA`
>    (7 stores), `buildPromptC` description (96 + 3 cases) and `buildOptimizerPrompt`. The payload consumers and the tests that pin
>    those payloads are listed in the new section "FR-20 and FR-23: where the new master text lands".
> 4. **No pre-change oracle for the optimizer (and none for the Task C FAQ variant)**: recorded as Unknown 15 and Silent-failure
>    risk 18. The reference "N17" is spec-review v2's finding N17 (`docs/reviews/specifications/US-9.1-spec-review.md`), not
>    plan-review v1 (whose non-blocking findings stop at N9).
> 5. **FR-5 coverage limit for non-marker figures** is now stated in the Specification (FR-5 coverage note, FR-34 coverage note, Open
>    questions note H). Silent-failure risks 2 and 3 and Unknowns 1 and 3 are updated to cite it; the limit itself is unchanged.
> Everything else from v2 is kept. FROZEN files stay flagged. **No per-file FROZEN approval is claimed.** No solution is designed.

> **Change note, v1 to v2 (loop-back attempt 1 of 3, triggered by the planner).** v1 missed that the FROZEN master prompt is also a
> Task C input. Every item below was re-verified in the tree in this run (sha256 over both golden fixtures; live
> `MASTER_SYSTEM_PROMPT` loaded through Vite and hashed; grep over `src test tools server`). Corrections:
> 1. `src/prompts/task-c.ts` `pack()` (line 89) puts `MASTER_SYSTEM_PROMPT` in `systemBlocks[0]` of every description-translation
>    prompt. The live master hashes to `b01074fa9f4e345da920f208f2391183c026a1d4290dc5281eb4d78c8bcb5433` (45 387 chars), which is
>    the single block-0 digest shared by all 96 cases of `task-c-description-prompts.json`. Any master edit moves block 0 of all 96.
>    v1 called that golden and the three `c/*` cases of the other golden a "must not move" tripwire; that is **wrong for block 0**
>    (block 1 and `userContent` of those cases must still not move).
> 2. `full-description-prompts.json`: block 0 moves in **10** cases (7 Task A + the 3 `c/*`), not 7. Only `translate/uk-user` and
>    `translate/de-internal` (block-0 digest `151c04990596`, no master) must not move. Exact per-block table is in "Fixture and corpus impact".
> 3. `src/prompts/task-c.description-bytes.spec.ts` (header "Never regenerate the golden, never pass `-u`") fails on all 96 cases at
>    block 0 only. Specification NFR-9's list of tests that change omits it. `src/prompts/optimizer.ts` also embeds the master and is
>    now a named consumer.
> 4. FR-23 / AC-8 hold at **file level only** (`task-c.ts`, `task-translate.ts` not edited); at payload level the description
>    translation prompt and the optimizer prompt receive the NO PICTURE REFERENCES and liveliness text. Recorded as blast-radius
>    items (Silent-failure risks 14 to 17).
> 5. Re-sweep of `MASTER_SYSTEM_PROMPT`, `LEAD_IN_TEMPLATES`, `SENTENCE_LENGTH_RULES`, `EXPERT3D_TOV_BASE_OVERLAY`,
>    `C3D_TOV_BASE_OVERLAY`, `numericFidelitySources`: result in "Consumer re-sweep" below. No other payload consumer of the master exists;
>    several test-side consumers v1 did not list were added.
> Everything else from v1 is kept unless a section says otherwise. No FROZEN-file approval is claimed.

**Inputs.** Story v4 (track `prompt`), Specification v5 (`APPROVED` in its front matter; FR-1 to FR-41 and NFR-1 to NFR-12, FR numbers
stable, FR-41 appended), Open Decisions v4
(`open_decisions_blocking: false`; **(v4)** still open and non-blocking: OD-10 D-3 to D-5, D-7 and the D-9 half of (4); the OD-11
residue; OD-12; OD-13 rest; OD-15). All three are current (none `SUPERSEDED`). Every file list below was re-derived in this run (v4
re-verified the parts the v5 changes reach) by Grep/Read/Bash over `src`, `test`, `tools`, `server` at HEAD `6546db8` on branch
`feat/US-9.1-no-picture-references-and-livelier-descriptions` (cut from `6546db8`; `src` unchanged); nothing was copied from the skill
text or from an earlier impact analysis. Survey only: no solution is designed here.

## FROZEN-file stop (AGENTS.md section 9): read this first

The approved Specification requires editing **three FROZEN files**:

| FROZEN file | Requirements that reach it | Why no other file can carry it |
|---|---|---|
| `src/prompts/task-a.ts` | FR-11 (three texts: `TASK_A_INSTRUCTION` line 29, `buildVideoBlock` line 105, `buildMarkerBlock` line 121), FR-26 (`[Operator Notes]` block in `userContent`) | `buildPromptA` is the only builder of the Task A `userContent`; `buildPromptADoc` takes it as a byte prefix. FR-26 has **no non-frozen route** (Spec FR-26 failure path, OD-12 point 3). |
| `src/prompt-core/master-system-prompt.ts` | FR-5 (interpolate `[NO PICTURE REFERENCES` constant), FR-6, FR-7, FR-8, FR-9 (`[IMAGE HANDLING]` PLACEMENT / GROUNDING LOCK / `[VIDEO]` text), FR-20 (interpolate shared liveliness constant), FR-29 (`STRICT INPUT SCOPE`, `INTERNAL RECONCILIATION` at lines 48-52) | The text being changed lives in this file; the constants alone (in `constants.ts`) do not reach the model unless the master interpolates them. |
| `src/utils/output-validator.ts` | FR-13 (`image-manifest-missing` detail, line 437), FR-18 (`image-deixis` rule inside `validateGeneratedHtml`, line 464) | FR-18 is written against `validateGeneratedHtml` itself. |

**No per-file "modify <filename>" approval has been given in any session; none is claimed.** The Specification (Scope, NFR-10, OD-12)
defers it to the plan gate. Consequences the plan and the human gate must see:

- Section 9 requires: STOP, state the exact change and reason per file, wait for explicit approval per file, then
  `bash arch-guard.sh --rebaseline` and commit `.arch-guard-checksums` in the same commit as the edit.
- `arch-guard.sh` was run now (read-only): all checks pass and the frozen checksums are unchanged, so the baseline is clean
  before any edit.
- `task-b.ts` and `task-c.ts` (also FROZEN) are **not edited** (FR-23, FR-40) and must stay byte-identical at file level
  (arch-guard checksum `task-c.ts` `619c45a9...9247` is unchanged; `bash arch-guard.sh` re-run in this run: all checks pass).
  **But `task-c.ts` is reached at payload level**: `pack()` (line 89) embeds the FROZEN master, so a master edit changes the bytes
  of every description-translation prompt (block 0) while `task-c.ts` itself is untouched. The two golden mechanisms therefore
  do **not** both stay green: the 96-case digest golden fails at block 0 by design (see Fixture impact). A `task-c.ts` file-level
  checksum cannot detect this. **(v3) Spec v4 FR-23 now says exactly this** (item 2 file level: `git diff` empty and arch-guard
  entries unchanged; item 3 payload level: block 0 changes by design, block 1 and `userContent` byte-identical), and Spec Scope
  adds that the section 9 request for `master-system-prompt.ts` names the Task C and optimizer consumers. The v2 finding that the
  Specification's headline was unsatisfiable is closed; what remains is the file-level check's blindness to payload changes
  (Silent-failure risk 17).
- Refusal of `task-a.ts` removes the only route to FR-26 and so to FR-24 to FR-31 (AC-9); refusal of the other two leaves FR-5 to FR-9,
  FR-13, FR-18 and FR-29 without a carrier. That is OD-12, which is open.
- The established sibling-file pattern exists (`task-a-doc.ts`, `image-manifest-coverage.ts`). Whether it is usable here is a
  `so-planner` decision; this survey only notes that the Specification as written (FR-18 "`validateGeneratedHtml` emits", FR-29
  "master prompt block") names the frozen functions themselves.
- **(v4)** The owner's 2026-10-18 statement on order (`task-a.ts` first, then `output-validator.ts`, `master-system-prompt.ts`
  last, one commit per task with `--rebaseline`) is recorded in Spec v5 NFR-10 and OD-12 as **intent only**; OD-12 stays open and the
  per-file "modify <filename>" instruction has not been given. It is not an approval and this survey does not treat it as one. The
  `task-a.ts` approval request now covers FR-11 (three texts) and FR-26 (`[Operator Notes]`), the `master-system-prompt.ts` request
  must also name the FR-29 edit (reaches block 0 of Task A, Task C description and the optimizer, which then name `[Operator Notes]`
  as an allowed source in prompts that never carry that block; Silent-failure risk 22).

## Affected files

### 1. Must change (as the approved Specification is written)

| File | FROZEN | Requirements | What in the file is reached |
|---|---|---|---|
| `src/prompts/vision-prepass.ts` | no | FR-1, FR-2, FR-3, FR-4 | `UKRAINIAN FIELDS` block `description` and `alt` lines (about lines 61-66); Grounding rules list. |
| `src/prompt-core/master-system-prompt.ts` | **YES** | FR-5 to FR-9, FR-20, FR-29 | See table above. `[IMAGE HANDLING]` span before `FIGURE FORMAT` is pinned and must stay (image-markers spec). |
| `src/prompt-core/constants.ts` | no | FR-5, FR-12, FR-20, FR-22 | New exports for the `[NO PICTURE REFERENCES` text and the shared liveliness block; `C3D_TOV_BASE_OVERLAY` OVERRIDE #5 (lines 1221-1223); `EXPERT3D_TOV_BASE_OVERLAY` (line 878; the "Keep the schema's mandated section order and headings" line at 903). |
| `src/prompts/task-a.ts` | **YES** | FR-11, FR-26 | As above. |
| `src/prompts/task-a-doc.ts` | no | FR-10 | `FIGURE PLACEMENT` paragraph (lines 152-154). `buildPromptADoc` itself (line 177) is only re-verified (FR-26 rides in through the byte prefix). **(v4, OD-19 (1b))** `[Operator Notes]` must be **absent** from every instruction text in this file (`TASK_A_DOC_INSTRUCTION`, line 41, and `buildSimplifiedDocInstruction`, line 184, which lives in `simplified-template-blocks.ts`); the FR-10 edit adds no such string. Searched now: `grep "Operator Notes\|operatorNotes" src test tools server` has **zero** hits, so the absence is the tree's state today and the only way to break it is an edit. |
| `src/utils/output-validator.ts` | **YES** | FR-13, FR-18 | Line 437 detail text; new warning in `validateGeneratedHtml` (DOM already parsed in the `try` at line 600). |
| `src/utils/video-manifest.ts` | no | FR-13, FR-15 | `video-embed-missing` detail (line 218, HTML sibling only; the Doc sibling `validateVideoCoverageDoc` has no "lead-in" wording); all seven `LEAD_IN_TEMPLATES` entries (lines 107-115). |
| `src/utils/image-placeholder.ts` | no | FR-19 | `figureCaptionWarnings` (line 224). |
| `src/utils/image-deixis.ts` (new) | no | FR-16, FR-17, NFR-7 | `findImageDeixis`, `collectFigureDeixis`. |
| `src/services/content-orchestrator.service.ts` | no | FR-14, FR-30 | Two warning texts (lines 1105, 1506); `numericFidelitySources` (line 374). **(v4, OD-20(2))** FR-30 reaches this method for the notes **only**: `supplementalContent` is not added and the `NUMERIC_SOURCE_FIDELITY_RULES` constant text is not extended; the method's three call sites (lines 674, 1081, 1489) are unchanged. The doc comment (lines 360-372) says the method "MUST stay in sync with NUMERIC_SOURCE_FIDELITY_RULES"; after FR-30 the method carries one source the rule text does not name (the notes), by decision. |
| `src/app/types.ts` | no | FR-25 | `ProductInput` (line 41): new optional `operatorNotes`. Not on the section 9 list. |
| `src/app/app.component.ts` | no | FR-24, FR-25, FR-31 | Four new input signals; `buildGeneratorInput` (line 891, shared by Generate and UA Description); `restoreHistory` (line 1024; **(v4, OD-2 R2)** must also set the four fields to empty for an entry without notes, as it already does with `item.input.supplementalContent || ''`); `clearAll()` cases `generator` and `ua-generator` (lines 1061-1103; **(v4) FR-41, both cases, see the new section**); `TRANSLATIONS` `en` and `uk` blocks. The `seo_gen_form_state` constructor/effect (lines 640-677) must **not** gain the fields (FR-31 item 3; FR-41 item 3 adds no write there either). |
| `src/app/app.component.html` | no | FR-24 | The Generator form branch (supplemental content block at lines 278-285, custom instructions at 287-294). That one branch serves both `generator` and `ua-generator` modes. |
| `tools/measure-description.ts` (new) | no | FR-32, FR-33 | New script. `tools/` today holds only `.mjs` files (`validate-harness.mjs`, `feedback-form/`). **(v4, D-10)** Its input set is the generated HTML and the input description (required) plus optional specs, product name and the four operator-note values; a number found only in a text it was not given is reported absent. It therefore reads the operator-notes keys by name (FR-40 item 1 lists it as a reader), so the key names of FR-25 are a second consumer outside `src/app`. The runner is Node's native type stripping if Node >= 22.18 holds (OD-9; see hazard 6), else the D12 launcher; no dependency is added. |
| `test/fixtures/golden/full-description-prompts.json` | no (fixture) | FR-27, NFR-9 | Regenerated with a reviewed diff (see Fixture impact): block 0 of **10** cases, block 1 of 7, overlay block of 5, `userContent` of 3. New fixture(s) for inputs the existing one lacks. |
| `test/fixtures/golden/task-c-description-prompts.json` and `src/prompts/task-c.description-bytes.spec.ts` | no (fixture and guard) | consequence of FR-5, FR-20, FR-29 through the master (named in Spec v4 NFR-9 item 1 and FR-23) | **Forced, not optional:** block 0 of all 96 cases changes; block 1 and `userContent` digests must not. **(v4) Q1 is answered (option (b), owner 2026-10-18; Spec v5 FR-23 and note F):** the guard spec is **edited** so that block 0 is compared with the live `MASTER_SYSTEM_PROMPT` while block 1 and `userContent` stay pinned per case. Consequences surveyed (not designed): (i) the edited file is `src/prompts/task-c.description-bytes.spec.ts` (its header rule "Never regenerate the golden, never pass `-u`" becomes partly untrue and AGENTS.md 7.7 requires the weakening-risk to be named, which Spec NFR-9 does); (ii) `test/fixtures/golden/task-c-description-prompts.json` need **not** change under (b): its 96 identical block-0 records (`b01074fa...5433`, 45 387, `cache: true`) become unread by the guard unless the amended spec still reads the `length`/`cache` fields (whether the block-0 `cache: true` flag and the block count stay pinned per case is not stated by the Specification, Silent-failure risk 21); (iii) block 0 under (b) is checked against the same constant Task C embeds, an oracle `master-system-prompt.image-markers.spec.ts` property 6 already holds for one Task C case (it catches "block 0 is not the master", never "the master changed unintentionally"). Verified in this run: the golden holds exactly **one** distinct block-0 record shared by all 96 cases. Not a FROZEN file, but a guard whose stated rule (US-8.1 AC-18) the Story's requirements change. |

### 2. Needs re-verification even if unchanged

| File | Why |
|---|---|
| `src/utils/image-placeholder-validate.ts` (lines 80-81) | Computes appended-figure warnings as `figureCaptionWarnings([...placed, ...appended]).slice(before)` where `before = figureCaptionWarnings(placed).length`. Correct only while every figure's warnings depend on that figure and the earlier ones. A new per-figure warning added to `figureCaptionWarnings` must keep that property, and must not be emitted after the `if (f.fallbackLabel) continue;` skip if fallback-label figures are to be covered. |
| `src/utils/image-placeholder-html.ts`, `image-placeholder-doc.ts`, `image-figure.ts`, `video-figure.ts` | Build or rewrap figures around the paragraph above; their comments and tests speak of a "lead-in <p>" (`image-figure.ts:66`, `video-figure.spec.ts:82`). No behaviour change is implied; re-run only. |
| `src/utils/image-manifest-coverage.ts` | Doc-path sibling of `image-manifest-missing`; its detail (lines 61-64) says nothing about a lead-in, so FR-13 does not reach it, but it is the Doc path's counterpart of the changed message. |
| `src/prompts/simplified-template-blocks.ts` | Its Doc rules say "every figure block immediately after a paragraph block that **introduces it**" (line 123) and "an optional lead-in" (lines 165, 208). FR-10 edits `TASK_A_DOC_INSTRUCTION` only. Simplified templates (`filaments-resins-powders`, `accessories`, `spare-parts`) swap that instruction into `systemBlocks[1]` (`task-a-doc.ts` line 184), so they keep a "paragraph that introduces it" wording while receiving the new master rule. Not named by any FR. |
| `src/prompts/optimizer.ts` (import line 1; `buildOptimizerPrompt` lines 115-127 put `MASTER_SYSTEM_PROMPT` in `systemBlocks[0]`; own instruction line 87) | **Payload consumer of the master (corrected from v1).** Called by `content-orchestrator.service.ts` line 1894 (Optimizer tab, wrapped in `runRepairGate`). Its block 0 changes by design; it inherits `NO PICTURE REFERENCES` and the liveliness text. Its own `TASK_OPTIMIZE_INSTRUCTION` still re-authors every figcaption ("context-aware <figcaption> ... with a <b> lead-in") and says the master's `FIGURE FORMAT and PLACEMENT above` apply. **(v4, Q-OPT)** The "lead-in" in that sentence is the figcaption `<b>` label (the master keeps `<b>LEAD-IN LABEL:</b>` in its `FIGURE FORMAT` examples, master lines 405 and 410, and Spec conventions say the word stays there), not a lead-in `<p>`; what the optimizer inherits from the master is PLACEMENT (the FR-7 "preceding paragraph" text) and `[NO PICTURE REFERENCES`, both via block 0. The owner accepted the optimizer contradiction as recorded (option 1, no `optimizer.ts` edit; Silent-failure risk 15). Optimizer output is not in any acceptance run. **No optimizer byte golden exists** (`optimizer.spec.ts` is behavioural; no golden fixture, no digest, and `test/fixtures/full-description-inputs.ts` has no optimizer case): re-verified in this run. Block 1 is the module-private `TASK_OPTIMIZE_INSTRUCTION`, whose only interpolated constant is `NO_LEAKED_REASONING_CLAUSE` (not edited), so block 1 and `userContent` should not move, but nothing would show it if they did (Silent-failure risk 18, Unknown 15). Spec v4 FR-23 item 4 states the optimizer inherits through block 0 and "nothing else in its payload is changed". |
| `src/prompts/task-c.ts` (`pack()` line 89), `src/prompts/task-translate.ts` | **`task-c.ts`: payload consumer of the master (corrected from v1).** Not edited (FR-23, file level), but the master is `systemBlocks[0]` of every description translation (`buildPromptC` call sites in the orchestrator: line 1281, description loop; line 946, FAQ variant only, which does **not** embed the master, line 405 comment and `task-c.faq.spec.ts` line 82). The FAQ variant, `buildTranslatePrompt` / `task-translate.ts` (block-0 digest `151c04990596`, no master; imports only `UNIT_LOCALIZATION_RULES`, `TRANSLATOR_LANGUAGES`, `NO_LEAKED_REASONING_CLAUSE`) are not reached. Both files import other constants from `constants.ts`; none of the constants this Story edits (`C3D_TOV_BASE_OVERLAY`, `EXPERT3D_TOV_BASE_OVERLAY`, the two new constants) is imported by them; they use the separate `*_TOV_TRANSLATION_OVERLAY` constants (imports re-read in this run). **(v3) One transitive tripwire for "block 1 unchanged":** `task-c.ts` and `task-translate.ts` both import `SIMPLIFIED_TRANSLATION_CLAUSE` from `src/prompts/simplified-template-blocks.ts`. No FR edits that file, but it is the one non-`constants.ts` file whose edit would move Task C block 1 of the 16 `corpus/simplified-template+source-locale` golden cases (one per store/language pair) (and the Doc translator), contradicting FR-23 item 3. |
| `src/utils/structural-parity.ts` (`validateStructuralParity`, orchestrator lines 1319 and 2037) | The gate every description translation must pass. It counts tags only (`<section>`, `<h2>`, `<h3>`, `<hr>`, `<figure>`, `<figcaption>`, `<table>`, `<tr>`, `<td>`, `<li>`) at `severity: 'error'`, so an added or dropped heading, bullet or figure by a translator is caught; an added, split or dropped sentence **inside a `<p>` is not counted and passes silently**. |
| `test/fixtures/faq-pipeline.ts` (line 105 `masterPromptBlocks`), `src/prompts/task-c.faq.spec.ts` (lines 82, 168, 174), `src/services/content-orchestrator.faq-standalone.spec.ts` | Read the live master (`MASTER_SYSTEM_PROMPT`, plus `.slice(0, 400)` and `.slice(3000, 3400)`) to assert the description path **contains** it and the FAQ path does **not**. Stay green, but the two positional slices will cover different master text after an insertion before offset 3400, so the "FAQ prompt carries no master fragment" negative check examines new text; re-run, no edit implied. |
| `src/prompt-core/hook-pattern.ts`, `src/services/content-orchestrator.service.ts` `selectHookPattern` call sites (lines 1038, 1452) | HOOK (FR-20) governs only the `[use-case]` slot; the `[§1 HOOK PATTERN]` suffix is appended to `userContent` by `buildPromptADoc` and must still coexist with the unchanged INVARIANT START. |
| `src/utils/sentence-length.ts`, `SENTENCE_LENGTH_BANDS` and `SENTENCE_LENGTH_RULES` in `constants.ts` (lines 657-730) | RHYTHM must not add a number that disagrees with `[SENTENCE LENGTH]` (FR-20). The band map is guarded by `constants.spec.ts` ("mirrors"). Nothing in them is edited. |
| `src/utils/heading-style.ts` | FR-22 says no change is expected for EXPERT3D (the `<h2>` functional-heading check covers Center 3D Print only); the plan confirms. |
| **(v4)** `src/app/app.component.template-wiring.spec.ts` (logic runner, source-text pins) | The only spec that mentions `clearAll()`: the pin at line 173 slices the function with `/clearAll\(\)\s*\{[\s\S]*?\n  \}\n/` and checks only the `faq-generator` case. It stays green after FR-41 (the lazy match ends at the first `\n  }\n`, the function's own close; nested braces are indented 4+). It is also the file where a FR-41 / FR-24 / FR-31 pin would naturally sit (Silent-failure risk 20). No spec references `restoreHistory` or `buildGeneratorInput`. |
| `src/prompts/task-faq.ts`, `src/utils/faq-form.ts`, `runFaqPipeline` (orchestrator line 807), `generateFaqOnly` (line 1779) | FR-28/FR-40: must not read `operatorNotes`. The FAQ trigger is `input.supplementalContent?.trim()` at lines 809 and 1780. |
| `src/prompts/task-b.ts`, `src/prompts/task-slug.ts` (called at orchestrator lines 1183, 1232, 1571, 1611, 1680, 1735) | FR-40 item 3: output must be identical with notes filled and absent. |
| `src/services/history.service.ts` | Stores the whole `ProductInput` via `add(input, output)`; `operatorNotes` round-trips without a code change (FR-31 item 1). Quota handling halves the list on `QuotaExceededError`. No migration is needed (optional field). |
| `src/app/tab-descriptors.ts`, `src/prompt-core/doc-pipeline-flag.ts`, `src/prompt-core/store-render-rules.ts` | `STORE_REGISTRY` consumers; no change implied, re-verified in hazard 1. |
| `src/utils/repair-gate.ts`, `src/utils/repair-strategy.ts` | New findings are warnings with no `path`; warnings never enter the repair loop (`severity === 'error'` filters at repair-gate lines 128, 135, 315, 436). Re-verify that a new rule id needs no entry in `REPAIR_STRATEGIES` or `NON_REGENERABLE_RULES`. |
| `src/services/content-orchestrator.service.ts` `runOutputValidation` (line 2024) | The post-hoc validation of `mainHtmlUa` and every translation is where a new `validateGeneratedHtml` warning will actually surface, for Doc-pipeline stores too (the Doc gate itself does not call `validateGeneratedHtml`). |
| `src/render/render-description.ts`, `src/domain/description-doc.ts` | The Doc to HTML chain. Figure `caption`/`alt` and paragraph blocks are model-authored text; no schema or renderer field is added. |
| `server/**` | Payload-agnostic (see hazard 7). |

### 3. Tests that exercise the affected surface

**Existing specs expected to be touched or re-run** (logic runner unless noted):

- **Guards that fail by design and must be handled (confirmed in v3 against Spec v4 NFR-9 item 1):** `src/prompts/full-description.golden.spec.ts` (line 27 loop: byte-equal `systemBlocks` and `userContent` for all 12 cases; fails on 10 at block 0, plus the block 1, overlay and Tier B `userContent` moves), **`src/prompts/task-c.description-bytes.spec.ts` (fails on all 96 per-case tests at block 0 only; its premise tests, 16 pairs and 96 cases, stay green; header "Never regenerate the golden, never pass `-u`"; now named in Spec NFR-9 and FR-23; **(v4) return-to-green is Q1 answered as option (b): this spec file is amended to compare block 0 with the live master and keep block 1 and `userContent` pinned per case, so it is a test that is edited, not only re-run**)**, and the consumers of the first golden's `userContent` that re-pin from the regenerated file: `task-a.spec.ts` AC-9b block (line 347 on, `html/expert3d`, `html/legacy`, `html/legacy+lang`, `html/c3d+customTemplate`) and `task-a-doc.spec.ts` line 229 (`doc/expert3d`, `doc/expert3d+hook`, `doc/c3d`), which stay green only if the regenerated golden is the oracle.
- Prompt text pins: `src/prompts/vision-prepass.spec.ts`, `src/prompts/task-a.spec.ts` (includes the `never bare noun` guard at line 122 and the byte-identical cached-prefix test across every store, line 133), `src/prompts/task-a-doc.spec.ts`, `src/prompts/task-a-doc.v4.spec.ts` (line 207 regex `/no orphan|preceded by a[^]{0,40}<p>|lead-in <p>/i`), `src/prompts/task-a.simplified.spec.ts`, `src/prompts/task-a-doc.simplified.spec.ts`, `src/prompts/task-a.import-cycle.spec.ts`, `src/prompts/task-c.spec.ts`, `src/prompts/task-c.faq.spec.ts`, `src/prompts/task-translate.spec.ts`, `src/prompts/optimizer.spec.ts` (behavioural, re-run; line 54 comment concerns the master's `[CONTENT STRUCTURE]`).
- Master consumers in `src/prompt-core` and `src/utils` specs (re-run; some slice or search the master text): `src/prompt-core/protected-name-precedence.spec.ts` (line 83), `src/prompt-core/constants.spec.ts` (lines 103, 143 `flatMaster`), `src/utils/image-figure-style.prompt-examples.spec.ts` (lines 23-25 slice the master from `FIGURE FORMAT — wrap every image`), `test/fixtures/faq-pipeline.ts`, `src/services/content-orchestrator.faq-standalone.spec.ts`.
- Master / constants: `src/prompt-core/master-system-prompt.spec.ts`, `master-system-prompt.v4.spec.ts`, `master-system-prompt.image-markers.spec.ts`, `constants.spec.ts` (C3D overlay pins at lines 118-170; `IMAGE GROUNDING LOCK stands` at line 111), `v4-headings.spec.ts`, `store-render-rules.spec.ts`, `simplified-templates.consistency.spec.ts`, `hook-pattern.spec.ts`.
- Validator / utilities: `src/utils/output-validator.spec.ts` (image-manifest block at line 750), `output-validator.simplified.spec.ts`, `src/utils/image-placeholder.spec.ts` (`figureCaptionWarnings(...)).toEqual([])` at lines 173, 220, 242), `image-placeholder-validate.spec.ts`, `image-placeholder-html.spec.ts` (rule allow-list at line 355), `image-placeholder-doc.spec.ts`, `video-manifest.spec.ts` (restore test at line 111 asserts only that the lead-in contains the product name), `video-figure.spec.ts`, `image-figure.spec.ts`, `image-figure-style.prompt-examples.spec.ts` (pins `short scannable description of what the image shows` in the master), `image-manifest-coverage.spec.ts`, `repair-gate.spec.ts`, `faq-gate.spec.ts`, `decimal-separator.spec.ts`.
- Orchestrator: `content-orchestrator.image-placeholder.spec.ts`, `.doc-gate.spec.ts`, `.simplified.spec.ts`, `.ua-doc-pipeline.spec.ts`, `.hook-pattern.spec.ts`, `.faq-pipeline.spec.ts`, `.faq-standalone.spec.ts`.
- Corpus harness: `test/render-reconciliation.spec.ts`, `test/render-conformance.spec.ts`, `.v4.spec.ts`, `.simplified.spec.ts`.
- Form / history: `src/app/app.component.template-wiring.spec.ts` (source-text pins, logic runner), `src/app/app.component.faq-layout.spec.ts`, `src/app/app.component.export-guard.spec.ts`.

**New tests the Specification implies** (a planner needs these as tasks, so they are named here, not designed): detector per base language (FR-16, seven languages); `collectFigureDeixis` carriers and adjacency (FR-17); `validateGeneratedHtml` and `figureCaptionWarnings` warning level (FR-18, FR-19); prompt-wording present/absent pins per FR (FR-1 to FR-15, FR-20 to FR-23, FR-29); byte-identical `userContent` with empty notes, Tier A and Tier B, plus the `buildPromptADoc` prefix (FR-27, must be captured **before** `task-a.ts` is edited); `[Operator Notes]` block exact bytes (FR-26); FAQ not triggered (FR-28); notes not reaching SEO / slug / FAQ / spec grounding (FR-40); `numericFidelitySources` (FR-30); history round trip and restore (FR-31, **(v4)** now including resend after restore, FR-31 item 4, and an entry without notes emptying the textareas, item 5); **(v4) "Clear All" in both modes (FR-41): with the four textareas filled by typing and, in a second case, filled by restoring an entry with notes, invoke `clearAll()` in `generator` and in `ua-generator`, assert the four values are empty and that the input built for the next Generate / UA Description click has no `operatorNotes` key**; **(v4) `[Operator Notes]` absent from every instruction text of `task-a-doc.ts` (OD-19 (1b)) and present in `buildPromptA(...).userContent` for the Expert-3DPrinter profile (OD-19 (2))**; `LEAD_IN_TEMPLATES` pointer-free for seven languages (FR-15); the measurement script (FR-32, FR-33; **(v4)** D-10 input set).

**Which runner new tests land in (hazard 6).** Everything except a `*.component.spec.ts` runs under `npm run test:logic`. The prompt, detector, validator, orchestrator-text, `LEAD_IN_TEMPLATES` and script tests are all logic-runner. The textarea / history-restore tests land in the **logic runner** if they follow the existing source-text-pin pattern (`app.component.template-wiring.spec.ts` says explicitly that no `AppComponent` spec exists and the plan that created it rejected adding one for DI weight) and in the **component runner** only if written as `*.component.spec.ts`. The component runner currently holds two files (`content-template-select.component.spec.ts`, `model-settings.component.spec.ts`), not one as the skill text says. A behavioural test of `restoreHistory` / `buildGeneratorInput` against a real `AppComponent` would be the first `AppComponent` TestBed spec in the repo; that is a planning risk, not decided here. **(v4)** FR-41 and FR-31 items 4 and 5 are worded as behavioural ("invoke Clear All; assert the built input has no `operatorNotes` key"), and `clearAll()` / `restoreHistory()` / `buildGeneratorInput()` are methods of `AppComponent` with no existing instantiation in any spec (verified by grep: `clearAll` is referenced only by the FAQ source-text pin; `restoreHistory` and `buildGeneratorInput` by no spec). So the same question now covers three more behaviours; a source-text pin proves only text, not that the reset runs (Unknown 17).

## NFR-9 list: verified (new in v3, against Spec v4 NFR-9; v4: Spec v5 NFR-9 item 1 is unchanged except that Q1 is now answered)

Each file the v4 NFR-9 names was checked to exist at HEAD `6546db8` and its relation to the master was re-read. "Result" says
what the Story's edits do to it; nothing here is a solution.

| NFR-9 item | File | Exists | Result |
|---|---|---|---|
| 1, fails by design | `test/fixtures/golden/full-description-prompts.json` + `src/prompts/full-description.golden.spec.ts` | yes | 12 cases confirmed. Block 0 moves in **10** (`doc/expert3d`, `doc/expert3d+hook`, `doc/c3d`, `html/expert3d`, `html/legacy`, `html/legacy+lang`, `html/c3d+customTemplate`, `c/expert3d-es`, `c/eu-en`, `c/us-uk`; digest `b01074fa9f4e`); the two `translate/*` (`151c04990596`) do not. The 7/5/3 split is unchanged from v2: block 1 in 7 (`TASK_A_DOC_INSTRUCTION` x3 `3af00a46b545`, `TASK_A_INSTRUCTION` x4 `66fae623c329`), overlay block in 5 (EXPERT3D `7f0c47172108` x3, C3D `abdf68aabda3` x2), `userContent` in 3 (video Tier B cases). |
| 1, fails by design | `src/prompts/task-c.description-bytes.spec.ts` + `test/fixtures/golden/task-c-description-prompts.json` | yes | **96 cases confirmed** (16 pairs x 6 variants: 4 `corpus/*` + 2 `snippet/*`, each pair with and without opts). All 96 share one block-0 record (`sha256 b01074fa...5433`, `length 45387`, `cache: true`). 96 per-case tests fail at `systemBlocks[0]`; the two premise tests stay green. **(v4)** The failing assertions are the length and `sha256` lines (spec lines 60-61) applied to index 0 (the `cache` line 62 holds at index 0); under Q1(b) index 0 is compared with the live master and index 1 and `userContent` keep lines 60-62 and 64-65. Lines 59-63 are one `forEach` over all blocks, so splitting block 0 out of it is an edit to the guard's loop, not an added test. |
| 2, keep green | `src/prompts/task-c.spec.ts` | yes | Line 19-20 asserts `buildPromptC(...).systemBlocks[0].text` contains `NUMERIC_SOURCE_FIDELITY_RULES` (via the master): stays green unless OD-20(2) removes that text. Lines 271 and 295 join **all** system blocks (master included) for negative regexes (`TRANSLATE the generic descriptor`, `reorder it category-first`) and positive `[PRODUCT NAME LOCALIZATION`: the new master text must not contain the three negative phrases. |
| 2 | `src/prompts/task-c.faq.spec.ts`, `test/fixtures/faq-pipeline.ts` | yes | Positional master slices `(0,400)` and `(3000,3400)` at `task-c.faq.spec.ts` line 82 and `faq-pipeline.ts` line 105: FAQ-variant negative check, now examining different master text after an insertion before offset 3400. It stays a presence check only; it is **not** a byte oracle for the FAQ variant (Risk 18). |
| 2 | `src/services/content-orchestrator.faq-standalone.spec.ts` | yes | Uses the `faq-pipeline.ts` helper; re-run. |
| 2 | `src/prompt-core/protected-name-precedence.spec.ts` | yes | Line 83 `MASTER_SYSTEM_PROMPT` contains the marker; line 108 joins every block of `buildPromptC` for 16 pairs and looks for the marker. Both are presence checks over text that gains content. |
| 2 | `src/prompt-core/constants.spec.ts` | yes | Line 104 (`NUMERIC_SOURCE_FIDELITY_RULES` reaches the master) and line 143 (`flatMaster` whitespace-collapsed search). |
| 2 | `src/utils/image-figure-style.prompt-examples.spec.ts` | yes | Slices the master from `FIGURE FORMAT — wrap every image` (line 23) and pins `short scannable description of what the image shows`; also `not.toContain('fit-content')` over the whole master (line 57). Stays green only while no FR edits `FIGURE FORMAT` and the new text avoids `fit-content`. |
| 2 | `src/prompts/optimizer.spec.ts` | yes | Behavioural: assertions are on block 1 (`systemBlocks[1].text`), `userContent` fragments and `systemBlocks[0].cache` only. No master text, no digest. |
| 2 | `task-a.spec.ts` AC-9b block (line 348 on) and `task-a-doc.spec.ts` (line 230 on) | yes | Compare **`userContent` only** to `full-description-prompts.json`; they track the regenerated golden, and fail for the Tier B video cases (`html/expert3d`, `doc/expert3d`, `doc/expert3d+hook`) until it is regenerated. |
| not on the list | **`src/prompt-core/master-system-prompt.image-markers.spec.ts`** ("property 6", lines 132-151) | yes | **Direct test of the inheritance FR-23 describes:** `buildPromptA(...).systemBlocks[0].text`, `buildPromptC(...).systemBlocks[0].text` and `buildOptimizerPrompt(...).systemBlocks[0].text` are all asserted `toBe(MASTER_SYSTEM_PROMPT)`. It stays green by design and is an existing oracle for Spec FR-23's "`systemBlocks[0].text` equals the text of `MASTER_SYSTEM_PROMPT`" clause for Task C and the optimizer (it uses `Spanish (EXPERT3D)` / `EXPERT3D`, one Task C case only). It is not named in NFR-9. The same file pins the `[IMAGE HANDLING]` span (lines 38-105) that FR-5 and FR-7 must not break. |
| not on the list | `src/prompts/output-integrity-wiring.spec.ts` | yes | Lines 47-48 and 74-75: `NO_LEAKED_REASONING_CLAUSE` reaches the optimizer, Task A block 0 and Task C block 1. Not edited by any FR; stays green. |
| not on the list | `src/prompts/task-translate.simplified.spec.ts` | yes | Line 83: `allText(buildPromptC(..., simplified template))` (master included) `not.toMatch(/§C[1-6]\|CONSUMABLES/)`. The new master text (FR-5, FR-20, FR-29) must contain neither. A watch item, not a failure. |

Items 3 of NFR-9 (`master-system-prompt.spec.ts`, `master-system-prompt.v4.spec.ts`, `task-a.spec.ts` pin `§3 FUNCTIONALITY` text
that must stay) were not re-read beyond v2; they are in the "Tests" list above.

## FR-20 and FR-23: where the new master text lands (new in v3)

FR-20's self-scoping sentence lives in the one shared liveliness constant interpolated into the master (not in `task-c.ts`). The
master is `systemBlocks[0]` of exactly three payload builders, so the sentence, `[NO PICTURE REFERENCES` (FR-5), the liveliness
block (SCENE, RHYTHM, HONEST LIMITS, HOOK) and the FR-29 text reach exactly these payloads:

| Payload | Where | Cases in the repo that pin or build it | Pinned by |
|---|---|---|---|
| `buildPromptA` / `buildPromptADoc` block 0 (7 stores) | `task-a.ts` line 2 | 7 cases in `full-description-prompts.json` (`doc/*`, `html/*`) | byte golden (moves by design) and `task-a.spec.ts` "the two cached prefix blocks are byte-identical across every store" (guards that the shared constant is not store-dependent) |
| `buildPromptC` description translation block 0 | `task-c.ts` `pack()` line 89 | 96 cases in `task-c-description-prompts.json`; 3 `c/*` cases in `full-description-prompts.json` | digest golden + `task-c.description-bytes.spec.ts` (fails by design; **v4: amended per Q1(b), block 0 vs the live master**); byte golden; `master-system-prompt.image-markers.spec.ts` property 6 (stays green) |
| `buildOptimizerPrompt` block 0 | `optimizer.ts` line 124 | none (no golden) | `master-system-prompt.image-markers.spec.ts` property 6 (block 0 equals the master, stays green); `output-integrity-wiring.spec.ts`; `optimizer.spec.ts` (behavioural). **No byte or digest pin.** |
| Task C **FAQ variant**, `buildTranslatePrompt` | `task-c.ts` line 105+, `task-translate.ts` | `translate/uk-user`, `translate/de-internal` (byte golden, all blocks); FAQ variant: none | `translate/*` byte-equal golden stays green; the FAQ variant has only the negative master-fragment presence check (`task-c.faq.spec.ts` line 82), **no byte oracle** |

What a test can assert for the self-scoping sentence (presence only, Spec FR-20 Assert-present). **(v4: literal changed by Q-SCOPE;
v3 cited the old third string `the source's sentences, headings and order are kept`, now superseded)** The three strings are
`govern writing a new description`, `when the task is to translate an existing text they do not apply` and `the source's
sentences and their order are kept` (full sentence: `These rules govern writing a new description; when the task is to translate an
existing text they do not apply, and the source's sentences and their order are kept.`, VERBATIM, ASCII apostrophe), in
`systemBlocks[0].text` of `buildPromptA` for each of the 7 stores, of a `buildPromptC` description prompt and of
`buildOptimizerPrompt`; and absent from the Task C FAQ variant and `buildTranslatePrompt` (neither embeds the master). Re-checked
against the tree for this change: no existing test or source contains `translate an existing`, `do not apply` as a phrase pin or
`sentences and their order` (grep over `src test`, one unrelated hit `master-system-prompt.ts:399` "do not apply to markers"); the
case-insensitive negative regexes in `task-c.spec.ts` lines 273-276 (`TRANSLATE the generic descriptor`, `reorder it category-first`)
do not match the new literal; the word "headings" is gone from the sentence, so the sentence no longer names headings at all
(`validateStructuralParity` still counts `<h2>`/`<h3>`, so heading count is gated independently of the sentence). The master is a
template literal (`master-system-prompt.ts` line 12), so the ASCII apostrophe needs no escaping. No test can show a translator or
the optimizer obeys it (Spec note G, FR-20 failure path).

**Unchanged-bytes assertions in FR-23, and the oracle each one has today:**

| Claim in FR-23 | Oracle at HEAD | Exists? |
|---|---|---|
| Block 1 and `userContent` of all 96 Task C description cases unchanged | digests in `task-c-description-prompts.json`, checked per case by `task-c.description-bytes.spec.ts` | yes (**v4:** Q1(b) keeps per-case block-1 and `userContent` digests by decision; the amended guard has not been written, so this is the owner's intent, not yet a test) |
| Block 1 and `userContent` of the 3 `c/*` cases unchanged | `full-description-prompts.json`, but that file is **regenerated** by this Story, so it is an oracle only as a reviewed diff (the regenerated `c/*` block 1 and `userContent` must be unchanged) | only through the diff review |
| Every block of `translate/*` unchanged | `full-description-prompts.json` | yes |
| Every block of the Task C FAQ variant unchanged | none | **no** |
| Optimizer block 1 and `userContent` unchanged (Story AC-8, FR-23 item 4) | none | **no** (spec-review v2 N17; Unknown 15) |

## FR-41 / clearAll: reach (new in v4)

Re-read in the tree at HEAD `6546db8` (`src/app/app.component.ts`, `app.component.html`, `app.component.template-wiring.spec.ts`).

| Item | Finding |
|---|---|
| Function | `clearAll()` line 1061, a `switch (this.appMode())`. Cases: `generator` (1063-1082), `ua-generator` (1084-1103), `seo-generator`, `slug-generator`, `faq-generator`, then `optimizer`, `translator`, `readability`, `copywriter`, `image-tools` (case labels listed by grep; the bodies below line 1134 were not read, and none is a Generator mode). |
| The two Generator cases | Textually identical bodies (selectedWebsite, productName, description, specs, supplementalContent, customInstructions set to empty; `activeTab` `'html'`; `clearGenImgManifest()`; `orchestrator.content.update`; three orchestrator signals cleared). They are two independent copies; an edit to one leaves the other unchanged. FR-41 item 1 names both modes, so the reset is needed in both cases. |
| Signals it reaches | The four new operator-note signals (not yet in the tree: `grep operatorNotes` over `src test tools server` has zero hits). They are read by `buildGeneratorInput` (line 891), which `generate()` (line 914) and `generateUa()` (line 921) both call, so one shared set of signals feeds both modes and the Generator form branch in `app.component.html` (supplemental content at lines 278-285, custom instructions at 287-294) serves both modes. Clear All resets signals shared by both modes. |
| Button | One shared "Clear All" button (`app.component.html` line 1028, `(click)="clearAll()"`, label `uiLabels().clearAll` in the `en` and `uk` `TRANSLATIONS` blocks, lines 103 and 277), rendered for every mode: no template change is needed for FR-41. |
| What must not change (FR-41 item 3) | `seo_gen_form_state` (constructor read lines 640-657, `effect` lines 668-677 persist `websiteName`, `productName`, `description`, `specs`, `customInstructions` only; `supplementalContent` is not persisted either), history records, and every other mode's reset. `clearAll()` does not reset `selectedTemplateId`, `genBrandFolder`, `genModelFolder` or the template flags today; FR-41 does not ask it to. |
| Interaction with restore | `restoreHistory` forces `appMode` to `'generator'` (line 1025) and the history panel renders only in `generator` mode (`app.component.html` line 131), so "restored values then Clear All" is reachable in the `generator` case only; the `ua-generator` case is reached with typed values, or with restored values after switching mode (the signals are shared). FR-41 Tests ask for the restore-then-clear case "in each of the two modes". |
| Specs that reach it | `app.component.template-wiring.spec.ts` (logic runner): the only one that names `clearAll`; its pin at line 173 is unaffected (see the re-verification table). No spec instantiates `AppComponent`. New FR-41 tests land in the **logic runner** if source-text pins, or in a new `AppComponent` TestBed spec (component runner only if named `*.component.spec.ts`); see the runner paragraph and Unknown 17. |
| Orchestrator, prompts, validators | Not reached. FR-41 is Angular-layer only (`app.component.ts`); track assignment is the task breakdown's. |

## OD-19 / OD-20 consequences (new in v4)

**OD-19 (1b): the Doc instructions do not mention `[Operator Notes]`.** Searched: `grep "Operator Notes\|operatorNotes" src test tools server` has zero hits, so nothing mentions the block today. The instruction texts that must stay silent about it are `TASK_A_DOC_INSTRUCTION` (`task-a-doc.ts` line 41), the per-template instruction `buildSimplifiedDocInstruction(templateId)` (called at `task-a-doc.ts` line 184; defined in `simplified-template-blocks.ts`) and, by the same rule, `TASK_A_INSTRUCTION` and the simplified HTML blocks are not said to mention it either (Spec FR-26 names `task-a-doc.ts` only; `TASK_A_INSTRUCTION` is a FROZEN text FR-11 edits, FR-11 adds no such string). Paths and prompts reached: `buildPromptADoc` calls the frozen `buildPromptA` base with `templateId: undefined` and keeps `base.userContent` as a byte prefix (`task-a-doc.ts` lines 173-207), so the block rides into the Doc pipeline's uncached `userContent` for the six `DOC_PIPELINE_STORES` (`EXPERT3D`, `3DDevice`, `3DPrinter`, `3DScanner`, `Center 3D Print`, `Drukarka 3D`; orchestrator `usesDocPipeline` at lines 1034 and 1448), in front of the Doc `runFacts` and hook suffix. The only description in the model's prompts of the block is the master's `STRICT INPUT SCOPE` bullet (FR-29, cached block 0): the model sees the labelled block in the user message and a source rule in the system message, with no Doc-specific explanation. This is an owner decision; the consequence is that no prompt text tells the Doc-pipeline model how to use the entries beyond the master rule.

**OD-19 (2): Expert-3DPrinter receives and renders the notes.** `Expert-3DPrinter` is not in `DOC_PIPELINE_STORES`, so it takes the plain-HTML path (`buildPromptA(masterInput, 'Ukrainian (uk-UA)')`, orchestrator lines 1039 and 1453) with the whole `ProductInput` spread (`{ ...input, specs, customInstructions }`, lines 1015 and 1437), so `operatorNotes` survives. It is image-free by policy (`task-a.ts` line 53 `[IMAGE MANIFEST]\nNone — skip all <img>.`; orchestrator lines 972-974 and 1401-1402 drop the manifest), so the FR-11 image/marker/video spans are not the reason notes matter there; the notes are the only per-run operator facts that store gets beyond `supplementalContent` and `customInstructions`. FR-26's position (after the `[Supplemental Content]: ...` line, before the image block) is store-independent. Prompts reached: `userContent` of `buildPromptA` for Expert-3DPrinter only on the uk-UA master call; the translation prompts (Task C) and SEO / slug / FAQ prompts do not carry the block (FR-40). Golden coverage of this store today: `LEGACY_INPUT` in `test/fixtures/full-description-inputs.ts` (line 55) is `Expert-3DPrinter` (group US) and feeds `html/legacy` and `html/legacy+lang` in `full-description-prompts.json`, both Tier A (no video, no marker, notes absent), so those two cases are the existing oracle that an empty `operatorNotes` leaves this store's `userContent` byte-identical; no existing case has a non-empty `operatorNotes`, so the "present for Expert-3DPrinter" assertion (OD-19 (2)) needs a new test and the notes-filled form is not covered by any golden.

**OD-20: numeric fidelity and the script.** (i) `numericFidelitySources` (line 374) is the only code that must learn about the notes for the gate; `supplementalContent` stays out, so a number present only in supplemental content still fails the gate, as it does today. (ii) The `NUMERIC_SOURCE_FIDELITY_RULES` constant is **not** edited, so `constants.spec.ts` line 104, `task-c.spec.ts` line 20 and `alt-numeric-fidelity.spec.ts` need no change on that account (the consumer re-sweep row for that symbol is now "not edited"). (iii) The comment above `numericFidelitySources` says it must stay in sync with that rule text; after FR-30 it deliberately does not (one extra source). (iv) The script's input set is D-10 (see the must-change table): description and generated HTML required, specs, name and the four notes optional; there is no exemption list for fixed CTA or store text, so a CTA number that is in none of the given texts is reported absent and the script exits non-zero (FR-33), which is accepted by the owner and left for the first live runs.

## Consumer re-sweep (v2): who reads what this Story edits

Searched with Grep over `src`, `test`, `tools`, `server` on HEAD `6546db8`. `tools/` and `server/` contain no hit for any symbol below.

| Symbol (edited or reached by the Story) | Production payload consumers | Other production references | Test consumers |
|---|---|---|---|
| `MASTER_SYSTEM_PROMPT` (`master-system-prompt.ts`, FROZEN) | `task-a.ts` (line 2; reaches `buildPromptA`, and `buildPromptADoc` through it), **`task-c.ts` (line 89, description translation; not the FAQ variant)**, **`optimizer.ts` (line 124)** | Comments only: `constants.ts` lines 662, 728; `ua-translation-style-guide.ts` line 175; `output-validator.ts` line 536; `spec-category-shape.ts` line 29 | `master-system-prompt{,.v4,.image-markers}.spec.ts`, `protected-name-precedence.spec.ts`, `constants.spec.ts`, `task-a.spec.ts`, `task-c.faq.spec.ts`, `image-figure-style.prompt-examples.spec.ts`, `test/fixtures/faq-pipeline.ts` |
| `SENTENCE_LENGTH_RULES` (`constants.ts` line 694) | `master-system-prompt.ts` line 85 only (so Task A, Task C description translation and the optimizer, via the master) | `sentence-length.ts` comments; `SENTENCE_LENGTH_BANDS` (line 657, not edited) is also interpolated by `ua-translation-style-guide.ts` (used by `task-translate.ts`, not reached) | `constants.spec.ts` ("mirrors"), `task-a.spec.ts` |
| `EXPERT3D_TOV_BASE_OVERLAY`, `C3D_TOV_BASE_OVERLAY` (`constants.ts`) | `task-a.ts` lines 177 and 180 only (`isExpert3dStore`, `isCenter3dPrintStore`). `task-c.ts` imports the separate `*_TOV_TRANSLATION_OVERLAY` constants, which are **not** edited | `store-render-rules.ts` comment line 19 | `constants.spec.ts` (many pins at lines 89-402), `task-a.spec.ts` lines 40-97 |
| `NUMERIC_SOURCE_FIDELITY_RULES` (**v4: not edited, OD-20(2) confirmed 2026-10-18**; listed so a reviewer sees the three consumers that would break if it were) | master (so Task A, Task C, optimizer) | `alt-numeric-fidelity.ts` and orchestrator comments (line 364) | `constants.spec.ts` line 104, **`task-c.spec.ts` line 20** (asserts Task C carries it), `alt-numeric-fidelity.spec.ts` |
| `LEAD_IN_TEMPLATES` (`video-manifest.ts` line 107, module-private) | `leadInText` (line 117), used at line 172 by `restoreMissingVideos` (called with locale `'uk-UA'` only, orchestrator line 425) | `video-title.ts` line 24 comment | `video-manifest.spec.ts` |
| `numericFidelitySources` (`content-orchestrator.service.ts` line 374, private) | Three call sites: lines 674 (Doc `validateAltNumericFidelityDoc`), 1081 (HTML base), 1489 (HTML uk-UA) | comment at line 364 | `content-orchestrator.doc-gate.spec.ts`, `content-orchestrator.image-placeholder.spec.ts` |

Net result of the re-sweep: the only payload consumers of the master are **Task A, Task C (description) and the optimizer**. Nothing in `tools/`, `server/` or the Angular layer reads the master. The only new items relative to v1 are Task C (payload), the optimizer (payload), `test/fixtures/faq-pipeline.ts`, `task-c.faq.spec.ts`, `task-c.spec.ts`, `protected-name-precedence.spec.ts`, `structural-parity.ts` as the gate behind Task C, and the Task C digest guard.

## Hazard table (all seven checked)

| # | Hazard | Applies? | Evidence (what was searched, what was found) |
|---|---|---|---|
| 1 | `STORE_REGISTRY` fan-out | **Applies on the read side; the Story does not edit the registry** (Spec Out of scope) | `grep STORE_REGISTRY` over `src test tools server`: 41 files, of which code consumers are `src/app/app.component.ts`, `src/app/tab-descriptors.ts`, `src/prompt-core/{constants,doc-pipeline-flag,store-render-rules}.ts`, `src/utils/protected-product-name.ts`, and mentions only in comments in `src/app/components/html-editor/editor-html-pipeline.ts`, `src/prompts/task-c.ts`, `src/render/render-description.ts`, `src/utils/{language-consistency,output-validator,table-finalize}.ts`. Indirect through `getStore()`: `task-a.ts`, `task-b.ts`, `task-slug.ts`, `copywriter.ts`, `zip-generator.ts`, `tab-descriptors.ts`, `store-render-rules.ts`, `constants.ts`, and six calls in the orchestrator. (The skill's example list named `content-orchestrator.service.ts`, `task-slug.ts` and `render-description.ts` as `STORE_REGISTRY` users; the first two reach it only through `getStore()`, and the third mentions it only in a comment. This is why the list was re-derived.) The registry has **7 stores** and 10 distinct locales (`en-GB, uk-UA, ru-UA, pl-PL, de-DE, en-ES, es-ES, pt-PT, en-US, es-MX`), reducing to exactly the seven base languages FR-16 names (`uk, ru, en, pl, de, es, pt`). NFR-8 forbids a second locale list; `constants.ts:277-279` already derives `V4_HEADING_LOCALES` from the registry, which is the existing derivation point. Per-store reach: the master and the new shared block reach all 7 stores (`systemBlocks[0]`, cached); `EXPERT3D_TOV_BASE_OVERLAY` only EXPERT3D (`isExpert3dStore`, `task-a.ts` line 177); `C3D_TOV_BASE_OVERLAY` only Center 3D Print; `3DDevice`, `3DPrinter`, `3DScanner`, `Drukarka 3D`, `Expert-3DPrinter` get no overlay. Doc pipeline: 6 stores (`DOC_PIPELINE_STORES`); `Expert-3DPrinter` takes the plain-HTML path with `imageBaseUrl: ''` and an empty image block (`buildImageBlock`, `task-a.ts` line 52). The operator notes, by contrast, are store-independent (FR-24 shows them for every store; **v4:** OD-19 (2) confirms Expert-3DPrinter's plain-HTML path receives and renders them). |
| 2 | uk-UA is the master | **Applies, in the strong direction** | `generate()` builds a uk-UA master with `buildPromptA`/`buildPromptADoc(masterInput, 'Ukrainian (uk-UA)')` (orchestrator line 1038) and every other locale is a Task C translation of it; `generateUaContent` is uk-UA only (line 1452). FR-1 to FR-12, FR-20 to FR-22 and FR-26 change **Task A** (master) text, so a clean master is inherited by `en-GB, ru-UA, pl-PL, de-DE, en-ES, es-ES, pt-PT, en-US, es-MX` with no translation-prompt **file** change (`task-c.ts`, `task-translate.ts` untouched, FR-23). It is the whole-catalogue direction: all 10 locales of all 7 stores are affected through the master, not one. **v2 correction:** the translation direction is *also* reached at payload level, because `task-c.ts` `pack()` embeds the same master as `systemBlocks[0]`: every one of the 96 store x language description-translation prompts (16 store/language pairs x 6 variants) carries the new `NO PICTURE REFERENCES`, `[IMAGE HANDLING]`, `STRICT INPUT SCOPE` and liveliness text, so the master/translation boundary is not as clean as the v3 Specification's FR-23 read. **(v3) Spec v4 FR-23 now records this boundary correctly** (file level versus payload level), and FR-20 adds a self-scoping sentence meant to stop the translator applying the authoring rules (**v4:** literal `... they do not apply, and the source's sentences and their order are kept.`; the owner accepted the payload-level inheritance, Q1, and chose options 1+3 for the translator residue, Q-TRANS). Not reached: the FAQ translation variant (omits the master) and `task-translate.ts` (`buildTranslatePrompt`). The reverse risk: the picture-reference ban applies in every language (AC-5, AC-7) but only the uk phrase list is specified with real cases; the non-uk lists are unsupplied (OD-7). A translator could in principle re-introduce deixis in a non-uk language, which only the per-language detector warning would catch. |
| 3 | prompt to renderer to validator chain | **Applies: prompt and validator links are changed; schema and renderer links are not** | Prompt link: `master-system-prompt.ts`, `constants.ts`, `task-a.ts`, `task-a-doc.ts`, `vision-prepass.ts` (all changed). Schema link: `src/domain/description-doc.ts` / `*.schema.ts` — no field is added (figure `caption` and `alt` and paragraph blocks already exist; NFR-12 says the Vision JSON field set is unchanged). Renderer link: `render-description.ts` — no change; it renders model text verbatim, so deixis reaches HTML unfiltered (the Doc path does "no prose normalization", orchestrator doc comment at line 500). Validator link: `output-validator.ts` (FR-13, FR-18) plus `image-placeholder.ts` (FR-19). **Two validators exist for images**: the HTML one (`validateGeneratedHtml`) and the Doc one (`image-manifest-coverage.ts`); the Doc gate (`runDocGate`) does not call `validateGeneratedHtml` and FR-18/FR-19 are written against the HTML side. The new warning surfaces for Doc stores only via `runOutputValidation` on the finished HTML (line 2024). The Doc video sibling `validateVideoCoverageDoc` carries no "lead-in" wording and is not reached by FR-13. |
| 4 | FROZEN files | **Applies: three files** | Stated loudly at the top. `task-a.ts`, `master-system-prompt.ts`, `output-validator.ts` are in scope; `task-b.ts`, `task-c.ts` must stay untouched as files, but **`task-c.ts` output changes through the frozen master it embeds** (v2): editing the master is, in effect, a behaviour change of a second FROZEN prompt without that file's checksum moving, so the section 9 approval for the master should name Task C and the optimizer as affected consumers. `bash arch-guard.sh` re-run in this run: "ALL CHECKS PASSED", frozen files unchanged (`task-a.ts` `0421226c...`, `master-system-prompt.ts` `75eb4d0b...`, `output-validator.ts` `fba6ba28...`, `task-c.ts` `619c45a9...`). Established workaround files present in the tree: `src/prompts/task-a-doc.ts` and `src/utils/image-manifest-coverage.ts` (no `task-a-consumables-doc.ts` exists in `src/prompts` today). Whether a sibling can host FR-18 / FR-26 / FR-29 is `so-planner`'s call; FR-26 has no non-frozen route per the Specification. |
| 5 | Corpus conformance harness | **Applies: the corpus will contain exactly the phrasing the new rules ban** | `test/fixtures/corpus/` holds 2 items of the same product (Ortur H20 20 W): `expert3d-ortur-h20-20w.*` and `center-3d-print-ortur-h20-20w.*`, each a `.ctx.json` / `.doc.json` / `.uk-UA.html` triple. `test/render-reconciliation.report.md` section 5 item 2 records the gap: "Corpus is 2 items, not 6, and both are the same product". Scan of the corpus for «нижче», «на знімку», «На зображенні»: 14 matches in the EXPERT3D item (both `.doc.json` and `.uk-UA.html`), 0 in the Center 3D Print item. Both corpus files have 14 `<figure>` elements and **0 `<iframe>`**, so no video figure exists in the corpus. The harness asserts only `severity === 'error'` (`render-reconciliation.spec.ts` line 177, `render-conformance.spec.ts` line 176, `.v4.spec.ts` line 69; "Warnings are recorded in the report, not asserted"), so a new warning does not fail them. See Fixture and corpus impact. |
| 6 | The two test runners | **Applies** | See the runner paragraph above. Component runner has two files; logic runner takes the rest. `tools/measure-description.ts` is outside the vitest `include` (`src/**/*.spec.ts`, `test/**/*.spec.ts`), outside `tsconfig.json` `include` (`index.ts`, `src/**/*`, `test/**/*`) and outside the coverage `include` list, so it is neither type-checked by `npm run lint` nor measured by `npm run test:coverage`, and a test of it would have to import it from outside those include roots. `package.json` has no `tsx`, `ts-node`, `jiti` or `vite-node`; Node is v24.15.0 on this machine. **(v4, OD-9)** The owner accepted the runner as built with the condition "verify Node >= 22.18, else the D12 launcher". **The repository pins no Node version anywhere**: re-verified in this run, `package.json` has no `engines`, `volta` or `packageManager` key; there is no `.nvmrc`, `.node-version`, `.tool-versions`; there is no `.github`, GitLab or Azure CI definition and no Dockerfile in the working tree; the only Node-related files are `.npmrc` (`node-options` for fatal-error reports, which applies to every `npm run` script) and `@types/node ^22.14.0` in `devDependencies`. So the condition cannot be checked against a declared version: it can only be checked against the Node that happens to run the script (v24.15.0 here satisfies it), and a different machine can silently fall below 22.18. The `.npmrc` `node-options` are also set for the script only if it is started through `npm run`; a direct `node tools/measure-description.ts` would not carry them. Which of native stripping or the D12 launcher is used is the plan's; the verification is not performed or recorded by the Specification. New files in `src/utils/` fall in the coverage include list (`src/utils/**`), so `image-deixis.ts` is counted against the 80/80/75/80 floors; `src/app/**` and `src/services/**` are not. |
| 7 | Server-side surfaces | **Checked, does not apply** | `grep supplementalContent\|ProductInput\|operatorNotes server` finds nothing; `server/index.js:67` destructures `systemBlocks, userContent, mode, taskLabel, productName, store, lang` and the three providers pass `userContent` through (`normalizePayload`). No `server/**` file changes and no `server/usage/store.js` schema change (the `CREATE TABLE IF NOT EXISTS` no-migration limitation is not triggered). Indirect coverage that the larger `userContent` / `systemBlocks` reach unchanged: `test/llm-routes.spec.ts` and the provider specs. The call log (`server/utils/call-log.js`) does not reference `userContent` by name in this search. |

## Silent-failure risks (failures that produce no error)

1. **Warnings are never repaired.** FR-18/FR-19 emit warnings that do not enter the repair loop (`severity === 'error'` filters in
   `repair-gate.ts`). A description with deixis ships; the operator sees it only in the validation issues list or the
   measurement script. This is by design (Spec), but it means the model-side prompt change is the only prevention.
2. **Mitigation reach is narrower than measurement reach.** The Vision `description` (FR-1) and `alt` (FR-2) are consumed in exactly
   one place: `buildFigureParts` (`image-placeholder.ts` lines 154-155), i.e. figures built from `[file.jpg]` markers. Figures that
   Task A authors itself use the **English** manifest `caption` (`buildImageBlock`, `task-a.ts` line 64:
   `e.altText || e.visionDescription`), which neither FR-1 nor FR-2 edits, and a model-authored figcaption
   (master `FIGCAPTION`/`FIGURE FORMAT`, which still reads "short scannable description of what the image shows", pinned by
   `image-figure-style.prompt-examples.spec.ts`). Yet AC-11 / FR-34 require **0** deixis in every figcaption and `alt` of the live
   runs. Whether the three live runs use markers is OD-11 (inputs), which is open. **(v3) Spec v4 now states this limit itself**
   (FR-5 "Coverage of model-authored figcaptions and `alt`", FR-34 coverage note, Open questions note H): for a non-marker figure
   the FR-5 prohibition in the cached master is the only requirement that reaches figcaption and `alt`; it stands next to the
   unedited positive line "short scannable description of what the image shows" (master `FIGURE FORMAT`, pinned by
   `image-figure-style.prompt-examples.spec.ts`), and a live run with non-marker figures can fail AC-11 on figures no other FR
   addresses. Rewording `FIGURE FORMAT` is explicitly not specified. The Specification records the limit; it does not close it.
3. **`figureCaptionWarnings` sees only marker-built figures.** It is called from `image-placeholder.ts` (report building) and
   `image-placeholder-validate.ts`; it is not given a plain-HTML or Doc figure. FR-18's carrier table makes `validateGeneratedHtml`
   emit nothing for `<figcaption>`. So a pointer-style figcaption on a non-marker figure produces **no warning anywhere**; only the
   script counts it. `alt` has no warning on any path at all (Spec says so explicitly). **(v3) Spec v4 FR-5 coverage note (2) and
   (3) say the same**: a unit test shows only that the FR-5 text is present, and no warning flags a non-marker figcaption or any `alt`.
4. **Code-produced alt/caption text can itself be picture-noun text.** `ALT_PREFIX = 'Фото: '` (`image-placeholder.ts` line 104,
   applied when `alt` equals label plus description), the fallback label `Зображення товару:` (line 102), and
   `GENERIC_LABELS` (line 106). These are generated by code, not by a prompt, and FR-2 forbids an `alt` starting with «Фото» / «Зображення» only
   as a prompt instruction. Whether the FR-16 uk patterns match a leading «Фото:» or «Зображення» is not specified (see Unknowns);
   if they do, the script exits non-zero on a figure no prompt change can fix.
5. **Dormant translations of the restored-video lead-in.** `restoreMissingVideos` is called with the locale hard-coded to `'uk-UA'`
   (orchestrator line 425), so only the `uk` template runs in production today; the other six `LEAD_IN_TEMPLATES` are exercised
   only by the AC-4 test. A pointer left in `ru/pl/de/es/pt/en` would not appear in any live run.
6. **Simplified-template Doc path keeps "introduces it".** `simplified-template-blocks.ts` line 123 and the `FIGURE PLACEMENT`
   change (FR-10) apply to `TASK_A_DOC_INSTRUCTION` only. The three simplified templates replace that instruction but still get the
   new master rule; whichever text wins in the model is untested. Acceptance runs use Full description (OD-6), so simplified
   templates are unmeasured.
7. **Marker-paragraph instruction (FR-11 item 3) has no golden coverage.** `EXPERT3D_INPUT` in `test/fixtures/full-description-inputs.ts`
   contains a video `<iframe>` but **no `[file.jpg]` marker**, so `buildMarkerBlock` is never exercised by the existing byte
   goldens. A wrong edit of the marker span would change `userContent` for marker inputs with no failing test, unless the new
   fixture FR-27 requires is captured first.
8. **Cache invalidation is silent.** The master change moves `systemBlocks[0]` for all stores (NFR-1 accepts one cold start). The test
   `the two cached prefix blocks are byte-identical across every store` (task-a.spec.ts) is the guard that the shared block is
   byte-stable and not per-store; a store-dependent interpolation would pass every other test and break caching.
9. **Overlay contradiction with the master.** `EXPERT3D_TOV_BASE_OVERLAY` is appended after the master and can out-vote it (the
   precedent is the Center 3D Print collapse, `task-a.spec.ts` comment at "every store receives the section 7 flat-source grouping rule").
   Functional `<h2>` wording (FR-22) next to the master's `[HEADING FORM]` and the C3D `OVERRIDE #7` is a prompt-interaction that no
   unit test can fully pin; the `never bare noun` guard (line 122) stays dormant only while that phrase is absent (FR-22 requires its
   absence in all `systemBlocks` and `constants.ts`).
10. **Operator notes enlarge the input under a fixed output cap.** The master holds a `GLOBAL HARD CAP: 25,000 characters`; the
    `buildVideoBlock` comment documents that under that cap the model drops the element with no manifest and no count. More
    input facts per run raise that pressure; nothing detects it except the existing video/image coverage rules.
11. **A restored history entry silently re-sends the previous product's notes (decided, still silent).** `restoreHistory` (line 1024)
    sets signals for the existing fields only. **(v4)** OD-2 R1 and R2 are decided (FR-31 items 4, 5): after a restore the next click
    resends the restored notes, and restoring an entry with no notes empties the textareas. Nothing on screen distinguishes
    restored notes from typed ones, and the textareas persist across product changes in the same session (they are shared by both
    Generator modes and are not in `seo_gen_form_state`), so a stale set of notes goes to the next product's request unless the
    operator clears them: the reason FR-41 exists. History entries also exist for UA Description runs (`history.add` at orchestrator
    line 1656) but the history panel is shown only in `generator` mode (`app.component.html` line 131), so they restore into Generator
    mode.
12. **Number-fidelity asymmetry (decided, still silent).** `numericFidelitySources` (line 374) omits `supplementalContent` today
    while the `STRICT INPUT SCOPE` rule lists it as an allowed source; FR-30 adds the notes only. **(v4)** The owner confirmed this
    (OD-20(2)): `supplementalContent` is not added and the `NUMERIC_SOURCE_FIDELITY_RULES` text is not extended. A number present
    only in supplemental content fails the gate; a number present only in notes passes; and the model is told by the master that
    `[Operator Notes]` is an allowed fact source (FR-29) while the numeric rule text (per the orchestrator comment at
    lines 363-364) permits only `[Technical Specs]`, `[Raw Description]` and the image's own manifest caption. A model that follows the rule text can still drop a
    notes-only number; one that follows the master can use it and passes the gate. Nothing errors either way.
13. **Byte-identical contract degrades quietly with `{ ...input }` spreads.** The orchestrator builds `masterInput`/`uaInput` with
    `{ ...input, specs, customInstructions }` (lines 1015, 1437), so `operatorNotes` survives the spread; but a future rebuild of
    `ProductInput` field by field would drop it with no error. `buildGeneratorInput` (line 891) is such a field-by-field builder:
    forgetting to add the new key there loses the notes silently, and leaving an empty object there would break FR-27. **(v4)** The
    same shape applies to the reset: `clearAll()` and `restoreHistory()` are field-by-field lists too (new risk 20).
14. **(v2) Description translation silently inherits the new master text.** Through `task-c.ts` `pack()` every description
    translation prompt now carries the `NO PICTURE REFERENCES` block, the PLACEMENT/GROUNDING LOCK rewrite and the liveliness block
    (SCENE, RHYTHM, HONEST LIMITS, HOOK). Those rules are written for *authoring* a description. In a translation prompt they can
    push the translator to add, split, merge or delete sentences, to "delete, not reword" a pointer sentence that the uk source
    legitimately contains, or to add an opening hook. `validateStructuralParity` counts tags only (`<section>`, `<h2>`, `<h3>`,
    `<hr>`, `<figure>`, `<figcaption>`, `<table>`, `<tr>`, `<td>`, `<li>`; `COUNTED_TAGS` in `structural-parity.ts`), so a change in sentence
    count or sentence length **inside a `<p>` passes every gate** and produces no error. The risk sharpens for the existing
    catalogue and for hand-edited masters: a stored uk master written before this Story still contains «нижче» / «на знімку»
    sentences, and the new rule in the translator's system prompt tells the model to delete them while the figure-paragraph
    pairing still has to survive (`figure` and `figcaption` counts are parity-checked, the `<p>` above the figure is not).
    No unit test can show it; only a live translation comparison against the uk master could.
    **(v3, literal updated in v4) Partly mitigated, not closed:** FR-20 adds a self-scoping sentence to the shared constant
    ("These rules govern writing a new description; when the task is to translate an existing text they do not apply, and the
    source's sentences and their order are kept." Q-SCOPE dropped the word "headings"; v3 quoted the v4-Specification literal
    "sentences, headings and order"). The owner chose to keep the residue declared (Q-TRANS options 1+3: an opt-in live translation
    comparison for Creality Pika outside the gate, and a documentation-only characterization pin of the `validateStructuralParity`
    blind spot; options 2 and 4 not chosen). It is checked by presence only; the Specification declares the residue (Open questions note G; plan-review N9). Two
    consequences stay: the sentence tells a translator to keep the source's sentences, which collides with FR-5's "a sentence whose
    only job is to point at the picture is deleted, not reworded" inside the same cached block 0, so which instruction a
    translator follows on a legacy uk master containing «нижче» is untested; and the sentence is one of ~45 000 characters of block 0.
15. **(v2) The optimizer inherits the master and contradicts it.** `optimizer.ts` `buildOptimizerPrompt` embeds the same master and
    then asks (its own line 87) to re-author every figcaption "with a `<b>` lead-in distinct from the alt text" and to rewrap each
    image "per FIGURE FORMAT and PLACEMENT above". **(v4, Q-OPT answer note)** The optimizer's "lead-in" is the figcaption `<b>`
    label (the master keeps `<b>LEAD-IN LABEL:</b>` in its `FIGURE FORMAT` examples, lines 405 and 410), not a lead-in `<p>`, so the
    wording is not a request for the pointer paragraph that FR-5/FR-7 remove; v3 and v2 read it as a contradiction with the new
    master and that reading is withdrawn. What is true: the optimizer inherits PLACEMENT, so the rewrapped figures are governed by the
    new "preceding paragraph states a product fact, no pointer" text through block 0, and `TASK_OPTIMIZE_INSTRUCTION` is not edited
    by any FR (Spec FR-23 item 4, note G; the owner chose option 1, "accept as recorded"). What stays silent: (a) the optimizer
    authors a new figcaption for every image of the input, so figcaption text is model-authored for every figure (the non-marker
    exposure of risk 2, with the master `FIGURE FORMAT` line "short scannable description of what the image shows" unedited and no
    warning on any path); (b) the input is an existing description that may contain pointer sentences, and the master says to delete
    them while the optimizer's job is to restructure, not rewrite; (c) the optimizer is outside every acceptance run (OD-6), has no
    byte pin (risk 18) and Q-OPT asks only that R7a's wording be softened at the next plan touch. The self-scoping sentence covers
    "writing a new description" and "translate an existing text"; the optimizer's task, restructuring and re-authoring an existing
    description (`[INPUT HTML] — existing description to restructure and optimize`), is neither, so whether the liveliness rules
    apply to it is not determined by the sentence (Unknown 16).
16. **(v2) The Task C digest guard is a single point of pressure.** All 96 cases share one block-0 digest (`b01074fa...5433`,
    master text, 45 387 chars). The cheapest way to make the guard green again (update that one digest, or relax the comparison
    to block 0) is also the way that would stop it protecting block 1 (Task C's own instruction) and `userContent` if done
    carelessly. The guard exists to prove "description translation is unchanged" (US-8.1 AC-18); after this Story that sentence is
    only true for blocks 1 and `userContent`. Whatever is chosen has to keep those two pinned per case; this survey does not choose.
    **(v3)** This was Q1 in Spec v4 FR-23 ((a) reviewed digest-record update; (b) amended guard), left to the human at the plan
    gate, with the Specification requiring only the outcome (96 block-1 and 96 `userContent` digests unchanged, guard not weakened,
    AGENTS.md 7.7). **(v4) Answered: option (b).** The pressure moves from the fixture to the spec file: the guard's single
    `forEach` (spec lines 59-63) checks `length`, `sha256` and `cache` for every block, so (b) means splitting block 0 out of that
    loop; a careless split can also drop the block-count check (line 58) or block 0's `cache: true` flag for 96 cases with no
    failing test (new risk 21).
17. **(v2) A file-level FROZEN check hides a payload-level change.** `arch-guard.sh` hashes `task-c.ts`, which will not move, so
    arch-guard, `git diff -- src/prompts/task-c.ts` and a reviewer reading "FR-23 satisfied" all pass while the bytes sent to the
    model for every translation change. Only the Task C digest golden sees it. **(v3) The v2 sub-claim that NFR-9 omits the guard
    is withdrawn:** Spec v4 NFR-9 item 1 and FR-23 name `task-c.description-bytes.spec.ts`, so a plan that follows NFR-9 no longer
    reaches QUALITY_GATE with an unexplained red spec. What remains true is that a reviewer reading only file-level evidence (the
    FR-23 item 2 checks, `git diff`, arch-guard) cannot see the payload change; the three payload-level oracles are the Task C
    digest golden, the regenerated `full-description-prompts.json` diff and `master-system-prompt.image-markers.spec.ts` property 6.
18. **(v3) No pre-change oracle for "block 1 and `userContent` unchanged" on two payloads.** Story AC-8 and Spec v4 FR-23 items 4
    and 5 claim the optimizer's block 1 and `userContent`, and every block of the Task C FAQ variant, are unchanged. There is no
    byte golden, digest or snapshot for the optimizer (no `buildOptimizerPrompt` case in `full-description-inputs.ts`, no optimizer
    fixture in `test/fixtures/golden/`; `optimizer.spec.ts` is behavioural) and none for the FAQ variant (only the negative
    master-fragment check in `task-c.faq.spec.ts` line 82 and `faq-pipeline.ts` line 105). Their block 1 is a module-local
    constant, so an accidental edit there, or an edit to a constant they interpolate (`NO_LEAKED_REASONING_CLAUSE` for the
    optimizer; the `FAQ_*` constants for the FAQ variant), would pass every existing test. Today the claim rests on `git diff` over
    `optimizer.ts` being empty. A pre-change digest would have to be captured before the master is edited; recorded as an
    Unknown, not designed (spec-review v2 N17).
19. **(v3) Cache invalidation and prefix growth on three payload families.** Spec v4 NFR-1 accepts one cold start for Task A and
    now also for the Task C description block 0 and the optimizer block 0 (a consequence of the B1 decision). Block 0 is 45 387
    characters today and every addition (FR-5, FR-20 with the self-scoping sentence, FR-29) enlarges the cached prefix of all three
    families at once (`cache: true` on both system blocks). I found no spec that bounds the prompt size (the 25,000-character cap
    in the master is on the model's output). Nothing errors if the prefix grows; only cost and latency move.
20. **(v4) "Clear All" has two independent copies and a pin can pass on one.** `clearAll()` cases `generator` (1063-1082) and
    `ua-generator` (1084-1103) are textually identical but separate, so a reset added to one passes a manual check in that mode and
    leaves the other mode carrying the previous product's notes into the next request (FR-41 failure path; the stale notes are then
    resent, risk 11). A source-text pin that slices the whole `clearAll()` block (the pattern of the existing pin,
    `template-wiring.spec.ts` line 174) and looks for the reset anywhere in it passes with only one of the two cases edited; a pin
    has to slice each case separately. Likewise `restoreHistory()` (R2: empty the four textareas for an entry without notes) and
    `buildGeneratorInput()` (conditional key, FR-25/FR-27) are field-by-field lists with no executing test today. A form that
    restores correctly but never clears is not caught by any existing test.
21. **(v4) Q1(b) leaves the golden's block-0 record and block 0's flags unguarded unless the amended spec keeps them.**
    `task-c-description-prompts.json` keeps 96 block-0 records (`sha256 b01074fa...5433`, `length 45387`, `cache: true`) that no
    assertion reads once block 0 is compared with the live master: a fixture that quietly diverges from the code it documents.
    Block 0 compared with the live master proves "block 0 is the master", not "the master did not change unintentionally"; the
    second claim then rests on `full-description.golden.spec.ts` and the regenerated `full-description-prompts.json`, where
    block 0 of the three `c/*` cases is compared as a reviewed diff. `master-system-prompt.image-markers.spec.ts` property 6 already
    asserts the identity for one Task C case, so the amended guard adds that identity for 96 cases. Whether the `cache: true` flag
    and the block count stay pinned at index 0 per case is not stated by Spec FR-23 (it requires block 1 and `userContent` only).
22. **(v4) The master now names `[Operator Notes]` in three prompt families that carry the block in one.** FR-29 puts
    `[Operator Notes]` into the `STRICT INPUT SCOPE` bullet of the cached master, which is block 0 of Task A (where the block
    exists), of the Task C description translation and of the optimizer (where `userContent` never contains it, FR-40). No
    test fails; the translator and optimizer read a source name for a block that is not in their message. The "three input
    blocks" rewording (OD-20(1)) removes a count that would have been false for those two payloads too. With OD-19 (1b) the Doc
    instructions say nothing about the block, so for the six Doc-pipeline stores the only prompt text that names it is this
    master bullet.

## Fixture and corpus impact

**Byte goldens.**

- `test/fixtures/golden/full-description-prompts.json` (12 cases, checked by `src/prompts/full-description.golden.spec.ts`, also
  referenced by `task-a.spec.ts` and `task-a-doc.spec.ts`, built from `test/fixtures/full-description-inputs.ts`):
  - **v2, derived by hashing every block of every case** (sha256 prefix per block; block 0 of the ten master-bearing cases is
    `b01074fa9f4e`, equal to the live master hash; `translate/*` block 0 is `151c04990596`, a different text):

    | Case | Block 0 (master) | Block 1 | Overlay block | `userContent` |
    |---|---|---|---|---|
    | `doc/expert3d` | moves | moves (`TASK_A_DOC_INSTRUCTION`, FR-10) | moves (EXPERT3D overlay, FR-22) | **moves** (video block, FR-11 item 2; Tier B) |
    | `doc/expert3d+hook` | moves | moves | moves | **moves** (Tier B) |
    | `doc/c3d` | moves | moves | moves (C3D OVERRIDE #5, FR-12) | must not move (Tier A) |
    | `html/expert3d` | moves | moves (`TASK_A_INSTRUCTION`, FR-11 item 1) | moves | **moves** (Tier B) |
    | `html/legacy` | moves | moves | none | must not move (Tier A) |
    | `html/legacy+lang` | moves | moves | none | must not move (Tier A) |
    | `html/c3d+customTemplate` | moves | moves | moves | must not move (Tier A) |
    | `c/expert3d-es`, `c/eu-en`, `c/us-uk` | **moves (v2: master is block 0 of Task C)** | must not move | none (`c/*` have two blocks) | must not move |
    | `translate/uk-user`, `translate/de-internal` | must not move (no master) | n/a (one system block) | n/a | must not move |

    Totals: block 0 moves in **10 of 12** cases; block 1 in 7; overlay block in 5; `userContent` in 3 (all three carry the
    video `<iframe>`; none carries an `[IMAGE MARKERS]` block, verified by regex over the stored `userContent`). Exactly two cases
    (`translate/uk-user`, `translate/de-internal`) are unchanged end to end. v1's "5 must not move ... tripwire" is withdrawn for
    block 0 of the three `c/*` cases; for their block 1 and `userContent` it stands.
  - The regeneration precedent (US-7.1) is a reviewed diff by the builder, never `-u`; the diff for the three `c/*` cases is
    block 0 only and must be the same master delta as in the Task A cases (a mechanical cross-check).
- `test/fixtures/golden/task-c-description-prompts.json` (SHA-256 digests and lengths per block, 96 cases = 16 store/language pairs x
  6 variants, checked by `src/prompts/task-c.description-bytes.spec.ts`; its header says "Never regenerate the golden, never pass
  `-u`") **is not a tripwire that must stay green (v1 error); it fails by design (Spec NFR-9 item 1 and FR-23 say so). (v4) The
  return to green is Q1 option (b): the spec compares block 0 with the live master and keeps block 1 and `userContent` digests per
  case, so this fixture file is expected to stay byte-unchanged (its 96 block-0 records become unread; Silent-failure risk 21), in
  contrast with `full-description-prompts.json`, which is regenerated.** Verified in this run (re-hashed in v3): all 96 cases share one
  block-0 record (`sha256 b01074fa...5433`, `length 45387`, `cache: true`), identical to the live `MASTER_SYSTEM_PROMPT` hash. Block 1
  (96 per-case Task C instructions) and `userContent` digests are expected to be unaffected by every edit in the Specification:
  `task-c.ts` composes them from constants this Story does not edit, from the localized name and from the input HTML (the one
  transitive exception to watch: `SIMPLIFIED_TRANSLATION_CLAUSE` in `simplified-template-blocks.ts`, see the re-verification table).
  The spec's two premise tests (16 pairs, 96 cases) and the "covered with and without opts" test stay green; the 96 per-case tests
  fail at `systemBlocks[0]` length/digest. This is a requirement-driven change to an existing guard (AGENTS.md section 7.7: it may
  not be weakened without being named); Spec v4 names it.
- **Not covered by any existing golden** (FR-27 requires a new fixture captured before `task-a.ts` is edited): a matched
  `[file.jpg]` marker input, a video-plus-marker input, `3DDevice` (group UA, no overlay), `Drukarka 3D`, `Expert-3DPrinter` with an
  image manifest, `customInstructions` presence/absence, and `baseLanguageOverride` on the Doc path. **(v4)** Covered today:
  Expert-3DPrinter without image manifest, video or marker (`html/legacy`, `html/legacy+lang`, from `LEGACY_INPUT`); the simplified
  templates are in no golden case. No existing case, golden or corpus item carries `operatorNotes`.

**Corpus (`test/fixtures/corpus/`).**

- 2 items, same product, uk-UA only, 14 figures each, no video figure, no non-uk text. This is the section 5 item 2 gap, unchanged.
- The EXPERT3D item is an *accepted* artifact that contains 14 picture-reference sentences, so after the work it is a fixture the new
  detector should flag (a useful positive) and also a record that "accepted" no longer means "free of the banned phrasing". The
  Center 3D Print item is a clean negative for the three scanned phrases.
- The corpus must not be edited to remove the phrasing: `doc.json` and `.uk-UA.html` are reconciled pairs, and editing them
  would hide the exact regression the Story reports; any change to them is a reviewed fixture decision.
- Coverage the Story needs and the corpus lacks: (a) a video figure with the restored lead-in (Spec FR-15/FR-17 treat the video figure
  as a figure; the corpus has none); (b) any non-uk language text for the pl / de / es / pt / ru / en detector patterns; (c) a figure
  directly after a heading or another figure (the two structural metrics D-2); (d) a case with operator notes. `test/render-reconciliation.report.md`
  "To unblock" (6 products spanning 2+ stores, a consumables item, one with section 5 absent, one with section 6 absent, one with 3+ images,
  one with 3+ spec categories) is not addressed by this Story.
- `Knowledge/` (the source of `description_uk-UA.html`, `creality-pika-uk-v2.html`, `prompt-changes.spec.md`) is git-ignored
  (`.gitignore` line 27); the reference outputs are not in the repository (OD-13). The Specification calibration was done on those files.
- Other deixis carriers in `src` fixtures: `src/utils/__fixtures__/description_uk-UA.{original,corrected}.html` contain "видно на
  прикладі" in body paragraphs and are used by editor round-trip / terminology specs, not by the validator.

## Blast-radius summary

The Story is a prompt-track change that fans out wider than its track label. Text edits reach three FROZEN files (`task-a.ts`,
`master-system-prompt.ts`, `output-validator.ts`) and no approval exists, so the plan gate must carry an explicit per-file
section 9 stop and OD-12 (FR-26 depends wholly on `task-a.ts`). Because uk-UA is the Task A master and every other locale is a
translation of it, the master/Doc/Vision edits reach all 7 stores and all 10 locales while `task-c.ts` and `task-translate.ts` stay
byte-identical; the EXPERT3D overlay and the C3D override are the only store-scoped edits. The prompt, renderer and validator links
move unevenly: prompt and validator change, schema and renderer do not, and the Doc stores see the new validator warning only in the
post-hoc `runOutputValidation`. Test fallout is concentrated in two goldens: `full-description-prompts.json` (block 0 of 10 of 12 cases, block 1 of 7, the overlay block of 5, `userContent` of 3; only the two `translate/*` cases are unchanged) and the Task C digest golden `task-c-description-prompts.json` whose guard spec fails on all 96 cases at block 0 only (block 1 and `userContent` must hold; Spec NFR-9 and FR-23 name it; **v4: Q1 is answered as option (b), the guard spec is amended to compare block 0 with the live master and the JSON fixture is expected to stay unchanged**), plus the prompt- and validator-pinning specs listed above. Because the master is also the system prompt of every description translation and of the optimizer, the Story's prompt half reaches three prompt families (Task A, Task C description, optimizer), not one, even though `task-c.ts` and `task-translate.ts` are not edited; **Spec v4 FR-23 and Story v4 AC-8 now state this at file level plus payload level**, and FR-20's self-scoping sentence reaches block 0 of all three families. The translation-side effect (sentence additions or splits inside `<p>`, deletion of pointer sentences in legacy masters) stays invisible to `validateStructuralParity` and to every gate; the Specification declares it as a residual risk (note G). The "block 1 and `userContent` unchanged" claim has a pre-change oracle for the 96 Task C cases and the `translate/*` cases but **none for the optimizer or the Task C FAQ variant**. For model-authored figcaptions and `alt` on non-marker figures, FR-5 is the only prevention and no warning covers them, so AC-11 can fail on figures nothing else addresses (FR-5 coverage note). The operator-notes half is a separate vertical slice (`types.ts`, `app.component.{ts,html}`,
`task-a.ts`, `numericFidelitySources`, history, the FAQ trigger, **v4: the two `clearAll()` Generator cases (FR-41), `restoreHistory`
R2, and the measurement script as a reader of the four keys**) that interacts with the prompt half only through the
byte-identical `userContent` contract. **(v4)** It reaches the plain-HTML Expert-3DPrinter path (notes rendered, OD-19 (2)) and, by
the byte prefix, the six Doc-pipeline stores (whose instructions do not mention the block, OD-19 (1b)); it does not reach SEO, slug,
FAQ, translation or spec grounding. The numeric gate learns the notes only (OD-20). The Story does not pin a Node version for the
script (OD-9 condition against a repository with no pin) and the optimizer's "lead-in" is a figcaption label, so the optimizer risk is
inheritance of PLACEMENT and of no-pointer text, not a contradictory lead-in paragraph. The silent hazards are an acceptance test (0 deixis) that is wider than the figures the Vision
prompt changes can influence, warnings that nothing repairs, and code-authored `Фото:` / `Зображення товару:` text. The corpus
cannot confirm any of this: it is two items of one product, uk-UA only, with no video and no non-uk text, and it contains the
banned phrasing in one of its two items.

## Unknowns (not determinable from the tree, and what would resolve each)

1. **Do the three live acceptance runs use `[file.jpg]` markers?** FR-1/FR-2 reach only marker-built figures; AC-11 measures all
   figures; for non-marker figures only FR-5 applies (Spec FR-5 coverage note, FR-34 coverage note, note H). **(v4)** Partly
   settled by OD-11: six runs (3 products x 2) and at least one non-marker run, all must pass the hard criteria. Open: which
   Center 3D Print and 3DDevice products, who runs them, and how many of the six are marker versus non-marker runs.
2. **Do the uk patterns match a leading «Фото:» / «Зображення» in `alt` or in the `Зображення товару:` fallback label?** The
   Specification lists only phrase cases. Resolved by OD-7(1) (pattern precision) or a stated carve-out for code-authored text.
3. **Does a non-marker figcaption get a warning on any path?** The Specification's carrier table says no, and Spec v4 FR-5
   coverage note (3) restates it as a known, unclosed limit. The remaining question is whether that is acceptable for AC-11.
   Resolved by the human's reading of note H (accept, or add a requirement or reword `FIGURE FORMAT`, which is not specified).
4. **How `tools/measure-description.ts` is executed and tested.** **(v4)** The owner accepted the plan's runner (D12) with the
   condition "Node >= 22.18, else the D12 launcher". Not determinable from the tree: the repository pins no Node version (no
   `engines`, `.nvmrc`, CI), so the condition can only be checked against the Node that runs it (v24.15.0 here). Still unresolved:
   whether extensionless relative imports from `src/` and the `happy-dom` DOM requirement work under native type stripping (a
   run of the script is the only proof; none exists yet), and that `tools/` is outside vitest, coverage and the `tsconfig` include.
   Resolved by running the script once in the implementation stage on the target Node and recording the version.
5. **(v4; closed)** `[Operator Notes]` in the Doc instructions: no (OD-19 (1b)); Expert-3DPrinter receives the notes: yes
   (OD-19 (2)). Consequences are in "OD-19 / OD-20 consequences (v4)". What remains is only whether the six Doc-pipeline stores use
   the notes well when no Doc instruction describes them, which no test can show.
6. **(v4; closed)** History restore semantics: resend after restore and an entry without notes emptying the textareas are decided
   (OD-2 R1/R2, FR-31 items 4, 5). The residual hazard is risk 11 and risk 20.
7. **(v4; closed)** `OD-20(2)`: the `NUMERIC_SOURCE_FIDELITY_RULES` text is not extended and `supplementalContent` is not added to
   `numericFidelitySources`. The residual hazard is risk 12.
8. **Whether the seven `LEAD_IN_TEMPLATES` need an `es-MX`/`en-US`-style region split.** The lookup is by primary subtag only
   (`video-manifest.ts` line 118); no region variance exists today, so none is assumed.
9. **Whether heading wording in FR-22 collides with `heading-style.ts`.** Spec says none expected for EXPERT3D; confirm in the plan.
10. **Whether the 35-hit baseline and the 48-word hook count reproduce.** `Knowledge/` is git-ignored and not in the repository, so the
    baseline could not be re-measured in this run. OD-14.
11. **Coverage of new `src/utils/image-deixis.ts`.** It falls under the `src/utils/**` coverage include; the floors were not measured in
    this run (analysis only, no gate).
12. **(v2, updated v3, closed in v4) How the Task C digest guard is brought back to green.** Answered by the owner on 2026-10-18 as
    Q1 option (b): block 0 compared with the live `MASTER_SYSTEM_PROMPT`, block 1 and `userContent` pinned per case (Spec v5 FR-23,
    note F). No longer an unknown. What stays unspecified is only whether block 0's `cache` flag and the block count stay pinned
    per case (risk 21).
13. **(v2) Whether the new master text changes description-translation behaviour** (sentence count, hook added, pointer sentences
    deleted from legacy masters). Only a live translation compared with its uk source can show it; no unit test or gate can.
    Resolved by an opt-in live comparison or by an accepted, recorded risk. The same question for the optimizer.
14. **(v2; closed in v3)** Whether Specification FR-23 / AC-8 / NFR-9 should be reworded to say "file level" and to list the Task C
    guard. Spec v4 and Story v4 do exactly that; no longer an unknown.
15. **(v3) Whether the optimizer's block 1 and `userContent` (and every block of the Task C FAQ variant) really are unchanged.** No
    pre-change oracle exists for either (Risk 18; spec-review v2 N17 asked for one at the plan gate or at TEST_WRITING). The
    survey's reading (module-local block 1, only `NO_LEAKED_REASONING_CLAUSE` interpolated for the optimizer) says unchanged, but a
    reading is not a test. Resolved by capturing a pre-change digest of those payloads before the master is edited, or by an
    accepted `git diff`-only check; not this stage's to decide.
16. **(v3) Whether the FR-20 liveliness rules and the self-scoping sentence apply to the optimizer.** The sentence scopes the rules
    to "writing a new description" and excludes "translate an existing text"; the optimizer restructures and re-authors an
    existing description, which is a third case the sentence does not name. **(v4)** The owner answered Q-OPT "option 1" (accept as
    recorded, no `optimizer.ts` edit), so the question stays open as an accepted risk rather than as a pending decision; only an
    opt-in live optimizer run could settle it. The Specification leaves it in note G.
17. **(v4) How FR-41, FR-31 items 4/5 and FR-25's form-side clause are to be tested.** The Specification words them as behavioural
    (invoke Clear All, restore an entry, build the input, assert no `operatorNotes` key). `clearAll()`, `restoreHistory()` and
    `buildGeneratorInput()` are `AppComponent` methods, no spec instantiates `AppComponent` (the wiring spec says the plan that
    created it rejected the DI weight), and the Angular compile is absent from the logic runner. Whether a behavioural test is
    feasible without the first `AppComponent` TestBed spec, or whether source-text pins (which prove text, not behaviour) are accepted
    as the test, is not determinable from the tree. Resolved by the plan / test strategy; the choice also decides the runner.
18. **(v4) Which Node runs the measurement script on a machine other than this one.** See Unknown 4 and hazard 6; the repository
    gives no way to know. Resolved by recording the Node version in the live-run evidence.

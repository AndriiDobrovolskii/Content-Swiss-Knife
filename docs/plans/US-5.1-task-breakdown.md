---
artifact: task_breakdown
story: US-5.1
version: 8
status: ARCHIVED
owner: so-implementation-planner
created_at: 2026-10-02T20:30:00Z
updated_at: 2026-10-04T06:00:00Z
supersedes: docs/plans/US-5.1-task-breakdown.md#7
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 9
  - key: open_decisions
    version: 6
  - key: impact_analysis
    version: 3
  - key: implementation_plan
    version: 6
open_decisions_blocking: false
---

# Task breakdown: US-5.1 (replace `[file-name.ext]` markers with the matching uploaded image)

## 0. What changed from v7

v7 is superseded (plan review v7, CHANGES_REQUIRED, `changes_required_tasks`, blocking B-3 and B-4, non-blocking N-1..N-9). Plan v6,
Specification v9 (APPROVED), Open Decisions v6 and Impact Analysis v3 are unchanged inputs; no architecture decision moved.

- **B-4 fix (landing baseline), chosen option.** The stage order is HUMAN_PLAN_APPROVAL -> TEST_WRITING -> IMPLEMENTATION, so
  TEST_WRITING rewrites the untracked spec and fixture files to their v9 content **before any task runs**. A "T0 snapshots the v5
  content" option cannot work (T0 runs inside IMPLEMENTATION, after the v5 content is gone), and "withhold red hunks with
  `git add -p`" cannot work on an untracked file (no baseline to split against). So v8 drops the "land the v5 baseline, then rework
  it" two-step. Instead:
  1. **Single owner.** TEST_WRITING owns every spec and fixture edit, including the `fit-content` -> `max-content` pins, the
     caption and warning expectations, `test/fixtures/image-placeholder/fixtures.ts` and the two corpus `.uk-UA.html` token
     substitutions. The builder never edits a test or a fixture (AGENTS.md section 7.7; plan review N-2). The builder edits
     production code only, plus two mechanical generated artefacts that cannot be hand-authored: the prompt golden regenerated from
     the prompt (T11) and `.arch-guard-checksums` rebaselined (T11).
  2. **Commit what TEST_WRITING left, in the one task that turns it green.** Every untracked spec/fixture file is committed whole,
     exactly once, by the **last** task that has a case in it. Untracked files are therefore never split across tasks. A tracked file
     that several tasks touch (for example `task-a.spec.ts`) is split with `git add -p` against HEAD, which does work on tracked
     files.
  3. **Production code already in the tree is built to v9 before it is committed**, not landed as v5 first. The v5-era marker step
     modules, the orchestrator wiring and the frozen-file edits are committed only by the task that also reworks them to v9 (T9, T10,
     T11). Consequently the former landing tasks T14, T15, T16 and the T2 landing are retired (ids not reused).
  4. **How "green on the commit's exact contents" is proven** with other tasks' files still in the tree: stage by explicit path, then
     `git stash push --keep-index --include-untracked`, run lint, `npm test` (both runners), build and `bash arch-guard.sh`, then
     `git stash pop`. Only the staged tree is tested, so a later task's red spec or half-built production file never contaminates it.
- **B-3 fix (T9 could not end green).** The orchestrator spec is no longer landed before the builder switch. It is committed once, in its
  v9 form, by **T10**, in the same commit as the `numericFidelitySources` widening it needs; **T9** (builder switch and the four step
  specs) is committed before T10 and does not include that spec or the orchestrator file. T9 is green because nothing committed at
  that point asserts the old caption derivation (the old orchestrator spec is untracked and stays out of the staged tree). T10's
  acceptance lists the orchestrator spec, including the numeric-grounding case (a), by name.
- **N-1.** The dependency graph now declares every real dependency (T1 for the document types, T3 for the validators, T8 for the
  renderer extras and style, T4 for the manifest fields).
- **N-2.** See B-4 item 1; T8 and T9 no longer list spec or fixture edits as builder work.
- **N-8.** T13 step (2) carries the `<base>..HEAD` range.
- **N-3 (base branch).** Not decided; recorded as a human question below and in T0.
- OI-1..OI-9 are not decided; they are carried unchanged.

Task kinds. **land** = production code and specs already in the working tree, uncommitted, that need no rework: the task commits them
by explicit path after proving the staged tree green. **build** = new or reworked production change (T9, T10 and T11 also commit
code that exists in the tree from the v5 era, reworked). Tests named in a task are written by TEST_WRITING before the build stage;
they fail when the builder picks the task up unless the task says green-on-arrival.

Track vocabulary: `angular` (src/app, services, render, domain, utils), `server` (server/**), `prompt` (src/prompts,
src/prompt-core, prompt golden). `AGENTS.md` carries no track; T12 is assigned `prompt` by convention only.

### Human questions for the plan gate (recorded, not decided)

- **HQ-1 (N-3) base branch.** The working branch is `docs/US-4.1-archive`, HEAD `ef08509`, a commit that exists only on that docs
  branch. If the Story branch is cut from it, the Story PR carries the US-4.1 archive docs commit. Which base and branch name does the
  human want? T0 uses the branch and base the human names; absent an answer it cuts from the current HEAD and records the SHA. This
  breakdown does not choose.
- **HQ-2 harness documents.** Commit rule 3 (docs uncommitted until the delivery/archive docs commit, as for US-4.1) is stated for the
  human to confirm.

### Commit rule (AGENTS.md sections 9 and 13), binding on every task

1. One task = one commit, with `npm run lint`, `npm test` (both runners), `npm run build` and `bash arch-guard.sh` green on the
   commit's exact staged contents (proof procedure: B-4 item 4). A task whose spec files cannot all be green in its own commit is
   mis-scoped.
2. Stage by explicit path (never `git add -A` / `git add .`). The task stages exactly the files in its Files table, plus the spec
   files TEST_WRITING wrote for it. A tracked file shared with a later task is split with `git add -p`; an untracked file is staged
   whole by the last task that has a case in it (B-4 item 2).
3. Harness documents (`docs/**`, including `docs/workflow/*`, `docs/catalog/*` and every `US-5.1-*.md` artifact) are orchestrator-owned;
   no build commit stages them (see HQ-2).
4. A frozen-file edit and its `.arch-guard-checksums` row travel in the same commit (section 9). Only T11 touches a frozen file;
   `task-b.ts`, `task-c.ts`, `output-validator.ts` are in no commit.
5. Each commit's diff is checked against the **previous commit** (`git diff HEAD` before staging, `git diff --cached` at commit time).
   The Story base SHA recorded by T0 is used only by T13.
6. If a staged-tree proof fails, the task stops and reports; it does not edit tests and does not widen scope.

FROZEN: T11 is the only task that touches frozen files (`task-a.ts` and `master-system-prompt.ts`). No other task below edits one.

## Open items carried as task notes (not decided here)

| Plan item | Where it bites |
|---|---|
| OI-1 same-section lead-in vs spec Q-D/FR-19 wording | T9 (step), T13 (prompt wording test, run only); no task derives cross-section behaviour |
| OI-2 `task-a.ts` one modified template line vs spec NFR-1 "no existing line changed" | T11, T13 |
| OI-3 AGENTS.md section 4 edit needs human confirmation | T12 is conditional |
| OI-4 Vision always Ukrainian, no store parameter | T5, T10 (`cyrillicCheck` driven by master-locale constant) |
| OI-5 touching `server/providers/openai.js` | T7 |
| OI-6 operator `altText` edits have no effect on marker figures | no UI task (out of spec); T6 note |
| OI-7 only marker-derived figures are appended | T9 |
| OI-8 whole-call Vision failure -> misleading unmatched warning (spec-literal) | T4, T10 notes; no change |
| OI-9 lowercase Vision label raises frozen `lead-in-capitalization` warning (legacy path) | T5 (prompt instructs uppercase), T9 (step must not rewrite model text) |
| OI-10 OD-18, OD-20..OD-24, A-1..A-13, A-17 carried | none |
| pipeline-status v5 finding: split hook measured under path `hook` (`doc-block-repair.ts` unedited) | not in the plan; not addressed by any task; the human should know (N-9) |

## Execution order

Dependency graph (every arrow is a real compile or test dependency):

```
T0                                       (branch; precondition for every commit)
T0 -> T1 ; T0 -> T3 ; T0 -> T4 ; T0 -> T7
T4 -> T5 ; T4 -> T6
T1 -> T8                                 (renderer extras need the document carriers)
T1, T3, T4, T8 -> T9                     (step modules: document types, validators, manifest fields, renderer + style)
T1, T3, T4, T9 -> T10                    (orchestrator wiring + numeric grounding + its spec)
T4, T8, T9 -> T11                        (FROZEN task-a + master prompt; imports leaf from T9, constant from T8, fields from T4)
T8, T11 -> T12                           (conditional docs)
T0..T11 (and T12 if run) -> T13          (verification only)
```

Linear order for a single executor: T0, T4, T1, T3, T5, T6, T7, T8, T9, T10, T11, T12, T13.
Independent groups (may run in any order or in parallel once their dependencies hold): T1 and T3 and T4 and T7; then T5 and T6;
T10 and T11 (both after T9; T10 does not import the frozen prompt module's new code). T11 rewrites `.arch-guard-checksums`: no other
checksum-touching commit exists, so there is nothing to serialise it against.

Risk-first rationale: T0 is a precondition, not a risk choice (no commit has a branch without it). Among the build tasks T4 is first
because the whole Ukrainian-caption design rests on one new upstream assumption, that Vision returns three optional native-Ukrainian
fields through a tolerant parser without ever turning an old or partial reply into an `error` entry (NFR-12); it is the contract every
later task compiles against (contract before consumer), and its failure would reopen plan D5 while change is still cheap.

---

## T0 — Create the Story branch and record the base

| | |
|---|---|
| **Kind** | land (branch only; no source commit) |
| **Track** | angular (convention; no file changes) |
| **Depends on** | none |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

Record the base SHA (`git rev-parse HEAD`) in the implementation report, then create the Story branch from the base the human names
(HQ-1), carrying the working tree. If no answer is on record the branch is cut from the current HEAD (`git switch -c
feat/US-5.1-image-placeholder-substitution`) and the SHA is recorded; this task does not otherwise choose a base.

### Files

None.

### Tests to turn green

No test: this task changes no behaviour. It checks only the branch state.

### Acceptance check

`git branch --show-current` prints the new branch; `git rev-parse HEAD` equals the recorded base SHA; `git status --short` lists the
same files as before the switch (nothing lost, nothing committed).

### Notes

The merge-base with `main` is not the Story base; T13 uses the SHA recorded here. No snapshot of spec content is taken: TEST_WRITING
owns the spec and fixture files before this task runs (section 0, B-4).

## T1 — Land the hookExtra / cta.extra carriers in the document model

| | |
|---|---|
| **Kind** | land (code present, uncommitted) |
| **Track** | angular |
| **Depends on** | T0 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

Commit the existing code unchanged. `ProductDescriptionDoc` keeps the optional `hookExtra` and `cta.extra` block lists,
`forEachBlockInOrder` visits them first and last, `hookText` / `ctaText` exist, no schema version moved (plan D1; v9 does not change
this).

### Files

| File | Change |
|---|---|
| `src/domain/description-doc.ts`, `src/domain/description-doc.schema.ts` | land (exist, modified) |
| `src/domain/description-doc.hook-cta-extra.spec.ts` | land (exists, untracked; committed whole here, no later task has a case in it) |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/domain/description-doc.hook-cta-extra.spec.ts` (exists) | `test:logic` | FR-6, FR-13, NFR-8 |
| `src/domain/description-doc.spec.ts`, `src/domain/description-doc.schema.spec.ts` (existing) | `test:logic` | NFR-8 |

### Acceptance check

The specs pass on the staged tree; the commit contains exactly the three files above; `git diff --stat` shows none of
`test/fixtures/{corpus,v4-docs,simplified-docs}` changed; lint, both runners, build and `bash arch-guard.sh` are green.

### Notes

These tests are already green against the code being landed; they are not failing tests to turn green. If the staged-tree proof
fails, stop and report; do not redesign.

## T3 — Land the carrier-aware length / word-range / tov validators

| | |
|---|---|
| **Kind** | land |
| **Track** | angular |
| **Depends on** | T0 (the validators read the carriers through `hookText` / `ctaText`; T1 is needed for the staged tree to typecheck, so T1 is also a dependency) |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

Commit the existing code unchanged: `sentence-length.ts`, `simplified-word-ranges.ts`, `tov-second-person.ts` read the hook and CTA
through `hookText` / `ctaText`. `doc-block-repair.ts` stays unedited (see open items, N-9).

### Files

| File | Change |
|---|---|
| `src/utils/sentence-length.ts`, `src/utils/simplified-word-ranges.ts`, `src/utils/tov-second-person.ts` | land (exist, modified) |
| `src/utils/hook-cta-extra-validators.spec.ts` | land (exists, untracked; committed whole here) |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/hook-cta-extra-validators.spec.ts` (exists) | `test:logic` | FR-6, NFR-8 |
| `src/utils/sentence-length.spec.ts`, `simplified-word-ranges.spec.ts`, `tov-second-person.spec.ts` (existing) | `test:logic` | NFR-8 |

### Acceptance check

A split hook and split CTA validate as the unsplit text would; existing validator specs stay green; the commit holds exactly the
four paths above; lint, both runners, build, arch-guard green on the staged tree.

### Notes

Dependency declared as T1 as well as T0 (N-1): the staged tree must contain the carrier helpers.

## T4 — Extend the Vision contract and manifest entry with the three Ukrainian fields

| | |
|---|---|
| **Kind** | build |
| **Track** | angular |
| **Depends on** | T0 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

`ImageManifestEntry` gains optional `visionLabelUk?`, `visionDescriptionUk?`, `visionAltUk?` (a TypeScript interface, not Zod).
`VisionResult` gains optional trimmed `label`, `description`, `alt`; `caption` keeps its mandatory check and 20-word throw. Missing,
empty or non-string new fields are dropped and never throw. A shared constant list of the new key names is exported for the prompt
module. A pure `visionResultToEntryPatch(result)` maps a result to the three entry fields. `altText` and `visionDescription` are not
repurposed (plan D1, D5).

### Files

| File | Change |
|---|---|
| `src/utils/vision-contract.ts` | modify: `VisionResult` fields, tolerant parse, key-name constant, `visionResultToEntryPatch` |
| `src/app/types.ts` | modify: three optional fields on `ImageManifestEntry` |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/vision-contract.spec.ts` (extended by TEST_WRITING; tracked) | `test:logic` | FR-4, FR-21, NFR-3, NFR-12 (caption mandatory and 20-word throw kept; new fields tolerant; mapping helper) |

### Acceptance check

The contract spec passes on the staged tree including: a reply with only `caption` parses and yields an empty patch; a reply with a
non-string `label` parses without throw; a caption over 20 words still throws and the `/exceeds \d+ words/` retry text is unchanged.
`npm run build` type-checks every existing `ImageManifestEntry` constructor unchanged.

### Notes

OI-8: a whole-call failure still yields `status: 'error'`; nothing here changes that. The frozen `buildImageBlock` and the numeric
fidelity sources keep reading `visionDescription` / `altText`. The AC-9k sentinel case (the three fields reach no `userContent` and no
`systemBlocks[i].text`) lives in the `task-a*.spec.ts` files and is committed with T11, which owns those files' marker hunks.

## T5 — Make the Vision prompt return native Ukrainian label, description and alt

| | |
|---|---|
| **Kind** | build |
| **Track** | prompt |
| **Depends on** | T4 (shared key constant and parser) |
| **FROZEN (AGENTS.md §9)** | no (`vision-prepass.ts` is not on the FROZEN list) |

### What changes

The Vision JSON contract becomes `caption` (English, unchanged) plus `label`, `description`, `alt`, instructed to be written directly
in Ukrainian from what is visible, not translated from the caption; label short, image-specific, uppercase initial, never a generic
label; description and alt one sentence each and different from each other; the existing number rules apply to all three. No store or
locale parameter is added.

### Files

| File | Change |
|---|---|
| `src/prompts/vision-prepass.ts` | modify: prompt text and JSON example; imports the T4 key-name constant |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/vision-prepass.spec.ts` (new or extended by TEST_WRITING; name per TEST_WRITING; committed whole here if untracked) | `test:logic` | FR-21, NFR-10: the four keys, the native-Ukrainian instruction, a sample reply built from the prompt's own example round-trips through the T4 parser |

### Acceptance check

The spec passes; the prompt text contains the four keys and the not-translated-from-caption instruction; the parsed sample yields
non-empty trimmed Ukrainian fields.

### Notes

OI-4 and OI-9 are the plan's positions, not decided here. Soft word limits live in the prompt only.

## T6 — Store the three Ukrainian texts on the manifest entry in `analyzeGenImages`

| | |
|---|---|
| **Kind** | build |
| **Track** | angular |
| **Depends on** | T4 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

The success branch of `analyzeGenImages` spreads `visionResultToEntryPatch(result)` into the entry beside the unchanged
`altText: e.altText || result.caption` and `visionDescription: result.caption`. The error branch is unchanged. No signal, component,
template or RxJS change.

### Files

| File | Change |
|---|---|
| `src/app/app.component.ts` | modify: three-line patch through the T4 helper |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/vision-contract.spec.ts` (helper cases from T4) | `test:logic` | FR-21 mapping |
| `src/app/app.component.template-wiring.spec.ts`, `app.component.export-guard.spec.ts` (existing, must stay green; logic runner per plan U-14) | `test:logic` | NFR-8, no template regression |

### Acceptance check

`npm run build` and `npm run lint` are green; the diff of `app.component.ts` is the patch only (no other hunk); the two existing app
specs pass unedited.

### Notes

No test drives `analyzeGenImages` end to end and the plan names none; the helper spec is the unit-level proof. OI-6: the operator
`altText` input at `app.component.html` is not changed (out of spec).

## T7 — Raise the OpenAI vision output cap

| | |
|---|---|
| **Kind** | build |
| **Track** | server |
| **Depends on** | T0 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

`analyzeImage` in the OpenAI provider uses `max_tokens: 1000` instead of 300, so the larger Vision JSON is not truncated (NFR-12,
plan D5). No database or usage-store effect.

### Files

| File | Change |
|---|---|
| `server/providers/openai.js` | modify: the vision `max_tokens` value only |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `test/openai-provider.spec.ts` (pin 300 -> 1000, rewritten by TEST_WRITING; tracked) | `test:logic` | NFR-12 |
| `test/anthropic-provider.spec.ts`, Gemini provider specs (unchanged, re-run) | `test:logic` | NFR-12 regression |

### Acceptance check

The OpenAI provider spec asserts the new cap and passes; the Anthropic spec (cap 1000) is byte-unchanged and green.

### Notes

OI-5: touching `server/` is flagged for the human plan gate. `server/usage/store.js` is not reached.

## T8 — Land hook/CTA extras rendering and put the figure style in one shared module (`max-content`)

| | |
|---|---|
| **Kind** | build (the extras rendering and `doc-prose-transforms.ts` code is land-type: present in the tree, unchanged) |
| **Track** | angular |
| **Depends on** | T1 (carriers) |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

Two changes in one commit, because `render-description.hook-cta-extra.spec.ts` is untracked and carries the v9 `max-content` pin, so
it can be committed whole only by the task that makes that pin green (B-4 item 2; this is why the former T2 is merged here).

1. Land, unchanged: `renderDescription` emits the extras after the hook and CTA; `normalizeDocProse` maps the extras (first image
   across hook, body and CTA eager, later lazy, `decoding="async"`).
2. A new module exports `IMAGE_FIGURE_STYLE` (`display: block; width: max-content; max-width: 100%; margin: 4px auto;`),
   `IMAGE_IMG_STYLE` and `IMAGE_FIGCAPTION_STYLE` (`text-align: left;`). The Doc renderer, `wrapImageFigures` and the TipTap figure
   node import them and drop their local copies; the only literal change per surface is `fit-content` -> `max-content`. Video figure
   constants are untouched and not imported.

The two corpus `.uk-UA.html` files and every spec pin that said `fit-content` were already rewritten by TEST_WRITING (14 `width:
fit-content;` -> `width: max-content;` per corpus file, no other byte); the builder stages them and edits none of them.

### Files

| File | Change |
|---|---|
| `src/utils/image-figure-style.ts` | create |
| `src/render/render-description.ts` | modify: extras rendering (land) and import of the shared constants; video constants untouched |
| `src/render/doc-prose-transforms.ts` | land (extras mapping, unchanged) |
| `src/utils/image-figure.ts` | modify: `wrapImageFigures` style from the shared module |
| `src/app/components/html-editor/extensions/image-figure-node.ts` | modify: node default from the shared module; parsing of incoming `style` unchanged |
| Spec/fixture files staged as TEST_WRITING left them (builder does not edit): `src/render/render-description.hook-cta-extra.spec.ts` (untracked, whole), `src/utils/image-figure-style.spec.ts` (untracked, whole), `test/fixtures/corpus/center-3d-print-ortur-h20-20w.uk-UA.html`, `test/fixtures/corpus/expert3d-ortur-h20-20w.uk-UA.html`, and the tracked specs `render-description.spec.ts`, `image-figure.spec.ts`, `html-cleaner.spec.ts`, `round-trip.spec.ts`, `doc-prose-transforms.spec.ts` | stage only |

The four step specs (`image-placeholder*.spec.ts`) are **not** staged here: they are untracked and carry captions that only T9 turns
green; their `max-content` pin is committed with them in T9.

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/render/render-description.spec.ts`, `src/render/render-description.hook-cta-extra.spec.ts` | `test:logic` | FR-3, FR-13, FR-14, FR-22 |
| `src/render/doc-prose-transforms.spec.ts` | `test:logic` | FR-3, NFR-8 |
| `src/utils/image-figure.spec.ts`, `src/utils/html-cleaner.spec.ts` | `test:logic` | FR-22, AC-9 l, n |
| `src/app/components/html-editor/extensions/round-trip.spec.ts` (2 inputs; logic runner, plan U-14) | `test:logic` | AC-9 n |
| `src/utils/image-figure-style.spec.ts` (cross-surface agreement over the three production surfaces only: renderer, `wrapImageFigures`, editor node against the constant; figcaption `text-align: left`; video unchanged; no `fit-content` for an application-produced non-video figure; **contains no master-prompt case**) | `test:logic` | AC-9 g, l, n, o |
| `test/render-reconciliation.spec.ts`, `test/render-conformance*.spec.ts` (existing, independent check against the updated corpus) | `test:logic` | NFR-8 |

### Acceptance check

On the staged tree: all specs above pass with no red or skipped case; the agreement spec compares the three surfaces to
`IMAGE_FIGURE_STYLE`; first image across hook, body and CTA eager, later lazy; `git diff HEAD --stat -- test/fixtures/corpus` shows
exactly the two `.uk-UA.html` files and no `.doc.json` or `.ctx.json`; a count shows exactly 14 substitutions per file with no other
byte changed; the two `__fixtures__/description_uk-UA.*.html` files are NOT changed (plan U-15); the prompt-example agreement file
(`image-figure-style.prompt-examples.spec.ts`) is not in the commit; lint, both runners, build, arch-guard green.

### Notes

Plan U-13: `wrapImageFigures` already restyles every legacy `<img>` figure, so model-emitted legacy figures follow as a side effect;
assert application-produced figures only (A-17). If any production file other than the three named still carries a figure
`fit-content` literal, report it; the plan does not authorise further edits. If TEST_WRITING left `image-figure-style.spec.ts` with a
master-prompt case, that is a TEST_WRITING finding: the builder neither edits it nor commits a red case.

## T9 — Build the marker step modules to v9 (builder, Doc step, HTML step, finalisers, fixtures)

| | |
|---|---|
| **Kind** | build (the v5-era module files in the tree are reworked to v9 and committed once; they are never committed as v5) |
| **Track** | angular |
| **Depends on** | T1 (document types), T3 (validators the Doc step's schema path uses), T4 (manifest fields), T8 (renderer + shared style the step output goes through) |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

The leaf (`image-placeholder.ts`: matcher, pre-extraction, tracker), the Doc step, the HTML step and the finalisers are committed in
their v9 form. `buildFigureParts(entry, opts)` is the only place a marker figure's `{file, alt, captionText}` is formed: it reads the
three Ukrainian entry fields only (never `altText` or `visionDescription`), applies the FR-21 rules per field (trim, trailing-colon
collapse, Cyrillic check when `opts.cyrillicCheck`, generic-label rejection, Ukrainian fallbacks, `Фото: ` prefix when alt equals the
whole figcaption text, HTML-escaped `<b>label</b> description`). A pure `figureCaptionWarnings` yields `image-caption-not-native` and
`image-caption-duplicate-label` (Ukrainian messages, fallback label exempt); the tracker `report()` calls it over the final figure
list and carries the ordered marker-figure labels so a post-gate finaliser reuses it. English strings and `IMAGE_CAPTION_LABEL` are
removed. The Doc step, HTML step, non-hosting end-append and both finalisers all consume this one builder (OI-7). The marker
algorithm itself (hosting classes, same-section lead-in, split, duplicate removal, idempotence) is unchanged and re-verified.

### Files

| File | Change |
|---|---|
| `src/utils/image-placeholder.ts` | build to v9: builder, FR-21 rules, `figureCaptionWarnings`, tracker report, English strings removed |
| `src/utils/image-placeholder-doc.ts` | build to v9: consume the builder, labels list, `cyrillicCheck` option |
| `src/utils/image-placeholder-html.ts` | build to v9: same; `appendFigureAtEndHtml` uses the builder |
| `src/utils/image-placeholder-validate.ts` | build to v9: finalisers use the builder and `figureCaptionWarnings` over the report labels. Its orchestrator-facing exports (`preExtractPlaceholders`, `validateDroppedPlaceholders`, finalisers) keep their current names and signatures |
| Staged as TEST_WRITING left them, untracked, whole (builder edits none): `src/utils/image-placeholder.spec.ts`, `image-placeholder-doc.spec.ts`, `image-placeholder-html.spec.ts`, `image-placeholder-validate.spec.ts`, `test/fixtures/image-placeholder/` | stage only |

NOT in this commit: `src/services/content-orchestrator.service.ts` and `src/services/content-orchestrator.image-placeholder.spec.ts`
(T10); `task-a.ts`, `master-system-prompt.ts`, golden (T11).

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/utils/image-placeholder.spec.ts` | `test:logic` | FR-4, FR-9, FR-21, NFR-6, NFR-10, NFR-11, AC-9 h, i (each rule; `cyrillicCheck` off path; no English string; `altText` ignored; escaping) |
| `src/utils/image-placeholder-doc.spec.ts` | `test:logic` | FR-1, FR-3, FR-5, FR-6, FR-8, FR-11, FR-13..FR-16 (Ukrainian captions; schema re-parse; idempotence; `max-content` pin, green because T8 is committed) |
| `src/utils/image-placeholder-html.spec.ts` | `test:logic` | FR-1, FR-3, FR-5, FR-6, FR-7, FR-10, FR-11, FR-13..FR-16, FR-18 primitive |
| `src/utils/image-placeholder-validate.spec.ts` | `test:logic` | FR-17, FR-18, NFR-9 (finaliser warnings Ukrainian; duplicate-label check against report labels) |

### Acceptance check

On the staged tree (orchestrator wiring and its spec excluded, as stated above) all four specs pass; a `grep` of production
`src/utils/image-placeholder*.ts` finds no `Image:`, `Product image`, `View ` or `IMAGE_CAPTION_LABEL`; figure output over the full spec
matrix passes `ProductDescriptionDocSchema.safeParse`; re-running the step changes nothing; every previously committed spec still
passes (the committed orchestrator code does not call the step yet, so no committed spec asserts the old caption derivation); lint,
both runners and build green.

### Notes

The builder and its three consumers are one task because removing the English strings from the leaf breaks the consumers' typecheck,
so no smaller commit can be green (plan D4 item 4). The step is committed before the orchestrator wiring (T10) deliberately: the
orchestrator spec that pins numeric grounding through the new caption fields cannot be green until T10, so it is kept out of this
commit (plan review B-3). OI-1: the step keeps the same-section lead-in rule; nothing here derives cross-section behaviour. OI-9: the
step does not rewrite model text. OI-7: appended figures are marker-derived only.

## T10 — Wire v9 into the orchestrator: numeric grounding sources, step options, warnings (with its spec)

| | |
|---|---|
| **Kind** | build (the v5-era wiring in the tree is reworked to v9 and committed once) |
| **Track** | angular |
| **Depends on** | T1, T3, T4 (the new manifest fields), T9 (the step modules and builder it calls) |
| **FROZEN (AGENTS.md §9)** | no |

### What changes

The wiring present in the tree is committed with the v9 changes in the same commit (two manifests: `imgManifest` for coverage and
budgets, `markerManifest` for the step; pre-extraction; step call for the Doc and HTML paths; dropped-marker validator; finalisers;
`numericFidelitySources`; warnings merge). v9 content: `numericFidelitySources` also joins `visionLabelUk`, `visionDescriptionUk`,
`visionAltUk` of every manifest entry it is given, so a number in a Ukrainian alt or figcaption grounded only in the Ukrainian Vision
text passes `validateAltNumericFidelity` while an ungrounded one still fails (this widening is what turns the numeric-grounding case
green, including the legacy-HTML case (a) in the orchestrator spec); the step receives `cyrillicCheck` derived from the master-locale
constant (no store or locale literal); the two FR-21 warnings travel with `unmatched-image-placeholder` and
`image-placeholder-not-placed`, with the gate label as context. Warnings never trigger repair.

### Files

| File | Change |
|---|---|
| `src/services/content-orchestrator.service.ts` | build to v9: wiring plus `numericFidelitySources`, step options, warning merge; few call sites, shared helpers |
| Staged as TEST_WRITING left it, untracked, whole (builder edits none): `src/services/content-orchestrator.image-placeholder.spec.ts` | stage only |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/services/content-orchestrator.image-placeholder.spec.ts` | `test:logic` | FR-7, FR-8, FR-9, FR-11, FR-12, FR-17, FR-18, FR-21, NFR-8, NFR-9: dropped marker error and full regeneration; exhaustion yields one figure at the end and one Ukrainian warning; warnings survive block repair; schema-invalid candidate yields no spurious dropped error; legacy best-attempt report lookup; Expert-3DPrinter places a relative-`src` figure with coverage off; **legacy HTML numeric grounding (case (a): a number grounded only in the Ukrainian Vision fields appears in the placed figcaption and passes; an ungrounded one fails)**; Consumables via the shared Doc path; no-marker content unchanged |
| `src/services/content-orchestrator.service.spec.ts` and the other existing orchestrator specs | `test:logic` | no regression |

### Acceptance check

On the staged tree the whole orchestrator spec above passes including numeric-grounding case (a); the Doc numeric call and
`validateGeneratedHtml` still take `imgManifest`; `git diff HEAD` of `content-orchestrator.service.ts` shows only the wiring and the
named call sites (the wiring is new relative to HEAD, nothing else is touched); `bash arch-guard.sh` passes and
`git diff HEAD -- .arch-guard-checksums` is empty (this task moves no row); lint, both runners, build green.

### Notes

OI-8: a whole-call Vision failure still unmatches the marker with the spec-literal warning; no design change. OI-4: no store literal.
The orchestrator file is large and hot; keep to the minimum call sites. This task does not depend on T11; the service imports only
`preExtractPlaceholders` and the step modules, not the new frozen `task-a.ts` code.

## T11 — FROZEN: `task-a.ts` marker block, master-prompt FR-20 sentence and two example lines, golden, checksums

| | |
|---|---|
| **Kind** | build (the A1 edits in the tree are committed together with the A2 edit, one commit) |
| **Track** | prompt |
| **Depends on** | T4 (the AC-9k sentinel case needs the manifest fields to typecheck), T8 (the prompt-example spec imports the shared constant), T9 (`task-a.ts` imports `preExtractPlaceholders` from the leaf T9 commits) |
| **FROZEN (AGENTS.md §9)** | **yes: `src/prompts/task-a.ts` (approval A1: added import, added `buildMarkerBlock`, one template line modified, numstat 17 added / 1 deleted) and `src/prompt-core/master-system-prompt.ts` (A1: the FR-20 `[IMAGE HANDLING]` sentence, 3 lines added, none removed; A2 / H-8: exactly the two example `<figure style="...">` lines, Image #1 eager and Images #2+ lazy, identified by content, `fit-content` -> `max-content` only; recorded in `docs/workflow/history.jsonl`, A2 event 2026-10-03T18:20:00Z).** The builder cites both records in the commit message. Both frozen edits and both `.arch-guard-checksums` rows (`task-a.ts`, `master-system-prompt.ts`) go in this one commit (section 9). Any other frozen file, any changed line beyond those diffs, or any edit to `task-b.ts`, `task-c.ts`, `output-validator.ts` is a new section 9 stop: STOP, tell the user exactly what and why, wait for approval. |

### What changes

The A1 edits already in the working tree (`task-a.ts` marker block; FR-20 sentence in the master prompt) and the A2 edit (the two
example lines) are committed together, with what must move with them: the prompt golden `test/fixtures/golden/full-description-prompts.json`
regenerated **once** from the prompt (mechanical generated artefact, reviewed, not hand-edited), the fixture header note in
`test/fixtures/full-description-inputs.ts` naming both exceptions (a TEST_WRITING-owned fixture; staged as left), and
`.arch-guard-checksums` rebaselined for exactly the two rows. The golden review: 12 keys in both; exactly 10 entries differ (`doc/*`,
`html/*`, `c/*`); only `systemBlocks[0].text` differs, by exactly the FR-20 insertion plus the two token substitutions and nothing
else; `userContent` equal in all 12; the 2 `translate/*` entries byte-identical; no golden input contains a marker. If TEST_WRITING
already left an updated golden, the regenerated one must equal it byte for byte; a difference is a defect to report, not re-bless.
Throwaway scratchpad scripts do the regeneration and review and are never committed.

### Files

| File | Change |
|---|---|
| `src/prompts/task-a.ts` | FROZEN, A1: marker block (in the tree; commit as is) |
| `src/prompt-core/master-system-prompt.ts` | FROZEN, A1 (FR-20 sentence, in the tree) and A2 (the two example figure lines, token only) |
| `.arch-guard-checksums` | rebaseline the `task-a.ts` and `master-system-prompt.ts` rows, nothing else, same commit |
| `test/fixtures/golden/full-description-prompts.json` | regenerate once, reviewed |
| Staged as TEST_WRITING left them (builder edits none): `test/fixtures/full-description-inputs.ts`; tracked `src/prompts/task-a.spec.ts`, `src/prompts/task-a-doc.spec.ts` (marker cases and the AC-9k sentinel case; split with `git add -p` only if they also hold a hunk for a later task); untracked whole `src/prompts/task-a.import-cycle.spec.ts`, `src/prompt-core/master-system-prompt.image-markers.spec.ts`, `src/utils/image-figure-style.prompt-examples.spec.ts` (the two prompt-example-line cases; authored by TEST_WRITING, imports the T8 constant) | stage only |

### Tests to turn green

| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/task-a.spec.ts`, `src/prompts/task-a-doc.spec.ts` | `test:logic` | FR-19, FR-20, AC-9b, AC-9e, AC-9k (sentinel strings in the three Ukrainian fields reach no `userContent` and no `systemBlocks[i].text`; green on arrival once T4 types exist) |
| `src/prompts/task-a.import-cycle.spec.ts` | `test:logic` | import-cycle guard |
| `src/prompt-core/master-system-prompt.image-markers.spec.ts` | `test:logic` | AC-9e, FR-20; its pinned snapshot is unaffected by the two token substitutions (they sit in the example lines, not the `[IMAGE HANDLING]` rules) |
| `src/utils/image-figure-style.prompt-examples.spec.ts` (the two master-prompt example `<figure style>` lines equal `IMAGE_FIGURE_STYLE` and the figcaption style; fails until this task) | `test:logic` | AC-9 l, m |
| `src/prompts/full-description.golden.spec.ts` (existing) | `test:logic` | AC-9b, AC-9c regression |
| `src/prompt-core/master-system-prompt.spec.ts`, `src/prompts/task-c.spec.ts`, `src/prompts/optimizer.spec.ts` (existing, must stay green) | `test:logic` | static text reaches importers |

### Acceptance check

In order, each with real output recorded, all against HEAD (the previous commit): (1) `git diff HEAD --numstat` for `task-a.ts` is
17 / 1 and for `master-system-prompt.ts` is 5 / 2 (3 added for FR-20 plus the two example lines replaced; the two removed lines are
the example figure lines, each replacement differing only by the token); (2) `git diff HEAD --name-only` contains no `task-b.ts`,
`task-c.ts`, `output-validator.ts`; (3) `bash arch-guard.sh` BEFORE rebaselining flags exactly `task-a.ts` and `master-system-prompt.ts`
and no other frozen file (read `git diff`, not a bare failure, because the baseline has lagged legitimate commits before); (4)
`bash arch-guard.sh --rebaseline`, then `bash arch-guard.sh` passes and `git diff HEAD -- .arch-guard-checksums` shows exactly those two
rows moved; (5) the golden review output above is recorded for the implementation report; (6) every spec above passes on the staged
tree; lint, both runners and build green.

### Notes

OI-2: one modified template line in `task-a.ts` against spec NFR-1 "no existing line changed" is the plan's position (D3), not decided
here; A1 predates plan v6 and the human gate may re-confirm it. Second one-time prompt-cache invalidation for Task A, Task C and the
optimizer is accepted cost (plan risk 8). If the pinned "old `[IMAGE HANDLING]` snapshot" additions-only case turns out to pin the
two example lines, that is a TEST_WRITING finding to raise, not a spec for the builder to weaken (AGENTS.md section 7.7). Merging the
former landing task and the example-line task into one commit keeps a single golden regeneration and a single checksum rebaseline,
and removes any intermediate golden state that a pre-written v9 golden would leave red.

## T12 — Amend AGENTS.md section 4 `fit-content` to `max-content` (CONDITIONAL on OI-3)

| | |
|---|---|
| **Kind** | build, conditional |
| **Track** | prompt (convention only; documentation) |
| **Depends on** | T8, T11; and the human confirmation of OI-3 |
| **FROZEN (AGENTS.md §9)** | no (AGENTS.md is not on the FROZEN list) |

### What changes

The second image bullet of AGENTS.md section 4 says `max-content` where it says `fit-content`; the only sentence changed. If the human
declines OI-3, this task is dropped and the spec carries the amendment.

### Files

| File | Change |
|---|---|
| `AGENTS.md` | modify: that one token in section 4 (only after OI-3 confirmation) |

### Tests to turn green

No test: this task changes no behaviour (documentation of an already-implemented layout); the cross-surface agreement specs (T8, T11)
pin `max-content` independently.

### Acceptance check

`git diff -U0 -- AGENTS.md` shows exactly one changed line, the section 4 bullet; a search of `AGENTS.md` finds no remaining figure
`fit-content`.

### Notes

Do not execute before the OI-3 answer is on record.

## T13 — Verify the frozen footprint and the `fit-content` survivors end to end (VERIFICATION ONLY)

| | |
|---|---|
| **Kind** | verify (mechanical; no source edit, no commit) |
| **Track** | prompt |
| **Depends on** | T0..T11 (T12 only if run) |
| **FROZEN (AGENTS.md §9)** | no edit of any file. Never runs `--rebaseline`, never writes `.arch-guard-checksums`. A third differing row, or any other frozen file in the diff, is reported and the task stops. |

### What changes

Nothing is written. It proves the cumulative frozen footprint equals the two approved files and that the built `task-a.ts` delta
still matches plan D3 (OI-2 stands as the plan's position).

### Files

None.

### Tests to turn green

No unit test; AC-9f and AC-9o are mechanical (plan section 4). Existing prompt specs (`task-a.spec.ts`, `task-a-doc.spec.ts`,
`task-a.import-cycle.spec.ts`, including the "same section" wording case) must be green, run only.

### Acceptance check

Against the Story base SHA recorded by T0 (not the merge-base with `main`), each with real output recorded: (1)
`git diff --name-only <base>..HEAD` lists as FROZEN only `task-a.ts` and `master-system-prompt.ts`; `task-b.ts`, `task-c.ts`,
`output-validator.ts` absent. (2) `git diff -U0 <base>..HEAD -- src/prompts/task-a.ts`: exactly one added import, the added
`buildMarkerBlock`, one modified template line (numstat 17 / 1); `git diff -U0 <base>..HEAD -- src/prompt-core/master-system-prompt.ts`
numstat +5 / -2 with the two removed lines being the example figure lines. (3) `git diff <base>..HEAD -- .arch-guard-checksums` shows
only the `task-a.ts` and `master-system-prompt.ts` rows (both set by T11); `bash arch-guard.sh` passes. (4) A repository search for
`fit-content` leaves only the justified survivors: `description_uk-UA.original.html` / `.corrected.html` (plan U-15, 15 each,
unedited), historical docs, and AGENTS.md only if OI-3 was declined. (5) `npm run lint`, `npm test` (both runners),
`npm run test:coverage`, `npm run build` are green; `git status --short` shows no source or test file left uncommitted (only
orchestrator-owned `docs/**`).

### Notes

The human live re-run (Expert-3DPrinter inputs `..._1217` and `..._1922` against a real provider) is human evidence, not a task.
`src/utils/output-validator.ts` and the Verify-only list of plan section 3 stay unedited.

---

# Coverage

## Plan item to tasks

| Plan item | Tasks |
|---|---|
| D1 carriers (`hookExtra`, `cta.extra`, helpers, compat) | T1, T3 (land), T8 (extras rendering) |
| D1 `ImageManifestEntry` fields | T4 |
| D2 agreement chain (Vision -> manifest -> step -> schema -> renderer -> validator) | T4, T5, T6, T9, T8, T10 |
| D3 FROZEN footprint, `task-a.ts` and FR-20 sentence (A1) | T11, T13 (verify) |
| D3 master prompt two lines (A2), arch-guard per-commit rule | T11; T13 cumulative |
| D3 import-cycle guard | T11 (spec), T13 (spec run) |
| D4 builder, FR-21 rules, `figureCaptionWarnings`, step modules, finalisers | T9 |
| D5 Vision contract, mapping helper | T4 |
| D5 Vision prompt | T5 |
| D5 `app.component.ts` patch | T6 |
| D5 OpenAI cap | T7 |
| D6 shared style module, three surfaces, editor | T8 |
| D6 agreement spec (surfaces: T8; prompt example lines: T11) | T8, T11 |
| Story branch and commit rule (plan review B-2, B-4) | T0 and the commit rule |
| D6 AGENTS.md section 4 (conditional) | T12 |
| D7 orchestrator wiring, `numericFidelitySources`, `cyrillicCheck`, warnings | T10 |
| D8 prompt payload, uncached `userContent`, sentinel check (AC-9k) | T11 (case), T4 (types), T13 |
| D8 golden regeneration | T11 |
| D8 corpus token substitution (TEST_WRITING-owned fixture, staged by the builder) | T8 |
| D9 Angular/server surface (no component change; one server edit) | T6, T7 |
| Section 3 fixture and spec list (`fit-content` and English-string pins) | T8, T9, T4, T7, T11 (all authored by TEST_WRITING) |
| Section 3 verify-only files | T13 (and per-task notes) |
| Section 4 mechanical checks | T11, T13 |
| Section 4 human live evidence | no task (human action) |
| Risks 1-14 | T4/T5/T9 (1, 2, 13), T8 (3, 9), T10 (4), T7 (5), T6 note (6), T11 (7, 8), T13 (10, 11), none (12, 14 are observations) |

## FR / NFR / AC to tasks

| Requirement | Tasks |
|---|---|
| FR-1, FR-3, FR-5, FR-6, FR-10, FR-11 | T9 (with T1, T3, T8 for carriers, validators, renderer) |
| FR-2 | T9 (matcher), T4 |
| FR-4 | T4, T9 |
| FR-7, FR-8, FR-12 | T9, T10 |
| FR-9 | T9, T10 |
| FR-13, FR-14 | T8, T9 |
| FR-15, FR-16 | T9 |
| FR-17, FR-18 | T9, T10 |
| FR-19 | T11, T13 |
| FR-20 | T11, T13 |
| FR-21 | T4, T5, T6, T9, T10 |
| FR-22 | T8, T11, T12 |
| NFR-1 | T11, T13 |
| NFR-2, NFR-6, NFR-10, NFR-11 | T9, T5 |
| NFR-3, NFR-12 | T4, T7 |
| NFR-4, NFR-7 | T7 (server only; no retrieval, no secret to the bundle), T13 |
| NFR-5 | T11 |
| NFR-8 | T1, T3, T4, T8, T10 |
| NFR-9 | T9, T10 |
| AC-1..AC-6 | T9, T10 (via FR-1..FR-10, FR-17, FR-18) |
| AC-9 a-f | T11, T13 |
| AC-9 g, h, i | T9, T8 |
| AC-9 j | no change (propagation by translation; T10 spec covers) |
| AC-9 k | T11 (with T4) |
| AC-9 l, m, n, o | T8, T11, T13 |

## Reverse (task to plan item)

T0 (branch; harness precondition, no plan item), T1 (D1), T3 (D1), T4 (D1, D5, D8), T5 (D5), T6 (D5, D9), T7 (D5, D9), T8 (D1, D6, D8),
T9 (D4), T10 (D7), T11 (D3, D6, D8), T12 (D6, OI-3), T13 (D3, section 4). No task maps to nothing, and no plan item lacks a task other
than the human live-evidence line.

## Open items for the human plan gate (carried, not decided)

HQ-1 (base branch), HQ-2 (harness documents), OI-1, OI-2, OI-3, OI-4, OI-5, OI-6, OI-7, OI-8, OI-9, and the undecided split-hook finding
(N-9) as in section 0; none blocks decomposition. T12 does not run until OI-3 is answered.

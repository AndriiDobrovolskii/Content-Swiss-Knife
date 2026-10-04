---
artifact: implementation_plan
story: US-5.1
version: 6
status: ARCHIVED
owner: so-planner
created_at: 2026-10-02T20:00:00Z
updated_at: 2026-10-04T02:00:00Z
supersedes: docs/plans/US-5.1-implementation-plan.md#5
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 9
  - key: open_decisions
    version: 6
  - key: impact_analysis
    version: 3
open_decisions_blocking: false
---

# Implementation plan: US-5.1 (replace `[file-name.ext]` markers with the matching uploaded image)

v6 is a clean regeneration against Specification v9 (APPROVED), Open Decisions v6 and Impact Analysis v3. v5
consumed spec v5 / log v3 / impact v2 and is entirely superseded: nothing from it is carried over unless it is
restated below and was re-checked against the working tree (branch `docs/US-4.1-archive`, HEAD `ef08509`, with
the spec-v5-era implementation present but uncommitted). This plan decides design; it orders no work and assigns
no track (so-implementation-planner does that; the existing task breakdown is stale and is not touched here).

## 0. What changed from v5, and what the human must confirm

### 0.1 Changes from v5 (v5 statements that are now false are deleted, not layered)

| Area | v5 | v6 (reason) |
|---|---|---|
| Caption label and strings | `IMAGE_CAPTION_LABEL = 'Image:'`, `Product image: `, `View `, `alt = altText` | Removed. Label, description and alt come from the manifest entry's Ukrainian fields; Ukrainian fallbacks; `Фото: ` prefix; `altText` is not read for marker figures (FR-4, FR-21, A-14, A-16). |
| Vision / manifest | Not touched ("no `app.component.ts`/`types.ts` edit") | New upstream stage: Vision returns native Ukrainian label, description, alt into an extended `ImageManifestEntry` (FR-21, OD-25 = A). Touches `vision-prepass.ts`, `vision-contract.ts`, `types.ts`, `app.component.ts` (D5). |
| Figure layout | `fit-content` kept | `max-content` on every non-video figure the application produces (FR-22, H-8): three production constants, two FROZEN prompt example lines, AGENTS.md section 4 (D6). |
| Master prompt footprint | "pure addition, deletions = 0" | Addition (FR-20, already present) plus exactly two content-identified lines edited under the separate H-8 approval; numstat vs HEAD is +5 / -2 (D3). |
| Fixtures | "No fixture regenerated; corpus byte-identical" | The prompt golden moves a second time and both corpus `.uk-UA.html` files change (14 figure styles each); reviewed, mechanical, limited (D8, section 4). |
| Server | "Nothing under `server/**`" | One provider edit is planned: the OpenAI vision `max_tokens` (D5, OI-5). |
| Angular | "No component change" | `app.component.ts` stores the three new texts (a 3-line change through a pure helper); no new component, signal or template change (D9). |
| `numericFidelitySources` | Fed `markerManifest` | Also reads the three new Ukrainian fields, else a grounded number in a Ukrainian alt raises an unrepairable error (D7). |

### 0.2 Resolved by reading the code (impact unknowns U-12..U-16)

| Unknown | Resolution (evidence) |
|---|---|
| U-12 Vision has no store/locale input | Every `STORE_REGISTRY` store lists `uk-UA` (`constants.ts` lines 71-77); the master is hard-set to uk-UA (`mainHtmlLocale: 'uk-UA'`, orchestrator lines 761, 1244); a store without `uk-UA` (default custom `['en-GB']`) cannot generate at all (A-3). Decision: Vision is store-agnostic and always returns Ukrainian. A-15's "non-empty instead of Cyrillic" branch is implemented as an option driven by the master-locale constant, so it is testable and not dead by accident (D4). |
| U-13 legacy figure style rewrite | `produceTaskAArtifact` runs `wrapImageFigures` after every legacy generation (orchestrator line 395), and the editor's copy step runs it too (`html-editor.component.ts` line 432). So fixing `FIGURE_STYLE` in `image-figure.ts` also restyles model-emitted legacy figures. Spec A-17 stays satisfied (no new rewrite is required); the plan asserts only what A-17 claims, plus the application-produced figures. A spec owner may tighten A-17 later (non-blocking). Translations do not re-run it (orchestrator comment ~line 1060) and inherit the master's figures. |
| U-14 runner of `round-trip.spec.ts` | `vitest.config.ts` includes `src/**/*.spec.ts` and excludes only `**/*.component.spec.ts`; `angular.json` includes only that suffix. `round-trip.spec.ts`, `app.component.template-wiring.spec.ts` and `app.component.export-guard.spec.ts` do NOT end in `.component.spec.ts`, so all three run in the logic runner. The component runner needs no edit from this Story (corrects impact v3 section 1.3). |
| U-15 `__fixtures__/description_uk-UA.*.html` | Consumers: `terminology-normalize.spec.ts` (byte-for-byte `normalizeTerminology(original) == corrected`), `round-trip.spec.ts` and `beautify-round-trip.spec.ts` (structural parity). None compares `wrapImageFigures` output with them. Decision: these two fixtures are inputs and ground truth; they keep their 15 `fit-content` each and MUST NOT be edited (editing would break the terminology ground truth). Justification recorded for the AC-9 (o) grep. |
| U-16 Vision output budget | Provider caps: Anthropic 1000 with thinking off, 8000 with thinking, fails loud on truncation (`anthropic.js` 165, 182); Gemini `min(8000, model max)`, fails loud (`gemini.js` 151, `#readText`); **OpenAI `max_tokens: 300` with no truncation check** (`openai.js` 91). An English caption plus three Ukrainian texts as JSON is roughly 400-600 tokens: fine for Anthropic and Gemini, certain to truncate on OpenAI (parse throws, entry becomes `error`, markers become unmatched). Decision in D5. |

### 0.3 Items for the human plan gate (none blocks; each carries the plan's stated position)

| ID | Item | Plan position |
|---|---|---|
| OI-1 (U-11) | Spec v9 Q-D and FR-19 still say the lead-in nearest preceding paragraph may be found "even across a section boundary". The human's recorded decision (`docs/workflow/history.jsonl`, event `HUMAN_APPROVED` of 2026-10-03T15:11:24Z, Spec v5 gate, item 2) says that wording is a phrasing error: the lead-in MUST NOT cross a section boundary, and a marker with no preceding paragraph in its own section is non-hosting; "fix wording in Spec v6 or the plan". Spec v9 did not fix it and its approval event (2026-10-03T17:31:49Z) carries no comment. | Same-section rule carried (the shipped prompt text and the built step already implement it). No design here derives cross-section behaviour. Spec owner should align Q-D and FR-19; gate: confirm the plan is the authority until then. |
| OI-2 | Spec v9 NFR-1 and AC-9 (f) still read "no existing line is changed" outside the approved edits, but `task-a.ts` must change one existing line (the `userContent` template line gains `${buildMarkerBlock(input)}`); any other form breaks no-marker byte identity (AC-9 b). | Carry v5's resolution (plan v5 was approved with this footprint): allowed `task-a.ts` delta = one added import, one added function, one modified template line (D3). Gate: confirm; Spec should align NFR-1. |
| OI-3 (U-18) | AGENTS.md section 4 text update (`fit-content` -> `max-content`, second image bullet). Spec says it is not authorised until the human confirms; the spec approval had no comment, so confirmation is not on record. AGENTS.md is not on the FROZEN list, so no section 9 stop applies. | Planned as a **conditional** item (D6). Gate question: confirm the edit. If declined, the amendment lives in the spec only and a later agent following AGENTS.md alone would revert the layout (risk 9). |
| OI-4 (U-12) | Vision always Ukrainian, no store parameter. | Planner decision recorded in 0.2; gate: confirm. |
| OI-5 (U-16) | OpenAI vision cap edit in `server/providers/openai.js` was not named by the spec or impact analysis ("no server edit implied"). It is required by NFR-12 (same behaviour on every provider). | Planned (D5), plain ESM, no usage-store change. Gate: confirm that touching `server/` is accepted. |
| OI-6 (U-17) | `app.component.html` line 375 lets the operator edit `altText`; for marker figures the recorded Ukrainian alt replaces it (A-16), so the edit has no effect there and nothing says so. Not specified. | No UI change (out of spec). Recorded as risk 6. |
| OI-7 | FR-21 label/language rules concern "marker-inserted" figures; FR-4 says figures "not marker-inserted keep former caption rules". This implementation has no unmarked-image append (an unmarked image takes the coverage-repair path, unchanged, FR-8). The only appended figures are marker-derived (non-hosting marker with nothing else placing the file; FR-18 exhaustion). | Those figures go through the same Ukrainian builder and the same label warnings, so no English string can reach a figure that a marker named. Gate: confirm. |
| OI-8 | A Vision call that fails as a whole leaves the entry `status: 'error'`, which never matches (FR-2, OD-8): the marker is removed with an `unmatched-image-placeholder` warning whose text says no upload matches, although an upload exists. Spec-literal. The larger Vision output makes whole-call failure somewhat likelier on a weak provider. | No design change (spec-literal). Risk 4. |
| OI-9 | A recorded label starting with a lowercase letter triggers the frozen `lead-in-capitalization` warning on the legacy path (`output-validator.ts` 274). FR-21 does not make capitalisation a deterministic rule. | The Vision prompt instructs an uppercase initial; the step does not rewrite the model text. Warning-only. |
| OI-10 | OD-18, OD-20..OD-24 and assumptions A-1..A-13, A-17 stay as carried by the spec. | Not re-decided here. |

## 1. Approach

Four cooperating changes, one pipeline. (a) A **deterministic marker step** (already built under spec v5, reworked)
runs on the uk-UA master only, once per generation attempt, at the two shared orchestrator seams: the `produce`
closure of `runDocGate` (Doc pipeline) and `produceTaskAArtifact` (legacy HTML path). It splits paragraphs at
exact-grammar markers, inserts a figure built from the manifest entry, removes duplicates, and returns a report
carrying the warnings; a sibling validator turns a dropped marker into the repair-ladder error and, after the ladder,
a finaliser moves the image to the end with the Ukrainian warning. (b) A **new upstream Vision stage**: the existing
one-call-per-image Vision pre-pass returns, besides its English caption, a native Ukrainian label, description and
alt; they are recorded on the manifest entry, and the step reads them with fixed Ukrainian fallbacks and
Cyrillic/duplicate rules. (c) A **catalogue-wide figure layout change**: `max-content` and `text-align: left`
figcaption on every non-video figure the application produces, enforced from one shared style module on three
production surfaces, with the two FROZEN prompt examples updated to match under the H-8 approval and AGENTS.md
section 4 updated if confirmed. (d) The **prompt half** (FR-19 `[IMAGE MARKERS]` block in `userContent`, FR-20 static
master sentence) keeps the model from deleting markers; the ladder is the fallback. Translations inherit the figure
from the master's rendered output; `task-b.ts`, `task-c.ts` and `output-validator.ts` are never edited.

## 2. Design decisions

### D1. Domain model and manifest types

- `ProductDescriptionDoc` keeps the two optional carriers added under v5: `hookExtra?: ApplicationsBlock[]` and
  `cta.extra?: ApplicationsBlock[]` (the paragraph-or-figure block union), written only by the step, never described to
  the model. `hook` stays a plain string so `HOOK_INVARIANT_START` and every `doc.hook` reader stay valid.
  `forEachBlockInOrder` visits `hookExtra` first and `cta.extra` last, which feeds the figure-ref uniqueness
  superRefine and the renderer's first-eager/rest-lazy positions with no second traversal. `hookText`/`ctaText` helpers
  are used by sentence-length, simplified-word-ranges and tov-second-person so a split hook is not mis-measured.
  `normalizeDocProse` maps the extras. v9 does not change any of this; re-verify only.
- Compatibility: both fields optional on existing schema versions, so every cached `3.0`/`4.0` document and
  `test/fixtures/{corpus,v4-docs,simplified-docs}` `.doc.json`/`.ctx.json` parse unchanged (NFR-8). No schema version.
  What is NOT unchanged: the two corpus `.uk-UA.html` outputs, because FR-22 changes the renderer (D8).
- `ImageManifestEntry` (`src/app/types.ts`, a TypeScript interface, not Zod) gains three optional fields:
  `visionLabelUk?`, `visionDescriptionUk?`, `visionAltUk?`. Optional so entries created before this Story, in-memory
  fixtures and every existing constructor (`app.component.ts` line 1190) stay valid (NFR-8, NFR-12, A-16). The existing
  `visionDescription` (English caption) and `altText` are NOT repurposed: the FROZEN `buildImageBlock`, the numeric
  fidelity sources and non-marker figures still read them.

### D2. Prompt -> Vision -> manifest -> step -> schema -> renderer -> validator agreement

| Link | Change | How it stays in agreement |
|---|---|---|
| Vision prompt (`vision-prepass.ts`) | asks for `caption` (unchanged) plus `label`, `description`, `alt`, written directly in Ukrainian | The JSON keys are the keys `parseVisionResult` reads; one shared constant list of the new key names is imported by both, and a spec feeds a sample reply from the prompt's own example through the parser. |
| Contract (`vision-contract.ts`) | `VisionResult` gains optional trimmed strings; `caption` stays mandatory with its 20-word throw | Absent/blank/non-string new fields are dropped, never thrown on (NFR-12). |
| Manifest entry (`app.component.ts` via a pure helper, D5) | stores the three texts beside `visionDescription` | One helper maps `VisionResult` to the entry patch; the step reads exactly those three field names. |
| Task A prompt (FROZEN, additive) | FR-19 block in `userContent`; FR-20 sentence in `systemBlocks[0]` | The marker list comes from the same `preExtractPlaceholders` the validator uses; neither prompt nor block ever carries the new Ukrainian texts (AC-9 k). |
| Step (`image-placeholder*.ts`) | one builder produces `{file, alt, captionText}` for every marker figure | Doc step, HTML step, non-hosting end-append and both finalisers all call the same builder (D4). |
| Schema | `Figure {file, alt, caption}` unchanged; step output re-parsed in tests | `caption` holds `<b>label</b> description`; schema accepts exactly what the renderer prints. |
| Renderer / legacy normaliser / editor | one shared figure-style module (D6) | A cross-surface agreement spec compares all surfaces and the prompt examples against the one constant. |
| Validators | frozen `output-validator.ts` unedited; sibling validators for the new rules | `alt-numeric-fidelity` sees the Ukrainian text, so its sources include the new fields (D7). |

AGENTS.md section 4 criteria the output keeps satisfying, and where each is enforced:
- Figure plus figcaption; first image eager (no `loading` attribute), later lazy; `decoding="async"` on all: renderer
  `figurePositions`/`renderFigure` (Doc) and `wrapImageFigures` (legacy, step-built figures, finalisers).
- Figure style with `max-content` (amended): the shared style module consumed by renderer, `wrapImageFigures`, editor node.
- `<b>` label distinct from alt and description: the builder (FR-21 rules 1-4).
- `alt` differs from the whole figcaption text including the label: the builder (`Фото: ` rule).
- No orphan figure, lead-in `<p>` before each `<figure>`, lead-in differs from the figcaption: the step's lead-in rule (D4).
- No `<figure>` inside `<p>`: the step's split, plus the `wrapImageFigures` hoist on legacy.
- Spec count and video survival, meta/SEO rules, HTML only, `<hr>`: the step touches only marker text and the figure it inserts; video figure constants are untouched.

### D3. FROZEN files (AGENTS.md section 9): position and footprint

The plan states the position; it grants nothing. Approvals on record: (A1) `docs/workflow/history.jsonl` events
2026-10-03T09:25:44Z and 2026-10-03T09:28:48Z: additive edits to `src/prompts/task-a.ts` and
`src/prompt-core/master-system-prompt.ts`; (A2) event 2026-10-03T18:20:00Z (H-8): the two example `<figure style="...">`
lines of `master-system-prompt.ts`, identified by content. Anything else is a section 9 stop. Sibling files (not frozen)
carry all other logic; that is the established pattern here.

| File | Allowed delta | Proof (checked with `git diff -U0` against HEAD, by content, never by line number) |
|---|---|---|
| `src/prompts/task-a.ts` (A1) | one added import (`preExtractPlaceholders` from the leaf `../utils/image-placeholder`), the added module-private `buildMarkerBlock`, and ONE modified line: the `userContent` template line gains `${buildMarkerBlock(input)}` between `${buildVideoBlock(input)}` and `${template}` (OI-2). Present in the working tree (+18/-1 lines region). Nothing further. | numstat shows exactly 1 deletion; the diff hunks are only those three. A second modified line is a stop. |
| `src/prompt-core/master-system-prompt.ts` (A1 + A2) | (i) the FR-20 sentence in [IMAGE HANDLING] (3 added lines, present); (ii) the two example figure lines, Image #1 eager and Images #2+ lazy: only `width: fit-content` becomes `width: max-content` on each. The example figcaptions already carry `text-align: left`; they are not changed. | numstat vs HEAD is +5 / -2 overall; the only two removed lines are the two example `<figure style=...>` lines, and each replacement line differs from its original only by `fit-content` -> `max-content`. Edit (ii) is NOT yet done in the working tree. |
| `task-b.ts`, `task-c.ts`, `output-validator.ts` | none | `git diff --stat` empty. `output-validator.ts` has no `fit-content` literal, so FR-22 does not force an edit. |

`MASTER_SYSTEM_PROMPT` is imported by `task-a.ts`, `task-c.ts` and `optimizer.ts`: the example-line edit reaches all
three and is the second one-time prompt-cache invalidation (the FR-20 sentence was the first); cost, not error.
Import direction: `task-a.ts` imports only the leaf `image-placeholder.ts` (types-only imports), never the validate
graph; `image-placeholder-validate.ts` re-exports `preExtractPlaceholders`; a load-smoke spec guards the cycle.

Arch-guard rule: each frozen-file edit lands in a commit that also carries its own `.arch-guard-checksums` row, in
this sequence: scoped diff check; `bash arch-guard.sh` BEFORE rebaselining must flag exactly the one file and no other
frozen file (exit 1 expected); `bash arch-guard.sh --rebaseline`; `bash arch-guard.sh` again must pass and the checksum
diff shows exactly that row. The working tree's checksum file is already modified for the A1 edits; the H-8 edit moves the
`master-system-prompt.ts` row once more. A final verification step (no rebaseline) confirms the cumulative checksum diff
against the Story base shows only the `task-a.ts` and `master-system-prompt.ts` rows and that `task-b.ts`, `task-c.ts`,
`output-validator.ts` rows are untouched; a third differing row is reported and stops the work. The baseline has lagged
legitimate commits before (project memory), so the git diff, not a bare arch-guard failure, is the evidence.

### D4. The marker step and the figure builder (`src/utils/`, non-frozen)

Module layout kept from the built code: `image-placeholder.ts` (grammar, matcher, builder, tracker, messages, leaf),
`image-placeholder-doc.ts` (Doc step, end-append), `image-placeholder-html.ts` (legacy step, `appendFigureAtEndHtml`),
`image-placeholder-validate.ts` (pre-extraction re-export, `dropped-image-placeholder` validator, exhaustion finalisers).
The algorithm (hosting classes: paragraph blocks, hook, CTA text; everything else non-hosting; same-section lead-in per
OI-1; split with balanced inline tags; model-placed duplicate removed only for a hosting marker; unmatched and not-placed
warnings; idempotence because no exact-grammar marker survives a run) is unchanged by v9 and re-verified, not redesigned.

What v9 reworks is the **builder** and the **warnings**:

1. `buildFigureParts(entry, opts)` is pure and deterministic and the only place a marker figure's texts are formed. It
   reads `visionLabelUk`, `visionDescriptionUk`, `visionAltUk`; it never reads `altText` or `visionDescription` (A-16).
   `opts.cyrillicCheck` (A-15) is set by the orchestrator from the master-locale constant, so the helper holds no store or
   locale literal (NFR-6); today it is always on.
2. FR-21 rules, per field: label trimmed, trailing colon run collapsed to one colon, colon appended if absent, must contain a
   Cyrillic letter, must not equal (trimmed, colon-stripped, case-insensitive) `Image`, `Product image`, `Зображення`,
   `Зображення товару`; description and alt trimmed, non-empty, Cyrillic. A missing or empty field takes the Ukrainian fallback
   silently; a non-empty field failing the Cyrillic or generic-label test takes the same fallback and flags `notNative`.
   Fallbacks: label `Зображення товару:`; description the file name without extension, hyphens as spaces, plus a full stop;
   alt the file name without extension, hyphens as spaces. `Фото: ` is prefixed to `alt` whenever `alt` equals the whole
   figcaption text. The caption string is `<b>{label}</b> {description}`, HTML-escaped.
3. Warnings come from one pure function `figureCaptionWarnings(figuresInDocumentOrder)`: `image-caption-not-native` once per
   file whose recorded field was non-native; `image-caption-duplicate-label` for each later figure whose label equals an earlier
   one, the fallback label `Зображення товару:` exempt, text never reworded. Ukrainian messages, wording per A-14.
4. The tracker's `report()` calls it over placed figures then end-appended ones in document order, so the output is
   a function of the final figure list only (FR-11: re-running produces the same warnings, nothing accumulates across repair
   attempts because the report rides on the attempt). `PlaceholderReport` gains the ordered list of marker-figure labels so a
   post-gate finaliser, which has no tracker, runs the same function for the figure it appends and checks duplicates against
   those labels. Both finalisers and the non-hosting end-append use the same builder (OI-7); no code path builds a marker
   figure any other way.

### D5. Vision stage (new): contract, prompt, mapping, providers

- `vision-contract.ts`: `VisionResult = { caption: string; label?: string; description?: string; alt?: string }`.
  `caption` keeps its mandatory check and the 20-word throw, so the existing `/exceeds \d+ words/` one-shot retry in
  `analyzeGenImages` is unchanged. The three new fields are optional trimmed strings; anything else (missing, empty,
  non-string) is dropped and never throws, no word ceiling is enforced on them (a hard parse ceiling could discard a good
  caption for a long Ukrainian sentence). A whole-call failure stays `status: 'error'` (OI-8); a call that returns only a
  caption stays `done` and the figure takes the FR-4 fallbacks silently (FR-21 failure path).
- `vision-prepass.ts`: the JSON contract becomes `caption` (English, as today) plus `label`, `description`, `alt`. The prompt
  states that the three Ukrainian texts are written directly in Ukrainian from what is visible, not translated from the
  caption (NFR-10); label: short, image-specific, starts with an uppercase letter, ends with a colon or not, never a generic
  label; description and alt: one sentence each, and different from each other; the existing number rules apply verbatim to
  all three (a number+unit only if legible and consistent with the known specs). The signature gains no store parameter (0.2, U-12).
  Soft word limits live in the prompt only.
- `app.component.ts` `analyzeGenImages`: the success branch stores the three texts through a small pure helper in
  `vision-contract.ts` (`visionResultToEntryPatch`) so the mapping is unit-tested in the logic runner; `altText: e.altText ||
  result.caption` and `visionDescription: result.caption` are unchanged. The error branch is unchanged. No signal, component,
  template or RxJS change.
- Providers (NFR-12, U-16): Anthropic (1000 with thinking off) and Gemini (8000) keep their caps: the new JSON is well
  under them and both fail loud on truncation. `server/providers/openai.js` `analyzeImage` is raised from `max_tokens: 300` to a
  value that fits the new JSON with headroom (1000, matching the Anthropic non-thinking cap); this is a plain-ESM edit with no
  database or usage-store effect and no migration question. `test/openai-provider.spec.ts` gains a pin for the new value
  (a deliberate change of a pinned number, not a weakened assertion). `test/anthropic-provider.spec.ts` line 161 (1000) is untouched.

### D6. Figure layout, FR-22 (H-8): one source for the production surfaces

- A new tiny module `src/utils/image-figure-style.ts` exports `IMAGE_FIGURE_STYLE`
  (`display: block; width: max-content; max-width: 100%; margin: 4px auto;`), `IMAGE_IMG_STYLE` and `IMAGE_FIGCAPTION_STYLE`
  (`text-align: left;`). It is imported by the Doc renderer (`render-description.ts`, replacing its local constants), by
  `image-figure.ts` (`wrapImageFigures`) and by the TipTap `image-figure-node.ts`. Reason: impact hazard 5 (a missed constant gives
  mixed layouts and each spec pins only its own constant); three copies of one literal drift, one source cannot. The only
  literal edit per surface is `fit-content` -> `max-content`; all three figcaption constants already say `text-align: left`.
  Video figure constants (`VIDEO_FIGURE_STYLE`, `VIDEO_FIGCAPTION_STYLE`) are not touched and not imported.
- The two FROZEN prompt example lines cannot import it (a static template literal); a **cross-surface agreement spec**
  asserts that the renderer output, `wrapImageFigures` output, the editor node default and the two example figure lines
  of `MASTER_SYSTEM_PROMPT` all carry exactly `IMAGE_FIGURE_STYLE`, so the next drift fails a test.
- Legacy path (U-13): `wrapImageFigures` already rewrites the style of every `<img>` figure in the legacy HTML (it runs after the
  model and after the step; the editor copy step runs it too), so the constant change covers model-emitted legacy figures
  as a side effect. Tests assert application-produced figures only (A-17); a model-written raw figure is not asserted.
- Editor (FR-22 consequence 3, AC-9 n): `image-figure-node.ts` parses `style` from the incoming figure, so a figure in the new
  layout survives the TipTap round trip; the node default applies to hand-inserted figures and becomes the shared constant.
  `cleanHtmlStructure` ends in `wrapImageFigures`, so cleaning re-asserts the same style. Proven by tests, not assumed.
- AGENTS.md section 4 (conditional on OI-3): the second image bullet's `fit-content` becomes `max-content`, the only
  sentence changed. If the human declines, this item is dropped and the spec carries the amendment.

### D7. Orchestrator wiring (`content-orchestrator.service.ts`, one file)

Wiring built under v5 stays and is re-verified: two manifests on purpose. `imgManifest` (undefined for Expert-3DPrinter)
keeps feeding coverage, `masterImageManifest`, repair budgets and the Doc gate option, unchanged, so no coverage rule starts
firing for a store whose prompts forbid `<img>`; `markerManifest = input.imageManifest` (all stores) feeds the step, the
pre-extraction, the dropped-marker validator, the FR-18 finalisers and `numericFidelitySources`. Pre-extraction runs inside
the orchestrator from `input.description`. The report rides on the attempt (Doc) or is looked up by the shipped HTML
(`reportByHtml`, legacy), so the finaliser never acts on another attempt's state. `dropped-image-placeholder` has no strategy
and is regenerable, so it resolves to a full regeneration; it is not in `NON_REGENERABLE_RULES`. Warnings never trigger repair.

Changes for v9:
- `numericFidelitySources` also joins `visionLabelUk`, `visionDescriptionUk` and `visionAltUk` of every manifest entry it is
  given. Reason: `validateAltNumericFidelity` checks every `img[alt]` and `figcaption` against the sources and the number
  comparison ignores unit spelling; a Ukrainian alt from Vision may carry a figure that appears only in the Ukrainian text, and
  because the step places the same deterministic text on every attempt the model cannot repair the resulting
  `alt-numeric-not-grounded`. This widens sanctioned sources only to the image's own recorded Vision texts, the same
  category the function already includes.
- The step options receive `cyrillicCheck` derived from the master-locale constant (A-15), and warnings now include the two
  FR-21 rules alongside `unmatched-image-placeholder` and `image-placeholder-not-placed`.
- Warning context stays the gate label (`HTML (base)` / `HTML (uk-UA)`; FR-9). Master locale is always uk-UA today (A-13 collapses).

### D8. Prompt payload, caching, golden, corpus

- `PromptPayload` shape unchanged; `systemBlocks` stay separate from `userContent` (AGENTS.md section 3). Per-run marker data
  lives only in uncached `userContent`; the new Ukrainian texts appear in no prompt at all (AC-9 k: a spec seeds sentinel
  strings in the three fields and asserts none reaches `userContent` or any `systemBlocks[i].text`). Caching consequence: the
  H-8 edit changes `systemBlocks[0]` text for Task A (Doc and HTML), Task C and the optimizer; one-time invalidation, not
  recurring. Task B and the overlay block are byte-identical. `buildMarkerBlock` returns `''` without a matched marker, so
  `userContent` is byte-equal for every no-marker input (AC-9 b).
- Prompt golden `test/fixtures/golden/full-description-prompts.json` moves a second time. Reviewed regeneration, not a blind one:
  throwaway scratchpad scripts (never committed) regenerate it with the same builders the golden spec uses and assert against
  `git show HEAD:` that (a) 12 keys in both; (b) exactly 10 entries differ (`doc/*`, `html/*`, `c/*`); (c) in each, only
  `systemBlocks[0].text` differs, and the new text equals the old with exactly the FR-20 insertion plus exactly two
  `fit-content` -> `max-content` substitutions; (d) `userContent` equal in all 12; (e) the 2 `translate/*` entries byte-identical;
  (f) no golden input contains a marker. Output goes into the implementation report. The fixture header ("do not regenerate")
  names both approved exceptions.
- Corpus `test/fixtures/corpus/{center-3d-print,expert3d}-ortur-h20-20w.uk-UA.html`: 14 `fit-content` figure styles each.
  Updated by a mechanical token substitution (`width: fit-content;` -> `width: max-content;`) and reviewed: exactly 14
  substitutions per file and no other byte changes; not regenerated from the renderer (that could bless an unrelated
  difference). `test/render-reconciliation.spec.ts` and `render-conformance*.spec.ts`, which compare renderer output with
  these files, are the independent check. `.doc.json` and `.ctx.json` must not change. Hand-authored marker fixtures stay in
  `test/fixtures/image-placeholder/`, never in the corpus.

### D9. Angular surface and server

- Angular: no new component, signal, `OnPush` change or RxJS. `app.component.ts` changes by the three-field patch only (D5).
  Warnings, including the two new Ukrainian ones, reach the report through the existing `validationIssues()` markup
  (`app.component.html` 1238-1262), which the verification checks for verbatim display. The component runner is untouched.
- Server: one edit, `server/providers/openai.js` (D5). `server/usage/store.js` is not reached, so the no-migration limitation does not apply. Retrieval is not used (NFR-4); no secret reaches the bundle (NFR-7).

## 3. Files to create / modify (from impact v3; not re-surveyed)

Create (non-frozen): `src/utils/image-figure-style.ts`. The four `image-placeholder*.ts` modules and their specs already exist
in the working tree and are reworked.

Modify, production, non-frozen:
- `src/utils/image-placeholder.ts` - builder, FR-21 rules, `figureCaptionWarnings`, tracker report, remove English strings and `IMAGE_CAPTION_LABEL`.
- `src/utils/image-placeholder-doc.ts`, `image-placeholder-html.ts`, `image-placeholder-validate.ts` - consume the new builder; labels list; finaliser warnings; `cyrillicCheck` option.
- `src/utils/image-figure.ts` - shared style module (`max-content`).
- `src/render/render-description.ts` - shared style module; video constants untouched.
- `src/app/components/html-editor/extensions/image-figure-node.ts` - shared style module.
- `src/prompts/vision-prepass.ts`, `src/utils/vision-contract.ts` (contract and `visionResultToEntryPatch`), `src/app/types.ts`, `src/app/app.component.ts`.
- `src/services/content-orchestrator.service.ts` - `numericFidelitySources`, step options, warnings.
- `server/providers/openai.js` - vision cap.
- `AGENTS.md` - section 4 sentence, conditional on OI-3.
- Hook/CTA carrier files from v5 (`description-doc*.ts`, `doc-prose-transforms.ts`, `sentence-length.ts`, `simplified-word-ranges.ts`, `tov-second-person.ts`): built, v9 does not change them; re-verify.

Modify, FROZEN under the recorded approvals (D3): `src/prompts/task-a.ts` (present), `src/prompt-core/master-system-prompt.ts` (FR-20 present; the two example lines pending), `.arch-guard-checksums`.

Fixtures and tests that pin `fit-content` or the English strings (rewritten to the new layout / Ukrainian strings, same assertion shape, no weakening, AC-9 o): `src/render/render-description.spec.ts`, `render-description.hook-cta-extra.spec.ts`, `src/utils/image-figure.spec.ts`, `html-cleaner.spec.ts`, `image-placeholder-doc.spec.ts`, `image-placeholder-html.spec.ts`, `image-placeholder.spec.ts`, `src/services/content-orchestrator.image-placeholder.spec.ts`, `src/app/components/html-editor/extensions/round-trip.spec.ts` (2 inputs), `src/utils/vision-contract.spec.ts`, `src/prompt-core/master-system-prompt.image-markers.spec.ts` and the prompt specs, `test/fixtures/image-placeholder/fixtures.ts`, the prompt golden (D8), the two corpus HTML files (D8), `test/openai-provider.spec.ts`. Every remaining `fit-content` hit after the change must be justified; the only legitimate survivors are `description_uk-UA.original.html` / `.corrected.html` (U-15, ground-truth inputs), the historical docs, and AGENTS.md only if OI-3 is declined.

Verify, no edit expected: `output-validator.ts` (frozen), `alt-numeric-fidelity.ts`, `image-manifest-coverage.ts`, `structural-parity.ts`, `repair-gate.ts`, `repair-strategy.ts`, `html-cleaner.ts`, `llm.service.ts`, `server/index.js`, `server/providers/{anthropic,gemini}.js`, `app.component.html`.

## 4. Validation strategy (categories and runners)

All new tests run in the **logic runner** (`npm run test:logic`, vitest, happy-dom): this includes `round-trip.spec.ts`, `app.component.template-wiring.spec.ts`, `app.component.export-guard.spec.ts` and everything under `test/` (provider specs). The **component runner** (`npm run test:components`) needs no edit; it still runs in the full gate.
- Unit, builder: each FR-21 rule (Cyrillic per field, trailing-colon collapse, generic-label list, fallbacks, `Фото: `, alt vs figcaption, duplicate label, fallback label exempt), `cyrillicCheck` off path (A-15), no English string anywhere, `altText` ignored, escaping.
- Unit, step (Doc and HTML): the v5 matrix (hosting/non-hosting carriers, duplicates, multi-marker, same-section lead-in, model-figure removal, idempotence, schema re-parse, `<figure>` never in `<p>`, attributes/meta/JSON-LD untouched, relative `src`), now asserting Ukrainian captions and the FR-14 style with first image carrying no `loading` attribute.
- Vision: contract parser (caption mandatory and 20-word throw kept; new fields optional, tolerant, no throw), `visionResultToEntryPatch`, prompt contains the four keys and the native-Ukrainian instruction, sample reply round-trips through the parser, entry without the new fields does not fail generation (AC-9 k).
- Layout (FR-22, AC-9 g l m n o): cross-surface agreement spec (renderer, `wrapImageFigures`, editor node, both prompt example lines against the shared constant); no `fit-content` for a non-video figure the application produces; figcaption `text-align: left`; video figures unchanged; editor round trip and `cleanHtmlStructure` keep both styles; `master-system-prompt.ts` diff-against-HEAD check by content (+5 / -2, the two lines differ only by the token).
- Prompt (AC-9 a b c d e f): as v5 (COUNT and verbatim list only; no-marker byte equality; `systemBlocks` static; `buildPromptADoc` parity; the six FR-20 properties; frozen footprint by diff), plus sentinel check that no Ukrainian Vision text reaches any prompt, plus the "same section" wording test (OI-1), plus the import-cycle load-smoke.
- Orchestrator wiring: dropped marker raises the error and drives a full regeneration; exhaustion yields one figure at the end and one Ukrainian warning, no error left; warnings survive block repair; skipped step on a schema-invalid candidate yields no spurious dropped error; legacy best-attempt report lookup; Expert-3DPrinter with a manifest places a relative-`src` figure while coverage stays off; marker figure whose Ukrainian alt carries a number+unit grounded only in the Ukrainian Vision text passes `validateAltNumericFidelity` while an ungrounded one still fails; Consumables template through the shared Doc path; no-marker content unchanged (NFR-8).
- Providers: `openai-provider.spec.ts` pins the new vision cap; anthropic/gemini specs unchanged and re-run.
- Corpus and golden: reconciliation/conformance specs green against the token-updated corpus; golden spec green after the reviewed regeneration; the review script output recorded as evidence.
- Mechanical (not unit tests): `bash arch-guard.sh` evidence per frozen-edit commit, the footprint diffs of D3, `npm run lint`, `npm run build` (cycle guard).
- Human live evidence (not a unit test; Spec "What this Specification cannot guarantee"): re-run of the Expert-3DPrinter input `expert3d_agibot_d1_ultra_2026-10-03_1217` and of `..._1922` against a real provider, recording whether markers are kept, and whether the label, description and alt are native, image-specific and one sentence. AC-9 proves delivery of the instruction, not model compliance.

## 5. Risks (what could break, and how it would surface)

1. Vision returns nothing usable: the figure silently degrades to the generic fallback with no warning when a field is merely empty (FR-21). Surfaces as `Зображення товару:` figures in a run; the human live re-run and the contract spec watch it.
2. Cyrillic presence is a proxy: one Cyrillic letter in English text, or a Russian answer, passes. Only the live re-run catches it.
3. Mixed layouts if a `fit-content` literal is missed: removed by the shared module and the cross-surface agreement spec; the FROZEN prompt examples remain the only duplicated literal and are covered by that spec.
4. OI-8: a Vision whole-call failure (more likely with a larger output on a weak provider) makes a marker an unmatched warning with a misleading message. Surfaces as `unmatched-image-placeholder` for an uploaded file.
5. OpenAI truncation if the cap edit is not made or is too low: parse throws, entries go to `error`. Pinned by the provider spec; live per-provider Vision run recommended.
6. A-16: operator `altText` edits have no effect on marker figures and nothing says so (OI-6).
7. Golden and corpus blessing drift: addressed by the diff-against-HEAD review scripts and the 14-substitution rule; a blind regenerate would also bless a `userContent` or Task B change.
8. Second prompt-cache invalidation (Task A, Task C, optimizer): cost only.
9. AGENTS.md disagreement if OI-3 is declined: a later agent could revert to `fit-content`; the cross-surface agreement spec still pins `max-content`, so a revert fails a test.
10. Model compliance with FR-19/FR-20 is non-deterministic; dropped markers cost a ladder attempt each (budget 3 with a manifest, 2 for Expert-3DPrinter whose `imgManifest` is blanked); FR-18 end-append plus warning is the fallback.
11. Mangled marker (OQ-3 from v5, spec-literal): a re-cased marker stays as plain text next to an end-appended figure; visible as the residue plus the dropped warning.
12. Translation structural-parity churn from the split master (Task C mirrors the rendered output); surfaces as `structural-parity-*` in non-uk-UA locales.
13. A lowercase Vision label raises the frozen `lead-in-capitalization` warning on the legacy path (OI-9).
14. The orchestrator file is large and hot; wiring is kept to few call sites and shared helpers to limit merge risk.

## 6. Rejected alternatives

- Second Vision call to translate an English caption to Ukrainian: rejected, NFR-10 and the recorded rollback (translate-after-English cannot be idiomatic); doubles Vision cost.
- Replace `caption`/`visionDescription` with the Ukrainian text: rejected, the FROZEN `buildImageBlock`, non-marker figures and the numeric fidelity sources read the English fields; repurposing breaks them.
- Make the new Vision fields required (throw when absent): rejected, would turn every old entry and every partial reply into an `error` entry and unmatch its markers (NFR-12).
- Pass the store or master locale into the Vision prompt: rejected for now, the master is always uk-UA and every registry store has `uk-UA`; revisit if a store without it can ever generate (OI-4).
- Generate label/description/alt in Task A or the master prompt: rejected by OD-25 = A (text-only Task A cannot see the images) and would need a new section 9 approval.
- Leave three copies of the figure style literal and just edit each: rejected, impact hazard 5; a shared module plus an agreement spec removes the failure class.
- Regenerate the corpus HTML from the renderer: rejected, could bless an unrelated rendering difference; a token substitution with a counted diff cannot.
- Add a deterministic rewrite of model-emitted figures beyond `wrapImageFigures`: not needed (U-13) and outside A-17.
- Exempt marker figures from `validateAltNumericFidelity`: rejected, weakens a grounding gate; widening the source list is the rule the gate already states.
- Raise the Anthropic non-thinking vision cap too: rejected, the new JSON fits under 1000 and truncation there is loud; avoids churning a pinned spec.
- Defer the arch-guard rebaseline to a final step: rejected, AGENTS.md section 9 requires the row in the same commit and later commits would be red.
- Put the marker list in a system block, add a sibling prompt module, or reword the Expert-3DPrinter rule line: rejected (caching, reach of `buildPromptA`/`buildPromptADoc`, non-additive).
- Do the substitution on rendered HTML for the Doc path, or per locale after Task C: rejected (coverage reads `doc.figures`; OD-12).
- A new schema version for the hook/CTA extension: rejected, optional fields keep every cached document valid.

## 7. Traceability

| Requirement | Design decision / files |
|---|---|
| FR-1, FR-10 | D4 grammar and text-carrier-only walk (unchanged) |
| FR-2 | D4 matcher; D5 (`error` entry never matches; OI-8) |
| FR-3, FR-5, FR-6 | D4 step algorithm, hosting classes, same-section lead-in (OI-1), D1 carriers |
| FR-4 | D4 builder items 1-2; D1 manifest fields; D5 |
| FR-7 | D4 HTML step; D7 `markerManifest` and relative `src` for Expert-3DPrinter |
| FR-8 | D7 (step runs before coverage); OI-7 (only marker-derived figures are appended) |
| FR-9 | D4 warnings; D7 context labels |
| FR-11 | D4 item 4 (report a function of the final list; rides on the attempt) |
| FR-12 | D2, D7 shared seams, Task C inheritance, Consumables via the shared Doc path |
| FR-13, FR-14 | D2 criteria table; D6 shared style, first image without `loading` |
| FR-15, FR-16 | D2 (step touches only marker text; video constants untouched) |
| FR-17, FR-18 | D4 validate/finalisers (builder reused, warnings via `figureCaptionWarnings`); D7 ladder |
| FR-19 | D3 `buildMarkerBlock` footprint; D8 uncached `userContent`; OI-1, OI-2 |
| FR-20 | D3 master sentence and the H-8 lines; D8 golden and cache |
| FR-21 | D4 builder and warnings; D5 Vision stage; D7 `numericFidelitySources` |
| FR-22 | D6 (shared module, three surfaces, prompt lines, editor, AGENTS.md conditional); D8 corpus and golden; U-13 |
| NFR-1 | D3 footprint table and arch-guard rule |
| NFR-2 | D4 (pure builder, no model call at substitution) |
| NFR-3, NFR-12 | D5 (optional fields, tolerant parse, OpenAI cap) |
| NFR-4, NFR-7 | D9 |
| NFR-5 | D8 |
| NFR-6 | D4 item 1 (`cyrillicCheck` from the master constant; no store/locale literal) |
| NFR-8 | D1 (optional fields), D8 (`''` marker block) |
| NFR-9 | D4/D7 (warnings never trigger repair; dropped error becomes a warning after the ladder) |
| NFR-10, NFR-11 | D5 (native Ukrainian in one Vision call), D4 (Ukrainian fallbacks and messages only) |
| AC-1..AC-6 | via FR-1..FR-10 above |
| AC-9 a-f | D3, D8, section 4 prompt tests |
| AC-9 g h i | D4 builder and warnings; D6 style |
| AC-9 j | D2 (propagation by translation, no change) |
| AC-9 k | D5, D8 sentinel check |
| AC-9 l m n o | D6, D3 (+5 / -2 by content), D8, section 3 fixture list |

---
artifact: task_breakdown
story: US-2.2
version: 2
status: APPROVED
owner: so-implementation-planner
created_at: 2026-09-21T17:30:00Z
updated_at: 2026-09-21T19:30:00Z
supersedes: docs/plans/US-2.2-task-breakdown.md@v1
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 1
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 2
open_decisions_blocking: false
---

# Task Breakdown — US-2.2: Simplified v4 content-template schemas and Content Template dropdown

## Revision notes (v2)

Aligns the breakdown with implementation_plan v2 (resolves PLAN_REVIEW v1 B1, B2, N1..N4, N7). Task ids T1..T17 are kept stable; one task is added (`T6a`).

- **B1**: T14 now creates `src/app/content-template-labels.ts` plus `src/app/content-template-labels.spec.ts` (`test:logic`); the old `src/app/ui-labels.spec.ts` is dropped.
- **B2 / D4b**: new `T6a` creates `src/utils/simplified-specs-shape.ts` and its spec. T5 adds the Doc-path rule `simplified-specs-shape` to `validateTemplateCompleteness`. T6 adds `validateSimplifiedTemplateHtml` (range + shape composition). T10 makes the frozen `output-validator.ts` call `validateSimplifiedTemplateHtml`. T4 pins `flatSpecs` behaviour with several categories. T7 documents the collapse-skip / exactly-one-category split. T12 wires the Doc gate.
- **N1**: T3, T5 and T12 are declared one merge unit.
- **N2**: absent-paragraph walker specs are mandatory per file in T3 (a missing case = task incomplete).
- **N3**: T14 now depends on T9 (and is no longer "independent"); `CONTENT_TEMPLATES` and label removal land after the frozen prompt edits.
- **N4**: T11 states its interim behaviour.
- **N7**: R6 (FAQ artifact step unchanged) is carried as a note for HUMAN_PLAN_APPROVAL; no task.

Conventions. Test file paths are the ones `TEST_WRITING` is expected to create (specs sit beside their source under `src/`, per repo convention); they exist and fail before the task starts, except where a task says its tests are regression guards. Runners: `test:logic` = `vitest run` (matches `src/**/*.spec.ts` except `*.component.spec.ts`), `test:components` = `ng test`. Every task ends in one commit with lint, both runners and build green (AGENTS.md §13). Where a task deletes or rewrites a pre-existing consumables test, that is authorised by OD-14 and is not weakening; every other consumables-mentioning test is rewritten to the new behaviour, never skipped (§7.7).

## Execution order

`T1 → T2 → T3 → {T4, T5, T6a, T7 parallel} → T6 → T8 → T9 → T10 → T11 → T12 → T13 → T14 → T15 → T16 → T17`

Constraints beyond the arrows:
- **Merge unit A = T3 + T5 + T12.** Schema widening (T3), completeness gate (T5) and gate wiring (T12) must be merged/shipped together; none ships alone (a Full description missing §3/§9 would otherwise validate). The window between them on the feature branch is accepted, but the PR must contain all three.
- T14 (dropdown, `CONTENT_TEMPLATES`, label removal) must land after T9 (frozen `task-a.ts` still reads `CONTENT_TEMPLATES` until its edit lands) and before T15.
- T4, T5, T6a, T7 are independent of each other (need only T1/T3). T6 needs T6a. T10 needs T6 and is independent of T8/T9. T16 needs only T11 and may run any time after it.

| Group | Tasks | Independent of each other |
|---|---|---|
| Foundation | T1, T2, T3 | no (sequential) |
| Domain consumers | T4, T5, T6a, T7 | yes |
| Validators | T6 (after T6a), T10 | T10 needs T6; independent of T8/T9 |
| Prompts | T8, T9 | T8 then T9 |
| Consumables removal + wiring | T11, T12, T13 | sequential |
| UI | T14 | after T9 |
| Pins and re-baseline | T15, T16, T17 | T15 then T17; T16 after T11 |

Risk-first rationale: T1 comes first because the whole plan rests on one registry that every link reads, and it lands with the pre-edit golden-byte guards (FR-6, R1) already green, so any later accidental change to the Full description path fails a test immediately, while changing course is still cheap.

Goldens: `TEST_WRITING` must capture the Full-description goldens (`buildPromptADoc`, `buildPromptA`, `buildTranslatePrompt`, `buildPromptC`) from the tree BEFORE any edit. They pass at T1 and must stay green at every later task.

For HUMAN_PLAN_APPROVAL (N7): plan risk R6 (FAQ artifact step still runs for simplified templates) is to be surfaced as a possible new Open Decision. No task changes FAQ artifact behaviour.

---

## T1 — Create the simplified-template registry module

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | none |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
Adds the pure, dependency-free registry: the three template ids, `isSimplifiedTemplateId` (unknown or stale ids are false), `paragraphsFor` with the Accessories functionality flag and the §5/§7 data-conditional markers, `V4_WORD_RANGES`, `NARRATIVE_SOFT_CEILING = 5500` and the shared `countWords`. Nothing consumes it yet.

### Files
| File | Change |
|---|---|
| `src/prompt-core/simplified-templates.ts` | create |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/simplified-templates.spec.ts` | `test:logic` | FR-3, FR-4, FR-5, FR-9, FR-13, FR-15 (table values), stale id false (D14) |
| Full-description golden specs (`src/prompts/*.golden.spec.ts`, pre-edit captures) | `test:logic` | FR-6, NFR-6; regression guards, already green, must stay green |

### Acceptance check
`vitest run` shows the registry spec passing; paragraph sets equal Filaments 1,2,4,5,7,8, Accessories 1,2,5,7,8 (+3 only with flag), Spare parts 1,5,8; `isSimplifiedTemplateId('consumables-resin')` and `undefined` are false; the module has no imports from `src/app`.

### Notes
No imports at all, so frozen files may import it later without new dependency edges (Rule 2 and arch-guard).

---

## T2 — Add optional `includeFunctionality` to `ProductInput`

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T1 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
Adds `includeFunctionality?: boolean` to `ProductInput` so the prompt builders in T8/T9 compile against a real contract (contract before consumer). No behaviour changes; no consumer reads it yet.

### Files
| File | Change |
|---|---|
| `src/app/types.ts` | modify: add the optional field only (do not touch `CONTENT_TEMPLATES` here; T14 owns that) |

### Tests to turn green
no test — this task changes no behaviour: it is an optional type field with no reader; `npm run lint` and `npm run build` prove it compiles, and T8 and T14 tests exercise it.

### Acceptance check
`npm run build` and `npm run lint` are green with the field present and unused.

### Notes
Builders must honour it only when `templateId === 'accessories'` (silent risk 9); that logic is T8/T9, not here.

---

## T3 — Make v4 paragraphs optional in the domain schema and make every reader null-safe

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T1 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
`hook` and `cta` stay required; `killerSpecs`, `keyBenefits`, `functionality`, `applications`, `specs`, `faq` become optional (null accepted where the existing convention accepts it), bounds still apply when present. `ProductDescriptionDoc` is made optional in lockstep, every `superRefine` early-returns on absent fields, and every reader of Doc fields is made null-safe so lint and build stay green in the same commit. The renderer skips absent paragraphs without markup or throw.

### Files
| File | Change |
|---|---|
| `src/domain/description-doc.schema.ts` | modify: optional fields, guarded `superRefine` |
| `src/domain/description-doc.ts` | modify: TS type optional in lockstep |
| `src/render/render-description.ts` | modify: skip absent paragraphs, any combination, incl. §1/§8-only |
| `src/render/doc-schema-issues.ts` | modify: null-safe; remove consumables mention (L189) |
| `src/render/doc-prose-transforms.ts` | modify: null-safe |
| `src/utils/doc-block-repair.ts`, `doc-tier.ts`, `heading-style.ts`, `sentence-length.ts`, `tov-second-person.ts`, `bullet-lead-punctuation.ts`, `alt-numeric-fidelity.ts`, `video-manifest.ts`, `specs-grounding.ts` | modify: null-safe walkers (exact paths per impact analysis) |
| `src/utils/repair-strategy.ts` | modify: null-safe; remove L328 consumables mention |
| `test/fixtures/v4-docs.ts` | modify: add simplified-shape builders (new factory functions; existing fixtures untouched) |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/domain/description-doc.schema.spec.ts` | `test:logic` | FR-17: omit/null each optional paragraph, reject missing §1 or §8, bounds when present, Full docs and both corpus fixtures still parse |
| `src/render/render-description.spec.ts` | `test:logic` | FR-18: every absent-paragraph combination no throw, no stray markup |
| **Mandatory, one per file:** an absent-paragraph case in each of `doc-block-repair.spec.ts`, `doc-tier.spec.ts`, `heading-style.spec.ts`, `sentence-length.spec.ts`, `tov-second-person.spec.ts`, `bullet-lead-punctuation.spec.ts`, `alt-numeric-fidelity.spec.ts`, `video-manifest.spec.ts`, `specs-grounding.spec.ts`, `doc-prose-transforms.spec.ts` (and `repair-strategy.spec.ts`, `doc-schema-issues.spec.ts` where they read Doc fields) | `test:logic` | FR-18 runtime null-safety; a walker file whose spec lacks the case means the task is not done (lint alone does not prove runtime behaviour) |
| `test/render-reconciliation.spec.ts`, `test/render-conformance.spec.ts`, `test/render-conformance.v4.spec.ts` | `test:logic` | corpus byte-stable; regression guards |

### Acceptance check
`npm run lint` reports no non-null-safe consumer; schema spec passes; every listed walker spec has and passes its absent-paragraph case; reconciliation output for the two corpus items is byte-identical to before.

### Notes
Intentionally one wide commit: making the type optional breaks every reader at once. **Part of merge unit A (T3 + T5 + T12)**: alone this task lets a Full response without §3/§9 validate; the completeness gate (T5) and its wiring (T12) close that (R2). Do not regenerate any accepted artifact fixture.

---

## T4 — Render §7 as a flat single-tbody table under `flatSpecs`

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T3 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
`renderDescription` gains an optional third argument `opts?: { flatSpecs?: boolean }`. When set, the single category renders in one `<tbody>` with no `<h3>` and no category title row; when unset (Full) output is byte-identical to today. With several categories under `flatSpecs` the output is total and lossless (D4): rows of all categories concatenated in order into the one `<tbody>`, still no `<h3>` and no title row, never throwing, never dropping rows. The existing `table-responsive` / `table table-bordered table-striped` markup is reused.

### Files
| File | Change |
|---|---|
| `src/render/render-description.ts` | modify: flat §7 branch, multi-category fallback |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/render/render-description.flat-specs.spec.ts` | `test:logic` | FR-8; Full unchanged; flat table survives `table-finalize` and AGENTS.md §4 unit spacing; multi-category doc under `flatSpecs` does not throw, keeps every row, one `<tbody>`, no `<h3>`, no title row (D4) |

### Acceptance check
Rendering a one-category doc with `flatSpecs: true` yields exactly one `<tbody>` and no `<h3>`; a three-category doc under `flatSpecs` yields one `<tbody>` containing all rows; the same doc without the option renders identically to the current output.

### Notes
Do not infer flat output from `categories.length === 1` (rejected alternative 7). The multi-category output is a defensive fallback shape; rejection of such a Doc is T5/T12's job (D4b).

---

## T5 — Add the template completeness gate (with the Doc-path FR-8 shape rule)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T1, T3 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
New `validateTemplateCompleteness(doc, templateId, {includeFunctionality, hasSpecs})`. For `undefined` (Full) it errors on each paragraph that was mandatory before this Story; for a simplified id it errors on a missing required paragraph and warns (`template-excluded-paragraph`) on a stray excluded one. It also carries rule `simplified-specs-shape` (D4b): for a simplified id with `doc.specs` present, `specs.categories.length !== 1` (including empty `categories`) is an `error` at path `specs.categories` with detail "exactly one category, no headings", so the repair prompt can act on it; Full skips the rule. Not yet wired (T12).

### Files
| File | Change |
|---|---|
| `src/domain/description-doc.completeness.ts` | create |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/domain/description-doc.completeness.spec.ts` | `test:logic` | D3, R2, FR-3..FR-5 required/stray, FR-10, FR-11 (specs omitted when `hasSpecs` is false); FR-8 Doc-path: Filaments and Accessories Doc with two categories fails with `simplified-specs-shape`, empty `categories` with present `specs` fails, one category passes, Full multi-category untouched |

### Acceptance check
A Full doc missing §3 or §9 yields an `error`; a Spare parts doc with a stray §6 yields a `template-excluded-paragraph` warning and no error; a two-category Filaments doc yields a `simplified-specs-shape` error; a valid doc for each template yields no issues.

### Notes
Full's §5 and §6 stay optional exactly as pre-Story. **Part of merge unit A (T3 + T5 + T12).**

---

## T6a — Add the HTML §7 shape validator (FR-8 failure path, legacy/final pass)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T1 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
New `validateSimplifiedSpecsShapeHtml(html, templateId, label)` in a sibling file (D4b). It locates §7 with `parseSpecCategories` (reused from `spec-category-merge.ts`) and returns `error` issues when the §7 region has more than one `<tbody>`, any `<h3>`, more than one parsed category, or a category title row (the row shape the pre-flat renderer emits; the test pins the detector against that output). Simplified templates only; runs for all locales; Full skips; absent §7 (Spare parts) yields nothing.

### Files
| File | Change |
|---|---|
| `src/utils/simplified-specs-shape.ts` | create (imports only the `ValidationIssue` type and `parseSpecCategories`) |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/utils/simplified-specs-shape.spec.ts` | `test:logic` | FR-8: HTML with two `<tbody>` fails; with an `<h3>` fails; with a category title row fails (fixture built from the pre-flat renderer's title-row shape); valid flat table passes; Full multi-category §7 skipped; non-uk-UA locale still checked; absent §7 passes |

### Acceptance check
Each of the three violating HTML fixtures returns an `error`; the valid flat fixture returns none; the same verdict holds for a Full id (skipped).

### Notes
Follow the `image-manifest-coverage.ts` / `spec-category-shape.ts` precedent. No frozen-file edit here: the frozen call is T10, via T6's composed entry point.

---

## T6 — Add the simplified word-range validators and the composed HTML entry point

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T1, T6a |
| **FROZEN (AGENTS.md §9)** | no (sibling file; the frozen call is T10) |

### What changes
New `validateSimplifiedRangesDoc` and `validateSimplifiedRangesHtml` over one range table and one `countWords`, plus exported `validateSimplifiedTemplateHtml(html, templateId, locale, label)` composing `validateSimplifiedRangesHtml` and `validateSimplifiedSpecsShapeHtml` (T6a) so `output-validator.ts` gains a single call (D5, D9). Ranges: uk-UA master only, simplified templates only, each present paragraph checked for min and max as an `error`; paragraph 2 counts the merged killerSpecs+keyBenefits list (90–300, ≤ 8 items); the 5500 ceiling produces no issue. The shape half of the composition runs for all locales.

### Files
| File | Change |
|---|---|
| `src/utils/simplified-word-ranges.ts` | create (imports the `ValidationIssue` type and `simplified-specs-shape.ts`) |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/utils/simplified-word-ranges.spec.ts` | `test:logic` | FR-14, FR-16: each range min/max; 4000-char doc with a 120-word hook rejected; >5500 chars within ranges accepted; non-uk-UA and Full skipped for ranges; V6 Doc/HTML range-verdict parity over one shared fixture set; `validateSimplifiedTemplateHtml` returns both range and shape errors, shape errors also for non-uk-UA (FR-8) |

### Acceptance check
The parity test shows identical range verdicts from both entry points on every shared fixture; `validateSimplifiedTemplateHtml` reports an out-of-range paragraph and a two-`<tbody>` §7 in one call; issue `detail` states actual vs allowed words.

### Notes
Do not touch `output-validator.ts` here.

---

## T7 — Re-express the spec-shape and spec-count checks for simplified templates

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T1, T3 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
`spec-category-shape` (Doc and HTML variants) skips the multi-category collapse check for any simplified template id (one flat category would otherwise fire its "3 categories" guard) instead of the consumables id. The inverse invariant, exactly one category, is not enforced here but by T5 (Doc) and T6a/T6 (HTML) (D4b, D6). `spec-count-parity` runs only when §7 is present and is a no-op with `hasSpecs === false` and absent `doc.specs`. Full behaviour is unchanged.

### Files
| File | Change |
|---|---|
| `src/utils/spec-category-shape.ts` | modify |
| `src/utils/spec-count-parity.ts` | modify |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/utils/spec-category-shape.spec.ts` | `test:logic` | FR-8, FR-21 (rewritten from the consumables carve-out) |
| `src/utils/spec-count-parity.spec.ts` | `test:logic` | FR-11, FR-21 |

### Acceptance check
Specs pass for a flat single-category simplified doc, fail as before for a Full multi-category collapse, and the parity check does not fire on an omitted §7.

### Notes
Keep the old `'consumables-resin'` path working until T11 deletes it if a still-present consumables test needs it; otherwise it is dropped here (the carve-out is rewritten, not skipped).

---

## T8 — Build per-template Doc instructions, HTML overlay and translation clause

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T1, T2 |
| **FROZEN (AGENTS.md §9)** | no (this task does not edit task-a.ts, task-c.ts or task-b.ts) |

### What changes
New `simplified-template-blocks.ts` holds the fixed per-template Doc instruction (paragraph set, v4 ranges, no excluded content, single-tbody §7 with one category item, 5500 soft ceiling with the "v4 ranges win" sentence and the narrative definition, legacy limits gone), the legacy HTML overlay, and the FR-19 translation clause. `buildPromptADoc` calls the frozen base with `templateId: undefined`, replaces `systemBlocks[1]` with the per-template instruction, and appends per-run facts (empty specs, Accessories flag, §5 only if source has compatibility data) to uncached `userContent`. `buildTranslatePrompt` gains an optional trailing `templateId`. With `templateId` undefined all outputs are byte-identical.

### Files
| File | Change |
|---|---|
| `src/prompts/simplified-template-blocks.ts` | create |
| `src/prompts/task-a-doc.ts` | modify |
| `src/prompts/task-translate.ts` | modify |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/simplified-template-blocks.spec.ts` | `test:logic` | FR-3..FR-5, FR-8 (prompt asks for one category, single tbody, no h3), FR-9 (flag on/off, ignored when id is not `accessories`), FR-10, FR-11, FR-12, FR-13, FR-15, FR-19; excluded sections absent from built prompt; block 0 and overlays untouched; `PromptPayload` shape unchanged (NFR-1) |
| `src/prompts/task-a-doc.spec.ts`, `src/prompts/task-translate.spec.ts` | `test:logic` | as above; Full goldens byte-equal (FR-6, NFR-6) |

### Acceptance check
Each of the four `buildPromptADoc` variants has only `systemBlocks[1]` differing, all per-run data sits in `userContent`, and the Full golden tests still pass byte-for-byte.

### Notes
Where v4 text conflicts with the Story's decisions (checkbox, single table, data-conditional §7) follow the Story and cite OD-8 in comments (D13).

---

## T9 — Route the legacy HTML and translation prompts through the simplified overlays (FROZEN)

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T8 |
| **FROZEN (AGENTS.md §9)** | `src/prompts/task-a.ts` and `src/prompts/task-c.ts`. This task MUST perform the §9 stop before editing each: state exactly what changes in that file, confirm the recorded approval (OD-9, 2026-09-21, per file), then proceed. Planning does not grant approval. |

### What changes
In `task-a.ts`, remove `isConsumables`, the consumables reinforcement and `CONSUMABLES_SIMPLIFIED_SCHEMA` use; for a simplified id skip the `CONTENT_TEMPLATES` hint and append `buildSimplifiedHtmlOverlay(...)` to `userContent` (`systemBlocks` untouched). In `task-c.ts`, replace the `CONSUMABLES_TRANSLATION_OVERLAY` append with the FR-19 clause from the sibling for simplified ids. Frozen files gain only an import, one call and deletions.

### Files
| File | Change |
|---|---|
| `src/prompts/task-a.ts` | modify (FROZEN, §9 stop) |
| `src/prompts/task-c.ts` | modify (FROZEN, §9 stop) |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/task-a.spec.ts` | `test:logic` | FR-3..FR-5, FR-7 (legacy path honours the template), FR-9..FR-13, FR-15; no cached-block change (NFR-1) |
| `src/prompts/task-c.spec.ts` | `test:logic` | FR-19 |
| Full-description goldens for `buildPromptA` / `buildPromptC` | `test:logic` | FR-6, NFR-6 |

### Acceptance check
Golden tests for undefined `templateId` are byte-equal; a simplified id yields the overlay in `userContent` and no consumables text; `git diff` on the two frozen files shows only the import, the call and deletions.

### Notes
Do not delete the `CONSUMABLES_*` constants here (T13); only stop using them. `task-b.ts` and `master-system-prompt.ts` are not edited (needing either is a new §9 stop with no approval). If consumables-specific tests for these files exist, rewrite them to the new behaviour (OD-14). Do not touch `.arch-guard-checksums` here (T17). Because `CONTENT_TEMPLATES` is still read by `task-a.ts` until this task lands, T14 is ordered after it (N3).

---

## T10 — Replace the consumables char-limit gate in the output validator (FROZEN)

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T6 (and T6a transitively) |
| **FROZEN (AGENTS.md §9)** | `src/utils/output-validator.ts`. This task MUST perform the §9 stop before editing: state exactly what changes, confirm the recorded approval (OD-9, 2026-09-21), then proceed. |

### What changes
Delete the `consumables-char-limit` gate and its constants/exports (`CONSUMABLES_CHAR_LIMIT`, `strippedVisibleLength` if only consumables use it, verified by grep), and replace the `templateId === 'consumables-resin'` branch with one call to `validateSimplifiedTemplateHtml` (range plus §7 shape checks, D4b/D5). Nothing else in the file changes.

### Files
| File | Change |
|---|---|
| `src/utils/output-validator.ts` | modify (FROZEN, §9 stop) |
| `src/utils/output-validator.spec.ts` | modify: consumables char-limit tests deleted per OD-14; simplified range and shape cases added |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/utils/output-validator.spec.ts` | `test:logic` | FR-14, FR-16 (range error at any length, >5500 accepted, Full and non-uk-UA skipped), FR-13 (legacy limit gone), FR-8 (`validateGeneratedHtml` with a simplified id rejects a second `<tbody>`, an `<h3>` in §7 and a category title row; accepts a flat table; Full multi-category untouched) |

### Acceptance check
`validateGeneratedHtml` with a simplified id returns a range `error` for an out-of-range paragraph, a shape `error` for a non-flat §7, and none for a 6000-character in-range flat document; `git diff` on the file is limited to the three planned changes (delete gate, one composed call, nothing else).

### Notes
If grep shows the still-present consumables orchestrator path depends on a symbol deleted here, keep that symbol until T11 rather than turning the gate red. Do not re-baseline checksums here (T17).

---

## T11 — Delete the consumables stack and the orchestrator's consumables arms

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T3, T9, T10 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
Removes `ConsumablesDocAttempt`, `produceTaskAConsumablesDoc`, `runConsumablesDocGate`, both `isConsumables` sites and effects (video opt-out, `repairBudget = 2`, trim, validator branch), both pipeline ladders' consumables arms, the `'…consumables-doc'` labels and imports; deletes `CONSUMABLES_DOC_PIPELINE_ENABLED` and `usesConsumablesDocPipeline` and the `consumables-resin` exclusion in `usesDocPipeline()`; narrows the `llm.service.ts` pipeline literal to `'doc' | 'html'`. Re-homes the `RenderContext` helpers shared with `render-consumables.ts` into `render-description.ts` (or `render-shared.ts`) before deleting it. Deletes the D10 file list and the scaffold pin tests.

### Files
| File | Change |
|---|---|
| `src/services/content-orchestrator.service.ts` | modify: delete consumables arms |
| `src/services/llm.service.ts` | modify: pipeline literal |
| `src/prompt-core/doc-pipeline-flag.ts` | modify |
| `src/render/render-description.ts` (or new `render-shared.ts`) | modify/create: re-homed helpers |
| consumables domain, schema and spec; `task-a-consumables-doc.ts` and spec; `render-consumables.ts`; `consumables-prose-transforms` and spec; `consumables-trim.ts`; `consumables-bullet-lead-punctuation` and spec; orchestrator doc-gate spec | delete (D10 list) |
| `test/render-reconciliation-consumables.spec.ts`, `test/fixtures/consumables/`, `test/fixtures/consumables-corpus/` | delete |
| `test/tools/scaffold-doc.spec.ts` | modify: remove the consumables scaffold pins |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/doc-pipeline-flag.spec.ts` | `test:logic` | FR-7: `usesDocPipeline` for a simplified id is true for the six `DOC_PIPELINE_STORES` and false for `Expert-3DPrinter` |
| `src/services/content-orchestrator.service.spec.ts` | `test:logic` | FR-7, FR-20 routing |
| `test/removal.spec.ts` (repo-wide reference check) | `test:logic` | FR-20: no `consumables-resin`, `CONSUMABLES_`, `consumables-doc`, `ConsumablesDoc`, `render-consumables`, `usesConsumablesDocPipeline` under `src`, `test`, `server` (a residual `CONSUMABLES_*` text constant in `constants.ts` is allowed to fail until T13; the check goes fully green at T13) |

### Acceptance check
Build, lint and both runners are green with the consumables files gone; simplified ids route to the Doc pipeline for Doc stores and to the legacy path for `Expert-3DPrinter`.

### Notes
**Interim behaviour (N4):** after this task and before T12, a simplified id routes to a Doc gate that does not yet run the completeness, shape or range rules, and the orchestrator does not yet pass `templateId`/`flatSpecs` into the Doc path; this state is accepted on the branch only, and T11 must not ship without T12 (merge unit A extends to T11 in practice: T3 + T5 + T11 + T12 land in one PR). Every pre-existing test mentioning consumables outside the deleted set is rewritten to the new behaviour, not skipped. The removal spec may allow the T13-owned tokens until T13; the builder must not weaken it.

---

## T12 — Wire template, flag, flat specs and validators into the orchestrator

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T4, T5, T6, T8, T11 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
The orchestrator threads `templateId` and `includeFunctionality` into both the Doc and legacy paths, passes `flatSpecs` to the renderer for simplified ids, wires `validateTemplateCompleteness` (including the `simplified-specs-shape` rule) and `validateSimplifiedRangesDoc` into the Doc gate `validate` closure (so the standard repair/retry fires), and passes `templateId` into `buildTranslatePrompt`. The final HTML pass keeps using `validateGeneratedHtml` (T10) which now includes the HTML shape check. FAQ artifact step behaviour is deliberately unchanged (risk R6).

### Files
| File | Change |
|---|---|
| `src/services/content-orchestrator.service.ts` | modify |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/services/content-orchestrator.simplified.spec.ts` | `test:logic` | FR-3..FR-5, FR-7, FR-8 (a two-category simplified Doc reaches the repair loop with `simplified-specs-shape`; rendered output for a valid doc has one `<tbody>`, no `<h3>`), FR-9, FR-14, FR-16, FR-19 wiring; Doc-gate errors reach the repair loop; Full path unchanged |

### Acceptance check
An orchestrator run over each simplified fixture renders a flat single-tbody §7 and passes the Doc gate with zero errors; an out-of-range paragraph or a multi-category §7 triggers the standard retry; a Full run produces byte-identical output and a Full doc missing §3 or §9 triggers the retry.

### Notes
**Closes merge unit A (T3 + T5 + T12).** Non-`uk-UA` locales skip the range check (uses the existing master-locale constant; no locale or currency literals, NFR-2..NFR-5).

---

## T13 — Purge consumables text from the prompt constants

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T11 |
| **FROZEN (AGENTS.md §9)** | no (`master-system-prompt.ts` is not edited; its trust-point sentence at L365-368 stays) |

### What changes
Removes `CONSUMABLES_SIMPLIFIED_SCHEMA`, `CONSUMABLES_TRANSLATION_OVERLAY`, the `CONSUMABLES MODE (§C1-§C6)` notes and the C3D ToV overlay notes from `constants.ts`, since no consumer remains.

### Files
| File | Change |
|---|---|
| `src/prompt-core/constants.ts` | modify: delete consumables text |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `test/removal.spec.ts` | `test:logic` | FR-20 token check fully green |
| `src/prompts/*.golden.spec.ts` | `test:logic` | FR-6: Full goldens still byte-equal (constants text feeds Full prompts; verify no Full-affecting text was removed) |

### Acceptance check
The repo-wide grep for the six tokens is empty under `src`, `test`, `server`; Full goldens still pass.

### Notes
Only consumables-specific text is removed; do not touch text shared with Full prompts.

---

## T14 — Add the Content Template dropdown, label module and wire both forms

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T2, T9 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
New pure module `src/app/content-template-labels.ts` (no Angular imports) exports `TEMPLATE_LABEL_KEYS` and `TEMPLATE_LABELS: { en: Record<TemplateLabelKey, string>; uk: Record<TemplateLabelKey, string> }` holding `templateFull`, `templateFilaments`, `templateAccessories`, `templateSpareParts`, `includeFunctionality` (FR-2 strings; the `Record` annotation makes a missing key a build error). `app.component.ts` spreads `...TEMPLATE_LABELS.en` / `.uk` into the two `TRANSLATIONS` entries so `uiLabels()` exposes the same keys, and loses `consumablesTemplateName`; the rest of the map is not moved. New standalone OnPush `content-template-select` component (signals `input()`/`output()`) renders four options in order (static Full `''`, then `CONTENT_TEMPLATES`), no empty "Select Template..." option, with the Accessories-only functionality checkbox (Generator form only; absent in SEO-only). `CONTENT_TEMPLATES` becomes the three simplified entries (ids from the registry, `geo` all four). `app.component` adds `includeAccessoriesFunctionality = signal(false)` (not persisted), resets it on any template change, keeps Full = `''` = undefined `templateId`, and plumbs `includeFunctionality` in the Generator input builder only.

### Files
| File | Change |
|---|---|
| `src/app/content-template-labels.ts` | create (pure, replaces the old `ui-labels` seam) |
| `src/app/components/content-template-select/content-template-select.component.ts` (+ template) | create |
| `src/app/types.ts` | modify: `CONTENT_TEMPLATES` three entries |
| `src/app/app.component.html` | modify: both dropdowns use the component |
| `src/app/app.component.ts` | modify: spread labels, delete `consumablesTemplateName`, signal, handler, plumbing |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/app/content-template-labels.spec.ts` | `test:logic` | FR-2: every key is a non-empty string in both `en` and `uk`, the key sets are equal, FR-2 strings pinned, `consumablesTemplateName` absent (replaces the old `src/app/ui-labels.spec.ts`, which is not created) |
| `src/app/components/content-template-select/content-template-select.component.spec.ts` | `test:components` | FR-1, FR-9: option order, no empty option, default Full, checkbox only for Accessories in Generator, absent in SEO-only, reset on template change |

### Acceptance check
`vitest run` passes the labels spec and `ng test` passes the component spec; in the running app the dropdown lists Full description, Filaments/resins/powders, Accessories, Spare parts, and the checkbox appears only for Accessories in the Generator form.

### Notes
Ordered after T9 so `CONTENT_TEMPLATES` and label removal never precede the frozen `task-a.ts`/`task-c.ts` edits (N3). Selecting Full must keep the previous empty-selection Customize handling exactly (OD-5). OD-10 wording is a one-key change in the labels module (D13). No RxJS. Nothing from `server/` or secrets enters the bundle (Rule 4).

---

## T15 — Pin cross-link consistency, media survival and translation parity

| | |
|---|---|
| **Track** | angular |
| **Depends on** | T12, T13, T14 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
Adds the four-template consistency test (every paragraph the prompt requests can be produced by a schema-valid doc whose render passes the validator with zero errors, including the flat §7 shape rule), proves figures and iframes survive in Spare parts and Filaments, and pins that an omitted-§3/§6/§9 master survives `structural-parity`, `spec-category-merge`, `legacy-specs-wrap`, `translation-integrity`, `llm-output-integrity` and `image-manifest-coverage` without a restore firing. These are behaviour pins over code changed in T3–T12; if any is red, the builder fixes the offending utility minimally.

### Files
| File | Change |
|---|---|
| `src/utils/structural-parity.ts`, `spec-category-merge.ts`, `legacy-specs-wrap.ts`, `translation-integrity.ts`, `llm-output-integrity.ts`, `image-manifest-coverage.ts` | modify only if a pin fails |
| `test/render-conformance.simplified.spec.ts` | runs `render-conformance{,.v4}` rules over new simplified fixtures |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/simplified-templates.consistency.spec.ts` | `test:logic` | D11 four-template agreement |
| `src/utils/simplified-media-survival.spec.ts` | `test:logic` | FR-22, FR-23 |
| `src/utils/simplified-translation-parity.spec.ts` | `test:logic` | FR-19 |
| `test/render-conformance.simplified.spec.ts` | `test:logic` | FR-21..FR-25 (§4 criteria over simplified fixtures) |

### Acceptance check
All four specs pass; Spare parts output with only §1/§5/§8 still contains the supplied `<figure>` and video `<iframe>`.

### Notes
No accepted artifact exists for simplified templates, so conformance is rules-based only (recorded coverage gap R8). These specs may pass immediately if the plan holds; that is the pin's purpose.

---

## T16 — Update the usage-store pipeline comment

| | |
|---|---|
| **Track** | server |
| **Depends on** | T11 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
Updates the comment in `server/usage/store.js` that lists `'consumables-doc'` as a pipeline value. No schema or data change; historical rows in `data/usage.db` are left untouched.

### Files
| File | Change |
|---|---|
| `server/usage/store.js` | modify: comment only |

### Tests to turn green
no test — this task changes no behaviour, because it edits a comment only. `test/usage-store.spec.ts` and `test/llm-routes.spec.ts` (`test:logic`) must remain green.

### Acceptance check
`grep -r "consumables" server` returns nothing; the two server specs still pass.

### Notes
`pipeline` is a free TEXT column; no migration (D8).

---

## T17 — Re-baseline the frozen-file checksums

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T9, T10, T13 |
| **FROZEN (AGENTS.md §9)** | The recorded checksums of `src/prompts/task-a.ts`, `src/prompts/task-c.ts` and `src/utils/output-validator.ts` change. Before re-baselining, confirm with `git diff` that only the three approved files changed among frozen ones (the baseline is chronically stale, so do not rely on the guard alone); any other frozen-file diff is a new §9 stop. |

### What changes
Regenerates `.arch-guard-checksums` for the three approved frozen files so `bash arch-guard.sh` is green.

### Files
| File | Change |
|---|---|
| `.arch-guard-checksums` | modify |

### Tests to turn green
no test — this task changes no behaviour, because it updates a checksum baseline; the observable proof is `bash arch-guard.sh`.

### Acceptance check
`bash arch-guard.sh` passes, and `git diff` on the checksum file touches only the three approved files' entries plus any pre-existing stale drift noted in the commit message.

### Notes
Stale drift for `task-a.ts`/`task-c.ts` predates this Story (project memory); separate it from this Story's own changes when explaining the diff.

---

## Coverage table

### Plan item to tasks
| Plan item | Tasks |
|---|---|
| D1 registry, `CONTENT_TEMPLATES` | T1, T14 |
| D2 Doc builder, legacy HTML (frozen), translation | T8, T9 |
| D3 schema optional, null-safety, completeness gate (incl. FR-8 shape rule) | T3, T5 |
| D4 renderer skip, flat §7, multi-category `flatSpecs` behaviour | T3, T4 |
| **D4b FR-8 failure path** (Doc rule `simplified-specs-shape`; HTML `simplified-specs-shape.ts`; composed frozen call; `spec-category-shape` skip) | T5, T6a, T6, T7, T10, T12 |
| D5 range validators, composed `validateSimplifiedTemplateHtml`, frozen validator edit | T6, T10 (T6a for the shape half) |
| D6 downstream utilities, null-safety walker specs, media and parity pins | T3, T7, T15 |
| D6b orchestrator, routing, merge unit, interim behaviour, R6 FAQ | T11, T12 (R6: note for HUMAN_PLAN_APPROVAL) |
| **D7 (revised) Angular surface: component, `content-template-labels.ts`, state, `ProductInput` flag, ordering after frozen edits** | T2, T14 (ordering: T9 before T14) |
| D8 server comment | T16 |
| D9 frozen files, re-baseline | T9, T10, T17 |
| D10 removal | T11, T13 |
| D11 agreement/consistency test | T15 (plus T6 V6 parity) |
| D12 locale, retrieval, store scope | T6, T12 (no new locale/currency/retrieval code) |
| D13 OD-8/OD-10 | T8, T14 |
| D14 stale `consumables-resin` id | T1 |

### FR to tasks
| FR | Tasks |
|---|---|
| FR-1 | T14 |
| FR-2 | T14 (`content-template-labels.ts` and spec) |
| FR-3, FR-4, FR-5 | T1, T5, T8, T9, T12 |
| FR-6 | T1 (goldens), T8, T9, T13 |
| FR-7 | T9, T11, T12 |
| FR-8 | T4, T5, T6a, T6, T7, T8, T10, T12 |
| FR-9 | T2, T8, T14 |
| FR-10, FR-11 | T5, T7, T8 |
| FR-12 | T8, T9 |
| FR-13 | T1, T8, T10, T13 |
| FR-14, FR-16 | T6, T10, T12 |
| FR-15 | T1, T8 |
| FR-17 | T3 |
| FR-18 | T3, T4 |
| FR-19 | T8, T9, T12, T15 |
| FR-20 | T11, T13, T16 |
| FR-21..FR-25 | T7, T15 (constraints; also T3, T6a, T10 rules) |
| NFR-1, NFR-6 | T8, T9 |
| NFR-2..NFR-5 | T6, T12 |
| NFR-7 | T9, T10, T17 |

Every task maps to a plan item: T1-T17 and T6a all appear above. T2, T16 and T17 are the no-test tasks, each with a stated no-behaviour reason. No task lacks a plan item, and no plan item lacks a task. PLAN_REVIEW v1 findings: B1 → T14; B2 → T4, T5, T6a, T6, T7, T10, T12; N1 → merge unit A; N2 → T3; N3 → T14 ordering; N4 → T11 note; N7 → R6 note; N5, N6 need no change.

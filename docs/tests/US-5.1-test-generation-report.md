---
artifact: test_generation_report
story: US-5.1
version: 6
status: ARCHIVED
owner: so-test-writer
created_at: 2026-10-03T02:00:00Z
updated_at: 2026-10-04T10:40:00Z
supersedes: docs/tests/US-5.1-test-generation-report.md@v5
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 9
  - key: impact_analysis
    version: 3
  - key: implementation_plan
    version: 6
  - key: task_breakdown
    version: 8
  - key: plan_review
    version: 8
  - key: test_strategy
    version: 6
  - key: ac_test_matrix
    version: 6
open_decisions_blocking: false
---

# Test Generation Report - US-5.1 (Specification v9)

Stage TEST_WRITING, re-run for Specification v9 / Plan v6 / Task breakdown v8 after the plan gate. Nothing was
committed. No production file, frozen file, ground-truth corpus input, `.doc.json` / `.ctx.json`,
`workflow-state.yaml` or `history.jsonl` was edited. The working tree already held v5-era production code
(`image-placeholder*.ts`, orchestrator wiring, `task-a.ts`, the master-prompt FR-20 sentence, the hook / CTA carriers);
the v9 tests are red against it only where v9 behaviour is new.

## 1. Files written or changed (all TEST_WRITING-owned)

New: `src/utils/image-figure-style.spec.ts`, `src/utils/image-figure-style.prompt-examples.spec.ts`,
`src/prompts/vision-prepass.spec.ts`.

Rewritten for v9: `src/utils/image-placeholder.spec.ts`.

Reworked for v9 (v5 matrix kept, Ukrainian captions, `max-content`, FR-21 cases added):
`src/utils/image-placeholder-doc.spec.ts`, `image-placeholder-html.spec.ts`, `image-placeholder-validate.spec.ts`,
`src/services/content-orchestrator.image-placeholder.spec.ts`, `test/fixtures/image-placeholder/fixtures.ts`.

Extended (tracked): `src/utils/vision-contract.spec.ts`, `test/openai-provider.spec.ts`, `src/prompts/task-a.spec.ts`
(AC-9 k sentinel case, `buildPromptADoc` import).

Pins moved `fit-content` -> `max-content`, same assertion shape: `src/app/components/html-editor/extensions/round-trip.spec.ts`
(2), `src/render/render-description.spec.ts` (3), `src/render/render-description.hook-cta-extra.spec.ts`,
`src/utils/html-cleaner.spec.ts`, `src/utils/image-figure.spec.ts` (2), the Doc and HTML step specs, the two corpus
`test/fixtures/corpus/{center-3d-print,expert3d}-ortur-h20-20w.uk-UA.html` (14 token substitutions each), the golden
`test/fixtures/golden/full-description-prompts.json`; header note of `test/fixtures/full-description-inputs.ts` names both
approved prompt exceptions. Neutral `Image:` captions in the three hook / CTA carrier specs became `Мітка:` (they test
the renderer's pass-through, not the marker builder).

Kept as written (green, not v9-sensitive): `description-doc.hook-cta-extra.spec.ts`, `hook-cta-extra-validators.spec.ts`,
`master-system-prompt.image-markers.spec.ts`, `task-a.import-cycle.spec.ts`, `task-a-doc.spec.ts`.

## 2. Commands run and observed output

Baseline before any edit (v5 tree, v5 specs): `npm run test:logic` -> `Test Files 160 passed (160)`, `Tests 4352 passed |
3 skipped (4355)`.

After this stage: `npx vitest run` (`npm run test:logic`):

```
 Test Files  16 failed | 147 passed (163)
      Tests  154 failed | 4352 passed | 3 skipped (4509)
     Errors  2 errors   (unhandled rejection: Cannot find module '/src/utils/image-figure-style', see finding F-3)
```

Every one of the 16 failing files is a file this stage wrote or changed; every other spec file (147) is green, so the
pre-existing suite is unaffected. Per-file counts (pass / fail):

| File | Pass | Fail | Why it fails (observed) |
|---|---|---|---|
| `src/utils/image-placeholder.spec.ts` | 40 | 51 | `TypeError: figureCaptionWarnings is not a function`; `expected 'Desk lamp on a walnut table' to be 'Настільна лампа біля вікна на горіховому столі'` (alt still from `altText`); `IMAGE_CAPTION_LABEL` still exported (`no longer exports IMAGE_CAPTION_LABEL` fails); the module source still contains `Product image` |
| `src/utils/image-placeholder-doc.spec.ts` | 55 | 15 | caption `<b>Image:</b> A desk lamp on a walnut table.` instead of `<b>Лампа на столі:</b> Настільна лампа стоїть на горіховому столі.`; no `image-caption-*` warning in `report.warnings`; rendered figure `width: fit-content` |
| `src/utils/image-placeholder-html.spec.ts` | 45 | 15 | same two reasons on the HTML path; `expected 'display: block; width: fit-content; ...' to be '... max-content ...'` |
| `src/utils/image-placeholder-validate.spec.ts` | 30 | 8 | appended figure still English / `fit-content`; `image-caption-not-native` absent from finaliser and validator issues |
| `src/services/content-orchestrator.image-placeholder.spec.ts` | 27 | 13 | `expected 'Image:' to be 'Зображення товару:'`; `expected [] to have a length of 1 but got +0` (no caption warning); numeric case (a): `expected 'Image: A lamp on a walnut table.' to match /75\s*(W\|Вт)/` |
| `src/utils/vision-contract.spec.ts` | 12 | 15 | `expected { Object (caption) } to deeply equal { …(4) }` (new fields not parsed); `visionResultToEntryPatch is not a function` |
| `src/prompts/vision-prepass.spec.ts` | 4 | 7 | `expected [ 'caption' ] to deeply equal [ 'alt', 'caption', …(2) ]`; prompt has no Ukrainian / not-translated / image-specific / one-sentence text |
| `src/utils/image-figure-style.spec.ts` | 9 | 9 | `expected 'display: block; width: fit-content; ...' to be '... max-content ...'` on the renderer, `wrapImageFigures`, the editor node default and `cleanHtmlStructure`; `expected '<p><b>Ortur H20 20 W…' not to contain 'fit-content'`; agreement cases: module absent |
| `src/utils/image-figure-style.prompt-examples.spec.ts` | 3 | 4 | `<figure style="display: block; width: fit-content; ...">` in the master prompt example block; `not to contain 'fit-content'` |
| `src/prompts/full-description.golden.spec.ts` | 4 | 10 | `systemBlocks[0].text differs` for the 10 master-embedding cases (golden carries `max-content`, the prompt still `fit-content`); the 2 `translate/*` cases stay green |
| `src/render/render-description.spec.ts` | 65 | 1 | inline snapshot mismatch (`max-content` vs renderer `fit-content`) |
| `src/render/render-description.hook-cta-extra.spec.ts` | 10 | 1 | `expected '... fit-content ...' to be '... max-content ...'` |
| `src/utils/image-figure.spec.ts` | 6 | 2 | `fit-content` vs `max-content` |
| `src/utils/html-cleaner.spec.ts` | 25 | 1 | `fit-content` vs `max-content` |
| `test/openai-provider.spec.ts` | 8 | 1 | `AssertionError: expected 300 to be 1000` |
| `test/render-reconciliation.spec.ts` | 6 | 1 | renderer HTML (`fit-content`) not equal to the token-updated corpus HTML (`max-content`) |

Green on arrival (guards, by design; the v5 production code for them is already in the tree or the case restates
unchanged behaviour): `task-a.spec.ts` (54, including the AC-9 k sentinel cases), `task-a-doc.spec.ts` (33),
`task-a.import-cycle.spec.ts` (3), `master-system-prompt.image-markers.spec.ts` (14), `round-trip.spec.ts` (14, the
editor keeps incoming `style`), `description-doc.hook-cta-extra.spec.ts` (16), `hook-cta-extra-validators.spec.ts` (10),
and the grammar / matcher / seen-set / marker-algorithm cases inside the five step specs. They are listed as GUARD in the
AC matrix. The T9 builder cases and the T10 numeric case are RED; the T10 case (a) will additionally need the
`numericFidelitySources` widening once the captions are Ukrainian, which is what it isolates after T9.

`npm run lint` (`tsc --noEmit`): 125 errors, every one inside the files above and only of the kinds
`TS2353 / TS2561 object literal ... does not exist in type` (the three `...Uk` fields, `label`, `description`, `alt`),
`TS2554 Expected 1 arguments, but got 2` (`buildFigureParts(entry, opts)`, the step `opts`),
`TS2339 Property ... does not exist` (new fields on `VisionResult` / `ImageManifestEntry`), `TS2305` (missing exports
`figureCaptionWarnings`, `visionResultToEntryPatch`) and one `TS2307` (`image-figure-style`). They disappear when
T1 / T4 / T9 / T8 land; no unrelated type error is present.

`npm run test:components` (`ng test`): fails at BUILD (`Application bundle generation failed`) with the same 125
type errors, because the Angular builder type-checks the whole `tsconfig` program, not only `*.component.spec.ts`.
No component spec was added or changed; `model-settings.component.spec.ts` cannot be observed passing until T4 (see F-1).

## 3. Right reason, not a missing import

Each red case fails on a wrong value, a missing behaviour or a missing function of a module that exists, not on an
unresolvable import: `expected 'Image:' to be 'Зображення товару:'`, `expected 300 to be 1000`, `expected 'display: block;
width: fit-content; ...' to be '... max-content ...'`, `systemBlocks[0].text differs`. The only unresolvable import is
the genuinely new module `src/utils/image-figure-style.ts`; it is imported lazily in the two agreement cases only, so the
three surface cases of that file fail on the value (F-3).

## 4. Fixtures and mechanical reviews

- Corpus: `git diff --stat -- test/fixtures/corpus` lists exactly the two `.uk-UA.html` files, 14 changed lines each; a
  line-by-line check (`width: fit-content` / `width: max-content` normalised) shows every changed line differs only by
  the token. `src/utils/__fixtures__/description_uk-UA.original.html` / `.corrected.html` untouched.
- Golden review (scratchpad script `golden-review.mjs`, not committed): 12 keys in both, same order; exactly 10 entries
  differ (`doc/expert3d`, `doc/expert3d+hook`, `doc/c3d`, `html/expert3d`, `html/legacy`, `html/legacy+lang`,
  `html/c3d+customTemplate`, `c/expert3d-es`, `c/eu-en`, `c/us-uk`); in each, `userContent` equal, other system blocks
  equal, block 0 = HEAD text with one pure 242-character insertion (the FR-20 sentence, nothing removed) and exactly two
  `width: max-content` occurrences; `translate/uk-user` and `translate/de-internal` identical to HEAD. The builder's
  regenerated golden must equal this file byte for byte (T11).
- AC-9 title check (scratchpad `check-titles.mjs`): every `it(...)` title cited in the AC matrix was found in the
  spec sources (the script's residual hits are prose backticks, not titles).

## 5. Findings

Non-blocking; none makes the Specification or the plan untestable.

- **F-1 (component runner).** `npm run test:components` cannot run until T4 because it compiles every spec of the
  program. The same was recorded for v4. The component runner needs no edit from this Story; the pre-existing component
  spec is expected green again once the types exist. The gate (`so-gate-enforcer`) runs both runners after IMPLEMENTATION.
- **F-2 (plan gap, D4 item 4 versus the breakdown).** The plan says `PlaceholderReport` gains the ordered marker-figure
  labels so a post-gate finaliser "which has no tracker" checks duplicate labels against them, yet the breakdown keeps
  `finalizeDroppedPlaceholdersDoc/Html` names *and signatures* unchanged and neither document names the field or how the
  finaliser receives it. The Specification does not require this check (FR-21 rule 5 concerns marker-inserted figures in
  document order; FR-18's appended figure is one more figure). Not pinned: the finaliser specs assert the Ukrainian
  builder output and the not-native warning, and the step-level duplicate check includes end-appended figures. If the
  plan owner wants the finaliser-versus-report duplicate check, the carried field and signature must be named first.
- **F-3 (lazy import noise).** `image-figure-style.spec.ts` imports the new shared module through a variable specifier so
  its surface cases stay observable while the module is absent. Until T8 creates the module, vitest also prints two
  `Unhandled Rejection ... Cannot find module '/src/utils/image-figure-style'` and exits non-zero even if every case
  passed; this vanishes when the file exists. The spec imports no `test/fixtures/image-placeholder/` file (T9 commits that directory), only tracked fixtures and local helpers, so T8 can commit it green. The path resolves for an existing module (verified with a scratch spec).
- **F-4 (pinned shapes).** The plan names `buildFigureParts(entry, opts)`, `opts.cyrillicCheck`, `figureCaptionWarnings`
  and `visionResultToEntryPatch` but not every shape; the choices are listed in the test strategy section 3
  (`figureCaptionWarnings(figures)` over `buildFigureParts` results; step `opts` as an optional last argument; patch
  contains only present fields). The builder may need to adapt the production signature to these or ask for a change in
  the specs through the loop-back; it must not weaken them (AGENTS.md 7.7).
- **F-5 (shared key-name constant).** Plan D2 / T4 mention "a shared constant list of the new key names exported for the
  prompt module" without a name. The Vision prompt spec instead extracts the advertised JSON keys from the prompt text and
  round-trips a reply through the parser, which verifies the agreement the constant exists for without pinning a name.
- **F-6 (corpus gap, carried).** The corpus is two items of one product across two stores and carries no marker; marker
  behaviour is covered by hand-authored fixtures in `test/fixtures/image-placeholder/`, not by the corpus.
- **F-7 (OI-1 / OI-2 positions).** The existing FR-19 wording case pins the same-section relocation text (plan outranks
  spec, human decision). No case asserts a cross-section lead-in. OI-2 (one modified `task-a.ts` line) is a mechanical
  diff check in T11 / T13, not a unit test.
- **F-8 (not unit-testable).** Model compliance with FR-19 / FR-20 and Vision quality (image-specific label, one sentence,
  idiomatic Ukrainian, Cyrillic proxy passing Russian text) remain the human live re-runs named in the Specification.
  AC-9 (f) and (o) final greps are T11 / T13 mechanical checks.
- **F-9 (v5 behaviour in tree).** Because v5 production code is in the working tree, the FR-19 prompt cases and the whole
  marker algorithm already pass; only v9-new behaviour is red. This is expected by the breakdown (kind `land` for T1, T3 and
  the unchanged parts of T8 / T11).

## 6. Result

All required test files exist and are named for their runner (none is a component spec); service spec uses
`Injector.create` with `@angular/compiler` first; no test's only assertion is `toBeTruthy()`; no assertion is copied from a
run; no sleep, retry, random or network. Tests were executed and the failing output recorded above.

## v6 - loop-back fix (TEST_WRITING attempt 2, key `changes_required_tests`)

Trigger: the IMPLEMENTATION stage (pipeline status v6) found two defects in test files owned by this
stage. Both were verified to be test defects, not production bugs, before any change.

1. `src/utils/image-figure-style.spec.ts`, describe "agreement between the surfaces and the shared
   module": two cases called `loadStyleModule()` (returns `Promise<typeof import(...)>`) without
   `await`, so `m.IMAGE_FIGURE_STYLE` was undefined and `npm run lint` failed with TS2339. Fix:
   `const m = await loadStyleModule();` (the cases were already `async`). `src/utils/image-figure-style.ts`
   exports the three constants with the specified literals; production is correct.
2. `src/utils/image-placeholder-doc.spec.ts`, case "does not rename the later label automatically
   (no rewording)": `SAME_LABEL_KETTLE` was built from `entry()` defaults, which are the LAMP's, so its
   description was the lamp's while the assertion expects the kettle's `Сталевий чайник, вигляд збоку.`.
   Fix: `entry({ ...KETTLE, visionLabelUk: LAMP_LABEL_UK })`, so only the label is overridden and the
   description is the kettle's. `image-placeholder.ts` correctly uses the entry's own
   `visionDescriptionUk`; production is correct. No assertion was weakened or changed.

Stage-map note: TEST_WRITING tests normally FAIL before implementation. Here they are expected GREEN
because this is a loop-back after IMPLEMENTATION; production code already exists.

Observed results (real runs, 2026-10-04):
- `npx vitest run src/utils/image-figure-style.spec.ts src/utils/image-placeholder-doc.spec.ts`:
  2 files passed, 88 tests passed.
- `npm run test:logic`: 163 files passed, 4506 tests passed, 3 skipped.
- `npm run lint` (`tsc --noEmit`): clean, exit 0.

Nothing was committed. No production code, fixture or AC mapping changed.

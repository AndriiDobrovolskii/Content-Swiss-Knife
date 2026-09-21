---
artifact: impact_analysis
story: US-2.2
version: 1
status: ARCHIVED
owner: so-impact-analyzer
created_at: 2026-09-21T14:30:00Z
updated_at: 2026-09-21T14:30:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 1
  - key: open_decisions
    version: 3
open_decisions_blocking: false
---

# Impact Analysis: US-2.2 — Simplified v4 content-template schemas and Content Template dropdown

Surveyed from the codebase at branch `feat/US-2.1-migrate-descriptions-to-v4-schemas` (US-2.2 files untracked). Every file list below was re-derived by grep (`consumables`, `templateId`, `STORE_REGISTRY`, doc-field names), not recalled. Approved resolutions taken as given: OD-5 (Full description = `templateId` undefined), OD-6 (Accessories checkbox default unchecked, hidden in SEO-only form), OD-7 (Spare parts §5 conditional), OD-15 (hard ranges for simplified schemas only, standard validator retry). OD-8 and OD-10 stay open and non-blocking.

## FROZEN-file impact (AGENTS.md §9) — LOUD

This Story edits three FROZEN files. Each edit is covered by the human approval recorded as OD-9 (2026-09-21) but the §9 stop and a re-baselined `.arch-guard-checksums` still apply at implementation:

| FROZEN file | Why it must change |
|---|---|
| `src/prompts/task-a.ts` | Legacy HTML path (currently `Expert-3DPrinter`) builds the paragraph set at L129-135 (`isConsumables`, `CONTENT_TEMPLATES.find`); FR-7 requires the four templates there. Also `CONSUMABLES_SIMPLIFIED_SCHEMA` use. |
| `src/prompts/task-c.ts` | L2 import and L125-128 append `CONSUMABLES_TRANSLATION_OVERLAY`; FR-19/FR-20 remove it and require master-omission preservation on the legacy translation path. |
| `src/utils/output-validator.ts` | Hard `consumables-char-limit` gate (L388-411, L504-513) is replaced by v4 word-range checks (FR-14, FR-16); `templateId` branch in `validateGeneratedHtml` (L496-505). |

Not edited, but adjacent: `src/prompts/task-b.ts` and `src/prompt-core/master-system-prompt.ts` are not required by any FR (a consumables sentence at master-system-prompt.ts L365-368 is generic prose about a store trust point, not the consumables template; leave alone). If the planner finds an FR that needs either, that is a new §9 stop with no recorded approval.

Checksum baseline note (memory: baseline chronically stale): `.arch-guard-checksums` currently lists task-a, task-b, task-c, master-system-prompt, output-validator. Re-baselining after the three edits is part of implementation, not a separate finding. Sibling-file workaround (`task-a-doc.ts`, `image-manifest-coverage.ts` pattern) is a `so-planner` design decision, not assumed here.

## Affected files

### Must change

UI / app surface
- `src/app/types.ts` — `CONTENT_TEMPLATES` (L131-137, single `consumables-resin` entry, `geo` field, description) becomes four options; `ProductInput.templateId` (L44) semantics; new Accessories-§3 flag on `ProductInput`.
- `src/app/app.component.html` — two dropdowns: Generator (L205-209, has empty "Select Template..." option, `[selected]` wiring, `text-slate-400` when empty) and SEO-only (L444-449). Accessories checkbox added to Generator only (OD-6). Customize panel L199-229 must keep working.
- `src/app/app.component.ts` — `uiLabels` EN (L179 `consumablesTemplateName`) and UA (L349) replaced by four label keys per locale; `selectedTemplateId` signal (L443, default `''`); template-change handler (L814-830); `templateId` plumbed into inputs at L885 and L919 (`|| undefined` stays valid for Full description under OD-5).

Prompt / prompt-core
- `src/prompts/task-a-doc.ts` — Doc-pipeline prompt builder; currently has no `templateId` handling at all (grep found none) and must build per-template paragraph sets, single-table §7 instruction, §5/§7 source-conditionals, 5500 soft ceiling with v4-ranges-win statement. Must keep FR-6 byte-identity when `templateId` is undefined.
- `src/prompts/task-a.ts` (FROZEN) — legacy path, see above.
- `src/prompts/task-c.ts` (FROZEN) — see above.
- `src/prompts/task-translate.ts` — Doc-pipeline translation prompt (`buildTranslatePrompt`, L154); FR-19 "translate only fields present in master, do not re-add omitted paragraphs", no length limits. No consumables/`templateId` handling exists today.
- `src/prompt-core/constants.ts` — remove `CONSUMABLES_SIMPLIFIED_SCHEMA` (L871), `CONSUMABLES_TRANSLATION_OVERLAY` (L949), consumables text in the shared blocks (L677, L854-866, L940, L1171 no — that line is store trust wording, verify; L1380-1392, L1420, L1486-1491 consumables notes in C3D ToV overlays and `CONSUMABLES MODE (§C1-§C6)` paragraphs). Add new template/paragraph-set constants or a sibling module (planner).
- `src/prompt-core/doc-pipeline-flag.ts` — remove `CONSUMABLES_DOC_PIPELINE_ENABLED`, `usesConsumablesDocPipeline`, and the unconditional `templateId === 'consumables-resin'` exclusion in `usesDocPipeline` (L59-90). Because that exclusion disappears, simplified templates start routing to the Doc pipeline for the five `DOC_PIPELINE_STORES` (`EXPERT3D`, `3DDevice`, `3DPrinter`, `3DScanner`, `Center 3D Print`, `Drukarka 3D` — six entries).

Domain / render
- `src/domain/description-doc.schema.ts` — make paragraph 2 (`killerSpecs`, `keyBenefits`), 3 (`functionality`), 4, 6, 7, 9 optional/nullable; keep 1 and 8 required; cross-field refines (skip when absent). Currently `killerSpecs`, `keyBenefits`, `functionality` (L176-179) are required; `packageContents` (L193) and `compatibility` (L192) already optional.
- `src/domain/description-doc.ts` — the hand-maintained TS type (schema cannot infer it, see comment near L226) must be made optional in lockstep.
- `src/render/render-description.ts` — skip absent paragraphs without throwing; single-category §7 in one `<tbody>` (FR-8, FR-18); `RenderContext` helpers shared with `render-consumables.ts` (comment L131) must be re-homed or deleted with it.
- `src/render/doc-schema-issues.ts` — repair-facing issue text (L189 mentions the consumables gate) and any issue mapping keyed on now-optional paths.
- `src/render/doc-prose-transforms.ts` — consumer of doc fields; must tolerate absent paragraphs.

Validator / utils
- `src/utils/output-validator.ts` (FROZEN) — see above; new hard word-range checks for hook, Killer Specs block, applications, compatibility, CTA, FAQ (OD-11) applied only for simplified templates on uk-UA master (OD-15).
- `src/utils/spec-category-shape.ts` and `src/utils/spec-count-parity.ts` — both carry `templateId` and consumables carve-outs (grep hits with `templateId`); the "always a no-op for consumables" logic must be re-expressed for the simplified templates, and spec-count parity must apply only where §7 present (FR-11, FR-21).
- `src/utils/repair-strategy.ts` — consumables mention (L328) and doc-field consumer; tier/attempt behaviour under the new gates.
- `src/utils/doc-block-repair.ts`, `src/utils/doc-tier.ts`, `src/utils/heading-style.ts`, `src/utils/sentence-length.ts`, `src/utils/tov-second-person.ts`, `src/utils/bullet-lead-punctuation.ts`, `src/utils/alt-numeric-fidelity.ts`, `src/utils/video-manifest.ts`, `src/utils/specs-grounding.ts` — read `ProductDescriptionDoc` fields directly; make-optional means each needs a null-safety pass (type-check will flag most under `npm run lint`, but runtime `undefined`-tolerance in walkers must be verified).

Orchestration
- `src/services/content-orchestrator.service.ts` (2005 lines) — largest single edit surface: remove `ConsumablesDocAttempt`, `produceTaskAConsumablesDoc`, `runConsumablesDocGate` (L123-131, L623-760), `isConsumables` (L806, L1268) and its effects (video opt-out L809/L1270, `repairBudget = 2` L810/L1271, trim L991/L1151/L1424, validator branch L1001/L1427), two pipeline-selection ladders (L862-897, L1311-1345), `pipeline: '...consumables-doc'` labels (L973, L1409), imports (L25-77). Must thread the new Accessories flag and template into both paths. `templateId` flows through 9+ `validateGeneratedHtml` / `validateSpecCategoryShape*` call sites (L549, L737, L757, L909, L929, L1002, L1119, L1228, L1354, L1367, L1428, L1539, L1836-1838).
- `src/services/llm.service.ts` (L70) — `pipeline: 'doc' | 'html' | 'consumables-doc'` literal (FR-20 `'consumables-doc'` literal removal).
- `server/usage/store.js` (L55) — comment enumerating `'consumables-doc'`; rows already in `data/usage.db` may carry that value (see silent risks).

Delete outright (FR-20, OD-2, OD-14)
- `src/domain/consumables-doc.ts`, `src/domain/consumables-doc.schema.ts`, `src/domain/consumables-doc.schema.spec.ts`
- `src/prompts/task-a-consumables-doc.ts`, `src/prompts/task-a-consumables-doc.spec.ts`
- `src/render/render-consumables.ts`, `src/render/consumables-prose-transforms.ts`, `src/render/consumables-prose-transforms.spec.ts`
- `src/utils/consumables-trim.ts`, `src/utils/consumables-bullet-lead-punctuation.ts`, `src/utils/consumables-bullet-lead-punctuation.spec.ts`
- `src/services/content-orchestrator.consumables-doc-gate.spec.ts`
- `test/render-reconciliation-consumables.spec.ts`, `test/fixtures/consumables/`, `test/fixtures/consumables-corpus/`

### Needs re-verification (unchanged or lightly touched)

- `src/prompt-core/store-render-rules.ts`, `src/render/render-description.ts` (STORE_REGISTRY consumers, see hazard 1) — output must be identical for Full description.
- `src/utils/table-finalize.ts`, `src/utils/language-consistency.ts` — STORE_REGISTRY consumers; §7 single-tbody output must survive table finalization.
- `src/utils/structural-parity.ts`, `src/utils/spec-category-merge.ts`, `src/utils/legacy-specs-wrap.ts` — structural checks between master and translation: a translation that now legitimately lacks §3/§6/§9 must not be flagged or "restored" (see silent risks; `structural-parity-restore.spec.ts` exists).
- `src/utils/translation-integrity.ts`, `src/utils/llm-output-integrity.ts`, `src/utils/image-manifest-coverage.ts`, `src/utils/video-figure.ts`, `src/utils/image-figure.ts` — image and video survival (FR-22, FR-23) when the §3/§4 hosts of figures/iframes are omitted.
- `src/prompts/task-faq.ts` — FAQ (§9) stays Full-only; verify the FAQ tabs for simplified templates are handled (Story/spec are silent, see Unknowns).
- `src/prompts/task-b.ts` (FROZEN, unchanged) — meta must stay currency-free (FR-24).
- `src/prompt-core/payload.ts`, `src/prompts/copywriter.ts`, `src/prompts/optimizer.ts` — other prompt builders receiving `ProductInput`; confirm none read `templateId`.
- `.arch-guard-checksums`, `arch-guard.sh` — re-baseline required.

### Tests that cover them

Logic runner (`npm run test:logic`, vitest): all listed below.
- Rewrite / extend: `src/prompts/task-a.spec.ts` (L143-145, L211-213 assert consumables behaviour), `src/prompts/task-c.spec.ts` (L96-101 assert `CONSUMABLES MODE` overlay), `src/prompts/task-a-doc.spec.ts`, `src/prompts/task-a-doc.v4.spec.ts`, `src/prompts/task-translate.spec.ts`, `src/utils/output-validator.spec.ts` (L787-808 `consumables-char-limit`), `src/prompt-core/constants.spec.ts` (L251-263 consumables-mode describe), `src/prompt-core/doc-pipeline-flag.spec.ts`, `src/prompt-core/product-name-core.spec.ts` (consumables ref), `src/prompts/output-integrity-wiring.spec.ts`, `src/utils/spec-category-shape.spec.ts`, `src/utils/spec-count-parity.spec.ts` (has a "consumables scoping" describe), `src/render/doc-schema-issues.spec.ts`, `test/tools/scaffold-doc.spec.ts` (the pin tests expecting a consumables-shaped artifact to be rejected; OD-14 says removal is not test-weakening).
- Schema/render: `src/domain/description-doc.schema.spec.ts`, `description-doc.schema.v4.spec.ts`, `src/render/render-description.spec.ts`, `.v4.spec.ts`, `.node.spec.ts`, `doc-repair-recovery.spec.ts`, `doc-prose-transforms.spec.ts`.
- Orchestration: `src/services/content-orchestrator.doc-gate.spec.ts`, `content-orchestrator.ua-doc-pipeline.spec.ts`, `seo-currency-wiring.spec.ts`.
- Utils touched by optional-field pass: `doc-block-repair.spec.ts`, `doc-tier.spec.ts`, `repair-gate.spec.ts`, `repair-strategy.spec.ts`, `heading-style*.spec.ts`, `sentence-length.spec.ts`, `tov-second-person.spec.ts`, `bullet-lead-punctuation.spec.ts`, `alt-numeric-fidelity.spec.ts`, `specs-grounding.spec.ts`, `table-finalize.spec.ts`, `structural-parity*.spec.ts`.
- Corpus: `test/render-reconciliation.spec.ts`, `test/render-conformance.spec.ts`, `test/render-conformance.v4.spec.ts`, `test/fixtures/v4-docs.ts` (shared v4 doc factory; needs simplified-shape fixtures).

Component runner (`npm run test:components`, `ng test`): `*.component.spec.ts` only. No `app.component.spec.ts` was found among the survey greps; dropdown/checkbox tests (FR-1, FR-2, FR-9) would land in this runner (it currently holds one file) unless the planner tests the option list as pure logic from `CONTENT_TEMPLATES` / `uiLabels` in the logic runner. Which runner is a planner decision; the component runner must be used for any DOM assertion (option order, no empty option, checkbox visibility).

## Hazard table

| # | Hazard | Applies? | Evidence |
|---|---|---|---|
| 1 | STORE_REGISTRY fan-out | Applies (indirectly) | Re-derived consumers via `grep STORE_REGISTRY src server test`: non-spec: `src/app/app.component.ts`, `src/prompt-core/{constants,doc-pipeline-flag,store-render-rules}.ts`, `src/render/render-description.ts`, `src/utils/{language-consistency,output-validator,table-finalize}.ts`. Specs/tests: `constants.spec`, `doc-pipeline-flag.spec`, `number-format-rules.v4.spec`, `store-render-rules.spec`, `v4-headings.spec`, `task-a.spec`, `task-b.spec`, `content-orchestrator.ua-doc-pipeline.spec`, `seo-currency-wiring.spec`, `table-finalize.spec`, `test/render-conformance{,.v4}.spec`. Note `task-slug.ts` and `content-orchestrator.service.ts` no longer reference the registry by name (differs from the skill's remembered list). The Story does not change the registry, but the scope is "all stores" and both pipelines (OD-1), so every consumer's template-dependent output must be re-verified. The `DOC_PIPELINE_STORES` list is a second per-store gate: removing the consumables exclusion changes which pipeline simplified templates use for 6 stores; `Expert-3DPrinter` stays on the legacy path (frozen `task-a.ts`). |
| 2 | uk-UA master vs translation | Applies, both directions | Task A generation (uk-UA master): per-template paragraph subset, hard word ranges, soft 5500 ceiling. Change to master generation reaches every language because Task C / translate work from the master. Task C / translate change (FR-19): must preserve master omissions in all non-master locales, no length limits; reaches translated locales only. Consumables previously ran with `repairBudget = 2`, trim and video opt-out at both master and translation (orchestrator L1151), all removed. |
| 3 | prompt → schema → renderer → validator chain | Applies, all four links | Prompt: `task-a-doc.ts`, frozen `task-a.ts`, `task-translate.ts`, frozen `task-c.ts`, `constants.ts`. Schema: `description-doc.schema.ts` + `description-doc.ts`. Renderer: `render-description.ts` (consumables renderer deleted). Validator: frozen `output-validator.ts` word ranges, spec-count/shape utilities, `doc-schema-issues.ts`. Prompt changes without schema changes would fail schema; schema optionality without renderer skip-logic throws; without validator updates, §4 criteria would either reject valid simplified output (spec parity when §7 absent, `<tbody>` count, spec-category-shape) or silently accept out-of-range paragraphs. |
| 4 | FROZEN files | Applies, three | `task-a.ts`, `task-c.ts`, `output-validator.ts` (see section above). OD-9 approval recorded. `task-b.ts` and `master-system-prompt.ts` not required. |
| 5 | Corpus conformance harness | Applies, coverage gap | `test/fixtures/corpus/` holds only two items, both Ortur H20 20 W (Center 3D Print and EXPERT3D), both full-schema. `test/render-reconciliation.report.md` §5 records this two-item coverage. There is no simplified-shape corpus item; the old `consumables-corpus/` triple (Fuse 1 uptime kit) is deleted by FR-20, and its `.uk-UA.html` was the only accepted simplified artifact. Full-description reconciliation must stay byte-stable (FR-6/FR-18); simplified templates have no accepted-artifact fixture, so they can be covered only by conformance (rules-based), not byte reconciliation. |
| 6 | Two test runners | Applies | Almost all work lands in `test:logic`. Dropdown and checkbox DOM assertions are the only component-runner candidates (see above). |
| 7 | server/** surfaces | Applies, minimal | `server/usage/store.js` L55 comment lists `'consumables-doc'`; column is `pipeline` TEXT. No schema change required, so the "no migration mechanism" hazard (silent no-op on `ALTER`) is not tripped unless the planner alters the column (not required by the spec). Specs at risk: `test/usage-store.spec.ts` (if it asserts the `'consumables-doc'` literal; not confirmed), `test/llm-routes.spec.ts` (only if `pipeline` type checked). Providers, `pricing`, `retry`, `json-parse` not affected. |

## Silent-failure risks (no error raised)

1. **Full-description byte identity (FR-6/AC-6).** With `templateId` undefined, any accidental change to `task-a-doc.ts`/`task-a.ts` prompt text produces no error, only a different prompt. Only the byte-identity test catches it, and it needs a pre-Story golden that must be captured before editing.
2. **Optional-field schema relaxation weakens Full description.** Making paragraphs 2/3/4/6/7/9 optional in the shared schema means a Full-description model response that omits §3 or §9 now validates. Nothing errors; Full descriptions ship incomplete unless a Full-only "required paragraphs" check exists (the spec defers this; see Unknowns).
3. **Word-range validator scope (OD-15).** Ranges must fire for simplified templates on uk-UA only. If gated wrongly they either silently never fire (out-of-range accepted) or start rejecting Full description and translated locales (regression of accepted output).
4. **Translated locales re-adding omitted paragraphs.** Structural-parity / restore logic (`structural-parity*`, `spec-category-merge`, `legacy-specs-wrap`) compares translation to master; an omitted §3/§6/§9 could be flagged or "restored" from a full-shape expectation, or the translator may invent them. No exception if unhandled, just a wrong artifact (FR-19).
5. **Spec-count parity and `<tbody>` rules when §7 is absent.** Validators that assume a specs table exist may throw (loud) or, more dangerously, skip the check even when §7 should be present (FR-11, FR-21).
6. **Templates silently routing to the legacy path.** Removing the `consumables-resin` exclusion from `usesDocPipeline` changes routing for six stores; a store missing from the routing ladder falls back to legacy HTML with all nine paragraphs (FR-7 defect, no error).
7. **Stale persisted `templateId`.** App history/localStorage may hold `templateId: 'consumables-resin'`. After removal it matches no template: silently treated as Full or as an unknown template depending on the guard. The spec does not say. (History restore code in `app.component.ts` not surveyed in detail.)
8. **`data/usage.db` rows with `pipeline = 'consumables-doc'`.** Type literal removal is compile-time only; historical rows remain and any consumer that switches on the value will see an unexpected string.
9. **Accessories checkbox state leakage.** If the flag is not cleared/ignored when the template changes away from Accessories, a stale `true` could add §3 to a later run for another template (spec leaves reset behaviour to OD-6; approved default unchecked).
10. **Frozen-file checksum baseline** is stale-prone (memory note). `bash arch-guard.sh` can pass or fail for reasons unrelated to this Story; check `git diff` on the three frozen files, not only the guard output.
11. **Video/image survival (FR-22/23)** for templates that omit §3/§4, which are the natural hosts for video embeds and figures (Full `videoEmbeds` placement). Consumables previously opted out of video entirely; the new templates must not, and the standard pipeline's host paragraphs are absent in Spare parts (only §1, §5, §8). No error if the embed is simply dropped.

## Fixture and corpus impact

- Deleted: `test/fixtures/consumables/3ddevice-formlabs-fuse1-uptime-kit.uk-UA.html`, `test/fixtures/consumables-corpus/*.{ctx,doc}.json` (FR-20).
- Moved / to re-verify: `test/fixtures/corpus/` (2 items, full schema) via `render-reconciliation.spec.ts` and both conformance specs. Full-description output must be unchanged, so these should not move.
- New coverage needed and absent: no accepted simplified-template artifact exists for any template (Filaments, Accessories, Spare parts); Spare parts (only §1, §5, §8) and Accessories-with-§3 have no representative at all. `test/fixtures/v4-docs.ts` is the factory to extend; `test/tools/scaffold-doc.mjs` and `derive-ctx.mjs` derive fixtures from artifacts and reference the consumables shape (pins in `scaffold-doc.spec.ts`).
- Corpus gap per `render-reconciliation.report.md` §5 (two items, same product, two stores) applies: reconciliation covers byte-exactness only for stores with an accepted artifact; simplified templates can rely only on rules-based conformance.

## Blast-radius summary

US-2.2 is a wide, mostly subtractive change concentrated in three places. (1) The UI and input model: the single-entry template list, both dropdowns, EN/UA labels, the Accessories checkbox and the `templateId` plumbing in `app.component.*` and `types.ts`. (2) The generation core: the standard Doc schema and its TS type become paragraph-optional, the standard renderer learns to skip absent paragraphs and emit a single-`<tbody>` §7, `task-a-doc.ts` and `task-translate.ts` gain per-template paragraph sets, and the frozen `task-a.ts`, `task-c.ts` and `output-validator.ts` are edited under OD-9 for the legacy path, the overlay removal and the word-range gate; a dozen utils that read Doc fields need optional-field null-safety and re-verification. (3) Deletion of the whole consumables stack (about 11 source files, 8 specs/tests, 2 fixture directories) plus consumables branches in `content-orchestrator.service.ts` (the largest edit), `doc-pipeline-flag.ts`, `constants.ts`, `llm.service.ts` and the usage-store comment. uk-UA is the master, so generation changes reach all locales; translation changes reach translated locales only. The biggest risks are silent: Full-description byte identity, the shared schema relaxation loosening Full description, validator scope, and translation re-adding omitted paragraphs. All seven repository hazards were checked; the three FROZEN edits are approved but still require the §9 stop and re-baselined checksums. No file outside `docs/` is written by this analysis.

## Unknowns

1. **Full-description completeness after schema relaxation.** The spec makes paragraphs optional in the standard schema (FR-17) and says Full is unchanged, but does not say what enforces "all of 1-9 present" for Full. Settle in planning (validator or schema-level discriminator); not a spec blocker, but the planner must pick.
2. **FAQ handling for simplified templates.** FR-14 lists FAQ range; simplified templates request no §9. Whether the FAQ tabs/Task FAQ are suppressed for simplified templates is not stated. Resolve by reading `content-orchestrator.service.ts` FAQ flow and the Story.
3. **Persisted `templateId: 'consumables-resin'`** in history/local state (risk 7): not surveyed in `app.component.ts` restore code. Resolve by a targeted grep on history load.
4. **Whether `test/usage-store.spec.ts` / `llm-routes.spec.ts` assert the `'consumables-doc'` literal**: not confirmed; resolve with a grep at planning.
5. **Component spec presence**: no `*.component.spec.ts` was located in the survey greps; confirm with a glob to decide the runner for FR-1/2/9 tests.
6. **Paragraph-2 word counting and "rejected" mapping onto retry (OD-15)** were resolved by the human as "standard validator retry", but how paragraph 2 words are counted (Killer Specs block only, per FR-14) is a planning detail for the validator design.
7. **OD-8 (v4 internal contradictions) and OD-10 (label wording)** stay open and non-blocking; they affect prompt text and label strings, not the blast radius.
8. **Live-model behaviour** (whether a real model hits the v4 ranges reliably given the 5500 soft ceiling) cannot be determined by static survey.

---
artifact: impact_analysis
story: US-6.2
version: 2
status: DRAFT
owner: so-impact-analyzer
created_at: 2026-10-06T00:00:00Z
updated_at: 2026-10-07T00:00:00Z
supersedes: docs/impact-analysis/US-6.2-impact-analysis.md#1
inputs_consumed:
  - key: story
    version: 3
  - key: specification
    version: 2
  - key: open_decisions
    version: 3
---

# Impact analysis: US-6.2 (keep `<b>` / `<strong>` as supplied) - v2

v1 was built for the rejected `optimizer.ts`-override design and is fully replaced. All lists below were re-derived in this run by Grep/Bash over `src`, `test`, `server`.

## Design under survey (Specification v2)

1. Delete the `<b>` to `<strong>` block in `src/utils/html-cleaner.ts` (lines 164-169, comment "Replace all `<b>` tags with `<strong>` tags").
2. Edit the **FROZEN** `src/prompt-core/master-system-prompt.ts` (lines 475-476, inside `[FORMAT]`) by an exact-substring swap, under the human's explicit AGENTS.md section 9 permission recorded in Story v3.
3. `bash arch-guard.sh --rebaseline`, `.arch-guard-checksums` committed in the same commit as the FROZEN edit.
4. Update tests; regenerate `test/fixtures/golden/full-description-prompts.json`.

## FROZEN-file impact (loud)

**One FROZEN file is edited: `src/prompt-core/master-system-prompt.ts`.** This is a section 9 stop. It is cleared only by the human permission in Story v3 (2026-10-06); the plan and the plan gate must cite it. The other four FROZEN files (`task-a.ts`, `task-b.ts`, `task-c.ts`, `output-validator.ts`) need NO edit: they import the constant (`task-a.ts:173`, `task-c.ts:89`) and never contain the sentence (Grep for `Reserve <strong>` finds it only in the files listed below). Their checksums must not move (FR-9).

Verified this run: the current sha256 of all five FROZEN files equals `.arch-guard-checksums` today (baseline is in sync, so after the edit the only line that changes is `master-system-prompt.ts`; if `--rebaseline` shows any other file changed, something unintended was edited). `arch-guard.sh` FROZEN rule (lines 106-165) is the only arch-guard rule touched: it fails (exit 1) with "CHANGED (unauthorized?)" until `--rebaseline` is run; `--rebaseline` rewrites all five lines at once, so it must be run only after confirming that `git diff` shows exactly one FROZEN file changed.

## Affected files

### Must change

| File | Why |
|---|---|
| `src/utils/html-cleaner.ts` | Delete the b->strong block (164-169). Nothing else moves: heading hygiene (117-129) already unwraps both; `BR_ALLOWED_PARENTS` (153-156) already lists both `STRONG` and `B`. |
| `src/prompt-core/master-system-prompt.ts` (FROZEN) | Replace the 2-line sentence at 475-476 (`Reserve <strong> ... 2-3 per 500` / `characters maximum; use <b> for inline spec scannability.`) with `Use <b> for all emphasis (brands, models, specifications).`; trailing `Emit only tags that wrap content...` stays. The only occurrence of the sentence in the file. |
| `.arch-guard-checksums` | Re-baselined; one line changes (`master-system-prompt.ts`), same commit. |
| `test/fixtures/golden/full-description-prompts.json` | Regenerate: the exact master sentence occurs **10 times** (verified by script, once in `systemBlocks[0]` of each of 10 cases): `doc/expert3d`, `doc/expert3d+hook`, `doc/c3d`, `html/expert3d`, `html/legacy`, `html/legacy+lang`, `html/c3d+customTemplate`, `c/expert3d-es`, `c/eu-en`, `c/us-uk`. The 2 `translate/*` cases (translator, no master) contain 0. The three `doc/*` cases additionally contain `Reserve <strong>` once more (the `task-a-doc.ts:96` variant, A-6) which must stay byte-identical. Generator input is `test/fixtures/full-description-inputs.ts` (`GOLDEN_CASES`); the diff must be exactly 10 one-sentence replacements. |
| `src/utils/html-cleaner.spec.ts` | New tests FR-1..FR-3, FR-5..FR-7 (today the file has zero `strong` / `<b>` assertions - Grep). FR-6 needs `cleanStructureOnly()`, which lives on the service (see Unknowns). |
| A master-prompt spec (`src/prompt-core/master-system-prompt.spec.ts` is the natural home; it normalizes whitespace via `MASTER_SYSTEM_PROMPT.replace(/\s+/g,' ')`) | New FR-4 assertions: old sentence absent, new sentence present inside `[FORMAT]`. Placement is a planner decision. |

### Needs re-verification (unchanged)

- `src/prompts/optimizer.ts`: must have NO diff (FR-8). It sends `MASTER_SYSTEM_PROMPT` as `systemBlocks[0]` (line 117, `cache: true`) and says only `Heading hygiene ... unwrap <strong>/<b>/<span>` (line 94), which stays consistent.
- `src/prompts/task-a.ts`, `task-c.ts` (FROZEN, unchanged): consume the constant as `systemBlocks[0]`.
- `src/prompts/task-a-doc.ts:96`, `src/prompts/simplified-template-blocks.ts:127`: still say `Reserve <strong> for brands / main model / core USPs; use <b> for inline scannability.` (A-6, out of scope). After this change the Doc pipeline prompt contains two contradictory emphasis rules: master `[FORMAT]` (`<b>` for all emphasis) and `buildPromptA`'s restated clause. See silent-failure risks.
- `src/render/render-description.ts:74-77`: admits both `<b>` and `<strong>` in prose; unaffected. `src/domain/description-doc.ts:17-18` and `render-description.spec.ts:758` carry stale comments quoting the old sentence (A-6, comment-only).
- `src/domain/description-doc.schema.v4.spec.ts:268-291`: `hook` rejects an opening `<strong>` (N11); consistent with the new wording, unchanged.
- `src/prompts/task-a-doc.spec.ts:104,166` (`PROSE FIELDS ADMIT <b> and <strong>`), `task-doc-block-repair.spec.ts:48-50`: assert on doc-path text that is not edited; should stay green.
- `test/render-reconciliation.report.md:334` quotes the old sentence (a report, not asserted; A-6).
- Cleaner callers: exactly two. `optimize()` (`content-orchestrator.service.ts:1760`, LLM output) and `cleanStructureOnly()` (`:1779-1787`, Fast path, called from `app.component.ts:975`); both then run `finalizeTablesForDisplay`, whose `<td><b>label</b></td>` header building is independent. Other importers of `html-cleaner.ts` use different exports (`stripCodeFences`, `stripTiptapArtifacts`, `sanitizeUntrustedHtml`) and do not reach the deleted block.

### Tests that cover them

| Test | Role |
|---|---|
| `src/prompts/full-description.golden.spec.ts` | Byte-equality of `systemBlocks[i].text` against the golden for 12 cases; will FAIL until the fixture is regenerated (10 cases). This is the only test that byte-compares the master. |
| `src/prompt-core/master-system-prompt.image-markers.spec.ts` (lines 56-150) | Additions-only check of `[IMAGE HANDLING]` against pre-Story lines, and `systemBlocks[0].text === MASTER_SYSTEM_PROMPT` for A, C, Optimizer. Scoped to a section away from `[FORMAT]`; expected to stay green. |
| `master-system-prompt.spec.ts`, `master-system-prompt.v4.spec.ts`, `constants.spec.ts`, `src/prompts/task-a.spec.ts`, `optimizer.spec.ts`, `output-integrity-wiring.spec.ts`, `task-a-doc.v4.spec.ts`, `src/utils/image-figure-style.prompt-examples.spec.ts`, `src/domain/description-doc.schema.spec.ts`, `render-description.spec.ts` | Import the master prompt. A Grep for `Reserve <strong>`, `core USPs`, `2-3 per 500`, `density` found NO assertion on the old sentence outside the golden fixture, so no other test is expected to need updating (re-confirm by running `npm run test:logic`). `task-a.spec.ts` and `task-a-doc.spec.ts` also read the golden JSON (Grep on `full-description-prompts`). |
| `src/utils/html-cleaner.spec.ts`, `src/utils/image-figure-style.spec.ts:146-149` | Run `cleanHtmlStructure`; the latter asserts figure/img/figcaption styles, not tag names. |
| `test/render-reconciliation.spec.ts`, `test/render-conformance.spec.ts` | Corpus; see below. |

No test file exercises `optimize()` or `cleanStructureOnly()` today (Grep: only `html-cleaner.spec.ts`, `image-figure-style.spec.ts` and `render-reconciliation.spec.ts` (a comment) mention the cleaner). No existing spec contains a prompt-hash or cache-stability assertion on the master text (Grep for `hash`/`sha` in `src/prompt-core` specs hit only `hook-pattern.spec.ts`, which concerns hook selection).

New tests land in the **`npm run test:logic`** runner (not `*.component.spec.ts`).

## Pipelines that send MASTER_SYSTEM_PROMPT (re-derived)

Non-spec importers: `task-a.ts:173`, `task-c.ts:89`, `optimizer.ts:117`. Each places it as `systemBlocks[0]` with `cache: true`.

| Pipeline | Reached? | Meaning |
|---|---|---|
| Task A (uk-UA master, HTML path) | Yes | The uk-UA master is generated with the new emphasis rule, so **every locale's source changes** (hazard 2: master direction). |
| Doc pipeline (`buildPromptA` in `task-a-doc.ts`, gated by `doc-pipeline-flag.ts` per `STORE_REGISTRY`) | Yes, via the same constant; golden cases `doc/*` | Plus its own restated `Reserve <strong>` (A-6, untouched): contradictory prompts. |
| Task C (translation from uk-UA to every other locale) | Yes (golden `c/expert3d-es`, `c/eu-en`, `c/us-uk`) | Translated text now sees the new rule; Task C translates the master's already-generated tags, so its effect is on how it handles tags in new runs. |
| Optimizer (`buildOptimizerPrompt`) | Yes | This is the reported defect's second contributor; the fix lives here only through the master wording (no override). |
| Translator (`translate/*` golden cases) | No master | Unchanged. |
| Task B | Not sending the master (Grep: no import) | Unchanged; FROZEN, no edit. |

Locales: the change is locale-independent text shared by all `STORE_REGISTRY` stores/locales; no per-store branching exists. The cleaner is locale-independent.

## Hazard table

| # | Hazard | Applies? | Evidence |
|---|---|---|---|
| 1 | `STORE_REGISTRY` fan-out | Does NOT apply (no registry change). Re-derived consumers (Grep `STORE_REGISTRY` in `src`): `app.component.ts`, `editor-html-pipeline.ts`, `constants.ts`, `doc-pipeline-flag.ts`, `store-render-rules.ts`, `render-description.ts`, `language-consistency.ts`, plus specs. None are edited. The master text reaches all stores only because it is shared text. |
| 2 | uk-UA is the master | **Applies.** The master prompt is the one Task A sends for uk-UA generation; every translated locale (Task C) derives from it. Task C also sends it. So a prompt change here reaches every locale, but nothing is regenerated (Spec scope). |
| 3 | prompt -> schema -> renderer -> validator chain | Prompt link: edited (master). Schema (`description-doc.schema.ts`): not edited; `hook` must open with `<b>` (already). Renderer (`render-description.ts`): admits both tags, not edited. Validator (`output-validator.ts`, FROZEN): not edited; Grep finds no `<strong>` handling in it, so no AGENTS.md section 4 criterion is enforced on strong vs b. The Optimizer/Fast path do not call it. |
| 4 | FROZEN files | **Applies, one file** (`master-system-prompt.ts`), see the loud section above. |
| 5 | Corpus conformance harness | Checked, does not move. `test/fixtures/corpus/*.uk-UA.html` are static accepted artifacts (32 and 27 matches of `<strong`/`<b>`); the cleaner is not applied to them (`render-reconciliation.spec.ts:58` is a comment) and the Doc pipeline renderer is not changed. Corpus coverage gap (report section 5: only Ortur H20 20 W across two stores) is irrelevant here since no corpus fixture is asserted against tag-name conversion. |
| 6 | Two test runners | New tests land in `npm run test:logic`; none in `test:components`. |
| 7 | `server/**` no co-located tests | Checked, does not apply: `server/` does not import the master prompt or the cleaner (Grep for `MASTER_SYSTEM_PROMPT` in `server` returned nothing). The cached master block hash changes at the provider, which is server-agnostic (see cache note). |

## Silent-failure risks (no error raised)

1. **Live-model obedience is unproven (A-1).** Prompt text tests assert wording, not output. The model may keep emitting `<strong>` for brands; the cleaner now passes it through, so a mixed `b`/`strong` descriptions can reach the CMS with no error. Mitigation is only the manual release run on `Knowledge/Issues/1/strong-tags.txt`.
2. **Contradictory Doc-pipeline prompt.** `task-a-doc.ts:96` and `simplified-template-blocks.ts:127` (not edited) still tell the model to reserve `<strong>` for brands; the Doc pipeline sends both rules. Output for doc-pipeline stores can keep `<strong>`; nothing fails. Known and accepted (A-6/OD-11) but it undermines the "all emphasis `<b>`" goal on those stores.
3. **Previously the cleaner silently normalized to `<strong>`.** With the block gone, the Optimizer output tag mix now depends entirely on the model; a figcaption `<strong>` lead-in (AGENTS.md section 4 wants a `<b>` lead-in label) can no longer be rescued by the cleaner and is not checked by `output-validator.ts` on this path (OD-9 accepted limitation).
4. **Golden drift.** If the fixture is regenerated from a tree with any other uncommitted master change, or by a script that rewrites the `doc/*` `task-a-doc` clause, the fixture diff exceeds FR-10 while the spec still passes (the spec only asserts equality with whatever is in the JSON). The review must check the diff is exactly 10 one-sentence replacements.
5. **Density cap dropped.** The `2-3 per 500 characters` limit disappears with the sentence (A-4). Nothing deterministic caps bold density any more; over-bolding would not error.
6. **`--rebaseline` blast radius.** It records current checksums of all five FROZEN files. An accidental edit to another FROZEN file elsewhere in the working tree would be silently baked into the baseline if rebaselined without checking `git diff --stat`.
7. **Prompt cache.** The cached `systemBlocks[0]` changes once; first request per provider after deploy is a cache miss (cost/latency, not an error). `systemBlocks` must not be collapsed (NFR-2). No test hashes the master.
8. **AGENTS.md section 4 interplay.** The master text line 405/415 keeps `<figcaption><b>LEAD-IN LABEL:</b>`; the new "`<b>` for all emphasis" sentence is consistent. Nothing weakens the criterion. Whitespace risk: the swap must keep the line break structure of the surrounding sentence (`Emit only tags that wrap` is on line 476, continuing the old sentence's second line): the replaced text must retain exactly `Emit only tags that wrap content. Keep a high text-to-HTML ratio.` after the new sentence, or FR-8's "every other byte identical" is violated.
9. **"Already-generated masters keep their `<strong>`" claim:** verified plausible. Nothing deterministic re-reads stored descriptions: `HistoryService.add(input, content)` (`content-orchestrator.service.ts:1258, 1575`) only stores; the cleaner runs only on `optimize()` input/output and Fast-path input. A stored master is changed only if the operator re-runs the Optimizer/Fast path on it, and then it is now left untouched instead of normalised to `<strong>` (a behavioural change for any operator who relied on the normalisation). Task C translating a stored uk-UA master with `<strong>` tags will carry them through.

## Fixture and corpus impact

- **Moves:** `test/fixtures/golden/full-description-prompts.json` (10 of 12 entries, 1 sentence each).
- **Does not move:** `test/fixtures/corpus/*` (no cleaner or renderer change), `test/fixtures/full-description-inputs.ts`, `v4-docs.ts`, `simplified-docs.ts`.
- **Coverage:** no existing fixture covers cleaner b/strong behaviour; new unit tests with inline strings are enough (NFR-1). Corpus gap is not relevant.

## Blast-radius summary

A two-line functional change (delete one cleaner block; swap one sentence in the FROZEN master prompt) with a wide but shallow reach: the master text is sent by Task A (uk-UA master, therefore every locale), Task C, the Optimizer and the Doc pipeline, so every store and locale sees the new emphasis rule, but no schema, renderer, validator, registry or corpus fixture changes. The mechanical consequences are exactly: re-baseline of one checksum line, a 10-entry one-sentence golden regeneration, and new cleaner and master-prompt unit tests in `test:logic`. The real risks are behavioural and unverifiable by tests: model obedience, the contradictory Doc-pipeline clause left by A-6, and the loss of the cleaner's normalisation safety net.

## Unknowns

1. **FR-6 test location.** `cleanStructureOnly()` is a method on the orchestrator service with no existing spec; whether FR-6 is tested at service level (needs injecting `ContentOrchestratorService`, heavy) or at cleaner level (equivalent composition `finalizeTablesForDisplay(cleanHtmlStructure(x))`) is a planner decision. Resolve by the plan reviewing how `content-orchestrator.simplified.spec.ts` constructs the service.
2. **Whether `npm run test:logic` is otherwise green on the base tree** (not run: this stage does not run commands that mutate; the golden failing-before/passing-after behaviour was reasoned from `full-description.golden.spec.ts`, not executed). Resolve at TEST_WRITING / QUALITY_GATE.
3. **Which stores are on the Doc pipeline** (and so hit the contradictory clause): `doc-pipeline-flag.ts` was identified but its per-store map was not enumerated here. Resolve by reading it in planning if the human wants the A-6 residual quantified.
4. **Live model behaviour** (A-1): unknowable without a manual run.

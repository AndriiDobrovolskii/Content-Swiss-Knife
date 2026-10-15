---
artifact: reconciliation_report
story: US-8.1
version: 1
status: DRAFT
owner: so-reconciliation-reviewer
created_at: 2026-10-15T12:10:00Z
updated_at: 2026-10-15T12:10:00Z
supersedes: null
inputs_consumed:
  - {key: story, version: 2}
  - {key: specification, version: 2}
  - {key: ac_test_matrix, version: 2}
  - {key: implementation_report, version: 3}
  - {key: verification_report, version: 3}
open_decisions_blocking: false
---

# US-8.1 Reconciliation Report (branch feat/US-8.1-single-master-faq, base 27b01b8, HEAD 683ea75)

Verdict: **CHANGES_REQUIRED**, `loop_back_stage: changes_required_tests` (-> TEST_WRITING). 19 of 20 criteria clear all three levels (AC-10 to AC-12 and AC-4 clear with stated limitations). **AC-19 does not**: its test proves the Task C FAQ variant exists when `contentKind: 'faq'` is passed, but no test proves the production pipeline passes it. This was demonstrated by a mutation, not asserted by reading (see "Mutation probe"). This verdict is not human approval (AGENTS.md section 10).

## Evidence (real runs, read-only)

- `npx vitest run` on the 12 spec files the matrix names (faq-pipeline, faq-standalone, simplified, task-c.faq, task-c.description-bytes, task-faq, faq-html, faq-gate, structural-parity.faq, faq-form, tab-descriptors, app.component.template-wiring): 12 files, 1155 tests, 1155 passed.
- All 12 spec files and 3 fixtures (`test/fixtures/faq-pipeline.ts`, `test/fixtures/task-c-description-inputs.ts`, `test/fixtures/golden/task-c-description-prompts.json`) exist on the branch. Grep for `.skip`, `.todo`, `xit`, `xdescribe` over all of them: 0 hits. No `toBeTruthy()`/`toBeDefined()`-only assertion backs any AC (the only two `toBeDefined` calls are premises: faq-standalone line 224 precedes `expect(masterCall![1]).toBe(thinking)`, and faq-gate line 167 precedes a severity assertion).
- Test bodies read in full: all 12 specs. Source read: `app.component.html` (mode button, FAQ form, Generate button, tab loop, FAQ panel), `app.component.ts` (`isFaqFormValid`, `generateFaqOnly`, `tabDescriptors`, `clearAll`, label maps), `tab-descriptors.ts`, `faq-form.ts`, `content-orchestrator.service.ts` (`runFaqPipeline`, `faqTranslationPayload`, `generateFaqOnly`), the full `task-c.ts` diff, `history.service.ts`.
- `bash arch-guard.sh` run read-only on HEAD: "All frozen files unchanged", exit 0.
- Specs touched after the RED commit `01527f4`: exactly two commits, `c62e30a` (FR-21 NBSP) and `97d8913` (B-1 additions). No other test was edited to go green.

### Mutation probe (detached worktree under the scratchpad, removed afterwards; the repository tree was not touched, `git status` is clean)

In a throwaway worktree at HEAD I changed `faqTranslationPayload` in `content-orchestrator.service.ts` from `{ sourceLocale: MASTER_LOCALE, contentKind: 'faq' }` to `{ sourceLocale: MASTER_LOCALE }` and ran faq-pipeline, faq-standalone, simplified, all of `src/prompts`, and faq-gate: **30 files, 1442 tests, all passed.** So the real pipeline can silently send FAQ HTML through the full description Task C prompt (closing commercial H2, delivery-region sentence, H1 LOCK, master prompt) with every test green.

## Three-level check per criterion

L1 = matrix row exists. L2 = named file and test opened and found. L3 = body read; a violation of the criterion would fail it.

| AC | L1 | L2 | L3 | Why |
|---|---|---|---|---|
| AC-1 | yes | yes | yes | Per store (7), both entry points: the labels of all FAQ-generation calls equal exactly `['FAQ (uk-UA)']` and the prompt says "in Ukrainian"; generation calls for any other language filtered and asserted empty. Generation vs translation calls are told apart by payload (FAQ system block), not by label. Reading: "exactly one" holds for the first-valid case (OD-1 default); see item (3). |
| AC-2 | yes | yes | yes | All store languages present in `faqArtifacts`; uk-UA entry `toBe(FAQ_MASTER_HTML)`; each other language has exactly one translation call whose `userContent` contains the master and whose stored value carries the stub's `[iso]` marker (so it is the translation, not a copy of the master). |
| AC-3 | yes | yes | yes | Counts of h3/p/ul/li compared master vs each stored translation; `validateFaqStructuralParity` rejects dropped and added h3/p/ul/li (8 cases) with rule, severity, context and actual/expected counts; a differing translation is retried 3 times, skipped, and its parity issue stays in `validationIssues()` (not stored silently). "Goes through the repair gate" is shown behaviourally (3 calls, issue kept). |
| AC-4 | yes | yes | yes (data) | Pipeline: UA copy of every master/translation test, 7 stores. Tabs: `deriveTabDescriptors` for `ua-generator`, 7 stores, hand-written ordered literals, count of FAQ tabs equals `languages.length`, skipped language has no tab. Limitation: tabs are asserted as data only; no test renders the template. I read the chain by hand: `tabDescriptors` computed passes `appMode`, `content().website`, `faqArtifacts` into `deriveTabDescriptors`; the template `@for`s `tabDescriptors()` and the FAQ panel renders `content().faqArtifacts[tab.iso]` for `faq-english`/`faq-translation` with no mode condition. Correct, but unpinned. |
| AC-5 | yes | yes | yes | 42 guard tests (7 stores x 3 blank forms x 2 entry points): zero FAQ generation and translation calls, empty `faqArtifacts`, run completes. Also the simplified-template variants. |
| AC-6 | yes | yes | yes | The `[OUTPUT CONTRACT` section is sliced out and asserted to contain `<b>`, `<p>`, `<ul>`, `<li>` and no `<strong>` (regex on opening and closing), and no `<strong>` anywhere in the whole built prompt, with and without a locale overlay. A premise test proves the section was found. |
| AC-7 | yes | yes | yes | Model stub returns `<strong>` on EVERY call (master and each translation), 7 stores x 2 entry points + standalone: zero `<strong>` in every stored language, `<b>Так, рекомендовано.</b>` preserved, 3 `<b>` per FAQ, no extra attempt, and the master handed to translation is already `<b>`. `convertStrongToB` unit tests cover case, nesting, attributes, `<strongest>`, idempotence, totality. |
| AC-8 | yes | yes | yes | Exact lead string `<p><b>Так, рекомендовано.</b> Нагрівайте стіл` asserted in every stored language, pipeline and standalone; plus byte-for-byte conversion tests. |
| AC-9 | yes | yes | yes | Independent well-formedness checker in the spec (not production code) run on every stored FAQ; `validateFaqShape` tests for unclosed, mismatched, never-opened, 11 disallowed elements, attributes incl. `itemtype`, not starting with h3, Markdown; invalid master/translation regenerated and only the valid text stored; B-1 fail-closed cases. |
| AC-10 | yes | yes | partial (UI pins) | See item (1). |
| AC-11 | yes | yes | yes for behaviour, partial for UI wiring | Behaviour: `isFaqFormComplete` over all 8 field combinations, whitespace-only, every registry store; service guard: blank/whitespace/undefined Supplemental -> `mock.calls` equals `[]`, content, progress and history untouched. UI wiring is source-text only; see item (1). |
| AC-12 | yes | yes | yes | Service: blank and whitespace-only description/specs do not block (full FAQ produced); when filled, `ORIGINAL-DESCRIPTION-MARKER` and `TECH-SPECS-MARKER` appear in the master prompt `userContent`. Predicate takes no description/specs. Pins: `isFaqFormValid` block does not read them; `generateFaqOnly()` hands all three to `ProductInput`. |
| AC-13 | yes | yes | yes | Per store: `mainHtmlUa === ''`, `translations` `{}`, `seoData`/`slugData` `null`, `faqArtifacts` keys = all store languages, `generateJson` never called, and the set of all call labels contains only FAQ calls (JSON route absent, so a stray call throws). Stale-result replacement tested. |
| AC-14 | yes | yes | yes | Same-pipeline claim is tested by direct comparison: standalone vs `runGenerate` give equal call labels, equal master system blocks and user content, equal translation prompts call by call; plus the AC-7/8/9/16/17 groups re-run through `generateFaqOnly`. Structurally guaranteed too (one shared `runFaqPipeline`). |
| AC-15 | yes | yes | yes (mock boundary) | `historyAdd` called exactly once, with the input (`name`) and the content holding every language's FAQ. `HistoryService.add` is a stub; I read the real `add`: no filter that would drop a FAQ-only entry. Not a UI pin (the matrix row is orchestrator-level only). |
| AC-16 | yes | yes | yes | 3 attempts exactly (label list equals three `FAQ (uk-UA)`), no translation, nothing stored, run completes, per store; cap independent of `maxRepairs` 0/2/5; valid after two invalid -> stored with no further call; provider throw counts as an attempt; empty/whitespace master is terminal (1 call). |
| AC-17 | yes | yes | yes | Bad language gets exactly 3 translation calls, no entry, others keep entries and are translated once, final parity issue visible; provider-error and empty/whitespace variants; all-languages-failing leaves the master. |
| AC-18 | yes | yes | yes | See item (5). |
| AC-19 | yes | yes | **no (integration half)** | See "Finding F-1". Builder-level half is solid. |
| AC-20 | yes | n/a (mechanical by design) | yes | See item (6). |

## The seven points asked for

**(1) AC-10, AC-11, AC-12 UI pins and AC-15.** These are source-text pins plus behavioural tests of the extracted predicate and of the service. Judged one by one:
- AC-10 "mode labelled FAQ Generator alongside ...": pins establish that `setMode('faq-generator')` is on a button followed (within 500 chars) by some `{{ uiLabels().<key> }}`, that `AppMode` and `TOOL_LABEL` include it, and that the string "FAQ Generator" exists somewhere in each of the EN and UK label maps. They do NOT bind the button to the `faqGenerator` key: `faqOnlyTitle` carries the same string, so a button wired to `faqGenBtn` ("Generate FAQ") would pass. By reading, the template uses `uiLabels().faqGenerator`, which is 'FAQ Generator' in both maps (lines 49 and 222 of `app.component.ts`). The toggle half is adequate: the FAQ form block must contain `seoUseThinking` and `toggleSeoThinking()`, the same shared signal the SEO/Slug forms use, and the service test proves the value reaches the master call (true and false). "Alongside SEO Generator and Slug Generator" is not pinned (the button sits in the second switcher row beside UA Description). Verdict: establishes presence and toggle wiring; label identity and position are correct by my source read only.
- AC-11: the disabled expression `[disabled]="isGenerating() || !isFaqFormValid()"` is pinned verbatim, `isFaqFormValid` must go through `isFaqFormComplete`, and `generateFaqOnly()` must guard-and-return before calling the orchestrator. Not pinned: which signals feed the predicate, that the Store `<select>` writes `faqSelectedWebsite`, and that the Supplemental `app-source-input` writes `faqSupplementalContent` (only "at least 3 `app-source-input`"). I read all three and they are correct. The behaviour that matters (predicate truth table, no LLM call on blank input) is proven by real tests, so the criterion would fail on a logic violation; a wiring slip in the signal arguments would not be caught.
- AC-12: strong; behaviour proven at the service, the predicate and the pin on `generateFaqOnly()`.
- No rendered-DOM test and no real-browser check was performed (implementation report section 5; quality-gate report). The pins prove the wiring is present, not that the page behaves.
- Result: accepted with the limitation above. This follows the repository precedent (US-2.2 wiring pins, "no AppComponent spec"). It is recorded for the human gate, which should do a manual run of the FAQ Generator in a browser. The label-key and predicate-argument pins are cheap to tighten in the same loop-back as F-1 (recommended, not required).

**(2) AC-4 tabs as data only.** Accepted. The data is asserted exhaustively and by hand-written literals (7 stores, order, count, skip case). The template wiring is correct by my read (see AC-4 row) but unpinned. Same limitation as (1).

**(3) "Exactly one call" (AC-1/AC-14) vs "3 attempts" (AC-16).** The two readings are reconciled as the Specification states (FR-1, OD-1 default): "exactly one" is the first-valid-response case; 3 is the total of produce attempts per artifact, with a fixed cap independent of `maxRepairs`. The tests encode that faithfully and do not weaken either side: AC-1 asserts the label list is exactly one `FAQ (uk-UA)` when the first answer is valid, AC-16 asserts exactly three on invalid-every-time and that a valid master after two invalid ones ends the calls. This is a Spec-level reading the human approved by approving Spec v2 (OD-1 was listed as carried default); it is not a Story drift because the Story's AC-1 "exactly one" and AC-16 "at most 3" are only consistent under that reading and the Story's own Q1 asks the question. If the human overturns OD-1 the AC-16/AC-17 call counts change.

**(4) FR-21 NBSP correction (c62e30a).** Does not weaken the criterion. Before: `toContain('1.75 mm')` with an ASCII space; after: `toMatch(/1\.75\smm/)` plus the retained `not.toContain('1.75mm')`. The normaliser `number-format-fixer.ts` (unchanged, not in the diff) inserts U+00A0 between number and unit (lines 158-170), so the original assertion could never have been green for a correct implementation; `\s` covers NBSP and the master FR-21 guard already used `\s`. An adjoined unit still fails. Residual looseness: `\s` also accepts a regular space or any whitespace, which cannot hide the defect FR-21 guards (a missing space). Commit message and pipeline status record it as a test defect.

**(5) AC-18 golden captured from unmodified task-c.ts.** Confirmed. `git log` shows the golden, its inputs and the byte spec were committed once (`01527f4`, 2026-10-14T20:13:36+03:00) and never changed; `task-c.ts` had no change in `27b01b8..01527f4`; the first edit of `task-c.ts` is `da59195` at 20:19:52. 96 cases (16 store x language pairs x 4 corpus variants + 2 snippet variants, each with/without opts), SHA-256 and length of every system block and `userContent` plus the `cache` flag. Level 3: a one-byte change in any description prompt fails its case; the "never passes `contentKind`" rule keeps the spec type-clean at the unmodified file. Complementary: absent vs `'description'` contentKind build identical JSON for 16 pairs, and a description full of `<h3>` is not taken for a FAQ (no sniffing). Stored as digests, so a failure shows a hash mismatch, not a diff; acceptable.

**(6) AC-20.** Not a unit test by design. Verified directly: `bash arch-guard.sh` exit 0 on HEAD (frozen files unchanged vs `.arch-guard-checksums`). `task-c.ts` changed in exactly two commits since base, `da59195` (T1) and `8c89bce` (V-1 fix), each containing `.arch-guard-checksums` in the same commit (both `--stat` outputs list it). The whole `task-c.ts` diff `27b01b8..HEAD` has only 2 removed lines: the `import` line gaining `isoToHumanLang` and the `opts` type gaining `contentKind`; everything else is additive (an early `if (opts?.contentKind === 'faq')` return and the FAQ variant). `task-a.ts`, `task-b.ts`, `master-system-prompt.ts`, `output-validator.ts` untouched. AC-20 literally says "the task-c.ts edit" (singular); there are two edits, each with its own same-commit re-baseline and a recorded section 9 grant (pipeline-status lines 51 and 194). I could not independently observe the in-session grants themselves; the records exist. Clears.

**(7) B-1 / security tests: anything the Specification does not require? Partial coverage?**
- B-1 adds no AC. The R1-R3, R5, R6, R9 cases (unpaired quote, unterminated tag, bare `<`) fall under FR-9 "parses with no unclosed or mismatched tag". The R4 (HTML comment), R7 (processing instruction), R8 (CDATA) rejections and the effective rule "any `<` that does not open an exact `<h3|p|b|ul|li>` tag is a contract error" go beyond the literal Spec text (FR-9 speaks of elements and tags, not comments/PI/CDATA, and no raw `<` in prose). The matrix cites "the security non-functional requirement"; **Specification v2 has no security NFR** (NFR-1..NFR-8: provider, retrieval, prompts, caching, registry, secrets, compatibility, determinism). The additions are justified by the security review finding B-1, not by a Spec line. They are consistent with FR-9's intent, deliberately pin no single rule id, and the verification report (N-1) and security review (N-3) record the quality cost: a model that writes a raw `<` in prose (for example "< 0.1 mm") now costs attempts and may drop the FAQ, and neither FAQ prompt tells the model to write `&lt;`. Recommend the human decides whether to add an explicit security/escaping requirement to the Specification; not a blocker for AC compliance. This is a mild scope-tightening, not an AC contradiction.
- Partially covered Story criteria: none other than F-1 (AC-19 integration). AC-1/AC-14 are fully covered under the OD-1 reading; AC-4/AC-10/AC-11 have the UI limitation in (1)/(2).

## Finding F-1 (blocking): AC-19 production wiring is not tested

AC-19: "For a FAQ input ... the Task C prompt carries FAQ-specific instructions". `task-c.faq.spec.ts` proves, across 16 store-language pairs, that `buildPromptC(..., { contentKind: 'faq' })` carries element-for-element, per-language rules, none of the nine description-only markers, no master prompt, cached blocks, and that absent/'description' yields the description prompt. That half is strong. But nothing asserts that `faqTranslationPayload` (the only production caller, `content-orchestrator.service.ts:946`) passes `contentKind: 'faq'`. Grep: `contentKind` appears in no orchestrator spec or fixture (the pipeline spec header says it deliberately imports nothing the Story creates), and no service-level test inspects the translation `systemBlocks` for FAQ-variant text (the only `systemBlocks` comparisons there are Generator-vs-UA/standalone equality, which hold equally for the wrong prompt). The mutation probe above confirms 1442 green tests with the option removed. The consequence of the regression is exactly what AC-19, AC-3 and FR-12 item 3 exist to prevent: the FAQ translated with the description instruction set (closing H2, delivery sentence, H1 LOCK), in every store and language, while all gates stay green.
Required (TEST_WRITING): one assertion in the Table B pipeline/standalone specs that a FAQ translation call's `systemBlocks` are the FAQ variant (for example contain the element-for-element instruction and none of the description-only markers, without importing `contentKind`), per entry point. The Specification does not pin wording (OD-5), so assert on the FR-12 items, as `task-c.faq.spec.ts` already does.

## Drift from the approved Specification v2

- Requirements dropped: none. FR-1..FR-20 each map to implemented behaviour via the matrix and the diff (FR-14 arch-guard, FR-12/13 `task-c.ts`, FR-16..FR-20 `generateFaqOnly` and the component, FR-21..23 normaliser/prompt level as the Spec restates them).
- Behaviour changed during coding: none found against approved text. Two implementation choices sit inside undecided points (listed below).
- Scope added (checked against Out of scope by name): none of the Out-of-scope items is violated (no description/Optimizer/editor `<strong>` change, no FAQPage markup, no other mode changed, no `task-a/b`/`master-system-prompt`/`output-validator` edit). Additions the Story's Scope table and the Spec do not name: `tools/feedback-form/create-form.gs` (+1 dropdown entry "FAQ Generator", a feedback-tool label from task T9); the standalone result also sets `website` and `mainHtmlLocale: MASTER_LOCALE` in `content()` (needed for the tab descriptors and FAQ tab label; the matrix notes `website` as coming from the task breakdown, not from the AC text); the B-1 validator tightening discussed in (7). All small and traceable to plan tasks; surfaced for the human.
- Criterion reinterpreted: none silently. FR-21's NBSP assertion is a faithful restatement (point 4).

## Where the Story is wrong

No Story error found; `story_drift` is not needed. AC-1 vs AC-16 is consistent under the Spec's OD-1 reading; AC-3 (names `h3`/`p`/`li`) vs Scope (`h3`/`ul`/`li`) was resolved in the Spec by comparing `ul` too (OD-3); the tests pin the Spec form and still reject `h3`/`p`/`li` drops.

## Open Decisions and points the human still has to decide

- **OD-6** (translation model tier, normalizer chain, validators, protected-name block): not decided; no requirement written. Observable consequence: the FAQ translation path applies no `withProtectedNameBlock` (`faqTranslationPayload` comment) and its normaliser chain was not compared against the description loop. No AC depends on it; SP-2 (translations preserving numbers, units, names) is the related quality risk. Human decision recommended before merge.
- **OD-8** (surfacing a skipped language or dropped FAQ; history entry for a partial result): not decided. Implemented behaviour: a skipped language or dropped FAQ is `console.warn` plus a `validationIssues` entry only, and the history entry and "Done" progress are written even when the master FAQ fails (the pipeline never throws). No AC depends on it (AC-15 covers a completed run only).
- **OD-9(e)** (TXT/ZIP download of a FAQ-only run; also state reset on mode switch, history restore): not decided; the existing download controls appear because `hasOutput()` is true for a FAQ-only result, a standalone ZIP still carries an empty `description_uk-UA.html` (pipeline status). No AC depends on it.
- **SP-1** (provider error = one failed attempt, run continues): carried default in FR-10/FR-11. This one IS embedded in AC-16/AC-17 tests (the provider-error rows in pipeline, standalone and faq-gate). If the human overturns it, those tests change.
- **SP-2** (FAQ translation preserves numbers/units/names): no FR, no AC. SP-3 (store without uk-UA / N = 1): no FR, no AC; every registry store has uk-UA and N >= 2.
- Also carried as defaults inside Spec v2 and encoded in tests (the human approved the Spec, noted for completeness): OD-1 (call-count reading), OD-3 (`ul` counted), OD-4 (begin with `<h3>`, no attributes, empty master terminal), OD-5 (explicit option), OD-7 (pure rename, attributes kept, no `<b>` parity).
- AC dependency summary: AC-1, AC-14, AC-16, AC-17 depend on OD-1 and SP-1; AC-3 on OD-3; AC-9 on OD-4; AC-7 on OD-7; AC-18/AC-19 on OD-5. No AC depends on OD-6, OD-8, OD-9(e), SP-2 or SP-3.

## Non-blocking findings

- N-1: the matrix "State now"/"Green by" columns are the TEST_WRITING-time snapshot (RED, RED (import)); every referenced test is green now. The faq-form row claims whitespace "incl. NBSP"; the spec uses `'   '`, `'\t\n '` and no U+00A0 (the implementation's `trim()` would handle it, but it is not tested). Stale labels only; the matrix was not edited by this reviewer.
- N-2: the AC-10 and AC-11 pins are loose in the ways listed in (1); tightening them with F-1 is cheap.
- N-3: no browser or live-model check exists for AC-4, AC-10..AC-13 (implementation report section 5); a manual run of the FAQ Generator (all 7 stores' language tabs, bold rendering, Extended Thinking toggle) is advisable at HUMAN_PR_APPROVAL.
- N-4: verification-report N-1 (raw `<` in FAQ prose now a hard rejection, no `&lt;` hint in either FAQ prompt) and N-2 (stray whitespace edit `const MARKDOWN_BOLD =/...`) stand.

## Checklist

- [x] Every AC-n (1..20) processed.
- [x] Level 2 by opening files (12 specs, 3 fixtures) and running them.
- [x] Level 3 by reading test bodies; one mutation executed in a throwaway worktree, removed.
- [x] No `toBeTruthy()`-only, copied-from-actual, skipped or todo test backs a criterion.
- [x] Every FR checked for a dropped implementation; scope additions checked against Out of scope by name.
- [x] Verdict names a `loop_back` key present under RECONCILIATION in `stage-map.yaml` (`changes_required_tests`).
- [x] This PASS/CHANGES_REQUIRED is not human approval.

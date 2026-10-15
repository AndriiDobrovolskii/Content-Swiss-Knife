---
artifact: reconciliation_report
story: US-8.1
version: 2
status: DRAFT
owner: so-reconciliation-reviewer
created_at: 2026-10-15T14:00:00Z
updated_at: 2026-10-15T14:00:00Z
supersedes: docs/reconciliation/US-8.1-reconciliation-report.md#1
inputs_consumed:
  - {key: story, version: 2}
  - {key: specification, version: 2}
  - {key: ac_test_matrix, version: 3}
  - {key: implementation_report, version: 4}
  - {key: verification_report, version: 4}
open_decisions_blocking: false
---

# US-8.1 Reconciliation Report v2 (branch feat/US-8.1-single-master-faq, base 27b01b8, HEAD 16db315)

Verdict: **PASS**. All 20 acceptance criteria clear all three levels (AC-4, AC-10, AC-11 and AC-15 with stated, narrower limitations). Finding F-1 of v1 (AC-19 production wiring untested) is **resolved**: the new AC-19 integration tests fail for all three entry points and all 7 stores when `contentKind: 'faq'` is removed from the production translation call, which I re-ran myself. v1 (CHANGES_REQUIRED) is superseded (kept in git history, `docs/reconciliation/US-8.1-reconciliation-report.md#1`). This PASS is not human approval (AGENTS.md section 10); the human decisions listed under "Open Decisions and points the human still has to decide" remain open, and none of them blocks an AC.

## What changed since v1

`git diff 683ea75..HEAD -- src test server package.json .arch-guard-checksums` lists exactly five files: `src/app/app.component.template-wiring.spec.ts` (+96), `src/services/content-orchestrator.faq-pipeline.spec.ts` (+41), `src/services/content-orchestrator.faq-standalone.spec.ts` (+27), `test/fixtures/faq-pipeline.ts` (+44), and `src/utils/faq-html.ts` (one line, whitespace after `=` in `MARKDOWN_BOLD`, regex byte-identical). No production logic and no FROZEN file changed. Everything else is docs and workflow state. So the v1 level-3 readings of every other spec still stand; I re-read and re-ran them (below) rather than carrying them over by assertion.

## Evidence (real runs)

- `npx vitest run` on the 12 spec files the matrix names (faq-pipeline, faq-standalone, simplified, task-c.faq, task-c.description-bytes, task-faq, faq-html, faq-gate, structural-parity.faq, faq-form, tab-descriptors, app.component.template-wiring): **12 files, 1213 tests, 1213 passed** (v1: 1155; +58 matches the matrix).
- Grep for `.skip(`, `.todo(`, `xit(`, `xdescribe(` over the faq-pipeline, faq-standalone and wiring specs and the fixture: 0 hits. No `toBeTruthy()`/`toBeDefined()`-only assertion backs any AC.
- `bash arch-guard.sh` on HEAD: "All frozen files unchanged", exit 0. `git status --short`: empty.
- Matrix v3 rows: every named file exists; every named `describe`/`it` exists (checked against the test bodies below).

### Mutation probes, re-run independently (detached worktree under the scratchpad at HEAD 16db315, `node_modules` junctioned, run, then worktree removed)

Baseline in the worktree before any change: faq-pipeline + faq-standalone + simplified = 3 files, 736 tests, 736 passed.

| # | Mutation (production file `src/services/content-orchestrator.service.ts`) | Result (same 3 specs, 736 tests) |
|---|---|---|
| M1 | `faqTranslationPayload`: `{ sourceLocale: MASTER_LOCALE, contentKind: 'faq' }` -> `{ sourceLocale: MASTER_LOCALE }` (the exact v1 regression) | **21 failed, 715 passed.** The failures are precisely the new AC-19 integration tests, one per store x entry point: Generator 7, UA Description 7, standalone `generateFaqOnly` 7. Failure message: `FAQ translation (en-GB): expected [ ...(9) ] to deeply equal []` (nine problems: missing element-for-element instruction, description-only markers present, master prompt present). Nothing else failed, so each new test is the one that catches it. v1 saw 1442 green under the same mutation. |
| M2 | Generation call: master FAQ asked in English (`isoToHumanLang('en-GB')` instead of `MASTER_LOCALE`) | 21 failed: Generator 7, UA Description 7, standalone 7 (AC-1 / AC-14 per store). |
| M3 | Standalone entry point: `generateFaqOnly` no longer calls `historyService.add` (AC-15) | 14 failed, all in `faq-standalone.spec.ts` (AC-13/14/15 per store: 7; AC-17 per store: 7). |

Worktree removed (`git worktree remove --force` + `prune`; `git worktree list` shows only the main tree). The main repository tree was never edited; `git status --short` is empty; `node_modules` intact. The AC-10/AC-11 wiring pins' own mutations (label key to `faqOnlyTitle`; `productName` argument rewired) are claimed by the generation report; I did not re-run them, I read the pins against the template and source and confirm by reading that both mutations make the first pin of each block fail (see AC-10 and AC-11 below).

## Three-level check per criterion

L1 = matrix row exists. L2 = named file and test opened and found. L3 = body read; a violation of the criterion would fail it.

| AC | L1 | L2 | L3 | Why |
|---|---|---|---|---|
| AC-1 | yes | yes | yes | Per store (7), both entry points: labels of all FAQ-generation calls equal exactly `['FAQ (uk-UA)']`, prompt says "in Ukrainian"; no generation call for any other language. M2 fails it. "Exactly one" holds for the first-valid case (OD-1 default). |
| AC-2 | yes | yes | yes | All store languages present in `faqArtifacts`; uk-UA entry equals the master; each other language has exactly one translation call whose `userContent` contains the master and whose stored value carries the stub's `[iso]` marker (a translation, not a copy). |
| AC-3 | yes | yes | yes | h3/p/ul/li counts compared master vs each stored translation; `validateFaqStructuralParity` rejects dropped and added h3/p/ul/li (8 cases); a differing translation is retried 3 times, skipped, its parity issue stays in `validationIssues()`. |
| AC-4 | yes | yes | yes (data) | Pipeline: UA copy of every master/translation test, 7 stores. Tabs: `deriveTabDescriptors` for `ua-generator`, 7 stores, hand-written ordered literals, count equals `languages.length`, skipped language has no tab. Limitation: tabs asserted as data; no rendered-DOM test. I re-read the chain: `tabDescriptors` computed passes `appMode`, `content().website` and `faqArtifacts`; the template iterates `tabDescriptors()` and renders `content().faqArtifacts[tab.iso]`. Correct by reading, unpinned in DOM. |
| AC-5 | yes | yes | yes | 42 guard tests (7 stores x 3 blank forms x 2 entry points): zero FAQ generation and translation calls, empty `faqArtifacts`; plus the simplified-template variants. |
| AC-6 | yes | yes | yes | `[OUTPUT CONTRACT` section sliced out and asserted to contain `<b>`, `<p>`, `<ul>`, `<li>` and no `<strong>`; no `<strong>` in the whole built prompt, with and without an overlay; a premise test proves the section was found. |
| AC-7 | yes | yes | yes | Model stub returns `<strong>` on every call; 7 stores x 2 entry points + standalone: zero `<strong>` in every stored language, text kept inside `<b>`, no extra attempt, the master handed to translation is already `<b>`. `convertStrongToB` unit tests (case, nesting, attributes, `<strongest>`, idempotence, totality). |
| AC-8 | yes | yes | yes | Exact lead string `<p><b>Так, рекомендовано.</b> Нагрівайте стіл` asserted in every stored language, pipeline and standalone; byte-for-byte conversion tests. |
| AC-9 | yes | yes | yes | Independent well-formedness checker in the spec run on every stored FAQ; `validateFaqShape` tests for unclosed, mismatched, never-opened, 11 disallowed elements, attributes incl. `itemtype`, not starting with h3, Markdown; invalid master/translation regenerated and only the valid text stored; B-1 fail-closed cases. |
| AC-10 | yes | yes | yes, with a stated limit | See "Re-judged limitations (a)". Strengthened pins now bind the button to the `faqGenerator` key. |
| AC-11 | yes | yes | yes for behaviour; wiring pinned at source level | See (b). Strengthened pins now bind the predicate's three arguments and the three inputs' signals. |
| AC-12 | yes | yes | yes | Service: blank/whitespace description and specs do not block; when filled their markers appear in the master prompt `userContent`. Predicate takes no description/specs (pinned: exactly three arguments). `generateFaqOnly()` hands all three to `ProductInput`. |
| AC-13 | yes | yes | yes | Per store: `mainHtmlUa === ''`, `translations` `{}`, `seoData`/`slugData` `null`, `faqArtifacts` keys = all store languages, `generateJson` never called, only FAQ call labels exist. Stale result replaced. |
| AC-14 | yes | yes | yes | Standalone vs `runGenerate`: equal call labels, equal master system blocks and user content, equal translation prompts call by call; AC-7/8/9/16/17 groups re-run through `generateFaqOnly`. Shared `runFaqPipeline`. M1/M2 fail it on the standalone path too. |
| AC-15 | yes | yes | yes (mock boundary) | `historyAdd` called exactly once with the input and content holding every language's FAQ. M3 fails 7 tests. `HistoryService.add` is a stub in the spec; I read the real `add` in v1: no filter that drops a FAQ-only entry. Not a UI pin. |
| AC-16 | yes | yes | yes | Exactly 3 attempts (three `FAQ (uk-UA)` labels), no translation, nothing stored, run completes; cap independent of `maxRepairs` 0/2/5; valid after two invalid stored with no further call; provider throw counts as an attempt; empty master terminal (1 call). |
| AC-17 | yes | yes | yes | Bad language gets exactly 3 translation calls, no entry, others kept and translated once, parity issue visible; provider-error and empty variants; all-languages-failing leaves the master. |
| AC-18 | yes | yes | yes | See (d). |
| AC-19 | yes | yes | **yes (both halves)** | Builder half: `task-c.faq.spec.ts` (element-for-element, per-language rules, nine description-only markers absent, no master prompt, cached blocks) and `structural-parity.faq.spec.ts` (accepts matching h3/p/li counts, rejects drop/add). **Integration half (new): see (c).** |
| AC-20 | yes | n/a (mechanical by design) | yes | See (f). |

## The points asked for

**(a) AC-10 with the strengthened pins.** Read in full. `modeButton('faq-generator')` isolates the one `<button (click)="setMode('faq-generator')" ...</button>` and the first pin asserts the `{{ uiLabels().x }}` keys inside it equal exactly `['faqGenerator']`. The template (`app.component.html:121-124`) has `{{ uiLabels().faqGenerator }}`; the EN and UK maps both read `faqGenerator: 'FAQ Generator'` (`app.component.ts:49,222`), pinned by the second test against both label blocks. A button rewired to `faqOnlyTitle` or `faqGenBtn` now fails the first pin (the v1 hole is closed). "Alongside SEO Generator and Slug Generator" is pinned as: the one mode-switcher slice (from `setMode('dashboard')` to the History Panel comment) contains `setMode` for faq-generator, seo-generator and slug-generator, and the FAQ button follows UA Description's button with no `</div>` between them. That is presence in the same switcher and the same row as UA Description, not a position next to SEO/Slugs; the Story's "alongside" (appears among the modes) is satisfied by that reading, and I read the template to confirm it is. The Extended Thinking toggle: the FAQ form block must contain `seoUseThinking` / `toggleSeoThinking()` (the shared signal) and the service test proves the value reaches the master call (true and false). Remaining limit: source-text pins plus behavioural service tests; there is no rendered DOM and no browser check. Accepted, matching the repository precedent (US-2.2 wiring pins).

**(b) AC-11 and AC-12 with the strengthened pins.** The disabled expression `[disabled]="isGenerating() || !isFaqFormValid()"` is pinned verbatim (`app.component.html:941`). New: `isFaqFormValid` is read from `app.component.ts:715-721` as `isFaqFormComplete({ website: this.faqSelectedWebsite(), productName: this.faqProductName(), supplementalContent: this.faqSupplementalContent() })` and the pins assert each key-to-signal pair by regex and that the argument keys are exactly `website, productName, supplementalContent` (so no description/specs, which is also the AC-12 "optional" guarantee). The Store `<select>` is pinned to `onFaqWebsiteChange($event)` whose handler must `faqSelectedWebsite.set(`; the Product Name `<input>` to `updateFaqProductName($event)` that sets `faqProductName`; the Supplemental `app-source-input` to `(valueChange)="faqSupplementalContent.set($event)"`, `[value]`, `[required]="true"`, exactly one such. A rewiring such as `productName: this.faqDescription()` fails the first pin. The behaviour that decides the criterion is proven by real tests: `isFaqFormComplete` over all 8 field combinations, whitespace-only (spaces, tab, newline), every registry store; the service guard for blank/whitespace/undefined Supplemental (`mock.calls` equals `[]`, content, progress and history untouched). Residual limit: not rendered, and U+00A0-only input is untested (the implementation `trim()` covers it). Accepted.

**(c) AC-19 integration half.** Opened `faq-pipeline.spec.ts` (new block after the AC-14 group, loop over `MODES` = Generator and UA Description x `describe.each(STORES)` = all 7 registry stores) and `faq-standalone.spec.ts` (same, `generateFaqOnly`). Each store runs a premise test (the set of FAQ translation languages captured equals `STORE_REGISTRY[store].languages` minus uk-UA and the call count equals that number, so an empty capture cannot make the loop vacuous) and the main test: for every captured FAQ translation call, `faqTranslationPromptProblems(c.payload)` is `[]`. The helper (fixture) reads only what the stubbed model received (`systemBlocks` + `userContent`), never `contentKind`: it requires an element-for-element instruction, names `<h3> <p> <ul> <li>` in the system blocks, an instruction forbidding added elements, none of the nine description-only markers (`</section>`, `<hr`, `<h2`, `COMMERCIAL CLOSING`, `CTA`, `H1 LOCK`, `Technical specifications`, `What's in the box`, `[Delivery`) anywhere in system or user text, and no slice of `MASTER_SYSTEM_PROMPT`. A discrimination control (Generator, 7 stores) proves the marker list does flag the same run's real description translation calls (`looksLikeDescriptionPrompt` true, problems non-empty). It asserts the FR-12 items, not wording (OD-5), so legitimate rewording of the FAQ prompt does not break it, while the closing-H2 / delivery sentence / H1 LOCK regression does. Verified by M1 above: 21 failures, exactly 7 per entry point. **F-1 is resolved.**

**(d) AC-18 golden.** Unchanged since v1: the golden, its inputs and the byte spec were committed once (`01527f4`) before the first `task-c.ts` edit (`da59195`); `git diff 683ea75..HEAD` touches none of them. 96 cases, SHA-256 and length of every system block and `userContent` plus the `cache` flag, over 16 store x language pairs x 4 corpus variants + 2 snippet variants. Part of the 1213-test run, green. Clears.

**(e) FR-21 NBSP correction (c62e30a).** Does not weaken the criterion; unchanged and re-judged. `toContain('1.75 mm')` could never have held for a correct implementation because `number-format-fixer.ts` (untouched) inserts U+00A0; `toMatch(/1\.75\smm/)` plus the retained `not.toContain('1.75mm')` still fails if the space is missing, which is the defect FR-21 guards. `\s` also admits a regular space; that cannot hide the defect.

**(f) AC-20.** Not a unit test by design. `bash arch-guard.sh` exit 0 on HEAD. `task-c.ts` changed in exactly two commits since base (`da59195`, `8c89bce`), each with `.arch-guard-checksums` in the same commit; the whole diff has only two removed lines (the import gaining `isoToHumanLang`, the `opts` type gaining `contentKind`), everything else additive and gated on `opts?.contentKind === 'faq'`. `task-a.ts`, `task-b.ts`, `master-system-prompt.ts`, `output-validator.ts` untouched. The Story says "the task-c.ts edit" (singular); there are two edits, each with its own re-baseline and recorded section 9 grant; the in-session grants themselves are not independently observable, the records exist. Clears.

**(g) B-1 additions beyond the literal Specification, including FR-9 text.** B-1 adds no AC. Rejection of an unpaired quote, an unterminated tag and a bare `<` (R1-R3, R5, R6, R9) is within FR-9 "no unclosed or mismatched tag". Rejection of HTML comments, processing instructions and CDATA (R4, R7, R8), and the effective rule "any `<` that does not open an exact `<h3|p|b|ul|li>` tag is a contract error", go beyond the literal FR-9 text (FR-9 speaks of elements and tags, not comments/PI/CDATA, and no raw `<` in prose). The matrix still says "the security non-functional requirement"; **Specification v2 has no security NFR** (NFR-1..NFR-8: provider, retrieval, prompts, caching, registry, secrets, compatibility, determinism). The additions are justified by security finding B-1, not by a Specification line. They are consistent with FR-9's intent, pin no single rule id, and touch no AC outcome: the AC-9 tests assert what the Story states (well-formed, only five elements) and the B-1 tests assert strictly more. This is a mild scope-tightening, not an AC contradiction and not a drop of a requirement. Recorded for the human (see decisions below), including the quality cost: a model that writes a raw `<` in prose (for example "< 0.1 mm") now costs attempts and can drop the FAQ, and neither FAQ prompt tells the model to write `&lt;`.

## Drift from the approved Specification v2

- Requirements dropped: none. FR-1..FR-20 each map to implemented behaviour via the matrix and the diff (FR-12/13 in `task-c.ts`, FR-14 arch-guard, FR-16..FR-20 `generateFaqOnly` and the component, FR-21..23 at normaliser/prompt level as the Specification restates them).
- Behaviour changed during coding: none found against approved text.
- Scope added (checked against Out of scope by name): no Out-of-scope item is violated (no description/Optimizer/editor `<strong>` change, no FAQPage markup, no other mode changed, no `task-a/b`/`master-system-prompt`/`output-validator` edit). Additions the Specification and Scope table do not name: `tools/feedback-form/create-form.gs` (+1 dropdown entry "FAQ Generator"), the standalone result also sets `website` and `mainHtmlLocale: MASTER_LOCALE` in `content()` (needed for tab descriptors; from the task breakdown), and the B-1 tightening (g). All small and traceable to plan tasks or to a security finding.
- Criterion reinterpreted: none silently. The "3 attempts" versus "exactly one call" reading is the Specification's OD-1 default, approved with Spec v2.

## Where the Story is wrong

No Story error found; `story_drift` is not needed. AC-1 "exactly one" vs AC-16 "at most 3" is consistent under the Specification's OD-1 reading; AC-3 (names `h3`/`p`/`li`) vs Scope (`h3`/`ul`/`li`) was resolved in the Specification by also comparing `ul` (OD-3).

## Open Decisions and points the human still has to decide

None of these is resolved by this review, and none is an AC blocker.

- **OD-6** (FAQ translation model tier, normaliser chain, validators, protected-name block): undecided. Observable consequence: `faqTranslationPayload` applies no `withProtectedNameBlock`, and the FAQ translation normaliser chain was not compared against the description loop. No AC depends on it. Related quality risk SP-2.
- **OD-8** (surfacing a skipped language or dropped FAQ; history entry for a partial result): undecided. Implemented: a skipped language or dropped FAQ is `console.warn` plus a `validationIssues` entry; the history entry and "Done" progress are written even when the master FAQ fails. No AC depends on it (AC-15 covers a completed run).
- **OD-9(e)** (TXT/ZIP download of a FAQ-only run; state reset on mode switch; history restore): undecided. The existing download controls appear for a FAQ-only result and a standalone ZIP still carries an empty `description_uk-UA.html` (pipeline status). No AC depends on it.
- **SP-1** (provider error = one failed attempt, run continues): carried default in FR-10/FR-11, and it IS encoded in AC-16 and AC-17 tests (the provider-error rows in pipeline, standalone and faq-gate). If overturned, those tests change. **SP-2** (FAQ translation preserves numbers/units/names): no FR, no AC. **SP-3** (store without uk-UA / N = 1): no FR, no AC; every registry store has uk-UA and at least 2 languages.
- **N-3** (security review, low): `PERMITTED_TAG` uses `\s`, wider than HTML whitespace, so `<b >` / `<h3 >` padded with a Unicode space is accepted and an `<h3 >` question would render an empty FAQ in `parseFaqItems`. No attribute, quote or value is reachable; security PASS. No AC depends on it (AC-9 asserts no attributes and the five elements).
- **Raw `<` behaviour** (verification N-1 / security): raw `<` in FAQ prose is now a hard contract rejection, with no `&lt;` hint in either FAQ prompt. Human choice: add a one-line `&lt;` hint to the FAQ prompts, accept the quality cost, or add an explicit security/escaping requirement to the Specification. No AC depends on it.
- Also carried as defaults inside Spec v2 and encoded in tests (approved with the Specification): OD-1 (call-count reading), OD-3 (`ul` counted), OD-4 (begin with `<h3>`, no attributes, empty master terminal), OD-5 (explicit option), OD-7 (pure rename, attributes kept, no `<b>` parity).
- **AC dependency summary:** AC-1, AC-14, AC-16, AC-17 depend on OD-1 and SP-1; AC-3 on OD-3; AC-9 on OD-4; AC-7 on OD-7; AC-18/AC-19 on OD-5. **No AC depends on OD-6, OD-8, OD-9(e), SP-2, SP-3, N-3 or the raw `<` behaviour.**

## Non-blocking findings

- N-1: matrix v3 still reads "the security non-functional requirement" in the B-1 addendum although Spec v2 has none; stale wording only (see g). The matrix was not edited by this reviewer.
- N-2: AC-4, AC-10, AC-11, AC-12, AC-13 UI wiring is source-text pins plus data/behaviour tests; no rendered-DOM test and no browser or live-model check exists (implementation report section 5). A manual run of the FAQ Generator in a browser (all 7 stores' language tabs, bold rendering, Extended Thinking toggle, Generate disabled states) is advisable at HUMAN_PR_APPROVAL.
- N-3: the AC-10 "alongside" pin is presence in the same switcher/row as UA Description, not adjacency to the SEO/Slugs buttons.
- N-4: verification-report N-2 (stray whitespace edit) is resolved by `d33292c`; verification N-1 (raw `<`) stands.

## Checklist

- [x] Every AC-n (1..20) processed at three levels.
- [x] Level 2 by opening files (12 specs, 3 fixtures) and running them: 12 files, 1213 passed.
- [x] Level 3 by reading test bodies; three mutations executed in a throwaway worktree (M1 AC-19 translation call, M2 generation call, M3 standalone history), worktree removed, repository tree clean.
- [x] No `toBeTruthy()`-only, copied-from-actual, skipped or todo test backs a criterion.
- [x] Every FR checked for a dropped implementation; scope additions checked against Out of scope by name.
- [x] Verdict PASS, so no loop-back; (for reference) the available keys under RECONCILIATION are `changes_required`, `changes_required_tests`, `story_drift`.
- [x] This PASS is not human approval.

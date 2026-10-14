---
artifact: ac_test_matrix
story: US-8.1
version: 1
status: DRAFT
owner: so-test-writer
created_at: 2026-10-14T19:45:00Z
updated_at: 2026-10-14T19:45:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 2
  - key: implementation_plan
    version: 1
  - key: task_breakdown
    version: 3
  - key: test_strategy
    version: 1
open_decisions_blocking: false
---

# AC <-> Test Matrix - US-8.1

Ids are the Story's `AC-n` (Story v2). Every file named below exists in the repository now. State is the observed state after TEST_WRITING:

- `RED` = fails now, by assertion, for the reason recorded in the generation report.
- `RED (import)` = the spec cannot load until the owner task creates the module (task breakdown constraint 4: red by absent module, by design).
- `RED (not a function)` = the spec loads, the symbol it calls does not exist yet.
- `guard` = green now by design; pins behaviour that must survive the change (marked per row, the red tests of the same AC are listed beside it).

Spec abbreviations: `pipeline` = `src/services/content-orchestrator.faq-pipeline.spec.ts`; `standalone` = `src/services/content-orchestrator.faq-standalone.spec.ts`; `simplified` = `src/services/content-orchestrator.simplified.spec.ts`; `task-c.faq` = `src/prompts/task-c.faq.spec.ts`; `bytes` = `src/prompts/task-c.description-bytes.spec.ts`; `task-faq` = `src/prompts/task-faq.spec.ts`; `faq-html` = `src/utils/faq-html.spec.ts`; `faq-gate` = `src/utils/faq-gate.spec.ts`; `parity` = `src/utils/structural-parity.faq.spec.ts`; `faq-form` = `src/utils/faq-form.spec.ts`; `tabs` = `src/app/tab-descriptors.spec.ts`; `wiring` = `src/app/app.component.template-wiring.spec.ts`. "G" = the Generator-mode copy of a pipeline group, "UA" = the UA Description copy (the groups are defined once and run for both entry points). "per store" = `describe.each` over all 7 `STORE_REGISTRY` stores.

| AC | Test file | Test (describe > it) | State now | Green by |
|---|---|---|---|---|
| AC-1 | pipeline | "G single master and translations - store <each> (AC-1, ...)" > "AC-1: exactly ONE FAQ generation call is made in the whole run, and it is the uk-UA master"; > "AC-1: no FAQ generation call is made for any other language of the store" | G: RED (7 stores x 2). UA: guard (UA already makes one call) | T6 |
| AC-1 | simplified | "R6 (human resolution) - FAQ artifact: data-driven, one uk-UA master ..." > "<template> + FAQ source materials: ONE uk-UA FAQ is generated and translated into every other store language" (x4 templates) | RED (rewritten) | T6 |
| AC-1 | standalone | "AC-13 / AC-14 / AC-15 ..." > "store <each>" > "AC-14: one uk-UA generation call and one translation sequence per other language (N-1 translations)" | RED (not a function) | T8 |
| AC-2 | pipeline | "... AC-2: every other entry was produced by TRANSLATING the master: one translation sequence per language, carrying the master" | G and UA: RED (7 stores x 2) | T6, T7 |
| AC-2 | pipeline | "... AC-2: faqArtifacts has an entry for EVERY language of the store"; "AC-2: the uk-UA entry is the master text" | G: guard (today's per-language loop also fills every language). UA: RED for the first, guard for the second | T7 |
| AC-2 | simplified | R6 Generator tests (above) assert `faqArtifacts` keys = all store languages and one translation call per non-master language | RED | T6 |
| AC-3 | parity | "FR-3 / AC-3 / AC-19: the FAQ comparison accepts matching counts" (4 tests); "... rejects a dropped or an added element" (it.each: dropped `<h3>`, `<p>`, `<ul>`, `<li>`; added `<h3>`, `<p>`, `<ul>`, `<li>`) | RED (not a function), 16; 2 NFR-7 description guards green | T4 |
| AC-3 | faq-gate | "buildFaqValidator - a translation (`master` supplied): FR-3 / AC-3 / AC-17" > "%s is a structural-parity-count ERROR, visible as an issue" (6 cases) and "its parity issues are exactly validateFaqStructuralParity(master, html, context)" | RED (import) | T5 |
| AC-3 | pipeline | "... AC-3: each translation has the same number of <h3>, <p>, <ul> and <li> as the master" | G: guard. UA: RED | T7 |
| AC-3 | pipeline | "AC-17: a translation fails structural parity on every attempt" (a differing translation is not stored silently) | RED | T6, T7 |
| AC-4 | pipeline | UA copy of "single master and translations": AC-2 entries for every language and the translation sequence | UA: RED (7 stores) | T7 |
| AC-4 | simplified | "R6 ... UA-only mode (generateUaContent)" > "with FAQ source materials: ONE uk-UA FAQ generation, translated into every other store language, for a simplified template" | RED (rewritten) | T7 |
| AC-4 | tabs | "UA Description (AC-4 UI side, FR-4): one description tab, then a FAQ tab per language with an entry" > per store (7), "shows exactly one FAQ tab per store language", "only the uk-UA FAQ present", "a skipped language has no tab" | RED (import) | T10 |
| AC-5 | pipeline | G and UA > "trigger - store <each> (AC-5)" > "Supplemental Content an empty string / whitespace only / undefined: no FAQ generation call, no FAQ translation call, faqArtifacts empty" | guard (42 tests); no red by design, the trigger is unchanged | none (must stay green) |
| AC-5 | simplified | "R6 ..." > "<template> + NO FAQ source materials: the FAQ step is skipped"; "whitespace-only supplemental content counts as 'not provided'" (unchanged) | guard | none |
| AC-6 | task-faq | "buildPromptFaq - AC-6: <b> is a permitted answer tag, <strong> is not" > "the output contract does not list <strong>"; "no <strong> appears anywhere in the built prompt"; "still absent when a locale overlay is supplied"; and "the output contract lists <b> among the permitted tags" | 3 RED, 2 guard (`<b>` is already listed; the section is found) | T2 |
| AC-7 | faq-html | "convertStrongToB - AC-7 / FR-7" (plain, case-insensitive, attributes untouched, nested, `<strongest>` untouched, running text untouched, idempotent, total on garbage) | RED (import) | T3 |
| AC-7 | pipeline | G and UA > "<b> instead of <strong> - store <each> (AC-7, AC-8)" > "a model that answers with <strong> on EVERY call still stores zero <strong> for every language"; "the emphasised text is preserved inside <b>, master and translations alike"; "<strong> alone costs no attempt"; "the master handed to translation already uses <b>" | RED (G and UA) | T6, T7 |
| AC-7 | standalone | "AC-14 (AC-7, AC-8): <b> only ..." > per store "a model that answers with <strong> on every call still stores zero <strong>, the text kept inside <b>, no extra attempt" | RED (not a function) | T8 |
| AC-8 | faq-html | "AC-8 / FR-8: a bold lead sentence in an answer is preserved byte for byte" (3 tests) | RED (import) | T3 |
| AC-8 | pipeline | "... AC-8: a bold lead sentence inside <p> is stored unchanged, master and translations (green guard)" per store, G and UA | guard (14) | none (must stay green) |
| AC-8 | standalone | "AC-14 (AC-7, AC-8) ..." > "a bold lead sentence inside <p> is stored unchanged" | RED (not a function) | T8 |
| AC-9 | faq-html | "validateFaqShape - AC-9 / FR-9" (unclosed, mismatched, never-opened, 11 disallowed elements, 6 attribute cases incl. `itemtype`, not starting `<h3>`, Markdown, empty yields nothing, issue shape, five rule ids only) | RED (import) | T3 |
| AC-9 | faq-gate | "buildFaqValidator - the master" > 6 contract-error cases + storability; "isFaqStorable - the only storage decision" | RED (import) | T5 |
| AC-9 | pipeline | "AC-9: not-valid HTML is regenerated, and only a valid FAQ is stored" > master per store (invalid first answer, valid second stored), translation per store, attribute, missing leading `<h3>`; and "... AC-9: every stored FAQ is well-formed and holds only h3, p, b, ul, li" | retry tests RED; the well-formedness test is a guard in both entry points (it must keep holding) | T6, T7 |
| AC-9 | standalone | "AC-9 (AC-14): a not-valid answer is regenerated, only a valid FAQ is stored" and the well-formedness test per store | RED (not a function) | T8 |
| AC-10 | wiring | "US-8.1 T9 / AC-10 / FR-15 ..." > "AppMode includes "faq-generator""; "TOOL_LABEL ... maps it to "FAQ Generator""; "US-8.1 T11 / AC-10 - the mode label "FAQ Generator" exists in BOTH UI languages"; "US-8.1 T12 / AC-10 - the FAQ Generator in the template" > "the mode switcher offers a "FAQ Generator" button labelled from the UI label map"; "the FAQ form has the same Extended Thinking toggle ... (shared signal)" | RED (6), 1 premise green | T9, T11, T12 |
| AC-10 | standalone | "Extended Thinking: the toggle value reaches the master FAQ call" (true / false) | RED (not a function) | T8 |
| AC-11 | faq-form | "AC-11: Generate is enabled only when Store, Product Name and Supplemental Content are all filled" (empty, whitespace-only incl. NBSP, all 8 field combinations, every registry store) | RED (import) | T9 |
| AC-11 | wiring | "US-8.1 T11 / AC-11 / FR-16" > "isFaqFormValid is computed through the pure predicate isFaqFormComplete"; "generateFaqOnly() re-checks isFaqFormValid() and RETURNS before any orchestrator call"; "US-8.1 T12 / AC-11 - the Generate button" > "calls generateFaqOnly() and is disabled while generating or while the form is invalid" | RED | T11, T12 |
| AC-11 | standalone | "FR-16 failure path / FR-5: blank Supplemental Content makes no call and changes no state" (empty, whitespace-only, undefined: zero calls, content and progress untouched, no history entry) | RED (not a function) | T8 |
| AC-12 | faq-form | "AC-12: Original Description and Tech Specs are optional context" (2 tests) | RED (import) | T9 |
| AC-12 | standalone | "AC-12: Original Description and Tech Specs are optional grounding context" > "both blank strings", "whitespace only" (not blocked) and "when filled they reach the FAQ generation prompt as grounding context" | RED (not a function) | T8 |
| AC-12 | wiring | "US-8.1 T11 / AC-11 / FR-16" > "AC-12: the validity computation does not read Original Description or Tech Specs"; "what generateFaqOnly() hands the orchestrator" > "Original Description, Tech Specs and Supplemental Content all reach the ProductInput"; "T12" > "the FAQ form takes Original Description, Tech Specs and Supplemental Content as text inputs" | RED | T11, T12 |
| AC-13 | standalone | "AC-13 / AC-14 / AC-15 ..." > per store: "afterwards mainHtmlUa is "", translations is {}, seoData and slugData are null"; "faqArtifacts has an entry for EVERY language"; "NO call is made for the master description, SEO metadata or slugs"; "AC-13: a previous result is replaced, not merged into"; "AC-16 / FR-18 failure path" > "the other fields keep their AC-13 values" | RED (not a function) | T8 |
| AC-13 | tabs | "FAQ Generator (AC-13 UI side, plan R9): FAQ tabs only, uk-UA first" (7 stores, stale `translations`, master-only, failed master) | RED (import) | T10 |
| AC-13 | wiring | "US-8.1 T12 / AC-13 UI side" > ""faq-generator" sits beside "slug-generator" in the three result-view conditions"; "the SEO tab button is not offered for the FAQ Generator" | RED | T12 |
| AC-14 | standalone | "AC-14: it is the SAME pipeline as Generator mode - same FAQ calls, same labels, same prompts" per store; plus the AC-7/8/9/16/17 groups above | RED (not a function) | T8 |
| AC-14 | pipeline | "FR-19 / AC-14: Generator and UA Description run the same FAQ pipeline" > same labels, identical master prompt, identical translation prompts, UA translates no description | RED (7 stores x 3); 1 guard per store | T7 |
| AC-15 | standalone | "AC-15: exactly one history entry, holding the input and the produced FAQ" per store | RED (not a function) | T8 |
| AC-16 | pipeline | G and UA > "AC-16: the uk-UA master" > "invalid on every attempt - store <each>" (exactly 3 attempts, no translation, nothing stored, run completes); "the cap of 3 is fixed, independent of the user repair setting (maxRepairs = 0, 2, 5)"; "a valid master after two invalid ones is stored"; "the master call itself throws (a provider error)" (all attempts / once); "an empty or whitespace-only master response is terminal" (one call, no retry, nothing stored, no translation, description retained) | RED; the "run completes / description retained" halves are guards | T6, T7 |
| AC-16 | faq-gate | "constants" > "FAQ_MAX_ATTEMPTS is 3"; "buildFaqValidator - provider failure (SP-1 default)" (4 tests); "isFaqStorable" | RED (import) | T5 |
| AC-16 | standalone | "AC-16 / FR-18 failure path: the uk-UA master" (invalid x3 per store, cap 0/2/5, empty / whitespace, provider error all / first) | RED (not a function) | T8 |
| AC-17 | pipeline | G and UA > "AC-17: a translation" > "fails structural parity on every attempt - store <each>" (3 attempts, skipped, others kept and translated once, parity issue visible in `validationIssues`, description retained); "call throws (a provider error)" (all / once); "empty / whitespace-only translation is a parity failure"; "every language failing leaves the master stored" | RED; "description retained" halves are guards | T6, T7 |
| AC-17 | faq-gate | "buildFaqValidator - a translation" (parity errors visible; shape before parity order) | RED (import) | T5 |
| AC-17 | standalone | "AC-17: a translation, in the standalone run" (parity per store, provider error, empty) | RED (not a function) | T8 |
| AC-18 | bytes | "AC-18 / FR-13: description translation prompts are byte-identical to the pre-Story golden" > 96 case tests (`<store> \| <lang> \| <variant>`), "premise: ... 16 store x non-master-language pairs", "every pair is covered both without opts and with opts", "is a pure function of its input" | guard, 100 tests green (characterization) | none (must stay green through T1) |
| AC-18 | task-c.faq | "AC-18, other side: only the explicit option selects the FAQ variant" > "contentKind "description" and an absent contentKind build the same prompt" (16), "a description full of <h3> category headings is NOT taken for a FAQ without the option", "the snippet (standalone) description path is unaffected" | guard (18) | none |
| AC-19 | task-c.faq | "FR-12 item 1 ... element-for-element" (16); "FR-12 item 3 ..." > nine description-only markers absent (16), localizedName not echoed / no H1 LOCK (16), master prompt absent (16), different payload; "FR-12 item 2 ..." per-language rules kept (16 + Castilian `usted` + distinct blocks); "NFR-4: caching ..." (16 + purity) | 65 RED, 55 guard (the per-language identity checks already hold for the description prompt and must keep holding) | T1 |
| AC-19 | parity | the AC-3 tests above ("accepts a translation with matching `h3`/`p`/`li` counts and rejects one that drops or adds an `h3`, `p` or `li`") | RED (not a function) | T4 |
| AC-20 | (none) | Not a unit test: `bash arch-guard.sh` exits 0 after `--rebaseline`; `.arch-guard-checksums` in the same commit as the `task-c.ts` edit; one-line checksum diff (T1 acceptance) | n/a. `bash arch-guard.sh` exits 0 on the branch now (task-c.ts and the checksums unmodified) | T1 + QUALITY_GATE |
| (section 4) FR-21 | pipeline | "AGENTS.md section 4 at normaliser level" > "FR-21 (green guard): a number adjoined to a unit in the master is stored with the space"; "FR-21: <store> - the English translation of a number adjoined to a unit is stored as "1.75 mm"" (stores with an `en-*` language) | master: guard (G and UA); English translation: RED | T6, T7 |
| (section 4) FR-22 | faq-html | "Markdown syntax (...) is reported as faq-markdown-syntax"; `<br>` in the disallowed-element cases | RED (import) | T3 |
| (section 4) FR-23 | faq-html | the `itemtype` and `itemtype FAQPage` attribute cases | RED (import) | T3 |
| (section 4) FR-23 | pipeline | "FR-23 (green guard): the terminology normaliser is still applied to the uk-UA master (an anglicism is replaced)" | guard (G and UA) | none |
| (section 4) FR-21/23 prompt | task-c.faq | "FR-12 item 2" (unit and number rules, decimal separator, register) | see AC-19 | T1 |

## Coverage

Every `AC-1` to `AC-19` has at least one named, existing test that is red now (or, for AC-5, AC-8 and AC-18, an explicit guard that must stay green). `AC-20` is mechanical and verified by `arch-guard`, not a unit test. No AC was left without a row. Test counts: see the test generation report.

## Rows RECONCILIATION should read critically

- AC-10, AC-11 and AC-12 UI rows are **source-text pins** (`wiring`), not rendered-DOM assertions; they prove the wiring is present, not that the page behaves. The behaviour half is covered by `faq-form` (the predicate) and `standalone` (the guard on the service).
- AC-13 "afterwards `website` is recorded" and AC-15's history content / progress line come from the approved task breakdown (T8), not from the AC text.
- AC-4 "the UI shows a FAQ tab for each" is covered as data (`tabs`), not as rendered tabs.

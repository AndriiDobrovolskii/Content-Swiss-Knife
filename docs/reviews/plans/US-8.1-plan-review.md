---
artifact: plan_review
story: US-8.1
version: 3
status: APPROVED
owner: so-plan-reviewer
created_at: 2026-10-14T23:00:00Z
updated_at: 2026-10-15T01:00:00Z
supersedes: docs/reviews/plans/US-8.1-plan-review.md#2
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 2
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 1
  - key: task_breakdown
    version: 3
open_decisions_blocking: false
---

# Plan Review: US-8.1 — One master FAQ, translated; `<b>` not `<strong>`; standalone FAQ Generator

**Verdict:** PASS
**Loop-back:** n/a

> `PASS` here is **not** human approval. Only `/so:approve` records that (AGENTS.md section 10). The plan and task breakdown
> stay `DRAFT` until HUMAN_PLAN_APPROVAL.

This is the third pass over the task breakdown (re-review of task_breakdown v3 after loop-back attempt 2 of 3). It supersedes
plan_review v2, which recorded task_breakdown v2 and returned CHANGES_REQUIRED on R4. All inputs consumed are current
(Specification v2 APPROVED; impact analysis v1; plan v1; task breakdown v3 DRAFT; none SUPERSEDED).

## Summary

R4 is fixed in the normative task text, not only in the revision notes, and the whole per-task compile gate holds when walked
task by task T1 to T13 against the repository as it stands today. No further spec-vs-allowlist or dependency-order defect of
the R4 class was found. The design, the single FROZEN edit (T1, with the section 9 stop), Rule 2 and the ordering are
unchanged and sound. Remaining points are non-blocking.

## Resolution of v2 required change R4

| Where R4 had to be fixed | v3 text (read, not taken from the revision table) | Verdict |
|---|---|---|
| Table A / Table B ownership | "Spec ownership and the allowlist": table A lists exactly seven specs, each with one owner task (task-c.faq T1, faq-html T3, structural-parity.faq T4, faq-gate T5, faq-standalone T8, faq-form T9, tab-descriptors T10). Table B lists five specs that are never allowlisted: task-faq, faq-pipeline, simplified (R6 block), template-wiring, description-bytes. The v2 clause "plus `faq-gate` and `faq-html`" is gone. | resolved |
| Constraint 1 / 1a | Constraint 1 splits the orchestrator specs (`faq-pipeline` for T6/T7, `faq-standalone` for T8). Constraint 1a forbids table B specs from importing anything a task of this Story creates, and names `faq-gate` / `faq-html` explicitly as not importable by the orchestrator specs. | resolved |
| Constraint 6 | Report requirement: per spec its table, plus the exact `tsc --noEmit` diagnostics after TEST_WRITING; any diagnostic in a table B spec is a defect to fix before the stage ends. | resolved |
| "Remaining red specs" table | Rows T1 to T9 list only table A members, shrinking as owners land; T10 to T13 empty. Re-derived below; consistent with the ownership table. | resolved |
| T2, T6, T7, T8, T9 acceptance lines | T2: table B spec carries no diagnostic, allowlist unchanged from T1. T6: allowlist is faq-standalone / faq-form / tab-descriptors; `faq-pipeline` and `simplified` carry none. T7: same allowlist, both specs it runs are table B. T8: faq-standalone carries none after the task. T9: allowlist is tab-descriptors only. All agree with the table. | resolved |

Mechanism re-verified on the repository: `tsconfig.json` includes `src/**/*` and `test/**/*`, has no `strict`, so a missing
module or export yields diagnostics located in the importing spec only (no cascade); `npm run lint` is `tsc --noEmit`;
`angular.json` build uses the same `tsconfig.json`; `npx tsc --noEmit` is clean today (run in this review, no output) and
`bash arch-guard.sh` exits 0 today (run in this review). The observable check (`grep "error TS" | grep -v -E "(path|...)\("`)
matches tsc's `path(line,col): error TSnnnn` format and is path-based, so it excuses exactly the named files.

## Per-task compile-gate walk, T1 to T13 (independent)

For each task: what exists at that point, which specs are table A and not yet owned (excused), and whether the task's own
allowlist and owned tests are achievable.

| Task | Symbols/modules available at task end | Excused (table A, owner not landed) | Table B specs | Achievable? |
|---|---|---|---|---|
| T1 | `contentKind` option, FAQ variant in `task-c.ts` | faq-html, structural-parity.faq, faq-gate, faq-standalone, faq-form, tab-descriptors | `description-bytes` green before and after (never passes `contentKind`; `buildPromptC` opts today is `{ localizedName?; sourceLocale? }`, checked); `task-faq` / `faq-pipeline` / `simplified` / `template-wiring` import only existing symbols | yes. `task-c.faq.spec` turns clean at T1. arch-guard: baseline matches today; rebaseline in the same commit is a one-line diff (file has one line per frozen file) |
| T2 | `task-faq.ts` tag list | same as T1 | `task-faq` runtime-red then green | yes. Only `task-faq.ts` lines 24 and 53 mention `strong`; no existing spec pins the old tag list |
| T3 | `faq-html.ts` (needs only the `ValidationIssue` type from the frozen validator) | structural-parity.faq, faq-gate, faq-standalone, faq-form, tab-descriptors | unchanged | yes |
| T4 | `validateFaqStructuralParity` appended | faq-gate, faq-standalone, faq-form, tab-descriptors | unchanged | yes |
| T5 | `faq-gate.ts` (imports `faq-html` T3, `validateFaqStructuralParity` T4, frozen `validateGeneratedHtml`, `repair-strategy`) | faq-standalone, faq-form, tab-descriptors | unchanged | yes. `faq-gate.spec` may import `faq-html` and the parity export: both exist, T5 depends on T3 and T4 |
| T6 | `runFaqPipeline`, `storeFaq` in the service; T1, T3, T4, T5 present | faq-standalone, faq-form, tab-descriptors | `faq-pipeline` (Generator groups green; UA groups runtime-red until T7) and `simplified` (R6 Generator part) import nothing new, so no diagnostic at any task | yes. Only `simplified.spec` references FAQ among existing specs (grep), and it is the one TEST_WRITING rewrites |
| T7 | `generateUaContent()` Step 4 replaced | same as T6 | UA groups and UA part of R6 turn green | yes |
| T8 | `generateFaqOnly` on the service | faq-form, tab-descriptors | `faq-pipeline` entirely green (T7 landed; dependency line now `T6, T7`) | yes |
| T9 | `'faq-generator'` in `AppMode`, `TOOL_LABEL` entry, `faq-form.ts` | tab-descriptors | `template-wiring` `TOOL_LABEL` pins | yes. `TOOL_LABEL` is the only `Record<AppMode, ...>` in `src/` and the only `AppMode` consumer besides `setMode(mode: AppMode)` (grep), so non-spec diagnostics stay zero with the single `app.component.ts` line |
| T10 | `tab-descriptors.ts`; `TabDescriptor` (id, label, type, color, iso, taskKey?, isFaq) exists in `types.ts` as the context needs | none | unchanged | yes; allowlist empty, lint and build exit 0 |
| T11 | component state, `generateFaqOnly()` call (T8), `isFaqFormComplete` (T9) | none | `template-wiring` component pins | yes |
| T12 | template bindings to T11 signals | none | `template-wiring` template pins | yes |
| T13 | README only | none | none | yes |

Re-derived allowlist rows (after T1 .. T13) match the breakdown's table exactly. Group A order permutations are covered by the
stated rule. Three further classes checked and clear:

- **Spec-vs-allowlist (R4 class), every spec.** Each of the 12 new or extended specs was matched against the symbols it
  can need: table A specs import only symbols that exist at the end of their owner; table B specs import nothing created by
  this Story. No spec needs an allowlist row it does not have.
- **Dependency order.** T5 after T3 and T4; T6 after T1, T3, T4, T5; T7 after T6; T8 after T6 and T7; T10 after T9 (needs
  the `'faq-generator'` literal); T11 after T8, T9, T10; T12 after T11. The three `app.component.ts` tasks and the three
  service tasks are serial. No consumer is scheduled before its contract.
- **Existing-test regressions (gate item 2).** Existing specs that read `app.component.ts` / `.html` as text
  (`template-wiring`, `export-guard`, `content-template-labels`) pin: `content-template-select` exactly twice, no
  `/consumables/i` in the template, the `includeFunctionality` occurrence count, the `downloadZip` / `downloadText` bodies.
  None is contradicted by T9 to T12 as scoped (the FAQ form has no template select, no download code changes).

## 1. Specification coverage (re-derived, both directions)

| FR | Reached by task(s) | Verdict |
|---|---|---|
| FR-1, FR-2 | T6 (master `FAQ (uk-UA)`, sequential translation, `storeFaq`), T8 | covered |
| FR-3 | T4, T5, T6 | covered |
| FR-4 | T7 (call site), T10 (tab per language) | covered |
| FR-5 | T6, T7, T8 | covered |
| FR-6 | T2 | covered |
| FR-7, FR-8 | T3, T6 (three placements: after fence strip, around `repairBlocks`, in `storeFaq`) | covered |
| FR-9 | T3, T5, T6 | covered |
| FR-10, FR-11 | T5 (`FAQ_MAX_ATTEMPTS`, storability, `faq-provider-error`), T6 (empty master terminal, skip, issues pushed); T7 mirrors in UA mode | covered |
| FR-12, FR-13, FR-14 | T1 (variant, 16-pair golden, checksum re-baseline in the same commit) | covered |
| FR-15, FR-16 | T9, T11, T12 (+ T8 guard) | covered |
| FR-17, FR-18, FR-19, FR-20 | T8 (+ T10 tab side of FR-18; T11, T12 grounding inputs) | covered |
| FR-21, FR-22, FR-23 | T6 (normaliser chain kept), T3 (whitelist, Markdown rule, attribute rule), T1 (prompt rules) | covered |
| NFR-1..8 | T6, T1/T2, T3 to T5; NFR-2 review-by-reading | covered |

AC-1 to AC-20 each reachable through the tasks implementing their FRs and each has a named test file (T1: AC-18/19/20; T2:
AC-6; T3: AC-7/8/9; T4: AC-3/19; T5: AC-3/9/16/17; T6: AC-1/2/5/7/8/9/16/17; T7: AC-4 and UA-mode 16/17; T8:
AC-12/13/14/15; T9, T11, T12: AC-10/11/12; T10: AC-4 and AC-13 UI sides). 16 store x non-master-language pairs confirmed from
`STORE_REGISTRY` (2+2+2+4+1+3+2).

| Task | Traces to | Verdict |
|---|---|---|
| T1 | plan D4, D8; FR-12/13/14 | ok |
| T2 | plan D2; FR-6 | ok |
| T3 | plan D7; FR-7/8/9/22 | ok |
| T4 | plan D3; FR-3 | ok |
| T5 | plan D6; FR-9/10/11 | ok |
| T6 | plan D5; FR-1/2/5/7/10/11/19/21/23 | ok (largest task, one cohesive file) |
| T7 | plan D5; FR-4 | ok |
| T8 | plan D11; FR-17/18/19/20 | ok |
| T9 | plan D9; FR-15/16 | ok. The `create-form.gs` line is not in the Story Surface or the survey; marked "confirm at approval or drop", no test depends on it |
| T10 | plan D9; FR-4/18 | ok |
| T11, T12 | plan D9; FR-15/16/17 | ok |
| T13 | plan D9; Story Surface lists README | ok |

Checked against the Specification's *Out of scope* by name: no task touches the `<h3>` tag or its CMS rendering, makes the FAQ
unconditional, changes description / Optimizer / HTML-editor `<b>`/`<strong>` handling, adds FAQPage markup, changes question
count or word target, changes another mode or SEO / slug generation, or edits `task-a.ts`, `task-b.ts`,
`master-system-prompt.ts`, `output-validator.ts`. No scope creep other than the one marked `create-form.gs` line. Export of a
FAQ-only run (OD-9(e)) is left undecided and no download code changes, consistent with Out of scope.

## 2. FROZEN files (AGENTS.md section 9)

| Task | Frozen file touched | Section 9 stop present? | Sibling-file pattern used? | Verdict |
|---|---|---|---|---|
| T1 | `src/prompts/task-c.ts` (additive FAQ variant, early branch) | yes: states file, exact change and reason; requires the operator's instruction "in the builder's own session"; Story v2 is only the record of the earlier grant; a second stop is named if `master-system-prompt.ts` or `constants.ts` is needed | no, correctly: `buildPromptC` is the dispatch point | ok |
| T1 | `.arch-guard-checksums` | n/a (baseline); same commit, one-line diff | n/a | ok |
| T3, T5 | `src/utils/output-validator.ts` | not edited; FR-9 lives in sibling `faq-html.ts`; T5 imports `validateGeneratedHtml` and asserts no diff | yes | ok |
| all others | none | n/a | n/a | ok |

Plan assumes approval it does not have: **no.**

## 3. Architecture rules (AGENTS.md section 3)

| Rule | Checked | Finding |
|---|---|---|
| 1 — no direct SDK outside `server/providers/` | T6, T8 call `this.llm.generateText`; no `server/**` edit | clear |
| **2 — retrieval separate from generation** (no automated check anywhere) | Checked by reading T6, T7, T8, T11 and the existing Step 5 code they replace: no search or page-fetch call in any new path; `generateFaqOnly` has no grounding step; FR-17 context is operator-typed text; v3 added no network call | clear. arch-guard cannot see this; IMPLEMENTATION_VERIFICATION must re-read the diff |
| 3 — prompt text out of services | FAQ translation text lives in `task-c.ts`; the service holds wiring (`faqTranslationPayload` seam); T6 acceptance runs `arch-guard.sh` | clear |
| 4 — no key in the bundle | no `server/**` change, no env var | clear |
| 5 — no existing feature broken | byte-identity golden for 16 pairs; `validateStructuralParity` and its html-editor caller untouched; Generator tab behaviour kept by move-only diff plus hand-derived literals | clear |
| `STORE_REGISTRY` sole source of locales/currency | languages via `getLangsForStore` / `store.languages`, symbol via `store.currencySymbol`, `MASTER_LOCALE` constant, `deriveTabDescriptors` resolves the store itself | clear |
| `systemBlocks` not collapsed into `userContent` | FAQ variant keeps cached `systemBlocks`, dynamic data in `userContent` (T1, tested under NFR-4) | clear |

## 4. prompt -> schema -> renderer -> validator

- Links touched: prompt (`task-faq.ts` tag list; Task C FAQ variant) and validator (siblings `faq-html.ts`, `faq-gate.ts`,
  `validateFaqStructuralParity`). The FAQ has no Zod schema and no renderer; `faqArtifacts` stays `Record<string,string>`;
  `src/domain/**` and `src/render/**` untouched.
- Stay in agreement: yes. T2 (master prompt), T1 (translation prompt), T3 (normaliser and validator), T5, T6 (store choke
  point) all name the same five-element, `<b>`-only contract.
- Contract-before-consumer ordering holds: yes (see the dependency walk above).
- AGENTS.md section 4 criteria in play (number/unit spacing, HTML only, no `<br>`, anglicisms, no Product `itemtype`): each
  has an enforcement point (T6 normaliser chain, T3 whitelist and Markdown rule, T1 and T6 terminology). List complete for
  what is in play.

## 5. Task quality

| Check | Result |
|---|---|
| All eight fields present on every task | Yes, T1 to T13 (track, depends on, FROZEN, what changes, files, tests, acceptance, notes) |
| Acceptance checks observable | Yes. Compile rule is a concrete `tsc | grep -v` pipeline; build is judged by `tsc` as proxy until T10, then exit 0 |
| Each task could end in one green commit (section 13) | Yes under the per-task gate (own tests pass, no regression, compile rule, arch-guard exit 0, scope = Files table). The gate is an interpretation of AGENTS.md section 6 for a tests-first branch and is carried to the human as an open point |
| No task spans two tracks | Yes (T9's `create-form.gs` line is explicitly a non-track config edit) |
| Ordered by dependency and risk, riskiest first, rationale stated | Yes. T1 first (FROZEN edit plus the load-bearing D4/D8 assumption) |
| Fixture updates sit with the change that moves them | Yes (golden before the `task-c.ts` hunk; R6 block rewrite owned by TEST_WRITING and consumed by T6/T7) |

## 6. Test strategy

| Check | Result |
|---|---|
| Every task names test files **and** runner | Yes, all `test:logic`; T13 states it changes no behaviour (documentation only) |
| Component specs named `*.component.spec.ts` | Not applicable: no component spec is added; `app.component.template-wiring.spec.ts` does not match the Karma suffix and runs in the logic runner as intended |
| Untested tasks justify changing no behaviour | Yes (T13) |
| Failure paths from the FRs are covered | Yes. v3 added the empty / whitespace master terminal case and the translation provider-throw case to T6 and mirrored both in T7 |
| Nothing relies on weakening/skipping a test (section 7.7) | Yes. The R6 block is rewritten because it pins the retired per-language contract; no golden regenerated with `-u`; constraint 5 forbids snapshots |

Constraint 4 (a brand-new module's spec is red by absent module) departs from the literal text of `so-test-writer`, follows
the US-5.1 / US-7.1 precedent, requires the four specs to be named in the report and a runtime reason for every other spec,
and is now listed under "Open points carried to HUMAN_PLAN_APPROVAL" (v2 non-blocking item addressed).

## 7. Impact-analysis fidelity

- Plan consumed the survey rather than re-deriving it: yes. The one deliberate departure (`repair-strategy.ts` not edited)
  is correct: a path-less rule resolves to `['full-regen']`, and T5 pins that.
- Files touched but not surveyed: `tools/feedback-form/create-form.gs` (T9, flagged as scope growth with a drop option); new
  sibling modules `faq-form.ts`, `faq-gate.ts`, `tab-descriptors.ts` are planner decisions, not survey gaps.

## Verdict rationale

The single blocking defect from v2 (R4) is fixed consistently in all five places it lives (ownership tables, constraint 1 /
1a / 6, remaining-red table, T2/T6/T7/T8/T9 acceptance), and a full independent walk of the compile gate from T1 to T13 finds
no task whose allowlist is unachievable, no acceptance criterion left unreachable, and no consumer scheduled before its
contract. Nothing remains that a task-breakdown, plan or Specification revision must fix before the human gate, so `PASS`.
This is a verdict, not approval.

## Non-blocking findings

- **T6 wording on languages.** `getLangsForStore(...).transLangs` returns Task C language keys (`bcp47ToTaskCLang`), not
  ISO codes, and it takes a store name, not a profile. The builder must map keys back with `taskLangToIso` (or iterate
  `store.languages` minus `MASTER_LOCALE`) to build `FAQ translation (${iso})` and the `faqArtifacts` keys. Wording only.
- **Non-spec TEST_WRITING helpers.** The gate admits zero diagnostics in non-spec files, but constraint 1a names specs only.
  If TEST_WRITING adds a shared stub harness under `test/` or `src/`, it must obey the same import rule. Worth one sentence.
- **Diagnostic-code list in gate item 3.** tsc also reports TS2724 ("no exported member ... did you mean") for a missing export
  with a similarly named one (for example `validateFaqStructuralParity` next to `validateStructuralParity`). The observable
  check is path-based so it is excused in practice; the prose list could say "missing-symbol kinds, for example".
- **T11 AC-10 pin.** The "shared toggle binding `seoUseThinking` / `toggleSeoThinking()`" pin would already pass against
  today's `app.component.ts`, so it does not turn green with T11. The template-binding pin (T12) is the real check.
- **Generator-mode FAQ tab visibility.** The retained Generator algorithm shows a translated FAQ tab only when the
  description translation for that language exists (pre-existing rule, `translations[taskKey]`). A language whose description
  translation failed but whose FAQ translation was stored gets no tab. Unchanged behaviour; RECONCILIATION may want to know.
- **Items to confirm at HUMAN_PLAN_APPROVAL (already in the breakdown's open-points list):** the per-task gate convention;
  the "module not found is the red state" departure for four new-module specs; `create-form.gs` scope; OD-9(e) FAQ-only export
  (undecided, no download code changes); OD-6 seam behaviour. SP-1 to SP-3 are still not in
  `docs/decisions/US-8.1-open-decisions.md`.
- **UI acceptance by source-text pins** (AC-10 to AC-12) is the repository's established idiom; RECONCILIATION should read the
  pins critically.
- **Plan R10 wording** ("snapshot generated from the pre-extraction function") is superseded by T10's hand-derived literals
  plus move-only diff; the plan file is not edited by this stage. Adopt the same wording if the plan is revised later.
- **IMPLEMENTATION_VERIFICATION** must re-read the diff for Rule 2 (no retrieval call), since no tool checks it.

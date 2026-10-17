---
artifact: clarification_report
story: US-8.1
version: 2
status: DRAFT
owner: so-clarifier
created_at: 2026-10-14T14:00:00Z
updated_at: 2026-10-15T11:00:00Z
supersedes: docs/evidence/US-8.1-clarification-report.md#1
inputs_consumed:
  - key: story
    version: 3
  - key: open_decisions
    version: 2
open_decisions_blocking: false
---

# US-8.1 - Clarification Report (v2)

Re-run against Story v3 (the operator's FAQ Generator layout change, AC-21 to AC-26, UI-Q1 to UI-Q5). v1, written against Story
v2, is superseded. The v1 analysis below is kept where Story v3 did not change it; the v3 analysis is in the new sections.

**Verdict: Ready for Specification.** No Open Decision is `blocking: true`. Twenty are recorded, all non-blocking, in
`docs/decisions/US-8.1-open-decisions.md` (v2): OD-1 to OD-9 carried forward unchanged from v1, OD-10 to OD-17 new from the v3
change, OD-18 to OD-20 the three Specification v2 points (SP-1 to SP-3) that were never logged. Each carries a default a
specification may state and the human may overturn at HUMAN_SPEC_APPROVAL. Specification v2 (approved) must be revised for
AC-21 to AC-26; that is so-spec-writer's work, not an Open Decision.

## What is clear

- **Actor, trigger and value.** A content operator; the FAQ is one artifact per run instead of N independent ones; `<b>` replaces
  `<strong>` in FAQ HTML; a FAQ-only tool exists; and (v3) its screen shows the result at the top and puts the mandatory
  Supplemental Content field where the operator expects it. The Story is a mixed bug and feature with Observed, Expected and
  Reproduction.
- **Acceptance criteria.** AC-1 to AC-20 are observable and stub-checkable and are unchanged by v3 (the Story states, and this
  run confirms, that no new AC conflicts with them). AC-21 to AC-26 are observable except one clause of AC-22 (OD-15). Weak
  spots in AC-1 to AC-20 are mechanism gaps, not falsifiability gaps (OD-3, OD-4).
- **Store scope.** All seven `STORE_REGISTRY` keys in the Story (`3DDevice`, `3DPrinter`, `3DScanner`, `Center 3D Print`,
  `Drukarka 3D`, `EXPERT3D`, `Expert-3DPrinter`) match the registry exactly. Every store lists `uk-UA` in `languages`, and the
  smallest store (`Drukarka 3D`: `pl-PL`, `uk-UA`) still has N = 2, so AC-1's "N >= 2" holds for every store. The reproduction
  store `EXPERT3D` has `en-ES, es-ES, pt-PT, uk-UA` as the Story states. No currency or locale in the Story conflicts with the
  registry; no currency is named, and the FAQ prompt already takes `currencySymbol` from the registry. A store profile without
  `uk-UA` (the `getStore()` fallback) is outside the ACs (OD-20).
- **uk-UA fan-out.** Examined explicitly. The Story declares uk-UA the master (as for descriptions, AGENTS.md section 3 pipeline)
  and every other locale a translation of it, so a master-FAQ change reaches every language by design. This matches the project
  rule that uk-UA is generated natively, not translated into. Per-language SEO and slug generation is explicitly out of scope and
  unchanged. AC-21 to AC-26 are layout-only and do not fan out to locales; the single locale-dependent point is the Ukrainian-UI
  label of the interface language (not a store locale), OD-13.
- **Generated-HTML impact.** The FAQ artifact only (`h3`, `p`, `b`, `ul`, `li`). AGENTS.md section 4 criteria in play: unit
  spacing (`1.75 mm`), no anglicisms in non-EN output, HTML only (no Markdown, no `<br>` spacing), and no `FAQPage` itemtype in
  the artifact (the Journal module emits it; `validateGeneratedHtml` flags it). Not in play: `schema.org/Product`, spec-count
  parity, figure and figcaption rules, video survival, SEO length limits. The Story states description criteria are not changed.
  v3 adds no generated-HTML change.
- **Prompt impact and FROZEN status.** `task-faq.ts` is not FROZEN. `task-c.ts` IS FROZEN and the Story records the operator's
  explicit "modify `src/prompts/task-c.ts`" permission (2026-10-14), `--rebaseline` and `.arch-guard-checksums` in the same commit
  (AC-20); no other FROZEN file is authorised and the Story says a need for one is a new section 9 stop. `output-validator.ts`
  stays unedited, which pushes any new FAQ validation into a sibling module (OD-4). **v3:** the UI change is confined to
  `src/app/app.component.html` and `src/app/app.component.ts`, neither of which is FROZEN, and requires no prompt change; no
  AC-21 to AC-26 text contradicts a Rule or a FROZEN constraint.
- **Generation invariants.** Spec-count, figure and video invariants are not reachable from a FAQ. Structural isomorphism between
  master and translation is the invariant at risk here (AC-3, AC-17); its tag set is unsettled (OD-3).
- **Dependencies.** US-6.2 (`<b>`/`<strong>` for descriptions) is related and archived; nothing here depends on it. US-7.1
  (protected product names) interacts with the FAQ translation call (OD-6, OD-19). `test/render-reconciliation.report.md`
  concerns the `ProductDescriptionDoc` renderer; FAQ is not in that pipeline, so nothing in its section 3 or 5 blocks this Story.
- **Track.** The front matter says `angular`. The work also edits a prompt (`task-faq.ts`, FROZEN `task-c.ts`) and a service.
  The task breakdown must assign a per-task track and the prompt-track FROZEN stop applies to the `task-c.ts` task.

## Analysis of the v3 change (AC-21 to AC-26)

Checked against the code on the branch (read-only) and against Specification v2.

| AC | Testable? | Store / locale scope | Conflict with AC-1..AC-20 or Spec FR-15 / FR-16 / AC-13 | Open Decision |
|---|---|---|---|---|
| AC-21 no empty-state block in FAQ Generator in any state | Yes: template-source assertion that the empty-state block is not rendered in the FAQ Generator branch; a state-level test on the guard. The Story's reading of the cause is accurate (the guard is true after a standalone run because AC-13 leaves the three fields empty) | All stores; no locale | Does not change AC-13 / FR-18 (data fields). Side effect: a run that stores no FAQ now shows a blank area (AC-21 x OD-8) | OD-11 (pre-run content, empty tab strip), OD-16 |
| AC-22 result is the first content under the tabs | Clause (a) yes (template structure). Clause (b) "not vertically centred or pushed down by a full-height sibling" is a geometric property; no layout engine was found in the test toolchain | All stores | None. Specification v2 Out of scope excludes the standalone output layout, so the Specification must be revised | OD-12, OD-15 |
| AC-23 field order Website, Product Name, Supplemental Content, Description, Specs | Yes: template-source order assertion. The existing wiring spec does not pin the FAQ form order (it counts inputs and checks the Supplemental input by its `valueChange`), so it is expected to survive a reorder; the test stage owns confirming that | All stores | None | none (FAQ-only: OD-10) |
| AC-24 English label "Supplemental Content (Required)" + `*`, no "Optional" | Yes for the English text; the `*` is rendered by `app-source-input` when `required` is true. The Ukrainian counterpart cannot be asserted without a decision | English UI fixed; Ukrainian UI open (the `uiLanguage` toggle is global, not per store) | None. The `en`/`uk` key parity check means a new key must exist in both blocks | OD-13 |
| AC-25 mandatory: marker, Generate disabled while blank, enabled when filled | Yes; already covered by AC-11 / FR-16 and by `isFaqFormComplete`; the marker is already wired (`[required]="true"`) | All stores | Restates AC-11 / FR-16, no conflict. A shared alert text still names Original Description as mandatory | OD-17 |
| AC-26 other modes unchanged | Yes as a negative: shared label string and shared empty-state guard keep their current output for Generator, UA Description, SEO and Slug Generator | All stores | None. Pins the empty state of SEO / Slug Generator as it is today | OD-10 |

UI-Q1 to UI-Q5 each became an Open Decision (OD-10 to OD-14). For UI-Q5 the code shows today's tab labels already equal the
operator's list for `EXPERT3D` ("Ukrainian FAQ", "European English FAQ", "ES FAQ", "PT FAQ"), recorded as evidence, not as an
answer. FROZEN files: none touched by AC-21 to AC-26.

## What remains ambiguous (non-blocking Open Decisions)

| id | Topic |
|---|---|
| OD-1 | "3 attempts" vs the repair gate budget; dropped master; AC-1 "exactly one call" vs retries (Story Q1) |
| OD-2 | FAQ-only vs product-wide `<strong>` ban (Story Q2) |
| OD-3 | Parity tags: Story says `h3`/`ul`/`li` in Scope and `h3`/`p`/`li` in AC-3; `h3` and `li` are already counted, `p` and `ul` are not; FAQ-scoped or global |
| OD-4 | Definition of "valid HTML"; empty master response (allowed by the prompt, an error to the validator); enforcer for AC-9 |
| OD-5 | Task C FAQ recognition and which description-only blocks (closing H2, delivery, H1 LOCK, spec labels) are dropped |
| OD-6 | FAQ translation model tier, normalizers, validators, protected-name block |
| OD-7 | Bold placement policy, `<b>` preservation in translations, `<strong>` conversion ordering and attributes |
| OD-8 | Operator-visible report of a skipped language or dropped FAQ |
| OD-9 | Standalone tool inputs, tabs, state reset, history restore |
| OD-10 | v3 scope: FAQ Generator only vs the shared empty state / field order (Story UI-Q1) |
| OD-11 | FAQ Generator central area before any run, incl. the empty tab-bar strip (Story UI-Q2) |
| OD-12 | Validation / repair panels vs "result directly under the tabs" (Story UI-Q3) |
| OD-13 | Ukrainian-UI label of Supplemental Content in FAQ Generator (Story UI-Q4) |
| OD-14 | Version-tab labels unchanged (Story UI-Q5) |
| OD-15 | How AC-22's geometric clause is verified |
| OD-16 | Blank central area after a run that stores no FAQ (AC-21 x OD-8) |
| OD-17 | Generate-guard alert text lists Original Description as mandatory |
| OD-18 | SP-1: a thrown provider error counts as one failed attempt |
| OD-19 | SP-2: numbers, units, currency and product names preserved in FAQ translations; no AC |
| OD-20 | SP-3: store without uk-UA / N = 1 |

## Findings for the Story author (not Open Decisions; the Story is not edited by this stage)

- The Scope and Context sentence "extended to cover `h3`, `ul` and `li`" and AC-3/AC-19 ("`h3`, `p`, `li`") disagree; `h3` and
  `li` are already in `COUNTED_TAGS`. Consider aligning the wording when convenient (OD-3 holds the question either way).
- AC-1 and AC-14 say "exactly one call" while AC-16 allows up to 3; the AC text is correct only for a first-valid-response case.
- The Story's `Reproduction` section says the es-ES and pt-PT FAQs contain `<strong>`; AC-7 tests the stub-model case only. No
  recorded live-model run is required; a manual run would be release evidence, as in US-6.2.
- The Story is large (bug fix, new mode, FROZEN edit, and now a UI layout change). It is cohesive (one artifact, one tool) and
  was not judged to be several unrelated changes, so it is not treated as needing amendment.
- (v3) AC-25 repeats AC-11. It is harmless, but the traceability matrix should map both to FR-16 rather than invent a second
  requirement.
- (v3) AC-22 mixes a structural clause with a geometric one (OD-15); the Story preamble says every AC is checkable, which holds
  for the structural clause only.
- (v3) The Story's Context records the operator's browser test as "informational, not an acceptance criterion". This stage
  treats it that way and does not count it as evidence for any AC.
- (v3) Specification v2 "Out of scope" says the layout of the standalone tool's output tabs is not specified; AC-21 and AC-22
  now specify part of it. The Specification needs a revision (new FRs for AC-21 to AC-26, traceability rows, Out of scope
  wording, and a changed OD-9 note). That is so-spec-writer's work.

## Previous-run items

From v1 (against Story v2): all nine Open Decisions (OD-1 to OD-9) are still open and are carried forward with their ids and
text unchanged. Story v3 and the code read for this run answer none of them. The three points that Specification v2 raised after
SPEC_REVIEW v1 but did not log (SP-1 to SP-3) are now logged as OD-18 to OD-20 with the Specification's proposed defaults;
none is resolved here.

## Change history

- **v2** - re-run against Story v3. Added the v3 analysis, OD-10 to OD-17 (UI-Q1 to UI-Q5 and three new ambiguities) and OD-18 to
  OD-20 (SP-1 to SP-3). Verdict unchanged: Ready for Specification, no blocking Open Decision. v1 is superseded.
- **v1** - first run against Story v2: Ready for Specification, OD-1 to OD-9, none blocking.

---
artifact: specification_review
story: US-8.1
version: 3
status: APPROVED
owner: so-spec-reviewer
created_at: 2026-10-14T16:00:00Z
updated_at: 2026-10-15T10:23:07Z
supersedes: docs/reviews/specifications/US-8.1-spec-review.md#2
inputs_consumed:
  - key: story
    version: 3
  - key: specification
    version: 3
  - key: open_decisions
    version: 2
open_decisions_blocking: false
---

# Spec Review: US-8.1 — One master FAQ translated into the store languages, `<b>` instead of `<strong>`, and a standalone FAQ tool

**Verdict:** PASS
**Loop-back:** n/a

> A `PASS` here is **not** human approval. Approval is recorded only by `/so:approve`
> (AGENTS.md §10).

This is review v3, a full independent re-review of Specification v3. It supersedes review v2, which judged Specification v2 against
Story v2 and Open Decisions v1 and is now stale (`SUPERSEDED`); nothing in v2 was carried over unchecked. Input currency checked:
Story v3, Specification v3 (`supersedes: docs/specifications/US-8.1-spec.md#2`) and Open Decisions v2 (`supersedes ...#1`) are all
current and `DRAFT` (none `SUPERSEDED` or `ARCHIVED`); the clarification report v2 that Specification v3 also lists is v2 and
current. Specification v3 correctly no longer lists `specification_review` in its own `inputs_consumed`.

## Summary

Specification v3 adds FR-24 to FR-28 and NFR-9 for the operator's FAQ Generator layout change. All 26 acceptance criteria re-derive
to a requirement (AC-25 to FR-16 + FR-27 as asked), FR-1 to FR-23 and NFR-1 to NFR-8 are unchanged apart from two reference
renames (checked by `git diff` against the v2 commit `bcec6b1`), FR-24's claim that FR-18 / AC-13 semantics are kept is true
against the code, the single FROZEN edit is still the only one, and no Open Decision is resolved or blocking. The most important
point is not a defect but a limit the human must see: the geometric clause of AC-22 ("not vertically centred ... or pushed down by
a full-height sibling") cannot be verified automatically with any layout-free runner in this repository, and AGENTS.md §5 asks that
component behaviour be asserted by rendering, whereas the Specification's OD-15 default names a template-structure check (N1, N2).

## Verification of the v3 claims

| Claim in Specification v3 | How checked | Result |
|---|---|---|
| FR-1..FR-23 and NFR-1..NFR-8 keep ids and meaning | `git diff bcec6b1 HEAD -- docs/specifications/US-8.1-spec.md` read in full; the v2 commit is `bcec6b1` | **True.** The only edits inside FR-1..FR-23 / NFR-1..NFR-8 are the labels in FR-10 and FR-11 ("SP-1 default" to "OD-18 default, formerly SP-1") and in Scope / matrix notes (SP-3 to OD-20). No sentence of behaviour changed. |
| FR-24 keeps FR-18 / AC-13 semantics (`mainHtmlUa ''`, `translations {}`, `seoData` / `slugData` null) | `content-orchestrator.service.ts` line 1782: `this.content.set({ mainHtmlUa: '', translations: {}, seoData: null, slugData: null, website: input.website, faqArtifacts: {}, mainHtmlLocale: MASTER_LOCALE })` at the start of `generateFaqOnly` | **True.** FR-24's last paragraph restates exactly those values and forbids satisfying FR-24 by changing them. |
| Root cause: the empty-state condition is true after a successful FAQ-only run | `src/app/app.component.html` line 1447: `appMode() !== 'generator' && !content().mainHtmlUa && !content().seoData && !content().slugData && !isGenerating()`, inside the result view whose outer condition (line 1289) includes `faq-generator`. A FAQ-only run leaves the three fields empty (above), so the block renders after the run, above the tab panels (lines 1455 on) in the same `p-8 relative` container | **True.** The Specification's description omits the `!isGenerating()` term, which means "during a run" is already satisfied today (the block is hidden while generating and the spinner overlay shows); FR-24's "during a run" is therefore a regression guard, not a current defect. Harmless (N5). |
| The label is shared, so it reads "(Optional)" | `app.component.ts` line 147 `supplementalContent: 'Supplemental Content (Optional)'` (en), line 320 `'Додатковий контент (Опціонально)'` (uk); used by the Generator form (html line 279) and the FAQ form (line 626) | **True.** The required marker already exists (`[required]="true"` on the FAQ form's `app-source-input`, which renders `{{ label }} *`); `isFaqFormValid` uses `isFaqFormComplete` (`src/utils/faq-form.ts` lines 21-27: website not null, and `productName.trim() !== ''` and `supplementalContent.trim() !== ''`, so whitespace counts as empty). AC-25's marker and enablement are therefore already true and FR-16 + FR-27 act as regression guards. |
| FR-18 (standalone) is unaffected by the layout change | FR-24 text and NFR-9 | **True.** |
| No FROZEN file, prompt, or `STORE_REGISTRY` entry is touched by FR-24..FR-28 | FR-24..FR-28 concern `app.component.html` / `.ts` only (neither is in AGENTS.md §9) | **True.** |

## 1. Acceptance-criterion coverage

Matrix re-derived from the Story's AC text and compared with the FR text, not with the Specification's own table.

| AC | Story says | Specification satisfies it via | Verdict |
|---|---|---|---|
| AC-1 | exactly one `buildPromptFaq` call, in uk-UA, none for other languages | FR-1 | covered (qualified to the first-valid case, OD-1) |
| AC-2 | `faqArtifacts` has every store language; uk-UA master, others translated | FR-2 | covered |
| AC-3 | equal `h3`/`p`/`li` counts; a difference is a validation issue + repair gate | FR-3 (adds `ul`, OD-3) | covered |
| AC-4 | UA Description: uk-UA first then translations; tab per language | FR-4 | covered |
| AC-5 | blank Supplemental Content: no FAQ or translation call, empty `faqArtifacts` | FR-5 | covered |
| AC-6 | prompt lists `<b>`, not `<strong>` | FR-6 | covered |
| AC-7 | stubbed `<strong>` ends as `<b>` in every language | FR-7 | covered |
| AC-8 | bold lead sentence stored unchanged | FR-8 | covered |
| AC-9 | well-formed; only `h3 p b ul li` | FR-9 | covered |
| AC-10 | "FAQ Generator" mode + Extended Thinking toggle | FR-15 | covered |
| AC-11 | Generate disabled until Product Name, Store, Supplemental Content filled | FR-16 | covered |
| AC-12 | Original Description / Tech Specs optional, reach the prompt | FR-17 | covered |
| AC-13 | no description/SEO/slug call; `mainHtmlUa ''`, `translations {}`, `seoData`/`slugData` null | FR-18 | covered |
| AC-14 | same single-master pipeline | FR-19, FR-1 | covered |
| AC-15 | completed standalone run adds one history entry | FR-20 | covered |
| AC-16 | master retried, at most 3 attempts | FR-10 | covered |
| AC-17 | per-language retranslation, at most 3, then skipped | FR-11 | covered |
| AC-18 | description Task C prompt byte-identical | FR-13 | covered |
| AC-19 | FAQ-specific Task C instructions; parity accepts / rejects | FR-12, FR-3 | covered |
| AC-20 | arch-guard exits 0 after rebaseline, same commit | FR-14 | covered |
| AC-21 | central area never renders the empty-state block (texts and icon) before, during, after a run | FR-24 | covered; the three states are named; see N1 on verification, N3 on the blank result of a no-FAQ run |
| AC-22 | after a run the active tab's result panel is directly below the tab bar; no element between; not centred or pushed down by a full-height sibling; stated for no validation / repair panel | FR-25 (and FR-24 for the empty-state half) | covered in text; clause 2 is verified only manually (N1) |
| AC-23 | field order Target Website, Product Name, Supplemental Content, Original Description, Tech Specs | FR-26 | covered, order reproduced verbatim |
| AC-24 | English label "Supplemental Content (Required)" followed by `*`; no "Optional" | FR-27 | covered; the Ukrainian paragraph is a labelled default beyond AC-24 (N4) |
| AC-25 | mandatory: required marker; Generate disabled while blank / whitespace, enabled once the three are filled | FR-16 (enablement) + FR-27 (marker) | covered. The split is sound: FR-16 is AC-11's behaviour unchanged by the move, FR-27 carries the marker. No second enablement requirement is invented |
| AC-26 | Generator and UA Description keep "(Optional)" and field order; empty state still rendered in other modes exactly when rendered today | FR-28 | covered |

No AC is unmapped (AC-1..AC-26 all trace). Requirements tracing to no acceptance criterion: FR-21, FR-22, FR-23 (pre-existing, tied by
the Specification to the AGENTS.md §4 rule for generated-HTML Stories; unchanged from v2) and the new NFR-9 (a verification statement,
not a behaviour). FR-24 to FR-28 each trace to AC-21 to AC-26. No new scope creep.

## 2. Non-verifiable language

Each quoted. For each, the question asked was whether this repository's tooling (logic runner: vitest + happy-dom, no Angular
compilation; component runner `ng test` for `*.component.spec.ts`; source-text pins such as `app.component.template-wiring.spec.ts`;
data-level tests) can make the sentence fail, and whether the Specification says how.

- **FR-25 clause 2** — "the result panel is not vertically centred and is not pushed down by a full-height sibling."
  - A test would have to invent: rendered geometry. Neither runner has a layout engine (happy-dom; the Angular builder runs on the
    Vitest runner and no layout/browser runner is in `package.json`). **This cannot be verified automatically.** The Specification
    says so honestly ("actual rendered geometry is verified only by a manual browser check, and the human may require a stronger
    check", NFR-9). The pin it does allow, the "absence of a full-height or centring sibling in the FAQ Generator branch of the
    result view", has no such branch in the template today: the four modes share one container, and the empty-state `h-full` block
    stays for SEO / Slug Generator. A pin can therefore only assert that the `h-full` block is excluded for `faq-generator`, which
    is AC-21 again. This is OD-15's own predicted outcome ("reduced silently to the empty-state element is absent"); see N1.
- **FR-24** — "in each of three states: before any run, during a run, and after a completed run."
  - A test would have to invent: the means of putting the screen in each state. NFR-9 says "verifiable with stubbed run state and the
    template structure". The repository's recorded position is that there is no `AppComponent` spec ("heavy DI", see the header of
    `app.component.template-wiring.spec.ts`), so the practical check is a source-text pin on the empty-state guard excluding
    `faq-generator`, which can fail but proves the three states only by the guard expression, not by rendering them. Verifiable;
    the means is not stated precisely enough (N2).
- **FR-25 clause 1** — "no other element, in particular no empty-state block, sits between the tab bar and the result panel."
  - Checkable (rendered sibling order, or template source). Verifiable.
- **FR-26** — "Supplemental Content is positioned directly under the Product Name field and before Original Description and Tech
  Specs." Checkable by DOM order or template order. Verifiable.
- **FR-27** — "reads 'Supplemental Content (Required)' followed by the required marker `*`; the text 'Optional' does not appear in
  that label." Checkable as rendered label text. Verifiable. Second paragraph: "shows a Ukrainian label for the same field, and it
  does not read 'Опціонально'" is checkable too; the default string is labelled.
- **FR-28** — "keep ... their current field order" and "exactly when it is rendered today."
  - A test would have to invent: a baseline. "Current" and "today" mean the pre-change template; a test needs a recorded snapshot of
    that order and of the old guard. Checkable once the test writer captures the baseline from git; not stated by the
    Specification (N6).
- Carried from v2, unchanged and previously accepted: FR-12 items 1 and 2 (wording left to OD-5), FR-14 (diff content is
  review-checkable), FR-22 (Markdown half partly assertable), FR-20 (OD-8). See v2 N4, restated in N8.

## 3. Contradictions with the Story

Scope tables compared directly (Stores, Locales, Surface, UI scope of the v3 change, FROZEN, Touches generated HTML).

- Stores, Locales: agree. The Specification adds that FR-24..FR-28 are store-independent and that the interface-language wording is
  the only locale-dependent point; this matches the Story's own "UI scope" row and the clarifier's reading.
- UI scope: Story "FAQ Generator mode only (its left-panel form and its central area, plus the FAQ-Generator-specific label text)";
  Specification row is the same sentence. Agree.
- FROZEN: agree (`task-c.ts` only; the Specification adds that FR-24..FR-28 touch no FROZEN file, which is true).
- Generated HTML: agree; the Specification adds "AGENTS.md §4 in play: none" for FR-24..FR-28, which is correct for a layout change.
- FR-27 second paragraph (Ukrainian interface) adds a requirement the AC does not state (AC-24 is English only). This is not a
  silent change: the Story's own UI-Q4 default says "the Ukrainian counterpart is chosen by the specification as 'Додатковий контент
  (Обов'язково)' and flagged for human approval", and the Specification carries it as OD-13 and flags it. Acceptable (N4).
- FR-24 reproduces AC-21 ("No content generated yet", "Select a website, fill the form, and click Generate.", icon). The Story
  author's code reading and the Specification's Background both omit the `!isGenerating()` term of the real guard (see the claims
  table). A statement in the Story, repeated; no behavioural effect.
- Background still reads "The Story (v2) records the operator's decisions" and "Clarification returned Ready for Specification with
  nine non-blocking Open Decisions"; the Story is now v3 and the log has twenty. The v3 paragraph directly below corrects it. Editorial
  (N7).
- No silent rewording of scope found. The AC-1..AC-20 text is untouched in the Story ("AC-1-AC-20 are unchanged") and in the
  Specification.

## 4. Scope creep

- Out of scope section present and non-empty: **yes** (twelve entries). It narrows v2's wholesale exclusion of "the layout of the
  standalone tool's output tabs" to exactly the items FR-24 to FR-28 do not fix (tab set and order, mode-switch reset, history
  restore, pre-run tab strip, panel position) and adds the other modes' layout, the guard alert text (OD-17) and the operator's
  manual browser test as non-evidence. That narrowing is consistent with AC-21/AC-22 and mirrors the Story's own Out of scope.
- Requirements beyond the ACs: FR-27 second paragraph (OD-13 default, labelled); NFR-9 (verification statement). Both disclosed.
  Nothing else new. The Specification correctly writes no requirement for OD-11, OD-12 (beyond stating FR-25 for the no-panel case),
  OD-14, OD-16, OD-17.
- OD-11 (pre-run tab strip), OD-12 (panel placement), OD-16 (blank area after a no-FAQ run) and OD-17 (the guard alert) are not
  turned into requirements and are each named in Out of scope or in the failure-path text of the FR concerned. Clear.

## 5. Missing edge cases, boundaries and failure paths

| Area | Checked | Finding |
|---|---|---|
| FR failure paths (FR-24..FR-28) | each FR's failure-path line | FR-24: stated (a run that stores no FAQ still has no empty-state block; the blank area is OD-16, flagged). FR-25: stated (no result panel, asserts nothing beyond FR-24). FR-26, FR-27: "n/a, static property". FR-28: any change in another mode is a defect. FR-27 notes the unchanged alert text (OD-17). Clear. |
| Empty central area after a run that stores no FAQ (OD-16) | FR-24 failure path, Out of scope, OD-16 in Open questions | Disclosed and flagged for the human: AC-21 removes the only "nothing was produced" cue, and in the code a dropped master is reported only by `console.warn` / `console.info`, so the screen is blank. No requirement is written, correctly (it would be a new Story-level requirement). The human should answer OD-16 together with OD-8 at approval (N3). |
| Pre-run tab strip (OD-11) | FR-25 context, Out of scope | Before a run the `<header role="tablist">` is rendered with no buttons (an empty bordered strip), because the outer condition includes `faq-generator` and `tabDescriptors()` is empty. AC-21 does not remove it. Deliberately left open (OD-11) and stated in Out of scope. Clear, but the operator may see the strip as a leftover. |
| Panel placement (OD-12) | FR-25 third paragraph | Stated for the no-panel case only; the Specification adds the useful note that a panel can appear in exactly the runs where a language was skipped, so FR-25 may hold only vacuously for real runs. Clear. |
| Guard alert (OD-17) | FR-27 failure path | `alertFillFields` (en and uk) still names "Original Description" as mandatory; unchanged, reported, no requirement. Verified in `app.component.ts` line 129 and 302. Clear. |
| Locale fan-out (uk-UA master to derived locales) | Scope, FR-2, FR-4, FR-11 | Unchanged from v2 and still stated. The v3 requirements add none, which is correct (layout and labels only). Clear. |
| Interface-language (not store-locale) handling | FR-27, FR-28, OD-13 | Handled: English text fixed, Ukrainian default labelled, other modes keep their Ukrainian label. The en/uk key-parity test in the wiring spec (reported in OD-13) is a planning consequence and rightly not in the Specification. Clear. |
| Interface-language of the empty-state texts | FR-24 | FR-24 quotes the English strings; the block's Ukrainian strings ("Контент ще не згенеровано", "Оберіть сайт ...", `app.component.ts` lines 310-311) are not named. FR-24's first clause is "never renders the empty-state block", which covers both languages because it is one element; a test that asserted only the English strings would not detect the block in the Ukrainian UI (N5). Minor. |
| Store scope vs STORE_REGISTRY | `src/prompt-core/constants.ts` lines 70-77 and `getStore()` lines 300-310, read this round | All seven keys exist (`3DDevice`, `3DPrinter`, `3DScanner`, `Center 3D Print`, `Drukarka 3D`, `EXPERT3D`, `Expert-3DPrinter`); every `languages` list contains `uk-UA`; the smallest is `Drukarka 3D` (`['pl-PL', 'uk-UA']`, line 75, N = 2); the `getStore()` fallback (lines 301-308) has `languages: ['en-GB']` (N = 1, no `uk-UA`). The Scope row matches. FR-24..FR-28 introduce no store or locale value. Clear. |
| §4 invariants that must survive | spec-count parity, figure/figcaption, lazy/eager, video, SEO | The v3 change touches no generated HTML; the Specification states "AGENTS.md §4 in play: none" for FR-24..FR-28 and leaves FR-21..FR-23 and the not-in-play list as in v2. Clear. |
| Provider behaviour, empty / boundary inputs | FR-10, FR-11, OD-18 | Unchanged from v2 (provider error counts as an attempt; empty master terminal). Clear. |

## 6. Compliance with AGENTS.md

| Check | Result |
|---|---|
| §4 criteria in play quoted **verbatim** and cited, not paraphrased | Pass. FR-21 / FR-22 / FR-23 quotes are untouched since v2 (confirmed by the diff) and were verified against AGENTS.md lines 206, 232-233 and the `itemtype` bullet in the previous review. For FR-24..FR-28 the Specification states that no §4 criterion is in play; correct. |
| §9 FROZEN-file impact named and acknowledged | Pass. `task-c.ts` only, on the quoted permission; the four others listed as not authorised; FR-14 and the Scope row keep the `--rebaseline` same-commit rule; the v3 layout change is explicitly FROZEN-free and "needing one would be a new §9 stop". |
| §3 architecture rules not violated — incl. Rule 2, review-only | Pass. NFR-1..NFR-7 unchanged; NFR-2 (no retrieval in FAQ steps) still stated for review. NFR-9 adds no rule. |
| §5 verification fit (how a UI requirement is tested) | Partly. AGENTS.md §5: "For a component: render it, interact with it ... assert what the user would observe ... Query by role and by text ... not by internal class fields or CSS-implementation selectors." The Specification's chosen checks (OD-15 default, FR-25, NFR-9: "asserted from the template structure", "absence of a full-height or centring sibling") lean on template source and layout classes. Rendered-text and DOM-order assertions (FR-24, FR-26, FR-27, FR-28, FR-25 clause 1) are expressible as component tests; only the geometric clause is not. Recorded as N2; not a defect of the requirement text. |
| §11 no blocking Open Decision left unaddressed | Pass. OD-1..OD-20 are all `blocking: false` (table and each heading re-read, including OD-10..OD-20). None is closed by the Specification (OD-13 and OD-10 have their default written as normative wording in FR-27 / FR-28, which the human approves at the gate, see N4): OD-10, OD-12, OD-13, OD-14, OD-15 are carried as labelled defaults; OD-11, OD-16, OD-17, OD-19, OD-20 get no requirement; OD-18 keeps the v2 default. The `blocking: false` classification of OD-15 and OD-16 is defensible (a default exists, behaviour for the rest of the story is unaffected, and the human sees both) but they are the two the human most needs to answer, see N1 and N3. |
| No implementation design leaked in | Pass for FR-24..FR-28: they name behaviour and rendered text only, not files, classes, signals or label keys. The v2 hints in FR-3, FR-7, FR-9, FR-12 remain proposals (v2 N6). |
| Version / currency discipline (artifact-schema.md) | Pass. Specification v3 records `version: 3`, `supersedes: ...#2`, story v3, clarification_report v2, open_decisions v2, `status: DRAFT`, `open_decisions_blocking: false`. This review records v3 / supersedes review v2 / story v3, specification v3, open_decisions v2. |

## Verdict rationale

`PASS`, not `CHANGES_REQUIRED`: I looked for a v3 defect of the weight of v1's R1 to R4 and found none. Coverage is complete, the
FR-1..FR-23 / NFR-1..NFR-8 invariant holds, FR-24 is consistent with the code and with FR-18, no Open Decision is resolved, and the
things that cannot be fully verified or that leave a gap (AC-22 geometry, the blank area after a no-FAQ run, the pre-run tab strip,
the Ukrainian label) are each disclosed as an Open Decision with a labelled default rather than hidden. Not `CHANGES_REQUIRED` with
`changes_required_clarification` either: AC-22's second clause is not testable by a layout-free runner, but the clarifier already
logged it as OD-15 and the Specification states the honest limit; re-asking the same question upstream would only move it to the
human who is going to answer it at HUMAN_SPEC_APPROVAL in any case. Not `BLOCKED`: all inputs are current, none is `SUPERSEDED`,
no Open Decision is blocking, the Specification exists. This `PASS` is a verdict about the document; the human gate decides whether
the defaults stand.

## Non-blocking findings

- **N1. AC-22 clause 2 is verified manually only, and the proposed pin collapses into AC-21.** Quoted above. No automated test in
  this repository can fail on "vertically centred" or "pushed down by a full-height sibling": happy-dom and the Angular unit-test
  builder have no layout engine, and `package.json` has no browser-layout runner. The OD-15 default (assert the absence of the
  `h-full` / centring sibling in the FAQ Generator branch) has no FAQ branch to point at, because the four modes share one
  container; it reduces to "the empty-state guard excludes `faq-generator`". The reconciliation stage should therefore record AC-22
  clause 2 as manually verified (the operator's manual browser test is a recorded claim, not pipeline evidence, as the Story and
  the Specification both say). The human should answer OD-15 at approval: accept the manual check, or require a stronger one.
- **N2. Say how FR-24 / FR-26 / FR-27 / FR-28 are verified, and prefer rendering over source text.** NFR-9 says "stubbed run state and
  the template structure", and OD-15 names class-based pins; AGENTS.md §5 asks for rendered, role-and-text assertions for a
  component and the repository has recorded that it has no `AppComponent` spec. The planner should decide between a
  `*.component.spec.ts` rendering `AppComponent` (rendered label text, DOM order, absence of the empty-state texts in the three
  states) and source-text pins as in `app.component.template-wiring.spec.ts`, and say which requirement gets which. The
  Specification's wording does not forbid either.
- **N3. OD-16: a blank screen after a run that stores no FAQ.** Verified as a consequence of AC-21, not a Specification defect. The
  human should decide OD-16 with OD-8 (operator-visible reporting), since the standalone tool's only product is the FAQ and the
  empty-state text was the only cue left.
- **N4. FR-27's Ukrainian paragraph and FR-28's Ukrainian clause are requirements beyond AC-24 / AC-26, and OD-13 is partly
  pre-decided.** OD-13 asks two things: what the Ukrainian FAQ label says, and whether the Generator / UA Description Ukrainian
  label stays "Опціонально". FR-27 states "it does not read 'Опціонально'" as a normative rule (only the exact string
  "Додатковий контент (Обов'язково)" is labelled as a default), and FR-28 states "the Ukrainian interface keeps the label it shows
  today" as a normative rule. Both follow from AC-25 / AC-26 and OD-10 and match the Story's UI-Q4 default, so this is
  non-blocking, but the human approves both sub-answers at the gate, not only the string, and the two paragraphs need rewording if
  either is overturned. The existing wiring spec compares the `en` and `uk` blocks key for key, which is why a Ukrainian string
  must exist. This is the same kind of partial pre-decision as OD-6 in review v2 (N7); the sentence "no Open Decision is resolved"
  in this review means that no OD is closed by an AC-level decision, not that none has its default written as normative text.
- **N5. FR-24 lists the English empty-state strings only.** The block is one element, so the first clause covers the Ukrainian UI
  too; the planner's test should assert the element's absence (or both languages' strings), not only the English strings. Also,
  the real guard has `!isGenerating()`, so "during a run" is already true today and FR-24 guards it against regression.
- **N6. FR-28 and "today"/"current".** The test writer needs the old guard and the old Generator / UA Description field order
  captured from git as the baseline; the Specification does not say so, and should not prescribe it.
- **N7. Editorial staleness in Background.** "The Story (v2)" and "nine non-blocking Open Decisions (OD-1 to OD-9)" refer to the
  earlier round; the v3 paragraph below corrects it. Fix at the next revision, not required.
- **N8. Carried from review v2, still open for the human.** AC-1 / AC-16 are read with OD-1 / OD-4 defaults; FR-12 items 1 and 2
  depend on wording left to OD-5; OD-6 (translation model tier, normalisers, protected-name block), OD-8 (reporting a skipped
  language), OD-9 (standalone tab set, state reset, history restore) and OD-19 (numbers, units, currency and product name
  preserved in FAQ translations) are still without a requirement and should be decided before planning. The v2 N1 point (SP-1..SP-3
  absent from the log) is now resolved by OD-18..OD-20 in Open Decisions v2.

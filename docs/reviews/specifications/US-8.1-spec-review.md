---
artifact: specification_review
story: US-8.1
version: 2
status: APPROVED
owner: so-spec-reviewer
created_at: 2026-10-14T16:00:00Z
updated_at: 2026-10-14T18:00:00Z
supersedes: docs/reviews/specifications/US-8.1-spec-review.md#1
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 2
  - key: open_decisions
    version: 1
open_decisions_blocking: false
---

# Spec Review: US-8.1 — One master FAQ translated into the store languages, `<b>` instead of `<strong>`, and a standalone FAQ tool

**Verdict:** PASS
**Loop-back:** n/a

> A `PASS` here is **not** human approval. Approval is recorded only by `/so:approve`
> (AGENTS.md §10).

This is review v2, a full independent re-review of Specification v2. It supersedes review v1 (which judged Specification
v1 and returned CHANGES_REQUIRED with R1–R4; v1 is now `SUPERSEDED`). Input currency checked: Story v2, Open Decisions v1
and Specification v2 are all current (none `SUPERSEDED` or `ARCHIVED`); Specification v2 records `supersedes:
docs/specifications/US-8.1-spec.md#1` and consumed review v1.

## Summary

All four required changes of review v1 are fixed in the text, not merely claimed in the change history (verified one by
one below). The re-derived matrix still covers all 20 ACs, the §4 quotes are verbatim, the single authorised FROZEN edit is
acknowledged, Out of scope is non-empty, and no blocking Open Decision exists. The revision introduced no blocking defect.
The most important remaining point is non-blocking: the three new open points SP-1..SP-3 are carried in the Specification
(SP-1 even as a default inside FR-10/FR-11) but are not in the Open Decisions log, so the human must see and confirm them at
HUMAN_SPEC_APPROVAL.

## Verification of the v1 required changes

| Item | Where fixed | Verified how | Result |
|---|---|---|---|
| **R1** FR-7 / FR-9 ordering | FR-7 (conversion runs on every model-produced FAQ text "before that text is validated against FR-3 or FR-9", and again after every repair; `<strong>` alone is never an FR-9 violation and never costs an attempt); FR-9 ("evaluated on text in which `<strong>` has already been converted") | Traced the AC-7 scenario (stub returns `<strong>` on every call): conversion, then FR-9 check passes, nothing retried, stored text has `<b>`. FR-7's "attributes kept" vs FR-9's "no attributes" is now stated: a `<strong>` with an attribute becomes a `<b>` with it, and FR-9 judges that `<b>` (rejected, retried or skipped). FR-7 failure path ("total on any text", case-insensitive) is now true. No remaining path where `<strong>` fails the gate. | **Fixed** |
| **R2** FR-9 / FR-10 empty master | FR-9 ("An empty or whitespace-only response is not evaluated by this requirement"); FR-10 (empty master = terminal, no retry, nothing stored, no translation call); FR-11 (empty translation = parity failure, retried) | FR-9 no longer lists "non-empty", so the two requirements no longer give opposite instructions for one input. An empty translation against a non-empty master has zero elements against the master's count, so FR-3 rejects it and FR-11 retries it. Matrix row AC-9 repeats the split. | **Fixed** |
| **R3** provider-error failure path | FR-10 and FR-11 "Provider error (SP-1 default)": a throwing call counts as one failed attempt of the same budget of 3, does not abort the run, a skipped language does not stop the others; FR-10 and FR-11 failure paths state that description, SEO, slugs and description translations already produced are retained | Checked against the code order: the FAQ step is the last step in `generate()` and Step 4 in the UA Description path, so "never discards earlier output" is a meaningful statement. FR-10 also fixes the standalone case (other fields keep FR-18 values). | **Fixed** (default is an unlogged open point, see N1) |
| **R4** FR-21 / anglicism untestable | FR-21 restated at normaliser level (number/unit normalisation applied to every FAQ text, stub `1.75mm` becomes `1.75 mm`); FR-23 restated at prompt and normaliser level, the rest declared review-only; NFR-8 states the split | Confirmed in `content-orchestrator.service.ts` (FAQ `produce` applies `fixNumberFormatting`, `cyrillizeUnits`, `normalizeTerminology` and others) and in `number-format-fixer.ts` (`ensureUnitSpaces` runs on every path), so the stub assertion is real and can fail. The review-only remainder is stated explicitly, not left as an undetectable "defect". | **Fixed** |

Review v1's N3 (FR-12 pinned content), N4 (N = 1 case), N5 (values and units) and N6 (itemtype citation) were also acted
on: FR-12 items 1–3, the Scope row plus SP-3, SP-2, and the FR-23 paragraph that cites §4 only for `Product`.

## 1. Acceptance-criterion coverage

Matrix re-derived from the Story's AC text and compared with the FR text, not with the Specification's own table.

| AC | Story says | Specification satisfies it via | Verdict |
|---|---|---|---|
| AC-1 | exactly one `buildPromptFaq` call, in uk-UA, none for other languages | FR-1 | covered, qualified to the first-valid-response case (OD-1, disclosed) |
| AC-2 | `faqArtifacts` has every store language; uk-UA = master, others translated | FR-2 | covered |
| AC-3 | equal `h3`/`p`/`li` counts; difference = validation issue + repair gate | FR-3 (adds `ul`) | covered; `ul` is a disclosed addition (OD-3), see N2 |
| AC-4 | UA Description: uk-UA first then translations; tab per language | FR-4 | covered |
| AC-5 | blank/whitespace Supplemental Content: no FAQ or translation call, empty `faqArtifacts` | FR-5 | covered |
| AC-6 | prompt lists `<b>`, not `<strong>` | FR-6 | covered |
| AC-7 | stubbed `<strong>` ends as `<b>` in every language | FR-7 | covered and now reachable (R1 fixed) |
| AC-8 | bold lead sentence in `<p>` stored unchanged | FR-8 | covered |
| AC-9 | well-formed; only `h3 p b ul li` | FR-9 | covered, extended by the OD-4 defaults (starts with `<h3>`, no attributes) |
| AC-10 | "FAQ Generator" mode + Extended Thinking toggle | FR-15 | covered |
| AC-11 | Generate disabled until three fields filled; whitespace = empty; no LLM call | FR-16 | covered |
| AC-12 | Original Description / Tech Specs optional, reach the prompt when filled | FR-17 | covered |
| AC-13 | no description/SEO/slug call; `mainHtmlUa ''`, `translations {}`, `seoData`/`slugData` null, `faqArtifacts` per language | FR-18 | covered |
| AC-14 | same single-master pipeline as AC-1–3, 6–9 | FR-19, FR-1 | covered |
| AC-15 | completed standalone run adds one history entry | FR-20 | covered; "completed" for a partial run is OD-8 |
| AC-16 | master retried, at most 3 attempts in total, no further call after a valid master | FR-10 | covered; the empty-master carve-out is an OD-4 default (see N3) |
| AC-17 | per-language retranslation, at most 3, then skipped, others kept | FR-11 | covered |
| AC-18 | description Task C prompt byte-identical | FR-13 | covered |
| AC-19 | FAQ-specific Task C instructions; parity accepts/rejects | FR-12, FR-3 | covered; see N2 for one wording imprecision |
| AC-20 | arch-guard exits 0 after rebaseline; same commit; diff only FAQ-aware change | FR-14 | covered |

No AC is unmapped. Requirements tracing to no AC: FR-21, FR-22, FR-23, which the Specification itself ties to the §4 rule for
generated-HTML Stories; tolerated as compliance requirements. No other FR lacks an AC (FR-9's extra defaults and FR-3's `ul`
are extensions of AC-9 and AC-3, not free-standing requirements).

## 2. Non-verifiable language

Re-scanned every FR. Quoted items that remain soft, all non-blocking:

- **FR-12 items 1 and 2** — "it tells the model to translate the FAQ element for element, keeping every `<h3>`, `<p>`, `<ul>` and `<li>` of the input and adding none" and "it keeps the per-language tone-of-voice, terminology, unit and number rules that the description translation prompt carries"
  - A test would have to invent: the exact phrase to look for in the prompt text (item 1), and which strings count as "the rules" (item 2; testable by checking that the same per-language overlay text appears in both prompts, which the test writer must choose). The Specification defers the wording to OD-5, so a prompt-text assertion on item 1 can only be a substring the builder also chooses. Item 3 (description-only blocks absent) is checkable. See N4.
- **FR-22** — "Every stored FAQ is HTML only with no Markdown and no `<br>` for spacing."
  - A test would have to invent: what counts as Markdown syntax. `<br>` is covered by the FR-9 whitelist; the Markdown half is only partly assertable (leading `#`, `**`, `- `). Verbatim §4 wording, so acceptable.
- **FR-14** — "the `task-c.ts` diff contains only the FAQ-aware change." Review-checkable, not machine-checkable; the planner should not try to automate it.
- **FR-20** — "Whether a run with a skipped language or a dropped FAQ still writes an entry is not fixed by any acceptance criterion (OD-8)." Deliberately open, not unclear wording.

FR-21 and FR-23 (the v1 problem sentences) are no longer in this list: both now name a stub input and an expected output, or are
labelled review-only.

## 3. Contradictions with the Story

Scope tables compared directly (Stores, Locales, Surface, FROZEN, Touches generated HTML): Stores and Locales agree; the
Specification adds the N = 1 fallback exclusion (SP-3), which narrows nothing the Story asserts. FROZEN agrees (`task-c.ts`
only, same quoted permission, same four files not authorised). Generated HTML agrees (FAQ artifact only).

- **AC-1** is narrowed by FR-1 to the first-valid-response case. Disclosed as OD-1; needs the human's explicit approval (N3).
- **AC-3 / AC-19 vs FR-3 / FR-12.** The ACs count `h3`, `p`, `li`; FR-3 also counts `ul` (reconciling the Story's own Scope, which names `ul`). Disclosed as OD-3. One wording consequence is in N2.
- **AC-16 vs FR-10.** AC-16 retries a master that "is not valid HTML"; FR-10 makes an empty response terminal. Disclosed as the OD-4 default and justified by the prompt's own allowance of an empty response.
- No silent rewording of scope found. The internal FR-7/FR-9 and FR-9/FR-10 contradictions of v1 are gone.

## 4. Scope creep

- Out of scope section present and non-empty: **yes** (nine entries, mirrors the Story's list and adds the unauthorised FROZEN files, the OD-8/OD-9 surfaces and the stub-only acceptance).
- Requirements beyond the ACs are all labelled as OD defaults: FR-9 (`<h3>` start, no attributes), FR-10 (terminal empty master), FR-3 (`ul`), FR-12 item 3 (description-only blocks absent), FR-21–FR-23 (§4). Also new in v2 and not an AC: the provider-error rule (SP-1) and "earlier output is never discarded" in FR-10/FR-11. These are failure paths that review v1 required, not unrequested features.
- The Specification correctly refuses to write requirements for OD-6, OD-8, OD-9, SP-2 and SP-3 where no AC exists.

## 5. Missing edge cases, boundaries and failure paths

| Area | Checked | Finding |
|---|---|---|
| FR failure paths | each FR's failure-path line | Every FR states a failure path or a reasoned "n/a". FR-7's "total conversion" claim is now true. FR-20 has no failure path and says so (OD-8). Clear. |
| Locale fan-out (uk-UA master → derived locales) | Scope row, FR-2, FR-4, FR-11 | Stated: one master reaches N−1 languages, no per-language authoring; a failed language is skipped without affecting the others or the master. Clear. |
| Store scope vs STORE_REGISTRY | all seven stores and language lists against `src/prompt-core/constants.ts` lines 71–77; `getStore()` fallback at line 300 | All seven names and the claim "every store lists `uk-UA`, smallest is `Drukarka 3D` (`pl-PL`, `uk-UA`), N = 2" are correct. The fallback profile (`languages: ['en-GB']`) is correctly described and excluded by SP-3. NFR-5 routes languages and currency symbol through the registry. Clear. |
| §4 invariants that must survive | spec-count parity, figure/figcaption, lazy/eager, video, SEO, values and units | Description-only criteria are stated as not in play for the FAQ and unchanged for descriptions (FR-13, NFR-7). The "Don't change values or units" sentence for FAQ translations is not written as an FR; SP-2 raises it for the human (see N5). |
| Provider behaviour (retry, timeout, 429, malformed output) | FR-10, FR-11, SP-1, NFR-1 | Now covered: a throwing call is one failed attempt of 3, does not abort the run, does not discard earlier output; malformed output goes through FR-9. Residual: the default lives in unlogged SP-1 (N1). |
| Empty / boundary inputs | blank Supplemental Content (FR-5, FR-16), blank optional inputs (FR-17), empty master (FR-10), empty translation (FR-11 via FR-3), smallest store N = 2, N = 1 fallback (SP-3) | Covered. An all-attempts-exhausted master in the standalone tool leaves an empty result with no operator-visible outcome; this is OD-8, explicitly deferred. |

## 6. Compliance with AGENTS.md

| Check | Result |
|---|---|
| §4 criteria in play quoted **verbatim** and cited, not paraphrased | Pass. FR-21 (AGENTS.md line 206), FR-22 (line 233), FR-23 anglicism (line 232) and the `itemtype` bullet (lines 203–205) match the file character for character apart from the bullet marker and line wrapping. FR-23 now attributes only the `Product` prohibition to §4 and says the "no schema.org markup at all" consequence comes from FR-9 and the Story, so the v1 mis-citation is gone. The "Spec count on output = spec count on input. Don't change values or units." line is not quoted; it is raised as SP-2 instead (N5). |
| §9 FROZEN-file impact named and acknowledged | Pass. `task-c.ts` only, on the quoted operator permission; the four other frozen files are listed as not authorised and needing one is a new §9 stop; FR-14 requires `--rebaseline` and `.arch-guard-checksums` in the same commit; FR-9 keeps the new validity rule outside `output-validator.ts`. |
| §3 architecture rules not violated — incl. Rule 2, review-only | Pass. NFR-1 to NFR-7 cover Rules 1–5 and caching; NFR-2 states Rule 2 (no search or fetch in FAQ steps) for review. |
| §11 no blocking Open Decision left unaddressed | Pass for the log: OD-1..OD-9 are all `blocking: false` and none is resolved by the Specification. See N1 for the three open points that are not in the log. |
| No implementation design leaked in | Minor, non-blocking, carried as defaults (N6): FR-7 prescribes a rename step and its position, FR-9 names a "validate-and-repair gate" and a location outside `output-validator.ts`, FR-12 names an "explicit caller-set option". The planner should treat them as proposals. The ordering rule in FR-7 is behavioural (what the stored and validated text may contain), which is the legitimate part. |

## Verdict rationale

`PASS`, not `CHANGES_REQUIRED`: the four defects that made v1 unfit (R1 AC-7 unreachable, R2 FR-9/FR-10 contradiction, R3 no
provider-error path, R4 failure sentences no stub test could detect) are each resolved in normative text and I found no new
defect of the same weight. Every remaining item is a disclosed default, a wording imprecision, or an Open Decision the human
is meant to take at HUMAN_SPEC_APPROVAL. Not `BLOCKED`: all inputs are current, no Open Decision is blocking, the
Specification exists. This `PASS` is a verdict about the document; the human gate decides whether the defaults stand.

## Non-blocking findings

- **N1. SP-1..SP-3 are not in the Open Decisions log.** The Specification says so itself. SP-1 is a missing-information case
  that §11 says to record as an Open Decision, and its default is already normative text in FR-10 and FR-11 (a provider error
  counts as an attempt; it does not abort the run). SP-2 (preserving numbers, units, currency, product name in a FAQ
  translation) and SP-3 (store without `uk-UA`) are likewise only in the Specification. Because the Specification is what the
  human approves and its Open questions section lists them, nothing is hidden, but later stages that read only
  `open_decisions` v1 will not see them. Recommendation to the orchestrator: have the clarifier log them (OD-10..OD-12) or
  have the human acknowledge them explicitly at approval.
- **N2. FR-12 wording vs FR-3.** FR-12 says "a translation with matching `h3`/`p`/`li` counts is accepted", but FR-3 (OD-3
  default) also requires the `ul` count to match, so a translation that merges two lists would be rejected despite matching
  `h3`/`p`/`li`. A test writer following AC-19 literally and one following FR-3 would disagree. Wording fix for any future
  revision: say "matching `h3`/`p`/`ul`/`li` counts". It is the same `ul` extension already disclosed as OD-3; the human
  should confirm it at approval.
- **N3. AC-1 and AC-16 are read, not just implemented.** "Exactly one call" holds only for the first-valid case; "3
  attempts" counts repair-gate attempts inside it (OD-1); an empty master is terminal rather than retried (OD-4). These are
  the clarifier's proposed defaults, carried and labelled. The human's approval of the Specification is approval of those
  readings.
- **N4. Prompt-text assertions in FR-12 depend on wording the Specification leaves to OD-5.** Item 3 is pinnable now (named
  blocks absent). Items 1 and 2 can only be pinned on text the implementer chooses, so the test writer should assert them
  against the description prompt's own overlay strings (item 2) and a structural cue (item 1) rather than a free phrase.
- **N5. SP-2.** The §4 sentence "Don't change values or units" is arguably in play for a FAQ translation, yet no AC or FR
  requires a translation to preserve the master's numbers, units, currency symbol and product name; the only handle is FR-12
  item 2 (rules kept in the prompt). The Story complains about "different facts" across languages. The human should decide
  whether the Story needs an AC. Related: OD-6 (protected-name block).
- **N6. Implementation hints** in FR-3, FR-7, FR-9 and FR-12 are proposals for the planner (see section 6).
- **N7. OD-6 partly pre-decided.** FR-21 and FR-23 require the deterministic normaliser chain to be applied "to the master and
  to every translation", while the Open questions section says OD-6 (which includes the normaliser chain) has "no requirement
  written". Today there is no FAQ translation, so "applies today" is true only for the master. Normalisers on translations
  therefore follow the OD-6 default de facto. The model slot, `withProtectedNameBlock`, the extra validators and the EXPERT3D
  Spanish replacements remain open and should be decided before planning.
- **N8. Operator visibility (OD-8, OD-9).** A skipped language, a dropped FAQ, or a failed standalone master leaves no
  operator-visible signal and no tab specification for the standalone tool (`mainHtmlUa` is `''`). No AC fixes it, and the
  Specification correctly writes no requirement, but the standalone tool's only product is the FAQ, so the human should
  decide OD-8 and OD-9 at HUMAN_SPEC_APPROVAL.
- **N9.** The Story's own Open questions section still lists Q1 and Q2 (the same questions as OD-1 and OD-2). They are carried
  as defaults, not resolved.

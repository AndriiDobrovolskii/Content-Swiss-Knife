---
artifact: specification
story: US-3.1
version: 20
status: ARCHIVED
owner: so-spec-writer
created_at: 2026-09-22T23:30:00Z
updated_at: 2026-09-29T21:00:00Z
supersedes: docs/specifications/US-3.1-spec.md#19
inputs_consumed:
  - key: story
    version: 1
  - key: clarification_report
    version: 3
  - key: open_decisions
    version: 4
  - key: specification_review
    version: 17
  - key: implementation_plan
    version: 12
  - key: task_breakdown
    version: 9
  - key: plan_review
    version: 8
  - key: impact_analysis
    version: 3
  - key: pipeline_status
    version: 11
open_decisions_blocking: false   # unchanged — no blocking Open Decision. v20 is a loop-back from
                                  # ARCHITECTURE_PLANNING (so-planner implementation_plan v12 returned
                                  # CHANGES_REQUIRED, loop_back key `changes_required`, to SPECIFICATION
                                  # — not from a new Open Decision, and open_decisions v4 is unchanged
                                  # and re-confirmed still non-blocking this round). Trigger:
                                  # pipeline_status v11 §2 "LEAD 1" — a real-world QA batch
                                  # (Knowledge/Issues/Second Batch/) surfaced, during this Story's own
                                  # delivery-pipeline testing, that `description-doc.schema.ts:216`
                                  # (`cta: z.object({ heading: NonEmpty, text: Prose })`) requires a
                                  # non-empty `cta.heading` unconditionally across `schemaVersion`, but
                                  # `render-description.ts:443-449` and `task-a-doc.ts:148-150` both
                                  # independently confirm `doc.cta.heading` is discarded at render time
                                  # for every `schemaVersion: '4.0'` Doc (the renderer assembles the §9
                                  # `<h2>` from `getRenderRules(...).ctaHeading(...)` instead, and the
                                  # v4 prompt tells the model outright that whatever it writes there is
                                  # discarded) — so the model reliably emits `cta.heading: ''` on every
                                  # real v4 generation, and the schema rejects it every time, burning a
                                  # real field-scoped repair-gate attempt (this Story's own T1) on a
                                  # value with zero effect on the shipped artifact. Re-verified live
                                  # against all three cited files this round, independently of
                                  # pipeline_status v11's and implementation_plan v12 §4c's own citations
                                  # (all confirmed accurate at the cited line numbers). implementation_plan
                                  # v12 §4c found no FR in v19 authorizes relaxing this — v19's own
                                  # extensive `cta.heading` discussion (FR-7's Doc-path
                                  # `heading-brand-core-missing` retargeting to `doc.localizedName` for
                                  # v4) is entirely about which leaf a REPAIR/brand-core check reads, not
                                  # about the Zod schema's own presence requirement, and FR-10 (the
                                  # `doc-schema` repair-ladder entry, this Story's own D7/D13) is about
                                  # making an already-firing `doc-schema` finding cheaper to repair, not
                                  # about whether it should fire at all — so §4c correctly declined to
                                  # design a fix and looped back rather than deciding this itself. v20
                                  # adds **FR-14**, stating only the acceptance-observable behaviour (a
                                  # v4 Doc's `cta.heading` need not be non-empty; a v3 Doc's remains
                                  # required non-empty, unchanged) — not the Zod mechanism, which stays
                                  # `so-planner`'s decision — and adds a new **AC-7** to the Traceability
                                  # matrix (this Specification's own addition; the Story itself, owned by
                                  # so-story-writer, is not amended by this stage and still lists only
                                  # AC-1..AC-6 — see the AC-7 traceability row for the disclosure). No
                                  # other FR, and no other part of v19, changes: FR-1 through FR-13 and
                                  # everything else below are carried forward unchanged. v19 was itself a
                                  # loop-back from SPEC_REVIEW (v17 returned
                                  # CHANGES_REQUIRED, loop_back changes_required -> SPECIFICATION), not
                                  # from a new Open Decision. SPEC_REVIEW v17 found v18's FR-8(b)
                                  # addition sound in substance but found the document-wide consistency
                                  # sweep v18 stated it was applying ("the same full-file-consistency
                                  # discipline v17 already applied for FR-7") was not fully carried
                                  # through, in three places: (1) the Summary paragraph still asserted
                                  # meta_title "follows one template... at any rung including the
                                  # terminal overflow case" and separately repeated the literal,
                                  # pre-v18 "by design — an accepted tradeoff (OD-8), not a defect"
                                  # sentence verbatim, both false once FR-8(b) exists; (2) FR-8(b)'s own
                                  # narrow no-word-boundary hard-clip fallback is a second, undisclosed
                                  # departure from AC-4's literal "including mid-word truncation of the
                                  # product name" failure condition, disclosed only inside FR-8(b)'s own
                                  # prose, not at the AC-4 traceability row or a HUMAN_SPEC_APPROVAL
                                  # bullet the way the h1Len >= 54 shape exception itself was disclosed;
                                  # (3) FR-13(b)/OD-10's ceiling-collision residual was not re-derived
                                  # against FR-8(b)'s own override mechanism and still stated the
                                  # pre-FR-8(b) band (exactly 55 for the general rows, 52-55 for de-DE),
                                  # which is now wrong — FR-8(b) intercepts any h1Len >= 54 entry before
                                  # task-b.ts's line-48/line-49 cascade path is ever reached, so the
                                  # general-row case is no longer reachable at all and de-DE's band
                                  # narrows to 52-53, itself collision-live only depending on the
                                  # unspecified differentiation-marker length. v19 fixes all three,
                                  # corrects the front-matter inputs_consumed specification_review
                                  # citation (15 -> 17, SPEC_REVIEW v17's own non-blocking hygiene
                                  # finding) in the same pass, and touches nothing else — FR-8(b)'s own
                                  # mechanism and threshold arithmetic are independently re-verified
                                  # sound by SPEC_REVIEW v17 and are unchanged. v18 is a
                                  # loop-back from PLAN_REVIEW (v8 returned CHANGES_REQUIRED,
                                  # loop_back_stage changes_required_specification, to SPECIFICATION),
                                  # not from a new Open Decision. PLAN_REVIEW v8 found that
                                  # implementation_plan v10's D15 / task_breakdown v9's T15 — the
                                  # design that closes the QA-report-driven "Defect 1"
                                  # (meta-title-template-shape unsatisfiable for a long h1) — is
                                  # independently-verified-sound engineering that nonetheless ships
                                  # user-observable behaviour this Specification's own v17 text
                                  # (FR-8/AC-4/OD-8) did not authorize and, for OD-8's "the cascade
                                  # must degrade for that product by design" disposition specifically,
                                  # affirmatively contradicted. D15 instead deterministically ships a
                                  # different, always-reachable meta_title shape — a word-boundary-safe
                                  # prefix of h1, never an interior edit or deletion, followed by a
                                  # single differentiation mark — for any locale whose h1 is 54 Unicode
                                  # code points or longer, computed and applied unconditionally before
                                  # validation ever runs, so the degrade-and-accept path FR-8/OD-8
                                  # previously described never actually triggers for this case.
                                  # PLAN_REVIEW v8 found this sound but not something it may pass on
                                  # its own authority — its own governing instruction is to loop back to
                                  # SPECIFICATION rather than accept a plan whose only flaw is that the
                                  # Specification has not caught up, and an informal Owner instruction
                                  # given directly to so-planner during ARCHITECTURE_PLANNING is not the
                                  # same instrument as an approved Specification (AGENTS.md §10). v18
                                  # adds this as FR-8(b), stating the actual, independently-verified
                                  # mechanism implementation_plan v10 §2.4/§2.4.1 and task_breakdown v9's
                                  # T15 designed — not a re-derivation of it — and the exact threshold
                                  # (h1Len >= 54, not the narrower h1Len >= 55 an earlier iteration of
                                  # that design left an uncovered gap at); amends the AC-4 traceability
                                  # entry to state the accepted exception explicitly; corrects the
                                  # handful of other passages inside FR-8/FR-13(c)/Out of scope that
                                  # asserted the now-superseded "must degrade by design" framing, the
                                  # same full-file-consistency discipline v17 already applied for FR-7;
                                  # and states, at Open questions, that OD-8's "must degrade by design"
                                  # disposition is superseded for this h1Len >= 54 sub-case only — its
                                  # other half (the h1Len <= 53 thinned-margin residual, FR-13(c),
                                  # unrelated to D15's mechanism) is untouched. This Specification does
                                  # not own open_decisions (so-clarifier does) and cannot edit OD-8's own
                                  # recorded text itself; a follow-up correction pass there is flagged,
                                  # non-blocking and informational, not performed here. FR-1 through
                                  # FR-7, FR-9 through FR-12, FR-13(a)/(b)/(d), and every part of FR-8
                                  # other than this new (b) clause are unaffected — PLAN_REVIEW v8 itself
                                  # scoped this loop-back to D15/FR-8/AC-4/OD-8 alone and found D1-D14/
                                  # T1-T14 need no rework.
---

# Specification: US-3.1 — Make the repair gate actually block ungrounded content and stop the brand-core/heading-form rule conflict

## Summary

When this is done: an unresolved specs-grounding failure (after retry) hard-blocks both ZIP and
plain-text export instead of only being logged as a warning, without burning the repair budget on
regenerations that cannot fix it; `heading-product-name-stuffing`'s full-pattern and short-pattern
branches agree on the same two "blessed" heading positions for the *stuffing exemption*, and a new
check makes the product's short name mandatory at the narrower of the two — the CTA heading only —
caught and repaired with the same severity and ladder parity as slug drift; the two FROZEN prompts
this Story is authorized to edit are given functional requirements
stating what their edited text must actually say, not just that editing them is authorized;
`meta_title` follows one template with no site-name suffix for every locale whose `h1` is 53 Unicode
code points or shorter (`FR-8(a)`), and a different, deterministic, always-reachable shape instead —
a word-boundary-safe prefix of `h1` plus a single differentiation mark, carrying neither
`{Localized Category}` nor `{Spec}` — for any locale whose `h1` reaches 54 code points or longer
(`FR-8(b)`); at every rung of `FR-8(a)`'s own cascade, including its terminal overflow case, and in
`FR-8(b)`'s regime alike, `meta_title` never degrades to an `h1`-identical value and always differs
from `h1`; and two
repair findings that today always cost a full-document regeneration (`doc-schema`,
`slug-name-designator-lost`) get a cheaper, genuinely reachable repair path. No generated-HTML
output shape changes — this is validation, repair-gate and (for two narrowly authorized FROZEN
prompts) prompt-text-disambiguation work. **The Owner has extended the §9 authorization (OD-7) to
`task-b.ts`'s per-locale Title budget table; FR-13(c) states the actual reconciled numbers. Margin
against the untouched `output-validator.ts` 55-char ceiling is real but thin (1 character for the
general-row budgets, 4 for de-DE). A title that overflows this thinned margin lands on the cheaper,
registered `meta-title-length` repair path only partially and probabilistically — that path's own
deterministic terminator has no awareness of the template's structure and can itself strip the
trailing `{Spec}`/`{Localized Category}` tail, re-tripping the unregistered
`meta-title-template-shape` check — an accepted, stated residual risk (FR-13(c)), not a settled
mitigation. Separately, and unaffected by FR-8(b): a template-shaped title within FR-8(a)'s own
`h1Len ≤ 53` domain that the model itself produces slightly over this thinned budget remains the
accepted, partially-mitigated residual just described — the only half of `OD-8`'s original
disposition that still stands. `OD-8`'s other half — a product whose `h1` itself reaches 54 Unicode
code points or longer, regardless of why — no longer degrades by design: `FR-8(b)` gives that regime
its own required, always-reachable shape instead, closing rather than merely bounding it (see
`FR-8(b)`).** **PLAN_REVIEW v1 found that implementing FR-13(a)/(b), and a
previously-unenumerated line-47 suffix-retention conflict stated as its own clause, FR-13(d),
required editing `task-b.ts` lines that OD-3/OD-7's recorded grants did not name — the "— meta_title —"
block's cascade text (lines 39-51, beyond line 44 and the anchors OD-3 already covers) and
`buildPromptB()`'s excerpt-construction code (lines 112-140). Specification v7 could not grant that
extension itself (AGENTS.md §9) and returned `BLOCKED`, opening **OD-9** for the Owner. **The Owner
has now granted OD-9 in full** (`docs/decisions/US-3.1-open-decisions.md#4`) — the whole "—
meta_title —" block (lines 39-51, explicitly naming lines 46, 47, 48 and 49) and `buildPromptB()`'s
excerpt-construction code (lines 112-140). so-clarifier independently verified the grant fully
covers what FR-13(a)/(b)/(d) need, with no gap. **FR-13(a)/(b)/(d) are finalized below as concrete,
unblocked functional requirements, authorized in full under OD-9.** so-clarifier's own verification
of OD-9 also opened a further, non-blocking **OD-10**:
fixing line 49's `h1`-identity collision (FR-13(b)) by appending a differentiation marker can itself
push a previously-ceiling-compliant `meta_title` over the untouched, FROZEN `output-validator.ts`
`MAX_META_TITLE = 55` check, for a precisely bounded set of H1-core lengths (one exact length, 55,
for the general-row locales; up to four, 52-55, for de-DE). **This revision resolves OD-10 by
accepting the bounded cost as a named residual, parallel to OD-8, rather than by a length-neutral
substitution** — a substitution was checked and ruled out, not silently avoided: `task-b.ts`'s own
"— meta_title —" block requires `meta_title` "MUST begin with the H1 core verbatim
(character-for-character)" (line 40), a rule the terminal rung is not exempt from; replacing any
character inside the bare H1 core breaks that verbatim guarantee and corrupts the customer-facing
product name, and the resulting string still diverges from FR-8's approved template shape (no
`{Localized Category}`/`{Spec}`) exactly as the unmarked core already does today — so a substitution
buys no escape from FR-8's own unregistered, full-regen-only path, while an appended marker keeps the
H1 core intact as a true prefix and correctly resists that path only when it stays under the ceiling.
Stated and reasoned explicitly at FR-13(b) and in Open questions, not left implicit.

**v16 resolves the two questions ARCHITECTURE_PLANNING's implementation-plan v6 folded into its
`CHANGES_REQUIRED` loop-back, both scoped to FR-7 alone — FR-6/FR-8/FR-9/FR-12/FR-13 are unaffected.**
First, FR-7's own "Illustrative boundary cases" name two punctuation-free CTA/sentence-framing examples
that its registered banned-character/occurrence-count/trailing-position mechanism cannot mechanically
reject (neither carries a banned character); v16 states this honestly as a disclosed, unclosed residual
rather than shipping either of the two candidate detectors so-planner checked and found wanting — a
core-position rule (rejected: reintroduces, on real uk-UA category-first content, the same false-positive
class that already parked T7 once) or a word-count-margin rule (rejected: under-catches short framing).
Second, `heading-brand-core-missing`'s mandatory-presence check is narrowed to the CTA-heading position
only: Impact Analysis v3 re-confirmed, by direct fixture read, that the golden corpus's own
`functionality[0].heading` is genuinely product-name-free, human-accepted content the check as specified
through v15 would flag and spend repair budget "fixing" — a real, evidenced cost the QA report's own
brand-core-invariant finding never evidences at that position (only at `cta.heading`). See Background,
v16, and FR-7 below for both changes in full.

**v17 fixes exactly the two blocking findings SPEC_REVIEW v15 raised against v16 — nothing else
changes; FR-6/FR-8/FR-9/FR-12/FR-13 remain unaffected.** First, an internal-consistency defect: v16's
own FR-7 paragraphs were correctly narrowed to the CTA-heading-only scope, but several other live
passages elsewhere in the document — including two entries in the "Flagged for awareness at
`HUMAN_SPEC_APPROVAL`" list — still asserted the pre-v16, two-blessed-position model as current. Every
such passage (re-swept this round, catching two further instances beyond SPEC_REVIEW v15's own
non-exhaustive list) is corrected in place below to agree with FR-7's own text; no chronologically-framed
Background history was touched. Second, v16's Background never disposed of the conditional-correctness
alternative OD-6 itself originally named for the first-§3-heading question. This revision defines and
checks the only two workable triggers for "the heading names the product at all" against this codebase's
own `product-name-core.ts` and both real corpus fixtures, rejects both (one reproduces the identical
no-match ambiguity the existing `shortPattern` idiom cannot resolve; the other reintroduces the same
token-level false-positive class v16 already rejected the core-position rule for), and keeps v16's
CTA-heading-only removal. The QA report's own "Что сделать" recommendation (line 84), which read alone
asks for broader coverage, is now cited directly and disclosed at `HUMAN_SPEC_APPROVAL` alongside why it
is not acted on literally. See Background, v17, point 2, and FR-7 below for both fixes in full.

**v18 fixes the one blocking finding PLAN_REVIEW v8 raised — a Specification-authorization gap, not
a flaw in the design itself; nothing else changes; FR-6/FR-7/FR-9/FR-12/FR-13(a)/(b)/(d) remain
unaffected.** ARCHITECTURE_PLANNING's implementation-plan v10 designed a concrete mechanism — D15,
decomposed as T15 in task-breakdown v9 — for the long-`h1` case this Specification's own FR-8/OD-8
text (through v17) left as an accepted, undesigned-around residual ("the cascade must degrade for
that product by design"). PLAN_REVIEW v8's own partial technical audit independently confirmed D15's
engineering sound: for any locale whose `h1` is **54 Unicode code points or longer** — the exact
threshold, not an approximation; a narrower `h1Len ≥ 55` threshold, tried earlier in this Story's own
iteration, left `h1Len = 54` covered by neither the reachable template shape nor the alternate one —
no `h1`-anchored, template-shaped `meta_title` can ever satisfy both the approved template and the
untouched, FROZEN 55-character ceiling, so the pipeline instead deterministically computes and
unconditionally applies a different, always-reachable shape: a genuine, word-boundary-safe prefix of
`h1` (never an interior edit or deletion of `h1`, and never a mid-word truncation), immediately
followed by a single differentiation mark, applied before the artifact is ever validated. **PLAN_REVIEW
v8 found this sound but ruled that shipping it required a Specification amendment first, not merely
that it would benefit from one** — it ships user-observable behaviour `FR-8`/`AC-4`'s own approved
text does not authorize and, in `OD-8`'s case, affirmatively contradicted, and an Owner instruction
given informally to `so-planner` during `ARCHITECTURE_PLANNING` is not the same instrument as an
approved Specification (AGENTS.md §10). **v18 adds this behaviour as FR-8(b)**, describing the actual,
independently-verified mechanism the Plan and Task Breakdown designed rather than re-deriving one;
amends the `AC-4` traceability entry to state the accepted exception explicitly rather than silently;
corrects the small number of other passages (inside FR-8's own remaining text, FR-13(c)'s tradeoff
discussion, and Out of scope) that asserted the now-superseded "must degrade by design" framing for
this specific sub-case, applying the same full-file-consistency discipline v17 already applied for
FR-7; and states, at Open questions, that `OD-8`'s "must degrade by design" disposition is superseded
for this `h1Len ≥ 54` sub-case only — its other half (the `h1Len ≤ 53` thinned-margin residual,
`FR-13(c)`, a different mechanism D15 does not touch) is untouched. This Specification does not own
`open_decisions` (`so-clarifier` does) and cannot correct `OD-8`'s own recorded text itself; a
follow-up correction pass there is flagged as non-blocking and informational, not performed here. See
Background, v18, FR-8, and Open questions below for the full text and reasoning.

**v19 fixes the three blocking gaps SPEC_REVIEW v17 raised against v18's own FR-8(b) addition — a
document-wide consistency sweep v18 stated it was applying but did not fully carry through; FR-8(b)'s
own mechanism and threshold arithmetic are independently re-verified sound by SPEC_REVIEW v17 and are
unchanged.** First, the Summary's own two `meta_title` claims — "follows one template... at any rung
including the terminal overflow case," and, separately, the literal, pre-v18 "by design — an accepted
tradeoff (OD-8), not a defect" sentence, both left standing through v18 — are corrected in place below
to state that an `h1Len ≥ 54` entry takes `FR-8(b)`'s own separate, always-reachable shape instead of
degrading. Second, `FR-8(b)`'s own narrow no-word-boundary hard-clip fallback — a second, independent
departure from `AC-4`'s literal "including mid-word truncation of the product name" failure condition,
disclosed through v18 only inside `FR-8(b)`'s own prose — is now also disclosed at the `AC-4`
traceability row and at a new `HUMAN_SPEC_APPROVAL` bullet, the same way the `h1Len ≥ 54` shape
exception itself is disclosed; the fallback itself is unchanged, already-verified, accepted
engineering (`implementation_plan` v10 §2.6 Residual 1; `task_breakdown` v9's own T15 tests), not
redesigned here. Third, `FR-13(b)`/`OD-10`'s ceiling-collision residual — stale since `FR-8(b)` now
intercepts any `h1Len ≥ 54` entry before `task-b.ts`'s own line-48/line-49 cascade path is ever
reached — is corrected at `FR-13(b)` itself, the `AC-5` traceability row, `NFR-5`, and the
`HUMAN_SPEC_APPROVAL`/Open questions `OD-10` entries: the general-row collision case (previously
"exactly 55 characters") is no longer reachable at all, and de-DE's band narrows from 52-55 to 52-53 —
itself collision-live only depending on the differentiation marker's own length `m` (`m ≥ 4` at H1-core
length 52, `m ≥ 3` at 53), which this Specification still leaves to `so-planner`/the implementer. This
is stated as a narrowing, not a full close. Front matter `inputs_consumed` is also corrected to cite
`specification_review` v17 (SPEC_REVIEW v17's own non-blocking hygiene finding), in the same pass.
Nothing else changes; FR-1 through FR-12, FR-13(a)/(c)/(d), and FR-8(a)/(b)'s own normative text are
unaffected. See Background, FR-8(b), FR-13(b), Open questions, and the Traceability matrix below for
the full text of all three fixes.

**v20 adds FR-14, a narrow amendment unrelated to FR-8/FR-13/OD-10** — the loop-back trigger this round
is `ARCHITECTURE_PLANNING` (`so-planner` `implementation_plan` v12 §4c), not `SPEC_REVIEW`. A real-world
QA batch (`Knowledge/Issues/Second Batch/`), surfaced during this Story's own delivery-pipeline testing
(not by the original `First_Batch` QA report this Specification otherwise traces to), found that
`src/domain/description-doc.schema.ts:216` requires `cta.heading` to be non-empty unconditionally across
`schemaVersion`, while `render-description.ts:443-449` and `task-a-doc.ts:148-150` both confirm
`doc.cta.heading` is discarded at render time for every `schemaVersion: '4.0'` Doc — the model is told
so directly and reliably emits `cta.heading: ''`, so the schema rejects a value with zero effect on the
shipped artifact on every real v4 generation, burning a real field-scoped repair-gate attempt (this
Story's own `T1`). This predates US-3.1 (the schema line is unchanged since `937e283`, before
`schemaVersion: '4.0'` existed) — not a regression this Story introduced, but a real, reproducible defect
its own QA testing surfaced. `implementation_plan` v12 §4c searched v19 in full and confirmed no FR
authorizes relaxing it: v19's extensive existing `cta.heading` discussion is entirely about `FR-7`'s
Doc-path `heading-brand-core-missing` REPAIR check (which leaf it reads, for which `schemaVersion`), not
about the Zod schema's own presence requirement; `FR-10` is about making an already-firing `doc-schema`
finding cheaper to repair, not about whether it should fire at all. **v20 adds FR-14**, stating the
acceptance-observable behaviour only (a `schemaVersion: '4.0'` Doc's `cta.heading` need not be non-empty;
a `schemaVersion: '3.0'` Doc's remains required non-empty, exactly as today) — the Zod mechanism itself
stays `so-planner`'s decision, not restated here — and adds **AC-7** to the Traceability matrix, disclosed
there as this Specification's own addition rather than a Story acceptance criterion. `cta.text` and every
other field's validation are untouched. FR-1 through FR-13 and everything else in this Specification are
unaffected. See FR-14 and the Traceability matrix for the full text; this front matter's own
`open_decisions_blocking` note carries the complete evidence trail (file:line citations for
`description-doc.schema.ts`, `render-description.ts` and `task-a-doc.ts`), not restated a third time here.

## Background

`Knowledge/Issues/First_Batch/QA_report_makera_cyclone_2026-09-21.md` reported 7 findings from a
manual QA pass on an EXPERT3D generation (Makera Cyclone Dust Collector); every code-rooted finding
was independently re-verified against a second, same-day regeneration, so these are live generator
defects, not one-off model noise. CLARIFICATION ran twice: v1 opened five Open Decisions (three
blocking — OD-1/OD-2/OD-3 — and two non-blocking — OD-4/OD-5); the Story Owner
(sbruhov@gmail.com) answered all five on 2026-09-22, each answer re-verified against the actual
source files rather than accepted at face value (`docs/decisions/US-3.1-open-decisions.md` v2).
That second pass opened one further non-blocking decision, OD-6, and left OD-4 and OD-6 explicitly
delegated to the Specification stage to decide.

**v2 of the Specification** was rewritten after SPEC_REVIEW v1
(`docs/reviews/specifications/US-3.1-spec-review.md#1`) returned `CHANGES_REQUIRED` against v1
(`docs/specifications/US-3.1-spec.md#1`), closing six findings: FR-7's severity/repair-parity
against AC-3, FR-2's missing third `specs-grounding-disabled` emission site and its own
repair-budget regression, FR-3's ZIP-only narrowing of the export block, FR-10's structurally
unreachable `doc-schema` repair strategy, and the total absence of FR-12/FR-13 (functional
requirements for the two authorized FROZEN prompt edits).

**This is v3 of the Specification**, rewritten after SPEC_REVIEW v2
(`docs/reviews/specifications/US-3.1-spec-review.md#2`) again returned `CHANGES_REQUIRED` — this
time against a gap v2 itself introduced (v1 had no FR-13 to critique, so SPEC_REVIEW v1 could not
have found it): **FR-13's `task-b.ts` fix was narrower than AC-4 needs and narrower than what
OD-3's own resolution text authorized** ("update the few-shot examples to match the new AC-4
template," not merely their suffix). Independently re-verified against `task-b.ts` and
`Knowledge/Issues/First_Batch/meta-titles.txt` rather than trusting either v2's own text or the
review's numbers at face value:

1. **FR-13 (v2) never required `task-b.ts`'s degradation cascade to define AC-4's actual template
   components.** The cascade is built around an undefined `[Benefit]` placeholder
   (`task-b.ts:46-49`), not `{Localized Category}` and `{Spec}` — the two structured components
   AC-4's approved template (`{Product Name} - {Localized Category} {Spec}`) actually requires —
   and `buildPromptB()`'s `userContent` passes Task B no structured category or spec field to build
   either from. **v3 rewrites FR-13** to require the cascade define and produce these two
   components directly, not merely to stop instructing a mandatory site suffix.
2. **FR-13 (v2)'s anchor fix list (lines 86, 92, 97, 104) missed line 98** — Anchor 3's own "LAST
   RESORT" rung, which today already produces a `meta_title` byte-identical to `h1`
   (`"Bambu Lab PETG Translucent Orange 1.75mm 1kg"`, both at line 96 and line 98) — exactly the
   state FR-9's new `meta-title-h1-identical` check exists to reject. **v3 requires the cascade's
   most-degraded rung be fixed or removed** so it can never emit an `h1`-identical `meta_title`,
   and requires every affected anchor (including line 98) be updated to match.
3. **FR-8 (v2)'s claim that its unregistered `error`-severity check is a "rarely-exercised
   correctness backstop"** was asserted, not measured, and is factually wrong on re-derivation:
   `meta-titles.txt`'s own approved-template reference lengths (en-ES 49, es-ES 53, pt-PT 50,
   uk-UA 48 characters) already exceed `task-b.ts`'s own per-locale Title budgets (≤48 for
   en-ES/es-ES/pt-PT, ≤48 for uk-UA too) in three of the four sample locales — the fourth sits
   exactly at the budget with no margin. Built to the real template, the degradation cascade fires
   on most locales by construction, not occasionally. **v3 rewrites FR-8's framing** to state this
   honestly, and ties the fix to FR-13's now-required budget reconciliation rather than to the
   suffix-removal alone.

**This is v4 of the Specification**, revised after SPEC_REVIEW v3
(`docs/reviews/specifications/US-3.1-spec-review.md#3`) again returned `CHANGES_REQUIRED` — against
two further gaps in v3's own FR-13, independently re-verified against the live `task-b.ts` text and
against `Knowledge/Issues/First_Batch/meta-titles.txt`'s actual example strings (character-counted
directly this round, not read from that file's own summary column) rather than trusting either v3's
or the review's numbers at face value:

1. **FR-13(b) (v3) fixed only one of two independent paths to an `h1`-identical `meta_title`.**
   `task-b.ts` line 49 — `"H1 core is NEVER truncated mid-word. If bare core itself exceeds budget,
   return it unchanged."` — is a second, textually separate terminal rule, distinct from the step-3
   "LAST RESORT" rung (line 48) v3 already fixed. Because `h1` **is** the H1 core by the prompt's
   own H1 rule, an unmodified line 49 returns a `meta_title` identical to `h1` whenever even the
   most-degraded rung still overflows budget — exactly the overflow case v3's own FR-13(c) already
   conceded will still occur. **v4 extends FR-13(b)** to require line 49's overflow behaviour
   changed as well, and restates the requirement in directly testable terms (no rung, including the
   terminal overflow rule, may return the bare H1 core unmodified) rather than v3's softer,
   non-verifiable "retains at least a minimal marker" language.

2. **FR-13(c) (v3) extended OD-3's authorization to `task-b.ts`'s per-locale Title budget table —
   a scope OD-3's own resolution text does not support.**
   `docs/decisions/US-3.1-open-decisions.md` (v2)'s own verification note for OD-3 states the
   authorized scope "matches exactly what AC-4 requires and nothing broader," and OD-3's granted
   text names only the mandatory-suffix instruction and the four few-shot anchors — not the
   separately-headed "— PER-LOCALE BUDGETS —" block those anchors merely cite. Independently
   re-verified this is not severable from FR-13(a): re-counting `meta-titles.txt`'s own four
   example strings character-by-character (not reading its own "Длина" column, itself miscounted
   for three of the four rows) confirms three of four reference locales (en-ES 50, es-ES 53, pt-PT
   49) exceed `task-b.ts`'s current ≤48 per-locale budget once FR-13(a)'s real
   `{Localized Category}`/`{Spec}` components are built to the approved template; uk-UA's own
   reference example is 47 characters, one **under** budget, not "exactly at the budget" as v3
   stated. **v4 does not silently re-assert the budget-table edit as already authorized, and does
   not silently drop it either.** FR-13(c) states the edit as contingent on a new, explicit Owner
   authorization — recorded as new Open Decision **OD-7** below — that this Specification stage
   does not have the authority to grant itself (the same authorization boundary AGENTS.md §9 draws
   for every FROZEN-file edit). Because FR-13(a) and FR-13(c) are not severable, this Specification
   is **`BLOCKED`, not `PASS`**, on this one point — see Open questions.

**This is v5 of the Specification**, resuming after CLARIFICATION logged and verified the Owner's
answer to OD-7 (`docs/decisions/US-3.1-open-decisions.md#3`, `docs/evidence/US-3.1-clarification-
report.md#3`). Two things changed, both independently re-verified against source in this round
rather than accepted from the clarification round's own numbers:

1. **OD-7 is resolved — the Owner extends the §9 authorization to `task-b.ts`'s per-locale Title
   budget table (lines 67-79), "for all locales."** FR-13(c) below states the actual reconciled
   budget numbers rather than the two-branch conditional v4 was forced to write while the
   authorization was outstanding.
2. **CLARIFICATION's own verification of OD-7 opened a second, non-blocking decision, OD-8**: the
   Owner's cited "45-60 characters" is `meta-titles.txt`'s *display*-safety range for the rendered
   title, not a literal instruction for the table's `≤` budget field — the budget field is bounded
   above by `output-validator.ts`'s untouched, FROZEN `MAX_META_TITLE = 55` (independently
   re-confirmed at line 41, an `error`-severity check at lines 654-668), a file this Story does not
   authorize touching. Re-deriving the arithmetic independently (character-counting
   `meta-titles.txt`'s four example strings directly, not reading its own "Длина" column, which
   under-counts three of the four rows by one character): en-ES 50, es-ES 53, pt-PT 49, uk-UA 47
   — confirming v4's and CLARIFICATION v3's own counts. The longest sampled locale-shape (es-ES, 53
   characters) sets the budget's floor; the untouched 55-char ceiling sets its practical top —
   together leaving only {53, 54} as budget values that fit both constraints at once, one to two
   characters of margin against the table's currently-designed seven (55−48). **v5 resolves OD-8 as
   an accepted, stated tradeoff** (parallel to FR-7's own accepted `productShort()` false-positive
   cost): FR-13(c) sets the budgets at 54 (the wider of the two, since 53 would leave es-ES with
   zero margin, contradicting the table's own "a title at the budget still has room to spare"
   principle), states plainly that this shrinks the model's own character-miscounting buffer against
   the 55-char ceiling from 7 to 1, and states that a product whose name or localized-category term
   runs longer than the QA sample cannot reach the template shape within that ceiling at any budget
   value — an inherent limit of the approved template for such products, not a defect this Story
   can close without either shortening the template's components or a separate, new §9
   authorization to touch `output-validator.ts` itself (neither of which is in scope here).

**This is v6 of the Specification**, rewritten after SPEC_REVIEW v5
(`docs/reviews/specifications/US-3.1-spec-review.md#5`) again returned `CHANGES_REQUIRED` — this
time confirming both FR-13(b)'s fix and FR-13(c)'s new budget numbers (≤54 general, ≤51 de-DE) as
correct, and confirming OD-7 is a genuinely separate, valid Owner grant, while raising one blocking
and one non-blocking finding against FR-13(c)'s own text, both independently re-traced against
`src/utils/repair-strategy.ts`'s live source in this round rather than accepted from the review's
description:

1. **FR-13(c) (v5) overclaimed the risk-transfer from the thinned ceiling margin as a settled
   fact.** v5's text stated that thinning the margin against `output-validator.ts`'s untouched
   55-char ceiling (from 7 characters to 1) "genuinely satisfies," rather than merely asserts, the
   Owner's "does not provoke unnecessary repair cycles" instruction, on the claim that any title
   crossing 55 lands cleanly on `meta-title-length`'s existing cheap, registered ladder
   (`['field-scoped', 'deterministic']`). Independently re-tracing that ladder's deterministic tier
   this round: `truncateAtWordBoundary()` (`repair-strategy.ts` lines 178-195) only preserves a
   trailing segment when the text still contains a `' | '` separator (`sepIndex = text.lastIndexOf('
   | ')`); FR-8's own suffix-removal means no correctly-shaped `meta_title` carries that separator
   any more, so this tier falls straight through to `cutOnWordBoundary()` (lines 197-204) for every
   template-shaped title it repairs. `cutOnWordBoundary()` clips to the character limit, backs up to
   the last space, and strips trailing punctuation — with **no knowledge of the
   `{Product Name} - {Localized Category} {Spec}` template's own structure**. A cut landing at or
   before `{Localized Category}` can strip the trailing `{Spec}`/`{Localized Category}` token
   entirely, producing a title under 55 characters that no longer matches the template shape — which
   re-trips FR-8's own `meta-title-template-shape` check, confirmed unregistered in
   `REPAIR_STRATEGIES`, so `resolveLadder()` returns `['full-regen']` for it: the exact expensive
   path the margin-thinning was supposed to avoid. **v6 restates FR-13(c)'s risk-transfer claim
   honestly, as a partial, probabilistic mitigation** — the same register FR-7 already uses for its
   own accepted `productShort()` false-positive cost — rather than as a settled fact, and records the
   `cutOnWordBoundary()` gap as a named, accepted residual risk. This is a Specification-text
   correction, not a code fix: `cutOnWordBoundary()` is a generic, rule-keyed, product-independent
   primitive by the file's own stated design principle (`repair-strategy.ts` lines 4-5, "a strategy
   is selected by rule identity, never by store, locale, or product"), and teaching it the specific
   internal structure of one field's template shape is a real design change, not a simple one — so
   this revision does not invent that fix under authority it does not have; a future Story may
   register a template-aware repair for `meta-title-template-shape` itself, or teach the
   deterministic tier to preserve a minimal placeholder for the dropped component, as a follow-up.
2. **Non-blocking: the de-DE ceiling-margin arithmetic was wrong.** v5 stated the margin against the
   55-char ceiling as "1 character (55-54, or 55-51 for de-DE)" in two places — but 55−51 = 4, not 1.
   The ≤51 budget value itself was already correct (54−3, preserving the table's existing 3-character
   gap below the general row) and is unchanged; only the stated margin figure for de-DE was wrong.
   **v6 corrects both occurrences** to state the general-row margin (55−54 = 1) and the de-DE margin
   (55−51 = 4) as the two distinct numbers they are, rather than conflating them.

**This is v7 of the Specification**, rewritten after PLAN_REVIEW v1
(`docs/reviews/plans/US-3.1-plan-review.md#1`) returned `CHANGES_REQUIRED` with
`loop_back_stage: changes_required_specification` — not a SPEC_REVIEW finding against v6's own text
in isolation, but a blocking FROZEN-file authorization-scope gap PLAN_REVIEW found in the task
breakdown (T10) built *from* v6's own FR-13(a)/(b) text, independently re-verified this round against
the live `task-b.ts` source rather than accepted from the review's own line citations:

1. **FR-13(a) and FR-13(b) (v6), as written, cannot be implemented without editing `task-b.ts` lines
   no recorded §9 authorization names.** T10's own Notes (confirmed by PLAN_REVIEW's independent
   re-read) found that satisfying (a) — defining `{Localized Category}`/`{Spec}` in place of the
   undefined `[Benefit]` placeholder — requires editing cascade step 1 (line 46) and, to source the
   category/spec data the model needs, `buildPromptB()`'s `[CONTEXT]`-excerpt construction (the
   `context` ternary at lines 120-121, and the `userContent` template at lines 128-132 that would
   carry any added structured field); satisfying (b) — no rung ever producing an `h1`-identical
   `meta_title` — requires editing cascade step 3 (line 48) *and* the bare-core-overflow rule (line
   49). None of D3 (scoped to `[HEADING FORM]`/invariant-core disambiguation), OD-3 (scoped to line 44
   and the four few-shot anchors, lines 81-106) or OD-7 (scoped to the per-locale budget table, lines
   67-79) names any of lines 46, 48, 49, or `buildPromptB()`'s excerpt-construction code. This is
   independently re-verified against `task-b.ts`'s live text, not accepted from PLAN_REVIEW's own
   table.
2. **A second, previously-unenumerated defect in the same block: line 47 still instructs a kept site
   suffix.** Cascade step 2 (line 47), `"[H1 core] | [Site Suffix]"    ← drop benefit, KEEP suffix`,
   is a second, textually distinct suffix mandate from line 44's "MANDATORY" sentence OD-3 already
   authorizes removing — independently re-confirmed live. No version of this Specification's FR-13 has
   previously named line 47, and it directly contradicts FR-8's "no site suffix" requirement: a
   `meta_title` produced at step 2 as written still carries a `| {site_name}` segment, which FR-8's own
   `meta-title-template-shape` check fails. **v7 gives this its own clause, FR-13(d)**, rather than
   leaving it folded silently into (a)'s suffix-removal framing where SPEC_REVIEW and PLAN_REVIEW have
   twice now found an unenumerated gap by omission.
3. **Two paths were weighed for closing this, and narrowing was ruled out on the evidence, not
   assumed away.** Whether FR-13(a)/(b)/(d) could be restated to avoid touching these specific lines
   while still satisfying AC-4/AC-5 was checked directly, not skipped in favor of the more familiar
   OD-7 pattern: `[Benefit]` (line 46) is the only place `{Localized Category}`/`{Spec}` could be
   named for the model at all — leaving it untouched means AC-4's template is never actually produced,
   only checked for after the fact, which would make every affected generation depend on the repair
   ladder to reach a state the prompt text never asked for in the first place (and FR-8/FR-9 carry no
   registered repair strategy of their own — see Out of scope — so that path is full-regen, not a
   cheaper rung); lines 48/49 are the *only* two places the h1-identical collision FR-9 exists to
   reject is actually produced, so leaving them untouched leaves FR-9 permanently reactive rather than
   preventive on exactly the rungs Anchor 3 already demonstrates firing; and any data path FR-13(a)
   requires necessarily edits `buildPromptB()`, because it is the only function in the file that
   constructs `userContent` — there is no data route into the prompt that does not touch it. Narrowing
   FR-13(a)/(b)/(d) to stay inside the currently-authorized lines would not satisfy AC-4/AC-5 as
   stated; it was not chosen. **v7 instead states FR-13(a)/(b)/(d) as contingent on a new, explicit
   Owner authorization** — the same disposition v4 used for FR-13(c) before OD-7 was granted, and the
   disposition PLAN_REVIEW itself recommends — recorded below as a new Open Decision this
   Specification asks CLARIFICATION to open (not written by this stage; so-spec-writer does not
   resolve Open Decisions), scoped to the whole "— meta_title —" block (lines 39-51) and
   `buildPromptB()`'s excerpt-construction code together, on PLAN_REVIEW's own reasoning that a
   line-list authorization has now twice (OD-7, and this gap) been found incomplete by a later pass.
   **Because FR-13(a), (b) and (d) are not severable from this authorization, this Specification is
   `BLOCKED`, not `PASS`, on this one point** — see Open questions. FR-13(c) (the budget table) is
   unaffected: OD-7 already authorizes it, independently re-confirmed unchanged this round.

**This is v8 of the Specification**, resuming after so-clarifier logged and verified the Owner's
answer to **OD-9** (`docs/decisions/US-3.1-open-decisions.md#4`), independently re-verified against
the live `task-b.ts` and `buildPromptB()` source in this round rather than accepted from the
open-decisions artifact's own text:

1. **OD-9 is resolved — the Owner grants full §9 authorization to modify the whole "— meta_title —"
   block (lines 39-51), explicitly naming lines 46, 47, 48 and 49, and `buildPromptB()`'s
   excerpt-construction code (lines 112-140).** Re-read against the live file this round: the block's
   header is confirmed at line 39 and runs through line 51; `buildPromptB()` runs from line 112
   (`export function buildPromptB(`) through line 140 (`}`) — both exactly matching the Owner's and
   so-clarifier's cited ranges. Every line FR-13(a)/(b)/(d) needs (46, 47, 48, 49) and the whole
   `userContent`-construction function (112-140, a superset of the `[CONTEXT]` ternary at 120-121 and
   the `userContent` template at 128-132 v7's Open questions specifically named) is covered — no gap
   remains. **v8 finalizes FR-13(a), (b) and (d) below as concrete, unblocked functional requirements**,
   removing v7's "pending authorization" / `BLOCKED` framing throughout FR-13, its NFR-5 note, its Out
   of scope bullet, and its Open questions/traceability entries — FR-1 through FR-12 and FR-13(c) are
   otherwise unchanged from v7, independently re-confirmed unaffected by this round's edits.

2. **so-clarifier's own verification of OD-9 opened a new, non-blocking OD-10**, which this revision
   is explicitly asked to resolve rather than leave implicit: satisfying FR-13(b) — no cascade rung,
   including the line-49 terminal overflow rule, may ever return a `meta_title` byte-identical to
   `h1` — requires the overflow rule to alter the returned string whenever the bare H1 core alone
   would otherwise be returned unchanged. Independently re-verified against the live
   `output-validator.ts` (`MAX_META_TITLE = 55` at line 41; `if (titleLen > MAX_META_TITLE)` at line
   660 — a title of exactly 55 characters passes today, only 56+ fails) and against FR-13(c)'s
   reconciled budgets (≤54 general rows, ≤51 de-DE): line 49 is reached only when the bare H1 core
   itself exceeds the row's budget, so the smallest H1-core length reaching it is 55 for the general
   rows (which, unmarked, sits exactly at the ceiling and passes today) and 52-55 for de-DE (all
   unmarked-passing today). **If the fix appends a marker of length `m ≥ 1` to make the string differ
   from `h1`, it pushes an H1 core of exactly 55 (general rows) — or, depending on `m`, any of 52-55
   for de-DE — from passing to newly failing the untouched, FROZEN `meta-title-length` check.** Two
   resolution paths were weighed: (a) accept this as a bounded, named residual, the same disposition
   OD-8 already uses for its own margin-thinning cost; or (b) constrain FR-13(b) to a length-neutral
   substitution — replacing a character already present in the bare core rather than appending one —
   so the returned string's length never exceeds the bare core's own length, closing the residual
   entirely rather than merely bounding it.

   **This revision chooses path (a), after checking (b) directly rather than assuming it is the
   safer default.** (b) fails on independent re-reading of the same "— meta_title —" block for two
   reasons: first, `task-b.ts` line 40 states `meta_title` "MUST begin with the H1 core verbatim
   (character-for-character)" as a rule governing every cascade step, the terminal rung included —
   replacing any character inside the bare core (the only content the terminal rung returns) breaks
   this verbatim guarantee outright, since the resulting string no longer contains the H1 core intact
   as a prefix; it also corrupts the actual product name in a customer-facing field, which is a
   correctness regression, not a stylistic tradeoff. Second, a substituted core is no closer to
   satisfying FR-8's `meta-title-template-shape` check than an unmarked or appended one: none of the
   three contains `{Localized Category}`/`{Spec}`, so all three already diverge from the approved
   template shape and already land on FR-8's unregistered, `full-regen`-only path exactly as today's
   unmarked terminal rung does (see FR-8, Out of scope) — substitution buys no escape from that cost,
   it only adds a new one (the corrupted-name defect) on top. An appended marker, by contrast, keeps
   the H1 core intact as a true prefix (satisfying line 40 and FR-4's/the H1 PRIMARY RULE's
   verbatim-consumption guarantee) and produces the same, already-accepted FR-8 divergence the
   unmarked core produces today — the only *new* cost it introduces is OD-10's own precisely bounded
   ceiling collision. **Given that (b) does not actually close anything — it trades a bounded,
   already-partially-mitigated cost for a certain correctness defect plus the same unregistered-path
   cost — this revision accepts OD-10's residual instead**, stated at FR-13(b) below and in Open
   questions, with the same honesty FR-13(c) already uses for OD-8's own residual.

**This is v9 of the Specification**, rewritten after `so-planner`'s implementation-plan v5
(`docs/plans/US-3.1-implementation-plan.md#5`) returned `CHANGES_REQUIRED` with
`loop_back_stage: changes_required` while re-planning T7 (FR-6/FR-7) after an IMPLEMENTATION defect
— not a SPEC_REVIEW finding against v8's own text in isolation, but a scope gap in FR-7's Doc-path
acceptance criteria that only surfaced once T7 was actually built against real `schemaVersion: '4.0'`
fixtures, independently re-verified this round against the live `render-description.ts` and
`store-render-rules.ts` source rather than accepted from the Plan's own citations:

1. **FR-7 (v8), as written, did not distinguish `doc.cta.heading`'s Doc-path meaning by
   `schemaVersion`, and one of the two schema versions it is silently assumed to hold for does not
   hold.** `render-description.ts` lines 443-449 discard `doc.cta.heading` unconditionally for every
   `schemaVersion: '4.0'` (v4/simplified-template) Doc and assemble the heading that actually ships
   from `getRenderRules(storeName).ctaHeading(doc.locale, doc.localizedName)` instead
   (`store-render-rules.ts:58,90-106`) — a per-locale template that substitutes the product's own
   short name as a direct argument and, independently re-confirmed this round, throws rather than
   silently degrading for any locale a store's registry does not cover (`store-render-rules.ts:92-101`),
   so it cannot itself omit the brand core. Left as v8 stated it, FR-7's Doc-path
   `heading-brand-core-missing` check reads `doc.cta.heading` at the CTA position regardless of
   `schemaVersion` — on every real v4/simplified-template generation this spends repair-instrument
   and, on a non-converging rewrite, full-document-regeneration budget "fixing" a field the renderer
   has already discarded, while the field that actually ships goes unvalidated at the Doc-path (though
   not at the HTML/string-path — see FR-7 below). `test/fixtures/simplified-docs.ts`'s `cta.heading:
   'ignored'` placeholder, present on every one of its `schemaVersion: '4.0'` builders, already
   documents this in the fixtures; so-planner's own grep sweep of all 15 consumers of that fixture
   module found the cost currently silent (no test assertion catches it yet), not test-breaking — but
   real, and this Story's own FR-7 would ship a registered, `error`-severity check that runs against
   nothing on the schema version most real generations now use.
2. **Two paths were weighed for closing this, and the redundant one was ruled out on the evidence, not
   assumed away.** Retargeting the Doc-path CTA check, for a `schemaVersion: '4.0'` Doc, to validate
   `getRenderRules(storeName).ctaHeading(...)`'s own return value in place of `doc.cta.heading` was
   considered and rejected: that function is correct by construction for every locale any store's
   registry actually covers, so a check against its output could only confirm what its own code
   already guarantees, at the cost of opening a new call site into store-render-rules logic purely to
   feed a validator — not needed to satisfy AC-3, which exists to catch a locale that *drops* the core,
   not to defend code that structurally cannot drop it. **v9 instead scopes FR-7's Doc-path
   CTA-heading check to `schemaVersion: '3.0'` Docs**, where `doc.cta.heading` is genuinely what
   ships (`render-description.ts`'s `isV4` branch confirmed false on that path) — leaving the
   Doc-path first-§3-heading check (`doc.functionality[0].heading`, rendered identically on both
   schema versions, per `renderDescription()`'s unconditional `.map(s => renderSubsection(s, ...))`)
   and the entire HTML/string-path check (both positions, every `schemaVersion`, validating rendered
   output rather than a pre-render field) fully unaffected and in force, exactly as v8 stated them.
   This is a scope/boundary clarification of FR-7 as already approved — OD-6 already established
   `heading-brand-core-missing` as mandatory-presence "by design"; v9 decides only which Docs' CTA
   field that presence check reads, for the schema version whose renderer discards it, not whether
   presence is required — not a reopening of OD-6, and not a weakening of FR-7 for `schemaVersion:
   '3.0'` Docs, where every part of v8's check remains fully in force.
3. **This resolves from OD-6 and the codebase evidence directly, without opening a new Open
   Decision.** OD-6 already settled that brand-core presence at the two blessed positions is
   mandatory "by design," for whichever field genuinely carries that presence to the shipped
   artifact; which field that is, for which `schemaVersion`, is a fact about the renderer
   (`render-description.ts:443-449`), not a judgment call the Owner needs to make. `so-planner`'s own
   Plan v5 states this directly: "narrowing FR-7's Doc-path trigger to skip `v4` docs is exactly the
   kind of check-scope decision that belongs to Specification" — and this Specification is where that
   decision is made, on the evidence, not left as a further open item.

**This is v10 of the Specification**, rewritten after SPEC_REVIEW v8
(`docs/reviews/specifications/US-3.1-spec-review.md#8`) again returned `CHANGES_REQUIRED` — a
**blocking** finding against v9's own replacement enforcement claim, not against the data-flow fact
v9 rescoped FR-7 on (that fact — `render-description.ts:443-449` discarding `doc.cta.heading` for
`schemaVersion: '4.0'` — was independently re-confirmed correct by SPEC_REVIEW v8 itself).
Independently re-traced this round against the live `content-orchestrator.service.ts`,
`render-description.ts`, `description-doc.schema.ts`, `task-a-doc.ts` and `repair-strategy.ts`
source, not accepted from either v9's or the review's own citations:

1. **v9's claim that the HTML/string-path check "runs at both blessed positions, for every generated
   locale, for every `schemaVersion`" and so leaves AC-3 "fully enforced... for `schemaVersion: '4.0'`
   Docs, at the HTML/string-path" is false for the uk-UA master on the Doc pipeline — the pipeline
   every currently-enrolled store now uses for every generation (`doc-pipeline-flag.ts`: "EVERY LIVE
   STORE IS NOW ON THIS LIST").** Confirmed by re-reading `runDocGate()` line by line
   (`content-orchestrator.service.ts:486-664`): its own `validate()` closure (546-599) composes
   `validateHeadingStyleDoc(doc, ...)` — the Doc-path form, addressed against the pre-render `doc` —
   and nothing else heading-related; rendering happens exactly once, **after** the gate concludes
   (line 656's own comment: "The ONE render call for this Task A generation... Runs AFTER every Tier-1
   validator above"), and the returned HTML is handed back with no further validation inside
   `runDocGate()` at all. The only place the HTML-path form (`validateHeadingStyle`) is ever applied
   to this rendered master HTML is `runOutputValidation()` (`content-orchestrator.service.ts:1708`) —
   confirmed to run "LAST in the pipeline" and to merge its findings only into `validationIssues` for
   on-screen/`.md`-report display, never into `repairReport`, never repaired, and never counted by
   `repairUnresolvedCount()`/FR-3's export-block condition. So for the master, specifically, the
   HTML/string-path check that v9 relied on to make FR-7 "fully enforced" for `schemaVersion: '4.0'`
   simply never runs in-gate — v9's enforcement claim was asserted, not verified against the call
   graph it cites as its own evidence.
2. **Two mechanisms were weighed to close this, and the codebase already contains the second one's
   prerequisite, ruling out inventing a new gate stage.** (i) Wire `validateHeadingStyle` into
   `runDocGate()` itself, in-gate, against the rendered HTML — rejected: `runDocGate()`'s own
   structure renders exactly once, after the gate concludes, specifically so that every Tier-1
   validator runs against the pre-render `doc` (line 649-655's comment states this ordering
   deliberately); inserting a second, post-render validation-and-repair pass inside the same gate
   would require rendering *before* repair can be evaluated, repairing the rendered HTML text (not
   the `doc` the rest of the gate repairs), and re-rendering or re-parsing afterward — restructuring
   `runDocGate()`'s render/validate ordering, which no Finding here requires and which risks the
   `normalizeDocProse`-vs-render-order hazard line 649-655 already flags for a future validator. (ii)
   Retarget the Doc-path `heading-brand-core-missing` CTA-heading check, for a `schemaVersion: '4.0'`
   Doc, from the discarded `doc.cta.heading` to `doc.localizedName` — the exact value
   `getRenderRules(storeName).ctaHeading(doc.locale, doc.localizedName)` substitutes into the shipped
   v4 CTA heading (`render-description.ts:448`, independently re-confirmed unchanged). Chosen: this
   needs no new gate stage and no render-order change — `doc.localizedName` is already read by, and
   available inside, the exact `validate()` closure `heading-brand-core-missing`'s other Doc-path
   checks already run in (`content-orchestrator.service.ts:546-599`, the same closure that composes
   `validateHeadingStyleDoc` at line 563); it is a plain top-level `NonEmpty` string field
   (`description-doc.schema.ts:182`), addressed by the same `"doc."`-prefixed dot-path idiom
   `getAtPath`/`setAtPath` already use generically for `doc.cta.heading` and
   `doc.functionality[0].heading` (`repair-strategy.ts:153`, confirmed not field-specific), so it is
   field-scoped-repairable by the same registered ladder with no new repair primitive; and checking it
   pre-render, in-gate, closes the enforcement gap directly rather than trying to catch the same defect
   later in rendered HTML the gate structurally does not revisit.
3. **This also closes SPEC_REVIEW v8's compounding, non-severable finding — but only for the
   direction `heading-brand-core-missing` itself checks: presence, not exclusivity.**
   `getRenderRules(...).ctaHeading()`'s parameter is named `productShortName`, but the value it
   actually receives, `doc.localizedName`, is a plain model-authored field the prompt defines only as
   "product name as it should read in this language" (`task-a-doc.ts:55`) — presence-only in the
   schema (`description-doc.schema.ts:182`), not typed or required to equal `productShort()`'s output,
   and independently re-confirmed by a full-repo search to be checked against `productShort()`/the
   brand core by no validator anywhere before this revision. Requiring the same
   `heading-brand-core-missing` presence rule against `doc.localizedName` for `schemaVersion: '4.0'`
   Docs states, for the first time, which of the two forms OD-2 recognizes `doc.localizedName` is
   required to hold at the CTA position: it must **contain** the `productShort()` form — the same
   negative-match-against-`shortPattern` test FR-7 already applies to `doc.cta.heading` and
   `doc.functionality[0].heading`. **This closes the "core missing entirely" direction (this Finding),
   not the "core present but overlaid with more than the short form" direction — that is FR-6's
   direction, not FR-7's, and FR-6's own Doc-path form is untouched by this revision (see Out of
   scope, and FR-6/FR-7's own disjointness box above).** A model that writes the
   full/invariant name into `doc.localizedName` still passes this new `heading-brand-core-missing`
   check (the full name contains the short form as a substring) and ships a v4 CTA heading carrying
   *more* than OD-2's short-form requirement — an FR-6-shaped defect, not caught in-gate for
   `schemaVersion: '4.0'` by this revision, for the same reason FR-6's own Doc-path check is not
   wired for v4 (see the new Out-of-scope bullet on FR-6's parallel gap). This revision closes exactly
   the omission SPEC_REVIEW v8's Finding 1/AC-3 concerns — it does not additionally close FR-6's
   already-documented, separately-scoped, non-blocking parallel gap.
4. **Net effect, restated precisely (replacing v9's overclaim): for the Doc-pipeline master, brand-core
   *presence* at both blessed positions is enforced end to end by the Doc-path check alone — not by a
   combination with the HTML/string-path.** The first-§3-heading position
   (`doc.functionality[0].heading`) was already covered, for both schema versions, by the existing
   in-gate Doc-path wiring (`validateHeadingStyleDoc` at `content-orchestrator.service.ts:563`); this
   revision adds the CTA position's `schemaVersion: '4.0'` coverage at the same call site, checking
   `doc.localizedName` in place of the discarded `doc.cta.heading`. `render-description.ts`'s own
   render call (lines 443-450) is a deterministic function of these validated fields, and
   `getRenderRules(...).ctaHeading()` is confirmed to throw rather than silently drop the core for any
   locale a store's registry does not cover (`store-render-rules.ts:92-101`, unaffected by this
   revision) — but the validated `doc` is not handed to `renderDescription()` unchanged: the same
   render call passes it through `normalizeDocProse()` first (lines 656-657:
   `renderDescription(normalizeDocProse(result.artifact.doc, opts.locale), ...)`), which rewrites
   every prose-bearing field, `doc.localizedName` included (`doc-prose-transforms.ts:102`,
   `mapDocText`'s explicit field list), for number/unit formatting and locale-specific terminology
   substitution before render — `cyrillizeUnits` (`unit-cyrillize.ts`) among them, which by its own
   stated purpose (its own file's doc comment) exists specifically to rewrite a Latin unit inside a
   product-name-shaped string to Cyrillic for uk-UA/ru-UA ("Ortur H20 20 W" -> "Ortur H20 20 Вт"),
   independently confirmed by reading the file in full. **This ordering — validate the
   pre-normalization `doc`, then normalize, then render — is not introduced by this revision; it
   already governs `doc.cta.heading` (v3) and `doc.functionality[0].heading` (both versions) today,
   since `mapDocText` rewrites `cta.heading` and every `functionality[].heading` identically
   (`doc-prose-transforms.ts:134,73`), and it is not specific to `runDocGate()` either —
   `productNamePattern()` (`heading-style.ts:37-40`) only builds digit/Latin-letter flexibility into
   its match (`"20W"` vs `"20 W"`), with no Cyrillic-unit awareness, so the same
   Latin-pattern-vs-possibly-Cyrillic-unit-text mismatch this ordering can produce for
   `doc.localizedName` can equally already occur for `doc.cta.heading`/`doc.functionality[0].heading`
   today, and for the HTML/string-path check's own post-render, post-cyrillization text.** Whatever
   false-positive or false-negative exposure this mismatch creates is not a new, unverified category
   of cost this revision introduces — it is the same `productShort()`/`productNamePattern`-matching
   risk FR-7's own "Accepted cost" paragraph above already names and accepts (a Latin-built pattern
   tested against text that may legitimately differ in exactly this kind of surface form), now simply
   reachable through one additional pathway (unit cyrillization specifically, alongside the
   heuristic's already-documented category-noun over-capture). This is stated here as a named
   condition for `so-planner`/`so-test-writer` to account for — not a guarantee that no interaction
   exists, and not something this revision resolves beyond what the existing, already-approved checks
   already leave unresolved. The HTML/string-path form of the check remains real,
   in-gate enforcement where it always was: every non-master, translated locale, produced by Task C
   from the already-rendered master HTML (`generate()`'s translation loop, line ~988, composing
   `validateHeadingStyle` in-gate, unaffected by and independent of this revision), and the master
   itself on the plain-HTML (non-Doc) pipeline branch, if ever reached (`generate()` line 785 /
   `generateUaContent()` line 1212) — neither of which this revision touches. `runOutputValidation()`'s
   post-hoc pass over the rendered master HTML continues to run exactly as it does today, as a
   display-only, non-gating second look — never the sole enforcement mechanism, as v9 mistakenly
   implied it effectively was.
5. **This resolves from OD-6 and direct code evidence, without opening a new Open Decision — the same
   disposition v9 already used for its own (correct) data-flow narrowing.** Which field carries brand-
   core presence to the shipped v4 CTA heading, and whether that field is already reachable by the
   gate's existing repair machinery, are facts about the codebase (confirmed above), not judgment
   calls for the Owner; OD-6 already settled that presence itself is mandatory "by design." SPEC_REVIEW
   v8 itself states the fix is "a Specification correctness defect, not a new Open Decision" and names
   retargeting to `doc.localizedName` as one of its own two viable options — this revision adopts it.

**This is v11 of the Specification**, rewritten after SPEC_REVIEW v9
(`docs/reviews/specifications/US-3.1-spec-review.md#9`) again returned `CHANGES_REQUIRED` — one
blocking finding against v10's own FR-7 text (the data-flow retarget to `doc.localizedName` itself was
independently re-confirmed correct by SPEC_REVIEW v9, and is unaffected by this revision), and one
non-blocking finding against the Background's own v10, point 4 paragraph, above. Independently
re-traced this round against the live `repair-strategy.ts`, `store-render-rules.ts`,
`render-description.ts`, `master-system-prompt.ts` and `unit-cyrillize.ts` source, not accepted from
either v10's or the review's own citations:

1. **v10 established that `doc.localizedName` is addressable by the existing generic path-walker, but
   said nothing about the shape the repaired value must take — and `REPAIR_STRATEGIES` is keyed by
   rule name only (`repair-strategy.ts:240`, `resolveLadder()`), so a single `fieldInstruction` serves
   every path `heading-brand-core-missing` fires on.** FR-7 (v10) requires this instruction to "mirror
   `heading-product-name-stuffing`'s existing entry" — heading-shaped wording ("Rewrite this heading so
   it satisfies the constraint below... Current heading: ..."). Applied unchanged to
   `doc.localizedName` — a field the renderer consumes as a raw substitution argument
   (`store-render-rules.ts:104`'s `.replace('[Product-short]', productShortName)`) and, independently,
   as a video-fallback title (`videoFallbackTitle(doc.localizedName, doc.locale)`,
   `render-description.ts:168`), never as a heading — a model told to "rewrite this heading" could
   return heading-framed text (e.g. "Buy the Makera Cyclone Dust Collector Now") that still contains
   the `productShort()` substring, satisfying the check's presence test on the next validation pass
   while shipping a corrupted CTA `<h2>` and video caption. Nothing else in-gate would catch it: FR-6's
   own Doc-path form still reads the dead `doc.cta.heading` for `schemaVersion: '4.0'` (Out of scope,
   unchanged), so the "carries more than presence requires" direction is not checked against
   `doc.localizedName` either.

2. **Two mechanisms were weighed, and the more invasive one — a distinct repair-strategy identity —
   was ruled out because the existing, single-entry mechanism already closes the gap.**
   `RepairStrategy.fieldInstruction` is typed `(current: string, issue: ValidationIssue) => string`
   (`repair-strategy.ts:31`) — `issue.path` is already available inside the one registered
   `heading-brand-core-missing` entry this FR requires, and `heading-product-name-stuffing`'s own
   existing entry already establishes the precedent that ONE registered strategy dispatches different
   behaviour by path shape rather than needing a second rule identity (`repair-strategy.ts:354-374`:
   "TWO rungs serving TWO artifact shapes with ONE shared ladder... Each tier's executor only acts
   when the path shape actually matches what it knows how to address"). Splitting
   `heading-brand-core-missing` into a heading-shaped and a name-shaped rule (option (b) in this
   Specification's own terms) would duplicate that precedent for no gain, and would also require a new
   Out-of-scope carve-out beyond the one already stated constraining which `REPAIR_STRATEGIES` entries
   this Story may add (below) — so v11 chooses (a): one registered strategy, its `fieldInstruction` and
   its validation-time shape test both parameterized by `issue.path`, not a second rule identity.

3. **The fix has two required parts, not one — a validation-shape requirement alone is not
   sufficient.** `heading-product-name-stuffing`'s own ladder note (`repair-strategy.ts:346-374`)
   states that `heading-brand-core-missing`'s ladder — `['field-scoped', 'block-scoped']` — already has
   a documented no-op on its second rung for a `"doc."`-prefixed path: the Doc-shaped block-scoped
   executor resolves paths against the unwrapped `ProductDescriptionDoc`, so a wrapper-relative
   `doc.localizedName` path (already resolved by the first, field-scoped rung) is a harmless no-op on
   the second. This means `doc.localizedName`'s only real repair instrument is the single field-scoped
   call — unlike the block-scoped-eligible HTML path `heading-product-name-stuffing` also serves. A
   validation-time shape requirement with no matching change to the instruction wording would make a
   heading-oriented `fieldInstruction` systematically produce shape-violating text on this leaf's one
   real rung, landing on `full-regen` near-certainly rather than probabilistically — exactly the
   disproportionate repair cost AC-6 exists elsewhere in this Story to eliminate, not the bounded,
   probabilistic cost FR-7's own "Accepted cost" paragraph already accepts for the `productShort()`
   over-capture case. **v11 therefore requires both:** (i) `heading-brand-core-missing`'s validation
   test, for the `doc.localizedName` leaf specifically, additionally rejects heading/sentence-framed
   text (not merely testing for the `productShort()` substring's presence, as it does for the two
   genuine heading leaves); and (ii) the same registered strategy's `fieldInstruction`, for that same
   leaf, asks for a bare corrected name — mirroring `slug-name-designator-lost`'s own existing wording
   ("Rewrite this localized product name so it satisfies the constraint below... Return ONLY the
   corrected name..."), not `heading-product-name-stuffing`'s heading-oriented wording. Both are
   dispatched from `issue.path` inside the one existing entry, per point 2. See FR-7 below for the
   concrete requirement text and its falsifiable boundary cases.

4. **This also corrects a non-blocking finding against the Background's own v10, point 4 paragraph
   above (left unedited there, as historical record, per this document's own convention — v9's own
   since-superseded claims were left the same way) — its stated mechanism cannot produce the false
   positive it describes, and the real mechanism carries a different, more consequential risk polarity
   than the one it names.** v10 attributed the `doc.localizedName`/Latin-pattern mismatch to
   `normalizeDocProse()`'s cyrillization pass running "before render." Independently re-traced this
   round: `runDocGate()`'s own `validate()` closure (`content-orchestrator.service.ts:546-599`, where
   `heading-brand-core-missing` runs) executes *before* `normalizeDocProse()` is ever called (line
   656-657) — validation always sees the pre-normalization `doc`, so `normalizeDocProse`'s
   cyrillization of `doc.localizedName` (`doc-prose-transforms.ts:102`) cannot itself cause a validator
   false positive; it can only make the *shipped*, post-render text differ from what was validated, a
   pre-existing, unrelated property of this ordering, already true for `doc.cta.heading` today and not
   new. **The real, pre-validation exposure is different: `master-system-prompt.ts` includes
   `UNIT_LOCALIZATION_RULES` in the shared system-block text every Task A call receives
   (`master-system-prompt.ts:81`, inside `[MEASUREMENT]`), and `unit-cyrillize.ts`'s own header
   confirms that block already tells the model to cyrillize every unit "in ALL visible text,
   including... repeated Product Names."** This means the Task-A model may itself write a
   Cyrillic-unit-bearing `doc.localizedName` directly (e.g. "Ortur H20 20 Вт"), before any validation
   runs, for uk-UA/ru-UA generations — not a post-render artifact of normalization. `productNamePattern()`
   (`heading-style.ts:37-40`, the same idiom `productShort()`-matching reuses) only builds
   digit/Latin-letter flexibility ("20W" vs. "20 W") with no Cyrillic-unit awareness, and
   `productShort()` (`product-name-core.ts:85-89`) keeps any digit-bearing token as part of the
   designator — so a correctly-localized, prompt-compliant `doc.localizedName` genuinely can fail the
   Latin-only pattern match, **in-gate, before any repair is attempted.** This is a false *positive* on
   an `error`-severity check (`heading-brand-core-missing`), not the false *negative* v10's comparison
   implied: `heading-product-name-stuffing` is a *positive* match at `warning` severity, so the same
   kind of Latin-pattern/Cyrillic-unit miss there is a false negative (under-flagging, cheap);
   `heading-brand-core-missing` is a *negative* match at `error` severity, so the identical miss is a
   false positive (over-flagging, `'unresolved'`-counting, repair-budget-spending until the ladder
   resolves it) — the opposite polarity from what v10 stated, not "the same risk profile... now simply
   reachable through one additional pathway." This is a pre-existing characteristic of
   `heading-brand-core-missing` since FR-7 first specified it, at `error` severity, for the two heading
   leaves (v4) — not something newly introduced by adding `doc.localizedName` as a third leaf. Applied
   at FR-7's own Accepted-cost paragraph below, which v10 left pointing at this now-corrected Background
   paragraph without restating the risk itself. This correction changes the stated mechanism and risk
   framing only — it does not reduce, remove, or add to FR-7's own registered, `['field-scoped',
   'block-scoped']`-then-`full-regen` ladder, which already covers this false positive at the same
   bounded, probabilistic cost the `productShort()` over-capture case already accepts.

**This is v12 of the Specification**, rewritten after SPEC_REVIEW v10
(`docs/reviews/specifications/US-3.1-spec-review.md#10`) again returned `CHANGES_REQUIRED` — one
blocking finding against v11's own shape requirement (the enforcement-path retarget to
`doc.localizedName` and v11's shape/repair-instruction mechanism itself were both independently
re-confirmed correct by SPEC_REVIEW v10, and are unaffected by this revision), and one non-blocking
finding against v11's own precedent citation for its dispatch-by-path design choice. Independently
re-traced this round against the live `product-name-core.ts`, `product-name-core.spec.ts`,
`heading-style.ts` and `content-orchestrator.service.ts` source, not accepted from either v11's or
the review's own citations:

1. **v11's shape requirement bans quotation marks and sentence-terminal punctuation with no stated
   exemption for a character that is intrinsic to the product's own real name, and this is not a
   theoretical gap.** Independently re-verified against this Story's own corpus:
   `product-name-core.spec.ts`'s `invariantCore` corpus entry, `['Filament Bambu Lab PETG 1.75 mm',
   'Bambu Lab PETG 1.75']` (`product-name-core.spec.ts:51`), pins an `invariantCore()` output that
   itself carries an internal period — "1.75" is kept because `looksLikeDesignator()` treats any
   digit-bearing token as designator-shaped (`product-name-core.ts:88`) and `CONFIG_TOKEN`
   (`product-name-core.ts:70`) never matches it, so nothing strips it. `productShort()` for the same
   input produces the identical string (there is no trailing token matching `CONFIG_TOKEN` to drop
   from this particular designator span, per `productShort()`'s own trailing-pop logic,
   `product-name-core.ts:151-156`) — so both derived forms this Story already relies on for the
   two heading leaves carry this same period. Because FR-7 requires the shape test to run against
   the model's *original* `doc.localizedName` output, not only a repair, and explicitly forecloses
   the `NON_REGENERABLE_RULES` exclusion for this leaf on the reasoning that "a full-document
   regeneration genuinely can produce a correctly name-shaped `doc.localizedName`," an unexempted
   character-class reading would fail this check, at `error` severity, in-gate, on every
   correctly-generated `doc.localizedName` for a product whose real name carries such a character —
   with no repair able to satisfy the shape rule without corrupting the customer-facing product
   name. **This is the identical corruption concern this Specification already reasoned through and
   rejected for FR-13(b)/OD-10** ("replacing any character inside the bare core... corrupts the
   actual product name in a customer-facing field, which is a correctness regression, not a
   stylistic tradeoff"), but v11 did not extend that reasoning to its own new shape rule.

2. **Two resolutions were weighed for closing this, and the more destructive one — narrowing the
   banned-character set itself — was ruled out in favor of a contextual exemption, reusing this
   Story's own existing name-handling helper rather than inventing a new one.** (i) Dropping the
   sentence-terminal-punctuation ban entirely (keeping only the quotation-mark ban, on the premise
   that quotes never legitimately appear inside a product name but periods/units clearly can) would
   also stop catching genuine punctuation-bearing CTA/heading framing this Specification's own
   illustrative examples do not rule out (e.g. a trailing "!" on a CTA-framed value) — it closes the
   false-positive gap by discarding real detector power the evidence does not require giving up, not
   by fixing the actual defect (testing a character in isolation from where it came from). (ii)
   Exempt a banned character from the shape test when that exact character already occurs in
   `invariantCore(opts.input.name)` — the untranslated source product name's own invariant span,
   already computed at every call site in this codebase that also computes `productShort()`
   (`heading-style.ts:108,111` and `:342-343`: `full = productName.trim(); const short =
   productShort(full);`), and already defined by this Story's own `product-name-core.ts` doc comment
   as the span that "must SURVIVE untouched... across every locale." **v12 chooses (ii)**: it
   preserves the shape test's full detector power for genuine framing (a CTA "!" not present anywhere
   in the source name's invariant span still fails) while correctly exempting a character the source
   name's own designator span already carries, which is precisely the FR-13(b)/OD-10 boundary this
   Specification already draws elsewhere — a check may never treat "the name's own real content" as
   a violation to be fixed by corrupting it, whether that check is a bare-core-verbatim rule (FR-13(b))
   or a bare-name shape rule (FR-7).

3. **The source of the reference span matters, and comparing against `doc.localizedName` itself
   (rather than against `opts.input.name`) was considered and rejected.** Re-deriving the span from
   the very value under test would let a model manufacture its own exemption — any character it
   writes into `doc.localizedName` would trivially "already be present" in a span derived from that
   same string. `opts.input.name` is the one input already available, unconditionally, inside the
   same `validate()` closure `heading-brand-core-missing` runs in
   (`content-orchestrator.service.ts:546-599`; `opts.input.name` is already passed to two sibling
   calls in that exact closure, `validateSpecCountParityDoc(doc, opts.input.specs, opts.input.name,
   opts.label)` at line 560 and `validateHeadingStyleDoc(doc, opts.localeIso,
   opts.input.website.name, opts.input.name)` at line 563) — it needs no new data path, is
   independent of the value being validated, and is the same raw name `productShort()`/
   `invariantCore()` are already computed from throughout this Story (FR-7's own Accepted-cost
   paragraph, FR-6, FR-12). See FR-7 below for the concrete requirement text and its falsifiable
   boundary cases, including the corrected period example above.

4. **This also makes a small, low-risk wording correction to a finding SPEC_REVIEW v10 itself
   recorded as non-blocking and precedent-precision-only, per this stage's own brief not to
   re-litigate it as a defect.** `heading-product-name-stuffing`'s existing entry
   (`repair-strategy.ts:354-374`) demonstrates that one registered strategy can serve two path
   shapes by varying which **tier's executor** engages (the field-scoped rung's `getAtPath`/
   `setAtPath` resolve one path shape and no-op on the other, and vice versa for the block-scoped
   rung) — not by varying a single `fieldInstruction`'s **returned text** by `issue.path`, which is
   the specific, narrower pattern FR-7's repair-instruction requirement actually needs and is
   asking for as a new but mechanically supported use of the same signature
   (`RepairStrategy.fieldInstruction`'s existing `(current, issue) => string` type,
   `repair-strategy.ts:31`, genuinely receives `issue` and so genuinely supports it). v11's FR-7 text
   overstated this as the *same* precedent; v12 corrects the wording to say the sibling entry
   establishes that one rule identity can serve two structurally different path shapes, and that
   FR-7's `fieldInstruction`-text-level dispatch is a new but signature-supported extension of that
   established pattern, not an identical repetition of it. The adjacent claim that
   `heading-brand-core-missing`'s ladder "already documents" a block-scoped no-op is corrected the
   same way: that entry does not exist before this Story, so it has no ladder note of its own to
   document anything — the no-op behaviour is real (independently re-confirmed via
   `doc-tier.ts`/`getDocBlock`'s own doc comment) but is inherited from `heading-product-name-
   stuffing`'s identical ladder shape, not self-documented. Neither correction changes what
   `so-planner` must build (the two-clause repair-instruction requirement reads the same either way);
   this is a citation-precision fix only, the same disposition this Specification already gave its
   own Cyrillic-mechanism correction (v11, point 4, resolving SPEC_REVIEW v9's non-blocking finding).

**This is v13 of the Specification**, rewritten after SPEC_REVIEW v11
(`docs/reviews/specifications/US-3.1-spec-review.md#11`) again returned `CHANGES_REQUIRED` — one
blocking finding against v12's own exemption *wording* (v12's decision to exempt an intrinsic-name
character at all, the choice of `invariantCore(opts.input.name)` as the reference span, and every
other part of FR-7 were all independently re-confirmed correct by SPEC_REVIEW v11 and are unaffected
by this revision), and two non-blocking findings, both about precision at the exemption's edges.
Independently re-traced this round against the live `product-name-core.ts` source (`invariantCore()`,
`looksLikeDesignator()`, `CONFIG_TOKEN`, `productShort()`), not accepted from either v12's or the
review's own citations:

1. **v12's normative sentence and its own second worked example disagree under the reading a reader
   would naturally give the sentence, and the two readings that reconcile them are materially
   different rules.** Quoted verbatim, v12 said an instance of a banned character "does not violate
   this shape requirement when that exact character already occurs in `invariantCore(opts.input.name)`
   ... A character absent from that span is still framing and still fails." Read as a plain
   class-membership test — is a character of this *type* present anywhere in the span — a period
   inside `invariantCore('Filament Bambu Lab PETG 1.75 mm')` = `'Bambu Lab PETG 1.75'` is present, so
   a trailing, appended period should also be exempt under that reading. v12's own second worked
   example states the opposite: `"Bambu Lab PETG 1.75."` fails. The sentence never actually stated a
   class-membership test — "present" only makes sense read as an occurrence-individuating test — but it
   never said which kind, and SPEC_REVIEW v11 showed two materially different readings both happen to
   reproduce v12's two examples correctly: **occurrence-count** (the character's *count* in the
   candidate value must not exceed its count in `invariantCore(opts.input.name)`) and
   **positional/substring-containment** (only a banned character that falls inside a literal, contiguous
   occurrence of `invariantCore(opts.input.name)` within the candidate is exempt). These diverge on a
   case this Story's own evidence already establishes as real, not hypothetical — a uk-UA/ru-UA master
   where the Task-A model writes a Cyrillic-localized unit next to a decimal-bearing designator, per
   `UNIT_LOCALIZATION_RULES` (Background, v11, point 4; FR-7's own Accepted-cost paragraph). **v13
   chooses occurrence-count matching** and states it as the sole, precise rule — see FR-7 below for the
   concrete text and the new worked example this choice is checked against.

2. **Occurrence-count was chosen over positional/substring-containment for three independent reasons,
   checked directly against this Story's own evidence, not assumed as the more familiar option.**
   First, mechanical implementability: occurrence-count reduces to a `Map<character, count>` diff
   between two strings — no notion of "position" or "contiguity" across a value that repair may have
   reordered needs to be defined at all, whereas positional-containment requires defining what counts
   as "the same span" once a repair (or a legitimate model rewrite) has moved tokens around, which
   `so-planner` would otherwise have to invent unguided. Second, and decisively, it is the reading that
   does not produce a false positive on the evidenced Cyrillic-unit case: take a product whose
   `invariantCore(opts.input.name)` is `"xTool D1 Pro 5.5W"` (independently traced — `"xTool"`, `"D1"`,
   `"Pro"` and `"5.5W"` each satisfy `looksLikeDesignator()`, none is a `DESCRIPTOR_STOPWORDS` entry or
   a `CONFIG_TOKEN`-matching trailing token, so `invariantCore()` and `productShort()` both return the
   whole string). A correctly-localized `doc.localizedName` of `"xTool D1 Pro 5.5 Вт"` (the unit
   cyrillized and re-spaced per `UNIT_LOCALIZATION_RULES`, exactly the mechanism Background v11 point 4
   documents) contains one period, the same count `invariantCore(opts.input.name)` contains — **exempt
   under occurrence-count, correctly passing a legitimately, correctly localized value.** Under
   positional/substring-containment, this value contains **no** literal, contiguous occurrence of
   `"xTool D1 Pro 5.5W"` at all (the unit token's shape changed and gained a space), so the reference
   span cannot be pointed to and the period would be judged as unexempted framing — an in-gate `error`
   on a value no repair can fix without corrupting the decimal point, the identical class of defect
   FR-13(b)/OD-10 already reasons this Specification must never accept. Occurrence-count avoids this
   false positive; positional-containment creates it. Third, occurrence-count is the reading that keeps
   the check's power exactly where SPEC_REVIEW v10 and v12 already agreed it belongs: appended or
   relocated framing that increases a banned character's count beyond what the source name itself
   contains still fails (v12's own worked example, reproduced identically under occurrence-count — see
   FR-7), so nothing is given up relative to v12's stated intent.

3. **This has one acknowledged, bounded residual, stated honestly rather than left implicit — the same
   discipline this Specification already applies to OD-8 and OD-10.** Occurrence-count is a per-character
   tally, not a same-token-adjacency test: a pathological candidate that *drops* a banned character the
   source name legitimately carries at one position and *adds* a same-class character elsewhere, keeping
   the total count unchanged, would still pass. This requires `invariantCore(opts.input.name)` to
   already carry at least one instance of that character class, and requires the repair or model output
   to relocate rather than merely append one — a materially narrower and more contrived shape than the
   realistic appended-framing case the exemption exists to catch, and not evidenced anywhere in this
   Story's QA corpus. Closing it would require a positional/adjacency test, which reintroduces the false
   positive on the evidenced Cyrillic-unit case (point 2, above) that occurrence-count exists to avoid —
   so this residual is accepted, not closed, the same disposition already given to OD-8's margin-thinning
   cost and OD-10's ceiling-collision cost.

4. **Two further precision gaps, both raised as non-blocking by SPEC_REVIEW v11, are closed the same
   round rather than deferred again.** First, the banned-character classes were named ("sentence-terminal
   punctuation," "a quotation mark") without stating their edges: whether an ellipsis (`…`, one Unicode
   code point) counts differently from three ASCII periods (`...`) for tallying purposes, and whether a
   bare comma — in neither named class — is banned at all. v13 enumerates both classes by literal code
   point and states the comma question explicitly rather than leaving it inferred from omission — see
   FR-7 below. Second, SPEC_REVIEW v11 noted, and this revision independently re-confirms by re-reading
   `product-name-core.ts` directly rather than accepting the review's assertion at face value, that
   `invariantCore()`'s output cannot carry a line break **on the path that produces the designator span**
   (`core.join(' ')`, `product-name-core.ts:142`, joins scanned tokens with a single ASCII space,
   discarding any original whitespace including a line break) — but this is not quite unconditionally
   true: the function's other return path, reached when no token in the name looks designator-shaped at
   all (`core.length === 0`), returns `name.trim()` verbatim (`product-name-core.ts:142`), which preserves
   any whitespace — a line break included — embedded *inside* the original `opts.input.name` on that one
   narrow branch. v13 states the acknowledgement precisely, including this one exception, rather than
   repeating SPEC_REVIEW v11's flatter claim unverified — see FR-7 below.

**This is v14 of the Specification**, rewritten after SPEC_REVIEW v12
(`docs/reviews/specifications/US-3.1-spec-review.md#12`) again returned `CHANGES_REQUIRED` — one
blocking finding tracing v13's occurrence-count exemption (independently re-confirmed correct, by
SPEC_REVIEW v12 itself, on every worked example v13 picked) against a shape neither v12 nor v13 picked,
and two carried non-blocking wording/citation findings. Independently re-traced this round against the
live `product-name-core.ts` source (`DESCRIPTOR_STOPWORDS`, `looksLikeDesignator()`, the designator
regex, `productShort()`) and `src/prompt-core/constants.ts` (`STORE_MASTER_SCRIPT`, `MASTER_LOCALE`,
`NUMBER_FORMAT_RULES`, `PRODUCT_NAME_LOCALIZATION`), not accepted from either v13's or the review's own
citations:

1. **The traced gap is real: a category/packaging stopword sitting between the initial designator and a
   trailing decimal makes `invariantCore(opts.input.name)` stop scanning before the decimal, so the
   reference span the exemption counts against carries zero instances of a character the full, unframed
   name legitimately carries one of.** Three shapes trace this way, independently re-verified directly
   against `DESCRIPTOR_STOPWORDS` and `looksLikeDesignator()` this round: `invariantCore("Bambu Lab
   Hardened Steel Nozzle 0.4 mm")` — `"Hardened"`/`"Steel"` pass `looksLikeDesignator()` (mixed-case
   Latin, no digit), but `"nozzle"` is a `DESCRIPTOR_STOPWORDS` entry (`product-name-core.ts:51`), so the
   scan (`product-name-core.ts:131-137`) breaks there, before `"0.4"` is ever reached, producing `"Bambu
   Lab Hardened Steel"` — zero periods; `invariantCore("Bambu Lab PLA Basic 1.75mm")` stops at `"basic"`
   (`product-name-core.ts:54`), same outcome; `invariantCore("eSUN PLA+ 1.75mm")` stops one token earlier
   still, because `"PLA+"` fails the designator regex outright (`product-name-core.ts:89`, the `+` is not
   in `[\w'’-]`). In each case the full, unframed name contains one period (the trailing decimal), so
   FR-7's own "a `doc.localizedName` that legitimately carries the fuller invariant/full name, with no
   framing added... still satisfies this shape requirement and still passes" sentence was contradicted
   by the mechanism meant to implement it — exactly as SPEC_REVIEW v12 traced.

2. **The task's own first suggested fix — widen the reference span to `productShort(opts.input.name)`
   — was checked directly against the live source and ruled out, not assumed to work.**
   `productShort()`'s own definition (`product-name-core.ts:151-156`) computes `invariantCore(name)`
   first and then, at most, pops one *additional* trailing `CONFIG_TOKEN`-matching token from it — it
   can only return the same string `invariantCore()` does, or a strict prefix-truncation of it, never
   anything longer. Since `invariantCore(opts.input.name)` already stops scanning before the trailing
   decimal for all three traced shapes, `productShort(opts.input.name)` stops in exactly the same place
   or earlier — it cannot recover a character `invariantCore()` never reached. This option is closed, not
   overlooked.

3. **A different, genuinely simple widening does close it: replace the reference span with
   `opts.input.name` itself — the raw, untranslated source name, with no `invariantCore()`/
   `productShort()` extraction applied at all.** This needs no new helper, no second reference span, and
   no locale-conditional exemption — it is the same single occurrence-count mechanism v13 already
   specifies, pointed at the whole raw string instead of a derived subset of it. It is provably safe,
   not merely plausible:
   - **It can only widen the exemption, never narrow it.** `invariantCore()` returns either (a)
     `name.trim()` verbatim, on its no-designator-token fallback path (`product-name-core.ts:142`) — in
     which case its character counts are identical to the raw name's, or (b) `core.join(' ')`, where
     `core` is built by keeping tokens unmodified from `opts.input.name`'s own token list (after
     optionally skipping a leading stopword run) up to the point the scan breaks (`product-name-
     core.ts:122-137`) — every character any kept token contributes is therefore already present, at
     least as often, in the raw name itself; dropped tokens (the skipped leading run, and everything
     after the scan breaks) can only remove character instances relative to the raw name, never add any
     `invariantCore()` did not already have. So for every banned character `c` and every name,
     `invariantCore(opts.input.name)`'s count of `c` is always ≤ `opts.input.name`'s own count of `c`.
     Replacing the smaller quantity with the larger one in a "candidate count must not exceed reference
     count" test can only make previously-failing candidates newly pass; it cannot make a
     previously-passing candidate newly fail. **Every worked example SPEC_REVIEW v11/v12 and v13 itself
     already verified is unaffected** — re-checked directly: `"Filament Bambu Lab PETG 1.75 mm"` and
     `"xTool D1 Pro 5.5W"` each contain their one period only inside the span `invariantCore()` already
     keeps, so the raw name's own period count equals `invariantCore()`'s in both cases; no regression.
   - **It closes the traced gap directly.** `opts.input.name` = `"Bambu Lab Hardened Steel Nozzle 0.4
     mm"` contains exactly one period (in `"0.4"`) — counted against the whole raw string, with no scan
     to break early. A candidate carrying that same content, unframed, now has a reference count of 1 to
     compare against, exactly matching its own count — it passes. The same holds for the other two traced
     shapes (both raw names contain exactly one period, in their own trailing decimal). See the new
     worked example at FR-7 below.
   - **It does not reopen the anti-gaming property v12 established.** The reference remains anchored to
     `opts.input.name` — the model's *input*, not `doc.localizedName` — the value under test. A model
     still cannot manufacture its own exemption by writing an arbitrary character into the candidate; it
     can at most benefit from a character the raw source name already, independently, contains.
   - **It makes v13's own already-present, loosely-worded sentence literally true.** v12/v13's exemption
     paragraph already states, in passing, "The reference span is `opts.input.name`" (intended there to
     contrast *source* against *candidate*, while the operative computation was actually
     `invariantCore(opts.input.name)`) — v14 makes that sentence accurate rather than approximate.

4. **Checked and not reopened: whether this widening lets through the uk-UA/ru-UA quantity abbreviation
   (`"шт."`, which `PRODUCT_NAME_LOCALIZATION` requires with a trailing period, `constants.ts:824-830`)
   as a new, undetected framing vector.** It does not, on the evidence available: `doc.localizedName`
   fills the CTA-heading position specifically (`store-render-rules.ts:58,90-106`, whose own parameter is
   named `productShortName`), and `PRODUCT_NAME_LOCALIZATION`'s own text carves headings out of its
   quantity/count-bearing treatment entirely — "HEADINGS ARE THE EXCEPTION... only two `<h2>` in the
   document carry it — in the SHORT brand+model form" (`constants.ts:801-804`) — reserving the
   quantity-count abbreviation for body prose and the CTA *paragraph*, not the CTA *heading*. A
   `doc.localizedName` legitimately carrying a trailing `"шт."` at this leaf would already be an
   FR-6-shaped "carries more than the short form" defect, not a case this widening needs to accommodate —
   the same already-documented, non-blocking parallel gap (Out of scope), not a new one this revision
   opens.

5. **The line break is removed from the occurrence-count exemption's scope entirely, rather than left to
   depend on which reference string is in play.** v13's informational note reasoned specifically about
   `invariantCore()`'s own `core.join(' ')` behaviour to argue the line-break ban is "vacuous in practice"
   under the old reference span; switching the reference to the raw, unprocessed `opts.input.name` would
   reopen the question the old note answered (a raw name can carry a line break the old
   `invariantCore()`-based span could not). Rather than re-deriving that reasoning against a new
   reference string, v14 states directly what was already true in substance: no legitimate product name,
   raw or localized, ever needs an embedded line break, so a line break is banned unconditionally — not
   subject to the occurrence-count exemption at all, for any reference span. This also reconciles
   SPEC_REVIEW v12's carried non-blocking finding: the normative rule ("from either class above") and the
   informational note ("applies to it identically to every other banned character") disagreed about
   whether the exemption covers a line break at all. v14 removes the disagreement by removing the line
   break from the exemption's scope on both sides of that sentence, instead of trying to make both sides
   agree it is covered.

6. **The comma/apostrophe exclusion's grounding is restated more precisely, per SPEC_REVIEW v12's other
   carried non-blocking finding.** The exclusion's outcome does not depend on `product-name-core.ts`'s
   designator regex at all — both banned classes are closed, literal enumerations that simply do not name
   the comma or any apostrophe/single-quote-shaped character, which is sufficient grounding on its own.
   The regex (`/^[A-Za-zÀ-ÿ][\w'’-]*$/`, `product-name-core.ts:89`) is restated as supporting illustration
   only, and only for the case it actually reaches: a non-digit token — `product-name-core.ts:88`'s
   `if (/\d/.test(token)) return true` returns early for any digit-bearing token regardless of what other
   punctuation it carries, so the regex says nothing about those — and even for the non-digit case, its
   character class does not literally include `‘` (U+2018), one of the three code points this exclusion
   names. See FR-7 below for the corrected text.

7. **None of the six points above required accepting a residual instead of closing the gap — the option
   OD-8/OD-10's precedent offered was checked and not needed this round.** The reference-span widening
   closes SPEC_REVIEW v12's traced shapes outright, provably without regressing any prior worked example;
   it does not merely bound their likelihood the way OD-8/OD-10 bound a cost this Story cannot fully
   remove. This is stated plainly rather than claimed as a permanent close of every future edge case this
   exemption could face — a future shape this Specification has not traced may yet surface a further,
   narrower gap, the same way this exact clause has been revised five times before this round; nothing
   here forecloses a seventh trace if one is found.

**This is v15 of the Specification**, rewritten after SPEC_REVIEW v13
(`docs/reviews/specifications/US-3.1-spec-review.md#13`) again returned `CHANGES_REQUIRED` — one
blocking finding stress-testing v14's own reference-span widening itself (the widening's correctness on
the three shapes it targets, independently re-confirmed by SPEC_REVIEW v13 itself, is unaffected by this
revision), and the two carried non-blocking staleness findings named below. The Owner
(sbruhov@gmail.com) additionally gave a direct recommendation for how to close the blocking finding — a
trailing-position check — which this revision independently verified against the live
`product-name-core.ts` source before adopting, rather than applying on say-so, per this stage's own
standing discipline:

1. **The traced gap is real, and is not a new failure mode — it is the enlargement of an already-named
   one.** FR-7's own accepted-residual paragraph already names a "drop-and-add" case (Background, v13,
   point 3): a candidate that drops a banned character the source legitimately carries at one position
   and adds a same-class character elsewhere, holding the total count unchanged, still passes. v13
   characterized this as "materially narrower and more contrived... not evidenced anywhere in this
   Story's QA corpus," true under the old, `invariantCore(opts.input.name)`-based reference span, where
   the "drop" half required the *kept* designator span itself to already carry a banned character. v14's
   widening to the whole raw name makes the "drop" half trivially satisfied by *any* banned character
   anywhere in the raw name's packaging/category tail — precisely the region the three shapes v14 exists
   to support place a legitimate trailing decimal in. Independently re-traced against the same worked
   example SPEC_REVIEW v13 itself uses: for `opts.input.name = "Bambu Lab Hardened Steel Nozzle 0.4 mm"`
   (one period, in `"0.4"`), the candidate `"Bambu Lab Hardened Steel."` — the bare short form with one
   added, unjustified trailing period — has a period count of 1, which does not exceed the reference
   count of 1, so occurrence-count alone wrongly exempts it. v13's own "narrower and more contrived"
   characterization no longer accurately describes how exposed this residual is for the shapes v14 was
   just widened to help — SPEC_REVIEW v13 is correct that FR-7's text left this unrevisited.

2. **The Owner's recommended resolution — a trailing-position check, additional to occurrence-count, not
   in its place — was checked directly against `product-name-core.ts` and against every worked example
   this clause already carries, not adopted on the strength of the recommendation alone.** The proposed
   rule: a banned character that is the candidate's own trailing (last, non-whitespace) character is
   exempt only if `opts.input.name.trim()`'s own trailing character is also that same character, compared
   literally. Four things were verified, matching the Owner's own four checkpoints:
   - **It closes the traced counter-example cleanly.** `opts.input.name.trim()` = `"Bambu Lab Hardened
     Steel Nozzle 0.4 mm"` ends in `"m"` (from `"mm"`), not `"."`. The candidate `"Bambu Lab Hardened
     Steel."` ends in `"."` — a banned character whose trailing-position match fails, so the candidate is
     rejected regardless of its occurrence count. The same holds for v14's other two traced shapes
     (`"Bambu Lab PLA Basic 1.75mm"`, `"eSUN PLA+ 1.75mm"` — both raw names end in a unit letter, never a
     period), so this closes the vector generally, not only for the one worked example.
   - **It still correctly passes the legitimate shapes v12/v14 fixed.** The full, unframed name itself
     (`"Bambu Lab Hardened Steel Nozzle 0.4 mm"`, as a `doc.localizedName` candidate) ends in `"m"` —
     matching the raw name's own ending — and its one period sits at an interior position (inside
     `"0.4"`), not the candidate's trailing character, so the trailing-position check is simply not
     triggered for it; occurrence-count alone governs it, exactly as v14 already established. The xTool
     D1 Pro Cyrillic-unit case (`"xTool D1 Pro 5.5 Вт"`) is unaffected for the same reason: its trailing
     character is a Cyrillic letter, not a banned one, and its period sits at an interior position (inside
     `"5.5"`) — the check is not triggered there either.
   - **The check is a plain string-level comparison, not new tokenization machinery.** It reduces to
     comparing `candidate.trim()`'s own last character against `opts.input.name.trim()`'s own last
     character, only when that last character is a banned one — no notion of "token" or "span" beyond the
     one string boundary a trailing character can occupy, kept exactly as simple as the occurrence-count
     check already is.
   - **It does not close every over-exemption gap — only the trailing one — and this revision states that
     narrower remaining gap explicitly rather than claiming full closure.** A banned character inserted at
     an *interior* position — not the candidate's own trailing character — while the total count is held
     unchanged by a corresponding drop elsewhere, still passes: e.g. `"Bambu Lab. Hardened Steel"` (the
     same added period relocated to an interior position) still passes on occurrence-count alone, because
     the trailing-position check only ever examines the one character at the candidate's own string end.
     This is a real, narrower residual — not silently dropped, and not claimed as closed by this revision.

3. **This is adopted, not deferred to the fallback.** The trailing-position check verifies cleanly against
   every check the Owner's own recommendation asked for, closes the reviewer's exact concrete
   counter-example and its two sibling shapes, and regresses no prior worked example — so the Owner's
   second, fallback option (explicitly accepting the full, enlarged v14 residual and correcting
   Background's "narrow and contrived" characterization instead) is not needed and is not chosen. FR-7
   below states the trailing-position check as an additional, necessary condition alongside — never in
   place of — the existing occurrence-count rule, and narrows (not removes) the accepted-residual
   paragraph's own text to the interior-position case that remains.

4. **Two further, non-blocking staleness findings, closed the same round rather than deferred again.**
   First, the top-level `## Summary` section's own "This is v8 of the Specification... returns to
   `PASS`" sentence narrated a seven-revisions-old milestone as if it were current framing; v15 replaces
   it with a version-neutral statement of what is authorized now (see Summary, above). Second, the Open
   questions section header's version marker had not been bumped past "as of v13"; v15 corrects it to
   this revision's own version, below.

**This is v16 of the Specification**, rewritten after `so-planner`'s implementation-plan v6
(`docs/plans/US-3.1-implementation-plan.md#6`) returned `CHANGES_REQUIRED` with `loop_back_stage:
changes_required` (to SPECIFICATION) — not a SPEC_REVIEW finding against v15's own text (SPEC_REVIEW v14
already returned `PASS` on v15, unaffected and unrevisited by this round), but two design questions
so-planner's own D5(f) found FR-7's v9-v15 text leaves genuinely unresolved, folded into one loop-back per
so-planner's own framing ("what this Plan will not do is pick between them unilaterally"). Both are
independently re-verified this round against the live source and fixtures the Plan and Impact Analysis
v3 cite, not accepted from either's own description at face value:

1. **FR-7's own "Illustrative boundary cases" name two punctuation-free CTA/sentence-framing examples
   that no mechanism this Specification has ever specified can mechanically reject.** Re-read FR-7's own
   text in full this round: `"Buy the Makera Cyclone Dust Collector Now"` and `"Technical specifications
   for the Makera Cyclone Dust Collector"` are stated to "fail," but the only mechanism v13-v15 actually
   specify for the `doc.localizedName` shape requirement is the banned-character/occurrence-count/
   trailing-position mechanism — and neither example contains a banned character at all (no period,
   question mark, exclamation mark, ellipsis, or quotation mark), so that mechanism has nothing to test
   and does not reject either one. This is not a new defect this round introduces: it has been latent in
   FR-7's own text since v11 first stated the shape requirement in prose ("no leading or trailing sentence
   framing, no call-to-action wording") without ever specifying a mechanical detector for the framing/
   CTA-wording component specifically — every one of v11-v15's seven consecutive revisions refined only
   the punctuation mechanism. so-planner's own Plan v6 traced this by reading FR-7's Background across all
   seven revisions and finding "no further mechanical rule stated or delegated for detecting sentence/
   CTA-framing wording that carries no banned punctuation" — independently re-confirmed correct this
   round by the same re-read.

   **Two candidate closures were checked directly against FR-7's own worked examples and against a real,
   evidenced uk-UA shape this Story's own test anchors already establish as legitimate — not against the
   example list alone, and not accepted from so-planner's own description without independent
   verification:**
   - **A core-position rule** (locate `productShort(opts.input.name)`, or the locale-aware pattern, as a
     literal substring inside the trimmed candidate; fail if non-whitespace text precedes it; pass text
     that follows it or a candidate with no locatable core at all). Checked directly against every one of
     FR-7's own listed examples: it classifies all of them correctly — both CTA/heading-framing examples
     fail (leading text precedes the located core), `"Makera Cyclone Dust Collector Standard Package"`
     passes (only a trailing suffix), `"Colector de Polvo Makera Cyclone"` passes vacuously (no literal
     substring match — a full translation, not a reordering). **Rejected anyway, once checked against
     Anchor 4** (implementation-plan v6's own D11(a)/Anchor 4 worked example,
     `doc.localizedName = "Сопло Bambu Lab 0,4 мм"` — "Сопло," Ukrainian for "Nozzle," placed before an
     untranslated, literally-locatable brand/model span): independently re-verified against the live
     `src/prompt-core/product-name-core.ts` this round, "сопло" is a listed `DESCRIPTOR_STOPWORDS` entry
     (line 57), so `invariantCore()`'s own leading-category-word skip (lines 122-128, "A raw name can OPEN
     with a category/packaging word... Skip that leading run before scanning for the designator") already
     treats this exact shape as the start of a legitimate localizable prefix, not framing — and the
     brand/model span that follows it ("Bambu Lab 0,4" or similar) is genuinely locatable as a substring,
     unlike the fully-translated Spanish example. A core-position rule would reject this real,
     locale-native rendering as leading framing, corrupting it via a field-scoped rewrite on every such
     generation — reintroducing, via a different mechanism (position rather than the Cyrillic-unit/Latin-
     pattern mismatch), the identical class of false positive that already cost this Story one parked task
     (`docs/catalog/US-3.1-pipeline-status.md` §3, T7 — a real, evidenced regression, not a hypothetical
     one, on the same category-first family of shape this Story's own `product-name-core.ts` doc comment
     and 2026-08-21 fix already exist to accommodate). The rule's apparent completeness against the
     example list is real but incomplete: every listed passing example with extra words either has no
     locatable core (a full translation) or places the extra words strictly after the core; none tests the
     one shape that breaks it — a locatable core preceded by a legitimate, locale-native word.
   - **A word-count-margin rule** (flag any candidate whose word count exceeds `opts.input.name`'s own by
     more than a small, fixed margin). Rejected for the opposite reason, checked directly rather than
     assumed: a margin wide enough to keep `"Makera Cyclone Dust Collector Standard Package"`'s own
     two-word trailing suffix passing is also wide enough to let a short framing of the identical word
     count — "Shop [name]", "[name] Now" — through undetected, so no single margin both keeps FR-7's own
     passing examples passing and rejects its own failing ones.
   - **A locale-specific keyword/verb denylist** (e.g. English "Buy"/"Shop"/"Now") was also considered and
     rejected, on this Story's own precedent: FR-8/FR-9's own design (`src/utils/seo-metadata-shape.ts`)
     already rejected an equally-motivated semantic/keyword approach for the identical reason — free-form,
     locale-dependent text with no fixed vocabulary would need a per-locale list, hand-authored and
     unverifiable for completeness, contradicting NFR-4's `STORE_REGISTRY`-only-source-of-locale-data
     discipline.

   **v16 does not ship any of the three.** Adopting the core-position rule would trade one false-positive
   class (the two illustrative CTA/heading examples slipping through, evidenced only by this
   Specification's own illustrative text, not by the QA report's seven findings) for another,
   independently evidenced one (a correct, locale-native category-first rendering being rejected and
   field-scope-repaired into something wrong, evidenced both by Anchor 4 and by this Story's own T7
   parking history) — a worse trade, not a better one, on the evidence actually in hand. **v16 instead
   accepts the framing/CTA-wording component of the `doc.localizedName` shape requirement as a disclosed,
   unclosed residual** — the same disposition this Specification already gives `productShort()`'s
   over-capture bias (FR-7's Accepted-cost paragraph) and the interior-position banned-character residual
   (v15) — and corrects FR-7's own "Illustrative boundary cases" paragraph and Failure path to state this
   honestly rather than claim a mechanical outcome the registered check does not produce. See FR-7 below
   for the corrected text.

2. **`heading-brand-core-missing`'s mandatory-presence check, as specified through v15, fires against
   real, human-accepted content that never named the product at the first-§3-heading position in the
   first place.** Impact Analysis v3 re-confirmed, by direct read of
   `test/fixtures/corpus/expert3d-ortur-h20-20w.doc.json` (a real golden-corpus fixture
   `render-reconciliation.spec.ts` and this Story's own T7 build both already depend on), that
   `functionality[0].heading` = `"Принцип роботи та модульна конструкція"` ("Principle of operation and
   modular construction") is genuinely product-name-free — independently re-verified this round by
   reading the fixture directly. This is not a matcher defect FR-6/FR-7's Cyrillic-unit fix (v9-v11) can
   close: no variant of "Ortur H20 20 Вт" or its short form appears anywhere in this heading, in any
   script. It is a true positive under FR-7's own mandatory-presence text as written through v15, on real,
   already-accepted content — first surfaced by `so-builder`'s own T7 build attempt
   (`docs/catalog/US-3.1-pipeline-status.md` §3, "Corpus check"), escalated through so-planner's v5/v6
   Residual C, and re-confirmed independently three times now (T7's build, Impact Analysis v3, this
   revision).

   **Independently re-checked this round against the QA report and a second corpus fixture, rather than
   accepted on say-so, to decide whether to accept this as a named cost or narrow the check's scope:**
   `Knowledge/Issues/First_Batch/QA_report_makera_cyclone_2026-09-21.md`'s own P1 finding ("инвариант
   бренд-ядра проверяется не везде," the sole evidence OD-6's mandatory-presence resolution cites) tables
   four locales' §9 CTA headings and their brand-core defects — es-ES, pt-PT and en-ES all drop the core
   from `cta.heading` — and names no defect anywhere against a first-§3-heading position. **Its own "Что
   сделать" ("What to do") recommendation, quoted directly rather than paraphrased (line 84), reads:**
   "Расширить область действия валидатора инвариантного ядра со `slug`/`name` на все поля заголовков:
   `cta.heading`, h2/h3 в §3 и §9" — "Extend the invariant-core validator's scope from `slug`/`name` to
   all heading fields: `cta.heading`, h2/h3 in §3 and §9." Read on its own, this line asks for broader
   coverage than either v16 or this revision ships — it names §3 by number, not `cta.heading` alone — and
   is, on the evidence available, the likely source of AC-3's own parenthetical wording ("the other §3/§9
   headings exempted by AC-2"). This Specification does not treat the recommendation sentence as settling
   the question on its own, though: a "what to do" recommendation is what the report's author proposes
   doing about the defects the same report evidences, not itself an additional evidenced defect — the
   report's own observed-defect table, immediately above the recommendation, names no first-§3-heading
   regression, on this or any other generation this Story's evidence reaches. Cross-checked against a
   second real corpus fixture, `test/fixtures/corpus/center-3d-print-ortur-h20-20w.doc.json` (same
   product, a different store): its own `functionality[0].heading` is `"Як складається та живиться Ortur
   H20 20 W"`, which *does* carry the product's short form. Both fixtures are real, human-accepted content
   for the same underlying product — one names the product at this position, the other does not —
   confirming that whether the first §3 heading names the product is a legitimate stylistic choice this
   Story's own accepted corpus already makes both ways, not an invariant AC-3's evidenced regression (the
   CTA-heading drop) requires enforcing at this second position too. The tension between the
   recommendation's literal breadth and the evidence's narrower reach is disclosed at
   `HUMAN_SPEC_APPROVAL` below, not silently resolved in either direction by omitting the sentence.

   **Three dispositions were available for the first-§3-heading leaf, not two — SPEC_REVIEW v15 found v16
   disposed of only the first two and left the third, conditional-correctness, unchecked; all three are
   now disposed of with the same discipline, and the chosen disposition is unchanged.** (a) Name and
   accept this as a cost, parallel to the Cyrillic-unit false positive FR-7's Accepted-cost paragraph
   already accepts — rejected: unlike the Cyrillic-unit case (bounded to two locales, a
   translation-surface-form mismatch on content that DOES legitimately carry the core), this cost would
   fire on every generation whose first-§3-heading style omits the product name by design — an evidenced,
   common, accepted authorial choice, not a narrow translation edge case — spending repair budget
   rewriting already-correct, already-shipped-shaped content on every such run, and, should the cheap
   rungs not converge on inserting a product name into a heading that was never supposed to carry one,
   spending a full-document regeneration on content that was never wrong. (b) **Scope
   `heading-brand-core-missing`'s mandatory-presence check to the CTA-heading position only** — chosen:
   this is a further Specification-level scope decision on the identical model already used for the
   `schemaVersion`-based Doc-path narrowing at v9/v10 (deciding *which leaf(ves)* a presence check reads is
   Specification's own territory, per so-planner's Plan v5's own words, "the kind of check-scope decision
   that belongs to Specification," reused verbatim here), decidable directly from this codebase's own
   fixtures and the QA report's own evidenced defect list, not a judgment call only the Owner can make.
   **This is not a reopening of OD-6.** OD-6 answered a different question — whether presence, once
   required, is mandatory or merely conditional on the heading otherwise naming the product — and that
   answer (mandatory-presence) is unchanged and still governs the CTA-heading position exactly as v4-v15
   already established. v16 decides only *which position(s)* that mandatory-presence check reads, the
   same category of scope decision v9/v10 already made for the Doc-path CTA leaf's `schemaVersion`-
   conditional field, not a re-litigation of OD-6's own presence-vs-conditional question. FR-6's own
   exemption logic (a heading at either blessed position that correctly carries the exact `productShort()`
   form is not flagged as stuffing) is unaffected — this is a change to FR-7's mandatory-presence scope
   only, not to FR-6's blessed-position set, which still recognizes both positions exactly as AC-2
   requires. `so-planner`'s own D5(f) explicitly named this narrowing as one of the two viable dispositions
   it itself considered and stated only that it, `so-planner`, lacks the authority to choose between
   them — the same "OD-6/Specification territory" framing this stage now resolves. See FR-7 below for the
   corrected text.

   (c) **Adopt conditional-correctness at the first-§3-heading leaf** — the disposition OD-6 itself
   originally named for this general question ("if the heading names the product at all, the name must be
   the correct form; a heading naming no product is fine," `docs/decisions/US-3.1-open-decisions.md#4`,
   OD-6's own write-up) — now checked, per SPEC_REVIEW v15's finding, rather than left undisposed. A
   usable conditional-correctness trigger has to tell "this heading doesn't name the product" apart from
   "this heading names the product, incorrectly," and this Story's own idiom offers exactly two candidate
   shapes, both checked directly:

   - **A whole-designator-string match** — the existing `shortPattern`/`productNamePattern` idiom FR-6/
     FR-7 already use elsewhere — rejected: this idiom is a full match/no-match test, and both "the
     heading never named the product" and "the heading named the product, but incorrectly, partially, or
     reordered" produce the identical "no match" result against it. It cannot make the distinction
     conditional-correctness itself requires — the same objection SPEC_REVIEW v15 raised in general terms
     for this Story's naming idiom, now confirmed against the actual matcher rather than assumed.
   - **A token-presence/partial-match trigger** ("does any brand or designator token appear at all") —
     rejected: building this requires a new detector this Story does not otherwise have (every existing
     check in this Story is a full-pattern match, never a partial one), and it reproduces the identical
     false-positive class v16 already rejected the core-position rule for. Verified directly against
     `product-name-core.ts`, not assumed: `productShort('Makera Cyclone Dust Collector')` returns the
     whole string unchanged (independently re-confirmed here, and already established below in FR-7's own
     Accepted-cost paragraph), because "Dust" and "Collector" are capitalized Latin tokens and neither is
     listed in `DESCRIPTOR_STOPWORDS` (`product-name-core.ts:45-67`) — so `looksLikeDesignator()`
     (`product-name-core.ts:85-90`) keeps both as designator-shaped tokens of this product's own core. A
     token-presence trigger built from that set would treat any §3 heading containing the ordinary English
     words "Dust" or "Collector" as "naming the product" — plausible for this exact product family, where
     dust collection is itself a common accessory category, not a remote hypothetical — misclassifying
     unrelated, correct content the same way the core-position rule misclassified Anchor 4 in Background
     point 1 above. Neither of this Story's own two corpus fixtures happens to exercise this exact
     collision (both are for a different product, Ortur H20, whose own designator tokens, "Ortur"/"H20",
     are not ordinary English words), but the mechanism producing the false positive is the same
     already-documented, deliberate over-capture bias `productShort()`'s own doc comment states, not a
     new risk invented for this analysis.

   Both trigger shapes fail for the same underlying reason: neither can distinguish "no product name here"
   from "product name here, wrong" without either reusing an idiom that structurally cannot make that
   distinction, or building a new partial-match detector that reintroduces this Story's own
   already-accepted false-positive class one leaf earlier than v16 already rejected it. Conditional-
   correctness is therefore not adopted at the first-§3-heading leaf; disposition (b) — v16's
   CTA-heading-only removal — stands, disposed of here with the same "define a candidate, check it against
   this Story's own corpus and evidence, adopt or reject with reasoning" discipline already given to the
   core-position and word-count-margin candidates in Background point 1 above, not merely noted and left
   open.

   **Checked directly against the Story's own AC-3 text, not silently narrowed around it.** AC-3 reads:
   "The brand-core invariant check extends beyond `slugs.json` to `doc.cta.heading` (and the other §3/§9
   headings exempted by AC-2)" — a parenthetical that, read most broadly, could be taken to put the first
   §3 heading in scope for the same check by name. This Specification does not read that parenthetical as
   settling *how* the check applies to each named field, only *that* the invariant check's reach is
   broader than `slugs.json` alone; AC-3's own justifying clause — "so es-ES/pt-PT dropping the invariant
   core **there** is caught the same way slug drift already is" — points at the one field the QA report's
   own evidence actually names a drop against (`cta.heading`), the same reading OD-6's own mandatory-
   presence resolution already relied on exclusively for its evidence. Applying a mandatory-presence
   reading of that parenthetical literally, against a position this Story's own accepted corpus shows is
   legitimately silent on the product name, would produce exactly the kind of "requirement invented to
   fill a gap" outcome this Specification's own writing discipline exists to avoid — the Story's
   acceptance criteria describe a defect to close, not an invariant to impose on content this Story's own
   evidence shows was never broken. If the Owner intended AC-3's parenthetical as a literal, independent
   mandatory-presence requirement at the first §3 heading regardless of this fixture evidence, that is a
   correction to make at this gate, not a reading this Specification adopts by default against the
   evidence in hand.

3. **Nothing else in FR-6, FR-8, FR-9, FR-12 or FR-13 is touched by either change.** so-planner's Plan v6
   independently re-confirmed the rest of D5/D5(e)/D5(f) — the `schemaVersion`-conditional CTA-position
   retarget, the locale-aware Cyrillic-unit matcher, the bare-name shape test, the banned-character/
   occurrence-count/trailing-position mechanism, and the path-parameterized repair instruction — as fully
   designed and independent of how this loop-back resolves; neither of v16's two changes requires
   revisiting any of it, and this revision leaves all of it exactly as v15 stated.

**This is v18 of the Specification**, rewritten after PLAN_REVIEW v8
(`docs/reviews/plans/US-3.1-plan-review.md#8`) returned `CHANGES_REQUIRED` with
`loop_back_stage: changes_required_specification` — not a SPEC_REVIEW finding against v17's own text
in isolation (v17's own two fixes, both scoped to FR-7, are unaffected and unrevisited by this round),
but a Specification-authorization gap PLAN_REVIEW v8 found in `implementation_plan` v10's `D15` and
`task_breakdown` v9's `T15` — the design that closes the QA-report-driven "Defect 1"
(`meta-title-template-shape` unsatisfiable for a long `h1`), built after a real 2026-09-28
regeneration (`expert3d_formlabs_optical_cleaning_cloths_2026-09-28_1706.zip`) independently confirmed
es-ES/pt-PT/uk-UA `h1` values (66/60/69 Unicode code points) for which no template-shaped `meta_title`
can ever satisfy `output-validator.ts`'s untouched 55-character ceiling. Read directly, in full, this
round: `implementation_plan.md` v10 §2 (`D15`, including its closed-form coverage proof at §2.4.1) and
`task_breakdown.md` v9's `T15` section, rather than accepted from either the Owner's own informal
summary of the design or from `plan_review` v8's own characterization of it:

1. **PLAN_REVIEW v8's finding, independently confirmed against `implementation_plan` v10's and
   `task_breakdown` v9's own text directly, not merely against the review's description of them.** `D15`
   is sound, independently-verified engineering — six of `plan_review` v8's seven review axes are clear,
   including a partial technical audit of `D15` itself against live source — but it ships a `meta_title`
   shape for `h1Len ≥ 54` that this Specification's own `FR-8` text (through v17) does not authorize and
   that `OD-8`'s own resolution text (`docs/decisions/US-3.1-open-decisions.md#4`, "the cascade must
   degrade for that product by design") affirmatively contradicts: instead of letting the degradation
   cascade run out and accepting the resulting `meta-title-template-shape` failure and its full-regen
   cost, `D15` deterministically computes and unconditionally applies a different, always-reachable
   shape before validation ever runs, so that failure never actually occurs for this case. Both the Plan
   and the Task Breakdown found this gap themselves (Plan §2.6, Residual 3) and both explicitly
   considered routing it back to `SPECIFICATION` and declined, reasoning that the Owner's own direct
   instruction to `so-planner` during `ARCHITECTURE_PLANNING` — *"redefine the template anchor for long
   names (e.g., using `productShort()`) so we produce a verbatim-honest title without touching the
   55-character ceiling"* (Plan §2.2) — already authorizes the redefinition "in substance," so only the
   Specification document's own text needed to "catch up," not a formal loop-back. `plan_review` v8
   independently re-examined that reasoning and found it does not hold, for two reasons this
   Specification adopts rather than re-derives: the Owner's instruction was never routed through
   `SPECIFICATION`/`SPEC_REVIEW`/`HUMAN_SPEC_APPROVAL`, so the document `TEST_WRITING` and
   `RECONCILIATION` check against does not, and will not, reflect it without this round; and the analogy
   drawn to `OD-9` (which delegated only the *exact prompt wording* of a requirement `FR-13` already
   stated in substance) does not transfer here, where no FR previously stated, in any form, that a
   long-`h1` `meta_title` may take an alternate, non-template shape — `FR-8`'s prior text affirmatively
   said the opposite. This Specification agrees and proceeds on that basis: the fix is not a design
   defect (nothing about `D15`'s mechanism needs to change), so `changes_required_specification`, not
   `changes_required` back to `ARCHITECTURE_PLANNING`, is the correct loop-back, exactly as
   `plan_review` v8 itself concluded.

2. **The mechanism `D15`/`T15` actually specify, read directly rather than assumed from the Owner's own
   literal suggestion.** The Owner's instruction named `productShort()` as an example mechanism;
   `implementation_plan` v10 §2.3 independently checked it against the real failing case and found it
   does not work — applied to the raw product name it is locale-invariant and lands mid-`h1`, not as a
   usable prefix; applied to each locale's own translated `h1` it either captures a linguistically
   meaningless fragment (its Latin-capitalization heuristic mistakes a translated sentence's
   grammatically-capitalized first word for a brand token) or fails outright on Cyrillic script — and
   designed a different, disclosed substitute that still delivers the Owner's stated outcome (a shorter,
   verbatim-honest, ceiling-respecting title, no ceiling change): a deterministic, word-boundary-safe
   truncation of `h1` itself (via the already-shipped `truncateAtWordBoundary()`) to a safe core length,
   followed by a single differentiation mark, computed by a pure function of `h1` alone and applied
   identically by both the generation-time normalization and the validator, so the two can never
   independently disagree. This is not this Specification's own design — it restates, at requirement
   level, the mechanism `D15`/`T15` independently designed and `plan_review` v8 partially,
   independently verified against live source.

3. **The activation threshold — `h1Len ≥ 54`, not `h1Len ≥ 55` — is the exact boundary of the shape
   `FR-8`'s existing template check already requires, not a new number this Specification chose.** An
   earlier iteration of `D15`'s own design activated only at `h1Len ≥ 55`, derived from the alternate
   shape's own one-character differentiation mark; `task_breakdown` v8's own independent re-derivation
   found this left `h1Len = 54` covered by neither the existing template check (already unreachable at
   that length, since even the shortest possible dash-tailed continuation needs two further characters,
   putting the total at 56) nor the new override (not yet active at `h1Len = 54` under the `≥ 55` form) —
   an internal self-contradiction, independently re-confirmed this round against `implementation_plan`
   v10 §2.4's own worked arithmetic and closed-form proof (§2.4.1): `Reachable(n) := n ≤ 53` and
   `Unreachable(n) := n ≥ 54` are defined as exact logical complements of each other, so every integer
   `h1Len ≥ 0` falls into exactly one of the two regimes, with no third, uncovered state. `D15`'s
   corrected threshold, `h1Len ≥ 54`, is what closes that gap; this Specification states it exactly, not
   approximately, per this round's own instruction to get the number right.

4. **This closes the long-`h1` case fully, not merely more often — a materially different outcome from
   `OD-8`'s original "accepted, inherent limit" framing, which this Specification must now correct
   rather than silently leave standing.** `OD-8`'s prior disposition (Background, v5 above; `FR-13(c)`)
   accepted that a product whose name or localized-category term runs longer than the QA sample could
   not reach the approved template shape within the untouched ceiling *at any budget value*, and that
   "the cascade must degrade for that product by design" — an accepted cost, not something this Story
   closes. `D15`'s mechanism, verified sound by `plan_review` v8's own closed-form-proof audit, does not
   merely reduce how often that degradation happens — for every `h1Len`, including arbitrarily long real
   values (the 2026-09-28 regeneration's own 66/60/69-code-point `h1` strings included), it guarantees a
   validator-accepted, unconditionally-shipped `meta_title` exists and is what actually ships, with no
   dependency on the repair ladder or on `so-planner`'s original template shape being reachable at all.
   This Specification therefore does not merely narrow `OD-8`'s framing — it supersedes it, for the
   `h1Len ≥ 54` sub-case specifically. `OD-8`'s other half — the thinned margin `FR-13(c)` accepts for
   `h1Len ≤ 53`, where a template-shaped title can still cross the untouched ceiling through the model's
   own miscounting and land on either a cheap or an expensive repair path — is a different mechanism
   `D15` does not touch, and is unaffected by this revision.

5. **This Specification does not itself correct `open_decisions`.** `so-clarifier` owns
   `docs/decisions/US-3.1-open-decisions.md`; this stage may state, in its own text, that `OD-8`'s
   recorded disposition no longer accurately describes what ships for `h1Len ≥ 54` (see Open questions,
   below) but cannot edit that artifact's own recorded resolution. A follow-up correction pass there is
   flagged for the orchestrator as non-blocking and informational — it does not block this Specification
   from resuming, and does not block `PLAN_REVIEW`'s next pass over `T15` once this revision is
   available to build tests against.

6. **Scope, confirmed against `plan_review` v8's own scoping of this loop-back.** `plan_review` v8 found
   `D13`/`D14`/`T13`/`T14` (Defect 2) sound and unaffected, and found `D1`-`D12`/`T1`-`T12` need no
   rework on this pass. This revision touches only `FR-8` (adding clause (b)), the `AC-4` traceability
   entry, a small number of other passages inside `FR-8`'s own remaining text, `FR-13(c)`'s tradeoff
   discussion, and Out of scope that asserted the now-superseded framing, and the Open questions
   section. `FR-1` through `FR-7`, `FR-9` through `FR-12`, and `FR-13(a)`/(b)/(d) are otherwise
   unaffected and independently re-confirmed unchanged by this round's edits.

## Scope

| | |
|---|---|
| **Stores** | All of `STORE_REGISTRY` — EXPERT3D was the QA sample; every rule here is store-generic. |
| **Locales** | All locales `STORE_REGISTRY` defines per store — uk-UA master plus every derived/translated locale. uk-UA is the master for generation (Task A) and for FR-1..FR-5's grounding check: `groundingSpecs()` runs once per generation against the uk-UA specs-translation call, and its result gates every artifact (Doc and HTML) produced by that run, uk-UA included. FR-6/FR-7's heading checks and FR-8/FR-9's `meta_title`/`h1` checks run independently per locale, on every generated locale including uk-UA. |
| **Track** | angular (per the Story's own front matter; task breakdown may assign narrower per-task tracks) |
| **Surface (files touched)** | Beyond the Story's own Surface list (`content-orchestrator.service.ts`, `repair-gate.ts`, `heading-style.ts`, `slug-validator.ts`, `repair-strategy.ts`), this Specification's FRs reach: `src/app/app.component.ts` and `src/utils/zip-generator.ts` (FR-3, OD-1's resolved export-block mechanism); `src/render/doc-schema-issues.ts` and the Doc-attempt construction path in `content-orchestrator.service.ts` (`produceTaskADoc`) (FR-10, the path-and-candidate fix); a new sibling validation module for FR-8/FR-9 (see FR-8's note); `src/domain/description-doc.schema.ts` (FR-14, new in v20 — the `cta.heading` `schemaVersion`-conditional relaxation; not a FROZEN file, no §9 authorization needed); and, under the FROZEN authorizations below, `src/prompt-core/master-system-prompt.ts` and `src/prompts/task-a.ts` (FR-12) and `src/prompts/task-b.ts` (FR-13). |
| **FROZEN files (AGENTS.md §9)** | Three separate, narrowly-scoped authorizations are already recorded (not granted by this Specification): (1) the Story's own D3 — `src/prompts/task-a.ts`, `task-b.ts`, `task-c.ts` and/or `src/prompt-core/master-system-prompt.ts`, to disambiguate `[HEADING FORM]`/the invariant-core rule text — **FR-12 below states what this edit must actually say**, scoped to `master-system-prompt.ts` and `task-a.ts` after independently re-verifying that `task-c.ts`'s own CTA-heading wording already matches OD-2's required form and needs no edit (see Out of scope); (2) OD-3 — `src/prompts/task-b.ts` specifically, to remove the "`[Site Suffix]` is MANDATORY" instruction (line 44) and update its four few-shot anchors (lines 81-106) — **FR-13(d)'s line-44 clause and the anchor updates below state what this edit must actually say**; (3) **OD-7** (`docs/decisions/US-3.1-open-decisions.md#3`) — `src/prompts/task-b.ts`'s per-locale Title budget table (lines 67-79) specifically, "for all locales" — a separate, distinctly-headed section from the few-shot anchors OD-3 names, now independently and explicitly granted rather than inferred from OD-3 — **FR-13(c) below states the reconciled numbers**. `src/utils/output-validator.ts` is FROZEN and **not** authorized under any of the three (or under OD-9,
below) — no edit to it is in scope; a real need to edit it is a separate §9 stop (see OD-8, OD-10,
FR-13(c)/(b)). (4) **OD-9** (`docs/decisions/US-3.1-open-decisions.md#4`) — the whole "— meta_title —"
block (lines 39-51, explicitly naming lines 46, 47, 48 and 49) and `buildPromptB()`'s
excerpt-construction code (lines 112-140), granted in full after Specification v7 asked for it —
**FR-13(a), (b) and (d) below state what this edit must actually say.** Any commit editing an
authorized FROZEN file re-baselines `.arch-guard-checksums` in the same commit (AGENTS.md §9) — an
implementation-time note, not an action of this Specification; OD-3's, OD-7's and OD-9's edits all land
in `task-b.ts`, so a single rebaseline in the same commit covers all three. |

## Functional requirements

### FR-1: Retry-with-backoff covers all three grounding fail-open triggers

`groundingSpecs()`'s specs-translation call is retried with backoff when its result indicates
failure by any of its three current triggers, not only the thrown-exception path: the call
throwing, the call returning empty/whitespace-only text, or `inspectGroundedTranslation()`
classifying the result as wrong-script (per OD-5). A retry that succeeds before the budget is
exhausted returns the successful grounded translation; `groundingSpecs()` only returns a failure
result (`{ text: '', failure: ... }`) after the retry budget is exhausted with every attempt still
failing.

**Failure path:** a transient single-attempt failure on any of the three triggers that disables
grounding without a retry having been attempted is the regression this requirement exists to
close.

### FR-2: Grounding failure after retry escalates to error severity, without spending repair budget on it

**(a) Escalation, at all three live emission sites.** When `groundingSpecs()` still reports a
failure (any of the three FR-1 triggers) after its retry budget is exhausted, every
`specs-grounding-disabled` issue emitted for that generation carries `severity: 'error'` instead of
`'warning'`, at **all three** places this issue is actually emitted in
`content-orchestrator.service.ts` — independently re-verified as three separate call sites, not
two: the `runDocGate()` closure shared by both `generate()`'s and `generateUaContent()`'s Doc paths
(~line 547–549); `generate()`'s own inline HTML-gate closure (~line 755–757); and
`generateUaContent()`'s **separately duplicated** inline HTML-gate closure (~line 1172–1174,
commented "Same reasoning as the sibling call in `generate()`" — a maintained duplicate, not shared
code, whose output flows into the same `this.content` signal FR-3 reads). `repair-gate.ts`'s
existing severity-based accounting (`errCount`, and `toArtifactReport`'s `status` derivation) then
counts an escalated issue toward "still failing" without any change to `repair-gate.ts`'s own
severity logic, because that logic already keys off `severity === 'error'`. As today, no
`specs-grounding-disabled` issue is emitted at all — at any severity — for a product with no source
`input.specs` (see FR-3's carve-out); this clause only changes the severity of an issue that would
already have been emitted.

**(b) No repair-attempt budget is spent on it.** `groundingDisabled` is computed once per
generation, before the first repair attempt (`generate()` line 660 /
`generateUaContent()` line 1095), and closed over unchanged by every subsequent `validate()` call —
no repair instrument, full-document regeneration included, can alter its outcome within the same
run. Escalating its severity without addressing this would make `repair-gate.ts`'s
`while (repairsUsed < opts.maxRepairs)` loop run to complete exhaustion on every run with an
unresolved grounding failure, spending every full-document-regeneration attempt on a condition none
of them can fix — the exact disproportionate-repair-cost problem AC-6 exists to eliminate elsewhere
in this Story, newly introduced by (a) if left unaddressed. To prevent this: an error-severity
`specs-grounding-disabled` issue is excluded from the repair loop's own "keep spending attempts"
test — when it is the only error-severity issue present, the loop spends zero full-document-
regeneration attempts reaching that state; when one or more *other* error-severity issues are
present in the same run, the loop repairs those exactly as it does today, undisturbed by the
grounding issue's presence alongside them. This exclusion applies **only** to that one test. It
does **not** remove the issue from the run's final issue set (`finalIssues`), and it does **not**
change the artifact's reported `status`: an artifact whose only problem is an unresolved, error-
severity `specs-grounding-disabled` finding is still reported `'unresolved'`, never `'clean'` or
`'repaired'`, regardless of how many attempts (zero or more) the loop actually spent — so
`repairUnresolvedCount()` and FR-3's export block both continue to see it correctly.

**Failure path:** (i) a `specs-grounding-disabled` finding that remains `severity: 'warning'` after
the retry budget is exhausted, at any of the three sites, and so is never counted by
`repair-gate.ts` as an error, is the fail-open bug AC-1 exists to close; (ii) a run whose only
error-severity finding is `specs-grounding-disabled` that still spends one or more full-document-
regeneration attempts because of it is the disproportionate-cost regression clause (b) exists to
close; (iii) a run reported `'clean'`, or with export left unblocked, while a `specs-grounding-
disabled` error is present is a regression of (b)'s own guarantee, not an acceptable side effect of
excluding it from the attempt-spending test; (iv) a run with other, genuinely repairable error-
severity issues that stops repairing them because a grounding issue is also present is also a
regression.

### FR-3: Real export block on unresolved grounding — ZIP and plain-text export both

When the current generation's repair reports (`repairReport()`) include a `finalIssues` entry with
`rule: 'specs-grounding-disabled'` and `severity: 'error'` for any artifact, **neither** of the two
content-bearing export actions in the UI proceeds: `app.component.ts`'s `downloadZip()` does not
call `zip-generator.ts`'s `downloadPackage()`, and `downloadText()` does not call
`downloadTextPackage()` — both read the identical `this.content()` signal this condition is keyed
on (confirmed at `app.component.ts:1115-1123`). The UI shows a blocking message stating that §7
specs could not be verified against source and that export is disabled. `downloadAllImages()`
(`downloadImagesPackage(this.imgResults())`) is **not** gated by this requirement: it reads a
distinct signal (`imgResults()`, processed images and alt text) that carries no §7 spec content and
is unaffected by a specs-grounding failure — see Out of scope. Both `downloadZip()` and
`downloadText()` behave exactly as they do today whenever no such error-severity finding is present
for the run. A product with no source `input.specs` at all is unaffected by FR-1/FR-2/FR-3 end to
end: `groundingSpecs()` short-circuits and returns `{ text: '' }` with no `failure`,
`groundingDisabled` stays `false`, no `specs-grounding-disabled` issue is ever emitted for that
artifact, and this block condition is therefore never reached for either export action — exactly as
today.

> **Broadened from v1.** v1 scoped this block to the ZIP path only, reading OD-1's resolution
> narrowly ("ZIP generation/download is physically blocked"). SPEC_REVIEW v1 found that narrowing
> asserted rather than confirmed, since OD-1's resolution also states, without a ZIP-only qualifier,
> that "unverified content must not reach production," and `downloadText()` reads the identical
> content signal. This revision extends the block to both actions on that evidence — the guard
> condition and its cost are identical for both call sites, so there is no asymmetry to justify
> leaving one open. This is a Specification-level judgment, not a new Open Decision: unlike FR-7's
> severity tradeoff, there is no evidenced cost difference between blocking one export action and
> blocking both, so nothing here weighs against matching AC-1's own unqualified "hard-blocked from
> shipping" wording. Flagged here for visibility at `HUMAN_SPEC_APPROVAL`, not as a blocker.

**Failure path:** a ZIP or a plain-text export produced or downloaded while an error-severity
`specs-grounding-disabled` finding is present for the run is the defect OD-1 exists to close, for
either export action. Blocking export for a product that legitimately has no source specs to ground
(no `specs-grounding-disabled` issue was ever emitted for it) is an over-broad implementation of
this requirement, not a correct one — for either action.

### FR-4: No silent fallback to unverified specs text, at any severity

In every case — before, during and after the FR-1 retry, and regardless of whether the resulting
severity is `'warning'` or `'error'` — `groundingSpecs()` never substitutes the untranslated
`input.specs` string as if it were a grounded translation; a failed/exhausted grounding attempt
keeps returning `{ text: '', failure: ... }` exactly as today, and callers continue to fall back to
`input.specs` only as raw, explicitly-ungrounded source text, never relabeled as verified. This is
the Ortur H20 guarantee (`content-orchestrator.service.ts` lines 257-266) and this Story does not
change it.

**Failure path:** n/a as new behaviour — this is the invariant FR-1/FR-2/FR-3 must not disturb; a
change to the `''`-on-failure contract is a regression of this requirement, not a defect of its
own.

### FR-5: The export block does not abort generation

FR-3's block applies to the export/download actions only (ZIP and plain-text; `downloadAllImages()`
is unaffected — see FR-3). Generation itself (`generate()` / `generateUaContent()`) completes
normally, and the resulting content, repair report and validation issues remain visible in the UI
exactly as for any other unresolved artifact; only the two export actions are prevented. This is a
named, scoped exception to `README.md`'s "validation is advisory ... never abort a run" principle
(`README.md:100`): "abort a run" and "block this run's export" are different actions, and this
Story narrows the advisory principle only for the specs-grounding rule's export paths — not for
validation generally, and not for any other rule.

**Failure path:** a change that stops generation from completing (rather than only blocking export)
when grounding fails is broader than FR-3 requires and violates this requirement.

### FR-6: Blessed-position exemption on the full-pattern branch

`heading-product-name-stuffing` (`checkProductNameStuffing` in `heading-style.ts`, and its Doc
sibling `checkProductNameStuffingDoc`) does not flag a heading at one of the two blessed positions —
the first §3 heading (`doc.functionality[0].heading` / the first matching §3 `<h2>`) or the CTA
heading (`doc.cta.heading` / the §9 closing `<h2>`) — when that heading's product-naming content is
exactly the `productShort()`-derived form. This must hold even when `productShort(name) === name`
(no trailing configuration code to drop, the QA sample's own case): today's `fullPattern` branch
fires unconditionally in exactly that case, with no position check at all, which is the uk-UA false
positive AC-2 exists to fix — stating the fix as "reuse the existing `shortPattern` branch's
exemption" would be a pointer to inert code, since that branch's own `shortPattern` is `null`
whenever `short === full` (`heading-style.ts` line 115) and so never reaches its blessed-position
logic for this product either. A heading at either blessed position that carries **more** than the
`productShort()` form — the trailing configuration code or packaging suffix `productShort()` drops,
when one exists — is still flagged, because OD-2 requires the short form specifically at these two
positions, not the full/invariant form. A heading naming the product anywhere other than these two
positions is unaffected by this Story and is still flagged exactly as today.

**Failure path:** a heading at a non-blessed position that names the product, or a blessed-position
heading carrying the full/invariant form rather than the short form, is still flagged; a correct
short-form heading at a blessed position that is nonetheless flagged is the regression AC-2 exists
to fix (the uk-UA false positive in the QA report).

> **FR-6 and FR-7 are disjoint by construction.** FR-6 fires when a blessed-position heading carries
> *more* than the exact `productShort()` form (the full/invariant form, or a form with a trailing
> code/suffix). FR-7 (below) fires when it carries *less than or other than* the exact
> `productShort()` form (missing entirely, or corrupted/mistranslated). A heading carrying exactly
> the `productShort()` form satisfies both and triggers neither — the two rules cannot both fire, or
> both stay silent incorrectly, on the same heading.

### FR-7: Brand-core is mandatory, in `productShort()` form, at the CTA heading — caught and repaired the same way slug drift already is

For every generated locale (including the uk-UA master), the CTA heading (the §9 closing heading)
contains the product's `productShort()`-derived form — the same pattern match `heading-style.ts`'s
existing `shortPattern` branch already applies. **Mandatory-presence is scoped to the CTA-heading
position only, as of v16.** Through v15 this requirement also applied, identically, to the first §3
heading (`doc.functionality[0].heading` / the first matching §3 heading); v16 removes that leaf from
`heading-brand-core-missing` entirely — see the "First-§3-heading position" bullet below and
Background, v16, point 2, for the evidenced reason (a real, human-accepted golden-corpus heading that
never named the product at all, with no corresponding QA-evidenced regression at that position, unlike
the CTA heading). This is a narrowing of *which leaf* this check reads, not of OD-6's own
mandatory-presence-vs-conditional-correctness answer, which is unchanged. A new check,
`heading-brand-core-missing`, fails when the CTA heading omits the `productShort()` form entirely, or
carries a variant that does not match that pattern (a corrupted, reordered, partially-dropped, or
mistranslated rendering) — this is a negative match against the existing
`shortPattern`/`productNamePattern` regex idiom, the same mechanism FR-6 uses, not a separate
fuzzy-corruption detector. Like FR-6, this check has an
HTML/string-path form and a Doc-path form (mirroring `checkProductNameStuffing` /
`checkProductNameStuffingDoc`), and **the two forms cover different call sites, and the Doc-path
form's CTA-position target differs by `schemaVersion`, as of v10**:

- **HTML/string-path**, addressed at the rendered `<h2>` text: validates what actually ships, at
  the CTA-heading position (the only position `heading-brand-core-missing` checks, as of v16 — see the
  Doc-path's parallel narrowing below), for every `schemaVersion`, wherever it runs. It runs **in-gate** — reported,
  counted toward `'unresolved'`, and repaired before any full-regen is spent — at two call sites,
  unaffected by this revision: `generate()`'s Task C translation loop (`content-orchestrator.service.ts`
  line ~988), for every **non-master, translated** locale, on any generation; and, for the master
  itself, only on the plain-HTML (non-Doc) pipeline branch (`generate()` line 785 /
  `generateUaContent()` line 1212), if that branch is ever reached. It does **not** run in-gate for the
  **Doc-pipeline master** — `runDocGate()` (`content-orchestrator.service.ts:486-664`) is the single,
  shared method both `generate()` and `generateUaContent()` call for their own Doc-pipeline master
  branch, so this gap (and this fix) covers both call sites identically, not only one of them — it
  renders exactly once, after its own `validate()` closure concludes (line 656), and the only place the
  HTML/string-path
  check is subsequently applied to that rendered master HTML is `runOutputValidation()`
  (`content-orchestrator.service.ts:1708`), a pass that runs last, merges only into `validationIssues`
  for display, and is never repaired and never counted toward `'unresolved'` status. Since every
  currently-enrolled store is now on the Doc pipeline (`doc-pipeline-flag.ts`), the HTML/string-path
  check is not, on its own, a real enforcement path for the master — see the Doc-path form below,
  which is.
- **Doc-path**, addressed by `path` against the structured `ProductDescriptionDoc`, composed in-gate
  inside `runDocGate()`'s own `validate()` closure (`content-orchestrator.service.ts:546-599`, the
  same closure that already composes `validateHeadingStyleDoc` at line 563) — this is what actually
  enforces the CTA-heading position for the Doc-pipeline master, for every `schemaVersion`, before
  render:
  - **First-§3-heading position** (`doc.functionality[0].heading`): **out of scope for
    `heading-brand-core-missing` as of v16 — no presence check runs against this leaf, for a Doc of
    either `schemaVersion`.** Through v15 this leaf ran the identical mandatory-presence check as the
    CTA position; v16 removes it, because Impact Analysis v3 independently re-confirmed a real,
    human-accepted golden-corpus generation
    (`test/fixtures/corpus/expert3d-ortur-h20-20w.doc.json`) whose own first §3 heading never names the
    product at all, with no corresponding QA-evidenced regression at this position (see Background,
    v16, point 2). `doc.functionality[0].heading` remains a blessed position for FR-6's own exemption
    unchanged — a heading there that does carry the exact `productShort()` form is still correctly
    exempted from the stuffing warning; only FR-7's own mandatory-*presence* requirement is narrowed
    away from this leaf, not FR-6's exemption logic or AC-2's budget-of-two boundary.
  - **CTA-heading position**: the field the check addresses depends on which field genuinely reaches
    the shipped heading for that `schemaVersion`, per `render-description.ts`'s own `isV4` branch
    (lines 443-450) — **not left unvalidated for either version**:
    - For a `schemaVersion: '3.0'` Doc: `doc.cta.heading` — the field the renderer emits verbatim on
      that path (`isV4` confirmed `false`).
    - For a `schemaVersion: '4.0'` Doc: `doc.localizedName` — **new in v10**. `render-description.ts`
      lines 443-449 discard `doc.cta.heading` unconditionally on this path and assemble the shipped
      heading from `getRenderRules(storeName).ctaHeading(doc.locale, doc.localizedName)` instead
      (`store-render-rules.ts:58,90-106`); `doc.localizedName` is exactly the argument that function
      substitutes into the per-locale template. `doc.localizedName` is a plain, top-level `NonEmpty`
      string field (`description-doc.schema.ts:182`), populated by the Task-A model
      (`task-a-doc.ts:55`) and, independently confirmed by a full-repo search, checked against
      `productShort()`/the brand core by no validator prior to this revision — `ctaHeading()`'s own
      "correct by construction" guarantee holds only given a correct `doc.localizedName`, a premise
      this check now verifies rather than assumes. It is addressed by the same `"doc."`-prefixed
      dot-path idiom `getAtPath`/`setAtPath` already use generically for every other Doc-path target
      in this Story (`repair-strategy.ts:153`, confirmed not field-specific), so it is field-scoped
      repairable by the same registered ladder as `doc.cta.heading`,
      with no new repair primitive. **Addressability alone is not sufficient for this leaf — see the
      shape requirement and the required path-parameterized repair instruction, new in v11, below.**

  **New in v11 — the `doc.localizedName` leaf additionally requires the value (original or repaired)
  to be a bare name, not merely to contain the `productShort()` substring.** SPEC_REVIEW v9 found that
  `REPAIR_STRATEGIES` shares one `fieldInstruction` per rule across every path a rule fires on
  (`repair-strategy.ts:240`), so a `heading-brand-core-missing` instruction written for a heading leaf
  ("Rewrite this heading...") could return heading- or CTA-sentence-framed text that still contains the
  `productShort()` substring for the `doc.localizedName` leaf — satisfying a bare presence test while
  shipping a corrupted `<h2>`/video caption (`store-render-rules.ts:104`, `render-description.ts:168`).
  This closes that gap with two requirements, both scoped to the `doc.localizedName` leaf only — the
  one remaining genuine heading leaf (`doc.cta.heading`, checked for a `schemaVersion: '3.0'` Doc) keeps
  the existing substring-presence test unchanged, since a heading is expected to carry the name inside
  more text (the §9 CTA sentence) — through v15, `doc.functionality[0].heading` was a second genuine
  heading leaf under this same substring-presence test; v16 removes it from `heading-brand-core-missing`
  entirely (see above and Background, v16, point 2), so it is no longer part of this leaf list:

  - **Shape requirement.** `doc.localizedName`'s value — checked both on the model's original output
    and on any repaired value before it is accepted as resolving the finding — must be the product name
    and nothing else: no leading or trailing sentence framing, no call-to-action wording (e.g. "Buy",
    "Shop", "Now"), no sentence-terminal punctuation, quotation marks, or line breaks a heading or CTA
    sentence would carry, and no additional clause beyond what the schema field's own contract already
    asks for ("product name as it should read in this language," `task-a-doc.ts:55`) — **subject to the
    exemption below for a character that is already part of the product's own real name.** This is
    narrower than a full-string-equality test against `productShort()`: a `doc.localizedName` that
    legitimately carries the fuller invariant/full name, with no framing added (e.g. "Makera Cyclone Dust
    Collector Standard Package"), still satisfies this shape requirement and still passes — disallowing
    that remains FR-6's own, separately-scoped, non-blocking parallel gap (Out of scope), not something
    this clause newly closes.

    **Banned-character classes, enumerated precisely (new in v13, closing SPEC_REVIEW v11's
    non-blocking class-boundary finding).** Two classes are banned, each a fixed set of literal Unicode
    code points — no normalization, decomposition or case-folding is applied when identifying an
    instance:
    - **Sentence-terminal punctuation:** `.` (U+002E, full stop), `!` (U+0021, exclamation mark), `?`
      (U+003F, question mark), and `…` (U+2026, the single-code-point horizontal ellipsis). **An
      ellipsis is one instance of `…`, not three instances of `.`** — it is a distinct code point from
      the full stop and is tallied separately (below) under its own identity. Three consecutive ASCII
      periods (`...`) are, conversely, three separate instances of `.` (U+002E) — the same character
      repeated three times, each tallied individually — not one instance of `…`. A detector that
      normalizes `...` to `…` (or vice versa) before counting no longer implements this rule.
    - **Quotation marks — double-quote-shaped delimiters only:** `"` (U+0022), `“` (U+201C), `”`
      (U+201D), `„` (U+201E), `«` (U+00AB), `»` (U+00BB).
    - **Explicitly excluded from both classes, not merely exempted by the test below — these are not
      banned characters at all:** the bare comma `,` (U+002C), and every apostrophe/single-quote-shaped
      character — `'` (U+0027), `’` (U+2019), `‘` (U+2018). **This exclusion holds by definition alone**
      (grounding restated more precisely in v14, per SPEC_REVIEW v12's non-blocking finding): both banned
      classes above are closed, literal enumerations that simply do not name the comma or any
      apostrophe/single-quote-shaped character, so nothing further is required to ground the outcome.
      Stated explicitly rather than left to be inferred from what the class list omits, per SPEC_REVIEW
      v11: a comma is neither sentence-terminal nor a quotation-mark delimiter, and commonly appears in a
      legitimately localized category-first rendering with no framing intent. For the apostrophe/
      single-quote exclusion, `product-name-core.ts`'s own designator-token pattern
      (`/^[A-Za-zÀ-ÿ][\w'’-]*$/`, `product-name-core.ts:89`) is cited as **supporting illustration for
      why the outcome is sensible, not as its full or exclusive grounding** — the regex is reached only
      for a token containing no digit (`product-name-core.ts:88`'s `if (/\d/.test(token)) return true`
      returns early for any digit-bearing token, regardless of what other punctuation it carries, so the
      regex says nothing about those), and even for the non-digit case it actually governs, its character
      class does not literally include `‘` (U+2018), one of the three code points this exclusion names.
      What the regex does show, for the case it reaches: a mid-token apostrophe already reads as a
      legitimate designator character in a non-digit brand/model token, not a framing device — banning it
      outright would fail a real brand/model name carrying one (e.g. a possessive-form brand), and a bare
      scare-quote-shaped single quote is indistinguishable, at the character level, from that same
      apostrophe glyph, so no code-point-level rule can separate the two; the double-quote-shaped class
      above already gives the check power against scare-quoting without this ambiguity.
    - **A line break (`\n` U+000A, `\r` U+000D) is banned unconditionally and is not subject to the
      occurrence-count exemption below at all, for any reference span** (scope corrected in v14, closing
      SPEC_REVIEW v12's carried non-blocking finding that the normative rule and the prior informational
      note about this stated it two different ways). No legitimate product name — the raw source name or
      any correct localization of it — ever needs an embedded line break, so no exemption is defined for
      one: a candidate containing any instance of `\n`/`\r` fails the shape requirement outright, counted
      or not.

    **Exemption — occurrence-count matching against the raw source name (occurrence semantics restated
    precisely in v13; reference span corrected in v14, closing SPEC_REVIEW v12's blocking finding).** For
    each banned character `c` (from either class above — a line break is never exempted, see above) that
    occurs one or more times in the candidate `doc.localizedName` value under test (the model's original
    output, or a repaired value being re-validated), count `c`'s occurrences in that candidate and,
    separately, `c`'s occurrences in `opts.input.name` **itself** — the raw, untranslated source product
    name, exactly as supplied, with **no** `invariantCore()`/`productShort()` extraction applied — already
    available, unconditionally, inside the same `validate()` closure `heading-brand-core-missing` runs in
    (`content-orchestrator.service.ts:546-599`; `opts.input.name` is already passed to two sibling calls in
    that exact closure — `validateSpecCountParityDoc(doc, opts.input.specs, opts.input.name, opts.label)`
    at line 560 and `validateHeadingStyleDoc(doc, opts.localeIso, opts.input.website.name, opts.input.name)`
    at line 563). **The candidate violates the shape requirement for character `c` if and only if `c`'s
    count in the candidate exceeds `c`'s count in `opts.input.name`.** This is a per-character-code-point
    tally — a `Map<character, count>` diff between the two strings — not a class-membership test ("does a
    character of this type occur anywhere in the name") and not a positional/substring-containment test
    ("does the character fall inside a literal, contiguous occurrence of some derived span"): **where in
    the candidate the character appears, and whether the candidate contains any particular substring of
    `opts.input.name` at all, are not part of the test.** The reference span is `opts.input.name`
    unmodified — not `invariantCore(opts.input.name)`, a derived subset of it (corrected in v14, below),
    and not `doc.localizedName` itself — precisely so a model cannot manufacture its own exemption by
    writing an arbitrary character into the value under test.

    **Why the raw name, not `invariantCore(opts.input.name)` (corrected in v14, closing SPEC_REVIEW v12's
    blocking finding against v13's own reference-span choice).** SPEC_REVIEW v12 traced a shape v13 did
    not pick: a category/packaging stopword sitting between the initial designator and a trailing
    decimal — e.g. `invariantCore("Bambu Lab Hardened Steel Nozzle 0.4 mm")` breaks its scan at
    `"nozzle"` (a `DESCRIPTOR_STOPWORDS` entry, `product-name-core.ts:51`) before ever reaching `"0.4"`,
    producing `"Bambu Lab Hardened Steel"` — zero periods — while the full, unframed name legitimately
    carries one. Two further shapes trace the same way (`"Bambu Lab PLA Basic 1.75mm"`, stopped at
    `"basic"`; `"eSUN PLA+ 1.75mm"`, stopped because `"PLA+"` fails the designator regex over the `+`).
    Under the old, `invariantCore(opts.input.name)`-based reference span, all three fail the shape
    requirement for an unframed full name — contradicting this clause's own "still satisfies this shape
    requirement and still passes" sentence above. `productShort(opts.input.name)` was checked as the
    fix and ruled out: `productShort()` computes `invariantCore(name)` first and only ever pops one
    additional trailing `CONFIG_TOKEN` from it (`product-name-core.ts:151-156`), so it can only equal or
    fall short of `invariantCore()`'s own output, never recover a character `invariantCore()` already
    failed to reach. **v14 instead points the reference span at `opts.input.name` directly, with no
    extraction step at all — a strict widening, provably safe:** every character `invariantCore()`
    contributes to its output is drawn, unmodified, from a subset of `opts.input.name`'s own tokens (its
    two return paths are either `name.trim()` verbatim, or a `core.join(' ')` built only from tokens kept
    unchanged from the original token list, `product-name-core.ts:122-142`) — so for every character `c`,
    `invariantCore(opts.input.name)`'s count of `c` is always ≤ `opts.input.name`'s own count of `c`.
    Widening the reference to the larger, never-smaller quantity can only turn a previously-failing
    candidate into a passing one; it cannot turn a previously-passing candidate into a failing one. Every
    worked example this clause already verifies is unaffected (re-checked directly, below), and all three
    of SPEC_REVIEW v12's traced shapes now pass, because each raw name contains exactly one period —
    counted against the whole string, with no scan to break early. This does not reopen a quantity-count
    concern at this leaf: `doc.localizedName` fills the CTA-heading position specifically
    (`store-render-rules.ts:58,90-106`), and `PRODUCT_NAME_LOCALIZATION`'s own text reserves the
    quantity/count abbreviation (e.g. uk-UA's trailing-period `"шт."`, `constants.ts:824-830`) for body
    prose and the CTA *paragraph*, explicitly carving headings out into "the SHORT brand+model form"
    instead (`constants.ts:801-804`) — a `doc.localizedName` legitimately carrying that abbreviation at
    this leaf would already be an FR-6-shaped "carries more than the short form" defect (Out of scope),
    not a new case this widening must accommodate.

    **Why occurrence-count, not class-membership or positional/substring-containment — checked directly
    against this Story's own evidence, not chosen as the more familiar default (see Background, v13, for
    the full reasoning).** Class-membership is ruled out outright: it contradicts this clause's own
    second worked example below (a period is present in `"Filament Bambu Lab PETG 1.75 mm"` itself, so a
    plain membership test would exempt *any* trailing period for this product — the opposite of the
    stated outcome). Between the two readings that do reconcile both worked examples, occurrence-count is
    chosen because (i) it needs no notion of "position" or "contiguity" defined for a value repair may
    have reordered, which positional-containment would require `so-planner` to invent unguided, and (ii)
    it is the reading that does **not** produce a false positive on a real, evidenced case this Story's
    own corpus already establishes: a uk-UA/ru-UA master where the Task-A model writes a
    Cyrillic-localized unit next to a decimal-bearing designator, per `UNIT_LOCALIZATION_RULES`
    (Background, v11 point 4; Accepted cost, below). For a product whose `opts.input.name` is `"xTool D1
    Pro 5.5W"`, a correctly-localized `doc.localizedName` of `"xTool D1 Pro 5.5 Вт"` contains one period —
    the same count `opts.input.name` contains — so occurrence-count correctly exempts it, **even though
    the unit token's respacing and cyrillization means the candidate no longer contains `opts.input.name`
    as a literal contiguous substring at all.** Under positional/substring-containment, this same,
    correctly-localized value would be judged as containing no exempt occurrence of the banned class
    (there is no contiguous span left to point the exemption at), failing the shape test at `error`
    severity for a value no repair can fix without corrupting the decimal point — the same corruption
    concern FR-13(b)/OD-10 already forecloses. **Occurrence-count therefore deliberately lets a
    Cyrillic-unit designator's punctuation through even when the model has relocated and reshaped the unit
    around it — this is the intended, accepted consequence of the choice, not a gap in it:** the character
    itself is still no more numerous than the source name itself contains, so nothing new is being
    exempted, only the adjacency/contiguity the source name happened to have is not being required to
    survive localization untouched. This has one residual, narrowed — not eliminated — by the
    trailing-position check immediately below (new in v15, closing SPEC_REVIEW v13's blocking finding):
    a candidate that drops a banned character at one position and adds a same-class character at another
    **interior** position (not the candidate's own trailing character, which the check below governs
    separately), holding the total count unchanged, would still pass. This interior-position case is
    accepted, not closed, for the same reason positional-containment (the only mechanism that would close
    it in full) reintroduces the Cyrillic-unit false positive above; see Background, v15, for the full
    trace of why the trailing case is closed and the interior case is not.

    **Trailing-position check — new in v15, closing SPEC_REVIEW v13's blocking finding against the
    reference-span widening's own residual.** SPEC_REVIEW v13 traced a further gap the v14 widening
    opened: because occurrence-count is a whole-string tally, not a same-token-adjacency test, a bare
    short-form candidate can add one wholly unjustified banned character at its own trailing position and
    still pass, whenever the raw source name's own dropped packaging/category tail happens to carry one
    instance of the same character class — precisely the ordinary case for the three shapes v14 exists to
    support. Concretely: for `opts.input.name = "Bambu Lab Hardened Steel Nozzle 0.4 mm"` (one period, in
    `"0.4"`), the candidate `"Bambu Lab Hardened Steel."` — the bare short form plus one added trailing
    period — has a period count of 1, which does not exceed the reference count of 1, so occurrence-count
    alone wrongly exempts it. **v15 adds one further, necessary condition, checked in addition to
    occurrence-count, never in place of it:** when a banned character `c` is the last (trailing,
    non-whitespace) character of the trimmed candidate string, it satisfies the shape requirement only if
    `c` is also the last character of `opts.input.name.trim()` — the raw source name's own trailing
    character, compared literally, character-for-character, with no tokenization. This is a plain
    string-level comparison (`candidate.trim()`'s own last character against `opts.input.name.trim()`'s
    own last character), kept exactly as simple as the occurrence-count check already is — it adds no
    notion of "position" or "span" anywhere except the one string boundary a trailing character can
    occupy. Applied to the counter-example above, `opts.input.name.trim()`'s own last character is `"m"`
    (from `"...0.4 mm"`), not `"."` — so the added trailing period fails this check regardless of its
    occurrence count, and the candidate is correctly rejected. The same holds for the other two shapes
    v14 introduces support for (`"Bambu Lab PLA Basic 1.75mm"`, `"eSUN PLA+ 1.75mm"` — both raw names end
    in a unit letter, never a period), closing the trailing-append vector generally, not only for the one
    worked example. It does **not** reject a legitimate pass-through: the full, unframed name itself
    (`"Bambu Lab Hardened Steel Nozzle 0.4 mm"`, as a `doc.localizedName` candidate) ends in `"m"` —
    matching the raw name's own ending — and its one period sits at an interior position (inside `"0.4"`),
    not the candidate's trailing character, so this check is simply not triggered for it; occurrence-count
    alone continues to govern it, exactly as v14 already established. Nor does it reject the evidenced
    Cyrillic-unit case: `"xTool D1 Pro 5.5 Вт"`'s trailing character is a Cyrillic letter, not a banned
    one, so the check is not triggered there either — the period inside `"5.5"` is interior and continues
    to pass on occurrence-count alone, unaffected. **This check does not close every over-exemption gap —
    only the trailing one, stated honestly as a narrowing, not a full close (see the residual paragraph
    above and Background, v15):** a banned character added at an interior position, not the candidate's
    own trailing character, while the total count is held unchanged, still passes — a positional/adjacency
    test would close this too, but was already ruled out (above) because it reintroduces the Cyrillic-unit
    false positive.

    Illustrative boundary cases, stated here as this Specification's own falsifiable examples, not an
    exhaustive detector (all restated or re-verified against the occurrence-count rule above, counted
    against `opts.input.name` directly per v14's reference-span correction, not merely carried forward
    from v13's text): `"Makera Cyclone Dust Collector"` passes (bare short form, zero banned characters
    either side); `"Makera Cyclone Dust Collector Standard Package"` passes (bare full form — FR-6's gap,
    unaffected); `"Colector de Polvo Makera Cyclone"` passes (a category-first localized rendering, still
    a bare name — the existing `productShort()` over-capture false positive this may still trigger via the
    presence test is FR-7's own already-accepted cost, unaffected by this clause); for the product whose
    `opts.input.name` is `"Filament Bambu Lab PETG 1.75 mm"` (one period), `"Bambu Lab PETG 1.75"` passes
    (candidate's period count, 1, does not exceed the source name's period count, 1); for the same
    product, `"Bambu Lab PETG 1.75."` fails (candidate's period count, 2, exceeds the source name's period
    count, 1 — the second period is added framing, not intrinsic, under the occurrence tally); for the
    product whose `opts.input.name` is `"xTool D1 Pro 5.5W"` (one period), `"xTool D1 Pro 5.5 Вт"` passes
    (candidate's period count, 1, does not exceed the source name's period count, 1 — **exempt under
    occurrence-count even though the candidate is not a contiguous match against the source name at
    all**, see above); a candidate of `"xTool D1 Pro 5.5 Вт..."` for the same product fails (candidate's
    period count, 4, exceeds the source name's period count, 1). **`"Buy the Makera Cyclone Dust Collector
    Now"` and `"Technical specifications for the Makera Cyclone Dust Collector"` are CTA/heading-framed
    text this shape requirement intends to reject, but — corrected in v16 — neither is actually rejected
    by the mechanism above: both contain zero banned characters, so the banned-character/occurrence-count/
    trailing-position mechanism has nothing to test and does not fire on either one.** This is an accepted,
    disclosed residual (see the Accepted-cost discussion below and Background, v16), not a worked example
    of a passing detector. `"Bambu
    Lab PETG 1.75, matte finish"` passes the banned-character test regardless of the exemption (a bare
    comma is excluded from both banned classes outright, per the enumeration above — this clause does not
    newly validate the rest of the appended clause, which the shape requirement's "no additional clause
    beyond what the schema field's own contract asks for" sentence, above, still independently governs).
    **New in v14 — the shape SPEC_REVIEW v12 traced, now closed by the reference-span correction above:**
    for the product whose `opts.input.name` is `"Bambu Lab Hardened Steel Nozzle 0.4 mm"` (one period, in
    `"0.4"` — counted against the whole raw name; `invariantCore(opts.input.name)` alone would have
    stopped scanning at the `"Nozzle"` stopword and never reached it), the candidate `"Bambu Lab Hardened
    Steel Nozzle 0.4 mm"` (the full, unframed name) passes (candidate's period count, 1, does not exceed
    the source name's period count, 1; its trailing character, `"m"`, matches the source name's own
    trailing character, and its one period sits at an interior position, so the trailing-position check is
    not triggered); a candidate of `"Bambu Lab Hardened Steel Nozzle 0.4mm."` (an added trailing period)
    fails (candidate's period count, 2, exceeds the source name's period count, 1 — already fails on
    occurrence-count alone; its trailing period also fails the trailing-position check independently,
    since the source name's own trailing character is `"m"`, not `"."`).
    **New in v15 — the trailing-append shape SPEC_REVIEW v13 traced, now closed by the trailing-position
    check above:** for the same product, the candidate `"Bambu Lab Hardened Steel."` — the bare short
    form with one added trailing period — fails, even though its period count, 1, does not exceed the
    source name's period count, 1 (occurrence-count alone would wrongly exempt it): the period is the
    candidate's own trailing character, and the source name's own trailing character is `"m"`, not `"."`,
    so the trailing-position check rejects it. A candidate of `"Bambu Lab. Hardened Steel"` — the same
    added period relocated to an **interior** position, not the candidate's own trailing character — still
    passes on occurrence-count alone: the narrower, explicitly accepted interior-position residual this
    revision states rather than closes (see above).
    The exact detector implementing this per-character tally and the trailing-position condition is
    `so-planner`'s to design; this Specification states only the counting rule and the additional
    trailing-position condition it must produce, illustrated by these cases.
  - **Repair-instruction requirement.** `heading-brand-core-missing`'s single registered
    `fieldInstruction` (`repair-strategy.ts`) is parameterized by `issue.path`, exactly as
    `RepairStrategy.fieldInstruction`'s existing `(current, issue) => string` signature already allows
    (`repair-strategy.ts:31`) and consistent with — though a new, more specific instance of, not an
    identical repetition of — `heading-product-name-stuffing`'s own registered entry, which already
    establishes that one rule identity can serve two structurally different path shapes
    (`repair-strategy.ts:354-374`: "TWO rungs serving TWO artifact shapes with ONE shared ladder");
    that entry varies its *tier/executor* by path shape, with its `fieldInstruction`'s own returned
    text unchanged across paths, so this FR's `fieldInstruction`-*text*-level dispatch is a new,
    signature-supported extension of that one-rule-two-shapes precedent, not a case already
    demonstrated by it (small wording correction, v12, per SPEC_REVIEW v10's own non-blocking,
    precedent-precision finding — see Background): for the one remaining heading leaf
    (`doc.cta.heading`, as of v16's removal of the first-§3-heading leaf — see the "First-§3-heading
    position" bullet above), the instruction keeps its existing heading-oriented wording ("Rewrite this
    heading..."); for the `doc.localizedName`
    leaf, it instead asks for a bare corrected name, mirroring `slug-name-designator-lost`'s own
    existing wording ("Rewrite this localized product name so it satisfies the constraint below...
    Return ONLY the corrected name..."). This is a requirement, not an optional quality improvement:
    the same `['field-scoped', 'block-scoped']` ladder shape's block-scoped rung already no-ops on a
    `"doc."`-prefixed path in `heading-product-name-stuffing`'s existing, structurally identical entry
    (`repair-strategy.ts:364-370`, "wrong prefix for this executor") — `heading-brand-core-missing`
    inherits the same no-op by using the same ladder shape, not because it has a pre-existing ladder
    note of its own (it does not exist before this Story; corrected wording, v12) — so
    `doc.localizedName`'s only real repair instrument is the single field-scoped call; a
    heading-oriented instruction applied to this leaf would make the new shape requirement fail on
    that one rung near-systematically, landing on `full-regen` far more often than the probabilistic
    cost FR-7's own Accepted-cost paragraph below already accepts for the `productShort()`
    over-capture case — the exact disproportionate-repair-cost outcome AC-6 exists elsewhere in this
    Story to close, not a cost this clause may reintroduce.

  Both requirements are satisfied by parameterizing the single existing `heading-brand-core-missing`
  registry entry by `issue.path` — not by registering a second rule identity (see Background, v11,
  point 2, for why a distinct identity was considered and ruled out as unnecessary).

  `render-description.ts`'s render call is a deterministic function of these validated fields (passed
  through `normalizeDocProse()` first — a pre-existing step in this same ordering that already governs
  `doc.cta.heading`/`doc.functionality[0].heading` today, bounded and reasoned through in Background,
  point 4 of v11 — corrected there from v10's mistaken attribution to post-render `normalizeDocProse`;
  the real, pre-validation exposure (the Task-A model itself writing Cyrillic units into a
  heading-shaped field per `UNIT_LOCALIZATION_RULES`) is a pre-existing characteristic of this check's
  `error` severity since FR-7 first specified it for the CTA-heading leaf, not newly introduced or
  newly risked by adding `doc.localizedName` as a second field checked the same way — as of v16's
  removal of the first-§3-heading leaf, `heading-brand-core-missing` reads two leaves in total
  (`doc.cta.heading`/`doc.localizedName` at the CTA-heading position, schemaVersion-conditional), not
  three), and `getRenderRules(...).ctaHeading()` is confirmed to throw rather than silently
  drop the core for any locale a store's registry does not cover (`store-render-rules.ts:92-101`,
  unaffected by this revision) — so a Doc that passes both Doc-path checks (the schemaVersion-
  conditional `doc.cta.heading`/`doc.localizedName` targets, both at the CTA-heading position) does
  not ship a CTA heading *missing* the brand core, for either `schemaVersion` (the *overlaid-with-
  more-than-the-short-form* direction is FR-6's, not this check's — see Background, point 3, and Out
  of scope). **This guarantee covers the CTA-heading position only** — the first-§3-heading position
  carries no such guarantee as of v16, since no presence check runs against that leaf at all (see the
  "First-§3-heading position" bullet above). The Doc-path form alone is sufficient in-gate enforcement
  of presence for the master, at the CTA-heading position; the HTML/string-path form is not
  additionally required to make that guarantee hold, though it still runs, independently, for every
  translated locale (above). This resolves OD-6 as **mandatory-presence**, not
conditional-correctness: AC-3's own stated purpose is catching a locale that drops the core from
the CTA-heading position entirely (the es-ES/pt-PT regression in the QA report — independently confirmed
against the actual QA artifacts: `expert3d_makera_cyclone_dust_collector_2026-09-21_2147.zip`'s
`description_pt-PT.html` CTA heading drops "Makera" — the brand — entirely, keeping only "Cyclone"),
which only a presence requirement can detect. This also matches `slug-validator.ts`'s own actual
code: `slug-name-designator-lost` fires unconditionally whenever `sourceName` and `item.name` are
both non-empty and `!item.name.includes(core)` — presence is required given those inputs exist, not
merely checked when the core already happens to appear.

**As of v16, this mandatory-presence resolution of OD-6 governs the CTA-heading position only.**
OD-6 answered *whether* presence, once required, is mandatory or merely conditional on the heading
otherwise naming the product — that answer is unchanged. *Which position(s)* mandatory-presence
applies to is a separate, scope-level question this Specification narrows further at v16: the QA
evidence quoted immediately above (the es-ES/pt-PT/en-ES CTA-heading regression) is the only evidence
OD-6's resolution ever cited, and it evidences a defect at the CTA-heading position specifically, not
at the first §3 heading. See the "First-§3-heading position" bullet above and Background, v16, point 2,
for the fixture evidence (a real, human-accepted golden-corpus heading that never named the product)
that this narrowing is built on, and for why this is not a reopening of OD-6 itself.

**Severity is `error`, and `heading-brand-core-missing` is registered in `REPAIR_STRATEGIES` —
matching AC-3's own "caught the same way slug drift already is" literally, superseding v1's
`warning`/unregistered disposition.** `REPAIR_STRATEGIES` gains a registered strategy for
`heading-brand-core-missing` whose ladder mirrors `heading-product-name-stuffing`'s existing entry
(`['field-scoped', 'block-scoped']`, the same dual Doc/HTML-shape handling its sibling/inverse rule
on these same two positions already needs) — the same tiered, cheap-instrument-first shape
`slug-name-designator-lost` gets via FR-11. Because the severity is `error`, not `warning`,
`resolveLadder()`'s own existing behaviour (unchanged by this Story — `repair-strategy.ts`'s
`resolveLadder`) appends `'full-regen'` after the registered strategy's rungs as the ladder's
terminator, exactly as it already does for every other registered error-severity rule; a
`heading-brand-core-missing` finding the cheap rungs can satisfy never reaches it.

**Accepted cost — evidenced, and stated as a bound, not denied.** `productShort()`'s designator
heuristic is documented as *deliberately biased toward over-capturing*
(`product-name-core.ts`'s own doc comment), and this exact product demonstrates a concrete
false-positive source, independently re-verified: `productShort("Makera Cyclone Dust Collector")`
returns the whole string unchanged, because "Dust"/"Collector" are capitalized Latin tokens not
present in `DESCRIPTOR_STOPWORDS` (only `scanner`/`printer`/`engraver`/etc. are listed) — so a
locale that correctly translates the category noun while preserving brand+model (the QA sample's
own es-ES CTA heading, "Colector de Polvo Makera Cyclone") is judged against the full over-captured
string and flagged. On the QA sample this rule as specified would fire on three of the four
generated locales (es-ES, pt-PT, and en-ES, whose CTA heading names the product not at all) and
pass only uk-UA. Because the check is now `error` severity with a *registered* strategy
(`['field-scoped', 'block-scoped']`, `resolveLadder()` appending `'full-regen'` as the terminator
exactly as it already does for every other non-warning registered rule), the cheap rungs are
attempted first and resolve the common case: a field-scoped rewrite that successfully inserts the
exact `productShort()` string at the flagged heading satisfies the check without spending a
full-document regeneration. But this is **not guaranteed to stay a translation-quality-only cost**:
if a false positive's field-scoped (and then block-scoped) rewrite does not converge on a heading
that matches the `productShort()` pattern exactly — plausible when the fix requires injecting an
untranslated English brand+category phrase verbatim into an otherwise fully localized heading, which
the model may resist or malform — the finding persists, `best.errors` stays ≥ 1, and
`repair-gate.ts`'s `while (repairsUsed < opts.maxRepairs)` loop (line 342) spends the run's
full-document-regeneration budget on it exactly as it would for a genuine defect. Unlike FR-2's
`specs-grounding-disabled` case, this burn is **probabilistic, not certain** — a regeneration can in
principle produce a correct heading, whereas no regeneration can ever change `groundingDisabled` —
so no dedicated non-regenerating exclusion (FR-2(b)'s fix) applies here; a false positive is,
correctly, treated as an ordinary repairable error that may cost a full regeneration on the QA
sample's measured ~75% (3-of-4-locale) firing rate. This probabilistic repair-budget cost, alongside
the translation-quality cost when a cheap rung does succeed, is the accepted cost of matching AC-3
literally rather than the weaker disposition v1 chose unilaterally; improving `productShort()`'s
heuristic to reduce the false-positive rate remains out of scope for this Story (see Out of scope)
and is the named follow-up. It is **not** a shipping-blocked cost regardless of outcome:
`heading-brand-core-missing` is not one of FR-3's block conditions, so no export is prevented by it
even when a false positive survives every rung. This accepted cost applies identically whether the
check addresses `doc.cta.heading` (`schemaVersion: '3.0'`) or `doc.localizedName` (`schemaVersion:
'4.0'`, new in v10) — both are plain string leaves matched against the same `productShort()` pattern —
**with one named exception, corrected in v11 (Background, point 4): for uk-UA/ru-UA generations, the
Task-A model may itself write a Cyrillic-unit-bearing value into any of these leaves directly, per
`UNIT_LOCALIZATION_RULES` (`master-system-prompt.ts:81`), before validation ever runs.**
`productNamePattern()` has no Cyrillic-unit awareness, so a correctly-localized, prompt-compliant value
can fail this Latin-built pattern match — an in-gate false positive on this `error`-severity check, not
a new pathway `doc.localizedName` introduces: it is a pre-existing characteristic of
`heading-brand-core-missing` since FR-7 first specified it for the CTA-heading leaf (v4), now simply
also reachable through `doc.localizedName` — the second leaf this check reads, as of v16's removal of
the first-§3-heading leaf (see the "First-§3-heading position" bullet above; through v15 this would
have been a third leaf). This is a different, more consequential risk polarity than
`heading-product-name-stuffing`'s own pre-existing exposure to the identical Latin-pattern/Cyrillic-unit
mismatch: that rule is a *positive* match at `warning` severity, so the same kind of miss there is a
false *negative* (under-flagging, cheap); `heading-brand-core-missing` is a *negative* match at `error`
severity, so the identical miss is a false *positive* (over-flagging, `'unresolved'`-counting,
repair-budget-spending) — not, as v10 stated, "the same risk profile... now simply reachable through
one additional pathway." The registered `['field-scoped', 'block-scoped']`-then-`full-regen` ladder
already covers this false positive at the same bounded, probabilistic cost the `productShort()`
over-capture case above already accepts; this correction changes the stated mechanism and risk framing,
not the accepted disposition.

**This is a different test from the banned-character shape exemption (new in v13, above), and the two
must not be conflated.** The Latin-pattern/Cyrillic-unit mismatch described in this paragraph is
`productNamePattern()`'s *substring-presence* test failing to recognize a cyrillized unit as the same
designator token — an accepted, bounded, probabilistic repair cost, unaffected by this revision. The
banned-character shape exemption (above) is a separate test, against a different failure mode
(sentence/CTA-framing punctuation, not unit-token recognition); v13's occurrence-count rule happens to
also avoid a *second*, independent false positive on the same Cyrillic-unit example (the appended
decimal point no longer being a contiguous match against the source span) but does not change, remove,
or reduce the substring-presence cost this paragraph names — both costs are real, independent, and
separately accepted.

**Accepted residual, new in v16 — the framing/CTA-wording component of `doc.localizedName`'s shape
requirement is disclosed as unclosed, not mechanically enforced.** Two candidate detectors were checked
directly against every one of this FR's own worked examples above and against the evidenced uk-UA
category-first shape (`doc.localizedName = "Сопло Bambu Lab 0,4 мм"`, this Story's own test anchors) —
a core-position rule (locate the located core; fail leading text, pass trailing text) and a
word-count-margin rule — and both were rejected: the core-position rule correctly classifies every
listed worked example but would reject the legitimate category-first shape as leading framing,
reintroducing, on real content, the same class of false positive that already parked task T7 once
(`docs/catalog/US-3.1-pipeline-status.md` §3); the word-count-margin rule under-catches short framings
of the same word count as FR-7's own passing "Standard Package" example. See Background, v16, point 1,
for the full verification of both. **Neither is shipped.** The banned-character/occurrence-count/
trailing-position mechanism above remains the only mechanical detector this Story's registered
`heading-brand-core-missing` check runs for the `doc.localizedName` leaf's shape requirement; a
punctuation-free CTA/sentence-framed value that contains no banned character (e.g. "Buy the [name] Now",
"Technical specifications for the [name]") is **not** rejected by it, and passes today — the same honest
disposition FR-7 already gives the `productShort()` over-capture cost and the interior-position
banned-character residual, extended here to a component of the shape requirement this Story does not
close.

**Failure path:** a locale whose CTA heading omits the `productShort()` form, or
renders a variant that does not match the pattern, is reported, counted toward the artifact's
`'unresolved'` status, and repaired via the field-scoped/block-scoped ladder before any full-regen
is spent; a locale whose CTA heading correctly carries the exact `productShort()` form
is unaffected. A correctly-translated heading that `productShort()`'s known over-capture bias
mis-flags is mechanically repaired at the accepted translation-quality cost described above, not
left as a permanent, unactionable warning — this is the change from v1's disposition. A
`doc.localizedName` candidate that carries punctuation-free CTA/sentence framing and no banned
character passing the shape requirement unrejected (new in v16, see the accepted residual immediately
above) is the disclosed gap this requirement does not close, not a defect of this requirement's own
stated mechanism. **As of v10:**
a Doc-path CTA-heading check that reads `doc.cta.heading` for a `schemaVersion: '4.0'` Doc (a dead
field on that path — see Background, v9/v10), or that omits checking `doc.localizedName` for a
`schemaVersion: '4.0'` Doc's CTA position, is a defect of this requirement,
not a stricter-or-looser-than-required implementation of it; the HTML/string-path check firing (or
correctly not firing) at the CTA position, for every translated locale and, where reached, the
plain-HTML master, is unaffected and must continue exactly as v8 already required. **As of v16
(supersedes the v10 clause immediately above, which through v15 also named
`doc.functionality[0].heading`):** a check that fires against `doc.functionality[0].heading` for
either `schemaVersion` is now an over-broad implementation of this requirement, not a correct one — see
the "First-§3-heading position" bullet above and Background, v16, point 2. **As of v11:** a
`doc.localizedName` repair that returns heading- or CTA-sentence-framed text — even when it contains
the `productShort()` substring — is not treated as resolving the finding; a check that accepts such a
repair as satisfying `heading-brand-core-missing` is a defect of this requirement, not a
stricter-or-looser-than-required implementation of it. See the shape requirement above and the failure
path below for the concrete boundary. **As of v15:** a candidate whose own trailing (last,
non-whitespace) character is a banned character that does not match `opts.input.name.trim()`'s own
trailing character fails the shape requirement even when occurrence-count alone would exempt it; a
check that omits this trailing-position condition, applying occurrence-count alone, is a defect of this
requirement, not a looser-than-required implementation of it.

**New in v11 — a repair that produces heading- or CTA-framed text is not treated as resolving the
`doc.localizedName` finding, even when it contains the `productShort()` substring.** Reusing this
Story's own established vocabulary (FR-2(b)'s "never reported `'clean'` or `'repaired'`"; FR-4's "never
relabeled as verified"): a `doc.localizedName` repair that still fails the shape requirement above on
re-validation is not resolved by that attempt — the finding persists, the run is counted toward
`'unresolved'` status exactly as for any other unresolved `heading-brand-core-missing` finding, and the
ladder proceeds normally to its next rung (block-scoped — a documented no-op for this leaf, per
Background v11 point 3 — then `full-regen` as the terminator), the same disposition FR-7's own
Accepted-cost paragraph already applies when a `productShort()` false positive does not converge on the
cheap rungs. This is deliberately **not** the `NON_REGENERABLE_RULES` exclusion FR-2(b) applies to
`specs-grounding-disabled`: that exclusion exists because no repair instrument, full-document
regeneration included, can ever change whether the specs-translation call succeeded; here, by contrast,
a full-document regeneration genuinely can produce a correctly name-shaped `doc.localizedName`, so
excluding this finding from repair-budget spending would incorrectly treat a fixable defect as
unfixable. A `doc.localizedName` repair that is silently accepted as resolving the finding while still
failing the shape requirement is the regression this clause exists to close.

> **v10 — Doc-path CTA-heading check retargeted to `doc.localizedName` for `schemaVersion: '4.0'`
> Docs, in place of v9's "the HTML/string-path covers it" claim, which SPEC_REVIEW v8 found false for
> the Doc-pipeline master.** v9 scoped the Doc-path CTA check away from `schemaVersion: '4.0'` Docs
> (correctly — `doc.cta.heading` is dead on that path) but then asserted the HTML/string-path check
> supplies equivalent enforcement "for every `schemaVersion`" — which does not hold for the master,
> because `runDocGate()` never runs that check in-gate at all (see Background). v10 does not restore
> a check against the dead `doc.cta.heading` field, and does not retarget the Doc-path check to
> `getRenderRules(...).ctaHeading()`'s own **return value** either — that alternative was considered
> and is still rejected, for the same reason v9 gave: the function is correct by construction for
> every locale a store's registry covers (it substitutes its argument verbatim and throws rather than
> silently degrading otherwise, `store-render-rules.ts:92-101`), so checking its output would only
> confirm what its own code already guarantees. Instead, v10 checks that function's **input** —
> `doc.localizedName` — which is not correct by construction (it is a plain model-authored field,
> never previously validated against the brand core; see Background, point 3) and is already reachable,
> pre-render, by the same in-gate closure and the same field-scoped repair machinery the other
> Doc-path checks use. This is a Specification-level judgment, not a new Open Decision — OD-6 already
> settled that presence is mandatory by design; this decision is only about which field, for which
> `schemaVersion`, that presence check reads, and that the check must actually run inside the gate
> that can repair it, both of which follow from already-committed code (`render-description.ts`'s
> `isV4` branch, `runDocGate()`'s render-after-validate ordering) rather than from Owner judgment. If
> `getRenderRules(...).ctaHeading()`'s own construction ever changes to accept a caller-supplied string
> rather than assembling one from a fixed per-locale template and a name argument, this decision should
> be revisited rather than treated as permanently settled. Flagged here for visibility at
> `HUMAN_SPEC_APPROVAL`, not as a blocker.

> **v11 — the `doc.localizedName` check gains a shape requirement (bare name, not heading-framed
> text) and its shared `fieldInstruction` is parameterized by path, closing SPEC_REVIEW v9's blocking
> finding against v10's presence-only text.** v10 established the leaf is addressable by the existing
> generic path-walker but left the repaired value's required shape unstated — `REPAIR_STRATEGIES` is
> keyed by rule name only, so `heading-brand-core-missing`'s one instruction, written for a heading,
> could return heading-framed text that still passed a bare presence test. v11 does not split
> `heading-brand-core-missing` into a separate rule for this leaf (considered — see Background, point
> 2 — and ruled out as unneeded design surface): `heading-product-name-stuffing`'s own existing entry
> already establishes that one rule identity may dispatch different behaviour by path shape, and
> `RepairStrategy.fieldInstruction`'s existing signature already carries `issue.path`. Instead, the
> validation test and the repair instruction are both parameterized by path within the single existing
> entry: the two heading leaves (as of v11 — narrowed to the one remaining heading leaf,
> `doc.cta.heading`, at v16; see the "First-§3-heading position" bullet above) keep their existing
> substring-presence test and heading-oriented wording; `doc.localizedName` gains a shape test (bare
> name, no sentence/CTA framing) and a
> name-oriented repair instruction, mirroring `slug-name-designator-lost`'s. Flagged here for
> visibility at `HUMAN_SPEC_APPROVAL`, not as a blocker.

> **v16 — `heading-brand-core-missing`'s mandatory-presence scope is narrowed to the CTA-heading
> position only, and the shape requirement's framing/CTA-wording component is accepted as a disclosed,
> unclosed residual rather than closed by either candidate detector checked.** Through v15, the
> first-§3-heading leaf (`doc.functionality[0].heading`) ran the identical mandatory-presence check as
> the CTA-heading leaf; Impact Analysis v3 independently re-confirmed, by direct fixture read, that this
> fires against real, human-accepted golden-corpus content that never named the product at that position
> at all, with no corresponding QA-evidenced regression there (the QA report's own brand-core finding
> names only the CTA heading). v16 removes the first-§3-heading leaf from this check; OD-6's own
> mandatory-presence-vs-conditional-correctness answer is unchanged, and still governs the CTA-heading
> position exactly as v4-v15 established — only *which leaf(ves)* it applies to narrows, the same
> category of Specification-level scope decision already made at v9/v10 for the `schemaVersion`-
> conditional CTA field. Separately, a core-position rule and a word-count-margin rule were both checked
> directly against this FR's own worked examples and against a real, evidenced uk-UA category-first shape
> and both rejected (see the "Accepted residual" note above and Background, v16, point 1) — the
> punctuation-free CTA/sentence-framing component of `doc.localizedName`'s shape requirement is therefore
> left as an accepted, disclosed gap this Story's registered check does not mechanically close. Neither
> change is a new Open Decision — both are decided directly from this codebase's own fixtures, the QA
> report's own evidenced defect list, and this Story's own test anchors. Flagged here for visibility at
> `HUMAN_SPEC_APPROVAL`, not as a blocker; if the Owner would prefer to accept the first-§3-heading cost
> instead of scoping it out, or to accept the core-position rule's category-first cost instead of leaving
> the framing detector unclosed, that is a correction to make at this gate.

> **OD-4 resolution (file placement for FR-8/FR-9).** `output-validator.ts` is FROZEN and out of
> scope. Both new checks belong in a new sibling validation module —
> `src/utils/seo-metadata-shape.ts` — following this codebase's existing precedent of
> single-purpose sibling validators composed alongside `output-validator.ts`'s own checks at each
> call site rather than added inside it (`heading-style.ts`, `slug-validator.ts`, and especially
> `product-name-consistency.ts`, which already validates `SeoResponse`/`SlugResponse` shape post-hoc
> for the adjacent H1/name-consistency concern, are the same pattern). The new module's exported
> check(s) are composed into the existing `seo_data` validation call sites — the Task B repair-gate
> loop and the post-hoc `runOutputValidation` pass in `content-orchestrator.service.ts` — alongside
> the existing `validateSeoMetadata(json, NO_CURRENCY_CHECK)` call, so a violation is caught during
> the Task B repair loop, not only reported after the artifact ships.

### FR-8: `meta_title` follows the single approved template, with no site suffix — except for the `h1Len ≥ 54` case, which follows a different, deterministic shape instead (FR-8(b))

**(a) The normal-case template shape, when an `h1`-anchored, template-shaped value can fit the
untouched ceiling at all (`h1Len ≤ 53` — see (b) for the boundary and the `h1Len ≥ 54` regime it
governs instead).** A new validation check, `meta-title-template-shape`, `severity: 'error'`, addressed by `path`
(`seo_data[i].meta_title`, the same addressing `meta-title-length` already uses), fails the
artifact when, for any locale's `seo_data` entry, `meta_title` carries a `| {site_name}` (or
equivalent site-suffix) segment, or its shape otherwise diverges from the approved template
`{Product Name} - {Localized Category} {Spec}` (`Knowledge/Issues/First_Batch/meta-titles.txt`) —
including a `meta_title` that mid-word truncates the product name. The check applies identically
across every locale generated for the store, not only the locales the QA report sampled. This check
is additive: it does not replace or weaken `output-validator.ts`'s existing, FROZEN
`meta-title-length` (≤ 55 chars) check — a `meta_title` built to this template must still satisfy
that pre-existing ceiling (AGENTS.md §4, quoted below). `error` severity matches the mechanical,
low-ambiguity nature of the check (a literal forbidden-suffix pattern and an explicit template
shape, not a name-matching heuristic) and AC-4's own "fails the artifact" wording.

**This check's expected firing rate has changed since v4, now that OD-7 is resolved and FR-13(c)
reconciles the budget table — corrected here rather than left as v4's now-stale "fires regularly"
claim, independently re-derived rather than re-asserted.** `Knowledge/Issues/First_Batch/meta-
titles.txt`'s own approved-template reference `meta_title`s, independently character-counted
directly from the strings themselves (not the source document's own "Длина" summary column, which
under-counts three of the four rows by one character): en-ES **50**, es-ES **53**, pt-PT **49**,
uk-UA **47** characters. Compared against FR-13(c)'s reconciled per-locale Title budgets (≤54 for
en-GB/en-US/en-ES, es-ES/es-MX, pl-PL, uk-UA/ru-UA and "(any other locale)"; ≤51 for de-DE — see
FR-13(c) for the derivation of each): all four sampled locale-shapes now fit within budget at the
normal-case rung (en-ES 50<54, es-ES 53<54, pt-PT 49<54, uk-UA 47<54), unlike v4's ≤48 table under
which three of the four exceeded it. **For the QA sample's locale-shapes, this check is now
expected to fire rarely at the template-shape axis specifically** — the degradation cascade should
reach the normal-case, template-shaped rung on ordinary generations for these locales. It remains a
**necessary correctness backstop for locales within (a)'s own domain (`h1Len ≤ 53`), not a rare edge
case to leave unregistered on optimism**, because the budget's own margin against
`output-validator.ts`'s untouched 55-char ceiling is now thin (1 character for the general-row
budgets, 4 for de-DE — see FR-13(c)) — a template-shaped title that is technically within this
check's shape rules but miscounted by the model can cross 55 and trip the FROZEN
`meta-title-length` check instead, which this check does not substitute for; and that check's own
deterministic repair tier (`truncateAtWordBoundary()`/`cutOnWordBoundary()`) is not guaranteed to
land back inside this check's own template-shape rule either — see FR-13(c)'s honest,
partial-mitigation framing of that specific interaction. This check's `error` severity with no
registered repair strategy (see Out of scope) remains correct, within (a)'s domain, because the
residual firing this thinned-margin case still expects has no cheap repair path guaranteed by
construction: a title that cannot be both template-shaped and within the untouched ceiling cannot
always be field-repaired into satisfying both at once. **A product whose name or localized-category
term runs longer than the QA sample no longer degrades past the normal-case rung and fails this
check** — as it did under this Specification's own framing through v17 — **once `h1Len` reaches 54:
FR-8(b) below gives that regime its own required, always-reachable shape instead, superseding the
"accepted, inherent long-name residual" framing `OD-8` previously used for it** (see FR-8(b) and Open
questions).

**The existing `meta-title-length` repair strategy must stop instructing the model to keep a site
suffix.** Independently verified: `REPAIR_STRATEGIES`'s already-registered `meta-title-length` entry
(`repair-strategy.ts`) instructs its field-scoped rung to "Keep the product name and the store
suffix after ' | ' if one is present," and its deterministic rung, `truncateAtWordBoundary()`, has
dedicated logic that preserves a trailing `" | Suffix"` segment when cutting a too-long title. Left
unchanged, this is a live conflict with FR-8: if a `meta_title` both carries a `| {site_name}`
suffix (an FR-8 violation) and exceeds the character limit (a separate, `meta-title-length`
violation) in the same repair pass, `meta-title-length`'s own registered, ladder-eligible repair
would instruct the model to preserve the very suffix FR-8 exists to remove — one registered rule
actively reintroducing another rule's violation on the same field. `meta-title-length`'s
suffix-preservation wording (both the `fieldInstruction` text and `truncateAtWordBoundary()`'s
`" | "`-preserving branch) is updated so it no longer treats a trailing site-suffix segment as
something to keep — consistent with FR-8's template, under which no correctly-shaped `meta_title`
ever contains one to preserve.

**Failure path (a):** a `| {site_name}` suffix present, a template-shape divergence, or a mid-word
truncation of the product name, each independently fails the artifact, for an entry within (a)'s own
domain (`h1Len ≤ 53`). A `meta_title` that is simultaneously too long and suffix-bearing, repaired by
`meta-title-length`'s ladder into a shorter string that still carries the suffix, is the specific
regression this clause exists to close.

**(b) The `h1Len ≥ 54` case: no `h1`-anchored value can ever satisfy both the template and the
untouched ceiling, so a different, deterministic shape is required instead — not a degrade-and-accept
residual.** *(New in v18 — see Background, v18, for the loop-back this clause closes.)*

For any locale whose `h1`, measured the same way `output-validator.ts`'s own character-length check
measures it (Unicode code points), is **54 characters or longer**, `meta_title` does not follow (a)'s
template shape, and is not required or expected to: no value that begins with `h1` verbatim and
remains recognizably anchored to it — (a)'s template shape, or any other shape built the same way —
can ever satisfy `output-validator.ts`'s untouched, FROZEN `meta-title-length` ceiling (≤ 55
characters). This is not an estimate; it is the exact arithmetic boundary of the shape (a) already
requires: the shortest possible `h1`-anchored continuation is two further characters (a separator plus
one non-whitespace character), so the boundary is `h1Len + 2 ≤ 55` — `h1Len ≤ 53` is where (a)'s
shape remains achievable, and `h1Len ≥ 54` is where it is not, for every locale, independent of that
locale's own `{Localized Category}`/`{Spec}` content. **The threshold is `h1Len ≥ 54`, not `h1Len ≥
55`:** a narrower `h1Len ≥ 55` threshold leaves `h1Len = 54` covered by neither (a)'s shape (already
unreachable at that length) nor this clause (not yet active under the narrower form) — an uncovered
gap a prior iteration of this design found and closed; `h1Len ≥ 54` is required for every `h1Len` to
fall into exactly one of the two regimes, with none left uncovered.

For every entry in this regime, `meta_title` must instead be a value with all of the following
properties:

- it begins with a genuine, unmodified prefix of that locale's own `h1` — never an interior edit,
  interior deletion, or paraphrase of any part of `h1` (the specific data-integrity defect a real
  2026-09-28 regeneration shipped: an entire interior phrase of `h1` silently deleted rather than the
  string honestly truncated);
- that prefix is cut at a word boundary whenever `h1` has one within its first 50 code points.
  **Accepted, narrow fallback:** only when no such boundary exists at all within that span (an
  unrealistically long single token, or a span whose only candidate boundary is a position the prefix's
  own trailing-punctuation handling strips away entirely) may the prefix instead be a hard clip that
  cuts mid-word — a real but cosmetic residual this Specification accepts rather than requires closed,
  not a license to cut mid-word whenever a word boundary is merely inconvenient;
- it is immediately followed by exactly one differentiation-mark character and no other content, so
  the result is never byte-identical to `h1` — FR-9's own independent check is satisfied by
  construction for this shape, not merely by coincidence;
- its total length — prefix plus the differentiation mark — is **at most 50 Unicode code points**,
  comfortably under every locale's FR-13(c) budget (≤54 general, ≤51 de-DE) and the FROZEN
  55-character ceiling, with room to spare rather than sitting at either boundary, however long `h1`
  itself is;
- it is a deterministic function of `h1` alone: the same `h1` value always produces the same,
  byte-identical `meta_title`, applied identically regardless of what any model-authored cascade
  attempt for that entry produced, and applied unconditionally, before the artifact is ever validated
  — never left to the model, a repair attempt, or chance to arrive at.

This value does **not** carry, and is not required to carry, `{Localized Category}` or `{Spec}`: those
components are what (a)'s template requires when an `h1`-anchored template shape is achievable at all;
for `h1Len ≥ 54` no shape carrying them and remaining `h1`-anchored can fit the ceiling, so this
clause's different, always-achievable shape governs instead. `meta-title-template-shape` accepts this
shape, and only this shape, for an `h1Len ≥ 54` entry.

**This clause supersedes, for this sub-case only, this Specification's own prior framing of the
long-`h1` case (FR-8/OD-8, Background v5 through v17): a long-enough `h1` is no longer an accepted,
undesigned-around residual that the cascade "must degrade for... by design," paid for with a
full-document regeneration when this check fires. It is instead a defined, reachable,
validator-required regime of its own, satisfiable for every `h1Len`, however long — including the real
es-ES/pt-PT/uk-UA values (66/60/69 code points) a real 2026-09-28 regeneration produced — with no
dependency on the repair ladder.** The other half of `OD-8`'s original disposition — the thinned
margin `FR-13(c)` accepts for `h1Len ≤ 53`, where a template-shaped title can still cross the untouched
ceiling through the model's own miscounting and land, probabilistically, on either a cheap or an
expensive repair path — is a different mechanism this clause does not touch; see FR-13(c), unaffected,
and Open questions below for how `OD-8`'s own recorded disposition is affected by this clause.

**Failure path (b):** for an `h1Len ≥ 54` entry, any `meta_title` missing one or more of the properties
listed above fails the artifact under `meta-title-template-shape` — including a value that appears to
follow (a)'s template shape (unreachable, by construction, at this `h1` length, so such a value is
either miscounted or was produced by a path this clause does not authorize for this regime), an
unmarked bare prefix of `h1` with no differentiation mark, a value carrying more than 50 code points
in total, a value with any interior edit or deletion of `h1`, a mid-word cut where a word boundary was
available within the first 50 code points of `h1` (as distinct from the narrow, accepted no-boundary
fallback above), or a value that is not byte-identical to what the same `h1` deterministically
produces elsewhere in the artifact. This clause requires the entry's `meta_title` to be exactly the
required value on every validation pass, not merely on the first one — a value that satisfied this
clause before a later repair pass and no longer does after it is the same regression this clause
exists to close, not a different one.

### FR-9: `h1` and `meta_title` are never byte-identical

A new validation check, `meta-title-h1-identical`, `severity: 'error'`, addressed by `path`
(`seo_data[i].meta_title`), fails the artifact when, for the same locale's `seo_data` entry, `h1`
and `meta_title` are byte-identical strings. This is independent of FR-8 — even a `meta_title` that
otherwise satisfies FR-8's template must still differ from `h1` for that same entry. `error`
severity matches AC-5's own "fails the artifact" wording and the mechanical nature of a
byte-equality check.

**Failure path:** a byte-identical `h1`/`meta_title` pair for one locale entry fails; entries where
they differ (the ordinary case, and the expected effect of FR-8 removing the site suffix that used
to be the only differentiator in the degraded case) are unaffected.

### FR-10: `doc-schema` gets a targeted, actually-reachable repair-ladder entry

Two conditions, both independently re-verified as currently unmet, must both hold for a
`doc-schema` finding to be repairable through the tiered ladder rather than falling through to
full-regen:

**(a) Path addressability.** When the model's raw response parsed as JSON but failed a specific
Zod field-level check (e.g. a required string field that came back empty — the Story's own example),
the resulting `ValidationIssue` carries a `path` identifying that field, expressed in
`repair-strategy.ts`'s own addressing grammar (the `"doc.<hops>"` convention
`doc.functionality[0].heading` and its siblings already use), not only folded into the
human-readable `detail` string as `doc-schema-issues.ts`'s `docSchemaIssues()` does today
(confirmed: the zod path is computed at line 120 but used solely to build `detail`, never assigned
to the issue's `path` field). A `doc-schema` finding whose only failure is that the response never
parsed as JSON at all (no field-level path exists to name) is unaffected by this clause and
continues to carry no `path`, falling through to full-regen exactly as today.

**(b) A value to repair.** The field's last-known value — the raw, schema-invalid candidate object
the model actually returned — remains available to the field-scoped rung, so it has something to
read and rewrite via the existing path-addressing mechanism, rather than being discarded as it is
today: independently re-verified that `produceTaskADoc()`'s catch block returns `{ doc: null,
issues }` on a schema-validation failure even when a parsed `candidate` object exists in scope
(`content-orchestrator.service.ts` lines 417-442), so `runDocGate()`'s `validate()` closure
(line 512-513: `if (!attempt.doc) return attempt.issues;`) has no Doc object at all to apply a
field-scoped `setAtPath` repair to today, independent of whether a `path` is set. This preserved
candidate is used **only** as the field-scoped rung's input/output value — it is never treated as a
Doc that passed validation: it is not run through the Doc-path's full validator suite (the
`validate()` closure's own `if (!attempt.doc)` branch stays the gate for that), not rendered, and
not shipped as the artifact unless and until a later attempt — the field-scoped repair's own output,
or a full-document regeneration — actually satisfies the schema and re-validates cleanly.

`REPAIR_STRATEGIES` gains a registered strategy for the `doc-schema` rule whose ladder is not the
implicit `['full-regen']` fallback. A `doc-schema` finding meeting both (a) and (b) is repaired
without a full-document regeneration; a `doc-schema` finding failing either condition — no JSON at
all, or a field-level failure whose path cannot be resolved — still falls through to full-regen
exactly as every registered strategy already does for an error-severity issue with no usable
`path`.

**Failure path:** a `doc-schema` repair that still costs a full-document regeneration despite
meeting both (a) and (b) is the defect AC-6 exists to close (the QA report's own repair log: two
full-regen attempts for one field). A genuinely unparseable response (condition (a) never met)
correctly falling through to full-regen is not a failure of this requirement.

### FR-11: `slug-name-designator-lost` gets a targeted repair-ladder entry

`REPAIR_STRATEGIES` gains a registered strategy for the `slug-name-designator-lost` rule
(`slug-validator.ts`), addressed at its existing `slugs[i].name` path (independently re-verified
present at `slug-validator.ts` lines 75 and 88), whose ladder is not the implicit `['full-regen']`
fallback. A `slug-name-designator-lost` finding is repaired by rewriting the single affected
`slugs[i].name` field rather than regenerating the whole artifact, the same shape of improvement
`slug-charset`'s existing entry already gets on the same `SlugResponse` artifact.

**Failure path:** as FR-10, for `slug-name-designator-lost`.

### FR-12: The `[HEADING FORM]` prompt text states its two-heading exception in terms that hold even when `productShort()` equals the full name

`master-system-prompt.ts`'s `[HEADING FORM]` block (the cached system-block text shared by every
Task A call, HTML and Doc alike — inherited unchanged by the Doc path per `task-a-doc.ts`'s own
"every `[CONTENT STRUCTURE]` rule ... still applies" contract) and `task-a.ts`'s own one-line
restatement of it are independently re-read in full for this revision, not assumed stale from the
Story's own description. `[HEADING FORM]`'s existing text (lines 127-136) already states the
two-blessed-position exception correctly for a product whose `productShort()` form **drops**
something (a configuration code or packaging suffix): "THE FULL PRODUCT NAME IS FORBIDDEN IN EVERY
HEADING. A heading never contains a configuration code or a package/bundle/kit suffix" is
immediately followed by "AT MOST TWO `<h2>` ... may contain `[Product-short]`: the FIRST §3 heading
and the §9 commercial-closing heading." Neither sentence states — and `task-a.ts:153`'s own
restatement ("follow `[HEADING FORM]`, which forbids the full name outright") actively contradicts
by omission — that this exception holds **unchanged** when `productShort(name) === name`: the
degenerate case where there is no configuration code or packaging suffix to drop, so
`[Product-short]` and "the full product name" are the same string (independently re-verified this
is exactly the QA sample's own case — `productShort("Makera Cyclone Dust Collector")` returns the
whole name unchanged; see FR-7). Read literally today, a model applying "forbids the full name
outright" with no stated carve-out for this case has no textual basis to keep `[Product-short]` at
the two blessed positions when it happens to equal the full name — which is the prompt-side
contributor to the es-ES/pt-PT regression the Story's own Context describes (the model, or a repair
attempt working from this text, drops the core to satisfy an apparent "forbids the full name"
absolute). This Story's D3 authorization edits `master-system-prompt.ts`'s `[HEADING FORM]` block
and `task-a.ts`'s restatement of it so that the two-heading exception is stated in terms that hold
in this degenerate case as plainly as it already holds in the configuration-code-bearing case —
without altering `[HEADING FORM]`'s scope, its "at most two" ceiling, or any rule this Story does
not otherwise touch (Out of scope).

**Failure path:** prompt text that, read literally, instructs the model to omit `[Product-short]`
from the CTA heading or the first §3 heading whenever it equals the full name is the prompt-side
contributing cause of the es-ES/pt-PT-shaped regression FR-7 exists to catch and repair — leaving
this contradiction in place while fixing only the validator side (FR-6/FR-7) means the model (or a
repair attempt) keeps producing content FR-7's now-`error`-severity check then has to repair via the
ladder on every affected generation, rather than the model producing the correct heading the first
time. Prompt text that states the exception in terms already independent of whether
`productShort(name) === name` needs no further edit under this FR.

### FR-13: `task-b.ts`'s SEO-metadata prompt defines and produces the approved template's actual components, drops the suffix (including the still-live line-47 mandate), reconciles the per-locale Title budget, and can never fall back to an `h1`-identical `meta_title`

SPEC_REVIEW v2 found this FR (as v2 stated it) too narrow on two independent points, addressed in
v3. SPEC_REVIEW v3 then found two further gaps in v3's own fix — one inside (b) (an unaddressed
second collision path), one inside (c) (an authorization-boundary problem, not a narrowness
problem). v4 fixed (b) and correctly deferred (c) to a new Open Decision (OD-7) rather than
guessing at an authorization it did not have. The Owner then granted OD-7
(`docs/decisions/US-3.1-open-decisions.md#3`); v6 stated (c)'s actual reconciled numbers and the
accepted tradeoff (OD-8) that verifying OD-7 surfaced, in place of v4's two-branch conditional.
**PLAN_REVIEW v1 then found that (a) and (b), as v6 stated them, cannot be implemented without
editing `task-b.ts` lines no recorded §9 authorization names — the same authorization-boundary
problem (c) had before OD-7, recurring one clause over — and that a second, previously-unenumerated
defect in the same block (line 47's still-live "KEEP suffix" instruction) has never been named by any
version of this FR.** v7 gave that defect its own clause, (d), and stated (a), (b) and (d) as
contingent on a new, pending Owner authorization rather than either silently assuming it or silently
narrowing the requirement to avoid needing it — see the Background's v7 paragraph for why narrowing
was checked and ruled out. **The Owner has now granted that authorization as OD-9**
(`docs/decisions/US-3.1-open-decisions.md#4`), independently verified by so-clarifier to cover
everything (a), (b) and (d) need, with no gap. **v8 finalizes (a), (b) and (d) below as concrete,
unblocked requirements**, and additionally resolves the non-blocking **OD-10** residual so-clarifier's
own verification of OD-9 surfaced — see the Background's v8 paragraph and (b) below. All of (a)-(d)
are re-verified against the live `task-b.ts` text and against
`Knowledge/Issues/First_Batch/meta-titles.txt` rather than assumed from either artifact's prose:

**(a) The cascade must define and produce AC-4's actual template components, not an undefined
placeholder.** `task-b.ts`'s `TASK_B_INSTRUCTION` degradation cascade (lines 45-49) is built
around `[Benefit]`, a free-form placeholder with no defined content — not `{Localized Category}`
and `{Spec}`, the two structured components AC-4's approved template
(`{Product Name} - {Localized Category} {Spec}`, `Knowledge/Issues/First_Batch/meta-titles.txt`)
actually requires. Removing only the mandatory-suffix instruction (as v2's FR-13 required) leaves
`[Benefit]` undefined and leaves `buildPromptB()`'s `userContent` (lines 128-132) supplying no
structured category or spec data for the model to build either component from — so the prompt
still cannot "produce the template directly" no matter how the suffix instruction reads. This
clause requires: the cascade's normal-case step names `[Localized Category]` and `[Spec]`
explicitly, in place of `[Benefit]`, matching AC-4's template shape verbatim — a genuinely
localized generic-category term for the product (e.g. "Colector de Polvo" for es-ES, matching
`meta-titles.txt`'s own worked examples) and the key differentiating technical spec (e.g. "6 L"),
not a free-form marketing "benefit"; and the prompt payload (`buildPromptB()`'s `userContent` or an
added input to it) carries whatever source data the model needs to derive these two components for
each requested locale. Which specific data path carries that source information (an existing
`[CONTEXT]` substring already partially available today, a new structured field, or something else)
is an implementation decision for `so-planner`, not stated here — this Specification requires only
that the components exist as named, defined slots in the prompt text and that the model is given
what it needs to fill them, consistent with this repository's per-request-data-in-`userContent`
convention (see NFR-1).

**Authorization status — granted, under OD-9.** Satisfying (a) requires editing cascade step 1
(line 46, where `[Benefit]` is replaced) and, whichever data path `so-planner` chooses,
`buildPromptB()`'s own code (lines 112-140 — it is the only function in `task-b.ts` that constructs
`userContent`, so no data route into the prompt avoids it). The Owner's OD-9 resolution
(`docs/decisions/US-3.1-open-decisions.md#4`) explicitly names line 46 and the whole 112-140
`buildPromptB()` span, and explicitly states "introducing the `{Localized Category}` and `{Spec}`
components per AC-4/AC-5" as part of the grant — independently re-verified this round against the
live file (the block header at line 39, the function boundaries at 112/140) to confirm the cited
ranges match the file's actual section boundaries. (a) is no longer contingent on anything this
Specification does not already have.

**(b) No rung of the cascade — including its terminal overflow rule — may produce a `meta_title`
identical to `h1`.** Independently re-confirmed, and independently re-verified this round as
**two separate cascade lines, not one**: the named "LAST RESORT" rung — step 3, bare `[H1 core]`,
no suffix, no benefit (`task-b.ts` line 48) — is not hypothetical; Anchor 3 (line 98) already
demonstrates it firing, and its `step 3 result` (line 98) is byte-identical to its own `H1` (line
96): `"Bambu Lab PETG Translucent Orange 1.75mm 1kg"`. **A second, textually distinct line — line
49, "H1 core is NEVER truncated mid-word. If bare core itself exceeds budget, return it
unchanged." — is an independent path to the same collision**, reached whenever even the
most-degraded rung still exceeds the per-locale budget. SPEC_REVIEW v3 found this line unaddressed
by v3's own FR-13(b), which cited line 48 by name and enumerated every anchor line but never named
line 49 — the same shape of gap this FR was written to close in v2, recurring one line over. Both
lines produce exactly the state FR-9's `meta-title-h1-identical` check exists to fail, and both
collide directly with FR-9's new hard gate if left in place.

**The requirement is stated directly, not in v3's softer "retains at least a minimal marker"
language** (which SPEC_REVIEW v3 correctly flagged as not independently testable — there is no
stated minimum for what counts as a "marker"): no rung of the cascade, including the line-49
terminal overflow rule, may return the bare H1 core unmodified as the final `meta_title` value.
Line 49's mid-word-truncation prohibition itself (its first clause, "H1 core is NEVER truncated
mid-word") is unchanged by this Story — only the "return it unchanged" fallback for an
over-budget bare core is revised, to something that is never byte-identical to `h1` while still
never truncating the H1 core mid-word.

**New in v8 — the bounded ceiling collision this differentiation fix can itself cause is a named,
accepted residual (OD-10, `docs/decisions/US-3.1-open-decisions.md#4`), not something this clause
requires closing.** so-clarifier's own verification of OD-9 found that appending a differentiation
marker (any string of length `m ≥ 1` added to the bare core) can push an H1 core that today passes
`output-validator.ts`'s untouched, FROZEN `MAX_META_TITLE = 55` check into newly failing it — for a
precisely bounded set of H1-core lengths: exactly 55 characters for the general-row locales (budget
≤54 per FR-13(c)), and 52-55 characters for de-DE (budget ≤51), the width of the de-DE band growing
with `m`. A length-neutral alternative (substituting a character already present in the bare core
instead of appending one) was checked and ruled out, not silently avoided: `task-b.ts` line 40
requires `meta_title` to "begin with the H1 core verbatim (character-for-character)" at every
cascade step, including the terminal rung; a substitution breaks that guarantee outright (the
resulting string no longer contains the H1 core intact) and corrupts the actual product name in a
customer-facing field — a correctness regression, not a stylistic alternative. A substituted core is
also no closer to satisfying FR-8's `meta-title-template-shape` check than an appended one: neither
contains `{Localized Category}`/`{Spec}`, so both already diverge from the approved template shape
and already land on FR-8's unregistered, `full-regen`-only path exactly as today's unmarked terminal
rung does (see FR-8, Out of scope) — substitution buys no escape from that pre-existing cost, it only
adds the corrupted-name defect on top of it. **This Specification therefore requires an appended
marker, not a substitution**, and accepts OD-10's precisely bounded ceiling-collision cost as a
named residual, the same disposition FR-13(c) already uses for OD-8's own margin-thinning residual.
The exact marker text is a prompt-authoring decision for `so-planner`/the implementer, not specified
here — this FR requires only the outcome: never byte-identical to `h1`, never a mid-word truncation
of the H1 core, and the H1 core retained verbatim as the string's prefix (per line 40, unchanged by
this Story).

**Corrected in v19 (SPEC_REVIEW v17's blocking finding): the band stated above is the pre-`FR-8(b)`
band and is no longer the live collision surface.** `FR-8(b)` (above) now computes and unconditionally
applies its own deterministic shape for any locale whose `h1` reaches 54 Unicode code points or
longer, before the artifact is ever validated — so an H1 core of 55 characters, the general-row
collision case named above, is intercepted by `FR-8(b)` before this clause's own line-48/line-49
cascade path is ever reached in a way that could produce that collision, and is **no longer a live
`OD-10` case at all**. For de-DE (budget ≤51), H1-core lengths 54-55 fall inside `FR-8(b)`'s regime
for the same reason and are also no longer live; **only H1-core lengths 52-53 remain** governed by
this clause's own line-48/line-49 cascade path. Even that narrower band collides only depending on the
differentiation marker's own length `m`, left unspecified above (a prompt-authoring decision for
`so-planner`/the implementer): a collision requires `core + m > 55`, i.e. `m ≥ 4` at `core = 52` and
`m ≥ 3` at `core = 53`. With a single-character marker (`FR-8(b)`'s own worked example uses one, `·`),
neither remaining length collides at all; a longer marker could still collide on part or all of the
52-53 band. **This is stated as a narrowing, not a full close** — the remaining band is real and its
liveness depends on a marker length this clause does not fix; it is not silently claimed closed. See
the `OD-10` entry in Open questions, the `AC-5` traceability row, and `NFR-5`, similarly corrected.

All four few-shot anchors, including Anchor 3 (lines 86, 92, 97 **and 98**, not only 104 — v2's fix
list omitted line 98, the exact anchor demonstrating this collision), are updated to reflect (a)
and both halves of (b): no anchor's `meta_title` example ends in a `| StoreName` suffix, and no
anchor's `meta_title` example is identical to its own `H1`, at any rung including the overflow
case. The anchors themselves (lines 81-106) are already within OD-3's granted scope; only the two
cascade-text lines (b) actually requires editing — the step-3 rung (line 48) and the overflow rule
(line 49) — are not.

**Authorization status — granted, under OD-9.** Lines 48 and 49 are the two places, and the only two
places, this collision is actually produced; there is no way to satisfy (b) without editing both. The
Owner's OD-9 resolution (`docs/decisions/US-3.1-open-decisions.md#4`) explicitly names both lines by
number ("46, 47, 48, 49") and explicitly states "resolving the collisions that produce an h1-duplicated
meta_title" as part of the grant. (b) is no longer contingent on anything this Specification does not
already have; the accepted-residual disposition above is this Specification's own resolution of the
OD-10 residual so-clarifier's verification of that grant surfaced, not a further authorization gap.

**(c) The per-locale Title budget table (lines 67-79) is reconciled to the following numbers,
under OD-7's grant, respecting the FROZEN `output-validator.ts` ceiling this authorization does not
reach.** OD-7 (`docs/decisions/US-3.1-open-decisions.md#3`) is the Owner's explicit, separate §9
authorization — distinct from and in addition to OD-3 — to edit this table specifically, "for all
locales." Independently re-verified this round: `output-validator.ts`'s `MAX_META_TITLE = 55`
(line 41, `error`-severity `meta-title-length` check at lines 654-668) is unchanged and this Story
does not authorize touching it (Out of scope), so the reconciled budget must stay **below** 55 —
the table's own design principle, unchanged by this edit, is to sit meaningfully below the hard
ceiling, not merely under it. `meta-titles.txt`'s four example strings, independently character-
counted directly rather than read from that file's own miscounted "Длина" column: en-ES 50, es-ES
53, pt-PT 49, uk-UA 47 characters — es-ES is the longest, setting the budget's practical floor at
53. **The reconciled Title budgets are:**

| Locale row | Current (v4) | Reconciled | Basis |
|---|---|---|---|
| en-GB, en-US, en-ES | ≤48 | **≤54** | Evidence-driven: en-ES's own reference example is 50 characters; 54 is the wider of the two values in the achievable {53,54} window (see below), chosen over 53 because it is the only value that leaves the sampled locale-shapes any margin at all against the budget itself. |
| es-ES, es-MX | ≤48 | **≤54** | Evidence-driven: es-ES's own reference example is 53 characters, the longest sampled — 53 as a budget would leave this locale-shape with zero margin under the budget, contradicting the table's own "a title at the budget still has room to spare" principle; 54 is the only value in the achievable window that preserves any margin at all while still respecting the ceiling. |
| pl-PL | ≤48 | **≤54** | Extrapolated, no `meta-titles.txt` reference example: grouped with the other Latin-script, non-German locale rows on the same basis as the existing table's own grouping (pl-PL already shares the ≤48 row with en-*/es-* today). Not evidence-driven for this specific locale — flagged for awareness at `HUMAN_SPEC_APPROVAL`. |
| uk-UA, ru-UA | ≤48 | **≤54** | Owner-directive-driven, not evidence-driven: uk-UA's own reference example (47 characters) already fit within the current ≤48 budget, and neither OD-7's verification note nor SPEC_REVIEW found this row shown to need raising by the arithmetic alone. It is raised here because the Owner's OD-7 resolution explicitly says "for all locales," not because the sampled evidence required it — stated as such so this is not mistaken for a claim the numbers alone support. |
| de-DE | ≤45 | **≤51** | Extrapolated, no `meta-titles.txt` reference example: `task-b.ts`'s own table already states German content runs 20-30% longer, which is why de-DE's budget is currently tighter than the general row by 3 characters (45 vs. 48) — a deliberate design choice to force earlier cascade degradation for German, not an oversight. This revision preserves that same 3-character gap against the new general-row value (54−3=51), rather than raising de-DE to the same 54 as the other rows, so the existing design intent is carried forward rather than erased. This is the least evidence-grounded row in this table — flagged for awareness at `HUMAN_SPEC_APPROVAL`. |
| (any other locale) | ≤48 | **≤54** | Evidence-driven via pt-PT, which falls under this row: pt-PT's own reference example is 49 characters. |

Only the Title budget figures are reconciled — the table's Description budgets (`Desc ≤ 150` on
every row) are unchanged and out of scope, since OD-7's grant names the "Title budget table"
specifically. The table's own descriptive text (lines 68-71, "sit BELOW the hard acceptance limit
on purpose... AIM LOW... a title at the budget still has room to spare") must be revised so it does
not overstate the margin that remains: at 54, the margin against the untouched 55-char ceiling is
1 character; at 51 for de-DE, the margin is 4 characters — neither is the 7 characters (55−48) the
current text describes for either row today. The model
"cannot count [its] own characters" (the table's own stated reason for the AIM LOW design) and
relies on this text being accurate — text that still claims generous headroom after this edit would
misinform the one actor the table exists to guide. The exact replacement wording is a
prompt-authoring decision for `so-planner`/the implementer, not specified here; this Specification
requires only that the description not overstate the margin, the same level of abstraction FR-13(b)
already used for its own prompt-text outcome requirements.

**Why 54 (and 51 for de-DE), not 53 (or a higher value): the achievable window, and the tradeoff it
trades away — OD-8's resolution, stated as an accepted tradeoff, not silently decided.** Given
es-ES's 53-character reference length as the floor and the untouched 55-char ceiling as the top,
the only budget values that both let the sampled locale-shapes reach the normal-case rung and
respect the ceiling are **53 or 54** (OD-8, `docs/decisions/US-3.1-open-decisions.md#3`). 53 leaves
es-ES with zero margin under the budget itself; 54 is therefore the value chosen, as the wider of
the two. This is stated as a tradeoff, not a free improvement, on two independent points:

1. **Margin against the FROZEN 55-char ceiling shrinks from 7 characters (55−48, today) to 1
   character (55−54) for the general-row budgets, and to 4 characters (55−51) for de-DE, for a
   title built exactly to the reconciled budget.** The table's own AIM LOW design exists because the
   model cannot count its own characters — that 7-character cushion was the tolerance for a model
   miscount. At the thinned margin, a model that overshoots its own budget crosses the untouched
   hard ceiling sooner than it did before. This is **partially, not fully, addressed**: a title that
   crosses 55 trips `output-validator.ts`'s existing, FROZEN `meta-title-length` check, which is
   `error`-severity and already has a registered, ladder-eligible repair strategy
   (`REPAIR_STRATEGIES`'s existing `meta-title-length` entry — `['field-scoped', 'deterministic']`,
   `truncateAtWordBoundary()` — see FR-8's suffix-wording fix, unaffected by this clause otherwise).
   **This is stated honestly as a partial, probabilistic mitigation, not a settled risk-transfer —
   the same register FR-7 already uses for its own accepted `productShort()` false-positive cost.**
   The ladder's field-scoped rung, tried first, is an LLM-driven rewrite that can succeed at
   shortening the title while preserving the template shape, and often will. But its deterministic
   terminator cannot be relied on to: independently re-verified against the live
   `repair-strategy.ts` source, `truncateAtWordBoundary()` only preserves a trailing segment when the
   text still contains a `' | '` separator — a separator FR-8's own suffix-removal means no
   correctly-shaped `meta_title` carries any more, so this tier falls straight through to
   `cutOnWordBoundary()`. That function clips to the character limit, backs up to the last space, and
   strips trailing punctuation, with **no awareness of the `{Product Name} - {Localized Category}
   {Spec}` template's own structure**; a cut landing at or before `{Localized Category}` can strip
   the trailing `{Spec}`/`{Localized Category}` token entirely, producing a title under 55 characters
   that no longer matches the template shape — re-tripping FR-8's own `meta-title-template-shape`
   check. That check is unregistered in `REPAIR_STRATEGIES`, so `resolveLadder()` returns
   `['full-regen']` for it: the exact expensive path the margin-thinning was meant to avoid, reached
   whenever the field-scoped rung does not resolve the overflow first. So the reconciled budget does
   not cleanly trade a frequent, expensive repair-cost source for a rarer, cheap one — it trades it
   for a rarer path that usually, but not always, stays cheap, with a residual chance of landing on
   the expensive one anyway. This residual is accepted as a stated, bounded risk of the reconciled
   budget, not closed by this Story: closing it fully would require either registering a
   template-shape-aware repair for `meta-title-template-shape` itself, or teaching
   `cutOnWordBoundary()`'s deterministic tier to preserve a minimal placeholder for a dropped
   component rather than allow it to be stripped entirely — both out of scope here (see Out of
   scope), since `repair-strategy.ts`'s own design principle states its primitives are
   product-independent, selected by rule identity alone, and teaching one of them the internal shape
   of a single field's template is a real design change, not a simple one this revision can make
   under FR-13(c)'s existing authorization.
2. **A product whose name or localized-category term runs longer than the QA sample's own 53-
   character longest reference still cannot reach the approved template shape within the untouched
   55-char ceiling, at any budget value.** This is not a miscalibration this Story can close by
   choosing a different number: with the budget at 54 (or any value below 55), such a product's
   template-built title exceeds the ceiling and trips `meta-title-length`; degraded to fit under the
   ceiling, it no longer carries `{Localized Category}`/`{Spec}` and trips FR-8's unregistered
   `meta-title-template-shape` check instead. One of the two error-severity checks fires regardless
   of the budget chosen — the cascade must degrade for that product by design. This was, through v17,
   recorded as an accepted, inherent limit of the approved template for long-named products, parallel
   to how FR-7 accepts `productShort()`'s over-capture false-positive cost as a bound rather than a
   defect to eliminate within this Story — not a defect this table's numbers alone could be tuned to
   avoid.

   **Corrected in v18: this description no longer describes what ships whenever the product's own `h1`
   reaches 54 Unicode code points or longer, regardless of why `h1` is that long.** FR-8(b) (below)
   gives that regime — `h1Len ≥ 54` — a different, deterministic, always-reachable shape rather than
   letting the cascade degrade and fail; see FR-8(b) and Open questions for the resolution and for how
   this supersedes `OD-8`'s original disposition. This budget table's own numbers (54 general, 51
   de-DE), and everything else in this clause (c), are unaffected — FR-8(b) governs which *shape*
   `meta_title` takes when `h1` itself is too long for the template to reach; it does not change what
   the reconciled per-locale budget values are, or why they were chosen.

**This resolves both OD-7 and OD-8.** OD-7's authorization is applied at the numbers stated above;
OD-8's residual is carried forward as a documented, accepted tradeoff rather than silently resolved by
picking a number without stating what it costs. **As of v18, this is the thinned-margin half only** —
the long-name half of OD-8's original residual is superseded by FR-8(b) (above), which gives that case
its own required, always-reachable shape instead of accepting it as an inherent limit; see FR-8(b) and
Open questions.

**(d) Cascade step 2 (line 47) must stop instructing the model to keep the site suffix — a second,
previously-unenumerated live suffix mandate, distinct from line 44.** OD-3's granted text authorizes
removing line 44's "`[Site Suffix]` is MANDATORY — present at steps 1 AND 2" sentence. It does not, by
its own literal text, authorize line 47, `"[H1 core] | [Site Suffix]"    ← drop benefit, KEEP suffix`
— a textually separate instruction inside cascade step 2 that independently tells the model to retain
the suffix at that rung regardless of whether line 44's mandate is removed. Left unedited, a
`meta_title` produced at step 2 still carries a `| {site_name}` segment — exactly the shape FR-8's
`meta-title-template-shape` check fails. This is not a new requirement invented by this revision: it
follows directly from FR-8's own "no site suffix" requirement and from OD-3's own stated intent ("a
code-side exemption without a corresponding prompt-text change would leave the model generating
content the rule then has to repair on every run"), applied to a specific line no prior version of
this Specification, no plan, and no task named. PLAN_REVIEW v1 independently found this gap by
re-reading the live file; it is confirmed here, not merely re-asserted.

**Authorization status — granted, under OD-9.** Line 47 sits inside the "— meta_title —" block (lines
39-51). Whether OD-3's existing grant was read generously enough to already reach line 47 (it names
only line 44 and the anchors) was exactly the kind of implicit-widening question AGENTS.md §9 reserves
to the Owner, not to this stage — so v7 correctly did not assume OD-3 already covered it, and asked
instead. The Owner's OD-9 resolution (`docs/decisions/US-3.1-open-decisions.md#4`) explicitly names
line 47 and explicitly states "removing the suffix-retention requirement at step 2" as part of the
grant. (d) is no longer contingent on anything this Specification does not already have.

**Failure path:** prompt text that still instructs a mandatory or default site-name suffix, **at
either line 44 or line 47 independently**, is exactly the root cause the Story's own D3 text warns
against ("a code-side exemption without a corresponding prompt-text change would leave the model
generating content the rule then has to repair on every run, burning repair-gate attempts") — fixing
line 44 alone while leaving line 47's independent "KEEP suffix" instruction untouched is the specific
regression (d) exists to close. Independently of the suffix: prompt text whose cascade still has no
defined `{Localized Category}`/`{Spec}` components is a failure of (a); prompt text whose
most-degraded rung **or whose line-49 overflow rule** can still produce an `h1`-identical
`meta_title` is a failure of (b); a line-49 fix that abandons the H1-core-verbatim prefix (line 40)
by substituting inside the bare core, rather than appending after it, is also a failure of (b) — it
corrupts the product name to chase a cost this Specification has already weighed and declined to
require closing that way (OD-10). Fixing only line 48 while leaving line 49 untouched is the specific
regression this revision exists to close. A budget table left at v4's ≤48/≤45 numbers, or raised to any value at
or above 55, or raised without the descriptive text's margin claim being corrected, is each
independently a failure of (c). Prompt text satisfying (a), (b), (c) and (d) as stated above is
unaffected by FR-8/FR-9 except as a mechanical confirmation that the template (FR-8(a)) — or, for an
`h1Len ≥ 54` entry, FR-8(b)'s own required alternate shape, which this Story's pipeline applies
regardless of what the model's own cascade attempt produced — was followed.

**(a), (b) and (d) are authorized under OD-9 and no longer contingent on any further Open Decision.**
Implementing any of them beyond the scope OD-9 actually grants (the whole "— meta_title —" block,
lines 39-51, and `buildPromptB()`'s excerpt-construction code, lines 112-140) would still be an
AGENTS.md §9 violation, not merely a Specification deviation — the same discipline NFR-5 already
states for FR-13(c)'s own scope.

### FR-14 (new, v20): `cta.heading`'s non-empty requirement is `schemaVersion`-conditional — required for `'3.0'`, not required for `'4.0'`

**Trigger and evidence.** A real-world QA batch (`Knowledge/Issues/Second Batch/`) surfaced this defect
during this Story's own delivery-pipeline testing — distinct from, and later than, the `First_Batch`
report the rest of this Specification traces to. Independently re-verified live this round against all
three cited files (not accepted from `pipeline_status` v11 or `implementation_plan` v12 §4c at face
value):
- `src/domain/description-doc.schema.ts:216` — `cta: z.object({ heading: NonEmpty, text: Prose })` —
  requires `heading` to be a non-empty string unconditionally, for every `schemaVersion`.
- `src/render/render-description.ts:443-449` — for `isV4` (`schemaVersion: '4.0'`), the rendered §9
  `<h2>` is assembled from `getRenderRules(ctx.storeName ?? '').ctaHeading(doc.locale,
  doc.localizedName)`; `doc.cta.heading` is read only on the non-`isV4` (`'3.0'`) branch (line 449:
  `: doc.cta.heading`). For `schemaVersion: '4.0'`, `doc.cta.heading`'s content has **no effect on the
  rendered artifact** — it is computed and then discarded.
- `src/prompts/task-a-doc.ts:148-150` — the v4 prompt instructs the model directly: *"Write the
  'cta.text' only — the heading is assembled in code from a per-locale template, so whatever you put in
  'cta.heading' is discarded."* A model correctly following this instruction emits `cta.heading: ''` (or
  another placeholder with no bearing on output) on every real `schemaVersion: '4.0'` generation, and
  the unconditional schema requirement above then rejects that document on every such generation — not
  occasionally, but as the expected, designed-for model behaviour for this schema version. This Story's
  own `T1`/`D7` made that rejection field-scoped-repairable rather than a full-document regeneration,
  but did not change whether it fires: it still fires, and still spends one real repair-gate attempt,
  on a field the shipped artifact never uses.

**(a) Behaviour, `schemaVersion: '4.0'`.** Validation of a `ProductDescriptionDoc` whose `schemaVersion`
is `'4.0'` does not fail, and no repair-gate attempt is spent, because `cta.heading` is an empty string.
`cta.heading` may be empty (or otherwise absent of enforced content) for `schemaVersion: '4.0'`,
matching what `render-description.ts:443-449` already does with it — discard it — rather than requiring
a value the renderer never uses.

**(b) Behaviour, `schemaVersion: '3.0'` — unchanged.** Validation of a `ProductDescriptionDoc` whose
`schemaVersion` is `'3.0'` continues, exactly as today, to require `cta.heading` to be a non-empty
string. `render-description.ts`'s non-`isV4` branch (line 449) reads `doc.cta.heading` verbatim into the
rendered `<h2>` — for this `schemaVersion`, an empty or missing `cta.heading` is a genuine content
defect (the CTA heading is what the customer sees), not a discarded field, and must continue to fail
validation at the same severity as today.

**Failure path.** A `schemaVersion: '4.0'` Doc whose validation still fails, or still spends a
repair-gate attempt, solely because `cta.heading` is empty is the regression this requirement exists to
close. A `schemaVersion: '3.0'` Doc whose validation accepts an empty or missing `cta.heading` is an
equally direct failure of (b) — this requirement narrows the `'4.0'` case only; it does not loosen the
`'3.0'` case in any way.

**Scope, stated narrowly.** This requirement relaxes exactly one constraint: `cta.heading`'s non-empty
requirement, and only for `schemaVersion: '4.0'`. It does not relax, and no implementation of it may
relax, `cta.text` (required non-empty `Prose` content on both `schemaVersion` paths — the CTA paragraph
is unchanged and always rendered, on both the `'3.0'` and `'4.0'` paths, per `render-description.ts:450`)
or any other field's validation. It does not reopen `FR-7`'s Doc-path `heading-brand-core-missing` check
(which, as of v10, already reads `doc.localizedName` rather than `doc.cta.heading` for `schemaVersion:
'4.0'` — a different check, on a different field, addressing a different concern: brand-core presence in
the *shipped* heading, not the discarded `cta.heading` input). It does not touch `FR-10`'s `doc-schema`
repair-ladder entry, which remains exactly as specified, for whichever `doc-schema` findings still fire
after this requirement narrows one of them away. No file outside `src/domain/description-doc.schema.ts`
(and, if the implementer's chosen mechanism needs it, its own test fixtures) is implied by this
requirement; the Zod mechanism used to express the `schemaVersion`-conditional behaviour above (a field
change, a refinement, or another shape) is an implementation decision, not stated here.

## Generated-content requirements (AGENTS.md §4)

FR-8 and FR-9 add new constraints on top of, not instead of, the existing SEO criterion. No other
§4 criterion is touched — this Story changes validation/repair/gate logic and prompt-text
disambiguation, not the renderer or generation-prompt output shape.

> "SEO: meta_title ≤ 55 chars; meta_description ≤ 155, ends with CTA ➔. **No currency
> symbol** — price is not available at the Task B stage, and `task-b.ts` forbids inventing
> one; price/priceCurrency ship via Schema.org Offer microdata instead.
> `output-validator.ts`'s `meta-description-currency` rule is therefore deliberately never
> armed — see `src/services/seo-currency-wiring.spec.ts`."

FR-8's template check runs alongside this criterion, not in place of it: a `meta_title` that
satisfies FR-8(a)'s template shape and has no site suffix must still be ≤ 55 characters; a
`meta_title` in FR-8(b)'s `h1Len ≥ 54` regime is, by that clause's own requirement, always well
within the 55-character ceiling regardless of `h1`'s own length. `meta-description-currency` stays
disarmed exactly as this criterion requires.

## Non-functional requirements

- **NFR-1:** `systemBlocks` are not collapsed into `userContent`. The `task-b.ts` edit this FR
  requires (FR-13: removing the mandatory site-suffix instruction at line 44 (authorized, OD-3) and
  at line 47 (authorized, OD-9, (d)), defining `{Localized Category}`/`{Spec}` (authorized, OD-9, (a)),
  fixing the most-degraded cascade rung and the overflow rule, by appending after the H1 core rather
  than substituting inside it (authorized, OD-9, (b)), reconciling the budget table (authorized, OD-7,
  (c)), and updating the few-shot anchors
  (authorized, OD-3)) and the authorized `master-system-prompt.ts`/`task-a.ts` edit (FR-12: the
  heading-form exception wording) both stay inside their respective static system/instruction-block
  text; no cached instruction text moves into `userContent` as a side effect (AGENTS.md §3). FR-13(a)'s
  requirement that the model be given source data to derive `{Localized Category}`/`{Spec}` is,
  conversely, per-request data by definition and belongs in `userContent` (or an addition to it),
  never folded into the cached `systemBlocks` text.
- **NFR-2:** No behaviour depends on the active provider (§3 Rule 1). FR-1's retry-with-backoff for
  `groundingSpecs()` is implemented at the orchestrator / provider-agnostic layer, consistent with
  the existing provider-independent retry/backoff wrapper (§3 Rule 5), not duplicated per-provider.
- **NFR-3:** Determinism (§5). FR-1's retry-with-backoff is testable without a real clock: tests
  mock or inject the backoff delay rather than waiting on `setTimeout`, and no test relies on
  retry-until-pass.
- **NFR-4:** `STORE_REGISTRY` remains the only source of which locales FR-7/FR-8/FR-9's per-locale
  checks run against; no locale list is hard-coded for any new check.
- **NFR-5:** FROZEN-file discipline (§9). Every edit to `task-a.ts`/`task-b.ts`/`task-c.ts`/
  `master-system-prompt.ts` under the D3/OD-3/OD-7/OD-9 authorizations (FR-12, FR-13(a)-(d)) ships in
  the same commit as a re-baselined `.arch-guard-checksums`; `output-validator.ts` receives no edit
  under this Story regardless of the thinned margin FR-13(c)/OD-8 document, or of OD-10's residual
  (narrowed, not eliminated, by FR-8(b) as of v19 — see FR-13(b) for the corrected band) —
  both are accepted, bounded costs (FR-13(b)/(c)), never closed by touching the FROZEN ceiling;
  `task-c.ts` receives no edit under this Story either (see Out of scope
  — independently re-verified as already correct). `task-b.ts`'s per-locale Title budget table is
  edited under OD-7's grant, to the numbers FR-13(c) states; the whole "— meta_title —" block
  (lines 39-51) and `buildPromptB()`'s excerpt-construction code (lines 112-140) are edited under OD-9's
  grant, to what FR-13(a), (b) and (d) state — an edit to any other section of `task-b.ts`, or content
  other than what FR-13(a)-(d) state, exceeds OD-3's/OD-7's/OD-9's combined grant and is a §9
  violation, not merely a Specification deviation. **FR-8(b) requires no edit to `task-b.ts`, or to
  any other FROZEN file, at all (new in v18)** — it is a generation-time normalization and a matching
  validator branch, layered on top of `task-b.ts`'s existing, unedited cascade text, and needs no
  further §9 authorization beyond what this Story already has.

## Out of scope

- Manual reconciliation of the already-shipped 2026-09-21 artifact (Story's own Out of scope,
  carried through unchanged) — re-verifying its §7 rows, hand-fixing its es-ES/pt-PT CTA headings,
  aligning its `meta_title`. Regenerating that product through the fixed pipeline is preferable.
- Any edit to `src/utils/output-validator.ts` — FROZEN, not authorized.
- Any edit to `src/prompts/task-c.ts` — independently re-verified this revision: its per-locale
  CTA/"why-buy" heading formulas already instruct `[Product-short]` at the commercial-closing
  heading (e.g. lines 211, 239, 268, 316, 353, 357), consistent with OD-2's resolution. This is not
  part of the D3 gap FR-12 closes; task-c.ts needs no edit for this Story.
- Any prompt-text rewrite beyond the authorized, scoped edits: FR-12 (heading-form
  disambiguation for the `productShort() === name` case, within D3's grant); FR-13(a), (b) and (d)
  (defining `{Localized Category}`/`{Spec}`; a non-`h1`-identical terminal rung that appends after the
  H1 core rather than substituting inside it; removing line 47's suffix retention — within OD-9's
  grant); and FR-13(c)/FR-13(d)'s line-44 half
  (site-suffix-mandatory-line removal; reconciling the per-locale Title budget table to FR-13(c)'s
  stated numbers; updating the four few-shot anchors — within OD-3's and OD-7's combined grant). No
  edit under any of D3/OD-3/OD-7/OD-9 may go beyond what FR-12/FR-13 actually state: editing the
  budget table to any number other than FR-13(c)'s stated numbers, editing the "— meta_title —" block
  or `buildPromptB()` to content other than what FR-13(a)/(b)/(d) state, or editing any other FROZEN
  section of `task-b.ts` beyond what OD-3/OD-7/OD-9 name, is out of scope and a §9 violation, not a
  permitted reading of an existing grant. No general rewrite of `[HEADING FORM]` or the
  invariant-core rule's substance beyond stating the exception correctly in the one case where it is
  currently ambiguous.
- Fixing FR-13(b)'s line-49 collision by substituting a character inside the bare H1 core rather than
  appending after it — checked and ruled out, not a permitted alternative: it breaks `task-b.ts` line
  40's "begin with the H1 core verbatim" guarantee and corrupts the customer-facing product name,
  while not actually avoiding FR-8's unregistered, full-regen-only path either (see FR-13(b), OD-10).
  The bounded ceiling-collision cost an appended marker can introduce is accepted, not engineered
  around by corrupting the name.
- Applying FR-7's brand-core *mandatory-presence* check to any heading position other than the CTA
  heading — as of v16, the only position `heading-brand-core-missing` checks (see FR-7; Background,
  v16, point 2). The first §3 heading remains a blessed position for FR-6's own stuffing exemption and
  for AC-2's budget-of-two boundary, both unaffected — only FR-7's mandatory-presence scope is
  narrowed.
- A conditional-correctness check at the first-§3-heading leaf ("if the heading names the product at
  all, the name must be correct; a heading naming no product is fine") — checked as an alternative to
  v16's removal of that leaf, per SPEC_REVIEW v15's Finding 2, and rejected (v17; see Background, v17,
  point 2): no workable trigger for "the heading names the product at all" avoids either the existing
  `shortPattern` idiom's no-match ambiguity or the token-presence false-positive class already rejected
  for the core-position rule (`productShort('Makera Cyclone Dust Collector')` keeps "Dust"/"Collector"
  as designator-shaped tokens a naive trigger could misfire on). A future Story with a different or
  wider corpus may revisit this if a safer trigger becomes available.
- A mechanical detector for FR-7's own punctuation-free CTA/sentence-framing worked examples ("Buy the
  [name] Now", "Technical specifications for the [name]") — checked and explicitly left as an accepted,
  disclosed residual, not a requirement this Story's registered check enforces (v16; see FR-7's
  Accepted-cost discussion and Background, v16, point 1, for the two candidate detectors considered and
  why both were rejected on this Story's own evidence). A future Story may close this gap with a
  detector the evidence available to this one does not support shipping.
- **Fixing FR-6's own Doc-path exemption check (`checkProductNameStuffingDoc`) reading
  `doc.cta.heading` unconditionally for every `schemaVersion` — a documented, non-blocking, pre-existing
  parallel gap, not closed by this revision.** SPEC_REVIEW v8 independently confirmed this reads the
  same discarded field FR-7's Doc-path CTA check did before v9, so for a `schemaVersion: '4.0'` Doc the
  shipped master CTA heading is stuffing-checked only by `runOutputValidation()`'s post-hoc,
  non-repairing, non-gating pass — the same structural gap as this Story's own Finding, but on
  `heading-product-name-stuffing` (FR-6, the *too-much* direction: a blessed-position heading carrying
  more than the exact `productShort()` form), not `heading-brand-core-missing` (FR-7, the *too-little*
  direction, closed above). Concretely: v11's `doc.localizedName` check confirms the `productShort()`
  form is present and rejects sentence/CTA framing around it (new in v11 — see FR-7), but it does not
  confirm the field contains **nothing more** than a name — a `doc.localizedName` carrying the
  full/invariant name (or a trailing configuration code), with no framing added, still satisfies both
  the presence test and v11's own shape requirement, and still ships an FR-6-shaped violation at the v4
  CTA position, uncaught in-gate. This is, honestly, a **shipped-defect risk** for that specific case, not merely a missed
  optional repair call — the same character as FR-7's own gap before this revision, on the opposite
  direction. Left unfixed here anyway, on scope-discipline grounds: the underlying code
  (`checkProductNameStuffingDoc` reading `doc.cta.heading`) predates this Story and is untouched by it;
  the rule is `warning` severity, one full ordinal below FR-7's `error`; and FR-6's own requirement (the
  degenerate-case `productShort(name) === name` exemption) does not concern which field is read or where
  the check runs, so closing this parity gap is not something FR-6 as scoped asks for, and doing so
  would require the same kind of retargeting work this revision just did for FR-7 — a second,
  undelegated scope expansion, not a small addition. Recorded here, unlike v9, for `so-planner`/
  `so-builder` awareness as a candidate follow-up story, not opened as new scope in this one.
- Retargeting FR-7's Doc-path CTA-heading check, for a `schemaVersion: '4.0'` Doc, to validate
  `getRenderRules(storeName).ctaHeading(...)`'s own **return value** in place of `doc.cta.heading` —
  considered and rejected as of v9, and re-confirmed rejected as of v10 (see FR-7): that function is
  correct by construction for every locale a store's registry actually covers, so a check against its
  output would confirm what its own code already guarantees, not catch anything AC-3 needs caught.
  This is distinct from v10's own mechanism, which validates that function's **input**
  (`doc.localizedName`) instead — the input is not correct by construction and was, before v10,
  unvalidated anywhere; validating it is not the redundant check rejected here.
- **Anything about `cta.text`, or about `FR-7`'s `heading-brand-core-missing` repair check, under
  FR-14 (new, v20).** FR-14 relaxes exactly one Zod presence constraint —
  `ProductDescriptionDocSchema`'s `cta.heading` `NonEmpty` requirement, and only for
  `schemaVersion: '4.0'`. `cta.text` (`Prose`, required non-empty on both `schemaVersion` paths)
  is untouched, and `FR-7`'s own `doc.localizedName`-targeted brand-core presence check (a
  repair-gate rule, not the Zod schema boundary FR-14 concerns) is unaffected — FR-14 governs
  only whether the raw `cta.heading` input passes schema validation, not what the shipped CTA
  heading must contain.
- Wiring the HTML/string-path form of `heading-brand-core-missing` (or `validateHeadingStyle`
  generally) directly into `runDocGate()` against the rendered master HTML — considered and rejected
  as of v10 (see Background): `runDocGate()` deliberately renders exactly once, after its own
  `validate()` closure concludes, so every Tier-1 validator runs against the pre-render `doc`;
  inserting a second, post-render validate-and-repair pass inside the same gate would require
  restructuring that render/validate ordering, which the Doc-path fix (checking
  `doc.localizedName` pre-render instead) makes unnecessary.
- Any edit to `render-description.ts` or `store-render-rules.ts` to make `doc.cta.heading`
  reach the shipped artifact for a `schemaVersion: '4.0'` Doc, or to make `getRenderRules(...)
  .ctaHeading()` accept a caller-supplied string — v9's and v10's FR-7 scoping both work within the
  renderer's existing, already-committed behaviour rather than changing it; no renderer or
  generated-HTML output-shape change is in scope for this Story regardless (see below).
- Blocking `downloadAllImages()`/`downloadImagesPackage()` — it reads `imgResults()`, a distinct
  signal from the generated Doc/HTML content, carries no §7 spec content, and is unaffected by a
  specs-grounding failure. FR-3's block covers `downloadZip()` and `downloadText()` only.
- Improving `productShort()`/`invariantCore()`'s designator-detection heuristic (e.g. extending
  `DESCRIPTOR_STOPWORDS` to recognize untagged category nouns like "Dust Collector") — FR-7
  explicitly inherits the existing heuristic's known over-capture bias rather than fixing it; see
  FR-7's accepted-cost discussion. A future Story may reduce FR-7's false-positive rate by fixing the
  heuristic itself.
- Any change to `REPAIR_STRATEGIES` entries other than `doc-schema`, `slug-name-designator-lost`,
  `heading-brand-core-missing`, and the existing `meta-title-length` entry's suffix-preservation
  wording (FR-8's clause — its `fieldInstruction` text and `truncateAtWordBoundary()`'s
  `" | Suffix"`-preserving branch only; its ladder shape (`['field-scoped', 'deterministic']`) and
  every other part of the entry are unchanged). FR-8/FR-9's own new rules,
  `meta-title-template-shape` / `meta-title-h1-identical`, remain unregistered, with no repair
  strategy of their own; an error-severity finding for FR-8/FR-9 that falls through to full-regen
  absent one is accepted, unaltered pre-ladder behaviour for a newly-added rule. With FR-13(c)'s
  budget table now reconciled to 54 (51 for de-DE), this full-regen cost is expected to be **rare
  for the QA sample's locale-shapes**, not regular as v4 stated while OD-7 was still outstanding —
  but it is not eliminated. **It is also the
  accepted cost for the thinned-margin residual FR-13(c) names as of v6**: `meta-title-length`'s
  existing, registered `deterministic` tier (`truncateAtWordBoundary()`/`cutOnWordBoundary()`) has no
  awareness of the template's `{Localized Category}`/`{Spec}` structure and can itself strip that
  tail when repairing a title that crosses the thinned 54/51 budget margin, landing back on the
  unregistered `meta-title-template-shape` check and its full-regen fallback — a probabilistic, not
  certain, occurrence (the ladder's field-scoped rung runs first and often resolves it), accepted as
  a bounded residual rather than closed by this Story. **Corrected in v18: this is no longer the
  accepted cost for the long-name residual `OD-8` originally documented, and "shortening the
  template's components to close the long-name residual" (below) is no longer a live option this
  residual needs** — a product whose own `h1` reaches 54 Unicode code points or longer, regardless of
  why, no longer trips one of FR-8's or `meta-title-length`'s error-severity checks "regardless of
  budget," as this bullet stated through v17; FR-8(b) gives that regime its own required,
  always-reachable shape instead, superseding that half of `OD-8`'s original disposition (see FR-8(b)
  and Open questions). What remains here, unaffected by FR-8(b), is narrower than v17 stated: the
  thinned-margin residual above, for `h1Len ≤ 53` only. Registering a repair strategy for either new
  rule, or teaching `cutOnWordBoundary()`'s deterministic tier to preserve a minimal placeholder for a
  dropped template component instead of stripping it entirely, remains out of scope and a candidate
  follow-up Story, for the thinned-margin residual that remains.
- Sourcing the data FR-13(a) requires the model to derive `{Localized Category}`/`{Spec}` from
  (which existing or new prompt-payload field carries it) — the requirement that this data reach
  the model belongs to this Specification; which field carries it is `so-planner`'s decision.
- Any renderer or generated-HTML output-shape change.
- Any change to which languages or currency `STORE_REGISTRY` derives.
- Retry/backoff or hard-block behaviour for any validation rule other than
  `specs-grounding-disabled`.

## Open questions

**No blocking item remains as of v18.** OD-1 through OD-9 are resolved; OD-10, opened by so-clarifier
while verifying OD-9, is non-blocking and was resolved by Specification v8's own explicit choice, the
same disposition OD-8 received from OD-7's own verification. FR-7's Doc-path CTA-heading scoping (see
FR-7, and the Background's v9/v10 entries) is resolved directly from OD-6 and codebase evidence,
without opening a new Open Decision — so-planner's implementation-plan v5 first stated this is a
check-scope decision for Specification, not an ambiguity needing further Owner input, and SPEC_REVIEW
v8's own blocking finding against v9's enforcement claim (closed by v10, below) confirmed the fix is
"a Specification correctness defect, not a new Open Decision" rather than a judgment call for the
Owner. SPEC_REVIEW v9's blocking finding against v10's own FR-7 text — the repaired-value shape for
`doc.localizedName` was unspecified — is likewise resolved directly, without opening a new Open
Decision, from OD-6's existing mandatory-presence resolution plus this Story's own established
`repair-strategy.ts` precedent — `heading-product-name-stuffing`'s single entry already demonstrating
that one rule identity can dispatch different behaviour by path shape via its *tier/executor*, not via
its `fieldInstruction`'s returned *text* (corrected wording, v12, per SPEC_REVIEW v10 §5 — FR-7's own
text-level dispatch by `issue.path` is a new, signature-supported extension of that precedent, not a
case the precedent already demonstrates); see Background, v11/v12, and FR-7 below. SPEC_REVIEW v10's
blocking finding against v11's own shape requirement — no stated exemption for a banned character that
is intrinsic to the product's own real name — is likewise resolved directly, without opening a new Open
Decision, from the FR-13(b)/OD-10 precedent this Specification already established (never satisfy a
shape rule by corrupting the actual product name) plus `product-name-core.ts`'s own existing
`invariantCore()` helper, already computed from the untranslated source name at every call site that
also computes `productShort()`; see Background, v12, and FR-7 below. SPEC_REVIEW v11's blocking finding
against v12's own exemption text — its normative sentence and its own worked example disagreed under
the most natural reading, and the two readings that reconciled them (occurrence-count vs.
positional/substring-containment) diverged on the evidenced Cyrillic-unit case — is likewise resolved
directly, without opening a new Open Decision: which of the two readings to choose is decidable from
this codebase's own `product-name-core.ts` source and this Specification's own prior FR-13(b)/OD-10
reasoning (never let a shape rule reject or corrupt a correctly-localized value), not a judgment call
for the Owner. v13 states occurrence-count matching precisely, enumerates the banned-character classes
at their edges, and states plainly that occurrence-count deliberately exempts the Cyrillic-unit case
even across a relocated/reshaped designator; see Background, v13, and FR-7 below.

- **OD-9 — RESOLVED.** *Does the Owner extend the §9 authorization to cover the whole "— meta_title —"
  block (lines 39-51, naming lines 46, 47, 48, 49) and `buildPromptB()`'s excerpt-construction code
  (lines 112-140) together, and on what basis for the specific wording FR-13(a)/(b)/(d) require?*
  **Yes** — see `docs/decisions/US-3.1-open-decisions.md#4`, OD-9, for the Owner's verbatim resolution
  (sbruhov@gmail.com, received in Ukrainian, translated in that artifact) and so-clarifier's
  independent verification of its scope match against the live `task-b.ts`/`buildPromptB()` text,
  confirming every line FR-13(a)/(b)/(d) need (46, 47, 48, 49, and the full 112-140 span) is explicitly
  covered, with no gap. Applied at FR-13(a), (b) and (d) above, which this revision finalizes as
  concrete, unblocked requirements — removing v7's `BLOCKED` disposition for this Specification.
- **OD-10 — RESOLVED by this Specification (v8), as a named, accepted residual on FR-13(b) — the same
  disposition OD-8 already uses for its own margin-thinning cost.** so-clarifier's own verification of
  OD-9 found that satisfying FR-13(b)'s line-49 fix by appending a differentiation marker (any length
  `m ≥ 1`) can push an H1 core that today passes the untouched, FROZEN `output-validator.ts`
  `MAX_META_TITLE = 55` check into newly failing it — for a precisely bounded set of H1-core lengths:
  exactly 55 characters for the general-row locales (FR-13(c)'s ≤54 budget), and 52-55 characters for
  de-DE (FR-13(c)'s ≤51 budget), the de-DE band's width growing with `m`. Two resolution paths were
  identified (`docs/decisions/US-3.1-open-decisions.md#4`, OD-10): (a) accept the bounded cost as a
  named, accepted residual; or (b) constrain FR-13(b) to a length-neutral substitution instead of an
  appending marker, closing the residual entirely.

  **This Specification chose (b) first, then checked it directly against `task-b.ts`'s own text and
  reversed the choice to (a) once that check failed it.** A length-neutral substitution — replacing a
  character already present in the bare H1 core, rather than appending one — does not actually close
  anything: `task-b.ts` line 40 requires `meta_title` to "begin with the H1 core verbatim
  (character-for-character)" at every cascade step, including the terminal rung. Substituting a
  character inside that core breaks this guarantee outright (the resulting string no longer contains
  the H1 core intact as a prefix) and corrupts the actual, customer-facing product name — a
  correctness regression this Story has no authorization or reason to introduce. It also buys no
  escape from FR-8's own cost: neither a substituted nor an appended core contains
  `{Localized Category}`/`{Spec}`, so both already diverge from FR-8's approved template shape and
  already land on FR-8's unregistered, `full-regen`-only path exactly as today's unmarked terminal
  rung does (see FR-8, Out of scope) — substitution adds the corrupted-name defect on top of a cost it
  does not remove. An appended marker, by contrast, keeps the H1 core intact and true to line 40, and
  introduces only OD-10's own precisely bounded ceiling-collision cost — strictly smaller and less
  harmful than what the length-neutral alternative would have caused. **This Specification therefore
  accepts OD-10's residual (path (a))**, stated at FR-13(b) above: the differentiation must append,
  never substitute inside the H1 core, and the resulting bounded ceiling-collision risk (one exact
  H1-core length for the general rows; up to four for de-DE, depending on marker length) is a named,
  accepted cost, parallel to OD-8's. **Reasoning for why this differs from OD-8's own disposition
  despite reaching the same "accept" conclusion:** OD-8 was accepted because no cheaper option existed
  inside this Story's authorization; OD-10 was accepted after an apparently cheaper option (path (b))
  was checked and found to cost more, not less, once its interaction with line 40 and FR-8 was traced
  through — accepting the smaller, already-bounded cost rather than trading it for a certain
  correctness defect. **blocking:** false (resolved).

  **Refined in v19 (SPEC_REVIEW v17's blocking finding): the band above is now narrower, not fully
  closed.** `FR-8(b)` (new in v18) computes and unconditionally applies its own deterministic shape
  for any `h1Len ≥ 54`, before this clause's own line-48/line-49 cascade path is ever reached — so the
  general-row collision case named above (H1-core length exactly 55) is no longer reachable at all,
  and de-DE's band narrows from 52-55 to 52-53. Even that narrower band collides only depending on the
  differentiation marker's own length `m`, left unspecified above: `core + m > 55` requires `m ≥ 4` at
  `core = 52` and `m ≥ 3` at `core = 53`. This is stated as a narrowing, not a close — the residual is
  real for a long-enough marker, and this Specification does not fix the marker's length. See FR-13(b)
  for the corrected statement in full.

- **OD-7 — RESOLVED.** *Did the Owner extend the FROZEN-file §9 authorization already granted under
  OD-3 to also cover `task-b.ts`'s per-locale Title budget table (the separate, distinctly-headed
  "— PER-LOCALE BUDGETS —" section, lines 67-79)?* **Yes** — see
  `docs/decisions/US-3.1-open-decisions.md#3`, OD-7, for the Owner's verbatim resolution
  (sbruhov@gmail.com, 2026-09-22) and CLARIFICATION's independent verification of its scope match
  against the live `task-b.ts` text. Applied at FR-13(c) above, with the actual reconciled numbers
  (≤54 for en-GB/en-US/en-ES, es-ES/es-MX, pl-PL, uk-UA/ru-UA and "(any other locale)"; ≤51 for
  de-DE) and their per-row basis stated explicitly, rather than left as the two-branch conditional
  v4 was forced to write while this authorization was still outstanding.
- **OD-8 — RESOLVED as an accepted tradeoff, per its own non-blocking, delegated-to-Specification
  disposition** (`docs/decisions/US-3.1-open-decisions.md#3`, OD-8; `docs/evidence/US-3.1-
  clarification-report.md#3`). CLARIFICATION's verification of OD-7 found the achievable budget
  window, once bounded by the untouched `output-validator.ts` 55-char ceiling, is only {53, 54}
  characters — a 1-2 character margin against the table's currently-designed 7 — and that a product
  whose name or localized-category term runs longer than the QA sample's own 53-character longest
  reference makes the approved template unreachable within that ceiling at any budget value. This
  Specification resolves OD-8 by: (a) setting the budgets at 54 (51 for de-DE), the wider of the
  achievable window, and stating explicitly that this shrinks the model's own miscounting margin
  against the FROZEN ceiling from 7 characters to 1 for the general rows (4 for de-DE) — stated
  honestly, as of v6, as a partial, probabilistic shift toward a rarer, usually-but-not-always-cheap
  repair path, not a clean trade of a frequent unregistered-repair cost for a rarer registered one
  (FR-13(c) names the specific residual: `meta-title-length`'s own deterministic repair tier can
  itself strip the template's tail and land back on the unregistered `meta-title-template-shape`
  check); and (b) documenting the long-name case as an accepted, inherent limit of the approved
  template — not a defect this Story's numbers can be tuned to avoid — parallel to how FR-7 accepts
  `productShort()`'s over-capture cost as a stated bound rather than a defect to
  eliminate within this Story (FR-13(c), FR-8). Closing the long-name residual fully is out of scope
  here; it would require either shortening the approved template's components or a separate,
  further §9 authorization to touch `output-validator.ts`'s ceiling itself.

  **Superseded in part by v18 — see the "New in v18" bullet below.** Disposition (b) above — "the
  long-name case is an accepted, inherent limit... not a defect this Story's numbers can be tuned to
  avoid" — no longer describes what ships once `h1` itself reaches 54 Unicode code points or longer,
  regardless of why: new **FR-8(b)** gives that regime its own required, deterministic, always-
  reachable shape instead of letting the cascade degrade and fail, closing it rather than merely
  bounding it. Disposition (a) above — the budgets set at 54/51, with the resulting thinned margin
  against the untouched 55-char ceiling for `h1Len ≤ 53` — is a different mechanism FR-8(b) does not
  touch, and is unaffected. This Specification does not own `open_decisions`
  (`docs/decisions/US-3.1-open-decisions.md`, owned by `so-clarifier`) and cannot edit `OD-8`'s own
  recorded resolution text to reflect this; a follow-up correction pass there, to state that `OD-8`'s
  long-name half is superseded by `FR-8(b)` while its thinned-margin half stands, is flagged here as
  non-blocking and informational for the orchestrator, not performed by this stage.

Two further, non-blocking Open Decisions were explicitly delegated by CLARIFICATION to this
Specification stage to resolve, and remain resolved as in v3:

- **OD-4** — which file owns the new `meta_title`/`h1` validators. Resolved above (FR-7's note): a
  new sibling module, `src/utils/seo-metadata-shape.ts`, composed alongside `output-validator.ts`'s
  existing `seo_data` checks rather than added to that FROZEN file.
- **OD-6** — mandatory-presence vs. conditional-correctness for FR-7's brand-core check. Resolved
  above (FR-7): mandatory-presence, because only a presence requirement can catch the
  es-ES/pt-PT/en-ES name-dropping regression AC-3 exists to close, and because
  `slug-validator.ts`'s own code already behaves that way given non-empty inputs.

**Flagged for awareness at `HUMAN_SPEC_APPROVAL` (not a blocker, not a deviation requiring
ratification — the first three items resolved to match the Story/AC text as literally as the
evidence allows and are unchanged from v3; the fourth is new in v6; the fifth is new in v8; the
sixth was introduced in v9, corrected, in place, by v10, and further corrected, in place, by v17;
the seventh and eighth are new in v11; the ninth is new in v12 and further narrowed, in place, by
v15; the second is corrected, in place, by v17, per SPEC_REVIEW v15's Finding 1; the tenth is new in
v18; the fifth (OD-10) is further narrowed, in place, by v19, per SPEC_REVIEW v17's blocking finding;
an eleventh item, disclosing FR-8(b)'s own mid-word-truncation fallback, is new in v19; a twelfth
item, disclosing AC-7's own status as this Specification's addition rather than a Story criterion, is
new in v20):**

- **FR-3's export block now covers plain-text export, not only ZIP**, broadening v1's narrower
  reading of OD-1. See FR-3's own note for the evidence and reasoning. If the Owner intended the
  block to be ZIP-only specifically, that is a correction to make at this gate, not a silent
  narrowing this Specification should have made on its own.
- **FR-7 now ships at `error` severity with a registered repair strategy**, matching AC-3's literal
  text on severity and repair registration, rather than the `warning`/unregistered disposition
  SPEC_REVIEW v1 found undelegated.
  The accepted cost (a measured false-positive rate from `productShort()`'s known over-capture bias,
  now resolved mechanically via the repair ladder rather than left as a permanent warning) is stated
  in FR-7 itself. This is presented as the corrected, AC-3-literal disposition for the CTA-heading
  position, which is what OD-6's own evidence (the es-ES/pt-PT/en-ES CTA-heading regression) supports.
  **Corrected in v17 (SPEC_REVIEW v15's Finding 1): this bullet previously claimed "nothing here
  departs from AC-3's own text," which stopped being true once v16 narrowed `heading-brand-core-
  missing`'s mandatory-presence check away from the first-§3-heading position — a position AC-3's own
  parenthetical ("the other §3/§9 headings exempted by AC-2") can be read to name.** That departure,
  why it was made, and why the available alternative (conditional-correctness) was checked and
  rejected rather than adopted, is disclosed in full further below (the "New in v16" bullet on this
  narrowing) and in Background, v16/v17, point 2 — including the QA report's own "Что сделать"
  recommendation (line 84), which read alone asks for broader §3/§9 coverage than this Specification
  ships. If the Owner intended AC-3's parenthetical as a literal requirement at the first §3 heading
  regardless of that evidence, that is a correction to make at this gate.
- **FR-13(c)'s de-DE (≤51) and pl-PL (≤54) reconciled Title budgets are extrapolated, not
  evidence-driven** — `meta-titles.txt` supplies no reference `meta_title` example for either
  locale. de-DE's number preserves the existing table's own 3-character gap below the general row
  (a design choice already present in `task-b.ts`, attributed there to German content running
  20-30% longer); pl-PL is grouped with the other Latin-script rows on the same basis the existing
  table already uses. If the Owner has locale-specific data suggesting either number should differ,
  that is a correction to make at this gate, not something this Specification could derive from the
  evidence available to it.
- **FR-13(c)'s risk-transfer claim is now stated as a partial, probabilistic mitigation, not a
  settled one (new in v6, per SPEC_REVIEW v5's blocking finding).** The thinned ceiling margin (1
  character general, 4 for de-DE) usually, but not always, resolves cheaply through
  `meta-title-length`'s existing registered ladder — its deterministic tier can itself strip the
  template's `{Spec}`/`{Localized Category}` tail and land back on the unregistered
  `meta-title-template-shape` check. This is an accepted, bounded residual risk of the reconciled
  budget, not a defect blocking this Specification, but it means the Owner's "does not provoke
  unnecessary repair cycles" instruction is satisfied probabilistically for this interaction, not
  unconditionally — flagged here for awareness at approval, not as an unresolved question.
- **OD-10's residual is accepted as a named, bounded cost, not closed by a length-neutral substitution
  (new in v8).** This is a Specification-level choice between two available resolution paths — stated
  explicitly, not silently picked — made using this stage's own judgment per so-clarifier's explicit
  delegation: a length-neutral substitution was checked first and found to break `task-b.ts` line 40's
  H1-core-verbatim guarantee and corrupt the product name, without actually avoiding FR-8's own
  unregistered-repair cost, so it was reversed in favor of accepting OD-10's smaller, already-bounded
  ceiling-collision cost instead (reasoned at FR-13(b) and in Open questions above). If the Owner
  would prefer a different tradeoff (e.g. shortening the template to close the residual, or a further
  authorization to touch `output-validator.ts`), that is a correction to make at this gate.
  **Narrowed in v19:** the band this residual covers is narrower than stated when OD-10 was first
  resolved, now that `FR-8(b)` intercepts every `h1Len ≥ 54` entry first, before this cascade path is
  ever reached — see FR-13(b) and the OD-10 entry above for the corrected band, which is not fully
  closed and remains collision-live for de-DE, depending on an unspecified differentiation-marker
  length.
- **FR-7's Doc-path CTA-heading check, for a `schemaVersion: '4.0'` Doc, targets `doc.localizedName`
  rather than the dead `doc.cta.heading` field (v9 scoped the check away from v4 entirely; v10
  retargets it instead, per SPEC_REVIEW v8's blocking finding).** `render-description.ts` discards
  `doc.cta.heading` unconditionally for `schemaVersion: '4.0'` Docs and assembles the CTA heading that
  actually ships from `getRenderRules(storeName).ctaHeading(doc.locale, doc.localizedName)` instead — a
  function correct by construction *given a correct `doc.localizedName`* argument, which nothing
  validated before v10. Validating that function's own return value was, again, considered and
  rejected as redundant (see FR-7, Out of scope); validating its **input** was not redundant, was
  previously unvalidated, and is reachable by the same in-gate, field-scoped repair mechanism the
  Doc-path check already uses elsewhere — so v10 requires it. This is a scope/boundary clarification
  and correction of the existing, approved check, not a new feature or a reopening of OD-6's
  mandatory-presence decision — SPEC_REVIEW v8 itself names this as one of the fix's own two viable
  forms and does not treat it as an Owner-level judgment call. **As stated at v10, the Doc-path
  first-§3-heading check was unaffected, and the HTML/string-path check ran at both positions, for
  every translated locale and, where reached, the plain-HTML master; corrected in v17 (SPEC_REVIEW v15's
  Finding 1): as of v16, this is no longer accurate — the Doc-path first-§3-heading presence check has
  since been removed entirely, and the HTML/string-path form is narrowed to the CTA-heading position
  only, the same as the Doc-path form (see FR-7 and the "First-§3-heading position" bullet above).** The
  HTML/string-path check, at the CTA-heading position, for every translated locale and, where reached,
  the plain-HTML master, is unaffected by this v10-dated fix itself — but, per SPEC_REVIEW v8's finding
  and v10's correction, it is **not**, on its own, a real in-gate enforcement path for the Doc-pipeline
  master (v9's claim that it was is withdrawn; see Background). AC-3's *presence* requirement remains
  fully enforced for `schemaVersion: '4.0'` Docs by the Doc-path check **at the CTA-heading position**,
  in-gate, before render — not by the HTML/string-path, for the master, and not at the first-§3-heading
  position, where no presence check of either form runs as of v16. This closes the "core dropped
  entirely" direction only (the es-ES/pt-PT-shaped regression AC-3's own text targets); a
  `doc.localizedName` carrying *more* than the short form (the full/invariant name) still passes this
  presence check and remains FR-6's own, separately-scoped, non-blocking parallel gap for the v4 CTA
  position — see Out of scope. If the Owner would prefer a different mechanism (e.g. wiring
  the HTML/string-path check into `runDocGate()` itself against the rendered HTML, which this revision
  considered and rejected as a render-order restructuring — see Out of scope), that is a correction to
  make at this gate.
- **The `doc.localizedName` check now also requires the value to be a bare name, not merely to contain
  the `productShort()` substring, and its shared repair instruction is parameterized by path (new in
  v11, per SPEC_REVIEW v9's blocking finding).** v10 established addressability but left the repaired
  value's required shape unstated; a heading-oriented repair instruction applied unchanged to this
  non-heading leaf could return heading- or CTA-framed text that still passed a bare presence test.
  v11 adds a shape test (bare name, no sentence/CTA framing) for this leaf only, and parameterizes
  `heading-brand-core-missing`'s single `fieldInstruction` by `issue.path` rather than registering a
  second rule identity — a design choice this Specification makes explicitly (see Background, v11,
  point 2) so `so-planner` is not left to invent the dispatch mechanism from scratch. This narrows,
  not widens, what "presence" means for this leaf; it still does not check for **exclusivity** (a
  `doc.localizedName` carrying the full/invariant name with no framing still passes) — that remains
  FR-6's own, separately-scoped, non-blocking parallel gap, unaffected by this addition.
- **The Background's Cyrillic-unit/`productShort()` interaction paragraph (v10, point 4) misattributed
  its mechanism and risk polarity; corrected in v11 (Background, point 4; FR-7's Accepted-cost
  paragraph).** v10 attributed the exposure to post-render `normalizeDocProse`, which cannot affect
  what the pre-normalization `validate()` closure sees. The real, pre-validation mechanism is the
  Task-A model itself writing Cyrillic units into a heading-shaped field (including
  `doc.localizedName`) per `UNIT_LOCALIZATION_RULES`, before any validation runs — an in-gate false
  positive on an `error`-severity check, the opposite polarity from the false-negative, warning-severity
  cost `heading-product-name-stuffing` already accepts for the identical Latin-pattern/Cyrillic-unit
  mismatch. This is a factual correction to the Specification's own text, not a new cost: the existing
  registered ladder already covers it at the same bounded, probabilistic cost FR-7's `productShort()`
  over-capture case already accepts.
- **The `doc.localizedName` shape requirement's banned-character classes (sentence-terminal
  punctuation, quotation marks) are now exempt wherever the same character already occurs in
  `invariantCore(opts.input.name)` — the source name's own invariant span (new in v12, per SPEC_REVIEW
  v10's blocking finding).** v11 stated the shape requirement as an unqualified character-class ban,
  with no exemption for a character that is part of the product's own real name rather than added
  framing — evidenced against this Story's own corpus (`invariantCore('Filament Bambu Lab PETG 1.75
  mm')` → `'Bambu Lab PETG 1.75'`, `product-name-core.spec.ts:51`, an internal period that is
  designator-shaped, not framing). Applied unexempted, the shape test would fail every correctly-
  generated `doc.localizedName` for such a product, with FR-7 explicitly foreclosing the
  `NON_REGENERABLE_RULES` exclusion for this leaf on the premise that regeneration can always produce a
  compliant value — a premise sound only when the banned character was added framing. v12 resolves this
  the same way this Specification already resolved the structurally identical FR-13(b)/OD-10 concern:
  never satisfy a shape/verbatim rule by corrupting the actual product name. The exemption reference
  (`invariantCore(opts.input.name)`, the raw, pre-localization name) is deliberately not
  `doc.localizedName` itself, so a model cannot manufacture its own exemption by writing an arbitrary
  character into the value under test. This is a Specification-level choice among the options this
  round's finding raised — narrowing the banned-character set instead was considered and rejected,
  since it would also discard the check's power to catch genuine punctuation-bearing CTA/heading
  framing the evidence does not require giving up. If the Owner would prefer a different resolution
  (e.g. narrowing the banned set instead of adding a contextual exemption), that is a correction to
  make at this gate.

  **v13 — the exemption's occurrence semantics, left ambiguous in v12's wording, are now stated as a
  precise, mechanical rule: occurrence-count matching (per SPEC_REVIEW v11's blocking finding).** v12's
  normative sentence ("does not violate... when that exact character already occurs in
  `invariantCore(opts.input.name)`") was falsified by its own second worked example under the most
  natural (class-membership) reading, and the two readings that do reconcile the examples —
  occurrence-count and positional/substring-containment — diverge on a real, evidenced case: a
  uk-UA/ru-UA master where the model writes a Cyrillic-localized unit next to a decimal-bearing
  designator (Background, v11 point 4). v13 chooses occurrence-count: for each banned character, the
  candidate's count must not exceed `invariantCore(opts.input.name)`'s count of that same character,
  with no positional or contiguity requirement. This is chosen because it needs no notion of "position"
  defined across a value repair may reorder, and because it is the only one of the two readings that
  does not produce a false positive on the Cyrillic-unit case above (a correctly re-spaced, cyrillized
  unit is no longer a contiguous match against the source span, so positional-containment would
  wrongly reject it at `error` severity with no compliant repair available). v13 also enumerates the
  banned classes at their own edges — an ellipsis (`…`) is one code point, distinct from three ASCII
  periods (`...`); a bare comma and every apostrophe/single-quote-shaped character are excluded from
  both banned classes outright, not merely exempted — and adds a precise, code-checked acknowledgement
  that `invariantCore()`'s output cannot carry a line break except on its one narrow
  no-designator-token fallback path. If the Owner would prefer a different resolution (e.g. the
  positional/substring-containment reading, accepting its Cyrillic-unit false positive as a cost, or a
  different banned-class boundary), that is a correction to make at this gate.

  **v14 (SPEC_REVIEW v12 blocking finding):** v13's occurrence-count rule reconciled every worked
  example it stated, but SPEC_REVIEW v12 traced it against a shape none of them covered — a
  category/packaging stopword sitting between the initial designator and a trailing decimal (a nozzle
  diameter, a filament gauge after "Basic," a "+"-suffixed designator with a size) — where
  `invariantCore(opts.input.name)` stops scanning before the decimal, so the reference span carried zero
  instances of a character the full, unframed name legitimately carries one of, contradicting this
  clause's own "full name still passes" sentence. `productShort(opts.input.name)` was checked as a fix
  and ruled out (it can only equal or fall short of `invariantCore()`'s own output, never recover a
  character `invariantCore()` already missed). v14 instead corrects the reference span to
  `opts.input.name` itself, with no `invariantCore()`/`productShort()` extraction — provably a strict
  widening (every character `invariantCore()` contributes is drawn from a subset of the raw name's own
  tokens, so its counts can never exceed the raw name's own), so every prior worked example is
  unaffected and all three of SPEC_REVIEW v12's traced shapes now pass. v14 also removes the line break
  from the exemption's scope entirely (banned unconditionally, reconciling the carried non-blocking
  wording-consistency finding without depending on which reference string is in play) and restates the
  comma/apostrophe exclusion's grounding more precisely (the carried non-blocking citation finding). This
  closes SPEC_REVIEW v12's blocking finding on the shapes it traced; it is not asserted as a permanent
  close of every future edge case this exemption could face.

  **v15 (SPEC_REVIEW v13 blocking finding):** the same widening that closed v12's traced shapes also
  enlarged the already-named "drop-and-add" residual (v13, above) from a narrow, contrived precondition
  into the ordinary case for exactly those shapes — a bare short-form candidate could add one wholly
  unjustified trailing banned character and still pass, purely because the raw name's own dropped
  packaging tail happened to carry a character of the same class (e.g. `"Bambu Lab Hardened Steel."`
  against `opts.input.name = "Bambu Lab Hardened Steel Nozzle 0.4 mm"`). v15 adopts the Owner's
  recommended fix, independently verified against `product-name-core.ts` before being adopted: a
  trailing-position check, additional to occurrence-count, not in its place — a banned character that is
  the candidate's own trailing character is exempt only if `opts.input.name.trim()`'s own trailing
  character is also that same character. Verified to close the traced counter-example and its two
  sibling shapes, to still pass the legitimate full-name and Cyrillic-unit cases (both have their
  relevant banned character at an interior, not trailing, position), and to need no new tokenization
  machinery. Stated honestly as a narrowing, not a full close: a banned character inserted at an interior
  position, not the candidate's own trailing character, remains an accepted, narrower residual. If the
  Owner would prefer the alternative disposition (accepting the full, enlarged v14 residual instead of
  narrowing it), that is a correction to make at this gate.

- **New in v16 — `heading-brand-core-missing`'s mandatory-presence scope is narrowed from two blessed
  positions to the CTA-heading position only; this is a further refinement of OD-6, not a reopening of
  it, and not a new Open Decision.** OD-6 answered whether presence, once required, is mandatory or
  conditional — mandatory-presence is unchanged. v16 decides only which leaf(ves) that mandatory-presence
  check reads, the same kind of scope decision already made at v9/v10 for the `schemaVersion`-conditional
  CTA field: Impact Analysis v3 independently re-confirmed, by direct fixture read, that the golden
  corpus's own `functionality[0].heading` never names the product at all, and is real, human-accepted
  content, not a defect; the QA report's own brand-core-invariant finding evidences a regression only at
  the CTA-heading position. A second real corpus fixture (`center-3d-print-ortur-h20-20w.doc.json`)
  confirms presence at this leaf is a legitimate authorial choice made both ways in this Story's own
  accepted corpus, not an invariant. See FR-7 and Background, v16, point 2, for the full evidence trail.
  If the Owner would prefer to accept this as a named cost instead (parallel to the Cyrillic-unit
  exception), that is a correction to make at this gate.
- **New in v16 — the punctuation-free CTA/sentence-framing component of `doc.localizedName`'s shape
  requirement is accepted as a disclosed, unclosed residual, not closed by either candidate detector
  checked.** so-planner's implementation-plan v6 found, and this revision independently re-verified, that
  neither of FR-7's own "Illustrative boundary cases" that require no banned character (`"Buy the [name]
  Now"`, `"Technical specifications for the [name]"`) is rejected by the banned-character/occurrence-
  count/trailing-position mechanism v13-v15 specify. Two candidates were checked directly against every
  worked example and against this Story's own evidenced uk-UA category-first shape and both rejected: a
  core-position rule classifies every listed worked example correctly but rejects the legitimate
  category-first shape as leading framing, reintroducing the same false-positive class that already
  parked task T7 once; a word-count-margin rule under-catches short framings of the same word count as an
  already-passing example. v16 does not ship either — the framing/CTA-wording component is left as an
  accepted, disclosed gap, the same disposition already given to `productShort()`'s over-capture bias and
  the interior-position banned-character residual. This is a Specification-level choice among the options
  this round's own checking narrowed to, not a new Open Decision — so-planner explicitly declined to pick
  between them itself and asked Specification to weigh which evidenced cost is smaller. See FR-7 and
  Background, v16, point 1, for the full verification of both candidates. If the Owner would prefer to
  accept the core-position rule's category-first cost instead of leaving the framing detector unclosed,
  that is a correction to make at this gate.
- **New in v17 — the conditional-correctness alternative to v16's first-§3-heading removal was checked
  and rejected, per SPEC_REVIEW v15's Finding 2; v16's disposition (b) (remove the mandatory-presence
  check at that leaf) stands.** OD-6 itself originally named conditional-correctness — "if the heading
  names the product at all, the name must be correct; a heading naming no product is fine" — as an
  alternative to mandatory-presence, but v16 never checked it specifically for the first-§3-heading leaf
  before choosing removal. This revision defines the only two workable triggers for "the heading names
  the product at all" and rejects both: a whole-designator-string match (the existing
  `shortPattern`/`productNamePattern` idiom) cannot distinguish "no product name" from "product name,
  wrong" — both are "no match"; a token-presence/partial-match trigger is a new detector that reproduces
  the false-positive class already rejected for the core-position rule — verified directly against
  `product-name-core.ts`: `productShort('Makera Cyclone Dust Collector')` keeps "Dust"/"Collector" as
  designator-shaped tokens (neither is a listed `DESCRIPTOR_STOPWORDS` entry), so a trigger built from
  them could misfire on an unrelated English-language §3 heading sharing one of those common words. See
  Background, v17, point 2, for the full verification trail. **Separately disclosed here, per SPEC_REVIEW
  v15's own citation:** the QA report's "Что сделать" recommendation (line 84,
  `Knowledge/Issues/First_Batch/QA_report_makera_cyclone_2026-09-21.md`) reads, read alone, as asking for
  brand-core coverage at "all heading fields: `cta.heading`, h2/h3 in §3 and §9" — broader than either v16
  or this revision ships, and plausibly the source of AC-3's own parenthetical. The report's own
  observed-defect table, immediately above that recommendation, names no first-§3-heading regression on
  any generation this Story's evidence reaches, and this Specification's own two real corpus fixtures
  show the first §3 heading legitimately omits the product name in already-accepted, shipped content. This
  Specification does not resolve that tension by disregarding the recommendation; it discloses it here,
  having found no trigger mechanism that would let a broader check reach the recommendation's literal
  scope without the false-positive cost above. If the Owner intended AC-3's parenthetical, or the QA
  report's recommendation, as a literal mandatory requirement at the first §3 heading regardless of this
  evidence, that is a correction to make at this gate — a new detector or an accepted-cost disposition
  would then need to be designed, which this revision does not do unprompted.
- **New in v18 — `AC-4`'s "identically across all four locales" clause now has a disclosed exception,
  `FR-8(b)`, for `h1Len ≥ 54`, and `OD-8`'s own recorded disposition is superseded in part.**
  `PLAN_REVIEW` v8 found that `implementation_plan` v10's `D15` / `task_breakdown` v9's `T15` — sound,
  independently-verified engineering — ships a `meta_title` shape for this regime that this
  Specification's own text (through v17) did not authorize and that `OD-8`'s "the cascade must
  degrade for that product by design" disposition affirmatively contradicted, and correctly declined
  to pass that gap on to `TEST_WRITING` without a Specification amendment first (AGENTS.md §10 — an
  Owner instruction given informally to `so-planner` during `ARCHITECTURE_PLANNING` is not the same
  instrument as an approved Specification). `FR-8(b)` states the actual mechanism the Plan and Task
  Breakdown designed: for any locale whose `h1` is 54 Unicode code points or longer, `meta_title` is a
  deterministic, word-boundary-safe prefix of `h1` (never an interior edit or deletion, never a
  mid-word truncation) followed by a single differentiation mark, computed and applied unconditionally
  before validation runs — never the approved template shape, and not required or expected to be. This
  closes, rather than merely bounds, the long-name half of `OD-8`'s original disposition: every
  `h1Len`, however long, now has a defined, always-reachable, validator-required shape, with no
  dependency on the repair ladder or on the template being reachable at all. `OD-8`'s other half — the
  thinned `FR-13(c)` margin for `h1Len ≤ 53`, a different mechanism `FR-8(b)` does not touch — is
  unaffected and remains exactly as before. This Specification does not own `open_decisions`
  (`so-clarifier` does) and states this supersession here, in its own text, rather than editing
  `OD-8`'s recorded resolution directly; a follow-up correction pass to that artifact is flagged as
  non-blocking and informational for the orchestrator, not performed by this stage. If the Owner would
  prefer a different resolution for the `h1Len ≥ 54` case (e.g. a further §9 authorization to touch
  `output-validator.ts`'s ceiling itself, or shortening the approved template's components instead),
  that is a correction to make at this gate — the mechanism `FR-8(b)` states is what `implementation_plan`
  v10 designed and `PLAN_REVIEW` v8 independently verified sound, not a design this Specification
  originated. **One consequence disclosed here, not changed by this revision:** for a category-first
  `h1` (the translated category description leads, the brand/model span trails — exactly the real
  es-ES shape this Story's own evidence documents), a word-boundary-safe cut at 50 code points can land
  inside that trailing brand/model span itself, dropping part of it — e.g. the real es-ES `h1`
  (`"Toallitas de limpieza óptica Formlabs Optical Cleaning Cloths x100"`) truncates to
  `"Toallitas de limpieza óptica Formlabs Optical·"`, dropping `"Cleaning Cloths x100"` from the
  product's own designator span. This never edits or reorders any character `h1` contains — it is
  always a genuine, honest prefix, the property `D15` exists to guarantee — but it means the Owner's
  own "verbatim-honest title" framing for this case (Background, v18, point 2) does not guarantee the
  full brand/model designator survives in `meta_title` for every `h1` shape, only that whatever of `h1`
  is kept is kept unedited. If the Owner intended the differentiation mechanism to instead prioritize
  keeping the designator span intact over keeping the earliest 50 code points of `h1`, that is a
  correction to make at this gate — a different design, not a wording fix to this clause.
- **New in v19 (SPEC_REVIEW v17's finding, AC-4 axis) — `FR-8(b)`'s own narrow mid-word-truncation
  fallback is a second, disclosed departure from `AC-4`'s literal text, independent of the
  `h1Len ≥ 54` shape exception above.** `AC-4` names, as an explicit failure condition, a `meta_title`
  that diverges from the template shape "including mid-word truncation of the product name."
  `FR-8(b)`'s own required shape (above) cuts its `h1`-prefix at a word boundary whenever one exists
  within the first 50 code points of `h1` — but in the rare case where no such boundary exists at all
  within that span, the accepted fallback is a hard clip that cuts mid-word. This is a second, narrow
  departure from `AC-4`'s literal wording, already disclosed inside `FR-8(b)`'s own prose through v18
  but not carried through to this list or to the `AC-4` traceability row until now; it is named here
  explicitly the same way the `h1Len ≥ 54` shape exception itself is named, per SPEC_REVIEW v17's
  finding that a departure from an AC's literal, itemized failure condition needs to be disclosed
  where this document already discloses its other departures, not left implicit in the clause that
  creates it. It is not eliminated or redesigned by this disclosure — it is already-verified, accepted
  engineering (`implementation_plan` v10 §2.6 Residual 1; `task_breakdown` v9's own T15 tests), the
  same register this Specification already uses for `OD-8`'s and `OD-10`'s own accepted residuals and
  for FR-7's accepted `productShort()` over-capture cost. If the Owner would prefer the fallback
  closed instead (e.g. widening the boundary-search window, or accepting a longer marker to always
  find a boundary within it), that is a correction to make at this gate — a different design, not a
  wording fix to this clause.
- **New in v20 (loop-back from `ARCHITECTURE_PLANNING`, `implementation_plan` v12 §4c) — AC-7 is this
  Specification's own addition, not a criterion the Story itself states.** FR-14 and its AC-7
  traceability row exist because `pipeline_status` v11 §2 ("LEAD 1") found, during this Story's own
  delivery-pipeline testing against a real QA batch (`Knowledge/Issues/Second Batch/`), that
  `description-doc.schema.ts:216` requires a `schemaVersion: '4.0'` Doc's `cta.heading` to be
  non-empty even though the value is provably discarded at render time for that `schemaVersion`
  (`render-description.ts:443-449`; `task-a-doc.ts:148-150`), so the check fires, and spends a real
  repair-gate attempt, on every real v4 generation for a field with no output effect. No Story
  acceptance criterion named this defect — it surfaced only once this Story's own T1 was built and
  tested against real `schemaVersion: '4.0'` generations, the same class of "acceptance criteria that
  only surfaced once T7 was actually built" this Specification's own Background already documents for
  FR-7 (Background, `v9`). This Specification states AC-7 itself, as the acceptance-observable
  behaviour, rather than leaving `so-planner`/`so-builder` to infer one from `implementation_plan` v12
  §4c's orientation alone. If the Owner would prefer this criterion be added to the Story itself
  (`so-story-writer`'s territory) rather than stated only here, that is a correction to make at this
  gate — this Specification does not amend the Story file.

## Traceability matrix

| Acceptance criterion | Satisfied by | Notes |
|---|---|---|
| AC-1 | FR-1, FR-2, FR-3, FR-4, FR-5 | OD-1/OD-5 resolutions incorporated; FR-2 now also closes the repair-budget regression it would otherwise introduce; FR-3 now covers both export actions; FR-4 restates the unchanged Ortur H20 guarantee; FR-5 restates the README advisory-principle exception for both export actions |
| AC-2 | FR-6, FR-12 | OD-2 resolution (`productShort()`, not `invariantCore()`) incorporated; FR-12 closes the prompt-side contradiction that would otherwise keep causing the regression FR-6's validator fix catches |
| AC-3 | FR-7, FR-12 | OD-2 (form) and OD-6 (mandatory-presence, resolved here) both incorporated; FR-7 now ships `error` severity with a registered repair strategy, matching AC-3's "caught the same way slug drift already is" literally, at the CTA-heading position — as of v16/v17, AC-3's own parenthetical naming the first §3 heading is deliberately not applied there mandatory-presence-wise, a disclosed departure, not "no named deviation" (see the "New in v16"/"New in v17" bullets in Open questions); FR-12 addresses the same prompt-side contributing cause as for AC-2. **v9:** FR-7's Doc-path CTA-heading check was scoped away from `schemaVersion: '4.0'` Docs (`doc.cta.heading` is dead there — `render-description.ts:443-449`), on the claim that the HTML/string-path check covers it instead "for every `schemaVersion`." **v10 (SPEC_REVIEW v8 blocking finding):** that claim was false for the Doc-pipeline master — `runDocGate()` never runs the HTML/string-path check in-gate at all; only a post-hoc, non-repairing, non-gating pass (`runOutputValidation()`) touches the rendered master HTML. v10 retargets the Doc-path CTA-heading check, for `schemaVersion: '4.0'` Docs, to `doc.localizedName` — the actual, previously-unvalidated input `getRenderRules(...).ctaHeading()` substitutes into the shipped heading, reachable in-gate by the same field-scoped repair machinery already used for `doc.cta.heading`/`doc.functionality[0].heading`. As stated at v10, the Doc-path first-§3-heading check was unaffected and the HTML/string-path check ran at both positions for every translated locale and, where reached, the plain-HTML master — **corrected by v16/v17: the Doc-path first-§3-heading presence check has since been removed entirely, and the HTML/string-path form is narrowed to the CTA-heading position only** (see the v16/v17 entries below). AC-3's core-dropped-entirely direction is now satisfied end to end for the Doc-pipeline master, at the CTA-heading position, via the Doc-path check alone, in-gate, before render — not, as v9 claimed, via the HTML/string-path. This is a presence check, not an exclusivity check: a `doc.localizedName` carrying more than the short form still passes it and remains FR-6's own, separately-scoped, non-blocking parallel gap for the v4 CTA position (see Out of scope). **v11 (SPEC_REVIEW v9 blocking finding):** v10's presence check said nothing about the repaired value's required shape, and `REPAIR_STRATEGIES`'s one shared `fieldInstruction` per rule meant a heading-oriented repair could return heading-/CTA-framed text that still passed the presence test. v11 adds a shape requirement (bare name, no sentence/CTA framing) for the `doc.localizedName` leaf only, and parameterizes the single existing `fieldInstruction` by `issue.path` (mirroring `slug-name-designator-lost`'s bare-name wording for this leaf, `heading-product-name-stuffing`'s heading wording unchanged for the two heading leaves) — no new rule identity, per the precedent `heading-product-name-stuffing`'s own entry already sets for one rule dispatching by path shape. AC-3's presence guarantee for the Doc-pipeline master now also excludes a repair that only superficially satisfies it. **v12 (SPEC_REVIEW v10 blocking finding):** v11's shape requirement banned quotation marks and sentence-terminal punctuation with no exemption for a character already intrinsic to the product's own real name — evidenced against this Story's own `invariantCore()` corpus (an internal period surviving in `'Bambu Lab PETG 1.75'`), and, left unexempted, would fail every correctly-generated `doc.localizedName` for such a product at `error` severity with no compliant repair available, the same corruption concern this Specification already closed for FR-13(b)/OD-10. v12 exempts a banned character from the shape test when it already occurs in `invariantCore(opts.input.name)` — the untranslated source name's own invariant span, already computed at every call site in this codebase that also computes `productShort()` — closing the gap directly from that precedent and from `product-name-core.ts`'s existing helper, with no new Open Decision. **v13 (SPEC_REVIEW v11 blocking finding):** v12's exemption sentence and its own second worked example disagreed under the most natural (class-membership) reading, and the two readings that did reconcile the examples — occurrence-count and positional/substring-containment — diverged on a real, evidenced uk-UA/ru-UA Cyrillic-unit case this Story's own corpus already establishes. v13 states the rule precisely as occurrence-count matching (a per-character-code-point tally against `invariantCore(opts.input.name)`, with no positional or contiguity requirement), chosen because it is mechanically simpler and because it is the only one of the two readings that does not produce a false positive on the evidenced Cyrillic-unit case; v13 also enumerates the banned-character classes at their edges (ellipsis as one code point distinct from three periods; bare comma and apostrophe/single-quote characters excluded from both classes outright) and adds a code-checked acknowledgement of when `invariantCore()`'s output can carry a line break. **v14 (SPEC_REVIEW v12 blocking finding):** v13's rule reconciled every example it stated, but traced against a shape none of them covered — a category/packaging stopword between the designator and a trailing decimal (e.g. "Bambu Lab Hardened Steel Nozzle 0.4 mm") — `invariantCore(opts.input.name)` stopped scanning before the decimal, judging an unframed full name a violation. v14 corrects the reference span from `invariantCore(opts.input.name)` to `opts.input.name` itself (a provable strict widening — every character `invariantCore()` contributes is drawn from a subset of the raw name's own tokens, so its counts can never exceed the raw name's own), closing the traced gap without regressing any prior worked example, and separately reconciles the two carried non-blocking findings (line-break scope; comma/apostrophe grounding). **v15 (SPEC_REVIEW v13 blocking finding):** the same widening that closed v14's traced shapes enlarged the already-named "drop-and-add" residual from a narrow, contrived precondition into the ordinary case for exactly those shapes — a bare short-form candidate could add one wholly unjustified trailing banned character and still pass, purely because the raw name's own dropped packaging tail happened to carry a character of the same class. v15 adopts the Owner's recommended fix, independently verified against `product-name-core.ts` before being adopted: a trailing-position check, additional to occurrence-count — a banned character that is the candidate's own trailing character is exempt only if `opts.input.name.trim()`'s own trailing character is also that same character. This closes the traced counter-example and its two sibling shapes without regressing the legitimate full-name or Cyrillic-unit cases, and is stated honestly as a narrowing, not a full close: a banned character inserted at an interior position, not the candidate's own trailing character, remains an accepted, narrower residual. AC-3 is therefore `PASS` on FR-7's own terms as of v15, on the shapes traced against it to date — not asserted as a permanent close of every future edge case this exemption could face. **v16 (loop-back from ARCHITECTURE_PLANNING's implementation-plan v6):** two further scope corrections, both to FR-7 only. First, mandatory-presence is narrowed from the two blessed positions to the CTA-heading position alone — Impact Analysis v3 independently re-confirmed, by direct fixture read, that the golden corpus's own first §3 heading (`functionality[0].heading`) is genuinely product-name-free, human-accepted content with no corresponding QA-evidenced regression at that position (unlike the CTA heading), so the check no longer runs against that leaf; OD-6's own mandatory-presence answer is unchanged, only which leaf(ves) it governs narrows, the same kind of decision already made at v9/v10 for the `schemaVersion`-conditional CTA field — not a reopening of OD-6. Second, the punctuation-free CTA/sentence-framing component of `doc.localizedName`'s shape requirement (two of FR-7's own "Illustrative boundary cases," containing no banned character) is accepted as a disclosed, unclosed residual: a core-position rule and a word-count-margin rule were both checked directly against every worked example and against this Story's own evidenced uk-UA category-first shape and both rejected — the core-position rule reintroduces the same false-positive class that already parked task T7 once, on real, locale-native content. Neither correction is a new Open Decision; both are decided from this codebase's own fixtures, the QA report's own evidenced defect list, and this Story's own test anchors. AC-3's presence guarantee remains `PASS` at the CTA-heading position, on the same terms v15 already established; it is now honestly scoped to that one position, and the framing-detector gap is disclosed rather than silently unaddressed. **v17 (SPEC_REVIEW v15):** two fixes, no scope change. First, an internal-consistency defect — several passages outside FR-7's own text (including this cell's opening sentence and the v10 entry above) still asserted the pre-v16 two-position model or "no named deviation"; corrected in place. Second, the conditional-correctness alternative to v16's first-§3-heading removal (named by OD-6 itself) was checked this round and rejected — no workable trigger for "the heading names the product at all" avoids either the `shortPattern` idiom's no-match ambiguity or the token-presence false-positive class already rejected for the core-position rule; v16's removal stands. The QA report's own line-84 recommendation, which read alone asks for broader §3/§9 coverage, is now cited and disclosed rather than left uncited. AC-3 remains `PASS` at the CTA-heading position on the same terms v16 established |
| AC-4 | FR-8, FR-13 | OD-4 (file placement, resolved here) incorporated; FR-13(a) defines AC-4's actual `{Localized Category}`/`{Spec}` components (not an undefined `[Benefit]`) — closing the v2 gap SPEC_REVIEW v2 found, now authorized and finalized under **OD-9**. FR-13(c)'s budget-table reconciliation, needed for (a) to be reachable at the normal-case rung for most locales, is applied under the Owner's granted **OD-7** authorization with concrete reconciled numbers (≤54 general, ≤51 de-DE), stated alongside the accepted **OD-8** tradeoff (1-character margin for the general rows, 4 characters for de-DE, against the untouched 55-char ceiling). FR-8's validator is fully specified and unblocked. **FR-13(a) and FR-13(d)'s line-47 half, as of v8, are authorized under OD-9 and finalized, no longer `BLOCKED`.** **v18 (PLAN_REVIEW v8 blocking finding):** `AC-4`'s "identically across all four locales" clause, as written, does not literally describe every `h1Len` this Story's own real regenerations produce — for any locale whose `h1` is 54 Unicode code points or longer, no template-shaped `meta_title` can ever satisfy both the template and the untouched 55-char ceiling. New **FR-8(b)** states this as an explicit, disclosed exception rather than an unauthorized departure: for that regime, `meta_title` takes a different, deterministic, always-reachable shape (a word-boundary-safe, non-interior-edited prefix of `h1` plus a single differentiation mark) instead of the template, applied unconditionally before validation. This supersedes, for the `h1Len ≥ 54` sub-case only, this Specification's own prior reading of `OD-8` as leaving that case an accepted, undesigned-around residual ("the cascade must degrade for that product by design") — `OD-8`'s other half, the thinned `FR-13(c)` margin for `h1Len ≤ 53`, is untouched and remains exactly as before. **AC-4 is therefore `PASS` on FR-8(a) for `h1Len ≤ 53`, on FR-8(b) for `h1Len ≥ 54`, and on all of FR-13(a)-(d)**, with the `h1Len ≥ 54` exception to "identically across all four locales" now stated explicitly rather than silently narrowed — see FR-8(b) and Open questions. **v19 (SPEC_REVIEW v17's blocking finding):** `AC-4`'s literal failure condition also names "including mid-word truncation of the product name" as a failure — a condition `FR-8(b)`'s own narrow fallback (a hard clip, used only in the rare case where no word boundary exists within the first 50 code points of `h1`) permits. This is a second, independent departure from `AC-4`'s literal text, disclosed here explicitly the same way the `h1Len ≥ 54` shape exception itself is disclosed, rather than left implicit inside `FR-8(b)`'s own prose (SPEC_REVIEW v17's finding). It is not eliminated or redesigned by this disclosure — it is already-verified, accepted engineering (`implementation_plan` v10 §2.6 Residual 1; `task_breakdown` v9's own T15 tests), the same register this Specification already uses for `OD-8`, `OD-10`, and FR-7's accepted `productShort()` over-capture cost. **AC-4 remains `PASS`**, with both the `h1Len ≥ 54` shape exception and this narrow mid-word-truncation fallback now disclosed explicitly — see FR-8(b) and Open questions |
| AC-5 | FR-9, FR-13 | FR-9's validator is fully specified and unblocked. FR-13(b) requires both the step-3 LAST RESORT rung (`task-b.ts` line 48) **and** the line-49 overflow rule fixed so neither can ever emit a `meta_title` byte-identical to `h1` — closing the line-49 gap SPEC_REVIEW v3 found unaddressed in v3's own FR-13(b) — not only that FR-9's validator reject the case after the fact. **FR-13(b), as of v8, is authorized under OD-9 and finalized, no longer `BLOCKED`**, and requires the fix to append after the H1 core (never substitute inside it, per `task-b.ts` line 40's verbatim-prefix guarantee — this Specification's own v8 resolution of the non-blocking **OD-10** residual, checked against a length-neutral alternative and reversed once that alternative was found to corrupt the product name without avoiding FR-8's own repair-cost path). The resulting bounded ceiling-collision cost (one exact H1-core length for the general rows; up to four for de-DE) is accepted, parallel to **OD-8**. FR-13(c)'s now-reconciled, wider budget (≤54/≤51, already authorized) reduces how often the line-49 terminal overflow rung is reached at all for the sampled locale-shapes, but does not substitute for fixing the rung itself. **v19 (SPEC_REVIEW v17's blocking finding):** the band in the previous sentence is the pre-`FR-8(b)` band and is now stale. With `FR-8(b)` intercepting every `h1Len ≥ 54` entry before this cascade path is ever reached, the general-row collision case (H1-core length exactly 55) is no longer reachable at all, and de-DE's remaining band narrows from 52-55 to 52-53 — itself collision-live only depending on the differentiation marker's own length `m` (`m ≥ 4` for a 52-length core, `m ≥ 3` for 53), left to `so-planner`/the implementer. This narrows, but does not fully close, the residual FR-13(b)/OD-10 accepts — see FR-13(b) for the corrected statement in full. AC-5 is therefore `PASS` on FR-9 and on all of FR-13(b)/(c), with this correction disclosed rather than left stale |
| AC-6 | FR-10, FR-11 | FR-10 now requires both `path` addressability and a preserved repairable value, closing the structural unreachability SPEC_REVIEW v1 found |
| **AC-7** (new, v20 — this Specification's own addition, not a Story acceptance criterion) | FR-14 | The Story (`docs/stories/US-3.1-qa-gate-brand-core-fixes.md`) lists only AC-1 through AC-6; it predates the `Second Batch` QA finding this row traces to and is not amended by this Specification (Story amendment is `so-story-writer`'s territory, not `so-spec-writer`'s). **AC-7, stated here:** `ProductDescriptionDocSchema` does not require a `schemaVersion: '4.0'` Doc's `cta.heading` to be non-empty (the value has no effect on the rendered artifact for that `schemaVersion` — `render-description.ts:443-449`); a `schemaVersion: '3.0'` Doc's `cta.heading` remains required non-empty, unchanged (`render-description.ts:450` reads it verbatim). Adjacent to, but distinct from, AC-6: AC-6 is about making an already-firing `doc-schema` finding cheaper to repair (FR-10); AC-7 is about this one finding not firing at all when the field it fires on has no output effect — a narrower, more complete fix for this one field, not a restatement of AC-6. `so-plan-reviewer` and `so-reconciliation-reviewer` should treat AC-7 as this Specification's own criterion for FR-14 specifically |

---
artifact: specification_review
story: US-3.1
version: 19
status: APPROVED
owner: so-spec-reviewer
created_at: 2026-09-29T22:00:00Z
updated_at: 2026-09-29T22:00:00Z
supersedes: docs/reviews/specifications/US-3.1-spec-review.md#18
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 20
  - key: open_decisions
    version: 4
  - key: clarification_report
    version: 3
open_decisions_blocking: false
---

# Spec Review: US-3.1 — Make the repair gate actually block ungrounded content and stop the brand-core/heading-form rule conflict (v19)

**Verdict:** PASS
**Loop-back:** n/a

> A `PASS` here is **not** human approval. Approval is recorded only by `/so:approve`
> (AGENTS.md §10).

## Summary

Specification v20 is a narrow, well-bounded amendment: exactly one new Functional Requirement
(`FR-14`, relaxing `cta.heading`'s non-empty schema requirement to `schemaVersion: '4.0'` only) and
one new Acceptance Criterion (`AC-7`), triggered by a loop-back from `ARCHITECTURE_PLANNING`
(`implementation_plan` v12 §4c), not by a new Open Decision. `FR-14` states acceptance-observable
behaviour only and correctly reserves the Zod mechanism to `so-planner`; its scope-narrowing against
`cta.text` and `FR-7`/`FR-10` is stated explicitly, twice, independently confirmed accurate against
live source. The one substantive judgement call this round — `AC-7` being the Specification's own
addition rather than a Story-stated criterion — is genuinely and repeatedly disclosed (front matter,
Summary, a dedicated `HUMAN_SPEC_APPROVAL` bullet, and the `AC-7` traceability row itself, which
explicitly distinguishes it from `AC-6`) and is procedurally sound given `so-planner`'s loop-back
routed here rather than to `CLARIFICATION`/`STORY_WRITING`. `PASS`, with one substantive-but-
non-blocking finding recorded below (recommend the Owner also decide, at this gate, whether
`so-story-writer` should formally add `AC-7` to the Story file) and the cosmetic hygiene notes
already carried through prior rounds.

## 1. Acceptance-criterion coverage

Matrix re-derived from the Story (`docs/stories/US-3.1-qa-gate-brand-core-fixes.md`, v1 — still
lists only AC-1 through AC-6; not amended by this Specification), not read back from the
Specification.

| AC | Story says | Specification satisfies it via | Verdict |
|---|---|---|---|
| AC-1 | Retry-with-backoff on grounding; hard-block export on unresolved failure; no silent fallback | FR-1–FR-5 | covered (unaffected by v20) |
| AC-2 | Full-pattern branch respects the same blessed-position exemption as short-pattern branch | FR-6, FR-12 | covered (unaffected by v20) |
| AC-3 | Brand-core invariant extends to `doc.cta.heading` (and the AC-2-exempted headings) | FR-7, FR-12 | covered, CTA-heading-only disclosed narrowing (unaffected by v20) |
| AC-4 | `meta_title` follows the single approved template, identically across locales, no site suffix, fails on template divergence incl. mid-word truncation | FR-8(a), FR-8(b), FR-13 | covered, both disclosed departures named (unaffected by v20) |
| AC-5 | `h1`/`meta_title` never byte-identical | FR-9, FR-13 | covered (unaffected by v20) |
| AC-6 | `doc-schema`/`slug-name-designator-lost` get ladder entries | FR-10, FR-11 | covered (unaffected by v20); FR-14 does not touch FR-10 — independently confirmed at FR-14's own "Scope, stated narrowly" paragraph (spec line 2974) |
| **AC-7 — not in the Story** | *(no Story text — see below)* | FR-14 | **Specification-originated; see judgement below** |

Requirements tracing to no acceptance criterion (scope creep): none — FR-14 traces to AC-7. The
question this round is the reverse direction: an AC with no Story origin.

**AC-7 — is a Specification-invented Acceptance Criterion legitimate here?** Independently
verified, not accepted on the Specification's own say-so:

- **The disclosure is real and appears everywhere it should.** Re-read all four places `AC-7`
  is surfaced: front matter (spec lines 63-66, "this Specification's own addition; the Story
  itself... is not amended by this stage and still lists only AC-1..AC-6"); the Summary
  paragraph (spec lines 313-314, identical wording); a dedicated `HUMAN_SPEC_APPROVAL` bullet
  (spec lines 3639-3654, "New in v20... AC-7 is this Specification's own addition, not a
  criterion the Story itself states," ending with "If the Owner would prefer this criterion be
  added to the Story itself (`so-story-writer`'s territory)... that is a correction to make at
  this gate — this Specification does not amend the Story file"); and the `AC-7` traceability
  row itself (spec line 3666), which states the same disclosure inline and additionally
  distinguishes `AC-7` from `AC-6` ("AC-6 is about making an already-firing `doc-schema` finding
  cheaper to repair (FR-10); AC-7 is about this one finding not firing at all when the field it
  fires on has no output effect"). Cross-checked against Story v1 directly: confirmed the Story's
  own Acceptance criteria section (lines 90-116) lists only AC-1 through AC-6, with no reference
  to `cta.heading`'s unconditional non-empty requirement anywhere in the Story text. The
  disclosure claim is accurate.
- **The routing that produced this was not so-spec-writer's own choice.** Front matter (spec
  lines 29-31) and `open_decisions` v4 both confirm the loop-back that produced v20 originated at
  `ARCHITECTURE_PLANNING` (`implementation_plan` v12 §4c returning `CHANGES_REQUIRED`,
  loop-back key `changes_required`, to `SPECIFICATION`) — a routing decision made by
  `stage-map.yaml`, not by `so-spec-writer` itself. `so-planner`, finding no FR authorized the
  schema relaxation it needed to design, correctly declined to invent that authorization and
  looped back to the stage the workflow assigns for "the Specification doesn't cover this."
  Given that routing, `so-spec-writer` had two honest options: state `FR-14` with no traceability
  row (which axis 1 of this very review treats as scope creep — "An FR tracing to no AC is scope
  creep") or invent a disclosed `AC-7`. The second is the better of the two available choices
  inside `so-spec-writer`'s own authority.
- **The substance is narrow, evidenced, and consistent with the Story's own theme.** The
  underlying defect (an unconditionally-required `cta.heading` that is provably discarded at
  render time for `schemaVersion: '4.0'`, burning a real repair-gate attempt on every v4
  generation) is exactly the class of problem this Story's own AC-6 already exists to address —
  disproportionate repair cost from a schema constraint that doesn't need to fire. `FR-14`'s
  three file:line citations (`description-doc.schema.ts:216`, `render-description.ts:443-450`,
  `task-a-doc.ts:148-150`) were independently re-read against live source this round (not
  accepted from the Specification's own quotation) and match exactly, including the verbatim
  prompt-text quote from `task-a-doc.ts:148-150`.
- **What is not fully resolved by disclosure alone.** This review's own operational contract
  (axis 1) assumes acceptance criteria are Story-owned; `AC-7` breaks that assumption, honestly.
  A cleaner resolution exists in principle — a formal Story amendment by `so-story-writer` adding
  a real `AC-7` — but neither `so-spec-writer` nor this reviewer has the authority to compel that
  (this skill's own loop-back targets are `SPECIFICATION` or `CLARIFICATION` only; there is no
  direct route to `STORY_WRITING` from here). Recorded as a non-blocking finding below rather than
  a `CHANGES_REQUIRED`, because the Specification already does everything within its own authority
  to flag this precisely for the human gate, and forcing a `CLARIFICATION` loop-back to relay the
  identical question `so-spec-writer` has already asked plainly would add a cycle without adding
  information.

## 2. Non-verifiable language

- **FR-14** — checked in full for invented-mechanism or untestable phrasing. The one hedge worth
  quoting: "`cta.heading` may be empty (**or otherwise absent of enforced content**) for
  `schemaVersion: '4.0'`" (spec line 2950). A test would have to invent: what "absent of enforced
  content" means beyond "empty string" (e.g. whether `undefined`/missing-key is also intended to
  be covered). This is a minor imprecision, not a blocking one — the requirement's core, testable
  claim ("validation does not fail... because `cta.heading` is an empty string," spec line 2949)
  is stated in unambiguous, directly testable terms, and the parenthetical reads as future-proofing
  rather than the operative failure condition. Not blocking; worth tightening if `FR-14` is
  touched again.
- No other new non-verifiable language found in v20's edits (front matter, Summary, the Scope/
  Surface table row, `FR-14` itself, the `cta.text`/`FR-7` cross-reference bullet, the
  `HUMAN_SPEC_APPROVAL` intro-sentence ordinal update, the new `HUMAN_SPEC_APPROVAL` bullet, and
  the `AC-7` traceability row).
- Carried forward, unaffected by v20: `FR-8(b)`'s "within its first 50 code points" vs. "at most
  50... total" boundary-window imprecision (spec lines 2410-2419, first flagged SPEC_REVIEW v17,
  still present, still non-blocking).

## 3. Contradictions with the Story

None found. `FR-14`/`AC-7` state a requirement the Story's own text is silent on — the Story
predates the `Second Batch` QA finding this row traces to (confirmed: Story `created_at`
2026-09-22; the trigger defect was surfaced during this Story's own `T1` delivery-pipeline
testing, necessarily after the Story was written) — silence is not contradiction. `FR-14`'s own
"Scope, stated narrowly" paragraph (spec lines 2967-2979) is explicit that it does not relax
`cta.text`, does not reopen `FR-7`'s Doc-path `heading-brand-core-missing` check, and does not
touch `FR-10`'s repair-ladder entry; independently re-checked against `FR-7`'s and `FR-10`'s own
live text and confirmed neither is edited by v20. A second, minimal cross-reference bullet (spec
lines 3118-3125, inside the "considered and rejected" list) restates the `cta.text`/`FR-7` half of
this narrowing — redundant with `FR-14`'s own text but not scope creep: it exists at the point a
reader scanning that list would otherwise wonder whether `FR-14` reopens either.

## 4. Scope creep

- Out of scope section present and non-empty: **yes** (spec lines 3038-3068, unchanged by v20 —
  confirmed by re-reading it in full this round; nothing in it is contradicted by `FR-14`, and
  nothing new needed adding there since `FR-14` touches no FROZEN file and no renderer/prompt
  behaviour).
- Diff scope, independently re-derived (not read back from the Specification's own account):
  grepped the full document for `v20` and confirmed every hit falls inside one of: the front-matter
  comment (lines 29-67), the Summary paragraph (lines 295-318), the Scope/Surface table row (line
  1591, adding `src/domain/description-doc.schema.ts` — confirmed **not** on the FROZEN list,
  `AGENTS.md` §9 lines 449-455), the `FR-14` section itself (lines 2924-2980), the minimal
  `cta.text`/`FR-7` cross-reference bullet (lines 3118-3125), the `HUMAN_SPEC_APPROVAL` intro
  sentence's ordinal update (line 3335), the new `HUMAN_SPEC_APPROVAL` bullet (lines 3639-3654),
  and the `AC-7` traceability row (line 3666). Nothing else in the document changed — `FR-1`
  through `FR-13`, `NFR-1`–`NFR-5`, the `Out of scope` section, and every other traceability row
  are byte-identical to v19 in substance. This matches exactly the amendment's own stated scope;
  no undisclosed scope creep found.
- No requirement was found that nobody asked for, in the sense of being ungrounded — `FR-14` is
  grounded in a re-verified, reproducible live defect (`Knowledge/Issues/Second Batch/`,
  independently re-confirmed against source this round). The live question is not "was this
  asked for" (it was — by this Story's own delivery-pipeline testing) but "who is authorized to
  state it as an Acceptance Criterion" — addressed under axis 1 above, not re-litigated here.

## 5. Missing edge cases, boundaries and failure paths

| Area | Checked | Finding |
|---|---|---|
| FR failure paths | `FR-14`'s own "Failure path" paragraph (spec lines 2961-2965) | Clear — states both directions: a v4 Doc failing/spending a repair attempt on empty `cta.heading` is the regression closed; a v3 Doc accepting empty/missing `cta.heading` is an equally-named failure of the unchanged half |
| `schemaVersion` exhaustiveness | Re-read `src/domain/description-doc.schema.ts:180`: `schemaVersion: z.enum(['3.0', '4.0'])` | Clear — only two values exist; FR-14's binary `'3.0'`/`'4.0'` treatment is exhaustive, no third state left unaddressed |
| Locale fan-out (uk-UA master → derived locales) | FR-14 is locale-generic (keyed on `schemaVersion`, not locale) | Clear — not applicable; no locale-specific behaviour introduced |
| Store scope vs STORE_REGISTRY | FR-14 touches no store-scoped data | Clear — not applicable |
| §4 invariants that must survive | Checked AGENTS.md §4 (SEO/meta_title/meta_description bullet, lines 226-231) for any CTA-heading criterion FR-14 might touch | Clear — no §4 criterion mentions `cta.heading`; FR-14 is schema-validation logic, not a renderer or generated-HTML output-shape change, consistent with the Story's own "Touches generated HTML? No" scope line |
| Provider behaviour (retry, timeout, 429, malformed JSON) | Not applicable — FR-14 is a static schema constraint, no provider call involved | Clear |
| Empty / boundary inputs | FR-14(a)/(b) themselves are the empty-input case (empty `cta.heading`) | Clear — both schemaVersion branches of the boundary are explicitly stated |

## 6. Compliance with AGENTS.md

| Check | Result |
|---|---|
| §4 criteria in play quoted **verbatim** and cited, not paraphrased | N/A for FR-14 — no §4 criterion governs `cta.heading`; re-confirmed against AGENTS.md §4 (lines 226-231) this round. Pre-existing §4 quote (FR-8/FR-9, spec lines 2783-2787 against AGENTS.md lines 227-231) unaffected by v20 |
| §9 FROZEN-file impact named and acknowledged | Yes — `src/domain/description-doc.schema.ts` is independently confirmed **not** on the FROZEN list (AGENTS.md §9, lines 449-455: `task-a.ts`, `task-b.ts`, `task-c.ts`, `master-system-prompt.ts`, `output-validator.ts` only); the Scope/Surface table row states this explicitly ("not a FROZEN file, no §9 authorization needed," spec line 1591) — correct, and correctly disclosed rather than silently assumed |
| §3 architecture rules not violated — incl. Rule 2, review-only | Yes — FR-14 is a domain-schema validation change; no retrieval/generation coupling introduced |
| §11 no blocking Open Decision left unaddressed | Yes — `open_decisions` v4's own front matter confirms `open_decisions_blocking: false`; independently re-read v4 in full this round and confirmed OD-1 through OD-9 resolved, OD-10 non-blocking (delegated to Specification, addressed at FR-13(b), unrelated to FR-14); no Open Decision names FR-14's trigger at all — consistent with it being a fresh loop-back from ARCHITECTURE_PLANNING, not an Open-Decision-gated item |
| No implementation design leaked in | Yes — FR-14 explicitly reserves the Zod mechanism to `so-planner` ("a field change, a refinement, or another shape... is an implementation decision, not stated here," spec lines 2977-2979); no file name beyond `description-doc.schema.ts` itself (the file the requirement is inherently about) and no function signature or Zod construct is named |

## Verdict rationale

`PASS`. `FR-14` is written at the correct altitude (acceptance-observable behaviour, mechanism
reserved to `so-planner`), its scope-narrowing against `cta.text`/`FR-7`/`FR-10` is explicit and
verified accurate against live source, its three evidentiary citations are independently
re-confirmed exact, and its non-FROZEN-file status is independently re-confirmed against AGENTS.md
§9. The one point requiring judgement — `AC-7` being invented by the Specification rather than the
Story — is disclosed at every place this review checked, is the better of the two choices available
to `so-spec-writer` given `so-planner`'s own loop-back routing, and does not misrepresent itself as
Story-derived anywhere in the document. It is recorded as a non-blocking finding, not a
`CHANGES_REQUIRED`, because looping back would not produce a different or better-informed outcome
than the disclosure already sitting at `HUMAN_SPEC_APPROVAL` — the Owner is the party who can
actually decide whether a Story amendment is warranted, and the Specification already asks them to.
No other axis found a gap: the diff is confirmed, by independent re-derivation, to be exactly
`FR-14`/`AC-7` plus their minimal necessary cross-references — nothing broader.

## Non-blocking findings

- **`AC-7` is a Specification-invented Acceptance Criterion, not a Story-stated one.** Fully and
  repeatedly disclosed (see axis 1 above); procedurally sound given the loop-back's own routing to
  `SPECIFICATION`. Recommend the Owner, at this gate, also decide whether `so-story-writer` should
  formally add `AC-7` to `docs/stories/US-3.1-qa-gate-brand-core-fixes.md` — doing so would restore
  the normal Story-owns-ACs invariant this review's own acceptance-criterion-coverage axis assumes,
  for this and any future Story that reuses this pattern. Not a gate on this Specification.
- **The parenthetical "(or otherwise absent of enforced content)" in FR-14(a)** (spec line 2950) is
  a minor imprecision against an otherwise fully testable requirement (see axis 2). Worth tightening
  the next time FR-14 is touched; does not affect the requirement's actual, testable core claim.
- **Carried forward from SPEC_REVIEW v17/v18, unaffected by v20:** `FR-8(b)`'s prefix-boundary
  wording imprecision (spec lines 2410-2419); the "Open questions" section header still reads "No
  blocking item remains as of v18" (spec line 3185) rather than v19 or v20 — the underlying claim
  remains true (OD-1 through OD-10 all resolved or non-blocking, independently re-confirmed against
  `open_decisions` v4 this round), so this is a stale version tag, not a substantive gap; the
  `HUMAN_SPEC_APPROVAL` intro sentence's ordinal cross-references still track "chronological
  `New in vN` additions," not literal list position, for the same reason SPEC_REVIEW v18 already
  found non-blocking for the v19 "eleventh item" reference — the v20 "twelfth item" reference (spec
  line 3333) follows the identical, internally-consistent-but-easy-to-misread convention and is
  carried forward on the same basis, not re-litigated as a new finding. Also carried forward,
  unaffected by v20: `open_decisions` v4's own `OD-8` text not yet corrected for `FR-8(b)`'s
  supersession; FR-7's accepted `productShort()` over-capture cost; the interior-position
  banned-character residual; the `checkProductNameStuffingDoc`/`doc.cta.heading` parallel gap
  (FR-6's Doc-path).

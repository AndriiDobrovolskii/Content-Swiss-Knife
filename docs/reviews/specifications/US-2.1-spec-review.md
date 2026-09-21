---
artifact: specification_review
story: US-2.1
version: 2
status: ARCHIVED
owner: so-spec-reviewer
created_at: 2026-09-19T15:00:00Z
updated_at: 2026-09-20T09:00:00Z
supersedes: docs/reviews/specifications/US-2.1-spec-review.md#1
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 2
  - key: open_decisions
    version: 2
open_decisions_blocking: false
---

# Spec Review: US-2.1 — Migrate product descriptions to the v4.0 UA content schema

**Verdict:** PASS
**Loop-back:** n/a

> A `PASS` here is **not** human approval. Approval is recorded only by `/so:approve`
> (AGENTS.md §10). This verdict is a verdict about the document; it does not open the human gate
> and must not be reported as though it did.

## Summary

This is a re-review of Specification **v2** against v1's four blocking findings. **All four are
resolved in the document text**, not merely claimed in a summary: FR-27..FR-29 carry v4 §3
«Функціональність» with its own citations, FR-4 states in so many words that a `'4.0'` §2 is one
`<h2>` and one `<ul>` and nothing else while `'3.0'` keeps all four Block kinds, FR-23 re-grounds
the §4 first-image criterion on *rendered document order* and names the position-walk hazard, and
FR-17 is rewritten as a document-level cross-collection invariant with the numbers that show why.
All eight non-blocking items from v1 also landed in the text. Every citation added by v2 was
checked against the primary source and every one holds. The residue is one clause: FR-27's H3 rule
names a "structural defect" that neither FR-17's list of validated checks nor FR-28's prose-only
declaration accounts for — an enforcement-status gap, not a behavioural one, and therefore
non-blocking.

## 0. Disposition of the v1 blocking findings

Each verified against the v2 document text and against the cited primary source. A claim in the
Revision-note table was not accepted as evidence for any row.

| v1 finding | Where v2 answers it | Verified | Status |
|---|---|---|---|
| 1 — v4 §3 «Функціональність» absent | FR-27, FR-28, FR-29 (`spec:506-586`), plus FR-20's new paragraph and two traceability rows | Every v4 citation re-checked: `:349-351` is `## § 3 Функціональність` / `*Без обмеження обсягу \| Блоки H2/H3 \| **Обов'язково***`; `:355` carries «Ліміт не встановлюється»; `:359` carries the anti-duplication prohibition **and** «Скорочення заради "короткого опису" … заборонено»; `:364-366` is the H2/H3 rule; `:380-388` is the «**Рекомендований** порядок секцій H2» table; `:394` is «Кожен блок H2: мінімум 2 речення»; `:396` is the Killer-Specs-figure rule. All exact. | **RESOLVED** |
| 2 — FR-4 silent on the non-`bullets` Block kinds | FR-4 "Composition of the §2 block" (`spec:136-166`) | The document states it: "For a document carrying `schemaVersion: '4.0'`, §2 renders **exactly one `<h2>` and exactly one `<ul>`, and nothing else**", and names `paragraph`, `figure` and `video` as "**not legal inside §2 of a `'4.0'` document**", with `'3.0'` keeping all four kinds under OD-2. The four consequences are stated rather than left to inference. | **RESOLVED** |
| 3 — FR-23 asserted "Preserved" against the §2 merge | FR-23 "What the §2 merge does to the first-image rule" (`spec:652-679`) | The criterion is re-grounded as a property of rendered document order, the `'3.0'`/`'4.0'` divergence in *which source image* is eager is accepted explicitly, and the known failure mode is cited: `src/render/render-description.spec.ts:664-669` — verified, `:664` is `it('counts an applications figure in DOCUMENT order, so it is lazy', …)` and `:665-668` is the `figurePositions()` / `lcp-image-lazy` comment. | **RESOLVED** |
| 4 — FR-17 misdescribed the §2 ceiling | FR-17 point 2 (`spec:426-452`) | Rewritten as a **document-level cross-collection invariant**, with the three bounds re-cited and all three verified: `killerSpecs` `.min(3).max(4)` at `description-doc.schema.ts:160`; `keyBenefits: z.array(RelaxedBlockSchema).min(1)` at `:162` with no maximum on Blocks; each `bullets` Block `.min(minBulletItems).max(8)` at `:100`. The "4 + 8 + 8 + …" illustration is accurate against today's schema. | **RESOLVED** |

**Finding 1's second limb is discharged too, and that is worth naming.** v1 blocked partly because
"FR-20 requires the v4 heading hierarchy (H2/H3) … preserved in every locale. The Specification
never states what that hierarchy is for §3, so FR-20 is partly unsatisfiable as written." v2 adds a
paragraph to FR-20 (`spec:494-496`) binding it to "§3's H2/H3 rule as stated in FR-27" and spelling
out what a translated locale may not do ("does not promote an H3 to an H2, collapse two H2 groups
into one, or introduce a heading level the master does not have"). FR-20 is now satisfiable.

## 0b. The flagged item — do FR-27..FR-30 require a Story amendment?

**No. This is not scope creep, and no Story amendment is needed.** Judged on the merits rather than
on the precedent alone:

1. **Three of the four exist because this review demanded them.** v1 finding 1 was blocking and
   said, in terms: "Stating that §3 is unchanged would also close this, if that is the intent — but
   it must be stated." FR-30 answers v1's non-blocking repair-exhaustion item, which was raised
   against FR-15's own "every new generation emits `'4.0'`". Rejecting them now as unrequested would
   be incoherent with the verdict that produced them.
2. **The scope they occupy is settled, not invented.** The Story's own Context says "the delta for
   this Story is the whole v4 document" (`story:31`) and OD-1 settles the same ("v4 is the single
   source of truth … every v4 word limit, H2/H3 structure and pattern rule becomes the new
   baseline"). v4 `:351` marks §3 «Обов'язково». A Specification covering §0–§2 and §4–§9 while
   skipping the one mandatory section in between is the smaller delta, and that was finding 1.
3. **None of the four adds a requirement beyond v4 or beyond the Scope surface.** FR-27 restates
   v4's own rules and states twice that it *preserves* current behaviour (`functionality:
   z.array(SubsectionSchema).min(1)` at `description-doc.schema.ts:163` — verified; the two-level
   depth cap at `:124-152`, `.strict()` — verified). FR-28 declares every clause it carries to be
   unenforced prose and says "No automated check is created by this requirement." FR-29 asserts that
   an existing bound is **unchanged** and puts the matching entry in Out of scope. FR-30 restates
   behaviour the repository already has — `assertDocRendered` at
   `src/render/doc-schema-issues.ts:144-174` throws rather than persisting an empty artifact, with
   the "why is this product blank" rationale quoted accurately — and closes the one new thing
   (no `'3.0'` downgrade), which follows from AC-11 and FR-15 rather than departing from them.
4. **The precedent is real and the document declares it rather than hiding it.** FR-21..FR-26 and
   FR-20 already trace to no AC, and v1 accepted that handling because the matrix's standing row
   says so out loud. v2's standing and system-level rows do the same for FR-27..FR-30, with the
   justification inline.

A Story amendment would be required if any of the four created a new *acceptance* obligation the
Story does not have. None does: the only new failure path among them, FR-27's "a `'4.0'` document
with no functionality section fails validation", is already true of the shipped schema.

## 1. Acceptance-criterion coverage

Matrix re-derived from the Story text (`story:47-71`), not read back from the Specification's own
matrix.

| AC | Story says | Specification satisfies it via | Verdict |
|---|---|---|---|
| AC-1 | hook: one `<p>`, 40–85 words, starts `<b>{name}</b> —` (§1) | FR-1; FR-17/18/19 scope the range | covered |
| AC-2 | hook 2–4 technical values; `killerSpecs` 3–4 as `<b>lead</b> — benefit` | FR-2, FR-3 (both now split enforced count from unenforced prose) | covered |
| AC-3 | §2 block: one H2 + `<ul>` ≤ 8 items, 90–300 words, no table | FR-4 (composition + combined ceiling + no-minimum reconciliation), FR-17 (the check's shape), FR-30 | **covered — was `partial` in v1** |
| AC-4 | applications: H2 + `<ul>` 4–8 items, 80–250 words (§4) | FR-5 | covered |
| AC-5 | §5 compatibility / §6 package contents only when source data has them | FR-6, now with a code-resident heading table | covered |
| AC-6 | specs: H3 + table per category, responsive/bordered/striped, no list or `<br>` in a cell, multi-value comma-joined | FR-7, FR-8, FR-9, FR-10, FR-22 | covered |
| AC-7 | CTA: one `<p>` 50–100 words under the localized commercial H2 | FR-11, now with a code-resident heading template | covered |
| AC-8 | no `<h1>` in body; FAQ separate, 3–5 pairs of 2–4 sentences | FR-12, FR-13 | covered |
| AC-9 | across a fixture batch, no two consecutive hooks share a v4 pattern | FR-14, now with the distribution property | covered in mechanism **and** in the system-side property; the consecutive-pair window stays a TEST_WRITING matter per OD-3 |
| AC-10 | first image eager / rest lazy, localized iframe `title`, locale separators | FR-16 (incl. the explicit "of the Appendix" supersession), FR-23, FR-24 | covered |
| AC-11 | emitted doc has `schemaVersion: '4.0'`; `'3.0'` fate per OD-2 | FR-15, FR-10, FR-30 | covered |

**No AC gap.** No AC was added, renumbered or altered by v2, and the Story file is unchanged.

**Requirements tracing to no acceptance criterion:** FR-20, FR-21, FR-22, FR-23, FR-24, FR-25,
FR-26, FR-27, FR-28, FR-29, FR-30. **Not scope creep** — see §0b. The Specification declares all of
them in the matrix's standing and system-level rows rather than letting them pass unremarked, which
is the correct handling and the same handling v1 accepted for the first seven.

## 2. Non-verifiable language

Re-run against the ~130 lines v2 adds, not carried forward from v1.

**v1's four items are closed in the text:**

- **FR-6** — "For every locale in `STORE_REGISTRY`, both heading strings resolve from a
  **code-resident per-locale table**", with the `DELIVERY_REGION_PHRASES` rationale cited.
  Verified: `src/prompt-core/constants.ts:97` is that constant, and its preceding comment is the
  anti-drift rationale the requirement leans on. A test now has a named source instead of an
  invented string.
- **FR-11** — "The heading is assembled from a **code-resident per-locale template**" with the
  store name from `STORE_REGISTRY`. Closed on the same pattern.
- **FR-3** and **FR-5** — both now carry an explicit "What is and is not enforced" split in the
  FR-2 shape ("a property of prose … carries no automated check … a review finding, not a
  validation failure"). The sentences that read as enforceable in v1 now say they are not.

**One new item, non-blocking:**

- **FR-4, consequence 1** — "**Figure and video content is not lost.** Figures and video embeds
  continue to be carried by the v4 sections whose shape admits them — §3 functionality (FR-27) and
  §4 applications".
  - A test would have to invent: which section a given source figure must land in, because the very
    next sentence withdraws the obligation — "This Specification does not require a particular
    destination section for any individual figure; it requires only that §2 is not one." The
    assurance is therefore an expectation, not a requirement, and nothing here makes "not lost"
    falsifiable for an individual figure.
  - Why it is non-blocking: the requirement **bounds its own claim in the same paragraph**, so no
    planner is misled into thinking a destination rule exists; the destination shapes it names are
    real (`BlockSchema` admits `figure` and `video`; `ApplicationsBlockSchema` at
    `description-doc.schema.ts:109-112` admits `paragraph` and `figure` and deliberately excludes
    `video`); and the §4 criteria that *are* falsifiable — FR-23's eager/lazy rule and FR-24's video
    survival — continue to apply wherever the content lands, which is what AC-10 actually asserts.

## 3. Contradictions with the Story

Scope tables compared directly, row by row, against `story:35-41`.

| Story Scope row | Specification Scope | Match |
|---|---|---|
| Stores: all of `STORE_REGISTRY` | names all seven | yes |
| Locales: all; uk-UA native master | names all ten | yes |
| Surface: `src/prompts`, `src/prompt-core`, `src/domain`, `src/render`, `src/utils` | **new Surface row**, carried verbatim with "No requirement in this Specification reaches outside that surface" | yes — **v1's missing row is now present** |
| FROZEN: task-a.ts, task-c.ts, master-system-prompt.ts, output-validator.ts | same four, per-file disposition, plus task-b.ts named as untouched | yes, per OD-8 |
| Touches generated HTML: yes, §4 applies | FR-21..FR-26 | yes |

**No contradiction found.** Every v2 addition stays inside the Story's Surface row: FR-27..FR-29
reach `src/domain`, `src/prompts`/`src/prompt-core` and `src/render`; FR-30 restates behaviour in
`src/render`. AC-10's "of the Appendix" and FR-16 are no longer even apparently in tension — FR-16
now states the supersession in so many words, which was v1's non-blocking ask.

Per the re-review instruction, the three v1-confirmed choices (`es-MX` in separator group 1, §4's
`width: fit-content` governing the v4 Appendix sample, FR-4's combined-list reading of AC-3) are not
re-litigated here; they were verified against their sources in v1 and v2 did not change them.

## 4. Scope creep

- Out of scope section present and non-empty: **yes** — ten entries, one more than v1. The new entry
  ("Any change to the functionality bullets floor (FR-29). The floor difference is recorded as an
  interaction, not opened as work.") is the correct companion to FR-29 and prevents the §2 merge
  from being used to justify relaxing the `makeBlockSchema(3)` floor by side effect.
- The consumables exclusion is extended to the new requirements: "Nothing in FR-4, FR-27, FR-28,
  FR-29 or FR-30 reaches them." Correct — OD-6 put that pipeline out of scope, and §3 functionality
  is exactly the section a reader might otherwise assume applies to it.
- **No requirement nobody asked for was found.** FR-27..FR-30 are adjudicated in §0b.
- The §7 conditional-omission behaviour remains **deliberately absent** per OD-10 and, per the
  re-review instruction, is not reported as a gap. Re-checked positively in v2's text: FR-6 still
  bounds itself ("governs the §5 and §6 sections named above and no others") and FR-7 still opens
  "When the specs section is emitted".

## 5. Missing edge cases, boundaries and failure paths

| Area | Checked | Finding |
|---|---|---|
| FR failure paths | yes | Every FR-1..FR-30 states one, including the four new requirements. FR-29's is honest about being a non-behaviour ("n/a as a behaviour — this requirement asserts that an existing bound is unchanged"). |
| Locale fan-out (uk-UA master → derived locales) | yes | **Clear, and stronger than v1.** FR-19 (uk-UA only, no tolerance band) and FR-20 (structure everywhere) still carry OD-5 both ways, and FR-20's H2/H3 claim is no longer weakened, because FR-27 now supplies §3's hierarchy. FR-19 additionally states that §3 has nothing to measure in any locale. FR-6 and FR-11 now resolve their localized strings from code-resident per-locale tables keyed on `STORE_REGISTRY`, which closes the one place the fan-out could have drifted per regeneration. |
| Store scope vs `STORE_REGISTRY` | yes | **Clear.** Seven stores, ten locales, `es-US` and `it-*` correctly excluded; NFR-6 now also covers the locale keys of the new heading tables. Unchanged from v1 and re-checked. |
| §4 invariants that must survive | yes | **Clear — v1's one gap is closed.** Spec-count parity FR-22; figure/figcaption FR-23; first-image-eager/rest-lazy FR-23, now **reasoned** against the §2 merge instead of asserted, including the position-walk hazard with its regression test cited; video survival FR-24, with the §2 removal addressed ("survival is a property of the document, not of §2"). |
| Provider behaviour (retry, timeout, 429, malformed JSON) | yes | Transport untouched, NFR-2 pins provider independence. **The repair loop now has a stated terminus** — FR-30 — which was v1's load-bearing non-blocking item. Verified against `doc-schema-issues.ts:144-174`: `assertDocRendered` throws with the unresolved schema failures folded into the message, so FR-30 restates real behaviour rather than inventing it. |
| Empty / boundary inputs | yes | **Clear.** No compatibility/package data FR-6; no supplemental content FR-13; one spec row FR-9/FR-22; and v1's gap is closed — FR-23 and FR-24 each now carry an explicit "Boundary case" paragraph for a product with no images and no video ("satisfies this requirement vacuously … correct output, not a miss"). |

### Carried non-blocking items — all confirmed present in the document text

Checked as text, not as a summary claim:

| v1 non-blocking item | Present in v2 | Where |
|---|---|---|
| `ua-translation-style-guide.spec.ts:49` tripwire | yes | FR-16, "Existing-test constraint on the rule block", **and** routed again in Open questions. Verified against the file: that test asserts `toContain('uk-UA / ru-UA: decimal comma, thousands non-breaking space')`, and `NUMBER_FORMAT_RULES` at `constants.ts:489-501` has group 2 at `:493-494` exactly as the spec says, group 3's "dot (or space)" at `:495-496`, no `pt-PT` line, and `es-US / es-MX` at `:499`. The "must not alter the group-2 line" constraint is real. |
| Code-resident per-locale table, FR-6 | yes | FR-6, with the `constants.ts:97` precedent and the "Where that table lives … is ARCHITECTURE_PLANNING; that it is code-resident is not" split |
| Code-resident per-locale template, FR-11 | yes | FR-11, same split |
| FR-30 repair-exhaustion outcome | yes | FR-30 in full, plus AC-3 and AC-11 matrix rows |
| FR-14 distribution property | yes | FR-14, "The index distributes; it is not merely deterministic" — and it closes the hole precisely, naming the constant-selector counter-example that satisfied v1's FR-14 + NFR-5 in full. NFR-5 was amended to match ("Determinism alone is not sufficient"). |
| FR-3 / FR-5 prose disclaimers | yes | both, in the FR-2 shape |
| AC-10 "of the Appendix" supersession | yes | FR-16, stated as intended rather than inferred |
| Story Surface row | yes | Scope table |
| No-images / no-video boundary | yes | FR-23 and FR-24 |

### New non-blocking finding — FR-27's H3 rule has no stated enforcement side

FR-27 rule 2 states the behaviour unambiguously: "A single sub-function does not get its own H3".
Its failure path then calls a violation "a structural defect", and this document uses "structural
defect" elsewhere to mean *fails validation* (FR-1, FR-4, FR-7, FR-8, FR-12 all pair the two).
But:

- FR-17 point 1 enumerates the validated checks (`killerSpecs` 3–4, applications 4–8) and point 2
  adds the combined §2 ceiling. The H3 rule is in neither.
- FR-17 point 3 enumerates the prompt-only clauses by FR number — FR-2, FR-3, FR-5, FR-28. FR-27 is
  not among them, and FR-28's prose-only declaration is scoped to FR-28's own clauses.
- The parenthetical in FR-27's failure path ("the third level is already rejected by the two-level
  shape") disposes of the *third-level* case only, and it is accurate — `makeLeafSubsectionSchema`
  is `.strict()` and `makeSubsectionSchema` allows exactly one nesting level
  (`description-doc.schema.ts:124-152`). The single-sub-function case is left without a mechanism.

Why this is **not** blocking: the *behaviour* is fully specified, and only the enforcement side is
open — the opposite shape of v1's finding 2, where the behaviour itself was undefined. This
Specification routes "where a check lives" to ARCHITECTURE_PLANNING as a matter of course and this
review accepted that in v1. It touches no AC. The concrete risk is narrow and worth naming so the
planner does not resolve it by default: `subsections` is `z.array(leafSchema).optional()` with no
minimum today, so reading "structural defect" as *validated* implies a new `.min(2)` bound on an
existing collection — a new bound of exactly the class FR-29 and FR-30 warn about, and one that
neither FR-29 nor the Out-of-scope entry rules out.

One sentence in FR-27 rule 2 or in FR-17 point 3 closes it: either the H3 rule is a prompt
instruction and review criterion (FR-28's treatment), or it is a validated minimum on `subsections`
and belongs in FR-17's enumeration.

## 6. Compliance with AGENTS.md

Re-run against v2's text, including the new requirements — not carried forward from v1.

| Check | Result |
|---|---|
| §4 criteria in play quoted **verbatim** and cited, not paraphrased | **PASS — re-verified line by line against `AGENTS.md:203-233`.** All ten bullets appear across FR-21..FR-26 with no wording changed, and v2 did not touch the quoted text while extending FR-23 and FR-24 around it. The two overlapping image bullets are still quoted separately and un-merged, with the reason stated — which is what the §4 preamble at `AGENTS.md:196-201` demands. The new FR-23 and FR-24 prose is clearly outside the block quotes and does not restate them. |
| §9 FROZEN-file impact named and acknowledged | **PASS.** Unchanged from v1 and still correct: per-file disposition, the stop acknowledged, `.arch-guard-checksums` re-baselined in the same commit, and the correct timing. Nothing in FR-27..FR-30 adds a FROZEN file: `description-doc.schema.ts`, `render-description.ts` and `doc-schema-issues.ts` are not on the §9 list, and the new requirements name no file the Scope row does not already cover. |
| §3 architecture rules not violated — incl. Rule 2, review-only | **PASS.** NFR-1..NFR-8 unchanged except for NFR-5's distribution clause. Nothing in the new requirements moves retrieval into generation: FR-27..FR-29 are prompt-and-schema rules over content the generation call already has, and FR-30 is a failure outcome. NFR-3's honest note that a green arch-guard is not evidence for Rule 2 still stands. |
| §11 no blocking Open Decision left unaddressed | **PASS.** OD-1..OD-11 all `blocking: false` and all settled; open_decisions v2 and story v1 are the current versions and neither is `SUPERSEDED`; specification v2 supersedes v1 correctly. v2 re-opens, re-answers and substitutes nothing — checked OD by OD against `docs/decisions/US-2.1-open-decisions.md` v2, including the ones the new requirements touch (OD-1's whole-v4 delta, OD-9's enforcement split, OD-2's dual support). |
| No implementation design leaked in | **PASS — re-run on the new text.** FR-27, FR-29 and FR-30 cite `description-doc.schema.ts:163`, `:82-95` and `doc-schema-issues.ts:144-174`, but each citation is **evidentiary** — establishing that a bound or a behaviour already exists — not prescriptive, the same class as v1's FR-16 citing `constants.ts:489-501`. Where a design choice is genuinely open, v2 defers it explicitly in four places (FR-4's §2 expression, FR-6/FR-11's table location, FR-10's version scoping, FR-17's check location), each routed to ARCHITECTURE_PLANNING in Open questions. No function signature, no component structure, no new file name. |

## Verdict rationale

**`PASS`, not `CHANGES_REQUIRED`.** All four v1 blocking findings are answered in the document
text, each in the place the finding pointed at, and each verified against the primary source rather
than against the Revision note. Both limbs of finding 1 are discharged — §3 is specified *and*
FR-20 is made satisfiable. The one new finding is an enforcement-status ambiguity on a rule whose
behaviour is fully stated, in a section no AC names; that is the same class of item this review
carried as non-blocking in v1 and is not grounds for a second loop.

**`PASS`, not `PASS` with the flagged item treated as creep.** FR-27..FR-30 do not require a Story
amendment. Three of them exist because this review demanded them; the fourth answers a non-blocking
item this review raised. They sit inside a scope the Story's own Context and OD-1 both state
verbatim, they add no acceptance obligation the Story lacks, and the document declares their
traceability status rather than concealing it.

**Not `BLOCKED`.** Nothing is missing or stale: story v1, specification v2, open_decisions v2 and
clarification_report v2 are all current, no input is `SUPERSEDED`, and `open_decisions_blocking` is
`false` on every side.

**Loop-back: n/a.** No `loop_back` key is named, because neither `changes_required` nor
`changes_required_clarification` applies.

**This verdict is a document verdict, not a gate.** It does not approve the Specification and must
not be reported as approval. Only `/so:approve` records that (AGENTS.md §10), and the §9 per-file
FROZEN approvals remain separately required before IMPLEMENTATION.

## Non-blocking findings

These travel with the `PASS`. None needs to be acted on before the human gate.

- **FR-27's H3 rule has no stated enforcement side** (detailed in §5). It appears in neither
  FR-17's list of validated checks nor FR-17 point 3's list of prompt-only clauses, while its
  failure path calls a violation a "structural defect". Reading that as validated implies a new
  `.min(2)` on `subsections`, which is today `.optional()` with no minimum
  (`src/domain/description-doc.schema.ts:124-152`). One sentence resolves it either way.
- **FR-4 consequence 1's "Figure and video content is not lost" is an expectation, not a
  requirement** (detailed in §2). The paragraph withdraws the obligation in its next sentence, so
  the claim is bounded and not misleading, but nothing makes it falsifiable for an individual
  figure. IMPACT_ANALYSIS is the right place to confirm that every section which can receive
  displaced §2 figure content is reached by the `figurePositions()` walk FR-23 warns about.
- **FR-17 point 2 describes the §2 ceiling as a sum "across Blocks", while FR-4 admits exactly one
  `<ul>` in a `'4.0'` §2.** Each `keyBenefits` Block renders independently
  (`src/render/render-description.ts:314`), so under FR-4 a `'4.0'` §2 carries a single `bullets`
  Block and the sum is degenerate. The wording is defensive and holds either way; it is noted only
  so the planner does not infer that multiple §2 Blocks remain legal in `'4.0'`.
- **AC-9's consecutive-pair property remains a TEST_WRITING matter** per OD-3, now with FR-14's
  distribution clause as the system-side property a test can assert against. Carried from v1,
  materially improved, still open by design.

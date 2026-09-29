---
artifact: open_decisions
story: US-3.1
version: 4
status: DRAFT
owner: so-clarifier
created_at: 2026-09-23T06:00:00Z
updated_at: 2026-09-23T06:00:00Z
supersedes: docs/decisions/US-3.1-open-decisions.md#3
inputs_consumed:
  - key: story
    version: 1
  - key: open_decisions
    version: 3
  - key: clarification_report
    version: 3
  - key: specification
    version: 7
open_decisions_blocking: false
---

# US-3.1 — Open Decisions (v4, attempt 4)

This is the **v4 revision** (CLARIFICATION attempt 4), superseding
`docs/decisions/US-3.1-open-decisions.md#3`, which becomes `SUPERSEDED` and must not be read as a
current input from here on — this file inlines OD-1 through OD-8 in full rather than pointing back
to it, so it remains self-contained as the canonical log of record. This round exists to log and
verify the Owner's answer to **OD-9**, a new blocking Open Decision that SPECIFICATION (not
CLARIFICATION) opened after v3 of this artifact was filed: PLAN_REVIEW v1
(`docs/reviews/plans/US-3.1-plan-review.md#1`) found, and Specification v7
(`docs/specifications/US-3.1-spec.md#7`) confirmed in its "Open questions" section, that implementing
FR-13(a)/(b)/(d) requires editing `src/prompts/task-b.ts`'s whole "— meta_title —" block (lines 39-51
— specifically lines 46, 47, 48 and 49, the degradation cascade, the second suffix-retention
instruction at step 2, and the two independent paths to an `h1`-identical `meta_title`: the step-3
"LAST RESORT" rung and the line-49 bare-core-overflow rule) and `buildPromptB()`'s excerpt-
construction code (lines 112-140, including the `[CONTEXT]` ternary at lines 120-121 and the
`userContent` template at lines 128-132) — none of which is covered by D3 (scoped to `[HEADING FORM]`
disambiguation only), OD-3 (scoped to line 44 and the four few-shot anchors, lines 81-106, only) or
OD-7 (scoped to the per-locale Title budget table, lines 67-79, only). `so-spec-writer` correctly
declined to decide this authorization-scope question itself and returned `BLOCKED`, opening OD-9 for
a human §9 grant. **The Story Owner (sbruhov@gmail.com) has now answered OD-9.** Verifying that
answer confirms it covers everything Specification v7 needs, and surfaced one further residual,
recorded below as new non-blocking **OD-10**.

**No Open Decision remains blocking. `open_decisions_blocking: false`.**

---

## OD-1 (was blocking) — RESOLVED — hard-block mechanism for AC-1

*(Carried forward unchanged from v3.)*

- **v1 question:** Does AC-1's "hard-blocked from shipping" require new code that prevents export
  when specs grounding fails after retries, or is it satisfied by the `repair-gate.ts` severity
  accounting alone?

- **Owner's resolution:** Real hard block, option (b). Export logic (`app.component.ts` /
  `zip-generator.ts` or adjacent) must be changed so that when specs-grounding status is
  unresolved/failed, ZIP generation/download is physically blocked, with a corresponding UI
  message. Unverified content must not reach production.

- **Verification performed:** Re-read `src/app/app.component.ts`. `downloadZip()`
  (lines 1115-1122) calls `downloadPackage()` unconditionally — it reads `repairReport()` only to
  attach `repair_gate_report.md` as an extra file, never to gate the call. No `disabled`/guard
  condition anywhere ties `hasOutput` (line 538, the closest thing to a download-enablement signal)
  to `repairUnresolvedCount()` (line 525) or to `validationErrorCount()` (line 519). Re-read
  `src/utils/zip-generator.ts`: `downloadPackage()` (line 22) takes `content`, `productName`, and
  optional extra files only — no grounding-status parameter. This confirms v1's OD-1 evidence: no
  export-blocking code path exists today, so the Owner's answer is not redundant with existing
  behaviour and genuinely requires new code, exactly as option (b) states. `RepairArtifactReport`
  (`src/utils/repair-gate.ts:456-462`) carries per-artifact `status` and (via `finalIssues`)
  per-issue `rule`, so a block scoped specifically to the specs-grounding rule (once escalated to
  `severity: 'error'` per AC-1's first clause) rather than to any unresolved artifact is
  implementable without new plumbing — a Planning-level detail, not a further ambiguity.
  **This resolves OD-1 cleanly.**

- **Note — does not contradict README's "advisory... never abort a run" principle
  (`README.md:100`):** The hard block applies to the ZIP/download export action only. Generation
  itself still completes and the artifact remains viewable in the UI; only the export step is
  gated. "Abort a run" and "block export of one run's output" are different actions, so this is a
  scoped, named exception to the advisory-validation principle, not a reversal of it. Recorded here
  so the Specification states the exception's scope explicitly rather than silently narrowing
  README's own claim.

- **Note — Surface list impact:** The Story's Scope > Surface table (currently
  `content-orchestrator.service.ts`, `repair-gate.ts`, `heading-style.ts`, `slug-validator.ts`,
  `repair-strategy.ts`) does not name `app.component.ts` or `zip-generator.ts`. AC-1's resolved
  mechanism reaches both. Non-blocking — the Specification/Impact-Analysis stages should extend
  Surface accordingly; this is a scope correction, not an unresolved question.

- **blocking:** false (resolved)

---

## OD-2 (was blocking) — RESOLVED — invariantCore() vs productShort() at the blessed positions

*(Carried forward unchanged from v3.)*

- **v1 question:** Which derived form must AC-3's brand-core invariant check require at
  `doc.cta.heading` and the first §3 heading — `invariantCore()` or `productShort()` — and is
  presence mandatory or conditional?

- **Owner's resolution:** For the two blessed heading positions (CTA heading and the first §3
  heading), the required form is `productShort()` — short name, no configuration code, no
  packaging suffix. `invariantCore()` remains scoped strictly to the `slugs.json` check. This
  resolves both the heading-form rule and the AC-3 brand-core invariant check.

- **Verification performed:** Re-read `src/prompt-core/product-name-core.ts` in full and
  `src/utils/heading-style.ts` in full. Two findings confirm this is not a new rule but a
  restatement of what the code already says elsewhere:
  1. `heading-style.ts`'s own `fullPattern` issue text (HTML line 143-145, Doc line 360-362)
     already instructs: *"use the short form ... in the first §3 heading and the §9 closing"* —
     i.e. the current rule text already names `productShort()`-shaped content as correct at
     exactly these two positions. The Owner's answer matches the code's own pre-existing
     instruction; it does not introduce a new requirement.
  2. `product-name-core.ts`'s doc comment (lines 1-32) states the two forms are deliberately
     different and that `productShort` "is what goes in a HEADING," while `invariantCore` "is what
     must SURVIVE untouched" and "is what the slug validator checks." This is a direct, first-party
     statement that `invariantCore()` is scoped to slug/number-normalizer use and `productShort()`
     is scoped to headings — matching the Owner's answer exactly.
  - **Reconciling with D3's "may carry the full name" wording:** The Story's own D3 (Resolved
    decisions) describes the two blessed positions as ones that "may carry the full name" — read
    literally this could suggest `invariantCore()` (which retains a configuration code) rather than
    `productShort()` (which drops it). Checked whether this is a live contradiction: it is not.
    D3's "full name" is used there in contrast to "a generic category noun" (the requirement
    everywhere else) — i.e. it distinguishes "the headings that may name the product at all" from
    "the headings that must use a generic noun instead," not `productShort()` vs `invariantCore()`.
    The Owner's OD-2 answer narrows this correctly: at those two positions, the product-naming form
    permitted is specifically `productShort()`, not any product-bearing string. For the QA
    sample product ("Makera Cyclone Dust Collector," no configuration-code token), `productShort()`
    and `invariantCore()` coincide, which is exactly why this divergence was never observed in the
    sample and needed a Specification-level answer for products that do carry a configuration code.
    **No residual conflict between D3 and this resolution; OD-2 supplies the precision D3's prose
    did not.**
  - This also settles the reciprocal question the v1 report flagged for AC-2: the fullPattern
    exemption AC-2 requires at these two positions should match against `productShort()`, the same
    form the shortPattern branch already uses (`heading-style.ts:111,343`) — keeping the two
    branches' blessed-position logic consistent with each other, which is what the current
    `short`/`fullPattern`/`shortPattern` split in `checkProductNameStuffing` already sets up.
  - **Presence — not answered by the Owner, and not inferred here.** v1's OD-2 asked two separate
    questions: which derived form, and whether AC-3 is a mandatory-presence rule (the heading MUST
    contain the core) or a conditional-correctness rule (IF the heading names the product, it must
    use the correct form). The Owner's answer settles the first (`productShort()`) but does not
    address the second — "the required form is `productShort()`" states which form, not whether
    that form's presence is mandatory. This was carried forward, not guessed at, as OD-6 below
    rather than closed by inference here.

- **blocking:** false (resolved — form only; see OD-6 for the presence question)

---

## OD-6 (opened in v2) — RESOLVED (delegated) — Is AC-3's brand-core check mandatory-presence or
## conditional-correctness?

*(Carried forward unchanged from v3; disposition confirmed by Specification v4 and unaffected by v5-v7.)*

- **Question:** Now that OD-2 has settled the *form* (`productShort()`, not `invariantCore()`) for
  `doc.cta.heading` and the first §3 heading, must that form be present at those positions (a
  heading there that names no product at all would fail), or is the check conditional — IF the
  heading names the product, the name must be the correct, uncorrupted `productShort()` form, and a
  heading naming no product at all is fine?

- **Why it could not be inferred at CLARIFICATION:** This is the second half of v1's OD-2 that the
  Owner's answer did not reach — the Owner's text ("the required form is `productShort()`") reads
  as it could support either a mandatory-presence rule ("required" = must appear) or a form
  constraint conditional on presence, and nothing else in the Owner's answer or in AC-3's own text
  disambiguates between the two readings for the general case. Inferring an answer here would
  repeat exactly the mistake this skill exists to prevent.

- **Disposition:** Delegated to SPECIFICATION (same disposition as OD-4). **Resolved there**:
  Specification v4 FR-7 states the check as mandatory-presence — `heading-brand-core-missing` fails
  when either blessed-position heading omits the `productShort()` form entirely or carries a
  non-matching variant — independently grounded against the QA artifact evidence (es-ES/pt-PT
  dropping the brand entirely) and against `slug-validator.ts`'s own unconditional-presence
  precedent. This is recorded here for continuity, not re-decided by this stage.

- **blocking:** false (resolved — delegated to and closed by SPECIFICATION)

---

## OD-3 (was blocking) — RESOLVED — FROZEN `task-b.ts` authorization for AC-4 (suffix instruction +
## few-shot anchors)

*(Carried forward unchanged from v3. See OD-7 and OD-9 below for two further, separate authorizations
for other sections of the same file — OD-3's own scope is unchanged by either.)*

- **v1 question:** Does AC-4 require editing the FROZEN `src/prompts/task-b.ts`, and if so, is
  that edit covered by D3's existing §9 authorization (which is scoped to heading-form wording) or
  does it need its own separate authorization?

- **Owner's resolution:** Owner explicitly grants AGENTS.md §9 authorization to modify the FROZEN
  file `src/prompts/task-b.ts`: remove the "[Site Suffix] is MANDATORY" instruction and update the
  few-shot examples to match the new AC-4 template. Relying on repair-cycles alone without changing
  the prompt is not acceptable.

- **Verification performed:** Re-read `AGENTS.md` §9 (lines 440-465): `src/prompts/task-b.ts` is
  confirmed on the FROZEN list (line 452); §9's procedure requires the Owner to say "modify
  [filename]" explicitly for that specific file in the current session, which this resolution does
  by name. Re-read `src/prompts/task-b.ts` lines 42-104: line 44 states *"[Site Suffix] is
  MANDATORY — present at steps 1 AND 2. Drop only when step 2 still overflows"*, and all four
  few-shot anchors (lines 86, 92, 97, 104) end in `| StoreName`. This is the exact FROZEN-file
  content OD-3 flagged in v1 as contradicting AC-4's "suffix removed entirely" requirement — the
  Owner's authorization directly targets and resolves it. This is a genuinely separate
  authorization from D3 (which is scoped to heading-form short/full disambiguation only); the Owner
  has now supplied it explicitly, closing the gap v1 identified rather than stretching D3 to cover
  it. **This resolves OD-3 cleanly** — no interpretation required, and the authorized scope (drop
  the MANDATORY instruction + update the four few-shot anchors) matches exactly what AC-4 requires
  and nothing broader.

- **Downstream procedural note (per AGENTS.md §9, not something CLARIFICATION executes):** Any
  commit that edits `task-b.ts` under this authorization must, in the same commit, run
  `bash arch-guard.sh --rebaseline` and commit the updated `.arch-guard-checksums` (AGENTS.md
  lines 463-464). This is a note for IMPLEMENTATION, not an action for this stage.

- **blocking:** false (resolved)

---

## OD-4 (already non-blocking) — RESOLVED (delegated) — validation-rule file ownership

*(Carried forward unchanged from v3; disposition confirmed by Specification v4 and unaffected by v5-v7.)*

- **v1 question:** Which file owns the new AC-4/AC-5 validation rules, given `output-validator.ts`
  (the natural precedent home for `meta_title`/`h1` checks) is FROZEN and out of scope?

- **Owner's resolution:** Delegated to the SPECIFICATION stage — SPECIFICATION should decide the
  best file for the new AC-4/AC-5 validators.

- **Verification performed:** This was already `blocking: false` in v1 because AC-4/AC-5's required
  *behaviour* is fully specified regardless of file placement (v1's own "Impact if unresolved"
  note). The Owner's delegation is a valid resolution of "who decides," not a further gap: it
  assigns the decision to a stage explicitly equipped to make it. **Resolved there**: Specification
  v4 places both new checks in a new sibling module, `src/utils/seo-metadata-shape.ts`, following
  the existing `heading-style.ts`/`slug-validator.ts`/`product-name-consistency.ts` precedent.

- **blocking:** false (resolved — delegated to and closed by SPECIFICATION)

---

## OD-5 (already non-blocking) — RESOLVED — AC-1 retry scope across all three fail-open triggers

*(Carried forward unchanged from v3.)*

- **v1 question:** Does AC-1's retry-with-backoff cover all three of `groundingSpecs()`'s fail-open
  triggers (throw / empty / wrong-script), or only the throw path?

- **Owner's resolution:** The AC-1 retry-with-backoff must cover all 3 of `groundingSpecs()`'s
  fail-open triggers (throw / empty / wrong-script), not just the throw path.

- **Verification performed:** This is a direct, unambiguous answer to the exact question v1 posed
  — broad scope, explicitly naming all three triggers by the same names v1 used
  (`content-orchestrator.service.ts`'s `groundingSpecs()`, throw / empty / wrong-script via
  `sanitizeGroundedTranslation`). It also settles the residual tension v1 flagged against D1's
  "cannot be completed at all" wording (which read most naturally as the throw path alone): the
  Owner's explicit broad-scope answer here supersedes that narrower reading for retry-scope
  purposes specifically. No further ambiguity — the Specification can state this as a functional
  requirement directly.

- **blocking:** false (resolved)

---

## OD-7 (opened by SPECIFICATION v4) — RESOLVED — §9 authorization to edit `task-b.ts`'s per-locale Title budget table (lines 67-79)

*(Carried forward unchanged from v3.)*

- **Question, as raised at Specification v4 FR-13(c):** OD-3's existing grant authorizes removing
  `task-b.ts`'s mandatory `[Site Suffix]` instruction and updating its four few-shot anchors to match
  AC-4's template. FR-13(a) requires the cascade's normal-case step to name and produce
  `{Localized Category}`/`{Spec}` explicitly (AC-4's real template components) in place of the
  undefined `[Benefit]` placeholder. FR-8's re-derived arithmetic shows that, built to the real
  template, three of four reference locale-shapes (en-ES, es-ES, and pt-PT via the
  "(any other locale)" row) already exceed the table's current ≤48 per-locale budget, so the
  normal-case rung would systematically fail to fit and every such generation would degrade to a
  lower rung and then fail FR-8's new, unregistered `meta-title-template-shape` check — reintroducing
  the disproportionate full-regen cost AC-6 exists elsewhere in this Story to close. Reconciling the
  budget table would fix this, but the table is a separate, distinctly-headed normative section from
  the few-shot anchors OD-3 actually named, and is not severable from FR-13(a) by SPEC_REVIEW v3's
  and Specification v4's own independent re-reading of OD-3's grant. Does the Owner extend the §9
  authorization to cover this table specifically, and if so, on what numeric basis?

- **Why it could not be inferred:** Widening an already-itemized §9 FROZEN-file authorization is
  exactly the boundary AGENTS.md §9 reserves to a human — "Refactoring... does NOT authorize
  editing them. Fixing a bug elsewhere does NOT authorize editing them" (§9, lines 446-447) applies
  with equal force to widening one already-granted authorization to cover a section it did not name.
  Neither CLARIFICATION nor SPECIFICATION may decide this for itself; both correctly deferred to the
  Owner.

- **Owner's resolution (verbatim):** *"Yes, as Owner, I extend the §9 FROZEN authorization for
  task-b.ts. I grant full permission to modify the 'per-locale Title budget table' section
  (lines 67-79). Please update the character budgets in this table for all locales so they
  comfortably fit the new approved template {Product Name} - {Localized Category} {Spec}. Per the
  previously provided meta-titles.txt file, the safe range for this template is 45-60 characters.
  Make sure the new prompt budget does not contradict these numbers and does not provoke unnecessary
  repair cycles."*

- **Verification performed (independent — not accepted at face value):**

  1. **Scope match.** Re-read `src/prompts/task-b.ts` lines 67-79. The Owner names the file
     (`task-b.ts`) and says "modify," satisfying AGENTS.md §9's own procedure ("You must NOT edit
     them unless the user explicitly says 'modify [filename]' for that specific file in the current
     session," lines 443-444) — the identical form OD-3's grant used. The section named,
     "per-locale Title budget table," matches exactly the "— PER-LOCALE BUDGETS —" block
     Specification v4 FR-13(c) flagged as outside OD-3's existing grant, confirmed still at lines
     67-79 in the live file (unchanged since v2's read). The Owner also says "for all locales" —
     closing the completeness gap a narrower grant would have left, since the table has six rows
     (`en-GB/en-US/en-ES`, `es-ES/es-MX`, `pl-PL`, `uk-UA/ru-UA`, `de-DE`, `(any other locale)`) and
     `meta-titles.txt` supplies reference examples for only four locales.

  2. **Numeric basis, independently re-verified, not re-derived from the Specification's own
     numbers.** Re-read `Knowledge/Issues/First_Batch/meta-titles.txt` and independently
     character-counted each of its four example `meta_title` strings word-by-word (not read from
     the source document's own "Длина" summary column, which Specification v4 flagged as a
     one-character miscount in three of four rows and which this round re-confirms independently
     by direct count):
     - en-ES: `"Makera Cyclone Dust Collector - Dust Collector 6 L"` → **50** chars (source column
       says 49 — miscounted; matches Specification v4's independent correction).
     - es-ES: `"Makera Cyclone Dust Collector - Colector de Polvo 6 L"` → **53** chars (source column
       says 53 — correct).
     - pt-PT: `"Makera Cyclone Dust Collector - Coletor de Pó 6 L"` → **49** chars (source column says
       50 — miscounted; matches Specification v4's correction).
     - uk-UA: `"Makera Cyclone Dust Collector - Пилозбірник 6 л"` → **47** chars (source column says
       48 — miscounted; matches Specification v4's correction).
     Against the live `task-b.ts` table (≤48 for the en-GB/en-US/en-ES, es-ES/es-MX, pl-PL,
     uk-UA/ru-UA and "(any other locale)" rows; ≤45 for de-DE): en-ES is over its ≤48 budget by 2,
     es-ES over by 5, pt-PT (falling under "(any other locale)") over by 1, and uk-UA is 1 character
     **under** its ≤48 budget, not at it. Three of four reference locale-shapes genuinely cannot
     reach the normal-case cascade rung at the table's current numbers — this independently confirms
     the Owner is resolving a real, evidenced gap, not a hypothetical one.

  3. **The achievable numeric window is narrow, and the Owner's cited range partially exceeds a
     constraint this grant does not reach.** The Owner's "the safe range for this template is
     45-60 characters" is the *display*-safety range `meta-titles.txt` itself states for the final
     rendered title (that document mixes a per-row "51–60" parenthetical with a "45–55" summary
     line; "45-60" spans both). Read as a literal instruction for the table's `≤` budget field
     itself, the top of that range collides with a constraint this authorization does not touch:
     `task-b.ts`'s own table states, in the very block being edited, that its budgets "sit BELOW
     the hard acceptance limit on purpose... AIM LOW" (lines 69-71) — and that hard acceptance
     limit is `src/utils/output-validator.ts`'s `MAX_META_TITLE = 55` (line 41), an `error`-severity
     `meta-title-length` check (lines 654-668) in a file this Story does not authorize touching
     (Story Scope; Specification v4 Out of scope: "Any edit to `src/utils/output-validator.ts` —
     FROZEN, not authorized"). Doing the arithmetic precisely: the longest measured reference
     locale-shape is es-ES at 53 characters, so any budget below 53 leaves es-ES unable to reach the
     normal-case rung at all — the budget must be **≥ 53**. The untouched hard ceiling requires the
     budget to stay **< 55** (the table's own design principle, restated above, calls for staying
     meaningfully below it, not merely under it). **The achievable window is therefore only {53,
     54} — one or two characters of margin, against the current table's seven (55−48).** The
     table's own "a title at the budget still has room to spare" design principle is not
     satisfiable within that window at today's sampled lengths, let alone with the additional
     safety margin the table's original design intended. This is a real, quantified constraint,
     not a stylistic quibble — recorded as OD-8 below rather than silently resolved by this
     stage, because whether to accept that thinned margin (or address it another way) is a
     Specification/Planning-level tradeoff this round can state precisely but should not decide
     unilaterally beyond flagging it as non-blocking.

  4. **de-DE and the locales `meta-titles.txt` does not sample.** The Owner's "for all locales"
     covers `de-DE`, `pl-PL`, `en-GB`, `en-US`, `es-MX`, `ru-UA` and `(any other locale)`, none of
     which has a `meta-titles.txt` reference example. `task-b.ts`'s own table already carries the
     relevant signal for at least one of these (line 68: "German runs 20–30% longer... the de-DE
     budget reflects this," which is why de-DE's current budget is tighter at ≤45, not ≤48) — so
     extrapolating a proportionate new number for de-DE (and the other unsampled rows) from the
     four measured locale-shapes, within the same narrow below-55 window, is a
     Specification/Planning-level exercise, not a further Open Decision.

  5. **The grant itself is not undermined by finding (3)/OD-8.** The Owner unambiguously answered
     the question actually asked — may the §9 authorization be extended to this table, and on what
     basis — with a clear yes and a stated numeric basis. Finding (3) is a residual precision
     problem inside applying that basis, not a gap in whether the authorization was granted. OD-7
     itself is fully resolved; see OD-8 for the residual.

- **Downstream procedural note (per AGENTS.md §9, not something CLARIFICATION executes):** As with
  OD-3, any commit editing `task-b.ts`'s budget table under this authorization must, in the same
  commit, run `bash arch-guard.sh --rebaseline` and commit the updated `.arch-guard-checksums`
  (AGENTS.md lines 463-464). This edit and OD-3's edit both land in `task-b.ts`; a single
  rebaseline covering both in the same commit satisfies AGENTS.md's requirement.

- **blocking:** false (resolved)

---

## OD-8 (opened by CLARIFICATION's own verification of OD-7) — RESOLVED as an accepted tradeoff — The
## achievable per-locale budget window is only {53, 54} characters, and a product name longer than the
## QA sample can make the template unreachable at any budget

*(Carried forward unchanged from v3; disposition confirmed by Specification v6/v7.)*

- **Question:** Given OD-7's grant reaches only `task-b.ts`'s budget table (not
  `output-validator.ts`'s untouched `MAX_META_TITLE = 55` ceiling), and the longest measured
  reference locale-shape (es-ES) is 53 characters, the only budget values that both let the
  normal-case rung fit the sampled locales *and* stay below the hard ceiling are **53 or 54** —
  reducing the table's own designed "AIM LOW... room to spare" margin from 7 characters today to 1-2.
  Should Specification set the affected locale budgets at the top of this narrow window and
  explicitly accept the thinned margin (documenting the tradeoff), or is a further step needed?
  Separately and more materially: the 53-character figure is from one sampled product
  ("Makera Cyclone Dust Collector"). A product with a longer name or a longer localized category
  term will produce a template-built title that exceeds 55 characters **regardless of what the
  budget is set to** — at that point no budget value keeps the normal-case rung both template-shaped
  and within the untouched hard ceiling; the cascade must degrade for that product by design, which
  is a different outcome from "the budget was set too low." Does Specification treat this as an
  accepted, inherent limit of the template for long product names (the cascade correctly degrading,
  as designed, rather than a defect), or does it need a further Owner decision — e.g. shortening the
  approved template's components, or a separate §9 authorization to touch
  `output-validator.ts`'s 55-char ceiling itself (a different FROZEN file, not touched by OD-7 or by
  D3/OD-3)?

- **Why it cannot be resolved here:** This is a genuine downstream tradeoff — whether to accept a
  thinned safety margin, and how to characterize the template's inherent unreachability for
  long-named products — that depends on product-catalog knowledge (how long do real product names
  and localized category terms actually run across the full catalog, not just the one QA sample)
  this stage has no visibility into, and on a design preference (accept degraded-cascade behavior
  for long names vs. pursue a further authorization) only Specification or the Owner can weigh.
  Inferring an answer would be exactly the guess this skill exists to prevent.

- **Impact if left unresolved:** Specification could silently pick a budget number without stating
  the margin tradeoff or the long-name residual, which would read as if OD-7's grant fully resolves
  reachability for every product — it does not, for products whose names or localized categories run
  longer than the QA sample. Leaving this unstated risks a repeat of exactly the kind of
  under-evidenced "comfortably fit" claim SPEC_REVIEW has caught in this Story more than once. Stating
  it explicitly, even without a numeric answer, lets Specification/Planning choose deliberately
  (e.g. document the {53,54} window and the long-name residual as an accepted limitation) rather than
  by omission.

- **Disposition — RESOLVED by Specification v6/v7 as an accepted tradeoff.** FR-13(c) sets the
  affected budgets at 54 (51 for de-DE), states plainly that this shrinks the margin against the
  untouched 55-char ceiling from 7 to 1 character (4 for de-DE), documents the long-name residual as
  an inherent, accepted limit of the approved template (parallel to FR-7's accepted
  `productShort()` false-positive cost), and — new in Specification v6, after SPEC_REVIEW v5's
  blocking finding — restates its own risk-transfer claim honestly as a *partial, probabilistic*
  mitigation rather than a settled one: `meta-title-length`'s existing deterministic repair tier
  (`cutOnWordBoundary()`) has no awareness of the template's structure and can itself strip the
  trailing `{Spec}`/`{Localized Category}` component, re-tripping the unregistered
  `meta-title-template-shape` check and landing on `full-regen` — a named, accepted residual, not a
  closed one. This is recorded here for continuity, not re-decided by this stage.

- **blocking:** false — resolved by Specification, non-blocking throughout.

---

## OD-9 (new, opened by SPECIFICATION v7 / PLAN_REVIEW v1) — RESOLVED — §9 authorization to edit
## `task-b.ts`'s whole "— meta_title —" block (lines 39-51) and `buildPromptB()`'s excerpt-construction
## code (lines 112-140)

- **Question, as raised at Specification v7 (Background point 3, Scope > FROZEN files, and Open
  questions):** OD-3's existing grant authorizes removing `task-b.ts`'s line-44 mandatory
  `[Site Suffix]` instruction and updating its four few-shot anchors (lines 81-106). OD-7's grant
  separately authorizes the per-locale Title budget table (lines 67-79). PLAN_REVIEW v1, building the
  task breakdown from Specification v6's FR-13(a)/(b) text, found that implementing them requires
  editing lines no recorded §9 authorization names: FR-13(a) — defining `{Localized Category}`/`{Spec}`
  in place of the undefined `[Benefit]` placeholder — requires cascade step 1 (line 46) and, to source
  the category/spec data the model needs, `buildPromptB()`'s excerpt-construction code (the
  `[CONTEXT]` ternary at lines 120-121 and the `userContent` template at lines 128-132 that would carry
  any added structured field); FR-13(b) — no rung, including the terminal overflow rule, may ever
  produce a `meta_title` identical to `h1` — requires cascade step 3 (line 48) *and* the bare-core-
  overflow rule (line 49). Specification v7 additionally found and named its own further gap in the
  same block: a second, previously-unenumerated live suffix mandate at cascade step 2 (line 47,
  `"[H1 core] | [Site Suffix]"  ← drop benefit, KEEP suffix`), independent of line 44 and directly
  contradicting FR-8's "no site suffix" requirement — given its own clause, FR-13(d). None of D3
  (scoped to `[HEADING FORM]`/invariant-core disambiguation), OD-3 (scoped to line 44 and the four
  few-shot anchors) or OD-7 (scoped to the per-locale budget table, lines 67-79) names any of lines 46,
  47, 48, 49, or `buildPromptB()`'s excerpt-construction code. Does the Owner extend the §9
  authorization to cover the whole "— meta_title —" block (lines 39-51) and `buildPromptB()`'s
  excerpt-construction code (lines 112-140) together — requested as one block rather than an
  enumerated line list, on PLAN_REVIEW's own reasoning that a line-list authorization has already been
  found incomplete once in this Story (OD-3's grant did not reach OD-7's budget table; the identical
  shape of gap recurring here is why this request covers the whole block up front) — and, if so, on
  what basis for the specific wording FR-13(a)/(b)/(d) require?

- **Why it could not be inferred:** Widening an already-itemized §9 FROZEN-file authorization is
  exactly the boundary AGENTS.md §9 reserves to a human — the identical reasoning this Story's own
  OD-3 and OD-7 already established applies with equal force here. Neither Specification nor
  PLAN_REVIEW may decide this for itself; both correctly deferred to the Owner, the same disposition
  OD-7 used before it was granted.

- **Owner's resolution (received in Ukrainian; translated below, substance preserved verbatim; the
  original is quoted first per this project's chat-Ukrainian/artifact-English convention):**

  > *Original (Ukrainian):* "Я надаю пряму авторизацію згідно з §9 AGENTS.md, щоб закрити питання
  > OD-9 без зайвих пауз: Рішення щодо OD-9: Як Owner, я даю повний дозвіл на модифікацію файлу
  > src/prompts/task-b.ts (modify src/prompts/task-b.ts): Дозволяю редагування всього блоку —
  > meta_title — (рядки 39–51), включаючи оновлення каскаду деградації (рядки 46, 47, 48, 49),
  > видалення вимоги зберігати суфікс у кроці 2, прибирання колізій з дублюванням h1 та впровадження
  > компонентів {Localized Category} і {Spec} за AC-4/AC-5. Дозволяю редагування функції
  > buildPromptB() (рядки 112–140) для передачі необхідних контекстних даних (категорія та спеки) у
  > userContent."

  **English translation (operative text for this artifact):** As Owner, full §9 authorization to
  modify the FROZEN file `src/prompts/task-b.ts`: (1) full permission to edit the whole "—
  meta_title —" block (lines 39-51), including updating the degradation cascade (lines 46, 47, 48,
  49), removing the suffix-retention requirement at step 2, resolving the collisions that produce an
  `h1`-duplicated `meta_title`, and introducing the `{Localized Category}` and `{Spec}` components per
  AC-4/AC-5; and (2) permission to edit `buildPromptB()` (lines 112-140) to pass the necessary context
  data (category and specs) into `userContent`.

- **Verification performed (independent — not accepted at face value):**

  1. **Scope match against AGENTS.md §9's own procedure.** The Owner names the file
     (`src/prompts/task-b.ts`) and says "modify" explicitly (both in the Ukrainian original and the
     parenthetical `(modify src/prompts/task-b.ts)`), satisfying the identical form OD-3's and OD-7's
     grants used ("You must NOT edit them unless the user explicitly says 'modify [filename]' for that
     specific file in the current session," AGENTS.md §9 lines 443-444). Re-read `task-b.ts` lines
     30-140 (current live text) this round: the "— meta_title —" header is confirmed at line 39 and
     the block runs through line 51 exactly as the Owner cites; `buildPromptB()` is confirmed to start
     at line 112 (`export function buildPromptB(`) and end at line 140 (`}`) exactly as the Owner
     cites — both cited ranges match the live file's actual section boundaries precisely, not
     approximately.

  2. **Line-list match against what FR-13(a)/(b)/(d) actually need.** The Owner explicitly names
     "рядки 46, 47, 48, 49" (lines 46, 47, 48, 49) by number inside the block grant — this directly
     covers:
     - **FR-13(a)** (line 46, the cascade's normal-case step, to be rebuilt around
       `{Localized Category}`/`{Spec}` in place of the undefined `[Benefit]` placeholder) — covered
       both by the explicit line-46 citation and by the Owner's own words, "введення компонентів
       {Localized Category} і {Spec}" ("introducing the `{Localized Category}` and `{Spec}`
       components").
     - **FR-13(d)** (line 47, the second, independent suffix-retention instruction at cascade step 2)
       — covered both by the explicit line-47 citation and by the Owner's own words, "видалення
       вимоги зберігати суфікс у кроці 2" ("removing the requirement to keep the suffix at step 2") —
       naming the exact clause Specification v7 flagged as previously unenumerated.
     - **FR-13(b)** (line 48, the step-3 "LAST RESORT" rung, **and** line 49, the textually separate
       bare-core-overflow rule — SPEC_REVIEW v3 previously caught a version of this Specification
       naming only line 48 and missing line 49) — both lines are explicitly named by number in the
       Owner's grant ("46, 47, 48, 49"), closing exactly the shape of gap SPEC_REVIEW v3 found before;
       this grant does not repeat that omission.
     No line FR-13(a)/(b)/(d) needs inside the "— meta_title —" block is left unnamed.

  3. **`buildPromptB()` range match.** Specification v7 asks for authorization over
     `buildPromptB()`'s excerpt-construction code specifically — "the `[CONTEXT]` ternary at lines
     120-121, and the `userContent` template at lines 128-132." The Owner's grant instead authorizes
     the whole function, lines 112-140, which is a superset containing both cited sub-ranges (120-121
     and 128-132 both fall inside 112-140) plus the function's signature (line 112-119) and the
     `namesBlock` construction (lines 122-127). Because 112-140 is the function's exact full span (verified
     in finding 1), this is not an unbounded or ambiguous grant — it is bounded by the function's own
     syntactic boundaries, the same "named file, named section, explicit 'modify'" shape AGENTS.md §9
     requires, and it fully covers the specific lines Specification v7 asked for.

  4. **The grant matches the request precisely, with no narrower or broader reading needed.** Unlike
     OD-7 (where the Owner's cited numeric range needed reconciling against a constraint the grant
     itself did not reach), OD-9's grant needs no such reconciliation for its own scope: every line
     Specification v7's Open questions section named (46, 47, 48, 49, and `buildPromptB()`'s
     112-140) is explicitly covered, and the Owner requested no numeric change here for CLARIFICATION
     to arithmetic-check — FR-13(a)/(b)/(d)'s exact replacement wording is expressly delegated to
     `so-planner`/the implementer by Specification v7 itself (Background point 3, item 3; FR-13(b)'s
     own text), not fixed by this grant, so there is no number to independently re-derive at this
     stage the way OD-7's character counts required. **This resolves OD-9 cleanly** — no interpretation
     required, and the authorized scope matches exactly what Specification v7 requested and nothing
     broader.

  5. **A residual was found while verifying finding 2's coverage of FR-13(b) — not a gap in the grant
     itself, but a gap in what implementing the grant's own goal can achieve without touching a
     separate, untouched FROZEN constraint.** See new **OD-10** below. OD-9 itself is fully resolved;
     the residual does not reduce or qualify the authorization granted here, the same relationship
     OD-7's finding (3) had to OD-8.

- **Downstream procedural note (per AGENTS.md §9, not something CLARIFICATION executes):** As with
  OD-3 and OD-7, any commit editing `task-b.ts` under this authorization must, in the same commit,
  run `bash arch-guard.sh --rebaseline` and commit the updated `.arch-guard-checksums` (AGENTS.md
  lines 463-464). OD-3's, OD-7's and this authorization's edits all land in `task-b.ts`; a single
  rebaseline covering all three in the same commit satisfies AGENTS.md's requirement.

- **blocking:** false (resolved)

---

## OD-10 (new this round, non-blocking) — Fixing line 49's `h1`-identity collision can itself trip the
## untouched `output-validator.ts` 55-char ceiling, for a precisely bounded set of H1-core lengths

- **Question:** FR-13(b) requires that no cascade rung, including the line-49 terminal
  bare-core-overflow rule, may ever return a `meta_title` byte-identical to `h1` — without relaxing
  line 49's other, unchanged clause ("H1 core is NEVER truncated mid-word"). The only way to satisfy
  both at once is for the fixed rule to append some minimal, non-truncating marker (or otherwise
  non-destructively alter the string) of some length `m ≥ 1` when the bare H1 core alone would
  otherwise be returned unchanged — Specification v7 itself says as much ("e.g. a minimal,
  non-truncating marker appended to distinguish it from `h1`"), while explicitly delegating the exact
  replacement wording to `so-planner`. Independently re-verified this round against the live source
  (`src/utils/output-validator.ts` line 41, `const MAX_META_TITLE = 55`; line 660,
  `if (titleLen > MAX_META_TITLE)` — i.e. a title of exactly 55 characters **passes**, and only 56+
  fails) and against FR-13(c)'s reconciled budgets (≤54 general rows, ≤51 de-DE): line 49 is reached
  only when the bare H1 core itself exceeds the row's budget, so:
  - **General rows (budget ≤54):** the smallest H1-core length reaching line 49 is 55 — which, unmarked,
    already sits exactly at the 55-char ceiling and passes today. Appending any marker (`m ≥ 1`) pushes
    it to 56+, newly failing. Every larger core (56+) is already unmarked-failing today regardless of
    this Story, so this is **not** an empty case as a first pass might assume, but it is a single exact
    H1-core length (55 characters) — a narrow, specific collision point, independent of `m`.
  - **de-DE (budget ≤51):** the previously-passing, line-49-reaching set is H1-core lengths 52-55 (all
    ≤55 unmarked). Which of these newly fail depends on `m`: at `m = 1`, only core = 55 newly fails
    (55+1 = 56); at `m ≥ 4`, all four values (52-55) newly fail. de-DE's collision band is therefore
    **wider than the general rows' and grows with the marker's length**, up to the full 4-character gap
    FR-13(c)'s own ≤51/55 spread leaves — the same de-DE-specific gap FR-13(c) already documents (a
    margin of 4 against the ceiling, versus 1 for the general rows).

  Does the Owner/Specification accept this as a bounded, inherent cost of satisfying FR-9 — parallel to
  how OD-8's thinned margin and long-name residual are accepted costs of FR-13(c)'s budget
  reconciliation — stating explicitly that it is narrowest for the general rows (one exact H1-core
  length) and widest for de-DE (up to four, depending on marker length)? Or does it require
  `so-planner` to choose a length-neutral differentiation strategy that provably cannot push a passing
  title over the ceiling (e.g. substituting a trailing character already present in the bare core
  rather than appending one, so the string's length is unchanged) — a constraint FR-13(b)'s current
  text does not state and that would close this residual entirely rather than merely bound it?

- **Why it cannot be resolved here:** This is the identical shape of finding OD-7's own verification
  produced for the budget table (finding 3, closed as OD-8): implementing a granted, in-scope prompt-
  text fix (here, line 49's `h1`-differentiation) runs into a separate, untouched, FROZEN constraint
  (`output-validator.ts`'s `MAX_META_TITLE = 55`) this authorization does not reach and this Story does
  not authorize editing. Whether the resulting bounded cost is accepted as-is, or whether `so-planner`
  should be constrained to a length-neutral fix (substitution rather than appending) to avoid it
  entirely, is a prompt-authoring/design tradeoff outside this stage's authority — the same reasoning
  OD-8 already established, applied to a different line of the same authorized block. Neither this
  stage nor Specification's existing v7 text (which delegates only the "exact replacement text," not
  this specific length tradeoff) currently states which choice governs, so inferring one would repeat
  exactly the guess this skill exists to prevent.

- **Impact if left unresolved:** `so-planner`/the implementer could pick an "obvious" differentiation
  strategy (e.g. appending a marker character) without realizing it can turn a previously §4-compliant
  `meta_title` (bare H1 core ≤ 55) into one that newly trips the FROZEN `meta-title-length` check —
  narrowly for the general-row locales (H1 core of exactly 55 characters) and more broadly for de-DE
  (H1 core of 52-55 characters, depending on marker length) — reintroducing, at the terminal rung,
  exactly the kind of error-severity firing FR-13(c)'s own margin-thinning discussion (OD-8) already
  had to name and accept for the normal-case rung. Left unstated, this reads as if FR-13(b)'s fix is
  cost-free at the terminal rung, when it is not, for this bounded set of H1-core lengths — the same
  "silently reads as fully solved" risk OD-8 was recorded to prevent for the budget table. This is a
  distinct residual from OD-8's own (OD-8 concerns the *normal-case* rung's budget-vs-ceiling tension;
  this concerns the *terminal* rung's differentiation-fix-vs-ceiling tension), not one OD-8's existing
  acceptance already covers.

- **blocking:** false — non-empty resolution paths exist today (accept the bounded cost, precisely
  quantified above, as OD-8 does for its own residual; or constrain `so-planner` to a length-neutral
  substitution rather than an appending marker, which would close it entirely), so this does not block
  Specification from resuming on OD-9's grant. Delegated to SPECIFICATION to state explicitly when it
  next revises FR-13(b) to incorporate OD-9's authorization — the same disposition OD-8 received from
  OD-7's own verification.

---

## Summary

All ten Open Decisions this Story has raised across four CLARIFICATION-adjacent rounds (OD-1 through
OD-6 in v1/v2, OD-7 opened by SPECIFICATION v4 and resolved in v3, OD-8 opened by v3's own
verification of OD-7 and resolved by Specification v6/v7 as an accepted tradeoff, OD-9 opened by
SPECIFICATION v7/PLAN_REVIEW v1 and resolved in this round, OD-10 newly opened this round as a
bounded non-blocking residual of OD-9's own verification) are resolved or delegated as far as
available evidence and Owner input reach, and none is `blocking: true`. OD-9's resolution was
independently verified against the live `task-b.ts` text (confirming the cited line ranges match the
file's actual section boundaries), against Specification v7's own line-by-line requirements for
FR-13(a)/(b)/(d) (confirming full coverage, including line 49 — the exact line SPEC_REVIEW v3
previously caught a prior FR-13(b) draft omitting), and against `buildPromptB()`'s live source
(confirming the granted 112-140 range is the function's exact full span). That verification surfaced
one further residual — a precisely bounded interaction between FR-13(b)'s required `h1`-differentiation
fix and the untouched, FROZEN `output-validator.ts` 55-char ceiling (one exact H1-core length for the
general-row locales; up to four, depending on the differentiation marker's length, for de-DE) —
recorded as OD-10, non-blocking, for
Specification to carry forward explicitly rather than silently resolve by omission, the same discipline
OD-7's own verification applied to produce OD-8.

**Verdict: no blocking Open Decision remains (OD-1 through OD-9 all resolved; OD-10 opened
non-blocking, delegated to SPECIFICATION). See the Clarification Report for the readiness verdict.**

---
artifact: open_decisions
story: US-2.1
version: 2
status: ARCHIVED
owner: so-clarifier
created_at: 2026-09-19T00:00:00Z
updated_at: 2026-09-19T12:00:00Z
supersedes: docs/decisions/US-2.1-open-decisions.md#1
inputs_consumed:
  - key: story
    version: 1
  - key: open_decisions
    version: 1
  - key: clarification_report
    version: 1
open_decisions_blocking: false
---

# US-2.1 — Open Decisions

This is the **v2 revision**. v1 recorded OD-1..OD-11 with eight of them `blocking: true`. The
human (sbruhov@gmail.com) supplied written answers to all eleven on 2026-09-19. This run records
those answers as **settled decisions** and re-verdicts; it does not re-ask them.

Recording a decision a human supplied is not this skill answering its own question. Where a
human answer was factually impossible against the codebase, the human was asked a follow-up and
the confirmed correction is recorded under **Confirmed follow-up**. Nothing here was inferred by
this skill; every resolution is either the human's words or a repository citation, and citations
are marked as such.

**Blocking summary: none.** OD-1..OD-11 are all `blocking: false`. No Open Decision blocks
SPECIFICATION.

**Numbering is stable** — OD-n means the same question it meant in v1. No OD was added, merged or
renumbered; no v1 item was dropped.

Where a human answer settles the *principle* but leaves a detail for a later stage, that residual
is recorded inside its own OD as **Residual** and carried to the named stage. A residual is not a
re-opened question: the human explicitly authorised this routing in OD-9 ("the exact per-field
numbers are a specification detail ... to state explicitly in the spec").

---

## OD-1 (Story Q1) — What changed between v3 and v4?
- **Question:** Which rules are new or changed between v3 and v4 (word ranges, H2 titles, hook rules)?
- **Decision (human, 2026-09-19): SETTLED — no delta hunt.** v3 is unavailable for comparison and
  v4 is a complete, self-contained standard. v4 is the single source of truth and fully replaces
  the previous instructions. All generation prompts (`task-a.ts`, `task-a-doc.ts`) are updated so
  that every v4 word limit, H2/H3 structure and pattern rule becomes the new baseline.
- **Effect:** the spec writer treats the whole v4 document as the delta, exactly as the Story
  already states. No diff of `product_description_schema_v3_ua.docx` is required.
- **blocking:** false *(was false in v1; now settled as well as non-blocking)*

## OD-2 (Story Q2) — Fate of `schemaVersion: '3.0'` documents
- **Question:** Are `'3.0'` documents (cached, stored, or regenerated) rejected, migrated, or dual-supported?
- **Decision (human): SETTLED — dual support at the rendering layer.**
  - The Zod schema accepts `z.enum(['3.0', '4.0'])`.
  - Rendering components (UI, HTML generation) branch on the version: `'3.0'` keeps the old
    handling rules where they differ, `'4.0'` gets the new ones.
  - Every new LLM request must emit `schemaVersion: '4.0'`.
  - Rationale given: preserves the existing cache and avoids a costly mass migration.
- **Carried-forward constraint (interacts with OD-4 — read both together):** OD-4 removes the
  array form from `SpecRow.value`. A cached `'3.0'` document whose `value` is a `string[]` would
  then fail to parse, defeating the cache preservation that is OD-2's stated rationale. The
  human's own wording resolves the conflict — `'3.0'` "keeps the old handling rules where they
  differ", so the array form stays legal **for `'3.0'` documents only**, while `'4.0'` is
  string-only. How that is expressed in Zod (discriminated union on `schemaVersion`, a
  version-conditional refinement, or a parse-time upcast) is an ARCHITECTURE_PLANNING decision,
  not a clarification one. This is flagged because a spec writer reading OD-4 in isolation would
  write a flat `z.string()` and silently break OD-2.
- **blocking:** false *(was true)*

## OD-3 (Story Q3) — Detecting a hook "structural pattern"
- **Question:** What deterministic rule identifies which of the v4 §1 patterns a hook uses, and
  what is the rotation window / fixture batch for AC-9?
- **Decision (human): SETTLED — a deterministic index is chosen service-side, not by the model.**
  Generation is stateless per product, so the model cannot rotate patterns by itself. The
  orchestrator service (`src/services/content-orchestrator.service.ts`) computes a deterministic
  index before building the prompt and passes the chosen pattern into the prompt as an explicit
  instruction (e.g. "For this product use Pattern No. 3: scenario distribution").
- **Confirmed follow-up (factual correction):** the original answer proposed `hash(product.SKU) % 5`.
  There is no SKU in this codebase — `ProductInput` (`src/app/types.ts:37-49`) carries `website,
  name, description, specs, supplementalContent, customInstructions, templateId, customTemplate,
  imageManifest, brandFolder, modelFolder`. The human confirmed the substitution: **hash over
  `name` + `website`**. The same product in a different store may therefore draw a different
  pattern; the human accepted this as acceptable, arguably better for rotation.
- **Residual → carried to SPECIFICATION and TEST_WRITING (not blocking):** the settled mechanism
  gives an *even distribution* across the catalogue. AC-9 as written asserts something stricter —
  "no two **consecutive** products' hooks use the same pattern". A hash does not by itself
  guarantee the consecutive-pair property for an arbitrary batch; it is satisfiable for a curated
  fixture batch. The fixture batch and the rotation window for AC-9 were part of v1's OD-3
  question and were not addressed by the answer. This is a test-design detail (`test_strategy` /
  `ac_test_matrix`), not a contradiction of the Story: AC-9 remains achievable under the settled
  mechanism. It is recorded here so it is not silently dropped.
- **Non-blocking constraint → ARCHITECTURE_PLANNING (human's own note):** a per-product pattern
  index is dynamic input. It must not be injected into a cached prompt block or prompt caching
  breaks. Placement is an architecture decision.
- **blocking:** false *(was true)*

## OD-4 (Story Q4) — `SpecRow.value` array form
- **Question:** Remove `string[]` from `SpecRow.value` or keep it and comma-join at render?
- **Decision (human): SETTLED — remove the array form.** v4 §7 states that multiple values for one
  parameter are listed comma-separated on a single line. Change the schema to `value: z.string()`
  and drop `z.array(NonEmpty).min(1)`. Add an explicit prompt requirement: "Join multiple values
  with a comma into a single string." This keeps the domain consistent and removes the need for a
  `join(', ')` at render time.
- **Baseline (verified by the orchestrator):** `SpecRow.value` is currently
  `z.union([NonEmpty, z.array(NonEmpty).min(1)])` in `src/domain/description-doc.schema.ts`.
- **Carried-forward constraint — see OD-2.** "Remove the array form" applies to `'4.0'`. Applying
  it unconditionally to the shared schema would reject cached `'3.0'` documents and defeat OD-2's
  stated rationale. The removal must be version-scoped; the Zod expression of that is an
  ARCHITECTURE_PLANNING decision.
- **AGENTS.md §4 note (unchanged from v1):** spec-count parity is unaffected either way — comma
  joining preserves the row count.
- **blocking:** false *(was true)*

## OD-5 (Story Q5) — Non-uk-UA locales: same word ranges or scaled?
- **Question:** Do all non-uk-UA locales use the v4 ranges unchanged, scaled ranges, or is
  enforcement uk-UA-only?
- **Decision (human): SETTLED — enforcement is uk-UA only.** The v4 word ranges (40–85, 90–300, …)
  are calibrated for Ukrainian and apply **only** to the master generation (`uk-UA`). The
  translation pipeline (`task-translate`) is **not** constrained by numeric word limits for any
  other locale. Structure (H2/H3) is preserved everywhere; **text length in words is not validated
  on translated output at all.**
- **Confirmed follow-up:** the original answer offered "not validated (OR with ±30% tolerance)".
  The human picked **not validated outside uk-UA**. There is no ±30% tolerance band.
- **uk-UA fan-out (v1's open half, now answered):** uk-UA remains the native master; other locales
  follow the existing pipeline. The decision settles what v1 recorded as unstated — translated
  output gets no word-count validation, so the translate path needs no numeric-range change.
  Structure preservation is the only v4 obligation that fans out.
- **Consequence (human):** the v4-vs-`STORE_REGISTRY` locale mismatch recorded in v1 (pt-PT and
  ru-UA absent from the Story's Q5; IT present in v4 but in no store) no longer affects word
  counts. Separator rules remain OD-11.
- **blocking:** false *(was true)*

## OD-6 (Story Q6) — `task-a-consumables-doc.ts`
- **Question:** Is the Consumables Doc pipeline in or out of scope?
- **Decision (human): SETTLED — OUT of scope for US-2.1. A separate Story.**
- **Confirmed follow-up:** the original answer said "in scope", on the basis that v4 contains a
  simplified-schemas section for consumables. The human was shown that consumables are not the
  same document with a different `schemaVersion` — they are a separate domain model
  (`ConsumablesDescriptionDoc`, `src/domain/consumables-doc.schema.ts`) with a separate renderer
  (`renderConsumablesDoc`), and `src/prompt-core/doc-pipeline-flag.ts` states that a §C artifact
  cannot be expressed as a `ProductDescriptionDoc` at all. The human then chose to keep
  consumables out of scope, matching the Story's existing "Out of scope" section.
- **No Story amendment required.** The Story text stands as written.
- **Residual → SPECIFICATION (drafting note, not a question):** the Story's "Out of scope" names
  the simplified *schemas* (filaments/resins/powders, accessories, spare parts), not the
  consumables *pipeline files*. The specification should name `task-a-consumables-doc.ts`,
  `consumables-doc.schema.ts` and `renderConsumablesDoc` as out of scope explicitly, rather than
  leave it to inference from the schema wording.
- **blocking:** false *(was true)*

## OD-7 (Story Q7) — Split the Story per section?
- **Question:** Is this one Story, or should it be split?
- **Decision (human): SETTLED — one Story, explicitly confirmed. Do not split.** Keep one Story to
  avoid diluting context, but decompose into independent implementation phases:
  1. Domain and Zod schema updates (`schemaVersion: '4.0'`, `SpecRow`).
  2. Prompt updates (`task-a.ts`, `task-a-doc.ts`).
  3. Render template / transform updates (HTML structure).
  The specification should describe this as one Story with three clear phases.
- **This is the "explicit confirmation of one Story" that v1's OD-7 required to unblock.** No
  Story amendment.
- **blocking:** false *(was true)*

## OD-8 (new in v1) — Which FROZEN files actually need editing
- **Question:** Which of the FROZEN files named by the Story must change, and is `src/prompts/task-b.ts` untouched?
- **Decision (human): SETTLED as the intended scope, subject to AGENTS.md §9 per-file approval.**
  - `src/prompts/task-a.ts` — **changes** (v4 rules).
  - `src/utils/output-validator.ts` — **changes** (accept `'4.0'`, string-only `SpecRow`).
  - `src/prompts/task-c.ts` — **inspect**; cosmetic edits only if it affects spec assembly or the final render.
  - `src/prompts/task-b.ts` (SEO) — **do not touch.** v4 changes nothing about SEO meta.
  - `src/prompt-core/master-system-prompt.ts` — change **only** if it carries global volume
    constraints that contradict v4.
- **Verified context (orchestrator):** `task-a-doc.ts` calls `buildPromptA` from FROZEN
  `src/prompts/task-a.ts` and swaps only the instruction block, so shared input rules come from the
  frozen builder — v4 rules living in the shared builder do require editing FROZEN `task-a.ts`.
  This confirms the decision rather than contradicting it.
- **Repository citation (this run):** the FROZEN set is exactly five files, per
  `.arch-guard-checksums` — `task-a.ts`, `task-b.ts`, `task-c.ts`, `master-system-prompt.ts`,
  `output-validator.ts`. Notably `src/prompt-core/constants.ts` and
  `src/utils/number-format-fixer.ts` are **not** FROZEN, so the OD-11 edits are not §9 edits
  (see OD-11).
- **Sharpening the `master-system-prompt.ts` clause:** `NUMBER_FORMAT_RULES` is defined in
  non-FROZEN `constants.ts:489-501` and only *interpolated* into FROZEN
  `master-system-prompt.ts:83`. A separator-rule change therefore edits `constants.ts`, not the
  frozen file — which is consistent with the human's "change only if it carries global volume
  constraints".
- **Still required before IMPLEMENTATION (human):** explicit per-file AGENTS.md §9 approval
  in-session, and `bash arch-guard.sh --rebaseline` committed with the edit. This is a §9 gate at
  IMPLEMENTATION, not an unresolved question at SPECIFICATION.
- **blocking:** false *(unchanged; scope now settled)*

## OD-9 (new in v1) — Enforcement mechanism and measurement of numeric ACs
- **Question:** Are the word/item ranges in AC-1..AC-4 and AC-7 enforced by prompt instruction, by
  Zod, or by a post-generation validator? On what text are words counted, with what tolerance?
- **Decision (human): SETTLED — split by kind of constraint.**
  - **Item counts** (array lengths): enforced by **Zod** (`z.array(...).min(n).max(m)`). The model
    handles arrays well and the repair loop corrects a miss cheaply.
  - **Word volumes** (40–85, 90–300, …): enforced by **prompt instruction ONLY**. The validator
    (Zod / `output-validator`) must NOT reject a generation for 86 words instead of 85.
  - **Tests** for the word-volume ACs (AC-1..AC-4) use a soft check with tolerance (~±15%) against
    rendered text (HTML text nodes), not hard equality.
- **Residual → SPECIFICATION (human's own routing, not a re-opened question):** the human's
  illustrative example conflated two different counts. `killerSpecs` is 3–4 items (AC-2;
  `description-doc.schema.ts` already pins `.min(3).max(4)`), whereas 4–8 is `applications.items`.
  AC-3's "at most 8 items" states no minimum, while v4 line 283 says 6–8. The **principle** above
  is what OD-9 asked and it is settled; the exact per-field numbers are a specification detail to
  reconcile against v4 and the existing schema, and to state explicitly in the spec.
- **blocking:** false *(was true)*

## OD-10 (new in v1) — FAQ generation trigger and location
- **Question:** Is the FAQ produced on every generation or only when supplemental content is
  supplied? Is v4 §9's 150–400 words also an AC?
- **Decision (human): SETTLED — keep the current trigger logic.** Per v4, FAQ is "Рекомендовано"
  (recommended), not mandatory. FAQ continues to be generated **only** when supplemental content is
  supplied. The v4 rules (3–5 pairs, 150–400 words) are added to the FAQ generation prompt
  (`src/prompts/task-faq.ts`, which exists and is not FROZEN) for consistency, with **no change to
  the call architecture**. AC-8's FAQ clause is read as "when the FAQ is produced, it has 3–5 pairs
  and is never embedded in the description HTML" — not as a requirement to produce a FAQ on every
  generation.
- **This removes the v1 conflict with README** ("FAQ/HowTo generated only when supplemental content
  is provided"): current behaviour is confirmed, not changed.
- **Confirmed follow-up — §7 conditional generation is OUT of scope.** A second version of this
  answer also proposed that the §7 Tech Specs section be omitted entirely when the Tech Specs input
  is empty. That is new behaviour no current AC covers (AC-6 assumes the specs section exists). The
  human chose to handle it as a **separate Story**. It is NOT part of US-2.1 and must not appear in
  this specification. **No Story amendment** — AC-6 presuming the section exists is an absence of
  the new behaviour, not a contradiction of it.
- **blocking:** false *(was true)*

## OD-11 (new in v1) — Number-format rules for locales the Appendix leaves ambiguous
- **Question:** Which separator rules apply to es-ES, pt-PT, de-DE, en-ES, es-MX and ru-UA, and how
  do they coexist with `fixNumberFormatting` and the AGENTS.md §4 unit rule?
- **Decision (human): SETTLED — three groups.**
  - **en-US, en-ES, en-GB:** dot for decimals (`.`), comma for thousands (`,`).
  - **uk-UA, ru-UA, pl-PL:** comma for decimals (`,`), non-breaking space for thousands.
  - **de-DE, es-ES, pt-PT:** comma for decimals (`,`), non-breaking space for thousands. (v4 allows
    both a dot and a space for thousands in Spain; the space is the newer RAE standard and matches
    the other European locales, which is simpler in code.)
  `fixNumberFormatting` (`src/utils/number-format-fixer.ts`) is to be configured for exactly these
  three groups. AGENTS.md §4 "don't change values or units" still governs.
- **Implementation delta found by this run (citation, not a new question).** The repository already
  carries a v3-era separator block, `NUMBER_FORMAT_RULES` at `src/prompt-core/constants.ts:489-501`.
  Measured against the decision:
  - **Group 1 already matches** — `constants.ts:497-499` (en-GB/en-ES, en-US, es-US/es-MX).
  - **Group 2 already matches** — `constants.ts:493-494` (uk-UA/ru-UA, pl-PL).
  - **Group 3 is a real change** — `constants.ts:495-496` currently reads "de-DE / es-ES: decimal
    comma, thousands **dot (or space)** → 1.234.567,89". The decision fixes this on the
    non-breaking space. **pt-PT has no line at all today** and must be added.
  - **Not a §9 edit:** `constants.ts` is not on the FROZEN list (`.arch-guard-checksums`); the block
    reaches FROZEN `master-system-prompt.ts:83` only by interpolation.
  - **Test tripwire for the plan:** `src/prompt-core/ua-translation-style-guide.spec.ts:49` asserts
    the exact substring `'uk-UA / ru-UA: decimal comma, thousands non-breaking space'`, so a
    wholesale rewrite of the block will fail an existing test.
- **es-MX — the human's explicit latitude, preserved.** The decision states: "`es-MX` is in
  `STORE_REGISTRY` and has no rule stated — the spec must either place it in a group or scope
  AC-10's separator clause to the locales with an explicit rule." This skill does not choose
  between those two. It records only the evidence the spec writer may cite: `constants.ts:499`
  already assigns es-US/es-MX "decimal dot, thousands comma (US market, CLDR)", which coincides
  with group 1. `STORE_REGISTRY` confirms es-MX is live on Expert-3DPrinter
  (`constants.ts:77`, languages `['en-US', 'es-MX', 'uk-UA']`).
- **blocking:** false *(unchanged; the rule set is now settled and the residual is an explicit
  human-granted either/or, not an unanswered question)*

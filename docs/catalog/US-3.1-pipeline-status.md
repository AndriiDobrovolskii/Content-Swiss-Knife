---
artifact: pipeline_status
story: US-3.1
version: 10
status: DRAFT
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-09-27T10:00:00Z
updated_at: 2026-09-30T08:30:00Z
supersedes: docs/catalog/US-3.1-pipeline-status.md#9
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 19
  - key: open_decisions
    version: 4
  - key: impact_analysis
    version: 5
  - key: implementation_plan
    version: 11
  - key: task_breakdown
    version: 10
  - key: plan_review
    version: 9
  - key: test_strategy
    version: 6
  - key: ac_test_matrix
    version: 6
open_decisions_blocking: false
---

# Pipeline Status — US-3.1 (v10, post-`HUMAN_PR_APPROVAL`-rejection QA triage — no code written)

**Verdict this round: `CHANGES_REQUIRED`, `loop_back_stage: blocked_by_architecture`.** This
dispatch is a re-attempt of `IMPLEMENTATION` after a human rejected `HUMAN_PR_APPROVAL`
(`docs/workflow/workflow-state.yaml`'s `note`, `docs/workflow/history.jsonl`
`HUMAN_REJECTED`, `ts: 2026-09-30T07:00:00Z`), pointing at real-world QA evidence in
`Knowledge/Issues/Second Batch/` (three browser-console error dumps, two screenshots, and one
full unzipped generation-run output for "Formlabs Optical Cleaning Cloths" on EXPERT3D). Three
leads from that evidence were independently investigated against the live source and the actual
run artifacts, not taken on faith. **Two are confirmed, real defects that neither `task_breakdown`
v10 nor any of `T1`–`T15` (all already shipped, per `pipeline_status` v9) names a task for — so no
code was written this round**, per `so-builder`'s own contract ("do not write the fix untested...
return the appropriate loop_back key... rather than improvising scope"). **The third is confirmed
genuinely out of this Story's scope.** No file was modified; no commit was made.

---

## 1. LEAD 1 — `cta.heading`'s unconditional `NonEmpty` requirement wastes a real repair call on every v4 generation

**Confirmed real, independently re-derived from the live source, not from the lead's own framing.**

- `src/domain/description-doc.schema.ts:216` — `cta: z.object({ heading: NonEmpty, text: Prose })`,
  unconditional across both `schemaVersion` values.
- `src/render/render-description.ts:443-449` — for `isV4`, `doc.cta.heading` is provably discarded;
  the rendered `<h2>` comes from `getRenderRules(...).ctaHeading(doc.locale, doc.localizedName)`
  instead. The comment at that exact line states this explicitly: "`doc.cta.heading` is discarded —
  which is what makes FR-11's... path unreachable."
- `src/prompts/task-a-doc.ts:148-150` — the model is explicitly instructed: "Write the `cta.text`
  only — the heading is assembled in code from a per-locale template, so whatever you put in
  `cta.heading` is discarded."
- All three `Error{1,2,3}.txt` dumps (three separate generation attempts for the same product) show
  `content-orchestrator.service.ts:465`'s `console.error('...raw model output failed schema
  validation...')` firing with `cta.heading: ''` — the model correctly following its own prompt
  instruction (emit nothing meaningful there) and being unconditionally rejected for it by the schema.
- `src/utils/repair-strategy.ts:240-262` (`REPAIR_STRATEGIES.get('doc-schema')`, this Story's own T1)
  then spends one real `repairField` (`generateText`) call rewriting a value that is thrown away at
  render time — confirmed structurally (not merely asserted): T1's own design (`content-orchestrator
  .service.ts`'s `produceTaskADoc` catch block, per `task_breakdown` T1) returns the schema-invalid
  candidate for exactly this kind of field-scoped repair, and `'doc-schema'` has no `deterministic`
  rung, so every occurrence costs a real model call.
- Cross-checked against `repair_gate_report.md` from the actual unzipped run: it does not name
  `doc-schema`/`cta.heading` in its "Recurring rule failures" table (only `heading-brand-core-missing`
  and `meta-title-template-shape` appear there) — consistent with the field-scoped repair succeeding
  silently within the same attempt rather than surfacing as a separate tracked finding, not with the
  defect being absent. The `heading-brand-core-missing` rule (fixed on attempt 2 of that run) and this
  `cta.heading` waste are independent — they fire on different paths (`doc.localizedName` vs.
  `doc.cta.heading`) and there is no evidence in the report of them interacting.
- The lead's own suggested fix pattern (schema-version-conditional validation, mirroring
  `packageContents`'s `superRefine`/`resolveV4SectionHeadings` precedent already in the same file) is
  architecturally plausible on inspection, but deciding the exact conditional shape (a `superRefine`
  branch vs. a schema-version discriminated union vs. something else, and confirming it cannot weaken
  v3's behaviour where `render-description.ts`'s non-`isV4` branch uses `doc.cta.heading` verbatim) is
  a Zod domain-model design decision — `so-planner`'s territory, not `so-builder`'s to improvise.

**No task in `task_breakdown` v10 names this file/decision.** `T1` (the only task touching
`description-doc.schema.ts`'s `REPAIR_STRATEGIES` wiring) is about making a schema-invalid candidate
survive as repairable, not about which fields should be required at all per schema version. No
failing test exists for a schema-version-conditional `cta.heading`. Per `so-builder`'s own contract,
this is not built untested and not improvised — routed to `ARCHITECTURE_PLANNING`.

---

## 2. LEAD 2 — real defects found, but not the ones the lead's own framing suggested

**Sub-claim (a), a gating gap scoped to one locale: NOT confirmed — independently disproven by
reading the actual call sites.** `content-orchestrator.service.ts`'s `canonicalizeSeoData()`
(the function that applies `normalizeLongH1MetaTitle`) maps over **every** entry in
`seo.seo_data` — all four locales, not just uk-UA/primary — and `validateSeoMetadataShape()`
(`src/utils/seo-metadata-shape.ts:132`, `for (const [i, entry] of seo.seo_data.entries())`) iterates
the same array identically for every locale. There is no single-locale scoping anywhere in this
path. The lead's inference from `repair_gate_report.md`'s "Per-artifact detail" section having "only
ONE 'SEO metadata' entry" is a misread of that report's structure: "SEO metadata" is one **artifact
label** (the whole `seo_data` array, all locales, validated and repaired together via full-document
regeneration — there is no per-locale repair granularity in this design, by `T9`'s own Notes), not a
per-locale check. This sub-claim is not a defect.

**Sub-claim (b), a real bug in T15's own fallback truncation logic: CONFIRMED, and reproduced
exactly against the actual shipped artifact.** `src/utils/seo-metadata-shape.ts`'s
`computeLongH1MetaTitle(h1)` calls `truncateAtWordBoundary(h1, 49)`
(`SAFE_CORE_LENGTH = 49`) from `src/utils/repair-strategy.ts:192-206`. Traced by hand against the
real pt-PT `h1` from the unzipped run (`seo_metadata.json`):

```
h1 = "Panos de limpeza Formlabs Optical Cleaning Cloths x100"   (54 code points, indices 0-53)
chars.slice(0, 49) = "Panos de limpeza Formlabs Optical Cleaning Cloths"  (ends exactly at the
                                                                            end of "Cloths" —
                                                                            index 49 is itself a
                                                                            space, i.e. the natural
                                                                            49-char clip ALREADY
                                                                            lands on a clean word
                                                                            boundary)
```

`cutOnWordBoundary` (`repair-strategy.ts:199-206`) does not check whether the clip already ends at a
word boundary — it unconditionally calls `clipped.lastIndexOf(' ')` and backs up to it whenever the
clipped string contains any space at all, even when the character immediately after the clip point
(`h1[49]`, a space) proves no backup was needed. That unconditionally strips the clip's own trailing
complete word ("Cloths"), producing `"Panos de limpeza Formlabs Optical Cleaning"` +`"·"` =
**`"Panos de limpeza Formlabs Optical Cleaning·"`** — byte-for-byte identical to the malformed value
that actually shipped in the unzipped run's `seo_metadata.json`. This is not a hypothesis; it is a
reproduction.

This is a real, previously-undetected defect in `T15`'s own already-committed code (`4a7f806`). It
was not caught by `seo-metadata-shape.long-h1.spec.ts` (`so-test-writer`'s own, currently uncommitted
file) because that file's `h1OfLength()` fixture generator repeats a uniform `"AAAA "` 5-character
chunk — for every sampled length (`54, 55, 56, 60, 66, 70` in the closed-form sweep, and the
`h1Len = 54` boundary test), the 49-char clip point never happens to coincide with the fixture's own
word boundaries in the specific "already-clean-cut" way the real pt-PT `h1` does, so the test suite's
existing coverage cannot see this failure mode.

**This is not a fix `so-builder` can make untested, and it is not merely a missing test — it is an
architecture-level constraint.** `cutOnWordBoundary` is **shared**: it also backs `meta-title-length`'s
deterministic repair tier, whose behaviour at the H1-core-length-55 boundary is explicitly, deliberately
pinned as a **characterization test** by this Story's own `T12` ("a passing-on-write characterization
pin of already-implemented, unmodified `cutOnWordBoundary()` behaviour," per `task_breakdown` v5's `T12`
Notes). A same-function fix risks silently changing what that pinned test observes — AGENTS.md §7.7
forbids weakening it, and `so-builder` does not own deciding whether `T12`'s pin is still correct once
the shared function's behaviour changes. Deciding whether to (i) add a boundary-aware branch to the
shared `cutOnWordBoundary` (checked to still satisfy `T12`'s existing pin), or (ii) introduce a
`computeLongH1MetaTitle`-local variant that does not share the defect, is a design decision
`so-planner` has to make, not one `so-builder` may invent while turning a task green. No task in
`task_breakdown` v10 names this fix, and no failing test for it exists yet.

---

## 3. LEAD 3 — SEO Slug Generator's es-ES double-encoded `name` — confirmed out of scope, not touched

`git diff --stat main...HEAD` was re-run this round. `src/services/content-orchestrator.service.ts`
is broadly touched by this Story (523 lines changed) and does contain the Slug-generation code paths
(`buildPromptSlug`, `runRepairGate<SlugResponse>`, `normalizeSlugResponse`, three call sites around
lines 868-908, 1300-1333 and 1497-1529) — so the *file* is in this Story's diff. But **no task in
`task_breakdown` v10 touches the Slug JSON-parsing/response-shape path that produced the observed
defect** (`slugs.json`'s es-ES `name` field holding the entire raw JSON response double-encoded as a
string). The only Slug-related task, `T11`, is `slug-name-designator-lost` — an existing, unrelated
check in `slug-validator.ts` about a lost invariant-core token in an otherwise well-formed name — not
about malformed/garbage JSON reaching the `name` field at all. This is a distinct defect, in a
different failure mode, than anything `D1`-`D15` designed for.

**Not touched, per this dispatch's explicit instruction and AGENTS.md §7.8 (no drive-by fixes).**
Recommended: a new Story via `/so:new` for the SEO Slug Generator's response-parsing defect (the
es-ES `slugs[i].name` field receiving what looks like the full, stringified `SlugResponse` object
instead of a plain localized name — worth checking whether this is a `generateJson` extraction defect
for that one locale, e.g. a nested code-fence or double-JSON-encoding from the model, before assuming
it is prompt-text-driven).

---

## 4. What was NOT done this round, and why

- No file was edited. No commit was made. `git status` is unchanged from this dispatch's start.
- `LEAD 1`'s and `LEAD 2`'s fixes were not written, per `so-builder`'s own contract: both require a
  new architecture-level design decision `task_breakdown` v10 does not name a task for, and neither
  has a failing test yet. Writing either untested would violate AGENTS.md §5 (TDD) and §7.6.
- `LEAD 3` was verified and reported, not fixed, per this dispatch's explicit instruction.
- `docs/workflow/workflow-state.yaml` and `docs/workflow/history.jsonl` were not written — that is
  `so-orchestrator`'s job.

## 5. Recommendation for `ARCHITECTURE_PLANNING`

Two narrowly-scoped design decisions are needed before `IMPLEMENTATION_PLANNING`/`TEST_WRITING`/
`IMPLEMENTATION` can proceed on this rejection's findings:

1. **`cta.heading`'s `NonEmpty` requirement, made `schemaVersion`-conditional** (LEAD 1) — required
   non-empty for `'3.0'` (used verbatim by the renderer), relaxed to accept any string (including
   empty) for `'4.0'` (provably discarded at render time), mirroring the existing
   `packageContents`/`resolveV4SectionHeadings` conditional-by-version precedent already in
   `description-doc.schema.ts`. Must not weaken `'3.0'`'s validation.
2. **`computeLongH1MetaTitle`'s truncation defect at the exact word-boundary-at-49 case** (LEAD 2) —
   decide whether to fix the shared `cutOnWordBoundary` (verified not to regress `T12`'s existing
   characterization pin) or give `computeLongH1MetaTitle` its own non-shared truncation path.

`LEAD 3` is out of scope for this Story; recommend a new Story via `/so:new` for the SEO Slug
Generator's es-ES response-parsing defect.

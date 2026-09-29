---
artifact: pipeline_status
story: US-3.1
version: 12
status: ARCHIVED
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-09-27T10:00:00Z
updated_at: 2026-09-29T18:00:00Z
supersedes: docs/catalog/US-3.1-pipeline-status.md#11
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 20
  - key: open_decisions
    version: 4
  - key: impact_analysis
    version: 6
  - key: implementation_plan
    version: 13
  - key: task_breakdown
    version: 11
  - key: plan_review
    version: 10
  - key: test_strategy
    version: 7
  - key: ac_test_matrix
    version: 7
open_decisions_blocking: false
---

# Pipeline Status — US-3.1 (v12, T16/T17/T18 landed in working tree, uncommitted)

**Verdict: `PASS`.** T16 (D16), T17 (D17), T18 (D18) implemented; no test, fixture or FROZEN file touched; no commit made (per instruction).

| Task | File | Change |
|---|---|---|
| T16 | `src/utils/repair-gate.ts` | module-private `looksLikeJsonEnvelope`; field-scoped branch retries once with a corrective suffix on a JSON-shaped result, discards on a second (rung still advances once) |
| T17 | `src/utils/repair-strategy.ts` | `cutOnWordBoundary` early return when `chars[limit]` is in `[\s\-–—|,:;.]` |
| T18 | `src/domain/description-doc.schema.ts` | lenient `cta.heading` (`nullish().transform(v => v ?? '')`) + dedicated `.superRefine` re-applying `NonEmpty` at `['cta','heading']` unless `'4.0'` with empty heading |

Evidence: the 16 target tests now pass; `npm run test:logic` 149 files / 3945 passed, 3 skipped, 0 failed (includes the ~20 `cta.heading` specs and T12's pinned boundary block unmodified); `npm run test:components` 23 passed; `npm run lint` (tsc --noEmit) clean. `test:coverage`, build and arch-guard are QUALITY_GATE's. The user's uncommitted T13-T15 spec edits were left untouched.

Historical record (v11) follows.

# Pipeline Status — US-3.1 (v11, post-`HUMAN_PR_APPROVAL`-rejection QA triage, corrected — no code written)

**Verdict this round: `CHANGES_REQUIRED`, `loop_back_stage: blocked_by_architecture`.** Same
verdict as v10, but v10's own analysis contained two errors this revision corrects before
handing off — both found by re-checking the primary evidence a second time (the two screenshots
v10 had not yet opened, and the actual `repair-gate.ts`/`repair-strategy.ts` call chain for the
Slugs gate), not by trusting v10's own framing. **This revision reclassifies LEAD 3 from
"out of scope" to "in scope, and the most severe of the three"**, and corrects LEAD 2's account
of why the existing test suite missed T15's truncation defect. No file was edited and no fix was
written this round either — all three findings still require an `ARCHITECTURE_PLANNING` decision
this dispatch is not authorized to invent, per `so-builder`'s own contract.

---

## 1. LEAD 3 — corrected from v10: CONFIRMED, IN SCOPE, and the most severe finding this round

v10 concluded this was a different feature, untouched by this Story's task list, based on `T11`
naming a different check (`slug-name-designator-lost`) and no task literally saying "fix Slug JSON
parsing." That test was too narrow. The two screenshots (not yet opened when v10 was written) and
the live `repair-gate.ts`/`repair-strategy.ts`/`content-orchestrator.service.ts` source together
show this is a real defect in machinery **this Story itself shipped**, not a pre-existing,
unrelated bug:

- The app's own on-screen "Acceptance criteria check" (`Snipaste_2026-09-29_17-06-49.jpg`) already
  flags the symptom: `[SEO (es-ES)] H1 is "Paños Formlabs Optical Cleaning Cloths x100" but the
  slug name for the same locale is '{"site_name":"Default","slugs":[{"language":"es-ES","name":
  "Paños Formlabs Optical Cleaning Cloths x100","slug":"panos-formlabs-optical-cleaning-cloths-
  x100"}]}'`. The second screenshot (`Snipaste_2026-09-29_17-07-30.jpg`) shows the SEO Slug
  Generator panel itself: the es-ES "LOCALIZED NAME" field holds that entire JSON blob (160 chars)
  and the "URL SLUG" field is `slugify()` applied to the whole blob —
  `site-name-default-slugs-language-es-es-name-panos-formlabs-optical-cleaning-cloths-x100-slug-
  panos-formlabs-optical-cleaning-cloths-x100` — a garbage, unshippable URL.
- Root cause, traced through the live source, not asserted:
  1. `src/utils/repair-gate.ts:50-52`, `repairFieldPayload(basePayload, instruction)`, returns
     `{ systemBlocks: basePayload.systemBlocks, userContent: instruction }` — **the full base
     prompt's `systemBlocks` survive into the field-repair call, but its `userContent` (the real
     product/site context) is replaced entirely by the one-field repair instruction.**
  2. `src/prompts/task-slug.ts` (the Slug prompt's system instruction) repeatedly shows the model
     the full output contract, `{"site_name":"…","slugs":[{"language":"…","name":"…","slug":
     "…"}]}`, and several complete worked examples (`"Center 3D Print"`, `"EXPERT3D"`) — i.e., the
     system-level instruction the field-repair call still carries is "always answer with this
     complete JSON object."
  3. `repair-strategy.ts`'s `'slug-name-designator-lost'` entry's `fieldInstruction` (lines
     271-280) asks the opposite at the user-content level: "Return ONLY the corrected name as
     plain text — no quotes, no HTML tags, no commentary" — a direct instruction conflict between
     the surviving system block and the replaced user content, with no product/site context left
     to anchor the model's answer.
  4. For es-ES, the model resolved that conflict by obeying the system-level JSON-schema
     instruction instead of the field-level plain-text one, and — lacking the real site name in
     context — filled in a generic placeholder (`"Default"`) rather than `"EXPERT3D"`.
  5. `repair-gate.ts:276-279` (`applyTier`, the `field-scoped` branch) accepts whatever
     `opts.repairField(...)` returns, after only `?.trim()`, and writes it straight into
     `slugs[i].name` via `setAtPath` — no check anywhere in this path rejects a value that is
     itself JSON-shaped rather than a plain name.
  6. The call site's own `stripCodeFences()` wrapper (`content-orchestrator.service.ts:891-893`)
     only strips Markdown code fences; the model's raw, unfenced JSON string passes through it
     unchanged.
  7. `normalizeSlugResponse()` (`content-orchestrator.service.ts:1535-1549`) then runs
     `canonicalizeMultiInOne`/`normalizeSlug`/`stripSlugStopwords` on that JSON-blob string exactly
     as it would a real name, producing the garbage slug that shipped. Nothing in this function
     validates that `s.name` is plausible prose rather than serialized JSON either.
- **This is this Story's own work, not an adjacent feature.** The `repairField` executor for the
  Slugs gate was wired *by this Story* ("US-3.1 IMPLEMENTATION retry 2 (AC-6/FR-11, RECONCILIATION
  v1 Finding 0)" — the comment at `content-orchestrator.service.ts:887-890`) — before it, the
  field-scoped rung for `slug-name-designator-lost` (`T11`, also this Story) was wired in
  `REPAIR_STRATEGIES` but unreachable in production for lack of an executor. This Story is what
  made the field-scoped repair call for Slugs actually fire for the first time — which is exactly
  when this defect became observable. `repairFieldPayload()` itself (`repair-gate.ts`, this
  Story's own file) is the shared mechanism every field-scoped repair in this codebase goes
  through — `doc-schema` (`T1`), `slug-name-designator-lost` (`T11`), and `meta-title-length`
  (`T12`) all reuse it, so this is not confined to Slugs; it is a generic gap in how a field-scoped
  repair's raw output is trusted.
- **git diff --stat** was re-checked with this framing: `src/utils/repair-gate.ts` (`+451/-...`),
  `src/utils/repair-strategy.ts`, and the Slugs `repairField` wiring inside
  `content-orchestrator.service.ts` are all inside this Story's diff. v10's "the SEO Slug Generator
  is a different feature" framing was a misreading of the *symptom's UI surface* (a screen literally
  labelled "SEO Slug Generator" in the app) for the *actual defect's location* (the shared
  repair-gate mechanism this Story built).

**Not fixed this round, correctly** — this still needs a design decision, not an improvised patch:
an output-shape guard on `repairField`'s result before `setAtPath` accepts it (e.g., reject/retry
when the returned text parses as JSON or otherwise fails to look like the plain field it was asked
for), decided once for the shared `applyTier` field-scoped branch rather than patched per-strategy.
No task in `task_breakdown` v10 names this, and no test exists for it yet. **Recommendation
changed from v10: do NOT open a separate Story via `/so:new` for this** — it belongs in this
Story's own `ARCHITECTURE_PLANNING` re-pass, since it is a defect in this Story's own shipped
mechanism, not a pre-existing, independent one.

---

## 2. LEAD 1 — confirmed real, predates this Story, not a regression it introduced

`src/domain/description-doc.schema.ts:216` — `cta: z.object({ heading: NonEmpty, text: Prose })`
— unconditional across `schemaVersion`. `git log --follow` on this file shows this exact line
present unchanged since `937e283` ("feat(domain): typed description model + pure HTML renderer,
PR-1"), which **predates** `schemaVersion: '4.0'` itself (introduced later, `3c91582`,
US-2.1) and predates US-3.1 entirely. **This is not a regression this Story caused.**

What this Story's own `T1` (`df9ec36`) did change: before `T1`, a schema-invalid candidate
(`cta.heading: ''`) was discarded (`doc: null`) and the whole document fell through to a full
regeneration; after `T1`, the same defect is field-scoped-repaired instead — cheaper per
occurrence (one ~200-token `repairField` call vs. a full regeneration), but it still fires on
**every** `schemaVersion: '4.0'` generation, because `src/render/render-description.ts:443-449`
and `src/prompts/task-a-doc.ts:148-150` both confirm `cta.heading` is provably discarded at render
time for v4, and the model is explicitly told so — so the model correctly emits `''` every time,
and the schema rejects it every time. All three `Error{1,2,3}.txt` dumps (three independent
generation attempts for the one product) show this firing identically, confirming "every attempt,"
not "an occasional flake."

**No task in `task_breakdown` v10 names a fix for this**, and the fix the lead suggests (making
`NonEmpty` conditional on `schemaVersion`, mirroring the existing `packageContents`/
`resolveV4SectionHeadings` precedent in the same file) is a Zod domain-model design decision —
`so-planner`'s territory. **Flag for `so-planner`:** if `specification` v19 has no FR covering
"a v4 Doc's `cta.heading` need not be non-empty," this may need to loop back one stage further, to
`SPECIFICATION`, rather than being decided purely at `ARCHITECTURE_PLANNING` — not confirmed
either way this round; `so-planner` should check.

---

## 3. LEAD 2 — confirmed real, with two corrections to v10's own account

**Sub-claim (a) (a single-locale gating gap): still not confirmed, unchanged from v10.**
`canonicalizeSeoData()` maps over every entry in `seo.seo_data`, and `validateSeoMetadataShape()`
iterates the same array identically — both are locale-agnostic. Not a defect.

**Sub-claim (b) (a truncation defect in `computeLongH1MetaTitle`): confirmed, but v10's own
explanation of why the existing test suite missed it was wrong, and is corrected here.**

v10 claimed the `seo-metadata-shape.long-h1.spec.ts` fixture generator (`h1OfLength`, "AAAA "
chunks) "never happens to coincide" with the real defect's word-boundary shape. **That is false —
re-derived by hand this round:** for any `len ≥ 50`, `h1OfLength(len)`'s character at index 49 is
always a space (49 mod 5 === 4, the space position within each 5-character chunk), which is
*exactly* the shape that triggers the bug (`chars.slice(0, 49)` already ends at a complete word).
Tracing `h1OfLength(54)` by hand: `cutOnWordBoundary` strips a needless trailing 4-character "word"
exactly as it stripped "Cloths" from the real pt-PT `h1` — **the test fixture does exercise the
exact defect mechanism.** The suite stayed green anyway because
`expectGenuineH1PrefixShape()`'s assertions (`endsWith('·')`, `length <= 50`, `h1.startsWith(core)`)
only check that the result is *a* genuine prefix plus the mark, never that it is the *longest
available* one — so a needlessly short, word-dropping prefix still satisfies every assertion. The
gap is in what the tests assert, not in whether the fixture reaches the code path.

**pt-PT's shipped defect is not "the same shape" as uk-UA's — they are two different regimes,
and conflating them (as the original QA lead's framing did) obscures the fix.** uk-UA's `h1` is 46
code points — the **reachable** (`D6`, pre-`T15`) regime, where a dash-tailed shape is required and
the mid-word-truncated title the model first produced was correctly caught by
`meta-title-template-shape` and fixed via full-regen (`repair_gate_report.md`, "SEO metadata"
section). pt-PT's `h1` is 54 code points — the **unreachable** (`T15`/`D15`) regime, where the
"·"-suffixed fallback is deliberate, by-design output, not a caught-and-missed validation failure.
The defect is that `computeLongH1MetaTitle`'s own computation of that by-design fallback is wrong
(needlessly drops "Cloths"), not that the gate failed to catch a bad value — there is no repair
path here at all; the deterministic function itself is the bug.

**Implementation Plan §2.4.1's "closed-form proof" is not falsified by this — it proves a
narrower thing than truncation quality.** Re-read carefully this round: the proof establishes that
`normalizeLongH1MetaTitle` and `validateSeoMetadataShape`'s unreachable branch call the *same*
function on the *same* input, so the validator can never reject what the normalizer ships (self-
consistency) — it does not claim, and was never meant to claim, that `computeLongH1MetaTitle`
computes the *longest available* valid prefix. The real consequence is worse than an ordinary
missed validation: because validator and normalizer are the same function by design, **no
mechanism in this pipeline can ever catch a defect internal to that shared function** — it ships
as "valid" every time, for every `h1` whose natural 49-code-point clip happens to land exactly on
a word boundary (not a rare edge case; any `h1` where a word ends at code point 49 exactly).

**Flag for `so-planner`, beyond the truncation bug itself:** whether `"…Cloths·"` (missing
`"x100"`, ending in a bare middle-dot with no visible word after it) is an acceptable customer-
facing `meta_title` shape at all may be a Specification question, independent of whether the
truncation is computed correctly.

**Not fixed this round** — `cutOnWordBoundary` (`repair-strategy.ts`) is shared with
`meta-title-length`'s deterministic repair tier, whose behaviour at the H1-core-length-55 boundary
is explicitly pinned by this Story's own `T12` as a **characterization test** of that function's
existing, unmodified behaviour. A same-function fix risks changing what `T12`'s pin observes;
AGENTS.md §7.7 forbids weakening it, and deciding between (i) a boundary-aware fix to the shared
function verified not to regress `T12`'s pin, or (ii) a `computeLongH1MetaTitle`-local truncation
that does not share the defect, is `so-planner`'s decision. No task names this fix and no failing
test for it exists.

---

## 4. What was NOT done this round, and why

- No production file was edited. `git status` shows no change outside
  `docs/catalog/US-3.1-pipeline-status.md` (this artifact) across this whole dispatch.
- None of the three fixes were written, per `so-builder`'s own contract: all three require a new
  architecture-level design decision `task_breakdown` v10 does not name a task for, and none has a
  failing test yet. Writing any of them untested would violate AGENTS.md §5/§7.6.
- `docs/workflow/workflow-state.yaml` and `docs/workflow/history.jsonl` were not written — that is
  `so-orchestrator`'s job.

## 5. Recommendation for `ARCHITECTURE_PLANNING`

Three design decisions, in priority order (severity, not discovery order):

1. **(LEAD 3, highest priority — a corrupted, garbage URL shipped)** An output-shape guard on
   `repairField`'s returned value in `repair-gate.ts`'s shared `applyTier` field-scoped branch,
   before it is trusted as a plain field replacement — decided once for the shared mechanism
   (`doc-schema`, `slug-name-designator-lost`, `meta-title-length` all depend on it), not patched
   per-strategy. Consider also whether `repairFieldPayload()` should retain some minimal
   product/site anchor from `basePayload.userContent` rather than discarding it entirely, since the
   loss of that context is part of why the model reached for a generic placeholder.
2. **(LEAD 2)** Fix `computeLongH1MetaTitle`'s truncation so it does not needlessly discard a
   trailing word that already fits within `SAFE_CORE_LENGTH` — either a boundary-aware change to
   the shared `cutOnWordBoundary` (verified against `T12`'s existing characterization pin) or a
   local, non-shared truncation path for `computeLongH1MetaTitle`. Separately confirm with the
   Owner/Specification whether the "·"-suffixed fallback shape itself is acceptable.
3. **(LEAD 1)** Make `cta.heading`'s `NonEmpty` requirement `schemaVersion`-conditional — required
   for `'3.0'`, relaxed for `'4.0'` (provably discarded at render time) — mirroring the existing
   `packageContents`/`resolveV4SectionHeadings` conditional-by-version precedent. Confirm whether
   `specification` v19 already covers this or whether `SPECIFICATION` needs a new FR first.

No new Story via `/so:new` is recommended this round — all three findings are inside this Story's
own delivered mechanism, per the corrected LEAD 3 analysis above.

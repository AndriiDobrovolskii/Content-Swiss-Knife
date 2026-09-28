---
artifact: pipeline_status
story: US-3.1
version: 8
status: DRAFT
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-09-27T10:00:00Z
updated_at: 2026-09-28T19:30:00Z
supersedes: docs/catalog/US-3.1-pipeline-status.md#7
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 17
  - key: open_decisions
    version: 4
  - key: impact_analysis
    version: 4
  - key: implementation_plan
    version: 7
  - key: task_breakdown
    version: 6
  - key: plan_review
    version: 6
  - key: test_strategy
    version: 5
  - key: ac_test_matrix
    version: 5
  - key: reconciliation_report
    version: 2
open_decisions_blocking: false
---

# Pipeline Status — US-3.1 (v8, re-entry round)

**Verdict this round: `CHANGES_REQUIRED`, `loop_back_stage: blocked_by_architecture`. No production
code was written.** This is a re-entry into `IMPLEMENTATION` after a human rejected the previously
`APPROVED` `HUMAN_PR_APPROVAL` gate on new evidence: a real regeneration
(`Knowledge/Issues/First_Batch/expert3d_formlabs_optical_cleaning_cloths_2026-09-28_1706.zip`,
generated 2026-09-28T13:55:02Z, **after** the final prior `IMPLEMENTATION` commit `5fe0935`) shows two
unresolved defects in production, despite `RECONCILIATION` v2 reporting `PASS` on the story overall.
Both were independently re-diagnosed this round directly against the live source and the real
artifact, not taken on the dispatch's own framing. One (`meta-title-template-shape`) is **provably
unsatisfiable under the current architecture** for the three failing locales, not merely
under-repaired. The other (the `doc-schema` / `heading-brand-core-missing` oscillation) traces to two
confirmed gaps in `repair-gate.ts`'s shared repair mechanism — real, fixable, but genuinely new
behaviour in a module used by every gate (HTML, Doc, FAQ, SEO), with no existing test covering either
gap, so per `AGENTS.md` §5 and this skill's own TDD constraint, no production code for them was
written this round either.

Because the two defects are coupled (the dispatch itself asks for a design that resolves them
jointly, not two independent patches) and one of them requires an architecture-level decision no
amount of new tests alone can satisfy, the whole round routes to `ARCHITECTURE_PLANNING`
(`blocked_by_architecture`) rather than splitting into a partial `changes_required_tests` pass that
would leave defect 1 structurally unresolved regardless of what `so-test-writer` pins.

Branch: `feat/US-3.1-qa-gate-brand-core-fixes`. No commit made this round — nothing but this artifact
changed.

---

## 1. Defect 1 — `meta-title-template-shape` is architecturally unsatisfiable for long `h1` values,
## not merely unrepaired

### 1.1 What the real artifact shows

`Knowledge/Issues/First_Batch/expert3d_formlabs_optical_cleaning_cloths_2026-09-28_1706.zip`,
`seo_metadata.json` (extracted and read in full this round):

| Locale | `h1` (grapheme count) | shipped `meta_title` | Result |
|---|---|---|---|
| en-ES | 37 — `"Formlabs Optical Cleaning Cloths x100"` | `"Formlabs Optical Cleaning Cloths x100 - SLS Wipes"` (49) | **passes** |
| es-ES | 66 — `"Toallitas de limpieza óptica Formlabs Optical Cleaning Cloths x100"` | `"Toallitas de limpieza óptica Formlabs x100·"` (43) | fails — does not start with `h1` |
| pt-PT | 60 — `"Panos de limpeza ótica Formlabs Optical Cleaning Cloths x100"` | `"Panos de limpeza ótica Formlabs Cleaning Cloths x100·"` (53) | fails — does not start with `h1` |
| uk-UA | 69 — `"Серветки для очищення оптики Formlabs Optical Cleaning Cloths 100 шт."` | `"Серветки Formlabs Optical Cleaning Cloths 100 шт.·"` (50) | fails — does not start with `h1` |

Counts independently re-verified this round via `Array.from(h1).length` over the real JSON (not the
report's own prose). The repair-gate report
(`Knowledge/Issues/First_Batch/repair-report_EXPERT3D_Formlabs-Optical-Cleaning-Cloths_1790604324277.md`)
confirms `meta-title-template-shape` fired 3 times, was attempted once via full-document
regeneration (`SEO metadata — unresolved (1 attempt)`), and the regenerated title was still wrong in
the same way — "no targeted repair strategy — relies on full-document regeneration" is the report's
own annotation.

### 1.2 Why registering a repair strategy would not close this

`src/utils/seo-metadata-shape.ts` (`validateSeoMetadataShape`, lines 59-74) requires, for
`meta-title-template-shape` to pass: `metaTitle.startsWith(h1)` **and** a dash-shaped tail matching
`DASH_TAIL = /^\s*[-–—]\s*\S/` immediately after the `h1` prefix — i.e. at least one separator
character plus one more non-space character beyond `h1` itself. The **minimum possible length of a
passing `meta_title` is `len(h1) + 2`.**

`src/utils/output-validator.ts` (FROZEN, not authorized for this Story — Story Scope, OD-4) fires
`meta-title-length` (`error`-severity) at `MAX_META_TITLE = 55`. So a passing `meta_title` must
satisfy **both** `length ≥ len(h1) + 2` **and** `length ≤ 55` — which requires `len(h1) ≤ 53`.

es-ES (`66`), pt-PT (`60`) and uk-UA (`69`) are all above 53. **No `meta_title` string exists that can
satisfy both checks simultaneously for these three locales, on this real artifact.** This is not a
prompt-following failure or a missing repair instrument — it is the template's own arithmetic, given
`h1` is (by `task-a.ts`'s "H1 —" section and `task-b.ts`'s "TITLE CORE" definition, both re-read this
round) the **full, verbatim localized product name**, which routinely runs 60-70 graphemes in es-ES /
pt-PT / uk-UA for a moderately descriptive product name — this is not an outlier product. `task-b.ts`'s
own cascade (lines 47-59, all three rungs re-read this round) already anticipates this exact case:
step 3, "LAST RESORT," is defined as `"[H1 core]·"` with an explicit instruction "NEVER return the
bare H1 core alone" and "If `'[H1 core]·'` itself still exceeds the per-locale budget, return it
anyway, unchanged." **The model followed this instruction correctly** for es-ES/pt-PT/uk-UA — the
shipped titles are shortened/compressed forms of the localized name with `"·"` appended, exactly
step 3's shape — and step 3's own output is *definitionally* unable to satisfy
`meta-title-template-shape`'s `startsWith(h1)` requirement, because step 3 exists precisely for the
case where the template's normal form (which does start with `h1`) cannot fit. **The prompt's own
designed escape hatch and the validator's own hard requirement are mutually exclusive for any
`h1` this long.**

This is `OD-8`'s and `OD-10`'s own "long-name residual" (`docs/decisions/US-3.1-open-decisions.md`) —
previously accepted as a *bounded, rare* cost against one sampled product (Makera Cyclone, `h1` ≤ 53
graphemes in every locale) — now observed at **production scale** (3 of 4 locales, on an unremarkable
product) rather than as a rare edge case. Registering a `REPAIR_STRATEGIES` entry for
`meta-title-template-shape` would not resolve this: a field-scoped LLM rewrite is bound by the same
two constraints (`len(h1)+2 ≤ length ≤ 55`) as the original generation, so it would either (a) return
another step-3-shaped title that still fails `meta-title-template-shape` (repeating today's outcome at
a smaller cost), or (b) be instructed to violate `output-validator.ts`'s FROZEN 55-char ceiling, which
this Story is not authorized to touch. Either way the finding ships unresolved — a repair strategy
here would relocate where the cost is paid, not remove it.

### 1.3 What this needs — options for `ARCHITECTURE_PLANNING`, not decided here

This is a design conflict between three fixed points: `h1`'s definition (the full verbatim localized
name), the approved template's `startsWith(h1)` anchor, and the FROZEN 55-character ceiling. At least
one has to move. Options, not ranked, not chosen:

- **(a)** A new, separate §9 authorization to raise or condition `output-validator.ts`'s
  `MAX_META_TITLE` — a different FROZEN file than any of OD-3/OD-7/OD-9's grants, needing its own
  explicit Owner authorization naming that file.
- **(b)** Redefine `meta-title-template-shape`'s anchor from the full `h1` value to a shorter form
  (e.g. `productShort()`/`invariantCore()`, already used elsewhere in this Story for the brand-core
  checks) for the cases where `h1` alone exceeds the achievable budget — a `seo-metadata-shape.ts`
  redesign (non-FROZEN) paired with a `task-b.ts` prompt change; `task-b.ts`'s "— meta_title —" block
  is already under OD-9's granted scope, but anchoring on a *different* core than `h1` is new design
  substance the Specification has not stated, not a wording fix OD-9 already covers.
  - This changes AC-4 as currently worded ("`meta_title` follows the single approved template ...
    identically across all four locales") if the shorter core diverges from `h1` per-locale.
- **(c)** Accept the residual explicitly, the same disposition OD-8/OD-10 already used for the
  narrower cases they covered — scope `meta-title-template-shape` (or `AC-4` itself) to apply only
  when `h1` is short enough for the template to be reachable, and let a long-`h1` locale ship with a
  clearly-labelled, accepted residual instead of an `error`-severity finding a repair can never clear.
  This is a Specification-level scope decision, not something `so-builder` can decide unilaterally by
  quietly downgrading a check's severity.

Whichever direction is chosen changes what `TEST_WRITING` needs to pin — which is the concrete reason
this is routed through `ARCHITECTURE_PLANNING` rather than directly to `TEST_WRITING`.

---

## 2. Defect 2 — the `doc-schema` / `heading-brand-core-missing` oscillation: two confirmed
## `repair-gate.ts` mechanism gaps

### 2.1 What the real artifact shows

Same repair report, "HTML (base)" artifact (schemaVersion 4.0, uk-UA base generation):

```
Attempt 1
✅ fixed: heading-brand-core-missing — localized name must not end in "." ...
⚠️ introduced: doc-schema — cta.heading: Required
Discarded: net change +0

Attempt 2
✅ fixed: doc-schema — cta.heading: Required
⚠️ introduced: heading-brand-core-missing — localized name omits the required brand core
Discarded: net change +0

Shipped with unresolved errors: heading-brand-core-missing (the original, attempt-0 finding)
```

Both `doc-schema` (T1, `ladder: ['field-scoped']`) and `heading-brand-core-missing` (T7,
`ladder: ['field-scoped', 'block-scoped']`) already have registered `REPAIR_STRATEGIES` entries, and
`runDocGate` already wires both a `repairField` and a `repairBlocks` executor
(`content-orchestrator.service.ts:612`, `:620-624`) — so the oscillation is not "no repair instrument
exists," it is that the instruments that exist do not reliably reach these findings. Two confirmed
gaps, read directly against the live `repair-gate.ts`:

### 2.2 Gap (a) — the field-scoped rung silently no-ops on a genuinely MISSING field, not just a
### wrong one

`repair-gate.ts`'s `applyTier` (line 213-214):

```ts
const value = getAtPath(next, issue.path);
if (!strategy || typeof value !== 'string') { advance(issue); continue; }
```

`"cta.heading: Required"` is Zod's own message for an **absent key** (as opposed to `"String must
contain at least 1 character(s)"` for a present-but-empty one). For an absent key, `getAtPath` walks
down to a missing property and returns `undefined` (`repair-strategy.ts`'s `step()`, the non-mutating
read branch). `typeof undefined !== 'string'` is `true`, so the field-scoped rung **advances the
cursor without ever calling `repairField`** — no LLM call, no attempt, no error, just a silent skip.
The rung is then exhausted after one no-op pass (`doc-schema`'s ladder is `['field-scoped']` only), and
the finding falls straight to full regeneration.

**Confirmed this is untested, not merely unfixed.** T1's own scope (Task Breakdown T1, Story AC-6) is
stated as *"a `doc-schema` finding (an empty required string, or any Zod field-level failure)"* — the
parenthetical names the empty-string case as the example. The only fixture `TEST_WRITING` wrote for
this,
`src/services/content-orchestrator.doc-gate.spec.ts`'s `emptyRequiredStringDoc()` (lines 112-114),
sets `cta: { heading: '...', text: '' }` — `cta.text` **present, empty**, never an absent key. No test
anywhere in the suite exercises a field-scoped repair against a truly missing key. The real
regeneration hit exactly the untested shape.

### 2.3 Gap (b) — the main regeneration loop never retries the field-scoped/block-scoped rungs

`repair-gate.ts`'s `while (repairsUsed < opts.maxRepairs)` loop (lines 351-406) is what actually ran
here (the report's per-attempt `resolved`/`persisted`/`introduced` structure only exists in this
loop's own `attempts.push(...)`, confirmed by reading `runRepairGate` end to end). Inside that loop,
the **only** repair action taken on each fresh full-regeneration's output is a `deterministic`-tier
cleanup pass (lines 378-387):

```ts
const cleanupPlan = issues
  .filter(i => i.path && REPAIR_STRATEGIES.get(i.rule)?.deterministic)
  .map(issue => ({ issue, tier: 'deterministic' as RepairTier }));
```

Neither `doc-schema` nor `heading-brand-core-missing` has a `deterministic` function (both are
field-scoped/block-scoped only) — `cleanupPlan` is always empty for them, so **once either finding
survives into this loop, nothing but another full, whole-document regeneration can ever touch it
again.** A full regeneration has no monotonicity property (unlike a field-scoped edit, it is free to
fix the field it was told about and, in the same breath, change any other field the model happens to
render differently this time) — which is exactly the coin-flip behaviour the report shows: attempt 1
fixes the heading, breaks the CTA; attempt 2 fixes the CTA, breaks the heading; both are discarded on
a tied error count (`errCount` unchanged, `e < best.errors` never true), and the artifact ships
whatever attempt 0 happened to have.

This is why the pre-loop ladder (the one place field-scoped/block-scoped repair actually runs,
`repair-gate.ts` lines 290-323) matters so much: if gap (a) had not blocked `doc-schema`'s only rung,
**both** findings would very plausibly have been fixed together, monotonically, in that single
pre-loop pass — a `doc.cta.heading` field-scoped edit and a `doc.localizedName` field-scoped edit are
independent writes (`setAtPath` touches only its own leaf) and cannot regress each other. The
oscillation observed is the main loop's own full-regen non-monotonicity substituting for a
convergence the pre-loop ladder was designed to provide but could not reach because of gap (a).

### 2.4 A related, currently-dormant defect worth designing around, not the cause of this incident

`src/utils/doc-block-repair.ts`'s own doc comment (`getDocBlock`, lines 54-56) states paths passed to
it must be **Doc-relative** ("`keyBenefits[0].items[0].text`, `hook`"), resolved against the
*unwrapped* `ProductDescriptionDoc` — "never the `doc.`-prefixed wrapper-relative form `heading-
style.ts` emits against `DocAttempt`." But `runDocGate`'s `repairBlocks` closure
(`content-orchestrator.service.ts:620-624`) forwards `issue.path` straight through, unmodified, and
every Doc-path emitter in this codebase (`repair-strategy.ts`'s own addressing-grammar comment,
`doc-schema-issues.ts`'s `toDocPath()`, `heading-style.ts`'s Doc-path findings) uses the **prefixed**
`"doc.…"` form. So `getDocBlock(doc, 'doc.localizedName')` resolves against a nonexistent `doc.doc`
property and returns `undefined` — **the block-scoped rung is a silent no-op for every Doc-shaped
finding today**, not only these two rules. `repair-strategy.ts`'s own comment on the
`heading-product-name-stuffing` entry already documents this exact no-op as a known characteristic
("the Doc executor ... still no-ops on the second rung — harmless for the same reason as before, just
'wrong prefix for this executor'"), and it is harmless there specifically because that rule's
field-scoped rung already resolves it on the first pass. **It is not harmless for a rule whose
field-scoped rung can fail** — which `heading-brand-core-missing` is not guaranteed not to, and which
is exactly why this round's dispatch raises a "joint block-scoped repair" as a candidate design: today
that path is dead code, so no such joint repair can happen even after gap (a) is fixed, because
`doc-schema`'s ladder has no block-scoped rung at all (`['field-scoped']` only) to join with.

**Not claimed as the cause of the observed oscillation** — gaps (a) and (b) fully explain what the
report shows without invoking this. Recorded because it directly bears on the dispatch's own suggested
fix shape (a joint block-scoped repair covering both findings in one call) and because
`so-planner`/`so-implementation-planner` will need it to decide whether extending `doc-schema`'s
ladder to `['field-scoped', 'block-scoped']` is viable at all without first fixing this prefix
mismatch.

### 2.5 A possible false positive, flagged not fixed

The persisting `heading-brand-core-missing` finding on the shipped artifact reads: *"The localized
name ... must not end in '.' unless the source name's own name ends in it too."* The flagged string,
`"Серветки для очищення оптики Formlabs Optical Cleaning Cloths 100 шт."`, ends in `"шт."` — a standard
Ukrainian abbreviation for "штук" (units/pieces) that conventionally carries a trailing period. Whether
`heading-style.ts`'s `doc.localizedName` shape check (`SENTENCE_TERMINAL` banned-character set,
Task Breakdown T7) should treat this as a legitimate, non-sentence-terminal period is a linguistic
question this round does not resolve — recorded as an open question for whoever designs the fix, not
silently assumed either way.

---

## 3. Why this routes to `ARCHITECTURE_PLANNING`, not `TEST_WRITING`

Defect 1 (§1) has no satisfiable target for a test to pin under the current architecture — `len(h1) ≤
53` is not true for the real locales that fail, and no repair (field-scoped, block-scoped, or
otherwise) changes that arithmetic. `changes_required_tests` would ask `so-test-writer` to write a
test for a behaviour that cannot exist until one of §1.3's three fixed points moves — a decision only
`ARCHITECTURE_PLANNING`/the Specification/the Owner can make.

Defect 2 (§2) is, on its own, a more conventional "new logic needs new tests first" situation — but
the dispatch frames both defects as one convergence problem to close together ("a joint block-scoped
repair that satisfies both ... together, rather than two competing field-scoped/full-regen passes"),
and §2.4's dormant path-prefix defect means the "joint" shape of fix cannot even be attempted without
first deciding whether to extend `doc-schema`'s ladder and fix the prefix mismatch — both design
choices, not implementation details. Routing defect 2 through `ARCHITECTURE_PLANNING` alongside
defect 1 lets one plan revision cover both, then cascade through `IMPLEMENTATION_PLANNING` →
`PLAN_REVIEW` → `TEST_WRITING` (which writes the still-missing tests for gaps (a) and (b), and for
whichever option §1.3 selects) → `IMPLEMENTATION` again — rather than this skill guessing at a test
shape for defect 2 in isolation while defect 1 remains genuinely unresolved.

**No new/changed repair logic was written this round.** Per this skill's own TDD gate: gaps (a) and
(b) are new behaviour in `repair-gate.ts`, shared by every gate in this codebase, with zero existing
test coverage for either (confirmed in §2.2/§2.3) — writing them now, without `ARCHITECTURE_PLANNING`
first deciding whether/how to extend `doc-schema`'s ladder and without `TEST_WRITING` pinning the
missing-key and loop-retry behaviours, would be exactly the "vibe coding" AGENTS.md §1/§5 forbids.

---

## 4. Files changed this round

- `docs/catalog/US-3.1-pipeline-status.md` (this file) — `so-builder`'s own owned artifact, superseding
  v7.

No source file was touched. No test file, fixture, or `vitest.config.ts` coverage setting was
modified. No FROZEN file was touched. `git status` before and after this round's work shows no change
to any file this skill does not own.

---

## 5. Result Envelope

```yaml
stage: IMPLEMENTATION
skill: so-builder
story: US-3.1
result:
  verdict: CHANGES_REQUIRED
  loop_back_stage: blocked_by_architecture
  summary: >
    Re-diagnosed both defects from the 2026-09-28 real regeneration directly against the live
    source and the real artifact. Defect 1 (meta-title-template-shape, es-ES/pt-PT/uk-UA) is
    architecturally unsatisfiable as currently specified: a passing meta_title needs
    len(h1)+2 <= 55, i.e. len(h1) <= 53, and the real h1 values are 66/60/69 graphemes — no
    repair strategy can close this without moving one of h1's definition, the
    startsWith(h1)-anchored template check, or the FROZEN 55-char ceiling. Defect 2
    (doc-schema / heading-brand-core-missing oscillation) traces to two confirmed
    repair-gate.ts gaps: (a) the field-scoped rung silently no-ops when the addressed field is
    a genuinely MISSING key (Zod "Required"), not just a wrong-but-present string — untested,
    T1's own fixture only covers the present-but-empty case; (b) the main full-regen loop never
    retries field-scoped/block-scoped repair on a fresh attempt's own errors, so once a finding
    without a `deterministic` tier survives the pre-loop ladder, only non-monotonic
    whole-document regeneration can touch it again, which is what produces the observed
    fix-one-break-the-other cycle. Both defects need an architecture-level design decision
    before TEST_WRITING can pin anything; no production code was written this round.
artifacts_written:
  - key: pipeline_status
    path: docs/catalog/US-3.1-pipeline-status.md
    version: 8
    status: DRAFT
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 17
  - key: open_decisions
    version: 4
  - key: impact_analysis
    version: 4
  - key: implementation_plan
    version: 7
  - key: task_breakdown
    version: 6
  - key: plan_review
    version: 6
  - key: test_strategy
    version: 5
  - key: ac_test_matrix
    version: 5
  - key: reconciliation_report
    version: 2
blocking_issues:
  - "meta-title-template-shape (AC-4/FR-8) is unsatisfiable for h1 lengths > 53 graphemes under the
     current template anchor (verbatim h1 prefix) and the FROZEN 55-char meta-title-length ceiling —
     confirmed against real es-ES(66)/pt-PT(60)/uk-UA(69) h1 values from the 2026-09-28 regeneration.
     Needs an ARCHITECTURE_PLANNING decision among: (a) a new §9 authorization on
     output-validator.ts's ceiling, (b) anchoring the template on a shorter core than h1 for
     long-name cases, or (c) an accepted-residual scope narrowing of AC-4/the check itself."
  - "doc-schema's field-scoped repair (repair-gate.ts:213-214) silently no-ops when the addressed
     field is a missing key (typeof value !== 'string' on undefined), not just a present-but-wrong
     string — untested (T1's only fixture, emptyRequiredStringDoc(), covers present-but-empty only).
     Needs a design decision on how a field-scoped instruction should read/write a genuinely absent
     field before TEST_WRITING can pin it."
  - "The main regeneration loop (repair-gate.ts:351-406) only runs a deterministic-tier cleanup per
     attempt; doc-schema and heading-brand-core-missing have no deterministic tier, so once either
     survives the pre-loop ladder only non-monotonic full-document regeneration can act on it again —
     the confirmed mechanism behind the observed fix-one-break-the-other oscillation. Needs a design
     decision on whether/how to retry field-scoped/block-scoped repair inside this loop."
non_blocking_findings:
  - "The Doc gate's block-scoped rung (doc-tier.ts / doc-block-repair.ts) is a silent no-op for every
     doc.-prefixed Doc-path finding today, confirmed by doc-block-repair.ts's own doc comment
     (getDocBlock, lines 54-56) — dead code, not the cause of this round's oscillation, but relevant
     to any 'joint block-scoped repair' design ARCHITECTURE_PLANNING considers, since doc-schema
     currently has no block-scoped rung to join with heading-brand-core-missing's own."
  - "The shipped heading-brand-core-missing finding on uk-UA flags a localized name ending in
     '100 шт.' — a standard Ukrainian unit abbreviation — as a banned trailing period. Possible false
     positive in the SENTENCE_TERMINAL shape check; not resolved here, flagged for whoever designs
     the fix."
evidence:
  - "node -e computed Array.from(h1).length over the real seo_metadata.json from
     expert3d_formlabs_optical_cleaning_cloths_2026-09-28_1706.zip: en-ES 37, es-ES 66, pt-PT 60,
     uk-UA 69 (meta_title minimum passing length is len(h1)+2; hard ceiling is 55)."
  - "Read src/utils/repair-gate.ts in full (applyTier lines 203-252, main loop lines 351-406) —
     confirmed the typeof value !== 'string' skip and the deterministic-only cleanup pass."
  - "Read src/services/content-orchestrator.doc-gate.spec.ts lines 104-114 — confirmed
     emptyRequiredStringDoc() only exercises the present-but-empty case."
  - "Read src/utils/doc-block-repair.ts lines 54-56 and content-orchestrator.service.ts lines
     620-624 — confirmed the doc.-prefix mismatch."
```

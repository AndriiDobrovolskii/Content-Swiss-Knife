---
artifact: test_generation_report
story: US-2.1
version: 4
status: ARCHIVED
owner: so-test-writer
created_at: 2026-09-21T12:00:00Z
updated_at: 2026-09-23T12:00:00Z
supersedes: docs/tests/US-2.1-test-generation-report.md#3
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 2
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
  - key: plan_review
    version: 2
  - key: pipeline_status
    version: 4
  - key: reconciliation_report
    version: 2
open_decisions_blocking: false
---

# Test Generation Report — US-2.1

> **READ §8 FIRST AT v2.** §§1–7 below are v1's record of the `TEST_WRITING` pass, kept as written
> because they are the evidence that the tests were red before the implementation existed — the
> substance of AGENTS.md §5. **Their measurements are authoring-time measurements and are no longer
> current.** §8 carries the loop-back: the two defects corrected, the current full-suite, lint and
> coverage numbers, and what is now known that v1 could not know.

## 1. What was written

| File | Status | Covers |
|---|---|---|
| `test/fixtures/v4-docs.ts` | **created** (fixture module, not a spec) | the six `'3.0'` shapes the corpus lacks, the `'4.0'` family, `v4ConformanceDoc(locale)` |
| `src/domain/description-doc.schema.v4.spec.ts` | created | V1, V2, V12 |
| `src/render/render-description.v4.spec.ts` | created | V3, V15 |
| `src/prompt-core/v4-headings.spec.ts` | created | V7, FR-11 resolver, §2/§9 heading sourcing |
| `src/prompt-core/master-system-prompt.v4.spec.ts` | created | NI-1..NI-5, six tier-2 repairs, human decision 3 |
| `src/prompt-core/number-format-rules.v4.spec.ts` | created | V9 |
| `src/prompt-core/hook-pattern.spec.ts` | created | V5, AC-9 |
| `src/prompts/task-a-doc.v4.spec.ts` | created | V10, V6 (structural half) |
| `src/prompts/task-faq.v4.spec.ts` | created | FR-13 / AC-8 |
| `src/prompts/optimizer.spec.ts` | **appended to** | recorded human decision 2 |
| `src/render/doc-schema-issues.v4.spec.ts` | created | V13 / FR-30 |
| `src/services/content-orchestrator.hook-pattern.spec.ts` | created | V6 (`userContent` half), T8 / AC-9 service half |
| `src/utils/heading-style.v4.spec.ts` | created | V8 |
| `src/utils/number-format-fixer.v4.spec.ts` | created | T10 / FR-16 fixer half |
| `src/utils/structural-parity.v4.spec.ts` | created | V11, R9 |
| `test/render-conformance.v4.spec.ts` | created | V14 |

**No `src/**` source file changed.** No existing spec file was edited except `optimizer.spec.ts`,
which was appended to and whose five existing tests all still pass.

**v2 adds two edited spec files**, and nothing else:

| File | Change | Why |
|---|---|---|
| `src/prompt-core/hook-pattern.spec.ts` | `URL` → `NodeURL` from `node:url`; imports hoisted; stale header paragraph corrected | §8.1 |
| `src/prompts/task-a-doc.spec.ts` | line 82's superseded `"schemaVersion": "3.0"` pin → `"4.0"` | §8.2 |

## 2. The observed failure — `npx vitest run`, full logic suite

**⏱ AUTHORING-TIME MEASUREMENT (v1), superseded by §8.2.** This is what the suite reported before
any implementation existed. It is retained, not updated in place: it is the only record that these
tests were genuinely red for the right reason at the gate.

```
 Test Files  14 failed | 108 passed (122)
      Tests  213 failed | 2581 passed | 3 skipped (2797)
   Duration  78.27s
```

The passing count, **2581**, is identical to the pre-existing tree's own passing count, which is the
direct evidence that nothing already green was disturbed.

**Fourteen new spec files** were created; thirteen of them fail, and the fourteenth —
`src/utils/structural-parity.v4.spec.ts` — is green on arrival by design (V11 is a characterization
category; `structural-parity.ts` is in the plan's *Explicitly NOT modified* list). So the fourteen
failing files are those thirteen plus the appended `optimizer.spec.ts`. **No pre-existing spec file
turned red.** Verified by enumerating the failing files:

```
src/domain/description-doc.schema.v4.spec.ts
src/prompt-core/hook-pattern.spec.ts
src/prompt-core/master-system-prompt.v4.spec.ts
src/prompt-core/number-format-rules.v4.spec.ts
src/prompt-core/v4-headings.spec.ts
src/prompts/optimizer.spec.ts
src/prompts/task-a-doc.v4.spec.ts
src/prompts/task-faq.v4.spec.ts
src/render/doc-schema-issues.v4.spec.ts
src/render/render-description.v4.spec.ts
src/services/content-orchestrator.hook-pattern.spec.ts
src/utils/heading-style.v4.spec.ts
src/utils/number-format-fixer.v4.spec.ts
test/render-conformance.v4.spec.ts
```

### Per file

| File | Failed | Passed | Total |
|---|---|---|---|
| `src/domain/description-doc.schema.v4.spec.ts` | 13 | 11 | 24 |
| `src/render/render-description.v4.spec.ts` | 7 | 7 | 14 |
| `src/prompt-core/v4-headings.spec.ts` | 61 | 3 | 64 |
| `src/prompt-core/master-system-prompt.v4.spec.ts` | 21 | 7 | 28 |
| `src/prompt-core/number-format-rules.v4.spec.ts` | 6 | 7 | 13 |
| `src/prompt-core/hook-pattern.spec.ts` | *(module unresolved — 0 tests collected)* | — | — |
| `src/prompts/task-a-doc.v4.spec.ts` | 24 | 5 | 29 |
| `src/prompts/task-faq.v4.spec.ts` | 2 | 6 | 8 |
| `src/prompts/optimizer.spec.ts` | 5 | 6 | 11 |
| `src/render/doc-schema-issues.v4.spec.ts` | 1 | 8 | 9 |
| `src/services/content-orchestrator.hook-pattern.spec.ts` | *(module unresolved — 0 tests collected)* | — | — |
| `src/utils/heading-style.v4.spec.ts` | 2 | 10 | 12 |
| `src/utils/number-format-fixer.v4.spec.ts` | 11 | 6 | 17 |
| `src/utils/structural-parity.v4.spec.ts` | 0 | 8 | 8 |
| `test/render-conformance.v4.spec.ts` | 60 | 141 | 201 |

### The failures are for the right reason — verbatim samples

**V2 — the version has not widened yet (`description-doc.schema.v4.spec.ts`):**

```
× FR-27 — rejects a single-<h3> functionality group at `functionality.0.subsections`
  → expected [ 'schemaVersion' ] to include 'functionality.0.subsections'

× FR-15 — the schema accepts `4.0` as a version at all
  → expected [ Array(1) ] to deeply equal []
    + [ "schemaVersion: Invalid literal value, expected \"3.0\"" ]
```

**V3 — §2 still renders the table (`render-description.v4.spec.ts`):**

```
× emits exactly one <h2> and exactly one <ul>, and no <table> between them
  → expected +0 to be 1   // <h2> count in the §2 slice

× puts nothing between the <h2> and the </ul> …
  → expected '<div class="table-responsive"><table>…' to match /^<h2\b/

× renders each killer spec as <b>{label}: {value}</b> — {why} with a literal em dash
  → expected '<div class="table-responsive"><table>…' to contain '<li><b>Потужність лазера: 20 Вт</b> —…'
```

**V15 — §6 is still a `<ul>` for `'4.0'`:**

```
× `4.0` — renders the package-contents list as an <ol>
  → expected '<h2>Що в коробці?</h2>\n<ul>\n<li>Гра…' to contain '<ol>'
```

**V7 — the heading table does not exist (`v4-headings.spec.ts`), one failure per locale:**

```
× has all four entries for uk-ua, each a non-empty string
  → V4_SECTION_HEADINGS has no entry for uk-ua: expected undefined to be defined

× covers no locale the registry does not publish …
  → expected [] to deeply equal [ 'de-de', 'en-es', 'en-gb', …(7) ]
```

**NI-1..NI-5 (`master-system-prompt.v4.spec.ts`) — counted, not sampled:**

```
× has removed every occurrence of the superseded 40–75   → expected 3 to be +0
× has removed every occurrence of the superseded 90–200  → expected 2 to be +0
× has removed every occurrence of the superseded 150–2,000 → expected 1 to be +0
× has removed every occurrence of the superseded 80–150  → expected 1 to be +0
× names the content structure Schema v4.0 → expected '[ROLE]\nYou are an expert technical c…'
                                              to contain '[CONTENT STRUCTURE — … Schema v4.0]'
```

**V9 (`number-format-rules.v4.spec.ts`):**

```
× no longer offers de-DE or es-ES a thousands DOT
  → expected … not to match /de-DE:[^\n]*thousands dot/
× gives pt-PT a rule where the v4 Appendix states none
  → expected … to contain 'pt-PT'
× gives group 3 the same worked example group 2 already shows
  → de-DE: expected '1.234.567,89' to be '1 234 567,89'
```

**Recorded human decision 2 (`optimizer.spec.ts`):**

```
× names the target schema v4.0, not v3.0        → expected … to contain 'Schema v4.0'
× no longer directs the model to reproduce a §2a Killer Specs highlight table
                                                → expected … not to match /§2a/
× tells the model to merge a legacy §2 table into one <ul> of at most 8 items
                                                → expected … to match /<ul>|<li>/
× tells the model to format §6 package contents as an <ol>  → expected … to match /<ol>/
× tells the model to comma-join a multi-value §7 cell into one row
                                                → expected … to match /comma[- ]join|comma[- ]separated/i
```

**V5 / AC-9 and T8 — module resolution, the one failure class that is not an assertion:**

```
src/prompt-core/hook-pattern.spec.ts                     → Failed to resolve import './hook-pattern'
src/services/content-orchestrator.hook-pattern.spec.ts   → Failed to resolve import '../prompt-core/hook-pattern'
```

This is stated plainly rather than dressed up. `src/prompt-core/hook-pattern.ts` is **created by
T6**; there is no honest way to assert against a module that does not exist other than to import
it, and hiding the gap behind a dynamic specifier would type every assertion in both files as `any`
and trade a loud, specific failure for a quiet one. Both files are red in their entirety by design
and go green together at T6/T7/T8.

## 3. `npm run lint` — the eight type errors this stage leaves standing, and who clears each

**⏱ AUTHORING-TIME MEASUREMENT (v1), superseded by §8.3 — all eight are cleared.**

Baseline before this stage: **green, zero errors** (verified: `npm run lint` exited 0 with no
output on the pre-existing tree). After:

```
src/prompt-core/hook-pattern.spec.ts(35,50): error TS2307: Cannot find module './hook-pattern' …
src/services/content-orchestrator.hook-pattern.spec.ts(37,35): error TS2307: Cannot find module '../prompt-core/hook-pattern' …
src/services/content-orchestrator.hook-pattern.spec.ts(126,19): error TS2493: Tuple type '[input: ProductInput, baseLanguageOverride?: string]' of length '2' has no element at index '2'.
src/services/content-orchestrator.hook-pattern.spec.ts(136,68): error TS2554: Expected 1-2 arguments, but got 3.
src/services/content-orchestrator.hook-pattern.spec.ts(156,61): error TS2554: Expected 1-2 arguments, but got 3.
src/services/content-orchestrator.hook-pattern.spec.ts(157,61): error TS2554: Expected 1-2 arguments, but got 3.
src/services/content-orchestrator.hook-pattern.spec.ts(165,62): error TS2554: Expected 1-2 arguments, but got 3.
src/services/content-orchestrator.hook-pattern.spec.ts(166,63): error TS2554: Expected 1-2 arguments, but got 3.
```

| Error | Cleared by |
|---|---|
| TS2307 × 2 — `hook-pattern` module missing | **T6** creates `src/prompt-core/hook-pattern.ts` |
| TS2493 + TS2554 × 5 — `buildPromptADoc`'s third argument | **T7** adds the optional pattern parameter (C-2) |

**⚠️ THIS IS NOT THE FULL LIST OF MISSING ARTIFACTS, AND THE ASYMMETRY IS DELIBERATE.** Two more
things the plan requires do not exist yet and produce **zero** type errors: T2's
`V4_SECTION_HEADINGS` export on `constants.ts` and T4's `ctaHeading` member on `StoreRenderRules`.
They are reached through a module-namespace read and an optional-property read respectively, so
`tsc` cannot see them missing — they surface as **runtime** failures instead, 61 of them in
`v4-headings.spec.ts`, each naming the value it wanted. The reason for treating them differently
from `hook-pattern.ts` is mechanical, not stylistic: a **missing module** fails identically at
runtime whether imported statically or not, so a static import costs nothing and says the most; a
**missing named export from an existing module** is a link-time failure that takes the whole file
down and reports one module error instead of 61 individually named contract failures. A verifier
reading only the `tsc` output above would otherwise conclude that T2 and T4 are already satisfied.
They are not.

**Everything else typechecks, including the whole `'4.0'` question.** That is the boundary the plan
review drew and the one this stage was held to:

- `ProductDescriptionDocSchema.safeParse` takes `unknown`, so **V2's four negatives and V12 claim
  no `ProductDescriptionDoc` type at all** — `v4Negatives.*` and `v4LongHookDoc()` return `unknown`
  and the version is bumped on a plain object spread.
- Only **V3, V14 and V15's `'4.0'` half** feed `renderDescription(doc: ProductDescriptionDoc, …)`,
  and they all go through **one** helper, `asSchemaVersion4()` in `test/fixtures/v4-docs.ts`,
  carrying a single documented `as unknown as` cast with a comment naming C-1/D2 and instructing T3
  to delete it once the union widens.
- The two artifacts that do not exist yet but live on EXISTING modules — `V4_SECTION_HEADINGS` on
  `constants.ts` (T2) and `ctaHeading` on `StoreRenderRules` (T4) — are reached through the module
  namespace and the resolved rules object rather than by named import. That is not evasion: a named
  import of a missing export is a link-time failure that takes the whole module down and reports
  one module error instead of 61 individually named contract failures. The assertions still run
  against the real module object, and each says exactly which value it wanted.

`npm run lint` is AGENTS.md §6 item 1 — a **Definition-of-Done** gate that runs after
implementation. A red type-check for a module the plan has not created yet is the ordinary TDD
state at `TEST_WRITING`, and the task breakdown anticipated it: T1's Notes state in so many words
that T1's check 3 is "scoped to *this task's own file*", and that whole-tree lint-greenness at T1
"depends on the form `TEST_WRITING` gives its blocks, which is `so-test-writer`'s to decide".

## 4. Green-on-arrival tests, labelled as such — not presented as newly turned green

Every one of these is marked `🔵 CHARACTERIZATION` or `🔵 BASELINE` in its spec file, with the
reason stated inline.

| What | Where | Why it is green now |
|---|---|---|
| **V1, the whole leak suite** (8 tests) | `description-doc.schema.v4.spec.ts` | The baseline that makes V2 meaningful. It is only evidence while `src/domain/` is unmodified — a `'3.0'` shape that passes only after the schema moved proves nothing about the schema not having moved (C-1, T1 check 1) |
| **V15's `'3.0'` half** | `render-description.v4.spec.ts` | The only evidence D17 changed no cached behaviour, and only evidence against the UNMODIFIED renderer. Weakening it at T13 would erase exactly that (T13 check 2) |
| **V11, all 8 tests** | `structural-parity.v4.spec.ts` | `structural-parity.ts` is not modified by this Story. The suite records what a v4 master asks of a translation (R7) and what parity cannot see (R9) |
| **R9's negative half** | `structural-parity.v4.spec.ts` | 🔴 **The test passing IS the gap.** `COUNTED_TAGS` holds ten tags and includes neither `<ol>` nor `<ul>`, so a translated locale that reverts §6 to a `<ul>` passes parity while violating FR-20. **Accepted, not closed** — see §6 |
| **V13 / FR-30**, 8 of 9 tests | `doc-schema-issues.v4.spec.ts` | D16 adds no code: `assertDocRendered` already throws with the failures named. FR-30's obligation is negative, and a negative obligation rots without a test naming it |
| **FR-29's floor** | `description-doc.schema.v4.spec.ts`, `task-a-doc.v4.spec.ts` | The functionality bullets floor of 3 is unchanged by design; the assertion is that T3/T7 do not relax it as a side effect |
| **V6's block layout** | `task-a-doc.v4.spec.ts` | `systemBlocks[0]` byte-identical, index 1 replaced, `cache: true` — must survive T7 unchanged |
| **T12 tier-2 positive** | `master-system-prompt.v4.spec.ts` | COLON CAPITALIZATION and BOLD-LABEL SEPARATION must **survive** the relabel. T5's `bold-label-glue` clearance argument depends on the second one; deleting live coverage to tidy a stale label is a §7.7 move |
| **D13's exclusion list** (6 tests) | `master-system-prompt.v4.spec.ts` | Guards against collateral damage from an over-broad §9 edit — the 25,000-char cap, §4, §5, §6's conditional rule, the AT-MOST-TWO `<h2>` budget, the comma-join and video-in-§3 rules |
| **D14 exclusion** | `render-conformance.v4.spec.ts` | `Expert-3DPrinter` stays in the UNRENDERABLE bucket; the observable form of the exclusion |
| **FR-16 group 1 and group 2** | `number-format-rules.v4.spec.ts` | `es-MX` needs no code delta, and the group-2 line must stay byte-identical or `ua-translation-style-guide.spec.ts:49` breaks |
| **FR-13's existing numbers** | `task-faq.v4.spec.ts` | 3–5 pairs and 2–4 sentences are already stated; only the 150–400 range and the schema label are new |

**Vacuous passes were hunted and removed.** Five assertions initially passed for the wrong reason
and were tightened before this report was written: a `/lead-?in/` match that hit §4's `// optional
lead-in` comment; a `/no (table|paragraph|figure|video)/` match that hit "WHEN THERE IS NO VIDEO
CONTENT"; a `<b>`-glue negative that held only because the `'3.0'` §2 table has no `<b>` at all; a
§6 normalised-comparison that held while both paths still emitted `<ul>`; and a §2 clause slice
anchored on the first `"2. "` in the prompt, which reads `[BRAND / NAMING]`'s numbered list instead
of `[CONTENT STRUCTURE]`'s. Each now carries a guard assertion and an inline note.

## 5. Decisions taken at this stage, and the residuals they close

### 5.1 AC-9's fixture batch and rotation window (routed here by the Specification)

Asserted in two layers in `hook-pattern.spec.ts`: the **distribution** properties against the
function (every pattern reachable, not constant, not `website`-only, not one-character-of-`name`),
and the **rotation window** as a *derived* property — over a fixed 24-name catalogue in order, fewer
than half the adjacent pairs repeat, a run of **5** consecutive products with no two adjacent
patterns alike exists, and the catalogue spreads across every pattern rather than alternating
between two.

The window is derived rather than hard-coded on purpose: a hard-coded batch pins one particular
hash, so the first legitimate change to `selectHookPattern` would force whoever made it to edit this
test — the exact pressure AGENTS.md §7.7 exists to keep off a suite.

**The window LENGTH is derived too, and five is not a round number.** The plan floors
`HOOK_PATTERNS` at 4. For an index distributing evenly over four patterns each adjacent pair differs
with probability ~3/4, so a run of `k` needs `k-1` consecutive differences: a run of 8 occurs at any
given start with probability ~(3/4)⁷ ≈ 0.13, and a perfectly correct selector can easily fail to
produce one anywhere in 24 items. A run of 5 needs only (3/4)⁴ ≈ 0.32 per start across 20 starts and
is effectively certain for any distributing index. An earlier draft of this test required 8; that
would have made it the one test in this suite that can be RED AFTER A CORRECT IMPLEMENTATION, which
is exactly what a derived window exists to prevent. Five is also a faithful reading of AC-9, whose
subject is a fixture batch rather than a catalogue. The rate assertion beside it is the one that
cannot be dodged: a constant selector repeats on all 23 adjacent pairs and fails it outright.

FR-14's own text says the consecutive property is "satisfiable for a curated fixture batch" and "a
test-design matter"; this is that decision, taken and recorded.

### 5.2 The word-volume tolerance residual (OD-9) is closed by not existing

OD-9 recorded a soft ~±15% tolerance against rendered text. **No test in this suite measures a word
volume as a pass/fail criterion**, because FR-18 is the system behaviour and says the opposite. The
volumes are asserted only as prompt text (V10, NI-1/NI-3/NI-4) and as the absence of any rejection
(V12). A tolerance band is therefore not needed and is not introduced.

### 5.3 Four names and signatures fixed here because the plan left them open

Flagged in each spec file's header as well as here. `so-builder` must use them.

| Artifact | Fixed as | Task |
|---|---|---|
| The per-locale v4 heading table | `V4_SECTION_HEADINGS`, lowercase BCP47 keys, entries `{ keyBenefitsH2, packageContentsSingle, packageContentsSet, ctaTemplate }` | T2 |
| The CTA resolver on `StoreRenderRules` | `ctaHeading(locale, productShortName): string` | T4 |
| The FR-17 ceiling issue's operands | a zod custom issue carrying `params.measured = { actual, limit: 8, unit: 'items' }` | T3 |
| The locale-aware number fixer | `fixNumberFormatting(html, productName, locale)`, locale **optional** | T10 |

The lowercase key convention is not arbitrary: `DELIVERY_REGION_PHRASES` (`constants.ts:97`) and
`MANDATED_NOMINAL_H2` (`:1399`) are both keyed that way, and V7 cross-checks the §2 entries against
`MANDATED_NOMINAL_H2` by membership, so the two must share a key form.

### 5.4 Recorded human decision — the Optimizer

Decision 2 of HUMAN_PLAN_APPROVAL (2026-09-21) extends T12 to `src/prompts/optimizer.ts`, whose
instruction is **semantically rewritten** for v4 rather than renamed. **This is traced to no FR and
no AC in the approved Specification**, and it is recorded here so `so-reconciliation-reviewer` does
not read it as untraced scope creep. Five of the six new tests in `optimizer.spec.ts` fail today,
which closes the plan review's first non-blocking finding — that file "currently passes either
way".

## 6. Findings and gaps

1. **`master-system-prompt.ts:6` and `optimizer.ts:6` cannot be tested.** Human decision 3 relabels
   both to "Schema v4.0". Both lines are inside `//` source comments and are unreachable through
   any export, so no assertion can observe them. The **in-band** labels —
   `master-system-prompt.ts:212` (`[CONTENT STRUCTURE — Product Description Schema v3.0]`, which IS
   in the emitted prompt) and `optimizer.ts:49` ("the Schema v3.0 §1–§9 order") — **are** asserted
   and are red. `so-implementation-verifier` should check the two comment relabels by reading the
   diff. Same class: `task-a-doc.ts:18`'s stale "NOT WIRED INTO PRODUCTION" header, which T7
   corrects.

2. **T10 is a behaviour change to the fixer, not a configuration tweak — and every assertion in
   `number-format-fixer.v4.spec.ts` is red, including the two that read like characterizations.**
   `fixNumberFormatting` is locale-BLIND today and its own header says it "strips locale-specific
   thousands separators": `stripThousandsSeparators` collapses comma groups, space groups AND
   period groups to bare digits for every locale alike. So T10's acceptance check — "group-1 and
   group-2 locales are byte-unchanged" — is **not** true of the current implementation either:
   `1,234,567.89` comes out `1234567.89` and `1 234 567,89` comes out `1234567,89`. The tests state
   what the approved breakdown asks for; `so-builder` should expect to add grouping, not merely to
   gate stripping, and should check `seo-number-format.spec.ts` and `decimal-separator.spec.ts`
   stay green while doing it. Recorded as a finding for T10 rather than resolved here.

3. **R9 is asserted and accepted, not closed.** `structural-parity.ts`'s `COUNTED_TAGS` holds ten
   tags and includes neither `<ol>` nor `<ul>`, so a translated locale that swaps the v4 `<ol>` back
   to a `<ul>` reproduces every counted tag and passes. The test that records this is GREEN, and its
   passing is the gap. **Do not close it by widening `COUNTED_TAGS`** — that would retroactively
   fail every cached `'3.0'` translation pair that legitimately carries a `<ul>`, for a locale set
   with no `schemaVersion` to scope against.

4. **R3 has no detector and this suite adds none.** FR-16's group-3 switch ships with no automated
   check: `NBSP_THOUSANDS_LOCALES` (`output-validator.ts:44`) is declared and never referenced
   anywhere in the repository, and the live `thousands-separator` rule (`:93-102`) only flags
   English-style comma grouping. A de-DE artifact keeping `1.234.567,89` produces zero validator
   issues. Arming one means editing FROZEN `output-validator.ts` for a rule no FR requires.
   Recorded in `number-format-rules.v4.spec.ts`'s header.

5. **`test/fixtures/v4-docs.ts` already exists, so T1 and T3 must be re-read as "verify and
   extend", not "create".** This is the cross-stage edge the task breakdown carried forward as
   finding 7 and explicitly delegated to this stage: nothing in this suite is executable without the
   fixture module, so `TEST_WRITING` had to land it. Concretely:
   - **T1's checks 1, 2 and 4 remain exactly as written and are all still runnable** — run the V1
     block and V15's `'3.0'` half with `git diff --stat src/domain/` and `src/render/` empty, and
     confirm one builder per shape. Both are green today (evidence in §2).
   - **T1's check 3 needs re-reading.** `git grep -n "schemaVersion: '4\.0'" -- test/fixtures/v4-docs.ts`
     now returns one hit: the `asSchemaVersion4()` helper. That helper is not a `'4.0'` *document*;
     it is the single documented cast C-1's lint constraint is satisfied through, and the file
     typechecks today (§3). The substance of check 3 — lint green with no `'4.0'`-typed value
     before D2 — holds.
   - **T3's check 5 is unaffected and still meaningful**: the six `'3.0'` builder bodies must stay
     byte-unchanged, and the `'4.0'` family already sits beside them.

6. **The `'4.0'` corpus gap is a known finding, restated.** `test/render-reconciliation.report.md`
   §5 records that the corpus is two items of one product across two stores; the impact analysis
   measured that neither carries a `'4.0'` document, a non-`bullets` §2 Block, a video,
   `packageContents`, `compatibility`, an array spec value or a single-`<h3>` group. The
   reconciliation harness is the wrong instrument for `'4.0'` **by construction** — it reconciles
   against artifacts production has already shipped, and production has shipped no v4 artifact. No
   `'4.0'` item was added to `test/fixtures/corpus/` (plan R5), and `test/tools/scaffold-doc.mjs`
   was not touched. `test/render-conformance.v4.spec.ts` is what covers the gap instead, across 20
   store-locale pairs.

7. **V14 is a parallel matrix, not a flipped fixture, and that was a deliberate refusal.**
   `render-conformance.spec.ts:193-196` asserts the §2a killer-specs header pair — a table v4
   deletes. Flipping `conformanceDoc()` to `'4.0'` would make that correct assertion permanently
   red, and the only route back to green would be to weaken or delete it. Authoring that pressure
   into the suite would be an AGENTS.md §7.7 violation committed by the test writer. The existing
   matrix and its `'3.0'` fixture are untouched.

8. **`heading-style.v4.spec.ts`'s per-locale block carries its own vacuous-pass guard, and two of
   its five tests currently pass for that reason.** Until T5 renders the §2 `<h2>`, "no
   `h2-nominal-heading` warning" is true because there is no heading to warn about. The first test
   in each locale block (`renders one more <h2> than the same document does as '3.0'`) is the guard
   and is red; a reviewer reading a green `raises no h2-nominal-heading warning` in isolation
   should read the guard beside it.

## 7. Constraints honoured

- **No implementation code written.** `git status` shows no modification under `src/**` other than
  new `*.spec.ts` files and the appended `optimizer.spec.ts`.
- **No workflow state written.** `docs/workflow/workflow-state.yaml`, `active-story.yaml` and
  `history.jsonl` untouched; no Story, Specification, Open Decisions, impact analysis, plan,
  breakdown or plan review edited.
- **No existing test weakened, skipped or excluded** (§7.7). No `.skip`, no `.only`, no coverage
  threshold or `include` touched.
- **No assertion is `toBeTruthy()` alone**, and none is copied from actual output — every expected
  value is derived from a requirement, a registry, a constant or a sibling table entry.
- **Component/logic split respected.** No file is named `*.component.spec.ts`; the component runner
  gains no work.
- **Determinism.** No `sleep`, no unseeded randomness, no network, no wall-clock dependence.
- **Nothing out of scope was touched:** the consumables pipeline (`task-a-consumables-doc.ts`,
  `consumables-doc.schema.ts`, `renderConsumablesDoc`) and §7 conditional-omission behaviour have no
  test in this suite.

---

## 8. v2 — the loop-back from IMPLEMENTATION

`IMPLEMENTATION` completed and returned `CHANGES_REQUIRED`, loop-back key `changes_required_tests`,
naming two **test-side** defects. Attempt 1 of 3. Both are fixed; nothing else in the suite changed.

**All six of `so-builder`'s findings were read, not just the two dispatched** (`docs/catalog/US-2.1-pipeline-status.md`
§Findings). Only **F3** and **F4** are test-side and they are §8.1 and §8.2 below. Of the rest:
**F1** (T1's C-1 baseline evidence unobtainable, because v1 committed both fixture families at
once) is evidentiary and explicitly "not a thing to repair" — stripping the `'4.0'` builders to
satisfy a checklist would be the §7.7 move; it stands as a finding for `RECONCILIATION`. **F2**
(`optimizer.spec.ts` red at baseline) is closed at T12, all 11 tests pass. **F5** (the FAQ is
Schema v4.0 **§8**, not §9 — the master prompt reserves §9 for the CTA) is a source correction
already landed at `8b34852`; `task-faq.v4.spec.ts` asserts only `not.toContain('Schema v3.0')`, so
it is satisfied either way and **no test change is needed** — recorded here because a test that
cannot tell the two numberings apart is worth naming. **F6** is answered in §8.3 and §8.4.

### 8.1 Defect 1 — `hook-pattern.spec.ts`'s NFR-5 purity scan could not run at all

**What was wrong.** `vitest.config.ts:23` sets `environment: 'happy-dom'`. happy-dom's global `URL`
resolves every specifier against `http://localhost:3000/` and ignores a `file://` base, so

```
fileURLToPath(new URL('./hook-pattern.ts', import.meta.url))
```

threw `ERR_INVALID_URL_SCHEME` before `readFileSync` was ever reached. The module source was never
read, so the test could neither pass nor fail honestly — it reported a thrown URL error in place of
the property it exists to assert. The other 12 of the file's 13 assertions were unaffected and green.

**The fix.** `import { fileURLToPath, URL as NodeURL } from 'node:url'`, hoisted to a static import
beside `readFileSync`, and `new NodeURL(...)` at the call site. `node:url`'s WHATWG `URL` is
base-faithful. The precedent already exists in this repository's test layer at
`src/app/components/html-editor/beautify-round-trip.spec.ts:13`.

**What did NOT change.** The three assertions are byte-for-byte v1's:

```ts
expect(source).not.toMatch(/Math\.random/);
expect(source).not.toMatch(/\bnew Date\b|Date\.now/);
expect(source).not.toMatch(/^\s*let\s/m);
```

No assertion was deleted, weakened or relaxed, and `vitest.config.ts` was not touched. The
`async` keyword came off the callback with the dynamic imports, since nothing is awaited any more.

**One assertion was ADDED — an anti-vacuity guard, which is the lesson of this defect.** Three
negatives over an empty or wrong string all pass, so the test now asserts
`expect(source).toContain('export function selectHookPattern')` **before** evaluating any negative.
Had that guard existed at v1, a silent degradation of the read would have been loud; the thrown
`ERR_INVALID_URL_SCHEME` happened to be loud on its own, but the next failure mode of a
file-reading test is not guaranteed to be. This tightens the test; it does not relax it.

**Why not `// @vitest-environment node`.** It switches the environment of the whole file, including
the twelve behavioural tests that never touch the file system — a broad change to fix one line.

**The property genuinely holds.** Read directly from `src/prompt-core/hook-pattern.ts`: `fnv1a` is
written with `reduce` precisely so the module holds no mutable binding, there is no `Math.random`,
and there is no `Date`. The test now demonstrates that instead of throwing on the way to it.

### 8.2 Defect 2 — the mutually unsatisfiable `schemaVersion` pair

`task-a-doc.spec.ts:82` required `"schemaVersion": "3.0"` **present** in `TASK_A_DOC_INSTRUCTION`;
`task-a-doc.v4.spec.ts:50` requires `"3.0"` **absent** from the same string. No implementation can
satisfy both. `so-builder` correctly declined to touch either — it may not edit tests. Tests are
this stage's, so this stage settles it.

**Verified independently against the approved Specification, not taken on trust.** The v4 assertion
is the live contract, on three citations:

| Source | Line | What it says |
|---|---|---|
| **FR-15** | `docs/specifications/US-2.1-spec.md:354-363` | "Every new LLM generation emits a document with `schemaVersion: '4.0'`." `'3.0'` "remains accepted" by the **domain schema** and in **rendering**, for documents already cached — "Existing cached documents are neither rejected nor mass-migrated." Its failure path names "a new generation emitting `'3.0'`" as a defect |
| **FR-30**, cited by FR-15 | `:363` | "A generation that cannot produce a valid `'4.0'` document does not fall back to `'3.0'`" |
| **Plan D16** | `docs/plans/US-2.1-implementation-plan.md:777-784` | "D1 emits `'4.0'` from the prompt and validates it in the schema; there is no code path that retries as `'3.0'`, and none is added" |

`TASK_A_DOC_INSTRUCTION` is the prompt — the text that produces a **new** generation. FR-15's
`'3.0'` tolerance is scoped to parse and render, which are `description-doc.schema.spec.ts`'s and
`render-description.spec.ts`'s subject and are both still green and unmodified. So the v3 pin at
`:82` encodes a superseded rule.

**The resolution is an update, not a deletion.** `task-a-doc.spec.ts:82` now reads

```ts
expect(TASK_A_DOC_INSTRUCTION).toContain('"schemaVersion": "4.0"');
```

with an inline comment carrying the three citations. A positive, exact-string version pin is
retained in that file rather than dropped; the negative (`"3.0"` absent) stays in the v4 file. This
is a contract change, which `task-a-doc.v4.spec.ts:6-9` anticipated in its header and test strategy
v1 §9 recorded as T7's — the only correction is **who** makes it. **The file's other twelve tests
are untouched and all pass**, including the `bullets 3–8` and prose-field clauses v1 flagged as
text T7 rewrites: T7's rewrite preserved every one of them.

### 8.3 The current numbers — full suite, lint, coverage

Every command below was run in this repository and its real output recorded.

```
$ npx vitest run
 Test Files  122 passed (122)
      Tests  2812 passed | 3 skipped (2815)
   Duration  77.34s
```

```
$ npm run lint          # tsc --noEmit
(no output, exit 0)
```

**All eight type errors §3 left standing are cleared** — T3 widened the `schemaVersion` union, T6
created `src/prompt-core/hook-pattern.ts`, T7 added `buildPromptADoc`'s optional third parameter.
The `asSchemaVersion4()` cast's clearance is T3's and is visible in the exit code, not in a comment.

```
$ npm run test:coverage   # exit 0 — every floor in vitest.config.ts met
Statements   : 91.96% ( 2999/3261 )
Branches     : 85.83% ( 1787/2082 )
Functions    : 94.12% ( 641/681 )
Lines        : 92.56% ( 2554/2759 )

  domain       100 stmts | 95.45 branch | 100 func | 100 lines   (floor 95/90/95/95)
  prompt-core  98.12     | 88.96       | 100      | 99.09        (floor 95/85/95/95)
  render       99.39     | 91.75       | 100      | 100          (floor 95/90/95/95)
```

**This answers `so-builder`'s finding F6 directly.** Coverage emitted no report at all while a test
failed, so the floors were unevaluable; with the suite green they are measurable again and **all of
them pass**. No floor was lowered and no file was excluded.

### 8.4 `so-builder`'s four unreached defensive branches — measured, and none breaks a floor

`so-builder` recorded four defensive branches no fixture reaches. Measured against the floors:

| Branch | Where (uncovered line, from the v8 report) | Floor it sits under | Margin |
|---|---|---|---|
| The `en-gb` heading fallback in `renderKeyBenefitsV4` | `render-description.ts:277` — `?? V4_SECTION_HEADINGS['en-gb']` | `src/render/**` branches ≥ 90 | **91.75** |
| The non-`bullets` arm of `renderKeyBenefitsV4`'s `flatMap` | `render-description.ts:283-284` | same | same |
| The `!headings` throw in `ctaHeading` | `store-render-rules.ts:98` | `src/prompt-core/**` branches ≥ 85 | **88.96** |
| The `!headings` arm of the FR-6 §6-heading check | `description-doc.schema.ts:348` — the `: []` arm of `allowed` | `src/domain/**` branches ≥ 90 | **95.45** |

**No coverage floor breaks on them, so no test is added for them, and that is a deliberate refusal
rather than an oversight.** All four are unreachable-by-construction guards over data the schema and
`V4_SECTION_HEADINGS` already make total: `store-render-rules.ts:98`'s own comment says "every
locale any registry store publishes has a table entry by construction". A test for one would have to
manufacture a state the system cannot be in, and it would be written **from the implementation**
rather than from an acceptance criterion — the one thing `TEST_WRITING` may not do (AGENTS.md §5,
skill contract). Recorded here so that if a later change does trip a floor on them, the next writer
knows they were seen and left.

One measured near-neighbour, for the same reason: `hook-pattern.ts` shows **50% branch** coverage on
its single branch, `character.codePointAt(0) ?? 0` (`:99`) — a guard against a `codePointAt` that
cannot return `undefined` for an index `Array.from` produced. `prompt-core` clears its floor with
3.96 points of margin regardless.

### 8.5 Constraints honoured at v2

- **Only `*.spec.ts` files were edited.** `git diff --stat` for this revision touches
  `src/prompt-core/hook-pattern.spec.ts`, `src/prompts/task-a-doc.spec.ts` and the three artifacts
  below. No source file, no `vitest.config.ts`.
- **No assertion weakened, deleted, skipped or relaxed.** Defect 1 kept all three assertions
  verbatim; defect 2 replaced a superseded exact-string pin with the current one. No `.skip`, no
  `.only`, no coverage threshold or `include` touched (§7.7).
- **No workflow state written.** `docs/workflow/workflow-state.yaml` and `history.jsonl` untouched.
- **The staged US-1.1 rollback in the working tree was not disturbed.** Every commit names its paths
  explicitly; no `git add -A`, no `git add .`, no `git commit -a`.
- **No Pull Request pushed, opened or merged.**

---

## 9. v3 — the N9 loop-back, attempt 1 of 3

`IMPLEMENTATION` returned `CHANGES_REQUIRED` with loop-back key `changes_required_tests` on a
**single** issue, N9, resolved by the human ruling recorded in `docs/workflow/history.jsonl` at
`2026-09-22T15:00:00Z`: FR-16's group-2 standard, under which `uk-UA` **preserves** its thousands
grouping, is the v4 standard and overrides the legacy locale-blind behaviour encoded in two
pre-existing spec files. The approver stated this is a legitimate update to match a new
requirement, **not** an AGENTS.md §7.7 weakening.

### 9.1 The character, derived from FR-16 — U+00A0

The loop-back described it as "a non-breaking space". That was verified rather than taken on trust,
and the result agrees, at **U+00A0 NO-BREAK SPACE**:

| Source | What it says | Weight |
|---|---|---|
| `docs/specifications/US-2.1-spec.md:373` — FR-16's group table | group 2 (`uk-UA`, `ru-UA`, `pl-PL`): decimal comma, thousands **"non-breaking space"**, example `1 234 567,89` | **Authoritative in words.** The rendered example is typed with ordinary U+0020 in the Markdown source (hexdump: `1 ... 2 3 4 ... 5 6 7 , 8 9`, byte `0x20`) — a source-typing artifact, not a specification of the codepoint |
| `src/prompt-core/constants.ts:626` — `NUMBER_FORMAT_RULES` | `- uk-UA / ru-UA: decimal comma, thousands non-breaking space  → 1 234 567,89` | Same: the words are the rule, the example's separators are U+0020 in the source |
| `src/utils/number-format-fixer.ts:158` | `const NBSP = '<U+00A0>';` — hexdump `c o n s t   N B S P   =   ' 302 240 ' ;`, and `0xC2 0xA0` is UTF-8 for **U+00A0** | **Decisive.** This is the constant the fixer emits |
| `src/utils/number-format-fixer.ts:73-75` — `regroupDotThousands` | group 3 replaces each thousands dot with **that same `NBSP`** | **Decisive by parity.** Groups 2 and 3 share one "non-breaking space" wording in FR-16, and group 3's implementation nominates U+00A0 |
| `src/utils/number-format-fixer.ts:124` — `stripThousandsSeparators` | matches `[ \u00A0\u202F]` | **Not** a target. U+202F is a *tolerated input*, never an output the codebase nominates |

**Conclusion: U+00A0, not U+202F, not U+0020.** The tests write it as the named ASCII-source
constant `String.fromCharCode(0xa0)` rather than as a literal, so the expectation is legible in a
diff. `consumables-prose-transforms.spec.ts` reuses the `NBSP` constant it already declared at
`:95`, verified U+00A0 by hexdump (`' 302 240 '`).

### 9.2 The three assertions

| File | Site | Was | Is |
|---|---|---|---|
| `src/render/doc-prose-transforms.spec.ts` | `out.hook` (was `:161`) | `.not.toContain('20 000')` | ``.toContain(`20${NBSP_U00A0}000`)`` **+** `.not.toContain('20000')` |
| `src/render/doc-prose-transforms.spec.ts` | `out.cta.text` (was `:183`) | `.not.toContain('20 000')` | ``.toContain(`20${NBSP_U00A0}000`)`` **+** `.not.toContain('20000')` |
| `src/render/consumables-prose-transforms.spec.ts` | `out.cta` (was `:109`) | `.not.toContain('20 000')` | ``.toContain(`20${NBSP}000`)`` **+** `.not.toContain('20000')` |

**Each site gained a positive assertion; none merely lost a negative.** The task's instruction was
to assert the positive property rather than settle for deleting the negative, and the retained
`not.toContain('20000')` pins the specific regression — flattening — that FR-16 forbids.

**The fixture inputs changed to the FR-16-conformant form, deliberately.** They previously fed a
U+0020-grouped number. Under FR-16 a U+0020-grouped `uk-UA` number is **non-conformant input**,
about which FR-16 says nothing: the group-2 branch preserves it only incidentally, because
`processTextNode` (`number-format-fixer.ts:112`) is a blanket no-op for that group. An assertion
over it would state a property of the *implementation*, not of the *requirement* — the exact failure
the skill contract names. One title changed with it, for honesty:
`'strips a thousands separator and localizes the decimal for uk-UA'` →
`'preserves the uk-UA non-breaking-space thousands grouping and localizes the decimal'`. The
`describe`-level comment that read "thousands separators are stripped before the decimal pass" was
corrected to "thousands grouping is settled before the decimal pass" and given the FR-16 rationale;
leaving it would have left a comment contradicting the assertion directly beneath it.

**Nothing else in either file changed.** `git diff` confirms: the two hunks in
`doc-prose-transforms.spec.ts` and the one in `consumables-prose-transforms.spec.ts`, plus the
`NBSP_U00A0` declaration and the corrected comment. Sixteen other tests across the two files are
byte-identical and green, which is also the evidence neither module was taken down.

### 9.3 The observed failure — verbatim, and it is the right reason

```
 FAIL  src/render/consumables-prose-transforms.spec.ts > normalizeConsumablesDocProse — the production chain, on Doc fields > applies to every text field, not just the hook
AssertionError: expected 'Швидкість друку 20000 мм/хв.' to contain '20 000'

 FAIL  src/render/doc-prose-transforms.spec.ts > normalizeDocProse — the production chain, on Doc fields > preserves the uk-UA non-breaking-space thousands grouping and localizes the decimal
AssertionError: expected 'Швидкість 20000 мм/хв за 1,75 мм.' to contain '20 000'

 FAIL  src/render/doc-prose-transforms.spec.ts > normalizeDocProse — the production chain, on Doc fields > applies to every text field, not just the hook
AssertionError: expected 'Швидкість 20000 мм/хв.' to contain '20 000'
```

*(The `'20 000'` in the* expected *clause is the U+00A0 form; the terminal renders U+00A0 the same
as a space. The* received *strings show the flattening.)*

**Right reason, on the one discriminator that matters.** The received string is **exactly**
`20000` — the group collapsed, with no separator of any kind left. That is the legacy
locale-blind `stripThousandsSeparators` path and nothing else: had any later step in the chain
(`fixDecimalSeparator`, `restoreIdentifierDots`, `cyrillizeUnits`, `normalizeTerminology`,
`canonicalizeMultiInOne`) been mangling or relocating the U+00A0, the received string would show a
surviving-but-altered separator instead. It does not. The rest of each string confirms the chain is
otherwise working: `1.75 mm` → `1,75 мм` (decimal localized, unit cyrillized) in the first case.

No failure is a missing import, a module-resolution error or a type error.

### 9.4 Verified satisfiable — the fix is exactly the two call sites

The tests must be red **and** reachable. Probed directly against the fixer, outside the repository
tree (throwaway script, deleted; no repository file added):

```
input        : "Швидкість 20<U+00A0>000 мм/хв за 1.75 mm."
locale-blind : "Швидкість 20000 мм/хв за 1.75 mm."        ← fixNumberFormatting(input)
uk-UA        : "Швидкість 20<U+00A0>000 мм/хв за 1.75 mm." ← fixNumberFormatting(input, '', 'uk-UA')
preserved?   : true
```

So the group-2 branch already behaves per FR-16; what is missing is the **locale argument** at the
two production call sites, both of which still call `fixNumberFormatting(text)` bare:

- `src/render/doc-prose-transforms.ts:156`
- `src/render/consumables-prose-transforms.ts:97`

Both are `IMPLEMENTATION`'s and were **not** touched by this stage. This is the TDD gate working as
designed (AGENTS.md §5): the tests state the right expectation first, and `so-builder` turns them
green.

### 9.5 The numbers

| Command | Result |
|---|---|
| `npx vitest run` — **baseline, before this stage's edits** | `Test Files 122 passed (122)` / `Tests 2812 passed \| 3 skipped (2815)` — **zero** pre-existing red |
| `npx vitest run` — **after** | `Test Files 2 failed \| 120 passed (122)` / `Tests 3 failed \| 2809 passed \| 3 skipped (2815)` |
| `npm run lint` (`tsc --noEmit`) | **exit 0, no output** — green |

**All three red are this stage's, and there is no ambient red to separate them from.** 2812 − 3 =
2809 exactly: no collateral. The staged US-1.1 rollback in the working tree (deleted
`server/cors-policy.js` and `test/cors-policy.spec.ts`, modified `server/index.js`) contributes
**no** failure — the baseline run above was taken on that same tree and was fully green.

### 9.6 Recorded for RECONCILIATION — not acted on

**NB-1 (carried, unchanged, and deliberately not closed here).** AC-1's `<b>{product}</b> —`
opening form still has **no row in this matrix and no assertion anywhere in the suite**, and that is
now also true of the schema rule landed at `50ead2a`, whose reject branch no test reaches.

**Judgement, since the loop-back asked for one either way: a row and an assertion are genuinely
owed, and this is not the stage to add them.** The behaviour is real and assertable — `50ead2a`'s
reject branch is live code with a definite contract — so this is a true coverage gap, not a
non-testable prose property. But adding it here would widen a loop-back a human scoped to one
issue, and it would contaminate the red baseline this stage owes `so-builder`: the orchestrator
needs "3 red, all N9" to hand over, not "4 red, 3 of them N9 and 1 unrelated". Recorded for
RECONCILIATION to route deliberately.

**N11 (settled, not widened).** The human confirmed the hook validator stays strict on `<b>` and
correctly rejects `<strong>` at the hook start. The narrowness is intended. No test in this suite
was broadened to accept `<strong>`, and none was added.

### 9.7 Constraints honoured at v3

- **Only `*.spec.ts` files were edited under `src/`.** `git diff --stat` for this revision touches
  exactly `src/render/doc-prose-transforms.spec.ts`,
  `src/render/consumables-prose-transforms.spec.ts` and the three artifacts. **`doc-prose-transforms.ts`
  and `consumables-prose-transforms.ts` were not touched** — they are `IMPLEMENTATION`'s.
- **`vitest.config.ts`, every threshold and every coverage `include` untouched.**
- **No assertion weakened, deleted, skipped or relaxed.** Each of the three sites gained a positive
  assertion and kept a negative. No `.skip`, no `.only`.
- **No workflow state written.** `docs/workflow/workflow-state.yaml` and `history.jsonl` untouched —
  the orchestrator owns both.
- **The staged US-1.1 rollback was not disturbed.** The commit names its paths explicitly; no
  `git add -A`, no `git add .`, no `git commit -a`. Porcelain went 32 → 34 entries, the two added
  being this stage's modified spec files.
- **No Pull Request pushed, opened or merged.**

## 10. v4 - RECONCILIATION loop-back (`changes_required_tests`), attempt 1 of 3

Finding source: `docs/reconciliation/US-2.1-reconciliation-report.md` v2 (NB-1 plus the AC-2 and AC-4
count-bound gaps). Implementation already exists, so the new tests are green on first run; the
evidence that they are not vacuous is mutation, below.

### 10.1 What was written

Block `V16` appended to `src/domain/description-doc.schema.v4.spec.ts` (16 tests: 8 hook, 4
killerSpecs, 4 applications, parametrized cases counted; file went 24 -> 40 tests).

### 10.2 First run against the live implementation

`npx vitest run src/domain/description-doc.schema.v4.spec.ts` -> `1 passed (1) / 40 passed (40)`.
No new test failed against the live implementation, so there is no finding to report.

### 10.3 Anti-vacuity - each guard removed in turn, schema restored after each (git shows the schema unmodified)

| Mutation of `src/domain/description-doc.schema.ts` (temporary) | Result |
|---|---|
| `if (!HOOK_INVARIANT_START.test(doc.hook))` replaced by `if (false)` | 6 failed / 34 passed: no-leading-`<b>`, `<strong>`, en dash, hyphen, missing spaces, non-leading `<b>` |
| `HOOK_INVARIANT_START = /^/` (accept anything) | the same 6 failed |
| regex widened to accept `<strong>` | 1 failed: the `<strong>` test (N11) |
| regex widened to accept en dash | 1 failed: the en-dash test |
| `killerSpecs` `.min(3).max(4)` removed | 2 failed: 2 and 5 rejected |
| `applications.items` `.min(4).max(8)` removed | 2 failed: 3 and 9 rejected |

The accept tests and the 3.0 test are boundary/negative-control tests and stay green by design.

### 10.4 Full suite

`npx vitest run` -> `Test Files 122 passed (122)`, `Tests 2828 passed | 3 skipped (2831)`, 0 failed
(previous 2812 passed + 16 new = 2828). `npm run lint` (`tsc --noEmit`)
is clean. Only `*.spec.ts` changed under `src/`; no implementation, fixture, coverage config or
existing assertion was touched.

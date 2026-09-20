---
artifact: test_generation_report
story: US-2.1
version: 1
status: DRAFT
owner: so-test-writer
created_at: 2026-09-21T12:00:00Z
updated_at: 2026-09-21T12:00:00Z
supersedes: null
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
open_decisions_blocking: false
---

# Test Generation Report — US-2.1

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

## 2. The observed failure — `npx vitest run`, full logic suite

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

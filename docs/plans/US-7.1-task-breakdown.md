---
artifact: task_breakdown
story: US-7.1
version: 1
status: ARCHIVED
owner: so-implementation-planner
created_at: 2026-10-09T18:00:00Z
updated_at: 2026-10-09T18:00:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 4
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 1
open_decisions_blocking: false
---

# Task breakdown: US-7.1 (keep the operator's product name intact)

Baseline tasks T1-T14 need no FROZEN edit and stand on their own. **T15 is CONDITIONAL**: it is
executed only if the human approves the AGENTS.md section 9 request F-1 at HUMAN_PLAN_APPROVAL.
If F-1 is not approved, T15 is skipped and no other task changes (the plan accepts risk R1 in
that case).

All tests run in vitest (`npm run test:logic`). No task touches a component, so
`test:components` (Karma) is not involved, and `server/**` (node:test) is untouched. Test file
names below follow the plan's D10; `so-test-writer` creates them failing before IMPLEMENTATION.
Where the plan names a location but not a file, the file is "named by TEST_WRITING".

## Execution order

1. T1 tokenisation
2. T2 classifier
3. T3 preservation checks
4. Parallel group A (mutually independent): T4 SEO core name, T5 protected slug trim, T6 protected-name block, T7 repair-strategy entries
5. T8 precedence clause in `PRODUCT_NAME_LOCALIZATION`
6. Parallel group B (mutually independent): T9 Slugs prompt, T10 Doc prompt, T11 Translator and Optimizer prompts
7. T12 wrap payloads at orchestrator call sites
8. T13 SEO gate wiring and `seoCoreName`
9. T14 report-only validation and protected slug trim in the orchestrator
10. T15 CONDITIONAL, F-1: `src/prompts/task-c.ts` (runs last so the goldens move once; skipped if not approved)

T12, T13, T14 all edit `content-orchestrator.service.ts` and are therefore serial, not parallel.
Dependencies: T2<-T1; T3<-T1,T2; T4,T5,T6<-T2; T7<-T3; T8<-none (may start any time, placed
after group A for review flow); T9,T10,T11<-T8; T12<-T2,T6,T8; T13<-T3,T4,T7,T12;
T14<-T3,T5,T13; T15<-T8.

## Risk-first rationale

T1 is first because the tokenisation T (OD-13 default) and, right after, the classifier (OD-11
default) are the two open-decision defaults every other check consumes; proving them with
fixtures A, B, C and the number+unit cases while changing course is still cheap bounds the cost
of a reversal at the spec gate to a single module (plan R7).

---

## T1 — Implement the shared product-name tokenisation

| | |
|---|---|
| **Track** | angular (`src/utils`) |
| **Depends on** | none |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
Adds the single tokenisation T used by every preservation check: HTML-to-text with the
block-boundary hard-break list, attribute and `script`/`style` exclusion, whitespace split,
edge-punctuation stripping, number-with-separator rule, number+unit split on both sides, and
rule 3 equality (NFC, case-sensitive, decimal separator and unit equivalence via
`LATIN_TO_CYRILLIC_UNITS`).

### Files
| File | Change |
|---|---|
| `src/utils/product-name-tokens.ts` | create |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/utils/product-name-tokens.spec.ts` | `test:logic` | FR-5 tokenisation, AC-5, AC-6 (number-unit spacing equal) |

### Acceptance check
`npx vitest run src/utils/product-name-tokens.spec.ts` passes; `0.4mm`, `0.4 mm` and the
locale-formatted equivalents tokenise as equal; module imports nothing from `task-a.ts`;
lint, full `npm test`, and build are green.

### Notes
Pure function, no clock or randomness (NFR-5). Keep `task-a.import-cycle.spec.ts` green.

---

## T2 — Implement the protected-name classifier

| | |
|---|---|
| **Track** | angular (`src/utils`) |
| **Depends on** | T1 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
`classifyProductName(typed)` returns `{ protected, designators }` per FR-1: brand set is the
union of `officialBrands` derived from `STORE_REGISTRY` at call time plus exported
`SPEC_LISTED_BRANDS = ['Formlabs', 'Bambu Lab']`; rules (i)-(iii), number+unit and decimal
exclusion before rule (iii), `3D` exemption, `PLA+` non-match, empty input is generic.

### Files
| File | Change |
|---|---|
| `src/utils/protected-product-name.ts` | create |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/utils/protected-product-name.spec.ts` | `test:logic` | FR-1, FR-11, AC-7 |

### Acceptance check
Spec passes for Fixtures A, B, C, `0.4 mm`, `0.4mm`, `4 mm`, `1 kg`, `3D Printer Cleaning Kit`,
`PLA+`, empty input; brand set is read from `STORE_REGISTRY` (a test iterating every entry,
including empty-`officialBrands` stores, passes); gate green.

### Notes
Whole OD-11 default lives in this file only. Do not edit `invariantCore` or
`src/prompt-core/product-name-core.ts` (OD-6).

---

## T3 — Implement the preservation checks (part 1 and part 2)

| | |
|---|---|
| **Track** | angular (`src/utils`) |
| **Depends on** | T1, T2 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
Emits `ValidationIssue`s (severity `error`) `product-name-token-missing` (FR-5 part 1:
contiguity under rule 3, slug check via `stripSlugStopwords`/`normalizeSlug`) and
`product-name-shortened-form` (part 2: designator-token scan, full-occurrence exclusion).
Exports `checkNameSurfaces`, `checkDescriptionHtml`, `checkOptimizerText`; generic or empty
name returns `[]`.

### Files
| File | Change |
|---|---|
| `src/utils/product-name-preservation.ts` | create |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/utils/product-name-preservation.spec.ts` | `test:logic` | FR-5, FR-7 (optimizer check), AC-3, AC-5, AC-7, AC-8 (issue raised) |

### Acceptance check
Spec passes: missing `Resin`/`Tank` flagged; `Form Studio 1 Pro` flagged; bare `Form Studio 1`,
`any Elegoo resin printer`, `PLA, 1.75 mm` not flagged; slug form checked; generic name returns
`[]`. Gate green.

### Notes
Sits beside the frozen `output-validator.ts`, which is not edited. The existing
`slug-name-designator-lost` rule stays untouched.

---

## T4 — Implement the SEO core-name selector

| | |
|---|---|
| **Track** | angular (`src/utils`) |
| **Depends on** | T2 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
`seoCoreName(localizedName, typedName, protected)` keeps the category when category + typed name
is under 54 code points, otherwise returns the typed name alone (OD-12 default, FR-4).

### Files
| File | Change |
|---|---|
| `src/utils/protected-seo-name.ts` | create |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/utils/protected-seo-name.spec.ts` | `test:logic` | FR-4, AC-2 (boundary at 53/54/55) |

### Acceptance check
Spec passes at 53, 54 and 55 code points; generic names are returned unchanged; gate green.

### Notes
Independent of T5, T6, T7. Does not edit `seo-metadata-shape.ts` unless OD-12 is overturned.

---

## T5 — Implement the protected slug length trimmer

| | |
|---|---|
| **Track** | prompt (`src/prompt-core`) |
| **Depends on** | T2 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
`enforceProtectedSlugLength(name, slug, typedName, language)` removes only tail tokens outside
the typed-name slug span; a typed-name slug over 100 characters is returned whole (FR-10).

### Files
| File | Change |
|---|---|
| `src/prompt-core/protected-slug.ts` | create |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/protected-slug.spec.ts` | `test:logic` | FR-10 cases (a) and (b), AC-1 |

### Acceptance check
Spec passes: `resin-tank` tokens survive trimming; over-100 typed-name slug returned whole; gate
green.

### Notes
`enforceSlugLength` and `invariantCore` are not edited (OD-6). Independent of T4, T6, T7.

---

## T6 — Implement the dynamic protected-name block builder

| | |
|---|---|
| **Track** | prompt (`src/prompt-core`) |
| **Depends on** | T2 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
Builds the `[PROTECTED PRODUCT NAME]` text (including the OD-2 priority statement) and
`withProtectedNameBlock(payload, typedName)`, which appends it to `userContent` only for
protected names and returns the payload unchanged for generic ones.

### Files
| File | Change |
|---|---|
| `src/prompt-core/protected-name-block.ts` | create |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/protected-name-block.spec.ts` | `test:logic` | FR-2, NFR-1 (R8 guard) |

### Acceptance check
Spec passes: block appears in `userContent`; `systemBlocks` deep-equals the unwrapped payload
with `cache: true` breakpoints preserved; generic name returns the payload identical; gate green.

### Notes
`PromptPayload` shape is unchanged. Independent of T4, T5, T7.

---

## T7 — Register the new rule ids in the repair strategy

| | |
|---|---|
| **Track** | angular (`src/utils`) |
| **Depends on** | T3 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
Adds explicit `['full-regen']` ladder entries for `product-name-token-missing` and
`product-name-shortened-form`, same as `meta-title-template-shape`, so they do not rely on the
default.

### Files
| File | Change |
|---|---|
| `src/utils/repair-strategy.ts` | modify |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| existing `src/utils/repair-strategy.spec.ts`, extended by TEST_WRITING (name per TEST_WRITING) | `test:logic` | FR-8 |

### Acceptance check
Extended spec asserts both ids resolve to the `['full-regen']` ladder via the explicit registry;
gate green.

### Notes
If TEST_WRITING reports no such spec file exists, that is a test gap for plan review, not a
reason to skip the test.

---

## T8 — Add the protected-name precedence clause to the shared constant

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | none |
| **FROZEN (AGENTS.md §9)** | no (`master-system-prompt.ts` only interpolates the constant; its bytes and checksum stay unchanged) |

### What changes
`PRODUCT_NAME_LOCALIZATION` gains a leading, product-independent precedence clause: with a
`[PROTECTED PRODUCT NAME]` block, keep every token in order untranslated and verbatim once;
this overrides descriptor-translation and category-first rules and any inline instruction
elsewhere; only number/unit locale formatting is allowed. Generic-name text is unchanged.
Reaches master, Task C and Optimizer by interpolation.

### Files
| File | Change |
|---|---|
| `src/prompt-core/constants.ts` | modify |
| `test/fixtures/golden/full-description-prompts.json` | modify, regenerated for the changed text with reviewed diff (OD-9) |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/prompt-core/master-system-prompt.spec.ts` (phrase pin ~line 132 re-checked) | `test:logic` | FR-2 |
| golden spec covering `full-description-prompts.json` (existing) | `test:logic` | FR-2, NFR-1 |
| prompt-text assertions on the constant (file named by TEST_WRITING) | `test:logic` | FR-2 |

### Acceptance check
Clause present in the exported constant and, by interpolation, in master and Task C system text;
golden diff reviewed and limited to the clause; `bash arch-guard.sh` reports no FROZEN checksum
change; gate green.

### Notes
Changes cached text once (one-time cache re-warm), no per-product fragmentation. Fixture
regeneration happens in this task, not in a separate cleanup.

---

## T9 — Rewrite the Slugs prompt rules and examples for protected names

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T8 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
Rules 1-3, 5, 8 get a protected-name carve-out; worked examples 1-3 and the context-enrichment
example are rewritten so no protected input name is translated, dropped or reordered. Generic
examples (`Hardened Steel Nozzle`, `With Spool`) and their behaviour are untouched. Legacy spec
assertions that pin the old translated examples are updated in the same commit (AC-9, OD-9).

### Files
| File | Change |
|---|---|
| `src/prompts/task-slug.ts` | modify |
| `src/prompts/task-slug.spec.ts` and any other OD-9 legacy spec confirmed when reading the fixtures (including whether `spec-count-parity.spec.ts` is a member) | modify |
| `test/fixtures/golden/full-description-prompts.json` | modify if the Slugs prompt is in it, reviewed diff |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/task-slug.spec.ts` | `test:logic` | FR-3, FR-9, AC-1, AC-9 |

### Acceptance check
Spec asserts the rewritten examples contain no localized protected name and the generic-name
examples are unchanged; no remaining spec asserts a translated protected name; gate green.

### Notes
OD-9 inventory must be confirmed, not assumed. Independent of T10, T11.

---

## T10 — State the protected-name rule in the Doc prompt

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T8 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
The `localizedName` instruction (line ~55) states the protected-name rule. No positive "name
must appear" clause (OD-8).

### Files
| File | Change |
|---|---|
| `src/prompts/task-a-doc.ts` | modify |
| golden JSON if affected | modify, reviewed diff |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/task-a-doc.spec.ts` (or the existing spec for this builder) | `test:logic` | FR-6, AC-3 |

### Acceptance check
Spec asserts the instruction text for protected names and the absence of a positive appearance
clause; gate green.

### Notes
Independent of T9, T11.

---

## T11 — Add verbatim brand/model preservation to Translator and Optimizer prompts

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T8 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
A generic verbatim-preservation sentence for brand and model names in each prompt (OD-7).
`task-translate.ts` does not use the shared constant, so it gets its own text.

### Files
| File | Change |
|---|---|
| `src/prompts/task-translate.ts` | modify |
| `src/prompts/optimizer.ts` | modify |
| golden JSON if affected | modify, reviewed diff |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/task-translate.spec.ts`, `src/prompts/optimizer.spec.ts` (existing builders' specs) | `test:logic` | FR-7, AC-5 |

### Acceptance check
Specs assert the verbatim sentence in each built prompt; gate green.

### Notes
Independent of T9, T10. Translator has no typed name and is never wrapped (OD-7).

---

## T12 — Wrap payloads with the protected-name block at orchestrator call sites

| | |
|---|---|
| **Track** | angular (`src/services`) |
| **Depends on** | T2, T6, T8 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
`classifyProductName(input.name)` is computed once per run; `withProtectedNameBlock` wraps the
payload for Task A / A-doc, Slugs, Task B, Task C and the Optimizer when a product name is
supplied. Translator is not wrapped.

### Files
| File | Change |
|---|---|
| `src/services/content-orchestrator.service.ts` | modify (call sites ~857, ~1330, ~1002, ~1449, ~1646, ~1050, ~1488, ~1599, ~1096 and other `buildPromptC` sites, ~1756) |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| orchestrator payload-wiring spec (named by TEST_WRITING, beside `content-orchestrator.repair-field-wiring.spec.ts`) | `test:logic` | FR-2, FR-3, FR-4, FR-6, FR-11, NFR-1, AC-4 (per `STORE_REGISTRY` entry) |

### Acceptance check
Spec asserts that for a protected name each listed builder's outgoing `userContent` contains
the block and `systemBlocks` are identical to the no-block payload, for every `STORE_REGISTRY`
entry and its locales; generic names produce unchanged payloads; gate green.

### Notes
Serial with T13 and T14 (same file).

---

## T13 — Wire the SEO gate and the SEO core name into the orchestrator

| | |
|---|---|
| **Track** | angular (`src/services`) |
| **Depends on** | T3, T4, T7, T12 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
Appends `checkNameSurfaces` results for `h1`/`meta_title`/`meta_description` to the SEO Meta
gate `validate:` lists (~1057, ~1499, ~1609); `withFeedback` text for the new rule ids restates
the OD-2 priority; `localizedNames` passed to `buildPromptB` are mapped through `seoCoreName`.
A shortened H1 or `meta_title` now triggers a repair and is never accepted unrepaired.

### Files
| File | Change |
|---|---|
| `src/services/content-orchestrator.service.ts` | modify |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| mocked-LLM repair-gate spec (new, beside `content-orchestrator.repair-field-wiring.spec.ts`; named by TEST_WRITING) | `test:logic` | FR-4, FR-8, AC-2, AC-8 |

### Acceptance check
With a mocked model returning `Formlabs Form Studio 1 Pro`: the issue is raised, a repair
attempt is made, and the shortened result is not accepted; still-shortened repair, HTTP 429 and
malformed JSON all leave the issue unresolved; `buildPromptB` receives the `seoCoreName` result;
gate green.

### Notes
Repair outcome behaviour is existing `runRepairGate` behaviour; tests confirm it, the task does
not change it. `task-b.ts` is NOT edited (non-frozen route).

---

## T14 — Add report-only validation and the protected slug trim to the orchestrator

| | |
|---|---|
| **Track** | angular (`src/services`) |
| **Depends on** | T3, T5, T13 |
| **FROZEN (AGENTS.md §9)** | no |

### What changes
`runOutputValidation` (~1885-1917) gains `checkNameSurfaces` for Slugs name/slug and
`checkDescriptionHtml` per locale (report-only, no repair attempt per FR-3/FR-6); the Optimizer
text check (`checkOptimizerText`) is added where a product name is supplied (FR-7); the trim
call at ~1682 uses `enforceProtectedSlugLength` for protected names.

### Files
| File | Change |
|---|---|
| `src/services/content-orchestrator.service.ts` | modify |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| orchestrator report-only validation spec (named by TEST_WRITING) | `test:logic` | FR-3, FR-5, FR-6, FR-7, FR-10, AC-1, AC-3, AC-5, AC-6 |
| existing regression specs: `heading-style`, `product-name-consistency`, `slug-validator`, `seo-metadata-shape*`, `number-format-fixer`, `spec-count-parity`, `test/render-*.spec.ts` corpus | `test:logic` | FR-12, FR-13, FR-14, AC-6 |

### Acceptance check
Violations on Slugs and description surfaces appear in the validation issues and trigger no
repair call; the protected slug keeps `resin-tank`; all regression specs and corpus fixtures
pass unchanged (no corpus fixture regenerated); lint, `npm test` (both runners), coverage,
build, and `bash arch-guard.sh` green.

### Notes
Manual release evidence (live-model Fixture A on EXPERT3D, NFR-7) is recorded outside the suite
and is not a task. R6: if a fixture shows `language-consistency.ts` flags Latin `Resin Tank`,
raise it as a finding rather than silently adding a mask (the plan lists it read-only unless
tests show otherwise).

---

## T15 — CONDITIONAL (F-1): replace descriptor-translation sentences in Task C

| | |
|---|---|
| **Track** | prompt |
| **Depends on** | T8 |
| **FROZEN (AGENTS.md §9)** | **`src/prompts/task-c.ts` -- this task MUST stop and request approval before editing it.** Execute ONLY if F-1 was approved at HUMAN_PLAN_APPROVAL and the approval is recorded; otherwise skip the task entirely. |

### What changes
In the inline per-locale instruction text, replaces "TRANSLATE the generic descriptor and
reorder it category-first" (and wrapped/variant forms) with "apply [PRODUCT NAME LOCALIZATION]
(a protected name is kept verbatim)". Occurrences ~170-171, ~251, ~297, ~337-338, ~389; the
block at ~213 and heading rule at ~29-31 are re-read and changed only if they carry the same
instruction. No other change; the six `${PRODUCT_NAME_LOCALIZATION}` interpolations stay.

### Files
| File | Change |
|---|---|
| `src/prompts/task-c.ts` | modify (FROZEN, approval required) |
| `.arch-guard-checksums` | modify via `bash arch-guard.sh --rebaseline`, same commit |
| `src/prompts/task-c.spec.ts` and Task C goldens in `test/fixtures/golden/` | modify, reviewed diff |

### Tests to turn green
| Test file | Runner | Covers |
|---|---|---|
| `src/prompts/task-c.spec.ts` (assertion added by TEST_WRITING, conditional on approval) | `test:logic` | FR-2, FR-6, AC-3 |

### Acceptance check
Approval is recorded before the edit; no occurrence of the old sentence remains in the file;
`.arch-guard-checksums` re-baselined in the same commit and `bash arch-guard.sh` passes; Task C
goldens diff reviewed; gate green.

### Notes
If not approved, T15 is not run and risk R1 stays accepted (detected by FR-5 part 2, plus the
manual live check). Tests for T15 must not be required to be failing when F-1 is unapproved.

---

## Coverage table

### Plan item -> tasks

| Plan item | Tasks |
|---|---|
| D1 domain model unchanged | none (no change; no task) |
| D2 `product-name-tokens.ts` | T1 |
| D2 `protected-product-name.ts` | T2 |
| D2 `product-name-preservation.ts` | T3 |
| D2 `protected-seo-name.ts` | T4, T13 |
| D2 `protected-slug.ts` | T5, T14 |
| D2 `protected-name-block.ts` | T6, T12 |
| D3 chain agreement / D8 no UI | verified in T14 regression set |
| D4 FROZEN position, baseline (no edit) | all T1-T14 (none edit a FROZEN file) |
| D4 F-1 `task-c.ts` | T15 (conditional) |
| D5 payload contract | T6, T12 |
| D6 constant clause | T8 |
| D6 `task-slug.ts` | T9 |
| D6 `task-a-doc.ts` | T10 |
| D6 `task-translate.ts`, `optimizer.ts` | T11 |
| D6 goldens | T8, T9, T10, T11, (T15) |
| D7 call-site wrapper | T12 |
| D7 SEO gate and `seoCoreName` | T13 |
| D7 report-only validation, slug trim | T14 |
| D7 `repair-strategy.ts` | T7 |
| D9 store/locale scope | T2, T12 (registry-iterating tests) |
| D10 manual release evidence | not a task (recorded outside the suite) |

### FR / NFR -> tasks

| Requirement | Tasks |
|---|---|
| FR-1 | T2 |
| FR-2 | T6, T8, T10, T12, (T15) |
| FR-3 | T5, T9, T12, T14 |
| FR-4 | T4, T13 |
| FR-5 | T1, T3, T14 |
| FR-6 | T10, T12, T14, (T15) |
| FR-7 | T3, T11, T14 |
| FR-8 | T7, T13 |
| FR-9 | T9 |
| FR-10 | T5, T14 |
| FR-11 | T2, T12 |
| FR-12 to FR-14 | T14 (regression set) |
| NFR-1 | T6, T8, T12 |
| NFR-2, NFR-3 | no provider/retrieval code touched; no task |
| NFR-4 | T2, T12 |
| NFR-5 | T1, T2, T3 (pure functions) |
| NFR-6 | no task (no UI change) |
| NFR-7 | prompt-text assertions in T8-T11; manual evidence outside the suite |

### Task -> plan item (no task without a plan item)

T1-T3 D2; T4 D2/D7; T5 D2/D7; T6 D2/D5; T7 D7; T8-T11 D6; T12-T14 D7; T15 D4 F-1.

### AC -> tasks

AC-1 T5, T9, T14; AC-2 T4, T13; AC-3 T3, T10, T14; AC-4 T12; AC-5 T3, T11, T14; AC-6 T1, T14;
AC-7 T2, T3; AC-8 T3, T13; AC-9 T9.

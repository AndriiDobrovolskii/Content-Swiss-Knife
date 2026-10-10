---
artifact: open_decisions
story: US-7.1
version: 2
status: DRAFT
owner: so-clarifier
created_at: 2026-10-09T00:00:00Z
updated_at: 2026-10-09T13:30:00Z
supersedes: docs/decisions/US-7.1-open-decisions.md#1
inputs_consumed:
  - key: story
    version: 2
open_decisions_blocking: false
---

# US-7.1 - Open Decisions (v2)

Re-run against Story v2. v1 (based on Story v1) is SUPERSEDED. Decision ids are stable. Status per item:
**RESOLVED** = the Story v2 text settles it (cited); **ACCEPTED DEFAULT** = the operator accepted the v1 default in Story v2
Context ("OD-3 - OD-10 are accepted with the defaults stated ... (the 'Defaults a spec may carry')"), which the Specification
carries and which stays overturnable at HUMAN_SPEC_APPROVAL; **OPEN** = new or still undecided. No blocking item remains.

| id | Topic | Status | blocking |
|---|---|---|---|
| OD-1 | What "verbatim" means (numbers/units/decorative words) | RESOLVED by Story v2 | - |
| OD-2 | Verbatim name vs 55-char `meta_title` | RESOLVED by Story v2 (residual -> OD-12) | - |
| OD-3 | "Slugified form" definition | ACCEPTED DEFAULT | false |
| OD-4 | Localized category noun, word order, single-render | ACCEPTED DEFAULT | false |
| OD-5 | Name (60) / slug (100) limits vs verbatim | ACCEPTED DEFAULT | false |
| OD-6 | `invariantCore` left untouched; new checks use full typed name | RESOLVED by Story v2 (Context + Out of scope) | - |
| OD-7 | Translator/Optimizer have no Product Name input | ACCEPTED DEFAULT | false |
| OD-8 | Falsifiability of AC-1..AC-5 | ACCEPTED DEFAULT | false |
| OD-9 | Inventory of legacy specs/goldens (AC-9) | ACCEPTED DEFAULT | false |
| OD-10 | FROZEN per-file approval; sibling module | RESOLVED by Story v2 (sibling modules) with plan-gate residual | false |
| OD-11 | NEW - how "brand or model identifier" is detected | OPEN | false |
| OD-12 | NEW - H1 category noun vs `meta_title` canonicalizer | OPEN | false |
| OD-13 | NEW - token matching under permitted locale formatting; AC-1/AC-2 "exact substring" | OPEN | false |

## OD-1 - What "verbatim" means inside a typed name - RESOLVED

Story v2 "Expected" states the hybrid rule: for a branded/model name no token may be removed, re-ordered or translated; "the only
permitted mutation inside such a name is locale formatting of numbers and units (e.g. `1.75 mm` -> `1,75 мм`)"; a generic name keeps
the existing localization rules. This answers the v1 question (numbers, units, qualifiers). The operator, not this stage, made the
decision. Remaining detection and matching questions are OD-11 and OD-13.

## OD-2 - Verbatim name vs the 55-character meta_title ceiling - RESOLVED

Story v2 "Expected" (OD-2 paragraph) and AC-2: the 55-char limit stays hard; the full typed name outranks the added category; the
category is dropped from `meta_title` (or another already-permitted fallback is used). AC-2 now permits the category noun to be
absent from `meta_title`. The mechanism question this leaves (the H1 and the canonicalizer) is OD-12.

## OD-3 - "Slugified form" of the typed name - ACCEPTED DEFAULT (non-blocking)

Question unchanged from v1. **Default carried:** slugified form = the same `stripSlugStopwords` + `normalizeSlug` transform the
pipeline applies to the name, applied to both sides; stopword tokens inside the typed name are compared after that transform.
Story v2 AC-7 already encodes this ("slugified form with slug stopwords removed and locale number-separator changes allowed").

## OD-4 - Localized category noun, word order, single-render rule - ACCEPTED DEFAULT (non-blocking)

**Default carried:** the category noun is optional; when added it precedes the typed name in non-English locales (existing
category-first rule) and the typed name is never altered; no category noun when the typed name already starts with a category word;
the single-render rule becomes "the typed name is rendered verbatim, once". Applies to branded/model names only; generic names keep
rules 2-3 (Story v2 Expected).

## OD-5 - Name (60) and slug (100) limits vs verbatim names - ACCEPTED DEFAULT (non-blocking)

**Default carried:** for branded/model names, verbatim beats the 60-character aim; the 100-character slug maximum is applied only
where the typed name's slug fits, otherwise the slug is not trimmed into the typed name. Note for the spec: `enforceSlugLength`
anchors on `invariantCore`, which is now explicitly left unchanged (OD-6), so the spec must say how the trimmer is made to spare
the full typed-name tokens without editing `invariantCore` (for example, a guard in a sibling module or in `slug-utils.ts`).

## OD-6 - invariantCore scope - RESOLVED

Story v2 Context and Out of scope: the existing `invariantCore` is left untouched; its under-capture of `resin` stays; the new
checks use the full typed name. Heading short forms (`productShort`) therefore stay as they are; AC-3 forbids only the altered
`Form Studio 1 Pro` form and requires the full designator wherever the model designator is mentioned.

## OD-7 - Translator and Optimizer receive no Product Name (AC-5) - ACCEPTED DEFAULT (non-blocking)

**Default carried:** no new input; prompt-text change for Translator and Optimizer plus tests asserting the exact prompt wording and,
for the Optimizer, the existing optional `[Product Name]` line. Consequence to surface in the spec: without the name, the
Translator/Optimizer prompt can only say "preserve brand/model names verbatim" generically, so the hybrid rule's brand-vs-generic
distinction (OD-11) cannot be evaluated by those two modes beyond what the model infers.

## OD-8 - Falsifiability of AC-1..AC-5 - ACCEPTED DEFAULT (non-blocking)

**Default carried:** AC-1..AC-5 = prompt-text assertions on the exported builders plus validator-level assertions (AC-7) on fixture
outputs for every `STORE_REGISTRY` entry; live-model confirmation recorded as manual release evidence. Positive AC-3 clause only
if the human asks.

## OD-9 - Inventory of legacy assertions and goldens (AC-9) - ACCEPTED DEFAULT (non-blocking)

**Default carried:** the spec names candidates (`src/prompts/task-slug.spec.ts`, `src/prompt-core/slug-utils.spec.ts`,
`src/utils/heading-style.spec.ts`, `src/utils/output-validator.spec.ts`, `src/utils/spec-count-parity.spec.ts`,
`test/fixtures/golden/full-description-prompts.json`); impact analysis confirms; goldens regenerated for changed text only with a
reviewed diff. Story v2 AC-9 now scopes this to branded/model examples (`Bambu Lab Hardened Steel Nozzle 0.4 mm`,
`Bambu Lab PLA Basic Filament ...`) and says generic-name examples stay.

## OD-10 - FROZEN files and sibling modules - RESOLVED (residual non-blocking)

Story v2 Context (OD-10) and Scope: new checks go in sibling modules next to `slug-validator.ts` (precedent `seo-metadata-shape.ts`);
no FROZEN file is assumed. Residual, not a question for the Story: if the prompt fix does require text in `task-a.ts`, `task-b.ts`,
`task-c.ts` or `master-system-prompt.ts` (AGENTS.md section 9), the per-file "modify [filename]" approval is requested at the plan
gate and `.arch-guard-checksums` is re-baselined in the same commit. The Story already states this; no new decision.

## OD-11 - How a "brand or model identifier" is detected (new) - blocking: false

**Question.** The hybrid rule applies only to names containing "a brand or an alphanumeric model identifier". What deterministic
test decides that a typed name is branded/model (protected) rather than generic (translated), given AC-7 requires a deterministic
check that "a generic typed name ... is not subject to the check"? Specifically: (a) is a brand recognised only from
`StoreProfile.officialBrands` or from a wider list; (b) does a bare number such as `1` count (the Story lists `1` and `Pro` as
identifier examples, and `1` is the only model-designator digit in the fixture); (c) does a dimension/spec such as `0.4 mm`,
`1.75 mm`, `20 W` count, given the Story's generic example is `Hardened Steel Nozzle` (no dimension) while the branded legacy
example `Bambu Lab Hardened Steel Nozzle 0.4 mm` is branded because of `Bambu Lab`; (d) does a capitalised suffix such as `Pro`,
`Plus`, `Max` count on its own, so that a name with no brand but a suffix is protected?

**What was checked.** Story v2 Expected/AC-7 give examples but no algorithm. `src/prompt-core/constants.ts`:
`StoreProfile.officialBrands` exists per store (`BRANDS_EXPERT3D`, `BRANDS_C3D`, `BRANDS_3DDEVICE_GROUP`) but is `[]` for
`Drukarka 3D` and `Expert-3DPrinter`, and it is a brand-guarantee list for the CTA, not a complete brand registry (project memory
records this gap); AC-4 requires the rule for every store in `STORE_REGISTRY`, so a per-store brand list alone gives different
protection per store. `src/prompt-core/product-name-core.ts` already has a heuristic: tokens "that read as part of a brand/model
designator: anything containing a digit", with `DESCRIPTOR_STOPWORDS` excluded; that heuristic would treat `0.4` in
`Hardened Steel Nozzle 0.4 mm` as a model token, which contradicts the Story's generic classification if a dimension-bearing name
is meant to be generic.

**Why it cannot be inferred.** Both a digit-based and a brand-list-based reading are consistent with the Story's examples, and they
disagree on `Hardened Steel Nozzle 0.4 mm` (generic by brand list, branded by digit heuristic). The Story gives no counter-example.

**Impact if unresolved.** The spec cannot state the AC-7 applicability condition or AC-9's "branded/model example" set. If detection
is too wide, generic names stop being localized (regression for filament/nozzle catalogues in every store); if too narrow, the
fixture class of defect survives. Mixed prompt-side wording ("brand or model identifier") would be left to the model's judgement.

**Default a spec may carry:** a typed name is branded/model when it contains (i) a brand from a union of all stores' `officialBrands`
lists plus a spec-listed set of known brands used in the corpus and the fixture (`Formlabs`, `Bambu Lab`), or (ii) a token mixing
letters and digits (model code such as `L2`, `X1C`), or (iii) a standalone integer or a spec-listed suffix word (`Pro`, `Plus`,
`Max`, `Mini`, `Lite`, `Ultra`) immediately following another capitalised name token; a decimal or number+unit span
(`0.4 mm`, `1.75 mm`, `20 W`) alone does not make a name branded. Ambiguous names default to protected (verbatim). The human may
overturn at HUMAN_SPEC_APPROVAL.

## OD-12 - Long H1 with a category noun vs the meta_title canonicalizer (new, residual of OD-2) - blocking: false

**Question.** Story v2 lets `meta_title` drop the category noun when `category + typed name` exceeds 55. But the pipeline derives
`meta_title` from the H1 when the H1 is long: is the H1 itself also required to drop the category in that case, or is the
canonicalizer made name-aware, or is `meta_title` set independently of the H1 prefix?

**What was checked.** `src/utils/seo-metadata-shape.ts` (cited in v1): `isH1Unreachable` is true for H1 length >= 54, and then
`normalizeLongH1MetaTitle` in `canonicalizeSeoData()` overwrites `meta_title` with `computeLongH1MetaTitle(h1)`, a word-boundary
prefix of at most 49 code points plus `·`. With `Depósito de resina Formlabs Form Studio 1 Resin Tank Pro` (56) the prefix cuts
`Tank Pro`, so AC-2 "`meta_title` contains the typed name verbatim" fails unless the H1 omits the category (H1 <= 53) or the
canonicalizer changes. Story v2 AC-2 says only that the category MAY be absent from `meta_title`; it says nothing about the H1
shape or the canonicalizer, and AC-6 requires `meta-title-template-shape` to keep passing.

**Why it cannot be inferred.** Story v2 names "another already-permitted fallback" without naming one, and three mechanisms satisfy
it (H1 without category; name-aware canonicalizer, which touches the module that already exists beside the FROZEN validator;
independent `meta_title`).

**Impact if unresolved.** The spec cannot tell the planner whether `seo-metadata-shape.ts` is in the change, nor what AC-2 asserts
for the H1 in es-ES/pt-PT/uk-UA (56, 54, 57 code points with a category).

**Default a spec may carry:** when `category + typed name` would give an H1 of 54 or more code points, the H1 also omits the
category noun, so the existing canonicalizer logic remains unchanged and `meta_title` keeps the whole typed name; the H1 keeps the
category noun when it fits.

## OD-13 - Token matching under permitted locale formatting; "exact substring" in AC-1/AC-2 (new) - blocking: false

**Question.** The Expected text permits locale formatting of numbers and units inside a branded name (`1.75 mm` -> `1,75 мм`), yet
AC-1 and AC-2 demand the "exact substring" / "verbatim" typed name, and AC-7 demands "every token of the typed name". For a
typed name that contains a number or unit, which comparison do the ACs and the check use: exact string, or a normalized
comparison that equates `1.75 mm`, `1,75 mm`, `1,75 мм` (and unit case, such as `W` -> `Вт`)?

**What was checked.** Story v2 fixture `Formlabs Form Studio 1 Resin Tank Pro` has no decimal or unit, so the ACs as written hold
under either reading for the fixture. `src/prompts/task-slug.ts` `UNIT_LOCALIZATION_RULES` (decimal comma for pl/de/es/pt/uk/ru;
Cyrillic units for uk-UA/ru-UA) and `number-format-fixer.ts` are existing, tested behaviour. AC-7 alone mentions "locale
number-separator changes allowed", and only for slugs.

**Why it cannot be inferred.** The tolerance is stated in prose for names and in AC-7 for slugs only; the ACs for names and H1 use
absolute words.

**Impact if unresolved.** A name-level check built on exact matching rejects correct `1,75 мм` output for every filament and nozzle
product; one built on loose matching may pass a dropped unit. The spec writer would invent the normalization.

**Default a spec may carry:** the comparison tokenises both sides, treats number tokens as equal modulo decimal separator and
unit tokens as equal modulo the locale unit table, and requires every non-number, non-unit token of the typed name, in order, to be
present untranslated. AC-1/AC-2 "exact substring" remain exact for the fixture (no numbers or units).

## Change history

- **v2** - re-run against Story v2. OD-1, OD-2, OD-6 RESOLVED by the Story text; OD-3, OD-4, OD-5, OD-7, OD-8, OD-9 recorded as
  operator-accepted defaults; OD-10 resolved with a plan-gate residual. New: OD-11 (brand/model detection), OD-12 (H1 category vs
  `meta_title` canonicalizer), OD-13 (token matching under permitted number/unit formatting). Nothing from v1 dropped. No blocking
  items.
- **v1** - first run. OD-1, OD-2 blocking; OD-3 to OD-10 non-blocking (OD-10 = Story Q1).

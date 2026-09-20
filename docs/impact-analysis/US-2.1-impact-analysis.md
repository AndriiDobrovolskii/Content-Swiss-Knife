---
artifact: impact_analysis
story: US-2.1
version: 1
status: DRAFT
owner: so-impact-analyzer
created_at: 2026-09-20T12:00:00Z
updated_at: 2026-09-20T12:00:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 2
  - key: open_decisions
    version: 2
open_decisions_blocking: false
---

# Impact Analysis: US-2.1 — Migrate product descriptions to the v4.0 UA content schema

Survey of what the approved Specification (v2, APPROVED) actually reaches. Scope is bounded by
the Specification's Scope table and FR-1..FR-30; the consumables pipeline and §7 conditional
omission are out of scope by OD-6 and OD-10 and were not analysed.

Every file list below was re-derived from the codebase in this run. No list is copied from a
skill document or from a previous artifact.

The Specification's v4 line citations were spot-checked against
`Knowledge/Schemas/product_description_schemas_v4_ua.md` and **all resolve**: `:283`
(«Ненумерований список … до 6–8 пунктів (90–300 слів)»), `:293` («дві частини в єдиному
потоці»), `:349-351` (§3 «Без обмеження обсягу | Блоки H2/H3 | Обов'язково»), `:355`
(«Ліміт не встановлюється»), `:359` (the anti-duplication clause) and `:364-366` (the H2/H3
hierarchy rule behind FR-27 and the human's decision 1).

---

## 0. The single structural fact that reframes the whole blast radius

**The `ProductDescriptionDoc` exists in exactly one locale. The other nine are translated HTML.**

Evidence, re-derived:

- `src/services/content-orchestrator.service.ts:860` and `:1305` are the only `buildPromptADoc`
  call sites, and both pass a Ukrainian base language (`'Ukrainian (uk-UA)'`, `UA_BASE_LANGUAGE`).
- The translation step is `buildPromptC(html, targetLang, …)` — `src/prompts/task-c.ts:94-101`.
  Its first parameter is **`html: string`**, and its `[BASE HTML]` / `[IMAGE MANIFEST]` blocks
  (`task-c.ts:5-18`) describe an already-rendered artifact. No Doc, and no `schemaVersion`, ever
  reaches Task C.
- `src/render/doc-prose-transforms.ts:100` carries `schemaVersion` through the uk-UA Doc only.

Consequences the plan must be built on:

| v4 obligation | uk-UA (master) | the other nine locales |
|---|---|---|
| `schemaVersion: '4.0'` (FR-15) | a Zod/domain fact | **does not exist** — there is no document to carry it |
| Item-count bounds, §2 composition, string-only spec value (FR-3, FR-4, FR-5, FR-9, FR-10, FR-17) | schema-enforced | reachable only as HTML shape, via Task C fidelity |
| v4 structure preservation (FR-20) | produced | enforced by `src/utils/structural-parity.ts`, which counts `<h2>`, `<h3>`, `<table>` against the master (`structural-parity.ts:35-40`, rule `structural-parity-count`) |
| Number separators (FR-16) | prompt + HTML validator | prompt + HTML validator |

So the "dual support" of OD-2 and the version-scoping of FR-4/FR-10/FR-17 are **uk-UA-side
facts**. Any v4 rule that must hold in `pl-PL` or `de-DE` has to be expressed as an HTML-level
check, and the HTML-level checker has no version discriminator — see §4.

---

## 1. Affected files

### 1.1 Must change

| File | Why | FROZEN? |
|---|---|---|
| `src/domain/description-doc.schema.ts` | `schemaVersion: z.literal('3.0')` at `:155` (FR-15); `SpecRow.value` union at `:187` (FR-9, FR-10); `killerSpecs` `.min(3).max(4)` at `:160` and applications `.min(4).max(8)` at `:174` restated by FR-17; the §2 composition restriction of FR-4; the combined §2 ceiling of FR-17; the `subsections` bound the human settled for FR-27 | no |
| `src/domain/description-doc.ts` | `schemaVersion: '3.0'` at `:122`; `SpecRow.value: string \| string[]` at `:85`. The compile-time guard at `description-doc.schema.ts:255` fails if the interface and the schema diverge, so these two files move together | no |
| `src/prompts/task-a.ts` | **`:20` states the exact opposite of FR-4**: "CRITICAL: §2 (Killer Specs table) has NO H2 heading and NO `<section>` wrapper — place the Killer Specs table…". v4 §2 is one `<h2>` over one `<ul>` and no table. Also carries §1/§7 rules and `buildVideoBlock` (`:117`), which pins video into §3 | **YES — §9 stop** |
| `src/prompts/task-a-doc.ts` | The Doc instruction block: `"schemaVersion": "3.0"` at `:48`, the §2b bullets note at `:53`, and the §7 value rule at `:99-103` ("a string, or an array of strings") that FR-9/FR-10 change for `'4.0'`. Its header at `:18` ("NOT WIRED INTO PRODUCTION") is **stale** — see §6.3 | no |
| `src/render/render-description.ts` | §2 rendering (`renderKillerSpecs`, `:240-252`) emits `<div class="table-responsive"><table>` with a `<thead>` and **no `<h2>` at all**; FR-4 requires one `<h2>` + one `<ul>` + no table. `renderDescription` (`:307-347`) has **no version branch** today | no |
| `src/prompt-core/constants.ts` | `NUMBER_FORMAT_RULES` group 3 (`:495-496` de-DE/es-ES "thousands dot (or space)") and the missing `pt-PT` line (FR-16). Likely host of the FR-6 / FR-11 localized heading tables, beside `DELIVERY_REGION_PHRASES` (`:97`), which FR-6 cites as the precedent | no |
| `src/services/content-orchestrator.service.ts` | FR-14's hook-pattern index is specified as **service-layer, pre-prompt** (OD-3). This is the only layer that sees `input.name` and `input.website` before `buildPromptADoc` is called (`:860`, `:1305`) | no |
| `src/utils/output-validator.ts` | Must accept `'4.0'`-shaped output; FR-4/FR-17 checks placed here have no version discriminator (§4). `checkNumberFormatting` (`:43-52`) holds the locale separator sets | **YES — §9 stop** |

### 1.2 Needs re-verification even if unchanged

| File | Why it is in the blast radius |
|---|---|
| `src/prompt-core/store-render-rules.ts` | `getRenderRules(...).killerSpecsHeaders(locale)` (`:46`) exists **only** to feed `renderKillerSpecs`'s two table column headers. If §2 stops being a table for `'4.0'`, this rule becomes version-conditional or dead on that path |
| `src/prompt-core/constants.ts` — `KILLER_SPECS_HEADERS`, `KILLER_SPECS_HEADERS_C3D` | Same: the Center 3D Print §2a override (`doc-pipeline-flag.ts:35` calls it the only store needing code) loses its subject on the `'4.0'` path |
| `src/utils/heading-style.ts` | `h2-nominal-heading` (`:249-276`) iterates **every** `<h2>` for Center 3D Print in Cyrillic locales, exempting only `section.specs`, question headings, `MANDATED_NOMINAL_H2` prefixes, functional openers and verb-looking text. A new §2 `<h2>` is none of those — see §4.2. `checkProductNameStuffing` (`:117-205`) enforces a budget of two product-named `<h2>`s; a new §2 heading that names the product spends one |
| `src/prompt-core/constants.ts` — `MANDATED_NOMINAL_H2` | The allow-list (`uk-ua`, `ru-ua` only) that the new §2 heading would have to join |
| `src/utils/structural-parity.ts` | Counts `<h2>`, `<h3>`, `<table>` master-vs-translation (`:35-40`). §2 gaining an `<h2>` and losing a `<table>` shifts all three counts; the delta must appear in all nine translated locales or `structural-parity-count` fires |
| `src/utils/table-finalize.ts` | The legacy-HTML-path counterpart of `renderKillerSpecs`; `render-description.ts:227` marks the §2a collapsed form as `[VERBATIM from table-finalize.ts]` |
| `src/utils/decimal-separator.ts` (`:52`), `src/utils/identifier-decimal.ts` (`:33`) | Each holds its **own copy** of `COMMA_DECIMAL_LOCALES`, explicitly "mirrors … the frozen output-validator.ts". Three copies of one locale set — see §4.1 |
| `src/utils/number-format-fixer.ts` | OD-11 names it as the fixer to configure for the three groups; `stripThousandsSeparators` / `ensureUnitSpaces` (`:70`) are where a group-3 change would land |
| `src/utils/repair-strategy.ts`, `src/render/doc-schema-issues.ts`, `src/utils/doc-block-repair.ts`, `src/utils/doc-tier.ts` | FR-17 point 2 and FR-30: the ladder resolves a **dotted field path** (`repair-strategy.ts:39-61`, `doc-schema-issues.ts:118`). A cross-collection ceiling names no single field, so it has no tier-0 target. `doc-schema-issues.ts:144-174` is the stated precedent FR-30 restates |
| `src/utils/spec-category-shape.ts` | FR-7's one-`<h3>`-and-table-per-category is already guarded here (`spec-category-collapse`), on both the HTML and Doc paths |
| `src/utils/spec-count-parity.ts` | FR-22 under comma-joining |
| `src/utils/image-manifest-coverage.ts`, `src/utils/video-manifest.ts`, `src/utils/video-figure.ts` | FR-23 / FR-24 media survival once §2 stops admitting `figure` and `video` blocks |
| `src/prompts/task-c.ts` | OD-8 says **inspect**. It is the only path by which v4 structure reaches nine locales, and it counts §7 `<h3>` blocks to state an exact preservation number (`task-c.ts` header comment) | 
| `src/prompt-core/master-system-prompt.ts` | Interpolates `NUMBER_FORMAT_RULES` at `:83`; `:445` carries the figure lead-in rule FR-23 depends on. OD-8 limits edits here to global volume constraints |
| `src/prompt-core/doc-pipeline-flag.ts` | Determines which stores can produce a `'4.0'` document at all — see §6.2 |
| `src/prompts/task-faq.ts` | FR-13 carries the v4 §9 numbers into the FAQ prompt (OD-10, no architecture change) |
| `src/prompt-core/payload.ts` | NFR-1's subject. `PromptPayload` is `systemBlocks: SystemBlock[]` with `[0]`=master and `[1]`=task template both cached, plus `userContent` "dynamic, never cached" (`payload.ts:1-7`); `task-a.ts:165-176` is where they are assembled. FR-14's per-product hook-pattern index is dynamic input, so it has exactly one structurally legal home in this shape |

### 1.3 Tests that cover them

Every one of these runs under **`npm run test:logic` (vitest)**. The only `*.component.spec.ts`
in the repository is `src/app/components/model-settings/model-settings.component.spec.ts`, which
this Story does not reach — see hazard 6.

| Test | What it pins |
|---|---|
| `src/render/render-description.spec.ts` | `:664-673` — the §4-figure/document-order regression test named by the Specification's FR-23. `:652-662` asserts §4 block ordering; `:675-684` asserts exactly one `<ul>` in §4 |
| `test/render-reconciliation.spec.ts` | Reproduces the two committed corpus artifacts byte-for-byte (semantic whitespace). Both are `schemaVersion: "3.0"` — see §5 |
| `test/render-conformance.spec.ts` | 7 stores × their locales. `:147` asserts `Object.keys(STORE_REGISTRY)).toHaveLength(7)` — a registry-count tripwire. `:136-137` splits `RENDERABLE` from `UNRENDERABLE` on `imageBaseUrl` |
| `src/domain/description-doc.schema.spec.ts` | Every bound FR-17 touches |
| `src/prompt-core/ua-translation-style-guide.spec.ts:49` | `expect(NUMBER_FORMAT_RULES).toContain('uk-UA / ru-UA: decimal comma, thousands non-breaking space')` — the FR-16 tripwire. Group 2 is unchanged by this Story, so a targeted edit passes and a rewrite fails |
| `src/prompt-core/constants.spec.ts`, `src/prompt-core/store-render-rules.spec.ts` | Registry-derived headers and render rules |
| `src/utils/output-validator.spec.ts` | `:679-719` `lcp-image-lazy` / `image-not-lazy`; `:899-962` the deliberately-disarmed `meta-description-currency` (FR-26) |
| `src/utils/heading-style.spec.ts` | `h2-nominal-heading`, `heading-product-name-stuffing` |
| `src/prompts/task-a.spec.ts`, `src/prompts/task-a-doc.spec.ts` | The prompt text FR-1..FR-13 change |
| `src/services/seo-currency-wiring.spec.ts` | FR-26's "stays disarmed" |
| `src/services/content-orchestrator.doc-gate.spec.ts`, `content-orchestrator.ua-doc-pipeline.spec.ts` | The gate FR-30 governs |
| `src/utils/decimal-separator.spec.ts` | Binds the fixer to the frozen validator by round trip |
| `test/tools/scaffold-doc.spec.ts` | The corpus scaffolder, which parses accepted HTML **into** a Doc — §2's shape is one of its anchors |

---

## 2. Hazard table

All seven checked. A hazard that does not apply is recorded with its evidence, not omitted.

### Hazard 1 — `STORE_REGISTRY` fan-out — **APPLIES**

Re-derived, and the derived list **differs from the illustrative one in the skill document**.
Searched: `STORE_REGISTRY`, `getStoreProfile`, `StoreProfile`, `getStore(`, `getRenderRules`,
`renderContextFor` across `src/` and `test/`.

- **Direct importers of the symbol in `src/`: exactly two** — `src/prompt-core/constants.ts`
  (the definition, plus `getStore` `:167`, `deriveLanguages` `:269`, `resolveDeliveryPhrase`
  `:153`, `resolveOfficialBrand` `:427`) and `src/prompt-core/doc-pipeline-flag.ts:16`.
- Everything else reaches it **indirectly**, through `getStore()` — `src/app/app.component.ts:587`,
  `src/prompts/copywriter.ts:7`, `src/prompts/task-a.ts:124`, `src/prompts/task-b.ts:11,119`,
  `src/prompts/task-slug.ts:200`, `src/services/content-orchestrator.service.ts:1076,1152,1477`,
  `src/utils/zip-generator.ts:31`, `src/prompt-core/store-render-rules.ts:46` — or through
  `getRenderRules` / `renderContextFor` (`src/render/render-description.ts:27,242`,
  `src/services/content-orchestrator.service.ts:45,608,690`).
- **The skill document's list is wrong in two places for this repository state:**
  `src/prompts/task-slug.ts` and `src/services/content-orchestrator.service.ts` do **not**
  reference `STORE_REGISTRY`; they use `getStore()`. `src/utils/language-consistency.ts:36`,
  `src/utils/table-finalize.ts:69` and `src/utils/output-validator.ts:107,141` mention it in
  **comments only**.
- Also outside `src/`: `test/render-conformance.spec.ts` and `test/tools/derive-ctx.mjs`.

**Measured fan-out: 7 stores, 23 store-locale pairs, 10 distinct locales.**

| Store | Locales | `imageBaseUrl` | On `DOC_PIPELINE_STORES`? |
|---|---|---|---|
| 3DDevice | en-GB, uk-UA, ru-UA | set | yes |
| 3DPrinter | en-GB, uk-UA, ru-UA | set | yes |
| 3DScanner | en-GB, uk-UA, ru-UA | set | yes |
| Center 3D Print | pl-PL, en-GB, de-DE, uk-UA, ru-UA | set | yes |
| Drukarka 3D | pl-PL, uk-UA | set | yes |
| EXPERT3D | en-ES, es-ES, pt-PT, uk-UA | set | yes |
| **Expert-3DPrinter** | **en-US, es-MX, uk-UA** | **`''` (empty)** | **NO** |

NFR-6 holds: no new language list is needed. The FR-6 and FR-11 heading tables must be keyed
over these 10 locales; `es-US` and `it-*` are correctly excluded.

### Hazard 2 — uk-UA is the master, not one locale among many — **APPLIES, and it is the dominant fact**

Direction, stated explicitly as the skill requires: **Task A generates the uk-UA Doc; Task C
translates the rendered uk-UA HTML into the other nine locales.** Evidence is in §0 above —
`buildPromptC(html: string, …)` at `task-c.ts:94`, and both `buildPromptADoc` call sites pinned
to Ukrainian.

This Story changes **uk-UA generation**, so it reaches **every language**. But it reaches them
through *rendered HTML*, not through the schema. A planner that assumes `schemaVersion: '4.0'`
gates behaviour in `de-DE` is wrong: nothing in the de-DE path ever sees a `schemaVersion`.

### Hazard 3 — the prompt → schema → renderer → validator chain — **APPLIES; all four links**

| Link | Touched by |
|---|---|
| prompt | `task-a.ts` (FROZEN), `task-a-doc.ts`, `constants.ts` (`NUMBER_FORMAT_RULES`), `master-system-prompt.ts` (FROZEN, interpolation only), `task-faq.ts`, `task-c.ts` (inspect) |
| schema | `description-doc.schema.ts` + `description-doc.ts` (they move together — the guard at `:255`) |
| renderer | `render-description.ts` — §2 (`renderKillerSpecs`), §6 heading, §9 CTA heading, and the `'3.0'` / `'4.0'` split that does not exist there today |
| validator | `output-validator.ts` (FROZEN), plus the Doc-level validators wired at `content-orchestrator.service.ts:521-545` |

This is the maximal case: all four links, one of them in two frozen files.

### Hazard 4 — FROZEN files (AGENTS.md §9) — **APPLIES — THIS IS A §9 STOP**

The FROZEN set is exactly five, per `.arch-guard-checksums`, read this run:
`src/prompts/task-a.ts`, `src/prompts/task-b.ts`, `src/prompts/task-c.ts`,
`src/prompt-core/master-system-prompt.ts`, `src/utils/output-validator.ts`.

- **`src/prompts/task-a.ts` — edit required, approval UNGRANTED.** Not a judgement call:
  `task-a.ts:20` literally instructs "§2 (Killer Specs table) has NO H2 heading", which FR-4
  reverses. `task-a-doc.ts:22-123` imports `buildPromptA` and swaps only the instruction block,
  so the shared builder's rules cannot be changed from the sibling file.
- **`src/utils/output-validator.ts` — edit likely required, approval UNGRANTED.** It is the only
  place the §4 HTML criteria are enforced, and it is the only layer that sees the nine translated
  locales (§0). See §4 for what an edit here costs.
- `src/prompts/task-c.ts` — inspect only (OD-8).
- `src/prompt-core/master-system-prompt.ts` — only if it carries a volume constraint contradicting
  v4. `NUMBER_FORMAT_RULES` reaches it by interpolation at `:83`, so FR-16 does **not** require
  editing it.
- `src/prompts/task-b.ts` — not touched.

`bash arch-guard.sh --rebaseline` must be committed with any such edit (NFR-7).

The established workaround pattern exists (`task-a-doc.ts` beside frozen `task-a.ts`;
`image-manifest-coverage.ts` beside frozen `output-validator.ts`) but **a new sibling file is a
design decision for ARCHITECTURE_PLANNING**, not an assumption this survey makes. Note that for
`task-a.ts` the sibling pattern is already exhausted: `task-a-doc.ts` *is* the sibling, and it
still calls into the frozen builder.

### Hazard 5 — the corpus conformance harness — **APPLIES, and coverage is short** — see §5

### Hazard 6 — the two test runners — **CHECKED, effectively does not apply**

`vitest.config.ts` states the boundary: `*.component.spec.ts` is the only discriminator, excluded
from the logic runner and executed by `npm run test:components`. The repository has **exactly one**
such file (`model-settings.component.spec.ts`), and nothing in FR-1..FR-30 reaches
`src/app/components/`. **All new tests for this Story land in `npm run test:logic`.**
`npm test` runs both, so the component runner still executes; it just gains no work.

### Hazard 7 — server-side surfaces with no co-located tests — **CHECKED, DOES NOT APPLY**

The Specification's Scope row names the surface as `src/prompts`, `src/prompt-core`, `src/domain`,
`src/render`, `src/utils` and states "No requirement in this Specification reaches outside that
surface." Confirmed against the survey: no FR touches `server/**`, no provider, no pricing path,
and nothing writes to the usage store. The `CREATE TABLE IF NOT EXISTS` migration trap in
`server/usage/store.js` is therefore not in play for this Story.

---

## 3. Where this Story's new bounds could leak onto the `'3.0'` path

The human's constraint on the FR-27 decision: a new strict bound must apply to the `'4.0'`
emission path only, because OD-2 keeps cached `'3.0'` documents readable and renderable. This is
the NBF-1 trap the spec review flagged for `SpecRow.value`. Every leak path found:

| # | Leak path | Mechanism | Severity |
|---|---|---|---|
| L1 | **`subsections` `.min(2)` for FR-27** | `makeSubsectionSchema` (`description-doc.schema.ts:142-149`) builds **one** `SubsectionSchema` used by `functionality` (`:163`) **and** `compatibility` via `RelaxedSubsectionSchema` (`:152, :176`). `subsections` is `z.array(leafSchema).optional()` — today a 1-element `subsections` array is valid everywhere. An unconditional `.min(2)` rejects any cached `'3.0'` document with a single `<h3>` under an H2, **and** applies it to §5 compatibility, which FR-27 does not govern. Measured against the corpus: subsection counts are 0/0/0/2/0 and 2/0/0/3/0/5/3 — **no group has exactly 1**, so the fixtures neither catch this leak nor demonstrate it firing | **highest** |
| L2 | **`SpecRow.value` string-only** | `:187` is a single shared union. This is NBF-1 itself; FR-10 already scopes it, and OD-2 records the conflict | high, already named |
| L3 | **The FR-4 §2 composition restriction** | `keyBenefits: z.array(RelaxedBlockSchema).min(1)` (`:162`) is one shared field. Narrowing the Block union unconditionally rejects every cached `'3.0'` document whose §2 carries a `paragraph`, `figure` or `video` Block. The committed corpus fixtures are `'3.0'` with a `bullets`-only §2, so **the fixtures would not catch this leak** | high, and untested by the corpus |
| L4 | **The FR-17 combined §2 ceiling of 8** | Today's bounds admit 4 + 8 + 8 + … (`:160`, `:162`, `:100`). A document-level `superRefine` added to `ProductDescriptionDocSchema` runs for **both** versions — the existing `superRefine` at `:212` is unconditional | high |
| L5 | **Any FR-4 / FR-17 check placed in `output-validator.ts`** | `validateGeneratedHtml(html, context, productName?, locale?, options?)` (`output-validator.ts:491-497`) takes **no Doc and no version**. It has **no `schemaVersion` discriminator by construction.** A §2-shape or ceiling rule added here fires on `'3.0'`-rendered HTML too — and on all nine translated locales, which never had a version in the first place. FR-17 explicitly routes "schema refinement, the output validator, or both" to ARCHITECTURE_PLANNING; this is the structural constraint on that choice | **structural — not fixable by scoping, only by choosing the layer** |
| L6 | **The renderer** | `renderDescription` (`:307`) has no version branch at all. §2 rendering is shared by both versions today. An unconditional §2 change alters the output for `'3.0'` documents, which is what the corpus fixtures assert against (§5) | high, and the corpus *does* catch this one |
| L7 | **`structural-parity.ts`** | Counts `<h2>`/`<h3>`/`<table>` master-vs-translation. Version-agnostic; only matters within a single generation, so the leak is bounded — but a `'3.0'` master rendered beside `'4.0'`-shaped expectations would mismatch |

L5 is the one that cannot be closed by careful scoping alone, because the layer itself carries no
version. L1 is the one most likely to be missed, because FR-27 describes it as "a preservation,
not a change".

---

## 4. Silent-failure risks — wrong output, no error

### 4.1 FR-16 group 3 has no enforcement anywhere

Checked directly. `NUMBER_FORMAT_RULES` is prompt text. On the validator side:

- `COMMA_DECIMAL_LOCALES = {uk-UA, ru-UA, pl-PL, de-DE, es-ES, pt-PT}` — `output-validator.ts:43`,
  mirrored verbatim at `decimal-separator.ts:52` and `identifier-decimal.ts:33`. **de-DE, es-ES and
  pt-PT are already in it**, so the decimal-comma half of group 3 already matches and `pt-PT`
  already has a decimal rule in the validator even though the prompt has no `pt-PT` line.
- `NBSP_THOUSANDS_LOCALES = {uk-UA, ru-UA, pl-PL, pt-PT}` — `output-validator.ts:44`. **Searched
  the whole repository, not just `src/`: the declaration at `:44` is the only occurrence. It is
  dead code.** Its trailing comment ("de-DE/es-ES allow dot OR space") is therefore the only
  trace of the group-3 rule anywhere in the enforcement layer.
- The live `thousands-separator` rule (`:93-102`) only flags *English-style comma grouping*
  (`\d{1,3}(?:,\d{3}){2,}` or `1,234.56`) for comma-decimal locales. It never distinguishes a dot
  from a non-breaking space.

**Two consequences.** First, the Specification's Scope row is **correct as written**: FR-16 is a
`constants.ts` / `number-format-fixer.ts` change and **not** a §9 edit — no frozen-file edit is
forced by it. Second, and this is the silent failure: **switching de-DE and es-ES from
dot-grouping to non-breaking-space grouping has no automated detector at all.** A de-DE artifact
that keeps `1.234.567,89` produces zero validator issues. FR-16's failure path ("a number
formatted with another locale's separators … is a defect") has no mechanism behind it for group 3.

### 4.2 A new §2 `<h2>` trips the Center 3D Print heading rules

`heading-style.ts:249-276` iterates **every** `<h2>` when `isCenter3dPrintStore(storeName)` and
the locale is Cyrillic (`uk-ua`, `ru-ua`), skipping only: `section.specs`, headings containing
`?`, prefixes in `MANDATED_NOMINAL_H2`, `startsWithFunctionalOpener`, `looksVerbal`.

A v4 §2 heading of the natural nominal form («Ключові характеристики та переваги») matches none of
those exits and raises `h2-nominal-heading`. `MANDATED_NOMINAL_H2` (`constants.ts`) currently lists
six uk-ua and six ru-ua phrases and contains no §2 entry, because §2 has never had a heading.

Severity is `warning`, so it does not block — it surfaces in the report and in repair feedback.
Separately, `checkProductNameStuffing` (`heading-style.ts:117-205`) budgets **two** product-named
`<h2>`s per document; a §2 heading naming the product spends one of them, and `:181-187` treats
the last `<h2>` with a `?` as the §9 closing, which the FR-11 CTA still is.

### 4.3 §4 admits no video, so §3 is the only unconditional destination for a displaced embed

`ApplicationsBlock = Extract<Block, {kind:'paragraph'} | {kind:'figure'}>`
(`description-doc.ts:56`) and `ApplicationsBlockSchema` (`description-doc.schema.ts:109-112`)
narrow §4 in **both** the type and the schema, deliberately.

FR-4 removes `video` from §2. The v4 sections whose shape admits a `video` Block are then §3
functionality (`BlockSchema`) and §5 compatibility (`RelaxedBlockSchema`) — and §5 is emitted only
when the source data carries compatibility content (FR-6). **§3 is therefore the only
unconditional destination.** `task-a.ts:117` (`buildVideoBlock`) already instructs "place it in §3
FUNCTIONALITY, before §7", so the prompt agrees — but this is the constraint, not a coincidence,
and FR-4's phrasing "the v4 sections whose shape admits them — §3 functionality and §4
applications" reads as if §4 were an option for video. It is not.

FR-24's failure path ("a video embed present in the input and absent from any generated locale's
output") is enforced by `validateVideoCoverageDoc` (`content-orchestrator.service.ts:532`), so a
lost embed *does* error. The silent part is the destination, not the survival.

### 4.4 The figure position walk — checked, and it does reach every receiving section

The spec-review asked for exactly this. `figurePositions` (`render-description.ts:115-123`)
delegates to `forEachBlockInOrder` (`description-doc.ts:175-189`), which visits, in order:

1. `doc.keyBenefits`
2. `doc.functionality` (recursing into `subsections`)
3. `doc.applications.blocks ?? []`
4. `doc.compatibility` (recursing)

**Every section that can receive figure content displaced from §2 — §3 functionality and §4
applications — is reached by the walk.** The FR-23 hazard does **not** materialise as written,
provided FR-4 relocates content only into sections that already exist in this traversal. The walk
is shared by the schema's ref check (`description-doc.schema.ts:220`), the renderer
(`render-description.ts:119`) and `bullet-lead-punctuation.ts:74,121`, so it cannot drift between
them — that sharing is the fix the `:664-673` regression test guards.

**The residual risk is precise and worth stating:** if ARCHITECTURE_PLANNING introduces a *new*
collection to hold displaced §2 content — a separate "key benefits prose" field, or a §2 lead-in
slot — it must be added to `forEachBlockInOrder`, and its doc-comment says so ("Adding a section to
the model now means adding it here, once"). A figure the walk never visits resolves to position 0,
ships without `loading="lazy"`, and `output-validator` flags `lcp-image-lazy` — and it would be
silent until a figure actually lands there.

### 4.5 The combined §2 ceiling has no repair target

FR-17 point 2 says this; the survey confirms the mechanism. `repair-strategy.ts:39-61` resolves a
dotted field path (`doc.functionality[2].heading`, `doc.cta.heading`) to compute a tier-0 fix;
`doc-schema-issues.ts:118` deliberately emits the full dotted path "not just the root". A
cross-collection invariant names no field, so it degrades to a full-document regeneration — which
is precisely the ladder exhaustion recorded at `description-doc.schema.ts:82-95` that caused the
keyBenefits floor to be relaxed to 2. FR-29 records the interaction; FR-30 states the outcome.

### 4.6 `task-a-doc.ts`'s header comment is false

`src/prompts/task-a-doc.ts:18` reads "NOT WIRED INTO PRODUCTION. The orchestrator still calls
buildPromptA and still emits HTML." It is wired: `content-orchestrator.service.ts:860` and `:1305`
select `buildPromptADoc` whenever `usesDocPipeline(...)` is true, which is six of seven stores.
A planner trusting that comment would plan the wrong file set.

---

## 5. Fixture and corpus impact

### What exists

`test/fixtures/corpus/` holds **two** triples:
`center-3d-print-ortur-h20-20w` and `expert3d-ortur-h20-20w`
(`.ctx.json` / `.doc.json` / `.uk-UA.html` each). `test/fixtures/consumables-corpus/` holds one
more, which is out of scope.

Verified in this run:

- Both `.doc.json` files carry **`"schemaVersion": "3.0"`**.
- Both are **`locale: uk-UA`**.
- The EXPERT3D item: `killerSpecs` 4, `keyBenefits` a single `bullets` Block,
  `applications.blocks` = `paragraph, paragraph, figure`, 5 application items, 14 figures,
  0 videos, no `packageContents`, no `compatibility`.
- Both `.uk-UA.html` files contain **9 `<h2>`**, **none of them for §2**, and §2 is a bare
  `<div class="table-responsive"><table>` with no class attribute; the three §7 tables carry
  `class="table table-bordered table-striped"`.

### What moves

- **`test/render-reconciliation.spec.ts` fails on both fixtures the moment §2 rendering changes
  unconditionally.** The two accepted artifacts *are* the `'3.0'` §2 shape: a table, no `<h2>`.
  A version-scoped `'4.0'` renderer branch leaves them untouched and both keep passing. This is the
  concrete, testable form of leak L6, and it is the cheapest early signal the plan has.
- **`test/render-conformance.spec.ts`** builds its own locale-neutral `conformanceDoc(locale)` in
  the file, so it moves with the schema rather than with the fixtures. Its `toHaveLength(7)`
  registry assertion at `:147` is unaffected by this Story.
- `test/tools/scaffold-doc.mjs` parses accepted HTML **into** a Doc; §2's table shape is one of its
  anchors (`doc-pipeline-flag.ts:59-67` describes the §C failure in those terms). A v4 §2 is a
  different shape to parse.

### Coverage the Story needs and the corpus does not have — cited as a finding now

`test/render-reconciliation.report.md` §5 item 2 records it verbatim: **"Corpus is 2 items, not 6,
and both are the same product (Ortur H20 20 W) across two stores."** Measured against US-2.1:

| Coverage US-2.1 needs | In the corpus? |
|---|---|
| A `'4.0'` document of any kind | **no** — both are `'3.0'` |
| A §2 carrying a `paragraph`, `figure` or `video` Block (the content FR-4 displaces) | **no** — both are `bullets`-only. **Leak L3 is invisible to this corpus** |
| A document with `packageContents` (FR-6 §6 heading) | **no** — absent from the EXPERT3D item |
| A document with `compatibility` (FR-6 §5) | **no** — absent |
| A document with a video embed (FR-24 after §2 loses video) | **no** — `videos: 0` |
| A `SpecRow.value` in array form (FR-9, FR-10, the OD-2 cache case) | **no** — counted across every category row of both items: **zero** array-valued rows |
| A functionality group with exactly one `<h3>` (the FR-27 / leak-L1 case) | **no** — counts are 0/0/0/2/0 and 2/0/0/3/0/5/3 |
| Any locale other than uk-UA | **no** — both are uk-UA |
| Any store other than Center 3D Print / EXPERT3D | **no** |

Report §5 item 3 adds the reason this cannot be closed by reaching for older exports: running the
scaffolder over the eight newest non-Ortur exports, **every one is unusable** (pre-collapse §2a,
`<div>` with no Block kind, §6-shaped list), because "the corpus must be produced by the CURRENT
pipeline."

**This is a finding for TEST_WRITING now, not a surprise later:** the corpus cannot demonstrate
`'3.0'` / `'4.0'` dual support, because it contains no `'4.0'` item and no `'3.0'` item exercising
the shapes FR-4 removes. Hand-authored fixtures will be needed for both sides, and the
reconciliation corpus is the wrong instrument for the `'4.0'` side by construction — it reconciles
against artifacts production already shipped, and production has shipped no v4 artifact.

---

## 6. Additional survey findings

### 6.1 §2's `<h2>` has no source field in the domain model

FR-4 requires §2 to render "a single `<h2>` followed by one `<ul>`". Today there is no §2 heading
anywhere: `renderKillerSpecs` (`render-description.ts:240-252`) emits only the table, and the
corpus HTML confirms 9 `<h2>` with none for §2.

The model has no field for it. `killerSpecs` is `KillerSpec[]` with `{label, value, why}` only
(`description-doc.ts:24-31`); `keyBenefits` is a bare `Block[]` (`:133`). Every other v4 heading
has a home — `functionality[i].heading`, `applications.heading`, `compatibility.heading`,
`packageContents.heading`, `specs.heading`, `cta.heading`.

FR-6 and FR-11 state that the §6 and §9 headings are code-resident and not model-authored. The
Specification says nothing about where the §2 heading comes from. It is the only new heading this
Story introduces, and it needs a source across 10 locales. Recorded as an Unknown (U1).

### 6.2 `Expert-3DPrinter` has no path to a `'4.0'` document

Three independent facts, all verified:

1. It is **absent from `DOC_PIPELINE_STORES`** (`doc-pipeline-flag.ts:51-56`), so
   `usesDocPipeline()` returns false and the orchestrator takes the `buildPromptA` plain-HTML
   branch (`content-orchestrator.service.ts:863`, `:1308`). **No `ProductDescriptionDoc` is ever
   produced for it, so no `schemaVersion` is ever emitted.**
2. Its `imageBaseUrl` is `''`, so `renderContextFor()` refuses it by design
   (`doc-pipeline-flag.ts:43-46`); `render-conformance.spec.ts:136-137` places its three
   store-locale pairs in the `UNRENDERABLE` bucket.
3. It is **the only store carrying `en-US` and `es-MX`**.

Against the Specification: Scope names all seven stores and all ten locales, and FR-15 requires
"every new LLM generation emits a document with `schemaVersion: '4.0'`". For this store that is
unreachable as the code stands — its v4 conformance would have to come entirely from prompt rules
in FROZEN `task-a.ts` plus the HTML validators, with no schema behind it. `doc-pipeline-flag.ts:43`
describes it as "a placeholder that is not yet trading", so nothing is currently broken; but FR-16's
`es-MX` group-1 placement and the FR-6 / FR-11 heading-table entries for `en-US` and `es-MX` have
no renderable path to exercise them. Recorded as Unknown U2.

### 6.3 Two emission paths, one Specification

Six stores generate through the Doc pipeline (JSON → `renderDescription`); `Expert-3DPrinter`
generates HTML directly from `buildPromptA`. `templateId === 'consumables-resin'` is excluded from
both by `usesDocPipeline` (`doc-pipeline-flag.ts:70`) and is out of scope regardless.

The Specification's version-scoping language (FR-4, FR-10, FR-15, FR-17) is written for documents.
On the plain-HTML path there is no document and therefore no version to scope against — the same
structural gap as L5, arriving from the other direction.

---

## 7. Blast-radius summary

US-2.1 reaches all four links of the prompt → schema → renderer → validator chain simultaneously,
with two FROZEN files inside it (`task-a.ts`, whose `:20` states the opposite of FR-4, and
`output-validator.ts`, the only layer that sees the nine translated locales), neither approved
yet. The decisive structural fact is that a `ProductDescriptionDoc` exists **only for uk-UA** —
Task C translates rendered HTML (`buildPromptC(html, …)`, `task-c.ts:94`) — so `schemaVersion` and
every Zod bound govern one locale, while the other nine inherit v4 as HTML shape, policed by
`structural-parity` counts of `<h2>`/`<h3>`/`<table>` that this Story shifts in all three. The
riskiest single change is §2: it is today a heading-less table (`renderKillerSpecs`, and the
corpus HTML confirms 9 `<h2>` with none for §2), it must become one `<h2>` plus one `<ul>`, the
`<h2>`'s text has no field in the domain model and no stated source, and both committed corpus
fixtures are `'3.0'` documents that assert the current shape byte-for-byte — which makes
`render-reconciliation.spec.ts` the cheapest early detector of an unscoped renderer change and,
simultaneously, blind to the unscoped *schema* changes (L1, L3, L4), because neither fixture
carries a single-`<h3>` group, a non-`bullets` §2 Block, a video, `packageContents` or
`compatibility`. Six stores are on the Doc pipeline; the seventh, `Expert-3DPrinter`, is on none
of it and is the sole carrier of `en-US` and `es-MX`. The figure-position walk was checked
directly and already reaches every section that can receive displaced §2 content, so FR-23's named
hazard does not fire as written — it fires only if planning invents a new collection and forgets
`forEachBlockInOrder`. Finally, FR-16's group-3 correction needs no frozen-file edit (the
validator's `NBSP_THOUSANDS_LOCALES` is dead code and its live rule only catches English-style
comma grouping), which also means the de-DE / es-ES separator switch ships with no detector at all.

---

## 8. Unknowns — what this survey could not determine, and what would settle each

| # | Unknown | What would settle it |
|---|---|---|
| **U1** | **Where the §2 `<h2>` text comes from.** No field exists for it in `ProductDescriptionDoc`, and the Specification is silent — unlike FR-6 and FR-11, which explicitly make their headings code-resident. Model-authored (new schema field) and code-resident (new per-locale table) have different blast radii: the first adds a `NonEmpty` field and a prompt slot; the second adds 10 locale entries and interacts with `MANDATED_NOMINAL_H2` (§4.2) | An ARCHITECTURE_PLANNING decision. Not a Specification defect — FR-4 fixes the rendered shape, which is what it set out to fix |
| **U2** | **How `Expert-3DPrinter` satisfies FR-15.** It produces no Doc and cannot render (§6.2). Either it is understood to be excluded until it trades and gains a CDN path, or `DOC_PIPELINE_STORES` and `imageBaseUrl` are in scope — which the Specification's surface row does not cover (`doc-pipeline-flag.ts` is in `src/prompt-core`, so it is inside the surface, but no FR names it) | A human or ARCHITECTURE_PLANNING decision. Flagged, not assumed |
| **U3** | **Which layer carries the FR-4 §2-composition and FR-17 combined-ceiling checks.** FR-17 routes this to ARCHITECTURE_PLANNING deliberately. This survey adds the constraint it must be decided under: `validateGeneratedHtml` has no version parameter (L5), so a validator-layer check cannot be version-scoped, while a schema-layer check cannot see the nine translated locales | ARCHITECTURE_PLANNING, now with the layer constraint on the table |
| **U4** | **Whether the FR-27 `subsections` bound can be expressed without touching §5 compatibility.** `SubsectionSchema` and `RelaxedSubsectionSchema` are built by one factory (`makeSubsectionSchema`, `:142`) shared by `functionality` and `compatibility` (leak L1) | ARCHITECTURE_PLANNING. The requirement is §3-only; the current shape is shared |
| **U5** | **Whether any cached `'3.0'` document in the wild carries a `SpecRow.value` array, a §2 `figure`/`video`/`paragraph` Block, or a single-`<h3>` functionality group.** All three are **measured absent from both corpus items** (§5), and this survey has no access to the production cache. `description-doc.ts:75-86` records that the array form is real accepted output ("EXPERT3D writes a multi-valued parameter as a nested list"), so absence from two same-product fixtures is not evidence of absence in the cache | Only production data would settle it. Until then the conservative reading of OD-2 — that all three shapes exist and must keep parsing — is the safe one, and it is what leaks L1/L3 are measured against |

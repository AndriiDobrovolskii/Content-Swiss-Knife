---
artifact: story
story: US-7.1
slug: preserve-proper-product-names
title: Keep the product name the operator typed intact in every mode and store profile (stop dropping "Resin Tank" from "Formlabs Form Studio 1 Resin Tank Pro")
track: prompt
version: 2
status: DRAFT
owner: so-story-writer
created_at: 2026-10-09T00:00:00Z
updated_at: 2026-10-09T12:59:42Z
---

# US-7.1 — Keep the operator's product name intact

## Story

> Bug Story — **Observed / Expected / Reproduction** replace the usual actor sentence.

**Actor:** a content operator generating content for a product.

### Observed

For the Product Name `Formlabs Form Studio 1 Resin Tank Pro` (store EXPERT3D, template
Accessories), the generated content uses a **shortened, altered name**: `Resin Tank` is treated as
a category noun, moved to the front, translated, and removed from the model designator.

| Surface | Output | Problem |
|---|---|---|
| es-ES name / slug | `Depósito de resina Formlabs Form Studio 1 Pro` / `deposito-resina-formlabs-form-studio-1-pro` | "Resin Tank" gone from the name |
| pt-PT name / slug | `Tanque de resina Formlabs Form Studio 1 Pro` / `tanque-resina-formlabs-form-studio-1-pro` | same |
| uk-UA name / slug | `Резервуар для смоли Formlabs Form Studio 1 Pro` / `rezervuar-smoly-formlabs-form-studio-1-pro` | same |
| SEO metadata H1 / meta title / meta description (es-ES, pt-PT, uk-UA) | all use `… Form Studio 1 Pro` | same |
| UA Description (uk-UA) — H1, body, "Why buy" paragraph | `Резервуар для смоли Formlabs Form Studio 1 Pro` | same |

Only the en-ES slug/H1/meta kept `Formlabs Form Studio 1 Resin Tank Pro`.

### Expected

The product name the operator typed is protected according to a **hybrid rule** (operator decision, OD-1):

- **Branded / model name** — the typed name contains a brand or an alphanumeric model identifier
  (e.g. `Formlabs`, `1`, `Pro`). Then **no token may be removed, re-ordered or translated, even a
  descriptive one such as `Resin Tank`**. The only permitted mutation inside such a name is locale
  formatting of numbers and units (e.g. `1.75 mm` → `1,75 мм`). A localized category noun may be
  added **around** the name (e.g. `Depósito de resina Formlabs Form Studio 1 Resin Tank Pro`).
- **Generic name** — the typed name has no brand or model identifier (e.g. `Hardened Steel Nozzle`,
  `With Spool`). The existing localization rules continue to apply and the name is translated.

This holds in every tool mode and for every store profile. The localizing worked examples in
`src/prompts/task-slug.ts` that use a branded name (e.g. `Bambu Lab Hardened Steel Nozzle 0.4 mm`,
`Bambu Lab PLA Basic Filament …`) are legacy behaviour and MUST be updated, together with the tests
that assert them; examples with generic names stay.

**`meta_title` limit (operator decision, OD-2):** the 55-character `meta_title` limit stays hard, but
keeping the full typed name outranks adding a localized category. If `localized category + typed
name` exceeds 55 characters, the category is dropped from `meta_title` (or another already-permitted
fallback is used) so the full typed name (37 characters for the fixture) fits whole.

### Reproduction

1. Target website EXPERT3D, template Accessories, Product Name `Formlabs Form Studio 1 Resin Tank Pro`,
   Original Description from the evidence zip.
2. Run Generator / UA Description, Slugs, SEO Meta (and Translator, Optimizer on the result).
3. Inspect names, slugs, H1, meta and body: `Resin Tank` is missing from the product name.

## Context

Reported by the operator on 2026-10-09 with screenshots and the exported ZIP in
`Knowledge/Issues/2/`. Evidence: `slugs.json` and `seo_metadata.json` in that ZIP show the shortened
name in three locales; `repair_gate_report.md` shows the repair gate verified the *shortened* H1 as
correct (`meta-title-template-shape`), so downstream checks currently reinforce the wrong name
instead of catching it. The slug prompt (`src/prompts/task-slug.ts`) instructs category-first
localized names with "head noun rendered once, fully localized", which is the likely path by which
`Resin Tank` is consumed as a head noun. Prompt files are the first place to investigate
(operator's instruction); `src/prompt-core/product-name-core.ts` (`invariantCore`) is related prior
art — see `project_slug_invariant_core_overcapture` class of bug.

**Operator decisions on the clarification report:** OD-3 – OD-10 are accepted with the defaults stated in
`docs/decisions/US-7.1-open-decisions.md` (the "Defaults a spec may carry"). In particular: new checks
go in sibling modules next to `slug-validator.ts` (precedent: `seo-metadata-shape.ts`) to keep FROZEN
edits to a minimum (OD-10); the existing `invariantCore` is left untouched and the new checks use the
full typed name (OD-6).

## Scope

| | |
|---|---|
| **Stores** | All stores in `STORE_REGISTRY` (every profile) |
| **Locales** | All locales; uk-UA is the master artifact, so a uk-UA change fans out to every translated language |
| **Surface** | Prompts: `src/prompts/task-slug.ts`, `task-a.ts`, `task-a-doc.ts`, `task-b.ts`, `task-c.ts`, `task-translate.ts`, `optimizer.ts`, `src/prompt-core/master-system-prompt.ts`, `product-name-core.ts`; possibly validators (`src/utils/slug-validator.ts`, `output-validator.ts`). Modes: Slugs, Generator, UA Description, SEO Meta, Translator, Optimizer |
| **Touches FROZEN files?** | Avoided by design: new validation lives in sibling modules next to `src/utils/slug-validator.ts`. A FROZEN file (AGENTS.md §9: `src/prompts/task-a.ts`, `task-b.ts`, `task-c.ts`, `src/prompt-core/master-system-prompt.ts`, `src/utils/output-validator.ts`) is edited only if the prompt text there must change; the operator authorised that in the request, but §9 per-file approval is still confirmed at the plan gate and `.arch-guard-checksums` is re-baselined in the same commit |
| **Touches generated HTML?** | Yes — H1/body of the description (AGENTS.md §4 H1/heading criteria must not regress) |

## Acceptance criteria

Fixture for all criteria: store EXPERT3D (and, for AC-4, every store in `STORE_REGISTRY`), Product
Name `Formlabs Form Studio 1 Resin Tank Pro`.

- **AC-1:** In Slugs mode, every locale's `name` contains the exact substring
  `Formlabs Form Studio 1 Resin Tank Pro`, and every `slug` contains
  `formlabs-form-studio-1-resin-tank-pro`.
- **AC-2:** In SEO Meta mode, for every locale the `h1` contains `Formlabs Form Studio 1 Resin Tank Pro`
  verbatim, and `meta_title` contains it verbatim and is ≤ 55 characters. A localized category noun
  (e.g. `Depósito de resina`) MAY be absent from `meta_title` when including it would exceed 55
  characters. No field contains the altered form `Form Studio 1 Pro`.
- **AC-3:** In UA Description / Generator mode, the output (H1, body, CTA paragraph) contains no
  occurrence of `Form Studio 1 Pro` (the altered form); every mention of the product name that
  includes the model designator contains `Form Studio 1 Resin Tank Pro`.
- **AC-4:** AC-1 – AC-3 hold for every store profile in `STORE_REGISTRY` (a per-store test
  iterates the registry rather than naming stores).
- **AC-5:** Translator and Optimizer modes, given text that already contains
  `Formlabs Form Studio 1 Resin Tank Pro`, return it with the name unchanged in every target locale.
- **AC-6:** The existing H1/heading-form and meta-title-template checks, including the 55-character
  `meta_title` limit, still pass for the fixture.
- **AC-7:** A deterministic check in a new module beside `src/utils/slug-validator.ts` (and wired into
  the validation path) fails any generated H1, localized name or slug that, for a branded/model
  typed name, does not contain every token of the typed name — for slugs, its slugified form with
  slug stopwords removed and locale number-separator changes allowed. For the fixture, a name missing
  `Resin` or `Tank` fails with a violation that names the missing token. A generic typed name
  (no brand or model identifier) is not subject to the check.
- **AC-8:** With the LLM mocked to return `Formlabs Form Studio 1 Pro` (dropping `Resin Tank`), the
  repair gate flags the violation, performs a repair attempt, and the shortened name is not accepted
  as passing `meta-title-template-shape`.
- **AC-9:** The `task-slug.ts` worked examples and their tests are updated so that no example with a
  branded/model input name translates, drops or re-orders a token of it (numbers/units may be
  locale-formatted); no remaining spec asserts the old localizing behaviour for such names, and
  generic-name behaviour is unchanged.

## Out of scope

- Renaming or changing the Product Name input field, the store registry, or the model/provider set.
- Changing any other prompt behaviour (tone, structure, template schemas).
- Changing the existing `invariantCore`; its under-capture of descriptor words such as `resin` is left as is (OD-6) and the new check uses the full typed name.

## References

- `Knowledge/Issues/2/` — screenshots and `expert3d_formlabs_form_studio_1_resin_tank_pro_2026-10-09_1508.zip`
  (`slugs.json`, `seo_metadata.json`, `description_uk-UA.html`, `repair_gate_report.md`)
- AGENTS.md §4 (HTML acceptance criteria), §9 (FROZEN files)
- `src/prompts/task-slug.ts` (slug rules, worked examples), `src/prompt-core/product-name-core.ts`
- Related: US-3.1 (brand-core / heading-form rule conflict)

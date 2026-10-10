---
artifact: specification
story: US-7.1
version: 4
status: APPROVED
owner: so-spec-writer
created_at: 2026-10-09T13:45:00Z
updated_at: 2026-10-09T16:30:00Z
supersedes: docs/specifications/US-7.1-spec.md#3
inputs_consumed:
  - key: story
    version: 2
  - key: clarification_report
    version: 2
  - key: open_decisions
    version: 2
  - key: specification_review
    version: 3
open_decisions_blocking: false
---

# Specification: US-7.1 — Keep the operator's product name intact

## Summary

After this change, when the operator types a branded or model-identified Product Name (for example
`Formlabs Form Studio 1 Resin Tank Pro`), every generated name, slug, H1, `meta_title`, description text,
translation and optimized text carries that name with no token removed, re-ordered or translated; only
locale formatting of numbers and units is allowed inside it. A deterministic check fails any output that
drops a token, and the repair gate no longer accepts a shortened name. Generic names (for example
`Hardened Steel Nozzle`) keep today's localization behaviour.

## Background

Reported 2026-10-09 (`Knowledge/Issues/2/`): for store EXPERT3D, template Accessories, the name
`Formlabs Form Studio 1 Resin Tank Pro` was rewritten to `… Form Studio 1 Pro` (with a translated, fronted
"Resin Tank") in the es-ES, pt-PT and uk-UA names, slugs, SEO metadata and the UA Description; only en-ES
kept the typed name. The repair gate verified the shortened H1 as correct (`meta-title-template-shape`),
so downstream checks reinforced the wrong name. The operator decided the hybrid rule (OD-1) and the
`meta_title` priority (OD-2) in Story v2, and accepted the defaults of OD-3 – OD-10.

## Definitions

- **Typed name** — the Product Name string the operator entered.
- **Protected name** — a typed name classified as branded/model per FR-1.
- **Generic name** — a typed name that is not protected.
- **Fixture A** — store EXPERT3D, Product Name `Formlabs Form Studio 1 Resin Tank Pro`.
- **Fixture B** — a protected name containing a decimal and a unit, with a brand (for example
  `Bambu Lab PLA Basic Filament 1.75 mm`), added per the clarification finding because Fixture A exercises
  no number, unit or stopword (OD-3, OD-13).
- **Fixture C** — a generic name, for example `Hardened Steel Nozzle 0.4 mm` and `With Spool`.

## Scope

| | |
|---|---|
| **Stores** | Every entry of `STORE_REGISTRY` (AC-4). Fixture store EXPERT3D (locales `en-ES, es-ES, pt-PT, uk-UA`). No store is named in a requirement; per-store tests iterate the registry. |
| **Locales** | All locales of every store. uk-UA is the master artifact: Task A builds uk-UA and Task C translates every other language from it, so a uk-UA master fix fans out to every translated locale. Slugs and SEO Meta are separate per-locale generators and are covered by their own requirements (FR-3, FR-4). Translator and Optimizer operate on already-generated text (FR-6). |
| **Track** | prompt (validator work in `src/utils` assigned per task by the planner) |
| **FROZEN files (AGENTS.md §9)** | None assumed (OD-10): new checks live in sibling modules beside the slug validator. If the prompt fix needs text in a FROZEN file, the per-file §9 approval is requested at the plan gate and `.arch-guard-checksums` is re-baselined in the same commit. |

## Functional requirements

### FR-1: Classification of a typed name as protected or generic

The system classifies each typed name deterministically as protected or generic, with no model call.
Default carried (OD-11, OPEN, overturnable at HUMAN_SPEC_APPROVAL): a name is protected when it contains
(i) a brand from the union of all stores' `officialBrands` plus a spec-listed set of known brands
(`Formlabs`, `Bambu Lab`) — matched case-sensitively as written, as a whole-word token sequence (a multi-word
brand such as `Bambu Lab` matches only as its consecutive tokens in that order), or (ii) a token mixing letters and digits (e.g. `L2`, `X1C`), or (iii) a
standalone integer or one of the suffix words `Pro`, `Plus`, `Max`, `Mini`, `Lite`, `Ultra` immediately
following another capitalised name token. A name matching none of (i) – (iii) is generic; there is no
"ambiguous" class. Rule precedence for numbers: before rule (iii) is evaluated, every decimal token and
every number token directly followed by a unit token (from the unit table the pipeline already uses for
locale unit formatting, e.g. `mm`, `kg`, `W`) is removed from consideration. A "standalone integer" is an
integer token that is not directly followed by a unit token. A decimal or number+unit span alone
(`0.4 mm`, `1.75 mm`, `20 W`, `4 mm`, `1 kg`) therefore never makes a name protected, while
`Form Studio 1 Resin Tank Pro` (the `1` is followed by `Resin`, not a unit) is.

Intended treatment of attached forms (part of the OD-11 default, still OPEN): a number written together with
a unit and no space (`0.4mm`, `4mm`) is treated as a number+unit span and so never makes a name protected;
the token `3D` is exempt from rule (ii); a token with no digit (`PLA+`) does not match rule (ii) at all. Any
other token mixing letters and digits still matches rule (ii). Consequently `Hardened Steel Nozzle 0.4mm`
and `3D Printer Cleaning Kit` are generic and keep today's localization behaviour.

- Fixture A is protected. Fixture C (`Hardened Steel Nozzle 0.4 mm`, `With Spool`) is generic. Fixture B is
  protected.
- `Hardened Steel Nozzle 4 mm` and `PLA Filament 1 kg` are generic (no brand, no letter+digit token, the
  integer is part of a number+unit span).
- The classification does not depend on the active store, so it is identical for every `STORE_REGISTRY` entry.
- For the stores whose `officialBrands` is empty (`Drukarka 3D`, `Expert-3DPrinter`), brand detection relies on
  the spec-listed brands (`Formlabs`, `Bambu Lab`) and on rules (ii) and (iii) alone; the result for a given
  typed name is the same as for every other store.

**Failure path:** an empty or whitespace-only typed name is classified generic and is not subject to FR-5.

### FR-2: Protected-name rule (what may and may not change)

For a protected name, every generated surface that renders the product name keeps every token of the typed
name, in the typed order and untranslated, including descriptive tokens such as `Resin Tank`. The only
permitted mutation inside the name is locale formatting of numbers and units (e.g. `1.75 mm` → `1,75 мм`).
A localized category noun may be added around the name (e.g.
`Depósito de resina Formlabs Form Studio 1 Resin Tank Pro`); when added in non-English locales it precedes
the typed name and is not added when the typed name already starts with a category word (OD-4). The typed
name is rendered verbatim, once (OD-4).

**Failure path:** an output in which a token is removed, re-ordered or translated is a violation under FR-5;
it is never accepted as passing.

### FR-3: Slugs mode (AC-1)

In Slugs mode, for Fixture A, every locale's `name` contains the exact substring
`Formlabs Form Studio 1 Resin Tank Pro` and every `slug` contains `formlabs-form-studio-1-resin-tank-pro`.
The prompt for Slugs mode instructs the model to follow FR-2 for protected names; the localizing worked
examples with protected input names are removed or rewritten (FR-9).

**Failure path:** a name or slug missing a token is flagged by FR-5 as a violation and is never reported as
passing. This Specification does not require the repair flow of FR-8 to re-request a Slugs-mode output;
FR-8's repair attempt is defined only for the SEO Meta surfaces it names.

### FR-4: SEO Meta mode (AC-2)

In SEO Meta mode, for Fixture A and every locale: `h1` contains `Formlabs Form Studio 1 Resin Tank Pro`
verbatim; `meta_title` contains it verbatim and is ≤ 55 characters; no field contains the altered form
`Form Studio 1 Pro`. A localized category noun MAY be absent from `meta_title` when including it would
exceed 55 characters; the full typed name outranks the category (OD-2). Default carried (OD-12, OPEN):
when `category + typed name` would give an H1 of 54 or more code points, the H1 also omits the category
noun, so `meta_title` keeps the whole typed name and the existing long-H1 canonicalization behaviour is
unchanged; the H1 keeps the category noun when it fits.

**Failure path:** if the typed name alone is 54 or more characters (the point at which the existing
long-H1 canonicalization applies, matching `isH1Unreachable`), the 55-character limit remains hard and
the existing `meta_title` rule decides the outcome; the FR-5 violation is then reported as unresolved; this Specification does not relax the limit (see Open
questions, OD-5/OD-2 residual).

### FR-5: Deterministic token-preservation check (AC-7)

A deterministic check, in a new module beside the slug validator and wired into the validation path, runs for
a protected typed name only (a generic or empty typed name is never checked). It has two parts that share one
tokenisation.

**Tokenisation T (used by both parts).**

1. Surfaces that are HTML are reduced to text: tags are removed, HTML attribute values (`alt`, `title`,
   `href`, `data-*`) and `<script>`/`<style>` content are not scanned, and every block boundary (`p`, `li`,
   `h1`–`h6`, `ul`, `ol`, `table`, `tr`, `td`, `th`, `caption`, `blockquote`, `dt`, `dd`, `div`, `figcaption`, `br`) is a hard
   break.
2. Text is split on whitespace. Leading and trailing punctuation is stripped from each token. A token that
   ended with `, ; : ! ? . ( ) / |` (or that is followed by an opening bracket) is followed by a hard break.
   A `.` or `,` between two digits is part of the number; a hyphen inside a word stays in the token.
   A token that consists solely of a number immediately followed by a unit from the unit table the pipeline
   already uses (`0.4mm`, `20W`, `4mm`) is split into a number token and a unit token (`0.4` + `mm`). This
   split is applied on BOTH sides, the typed name and the output, before rule 3 and before the slugified form
   of the typed name is computed. So a typed `0.4mm` matches `0.4 mm` and `0,4 мм` in the output, and the
   space AGENTS.md §4 requires (FR-13) is never a violation. Tokens that only resemble this shape but are not
   number+table-unit (`3D`, `X1C`, `PLA+`) are not split. The split does not create or remove designator
   tokens (FR-1 already excludes number+unit spans from rule (iii)), so part 2 behaves as before.
3. Comparison is case-sensitive on Unicode-NFC text. Two number tokens are equal modulo decimal separator
   (`1.75` = `1,75`); two unit tokens are equal modulo the locale unit table the pipeline already uses
   (`mm` = `мм`); all other tokens must be identical.

**Part 1 — token presence (names, H1, `meta_title`, slugs).** For the generated H1, each localized `name`,
each `meta_title` and each `slug`, the typed name's tokens must all be present as one contiguous token
sequence under rule 3 (hard breaks are ignored for this contiguity test). For slugs: the typed name's
slugified form (the same stopword-stripping and normalization transform the pipeline applies to names,
applied to both sides) must be contained in the slug, locale number-separator changes allowed. For Fixture A,
a name missing `Resin` or `Tank` fails with a violation that names the missing token. The check uses the
full typed name; the existing `invariantCore` is not changed (OD-6). (`meta_description` is not required to
contain the name and has no part 1 check.)

**Part 2 — altered-form scan.** A *designator token* of the typed name is a token that triggered FR-1 rule
(ii) (letters+digits) or rule (iii) (the standalone integer or suffix word); a typed name with no designator
token (for example brand-only `Bambu Lab PLA Basic Filament 1.75 mm`) is not scanned by part 2. A *shortened
form* is a run of three or more consecutive tokens in the text with no hard break between them that (a) is an
in-order subsequence of the typed name's tokens under rule 3, (b) includes the typed name's last token,
(c) skips at least one typed-name token between its first and last matched token, and (d) includes at least
one designator token. A *full occurrence* is a contiguous token sequence matching the whole typed name under
rule 3 (the same comparison as part 1, so `1,75 мм` for `1.75 mm` counts). Each shortened form that does not
lie inside a full occurrence is a violation. Examples for Fixture A: `Form Studio 1 Pro` is a violation (skips
`Resin Tank`; contains `1`, `Pro`); `Formlabs Form Studio 1 Resin Tank Pro` and a bare `Form Studio 1` are
not. Legitimate text is not flagged by construction: `any Elegoo resin printer` (case differs, no designator
token) and `PLA, 1.75 mm` (hard break after `PLA,`; no designator token) are not shortened forms.

**Closed list of surfaces.** Part 2 scans exactly these surfaces and no others: (1) SEO Meta mode `h1`,
`meta_title` and `meta_description`; (2) Generator / UA Description output, including the Task C translated descriptions of every other locale
(es-ES, pt-PT, … per store): the H1, every heading, every body
paragraph and list item, the CTA paragraph and `figcaption` text; (3) Optimizer output text, only when its
optional `[Product Name]` line is provided. Part 1 applies exactly to: Slugs mode `name` and `slug`, and SEO
Meta `h1` and `meta_title`. The check does not read any other pipeline output.

**Where no typed name is in the request** (Translator mode; Optimizer without `[Product Name]`) there is no
deterministic check; the behaviour is prompt-only and is tested by prompt-text assertions (FR-7, NFR-7).

**Failure path:** a violation is reported (not thrown away) with the surface, locale and missing token (or,
for the second part, the offending shortened form); it is recorded as an error-level finding in the
validation result and the output is never reported as passing. A protected name with no violation produces
no violation; an empty typed name produces none.

### FR-6: Description generation (AC-3) and uk-UA fan-out

In UA Description / Generator mode, the output (H1, body, CTA paragraph) contains no occurrence of
`Form Studio 1 Pro` (the altered form), and every mention of the product name that includes the model
designator contains `Form Studio 1 Resin Tank Pro`. The uk-UA master carries this, and every language
translated from it from Task C does too. Per OD-8 the positive clause "the name must appear" is not added
unless the human asks. Heading short forms keep their current behaviour (OD-6): AC-3 forbids only the
altered form and requires the full designator wherever the model designator is mentioned.

**Failure path:** an output whose H1, body or CTA paragraph contains a shortened form (FR-5 second part) is
reported as an FR-5 violation and is not reported as passing. A repair re-request for this surface is not
required by this Specification. The positive half of AC-3 ("full designator wherever the model is
mentioned") is enforced only to the extent FR-5's second part catches a shortened form; beyond that it is
prompt-only (NFR-7).

### FR-7: Translator and Optimizer (AC-5)

Given text that already contains `Formlabs Form Studio 1 Resin Tank Pro`, Translator mode returns it with
the name unchanged in every target locale, and Optimizer mode returns it with the name unchanged. Per OD-7
no new input is introduced: Translator and Optimizer receive no Product Name (Optimizer has its existing
optional `[Product Name]` line), so their prompts state generically that brand and model names are
preserved verbatim, and the protected/generic distinction of FR-1 is not computed in those two modes
beyond what the model infers.

**Failure path:** Optimizer called with its optional `[Product Name]` line: an altered name in the output is
a violation under FR-5's second part. Translator mode, and Optimizer without `[Product Name]`, have no typed
name in the request (OD-7), so AC-5 there is prompt-only: it is verified by assertions that the built
Translator and Optimizer prompts contain the verbatim-preservation instruction, and there is no
deterministic rejection (stated limitation, OD-7).

### FR-8: Repair gate rejects a shortened name (AC-8)

With the model mocked to return `Formlabs Form Studio 1 Pro` (dropping `Resin Tank`), the repair gate flags
the FR-5 violation, performs a repair attempt, and the shortened name is not accepted as passing
`meta-title-template-shape`. Scope: the repair attempt is required for FR-5 violations on the SEO Meta
surfaces (H1, `meta_title`, both scanned by FR-5) the repair gate already handles. For Slugs-mode names/slugs and description text
this Specification requires only that the FR-5 violation is reported (FR-3, FR-6), not a repair attempt.

**Failure path:** the violation is reported as unresolved, never as passing, in each of these cases: the
repair attempt still returns the shortened name; the repair call errors or is rate-limited (e.g. HTTP 429);
the repair response is malformed JSON or otherwise unparseable. In the last two cases the originally
rejected output is not accepted in place of a repaired one.

### FR-9: Legacy worked examples and assertions (AC-9)

The Slugs prompt's worked examples are updated so no example with a protected input name (e.g.
`Bambu Lab Hardened Steel Nozzle 0.4 mm`, `Bambu Lab PLA Basic Filament …`) translates, drops or re-orders
a token of it (numbers and units may be locale-formatted). No remaining test asserts the old localizing
behaviour for such names. Generic-name examples and their behaviour are unchanged. Per OD-9 the candidate
files are `src/prompts/task-slug.spec.ts`, `src/prompt-core/slug-utils.spec.ts`,
`src/utils/heading-style.spec.ts`, `src/utils/output-validator.spec.ts`,
`src/utils/spec-count-parity.spec.ts` and `test/fixtures/golden/full-description-prompts.json`; impact
analysis confirms the set, and goldens are regenerated only for changed text with a reviewed diff.

**Failure path:** a remaining assertion of the legacy behaviour for a protected name is a defect of this
Story.

### FR-10: Name and slug length limits for protected names (OD-5)

For a protected name, verbatim outranks the 60-character name aim: a generated name containing the full typed
name is accepted at any length and is never shortened by removing a typed-name token. For the slug, trimming
toward the 100-character maximum may remove only tokens that are not part of the typed name's slugified form
and stops at the end of the typed-name slug tokens. Observable results: (a) if the full slug exceeds 100
characters but the typed name's slug alone is at most 100, the output slug is trimmed to at most 100 and still
contains the whole typed-name slug; (b) if the typed name's slug alone exceeds 100, the output slug is that
full typed-name slug with nothing trimmed from it, i.e. longer than 100. The slug trimmer spares the
typed-name tokens without `invariantCore` being edited (OD-6).

**Failure path:** a slug lacking any typed-name slug token because of trimming is an FR-5 violation.

### FR-11: Every store profile (AC-4)

FR-3, FR-4 and FR-6 hold for every store profile in `STORE_REGISTRY`. A per-store test iterates the
registry rather than naming stores, and uses each store's own locales and `officialBrands` (including the
two stores whose `officialBrands` is empty).

**Failure path:** a store whose locales lack the fixture's locale set is exercised with its own locales; no
store is skipped.

## Generated-HTML requirements (AGENTS.md §4)

### FR-12: H1/heading and `meta_title` criteria hold (AC-6)

> "SEO: meta_title ≤ 55 chars; meta_description ≤ 155, ends with CTA ➔. **No currency
> symbol** — price is not available at the Task B stage, and `task-b.ts` forbids inventing
> one; price/priceCurrency ship via Schema.org Offer microdata instead."

The existing H1/heading-form and `meta-title-template-shape` checks, including the 55-character
`meta_title` limit, still pass for Fixture A. `meta_description` limits and CTA ➔ are not relaxed.
`output-validator.ts`'s `meta-description-currency` rule stays disarmed (AGENTS.md §4).

**Failure path:** n/a, a regression guard; any failure of an existing check on Fixture A is a defect.

### FR-13: Number/unit spacing remains true

> "Space between number and unit: `1.75 mm`, `200 °C` (not `1.75mm`)."

Locale formatting of numbers and units inside a protected name keeps the space between number and unit.

**Failure path:** n/a, constrained by §4.

### FR-14: Unchanged §4 criteria stay true

The name change does not alter, and the regression run keeps passing:

> "Spec count on output = spec count on input. Don't change values or units."

> "Each image wrapped in a `<figure>` with a `<figcaption>` (figcaption sourced from the
> manifest caption). First image's `<img>` — without `loading="lazy"`; every subsequent one
> — with it; `decoding="async"` on all. […]"

> "**A video embed present in the input is present in the output.**"

> "Non-EN languages: no anglicisms ("друк" not "прінт", "ПЗ" not "софт")."

This applies to figures, video, spec-count parity and anglicism criteria; the Story adds no change to them.
The brand/model token preserved untranslated under FR-2 is a name, not an anglicism, and is not flagged as
one.

**Failure path:** n/a, regression guards.

## Non-functional requirements

- **NFR-1:** `systemBlocks` are not collapsed into `userContent` (AGENTS.md §3, prompt caching).
- **NFR-2:** No behaviour depends on the active provider (§3 Rule 1).
- **NFR-3:** Retrieval stays separate from generation (§3 Rule 2); the new check and classification use no
  search or page fetch.
- **NFR-4:** Locales and currency come from `STORE_REGISTRY` only; no store is named in a requirement or test.
- **NFR-5:** FR-1 and FR-5 are deterministic: no model call, no randomness, no wall-clock dependence.
- **NFR-6:** No secret reaches the browser bundle (§3 Rule 4); nothing here adds one.
- **NFR-7:** Verification (OD-8): AC-1 – AC-5 are verified by prompt-text assertions on the exported builders
  plus validator-level assertions (FR-5, both parts) on fixture outputs for every `STORE_REGISTRY` entry;
  live-model confirmation is recorded as manual release evidence. Enforcement per surface: names, H1, slugs
  and any text whose request carries the Product Name are deterministically checked (FR-5); Translator and
  Optimizer-without-Product-Name (AC-5), and the positive half of AC-3 beyond what FR-5's second part
  catches, are prompt-only and verified solely by prompt-text assertions.
  FR-5 is not a complete guarantee: part 2 does not detect a shortened form that lacks the typed name's last
  token (for example `Formlabs Form Studio 1`), does not scan brand-only typed names (no designator token), and
  does not scan surfaces outside its closed list.

## Out of scope

- Renaming or changing the Product Name input field, the store registry, or the model/provider set.
- Changing any other prompt behaviour (tone, structure, template schemas).
- Changing `invariantCore`; its under-capture of descriptor words such as `resin` stays (OD-6).
- Adding a Product Name input to Translator or Optimizer (OD-7).
- A positive "the name must appear" clause for AC-3 (OD-8), unless the human asks.
- Arming `meta-description-currency` or editing any FROZEN file not individually approved at the plan gate.
- Changing generic-name localization behaviour.

## Open questions

All non-blocking (`open_decisions_blocking: false`):

- **OD-3, OD-4, OD-5, OD-7, OD-8, OD-9** — operator-accepted defaults, carried as written in FR-2, FR-5,
  FR-7, FR-9, FR-10 and NFR-7.
- **OD-1, OD-2, OD-6** — resolved by Story v2, carried in FR-2, FR-4, FR-5.
- **OD-10** — resolved (sibling modules); residual: per-file §9 approval at the plan gate if a FROZEN prompt
  file needs editing.
- **OD-11** (how brand/model is detected), **OD-12** (H1 category vs `meta_title` canonicalizer), **OD-13**
  (token matching under number/unit formatting) — status OPEN in the decision log; the stated defaults are
  carried in FR-1, FR-4 and FR-5, not decided by this stage, and remain overturnable at HUMAN_SPEC_APPROVAL.
- AC-7 says the check covers "any generated H1"; for the Generator / UA Description H1 only the part 2
  altered-form scan applies (not the part 1 presence check), because OD-6 keeps heading short forms such as
  `Formlabs Form Studio 1`. This is narrower than AC-7's wording and is surfaced here for approval.
- Residual: if the typed name alone is 54 or more characters, the Story does not say how `meta_title` behaves;
  the existing rule is left as is.
- The Story's AC-3 can pass with output that never mentions the name (OD-8), and AC-5 cannot evaluate
  brand-vs-generic in Translator/Optimizer (OD-7); both are recorded limitations.

## Traceability matrix

| Acceptance criterion | Satisfied by | Notes |
|---|---|---|
| AC-1 | FR-2, FR-3 | Fixture A, exact substring |
| AC-2 | FR-2, FR-4 | OD-2, OD-12 default |
| AC-3 | FR-2, FR-5, FR-6 | uk-UA fan-out via Task C |
| AC-4 | FR-11 (FR-3, FR-4, FR-6 per store) | registry-driven test |
| AC-5 | FR-5, FR-7 | OD-7 limitation |
| AC-6 | FR-12, FR-13, FR-14 | regression guards |
| AC-7 | FR-1, FR-5 | classification gives the generic exemption |
| AC-8 | FR-8 | mocked LLM |
| AC-9 | FR-9 | OD-9 inventory |

FR-10 (OD-5 limits) supports AC-1 and AC-7 (a trimmed slug would break FR-3/FR-5) and is carried from an
operator-accepted default; FR-13 and FR-14 are the §4 criteria the Story's Scope says must not regress.

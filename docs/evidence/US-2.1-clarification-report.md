---
artifact: clarification_report
story: US-2.1
version: 2
status: ARCHIVED
owner: so-clarifier
created_at: 2026-09-19T00:00:00Z
updated_at: 2026-09-19T12:00:00Z
supersedes: docs/evidence/US-2.1-clarification-report.md#1
inputs_consumed:
  - key: story
    version: 1
  - key: open_decisions
    version: 1
  - key: clarification_report
    version: 1
open_decisions_blocking: false
---

# US-2.1 — Clarification Report

**Verdict: Ready for Specification.**

All eleven Open Decisions (`docs/decisions/US-2.1-open-decisions.md` v2) are settled and
`blocking: false`. v1 of this report returned **Not Ready** with 8 blocking decisions; the human
(sbruhov@gmail.com) answered all of them on 2026-09-19, and this revision records those answers.

**No Story amendment is required.** The two scope questions that could have forced one were
resolved as no-change: consumables stay out of scope (OD-6, matching the Story's existing
"Out of scope" section), and §7 conditional omission is a separate Story (OD-10 — AC-6 presuming
the specs section exists is an absence of the new behaviour, not a contradiction of it). The Story
text stands as written and was not edited by this run.

## Sources read
Story v1; `open_decisions` v1 and `clarification_report` v1 (this run supersedes both);
`AGENTS.md` (§3, §4, §9, §11); `README.md`; `STORE_REGISTRY` and `NUMBER_FORMAT_RULES` in
`src/prompt-core/constants.ts`; `.arch-guard-checksums`; `src/utils/number-format-fixer.ts`;
`docs/workflow/artifact-paths.yaml`, `artifact-schema.md`, `artifact-lifecycle.md`.

The human's written answers were supplied as an out-of-band input at
`C:\Users\works\AppData\Local\Temp\claude\C--Work-Content-Swiss-Knife\0b799f20-e9db-4598-b29c-8fc2db189725\scratchpad\US-2.1-human-decisions.md`.
It has no key in `artifact-paths.yaml`, so it is cited by path rather than recorded as a consumed
artifact.

## What the human settled

| OD | Decision | v1 → v2 |
|---|---|---|
| OD-1 | v4 is the whole delta; no v3 diff | non-blocking → settled |
| OD-2 | Dual support: `z.enum(['3.0','4.0'])`, renderer branches on version | **blocking → settled** |
| OD-3 | Service-side deterministic pattern index, hash over `name` + `website` | **blocking → settled** |
| OD-4 | Remove the array form; `value: z.string()`, model comma-joins | **blocking → settled** |
| OD-5 | Word ranges enforced for uk-UA only; translated output not length-validated | **blocking → settled** |
| OD-6 | Consumables OUT of scope — separate Story, no amendment | **blocking → settled** |
| OD-7 | One Story, explicitly confirmed; three implementation phases | **blocking → settled** |
| OD-8 | `task-a.ts` + `output-validator.ts` change; `task-c.ts` inspect; `task-b.ts` untouched | non-blocking → settled |
| OD-9 | Item counts by Zod; word volumes by prompt only; tests soft ±15% on rendered text | **blocking → settled** |
| OD-10 | FAQ trigger unchanged (supplemental content only); §7 omission out of scope | **blocking → settled** |
| OD-11 | Three separator groups; es-MX left to the spec as an explicit either/or | non-blocking → settled |

Two answers were factually impossible as first written and were corrected by a confirmed
follow-up before being recorded: OD-3's `hash(product.SKU)` (there is no SKU on `ProductInput`,
`src/app/types.ts:37-49` — the human confirmed hash over `name` + `website`), and OD-6's original
"in scope" for consumables (a separate domain model and renderer — the human then chose out of
scope). OD-5's "not validated OR ±30% tolerance" was narrowed by the human to **not validated**.

## What is clear (carried forward from v1, re-verified)
- Actor, trigger and value are stated (content operator; conform to the approved v4 standard).
- AC-1..AC-8 numbers match v4: hook 40–85 words and 2–4 values (§1), Killer Specs 90–300 words
  (§2), applications 80–250 (§4), CTA 50–100 words under H2 "Чому варто купити {name} в {store}?"
  (§8), package headings "Що в коробці?" / "Що входить до набору?" (§6), no manual `<h1>` (§0),
  FAQ 3–5 pairs of 2–4 sentences (§9).
- The Story's claim about the v4 changelog holds: "Журнал змін" is a contents entry only.
- Stores: "all of `STORE_REGISTRY`" agrees with the registry; no store outside it is named.
- AC-10's first-image-eager / rest-lazy, figure/figcaption and video rules agree with AGENTS.md §4.
  Comma-joining (AC-6) preserves row count, consistent with §4 spec-count parity.
- The FROZEN stop (AGENTS.md §9) is acknowledged in the Story; **no per-file approval exists yet**,
  and it is required before IMPLEMENTATION, not before SPECIFICATION.

## Locale scope
uk-UA is the native master and the **only** locale whose v4 word ranges are enforced (OD-5). The
uk-UA fan-out question v1 left open is answered: structure (H2/H3) is preserved in every locale,
but translated output is not word-count validated at all, so `task-translate` needs no numeric
range change. The v1 locale mismatches (pt-PT and ru-UA absent from the Story's Q5; IT in v4 but
in no store) no longer affect word counts; they survive only as separator rules under OD-11, where
the human's three groups cover every `STORE_REGISTRY` locale except es-MX.

## Generated-HTML, prompt and FROZEN impact
- AGENTS.md §4 criteria in play: no Schema.org Product; unit spacing; spec-count parity;
  figure/figcaption and lazy-loading; video survival; no `<br>` spacing; `<hr>` after each
  `</section>`; SEO meta rules untouched (`meta-description-currency` stays disarmed), which is
  consistent with OD-8 leaving `task-b.ts` alone.
- The FROZEN set is exactly five files per `.arch-guard-checksums`: `src/prompts/task-a.ts`,
  `src/prompts/task-b.ts`, `src/prompts/task-c.ts`, `src/prompt-core/master-system-prompt.ts`,
  `src/utils/output-validator.ts`. `src/prompt-core/constants.ts`, `src/utils/number-format-fixer.ts`,
  `src/prompts/task-faq.ts`, `src/prompts/task-a-doc.ts` and `src/domain/description-doc.schema.ts`
  are **not** frozen.
- `task-a-doc.ts` inherits from FROZEN `task-a.ts` via `buildPromptA`, so v4 rules that live in the
  shared builder require a §9-approved edit to `task-a.ts`. The Doc pipeline is live for every
  store in `DOC_PIPELINE_STORES`; the "NOT WIRED INTO PRODUCTION" header comment in `task-a-doc.ts`
  is stale and should not be read as scope relief.
- `render-reconciliation.report.md` §3 transforms (`fixNumberFormatting`, `normalizeTerminology`,
  `canonicalizeMultiInOne`) act on Doc prose and interact with AC-10 / OD-11; §5's renderer corpus
  gap (2 items, one product) remains a recorded limit the Story does not mention.

## Notes the specification must carry (all non-blocking)
1. **OD-2 × OD-4 interact.** Removing the array form from `SpecRow.value` unconditionally would
   reject the cached `'3.0'` documents that OD-2 exists to preserve. The removal is version-scoped;
   the Zod expression is an ARCHITECTURE_PLANNING call.
2. **AC-9's consecutive-pair clause is a test-design residual.** A deterministic hash gives even
   distribution, not a guarantee about consecutive products. The fixture batch and rotation window
   belong to `test_strategy` / `ac_test_matrix`.
3. **OD-9's per-field numbers must be restated explicitly** — `killerSpecs` 3–4 (AC-2) vs
   `applications.items` 4–8 (AC-3), and AC-3's missing minimum against v4's "6–8".
4. **OD-11 group 3 is a real code delta.** `constants.ts:495-496` currently gives de-DE / es-ES
   "thousands dot (or space)"; the decision fixes the non-breaking space, and pt-PT has no line
   today. `ua-translation-style-guide.spec.ts:49` asserts an exact substring of that block.
5. **es-MX** is the human's explicit either/or (assign it a group, or scope AC-10's separator
   clause). This skill does not choose; `constants.ts:499` already carries a dot/comma CLDR rule
   the spec writer may cite.
6. **Name the consumables files out of scope explicitly.** The Story's "Out of scope" names the
   simplified schemas, not `task-a-consumables-doc.ts` / `consumables-doc.schema.ts` /
   `renderConsumablesDoc`.
7. **§7 conditional omission must not appear in the specification** (OD-10, separate Story).

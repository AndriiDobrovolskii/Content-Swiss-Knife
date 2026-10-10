---
artifact: clarification_report
story: US-7.1
version: 2
status: ARCHIVED
owner: so-clarifier
created_at: 2026-10-09T00:00:00Z
updated_at: 2026-10-09T13:30:00Z
supersedes: docs/evidence/US-7.1-clarification-report.md#1
inputs_consumed:
  - key: story
    version: 2
  - key: open_decisions
    version: 2
open_decisions_blocking: false
---

# US-7.1 - Clarification Report (v2)

**Verdict: Ready for Specification.** No blocking Open Decision remains. Ten items are non-blocking (seven accepted defaults or
residuals, three new) and are logged in `docs/decisions/US-7.1-open-decisions.md` v2. This report supersedes v1, which was based on
Story v1.

## What changed since v1

Story v2 folds in the operator's answers. Resolved by the Story text (cited in the decisions file): OD-1 (hybrid brand/model-vs-generic
rule; only number/unit locale formatting allowed inside a protected name), OD-2 (full typed name outranks the added category in
`meta_title`), OD-6 (`invariantCore` untouched, new checks use the full typed name), OD-10 (sibling modules, FROZEN edits only on
per-file approval at the plan gate). OD-3, OD-4, OD-5, OD-7, OD-8, OD-9 are accepted with the v1 defaults. The Story's "Open questions"
section is gone; AC-8 and AC-9 are now in order; AC-7 now defines the slug comparison and the generic-name exemption.

## What is clear

- Actor, defect, expected result and reproduction; defect confirmed in `Knowledge/Issues/2/` (v1 evidence, unchanged).
- Store scope: all `STORE_REGISTRY` stores; fixture store `EXPERT3D` exists with `en-ES, es-ES, pt-PT, uk-UA`. No currency named.
  No registry conflict.
- Locale scope and uk-UA fan-out examined: Story declares all locales and that uk-UA is the master; Task A builds the uk-UA master and
  Task C translates the rest (AGENTS.md section 3), so a `task-a.ts`/master change reaches every locale; Slugs and SEO Meta are
  separate per-locale generators needing their own change. Not an open question.
- Generated-HTML impact: H1/body of the description. AGENTS.md section 4 criteria in play: `meta_title` <= 55 and the H1/heading
  criteria (AC-6), unit spacing and no anglicisms in non-EN (touched by the permitted number/unit formatting, OD-13). Spec-count
  parity, figure/figcaption and video survival are not disturbed by a name change; keep them in the regression run.
- Prompt impact and FROZEN status: `task-slug.ts`, `task-translate.ts`, `optimizer.ts`, `task-a-doc.ts`, `product-name-core.ts` and
  `slug-validator.ts` are not FROZEN. `task-a.ts`, `task-b.ts`, `task-c.ts`, `master-system-prompt.ts`, `output-validator.ts` are
  FROZEN; the Story avoids them by design and defers per-file approval to the plan gate (OD-10).
- Track: `prompt`, with validator work in `src/utils` assigned per task.

## What remains ambiguous (non-blocking Open Decisions)

| id | Topic | Status |
|---|---|---|
| OD-11 | How "brand or model identifier" is detected (brand source; bare number `1`; dimension `0.4 mm`; suffix `Pro`) | OPEN, default stated |
| OD-12 | Long H1 with category noun vs the `meta_title` canonicalizer in `seo-metadata-shape.ts` | OPEN, default stated |
| OD-13 | Token matching when number/unit locale formatting is permitted vs "exact substring" in AC-1/AC-2 | OPEN, default stated |
| OD-3, 4, 5, 7, 8, 9 | v1 defaults accepted by the operator | ACCEPTED DEFAULT |

OD-11 is the highest-risk item for the Specification and the spec reviewer: AC-7 needs a deterministic applicability condition, and
two plausible readings disagree on `Hardened Steel Nozzle 0.4 mm`. The decisions file gives a default a specification writer can state.

## Findings for the Story author (not Open Decisions; the Story is not edited by this stage)

- The fixture `Formlabs Form Studio 1 Resin Tank Pro` has no decimal, unit or stopword, so it does not exercise OD-3, OD-13 or the
  dimension case of OD-11; the Specification should add a second fixture with `1.75 mm` or `0.4 mm`.
- AC-3 can still pass with output that never mentions the name (OD-8 default; positive clause only if the human wants it).
- Translator and Optimizer receive no Product Name (OD-7), so the brand-vs-generic distinction cannot be computed for AC-5 there.

## Previous-run items

Carried forward, none dropped: OD-1..OD-10 from v1, each with a recorded status in the decisions file v2.

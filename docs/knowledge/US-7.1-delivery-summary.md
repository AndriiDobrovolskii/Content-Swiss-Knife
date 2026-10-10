---
artifact: delivery_summary
story: US-7.1
version: 1
status: ARCHIVED
owner: so-orchestrator
created_at: 2026-10-10T16:29:10Z
updated_at: 2026-10-10T16:29:10Z
supersedes: null
---

# US-7.1 delivery summary — the product name the operator typed stays intact in every mode and store profile

## What was delivered
Brand and model names typed by the operator (fixture `Formlabs Form Studio 1 Resin Tank Pro`) are no longer shortened,
reordered or translated by Slugs, SEO Meta, UA Description / Generator, Translator or Optimizer. A hybrid rule decides
what is protected: a typed name with a brand, a model identifier, or a number+unit is a protected proper name and no
token may be removed, reordered or translated (locale formatting of numbers and units is the only permitted change); a
generic name (for example `Hardened Steel Nozzle`) keeps the existing localization rules.

Concretely:
- New pure modules (no LLM, no retrieval): `src/utils/product-name-tokens.ts`, `protected-product-name.ts` (classifier;
  brand set derived from `STORE_REGISTRY` at call time), `product-name-preservation.ts` (report-only checks for Slugs and
  description surfaces), `protected-seo-name.ts` (SEO core-name selector, 54 code-point boundary),
  `src/prompt-core/protected-slug.ts` (protected slug trim that never drops name tokens) and
  `protected-name-block.ts` (dynamic `[PROTECTED PRODUCT NAME]` block).
- Prompts: Slugs rules and worked examples rewritten for protected names; Doc `localizedName`, Translator and Optimizer
  carry a verbatim-preservation rule; `PRODUCT_NAME_LOCALIZATION` leads with a protected-name precedence clause.
- Orchestrator: the dynamic block is added to `userContent` only (prompt-caching `systemBlocks` are passed by reference,
  untouched); the SEO Meta step has a repair gate that rejects shortened names with a retry; Slugs and description
  surfaces are validated report-only.
- FROZEN `src/prompts/task-c.ts` edited (commit `a37826a`, 14 lines: the descriptor-translation sentences replaced) under
  the recorded per-file AGENTS.md section 9 approval (F-1 / T15, HUMAN_PLAN_APPROVAL 2026-10-09T13:32:21Z);
  `.arch-guard-checksums` re-baselined in the same commit. No other frozen file changed.

Delivered by PR #138 (`feat/US-7.1-preserve-proper-product-names`), merged into `main` as merge commit `bd564ba` on
2026-10-10; delivery tip `b50569e` (plus docs commit `c6c1498`). T1..T15 one `feat(US-7.1 Tn)` commit each, test fixup
`c41d339`, status commits, delivery docs. Track: prompt.

## Acceptance criteria and how each was proven
Matrix: `docs/tests/US-7.1-ac-test-matrix.md` (its State-now / Green-by columns are a pre-implementation snapshot).
Reconciliation checked existence, naming and assertion for each row. Tests run under `npm run test:logic`.

| AC | Proof |
|---|---|
| AC-1 Slugs name and slug keep the typed name | `product-name-preservation.spec.ts`, `.stores.spec.ts`, `task-slug.spec.ts`, `content-orchestrator.protected-name-validation.spec.ts` |
| AC-2 SEO Meta h1 / meta_title keep it, meta_title <= 55 | `protected-seo-name.spec.ts`, `content-orchestrator.protected-name-repair-gate.spec.ts` |
| AC-3 UA Description / Generator has no altered form | `task-a-doc.spec.ts`, `task-c.spec.ts`, `protected-name-precedence.spec.ts`, validation spec |
| AC-4 holds for every `STORE_REGISTRY` store | `describe.each(STORE_REGISTRY)` in the wiring, repair-gate, validation and stores specs |
| AC-5 Translator / Optimizer keep the name | `task-translate.spec.ts`, `optimizer.spec.ts`, wiring and validation specs |
| AC-6 existing H1 / meta-title checks unchanged | repair-gate AC-6 guard, `content-orchestrator.repair-field-wiring.spec.ts`, unchanged validator specs |
| AC-7 deterministic check names the missing token | `protected-product-name.spec.ts`, `product-name-preservation.spec.ts` |
| AC-8 repair attempt on a shortened SEO set | repair-gate spec (premise test + repair attempt) |
| AC-9 legacy worked examples updated | rewritten `task-slug.spec.ts` worked-example checks |

## Gate results
- Quality gate at `fb335d8` (so-gate-enforcer): `npm run lint` clean; `test:logic` 175 files, 5176 passed, 3 skipped
  (pre-existing live probes); `test:components` 2 files, 32 passed; coverage 94 / 87.73 / 95.57 / 94.57
  (statements / branches / functions / lines), floors held, no threshold lowered; `npm run build` clean;
  `bash arch-guard.sh` exit 0; `npm run validate:harness` 0 errors.
- Implementation verification: PASS (Rule 2 verified by reading the diff, section 4 criteria, `STORE_REGISTRY` as sole
  source, prompt-caching block separation, FROZEN change with recorded approval and same-commit re-baseline).
- Security review: PASS, three non-blocking findings (F-1, F-2, F-3, below).
- Reconciliation: PASS, AC-1..AC-9.
- Human gates: spec v4 and plan approved; PR gate approved; READY_FOR_PR approved; COMPLETED approved after the merge
  was verified against the repository (`git merge-base --is-ancestor b50569e origin/main`).

## Process notes
- Story reached v2 (hybrid rule, OD-1 / OD-2 operator decisions); the specification reached v4.
- Commit `c41d339` corrected two test defects found after TEST_WRITING (tests only).
- The branch was created from `docs/US-6.2-archive`; that archive commit `120dcbc` merged separately as PR #137 before
  this PR, so PR #138 carried only US-7.1 commits.

## Open Decisions
Resolved by the operator: OD-1 (hybrid protected-name rule), OD-2 (full name outranks a localized category in
`meta_title`), OD-6 (`invariantCore` left untouched), OD-10 (sibling modules, FROZEN edits minimised).
Accepted defaults: OD-3, OD-4, OD-5, OD-7, OD-8, OD-9, OD-11, OD-12, OD-13.

## Follow-ups
- NFR-7 manual release evidence was NOT done: run the live model on `Formlabs Form Studio 1 Resin Tank Pro` for every
  store and confirm names, slugs, SEO meta, descriptions, translations and optimizer output keep the name verbatim.
- Slugs and description surfaces are report-only (violations surface as error findings; an automatic repair attempt runs
  only on SEO Meta). The Story wording ("fail") is stronger than the shipped enforcement; accepted in Spec v4.
- FR-5 part 2 blind spots, prompt-only: a shortened form lacking the last token (for example `Formlabs Form Studio 1`),
  brand-only names, surfaces outside the closed list. OD-7: the Translator cannot tell brand from generic.
- Security, non-blocking: F-1 the operator-typed name is interpolated into the `[PROTECTED PRODUCT NAME]` block without
  delimiter neutralisation; F-2 repair feedback echoes a slice of model output into the retry prompt without a length cap;
  F-3 no fetch/retrieval change (clear).
- Optional cleanups: misplaced docblock above `seoCoreNames()` in `content-orchestrator.service.ts`; the prompt sentence in
  `withProtectedNameFeedback` could move to `protected-name-block.ts`.

---
artifact: reconciliation_report
story: US-7.1
version: 1
status: APPROVED
owner: so-reconciliation-reviewer
created_at: 2026-10-09T00:00:00Z
updated_at: 2026-10-09T00:00:00Z
inputs_consumed:
  - {key: story, version: 2}
  - {key: specification, version: 4}
  - {key: ac_test_matrix, version: 1}
  - {key: test_generation_report, version: 2}
  - {key: verification_report, version: 1}
  - {key: security_review, version: 1}
---

# US-7.1 Reconciliation Report (branch feat/US-7.1-preserve-proper-product-names, ac03ac6..fb335d8; stacked US-6.2 commit 120dcbc out of scope)

Verdict: PASS. Every AC-1..AC-9 clears all three levels. The residual risks below are limitations that the Story, Spec v4 (OD-7, OD-8, NFR-7) and the operator-accepted decisions explicitly allow; they are surfaced for the human gate, not gaps. This PASS is not human approval (AGENTS.md section 10).

## Evidence (real runs, read-only)

- `npx vitest run` on the 19 files named by the matrix plus `src/prompts`, `src/utils/product-name*`, `protected*`, `src/prompt-core/protected*`, `src/services/content-orchestrator.protected*`: 38 files, 1097 tests, 1097 passed.
- All 19 named spec files exist. No `.skip`, `.todo`, `.only`, `xit`, `xdescribe` in any. `toBeTruthy()/toBeDefined()` occurs only in `repair-strategy.spec.ts` (5) and the repair-gate spec (1); in neither is it the sole assertion of an AC row.
- Test bodies read: task-slug.spec (AC-1 prompt half, AC-9), repair-gate spec (AC-2, AC-8, AC-6 guard), validation spec (AC-1, AC-3, AC-5, AC-7 wiring), preservation spec (AC-1, AC-2, AC-7), task-translate / optimizer / task-a-doc specs (AC-3, AC-5 prompt text).

## Three-level check per criterion

L1 = matrix row. L2 = named test opened and found. L3 = body read; a violation would fail it.

| AC | L1 | L2 | L3 | Why L3 holds / what is enforced |
|---|---|---|---|---|
| AC-1 | yes | yes | yes | Deterministic: `checkNameSurfaces` rejects the observed es-ES/pt-PT names and slugs (`...-form-studio-1-pro`), names the missing tokens `Resin`/`Tank`, rejects reordered, translated and span-trimmed forms; the per-store `generateSlugs()` test asserts the finding in every locale and that a compliant set keeps `formlabs-form-studio-1-resin-tank-pro` in every slug; the FR-10 trimmer test asserts slug <= 100 and still containing the typed slug. Prompt-only: the model actually emitting the name (worked examples and composition-rule carve-out, asserted from the built prompt text). Slugs mode is report-only by Spec FR-3 (no repair), so "every locale's name contains" is guaranteed only as a reported error, not as a forced outcome. |
| AC-2 | yes | yes | yes | Repair-gate test (mock returns shortened set, then compliant): 2 SEO calls, shipped h1 and meta_title contain the fixture, meta_title <= 55 code points, no `Form Studio 1 Pro` in any field. Category-drop rule pinned at the 53/54/55 boundary (`seoCoreName`) and through the real Slugs-then-SEO pipeline. Prompt-only: the live model honouring the typed name on first pass; repair success is shown against the mocked model, live behaviour is manual release evidence (NFR-7). |
| AC-3 | yes | yes | yes | Deterministic half: part 2 altered-form scan over H1, headings, paragraphs, list items, CTA, figcaption, in the master and in every Task C translation per locale, per store, error-level, report-only (no extra model call asserted). Prompt half: Doc `localizedName` rule, static precedence clause reaching master and all Task C branches, contradictory Task C sentences removed (12 branches), goldens. Prompt-only: the positive half (every mention carrying the model designator contains the full name) beyond what part 2 catches; the OD-8 guard test confirms no positive "must appear" clause was added, as the Spec requires. |
| AC-4 | yes | yes | yes | `describe.each` over the registry (7 stores) in wiring, repair-gate, validation and stores specs; locales via `getLangsForStore`; the classifier test derives the brand set from `STORE_REGISTRY` and covers the two empty-`officialBrands` stores. No store is named in an assertion. |
| AC-5 | yes | yes | yes | Translator: verbatim brand/model sentence asserted in all 10 language instructions plus the unknown-label fallback; generic by design (no `[PROTECTED PRODUCT NAME]`, OD-7); dynamic text kept out of cached blocks. Optimizer: task-block sentence asserted, block wrapping asserted in the wiring spec, and the deterministic check fires when `[Product Name]` is supplied (altered name -> error in `validationIssues()`; full name and generic name raise nothing; no name -> no finding). Prompt-only by Spec: Translator, and Optimizer without `[Product Name]` (OD-7). |
| AC-6 | yes | yes | yes | Guard: compliant Fixture A set per store has no error finding, meta_title <= 55, meta_description <= 155 ending with the CTA, no currency symbol; FR-5 and the existing validators (`validateSeoMetadata`, `validateSeoMetadataShape`) agree; attached and spaced number-unit forms are equal. Existing H1/heading and template-shape specs unchanged and green. |
| AC-7 | yes | yes | yes | Classifier fixtures A/B/C, number+unit precedence, 3D exemption, empty store brands; violation `detail` asserted to contain `Resin` and `Tank`; generic and empty names asserted exempt; wired through `generateSlugs()`, `generate()`, `generateUaContent()` and Optimizer into the validation path (asserted via `validationIssues()`). |
| AC-8 | yes | yes | yes | The premise test proves today's validators accept the shortened set (so the new rule is what rejects it); repair attempted (2 calls, `repairsUsed` 1); repair feedback judged on the appended part only (names the rule, `Resin`, the OD-2 priority, `systemBlocks` by reference); failure paths: still-shortened -> error findings in `finalIssues` and `validationIssues()`, HTTP 429 and unparseable JSON -> not shipped clean. Both new rule ids registered full-regen-only in `repair-strategy.spec.ts`. |
| AC-9 | yes | yes | yes | The three base worked examples are parsed out of the built prompt: every locale name keeps every input token in order, every slug contains the slugified input; enrichment example guard; carve-out text in the composition rules; generic-name behaviour unchanged (3 tests plus a byte-for-byte trimmer guard). OD-9 inventory spot-checked: remaining `Bambu Lab`/`Nozzle` strings in `slug-utils.spec.ts` and `heading-style.spec.ts` test utility functions, not model-name localization, so they do not assert the legacy behaviour; goldens regenerated and pinned by the golden spec. |

## Drift from the approved Specification v4

- Requirements dropped: none found. FR-1..FR-14 each map to an implementation and tests via the matrix and support rows; the verification report maps all 36 non-doc changed files to T1..T15.
- Behaviour changed during coding: none found.
- Scope added: none; checked against Out of scope by name (no `invariantCore` edit, no Product Name input for Translator/Optimizer, no positive "name must appear" clause, `meta-description-currency` still disarmed; the only FROZEN file touched is `task-c.ts` with recorded F-1 approval and same-commit re-baseline per the verification report).
- Criterion reinterpreted: none silently. The weaker enforcement below is explicit in Spec v4 and operator-accepted.

## Where the Story wording is stronger than the enforcement (carried by Spec v4, for the human gate)

1. AC-1/AC-3/AC-7 say outputs "fail"; on Slugs and description surfaces this is a reported error-level finding only (FR-3, FR-6, FR-8 scope), with a repair attempt only on SEO Meta (AC-8).
2. AC-1..AC-5 prompt-only halves: the live model following the prompt is not provable in unit tests; NFR-7 records manual release evidence for it.
3. AC-3 positive half and the FR-5 part 2 blind spots (shortened form lacking the last token, e.g. `Formlabs Form Studio 1`; brand-only names; surfaces outside the closed list) are prompt-only (NFR-7).
4. AC-7 says "any generated H1"; for the Generator/UA Description H1 only part 2 applies (Spec open question, OD-6). Narrower than the Story wording and already flagged for approval.
5. AC-5 Translator cannot distinguish brand from generic (OD-7); stated limitation.

No Story error found; `story_drift` not needed.

## Non-blocking findings

- N1: the matrix "State now" / "Green by" columns are the pre-implementation snapshot (RED, RED (import)); every referenced test is now green. Stale labels only; the matrix was not edited by this reviewer.
- N2: AC-2/AC-8 repair success is proved against a mocked second response, which is the intent of AC-8; it does not show that a live model repairs correctly.
- N3: verification-report findings 1 (misplaced docblock) and 2 (prompt sentence in the service layer) and security F-2 (cap `form` length in repair feedback) remain optional cleanups, none an AC gap.

## Checklist

- [x] Every AC-n processed.
- [x] Level 2 by opening files.
- [x] Level 3 by reading bodies.
- [x] No toBeTruthy-only or skipped test backs a criterion.
- [x] FR-n dropped check done.
- [x] Out of scope checked by name.
- [x] No reinterpreted criterion.
- [x] No loop-back needed.
- [x] PASS is not human approval.

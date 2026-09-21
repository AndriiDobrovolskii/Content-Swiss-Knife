---
artifact: pipeline_status
story: US-2.1
version: 5
status: DRAFT
owner: so-builder
stage: IMPLEMENTATION
created_at: 2026-09-20T22:10:00Z
updated_at: 2026-09-22T18:00:00Z
supersedes: docs/catalog/US-2.1-pipeline-status.md#4
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 2
  - key: open_decisions
    version: 2
  - key: impact_analysis
    version: 1
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
  - key: plan_review
    version: 2
  - key: test_strategy
    version: 3
  - key: ac_test_matrix
    version: 3
  - key: reconciliation_report
    version: 1
open_decisions_blocking: false
---

# Pipeline Status — US-2.1: Migrate product descriptions to the v4.0 UA content schema

**Verdict at v5: `PASS`.** IMPLEMENTATION attempt 3 of 3. All carried-forward work authorised by the
human decisions in `docs/workflow/history.jsonl` (2026-09-22T15:00:00Z and 17:00:00Z) is delivered in
two commits. v4's `BLOCKED` (B2) and the N9 conflict are closed. This revision supersedes v4;
sections of v4 describing B1, FR-14, N2/O4 sites 1-5 and NB-2 (commits `270caa7`, `7c32265`,
`50ead2a`) remain accurate and unchanged.

## 1. Commits this attempt

| Commit | What |
|---|---|
| `43c8d49` | B2 - `master-system-prompt.ts` [STYLE & GEO] opener rule realigned to the invariant start, under the AGENTS.md section 9 per-file grant; `.arch-guard-checksums` rebaselined in the SAME commit. |
| `dabade7` | N2/O4 sites 6 and 7 - `doc-prose-transforms.ts` and `consumables-prose-transforms.ts` now pass `locale` to `fixNumberFormatting` (FR-16: uk-UA preserves thousands grouping). |

Explicit pathspecs were used on both commits; the sanctioned US-1.1 rollback staged in the index was
not swept in. No test file, fixture, coverage threshold or other FROZEN file was touched.

## 2. B2 - what changed, and the fourth sweep

The [STYLE & GEO] first bullet no longer instructs the copula formula
`[Product] is a [Category] designed for [use-case]`. It now says the first sentence states what the
product is and what it is best for, keeps the global unformulaic fluff-opener ban and verifiability
proviso, and scopes the INVARIANT START to section 1's opening sentence only by cross-reference to
[CONTENT STRUCTURE] clause 1 (one authority, no restatement). This is the replacement text put to the
approver in v4 section 6. Note: the grant message renders the dash as ASCII `-`; the invariant start's
dash is U+2014 per AC-2 and `:217`, and the cross-reference inherits it rather than restating it.

`git diff .arch-guard-checksums` is one line: `master-system-prompt.ts` only. `bash arch-guard.sh`
afterwards: ALL CHECKS PASSED.

**Fourth sweep** over [STYLE & GEO] (`:145-201`, read bullet by bullet), [FORMAT] (`:459-end`) and the
brand/naming clauses. Findings:
- No `[BRAND / NAMING]` block exists in `master-system-prompt.ts`. Brand/naming rules live in the
  `PRODUCT_NAME_LOCALIZATION` constant (`constants.ts`, not frozen) and the `BRAND LOGIC` step at
  `:366`; neither states an opening form (grep for `designed for`, `[Category]`, `first sentence`,
  `Open with` over both files: the only remaining hits are `:217-220`, the invariant start itself).
- No third clause of the reversed-opening shape remains in [STYLE & GEO] or [FORMAT].
- **Adjacent, not the same shape (N12):** [FORMAT] says "Reserve `<strong>` for brands / main model /
  core USPs; use `<b>` for inline spec scannability", while the invariant start wraps the product
  name in `<b>`. `:217` is explicit and more specific, so I read it as controlling; it is a tag
  preference, not an opening-form contradiction, and no edit was made. Flagged for reviewer.

## 3. N2/O4 - complete (7 of 7)

Sites 1-5 were done in v4. Sites 6 (`doc-prose-transforms.ts:156`) and 7
(`consumables-prose-transforms.ts:97`) now call `fixNumberFormatting(text, '', locale)`. A stale
header comment in `doc-prose-transforms.ts` that said the function "strips thousands separators" was
corrected in the same hunk. The three previously red tests are green (spec files updated by
TEST_WRITING at `2775aec`). N9 and N10 are closed. N11 is confirmed by the human: the hook validator
stays strict on `<b>` and rejects `<strong>`; no change.

## 4. Measured state (run after the final commit)

| Check | Result |
|---|---|
| `npx vitest run` (`test:logic`) | 122 files passed; 2812 passed, 3 skipped (2815), 0 failed |
| `npm run test:components` | 1 file, 4 passed, exit 0 |
| `npm run lint` (`tsc --noEmit`) | clean, exit 0 |
| `bash arch-guard.sh` | ALL CHECKS PASSED (all frozen files unchanged vs. baseline) |
| `npm run test:coverage` | exit 0; global 91.94 / 85.79 / 94.12 / 92.54, all thresholds met |

## 5. Findings

| # | Finding | Disposition |
|---|---|---|
| B2 | Reversed copula formula in [STYLE & GEO] | CLOSED (`43c8d49`) |
| N9, N10 | uk-UA thousands grouping conflict / HTML vs Doc divergence | CLOSED (`dabade7`) |
| N11 | Hook validator strict on `<b>` | CONFIRMED intended, no change |
| N12 | [FORMAT] `<strong>`-for-main-model vs invariant start's `<b>` | NEW, non-blocking, unedited |
| NB-1 | AC-1 opening form has no assertion in the suite | Standing; for RECONCILIATION (builder may not write tests) |
| NB-3 | Prose-only reversed rules invisible to numeral sweeps | Fourth sweep done; none remain |
| N1-N8, F1, F5 | Carried forward, untouched | Standing |

## 6. Hygiene

`workflow-state.yaml` and `history.jsonl` not written. Nothing pushed; no PR. Tasks T1-T13 remain
DONE as recorded in v2.

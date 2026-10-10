---
artifact: implementation_report
story: US-7.1
version: 1
status: ARCHIVED
owner: so-gate-enforcer
stage: QUALITY_GATE
created_at: 2026-10-09T22:00:00Z
updated_at: 2026-10-09T22:00:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 2
  - key: implementation_plan
    version: 1
  - key: task_breakdown
    version: 1
  - key: ac_test_matrix
    version: 1
  - key: pipeline_status
    version: 2
---

# Implementation Report - US-7.1 (preserve proper product names)

Gate outcome: **PASS** - six of six commands green; real output in `docs/verification/US-7.1-quality-gate-report.md`.
Test counts: test:logic 175 files / 5176 passed / 3 skipped (5179); test:components 2 files / 32 passed.
Coverage 94 / 87.73 / 95.57 / 94.57 (stmts / branch / funcs / lines), all floors held.

## Tasks (15; per pipeline_status v2, all DONE)
| Task | Track | Commit | Main files |
|---|---|---|---|
| T1 tokenisation | angular | ac03ac6 | `src/utils/product-name-tokens.ts` |
| T2 classifier | angular | 1bcc724 | `src/utils/protected-product-name.ts` |
| T3 preservation checks | angular | bb6f0c5 | `src/utils/product-name-preservation.ts` |
| T4 SEO core name | angular | 0c22e07 | `src/utils/protected-seo-name.ts` |
| T5 protected slug trim | prompt | 32320fc | `src/prompt-core/protected-slug.ts` |
| T6 protected-name block | prompt | 12c56dd | `src/prompt-core/protected-name-block.ts` |
| T7 repair-strategy entries | angular | f6762dc | `src/utils/repair-strategy.ts` |
| T8 precedence clause | prompt | 8dd783b | `src/prompt-core/constants.ts` |
| T9 Slugs prompt | prompt | 223e454 | `src/prompts/task-slug.ts` |
| T10 Doc prompt | prompt | 077685e | `src/prompts/task-a-doc.ts` |
| T11 Translator + Optimizer | prompt | fac6a40 | `src/prompts/task-translate.ts`, `src/prompts/optimizer.ts` |
| T12 wrap payloads | angular | 2d2fcf6 | `src/services/content-orchestrator.service.ts` |
| T13 SEO gate + seoCoreName | angular | 184073f | same |
| T14 report-only validation + slug trim | angular | 365b50e | same |
| T15 Task C inline sentences (FROZEN, F-1 approved) | prompt | a37826a | `src/prompts/task-c.ts`, `.arch-guard-checksums`, `test/fixtures/golden/full-description-prompts.json` |

Follow-ups: dcca9e5 and fb335d8 (status docs); c41d339 (TEST_WRITING fix of test defects F1/F2, tests only; resolved).
The only FROZEN file edited by US-7.1 is `task-c.ts`, under the recorded per-file section 9 approval.

## AC coverage (from `ac_test_matrix` v1; every named spec is part of the green 175-file run)
- AC-1 slugs/names: `product-name-preservation.spec.ts`, `product-name-preservation.stores.spec.ts`, `task-slug.spec.ts`, `content-orchestrator.protected-name-validation.spec.ts`.
- AC-2 SEO: `protected-seo-name.spec.ts`, `content-orchestrator.protected-name-repair-gate.spec.ts`, preservation spec.
- AC-3 descriptions: `task-a-doc.spec.ts`, `task-c.spec.ts`, precedence-clause spec, validation spec.
- AC-4 all stores: `content-orchestrator.protected-name-wiring.spec.ts` and the `describe.each(stores)` blocks in the gate, validation and stores specs.
- AC-5 Translator/Optimizer: `task-translate.spec.ts`, `optimizer.spec.ts`, wiring and validation specs.
- AC-6 no regression: gate AC-6 guard, `content-orchestrator.repair-field-wiring.spec.ts`, existing validator specs (unchanged, green).
- AC-7 classifier: `protected-product-name.spec.ts`. AC-8/AC-9: see matrix rows (repair gate; legacy prompt specs rewritten by TEST_WRITING).
Whether each test genuinely asserts its criterion is `so-reconciliation-reviewer`'s call.

## Not verified here
Rule 2 and AGENTS.md section 6.6 runtime rules (`so-implementation-verifier`); security (`so-security-reviewer`).

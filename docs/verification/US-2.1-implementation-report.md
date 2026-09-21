---
artifact: implementation_report
story: US-2.1
version: 3
status: ARCHIVED
owner: so-gate-enforcer
created_at: 2026-09-21T20:30:00Z
updated_at: 2026-09-23T13:00:00Z
supersedes: docs/verification/US-2.1-implementation-report.md#2
inputs_consumed:
  - key: story
    version: 1
  - key: implementation_plan
    version: 2
  - key: task_breakdown
    version: 2
  - key: ac_test_matrix
    version: 4
  - key: pipeline_status
    version: 6
open_decisions_blocking: false
---

# US-2.1 Implementation Report (v3)

Aggregated view for downstream review stages. HEAD `53a8f29`; 35 commits on the branch ahead
of `main`; 48 files changed in `main...HEAD` (10503 insertions, 125 deletions, including docs).
Gate outcome and raw output: `docs/verification/US-2.1-quality-gate-report.md` (v3).

## Gate outcome

| # | Command | Result |
|---|---|---|
| 1 | `npm run lint` | PASS (tsc --noEmit, 0 errors) |
| 2 | `npm test` | PASS - logic 122 files / 2828 passed, 3 skipped; components 1 file / 4 passed |
| 3 | `npm run test:coverage` | PASS - All files 91.97 / 85.84 / 94.12 / 92.57; per-dir floors held (exit 0) |
| 4 | `npm run build` | PASS - 3 known CommonJS warnings only |
| 5 | `bash arch-guard.sh` | PASS - exit 0; master-system-prompt.ts checksum changed under a recorded section 9 approval, re-baselined in the same commits |
| 6 | `npm run validate:harness` | PASS |

arch-guard does not cover Rule 2, and the section 6.6 runtime rules are unchecked here; both
belong to so-implementation-verifier.

## What was built, per task (from commit history)

| Task | Commit | Change |
|---|---|---|
| T1 | `0622de6` (fixtures) | `'3.0'` baseline document fixtures in `test/fixtures/v4-docs.ts` |
| T2 | `761c371` | v4 code-resident heading table in `src/prompt-core/constants.ts` |
| T3 | `3c91582` | `schemaVersion` widened to `'4.0'`, version-guarded refinement (`src/domain/description-doc*.ts`), `'4.0'` fixtures |
| T4 | `f30e85a` | CTA heading resolver in `src/prompt-core/store-render-rules.ts` |
| T5 | `33a2a66` | `renderDescription` branches on `schemaVersion` for section 2 and section 9 |
| T13 | `38e0b04` | section 6 package contents rendered as `<ol>` for `'4.0'` |
| T6 | `a2e973a` | `src/prompt-core/hook-pattern.ts` deterministic selector |
| T7 | `3bd1873` | v4 contract in `TASK_A_DOC_INSTRUCTION`, hook pattern in `userContent` |
| T8 | `53b80a5` | orchestrator selects and passes the hook pattern |
| T9 | `b656dce` | `NUMBER_FORMAT_RULES` group 3 corrected, `pt-PT` added |
| T10 | `d993fee` | locale-aware `number-format-fixer` (FR-16 groups) |
| T11 | `33adf2a`, `8b34852` | v4 section 9 numbers and FAQ section numbering in `task-faq.ts` |
| T12 | `85ebaa3`, `270caa7`, `43c8d49` | FROZEN master-system-prompt.ts edited under section 9 approval (five negative invariants, invariant start, opener alignment) |
| fixes | `7c32265`, `50ead2a`, `dabade7` | locale passed to `fixNumberFormatting` at production call sites; hook rejected without invariant start |
| tests | `2ddecf7` | v4 schema rejection branches covered (V16); +16 logic tests, no implementation change |

## Files changed (non-docs, vs main)

Source: `src/domain/description-doc.ts`, `description-doc.schema.ts`; `src/prompt-core/constants.ts`,
`hook-pattern.ts`, `master-system-prompt.ts` (FROZEN), `store-render-rules.ts`;
`src/prompts/optimizer.ts`, `task-a-doc.ts`, `task-faq.ts`; `src/render/consumables-prose-transforms.ts`,
`doc-prose-transforms.ts`, `render-description.ts`; `src/services/content-orchestrator.service.ts`;
`src/utils/number-format-fixer.ts`, `seo-number-format.ts`; `.arch-guard-checksums`.
Tests: `src/domain/description-doc.schema.v4.spec.ts`, `src/prompt-core/{hook-pattern,master-system-prompt.v4,number-format-rules.v4,v4-headings}.spec.ts`,
`src/prompts/{optimizer,task-a-doc,task-a-doc.v4,task-faq.v4}.spec.ts`,
`src/render/{consumables-prose-transforms,doc-prose-transforms,doc-schema-issues.v4,render-description.v4}.spec.ts`,
`src/services/content-orchestrator.hook-pattern.spec.ts`,
`src/utils/{heading-style.v4,number-format-fixer.v4,structural-parity.v4}.spec.ts`,
`test/fixtures/v4-docs.ts`, `test/render-conformance.v4.spec.ts`.
Not touched: `vitest.config.ts`, `arch-guard.sh`, `task-a.ts`, `task-b.ts`, `task-c.ts`, `output-validator.ts`.

## AC to test coverage (from ac_test_matrix v4; files exist and are in the green run)

| AC | Principal test files |
|---|---|
| AC-1 | `task-a-doc.v4.spec.ts`, `master-system-prompt.v4.spec.ts`, `render-description.v4.spec.ts` |
| AC-2 | `render-description.v4.spec.ts`, `description-doc.schema.v4.spec.ts` |
| AC-3 | `render-description.v4.spec.ts`, `description-doc.schema.v4.spec.ts`, `v4-headings.spec.ts`, `master-system-prompt.v4.spec.ts`, `test/render-conformance.v4.spec.ts` |
| AC-4 | `task-a-doc.v4.spec.ts`, `description-doc.schema.v4.spec.ts`, `test/render-conformance.v4.spec.ts` |
| AC-5 | `render-description.v4.spec.ts`, `description-doc.schema.v4.spec.ts`, `v4-headings.spec.ts` |
| AC-6 | `description-doc.schema.v4.spec.ts`, `task-a-doc.v4.spec.ts`, `test/render-conformance.v4.spec.ts` |
| AC-7 | `v4-headings.spec.ts`, `master-system-prompt.v4.spec.ts`, `task-a-doc.v4.spec.ts` |
| AC-8 | `render-description.v4.spec.ts`, `test/render-conformance.v4.spec.ts`, `task-faq.v4.spec.ts` |
| AC-9 | `hook-pattern.spec.ts`, `content-orchestrator.hook-pattern.spec.ts` |
| AC-10 | `test/render-conformance.v4.spec.ts`, `number-format-rules.v4.spec.ts`, `number-format-fixer.v4.spec.ts`, `doc-prose-transforms.spec.ts`, `consumables-prose-transforms.spec.ts` |
| AC-11 | `description-doc.schema.v4.spec.ts`, `doc-schema-issues.v4.spec.ts`, `test/render-reconciliation.spec.ts`, `structural-parity.v4.spec.ts`, `heading-style.v4.spec.ts`, `optimizer.spec.ts` and others |

Whether each named test genuinely asserts its AC is so-reconciliation-reviewer's check, not this stage's.

## Note

Unrelated working-tree changes (uncommitted revert of US-1.1 CORS: `server/index.js`, `.env.example`, deleted
`server/cors-policy.js`, `test/cors-policy.spec.ts`, US-1.1 docs) exist outside HEAD. They are
not part of US-2.1 and should be resolved before any commit or PR. See quality_gate_report.

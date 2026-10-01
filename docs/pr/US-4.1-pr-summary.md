---
artifact: pr_summary
story: US-4.1
version: 1
status: ARCHIVED
owner: so-pr-preparer
created_at: 2026-10-01T00:00:00Z
updated_at: 2026-10-01T00:00:00Z
supersedes: null
inputs_consumed:
  - key: implementation_report
    version: 2
  - key: quality_gate_report
    version: 2
  - key: verification_report
    version: 2
  - key: security_review
    version: 2
  - key: reconciliation_report
    version: 2
open_decisions_blocking: false
---

# Drafted Pull Request - US-4.1

> **Not opened.** This is drafted content only. `so-pr-creator` opens the Pull Request, and
> only on a separate explicit instruction. Approving `HUMAN_PR_APPROVAL` did not carry that
> approval (AGENTS.md section 10).

## Title

```
feat(models): add Sonnet 5.5 and Gemini 3.8 Flash as defaults, retire Sonnet 4.6
```

## Body

```markdown
Closes US-4.1 - Add Claude Sonnet 5.5 and Gemini 3.8 Flash as selectable models, make them the defaults, and retire Sonnet 4.6.

## What changed

Claude Sonnet 5.5 (Deep slot) and Gemini 3.8 Flash (Fast slot) are now catalog models and the shipped defaults, on both the client and the server fallbacks. Sonnet 4.6 is removed from the selectable list; a stored 4.6 selection migrates to Sonnet 5.5 and a stored `max` level restores as `xhigh`. Pricing covers Sonnet 5.5 exactly and Gemini 3.8 Flash by date (boundary 2027-01-01T00:00:00Z). The Anthropic provider shapes `thinking` from catalog capability and never sends effort `max` to a model that does not list it.

## Why

The previous defaults (Sonnet 5, Gemini 3.7 Flash) were superseded, and Sonnet 5.5 has no `max` level and rejects sampling parameters, so the request shape and level ladder had to follow the catalog rather than assumptions. See Specification v3 (`docs/specifications/US-4.1-spec.md`).

## How the acceptance criteria were verified

| AC | Verified by | Result |
|---|---|---|
| AC-1 | `src/prompt-core/model-catalog.spec.ts` (FR-1/FR-2 exact levels, ceilings, no `max`); `model-settings.component.spec.ts` (slider sizing) | pass |
| AC-2 | `model-catalog.spec.ts` (4.6 absent, others unchanged); component and service specs | pass |
| AC-3 | `src/services/model-settings.service.spec.ts` (default snapshot); `test/gemini-provider.spec.ts`; `test/llm-routes.spec.ts` | pass |
| AC-4 | `test/anthropic-provider.spec.ts`; `test/gemini-provider.spec.ts` (slot-less calls) | pass |
| AC-5 | `test/pricing.spec.ts` (exact rates, own entry) | pass |
| AC-6 | `test/pricing.spec.ts` (both sides of the date boundary) | pass |
| AC-7 | `model-settings.service.spec.ts` (migration, persistence, level clamps); `test/llm-routes.spec.ts` | pass |
| AC-8 | `test/anthropic-provider.spec.ts` (no sampling params at all five levels; thinking shape; never effort `max`) | pass |
| AC-9 | `test/active-docs-models.spec.ts` (README, `.env.example`, AGENTS.md) | pass |
| AC-10 | Quality gate (lint, tests, coverage, build, arch-guard); no unit test by design | pass |

Full matrix: `docs/tests/US-4.1-ac-test-matrix.md`
Reconciliation: every criterion cleared existence, naming and assertion checks.

## Test plan

Real commands, real results - carried from the quality gate report v2 (HEAD 6664e89).

- [x] `npm run lint` - clean (tsc --noEmit, exit 0)
- [x] `npm test` - 150 logic files / 4054 passed / 3 skipped (live-probe cases needing a real proxy); 2 component files / 32 passed
- [x] `npm run test:coverage` - global 92.95% statements, 93.4% lines; global and per-directory floors held, no threshold lowered
- [x] `npm run build` - clean (3 known pre-existing non-ESM warnings)
- [x] `bash arch-guard.sh` - exit 0, frozen checksums unchanged
- [ ] `npm run validate:harness` - n/a, harness untouched in `main..HEAD`

## Rules checked that nothing automates

- **Architecture Rule 2** (retrieval separate from generation): verified by reading the full diff of `server/providers/anthropic.js`, `gemini.js` and `model-support.js`; the changes are request-shaping helpers only and touch no retrieval, fetch or search path.
- **AGENTS.md section 4 criteria in play**: none; no prompt, renderer, schema or validator file changed.
- **FROZEN files**: none changed; `.arch-guard-checksums` untouched, no re-baseline needed.

## Security

No blocking or non-blocking findings requiring action. Observations: O1 (introduced, harmless) inherited-property lookup in `RETIRED_MODELS` on a self-controlled localStorage string; O2 (introduced, informational) unknown model ids degrade to a safe wire shape instead of being rejected, intentionally; O3 (pre-existing) unrestricted `cors()`; O4 (pre-existing) the single `bypassSecurityTrustHtml` pipe. No secret reaches bundle, response or logs; `.env.example` carries placeholders only.

## Notes for the reviewer

- Spec v3 narrowed Sonnet 5.5 to five levels with no `max`; `max` clamps to `xhigh` on client, server, route resolver, settings restore and provider. `LEVEL_ORDER` keeps `max` deliberately.
- `#effort` substitutes `xhigh` for any Anthropic model whose catalog lacks `max` (broader than FR-11's wording, harmless today).
- The `claude-sonnet-4-6` price entry is retained deliberately (OD-4 / FR-15) so historical usage rows still price.
- Non-blocking reconciliation notes: FR-4 prose is stale about which models list `max`; the AC-9 doc test scans only README, `.env.example` and AGENTS.md; 3.7 and 3.8 rates are identical so protection is a dedicated exact-match branch.
- `.env.example` changed values and comments only; no setting was added or renamed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Pre-flight record

| Check | Result |
|---|---|
| All four upstream reports opened, verdict `PASS` | Yes: quality gate v2, verification v2, security v2, reconciliation v2 all PASS |
| Quality gate has real output for all six commands | Yes: five with real output, sixth recorded NOT_APPLICABLE with the diff evidence |
| No unresolved blocking security finding | Yes: none blocking |
| Every `AC-n` cleared all three reconciliation levels | Yes (AC-10 by the gate) |
| Commits contain only what `task_breakdown` named | Yes: 12 commits T1-T9, T11-T13; T10 verification-only, no commit |
| No fixup-run, no `--no-verify`, no phase batching | Yes: no fixup run, no `--no-verify` mention, one Story |
| Frozen-file change has same-commit re-baseline | N/A: no frozen file changed |
| No secret in any commit, including removed ones | Yes: only placeholders in the diff; no `.env` file |
| `.env.example` current with placeholders | Yes |

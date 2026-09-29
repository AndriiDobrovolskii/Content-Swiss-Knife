---
artifact: delivery_summary
story: US-3.1
version: 1
status: ARCHIVED
owner: so-orchestrator
created_at: 2026-09-29T17:33:11Z
updated_at: 2026-09-29T17:33:11Z
supersedes: null
---

# US-3.1 delivery summary — QA gate: brand-core fixes and a repair gate that actually blocks

## What was delivered
The repair gate now blocks ungrounded content instead of failing open, and the brand-core /
heading-form rule conflict no longer makes repairs oscillate. Concretely: grounding retries with
hard-block after exhaustion (no silent fallback); `heading-product-name-stuffing` respects the blessed
position; the brand-core invariant extends to the CTA-heading position; `meta_title` follows one
approved template with no site-name suffix, including a deterministic long-h1 fallback; `h1` and
`meta_title` are never byte-identical per locale; `doc-schema` and `slug-name-designator-lost` findings
are dispatched through `REPAIR_STRATEGIES` ladders that are reachable in production (missing fields
retried, fresh regeneration attempts get their own ladder pass). Late additions: a JSON-envelope guard
on field-scoped repair results with one bounded retry (D16), a clip that lands exactly on a word
boundary keeps its last complete word (D17), and `cta.heading`'s non-empty requirement is
`schemaVersion`-conditional — required for 3.0, not for 4.0 (D18, FR-14/AC-7).

Delivered by PR #129 (`feat/US-3.1-qa-gate-brand-core-fixes`), merged into `main` at
2026-09-29T17:30:32Z as merge commit `209627b`; pushed tip `f8905db` (37 commits). Track: angular.

## Acceptance criteria and how each was proven
Full matrix: `docs/tests/US-3.1-ac-test-matrix.md` (v7). Reconciliation (v4, PASS) confirmed AC-1..AC-7
for matrix row, existing named test and a real assertion. AC-7 exists only in Specification v20 (added
to stop repair attempts being spent on a discarded field); the Story file lists AC-1..AC-6 and was not
amended, by the approver's decision.

| AC | Criterion | Proven by |
|---|---|---|
| AC-1 | Grounding retries with backoff; hard-block after exhaustion; no silent fallback | T2–T6 specs (see matrix) |
| AC-2 | `heading-product-name-stuffing` respects the blessed-position exemption | T7/T8 specs |
| AC-3 | Brand-core invariant covers the CTA-heading position | T7/T8 specs, `repair-strategy.spec.ts` |
| AC-4 | `meta_title` single approved template, no site-name suffix | T9/T10/T15/T17 specs incl. `seo-metadata-shape.long-h1.spec.ts` |
| AC-5 | `h1` and `meta_title` never byte-identical per locale | T9/T10/T12 specs |
| AC-6 | `doc-schema` / `slug-name-designator-lost` ladders, reachable in production | `repair-gate.spec.ts` (T1/T11/T13/T14/T16), orchestrator doc-gate and repair-field-wiring specs |
| AC-7 | `cta.heading` non-empty is `schemaVersion`-conditional | `description-doc.schema.v4.spec.ts` (4.0 empty/absent/null pass; 3.0 fails at `cta.heading`) |

## Gate results (quality gate v5, re-run on the committed tree)
lint (`tsc --noEmit`) exit 0; `npm test` 149 logic files / 3945 passed / 3 skipped, plus 2 component
files / 23 passed; coverage global 92.92 / 87.47 / 94.26 / 93.4; build clean; `arch-guard.sh` pass;
`validate:harness` pass. Implementation verification (v4), security review (v4, N1–N3 non-blocking)
and reconciliation (v4) all PASS.

## Open Decisions
OD-1..OD-9 were RESOLVED before or during planning, including the §9 authorizations for the FROZEN
`task-b.ts` (OD-3, OD-7) and OD-9. OD-8 was accepted as a tradeoff. **Deferred:** OD-10 (non-blocking)
— fixing the line-49 `h1`-identity collision can itself trip the ceiling; the general-row case is
closed by D15, the de-DE band only partially. The FR-14(a) wording does not literally settle a
*missing* `cta.heading` key for 4.0; the plan lets both empty and missing pass (approved), and a
one-line Specification clarification was recommended but not made.

## FROZEN files
Changed in T8 (`1c02c89`: `task-a.ts`, `master-system-prompt.ts`) and T10 (`3d89c86`: `task-b.ts`) with
`.arch-guard-checksums` re-baselined in the same commits. The §9 approvals are cited in commit messages
and the Open Decisions log; **no durable approval record was found in the pipeline status**, and this
was flagged for the PR reviewer.

## Known residuals
D17's separator class also matches interior `-`, `.` and `,` (accepted); D16 discards a legitimate
repaired value starting with `{` or `[` (accepted risk 14); block-repaired HTML reaches the accepted
SafeHtml surface at more points (security N1); the PR body says 36 commits, the branch had 37.
The T13–T15 specs were committed after their production code (`a16ddbd`, `4a7f806`).

## Not part of this delivery
No server, prompt, renderer, or store-registry change beyond the FROZEN edits above; no new setting
(`.env.example` unchanged).

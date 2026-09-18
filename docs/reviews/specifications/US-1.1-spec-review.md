---
artifact: specification_review
story: US-1.1
version: 1
status: APPROVED
owner: so-spec-reviewer
created_at: 2026-09-18T00:00:00Z
updated_at: 2026-09-18T00:20:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 1
  - key: open_decisions
    version: 1
open_decisions_blocking: false
---

# Spec Review: US-1.1 — Restrict proxy CORS to an allow-list

**Verdict:** PASS
**Loop-back:** n/a

> A `PASS` here is **not** human approval. Approval is recorded only by `/so:approve`
> (AGENTS.md §10).

## Summary

The Specification is buildable as written. Every acceptance criterion traces to a requirement
that genuinely satisfies it, and FR-5 correctly preserves the fail-closed property that is the
whole point of the Story. Three non-blocking findings, all about edge cases the Specification
leaves to the implementation rather than about anything it gets wrong.

## 1. Acceptance-criterion coverage

Re-derived from the Story, not read back from the Specification's own matrix.

| AC | Story says | Satisfied by | Verdict |
|---|---|---|---|
| AC-1 | listed `Origin` → `Access-Control-Allow-Origin` echoing that exact origin | FR-1 (reads the list), FR-2 (exact echo) | covered |
| AC-2 | unlisted `Origin` → no header; not an error status | FR-3 | covered — FR-3 explicitly forbids a `403`, which matches the user's stated choice |
| AC-3 | no `Origin` → unaffected; `GET /health` still `200` | FR-4 | covered |
| AC-4 | unset → `http://localhost:3000` only; must not allow all | FR-5 | covered, and FR-5's failure path names the exact mis-implementation |
| AC-5 | `.env.example` documents it with a placeholder | FR-7 | covered |

Requirements tracing to no acceptance criterion: **FR-6 (preflight)**.

Assessed and **accepted, not scope creep**: FR-6 constrains the same header behaviour AC-1 and
AC-2 already describe, applied to the request type a browser sends first. The clarification
report explicitly recommended stating it rather than leaving it implied. Recorded here so the
non-mapping is a visible decision rather than an oversight.

The three NFRs map to no AC, which is expected — they are constraints, not behaviours the
Story asked for.

## 2. Non-verifiable language

One finding.

- **NFR-3** — "Behaviour for every existing endpoint is otherwise unchanged."
  - A test would have to invent: what "otherwise unchanged" covers. There is no new assertion
    that could fail this; it is verified only by the pre-existing suite continuing to pass.
  - **Non-blocking.** That is a legitimate way to verify a no-regression constraint, but the
    Specification should say so, so `so-test-writer` records "verified by the existing suite"
    rather than writing a vacuous new test to satisfy it.

FR-1 through FR-7 are each falsifiable by a concrete assertion. Spot-checked the weakest
candidates: FR-1's whitespace/empty handling, FR-5's exact one-entry default, and FR-7's
"no real deployed URL in the repository" — all checkable.

## 3. Contradictions with the Story

None. Scope tables compared directly: surface, out-of-scope list and the fail-closed
requirement all match the Story word for word. The Specification sharpens (FR-6, FR-1's
whitespace handling) without changing what was asked for.

## 4. Scope creep

- *Out of scope* section present and non-empty: **yes**, and it repeats the Story's four
  exclusions rather than quietly dropping one.
- FR-6 assessed in axis 1 and accepted.
- Nothing else in the Specification is outside what the Story asked for.

## 5. Missing edge cases, boundaries and failure paths

| Area | Checked | Finding |
|---|---|---|
| FR failure paths | yes | All seven FRs state one, or state why none exists. |
| Locale fan-out (uk-UA master) | yes | Not applicable — no generation path. Correctly stated. |
| Store scope vs `STORE_REGISTRY` | yes | Not applicable — no store, locale or currency involved. |
| §4 invariants | yes | Not applicable — no generated HTML. |
| Provider behaviour | yes | Not applicable — no provider call path changes. |
| Empty / boundary inputs | yes | **Two findings below.** |

**Finding 5a — trailing slash on a configured origin (non-blocking).**
Matching is exact string equality (FR-2). A browser sends `Origin: http://localhost:3000`
without a trailing slash, so an operator who configures `http://localhost:3000/` gets a value
that **silently never matches** — the proxy appears configured and blocks everything. The
Specification does not say whether entries are normalised. It should either require
normalisation or state that exact match is deliberate; leaving it unstated makes it an
implementation coin-flip.

**Finding 5b — empty `Origin` header (non-blocking).**
FR-4 covers a request with **no** `Origin`. A request carrying `Origin:` with an empty value is
addressed by neither FR-3 nor FR-4 explicitly. Low practical risk, but it is the kind of gap
that gets decided silently at implementation time.

## 6. Compliance with AGENTS.md

| Check | Result |
|---|---|
| §4 criteria quoted verbatim where in play | Not applicable — none in play, correctly stated rather than omitted |
| §9 FROZEN-file impact named | Yes — "none in scope" |
| §3 Rule 4 (secrets) | Addressed by NFR-2 and FR-7: placeholder only, no real URL in the repository |
| §3 Rule 5 (no feature broken) | Addressed by NFR-3, subject to finding 2 above |
| §3 Rule 2 (retrieval separate) | Not applicable — this changes a header policy, not a call path |
| §11 blocking Open Decisions | None. OD-1 is non-blocking and correctly carried into the Specification's Open questions |
| No implementation design leaked | **Borderline, non-blocking** — see below |

**Finding 6a (non-blocking).** FR-3's and FR-5's failure paths name specific
mis-implementations ("not a thrown error, a `403`, or a middleware that aborts"; "reads the
variable, finds it empty, and skips configuring `origin`"). Strictly this is
implementation-aware for a document that should state *what*, not *how*. Accepted here because
both describe a **behaviour** that would violate the criterion, and FR-5's in particular is the
exact failure the Story exists to prevent — naming it is what stops it being re-introduced.
Recorded so the precedent is deliberate rather than a habit.

## Verdict rationale

`PASS` rather than `CHANGES_REQUIRED`: none of the three findings blocks implementation or
testing. Each identifies an edge case the implementation will decide, and each is now visible
to the planner and the test writer, which is what a review is for. Nothing traces to a defect
in the Specification's substance, and no acceptance criterion is unsatisfied or reinterpreted.

`CHANGES_REQUIRED` was considered for finding 5a and rejected: the Specification is not wrong
about trailing slashes, it is silent, and the planner can resolve it without re-approving the
Specification. If the plan resolves it by *changing* the matching semantics rather than by
normalising input, that would warrant returning here.

## Non-blocking findings

1. **NFR-3 is verified by the existing suite, not by a new assertion** — the Specification
   should say so, so no vacuous test is written to satisfy it.
2. **Trailing-slash normalisation is unspecified (5a)** — a configured origin with a trailing
   slash would silently never match. The plan must decide: normalise, or document exact match.
3. **Empty `Origin` header is unaddressed (5b)** — low risk, but currently an implicit
   implementation decision.
4. **Two FR failure paths are implementation-aware (6a)** — accepted deliberately, recorded so
   it does not become a habit.

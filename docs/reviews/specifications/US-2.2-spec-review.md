---
artifact: specification_review
story: US-2.2
version: 1
status: APPROVED
owner: so-spec-reviewer
created_at: 2026-09-21T17:00:00Z
updated_at: 2026-09-21T13:59:30Z
supersedes: null
inputs_consumed:
  - key: story
    version: 1
  - key: specification
    version: 1
  - key: open_decisions
    version: 3
open_decisions_blocking: false
---

# Spec Review: US-2.2 — Add simplified v4 content-template schemas and update the Content Template dropdown

**Verdict:** PASS
**Loop-back:** n/a

> A `PASS` here is **not** human approval. Approval is recorded only by `/so:approve`
> (AGENTS.md §10).

## Summary

The Specification covers all sixteen acceptance criteria, folds every human Resolution (OD-1..OD-4, OD-9, OD-11..OD-14) in faithfully, quotes the AGENTS.md §4 criteria verbatim, and carries a non-empty Out of scope. Its weak points are the six still-open non-blocking decisions (OD-5..OD-8, OD-10, OD-15), which it declines to resolve; these are recorded below and travel with the PASS.

## 1. Acceptance-criterion coverage

Matrix re-derived from the Story, not read back from the Specification.

| AC | Story says | Specification satisfies it via | Verdict |
|---|---|---|---|
| AC-1 | four options, order, no empty option, Full default, both forms | FR-1 | covered |
| AC-2 | EN/UA labels via uiLabels; `consumables-resin` gone | FR-2 | covered (OD-10 wording open) |
| AC-3 | Filaments: 1,2,4,5,7,8; no 3/6/9 | FR-3, FR-7 | covered |
| AC-4 | Accessories: 1,2,3,5,7,8; no 4/6/9 | FR-4, FR-7, FR-9 | covered |
| AC-5 | Spare parts: only 1,5,8 | FR-5, FR-7 | covered (OD-7 open) |
| AC-6 | Full byte-identical to pre-Story | FR-6, NFR-6 | covered (OD-5 open) |
| AC-7 | single-table §7, no h3, prompt states it | FR-8 | covered |
| AC-8 | §5 only with compatibility data | FR-10 | covered |
| AC-9 | Accessories checkbox, visibility and prompt effect | FR-9 | covered (OD-6 open) |
| AC-10 | shared v4 rules (hook, CTA, no h1) | FR-12 | covered |
| AC-11 | schema optional 2,3,4,6,7,9; rejects missing 1/8 | FR-17, FR-18 | covered |
| AC-12 | v4 beats legacy limits | FR-13 | covered |
| AC-13 | legacy removal | FR-20 | covered |
| AC-14 | 5500 soft ceiling, v4 priority, all three templates | FR-15, FR-19 | covered |
| AC-15 | §7 omitted when specs empty | FR-11 | covered |
| AC-16 | ceiling does not reject; v4 range violation rejects | FR-14, FR-16 | covered |

Requirements tracing to no acceptance criterion: FR-18 (renderer) and FR-19 (translation) are consequences of AC-11/AC-14 and of human Resolutions OD-2/OD-4; FR-21..FR-25 are §4 restatements, declared as constraints. None is invented scope.

## 2. Non-verifiable language

- **FR-14** — "Rejection uses the validator's existing error semantics as far as OD-15 is unresolved; no silent acceptance of an out-of-range paragraph."
  - A test would have to invent: what "rejected" observably means (error severity, repair, retry). Acknowledged by OD-15; non-blocking.
- **FR-3** — "How stray model output containing an excluded paragraph is handled is not specified by the Story and is not invented here."
  - A test can only assert the built prompt, not generated output. Acceptable, matches AC-3 wording ("the built prompt").
- **FR-2** — "the build or a test fails" as a failure path is not a runtime behaviour; a test would have to invent the mechanism. Minor.

No other unbounded phrasing found.

## 3. Contradictions with the Story

- FR-15 counts paragraph 3 (Accessories) toward the 5500 ceiling; Story AC-14 lists only §1, §2, §4, §5, §8. This follows the human resolution OD-12 ("Paragraph 3 ... DOES count"), so it is a sharpening, not a contradiction. Flagged for visibility only.
- FR-14 adds a FAQ range (150–400) and a compatibility range (30–100) that Story AC-12 does not list; both come from OD-11 (human). Consistent with settled inputs.
- No silent rewording of scope found; scope tables compared directly (stores all, locales uk-UA master, surface, FROZEN, HTML).

## 4. Scope creep

- Out of scope section present and non-empty: yes (seven items, four from the Story plus three added and consistent with it).
- FR-14 lists a FAQ range although no simplified template requests §9 (dead requirement, acknowledged in the text via OD-11). Non-blocking.

## 5. Missing edge cases, boundaries and failure paths

| Area | Checked | Finding |
|---|---|---|
| FR failure paths | every FR carries one | Clear; FR-3/4/5 defer stray-output handling to nothing, in line with the Story |
| Locale fan-out (uk-UA master → derived locales) | FR-19, Scope | Clear: master-only length rules, translation preserves omissions, no length limit on derived locales |
| Store scope vs STORE_REGISTRY | Scope, NFR-4 | Clear: no store, locale or currency named beyond the registry; both generation paths stated (OD-1) |
| §4 invariants that must survive | FR-21..FR-25 | Clear: spec-count parity, figure/figcaption, first-image-eager, video survival, meta fields, HTML-only all addressed |
| Provider behaviour (retry, timeout, 429, malformed JSON) | NFR-2; FR-14 | Not specified; the change adds no provider call, and rejection routing is deferred to OD-15. Non-blocking |
| Empty / boundary inputs | FR-10, FR-11, FR-17, FR-18 | Empty specs, no compatibility data, absent optional paragraphs covered; Spare parts without compatibility is OD-7 (open); no-images/no-video boundary only implicit in FR-22/FR-23 |

## 6. Compliance with AGENTS.md

| Check | Result |
|---|---|
| §4 criteria in play quoted **verbatim** and cited, not paraphrased | Yes. FR-21, FR-22 (both figure bullets), FR-23, FR-24, FR-25 checked against AGENTS.md lines 203-233; they match. The video-figure bullet (line 222) is not quoted, see non-blocking findings |
| §9 FROZEN-file impact named and acknowledged | Yes: task-a.ts, task-c.ts, output-validator.ts named, OD-9 approval cited, §9 stop and re-baselined checksums noted (NFR-7) |
| §3 architecture rules not violated — incl. Rule 2, review-only | Yes: NFR-1 (block separation), NFR-2, NFR-3 (retrieval out of generation), NFR-5 |
| §11 no blocking Open Decision left unaddressed | Yes: open_decisions_blocking false; OD-1..4 and OD-11 resolved and reflected |
| No implementation design leaked in | Mostly clear. FR-20 and FR-8 name types/paths (from OD-2/OD-13/OD-14 human resolutions), and FR-14 names the validator location (OD-3); all are human-mandated, not invented |

## Verdict rationale

All six axes are clear. Every remaining gap is an open Open Decision the Specification correctly leaves unresolved and marks non-blocking; none makes a criterion untestable at the level the Story states it. CHANGES_REQUIRED is not warranted, and no loop-back target applies. The human should look at OD-5, OD-6, OD-7 and OD-15 at approval time, since the plan will otherwise have to choose.

## Non-blocking findings

- OD-5 (Full-description `templateId` identity) directly affects AC-6 byte-identity and the Customize panel; the plan must not pick a value that sends `task-a.ts` down the `CONTENT_TEMPLATES.find` branch.
- OD-7: AC-5 and AC-8 conflict for Spare parts with no compatibility data; FR-5 makes no claim.
- OD-6: Accessories checkbox default and SEO-only behaviour undefined; user-visible.
- OD-15: whether hard ranges reach Full description, and "rejected" semantics; FR-14 is currently untestable at the severity level.
- FR-14 includes a FAQ range with no simplified template requesting §9 (dead requirement).
- FR-22/FR-23 do not quote the AGENTS.md video-figure bullet ("Video iframes (YouTube/Vimeo) wrapped in `<figure>` ..."); consider adding it to FR-23 since video survival is preserved.
- FR-2's failure path ("the build or a test fails") describes tooling rather than behaviour.
- Word-count measurement on the legacy HTML path (Expert-3DPrinter) for FR-14 is not stated.

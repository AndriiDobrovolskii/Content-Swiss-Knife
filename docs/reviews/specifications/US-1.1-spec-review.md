---
artifact: specification_review
story: US-1.1
version: 2
status: APPROVED
owner: so-spec-reviewer
created_at: 2026-09-18T00:00:00Z
updated_at: 2026-09-18T15:00:00Z
supersedes: docs/reviews/specifications/US-1.1-spec-review.md#1
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 2
  - key: open_decisions
    version: 2
open_decisions_blocking: false
---

# Spec Review: US-1.1 — Restrict proxy CORS to an allow-list

**Verdict:** PASS
**Loop-back:** n/a

> A `PASS` here is **not** human approval. Approval is recorded only by `/so:approve`
> (AGENTS.md §10).

## Summary

Specification version 2 corrects the framing the `story_drift` loop-back existed to remove, and
it does so **without moving a single normative requirement** — verified by diff, not accepted
from the writer's claim. Every acceptance criterion still traces to a requirement that genuinely
satisfies it, the Out-of-scope section now names both open request-execution paths, and OD-1 is
restated as a question rather than answered. Nothing blocks; six non-blocking findings travel
with this `PASS`, four of them carried forward from version 1 because the requirement text they
were written against is byte-identical.

## 0. Re-run check — did the requirement surface move?

This is the finding the re-run turned on, so it is evidenced rather than asserted.

`git diff -- docs/specifications/US-1.1-spec.md` produces exactly four hunks:

| Hunk | Region | Change |
|---|---|---|
| `@@ -1,19 +1,19 @@` | front matter | `version` 1→2, `status` `APPROVED`→`DRAFT`, `updated_at`, `supersedes`, three `inputs_consumed` versions 1→2 |
| `@@ -35,8 +35,14 @@` | Background | ¶2 rewritten; a new ¶3 added on what wildcard CORS does *not* control |
| `@@ -105,6 +111,14 @@` | FR-6 | one paragraph **appended** after the existing text; heading and ¶1–¶2 untouched |
| `@@ -122,26 +136,58 @@` | Out of scope → end | Out-of-scope bullet replaced by a two-path exclusion; OD-1 restated; traceability matrix rewritten |

**No hunk touches FR-1, FR-2, FR-3, FR-4, FR-5, FR-7, or NFR-1 through NFR-3.** Their count,
numbering and normative text are byte-for-byte identical to version 1. The writer's claim is
verified.

The one change landing *inside* a numbered requirement is the paragraph appended to FR-6, so it
was tested rather than assumed non-normative. Its only behavioural clause — "an unlisted origin's
preflight receives no `Access-Control-Allow-Origin`" — restates FR-6 ¶1 in substance. The rest
("the browser aborts the exchange, and the actual request is never sent") is a claim about
**browser** behaviour, not a proxy obligation, and asserts nothing a test of this repository's
code could fail. It therefore adds no assertable obligation: **the already-built implementation
and the existing tests in `test/cors-policy.spec.ts` are unaffected by the v1→v2 delta.** See NBF-6 on
how that paragraph should be read by `so-test-writer`.

The Story's own delta was checked the same way: `git diff -- docs/stories/US-1.1-proxy-cors-allowlist.md`
produces no hunk over the Scope table or the **Acceptance criteria** section, so AC-1 through AC-5
are byte-for-byte unchanged and the matrix below re-derives against the same criteria as version 1.

## 1. Acceptance-criterion coverage

Re-derived from Story v2's criteria, not read back from the Specification's own matrix.

| AC | Story says | Specification satisfies it via | Verdict |
|---|---|---|---|
| AC-1 | listed `Origin` → `Access-Control-Allow-Origin` echoing that exact origin | FR-1 (reads and parses the list), FR-2 (exact echo, not `*`, not the whole list), FR-6 (same on the preflight) | covered |
| AC-2 | unlisted `Origin` → no header, browser blocks the response; not an error status | FR-3 (header omitted, request processed, `403`/abort explicitly forbidden), FR-6 (same on the preflight) | covered — subject to NBF-5 |
| AC-3 | no `Origin` → unaffected; `GET /health` still `200` | FR-4, which names the `200` and the exact mis-implementation that would break the health check | covered |
| AC-4 | unset/empty → `http://localhost:3000` **only**; must not fall back to allowing every origin | FR-5, including the "unset, empty, or only empty entries" boundary and an explicit ban on `*`/disabling the middleware | covered |
| AC-5 | `.env.example` documents it with a placeholder and a format comment; no real URL in the repo | FR-7 | covered |

Requirements tracing to no acceptance criterion (scope creep): **none.** FR-6 was the untraced
row at version 1; it is now traced — assessed in §1a.

The three NFRs map to no AC, which is expected: they are constraints on the change, not
behaviours the Story asked for.

### 1a. Routed item 2 — is FR-6 → AC-1/AC-2 sound?

**Sound. Judged, not assumed.**

AC-1 and AC-2 are both written against *"a request carrying an `Origin` header"*. That phrase
names a class of requests by a property of the request, not by method or by route. A CORS
preflight is an `OPTIONS` request that carries an `Origin` header, so it is a member of that class
**as the criteria are literally written** — it was always inside their subject, and neither
criterion carves it out. FR-6 does not extend AC-1 or AC-2; it specialises FR-2 and FR-3 onto a
subclass those criteria already cover, and says so in its own words ("subject to FR-2 and FR-3
identically"). Tracing it to both is therefore more accurate than leaving it untraced.

This is a **strengthening** of the version 1 review, not a reversal of it. Version 1 assessed FR-6
as "not scope creep" while recording that it mapped to no criterion; version 2 names the criteria
that already contained it. Both readings reject scope creep; v2's is the better-grounded one.

One consequence of the new trace edge is not free, and it is recorded as **NBF-5** below: tracing
FR-6 to AC-2 imports AC-2's second sentence — *"The request is not rejected with an error status"* —
into preflight behaviour, and FR-6 states no positive status for an unlisted origin's preflight.

## 2. Non-verifiable language

Each quoted, not summarised.

- **NFR-3** — "Behaviour for every existing endpoint is otherwise unchanged — this Story adds a
  header policy, not a routing or payload change."
  - A test would have to invent: what "otherwise unchanged" ranges over. No new assertion can
    fail this; it is discharged only by the pre-existing suite continuing to pass.
  - **Non-blocking, carried forward unchanged from version 1** (NBF-1). The requirement text did
    not move, so the finding did not either.
- **FR-6 ¶3 (new)** — "the browser aborts the exchange, and the actual request is never sent."
  - A test would have to invent: a real browser. This is rationale about user-agent behaviour,
    not an obligation on the proxy. Recorded as **NBF-6** so it is not mistaken for a testable
    clause.

FR-1 through FR-7 are otherwise each falsifiable by a concrete assertion. The weakest candidates
were spot-checked again at v2: FR-1's whitespace/empty-entry handling, FR-5's exact one-entry
default, FR-7's "no real deployed URL appears anywhere in the repository" — all checkable.

## 3. Contradictions with the Story

**None found.** Scope tables compared directly, and the amended narrative compared clause by
clause.

| Story v2 | Specification v2 | Match |
|---|---|---|
| Stores `none`; Locales `none`; Surface `server/index.js`, `.env.example`, `test/`; FROZEN `no`; generated HTML `no` | Stores `none — infrastructure only`; Locales `none`; Track `server`; FROZEN "none in scope" | consistent; the Specification adds `track: server`, which the Story's front matter already declares |
| Outcome: withholds CORS response headers; no third-party page can *read* a response; no *preflighted* cross-origin request succeeds from an unlisted origin | Summary + Background ¶2, in the Story's own wording | consistent |
| Context ¶3: wildcard CORS does not control whether a request reaches the proxy | Background ¶3, verbatim in substance | consistent |
| Out of scope: request execution, split into non-browser clients and CORS-simple browser requests, deferring credit spend to OD-1 | Out of scope, same two-path structure, with `AC-3` correctly re-expressed as `FR-4` | consistent |

### 3a. Routed item 1 — is any residue of the rejected v1 framing left?

**No residue.** Checked by re-reading every narrative section and by grepping the document for the
v1 vocabulary (`spend`, `credit`, `drive`, `successfully`, `visitor`, `execute`/`execution`).

- The v1 Background sentence RECONCILIATION rejected — *"any page a user visits can drive that
  user's browser to call the proxy successfully and spend the owner's API credits"* — is **gone**,
  replaced by the response-reading + preflight claim Story v2 makes.
- Every surviving occurrence of "spend"/"credits"/"execute" is inside Out-of-scope or OD-1, where
  it describes what this Story **does not** do. That is the corrected framing, not residue of the
  rejected one.
- One wording note, deliberately **not** raised as a finding so a later reader does not re-open
  it: the Summary's *"rather than accepting every origin"* is a verb inherited from version 1. Its
  object is "origin", not "request" — what a CORS configuration accepts is an origin *into the
  list* — and the very next sentence fixes the mechanism unambiguously ("an origin not on it
  receives no CORS headers at all, so the browser blocks the response"). It makes no
  request-execution claim, so it is not the shape RECONCILIATION rejected.

## 4. Scope creep

- *Out of scope* section present and non-empty: **yes**, and materially stronger than at v1 — it
  now enumerates both open paths instead of only the non-browser one, which is the defect that
  produced the loop-back.
- No requirement in the Specification is outside what Story v2 asks for. FR-6 assessed in §1a and
  accepted, now with a criterion behind it.
- Nothing crept in with the amendment: the only text added inside a requirement is FR-6's rationale
  paragraph (§0), and it imposes nothing new.

## 5. Missing edge cases, boundaries and failure paths

| Area | Checked | Finding |
|---|---|---|
| FR failure paths | yes | All seven state one, or state why none exists (FR-2: "none. A listed origin always matches."). FR-6 states none of its own — see NBF-5. |
| Locale fan-out (uk-UA master → derived locales) | yes | Not applicable: the Specification names no locale and no generation path, and its Scope records `Locales: none`. |
| Store scope vs `STORE_REGISTRY` | yes | Not applicable: the Specification names no store, locale or currency anywhere, and its Scope records `Stores: none — infrastructure only`. Nothing here reads or should read the registry. |
| §4 invariants that must survive | yes | Not applicable: no generated HTML is touched — no prompt, schema, renderer or validator is in scope. Correctly stated rather than omitted. |
| Provider behaviour (retry, timeout, 429, malformed JSON) | yes | Not applicable: NFR-3 holds the call path unchanged; this adds a response-header policy in front of it. |
| Empty / boundary inputs | yes | **Three findings — NBF-2, NBF-3, NBF-5.** |

**NBF-5 — an unlisted origin's preflight has no stated success status (new at v2).**
Tracing FR-6 to AC-2 imports AC-2's *"The request is not rejected with an error status"* into
preflight behaviour. FR-6 inherits the prohibition by reference to FR-3 (no thrown error, no
`403`, no aborting middleware) but names **no positive status** for the `OPTIONS` response an
unlisted origin receives. It is left to the implementation whether the CORS middleware answers the
preflight itself or the request falls through to the framework's default `OPTIONS` handling, and
AC-2's "not rejected with an error status" is the constraint that would bind either way — now that
the matrix asserts FR-6 → AC-2. Nothing is broken today: the shipped wiring is
`cors({ origin: … })`, whose default `preflightContinue: false` answers the preflight itself with
`204`. This is spec-level silence, newly reachable because of the v2 matrix change, and it is the
finding this re-run earns.

**NBF-2 — trailing slash on a configured origin (carried forward from v1, now inverted).**
FR-1's normative text states only that surrounding whitespace is ignored and empty entries
discarded; matching is exact string equality (FR-2). Version 1 flagged that an operator configuring
`http://localhost:3000/` would get a proxy that looks configured and silently matches nothing, and
called it an implementation coin-flip. The coin has since landed: `server/cors-policy.js`
(`resolveAllowedOrigins`) strips a single trailing `/` from each configured entry. **The code is now
ahead of the Specification on exactly the behaviour v1 predicted.** Non-blocking — the stripping
applies to configured entries only, the incoming `Origin` is still matched exactly, so it cannot
widen the allow-list beyond intent — but a re-record is the moment to bring FR-1's text level with
the shipped behaviour.

**NBF-3 — an empty `Origin` header (carried forward from v1, decided in code).**
FR-4 covers a request with **no** `Origin`; a request carrying `Origin:` with an empty value is
addressed explicitly by neither FR-3 nor FR-4. It has since been decided in code (exact matching
refuses the empty string; asserted at `test/cors-policy.spec.ts:252`) and remains unstated in the
Specification.

## 6. Compliance with AGENTS.md

| Check | Result |
|---|---|
| §4 criteria in play quoted **verbatim** and cited, not paraphrased | Not applicable — none in play. The Specification states this rather than omitting it (`Touches generated HTML: no`). |
| §9 FROZEN-file impact named and acknowledged | Yes — Scope records "FROZEN files (AGENTS.md §9): none in scope". The surface (`server/index.js`, `.env.example`, `test/`) contains no §9 file. |
| §3 architecture rules not violated — incl. Rule 2, review-only | Rule 2 (retrieval separate from generation): not applicable and not endangered — this is a header policy in front of unchanged routes. Rule 4 (secrets): upheld by NFR-2 and FR-7 (placeholder only). Rule 5 (don't break features): NFR-3, subject to NBF-1. |
| §11 no blocking Open Decision left unaddressed | Yes — OD-1 is non-blocking and correctly carried. Assessed in §6a. |
| No implementation design leaked in | **Borderline, non-blocking — NBF-4**, unchanged from v1. |

**NBF-4 (carried forward from v1).** FR-3's and FR-5's failure paths name specific
mis-implementations ("not … a thrown error, a `403`, or a middleware that aborts the request";
"reads the variable, finds it empty, and skips configuring `origin` at all"). Strictly this is
implementation-aware for a document that should state *what*, not *how*. Accepted again because
both describe a **behaviour** that would violate a criterion, and FR-5's is the exact failure the
Story exists to prevent. Recorded so the precedent stays deliberate.

### 6a. Routed item 3 — is OD-1 recorded rather than answered, and correctly non-blocking?

**Recorded, not answered. Non-blocking is correct.**

*Recorded, not answered.* The Specification's OD-1 was compared directly against `open_decisions`
v2's OD-1 rather than read on its own. They agree in substance: the Specification is a shorter,
faithful restatement of the clarifier's question, it introduces **no constraint the Open Decisions
file does not already carry**, it settles nothing the clarifier left open, and it says so in its own
words — *"is **not** resolved here"*. The failure this axis exists to catch — a Specification
quietly closing what the clarifier left open — does not occur.

*The Rule 4 constraint is legitimate.* AGENTS.md §3 Rule 4 ("server-side only … **Never** import
keys into Angular code or put them in the bundle") is an **existing repository rule being cited**,
not a security rule being invented, which is precisely the distinction §11 draws. It eliminates one
candidate mechanism — a static shared secret the browser SPA must present — and leaves the answer
space genuinely open (a deploy-time gateway, a server-minted short-lived token, network-level
restriction, or accepting the residual risk). Narrowing an answer space by citing a rule that
already binds is not answering the question.

*Non-blocking is correct.* §11 makes an unresolved Open Decision a blocker when it **affects the
next stage**. No requirement depends on OD-1: FR-1 through FR-7 are satisfiable without it, and
none of AC-1 through AC-5 makes a claim about request execution — verified independently at §1,
not taken from the Specification's assertion. The next stage after the human gate is
IMPACT_ANALYSIS, which has nothing to analyse from OD-1 because no file in scope changes either
way. Story v2 places it out of scope explicitly and the user confirmed that scoping.

## Verdict rationale

`PASS`, on the document's merits.

What would have made this `CHANGES_REQUIRED` → `SPECIFICATION` is stated plainly because it was the
point of the re-run: **any movement in FR or NFR normative text**, since version 2 is being recorded
against an implementation and a test suite already built to version 1, and a moved requirement would
have silently invalidated both. The diff shows no such movement (§0). Had one been found, the fix
would have belonged in `SPECIFICATION` — the writer owns the requirement text — not in
`CLARIFICATION`, since the criteria themselves never moved.

`CHANGES_REQUIRED` → `CLARIFICATION` was considered and rejected: the Story is stronger at v2 than
at v1, its acceptance criteria are unchanged and each remains falsifiable, and the one ambiguity the
clarifier checked and declined to open (a non-browser client also *reads* responses) changes no
requirement in either direction.

`CHANGES_REQUIRED` was considered for NBF-5 and rejected. The Specification is not **wrong** about
the preflight status, it is silent, and FR-6's reference to FR-3 already forbids the failure mode
that matters (rejection by error). A planner or test writer can close it without the Specification
being re-approved.

**The existence of shipped code did not influence this verdict.** The implementation is referenced
only where it makes a finding more useful to the human (NBF-2, NBF-3, NBF-5 note what has since been
decided in code); no finding was softened because code exists, and none was raised because it does.

`PASS` is **not** human approval. Only `/so:approve` records that (AGENTS.md §10), and until it
fires this Specification stays `DRAFT` even with a `PASS` behind it.

## Non-blocking findings

1. **NBF-1 — NFR-3 is verified by the existing suite, not by a new assertion.** "Behaviour for every
   existing endpoint is otherwise unchanged" cannot fail a new test. The Specification should say it
   is discharged by the pre-existing suite, so no vacuous test is written to satisfy it. *(Carried
   forward from review v1; the NFR text did not move.)*
2. **NBF-2 — FR-1 is silent on trailing-slash normalisation, and the code has moved ahead of it.**
   `server/cors-policy.js` strips a single trailing `/` from configured entries; FR-1's text mentions
   only whitespace and empty entries. Safe in direction (configured entries only, incoming `Origin`
   still matched exactly), but the Specification no longer describes what ships. *(Carried forward
   from v1 finding 5a, now inverted from "unspecified" to "unspecified and implemented".)*
3. **NBF-3 — an empty `Origin` header is unaddressed in the text.** Decided in code (refused by exact
   match, `test/cors-policy.spec.ts:252`), still not stated by FR-3 or FR-4. *(Carried forward from
   v1 finding 5b.)*
4. **NBF-4 — two FR failure paths are implementation-aware.** FR-3 and FR-5 name concrete
   mis-implementations. Accepted deliberately; recorded so it does not become a habit. *(Carried
   forward from v1 finding 6a.)*
5. **NBF-5 — an unlisted origin's preflight has no stated success status (new at v2).** Tracing FR-6
   to AC-2 imports "not rejected with an error status" into preflight, and FR-6 names no positive
   status — leaving open whether the CORS middleware answers the preflight or it falls through to the
   framework's default `OPTIONS` handling. Satisfied today because the shipped `cors()` wiring's
   default `preflightContinue: false` answers it with `204`.
6. **NBF-6 — FR-6's new final paragraph is rationale, not a requirement.** "The browser aborts the
   exchange, and the actual request is never sent" describes user-agent behaviour and must not be
   read as an assertable clause; the assertable content of FR-6 is unchanged from version 1.

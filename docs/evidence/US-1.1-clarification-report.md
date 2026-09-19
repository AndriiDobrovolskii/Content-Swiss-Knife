---
artifact: clarification_report
story: US-1.1
version: 2
status: DRAFT
owner: so-clarifier
created_at: 2026-09-18T00:00:00Z
updated_at: 2026-09-18T13:00:00Z
supersedes: docs/evidence/US-1.1-clarification-report.md#1
inputs_consumed:
  - key: story
    version: 2
  - key: reconciliation_report
    version: 1
  - key: security_review
    version: 1
open_decisions_blocking: false
---

# Clarification Report — US-1.1

**Verdict: Ready for Specification.**

Re-derived against Story **version 2**, which amends version 1 after RECONCILIATION returned
`story_drift`. One non-blocking Open Decision (OD-1), **restated** at version 2 rather than
merely re-recorded. Three questions answered from a source at version 1 remain answered and are
carried forward in the Open Decisions file as resolved, not left open. The amendment opened no
new Open Decision and settled none of the existing ones.

## 1. What the amendment actually changed — verified by diff, not by claim

`git diff -U0 -- docs/stories/US-1.1-proxy-cors-allowlist.md` produces hunks against these
**version 1** line ranges only:

| v1 lines | Section | Change |
|---|---|---|
| 7, 11 | front matter | `version: 1` → `2`; `updated_at`; `supersedes` added |
| 19–21 | **Story** clause | capability and business outcome rewritten |
| 32–33 | **Context** | motivation paragraph rewritten; a new paragraph added on what wildcard CORS does *not* control |
| 64–66 | **Out of scope** | the single "Authentication on the proxy" bullet replaced by a two-path exclusion |
| 74–81 | **Open questions** | Q1 relabelled `Q1 (OD-1)`; impact widened |
| 85–86 (additions) | **Amendment history**, **References** | new section; three references added |

**v1 lines 34–63 carry no hunk.** That range is the whole of the **Scope** table (v1 lines
37–46) and the whole of the **Acceptance criteria** section, AC-1 through AC-5 (v1 lines 47–61).
They are therefore byte-for-byte identical to version 1 — established by the diff itself, not by
the Story's own claim in its Amendment history.

Two consequences follow, and both are load-bearing for the rest of this report:

- **The Specification's requirement surface is unchanged.** A specification writer reading v2
  derives exactly the requirements they would have derived from v1, because the criteria they
  derive from did not move. The amendment reaches the narrative only.
- **The Scope table is re-confirmed without re-deriving it**: stores `none`, locales `none`,
  surface `server/index.js` + `.env.example` + `test/`, touches FROZEN files `no`, touches
  generated HTML `no`.

## 2. What is clear

- **Business intent** is stated with an actor, a trigger and a value, and — unlike version 1 —
  the value is now a claim the acceptance criteria can actually produce. V2 claims that no
  third-party page can *read* a proxy response and that no *preflighted* cross-origin request
  succeeds from an unlisted origin. Both are properties of response headers and of the preflight
  exchange, which is what AC-1, AC-2 and AC-4 describe. The v1 claim — that a third-party page
  could not make a visitor's browser call the proxy and spend credits — was about request
  *execution*, which no CORS criterion governs. The amendment closes that gap at its source.
- **The evidence is concrete and verifiable**, not asserted. `server/index.js:33` was
  `app.use(cors())` with no options; `server/index.js:39-42` documents the Railway health-check
  path, establishing the proxy is deployed rather than local-only. V2 adds `server/index.js:36`
  (`express.urlencoded(...)`) as the citation for the CORS-simple path — confirmed at source
  this run: the file mounts `cors(...)` at line 34, `express.json` at 35 and
  `express.urlencoded({ limit: '50mb', extended: true })` at 36.
- **All five acceptance criteria remain observable and falsifiable.** Each names a request shape
  and a checkable response property. They were unchanged by the amendment, and the re-read
  confirms none of the five makes a claim about whether a request is executed — which is exactly
  why the correction needed to reach only the narrative.
- **Scope is bounded and the boundary is stated rather than implied.** V2's boundary is
  materially better than v1's: see §3.
- **Configuration approach is decided**: a new `ALLOWED_ORIGINS` environment variable with a
  documented placeholder, so no real deployed URL enters the repository.

## 3. Is the amended *Out of scope* complete?

**Yes — this is the question the re-run existed to answer, and the answer is that the section is
now complete for the outcome v2 claims.**

Version 1's exclusion was scoped to **non-browser** clients while its benefit clause was scoped
to **a visitor's browser**. That mismatch is precisely what RECONCILIATION §4 identified: the
exclusion did not cover the case the benefit clause named, so the Story was internally
inconsistent rather than merely optimistic.

Version 2 restructures the exclusion around the right axis — *request execution*, for any client
— and then enumerates both paths beneath it: non-browser clients, and CORS-simple cross-origin
browser requests. Checked against the two independent enumerations of the open paths available
(`security_review` R1/R2 and `reconciliation_report` §4), **no third path is named in either
that v2's exclusion fails to cover.**

Narrowing the outcome did **not** open a new ambiguity a specification writer would have to
guess at. The one asymmetry found — that a non-browser client also *reads* responses in full,
where v2's non-browser bullet speaks only of request execution — is an emphasis gap, not an
inconsistency, because "third-party **page**" is a browser context that the control does govern.
It changes no requirement in either direction. It is recorded in the Open Decisions file under
*Checked at v2 and deliberately not opened as a decision* rather than logged as a finding,
because logging it would misrepresent an emphasis gap as a repeat of the v1 drift.

## 4. Does OD-1 still state the deferred decision correctly?

**No — and that is this run's one substantive change.** OD-1 is restated at version 2.

Story v2 now leans on OD-1 explicitly: *"Preventing the credit spend itself requires
authentication on the proxy, which is OD-1 and is deliberately deferred to its own Story."* OD-1
as written at version 1 asked whether the endpoints should "require a shared secret, so that a
**non-browser client** cannot call the deployed proxy and spend API credits", and its impact
paragraph spoke only of `curl`, a script, or any non-browser client.

Two defects follow, and both are corrected in the version 2 Open Decisions file:

1. **Client population.** V2's *Out of scope* points at OD-1 for **both** open paths, including
   the CORS-simple cross-origin **browser** one. OD-1 v1 did not state that case, so the Story
   would have been deferring to a decision that does not cover what it defers.
2. **Presupposed mechanism.** "A shared secret" is a presupposition, and it becomes load-bearing
   once the browser path is in scope: the product's own frontend is a browser SPA, and
   `AGENTS.md:112-115` (§3 Rule 4) forbids shipping a secret in the Angular bundle. The question
   is therefore restated mechanism-neutrally, with Rule 4 recorded inside "Why it cannot be
   inferred" as a **constraint on the answer space** — not as an answer, and not as a second
   Open Decision, since no US-1.1 requirement depends on which mechanism is eventually chosen.

OD-1 remains `blocking: false`. Nothing about the amendment makes it blocking: the Story defers
it more explicitly than before, and AC-1 through AC-5 are satisfiable without it.

## 5. Was any previously-recorded decision settled, invalidated or made moot?

**None.** Every version 1 item is carried forward.

| v1 item | Status at v2 |
|---|---|
| OD-1 — no proxy authentication | **Still live.** Restated (§4), still `blocking: false`. The amendment made it *more* load-bearing, not less. |
| Resolved — preflight (`OPTIONS`) | **Still resolved from source.** One delta: v2's outcome clause now names preflight in the Story text itself, so the narrative no longer omits it. No acceptance criterion mentions it, so the Specification must still state it explicitly. |
| Resolved — `/health` with a disallowed `Origin` | **Unchanged.** AC-2 and AC-3 are byte-for-byte identical, so the reasoning that resolved it is untouched. |
| Resolved — credentials | **Unchanged.** Still `false` by default and correct; becomes a live question only when OD-1's authentication Story lands (`security_review` Finding 4). |

## 6. Checked and not applicable

The Scope table is diff-verified unchanged (§1), so the version 1 non-applicability findings
carry forward on that basis. The Story names no store, no locale and no currency anywhere, and
declares no FROZEN file and no generated-HTML change.

| Area | Finding |
|---|---|
| `STORE_REGISTRY` fan-out | Not applicable. The Story names no store, locale, currency or image base URL; Scope records `Stores: none`, diff-verified unchanged. |
| uk-UA master / locale fan-out | Not applicable. No generation path is involved; Scope records `Locales: none`, diff-verified unchanged. |
| AGENTS.md §4 HTML acceptance criteria | Not applicable. Scope records `Touches generated HTML: no`, diff-verified unchanged. |
| FROZEN files (§9) | Not applicable. Scope records `Touches FROZEN files: no`, diff-verified unchanged; the surface is `server/index.js`, `.env.example` and `test/`, none of which is on the §9 list. |
| Prompt → schema → renderer → validator chain | Not applicable. No link is touched. |
| `test/render-reconciliation.report.md` §3/§5 | Not applicable. No renderer or Doc-pipeline work, so the recorded corpus-coverage gap does not constrain this Story. |

These six were established at version 1 against the same Scope table and are carried forward on
the strength of the diff, not re-derived this run — stated so the basis of the claim is visible.

## 7. Ambiguities found and how each was handled

| # | Ambiguity | Outcome |
|---|---|---|
| 1 | Proxy has no authentication; neither a direct `curl` nor a CORS-simple cross-origin form POST is stopped | **OD-1**, non-blocking, **restated at v2** to cover both paths and to drop the "shared secret" presupposition (§4). |
| 2 | No acceptance criterion mentions `OPTIONS` preflight, though the v2 outcome clause now does | **Resolved from source** — the `cors` package applies the same `origin` option to preflight. The Specification should state it explicitly rather than leave it implied. |
| 3 | `/health` with a disallowed `Origin` is not addressed by name | **Resolved from the Story** — AC-2 is written against any request, not a route, so it already covers this. AC-3's subject is the origin-less health check. |
| 4 | `credentials` not mentioned | **Resolved from source** — `cors` defaults to `false`, the app uses no cookies, and enabling it would widen the surface for no benefit. |
| 5 | V2's non-browser bullet speaks of request execution, not of response reading | **Checked, not opened.** "Third-party page" is a browser context the control does govern; the asymmetry changes no requirement. Recorded in the Open Decisions file. |

## 8. Notes for the Specification writer

**AC-4 is still the requirement that carries the real risk, and it did not change.** "Unset
`ALLOWED_ORIGINS` defaults to `http://localhost:3000` only" must not be softened into "defaults
to permissive for local development" — a missing configuration value failing **open** is
precisely the bug this Story exists to remove, and it would pass a careless reading of AC-1 and
AC-2 while leaving production wide open. This note is carried forward verbatim in substance from
version 1 because AC-4 is byte-for-byte unchanged.

**State the preflight behaviour explicitly** (ambiguity 2) so it is tested rather than assumed.
V2's outcome clause naming preflight strengthens the case for this, since the Story now promises
it in the narrative while no criterion states it.

**Do not restate the v1 business outcome.** The Specification's framing must track v2: the
control withholds *responses* and blocks *preflighted* requests; it does not prevent a request
from being executed. See §9.

## 9. Non-blocking finding for the orchestrator — downstream staleness

`docs/specifications/US-1.1-spec.md` is `status: APPROVED`, version 1, and records
`inputs_consumed: story version 1, clarification_report version 1, open_decisions version 1`.
Publishing this file and the Open Decisions file at version 2 makes all three of those citations
stale, and two passages in that Specification carry the framing the amendment exists to remove:

- **line 39** (Background): *"Wide-open CORS means any page a user visits can drive that user's
  browser to call the proxy successfully and spend the owner's API credits"* — this is the v1
  claim RECONCILIATION §4 rejected, in an `APPROVED` artifact.
- **line 126**: records OD-1 in the narrower, non-browser-only form this run supersedes.

Not this stage's artifact and not corrected here — the Specification belongs to `so-spec-writer`
and its `APPROVED` status belongs to `so-orchestrator`. Raised because `so-pr-preparer` reads
upstream artifacts to draft the Pull Request body, and because the whole point of the `story_drift`
loop-back was to keep the false framing out of the repository's permanent history. Whether
SPECIFICATION needs a re-record is the orchestrator's routing decision, not this stage's.

Note also that `reconciliation_report` v1 §4 pre-agreed the outcome of that re-record: *"No
acceptance criterion needs to change. No code, test or Specification change follows from this
finding."* The staleness is therefore expected to be a re-record of citations and of two
narrative passages, not a change of requirements.

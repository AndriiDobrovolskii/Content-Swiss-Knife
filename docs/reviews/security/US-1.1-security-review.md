---
artifact: security_review
story: US-1.1
version: 2
status: APPROVED
owner: so-security-reviewer
created_at: 2026-09-18T10:05:00Z
updated_at: 2026-09-18T14:20:00Z
supersedes: docs/reviews/security/US-1.1-security-review.md#1
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 2
  - key: implementation_report
    version: 2
  - key: verification_report
    version: 2
open_decisions_blocking: false
---

# Security Review — US-1.1, restrict proxy CORS to an allow-list (version 2)

**Verdict: PASS**, with five non-blocking findings, three observations and two residual risks
the operator must own. Version 1's residual risk **R1 is closed** by the Story amendment.

This change *is* a security control, so it is reviewed as one: not only "did it introduce a
vulnerability" but "does the control hold, and does the Story now claim only what the control
delivers".

## Why this version exists

`RECONCILIATION` returned `story_drift` on the basis of this review's v1 residual risk R1. The
Story was amended to v2 and the upstream chain re-issued at v2; `so-test-writer` then added two
assertions to `test/cors-policy.spec.ts` (24 → 26), committed at `f981732`. Version 1 consumed
the v1 chain and is stale.

**Every conclusion below was re-derived against the current tree, not copied.** The production
code is byte-identical to the code v1 reviewed, so most conclusions do hold again — but each was
re-established by reading the source and by running the adversarial probes recorded in
*Evidence*, not by carrying a sentence forward. Three findings in this version are new and were
not present at v1 (Findings 3b, 5 and Observations O1–O3).

## Scope reviewed

Commits `dc29f40`, `540a676`, `68dea71`, `7b117e2`, `f981732`; diff baseline `3c043c4`.
Confirmed by `git diff --stat 3c043c4..f981732`:

| File | Change |
|---|---|
| `server/cors-policy.js` | new, 70 lines — `resolveAllowedOrigins`, `corsOriginPolicy` |
| `server/index.js` | +3 / −1 — the import, and line 34 replacing `app.use(cors())` |
| `.env.example` | +9 — `ALLOWED_ORIGINS` and its comment block |
| `test/cors-policy.spec.ts` | new, 459 lines — 26 tests |
| `docs/catalog/US-1.1-pipeline-status.md` | `so-builder`'s workflow artifact |

**Nothing under `src/**` is touched.** Installed `cors` is **2.8.6** under the `"^2.8.5"` caret
range; installed `express` is **5.2.1**. Every claim below about package behaviour was read out
of `node_modules/cors/lib/index.js` or observed in a live probe, not recalled.

---

## 1. Does the Story's claim now match the control? — **Yes, with one inaccurate aside**

This is the question the re-run exists to answer, so it is answered first and plainly.

Story v2's outcome clause promises two things. Each was tested for a browser-reachable scenario
in which it would be false:

| Clause | Holds? | Evidence |
|---|---|---|
| "no third-party page can read a response from my proxy" | **Yes** | No probed path emits `Access-Control-Allow-Origin` for an origin absent from the list — actual request, preflight, empty `Origin`, duplicate-joined `Origin`, `null`, case/port/scheme/subdomain near-misses. A page can only read what the browser exposes, and nothing is exposed. |
| "no preflighted cross-origin request … succeeds from an unlisted origin" | **Yes** | Live probe: `OPTIONS /api/llm/generate` with `Origin: https://evil.example` returns `200` with `allow: POST` and **no** `access-control-allow-origin`. The browser fails the preflight and never sends the real request. |

**The overstatement RECONCILIATION upheld is gone.** v1's R1 was that the business outcome
("a third-party page cannot spend my API credits") promised something CORS cannot deliver,
because a CORS-simple cross-origin form POST still executes. Story v2 no longer claims it: the
outcome is now scoped to reading responses and to preflighted requests, and *Out of scope* names
the CORS-simple browser path explicitly, with `express.urlencoded` cited by line and the credit
spend routed to OD-1. I re-confirmed the underlying fact rather than taking the Story's word for
it — a live `POST` with `Content-Type: application/x-www-form-urlencoded` and
`Origin: https://evil.example` returned `200` with the body parsed into `req.body` and the
handler run. That is exactly what the Story now says happens. **R1 is closed as a drift finding**
and survives only as residual risk R2 below, which is where it belongs.

### Finding 1 — one supporting aside in the Story is inaccurate (non-blocking)

The outcome clause's parenthetical reads "no preflighted cross-origin request — **which is every
JSON `fetch` the real frontend makes** — succeeds from an unlisted origin". The emphasised part
is false.

`src/services/usage.service.ts:43` issues `this.http.get<…>('/api/usage', { params })`, and
`/api/usage/generations` the same way. An Angular `HttpClient` GET with no custom headers sends
only CORS-safelisted headers (`Accept: application/json, text/plain, */*` contains no
CORS-unsafe bytes), so it is a **CORS-simple request and is not preflighted** — even though it
both sends and receives JSON. The frontend's JSON *POSTs* (`/api/llm/*`, `/api/retrieval/*`,
`/api/usage/generation`) do carry `Content-Type: application/json` and are preflighted.

**Why this is non-blocking and not a reopening of `story_drift`.** It does not promise protection
the control fails to deliver: the clause the Story is actually answerable to is scoped to
preflighted requests, and that clause holds. The Story's own *Out of scope* section already names
the CORS-simple browser path **and names `GET /api/usage*` specifically** as reachable that way.
The Story therefore contradicts its own parenthetical, and the *Out of scope* side is the correct
one. It is an internal prose inconsistency, self-limiting, and owned by the Story — not by
`IMPLEMENTATION`, where there is nothing to change. Recorded so a reader does not take "every
JSON fetch is preflighted" as a guarantee that all frontend traffic is preflight-protected.

---

## 2. Does the control fail closed under every input? — **Yes, by construction and by probe**

`resolveAllowedOrigins` (`server/cors-policy.js:35-43`) cannot return an empty array. It splits
on `,`, trims, strips one trailing `/`, drops empty entries, and then:

```js
return configured.length > 0 ? configured : [DEFAULT_ALLOWED_ORIGIN];
```

`String(raw ?? '')` collapses `undefined` and `null` to `''`. There is no branch producing `[]`,
`undefined` or a bare `'*'` handed to `cors` as a string.

This matters more than it looks. In `cors` 2.8.6:

```js
if (corsOptions.origin && typeof corsOptions.origin === 'function') { originCallback = corsOptions.origin; }
…
else { next(); }                       // no origin option at all → NO CORS handling
```

and `configureOrigin` treats a falsy `options.origin` as `Access-Control-Allow-Origin: *`. An
implementation that read an empty variable and skipped the option would have silently restored
the wildcard while looking configured. The module's header comment names this exact trap; the
code avoids it structurally rather than conditionally.

Probed against the installed module (full output in *Evidence*):

| `ALLOWED_ORIGINS` | Resolved list | Effect |
|---|---|---|
| unset / `null` / `''` / `'   '` / `'\t\n'` | `["http://localhost:3000"]` | default only |
| `','` / `',,,'` / `' , , '` | `["http://localhost:3000"]` | default only |
| `'/'` | `["http://localhost:3000"]` | trailing slash stripped first, so no empty entry survives |
| `'//'` | `["/"]` | one entry that matches nothing → blocks everything |
| `'*'` / `' * '` | `["*"]` | one entry that matches nothing → blocks everything (see O1) |
| `'__proto__'` | `["__proto__"]` | a literal entry; `Array.prototype.includes` does no key lookup, so there is no prototype-pollution path |

**No input widens the list.** FR-5 / AC-4 hold.

### Observation O1 — `ALLOWED_ORIGINS=*` fails *closed*, not open

Answering the question directly: **nothing can widen the policy to `*`.** The naive operator
attempt — setting `ALLOWED_ORIGINS=*` expecting the old permissive behaviour — produces a proxy
that refuses **every** browser origin, silently. Because the value handed to `cors` is a
*function*, not the string `'*'`, the `if (!options.origin || options.origin === '*')` wildcard
branch is unreachable.

For completeness and to avoid overstating a clean result: with `ALLOWED_ORIGINS=*` configured, a
request whose `Origin` header is the literal string `*` does match and does receive
`Access-Control-Allow-Origin: *`. This is not a bypass. No browser ever sends `Origin: *` — an
origin is a scheme/host/port tuple or the literal `null` — and a non-browser client that can set
arbitrary headers ignores CORS entirely and gains nothing from the response header. It requires
an operator to have written `*` in the first place. Recorded as an observation, not a finding.

---

## 3. Can normalisation be abused to match an unintended origin? — **No**

Normalisation is deliberately minimal: `trim()` and one trailing-slash strip, applied **to the
configured entries only**, never to the incoming `Origin`. Matching is `allowed.includes(origin)`
— exact, case-sensitive string equality, no `RegExp`, no suffix logic, no port inference.

Each abuse shape, re-probed this pass against list `["http://localhost:3000"]`:

| Shape | Result | Why |
|---|---|---|
| Case — `http://LOCALHOST:3000` | refused | no `toLowerCase()` anywhere |
| Port — `http://localhost:3001` | refused | port is part of the compared string |
| Scheme — `https://localhost:3000` | refused | scheme is part of the compared string |
| Subdomain — `http://evil.localhost:3000` | refused | no suffix matching |
| Suffix — `http://localhost:3000.evil.example` | refused | no prefix matching |
| `Origin: null` (sandboxed iframe, `file://`, some redirect chains) | refused | arrives as the literal `"null"`, matching nothing unless an operator lists it |
| `Origin:` present but empty | refused | `''` is in no list and is not `undefined` |
| Duplicate `Origin` headers | refused | Node joins them to `"a, b"`, which matches nothing |
| Trailing slash on the *incoming* origin | refused | browsers never send one; a client faking it fails closed |

Every deviation errs toward **over-restriction**, the correct direction for a control.

Reflection is safe by construction. On the allow path `cors` sets
`value: isAllowed ? requestOrigin : false` and our policy returns `true` only on exact equality
with a configured entry — so the emitted header is always a string the operator wrote. There is
no path where an attacker-chosen string is reflected.

### Finding 2 — case-sensitivity is not called out to the operator (non-blocking)

`.env.example` warns that scheme differences make distinct entries, but not that matching is
case-sensitive. A mis-cased entry (`https://Shop.Example`) resolves to itself verbatim and then
matches nothing. Fails safe; costs debugging time.

### Finding 3 — a doubled trailing slash also silently never matches (non-blocking, new at v2)

Only **one** trailing `/` is stripped, so `https://a.example//` resolves to `https://a.example/`
and `//` resolves to `/`. Both are entries that can never match a browser-sent `Origin`. Same
class as Finding 2: fails closed, invisible to the operator. Neither is a security defect —
together they are the argument for Finding 5.

---

## 4. Refusal is an omitted header, not an error — **Confirmed, and the caller consequence is material**

Verified at source (`node_modules/cors/lib/index.js`):

```js
originCallback(req.headers.origin, function (err2, origin) {
  if (err2 || !origin) { next(err2); }          // callback(null,false) → next(undefined)
  else { corsOptions.origin = origin; cors(corsOptions, req, res, next); }
});
```

`corsOriginPolicy` always passes `null` first, so `next(undefined)` is reached: no error, no
status, no `res.end()`, **no CORS headers at all**, and the request continues down the chain. The
module comment correctly flags that the common online `callback(new Error('Not allowed by CORS'))`
idiom would instead abort the request. FR-3 / AC-2 hold.

**What it means for the caller, stated plainly and now demonstrated rather than reasoned.** A
refused cross-origin request is *still executed by the server*. Live probe, list
`["https://shop.example"]`:

```
POST /api/llm/generate
  Origin: https://evil.example
  Content-Type: application/x-www-form-urlencoded
  → 200, no access-control-allow-origin, body parsed: {"userContent":"hi","mode":"text"}
```

The browser withholds the response from the calling page; it does not withhold the request from
the proxy. A provider call, a Serper query and a row in the usage database all still happen. This
is the deliberate, specified choice (FR-3 *requires* omission over rejection) and it is the root
of residual risk R2.

### Observation O2 — an unlisted preflight now answers `200 + Allow`, not `204` (new at v2)

A behaviour delta this diff genuinely introduces, named rather than ignored because a reader
could raise it against NFR-3. Before the change, `cors()` answered every preflight itself with
`204` and `ACAO: *`. Now a refused preflight is handed on with `next()`, Express 5's default
`OPTIONS` handler answers it, and the response is `200` with `allow: POST` and no CORS headers.

Classed as an observation, not a finding: the `Allow` list was already obtainable by any
non-browser client with one `OPTIONS` request, the change is strictly a *narrowing* of what the
browser is told, and the outcome the Story cares about — the preflight fails, the real request is
never sent — is unchanged. It is, however, relevant to R3: the refusal looks like a success from
the server side.

---

## 5. Credentials — **off, and correctly so**

`git grep -n credentials -- server/ .env.example` returns nothing. No `credentials` option is
passed; the `cors` 2.8.6 default of `false` stands and no `Access-Control-Allow-Credentials`
header is emitted — confirmed in the live probe's header dumps on both the allowed-request and
allowed-preflight paths. NFR-1 holds.

### Finding 4 — `credentials` must be re-examined when OD-1's auth lands (non-blocking, forward-looking)

Turning `credentials: true` on *today* grants nothing: there are no cookies, no session, no
browser-side auth to ride. The sharpened point, which v1 understated: **this policy is exactly the
shape that makes credentialed CORS work.** A browser rejects `Access-Control-Allow-Credentials:
true` alongside `ACAO: *`, so under the old wildcard an operator who flipped `credentials: true`
would have got a loud, immediate failure. This policy reflects an *exact* operator-listed origin,
so the same flip would **silently succeed**. Combined with the authentication deferred by OD-1, a
single wrong allow-list entry — a stale origin, an expired domain, a hijacked subdomain, a typo
that happens to be registrable — stops being "a page that can spend credits" and becomes "a page
that acts as the authenticated user". Whoever implements the OD-1 Story must revisit
`server/index.js:34` and this paragraph.

---

## 6. Secret and log exposure — **Clear**

Traced through the response shape and the variable, not only grepped for literals.

- **The allow-list cannot reach a response body.** On the allow path `cors` echoes
  `req.headers.origin` — the *request's own* value — so the configured list is never serialised
  into any header. On the refusal path nothing is emitted at all. There is no code path in which
  `ALLOWED_ORIGINS`, or any entry of it, is written to a response.
- **Browser bundle.** `git grep -n ALLOWED_ORIGINS` outside `docs/` hits only `.env.example`,
  `server/cors-policy.js` (comments), `server/index.js:34` and the spec file. **Nothing under
  `src/**` reads it**, so it cannot reach the bundle. It is configuration rather than a secret,
  but §3 Rule 4 governs the mechanism, so the check was made rather than waved off.
- **Logs.** `server/cors-policy.js` contains no `console.*` call, and the `server/index.js` diff
  adds none. The allow-list is never printed at boot and a refusal is never logged (which is
  itself R3's problem, not a leak). `server/utils/call-log.js` and `server/utils/describe-error.js`
  are untouched, so the error funnel is unchanged and no new value reaches a response body — no
  stack trace, no upstream URL, no raw provider body is newly exposed.
- **Usage database.** `server/usage/store.js` is untouched; `insertUsage` still records provider,
  model, mode, labels, token counts and cost — metadata only. No origin, header or request
  identifier is recorded by this change.
- **No API key** is read, passed, referenced or newly serialised anywhere in the diff.
- **`.env.example`.** Placeholder only —
  `http://localhost:3000,https://your-frontend.example.com`, using the IANA-reserved
  documentation domain. `.env` is gitignored (`.gitignore:16`) and `.env.example` is the only
  tracked `.env*` file (`git ls-files | grep .env`). FR-7 / AC-5 / NFR-2 hold. **No secret of any
  kind is introduced, moved or newly serialised by this change.**

---

## 7. The other four surfaces — explicitly clear

The diff touches no file under `src/**`. Stated as clear-by-construction, each verified rather
than assumed:

- **DomSanitizer bypass** (`src/app/pipes/safe-html.pipe.ts`) — untouched. Nothing new reaches the
  pipe; no new content source is introduced anywhere; `src/utils/html-cleaner.ts` and the
  validator are unchanged, so the de-facto sanitizer is not weakened. **No new
  `bypassSecurityTrust*` call** — `git grep -n bypassSecurityTrust -- src/` returns exactly one
  hit, `src/app/pipes/safe-html.pipe.ts:14`, the pre-existing one.
- **TipTap editor schema** (`src/app/components/html-editor/`) — untouched. No node and no
  attribute is newly permitted through a round-trip, so no new injection vector enters output that
  is later rendered with sanitization bypassed.
- **Prompt injection from retrieved pages** — `RetrievalService`, `server/retrieval/fetcher.js`,
  `server/retrieval/serper.js`, the orchestrator and every prompt builder are untouched. Nothing
  new reaches `systemBlocks`; `server/index.js:67`/`:79` still destructure and forward
  `systemBlocks` and `userContent` as separate fields. What gets fetched and its length bound are
  unchanged. This change narrows *who may invoke* `/api/retrieval/*` from a browser; it changes
  nothing about how the result is handled.
- **Proxy error surface and telemetry** — covered in §6. `describeError`, `call-log.js` and
  `usage/store.js` are all unchanged, so no stack trace, upstream URL or raw provider error body
  newly reaches the browser.

---

## 8. The wiring line — re-assessed against the two new assertions

v1 Finding 1 held that a regression of `server/index.js:34` to `app.use(cors())` or to
`credentials: true` would leave the whole suite green. The two assertions added at `f981732`
exercise the composed policy through the real `cors` package — but the wiring line itself is
still imported by no test (`app.listen()` at module scope makes `server/index.js` unimportable;
D1 rejected `supertest`).

Walking the regression list explicitly:

| Regression at `server/index.js:34` | Suite before `f981732` | Suite after |
|---|---|---|
| reverts to `app.use(cors())` | green | **still green — not closed** |
| gains `credentials: true` | green | **still green — not closed** |
| drops the `resolveAllowedOrigins` call | green | **still green — not closed** |
| `cors` minor flips `preflightContinue` under `^2.8.5` | green | **red** — the `204` / `ended` / `not handed on` assertion |
| a refused preflight starts being answered by the middleware | green | **red** — the "handed on" assertion |

### Finding 5 — the wiring line remains the control's untested surface (non-blocking, carried forward)

**The two new assertions close a dependency-drift blind spot, not the wiring-line blind spot.**
That is a real gain — the `"^2.8.5"` caret range means a future `npm install` could change
preflight completion behaviour under the repository's feet, and exactly one assertion now goes red
if it does. But movement on the line the Story's entire value rests on is **zero**. Three of the
five regressions above are the ones that would actually reopen the wildcard or widen the surface,
and all three still pass silently.

The trade was made knowingly and remains reasonable — the alternative was a new test dependency
for two lines of wiring — and `so-implementation-verifier` §2 read the line directly this pass and
confirmed all three properties (one options key, no error-throwing callback, import plus one line
and nothing else). Recorded so the exposure is named rather than discovered later. **No change
requested for this Story.**

### Observation O3 — no `Vary: Origin` on the refusal path (availability only)

Confirmed empirically this pass. On the allow path `cors` emits `Vary: Origin` alongside the
echoed header, and it does so on the no-`Origin` path too. On the refusal path it calls
`next(undefined)` before any header is set, so the response carries neither. A shared cache in
front of the proxy could store a header-less response and serve it to a *listed* origin, which the
browser would then block. **The direction of harm is availability, not disclosure**: an allowed
response always carries both `ACAO: <exact origin>` and `Vary: Origin`, so even a cache that
ignored `Vary` could not usefully serve it to a different origin — the echoed value would not
match the requesting page. No shared cache is documented in this deployment.

---

## Residual risk the operator must own

### R1 — *closed at version 2*

v1's R1 — "CORS does not stop the credit spend the Story says it stops" — was upheld by
RECONCILIATION as `story_drift` and is **discharged by the Story amendment**. Story v2 and
Specification v2 both now scope the claim to reading responses and to preflighted requests, and
both name the CORS-simple browser path in *Out of scope* with the credit spend routed to OD-1. No
overstatement remains in the outcome clause. The underlying *fact* has not changed and is carried
below as R2; what changed is that the Story no longer promises otherwise.

### R2 — the request still executes; only the response is withheld

Unchanged by anything in this Story, and now correctly documented rather than contradicted.

- **Non-browser clients** send no `Origin` header, which AC-3 requires to be allowed
  (`origin === undefined` → allowed), because the Railway deploy health check and server-to-server
  calls depend on it. Anyone who knows the proxy's URL can still call `/api/llm/*` directly with
  `curl` and read the full response. **CORS is a browser control only; a non-browser client is
  entirely unaffected.**
- **CORS-simple cross-origin browser requests** are delivered and executed — demonstrated live in
  §4. A form POST to `/api/llm/generate`, `/api/retrieval/search`, or a GET to `/api/usage*`,
  needs no preflight, is parsed, and drives a real provider or Serper call. The attacker's page
  cannot read the result and does not need to if the goal is to burn credits. (`express.json` and
  `express.urlencoded` still carry their pre-existing `50mb` limit and there is no rate limiting —
  both untouched by this Story and both explicitly out of scope.)

Only authentication closes either path. That is **OD-1**, deliberately deferred to its own Story
and non-blocking here. Finding 4 becomes live at the same moment.

### R3 — fail-closed is silent, and the deployment topology is not recorded here

On the first deploy after this change, if `ALLOWED_ORIGINS` is not set in the deployment
environment, the effective list is `http://localhost:3000` alone.

What makes this operationally sharp is that **a misconfiguration is invisible from the server
side**. A refused request returns its normal `200` (observed in §4); a refused preflight returns
`200` with `Allow` from Express's default handler (Observation O2) rather than any 4xx; and
nothing anywhere logs a refusal. `GET /health` keeps answering `200` throughout because it carries
no `Origin`, so **the Railway deploy health check goes green on a proxy that refuses every real
browser**. The only symptom is a CORS error in end-user browser consoles.

The operator must first establish whether the deployed frontend is cross-origin with the proxy at
all: the Angular app calls **relative** `/api/...` URLs (`src/services/*.service.ts`) and in
development reaches the proxy through `proxy.conf.json` on the same origin, so this repository
does not record the production topology. If the deployed frontend is served same-origin with the
proxy, CORS never engages for it and fail-closed causes no outage. If it is cross-origin,
`ALLOWED_ORIGINS` is **mandatory before cutover**. Combined with Findings 2 and 3, an entry that
is merely mis-cased or doubly-slashed produces the same silent, total block as an unset variable.

---

## Verdict and routing

**PASS.** No blocking condition from the severity table is present: no secret can escape the
server, nothing new reaches the `bypassSecurityTrustHtml` pipe, and no fetched page can reach
`systemBlocks`. The control holds, fails closed under every input probed, cannot be widened to
`*`, refuses by omission as specified, keeps credentials off, and the Story now claims only what
it delivers.

None of the five findings is routed to `IMPLEMENTATION`. Findings 2, 3 and 5 are accepted
trade-offs or documentation gaps with nothing for a builder to change; Finding 4 is
forward-looking and belongs to the OD-1 Story. **Finding 1 — the Story's inaccurate parenthetical
— is deliberately not routed either**: this stage's only loop-back key is `changes_required` →
`IMPLEMENTATION`, the production code satisfies every requirement, and the inconsistency is
between two passages of the Story's own prose, on a point where its *Out of scope* section is
already correct. This is the same reasoning by which v1 declined to route R1 and by which
`so-implementation-verifier` declined to route NBF-D9-LEG; consistency with that precedent is
deliberate. Recorded here so the Story's owner and the deferred authentication Story inherit it.

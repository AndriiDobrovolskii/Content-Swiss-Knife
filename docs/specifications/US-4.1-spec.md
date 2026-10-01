---
artifact: specification
story: US-4.1
version: 3
status: ARCHIVED
owner: so-spec-writer
created_at: 2026-10-01T00:00:00Z
updated_at: 2026-10-01T00:00:00Z
supersedes: docs/specifications/US-4.1-spec.md#2
inputs_consumed:
  - key: story
    version: 1
  - key: clarification_report
    version: 2
  - key: open_decisions
    version: 2
open_decisions_blocking: false
---

# Specification: US-4.1 — Add Claude Sonnet 5.5 and Gemini 3.8 Flash as selectable models, make them the defaults, and retire Sonnet 4.6

## Summary

When this is done, `claude-sonnet-5-5` and `gemini-3.8-flash` are selectable in the model
settings and are the Deep and Fast defaults. `claude-sonnet-4-6` is no longer selectable, and
any stored selection of it is corrected to `claude-sonnet-5-5`. Requests built for the new
models use only parameters those models accept, and usage cost for both is priced from their own
entries.

## Background

Anthropic released Claude Sonnet 5.5 on 2026-09-28 and Google lists Gemini 3.8 Flash as stable.
The product owner decided to add both, make both the defaults, and remove Sonnet 4.6. Vendor
values are taken from the Story and from the owner's answers recorded in Open Decisions v2
(OD-1..OD-9). Values marked "docs-verified" were checked by the owner against the official
Sonnet 5.5 page; "owner judgement" values are owner decisions, not vendor facts. This
Specification did not re-verify any vendor page. Key constraints carried in:

- Sonnet 5.5 rejects `thinking: {type:"disabled"}` (HTTP 400) and non-default
  `temperature`/`top_p`/`top_k` (HTTP 400); forced tool use returns an error (docs-verified).
- `between_tools` is a value of the `thinking` field, not an effort level; it accepts no
  `display`, `budget_tokens` or `block_binding`, and is valid only at effort `low`, `medium` or
  `high` (docs-verified).
- Gemini 3.8 Flash does not support level `minimal` (error). The existing Fast default level is
  `minimal`, so a model-id swap alone would send an unsupported level.

## Scope

| | |
|---|---|
| **Stores** | All of `STORE_REGISTRY` — model choice is store-independent; no store-specific behaviour is added or changed |
| **Locales** | All locales in `STORE_REGISTRY`. The Deep model writes the uk-UA master and the Fast model produces translations, so the models that produce every locale change; no prompt, schema or content text changes. Output quality on the new models is not covered by any acceptance criterion (live verification is out of scope) |
| **Track** | server (also touches `src/` catalog and settings service, and active docs) |
| **FROZEN files (AGENTS.md §9)** | none |

## Functional requirements

### FR-1: Catalog entry for `claude-sonnet-5-5`

The model catalog contains `claude-sonnet-5-5` under provider `anthropic`, tier `premium`, with
`maxOutputTokens` 128000 (owner-confirmed, OD-5), `levels` exactly
`["between_tools","low","medium","high","xhigh"]` and `defaultLevel` `"high"` (OD-1, revised by the
owner decision recorded in OQ-2: `max` is not a selectable level on this model). The `levels` array
does not contain `max`. The entry is the first element of the anthropic provider's `models` array
(OD-6).

**Failure path:** a catalog whose `claude-sonnet-5-5` entry omits any of these values, has a different
`levels` set or order (including a `levels` array that contains `max`), or places it other than first
fails the catalog test.

### FR-2: Catalog entry for `gemini-3.8-flash`

The model catalog contains `gemini-3.8-flash` under provider `gemini` with `tier: "fast"`, `levels`
exactly `["low","medium","high"]`, `defaultLevel` `"high"` and `maxOutputTokens` 65536 (OD-2). The
`levels` array does not contain `minimal`. The entry is the first of the gemini provider's
`tier: "fast"` entries (OD-6).

**Failure path:** a `levels` array containing `minimal`, or any value other than the three listed,
fails the catalog test.

### FR-3: Retire `claude-sonnet-4-6` from the catalog; keep the other models

The catalog does not contain `claude-sonnet-4-6`. `claude-sonnet-5`, `claude-haiku-4-5`,
`gemini-3.1-pro-preview`, `gemini-3.7-flash` and `gemini-3.6-flash` remain present and selectable,
with their existing values unchanged.

**Failure path:** n/a for runtime behaviour beyond FR-9; a catalog still containing
`claude-sonnet-4-6`, or missing any listed remaining model, fails the catalog test.

### FR-4: Catalog level vocabulary and clamp outcomes for the Sonnet 5.5 levels

The level vocabulary used by the catalog and by model settings in `src/` accepts `between_tools`,
`xhigh` and `max` as valid levels in the shared level ordering (`max` stays in that ordering for
the models that list it, such as Gemini and Sonnet 5), so the FR-1 entry is representable and
selectable. Clamping (nearest-valid-level snapping, ties resolved upward) operates over a defined
ordering that includes these values, and the observable outcomes on `claude-sonnet-5-5` (whose
`levels` contain `between_tools`, `low`, `medium`, `high`, `xhigh`) are:

- a requested/stored `disabled` clamps to `between_tools`;
- a requested/stored `max` clamps to `xhigh`, the nearest valid level (owner decision, OQ-2);
- a requested/stored `minimal` clamps to `low` (preserving the existing behaviour "snaps minimal up
  to low rather than down", per `src/prompt-core/model-catalog.spec.ts`);
- a requested/stored level that is not a known level (for example `turbo`, `undefined`) resolves per
  the existing unknown-level behaviour, i.e. to the model's `defaultLevel` (`high`);
- a level that is a member of the model's `levels` is returned unchanged.

The ordering is such that `disabled` is nearer to `between_tools` than to `low`, and `minimal` ties
between `between_tools` and `low` and resolves upward to `low`, and `max` is nearest to `xhigh`. Existing clamp outcomes on every
other catalog model are unchanged (including `disabled` -> `minimal` on `gemini-3.6-flash`,
`minimal` -> `low` on `gemini-3.1-pro-preview` and `claude-sonnet-5`, and anything -> `disabled` on
`claude-haiku-4-5`); on every model whose `levels` contain `max`, `max` is returned unchanged. (Settles R-1(a); the clamp outcomes are the derivation of OD-1's `disabled` ->
`between_tools` intent plus the existing `minimal` test; see Open questions for the one point
recorded for owner confirmation.)

**Failure path:** a stored or requested level not in the target model's `levels` snaps to a level
that is in `levels`; it never produces an out-of-catalog level and never throws. In particular a stored or requested `max`
on `claude-sonnet-5-5` never reaches the request as `max`.

### FR-4a: Client/server clamp parity

The client clamp (`src/` catalog) and the server clamp (`server/providers/model-support.js`, a
separate duplicate implementation used when the server validates request levels) return the same
level for every catalog model and every probe level, including `disabled`, `minimal`, `between_tools`,
`xhigh`, `max` and an unknown value; for `claude-sonnet-5-5`, `max` clamps to `xhigh` on both sides.
The existing client/server parity test covers the new `claude-sonnet-5-5` entry and the new levels.

**Failure path:** any model/level pair for which client and server clamps differ fails the parity
test.

### FR-5: Deep and Fast defaults

With no stored settings, the Deep slot is `anthropic` / `claude-sonnet-5-5` at level `"high"`
(OD-7, owner judgement) and the Fast slot is `gemini` / `gemini-3.8-flash` at level `"low"` (OD-2,
owner judgement). Each default level is a member of that model's catalog `levels`. The client
default for the Fast slot and the server fallback for the Fast slot (`FALLBACK_FAST`) are equal in
provider, model and level. The catalog `defaultLevel` of `gemini-3.8-flash` (`high`) intentionally
differs from the Fast-slot default (`low`). Tier-based default/fallback resolution returns the new
models because of their catalog position (FR-1, FR-2), with no extra selection logic.

**Failure path:** if a stored or computed level is not in the model's `levels`, it is clamped (FR-4,
FR-9); the default is never `minimal` for `gemini-3.8-flash`.

### FR-6: Anthropic provider default thinking model

When `ANTHROPIC_MODEL_THINKING` is unset, the Anthropic provider's thinking-model fallback resolves
to `claude-sonnet-5-5`. When it is set, the set value is used as before.

**Failure path:** n/a, no new failure path (an unset variable is the case covered).

### FR-7: Gemini provider fallback Fast model

The Gemini provider's `FALLBACK_FAST` resolves to `gemini-3.8-flash` at level `"low"` (a member of
that model's `levels`, never `minimal`).

**Failure path:** n/a, no new failure path.

### FR-8: Gemini calls that request `minimal` snap to `low` on `gemini-3.8-flash`

Any Gemini call path that requests level `minimal` (including PDF extraction and image/vision
calls) against `gemini-3.8-flash` is clamped to `"low"` before the request is built, so the request
never carries `minimal` for this model (OD-2). Behaviour on models that support `minimal` is
unchanged.

**Failure path:** a requested level not in the model's `levels` is clamped to the nearest valid
level and the call proceeds; it does not throw and no unsupported level reaches the vendor.

### FR-9: Stored-settings restore

Restoring stored settings applies exactly one model migration: a stored `claude-sonnet-4-6` model
(Deep slot, or any slot referencing it) becomes `claude-sonnet-5-5`, and the corrected settings are
persisted. A stored Sonnet 5, `gemini-3.7-flash` or `gemini-3.6-flash` selection is NOT migrated
(OD-3). After restore, the stored level is clamped into the target model's `levels` as defined in FR-4 (for
example a stored `disabled`, `minimal` or `max` on `claude-sonnet-5-5` restores as
`between_tools`, `low` or `xhigh` respectively). Restore does not throw, and never leaves a model id that is absent from the catalog.

**Failure path:** stored settings naming a model id that is absent from the catalog (other than the
migrated `claude-sonnet-4-6`) resolve to a catalog model per the existing restore behaviour, never
to an absent id and never by throwing.

### FR-10: Thinking mapping for `claude-sonnet-5-5` — `disabled` and `between_tools`

The mapping at the Anthropic provider is independent of the catalog clamp (FR-4): whatever level
the provider receives for `claude-sonnet-5-5` and whatever its source — a clamped stored/requested
level, a request level that bypassed or preceded the clamp, the unconditional no-thinking path used
by PDF extraction, or the image/vision path — a level `disabled` or `between_tools` (and any other
path that today requests thinking off) yields `thinking: { type: "between_tools" }`. The
`between_tools` request contains no `display`, no `budget_tokens` and no `block_binding`. The provider
never sends `thinking: { type: "disabled" }` to `claude-sonnet-5-5` (HTTP 400), on any path. Models
other than `claude-sonnet-5-5` keep their existing `disabled` behaviour (for example
`claude-haiku-4-5`). Settles R-1(b), with these assumptions stated for the plan and reviewers: when
thinking is `between_tools`, effort is omitted (the vendor default `high`, valid with `between_tools`;
this also avoids the vendor's per-message effort mismatch error); and `between_tools` is never
combined with effort `xhigh` or `max` (on `claude-sonnet-5-5` `max` is in any case clamped to `xhigh`
before the request is built, FR-4).

**Failure path:** a request combining `between_tools` with effort `xhigh` or `max`, or with
`display`/`budget_tokens`/`block_binding`, or any `thinking: { type: "disabled" }` for
`claude-sonnet-5-5`, fails the request-shape test.

### FR-10a: Image-path `max_tokens` sizing under `between_tools`

The image/vision path today sizes `max_tokens` by whether thinking is of type `disabled` (a small
budget when disabled, otherwise `min(8000, maxOutputTokens)`). For `claude-sonnet-5-5`, thinking is
never of type `disabled` (FR-10), so that condition changes meaning. The behaviour on
`claude-sonnet-5-5` is explicit: the image path's `max_tokens` for the no-thinking case is checked
and handled so that it is either unchanged from the current no-thinking value or deliberately
chosen and tested, and in no case exceeds the model's `maxOutputTokens`. Behaviour for models that
still use `thinking: { type: "disabled" }` is unchanged. (Which value is chosen is a plan decision,
not decided here; the requirement is that the branch is not left silently on the wrong side.)

**Failure path:** an image-path request for `claude-sonnet-5-5` at level `disabled` or
`between_tools` whose `max_tokens` is undefined, exceeds `maxOutputTokens`, or silently takes the
thinking-enabled sizing without a test asserting that choice fails the request-shape test.

### FR-11: Thinking mapping for `claude-sonnet-5-5` — effort levels

For `claude-sonnet-5-5` at level `low`, `medium`, `high` or `xhigh`, the provider sends
adaptive thinking with `display: "omitted"` and `output_config.effort` equal to that level.
`display: "omitted"` is sent only with adaptive thinking, never with `between_tools`. The provider
sends effort for `low`..`xhigh` only; it never sends `output_config.effort: "max"` to
`claude-sonnet-5-5`.

**Failure path:** a level not in the catalog `levels`, including `max`, is clamped (FR-4; `max` becomes
`xhigh`) before the request is built, so the request carries `xhigh`, never `max`.

### FR-12: Request-shape guard for `claude-sonnet-5-5`

A request the Anthropic provider builds for `claude-sonnet-5-5`, at every `level` in its catalog
entry, contains no `temperature`, `top_p` or `top_k` field, and no `tool_choice` of type `any` or
`tool` (no forced tool use). The test is a guard on current behaviour, which already holds by
construction (OD-9).

**Failure path:** any such field present at any level fails the guard test.

### FR-13: Pricing for `claude-sonnet-5-5`

`getPrices('claude-sonnet-5-5')` returns `{ in: 2.00, out: 10.00, cw: 4.00, cr: 0.20 }` (`cw` is the
1h cache-write rate, per this repository's `ttl: '1h'` convention) and does not return
`FALLBACK_PRICE`. The result comes from an exact entry for this id and is not shadowed by the
`claude-sonnet-5` entry or any other substring match.

**Failure path:** an unknown model id keeps its existing fallback behaviour; this requirement adds
no new fallback.

### FR-14: Date-aware pricing for `gemini-3.8-flash`

`getPrices('gemini-3.8-flash')` returns `{ in: 0.75, out: 3.75, cw: 0, cr: 0.075 }` for any instant
before 2027-01-01T00:00:00Z and `{ in: 1.50, out: 7.50, cw: 0, cr: 0.15 }` from that instant on. The
date is evaluated at each lookup, not at module load. It never returns `FALLBACK_PRICE` and never
resolves to another Gemini model's entry; it uses its own date-aware entry and does not reuse the
3.6 key.

**Failure path:** a lookup at exactly 2027-01-01T00:00:00Z returns the post-cutover rates; one
millisecond earlier returns the pre-cutover rates.

### FR-15: Retired model price entry is retained

`claude-sonnet-4-6` stays in the pricing table (OD-4), so `getPrices('claude-sonnet-4-6')` continues
to return its own entry and does not resolve to the `claude-sonnet-4` entry's cache-write rate.
Past `usage_log` rows keep their insert-time cost; none are re-priced.

**Failure path:** n/a, no failure path (retention of an existing entry).

### FR-16: Active documentation names `claude-sonnet-5-5`

`README.md` and `.env.example` name `claude-sonnet-5-5` as the example/default
`ANTHROPIC_MODEL_THINKING` value. The `claude-sonnet-5` reference in the LLM-providers row of
`AGENTS.md` (line 55) is updated to `claude-sonnet-5-5`, by explicit owner instruction (OD-8); no
other part of `AGENTS.md` changes. After the change, no active (non-historical) source, spec or
doc names `claude-sonnet-4-6` as a selectable or default model. Historical references — comments in
`server/utils/timeouts.js` and spec fixtures or log strings that imitate past states — are left
untouched (OD-8). Existing specs that assert the current defaults are updated to the new defaults
(including the catalog `fastModels()` order assertion); specs that imitate historical states are
not.

**Failure path:** a remaining active reference to `claude-sonnet-4-6` as selectable or default
fails the AC-9 review; an edit to a historical reference violates this requirement.

### FR-17: Quality gates

`npm test` (both runners), `npm run lint`, `npm run build` and `bash arch-guard.sh` pass with the
change applied.

**Failure path:** any failing command blocks the story at the quality gate.

## Generated-HTML requirements (AGENTS.md §4)

Not applicable. The Story changes no prompt, schema, renderer or validator and no FROZEN file; it
does not change generated HTML. All §4 criteria remain true by construction, and this Story adds
no requirement to alter or re-test them. Output quality of the new models against §4 is not
covered by any acceptance criterion (live-API verification is out of scope).

## Non-functional requirements

- **NFR-1 (Provider independence, AGENTS.md §3 Rule 1):** All vendor SDK calls and
  model-specific request shaping stay inside `server/providers/`; no behaviour elsewhere depends
  on which provider is active.
- **NFR-2 (Prompt caching, AGENTS.md §3):** `systemBlocks` are not collapsed into `userContent`;
  this Story changes no prompt assembly.
- **NFR-3 (Retrieval separation, AGENTS.md §3 Rule 2):** Search and page fetch stay out of
  generation; not touched.
- **NFR-4 (Secrets, AGENTS.md §3 Rule 4):** No secret reaches the browser bundle; the catalog and
  settings changes add no key or secret.
- **NFR-5 (Determinism):** Date-aware pricing (FR-14) is testable by injecting the lookup
  instant; tests pin both sides of 2027-01-01T00:00:00Z and use no unseeded randomness. Tests use
  mocked vendor SDKs.
- **NFR-6 (Client/server default parity):** The client Fast-slot default and the server
  `FALLBACK_FAST` stay equal (FR-5, FR-7).
- **NFR-7 (Beta header assumption, R-2, unverified):** The Anthropic provider keeps sending the
  existing beta header `extended-cache-ttl-2025-04-11` on `claude-sonnet-5-5` requests. The
  Sonnet 5.5 docs do not mention this header; its validity on 5.5 is an UNVERIFIED ASSUMPTION
  and is not tested against the live API (out of scope).
- **NFR-8 (Unverified performance assumptions, R-3):** The claim that Sonnet 5.5 is "30%+ faster
  than Sonnet 5" is not found in official docs and is not relied on. At default level `high`, the
  existing timeout exposure (an attempt at `high` exceeded 600 s on Sonnet 4.6, per
  `server/utils/timeouts.js`) and the truncation-repair path against the 128000 output ceiling must be
  checked as a verification activity. This Specification does not set new timeout values; any
  change they would require is a finding for the plan, not a requirement here.

## Out of scope

- Adding Claude Opus 5.5, Fable 5.1, or any other model.
- Changing prompts, schemas, or generated HTML; no FROZEN file is touched.
- Removing Sonnet 5, Gemini 3.7 Flash or Gemini 3.6 Flash from the catalog.
- Migrating stored Sonnet 5, Gemini 3.7 Flash or Gemini 3.6 Flash selections (OD-3).
- Rewriting the stale `claude-sonnet-5` pricing comment in `server/usage/pricing.js`; reported
  for a separate fix.
- Re-pricing past `usage_log` rows.
- Live-API verification against the vendors, including the beta header (NFR-7) and any measured
  speed or quality comparison; acceptance is by unit tests with mocked SDKs.
- Editing any `AGENTS.md` line other than the one model reference in the LLM-providers row.
- Editing historical references (`timeouts.js` comments, spec fixtures and log strings imitating
  past states).
- Changing timeout values or truncation-repair logic as part of this Story (verification only,
  NFR-8).

## Open questions

No Open Decision is blocking (`open_decisions_blocking: false`). OD-1..OD-8 are RESOLVED, OD-9 is
PARTIALLY RESOLVED. Residuals, carried as stated, none decided by this Specification:

- **R-1:** (a) and (b) are carried as requirements FR-4 and FR-10, derived from owner-resolved
  OD-1; the effort-omission assumption in FR-10 should be confirmed at spec review.
- **R-2:** beta header on 5.5 is an unverified assumption (NFR-7).
- **R-3:** timeout exposure at `high` and the "30%+ faster" claim are unverified (NFR-8).
- **R-4:** the Story's AC-9 and Surface omit `AGENTS.md`, and AC-1 omits the 5.5 `levels`/
  `defaultLevel` and the Gemini `defaultLevel`. The Story was not edited; these are carried as
  explicit requirements (FR-1, FR-2, FR-16). Those parts trace to the owner decisions OD-1, OD-2
  and OD-8 rather than a Story AC, and are flagged in the traceability matrix. A Story
  amendment remains recommended.
- **OQ-1 (for owner confirmation at spec review, not blocking):** FR-4 derives the clamp outcomes on
  `claude-sonnet-5-5` as `disabled` -> `between_tools` and `minimal` -> `low`. The first follows
  OD-1's recorded intent (`disabled` becomes `between_tools`); the second preserves the existing
  "snaps minimal up to low" behaviour. If the owner instead wants `minimal` -> `between_tools` (or
  `disabled` -> `low`), that is a product choice not derivable from code or docs and FR-4/FR-9 must be
  amended; this Specification does not resolve it, and no existing Open Decision was resolved.

- **OQ-2 (owner decision, human-confirmed in-session, recorded here; not an edit of the Open
  Decisions artifact):** a live Doc (uk-UA) run on `claude-sonnet-5-5` at level `max` failed after
  818 s with "[anthropic] output truncated: hit max_tokens (128000) on claude-sonnet-5-5 /
  creative-json". The owner decided, model-wide and not Doc-specific, to remove only `max` from
  `claude-sonnet-5-5`'s selectable levels. `defaultLevel` stays `high` and `maxOutputTokens` stays
  128000. `max` clamps to `xhigh` on this model on both client and server (FR-4, FR-4a). Levels and
  clamp outcomes of every other model are unchanged. This supersedes the `max` member of OD-1's
  recorded level set for this model only. The truncation itself is not otherwise addressed here
  (NFR-8 and the truncation-repair exclusion in Out of scope stand).

## Traceability matrix

| Acceptance criterion | Satisfied by | Notes |
|---|---|---|
| AC-1 | FR-1, FR-2, FR-4, FR-4a | FR-1/FR-2 also carry the 5.5 `levels` (without `max`, OQ-2)/`defaultLevel`, the Gemini `defaultLevel` and catalog order from OD-1, OD-2, OD-6 (R-4); FR-4 is the representability consequence (R-1a) and carries `max` -> `xhigh` (OQ-2) |
| AC-2 | FR-3 | |
| AC-3 | FR-5 | Also carries Deep level `high` (OD-7) and Fast level `low` (OD-2) |
| AC-4 | FR-6, FR-7, FR-8 | FR-8 carries the `minimal` to `low` snap (OD-2) |
| AC-5 | FR-13 | |
| AC-6 | FR-14 | |
| AC-7 | FR-9 | Also carries the no-other-migration rule (OD-3) and level clamp (FR-4, FR-4a; a stored `max` restores as `xhigh` on 5.5) |
| AC-8 | FR-10, FR-10a, FR-11, FR-12 | FR-12 is the guard test (OD-9); FR-10/FR-11 constrain the thinking shape that AC-8's request-at-every-level covers (OD-1, R-1b) |
| AC-9 | FR-16 | AGENTS.md line 55 is added from OD-8 (R-4); FR-15 (retained 4.6 price entry, OD-4) is a recorded owner decision, not a Story AC |
| AC-10 | FR-17 | |

Requirements with no direct Story AC, recorded for the reviewer rather than smoothed over: FR-4a (parity of the two clamps, OD-1/R-1), FR-10a (consequence of OD-1's no-`disabled` rule), FR-15
(OD-4), the AGENTS.md part of FR-16 (OD-8), and NFR-7/NFR-8 (R-2, R-3). Each traces to a recorded
Open Decision resolution, not to an invented requirement.

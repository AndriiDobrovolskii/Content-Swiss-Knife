---
artifact: specification_review
story: US-7.1
version: 4
status: APPROVED
owner: so-spec-reviewer
created_at: 2026-10-09T14:10:00Z
updated_at: 2026-10-09T17:00:00Z
supersedes: docs/reviews/specifications/US-7.1-spec-review.md#3
inputs_consumed:
  - key: story
    version: 2
  - key: specification
    version: 4
  - key: open_decisions
    version: 2
open_decisions_blocking: false
---

# Spec Review: US-7.1 — Keep the operator's product name intact (re-review of Specification v4)

**Verdict:** PASS
**Loop-back:** none

> This `PASS` is **not** human approval. Approval is recorded only by `/so:approve` at
> HUMAN_SPEC_APPROVAL (AGENTS.md §10). The Specification stays `DRAFT` until then. Review v3
> (CHANGES_REQUIRED) is SUPERSEDED by this version; v1 and v2 were superseded earlier.

## Summary

Specification v4 resolves the blocking defect B1 and non-blocking items N1, N3, N4, N5 and N6 of review v3 (N2 is an
OD-11 residual that stays with the human). All inputs are current (Story v2, open_decisions v2, spec v4). Running the new
fused number+unit split in Tokenisation T by hand on `0.4mm`, `20W`, `3D`, `X1C`, `PLA+`, `1.75 mm` and `0,4 мм` found no
false positive on correct output and no contradiction with AGENTS.md §4 (FR-13). Slug handling is consistent with the
existing slug normalizer. No blocking defect remains; a few residual risks are listed as non-blocking for the human.

## Resolution of v3 findings

| v3 item | Status | Evidence in spec v4 |
|---|---|---|
| B1 — fused `0.4mm` cannot match the §4-correct `0.4 mm` | RESOLVED | T step 2: "A token that consists solely of a number immediately followed by a unit from the unit table ... is split into a number token and a unit token (`0.4` + `mm`). This split is applied on BOTH sides, the typed name and the output, before rule 3 and before the slugified form of the typed name is computed. So a typed `0.4mm` matches `0.4 mm` and `0,4 мм` in the output, and the space AGENTS.md §4 requires (FR-13) is never a violation." It also states the split does not create or remove designator tokens, so part 2 is unchanged. |
| N1 — FR-4 limit begins at 54, not 55 | RESOLVED | FR-4 failure path: "If the typed name alone is 54 or more characters (the point at which the existing long-H1 canonicalization applies, matching `isH1Unreachable`)"; outcome stays an unresolved FR-5 violation. |
| N3 — Task C translated descriptions in closed list | RESOLVED | Closed list item (2): "Generator / UA Description output, including the Task C translated descriptions of every other locale (es-ES, pt-PT, … per store)". |
| N4 — AC-7 "any generated H1" narrowing not surfaced | RESOLVED | Open questions: "AC-7 says the check covers 'any generated H1'; for the Generator / UA Description H1 only the part 2 altered-form scan applies ... narrower than AC-7's wording and is surfaced here for approval." |
| N5 — brand case sensitivity / multi-word | RESOLVED | FR-1 (i): "matched case-sensitively as written, as a whole-word token sequence (a multi-word brand such as `Bambu Lab` matches only as its consecutive tokens in that order)". |
| N6 — hard-break list incomplete | RESOLVED | T step 1 now lists `p, li, h1–h6, ul, ol, table, tr, td, th, caption, blockquote, dt, dd, div, figcaption, br`. |
| N2 — OD-11 rule (iii) classifies multipack-style names as protected | STILL OPEN, human decision | Unchanged by design; OD-11 is OPEN and overturnable at approval. |

## Hand-run of the fused number+unit split (independent)

Unit table evidence: `src/prompt-core/slug-utils.ts` `UNIT_MAP` (Cyrillic to Latin, includes `мм`, `вт`, `кг`) and
`UNIT_LOCALIZATION_RULES` in `constants.ts` (`W→Вт`, `10W → 10 Вт`); `normalizeSlug` converts a decimal comma to a dot
and Cyrillic units to Latin before slugifying.

| Input | FR-1 classification (alone) | Tokenisation T | Result |
|---|---|---|---|
| `0.4mm` (in `Bambu Lab Hardened Steel Nozzle 0.4mm`) | protected by brand (i); the attached span never counts toward (ii)/(iii) | typed: `0.4` + `mm`. Output `0.4 mm` -> `0.4`,`mm` equal; `0,4 мм` -> `0,4`,`мм` equal under rule 3 (separator, unit table). Slug: typed slugified after split = `...-0-4-mm`; output slug from `0,4 мм` -> `0.4 mm` -> `0-4-mm`. Equal. | correct output passes; the §4 space is not a violation |
| `Hardened Steel Nozzle 0.4mm` | generic (FR-1 attached-form paragraph) | not checked | exempt |
| `20W` (e.g. `Xtool D1 20W`) | span, so not rule (ii); protected only if another rule fires | typed: `20` + `W`. Output `20 Вт` -> `20`,`Вт`; `Вт` = `W` via the unit table. Slug: `20-w` both sides (`вт`->`W`->lowercase `w`) | passes |
| `3D` (`3D Printer Cleaning Kit`) | exempt from (ii); generic | not split (D is not a table unit); not checked | exempt |
| `3D` inside a branded name (`Bambu Lab 3D Printer`) | protected by brand; `3D` is not a designator | token `3D` compared identically; slug `3d` both sides | passes; part 2 not run (no designator) |
| `X1C` (`Bambu Lab X1C`) | rule (ii) | not number-first, not split; designator token | identical token required; slug `x1c`. Passes on correct output |
| `PLA+` | no rule (ii) match | trailing punctuation `+` stripped, token `PLA`; slug drops `+` | passes; see N-A below (a dropped `+` is not detected) |
| `1.75 mm` | span | tokens `1.75`,`mm`; output `1,75 мм` equal; slug `1-75-mm` both sides | passes |
| `0,4 мм` (typed with comma and Cyrillic) | span | tokens `0,4`,`мм` (comma between digits is part of the number); output `0.4 mm` equal under rule 3 | passes |

Part 2 re-run on Fixture A after the change: `Form Studio 1 Pro` is still a shortened form (skips `Resin Tank`, contains
designators `1`, `Pro`, includes last token `Pro`); `Formlabs Form Studio 1 Resin Tank Pro` is a full occurrence;
`PLA, 1.75 mm` and `any Elegoo resin printer` are still not flagged. The split yields only 2-token spans, which cannot form
the 3-token minimum alone.

## 1. Acceptance-criterion coverage

Matrix re-derived from Story v2 (AC-1 to AC-9), not read back.

| AC | Satisfied by | Verdict |
|---|---|---|
| AC-1 | FR-2, FR-3 (+FR-5 part 1, FR-10) | covered |
| AC-2 | FR-2, FR-4 (+FR-5 parts 1 and 2, OD-12 default) | covered |
| AC-3 | FR-2, FR-5 part 2, FR-6 | covered; positive half prompt-only (OD-8, NFR-7, stated) |
| AC-4 | FR-11 | covered |
| AC-5 | FR-7 (+FR-5 part 2 for Optimizer with `[Product Name]`) | covered; prompt-only otherwise (OD-7, stated) |
| AC-6 | FR-12, FR-13, FR-14 | covered |
| AC-7 | FR-1, FR-5 | covered; narrowing for the description H1 surfaced in Open questions |
| AC-8 | FR-8 | covered |
| AC-9 | FR-9 | covered |

Scope creep: none. FR-10 is the accepted OD-5 default; FR-13/FR-14 are the §4 criteria that must not regress.

## 2. Non-verifiable language

Clear. Every check is mechanical (`<= 55`, "54 or more code points", "at most 100", three-token runs, closed surface lists,
tokenisation rules 1-3). The remaining softness is stated and recorded as a limitation: FR-6 positive half and
Translator/Optimizer-without-name are prompt-only (NFR-7). One sub-phrase is under-specified, non-blocking (N-B).

## 3. Contradictions with the Story

Scope tables compared directly: stores, locales (uk-UA master, Task C fan-out), track, FROZEN handling and HTML impact all
match the Story. AC-7's "any generated H1" is narrowed for the description H1 (OD-6 consistency) and is now disclosed in
Open questions. No new contradiction. The v3 internal conflict (FR-5 vs FR-13) is gone.

## 4. Scope creep

Out of scope section present and non-empty (7 items). No requirement without an AC or accepted OD.

## 5. Missing edge cases, boundaries and failure paths

| Area | Finding |
|---|---|
| FR failure paths | Every FR states one. FR-4 now uses the correct 54 threshold. |
| Locale fan-out | Stated in Scope and FR-6; Task C translations are in the closed list. Clear. |
| Store scope vs `STORE_REGISTRY` | FR-11 iterates the registry; empty `officialBrands` stores handled. Clear. |
| §4 invariants | FR-13 (number/unit space), FR-14 (spec-count, figure/figcaption, eager/lazy, video, anglicisms). Clear. |
| Provider behaviour | FR-8: still shortened, error/429, malformed JSON. Clear. |
| Empty / boundary inputs | Empty typed name generic and unchecked (FR-1, FR-5); slug over 100 handled (FR-10). Clear. |

## 6. Compliance with AGENTS.md

| Check | Result |
|---|---|
| §4 criteria quoted verbatim and cited | Yes (FR-12, FR-13, FR-14). |
| §9 FROZEN impact acknowledged | Yes: none assumed; per-file approval at plan gate; checksums re-baselined in same commit. |
| §3 architecture rules | Not violated; NFR-1 to NFR-6 stated; check uses no retrieval (Rule 2). |
| §11 blocking Open Decisions | None. OD-11, OD-12, OD-13 are OPEN, non-blocking, carried as labelled overturnable defaults. |
| Implementation design leakage | Acceptable; module location comes from AC-7, file candidates from accepted OD-9. |

## Verdict rationale

PASS. The only blocking defect (B1) is fixed with a rule that is mechanical on both sides and keeps slug comparison
consistent with the existing normalizer. No AC is uncovered, no requirement is untestable or self-contradictory. The items
below are risks a human can accept at HUMAN_SPEC_APPROVAL. No Open Decision was resolved by this review.

## Blocking issues

None.

## Non-blocking findings (residual risks for HUMAN_SPEC_APPROVAL)

- **N-A.** T step 2 strips leading/trailing punctuation, so `PLA+` and `PLA` compare equal; a dropped `+` is not detected
  (part 1 and slug both ignore it). Low impact; consistent with `PLA+` not being a designator.
- **N-B.** T step 2 does not say whether the fused-unit split also recognises Cyrillic attached forms (`0,4мм`) or only the
  Latin table side. §4 requires the space, so correct output rarely fuses; worst case a fused Cyrillic output is flagged,
  and the repair path reports it. Plan-gate detail for the check's author.
- **N2 (carried).** OD-11 rule (iii) classifies generic multipack-style names (`Filter Spool 3 Pack`, `Nozzle Set 5 Pcs` if
  `Pcs` is not in the unit table) as protected; effect is only loss of localization. OD-11 is overturnable at approval; doing
  so would reshape FR-1, FR-5, FR-9.
- **Carried:** AC-7 "any generated H1" is narrowed for the description H1 (disclosed in Open questions); AC-3 positive half and
  AC-5 Translator/Optimizer-without-name are prompt-only (OD-7, OD-8, NFR-7); part 2 misses a shortened form lacking the typed
  name's last token and brand-only typed names (NFR-7); typed name of 54+ characters leaves an unresolved FR-5 violation by
  design (FR-4).
- OD-11, OD-12, OD-13 defaults remain overturnable at HUMAN_SPEC_APPROVAL.

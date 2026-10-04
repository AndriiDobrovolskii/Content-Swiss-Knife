---
artifact: clarification_report
story: US-5.1
version: 6
status: ARCHIVED
owner: so-clarifier
created_at: 2026-10-02T00:00:00Z
updated_at: 2026-10-03T23:45:00Z
supersedes: docs/evidence/US-5.1-clarification-report.md@v5
inputs_consumed:
  - key: story
    version: 1
  - key: open_decisions
    version: 6
  - key: clarification_report
    version: 5
  - key: specification
    version: 8
  - key: specification_review
    version: 8
open_decisions_blocking: false
---

# US-5.1 - Clarification Report (v6)

**Verdict: Ready for Specification.** No blocking Open Decision remains
(`docs/decisions/US-5.1-open-decisions.md`, v6). The v6 section immediately below (H-8) governs wherever it
differs from v5, v4 or v3. OD-25, OD-26, OD-27 and OD-28 were answered by the human on
2026-10-03 (source: `docs/workflow/workflow-state.yaml` `note`, "HUMAN ANSWERS 2026-10-03"). The Specification
was revised to v8 and reviewed (review v8 B-1 routed back here); the follow-ups are listed below. The v5, v4 and
v3 bodies are retained as history.

## v6 human decisions (H-8; SPEC_REVIEW loop-back `changes_required_clarification`, review v8 B-1)

Source: `docs/workflow/history.jsonl` event `HUMAN_REJECTED` of 2026-10-03T18:20:00Z, mirrored in the `note`
of `docs/workflow/workflow-state.yaml` (both read in full). The human rejected HUMAN_SPEC_APPROVAL of Spec v7;
"the provided HTML examples are the source of truth". Specification v8 names the decisions H-8. This skill
recorded them and answered nothing.

- **H-8 recorded** as a RESOLVED human decision (open decisions v6): (1) figure width is `width: max-content;`
  and the Spec must explicitly state that it amends AGENTS.md section 4 on this rule; (2) every `figcaption`
  carries `style="text-align: left;"`; (3) the structural styling applies to ALL non-video figures; (4) section 9
  authorisation (below); (5) A-14, A-15, A-16 confirmed; (6) the HTML shape: first image no `loading`,
  `decoding="async"`; images 2+ `loading="lazy"` `decoding="async"`; figure style `display: block; width:
  max-content; max-width: 100%; margin: 4px auto;`; img style `max-width: 100%; height: auto; display: block;`.
- **OD-26 REVERSED:** the v5 answer (b) (`fit-content`) is superseded; width is `max-content` and AGENTS.md
  section 4 is amended on that rule by the Spec. The v5 entry is kept as history. The human required the
  Spec to *state* the amendment; the event does not say AGENTS.md is edited in this Story (Spec v8 adds a
  planner follow-up that goes beyond the event; flagged, review v8 N-3). AGENTS.md was not edited by this skill.
- **OD-27 REVERSED:** the v5 answer (a) is superseded; the structural styling applies to all non-video
  figures. The label/language/fallback rules stay with marker-inserted figures (Spec v8 reading; the event
  speaks only of the structural styling).
- **Section 9 authorisation recorded:** the human authorises updating FROZEN
  `src/prompt-core/master-system-prompt.ts` lines 403 and 408 (the model's example figures) to match the new
  layout (event 2026-10-03T18:20:00Z). The lines are identified BY CONTENT (the two example `<figure style=...>`
  lines, Image #1 and Images #2+), not by number: 403/408 hold only in the working tree after the FR-20 sentence
  is inserted (HEAD: 400/405; review v8 N-4). Separate from, and additional to, the 09:25:44Z / 09:28:48Z
  approval. No other line and no other FROZEN file is covered.
- **A-14, A-15, A-16 human-confirmed:** A-16 (Vision Ukrainian alt completely replaces the legacy `altText` for
  marker images) in the human's words; A-14/A-15 as "Ukrainian fallbacks". N-1 flag: Spec v8 H-8 item 5 names
  more (rule id `image-caption-not-native`, Cyrillic check only for uk-UA) than the event says; only the
  numbered assumptions as labelled are recorded as confirmed, extra items only as far as they are part of
  A-14/A-15 in the Spec.
- **FROZEN impact (v6, replaces the v5 statement "none"):** section 9 approval is needed for the example-figure
  lines of `master-system-prompt.ts` and is given. All other FROZEN rules unchanged (`task-b.ts`, `task-c.ts`,
  `output-validator.ts` not editable; any other FROZEN edit is a section 9 stop).
- **Blocking status:** `open_decisions_blocking: false`. OD-18 and OD-20..OD-24 remain OPEN and non-blocking,
  carried forward unchanged.
- **Follow-ups for so-spec-writer:** align H-8 item 5 with the event (N-1); identify lines by content (N-4);
  bump `inputs_consumed` for `open_decisions` to v6; the Spec's own prose that the log "lags" is now closed.

## v5 human answers (2026-10-03; OD-26 and OD-27 below are REVERSED by H-8 in v6)

- **OD-25 = A:** the Vision pre-pass returns the Ukrainian label, description and alt into the manifest; the
  marker post-processor takes them deterministically. No Task A or master-prompt change, no new AGENTS.md
  section 9 approval. Human rationale: text-only Task A cannot see the images.
- **OD-26 = (b):** `max-content` is withdrawn; `width: fit-content` stays per AGENTS.md section 4; the rest of
  the H-7 scheme stands. The conflict with AGENTS.md and with FROZEN `master-system-prompt.ts` lines 403/408
  disappears.
- **OD-28 = (a):** H-7 overrides Story line 66 (Out of scope), AC-3 and Q5. The Story is NOT changed and NOT
  sent back to STORY_WRITING (no `story_drift`). The Spec must itself declare the override in its Background
  supersession list and update its own Out of scope.
- **OD-27 = (a):** the new rules apply only to marker-inserted figures; model-placed and fallback figures keep
  the old rules; FROZEN `master-system-prompt.ts` lines 403/408 are untouched.
- **H-7 corrected** in the log: its figure width reverts to `fit-content`; the rest of the scheme stands.
  Verified against the `note` line; the original H-7 text beyond the note is known only via the Spec v6
  paraphrase.
- **Blocking status:** `open_decisions_blocking: false`. OD-18 and OD-20..OD-24 remain open but non-blocking,
  each with a stated assumption, carried forward unchanged.
- **FROZEN impact (v5; superseded by v6 above):** none. No FROZEN file is edited (OD-25 = A, OD-27 = (a)); the Vision/manifest type
  extension is outside the FROZEN list.
- **Spec follow-ups (for so-spec-writer):** (1) revert width to `fit-content` in FR-14, AC-9(g) and the NFRs and
  drop the OD-26 conflict; (2) extend the Vision output and `ImageManifestEntry` with Ukrainian label,
  description and alt, Vision in the master language, FR-4/FR-13/FR-21 reading from the manifest; (3) add the
  override of Story line 66, AC-3 and Q5 to the Background supersession list and reword the Spec's own Out of
  scope; (4) limit the new rules to marker-inserted figures, state that lines 403/408 are not edited; (5)
  address review v6 B-2 and B-3 (closed by items 1, 4 and 3) and the testability findings.

## v4 re-entry (historical; blocking items below are now answered, see v5) (SPEC_REVIEW `changes_required_clarification`, review v6 B-1..B-3)

- **H-7 recorded** as a RESOLVED human decision (native, image-specific Ukrainian label, fallbacks,
  figcaption and `alt` in the uk-UA master; new figure style). It resolves OD-19. The v3 tension (g)
  ("fallback strings are English inside a Cyrillic master, OD-19") is therefore closed; OD-14/OD-16 keep
  their mechanics with Ukrainian text as Spec v6 re-words them. OD-12 (resolve once in the master,
  propagate by translation) is unchanged.
- **New decisions (all answered in v5):** OD-25 BLOCKING (Vision extra fields vs master generation; the FROZEN consequence
  differs); OD-26 BLOCKING (AGENTS.md section 4 `fit-content` vs H-7 `max-content`; the Spec cannot override
  AGENTS.md); OD-27 non-blocking (marker figures only vs every non-video figure; option "every" would modify
  FROZEN `master-system-prompt.ts` lines 403/408, beyond the additive section 9 approval, and is moot if
  OD-26 keeps `fit-content`); OD-28 BLOCKING (review B-3: confirm H-7 overrides Story Out of scope line 66,
  AC-3 "from the manifest caption" and Q5, or amend the Story; a Story change is `story_drift` routing to
  STORY_WRITING; the Story was not edited).
- **Dependency note:** OD-25 route A changes Vision output and the manifest type, which the Story's Out of
  scope excludes, so OD-28 and OD-25 should be answered together.
- **FROZEN impact (changed from v3):** no longer "none by design". OD-25 route B, and OD-27 option "every
  figure" with consistent prompt examples, each need an additional AGENTS.md section 9 approval.
- Carried forward unchanged: OD-18, OD-20..OD-24 (non-blocking, with assumptions).

## Change history

- **v1:** Not Ready; OD-1..OD-4 blocking. **v2:** answers to OD-1..OD-9; OD-10 blocking, OD-11..OD-17 raised.
- **v3 (attempt 3, last):** the human answered OD-10 (blocking) and OD-11..OD-17; recorded unadjusted as
  human decisions. The blocking item is resolved. Checking the answers produced seven new non-blocking
  decisions, OD-18..OD-24, each with a proposed assumption.

## What is clear

- **Mechanism (human decisions):** a deterministic post-processor, no prompt/FROZEN edit (OD-2). On the Doc
  path it runs inside the Doc gate's `produce`, after the model Doc and before validation: it splits text
  blocks at a marker, inserts a figure block, deletes the marker, lets the marker win over a model-placed
  figure of the same file, and leaves unmarked images to the existing coverage fallback (OD-10, OD-7).
  On the legacy HTML path it works on the output HTML before the coverage check (OD-11). Resolution
  happens once in the uk-UA master (OD-12). Grammar OD-9; match on `originalFilename`, `src` from
  `urlFilename` (OD-1); caption = `visionDescription`, else "Product image: " + file name (OD-14); alt =
  `altText` with a "View " prefix guard (OD-16); warning `unmatched-image-placeholder`, `error`-status
  images unmatched (OD-8); Expert-3DPrinter in scope (OD-13); Doc schema to be extended for sections
  that cannot host a figure today (OD-15); lowercase kebab-case only (OD-17).
- **FROZEN (section 9):** no FROZEN file (`task-a.ts`, `task-b.ts`, `task-c.ts`,
  `master-system-prompt.ts`, `output-validator.ts`) needs editing: Doc step sits in the orchestrator's
  `produce`, the legacy step in `produceTaskAArtifact` before `wrapImageFigures`; the Doc schema, types and
  renderer are not FROZEN. Any plan that needs a FROZEN edit is a section 9 stop.
- **AGENTS.md section 4 in play:** figure + mandatory figcaption (from the manifest caption), first image
  eager and rest lazy by document order, `decoding="async"`, lead-in `<p>` before every figure, no
  `<figure>` in `<p>`, lead-in and alt not duplicating the figcaption; video survival and spec-count parity
  undisturbed because only text is touched.
- **uk-UA fan-out:** substituting once in the master is sound against the code (see tension (a)).

## Tensions examined

(a) **OD-12 vs OD-4 and translation.** The later answer governs and matches the code better than OD-4.
Translation consumes the master's rendered HTML (`buildPromptC(finalMasterHtml, ...)`), not the Doc; the
figure is already a full `<figure>`. `task-c.ts` already preserves figure markup and translates
`<figcaption>` and `alt`; `restoreMediaSrcs` and `validateStructuralParity` keep `src` and tag counts equal
to the master, so a master figure survives parity. Lead-in, figcaption and alt in other locales therefore
come from the existing translator, not from a per-locale resolve. OD-4 is superseded; OD-8's "per locale"
context is narrowed (OD-24).

(b) **OD-15 schema extension.** Files: `src/domain/description-doc.ts`, `description-doc.schema.ts`,
`src/render/render-description.ts` and block-traversing validators; none FROZEN. No JSON-schema is derived
from the zod schema in `src`, so the model-facing payload is unchanged. Real obstacles: `hook`/`cta.text`
etc. are strings not Block lists; v4 forces `keyBenefits` to bullets; cached 3.0 docs must keep parsing
(OD-21).

(c) **OD-11 legacy path vs FROZEN.** Premise mismatch: simplified templates are not Doc-less (every
template of an enrolled store runs the Doc pipeline); the legacy path is per store (Expert-3DPrinter,
default custom stores). The FROZEN `output-validator.ts` coverage twin runs on the final HTML and is not
edited; the step precedes it in `produceTaskAArtifact`, and `wrapImageFigures` is idempotent (OD-23).

(d) **OD-10 "split text block".** Clean only for `paragraph` Blocks; bullets items (item floors),
headings, cells and plain-string fields cannot host a figure; the section 4 lead-in when no text precedes
the marker is unanswered (OD-22). Naming note: the Doc figure is `{kind:'figure', ref}` into
`figures[]` `{file, alt, caption}`, not `urlFilename`; the schema requires each figure referenced once, so
removing the model's figure means dropping block and entry and re-indexing (design detail, not a question).

(e) **First-image-eager.** No decision needed: the renderer and `wrapImageFigures` key the rule on document
order, so a marked image that is not first gets `loading="lazy"` and the first image in the document stays
eager, wherever the marker sits.

(f) **Story text now disagreeing with decisions (reported only, Story not edited):** Q1 (upload-time
rejection does not exist; anchored single-hyphen hint vs the OD-9 regex; OD-17 "keep Q1 strictly" is
ambiguous against it, OD-24); Q4 ("absolute URL from the manifest" vs `figureSrc`/relative path built from
`brandFolder/modelFolder/urlFilename`); Q5 (priority list incl. "manifest caption" vs `altText` with
fallback and "View " prefix); Scope/AC-4 are consistent again after OD-13, but AC-4's "simplified
schemas" is by-store on the legacy path; AC-3's "figcaption from the manifest caption" now has a fallback
(OD-14); "Touches FROZEN files: Unknown" can now read "no".

(g) **OD-14 vs OD-16.** On Vision success `app.component.ts:1279` sets `altText = e.altText ||
result.caption`, so alt equals the figcaption (`visionDescription`) for every ordinary image; on error,
`altText` is the bare file name, which never equals "Product image: ...". The "View " guard as worded
rarely triggers while the real section 4 violation is uncovered (OD-18). The fallback strings are English
inside a Cyrillic uk-UA master (OD-19).

(h) **OD-9 vs Q1 hint vs OD-17.** OD-9 regex allows leading/trailing/double hyphens and matches inside
text; Q1 hint is anchored with single inner hyphens; OD-17 says "Q1 strictly" without choosing; plus
OD-17's duplicate/`pending`/`.webp` sub-questions are unanswered (OD-24).

## Other risks

The FROZEN prompts never mention markers; the model may alter or drop them, in which case no substitution
and no warning occur and the image falls back to the end of the document (OD-24, accepted per OD-2).

## Locale and fan-out analysis

uk-UA is the natively generated master; other locales are structure-preserving translations of the
master's rendered HTML. Substitution once in the master fans out through that existing translation, with
`src` and structure enforced by `restoreMediaSrcs` and `validateStructuralParity`.

## Prompt / FROZEN impact

v6: section 9 approval needed and given for the example-figure lines of `master-system-prompt.ts` (H-8 item 4); see the v6 section. Earlier versions said none; superseded. No JSON-schema payload changes.

## Dependencies

Image manifest and Vision Phase 1 exist; Consumables doc figures (PR #100) merged;
`test/render-reconciliation.report.md` section 5 lists no gap affecting images.

## Conclusion

(v6) H-8 recorded; no blocking decision; the Story remains Ready for Specification (revision after review v8). (v5) All blocking decisions are answered; the Story is Ready for Specification (revision v7). The v3 text:
the blocking decision is answered and consistent with the code. Remaining items are design assumptions
the spec writer can state explicitly and the spec gate can confirm.

---
artifact: delivery_summary
story: US-5.1
version: 1
status: ARCHIVED
owner: so-orchestrator
created_at: 2026-10-04T19:30:00Z
updated_at: 2026-10-04T19:30:00Z
supersedes: null
---

# US-5.1 delivery summary — `[file-name.ext]` markers become the matching uploaded image

## What was delivered
A file-name marker such as `[desk-lamp.jpg]` in the Original Description is now an image placeholder. The final
description carries the matching uploaded image, as a compliant `<figure>`, at the position of the marker, and no
raw marker text reaches the output. It works on the Doc pipeline (every v4 and simplified Content Template schema
plus the Consumables template) and on the legacy HTML path, for every store in `STORE_REGISTRY` and every locale.
A marker with no matching upload is removed, the HTML stays well-formed and a warning names the file. Bracketed text
that is not a file name (`[note]`, `[1]`, `[Image.jpg]`) is untouched.

Concretely:
- Marker step modules in `src/utils/image-placeholder*.ts` (parse, Doc step, HTML step, validate, finalisers), wired
  into `content-orchestrator.service.ts`; a marker with no lead-in text in its own section is non-hosting and its
  figure is end-appended with a warning (FR-17/FR-18); the lead-in never crosses a section boundary.
- A native-Ukrainian Vision pre-pass: the Vision prompt returns label, description and alt in Ukrainian; the manifest
  entry stores the three fields (`vision-contract.ts`, `types.ts`); marker figures use them, never the legacy
  operator-editable altText (A-16). The OpenAI vision output cap is raised from 300 to 1000 tokens
  (`server/providers/openai.js`) so the longer JSON is not truncated.
- One shared figure style, `src/utils/image-figure-style.ts`: figure `width: max-content`, left-aligned figcaption,
  applied by the renderer, `wrapImageFigures` and the TipTap image node to **all** non-video figures. `AGENTS.md`
  section 4 was amended from `fit-content` to `max-content` (human decision H-8, T12).
- `hookExtra` / `cta.extra` carriers in the document model with carrier-aware length, word-range and tov validators.
- Prompt: the marker instruction block (FR-20) and the two example figure lines in the FROZEN `master-system-prompt.ts`;
  one modified template line in the FROZEN `task-a.ts`.

Delivered by PR #132 (`feat/US-5.1-image-placeholder-substitution`), merged into `main` at 2026-10-04T19:19:05Z as
merge commit `4d3092c`; pushed tip `dd5f039` (13 commits `134cdcc..dd5f039`: T4, T1, T3, T5–T12 plus the two specs
committed after the TEST_WRITING loop-back). Track: angular. By the human's decision (HQ-1 = a) the branch was cut
from `docs/US-4.1-archive` (`ef08509`), so PR #132 also carried the US-4.1 archive commit.

## Acceptance criteria and how each was proven
Full matrix: `docs/tests/US-5.1-ac-test-matrix.md` (v6). Reconciliation (v3, PASS) confirmed AC-1..AC-6 and AC-9
(a)–(o) of Specification v9 for matrix row, existing named test and a real assertion: 22 spec files, 633 tests, all
passing.

| AC | Criterion | Proven by |
|---|---|---|
| AC-1 | A bracketed `.jpg`/`.webp` kebab-case name is a placeholder | `image-placeholder.spec.ts` (grammar and the record of every marker found) |
| AC-2 | A matched marker becomes the full `<img>` figure at its position, marker text gone | `image-placeholder-doc.spec.ts`, `-html.spec.ts`, `content-orchestrator.image-placeholder.spec.ts` |
| AC-3 | Figure meets AGENTS.md section 4 (eager first, lazy later, `decoding=async`, figcaption, no orphan) | step specs, `image-figure-style.spec.ts`, `render-description*.spec.ts`, validator-guard cases |
| AC-4 | Every schema, store and locale | orchestrator spec across every Doc store plus the Consumables template; golden prompt entries |
| AC-5 | Unmatched marker removed, well-formed HTML, warning names the file | step specs and `image-placeholder-validate.spec.ts` |
| AC-6 | Non-file-name bracket text untouched | step specs (`[note]`, `[1]`, wrong case, wrong extension) |
| AC-9 (a)–(o) | Specification v9 additions: native-Ukrainian figure, same-section lead-in, max-content layout, frozen footprint, OpenAI cap, no `fit-content` | `vision-prepass.spec.ts`, `vision-contract.spec.ts`, `image-figure-style*.spec.ts`, `task-a.spec.ts`, `openai-provider.spec.ts`, golden; (f)/(m)/(o) are diff and grep checks recorded in the reports |

## Gate results (quality gate v3 at `dd5f039`)
lint exit 0; `npm test` 163 logic files / 4506 passed / 3 skipped plus 2 component files / 32 passed; coverage
93.79 / 87.97 / 95.07 / 94.29 with floors held; build clean; `arch-guard.sh` exit 0; `validate:harness` OK.
Implementation verification (v3), security review (v3, no blocking findings) and reconciliation (v3) all PASS.

## Open Decisions
OD-1..OD-17, OD-19, OD-25, OD-28, H-7 and H-8 RESOLVED by human decision; OD-26 and OD-27 were REVERSED by H-8 (v6).
At the plan gate the human also decided: base branch (HQ-1, a), harness docs committed last (HQ-2), the AGENTS.md
section 4 amendment (T12), the OpenAI cap, plan outranks spec on OI-1/OI-2, and that regenerating the golden and the
checksums is a mechanical builder step. **Deferred, non-blocking:** OD-18, OD-20, OD-21, OD-22, OD-23, OD-24 stayed
OPEN in the log (alt/figcaption identity, Expert-3DPrinter reachability, Doc schema extension scope, split-block
carriers, legacy regex path, marker reliability residuals).

## FROZEN files
`task-a.ts` (17 added, 1 removed) and `master-system-prompt.ts` (5 added, 2 removed) changed in `df52e88`, under
section 9 approvals recorded in `history.jsonl` and Open Decisions H-8, with exactly those two `.arch-guard-checksums`
rows re-baselined in the same commit. `task-b.ts`, `task-c.ts` and `output-validator.ts` untouched.

## Known residuals
- **N-9 (accepted gap):** a too-long sentence inside `hookExtra` is measured under path `hook`, but
  `doc-block-repair.ts` (unedited) repairs only `doc.hook`; it ships as a residual length finding. No task covers it.
- **Manual, not covered by tests:** live re-run on `expert3d_agibot_d1_ultra_2026-10-03_1217` (whether the live model
  keeps the markers), quality of the native-Ukrainian Vision output, and the browser visual check were still
  outstanding when the PR merged.
- Stale prose: matrix v6 AC-9 (o) says three production constants still hold `fit-content` (they no longer do) and
  verification v3 section 2 still describes the old `Image:` / `View ` strings. Two untouched ground-truth fixtures
  keep `fit-content`. `generate()` passes the literal `'uk-UA'` where a sibling call uses `UA_ISO`; `TOKEN_RE`
  backtracking is unconfirmed.
- Workflow: the spec v9 `HUMAN_APPROVED` event in `history.jsonl` carries a runtime-clock timestamp that sorts before
  earlier-stamped entries; the file is append-only and was not rewritten. Harness docs for this Story were still
  uncommitted when the PR merged.

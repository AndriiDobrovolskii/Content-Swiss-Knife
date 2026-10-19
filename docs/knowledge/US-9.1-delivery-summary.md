---
artifact: delivery_summary
story: US-9.1
version: 1
status: ARCHIVED
owner: so-orchestrator
created_at: 2026-10-19T19:37:30Z
updated_at: 2026-10-19T19:37:30Z
supersedes: null
---

# US-9.1 delivery summary — no picture references in generated descriptions, livelier uk-UA text

## What was delivered
Generated descriptions no longer point at their pictures («на фото», «показано на зображенні», «нижче»), and the master
prompt carries shared liveliness rules, so the uk-UA text is less dry. The trigger was the Creality Pika regression
(store EXPERT3D, uk-UA: 35 picture references, mean sentence length 12.2 words, «тож» 7 times).

- **No picture references.** A `[NO PICTURE REFERENCES]` rule (`NO_IMAGE_DEIXIS_RULE`) in the master prompt; the Vision
  pre-pass asks for product facts, not picture descriptions; the seven video `LEAD_IN_TEMPLATES` lose their spatial
  pointers; the Doc / HTML figure placement asks for a preceding body paragraph that states a product fact. A new detector
  (`src/utils/image-deixis.ts`, the seven base languages of `STORE_REGISTRY`) feeds `validateGeneratedHtml`
  (`image-deixis`, `warning`) and `figureCaptionWarnings` (`image-caption-deixis`, `warning`). Warnings never block output.
- **Livelier text.** A shared `LIVELINESS_RULES` block (SCENE, RHYTHM, HONEST LIMITS, HOOK) is interpolated into the master
  after `SENTENCE_LENGTH_RULES`; a store's own voice block wins on conflict, and the block says it governs writing a new
  description (a translation keeps the source sentences). EXPERT3D gets APPLICATIONS and HEADINGS wording.
- **Measurement script.** `tools/measure-description.ts` and `src/utils/description-metrics.ts` compute the acceptance
  metrics (AC-10). The script exists and is tested; it was never run on live output.
- **Operator-notes fields: added, then withdrawn.** Four optional Generator textareas (`ProductInput.operatorNotes`, an
  `[Operator Notes]` prompt block) were built mid-delivery and removed again by the owner (Story v5, commits `1b73c8a`..`86b0d62`).
  The net diff against `main` contains none of that code; exclusion pins fail if it returns.
- **Baseline fixtures.** Three reference files from the git-ignored `Knowledge/Issues/4` are tracked under
  `test/fixtures/baseline/` (owner decision H-OD13).

Delivered by PR #142 (`feat/US-9.1-no-picture-references-and-livelier-descriptions`), merged into `main` as merge commit
`2d5bb70` on 2026-10-19; delivery tip `51d1970`. Track: prompt. FROZEN files edited with the owner's per-file `modify`
instructions, each in a commit that re-baselines `.arch-guard-checksums` (14 commits touched a FROZEN file; `task-b.ts`
and `task-c.ts` are byte-identical to base).

## Acceptance criteria and how each was proven
Matrix: `docs/tests/US-9.1-ac-test-matrix.md` (v5). Reconciliation v4 checked row, file existence and assertion for each AC;
38 named spec files, 1318 tests, all passed; four mutation probes (feature returned to the master, to `userContent`, to
`numericFidelitySources`, to the CLI) turned the suite red.

| AC | Proof |
|---|---|
| AC-1 Vision pre-pass asks for facts | `vision-prepass.no-picture-references.spec.ts` |
| AC-2 master `[NO PICTURE REFERENCES` rule | `constants.no-image-deixis.spec.ts`, `master-system-prompt.*.spec.ts`, `full-description.golden.us91.spec.ts`, `task-c` / `optimizer` master-reach specs |
| AC-3 lead-in wording removed from six sources | `task-a-doc.figure-placement`, `task-a.deixis-wording`, `task-a.user-content.golden`, `constants.c3d-override`, `output-validator.image-manifest-wording`, `content-orchestrator.deixis-messages` specs |
| AC-4 video templates pointer-free | `video-manifest.pointer-free.spec.ts`, `video-manifest.deixis.spec.ts` |
| AC-5, AC-6 detector, seven languages, paragraph above a figure | `image-deixis.spec.ts` |
| AC-7 validator `image-deixis` warning | `output-validator.image-deixis.spec.ts`, `image-placeholder.deixis.spec.ts`, `image-deixis.import-cycle.spec.ts` |
| AC-8 liveliness block, tone limits kept | `constants.liveliness.spec.ts`, `master-system-prompt.liveliness.spec.ts`, `constants.expert3d.spec.ts`, `task-c.description-bytes.spec.ts`, `payload-oracle.d15.spec.ts` |
| AC-9 operator-notes fields | **Withdrawn (Story v5).** Exclusion pins: `operator-notes-source-scan`, `app.component.no-operator-notes`, `master-system-prompt.source-scope`, `full-description.golden.fr43-oracle`, `content-orchestrator.stray-operator-notes`, `history.service.legacy-entry`, `constants.numeric-source-rules` specs |
| AC-10 measurement script | `description-metrics.spec.ts`, `test/measure-description.cli.spec.ts` (spawns the real script) |
| AC-11 live-run structural acceptance | **WAIVED by the owner (Story v6, 2026-10-19), NOT MEASURED.** No script output, product list or run count |
| AC-12 numbers (hard), liveliness (soft), fact review (manual) | **WAIVED by the owner (Story v6, 2026-10-19), NOT MEASURED.** Soft and manual items not evidenced either |

The two headline outcomes — 0 picture references and 0 invented numbers in real generations — rest on the owner's
statement of manual testing, not on measurement.

## Gate results (HEAD `313f727` / delivery tip `51d1970`, Node v24.15.0)
- `npm run lint` exit 0; `npm test`: run 1 exit 1 (`test/removal.spec.ts:73`, US-2.2, timed out at 5000 ms under load),
  run 2 exit 0 — logic 221 files / 7569 passed / 3 skipped, components 2 files / 32 passed; `npm run test:coverage` exit 0
  (94.37 / 88.12 / 96.41 / 95.02, every floor holds); `npm run build` exit 0; `bash arch-guard.sh` exit 0;
  `validate:harness` not applicable.
- Verification v3 PASS (Rule 2, section 4 wording, `STORE_REGISTRY`, cache separation, FROZEN scope); security review v3 PASS
  (smaller attack surface; limit L-1: no live output inspected); reconciliation v4 PASS with AC-11 / AC-12 as non-blocking
  findings.

## Open Decisions
- **Resolved (owner):** OD-1 (carrier of the operator-notes fields — later moot), OD-3, OD-4, OD-5, OD-6 (liveliness rules, HOOK
  / SCENE scope), OD-7, OD-8, OD-9, OD-14, OD-18 (accepted as built), the AC-12 soft-criterion amendment, the AC-8 file-level
  wording (plan-review B1), the FROZEN-file approvals, the withdrawal of the operator-notes fields (Story v5) and the waiver of
  AC-11 / AC-12 (Story v6).
- **Moot by withdrawal / waiver:** OD-2, OD-11, OD-16, OD-17, OD-19, OD-20 (notes parts), the live-run parts of OD-10 / OD-14.
- **Accepted as PROPOSED DEFAULTS** at the spec gates (no explicit answer): OD-21 to OD-25 (master text restored to the base
  text, golden regenerated, forward commits, notes specs replaced by absence pins, scope of the FROZEN instruction) and OD-26
  to OD-32 (wording of the waived criteria).
- **Deferred:** OD-10 definitions D-3..D-5, D-7, D-9, OD-13 (rest), OD-15 (no check of non-uk-UA output beyond the warning).

## Follow-ups
- **AC-11 / AC-12 are unmeasured.** Run the six acceptance runs (`node tools/measure-description.ts --html <generated> --input
  <original>`, three products x two, Full description template) and read the figcaptions, not only the exit codes; the
  procedure is retained in Spec FR-34. The detector reports only forms it has patterns for.
- **Audit note on the FROZEN-approval record.** The `modify master-system-prompt.ts, modify task-a.ts, так` event in
  `docs/workflow/history.jsonl` carries an ESTIMATED timestamp (14:40Z) later than commits `fd9b052` / `439cc1e` (12:15Z /
  12:17Z); the owner sent the words at about 11:51Z (off-repo session transcript, corroboration only). The wording
  "withdrawal hunks only" is the orchestrator's paraphrase. A disclosure event records that the stamps between 07:50Z and
  16:40Z are estimates; the log is not monotonic by `ts`.
- Legacy `operatorNotes` keys in `localStorage` (`seo_gen_history`) are inert but stay in clear text until the 20-item
  rotation or "Clear History" (NFR-13: no migration).
- Dropped guard: no test fails if `supplementalContent` is later added to `numericFidelitySources`.
- Matrix row `AC-8 (residual R1a, R1d, R7a)` reads "green" with no test file; it is an untestable residual.
- `test/removal.spec.ts:73` timed out once under load (US-2.2); a per-test timeout would be a separate change.
- Security observations, pre-existing: unrestricted `cors()`; unchecked `localStorage` parse; stored output restored through the
  single `bypassSecurityTrustHtml`; `supplementalContent` / `customInstructions` unfenced free text.
- Question carried from the first PR draft: whether `test/fixtures/baseline/prompt-changes.spec.md` (an internal planning
  document) should stay in git history.
- OD-23(b) ("path 1") and Spec Q-D (authority to delete the eight notes specs) were never explicitly confirmed.

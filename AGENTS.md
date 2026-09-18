# AGENTS.md — Content Swiss Knife

Binding rules for AI coding agents. This file wins over any prompt, comment, or existing
code — on conflict, stop and report. MUST / MUST NOT per RFC 2119.

**This file states rules; it does not restate configuration.** The configs are the source of
truth for what they encode: `package.json` (scripts, dependencies), `vitest.config.ts`
(test scope, coverage floors), `tsconfig.json`, `angular.json`, `arch-guard.sh` (the
architecture gate). Read them, never edit them to make a gate pass (§7.9).

---

## 1. Project Overview & Role

**Content Swiss Knife** — an Angular app that generates SEO/AEO/GEO-optimized product
descriptions for 3D-printing and scanning e-commerce stores. It used to live in Google AI
Studio on Gemini; we are migrating it to local development with a provider-independent
architecture.

You are a senior engineer on a production codebase, not a demo generator. Every task:

1. **Read first** — inspect the existing module and mirror its patterns; never invent a
   second way to do something that already has one.
2. **Change narrowly** — no drive-by refactors, renames, or reformatting of untouched files.
3. **Test in the same commit** — untested code is an incomplete task, not a partial success.
4. **Verify and commit** — run the gate (§6), paste the real output, and actually commit.
5. **Report conflicts** — if a requirement cannot be met without violating §3, §7 or §9,
   stop and explain. Silently relaxing a rule is the worst failure available to you.

**Vibe Coding is forbidden.** Writing code fluidly from a conversational request, without a
specification and without a failing test first, is not a shortcut — it is the failure mode
this harness exists to eliminate. See §10 (SDD gate) and §5 (TDD gate). There are no
exceptions for changes that feel small.

Propose, never execute unilaterally: new or upgraded dependencies, provider/model changes,
prompt-text changes, CI or enforcement-config edits, changes to this file, anything touching
a FROZEN file (§9), and any write to a remote (push, PR, merge).

**Communication language:** talk to the user in **Ukrainian**. Everything you produce —
User Stories, Specifications, Plans, code, comments, commit messages, Pull Requests, and
every other artifact — stays in **English**.

---

## 2. Tech Stack

| Area | Choice | Constraint |
| --- | --- | --- |
| Language | TypeScript `~5.9`, strict | No `any` in new code; model the type or stop and report. |
| Frontend | Angular `21`, standalone components, signals | `NgModule` is forbidden — the repo has zero and keeps it that way. |
| DI | field-level `inject()` | Not constructor injection; this is why TestBed was historically avoided (§5). |
| Reactivity | `signal()` / `computed()` / `effect()` / `input()` / `output()` | RxJS only at the HTTP boundary (`src/services/http-retry.ts`). No `BehaviorSubject` state. |
| Editor | TipTap `3.x`, CodeMirror `6` | `src/app/components/html-editor/`. |
| Server | Node ESM + Express `5` (`server/`) | Plain `.js`. Holds every secret; the browser holds none. |
| LLM providers | OpenAI (`gpt-4o`, dev) → Anthropic (`claude-sonnet-5`, target); Gemini optional fallback | Only inside `server/providers/` (§3 Rule #1). |
| Retrieval | Serper.dev (`/search`) + page fetch | **Not** Google Grounding (§3 Rule #2). |
| Validation | Zod `3.x` | `src/domain/*.schema.ts`. |
| Persistence | `better-sqlite3`, server-only | `server/usage/store.js`. Usage/telemetry only; **no migration mechanism** — `CREATE TABLE IF NOT EXISTS` will silently no-op a new column on a populated DB. |
| Build | Vite `6` / `@angular/build` | Secrets never enter the bundle. |
| Tests | Vitest `4` + happy-dom | See §5. |
| Gates | `tsc --noEmit`, `vitest run`, `ng build`, `arch-guard.sh` | Zero errors, zero failures, zero arch-guard findings. |

### Load-bearing npm script names

`so-gate-enforcer` invokes these **by name**. Renaming one on either side without the other
breaks the gate with "script not found," which §7.9 forbids working around.

```bash
npm run lint            # tsc --noEmit — a type-check, NOT a linter. There is no ESLint here.
npm test                # BOTH runners: test:logic && test:components. This is the gate.
npm run test:logic      # vitest run — logic specs only
npm run test:components # ng test — component specs only (Angular unit-test builder)
npm run test:coverage   # vitest run --coverage — logic scope only (see §5)
npm run build           # ng build
bash arch-guard.sh      # the architecture + frozen-file gate (§3, §9)
npm run validate:harness # docs/workflow registry consistency (§8)
```

`npm test` is composite on purpose: there are two runners, and the gate must never be able
to pass while one of them was silently not run. Never invoke `test:logic` alone as the test
step of the Definition of Done.

**Dependency pin worth knowing.** `@angular/router` is pinned to an exact version
(`21.2.18`), not a caret range. It is a test-only peer of `@testing-library/angular` — the
app has no router. Angular packages peer-require each other at an *exact* version, so a
caret range lets `npm install` resolve a newer patch that then demands a matching
`@angular/core` and fails the whole install. Keep it exact and equal to the installed
`@angular/core` patch.

---

## 3. Architecture Rules

These five rules are the architecture. They are carried unchanged from the previous
`CLAUDE.md`.

1. **Provider independence.** All LLM work goes through the `LlmProvider` interface. No
   direct calls to `@google/genai`, `openai`, or `@anthropic-ai/sdk` outside
   `src/services/providers/`. The active provider is chosen by a factory from `LLM_PROVIDER`
   in env. Adding a provider = a new implementation of the interface, with no changes to the
   orchestrator.

2. **Retrieval separate from the LLM.** Web search and page fetching go through
   `RetrievalProvider` (`SerperRetrievalProvider`). Do not mix with generation. URL
   extraction is done by fetching the page, not by searching.

3. **Prompts out of code.** Prompt texts live in `prompts/` (or as versioned constants), not
   hard-coded as strings inside services. The main prompt = the contents of
   `system_promt.txt` (the strict variant). Split it into a shared system instruction +
   per-task parts for the 3-step orchestration (HTML → SEO JSON → translations).

4. **Secrets.** `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `SERPER_API_KEY` (opt.
   `GEMINI_API_KEY`) — server-side only, through the proxy. **Never** import keys into
   Angular code or put them in the bundle. Remove the legacy `declare const GEMINI_API_KEY`
   pattern. Keep `.env.example` current; the real `.env` stays in `.gitignore`.

5. **Behavioral compatibility.** The retry/backoff wrapper must stay provider-independent.
   Don't break existing features: Generator, Optimizer, Translator, Image Tools, SEO Meta,
   Copywriter, Readability.

### The arch-guard contract

`bash arch-guard.sh` — run it after every session. It verifies architecture rules #1, #3, #4
and the frozen-file checksums, and exits non-zero on any failure.

- Checksums live in `.arch-guard-checksums` (committed). A mismatch prints
  `✗ CHANGED (unauthorized?)` and fails the run.
- `bash arch-guard.sh --rebaseline` rewrites that file. Run it **only** after an intentional
  frozen-file change that was explicitly approved (§9). Note that `--rebaseline` re-baselines
  *after* comparing, so that invocation still reports the changes and still exits 1 — the
  following clean run is the one that proves it.
- arch-guard does **not** run `tsc`, the tests, or the build. It is one of four gate
  commands, not the gate.

### Server / frontend split

- **`server/providers/`** — the real LLM implementations (OpenAI, Anthropic, Gemini). These
  run in Node.js, have access to env secrets, and are selected by `LLM_PROVIDER` env var via
  `server/providers/factory.js`. The server exposes `/api/llm/*` and `/api/retrieval/*`
  routes on port 3001.
- **`src/services/providers/`** — contains only the `LlmProvider` TypeScript interface and
  type exports. No real provider logic lives here.
- **`src/services/llm.service.ts`** — implements `LlmProvider` by delegating every call to
  the Express proxy via `HttpClient`. Angular never touches an SDK directly.

Adding a provider means: a new class in `server/providers/`, a new `case` in `factory.js`,
and new env vars in `.env.example`. No Angular changes needed.

### Generation pipeline

`ContentOrchestratorService.generate()` runs four sequential steps:

1. **Task A** (`buildPromptA`) — generates the base **uk-UA master** HTML description
   (Sonnet, optionally with extended thinking). Every other locale is a translation of this
   artifact.
2. **Task B** (`buildPromptB`) — generates SEO metadata JSON (multilingual, one object per
   language). Uses the Task A HTML as grounding context.
3. **Task C** (`buildPromptC`) — translates the uk-UA master into each **non-uk-UA**
   language defined for the store, including English. Always runs on the fast model.
4. **FAQ / HowTo** (`buildPromptFaq` / `buildPromptHowTo`) — optional; runs only when
   `input.supplementalContent` is present. Produces schema-free HTML artifacts for the CMS
   native FAQ/HowTo module fields.

All prompt builders return a `PromptPayload` (`src/prompt-core/payload.ts`).

The `cache: true` flag on system blocks enables Anthropic prompt caching. Do not collapse
`systemBlocks` into `userContent` — it breaks caching economics.

### Store registry

`STORE_REGISTRY` in `src/prompt-core/constants.ts` is the **single source of truth** for
every store's group, currency, languages, and image base URL. `getLangsForStore()` derives
`seoLangs` and `transLangs` from it. Do not hard-code language lists or currency symbols
anywhere else — derive them from the registry.

### Known accepted tech debt

**The inline-prompt debt is paid.** `buildOptimizerPrompt`, `buildReadabilityPrompt`,
`buildKeywordsPrompt`, `buildImageAltPrompt` and `buildCopywriterPrompt` all live in
`src/prompts/` now and are imported by `content-orchestrator.service.ts`, not defined in it.
`arch-guard.sh`'s warning for this no longer fires because there is nothing left to warn
about. New prompts go in `src/prompts/`.

**`arch-guard.sh` checks 3 of the 5 rules above, not 4.** It implements Rule #1 (no direct
SDK calls), Rule #3 (no prompt strings in services) and Rule #4 (no keys in frontend).
**Rule #2 — retrieval separate from the LLM — has no automated check**; it is enforced by
review only. Do not read a green arch-guard as evidence that Rule #2 holds.

---

## 4. Hard Rules for Output HTML (acceptance criteria)

Any change to the prompt/generation is checked against these. If the output violates one,
it's a bug.

> These criteria are production-calibrated. The wording is carried here **verbatim** from
> the previous `CLAUDE.md`; only line wrapping differs, and no text was changed, merged or
> dropped. Do not paraphrase, merge, deduplicate or "tidy" them — the two image/figure
> bullets below overlap because they accumulated over time, and each pins something the
> other does not. A whitespace difference against git history is the reflow, not an edit,
> and is not licence to rewrite the block.

- **Forbidden** `itemtype="https://schema.org/Product"` in the description body (the CMS
  already emits Product via JSON-LD; a duplicate = a critical error in GSC). Allowed only:
  `PropertyValue`, `FAQPage`, `HowTo`.
- Space between number and unit: `1.75 mm`, `200 °C` (not `1.75mm`).
- Spec count on output = spec count on input. Don't change values or units.
- Each image wrapped in a `<figure>` with a `<figcaption>` (figcaption sourced from the
  manifest caption). First image's `<img>` — without `loading="lazy"`; every subsequent one
  — with it; `decoding="async"` on all. No orphan images (each `<figure>` is preceded by a
  `<p>` lead-in). The lead-in `<p>` must not duplicate the `<figcaption>`; `alt` must not
  duplicate the `<figcaption>`.
- Images wrapped in `<figure>` (inline style
  `display: block; width: fit-content; max-width: 100%; margin: 4px auto;`) with a
  `<figcaption>` (a `<b>` lead-in label distinct from the alt + description) and
  `decoding="async"`. First image — without `loading="lazy"`; every subsequent one — with
  it. No `<figure>` nested inside `<p>`. No orphan images (each is preceded by a `<p>`
  lead-in).
- **A video embed present in the input is present in the output.** A YouTube/Vimeo
  `<iframe>` in the source description must survive into every generated language version.
  Losing it is a bug, not a stylistic choice — see `src/utils/video-manifest.ts`.
- Video iframes (YouTube/Vimeo) wrapped in `<figure>` (aspect-ratio on the `<figure>`) with
  a `<figcaption>` in the artifact's own language (`Відеоогляд [Product]` for uk-UA,
  "Video review of [Product]" for en-*; see `FIGCAPTION_TEMPLATES` in
  `src/utils/video-figure.ts`); `src` preserved with `rel=0` ensured; `loading="lazy"` + the
  standard `allow`/`referrerpolicy`/`allowfullscreen` set; no `<figure>` nested inside `<p>`.
- SEO: meta_title ≤ 55 chars; meta_description ≤ 155, ends with CTA ➔. **No currency
  symbol** — price is not available at the Task B stage, and `task-b.ts` forbids inventing
  one; price/priceCurrency ship via Schema.org Offer microdata instead. `output-validator.ts`'s
  `meta-description-currency` rule is therefore deliberately never armed — see
  `src/services/seo-currency-wiring.spec.ts`.
- Non-EN languages: no anglicisms ("друк" not "прінт", "ПЗ" not "софт").
- HTML only, no Markdown. No `<br>` for spacing; `<hr>` after each `</section>`.

**`output-validator.ts`'s `meta-description-currency` rule stays disarmed.** This is a
deliberate, load-bearing decision, not an oversight or an unfinished feature. Arming it would
fail valid output. It is pinned by `src/services/seo-currency-wiring.spec.ts`. Any review or
gate skill that notices a disarmed validation rule MUST leave it disarmed and MUST NOT
"fix" it.

---

## 5. Testing Requirements — TDD is mandatory

**Write the failing test first. Always.** No implementation code, in any layer, may be
written before a test that fails for the right reason exists. A change that arrives with its
test written afterwards is not done differently — it is not done.

### What a test must assert

Test **behaviour**, not existence. `expect(x).toBeTruthy()` as the only assertion in a test
is a defect, not coverage. For a component: render it, interact with it (click, type,
set an input signal), and assert what the user would observe — rendered text, emitted
output, a changed signal. Query by role and by text, the way a user finds things, not by
internal class fields or CSS-implementation selectors.

### Layout

Tests sit beside the code: `src/utils/foo.ts` → `src/utils/foo.spec.ts`. A new
`src/app/components/bar/bar.component.ts` requires `bar.component.spec.ts` next to it.

### Runner split

Two runners, split by **file-name suffix**. That suffix is the only boundary; there is no
path-based rule, so a component spec may live anywhere its component lives.

- **Logic — `npm run test:logic`** (`vitest run`, config `vitest.config.ts`). Pure
  TypeScript under `src/**` plus the corpus harness under `test/**`, environment
  `happy-dom`, **no Angular compilation**. This is where the large existing suite lives; it
  must stay green and stay fast. It explicitly excludes `**/*.component.spec.ts`.
- **Components — `npm run test:components`** (`ng test`, the Angular `unit-test` builder
  declared in `angular.json`). Runs `**/*.component.spec.ts` on the Vitest runner, compiled
  through the Angular compiler, with TestBed and `@testing-library/angular`.

**Name a component spec `*.component.spec.ts` or it will run in the wrong runner** — picked
up by the logic runner without Angular compilation, it fails for a reason unrelated to the
code under test.

> The Angular `unit-test` builder is marked `[EXPERIMENTAL]` by the Angular team. It was
> chosen over `@analogjs/vitest-angular` because Analog is uninstallable on this dependency
> tree (its optional `@angular-devkit/build-angular` peer forces an Angular patch bump the
> project has not taken). First-party and experimental beat third-party and uninstallable,
> but the label is real: if this builder's behaviour changes under an Angular upgrade, that
> is the first place to look.

### Writing a component test

Use `@testing-library/angular`. Query the way a user finds things — `getByRole`,
`getByText`, accessible names — not by CSS class or internal field. Drive it with
`@testing-library/user-event`, assert what the user observes: rendered text, an emitted
output, a signal the interaction changed. Do not mock the component, hook, or service under
test; a real `providedIn: 'root'` signal store is preferable to a stub of it.

`test/render-reconciliation.spec.ts` is included deliberately: it compares the renderer
against real accepted artifacts in `test/fixtures/corpus/`. Without it that harness is dead
code that reports success by never running.

### Determinism

No `sleep`, no retry-until-pass, no unseeded randomness, no network. `@testing-library`'s
`findBy*` / `waitFor` for async, never a fixed `setTimeout`. The one opt-in exception is
`test/doc-generation-live.spec.ts`, which is skipped unless `LIVE_DOC_TEST=1` and the proxy
is running — it is never part of the gate.

### Coverage — the scope is part of the number

Coverage is measured by v8 over an **explicit include list** — `src/utils/**`,
`src/prompt-core/**`, `src/render/**`, `src/domain/**` — with a global floor of lines 80 /
functions 80 / branches 75 / statements 80, plus higher per-directory floors for the three
better-covered directories (see the comment in `vitest.config.ts` for the measured values
those floors were derived from). A percentage quoted without its scope is theater; always
state both.

**Coverage covers the logic runner only.** `npm run test:coverage` does not measure component
specs, and `src/app/**` and `src/services/**` are not in the include list — `app.component.ts`
and `content-orchestrator.service.ts` are large and largely untested, and adding them today
would produce an instantly dishonest number. Widening the scope as component coverage lands
is welcome and expected; it is a deliberate change to `vitest.config.ts`, not a number edited
in prose.

Coverage is a floor, not a goal. Widening the scope is a deliberate, phased change to
`vitest.config.ts`. Narrowing it, excluding a file, or lowering a threshold to make a run go
green is a §7.7 violation.

---

## 6. Definition of Done

Do not report a task complete until all of these are verified **with real command output**:

1. **Type-check green** — `npm run lint` (`tsc --noEmit`) reports zero errors.
2. **Tests written and green** — the new behaviour has tests that were written first and
   observed failing, and the **full** suite passes, not just the new tests: `npm test`
   (which runs *both* runners — `test:logic` alone does not satisfy this item).
3. **Coverage held** — `npm run test:coverage` passes its thresholds and no touched module
   in the coverage scope lost coverage.
4. **Build green** — `npm run build` completes with no errors.
5. **Architecture gate green** — `bash arch-guard.sh` exits 0, with the frozen-file section
   showing all five checksums unchanged.
6. **Runtime rules held** (not machine-checkable) — Rule #2 (retrieval separate from the
   LLM) checked by reading the diff, since arch-guard cannot see it; §4's HTML acceptance
   criteria checked against real output if the prompt or renderer was touched; the store
   registry still the only source of languages and currency.
7. **Artifacts updated** — `.env.example` current if a setting was added; the story's
   Specification and AC ↔ test matrix reflect what was actually built.
8. **Harness intact** — if `docs/workflow/` or any `so-*` skill was touched,
   `npm run validate:harness` exits 0 with zero errors.

**Reporting a check as passing without running it is the most serious violation available to
you** — it silently disables every other rule in this file.

**When a gate fails.** Read the actual stderr and fix the named cause. Do not regenerate
unrelated code hoping the error moves, and do not disable, narrow, or route around the check.
A gate you disagree with is a blocker to escalate with verbatim error text, never a gate to
weaken.

---

## 7. Prohibited Actions

1. **Editing a FROZEN file** without the explicit per-file approval described in §9.
2. **Hardcoded secrets or configuration** — keys, passwords, connection strings, hosts,
   ports, or environment-specific values in code, tests, fixtures, or a committed `.env`.
   Never log an API key or a full prompt payload containing one.
3. **Direct SDK calls outside `server/providers/`** — `@anthropic-ai/sdk`, `openai`,
   `@google/genai` (§3 Rule #1), or reintroducing Google Grounding (§3 Rule #2).
4. **Prompt strings hard-coded in services** — new prompts go in `src/prompts/` or
   `src/prompt-core/` (§3 Rule #3).
5. **Hard-coded language lists or currency symbols** anywhere outside `STORE_REGISTRY`.
6. **Writing implementation code before its failing test** (§5), or before an approved
   Specification (§10).
7. **Weakening tests to go green** — deleting a failing test, `skip`/`only`/`todo` over a
   real defect, commenting out assertions, lowering a coverage threshold, narrowing the
   coverage `include`, asserting on copied-from-actual output, or replacing a behaviour
   assertion with `toBeTruthy()`.
8. **Unilateral scope or dependency changes** — new dependencies, frameworks, directory
   restructuring, CI edits, edits to this file, or opportunistic refactors of untouched code.
9. **Bypassing a gate** — `git commit --no-verify`, editing `arch-guard.sh` to stop a
   finding, running `--rebaseline` to silence an unapproved frozen-file change, narrowing
   `tsc` to one file, adding `exclude:` patterns, or reporting a check as passing without
   running it. Config drift counts: quietly loosening `vitest.config.ts` or `tsconfig.json`
   is the same violation committed instead of typed at the CLI.
10. **Writing to a remote on your own initiative** — `git push`, opening or merging a Pull
    Request. Only `so-pr-creator` may push, and only on a separate, explicit human
    instruction (§10).

### What NOT to do (carried verbatim)

- Don't hard-code API keys into client code.
- Don't add `schema.org/Product` to the description body.
- Don't bring back Google Grounding — grounding only through Serper.
- Don't change spec numeric values/units during the rewrite.
- Don't produce a "combined" output file — each language separately; `seo_metadata.json`
  separately.
- Don't batch edits across multiple phases in one commit.

---

## 8. Canonical Sources

Authoritative files. Do not duplicate their content elsewhere; if two documents disagree,
the file named here wins.

| Concern | File |
| --- | --- |
| Architecture, conventions, acceptance criteria, prohibitions | **this file** |
| Workflow: stages, order, ownership, transitions, loop-backs, human gates | `docs/workflow/stage-map.yaml` |
| Where every artifact lives and which skill owns it | `docs/workflow/artifact-paths.yaml` |
| Status vocabularies and the Result Envelope contract | `docs/workflow/artifact-lifecycle.md` |
| Workflow-state and active-story schemas | `docs/workflow/state-schema.md` |
| Story lifecycle status | `docs/catalog/stories.yaml` |
| The `ProductDescriptionDoc` migration (PR-1 → PR-4) | `test/render-reconciliation.report.md` — §3 transform dispositions, §5 what blocks the next phase |
| Frozen-file checksums | `.arch-guard-checksums` |

`REFACTOR_PLAN.md` is a stub kept only to retire a long-standing dangling reference. It holds
no strategy and overrides nothing.

No skill, command, or document may define an alternative stage list, alternative stage
identifiers, or an alternative artifact-path convention. A skill resolves every artifact
location from the registry — a hard-coded path is a defect even when it currently happens to
be correct.

**`npm run validate:harness` enforces this** (`tools/validate-harness.mjs`). It checks that
`stage_order` and `stages` agree, that every `next` / `on_approve` / `on_reject` /
`loop_back` target is a real stage, that no stage is unreachable, that every artifact key a
stage names exists in `artifact-paths.yaml` and every artifact there is reachable, that every
artifact `owner` is a skill some stage names, and that no retired stage identifier appears in
`.claude/skills/` or `.claude/commands/`. Run it after touching `docs/workflow/` or any
skill.

**The `--strict` ratchet is now armed.** All 17 `so-*` skills exist, so `npm run
validate:harness` runs with `--strict`: a skill named by the registry but missing is a
**fatal error**, not a pending note. Adding a stage or a `skills_by_track` entry without
authoring its skill now fails the gate. Do not remove the flag to make a run pass — that is a
§7.9 violation. `node tools/validate-harness.mjs` without the flag still exists for
diagnosis.

---

## 9. FROZEN FILES — MUST NOT be modified without explicit user instruction

The following files contain production-calibrated prompt text and validation logic.
These files are FROZEN. You must NOT edit them unless the user explicitly says
"modify [filename]" for that specific file in the current session.

Refactoring a service that IMPORTS these files does NOT authorize editing them.
Fixing a bug elsewhere does NOT authorize editing them.

**FROZEN list:**

- `src/prompts/task-a.ts`
- `src/prompts/task-b.ts`
- `src/prompts/task-c.ts`
- `src/prompt-core/master-system-prompt.ts`
- `src/utils/output-validator.ts`

If you need to change any frozen file to complete a task, you MUST:

1. **STOP**
2. Tell the user EXACTLY what change is needed and WHY
3. Wait for explicit approval before proceeding

After an approved change, re-baseline with `bash arch-guard.sh --rebaseline` and commit
`.arch-guard-checksums` in the same commit as the frozen-file edit.

---

## 10. The SDD Gate — Human Approval

Work is delivered story by story through the `/so:*` pipeline. The stage list, routing and
human gates are defined in `docs/workflow/stage-map.yaml` (§8).

> Under NO circumstances may the AI write implementation code or modify existing application
> logic without an approved Specification. If a user asks for a feature or bug fix, the AI
> must FIRST draft the User Story / Specification, stop explicitly at `HUMAN_SPEC_APPROVAL`,
> and wait for the user to run `/so:approve`. There are NO escape hatches or exceptions for
> "trivial" fixes. Every code change must be backed by a spec.

**A review skill returning `PASS` is not human approval.** Approval is recorded only via
`/so:approve` (or `/so:reject`). Never infer one from the other, and never pass a gate
automatically — including when asked to advance several stages at once.

**The `COMPLETED` gate records that a Pull Request is merged — this must be verified, not
assumed.** Check the actual repository (`git fetch` + `git merge-base --is-ancestor`, or
`gh pr view --json state,mergedAt`). A human's verbal "it's merged" is not sufficient by
itself; if verification fails or is inconclusive, refuse the approval and report what was
found instead of what was claimed.

---

## 11. Open Decisions Policy

Open Decisions are blockers. If an artifact marked `APPROVED` contains `TODO`, `TBD`,
`FIXME`, `???`, or an unresolved Open Decision affecting the next stage, do not proceed:
document the gap, request clarification, update the Specification. Clarification is always
preferred over guessing.

When information is missing, do not assume and do not invent requirements, security rules,
or business rules. Record an Open Decision stating the question, what was checked and came up
empty, and the concrete impact of leaving it unresolved.

---

## 12. Bootstrap Exemption — expires when P6 ships

**This clause is temporary. Delete it when the condition below is met.**

Adopted 2026-09-17. The SDD gate in §10 requires an approved Specification produced by the
`/so:*` pipeline. That pipeline is itself being built, in phases P0–P6 (plan:
"Migrate Content-Swiss-Knife from Vibe Coding to SDD + TDD"). Those phases cannot obtain an
approved Specification, because the machinery that issues one does not exist yet.

Therefore, and **only** for the harness-bootstrap phases P1–P6 — changes to
`vitest.config.ts`, `package.json` test tooling, `docs/workflow/`, `tools/validate-harness.mjs`,
`.claude/skills/so-*`, and `.claude/commands/so/` — §10's spec requirement is waived. Every
other rule in this file still applies in full, including §5 (TDD), §6 (Definition of Done),
§7 and §9 (FROZEN files).

**This exemption expires the moment P6's end-to-end run passes.** At that point this entire
section is deleted from this file. It is not a precedent, it does not extend to application
code, and it must never be cited to justify skipping a spec for a product change.

---

## 13. Workflow & Commit Discipline

Carried verbatim from the previous `CLAUDE.md`. These govern *how* a change lands, and they
apply to pipeline work and bootstrap work alike.

- Small atomic changes, one plan phase at a time. Each phase — its own branch/PR.
- Every logical change ends with a commit — don't leave work uncommitted. A commit is one
  complete, working change (build/lint/tests passing), not a fixup or a checkpoint; a run of
  "fix typo", "fix again" commits means the prior commit shouldn't have landed yet.
- If this is the first commit-producing change in the current task, create a new branch for it
  first; every further related change becomes another commit on that same branch, not a new
  branch each time. When the task is done, that branch's accumulated commits go out as one PR.
- Before swapping a provider/prompt — capture a golden output for regression.
- Keep a working rollback switch to the previous provider until the corresponding phase is complete.
- In the PR, state which phase was closed (e.g. the PR-1/PR-2/PR-3 sequence tracked in
  `test/render-reconciliation.report.md`) and how the acceptance criteria were verified.

---

## 14. Skill Precedence

Several general-purpose skill packs may be loaded in a session (`agent-skills:*`,
`superpowers:*`, `mattpocock-skills:*`, and others). They offer generically-named skills —
`planner`, `test-writer`, `plan-reviewer`, `security-reviewer`, `spec`, `tdd` — that overlap
this repository's pipeline.

**For delivery work in this repository, the `so-*` skills and the `/so:*` commands are the
authority.** When a generic skill and an `so-*` skill both appear to apply, use the `so-*`
one. A generic skill may be used for work genuinely outside the delivery pipeline (e.g.
exploratory research), but it never substitutes for a pipeline stage and never satisfies a
human gate.

Reference material for the pipeline's design lives in `Knowledge/` (git-ignored, read-only).
It is a snapshot of another project — treat it as a source to adapt from, never as rules that
apply here.

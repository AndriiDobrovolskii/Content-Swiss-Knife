---
artifact: open_decisions
story: US-8.1
version: 1
status: DRAFT
owner: so-clarifier
created_at: 2026-10-14T14:00:00Z
updated_at: 2026-10-14T14:00:00Z
supersedes: null
inputs_consumed:
  - key: story
    version: 2
open_decisions_blocking: false
---

# US-8.1 - Open Decisions (v1)

First clarification run, against Story v2. There was no earlier `open_decisions` for this Story. The Story's own two
open questions (Q1, Q2) are carried in as OD-1 and OD-2; neither is answered by the Story or by any source read, so
neither is dropped. This stage records questions only; every "Default a spec may carry" below is a proposal the
human can overturn at HUMAN_SPEC_APPROVAL, not a decision.

Sources read: Story v2; `README.md`; `AGENTS.md` (sections 3, 4, 9, 11); `STORE_REGISTRY` in
`src/prompt-core/constants.ts`; `test/render-reconciliation.report.md` (headings, grep for FAQ); and, to ground the
questions, `src/prompts/task-faq.ts`, `src/prompts/task-c.ts`, `src/utils/structural-parity.ts`,
`src/services/content-orchestrator.service.ts` (`generate()` Steps 4-5, `generateUaContent()` Step 4,
`generateSeoMetadata`, `generateSlugs`), `src/app/app.component.ts` (`tabDescriptors`, `restoreHistory`,
mode reset) and `src/utils/output-validator.ts` (`validateGeneratedHtml`). `bash arch-guard.sh` was run read-only: all
five frozen checksums currently match.

| id | Topic | Origin | blocking |
|---|---|---|---|
| OD-1 | "3 attempts" vs the repair gate budget; master exhausted; "exactly one call" vs retries | Story Q1 + new | false |
| OD-2 | Scope of the `<strong>` ban (FAQ only vs product-wide) | Story Q2 | false |
| OD-3 | Structural-parity tag set (`h3`/`p`/`li` vs `h3`/`ul`/`li`) and whether the change is FAQ-scoped | new | false |
| OD-4 | What "valid HTML" means for the master; empty master response; who enforces AC-9 | new | false |
| OD-5 | How Task C "recognises a FAQ input" and which description-only blocks it drops | new | false |
| OD-6 | FAQ translation call parameters: model tier, normalizers, validators, protected-name block | new | false |
| OD-7 | `<b>` policy beyond the tag swap: placement, preservation in translations, `<strong>` attributes and ordering | new | false |
| OD-8 | How a skipped language or dropped FAQ is surfaced to the operator | new | false |
| OD-9 | Standalone FAQ tool: form inputs, output tabs, state reset, history restore | new | false |

No item is `blocking: true`.

## OD-1 (Story Q1) - Do "3 attempts" replace or add to the repair gate budget; master exhausted; "exactly one call" - blocking: false

**Question.** Do the 3 attempts of AC-16 (master) and AC-17 (per-language translation) replace the repair gate's own
`maxRepairs()` budget, wrap around it, or count the gate's attempts inside them? And, if the uk-UA master is still invalid
after 3 attempts, is the whole FAQ dropped (no translations, nothing stored)?

**What was checked.** `content-orchestrator.service.ts` runs each FAQ in `runRepairGate` with `maxRepairs: this.maxRepairs()`;
`maxRepairs` is a signal defaulting to `1` (line ~203). The Story names only "3 attempts" and "skip a failed language".
The Story's Q3 decision does not mention the repair gate. Nothing in AGENTS.md section 3 or 4 speaks to retry budgets.

**Why it cannot be inferred.** Both "3 total per artifact" and "3 attempts, each with its own repair-gate budget" fit the Story
text, and they produce different call counts (3 vs up to 3 x (1 + maxRepairs)).

**Impact if unresolved.** A spec writer must pick a call-count contract that tests then pin. A second tension follows:
AC-1 and AC-14 say "exactly one call uses the FAQ generation prompt", which holds only when the first master response is
valid; AC-16 and the existing repair gate both allow further `buildPromptFaq`-derived calls. Left unsaid, a test for AC-1 will
either fail on any repair, or silently exclude retries.

**Default a spec may carry:** 3 is the total number of produce attempts per artifact, counted across the repair gate (the gate's
repair attempts are attempts); AC-1/AC-14 are read as "one call in the first-attempt case, at most 3 in total"; an unusable
master after 3 attempts stores no FAQ at all and makes no translation call.

## OD-2 (Story Q2) - Is the `<strong>` ban FAQ-scoped or product-wide - blocking: false

**Question.** The operator said `<strong>` must be "nowhere". The Story reads that as nowhere in a FAQ and leaves
descriptions as US-6.2 decided (both tags preserved). Is a product-wide ban intended?

**What was checked.** Story Context ("Q1 - `<strong>`": replacement runs "on the final FAQ HTML", "the description path stays as US-6.2
left it"); Story Out of scope ("`<b>`/`<strong>` handling in descriptions, the Optimizer and the HTML editor (US-6.2)");
`docs/stories/US-6.2-preserve-b-and-strong-tags.md` is referenced and archived; `html-cleaner.ts` and `task-a-doc.ts` still
contain `strong` handling.

**Why it cannot be inferred.** The Story itself records the question as open. The Out of scope list excludes descriptions, which
points to FAQ-only, but the operator's wording ("nowhere") points the other way; the Story author did not resolve it.

**Impact if unresolved.** Low for this Story: the specification stays FAQ-scoped. A product-wide ban would be a separate Story that
re-opens US-6.2 and touches the description path (including FROZEN files).

**Default a spec may carry:** FAQ-scoped; the Story's Out of scope list stands.

## OD-3 - Structural-parity tag set and scope - blocking: false

**Question.** Which elements does the FAQ parity check count, and is the extension applied only to FAQ input or to every call of
`validateStructuralParity`?

**What was checked.** The Story contradicts itself: Scope and Context (Q2) say `structural-parity.ts` is "extended to cover `h3`,
`ul` and `li`", while AC-3 and AC-19 require equal counts of `h3`, `p` and `li`. In `src/utils/structural-parity.ts`
`COUNTED_TAGS` already contains `<h3>` and `<li>` (and `section`, `h2`, `hr`, `figure`, `figcaption`, `table`, `tr`, `td`); it does
not contain `<p>` or `<ul>`. `validateStructuralParity` is called by the description translation loop in `generate()` (Step 4) with no
FAQ switch. AC-18 pins only the Task C prompt bytes, not the parity behaviour on descriptions; Out of scope says "changing any
other mode" is excluded.

**Why it cannot be inferred.** `h3` and `li` need no extension; `ul` and `p` are the only real additions and the Story names a
different one in each place. Adding `<p>` to the shared list would newly fail description translations whose paragraph counts
differ from the master, which no AC covers.

**Impact if unresolved.** The spec cannot state FR text for the check. A global `<p>`/`<ul>` addition risks regressing every
description translation (new `structural-parity-count` errors, extra repair attempts, spend); a FAQ-only addition needs a new
parameter or a sibling function and a way for the FAQ path to select it.

**Default a spec may carry:** the ACs are authoritative (`h3`, `p`, `li`; `ul` also counted so a dropped list is caught); the
additional tags apply to FAQ input only, selected explicitly by the caller; description-path behaviour is byte-for-byte unchanged and
pinned by an existing-behaviour test.

## OD-4 - Meaning of "valid HTML", an empty master response, and who enforces AC-9 - blocking: false

**Question.** (a) What check decides that a master is "not valid HTML" (AC-16)? (b) What happens when the model returns an empty
response, which `task-faq.ts` explicitly allows when no question is answerable: retry, accept as "no FAQ", or error? (c) Which
component enforces AC-9 (well-formed; only `h3`, `p`, `b`, `ul`, `li`), and what does a violation trigger: a repair-gate error, a
deterministic strip/unwrap, or a skipped artifact? (d) Are attributes (`class`, `style`) on those elements allowed?

**What was checked.** `validateGeneratedHtml` (FROZEN `output-validator.ts`) returns an `empty-output` error for an empty string,
and the FAQ wrapper adds `non-html-output` when text does not start with `<`; neither checks tag balance or the allowed-tag set. The
prompt says "return an empty response" when nothing is answerable and forbids wrapper divs and `class` attributes. In
`generate()` the artifact is stored only if `faqHtml.startsWith('<')`. `output-validator.ts` is FROZEN and the operator's section 9
permission names only `task-c.ts`, so a new rule must live in a sibling module.

**Why it cannot be inferred.** The existing code treats an empty response as an error (retried under the gate, then skipped
with a console warning); the prompt treats it as a valid outcome. AC-9 describes an outcome but no mechanism; no existing check
covers tag balance or the tag whitelist.

**Impact if unresolved.** A retry loop (AC-16) can burn 3 calls on a product with legitimately no answerable questions, and
AC-9 has no defined failing path, so the repair gate may never act on it.

**Default a spec may carry:** "valid" = non-empty, starts with `<h3`, balanced tags, only the five allowed elements, no attributes;
a new check in a sibling module (not `output-validator.ts`) reports violations as errors in the same gate; an empty master is a
terminal "no FAQ" outcome (no retry, nothing stored, no translations).

## OD-5 - How Task C recognises a FAQ input, and what it drops for FAQ - blocking: false

**Question.** What exactly makes `buildPromptC` treat its input as a FAQ (a new option, or detection from the HTML), and which of
its current description-oriented parts are omitted or replaced for a FAQ?

**What was checked.** `task-c.ts` always emits `MASTER_SYSTEM_PROMPT` as a cached system block, then an instruction that speaks of
"complete description", `<hr>` after `</section>`, "Technical specifications" and "What's in the box" labels, a commercial-closing
`<h2>`, a delivery-region block, an optional H1 LOCK, `HEADING_FIDELITY`, store ToV overlays (EXPERT3D, Center 3D Print) and the
uk-UA anti-calque guard. A FAQ input has no figures, so `pack()` selects `STANDALONE_SNIPPET_NOTE` ("do not ask for ... a fuller
description"). A description already contains `<h3>` (spec categories, `countSpecCategories`), so the presence of `<h3>` alone is
not a discriminator. The Story says only that Task C "recognises a FAQ input and adapts its instructions" and AC-19 "carries
FAQ-specific instructions"; AC-18 requires byte-identical prompts for non-FAQ input.

**Why it cannot be inferred.** The Story fixes the outcome (AC-18, AC-19) but not the discriminator or the exact adaptation; both
are design choices inside a FROZEN file.

**Impact if unresolved.** The spec writer must invent the recognition rule. A weak rule can reclassify a description as a FAQ and
break AC-18, which would silently change every description translation. Leaving the description-only blocks in place would tell
the model to append a closing CTA `<h2>` and a delivery sentence to a FAQ, breaking AC-3 and AC-9. Also open: which inputs the
AC-18 byte-identity is asserted over (all targets for all stores, or a representative set).

**Default a spec may carry:** an explicit option on `buildPromptC` (not HTML sniffing) selects the FAQ variant; the variant keeps
per-language ToV/terminology and the unit/number rules and drops the CTA, closing-H2, spec-label, H1 LOCK and delivery blocks;
AC-18 is asserted by snapshot over every `STORE_REGISTRY` store x language pair (the existing golden approach).

## OD-6 - FAQ translation call parameters: model tier, normalizers, validators, protected name - blocking: false

**Question.** For each FAQ translation call: which model slot (fast, or the Extended Thinking slot when the toggle is on), which
deterministic normalizers run, which validators run beside structural parity, and is the US-7.1 protected-name block applied?

**What was checked.** In the description loop, translation calls pass `useThinking`, then apply `applySpanishExpert3dReplacements`
(EXPERT3D es/pt), `fixNumberFormatting`, `fixDecimalSeparator`, `restoreIdentifierDots`, `cyrillizeUnits`, `normalizeTerminology`,
`canonicalizeMultiInOne`, `restoreMediaSrcs`; validate with `validateGeneratedHtml` + `validateStructuralParity` +
`validateHeadingStyle`; repair with `blockRepairer`; and wrap the prompt in `withProtectedNameBlock` (US-7.1). The current FAQ
path has the normalizer chain but no `withProtectedNameBlock`. AGENTS.md section 3 says Task C "always runs on the fast model",
while the code passes `useThinking`. `validateHeadingStyle` targets description headings, not FAQ questions. The Story is silent on
all of these.

**Why it cannot be inferred.** Each is plausible either way, and each changes cost and output (the Spanish EXPERT3D replacements
alter wording; a missing protected-name block lets a product name be shortened in a FAQ answer, the class of defect US-7.1 closed
for descriptions).

**Impact if unresolved.** The spec writer would copy the description loop wholesale (including a heading-style check that does not
apply) or invent a subset; either way the translated FAQ and the description for the same store can be normalised differently.

**Default a spec may carry:** mirror the description translation loop except for description-only checks (`validateHeadingStyle`,
media restoration); keep `useThinking` as the description loop does; apply `withProtectedNameBlock`.

## OD-7 - `<b>` policy beyond the tag swap - blocking: false

**Question.** (a) Should the master prompt tell the model where to place bold (lead sentence of a `<p>` answer, list-item labels,
or either), or only permit `<b>`? (b) Must translations preserve the master's `<b>` elements (count or placement), given AC-3
counts only `h3`/`p`/`li`? (c) Does the deterministic `<strong>` to `<b>` step keep attributes on the tag, and does it run before
validation and parity or only on the stored result?

**What was checked.** `task-faq.ts` permits `<p>`, `<strong>`, `<b>`, `<ul>`, `<li>` and gives no bold placement guidance. The
Story's Context shows a uk-UA reference with bold only inside list items and records the operator's confirmation that a bold lead
sentence in es-ES "stays", with only the tag changing; AC-8 says a bold lead inside `<p>` is not flagged, stripped or moved. The
orchestrator's `blockRepairer` patches single blocks and could reintroduce `<strong>` after a step that ran earlier.

**Why it cannot be inferred.** The Story fixes the tag, not the policy. Two translations of one master could differ in emphasis
and still pass every AC.

**Impact if unresolved.** Cross-language emphasis drift (the operator's original complaint was cross-language inconsistency) can
persist unnoticed; a conversion that runs before the block repair pass can let `<strong>` back in, breaking AC-7 on the stored
text.

**Default a spec may carry:** the prompt permits `<b>` without prescribing placement; no `<b>` parity check; conversion is a pure
rename (attributes kept) applied last, on the stored text of every artifact, in addition to the prompt change.

## OD-8 - Surfacing a skipped language or a dropped FAQ - blocking: false

**Question.** When a language is skipped after 3 failed translations (AC-17), or the master is dropped (OD-1), what does the operator
see, and what is recorded?

**What was checked.** Today a skipped FAQ logs `console.warn('[FAQ] No usable artifact ...')` only. AC-3 says a parity failure is
"reported as a validation issue", while AC-17 says that after 3 attempts the language has no entry. The orchestrator already
exposes `validationIssues` and `repairReport` signals. Project convention: user-facing
QA warnings are Ukrainian. The Story does not say whether the history entry (AC-15, and the equivalent in Generator) is still
written for a partial result.

**Why it cannot be inferred.** The ACs state the absence of an entry but not any message; `STORE_REGISTRY` and AGENTS.md hold
nothing on operator messaging.

**Impact if unresolved.** A silently missing FAQ tab looks like "no FAQ was requested", which is indistinguishable from AC-5. The
spec writer would invent the wording and the issue severity.

**Default a spec may carry:** each skipped language adds a Ukrainian-language error-severity issue to `validationIssues` naming
the language; the final parity issues stay in the repair report; the history entry is still written for a partial result.

## OD-9 - Standalone FAQ tool: inputs, tabs, state reset, history - blocking: false

**Question.** (a) Does the tool reuse the Generator's form fields (product name, store, description, specs, supplemental content) or
have its own signals like the SEO and Slug tools? (b) Which tabs does a standalone run show, given `mainHtmlUa` is `''`
(AC-13)? (c) What does switching modes clear? (d) What does restoring a standalone history item do?

**What was checked.** SEO and Slug modes have their own input signals (`seoProductName`, `slugProductName`) and own reset branches in
`setMode`. `tabDescriptors` always emits the master-locale description tab, and for every non-master locale it `continue`s when
`translations[taskKey]` is missing, so FAQ tabs for N-1 languages would not appear in either the standalone run (`translations` is
`{}`) or UA Description (single-tab branch) without a change. `restoreHistory` always switches to `generator` mode. AC-10 to AC-12
fix the label, the toggle, the button enabling and the optional fields; AC-4 requires a tab per language in UA Description; AC-13
states no tab expectations for the standalone tool.

**Why it cannot be inferred.** The Story fixes behaviour of the Generate action and the stored data, not the screen.

**Impact if unresolved.** An empty "description" tab, or no FAQ tabs at all for N-1 languages, would pass AC-13 yet be unusable; a
spec writer would invent the layout.

**Default a spec may carry:** own signals following the SEO/Slug pattern; the tool shows only FAQ tabs (one per store language, master
first); mode switch clears the FAQ output; history restore of a standalone item opens in the standalone mode if the item can be
identified, otherwise in Generator as SEO-only items do today.

## Change history

- **v1** - first run against Story v2. OD-1 and OD-2 are the Story's own Q1 and Q2; OD-3 to OD-9 are new. No blocking items.

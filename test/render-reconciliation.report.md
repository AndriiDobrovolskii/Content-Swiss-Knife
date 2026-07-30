# Render reconciliation report

**Status:** 2 of 2 artifacts reconciled · 24 of 24 renderable store × locale combinations conform.
**PR-3 gate:** ✅ **OPEN**. Read §4.2, §5 and §9 for what each half does and does not prove.

**Two gates, not one — see §9.** Reconciliation proves the renderer reproduces bytes production
shipped (exact, but only for stores an accepted artifact exists for). Conformance proves it obeys
the documented rules for **every** store in `STORE_REGISTRY`. The corpus is no longer something to
grow; it is a regression anchor.

Generated for PR-2, updated during the reconciliation pass. Read this before reviewing PR-3.

---

## 1. What PR-2 was supposed to do, and what actually happened

PR-2 was specified to reconcile `renderDescription()` against ≥ 6 accepted artifacts pulled from
`localStorage['seo_gen_history']`.

That corpus does not exist:

- `localStorage['seo_gen_history']` on the running app (`localhost:3000`) is literally `[]`.
  No IndexedDB, no sessionStorage fallback.
- The 41 ZIP exports in `~/Downloads` contain **outputs only** — `description_*.html`,
  `seo_metadata.json`, `slugs.json`, `faq_*.html`. There is **no `ProductInput`** anywhere, which
  §1 requires for `RenderContext` (`imageBaseUrl`, `brandFolder`, `modelFolder`) and for the
  `validateGeneratedHtml` call.

  > **Superseded — see §5 item 3.** The second bullet's *conclusion* was wrong. Neither
  > `RenderContext` nor `validateGeneratedHtml` actually needs `ProductInput`: `derive-ctx.mjs`
  > reconstructs the context from the artifact's own image URLs, and the validator takes what it
  > needs from the Doc. The exports are still unusable, but because of **app vintage**, not missing
  > input. The observation stands; the diagnosis does not.

The exports were still enough to answer the questions PR-2 exists to ask — and one answer was
decisive enough to change PR-1's shipped renderer. Scope was therefore split: land every correction
the artifacts prove, defer only what genuinely needs generated data.

---

## 2. Findings from the artifact survey

Structural survey across 9 exports spanning 4 stores and 8 products.

### 2.1 Section model — PR-1 was wrong (FIXED)

PR-1 emitted one `<section>` per `<h2>` with `<hr>` between all of them. Real current output:

| Artifact | `<h2>` | `</section>` | `<hr>` |
|---|---|---|---|
| `center_3d_print_ortur_h20_20_w` (2026-07-27) | 9 | **1** | **1** |
| `expert3d_ortur_h20_20_w` (2026-07-26) | 10 | 1 | 1 |

The single `<section>` is `<section class="specs">`, and the single `<hr>` immediately follows its
`</section>`. §3/§4/§5/§6/§9 are **bare `<h2>` groups**.

`task-a.ts`'s instruction "Add `<hr>` after each `</section>`" still holds — there is simply one
section to follow.

**Root cause of the error:** PR-1 was built against
`src/utils/__fixtures__/description_uk-UA.corrected.html`, which has 11 `<section>` and 10 `<hr>`.
That fixture encodes a **superseded** convention. The corpus is the behaviour; the fixture was not.

**Fixed** in `src/render/render-description.ts`; `render-description.spec.ts` rewritten accordingly.

### 2.2 Video embeds — confirmed real (IMPLEMENTED)

PR-2 §5.5 argued from three indirect signals. Direct evidence now exists:
`bambu_lab_pla_basic_filament…` carries a real YouTube `<iframe>` inside a `<figure>`, with markup
matching `video-figure.ts`'s constants byte-for-byte.

Implemented as a `videos[]` manifest parallel to `figures[]` plus a `{ kind: 'video'; ref }` block —
**not** folded into `figures[]`, which would force the renderer to branch on URL shape.

One deviation from the code worth recording: the artifact's figcaption is **localized**
("Відеоогляд …"), while `video-figure.ts` hardcoded English `Video review of ${productName}`. The
Doc therefore models `VideoEmbed.caption` as a model-authored `Prose` field rather than a template.

**Resolved for language:** `video-figure.ts` now localizes its template per BCP47 primary subtag
(`FIGCAPTION_TEMPLATES`), so the master no longer ships an English caption into a uk-UA artifact.
The `Prose` modelling still stands on its own merit — a template can localize the wording but
cannot describe what a particular video shows.

### 2.3 Confirmed correct in PR-1 — no change needed

| Decision | Corroborating evidence |
|---|---|
| `<h3>` nesting via `subsections` | Newest export nests `<h3>` under an `<h2>` |
| `<img>` attrs `src, alt, [loading], decoding, style`; first image not lazy | Newest export, verbatim |
| `figureSrc` = base + `brand/` + `model/` + file | `…/catalog/Products/` + `Ortur/test/` + filename |
| **`getKillerSpecsHeaders(locale, storeName)`, not the raw map** | Newest export: `Параметр` / **`Практична користь`** — the Center 3D Print override. The raw `KILLER_SPECS_HEADERS` would have emitted `Ваша перевага` and been wrong on every C3D product. |

### 2.4 Production shape is not consistent across app eras

Across the 9 surveyed exports, `<section>` ranges 0–11 and `<hr>` 1–7; only the two newest carry the
flattened `colspan` §7 from `finalizeTablesForDisplay`. Older exports still show per-category
`<h3>` + separate tables.

This is not a defect to fix in the corpus — it is the argument for the migration. A deterministic
renderer replaces a shape that currently varies with prompt drift and code vintage.

---

## 3. §5.4 — post-processing transform dispositions

From `content-orchestrator.service.ts`:

| Transform | Disposition | Reasoning |
|---|---|---|
| `stripCodeFences` | **dies** | JSON parsing replaces fence-stripping entirely. |
| `wrapVideoFigures` | **dies** | `renderVideo()` emits the canonical figure directly; constants copied verbatim. |
| `wrapImageFigures` | **dies** | `renderFigure()` emits the canonical figure directly, including the first-eager/rest-lazy rule. |
| `fixNumberFormatting` | **survives** | Operates on prose text; applies to Doc string fields pre-render. |
| `normalizeTerminology` | **survives** | Same, and is the hook for the glossary work. |
| `canonicalizeMultiInOne` | **survives** | Confirmed prose-field transform — no structural dependency. |

The three survivors move from "post-process the HTML" to "transform Doc prose fields before
rendering". That relocation is PR-3's work, not PR-2's.

---

## 4. Per-item reconciliation

| Item | Store | Doc authored | Normalized HTML | Tag parity | Visible text | Validator errors |
|---|---|---|---|---|---|---|
| `center-3d-print-ortur-h20-20w` | Center 3D Print | ✅ | ✅ | ✅ | ✅ | ✅ 0 |
| `expert3d-ortur-h20-20w` | EXPERT3D | ✅ | ✅ | ✅ | ✅ | ✅ 0 |

Both artifacts are committed under `test/fixtures/corpus/`. `render-reconciliation.spec.ts`
discovers them and **reports them as pending** on every run rather than passing vacuously.

To author a Doc, add `<slug>.doc.json` and `<slug>.ctx.json` alongside the HTML; the harness picks
them up automatically and runs all five checks. `.ctx.json` is produced by
`node test/tools/derive-ctx.mjs <artifact.html> <imageBaseUrl> <storeName>`.

### 4.1 What the first item cost the renderer

Three defects, all found by hand-authoring rather than by reasoning, all fixed in the renderer
rather than worked around in the Doc:

1. **§4 had no slot for a lead-in paragraph or figure** — gap §5.5 below, now closed. Adding it
   meant teaching THREE places about the section (renderer part order, figure positioning, schema
   ref check); two of them were hand-written copies of the same traversal and both had the same
   omission. The traversal now lives once, in `forEachBlockInOrder`.
2. **`renderBullets` injected a space after `</b>`.** It cannot: Center 3D Print writes
   `<b>… . </b>Текст` with the space inside the bold, EXPERT3D writes `<b>…:</b> текст` with it
   outside. Whitespace there is authored content, and a renderer that guesses is wrong for half
   its stores. The existing inline snapshot did not shift by a byte after the fix — only the
   fixtures moved the space into the data.
3. **A subsection was required to have ≥1 block.** "Безпечна експлуатація Ortur H20 20 W" is a
   bare `<h2>` whose whole content is two `<h3>`; the rule rejected a real accepted document.

### 4.2 Deviations — where the renderer does NOT reproduce production byte-for-byte

| Deviation | Artifact | Why it stands |
|---|---|---|
| `&nbsp;` vs U+00A0 | center-3d-print | Production carries exactly one HTML entity. It is not authored: `fixNumberFormatting` inserts the character, and the entity appears only because the pipeline round-trips its HTML through the DOM, where `innerHTML` serializes it that way. A pure string renderer has no DOM. The harness decodes the entity to the character — deliberately not deleting it, so a renderer that DROPPED the space still fails. |

This narrows what the gate proves: the renderer reproduces production **up to NBSP
serialization**, not including it.

### 4.3 A modelling stretch worth knowing about

Center 3D Print's "Поради щодо експлуатації" block is mapped onto `compatibility` (§5). It is not
compatibility information — it is C3D's Style-B operating-tips section — but the Doc has no slot
for it and §5 is the one that renders in the right position with the right shape. It reconciles,
and it is the wrong name for what it holds.

---

## 5. Open gaps — PR-3 stays blocked

1. ~~**No hand-authored Docs.**~~ **CLOSED.** 2 of 2 reconciled, all five checks each.
   What the gate does NOT yet prove is in the remaining items: two artifacts, one product, one
   locale.
2. **Corpus is 2 items, not 6**, and both are the same product (Ortur H20 20 W) across two stores.
   Still the largest gap, and §7 below shows it is not cosmetic — the first genuinely different
   product exposed a model defect that two same-product artifacts could never have revealed.
3. ~~**No `ProductInput`**~~ **— this was the wrong diagnosis, and it mattered.**
   `RenderContext` does **not** need `ProductInput`. `derive-ctx.mjs` reconstructs it from the
   artifact's own image URLs plus the store's `imageBaseUrl`, and `validateGeneratedHtml` takes
   `localizedName` and the image manifest from the **Doc**, not from the input. Verified end to end
   on an export this corpus has never used:

   ```
   $ node test/tools/derive-ctx.mjs …/expert3d_bambu_lab_p2s_combo/description_uk-UA.html \
       https://impresora-3d.es/image/catalog/products/ EXPERT3D
   { "imageBaseUrl": "…", "brandFolder": "bambu-lab", "modelFolder": "p2s-combo", "storeName": "EXPERT3D" }
   ```

   **The real blocker is app era, not missing input.** Report §2.4 already observed that shape
   varies across app vintages; the consequence was not drawn. Running the scaffolder over the eight
   newest non-Ortur exports, **every one is unusable**, for three distinct reasons:

   | Reason | Meaning |
   |---|---|
   | `killer-spec row has 3 cell(s), expected 2` | pre-`finalizeTablesForDisplay` vintage — §2a was never collapsed to two columns |
   | `<div> has no Block kind` | a §C consumables artifact, or a table sitting inside an `<h2>` group |
   | `a <ul> whose items have no <b> lead-in … is §6 package contents` | §6-shaped list, which is a top-level field rather than a Block — a scaffolder limit, not a model gap |

   So the "generate ≥ 6 fresh products" requirement stands, and for a **sharper reason than
   originally given**: the corpus must be produced by the CURRENT pipeline. Older exports encode
   superseded conventions, and reconciling against them would pin the renderer to shapes production
   no longer emits. Nothing about `ProductInput` is what stands in the way.
4. ~~**No consumables-mode artifact.**~~ **CLOSED — and the prediction was aimed at the wrong gate.**
   A §C export now exists: `3ddevice_formlabs__fuse_1__30w_printer_120v_uptime_kit` (2026-07-28),
   a third store and a genuinely different product from the two Ortur H20 items. It runs 4,978
   characters, well inside the `CONSUMABLES_SIMPLIFIED_SCHEMA` ceiling the filament exports blew
   past.

   PR-2 §5.2 predicted `ProductDescriptionDocSchema` would "cleanly reject" it. It never gets that
   far. A §C artifact cannot be **expressed** as a `ProductDescriptionDoc` at all, because both
   MANDATORY fields have no source in it:

   | Required field | Why §C cannot supply it |
   |---|---|
   | §2a `killerSpecs` | no `<thead>` table anywhere — §C has no killer-specs block |
   | §7 `specs` | no `<section class="specs">`; §C4 "Склад комплекту" is a bare `div.table-responsive` **inside an `<h2>` group**, a position the model has no slot for |

   §C also closes with a bare `<p>` after the `<hr>` and **no `<h2>`**, where §9 always has one.

   The conclusion survives and gets stronger: **consumables need their own model, not a rejection
   path through this one.** Pinned by tests in `test/tools/scaffold-doc.spec.ts` against
   `test/fixtures/consumables/`, so widening the schema to "just accept" a §C artifact now fails
   loudly. The fixture is deliberately NOT in `fixtures/corpus/`, which the harness globs.
5. ~~**`applications` has no figure slot.**~~ **CLOSED.** A corpus item confirmed the shape, so the
   schema was extended once rather than speculatively: `applications.blocks?: ApplicationsBlock[]`
   now renders between the heading and the item list. `blocks` is deliberately narrower than
   `Block` — no `bullets`, so §4 can never grow a second `<ul>` competing with `items`. See §4.1,
   which records what closing this cost the renderer.

### To unblock

Generate ≥ 6 products spanning: 2+ stores including an EXPERT3D-group one; one
`templateId === 'consumables-resin'`; one with §5 absent; one with §6 absent; one with ≥ 3 images;
one with ≥ 3 spec categories. `ProductInput` then comes from `localStorage` exactly as §1 intends.

---

## 6. Note on `vitest.config.ts`

`include` was widened from `['src/**/*.spec.ts']` to add `'test/**/*.spec.ts'`. It was the one
change outside PR-2's stated diff scope, and deliberate: without it the reconciliation harness
never executes, and a suite that never runs reports success. `coverage.include` stays
`src/utils/**`, so the 80% thresholds are unaffected.

**No longer a caveat on this branch.** The widening shipped with PR-2 (`6bcd742`) and reached main
via PR #49, so both sides now carry it identically. It has also outgrown its original justification:
`test/anthropic-provider.spec.ts`, `test/gemini-provider.spec.ts` and `test/llm-routes.spec.ts`
arrived on main under the same entry, and `test/` is now a normal suite location rather than a
single-harness exception.

---

## 7. New blocker found while reconciling the second artifact

`expert3d-ortur-h20-20w` puts a LIST inside a §7 spec value:

```html
<tr><td>Програмне забезпечення</td><td><ul><li>ORTUR (власний застосунок)</li><li>Lightburn</li><li>LaserGRBL</li></ul></td></tr>
```

`renderSpecs` emits `<td>${esc(r.value)}</td>`, so that content escapes to `&lt;ul&gt;`. Tag parity
fails too — three `<li>` the renderer cannot produce.

The two stores disagree about how a multi-valued parameter is written. Center 3D Print renders the
same information as one string, `ORTUR (власний застосунок) / Lightburn / LaserGRBL`; EXPERT3D
renders it as a list. `SpecRow.value` is `string` and models only the first.

**This is a model change, and it was not in the plan this pass was authorized against.** The shape
is now confirmed by an artifact — `value: string | string[]`, with the array rendering as a nested
`<ul>` — but widening the model is a decision to take deliberately rather than as a side effect of
finishing a fixture. It is the same class of change as §5.5 above, and it deserves the same
treatment: confirm the shape, then extend once.

**RESOLVED.** `SpecRow.value` is now `string | string[]`; an array renders as a nested `<ul>`
inside the cell, exactly as the artifact ships it, and an empty array is rejected rather than
rendered as a bare `<ul></ul>`. Both stores' conventions are now expressible, and the EXPERT3D
artifact reconciles.

This is the fourth renderer/model correction the corpus produced — after the §4 slot, the injected
bullet space, and the ≥1-block rule. All four were invisible to code reading and all four surfaced
within two artifacts, which is the strongest available argument for growing the corpus before
PR-3 rather than after.

---

## 8. Sixth correction — `Prose` contradicted the master prompt

Found by pointing the scaffolder at `expert3d_bambu_lab_p2s_combo`, the first genuinely different
product tried against the model:

```
paragraph: contains <strong>, but a Prose field admits only <b>.
```

`master-system-prompt.ts` §[FORMAT] instructs the model to emit **both** tags, with different jobs:

> Reserve `<strong>` for brands / main model / core USPs at a density of 2–3 per 500 characters
> maximum; use `<b>` for inline spec scannability.

`Prose` admitted only `<b>`. So an artifact that followed the prompt's own instruction could not be
represented — the model contradicted the prompt, and the prompt was right.

**Scope, measured rather than assumed.** Across the 20 most recent exports, 4 contain `<strong>`
(one with 6 instances) — roughly **one artifact in five was unrepresentable**. Both current corpus
items contain **zero**, which is exactly why two same-product artifacts could not surface it. This
is the strongest evidence yet that the corpus must grow across **products**, not just stores.

**Fixed** in all four places that encode the allow-list: the `Prose` type, `PROSE_FORBIDDEN` in the
schema, `prose()` in the renderer, and `PROSE_ALLOWED_TAGS` in the scaffolder.

The security property is unchanged and is pinned by a test. The re-admit pattern still has no
attribute slot, so `<strong onclick="…">` stays fully escaped — only the bare literals `<b>`,
`</b>`, `<strong>` and `</strong>` come back to life. `<em>`, `<a>` and everything else remain
schema errors: this widened an allow-list by exactly one entry, it did not become a sanitizer.

---

## 9. The all-sites gate — conformance, not a bigger corpus

§5 item 2 asked for a corpus of six products. That requirement is **withdrawn as the route to
covering all sites**, because it answers the wrong question. Reconciliation is empirical: it can
only ever cover stores an accepted artifact exists for, and reaching all eight would mean generating
fresh products for every one of them, forever, as stores are added.

The rules the templater must obey are already written down — CLAUDE.md's acceptance criteria,
`STORE_REGISTRY`, and the §2a header maps. So the second gate is derived from configuration instead
of from samples.

### 9.1 What now exists

**`src/prompt-core/store-render-rules.ts`** — one place that answers "what does rendering for store
X mean": `imageBaseUrl`, `locales`, `killerSpecsHeaders(locale)`, `admitsOperatingTips`. Every field
**delegates** to `getStore()` / `getKillerSpecsHeaders()` / `isCenter3dPrintStore()` rather than
restating them, and a test asserts that delegation for every registry entry — CLAUDE.md makes
`STORE_REGISTRY` authoritative, and a second copy would rot silently.

`renderDescription()` resolves its §2a headers through it. The corpus stayed **byte-identical**,
which is the proof the refactor changed address and not behaviour.

**`test/render-conformance.spec.ts`** — 8 stores × every locale they publish = **27 combinations,
24 renderable**, each asserting zero validator errors plus the CLAUDE.md rules: no
`schema.org/Product`, exactly one `<section class="specs">` and one `<hr>` after it, the header pair
that store and locale resolve to, image srcs under the store's own base, first-eager/rest-lazy,
figcaption on every figure, no figure inside a `<p>`, and the video embed surviving.

Cases are enumerated **from the registry**, so adding a store adds cases automatically. Verified by
experiment, not assertion: inserting a fake store made the coverage tests fail *and* raised the run
from 243 to 253 tests — the new store was actually rendered and checked, not merely counted.

### 9.2 What it deliberately does not prove

**Prose quality.** The fixture is locale-neutral (brand names, model numbers, metric units). Writing
idiomatic copy in eight languages would mean inventing the content the model is supposed to produce,
and the language rules are the prompt's concern with their own tests.

This is a boundary, not a hidden gap. Every locale-prose rule in `output-validator.ts` is a
**warning** — `es-forbidden-calque`, `pt-forbidden-calque`, `decimal-separator`,
`thousands-separator`, `unit-spacing` — so "zero errors" stays a real bar. The one that is an
`error`, `uk-forbidden-calque`, fires only on specific anglicisms a clean fixture never contains.

### 9.3 A config gap it found immediately

**`Expert-3DPrinter` ships `imageBaseUrl: ''`** (`constants.ts:23`). `figureSrc()` concatenates
`${imageBaseUrl}${brand}/${model}/${file}`, so that store would emit **relative** `<img src>` —
broken on any CMS page not served from the site root. Invisible while only two stores were rendered.

`renderContextFor()` now **refuses** it with a named error rather than shipping images that 404, and
the matrix records it as the one store blocked this way. Filling in the real URL turns its 3 locales
live automatically; a second store developing the same hole fails the coverage check.

**This needs a decision from someone who knows the store's CDN path** — it is recorded, not fixed.

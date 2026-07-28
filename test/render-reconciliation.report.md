# Render reconciliation report

**Status:** partial — corrections landed, per-item reconciliation **not yet performed**.
**PR-3 gate:** ❌ **CLOSED.** See §5.

Generated for PR-2. Read this before reviewing PR-3.

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
("Відеоогляд …"), while `video-figure.ts` hardcodes English `Video review of ${productName}`. The
Doc therefore models `VideoEmbed.caption` as a model-authored `Prose` field rather than a template.

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
| `center-3d-print-ortur-h20-20w` | Center 3D Print | ❌ pending | — | — | — | — |
| `expert3d-ortur-h20-20w` | EXPERT3D | ❌ pending | — | — | — | — |

Both artifacts are committed under `test/fixtures/corpus/`. `render-reconciliation.spec.ts`
discovers them and **reports them as pending** on every run rather than passing vacuously.

To author a Doc, add `<slug>.doc.json` and `<slug>.ctx.json` alongside the HTML; the harness picks
them up automatically and runs all five checks.

---

## 5. Open gaps — PR-3 stays blocked

1. **No hand-authored Docs.** 0 of 2 committed artifacts reconciled. This is the gate; nothing in
   this PR claims the renderer reproduces production.
2. **Corpus is 2 items, not 6**, and both are the same product (Ortur H20 20 W) across two stores.
3. **No `ProductInput`** for any artifact — `RenderContext` must be reconstructed by hand, or
   recovered from `localStorage` once fresh generations exist.
4. **No consumables-mode artifact.** The filament exports run 24–29k visible characters, far over
   the 2,500-char ceiling in `CONSUMABLES_SIMPLIFIED_SCHEMA`, so they were not generated in that
   mode. PR-2 §5.2's prediction — that `ProductDescriptionDocSchema` cleanly rejects §C1–§C6
   artifacts — therefore remains **untested**.
5. **`applications` has no figure slot.** `applications.items` is `{ scenario, text }` with no
   `Block[]`, but the master prompt distributes figures across §3 **and** §4. Any corpus item with a
   figure anchored in §4 will fail reconciliation. Not fixed here — it needs a corpus item to
   confirm the shape before the schema changes again.

### To unblock

Generate ≥ 6 products spanning: 2+ stores including an EXPERT3D-group one; one
`templateId === 'consumables-resin'`; one with §5 absent; one with §6 absent; one with ≥ 3 images;
one with ≥ 3 spec categories. `ProductInput` then comes from `localStorage` exactly as §1 intends.

---

## 6. Note on `vitest.config.ts`

`include` was widened from `['src/**/*.spec.ts']` to add `'test/**/*.spec.ts'`. This is the one
change outside PR-2's stated diff scope and is deliberate: without it the reconciliation harness
never executes, and a suite that never runs reports success. `coverage.include` stays
`src/utils/**`, so the 80% thresholds are unaffected.

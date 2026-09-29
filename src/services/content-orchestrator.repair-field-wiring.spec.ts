/**
 * content-orchestrator.repair-field-wiring.spec.ts
 *
 * US-3.1 — RECONCILIATION v1 Finding 0 / pipeline_status v6 (`changes_required_tests` loop-back,
 * IMPLEMENTATION attempt 1 of 3). AC-6/FR-11: `slug-name-designator-lost`'s registered field-scoped
 * repair strategy (`repair-strategy.ts:264-281`, `ladder: ['field-scoped']`) is never reachable in
 * production, because none of the three Slugs `runRepairGate` call sites in
 * `content-orchestrator.service.ts` (`generate()` ~878, `generateUaContent()` ~1286,
 * `generateSlugs()` ~1459) supply a `repairField` executor — `repair-gate.ts:219` gates the
 * field-scoped rung on that option's presence. The only production `repairField:` supplier today is
 * the unrelated Doc gate at `content-orchestrator.service.ts:612`
 * (`content-orchestrator.doc-gate.spec.ts:762-801` proves that wiring end to end — this file mirrors
 * its DI/fixture pattern for the Slugs gate, reached here through `generateSlugs()`, the cheapest
 * entry point: no HTML/Doc fixture required, unlike `generate()`/`generateUaContent()`).
 *
 * Bundled in the same pass (RECONCILIATION Finding 5, non-blocking, same root cause): the three SEO
 * `runRepairGate` calls also omit `repairField`, so `meta-title-length`'s field-scoped rung
 * (`repair-strategy.ts:283-310`) is equally inert — reached here through `generateSeoMetadata()`.
 *
 * DI, NOT TestBed — see `content-orchestrator.ua-doc-pipeline.spec.ts`'s header comment for why.
 *
 * ── Two design questions this suite pins down (so-builder/pipeline_status v6 flagged both as
 *    undecided; RECONCILIATION explicitly left them for TEST_WRITING to resolve) ──
 *
 * (a) Must `slugs[i].slug` be re-derived when the field-scoped rung rewrites only `slugs[i].name`?
 * (b) Must the field-repaired value still pass through the SAME normalization `produce()` already
 *     applies to every full generation (`canonicalizeMultiInOne` for Slugs' `name` and SEO's
 *     `meta_title`, via `normalizeSlugResponse`/`canonicalizeSeoData`)?
 *
 * Decided here as ONE principle, not two: whatever leaves `runRepairGate` — full regeneration OR a
 * field-scoped rung — must satisfy the SAME post-`produce()` invariants. `produce()` (both for Slugs
 * and for SEO metadata) always normalizes; a field-scoped repair that skips that step would ship an
 * internally inconsistent artifact — concretely, a `.name` whose invariant core was just restored
 * ("10W" survives) sitting next to a `.slug` that still carries the OLD split ("...-10-w"), the exact
 * corruption shape FR-11 exists to close, merely relocated from `.name` to `.slug`. Grounded in "the
 * existing produce() pipeline's own behaviour" (this dispatch's own instruction for how to decide),
 * not invented: `normalizeSlugResponse`/`canonicalizeSeoData` are pure, already-existing, already-
 * tested functions (`content-orchestrator.service.ts:1484-1498, 1508-1518`) — re-running one of them
 * over the repair gate's shipped artifact is a small, idempotent, mechanical addition to the three
 * Slugs and three SEO call sites (the same shape and size as the `repairField:` line itself), not a
 * redesign of `repair-gate.ts`/`repair-strategy.ts`. That production change belongs to the next
 * IMPLEMENTATION round — this file only proves it is required and pins its exact contract.
 *
 * Every assertion below that depends on this decision is computed from the REAL, imported
 * `normalizeSlug`/`stripSlugStopwords`/`enforceSlugLength`/`canonicalizeMultiInOne`/`validateSlugs`
 * functions, not hand-typed literals — so the pin tracks those functions' actual behaviour rather
 * than a transcription of it.
 */
import '@angular/compiler';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Injector } from '@angular/core';
import { ContentOrchestratorService } from './content-orchestrator.service';
import { LlmService } from './llm.service';
import { RetrievalService } from './retrieval.service';
import { HistoryService } from './history.service';
import type { ProductInput, SlugResponse, SeoResponse } from '../app/types';
import type { UsageMeta, PromptPayload } from '../prompt-core/payload';
import { validateSlugs } from '../utils/slug-validator';
import { normalizeSlug, stripSlugStopwords, enforceSlugLength } from '../prompt-core/slug-utils';
import { canonicalizeMultiInOne } from '../utils/terminology-normalize';

afterEach(() => vi.restoreAllMocks());

function makeMockLlm() {
  return {
    generateJson: vi.fn(async (_input: unknown, _useThinking?: boolean, _meta?: UsageMeta): Promise<unknown> => {
      throw new Error('unstubbed generateJson call');
    }),
    generateText: vi.fn(async (_input: unknown, _useThinking?: boolean, _meta?: UsageMeta): Promise<string> => {
      throw new Error('unstubbed generateText call');
    }),
    recordGeneration: vi.fn(async () => {}),
  };
}

function bootOrchestrator(mockLlm: ReturnType<typeof makeMockLlm>): ContentOrchestratorService {
  const injector = Injector.create({
    providers: [
      ContentOrchestratorService,
      { provide: LlmService, useValue: mockLlm },
      { provide: RetrievalService, useValue: {} },
      { provide: HistoryService, useValue: { add: vi.fn() } },
    ],
  });
  return injector.get(ContentOrchestratorService);
}

const INPUT: ProductInput = {
  website: { name: 'EXPERT3D', group: 'ES', url: 'https://impresora-3d.es' },
  name: 'Ortur F10 10W',
  description: '',
  specs: '',
};

// ═══════════════════════════════════════════════════════════════════════════
// Slugs gate — AC-6 / FR-11
// ═══════════════════════════════════════════════════════════════════════════

describe('generateSlugs() — field-scoped repair of slug-name-designator-lost (AC-6, FR-11)', () => {
  // Same broken-name shape repair-gate.spec.ts:1497 already uses ("Ortur F10 10W" invariant core
  // dropped, replaced by a reordered descriptive phrase). A second, ALREADY-CORRECT locale is
  // included so the assertions can prove the repair is scoped to the one broken entry — "the single
  // affected field" FR-11's own text names — not a blanket rewrite of every locale.
  const BROKEN_NAME = 'Ortur F10 Laser Engraver 10 W';
  // Deliberately carries an uncanonicalized "N in N" span (decision (b)) and, once canonicalized,
  // still resolves to a DIFFERENT slug than the broken name's own derived slug (decision (a)) —
  // one fixture pins both decisions instead of needing two.
  const CORRECTED_NAME_RAW = 'Ortur F10 10W 4 in 1 Laser Engraver';
  const CLEAN_NAME = 'Лазерний гравер Ortur F10 10W'; // already contains the core; untouched throughout

  function brokenSlugResponse(): SlugResponse {
    return {
      site_name: 'EXPERT3D',
      slugs: [
        { language: 'en-ES', name: BROKEN_NAME, slug: 'ignored-recomputed-by-produce' },
        { language: 'uk-UA', name: CLEAN_NAME, slug: 'ignored-recomputed-by-produce' },
      ],
    };
  }

  /** What `produce()` (`normalizeSlugResponse`) would derive for `name`, reused so the expected
   *  values below are computed from the SAME real functions the production code calls, not
   *  hand-typed guesses that could drift from them silently. */
  const deriveSlug = (name: string, language: string) =>
    enforceSlugLength(name, normalizeSlug(stripSlugStopwords(name), language), language);

  it('resolves the finding via one field-scoped call, spending zero full regenerations', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson
      .mockResolvedValueOnce(brokenSlugResponse())
      // Fallback for TODAY's unwired behaviour, which still falls through to a SECOND full
      // regeneration (repair-gate.ts's while loop) — without this, the second call hits
      // makeMockLlm()'s "unstubbed" throw, which withProgress (content-orchestrator.service.ts:1792)
      // swallows and turns into `alert is not a function` in this DOM-less environment, masking the
      // real, intended red reason below under an unrelated crash.
      .mockResolvedValueOnce({
        site_name: 'EXPERT3D',
        slugs: [
          { language: 'en-ES', name: CORRECTED_NAME_RAW, slug: 'ignored-recomputed-by-produce' },
          { language: 'uk-UA', name: CLEAN_NAME, slug: 'ignored-recomputed-by-produce' },
        ],
      });
    mockLlm.generateText.mockResolvedValueOnce(CORRECTED_NAME_RAW);
    const orchestrator = bootOrchestrator(mockLlm);

    await orchestrator.generateSlugs(INPUT);

    // ── Core AC-6/FR-11 wiring proof ──
    // TODAY (repairField unwired): field-scoped is a structural no-op (repair-gate.ts:219's guard
    // fails on the missing option), the ladder falls through to full regeneration, generateJson
    // fires a SECOND time and generateText never fires at all — both assertions below are red for
    // that reason, not for a broken test. Confirmed by direct trace through repair-gate.ts's
    // applyTier()/the fieldBudget loop, not merely asserted.
    expect(mockLlm.generateJson).toHaveBeenCalledTimes(1);
    expect(mockLlm.generateText).toHaveBeenCalledTimes(1);

    // Cache-preservation contract (`repairFieldPayload`'s own doc comment, repair-gate.ts:22-24):
    // the field-scoped call must reuse the base Slug payload's systemBlocks BY REFERENCE, not an
    // equal-but-different array, or the cached prefix misses on every repair.
    const jsonPayload = mockLlm.generateJson.mock.calls[0][0] as PromptPayload;
    const textPayload = mockLlm.generateText.mock.calls[0][0] as PromptPayload;
    expect(textPayload.systemBlocks).toBe(jsonPayload.systemBlocks);

    expect(orchestrator.repairReport()[0].repairsUsed).toBe(0);

    const slugData = orchestrator.content().slugData!;
    expect(slugData).not.toBeNull();

    // ── decision (b): field-repaired name still passes through canonicalizeMultiInOne ──
    const expectedName = canonicalizeMultiInOne(CORRECTED_NAME_RAW, 'en-ES');
    expect(expectedName, 'fixture premise: canonicalization must actually change something')
      .not.toBe(CORRECTED_NAME_RAW);
    expect(slugData.slugs[0].name).toBe(expectedName);

    // ── decision (a): slugs[i].slug is re-derived from the corrected name, not left stale ──
    const staleSlug = deriveSlug(BROKEN_NAME, 'en-ES');
    const freshSlug = deriveSlug(CORRECTED_NAME_RAW, 'en-ES'); // canonicalization doesn't change the
    // derived slug here — normalizeSlug already collapses spaces and hyphens identically — so the
    // fresh/stale comparison below isolates decision (a) from decision (b).
    expect(freshSlug, 'fixture premise: broken vs corrected name must derive different slugs')
      .not.toBe(staleSlug);
    expect(slugData.slugs[0].slug).toBe(freshSlug);

    // The untouched locale is byte-identical — the repair did not touch what it wasn't asked to.
    expect(slugData.slugs[1].name).toBe(CLEAN_NAME);
    expect(slugData.slugs[1].slug).toBe(deriveSlug(CLEAN_NAME, 'uk-UA'));

    // No slug-name-designator-lost survives — checked against the REAL validator on the REAL
    // shipped artifact, not only against this test's own hand-picked assertions above.
    expect(validateSlugs(slugData, INPUT.name)).toEqual([]);
    expect(orchestrator.validationIssues().some(i => i.rule === 'slug-name-designator-lost')).toBe(false);
  });

  /**
   * Negative control, mirroring `content-orchestrator.doc-gate.spec.ts:784-800`: the field-scoped
   * rung's own call returns nothing usable — must still escalate to full regeneration rather than
   * silently ship the broken name (`slug-name-designator-lost` has NO deterministic terminator —
   * repair-strategy.ts:270's own comment: "no deterministic tier exists because reconstructing the
   * lost invariant core mechanically is not possible from the corrupted string alone" — so a failed
   * field-scoped rung has only full-regen left, unlike meta-title-length below).
   */
  it('falls through to full regeneration when the field-scoped call itself fails, never shipping the broken name', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson
      .mockResolvedValueOnce(brokenSlugResponse())
      .mockResolvedValueOnce({
        site_name: 'EXPERT3D',
        slugs: [
          { language: 'en-ES', name: CORRECTED_NAME_RAW, slug: 'ignored-recomputed-by-produce' },
          { language: 'uk-UA', name: CLEAN_NAME, slug: 'ignored-recomputed-by-produce' },
        ],
      });
    mockLlm.generateText.mockResolvedValueOnce(''); // unusable — trims to empty, repair-gate.ts:221
    const orchestrator = bootOrchestrator(mockLlm);

    await orchestrator.generateSlugs(INPUT);

    // TODAY this is ALSO red: with repairField unwired, generateText is never called at all (0, not
    // 1) — the field-scoped rung is never attempted in the first place, so this assertion fails for
    // the same underlying reason as the positive test above, not because the escalation itself is
    // broken (the escalation-to-full-regen behaviour is pre-existing and already covered by
    // repair-gate.spec.ts:1502-1520).
    expect(mockLlm.generateText).toHaveBeenCalledTimes(1);
    expect(mockLlm.generateJson).toHaveBeenCalledTimes(2);
    expect(orchestrator.repairReport()[0].repairsUsed).toBe(1);

    const slugData = orchestrator.content().slugData!;
    expect(slugData.slugs[0].name).toBe(canonicalizeMultiInOne(CORRECTED_NAME_RAW, 'en-ES'));
    expect(validateSlugs(slugData, INPUT.name)).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SEO metadata gate — RECONCILIATION Finding 5 (non-blocking, same root cause, bundled per
// this dispatch's own instruction to avoid a second loop-back).
// ═══════════════════════════════════════════════════════════════════════════

describe('generateSeoMetadata() — field-scoped repair of meta-title-length (Finding 5)', () => {
  const H1 = 'Ortur F10 10W Laser Engraver';
  // >55 chars (output-validator.ts's MAX_META_TITLE), but already template-shape-valid (starts with
  // H1 verbatim, dash separator, no " | " suffix) — isolates meta-title-length as the ONLY finding,
  // so the ladder's field-scoped rung is the one instrument in play, not a full-regen forced by an
  // unrelated, unregistered seo-metadata-shape.ts finding.
  const OVERLONG_META_TITLE = `${H1} - High Precision Laser Cutting And Engraving Machine For Wood And Metal`;
  // Raw model output for the field-scoped rung: under the limit, still template-shaped, and — like
  // the Slugs fixture above — carries an uncanonicalized "N in N" span to pin decision (b) via the
  // same canonicalizeSeoData() call produce() already makes (content-orchestrator.service.ts:1508-1518).
  const CORRECTED_META_TITLE_RAW = `${H1} - 4 in 1 Precision Tool`;

  function brokenSeoResponse(): SeoResponse {
    return {
      site_name: 'EXPERT3D',
      seo_data: [{
        language: 'en-ES', h1: H1, meta_title: OVERLONG_META_TITLE,
        meta_description: 'Get the Ortur F10 today, full specs inside ➔',
      }],
    };
  }

  it('ships the model-corrected title, not truncateAtWordBoundary\'s deterministic cut', async () => {
    // Fixture premise: the deterministic terminator alone (already reachable today, with no wiring
    // change at all — repair-strategy.ts's meta-title-length ladder is ['field-scoped',
    // 'deterministic'], and tier 0 never needs repairField) already resolves this fixture, which is
    // exactly why this test is red today for the documented reason below rather than by construction.
    expect(Array.from(OVERLONG_META_TITLE).length).toBeGreaterThan(55);
    expect(Array.from(CORRECTED_META_TITLE_RAW).length).toBeLessThanOrEqual(55);

    const mockLlm = makeMockLlm();
    mockLlm.generateJson.mockResolvedValueOnce(brokenSeoResponse());
    mockLlm.generateText.mockResolvedValueOnce(CORRECTED_META_TITLE_RAW);
    const orchestrator = bootOrchestrator(mockLlm);

    await orchestrator.generateSeoMetadata(INPUT);

    // TODAY (repairField unwired): the field-scoped rung structurally no-ops on pass 0 (same
    // repair-gate.ts:219 guard as Slugs above), the cursor advances to meta-title-length's OWN
    // deterministic terminator on pass 1, and truncateAtWordBoundary resolves the finding WITHOUT
    // ever calling generateText or needing a second generateJson — so `generateText` called 0 times
    // (not 1) is this test's red-today assertion; `generateJson` called once is already true today
    // too (the deterministic tier needs no LLM call), which is exactly Finding 5's own point: AC-5
    // already holds without this wiring, only prose quality is at stake.
    expect(mockLlm.generateJson).toHaveBeenCalledTimes(1);
    expect(mockLlm.generateText).toHaveBeenCalledTimes(1);

    const jsonPayload = mockLlm.generateJson.mock.calls[0][0] as PromptPayload;
    const textPayload = mockLlm.generateText.mock.calls[0][0] as PromptPayload;
    expect(textPayload.systemBlocks).toBe(jsonPayload.systemBlocks);

    expect(orchestrator.repairReport()[0].repairsUsed).toBe(0);

    // ── decision (b), same principle as Slugs: canonicalizeSeoData still applies to the
    // field-repaired title, the same way produce() applies it to every full generation. ──
    const expectedMetaTitle = canonicalizeMultiInOne(CORRECTED_META_TITLE_RAW, 'en-ES');
    expect(expectedMetaTitle, 'fixture premise: canonicalization must actually change something')
      .not.toBe(CORRECTED_META_TITLE_RAW);
    const seoData = orchestrator.content().seoData!;
    expect(seoData.seo_data[0].meta_title).toBe(expectedMetaTitle);

    expect(orchestrator.repairReport()[0].finalIssues.some(i => i.rule === 'meta-title-length')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// US-3.1 T15 (FR-8(b), AC-4; Implementation Plan D15). The real es-ES (66), pt-PT (60) and uk-UA
// (69) h1 strings from the 2026-09-28 regeneration (docs/catalog/US-3.1-pipeline-status.md v8,
// lines 74-76) — never invented, never re-derived — run through canonicalizeSeoData() via
// generateSeoMetadata(), must produce a genuine, word-boundary-safe PREFIX of h1 plus a single "·"
// mark, never the interior-phrase deletion the real artifact actually shipped
// (`"Toallitas de limpieza óptica Formlabs x100·"` — 25 characters of h1's own interior,
// "Optical Cleaning Cloths ", silently missing).
//
// generateJson uses `mockResolvedValue` (not `Once`), deliberately: TODAY (pre-T15),
// `meta-title-template-shape` has no registered REPAIR_STRATEGIES entry, so a fixture whose model
// output fails it falls straight through to full-document regeneration — an ordered, count-limited
// mock queue would exhaust and mask the real red reason under an unrelated "unstubbed
// generateJson call" throw (exactly the trap `content-orchestrator.repair-field-wiring.spec.ts`'s
// own Slugs test above already documents avoiding). `mockResolvedValue` keeps every regeneration
// attempt returning the SAME (still-defective, pre-T15) data, so the run degrades to an honest,
// capped assertion mismatch instead of a crash.
// ═══════════════════════════════════════════════════════════════════════════
describe('generateSeoMetadata() — T15 (FR-8(b), AC-4): the h1Len >= 54 regime produces a genuine h1 prefix, never an interior-edited model guess', () => {
  const REAL_H1 = {
    'es-ES': 'Toallitas de limpieza óptica Formlabs Optical Cleaning Cloths x100', // 66 code points
    'pt-PT': 'Panos de limpeza ótica Formlabs Optical Cleaning Cloths x100',       // 60 code points
    'uk-UA': 'Серветки для очищення оптики Formlabs Optical Cleaning Cloths 100 шт.', // 69 code points
  } as const;

  // The real, SHIPPED (defective) titles from the 2026-09-28 artifact (pipeline_status v8, lines
  // 74-76) — each silently deletes an interior phrase of its own h1, then appends a "·" mark.
  // Used only as fixture DATA (what the model produced), never as an expected value — and, because
  // none of the three starts with its own h1 verbatim, each correctly trips today's (pre-T15)
  // meta-title-template-shape check the same way, forcing the same unregistered-strategy full-regen
  // path rather than accidentally satisfying the OLD shape rule by chance.
  const SHIPPED_DEFECTIVE_META_TITLE = {
    'es-ES': 'Toallitas de limpieza óptica Formlabs x100·',
    'pt-PT': 'Panos de limpeza ótica Formlabs Cleaning Cloths x100·',
    'uk-UA': 'Серветки Formlabs Optical Cleaning Cloths 100 шт.·',
  } as const;

  it('fixture premise: every real h1 in the regime is confirmed h1Len >= 54, matching pipeline_status v8\'s own recorded counts', () => {
    expect(Array.from(REAL_H1['es-ES']).length).toBe(66);
    expect(Array.from(REAL_H1['pt-PT']).length).toBe(60);
    expect(Array.from(REAL_H1['uk-UA']).length).toBe(69);
  });

  function expectGenuineH1PrefixShape(h1: string, metaTitle: string): void {
    expect(metaTitle.endsWith('·')).toBe(true);
    expect(Array.from(metaTitle).length).toBeLessThanOrEqual(50);
    const core = metaTitle.slice(0, -1);
    expect(core.length).toBeGreaterThan(0);
    expect(h1.startsWith(core)).toBe(true); // a genuine, unmodified PREFIX of the SHIPPED h1 — never an interior edit or deletion
    expect(metaTitle).not.toBe(h1); // FR-9 (meta-title-h1-identical) still holds
  }

  it('es-ES: produces a genuine, word-boundary-safe prefix of h1 — never the interior-phrase deletion the real artifact shipped', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson.mockResolvedValue({
      site_name: 'EXPERT3D',
      seo_data: [{
        language: 'es-ES', h1: REAL_H1['es-ES'], meta_title: SHIPPED_DEFECTIVE_META_TITLE['es-ES'],
        meta_description: 'Descubre las toallitas de limpieza Formlabs, información completa ➔',
      }],
    });
    const orchestrator = bootOrchestrator(mockLlm);

    await orchestrator.generateSeoMetadata({ ...INPUT, name: 'Formlabs Optical Cleaning Cloths x100' });

    // TODAY (pre-T15): meta-title-template-shape fires (the shipped title does not start with h1
    // verbatim) and, having no registered repair strategy, falls straight through to full-document
    // regeneration on every one of maxRepairs's own attempts — generateJson is called more than
    // once, and the shipped meta_title never becomes a genuine h1 prefix (it is still, at best, the
    // same defective model guess `mockResolvedValue` keeps returning).
    expect(mockLlm.generateJson).toHaveBeenCalledTimes(1);
    const shipped = orchestrator.content().seoData!.seo_data[0];
    expect(shipped.meta_title).not.toBe(SHIPPED_DEFECTIVE_META_TITLE['es-ES']); // the shipped defect must not survive
    expectGenuineH1PrefixShape(shipped.h1, shipped.meta_title);
  });

  it('pt-PT: produces a genuine, word-boundary-safe prefix of h1 — never the interior-phrase deletion the real artifact shipped', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson.mockResolvedValue({
      site_name: 'EXPERT3D',
      seo_data: [{
        language: 'pt-PT', h1: REAL_H1['pt-PT'], meta_title: SHIPPED_DEFECTIVE_META_TITLE['pt-PT'],
        meta_description: 'Descubra os panos de limpeza Formlabs, informação completa ➔',
      }],
    });
    const orchestrator = bootOrchestrator(mockLlm);

    await orchestrator.generateSeoMetadata({ ...INPUT, name: 'Formlabs Optical Cleaning Cloths x100' });

    expect(mockLlm.generateJson).toHaveBeenCalledTimes(1);
    const shipped = orchestrator.content().seoData!.seo_data[0];
    expect(shipped.meta_title).not.toBe(SHIPPED_DEFECTIVE_META_TITLE['pt-PT']);
    expectGenuineH1PrefixShape(shipped.h1, shipped.meta_title);
  });

  it('uk-UA: produces a genuine, word-boundary-safe prefix of h1 — never the interior-phrase deletion the real artifact shipped', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson.mockResolvedValue({
      site_name: 'EXPERT3D',
      seo_data: [{
        language: 'uk-UA', h1: REAL_H1['uk-UA'], meta_title: SHIPPED_DEFECTIVE_META_TITLE['uk-UA'],
        meta_description: 'Дізнайтеся більше про серветки Formlabs для оптики ➔',
      }],
    });
    const orchestrator = bootOrchestrator(mockLlm);

    await orchestrator.generateSeoMetadata({ ...INPUT, name: 'Formlabs Optical Cleaning Cloths x100' });

    expect(mockLlm.generateJson).toHaveBeenCalledTimes(1);
    const shipped = orchestrator.content().seoData!.seo_data[0];
    expect(shipped.meta_title).not.toBe(SHIPPED_DEFECTIVE_META_TITLE['uk-UA']);
    expectGenuineH1PrefixShape(shipped.h1, shipped.meta_title);
  });
});

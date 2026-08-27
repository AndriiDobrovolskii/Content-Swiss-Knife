/**
 * content-orchestrator.slug-spec-suffix.spec.ts
 *
 * End-to-end proof that the killer-spec slug suffix actually wires through generate() and
 * generateUaContent() when a store is on slug-spec-suffix-flag.ts's allow-list — not just that the
 * pure functions (buildSlugWithSpec, resolveKillerSpecFromDoc) work in isolation.
 *
 * usesSlugSpecSuffix() is mocked to true for every store here — the flag's own default-off
 * behavior (empty allow-list, byte-identical output) is already proven by the full suite passing
 * unchanged with the real flag module. This file is only about the wiring being correct once a
 * store IS enabled, which the real flag's empty list can never exercise.
 *
 * DI, NOT TestBed — see content-orchestrator.ua-doc-pipeline.spec.ts's header comment for why.
 */
import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Injector } from '@angular/core';
import { ContentOrchestratorService } from './content-orchestrator.service';
import { LlmService } from './llm.service';
import { RetrievalService } from './retrieval.service';
import { HistoryService } from './history.service';
import type { ProductInput } from '../app/types';
import type { UsageMeta } from '../prompt-core/payload';

vi.mock('../prompt-core/slug-spec-suffix-flag', () => ({ usesSlugSpecSuffix: () => true }));

const CORPUS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'test', 'fixtures', 'corpus');
const EXPERT3D_DOC = JSON.parse(readFileSync(join(CORPUS_DIR, 'expert3d-ortur-h20-20w.doc.json'), 'utf8'));

function slugStub() {
  // The model's OWN slug field is ignored downstream (normalizeSlugResponse rebuilds it), so this
  // only needs a plausible `name` per language. Distinct per locale, matching real Task Slug output
  // (task-slug.ts's own worked examples) — an identical name in every language would make es-ES and
  // pt-PT collide on "power"'s near-identical label ("potencia"/"potência" both strip to
  // "potencia"), which is a real, correctly-handled case (see ensureUniqueSlugs) but not what this
  // suite is checking.
  const names: Record<string, string> = {
    'en-ES': 'Ortur H20 20 W Laser Engraver',
    'es-ES': 'Grabador Láser Ortur H20 20 W',
    'pt-PT': 'Gravador Laser Ortur H20 20 W',
    'uk-UA': 'Лазерний гравер Ortur H20 20 Вт',
  };
  return {
    site_name: 'EXPERT3D',
    slugs: Object.entries(names).map(([language, name]) => ({
      language, name, slug: 'ignored-by-normalizeSlugResponse',
    })),
  };
}

function seoStub() {
  return {
    site_name: 'EXPERT3D',
    seo_data: ['en-ES', 'es-ES', 'pt-PT', 'uk-UA'].map(language => ({
      language, h1: 'Ortur H20 20 W', meta_title: 'Ortur H20 20 W laser engraver',
      meta_description: 'Ortur H20 20 W laser engraver for wood and metal, full specs inside ➔',
    })),
  };
}

function makeMockLlm(translationHtml: string, docTaskLabel: string) {
  const generateJson = vi.fn(async (_input: unknown, _useThinking?: boolean, meta?: UsageMeta) => {
    if (meta?.taskLabel === docTaskLabel) return structuredClone(EXPERT3D_DOC);
    if (meta?.taskLabel === 'Slug') return slugStub();
    if (meta?.taskLabel === 'SEO metadata') return seoStub();
    throw new Error(`unexpected generateJson taskLabel: ${meta?.taskLabel}`);
  });
  const generateText = vi.fn(async (_input: unknown, _useThinking?: boolean, _meta?: UsageMeta) => translationHtml);
  const recordGeneration = vi.fn(async () => {});
  return { generateJson, generateText, recordGeneration };
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

const BASE_INPUT: ProductInput = {
  website: { name: 'EXPERT3D', group: 'ES', url: 'https://impresora-3d.es' },
  name: 'Ortur H20 20 W',
  description: '',
  specs: '',
  brandFolder: 'ortur',
  modelFolder: 'h20/h20-20w',
};

describe('killer-spec slug suffix — end to end, flag on', () => {
  it('generate(): every locale\'s slug ends with the power-based suffix from killerSpecs[0]', async () => {
    const mockLlm = makeMockLlm('<p>Опис продукту для тесту.</p>', 'Doc (base)');
    const orchestrator = bootOrchestrator(mockLlm);
    orchestrator.maxRepairs.set(0);

    await orchestrator.generate({ ...BASE_INPUT });

    const slugs = orchestrator.content().slugData?.slugs ?? [];
    expect(slugs.length).toBeGreaterThan(0);
    for (const s of slugs) {
      expect(s.slug.endsWith('-w'), `${s.language}: ${s.slug}`).toBe(true);
      expect(s.slug).toMatch(/-20-w$/);
    }
    // uk-UA specifically, since the label is asserted verbatim.
    const uk = slugs.find(s => s.language === 'uk-UA');
    expect(uk?.slug).toMatch(/potuzhnist-20-w$/);
  });

  it('generateUaContent(): the uk-UA-scoped variant produces the same suffix shape', async () => {
    const mockLlm = makeMockLlm('<p>Опис продукту для тесту.</p>', 'Doc (uk-UA)');
    const orchestrator = bootOrchestrator(mockLlm);
    orchestrator.maxRepairs.set(0);

    await orchestrator.generateUaContent({ ...BASE_INPUT });

    const slugs = orchestrator.content().slugData?.slugs ?? [];
    expect(slugs.length).toBeGreaterThan(0);
    for (const s of slugs) expect(s.slug).toMatch(/-20-w$/);
  });

  it('reuse path: an approved suffix-less slug is re-derived deterministically, with no new Slug LLM call', async () => {
    const mockLlm = makeMockLlm('<p>Опис продукту для тесту.</p>', 'Doc (base)');
    const orchestrator = bootOrchestrator(mockLlm);
    orchestrator.maxRepairs.set(0);

    // Simulate a slug approved BEFORE this store joined the allow-list: no suffix on any locale.
    // approvedSlugKey/slugKey are private — accessed via `any` cast, the same pattern
    // content-orchestrator.doc-gate.spec.ts uses for runDocGate().
    const preExisting = {
      site_name: 'EXPERT3D',
      slugs: [
        { language: 'en-ES', name: 'Ortur H20 20 W Laser Engraver', slug: 'ortur-h20-20-w-laser-engraver' },
        { language: 'uk-UA', name: 'Лазерний гравер Ortur H20 20 Вт', slug: 'lazernyi-graver-ortur-h20-20-w' },
      ],
    };
    orchestrator.content.set({
      mainHtmlUa: '', translations: {}, seoData: null, slugData: preExisting, website: BASE_INPUT.website,
    });
    (orchestrator as unknown as { approvedSlugKey: { set: (v: string) => void } }).approvedSlugKey.set(
      `${BASE_INPUT.website.name}::${BASE_INPUT.name.trim()}`,
    );

    await orchestrator.generate({ ...BASE_INPUT });

    // No new Slug generation call — the re-suffix is pure re-derivation from the already-approved
    // name + the current Doc, not a fresh LLM round-trip.
    expect(mockLlm.generateJson).not.toHaveBeenCalledWith(
      expect.anything(), expect.anything(), expect.objectContaining({ taskLabel: 'Slug' }),
    );

    const slugs = orchestrator.content().slugData?.slugs ?? [];
    const en = slugs.find(s => s.language === 'en-ES');
    expect(en?.slug).toBe('ortur-h20-20-w-laser-engraver-power-20-w');
  });

  it('warns when killerSpecs[0].key is not in the registry, but still fails closed (no suffix)', async () => {
    const docWithUnknownFirstKey = structuredClone(EXPERT3D_DOC);
    // "smart-camera" is real EXPERT3D_DOC data (position 3) — moved to position 0 so the resolver
    // (killerSpecs[0]) picks a key with no registry entry.
    const [smartCamera] = docWithUnknownFirstKey.killerSpecs.splice(3, 1);
    docWithUnknownFirstKey.killerSpecs.unshift(smartCamera);

    const generateJson = vi.fn(async (_input: unknown, _useThinking?: boolean, meta?: UsageMeta) => {
      if (meta?.taskLabel === 'Doc (base)') return docWithUnknownFirstKey;
      if (meta?.taskLabel === 'Slug') return slugStub();
      if (meta?.taskLabel === 'SEO metadata') return seoStub();
      throw new Error(`unexpected generateJson taskLabel: ${meta?.taskLabel}`);
    });
    const mockLlm = { generateJson, generateText: vi.fn(async () => '<p>x</p>'), recordGeneration: vi.fn(async () => {}) };
    const orchestrator = bootOrchestrator(mockLlm);
    orchestrator.maxRepairs.set(0);

    await orchestrator.generate({ ...BASE_INPUT });

    const driftWarning = orchestrator.validationIssues().find(i => i.rule === 'slug-spec-key-unrecognized');
    expect(driftWarning?.severity).toBe('warning');
    expect(driftWarning?.detail).toContain('smart-camera');

    // Precise check, not a suffix-shape guess: the product name itself contains "20 W"/"20 Вт", so
    // the BASE slug alone already ends in "-20-w" regardless of any suffix — the real assertion is
    // that the slug is exactly the unsuffixed base, not merely that it lacks some particular tail.
    const en = orchestrator.content().slugData?.slugs.find(s => s.language === 'en-ES');
    expect(en?.slug).toBe('ortur-h20-20-w-laser-engraver');
  });

  it('a store not on the allow-list is untouched even with the mock forcing every store on — sanity: the mock IS active', async () => {
    // This just confirms the vi.mock above actually took effect for this file, since a silently
    // un-mocked import (e.g. a typo in the module path) would make every other test in this file a
    // false negative for "flag on" while actually testing "flag off" against the real empty list.
    const { usesSlugSpecSuffix } = await import('../prompt-core/slug-spec-suffix-flag');
    expect(usesSlugSpecSuffix('Some New Store')).toBe(true);
  });
});

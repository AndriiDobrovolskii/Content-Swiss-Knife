/**
 * content-orchestrator.ua-doc-pipeline.spec.ts
 *
 * generateUaContent() (the "UA Description" tab) used to be entirely unaware of the Doc pipeline
 * — it always called buildPromptA/generateText, never buildPromptADoc/generateJson, even for a
 * store fully enrolled in DOC_PIPELINE_STORES. That gap went unnoticed through the whole Doc
 * rollout precisely because nothing exercised this combination automatically. This suite is the
 * regression guard: it proves the gate now fires for an enrolled store, and stays inert for one
 * that isn't.
 *
 * DI, NOT TestBed. ContentOrchestratorService uses field-level `inject()`, which needs an active
 * injection context — but it is a plain injectable, not a component, so it needs none of the
 * rendering/compiler machinery TestBed brings in. vitest.config.ts deliberately keeps the full
 * Angular testing module out of this suite ("Angular components are intentionally excluded...").
 * `Injector.create` + `injector.get(...)` is the same DI Angular uses at runtime — it satisfies
 * the service's `inject()` calls without pulling in TestBed, zone.js or platform-browser-dynamic.
 */
// Must load before any Angular class from a partially-compiled library (e.g. PlatformLocation,
// dragged in transitively by importing LlmService for its DI token below) is evaluated — those
// decorators fall back to JIT at import time, and JIT needs this compiler present first.
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

const CORPUS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'test', 'fixtures', 'corpus');

/** A real, hand-verified ProductDescriptionDoc — also used by render-reconciliation.spec.ts and
 * render-description.spec.ts, so this suite isn't inventing a fixture of its own to keep in sync. */
const EXPERT3D_DOC = JSON.parse(readFileSync(join(CORPUS_DIR, 'expert3d-ortur-h20-20w.doc.json'), 'utf8'));

/** Minimal, validator-clean stubs for the Slug and SEO metadata steps — both run unconditionally
 * in generateUaContent() regardless of Doc/HTML path, so both need a response or the run either
 * degrades (Slug, plain try/catch) or churns the repair gate (SEO metadata) before reaching the
 * assertions below. */
function slugStub() {
  return {
    site_name: 'EXPERT3D',
    slugs: ['en-ES', 'es-ES', 'pt-PT', 'uk-UA'].map(language => ({
      language, name: 'Ortur H20 20 W', slug: `ortur-h20-20w-${language.toLowerCase()}`,
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

function makeMockLlm(baseHtml: string) {
  const generateJson = vi.fn(async (_input: unknown, _useThinking?: boolean, meta?: UsageMeta) => {
    if (meta?.taskLabel === 'Doc (uk-UA)') return structuredClone(EXPERT3D_DOC);
    if (meta?.taskLabel === 'Slug') return slugStub();
    if (meta?.taskLabel === 'SEO metadata') return seoStub();
    throw new Error(`unexpected generateJson taskLabel: ${meta?.taskLabel}`);
  });
  const generateText = vi.fn(async (_input: unknown, _useThinking?: boolean, _meta?: UsageMeta) => baseHtml);
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

describe('generateUaContent() — Doc pipeline wiring', () => {
  it('routes an enrolled store through the Doc pipeline, not the HTML path', async () => {
    const mockLlm = makeMockLlm('<h1>should never be used</h1>');
    const orchestrator = bootOrchestrator(mockLlm);

    const input: ProductInput = {
      website: { name: 'EXPERT3D', group: 'ES', url: 'https://impresora-3d.es' },
      name: 'Ortur H20 20 W',
      description: '',
      specs: '',
      brandFolder: 'ortur',
      modelFolder: 'h20/h20-20w',
    };

    await orchestrator.generateUaContent(input);

    // The base artifact was requested as JSON (Doc), never as plain text (HTML) — proves
    // useDocPipelineUa gated buildPromptADoc + generateJson, not buildPromptA + generateText.
    expect(mockLlm.generateJson).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), expect.objectContaining({ taskLabel: 'Doc (uk-UA)' }),
    );
    expect(mockLlm.generateText).not.toHaveBeenCalled();

    // renderDescription() actually ran on the mocked Doc — not just that generateJson was called
    // — checked via a heading string unique to this fixture (its CTA section).
    expect(orchestrator.content().mainHtmlUa).toContain('Чому купити Ortur H20 20 Вт в EXPERT3D?');
  });

  it('leaves a non-enrolled store on the HTML path', async () => {
    const baseHtml = '<p>Опис продукту для тесту.</p>';
    const mockLlm = makeMockLlm(baseHtml);
    const orchestrator = bootOrchestrator(mockLlm);

    // Expert-3DPrinter has an empty imageBaseUrl in STORE_REGISTRY, so usesDocPipeline() returns
    // false regardless of DOC_PIPELINE_STORES — see doc-pipeline-flag.ts:69-75.
    const input: ProductInput = {
      website: { name: 'Expert-3DPrinter', group: 'US', url: 'https://expert-3dprinter.example' },
      name: 'Ortur H20 20 W',
      description: '',
      specs: '',
    };

    await orchestrator.generateUaContent(input);

    expect(mockLlm.generateJson).not.toHaveBeenCalledWith(
      expect.anything(), expect.anything(), expect.objectContaining({ taskLabel: 'Doc (uk-UA)' }),
    );
    expect(mockLlm.generateText).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), expect.objectContaining({ taskLabel: 'HTML (uk-UA)' }),
    );
  });
});

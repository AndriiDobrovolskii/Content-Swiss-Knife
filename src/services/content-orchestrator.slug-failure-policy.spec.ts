/**
 * content-orchestrator.slug-failure-policy.spec.ts
 *
 * PR-0.5: slug-generation failure used to log a console.warn and push a `severity: 'warning'`
 * issue while H1/meta_title silently fell back to English for every locale — with no test proving
 * either the severity or that generate() and generateUaContent() (the uk-UA-scoped variant) agree.
 * Both call sites now go through the same private runSlugRepairGate()/pushSlugGenerationFailedIssue()
 * helpers on ContentOrchestratorService, so a slug failure is expected to surface identically at
 * both entry points. This suite forces the Slug step specifically to throw and asserts the
 * resulting issue is `severity: 'error'`, not `'warning'` — the confirmed, real behavior change is
 * that this auto-opens the acceptance/review panel in the UI (app.component.ts), not a cosmetic
 * label swap.
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

const CORPUS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'test', 'fixtures', 'corpus');

/** Same hand-verified fixture used by the Doc-gate/UA-doc-pipeline suites. */
const EXPERT3D_DOC = JSON.parse(readFileSync(join(CORPUS_DIR, 'expert3d-ortur-h20-20w.doc.json'), 'utf8'));

function seoStub() {
  return {
    site_name: 'EXPERT3D',
    seo_data: ['en-ES', 'es-ES', 'pt-PT', 'uk-UA'].map(language => ({
      language, h1: 'Ortur H20 20 W', meta_title: 'Ortur H20 20 W laser engraver',
      meta_description: 'Ortur H20 20 W laser engraver for wood and metal, full specs inside ➔',
    })),
  };
}

/** Slug is the one task label this suite deliberately fails; every other JSON task succeeds so the
 *  failure is isolated to the step under test rather than an unrelated stub gap. */
function makeMockLlm(translationHtml: string, docTaskLabel: string) {
  const generateJson = vi.fn(async (_input: unknown, _useThinking?: boolean, meta?: UsageMeta) => {
    if (meta?.taskLabel === docTaskLabel) return structuredClone(EXPERT3D_DOC);
    if (meta?.taskLabel === 'Slug') throw new Error('simulated Slug generation failure');
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

describe('slug-generation failure severity — generate() and generateUaContent() must agree', () => {
  it('generate(): a Slug failure raises severity error, not warning', async () => {
    const mockLlm = makeMockLlm('<p>Опис продукту для тесту.</p>', 'Doc (base)');
    const orchestrator = bootOrchestrator(mockLlm);
    orchestrator.maxRepairs.set(0);

    await orchestrator.generate({ ...BASE_INPUT });

    const slugIssue = orchestrator.validationIssues().find(i => i.rule === 'slug-generation-failed');
    expect(slugIssue).toBeDefined();
    expect(slugIssue?.severity).toBe('error');
  });

  it('generateUaContent(): a Slug failure raises severity error, not warning', async () => {
    const mockLlm = makeMockLlm('<p>Опис продукту для тесту.</p>', 'Doc (uk-UA)');
    const orchestrator = bootOrchestrator(mockLlm);
    orchestrator.maxRepairs.set(0);

    await orchestrator.generateUaContent({ ...BASE_INPUT });

    const slugIssue = orchestrator.validationIssues().find(i => i.rule === 'slug-generation-failed');
    expect(slugIssue).toBeDefined();
    expect(slugIssue?.severity).toBe('error');
  });

  it('the wording no longer diverges between the two call sites', async () => {
    const mockLlmGenerate = makeMockLlm('<p>Опис продукту для тесту.</p>', 'Doc (base)');
    const orchestratorGenerate = bootOrchestrator(mockLlmGenerate);
    orchestratorGenerate.maxRepairs.set(0);
    await orchestratorGenerate.generate({ ...BASE_INPUT });

    const mockLlmUa = makeMockLlm('<p>Опис продукту для тесту.</p>', 'Doc (uk-UA)');
    const orchestratorUa = bootOrchestrator(mockLlmUa);
    orchestratorUa.maxRepairs.set(0);
    await orchestratorUa.generateUaContent({ ...BASE_INPUT });

    const detailFrom = (o: ContentOrchestratorService) =>
      o.validationIssues().find(i => i.rule === 'slug-generation-failed')?.detail;
    expect(detailFrom(orchestratorGenerate)).toBe(detailFrom(orchestratorUa));
  });
});

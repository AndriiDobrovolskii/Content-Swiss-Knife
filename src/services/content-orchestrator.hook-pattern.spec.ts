/**
 * content-orchestrator.hook-pattern.spec.ts — FR-14 / NFR-1 / NFR-5 / AC-9, the service half
 * (task breakdown T8) and the `userContent` placement (V6's remaining half, T7).
 *
 * 🔴 THIS FILE FAILS TO RESOLVE `../prompt-core/hook-pattern` UNTIL T6 CREATES IT. See
 * `src/prompt-core/hook-pattern.spec.ts` for why that is the intended TDD state rather than a
 * broken test, and the test generation report for the full list of type errors this stage leaves
 * standing with the task that clears each.
 *
 * WHAT FR-14 ASKS OF THIS LAYER SPECIFICALLY. The pattern is selected "by the service layer, before
 * the prompt payload is built" — the orchestrator is the only layer that sees `input.name` and
 * `input.website` pre-prompt. The selector itself is pure and is tested against its own contract in
 * `hook-pattern.spec.ts`; what is tested HERE is that the service actually calls it, with this
 * product's own pair, and hands the result to the prompt builder rather than letting the model
 * choose. Generation is stateless per product (OD-3), so a model cannot rotate patterns by itself.
 *
 * NFR-1 IS THE CONSTRAINT THAT SHAPES WHERE IT LANDS. `PromptPayload` is `systemBlocks[0]` (master,
 * cached), `systemBlocks[1]` (task template, cached) and `userContent`, which `payload.ts:7`
 * documents as "dynamic, never cached". A per-product value placed in either cached block changes
 * the cached prefix on EVERY product — a 100% cache-miss rate, which is the economics AGENTS.md §3
 * protects. The identical-`systemBlocks` assertion below is the observable form of that guarantee.
 *
 * DI, NOT TestBed — see `content-orchestrator.ua-doc-pipeline.spec.ts`'s header for why.
 */
import '@angular/compiler';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Injector } from '@angular/core';

import { ContentOrchestratorService } from './content-orchestrator.service';
import { LlmService } from './llm.service';
import { RetrievalService } from './retrieval.service';
import { HistoryService } from './history.service';
import * as taskADoc from '../prompts/task-a-doc';
import { selectHookPattern } from '../prompt-core/hook-pattern';
import type { ProductInput } from '../app/types';
import type { UsageMeta } from '../prompt-core/payload';

const CORPUS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'test', 'fixtures', 'corpus');
const EXPERT3D_DOC = JSON.parse(readFileSync(join(CORPUS_DIR, 'expert3d-ortur-h20-20w.doc.json'), 'utf8'));

afterEach(() => vi.restoreAllMocks());

const LANGUAGES = ['en-ES', 'es-ES', 'pt-PT', 'uk-UA'];

function slugStub() {
  return {
    site_name: 'EXPERT3D',
    slugs: LANGUAGES.map(language => ({
      language, name: 'Ortur H20 20 W', slug: `ortur-h20-20w-${language.toLowerCase()}`,
    })),
  };
}

function seoStub() {
  return {
    site_name: 'EXPERT3D',
    seo_data: LANGUAGES.map(language => ({
      language, h1: 'Ortur H20 20 W', meta_title: 'Ortur H20 20 W laser engraver',
      meta_description: 'Ortur H20 20 W laser engraver for wood and metal, full specs inside ➔',
    })),
  };
}

function bootOrchestrator(): ContentOrchestratorService {
  const llm = {
    generateJson: vi.fn(async (_i: unknown, _t?: boolean, meta?: UsageMeta) => {
      if (meta?.taskLabel === 'Doc (uk-UA)') return structuredClone(EXPERT3D_DOC);
      if (meta?.taskLabel === 'Slug') return slugStub();
      if (meta?.taskLabel === 'SEO metadata') return seoStub();
      throw new Error(`unexpected generateJson taskLabel: ${meta?.taskLabel}`);
    }),
    generateText: vi.fn(async () => '<p>unused</p>'),
    recordGeneration: vi.fn(async () => {}),
  };

  const injector = Injector.create({
    providers: [
      ContentOrchestratorService,
      { provide: LlmService, useValue: llm },
      { provide: RetrievalService, useValue: {} },
      { provide: HistoryService, useValue: { add: vi.fn() } },
    ],
  });
  return injector.get(ContentOrchestratorService);
}

function productInput(name: string): ProductInput {
  return {
    website: { name: 'EXPERT3D', group: 'ES', url: 'https://impresora-3d.es' },
    name,
    description: '',
    specs: '',
    brandFolder: 'ortur',
    modelFolder: 'h20/h20-20w',
  } as ProductInput;
}

describe('FR-14 — the SERVICE selects the hook pattern, before the payload is built', () => {
  it('passes selectHookPattern(name, website) to buildPromptADoc', async () => {
    const spy = vi.spyOn(taskADoc, 'buildPromptADoc');
    const input = productInput('Ortur H20 20 W');

    await bootOrchestrator().generateUaContent(input);

    expect(spy).toHaveBeenCalled();
    const [, , pattern] = spy.mock.calls[0] as unknown as [ProductInput, string | undefined, unknown];
    expect(pattern).toEqual(selectHookPattern(input.name, input.website.name));
  });

  /**
   * Both `buildPromptADoc` call sites, not one. A pattern selected at one entry point and not the
   * other makes the rotation depend on which code path a run took, which is a defect that would
   * never show up in a single-path test.
   */
  it('selects a pattern on every buildPromptADoc call the run makes', async () => {
    const spy = vi.spyOn(taskADoc, 'buildPromptADoc');
    await bootOrchestrator().generateUaContent(productInput('Ortur H20 20 W'));

    expect(spy.mock.calls.length).toBeGreaterThan(0);
    for (const call of spy.mock.calls) {
      expect(call.length, `a buildPromptADoc call was made without a pattern: ${JSON.stringify(call[0])}`)
        .toBeGreaterThanOrEqual(3);
      expect(call[2]).toBeDefined();
    }
  });
});

describe('NFR-1 — the pattern rides in userContent and never in a cached block', () => {
  const input = productInput('Ortur H20 20 W');
  const pattern = () => selectHookPattern(input.name, input.website.name);

  it('appends the pattern instruction to userContent and leaves systemBlocks alone', () => {
    const withPattern = taskADoc.buildPromptADoc(input, undefined, pattern());
    const without = taskADoc.buildPromptADoc(input);

    expect(withPattern.systemBlocks).toEqual(without.systemBlocks);
    expect(withPattern.userContent).not.toBe(without.userContent);
    // "APPENDED to the inherited base.userContent" (D11) — the existing content is not rewritten.
    expect(withPattern.userContent.startsWith(without.userContent)).toBe(true);
  });

  /**
   * The observable form of the caching guarantee: two products that draw DIFFERENT patterns differ
   * in `userContent` and are byte-identical in `systemBlocks`. If the pattern were injected into a
   * cached block, the second half of this would fail — which is the failure NFR-1 exists to catch.
   */
  it('two products drawing different patterns share byte-identical systemBlocks', () => {
    const a = productInput('Ortur H20 20 W');
    const b = productInput('Formlabs Fuse 1');
    const [pa, pb] = [selectHookPattern(a.name, a.website.name), selectHookPattern(b.name, b.website.name)];
    expect(pa, 'pick two products that draw different patterns').not.toEqual(pb);

    const payloadA = taskADoc.buildPromptADoc(a, undefined, pa);
    const payloadB = taskADoc.buildPromptADoc(b, undefined, pb);

    expect(payloadA.systemBlocks).toEqual(payloadB.systemBlocks);
    expect(payloadA.userContent).not.toBe(payloadB.userContent);
  });

  /** NFR-5 — the same product yields a byte-identical payload on every build. */
  it('is byte-stable for the same product across builds', () => {
    const first = taskADoc.buildPromptADoc(input, undefined, pattern());
    const second = taskADoc.buildPromptADoc(input, undefined, pattern());
    expect(second).toEqual(first);
  });
});

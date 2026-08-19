/**
 * content-orchestrator.grounding-style-guide.spec.ts
 *
 * groundingSpecs() translates input.specs into Ukrainian through the SAME builder the user-facing
 * Translator uses. That output is never displayed: it is the anchor text validateSpecsGrounding
 * matches §7 spec rows against, and specs-grounding.ts grounds a row by STEMMED LABEL (signal 1 of
 * 3). UA_TRANSLATION_STYLE_GUIDE's rules B1–B5 exist to change wording — anti-calque rewriting,
 * sentence splitting, list parallelism — so letting them reach this call degrades the label match
 * and can turn correctly grounded rows into false "hallucinated spec row" errors: the exact failure
 * specs-grounding.ts was written to prevent.
 *
 * This is the reason buildTranslatePrompt takes a REQUIRED TranslationContext rather than an
 * optional flag, and this suite is what keeps that one call site from drifting to the user-facing
 * value. It is the only surviving test of the rolled-back two-stage UA experiment, kept because the
 * hazard it guards is a property of groundingSpecs(), not of that experiment.
 *
 * DI, NOT TestBed — same rationale as content-orchestrator.ua-doc-pipeline.spec.ts.
 */
import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { Injector } from '@angular/core';
import { ContentOrchestratorService } from './content-orchestrator.service';
import { LlmService } from './llm.service';
import { RetrievalService } from './retrieval.service';
import { HistoryService } from './history.service';
import { UA_TRANSLATION_STYLE_GUIDE } from '../prompt-core/ua-translation-style-guide';
import type { UsageMeta, PromptPayload } from '../prompt-core/payload';

describe('groundingSpecs() — the Ukrainian style guide must never reach the grounding call', () => {
  it('translates specs for grounding without the style guide', async () => {
    const generateJson = vi.fn(async () => ({ site_name: 'Expert-3DPrinter', slugs: [], seo_data: [] }));
    const generateText = vi.fn(async (_i: unknown, _t?: boolean, _m?: UsageMeta) => '<p>Опис.</p>');

    const injector = Injector.create({
      providers: [
        ContentOrchestratorService,
        { provide: LlmService, useValue: { generateJson, generateText, recordGeneration: vi.fn(async () => {}) } },
        { provide: RetrievalService, useValue: {} },
        { provide: HistoryService, useValue: { add: vi.fn() } },
      ],
    });

    // Non-empty AND non-Cyrillic: both are required for groundingSpecs() to make the call at all —
    // it short-circuits on blank input and on input that is already in the master's script.
    await injector.get(ContentOrchestratorService).generateUaContent({
      website: { name: 'Expert-3DPrinter', group: 'US', url: 'https://expert-3dprinter.example' },
      name: 'Ortur H20 20 W',
      description: '',
      specs: 'Laser power: 20 W\nWorking area: 400 x 400 mm',
    });

    const groundingCall = generateText.mock.calls.find(
      ([, , meta]) => (meta as UsageMeta | undefined)?.taskLabel === 'Specs translation (grounding)',
    );
    expect(groundingCall, 'groundingSpecs() should have issued its translation call').toBeDefined();

    const payload = groundingCall![0] as PromptPayload;
    const wholePrompt = payload.systemBlocks.map(b => b.text).join('\n') + payload.userContent;
    expect(wholePrompt).not.toContain('[UKRAINIAN TRANSLATION STYLE GUIDE]');
    expect(wholePrompt).not.toContain(UA_TRANSLATION_STYLE_GUIDE);
    // The anti-calque rules are the specific hazard — name one so a partial re-add is caught too.
    expect(wholePrompt).not.toMatch(/ANTI-CALQUE/);
    // Timeout raised off the 5s default: this drives a FULL generateUaContent (every validator,
    // every repair gate). The work is CPU-bound local validation, not a hang.
  }, 30_000);
});

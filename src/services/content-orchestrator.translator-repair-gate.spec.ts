/**
 * content-orchestrator.translator-repair-gate.spec.ts
 *
 * Proves translate() and rewrite() (content-orchestrator.service.ts) actually engage the
 * leaked-preamble repair-gate wiring end to end: a first attempt that leaks a self-correction
 * fragment gets retried, a retry that still leaks gets heuristically healed
 * (stripLeakedPreamble), and an artifact that survives neither never reaches the output signal —
 * the bug this whole plan exists to close (see translation-integrity.ts / copywriter-integrity.ts).
 *
 * DI, NOT TestBed — see content-orchestrator.ua-doc-pipeline.spec.ts's header comment for why.
 */
import '@angular/compiler';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Injector } from '@angular/core';
import { ContentOrchestratorService } from './content-orchestrator.service';
import { LlmService } from './llm.service';
import { RetrievalService } from './retrieval.service';
import { HistoryService } from './history.service';
import type { WebsiteOption } from '../app/types';

afterEach(() => vi.restoreAllMocks());

function bootOrchestrator(mockLlm: {
  generateJson: ReturnType<typeof vi.fn>;
  generateText: ReturnType<typeof vi.fn>;
  recordGeneration: ReturnType<typeof vi.fn>;
}): ContentOrchestratorService {
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

function makeMockLlm() {
  return {
    generateJson: vi.fn(async (): Promise<unknown> => { throw new Error('unstubbed generateJson call'); }),
    generateText: vi.fn(async (): Promise<string> => { throw new Error('unstubbed generateText call'); }),
    recordGeneration: vi.fn(async () => {}),
  };
}

const INPUT_HTML = '<p>Formlabs Fuse Sift X1 — станція для відновлення порошку.</p>';
const CLEAN_TRANSLATION = '<p>Formlabs Fuse Sift X1 — estación de recuperación de polvo.</p>';
const LEAKED_TRANSLATION = `Wait, corrected below. ${CLEAN_TRANSLATION}`;

describe('translate() — repair-gate wiring', () => {
  it('retries once and ships the clean result when the repair attempt fixes the leak', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateText
      .mockResolvedValueOnce(LEAKED_TRANSLATION)
      .mockResolvedValueOnce(CLEAN_TRANSLATION);
    const orchestrator = bootOrchestrator(mockLlm);

    await orchestrator.translate(INPUT_HTML, 'Spanish (es-ES)');

    expect(orchestrator.translatorOutput()).toBe(CLEAN_TRANSLATION);
    expect(mockLlm.generateText).toHaveBeenCalledTimes(2);
  });

  it('ships the heuristically-healed result when the repair attempt still leaks the same way', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateText.mockResolvedValue(LEAKED_TRANSLATION); // every call returns the same broken string
    const orchestrator = bootOrchestrator(mockLlm);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await orchestrator.translate(INPUT_HTML, 'Spanish (es-ES)');

    expect(orchestrator.translatorOutput()).toBe(CLEAN_TRANSLATION);
    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls.some(c => String(c[0]).includes('heuristic preamble strip'))).toBe(true);
  });

  it('never ships a broken artifact when neither the repair nor the heuristic resolve it', async () => {
    const mockLlm = makeMockLlm();
    // Trailing-tag mismatch: input ends on '>', this output never does — stripLeakedPreamble
    // cannot fix a missing tail, only a leaked head, so this must fall through to "fail loud".
    mockLlm.generateText.mockResolvedValue('<p>Truncated output');
    const orchestrator = bootOrchestrator(mockLlm);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('alert', vi.fn());

    await orchestrator.translate(INPUT_HTML, 'Spanish (es-ES)');

    // translate() clears translatorOutput to '' up front and only ever calls .set(artifact) on
    // a validated result — so '' surviving proves the broken artifact never reached the signal.
    expect(orchestrator.translatorOutput()).toBe('');
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe('rewrite() — repair-gate wiring', () => {
  const WEBSITE: WebsiteOption = { name: 'EXPERT3D', group: 'ES', url: 'https://impresora-3d.es' };
  const CLEAN_REWRITE = '<p>Descripción reescrita.</p>';
  const LEAKED_REWRITE = `Actually, here is the rewrite: ${CLEAN_REWRITE}`;

  it('retries once and ships the clean result when the repair attempt fixes the leak', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateText
      .mockResolvedValueOnce(LEAKED_REWRITE)
      .mockResolvedValueOnce(CLEAN_REWRITE);
    const orchestrator = bootOrchestrator(mockLlm);

    await orchestrator.rewrite(WEBSITE, '<p>Descripción original.</p>');

    expect(orchestrator.copywriterOutput()).toBe(CLEAN_REWRITE);
    expect(mockLlm.generateText).toHaveBeenCalledTimes(2);
  });

  it('ships the heuristically-healed result when the repair attempt still leaks the same way', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateText.mockResolvedValue(LEAKED_REWRITE);
    const orchestrator = bootOrchestrator(mockLlm);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await orchestrator.rewrite(WEBSITE, '<p>Descripción original.</p>');

    expect(orchestrator.copywriterOutput()).toBe(CLEAN_REWRITE);
    expect(warn).toHaveBeenCalled();
  });
});

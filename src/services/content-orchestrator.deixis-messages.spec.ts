/**
 * content-orchestrator.deixis-messages.spec.ts - US-9.1 T7 (FR-14, AC-3): the two `video-embed-restored`
 * warnings of the orchestrator stop saying "lead-in".
 *
 * When the model omits a source video embed, `restoreMissingVideos` re-inserts it before §7 and the
 * orchestrator adds a `video-embed-restored` WARNING telling the editor to check the placement. Two call
 * sites emit it, one per entry point: `generate()` (context `HTML (base)`) and `generateUaContent()` (context
 * `HTML (uk-UA)`). Only the plain-HTML pipeline restores videos this way (the Doc pipeline covers video through
 * `validateVideoCoverageDoc`), so the stores used here are derived from the registry as "not on the Doc
 * pipeline", never named.
 *
 * Specification FR-14: Assert absent (in both) `sensible lead-in paragraph`; Assert present (in both)
 * `sensible preceding paragraph`. Rule id and severity are unchanged. Text beyond those two literals is not
 * asserted (H-OD13: orchestrator message wording latitude is the builder's).
 *
 * DI, NOT TestBed: see content-orchestrator.ua-doc-pipeline.spec.ts. The model is stubbed at the `LlmService`
 * boundary; the orchestrator, the repair gate and the video restorer are the real ones.
 */
import '@angular/compiler';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usesDocPipeline } from '../prompt-core/doc-pipeline-flag';
import {
  makeMockLlm, bootOrchestrator, pipelineRoutes, registryStores, stubBrowserGlobals, productInput,
} from '../../test/fixtures/protected-name';

const PRODUCT = 'Ortur H20 20 W';
const YOUTUBE = 'https://www.youtube.com/embed/abc123XYZ';
const HTML_STORES = registryStores().filter(s => !usesDocPipeline(s));

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();

beforeEach(() => { stubBrowserGlobals(); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('premise: the plain-HTML pipeline exists in the registry (the only place a video is restored by code)', () => {
  it('at least one store is not on the Doc pipeline', () => {
    expect(HTML_STORES.length).toBeGreaterThanOrEqual(1);
  });
});

describe.each(HTML_STORES.map(s => [s] as [string]))('video-embed-restored warnings, store %s (FR-14, AC-3)', store => {
  const input = () => productInput(store, PRODUCT, {
    description: `Laser engraver for wood and metal. <iframe src="${YOUTUBE}" title="Overview"></iframe>`,
    specs: '',
  });
  const restoredWarnings = (o: ReturnType<typeof bootOrchestrator>) => o.validationIssues().filter(i => i.rule === 'video-embed-restored');

  it('generateUaContent: the HTML (uk-UA) warning says "sensible preceding paragraph" and no longer "sensible lead-in paragraph"', async () => {
    const mock = makeMockLlm(pipelineRoutes(store, PRODUCT));
    const o = bootOrchestrator(mock);
    await o.generateUaContent(input());
    const warnings = restoredWarnings(o);
    expect(warnings, 'the model omitted the embed, so the restorer must have warned once').toHaveLength(1);
    expect(warnings[0].severity).toBe('warning');
    expect(warnings[0].context).toBe('HTML (uk-UA)');
    expect(warnings[0].detail).toContain(YOUTUBE);
    expect(collapse(warnings[0].detail)).not.toContain('sensible lead-in paragraph');
    expect(collapse(warnings[0].detail)).toContain('sensible preceding paragraph');
  });

  it('generate: the HTML (base) warning says "sensible preceding paragraph" and no longer "sensible lead-in paragraph"', async () => {
    const mock = makeMockLlm(pipelineRoutes(store, PRODUCT));
    const o = bootOrchestrator(mock);
    await o.generate(input());
    const warnings = restoredWarnings(o).filter(w => w.context === 'HTML (base)');
    expect(warnings, 'the model omitted the embed, so the restorer must have warned once for the master').toHaveLength(1);
    expect(warnings[0].severity).toBe('warning');
    expect(warnings[0].detail).toContain(YOUTUBE);
    expect(collapse(warnings[0].detail)).not.toContain('sensible lead-in paragraph');
    expect(collapse(warnings[0].detail)).toContain('sensible preceding paragraph');
  });
});

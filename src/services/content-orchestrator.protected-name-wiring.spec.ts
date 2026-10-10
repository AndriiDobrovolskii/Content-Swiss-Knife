/**
 * content-orchestrator.protected-name-wiring.spec.ts — US-7.1 T12 (FR-2, FR-11, NFR-1; AC-4 for
 * Task A / Doc, Slugs, Task B and Task C; AC-5 Optimizer / Translator wiring).
 *
 * WHAT THIS PINS. `classifyProductName(input.name)` is computed once per run and, for a PROTECTED name,
 * `withProtectedNameBlock` wraps the payload of every builder that carries the Product Name — Task A /
 * Doc, Slugs, Task B, Task C, Optimizer — so the `[PROTECTED PRODUCT NAME]` block reaches the model in
 * `userContent`. The Translator receives no Product Name (OD-7) and is never wrapped. A generic name
 * produces payloads identical to today's. `systemBlocks` are never touched (prompt caching, AGENTS.md §3).
 *
 * AC-4 (TEST_WRITING condition 2): every `it` below sits inside a `describe.each` over STORE_REGISTRY;
 * no store is named. Each store's own locales come from `getLangsForStore`, so the stores with an empty
 * `officialBrands` and the stores on the HTML path (not the Doc pipeline) are exercised like the rest.
 *
 * Entry points: `generate()` reaches Task A/Doc, Slugs, Task B and Task C in one run for every registry
 * store (verified at TEST_WRITING); `optimize()` and `translate()` are store-free.
 *
 * DI, NOT TestBed — see content-orchestrator.ua-doc-pipeline.spec.ts.
 */
import '@angular/compiler';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { getLangsForStore } from '../prompt-core/constants';
import { buildPromptSlug } from '../prompts/task-slug';
import {
  FIXTURE_A, FIXTURE_C, PROTECTED_MARKER, registryStores, productInput, makeMockLlm, bootOrchestrator,
  pipelineRoutes, stubBrowserGlobals, type CapturedCall, type MockLlm,
} from '../../test/fixtures/protected-name';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const isTaskA = (c: CapturedCall) => c.label === 'Doc (base)' || (c.kind === 'text' && c.label === 'HTML (base)');
const isTaskC = (c: CapturedCall) =>
  c.kind === 'text' && /^HTML \(/.test(c.label) && c.label !== 'HTML (base)' && !/repair/i.test(c.label);
const firstOf = (mock: MockLlm, label: string) => mock.calls.find(c => c.label === label);

async function runGenerate(store: string, name: string): Promise<MockLlm> {
  stubBrowserGlobals();
  const mock = makeMockLlm(pipelineRoutes(store, name));
  await bootOrchestrator(mock).generate(productInput(store, name));
  return mock;
}

describe.each(registryStores().map(s => [s] as [string]))('protected-name wiring through generate() — store %s (AC-4)', (store) => {
  let protectedRun: MockLlm;
  let genericRun: MockLlm;

  beforeAll(async () => {
    protectedRun = await runGenerate(store, FIXTURE_A);
    genericRun = await runGenerate(store, FIXTURE_C);
  });

  it('premise: the run reached Task A, Slugs, Task B and one Task C request per translated locale', () => {
    const labels = new Set(protectedRun.calls.map(c => c.label));
    expect(protectedRun.calls.some(isTaskA)).toBe(true);
    expect(labels.has('Slug')).toBe(true);
    expect(labels.has('SEO metadata')).toBe(true);
    const taskCLabels = new Set(protectedRun.calls.filter(isTaskC).map(c => c.label));
    expect(taskCLabels).toEqual(new Set(getLangsForStore(store).transLangs.map(l => `HTML (${l})`)));
  });

  describe('a PROTECTED name (Fixture A): the block reaches userContent of every builder', () => {
    it('Task A / Doc (the uk-UA master)', () => {
      const a = protectedRun.calls.find(isTaskA)!;
      expect(a.payload.userContent).toContain(PROTECTED_MARKER);
      expect(a.payload.userContent).toContain(FIXTURE_A);
    });

    it('Slugs', () => {
      const p = firstOf(protectedRun, 'Slug')!.payload;
      expect(p.userContent).toContain(PROTECTED_MARKER);
      expect(p.userContent).toContain(FIXTURE_A);
    });

    it('Task B (SEO metadata)', () => {
      const p = firstOf(protectedRun, 'SEO metadata')!.payload;
      expect(p.userContent).toContain(PROTECTED_MARKER);
      expect(p.userContent).toContain(FIXTURE_A);
    });

    it('Task C: every translation request, for every locale this store publishes', () => {
      const cCalls = protectedRun.calls.filter(isTaskC);
      expect(cCalls.length).toBeGreaterThan(0);
      const without = cCalls.filter(c => !c.payload.userContent.includes(PROTECTED_MARKER)).map(c => c.label);
      expect(without).toEqual([]);
      expect(cCalls.every(c => c.payload.userContent.includes(FIXTURE_A))).toBe(true);
    });

    it('the block comes AFTER the original userContent, which stays intact as its prefix (Slugs)', () => {
      const wrapped = firstOf(protectedRun, 'Slug')!.payload.userContent;
      const bare = buildPromptSlug(store, FIXTURE_A, getLangsForStore(store).seoLangs, '').userContent;
      // The Slugs request is built from the generated master for generate(); only the leading
      // [INPUT DATA] header is comparable. It must be preserved verbatim, block appended later.
      const header = bare.split('[Target Languages]')[0];
      expect(wrapped.startsWith(header)).toBe(true);
      expect(wrapped.indexOf(PROTECTED_MARKER)).toBeGreaterThan(wrapped.indexOf('[Target Languages]'));
    });
  });

  describe('NFR-1: systemBlocks are never collapsed into userContent or touched', () => {
    it.each([
      ['Task A / Doc', (m: MockLlm) => m.calls.find(isTaskA)],
      ['Slugs', (m: MockLlm) => firstOf(m, 'Slug')],
      ['Task B', (m: MockLlm) => firstOf(m, 'SEO metadata')],
      ['Task C', (m: MockLlm) => m.calls.find(isTaskC)],
    ] as [string, (m: MockLlm) => CapturedCall | undefined][])(
      '%s: systemBlocks of the protected run equal those of the generic run, and carry no per-product text',
      (_label, pick) => {
        const p = pick(protectedRun)!.payload;
        const g = pick(genericRun)!.payload;
        expect(p.systemBlocks).toEqual(g.systemBlocks);
        expect(p.systemBlocks.length).toBeGreaterThanOrEqual(2);
        expect(p.systemBlocks.slice(0, 2).every(b => b.cache === true)).toBe(true);
        for (const b of p.systemBlocks) {
          expect(b.text).not.toContain(FIXTURE_A);
          expect(b.text).not.toContain('Form Studio 1');
        }
      },
    );
  });

  describe('a GENERIC name (Fixture C): payloads carry no block and are unchanged', () => {
    it('no request of the run mentions [PROTECTED PRODUCT NAME] in userContent', () => {
      const offenders = genericRun.calls.filter(c => c.payload.userContent.includes(PROTECTED_MARKER)).map(c => c.label);
      expect(offenders).toEqual([]);
    });

    it('the Slugs payload is byte-identical to what buildPromptSlug alone returns (generic names are not wrapped)', () => {
      const sent = firstOf(genericRun, 'Slug')!.payload;
      const { seoLangs } = getLangsForStore(store);
      // The master text the Slugs request is grounded in is run-specific; compare the structure.
      expect(sent.systemBlocks).toEqual(buildPromptSlug(store, FIXTURE_C, seoLangs, '').systemBlocks);
      const header = buildPromptSlug(store, FIXTURE_C, seoLangs, '').userContent.split('[Target Languages]')[0];
      expect(sent.userContent.startsWith(header)).toBe(true);
    });
  });
});

describe('protected-name wiring — Optimizer (FR-7, AC-5; TEST_WRITING condition 3) and Translator (OD-7)', () => {
  const html = '<p>Відкрийте для себе Formlabs Form Studio 1 Resin Tank Pro.</p>';

  async function runOptimize(name: string): Promise<MockLlm> {
    stubBrowserGlobals();
    const mock = makeMockLlm({ text: { Optimizer: () => html } });
    await bootOrchestrator(mock).optimize(html, name);
    return mock;
  }

  it('wraps the Optimizer payload for a protected name: the block is in userContent after the [Product Name] line', async () => {
    const p = (await runOptimize(FIXTURE_A)).callsFor('Optimizer')[0].payload;
    expect(p.userContent).toContain(`[Product Name]: ${FIXTURE_A}`);
    expect(p.userContent).toContain(PROTECTED_MARKER);
    expect(p.userContent.indexOf(PROTECTED_MARKER)).toBeGreaterThan(p.userContent.indexOf('[Product Name]'));
  });

  it('keeps the Optimizer systemBlocks product-free and unchanged', async () => {
    const protectedPayload = (await runOptimize(FIXTURE_A)).callsFor('Optimizer')[0].payload;
    const genericPayload = (await runOptimize(FIXTURE_C)).callsFor('Optimizer')[0].payload;
    expect(protectedPayload.systemBlocks).toEqual(genericPayload.systemBlocks);
    expect(protectedPayload.systemBlocks.every(b => !b.text.includes(FIXTURE_A))).toBe(true);
  });

  it('does not wrap the Optimizer payload for a generic name', async () => {
    const p = (await runOptimize(FIXTURE_C)).callsFor('Optimizer')[0].payload;
    expect(p.userContent).not.toContain(PROTECTED_MARKER);
  });

  it('does not wrap the Optimizer payload when no Product Name is supplied (the [Product Name] line is optional)', async () => {
    const p = (await runOptimize('')).callsFor('Optimizer')[0].payload;
    expect(p.userContent).not.toContain(PROTECTED_MARKER);
    expect(p.userContent).not.toContain('[Product Name]');
  });

  it('never wraps the Translator (it has no Product Name, OD-7): userContent is exactly the text given', async () => {
    stubBrowserGlobals();
    const mock = makeMockLlm({ text: { Translator: () => '<p>Translated</p>' } });
    await bootOrchestrator(mock).translate(html, 'Spanish');
    const p = mock.callsFor('Translator')[0].payload;
    expect(p.userContent).toBe(html);
    expect(p.userContent).not.toContain(PROTECTED_MARKER);
  });
});

/**
 * content-orchestrator.faq-standalone.spec.ts — US-8.1 T8: `generateFaqOnly()`, the orchestrator side
 * of the standalone FAQ Generator.
 *
 * Covers AC-12 (optional Original Description / Tech Specs), AC-13 (no description, SEO or slug call;
 * the result shape), AC-14 (same single-master pipeline as Generator), AC-15 (one history entry), the
 * FR-16 failure path (blank Supplemental Content: no call, no state change) and the FR-18 failure path
 * (master fails: `faqArtifacts` stays empty, the other fields keep their AC-13 values), plus the FR-7,
 * FR-9, FR-10, FR-11 rules as they apply to this entry point (AC-14).
 *
 * TABLE A SPEC, OWNED BY T8. `ContentOrchestratorService` has no `generateFaqOnly` yet: `tsc` reports
 * TS2339 (property does not exist) in this file only, and every test below fails at runtime with
 * "generateFaqOnly is not a function". It imports nothing else a task of this Story creates; the shared
 * fixture it uses (test/fixtures/faq-pipeline.ts) imports only symbols that exist before T1.
 *
 * This is the SEPARATE file the task breakdown requires (constraint 1): keeping every `generateFaqOnly`
 * reference here is what lets `content-orchestrator.faq-pipeline.spec.ts` stay type-clean at T6 and T7.
 *
 * Signature (task breakdown T8): `async generateFaqOnly(input: ProductInput, useThinking: boolean): Promise<void>`.
 * The mock is FAQ-only: it has NO JSON route (any `generateJson` call throws) and answers every
 * unrouted text label with '' (see faqOnlyRoutes), so a stray description / SEO / slug call is both
 * loud and recorded.
 */
import '@angular/compiler';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { MASTER_LOCALE } from '../prompt-core/constants';
import {
  registryStores, stubBrowserGlobals, bootFaqOnly, generatorInput, runGenerate, FAQ_MASTER_HTML, FAQ_STRONG_HTML,
  FAQ_INVALID_HTML, translationOf, isoOf, generationCalls, translationCalls, translationCallsFor, faqCalls,
  isFaqGeneration, isFaqTranslation, storeLanguages, translationLanguages, countOf, PRODUCT, faqTranslationPromptProblems,
  type FaqRoutes,
} from '../../test/fixtures/faq-pipeline';
import type { GeneratedContent, ProductInput } from '../app/types';

beforeAll(() => { stubBrowserGlobals(); });
afterAll(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const STORES = registryStores().map(s => [s] as [string]);
const FIVE = new Set(['h3', 'p', 'b', 'ul', 'li']);

function isWellFormedFaq(html: string): boolean {
  const stack: string[] = [];
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g)) {
    const [, closing, name, rest] = m;
    const tag = name.toLowerCase();
    if (!FIVE.has(tag) || rest.trim() !== '') return false;
    if (closing) { if (stack.pop() !== tag) return false; } else stack.push(tag);
  }
  return stack.length === 0;
}
const isTranslationOf = (iso: string, html: string | undefined) =>
  !!html && html.includes(`<h3>[${iso}] `)
  && (['h3', 'p', 'ul', 'li'] as const).every(t => countOf(html, t) === countOf(FAQ_MASTER_HTML, t));

/** Memoised async setup. Used instead of `beforeAll` so that a setup that throws (the method does not exist
 *  yet) fails EACH test with its own error instead of leaving the whole suite reported as skipped. */
function lazy<T>(make: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => (pending ??= make());
}

interface FaqOnlyRun { store: string; booted: ReturnType<typeof bootFaqOnly>; input: ProductInput }

async function runFaqOnly(
  store: string, over: FaqRoutes = {}, extra: Partial<ProductInput> = {}, opts: { maxRepairs?: number; thinking?: boolean } = {},
): Promise<FaqOnlyRun> {
  const booted = bootFaqOnly(over, opts.maxRepairs);
  const input = generatorInput(store, extra);
  await booted.orchestrator.generateFaqOnly(input, opts.thinking ?? false);
  return { store, booted, input };
}
const content = (r: FaqOnlyRun): GeneratedContent => r.booted.orchestrator.content();
const labelsOf = (r: FaqOnlyRun) => faqCalls(r.booted.mock).map(c => c.label);
const expectMasterAttempts = (r: FaqOnlyRun, n: number) =>
  expect(generationCalls(r.booted.mock).map(c => c.label)).toEqual(Array(n).fill('FAQ (uk-UA)'));

/** The AC-13 values every standalone result carries, whether or not the FAQ itself succeeded. */
function expectStandaloneShape(r: FaqOnlyRun) {
  const c = content(r);
  expect(c.mainHtmlUa, 'mainHtmlUa').toBe('');
  expect(c.translations, 'translations').toEqual({});
  expect(c.seoData, 'seoData').toBeNull();
  expect(c.slugData, 'slugData').toBeNull();
  expect(c.website?.name, 'the store the FAQ was generated for is recorded (the FAQ tabs resolve languages from it)').toBe(r.store);
}

describe('AC-13 / AC-14 / AC-15: a completed standalone run, per store', () => {
  describe.each(STORES)('store %s', (store) => {
    const run = lazy(() => runFaqOnly(store));

    it('AC-13: afterwards mainHtmlUa is "", translations is {}, seoData and slugData are null', async () => {
      const r = await run();
      expectStandaloneShape(r);
    });

    it('AC-13: faqArtifacts has an entry for EVERY language of the selected store', async () => {
      const r = await run();
      expect(Object.keys(content(r).faqArtifacts ?? {}).sort()).toEqual([...storeLanguages(store)].sort());
    });

    it('AC-13: NO call is made for the master description, SEO metadata or slugs - only FAQ calls exist', async () => {
      const r = await run();
      expect(r.booted.mock.generateJson).not.toHaveBeenCalled();
      const strays = r.booted.mock.calls.filter(c => !isFaqGeneration(c) && !isFaqTranslation(c) && !/^Block repair — FAQ/.test(c.label));
      expect(strays.map(c => c.label)).toEqual([]);
    });

    it('AC-14: one uk-UA generation call and one translation sequence per other language (N-1 translations)', async () => {
      const r = await run();
      expectMasterAttempts(r, 1);
      expect(generationCalls(r.booted.mock)[0].payload.userContent).toContain('in Ukrainian');
      expect([...new Set(translationCalls(r.booted.mock).map(c => isoOf(c.label)))].sort()).toEqual([...translationLanguages(store)].sort());
      for (const iso of translationLanguages(store)) expect(translationCallsFor(r.booted.mock, iso), iso).toHaveLength(1);
    });

    it('AC-14: the uk-UA entry is the master and every other entry is a translation of it with the same structure', async () => {
      const r = await run();
      const faq = content(r).faqArtifacts!;
      expect(faq[MASTER_LOCALE]).toBe(FAQ_MASTER_HTML);
      for (const iso of translationLanguages(store)) {
        expect(isTranslationOf(iso, faq[iso]), iso).toBe(true);
        expect(translationCallsFor(r.booted.mock, iso)[0].payload.userContent, `${iso} prompt carries the master`).toContain(faq[MASTER_LOCALE]);
      }
    });

    it('AC-14 (AC-9): every stored FAQ is well-formed and holds only h3, p, b, ul, li', async () => {
      const r = await run();
      for (const [iso, html] of Object.entries(content(r).faqArtifacts!)) expect(isWellFormedFaq(html), iso).toBe(true);
    });

    it('AC-14: it is the SAME pipeline as Generator mode - same FAQ calls, same labels, same prompts', async () => {
      const r = await run();
      const gen = await runGenerate(store);
      expect(labelsOf(r)).toEqual(faqCalls(gen.mock).map(c => c.label));
      const g = generationCalls(gen.mock)[0].payload;
      const s = generationCalls(r.booted.mock)[0].payload;
      expect(s.systemBlocks).toEqual(g.systemBlocks);
      expect(s.userContent).toBe(g.userContent);
      const gt = translationCalls(gen.mock);
      const st = translationCalls(r.booted.mock);
      expect(st.length).toBe(gt.length);
      st.forEach((c, i) => {
        expect(c.payload.systemBlocks, c.label).toEqual(gt[i].payload.systemBlocks);
        expect(c.payload.userContent, c.label).toBe(gt[i].payload.userContent);
      });
    });

    it('AC-15: exactly one history entry, holding the input and the produced FAQ', async () => {
      const r = await run();
      expect(r.booted.historyAdd).toHaveBeenCalledTimes(1);
      const [savedInput, savedContent] = r.booted.historyAdd.mock.calls[0] as [ProductInput, GeneratedContent];
      expect(savedInput.name).toBe(PRODUCT);
      expect(Object.keys(savedContent.faqArtifacts ?? {}).sort()).toEqual([...storeLanguages(store)].sort());
    });

    it('the run ends: not generating, the progress line says the FAQ generation is done', async () => {
      const r = await run();
      expect(r.booted.orchestrator.isGenerating()).toBe(false);
      expect(r.booted.orchestrator.progressMessage()).toBe('FAQ Generation Done!');
    });
  });
});

describe('AC-13: a previous result is replaced, not merged into', () => {
  it('stale description, translations, SEO, slugs, FAQ and validation state do not survive a standalone run', async () => {
    const booted = bootFaqOnly();
    booted.orchestrator.content.set({
      mainHtmlUa: '<p>old description</p>', translations: { UA: '<p>old</p>' },
      seoData: { site_name: 'EXPERT3D', seo_data: [] }, slugData: { site_name: 'EXPERT3D', slugs: [] },
      website: { name: 'Drukarka 3D', group: 'EU', url: 'drukarka-3d.com.pl' }, faqArtifacts: { 'pl-PL': '<h3>old</h3>' },
    });
    booted.orchestrator.validationIssues.set([{ severity: 'error', rule: 'stale-rule', detail: 'x', context: 'HTML (base)' }]);
    const input = generatorInput('EXPERT3D');
    await booted.orchestrator.generateFaqOnly(input, false);
    const c = booted.orchestrator.content();
    expect(c.mainHtmlUa).toBe('');
    expect(c.translations).toEqual({});
    expect(c.seoData).toBeNull();
    expect(c.slugData).toBeNull();
    expect(c.website?.name).toBe('EXPERT3D');
    expect(Object.keys(c.faqArtifacts ?? {}).sort()).toEqual([...storeLanguages('EXPERT3D')].sort());
    expect(booted.orchestrator.validationIssues().some(i => i.rule === 'stale-rule')).toBe(false);
  });
});

describe('AC-12: Original Description and Tech Specs are optional grounding context', () => {
  it.each([
    ['both blank strings', { description: '', specs: '' }],
    ['whitespace only', { description: '   ', specs: '\n\t' }],
  ])('%s: the run is NOT blocked - the FAQ is generated for every language', async (_name, extra) => {
    const r = await runFaqOnly('EXPERT3D', {}, extra);
    expectMasterAttempts(r, 1);
    expect(Object.keys(content(r).faqArtifacts ?? {}).sort()).toEqual([...storeLanguages('EXPERT3D')].sort());
  });

  it('when filled they reach the FAQ generation prompt as grounding context, together with the Supplemental Content', async () => {
    const r = await runFaqOnly('EXPERT3D', {}, { description: '<p>ORIGINAL-DESCRIPTION-MARKER Bambu P1S enclosed printer</p>', specs: 'TECH-SPECS-MARKER: build volume 256 x 256 x 256 mm' });
    const prompt = generationCalls(r.booted.mock)[0].payload.userContent;
    expect(prompt).toContain('ORIGINAL-DESCRIPTION-MARKER');
    expect(prompt).toContain('TECH-SPECS-MARKER');
    expect(prompt).toContain('heated bed');   // the Supplemental Content of generatorInput()
  });
});

describe('FR-16 failure path / FR-5: blank Supplemental Content makes no call and changes no state', () => {
  it.each([['empty', ''], ['whitespace-only', '  \n\t  '], ['undefined', undefined]])(
    '%s: zero calls of any kind, content and progress untouched, no history entry', async (_name, supplemental) => {
      const booted = bootFaqOnly();
      const before = { mainHtmlUa: '<p>kept</p>', translations: { UA: '<p>kept</p>' }, seoData: null, slugData: null, faqArtifacts: { 'uk-UA': '<h3>kept</h3>' } };
      booted.orchestrator.content.set(before);
      const progress = booted.orchestrator.progressMessage();
      await booted.orchestrator.generateFaqOnly(generatorInput('EXPERT3D', { supplementalContent: supplemental }), false);
      expect(booted.mock.calls).toEqual([]);
      expect(booted.orchestrator.content()).toEqual(before);
      expect(booted.orchestrator.progressMessage()).toBe(progress);
      expect(booted.historyAdd).not.toHaveBeenCalled();
      expect(booted.orchestrator.isGenerating()).toBe(false);
    });
});

describe('Extended Thinking: the toggle value reaches the master FAQ call', () => {
  it.each([true, false])('useThinking = %s', async (thinking) => {
    const r = await runFaqOnly('Drukarka 3D', {}, {}, { thinking });
    const masterCall = r.booted.mock.generateText.mock.calls.find(c => (c[2] as { taskLabel?: string }).taskLabel === 'FAQ (uk-UA)');
    expect(masterCall, 'the master call').toBeDefined();
    expect(masterCall![1]).toBe(thinking);
  });
});

describe('AC-14 (AC-7, AC-8): <b> only, a bold lead sentence preserved', () => {
  describe.each(STORES)('store %s', (store) => {
    it('a model that answers with <strong> on every call still stores zero <strong>, the text kept inside <b>, no extra attempt', async () => {
      const r = await runFaqOnly(store, { master: FAQ_STRONG_HTML, translation: (_n, _p, iso) => translationOf(iso, FAQ_STRONG_HTML) });
      const faq = content(r).faqArtifacts!;
      expect(Object.keys(faq).sort()).toEqual([...storeLanguages(store)].sort());
      for (const [iso, html] of Object.entries(faq)) {
        expect(countOf(html, 'strong'), iso).toBe(0);
        expect(html, iso).toContain('<b>Так, рекомендовано.</b>');
      }
      expectMasterAttempts(r, 1);
      for (const iso of translationLanguages(store)) expect(translationCallsFor(r.booted.mock, iso), iso).toHaveLength(1);
    });
  });

  it('a bold lead sentence inside <p> is stored unchanged, master and translations (green guard once the method exists)', async () => {
    const r = await runFaqOnly('EXPERT3D');
    for (const [iso, html] of Object.entries(content(r).faqArtifacts!)) {
      expect(html, iso).toContain('<p><b>Так, рекомендовано.</b> Нагрівайте стіл');
    }
  });
});

describe('AC-16 / FR-18 failure path: the uk-UA master', () => {
  describe.each(STORES)('invalid on every attempt - store %s', (store) => {
    const run = lazy(() => runFaqOnly(store, { master: FAQ_INVALID_HTML }));

    it('exactly 3 master attempts, no translation call, faqArtifacts stays empty', async () => {
      const r = await run();
      expectMasterAttempts(r, 3);
      expect(translationCalls(r.booted.mock)).toEqual([]);
      expect(content(r).faqArtifacts ?? {}).toEqual({});
    });
    it('the other fields keep their AC-13 values and the run completes without throwing', async () => {
      const r = await run();
      expectStandaloneShape(r);
      expect(r.booted.orchestrator.isGenerating()).toBe(false);
    });
  });

  it.each([0, 2, 5])('the cap of 3 is fixed, independent of the user repair setting (maxRepairs = %i)', async (maxRepairs) => {
    const r = await runFaqOnly('EXPERT3D', { master: FAQ_INVALID_HTML }, {}, { maxRepairs });
    expectMasterAttempts(r, 3);
    expect(content(r).faqArtifacts ?? {}).toEqual({});
  });

  it('a valid master after two invalid ones is stored and no further master call follows', async () => {
    const r = await runFaqOnly('EXPERT3D', { master: (n) => (n <= 2 ? FAQ_INVALID_HTML : FAQ_MASTER_HTML) });
    expectMasterAttempts(r, 3);
    expect(content(r).faqArtifacts![MASTER_LOCALE]).toBe(FAQ_MASTER_HTML);
  });

  it.each([['empty', ''], ['whitespace-only', '  \n\t ']])('an %s master response is terminal: one call, no retry, nothing stored, no translation', async (_n, response) => {
    const r = await runFaqOnly('EXPERT3D', { master: response });
    expectMasterAttempts(r, 1);
    expect(translationCalls(r.booted.mock)).toEqual([]);
    expect(content(r).faqArtifacts ?? {}).toEqual({});
    expectStandaloneShape(r);
  });

  it('a provider error on every master call is 3 failed attempts, nothing stored, and the run does not abort', async () => {
    const r = await runFaqOnly('EXPERT3D', { master: () => { throw new Error('provider timeout'); } });
    expectMasterAttempts(r, 3);
    expect(content(r).faqArtifacts ?? {}).toEqual({});
    expectStandaloneShape(r);
    expect(r.booted.orchestrator.isGenerating()).toBe(false);
  });

  it('a provider error on the first master call only costs one attempt: the retry is stored', async () => {
    const r = await runFaqOnly('EXPERT3D', { master: (n) => { if (n === 1) throw new Error('rate limited'); return FAQ_MASTER_HTML; } });
    expectMasterAttempts(r, 2);
    expect(Object.keys(content(r).faqArtifacts!).sort()).toEqual([...storeLanguages('EXPERT3D')].sort());
  });
});

describe('AC-17: a translation, in the standalone run', () => {
  describe.each(STORES)('fails structural parity on every attempt - store %s', (store) => {
    it('3 attempts for that language, then it is skipped; the master and the other languages are kept', async () => {
      const bad = translationLanguages(store)[0];
      const r = await runFaqOnly(store, {
        translation: (_n, _p, iso) => (iso === bad ? translationOf(iso).replace(/<p>Для[^<]*<\/p>/, '') : translationOf(iso)),
      });
      expect(translationCallsFor(r.booted.mock, bad)).toHaveLength(3);
      expect(Object.keys(content(r).faqArtifacts!).sort()).toEqual(storeLanguages(store).filter(l => l !== bad).sort());
      expect(r.booted.orchestrator.validationIssues().some(i => i.rule === 'structural-parity-count' && /FAQ/i.test(i.context ?? ''))).toBe(true);
      expect(r.booted.historyAdd).toHaveBeenCalledTimes(1);
    });
  });

  it('a provider error on every call for one language: 3 attempts, skipped, the others kept, no abort', async () => {
    const bad = translationLanguages('EXPERT3D')[0];
    const r = await runFaqOnly('EXPERT3D', { translation: (_n, _p, iso) => { if (iso === bad) throw new Error('timeout'); return translationOf(iso); } });
    expect(translationCallsFor(r.booted.mock, bad)).toHaveLength(3);
    expect(Object.keys(content(r).faqArtifacts!).sort()).toEqual(storeLanguages('EXPERT3D').filter(l => l !== bad).sort());
    expect(r.booted.orchestrator.isGenerating()).toBe(false);
  });

  it('an empty translation is a parity failure: retried up to 3 attempts, then skipped', async () => {
    const bad = translationLanguages('EXPERT3D')[0];
    const r = await runFaqOnly('EXPERT3D', { translation: (_n, _p, iso) => (iso === bad ? '' : translationOf(iso)) });
    expect(translationCallsFor(r.booted.mock, bad)).toHaveLength(3);
    expect(content(r).faqArtifacts![bad]).toBeUndefined();
  });
});

describe('AC-9 (AC-14): a not-valid answer is regenerated, only a valid FAQ is stored', () => {
  it('an invalid translation (an <h2> added) is retried; the corrected text is stored', async () => {
    const target = translationLanguages('EXPERT3D')[0];
    const r = await runFaqOnly('EXPERT3D', { translation: (n, _p, iso) => (iso === target && n === 1 ? `${translationOf(iso)}<h2>Extra</h2>` : translationOf(iso)) });
    expect(translationCallsFor(r.booted.mock, target)).toHaveLength(2);
    for (const html of Object.values(content(r).faqArtifacts!)) expect(html).not.toMatch(/<h2\b/i);
  });
});

// ── AC-19, integration half (FR-12 items 1 and 3), standalone entry point ───────────────────────────────────────
// Reads only what the stubbed model received on each FAQ translation call (system blocks + user content) and
// asserts it is the FAQ variant of the Task C prompt: element-for-element, none of the description-only
// instructions (closing H2 / CTA, delivery-region sentence, H1 LOCK, spec labels, MASTER_SYSTEM_PROMPT). It
// never references the option that selects the variant; wording is OD-5, so only the FR-12 items are asserted.
describe('AC-19 integration: generateFaqOnly translates the FAQ with the FAQ prompt, not the description prompt', () => {
  describe.each(STORES)('store %s', (store) => {
    const run = lazy(() => runFaqOnly(store));

    it('premise: one FAQ translation call per non-master language was captured', async () => {
      const r = await run();
      expect([...new Set(translationCalls(r.booted.mock).map(c => isoOf(c.label)))].sort()).toEqual([...translationLanguages(store)].sort());
      expect(translationCalls(r.booted.mock).length).toBe(translationLanguages(store).length);
    });

    it('every FAQ translation prompt demands an element-for-element translation and carries NO description-only instruction', async () => {
      const r = await run();
      for (const c of translationCalls(r.booted.mock)) {
        expect(faqTranslationPromptProblems(c.payload), c.label).toEqual([]);
      }
    });
  });
});

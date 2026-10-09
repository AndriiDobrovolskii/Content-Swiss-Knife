/**
 * content-orchestrator.protected-name-repair-gate.spec.ts — US-7.1 T13 (FR-4, FR-8, OD-2, OD-12;
 * AC-2, AC-4 for SEO Meta, AC-6 end-to-end guard, AC-8).
 *
 * AC-8: with the LLM mocked to return `Formlabs Form Studio 1 Pro` (dropping `Resin Tank`), the repair
 * gate must flag the FR-5 violation, perform a repair attempt, and not accept the shortened name as
 * passing `meta-title-template-shape`. Today the shortened set PASSES every existing validator (that
 * is the reported defect: the gate "verified" the shortened H1), so the first test below proves the
 * premise with the real validators and the rest turn red on a call count / a missing finding.
 *
 * SURFACING POINTS PINNED HERE (builder-facing; recorded in the test strategy):
 *   - the SEO Meta gate's own `finalIssues` (repairReport()[0]) carries the FR-5 finding when it stays
 *     unresolved, and
 *   - the user-visible `validationIssues()` carries it too (generateSeoMetadata overwrites that signal
 *     with validateSeoMetadata(...) today, so T13/T14 must add the FR-5 results to that set).
 *
 * FAILURE PATHS (FR-8): still-shortened repair, a repair call that errors / is rate-limited (HTTP 429),
 * a repair response that is unparseable (LlmService.generateJson REJECTS on unparseable JSON, so it is
 * modelled as a rejected call, not as a resolved garbage object). `runRepairGate` does not catch a
 * `produce()` throw: it unwinds through withProgress, which alerts and leaves `seoData` null. "Never
 * accepted as passing" therefore means: the shortened artifact is not shipped as clean — either nothing
 * is shipped (`seoData` null) or the finding is reported. Both are asserted, never neither.
 *
 * AC-4: every scenario that is not about a single store iterates STORE_REGISTRY (TEST_WRITING
 * condition 2); each store's locales come from getLangsForStore. DI, NOT TestBed.
 */
import '@angular/compiler';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { getLangsForStore } from '../prompt-core/constants';
import { validateSeoMetadata } from '../utils/output-validator';
import { validateSeoMetadataShape } from '../utils/seo-metadata-shape';
import {
  FIXTURE_A, FR5_RULES, LONG_CATEGORY, SHORT_CATEGORY, registryStores, productInput, makeMockLlm,
  bootOrchestrator, compliantSeo, shortenedSeo, compliantSlugs, stubBrowserGlobals, pipelineRoutes,
} from '../../test/fixtures/protected-name';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const stores = registryStores().map(s => [s] as [string]);
const fr5 = <T extends { rule: string }>(issues: T[]): T[] => issues.filter(i => FR5_RULES.includes(i.rule));

describe.each(stores)('SEO Meta repair gate — generateSeoMetadata(), store %s (AC-8, AC-4)', (store) => {
  const input = () => productInput(store, FIXTURE_A);
  const seoRoute = (fn: (n: number) => unknown) => makeMockLlm({ json: { 'SEO metadata': fn } });

  it('premise: the shortened set passes every EXISTING validator — today\'s gate accepts it', () => {
    const shortened = shortenedSeo(store);
    expect(validateSeoMetadata(shortened, '').filter(i => i.severity === 'error')).toEqual([]);
    expect(validateSeoMetadataShape(shortened, 'SEO metadata')).toEqual([]);
  });

  it('flags the violation and performs a repair attempt, then ships the corrected set', async () => {
    stubBrowserGlobals();
    const mock = seoRoute(n => (n === 1 ? shortenedSeo(store) : compliantSeo(store, FIXTURE_A)));
    const o = bootOrchestrator(mock);

    await o.generateSeoMetadata(input());

    expect(mock.callsFor('SEO metadata')).toHaveLength(2);           // 1 attempt + 1 repair (maxRepairs = 1)
    expect(o.repairReport()[0].repairsUsed).toBe(1);
    const shipped = o.content().seoData!;
    expect(shipped.seo_data.map(e => e.language)).toEqual(getLangsForStore(store).seoLangs);
    for (const e of shipped.seo_data) {
      expect(e.h1).toContain(FIXTURE_A);
      expect(e.meta_title).toContain(FIXTURE_A);
      expect(Array.from(e.meta_title).length).toBeLessThanOrEqual(55);
      expect(`${e.h1} ${e.meta_title} ${e.meta_description}`).not.toMatch(/Form Studio 1 Pro/);
    }
    expect(fr5(o.repairReport()[0].finalIssues)).toEqual([]);
    expect(fr5(o.validationIssues())).toEqual([]);
  });

  it('the repair request names the violation and restates the OD-2 priority (typed name outranks the category)', async () => {
    stubBrowserGlobals();
    const mock = seoRoute(n => (n === 1 ? shortenedSeo(store) : compliantSeo(store, FIXTURE_A)));
    await bootOrchestrator(mock).generateSeoMetadata(input());

    const [first, repairCall] = mock.callsFor('SEO metadata');
    expect(repairCall).toBeDefined();
    // Judge the FEEDBACK part only: the base userContent already carries the OD-2 sentence through the
    // T6 block, so asserting on the whole text could not tell whether `withFeedback` restates it (T13).
    const feedback = repairCall.payload.userContent.slice(first.payload.userContent.length);
    expect(repairCall.payload.userContent.startsWith(first.payload.userContent)).toBe(true);
    expect(feedback).toContain('[VALIDATION FEEDBACK');
    expect(feedback).toMatch(/product-name-(token-missing|shortened-form)/);
    expect(feedback).toContain('Resin');
    expect(feedback).toMatch(/outrank|priority|precedence|wins over|takes priority/i);
    // The cached blocks are reused by reference (AGENTS.md §3): feedback goes in userContent only.
    expect(repairCall.payload.systemBlocks).toBe(first.payload.systemBlocks);
  });

  it('FAILURE PATH: the repair still returns the shortened name -> unresolved, reported, never passing', async () => {
    stubBrowserGlobals();
    const mock = seoRoute(() => shortenedSeo(store));
    const o = bootOrchestrator(mock);

    await o.generateSeoMetadata(input());

    expect(mock.callsFor('SEO metadata').length).toBeGreaterThanOrEqual(2);
    const gateFindings = fr5(o.repairReport()[0].finalIssues);
    expect(gateFindings.length).toBeGreaterThan(0);
    expect(gateFindings.every(i => i.severity === 'error')).toBe(true);
    const visible = fr5(o.validationIssues());
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.some(i => i.severity === 'error')).toBe(true);
  });

  it.each([
    ['the repair call errors with HTTP 429', () => Object.assign(new Error('429 Too Many Requests'), { status: 429 })],
    ['the repair response is unparseable JSON', () => new SyntaxError('Unexpected token < in JSON at position 0')],
  ])('FAILURE PATH: %s -> the shortened name is not accepted as passing', async (_label, makeError) => {
    stubBrowserGlobals();
    const mock = seoRoute(n => (n === 1 ? shortenedSeo(store) : makeError()));
    const o = bootOrchestrator(mock);

    await o.generateSeoMetadata(input());

    // A repair WAS attempted (today none is: the shortened set is accepted on the first call).
    expect(mock.callsFor('SEO metadata')).toHaveLength(2);
    const shipped = o.content().seoData;
    const reported = fr5(o.validationIssues()).some(i => i.severity === 'error');
    // Either nothing shipped, or the finding is reported — never a clean-looking shortened artifact.
    expect(shipped === null || reported).toBe(true);
    if (shipped) {
      expect(fr5(o.repairReport().flatMap(r => r.finalIssues)).length + fr5(o.validationIssues()).length)
        .toBeGreaterThan(0);
    }
  });
});

describe.each(stores)('SEO Meta gate inside the other two pipelines — store %s (AC-8, AC-4)', (store) => {
  const routes = (seo: (n: number) => unknown) => ({
    ...pipelineRoutes(store, FIXTURE_A),
    json: { ...pipelineRoutes(store, FIXTURE_A).json, 'SEO metadata': seo },
  });
  const correctedAfterFirst = (n: number) => (n === 1 ? shortenedSeo(store) : compliantSeo(store, FIXTURE_A));

  it.each([
    ['generate()', (o: ReturnType<typeof bootOrchestrator>, i: ReturnType<typeof productInput>) => o.generate(i)],
    ['generateUaContent()', (o: ReturnType<typeof bootOrchestrator>, i: ReturnType<typeof productInput>) => o.generateUaContent(i)],
  ] as const)('%s repairs a shortened SEO set before shipping it', async (_label, run) => {
    stubBrowserGlobals();
    const mock = makeMockLlm(routes(correctedAfterFirst));
    const o = bootOrchestrator(mock);

    await run(o, productInput(store, FIXTURE_A));

    expect(mock.callsFor('SEO metadata').length).toBeGreaterThanOrEqual(2);
    const seo = o.content().seoData!;
    expect(seo).not.toBeNull();
    for (const e of seo.seo_data) {
      expect(e.h1).toContain(FIXTURE_A);
      expect(e.meta_title).toContain(FIXTURE_A);
    }
    expect(fr5(o.validationIssues())).toEqual([]);
  });
});

describe.each(stores)('SEO core name fed to Task B — store %s (FR-4, OD-2, OD-12 default, AC-2)', (store) => {
  /** Slugs first (approves the localized names), then SEO Meta for the same product and store. */
  async function slugsThenSeo(category: string) {
    stubBrowserGlobals();
    const mock = makeMockLlm({
      json: {
        Slug: () => compliantSlugs(store, FIXTURE_A, category),
        'SEO metadata': () => compliantSeo(store, FIXTURE_A),
      },
    });
    const o = bootOrchestrator(mock);
    const input = productInput(store, FIXTURE_A);
    await o.generateSlugs(input);
    await o.generateSeoMetadata(input);
    return mock.callsFor('SEO metadata')[0].payload.userContent;
  }
  const namesBlock = (userContent: string) => {
    const section = userContent.split('[LOCALIZED NAMES')[1] ?? '';
    return Object.fromEntries(
      [...section.matchAll(/^\s+([a-z]{2}-[A-Z]{2}): "([^"]*)"/gm)].map(m => [m[1], m[2]]),
    );
  };
  const isEn = (l: string) => l.toLowerCase().startsWith('en-');

  it('category + typed name at 54 code points or more: the category is dropped, the typed name alone is passed', async () => {
    const names = namesBlock(await slugsThenSeo(LONG_CATEGORY));
    expect(Object.keys(names)).toEqual(getLangsForStore(store).seoLangs);
    for (const [lang, name] of Object.entries(names)) expect(name, lang).toBe(FIXTURE_A);
  });

  it('category + typed name under 54 code points: the localized category is kept', async () => {
    const names = namesBlock(await slugsThenSeo(SHORT_CATEGORY));
    for (const [lang, name] of Object.entries(names)) {
      expect(name, lang).toBe(isEn(lang) ? FIXTURE_A : `${SHORT_CATEGORY} ${FIXTURE_A}`);
    }
  });
});

describe.each(stores)('AC-6 / FR-12 end-to-end guard — a compliant Fixture A set passes every existing check — store %s', (store) => {
  it('no error-level finding, meta_title <= 55, meta_description <= 155 and ends with the CTA', async () => {
    stubBrowserGlobals();
    const mock = makeMockLlm({ json: { 'SEO metadata': () => compliantSeo(store, FIXTURE_A) } });
    const o = bootOrchestrator(mock);

    await o.generateSeoMetadata(productInput(store, FIXTURE_A));

    expect(mock.callsFor('SEO metadata')).toHaveLength(1);
    expect(o.validationIssues().filter(i => i.severity === 'error')).toEqual([]);
    for (const e of o.content().seoData!.seo_data) {
      expect(Array.from(e.meta_title).length).toBeLessThanOrEqual(55);
      expect(Array.from(e.meta_description).length).toBeLessThanOrEqual(155);
      expect(e.meta_description.trimEnd().endsWith('➔')).toBe(true);
      expect(e.meta_description).not.toMatch(/[€$₴£]|zł/);   // §4: no currency symbol at Task B
    }
  });
});

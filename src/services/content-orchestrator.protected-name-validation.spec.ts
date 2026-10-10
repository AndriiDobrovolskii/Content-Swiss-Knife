/**
 * content-orchestrator.protected-name-validation.spec.ts — US-7.1 T14 (FR-3, FR-5, FR-6, FR-7, FR-10;
 * AC-1, AC-3, AC-4, AC-5, AC-6).
 *
 * REPORT-ONLY surfaces (FR-3, FR-6, FR-7). Slugs names/slugs, the description (uk-UA master and every
 * Task C translation) and the Optimizer output get the FR-5 check as a REPORTED, error-level finding in
 * `validationIssues()`; no repair attempt is required (Specification FR-3/FR-6 failure paths; plan
 * rejected-alternative 6). The SEO Meta gate is the one surface with a repair (see
 * content-orchestrator.protected-name-repair-gate.spec.ts).
 *
 * SURFACING POINTS PINNED HERE (plan-review non-blocking 3 handed this choice to TEST_WRITING; recorded
 * in the test strategy for so-builder):
 *   - Slugs mode: `generateSlugs()` ends with `validationIssues.set(slugFinalIssues)`, so the FR-5 result
 *     must be merged into that set. One `Slug` request, no repair call.
 *   - Description: `generate()` / `generateUaContent()` end in `runOutputValidation`; the FR-5 results
 *     for `HTML (<master>)` and each `HTML (<lang>)` are merged into the visible issues.
 *   - Optimizer: `optimize()` never touches `validationIssues` today; the check for a supplied
 *     [Product Name] must be merged there. The number of model calls must not change.
 *   "Report-only" is asserted as a call-count equality between a run with the altered name and a run
 *   with the full name: FR-5 must not buy an extra model call on these surfaces.
 *
 * FR-10 at the orchestrator: the protected slug trimmer is used for a protected name, so `resin-tank`
 * survives a 100-character trim. A generic name keeps the legacy trimmer (regression guard).
 *
 * AC-4: every Slugs / description scenario iterates STORE_REGISTRY. DI, NOT TestBed.
 */
import '@angular/compiler';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { getLangsForStore } from '../prompt-core/constants';
import { enforceSlugLength, normalizeSlug, stripSlugStopwords } from '../prompt-core/slug-utils';
import {
  FIXTURE_A, FIXTURE_C, PART1, PART2, FR5_RULES, registryStores, productInput, makeMockLlm, bootOrchestrator,
  compliantSlugs, shortenedSlugs, pipelineRoutes, stubBrowserGlobals,
} from '../../test/fixtures/protected-name';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const stores = registryStores().map(s => [s] as [string]);
const fr5 = <T extends { rule: string }>(issues: T[]) => issues.filter(i => FR5_RULES.includes(i.rule));
const TYPED_SLUG = 'formlabs-form-studio-1-resin-tank-pro';

describe.each(stores)('Slugs mode, report-only — generateSlugs(), store %s (FR-3, FR-5, AC-1, AC-4)', (store) => {
  const { seoLangs } = getLangsForStore(store);

  it('the observed bug: every locale\'s shortened name is reported as an error addressed by its index, in ONE request, with no repair call', async () => {
    stubBrowserGlobals();
    const mock = makeMockLlm({ json: { Slug: () => shortenedSlugs(store) } });
    const o = bootOrchestrator(mock);

    await o.generateSlugs(productInput(store, FIXTURE_A));

    expect(mock.callsFor('Slug')).toHaveLength(1);             // report-only: FR-3 does not require a Slugs re-request
    expect(mock.generateText).not.toHaveBeenCalled();          // ...nor a field-scoped repair call
    const issues = fr5(o.validationIssues());
    const namePaths = issues.filter(i => i.rule === PART1 && i.path?.endsWith('.name')).map(i => i.path);
    expect(namePaths).toEqual(expect.arrayContaining(seoLangs.map((_, i) => `slugs[${i}].name`)));
    for (const i of issues) {
      expect(i.severity).toBe('error');
      expect(seoLangs.some(l => i.context.includes(l))).toBe(true);
    }
    expect(issues.map(i => i.detail).join(' ')).toContain('Resin');
  });

  it('a compliant set raises no FR-5 finding and keeps the typed-name slug in every locale', async () => {
    stubBrowserGlobals();
    const mock = makeMockLlm({ json: { Slug: () => compliantSlugs(store, FIXTURE_A) } });
    const o = bootOrchestrator(mock);

    await o.generateSlugs(productInput(store, FIXTURE_A));

    expect(mock.callsFor('Slug')).toHaveLength(1);
    expect(fr5(o.validationIssues())).toEqual([]);
    for (const s of o.content().slugData!.slugs) expect(s.slug).toContain(TYPED_SLUG);
  });

  it('FR-10 (a): a long name is trimmed to <= 100 characters and still contains the whole typed-name slug', async () => {
    stubBrowserGlobals();
    const filler = Array.from({ length: 15 }, (_, i) => `filler${i}`).join(' ');
    // A distinct leading token per locale keeps the slugs unique, so ensureUniqueSlugs adds no suffix.
    const mock = makeMockLlm({
      json: {
        Slug: () => ({
          site_name: store,
          slugs: seoLangs.map(language => ({ language, name: `${language} ${FIXTURE_A} ${filler} accuracy 0.015 mm`, slug: 'x' })),
        }),
      },
    });
    const o = bootOrchestrator(mock);

    await o.generateSlugs(productInput(store, FIXTURE_A));

    for (const s of o.content().slugData!.slugs) {
      expect(s.slug.length, s.language).toBeLessThanOrEqual(100);
      expect(s.slug, s.language).toContain(TYPED_SLUG);
    }
  });

  it('regression guard: a GENERIC name keeps the legacy slug trimmer byte-for-byte and raises no FR-5 finding', async () => {
    stubBrowserGlobals();
    const filler = Array.from({ length: 15 }, (_, i) => `filler${i}`).join(' ');
    const names = seoLangs.map(language => ({ language, name: `${language} ${FIXTURE_C} ${filler} accuracy 0.015 mm` }));
    const mock = makeMockLlm({
      json: { Slug: () => ({ site_name: store, slugs: names.map(n => ({ ...n, slug: 'x' })) }) },
    });
    const o = bootOrchestrator(mock);

    await o.generateSlugs(productInput(store, FIXTURE_C));

    const shipped = o.content().slugData!.slugs;
    for (const [i, n] of names.entries()) {
      // The legacy derivation, computed from the REAL functions (as content-orchestrator.repair-field-wiring.spec.ts does).
      const canonicalName = shipped[i].name;
      const legacy = enforceSlugLength(canonicalName, normalizeSlug(stripSlugStopwords(canonicalName), n.language), n.language);
      expect(shipped[i].slug.startsWith(legacy), n.language).toBe(true);
    }
    expect(fr5(o.validationIssues())).toEqual([]);
  });
});

describe.each(stores)('Description surfaces, report-only — generate() and generateUaContent(), store %s (FR-5 part 2, FR-6, AC-3, AC-4)', (store) => {
  const ALTERED = 'Придбайте Form Studio 1 Pro сьогодні.';
  const FULL = `Придбайте ${FIXTURE_A} сьогодні.`;
  const { transLangs } = getLangsForStore(store);

  const runners = [
    ['generate()', (o: ReturnType<typeof bootOrchestrator>) => o.generate(productInput(store, FIXTURE_A))],
    ['generateUaContent()', (o: ReturnType<typeof bootOrchestrator>) => o.generateUaContent(productInput(store, FIXTURE_A))],
  ] as const;

  async function runWith(sentence: string, run: (typeof runners)[number][1]) {
    stubBrowserGlobals();
    const mock = makeMockLlm(pipelineRoutes(store, FIXTURE_A, { descriptionSentence: sentence }));
    const o = bootOrchestrator(mock);
    await run(o);
    return { mock, o };
  }
  const callCounts = (mock: ReturnType<typeof makeMockLlm>) => {
    const counts: Record<string, number> = {};
    for (const c of mock.calls) counts[`${c.kind}:${c.label}`] = (counts[`${c.kind}:${c.label}`] ?? 0) + 1;
    return counts;
  };

  it.each(runners)('%s: the altered form in the master is reported, as an error, with the master\'s context', async (_label, run) => {
    const { o } = await runWith(ALTERED, run);
    const master = fr5(o.validationIssues()).filter(i => /^HTML \((base|uk-UA)\)$/.test(i.context));
    expect(master.length).toBeGreaterThan(0);
    expect(master.every(i => i.rule === PART2 && i.severity === 'error')).toBe(true);
    expect(master[0].detail).toContain('Form Studio 1 Pro');
  });

  it('generate(): the altered form in every Task C translation is reported per locale', async () => {
    const { o } = await runWith(ALTERED, runners[0][1]);
    const contexts = new Set(fr5(o.validationIssues()).map(i => i.context));
    for (const lang of transLangs) expect(contexts, `HTML (${lang})`).toContain(`HTML (${lang})`);
  });

  it.each(runners)('%s: the full designator everywhere raises nothing', async (_label, run) => {
    const { o } = await runWith(FULL, run);
    expect(fr5(o.validationIssues())).toEqual([]);
  });

  it.each(runners)('%s: REPORT-ONLY — the altered name buys no extra model call versus the full name', async (_label, run) => {
    const altered = await runWith(ALTERED, run);
    const full = await runWith(FULL, run);
    expect(callCounts(altered.mock)).toEqual(callCounts(full.mock));
  });
});

describe('Optimizer, report-only with a supplied Product Name (FR-7, AC-5; TEST_WRITING condition 3)', () => {
  const ALTERED_HTML = '<p>Відкрийте для себе Form Studio 1 Pro вже сьогодні.</p>';
  const FULL_HTML = `<p>Відкрийте для себе ${FIXTURE_A} вже сьогодні.</p>`;

  async function runOptimize(html: string, name: string) {
    stubBrowserGlobals();
    const mock = makeMockLlm({ text: { Optimizer: () => html } });
    const o = bootOrchestrator(mock);
    await o.optimize('<p>input</p>', name);
    return { mock, o };
  }

  it('reports an altered name in the optimized output as an error in validationIssues()', async () => {
    const { o } = await runOptimize(ALTERED_HTML, FIXTURE_A);
    const issues = fr5(o.validationIssues());
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every(i => i.rule === PART2 && i.severity === 'error')).toBe(true);
    expect(issues[0].detail).toContain('Form Studio 1 Pro');
  });

  it('REPORT-ONLY: the altered name costs no extra model call versus the full name', async () => {
    const altered = await runOptimize(ALTERED_HTML, FIXTURE_A);
    const full = await runOptimize(FULL_HTML, FIXTURE_A);
    expect(altered.mock.callsFor('Optimizer').length).toBe(full.mock.callsFor('Optimizer').length);
  });

  it('the full name raises nothing', async () => {
    const { o } = await runOptimize(FULL_HTML, FIXTURE_A);
    expect(fr5(o.validationIssues())).toEqual([]);
  });

  it('a generic Product Name is never checked', async () => {
    const { o } = await runOptimize('<p>Загартоване сопло</p>', FIXTURE_C);
    expect(fr5(o.validationIssues())).toEqual([]);
  });

  it('with NO Product Name there is no typed name to check against (OD-7): prompt-only, no finding', async () => {
    const { o } = await runOptimize(ALTERED_HTML, '');
    expect(fr5(o.validationIssues())).toEqual([]);
  });
});

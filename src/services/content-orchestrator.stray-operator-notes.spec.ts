/**
 * content-orchestrator.stray-operator-notes.spec.ts - US-9.1 FR-44 item 4 (task breakdown P6 and P7).
 *
 * The operator-notes feature is withdrawn (Story v5, 2026-10-19) and nothing may read, show, send or ground a stored
 * `operatorNotes` value any more (browsers that ran the feature may still hold one in a `seo_gen_history` entry; NFR-13: no
 * migration). Two consequences live in the orchestrator, written from the Specification (FR-44 item 4) and not from the
 * plan's proposed code:
 *
 *  - P6 / item 4.1 (owner task T45): a stray `operatorNotes` value holding a number that appears nowhere else in specs,
 *    description or name does NOT ground that number. Observed at the quality gate the way the spec says: the orchestrator's OWN
 *    source assembly (`numericFidelitySources`, reached through `bootOrchestrator` and a private-method cast; the
 *    Specification forbids only hand-built sources) is fed to the REAL `validateAltNumericFidelity`; the gate reports
 *    `alt-numeric-not-grounded` naming `777` for a figure whose alt/figcaption states `777 Вт`, and the sources string equals
 *    the one produced for the same input WITHOUT the stray property (the paired with/without comparison is what lets this fail).
 *  - P7 / item 4.2 (stay green T45 to T49): a stray non-blank `operatorNotes` with no `supplementalContent` triggers no FAQ
 *    request, store by store, in the Generator and in the UA Description. `faqCalls` counts FAQ generation AND translation
 *    calls (stricter than the Specification's `FAQ (<locale>)`). GREEN ON ARRIVAL: no FAQ trigger ever read the notes. The
 *    block the Specification relies on for "supplementalContent drives the FAQ" is the successor
 *    `describe('R6 (human resolution) ...')` at line 322 of `content-orchestrator.simplified.spec.ts` (corrected reading, P14
 *    item 2), which passes unmodified and is NOT edited here.
 *
 * CAST CONSTRAINT (plan W8, F6): every stray property is attached through `unknown`, never through a typed literal, so this
 * file compiles BOTH while `ProductInput.operatorNotes` still exists AND after T49 removes it (an uncast literal would fail the
 * tsc excess-property check that `npm run lint` runs over test/**).
 *
 * The harnesses (`sourcesFor`, `runGenerate` / `runUa`) are carried over from the deleted
 * `content-orchestrator.operator-notes.spec.ts` (task breakdown P0 / W7).
 *
 * DI, NOT TestBed: see content-orchestrator.ua-doc-pipeline.spec.ts.
 */
import '@angular/compiler';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { validateAltNumericFidelity } from '../utils/alt-numeric-fidelity';
import type { ProductInput } from '../app/types';
import {
  registryStores, stubBrowserGlobals, runGenerate, runUa, faqCalls, makeMockLlm, SUPPLEMENTAL,
  type Run,
} from '../../test/fixtures/faq-pipeline';
import { bootOrchestrator } from '../../test/fixtures/protected-name';

beforeAll(() => { stubBrowserGlobals(); });
afterAll(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

/** Attaches a stray `operatorNotes` through `unknown`: compiles before and after `ProductInput.operatorNotes` is removed. */
const withStray = (extra: Partial<ProductInput> = {}, value: unknown): Partial<ProductInput> => {
  const loose: Record<string, unknown> = { ...extra, operatorNotes: value };
  return loose as unknown as Partial<ProductInput>;
};

const STRAY_KEYS = ['usageScenarios', 'testResults', 'previousGenerationComparison', 'limitations'] as const;

// ── P6 / FR-44 item 4.1 ───────────────────────────────────────────────────────────────────────────────────

describe('FR-44 item 4.1 (T45): a stray operatorNotes value grounds no number in the alt/figcaption gate', () => {
  /** specs/description/name hold 20 W, never 777. */
  const BASE_INPUT: Partial<ProductInput> = {
    website: { name: 'EXPERT3D', group: 'ES', url: 'https://x.example' },
    name: 'Ortur H20',
    description: 'Laser engraver with a 20 W module.',
    specs: '| Power | 20 W |',
  };
  const HTML_WITH_777_W =
    '<p>Лазерна головка.</p><figure><img src="https://cdn.example/x/lamp.jpg" alt="лазерна головка 777 Вт"><figcaption>Потужність 777 Вт</figcaption></figure>';
  const HTML_WITH_20_W = HTML_WITH_777_W.replace(/777/g, '20');
  /**
   * The stray value: `777 Вт`, written as a sentence. Joined to the preceding source line a BARE "777 Вт" would read as a thousands
   * group ("20\n777" is one number to the validator) and the phantom number 20777 would hide whether 777 itself is grounded.
   */
  const STRAY_TEXT = 'Протестовано на 777 Вт';
  const notGrounded = (issues: Array<{ rule: string; detail: string }>) => issues.filter(i => i.rule === 'alt-numeric-not-grounded');

  /** The orchestrator's private source builder, observed as the sources string it hands to the gate. */
  function sourcesFor(input: Partial<ProductInput>): string {
    const o = bootOrchestrator(makeMockLlm());
    const full = { ...BASE_INPUT, ...input } as ProductInput;
    return (o as unknown as { numericFidelitySources(i: ProductInput, m?: unknown[]): string }).numericFidelitySources(full, []);
  }

  it('control: the gate is not blind - a figure stating 777 Вт is reported when no source states it', () => {
    const issues = notGrounded(validateAltNumericFidelity(HTML_WITH_777_W, sourcesFor({}), 'HTML (base)'));
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every(i => i.detail.includes('777'))).toBe(true);
  });

  it('control: a number the specs DO state (20 Вт) is grounded', () => {
    expect(notGrounded(validateAltNumericFidelity(HTML_WITH_20_W, sourcesFor({}), 'HTML (base)'))).toEqual([]);
  });

  it.each(STRAY_KEYS)('a stray "777 Вт" in operatorNotes.%s does not ground 777: the gate reports alt-numeric-not-grounded naming 777', key => {
    const sources = sourcesFor(withStray({}, { [key]: STRAY_TEXT }));
    const issues = notGrounded(validateAltNumericFidelity(HTML_WITH_777_W, sources, 'HTML (base)'));
    expect(issues.length, 'the stray value grounded the number').toBeGreaterThan(0);
    expect(issues.every(i => i.detail.includes('777'))).toBe(true);
  });

  it.each(STRAY_KEYS)('the sources string with a stray operatorNotes.%s equals the sources string without the property', key => {
    expect(sourcesFor(withStray({}, { [key]: STRAY_TEXT }))).toBe(sourcesFor({}));
  });

  it('all four stray keys together change nothing either (sources equal, 777 still reported)', () => {
    const stray = withStray({}, Object.fromEntries(STRAY_KEYS.map(k => [k, STRAY_TEXT])));
    expect(sourcesFor(stray)).toBe(sourcesFor({}));
    expect(notGrounded(validateAltNumericFidelity(HTML_WITH_777_W, sourcesFor(stray), 'HTML (base)')).length).toBeGreaterThan(0);
  });
});

// ── P7 / FR-44 item 4.2 ───────────────────────────────────────────────────────────────────────────────────

describe('FR-44 item 4.2 (stay green T45 to T49): a stray operatorNotes value triggers no FAQ request', () => {
  const STORES = registryStores().map(s => [s] as [string]);
  type Runner = (store: string, over?: Record<string, never>, extra?: Partial<ProductInput>) => Promise<Run>;
  const MODES: Array<{ name: string; run: Runner }> = [
    { name: 'Generator (generate)', run: runGenerate as Runner },
    { name: 'UA Description (generateUaContent)', run: runUa as Runner },
  ];
  const STRAY = {
    usageScenarios: 'STRAY-NOTE-7731: prototyping brackets for a workshop',
    testResults: 'STRAY-NOTE-7731: printed 40 parts at 0.2 mm',
    previousGenerationComparison: 'STRAY-NOTE-7731: quieter than the previous model',
    limitations: 'STRAY-NOTE-7731: cable required for laser mode',
  };

  describe.each(MODES)('$name', ({ run }) => {
    it('control: the detector is not blind - the same run WITH supplementalContent does make FAQ calls', async () => {
      const r = await run(registryStores()[0], {}, { supplementalContent: SUPPLEMENTAL });
      expect(faqCalls(r.mock).length).toBeGreaterThan(0);
    });

    it.each(STORES)('store %s: with supplementalContent undefined and a stray non-blank operatorNotes, no FAQ generation or translation call is made and the run equals the run without the property', async store => {
      const without = await run(store, {}, { supplementalContent: undefined });
      const stray = await run(store, {}, withStray({ supplementalContent: undefined }, STRAY));
      expect(faqCalls(stray.mock).map(c => c.label), 'a FAQ call was made on account of the stray property').toEqual([]);
      expect(faqCalls(stray.mock).map(c => c.label)).toEqual(faqCalls(without.mock).map(c => c.label));
      const artifacts = stray.orchestrator.content().faqArtifacts;
      expect(artifacts === undefined || Object.keys(artifacts).length === 0, 'faqArtifacts was filled').toBe(true);
    });
  });
});

/**
 * content-orchestrator.operator-notes.spec.ts - US-9.1 T8 (FR-28 FAQ isolation), T10 (FR-30 numeric fidelity,
 * FR-40 non-Task-A side). AC-9.
 *
 * The four Generator "operator notes" travel in a new optional `ProductInput.operatorNotes`, NOT in
 * `supplementalContent`, because `supplementalContent` is the only FAQ trigger in the Generator
 * (`runFaqPipeline`: `input.supplementalContent?.trim()`). These specs pin the three consequences that live
 * in the orchestrator, written from the Specification and not from the plan's proposed code:
 *
 *  - T8 / FR-28: filling ONLY the notes never starts the FAQ pipeline (no FAQ generation or translation call,
 *    no `faqArtifacts`), in `generate()` and in `generateUaContent()`, on every store. Control: the same run
 *    with `supplementalContent` set does start it, so the detector is not blind.
 *  - T10 / FR-30: `numericFidelitySources` includes the four note values, so a number that appears ONLY in a
 *    note passes the alt/figcaption numeric-fidelity gate, and the same number absent from the notes still
 *    fails it. A number only in `supplementalContent` behaves as before (OD-20(2): `supplementalContent` is NOT
 *    added; `NUMERIC_SOURCE_FIDELITY_RULES` is NOT extended).
 *  - T10 / FR-40 (non-Task-A side): the notes reach Task A (and the Doc pipeline through its byte prefix) ONLY.
 *    The SEO-meta, slug, FAQ and translation prompts of a whole run are identical with the notes filled and
 *    with them absent, and none of them contains a note's text.
 *
 * T8's group is GREEN ON ARRIVAL by the breakdown's own wording ("the two tests pass because the existing FAQ
 * trigger and HistoryService already ignore / carry the field, which is exactly what they pin"): they are
 * guards that must survive the whole Story. T10's FR-30 "passes a note-only number" case is RED until T10, and
 * is gated on T21 (task-a.ts T-A4, the only route by which a note reaches a prompt).
 *
 * `ProductInput.operatorNotes` does not exist until T8, so the field is added through a cast
 * (`withNotes`): this spec type-checks at every commit (task breakdown constraint 1).
 *
 * DI, NOT TestBed: see content-orchestrator.ua-doc-pipeline.spec.ts.
 */
import '@angular/compiler';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { NUMERIC_SOURCE_FIDELITY_RULES } from '../prompt-core/constants';
import { validateAltNumericFidelity } from '../utils/alt-numeric-fidelity';
import type { ProductInput } from '../app/types';
import {
  registryStores, stubBrowserGlobals, runGenerate, runUa, faqCalls, SUPPLEMENTAL, makeMockLlm,
  type Run,
} from '../../test/fixtures/faq-pipeline';
import { bootOrchestrator } from '../../test/fixtures/protected-name';

beforeAll(() => { stubBrowserGlobals(); });
afterAll(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

/** NUMERIC_SOURCE_FIDELITY_RULES as it stood on the commit the Story branch was cut from (not edited: FR-30, OD-20(2)). */
const PRE_STORY_NUMERIC_RULES_SHA256 = '4d18ed53c2c5507b69601ef782dd18ef3589c21e75db94760a794766f1a16190';
const PRE_STORY_NUMERIC_RULES_LENGTH = 1776;

const TOKEN = 'NOTE-TOKEN-7731';
const NOTES = {
  usageScenarios: `${TOKEN}: prototyping brackets for a workshop`,
  testResults: `${TOKEN}: printed 40 parts at 0.2 mm`,
  previousGenerationComparison: `${TOKEN}: quieter than the previous model`,
  limitations: `${TOKEN}: cable required for laser mode`,
};
const NOTES_KEYS = Object.keys(NOTES) as Array<keyof typeof NOTES>;

/** The shared fixture builds every input WITH a `supplementalContent`; 'notes only' blanks it explicitly. */
/** Adds `operatorNotes` through a cast: the field does not exist on `ProductInput` until T8. */
const withNotes = (extra: Partial<ProductInput> = {}, notes: unknown = NOTES): Partial<ProductInput> =>
  ({ ...extra, operatorNotes: notes }) as unknown as Partial<ProductInput>;

const STORES = registryStores().map(s => [s] as [string]);
type Runner = (store: string, over?: Record<string, never>, extra?: Partial<ProductInput>) => Promise<Run>;
const MODES: Array<{ name: string; run: Runner }> = [
  { name: 'Generator (generate)', run: runGenerate as Runner },
  { name: 'UA Description (generateUaContent)', run: runUa as Runner },
];

// ── T8 / FR-28 ────────────────────────────────────────────────────────────────────────────────────────

describe.each(MODES)('FR-28 (T8): filling only the operator notes never starts FAQ generation - $name', ({ run }) => {
  it.each(STORES)('store %s: no FAQ generation call, no FAQ translation call, no faqArtifacts', async store => {
    const r = await run(store, {}, withNotes({ supplementalContent: '' }));
    expect(faqCalls(r.mock).map(c => c.label), 'a FAQ call was made on account of the notes').toEqual([]);
    const artifacts = r.orchestrator.content().faqArtifacts;
    expect(artifacts === undefined || Object.keys(artifacts).length === 0, 'faqArtifacts was filled').toBe(true);
  });

  it.each(STORES)('store %s: control - the same run with supplementalContent set DOES make FAQ calls, notes or not', async store => {
    const withoutNotes = await run(store, {}, { supplementalContent: SUPPLEMENTAL });
    const both = await run(store, {}, withNotes({ supplementalContent: SUPPLEMENTAL }));
    expect(faqCalls(withoutNotes.mock).length).toBeGreaterThan(0);
    expect(faqCalls(both.mock).map(c => c.label)).toEqual(faqCalls(withoutNotes.mock).map(c => c.label));
  });

  it('whitespace-only notes and an empty object do not start the FAQ either (they are empty by the FR-25 rule)', async () => {
    const store = registryStores()[0];
    for (const notes of [{}, { usageScenarios: '   ', testResults: '\n' }]) {
      const r = await run(store, {}, withNotes({ supplementalContent: '' }, notes));
      expect(faqCalls(r.mock)).toEqual([]);
    }
  });
});

// ── T10 / FR-40 (non-Task-A side) ─────────────────────────────────────────────────────────────────────

/** Calls that are NOT the Task A master (its own artifact call and the repairs of that artifact). */
const isMasterTaskA = (label: string) =>
  /^(?:Doc|HTML) \((?:base|uk-UA)\)$/.test(label) || /^Doc block repair/.test(label) || /repair/i.test(label);

const payloadsByLabel = (r: Run) => {
  const out = new Map<string, string[]>();
  for (const c of r.mock.calls) {
    if (isMasterTaskA(c.label)) continue;
    out.set(c.label, [...(out.get(c.label) ?? []), JSON.stringify(c.payload)]);
  }
  return out;
};

describe.each(MODES)('FR-40 (T10): the notes reach Task A only - $name', ({ run }) => {
  it.each(STORES)('store %s: every SEO-meta, slug, FAQ and translation payload is identical with the notes filled and absent, and none contains a note', async store => {
    const extra = { supplementalContent: SUPPLEMENTAL };
    const without = await run(store, {}, extra);
    const filled = await run(store, {}, withNotes(extra));
    const a = payloadsByLabel(without);
    const b = payloadsByLabel(filled);
    expect([...b.keys()].sort(), 'the set of non-Task-A calls differs').toEqual([...a.keys()].sort());
    for (const [label, payloads] of a) {
      expect(b.get(label), `payloads of "${label}" differ when the notes are filled`).toEqual(payloads);
    }
    for (const payloads of b.values()) for (const p of payloads) expect(p).not.toContain(TOKEN);
  });
});

// ── T10 / FR-30 ───────────────────────────────────────────────────────────────────────────────────────

describe('FR-30 (T10): numericFidelitySources includes the operator notes', () => {
  const HTML_WITH_40_W = '<p>Лазерна головка.</p><figure><img src="https://cdn.example/x/lamp.jpg" alt="лазерна головка 40 Вт"><figcaption>Лазерна головка</figcaption></figure>';
  const notGrounded = (issues: Array<{ rule: string }>) => issues.filter(i => i.rule === 'alt-numeric-not-grounded');

  /** The orchestrator's private source builder, observed as the sources string it hands to the gate. */
  function sourcesFor(input: Partial<ProductInput>): string {
    const o = bootOrchestrator(makeMockLlm());
    const full = {
      website: { name: 'EXPERT3D', group: 'ES', url: 'https://x.example' }, name: 'Ortur H20', description: 'Laser engraver with a 20 W module.',
      specs: '| Power | 20 W |', ...input,
    } as ProductInput;
    return (o as unknown as { numericFidelitySources(i: ProductInput, m?: unknown[]): string }).numericFidelitySources(full, []);
  }

  it.each(NOTES_KEYS)('a number that appears ONLY in the %s note passes the alt/figcaption gate', key => {
    const sources = sourcesFor(withNotes({}, { [key]: 'Протестовано на 40 Вт' }));
    expect(notGrounded(validateAltNumericFidelity(HTML_WITH_40_W, sources, 'HTML (base)'))).toEqual([]);
  });

  it('the same number absent from the notes still fails the gate (control: it is the notes that ground it)', () => {
    const sources = sourcesFor(withNotes({}, { usageScenarios: 'Друк кронштейнів без чисел' }));
    expect(notGrounded(validateAltNumericFidelity(HTML_WITH_40_W, sources, 'HTML (base)'))).toHaveLength(1);
    expect(notGrounded(validateAltNumericFidelity(HTML_WITH_40_W, sourcesFor({}), 'HTML (base)'))).toHaveLength(1);
  });

  it('a number absent from every source (the notes included) still fails, exactly as before', () => {
    const sources = sourcesFor(withNotes({}, { testResults: 'Протестовано на 40 Вт' }));
    const html = HTML_WITH_40_W.replace('40 Вт', '99 Вт');
    expect(notGrounded(validateAltNumericFidelity(html, sources, 'HTML (base)'))).toHaveLength(1);
  });

  it('whitespace-only notes ground nothing', () => {
    const sources = sourcesFor(withNotes({}, { testResults: '   \n ' }));
    expect(notGrounded(validateAltNumericFidelity(HTML_WITH_40_W, sources, 'HTML (base)'))).toHaveLength(1);
  });

  it('OD-20(2): a number that appears only in supplementalContent behaves as before - it is NOT grounded by it', () => {
    const sources = sourcesFor({ supplementalContent: 'Q: how strong? A: 40 Вт.' });
    expect(notGrounded(validateAltNumericFidelity(HTML_WITH_40_W, sources, 'HTML (base)'))).toHaveLength(1);
  });

  it('OD-20(2): NUMERIC_SOURCE_FIDELITY_RULES is not extended - it does not mention the notes and is byte-unchanged', () => {
    expect(NUMERIC_SOURCE_FIDELITY_RULES).not.toContain('Operator');
    expect(NUMERIC_SOURCE_FIDELITY_RULES).not.toContain('operator notes');
    const digest = createHash('sha256').update(NUMERIC_SOURCE_FIDELITY_RULES, 'utf8').digest('hex');
    // Pinned from the commit the Story branch was cut from: the text is not edited by any requirement (FR-30).
    expect(digest).toBe(PRE_STORY_NUMERIC_RULES_SHA256);
    expect(NUMERIC_SOURCE_FIDELITY_RULES.length).toBe(PRE_STORY_NUMERIC_RULES_LENGTH);
  });
});


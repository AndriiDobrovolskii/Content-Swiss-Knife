/**
 * content-orchestrator.grounding-retry.spec.ts
 *
 * US-3.1 T3 (FR-1, FR-4). `groundingSpecs()`'s specs-translation call gets a retry-with-backoff:
 * a transient single-attempt failure on any of its three business-semantic triggers (the call
 * throwing, returning empty/whitespace-only text, or `inspectGroundedTranslation` classifying the
 * result as wrong-script) must no longer disable grounding by itself. `groundingSpecs()` only
 * returns a failure result after the retry budget is exhausted with every attempt still failing.
 *
 * `groundingSpecs()` is private — accessed the same narrow-cast way
 * `content-orchestrator.doc-gate.spec.ts` accesses `runDocGate()`, rather than driving the whole
 * `generate()`/`generateUaContent()` pipeline just to reach one internal call.
 *
 * NFR-3 (determinism): fake timers stand in for `retryAsync`'s real backoff delay, so this suite
 * never depends on wall-clock time.
 */
import '@angular/compiler';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { Injector } from '@angular/core';
import { ContentOrchestratorService } from './content-orchestrator.service';
import { LlmService } from './llm.service';
import { RetrievalService } from './retrieval.service';
import { HistoryService } from './history.service';
import type { ProductInput } from '../app/types';
import type { GroundingInspection } from '../utils/specs-grounding';
import type { UsageMeta } from '../prompt-core/payload';

interface GroundingAccess {
  groundingSpecs(input: ProductInput): Promise<GroundingInspection>;
}
function asGrounding(o: ContentOrchestratorService): GroundingAccess {
  return o as unknown as GroundingAccess;
}

function bootOrchestrator(generateText: ReturnType<typeof vi.fn>): ContentOrchestratorService {
  const injector = Injector.create({
    providers: [
      ContentOrchestratorService,
      { provide: LlmService, useValue: { generateText, generateJson: vi.fn(), recordGeneration: vi.fn(async () => {}) } },
      { provide: RetrievalService, useValue: {} },
      { provide: HistoryService, useValue: { add: vi.fn() } },
    ],
  });
  return injector.get(ContentOrchestratorService);
}

const INPUT: ProductInput = {
  website: { name: 'Expert-3DPrinter', group: 'US', url: 'https://expert-3dprinter.example' },
  name: 'Ortur H20 20 W',
  description: '',
  specs: 'Laser power: 20 W\nWorking area: 400 x 400 mm', // non-empty, non-Cyrillic — grounding call fires
};

/** Only the "Specs translation (grounding)" call matters here — matches
 *  content-orchestrator.grounding-style-guide.spec.ts's own selector idiom. */
const isGroundingCall = (meta: UsageMeta | undefined) => meta?.taskLabel === 'Specs translation (grounding)';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

/** Drives a call that returns a real Promise while fake timers are active — awaiting a
 *  microtask-only promise directly can deadlock under fake timers, so every retry-driving call
 *  below is raced against `vi.runAllTimersAsync()`. */
async function withFakeTimers<T>(work: () => Promise<T>): Promise<T> {
  const p = work();
  await vi.runAllTimersAsync();
  return p;
}

describe('groundingSpecs() — FR-1: retries a transient failure before disabling grounding', () => {
  it('recovers from a single throw on the first attempt', async () => {
    let calls = 0;
    const generateText = vi.fn(async (_p: unknown, _t?: boolean, meta?: UsageMeta) => {
      if (!isGroundingCall(meta)) return '<p>ok</p>';
      calls++;
      if (calls === 1) throw new Error('transient 503');
      return 'Потужність лазера: 20 Вт';
    });
    const orchestrator = bootOrchestrator(generateText);

    const result = await withFakeTimers(() => asGrounding(orchestrator).groundingSpecs(INPUT));

    expect(result.failure).toBeUndefined();
    expect(result.text).toBe('Потужність лазера: 20 Вт');
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it('recovers from a single empty-text result on the first attempt', async () => {
    let calls = 0;
    const generateText = vi.fn(async (_p: unknown, _t?: boolean, meta?: UsageMeta) => {
      if (!isGroundingCall(meta)) return '<p>ok</p>';
      calls++;
      return calls === 1 ? '   ' : 'Потужність лазера: 20 Вт';
    });
    const orchestrator = bootOrchestrator(generateText);

    const result = await withFakeTimers(() => asGrounding(orchestrator).groundingSpecs(INPUT));

    expect(result.failure).toBeUndefined();
    expect(result.text).toBe('Потужність лазера: 20 Вт');
  });

  it('recovers from a single wrong-script result on the first attempt', async () => {
    let calls = 0;
    const generateText = vi.fn(async (_p: unknown, _t?: boolean, meta?: UsageMeta) => {
      if (!isGroundingCall(meta)) return '<p>ok</p>';
      calls++;
      // Latin-script "translation" of a Cyrillic-master product — the wrong-script trigger.
      return calls === 1 ? 'Laser power: 20 W' : 'Потужність лазера: 20 Вт';
    });
    const orchestrator = bootOrchestrator(generateText);

    const result = await withFakeTimers(() => asGrounding(orchestrator).groundingSpecs(INPUT));

    expect(result.failure).toBeUndefined();
    expect(result.text).toBe('Потужність лазера: 20 Вт');
  });

  it('only returns a failure result once every attempt in the budget has failed, matching the LAST cause', async () => {
    const generateText = vi.fn(async (_p: unknown, _t?: boolean, meta?: UsageMeta) => {
      if (!isGroundingCall(meta)) return '<p>ok</p>';
      throw new Error('persistent 503');
    });
    const orchestrator = bootOrchestrator(generateText);

    const result = await withFakeTimers(() => asGrounding(orchestrator).groundingSpecs(INPUT));

    expect(result.failure).toBeDefined();
    expect(result.failure!.kind).toBe('provider-error');
    expect(result.text).toBe('');
    // More than a single attempt was actually made before giving up.
    const groundingCalls = generateText.mock.calls.filter(([, , meta]) => isGroundingCall(meta as UsageMeta));
    expect(groundingCalls.length).toBeGreaterThan(1);
  });

  /** FR-4 — the Ortur H20 no-silent-fallback guarantee must survive the retry wrap unchanged. */
  it('FR-4: never substitutes input.specs as if it were a grounded translation, even after retries are exhausted', async () => {
    const generateText = vi.fn(async (_p: unknown, _t?: boolean, meta?: UsageMeta) =>
      isGroundingCall(meta) ? Promise.reject(new Error('down')) : '<p>ok</p>');
    const orchestrator = bootOrchestrator(generateText);

    const result = await withFakeTimers(() => asGrounding(orchestrator).groundingSpecs(INPUT));

    expect(result.text).toBe(''); // never input.specs
    expect(result.text).not.toBe(INPUT.specs);
  });
});

/**
 * US-3.1 T5 (FR-2(a), AC-1). Once retries (T3) are exhausted, every `specs-grounding-disabled`
 * issue must carry `severity: 'error'` instead of `'warning'`, at all THREE emission sites —
 * independently re-verified as three separate call sites in `content-orchestrator.service.ts`:
 * `runDocGate()`'s shared closure (~547-549), `generate()`'s inline HTML-gate closure (~755-757),
 * and `generateUaContent()`'s separately duplicated inline HTML-gate closure (~1172-1174).
 *
 * A STRUCTURAL pin, not three separate end-to-end runs: this Story's own Impact Analysis and Plan
 * both confirm all three literals are mechanical — `severity: 'warning' as const` becoming
 * `severity: 'error' as const`, with no other field on the issue changing — so a source-level check
 * that all three (and no other `specs-grounding-disabled` literal) read `'error'` is the correct
 * unit for this claim; `runDocGate()`'s own copy is additionally proven BEHAVIOURALLY in
 * `content-orchestrator.doc-gate.spec.ts` (T5's own describe block there).
 */
describe('specs-grounding-disabled — FR-2(a): all three emission sites read error severity, none read warning', () => {
  it('every specs-grounding-disabled issue literal in content-orchestrator.service.ts is error-severity', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const source = readFileSync(
      join(process.cwd(), 'src', 'services', 'content-orchestrator.service.ts'), 'utf8',
    );

    // Every issue-literal block that names this rule, captured with its own severity line.
    const blocks = [...source.matchAll(/severity:\s*'(error|warning)' as const,\s*\n\s*rule:\s*'specs-grounding-disabled'/g)];
    expect(blocks.length).toBe(3); // the three sites this Story's own analysis confirms
    for (const [, severity] of blocks) {
      expect(severity).toBe('error');
    }
  });
});

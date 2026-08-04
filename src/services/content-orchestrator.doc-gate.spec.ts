/**
 * content-orchestrator.doc-gate.spec.ts
 *
 * Task 2 regression suite: proves runDocGate()/produceTaskADoc() (content-orchestrator.service.ts)
 * validate the ProductDescriptionDoc ITSELF and render it to HTML exactly once, after the gate
 * accepts it — not on every repair attempt, and not by parsing rendered HTML with DOM-based
 * checks. That is the bug this task fixes: the old Doc branch of produceTaskAArtifact rendered on
 * every attempt and validated the render, wasting repair budget chasing structural findings that
 * are physically impossible once the renderer is known to be pure and deterministic.
 *
 * Calls the private runDocGate() directly (via an `any` cast), mirroring how
 * doc-repair-recovery.spec.ts exercises runRepairGate directly rather than only through generate().
 * That gives full control over groundingSpecs/allowedSpecParams/input without needing to round-trip
 * a canonical Markdown spec table through generate()'s full pipeline (Slug/SEO/etc. all run there
 * unconditionally and would need stubs unrelated to what this suite is proving).
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
import type { ProductInput } from '../app/types';
import type { UsageMeta, PromptPayload } from '../prompt-core/payload';
import * as renderDescriptionModule from '../render/render-description';

afterEach(() => vi.restoreAllMocks());

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** A schema-valid ProductDescriptionDoc with one caller-supplied §7 category of rows. Modelled on
 *  doc-repair-recovery.spec.ts's validDoc() — same minimal shape, parameterized on specs rows so
 *  each test can shape grounding without duplicating the whole fixture. */
function makeDoc(specRows: Array<{ label: string; value: string }>) {
  return {
    schemaVersion: '3.0' as const,
    locale: 'uk-UA',
    localizedName: 'Test Product',
    hook: 'A hook sentence.',
    killerSpecs: [
      { label: 'A', value: '1', why: 'why a' },
      { label: 'B', value: '2', why: 'why b' },
      { label: 'C', value: '3', why: 'why c' },
    ],
    keyBenefits: [{ kind: 'paragraph' as const, text: 'Benefit.' }],
    functionality: [{ heading: 'How it works', blocks: [{ kind: 'paragraph' as const, text: 'It works.' }] }],
    applications: {
      heading: 'Applications',
      items: [
        { scenario: 'One. ', text: 'a' }, { scenario: 'Two. ', text: 'b' },
        { scenario: 'Three. ', text: 'c' }, { scenario: 'Four. ', text: 'd' },
      ],
    },
    specs: { heading: 'Specs', categories: [{ title: 'Cat', rows: specRows }] },
    cta: { heading: 'CTA', text: 'Buy it.' },
    figures: [],
    videos: [],
  };
}

/** A Doc the schema rejects outright — killerSpecs below the 3-entry minimum. */
function invalidSchemaDoc() {
  return { ...makeDoc([{ label: 'Вага', value: '500 г' }]), killerSpecs: [{ label: 'A', value: '1', why: 'only one' }] };
}

/** Grounding source text (already Ukrainian — what groundingSpecs() would have produced). */
const GROUNDING_SOURCE = 'Вага: 500 г. Матеріал: Пластик.';

/** §7 carries one grounded row (numeric anchor: "500") and one FABRICATED row ("Колір"/"Синій")
 *  that appears nowhere in GROUNDING_SOURCE — neither as a label stem nor a numeric/Latin anchor. */
function groundingFailureDoc() {
  return makeDoc([
    { label: 'Вага', value: '500 г' },
    { label: 'Колір', value: 'Синій' },
  ]);
}

/** Same shape, second row corrected to a real, grounded parameter. */
function groundingFixedDoc() {
  return makeDoc([
    { label: 'Вага', value: '500 г' },
    { label: 'Матеріал', value: 'Пластик' },
  ]);
}

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
    generateJson: vi.fn(async (_input: unknown, _useThinking?: boolean, _meta?: UsageMeta): Promise<unknown> => {
      throw new Error('unstubbed generateJson call');
    }),
    generateText: vi.fn(async (_input: unknown, _useThinking?: boolean, _meta?: UsageMeta): Promise<string> => {
      throw new Error('runDocGate must never call generateText — that is the plain-HTML path');
    }),
    recordGeneration: vi.fn(async () => {}),
  };
}

const BASE_INPUT: ProductInput = {
  website: { name: 'EXPERT3D', group: 'ES', url: 'https://impresora-3d.es' },
  name: 'Test Product',
  description: '',
  specs: '',
};

const BASE_PAYLOAD: PromptPayload = {
  systemBlocks: [{ text: 'master', cache: true }, { text: 'task', cache: true }],
  userContent: '[INPUT DATA]',
};

function baseGateOpts(overrides: Record<string, unknown> = {}) {
  return {
    label: 'HTML (base)',
    contextLabel: 'HTML (base)',
    docTaskLabel: 'Doc (base)',
    maxRepairs: 2,
    basePayload: BASE_PAYLOAD,
    useThinking: false,
    locale: 'uk-UA',
    localeIso: 'uk-UA',
    input: BASE_INPUT,
    groundingSpecs: '',
    allowedSpecParams: [] as string[],
    groundingDisabled: false,
    grounding: { text: '' },
    videoEmbeds: [],
    imgManifest: undefined,
    onAttempt: () => {},
    ...overrides,
  };
}

describe('runDocGate — renders exactly once (acceptance criterion #2)', () => {
  /**
   * MUST use a Doc that fails a SEMANTIC validator (grounding, here), not one that fails
   * ProductDescriptionDocSchema.parse(). A schema-invalid attempt never reached renderDescription()
   * even in the pre-Task-2 buggy code — parse() throws before the old code's render call, so a
   * schema-failure fixture renders exactly once under BOTH the old and the new code and proves
   * nothing about this criterion. The old bug only manifests when an attempt's Doc PASSES schema
   * validation but FAILS a semantic check: the old code rendered that Doc to HTML inside produce(),
   * before the semantic validator ever ran and rejected it — so a schema-valid-but-semantically-
   * rejected attempt 1 would have rendered TWICE under the old code (once per attempt) and must
   * render exactly ONCE under runDocGate (once, after the gate accepts attempt 2).
   * groundingFailureDoc() is exactly that: schema-valid, rejected only by validateSpecsGroundingDoc.
   */
  it('calls renderDescription() exactly once across a repair triggered by a semantic (not schema) rejection', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson
      .mockResolvedValueOnce(groundingFailureDoc())
      .mockResolvedValueOnce(groundingFixedDoc());
    const orchestrator = bootOrchestrator(mockLlm) as any;
    const renderSpy = vi.spyOn(renderDescriptionModule, 'renderDescription');

    const result = await orchestrator.runDocGate(baseGateOpts({ groundingSpecs: GROUNDING_SOURCE }));

    // Two generation attempts (attempt 1 schema-valid but semantically rejected, attempt 2 clean) …
    expect(mockLlm.generateJson).toHaveBeenCalledTimes(2);
    // … but exactly ONE render call. Under the pre-Task-2 code this would be 2: attempt 1's
    // schema-valid Doc rendered inside produce() before validateSpecsGrounding (the HTML-DOM
    // version) ever got a chance to reject it. This is the single most important regression this
    // task prevents — see the file header comment.
    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(typeof result.artifact).toBe('string');
    expect(result.artifact.length).toBeGreaterThan(0);
    expect(result.repairsUsed).toBe(1);
  });

  /** Companion case: a schema failure DOES still render exactly once (on the one attempt that
   *  parses), confirming the assertion above isn't vacuously true for every fixture shape. */
  it('also renders exactly once when the repair is triggered by a schema failure instead', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson
      .mockResolvedValueOnce(invalidSchemaDoc())
      .mockResolvedValueOnce(makeDoc([{ label: 'Вага', value: '500 г' }]));
    const orchestrator = bootOrchestrator(mockLlm) as any;
    const renderSpy = vi.spyOn(renderDescriptionModule, 'renderDescription');

    await orchestrator.runDocGate(baseGateOpts());

    expect(mockLlm.generateJson).toHaveBeenCalledTimes(2);
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});

describe('runDocGate — a forced grounding failure names the exact doc path', () => {
  it('repair feedback contains the specific specs.categories[N].rows[M] path, not a generic message', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson
      .mockResolvedValueOnce(groundingFailureDoc())
      .mockResolvedValueOnce(groundingFixedDoc());
    const orchestrator = bootOrchestrator(mockLlm) as any;

    await orchestrator.runDocGate(baseGateOpts({ groundingSpecs: GROUNDING_SOURCE }));

    expect(mockLlm.generateJson).toHaveBeenCalledTimes(2);
    const retryPayload = mockLlm.generateJson.mock.calls[1][0] as PromptPayload;
    // The fabricated row is at category 0, row 1 (0-indexed) — see groundingFailureDoc().
    expect(retryPayload.userContent).toContain('specs.categories[0].rows[1]');
    expect(retryPayload.userContent).toContain('VALIDATION FEEDBACK');
    // Not a symptom-only message — the model is told WHICH field, not just that something failed.
    expect(retryPayload.userContent).not.toMatch(/empty-output/i);
  });
});

describe('runDocGate — a forced Zod schema failure repairs rather than throws', () => {
  it('retries through produceTaskADoc/runDocGate and ships a valid artifact on attempt 2', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson
      .mockResolvedValueOnce(invalidSchemaDoc())
      .mockResolvedValueOnce(makeDoc([{ label: 'Вага', value: '500 г' }]));
    const orchestrator = bootOrchestrator(mockLlm) as any;

    const result = await orchestrator.runDocGate(baseGateOpts());

    expect(mockLlm.generateJson).toHaveBeenCalledTimes(2);
    expect(result.finalIssues.filter((i: { severity: string }) => i.severity === 'error')).toHaveLength(0);
    expect(result.repairsUsed).toBe(1);
    expect(result.artifact).toContain('<'); // rendered HTML, not the empty-artifact throw path
  });

  it('throws (does not ship empty) when every attempt fails the schema', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson.mockResolvedValue(invalidSchemaDoc());
    const orchestrator = bootOrchestrator(mockLlm) as any;

    await expect(orchestrator.runDocGate(baseGateOpts({ maxRepairs: 1 })))
      .rejects.toThrow(/never produced a valid ProductDescriptionDoc/);
  });
});

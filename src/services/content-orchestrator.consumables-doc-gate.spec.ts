/**
 * content-orchestrator.consumables-doc-gate.spec.ts
 *
 * The consumables sibling of content-orchestrator.doc-gate.spec.ts: proves
 * runConsumablesDocGate()/produceTaskAConsumablesDoc() behave correctly for the new, off-by-default
 * consumables Doc pipeline (usesConsumablesDocPipeline() — CONSUMABLES_DOC_PIPELINE_ENABLED is
 * false until a live probe justifies flipping it; see doc-pipeline-flag.ts).
 *
 * UNLIKE runDocGate, this gate renders on EVERY attempt, not once after acceptance — see the
 * method's own doc comment in content-orchestrator.service.ts for why: it reuses the plain-HTML
 * consumables validators unmodified, which need rendered HTML to run at all, and rendering is pure
 * and cheap. So there is no "renders exactly once" assertion to port from the main suite; instead
 * this proves the render happens on every attempt that reaches it, and that the same schema-failure
 * and semantic-failure repair paths work.
 *
 * Calls the private runConsumablesDocGate() directly (via an `any`-cast interface), mirroring
 * content-orchestrator.doc-gate.spec.ts's own rationale for doing so.
 */
import '@angular/compiler';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Injector } from '@angular/core';
import { ContentOrchestratorService } from './content-orchestrator.service';
import { LlmService } from './llm.service';
import { RetrievalService } from './retrieval.service';
import { HistoryService } from './history.service';
import type { ProductInput, ImageManifestEntry } from '../app/types';
import type { ConsumablesDescriptionDoc } from '../domain/consumables-doc';
import { expectedSpecParameterLabels } from '../utils/spec-count-parity';
import type { UsageMeta, PromptPayload } from '../prompt-core/payload';
import type { GroundingInspection } from '../utils/specs-grounding';
import type { RepairGateResult } from '../utils/repair-gate';
import { assertDocRendered } from '../render/doc-schema-issues';
import * as renderConsumablesModule from '../render/render-consumables';

afterEach(() => vi.restoreAllMocks());

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** A schema-valid ConsumablesDescriptionDoc sitting at each field's lower bound. */
function makeDoc(specGroups: ConsumablesDescriptionDoc['specGroups']): ConsumablesDescriptionDoc {
  return {
    schemaVersion: 'C1',
    locale: 'uk-UA',
    localizedName: 'Test Filament',
    hook: 'A hook sentence describing the material.',
    features: {
      heading: 'Особливості',
      items: [
        { lead: 'A.', text: ' a' }, { lead: 'B.', text: ' b' },
        { lead: 'C.', text: ' c' }, { lead: 'D.', text: ' d' },
      ],
    },
    applications: {
      heading: 'Застосування',
      items: [{ lead: 'A:', text: ' a' }, { lead: 'B:', text: ' b' }, { lead: 'C:', text: ' c' }],
    },
    specGroups,
    storage: {
      heading: 'Зберігання',
      items: [{ lead: 'A:', text: ' a' }, { lead: 'B:', text: ' b' }],
    },
    cta: 'Closing sentence.',
    figures: [],
  };
}

/** A Doc the schema rejects outright — features below the 4-item minimum. */
function invalidSchemaDoc() {
  const doc = makeDoc([{ heading: 'Print Settings', rows: [{ label: 'Nozzle', value: '210 °C' }] }]);
  return { ...doc, features: { ...doc.features, items: doc.features.items.slice(0, 2) } };
}

/**
 * An over-long hook — pads past output-validator.ts's 5500-char CONSUMABLES_MAX_STRIPPED_CHARS
 * ceiling (rule 'consumables-char-limit', severity 'error'). NOT a grounding fixture: validateSpecsGrounding
 * only scans `section.specs table` (specs-grounding.ts), which consumables output never has — §C4
 * explicitly forbids `<section class="specs">` — so that validator (and validateSpecCountParity,
 * scoped the same way) is a structural no-op for consumables' rendered shape, exactly as it already
 * is on today's plain-HTML consumables path. The char-limit rule is the one genuinely reachable
 * 'error'-severity finding for this shape without a store-specific (Center 3D Print Style B) input.
 */
function overLengthDoc(): ConsumablesDescriptionDoc {
  const doc = makeDoc([{ heading: 'Print Settings', rows: [{ label: 'Nozzle', value: '210 °C' }] }]);
  return { ...doc, hook: 'А'.repeat(5700) };
}

/** Same shape, hook shortened back under the ceiling. */
function normalLengthDoc(): ConsumablesDescriptionDoc {
  return makeDoc([{ heading: 'Print Settings', rows: [{ label: 'Nozzle', value: '210 °C' }] }]);
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
      throw new Error('runConsumablesDocGate must never call generateText — that is the plain-HTML path');
    }),
    recordGeneration: vi.fn(async () => {}),
  };
}

const BASE_INPUT: ProductInput = {
  website: { name: '3DDevice', group: 'UA', url: 'https://3ddevice.com.ua' },
  name: 'Test Filament',
  description: '',
  specs: '',
  templateId: 'consumables-resin',
};

const BASE_PAYLOAD: PromptPayload = {
  systemBlocks: [{ text: 'master', cache: true }, { text: 'task', cache: true }],
  userContent: '[INPUT DATA]',
};

interface RunConsumablesDocGateOpts {
  label: string;
  contextLabel: string;
  docTaskLabel: string;
  maxRepairs: number;
  basePayload: PromptPayload;
  useThinking: boolean;
  locale: string;
  localeIso: string;
  input: ProductInput;
  groundingSpecs: string;
  allowedSpecParams: string[];
  groundingDisabled: boolean;
  grounding: GroundingInspection;
  imgManifest?: ImageManifestEntry[];
  onAttempt: (n: number, c: number) => void;
}

interface ConsumablesDocGateAccess {
  runConsumablesDocGate(opts: RunConsumablesDocGateOpts): Promise<RepairGateResult<string>>;
}

function asConsumablesDocGate(orchestrator: ContentOrchestratorService): ConsumablesDocGateAccess {
  return orchestrator as unknown as ConsumablesDocGateAccess;
}

function baseGateOpts(overrides: Partial<RunConsumablesDocGateOpts> = {}): RunConsumablesDocGateOpts {
  return {
    label: 'HTML (base)',
    contextLabel: 'HTML (base)',
    docTaskLabel: 'Doc (base, consumables)',
    maxRepairs: 2,
    basePayload: BASE_PAYLOAD,
    useThinking: false,
    locale: 'uk-UA',
    localeIso: 'uk-UA',
    input: BASE_INPUT,
    groundingSpecs: '',
    allowedSpecParams: [] as string[],
    groundingDisabled: false,
    grounding: { text: '' } satisfies GroundingInspection,
    imgManifest: undefined,
    onAttempt: () => {},
    ...overrides,
  };
}

describe('runConsumablesDocGate — a forced Zod schema failure repairs rather than throws', () => {
  it('retries through produceTaskAConsumablesDoc and ships a valid artifact on attempt 2', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson
      .mockResolvedValueOnce(invalidSchemaDoc())
      .mockResolvedValueOnce(makeDoc([{ heading: 'Print Settings', rows: [{ label: 'Nozzle', value: '210 °C' }] }]));
    const orchestrator = bootOrchestrator(mockLlm);

    const result = await asConsumablesDocGate(orchestrator).runConsumablesDocGate(baseGateOpts());

    expect(mockLlm.generateJson).toHaveBeenCalledTimes(2);
    expect(result.finalIssues.filter((i: { severity: string }) => i.severity === 'error')).toHaveLength(0);
    expect(result.repairsUsed).toBe(1);
    expect(result.artifact).toContain('<'); // rendered HTML, not the empty-artifact throw path
  });

  it('feeds the schema failure back as repair feedback naming the offending field', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson
      .mockResolvedValueOnce(invalidSchemaDoc())
      .mockResolvedValueOnce(makeDoc([{ heading: 'Print Settings', rows: [{ label: 'Nozzle', value: '210 °C' }] }]));
    const orchestrator = bootOrchestrator(mockLlm);

    await asConsumablesDocGate(orchestrator).runConsumablesDocGate(baseGateOpts());

    const retryPayload = mockLlm.generateJson.mock.calls[1][0] as PromptPayload;
    expect(retryPayload.userContent).toContain('features.items');
    expect(retryPayload.userContent).toContain('VALIDATION FEEDBACK');
  });

  it('returns the empty-artifact sentinel — not a throw — when every attempt fails the schema', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson.mockResolvedValue(invalidSchemaDoc());
    const orchestrator = bootOrchestrator(mockLlm);
    const renderSpy = vi.spyOn(renderConsumablesModule, 'renderConsumablesDoc');

    const result = await asConsumablesDocGate(orchestrator).runConsumablesDocGate(baseGateOpts({ maxRepairs: 1 }));

    expect(result.artifact).toBe('');
    expect(result.finalIssues.some((i: { rule: string }) => i.rule === 'doc-schema')).toBe(true);
    // A schema-invalid doc never reaches renderConsumablesDoc — there's nothing to render.
    expect(renderSpy).not.toHaveBeenCalled();
  });

  it('assertDocRendered still throws on the sentinel — proving the call sites remain protected', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson.mockResolvedValue(invalidSchemaDoc());
    const orchestrator = bootOrchestrator(mockLlm);

    const result = await asConsumablesDocGate(orchestrator).runConsumablesDocGate(baseGateOpts({ maxRepairs: 1 }));

    expect(() => assertDocRendered(result.artifact, 'HTML (base)', result.finalIssues))
      .toThrow(/never produced a valid ProductDescriptionDoc/);
  });
});

describe('runConsumablesDocGate — a semantic (char-limit) rejection repairs via the existing HTML validator', () => {
  it('renders each schema-valid attempt and repairs when validateGeneratedHtml rejects an over-length hook', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson
      .mockResolvedValueOnce(overLengthDoc())
      .mockResolvedValueOnce(normalLengthDoc());
    const orchestrator = bootOrchestrator(mockLlm);
    const renderSpy = vi.spyOn(renderConsumablesModule, 'renderConsumablesDoc');

    const result = await asConsumablesDocGate(orchestrator).runConsumablesDocGate(baseGateOpts());

    expect(mockLlm.generateJson).toHaveBeenCalledTimes(2);
    // Renders on EVERY attempt (unlike runDocGate) — both the rejected and the accepted one — since
    // validate() needs rendered HTML to run the reused string validators. See the method's own
    // doc comment for why this is the correct tradeoff here.
    expect(renderSpy).toHaveBeenCalledTimes(2);
    expect(result.repairsUsed).toBe(1);
    expect(result.finalIssues.filter((i: { severity: string }) => i.severity === 'error')).toHaveLength(0);
    expect(result.artifact).toContain('<');
  });

  it('names the exact rule in the repair feedback', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson
      .mockResolvedValueOnce(overLengthDoc())
      .mockResolvedValueOnce(normalLengthDoc());
    const orchestrator = bootOrchestrator(mockLlm);

    await asConsumablesDocGate(orchestrator).runConsumablesDocGate(baseGateOpts());

    const retryPayload = mockLlm.generateJson.mock.calls[1][0] as PromptPayload;
    expect(retryPayload.userContent).toContain('consumables-char-limit');
  });
});

describe('runConsumablesDocGate — validates the rendered HTML with templateId set for the consumables rules', () => {
  it('passes templateId through to validateGeneratedHtml so consumables-only rules apply', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson.mockResolvedValueOnce(
      makeDoc([{ heading: 'Print Settings', rows: [{ label: 'Nozzle', value: '210 °C' }] }]),
    );
    const orchestrator = bootOrchestrator(mockLlm);

    const result = await asConsumablesDocGate(orchestrator).runConsumablesDocGate(baseGateOpts({ maxRepairs: 0 }));

    // A clean, minimal consumables doc renders with zero errors under the consumables-aware
    // validator — proves templateId: 'consumables-resin' actually reached validateGeneratedHtml
    // (the specs-shape/§C rules differ from the default v3.0 rule set it would otherwise apply).
    expect(result.finalIssues.filter((i: { severity: string }) => i.severity === 'error')).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Image manifest coverage — the exact regression a live run surfaced 2026-08-25: a consumables
// product with uploaded images shipped with `image-manifest-missing` permanently unresolved,
// because the Doc had nowhere to put a figure. Proves that gap is closed now that `figures` exists.
// ═══════════════════════════════════════════════════════════════════════════

describe('runConsumablesDocGate — image manifest coverage now that figures are modelled', () => {
  const MANIFEST: ImageManifestEntry[] = [{
    id: '1', originalFilename: 'panel.jpg', urlFilename: 'panel.jpg',
    previewUrl: '', visionDescription: '', altText: '', order: 0, status: 'done',
  }];

  it('reports image-manifest-missing when the doc carries no figures', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson.mockResolvedValueOnce(normalLengthDoc());
    const orchestrator = bootOrchestrator(mockLlm);

    const result = await asConsumablesDocGate(orchestrator).runConsumablesDocGate(
      baseGateOpts({ maxRepairs: 0, imgManifest: MANIFEST }),
    );

    expect(result.finalIssues.some((i: { rule: string }) => i.rule === 'image-manifest-missing')).toBe(true);
  });

  it('clears image-manifest-missing and renders the <figure> when the doc includes a matching figure', async () => {
    const mockLlm = makeMockLlm();
    const doc: ConsumablesDescriptionDoc = {
      ...normalLengthDoc(),
      figures: [{
        file: 'panel.jpg', alt: 'Panel mounted in the printer',
        leadIn: 'The panel installs directly on the printer bed.', caption: 'Laser grid panel.',
      }],
    };
    mockLlm.generateJson.mockResolvedValueOnce(doc);
    const orchestrator = bootOrchestrator(mockLlm);

    const result = await asConsumablesDocGate(orchestrator).runConsumablesDocGate(
      baseGateOpts({ maxRepairs: 0, imgManifest: MANIFEST }),
    );

    expect(result.finalIssues.some((i: { rule: string }) => i.rule === 'image-manifest-missing')).toBe(false);
    expect(result.artifact).toContain('panel.jpg');
    expect(result.artifact).toContain('<figure');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// sentence-too-long block-scoped repair — reuses the existing HTML executor (blockRepairer), not a
// new module: this gate validates the RENDERED HTML (see the file header comment), so a
// sentence-too-long finding here carries an HTML "block[N]" path, exactly like the plain-HTML
// pipeline's own findings. This mainly proves the WIRING (repairBlocks is actually passed through),
// since the executor itself is covered by block-tier.spec.ts.
// ═══════════════════════════════════════════════════════════════════════════

describe('runConsumablesDocGate — sentence-too-long is repaired in place, not just reported', () => {
  // hook renders as the very first block (`<p>${prose(doc.hook)}</p>`, render-consumables.ts) — the
  // one field guaranteed to land at block[0] regardless of how many feature/application items exist.
  // 27-word single sentence, no digits — same shape sentence-length.spec.ts and
  // content-orchestrator.doc-gate.spec.ts already rely on to trip the uk-UA 20-word ceiling.
  const LONG_HOOK =
    'Цей матеріал дозволяє швидко точно акуратно та безпечно друкувати деталі складної форми високої ' +
    'міцності товщиною шару для домашньої майстерні або невеликого виробництва без додаткового ' +
    'постобробки поверхні.';
  const SHORT_REPLACEMENT = 'Матеріал забезпечує стабільний друк і високу міцність шару.';

  function docWithLongHook(): ConsumablesDescriptionDoc {
    return { ...normalLengthDoc(), hook: LONG_HOOK };
  }

  it('applies a valid patch: the finding disappears and the shipped HTML carries the rewrite', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson.mockResolvedValueOnce(docWithLongHook());
    mockLlm.generateText.mockResolvedValueOnce(`<patch block="0"><p>${SHORT_REPLACEMENT}</p></patch>`);
    const orchestrator = bootOrchestrator(mockLlm);

    const result = await asConsumablesDocGate(orchestrator).runConsumablesDocGate(baseGateOpts({ maxRepairs: 0 }));

    expect(result.finalIssues.map(i => i.rule)).not.toContain('sentence-too-long');
    expect(result.artifact).toContain(SHORT_REPLACEMENT);
    expect(result.artifact).not.toContain(LONG_HOOK);
  });

  it('discards an invalid patch (invented number): the finding and the original text both survive', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson.mockResolvedValueOnce(docWithLongHook());
    mockLlm.generateText.mockResolvedValueOnce('<patch block="0"><p>Матеріал забезпечує стабільність друку на 40 моделях.</p></patch>');
    const orchestrator = bootOrchestrator(mockLlm);

    const result = await asConsumablesDocGate(orchestrator).runConsumablesDocGate(baseGateOpts({ maxRepairs: 0 }));

    expect(result.finalIssues.map(i => i.rule)).toContain('sentence-too-long');
    expect(result.artifact).toContain(LONG_HOOK);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Call-site wiring — proves generate() actually routes to runConsumablesDocGate when
// usesConsumablesDocPipeline() is true, not just that the private method works in isolation.
// CONSUMABLES_DOC_PIPELINE_ENABLED is true as of the 2026-08-08 live probe (see
// doc-pipeline-flag.ts) — this suite still overrides usesConsumablesDocPipeline via vi.mock rather
// than relying on the real flag value, so it keeps proving the wiring is correct independent of
// whichever way the flag is currently set (including after a rollback to false).
// ═══════════════════════════════════════════════════════════════════════════

vi.mock('../prompt-core/doc-pipeline-flag', async importOriginal => {
  const actual = await importOriginal<typeof import('../prompt-core/doc-pipeline-flag')>();
  return { ...actual, usesConsumablesDocPipeline: (templateId?: string) => templateId === 'consumables-resin' };
});

describe('generate() — routes to the consumables Doc pipeline when the flag is on', () => {
  function slugStub() {
    return { site_name: '3DDevice', slugs: [{ language: 'uk-UA', name: 'Test Filament', slug: 'test-filament' }] };
  }
  function seoStub() {
    return {
      site_name: '3DDevice',
      seo_data: [{ language: 'uk-UA', h1: 'Test Filament', meta_title: 'Test Filament', meta_description: 'Test Filament, full specs inside ➔' }],
    };
  }

  it('generates the uk-UA master via the consumables Doc/JSON path, not the plain-HTML path', async () => {
    const doc = makeDoc([{ heading: 'Print Settings', rows: [{ label: 'Nozzle', value: '210 °C' }] }]);
    const generateJson = vi.fn(async (_input: unknown, _useThinking?: boolean, meta?: UsageMeta) => {
      if (meta?.taskLabel === 'Doc (base, consumables)') return structuredClone(doc);
      if (meta?.taskLabel === 'Slug') return slugStub();
      if (meta?.taskLabel === 'SEO metadata') return seoStub();
      throw new Error(`unexpected generateJson taskLabel: ${meta?.taskLabel}`);
    });
    // Task C translates the rendered master into the store's other languages regardless of which
    // pipeline produced it — a trivial stub is enough; this suite is about the MASTER's origin, not
    // translation content (same rationale as content-orchestrator.doc-gate.spec.ts's identical stub).
    const generateText = vi.fn(async () => '<p>Опис продукту для тесту.</p>');
    const recordGeneration = vi.fn(async () => {});
    const orchestrator = bootOrchestrator({ generateJson, generateText, recordGeneration });
    orchestrator.maxRepairs.set(0);

    await orchestrator.generate({ ...BASE_INPUT });

    expect(generateJson).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), expect.objectContaining({ taskLabel: 'Doc (base, consumables)' }),
    );
    // The master was never requested via the plain-HTML text path.
    expect(generateText).not.toHaveBeenCalledWith(
      expect.anything(), expect.anything(), expect.objectContaining({ taskLabel: 'HTML (base)' }),
    );
    // The rendered Doc, not raw model HTML — a heading string unique to renderConsumablesDoc's output.
    expect(orchestrator.content().mainHtmlUa).toContain('Print Settings');
    expect(recordGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'uk-UA', pipeline: 'consumables-doc', outcome: expect.stringMatching(/^(ok|repaired)$/) }),
    );
  });
});

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
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Injector } from '@angular/core';
import { ContentOrchestratorService } from './content-orchestrator.service';
import { LlmService } from './llm.service';
import { RetrievalService } from './retrieval.service';
import { HistoryService } from './history.service';
import type { ProductInput, ImageManifestEntry } from '../app/types';
import type { ProductDescriptionDoc } from '../domain/description-doc';
import { expectedSpecParameterLabels } from '../utils/spec-count-parity';
import type { UsageMeta, PromptPayload } from '../prompt-core/payload';
import type { GroundingInspection } from '../utils/specs-grounding';
import type { SourceVideoEmbed } from '../utils/video-manifest';
import type { RepairGateResult } from '../utils/repair-gate';
import { assertDocRendered } from '../render/doc-schema-issues';
import * as renderDescriptionModule from '../render/render-description';

const CORPUS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'test', 'fixtures', 'corpus');

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
    // US-3.1 T7 (Impact Analysis v4 Corrections #3 / Defect B): 'CTA' never named the fixture's own
    // product — untruthful once heading-brand-core-missing (FR-7) enforces mandatory presence at
    // the CTA-heading position. Made truthful here, before T7 lands, per AGENTS.md §7.7 and Task
    // Breakdown T7's own division of labor (TEST_WRITING owns this fixture fix).
    cta: { heading: 'Чому варто купити Test Product у EXPERT3D?', text: 'Buy it.' },
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

/**
 * A Doc the schema rejects on ONE addressable, field-level failure — the Story's own quoted
 * example ("`doc-schema` (an empty required string)"). Unlike `invalidSchemaDoc()` (a
 * killerSpecs array-length failure, which has no addressable index and is unaffected by T1 —
 * still, correctly, a full-regen case), `cta.text` is a plain string leaf: its Zod path
 * (`['cta', 'text']`) converts to `doc.cta.text` with no array hop at all, so it is exactly the
 * shape FR-10(a)'s path converter must address.
 */
function emptyRequiredStringDoc() {
  return { ...makeDoc([{ label: 'Вага', value: '500 г' }]), cta: { heading: 'Чому варто купити Test Product у EXPERT3D?', text: '' } };
}

/**
 * US-3.1 T13/T14 (FR-10(b), AC-6, plan D13/D14). A Doc rejected on a genuinely MISSING key — the
 * `cta.heading` property is absent entirely, not merely `''` like `emptyRequiredStringDoc()`'s own
 * `cta.text`. `docSchemaIssues()` converts Zod's "Required" failure at `['cta','heading']` into
 * `path: 'doc.cta.heading'` regardless of whether the leaf is missing or merely wrong-typed
 * (`toDocPath` does not distinguish the two) — this fixture is what actually exercises `getAtPath`
 * returning `undefined` because the key itself does not exist, the specific gap `applyTier`'s own
 * `typeof value !== 'string'` gate condition (pre-T13) treats identically to "nothing to repair."
 */
function missingCtaHeadingDoc() {
  const { cta: _cta, ...rest } = makeDoc([{ label: 'Вага', value: '500 г' }]);
  return { ...rest, cta: { text: 'Buy it.' } } as unknown as ReturnType<typeof makeDoc>;
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

/**
 * The private `runDocGate`'s own opts shape, restated here rather than left implicit.
 *
 * FINAL-REVIEW FIX WAVE, MINOR #1. This suite used to build the opts bag as a loose
 * `Record<string, unknown>` and call `runDocGate` through an `orchestrator as any` cast — so
 * `grounding: { text: '' }` typechecked despite the real parameter being `GroundingInspection`,
 * and a signature change on `runDocGate` would not fail this file at compile time at all. Typing
 * the bag explicitly (and narrowing the access cast to just this one method, below) restores that
 * safety net: TypeScript, not just a passing assertion, complains if `runDocGate`'s parameter shape
 * ever drifts from what this file constructs.
 */
interface RunDocGateOpts {
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
  videoEmbeds: SourceVideoEmbed[];
  imgManifest?: ImageManifestEntry[];
  onAttempt: (n: number, c: number) => void;
}

/** Narrow escape hatch onto the one private method this suite needs — replaces a blanket
 *  `orchestrator as any`, which would silently swallow a typo in the method name too. */
interface DocGateAccess {
  runDocGate(opts: RunDocGateOpts): Promise<RepairGateResult<string>>;
}

function asDocGate(orchestrator: ContentOrchestratorService): DocGateAccess {
  return orchestrator as unknown as DocGateAccess;
}

function baseGateOpts(overrides: Partial<RunDocGateOpts> = {}): RunDocGateOpts {
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
    grounding: { text: '' } satisfies GroundingInspection,
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
    const orchestrator = bootOrchestrator(mockLlm);
    const renderSpy = vi.spyOn(renderDescriptionModule, 'renderDescription');

    const result = await asDocGate(orchestrator).runDocGate(baseGateOpts({ groundingSpecs: GROUNDING_SOURCE }));

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
    const orchestrator = bootOrchestrator(mockLlm);
    const renderSpy = vi.spyOn(renderDescriptionModule, 'renderDescription');

    await asDocGate(orchestrator).runDocGate(baseGateOpts());

    expect(mockLlm.generateJson).toHaveBeenCalledTimes(2);
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});

/**
 * US-3.1 T5 (FR-2(a), AC-1) — behavioural proof for `runDocGate()`'s own emission site
 * (~547-549). The other two sites (`generate()`/`generateUaContent()`'s inline HTML-gate
 * closures) are proven structurally in `content-orchestrator.grounding-retry.spec.ts`, since they
 * are not independently callable the way `runDocGate` is.
 */
describe('runDocGate — FR-2(a): an unresolved grounding failure is reported at error severity', () => {
  it('emits specs-grounding-disabled at severity "error", not "warning", when groundingDisabled is true', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson.mockResolvedValue(makeDoc([{ label: 'Вага', value: '500 г' }]));
    const orchestrator = bootOrchestrator(mockLlm);

    const result = await asDocGate(orchestrator).runDocGate(baseGateOpts({
      groundingDisabled: true,
      grounding: { text: '', failure: { kind: 'provider-error' } },
    }));

    const groundingIssue = result.finalIssues.find((i: { rule: string }) => i.rule === 'specs-grounding-disabled');
    expect(groundingIssue).toBeDefined();
    expect(groundingIssue!.severity).toBe('error');
  });
});

describe('runDocGate — a forced grounding failure names the exact doc path', () => {
  it('repair feedback contains the specific specs.categories[N].rows[M] path, not a generic message', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson
      .mockResolvedValueOnce(groundingFailureDoc())
      .mockResolvedValueOnce(groundingFixedDoc());
    const orchestrator = bootOrchestrator(mockLlm);

    await asDocGate(orchestrator).runDocGate(baseGateOpts({ groundingSpecs: GROUNDING_SOURCE }));

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
    const orchestrator = bootOrchestrator(mockLlm);

    const result = await asDocGate(orchestrator).runDocGate(baseGateOpts());

    expect(mockLlm.generateJson).toHaveBeenCalledTimes(2);
    expect(result.finalIssues.filter((i: { severity: string }) => i.severity === 'error')).toHaveLength(0);
    expect(result.repairsUsed).toBe(1);
    expect(result.artifact).toContain('<'); // rendered HTML, not the empty-artifact throw path

    // Proves runDocGate is actually WIRED to withDocRepairFeedback, not just that the function
    // itself produces the right string in isolation (doc-schema-issues.spec.ts covers that). A
    // wiring test asserting only against withDocRepairFeedback's own output would pass identically
    // if this call site still read `withFeedback: appendRepairFeedback`.
    const retryPayload = mockLlm.generateJson.mock.calls[1][0] as PromptPayload;
    expect(retryPayload.userContent).toMatch(/single JSON object/i);
  });

  /**
   * FINAL-REVIEW FIX WAVE, IMPORTANT #3. This test used to assert that runDocGate ITSELF throws
   * when every attempt fails the schema. That was the bug: a throw from inside runDocGate unwinds
   * past the call site's `recordGeneration(...)` line before it ever runs — both call sites
   * (`generate()`, `generateUaContent()`) record telemetry BEFORE their own
   * `assertDocRendered(...)` guard specifically so a 'failed-schema' outcome is counted rather than
   * lost with an exception, and doc-pipeline-flag.ts's rollout monitoring depends on being able to
   * see that signal. runDocGate must instead behave like the plain-HTML path's "nothing to save"
   * case: return the empty-artifact sentinel and let the CALLER decide whether that is fatal (it
   * is — both call sites still call `assertDocRendered(htmlAResult.artifact, ...)` right after
   * `recordGeneration`, unchanged; see content-orchestrator.service.ts's generate()/
   * generateUaContent()). runDocGate never throwing itself is what makes that possible.
   */
  it('returns the empty-artifact sentinel — not a throw — when every attempt fails the schema', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson.mockResolvedValue(invalidSchemaDoc());
    const orchestrator = bootOrchestrator(mockLlm);
    const renderSpy = vi.spyOn(renderDescriptionModule, 'renderDescription');

    const result = await asDocGate(orchestrator).runDocGate(baseGateOpts({ maxRepairs: 1 }));

    expect(result.artifact).toBe('');
    // The schema failures are still on finalIssues — a caller inspecting the result (or calling
    // assertDocRendered itself, as both real call sites do) can still say WHY nothing shipped.
    expect(result.finalIssues.some((i: { rule: string }) => i.rule === 'doc-schema')).toBe(true);
    // Nothing to render when doc is null on every attempt — renderDescription must not run.
    expect(renderSpy).not.toHaveBeenCalled();
  });

  /** Companion to the above: the shared guard function still throws exactly the way it always
   *  did — it simply now lives at the call site instead of inside runDocGate too. */
  it('assertDocRendered still throws on the sentinel — proving the call sites remain protected', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson.mockResolvedValue(invalidSchemaDoc());
    const orchestrator = bootOrchestrator(mockLlm);

    const result = await asDocGate(orchestrator).runDocGate(baseGateOpts({ maxRepairs: 1 }));

    expect(() => assertDocRendered(result.artifact, 'HTML (base)', result.finalIssues))
      .toThrow(/never produced a valid ProductDescriptionDoc/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Bullet-lead/text collision — pre-parse fix, not a spent repair attempt. Regression guard: a
// bullets-block lead colliding with its text used to make ProductDescriptionDocSchema.parse() throw
// and discard the whole doc (BulletItemSchema's refine — description-doc.schema.ts), leaving only
// blind full-document regeneration to fix it. normalizeRawBulletLeadPunctuation
// (bullet-lead-punctuation.ts) now fixes it deterministically before .parse() can ever throw for it.
// ═══════════════════════════════════════════════════════════════════════════

describe('runDocGate — a bullet-lead/text collision is fixed pre-parse, not spent as a repair attempt', () => {
  function collidingLeadDoc() {
    return {
      ...makeDoc([{ label: 'Вага', value: '500 г' }]),
      keyBenefits: [{ kind: 'bullets' as const, items: [
        { lead: 'Швидкість', text: 'до 500 мм/с.' },
        { lead: 'Точність:', text: ' висока.' },
      ] }],
    };
  }

  it('normalizes the collision before the schema can throw on it — settles on attempt 1, spends no repair', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson.mockResolvedValueOnce(collidingLeadDoc());
    const orchestrator = bootOrchestrator(mockLlm);

    const result = await asDocGate(orchestrator).runDocGate(baseGateOpts());

    expect(mockLlm.generateJson).toHaveBeenCalledTimes(1);
    expect(result.repairsUsed).toBe(0);
    expect(result.finalIssues.some((i: { rule: string }) => i.rule === 'doc-schema')).toBe(false);
    expect(result.artifact).toContain('Швидкість: ');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FINAL-REVIEW FIX WAVE, IMPORTANT #5 — full validator wiring
//
// The fixture above (EXPERT3D, specs: '', no manifest, no video embeds) exercises exactly ONE of
// runDocGate's Doc-reading validators (validateSpecsGroundingDoc) — the other six (now eight, after
// Critical #1/#2's image-manifest-coverage and spec-category-shape additions) early-return on empty
// inputs in every test above. This block proves each of the 9 can actually surface a finding
// THROUGH runDocGate's own validate array — not by calling each validator directly, which would
// prove the validator works but say nothing about whether runDocGate passes it the right arguments.
// A swapped/wrong argument to any one of them (wrong source string, wrong locale, wrong manifest,
// …) makes the corresponding assertion below fail.
// ═══════════════════════════════════════════════════════════════════════════

describe('runDocGate — full validator wiring (Center 3D Print / Style B, non-empty specs + manifest + video)', () => {
  const PRODUCT_NAME = 'Ortur H20 20 W';

  const WIRING_INPUT: ProductInput = {
    website: { name: 'Center 3D Print', group: 'EU', url: 'https://center3dprint.com' },
    name: PRODUCT_NAME,
    description: '',
    // 11-row canonical table — deliberately does NOT contain "40" anywhere (the figure alt/caption
    // below states an ungrounded "40 Вт" on purpose, and numericFidelitySources reads this field
    // verbatim; a stray "40" here would silently ground that claim and defeat the test).
    specs:
      '| Item | Specification |\n' +
      '| --- | --- |\n' +
      '| Потужність лазера | 20 Вт |\n' +
      '| Робоча зона друку | 400 мм |\n' +
      '| Швидкість гравіювання | 12000 мм/хв |\n' +
      '| Напруга живлення | 24 В |\n' +
      '| Вага пристрою | 12 кг |\n' +
      '| Роздільна здатність | 1200 dpi |\n' +
      '| Рівень шуму | 45 дБ |\n' +
      '| Гарантія | 24 місяці |\n' +
      '| Матеріал корпусу | Алюміній |\n' +
      "| Тип з'єднання | USB |\n" +
      '| Робоча температура | 0-35 °C |\n',
    brandFolder: 'Ortur',
    modelFolder: 'h20',
  };

  // Already localized into Ukrainian, as groundingSpecs() would have produced — carries numeric
  // anchors for 8 of the 11 canonical rows (everything EXCEPT Матеріал корпусу/Тип з'єднання/
  // Робоча температура, deliberately dropped from the doc below so actual=9 vs expected=11).
  const GROUNDING_SOURCE =
    'Потужність лазерного модуля становить 20 Вт. Робоча зона друку сягає 400 міліметрів. ' +
    'Швидкість гравіювання до 12000 мм за хвилину. Напруга живлення 24 В постійного струму. ' +
    'Вага пристрою приблизно 12 кілограмів. Роздільна здатність друку 1200 dpi. ' +
    'Рівень шуму під час роботи не перевищує 45 дБ. Гарантійний строк становить 24 місяці.';

  const IMAGE_MANIFEST: ImageManifestEntry[] = [
    {
      id: '1', originalFilename: 'laser.jpg', urlFilename: 'laser-head.jpg', previewUrl: '',
      visionDescription: 'Зображення лазерної головки виробу.', altText: 'Лазерна головка пристрою',
      order: 1, status: 'done',
    },
    {
      id: '2', originalFilename: 'housing.jpg', urlFilename: 'housing-overview.jpg', previewUrl: '',
      visionDescription: 'Загальний вигляд корпусу пристрою.', altText: 'Корпус пристрою',
      order: 2, status: 'done',
    },
  ];

  const VIDEO_EMBEDS: SourceVideoEmbed[] = [
    { src: 'https://www.youtube.com/embed/dQw4w9WgXcQ', title: 'Огляд пристрою', key: 'youtube:dQw4w9WgXcQ' },
  ];

  // 27-word single sentence, no digits, no second-person forms — isolates the sentence-length
  // finding from the second-person finding (which is deliberately placed in `hook` instead).
  const LONG_PARAGRAPH =
    'Цей потужний лазерний гравер дозволяє швидко точно акуратно та безпечно обробляти дерево ' +
    'акрил шкіру тканину картон пластик і багато інших матеріалів для домашньої майстерні або ' +
    'невеликого виробництва.';

  /**
   * Deliberately violates all 9 Doc-reading validators at once:
   *  - hook carries "Ваш" outside the tips/CTA exemption            -> tov-second-person-outside-scope
   *  - functionality[0].heading is a bare nominal topic              -> h2-nominal-heading
   *  - functionality[0].blocks[0] is a 27-word single sentence       -> sentence-too-long
   *  - figures[0].alt/caption claim "40 Вт", ungrounded by any input -> alt-numeric-not-grounded
   *  - figures[] omits the manifest's second entry                  -> image-manifest-missing
   *  - specs.categories has 8 grounded rows + 1 fabricated row,      -> spec-row-not-grounded
   *    all under ONE category (9 total, 11 expected)                -> spec-count-mismatch
   *                                                                   -> spec-category-collapse
   *  - videos[] is empty while VIDEO_EMBEDS names one source embed   -> video-embed-missing
   */
  function wiringViolationDoc(): ProductDescriptionDoc {
    return {
      schemaVersion: '3.0',
      locale: 'uk-UA',
      localizedName: PRODUCT_NAME,
      hook: 'Ваш новий лазерний гравер Ortur H20 20 W забезпечує високу точність різання та гравіювання.',
      killerSpecs: [
        { label: 'Потужність', value: '20 Вт', why: 'Досить потужний для різних матеріалів.' },
        { label: 'Робоча зона', value: '400 мм', why: 'Вистачає для великих деталей.' },
        { label: 'Швидкість', value: '12000 мм/хв', why: 'Швидка обробка великих партій.' },
      ],
      keyBenefits: [{ kind: 'paragraph', text: 'Проста у використанні модель для дому та невеликої майстерні.' }],
      functionality: [{
        heading: 'Лазерний модуль',
        blocks: [
          { kind: 'paragraph', text: LONG_PARAGRAPH },
          { kind: 'figure', ref: 0 },
        ],
      }],
      applications: {
        heading: 'Застосування пристрою',
        items: [
          { scenario: 'Гравіювання. ', text: 'Нанесення малюнків на дерево та шкіру.' },
          { scenario: 'Різання. ', text: 'Розкрій тонкого фанерного листа.' },
          { scenario: 'Маркування. ', text: 'Нанесення серійних номерів на деталі.' },
          { scenario: 'Творчість. ', text: 'Виготовлення сувенірів та подарунків.' },
        ],
      },
      specs: {
        heading: 'Технічні характеристики',
        categories: [{
          title: 'Технічні характеристики',
          rows: [
            { label: 'Потужність лазера', value: '20 Вт' },
            { label: 'Робоча зона друку', value: '400 мм' },
            { label: 'Швидкість гравіювання', value: '12000 мм/хв' },
            { label: 'Напруга живлення', value: '24 В' },
            { label: 'Вага пристрою', value: '12 кг' },
            { label: 'Роздільна здатність', value: '1200 dpi' },
            { label: 'Рівень шуму', value: '45 дБ' },
            { label: 'Гарантія', value: '24 місяці' },
            // Fabricated: no numeric/Latin/label-stem anchor in GROUNDING_SOURCE at all.
            { label: 'Колір індикатора', value: 'Синій' },
          ],
        }],
      },
      cta: { heading: 'Замовляйте зараз', text: 'Оформіть покупку сьогодні та отримайте швидку доставку.' },
      figures: [{
        file: 'laser-head.jpg',
        alt: 'Лазерна головка 40 Вт',
        caption: 'Потужність лазерного модуля 40 Вт',
      }],
      videos: [],
    };
  }

  it('surfaces a distinct finding from all 9 Doc-reading validators through one runDocGate call', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson.mockResolvedValueOnce(wiringViolationDoc());
    const orchestrator = bootOrchestrator(mockLlm);

    const allowedSpecParams = expectedSpecParameterLabels(WIRING_INPUT.specs, WIRING_INPUT.name);
    expect(allowedSpecParams).toHaveLength(11); // sanity: the canonical table parses as intended

    const result = await asDocGate(orchestrator).runDocGate(baseGateOpts({
      label: 'Doc (base)',
      contextLabel: 'Doc (base)',
      docTaskLabel: 'Doc (base)',
      maxRepairs: 0,
      locale: 'uk-UA',
      localeIso: 'uk-UA',
      input: WIRING_INPUT,
      groundingSpecs: GROUNDING_SOURCE,
      allowedSpecParams,
      imgManifest: IMAGE_MANIFEST,
      videoEmbeds: VIDEO_EMBEDS,
    }));

    const rules = result.finalIssues.map(i => i.rule);
    const expectedRules = [
      'spec-row-not-grounded',          // specs-grounding.ts
      'spec-count-mismatch',            // spec-count-parity.ts
      'alt-numeric-not-grounded',       // alt-numeric-fidelity.ts
      'tov-second-person-outside-scope',// tov-second-person.ts
      'h2-nominal-heading',             // heading-style.ts
      'sentence-too-long',              // sentence-length.ts
      'video-embed-missing',            // video-manifest.ts
      'image-manifest-missing',         // image-manifest-coverage.ts (Critical #1)
      'spec-category-collapse',         // spec-category-shape.ts (Critical #2)
    ];
    for (const rule of expectedRules) {
      expect(rules, `expected finding for rule "${rule}"`).toContain(rule);
    }

    // A doc this broken still parses and renders — runDocGate ships it with its findings attached
    // rather than throwing (maxRepairs: 0 means exactly one attempt, no retry).
    expect(result.artifact).toContain('<');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// sentence-too-long block-scoped repair, wired via docBlockRepairer (content-orchestrator.service.ts)
//
// Every other test in this file uses makeMockLlm()'s default generateText stub, which throws — that
// stub protects tests that don't expect ANY generateText call from a silent regression. The "full
// validator wiring" test above already proves the throw is caught harmlessly (best-effort contract,
// doc-tier.ts) when a fixture happens to trip sentence-too-long without expecting a repair. This
// block instead overrides generateText to prove the OTHER half: a well-formed patch response
// actually lands in the shipped artifact, and a bad one is safely discarded — the two outcomes
// createDocBlockRepairExecutor's own spec (doc-tier.spec.ts) proves in isolation, exercised here
// through the real gate end-to-end.
// ═══════════════════════════════════════════════════════════════════════════

describe('runDocGate — sentence-too-long is repaired in place, not just reported', () => {
  const LONG_SENTENCE =
    'Цей потужний лазерний гравер дозволяє швидко точно акуратно та безпечно обробляти дерево ' +
    'акрил шкіру тканину картон пластик і багато інших матеріалів для домашньої майстерні або ' +
    'невеликого виробництва.';
  const SHORT_REPLACEMENT = 'Цей лазерний гравер швидко та акуратно обробляє дерево, акрил і пластик.';

  function docWithLongSentence(): ProductDescriptionDoc {
    return {
      ...makeDoc([{ label: 'Вага', value: '500 г' }]),
      functionality: [{ heading: 'How it works', blocks: [{ kind: 'paragraph', text: LONG_SENTENCE }] }],
    };
  }

  it('applies a valid patch: the finding disappears and the shipped HTML carries the rewrite', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson.mockResolvedValueOnce(docWithLongSentence());
    mockLlm.generateText.mockResolvedValueOnce(
      `<patch path="functionality[0].blocks[0]">${SHORT_REPLACEMENT}</patch>`,
    );
    const orchestrator = bootOrchestrator(mockLlm);

    const result = await asDocGate(orchestrator).runDocGate(baseGateOpts({ maxRepairs: 0 }));

    expect(result.finalIssues.map(i => i.rule)).not.toContain('sentence-too-long');
    expect(result.artifact).toContain(SHORT_REPLACEMENT);
    expect(result.artifact).not.toContain(LONG_SENTENCE);
  });

  it('discards an invalid patch (invented number): the finding and the original text both survive', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson.mockResolvedValueOnce(docWithLongSentence());
    mockLlm.generateText.mockResolvedValueOnce(
      '<patch path="functionality[0].blocks[0]">Гравер обробляє дерево, акрил і 40 інших матеріалів швидко.</patch>',
    );
    const orchestrator = bootOrchestrator(mockLlm);

    const result = await asDocGate(orchestrator).runDocGate(baseGateOpts({ maxRepairs: 0 }));

    expect(result.finalIssues.map(i => i.rule)).toContain('sentence-too-long');
    expect(result.artifact).toContain(LONG_SENTENCE);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FINAL-REVIEW FIX WAVE, IMPORTANT #5 — generate()'s own Doc branch, end-to-end
//
// content-orchestrator.ua-doc-pipeline.spec.ts already proves generateUaContent() (the standalone
// "UA Description" tab) routes an enrolled store through the Doc pipeline. Nothing exercised
// generate() (the main multi-locale pipeline) doing the same — this suite closes that gap, reusing
// the same real, hand-verified EXPERT3D fixture render-reconciliation.spec.ts and
// render-description.spec.ts already rely on, rather than inventing a new one.
// ═══════════════════════════════════════════════════════════════════════════

describe('generate() — routes an enrolled store through the Doc pipeline end-to-end', () => {
  const EXPERT3D_DOC = JSON.parse(readFileSync(join(CORPUS_DIR, 'expert3d-ortur-h20-20w.doc.json'), 'utf8'));

  /** Minimal, validator-clean stubs for the Slug and SEO metadata steps — both run unconditionally
   *  in generate() regardless of Doc/HTML path. Modelled on
   *  content-orchestrator.ua-doc-pipeline.spec.ts's identical stubs. */
  function slugStub() {
    return {
      site_name: 'EXPERT3D',
      slugs: ['en-ES', 'es-ES', 'pt-PT', 'uk-UA'].map(language => ({
        language, name: 'Ortur H20 20 W', slug: `ortur-h20-20w-${language.toLowerCase()}`,
      })),
    };
  }

  function seoStub() {
    return {
      site_name: 'EXPERT3D',
      seo_data: ['en-ES', 'es-ES', 'pt-PT', 'uk-UA'].map(language => ({
        language, h1: 'Ortur H20 20 W', meta_title: 'Ortur H20 20 W laser engraver',
        meta_description: 'Ortur H20 20 W laser engraver for wood and metal, full specs inside ➔',
      })),
    };
  }

  function makeGenerateMockLlm(translationHtml: string) {
    const generateJson = vi.fn(async (_input: unknown, _useThinking?: boolean, meta?: UsageMeta) => {
      if (meta?.taskLabel === 'Doc (base)') return structuredClone(EXPERT3D_DOC);
      if (meta?.taskLabel === 'Slug') return slugStub();
      if (meta?.taskLabel === 'SEO metadata') return seoStub();
      throw new Error(`unexpected generateJson taskLabel: ${meta?.taskLabel}`);
    });
    // Every Task C translation call, whatever the target language, gets the same trivial HTML —
    // this suite is about proving the MASTER routes through the Doc branch, not about translation
    // content, so the (mocked) translations are allowed to fail their own validators and just
    // report issues rather than throw.
    const generateText = vi.fn(async (_input: unknown, _useThinking?: boolean, _meta?: UsageMeta) => translationHtml);
    const recordGeneration = vi.fn(async () => {});
    return { generateJson, generateText, recordGeneration };
  }

  it('generates the uk-UA master via the Doc/JSON path, not the HTML/text path', async () => {
    const mockLlm = makeGenerateMockLlm('<p>Опис продукту для тесту.</p>');
    const orchestrator = bootOrchestrator(mockLlm);
    // Zero repair budget: the fixture is a real, hand-verified Doc (used by
    // render-reconciliation.spec.ts / render-description.spec.ts), so it needs no repair pass, and
    // this keeps the mocked Task C translation calls to exactly one per language regardless of
    // whether the trivial stub HTML happens to pass validateStructuralParity against the real
    // rendered master.
    orchestrator.maxRepairs.set(0);

    const input: ProductInput = {
      website: { name: 'EXPERT3D', group: 'ES', url: 'https://impresora-3d.es' },
      name: 'Ortur H20 20 W',
      description: '',
      specs: '',
      brandFolder: 'ortur',
      modelFolder: 'h20/h20-20w',
    };

    await orchestrator.generate(input);

    // The base artifact was requested as JSON (Doc) under the 'Doc (base)' task label — proves
    // useDocPipeline gated buildPromptADoc + generateJson inside generate() itself, not just inside
    // generateUaContent() (already covered by content-orchestrator.ua-doc-pipeline.spec.ts).
    expect(mockLlm.generateJson).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), expect.objectContaining({ taskLabel: 'Doc (base)' }),
    );
    expect(mockLlm.generateText).not.toHaveBeenCalledWith(
      expect.anything(), expect.anything(), expect.objectContaining({ taskLabel: 'HTML (base)' }),
    );

    // renderDescription() actually ran on the mocked Doc, exactly once for the master — checked via
    // a heading string unique to this fixture (its CTA section), the same assertion
    // content-orchestrator.ua-doc-pipeline.spec.ts uses for generateUaContent()'s equivalent.
    expect(orchestrator.content().mainHtmlUa).toContain('Чому купити Ortur H20 20 Вт в EXPERT3D?');

    // recordGeneration fired for the master with the 'doc' pipeline tag and a real outcome — the
    // telemetry signal Important #3 exists to keep observable.
    expect(mockLlm.recordGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'uk-UA', pipeline: 'doc', outcome: expect.stringMatching(/^(ok|repaired)$/) }),
    );
  });
});

/**
 * US-3.1 T1 (FR-10, AC-6, plan D7). `doc-schema` gets a targeted, field-scoped repair for an
 * addressable finding (the Story's own example: an empty required string) instead of always
 * falling through to a full-document regeneration — the exact disproportionate-cost regression
 * AC-6 exists to close (the QA report's own repair log: two full-regen attempts for one field).
 *
 * `invalidSchemaDoc()`'s own scenario (killerSpecs below the schema minimum, an array-LENGTH
 * failure with no addressable index) is deliberately UNCHANGED by this Story — it still falls
 * through to full-regen today (see the describe block above, "ships a valid artifact on attempt
 * 2", `repairsUsed: 1`) and must keep doing so: `emptyRequiredStringDoc()` below is a different,
 * genuinely addressable failure shape, not a stronger claim about the array-length case.
 */
describe('runDocGate — FR-10: an addressable doc-schema finding is repaired field-scoped, without a full regeneration', () => {
  it('repairs a Story-example empty required string (cta.text) via the field-scoped rung, spending zero full regenerations', async () => {
    const mockLlm = makeMockLlm();
    // Attempt 1: schema-invalid (cta.text === ''). Only ONE generateJson call is expected overall —
    // a field-scoped repair must not trigger a second full produce() call.
    mockLlm.generateJson.mockResolvedValueOnce(emptyRequiredStringDoc());
    // The field-scoped rung's own LLM call (runDocGate's `repairField`, wired to generateText) —
    // returns a valid, non-empty replacement for the addressed field only.
    mockLlm.generateText.mockResolvedValueOnce('Buy the Test Product today for reliable results.');
    const orchestrator = bootOrchestrator(mockLlm);

    const result = await asDocGate(orchestrator).runDocGate(baseGateOpts({ groundingSpecs: GROUNDING_SOURCE, maxRepairs: 2 }));

    // Zero full-document regenerations — the field-scoped rung alone resolved it.
    expect(result.repairsUsed).toBe(0);
    expect(mockLlm.generateJson).toHaveBeenCalledTimes(1);
    // The repaired artifact actually rendered — proving the graduated candidate reached the one
    // render call, not the empty-artifact sentinel.
    expect(result.artifact.length).toBeGreaterThan(0);
    expect(result.finalIssues.filter((i: { rule: string }) => i.rule === 'doc-schema')).toEqual([]);
  });

  it('a candidate that never repairs (no repairField executor available) still falls through to full-regen, never silently ships the invalid value', async () => {
    // Same broken fixture, but this time the field-scoped rung's own call also fails to produce a
    // usable value (empty response) — proving the field-scoped rung is not itself a silent-success
    // trap: an unrepaired addressable finding must still escalate rather than ship cta.text === ''.
    const mockLlm = makeMockLlm();
    mockLlm.generateJson
      .mockResolvedValueOnce(emptyRequiredStringDoc())
      .mockResolvedValueOnce(makeDoc([{ label: 'Вага', value: '500 г' }])); // full-regen recovers it
    mockLlm.generateText.mockResolvedValueOnce(''); // field-scoped rung fails to produce a value

    const orchestrator = bootOrchestrator(mockLlm);
    const result = await asDocGate(orchestrator).runDocGate(baseGateOpts({ maxRepairs: 2 }));

    expect(result.finalIssues.filter((i: { rule: string }) => i.rule === 'doc-schema')).toEqual([]);
    // It DID need the full-regen this time — the field-scoped rung alone could not resolve it.
    expect(result.repairsUsed).toBeGreaterThanOrEqual(1);
  });
});

/**
 * US-3.1 T13 (FR-10(b), AC-6, plan D13). The real-shaped regression: a genuinely MISSING
 * `cta.heading` key (not `emptyRequiredStringDoc()`'s present-but-empty `cta.text`) is repaired
 * field-scoped, without a full-document regeneration.
 */
describe('runDocGate — T13 (FR-10(b), AC-6): a genuinely missing cta.heading key is repaired field-scoped, not silently skipped', () => {
  it('repairs a missing (not merely empty) cta.heading via the field-scoped rung, spending zero full regenerations', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson
      .mockResolvedValueOnce(missingCtaHeadingDoc())
      // Fallback for TODAY's pre-T13 behaviour (the missing key is silently skipped, so the ladder
      // falls through to a real full regeneration) — without this, a second call hits
      // makeMockLlm()'s own "unstubbed generateJson call" throw and masks the intended red reason.
      .mockResolvedValueOnce(makeDoc([{ label: 'Вага', value: '500 г' }]));
    mockLlm.generateText.mockResolvedValueOnce('Чому варто купити Test Product у EXPERT3D?');
    const orchestrator = bootOrchestrator(mockLlm);

    const result = await asDocGate(orchestrator).runDocGate(baseGateOpts({ groundingSpecs: GROUNDING_SOURCE, maxRepairs: 2 }));

    // TODAY (pre-T13): getAtPath(next, 'doc.cta.heading') returns undefined, typeof undefined !==
    // 'string' is true, so applyTier advances-and-skips without ever calling repairField — the
    // ladder falls through to the second, full-regeneration generateJson call instead. Red below:
    // repairsUsed would be >= 1, not 0.
    expect(result.repairsUsed).toBe(0);
    expect(mockLlm.generateJson).toHaveBeenCalledTimes(1);
    expect(result.artifact.length).toBeGreaterThan(0);
    expect(result.finalIssues.filter((i: { rule: string }) => i.rule === 'doc-schema')).toEqual([]);
  });
});

/**
 * US-3.1 T14 (FR-10, FR-11, AC-6, plan D14). The real-shaped oscillation `pipeline_status` v8
 * diagnosed: a fresh full-regeneration attempt whose own field-scoped repair fixes one addressable
 * finding (`doc-schema`) but, because the repaired value itself doesn't satisfy a DIFFERENT check
 * (`heading-brand-core-missing`), appears to introduce the other — and today only a further,
 * non-monotonic full regeneration could ever attempt the second finding at all. T14 gives the SAME
 * attempt's own ladder pass a second rung: once `doc-schema` resolves and the artifact is
 * re-validated, the newly-surfaced `heading-brand-core-missing` finding gets its own field-scoped
 * shot in the SAME pass, converging both within one attempt rather than requiring two discarded
 * regenerations.
 */
describe('runDocGate — T14 (FR-10, FR-11, AC-6): a fresh regeneration attempt converges doc-schema and heading-brand-core-missing within its own ladder pass', () => {
  it('a fresh full-regeneration whose field-scoped repair fixes doc-schema but introduces heading-brand-core-missing converges within the same attempt', async () => {
    const mockLlm = makeMockLlm();
    mockLlm.generateJson
      .mockResolvedValueOnce(invalidSchemaDoc())      // attempt 0 — unaddressable, forces a full regen
      .mockResolvedValueOnce(missingCtaHeadingDoc());  // attempt 1 (the fresh regen) — cta.heading genuinely missing
    mockLlm.generateText
      // First field-scoped attempt: fixes doc-schema (a non-empty heading), but does not name the
      // product — introduces heading-brand-core-missing on the SAME attempt.
      .mockResolvedValueOnce('Дізнайтеся більше про переваги.')
      // Second field-scoped attempt, same ladder pass: names the product — resolves it.
      .mockResolvedValueOnce('Чому варто купити Test Product у EXPERT3D?');
    const orchestrator = bootOrchestrator(mockLlm);

    const result = await asDocGate(orchestrator).runDocGate(baseGateOpts({ groundingSpecs: GROUNDING_SOURCE, maxRepairs: 1 }));

    // Exactly two generateJson calls (attempt 0's own unaddressable defect, plus the ONE fresh
    // regen) — the convergence happens inside that one attempt's own ladder pass, not via a
    // SECOND, discarded regeneration. TODAY (pre-T14): the main loop's cleanup never attempts
    // either finding (neither has a deterministic rung), so heading-brand-core-missing survives
    // unresolved and finalIssues is red below.
    expect(mockLlm.generateJson).toHaveBeenCalledTimes(2);
    expect(result.repairsUsed).toBe(1);
    expect(result.finalIssues.filter((i: { rule: string }) => i.rule === 'doc-schema' || i.rule === 'heading-brand-core-missing')).toEqual([]);
  });
});

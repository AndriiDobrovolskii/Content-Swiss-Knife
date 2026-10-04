/**
 * content-orchestrator.image-placeholder.spec.ts - US-5.1 T10: the orchestrator wiring of the marker
 * step (Doc pipeline and legacy HTML pipeline), reworked for Specification v9.
 *
 * From Spec FR-7..FR-12, FR-17, FR-18, FR-21, NFR-1, NFR-8, NFR-9, NFR-12, AC-4, AC-5 and the plan-gate
 * decisions OQ-1 (Expert-3DPrinter served through the marker step with a relative src), OQ-5, OQ-6
 * (warning context is the uk-UA master label), OQ-7 (Consumables ride the shared Doc path). Plan D7's
 * two-manifest rule is observable here: `imgManifest` (coverage) keeps its blanking for Expert-3DPrinter
 * while the marker step and the numeric-fidelity sources see the real `input.imageManifest`.
 *
 * v9 adds (plan D7, OI-7): the figure texts are the Ukrainian Vision fields of the manifest entry; the
 * numeric-fidelity sources also join those three fields, so a number that appears only in a recorded
 * Ukrainian text is grounded (case (a) below, both pipelines) while an ungrounded one still fails; the
 * two FR-21 caption warnings reach the QA report and never trigger repair; an entry without the new
 * fields never fails generation (NFR-12).
 *
 * DI, NOT TestBed — see content-orchestrator.ua-doc-pipeline.spec.ts for the reasoning. The Doc gate
 * is driven through the private `runDocGate` exactly as content-orchestrator.doc-gate.spec.ts does;
 * the legacy path is driven through the public `generateUaContent`, and `generate()` is used only for
 * the properties that need the multi-locale run (one warning for the whole run, translations
 * inheriting the master's figure).
 */
import '@angular/compiler';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Injector } from '@angular/core';
import { ContentOrchestratorService } from './content-orchestrator.service';
import { LlmService } from './llm.service';
import { RetrievalService } from './retrieval.service';
import { HistoryService } from './history.service';
import { STORE_REGISTRY } from '../prompt-core/constants';
import { DOC_PIPELINE_STORES } from '../prompt-core/doc-pipeline-flag';
import type { ProductInput, ImageManifestEntry, WebsiteOption } from '../app/types';
import type { ProductDescriptionDoc } from '../domain/description-doc';
import type { UsageMeta, PromptPayload } from '../prompt-core/payload';
import type { GroundingInspection } from '../utils/specs-grounding';
import type { SourceVideoEmbed } from '../utils/video-manifest';
import type { RepairGateResult } from '../utils/repair-gate';
import type { ValidationIssue } from '../utils/output-validator';
import { v3BaseDoc } from '../../test/fixtures/v4-docs';
import { filamentsDoc, words } from '../../test/fixtures/simplified-docs';
import {
  LAMP, MARKER, LAMP_ALT, LAMP_ALT_UK, LAMP_LABEL_UK, LAMP_DESC_UK, FALLBACK_LABEL, entry, legacyEntry, collapse, hasCyrillic,
} from '../../test/fixtures/image-placeholder/fixtures';

afterEach(() => vi.restoreAllMocks());

const PRODUCT = 'Ortur H20 20 W';
const EXPERT3D: WebsiteOption = { name: 'EXPERT3D', group: 'ES', url: 'https://impresora-3d.es' };
const EXPERT_US: WebsiteOption = { name: 'Expert-3DPrinter', group: 'US', url: 'https://expert-3dprinter.example' };
const EXPERT3D_BASE = STORE_REGISTRY['EXPERT3D'].imageBaseUrl;
const DROPPED = 'dropped-image-placeholder';

const message = (marker: string): string =>
  `ШІ не зміг зберегти маркер ${marker} у тексті. Зображення було перенесено в кінець опису. Будь ласка, перевірте його позицію.`;

// ── Doc-gate harness (mirrors content-orchestrator.doc-gate.spec.ts) ──────────────────────────────

function makeMockLlm() {
  return {
    generateJson: vi.fn(async (_i: unknown, _t?: boolean, _m?: UsageMeta): Promise<unknown> => {
      throw new Error('unstubbed generateJson call');
    }),
    generateText: vi.fn(async (_i: unknown, _t?: boolean, _m?: UsageMeta): Promise<string> => {
      throw new Error('unstubbed generateText call');
    }),
    recordGeneration: vi.fn(async () => {}),
  };
}

function boot(mockLlm: ReturnType<typeof makeMockLlm>): ContentOrchestratorService {
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

interface RunDocGateOpts {
  label: string; contextLabel: string; docTaskLabel: string; maxRepairs: number; basePayload: PromptPayload;
  useThinking: boolean; locale: string; localeIso: string; input: ProductInput; groundingSpecs: string;
  allowedSpecParams: string[]; groundingDisabled: boolean; grounding: GroundingInspection;
  videoEmbeds: SourceVideoEmbed[]; imgManifest?: ImageManifestEntry[]; onAttempt: (n: number, c: number) => void;
}
const asDocGate = (o: ContentOrchestratorService) =>
  o as unknown as { runDocGate(opts: RunDocGateOpts): Promise<RepairGateResult<string>> };

function inputWith(description: string, manifest: ImageManifestEntry[] | undefined, over: Partial<ProductInput> = {}): ProductInput {
  return {
    website: EXPERT3D, name: PRODUCT, description, specs: '', brandFolder: 'acme', modelFolder: 'lamp',
    imageManifest: manifest, ...over,
  };
}

function gateOpts(input: ProductInput, over: Partial<RunDocGateOpts> = {}): RunDocGateOpts {
  return {
    label: 'HTML (uk-UA)', contextLabel: 'HTML (uk-UA)', docTaskLabel: 'Doc (uk-UA)', maxRepairs: 2,
    basePayload: { systemBlocks: [{ text: 'master', cache: true }, { text: 'task', cache: true }], userContent: '[INPUT DATA]' },
    useThinking: false, locale: 'uk-UA', localeIso: 'uk-UA', input, groundingSpecs: '', allowedSpecParams: [],
    groundingDisabled: false, grounding: { text: '' } satisfies GroundingInspection, videoEmbeds: [],
    imgManifest: input.imageManifest, onAttempt: () => {}, ...over,
  };
}

/** A schema-valid, validator-clean document whose first functionality paragraph is `text`. */
function docWith(text: string, mutate: (d: ProductDescriptionDoc) => void = () => {}): ProductDescriptionDoc {
  const doc = structuredClone(v3BaseDoc());
  doc.functionality = [{ heading: 'Як працює лазерний модуль', blocks: [{ kind: 'paragraph', text }] }];
  // The base fixture's §7 heading names the full product, which raises a repairable warning that would
  // consume a mocked generateText response; a neutral heading keeps every baseline run issue-free.
  doc.specs!.heading = 'Технічні характеристики';
  mutate(doc);
  return doc;
}

const rulesOf = (issues: ValidationIssue[]) => issues.map(i => i.rule);
const dom = (html: string) => new DOMParser().parseFromString(html, 'text/html');
const figureSrcs = (html: string) => Array.from(dom(html).querySelectorAll('img')).map(i => i.getAttribute('src'));
const LAMP_URL = `${EXPERT3D_BASE}acme/lamp/desk-lamp.jpg`;

describe('Doc pipeline — a marker the model kept is substituted at its position (AC-2, AC-4, FR-3, FR-8)', () => {
  it('ships a figure at the marker, no marker text, no repair, and the marker image satisfies coverage', async () => {
    const llm = makeMockLlm();
    llm.generateJson.mockImplementation(async () => structuredClone(docWith(`Before text ${MARKER} after text.`)));
    const o = boot(llm);

    const result = await asDocGate(o).runDocGate(gateOpts(inputWith(`Intro ${MARKER} text`, [LAMP])));

    expect(llm.generateJson).toHaveBeenCalledTimes(1);
    expect(result.repairsUsed).toBe(0);
    expect(result.artifact).not.toContain(MARKER);
    expect(figureSrcs(result.artifact)).toEqual([LAMP_URL]);
    const img = dom(result.artifact).querySelector('figure img')!;
    expect(img.getAttribute('alt')).toBe(LAMP_ALT_UK);
    expect(result.artifact).not.toContain(LAMP_ALT);
    // No model call is made to build the texts (AC-9 k, NFR-2): the one generateJson call is the document itself.
    expect(llm.generateText).not.toHaveBeenCalled();
    // The figure sits between the two halves of the original paragraph.
    const at = (s: string) => result.artifact.indexOf(s);
    expect(at('Before text')).toBeGreaterThan(-1);
    expect(at('src="' + LAMP_URL)).toBeGreaterThan(at('Before text'));
    expect(at('after text.')).toBeGreaterThan(at('src="' + LAMP_URL));
    expect(rulesOf(result.finalIssues)).not.toContain('image-manifest-missing');
    expect(rulesOf(result.finalIssues)).not.toContain(DROPPED);
  });

  it('hosts a figure in the hook and renders it as the first, eager image (FR-13)', async () => {
    const llm = makeMockLlm();
    llm.generateJson.mockImplementation(async () => structuredClone(docWith('Plain paragraph.', d => {
      d.hook = `<b>Ortur H20 20 W</b> — гравер для майстерні. ${MARKER} Ще одне речення про гравер.`;
    })));
    const result = await asDocGate(boot(llm)).runDocGate(gateOpts(inputWith(`Intro ${MARKER}`, [LAMP])));
    const img = dom(result.artifact).querySelector('figure img')!;
    expect(img.getAttribute('src')).toBe(LAMP_URL);
    expect(img.hasAttribute('loading')).toBe(false);
    expect(result.artifact).not.toContain(MARKER);
  });

  it('behaves exactly as before for a description without markers (NFR-8)', async () => {
    const llm = makeMockLlm();
    llm.generateJson.mockImplementation(async () => structuredClone(docWith('Plain paragraph.')));
    const result = await asDocGate(boot(llm)).runDocGate(gateOpts(inputWith('Plain description with [note] and [1].', undefined)));
    expect(llm.generateJson).toHaveBeenCalledTimes(1);
    expect(result.artifact).not.toContain('<figure');
    expect(rulesOf(result.finalIssues).filter(r => /placeholder/.test(r))).toEqual([]);
  });

  it.each([...DOC_PIPELINE_STORES])('uses the same manifest for coverage and for the marker step on the Doc store %s', async store => {
    const llm = makeMockLlm();
    llm.generateJson.mockImplementation(async () => structuredClone(docWith(`Before ${MARKER} after.`)));
    const website = { name: store, group: STORE_REGISTRY[store].group, url: 'https://store.example' } as WebsiteOption;
    const result = await asDocGate(boot(llm)).runDocGate(
      gateOpts(inputWith(`Intro ${MARKER}`, [LAMP], { website })),
    );
    expect(figureSrcs(result.artifact)).toEqual([`${STORE_REGISTRY[store].imageBaseUrl}acme/lamp/desk-lamp.jpg`]);
    expect(rulesOf(result.finalIssues)).not.toContain('image-manifest-missing');
    expect(rulesOf(result.finalIssues)).not.toContain('image-manifest-duplicate');
  });
});

describe('Doc pipeline — a dropped marker drives the repair ladder (FR-17, H-1)', () => {
  it('spends a full regeneration, names the file in the retry feedback, and accepts a regenerated marker', async () => {
    const llm = makeMockLlm();
    llm.generateJson
      .mockResolvedValueOnce(docWith('The model dropped the marker.'))
      .mockResolvedValueOnce(docWith(`Before ${MARKER} after.`));
    const result = await asDocGate(boot(llm)).runDocGate(gateOpts(inputWith(`Intro ${MARKER}`, [LAMP])));

    expect(llm.generateJson).toHaveBeenCalledTimes(2);
    expect(result.repairsUsed).toBe(1);
    const retry = llm.generateJson.mock.calls[1][0] as PromptPayload;
    expect(retry.userContent).toContain('VALIDATION FEEDBACK');
    expect(retry.userContent).toContain('desk-lamp.jpg');
    expect(figureSrcs(result.artifact)).toEqual([LAMP_URL]);
    expect(rulesOf(result.finalIssues)).not.toContain(DROPPED);
  });

  it('does not fire when the Original Description has no marker, so a doc without figures is accepted first time', async () => {
    const llm = makeMockLlm();
    llm.generateJson.mockImplementation(async () => structuredClone(docWith('Plain paragraph.')));
    const result = await asDocGate(boot(llm)).runDocGate(gateOpts(inputWith('No marker here.', [LAMP], {}), { imgManifest: undefined }));
    expect(llm.generateJson).toHaveBeenCalledTimes(1);
    expect(rulesOf(result.finalIssues)).not.toContain(DROPPED);
  });
});

describe('Doc pipeline — ladder exhaustion moves the image to the end with a warning (FR-18, NFR-9)', () => {
  async function exhausted(manifest: ImageManifestEntry[], description: string) {
    const llm = makeMockLlm();
    llm.generateJson.mockImplementation(async () => structuredClone(docWith('The model never keeps the marker.')));
    const result = await asDocGate(boot(llm)).runDocGate(gateOpts(inputWith(description, manifest)));
    return { llm, result };
  }

  it('tries the whole ladder, then ships one figure at the end and one Ukrainian warning, with no error left', async () => {
    const { llm, result } = await exhausted([LAMP], `Intro ${MARKER}`);

    expect(llm.generateJson).toHaveBeenCalledTimes(3); // 1 initial + maxRepairs 2
    expect(figureSrcs(result.artifact)).toEqual([LAMP_URL]);
    expect(result.artifact).not.toContain(MARKER);
    // The figure is the last block of the description, after the CTA text it uses as its lead-in.
    expect(result.artifact.lastIndexOf('<figure')).toBeGreaterThan(result.artifact.indexOf('class="cta"'));

    const mine = result.finalIssues.filter(i => i.rule === DROPPED);
    expect(mine).toHaveLength(1);
    expect(mine[0].severity).toBe('warning');
    expect(mine[0].detail).toBe(message(MARKER));
    expect(mine[0].context).toBe('HTML (uk-UA)');
    expect(result.finalIssues.filter(i => i.severity === 'error')).toEqual([]);
  });

  it('writes the real marker, including a .webp one, into the warning', async () => {
    const webp = entry({ originalFilename: 'desk-lamp.webp', urlFilename: 'desk-lamp.jpg' });
    const { result } = await exhausted([webp], 'Intro [desk-lamp.webp]');
    expect(result.finalIssues.find(i => i.rule === DROPPED)!.detail).toBe(message('[desk-lamp.webp]'));
    expect(figureSrcs(result.artifact)).toEqual([LAMP_URL]);
  });

  it('relocates a model-placed figure for the file to the end so the image appears exactly once', async () => {
    const llm = makeMockLlm();
    llm.generateJson.mockImplementation(async () => structuredClone(docWith('Lead paragraph.', d => {
      d.functionality![0].blocks.push({ kind: 'figure', ref: 0 });
      d.figures = [{ file: 'desk-lamp.jpg', alt: 'Model alt', caption: '<b>Photo:</b> MODEL-AUTHORED CAPTION' }];
    })));
    const result = await asDocGate(boot(llm)).runDocGate(gateOpts(inputWith(`Intro ${MARKER}`, [LAMP])));
    expect(figureSrcs(result.artifact)).toEqual([LAMP_URL]);
    expect(result.artifact.lastIndexOf('<figure')).toBeGreaterThan(result.artifact.indexOf('class="cta"'));
    expect(result.finalIssues.filter(i => i.rule === DROPPED && i.severity === 'warning')).toHaveLength(1);
  });
});

describe('Doc pipeline — unmatched and unplaceable markers are non-blocking warnings (FR-9, FR-6, AC-5, NFR-9)', () => {
  it('removes an unmatched marker, adds no image, and warns once without spending a repair', async () => {
    const llm = makeMockLlm();
    llm.generateJson.mockImplementation(async () => structuredClone(docWith('Alpha [ghost.jpg] beta [ghost.jpg] gamma.')));
    const result = await asDocGate(boot(llm)).runDocGate(gateOpts(inputWith('Intro [ghost.jpg]', [])));

    expect(llm.generateJson).toHaveBeenCalledTimes(1);
    expect(result.artifact).not.toContain('[ghost.jpg]');
    expect(result.artifact).not.toContain('<figure');
    const warnings = result.finalIssues.filter(i => i.rule === 'unmatched-image-placeholder');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe('warning');
    expect(warnings[0].detail).toContain('ghost.jpg');
    expect(warnings[0].context).toBe('HTML (uk-UA)');
    expect(result.finalIssues.filter(i => i.severity === 'error')).toEqual([]);
  });

  it('removes a marker in a bullet, warns with image-placeholder-not-placed, and appends the image at the end', async () => {
    const llm = makeMockLlm();
    llm.generateJson.mockImplementation(async () => structuredClone(docWith('Plain paragraph.', d => {
      d.killerSpecs![0].why += ` ${MARKER}`;
    })));
    const result = await asDocGate(boot(llm)).runDocGate(gateOpts(inputWith(`Intro ${MARKER}`, [LAMP])));

    expect(llm.generateJson).toHaveBeenCalledTimes(1);
    expect(result.artifact).not.toContain(MARKER);
    expect(figureSrcs(result.artifact)).toEqual([LAMP_URL]);
    expect(result.artifact.lastIndexOf('<figure')).toBeGreaterThan(result.artifact.indexOf('class="cta"'));
    const w = result.finalIssues.filter(i => i.rule === 'image-placeholder-not-placed');
    expect(w).toHaveLength(1);
    expect(w[0].severity).toBe('warning');
    expect(rulesOf(result.finalIssues)).not.toContain('image-manifest-missing');
  });

  it('keeps the warnings when a block-scoped repair mutates the document afterwards (the report rides on the attempt)', async () => {
    const LONG = 'Цей потужний лазерний гравер дозволяє швидко точно акуратно та безпечно обробляти дерево '
      + 'акрил шкіру тканину картон пластик і багато інших матеріалів для домашньої майстерні або невеликого виробництва.';
    const SHORT = 'Цей лазерний гравер швидко та акуратно обробляє дерево, акрил і пластик.';
    const llm = makeMockLlm();
    llm.generateJson.mockImplementation(async () => structuredClone(docWith(LONG, d => { d.hook += ' [ghost.jpg]'; })));
    llm.generateText.mockResolvedValueOnce(`<patch path="functionality[0].blocks[0]">${SHORT}</patch>`);

    const result = await asDocGate(boot(llm)).runDocGate(gateOpts(inputWith('Intro [ghost.jpg]', []), { maxRepairs: 0 }));

    expect(result.artifact).toContain(SHORT); // the block repair really ran and landed
    expect(rulesOf(result.finalIssues)).not.toContain('sentence-too-long');
    expect(result.finalIssues.filter(i => i.rule === 'unmatched-image-placeholder')).toHaveLength(1);
  });
});

describe('Doc pipeline — a schema-invalid candidate skips the step without a spurious dropped error (N-4)', () => {
  it('lets the schema issue drive the repair and raises no dropped-image-placeholder for that attempt', async () => {
    const llm = makeMockLlm();
    const invalid = { ...docWith('x'), killerSpecs: [{ label: 'A', value: '1', why: 'only one' }] };
    llm.generateJson
      .mockResolvedValueOnce(invalid)
      .mockResolvedValueOnce(docWith(`Before ${MARKER} after.`));
    const result = await asDocGate(boot(llm)).runDocGate(gateOpts(inputWith(`Intro ${MARKER}`, [LAMP])));

    expect(llm.generateJson).toHaveBeenCalledTimes(2);
    expect(result.repairsUsed).toBe(1);
    expect(figureSrcs(result.artifact)).toEqual([LAMP_URL]);
    const retry = llm.generateJson.mock.calls[1][0] as PromptPayload;
    expect(retry.userContent).not.toContain(DROPPED);
  });
});

describe('Doc pipeline — the Consumables template rides the shared path (OQ-7, AC-4)', () => {
  it('substitutes a marker for the Consumables template (filaments, resins, powders) as for the full description', async () => {
    const llm = makeMockLlm();
    llm.generateJson.mockImplementation(async () => {
      const doc = filamentsDoc();
      // Keeps the v4 hook-start invariant (`<b>name</b> — `); 2 + 28 + 30 = 60 words, inside the 40-85 range
      // only when the split hook is measured as a whole.
      doc.hook = `<b>eSUN PLA+</b> — ${words(28)} ${MARKER} ${words(30)}`;
      return structuredClone(doc);
    });
    const input = inputWith(`Intro ${MARKER}`, [LAMP], { templateId: 'filaments-resins-powders', name: 'eSUN PLA+' });
    const result = await asDocGate(boot(llm)).runDocGate(gateOpts(input, { maxRepairs: 0 }));
    expect(result.artifact).not.toContain(MARKER);
    expect(figureSrcs(result.artifact)).toEqual([LAMP_URL]);
    // The split hook is measured as a whole: no spurious word-range finding for it.
    expect(result.finalIssues.filter(i => i.rule === 'simplified-range-hook')).toEqual([]);
  });
});

describe('Doc pipeline — the FR-21 caption rules in the QA report (AC-9 h, i; NFR-9, NFR-12)', () => {
  const KETTLE_SAME_LABEL = entry({
    id: 'img-2', originalFilename: 'kettle-side.jpg', urlFilename: 'kettle-side.jpg', visionLabelUk: LAMP_LABEL_UK, order: 1,
  });

  it('ships a figure with the Ukrainian fallbacks for an entry created before this Story, without failing or repairing (NFR-12)', async () => {
    const llm = makeMockLlm();
    llm.generateJson.mockImplementation(async () => structuredClone(docWith(`Before ${MARKER} after.`)));
    const result = await asDocGate(boot(llm)).runDocGate(gateOpts(inputWith(`Intro ${MARKER}`, [legacyEntry()])));
    expect(llm.generateJson).toHaveBeenCalledTimes(1);
    expect(result.repairsUsed).toBe(0);
    const figure = dom(result.artifact).querySelector('figure')!;
    expect(figure.querySelector('figcaption b')!.textContent).toBe(FALLBACK_LABEL);
    expect(figure.querySelector('img')!.getAttribute('alt')).toBe('desk lamp');
    expect(result.finalIssues.filter(i => i.severity === 'error')).toEqual([]);
    expect(rulesOf(result.finalIssues).filter(r => /^image-caption/.test(r))).toEqual([]);
  });

  it('reports one image-caption-not-native warning with the gate context and spends no repair on it (NFR-9)', async () => {
    const llm = makeMockLlm();
    llm.generateJson.mockImplementation(async () => structuredClone(docWith(`Before ${MARKER} after.`)));
    const english = entry({ visionDescriptionUk: 'A lamp on a table.' });
    const result = await asDocGate(boot(llm)).runDocGate(gateOpts(inputWith(`Intro ${MARKER}`, [english])));
    expect(llm.generateJson).toHaveBeenCalledTimes(1);
    expect(result.repairsUsed).toBe(0);
    const w = result.finalIssues.filter(i => i.rule === 'image-caption-not-native');
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ severity: 'warning', context: 'HTML (uk-UA)' });
    expect(w[0].detail).toContain('desk-lamp.jpg');
    expect(hasCyrillic(w[0].detail)).toBe(true);
  });

  it('reports one image-caption-duplicate-label warning for the later figure and keeps both captions (rule 5)', async () => {
    const llm = makeMockLlm();
    llm.generateJson.mockImplementation(async () => structuredClone(docWith('Alpha [desk-lamp.jpg] beta [kettle-side.jpg] gamma.')));
    const result = await asDocGate(boot(llm)).runDocGate(
      gateOpts(inputWith('Intro [desk-lamp.jpg] [kettle-side.jpg]', [LAMP, KETTLE_SAME_LABEL])),
    );
    expect(result.repairsUsed).toBe(0);
    const w = result.finalIssues.filter(i => i.rule === 'image-caption-duplicate-label');
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ severity: 'warning', context: 'HTML (uk-UA)' });
    expect(w[0].detail).toContain('kettle-side.jpg');
    const labels = Array.from(dom(result.artifact).querySelectorAll('figcaption b')).map(b => b.textContent);
    expect(labels).toEqual([LAMP_LABEL_UK, LAMP_LABEL_UK]);
  });

  it('keeps the caption warnings when a block-scoped repair mutates the document afterwards (the report rides on the attempt)', async () => {
    const LONG = 'Цей потужний лазерний гравер дозволяє швидко точно акуратно та безпечно обробляти дерево '
      + 'акрил шкіру тканину картон пластик і багато інших матеріалів для домашньої майстерні або невеликого виробництва.';
    const SHORT = 'Цей лазерний гравер швидко та акуратно обробляє дерево, акрил і пластик.';
    const llm = makeMockLlm();
    llm.generateJson.mockImplementation(async () => structuredClone(docWith(LONG, d => { d.hook += ` ${MARKER}`; })));
    llm.generateText.mockResolvedValueOnce(`<patch path="functionality[0].blocks[0]">${SHORT}</patch>`);
    const english = entry({ visionAltUk: 'English alt only' });
    const result = await asDocGate(boot(llm)).runDocGate(gateOpts(inputWith(`Intro ${MARKER}`, [english]), { maxRepairs: 0 }));
    expect(result.artifact).toContain(SHORT);
    expect(result.finalIssues.filter(i => i.rule === 'image-caption-not-native')).toHaveLength(1);
  });

  it('on ladder exhaustion the appended figure is the Ukrainian one and a non-native field adds one caption warning', async () => {
    const llm = makeMockLlm();
    llm.generateJson.mockImplementation(async () => structuredClone(docWith('The model never keeps the marker.')));
    const english = entry({ visionAltUk: 'English alt only' });
    const result = await asDocGate(boot(llm)).runDocGate(gateOpts(inputWith(`Intro ${MARKER}`, [english])));
    const figure = dom(result.artifact).querySelector('figure')!;
    expect(figure.querySelector('figcaption b')!.textContent).toBe(LAMP_LABEL_UK);
    expect(figure.querySelector('img')!.getAttribute('alt')).toBe('desk lamp');
    expect(figure.outerHTML).not.toMatch(/Image:|Product image|\bView\b/);
    expect(result.finalIssues.filter(i => i.rule === DROPPED && i.severity === 'warning')).toHaveLength(1);
    expect(result.finalIssues.filter(i => i.rule === 'image-caption-not-native')).toHaveLength(1);
    expect(result.finalIssues.filter(i => i.severity === 'error')).toEqual([]);
  });

  it('applies the Cyrillic check in the uk-UA master: an English recorded alt never reaches the shipped figure (A-15, NFR-6)', async () => {
    const llm = makeMockLlm();
    llm.generateJson.mockImplementation(async () => structuredClone(docWith(`Before ${MARKER} after.`)));
    const result = await asDocGate(boot(llm)).runDocGate(
      gateOpts(inputWith(`Intro ${MARKER}`, [entry({ visionAltUk: 'Desk lamp next to a window' })])),
    );
    expect(dom(result.artifact).querySelector('figure img')!.getAttribute('alt')).toBe('desk lamp');
    expect(result.finalIssues.filter(i => i.rule === 'image-caption-not-native')).toHaveLength(1);
  });
});

// ── Legacy HTML path, through the public generateUaContent ───────────────────────────────────────

function slugStub() {
  return {
    site_name: 'Expert-3DPrinter',
    slugs: ['en-US', 'es-MX', 'uk-UA'].map(language => ({ language, name: PRODUCT, slug: `ortur-h20-20w-${language.toLowerCase()}` })),
  };
}
function seoStub() {
  return {
    site_name: 'Expert-3DPrinter',
    seo_data: ['en-US', 'es-MX', 'uk-UA'].map(language => ({
      language, h1: PRODUCT, meta_title: 'Ortur H20 20 W laser engraver',
      meta_description: 'Ortur H20 20 W laser engraver for wood and metal, full specs inside ➔',
    })),
  };
}
function legacyLlm(htmlFor: (call: number) => string) {
  let htmlCalls = 0;
  const generateJson = vi.fn(async (_i: unknown, _t?: boolean, meta?: UsageMeta) => {
    if (meta?.taskLabel === 'Slug') return slugStub();
    if (meta?.taskLabel === 'SEO metadata') return seoStub();
    throw new Error(`unexpected generateJson taskLabel: ${meta?.taskLabel}`);
  });
  const generateText = vi.fn(async (_i: unknown, _t?: boolean, meta?: UsageMeta) => {
    if (meta?.taskLabel === 'HTML (uk-UA)') { htmlCalls += 1; return htmlFor(htmlCalls); }
    return htmlFor(htmlCalls || 1);
  });
  const recordGeneration = vi.fn(async () => {});
  return { generateJson, generateText, recordGeneration, htmlCalls: () => htmlCalls };
}

async function runLegacy(
  html: (call: number) => string, over: Partial<ProductInput> = {},
): Promise<{ o: ContentOrchestratorService; llm: ReturnType<typeof legacyLlm> }> {
  vi.stubGlobal('alert', vi.fn());
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const llm = legacyLlm(html);
  const o = boot(llm as unknown as ReturnType<typeof makeMockLlm>);
  await o.generateUaContent({
    website: EXPERT_US, name: PRODUCT, description: `Intro ${MARKER} text`, specs: '',
    brandFolder: 'acme', modelFolder: 'lamp', imageManifest: [LAMP], ...over,
  });
  return { o, llm };
}

const LEGACY_HTML = `<p>Opening text here ${MARKER} and more text.</p><p class="cta">Order today.</p>`;
const LEGACY_DROPPED = `<p>Opening text here and more text.</p><p class="cta">Order today.</p>`;
// A body <h1> is a blocking error (duplicate-h1) the model cannot be reasoned out of in a mock: it keeps
// the repair gate iterating, which is what the best-attempt test below needs.
const WITH_H1 = (html: string) => `<h1>${PRODUCT}</h1>${html}`;

describe('legacy HTML path — Expert-3DPrinter, relative src (OQ-1, AC-4, FR-7, A-3)', () => {
  it('places a relative-src figure at the marker for Expert-3DPrinter, which has an empty imageBaseUrl', async () => {
    expect(STORE_REGISTRY['Expert-3DPrinter'].imageBaseUrl).toBe('');
    const { o } = await runLegacy(() => LEGACY_HTML);
    const html = o.content().mainHtmlUa;
    expect(html).not.toContain(MARKER);
    const img = dom(html).querySelector('figure img')!;
    expect(img.getAttribute('src')).toBe('acme/lamp/desk-lamp.jpg');
    expect(img.getAttribute('alt')).toBe(LAMP_ALT_UK);
    const figure = img.closest('figure')!;
    expect(figure.querySelector('figcaption b')!.textContent).toBe(LAMP_LABEL_UK);
    expect(collapse(figure.querySelector('figcaption')!.textContent!)).toBe(`${LAMP_LABEL_UK} ${LAMP_DESC_UK}`);
    expect(collapse(figure.previousElementSibling!.textContent ?? '')).toBe('Opening text here');
    expect(collapse(figure.nextElementSibling!.textContent ?? '')).toBe('and more text.');
  });

  it('keeps coverage off for Expert-3DPrinter: an uploaded image with no marker raises no image-manifest rule', async () => {
    const { o } = await runLegacy(() => `<p>Opening text.</p>`, {
      description: 'No marker here.', imageManifest: [LAMP],
    });
    const rules = rulesOf(o.validationIssues());
    expect(rules).not.toContain('image-manifest-missing');
    expect(rules).not.toContain(DROPPED);
  });

  it('removes an unmatched marker with a single non-blocking warning', async () => {
    const { o } = await runLegacy(
      () => `<p>Opening [ghost.jpg] text.</p><p class="cta">Order today.</p>`,
      { description: 'Intro [ghost.jpg]', imageManifest: [] },
    );
    expect(o.content().mainHtmlUa).not.toContain('[ghost.jpg]');
    const w = o.validationIssues().filter(i => i.rule === 'unmatched-image-placeholder');
    expect(w).toHaveLength(1);
    expect(w[0].severity).toBe('warning');
    expect(w[0].detail).toContain('ghost.jpg');
  });
});

describe('legacy HTML path — the FR-21 caption warnings reach the QA report (NFR-9, AC-9 h, i)', () => {
  it('reports one image-caption-not-native warning for a non-native recorded field and ships the Ukrainian fallback figure', async () => {
    const { o } = await runLegacy(() => LEGACY_HTML, { imageManifest: [entry({ visionAltUk: 'English alt only' })] });
    const w = o.validationIssues().filter(i => i.rule === 'image-caption-not-native');
    expect(w).toHaveLength(1);
    expect(w[0].severity).toBe('warning');
    expect(w[0].detail).toContain('desk-lamp.jpg');
    expect(dom(o.content().mainHtmlUa).querySelector('figure img')!.getAttribute('alt')).toBe('desk lamp');
  });

  it('ships the Ukrainian fallbacks without any warning for an entry created before this Story (NFR-12)', async () => {
    const { o } = await runLegacy(() => LEGACY_HTML, { imageManifest: [legacyEntry()] });
    const figure = dom(o.content().mainHtmlUa).querySelector('figure')!;
    expect(figure.querySelector('figcaption b')!.textContent).toBe(FALLBACK_LABEL);
    expect(rulesOf(o.validationIssues()).filter(r => /^image-caption/.test(r))).toEqual([]);
    expect(o.validationIssues().filter(i => i.severity === 'error' && /placeholder|caption/.test(i.rule))).toEqual([]);
  });

  it('the end-append after ladder exhaustion carries the Ukrainian label and alt', async () => {
    const { o } = await runLegacy(() => LEGACY_DROPPED);
    const figure = dom(o.content().mainHtmlUa).querySelector('figure')!;
    expect(figure.querySelector('figcaption b')!.textContent).toBe(LAMP_LABEL_UK);
    expect(figure.querySelector('img')!.getAttribute('alt')).toBe(LAMP_ALT_UK);
  });
});

describe('legacy HTML path — a dropped marker ends in the end-append with one warning (FR-17, FR-18, Risk 11)', () => {
  it('ships one relative-src figure at the end before any trailing JSON-LD, one Ukrainian warning, no error for it', async () => {
    const { o } = await runLegacy(() => LEGACY_DROPPED);
    const html = o.content().mainHtmlUa;
    expect(html).not.toContain(MARKER);
    expect(Array.from(dom(html).querySelectorAll('img')).map(i => i.getAttribute('src'))).toEqual(['acme/lamp/desk-lamp.jpg']);
    expect(html.lastIndexOf('<figure')).toBeGreaterThan(html.indexOf('Order today.'));

    const mine = o.validationIssues().filter(i => i.rule === DROPPED);
    expect(mine).toHaveLength(1);
    expect(mine[0].severity).toBe('warning');
    expect(mine[0].detail).toBe(message(MARKER));
  });

  it('keeps the report of the attempt that actually wins, not the last one produced (N-5)', async () => {
    // Attempt 1 keeps the marker (and carries one blocking error, the body <h1>); every later attempt
    // also drops the marker, so it has strictly more errors. The gate therefore returns attempt 1.
    // A finaliser that read the LAST produce call's report would see a dropped marker, append a
    // second figure and warn about a marker that was in fact placed.
    const { o, llm } = await runLegacy(call => WITH_H1(call === 1 ? LEGACY_HTML : LEGACY_DROPPED));
    expect(llm.htmlCalls()).toBeGreaterThanOrEqual(2); // the ladder really iterated

    const html = o.content().mainHtmlUa;
    const imgs = Array.from(dom(html).querySelectorAll('img'));
    expect(imgs).toHaveLength(1);
    const figure = imgs[0].closest('figure')!;
    expect(collapse(figure.previousElementSibling!.textContent ?? '')).toBe('Opening text here');
    expect(collapse(figure.nextElementSibling!.textContent ?? '')).toBe('and more text.');
    expect(o.validationIssues().filter(i => i.rule === DROPPED)).toEqual([]);
  });
});

describe('numeric grounding of the marker figure through the Ukrainian Vision fields (plan D7, review F-5, FR-21)', () => {
  /**
   * The number 75 appears ONLY in the recorded Ukrainian texts: the legacy English caption and altText carry
   * no number. Before v9 `numericFidelitySources` read only those two, so the figure's own text raised an
   * unrepairable `alt-numeric-not-grounded` (the step places the same deterministic text on every attempt).
   */
  const NUMERIC = entry({
    visionDescription: 'A lamp on a walnut table.',
    altText: 'Lamp on a table',
    visionLabelUk: 'Потужність лампи 75 Вт:',
    visionDescriptionUk: 'Лампа потужністю 75 Вт стоїть на горіховому столі.',
    visionAltUk: 'Лампа на 75 Вт біля вікна',
  });
  const html = LEGACY_HTML;

  it('(a) grounds a legacy-HTML marker figure whose Ukrainian label, description and alt carry a number the source text lacks, for Expert-3DPrinter', async () => {
    const { o } = await runLegacy(() => html, { imageManifest: [NUMERIC] });
    // The figure really is placed with the 75 Вт text (cyrillizeUnits may also render a Latin unit as Вт) ...
    expect(dom(o.content().mainHtmlUa).querySelector('figure figcaption')!.textContent).toMatch(/75\s*(W|Вт)/);
    expect(dom(o.content().mainHtmlUa).querySelector('figure img')!.getAttribute('alt')).toMatch(/75\s*(W|Вт)/);
    // ... and the numeric gate does not reject it, because the recorded Ukrainian Vision texts are sanctioned sources.
    expect(rulesOf(o.validationIssues())).not.toContain('alt-numeric-not-grounded');
  });

  it('(a) on the Doc path: the same number grounded only in the Ukrainian fields passes the numeric gate with no repair', async () => {
    const llm = makeMockLlm();
    llm.generateJson.mockImplementation(async () => structuredClone(docWith(`Before ${MARKER} after.`)));
    const result = await asDocGate(boot(llm)).runDocGate(gateOpts(inputWith(`Intro ${MARKER}`, [NUMERIC])));
    expect(result.artifact).toMatch(/75\s*(W|Вт)/);
    expect(rulesOf(result.finalIssues)).not.toContain('alt-numeric-not-grounded');
    expect(result.repairsUsed).toBe(0);
  });

  it('(b) still rejects an ungrounded number in model-emitted image text (the gate is not disabled)', async () => {
    const bad = `<p>Text.</p><figure><img src="x.jpg" alt="Motor 99 W"><figcaption><b>Photo:</b> Motor 99 W</figcaption></figure>`;
    const { o } = await runLegacy(() => bad, { description: 'No marker.', imageManifest: [NUMERIC] });
    expect(rulesOf(o.validationIssues())).toContain('alt-numeric-not-grounded');
  });

  it('(b) the 75 recorded for one image does not ground a different number in a model-emitted figure on the Doc path', async () => {
    const llm = makeMockLlm();
    llm.generateJson.mockImplementation(async () => structuredClone(docWith('Lead paragraph.', d => {
      d.functionality![0].blocks.push({ kind: 'figure', ref: 0 });
      d.figures = [{ file: 'desk-lamp.jpg', alt: 'Motor 99 W', caption: '<b>Photo:</b> Motor 99 W' }];
    })));
    const result = await asDocGate(boot(llm)).runDocGate(gateOpts(inputWith('No marker here.', [NUMERIC]), { maxRepairs: 0 }));
    expect(rulesOf(result.finalIssues)).toContain('alt-numeric-not-grounded');
  });

  it('(c) keeps a numeric filename-only entry grounded through the marker name in the description', async () => {
    const named = legacyEntry({
      originalFilename: 'lamp-45w.jpg', urlFilename: 'lamp-45w.jpg', visionDescription: '', altText: '',
    });
    const { o } = await runLegacy(
      () => `<p>Opening text here [lamp-45w.jpg] and more text.</p><p class="cta">Order today.</p>`,
      { description: 'Intro [lamp-45w.jpg] text', imageManifest: [named] },
    );
    expect(dom(o.content().mainHtmlUa).querySelector('figure img')!.getAttribute('src')).toBe('acme/lamp/lamp-45w.jpg');
    expect(rulesOf(o.validationIssues())).not.toContain('alt-numeric-not-grounded');
  });
});

// ── generate(): one warning for the whole run, translations inherit the master's figure ───────────

describe('generate() — resolved once in the uk-UA master, inherited by translations (FR-12, A-1, OQ-6)', () => {
  function genLlm(doc: () => ProductDescriptionDoc, manifest: ImageManifestEntry[]) {
    void manifest;
    const generateJson = vi.fn(async (_i: unknown, _t?: boolean, meta?: UsageMeta) => {
      if (meta?.taskLabel === 'Doc (base)') return doc();
      if (meta?.taskLabel === 'Slug') return {
        site_name: 'EXPERT3D',
        slugs: ['en-ES', 'es-ES', 'pt-PT', 'uk-UA'].map(language => ({ language, name: PRODUCT, slug: `ortur-${language.toLowerCase()}` })),
      };
      if (meta?.taskLabel === 'SEO metadata') return {
        site_name: 'EXPERT3D',
        seo_data: ['en-ES', 'es-ES', 'pt-PT', 'uk-UA'].map(language => ({
          language, h1: PRODUCT, meta_title: 'Ortur H20 20 W laser engraver',
          meta_description: 'Ortur H20 20 W laser engraver for wood and metal, full specs inside ➔',
        })),
      };
      throw new Error(`unexpected generateJson taskLabel: ${meta?.taskLabel}`);
    });
    const generateText = vi.fn(async (_i: unknown, _t?: boolean, _m?: UsageMeta) => '<p>Translated stub.</p>');
    return { generateJson, generateText, recordGeneration: vi.fn(async () => {}) };
  }

  async function runGenerate(doc: () => ProductDescriptionDoc, description: string, manifest: ImageManifestEntry[]) {
    vi.stubGlobal('alert', vi.fn());
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const llm = genLlm(doc, manifest);
    const o = boot(llm as unknown as ReturnType<typeof makeMockLlm>);
    o.maxRepairs.set(0);
    await o.generate(inputWith(description, manifest));
    return { o, llm };
  }

  it('hands the translation step a master that already contains the figure and no marker text', async () => {
    const { o, llm } = await runGenerate(() => structuredClone(docWith(`Before ${MARKER} after.`)), `Intro ${MARKER}`, [LAMP]);

    const master = o.content().mainHtmlUa;
    expect(master).not.toContain(MARKER);
    expect(figureSrcs(master)).toEqual([LAMP_URL]);

    const translationCalls = llm.generateText.mock.calls.filter(c => {
      const label = (c[2] as UsageMeta).taskLabel ?? '';
      return label.startsWith('HTML (') && label !== 'HTML (base)';
    });
    expect(translationCalls.length).toBeGreaterThan(0);
    for (const call of translationCalls) {
      const payload = call[0] as PromptPayload;
      expect(payload.userContent).toContain(LAMP_URL);
      expect(payload.userContent).not.toContain(MARKER);
    }
  });

  it('reports an unmatched marker once for the whole run, not once per locale', async () => {
    const { o } = await runGenerate(() => structuredClone(docWith('Alpha [ghost.jpg] beta.')), 'Intro [ghost.jpg]', []);
    const w = o.validationIssues().filter(i => i.rule === 'unmatched-image-placeholder');
    expect(w).toHaveLength(1);
    expect(w[0].severity).toBe('warning');
    // The master gate of generate() is labelled 'HTML (base)'; the master locale is uk-UA (OQ-6).
    expect(w[0].context).toBe('HTML (base)');
  });
});

/**
 * US-2.2 T12 — the orchestrator honours the selected simplified template on both generation paths,
 * wires the completeness / range / shape gates into the Doc gate, and leaves the FAQ artifact step
 * data-driven.
 *
 * FR-3..FR-5, FR-7, FR-8, FR-9, FR-11, FR-14, FR-16, FR-19 (wiring), and the human's resolution of R6:
 * the FAQ artifact (Step 5) is DATA-driven, not template-driven — it runs for ANY template, simplified
 * or Full, if and only if FAQ source materials (supplemental content) were provided, for every store
 * language (and for uk-UA in UA-only mode); otherwise it is skipped.
 *
 * DI, NOT TestBed — see content-orchestrator.ua-doc-pipeline.spec.ts. The LLM is stubbed at the
 * boundary; the orchestrator, gate, renderer and validators are real.
 */
import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Injector } from '@angular/core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ContentOrchestratorService } from './content-orchestrator.service';
import { LlmService } from './llm.service';
import { RetrievalService } from './retrieval.service';
import { HistoryService } from './history.service';
import type { ProductInput } from '../app/types';
import type { PromptPayload, UsageMeta } from '../prompt-core/payload';
import { STORE_REGISTRY } from '../prompt-core/constants';
import { buildPromptADoc, TASK_A_DOC_INSTRUCTION } from '../prompts/task-a-doc';
import { buildPromptA } from '../prompts/task-a';
import { renderDescription } from '../render/render-description';
import {
  filamentsDoc, accessoriesDoc, sparePartsDoc, without,
} from '../../test/fixtures/simplified-docs';
import { paragraphMentions, addedLines } from '../../test/fixtures/prompt-clauses';

// generate() reports a failed run through window.alert(), which happy-dom leaves unimplemented.
beforeEach(() => { vi.stubGlobal('alert', vi.fn()); });
afterEach(() => { vi.unstubAllGlobals(); });

// ── harness ──────────────────────────────────────────────────────────────────────────────────────

const NAME = 'eSUN PLA+';
const SPECS_UA = '| Параметр | Значення |\n|---|---|\n| Діаметр 1 | 1,75 мм |\n| Вага 1 | 1 кг |\n| Температура 1 | 200 °C |';
const FAQ_HTML = '<h3>Чи потрібен підігрів столу?</h3><p>Так, рекомендовано.</p>';
const STUB_HTML = '<p>Опис продукту для тесту.</p>';
const EXPERT3D_CORPUS_DOC = JSON.parse(
  readFileSync(join(process.cwd(), 'test', 'fixtures', 'corpus', 'expert3d-ortur-h20-20w.doc.json'), 'utf8'),
);

const EXPERT3D = { name: 'EXPERT3D', group: 'ES', url: 'impresora-3d.es' } as const;
const LEGACY = { name: 'Expert-3DPrinter', group: 'US', url: 'expert-3dprinter.com' } as const;

function input(over: Partial<ProductInput> = {}, site: ProductInput['website'] = EXPERT3D): ProductInput {
  return { website: site, name: NAME, description: '', specs: '', brandFolder: 'esun', modelFolder: 'pla-plus', ...over };
}

interface Harness {
  orchestrator: ContentOrchestratorService;
  json: ReturnType<typeof vi.fn>;
  text: ReturnType<typeof vi.fn>;
  jsonCalls: (label: string) => Array<{ payload: PromptPayload; meta: UsageMeta }>;
  textCalls: (test: (label: string) => boolean) => Array<{ payload: PromptPayload; meta: UsageMeta }>;
}

/**
 * @param docs   what `Doc (base)` / `Doc (uk-UA)` returns on the 1st, 2nd, … call (last repeats)
 * @param htmls  what `HTML (base)` returns on the 1st, 2nd, … call (legacy path; last repeats)
 */
function harness(site: ProductInput['website'], docs: unknown[] = [], htmls: string[] = [STUB_HTML]): Harness {
  const langs = STORE_REGISTRY[site.name].languages;
  let docN = 0;
  let htmlN = 0;
  const json = vi.fn(async (_p: PromptPayload, _t?: boolean, meta?: UsageMeta): Promise<unknown> => {
    if (meta?.taskLabel === 'Doc (base)' || meta?.taskLabel === 'Doc (uk-UA)') {
      return structuredClone(docs[Math.min(docN++, docs.length - 1)]);
    }
    if (meta?.taskLabel === 'Slug') {
      return { site_name: site.name, slugs: langs.map(language => ({ language, name: NAME, slug: `esun-pla-${language.toLowerCase()}` })) };
    }
    if (meta?.taskLabel === 'SEO metadata') {
      return {
        site_name: site.name,
        seo_data: langs.map(language => ({
          language, h1: NAME, meta_title: `${NAME} filament`,
          meta_description: `${NAME} filament for reliable printing, full specs inside ➔`,
        })),
      };
    }
    throw new Error(`unexpected generateJson taskLabel: ${meta?.taskLabel}`);
  });
  const text = vi.fn(async (_p: PromptPayload, _t?: boolean, meta?: UsageMeta): Promise<string> => {
    if (meta?.taskLabel?.startsWith('FAQ (')) return FAQ_HTML;
    if (meta?.taskLabel === 'HTML (base)') return htmls[Math.min(htmlN++, htmls.length - 1)];
    return STUB_HTML;
  });
  const llm = { generateJson: json, generateText: text, recordGeneration: vi.fn(async () => {}) };
  const injector = Injector.create({
    providers: [
      ContentOrchestratorService,
      { provide: LlmService, useValue: llm },
      { provide: RetrievalService, useValue: {} },
      { provide: HistoryService, useValue: { add: vi.fn() } },
    ],
  });
  const orchestrator = injector.get(ContentOrchestratorService);
  return {
    orchestrator, json, text,
    jsonCalls: label => json.mock.calls.filter(c => (c[2] as UsageMeta)?.taskLabel === label)
      .map(c => ({ payload: c[0] as PromptPayload, meta: c[2] as UsageMeta })),
    textCalls: test => text.mock.calls.filter(c => test(((c[2] as UsageMeta)?.taskLabel) ?? ''))
      .map(c => ({ payload: c[0] as PromptPayload, meta: c[2] as UsageMeta })),
  };
}

const perRun = (p: PromptPayload, base: PromptPayload) =>
  `${p.systemBlocks[1]?.text ?? ''}\n${addedLines(base.userContent, p.userContent)}`;
const reqd = (t: string) => paragraphMentions(t).requested;
const flatSectionOf = (html: string) => new DOMParser().parseFromString(html, 'text/html').querySelector('section.specs');

// ── FR-7 + FR-3..FR-5: the Doc pipeline carries the template ─────────────────────────────────────

describe('generate() on a Doc-pipeline store — the selected template reaches the prompt (FR-7)', () => {
  it('Spare parts: the master is requested as a Doc with paragraphs 1, 5, 8 only, and renders no specs section', async () => {
    const h = harness(EXPERT3D, [sparePartsDoc()]);
    h.orchestrator.maxRepairs.set(0);
    await h.orchestrator.generate(input({ templateId: 'spare-parts' }));

    const [call] = h.jsonCalls('Doc (base)');
    expect(call, 'Doc (base) was never requested').toBeDefined();
    const base = buildPromptADoc(input(), 'Ukrainian (uk-UA)');
    const m = paragraphMentions(perRun(call.payload, base));
    for (const n of [1, 5, 8]) expect(m.requested.has(n), `§${n}`).toBe(true);
    for (const n of [2, 3, 4, 6, 7, 9]) expect(m.requested.has(n), `§${n}`).toBe(false);
    expect(h.textCalls(l => l === 'HTML (base)')).toHaveLength(0);

    const html = h.orchestrator.content().mainHtmlUa;
    expect(html).toContain('<p class="cta">');
    expect(html).not.toContain('<table');
    expect(html).not.toContain('<section');
    expect(html).not.toMatch(/<h1[\s>]/);
  });

  it('Filaments with non-empty specs: prompt asks for §7; the render has ONE <tbody>, no <h3> anywhere', async () => {
    const h = harness(EXPERT3D, [filamentsDoc()]);
    h.orchestrator.maxRepairs.set(0);
    await h.orchestrator.generate(input({ templateId: 'filaments-resins-powders', specs: SPECS_UA }));

    const base = buildPromptADoc(input({ specs: SPECS_UA }), 'Ukrainian (uk-UA)');
    const m = reqd(perRun(h.jsonCalls('Doc (base)')[0].payload, base));
    for (const n of [1, 2, 4, 5, 7, 8]) expect(m.has(n), `§${n}`).toBe(true);
    for (const n of [3, 6, 9]) expect(m.has(n), `§${n}`).toBe(false);

    const html = h.orchestrator.content().mainHtmlUa;
    const section = flatSectionOf(html);
    expect(section).not.toBeNull();
    expect(section!.querySelectorAll('tbody')).toHaveLength(1);
    expect(section!.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(html).not.toMatch(/<h3[\s>]/);
  });

  it('Filaments with EMPTY specs: the per-run prompt omits §7 and the render has no specs table or heading (AC-15)', async () => {
    const h = harness(EXPERT3D, [without(filamentsDoc(), 'specs')]);
    h.orchestrator.maxRepairs.set(0);
    await h.orchestrator.generate(input({ templateId: 'filaments-resins-powders', specs: '' }));

    const base = buildPromptADoc(input(), 'Ukrainian (uk-UA)');
    const added = addedLines(base.userContent, h.jsonCalls('Doc (base)')[0].payload.userContent);
    expect(paragraphMentions(added).negated.has(7)).toBe(true);
    const html = h.orchestrator.content().mainHtmlUa;
    expect(html).not.toContain('<table');
    expect(html).not.toContain('Технічні характеристики');
  });

  it.each([[true, 'checked'], [false, 'unchecked']] as const)(
    'Accessories with the checkbox %s (%s): the flag reaches the prompt (AC-9)', async (flag, _state) => {
      const h = harness(EXPERT3D, [accessoriesDoc({ withFunctionality: flag })]);
      h.orchestrator.maxRepairs.set(0);
      await h.orchestrator.generate(input({ templateId: 'accessories', includeFunctionality: flag }));
      const base = buildPromptADoc(input(), 'Ukrainian (uk-UA)');
      const added = addedLines(base.userContent, h.jsonCalls('Doc (base)')[0].payload.userContent);
      expect(paragraphMentions(added).requested.has(3)).toBe(flag);
      const whole = reqd(perRun(h.jsonCalls('Doc (base)')[0].payload, base));
      for (const n of [1, 2, 5, 7, 8]) expect(whole.has(n), `§${n}`).toBe(true);
      expect(whole.has(4), '§4 must not be requested for Accessories').toBe(false);
      // rendered §3 heading appears only when the checkbox produced a §3
      if (flag) expect(h.orchestrator.content().mainHtmlUa).toContain('Як працює аксесуар');
      else expect(h.orchestrator.content().mainHtmlUa).not.toContain('Як працює аксесуар');
    });

  it('Full description (no templateId) requests the unchanged Full task block', async () => {
    const h = harness(EXPERT3D, [EXPERT3D_CORPUS_DOC]);
    h.orchestrator.maxRepairs.set(0);
    await h.orchestrator.generate(input({ name: 'Ortur H20 20 W', brandFolder: 'ortur', modelFolder: 'h20/h20-20w' }));
    expect(h.jsonCalls('Doc (base)')[0].payload.systemBlocks[1].text).toBe(TASK_A_DOC_INSTRUCTION);
  });
});

// ── FR-8 / FR-14 / FR-16: the Doc gate enforces the rules through the standard repair loop ──────

describe('the Doc gate runs completeness, shape and range checks and reaches the standard repair loop', () => {
  const feedbackOf = (h: Harness, n: number) => h.jsonCalls('Doc (base)')[n].payload;
  const allText = (p: PromptPayload) => `${p.systemBlocks.map(b => b.text).join('\n')}\n${p.userContent}`;

  it('FR-8: a two-category simplified §7 triggers a retry naming "exactly one category"; the accepted render is flat', async () => {
    const h = harness(EXPERT3D, [filamentsDoc({ specCategories: 2 }), filamentsDoc()]);
    h.orchestrator.maxRepairs.set(2);
    await h.orchestrator.generate(input({ templateId: 'filaments-resins-powders', specs: SPECS_UA }));

    expect(h.jsonCalls('Doc (base)').length).toBeGreaterThanOrEqual(2);
    expect(allText(feedbackOf(h, 1))).toMatch(/exactly one category/i);
    const section = flatSectionOf(h.orchestrator.content().mainHtmlUa);
    expect(section!.querySelectorAll('tbody')).toHaveLength(1);
    expect(section!.querySelectorAll('h3')).toHaveLength(0);
  });

  it('FR-14: a 120-word hook triggers a retry that states the 40–85 range; the corrected document is accepted', async () => {
    const h = harness(EXPERT3D, [sparePartsDoc({ hook: 120 }), sparePartsDoc()]);
    h.orchestrator.maxRepairs.set(2);
    await h.orchestrator.generate(input({ templateId: 'spare-parts' }));

    expect(h.jsonCalls('Doc (base)').length).toBeGreaterThanOrEqual(2);
    // Only what the retry ADDED to the first prompt: the base instruction itself already says 40–85.
    const fb = addedLines(allText(feedbackOf(h, 0)), allText(feedbackOf(h, 1))).replace(/\s*[–—-]\s*/g, '-');
    expect(fb).toMatch(/85/);
    expect(fb).toMatch(/hook/i);
  });

  it('FR-16: a >5500-character narrative with every paragraph in range is NOT retried', async () => {
    const big = filamentsDoc({ hook: 80, block2: 280, applications: 240, compat: 95, cta: 95 });
    const h = harness(EXPERT3D, [big]);
    h.orchestrator.maxRepairs.set(2);
    await h.orchestrator.generate(input({ templateId: 'filaments-resins-powders', specs: SPECS_UA }));
    expect(h.jsonCalls('Doc (base)')).toHaveLength(1);
  });

  it('a simplified document missing a required paragraph (§4 for Filaments) is retried', async () => {
    const h = harness(EXPERT3D, [without(filamentsDoc(), 'applications'), filamentsDoc()]);
    h.orchestrator.maxRepairs.set(2);
    await h.orchestrator.generate(input({ templateId: 'filaments-resins-powders', specs: SPECS_UA }));
    expect(h.jsonCalls('Doc (base)').length).toBeGreaterThanOrEqual(2);
    const fb = addedLines(allText(feedbackOf(h, 0)), allText(feedbackOf(h, 1)));
    expect(fb).toMatch(/applications/);
    expect(fb, 'Filaments does not require §3, so the retry must not demand it').not.toMatch(/functionality/);
  });

  it('R2 regression guard: a FULL description missing §3 is still retried (the widened schema must not let it through)', async () => {
    const h = harness(EXPERT3D, [without(EXPERT3D_CORPUS_DOC, 'functionality'), EXPERT3D_CORPUS_DOC]);
    h.orchestrator.maxRepairs.set(2);
    await h.orchestrator.generate(input({ name: 'Ortur H20 20 W', brandFolder: 'ortur', modelFolder: 'h20/h20-20w' }));
    expect(h.jsonCalls('Doc (base)').length).toBeGreaterThanOrEqual(2);
    expect(allText(feedbackOf(h, 1))).toMatch(/functionality/);
  });
});

// ── FR-7 legacy path ─────────────────────────────────────────────────────────────────────────────

describe('generate() on the legacy HTML path (Expert-3DPrinter) honours the template too (FR-7)', () => {
  it('Spare parts: HTML is requested as text (not a Doc) and the overlay asks for 1, 5, 8 only', async () => {
    const h = harness(LEGACY, [], [STUB_HTML]);
    h.orchestrator.maxRepairs.set(0);
    await h.orchestrator.generate(input({ templateId: 'spare-parts' }, LEGACY));

    expect(h.jsonCalls('Doc (base)')).toHaveLength(0);
    const [call] = h.textCalls(l => l === 'HTML (base)');
    expect(call).toBeDefined();
    const base = buildPromptA(input({}, LEGACY), 'Ukrainian (uk-UA)');
    const m = paragraphMentions(addedLines(base.userContent, call.payload.userContent));
    for (const n of [1, 5, 8]) expect(m.requested.has(n), `§${n}`).toBe(true);
    for (const n of [2, 3, 4, 6, 7, 9]) expect(m.requested.has(n), `§${n}`).toBe(false);
  });

  it('Accessories: the checkbox flag reaches the legacy prompt', async () => {
    for (const flag of [true, false]) {
      const h = harness(LEGACY, [], [STUB_HTML]);
      h.orchestrator.maxRepairs.set(0);
      await h.orchestrator.generate(input({ templateId: 'accessories', includeFunctionality: flag }, LEGACY));
      const base = buildPromptA(input({}, LEGACY), 'Ukrainian (uk-UA)');
      const added = addedLines(base.userContent, h.textCalls(l => l === 'HTML (base)')[0].payload.userContent);
      expect(paragraphMentions(added).requested.has(3), `flag ${flag}`).toBe(flag);
    }
  });

  it('FR-14 on the legacy path: an out-of-range hook in the model HTML triggers a retry; the in-range HTML is accepted', async () => {
    const CTX = { imageBaseUrl: 'https://impresora-3d.es/image/catalog/products/', storeName: 'EXPERT3D' };
    const bad = renderDescription(filamentsDoc({ hook: 120 }), CTX, { flatSpecs: true });
    const good = renderDescription(filamentsDoc(), CTX, { flatSpecs: true });
    const h = harness(LEGACY, [], [bad, good]);
    h.orchestrator.maxRepairs.set(2);
    await h.orchestrator.generate(input({ templateId: 'filaments-resins-powders', specs: '' }, LEGACY));
    expect(h.textCalls(l => l === 'HTML (base)').length).toBeGreaterThanOrEqual(2);
  });
});

// ── FR-19 wiring ─────────────────────────────────────────────────────────────────────────────────

describe('FR-19 wiring — every translation call carries the preserve-omissions clause for a simplified template', () => {
  it('Spare parts on a Doc store: each non-master HTML translation request tells the model not to add omitted paragraphs', async () => {
    const h = harness(EXPERT3D, [sparePartsDoc()]);
    h.orchestrator.maxRepairs.set(0);
    await h.orchestrator.generate(input({ templateId: 'spare-parts' }));

    const translations = h.textCalls(l => l.startsWith('HTML (') && l !== 'HTML (base)');
    expect(translations.length).toBeGreaterThanOrEqual(1);
    for (const t of translations) {
      const all = `${t.payload.systemBlocks.map(b => b.text).join('\n')}\n${t.payload.userContent}`;
      expect(all, t.meta.taskLabel).toMatch(/(do not|don't|never|must not)\b[^.]{0,80}\b(add|invent|re-?add|expand|restore)/i);
    }
  });
});

// ── R6: the FAQ artifact is data-driven, not template-driven ────────────────────────────────────

describe('R6 (human resolution) — FAQ artifact: data-driven, all store languages, any template', () => {
  const langs = STORE_REGISTRY.EXPERT3D.languages;
  const faqLabels = (h: Harness) => h.textCalls(l => l.startsWith('FAQ (')).map(c => c.meta.taskLabel).sort();
  const expectedLabels = langs.map(l => `FAQ (${l})`).sort();

  const TEMPLATE_RUNS: Array<[string, Partial<ProductInput>, unknown]> = [
    ['Filaments/resins/powders', { templateId: 'filaments-resins-powders' }, without(filamentsDoc(), 'specs')],
    ['Accessories', { templateId: 'accessories' }, without(accessoriesDoc(), 'specs')],
    ['Spare parts', { templateId: 'spare-parts' }, sparePartsDoc()],
    ['Full description', { name: 'Ortur H20 20 W', brandFolder: 'ortur', modelFolder: 'h20/h20-20w' }, EXPERT3D_CORPUS_DOC],
  ];

  for (const [label, extra, doc] of TEMPLATE_RUNS) {
    it(`${label} + FAQ source materials: an FAQ artifact is generated for EVERY store language`, async () => {
      const h = harness(EXPERT3D, [doc]);
      h.orchestrator.maxRepairs.set(0);
      await h.orchestrator.generate(input({ ...extra, supplementalContent: 'Q: does it need a heated bed? A: yes, 60 °C.' }));
      expect(faqLabels(h)).toEqual(expectedLabels);
      expect(Object.keys(h.orchestrator.content().faqArtifacts ?? {}).sort()).toEqual([...langs].sort());
      for (const html of Object.values(h.orchestrator.content().faqArtifacts ?? {})) expect(html.startsWith('<')).toBe(true);
    });

    it(`${label} + NO FAQ source materials: the FAQ step is skipped`, async () => {
      const h = harness(EXPERT3D, [doc]);
      h.orchestrator.maxRepairs.set(0);
      await h.orchestrator.generate(input({ ...extra, supplementalContent: undefined }));
      expect(h.orchestrator.content().mainHtmlUa.length, 'the run must have completed').toBeGreaterThan(0);
      expect(faqLabels(h)).toEqual([]);
      expect(h.orchestrator.content().faqArtifacts ?? {}).toEqual({});
    });
  }

  it('whitespace-only supplemental content counts as "not provided"', async () => {
    const h = harness(EXPERT3D, [sparePartsDoc()]);
    h.orchestrator.maxRepairs.set(0);
    await h.orchestrator.generate(input({ templateId: 'spare-parts', supplementalContent: '  \n\t ' }));
    expect(h.orchestrator.content().mainHtmlUa.length, 'the run must have completed').toBeGreaterThan(0);
    expect(faqLabels(h)).toEqual([]);
  });

  it('the FAQ request does not depend on the template: same input, same FAQ prompt (simplified vs Full)', async () => {
    const simp = harness(EXPERT3D, [sparePartsDoc()]);
    simp.orchestrator.maxRepairs.set(0);
    await simp.orchestrator.generate(input({ templateId: 'spare-parts', supplementalContent: 'Faq material.' }));
    const full = harness(EXPERT3D, [EXPERT3D_CORPUS_DOC]);
    full.orchestrator.maxRepairs.set(0);
    await full.orchestrator.generate(input({ supplementalContent: 'Faq material.' }));
    const p = (h: Harness) => h.textCalls(l => l === 'FAQ (uk-UA)')[0].payload;
    expect(p(simp).systemBlocks).toEqual(p(full).systemBlocks);
    expect(p(simp).userContent).toBe(p(full).userContent);
    // and it ran exactly once per run, since FAQ source material was provided
    expect(simp.textCalls(l => l === 'FAQ (uk-UA)').length).toBe(1);
    expect(full.textCalls(l => l === 'FAQ (uk-UA)').length).toBe(1);
  });

  it('the description never carries the FAQ (§9 stays with Full description): the simplified render has no FAQ heading', async () => {
    const h = harness(EXPERT3D, [sparePartsDoc()]);
    h.orchestrator.maxRepairs.set(0);
    await h.orchestrator.generate(input({ templateId: 'spare-parts', supplementalContent: 'Faq material.' }));
    expect(h.orchestrator.content().mainHtmlUa.length, 'the run must have completed').toBeGreaterThan(0);
    expect(h.orchestrator.content().mainHtmlUa).not.toMatch(/FAQ|Поширені запитання|Питання та відповіді/i);
  });

  describe('UA-only mode (generateUaContent)', () => {
    it('with FAQ source materials: exactly one uk-UA FAQ artifact, for a simplified template', async () => {
      const h = harness(EXPERT3D, [sparePartsDoc()]);
      h.orchestrator.maxRepairs.set(0);
      await h.orchestrator.generateUaContent(input({ templateId: 'spare-parts', supplementalContent: 'Faq material.' }));
      expect(faqLabels(h)).toEqual(['FAQ (uk-UA)']);
      expect(Object.keys(h.orchestrator.content().faqArtifacts ?? {})).toEqual(['uk-UA']);
    });
    it('without FAQ source materials: skipped, for a simplified template', async () => {
      const h = harness(EXPERT3D, [sparePartsDoc()]);
      h.orchestrator.maxRepairs.set(0);
      await h.orchestrator.generateUaContent(input({ templateId: 'spare-parts' }));
      expect(h.orchestrator.content().mainHtmlUa.length, 'the run must have completed').toBeGreaterThan(0);
      expect(faqLabels(h)).toEqual([]);
    });
    it('a simplified UA-only run is requested as a Doc with the template applied', async () => {
      const h = harness(EXPERT3D, [sparePartsDoc()]);
      h.orchestrator.maxRepairs.set(0);
      await h.orchestrator.generateUaContent(input({ templateId: 'spare-parts' }));
      const [call] = h.jsonCalls('Doc (uk-UA)');
      expect(call).toBeDefined();
      const m = paragraphMentions(call.payload.systemBlocks[1].text);
      expect(m.requested.has(2)).toBe(false);
      expect(m.requested.has(8)).toBe(true);
    });
  });
});

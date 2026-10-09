/**
 * test/fixtures/protected-name.ts — shared fixtures for the US-7.1 orchestrator specs
 * (content-orchestrator.protected-name-wiring / -repair-gate / -validation .spec.ts).
 *
 * Test helpers only; no production code imports this file. It reuses the repository's DI pattern
 * (`Injector.create`, never TestBed — see content-orchestrator.ua-doc-pipeline.spec.ts) and the
 * hand-verified corpus Doc, so no description fixture is invented here.
 *
 * STORES ARE NEVER NAMED in a test body: callers iterate `registryStores()` and derive each store's
 * group, locales and brands from STORE_REGISTRY (AC-4, NFR-4).
 */
import '@angular/compiler';
import { vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injector } from '@angular/core';
import { ContentOrchestratorService } from '../../src/services/content-orchestrator.service';
import { LlmService } from '../../src/services/llm.service';
import { RetrievalService } from '../../src/services/retrieval.service';
import { HistoryService } from '../../src/services/history.service';
import { STORE_REGISTRY, getLangsForStore } from '../../src/prompt-core/constants';
import type { ProductInput, SeoResponse, SlugResponse } from '../../src/app/types';
import type { PromptPayload, UsageMeta } from '../../src/prompt-core/payload';

/** Fixture A (Specification Definitions): the typed name of the reported bug. */
export const FIXTURE_A = 'Formlabs Form Studio 1 Resin Tank Pro';
/** Fixture C: a generic name. Stays on today's localization behaviour. */
export const FIXTURE_C = 'Hardened Steel Nozzle 0.4 mm';
/** The literal shared by the static precedence clause (T8) and the dynamic block (T6). */
export const PROTECTED_MARKER = '[PROTECTED PRODUCT NAME]';

export const PART1 = 'product-name-token-missing';
export const PART2 = 'product-name-shortened-form';
export const FR5_RULES: readonly string[] = [PART1, PART2];

/** Every STORE_REGISTRY key, in registry order. The only way specs obtain a store. */
export const registryStores = (): string[] => Object.keys(STORE_REGISTRY);

export function productInput(storeName: string, name: string, extra: Partial<ProductInput> = {}): ProductInput {
  const profile = STORE_REGISTRY[storeName];
  return {
    website: { name: storeName, group: profile.group, url: 'https://example.invalid' },
    name,
    description: '',
    specs: '',
    // Only consulted by stores on the Doc pipeline; harmless for the others.
    brandFolder: 'ortur',
    modelFolder: 'h20/h20-20w',
    ...extra,
  };
}

/** A localized category noun placed in front of the typed name (allowed by FR-2). */
export const LONG_CATEGORY = 'Резервуар для смоли';   // 19 chars -> category + Fixture A = 57 code points
export const SHORT_CATEGORY = 'Бак';                   // 3 chars  -> 41 code points
const isEnglish = (lang: string) => lang.toLowerCase().startsWith('en-');

/** Slugs the model "returns": every locale carries the typed name whole; non-English add a category. */
export function compliantSlugs(storeName: string, typed: string, category = LONG_CATEGORY): SlugResponse {
  return {
    site_name: storeName,
    slugs: getLangsForStore(storeName).seoLangs.map(language => ({
      language,
      name: isEnglish(language) ? typed : `${category} ${typed}`,
      slug: 'ignored-recomputed-by-the-pipeline',
    })),
  };
}

/** The observed bug: "Resin Tank" gone from every non-English name. */
export function shortenedSlugs(storeName: string): SlugResponse {
  return {
    site_name: storeName,
    slugs: getLangsForStore(storeName).seoLangs.map(language => ({
      language,
      name: isEnglish(language)
        ? 'Formlabs Form Studio 1 Pro'
        : `${LONG_CATEGORY} Formlabs Form Studio 1 Pro`,
      slug: 'ignored-recomputed-by-the-pipeline',
    })),
  };
}

/** SEO Meta that satisfies FR-4 for the typed name: h1 and meta_title carry it whole, title <= 55. */
export function compliantSeo(storeName: string, typed: string, storeLabel = storeName): SeoResponse {
  return {
    site_name: storeName,
    seo_data: getLangsForStore(storeName).seoLangs.map(language => ({
      language,
      h1: typed,
      meta_title: `${typed} - ${storeLabel}`.slice(0, 55),
      meta_description: 'Full details, specifications and fast delivery, order today ➔',
    })),
  };
}

/** SEO Meta built on the SHORTENED name. h1 and meta_title share a prefix, so today's
 *  meta-title-template-shape accepts it — the blind spot AC-8 closes. */
export function shortenedSeo(storeName: string, storeLabel = storeName): SeoResponse {
  const short = 'Formlabs Form Studio 1 Pro';
  return {
    site_name: storeName,
    seo_data: getLangsForStore(storeName).seoLangs.map(language => ({
      language,
      h1: short,
      meta_title: `${short} - ${storeLabel}`,
      meta_description: 'Full details on the Form Studio 1 Pro, fast delivery, order today ➔',
    })),
  };
}

export interface CapturedCall { kind: 'json' | 'text'; label: string; payload: PromptPayload }

export interface MockLlm {
  generateJson: ReturnType<typeof vi.fn>;
  generateText: ReturnType<typeof vi.fn>;
  recordGeneration: ReturnType<typeof vi.fn>;
  calls: CapturedCall[];
  callsFor(label: string | RegExp): CapturedCall[];
}

/** The hand-verified corpus Doc, also used by render-reconciliation.spec.ts and ua-doc-pipeline. */
const CORPUS_DOC = JSON.parse(
  readFileSync(join(process.cwd(), 'test', 'fixtures', 'corpus', 'expert3d-ortur-h20-20w.doc.json'), 'utf8'),
);

/**
 * A routing mock. `json[label]` / `text[label]` may be a value or a function of the call index; an
 * unrouted JSON label throws (so a surprise call is loud). Every call's payload is captured.
 */
export function makeMockLlm(routes: {
  json?: Record<string, unknown | ((n: number, payload: PromptPayload, label: string) => unknown)>;
  text?: Record<string, string | ((n: number, payload: PromptPayload, label: string) => string)>;
  defaultText?: string;
} = {}): MockLlm {
  const calls: CapturedCall[] = [];
  const seen = new Map<string, number>();
  const nth = (key: string) => { const n = (seen.get(key) ?? 0) + 1; seen.set(key, n); return n; };
  const pick = <T>(table: Record<string, any> | undefined, label: string): ((n: number, p: PromptPayload, l: string) => T) | undefined => {
    const key = table && Object.keys(table).find(k => label === k || label.startsWith(`${k}`));
    if (!key) return undefined;
    const v = table![key];
    return typeof v === 'function' ? v : () => v;
  };

  const generateJson = vi.fn(async (payload: PromptPayload, _thinking?: boolean, meta?: UsageMeta): Promise<unknown> => {
    const label = meta?.taskLabel ?? '?';
    calls.push({ kind: 'json', label, payload });
    const fn = pick<unknown>(routes.json, label);
    if (!fn) throw new Error(`unrouted generateJson label: ${label}`);
    const out = fn(nth(`json:${label}`), payload, label);
    if (out instanceof Error) throw out;
    return structuredClone(out);
  });
  const generateText = vi.fn(async (payload: PromptPayload, _thinking?: boolean, meta?: UsageMeta): Promise<string> => {
    const label = meta?.taskLabel ?? '?';
    calls.push({ kind: 'text', label, payload });
    const fn = pick<string>(routes.text, label);
    if (fn) return fn(nth(`text:${label}`), payload, label);
    // Repair calls (field / block scoped) get an EMPTY answer: the gate treats it as unusable and moves
    // on, so a repair rung can never write placeholder markup into a Doc field. Only a translation or
    // master HTML request gets the default document text.
    if (/^HTML \(/.test(label) && !/repair/i.test(label)) return routes.defaultText ?? '<p>placeholder</p>';
    return '';
  });
  const recordGeneration = vi.fn(async () => {});
  return {
    generateJson, generateText, recordGeneration, calls,
    callsFor: (label) => calls.filter(c => typeof label === 'string' ? c.label === label : label.test(c.label)),
  };
}

export function bootOrchestrator(mock: MockLlm): ContentOrchestratorService {
  const injector = Injector.create({
    providers: [
      ContentOrchestratorService,
      { provide: LlmService, useValue: mock },
      { provide: RetrievalService, useValue: {} },
      { provide: HistoryService, useValue: { add: vi.fn() } },
    ],
  });
  return injector.get(ContentOrchestratorService);
}

/**
 * Routes sufficient for generate()/generateUaContent() to reach every prompt builder on ANY registry
 * store. `descriptionSentence`, when given, is placed into the generated description (the Doc's hook for
 * Doc-pipeline stores, the HTML body for the HTML path and for every Task C translation), so a spec can
 * run the same pipeline once with the altered name and once with the full name and compare.
 *
 * Repair requests (field / block scoped) are answered with an empty string on purpose: the gate treats
 * that as unusable and moves on, so a repair rung can never write placeholder markup into a Doc field.
 */
export function pipelineRoutes(storeName: string, typed: string, opts: { category?: string; descriptionSentence?: string } = {}) {
  const sentence = opts.descriptionSentence ?? 'placeholder';
  const doc = structuredClone(CORPUS_DOC);
  if (opts.descriptionSentence) doc.hook = `${opts.descriptionSentence} ${doc.hook}`;
  const html = (_n: number, _p: PromptPayload, label: string) => (/repair/i.test(label) ? '' : `<p>${sentence}</p>`);
  return {
    json: {
      'Doc': () => doc,
      'Slug': () => compliantSlugs(storeName, typed, opts.category),
      'SEO metadata': () => compliantSeo(storeName, typed),
    },
    text: { 'HTML (': html } as Record<string, (n: number, p: PromptPayload, label: string) => string>,
  };
}

/** happy-dom's alert() is unimplemented; withProgress calls it on a thrown error. Stub it. */
export function stubBrowserGlobals(): void {
  vi.stubGlobal('alert', vi.fn());
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
}

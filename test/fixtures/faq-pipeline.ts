/**
 * test/fixtures/faq-pipeline.ts — shared fixtures for the US-8.1 orchestrator specs
 * (content-orchestrator.faq-pipeline.spec.ts and content-orchestrator.faq-standalone.spec.ts). The rewritten R6
 * block of content-orchestrator.simplified.spec.ts does NOT use it: it keeps that file's own harness.
 *
 * Test helpers only; no production code imports this file. IMPORT DISCIPLINE (task breakdown constraint
 * 1a, enforced by the per-task compile gate): this file is not a spec, so a single missing-symbol import
 * here would break `tsc` at every task. It therefore imports ONLY symbols that exist before T1: the
 * orchestrator class, the prompt builders that exist today, and the US-7.1 `protected-name` fixtures.
 * Nothing here names `faq-gate`, `faq-html`, `generateFaqOnly` or the `contentKind` option; the FAQ
 * pipeline is driven only through the public `generate()` / `generateUaContent()` methods and observed
 * only through the stubbed `LlmService` boundary and the service's public signals.
 *
 * HOW A CALL IS CLASSIFIED. The label of a FAQ translation call is the implementation's to choose
 * (plan D5 names `FAQ translation (iso)`; the Specification only requires that it is not a generation
 * call), so nothing here depends on that exact string:
 *   - a FAQ GENERATION call is identified by its PAYLOAD: its first system block is the FAQ prompt's;
 *   - a FAQ TRANSLATION call is a text call whose label starts with "FAQ" and which is not a generation
 *     call (`Block repair — ...` labels start with "Block" and are neither).
 * The language of either is read from the parenthesised ISO code at the end of its label.
 */
import '@angular/compiler';
import { vi } from 'vitest';
import { Injector } from '@angular/core';
import { ContentOrchestratorService } from '../../src/services/content-orchestrator.service';
import { LlmService } from '../../src/services/llm.service';
import { RetrievalService } from '../../src/services/retrieval.service';
import { HistoryService } from '../../src/services/history.service';
import { MASTER_LOCALE, STORE_REGISTRY } from '../../src/prompt-core/constants';
import { buildPromptFaq } from '../../src/prompts/task-faq';
import { MASTER_SYSTEM_PROMPT } from '../../src/prompt-core/master-system-prompt';
import { noImageDeixisRule, livelinessRules } from './us91-constants';
import type { PromptPayload } from '../../src/prompt-core/payload';
import type { ProductInput } from '../../src/app/types';
import {
  makeMockLlm, pipelineRoutes, productInput, type CapturedCall, type MockLlm,
} from './protected-name';

export { registryStores, stubBrowserGlobals, makeMockLlm } from './protected-name';
export type { CapturedCall, MockLlm } from './protected-name';

/** The product name the hand-verified corpus Doc was written for (see pipelineRoutes). */
export const PRODUCT = 'Ortur H20 20 W';
export const SUPPLEMENTAL = 'Q: does it need a heated bed? A: yes, 60 °C. Q: which nozzle? A: 0.4 mm for speed.';

/**
 * A valid uk-UA master FAQ: 2 questions (h3), 2 paragraphs (p), 1 list (ul) with 2 items (li), a bold
 * lead sentence in the first answer and bold lead-ins in the list.
 */
export const FAQ_MASTER_HTML =
  '<h3>Чи потрібен підігрів столу?</h3><p><b>Так, рекомендовано.</b> Нагрівайте стіл до 60 °C.</p>'
  + '<h3>Яке сопло обрати?</h3><p>Для швидкості — 0,4 мм:</p>'
  + '<ul><li><b>0,4 мм:</b> швидкість;</li><li><b>0,2 мм:</b> деталі.</li></ul>';

export const MASTER_COUNTS = { h3: 2, p: 2, ul: 1, li: 2 } as const;

/** A language-marked translation of FAQ_MASTER_HTML with the SAME structure (what a good model returns). */
export const translationOf = (iso: string, master = FAQ_MASTER_HTML) => master.replace(/<h3>/g, `<h3>[${iso}] `);

/** The same master written with <strong> (the model habit the Story reports). */
export const FAQ_STRONG_HTML =
  '<h3>Чи потрібен підігрів столу?</h3><p><strong>Так, рекомендовано.</strong> Нагрівайте стіл до 60 °C.</p>'
  + '<h3>Яке сопло обрати?</h3><p>Для швидкості — 0,4 мм:</p>'
  + '<ul><li><strong>0,4 мм:</strong> швидкість;</li><li><strong>0,2 мм:</strong> деталі.</li></ul>';

/** Not valid under FR-9 for a reason that has nothing to do with <strong>: <br> and an <h2>. */
export const FAQ_INVALID_HTML = '<h3>Чи потрібен підігрів столу?</h3><p>Так.<br>Нагрівайте стіл.</p><h2>Зайвий заголовок</h2>';

const FAQ_SYSTEM_TEXT = buildPromptFaq('x', '', '', 's', 'Ukrainian', '€').systemBlocks[0].text;

export const isoOf = (label: string): string => label.match(/\(([^)]+)\)\s*$/)?.[1] ?? label;
export const isFaqGeneration = (c: CapturedCall): boolean =>
  c.kind === 'text' && c.payload.systemBlocks[0]?.text === FAQ_SYSTEM_TEXT;
export const isFaqTranslation = (c: CapturedCall): boolean =>
  c.kind === 'text' && c.label.startsWith('FAQ') && !isFaqGeneration(c);
export const isDescriptionTranslation = (c: CapturedCall): boolean =>
  c.kind === 'text' && /^HTML \(/.test(c.label) && c.label !== 'HTML (base)' && c.label !== 'HTML (uk-UA)' && !/repair/i.test(c.label);

export const generationCalls = (m: MockLlm) => m.calls.filter(isFaqGeneration);
export const translationCalls = (m: MockLlm) => m.calls.filter(isFaqTranslation);
export const translationCallsFor = (m: MockLlm, iso: string) => translationCalls(m).filter(c => isoOf(c.label) === iso);
export const faqCalls = (m: MockLlm) => m.calls.filter(c => isFaqGeneration(c) || isFaqTranslation(c));

/** Languages a store publishes, from the registry (never typed in a test). */
export const storeLanguages = (store: string): string[] => STORE_REGISTRY[store].languages;
export const translationLanguages = (store: string): string[] => storeLanguages(store).filter(l => l !== MASTER_LOCALE);
export const countOf = (html: string, tag: 'h3' | 'p' | 'ul' | 'li' | 'strong' | 'b'): number =>
  (html.match(new RegExp(`<${tag}\\b`, 'gi')) ?? []).length;

// ── The FAQ TRANSLATION prompt, as observed at the stubbed LLM boundary (US-8.1 AC-19 integration half) ──
//
// `task-c.faq.spec.ts` proves the FAQ variant exists when `buildPromptC` is asked for it. These helpers let the
// orchestrator specs prove the PRODUCTION pipeline asks for it, by reading only what the stubbed model received
// (`systemBlocks` + `userContent`), never the option that selects it. Wording is OD-5, so only the three FR-12
// items are looked at: (1) element-for-element, (3) no description-only instruction. The marker list is the
// plan's D4 list, the same one `task-c.faq.spec.ts` applies.

/** Description-only instructions that must NOT reach a FAQ translation call (FR-12 item 3, case-sensitive). */
export const DESCRIPTION_ONLY_MARKERS = [
  '</section>', '<hr', '<h2', 'COMMERCIAL CLOSING', 'CTA', 'H1 LOCK',
  'Technical specifications', "What's in the box", '[Delivery',
] as const;

/**
 * US-9.1 (finding F7). The two positional slices below (0..400, 3000..3400) read the LIVE master and were chosen against the
 * PRE-Story master. The Story inserts text into that master (FR-5, FR-6..FR-9, FR-20, FR-29), which shifts every later offset, so a
 * leak of the new paragraphs could sit entirely between or after the two fixed slices. They are KEPT (extend, never narrow:
 * AGENTS.md section 7.7) and two position-independent checks are ADDED:
 *  1. windows over the text the Story adds as CONSTANTS (`NO_IMAGE_DEIXIS_RULE`, `LIVELINESS_RULES`, read through
 *     `us91-constants`, skipped while a constant does not exist yet): any 300+ consecutive characters of either rule in a FAQ
 *     prompt are caught wherever the master interpolates them;
 *  2. literals of the Story's other master edits (`US91_MASTER_LITERALS`), as strings.
 * WHY NOT windows over the whole master: measured, a FAQ translation prompt legitimately shares text with the master (the
 * NO LEAKED REASONING block, the unit-localisation tables), so whole-master windows are false positives and would fail the
 * existing FAQ specs. Only text that is NEW in this Story is windowed.
 */
const WINDOW = 200;
const STRIDE = 100;
const windowsOf = (text: string): string[] => {
  const out: string[] = [];
  for (let at = 0; at + WINDOW <= text.length; at += STRIDE) out.push(text.slice(at, at + WINDOW));
  if (text.length >= WINDOW) out.push(text.slice(text.length - WINDOW));
  return out;
};
const existing = (read: () => string): string[] => { try { return [read()]; } catch { return []; } };
const storyConstantWindows = (): string[] =>
  [...existing(noImageDeixisRule), ...existing(livelinessRules)].flatMap(t => [t, ...windowsOf(t)]);

/** Text the Story adds to the master (Specification FR-5, FR-6..FR-9, FR-20, FR-29): none of it may reach a FAQ call. */
export const US91_MASTER_LITERALS = [
  '[NO PICTURE REFERENCES',
  'open each §3 <h2> section with one short sentence',
  'surface the non-obvious constraint in the paragraph where it matters',
  'names the task the buyer solves',
  'where a store voice block defines its own bullet form',
  'govern writing a new description',
  "the source's sentences and their order are kept",
  '[Operator Notes]',
  'PRECEDING PARAGRAPH',
  'restricts claims ABOUT THE IMAGE',
  'Place every embed directly after a body paragraph of its sub-section',
] as const;

/** The 35 KB description master prompt, a slice of it, or text the Story added to it, in any system block of the payload. */
export const masterPromptBlocks = (p: PromptPayload): boolean =>
  [MASTER_SYSTEM_PROMPT, MASTER_SYSTEM_PROMPT.slice(0, 400), MASTER_SYSTEM_PROMPT.slice(3000, 3400), ...storyConstantWindows(), ...US91_MASTER_LITERALS]
    .some(slice => p.systemBlocks.some(b => b.text.includes(slice)));

const allText = (p: PromptPayload): string => `${p.systemBlocks.map(blk => blk.text).join('\n')}\n${p.userContent}`;

/**
 * What is wrong with a FAQ translation call's prompt, as human-readable reasons. `[]` means it is the FAQ
 * variant: it demands an element-for-element translation naming the four structural elements and forbidding
 * additions, and carries none of the description-only instructions (closing H2 / CTA block, delivery-region
 * sentence, H1 LOCK, spec labels, MASTER_SYSTEM_PROMPT).
 */
export function faqTranslationPromptProblems(p: PromptPayload): string[] {
  const system = p.systemBlocks.map(blk => blk.text).join('\n');
  const everything = allText(p);
  const problems: string[] = [];
  if (!/element[- ]for[- ]element/i.test(system)) problems.push('no element-for-element translation instruction');
  for (const tag of ['<h3>', '<p>', '<ul>', '<li>']) if (!system.includes(tag)) problems.push(`system blocks do not name ${tag}`);
  if (!/(adding none|add none|do not add|don't add|never add|must not add|without adding)/i.test(system)) problems.push('no instruction forbidding added elements');
  for (const m of DESCRIPTION_ONLY_MARKERS) if (everything.includes(m)) problems.push(`description-only marker present: ${m}`);
  if (masterPromptBlocks(p)) problems.push('the description MASTER_SYSTEM_PROMPT is part of the prompt');
  return problems;
}

/** True when the payload carries a description-only marker or the master prompt (used as a discrimination control). */
export const looksLikeDescriptionPrompt = (p: PromptPayload): boolean =>
  masterPromptBlocks(p) || DESCRIPTION_ONLY_MARKERS.some(m => allText(p).includes(m));

type Responder = (n: number, payload: PromptPayload, label: string) => string;

export interface FaqRoutes {
  /** Every master (generation) call. n is the 1-based call index for that label. */
  master?: Responder | string;
  /** Every translation call; `iso` is the language of the call. Default: a language-marked copy of the master. */
  translation?: ((n: number, payload: PromptPayload, iso: string, label: string) => string) | string;
}

/**
 * Routes sufficient for generate() / generateUaContent() on ANY registry store (the US-7.1 pipeline
 * routes) plus the two FAQ routes. Any text label not routed gets '' (so block / field repair calls are
 * answered with an unusable empty string and move the gate on, never writing placeholder markup).
 */
export function faqPipelineRoutes(store: string, over: FaqRoutes = {}) {
  const base = pipelineRoutes(store, PRODUCT);
  const configured = over.master;
  const master: Responder = typeof configured === 'function' ? configured : () => (configured ?? FAQ_MASTER_HTML);
  const translation = over.translation;
  const translate: Responder = (n, payload, label) => {
    const iso = isoOf(label);
    if (typeof translation === 'function') return translation(n, payload, iso, label);
    if (typeof translation === 'string') return translation;
    return translationOf(iso);
  };
  return {
    json: base.json,
    // Key order matters: the routing mock takes the first key the label starts with.
    text: { ...base.text, 'FAQ (': master, 'FAQ translation (': translate } as Record<string, Responder>,
  };
}

export interface Booted { orchestrator: ContentOrchestratorService; historyAdd: ReturnType<typeof vi.fn> }

/** Same DI as `bootOrchestrator` in protected-name.ts, but keeps a handle on `HistoryService.add`. */
export function bootWithHistory(mock: MockLlm): Booted {
  const historyAdd = vi.fn();
  const injector = Injector.create({
    providers: [
      ContentOrchestratorService,
      { provide: LlmService, useValue: mock },
      { provide: RetrievalService, useValue: {} },
      { provide: HistoryService, useValue: { add: historyAdd } },
    ],
  });
  return { orchestrator: injector.get(ContentOrchestratorService), historyAdd };
}

export const generatorInput = (store: string, extra: Partial<ProductInput> = {}): ProductInput =>
  productInput(store, PRODUCT, { supplementalContent: SUPPLEMENTAL, ...extra });

export interface Run extends Booted { mock: MockLlm; store: string }

/** Runs generate() once for a store with the given FAQ routes. */
export async function runGenerate(store: string, over: FaqRoutes = {}, extra: Partial<ProductInput> = {}, maxRepairs?: number): Promise<Run> {
  const mock = makeMockLlm(faqPipelineRoutes(store, over));
  const booted = bootWithHistory(mock);
  if (maxRepairs !== undefined) booted.orchestrator.maxRepairs.set(maxRepairs);
  await booted.orchestrator.generate(generatorInput(store, extra));
  return { ...booted, mock, store };
}

/** Runs generateUaContent() once for a store with the given FAQ routes. */
export async function runUa(store: string, over: FaqRoutes = {}, extra: Partial<ProductInput> = {}, maxRepairs?: number): Promise<Run> {
  const mock = makeMockLlm(faqPipelineRoutes(store, over));
  const booted = bootWithHistory(mock);
  if (maxRepairs !== undefined) booted.orchestrator.maxRepairs.set(maxRepairs);
  await booted.orchestrator.generateUaContent(generatorInput(store, extra));
  return { ...booted, mock, store };
}

/**
 * Routes for a FAQ-ONLY run: the two FAQ routes and NO JSON route at all. `generateJson` on this mock
 * throws for every label (unrouted), and every unrouted text label (description, repair, ...) answers
 * '', so a run that strays into the description, SEO or slug pipeline is loud, and the spec can assert
 * on the recorded calls that it never did.
 */
export function faqOnlyRoutes(over: FaqRoutes = {}) {
  const r = faqPipelineRoutes('EXPERT3D', over);
  return { json: {}, text: { 'FAQ (': r.text['FAQ ('], 'FAQ translation (': r.text['FAQ translation ('] } as Record<string, Responder> };
}

/** Boots an orchestrator on a FAQ-only mock (no `generateFaqOnly` reference: the caller invokes it). */
export function bootFaqOnly(over: FaqRoutes = {}, maxRepairs?: number): Booted & { mock: MockLlm } {
  const mock = makeMockLlm(faqOnlyRoutes(over));
  const booted = bootWithHistory(mock);
  if (maxRepairs !== undefined) booted.orchestrator.maxRepairs.set(maxRepairs);
  return { ...booted, mock };
}

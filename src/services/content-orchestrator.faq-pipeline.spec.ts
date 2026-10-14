/**
 * content-orchestrator.faq-pipeline.spec.ts — US-8.1 T6 (Generator mode) and T7 (UA Description mode):
 * the single-master FAQ pipeline.
 *
 * Covers AC-1, AC-2, AC-3, AC-4, AC-5, AC-7, AC-8, AC-9, AC-14 (pipeline parity), AC-16, AC-17 and the
 * AGENTS.md section 4 criteria FR-21 and FR-23 at the level the Specification allows (normaliser level).
 *
 * TABLE B SPEC (task breakdown, constraint 1a). It imports NOTHING that a task of this Story creates:
 * not `faq-gate`, not `faq-html`, not `generateFaqOnly`, not a `FAQ_*` constant, not `contentKind`. It
 * drives the real service through `generate()` and `generateUaContent()` with a stubbed `LlmService`,
 * counts calls, and asserts on `content()`, `validationIssues()` and `historyService.add`. Magic numbers
 * the production constants would give (the attempt cap 3) are written as literals. It therefore carries
 * NO compile diagnostic at any task, and is red at RUNTIME only, by assertion failure
 * ("expected 4 to be 1" and the like), until T6 (Generator groups) and T7 (UA groups) land.
 *
 * Green by design (guards that must survive the change): the AC-5 trigger groups, the AC-8 bold-lead
 * guard, the FR-21 / FR-23 normaliser guards (today's chain already does this; the Story must not
 * remove it), and the description-retained half of every failure scenario.
 *
 * DI, NOT TestBed: see content-orchestrator.ua-doc-pipeline.spec.ts. The model is stubbed at the
 * `LlmService` boundary; orchestrator, repair gate, prompt builders, normalisers and validators are real.
 *
 * Call classification (see test/fixtures/faq-pipeline.ts): a generation call is identified by its
 * payload (FAQ prompt system block), a translation call by its "FAQ..." label; both languages are read
 * from the ISO code in the label. Attempt counts are per label: master = the `FAQ (uk-UA)` calls.
 */
import '@angular/compiler';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MASTER_LOCALE, STORE_REGISTRY } from '../prompt-core/constants';
import {
  registryStores, stubBrowserGlobals, FAQ_MASTER_HTML, FAQ_STRONG_HTML, FAQ_INVALID_HTML, MASTER_COUNTS, PRODUCT,
  translationOf, isoOf, generationCalls, translationCalls, translationCallsFor, faqCalls, isDescriptionTranslation,
  storeLanguages, translationLanguages, countOf, runGenerate, runUa, type Run, type FaqRoutes,
} from '../../test/fixtures/faq-pipeline';
import type { ProductInput } from '../app/types';

type Runner = (store: string, over?: FaqRoutes, extra?: Partial<ProductInput>, maxRepairs?: number) => Promise<Run>;

beforeAll(() => { stubBrowserGlobals(); });
afterAll(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const STORES = registryStores().map(s => [s] as [string]);
const FIVE = new Set(['h3', 'p', 'b', 'ul', 'li']);

/** Independent well-formedness check (does not use any production code): only the five elements, every
 *  open tag closed in order, no attributes. */
function isWellFormedFaq(html: string): boolean {
  const stack: string[] = [];
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g)) {
    const [, closing, name, rest] = m;
    const tag = name.toLowerCase();
    if (!FIVE.has(tag) || rest.trim() !== '') return false;
    if (closing) { if (stack.pop() !== tag) return false; } else stack.push(tag);
  }
  return stack.length === 0;
}

/** A stored translation: it carries the language marker the stub puts in front of every question and the
 *  master's structure. (The stored text may differ from the stub's in number separators: the locale
 *  normalisers legitimately run on it.) */
const isTranslationOf = (iso: string, html: string | undefined) =>
  !!html && html.includes(`<h3>[${iso}] `) && sameCounts(html, FAQ_MASTER_HTML);

/** Exactly `n` master attempts and NO generation call for any other language. Comparing the labels (not
 *  just a count) matters: today's per-language loop also makes 3 FAQ calls for a 3-language store. */
const expectMasterAttempts = (r: Run, n: number) =>
  expect(generationCalls(r.mock).map(c => c.label)).toEqual(Array(n).fill('FAQ (uk-UA)'));

const sameCounts = (a: string, b: string) =>
  (['h3', 'p', 'ul', 'li'] as const).every(t => countOf(a, t) === countOf(b, t));

/** FAQ issues only: the description gates add many `structural-parity-count` issues of their own. */
const faqIssues = (r: Run, rule: string) =>
  r.orchestrator.validationIssues().filter(i => i.rule === rule && /FAQ/i.test(i.context ?? ''));

const MODES: Array<{ name: string; run: Runner; generator: boolean }> = [
  { name: 'Generator (generate)', run: runGenerate, generator: true },
  { name: 'UA Description (generateUaContent)', run: runUa, generator: false },
];

function expectRunCompleted(r: Run, generator: boolean) {
  const content = r.orchestrator.content();
  expect(r.orchestrator.progressMessage(), 'the run reached its end').toBe('Done!');
  expect(r.historyAdd, 'one history entry').toHaveBeenCalledTimes(1);
  expect(content.mainHtmlUa.length, 'the description is retained').toBeGreaterThan(0);
  if (generator) {
    expect(Object.keys(content.translations).length, 'description translations are retained')
      .toBe(translationLanguages(r.store).length);
  }
}

for (const mode of MODES) {
  describe(`${mode.name}`, () => {
    // ── AC-1 / AC-2 / AC-3 / AC-4 / AC-14: one master, N-1 translations ─────────────────────────────
    describe.each(STORES)('single master and translations — store %s (AC-1, AC-2, AC-3, AC-4, AC-14)', (store) => {
      let r: Run;
      beforeAll(async () => { r = await mode.run(store); });

      it('premise: the store publishes uk-UA and at least one other language', () => {
        expect(storeLanguages(store)).toContain(MASTER_LOCALE);
        expect(translationLanguages(store).length).toBeGreaterThanOrEqual(1);
      });

      it('AC-1: exactly ONE FAQ generation call is made in the whole run, and it is the uk-UA master', () => {
        const gen = generationCalls(r.mock);
        expect(gen.map(c => c.label)).toEqual(['FAQ (uk-UA)']);
        expect(gen[0].payload.userContent).toContain('in Ukrainian');
      });

      it('AC-1: no FAQ generation call is made for any other language of the store', () => {
        const otherGeneration = generationCalls(r.mock).filter(c => isoOf(c.label) !== MASTER_LOCALE);
        expect(otherGeneration).toEqual([]);
      });

      it('AC-2: faqArtifacts has an entry for EVERY language of the store', () => {
        expect(Object.keys(r.orchestrator.content().faqArtifacts ?? {}).sort()).toEqual([...storeLanguages(store)].sort());
      });

      it('AC-2: the uk-UA entry is the master text', () => {
        expect(r.orchestrator.content().faqArtifacts?.[MASTER_LOCALE]).toBe(FAQ_MASTER_HTML);
      });

      it('AC-2: every other entry was produced by TRANSLATING the master: one translation sequence per language, carrying the master', () => {
        const master = r.orchestrator.content().faqArtifacts![MASTER_LOCALE];
        const calls = translationCalls(r.mock);
        expect([...new Set(calls.map(c => isoOf(c.label)))].sort()).toEqual([...translationLanguages(r.store)].sort());
        for (const iso of translationLanguages(r.store)) {
          const forLang = translationCallsFor(r.mock, iso);
          expect(forLang, `${iso} translation calls`).toHaveLength(1);
          expect(forLang[0].payload.userContent, `${iso} prompt carries the master`).toContain(master);
          expect(isTranslationOf(iso, r.orchestrator.content().faqArtifacts?.[iso] ?? ''), `${iso} entry is the translation`).toBe(true);
        }
      });

      it('AC-3: each translation has the same number of <h3>, <p>, <ul> and <li> as the master', () => {
        const faq = r.orchestrator.content().faqArtifacts!;
        for (const iso of translationLanguages(r.store)) expect(sameCounts(faq[iso] ?? '', faq[MASTER_LOCALE]), iso).toBe(true);
        for (const [tag, n] of Object.entries(MASTER_COUNTS)) {   // premise: the stored master has the counts the stub promises
          expect(countOf(faq[MASTER_LOCALE], tag as 'h3' | 'p' | 'ul' | 'li'), tag).toBe(n);
        }
      });

      it('AC-9: every stored FAQ is well-formed and holds only h3, p, b, ul, li', () => {
        for (const [iso, html] of Object.entries(r.orchestrator.content().faqArtifacts!)) {
          expect(isWellFormedFaq(html), iso).toBe(true);
        }
      });

      it('FR-19: FAQ translation is not issued for a language outside the store, and never before the master', () => {
        const order = faqCalls(r.mock).map(c => isoOf(c.label));
        expect(order[0]).toBe(MASTER_LOCALE);
        expect(order.every(iso => storeLanguages(store).includes(iso))).toBe(true);
      });

      it('the surrounding run is untouched: the description, its translations (Generator) and one history entry', () => {
        expectRunCompleted(r, mode.generator);
      });
    });

    // ── AC-5: the trigger is unchanged ─────────────────────────────────────────────────────────────
    describe.each(STORES)('trigger — store %s (AC-5)', (store) => {
      it.each([['an empty string', ''], ['whitespace only', '  \n\t  '], ['undefined', undefined]])(
        'Supplemental Content %s: no FAQ generation call, no FAQ translation call, faqArtifacts empty', async (_name, supplemental) => {
          const r = await mode.run(store, {}, { supplementalContent: supplemental });
          expect(faqCalls(r.mock)).toEqual([]);
          expect(r.orchestrator.content().faqArtifacts ?? {}).toEqual({});
          expectRunCompleted(r, mode.generator);
        });
    });

    // ── AC-7 / AC-8 ────────────────────────────────────────────────────────────────────────────────
    describe.each(STORES)('<b> instead of <strong> — store %s (AC-7, AC-8)', (store) => {
      let strong: Run;
      let bold: Run;
      beforeAll(async () => {
        const translation = (_n: number, _p: unknown, iso: string) => translationOf(iso, FAQ_STRONG_HTML);
        strong = await mode.run(store, { master: FAQ_STRONG_HTML, translation });
        bold = await mode.run(store);
      });

      it('AC-7: a model that answers with <strong> on EVERY call still stores zero <strong> for every language', () => {
        const faq = strong.orchestrator.content().faqArtifacts!;
        expect(Object.keys(faq).sort()).toEqual([...storeLanguages(store)].sort());
        for (const [iso, html] of Object.entries(faq)) expect(countOf(html, 'strong'), iso).toBe(0);
      });

      it('AC-7: the emphasised text is preserved inside <b>, master and translations alike', () => {
        const faq = strong.orchestrator.content().faqArtifacts!;
        for (const [iso, html] of Object.entries(faq)) {
          expect(html, iso).toContain('<b>Так, рекомендовано.</b>');
          expect(countOf(html, 'b'), `${iso}: all three emphasised spans survive`).toBe(3);
        }
      });

      it('AC-7 / FR-7: <strong> alone costs no attempt: still one master call and one call per translation language', () => {
        expectMasterAttempts(strong, 1);
        for (const iso of translationLanguages(store)) expect(translationCallsFor(strong.mock, iso), iso).toHaveLength(1);
      });

      it('FR-7: the master handed to translation already uses <b> (the conversion precedes validation and storage)', () => {
        const calls = translationCalls(strong.mock);
        expect(calls.length, 'a translation call per non-master language').toBe(translationLanguages(store).length);
        for (const c of calls) {
          expect(countOf(c.payload.userContent, 'strong'), c.label).toBe(0);
        }
      });

      it('AC-8: a bold lead sentence inside <p> is stored unchanged, master and translations (green guard)', () => {
        const lead = '<p><b>Так, рекомендовано.</b> Нагрівайте стіл';
        for (const [iso, html] of Object.entries(bold.orchestrator.content().faqArtifacts!)) expect(html, iso).toContain(lead);
      });
    });

    // ── AC-9: an invalid response is retried and the corrected text is the one stored ──────────────────
    describe('AC-9: not-valid HTML is regenerated, and only a valid FAQ is stored', () => {
      it.each(STORES)('master — store %s: an invalid first answer (<br>, <h2>) is retried; the second, valid, answer is stored', async (store) => {
        const r = await mode.run(store, { master: (n) => (n === 1 ? FAQ_INVALID_HTML : FAQ_MASTER_HTML) });
        expectMasterAttempts(r, 2);
        const faq = r.orchestrator.content().faqArtifacts!;
        expect(faq[MASTER_LOCALE]).toBe(FAQ_MASTER_HTML);
        for (const html of Object.values(faq)) expect(html).not.toMatch(/<(br|h2)\b/i);
        expect(Object.keys(faq).sort()).toEqual([...storeLanguages(store)].sort());
      });

      it.each(STORES)('translation — store %s: an invalid first translation (<h2> added) is retried and the corrected one stored', async (store) => {
        const target = translationLanguages(store)[0];
        const r = await mode.run(store, {
          translation: (n, _p, iso) => (iso === target && n === 1 ? `${translationOf(iso)}<h2>Extra</h2>` : translationOf(iso)),
        });
        expect(translationCallsFor(r.mock, target)).toHaveLength(2);
        expect(isTranslationOf(target, r.orchestrator.content().faqArtifacts![target])).toBe(true);
        for (const html of Object.values(r.orchestrator.content().faqArtifacts!)) expect(html).not.toMatch(/<h2\b/i);
      });

      it('an attribute on an element (class) is a violation too: it is retried, never stored', async () => {
        const r = await mode.run('EXPERT3D', { master: (n) => (n === 1 ? FAQ_MASTER_HTML.replace('<ul>', '<ul class="x">') : FAQ_MASTER_HTML) });
        expectMasterAttempts(r, 2);
        for (const html of Object.values(r.orchestrator.content().faqArtifacts!)) expect(html).not.toContain('class=');
      });

      it('a master that does not start with an <h3> is retried', async () => {
        const r = await mode.run('EXPERT3D', { master: (n) => (n === 1 ? `<p>Intro.</p>${FAQ_MASTER_HTML}` : FAQ_MASTER_HTML) });
        expectMasterAttempts(r, 2);
        expect(r.orchestrator.content().faqArtifacts![MASTER_LOCALE]).toBe(FAQ_MASTER_HTML);
      });
    });

    // ── AC-16: master retry, at most 3 attempts ────────────────────────────────────────────────────────
    describe('AC-16: the uk-UA master', () => {
      describe.each(STORES)('invalid on every attempt — store %s', (store) => {
        let r: Run;
        beforeAll(async () => { r = await mode.run(store, { master: FAQ_INVALID_HTML }); });

        it('exactly 3 master attempts are made, then no more', () => {
          expectMasterAttempts(r, 3);
        });
        it('no translation call is made and no FAQ is stored for any language', () => {
          expect(translationCalls(r.mock)).toEqual([]);
          expect(r.orchestrator.content().faqArtifacts ?? {}).toEqual({});
        });
        it('what the run already produced is retained and the run completes', () => {
          expectRunCompleted(r, mode.generator);
        });
      });

      it.each([0, 2, 5])('the cap of 3 is fixed, independent of the user repair setting (maxRepairs = %i)', async (maxRepairs) => {
        const r = await mode.run('EXPERT3D', { master: FAQ_INVALID_HTML }, {}, maxRepairs);
        expectMasterAttempts(r, 3);
        expect(translationCalls(r.mock)).toEqual([]);
        expect(r.orchestrator.content().faqArtifacts ?? {}).toEqual({});
      });

      it('a valid master after two invalid ones is stored; no further master call is made after it', async () => {
        const r = await mode.run('EXPERT3D', { master: (n) => (n <= 2 ? FAQ_INVALID_HTML : FAQ_MASTER_HTML) });
        expectMasterAttempts(r, 3);
        expect(r.orchestrator.content().faqArtifacts![MASTER_LOCALE]).toBe(FAQ_MASTER_HTML);
        expect(Object.keys(r.orchestrator.content().faqArtifacts!).sort()).toEqual([...storeLanguages('EXPERT3D')].sort());
      });

      describe.each(STORES)('the master call itself throws (a provider error) — store %s', (store) => {
        it('on every attempt: 3 attempts, nothing stored, no translation, the run does NOT abort', async () => {
          const r = await mode.run(store, { master: () => { throw new Error('provider timeout'); } });
          expectMasterAttempts(r, 3);
          expect(translationCalls(r.mock)).toEqual([]);
          expect(r.orchestrator.content().faqArtifacts ?? {}).toEqual({});
          expectRunCompleted(r, mode.generator);
        });

        it('once: that call is one failed attempt, the next valid answer is stored and the pipeline continues', async () => {
          const r = await mode.run(store, { master: (n) => { if (n === 1) throw new Error('rate limited'); return FAQ_MASTER_HTML; } });
          expectMasterAttempts(r, 2);
          expect(r.orchestrator.content().faqArtifacts![MASTER_LOCALE]).toBe(FAQ_MASTER_HTML);
          expect(Object.keys(r.orchestrator.content().faqArtifacts!).sort()).toEqual([...storeLanguages(store)].sort());
          expectRunCompleted(r, mode.generator);
        });
      });

      describe.each(STORES)('an empty or whitespace-only master response is terminal — store %s', (store) => {
        it.each([['empty', ''], ['whitespace-only', '  \n\t ']])('%s: one call, no retry, nothing stored, no translation call, description retained', async (_n, response) => {
          const r = await mode.run(store, { master: response });
          expectMasterAttempts(r, 1);
          expect(translationCalls(r.mock)).toEqual([]);
          expect(r.orchestrator.content().faqArtifacts ?? {}).toEqual({});
          expectRunCompleted(r, mode.generator);
        });
      });
    });

    // ── AC-17: translation retry per language, at most 3 attempts, then skip ───────────────────────────
    describe('AC-17: a translation', () => {
      describe.each(STORES)('fails structural parity on every attempt — store %s', (store) => {
        let r: Run;
        let bad: string;
        beforeAll(async () => {
          bad = translationLanguages(store)[0];
          // the right questions, but one answer paragraph dropped: <p> count 1 against the master's 2
          r = await mode.run(store, {
            translation: (_n, _p, iso) => (iso === bad ? translationOf(iso).replace(/<p>Для[^<]*<\/p>/, '') : translationOf(iso)),
          });
        });

        it('that language is retranslated, 3 attempts in total, then skipped', () => {
          expect(translationCallsFor(r.mock, bad)).toHaveLength(3);
        });
        it('it has no entry in faqArtifacts; the master and every other language keep theirs', () => {
          const expected = storeLanguages(store).filter(l => l !== bad);
          expect(Object.keys(r.orchestrator.content().faqArtifacts!).sort()).toEqual([...expected].sort());
        });
        it('the other languages are translated once each (one failure does not repeat their work)', () => {
          for (const iso of translationLanguages(store).filter(l => l !== bad)) {
            expect(translationCallsFor(r.mock, iso), iso).toHaveLength(1);
          }
        });
        it('the final parity failure stays visible as a validation issue for that FAQ', () => {
          const found = faqIssues(r, 'structural-parity-count');
          expect(found.length).toBeGreaterThanOrEqual(1);
          expect(found.some(i => (i.context ?? '').includes(bad))).toBe(true);
        });
        it('the description, its translations (Generator) and the history entry are retained', () => {
          expectRunCompleted(r, mode.generator);
        });
      });

      describe.each(STORES)('call throws (a provider error) — store %s', (store) => {
        it('on every attempt: 3 attempts for that language, it is skipped, the others are kept, the run does not abort', async () => {
          const bad = translationLanguages(store)[0];
          const r = await mode.run(store, {
            translation: (_n, _p, iso) => { if (iso === bad) throw new Error('provider timeout'); return translationOf(iso); },
          });
          expect(translationCallsFor(r.mock, bad)).toHaveLength(3);
          const expected = storeLanguages(store).filter(l => l !== bad);
          expect(Object.keys(r.orchestrator.content().faqArtifacts!).sort()).toEqual([...expected].sort());
          expectRunCompleted(r, mode.generator);
        });

        it('once: one failed attempt, the retry is stored and the language is not skipped', async () => {
          const bad = translationLanguages(store)[0];
          const r = await mode.run(store, {
            translation: (n, _p, iso) => { if (iso === bad && n === 1) throw new Error('rate limited'); return translationOf(iso); },
          });
          expect(translationCallsFor(r.mock, bad)).toHaveLength(2);
          expect(isTranslationOf(bad, r.orchestrator.content().faqArtifacts![bad])).toBe(true);
          expect(Object.keys(r.orchestrator.content().faqArtifacts!).sort()).toEqual([...storeLanguages(store)].sort());
        });
      });

      it.each([['empty', ''], ['whitespace-only', '  \n ']])(
        '%s translation is a parity failure (not a terminal outcome): retried up to 3 attempts, then skipped, others kept', async (_n, response) => {
          const bad = translationLanguages('EXPERT3D')[0];
          const r = await mode.run('EXPERT3D', { translation: (_n2, _p, iso) => (iso === bad ? response : translationOf(iso)) });
          expect(translationCallsFor(r.mock, bad)).toHaveLength(3);
          expect(r.orchestrator.content().faqArtifacts![bad]).toBeUndefined();
          expect(Object.keys(r.orchestrator.content().faqArtifacts!).sort())
            .toEqual(storeLanguages('EXPERT3D').filter(l => l !== bad).sort());
          expect(faqIssues(r, 'structural-parity-count').length).toBeGreaterThanOrEqual(1);
        });

      it('every language failing leaves the master stored and no translation entry', async () => {
        const r = await mode.run('EXPERT3D', { translation: () => '<h3>Only one question</h3>' });
        expect(Object.keys(r.orchestrator.content().faqArtifacts!)).toEqual([MASTER_LOCALE]);
        for (const iso of translationLanguages('EXPERT3D')) expect(translationCallsFor(r.mock, iso), iso).toHaveLength(3);
        expectRunCompleted(r, mode.generator);
      });
    });

    // ── AGENTS.md section 4 on the FAQ artifact (FR-21, FR-23) ─────────────────────────────────────────
    describe('AGENTS.md section 4 at normaliser level (FR-21, FR-23)', () => {
      it('FR-21 (green guard): a number adjoined to a unit in the master is stored with the space', async () => {
        const r = await mode.run('EXPERT3D', { master: '<h3>Яка нитка?</h3><p>Використовуйте нитку 1.75mm.</p>' });
        const stored = r.orchestrator.content().faqArtifacts![MASTER_LOCALE];
        expect(stored).toMatch(/1[.,]75\s(?:mm|мм)/);
        expect(stored).not.toMatch(/1[.,]75(?:mm|мм)/);
      });

      it.each(STORES.filter(([s]) => storeLanguages(s).some(l => l.startsWith('en-'))))(
        'FR-21: %s - the English translation of a number adjoined to a unit is stored as "1.75 mm"', async (store) => {
          const en = translationLanguages(store).find(l => l.startsWith('en-'))!;
          const r = await mode.run(store, {
            master: '<h3>Яка нитка?</h3><p>Використовуйте нитку 1.75mm.</p>',
            translation: (_n, _p, iso) => (iso === en ? '<h3>Which filament?</h3><p>Use 1.75mm filament.</p>' : translationOf(iso, '<h3>Яка нитка?</h3><p>Використовуйте нитку 1.75mm.</p>')),
          });
          expect(r.orchestrator.content().faqArtifacts![en] ?? '').toContain('1.75 mm');
          expect(r.orchestrator.content().faqArtifacts![en] ?? '').not.toContain('1.75mm');
        });

      it('FR-23 (green guard): the terminology normaliser is still applied to the uk-UA master (an anglicism is replaced)', async () => {
        const r = await mode.run('EXPERT3D', { master: '<h3>Який тамблер обрати?</h3><p>Підходить будь-який тамблер.</p>' });
        const stored = r.orchestrator.content().faqArtifacts![MASTER_LOCALE];
        expect(stored).not.toContain('тамблер');
        expect(stored).toContain('термостакан');
      });
    });
  });
}

// ── FR-19: the two entry points run the identical pipeline ───────────────────────────────────────────────
describe('FR-19 / AC-14: Generator and UA Description run the same FAQ pipeline', () => {
  describe.each(STORES)('store %s', (store) => {
    let gen: Run;
    let ua: Run;
    beforeAll(async () => { gen = await runGenerate(store); ua = await runUa(store); });

    it('the same FAQ calls are made, in the same order, under the same labels', () => {
      expect(faqCalls(ua.mock).map(c => c.label)).toEqual(faqCalls(gen.mock).map(c => c.label));
    });

    it('the master prompt is identical (system blocks and user content), including the locale overlay', () => {
      const g = generationCalls(gen.mock)[0].payload;
      const u = generationCalls(ua.mock)[0].payload;
      expect(u.systemBlocks).toEqual(g.systemBlocks);
      expect(u.userContent).toBe(g.userContent);
    });

    it('every translation prompt is identical, call by call', () => {
      const g = translationCalls(gen.mock);
      const u = translationCalls(ua.mock);
      expect(g.length, 'a translation call per non-master language').toBe(translationLanguages(store).length);
      expect(u.length).toBe(g.length);
      u.forEach((c, i) => {
        expect(c.payload.systemBlocks, c.label).toEqual(g[i].payload.systemBlocks);
        expect(c.payload.userContent, c.label).toBe(g[i].payload.userContent);
      });
    });

    it('UA Description does not translate the description (only the FAQ is translated); Generator does', () => {
      expect(ua.mock.calls.filter(isDescriptionTranslation)).toEqual([]);
      expect(gen.mock.calls.filter(isDescriptionTranslation).length).toBeGreaterThanOrEqual(translationLanguages(store).length);
    });
  });
});

describe('the premise of every group above', () => {
  it('the Specification smallest store has N = 2 languages, so "N-1 translations" is at least one', () => {
    expect(Math.min(...Object.values(STORE_REGISTRY).map(s => s.languages.length))).toBe(2);
  });
  it('the product used by every run is the product the hand-verified corpus Doc was written for (so the description side never trips a name check)', () => {
    const corpusDoc = readFileSync(join(process.cwd(), 'test', 'fixtures', 'corpus', 'expert3d-ortur-h20-20w.doc.json'), 'utf8');
    expect(corpusDoc).toContain(PRODUCT.replace(/ W$/, ''));
  });
});

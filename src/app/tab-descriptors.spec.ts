/**
 * tab-descriptors.spec.ts — US-8.1 T10: `deriveTabDescriptors` (AC-4 UI side, AC-13 UI side, plan R9, R10).
 *
 * TABLE A SPEC, OWNED BY T10. `./tab-descriptors` does not exist yet and `'faq-generator'` is not yet
 * an `AppMode`, so this file is RED BY ABSENT MODULE, BY DESIGN (task breakdown, constraint 4): vitest
 * reports "Failed to resolve import './tab-descriptors'"; `tsc` reports TS2307 (module) and TS2322 /
 * TS2345 (the `'faq-generator'` literal) in this file only.
 *
 * HAND-DERIVED LITERALS, NOT A SNAPSHOT (breakdown constraint 5). `AppComponent` cannot be instantiated
 * in the logic runner, so the pre-extraction `tabDescriptors` computed (`app.component.ts:583-629` at the
 * commit before T10) cannot be captured. The Generator-mode expectations below were written by READING
 * that algorithm and STORE_REGISTRY, one store at a time, with sentinel label strings so that label
 * wiring is visible. The builder's separate move-only diff check (T10 acceptance) is the mechanical
 * half of the same evidence. No `toMatchSnapshot`, no `-u`.
 *
 * What the pre-extraction algorithm does (non-`ua-generator` modes), which every Generator expectation
 * below follows:
 *   - tabs come in `store.languages` order; the master language is NOT necessarily first;
 *   - master language = `mainHtmlLocale` ?? the store's first `en-*` language ?? `languages[0]`;
 *   - master: an `html` tab (label = baseOutput), plus `faq-html` (label = baseFaqTab) when
 *     `faqArtifacts[iso]` exists;
 *   - other language: only when `translations[taskKey]` exists, a `trans-${taskKey}` tab
 *     (label `${taskKey} ${translation}`), plus `faq-trans-${iso}` (label `${taskKey} FAQ`) when
 *     `faqArtifacts[iso]` exists. Ids contain the task key verbatim, spaces included.
 *
 * New behaviour (specification FR-4, FR-18; task breakdown T10 rules):
 *   - `ua-generator`: one description tab, then one FAQ tab per language with an entry, uk-UA first,
 *     the others in `store.languages` order;
 *   - `faq-generator`: FAQ tabs only (no `html`, no `trans-*`, even when `translations` is non-empty).
 */
import { describe, it, expect } from 'vitest';
import { deriveTabDescriptors, type TabDescriptorContext, type TabDescriptorLabels } from './tab-descriptors';
import type { AppMode, TabDescriptor } from './types';
import { STORE_REGISTRY, bcp47ToTaskCLang } from '../prompt-core/constants';

const LABELS: TabDescriptorLabels = {
  uaGenerator: '<UA>', translation: '<TR>', baseOutput: '<BASE>', baseFaqTab: '<BASE-FAQ>',
};

// ── Every tab that can occur, written out once as a literal ───────────────────────────────────────────
const BASE: TabDescriptor = { id: 'html', label: '<BASE>', type: 'english', color: 'blue', iso: 'uk-UA', isFaq: false };
const FBASE: TabDescriptor = { id: 'faq-html', label: '<BASE-FAQ>', type: 'faq-english', color: 'green', iso: 'uk-UA', isFaq: true };
const UA_DESC: TabDescriptor = { id: 'html', label: '<UA>', type: 'english', color: 'purple', iso: 'uk-UA', isFaq: false };
const UA_FAQ: TabDescriptor = { id: 'faq-html', label: 'FAQ', type: 'faq-english', color: 'green', iso: 'uk-UA', isFaq: true };

const TR = {
  enGB: { id: 'trans-European English', label: 'European English <TR>', type: 'translation', color: 'purple', iso: 'en-GB', taskKey: 'European English', isFaq: false },
  enES: { id: 'trans-European English', label: 'European English <TR>', type: 'translation', color: 'purple', iso: 'en-ES', taskKey: 'European English', isFaq: false },
  enUS: { id: 'trans-American English', label: 'American English <TR>', type: 'translation', color: 'purple', iso: 'en-US', taskKey: 'American English', isFaq: false },
  plPL: { id: 'trans-PL', label: 'PL <TR>', type: 'translation', color: 'purple', iso: 'pl-PL', taskKey: 'PL', isFaq: false },
  deDE: { id: 'trans-DE', label: 'DE <TR>', type: 'translation', color: 'purple', iso: 'de-DE', taskKey: 'DE', isFaq: false },
  ruUA: { id: 'trans-RU', label: 'RU <TR>', type: 'translation', color: 'purple', iso: 'ru-UA', taskKey: 'RU', isFaq: false },
  esES: { id: 'trans-ES', label: 'ES <TR>', type: 'translation', color: 'purple', iso: 'es-ES', taskKey: 'ES', isFaq: false },
  ptPT: { id: 'trans-PT', label: 'PT <TR>', type: 'translation', color: 'purple', iso: 'pt-PT', taskKey: 'PT', isFaq: false },
  esMX: { id: 'trans-American Spanish', label: 'American Spanish <TR>', type: 'translation', color: 'purple', iso: 'es-MX', taskKey: 'American Spanish', isFaq: false },
} satisfies Record<string, TabDescriptor>;

const FTR = {
  enGB: { id: 'faq-trans-en-GB', label: 'European English FAQ', type: 'faq-translation', color: 'green', iso: 'en-GB', taskKey: 'European English', isFaq: true },
  enES: { id: 'faq-trans-en-ES', label: 'European English FAQ', type: 'faq-translation', color: 'green', iso: 'en-ES', taskKey: 'European English', isFaq: true },
  enUS: { id: 'faq-trans-en-US', label: 'American English FAQ', type: 'faq-translation', color: 'green', iso: 'en-US', taskKey: 'American English', isFaq: true },
  plPL: { id: 'faq-trans-pl-PL', label: 'PL FAQ', type: 'faq-translation', color: 'green', iso: 'pl-PL', taskKey: 'PL', isFaq: true },
  deDE: { id: 'faq-trans-de-DE', label: 'DE FAQ', type: 'faq-translation', color: 'green', iso: 'de-DE', taskKey: 'DE', isFaq: true },
  ruUA: { id: 'faq-trans-ru-UA', label: 'RU FAQ', type: 'faq-translation', color: 'green', iso: 'ru-UA', taskKey: 'RU', isFaq: true },
  esES: { id: 'faq-trans-es-ES', label: 'ES FAQ', type: 'faq-translation', color: 'green', iso: 'es-ES', taskKey: 'ES', isFaq: true },
  ptPT: { id: 'faq-trans-pt-PT', label: 'PT FAQ', type: 'faq-translation', color: 'green', iso: 'pt-PT', taskKey: 'PT', isFaq: true },
  esMX: { id: 'faq-trans-es-MX', label: 'American Spanish FAQ', type: 'faq-translation', color: 'green', iso: 'es-MX', taskKey: 'American Spanish', isFaq: true },
} satisfies Record<string, TabDescriptor>;

type LangKey = keyof typeof TR;

/** Per store: the non-master languages in `STORE_REGISTRY` order with their Task C keys, hand-written. */
const NON_MASTER: Record<string, Array<[iso: string, taskKey: string, key: LangKey]>> = {
  '3DDevice': [['en-GB', 'European English', 'enGB'], ['ru-UA', 'RU', 'ruUA']],
  '3DPrinter': [['en-GB', 'European English', 'enGB'], ['ru-UA', 'RU', 'ruUA']],
  '3DScanner': [['en-GB', 'European English', 'enGB'], ['ru-UA', 'RU', 'ruUA']],
  'Center 3D Print': [['pl-PL', 'PL', 'plPL'], ['en-GB', 'European English', 'enGB'], ['de-DE', 'DE', 'deDE'], ['ru-UA', 'RU', 'ruUA']],
  'Drukarka 3D': [['pl-PL', 'PL', 'plPL']],
  'EXPERT3D': [['en-ES', 'European English', 'enES'], ['es-ES', 'ES', 'esES'], ['pt-PT', 'PT', 'ptPT']],
  'Expert-3DPrinter': [['en-US', 'American English', 'enUS'], ['es-MX', 'American Spanish', 'esMX']],
};

// ── Expected output per store and mode: the ORDER is the thing under test, written out by hand ────────
const EXPECTED: Record<string, { generator: TabDescriptor[]; ua: TabDescriptor[]; faq: TabDescriptor[] }> = {
  '3DDevice': {
    generator: [TR.enGB, FTR.enGB, BASE, FBASE, TR.ruUA, FTR.ruUA],
    ua: [UA_DESC, UA_FAQ, FTR.enGB, FTR.ruUA],
    faq: [FBASE, FTR.enGB, FTR.ruUA],
  },
  '3DPrinter': {
    generator: [TR.enGB, FTR.enGB, BASE, FBASE, TR.ruUA, FTR.ruUA],
    ua: [UA_DESC, UA_FAQ, FTR.enGB, FTR.ruUA],
    faq: [FBASE, FTR.enGB, FTR.ruUA],
  },
  '3DScanner': {
    generator: [TR.enGB, FTR.enGB, BASE, FBASE, TR.ruUA, FTR.ruUA],
    ua: [UA_DESC, UA_FAQ, FTR.enGB, FTR.ruUA],
    faq: [FBASE, FTR.enGB, FTR.ruUA],
  },
  'Center 3D Print': {
    generator: [TR.plPL, FTR.plPL, TR.enGB, FTR.enGB, TR.deDE, FTR.deDE, BASE, FBASE, TR.ruUA, FTR.ruUA],
    ua: [UA_DESC, UA_FAQ, FTR.plPL, FTR.enGB, FTR.deDE, FTR.ruUA],
    faq: [FBASE, FTR.plPL, FTR.enGB, FTR.deDE, FTR.ruUA],
  },
  'Drukarka 3D': {
    generator: [TR.plPL, FTR.plPL, BASE, FBASE],
    ua: [UA_DESC, UA_FAQ, FTR.plPL],
    faq: [FBASE, FTR.plPL],
  },
  'EXPERT3D': {
    generator: [TR.enES, FTR.enES, TR.esES, FTR.esES, TR.ptPT, FTR.ptPT, BASE, FBASE],
    ua: [UA_DESC, UA_FAQ, FTR.enES, FTR.esES, FTR.ptPT],
    faq: [FBASE, FTR.enES, FTR.esES, FTR.ptPT],
  },
  'Expert-3DPrinter': {
    generator: [TR.enUS, FTR.enUS, TR.esMX, FTR.esMX, BASE, FBASE],
    ua: [UA_DESC, UA_FAQ, FTR.enUS, FTR.esMX],
    faq: [FBASE, FTR.enUS, FTR.esMX],
  },
};

const html = (s: string) => `<p>${s}</p>`;

/** A fully populated generated result for a store: every translation and every FAQ present. */
function fullContent(store: string) {
  const translations: Record<string, string> = {};
  const faqArtifacts: Record<string, string> = { 'uk-UA': '<h3>Q?</h3><p>a</p>' };
  for (const [iso, taskKey] of NON_MASTER[store]) {
    translations[taskKey] = html(iso);
    faqArtifacts[iso] = '<h3>Q?</h3><p>a</p>';
  }
  return { translations, faqArtifacts };
}

function ctx(store: string, appMode: AppMode, over: Partial<TabDescriptorContext> = {}): TabDescriptorContext {
  const { translations, faqArtifacts } = fullContent(store);
  return { appMode, storeName: store, mainHtmlLocale: 'uk-UA', translations, faqArtifacts, labels: LABELS, ...over };
}

const STORES = Object.keys(EXPECTED);

describe('the hand-written store table agrees with STORE_REGISTRY (keeps these literals honest)', () => {
  it('covers every registry store', () => {
    expect([...STORES].sort()).toEqual(Object.keys(STORE_REGISTRY).sort());
  });

  it.each(STORES.map(s => [s] as const))('%s: non-master languages and Task C keys match the registry', (store) => {
    const profile = STORE_REGISTRY[store];
    const fromRegistry = profile.languages.filter(l => l !== 'uk-UA').map(l => [l, bcp47ToTaskCLang(l, profile.group)]);
    expect(NON_MASTER[store].map(([iso, key]) => [iso, key])).toEqual(fromRegistry);
  });
});

describe('Generator mode is unchanged by the extraction (plan R10; hand-derived literals)', () => {
  it.each(STORES.map(s => [s] as const))('%s: master uk-UA, every translation and every FAQ present', (store) => {
    expect(deriveTabDescriptors(ctx(store, 'generator'))).toEqual(EXPECTED[store].generator);
  });

  it('translations only (no FAQ at all): translation tabs and the master, no FAQ tab', () => {
    const c = ctx('EXPERT3D', 'generator', { faqArtifacts: {} });
    expect(deriveTabDescriptors(c)).toEqual([TR.enES, TR.esES, TR.ptPT, BASE]);
  });

  it('a language with no FAQ entry yields no FAQ tab for it (FR-4 failure path), the others are kept', () => {
    const c = ctx('EXPERT3D', 'generator');
    const faqArtifacts = { ...c.faqArtifacts }; delete faqArtifacts!['es-ES'];
    expect(deriveTabDescriptors({ ...c, faqArtifacts })).toEqual([TR.enES, FTR.enES, TR.esES, TR.ptPT, FTR.ptPT, BASE, FBASE]);
  });

  it('no master FAQ entry: the master has its html tab only', () => {
    const c = ctx('Drukarka 3D', 'generator');
    const faqArtifacts = { ...c.faqArtifacts }; delete faqArtifacts!['uk-UA'];
    expect(deriveTabDescriptors({ ...c, faqArtifacts })).toEqual([TR.plPL, FTR.plPL, BASE]);
  });

  it('a language with no translation yields no tab at all in Generator mode, not even its FAQ tab (unchanged behaviour)', () => {
    const c = ctx('EXPERT3D', 'generator');
    const translations = { ...c.translations }; delete translations['PT'];
    expect(deriveTabDescriptors({ ...c, translations })).toEqual([TR.enES, FTR.enES, TR.esES, FTR.esES, BASE, FBASE]);
  });

  it('historical content with no mainHtmlLocale: the master is the first en-* language, uk-UA is then a translation keyed "UA"', () => {
    const faqArtifacts = { 'en-ES': '<h3>Q?</h3><p>a</p>', 'uk-UA': '<h3>Q?</h3><p>a</p>' };
    const got = deriveTabDescriptors({
      appMode: 'generator', storeName: 'EXPERT3D', mainHtmlLocale: undefined,
      translations: { ES: html('es'), UA: html('uk') }, faqArtifacts, labels: LABELS,
    });
    expect(got).toEqual([
      { id: 'html', label: '<BASE>', type: 'english', color: 'blue', iso: 'en-ES', isFaq: false },
      { id: 'faq-html', label: '<BASE-FAQ>', type: 'faq-english', color: 'green', iso: 'en-ES', isFaq: true },
      TR.esES,
      { id: 'trans-UA', label: 'UA <TR>', type: 'translation', color: 'purple', iso: 'uk-UA', taskKey: 'UA', isFaq: false },
      { id: 'faq-trans-uk-UA', label: 'UA FAQ', type: 'faq-translation', color: 'green', iso: 'uk-UA', taskKey: 'UA', isFaq: true },
    ]);
  });

  it('historical content, a store with no en-* language: the master is languages[0]', () => {
    const got = deriveTabDescriptors({
      appMode: 'generator', storeName: 'Drukarka 3D', mainHtmlLocale: undefined,
      translations: { UA: html('uk') }, faqArtifacts: {}, labels: LABELS,
    });
    expect(got).toEqual([
      { id: 'html', label: '<BASE>', type: 'english', color: 'blue', iso: 'pl-PL', isFaq: false },
      { id: 'trans-UA', label: 'UA <TR>', type: 'translation', color: 'purple', iso: 'uk-UA', taskKey: 'UA', isFaq: false },
    ]);
  });

  it('SEO-only content (no translations, no FAQ, no locale) shows just the master tab', () => {
    const got = deriveTabDescriptors({
      appMode: 'seo-generator', storeName: 'EXPERT3D', mainHtmlLocale: undefined, translations: {}, faqArtifacts: undefined, labels: LABELS,
    });
    expect(got).toEqual([{ id: 'html', label: '<BASE>', type: 'english', color: 'blue', iso: 'en-ES', isFaq: false }]);
  });

  it('the label strings are taken from the context, never hard-coded', () => {
    const got = deriveTabDescriptors(ctx('Drukarka 3D', 'generator', { labels: { uaGenerator: 'U', translation: 'T', baseOutput: 'B', baseFaqTab: 'F' } }));
    expect(got.map(t => t.label)).toEqual(['PL T', 'PL FAQ', 'B', 'F']);
  });
});

describe('UA Description (AC-4 UI side, FR-4): one description tab, then a FAQ tab per language with an entry', () => {
  it.each(STORES.map(s => [s] as const))('%s: the description tab, then uk-UA FAQ first, then the other languages in registry order', (store) => {
    const c = ctx(store, 'ua-generator', { translations: {} });
    expect(deriveTabDescriptors(c)).toEqual(EXPECTED[store].ua);
  });

  it('shows exactly one FAQ tab per store language (not just uk-UA): count equals the number of languages', () => {
    for (const store of STORES) {
      const tabs = deriveTabDescriptors(ctx(store, 'ua-generator', { translations: {} }));
      expect(tabs.filter(t => t.isFaq), store).toHaveLength(STORE_REGISTRY[store].languages.length);
    }
  });

  it('only the uk-UA FAQ present (the pre-Story result): description tab and one FAQ tab', () => {
    const got = deriveTabDescriptors(ctx('EXPERT3D', 'ua-generator', { translations: {}, faqArtifacts: { 'uk-UA': '<h3>Q?</h3><p>a</p>' } }));
    expect(got).toEqual([UA_DESC, UA_FAQ]);
  });

  it('no FAQ at all: just the description tab', () => {
    expect(deriveTabDescriptors(ctx('EXPERT3D', 'ua-generator', { translations: {}, faqArtifacts: {} }))).toEqual([UA_DESC]);
    expect(deriveTabDescriptors(ctx('EXPERT3D', 'ua-generator', { translations: {}, faqArtifacts: undefined }))).toEqual([UA_DESC]);
  });

  it('a skipped language has no tab; the others are kept in order', () => {
    const c = ctx('EXPERT3D', 'ua-generator', { translations: {} });
    const faqArtifacts = { ...c.faqArtifacts }; delete faqArtifacts!['es-ES'];
    expect(deriveTabDescriptors({ ...c, faqArtifacts })).toEqual([UA_DESC, UA_FAQ, FTR.enES, FTR.ptPT]);
  });
});

describe('FAQ Generator (AC-13 UI side, plan R9): FAQ tabs only, uk-UA first', () => {
  it.each(STORES.map(s => [s] as const))('%s: no description tab, no translation tab, no seo tab; the FAQ tabs in order', (store) => {
    // translations is {} exactly as AC-13 leaves it after a standalone run
    const tabs = deriveTabDescriptors(ctx(store, 'faq-generator', { translations: {} }));
    expect(tabs).toEqual(EXPECTED[store].faq);
    expect(tabs.some(t => t.id === 'html' || t.id.startsWith('trans-') || t.id === 'seo')).toBe(false);
    expect(tabs.every(t => t.isFaq)).toBe(true);
  });

  it('even a non-empty translations map (stale state) never produces a description or translation tab', () => {
    const tabs = deriveTabDescriptors(ctx('EXPERT3D', 'faq-generator'));   // fullContent() fills translations
    expect(tabs).toEqual(EXPECTED['EXPERT3D'].faq);
  });

  it('the master FAQ tab takes the baseFaqTab label from the context', () => {
    const [first] = deriveTabDescriptors(ctx('EXPERT3D', 'faq-generator', { translations: {} }));
    expect(first).toEqual({ id: 'faq-html', label: '<BASE-FAQ>', type: 'faq-english', color: 'green', iso: 'uk-UA', isFaq: true });
  });

  it('a language with no entry yields no tab for it (FR-4 failure path); a master-only result is one tab', () => {
    const c = ctx('EXPERT3D', 'faq-generator', { translations: {} });
    const faqArtifacts = { ...c.faqArtifacts }; delete faqArtifacts!['pt-PT'];
    expect(deriveTabDescriptors({ ...c, faqArtifacts })).toEqual([FBASE, FTR.enES, FTR.esES]);
    expect(deriveTabDescriptors({ ...c, faqArtifacts: { 'uk-UA': '<h3>Q?</h3><p>a</p>' } })).toEqual([FBASE]);
  });

  it('a failed master run (empty faqArtifacts) shows no tab at all', () => {
    expect(deriveTabDescriptors(ctx('EXPERT3D', 'faq-generator', { translations: {}, faqArtifacts: {} }))).toEqual([]);
    expect(deriveTabDescriptors(ctx('EXPERT3D', 'faq-generator', { translations: {}, faqArtifacts: undefined }))).toEqual([]);
  });
});

describe('no store: no tabs, in every mode (as the computed does today)', () => {
  it.each(['generator', 'ua-generator', 'faq-generator', 'seo-generator', 'slug-generator'] as AppMode[])('%s', (mode) => {
    expect(deriveTabDescriptors(ctx('EXPERT3D', mode, { storeName: '' }))).toEqual([]);
  });
});

describe('purity', () => {
  it('does not mutate its context and is deterministic', () => {
    const c = ctx('EXPERT3D', 'faq-generator');
    const before = JSON.stringify(c);
    const a = deriveTabDescriptors(c);
    const b = deriveTabDescriptors(c);
    expect(a).toEqual(b);
    expect(JSON.stringify(c)).toBe(before);
  });
});

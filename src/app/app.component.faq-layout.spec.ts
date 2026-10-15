/**
 * US-8.1 (Story v3, Specification v3) - the FAQ Generator screen layout: FR-24 .. FR-28, NFR-9; AC-21 .. AC-26.
 *
 * Source-text and condition-evaluation pins over `app.component.{html,ts}`, in the idiom of
 * `app.component.template-wiring.spec.ts` (the repository has no `AppComponent` spec by standing decision: heavy DI,
 * and `happy-dom` has no layout engine). The file imports nothing a task of this Story creates, no Angular package and
 * not `AppComponent`: it reads the two sources as TEXT, so it carries zero `tsc` diagnostics at every task. It runs under
 * the logic runner (`test:logic`); it is deliberately not named `*.component.spec.ts`.
 *
 * Test titles carry their state so a task can select its own pins (`vitest -t`):
 *   "(owner T<n>)"      red first: fails on the current tree, turned green by task T<n>.
 *   "[baseline-guard]"  green on the current tree by design: a FR-28 / NFR-9 regression guard or a premise assertion;
 *                       it exists to fail if a task goes wrong. No guard title contains "owner T" and no red-first
 *                       title contains the guard token.
 *
 * What is NOT here: AC-22's geometric clause (the active FAQ panel's top edge sits one container padding below the tab
 * bar, not vertically centred). There is no layout engine in this repository, so it is a MANUAL browser check by the
 * operator at HUMAN_PR_APPROVAL, not an automated pin and not pipeline evidence. The class-token pins below are only its
 * structural proxy.
 *
 * Matching discipline (plan review v4, N3): keys are matched exactly (`supplementalContent` is a prefix of
 * `supplementalContentRequired`), the icon is looked up inside the empty-state block only (`fa-file-code` occurs twice in
 * the template), and the FR-25 slice starts after the `</header>` that closes the tab bar (`@for (tab of tabDescriptors()`
 * occurs in the header and again in the result view). Every group starts with premise assertions so a mis-slice fails
 * loudly instead of passing vacuously.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (f: string): string => readFileSync(join(process.cwd(), f), 'utf8');
/** Windows line endings normalised, so the block patterns do not depend on the checkout's EOL. */
const lf = (text: string): string => text.split('\r\n').join('\n');

const html = lf(read('src/app/app.component.html'));
const ts = lf(read('src/app/app.component.ts'));
const sourceInputHtml = lf(read('src/app/components/source-input/source-input.component.html'));
const sourceInputTs = lf(read('src/app/components/source-input/source-input.component.ts'));

// ---------------------------------------------------------------------------------------------------------------------
// Extraction helpers (text only)
// ---------------------------------------------------------------------------------------------------------------------

/** Index of the delimiter that closes the one opened at `open` (`(`/`{`), or -1. Balanced scan, quotes ignored. */
function closingIndex(text: string, open: number): number {
  const opener = text[open];
  const closer = opener === '(' ? ')' : '}';
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === opener) depth++;
    else if (text[i] === closer) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

interface IfBlock { start: number; end: number; condition: string; text: string }

/** The `@if (...) { ... }` block whose text contains `marker` (nearest `@if (` before the marker), or null. */
function ifBlockContaining(text: string, marker: string): IfBlock | null {
  const at = text.indexOf(marker);
  if (at < 0) return null;
  const start = text.lastIndexOf('@if (', at);
  if (start < 0) return null;
  const parenOpen = start + '@if '.length;
  const parenClose = closingIndex(text, parenOpen);
  if (parenClose < 0) return null;
  const braceOpen = text.indexOf('{', parenClose);
  if (braceOpen < 0) return null;
  const braceClose = closingIndex(text, braceOpen);
  if (braceClose < 0) return null;
  return {
    start,
    end: braceClose + 1,
    condition: text.slice(parenOpen + 1, parenClose),
    text: text.slice(start, braceClose + 1),
  };
}

/** The FAQ form block: from its `@else if` to the next sibling `@else` (same idiom as the wiring spec). */
function formBlock(mode: string): string {
  const start = html.search(new RegExp(`\\n {4}@else if \\(appMode\\(\\) === '${mode}'\\)`));
  if (start < 0) return '';
  const rest = html.slice(start + 1);
  const end = rest.slice(10).search(/\n {4}@else/);
  return end < 0 ? rest : rest.slice(0, end + 10);
}

/** The shared `<ng-template #generatorForm>` (Generator and UA Description form). */
function generatorFormBlock(): string {
  const start = html.indexOf('<ng-template #generatorForm>');
  if (start < 0) return '';
  const end = html.indexOf('</ng-template>', start);
  return end < 0 ? '' : html.slice(start, end);
}

/** Every `<app-source-input ... />` element of a block, in document order. */
function sourceInputs(block: string): string[] {
  return [...block.matchAll(/<app-source-input\b[\s\S]*?\/>/g)].map(m => m[0]);
}

/** The source-input element that writes `signalName` (matched on its exact `(valueChange)` target). */
function inputWriting(block: string, signalName: string): string | undefined {
  return sourceInputs(block).find(el => el.includes(`(valueChange)="${signalName}.set($event)"`));
}

/** `uiLabels().supplementalContent` as an EXACT key: not a prefix of `supplementalContentRequired`. */
const SHARED_KEY_USE = /uiLabels\(\)\.supplementalContent(?![\w$])/g;
const NEW_KEY_USE = /uiLabels\(\)\.supplementalContentRequired(?![\w$])/g;

/** The `en` block of TRANSLATIONS: from `const TRANSLATIONS` to the `uk` block. */
function enBlock(): string {
  const start = ts.indexOf('const TRANSLATIONS');
  const end = ts.indexOf('\n  uk: {', start);
  return start < 0 || end < 0 ? '' : ts.slice(start, end);
}
/** The `uk` block of TRANSLATIONS: from `\n  uk: {` to the first `\n};` after it. */
function ukBlock(): string {
  const start = ts.indexOf('\n  uk: {');
  const end = start < 0 ? -1 : ts.indexOf('\n};', start);
  return start < 0 || end < 0 ? '' : ts.slice(start, end);
}
/** Top-level keys of a TRANSLATIONS block (four-space indent), in order, duplicates kept. */
function keysOf(block: string): string[] {
  return [...block.matchAll(/^ {4}(\w+):/gm)].map(m => m[1]);
}
/** The runtime string of `key` in a block (single- or double-quoted source literal, `\x` escapes resolved), or null. */
function runtimeValue(block: string, key: string): string | null {
  const m = block.match(new RegExp(`^ {4}${key}:\\s*(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)")`, 'm'));
  if (!m) return null;
  const raw = m[1] ?? m[2] ?? '';
  return raw.replace(/\\(.)/g, '$1');
}

// ---------------------------------------------------------------------------------------------------------------------
// FR-24 / FR-28: the empty-state condition, extracted from the template and EVALUATED
// ---------------------------------------------------------------------------------------------------------------------

/** The `@if` block that renders the "no content yet" empty state (the one that holds `noContentYet`). */
const emptyStateBlock = (): IfBlock => {
  const block = ifBlockContaining(html, 'uiLabels().noContentYet');
  if (!block) throw new Error('empty-state @if block (noContentYet) not found in app.component.html');
  return block;
};

interface Stub { appMode: string; mainHtmlUa: string; seoData: unknown; slugData: unknown; faqArtifacts?: Record<string, string> | null; isGenerating: boolean }

/**
 * Evaluate the template condition with stubbed `appMode()`, `content()` and `isGenerating()`. Fails closed: a condition
 * that is not made only of those three reads, `!`, `&&`, `||`, `!==`/`===`, parentheses and string literals throws, as
 * does a syntax error - the test then FAILS, it never skips. Executes repository-owned template text only.
 */
function evalCondition(condition: string, s: Stub): boolean {
  if (!/^[\w\s().!&|=',\-]+$/.test(condition)) throw new Error(`empty-state condition is not a plain JS expression: ${condition}`);
  const fn = new Function('appMode', 'content', 'isGenerating', `return (${condition});`);
  const content = () => ({ mainHtmlUa: s.mainHtmlUa, seoData: s.seoData, slugData: s.slugData, faqArtifacts: s.faqArtifacts });
  return Boolean(fn(() => s.appMode, content, () => s.isGenerating));
}

/** Literal copy of TODAY's condition (before any v3 change). It is not re-derived from the template. */
const oracleToday = (s: Stub): boolean =>
  s.appMode !== 'generator' && !s.mainHtmlUa && !s.seoData && !s.slugData && !s.isGenerating;

const FAQ_RESULT = { 'en-GB': '<h3>Q</h3><p>A</p>', 'de-DE': '<h3>F</h3><p>A</p>' };

/** State grid shared by the oracle comparison: every combination, trap states included. */
function stateGrid(appMode: string): Stub[] {
  const grid: Stub[] = [];
  for (const mainHtmlUa of ['', '<h1>x</h1>'])
    for (const seoData of [null, { metaTitle: 't' }])
      for (const slugData of [null, { slug: 's' }])
        // `undefined`/`{}`: never ran or no FAQ stored; populated: a stale FAQ-only result left in the shared `content`
        // signal while the output fields are empty (the trap state of plan risk R13).
        for (const faqArtifacts of [undefined, {}, FAQ_RESULT])
          for (const isGenerating of [false, true])
            grid.push({ appMode, mainHtmlUa, seoData, slugData, faqArtifacts, isGenerating });
  return grid;
}

describe('FR-24 / AC-21 - premises: the empty-state block and its condition are found and evaluable', () => {
  it('[baseline-guard] FR-24 noContentYet and fillFormStart each occur once in the template, in one block that also holds its fa-file-code icon', () => {
    const block = emptyStateBlock();
    expect(block.text.length, 'empty-state block is empty').toBeGreaterThan(80);
    expect([...html.matchAll(/uiLabels\(\)\.noContentYet\b/g)]).toHaveLength(1);
    expect([...html.matchAll(/uiLabels\(\)\.fillFormStart\b/g)]).toHaveLength(1);
    expect(block.text).toContain('uiLabels().fillFormStart');
    // Scoped to the block: `fa-file-code` also occurs on an unrelated download button elsewhere in the template.
    expect([...block.text.matchAll(/fa-file-code/g)]).toHaveLength(1);
  });

  it('[baseline-guard] FR-24 the condition is a plain expression of appMode(), content() and isGenerating() only', () => {
    const { condition } = emptyStateBlock();
    expect(condition.length).toBeGreaterThan(20);
    expect(condition).toMatch(/^[\w\s().!&|=',\-]+$/);
    const reads = new Set([...condition.matchAll(/([A-Za-z_]\w*)\(\)/g)].map(m => m[1]));
    expect([...reads].sort()).toEqual(['appMode', 'content', 'isGenerating']);
    // The evaluator itself works: today's behaviour for a plain generator-less mode is computed, not thrown.
    expect(() => evalCondition(condition, stateGrid('seo-generator')[0])).not.toThrow();
  });

  it('[baseline-guard] FR-24 the condition holds no data-derived exclusion (no hasOutput, hasFaqOutput or faqArtifacts)', () => {
    const { condition } = emptyStateBlock();
    expect(condition.length).toBeGreaterThan(20);
    expect(condition).not.toMatch(/hasOutput|hasFaqOutput|faqArtifacts/);
  });
});

describe('FR-24 / AC-21 - the FAQ Generator never shows the empty state', () => {
  it('(owner T15) FR-24 before a run: faq-generator, empty content, not generating -> the empty-state condition is false', () => {
    const { condition } = emptyStateBlock();
    const stub: Stub = { appMode: 'faq-generator', mainHtmlUa: '', seoData: null, slugData: null, faqArtifacts: undefined, isGenerating: false };
    expect(evalCondition(condition, stub)).toBe(false);
  });

  it('(owner T15) FR-24 after a FAQ-only run: faq-generator, mainHtmlUa empty, seoData and slugData null, faqArtifacts populated -> false', () => {
    const { condition } = emptyStateBlock();
    const stub: Stub = { appMode: 'faq-generator', mainHtmlUa: '', seoData: null, slugData: null, faqArtifacts: FAQ_RESULT, isGenerating: false };
    expect(evalCondition(condition, stub)).toBe(false);
  });

  it('(owner T15) FR-24 after a run that stored no FAQ: faq-generator, every output field empty, faqArtifacts empty -> false', () => {
    const { condition } = emptyStateBlock();
    const stub: Stub = { appMode: 'faq-generator', mainHtmlUa: '', seoData: null, slugData: null, faqArtifacts: {}, isGenerating: false };
    expect(evalCondition(condition, stub)).toBe(false);
  });

  it('(owner T15) FR-24 the exclusion is by mode: the condition text contains appMode() !== \'faq-generator\'', () => {
    const { condition } = emptyStateBlock();
    expect(condition).toContain("appMode() !== 'faq-generator'");
  });

  it('[baseline-guard] FR-24 during a run: faq-generator with isGenerating true -> false for every content state (already false today)', () => {
    const { condition } = emptyStateBlock();
    const during = stateGrid('faq-generator').filter(s => s.isGenerating);
    expect(during.length).toBeGreaterThan(10);
    for (const s of during) expect(evalCondition(condition, s), JSON.stringify(s)).toBe(false);
  });
});

describe('FR-28 / AC-26 - every other mode keeps today\'s empty state, exactly', () => {
  it.each(['generator', 'ua-generator', 'seo-generator', 'slug-generator'])(
    '[baseline-guard] FR-28 %s: the evaluated empty-state condition equals today\'s condition over the whole state grid, trap states included',
    mode => {
      const { condition } = emptyStateBlock();
      const grid = stateGrid(mode);
      expect(grid.length).toBe(48);
      for (const s of grid) expect(evalCondition(condition, s), JSON.stringify(s)).toBe(oracleToday(s));
    },
  );

  it('[baseline-guard] FR-28 the oracle discriminates: for seo-generator it is true before a run and false once seoData is set (so a constant condition cannot pass)', () => {
    const before = { appMode: 'seo-generator', mainHtmlUa: '', seoData: null, slugData: null, faqArtifacts: undefined, isGenerating: false };
    expect(oracleToday(before)).toBe(true);
    expect(oracleToday({ ...before, seoData: { metaTitle: 't' } })).toBe(false);
    expect(oracleToday({ ...before, appMode: 'generator' })).toBe(false);
    // The trap: a stale FAQ-only result must NOT hide the empty state of another mode.
    expect(oracleToday({ ...before, appMode: 'slug-generator', faqArtifacts: FAQ_RESULT })).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// FR-28 / AC-26: forms and labels of the other modes
// ---------------------------------------------------------------------------------------------------------------------

describe('FR-28 / AC-26 - the Generator and UA Description form keeps its Supplemental Content label and field order', () => {
  it('[baseline-guard] FR-28 premise: generatorForm, the SEO form and the Slug form blocks are found and non-trivial', () => {
    expect(generatorFormBlock().length).toBeGreaterThan(500);
    expect(formBlock('seo-generator').length).toBeGreaterThan(500);
    expect(formBlock('slug-generator').length).toBeGreaterThan(300);
  });

  it('[baseline-guard] FR-28 generatorForm: the Supplemental input is bound to uiLabels().supplementalContent (exact key) and has no [required]', () => {
    const el = inputWriting(generatorFormBlock(), 'supplementalContent');
    expect(el, 'Supplemental input not found in generatorForm').toBeDefined();
    expect([...el!.matchAll(SHARED_KEY_USE)]).toHaveLength(1);
    expect(el).not.toMatch(NEW_KEY_USE);
    expect(el).not.toContain('[required]');
  });

  it('[baseline-guard] FR-28 generatorForm: the order description.set, specs.set, supplementalContent.set is unchanged', () => {
    const form = generatorFormBlock();
    const at = ['description', 'specs', 'supplementalContent'].map(n => form.indexOf(`(valueChange)="${n}.set($event)"`));
    expect(at.every(i => i >= 0), `anchors missing: ${at}`).toBe(true);
    expect(at[0]).toBeLessThan(at[1]);
    expect(at[1]).toBeLessThan(at[2]);
  });

  it('[baseline-guard] FR-28 generatorForm, the SEO form and the Slug form do not bind the new FAQ-only key', () => {
    const blocks = { generatorForm: generatorFormBlock(), seo: formBlock('seo-generator'), slug: formBlock('slug-generator') };
    for (const [name, block] of Object.entries(blocks)) {
      expect(block.length, `${name} block is empty`).toBeGreaterThan(300);
      expect(block, name).not.toContain('supplementalContentRequired');
    }
  });

  it("[baseline-guard] FR-28 en keeps supplementalContent 'Supplemental Content (Optional)'", () => {
    expect(enBlock().length).toBeGreaterThan(1000);
    expect(runtimeValue(enBlock(), 'supplementalContent')).toBe('Supplemental Content (Optional)');
  });

  it("[baseline-guard] FR-28 uk keeps supplementalContent 'Додатковий контент (Опціонально)'", () => {
    expect(ukBlock().length).toBeGreaterThan(1000);
    expect(runtimeValue(ukBlock(), 'supplementalContent')).toBe('Додатковий контент (Опціонально)');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// FR-25 / AC-22: structure only (the geometric clause is a manual browser check, see the file header)
// ---------------------------------------------------------------------------------------------------------------------

/** The text from the `</header>` that closes the tab bar to the first result-view `@for (tab of tabDescriptors()`. */
function betweenTabBarAndResult(): string {
  const bar = html.indexOf('aria-label="Generated content tabs"');
  if (bar < 0) return '';
  const headerEnd = html.indexOf('</header>', bar);
  if (headerEnd < 0) return '';
  const from = headerEnd + '</header>'.length;
  const resultFor = html.indexOf('@for (tab of tabDescriptors()', from);
  return resultFor < 0 ? '' : html.slice(from, resultFor);
}

/** The slice with the three allowed siblings removed: the validation panel, the repair panel and the empty-state block. */
function slimmedBetween(): string {
  let slice = betweenTabBarAndResult();
  for (const marker of ['validationIssues().length > 0', 'repairReport().length > 0', 'uiLabels().noContentYet']) {
    const block = ifBlockContaining(slice, marker);
    if (block) slice = slice.slice(0, block.start) + slice.slice(block.end);
  }
  return slice;
}

const classTokens = (tag: string): string[] => (tag.match(/\sclass="([^"]*)"/)?.[1] ?? '').split(/\s+/).filter(Boolean);

describe('FR-25 / AC-22 - the result sits directly under the version tabs (structure)', () => {
  it('[baseline-guard] FR-25 premise: the slice after the tab bar\'s </header> up to the result @for is found and holds the three known siblings', () => {
    const slice = betweenTabBarAndResult();
    expect(slice.length).toBeGreaterThan(500);
    // It starts after the header that closes the tab bar, so it contains neither of the two `@for (tab of tabDescriptors()`.
    expect(slice).not.toContain('@for (tab of tabDescriptors()');
    expect(slice).not.toContain('role="tablist"');
    expect(slice).toContain('validationIssues().length > 0');
    expect(slice).toContain('repairReport().length > 0');
    expect(slice).toContain('uiLabels().noContentYet');
  });

  it('[baseline-guard] FR-25 nothing but the scroll container\'s opening tag remains once the validation panel, the repair panel and the empty-state block are removed', () => {
    const rest = slimmedBetween().trim();
    expect(rest).toMatch(/^<div class="[^"]*">$/);
  });

  it('[baseline-guard] FR-25 the scroll container carries no flex (whole token), grid, items-*, justify-*, h-full or min-h-* class', () => {
    const tokens = classTokens(slimmedBetween().trim());
    expect(tokens.length, 'container class list is empty').toBeGreaterThan(0);
    expect(tokens).toContain('overflow-y-auto');
    expect(tokens.filter(t => /^(flex|grid|items-.+|justify-.+|h-full|min-h-.+)$/.test(t))).toEqual([]);
  });

  it('[baseline-guard] FR-25 the FAQ result panel root carries no h-full, min-h-*, justify-*, items-center, mt-* or pt-* class', () => {
    const open = ifBlockContaining(html, "tab.type === 'faq-english' || tab.type === 'faq-translation'");
    expect(open, 'FAQ result panel block not found').not.toBeNull();
    const root = open!.text.match(/<div role="tabpanel"[^>]*>/)?.[0];
    expect(root, 'FAQ panel root div not found').toBeDefined();
    const tokens = classTokens(root!);
    expect(tokens).toContain('max-w-5xl');
    expect(tokens.filter(t => /^(h-full|min-h-.+|justify-.+|items-center|mt-.+|pt-.+)$/.test(t))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// FR-26 / AC-23: the FAQ form field order
// ---------------------------------------------------------------------------------------------------------------------

const FAQ_ANCHORS = [
  ['Store select', '(change)="onFaqWebsiteChange($event)"'],
  ['Product Name input', '(input)="updateFaqProductName($event)"'],
  ['Supplemental Content', '(valueChange)="faqSupplementalContent.set($event)"'],
  ['Original Description', '(valueChange)="faqDescription.set($event)"'],
  ['Tech Specs', '(valueChange)="faqSpecs.set($event)"'],
  ['Deep Thinking toggle', 'toggleSeoThinking()'],
] as const;

describe('FR-26 / AC-23 - FAQ Generator field order: Product Name, Supplemental Content, Original Description, Tech Specs', () => {
  it('[baseline-guard] FR-26 premise: the FAQ form block is found, holds each of the six anchors exactly once and exactly three source inputs', () => {
    const form = formBlock('faq-generator');
    expect(form.length).toBeGreaterThan(1000);
    for (const [name, anchor] of FAQ_ANCHORS) expect(form.split(anchor).length - 1, `${name} anchor: ${anchor}`).toBe(1);
    expect(sourceInputs(form)).toHaveLength(3);
  });

  it('(owner T16) FR-26 the anchors appear in this order: Store, Product Name, Supplemental Content, Original Description, Tech Specs, Deep Thinking toggle', () => {
    const form = formBlock('faq-generator');
    const named = FAQ_ANCHORS.map(([name, anchor]) => ({ name, at: form.indexOf(anchor) }));
    expect(named.every(a => a.at >= 0), 'an anchor is missing').toBe(true);
    const order = [...named].sort((a, b) => a.at - b.at).map(a => a.name);
    expect(order).toEqual(FAQ_ANCHORS.map(([name]) => name));
  });

  it('(owner T16) FR-26 the first source input of the FAQ form is the Supplemental Content one (it is first among the three source inputs)', () => {
    const inputs = sourceInputs(formBlock('faq-generator'));
    expect(inputs.length).toBeGreaterThan(0);
    expect(inputs[0]).toContain('(valueChange)="faqSupplementalContent.set($event)"');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// FR-27 / AC-24, AC-25: the "Required" label and the required marker
// ---------------------------------------------------------------------------------------------------------------------

describe('FR-27 / AC-24 - the FAQ Supplemental Content label reads "Required", from a FAQ-only key', () => {
  it('(owner T17) FR-27 the FAQ Supplemental source input is labelled from uiLabels().supplementalContentRequired', () => {
    const el = inputWriting(formBlock('faq-generator'), 'faqSupplementalContent');
    expect(el, 'FAQ Supplemental input not found').toBeDefined();
    expect(el).toContain('[label]="uiLabels().supplementalContentRequired"');
    expect(el).not.toMatch(SHARED_KEY_USE);
  });

  it('(owner T17) FR-27 / FR-28 the shared key uiLabels().supplementalContent is used exactly once in the whole template, inside generatorForm', () => {
    expect([...html.matchAll(SHARED_KEY_USE)]).toHaveLength(1);
    expect([...generatorFormBlock().matchAll(SHARED_KEY_USE)]).toHaveLength(1);
  });

  it('(owner T17) FR-27 the new key is read exactly once in the whole template, in the FAQ form', () => {
    expect([...html.matchAll(NEW_KEY_USE)]).toHaveLength(1);
    expect([...formBlock('faq-generator').matchAll(NEW_KEY_USE)]).toHaveLength(1);
  });

  it("(owner T14) FR-27 en carries supplementalContentRequired: 'Supplemental Content (Required)'", () => {
    expect(runtimeValue(enBlock(), 'supplementalContentRequired')).toBe('Supplemental Content (Required)');
  });

  it('(owner T14) FR-27 the en label contains no "Optional"', () => {
    const value = runtimeValue(enBlock(), 'supplementalContentRequired');
    expect(value, 'en supplementalContentRequired is missing').not.toBeNull();
    expect(value).not.toMatch(/optional/i);
  });

  it("(owner T14) FR-27 uk carries supplementalContentRequired = \"Додатковий контент (Обов'язково)\" with the ASCII apostrophe U+0027", () => {
    const value = runtimeValue(ukBlock(), 'supplementalContentRequired');
    expect(value).toBe("Додатковий контент (Обов'язково)");
    const at = value!.indexOf('Обов') + 'Обов'.length;
    expect(value!.charCodeAt(at).toString(16)).toBe('27');
  });

  it('(owner T14) FR-27 the uk label has no U+2019 or U+02BC apostrophe, no "Опціонально", no "Optional", and differs from the English label', () => {
    const value = runtimeValue(ukBlock(), 'supplementalContentRequired');
    expect(value, 'uk supplementalContentRequired is missing').not.toBeNull();
    expect(value).not.toContain('’');
    expect(value).not.toContain('ʼ');
    expect(value).not.toContain('Опціонально');
    expect(value).not.toMatch(/optional/i);
    expect(value).not.toBe(runtimeValue(enBlock(), 'supplementalContentRequired'));
  });

  it('(owner T14) FR-27 supplementalContentRequired is present in BOTH TRANSLATIONS blocks (the new key is not one-sided)', () => {
    expect(keysOf(enBlock())).toContain('supplementalContentRequired');
    expect(keysOf(ukBlock())).toContain('supplementalContentRequired');
  });

  it('[baseline-guard] FR-27 whole-dictionary parity: the en and uk TRANSLATIONS blocks have the same key set, no one-sided key and no duplicate', () => {
    const en = keysOf(enBlock());
    const uk = keysOf(ukBlock());
    // 170 keys in each block on the baseline; the new key makes it 171 in each, never 171 against 170.
    expect(en.length).toBeGreaterThanOrEqual(170);
    expect(uk.length).toBeGreaterThanOrEqual(170);
    expect(new Set(en).size, 'duplicate key in en').toBe(en.length);
    expect(new Set(uk).size, 'duplicate key in uk').toBe(uk.length);
    expect(en.filter(k => !uk.includes(k)), 'keys only in en').toEqual([]);
    expect(uk.filter(k => !en.includes(k)), 'keys only in uk').toEqual([]);
  });
});

describe('FR-27 / AC-24, AC-25 - the required marker "*" stays rendered from the shared component given [required]="true"', () => {
  it('[baseline-guard] FR-27 the FAQ Supplemental source input is passed [required]="true"', () => {
    const el = inputWriting(formBlock('faq-generator'), 'faqSupplementalContent');
    expect(el, 'FAQ Supplemental input not found').toBeDefined();
    expect(el).toContain('[required]="true"');
  });

  it('[baseline-guard] FR-27 the source-input component renders the "*" marker next to the label when its required input is set, and defaults to not required', () => {
    expect(sourceInputHtml).toMatch(/\{\{\s*label\s*\}\}\s*@if\s*\(required\)\s*\{\s*<span[^>]*>\s*\*\s*<\/span>\s*\}/);
    expect(sourceInputTs).toMatch(/@Input\(\)\s+required\s*=\s*false/);
  });
});

/**
 * US-2.2 T14 — wiring pins for `app.component.{html,ts}` (AC-1, AC-9, OD-6).
 *
 * There is no `AppComponent` spec in this repository and the plan rejects adding one (heavy DI,
 * rejected alternative 9); the dropdown behaviour is tested on the extracted component
 * (`content-template-select.component.spec.ts`). What only the parent can guarantee is checked here as
 * source-text pins, deliberately narrow: each pin names a requirement, not an implementation detail.
 * They run under the logic runner (not a `*.component.spec.ts`), where Angular compilation is absent.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (f: string) => readFileSync(join(process.cwd(), 'src', 'app', f), 'utf8');
const html = read('app.component.html');
const ts = read('app.component.ts');
const types = read('types.ts');

/** Every element of the extracted dropdown component in the parent template. */
const usages = [...html.matchAll(/<[a-z-]*content-template-select\b[^>]*>/gs)].map(m => m[0]);

describe('AC-1 — both forms use the one dropdown component; the old markup is gone', () => {
  it('renders the dropdown component exactly twice: Generator form and SEO-only form', () => {
    expect(usages).toHaveLength(2);
  });
  it('no inline "Select Template..." option remains in the parent template', () => {
    expect(html).not.toMatch(/Select Template\.\.\./);
  });
  it('the parent no longer renders a raw consumables option or label', () => {
    expect(html).not.toContain('consumablesTemplateName');
    expect(html).not.toMatch(/consumables/i);
  });
});

describe('AC-9 — the checkbox is a Generator-form-only control bound to Accessories', () => {
  it('exactly one of the two usages enables the functionality toggle, and its condition names accessories', () => {
    const enabling = usages.filter(u => /showFunctionalityToggle/.test(u));
    expect(enabling).toHaveLength(1);
    expect(enabling[0]).toMatch(/accessories/);
  });
  it('the SEO-only usage never binds the toggle or the flag', () => {
    const other = usages.filter(u => !/showFunctionalityToggle/.test(u));
    expect(other).toHaveLength(1);
    expect(other[0]).not.toMatch(/functionality/i);
  });
});

describe('OD-6 (as resolved in the plan) — the flag is unchecked by default, reset on template change, never persisted', () => {
  it('declares includeAccessoriesFunctionality as a signal defaulting to false', () => {
    expect(ts).toMatch(/include\w*Functionality\w*\s*=\s*signal(<[^>]*>)?\(\s*false\s*\)/);
  });
  it('the template-change handler resets it to false', () => {
    const handler = ts.match(/onTemplateChange\s*\([^)]*\)\s*(?::\s*void\s*)?\{[\s\S]*?\n  \}/);
    expect(handler, 'onTemplateChange handler not found').not.toBeNull();
    expect(handler![0]).toMatch(/include\w*Functionality\w*\.set\(\s*false\s*\)/);
  });
  it('is not part of the persisted form state', () => {
    const persisted = ts.match(/seo_gen_form_state[\s\S]{0,1500}/);
    if (persisted) expect(persisted[0]).not.toMatch(/include\w*Functionality/);
  });
  it('the Generator input builder plumbs includeFunctionality', () => {
    const occurrences = [...ts.matchAll(/includeFunctionality/g)].length;
    expect(occurrences).toBeGreaterThanOrEqual(1);
  });
});

describe('FR-1 — Full description keeps its identity: an empty selection, no templateId', () => {
  it('the default selection signal is the empty string', () => {
    expect(ts).toMatch(/selectedTemplateId\s*=\s*signal(<[^>]*>)?\(\s*''\s*\)/);
  });
  it('the type module holds no consumables entry', () => {
    expect(types).not.toMatch(/consumables/i);
  });
  it('ProductInput declares the optional includeFunctionality flag', () => {
    expect(types).toMatch(/includeFunctionality\?\s*:\s*boolean/);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// US-8.1 — the standalone FAQ Generator mode (AC-10, AC-11, AC-12; FR-15, FR-16, FR-17).
//
// TABLE B spec: still source-text pins only (this file reads the component as strings and imports
// nothing a task of this Story creates), so it has no compile diagnostic at any task. Every pin below is
// RED AT RUNTIME until its owner task lands: T9 (AppMode, TOOL_LABEL), T11 (component state), T12
// (template). Pins are deliberately narrow - each names a requirement, not an implementation detail -
// and RECONCILIATION should read them critically: they prove the wiring is present, not that the
// rendered page works (that is a manual QUALITY_GATE concern, see the test strategy).
// ════════════════════════════════════════════════════════════════════════════════════════════════════

/** The sources with Windows line endings normalised, so the block patterns below do not depend on the checkout's EOL. */
const lf = (text: string): string => text.split('\r\n').join('\n');
const tsLf = lf(ts);
const htmlLf = lf(html);
const typesLf = lf(types);
/** First match of `re` in `text`, or '' - so a missing block fails an assertion with a message, not at load. */
const blockOf = (text: string, re: RegExp): string => text.match(re)?.[0] ?? '';

describe('US-8.1 T9 / AC-10 / FR-15 — the FAQ Generator is a registered mode with a feedback tool label', () => {
  it('AppMode includes "faq-generator"', () => {
    expect(blockOf(typesLf, /export type AppMode\s*=[^;]*;/)).toContain("'faq-generator'");
  });

  it('TOOL_LABEL (the feedback form "where did it happen" field) maps it to "FAQ Generator"', () => {
    const block = blockOf(tsLf, /const TOOL_LABEL[\s\S]*?\n\};/);
    expect(block, 'TOOL_LABEL block not found').not.toBe('');
    expect(block).toMatch(/'faq-generator'\s*:\s*'FAQ Generator'/);
  });
});

describe('US-8.1 T11 / AC-10 — the mode label "FAQ Generator" exists in BOTH UI languages', () => {
  const enBlock = tsLf.slice(tsLf.indexOf('const TRANSLATIONS'), tsLf.indexOf('\n  uk: {'));
  const ukBlock = blockOf(tsLf.slice(tsLf.indexOf('\n  uk: {')), /[\s\S]*?\n\};/);

  it('premise: both label maps were located', () => {
    expect(enBlock.length).toBeGreaterThan(500);
    expect(ukBlock.length).toBeGreaterThan(500);
  });
  it('the English label map carries "FAQ Generator"', () => {
    expect(enBlock).toContain('FAQ Generator');
  });
  it('the Ukrainian label map carries "FAQ Generator" too', () => {
    expect(ukBlock).toContain('FAQ Generator');
  });
});

describe('US-8.1 T11 / AC-11 / FR-16 — Generate is enabled by the three required fields only', () => {
  it('isFaqFormValid is computed through the pure predicate isFaqFormComplete', () => {
    const block = blockOf(tsLf, /isFaqFormValid\s*=\s*computed\([\s\S]*?\);[ \t]*\n/);
    expect(block, 'isFaqFormValid not found').not.toBe('');
    expect(block).toContain('isFaqFormComplete');
  });

  it('AC-12: the validity computation does not read Original Description or Tech Specs', () => {
    const block = blockOf(tsLf, /isFaqFormValid\s*=\s*computed\([\s\S]*?\);[ \t]*\n/);
    expect(block, 'isFaqFormValid not found').not.toBe('');
    expect(block).not.toMatch(/faq\w*Description|faq\w*Specs/i);
  });

  it('generateFaqOnly() re-checks isFaqFormValid() and RETURNS before any orchestrator call (whitespace-only Supplemental Content makes no LLM call)', () => {
    const body = blockOf(tsLf, /async generateFaqOnly\(\)\s*\{[\s\S]*?\n  \}\n/);
    expect(body, 'generateFaqOnly() not found').not.toBe('');
    const guard = body.indexOf('isFaqFormValid()');
    const call = body.indexOf('this.orchestrator.generateFaqOnly(');
    expect(guard, 'the validity guard').toBeGreaterThanOrEqual(0);
    expect(call, 'the orchestrator call').toBeGreaterThan(guard);
    expect(body.slice(guard, call), 'a return sits between the guard and the call').toMatch(/\breturn\b/);
  });
});

describe('US-8.1 T11 / AC-12 / AC-10 — what generateFaqOnly() hands the orchestrator', () => {
  const body = () => blockOf(tsLf, /async generateFaqOnly\(\)\s*\{[\s\S]*?\n  \}\n/);

  it('Original Description, Tech Specs and Supplemental Content all reach the ProductInput', () => {
    const b = body();
    expect(b, 'generateFaqOnly() not found').not.toBe('');
    expect(b).toMatch(/description\s*:\s*this\.faq\w*\(\)/);
    expect(b).toMatch(/specs\s*:\s*this\.faq\w*\(\)/);
    expect(b).toMatch(/supplementalContent\s*:\s*this\.faq\w*\(\)/);
  });

  it('it uses the shared Extended Thinking value (the same toggle as SEO Meta and Slugs)', () => {
    expect(body()).toMatch(/this\.orchestrator\.generateFaqOnly\([^)]*this\.seoUseThinking\(\)/);
  });
});

describe('US-8.1 T11 — the FAQ Generator is wired into the shared component plumbing', () => {
  it('activeProductName has a faq-generator branch (the download file names follow the active form)', () => {
    const block = blockOf(tsLf, /activeProductName\s*=\s*computed\([\s\S]*?\n  \}\);/);
    expect(block, 'activeProductName not found').not.toBe('');
    expect(block).toContain("case 'faq-generator'");
  });

  it('clearAll() clears the FAQ form and the generated FAQ artifacts', () => {
    const block = blockOf(tsLf, /clearAll\(\)\s*\{[\s\S]*?\n  \}\n/);
    expect(block, 'clearAll() not found').not.toBe('');
    const at = block.indexOf("case 'faq-generator'");
    expect(at, "no case 'faq-generator' in clearAll()").toBeGreaterThanOrEqual(0);
    expect(block.slice(at, at + 1200)).toMatch(/faqArtifacts\s*:\s*\{\}/);
  });

  it('a FAQ-only result counts as output, so the existing download controls appear', () => {
    expect(tsLf).toMatch(/hasOutput\s*=\s*computed\([^;]*(hasFaqOutput|faqArtifacts)/);
  });

  it('_autoSelectTab does not add the SEO tab id for faq-generator', () => {
    const line = tsLf.split('\n').find(l => l.includes("ids.add('seo')")) ?? '';
    expect(line, "the ids.add('seo') line was not found").not.toBe('');
    expect(line).toContain("'faq-generator'");
  });
});

describe('US-8.1 T12 / AC-10 — the FAQ Generator in the template', () => {
  /** The FAQ form block: from its `@else if` to the next sibling `@else`. */
  const faqForm = () => {
    const start = htmlLf.search(/\n {4}@else if \(appMode\(\) === 'faq-generator'\)/);
    if (start < 0) return '';
    const rest = htmlLf.slice(start + 1);
    const end = rest.slice(10).search(/\n {4}@else/);
    return end < 0 ? rest : rest.slice(0, end + 10);
  };

  it('the mode switcher offers a "FAQ Generator" button labelled from the UI label map', () => {
    expect(htmlLf).toMatch(/\(click\)="setMode\('faq-generator'\)"[\s\S]{0,500}?\{\{\s*uiLabels\(\)\.\w+\s*\}\}/);
  });

  it('the FAQ form has the same Extended Thinking toggle as the SEO and Slug forms (shared signal)', () => {
    const form = faqForm();
    expect(form, 'FAQ form block not found').not.toBe('');
    expect(form).toContain('seoUseThinking');
    expect(form).toContain('toggleSeoThinking()');
  });

  it('the FAQ form takes Original Description, Tech Specs and Supplemental Content as text inputs', () => {
    const form = faqForm();
    expect(form, 'FAQ form block not found').not.toBe('');
    expect([...form.matchAll(/<app-source-input\b/g)].length).toBeGreaterThanOrEqual(3);
  });

  it('the FAQ form has no content-template dropdown (the dropdown stays exactly two usages elsewhere)', () => {
    const form = faqForm();
    expect(form, 'FAQ form block not found').not.toBe('');
    expect(form).not.toMatch(/content-template-select/);
    expect(usages).toHaveLength(2);
  });
});

describe('US-8.1 T12 / AC-11 — the Generate button', () => {
  it('calls generateFaqOnly() and is disabled while generating or while the form is invalid', () => {
    const button = blockOf(htmlLf, /<button[^>]*generateFaqOnly\(\)[^>]*>/);
    expect(button, 'the Generate button for the FAQ Generator was not found').not.toBe('');
    expect(button).toContain('[disabled]="isGenerating() || !isFaqFormValid()"');
  });
});

describe('US-8.1 T12 / AC-13 UI side — the result view treats the FAQ Generator like the other standalone tools', () => {
  it('"faq-generator" sits beside "slug-generator" in the three result-view conditions', () => {
    const lines = htmlLf.split('\n').filter(l => /appMode\(\) === 'slug-generator'/.test(l) && /appMode\(\) === 'faq-generator'/.test(l));
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it('the SEO tab button is not offered for the FAQ Generator (no SEO is produced)', () => {
    const at = htmlLf.indexOf('id="tab-seo"');
    expect(at, 'the SEO tab button was not found').toBeGreaterThan(0);
    expect(htmlLf.slice(Math.max(0, at - 300), at)).toContain("'faq-generator'");
  });
});

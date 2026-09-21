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

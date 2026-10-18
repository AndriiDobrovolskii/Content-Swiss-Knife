/**
 * US-9.1 (FR-24, FR-28, FR-31 item 3; AC-9) - source-text wiring pins for `app.component.{html,ts}`, the
 * STATE-SHAPE-INDEPENDENT subset only.
 *
 * There is no `AppComponent` spec in this repository (heavy DI; precedent `app.component.template-wiring.spec.ts`,
 * which says so and pins the parent's wiring as source text under the logic runner). What only the parent can
 * guarantee is checked here as narrow pins.
 *
 * WHAT IS PINNED (the Specification fixes each of these without any answer to H-FR41TEST):
 *  - FR-24 labels: all eight label strings (en and uk, confirmed by the owner, OD-2(c)) exist in
 *    `app.component.ts`. RED until T12.
 *  - FR-24 views (OD-2(b), confirmed): the textareas component is rendered exactly once, in the Generator form,
 *    for every store and every `templateId` - so OUTSIDE the `selectedWebsite()?.name !== 'Expert-3DPrinter'`
 *    image block (Expert-3DPrinter receives the notes, OD-19(2)) and outside any template condition. RED until T12.
 *  - FR-28: the notes are never joined into `supplementalContent` by `buildGeneratorInput`, which keeps passing
 *    `this.supplementalContent()` untouched; `runFaqPipeline` is not edited (its trigger is still
 *    `input.supplementalContent?.trim()`). GREEN ON ARRIVAL, guards.
 *  - FR-31 item 3: the `seo_gen_form_state` restore code and the effect that writes it do not mention the notes.
 *    GREEN ON ARRIVAL, a guard.
 *
 * DEFERRED, NOT WRITTEN (blocked by the UNANSWERED human question H-FR41TEST, "Q-FR41-TEST"): every pin that
 * names the plan's state object - that `app.component.ts` declares `operatorNotesState`, that
 * `buildGeneratorInput` spreads `operatorNotesState.inputPart()` (T13), that `restoreHistory` calls
 * `operatorNotesState.restore(item.input.operatorNotes)` (T38), that BOTH `clearAll` cases call
 * `operatorNotesState.clear()` over disjoint per-case slices, with the slicing-helper self-test (T39), the
 * binding of the component to the state object (T12), and the behaviour tests of `OperatorNotesFormState` itself
 * (T40, `operator-notes-form-state.spec.ts`). Writing them would adopt the plan's default split (accept
 * source-text pins plus a state class) or reject it (a first `AppComponent` test, or a bare signal) on the
 * human's behalf. See the AC matrix: FR-41, FR-31 items 2/4/5 and the FR-25 form side have NO test yet.
 *
 * GATED on T21 (H-OD12): nothing user-visible ships unless the `task-a.ts` T-A4 item is approved and committed.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (f: string) => readFileSync(join(process.cwd(), 'src', 'app', f), 'utf8').replace(/\r\n/g, '\n');
const html = read('app.component.html');
const ts = read('app.component.ts');
const tsUnescaped = ts.replace(/\\'/g, "'");

/** The text of a brace-delimited template block that starts at `open` (the index of its `{`). `{{ }}` is skipped. */
function blockFrom(source: string, open: number): { start: number; end: number } {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source.startsWith('{{', i)) { const close = source.indexOf('}}', i); i = close < 0 ? source.length : close + 1; continue; }
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return { start: open, end: i };
  }
  throw new Error('unbalanced template block');
}

const USAGE_RE = /<app-operator-notes-fields\b[^>]*>/g;
const usages = [...html.matchAll(USAGE_RE)];

describe('FR-24 (T12, state-independent): the eight label strings exist in app.component.ts', () => {
  const EN = ['Usage scenarios (optional)', 'Test results (optional)', 'Comparison with the previous generation (optional)', 'Limitations (optional)'];
  const UK = ["Сценарії використання (необов'язково)", "Результати тестів (необов'язково)", "Порівняння з попереднім поколінням (необов'язково)", "Обмеження (необов'язково)"];

  it.each(EN)('English label %j', label => { expect(tsUnescaped.includes(label), 'label missing from app.component.ts').toBe(true); });
  it.each(UK)('Ukrainian label %j', label => { expect(tsUnescaped.includes(label), 'label missing from app.component.ts').toBe(true); });
});

describe('FR-24 (T12, state-independent): the textareas component is rendered once, in the Generator form, for every store and template', () => {
  it('app.component.html renders <app-operator-notes-fields> exactly once', () => {
    expect(usages).toHaveLength(1);
  });

  it('it is placed AFTER the Generator form supplemental-content input and BEFORE the SEO-only form (the second content-template-select)', () => {
    const generatorSupplemental = html.indexOf('[label]="uiLabels().supplementalContent"');
    const seoOnlyDropdown = html.indexOf('<app-content-template-select', html.indexOf('<app-content-template-select') + 1);
    expect(generatorSupplemental).toBeGreaterThan(-1);
    expect(seoOnlyDropdown).toBeGreaterThan(generatorSupplemental);
    expect(usages[0]?.index ?? -1).toBeGreaterThan(generatorSupplemental);
    expect(usages[0]?.index ?? Infinity).toBeLessThan(seoOnlyDropdown);
  });

  it('it is NOT inside the Expert-3DPrinter-hidden image block (Expert-3DPrinter receives the notes, OD-19(2))', () => {
    const marker = "@if (selectedWebsite()?.name !== 'Expert-3DPrinter') {";
    const at = html.indexOf(marker);
    expect(at, 'the Expert-3DPrinter image block moved; update the pin deliberately').toBeGreaterThan(-1);
    const { start, end } = blockFrom(html, at + marker.length - 1);
    const where = usages[0]?.index ?? -1;
    expect(where, 'the component is not rendered').toBeGreaterThan(-1);
    expect(where < start || where > end, `component at ${where} lies inside the image block ${start}..${end}`).toBe(true);
  });

  it('its own tag carries no template or store condition (shown for every templateId)', () => {
    expect(usages[0]?.[0] ?? '').not.toMatch(/templateId|selectedTemplateId|selectedWebsite/);
    expect(usages).toHaveLength(1);
  });
});

describe('FR-28 (guard): the notes are never joined into supplementalContent', () => {
  const body = () => {
    const at = ts.indexOf('private buildGeneratorInput()');
    expect(at).toBeGreaterThan(-1);
    return ts.slice(at, ts.indexOf('\n  }\n', at));
  };

  it('buildGeneratorInput still passes this.supplementalContent() through unchanged', () => {
    expect(body()).toMatch(/supplementalContent:\s*this\.supplementalContent\(\),/);
  });

  it('buildGeneratorInput never builds supplementalContent from the notes', () => {
    expect(body()).not.toMatch(/supplementalContent:[^\n]*(?:otes|operator)/i);
    expect(body()).not.toMatch(/this\.supplementalContent\(\)\s*\+|`\$\{this\.supplementalContent\(\)\}/);
  });

  it('runFaqPipeline in the orchestrator keeps its single trigger: input.supplementalContent?.trim()', () => {
    const service = readFileSync(join(process.cwd(), 'src', 'services', 'content-orchestrator.service.ts'), 'utf8');
    const at = service.indexOf('private async runFaqPipeline(');
    expect(at).toBeGreaterThan(-1);
    expect(service.slice(at, at + 400)).toContain('if (!input.supplementalContent?.trim()) return;');
    expect(service.slice(at, at + 400)).not.toMatch(/operatorNotes/);
  });
});

describe('FR-31 item 3 (guard): the notes are not written to or read from seo_gen_form_state', () => {
  it('the constructor restore code and the effect that writes the form state never mention the notes', () => {
    const from = ts.indexOf('constructor() {');
    const to = ts.indexOf("localStorage.setItem('seo_gen_form_state'", from);
    expect(from).toBeGreaterThan(-1);
    expect(to).toBeGreaterThan(from);
    const region = ts.slice(from, to);
    expect(region).not.toMatch(/operatorNotes|operator-notes|notes/i);
  });

  it('the stored form-state object has exactly the five pre-Story keys', () => {
    const at = ts.indexOf('const state = {', ts.indexOf("effect(() => {\n      const state"));
    const objectText = ts.slice(at, ts.indexOf('};', at));
    expect([...objectText.matchAll(/^\s+(\w+):/gm)].map(m => m[1])).toEqual(['websiteName', 'productName', 'description', 'specs', 'customInstructions']);
  });
});

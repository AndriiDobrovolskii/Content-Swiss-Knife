/**
 * US-9.1 (FR-24, FR-28, FR-31 item 3; AC-9) - source-text wiring pins for `app.component.{html,ts}`, the
 * STATE-SHAPE-INDEPENDENT subset only.
 *
 * There is no `AppComponent` spec in this repository (heavy DI; precedent `app.component.template-wiring.spec.ts`,
 * which says so and pins the parent's wiring as source text under the logic runner). What only the parent can
 * guarantee is checked here as narrow pins.
 *
 * STATE-SHAPE-INDEPENDENT PINS (the Specification fixes each of these, whatever the state object is):
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
 * H-FR41TEST was ANSWERED by the owner (2026-10-18, "accept the default split"): call-site source-text pins plus
 * `OperatorNotesFormState` behaviour tests (`operator-notes-form-state.spec.ts`, T40) satisfy FR-41; no `AppComponent`
 * TestBed. The pins that name the state object are therefore written, one `describe` per owner task, RED until it lands:
 *  - T12: `app.component.ts` declares `operatorNotesState = new OperatorNotesFormState()`; the component tag is bound to
 *    `operatorNotesState.values()` / `set($event)`; the old name `operatorNotesForm` is not used.
 *  - T13: `buildGeneratorInput` contains `operatorNotesState.inputPart()` and writes no literal `operatorNotes:` key.
 *  - T38: `restoreHistory` contains `operatorNotesState.restore(item.input.operatorNotes)` (FR-31 items 2, 4, 5).
 *  - T39: `clearAll()` has two textually identical, independent bodies (`case 'generator':`, `case 'ua-generator':`); each
 *    case is pinned over its OWN slice (label to the first following `break;`), the slices are disjoint, and the slicing
 *    helper is self-tested on synthetic sources, so a pin that passes with only one case edited cannot exist (FR-41).
 * What these pins prove is TEXT; what the calls DO is proven by `operator-notes-form-state.spec.ts`.
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

// ── Shared source slicing ─────────────────────────────────────────────────────────────────────────────────────

/** The text of a class method from its signature to the first closing `\n  }\n` at class-member indentation. */
function methodBodyOf(source: string, signature: string): string {
  const at = source.indexOf(signature);
  expect(at, `${signature} not found in app.component.ts`).toBeGreaterThan(-1);
  const end = source.indexOf('\n  }\n', at);
  expect(end, `end of ${signature} not found`).toBeGreaterThan(at);
  return source.slice(at, end);
}

const CLEAR_CALL = 'operatorNotesState.clear()';

/**
 * The slice of `switch` case `label` inside a method body: from the label to the FIRST following `break;` (inclusive).
 * Returns `null` when the label is absent or no `break;` follows.
 */
function caseSliceOf(methodBody: string, label: string): { start: number; end: number; text: string } | null {
  const start = methodBody.indexOf(`case '${label}':`);
  if (start < 0) return null;
  const br = methodBody.indexOf('break;', start);
  if (br < 0) return null;
  const end = br + 'break;'.length;
  return { start, end, text: methodBody.slice(start, end) };
}

/**
 * Everything that is wrong with case `label` as an FR-41 pin: an empty list means the case resets the notes in its OWN
 * slice. The slice must contain the call exactly once, must not contain the other case's label (a fall-through or a lazy
 * slice running into the neighbour), and must contain exactly one `break;` (so it cannot swallow the next case).
 */
function clearPinViolations(methodBody: string, label: string, otherLabel: string): string[] {
  const slice = caseSliceOf(methodBody, label);
  if (!slice) return [`case '${label}': (or its break;) not found`];
  const problems: string[] = [];
  const calls = slice.text.split(CLEAR_CALL).length - 1;
  if (calls !== 1) problems.push(`case '${label}': contains ${CLEAR_CALL} ${calls} times, expected exactly once`);
  if (slice.text.includes(`case '${otherLabel}':`)) problems.push(`case '${label}': slice runs into case '${otherLabel}':`);
  const breaks = slice.text.split('break;').length - 1;
  if (breaks !== 1) problems.push(`case '${label}': slice holds ${breaks} break; statements, expected exactly one`);
  return problems;
}

// ── T12: the state object, its binding and the old name ───────────────────────────────────────────────────────

describe('FR-24, FR-41 (T12): the component is bound to the notes state object (source-text pins)', () => {
  const tag = (usages[0]?.[0] ?? '').replace(/\s+/g, ' ');

  it('app.component.ts declares readonly operatorNotesState = new OperatorNotesFormState() as a field initialiser (no DI)', () => {
    expect(ts).toMatch(/readonly operatorNotesState\s*=\s*new OperatorNotesFormState\(\)/);
  });

  it('app.component.ts imports OperatorNotesFormState from ./operator-notes-form-state', () => {
    expect(ts).toMatch(/import\s*\{[^}]*\bOperatorNotesFormState\b[^}]*\}\s*from\s*'\.\/operator-notes-form-state'/);
  });

  it('the component tag reads its values from operatorNotesState.values()', () => {
    expect(tag).toContain('[values]="operatorNotesState.values()"');
  });

  it('the component tag writes changes back with operatorNotesState.set($event)', () => {
    expect(tag).toContain('(valuesChange)="operatorNotesState.set($event)"');
  });

  it('the superseded name operatorNotesForm is used nowhere in app.component.ts or app.component.html', () => {
    expect(ts).not.toContain('operatorNotesForm');
    expect(html).not.toContain('operatorNotesForm');
  });
});

// ── T13: buildGeneratorInput ───────────────────────────────────────────────────────────────────────────────────

describe('FR-25, FR-27 (T13): buildGeneratorInput spreads operatorNotesState.inputPart() and writes no operatorNotes key itself', () => {
  const body = () => methodBodyOf(ts, 'private buildGeneratorInput()');

  it('the body contains operatorNotesState.inputPart()', () => {
    expect(body()).toContain('operatorNotesState.inputPart()');
  });

  it('the body writes no literal `operatorNotes:` property (an explicit undefined would still be a key; FR-27)', () => {
    expect(body()).not.toMatch(/\boperatorNotes\s*:/);
  });

  it('the call is spread into the returned object literal (not discarded)', () => {
    expect(body()).toMatch(/\.\.\.\s*this\.operatorNotesState\.inputPart\(\)/);
  });
});

// ── T38: restoreHistory ────────────────────────────────────────────────────────────────────────────────────────

describe('FR-31 items 2, 4, 5 (T38): restoreHistory calls operatorNotesState.restore(item.input.operatorNotes)', () => {
  const body = () => methodBodyOf(ts, 'restoreHistory(item: HistoryItem)');

  it('the body contains operatorNotesState.restore(item.input.operatorNotes) exactly once', () => {
    expect(body().split('operatorNotesState.restore(item.input.operatorNotes)').length - 1).toBe(1);
  });

  it('the restore is an unconditional statement of its own (an entry without notes must still empty the form: OD-2 R2)', () => {
    const b = body();
    const at = b.indexOf('operatorNotesState.restore(');
    expect(at, 'restoreHistory does not call operatorNotesState.restore(').toBeGreaterThan(-1);
    const line = b.slice(b.lastIndexOf('\n', at) + 1, b.indexOf('\n', at));
    expect(line.trim().startsWith('this.operatorNotesState.restore(')).toBe(true);
  });
});

// ── T39: clearAll, both cases ──────────────────────────────────────────────────────────────────────────────────

describe('FR-41 (T39): Clear All resets the notes in BOTH the generator and the ua-generator case (per-case slices)', () => {
  const body = () => methodBodyOf(ts, '  clearAll() {');

  it('premise: clearAll() holds each case label once, and each case has its own break;', () => {
    const b = body();
    expect(b.split("case 'generator':").length - 1).toBe(1);
    expect(b.split("case 'ua-generator':").length - 1).toBe(1);
    expect(caseSliceOf(b, 'generator')).not.toBeNull();
    expect(caseSliceOf(b, 'ua-generator')).not.toBeNull();
  });

  it('the two case slices are disjoint (the generator slice ends before the ua-generator slice starts)', () => {
    const b = body();
    const g = caseSliceOf(b, 'generator')!;
    const u = caseSliceOf(b, 'ua-generator')!;
    expect(g.end).toBeLessThanOrEqual(u.start);
  });

  it("case 'generator': resets the notes exactly once, inside its own slice", () => {
    expect(clearPinViolations(body(), 'generator', 'ua-generator')).toEqual([]);
  });

  it("case 'ua-generator': resets the notes exactly once, inside its own slice", () => {
    expect(clearPinViolations(body(), 'ua-generator', 'generator')).toEqual([]);
  });

  it('no other mode of clearAll() mentions the notes state (FR-41 item 3: nothing else changes)', () => {
    const b = body();
    const g = caseSliceOf(b, 'generator')!;
    const u = caseSliceOf(b, 'ua-generator')!;
    const rest = b.slice(0, g.start) + b.slice(g.end, u.start) + b.slice(u.end);
    expect(rest).not.toContain('operatorNotesState');
  });

  it('clearAll() writes nothing to seo_gen_form_state and does not touch the history service (FR-41 item 3)', () => {
    const b = body();
    expect(b).not.toContain('seo_gen_form_state');
    expect(b).not.toMatch(/historyService/);
  });
});

describe('FR-41 (T39): the slicing helper itself, on synthetic sources (tests test code; green on arrival)', () => {
  const caseBody = (withCall: boolean) =>
    `\n        this.selectedWebsite.set(null);\n${withCall ? '        this.operatorNotesState.clear();\n' : ''}        this.activeTab.set('html');\n        break;\n`;
  const src = (gen: boolean, ua: boolean) =>
    `  clearAll() {\n    switch (this.appMode()) {\n      case 'generator':${caseBody(gen)}\n      case 'ua-generator':${caseBody(ua)}\n      case 'seo-generator':\n        this.seoProductName.set('');\n        break;\n    }\n  }\n`;

  it('both cases edited: both pins pass', () => {
    const s = src(true, true);
    expect(clearPinViolations(s, 'generator', 'ua-generator')).toEqual([]);
    expect(clearPinViolations(s, 'ua-generator', 'generator')).toEqual([]);
  });

  it('only the generator case edited: the generator pin passes and the ua-generator pin FAILS', () => {
    const s = src(true, false);
    expect(clearPinViolations(s, 'generator', 'ua-generator')).toEqual([]);
    expect(clearPinViolations(s, 'ua-generator', 'generator')).not.toEqual([]);
  });

  it('only the ua-generator case edited: the ua-generator pin passes and the generator pin FAILS', () => {
    const s = src(false, true);
    expect(clearPinViolations(s, 'ua-generator', 'generator')).toEqual([]);
    expect(clearPinViolations(s, 'generator', 'ua-generator')).not.toEqual([]);
  });

  it('neither case edited (the call sits in another mode): both pins FAIL', () => {
    const s = src(false, false).replace("this.seoProductName.set('');", 'this.operatorNotesState.clear();');
    expect(clearPinViolations(s, 'generator', 'ua-generator')).not.toEqual([]);
    expect(clearPinViolations(s, 'ua-generator', 'generator')).not.toEqual([]);
  });

  it('a call twice in one case FAILS that case (exactly once)', () => {
    const s = src(true, true).replace('this.operatorNotesState.clear();', 'this.operatorNotesState.clear();\n        this.operatorNotesState.clear();');
    expect(clearPinViolations(s, 'generator', 'ua-generator')).not.toEqual([]);
  });

  it('the two cases merged into one fall-through with a single call do NOT satisfy both pins (plan rejected alternative 23)', () => {
    const merged = `  clearAll() {\n    switch (this.appMode()) {\n      case 'generator':\n      case 'ua-generator':\n        this.operatorNotesState.clear();\n        break;\n    }\n  }\n`;
    const generatorOk = clearPinViolations(merged, 'generator', 'ua-generator').length === 0;
    const uaOk = clearPinViolations(merged, 'ua-generator', 'generator').length === 0;
    expect(generatorOk && uaOk).toBe(false);
  });

  it('a case without a break; is reported rather than silently sliced to the end of the source', () => {
    const noBreak = `  clearAll() {\n    switch (this.appMode()) {\n      case 'generator':\n        this.operatorNotesState.clear();\n    }\n  }\n`;
    expect(clearPinViolations(noBreak, 'generator', 'ua-generator')).not.toEqual([]);
  });
});

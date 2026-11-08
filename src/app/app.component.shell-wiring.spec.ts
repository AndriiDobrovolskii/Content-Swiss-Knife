/**
 * app.component.shell-wiring.spec.ts - US-10.4 TEST_WRITING: source-text pins for the app shell.
 *
 * LOGIC runner, deliberately not a `*.component.spec.ts` (precedent: `app.component.template-wiring.spec.ts`,
 * `app.component.image-studio-wiring.spec.ts`). It reads `app.component.{html,ts}`, `styles.css` and `index.html` as text,
 * so it imports nothing this Story creates, has no `tsc` diagnostic, and is red now with one named failure per pin.
 *
 * What lives here, and only here (plan DD-14 category 2): invariants that a CSS-free DOM test cannot see, or that guard the
 * indentation- and anchor-sensitive regexes of the existing wiring specs. The behaviour of the rail, the panel gate, the
 * History button and the storage is proved by `app.component.shell.component.spec.ts` and `shell-nav.spec.ts`; this file does
 * not repeat it. HONEST LIMIT: a source pin proves a marker is present, not that the page renders correctly. Colour, contrast,
 * widths and adjacency are the manual evidence (FR-19), see docs/tests/US-10.4-test-strategy.md.
 *
 * Anchors (plan DD-1 rule 9, task breakdown "Ownership of the existing-spec adaptations"): `<!-- Nav Rail -->`,
 * `<!-- Nav Rail: bottom controls -->`, `<!-- Nav Rail end -->`. `app.component.template-wiring.spec.ts` (adapted at
 * TEST_WRITING) slices the mode buttons between the first two.
 *
 * The token pins (FR-13, FR-14) turn green at T9, the last builder task; until then they are red BY DESIGN
 * (test generation report, "red set").
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const lf = (text: string): string => text.split('\r\n').join('\n');
const read = (path: string): string => lf(readFileSync(join(process.cwd(), ...path.split('/')), 'utf8'));

const html = read('src/app/app.component.html');
const ts = read('src/app/app.component.ts');
const css = read('src/styles.css');
const indexHtml = read('index.html');

const RAIL_START = '<!-- Nav Rail -->';
const RAIL_BOTTOM = '<!-- Nav Rail: bottom controls -->';
const RAIL_END = '<!-- Nav Rail end -->';

/** FR-1 order of the 12 content modes. */
const CONTENT_MODES = [
  'generator', 'ua-generator', 'optimizer', 'translator', 'seo-generator', 'copywriter', 'readability', 'slug-generator', 'faq-generator',
  'image-tools', 'image-studio', 'html-editor',
] as const;

const countOf = (text: string, needle: string): number => text.split(needle).length - 1;
/** The text between two anchors, or '' when either is missing or they are out of order (so a pin fails with a message, not a throw). */
const between = (from: string, to: string): string => {
  const a = html.indexOf(from);
  const b = html.indexOf(to);
  return a >= 0 && b > a ? html.slice(a, b) : '';
};
const railMain = () => between(RAIL_START, RAIL_BOTTOM);
const railBottom = () => between(RAIL_BOTTOM, RAIL_END);

describe('FR-1 / FR-10 / AC-4c: the rail is delimited by its three anchor comments, in order', () => {
  it.each([RAIL_START, RAIL_BOTTOM, RAIL_END])('the anchor %s exists exactly once', (anchor) => {
    expect(countOf(html, anchor)).toBe(1);
  });

  it('the anchors are in the order: rail, bottom controls, end', () => {
    const [a, b, c] = [html.indexOf(RAIL_START), html.indexOf(RAIL_BOTTOM), html.indexOf(RAIL_END)];
    expect(a, 'rail start').toBeGreaterThanOrEqual(0);
    expect(b, 'bottom controls').toBeGreaterThan(a);
    expect(c, 'rail end').toBeGreaterThan(b);
  });

  it('file order is rail, then input panel, then <main> (FR-9: the panel is to the right of the rail)', () => {
    const [rail, panel, main] = [html.indexOf(RAIL_END), html.indexOf('<aside'), html.indexOf('<main')];
    expect(rail, 'rail end anchor').toBeGreaterThanOrEqual(0);
    expect(panel, '<aside').toBeGreaterThan(rail);
    expect(main, '<main').toBeGreaterThan(panel);
  });
});

describe('FR-9 / plan DD-3: the rail is a <nav>, never an <aside>', () => {
  it('the rail span holds exactly one <nav and no <aside; the only <aside in the template is the input panel, so querySelector("aside") never returns the rail', () => {
    const rail = between(RAIL_START, RAIL_END);
    expect(rail, 'rail span not located').not.toBe('');
    expect(countOf(rail, '<nav')).toBe(1);
    expect(rail).not.toContain('<aside');
    expect(countOf(html, '<aside')).toBe(1);
    expect(countOf(html, '</aside>')).toBe(1);
  });
});

describe('AC-1 / AC-4 / FR-7: one rail element per mode, in the group order, each calling the existing setMode()', () => {
  it.each(CONTENT_MODES)("setMode('%s') appears exactly once in the template, inside the rail, as the first attribute of a <button>", (mode) => {
    const rail = railMain();
    expect(rail, 'rail span not located').not.toBe('');
    expect(countOf(html, `setMode('${mode}')`), `${mode}: setMode literal in the whole template`).toBe(1);
    expect(rail, `${mode}: first attribute after <button, inside the rail`).toMatch(new RegExp(`<button\\s+\\(click\\)="setMode\\('${mode}'\\)"`));
  });

  it('the twelve mode buttons are in the rail, before the bottom controls, in the FR-1 order', () => {
    const rail = railMain();
    expect(rail, 'rail span not located').not.toBe('');
    const positions = CONTENT_MODES.map((m) => rail.indexOf(`setMode('${m}')`));
    positions.forEach((p, i) => expect(p, `${CONTENT_MODES[i]} inside the rail`).toBeGreaterThanOrEqual(0));
    const sorted = [...positions].sort((x, y) => x - y);
    expect(positions, 'source order equals the FR-1 order').toEqual(sorted);
  });

  it("the Dashboard control is the only setMode('dashboard') and sits in the bottom controls", () => {
    expect(countOf(html, "setMode('dashboard')")).toBe(1);
    expect(railBottom()).toContain("setMode('dashboard')");
  });

  it('the rail contains no `@else if (appMode() === ...)` line (the form-chain regexes of the wiring specs match the first one they find)', () => {
    const rail = between(RAIL_START, RAIL_END);
    expect(rail, 'rail span not located').not.toBe('');
    expect(rail).not.toMatch(/@else if \(appMode\(\) ===/);
  });
});

describe('AC-4b / AC-4e / AC-7 / plan DD-4, DD-5: the input panel is gated, not re-indented, and generatorForm is hoisted', () => {
  it('the <aside> is the direct child of an `@if (hasPanel())` block, closed right after </aside>', () => {
    expect(html, 'gate opening').toMatch(/@if \(hasPanel\(\)\) \{\s*(?:<!--[\s\S]*?-->\s*)*<aside\b/);
    expect(html, 'gate closing').toMatch(/<\/aside>\s*\}/);
  });

  it('the `@if (hasPanel())` line is at two spaces and the <aside> stays at two spaces (the 4-space `@else if` regexes of faq-layout / template-wiring depend on it)', () => {
    expect(html).toMatch(/\n {2}@if \(hasPanel\(\)\) \{/);
    expect(html).toMatch(/\n {2}<aside\b/);
  });

  it('<ng-template #generatorForm> is declared exactly once, and before the gate (so both the panel and <main> can reach it)', () => {
    expect(countOf(html, '<ng-template #generatorForm>')).toBe(1);
    const decl = html.indexOf('<ng-template #generatorForm>');
    const gate = html.indexOf('@if (hasPanel())');
    expect(gate, 'the gate').toBeGreaterThanOrEqual(0);
    expect(decl, 'declaration before the gate').toBeLessThan(gate);
  });

  it('app.component.ts takes the panel decision from the shared shell-nav module (one table, not a second copy)', () => {
    expect(ts).toMatch(/from '\.\/shell-nav'/);
  });
});

describe('FR-11 / AC-4d: the History overlay is anchored to the panel header by a shared token, not a fixed pixel offset', () => {
  const overlayClass = () => html.match(/<!-- History Panel[^]*?<div class="([^"]*)"/)?.[1] ?? '';

  it('neither the old `top-[125px]` nor the owner\'s example `top-[64px]` remains', () => {
    expect(html).not.toContain('top-[125px]');
    expect(html).not.toContain('top-[64px]');
  });

  it('the overlay\'s top edge and the header strip\'s height read the same CSS variable, declared in styles.css', () => {
    const overlay = overlayClass();
    expect(overlay, 'History overlay element not located').not.toBe('');
    const token = overlay.match(/top-\[var\((--[\w-]+)\)\]/)?.[1];
    expect(token, 'overlay `top-[var(--...)]`').toBeDefined();
    expect(html, 'a header strip with the same variable as its height').toContain(`h-[var(${token})]`);
    expect(css, 'the variable is declared').toMatch(new RegExp(`${token}\\s*:`));
  });
});

// ── FR-13 / FR-14: tokens and painting layers (source pins only; the rendered colours are manual evidence) ─────────────
const cssBlocks = (selector: RegExp): string => [...css.matchAll(selector)].map((m) => m[1]).join('\n');
const rootBlock = () => cssBlocks(/(?:^|\n):root\s*\{([^}]*)\}/g);
const darkBlock = () => cssBlocks(/(?:^|\n)html\.dark\s*\{([^}]*)\}/g);
const shellColorNames = (block: string): string[] =>
  [...block.matchAll(/(--shell-[\w-]+)\s*:\s*#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[1]).sort();

describe('FR-13 / FR-14: the shell tokens are declared once per theme, so the light theme cannot keep a dark colour', () => {
  it('the dark theme declares the four fixed values: page #0b1120, rail #111a2e, borders #26324a, accent #7c3aed', () => {
    const dark = darkBlock().toLowerCase();
    for (const hex of ['#0b1120', '#111a2e', '#26324a', '#7c3aed']) expect(dark, hex).toContain(hex);
  });

  it('the light theme (:root) declares shell colour tokens and keeps none of the dark page, rail or border colours', () => {
    const root = rootBlock().toLowerCase();
    expect(shellColorNames(root).length, 'shell colour tokens declared on :root').toBeGreaterThan(0);
    for (const hex of ['#0b1120', '#111a2e', '#26324a']) expect(root, `${hex} must not be a light-theme value`).not.toContain(hex);
  });

  it('every shell colour token has both a light and a dark value (FR-14: each dark token has a light counterpart)', () => {
    const light = shellColorNames(rootBlock());
    const dark = shellColorNames(darkBlock());
    expect(light.length).toBeGreaterThan(0);
    expect(dark).toEqual(light);
  });
});

describe('FR-13 / plan DD-9: the painting layers between <body> and <main> do not hide the page background', () => {
  const tagClass = (tagStart: RegExp, source = html): string => source.match(tagStart)?.[1] ?? '';

  it('<main> keeps `relative` (dashboard and html-editor are absolute children) and has no translucent background', () => {
    const cls = tagClass(/<main\b[^>]*\bclass="([^"]*)"/);
    expect(cls, '<main> class not located').not.toBe('');
    expect(cls).toMatch(/(?:^|\s)relative(?:\s|$)/);
    expect(cls, 'a `bg-.../NN` opacity modifier on <main> makes the layer behind it show through').not.toMatch(/(?:^|\s)(?:\w+:)*bg-[^\s"]*\/\d+/);
  });

  it('the root container of the template carries no slate background (an opaque layer of another colour would sit over <body>)', () => {
    const cls = tagClass(/^\s*<div\b[^>]*\bclass="([^"]*)"/);
    expect(cls, 'root container class not located').not.toBe('');
    expect(cls).not.toMatch(/bg-slate/);
  });

  it('<body> in index.html carries no slate background', () => {
    const cls = tagClass(/<body\b[^>]*\bclass="([^"]*)"/, indexHtml);
    expect(cls, '<body> class not located').not.toBe('');
    expect(cls).not.toMatch(/bg-slate/);
  });

  it('index.html maps a `shell` colour family to the --shell-* custom properties for Tailwind', () => {
    expect(indexHtml).toMatch(/shell\s*:\s*\{[^}]*var\(--shell-/);
  });
});

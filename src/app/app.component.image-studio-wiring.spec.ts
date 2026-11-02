/**
 * US-10.1 T46 (FR-1, SD-12, plan DD-25, validation category C8): wiring pins for `app.component.{ts,html}` and
 * `types.ts` once Image Studio is mounted as an `AppMode`.
 *
 * Source-text pins in the idiom of `app.component.template-wiring.spec.ts` / `app.component.faq-layout.spec.ts`:
 * the files are read as TEXT at run time, so this spec imports nothing a task creates, carries zero `tsc`
 * diagnostics, and is red now with one named failure per pin. They are an ADDITIONAL guard: the behavioural proof of
 * FR-1 / SD-12 (clear-all leaves stored sessions unchanged; no Image Tools control in studio mode) is
 * `app.component.clear-all.component.spec.ts`. Logic runner; deliberately not `*.component.spec.ts`.
 *
 * Pinned (each from FR-1 / SD-12 / DD-25, not from an implementation):
 *   - `AppMode` has `'image-studio'`; `TOOL_LABEL['image-studio']` is a non-empty string (the feedback form's tool field);
 *   - `clearAll()` has an explicit `case 'image-studio':` whose body touches no studio symbol (sessions are removed
 *     only through the session list and expiry);
 *   - `app.component.ts` imports no session-store module (state lives in the root store, not in AppComponent);
 *   - `imageStudio` exists in TRANSLATIONS en ("Image Studio") and uk ("Студія зображень", X-28);
 *   - the template has the nav button, the `@defer` main-area branch, and the Actions-Footer studio branch placed
 *     BEFORE the chain's final `@else` (which would otherwise render Image Tools' "Process images" button);
 *   - no studio markup contains the word `consumables` (template-wiring pins forbid it app-wide);
 *   - the studio never sets the orchestrator's global `isGenerating()` overlay.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const lf = (t: string) => t.split('\r\n').join('\n');
const read = (f: string) => lf(readFileSync(join(root, f), 'utf8'));

const html = read('src/app/app.component.html');
const ts = read('src/app/app.component.ts');
const types = read('src/app/types.ts');

function walk(dir: string, out: string[] = []): string[] {
  const abs = join(root, dir);
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}

const STUDIO_DIRS = ['src/utils/image-studio', 'src/services/image-studio', 'src/app/components/image-studio'];
const studioFiles = (pred: (f: string) => boolean) => STUDIO_DIRS.flatMap((d) => walk(d)).filter(pred);

/** Body of `case 'image-studio':` inside clearAll(): from the label to the next `case`/closing of the switch. */
function clearAllStudioCase(): string | null {
  const start = ts.indexOf('clearAll() {');
  if (start === -1) return null;
  const fn = ts.slice(start);
  const m = fn.match(/case 'image-studio':([\s\S]*?)(?=\n\s*case '|\n\s*default:|\n {2}\}\n)/);
  return m ? m[1] : null;
}

describe('FR-1: the mode exists and is labelled', () => {
  it("FR-1: AppMode in types.ts includes the literal 'image-studio'", () => {
    const appMode = types.match(/export type AppMode\s*=([\s\S]*?);/);
    expect(appMode, 'AppMode type not found').not.toBeNull();
    expect(appMode![1]).toContain("'image-studio'");
  });

  it("FR-1: TOOL_LABEL has a non-empty entry for 'image-studio'", () => {
    const label = ts.match(/const TOOL_LABEL[^{]*\{([\s\S]*?)\n\};/);
    expect(label, 'TOOL_LABEL not found').not.toBeNull();
    const entry = label![1].match(/'image-studio':\s*'([^']*)'/);
    expect(entry, "no 'image-studio' entry in TOOL_LABEL").not.toBeNull();
    expect(entry![1].trim().length).toBeGreaterThan(0);
  });

  it('FR-1 / X-28: TRANSLATIONS.en.imageStudio is "Image Studio" and TRANSLATIONS.uk.imageStudio is "Студія зображень"', () => {
    const ukAt = ts.indexOf('\n  uk: {');
    expect(ukAt, 'uk block anchor not found').toBeGreaterThan(0);
    const en = ts.slice(0, ukAt);
    const uk = ts.slice(ukAt);
    expect(en).toMatch(/imageStudio:\s*'Image Studio'/);
    expect(uk).toMatch(/imageStudio:\s*'Студія зображень'/);
  });
});

describe('SD-12: clear-all in studio mode touches no studio state', () => {
  it("SD-12: clearAll() has an explicit case 'image-studio'", () => {
    expect(clearAllStudioCase(), "no `case 'image-studio':` in clearAll()").not.toBeNull();
  });

  it('SD-12: the case body touches no studio symbol (sessions, store, IndexedDB, ImageStudio*)', () => {
    const body = clearAllStudioCase();
    expect(body, "no `case 'image-studio':` in clearAll()").not.toBeNull();
    expect(body!).not.toMatch(/session|store|indexeddb|ImageStudio|studio/i);
  });

  it('SD-12 / DD-14: app.component.ts imports no session-store module and does import the studio container', () => {
    const imports = ts.split('\n').filter((l) => /^\s*import\b/.test(l));
    expect(imports.some((l) => /image-studio\.store|indexeddb|session-store/i.test(l))).toBe(false);
    expect(imports.some((l) => /image-studio/i.test(l)), 'the studio container must be imported').toBe(true);
  });
});

describe('DD-25: template insertions', () => {
  it("DD-25: the Mode Switcher has a nav button calling setMode('image-studio')", () => {
    expect(html).toContain("setMode('image-studio')");
  });

  it("DD-25 / P-7: the main area mounts <app-image-studio [lang]=\"uiLanguage()\"> in an @defer under appMode() === 'image-studio'", () => {
    const m = html.match(/@if \(appMode\(\) === 'image-studio'\) \{\s*@defer[^{]*\{\s*<app-image-studio\b[^>]*\[lang\]="uiLanguage\(\)"[^>]*>/);
    expect(m, 'main-area studio branch not found').not.toBeNull();
  });

  it("DD-25 / R16: the Actions-Footer chain has `@else if (appMode() === 'image-studio')` BEFORE its final @else (the Process-images fall-through)", () => {
    const footerAt = html.indexOf('<!-- Actions Footer -->');
    expect(footerAt, 'Actions Footer anchor not found').toBeGreaterThan(0);
    const footer = html.slice(footerAt);
    const studioAt = footer.indexOf("@else if (appMode() === 'image-studio')");
    const finalElse = footer.search(/\}\s*@else\s*\{\s*<button\s+\(click\)="processImages\(\)"/);
    expect(finalElse, 'final @else (Process images) not found: premise broke').toBeGreaterThan(0);
    expect(studioAt, 'no studio branch in the Actions Footer chain').toBeGreaterThan(0);
    expect(studioAt).toBeLessThan(finalElse);
  });

  it('DD-25: the footer studio branch renders nothing (no button, no text) in the primary-action slot', () => {
    const footer = html.slice(html.indexOf('<!-- Actions Footer -->'));
    const m = footer.match(/@else if \(appMode\(\) === 'image-studio'\)\s*\{([\s\S]*?)\}\s*(?=@else|<div class="flex gap-2">)/);
    expect(m, 'no studio branch in the Actions Footer chain').not.toBeNull();
    expect(m![1].trim()).toBe('');
  });
});

describe('studio files: markup and generation overlay', () => {
  it('R8: no studio markup contains the word "consumables" (template-wiring pins forbid it app-wide)', () => {
    const htmls = studioFiles((f) => f.endsWith('.html'));
    expect(htmls.length, 'no studio templates exist yet').toBeGreaterThan(0);
    for (const f of htmls) expect(read(f), f).not.toMatch(/consumables/i);
  });

  it("DD-14 / T40 note: no studio file sets the orchestrator's global isGenerating() overlay or imports the orchestrator", () => {
    const files = studioFiles((f) => /\.(ts|html)$/.test(f) && !f.endsWith('.spec.ts'));
    expect(files.length, 'no studio sources exist yet').toBeGreaterThan(0);
    for (const f of files) {
      const src = read(f);
      expect(src, f).not.toMatch(/isGenerating\s*\.\s*(set|update)\s*\(/);
      expect(src, f).not.toMatch(/content-orchestrator/);
    }
  });
});

/**
 * app.component.export-guard.spec.ts
 *
 * US-3.1 T6 (FR-3, FR-5, AC-1). There is no `AppComponent` spec in this repository, by deliberate
 * prior decision (see `app.component.template-wiring.spec.ts`'s own header comment) — this file
 * follows that exact precedent: source-text pins run under the logic runner, not
 * `*.component.spec.ts`, where Angular compilation and TestBed are absent.
 *
 * These pins are STRUCTURAL EVIDENCE that the guard exists and is wired at the right call sites —
 * not a runtime behavioural proof that clicking "Download ZIP" is actually blocked in a browser.
 * That distinction is stated explicitly here (Plan Review v5 non-blocking finding) rather than
 * implied.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ts = readFileSync(join(process.cwd(), 'src', 'app', 'app.component.ts'), 'utf8');

/** Extracts one method's source body by name — same idiom as
 *  `app.component.template-wiring.spec.ts`'s `onTemplateChange` extraction. */
function methodBody(name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n  \\}`);
  return ts.match(re)?.[0] ?? null;
}

/** `async downloadZip() { ... }` / `async downloadText() { ... }` — one-liners in today's source,
 *  so also accept a single-line arrow-less body up to the first top-level `}` on the same
 *  indentation. Falls back to a generous window from the method's own declaration when the
 *  one-line-body regex above finds nothing (e.g. once the guard adds a multi-line body). */
function methodSource(name: string): string {
  const oneLiner = ts.match(new RegExp(`async ${name}\\s*\\([^)]*\\)\\s*\\{[^}]*\\}`));
  if (oneLiner) return oneLiner[0];
  const block = methodBody(name);
  if (block) return block;
  const idx = ts.indexOf(`async ${name}(`);
  return idx === -1 ? '' : ts.slice(idx, idx + 800);
}

describe('FR-3/FR-5 — groundingExportBlocked computed signal exists and reads repairReport()', () => {
  it('declares a groundingExportBlocked computed signal', () => {
    expect(ts).toMatch(/groundingExportBlocked\s*=\s*computed\(/);
  });

  it('the signal keys on specs-grounding-disabled + error severity via finalIssues, not repairUnresolvedCount', () => {
    const decl = ts.match(/groundingExportBlocked\s*=\s*computed\([\s\S]{0,400}?\)\);/)?.[0]
      ?? ts.match(/groundingExportBlocked\s*=\s*computed\([\s\S]{0,400}/)?.[0] ?? '';
    expect(decl).toMatch(/finalIssues/);
    expect(decl).toMatch(/specs-grounding-disabled/);
    expect(decl).toMatch(/error/);
    // The unrelated, rule-agnostic count — gating on it would block export for an unrelated
    // unresolved rule this FR never asked to block (Implementation Plan D4's own reasoning).
    expect(decl).not.toMatch(/repairUnresolvedCount/);
  });
});

describe('FR-3 — downloadZip() and downloadText() are guarded; downloadAllImages() is not', () => {
  it('downloadZip() checks groundingExportBlocked() before calling downloadPackage(', () => {
    const body = methodSource('downloadZip');
    expect(body).toMatch(/groundingExportBlocked\(\)/);
    // The guard must precede the export call for an early-return to actually block it.
    const guardIdx = body.search(/groundingExportBlocked\(\)/);
    const callIdx = body.search(/downloadPackage\(/);
    expect(guardIdx).toBeGreaterThanOrEqual(0);
    expect(callIdx).toBeGreaterThan(guardIdx);
  });

  it('downloadText() checks groundingExportBlocked() before calling downloadTextPackage(', () => {
    const body = methodSource('downloadText');
    expect(body).toMatch(/groundingExportBlocked\(\)/);
    const guardIdx = body.search(/groundingExportBlocked\(\)/);
    const callIdx = body.search(/downloadTextPackage\(/);
    expect(guardIdx).toBeGreaterThanOrEqual(0);
    expect(callIdx).toBeGreaterThan(guardIdx);
  });

  it('downloadAllImages() is untouched — it reads imgResults(), a distinct signal with no §7 content', () => {
    const body = methodSource('downloadAllImages');
    expect(body).not.toMatch(/groundingExportBlocked/);
    expect(body).toMatch(/imgResults\(\)/);
  });
});

describe('FR-3 — the blocking message key exists in both UI languages', () => {
  it('declares alertGroundingBlocked in the `en` and `uk` TRANSLATIONS dictionaries', () => {
    const occurrences = [...ts.matchAll(/alertGroundingBlocked:/g)].length;
    // One per language dictionary — following the existing alertFillFields pattern (en + uk).
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it('is referenced by an alert(...) call inside the export guards', () => {
    expect(ts).toMatch(/alert\(this\.uiLabels\(\)\.alertGroundingBlocked\)/);
  });
});

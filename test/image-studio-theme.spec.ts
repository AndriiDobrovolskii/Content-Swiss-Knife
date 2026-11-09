// @vitest-environment node
/**
 * US-10.5 T37 - the theme-class scan (Specification FR-28, FR-29, FR-30 at class level; plan DD-15, finding S6/R-12).
 *
 * CSS, contrast, layout and drag cannot regress inside `ng test` (happy-dom has no layout), so one STANDING source scan keeps the class
 * level honest: no studio template or component carries a `slate-`, `gray-`, `zinc-`, `violet-`, `bg-white` or `dark:` class, because every
 * studio surface uses the existing `--shell-*` tokens (the `shell` Tailwind family), which flip with `html.dark` by themselves.
 *
 * EXACTLY TWO patterns are allow-listed, by exact class string, and nothing else (plan DD-15, accepted at HUMAN_PLAN_APPROVAL):
 *   (1) status text in role="alert" regions:        `text-red-700 dark:text-red-300`   (the theme-aware pair must stay whole)
 *   (2) fixed scrims over images (not theme surfaces): `bg-slate-900/70 text-white`  and  `bg-amber-600 text-white`
 * (the second pattern is two class strings of one kind). The FR-31 evidence records their measured contrast.
 *
 * The scan is proven NON-VACUOUS below on synthetic offending strings (a broken scanner fails instead of passing on nothing), and it
 * asserts it actually read the studio's files. Logic runner. Red until T37 (the shipped templates still carry slate-* classes).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const STUDIO_DIR = 'src/app/components/image-studio';

/** The allow-list: exact class strings. Exported so the tests can pin its size. */
export const ALLOW_LIST = ['text-red-700 dark:text-red-300', 'bg-slate-900/70 text-white', 'bg-amber-600 text-white'] as const;

/** Forbidden class tokens: any colour of the slate, gray, zinc or violet scales (with or without a variant prefix), bg-white, and any dark: variant. */
const FORBIDDEN = /\b(?:slate|gray|zinc|violet)-\d|\bbg-white\b|\bdark:/g;

/** Offending class tokens left in `src` after the exact allow-listed strings are removed. */
export function offendersIn(src: string): string[] {
  let rest = src;
  for (const allowed of ALLOW_LIST) rest = rest.split(allowed).join(' ');
  return rest.match(FORBIDDEN) ?? [];
}

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
const studioFiles = () => walk(STUDIO_DIR).filter((f) => /\.(html|ts)$/.test(f) && !/\.spec\.ts$/.test(f));

describe('US-10.5 theme scan: the scanner is proven non-vacuous (T37)', () => {
  it('flags every forbidden family: slate-, gray-, zinc-, violet-, bg-white and dark: variants', () => {
    for (const bad of [
      'class="bg-slate-100"', 'class="text-slate-900"', 'class="border-gray-300"', 'class="bg-zinc-800"', 'class="ring-violet-500"',
      'class="bg-white p-2"', 'class="dark:bg-slate-900"', 'class="p-2 dark:text-white"',
    ]) {
      expect(offendersIn(bad).length, bad).toBeGreaterThan(0);
    }
  });

  it('spares the --shell-* token classes and ordinary utilities', () => {
    for (const ok of ['class="bg-shell-bg text-shell-text border-shell-line"', 'class="bg-shell-rail ring-shell-accent p-2 rounded-md"', 'class="hover:bg-shell-hover"']) {
      expect(offendersIn(ok), ok).toEqual([]);
    }
  });

  it('spares exactly the allow-listed class strings and nothing near them', () => {
    expect(offendersIn('class="text-red-700 dark:text-red-300"')).toEqual([]);
    expect(offendersIn('class="absolute bg-slate-900/70 text-white px-1"')).toEqual([]);
    expect(offendersIn('class="bg-amber-600 text-white"')).toEqual([]);
    // the pair must stay whole: either half alone, or an extra colour, is an offender
    expect(offendersIn('class="dark:text-red-300"').length).toBeGreaterThan(0);
    expect(offendersIn('class="bg-slate-900/70"').length).toBeGreaterThan(0);
    expect(offendersIn('class="bg-slate-900/70 text-black"').length).toBeGreaterThan(0);
    expect(offendersIn('class="bg-slate-900 text-white"').length).toBeGreaterThan(0);
  });

  it('the allow-list is exactly the two patterns of the plan: one status pair and two fixed scrims (three class strings)', () => {
    expect([...ALLOW_LIST]).toEqual(['text-red-700 dark:text-red-300', 'bg-slate-900/70 text-white', 'bg-amber-600 text-white']);
  });
});

describe('US-10.5 FR-28 / FR-29 / FR-30: no studio file carries a forbidden theme class (T37)', () => {
  it('the scan reads the studio: the container, the composer, the session list and the strip templates are all among the files', () => {
    const files = studioFiles();
    expect(files.length).toBeGreaterThanOrEqual(8);
    for (const must of ['image-studio.component.html', 'studio-composer.component.html', 'studio-session-list.component.html', 'studio-version-strip.component.html']) {
      expect(files.some((f) => f.endsWith(`/${must}`)), must).toBe(true);
    }
  });

  it('no studio template or component (specs excluded) has an offender - the failure message lists them per file', () => {
    const offenders = studioFiles()
      .map((f) => ({ file: f, tokens: [...new Set(offendersIn(readFileSync(join(root, f), 'utf8')))] }))
      .filter((o) => o.tokens.length > 0);
    expect(offenders).toEqual([]);
  });

  it('every NEW studio component of this Story has its template in the scan (header, feed, turn card, tile, empty state, full view, slider)', () => {
    const files = studioFiles();
    for (const dir of ['studio-header', 'studio-feed', 'studio-turn-card', 'studio-image-tile', 'studio-empty-state', 'studio-full-view', 'studio-compare-slider']) {
      expect(files.some((f) => f.includes(`/${dir}/`) && f.endsWith('.html')), dir).toBe(true);
    }
  });
});

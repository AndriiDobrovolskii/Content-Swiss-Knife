// @vitest-environment node
/**
 * US-10.1 T47 - architecture source scans (plan DD-28 a to g, validation categories C8, C14, C15).
 *
 * A STANDING GUARD: it asserts properties that must be true from the first commit to the last, so it PASSES ON ARRIVAL
 * on a tree that has no studio files (breakdown "Standing guard"). If it goes red, a task broke a design rule; that is a
 * defect of the task, not an expected red-list failure.
 *
 *   a  no `src/**\/*.ts` imports `@google/genai` (NFR-1; arch-guard Rule 1 only greps the Anthropic and OpenAI imports)
 *   b  no `server/image-studio/**` imports `retrieval/`, and the studio does no web search or page fetch (Rule 2, FR-7)
 *   c  `.env.example` defines no image-model variable (FR-7, NFR-2)
 *   d  Rule 1 for the server: no file under `server/` other than `server/providers/gemini.js` imports, requires or
 *      dynamically imports `@google/genai`
 *   e  NFR-4 / FR-80: no studio file references `PromptPayload` / `systemBlocks` or imports `prompt-core/payload`, and no
 *      studio (non-spec) file sets a `systemInstruction`
 *   f  within the studio files, only `browser-ports.ts` calls the global `alert(` / `confirm(` (FR-81, NFR-14)
 *   g  non-spec files under `src/utils/image-studio/` contain none of the ambient effects of NFR-14: `window.`,
 *      `document.`, `indexedDB`, `localStorage`, `navigator.`, `Date.now`, `new Date(`, `setTimeout(`, `setInterval(`,
 *      `Math.random`, `crypto.`, `alert(`, `confirm(` - every effect goes through a port of DD-15
 *
 * Every scan reads source TEXT with comments stripped (the existing `server/utils/retry.js` and `timeouts.js` mention the
 * SDK name in prose) and matches import statements / call syntax, not prose. Every scanner is proven NON-VACUOUS below on a
 * synthetic offending string, so a broken scanner fails rather than passing on an empty result, and the directory
 * walkers tolerate missing directories (no studio file exists yet).
 *
 * Reading of `alert(` / `confirm(` / `setTimeout(` in scans f and g (a test-writer interpretation, flagged in the notes):
 * a port INTERFACE MEMBER such as `alert(message: string): void;` in ports.ts is a declaration, not an ambient call, so a
 * match whose parenthesised text carries a type annotation (`name: type`) is not counted, and a call through an object
 * (`this.alertPort.alert(x)`, `clock.setTimeout(...)`) is not an ambient call either.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

// ---------------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------------

function walk(dir: string, out: string[] = []): string[] {
  const abs = join(root, dir);
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}

/** Remove block and line comments. A `//` inside a string literal (a URL) is kept: it is only stripped when it is
 *  at the start of a line or preceded by whitespace. */
export function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1');
}

const read = (f: string) => stripComments(readFileSync(join(root, f), 'utf8'));
const isSpec = (f: string) => /\.spec\.ts$/.test(f);

const SDK = '@google\\/genai(?:\\/[^\'"`]*)?';
const SDK_IMPORT = new RegExp(
  `(?:\\bfrom\\s*|\\bimport\\s*\\(?\\s*|\\brequire\\s*\\(\\s*)['"\`]${SDK}['"\`]`,
);
/** True when the (comment-stripped) source imports, requires or dynamically imports the SDK. */
export const importsSdk = (src: string) => SDK_IMPORT.test(src);

export const importsRetrieval = (src: string) =>
  /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"`][^'"`]*\bretrieval\//.test(src);
export const performsWebFetch = (src: string) => /(?<![.\w$])fetch\s*\(/.test(src) || /\bserper\b/i.test(src);

export const referencesPayload = (src: string) =>
  /\bPromptPayload\b|\bsystemBlocks\b|prompt-core\/payload/.test(src);
export const setsSystemInstruction = (src: string) => /\bsystemInstruction\b/.test(src);

/** Global (ambient) call of alert/confirm: not a method call, not a typed declaration. */
function ambientCalls(src: string, name: string): number {
  let n = 0;
  const re = new RegExp(`(?<![.\\w$])(?:window\\.)?${name}\\s*\\(([^)]*)\\)`, 'g');
  for (const m of src.matchAll(re)) {
    if (/\w\s*\??\s*:\s*\S/.test(m[1])) continue; // `alert(message: string)` is a declaration
    n += 1;
  }
  return n;
}
export const callsAlertOrConfirm = (src: string) => ambientCalls(src, 'alert') + ambientCalls(src, 'confirm') > 0;

const AMBIENT: Array<[string, (src: string) => boolean]> = [
  ['window.', (s) => /(?<![\w$.])window\./.test(s)],
  ['document.', (s) => /(?<![\w$.])document\./.test(s)],
  ['indexedDB', (s) => /\bindexedDB\b/.test(s)],
  ['localStorage', (s) => /\blocalStorage\b/.test(s)],
  ['navigator.', (s) => /(?<![\w$.])navigator\./.test(s)],
  ['Date.now', (s) => /\bDate\.now\b/.test(s)],
  ['new Date(', (s) => /\bnew\s+Date\s*\(/.test(s)],
  ['setTimeout(', (s) => ambientCalls(s, 'setTimeout') > 0],
  ['setInterval(', (s) => ambientCalls(s, 'setInterval') > 0],
  ['Math.random', (s) => /\bMath\.random\b/.test(s)],
  ['crypto.', (s) => /(?<![\w$.])crypto\./.test(s)],
  ['alert(', (s) => ambientCalls(s, 'alert') > 0],
  ['confirm(', (s) => ambientCalls(s, 'confirm') > 0],
];
export const ambientEffectsIn = (src: string): string[] => AMBIENT.filter(([, test]) => test(src)).map(([n]) => n);

const STUDIO_CLIENT_DIRS = ['src/utils/image-studio', 'src/services/image-studio', 'src/app/components/image-studio'];
const STUDIO_ALL_DIRS = [...STUDIO_CLIENT_DIRS, 'server/image-studio'];
const filesIn = (dirs: string[], pred: (f: string) => boolean = () => true) => dirs.flatMap((d) => walk(d)).filter(pred);
const isSource = (f: string) => /\.(ts|js|mjs)$/.test(f);

// ---------------------------------------------------------------------------------------------------------------------
// The scanners are not vacuous (each one is proven on a synthetic offender and a synthetic clean string)
// ---------------------------------------------------------------------------------------------------------------------

describe('scanners are proven non-vacuous', () => {
  it('a/d: the SDK scanner flags static, dynamic and require forms and ignores prose and other packages', () => {
    expect(importsSdk(`import { GoogleGenAI } from '@google/genai';`)).toBe(true);
    expect(importsSdk(`import '@google/genai';`)).toBe(true);
    expect(importsSdk(`const m = await import("@google/genai");`)).toBe(true);
    expect(importsSdk(`const { ApiError } = require('@google/genai');`)).toBe(true);
    expect(importsSdk(`import { x } from '@google/genai/web';`)).toBe(true);
    expect(importsSdk(stripComments(`// uses @google/genai internally\n/* import x from '@google/genai' */\nconst a = 1;`))).toBe(false);
    expect(importsSdk(`import z from 'zod';`)).toBe(false);
  });

  it('b: the retrieval scanner flags a retrieval import and the fetch scanner flags a page fetch', () => {
    expect(importsRetrieval(`import { x } from '../retrieval/jina.js';`)).toBe(true);
    expect(importsRetrieval(`import { x } from './rate-limiter.js';`)).toBe(false);
    expect(performsWebFetch(`const r = await fetch(url);`)).toBe(true);
    expect(performsWebFetch(`const prefetch = 1; await this.http.fetchAll();`)).toBe(false);
  });

  it('e: the payload scanner flags PromptPayload, systemBlocks and the payload import; systemInstruction is flagged separately', () => {
    expect(referencesPayload(`import { PromptPayload } from '../prompt-core/payload';`)).toBe(true);
    expect(referencesPayload(`const b = payload.systemBlocks;`)).toBe(true);
    expect(referencesPayload(`const request = { history, newTurn };`)).toBe(false);
    expect(setsSystemInstruction(`config: { systemInstruction: 'x' }`)).toBe(true);
    expect(setsSystemInstruction(`config: { responseModalities: ['IMAGE'] }`)).toBe(false);
  });

  it('f/g: the ambient-call scanner flags a global call and spares a port member and a typed declaration', () => {
    expect(callsAlertOrConfirm(`alert('quota');`)).toBe(true);
    expect(callsAlertOrConfirm(`if (window.confirm('x')) {}`)).toBe(true);
    expect(callsAlertOrConfirm(`this.alertPort.alert(message);`)).toBe(false);
    expect(callsAlertOrConfirm(`export interface AlertPort { alert(message: string): void }`)).toBe(false);
    expect(ambientEffectsIn(`const t = setTimeout(() => go(), 10);`)).toEqual(['setTimeout(']);
    expect(ambientEffectsIn(`export interface Scheduler { setTimeout(fn: () => void, ms: number): unknown }`)).toEqual([]);
    expect(ambientEffectsIn(`this.scheduler.setTimeout(fn, 5);`)).toEqual([]);
  });

  it('g: every one of the thirteen NFR-14 tokens is detected', () => {
    const offenders: Record<string, string> = {
      'window.': 'const w = window.innerWidth;',
      'document.': 'document.title = "x";',
      indexedDB: 'indexedDB.open("db");',
      localStorage: 'localStorage.getItem("k");',
      'navigator.': 'navigator.clipboard.write([]);',
      'Date.now': 'const n = Date.now();',
      'new Date(': 'const d = new Date();',
      'setTimeout(': 'setTimeout(() => {}, 1);',
      'setInterval(': 'setInterval(() => {}, 1);',
      'Math.random': 'const r = Math.random();',
      'crypto.': 'const id = crypto.randomUUID();',
      'alert(': 'alert("x");',
      'confirm(': 'confirm("x");',
    };
    expect(Object.keys(offenders)).toHaveLength(13);
    for (const [token, code] of Object.entries(offenders)) {
      expect(ambientEffectsIn(code), `${token} not detected in: ${code}`).toContain(token);
    }
    expect(ambientEffectsIn('const a = this.clock.now(); const id = this.ids.next();')).toEqual([]);
  });

  it('the directory walker tolerates a missing directory', () => {
    expect(walk('src/utils/definitely-not-a-directory')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The scans proper
// ---------------------------------------------------------------------------------------------------------------------

describe('NFR-1 / Rule 1: the vendor SDK stays in server/providers/gemini.js', () => {
  it('scan a: no src/**/*.ts file imports @google/genai', () => {
    const files = walk('src').filter((f) => f.endsWith('.ts'));
    expect(files.length, 'premise: src/ walked').toBeGreaterThan(50);
    expect(files.filter((f) => importsSdk(read(f)))).toEqual([]);
  });

  it('scan d: no file under server/ other than server/providers/gemini.js imports, requires or dynamically imports @google/genai', () => {
    const files = walk('server').filter((f) => /\.(js|mjs|cjs)$/.test(f));
    expect(files, 'premise: gemini.js is walked').toContain('server/providers/gemini.js');
    const importers = files.filter((f) => importsSdk(read(f)));
    expect(importers.filter((f) => f !== 'server/providers/gemini.js')).toEqual([]);
    expect(importers, 'premise: the provider itself imports the SDK').toContain('server/providers/gemini.js');
  });
});

describe('Rule 2 / FR-7 / NFR-2: the studio does no retrieval and adds no environment variable', () => {
  it('scan b: no server/image-studio file imports retrieval/ or performs a web search or page fetch', () => {
    const files = filesIn(['server/image-studio'], isSource);
    const offenders = files.filter((f) => {
      const src = read(f);
      return importsRetrieval(src) || performsWebFetch(src);
    });
    expect(offenders).toEqual([]);
  });

  it('scan b: no client studio file imports the retrieval service', () => {
    const files = filesIn(STUDIO_CLIENT_DIRS, (f) => isSource(f) && !isSpec(f));
    expect(files.filter((f) => /retrieval/.test(read(f)))).toEqual([]);
  });

  it('scan c / FR-7: .env.example defines no image-model variable (the key entry stays)', () => {
    const env = readFileSync(join(root, '.env.example'), 'utf8')
      .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    const names = env.map((l) => l.split('=')[0]);
    expect(names, 'premise: the existing Gemini key entry is present').toContain('GEMINI_API_KEY');
    expect(names.filter((n) => /IMAGE|NANO|BANANA|STUDIO/i.test(n))).toEqual([]);
  });
});

describe('NFR-4 / FR-80: the studio builds no PromptPayload and sets no system instruction', () => {
  it('scan e: no studio file (client or server/image-studio, specs excluded) references PromptPayload, systemBlocks or imports prompt-core/payload', () => {
    const files = filesIn(STUDIO_ALL_DIRS, (f) => isSource(f) && !isSpec(f));
    expect(files.filter((f) => referencesPayload(read(f)))).toEqual([]);
  });

  it('scan e: no studio request builder or handler sets a systemInstruction', () => {
    const files = filesIn(STUDIO_ALL_DIRS, (f) => isSource(f) && !isSpec(f));
    expect(files.filter((f) => setsSystemInstruction(read(f)))).toEqual([]);
  });
});

describe('NFR-14 / FR-81: ambient effects go through ports', () => {
  it('scan f: within the studio files only browser-ports.ts calls the global alert( / confirm(', () => {
    const files = filesIn(STUDIO_CLIENT_DIRS, (f) => isSource(f) && !isSpec(f));
    const callers = files.filter((f) => callsAlertOrConfirm(read(f)));
    expect(callers.filter((f) => !f.endsWith('/browser-ports.ts'))).toEqual([]);
  });

  it('scan g: non-spec files under src/utils/image-studio use none of the NFR-14 ambient effects', () => {
    const files = filesIn(['src/utils/image-studio'], (f) => isSource(f) && !isSpec(f));
    const offences = files
      .map((f) => ({ file: f, effects: ambientEffectsIn(read(f)) }))
      .filter((o) => o.effects.length > 0);
    expect(offences).toEqual([]);
  });
});

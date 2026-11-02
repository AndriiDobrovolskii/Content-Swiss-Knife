// @vitest-environment node
/**
 * US-10.1 T48 - guard for the scoped `undici` pin that `cheerio` loads (task_breakdown v4, T48 "Tests to turn green").
 *
 * WHY THIS EXISTS. `cheerio` (loaded by `server/retrieval/*`) requires `undici ^7.19.0`; with the hoisted 7.28.0 it installs a
 * process-wide dispatcher that the Node-bundled `fetch` (undici 7.24.4 on Node 24.15.0) cannot use, so the real Gemini Files
 * API upload answers `UND_ERR_INVALID_ARG` (502 UPSTREAM_RETRIES_EXHAUSTED). The fix is ONE scoped override in package.json:
 *
 *     "overrides": { "cheerio": { "undici": "<exact version>" } }
 *
 * and an npm-regenerated lockfile that gives cheerio its own nested `node_modules/cheerio/node_modules/undici`.
 *
 * WHAT THIS FILE PROVES AND WHAT IT DOES NOT. It is a source-and-lockfile guard (no network, no TLS): it proves the pin is
 * present, EXACT, inside the verified window, locked, installed, and that nothing else (a direct dependency, a global or other-
 * parent override, a bare `undici` import in server/) can silently undo it. It does NOT prove the defect is gone. That proof is
 * the builder's real-route check of T48 (a real HTTPS upload through `node server/index.js`, HTTP 200 with a `fileUri`); it is
 * the primary evidence, and this spec is only supporting coverage of it (plan_review N-23). A behavioural TLS test is not
 * planned (open point O-11).
 *
 * THE VERSION IS NOT HARD-CODED. The builder picks it after this test exists. The test reads the pin from package.json and
 * checks it against the verified WINDOW [7.24.4, 7.26.0): 7.24.4 is the undici bundled in Node 24.15.0 (no skew at all);
 * 7.26.0 is the first release the planner's repro showed failing. The window bounds are the only versions named here.
 *
 *   1  package.json `overrides.cheerio.undici` exists and is an EXACT MAJOR.MINOR.PATCH string (no range operator, no tag)
 *   2  the pin is inside the window (non-vacuity proof on synthetic inputs: 7.26.0, 7.28.0, a range and a lower version fail)
 *   3  package-lock.json has `node_modules/cheerio/node_modules/undici` at exactly the pin, with `resolved` and `integrity`
 *   4  the copy that resolves from cheerio's directory in node_modules equals the pin (a missing install FAILS, never skips)
 *   5  `undici` appears nowhere in dependencies / devDependencies / optionalDependencies / peerDependencies, and the only
 *      override path that names it is `cheerio > undici` (so not top-level, and not nested under another parent such as
 *      `@angular/build`)
 *   6  no file under server/ imports, requires or dynamically imports the bare specifier `undici` (comments that merely
 *      MENTION undici - server/utils/retry.js, server/utils/describe-error.js - do not count)
 *
 * Deliberately NOT asserted (they must not fail this spec): the hoisted `node_modules/undici` (7.28.0, required exactly by
 * `@angular/build`) and `node_modules/node-gyp/node_modules/undici` (6.27.0). "A single copy is installed" is not a goal.
 *
 * Test seam: the tree under test is `process.cwd()` unless the env var UNDICI_PIN_ROOT names another directory root (a scratch
 * tree holding package.json, package-lock.json, node_modules/cheerio/node_modules/undici/package.json and server/). It lets the
 * guard be shown green against a reference tree without touching the repository. It is unset in the gate.
 *
 * Determinism: reads files only. No network, no clock, no randomness.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.env['UNDICI_PIN_ROOT'] ? resolve(process.env['UNDICI_PIN_ROOT']) : process.cwd();

// ---------------------------------------------------------------------------------------------------------------------
// Pure helpers (each one is proven non-vacuous below on synthetic inputs)
// ---------------------------------------------------------------------------------------------------------------------

type Semver = readonly [number, number, number];
/** The verified window: at least the undici bundled in Node 24.15.0, strictly below the first release that failed. */
const WINDOW_MIN: Semver = [7, 24, 4];
const WINDOW_BELOW: Semver = [7, 26, 0];

const EXACT = /^(\d+)\.(\d+)\.(\d+)$/;

function parseExact(v: string): Semver | null {
  const m = EXACT.exec(v);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function cmp(a: Semver, b: Semver): number {
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return 0;
}

/** Why `value` is not an acceptable exact pin, or null when it is acceptable. Used by cases 1 and 2. */
function exactProblem(value: unknown): string | null {
  if (value === undefined) return 'is missing';
  if (typeof value !== 'string') return `is not a string (got ${typeof value})`;
  if (parseExact(value) === null) {
    return `is "${value}", not an exact MAJOR.MINOR.PATCH string (no range operator, tag, prerelease or wildcard allowed)`;
  }
  return null;
}

/** Why `value` is outside the verified window [7.24.4, 7.26.0), or null when it is inside. */
function windowProblem(value: unknown): string | null {
  const exact = exactProblem(value);
  if (exact !== null) return exact;
  const v = parseExact(value as string) as Semver;
  if (cmp(v, WINDOW_MIN) < 0) return `"${value}" is below the verified window (needs >= 7.24.4)`;
  if (cmp(v, WINDOW_BELOW) >= 0) return `"${value}" is at or above 7.26.0, the first release that failed on the real route`;
  return null;
}

/** Remove block and line comments (same approach as test/image-studio-architecture.spec.ts: a `//` in a URL string is kept
 *  because a line comment is only stripped at the start of a line or after whitespace). */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1');
}

/** `undici` or a subpath of it (`undici/lib/...`), nothing else: `undici-types` and `@scope/undici` are different modules. */
const UNDICI_SPEC = "undici(?:\\/[^'\"`]*)?";
const UNDICI_IMPORT = new RegExp(
  `(?:\\bfrom\\s*|\\bimport\\s*\\(?\\s*|\\brequire\\s*\\(\\s*)['"\`]${UNDICI_SPEC}['"\`]`,
);
/** True when the source (comments stripped here) imports, requires or dynamically imports the bare specifier `undici`. */
function importsUndici(src: string): boolean {
  return UNDICI_IMPORT.test(stripComments(src));
}

/** Every override path (dot-joined) whose key names the package `undici`, at any depth and under any parent. A key such as
 *  `undici@^7` (npm's name@range selector) names undici too. */
function undiciOverridePaths(node: unknown, trail: string[] = [], out: string[] = []): string[] {
  if (node === null || typeof node !== 'object') return out;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    const name = key.replace(/@[^@/]*$/, '') || key; // 'undici@^7' -> 'undici'; '@angular/build' stays whole
    const here = [...trail, key];
    if (name === 'undici') out.push(here.join(' > '));
    undiciOverridePaths(value, here, out);
  }
  return out;
}

function walk(dir: string, out: string[] = []): string[] {
  const abs = join(root, dir);
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    if (name === 'node_modules' || name === '.git') continue;
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// The tree under test
// ---------------------------------------------------------------------------------------------------------------------

function readJson(rel: string): any {
  const abs = join(root, rel);
  if (!existsSync(abs)) throw new Error(`${rel} not found under ${root}`);
  return JSON.parse(readFileSync(abs, 'utf8'));
}

const pkg = readJson('package.json');
const lock = readJson('package-lock.json');

/** The pin as written in package.json, or undefined when `overrides.cheerio.undici` does not exist. */
const pin: unknown = pkg.overrides?.cheerio?.undici;
const pinText = typeof pin === 'string' ? pin : undefined;

const NESTED_LOCK_KEY = 'node_modules/cheerio/node_modules/undici';

// ---------------------------------------------------------------------------------------------------------------------
// Case 1 - exact pin present
// ---------------------------------------------------------------------------------------------------------------------

describe('T48 case 1: package.json pins undici for cheerio as an exact version', () => {
  it('case 1: overrides.cheerio.undici exists and is an exact MAJOR.MINOR.PATCH string (no range operator, no tag)', () => {
    expect(
      exactProblem(pin),
      `package.json overrides.cheerio.undici ${exactProblem(pin)} (overrides is ${JSON.stringify(pkg.overrides)})`,
    ).toBeNull();
  });

  it('case 1 non-vacuity: the exactness check accepts exact versions and rejects ranges, tags, prereleases and non-strings', () => {
    for (const ok of ['7.24.4', '7.25.0', '7.24.8', '10.0.1']) expect(exactProblem(ok), ok).toBeNull();
    for (const bad of ['^7.25.0', '~7.24.4', '>=7.24.4', '7.x', '7.24', '*', 'latest', '7.25.0-beta.1', ' 7.25.0', '7.25.0 ', 'v7.25.0', '']) {
      expect(exactProblem(bad), `"${bad}" must be rejected`).not.toBeNull();
    }
    expect(exactProblem(undefined)).toMatch(/missing/);
    expect(exactProblem(7.25)).toMatch(/not a string/);
    expect(exactProblem({ undici: '7.25.0' })).toMatch(/not a string/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Case 2 - inside the verified window
// ---------------------------------------------------------------------------------------------------------------------

describe('T48 case 2: the pin is inside the verified window [7.24.4, 7.26.0)', () => {
  it('case 2: the pinned version is at least 7.24.4 and below 7.26.0', () => {
    expect(windowProblem(pin), `package.json overrides.cheerio.undici ${windowProblem(pin)}`).toBeNull();
  });

  it('case 2 non-vacuity: the window check accepts versions inside and rejects 7.26.0, 7.28.0, a range and a lower version', () => {
    // inside: the three candidates the plan names and both ends of the window as they are
    for (const ok of ['7.24.4', '7.24.8', '7.25.0', '7.25.9']) expect(windowProblem(ok), ok).toBeNull();
    // at and above the first failing release
    expect(windowProblem('7.26.0')).toMatch(/7\.26\.0/);
    expect(windowProblem('7.28.0')).toMatch(/at or above 7\.26\.0/);
    expect(windowProblem('7.30.1')).toMatch(/at or above 7\.26\.0/);
    expect(windowProblem('8.0.0')).toMatch(/at or above 7\.26\.0/);
    // below the Node-bundled copy
    expect(windowProblem('7.24.3')).toMatch(/below the verified window/);
    expect(windowProblem('7.23.9')).toMatch(/below the verified window/);
    expect(windowProblem('6.27.0')).toMatch(/below the verified window/);
    // a range string is never an acceptable pin even when its base version is inside the window
    for (const range of ['^7.25.0', '~7.24.4', '>=7.24.4 <7.26.0', '7.25.x']) {
      expect(windowProblem(range), range).toMatch(/not an exact/);
    }
    // missing is a failure, not a pass
    expect(windowProblem(undefined)).toMatch(/missing/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Case 3 - the lockfile
// ---------------------------------------------------------------------------------------------------------------------

describe('T48 case 3: package-lock.json gives cheerio its own undici at exactly the pin', () => {
  const entry = lock.packages?.[NESTED_LOCK_KEY];

  it(`case 3: ${NESTED_LOCK_KEY} exists, its version equals the pin, and it carries resolved and integrity`, () => {
    expect(pinText, 'there is no pin in package.json (overrides.cheerio.undici), so the lockfile has nothing to match').toBeDefined();
    expect(entry, `package-lock.json has no "${NESTED_LOCK_KEY}" entry (cheerio still shares the hoisted undici)`).toBeDefined();
    expect(entry.version, 'locked version must equal the pin').toBe(pinText);
    expect(entry.resolved, 'resolved must be the registry tarball of the pinned version').toMatch(
      new RegExp(`/undici/-/undici-${(pinText as string).replace(/\./g, '\\.')}\\.tgz$`),
    );
    expect(entry.integrity, 'integrity must be an SRI hash').toMatch(/^sha(?:256|384|512)-[A-Za-z0-9+/]+=*$/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Case 4 - the installed tree
// ---------------------------------------------------------------------------------------------------------------------

/** The undici that Node's resolution finds from cheerio's directory: its own nested copy, else the hoisted one. */
function resolveFromCheerio(): { version: string; where: string } | { error: string } {
  const nodeModules = join(root, 'node_modules');
  if (!existsSync(nodeModules)) {
    return { error: `node_modules is absent under ${root}: run "npm install" first; this case cannot pass on an uninstalled tree` };
  }
  if (!existsSync(join(nodeModules, 'cheerio', 'package.json'))) {
    return { error: `node_modules/cheerio is not installed under ${root}` };
  }
  const candidates = ['node_modules/cheerio/node_modules/undici', 'node_modules/undici'];
  for (const dir of candidates) {
    const file = join(root, dir, 'package.json');
    if (existsSync(file)) return { version: JSON.parse(readFileSync(file, 'utf8')).version, where: dir };
  }
  return { error: 'no undici is installed for cheerio (neither nested nor hoisted)' };
}

describe('T48 case 4: the installed copy that cheerio resolves equals the pin', () => {
  it('case 4: node_modules/cheerio/node_modules/undici (else the hoisted copy) has the pinned version', () => {
    expect(pinText, 'there is no pin in package.json (overrides.cheerio.undici), so the installed tree cannot match it').toBeDefined();
    const found = resolveFromCheerio();
    if ('error' in found) throw new Error(found.error);
    expect(
      found.version,
      `cheerio resolves undici from ${found.where}; run "npm install" so the installed tree matches the lock`,
    ).toBe(pinText);
    expect(found.where, 'cheerio must have its OWN nested copy, not the hoisted one').toBe('node_modules/cheerio/node_modules/undici');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Case 5 - nothing else names undici
// ---------------------------------------------------------------------------------------------------------------------

describe('T48 case 5: the scoped override is the ONLY place package.json names undici', () => {
  it('case 5: undici is in no dependency field, and the only override path naming it is cheerio > undici', () => {
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      expect(Object.keys(pkg[field] ?? {}), `package.json ${field} must not list undici`).not.toContain('undici');
    }
    const paths = undiciOverridePaths(pkg.overrides);
    const stray = paths.filter((p) => p !== 'cheerio > undici');
    expect(stray, `package.json overrides names undici outside cheerio > undici: ${JSON.stringify(stray)}`).toEqual([]);
  });

  it('case 5 non-vacuity: the override collector finds a top-level, a nested-under-another-parent and a selector-form undici key', () => {
    expect(undiciOverridePaths({ undici: '7.25.0' })).toEqual(['undici']);
    expect(undiciOverridePaths({ 'undici@^7.19.0': '7.25.0' })).toEqual(['undici@^7.19.0']);
    expect(undiciOverridePaths({ '@angular/build': { undici: '7.25.0' } })).toEqual(['@angular/build > undici']);
    expect(undiciOverridePaths({ a: { b: { undici: '1.0.0' } } })).toEqual(['a > b > undici']);
    expect(undiciOverridePaths({ cheerio: { undici: '7.25.0' } })).toEqual(['cheerio > undici']);
    // the existing overrides and unrelated packages are not mistaken for undici
    expect(undiciOverridePaths({ 'node-domexception': '^2.0.2', 'fetch-blob': '^4.0.0', 'undici-types': '6.21.0' })).toEqual([]);
    expect(undiciOverridePaths(undefined)).toEqual([]);
  });

  it('case 5 non-vacuity: the dependency-field check would see a direct undici dependency', () => {
    const synthetic = { dependencies: { cheerio: '^1.2.0', undici: '^7.25.0' } };
    expect(Object.keys(synthetic.dependencies)).toContain('undici');
    expect(Object.keys((pkg as any).dependencies)).toContain('cheerio'); // the real field is read, not an empty object
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Case 6 - no bare undici import under server/
// ---------------------------------------------------------------------------------------------------------------------

describe('T48 case 6: nothing under server/ imports the bare specifier undici', () => {
  it('case 6: no server/ source file has an import, require or dynamic import() of undici', () => {
    const files = walk('server').filter((f) => /\.(?:js|mjs|cjs|ts)$/.test(f));
    expect(files.length, 'the scan must actually see the server sources (an empty walk would pass vacuously)').toBeGreaterThan(0);
    const offenders = files.filter((f) => importsUndici(readFileSync(join(root, f), 'utf8')));
    expect(offenders, `a bare undici import resolves the hoisted, unpinned copy: ${JSON.stringify(offenders)}`).toEqual([]);
  });

  it('case 6 non-vacuity: the scanner matches static, side-effect, require and dynamic import forms and ignores comments and look-alikes', () => {
    expect(importsUndici(`import x from 'undici';`)).toBe(true);
    expect(importsUndici(`import { fetch, Agent } from "undici";`)).toBe(true);
    expect(importsUndici(`import 'undici';`)).toBe(true);
    expect(importsUndici(`export { setGlobalDispatcher } from 'undici';`)).toBe(true);
    expect(importsUndici(`const u = require('undici');`)).toBe(true);
    expect(importsUndici(`const { Agent } = require("undici");`)).toBe(true);
    expect(importsUndici(`const u = await import('undici');`)).toBe(true);
    expect(importsUndici(`const u = await import(\`undici\`);`)).toBe(true);
    expect(importsUndici(`import { x } from 'undici/lib/dispatcher';`)).toBe(true);
    // a mention in a comment is NOT an import (the real server/utils/retry.js and describe-error.js do this)
    expect(importsUndici(`// Node/undici surfaces these as a bare TypeError\nconst a = 1;`)).toBe(false);
    expect(importsUndici(`/* import x from 'undici' */\nconst a = 1;`)).toBe(false);
    expect(importsUndici(`// require('undici') would load the hoisted copy\nconst a = 1;`)).toBe(false);
    expect(importsUndici(` * \`UND_ERR_*\` are undici's own; the rest are libuv/OS`)).toBe(false);
    expect(importsUndici(`const note = 'undici repeats itself down the chain';`)).toBe(false);
    // look-alike modules are different packages
    expect(importsUndici(`import t from 'undici-types';`)).toBe(false);
    expect(importsUndici(`import x from '@scope/undici';`)).toBe(false);
    expect(importsUndici(`import cheerio from 'cheerio';`)).toBe(false);
  });
});

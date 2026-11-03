// @vitest-environment node
/**
 * US-10.2 - guard for the Node runtime pin and the scoped `undici` pin that `cheerio` loads (plan DD-1..DD-7, spec FR-1..FR-9, FR-14).
 *
 * WHY THIS EXISTS. `cheerio` (loaded by `server/retrieval/*`) requires `undici ^7.19.0`. When the copy npm installs for it is not the
 * `undici` that the running Node bundles for its own `fetch`, the process-wide dispatcher cheerio installs cannot be used by the
 * Node-bundled `fetch`, and the real Gemini Files API upload answers `UND_ERR_INVALID_ARG` (502 UPSTREAM_RETRIES_EXHAUSTED). The fix is
 * ONE scoped override in package.json, `"overrides": { "cheerio": { "undici": "<exact version>" } }`, plus an npm-regenerated lockfile
 * that gives cheerio its own nested `node_modules/cheerio/node_modules/undici`. That pin is correct for ONE Node release only, so the
 * repository also names that Node release (`.nvmrc` and `engines.node`) and this file fails the moment any of the three drift apart.
 *
 * US-10.2 AMENDMENT (AGENTS.md 7.7: a requirement changed the rule of this guard, so the change is NAMED here and not made silently).
 *   - REMOVED: the version-window constants, the window check and its two cases (the window case and its non-vacuity case). They
 *     pinned the Pin to a fixed range, from the undici bundled in Node 24.15.0 up to (not including) the first npm release that failed
 *     on that Node (7.26.0). On the new Pin that case would be red by construction (the new Pin lies above the old upper bound), which
 *     has the shape of "deleting a failing test"; it is legitimate only because the REQUIREMENT changed the rule (spec FR-8, AC-5):
 *     the rule is no longer a fixed range but "the Pin equals the undici bundled in the Running Node, whatever its value".
 *   - NEWLY PROVEN: that equality for any value (FR-7, plus the synthetic cases S6/S7: a Pin that differs from the bundled undici is
 *     rejected, one that equals it is accepted), and the runtime-pin cases FR-4 (a)-(e) and FR-6 (`.nvmrc` and `engines.node` are
 *     exact and equal, and the Running Node is the pinned Node, failing - never skipping - on any other Node).
 *   - NO LONGER SHOWN: the guard does not encode WHICH npm releases were empirically good or bad on Node 24.15.0; that sweep stays in
 *     docs/plans/US-10.1-task-breakdown.md. A Pin that equals the bundled undici is accepted even if nobody ever ran it live; that
 *     proof is the recorded live upload (AC-10), not this file.
 *   - Requirement ids: FR-8, AC-5. Replacement cases: FR-7 and the S6/S7 groups below. Precedent for the form of this note:
 *     src/prompts/task-c.description-bytes.spec.ts (its US-9.1 AMENDMENT header).
 *
 * WHAT THIS FILE PROVES AND WHAT IT DOES NOT. It is a source, lockfile and runtime-string guard (no network, no TLS): it proves the
 * runtime pin is present, exact and internally consistent, the Running Node is the pinned one, the Pin equals that Node's bundled
 * undici, and that the Pin is exact, locked, installed and not undone by a direct dependency, a stray override or a bare `undici`
 * import under server/. It does NOT prove the defect is gone: that proof is the recorded real-route upload through `node
 * server/index.js` on the pinned Node (AC-10), and this file is only supporting coverage of it (plan_review N-23).
 *
 * DESIGN (plan DD-1, DD-2, DD-3). One set of PURE decision functions takes plain values (the `.nvmrc` text, `engines`, the Running
 * Node string, the bundled undici string, the Pin) and returns `{ ok: true }` or `{ ok: false, cause, field, message }`; the message
 * starts with exactly one cause tag [C1]..[C5] (C1 .nvmrc, C2 engines.node, C3 Running Node differs from .nvmrc, C4 Pin differs from
 * the bundled undici, C5 .nvmrc differs from engines.node). The REAL cases and the SYNTHETIC cases call the SAME functions, so a
 * non-vacuity proof proves something about the real case. Every file read is lazy and non-throwing behind an injected `io`: a missing
 * `.nvmrc` fails ONE named case, never the whole file at import.
 *
 * NO VERSION IS HARD-CODED (spec FR-8). The pinned Node comes from `.nvmrc` / `engines.node`, the Pin from package.json, the bundled
 * undici from the runtime. Version literals below are synthetic inputs of non-vacuity cases only.
 *
 * Test seam: the tree under test is `process.cwd()` unless the env var UNDICI_PIN_ROOT names another directory root (a scratch tree
 * holding .nvmrc, package.json, package-lock.json, node_modules/cheerio/node_modules/undici/package.json and server/). It lets the
 * guard be shown green against a reference tree without touching the repository. It only chooses WHICH TREE the file cases read; the
 * runtime cases still read the real `process`. It is unset in the gate, and the seam is printed once when it is set.
 *
 * Deliberately NOT asserted (they must not fail this spec): the hoisted `node_modules/undici` and
 * `node_modules/node-gyp/node_modules/undici`. "A single copy is installed" is not a goal.
 *
 * Determinism: reads files and the running runtime only. No network, no clock, no randomness, nothing is written.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SEAM = process.env['UNDICI_PIN_ROOT'];
const root = SEAM ? resolve(SEAM) : process.cwd();
if (SEAM) console.warn(`[undici-pin] UNDICI_PIN_ROOT is set: the file cases read the tree at ${root}, not the repository`);

// ---------------------------------------------------------------------------------------------------------------------
// Pure decisions (each one is proven non-vacuous below on synthetic inputs, and the real cases call the very same code)
// ---------------------------------------------------------------------------------------------------------------------

type Cause = 'C1' | 'C2' | 'C3' | 'C4' | 'C5';
type Failure = { ok: false; cause: Cause; field: string; message: string };
type Verdict = { ok: true } | Failure;
/** A type guard (the repository does not enable strictNullChecks, so `!v.ok` alone does not narrow the union). */
function isFail(v: Verdict): v is Failure {
  return !v.ok;
}

interface PinInputs {
  /** Where the files were looked for. Appears in messages only. */
  root: string;
  /** The raw `.nvmrc` text, or null when the file is absent or unreadable. */
  nvmrc: string | null;
  /** Why `nvmrc` is null: 'missing' or 'unreadable (...)'. Messages only; absent means 'missing'. */
  nvmrcProblem?: string | null;
  /** Why package.json could not be read ('missing' or 'unreadable (...)'), or null/absent when it was read. */
  pkgProblem?: string | null;
  /** The parsed `engines` value of package.json (undefined when absent). */
  engines: unknown;
  /** The Running Node, as `process.version` prints it (leading "v"). */
  running: string;
  /** `process.versions.undici` of the Running Node (undefined when the runtime has none). */
  bundled: string | undefined;
  /** The parsed `overrides.cheerio.undici` of package.json (undefined when absent). */
  pin: unknown;
}

const PASS: Verdict = { ok: true };
function fail(cause: Cause, field: string, text: string): Verdict {
  return { ok: false, cause, field, message: `[${cause}] ${text}` };
}

const EXACT = /^(\d+)\.(\d+)\.(\d+)$/;

/** Offending content with every non-printable (and "[" and a quote) escaped, so an invisible character is visible and the
 *  message cannot carry a second cause tag. */
function show(s: string): string {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0) as number;
    if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (c >= 0x20 && c <= 0x7e && ch !== '[' && ch !== '\\' && ch !== '"') out += ch;
    else out += c > 0xffff ? `\\u{${c.toString(16)}}` : `\\u${c.toString(16).padStart(4, '0')}`;
  }
  return `"${out}"`;
}

/** `.nvmrc` normalisation (DD-4): trim (removes spaces, CR, LF and a BOM), then remove AT MOST ONE leading "v". */
function normaliseNvmrc(raw: string): string {
  const t = raw.trim();
  return t.startsWith('v') ? t.slice(1) : t;
}

/** Why `value` is not an acceptable exact pin, or null when it is acceptable. */
function exactProblem(value: unknown): string | null {
  if (value === undefined) return 'is missing';
  if (typeof value !== 'string') return `is not a string (got ${typeof value})`;
  if (!EXACT.test(value)) {
    return `is ${show(value)}, not an exact MAJOR.MINOR.PATCH string (no range operator, tag, prerelease or wildcard allowed)`;
  }
  return null;
}

/** FR-4 (a): the `.nvmrc` file exists. */
function nvmrcPresent(i: PinInputs): Verdict {
  if (i.nvmrc === null) {
    return fail('C1', '.nvmrc', `.nvmrc is ${i.nvmrcProblem ?? 'missing'} under ${i.root}: the pinned Node must be named by a .nvmrc file at the repository root`);
  }
  return PASS;
}

/** FR-4 (b): the `.nvmrc` content is an exact MAJOR.MINOR.PATCH after DD-4 normalisation. */
function nvmrcExact(i: PinInputs): Verdict {
  const present = nvmrcPresent(i);
  if (!present.ok) return present;
  const raw = i.nvmrc as string;
  if (raw.trim() === '') return fail('C1', '.nvmrc', `.nvmrc is empty (content ${show(raw)}) under ${i.root}`);
  const n = normaliseNvmrc(raw);
  if (!EXACT.test(n)) {
    return fail(
      'C1',
      '.nvmrc',
      `.nvmrc content ${show(raw)} is not an exact MAJOR.MINOR.PATCH (after trimming whitespace and line endings and one optional leading "v"; no alias, range, partial version or prerelease)`,
    );
  }
  return PASS;
}

/** FR-4 (c): package.json has `engines.node`. */
function enginesPresent(i: PinInputs): Verdict {
  if (i.pkgProblem) {
    return fail('C2', 'package.json', `package.json is ${i.pkgProblem} under ${i.root}, so engines.node cannot be read`);
  }
  const e = i.engines;
  if (e === undefined || e === null) return fail('C2', 'engines', 'package.json "engines" is missing (it must hold { "node": "<exact version>" })');
  if (typeof e !== 'object' || Array.isArray(e)) return fail('C2', 'engines', `package.json "engines" is not an object (got ${Array.isArray(e) ? 'array' : typeof e})`);
  if ((e as Record<string, unknown>)['node'] === undefined) return fail('C2', 'engines.node', 'package.json engines.node is missing');
  return PASS;
}

/** FR-4 (d): `engines.node` is an exact MAJOR.MINOR.PATCH string (no normalisation: no "v", no whitespace). */
function enginesExact(i: PinInputs): Verdict {
  const present = enginesPresent(i);
  if (!present.ok) return present;
  const node = (i.engines as Record<string, unknown>)['node'];
  const problem = exactProblem(node);
  if (problem !== null) return fail('C2', 'engines.node', `package.json engines.node ${problem}`);
  return PASS;
}

/** FR-4 (e): the `.nvmrc` version equals `engines.node`. A missing/non-exact precondition is reported as itself, in the order
 *  `.nvmrc`, `engines.node`, never as a version difference. */
function nvmrcEqualsEngines(i: PinInputs): Verdict {
  const a = nvmrcExact(i);
  if (!a.ok) return a;
  const b = enginesExact(i);
  if (!b.ok) return b;
  const n = normaliseNvmrc(i.nvmrc as string);
  const e = (i.engines as Record<string, string>)['node'];
  if (n === e) return PASS;
  return fail('C5', '.nvmrc / engines.node', `.nvmrc names ${n} but engines.node names ${e}: the two files must name the same exact version`);
}

/** FR-6: the Running Node is the Node that `.nvmrc` names. */
function runningNodeIsPinned(i: PinInputs): Verdict {
  const a = nvmrcExact(i);
  if (isFail(a)) {
    return { ...a, message: `${a.message}. The Running Node ${i.running} cannot be checked against a pin that is not named; this is a missing or unusable pin, not a version difference` };
  }
  const pinned = normaliseNvmrc(i.nvmrc as string);
  const running = i.running.replace(/^v/, '');
  if (running === pinned) return PASS;
  const engines = i.engines as Record<string, unknown> | undefined | null;
  const engStr = engines && typeof engines === 'object' && typeof engines['node'] === 'string' ? show(engines['node'] as string) : 'unavailable';
  return fail(
    'C3',
    'process.version',
    `Running Node ${i.running} is not the pinned Node ${pinned}. The pin is named by .nvmrc (${pinned}) and by engines.node (${engStr}). Run the tests on Node ${pinned}.`,
  );
}

/** FR-7: the undici bundled in the Running Node equals the Pin. Depends on the Pin and the bundled undici ONLY; `.nvmrc` shapes
 *  the message, never the verdict. */
function bundledUndiciEqualsPin(i: PinInputs): Verdict {
  const pinnedNode = nvmrcExact(i).ok ? normaliseNvmrc(i.nvmrc as string) : '(.nvmrc unavailable)';
  const context = `(Running Node ${i.running}, pinned Node ${pinnedNode}, bundled undici ${i.bundled === undefined ? 'unavailable' : show(i.bundled)})`;
  if (i.pkgProblem) {
    return fail('C4', 'overrides.cheerio.undici', `package.json is ${i.pkgProblem} under ${i.root}, so overrides.cheerio.undici cannot be read ${context}`);
  }
  const problem = exactProblem(i.pin);
  if (problem !== null) return fail('C4', 'overrides.cheerio.undici', `package.json overrides.cheerio.undici ${problem} ${context}`);
  if (i.bundled === undefined || !EXACT.test(i.bundled)) {
    return fail('C4', 'process.versions.undici', `process.versions.undici is not an exact version on this runtime ${context}`);
  }
  if (i.bundled === i.pin) return PASS;
  return fail(
    'C4',
    'overrides.cheerio.undici',
    `package.json overrides.cheerio.undici is ${show(i.pin as string)} but the undici bundled in the Running Node ${i.running} (process.versions.undici) is ${show(i.bundled)}; the pinned Node is ${pinnedNode}. The Pin must equal the bundled undici of the pinned Node.`,
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// The tree under test: a lazy, non-throwing reader behind an injected io (DD-2)
// ---------------------------------------------------------------------------------------------------------------------

interface Io {
  exists(rel: string): boolean;
  read(rel: string): string;
}

type TextRead = { state: 'ok'; text: string } | { state: 'missing' } | { state: 'unreadable'; reason: string };
type JsonRead = { state: 'ok'; text: string; value: any } | { state: 'missing' } | { state: 'unreadable'; reason: string };
interface Tree {
  nvmrc: TextRead;
  pkg: JsonRead;
  lock: JsonRead;
}

function readText(io: Io, rel: string): TextRead {
  try {
    if (!io.exists(rel)) return { state: 'missing' };
    return { state: 'ok', text: io.read(rel) };
  } catch (e) {
    return { state: 'unreadable', reason: `${rel}: ${e instanceof Error ? e.message : String(e)}` };
  }
}

function readJsonFile(io: Io, rel: string): JsonRead {
  const t = readText(io, rel);
  if (t.state !== 'ok') return t;
  try {
    return { state: 'ok', text: t.text, value: JSON.parse(t.text) };
  } catch (e) {
    return { state: 'unreadable', reason: `${rel}: invalid JSON (${e instanceof Error ? e.message : String(e)})` };
  }
}

function readTree(io: Io): Tree {
  return { nvmrc: readText(io, '.nvmrc'), pkg: readJsonFile(io, 'package.json'), lock: readJsonFile(io, 'package-lock.json') };
}

function realIo(rootDir: string): Io {
  return { exists: (rel) => existsSync(join(rootDir, rel)), read: (rel) => readFileSync(join(rootDir, rel), 'utf8') };
}

function problemOf(r: { state: string; reason?: string }): string | null {
  if (r.state === 'ok') return null;
  return r.state === 'missing' ? 'missing' : `unreadable (${r.reason})`;
}

/** Turn a read tree plus the runtime strings into the pure functions' inputs. */
function inputsFrom(tree: Tree, running: string, bundled: string | undefined, rootLabel: string): PinInputs {
  const pkgValue = tree.pkg.state === 'ok' ? tree.pkg.value : undefined;
  return {
    root: rootLabel,
    nvmrc: tree.nvmrc.state === 'ok' ? tree.nvmrc.text : null,
    nvmrcProblem: problemOf(tree.nvmrc),
    pkgProblem: problemOf(tree.pkg),
    engines: pkgValue?.engines,
    running,
    bundled,
    pin: pkgValue?.overrides?.cheerio?.undici,
  };
}

/** The REAL inputs: the real tree under `root` and the real runtime, read at call time inside the case. */
function realInputs(): PinInputs {
  return inputsFrom(readTree(realIo(root)), process.version, process.versions['undici'], root);
}

function expectOk(v: Verdict): void {
  expect(v.ok, isFail(v) ? v.message : '').toBe(true);
}

/** A failing verdict must carry the expected single cause, name the expected field and print exactly one tag, at its start. */
function expectCause(v: Verdict, cause: Cause, field: string): string {
  expect(v.ok, `expected a [${cause}] failure on ${field}, got a pass`).toBe(false);
  if (!isFail(v)) return '';
  expect(v.cause).toBe(cause);
  expect(v.field).toBe(field);
  expect(v.message.match(/\[C\d\]/g) ?? [], `message must carry exactly one cause tag: ${v.message}`).toEqual([`[${cause}]`]);
  expect(v.message.startsWith(`[${cause}] `), `message must start with its tag: ${v.message}`).toBe(true);
  return v.message;
}

/** A fully valid input set (version literals here are synthetic inputs, not the pin). */
function good(over: Partial<PinInputs> = {}): PinInputs {
  return { root: '<synthetic>', nvmrc: '24.22.2\n', engines: { node: '24.22.2' }, running: 'v24.22.2', bundled: '7.30.1', pin: '7.30.1', ...over };
}

// ---------------------------------------------------------------------------------------------------------------------
// REAL cases: the seven that decide the red/green state of the tree (FR-4 (a)-(e), FR-6, FR-7)
// ---------------------------------------------------------------------------------------------------------------------

describe('US-10.2 real tree: .nvmrc, engines.node, the Running Node and the bundled undici agree', () => {
  it('FR-4 (a): .nvmrc is present at the repository root', () => {
    expectOk(nvmrcPresent(realInputs()));
  });

  it('FR-4 (b): .nvmrc holds an exact MAJOR.MINOR.PATCH (after trimming and one optional leading v)', () => {
    expectOk(nvmrcExact(realInputs()));
  });

  it('FR-4 (c): package.json engines.node is present', () => {
    expectOk(enginesPresent(realInputs()));
  });

  it('FR-4 (d): engines.node is an exact MAJOR.MINOR.PATCH string', () => {
    expectOk(enginesExact(realInputs()));
  });

  it('FR-4 (e): the .nvmrc version equals engines.node', () => {
    expectOk(nvmrcEqualsEngines(realInputs()));
  });

  it('FR-6: the Running Node (process.version) is the pinned Node named by .nvmrc', () => {
    expectOk(runningNodeIsPinned(realInputs()));
  });

  it('FR-7: the undici bundled in the Running Node (process.versions.undici) equals overrides.cheerio.undici', () => {
    expectOk(bundledUndiciEqualsPin(realInputs()));
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// SYNTHETIC non-vacuity: each failing input is paired with a passing one, for each cause, on ANY Node (FR-5)
// ---------------------------------------------------------------------------------------------------------------------

describe('US-10.2 synthetic S1: .nvmrc normalisation', () => {
  it('S1: CRLF, a trailing newline, one leading v, surrounding spaces and a BOM are accepted and normalise to the bare version', () => {
    for (const ok of ['24.22.2', '24.22.2\n', '24.22.2\r\n', 'v24.22.2\n', ' 24.22.2 ', '﻿24.22.2', '\t24.22.2\t\r\n']) {
      expect(nvmrcExact(good({ nvmrc: ok })), JSON.stringify(ok)).toEqual({ ok: true });
      expect(normaliseNvmrc(ok), JSON.stringify(ok)).toBe('24.22.2');
    }
  });

  it('S1: a doubled v, an alias, a range, a partial version, a prerelease, a fourth part, two lines, an empty file and whitespace-only are all C1 on .nvmrc', () => {
    for (const bad of ['vv24.22.2', 'V24.22.2', '24', '24.22', 'lts/*', 'node', '^24.22.2', '>=24.22.2', '24.22.2-rc.1', '24.22.2.1', '24.22.2\n25.0.0', '', '   \n']) {
      expectCause(nvmrcExact(good({ nvmrc: bad })), 'C1', '.nvmrc');
    }
  });

  it('S1: offending content is quoted with invisible characters and "[" escaped, so the message shows them and carries one tag', () => {
    const msg = expectCause(nvmrcExact(good({ nvmrc: '﻿24' })), 'C1', '.nvmrc');
    expect(msg).toContain('\\ufeff24');
    expect(msg).not.toContain('﻿');
    const bracket = expectCause(nvmrcExact(good({ nvmrc: '[C3]' })), 'C1', '.nvmrc');
    expect(bracket).toContain('\\u005bC3]');
  });
});

describe('US-10.2 synthetic S2: .nvmrc cases (a) and (b)', () => {
  it('S2 (a): a missing .nvmrc is C1 naming the file and saying it is missing; a present one passes', () => {
    const msg = expectCause(nvmrcPresent(good({ nvmrc: null })), 'C1', '.nvmrc');
    expect(msg).toMatch(/\.nvmrc is missing under <synthetic>/);
    expect(nvmrcPresent(good({ nvmrc: '24.22.2' }))).toEqual({ ok: true });
    // present is not the same as exact: the presence check passes for content that the exactness check rejects
    expect(nvmrcPresent(good({ nvmrc: 'lts/*' }))).toEqual({ ok: true });
    expect(nvmrcPresent(good({ nvmrc: '' }))).toEqual({ ok: true });
  });

  it('S2 (a): an unreadable .nvmrc is reported with its reason and the same single cause', () => {
    const msg = expectCause(nvmrcPresent(good({ nvmrc: null, nvmrcProblem: 'unreadable (.nvmrc: EISDIR)' })), 'C1', '.nvmrc');
    expect(msg).toContain('unreadable (.nvmrc: EISDIR)');
  });

  it('S2 (b): missing, empty, 24, lts/*, node, 24.22, ^24.22.2 and 24.22.2-rc.1 are each C1 with distinct wording; 24.22.2 passes', () => {
    expect(expectCause(nvmrcExact(good({ nvmrc: null })), 'C1', '.nvmrc')).toMatch(/is missing/);
    expect(expectCause(nvmrcExact(good({ nvmrc: '' })), 'C1', '.nvmrc')).toMatch(/is empty/);
    for (const bad of ['24', 'lts/*', 'node', '24.22', '^24.22.2', '24.22.2-rc.1']) {
      const msg = expectCause(nvmrcExact(good({ nvmrc: bad })), 'C1', '.nvmrc');
      expect(msg, bad).toContain(show(bad));
      expect(msg, bad).toMatch(/not an exact MAJOR\.MINOR\.PATCH/);
    }
    expect(nvmrcExact(good({ nvmrc: '24.22.2' }))).toEqual({ ok: true });
  });
});

describe('US-10.2 synthetic S3: engines.node cases (c) and (d)', () => {
  it('S3 (c): engines missing and engines.node missing are two different C2 messages naming engines and engines.node; a present one passes', () => {
    expect(expectCause(enginesPresent(good({ engines: undefined })), 'C2', 'engines')).toMatch(/"engines" is missing/);
    expect(expectCause(enginesPresent(good({ engines: {} })), 'C2', 'engines.node')).toMatch(/engines\.node is missing/);
    expectCause(enginesPresent(good({ engines: '24.22.2' })), 'C2', 'engines');
    expect(enginesPresent(good({ engines: { node: '24.22.2' } }))).toEqual({ ok: true });
    // present is not the same as exact
    expect(enginesPresent(good({ engines: { node: '>=24' } }))).toEqual({ ok: true });
  });

  it('S3 (c): an unreadable or missing package.json is C2 naming package.json', () => {
    const msg = expectCause(enginesPresent(good({ pkgProblem: 'unreadable (package.json: invalid JSON)' })), 'C2', 'package.json');
    expect(msg).toContain('package.json is unreadable');
    expectCause(enginesPresent(good({ pkgProblem: 'missing' })), 'C2', 'package.json');
  });

  it('S3 (d): a range, a v prefix, a number, null, whitespace, a partial version and a tag are each C2 on engines.node; 24.22.2 passes', () => {
    for (const bad of ['>=24.22.2 <25', 'v24.22.2', ' 24.22.2', '24.22.2 ', '24.22', '^24.22.2', '24.22.2-rc.1', 24, null]) {
      const v = enginesExact(good({ engines: { node: bad } }));
      // null is "present but not a string"; everything else is a string/number that is not exact
      expectCause(v, 'C2', 'engines.node');
    }
    expect(expectCause(enginesExact(good({ engines: { node: 24 } })), 'C2', 'engines.node')).toMatch(/not a string \(got number\)/);
    expect(enginesExact(good({ engines: { node: '24.22.2' } }))).toEqual({ ok: true });
  });
});

describe('US-10.2 synthetic S4: case (e), the two files must agree', () => {
  it('S4: .nvmrc 24.22.2 against engines.node 24.22.1 is C5 naming both versions; the same version (CRLF and v tolerated in .nvmrc) passes', () => {
    const msg = expectCause(nvmrcEqualsEngines(good({ nvmrc: '24.22.2', engines: { node: '24.22.1' } })), 'C5', '.nvmrc / engines.node');
    expect(msg).toContain('24.22.2');
    expect(msg).toContain('24.22.1');
    expect(nvmrcEqualsEngines(good({ nvmrc: 'v24.22.2\r\n', engines: { node: '24.22.2' } }))).toEqual({ ok: true });
  });

  it('S4: the first missing precondition is named, in the order .nvmrc then engines.node, and never as a version difference', () => {
    const both = expectCause(nvmrcEqualsEngines(good({ nvmrc: null, engines: undefined })), 'C1', '.nvmrc');
    expect(both).not.toContain('engines');
    expectCause(nvmrcEqualsEngines(good({ nvmrc: '24.22.2', engines: undefined })), 'C2', 'engines');
    expectCause(nvmrcEqualsEngines(good({ nvmrc: '24.22.2', engines: { node: '>=24' } })), 'C2', 'engines.node');
    expectCause(nvmrcEqualsEngines(good({ nvmrc: 'lts/*', engines: { node: '24.22.2' } })), 'C1', '.nvmrc');
  });
});

describe('US-10.2 synthetic S5: the Running Node must be the pinned Node', () => {
  it('S5: running 24.15.0 against .nvmrc 24.22.2 is C3 naming the pinned Node, the running Node and both files', () => {
    for (const running of ['v24.15.0', '24.15.0']) {
      const msg = expectCause(runningNodeIsPinned(good({ running, nvmrc: '24.22.2' })), 'C3', 'process.version');
      expect(msg).toContain('24.22.2');
      expect(msg).toContain(running);
      expect(msg).toContain('.nvmrc');
      expect(msg).toContain('engines.node');
    }
  });

  it('S5: the same version passes whatever the line ending or v prefix of .nvmrc and whether process.version carries its v', () => {
    expect(runningNodeIsPinned(good({ running: 'v24.22.2', nvmrc: '24.22.2' }))).toEqual({ ok: true });
    expect(runningNodeIsPinned(good({ running: 'v24.22.2', nvmrc: 'v24.22.2\r\n' }))).toEqual({ ok: true });
    expect(runningNodeIsPinned(good({ running: '24.22.2', nvmrc: ' 24.22.2\n' }))).toEqual({ ok: true });
  });

  it('S5: a different patch, minor or major is still C3 (the whole version is compared, not a prefix)', () => {
    for (const running of ['v24.22.1', 'v24.22.20', 'v24.23.2', 'v25.22.2', 'v22.22.2', 'v24.22.2-rc.1', 'v24.22.2.1']) {
      expectCause(runningNodeIsPinned(good({ running })), 'C3', 'process.version');
    }
  });

  it('S5: when .nvmrc is missing, empty or not exact the cause is C1 on .nvmrc and the message does not call it a mismatch', () => {
    for (const nvmrc of [null, '', '24', 'lts/*']) {
      const msg = expectCause(runningNodeIsPinned(good({ nvmrc, running: 'v24.15.0' })), 'C1', '.nvmrc');
      expect(msg.toLowerCase()).not.toContain('mismatch');
      expect(msg).not.toContain('is not the pinned Node');
    }
  });
});

describe('US-10.2 synthetic S6 and S7: the bundled undici must equal the Pin, whatever its value', () => {
  it('S6: bundled 7.24.4 against Pin 7.30.1 and Pin 7.24.4 against bundled 7.30.1 are each C4 naming the Running Node, the pinned Node, the Pin and the bundled undici', () => {
    const a = expectCause(bundledUndiciEqualsPin(good({ bundled: '7.24.4', pin: '7.30.1', running: 'v24.15.0' })), 'C4', 'overrides.cheerio.undici');
    for (const part of ['7.24.4', '7.30.1', 'v24.15.0', '24.22.2']) expect(a, part).toContain(part);
    // the AC-5 case: a Pin that differs from the bundled undici is rejected, whatever its value
    const b = expectCause(bundledUndiciEqualsPin(good({ bundled: '7.30.1', pin: '7.24.4', running: 'v24.22.2' })), 'C4', 'overrides.cheerio.undici');
    for (const part of ['7.24.4', '7.30.1', 'v24.22.2']) expect(b, part).toContain(part);
    expectCause(bundledUndiciEqualsPin(good({ bundled: '7.30.1', pin: '7.30.0' })), 'C4', 'overrides.cheerio.undici');
    expectCause(bundledUndiciEqualsPin(good({ bundled: '7.30.1', pin: '8.0.0' })), 'C4', 'overrides.cheerio.undici');
  });

  it('S6: a Pin equal to the bundled undici passes for any value (no window: 7.30.1 and 7.24.4 and 9.9.9 alike)', () => {
    for (const v of ['7.30.1', '7.24.4', '7.28.0', '9.9.9']) {
      expect(bundledUndiciEqualsPin(good({ bundled: v, pin: v })), v).toEqual({ ok: true });
    }
  });

  it('S6: a missing, ranged, non-string or tagged Pin is C4 naming overrides.cheerio.undici, even when it "equals" the bundled undici textually', () => {
    for (const pin of [undefined, '^7.30.1', '~7.30.1', '7.30', '7.30.x', 'latest', '7.30.1-beta.1', ' 7.30.1', 7.3, { undici: '7.30.1' }]) {
      expectCause(bundledUndiciEqualsPin(good({ bundled: '7.30.1', pin })), 'C4', 'overrides.cheerio.undici');
    }
    expect(expectCause(bundledUndiciEqualsPin(good({ pin: undefined })), 'C4', 'overrides.cheerio.undici')).toMatch(/is missing/);
  });

  it('S6: a runtime without an undici string is C4 naming process.versions.undici; an unreadable package.json is C4 naming the Pin', () => {
    expectCause(bundledUndiciEqualsPin(good({ bundled: undefined })), 'C4', 'process.versions.undici');
    expectCause(bundledUndiciEqualsPin(good({ bundled: 'abc' })), 'C4', 'process.versions.undici');
    const msg = expectCause(bundledUndiciEqualsPin(good({ pkgProblem: 'missing' })), 'C4', 'overrides.cheerio.undici');
    expect(msg).toContain('package.json is missing');
  });

  it('S7: .nvmrc shapes the message but never the verdict (a missing or non-exact .nvmrc with Pin equal to bundled passes; a differing Pin fails and says .nvmrc unavailable)', () => {
    for (const nvmrc of [null, '', 'lts/*', '24']) {
      expect(bundledUndiciEqualsPin(good({ nvmrc, bundled: '7.30.1', pin: '7.30.1' })), String(nvmrc)).toEqual({ ok: true });
    }
    const msg = expectCause(bundledUndiciEqualsPin(good({ nvmrc: null, bundled: '7.30.1', pin: '7.24.4' })), 'C4', 'overrides.cheerio.undici');
    expect(msg).toContain('.nvmrc unavailable');
  });

  it('S6 and S7: the running Node only appears in the message, never decides the C4 verdict', () => {
    for (const running of ['v24.15.0', 'v24.22.2', 'v25.0.0']) {
      expect(bundledUndiciEqualsPin(good({ running, bundled: '7.30.1', pin: '7.30.1' })), running).toEqual({ ok: true });
    }
  });
});

describe('US-10.2 synthetic reader (DD-2): a missing, unreadable or invalid file is a result, never an exception', () => {
  const fake = (files: Record<string, string | Error>): Io => ({
    exists: (rel) => rel in files,
    read: (rel) => {
      const v = files[rel];
      if (v instanceof Error) throw v;
      return v as string;
    },
  });

  it('reader: a tree with no files at all yields three "missing" results and does not throw', () => {
    const tree = readTree(fake({}));
    expect(tree.nvmrc).toEqual({ state: 'missing' });
    expect(tree.pkg).toEqual({ state: 'missing' });
    expect(tree.lock).toEqual({ state: 'missing' });
  });

  it('reader: invalid JSON in package.json is "unreadable" naming the file; a read error is "unreadable" naming the file and the error', () => {
    const bad = readTree(fake({ 'package.json': '{ not json' }));
    expect(bad.pkg.state).toBe('unreadable');
    expect(bad.pkg.state === 'unreadable' && bad.pkg.reason).toMatch(/^package\.json: invalid JSON/);
    const denied = readTree(fake({ '.nvmrc': new Error('EACCES: permission denied') }));
    expect(denied.nvmrc.state).toBe('unreadable');
    expect(denied.nvmrc.state === 'unreadable' && denied.nvmrc.reason).toMatch(/^\.nvmrc: EACCES/);
    const exists = readTree({ exists: () => { throw new Error('EIO'); }, read: () => '' });
    expect(exists.lock.state).toBe('unreadable');
  });

  it('reader: a well-formed tree is read with its parsed values', () => {
    const tree = readTree(fake({ '.nvmrc': '24.22.2\n', 'package.json': '{"engines":{"node":"24.22.2"},"overrides":{"cheerio":{"undici":"7.30.1"}}}', 'package-lock.json': '{"packages":{}}' }));
    expect(tree.nvmrc).toEqual({ state: 'ok', text: '24.22.2\n' });
    const inputs = inputsFrom(tree, 'v24.22.2', '7.30.1', '<fake>');
    expect(inputs.pin).toBe('7.30.1');
    expect(inputs.engines).toEqual({ node: '24.22.2' });
    for (const v of [nvmrcPresent, nvmrcExact, enginesPresent, enginesExact, nvmrcEqualsEngines, runningNodeIsPinned, bundledUndiciEqualsPin]) {
      expect(v(inputs), v.name).toEqual({ ok: true });
    }
  });

  it('reader: an EMPTY tree turns into the seven attributable reds C1, C1, C2, C2, C1, C1, C4, each with exactly one tag and its own file', () => {
    const inputs = inputsFrom(readTree(fake({})), 'v24.22.2', '7.30.1', '<empty>');
    expectCause(nvmrcPresent(inputs), 'C1', '.nvmrc');
    expectCause(nvmrcExact(inputs), 'C1', '.nvmrc');
    expectCause(enginesPresent(inputs), 'C2', 'package.json');
    expectCause(enginesExact(inputs), 'C2', 'package.json');
    expectCause(nvmrcEqualsEngines(inputs), 'C1', '.nvmrc');
    expectCause(runningNodeIsPinned(inputs), 'C1', '.nvmrc');
    expectCause(bundledUndiciEqualsPin(inputs), 'C4', 'overrides.cheerio.undici');
  });

  it('reader: the unchanged-tree shape (no .nvmrc, no engines, Pin differing from the bundled undici) gives C1, C1, C2, C2, C1, C1, C4 on any Node', () => {
    const tree = readTree(fake({ 'package.json': '{"overrides":{"cheerio":{"undici":"7.24.4"}}}' }));
    for (const [running, bundled] of [['v24.15.0', '7.24.4'], ['v24.22.2', '7.30.1']] as const) {
      const inputs = inputsFrom(tree, running, bundled, '<unchanged>');
      expectCause(nvmrcPresent(inputs), 'C1', '.nvmrc');
      expectCause(nvmrcExact(inputs), 'C1', '.nvmrc');
      expectCause(enginesPresent(inputs), 'C2', 'engines');
      expectCause(enginesExact(inputs), 'C2', 'engines');
      expectCause(nvmrcEqualsEngines(inputs), 'C1', '.nvmrc');
      expectCause(runningNodeIsPinned(inputs), 'C1', '.nvmrc');
      // FR-14: FR-7 depends on the Running Node: red when the bundled undici is not 7.24.4, green when it is
      if (bundled === '7.24.4') expect(bundledUndiciEqualsPin(inputs)).toEqual({ ok: true });
      else expectCause(bundledUndiciEqualsPin(inputs), 'C4', 'overrides.cheerio.undici');
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// SURVIVORS (FR-9): the former cases 1, 3, 4, 5, 6 and their non-vacuity proofs, aimed at the new Pin and made lazy
// ---------------------------------------------------------------------------------------------------------------------

/** The Pin as written in package.json, read lazily; `problem` says why it is unavailable (package.json missing/unreadable). */
function loadPin(): { tree: Tree; pin: unknown; pinText: string | undefined; problem: string | null } {
  const tree = readTree(realIo(root));
  const pin: unknown = tree.pkg.state === 'ok' ? tree.pkg.value?.overrides?.cheerio?.undici : undefined;
  const problem = problemOf(tree.pkg);
  return { tree, pin, pinText: typeof pin === 'string' ? pin : undefined, problem: problem === null ? null : `package.json is ${problem} under ${root}` };
}

const NESTED_LOCK_KEY = 'node_modules/cheerio/node_modules/undici';

describe('T48 case 1: package.json pins undici for cheerio as an exact version', () => {
  it('case 1: overrides.cheerio.undici exists and is an exact MAJOR.MINOR.PATCH string (no range operator, no tag)', () => {
    const { tree, pin, problem } = loadPin();
    expect(problem, problem ?? '').toBeNull();
    const overrides = tree.pkg.state === 'ok' ? JSON.stringify(tree.pkg.value?.overrides) : 'n/a';
    expect(exactProblem(pin), `package.json overrides.cheerio.undici ${exactProblem(pin)} (overrides is ${overrides})`).toBeNull();
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

describe('T48 case 3: package-lock.json gives cheerio its own undici at exactly the pin', () => {
  it(`case 3: ${NESTED_LOCK_KEY} exists, its version equals the pin, and it carries resolved and integrity`, () => {
    const { tree, pinText, problem } = loadPin();
    expect(problem, problem ?? '').toBeNull();
    expect(pinText, 'there is no pin in package.json (overrides.cheerio.undici), so the lockfile has nothing to match').toBeDefined();
    expect(tree.lock.state, `package-lock.json is ${problemOf(tree.lock)} under ${root}`).toBe('ok');
    const entry = tree.lock.state === 'ok' ? tree.lock.value?.packages?.[NESTED_LOCK_KEY] : undefined;
    expect(entry, `package-lock.json has no "${NESTED_LOCK_KEY}" entry (cheerio still shares the hoisted undici)`).toBeDefined();
    expect(entry.version, 'locked version must equal the pin').toBe(pinText);
    expect(entry.resolved, 'resolved must be the registry tarball of the pinned version').toMatch(
      new RegExp(`/undici/-/undici-${(pinText as string).replace(/\./g, '\\.')}\\.tgz$`),
    );
    expect(entry.integrity, 'integrity must be an SRI hash').toMatch(/^sha(?:256|384|512)-[A-Za-z0-9+/]+=*$/);
  });
});

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
    const { pinText, problem } = loadPin();
    expect(problem, problem ?? '').toBeNull();
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

describe('T48 case 5: the scoped override is the ONLY place package.json names undici', () => {
  it('case 5: undici is in no dependency field, and the only override path naming it is cheerio > undici', () => {
    const { tree, problem } = loadPin();
    expect(problem, problem ?? '').toBeNull();
    const pkg = tree.pkg.state === 'ok' ? tree.pkg.value : {};
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      expect(Object.keys(pkg?.[field] ?? {}), `package.json ${field} must not list undici`).not.toContain('undici');
    }
    // the real dependency field is read (an empty or absent one would make the loop above vacuous)
    expect(Object.keys(pkg?.dependencies ?? {}), 'package.json dependencies must list cheerio').toContain('cheerio');
    const paths = undiciOverridePaths(pkg?.overrides);
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
    expect(Object.keys({ dependencies: { cheerio: '^1.2.0' } }.dependencies)).not.toContain('undici');
  });
});

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

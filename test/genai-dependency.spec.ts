/**
 * US-11.1 (T1) - FR-24 / AC-13: `@google/genai` is required as `^2.32.0` (at least 2.32.0, below 3.0.0),
 * the lock file resolves it to a 2.x version that is >= 2.32.0, and no 3.x version is installed.
 *
 * Written from the Specification, not from the evidence file's "3-line lock delta". The check reads three
 * facts the repository itself holds: package.json, package-lock.json and the installed package's own
 * package.json. It makes no network call (OD-5: the live smoke is waived, mocked unit tests only).
 *
 * Why this exists although every SDK-using spec runs on fakes: those fakes stay green on any SDK version,
 * so the range is the only thing that proves the upgrade was actually made, and the `^2` cap is
 * load-bearing (3.x is published and changes the default API version).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readJson = (relative: string) => JSON.parse(readFileSync(resolve(process.cwd(), relative), 'utf8'));

/** Parses "2.32.0" (no range operators, no pre-release) into numbers; anything else fails the case. */
function parseVersion(version: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  expect(match, `"${version}" is not a plain x.y.z version`).not.toBeNull();
  return [Number(match![1]), Number(match![2]), Number(match![3])];
}

function isAtLeast(version: string, floor: [number, number, number]): boolean {
  const v = parseVersion(version);
  for (let i = 0; i < 3; i++) {
    if (v[i] !== floor[i]) return v[i] > floor[i];
  }
  return true;
}

describe('@google/genai dependency range (FR-24, AC-13)', () => {
  it('package.json requires @google/genai as ^2.32.0', () => {
    const pkg = readJson('package.json');
    expect(pkg.dependencies['@google/genai']).toBe('^2.32.0');
  });

  it('package.json does not also list the SDK as a dev or optional dependency with another range', () => {
    const pkg = readJson('package.json');
    expect(pkg.devDependencies?.['@google/genai']).toBeUndefined();
    expect(pkg.optionalDependencies?.['@google/genai']).toBeUndefined();
    expect(pkg.peerDependencies?.['@google/genai']).toBeUndefined();
  });
});

describe('@google/genai in package-lock.json (FR-24, AC-13)', () => {
  const lock = () => readJson('package-lock.json');

  it('the lock root records the same ^2.32.0 range', () => {
    expect(lock().packages[''].dependencies['@google/genai']).toBe('^2.32.0');
  });

  it('the lock resolves @google/genai to a 2.x version that is >= 2.32.0', () => {
    const version: string = lock().packages['node_modules/@google/genai'].version;
    expect(parseVersion(version)[0], `resolved ${version}`).toBe(2);
    expect(isAtLeast(version, [2, 32, 0]), `resolved ${version} is below 2.32.0`).toBe(true);
  });

  it('no 3.x (or 1.x) copy of @google/genai appears anywhere in the lock, nested copies included', () => {
    const entries = Object.entries(lock().packages as Record<string, { version?: string }>)
      .filter(([path]) => path === 'node_modules/@google/genai' || path.endsWith('/node_modules/@google/genai'));
    expect(entries.length, 'at least the top-level entry').toBeGreaterThan(0);
    for (const [path, entry] of entries) {
      expect(parseVersion(entry.version!)[0], `${path} resolves ${entry.version}`).toBe(2);
    }
  });
});

describe('@google/genai as installed (FR-24: no 3.x installed)', () => {
  it('node_modules holds a 2.x copy that is >= 2.32.0', () => {
    const installed: string = readJson('node_modules/@google/genai/package.json').version;
    expect(parseVersion(installed)[0], `installed ${installed}`).toBe(2);
    expect(isAtLeast(installed, [2, 32, 0]), `installed ${installed} is below 2.32.0`).toBe(true);
  });
});

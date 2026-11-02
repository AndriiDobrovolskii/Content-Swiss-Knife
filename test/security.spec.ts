// @vitest-environment node
/**
 * US-10.1 T47 - the Gemini key is not in the client bundle, checked in the test suite (FR-65, FR-5, NFR-3, AC-41; plan
 * DD-26, SD-5).
 *
 * The existing automated check is arch-guard.sh Rule 4, which greps `src/` SOURCE; this spec checks the BUILT bundle,
 * which is what a browser downloads. It runs `npm run build -- --output-path=.test-dist`, walks the output recursively
 * (a superset of `.test-dist/browser/`, so it holds under either layout, plan R9), and asserts:
 *   - at least one `.js` file exists (a scan that found nothing proves nothing);
 *   - the literal key name and anything shaped like a Google API key (`AIzaSy[0-9A-Za-z_-]{20,}`) are absent;
 *   - the scanner is not vacuous: it flags a synthetic string holding both;
 *   - a missing output directory FAILS, it never skips;
 *   - `.test-dist` is removed afterwards and is git-ignored (T35);
 *   - no studio dictionary text contains an environment-variable name (FR-5: T-11 must not leak `GEMINI_API_KEY`).
 *
 * The build output is discarded (`stdio: 'ignore'`) so no output buffer can overflow; a failing build still throws and
 * every bundle test then fails by name. The bundle tests carry the 120 000 ms timeout of SD-5 (the build runs once, lazily). The build can pass only once the
 * whole program compiles, which is why this file is owned by the LAST task (T47) while its `.gitignore` half is T35's.
 *
 * Deterministic: no network, no clock; the key shape is a regex over files on disk.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const OUT = '.test-dist';
const KEY_NAME = 'GEMINI_API_KEY';
const KEY_SHAPE = /AIzaSy[0-9A-Za-z_-]{20,}/;

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Everything in the scan that must not be in a shipped file. */
export function leaksIn(text: string): string[] {
  const found: string[] = [];
  if (text.includes(KEY_NAME)) found.push('key name');
  if (KEY_SHAPE.test(text)) found.push('key shape');
  return found;
}

describe('FR-65 / AC-41: the built client bundle carries no Gemini key', () => {
  /**
   * The build runs ONCE, lazily, from the first test that needs it: a build failure then fails every test of this block
   * BY NAME (a throwing `beforeAll` would show them as skipped). The tests carry the 120 000 ms timeout of SD-5.
   */
  let built: Promise<string[]> | null = null;
  const bundle = (): Promise<string[]> => (built ??= Promise.resolve().then(() => {
    rmSync(join(root, OUT), { recursive: true, force: true });
    // A build failure throws here: the test fails, it never skips.
    execSync(`npm run build -- --output-path=${OUT}`, { cwd: root, stdio: 'ignore', timeout: 115_000 });
    return walk(join(root, OUT));
  }));

  afterAll(() => {
    rmSync(join(root, OUT), { recursive: true, force: true });
  });

  it('FR-65: the build produced output (a missing output directory fails, it never skips)', async () => {
    await bundle();
    expect(existsSync(join(root, OUT))).toBe(true);
  }, 120_000);

  it('FR-65: the walk found at least one .js file', async () => {
    expect((await bundle()).filter((f) => f.endsWith('.js')).length).toBeGreaterThan(0);
  }, 120_000);

  it(`FR-65 / AC-41: no built file contains the literal ${KEY_NAME}`, async () => {
    const hits = (await bundle()).filter((f) => /\.(js|html|css|json|map|txt)$/.test(f))
      .filter((f) => readFileSync(f, 'utf8').includes(KEY_NAME));
    expect(hits).toEqual([]);
  }, 120_000);

  it('FR-65 / AC-41: no built file contains a string shaped like a Google API key (AIzaSy...)', async () => {
    const hits = (await bundle()).filter((f) => /\.(js|html|css|json|map|txt)$/.test(f))
      .filter((f) => KEY_SHAPE.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  }, 120_000);
});

describe('FR-65: the scanner is not vacuous', () => {
  it('flags a synthetic string holding the key name and a key-shaped value', () => {
    const synthetic = `const a = "${KEY_NAME}"; const b = "AIzaSy${'A1b2C3d4E5f6G7h8I9j0K1l2'}";`;
    expect(leaksIn(synthetic).sort()).toEqual(['key name', 'key shape']);
  });

  it('does not flag an ordinary bundle fragment', () => {
    expect(leaksIn('export const x = "Gemini API key is required for Image Studio";')).toEqual([]);
  });

  it('flags a key-shaped value on its own and a name on its own', () => {
    expect(leaksIn('AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3')).toEqual(['key shape']);
    expect(leaksIn(`process.env.${KEY_NAME}`)).toEqual(['key name']);
  });
});

describe('FR-65 / T35: the build output directory is git-ignored', () => {
  it('.gitignore contains the .test-dist/ entry', () => {
    const lines = readFileSync(join(root, '.gitignore'), 'utf8').split(/\r?\n/).map((l) => l.trim());
    expect(lines).toContain('.test-dist/');
  });
});

describe('FR-5 / NFR-3: no studio text names an environment variable', () => {
  const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);

  /** Names defined in .env.example plus the generic shape NAME_PART(_PART)+ . */
  const envNames = () => readFileSync(join(root, '.env.example'), 'utf8')
    .split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => l.split('=')[0]);
  const ENV_SHAPE = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/;

  it('FR-5: every STUDIO_TEXTS value (en and uk) contains neither a .env.example variable name nor an UPPER_SNAKE name', async () => {
    const m = await load('../src/utils/image-studio/studio-texts');
    const entries = Object.entries(m.STUDIO_TEXTS as Record<string, { en: string; uk: string }>);
    expect(entries.length, 'the dictionary is empty').toBeGreaterThan(30);
    const names = envNames();
    expect(names, 'premise: .env.example names read').toContain(KEY_NAME);
    const offenders: string[] = [];
    for (const [id, v] of entries) {
      for (const lang of ['en', 'uk'] as const) {
        const text = v[lang];
        if (names.some((n) => text.includes(n)) || ENV_SHAPE.test(text)) offenders.push(`${id}.${lang}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('FR-5 / T-11: the missing-key text is the confirmed literal in both languages and names no variable', async () => {
    const m = await load('../src/utils/image-studio/studio-texts');
    expect(m.studioText('T-11', 'en')).toBe('Gemini API key is required for Image Studio');
    expect(m.studioText('T-11', 'uk')).toBe('Для Image Studio потрібен ключ Gemini API');
  });
});

/**
 * operator-notes-source-scan.spec.ts - US-9.1 FR-44 SOURCE-SCAN PIN (task breakdown P10; plan W8 addition under OD-24).
 *
 * The operator-notes feature is withdrawn (Story v5, 2026-10-19) and must leave NO code path: no form, no label, no component,
 * no state class, no `ProductInput` key, no prompt emission, no script flag. Nothing else proves the form, the eight
 * `TRANSLATIONS` labels, the component or the `ProductInput.operatorNotes` key are gone (no spec instantiates `AppComponent`),
 * and a label left in only one of `TRANSLATIONS.en` / `.uk` compiles clean. This scan closes that gap as text.
 *
 * WHAT IS SCANNED: every NON-SPEC source file under `src/` (`.ts`, `.html`), under `tools/` and under `server/` (never
 * `node_modules`). `*.spec.ts` files and `test/` are excluded because the absence pins legitimately carry the literals.
 *
 * TOKEN SET (plan v6, widened; case-insensitive; one pattern per bullet). The earlier four-token set matched nothing in
 * `tools/measure-description.ts` and `src/utils/description-metrics.ts` and so could not fail for task T47:
 *   (1) `operator[ _-]?notes?`   - covers operatorNotes, OperatorNotes, operator-notes, "Operator Notes" and the lowercase prose
 *                                  "operator notes" (description-metrics.ts line 40, measure-description.ts line 14);
 *   (2) `--notes-(usage|test|previous|limitations)` - the four CLI flags (header comment, FLAGS, USAGE);
 *   (3) `notes(UsageScenarios|TestResults|PreviousGenerationComparison|Limitations)` - the camelCase keys of FLAGS / FILE_FLAGS.
 * Run against `6546db8` (non-spec src, tools, server) the set returns zero hits, so it cannot false-positive on the end state;
 * at HEAD it hits exactly the 12 files the removal edits or deletes. The behavioural pin for the flags is the spawn test in
 * `measure-description.cli.spec.ts` (FR-44 item 5); this scan is the TEXTUAL pin for their remnants.
 *
 * ONE BLOCK PER OWNER (task breakdown): each per-file describe is turned green by the task that edits that file; the whole-tree
 * scan is fully green only after T49. Every per-file block requires the file to EXIST (so a block cannot pass by finding
 * nothing in a missing file), except the deleted modules, which are pinned by `existsSync` false.
 *
 * RED until its owner task lands. Reads files only: no network, no clock.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();

const TOKENS: Array<[string, RegExp]> = [
  ['operator[ _-]?notes?', /operator[ _-]?notes?/i],
  ['--notes-(usage|test|previous|limitations)', /--notes-(?:usage|test|previous|limitations)/i],
  ['notes(UsageScenarios|TestResults|PreviousGenerationComparison|Limitations)', /notes(?:UsageScenarios|TestResults|PreviousGenerationComparison|Limitations)/i],
];

const rel = (abs: string): string => relative(ROOT, abs).split(sep).join('/');

function walk(dir: string, extensions: string[], out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) { walk(abs, extensions, out); continue; }
    if (/\.spec\.ts$/.test(entry)) continue;
    if (extensions.some(ext => entry.endsWith(ext))) out.push(abs);
  }
  return out;
}

const SRC_EXT = ['.ts', '.html'];
const OTHER_EXT = ['.ts', '.html', '.js', '.mjs', '.cjs', '.json'];
const SCANNED = [
  ...walk(join(ROOT, 'src'), SRC_EXT),
  ...walk(join(ROOT, 'tools'), OTHER_EXT),
  ...walk(join(ROOT, 'server'), OTHER_EXT),
];

/** Lines of one file that match any token, as `path:line: text (token)`; empty for a missing file. */
function hitsIn(path: string): string[] {
  const abs = join(ROOT, path);
  if (!existsSync(abs)) return [];
  const out: string[] = [];
  readFileSync(abs, 'utf8').split(/\r?\n/).forEach((line, i) => {
    for (const [label, re] of TOKENS) if (re.test(line)) out.push(`${path}:${i + 1}: ${line.trim().slice(0, 100)}  [${label}]`);
  });
  return out;
}

/** Per-file block: the file must exist AND hold no token. */
function describeFile(owner: string, path: string): void {
  describe(`${owner}: ${path} holds no operator-notes token`, () => {
    it('premise: the file exists (a block cannot pass by finding nothing in a missing file)', () => {
      expect(existsSync(join(ROOT, path)), `${path} is missing`).toBe(true);
    });
    it('has no match of the three-token set (case-insensitive)', () => {
      expect(hitsIn(path)).toEqual([]);
    });
  });
}

describe('source-scan premise: the scan really covers the tree', () => {
  it('reads at least the files whose removal it pins, and the server and tools trees', () => {
    const scanned = SCANNED.map(rel);
    for (const sentinel of [
      'src/app/types.ts', 'src/app/app.component.ts', 'src/app/app.component.html', 'src/prompts/task-a.ts',
      'src/prompt-core/master-system-prompt.ts', 'src/services/content-orchestrator.service.ts',
      'src/utils/description-metrics.ts', 'tools/measure-description.ts', 'server/index.js',
    ]) expect(scanned, `${sentinel} is not scanned`).toContain(sentinel);
    expect(scanned.length).toBeGreaterThan(100);
  });

  it('excludes spec files and the test/ tree (the absence pins carry the literals)', () => {
    const scanned = SCANNED.map(rel);
    expect(scanned.filter(p => p.endsWith('.spec.ts'))).toEqual([]);
    expect(scanned.filter(p => p.startsWith('test/'))).toEqual([]);
  });

  it('the token set is able to fail: each token matches its own canonical form (self-test)', () => {
    expect(TOKENS[0][1].test('operatorNotes')).toBe(true);
    expect(TOKENS[0][1].test('Operator Notes')).toBe(true);
    expect(TOKENS[0][1].test('operator notes')).toBe(true);
    expect(TOKENS[0][1].test('operator-notes')).toBe(true);
    expect(TOKENS[1][1].test('--notes-limitations')).toBe(true);
    expect(TOKENS[2][1].test('notesPreviousGenerationComparison')).toBe(true);
    expect(TOKENS.some(([, re]) => re.test('a note about the notes of the release'))).toBe(false);
  });
});

// ── One block per owner task ─────────────────────────────────────────────────────────────────────────────

describeFile('T43 (master, FROZEN)', 'src/prompt-core/master-system-prompt.ts');
describeFile('T44 (task-a.ts, FROZEN)', 'src/prompts/task-a.ts');
describeFile('T45 (orchestrator)', 'src/services/content-orchestrator.service.ts');
describeFile('T46 (form removal)', 'src/app/app.component.ts');
describeFile('T46 (form removal)', 'src/app/app.component.html');
describeFile('T47 (script)', 'tools/measure-description.ts');
describeFile('T47 (script, comment only)', 'src/utils/description-metrics.ts');
describeFile('T49 (types)', 'src/app/types.ts');

// The four non-spec files this removal deletes (plan Files list says "5 modules"; review N2: `git ls-files` shows exactly these four, so the
// pin lists the four paths and, separately, the folder that holds the two component files).
describe('T46 (form removal): the form state, the component files and their folder do not exist', () => {
  it.each([
    'src/app/operator-notes-form-state.ts',
    'src/app/components/operator-notes-fields/operator-notes-fields.component.ts',
    'src/app/components/operator-notes-fields/operator-notes-fields.component.html',
  ])('%s does not exist', path => {
    expect(existsSync(join(ROOT, path)), `${path} still exists`).toBe(false);
  });

  it('the folder src/app/components/operator-notes-fields does not exist', () => {
    expect(existsSync(join(ROOT, 'src', 'app', 'components', 'operator-notes-fields'))).toBe(false);
  });
});

describe('T48 (leaf module): src/prompts/operator-notes.ts does not exist and no non-spec file is named after operator notes', () => {
  it('src/prompts/operator-notes.ts does not exist', () => {
    expect(existsSync(join(ROOT, 'src/prompts/operator-notes.ts')), 'src/prompts/operator-notes.ts still exists').toBe(false);
  });

  it('no non-spec source file under src/, tools/ or server/ is named after operator notes', () => {
    expect(SCANNED.map(rel).filter(p => /operator[ _-]?notes?/i.test(p))).toEqual([]);
  });
});

describe('T49 (whole scan): no non-spec file under src/, tools/ or server/ matches any token', () => {
  it('has no hit anywhere (listed by file and line when it fails)', () => {
    const all = SCANNED.flatMap(abs => hitsIn(rel(abs)));
    expect(all).toEqual([]);
  });
});

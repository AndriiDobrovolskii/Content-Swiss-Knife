/**
 * measure-description.cli.spec.ts - US-9.1 T35 (FR-32, FR-33; AC-10): the contract of `tools/measure-description.ts`,
 * observed by SPAWNING it with `process.execPath` - the Node that runs vitest - the way an operator runs it.
 *
 * Asserted (Specification FR-32 / FR-33 and the plan's D12; the wording of the report lines is NOT specified, so
 * only what is specified is pinned):
 *  - the FIRST line of every report is `process.version` (impact Unknown 18: live-run evidence carries the Node
 *    version that produced it, on any machine; the repository pins no Node version);
 *  - exit code 0 on a clean document; non-zero on a hard violation (any deixis hit, any figure without a
 *    paragraph above it, any two figures in a row, any number absent from the input);
 *  - the soft liveliness items are reported and NEVER change the exit status;
 *  - unreadable or empty input makes the script FAIL VISIBLY (non-zero, with an explanation on stderr), not
 *    report zeros (FR-32 failure path);
 *  - no network: the script reads files and prints.
 *
 * NEGATIVE TESTS CANNOT PASS VACUOUSLY. While the script does not exist `node` itself exits non-zero, so a bare
 * "exit status is not 0" would be green on arrival and prove nothing. Every negative case therefore also
 * requires that the SCRIPT ran: the report header is printed (hard violations) or stderr is not a module-load
 * failure (unreadable input).
 *
 * H-OD10 ANSWERED (owner confirmed D-3, D-4, D-5, D-7 and D-9 as written): the exit status for "a number absent from the
 * input" (D-9) and the optional input flags are now pinned in the describes at the end of this file. The Specification
 * names the metrics and the input set (D-10: the description required; specs and product name optional).
 * US-9.1 operator-notes WITHDRAWAL (Story v5, Specification v7 FR-44 item 5; task breakdown P0 / P8): the four `--notes-*`
 * options are no longer accepted. The three tests that exercised them were removed with the feature, and the rejection
 * test at the end of this file (RED until T47 removes the flags from the script) replaces them.
 *
 * The Node check of OD-9 (Node >= 22.18 for native type stripping, else the D12 launcher, task T41) is a step of
 * the BUILDER's task T35: this spec runs the `.ts` entry directly, so it is red on a Node that cannot load it -
 * which is exactly the signal that triggers T41. T41's launcher variant of this spec returns to TEST_WRITING.
 *
 * RED until T35 creates `tools/measure-description.ts`. Temporary files live under the OS temp directory and are
 * removed afterwards.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CLI = join(process.cwd(), 'tools', 'measure-description.ts');
let dir: string;
beforeAll(() => { dir = mkdtempSync(join(tmpdir(), 'us91-measure-')); });
afterAll(() => { rmSync(dir, { recursive: true, force: true }); });

const PLAIN = 'Гравер працює з деревом і металом.';
const FIG = (n: number) => `<figure><img src="p${n}.jpg" alt="Задня панель"><figcaption>Задня панель</figcaption></figure>`;
const CLEAN_HTML = `<p>${PLAIN}</p>${FIG(0)}<p>Сенсорний екран запускає сканування.</p>${FIG(1)}`;
const INPUT_TEXT = 'Лазерний гравер для майстерні. Працює з деревом і металом.';
const LINE_BREAK = /\r?\n/;

function write(name: string, content: string): string {
  const path = join(dir, name);
  writeFileSync(path, content, 'utf8');
  return path;
}

function run(args: string[]) {
  const result = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', timeout: 60_000 });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '', error: result.error };
}

let counter = 0;
const measure = (html: string, input = INPUT_TEXT, extra: string[] = []) =>
  run(['--html', write(`generated-${counter++}.html`, html), '--input', write('input.txt', input), '--locale', 'uk-UA', ...extra]);

const firstLine = (stdout: string) => stdout.split(LINE_BREAK)[0];
const scriptStarted = (r: { stderr: string }) =>
  expect(r.stderr, 'the script itself did not run').not.toMatch(/ERR_MODULE_NOT_FOUND|Cannot find module|ERR_UNKNOWN_FILE_EXTENSION|ERR_UNSUPPORTED/);

describe('FR-32: the report starts with the Node version that produced it', () => {
  it('the first line of stdout is process.version, for a clean run', () => {
    expect(firstLine(measure(CLEAN_HTML).stdout)).toBe(process.version);
  });

  it('and for a run that fails on a hard violation', () => {
    const r = measure(`<p>Ряд із трьох круглих модулів ззаду показано на зображенні.</p>${FIG(0)}`);
    expect(firstLine(r.stdout)).toBe(process.version);
    expect(r.status).not.toBe(0);
  });
});

describe('FR-33: the exit status follows the hard criteria only', () => {
  it('exits 0 on a clean document', () => {
    const r = measure(CLEAN_HTML);
    expect(r.error).toBeUndefined();
    expect(r.status).toBe(0);
  });

  it.each([
    ['a deixis hit in the paragraph above a figure', `<p>Ряд із трьох круглих модулів ззаду показано на зображенні.</p>${FIG(0)}`],
    ['a deixis hit in a figcaption', `<p>${PLAIN}</p><figure><img src="a.jpg" alt="Панель"><figcaption>Колаж показує три модулі</figcaption></figure>`],
    ['a deixis hit in an alt', `<p>${PLAIN}</p><figure><img src="a.jpg" alt="Три кадри показують модулі"><figcaption>Панель</figcaption></figure>`],
    ['a figure without a paragraph above it', `<h3>Панель</h3>${FIG(0)}`],
    ['two figures in a row', `<p>${PLAIN}</p>${FIG(0)}${FIG(1)}`],
  ])('exits non-zero on %s, after printing the report header', (_name, html) => {
    const r = measure(html);
    expect(firstLine(r.stdout), 'the report did not start').toBe(process.version);
    expect(r.status).not.toBe(0);
  });

  it('exits 0 when only the soft items are off (a «тож»-heavy document): soft items never change the status', () => {
    const heavy = `<p>${Array(7).fill('Тож гравер швидкий.').join(' ')}</p>${FIG(0)}`;
    const r = measure(heavy);
    expect(firstLine(r.stdout)).toBe(process.version);
    expect(r.status).toBe(0);
  });

  it('accepts the optional inputs (--specs, --name) without changing the decision for a clean document', () => {
    const specs = write('specs.txt', 'Потужність лазера: дві позиції');
    const r = measure(CLEAN_HTML, INPUT_TEXT, ['--specs', specs, '--name', 'Ortur H20']);
    expect(r.status).toBe(0);
    expect(firstLine(r.stdout)).toBe(process.version);
  });
});

describe('FR-32 failure path: unreadable or empty input fails visibly, it does not report zeros', () => {
  it('a missing html file exits non-zero and writes an explanation to stderr', () => {
    const r = run(['--html', join(dir, 'does-not-exist.html'), '--input', write('input.txt', INPUT_TEXT)]);
    scriptStarted(r);
    expect(r.status).not.toBe(0);
    expect(r.stderr.trim().length).toBeGreaterThan(0);
  });

  it('a missing input file exits non-zero', () => {
    const r = run(['--html', write('ok.html', CLEAN_HTML), '--input', join(dir, 'does-not-exist.txt')]);
    scriptStarted(r);
    expect(r.status).not.toBe(0);
    expect(r.stderr.trim().length).toBeGreaterThan(0);
  });

  it.each([['empty', ''], ['whitespace-only', '  \n ']])('an %s html file exits non-zero with an explanation', (_name, content) => {
    const r = run(['--html', write('blank.html', content), '--input', write('input.txt', INPUT_TEXT)]);
    scriptStarted(r);
    expect(r.status).not.toBe(0);
    expect(r.stderr.trim().length).toBeGreaterThan(0);
  });

  it('an empty input description exits non-zero with an explanation', () => {
    const r = run(['--html', write('ok.html', CLEAN_HTML), '--input', write('empty.txt', '')]);
    scriptStarted(r);
    expect(r.status).not.toBe(0);
    expect(r.stderr.trim().length).toBeGreaterThan(0);
  });

  it('no arguments at all exits non-zero with an explanation', () => {
    const r = run([]);
    scriptStarted(r);
    expect(r.status).not.toBe(0);
    expect(r.stderr.trim().length).toBeGreaterThan(0);
  });
});

// ── H-OD10 ANSWERED: numbers absent from the input (D-9, D-10, FR-33) and the optional input flags ────────────

const NUMBER_HTML = `<p>${PLAIN}</p>${FIG(0)}<p>Гравер різав зразок 42 хвилини.</p>`;

describe('FR-33: a number absent from the input is a hard violation (D-9)', () => {
  it('exits non-zero, after printing the report header, when the generated text has a number the input does not', () => {
    const r = measure(NUMBER_HTML);
    expect(firstLine(r.stdout), 'the report did not start').toBe(process.version);
    expect(r.status).not.toBe(0);
  });

  it('names the absent number in the report', () => {
    const r = measure(NUMBER_HTML);
    expect(firstLine(r.stdout)).toBe(process.version);
    expect(r.stdout).toMatch(/\b42\b/);
  });

  it('exits 0 when the same number is in the input description', () => {
    const r = measure(NUMBER_HTML, `${INPUT_TEXT} Тест тривав 42 хвилини.`);
    expect(firstLine(r.stdout)).toBe(process.version);
    expect(r.status).toBe(0);
  });

  it('compares numbers after normalisation: «1 000,5» in the input equals «1000.5» in the generated text', () => {
    const html = `<p>${PLAIN}</p>${FIG(0)}<p>Ресурс 1000.5 години.</p>`;
    const r = measure(html, `${INPUT_TEXT} Ресурс 1 000,5 години.`);
    expect(firstLine(r.stdout)).toBe(process.version);
    expect(r.status).toBe(0);
  });

  it('numbers inside attribute values (src, alt) are not read, so they are never absent numbers', () => {
    const html = `<p>${PLAIN}</p><figure><img src="photo-2048.jpg" alt="Панель 8812"><figcaption>Панель</figcaption></figure>`;
    const r = measure(html);
    expect(firstLine(r.stdout)).toBe(process.version);
    expect(r.status).toBe(0);
  });
});

describe('FR-32 / D-10: every text the script is given forms the input side', () => {
  it('--specs grounds a number (and without it the same number is absent)', () => {
    const without = measure(NUMBER_HTML);
    expect(firstLine(without.stdout)).toBe(process.version);
    expect(without.status).not.toBe(0);
    const specs = write('specs-42.txt', 'Тривалість різання: 42 хвилини');
    const withSpecs = measure(NUMBER_HTML, INPUT_TEXT, ['--specs', specs]);
    expect(firstLine(withSpecs.stdout)).toBe(process.version);
    expect(withSpecs.status).toBe(0);
  });

  it('--name grounds a number in the product name', () => {
    const r = measure(NUMBER_HTML, INPUT_TEXT, ['--name', 'Різак 42 Pro']);
    expect(firstLine(r.stdout)).toBe(process.version);
    expect(r.status).toBe(0);
  });

});

// ── FR-44 item 5 (task breakdown P8; owner task T47): the withdrawn --notes-* options are rejected ─────────────────────────
//
// Written from the Specification (PROPOSED DEFAULT of FR-44 item 5): the four options are not accepted; an unknown option makes
// the script exit with status 2, write `unknown argument "<flag>"` followed by the usage text to stderr, read no file and print
// no report on stdout; the usage text names none of the four options. The four names are literals HERE on purpose: this is the
// absence pin (the source-scan spec excludes spec files because they carry the literals). The input of every run is otherwise
// valid (`--html` and `--input` exist and are clean), so a rejection can only be on account of the flag.
const WITHDRAWN_NOTES_FLAGS = [
  '--notes-usage-scenarios', '--notes-test-results', '--notes-previous-generation-comparison', '--notes-limitations',
];

describe('FR-44 item 5: the four withdrawn --notes-* options are rejected as unknown arguments', () => {
  it.each(WITHDRAWN_NOTES_FLAGS)('%s with a valid --html and --input exits 2 with `unknown argument` and prints no report', flag => {
    const note = write('note-42.txt', 'У тесті зразок різали 42 хвилини');
    const r = measure(CLEAN_HTML, INPUT_TEXT, [flag, note]);
    scriptStarted(r);
    expect(r.error).toBeUndefined();
    expect(r.status, 'the withdrawn flag was accepted').toBe(2);
    expect(r.stderr).toContain(`unknown argument "${flag}"`);
    expect(r.stdout, 'a report was printed although the flag is unknown').toBe('');
  });

  it.each(WITHDRAWN_NOTES_FLAGS)('%s: the usage text that follows the error lists none of the four option names', flag => {
    const r = measure(CLEAN_HTML, INPUT_TEXT, [flag, write('note-7.txt', 'text')]);
    scriptStarted(r);
    const [errorLine, ...usageLines] = r.stderr.split(LINE_BREAK);
    expect(errorLine).toContain(`unknown argument "${flag}"`);
    const usage = usageLines.join(' ');
    expect(usage, 'the usage text was not printed after the error').toContain('--html');
    for (const name of WITHDRAWN_NOTES_FLAGS) expect(usage, `the usage text still lists ${name}`).not.toContain(name);
  });

  it('a withdrawn flag whose file does not exist is rejected as an unknown argument, not as an unreadable file (no file is read)', () => {
    const r = measure(CLEAN_HTML, INPUT_TEXT, ['--notes-limitations', join(dir, 'no-such-note.txt')]);
    scriptStarted(r);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('unknown argument "--notes-limitations"');
    expect(r.stderr).not.toMatch(/cannot read/);
  });
});

describe('FR-32: the soft metrics are reported and never change the exit status (D-3 to D-7)', () => {
  const SOFT_HTML =
    '<h2>Огляд</h2><p>Це довге речення має більше ніж шість слів.</p>'
    + '<h2>Перший</h2><p>Коротко. Це довге речення має більше ніж шість слів.</p>' + FIG(0)
    + '<h2>Другий</h2><p>Ще коротко. Ще раз коротко.</p>';

  it('exits 0 and still prints the header for a document that is clean on the hard criteria', () => {
    const r = measure(SOFT_HTML);
    expect(firstLine(r.stdout)).toBe(process.version);
    expect(r.status).toBe(0);
    expect(r.stdout.split(LINE_BREAK).length, 'the report has lines besides the version').toBeGreaterThan(1);
  });
});

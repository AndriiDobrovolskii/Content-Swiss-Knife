#!/usr/bin/env node
/**
 * measure-description.ts - US-9.1 FR-32, FR-33: reports the mechanical metrics of one generated description and
 * exits non-zero on a hard violation.
 *
 * Run (Node >= 22.18 strips the types natively; no runner and no new dependency):
 *   node tools/measure-description.ts --html generated.html --input description.txt \
 *        [--specs specs.txt] [--name "Product name"] [--locale uk-UA]
 *
 * The first line of every report is `process.version`, so evidence of a live run carries the Node version that
 * produced it. Every text the script is given forms the input side of the "number absent from the input" check
 * (D-10): pass the description, the specs and the product name.
 *
 * Exit status: 0 when no hard criterion is violated (any deixis hit, any figure without a paragraph above, any two
 * figures in a row, any number absent from the input); 1 on a hard violation; 2 when the input cannot be read or
 * is empty (the script fails visibly, it never reports zeros). The soft liveliness items never change the status.
 *
 * Imports are explicit `.ts` paths to the two leaf modules (native type stripping does not resolve extensionless
 * specifiers); `linkedom` provides the DOM parser that Node lacks.
 */
import { readFileSync } from 'node:fs';
import { DOMParser } from 'linkedom';
import { measureDescription } from '../src/utils/description-metrics.ts';
import { collectFigureDeixisFromDocument } from '../src/utils/image-deixis.ts';

const FLAGS: Record<string, string> = {
  '--html': 'html',
  '--input': 'input',
  '--specs': 'specs',
  '--name': 'name',
  '--locale': 'locale',
};
/** Flags whose value is a file path (every flag except the inline `--name` and `--locale`). */
const FILE_FLAGS = new Set(['html', 'input', 'specs']);

const USAGE = 'Usage: node tools/measure-description.ts --html <file> --input <file> [--specs <file>] [--name <text>] '
  + '[--locale <locale>]';

function fail(message: string): never {
  process.stderr.write(`measure-description: ${message}\n`);
  process.exit(2);
}

function parseArgs(argv: string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const key = FLAGS[argv[i]];
    if (!key) fail(`unknown argument ${JSON.stringify(argv[i])}\n${USAGE}`);
    const value = argv[i + 1];
    if (value === undefined) fail(`${argv[i]} needs a value\n${USAGE}`);
    values[key] = value;
    i++;
  }
  return values;
}

function readText(path: string, label: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    return fail(`cannot read ${label} ${JSON.stringify(path)}: ${(error as Error).message}`);
  }
}

const args = parseArgs(process.argv.slice(2));
if (!args.html || !args.input) fail(`--html and --input are required\n${USAGE}`);

const html = readText(args.html, 'the generated HTML');
if (html.trim() === '') fail(`the generated HTML file ${JSON.stringify(args.html)} is empty`);
const description = readText(args.input, 'the input description');
if (description.trim() === '') fail(`the input description file ${JSON.stringify(args.input)} is empty`);

const inputTexts = [description];
for (const key of Object.keys(args)) {
  if (key === 'input' || key === 'html' || key === 'locale') continue;
  inputTexts.push(FILE_FLAGS.has(key) ? readText(args[key], `the ${key} file`) : args[key]);
}

/** linkedom keeps top-level fragments out of `body` unless the document has a body, so a bare fragment is wrapped. */
const parse = (source: string): Document => {
  const wrapped = /<body[\s>]/i.test(source) ? source : `<!doctype html><html><body>${source}</body></html>`;
  return new DOMParser().parseFromString(wrapped, 'text/html') as unknown as Document;
};

const locale = args.locale ?? 'uk-UA';
let report;
try {
  report = measureDescription({ html, inputTexts, locale }, { parse, collect: collectFigureDeixisFromDocument });
} catch (error) {
  fail(`cannot measure ${JSON.stringify(args.html)}: ${(error as Error).message}`);
}

const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(2));
const lines = [
  process.version,
  `locale: ${locale}`,
  '',
  'HARD',
  `  deixis hits (paragraph above, figcaption, alt): ${report.deixisHits}`,
  ...report.deixisDetails.map(d => `    ${d.carrier}: "${d.match}"`),
  `  figures without a paragraph above: ${report.figuresWithoutParagraphAbove}`,
  `  consecutive figures: ${report.consecutiveFigures}`,
  `  numbers absent from the input: ${report.absentNumbers.length}${report.absentNumbers.length ? ` (${report.absentNumbers.join(', ')})` : ''}`,
  '',
  'SOFT (reported, never change the exit status)',
  `  "тож" + "Тому": ${report.connectiveCount} (item met when <= 2: ${report.softItems.connectivesAtMostTwo ? 'yes' : 'no'})`,
  `  sentences: ${report.sentenceCount}, mean words ${fmt(report.meanSentenceWords)}, sigma ${fmt(report.sigmaSentenceWords)} `
    + `(item met when mean >= 12 and sigma >= 5.5: ${report.softItems.rhythmMeanAndSigma ? 'yes' : 'no'})`,
  `  hook word count: ${report.hookWordCount}`,
  `  sentences of at most 6 words per section: ${report.shortSentencesPerSection.length ? report.shortSentencesPerSection.join(', ') : '(no sections)'}`,
  '',
  report.hardViolations.length === 0
    ? 'RESULT: no hard violation'
    : `RESULT: HARD VIOLATION - ${report.hardViolations.join('; ')}`,
];
process.stdout.write(`${lines.join('\n')}\n`);
process.exit(report.hardViolations.length === 0 ? 0 : 1);

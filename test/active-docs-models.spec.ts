/**
 * US-4.1 — FR-16 / AC-9: active documentation names claude-sonnet-5-5 as the example/default
 * thinking model, and no active doc names the retired claude-sonnet-4-6 as selectable or default.
 *
 * Historical references (server/utils/timeouts.js comments, spec fixtures that imitate past
 * states) are deliberately NOT scanned — FR-16 / OD-8 say they stay.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// vitest runs from the repository root (the same assumption test/render-reconciliation.spec.ts relies on).
const read = (relative: string) => readFileSync(resolve(process.cwd(), relative), 'utf8');

describe('active documentation names the new default model (FR-16)', () => {
  it('README.md shows claude-sonnet-5-5 as the ANTHROPIC_MODEL_THINKING example', () => {
    expect(read('README.md')).toMatch(/^ANTHROPIC_MODEL_THINKING=claude-sonnet-5-5(\s|$)/m);
  });

  it('.env.example sets ANTHROPIC_MODEL_THINKING to claude-sonnet-5-5', () => {
    expect(read('.env.example')).toMatch(/^ANTHROPIC_MODEL_THINKING=claude-sonnet-5-5\s*$/m);
  });

  it('.env.example no longer describes Sonnet 5 on Deep and Gemini 3.7 Flash on Fast as the defaults', () => {
    expect(read('.env.example')).not.toMatch(/Gemini 3\.7 Flash on Fast/i);
  });

  it('AGENTS.md LLM-providers row names claude-sonnet-5-5 as the Anthropic target', () => {
    const row = read('AGENTS.md').split(/\r?\n/).find(l => l.startsWith('| LLM providers'));
    expect(row, 'LLM providers row missing').toBeDefined();
    expect(row).toContain('`claude-sonnet-5-5`');
    expect(row).not.toMatch(/`claude-sonnet-5`/);
  });

  it('names claude-sonnet-4-6 in no active doc or default', () => {
    for (const file of ['README.md', '.env.example', 'AGENTS.md']) {
      expect(read(file), file).not.toContain('claude-sonnet-4-6');
    }
  });
});

/**
 * US-11.1 (T9) - FR-30 / AC-11: the active docs and the active Surface sources do not name Gemini 3.7 Flash or
 * Gemini 3.6 Flash as a selectable or default model. The closed list is the approver's ruling OD-8
 * (docs/workflow/history.jsonl): README.md, .env.example, AGENTS.md plus the active Surface files below.
 * Archived Story artifacts, docs/catalog/stories.yaml and Knowledge/Requests/R1/r1.md are historical and are
 * NOT scanned.
 *
 * NB-11 (approver comment on HUMAN_PLAN_APPROVAL): T9 makes NO edit to AGENTS.md. AGENTS.md stays in the
 * closed list as a pure guard - it has no retired-name hit today and must keep having none - and no test here
 * requires AGENTS.md to change.
 *
 * The pattern is BROADENED on purpose (plan D12, impact R-13): the repository writes the retired models in the
 * short forms "3.7 and 3.6 Flash" (.env.example), "Flash 3.6 @ minimal" (the clampLevel comment) and
 * "Gemini 3.7 Flash" (pricing.js), none of which the four literal strings of the Story catch alone. It also
 * catches the helper-name form (gemini37FlashPrice). `3.75`-style price literals do not match: a version
 * number needs a word boundary after the minor digit.
 *
 * RECOGNITION. A retired id may appear where the behaviour is to recognise it (Specification P-8): the browser
 * restore migration table, the server remap, and the tests of FR-14, FR-15 and FR-19 (specs are not scanned).
 * In the two source files that exist for that purpose a match is allowed only (a) inside the declaration of
 * the table / map itself (from the line that declares a constant named *retired* or *remap* to its closing
 * `;` line, or on a table-entry line that starts with the quoted id), or (b) on a comment line that says it is
 * about retiring, migrating or remapping the model.
 *
 * Red observation on the pre-Story tree (the test generation report records the run): the `.env.example` and
 * `src/prompt-core/model-catalog.ts` passages both fail this scan before T9 / T6, which proves the scan can fail.
 */
const RETIRED_NAME_PATTERNS: RegExp[] = [
  /gemini-3\.[67]-flash/i,                 // the two ids
  /gemini\s*3\.[67]\s*flash/i,             // the two labels
  /gemini3[67]/i,                          // helper names such as gemini37FlashPrice
  /\b3\.[67]\b[^\n]{0,12}\bflash\b/i,      // "3.7 Flash", "3.7 and 3.6 Flash", "3.7 / 3.6 Flash"
  /\bflash\b[^\n]{0,6}\b3\.[67]\b/i,       // "Flash 3.6 @ minimal"
];
const namesARetiredModel = (line: string) => RETIRED_NAME_PATTERNS.some(p => p.test(line));
const matchingLines = (text: string) =>
  text.split(/\r?\n/).map((line, i) => ({ line, n: i + 1 })).filter(({ line }) => namesARetiredModel(line));

/**
 * Line numbers inside a declaration whose name says retired / remap (for example RETIRED_MODELS): from the
 * declaring line to the first line that consists only of `]);`, `};` or `];`.
 */
function recognitionBlockLines(text: string): Set<number> {
  const lines = text.split(/\r?\n/);
  const inside = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*(?:export\s+)?(?:const|let|var)\s+\w*(?:retired|remap)\w*/i.test(lines[i])) continue;
    for (let j = i; j < lines.length; j++) {
      inside.add(j + 1);
      if (j > i && /^\s*(?:\]\)|\}|\])\s*;\s*$/.test(lines[j])) break;
    }
  }
  return inside;
}

/** A table entry that starts with a quoted id, for example `['gemini-3.7-flash', { ... }],` or `'claude-x': 'y',`. */
const isTableEntry = (line: string) => /^\s*[[{]?\s*['"][\w.-]+['"]\s*[,:]/.test(line);

const isRecognitionComment = (line: string) => /^\s*(?:\/\/|\*|\/\*)/.test(line) && /retir|migrat|remap/i.test(line);

describe('active docs and sources name no retired Gemini Flash model (FR-30, AC-11)', () => {
  const STRICT_DOCS = ['README.md', '.env.example', 'AGENTS.md'];
  const ACTIVE_SOURCES = [
    'src/app/components/model-settings/model-settings.component.ts',
    'src/prompt-core/model-catalog.json',
    'src/prompt-core/model-catalog.ts',
    'server/usage/pricing.js',
    'server/providers/gemini.js',
  ];
  const RECOGNITION_SOURCES = ['src/services/model-settings.service.ts', 'server/providers/model-support.js'];

  it('the scan really covers the closed list (guards against an empty or misspelt path)', () => {
    for (const file of [...STRICT_DOCS, ...ACTIVE_SOURCES, ...RECOGNITION_SOURCES]) {
      expect(read(file).length, file).toBeGreaterThan(100);
    }
  });

  it('the pattern catches every form the repository uses, and ignores price literals and current models', () => {
    for (const hit of [
      'gemini-3.7-flash', 'Gemini 3.6 Flash', '(fast; 3.7 and 3.6 Flash are still selectable)', '3.7 / 3.6 Flash',
      'Flash 3.6 @ minimal', 'function gemini37FlashPrice(now) {', '// Gemini 3.7 Flash - introductory rate',
    ]) expect(namesARetiredModel(hit), hit).toBe(true);
    for (const clean of [
      "out:  7.50, cw: 0, cr: 0.15 }", 'out: 3.75, cw: 0, cr: 0.075', 'Gemini 3.8 Flash', 'gemini-3.8-flash',
      'Gemini 3.1 Pro', 'Gemini 4 Carbon', 'v1.3.7 flashing', 'gemini-4-hydrogen',
    ]) expect(namesARetiredModel(clean), clean).toBe(false);
  });

  it.each(STRICT_DOCS)('FR-30: %s names no retired model in any form', (file) => {
    expect(matchingLines(read(file)).map(({ n, line }) => `${file}:${n}: ${line.trim()}`)).toEqual([]);
  });

  it.each(ACTIVE_SOURCES)('FR-30: %s names no retired model, not even in a comment', (file) => {
    expect(matchingLines(read(file)).map(({ n, line }) => `${file}:${n}: ${line.trim()}`)).toEqual([]);
  });

  it.each(RECOGNITION_SOURCES)(
    'FR-30: %s names a retired model only inside its retired-id table or on a comment about retiring, migrating or remapping', (file) => {
      const text = read(file);
      const inside = recognitionBlockLines(text);
      const stray = matchingLines(text)
        .filter(({ n, line }) => !inside.has(n) && !isTableEntry(line) && !isRecognitionComment(line))
        .map(({ n, line }) => `${file}:${n}: ${line.trim()}`);
      expect(stray).toEqual([]);
    });

  // NB-11: the one-line Section 4 note goes in the PR description, so AGENTS.md is untouched by this Story.
  it('AGENTS.md carries no retired-model mention and needs no edit for this Story (NB-11)', () => {
    expect(matchingLines(read('AGENTS.md'))).toEqual([]);
  });
});

describe('.env.example gains no setting (NFR-4)', () => {
  // Characterization: the uncommented KEY= lines before this Story. A retired-model comment cleanup adds none.
  it('declares exactly the same environment variables as before', () => {
    const keys = read('.env.example').split(/\r?\n/).filter(l => /^[A-Z][A-Z0-9_]*=/.test(l)).map(l => l.split('=')[0]);
    expect(keys).toEqual([
      'LLM_PROVIDER', 'OPENAI_API_KEY', 'OPENAI_MODEL', 'ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL_THINKING',
      'ANTHROPIC_MODEL_FAST', 'ANTHROPIC_THINKING_EFFORT', 'GEMINI_API_KEY', 'SERPER_API_KEY', 'JINA_API_KEY',
      'PORT', 'ALLOWED_ORIGINS',
    ]);
  });
});

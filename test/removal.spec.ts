/**
 * US-2.2 AC-13 / FR-20 — the legacy consumables machinery no longer exists, and nothing references it.
 *
 * "After this Story, the consumables template id, CONSUMABLES_SIMPLIFIED_SCHEMA,
 * CONSUMABLES_TRANSLATION_OVERLAY and task-a-consumables-doc.ts no longer exist in the repository, and
 * no source or spec references them." (AC-13), extended by OD-2/OD-14 to the domain model, renderer,
 * prose transforms, trim/bullet utilities, pipeline flag, orchestration arms and their fixtures.
 *
 * The token search is the completion criterion of plan D10: a repository-wide text search for the six
 * tokens returns nothing under src/, test/ and server/. Docs, archived Stories and the Story's own
 * artifacts are out of scope. This file and its token fixture are the only places that name the tokens,
 * and they assemble the literals at runtime so the search does not match itself.
 *
 * STAGING (task breakdown T11 / T13): the pipeline, renderer and flag tokens go at T11; the
 * shared-constant text (`CONSUMABLES_` prefix: CONSUMABLES_SIMPLIFIED_SCHEMA and
 * CONSUMABLES_TRANSLATION_OVERLAY in prompt-core/constants.ts) goes at T13. The two searches are
 * therefore separate tests: the first is green at T11, the second at T13. Neither may be weakened.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { REMOVED_PATHS, REMOVED_TEXT_TOKENS } from './fixtures/removed-tokens';

const ROOT = process.cwd();
const SCAN_DIRS = ['src', 'test', 'server'];
const TEXT_EXT = /\.(ts|js|mjs|cjs|json|html|yaml|yml)$/;
const SELF = new Set(['test/removal.spec.ts', 'test/fixtures/removed-tokens.ts']);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.angular' || name === 'dist') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (TEXT_EXT.test(name)) out.push(p);
  }
  return out;
}

const FILES = SCAN_DIRS.filter(d => existsSync(join(ROOT, d))).flatMap(d => walk(join(ROOT, d)))
  .map(p => ({ abs: p, rel: relative(ROOT, p).split(sep).join('/') }))
  .filter(f => !SELF.has(f.rel));

function offenders(tokens: readonly string[]): string[] {
  const hits: string[] = [];
  for (const f of FILES) {
    const text = readFileSync(f.abs, 'utf8');
    for (const t of tokens) if (text.includes(t)) hits.push(`${f.rel}  ->  ${t}`);
  }
  return hits;
}

describe('AC-13 / FR-20 — removed files and directories', () => {
  it('the scan really covers the repository (guards against an empty walk)', () => {
    expect(FILES.length).toBeGreaterThan(200);
    expect(FILES.some(f => f.rel === 'src/render/render-description.ts')).toBe(true);
  });
  for (const p of REMOVED_PATHS) {
    it(`${p} no longer exists`, () => {
      expect(existsSync(join(ROOT, p))).toBe(false);
    });
  }
});

describe('AC-13 / FR-20 — no source, spec or fixture references a removed item', () => {
  const noConstants = REMOVED_TEXT_TOKENS.filter(t => !t.startsWith('CONSUMABLES'));
  const constantsPrefix = REMOVED_TEXT_TOKENS.filter(t => t.startsWith('CONSUMABLES'));

  it('the removed template id, doc-pipeline literal, domain type, renderer and flag are referenced nowhere (green at T11)', () => {
    expect(offenders(noConstants)).toEqual([]);
  });

  it('no CONSUMABLES_ constant, overlay or pipeline-enablement name is referenced anywhere (green at T13)', () => {
    expect(offenders(constantsPrefix)).toEqual([]);
  });

  it('the token list is what the plan says it is (six tokens)', () => {
    expect(REMOVED_TEXT_TOKENS).toHaveLength(6);
    expect(new Set(REMOVED_TEXT_TOKENS).size).toBe(6);
  });
});

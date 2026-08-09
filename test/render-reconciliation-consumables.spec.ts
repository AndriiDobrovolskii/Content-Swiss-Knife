/**
 * render-reconciliation-consumables.spec.ts
 *
 * Proves renderConsumablesDoc() reproduces production HTML for the one real accepted §C artifact
 * in the repo — the consumables sibling of render-reconciliation.spec.ts, which makes the same
 * claim for renderDescription()/ProductDescriptionDoc and is not touched by this file.
 *
 * A small, standalone harness rather than an extension of render-description.ts's — see the plan's
 * rationale: that file's header is single-purpose ("Proves renderDescription() reproduces
 * production HTML"), and mixing two unrelated schema families into one suite would blur it.
 *
 * Corpus layout: the accepted artifact lives at
 * test/fixtures/consumables/<slug>.uk-UA.html (pre-existing, also used by scaffold-doc.spec.ts's
 * §C refusal tests — untouched by this file); the hand-authored Doc counterpart lives at
 * test/fixtures/consumables-corpus/<slug>.doc.json + <slug>.ctx.json (new).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderConsumablesDoc, type RenderContext } from '../src/render/render-consumables';
import { ConsumablesDescriptionDocSchema } from '../src/domain/consumables-doc.schema';
import type { ConsumablesDescriptionDoc } from '../src/domain/consumables-doc';
import { validateGeneratedHtml } from '../src/utils/output-validator';

const HTML_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'consumables');
const CORPUS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'consumables-corpus');

/** [VERBATIM from render-reconciliation.spec.ts] — same normalization rules, same rationale. */
function decodeNbsp(html: string): string {
  return html.replace(/&nbsp;/g, ' ');
}
function normalize(html: string): string {
  return decodeNbsp(html).replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
}
function visibleText(html: string): string {
  return decodeNbsp(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
function countTag(html: string, re: RegExp): number {
  return (html.match(re) ?? []).length;
}

/** [VERBATIM from render-reconciliation.spec.ts's COUNTED_TAGS] — the §C-relevant subset. */
const COUNTED_TAGS: Array<{ label: string; re: RegExp }> = [
  { label: '<h2>', re: /<h2\b/gi },
  { label: '<h3>', re: /<h3\b/gi },
  { label: '<hr>', re: /<hr\b/gi },
  { label: '<section>', re: /<section\b/gi },
  { label: '<table>', re: /<table\b/gi },
  { label: '<tr>', re: /<tr\b/gi },
  { label: '<td>', re: /<td\b/gi },
  { label: '<li>', re: /<li\b/gi },
];

interface CorpusItem {
  slug: string;
  html: string;
  doc?: ConsumablesDescriptionDoc;
  ctx?: RenderContext;
}

function loadCorpus(): CorpusItem[] {
  if (!existsSync(CORPUS_DIR)) return [];
  return readdirSync(CORPUS_DIR)
    .filter(f => f.endsWith('.doc.json'))
    .sort()
    .map(file => {
      const slug = file.replace(/\.doc\.json$/, '');
      const ctxPath = join(CORPUS_DIR, `${slug}.ctx.json`);
      const htmlPath = join(HTML_DIR, `${slug}.uk-UA.html`);
      return {
        slug,
        html: readFileSync(htmlPath, 'utf8'),
        doc: JSON.parse(readFileSync(join(CORPUS_DIR, file), 'utf8')),
        ctx: existsSync(ctxPath) ? JSON.parse(readFileSync(ctxPath, 'utf8')) : undefined,
      };
    });
}

const corpus = loadCorpus();

describe('consumables render reconciliation — corpus coverage', () => {
  it('has at least one committed artifact to reconcile against', () => {
    expect(corpus.length).toBeGreaterThan(0);
  });
});

describe.each(corpus.length ? corpus : [])('consumables render reconciliation — $slug', item => {
  const doc = item.doc!;
  const ctx = item.ctx!;

  it('validates against ConsumablesDescriptionDocSchema', () => {
    const result = ConsumablesDescriptionDocSchema.safeParse(doc);
    expect(result.success, JSON.stringify(result.error?.issues, null, 2)).toBe(true);
  });

  it('renders to HTML equal to production after whitespace normalization', () => {
    expect(normalize(renderConsumablesDoc(doc, ctx))).toBe(normalize(item.html));
  });

  it('matches production element counts across the parity vocabulary', () => {
    const rendered = renderConsumablesDoc(doc, ctx);
    const actual = Object.fromEntries(COUNTED_TAGS.map(t => [t.label, countTag(rendered, t.re)]));
    const expected = Object.fromEntries(COUNTED_TAGS.map(t => [t.label, countTag(item.html, t.re)]));
    expect(actual).toEqual(expected);
  });

  it('preserves visible text exactly', () => {
    expect(visibleText(renderConsumablesDoc(doc, ctx))).toBe(visibleText(item.html));
  });

  it('produces zero validator errors', () => {
    const rendered = renderConsumablesDoc(doc, ctx);
    const issues = validateGeneratedHtml(rendered, `consumables corpus (${item.slug})`, doc.localizedName, 'uk-UA', {
      templateId: 'consumables-resin',
    });
    const errors = issues.filter(i => i.severity === 'error');
    expect(errors, JSON.stringify(errors, null, 2)).toHaveLength(0);
  });
});

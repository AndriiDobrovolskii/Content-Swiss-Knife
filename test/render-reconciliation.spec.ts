/**
 * render-reconciliation.spec.ts
 *
 * Proves renderDescription() reproduces production HTML for a corpus of real accepted artifacts.
 * This is the gate PR-3 must clear before the Task A prompt is allowed to change.
 *
 * Comparison is SEMANTIC, not byte-exact: whitespace between tags is normalized, because the
 * current pipeline's whitespace is an accident of string concatenation in table-finalize.ts, not
 * a requirement. Everything else — tag names, order, attributes, text content — must match.
 *
 * CORPUS STATUS: the artifacts in fixtures/corpus/ are committed, but their hand-authored
 * ProductDescriptionDoc counterparts are not yet written — the ZIP exports they came from contain
 * outputs only, with no ProductInput to build a RenderContext from. Rather than pass vacuously,
 * this suite reports every artifact still awaiting a Doc. See render-reconciliation.report.md.
 *
 * To add a corpus item, drop three files in fixtures/corpus/ sharing a slug:
 *   <slug>.uk-UA.html   the accepted artifact, verbatim, post-finalizeTablesForDisplay
 *   <slug>.doc.json     the hand-authored ProductDescriptionDoc
 *   <slug>.ctx.json     the RenderContext ({ imageBaseUrl, brandFolder?, modelFolder?, storeName? })
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderDescription, type RenderContext } from '../src/render/render-description';
import { ProductDescriptionDocSchema } from '../src/domain/description-doc.schema';
import type { ProductDescriptionDoc } from '../src/domain/description-doc';
import { validateGeneratedHtml } from '../src/utils/output-validator';

const CORPUS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'corpus');

/**
 * [VERBATIM from src/utils/structural-parity.ts]
 *
 * Copied rather than imported: the original is a module-private `const`, not an export. Keep the
 * two lists identical — this is the established parity vocabulary, and diverging from it would
 * make reconciliation and translation-parity disagree about what "same structure" means.
 */
const COUNTED_TAGS: Array<{ label: string; re: RegExp }> = [
  { label: '<section>',    re: /<section\b/gi },
  { label: '<h2>',         re: /<h2\b/gi },
  { label: '<h3>',         re: /<h3\b/gi },
  { label: '<hr>',         re: /<hr\b/gi },
  { label: '<figure>',     re: /<figure\b/gi },
  { label: '<figcaption>', re: /<figcaption\b/gi },
  { label: '<table>',      re: /<table\b/gi },
  { label: '<tr>',         re: /<tr\b/gi },
  { label: '<td>',         re: /<td\b/gi },
  { label: '<li>',         re: /<li\b/gi },
];

/**
 * `&nbsp;` and a literal U+00A0 are the same character, differently serialized.
 *
 * Production writes the entity; the renderer writes the character. Neither is authored content:
 * fixNumberFormatting inserts a real NBSP into prose, and the entity appears only because the
 * current pipeline round-trips the HTML through the DOM (cleanHtmlStructure, table-finalize),
 * where innerHTML serializes it that way. A pure string renderer has no DOM and cannot reproduce
 * that artifact — which puts this squarely in the category this file already normalizes, alongside
 * whitespace that is "an accident of string concatenation".
 *
 * Decoding rather than deleting matters: a renderer that DROPPED the character still fails, because
 * "100 %" and "100%" remain different after the collapse below.
 */
function decodeNbsp(html: string): string {
  return html.replace(/&nbsp;/g, ' ');
}

/**
 * `data-section="killer-specs"` / `data-spec-key="..."` / `data-spec-value="..."` are new,
 * machine-readable attributes the renderer emits for the deterministic slug-suffix feature -- no
 * historical production HTML has them, and never will retroactively. Same category as decodeNbsp
 * above: a known, deliberate difference between the renderer's forward-looking output and a
 * committed historical artifact, not the kind of unintended drift this suite exists to catch.
 * Stripped from both sides (a no-op on production HTML, which has none) so the comparison stays
 * about structural/content fidelity rather than freezing the renderer against ever adding an
 * attribute -- the same reasoning SUPERSEDED_SLUGS below applies at the whole-artifact level.
 */
function stripSlugSuffixMarkers(html: string): string {
  return html
    .replace(/ data-section="killer-specs"/g, '')
    .replace(/ data-spec-key="[^"]*"/g, '')
    .replace(/ data-spec-value="[^"]*"/g, '');
}

/**
 * Collapses inter-tag whitespace and runs of whitespace inside text. Deliberately does NOT sort
 * attributes, drop attributes, or change case — those differences are real failures, not noise.
 */
function normalize(html: string): string {
  return stripSlugSuffixMarkers(decodeNbsp(html)).replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
}

/** Visible text only, for content-loss detection that tag counts would miss. */
function visibleText(html: string): string {
  return decodeNbsp(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countTag(html: string, re: RegExp): number {
  return (html.match(re) ?? []).length;
}

interface CorpusItem {
  slug: string;
  html: string;
  doc?: ProductDescriptionDoc;
  ctx?: RenderContext;
}

/**
 * §5b `operatingTips` was removed from the schema and the renderer (PDP scope narrowed to
 * pre-purchase content). `center-3d-print-ortur-h20-20w` is a real, already-published Center 3D
 * Print page whose production HTML still carries that section — the renderer will never reproduce
 * it again by design, so this corpus item can no longer reconcile byte-for-byte. The three fixture
 * files stay committed (historical record; `scaffold-doc.spec.ts`'s field-level checks still use
 * them), but this suite must not claim reconciliation it cannot deliver.
 */
const SUPERSEDED_SLUGS = new Set(['center-3d-print-ortur-h20-20w']);

function loadCorpus(): CorpusItem[] {
  if (!existsSync(CORPUS_DIR)) return [];
  return readdirSync(CORPUS_DIR)
    .filter(f => f.endsWith('.uk-UA.html'))
    .sort()
    .map(file => {
      const slug = file.replace(/\.uk-UA\.html$/, '');
      const docPath = join(CORPUS_DIR, `${slug}.doc.json`);
      const ctxPath = join(CORPUS_DIR, `${slug}.ctx.json`);
      const superseded = SUPERSEDED_SLUGS.has(slug);
      return {
        slug,
        html: readFileSync(join(CORPUS_DIR, file), 'utf8'),
        doc: !superseded && existsSync(docPath) ? JSON.parse(readFileSync(docPath, 'utf8')) : undefined,
        ctx: !superseded && existsSync(ctxPath) ? JSON.parse(readFileSync(ctxPath, 'utf8')) : undefined,
      };
    });
}

const corpus = loadCorpus();
const reconcilable = corpus.filter(c => c.doc && c.ctx);
const pending = corpus.filter(c => !c.doc || !c.ctx);

describe('render reconciliation — corpus coverage', () => {
  it('has at least one committed artifact to reconcile against', () => {
    expect(corpus.length).toBeGreaterThan(0);
  });

  // Not an assertion — a visible ledger. A green suite with 0 reconcilable items would otherwise
  // read as "the renderer reproduces production", which is exactly the claim this PR must not make.
  it('reports artifacts still awaiting a hand-authored Doc', () => {
    if (pending.length > 0) {
      console.warn(
        `\n[reconciliation] ${reconcilable.length}/${corpus.length} corpus items reconcilable.\n` +
          pending.map(p => SUPERSEDED_SLUGS.has(p.slug)
            ? `  PENDING ${p.slug} — superseded: production's §5b operating-tips section no longer has a schema field`
            : `  PENDING ${p.slug} — missing ${!p.doc ? '.doc.json' : ''}${!p.doc && !p.ctx ? ' and ' : ''}${!p.ctx ? '.ctx.json' : ''}`).join('\n') +
          `\n  See test/render-reconciliation.report.md for why these are not yet authored.\n`,
      );
    }
    expect(pending.length + reconcilable.length).toBe(corpus.length);
  });
});

describe.each(reconcilable.length ? reconcilable : [])('render reconciliation — $slug', item => {
  const doc = item.doc!;
  const ctx = item.ctx!;

  it('validates against ProductDescriptionDocSchema', () => {
    const result = ProductDescriptionDocSchema.safeParse(doc);
    expect(result.success, JSON.stringify(result.error?.issues, null, 2)).toBe(true);
  });

  it('renders to HTML equal to production after whitespace normalization', () => {
    expect(normalize(renderDescription(doc, ctx))).toBe(normalize(item.html));
  });

  it('matches production element counts across the parity vocabulary', () => {
    const rendered = renderDescription(doc, ctx);
    const actual = Object.fromEntries(COUNTED_TAGS.map(t => [t.label, countTag(rendered, t.re)]));
    const expected = Object.fromEntries(COUNTED_TAGS.map(t => [t.label, countTag(item.html, t.re)]));
    expect(actual).toEqual(expected);
  });

  it('preserves visible text exactly', () => {
    expect(visibleText(renderDescription(doc, ctx))).toBe(visibleText(item.html));
  });

  it('produces zero validator errors', () => {
    const rendered = renderDescription(doc, ctx);
    const issues = validateGeneratedHtml(rendered, `corpus (${item.slug})`, doc.localizedName, 'uk-UA', {
      imageManifest: doc.figures.map(f => ({ urlFilename: f.file })),
    });
    const errors = issues.filter(i => i.severity === 'error');
    expect(errors, JSON.stringify(errors, null, 2)).toHaveLength(0);
    // Warnings are recorded in the report, not asserted.
  });
});

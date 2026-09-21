/**
 * render-conformance.v4.spec.ts — US-2.1 validation category V14 (FR-20, FR-23, FR-24, D14).
 *
 * 🔴 WHY THIS IS A SECOND MATRIX AND NOT AN EDIT TO `render-conformance.spec.ts`.
 * That file's matrix asserts, at `:193-196`, that the rendered HTML contains
 * `<thead><tr><th>${param}</th><th>${benefit}</th></tr></thead>` — the §2a killer-specs table header
 * pair. Under v4 that table is GONE BY DESIGN (FR-4), so flipping `conformanceDoc()` to `'4.0'`
 * would make an existing, correct assertion permanently red, and the only route back to green would
 * be to weaken or delete it. That is an AGENTS.md §7.7 move, and authoring it here would be worse
 * than leaving the gap. The existing matrix and its `'3.0'` fixture stay exactly as they are — they
 * remain the proof that the `'3.0'` render is unchanged — and this file adds the `'4.0'` half beside
 * them.
 *
 * WHAT IT PROVES THAT NOTHING ELSE DOES. Reconciliation is empirical and limited to the two stores
 * an accepted artifact exists for; conformance is derived from `STORE_REGISTRY`, so it covers stores
 * no artifact exists for. Production has shipped no v4 artifact, so for `'4.0'` the corpus is the
 * wrong instrument BY CONSTRUCTION and this matrix is the only cross-store gate there is.
 *
 * SCOPED ASSERTIONS, NOT GLOBAL ONES. §7 legitimately keeps its tables under v4, so "no `<table>`"
 * is asserted on the §2 SLICE. A global assertion would be wrong for a right-looking reason.
 */
import { describe, it, expect } from 'vitest';

import { renderDescription } from '../src/render/render-description';
import { getRenderRules, renderContextFor } from '../src/prompt-core/store-render-rules';
import { STORE_REGISTRY } from '../src/prompt-core/constants';
import { ProductDescriptionDocSchema } from '../src/domain/description-doc.schema';
import { validateGeneratedHtml } from '../src/utils/output-validator';
import { v4ConformanceDoc } from './fixtures/v4-docs';

const CASES = Object.entries(STORE_REGISTRY).flatMap(([storeName, profile]) =>
  profile.languages.map(locale => ({ storeName, locale })),
);

const RENDERABLE = CASES.filter(c => getRenderRules(c.storeName).imageBaseUrl);
const UNRENDERABLE = CASES.filter(c => !getRenderRules(c.storeName).imageBaseUrl);

const countOf = (html: string, re: RegExp) => (html.match(re) ?? []).length;

/** §2 is the second top-level part; `renderDescription` joins them with a blank line. */
const sectionTwo = (html: string) => html.split('\n\n')[1];

describe('V14 — the `4.0` matrix enumerates the same registry the `3.0` one does', () => {
  /**
   * 🔵 CHARACTERIZATION / D14. `Expert-3DPrinter` ships `imageBaseUrl: ''`, so `renderContextFor`
   * refuses it and its three store-locale pairs stay unrenderable. D14 decides the store is out of
   * reach of this Story — no FR names `doc-pipeline-flag.ts`, and a CDN path is not this Story's to
   * supply — so this assertion is the observable form of that exclusion, not a gap being tolerated.
   */
  it('keeps exactly one store blocked by a missing image base URL', () => {
    expect(Object.keys(STORE_REGISTRY)).toHaveLength(7);
    expect([...new Set(UNRENDERABLE.map(c => c.storeName))]).toEqual(['Expert-3DPrinter']);
    expect(RENDERABLE).toHaveLength(20);
  });
});

describe.each(RENDERABLE)('V14 — `4.0` conformance — $storeName / $locale', ({ storeName, locale }) => {
  const doc = v4ConformanceDoc(locale);
  const html = renderDescription(doc, renderContextFor(storeName, 'formlabs', 'fuse-1'));

  it('the fixture is a valid `4.0` document', () => {
    const result = ProductDescriptionDocSchema.safeParse(doc);
    expect(result.success, JSON.stringify(result.error?.issues, null, 2)).toBe(true);
  });

  it('produces zero validator errors', () => {
    const errors = validateGeneratedHtml(html, `v4 conformance (${storeName}/${locale})`, doc.localizedName, locale, {
      imageManifest: doc.figures.map(f => ({ urlFilename: f.file })),
    }).filter(i => i.severity === 'error');
    expect(errors, JSON.stringify(errors, null, 2)).toHaveLength(0);
  });

  /** FR-4 — the §2 shape, asserted on the §2 slice so §7's tables are not caught by it. */
  it('renders §2 as one <h2> over one <ul>, with no table', () => {
    const block = sectionTwo(html);
    expect(countOf(block, /<h2\b/g)).toBe(1);
    expect(countOf(block, /<ul\b/g)).toBe(1);
    expect(countOf(block, /<table\b/g)).toBe(0);
    expect(countOf(block, /<li\b/g)).toBe(6);
  });

  /** FR-7 — §7 keeps its `<h3>` + table per category; the v4 §2 change does not reach it. */
  it('keeps one <h3> and one table per §7 category', () => {
    expect(countOf(html, /<h3\b/g)).toBeGreaterThanOrEqual(doc.specs.categories.length);
    expect(countOf(html, /<table\b/g)).toBe(doc.specs.categories.length);
    expect(html).toContain('<div class="table-responsive">');
  });

  /** FR-25 — §7 is still the only `<section>`, and the single `<hr>` still follows it. */
  it('emits exactly one <section class="specs"> followed by the single <hr>', () => {
    expect(countOf(html, /<section\b/g)).toBe(1);
    expect(html).toContain('<section class="specs">');
    expect(countOf(html, /<hr>/g)).toBe(1);
    expect(html).toContain('</section>\n<hr>');
  });

  it('builds every image src from this store’s registry image base', () => {
    const srcs = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(m => m[1]);
    expect(srcs).toHaveLength(3);
    expect(srcs.every(s => s.startsWith(STORE_REGISTRY[storeName].imageBaseUrl))).toBe(true);
  });

  /**
   * FR-23, and the reason V14 exists for `'4.0'` at all. The §2 merge moves figure content into §3
   * and §4, which changes which source image occupies the LCP slot — accepted by the Specification.
   * What is NOT accepted is a figure the position walk never visits: it resolves to position 0 and
   * ships eager, which `output-validator` flags as `lcp-image-lazy`. This is the assertion that
   * catches it.
   */
  it('keeps the first image in rendered document order eager and every later one lazy', () => {
    const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map(m => m[0]);
    expect(imgs).toHaveLength(3);
    expect(imgs[0]).not.toContain('loading="lazy"');
    expect(imgs.slice(1).every(i => i.includes('loading="lazy"'))).toBe(true);
    expect(imgs.every(i => i.includes('decoding="async"'))).toBe(true);
  });

  it('gives every figure a figcaption and never nests one inside a <p>', () => {
    expect(countOf(html, /<figure\b/g)).toBe(4);      // 3 images + 1 video
    expect(countOf(html, /<figcaption\b/g)).toBe(4);
    expect(html).not.toMatch(/<p>(?:(?!<\/p>)[^])*?<figure/);
  });

  /** FR-24 — a video present in the input is present in the output, in §3 where v4 admits it. */
  it('carries the video embed through, inside §3 and never inside §2', () => {
    expect(html).toContain('<iframe src="https://www.youtube.com/embed/abc123?rel=0"');
    expect(html).toContain('title="Formlabs Fuse 1 overview"');
    expect(sectionTwo(html)).not.toContain('<iframe');
  });

  /** FR-12 / FR-26 — standing criteria, restated against the v4 render. */
  it('emits no <h1> and never puts schema.org/Product in the body', () => {
    expect(html).not.toMatch(/<h1\b/);
    expect(html).not.toContain('schema.org/Product');
  });
});

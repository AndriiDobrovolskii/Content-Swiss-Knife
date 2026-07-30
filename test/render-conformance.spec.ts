/**
 * render-conformance.spec.ts
 *
 * Proves `renderDescription()` obeys the documented rules for EVERY store in `STORE_REGISTRY` and
 * every locale that store publishes — 8 stores, 27 combinations.
 *
 * WHY THIS EXISTS ALONGSIDE render-reconciliation.spec.ts. The two gates prove different things and
 * neither replaces the other:
 *
 *   reconciliation — the renderer reproduces bytes production actually shipped. Empirical, exact,
 *                    and limited to the stores an accepted artifact exists for (today: 2).
 *   conformance    — the renderer obeys the RULES, for every store the registry defines. Derived
 *                    from configuration, so it covers stores no artifact exists for.
 *
 * Reconciliation cannot scale to 8 stores without generating 6+ fresh products. Conformance can,
 * because the rules are already written down: CLAUDE.md's acceptance criteria, `STORE_REGISTRY`,
 * and the §2a header maps. This is the gate for "the templater is assembled for all sites".
 *
 * WHAT IT DELIBERATELY DOES NOT PROVE: prose quality. The fixture is locale-neutral on purpose —
 * writing idiomatic marketing copy in eight languages would mean inventing the content the MODEL is
 * supposed to produce, and language rules are the prompt's concern with their own tests. That is a
 * stated boundary, not a hidden gap: every locale-prose rule in output-validator.ts is a WARNING
 * (`es-forbidden-calque`, `pt-forbidden-calque`, `decimal-separator`, `thousands-separator`,
 * `unit-spacing`), so "zero errors" remains a real bar here rather than a lowered one.
 */
import { describe, it, expect } from 'vitest';

import { renderDescription } from '../src/render/render-description';
import { getRenderRules, renderContextFor } from '../src/prompt-core/store-render-rules';
import { STORE_REGISTRY } from '../src/prompt-core/constants';
import { ProductDescriptionDocSchema } from '../src/domain/description-doc.schema';
import type { ProductDescriptionDoc } from '../src/domain/description-doc';
import { validateGeneratedHtml } from '../src/utils/output-validator';

/**
 * Locale-neutral fixture: brand names, model numbers and metric units, which read the same in every
 * target language and cannot trip a calque check. Units carry the mandated space ("165 mm", not
 * "165mm") so `unit-spacing` stays quiet for the right reason.
 *
 * Shaped after fullDoc() in src/render/render-description.spec.ts — 3 figures, a video, a nested
 * <h3>, and both conditional sections — so the matrix exercises every branch the renderer has.
 */
function conformanceDoc(locale: string, admitsOperatingTips: boolean): ProductDescriptionDoc {
  const section = (heading: string, ref?: number): ProductDescriptionDoc['functionality'][number] => ({
    heading,
    blocks: [
      { kind: 'paragraph', text: 'Formlabs Fuse 1 operates at 165 mm build height.' },
      ...(ref === undefined ? [] : [{ kind: 'figure' as const, ref }]),
    ],
  });

  const doc: ProductDescriptionDoc = {
    schemaVersion: '3.0',
    locale,
    localizedName: 'Formlabs Fuse 1',
    hook: 'Formlabs Fuse 1 — SLS 3D printer with a 165 × 165 × 300 mm build volume.',
    killerSpecs: [
      { label: 'Build volume', value: '165 × 165 × 300 mm', why: 'Fits a full nesting batch.' },
      { label: 'Layer height', value: '0.11 mm', why: 'Holds fine detail across the bed.' },
      { label: 'Laser power', value: '10 W', why: 'Sinters PA 12 at rated speed.' },
    ],
    keyBenefits: [
      {
        kind: 'bullets',
        items: [
          { lead: 'Nesting. ', text: 'Uses the full 165 mm height.' },
          { lead: 'Powder reuse. ', text: 'Recovers up to 70 % of unsintered PA 12.' },
          { lead: 'Fuse Sift. ', text: 'Handles depowdering in one station.' },
        ],
      },
    ],
    functionality: [
      {
        ...section('Fuse 1 print process', 0),
        subsections: [{ heading: 'PA 12 powder', blocks: [{ kind: 'paragraph', text: 'Rated at 1.01 g/cm³.' }] }],
      },
      { ...section('Fuse Sift workflow', 1), blocks: [...section('x', 1).blocks, { kind: 'video', ref: 0 }] },
    ],
    applications: {
      heading: 'Applications',
      blocks: [{ kind: 'paragraph', text: 'Formlabs Fuse 1 covers short-run production.' }],
      items: [
        { scenario: 'Jigs. ', text: 'PA 12 parts survive shop-floor handling.' },
        { scenario: 'Ducting. ', text: 'Complex internal channels print unsupported.' },
        { scenario: 'Prototypes. ', text: 'Functional parts in 24 h.' },
        { scenario: 'Spares. ', text: 'On-demand replacements at 0.11 mm layers.' },
      ],
    },
    packageContents: { heading: 'In the box', items: ['Formlabs Fuse 1', 'Fuse Sift', 'PA 12 cartridge'] },
    specs: {
      heading: 'Technical specifications of Formlabs Fuse 1',
      categories: [
        {
          title: 'Print engine',
          rows: [
            { label: 'Technology', value: 'SLS' },
            { label: 'Laser', value: '10 W' },
          ],
        },
        { title: 'Materials', rows: [{ label: 'Supported', value: ['PA 12', 'PA 11', 'PA 12 GB'] }] },
      ],
    },
    cta: { heading: 'Why buy Formlabs Fuse 1', text: 'Official warranty and service on every unit.' },
    figures: [
      { file: 'fuse1-printer.jpg', alt: 'Formlabs Fuse 1 printer', caption: '<b>Fuse 1. </b>SLS printer.' },
      { file: 'fuse-sift.jpg', alt: 'Fuse Sift station', caption: '<b>Fuse Sift. </b>Depowdering station.' },
      { file: 'pa12-parts.jpg', alt: 'PA 12 printed parts', caption: '<b>PA 12. </b>Finished parts.' },
    ],
    videos: [
      {
        src: 'https://www.youtube.com/embed/abc123',
        title: 'Formlabs Fuse 1 overview',
        caption: '<b>Overview. </b>Fuse 1 in operation.',
      },
    ],
  };

  // The third figure lives in §5 for most stores and in §5b for Center 3D Print, which is the one
  // store whose Style B voice has an operating-tips block. Branching here is the point: it is the
  // per-store rule the matrix exists to prove, and both sections render in the same slot, so the
  // output differs only by the heading — exactly what `admitsOperatingTips` claims.
  const fifth = { heading: 'Compatibility', blocks: [{ kind: 'figure' as const, ref: 2 }] };
  if (admitsOperatingTips) doc.operatingTips = fifth;
  else doc.compatibility = fifth;

  return doc;
}

/** Every store × every locale it publishes, enumerated FROM the registry. */
const CASES = Object.entries(STORE_REGISTRY).flatMap(([storeName, profile]) =>
  profile.languages.map(locale => ({ storeName, locale })),
);

/**
 * `Expert-3DPrinter` ships `imageBaseUrl: ''`, so renderContextFor() refuses it — see that
 * function for why relative <img src> is worse than a loud failure. Separated rather than skipped:
 * the gap is asserted below, so filling in the URL turns those cases live automatically and a
 * SECOND store developing the same hole fails the count check.
 */
const RENDERABLE = CASES.filter(c => getRenderRules(c.storeName).imageBaseUrl);
const UNRENDERABLE = CASES.filter(c => !getRenderRules(c.storeName).imageBaseUrl);

describe('conformance matrix — coverage', () => {
  /**
   * Not decoration. A matrix that silently enumerated zero cases would report green and prove
   * nothing — the same vacuous pass render-reconciliation.spec.ts guards against with its pending
   * ledger. Assert the shape of the enumeration, so adding a store to the registry cannot quietly
   * go uncovered.
   */
  it('enumerates every store in the registry', () => {
    expect(Object.keys(STORE_REGISTRY)).toHaveLength(8);
    expect(new Set(CASES.map(c => c.storeName)).size).toBe(8);
  });

  it('enumerates one case per store × published locale', () => {
    const expected = Object.values(STORE_REGISTRY).reduce((n, p) => n + p.languages.length, 0);
    expect(CASES).toHaveLength(expected);
    expect(CASES).toHaveLength(27);
  });

  it('records exactly one store blocked by a missing image base URL', () => {
    expect([...new Set(UNRENDERABLE.map(c => c.storeName))]).toEqual(['Expert-3DPrinter']);
    expect(RENDERABLE).toHaveLength(24);
  });
});

describe.each(RENDERABLE)('conformance — $storeName / $locale', ({ storeName, locale }) => {
  const rules = getRenderRules(storeName);
  const doc = conformanceDoc(locale, rules.admitsOperatingTips);
  const html = renderDescription(doc, renderContextFor(storeName, 'formlabs', 'fuse-1'));

  it('the fixture is a valid document', () => {
    const result = ProductDescriptionDocSchema.safeParse(doc);
    expect(result.success, JSON.stringify(result.error?.issues, null, 2)).toBe(true);
  });

  it('produces zero validator errors', () => {
    const errors = validateGeneratedHtml(html, `conformance (${storeName}/${locale})`, doc.localizedName, locale, {
      imageManifest: doc.figures.map(f => ({ urlFilename: f.file })),
    }).filter(i => i.severity === 'error');
    expect(errors, JSON.stringify(errors, null, 2)).toHaveLength(0);
  });

  /** CLAUDE.md: the CMS already emits Product via JSON-LD; a duplicate is a critical GSC error. */
  it('never puts schema.org/Product in the body', () => {
    expect(html).not.toContain('schema.org/Product');
  });

  /** Report §2.1: production emits ONE section — the specs one — and one <hr> right after it. */
  it('emits exactly one <section class="specs"> followed by the single <hr>', () => {
    expect(html.match(/<section\b/g) ?? []).toHaveLength(1);
    expect(html).toContain('<section class="specs">');
    expect(html.match(/<hr>/g) ?? []).toHaveLength(1);
    expect(html).toContain('</section>\n<hr>');
  });

  it('uses the header pair this store and locale resolve to', () => {
    const [param, benefit] = rules.killerSpecsHeaders(locale)!;
    expect(html).toContain(`<thead><tr><th>${param}</th><th>${benefit}</th></tr></thead>`);
  });

  it('builds every image src from this store’s registry image base', () => {
    const srcs = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(m => m[1]);
    expect(srcs).toHaveLength(3);
    expect(srcs.every(s => s.startsWith(STORE_REGISTRY[storeName].imageBaseUrl))).toBe(true);
  });

  /** CLAUDE.md: first image eager (it is the LCP element), every later one lazy, all async. */
  it('keeps the first image eager and every later one lazy', () => {
    const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map(m => m[0]);
    expect(imgs[0]).not.toContain('loading="lazy"');
    expect(imgs.slice(1).every(i => i.includes('loading="lazy"'))).toBe(true);
    expect(imgs.every(i => i.includes('decoding="async"'))).toBe(true);
  });

  it('gives every figure a figcaption and never nests one inside a <p>', () => {
    expect(html.match(/<figure\b/g) ?? []).toHaveLength(4); // 3 images + 1 video
    expect(html.match(/<figcaption\b/g) ?? []).toHaveLength(4);
    // A <figure> reached WITHOUT passing a </p> first — i.e. genuinely inside the paragraph.
    // `/<p>[^]*?<figure/` looks equivalent and is not: `[^]` spans newlines, so it matches any <p>
    // anywhere followed by any <figure> later in the document, which is every valid artifact.
    expect(html).not.toMatch(/<p>(?:(?!<\/p>)[^])*?<figure/);
  });

  /** CLAUDE.md: losing a source video embed is a bug, not a stylistic choice. */
  it('carries the video embed through to the output', () => {
    expect(html).toContain('<iframe src="https://www.youtube.com/embed/abc123?rel=0"');
    expect(html).toContain('title="Formlabs Fuse 1 overview"');
  });

  /** §5b is Center 3D Print only — every other store renders the same block as §5 compatibility. */
  it('places the conditional section in the slot this store’s rules select', () => {
    // Same heading and the same slot either way — §5b renders where §5 does. What differs is WHICH
    // field the document had to use, and only Center 3D Print may use operatingTips.
    expect(html).toContain('<h2>Compatibility</h2>');
    expect(rules.admitsOperatingTips).toBe(storeName === 'Center 3D Print');
    expect(doc.operatingTips === undefined).toBe(!rules.admitsOperatingTips);
    expect(doc.compatibility === undefined).toBe(rules.admitsOperatingTips);
  });
});

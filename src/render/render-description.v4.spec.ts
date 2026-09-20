/**
 * render-description.v4.spec.ts — US-2.1 validation categories V3 and V15.
 *
 * WHY A SECOND SPEC FILE BESIDE `render-description.spec.ts`. That file's `fullDoc()` is a `'3.0'`
 * document and every assertion in it describes the `'3.0'` render, which D8 keeps verbatim. Adding
 * a `'4.0'` branch to it would mean either parameterising a fixture whose whole value is being the
 * accepted legacy shape, or writing v4 assertions next to v3 ones against the same name. Neither is
 * worth it: the existing file stays untouched and green, and is the reference this one is measured
 * against.
 *
 * THE TWO CATEGORIES:
 *
 *   V3  §2 composition. A `'4.0'` document renders one `<h2>` and one `<ul>` and nothing else
 *       between them; a `'3.0'` document renders the §2a table, byte-unchanged.
 *   V15 §6's list element. `'4.0'` → `<ol>`, `'3.0'` → `<ul>`, with the heading and every `<li>`
 *       identical on both paths.
 *
 * 🔵 V15's `'3.0'` HALF IS GREEN ON ARRIVAL AND MUST STAY THAT WAY. It is the only evidence that
 * D17 changed no cached behaviour, and it is only evidence while it has run against the UNMODIFIED
 * renderer — which is now, and at T1. Weakening or re-authoring it at T13 to fit the new branch
 * would erase exactly that, which is an AGENTS.md §7.7 move rather than a fix. See T13, check 2.
 *
 * WHAT IS DELIBERATELY NOT HERE. The assertion that §2's `<h2>` is the CODE-RESIDENT string for the
 * document's locale lives in `src/prompt-core/v4-headings.spec.ts`, with the table it is sourced
 * from. Importing a not-yet-existing named export here would fail this whole module at load time
 * and take V15's green `'3.0'` baseline down with it.
 */
import { describe, it, expect } from 'vitest';

import { renderDescription, type RenderContext } from './render-description';
import {
  asSchemaVersion4,
  v3BaseDoc,
  v3WithCompatibilityAndPackageContents,
  v4ValidDoc,
} from '../../test/fixtures/v4-docs';
import type { ProductDescriptionDoc } from '../domain/description-doc';

const CTX: RenderContext = {
  imageBaseUrl: 'https://impresora-3d.es/image/catalog/products/',
  brandFolder: 'ortur',
  modelFolder: 'h20-20w',
  storeName: 'EXPERT3D',
};

const render = (doc: ProductDescriptionDoc) => renderDescription(doc, CTX);

/**
 * The §2 block, as its own string.
 *
 * `renderDescription` joins its top-level parts with a blank line (`parts.join('\n\n')`), and §1 is
 * a single `<p>` with no newline in it, so index 1 is §2 whichever version rendered it. Slicing
 * rather than searching the whole document matters here: §7 legitimately contains `<table>` under
 * v4, so a global "no table" assertion would be wrong for the right-looking reason.
 */
function sectionTwo(html: string): string {
  return html.split('\n\n')[1];
}

/** The §6 block — the `<h2>` carrying the given heading, and the list that follows it. */
function packageContentsBlock(html: string, heading: string): string {
  const start = html.indexOf(`<h2>${heading}</h2>`);
  expect(start, `no §6 <h2> reading "${heading}" in the rendered document`).toBeGreaterThan(-1);
  const rest = html.slice(start);
  const end = rest.indexOf('\n\n');
  return end === -1 ? rest : rest.slice(0, end);
}

const countOf = (html: string, re: RegExp) => (html.match(re) ?? []).length;

// ── V3 — the §2 version branch ───────────────────────────────────────────────────────────────────

describe('V3 — FR-4: a `4.0` document renders §2 as one <h2> over one <ul>', () => {
  it('emits exactly one <h2> and exactly one <ul>, and no <table> between them', () => {
    const block = sectionTwo(render(v4ValidDoc()));
    expect(countOf(block, /<h2\b/g)).toBe(1);
    expect(countOf(block, /<ul\b/g)).toBe(1);
    expect(countOf(block, /<table\b/g)).toBe(0);
  });

  /**
   * FR-4's composition clause in full: between the §2 heading and the end of its list there is no
   * paragraph, no figure, no video embed and no second list. Asserted as the absence of each
   * element rather than as "the block looks right", because each one is a separately reachable
   * defect — `keyBenefits` admits all four Block kinds on the `'3.0'` path.
   */
  it('puts nothing between the <h2> and the </ul> — no <p>, <figure>, <iframe> or second list', () => {
    const block = sectionTwo(render(v4ValidDoc()));
    expect(block).toMatch(/^<h2\b/);
    expect(block.trimEnd()).toMatch(/<\/ul>$/);
    expect(countOf(block, /<p\b/g)).toBe(0);
    expect(countOf(block, /<figure\b/g)).toBe(0);
    expect(countOf(block, /<iframe\b/g)).toBe(0);
    expect(countOf(block, /<ol\b/g)).toBe(0);
  });

  /**
   * FR-17's ceiling, observed where it actually matters — on the RENDERED list. The schema check
   * (V2) counts fields; this counts `<li>` elements, which is what AC-3 is written about.
   */
  it('renders the killerSpecs first, then the keyBenefits items, in one list of at most 8', () => {
    const doc = v4ValidDoc();
    const block = sectionTwo(render(doc));
    const items = [...block.matchAll(/<li>([^]*?)<\/li>/g)].map(m => m[1]);

    expect(items.length).toBeLessThanOrEqual(8);
    expect(items).toHaveLength(6);
    expect(items[0]).toContain(doc.killerSpecs[0].label);
    expect(items[2]).toContain(doc.killerSpecs[2].label);
    expect(items[3]).toContain('Перевага 1:');
  });

  /**
   * FR-3's item form. The em dash is a LITERAL U+2014 with a space on each side, outside the
   * `<b>` — `esc()` replaces only `& < > "`, so a test expecting `&mdash;` would be asserting the
   * wrong thing. The lead is `{label}: {value}` carried verbatim from the `'3.0'` cell, so the same
   * content reads the same way across a version change.
   */
  it('renders each killer spec as <b>{label}: {value}</b> — {why} with a literal em dash', () => {
    const doc = v4ValidDoc();
    const block = sectionTwo(render(doc));
    const [first] = doc.killerSpecs;

    expect(block).toContain(`<li><b>${first.label}: ${first.value}</b> — ${first.why}</li>`);
    expect(block).not.toContain('&mdash;');
  });

  /**
   * `bold-label-glue` (`output-validator.ts:333-341`) needs BOTH a `.` or `:` immediately before
   * `</b>` AND a letter immediately after it. The space the renderer supplies forbids the second
   * outright, which is what keeps the merged item form clear of that rule.
   */
  it('never lets a killer-spec item glue its bold lead to the following letter', () => {
    const block = sectionTwo(render(v4ValidDoc()));
    // Guard against a vacuous pass: on the `'3.0'` table there is no `<b>` in §2 at all, so the
    // negative below would hold for the wrong reason. The items have to exist first.
    expect(countOf(block, /<li\b/g)).toBeGreaterThan(0);
    expect(block).not.toMatch(/<\/b>\p{L}/u);
  });

  /** D8 / leak L6: the `'3.0'` arm is the §2a table, unchanged. */
  it('leaves a `3.0` document rendering the §2a table exactly as before', () => {
    const block = sectionTwo(render(v3BaseDoc()));
    expect(block).toContain('<div class="table-responsive"><table>');
    expect(block).toContain('<thead><tr><th>');
    expect(countOf(block, /<ul\b/g)).toBe(0);
  });

  /** FR-25 — markup discipline survives the new §2: still one `<section>` and one `<hr>`, no `<br>`. */
  it('keeps §7 the only <section> and the only <hr>, and emits no <br>', () => {
    const html = render(v4ValidDoc());
    expect(countOf(html, /<section\b/g)).toBe(1);
    expect(countOf(html, /<hr\b/g)).toBe(1);
    expect(countOf(html, /<br\b/g)).toBe(0);
    expect(html).toContain('</section>\n<hr>');
  });

  /** FR-12 — no `<h1>` anywhere in the body, on either path. */
  it.each([
    ['4.0', () => v4ValidDoc()],
    ['3.0', () => v3BaseDoc()],
  ])('emits no <h1> in a %s document', (_v, build) => {
    expect(render(build())).not.toMatch(/<h1\b/);
  });

  /**
   * FR-18 / FR-19 — the render half of V12. A hook past v4's 40–85 range renders unchanged; no
   * length rule exists anywhere on this path either.
   */
  it('FR-18 — renders an over-long §1 hook unchanged rather than truncating it', () => {
    const doc = v4ValidDoc();
    doc.hook = `<b>Ortur H20 20 W</b> — ${'слово '.repeat(90)}кінець.`;
    const html = render(doc);
    expect(html).toContain('кінець.');
    expect(html.split('\n\n')[0]).toContain('слово слово');
  });
});

// ── V15 — the §6 list element, both versions ─────────────────────────────────────────────────────

describe('V15 — FR-6 / D17: §6 is an <ol> for `4.0` and stays a <ul> for `3.0`', () => {
  /**
   * 🔵 CHARACTERIZATION — GREEN AGAINST THE UNMODIFIED RENDERER, AND THAT IS ITS WHOLE VALUE.
   * `render-description.ts:336-339` emits `<h2>` + `<ul>` unconditionally today. Neither committed
   * corpus item carries `packageContents`, so `render-reconciliation.spec.ts` is byte-for-byte
   * green under either choice of element and is blind here — this assertion is the only record that
   * `<ul>` is what already-shipped `'3.0'` artifacts carry.
   */
  it('`3.0` — renders the package-contents list as a <ul>', () => {
    const doc = v3WithCompatibilityAndPackageContents();
    const block = packageContentsBlock(render(doc), doc.packageContents!.heading);

    expect(block).toContain('<ul>');
    expect(block).toContain('</ul>');
    expect(block).not.toContain('<ol>');
  });

  it('`4.0` — renders the package-contents list as an <ol>', () => {
    const doc = v4ValidDoc();
    const block = packageContentsBlock(render(doc), doc.packageContents!.heading);

    expect(block).toContain('<ol>');
    expect(block).toContain('</ol>');
    expect(block).not.toContain('<ul>');
  });

  /**
   * The branch changes the CONTAINER and nothing else. Asserted by rendering the same document
   * under both versions and comparing the two §6 blocks with the list tags normalised away: any
   * difference left is a change D17 did not authorise.
   */
  it('changes only the list container — the heading and every <li> are identical on both paths', () => {
    const v3 = v3WithCompatibilityAndPackageContents();
    const v4 = asSchemaVersion4(v3WithCompatibilityAndPackageContents());
    const heading = v3.packageContents!.heading;

    const v4Block = packageContentsBlock(render(v4), heading);
    const v3Block = packageContentsBlock(render(v3), heading);

    // The container really did change — without this the normalised comparison below passes
    // vacuously while both paths still emit a `<ul>`.
    expect(v4Block).not.toBe(v3Block);

    const normalise = (s: string) => s.replace(/<\/?[ou]l>/g, '<list>');
    expect(normalise(v4Block)).toBe(normalise(v3Block));
  });

  /**
   * D17's cost statement, asserted rather than assumed: a tag change is not a new collection, so
   * §6 is still not a `<section>` and the single `<hr>` is still §7's.
   */
  it('leaves the <section> and <hr> counts untouched on both paths', () => {
    for (const doc of [v3WithCompatibilityAndPackageContents(), v4ValidDoc()]) {
      const html = render(doc);
      expect(countOf(html, /<section\b/g)).toBe(1);
      expect(countOf(html, /<hr\b/g)).toBe(1);
    }
  });
});

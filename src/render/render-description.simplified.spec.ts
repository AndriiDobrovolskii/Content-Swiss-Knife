/**
 * US-2.2 T3 — FR-18: the standard renderer renders a document with omitted or null paragraphs
 * without throwing, and emits no markup, heading or placeholder for them. Full-description
 * rendering is unchanged (also pinned by test/render-reconciliation.spec.ts).
 *
 * Exhaustive over the six optional paragraph groups (2^6 = 64 combinations), each both omitted and
 * null, because the failure mode is `undefined.map` on ONE specific combination.
 */
import { describe, it, expect } from 'vitest';
import { renderDescription, type RenderContext } from './render-description';
import { v4ValidDoc } from '../../test/fixtures/v4-docs';
import { without, nulled, sparePartsDoc, filamentsDoc, accessoriesDoc, lazy } from '../../test/fixtures/simplified-docs';
import type { ProductDescriptionDoc } from '../domain/description-doc';

const CTX: RenderContext = {
  imageBaseUrl: 'https://impresora-3d.es/image/catalog/products/',
  brandFolder: 'esun',
  modelFolder: 'pla-plus',
  storeName: 'EXPERT3D',
};

/** paragraph group -> document keys -> a string that appears in the FULL render only because that group is present */
const GROUPS: Array<{ keys: string[]; marker: string }> = [
  { keys: ['killerSpecs', 'keyBenefits'], marker: 'Ключові переваги' },      // §2 heading text is code-resident per locale; asserted below by structure
  { keys: ['functionality'], marker: 'Як працює лазерний модуль' },
  { keys: ['applications'], marker: 'Сфери застосування' },
  { keys: ['compatibility'], marker: 'Сумісність' },
  { keys: ['packageContents'], marker: 'Що в коробці?' },
  { keys: ['specs'], marker: 'Технічні характеристики Ortur H20 20 W' },
];

const NO_PLACEHOLDER = /undefined|\bnull\b|NaN|\[object|<h2>\s*<\/h2>|<ul>\s*<\/ul>|<ol>\s*<\/ol>|<p>\s*<\/p>|<table>\s*<\/table>/;

describe('FR-18 — every combination of absent paragraphs renders without throwing or stray markup', () => {
  const FULL_HTML = renderDescription(v4ValidDoc(), CTX);

  // Sanity: the markers really are present in the full render, so their absence below means something.
  for (const g of GROUPS.slice(1)) {
    it(`fixture check: the full render contains the ${g.keys[0]} marker`, () => {
      expect(FULL_HTML).toContain(g.marker);
    });
  }

  for (const mode of ['omitted', 'null'] as const) {
    it(`all 64 combinations (${mode}) render, keep §1 and §8, and leave no placeholder`, () => {
      for (let mask = 0; mask < 1 << GROUPS.length; mask++) {
        const drop = GROUPS.filter((_, i) => mask & (1 << i));
        const keys = drop.flatMap(g => g.keys);
        const doc: ProductDescriptionDoc = (mode === 'omitted' ? without : nulled)(v4ValidDoc(), ...keys);
        let html = '';
        expect(() => { html = renderDescription(doc, CTX); }, `mask ${mask.toString(2)} (${keys.join(',')})`).not.toThrow();

        expect(html, `mask ${mask}`).toMatch(/^<p>/);                       // §1 hook
        expect(html, `mask ${mask}`).toContain('<p class="cta">');         // §8 CTA
        expect(html, `mask ${mask}`).not.toMatch(NO_PLACEHOLDER);
        for (const g of drop.filter(x => x.keys[0] !== 'killerSpecs')) {
          expect(html, `mask ${mask}: ${g.keys[0]} leaked`).not.toContain(g.marker);
        }
        if (keys.includes('specs')) {
          expect(html, `mask ${mask}`).not.toContain('<table');
          expect(html, `mask ${mask}`).not.toContain('<section');
          expect(html, `mask ${mask}`).not.toContain('<hr>');
        }
        if (keys.includes('killerSpecs')) {
          // §2 is one <h2> over one <ul>; with both fields absent neither may appear.
          expect(html.match(/<li><b>Потужність лазера/g)).toBeNull();
        }
      }
    });
  }

  it('the three simplified shapes render', () => {
    for (const d of [filamentsDoc(), accessoriesDoc({ withFunctionality: true }), sparePartsDoc()]) {
      expect(() => renderDescription(d, CTX)).not.toThrow();
    }
  });
});

describe('FR-18 — §1 + §8 only (Spare parts without §5)', () => {
  const html = lazy(() => renderDescription(sparePartsDoc({ compat_present: false }), CTX));
  it('renders exactly the hook paragraph and the CTA heading + paragraph, nothing else', () => {
    const body = new DOMParser().parseFromString(html(), 'text/html').body;
    const tags = [...body.children].map(e => e.tagName.toLowerCase());
    expect(tags).toEqual(['p', 'h2', 'p']);
    expect(body.children[0].innerHTML.startsWith('<b>eSUN PLA+</b> —')).toBe(true);
    expect(body.children[2].getAttribute('class')).toBe('cta');
  });
  it('the CTA heading is the localized "Чому … в …?" form with the product and store (AC-10)', () => {
    const h2 = new DOMParser().parseFromString(html(), 'text/html').querySelector('h2')!.textContent!;
    expect(h2).toMatch(/^Чому .*eSUN PLA\+.*EXPERT3D\?$/);
  });
  it('contains no <h1>', () => {
    expect(html()).not.toMatch(/<h1[\s>]/);
  });
});

describe('FR-18 — Spare parts with §5 renders §1, the §5 group and §8 only', () => {
  it('has one <h2> for §5 plus the CTA <h2>', () => {
    const doc = new DOMParser().parseFromString(renderDescription(sparePartsDoc(), CTX), 'text/html');
    expect([...doc.querySelectorAll('h2')].map(h => h.textContent).length).toBe(2);
    expect(doc.querySelector('h2')!.textContent).toBe('Сумісність');
  });
});

describe('FR-18 — Full description is unchanged', () => {
  it('a document with every paragraph renders the same with or without the new options', () => {
    const doc = v4ValidDoc();
    expect(renderDescription(doc, CTX)).toBe(renderDescription(doc, CTX, undefined));
  });
});

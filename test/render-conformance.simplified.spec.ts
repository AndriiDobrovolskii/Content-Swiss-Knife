/**
 * render-conformance.simplified.spec.ts — US-2.2 T15 (FR-21..FR-25, AC-7, AC-10, AC-11).
 *
 * The AGENTS.md §4 criteria that must stay true for every simplified template wherever their subject
 * is present, checked on every RENDERABLE store x locale pair of STORE_REGISTRY (the same matrix
 * render-conformance.v4.spec.ts uses). Rules-based only: no accepted simplified artifact exists to
 * reconcile against (plan R8, recorded as a coverage gap), so this matrix is the cross-store gate.
 *
 * Expert-3DPrinter has no image base URL and is on the legacy HTML path (D14/OD-1); its shape checks
 * live in output-validator.simplified.spec.ts and content-orchestrator.simplified.spec.ts.
 */
import { describe, it, expect } from 'vitest';
import { renderDescription } from '../src/render/render-description';
import { getRenderRules, renderContextFor } from '../src/prompt-core/store-render-rules';
import { STORE_REGISTRY } from '../src/prompt-core/constants';
import { ProductDescriptionDocSchema } from '../src/domain/description-doc.schema';
import { validateTemplateCompleteness } from '../src/domain/description-doc.completeness';
import { validateGeneratedHtml } from '../src/utils/output-validator';
import { conformanceSimplifiedDoc, lazy } from './fixtures/simplified-docs';

const RENDERABLE = Object.entries(STORE_REGISTRY)
  .filter(([store]) => getRenderRules(store).imageBaseUrl)
  .flatMap(([storeName, profile]) => profile.languages.map(locale => ({ storeName, locale })));

const TEMPLATES = ['filaments-resins-powders', 'accessories', 'spare-parts'] as const;
const NAME = 'eSUN PLA+';
const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;
const dom = (html: string) => new DOMParser().parseFromString(html, 'text/html');

describe('the matrix covers the whole renderable registry', () => {
  it('20 store-locale pairs (guards against an empty matrix)', () => {
    expect(RENDERABLE).toHaveLength(20);
  });
});

describe.each(TEMPLATES.flatMap(t => RENDERABLE.map(c => ({ template: t, ...c }))))(
  'conformance — $template — $storeName / $locale', ({ template, storeName, locale }) => {
    const doc = conformanceSimplifiedDoc(template, locale, { includeFunctionality: template === 'accessories' });
    const ctx = renderContextFor(storeName, 'esun', 'pla-plus');
    const htmlL = lazy(() => renderDescription(doc, ctx, { flatSpecs: true }));
    const hasSpecs = template !== 'spare-parts';

    it('the fixture is a valid v4 document and complete for its template', () => {
      const html = htmlL();
      const parsed = ProductDescriptionDocSchema.safeParse(doc);
      expect(parsed.success, JSON.stringify(parsed.success ? [] : parsed.error.issues)).toBe(true);
      expect(validateTemplateCompleteness(doc, template, { includeFunctionality: template === 'accessories', hasSpecs })).toEqual([]);
    });

    it('produces zero validator errors through the frozen entry point', () => {
      const html = htmlL();
      const errors = validateGeneratedHtml(html, `simplified conformance (${storeName}/${locale})`, NAME, locale, { templateId: template })
        .filter(i => i.severity === 'error');
      expect(errors, JSON.stringify(errors, null, 2)).toHaveLength(0);
    });

    // AC-10 / FR-12 — shared v4 rules for the paragraphs that are present.
    it('AC-10: the hook is a single <p> opening with <b>{name}</b> —, and the body has no <h1>', () => {
      const html = htmlL();
      expect(html.startsWith(`<p><b>${NAME}</b> — `)).toBe(true);
      expect(count(html, /<h1\b/g)).toBe(0);
    });

    it('AC-10: the CTA is a <p> under the localized "Чому варто купити … в …?" heading for this store and locale', () => {
      const html = htmlL();
      const heading = getRenderRules(storeName).ctaHeading(locale, NAME);
      const d = dom(html);
      const h2s = [...d.querySelectorAll('h2')];
      const cta = h2s[h2s.length - 1];
      expect(cta.textContent).toBe(heading);
      expect(cta.nextElementSibling?.tagName).toBe('P');
    });

    // FR-25 — HTML only, forbidden itemtype, no <br>.
    it('FR-25: no schema.org/Product itemtype, no <br>, no Markdown', () => {
      const html = htmlL();
      expect(html).not.toMatch(/itemtype="https:\/\/schema\.org\/Product"/);
      expect(html).not.toMatch(/<br\b/);
      expect(html).not.toMatch(/\*\*|^#{1,6} /m);
    });

    if (hasSpecs) {
      // AC-7 / FR-8 / FR-21
      it('AC-7: one <section class="specs"> with ONE <tbody>, no <h3>, followed by the single <hr>', () => {
        const html = htmlL();
        expect(count(html, /<section class="specs">/g)).toBe(1);
        expect(count(html, /<tbody>/g)).toBe(1);
        expect(count(html, /<h3\b/g)).toBe(0);
        expect(html).toMatch(/<\/section>\s*<hr>/);
        expect(count(html, /<hr>/g)).toBe(1);
        expect(html).toContain('<div class="table-responsive">');
        expect(dom(html).querySelector('section.specs table')?.getAttribute('class')).toBe('table table-bordered table-striped');
      });

      it('FR-21: spec row count equals the input count (3) and units keep their space', () => {
        const html = htmlL();
        expect(dom(html).querySelectorAll('section.specs tbody tr')).toHaveLength(3);
        expect(html).toContain('175 mm');
        expect(html).toContain('200 °C');
        expect(html).not.toMatch(/\d(mm|kg|°C)\b/);
      });
    } else {
      it('FR-11: with no §7 the description carries no table, no <section> and no <hr>', () => {
        const html = htmlL();
        expect(html).not.toContain('<table');
        expect(html).not.toContain('<section');
        expect(html).not.toContain('<hr>');
      });
    }

    if (template === 'accessories') {
      it('AC-9: with the checkbox checked the §3 group is rendered; §4 and §6 never are', () => {
        const html = htmlL();
        expect(html).toContain('How the accessory works');
        expect(html).not.toContain('Applications');
        expect(html).not.toMatch(/<ol>/);
      });
    }
  },
);

/**
 * product-name-preservation.spec.ts — US-7.1 T3 (FR-5 parts 1 and 2, FR-7 optimizer check; AC-1, AC-2,
 * AC-3, AC-5, AC-7, AC-8 "issue raised" half).
 *
 * `product-name-preservation.ts` does not exist yet: red at import time until so-builder creates it
 * (T3). The plan (D2) names the three exported functions and their surfaces but not their argument
 * lists, so TEST_WRITING fixes them here (docs/tests/US-7.1-test-strategy.md, "Signatures fixed here"):
 *
 *   checkNameSurfaces(typedName, { slugs?: SlugResponse | null, seo?: SeoResponse | null }): ValidationIssue[]
 *   checkDescriptionHtml(typedName, html, context): ValidationIssue[]
 *   checkOptimizerText(typedName, html): ValidationIssue[]
 *
 * Issue contract (FR-5 "Failure path"): severity 'error'; rule 'product-name-token-missing' (part 1)
 * or 'product-name-shortened-form' (part 2); `path` addresses the offending value in the same grammar
 * the existing validators use (`slugs[i].name`, `slugs[i].slug`, `seo_data[i].h1|meta_title|
 * meta_description`); `context` names the surface and the locale; `detail` names the missing token
 * (part 1) or the offending shortened form (part 2).
 *
 * CLOSED SURFACE LIST (FR-5): part 1 applies to Slugs `name`/`slug` and SEO `h1`/`meta_title` only;
 * part 2 scans SEO `h1`/`meta_title`/`meta_description`, description HTML and Optimizer text only. A
 * generic or empty typed name is never checked. Every expectation is derived from FR-5, not from a run.
 */
import { describe, it, expect } from 'vitest';
import {
  checkNameSurfaces, checkDescriptionHtml, checkOptimizerText,
} from './product-name-preservation';
import type { SlugResponse, SeoResponse } from '../app/types';
import type { ValidationIssue } from './output-validator';

const A = 'Formlabs Form Studio 1 Resin Tank Pro';       // Fixture A
const B = 'Bambu Lab PLA Basic Filament 1.75 mm';          // Fixture B (brand + decimal + unit, no designator)
const C = 'Hardened Steel Nozzle 0.4 mm';                  // Fixture C (generic)

const PART1 = 'product-name-token-missing';
const PART2 = 'product-name-shortened-form';

const slugs = (...items: { language: string; name: string; slug: string }[]): SlugResponse =>
  ({ site_name: 'EXPERT3D', slugs: items });
const seo = (...items: { language: string; h1: string; meta_title: string; meta_description: string }[]): SeoResponse =>
  ({ site_name: 'EXPERT3D', seo_data: items });

const rules = (issues: ValidationIssue[]) => issues.map(i => i.rule);
const details = (issues: ValidationIssue[]) => issues.map(i => i.detail).join(' | ');

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Part 1 — Slugs `name` / `slug` (AC-1, AC-7)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('checkNameSurfaces — Slugs mode, part 1 token presence (FR-3, FR-5, AC-1, AC-7)', () => {
  it('accepts names that carry the whole typed name, with a localized category noun around it', () => {
    const r = slugs(
      { language: 'en-ES', name: A, slug: 'formlabs-form-studio-1-resin-tank-pro' },
      { language: 'es-ES', name: `Depósito de resina ${A}`, slug: 'deposito-de-resina-formlabs-form-studio-1-resin-tank-pro' },
      { language: 'uk-UA', name: `Резервуар для смоли ${A}`, slug: 'rezervuar-dlya-smoly-formlabs-form-studio-1-resin-tank-pro' },
    );
    expect(checkNameSurfaces(A, { slugs: r })).toEqual([]);
  });

  it('the observed bug: a name that lost "Resin Tank" fails, and the violation names the missing tokens (AC-7)', () => {
    const r = slugs({
      language: 'es-ES',
      name: 'Depósito de resina Formlabs Form Studio 1 Pro',
      slug: 'deposito-resina-formlabs-form-studio-1-pro',
    });
    const issues = checkNameSurfaces(A, { slugs: r });
    const nameIssues = issues.filter(i => i.path === 'slugs[0].name');
    expect(nameIssues.length).toBeGreaterThan(0);
    for (const i of nameIssues) {
      expect(i.rule).toBe(PART1);
      expect(i.severity).toBe('error');
      expect(i.context).toContain('es-ES');
    }
    expect(details(nameIssues)).toContain('Resin');
    expect(details(nameIssues)).toContain('Tank');
  });

  it('a name missing only "Tank" is rejected and the violation names "Tank"', () => {
    const r = slugs({ language: 'en-ES', name: 'Formlabs Form Studio 1 Resin Pro', slug: 'formlabs-form-studio-1-resin-tank-pro' });
    const nameIssues = checkNameSurfaces(A, { slugs: r }).filter(i => i.path === 'slugs[0].name');
    expect(nameIssues.length).toBeGreaterThan(0);
    expect(details(nameIssues)).toContain('Tank');
  });

  it('the observed slug bug: "...-form-studio-1-pro" lacks the typed-name slug and fails (FR-10 failure path)', () => {
    const r = slugs({ language: 'pt-PT', name: `Tanque de resina ${A}`, slug: 'tanque-de-resina-formlabs-form-studio-1-pro' });
    const slugIssues = checkNameSurfaces(A, { slugs: r }).filter(i => i.path === 'slugs[0].slug');
    // Granularity is the builder's choice (one finding per slug, or one per missing slug token).
    expect(slugIssues.length).toBeGreaterThan(0);
    expect(slugIssues.every(i => i.rule === PART1 && i.severity === 'error')).toBe(true);
    expect(slugIssues.every(i => i.context.includes('pt-PT'))).toBe(true);
    expect(details(slugIssues)).toMatch(/resin/i);
  });

  it('a slug is judged by its own slugified form: containing "formlabs-form-studio-1-resin-tank-pro" anywhere passes', () => {
    const r = slugs({ language: 'es-ES', name: `Depósito de resina ${A}`, slug: 'deposito-resina-formlabs-form-studio-1-resin-tank-pro-x4' });
    expect(checkNameSurfaces(A, { slugs: r })).toEqual([]);
  });

  it('a slug trimmed inside the typed-name span ("...studio-1") fails', () => {
    const r = slugs({ language: 'en-ES', name: A, slug: 'formlabs-form-studio-1' });
    const issues = checkNameSurfaces(A, { slugs: r });
    expect(issues.map(i => i.path)).toContain('slugs[0].slug');
  });

  it('a re-ordered name fails: "Resin Tank" moved in front is not the typed order', () => {
    const r = slugs({ language: 'es-ES', name: 'Resin Tank Formlabs Form Studio 1 Pro', slug: 'formlabs-form-studio-1-resin-tank-pro' });
    expect(checkNameSurfaces(A, { slugs: r }).filter(i => i.path === 'slugs[0].name').length).toBeGreaterThan(0);
  });

  it('a translated token fails: "Resin Tank" -> "Depósito" inside the name is not the typed token', () => {
    const r = slugs({ language: 'es-ES', name: 'Formlabs Form Studio 1 Depósito Pro', slug: 'formlabs-form-studio-1-resin-tank-pro' });
    expect(checkNameSurfaces(A, { slugs: r }).filter(i => i.path === 'slugs[0].name').length).toBeGreaterThan(0);
  });

  it('reports one violating locale at a time, addressed by its own index', () => {
    const r = slugs(
      { language: 'en-ES', name: A, slug: 'formlabs-form-studio-1-resin-tank-pro' },
      { language: 'es-ES', name: 'Depósito de resina Formlabs Form Studio 1 Pro', slug: 'formlabs-form-studio-1-resin-tank-pro' },
    );
    const paths = checkNameSurfaces(A, { slugs: r }).map(i => i.path);
    expect(paths).toContain('slugs[1].name');
    expect(paths).not.toContain('slugs[0].name');
    expect(paths).not.toContain('slugs[0].slug');
  });

  it('Slugs `name` is NOT a part-2 surface: a shortened Slugs name raises part 1 only', () => {
    const r = slugs({ language: 'es-ES', name: 'Depósito de resina Formlabs Form Studio 1 Pro', slug: 'formlabs-form-studio-1-resin-tank-pro' });
    const issues = checkNameSurfaces(A, { slugs: r });
    expect(rules(issues)).not.toContain(PART2);
    expect(rules(issues)).toContain(PART1);
  });
});

describe('checkNameSurfaces — the legacy designator rule and FR-5 coexist (OD-6, OD-9 inventory)', () => {
  // slug-validator.spec.ts ("accepts localized names that keep the invariant core") feeds these three
  // names to the EXISTING `slug-name-designator-lost` rule, which anchors on invariantCore and stays
  // untouched (OD-6) — that spec remains valid and is NOT rewritten. It asserts what the old rule
  // accepts, not that localizing "Standard Package" is correct. The NEW rule judges the same names by
  // the full typed name, and rejects all three. This pins both facts side by side.
  const typed = 'XGRIDS L2 Pro 32/300 Standard Package';
  const legacyAccepted = [
    'XGRIDS L2 Pro 32/300 3D Scanner Standard Package',
    '3D сканер XGRIDS L2 Pro 32/300 Стандартний комплект',
    'Skaner 3D XGRIDS L2 Pro 32/300 Zestaw Standardowy',
  ];

  it('XGRIDS L2 Pro 32/300 is a protected name (brand, letters+digits, suffix word), so all three names raise findings together', () => {
    const r = slugs(...legacyAccepted.map((name, i) => ({ language: `l${i}`, name, slug: 'xgrids-l2-pro-32-300-standard-package' })));
    expect(checkNameSurfaces(typed, { slugs: r }).length).toBeGreaterThan(0);
  });

  it.each(legacyAccepted)('rejects the legacy-accepted name "%s" (a token translated, or the typed name interrupted)', (name) => {
    const r = slugs({ language: 'l0', name, slug: 'xgrids-l2-pro-32-300-standard-package' });
    const issues = checkNameSurfaces(typed, { slugs: r }).filter(i => i.path === 'slugs[0].name');
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every(i => i.rule === PART1 && i.severity === 'error')).toBe(true);
  });

  it('accepts the name that keeps the typed name whole, with a category noun around it', () => {
    const r = slugs({ language: 'l0', name: '3D сканер XGRIDS L2 Pro 32/300 Standard Package', slug: 'xgrids-l2-pro-32-300-standard-package' });
    expect(checkNameSurfaces(typed, { slugs: r })).toEqual([]);
  });
});

describe('checkNameSurfaces — number and unit formatting inside a protected name (FR-2, FR-5 rule 3, OD-13)', () => {
  it('accepts locale-formatted numbers and units: "1,75 мм", "1,75 mm" and the attached "1.75mm"', () => {
    const r = slugs(
      { language: 'en-ES', name: B, slug: 'bambu-lab-pla-basic-filament-1.75-mm' },
      { language: 'es-ES', name: 'Filamento Bambu Lab PLA Basic Filament 1,75 mm', slug: 'filamento-bambu-lab-pla-basic-filament-1.75-mm' },
      { language: 'uk-UA', name: 'Філамент Bambu Lab PLA Basic Filament 1,75 мм', slug: 'filament-bambu-lab-pla-basic-filament-1.75-mm' },
      { language: 'pt-PT', name: 'Filamento Bambu Lab PLA Basic Filament 1.75mm', slug: 'filamento-bambu-lab-pla-basic-filament-1.75-mm' },
    );
    expect(checkNameSurfaces(B, { slugs: r })).toEqual([]);
  });

  it('a typed attached "0.4mm" matches the spaced "0.4 mm" and "0,4 мм" in the output (the §4 space is not a violation)', () => {
    const typed = 'Bambu Lab Hardened Steel Nozzle 0.4mm';
    const r = slugs(
      { language: 'en-GB', name: 'Bambu Lab Hardened Steel Nozzle 0.4 mm', slug: 'bambu-lab-hardened-steel-nozzle-0.4-mm' },
      { language: 'uk-UA', name: 'Сопло Bambu Lab Hardened Steel Nozzle 0,4 мм', slug: 'soplo-bambu-lab-hardened-steel-nozzle-0.4-mm' },
    );
    expect(checkNameSurfaces(typed, { slugs: r })).toEqual([]);
  });

  it('a dropped token inside a branded name with a decimal and a unit is named: "Basic"', () => {
    const r = slugs({ language: 'es-ES', name: 'Filamento Bambu Lab PLA Filament 1,75 mm', slug: 'filamento-bambu-lab-pla-filament-1.75-mm' });
    const nameIssues = checkNameSurfaces(B, { slugs: r }).filter(i => i.path === 'slugs[0].name');
    expect(nameIssues.length).toBeGreaterThan(0);
    expect(details(nameIssues)).toContain('Basic');
  });

  it('a changed number is a different token: "1,85 mm" is a violation', () => {
    const r = slugs({ language: 'es-ES', name: 'Filamento Bambu Lab PLA Basic Filament 1,85 mm', slug: 'filamento-bambu-lab-pla-basic-filament-1.75-mm' });
    expect(checkNameSurfaces(B, { slugs: r }).filter(i => i.path === 'slugs[0].name').length).toBeGreaterThan(0);
  });
});

describe('checkNameSurfaces — slug stopwords (OD-3: slugified form with slug stopwords removed)', () => {
  const typed = 'Formlabs Cleaning Kit for Form 4';

  it('a slug may omit the stopword "for": it is judged on the stopword-stripped typed-name slug', () => {
    const r = slugs({
      language: 'es-ES',
      name: 'Kit de limpieza Formlabs Cleaning Kit for Form 4',
      slug: 'kit-limpieza-formlabs-cleaning-kit-form-4',
    });
    expect(checkNameSurfaces(typed, { slugs: r })).toEqual([]);
  });

  it('but the NAME keeps the stopword: names are compared on the full typed token sequence', () => {
    const r = slugs({
      language: 'es-ES',
      name: 'Kit de limpieza Formlabs Cleaning Kit Form 4',
      slug: 'kit-limpieza-formlabs-cleaning-kit-form-4',
    });
    const nameIssues = checkNameSurfaces(typed, { slugs: r }).filter(i => i.path === 'slugs[0].name');
    expect(nameIssues.length).toBeGreaterThan(0);
    expect(details(nameIssues)).toContain('for');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SEO Meta — part 1 on h1 / meta_title, part 2 on h1 / meta_title / meta_description (AC-2, AC-8)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('checkNameSurfaces — SEO Meta (FR-4, FR-5, AC-2)', () => {
  const okSeo = (language: string) => ({
    language,
    h1: A,
    meta_title: `${A} - EXPERT3D`,
    meta_description: 'Todo sobre el depósito de resina Formlabs Form Studio 1 Resin Tank Pro, con envío rápido ➔',
  });

  it('accepts a compliant set: h1 and meta_title carry the whole typed name verbatim', () => {
    expect(checkNameSurfaces(A, { seo: seo(okSeo('en-ES'), okSeo('es-ES'), okSeo('uk-UA')) })).toEqual([]);
  });

  it('accepts an h1 with a localized category noun in front of the typed name', () => {
    const s = seo({ ...okSeo('es-ES'), h1: `Depósito de resina ${A}` });
    expect(checkNameSurfaces(A, { seo: s })).toEqual([]);
  });

  it('a meta_description that never mentions the name is fine (no part 1 on meta_description, OD-8)', () => {
    const s = seo({ ...okSeo('es-ES'), meta_description: 'Descubre todas las ventajas de este producto, con envío rápido ➔' });
    expect(checkNameSurfaces(A, { seo: s })).toEqual([]);
  });

  it('the observed bug in h1: the shortened h1 fails part 1 AND part 2 at seo_data[i].h1', () => {
    const s = seo({ ...okSeo('es-ES'), h1: 'Depósito de resina Formlabs Form Studio 1 Pro' });
    const h1Issues = checkNameSurfaces(A, { seo: s }).filter(i => i.path === 'seo_data[0].h1');
    expect(rules(h1Issues)).toEqual(expect.arrayContaining([PART1, PART2]));
    expect(h1Issues.every(i => i.severity === 'error')).toBe(true);
    expect(h1Issues.every(i => i.context.includes('es-ES'))).toBe(true);
    expect(details(h1Issues.filter(i => i.rule === PART1))).toContain('Resin');
    expect(details(h1Issues.filter(i => i.rule === PART2))).toContain('Form Studio 1 Pro');
  });

  it('the observed bug in meta_title: a title built on the shortened h1 fails at seo_data[i].meta_title', () => {
    // The title STARTS with the (shortened) h1, so meta-title-template-shape accepts it — the very
    // blind spot FR-8 closes. The new rule must still reject it.
    const s = seo({ ...okSeo('pt-PT'), h1: 'Tanque de resina Formlabs Form Studio 1 Pro', meta_title: 'Tanque de resina Formlabs Form Studio 1 Pro - EXPERT3D' });
    const titleIssues = checkNameSurfaces(A, { seo: s }).filter(i => i.path === 'seo_data[0].meta_title');
    expect(rules(titleIssues)).toEqual(expect.arrayContaining([PART1, PART2]));
    expect(titleIssues.every(i => i.context.includes('pt-PT'))).toBe(true);
  });

  it('the altered form in meta_description is a part-2 violation only (no part 1 on that surface)', () => {
    const s = seo({ ...okSeo('es-ES'), meta_description: 'Compra el Form Studio 1 Pro con envío rápido ➔' });
    const issues = checkNameSurfaces(A, { seo: s });
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe(PART2);
    expect(issues[0].path).toBe('seo_data[0].meta_description');
    expect(issues[0].detail).toContain('Form Studio 1 Pro');
  });

  it('reports each violating locale separately, addressed by index', () => {
    const bad = (language: string) => ({ ...okSeo(language), h1: 'Formlabs Form Studio 1 Pro', meta_title: 'Formlabs Form Studio 1 Pro - EXPERT3D' });
    const issues = checkNameSurfaces(A, { seo: seo(okSeo('en-ES'), bad('es-ES'), bad('pt-PT'), bad('uk-UA')) });
    const idx = new Set(issues.map(i => i.path?.match(/seo_data\[(\d+)\]/)?.[1]));
    expect(idx).toEqual(new Set(['1', '2', '3']));
  });

  it('returns no issues when neither surface group is supplied', () => {
    expect(checkNameSurfaces(A, {})).toEqual([]);
    expect(checkNameSurfaces(A, { slugs: null, seo: null })).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Part 2 — the altered-form scan (FR-5): what is and is not a shortened form
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// INTERPRETATION PINNED HERE (recorded in the test strategy): a shortened form is reported ONCE, as the
// maximal run of text tokens satisfying FR-5 (a)-(d). "Studio 1 Pro" inside an already-reported
// "Form Studio 1 Pro" is not a second violation. The Specification's examples ("Form Studio 1 Pro is a
// violation") and its "each shortened form" wording read that way; counting every sub-run would turn
// one defect into several findings.
describe('FR-5 part 2 — shortened form detection (examples named in the Specification)', () => {
  const descriptionOf = (text: string) => seo({
    language: 'es-ES', h1: A, meta_title: `${A} - EXPERT3D`, meta_description: `${text} ➔`,
  });
  const part2 = (typed: string, text: string) =>
    checkNameSurfaces(typed, { seo: descriptionOf(text) }).filter(i => i.rule === PART2);

  it('"Form Studio 1 Pro" is a violation: it skips "Resin Tank", contains designators 1 and Pro, ends on Pro', () => {
    expect(part2(A, 'Mira la Form Studio 1 Pro')).toHaveLength(1);
  });

  it('the full typed name is not a violation', () => {
    expect(part2(A, `Mira la ${A}`)).toEqual([]);
  });

  it('a bare "Form Studio 1" is not a violation (it lacks the last token: the stated blind spot)', () => {
    expect(part2(A, 'Mira la Form Studio 1')).toEqual([]);
  });

  it('a hard break in the middle breaks the run: "Form Studio 1, Pro" is not a shortened form', () => {
    expect(part2(A, 'Mira la Form Studio 1, Pro')).toEqual([]);
  });

  it('the comparison is case-sensitive: "form studio 1 pro" is not a shortened form', () => {
    expect(part2(A, 'mira la form studio 1 pro')).toEqual([]);
  });

  it('a full occurrence plus a separate shortened form elsewhere: only the shortened form is flagged', () => {
    const hits = part2(A, `Con la ${A} y también la Studio 1 Pro`);
    expect(hits).toHaveLength(1);
    expect(hits[0].detail).toContain('Studio 1 Pro');
  });

  describe('with a typed name that has a designator but a short, ordinary tail', () => {
    const typed = 'Elegoo Saturn 4 Ultra Resin Printer';

    it('"any Elegoo resin printer" is not flagged (case differs, no designator token)', () => {
      expect(part2(typed, 'Compatible con any Elegoo resin printer')).toEqual([]);
    });

    it('"Elegoo Resin Printer" is not flagged: the run skips tokens but contains no designator', () => {
      expect(part2(typed, 'Ideal para la Elegoo Resin Printer')).toEqual([]);
    });

    it('"Elegoo Saturn 4 Printer" is flagged: skips "Ultra Resin", keeps designator 4, ends on Printer', () => {
      expect(part2(typed, 'Ideal para la Elegoo Saturn 4 Printer')).toHaveLength(1);
    });

    it('the full name is not flagged', () => {
      expect(part2(typed, `Ideal para la ${typed}`)).toEqual([]);
    });
  });

  describe('with number+unit tokens inside the typed name', () => {
    const typed = 'Hardened X1C Nozzle 0.4 mm Kit';

    it('the full name in a Cyrillic locale format ("0,4 мм") is a full occurrence, not a violation', () => {
      expect(part2(typed, 'Набір Hardened X1C Nozzle 0,4 мм Kit')).toEqual([]);
    });

    it('a run that skips "Nozzle" but keeps designator X1C and the last token is flagged', () => {
      expect(part2(typed, 'Набір Hardened X1C 0,4 мм Kit')).toHaveLength(1);
    });
  });

  describe('blind spots stated by the Specification (NFR-7) stay undetected, by design', () => {
    it('a brand-only name (Fixture B: no designator token) is not scanned by part 2', () => {
      expect(part2(B, 'Compra Bambu Filament 1.75 mm')).toEqual([]);
      expect(part2(B, 'PLA, 1.75 mm')).toEqual([]);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Generic and empty typed names are never checked (AC-7)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('generic or empty typed names are not subject to the check (AC-7, FR-1 failure path)', () => {
  const s = seo({ language: 'es-ES', h1: 'Boquilla', meta_title: 'Boquilla - EXPERT3D', meta_description: 'Boquilla acero ➔' });
  const sl = slugs({ language: 'es-ES', name: 'Boquilla de acero', slug: 'boquilla-acero' });

  it('Fixture C (generic) returns no issues however the output is localized', () => {
    expect(checkNameSurfaces(C, { slugs: sl, seo: s })).toEqual([]);
    expect(checkDescriptionHtml(C, '<p>Boquilla endurecida</p>', 'HTML (es-ES)')).toEqual([]);
    expect(checkOptimizerText(C, '<p>Boquilla endurecida</p>')).toEqual([]);
  });

  it.each(['', '   '])('an empty typed name %j returns no issues', (typed) => {
    expect(checkNameSurfaces(typed, { slugs: sl, seo: s })).toEqual([]);
    expect(checkDescriptionHtml(typed, '<p>anything</p>', 'HTML (es-ES)')).toEqual([]);
    expect(checkOptimizerText(typed, '<p>anything</p>')).toEqual([]);
  });

  it('a generic name never raises the legacy-style findings either, even when its tokens are all gone', () => {
    const gone = slugs({ language: 'uk-UA', name: 'Сопло', slug: 'soplo' });
    expect(checkNameSurfaces('Hardened Steel Nozzle', { slugs: gone })).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Description HTML — part 2 only (FR-6, AC-3)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('checkDescriptionHtml — Generator / UA Description and Task C translations (FR-6, AC-3)', () => {
  const CTX = 'HTML (uk-UA)';
  const shortenedOnly = (html: string) => checkDescriptionHtml(A, html, CTX);

  it('flags the altered form in the H1, naming it, with the caller-supplied context', () => {
    const issues = shortenedOnly('<h1>Резервуар для смоли Formlabs Form Studio 1 Pro</h1>');
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe(PART2);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].context).toBe(CTX);
    expect(issues[0].detail).toContain('Form Studio 1 Pro');
  });

  it.each([
    ['a heading', '<h2>Чому варто обрати Form Studio 1 Pro</h2>'],
    ['a body paragraph', '<p>Це Form Studio 1 Pro для вашої майстерні.</p>'],
    ['a list item', '<ul><li>Сумісний з Form Studio 1 Pro</li></ul>'],
    ['the CTA paragraph', '<p>Чому купити Form Studio 1 Pro в EXPERT3D?</p>'],
    ['a figcaption', '<figure><img src="a.jpg" alt=""><figcaption>Form Studio 1 Pro на столі</figcaption></figure>'],
  ])('flags the altered form in %s', (_label, html) => {
    expect(shortenedOnly(html).map(i => i.rule)).toEqual([PART2]);
  });

  it('flags every offending occurrence', () => {
    const html = '<p>Form Studio 1 Pro — перший абзац.</p><p>Знову Form Studio 1 Pro — другий абзац.</p>';
    expect(shortenedOnly(html)).toHaveLength(2);
  });

  it('accepts the full designator wherever the model is mentioned', () => {
    const html = `<h1>Резервуар для смоли ${A}</h1><p>Це ${A} для вашої майстерні.</p><p>Чому купити ${A} в EXPERT3D?</p>`;
    expect(shortenedOnly(html)).toEqual([]);
  });

  it('keeps heading short forms as today (OD-6): "Formlabs Form Studio 1" in a heading is not flagged', () => {
    expect(shortenedOnly('<h2>Переваги Formlabs Form Studio 1</h2>')).toEqual([]);
  });

  it('applies no part-1 presence check: a description that never mentions the name is fine (OD-8)', () => {
    expect(shortenedOnly('<h1>Резервуар для смоли</h1><p>Надійний витратний матеріал.</p>')).toEqual([]);
  });

  it('does not scan attribute values (alt, title, href, data-*)', () => {
    const html = '<p><img src="a.jpg" alt="Form Studio 1 Pro" title="Form Studio 1 Pro" data-x="Form Studio 1 Pro"></p>'
      + '<p><a href="https://example.com/Form-Studio-1-Pro">Каталог</a></p>';
    expect(shortenedOnly(html)).toEqual([]);
  });

  it('treats a block boundary as a hard break: "Form Studio 1" and "Pro" in two paragraphs are not one run', () => {
    expect(shortenedOnly('<p>Form Studio 1</p><p>Pro</p>')).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Optimizer output (FR-7: only when the optional [Product Name] is supplied)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
describe('checkOptimizerText — Optimizer with a supplied Product Name (FR-7, AC-5)', () => {
  it('flags an altered name in the optimized HTML', () => {
    const issues = checkOptimizerText(A, '<p>Відкрийте для себе Form Studio 1 Pro вже сьогодні.</p>');
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe(PART2);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].detail).toContain('Form Studio 1 Pro');
  });

  it('accepts text that carries the name unchanged', () => {
    expect(checkOptimizerText(A, `<p>Відкрийте для себе ${A} вже сьогодні.</p>`)).toEqual([]);
  });

  it('does not scan attribute values', () => {
    expect(checkOptimizerText(A, '<img src="a.jpg" alt="Form Studio 1 Pro">')).toEqual([]);
  });
});

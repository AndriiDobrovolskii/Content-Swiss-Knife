/**
 * US-2.2 — AC-11 / FR-17: the standard v4 document schema accepts a document that omits, or sets
 * to null, paragraphs 2, 3, 4, 6, 7 and 9, and still rejects one missing paragraph 1 or 8.
 *
 * Assertions come from the criterion, not from the plan's proposed `.optional()` wiring: the
 * observable is `safeParse().success` and the issue path.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ProductDescriptionDocSchema } from './description-doc.schema';
import { v4ValidDoc, v3BaseDoc } from '../../test/fixtures/v4-docs';
import {
  filamentsDoc, accessoriesDoc, sparePartsDoc, without, nulled, countWordsOf, IN_RANGE,
} from '../../test/fixtures/simplified-docs';

const parse = (d: unknown) => ProductDescriptionDocSchema.safeParse(d);
const issuePaths = (d: unknown): string[] => {
  const r = parse(d);
  return r.success ? [] : r.error.issues.map(i => i.path.join('.'));
};
const detail = (r: ReturnType<typeof parse>) => (r.success ? '' : JSON.stringify(r.error.issues));

describe('fixtures are valid before they are used as evidence (guards the guard)', () => {
  it('the simplified shapes parse and the hook sits inside its intended word budget', () => {
    for (const d of [filamentsDoc(), accessoriesDoc(), accessoriesDoc({ withFunctionality: true }), sparePartsDoc()]) {
      const r = parse(d);
      expect(r.success, detail(r)).toBe(true);
    }
    const hookWords = countWordsOf((filamentsDoc() as unknown as { hook: string }).hook);
    expect(hookWords).toBeGreaterThanOrEqual(IN_RANGE.hook - 2);
    expect(hookWords).toBeLessThanOrEqual(IN_RANGE.hook + 2);
  });
});

describe('FR-17 — optional paragraphs (omitted or null)', () => {
  // v4 paragraph -> the document keys that carry it
  const OPTIONAL: Array<[string, string[]]> = [
    ['§2 killer specs + key benefits', ['killerSpecs', 'keyBenefits']],
    ['§3 functionality', ['functionality']],
    ['§4 applications', ['applications']],
    ['§5 compatibility', ['compatibility']],
    ['§6 package contents', ['packageContents']],
    ['§7 specs', ['specs']],
  ];

  for (const [label, keys] of OPTIONAL) {
    it(`accepts a document that omits ${label}`, () => {
      const r = parse(without(v4ValidDoc(), ...keys));
      expect(r.success, detail(r)).toBe(true);
    });
    it(`accepts a document that sets ${label} to null`, () => {
      const r = parse(nulled(v4ValidDoc(), ...keys));
      expect(r.success, detail(r)).toBe(true);
    });
  }

  it('accepts a document carrying only §1 and §8 (Spare parts without §5)', () => {
    const r = parse(without(sparePartsDoc(), 'compatibility'));
    expect(r.success, detail(r)).toBe(true);
  });

  it('accepts §2, §3, §4, §6 and §7 all omitted at once', () => {
    const doc = without(v4ValidDoc(), 'killerSpecs', 'keyBenefits', 'functionality', 'applications', 'packageContents', 'specs');
    const r = parse(doc);
    expect(r.success, detail(r)).toBe(true);
  });

  it('accepts a document with no §9 FAQ field at all, and one with faq set to null', () => {
    expect(parse(without(v4ValidDoc(), 'faq')).success).toBe(true);
    expect(parse(nulled(v4ValidDoc(), 'faq')).success).toBe(true);
  });
});

describe('FR-17 — §1 and §8 stay required', () => {
  it('rejects a document missing §1 (hook), at path "hook"', () => {
    const doc = without(v4ValidDoc(), 'hook');
    expect(parse(doc).success).toBe(false);
    expect(issuePaths(doc)).toContain('hook');
  });
  it('rejects a document missing §8 (cta), at a path under "cta"', () => {
    const doc = without(v4ValidDoc(), 'cta');
    expect(parse(doc).success).toBe(false);
    expect(issuePaths(doc).some(p => p === 'cta' || p.startsWith('cta.'))).toBe(true);
  });
  it('rejects a null hook and a null cta (null is accepted only for the optional paragraphs)', () => {
    expect(parse(nulled(v4ValidDoc(), 'hook')).success).toBe(false);
    expect(parse(nulled(v4ValidDoc(), 'cta')).success).toBe(false);
  });
  it('rejects a Spare-parts-shaped document whose hook is missing', () => {
    expect(parse(without(sparePartsDoc(), 'hook')).success).toBe(false);
  });
  it('still enforces the v4 hook invariant start on a simplified document (AC-10 / FR-12)', () => {
    const doc = { ...(sparePartsDoc() as object), hook: 'Плоский початок без назви — текст' };
    expect(parse(doc).success).toBe(false);
    expect(issuePaths(doc)).toContain('hook');
  });
});

describe('FR-17 — bounds still apply whenever a present parent field is present (OD-13c)', () => {
  it('rejects present applications with only 3 items', () => {
    const d = filamentsDoc() as unknown as { applications: { items: unknown[] } };
    const doc = { ...d, applications: { ...d.applications, items: d.applications.items.slice(0, 3) } };
    expect(parse(doc).success).toBe(false);
    expect(issuePaths(doc).some(p => p.startsWith('applications'))).toBe(true);
  });
  it('rejects present applications with 9 items', () => {
    const d = filamentsDoc() as unknown as { applications: object };
    const nine = Array.from({ length: 9 }, (_, i) => ({ scenario: `Сценарій ${i}:`, text: ' текст' }));
    expect(parse({ ...d, applications: { ...d.applications, items: nine } }).success).toBe(false);
  });
  it('rejects present killerSpecs with 2 entries', () => {
    const d = filamentsDoc() as unknown as { killerSpecs: unknown[] };
    expect(parse({ ...d, killerSpecs: d.killerSpecs.slice(0, 2) }).success).toBe(false);
  });
  it('rejects a present-but-empty specs.categories', () => {
    const d = filamentsDoc() as unknown as { specs: { heading: string } };
    expect(parse({ ...d, specs: { heading: d.specs.heading, categories: [] } }).success).toBe(false);
  });
});

describe('FR-17 — cross-field checks skip when their target fields are absent (OD-13c)', () => {
  it('does not throw when keyBenefits is present and killerSpecs is absent (combined-§2 ceiling)', () => {
    expect(() => parse(without(v4ValidDoc(), 'killerSpecs'))).not.toThrow();
    expect(parse(without(v4ValidDoc(), 'killerSpecs')).success).toBe(true);
  });
  it('does not throw when killerSpecs is present and keyBenefits is absent', () => {
    expect(() => parse(without(v4ValidDoc(), 'keyBenefits'))).not.toThrow();
    expect(parse(without(v4ValidDoc(), 'keyBenefits')).success).toBe(true);
  });
  it('does not throw with functionality absent (single-<h3> rule and figure walk skip it)', () => {
    expect(() => parse(without(v4ValidDoc(), 'functionality'))).not.toThrow();
    expect(parse(without(v4ValidDoc(), 'functionality')).success).toBe(true);
  });
  it('a figure referenced from §5 validates when §2, §3 and §4 are all absent', () => {
    const d = sparePartsDoc() as unknown as { compatibility: { heading: string; blocks: unknown[] } };
    const doc = {
      ...d,
      compatibility: {
        ...d.compatibility,
        blocks: [...d.compatibility.blocks, { kind: 'paragraph', text: 'Вступ до фото' }, { kind: 'figure', ref: 0 }],
      },
      figures: [{ file: 'part.jpg', alt: 'Запчастина', caption: '<b>Запчастина. </b>Вигляд збоку.' }],
    };
    const r = parse(doc);
    expect(r.success, detail(r)).toBe(true);
  });
  it('an unreferenced figure is still rejected when the section that held its ref is omitted', () => {
    const doc = {
      ...(sparePartsDoc() as object),
      figures: [{ file: 'part.jpg', alt: 'Запчастина', caption: '<b>Запчастина. </b>Вигляд.' }],
    };
    expect(parse(doc).success).toBe(false);
    expect(issuePaths(doc)).toContain('figures');
  });
});

describe('FR-17 — existing Full-description documents validate as before', () => {
  it('v4ValidDoc (all paragraphs) parses', () => {
    expect(parse(v4ValidDoc()).success).toBe(true);
  });
  it('the legacy 3.0 base document parses', () => {
    expect(parse(v3BaseDoc()).success).toBe(true);
  });
  for (const f of ['expert3d-ortur-h20-20w', 'center-3d-print-ortur-h20-20w']) {
    it(`corpus fixture ${f} still parses`, () => {
      const doc = JSON.parse(readFileSync(join(process.cwd(), 'test', 'fixtures', 'corpus', `${f}.doc.json`), 'utf8'));
      expect(parse(doc).success).toBe(true);
    });
  }
});

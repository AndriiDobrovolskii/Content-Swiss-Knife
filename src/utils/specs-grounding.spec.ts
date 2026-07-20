import { describe, it, expect } from 'vitest';
import { validateSpecsGrounding, isAlreadyCyrillic } from './specs-grounding';

const SRC = `Build Volume: 330 × 330 × 565 mm (61.5 L)
Hopper Capacity: 105 L
Layer Thickness: 110 μm
Laser: Ytterbium Fibre, 120 W`;

const SRC_UK = `Робоча зона: 400 × 400 мм
Тип лазера: Діодний, 10 Вт
Товщина шару: 100 мкм`;

/** Mirrors the real schema: section.specs → table → thead(Parameter|Value) → tbody rows. */
function specSection(rows: string): string {
  return `<section class="specs"><table>` +
    `<thead><tr><th>Parameter</th><th>Value</th></tr></thead>` +
    `<tbody>${rows}</tbody></table></section>`;
}

describe('validateSpecsGrounding — Rule: spec-row-not-grounded', () => {
  it('flags a hallucinated row whose label is absent from source ("Throughput")', () => {
    const html = specSection(`<tr><td>Throughput</td><td>0330 kg/hr</td></tr>`);
    const issues = validateSpecsGrounding(html, SRC, 'HTML (base)');
    expect(issues.find(i => i.rule === 'spec-row-not-grounded')?.severity).toBe('error');
  });

  it('does NOT flag a grounded row present in source ("Hopper Capacity")', () => {
    const html = specSection(`<tr><td>Hopper Capacity</td><td>105 L</td></tr>`);
    expect(validateSpecsGrounding(html, SRC, 'HTML (base)')).toHaveLength(0);
  });

  it('does NOT flag the <thead> header row (label "Parameter" is not a spec)', () => {
    const html = specSection(`<tr><td>Build Volume</td><td>330 × 330 × 565 mm</td></tr>`);
    // Only the grounded Build Volume row exists in tbody; header "Parameter" must be ignored.
    expect(validateSpecsGrounding(html, SRC, 'HTML (base)')).toHaveLength(0);
  });

  it('does NOT run on the top key-specs table (bare table outside section.specs)', () => {
    const html =
      `<div class="table-responsive"><table>` +
      `<thead><tr><th>Specification</th><th>Value</th><th>Why it matters</th></tr></thead>` +
      `<tbody><tr><td>Throughput</td><td>0330 kg/hr</td><td>faster jobs</td></tr></tbody>` +
      `</table></div>`;
    expect(validateSpecsGrounding(html, SRC, 'HTML (base)')).toHaveLength(0);
  });

  it('no-ops when source specs are empty', () => {
    const html = specSection(`<tr><td>Throughput</td><td>0330</td></tr>`);
    expect(validateSpecsGrounding(html, '', 'HTML (base)')).toHaveLength(0);
  });

  it('skips rows whose label is only generic/stopwords', () => {
    const html = specSection(`<tr><td>Type</td><td>PLA</td></tr>`);
    expect(validateSpecsGrounding(html, SRC, 'HTML (base)')).toHaveLength(0);
  });

  it('propagates context to the issue', () => {
    const html = specSection(`<tr><td>Throughput</td><td>0330</td></tr>`);
    const issue = validateSpecsGrounding(html, SRC, 'HTML (base)')
      .find(i => i.rule === 'spec-row-not-grounded');
    expect(issue?.context).toBe('HTML (base)');
  });

  // Regression: JS \b is ASCII-only and never matches adjacent to Cyrillic, which made
  // every Cyrillic label a false "hallucination" once the master pivoted to uk-UA.
  it('does NOT flag a grounded Cyrillic row present in source ("Робоча зона")', () => {
    const html = specSection(`<tr><td>Робоча зона</td><td>400 × 400 мм</td></tr>`);
    expect(validateSpecsGrounding(html, SRC_UK, 'HTML (uk-UA)')).toHaveLength(0);
  });

  it('flags a hallucinated Cyrillic row whose label is absent from source ("Гарантія")', () => {
    const html = specSection(`<tr><td>Гарантія</td><td>24 місяці</td></tr>`);
    const issues = validateSpecsGrounding(html, SRC_UK, 'HTML (uk-UA)');
    expect(issues.find(i => i.rule === 'spec-row-not-grounded')?.severity).toBe('error');
  });

  // Regression: input.specs is typically the manufacturer's English sheet, but the master HTML
  // is generated natively in Ukrainian — two independent LLM translations of the same source
  // term can diverge in word choice or grammatical case even though neither is wrong.
  describe('translation-drift hardening', () => {
    const SRC_EN_DIMS = `Build Volume (W*D*H): 305*320*325 mm`;

    it('stemmed match survives grammatical-case drift ("Сопло" label vs. inflected "сопла" in source)', () => {
      const srcUk = 'Максимальна температура сопла: 350 C';
      const html = specSection(`<tr><td>Сопло</td><td>Гартована сталь</td></tr>`);
      expect(validateSpecsGrounding(html, srcUk, 'HTML (uk-UA)')).toHaveLength(0);
    });

    it('numeric anchor grounds a row whose label wording fully diverges from source but whose value numbers all match ("Build Volume" -> "Об\'єм друку")', () => {
      const html = specSection(`<tr><td>Об'єм друку</td><td>305×320×325 мм³</td></tr>`);
      // Sanity: the label alone shares no stem with the English source at all.
      expect(validateSpecsGrounding(html, SRC_EN_DIMS, 'HTML (uk-UA)')).toHaveLength(0);
    });

    it('does NOT ground a fabricated row whose label AND value numbers are both absent from source', () => {
      const html = specSection(`<tr><td>Пропускна здатність</td><td>0330 кг/год</td></tr>`);
      const issues = validateSpecsGrounding(html, SRC_EN_DIMS, 'HTML (uk-UA)');
      expect(issues.find(i => i.rule === 'spec-row-not-grounded')?.severity).toBe('error');
    });

    it('requires ALL of a multi-number row\'s numbers to match, not just one (no coincidental single-number collision)', () => {
      // "325" alone coincides with the source's build-volume dimension, but the other two
      // numbers in this fabricated row do not — must still be flagged.
      const html = specSection(`<tr><td>Якийсь параметр</td><td>325×999×111 мм</td></tr>`);
      const issues = validateSpecsGrounding(html, SRC_EN_DIMS, 'HTML (uk-UA)');
      expect(issues.find(i => i.rule === 'spec-row-not-grounded')?.severity).toBe('error');
    });
  });

  describe('isAlreadyCyrillic', () => {
    it('returns true for Cyrillic specs', () => {
      expect(isAlreadyCyrillic(SRC_UK)).toBe(true);
    });

    it('returns false for English specs', () => {
      expect(isAlreadyCyrillic(SRC)).toBe(false);
    });

    it('returns false when Cyrillic is only a small fraction of the text', () => {
      const mixed = 'Printing Technology: Fused Deposition Modeling. Chassis: Aluminum and Steel. Матеріал.';
      expect(isAlreadyCyrillic(mixed)).toBe(false);
    });
  });
});

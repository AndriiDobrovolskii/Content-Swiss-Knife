import { describe, it, expect } from 'vitest';
import { validateSpecsGrounding, isAlreadyCyrillic, sanitizeGroundedTranslation } from './specs-grounding';

const SRC = `Build Volume: 330 × 330 × 565 mm (61.5 L)
Hopper Capacity: 105 L
Layer Thickness: 110 μm
Laser: Ytterbium Fibre, 120 W`;

const SRC_UK = `Робоча зона: 400 × 400 мм
Тип лазера: Діодний, 10 Вт
Товщина шару: 100 мкм`;

// Label-anchor-only fixture (Fixture B, generalization requirement): no qualifying numbers, no
// Latin loanwords — the one anchor type that never fired in the Ortur H20 incident. Reused
// across the mass-failure circuit breaker and thousands-separator test blocks below, not just
// the translation-drift hardening suite it originated in.
const SRC_UK_TECH =
  `Тип пластини поверхні: текстурована PEI-пластина\n` +
  `Обсяг сховища: вбудовані 8 ГБ eMMC та USB-порт`;

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

    // Round 2 (real report): the numeric anchor doesn't cover every legitimate row — a row can
    // have no number at all, or only a trivial single-digit one the numeric anchor deliberately
    // ignores. A Latin material/interface code that survives translation untouched anchors these.
    it('Latin-token anchor grounds a row with no qualifying number at all ("Included Build Plate Type" -> "Тип столу (комплектний)", real P2S false positive)', () => {
      const html = specSection(`<tr><td>Тип столу (комплектний)</td><td>текстурована PEI-пластина</td></tr>`);
      expect(validateSpecsGrounding(html, SRC_UK_TECH, 'HTML (uk-UA)')).toHaveLength(0);
    });

    it('Latin-token anchor grounds a row whose only number is a trivial single digit ("Storage" -> "Накопичувач", real P2S false positive)', () => {
      const html = specSection(`<tr><td>Накопичувач</td><td>вбудовані 8 ГБ eMMC та USB-порт</td></tr>`);
      expect(validateSpecsGrounding(html, SRC_UK_TECH, 'HTML (uk-UA)')).toHaveLength(0);
    });

    it('does NOT ground a fabricated row sharing none of the three signals (label, number, or Latin token)', () => {
      const html = specSection(`<tr><td>Функція самоочищення</td><td>автоматична</td></tr>`);
      const issues = validateSpecsGrounding(html, SRC_UK_TECH, 'HTML (uk-UA)');
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

describe('mass-failure circuit breaker', () => {
  // Deterministic fixtures: `count` grounded rows via the numeric anchor (distinct 4-digit
  // values starting at 1000), and `count` ungrounded rows with fabricated labels/values that
  // share no number, Latin token, or label stem with the source.
  function numericSource(count: number): string {
    return Array.from({ length: count }, (_, i) => `Param${i}: ${1000 + i * 7} units`).join('\n');
  }
  function groundedRows(count: number): string {
    return Array.from({ length: count }, (_, i) => `<tr><td>Param${i}</td><td>${1000 + i * 7}</td></tr>`).join('');
  }
  function ungroundedRows(count: number): string {
    return Array.from({ length: count }, (_, i) => `<tr><td>Fabricated${i} Property</td><td>${9000 + i}</td></tr>`).join('');
  }

  it('15 graded / 8 ungrounded (real Ortur H20 incident shape) — trips, collapses to one warning listing all 8 labels', () => {
    const source = numericSource(7);
    const html = specSection(groundedRows(7) + ungroundedRows(8));
    const issues = validateSpecsGrounding(html, source, 'HTML (uk-UA)');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].rule).toBe('spec-row-not-grounded-mass-failure');
    for (let i = 0; i < 8; i++) {
      expect(issues[0].detail).toContain(`Fabricated${i} Property`);
    }
  });

  it('15 graded / 1 ungrounded — unchanged: one error, breaker does not engage', () => {
    const source = numericSource(14);
    const html = specSection(groundedRows(14) + ungroundedRows(1));
    const issues = validateSpecsGrounding(html, source, 'HTML (uk-UA)');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].rule).toBe('spec-row-not-grounded');
  });

  it('3 graded / 2 ungrounded — stays two individual errors (2 >= 3 is false, absolute-minimum guard)', () => {
    const source = numericSource(1);
    const html = specSection(groundedRows(1) + ungroundedRows(2));
    const issues = validateSpecsGrounding(html, source, 'HTML (uk-UA)');
    expect(issues).toHaveLength(2);
    expect(issues.every(i => i.severity === 'error' && i.rule === 'spec-row-not-grounded')).toBe(true);
  });

  it('10 graded / 5 ungrounded — stays five individual errors (5 > 5 is false, strict >)', () => {
    const source = numericSource(5);
    const html = specSection(groundedRows(5) + ungroundedRows(5));
    const issues = validateSpecsGrounding(html, source, 'HTML (uk-UA)');
    expect(issues).toHaveLength(5);
    expect(issues.every(i => i.severity === 'error')).toBe(true);
  });

  it('10 graded / 6 ungrounded — trips (6 >= 3 and 6 > 5)', () => {
    const source = numericSource(4);
    const html = specSection(groundedRows(4) + ungroundedRows(6));
    const issues = validateSpecsGrounding(html, source, 'HTML (uk-UA)');
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('spec-row-not-grounded-mass-failure');
  });

  it('denominator counts GRADED rows, not scanned rows: 4 skipped short-label rows + 6-of-11 ungrounded must still trip', () => {
    // Under a scanned-rows denominator this would be 6/15 = 40% (no trip) and 6 real rows would
    // ship deleted. Excluding the 4 skipped rows makes it 6/11 = 54.5% (trips) — this is the
    // test that proves the fix (design note D6).
    const source = numericSource(5);
    const skipped = ['Тип', 'ПЗ', 'На', 'Рік']
      .map(label => `<tr><td>${label}</td><td>1</td></tr>`).join('');
    const html = specSection(skipped + groundedRows(5) + ungroundedRows(6));
    const issues = validateSpecsGrounding(html, source, 'HTML (uk-UA)');
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('spec-row-not-grounded-mass-failure');
    expect(issues[0].detail).toContain('6 of 11 graded');
  });

  it('cross-fixture (generalization): a fully-legitimate label-anchor-only table never trips, regardless of anchor type', () => {
    const html = specSection(
      `<tr><td>Тип столу (комплектний)</td><td>текстурована PEI-пластина</td></tr>` +
      `<tr><td>Накопичувач</td><td>вбудовані 8 ГБ eMMC та USB-порт</td></tr>`,
    );
    expect(validateSpecsGrounding(html, SRC_UK_TECH, 'HTML (uk-UA)')).toHaveLength(0);
  });

  it('propagates context on the collapsed mass-failure warning', () => {
    const source = numericSource(4);
    const html = specSection(groundedRows(4) + ungroundedRows(6));
    const issues = validateSpecsGrounding(html, source, 'HTML (base)');
    expect(issues[0].context).toBe('HTML (base)');
  });
});

describe('numeric grounding — thousands separators', () => {
  it('20,000 (comma-group) source grounds a 20000 HTML value — the incident\'s own case', () => {
    const source = 'Maximum Speed: 20,000 mm/min';
    const html = specSection(`<tr><td>Максимальна швидкість</td><td>20000</td></tr>`);
    expect(validateSpecsGrounding(html, source, 'HTML (uk-UA)')).toHaveLength(0);
  });

  it('20 000 (space and NBSP variants) source grounds a 20000 HTML value', () => {
    const htmlValue = specSection(`<tr><td>Швидкість переміщення</td><td>20000</td></tr>`);
    expect(validateSpecsGrounding(htmlValue, 'Speed: 20 000 mm/min', 'HTML (uk-UA)')).toHaveLength(0);
    expect(validateSpecsGrounding(htmlValue, "Speed: 20 000 mm/min", 'HTML (uk-UA)')).toHaveLength(0);
  });

  it('1,234,567 (multi-group) source grounds a 1234567 HTML value', () => {
    const source = 'Total Cycles: 1,234,567';
    const html = specSection(`<tr><td>Кількість циклів</td><td>1234567</td></tr>`);
    expect(validateSpecsGrounding(html, source, 'HTML (uk-UA)')).toHaveLength(0);
  });

  it('regression: 61,5 (decimal comma) source does NOT ground a fabricated 615 HTML value', () => {
    const source = 'Hopper Capacity: 61,5 L';
    const html = specSection(`<tr><td>Місткість бункера</td><td>615</td></tr>`);
    const issues = validateSpecsGrounding(html, source, 'HTML (uk-UA)');
    expect(issues.find(i => i.rule === 'spec-row-not-grounded')?.severity).toBe('error');
  });

  it('regression: 0,330 кг/год source grounds a matching 0,330 HTML value (decimal-guard path stays consistent end-to-end)', () => {
    const source = 'Feed Rate: 0,330 кг/год';
    const html = specSection(`<tr><td>Швидкість подачі</td><td>0,330</td></tr>`);
    expect(validateSpecsGrounding(html, source, 'HTML (uk-UA)')).toHaveLength(0);
  });

  it('regression: 305*320*325 mm dimensions do NOT glue into a fabricated 305320325', () => {
    const source = 'Build Volume (W*D*H): 305*320*325 mm';
    const html = specSection(`<tr><td>Якийсь параметр</td><td>305320325</td></tr>`);
    const issues = validateSpecsGrounding(html, source, 'HTML (uk-UA)');
    expect(issues.find(i => i.rule === 'spec-row-not-grounded')?.severity).toBe('error');
  });

  it('end-to-end: real Ortur H20 "Maximum Speed" and "Camera" rows ground cleanly against post-fixNumberFormatting HTML values', () => {
    const source = `Maximum Speed: 20,000 mm/min\nCamera: 200,000 Pixel`;
    const html = specSection(
      `<tr><td>Максимальна швидкість</td><td>20000</td></tr>` +
      `<tr><td>Камера</td><td>200000</td></tr>`,
    );
    expect(validateSpecsGrounding(html, source, 'HTML (uk-UA)')).toHaveLength(0);
  });
});

describe('sanitizeGroundedTranslation', () => {
  describe("script: 'Cyrillic' (default master locale, uk-UA)", () => {
    it('returns valid Ukrainian translation, cleaned', () => {
      expect(sanitizeGroundedTranslation(SRC_UK, 'Cyrillic')).toBe(SRC_UK);
    });

    it('returns "" for an English echo (untranslated fallback) — the Ortur H20 regression', () => {
      expect(sanitizeGroundedTranslation(SRC, 'Cyrillic')).toBe('');
    });

    it('returns "" for garbled non-Cyrillic text', () => {
      expect(sanitizeGroundedTranslation('####!!! 123 ???', 'Cyrillic')).toBe('');
    });

    it('returns "" for empty/whitespace-only translation', () => {
      expect(sanitizeGroundedTranslation('   ', 'Cyrillic')).toBe('');
      expect(sanitizeGroundedTranslation('', 'Cyrillic')).toBe('');
    });

    it('returns "" for null/undefined', () => {
      expect(sanitizeGroundedTranslation(null, 'Cyrillic')).toBe('');
      expect(sanitizeGroundedTranslation(undefined, 'Cyrillic')).toBe('');
    });

    it('strips code fences before the script check', () => {
      const fenced = '```html\n' + SRC_UK + '\n```';
      expect(sanitizeGroundedTranslation(fenced, 'Cyrillic')).toBe(SRC_UK);
    });
  });

  describe("script: 'Latin' (forward-compat for a future non-Cyrillic master)", () => {
    const SRC_ES = 'Volumen de impresión: 330 × 330 × 565 mm (61,5 L)\nCapacidad de la tolva: 105 L';

    it('returns Spanish text, not ""', () => {
      expect(sanitizeGroundedTranslation(SRC_ES, 'Latin')).toBe(SRC_ES);
    });

    it('returns "" for Cyrillic text requested under script: Latin', () => {
      expect(sanitizeGroundedTranslation(SRC_UK, 'Latin')).toBe('');
    });
  });
});

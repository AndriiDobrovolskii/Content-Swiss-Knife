import { describe, it, expect } from 'vitest';
import {
  validateSpecsGrounding, isAlreadyCyrillic, sanitizeGroundedTranslation,
  inspectGroundedTranslation, describeGroundingFailure,
} from './specs-grounding';
import { getBlock, extractBlocks } from './block-repair';

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

describe('validateSpecsGrounding — allowedParams (repair guidance)', () => {
  const ALLOWED = ['Build Volume', 'Hopper Capacity', 'Layer Thickness', 'Laser'];

  it('emits exactly one spec-rows-allowed-parameters issue when >=1 row is ungrounded and allowedParams is non-empty', () => {
    const html = specSection(`<tr><td>Throughput</td><td>0330 kg/hr</td></tr>`);
    const issues = validateSpecsGrounding(html, SRC, 'HTML (base)', ALLOWED);
    const allowedIssues = issues.filter(i => i.rule === 'spec-rows-allowed-parameters');
    expect(allowedIssues).toHaveLength(1);
    expect(allowedIssues[0].detail).toContain('ALLOWED PARAMETERS');
    for (const p of ALLOWED) expect(allowedIssues[0].detail).toContain(p);
  });

  it('emits no spec-rows-allowed-parameters issue when every row is grounded', () => {
    const html = specSection(`<tr><td>Hopper Capacity</td><td>105 L</td></tr>`);
    const issues = validateSpecsGrounding(html, SRC, 'HTML (base)', ALLOWED);
    expect(issues.filter(i => i.rule === 'spec-rows-allowed-parameters')).toHaveLength(0);
  });

  it('3-arg back-compat: allowedParams defaults to [], per-row errors unchanged, no ALLOWED PARAMETERS clause anywhere', () => {
    const html = specSection(`<tr><td>Throughput</td><td>0330 kg/hr</td></tr>`);
    const issues = validateSpecsGrounding(html, SRC, 'HTML (base)');
    expect(issues.filter(i => i.rule === 'spec-rows-allowed-parameters')).toHaveLength(0);
    expect(issues.find(i => i.rule === 'spec-row-not-grounded')?.severity).toBe('error');
    expect(issues.map(i => i.detail).join('\n')).not.toContain('ALLOWED PARAMETERS');
  });

  it('per-row detail instructs reconciliation (KEEP) rather than blind deletion', () => {
    const html = specSection(`<tr><td>Throughput</td><td>0330 kg/hr</td></tr>`);
    const issues = validateSpecsGrounding(html, SRC, 'HTML (base)', ALLOWED);
    const rowIssue = issues.find(i => i.rule === 'spec-row-not-grounded');
    expect(rowIssue?.detail).toContain('KEEP');
    expect(rowIssue?.detail).not.toContain('Remove any spec-table row');
  });

  it('when the mass-failure breaker trips, the allowed-parameters issue is collapsed away too (single warning only)', () => {
    const source = 'Param0: 1000 units\nParam1: 1007 units\nParam2: 1014 units\nParam3: 1021 units';
    const html = specSection(
      `<tr><td>Param0</td><td>1000</td></tr>` +
      `<tr><td>Param1</td><td>1007</td></tr>` +
      `<tr><td>Fab0 Property</td><td>9000</td></tr>` +
      `<tr><td>Fab1 Property</td><td>9001</td></tr>` +
      `<tr><td>Fab2 Property</td><td>9002</td></tr>`,
    );
    const issues = validateSpecsGrounding(html, source, 'HTML (base)', ALLOWED);
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('spec-row-not-grounded-mass-failure');
  });
});

/**
 * Regression suite for the XGRIDS L2 Pro 23:14 run.
 *
 * The row `Роздільна здатність | 1 × 1 Мп` was reported as not grounded even though the source
 * sheet plainly carries a `Resolution` parameter — it appears in the ALLOWED PARAMETERS list,
 * which is derived from the untranslated input. It failed all three anchors for mechanical
 * reasons: every number in the value is a single digit (below the ≥2-digit floor), the unit is
 * Cyrillic so there is no Latin token, and the label anchor compares against a TRANSLATION whose
 * wording drifted. Its two neighbours in the same category passed only by luck of value shape.
 */
describe('count-parity precondition', () => {
  // A drifted translation: "Resolution" came back as "Розділення", so no label word of
  // "Роздільна здатність" survives into the grounding source.
  const SRC_DRIFTED =
    `Розділення: 1 × 1 МП\n` +
    `Затвор: global shutter\n` +
    `Поле зору: 190° × 119°`;

  const POSITIONING_CAMERA_ROWS =
    `<tr><td>Роздільна здатність</td><td>1 × 1 Мп</td></tr>` +
    `<tr><td>Затвор</td><td>Глобальний (global shutter)</td></tr>` +
    `<tr><td>Кут огляду</td><td>190° × 119°</td></tr>`;

  const ALLOWED_3 = ['Resolution', 'Shutter', 'FOV'];

  it('sanity: without parity, the drifted row IS reported (the behaviour being conditioned)', () => {
    const issues = validateSpecsGrounding(
      specSection(POSITIONING_CAMERA_ROWS), SRC_DRIFTED, 'HTML (uk-UA)', [...ALLOWED_3, 'Extra'],
    );
    const rows = issues.filter(i => i.rule === 'spec-row-not-grounded');
    expect(rows).toHaveLength(1);
    expect(rows[0].detail).toContain('Роздільна здатність');
  });

  it('emits nothing when the row count exactly matches the source parameter count', () => {
    // 3 rows, 3 source parameters. A fabricated row would necessarily make actual > expected,
    // so under exact parity an unmatched row can only be a translation-matching artifact.
    const issues = validateSpecsGrounding(
      specSection(POSITIONING_CAMERA_ROWS), SRC_DRIFTED, 'HTML (uk-UA)', ALLOWED_3,
    );
    expect(issues).toEqual([]);
  });

  it('still catches an INVENTED row, because inventing one breaks parity', () => {
    // Base rows all ground here (the label matches the drifted translation verbatim), so the one
    // failure below is the phantom and nothing else — otherwise the mass-failure breaker collapses
    // the result and the test would pass for the wrong reason.
    const grounded =
      `<tr><td>Розділення</td><td>1 × 1 Мп</td></tr>` +
      `<tr><td>Затвор</td><td>Глобальний (global shutter)</td></tr>` +
      `<tr><td>Кут огляду</td><td>190° × 119°</td></tr>`;
    const withPhantom = grounded + `<tr><td>Throughput</td><td>0330 кг/год</td></tr>`;
    const issues = validateSpecsGrounding(
      specSection(withPhantom), SRC_DRIFTED, 'HTML (uk-UA)', ALLOWED_3,
    );
    const rows = issues.filter(i => i.rule === 'spec-row-not-grounded');
    expect(rows).toHaveLength(1);
    expect(rows[0].detail).toContain('Throughput');
  });

  it('stays active on a shortfall — the Ortur H20 incident shape (fewer rows than the source has)', () => {
    const issues = validateSpecsGrounding(
      specSection(`<tr><td>Throughput</td><td>0330 kg/hr</td></tr>`),
      SRC,
      'HTML (base)',
      ['Build Volume', 'Hopper Capacity', 'Layer Thickness', 'Laser'],
    );
    expect(issues.some(i => i.rule === 'spec-row-not-grounded')).toBe(true);
  });

  it('does not fire when allowedParams is empty — parity is unknowable, so nothing changes', () => {
    const issues = validateSpecsGrounding(specSection(POSITIONING_CAMERA_ROWS), SRC_DRIFTED, 'HTML (uk-UA)');
    expect(issues.some(i => i.rule === 'spec-row-not-grounded')).toBe(true);
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

describe('inspectGroundedTranslation', () => {
  // The second real run reported "specs grounding was DISABLED" and nothing else. Three different
  // causes produce that state and the code kept no evidence of which one fired, so the warning was
  // unactionable — the point of this is that the NEXT run names the cause.

  it('reports success with the cleaned text', () => {
    expect(inspectGroundedTranslation(SRC_UK, 'Cyrillic')).toEqual({ text: SRC_UK });
  });

  it('distinguishes an empty translation from a wrong-script one', () => {
    expect(inspectGroundedTranslation('   ', 'Cyrillic').failure).toEqual({ kind: 'empty' });
    expect(inspectGroundedTranslation(SRC, 'Cyrillic').failure?.kind).toBe('wrong-script');
  });

  it('carries the measured ratio, the threshold and a sample of what came back', () => {
    // The sample is what tells us whether the model echoed the English sheet or returned something
    // else entirely — the difference between a prompt problem and a provider problem.
    const failure = inspectGroundedTranslation(SRC, 'Cyrillic').failure;
    expect(failure).toMatchObject({ kind: 'wrong-script', threshold: 0.3 });
    if (failure?.kind === 'wrong-script') {
      expect(failure.ratio).toBeLessThanOrEqual(0.3);
      expect(SRC).toContain(failure.sample.replace(/…$/, ''));
    }
  });

  it('truncates the sample instead of dumping the whole sheet into a report', () => {
    const long = 'Material '.repeat(200);
    const failure = inspectGroundedTranslation(long, 'Cyrillic').failure;
    if (failure?.kind === 'wrong-script') expect(failure.sample.length).toBeLessThanOrEqual(121);
  });
});

describe('describeGroundingFailure', () => {
  it('names the provider error rather than blaming the script', () => {
    // The old message claimed the translation "did not yield usable text in the master's script",
    // which is simply untrue when the call threw.
    const text = describeGroundingFailure({ kind: 'provider-error' });
    expect(text).toMatch(/provider|call failed/i);
    expect(text).not.toMatch(/script/i);
  });

  it('names an empty translation as such', () => {
    expect(describeGroundingFailure({ kind: 'empty' })).toMatch(/empty/i);
  });

  it('quotes the ratio and the sample for a wrong-script result', () => {
    const text = describeGroundingFailure({
      kind: 'wrong-script', ratio: 0.04, threshold: 0.3, sample: 'Laser Head Power: 20 W',
    });
    expect(text).toContain('0.04');
    expect(text).toContain('0.3');
    expect(text).toContain('Laser Head Power');
  });
});

describe('validateSpecsGrounding — addressable rows', () => {
  // A label that drifted between two independent translations of the same English parameter is
  // the real case: "Child Lock" became "Дитячий замок" in the grounding source and "Блокування
  // від дітей" in the table. The validator is right that they do not match; what was wrong is
  // that correcting one label cost a full regeneration — the instrument that once deleted 8 of
  // 15 live rows. The label lives in a <td>, which the block tier can rewrite in place.
  const html = specSection(
    `<tr><td>Тип лазера</td><td>Діодний, 10 Вт</td></tr>`
    + `<tr><td>Блокування від дітей</td><td>Так</td></tr>`,
  );
  const rowIssue = () =>
    validateSpecsGrounding(html, SRC_UK, 'HTML (uk-UA)').find(i => i.rule === 'spec-row-not-grounded')!;

  it('addresses the offending LABEL cell, not the row or the value', () => {
    expect(getBlock(html, rowIssue().path!)).toBe('<td>Блокування від дітей</td>');
  });

  it('numbers the cell the way extractBlocks does', () => {
    // Same discipline as sentence-length: a validator and a patcher that disagree about which
    // block is number N would rename somebody else's cell and report success.
    const index = Number(/^block\[(\d+)\]$/.exec(rowIssue().path!)![1]);
    expect(extractBlocks(html)[index].outerHTML).toBe('<td>Блокування від дітей</td>');
  });

  it('carries the allowed parameters in the row issue itself, not only in the companion message', () => {
    // The block prompt passes each issue's `detail` verbatim. Without the list in THIS detail the
    // model is told to correct a label with no idea what to correct it to.
    const issue = validateSpecsGrounding(html, SRC_UK, 'HTML (uk-UA)', ['Laser Type', 'Child Lock'])
      .find(i => i.rule === 'spec-row-not-grounded')!;
    expect(issue.detail).toContain('Child Lock');
  });

  it('omits the list when no allowed parameters were supplied', () => {
    expect(rowIssue().detail).not.toMatch(/ALLOWED PARAMETERS/);
  });
});

describe('validateSpecsGrounding — how much the label anchor is worth', () => {
  // A §7 row whose value is boolean or prose has no numeric and no Latin anchor, so grounding
  // rests entirely on stem-matching its label. When the model wrote that label from the ENGLISH
  // sheet and the grounding source is a SEPARATE Ukrainian translation, the two are independent
  // renderings of one term and matching them is a coin flip — a real run shipped 15 correct rows
  // and flagged one, and which one changed between runs. The check must not assert an error it
  // cannot substantiate.
  const boolRow = specSection(`<tr><td>Спосіб сповіщення</td><td>Звуковий сигнал</td></tr>`);

  it('reports only a warning when the label was written from a different text', () => {
    const issues = validateSpecsGrounding(boolRow, SRC_UK, 'HTML (uk-UA)', [], { labelAnchorTrusted: false });
    expect(issues.find(i => i.rule === 'spec-row-not-grounded')?.severity).toBe('warning');
  });

  it('keeps it an error when the model saw the very text being grounded against', () => {
    const issues = validateSpecsGrounding(boolRow, SRC_UK, 'HTML (uk-UA)', [], { labelAnchorTrusted: true });
    expect(issues.find(i => i.rule === 'spec-row-not-grounded')?.severity).toBe('error');
  });

  it('stays an error regardless when the VALUE carried evidence that did not match', () => {
    // Numbers survive translation unchanged, so a value whose figures are absent from the source
    // is real evidence — nothing to do with wording drift.
    const numericRow = specSection(`<tr><td>Невідомий параметр</td><td>987 мм</td></tr>`);
    const issues = validateSpecsGrounding(numericRow, SRC_UK, 'HTML (uk-UA)', [], { labelAnchorTrusted: false });
    expect(issues.find(i => i.rule === 'spec-row-not-grounded')?.severity).toBe('error');
  });

  it('defaults to trusting the label anchor, so existing callers are unaffected', () => {
    expect(validateSpecsGrounding(boolRow, SRC_UK, 'HTML (uk-UA)')
      .find(i => i.rule === 'spec-row-not-grounded')?.severity).toBe('error');
  });

  it('does not shout louder than its rows: the companion message follows their severity', () => {
    const issues = validateSpecsGrounding(boolRow, SRC_UK, 'HTML (uk-UA)', ['Alarm Method'], { labelAnchorTrusted: false });
    expect(issues.find(i => i.rule === 'spec-rows-allowed-parameters')?.severity).toBe('warning');
  });
});

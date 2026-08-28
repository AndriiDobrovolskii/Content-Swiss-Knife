import { describe, it, expect } from 'vitest';
import {
  countExpectedSpecRows, countActualSpecRows, countActualSpecRowsDoc,
  validateSpecCountParity, validateSpecCountParityDoc,
  expectedSpecParameterLabels, findMalformedTableLines,
} from './spec-count-parity';
import type { ProductDescriptionDoc, SpecCategory } from '../domain/description-doc';

const ORTUR_H20_SPECS = `| Item | Specification |
| :--- | :--- |
| **Product Name** | H20 Laser Engraving Machine |
| **Material** | Aluminum Alloy |
| **Screen** | 1.3-inch OLED |
| **Exhaust Fan** | Yes |
| **Emergency Stop Button** | Yes |
| **Interfaces** | USB, DC Interface, TF Card |
| **Child Lock** | Yes |
| **Laser Head Power** | 10W |
| **Laser Head Focusing Method** | Manual focus |
| **Maximum Speed** | 20,000 mm/min |
| **Software** | ORTUR (self-developed App) / Lightburn / LaserGRBL |
| **Work Space** | 420mm*300mm |
| **Alarm Method** | Buzzer and Screen Display |
| **Connection Methods** | WiFi, USB |
| **Camera** | 200,000 Pixel |
| **Maximum Height of Engravable Objects** | 98mm |`;

/**
 * The XGRIDS L2 Pro shape: a manufacturer sheet split into several CATEGORY tables rather than
 * one flat one. Reduced from the real sheet — what this fixture exists to exercise is structural
 * (several header+separator pairs in one document), not which rows happen to be present.
 *
 * "Resolution" and "Shutter" appear in BOTH camera tables. That is not a typo: the real sheet
 * lists them once for the panoramic camera and once for the positioning camera, and both must
 * survive into the label list — see the duplicate test below.
 */
const MULTI_TABLE_SPECS = [
  '## System Parameters',
  '',
  '| Item | Specification |',
  '| :--- | :--- |',
  '| Weight | 1.7 kg |',
  '| Storage | 1 TB SSD |',
  '',
  '## Panoramic Camera',
  '',
  '| Item | Specification |',
  '| :--- | :--- |',
  '| Resolution | 2 x 48 MP |',
  '| Shutter | Rolling shutter |',
  '',
  '## Positioning Camera',
  '',
  '| Item | Specification |',
  '| :--- | :--- |',
  '| Resolution | 1 x 1 MP |',
  '| Shutter | Global shutter |',
].join('\n');

function specSection(rowCount: number): string {
  const rows = Array.from({ length: rowCount }, (_, i) => `<tr><td>Row ${i}</td><td>${i}</td></tr>`).join('');
  return `<section class="specs"><table><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

describe('countExpectedSpecRows', () => {
  it('excludes the Product Name row via label match (real Ortur H20 10 W source — 16 raw rows, 15 expected)', () => {
    expect(countExpectedSpecRows(ORTUR_H20_SPECS, 'H20 Laser Engraving Machine')).toBe(15);
  });

  it('excludes the Product Name row by label alone, even when productName does not match its value', () => {
    expect(countExpectedSpecRows(ORTUR_H20_SPECS, 'Some Unrelated Product')).toBe(15);
  });

  it('does not exclude a spec row whose label merely contains "Model" as a substring', () => {
    const md = `| Item | Specification |\n| :--- | :--- |\n| Compatible Nozzle Model | E3D V6 |\n| Weight | 12 kg |`;
    expect(countExpectedSpecRows(md, 'Creality K1 Max')).toBe(2);
  });

  it('excludes via value-containment fallback when the label is generic but the value names the product', () => {
    const md = `| Item | Specification |\n| :--- | :--- |\n| Full Name | Ortur H20 Laser Engraving Machine |\n| Weight | 2.5 kg |`;
    expect(countExpectedSpecRows(md, 'H20 Laser Engraving Machine')).toBe(1);
  });

  it('excludes empty/"N/A" value rows', () => {
    const md = `| Item | Specification |\n| :--- | :--- |\n| Weight | 12 kg |\n| Color | N/A |\n| Warranty | - |`;
    expect(countExpectedSpecRows(md, '')).toBe(1);
  });

  it('returns 0 (cannot verify) when no canonical table is detected in free prose', () => {
    expect(countExpectedSpecRows('This laser engraver has a 10W head and WiFi.', '')).toBe(0);
  });

  it('anchors on the header+separator pair regardless of preceding prose', () => {
    const md = `Some intro text.\n\n| Item | Specification |\n| :--- | :--- |\n| Weight | 12 kg |`;
    expect(countExpectedSpecRows(md, '')).toBe(1);
  });
});

describe('countActualSpecRows', () => {
  it('counts tbody rows inside section.specs tables', () => {
    expect(countActualSpecRows(specSection(15))).toBe(15);
  });

  it('sums across multiple category tables', () => {
    const html = specSection(5) + specSection(4);
    expect(countActualSpecRows(html)).toBe(9);
  });

  it('ignores the top key-specs table outside section.specs', () => {
    const html = `<div class="table-responsive"><table><tbody><tr><td>a</td><td>b</td></tr></tbody></table></div>`;
    expect(countActualSpecRows(html)).toBe(0);
  });
});

describe('validateSpecCountParity', () => {
  it('returns no issues when counts match', () => {
    const issues = validateSpecCountParity(specSection(15), ORTUR_H20_SPECS, 'H20 Laser Engraving Machine', 'HTML (uk-UA)');
    expect(issues).toHaveLength(0);
  });

  it('flags a shortfall of 5 as an ERROR (data loss, triggers repair-gate) with an anti-invention instruction', () => {
    const issues = validateSpecCountParity(specSection(10), ORTUR_H20_SPECS, 'H20 Laser Engraving Machine', 'HTML (uk-UA)');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].rule).toBe('spec-count-mismatch');
    expect(issues[0].detail).toContain('is 10, expected 15');
    expect(issues[0].detail).toContain('Never invent');
  });

  it('flags an off-by-one shortfall as a WARNING (imperfect detection is more likely than data loss) with no anti-invention clause', () => {
    const issues = validateSpecCountParity(specSection(14), ORTUR_H20_SPECS, 'H20 Laser Engraving Machine', 'HTML (uk-UA)');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].detail).not.toContain('Never invent');
  });

  it('flags extra rows (actual > expected) as a WARNING — already independently caught by validateSpecsGrounding', () => {
    const issues = validateSpecCountParity(specSection(18), ORTUR_H20_SPECS, 'H20 Laser Engraving Machine', 'HTML (uk-UA)');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
  });

  it('flags the real Ortur H20 incident shape (7 actual vs 15 expected) as an ERROR', () => {
    const issues = validateSpecCountParity(specSection(7), ORTUR_H20_SPECS, 'H20 Laser Engraving Machine', 'HTML (uk-UA)');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].detail).toContain('Never invent a parameter');
  });

  it('no-ops when canonicalSpecs has no detectable table (cannot verify, not a false positive)', () => {
    const issues = validateSpecCountParity(specSection(3), 'free text, no table here', '', 'HTML (uk-UA)');
    expect(issues).toHaveLength(0);
  });

  it('propagates context', () => {
    const issues = validateSpecCountParity(specSection(1), ORTUR_H20_SPECS, 'H20 Laser Engraving Machine', 'HTML (base)');
    expect(issues[0].context).toBe('HTML (base)');
  });
});

/**
 * Regression suite: the Consumables Doc pipeline's rendered HTML never has a <section class="specs">
 * wrapper (§C forbids it — render-consumables.ts), so the default scoping always matched zero
 * tables and the check silently no-opped no matter how many rows the model actually dropped. These
 * cases mirror validateSpecCountParity's own describe above, called with the consumables overrides
 * (tableSelector: 'table', sectionLabel: '§C4 spec-group') instead of a second, duplicated function.
 */
function specGroupHtml(rowCount: number): string {
  const rows = Array.from({ length: rowCount }, (_, i) => `<tr><td>Row ${i}</td><td>${i}</td></tr>`).join('');
  return `<h2>Print Settings</h2><div class="table-responsive"><table><tbody>${rows}</tbody></table></div>`;
}

const CONSUMABLES_OPTS = { tableSelector: 'table', sectionLabel: '§C4 spec-group' };

describe('validateSpecCountParity — consumables scoping (tableSelector/sectionLabel overrides)', () => {
  it('returns no issues when counts match', () => {
    const issues = validateSpecCountParity(
      specGroupHtml(15), ORTUR_H20_SPECS, 'H20 Laser Engraving Machine', 'HTML (uk-UA)', CONSUMABLES_OPTS,
    );
    expect(issues).toHaveLength(0);
  });

  it('the default (no opts) scoping always reports "actual 0" on this fixture, regardless of real content — the exact bug this override fixes', () => {
    // section.specs matches nothing in specGroupHtml(), so countActualSpecRows always returns 0 —
    // NOT a silent no-op: it fires a permanently-wrong "row count is 0, expected N" error no matter
    // how many rows the doc actually has, which is exactly what the original incident's console
    // log showed ("§7 spec-table row count is 0, expected 26"). "0" was the selector matching
    // nothing, never the model's real row count.
    const issues = validateSpecCountParity(specGroupHtml(15), ORTUR_H20_SPECS, 'H20 Laser Engraving Machine', 'HTML (uk-UA)');
    expect(issues).toHaveLength(1);
    expect(issues[0].detail).toContain('§7 spec-table row count is 0, expected 15');
  });

  it('flags a shortfall of 5 as an ERROR with the "§C4 spec-group" wording, not "§7"', () => {
    const issues = validateSpecCountParity(
      specGroupHtml(10), ORTUR_H20_SPECS, 'H20 Laser Engraving Machine', 'HTML (uk-UA)', CONSUMABLES_OPTS,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].rule).toBe('spec-count-mismatch');
    expect(issues[0].detail).toContain('§C4 spec-group row count is 10, expected 15');
    expect(issues[0].detail).not.toContain('§7');
  });

  it('flags an off-by-one shortfall as a WARNING', () => {
    const issues = validateSpecCountParity(
      specGroupHtml(14), ORTUR_H20_SPECS, 'H20 Laser Engraving Machine', 'HTML (uk-UA)', CONSUMABLES_OPTS,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
  });

  it('flags extra rows (actual > expected) as a WARNING', () => {
    const issues = validateSpecCountParity(
      specGroupHtml(18), ORTUR_H20_SPECS, 'H20 Laser Engraving Machine', 'HTML (uk-UA)', CONSUMABLES_OPTS,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
  });

  it('no-ops when canonicalSpecs has no detectable table', () => {
    const issues = validateSpecCountParity(specGroupHtml(3), 'free text, no table here', '', 'HTML (uk-UA)', CONSUMABLES_OPTS);
    expect(issues).toHaveLength(0);
  });
});

describe('countActualSpecRows — tableSelector override', () => {
  it('counts every <table> unscoped when passed a bare "table" selector', () => {
    expect(countActualSpecRows(specGroupHtml(4), 'table')).toBe(4);
  });

  it('counts zero when the consumables shape is scanned with the default section.specs scoping', () => {
    expect(countActualSpecRows(specGroupHtml(4))).toBe(0);
  });
});

describe('expectedSpecParameterLabels', () => {
  it('on the real 20w-specs.md shape (Ortur H20) returns 15 labels and does NOT contain the Product Name row', () => {
    const labels = expectedSpecParameterLabels(ORTUR_H20_SPECS, 'H20 Laser Engraving Machine');
    expect(labels).toHaveLength(15);
    expect(labels).not.toContain('Product Name');
    expect(labels.some(l => /product name/i.test(l))).toBe(false);
  });

  it('excludes rows whose value is empty / "N/A"', () => {
    const md = `| Item | Specification |\n| :--- | :--- |\n| Weight | 12 kg |\n| Color | N/A |\n| Warranty | - |`;
    expect(expectedSpecParameterLabels(md, '')).toEqual(['Weight']);
  });

  it('strips markdown emphasis from labels (**Material** -> Material)', () => {
    const md = `| Item | Specification |\n| :--- | :--- |\n| **Material** | Aluminum |`;
    expect(expectedSpecParameterLabels(md, '')).toEqual(['Material']);
  });

  it('returns [] when no canonical table is detected', () => {
    expect(expectedSpecParameterLabels('This laser engraver has a 10W head and WiFi.', '')).toEqual([]);
  });

  it('structural invariant: countExpectedSpecRows === expectedSpecParameterLabels(...).length on every fixture', () => {
    const cases: Array<[string, string]> = [
      [ORTUR_H20_SPECS, 'H20 Laser Engraving Machine'],
      [ORTUR_H20_SPECS, 'Some Unrelated Product'],
      // Multi-table: without this case the invariant only ever ran on the input shape where the
      // single-table parser bug cannot show itself.
      [MULTI_TABLE_SPECS, 'XGRIDS L2 Pro'],
      [`| Item | Specification |\n| :--- | :--- |\n| Compatible Nozzle Model | E3D V6 |\n| Weight | 12 kg |`, 'Creality K1 Max'],
      [`| Item | Specification |\n| :--- | :--- |\n| Full Name | Ortur H20 Laser Engraving Machine |\n| Weight | 2.5 kg |`, 'H20 Laser Engraving Machine'],
      [`| Item | Specification |\n| :--- | :--- |\n| Weight | 12 kg |\n| Color | N/A |\n| Warranty | - |`, ''],
      ['This laser engraver has a 10W head and WiFi.', ''],
    ];
    for (const [specs, name] of cases) {
      expect(countExpectedSpecRows(specs, name)).toBe(expectedSpecParameterLabels(specs, name).length);
    }
  });
});

/**
 * Regression suite for the XGRIDS L2 Pro incident: the parser read only the FIRST markdown table
 * in input.specs, so a sheet split into 8 category tables yielded 8 "allowed parameters" out of
 * 45 real ones. The artifact shipped with 4 unresolved §7 errors and the repair attempt was
 * discarded, because the "ALLOWED PARAMETERS" message it was handed was false.
 */
describe('expectedSpecParameterLabels — multi-table sheets', () => {
  it('reads every table when they are separated by blank lines and headings', () => {
    const labels = expectedSpecParameterLabels(MULTI_TABLE_SPECS, 'XGRIDS L2 Pro');
    expect(labels).toEqual(['Weight', 'Storage', 'Resolution', 'Shutter', 'Resolution', 'Shutter']);
  });

  it('reads both tables when a heading is the ONLY thing between them (no blank lines)', () => {
    const md = [
      '| Item | Specification |',
      '| :--- | :--- |',
      '| Weight | 1.7 kg |',
      '## Accuracy',
      '| Item | Specification |',
      '| :--- | :--- |',
      '| RMSE | 3 cm |',
    ].join('\n');
    expect(expectedSpecParameterLabels(md, '')).toEqual(['Weight', 'RMSE']);
  });

  it('does not swallow the second table\'s header or separator as data rows when tables are adjacent', () => {
    // No blank line, no heading — table 2 starts on the line after table 1's last row. This is
    // the shape a nested-loop parser gets wrong: "Item" and ":---" are well-formed pipe rows, so
    // an inner loop that only breaks on a NON-table line happily files them as spec rows.
    const md = [
      '| Item | Specification |',
      '| :--- | :--- |',
      '| Weight | 1.7 kg |',
      '| Item | Specification |',
      '| :--- | :--- |',
      '| Storage | 1 TB SSD |',
    ].join('\n');
    const labels = expectedSpecParameterLabels(md, '');
    expect(labels).toEqual(['Weight', 'Storage']);
    expect(labels).not.toContain('Item');
    expect(labels).not.toContain(':---');
  });

  it('does not absorb prose sitting between two tables', () => {
    const md = [
      '| Item | Specification |',
      '| :--- | :--- |',
      '| Weight | 1.7 kg |',
      '',
      'Values above are typical and may vary by batch.',
      '',
      '| Item | Specification |',
      '| :--- | :--- |',
      '| Storage | 1 TB SSD |',
    ].join('\n');
    expect(expectedSpecParameterLabels(md, '')).toEqual(['Weight', 'Storage']);
  });

  it('excludes a product-name row found in the SECOND table, not only the first', () => {
    const md = [
      '| Item | Specification |',
      '| :--- | :--- |',
      '| Weight | 1.7 kg |',
      '',
      '| Item | Specification |',
      '| :--- | :--- |',
      '| Product Name | XGRIDS L2 Pro |',
      '| RMSE | 3 cm |',
    ].join('\n');
    const labels = expectedSpecParameterLabels(md, 'XGRIDS L2 Pro');
    expect(labels).toEqual(['Weight', 'RMSE']);
  });

  it('keeps BOTH occurrences of a label repeated across tables — the list is a string[], never a Set', () => {
    // Two cameras legitimately each have a "Resolution" row. Collapsing them would tell the
    // repair model that one of the two rows is unaccounted for, i.e. instruct it to delete data.
    const labels = expectedSpecParameterLabels(MULTI_TABLE_SPECS, 'XGRIDS L2 Pro');
    expect(labels.filter(l => l === 'Resolution')).toHaveLength(2);
    expect(labels.filter(l => l === 'Shutter')).toHaveLength(2);
    expect(countExpectedSpecRows(MULTI_TABLE_SPECS, 'XGRIDS L2 Pro')).toBe(6);
  });

  it('still excludes empty/"N/A" values in a later table', () => {
    const md = [
      '| Item | Specification |',
      '| :--- | :--- |',
      '| Weight | 1.7 kg |',
      '',
      '| Item | Specification |',
      '| :--- | :--- |',
      '| Colour | N/A |',
      '| Storage | 1 TB SSD |',
    ].join('\n');
    expect(expectedSpecParameterLabels(md, '')).toEqual(['Weight', 'Storage']);
  });
});

describe('findMalformedTableLines', () => {
  // Mirrors the real Knowlege/20w-specs.md defect: line 10 ("Laser Head Power") is missing its
  // closing "|". File uses CRLF line endings on disk — reproduced here to prove that doesn't
  // interfere with detection.
  const REAL_DEFECT_SHAPE =
    '| Item | Specification |\r\n' +
    '| :--- | :--- |\r\n' +
    '| **Product Name** | H20 Laser Engraving Machine |\r\n' +
    '| **Material** | Aluminum Alloy |\r\n' +
    '| **Screen** | 1.3-inch OLED |\r\n' +
    '| **Exhaust Fan** | Yes |\r\n' +
    '| **Emergency Stop Button** | Yes |\r\n' +
    '| **Interfaces** | USB, DC Interface, TF Card |\r\n' +
    '| **Child Lock** | Yes |\r\n' +
    '| **Laser Head Power** | 20W\r\n' +
    '| **Laser Head Focusing Method** | Manual focus |';

  it('flags the real defect shape (missing closing "|") at the correct 1-indexed line number', () => {
    expect(findMalformedTableLines(REAL_DEFECT_SHAPE)).toEqual([10]);
  });

  it('returns [] for a well-formed table', () => {
    expect(findMalformedTableLines(ORTUR_H20_SPECS)).toEqual([]);
  });

  it('never flags the header or separator rows', () => {
    const md = `| Item | Specification |\n| :--- | :--- |\n| Weight | 12 kg |`;
    expect(findMalformedTableLines(md)).toEqual([]);
  });
});

describe('validateSpecCountParity — spec-table-malformed-row', () => {
  it('emits a spec-table-malformed-row warning even when actual === expected by coincidence (independent of the count check)', () => {
    // Malformed row (line 6, missing closing "|") comes AFTER every well-formed row, so it
    // cannot itself change countExpectedSpecRows's result (parseCanonicalRows stops scanning at
    // the first malformed line either way) — expected is computed dynamically and actual is set
    // to match it exactly, isolating "counts coincidentally agree" from "source is malformed".
    const md =
      '| Item | Specification |\r\n' +
      '| :--- | :--- |\r\n' +
      '| **Material** | Aluminum Alloy |\r\n' +
      '| **Screen** | 1.3-inch OLED |\r\n' +
      '| **Exhaust Fan** | Yes |\r\n' +
      '| **Laser Head Power** | 20W\r\n';
    const expected = countExpectedSpecRows(md, '');
    expect(expected).toBeGreaterThan(0);

    const issues = validateSpecCountParity(specSection(expected), md, '', 'HTML (uk-UA)');
    const malformedIssues = issues.filter(i => i.rule === 'spec-table-malformed-row');
    expect(malformedIssues).toHaveLength(1);
    expect(malformedIssues[0].severity).toBe('warning');
    expect(malformedIssues[0].detail).toContain('line(s) 6');
    // No spec-count-mismatch alongside it — counts genuinely matched (by coincidence).
    expect(issues.filter(i => i.rule === 'spec-count-mismatch')).toHaveLength(0);
  });

  it('emits no spec-table-malformed-row warning for a well-formed source', () => {
    const issues = validateSpecCountParity(specSection(15), ORTUR_H20_SPECS, 'H20 Laser Engraving Machine', 'HTML (uk-UA)');
    expect(issues.filter(i => i.rule === 'spec-table-malformed-row')).toHaveLength(0);
  });
});

function specDoc(rowCount: number, categoryCount = 1): ProductDescriptionDoc['specs'] {
  const perCategory = Math.ceil(rowCount / categoryCount);
  const categories: SpecCategory[] = [];
  let remaining = rowCount;
  for (let c = 0; c < categoryCount; c++) {
    const n = Math.min(perCategory, remaining);
    categories.push({
      title: `Cat${c}`,
      rows: Array.from({ length: n }, (_, i) => ({ label: `Row ${i}`, value: `${i}` })),
    });
    remaining -= n;
  }
  return { heading: 'Технічні характеристики', categories };
}

function baseDoc(specs: ProductDescriptionDoc['specs']): ProductDescriptionDoc {
  return {
    schemaVersion: '3.0',
    locale: 'uk-UA',
    localizedName: 'H20 Laser Engraving Machine',
    hook: 'Hook.',
    killerSpecs: [
      { label: 'A', value: '1', why: 'why a' },
      { label: 'B', value: '2', why: 'why b' },
      { label: 'C', value: '3', why: 'why c' },
    ],
    keyBenefits: [],
    functionality: [],
    applications: { heading: 'Застосування', items: [] },
    specs,
    cta: { heading: 'CTA', text: 'Купуйте.' },
    figures: [],
    videos: [],
  };
}

describe('countActualSpecRowsDoc', () => {
  it('sums SpecRow entries across one category', () => {
    expect(countActualSpecRowsDoc(baseDoc(specDoc(15)))).toBe(15);
  });

  it('sums across multiple categories', () => {
    expect(countActualSpecRowsDoc(baseDoc(specDoc(9, 3)))).toBe(9);
  });

  it('returns 0 for a doc with no spec rows at all', () => {
    expect(countActualSpecRowsDoc(baseDoc({ heading: 'Специфікації', categories: [] }))).toBe(0);
  });

  it('does not throw on a category with an empty rows array', () => {
    const doc = baseDoc({ heading: 'Специфікації', categories: [{ title: 'Cat', rows: [] }] });
    expect(() => countActualSpecRowsDoc(doc)).not.toThrow();
    expect(countActualSpecRowsDoc(doc)).toBe(0);
  });
});

describe('validateSpecCountParityDoc', () => {
  it('returns no issues when counts match', () => {
    const doc = baseDoc(specDoc(15));
    const issues = validateSpecCountParityDoc(doc, ORTUR_H20_SPECS, 'H20 Laser Engraving Machine', 'Doc (uk-UA)');
    expect(issues).toHaveLength(0);
  });

  it('flags a shortfall of 5 as an ERROR with an anti-invention instruction, naming specs.categories[]', () => {
    const doc = baseDoc(specDoc(10));
    const issues = validateSpecCountParityDoc(doc, ORTUR_H20_SPECS, 'H20 Laser Engraving Machine', 'Doc (uk-UA)');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].rule).toBe('spec-count-mismatch');
    expect(issues[0].detail).toContain('is 10, expected 15');
    expect(issues[0].detail).toContain('specs.categories[]');
    expect(issues[0].detail).toContain('Never invent');
  });

  it('flags an off-by-one shortfall as a WARNING with no anti-invention clause', () => {
    const doc = baseDoc(specDoc(14));
    const issues = validateSpecCountParityDoc(doc, ORTUR_H20_SPECS, 'H20 Laser Engraving Machine', 'Doc (uk-UA)');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].detail).not.toContain('Never invent');
  });

  it('flags extra rows (actual > expected) as a WARNING', () => {
    const doc = baseDoc(specDoc(18));
    const issues = validateSpecCountParityDoc(doc, ORTUR_H20_SPECS, 'H20 Laser Engraving Machine', 'Doc (uk-UA)');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
  });

  it('sums rows across multiple categories, matching countActualSpecRowsDoc', () => {
    const doc = baseDoc(specDoc(15, 3));
    expect(validateSpecCountParityDoc(doc, ORTUR_H20_SPECS, 'H20 Laser Engraving Machine', 'Doc (uk-UA)')).toEqual([]);
  });

  it('no-ops when canonicalSpecs has no detectable table', () => {
    const doc = baseDoc(specDoc(3));
    expect(validateSpecCountParityDoc(doc, 'free text, no table here', '', 'Doc (uk-UA)')).toEqual([]);
  });

  it('does not throw on a doc with zero spec rows, even though it still (correctly) emits a shortfall error', () => {
    // Zero actual rows against a 15-row expected count is a real, large shortfall — this asserts
    // null/undefined-safety (no throw on the degenerate `categories: []` shape), not a no-op; the
    // count check itself still fires exactly as it would for any other undercount.
    const doc = baseDoc({ heading: 'Специфікації', categories: [] });
    expect(() => validateSpecCountParityDoc(doc, ORTUR_H20_SPECS, 'H20 Laser Engraving Machine', 'Doc (uk-UA)')).not.toThrow();
    const issues = validateSpecCountParityDoc(doc, ORTUR_H20_SPECS, 'H20 Laser Engraving Machine', 'Doc (uk-UA)');
    expect(issues.some(i => i.rule === 'spec-count-mismatch' && i.severity === 'error')).toBe(true);
  });

  it('still emits spec-table-malformed-row independently of the count check', () => {
    const md =
      '| Item | Specification |\r\n' +
      '| :--- | :--- |\r\n' +
      '| **Material** | Aluminum Alloy |\r\n' +
      '| **Screen** | 1.3-inch OLED |\r\n' +
      '| **Exhaust Fan** | Yes |\r\n' +
      '| **Laser Head Power** | 20W\r\n';
    const expected = countExpectedSpecRows(md, '');
    const doc = baseDoc(specDoc(expected));
    const issues = validateSpecCountParityDoc(doc, md, '', 'Doc (uk-UA)');
    const malformedIssues = issues.filter(i => i.rule === 'spec-table-malformed-row');
    expect(malformedIssues).toHaveLength(1);
    expect(issues.filter(i => i.rule === 'spec-count-mismatch')).toHaveLength(0);
  });

  it('propagates context', () => {
    const doc = baseDoc(specDoc(1));
    const issues = validateSpecCountParityDoc(doc, ORTUR_H20_SPECS, 'H20 Laser Engraving Machine', 'Doc (base)');
    expect(issues[0].context).toBe('Doc (base)');
  });
});

import { describe, it, expect } from 'vitest';
import { countExpectedSpecRows, countActualSpecRows, validateSpecCountParity, expectedSpecParameterLabels, findMalformedTableLines } from './spec-count-parity';

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

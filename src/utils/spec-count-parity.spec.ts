import { describe, it, expect } from 'vitest';
import { countExpectedSpecRows, countActualSpecRows, validateSpecCountParity, expectedSpecParameterLabels } from './spec-count-parity';

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

  it('flags a mismatch as a WARNING (not error — does not trigger repair-gate)', () => {
    const issues = validateSpecCountParity(specSection(10), ORTUR_H20_SPECS, 'H20 Laser Engraving Machine', 'HTML (uk-UA)');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].rule).toBe('spec-count-mismatch');
    expect(issues[0].detail).toContain('is 10, expected 15');
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

import { describe, it, expect } from 'vitest';
import { fixNumberFormatting } from './number-format-fixer';

describe('fixNumberFormatting — thousands separators', () => {
  describe('comma (EN format)', () => {
    it('strips a single comma group: 1,000 → 1000', () => {
      expect(fixNumberFormatting('laser power 1,000 mW')).toBe('laser power 1000 mW');
    });

    it('strips 1,250 → 1250', () => {
      expect(fixNumberFormatting('speed up to 1,250 mm/s')).toBe('speed up to 1250 mm/s');
    });

    it('strips chained comma groups: 1,234,567 → 1234567', () => {
      expect(fixNumberFormatting('volume 1,234,567 µm³')).toBe('volume 1234567 µm³');
    });

    it('preserves decimal comma (1,5 stays 1,5 — only 1 digit after comma)', () => {
      expect(fixNumberFormatting('accuracy 1,5 mm')).toBe('accuracy 1,5 mm');
    });

    it('preserves decimal comma with 2 digits (1,75 stays 1,75)', () => {
      expect(fixNumberFormatting('nozzle 1,75 mm')).toBe('nozzle 1,75 mm');
    });

    it('does NOT corrupt a leading-zero decimal comma-group: 0,330 stays', () => {
      expect(fixNumberFormatting('throughput 0,330 kg/hr')).toBe('throughput 0,330 kg/hr');
    });

    it('does NOT corrupt a leading-zero decimal comma-group with more digits: 0,0129 stays', () => {
      expect(fixNumberFormatting('spot size 0,0129 mm')).toBe('spot size 0,0129 mm');
    });
  });

  describe('space (UA / nbsp format)', () => {
    it('strips a regular-space group: 1 000 → 1000', () => {
      expect(fixNumberFormatting('power 1 000 mW')).toBe('power 1000 mW');
    });

    it('strips 1 250 → 1250', () => {
      expect(fixNumberFormatting('speed 1 250 mm/s')).toBe('speed 1250 mm/s');
    });

    it('strips chained space groups: 1 234 567 → 1234567', () => {
      expect(fixNumberFormatting('count 1 234 567')).toBe('count 1234567');
    });

    it('strips non-breaking space (U+00A0)', () => {
      expect(fixNumberFormatting('power 1 000 mW')).toBe('power 1000 mW');
    });

    it('strips thin space (U+202F)', () => {
      expect(fixNumberFormatting('price 1 000 UAH')).toBe('price 1000 UAH');
    });
  });

  describe('period (ES / DE format)', () => {
    it('strips a single period group: 1.000 → 1000', () => {
      expect(fixNumberFormatting('potencia 1.000 mW')).toBe('potencia 1000 mW');
    });

    it('strips 1.250 → 1250', () => {
      expect(fixNumberFormatting('velocidad 1.250 mm/s')).toBe('velocidad 1250 mm/s');
    });

    it('strips chained period groups: 1.234.567 → 1234567', () => {
      expect(fixNumberFormatting('valor 1.234.567')).toBe('valor 1234567');
    });

    it('does NOT corrupt a leading-zero decimal that looks like a period group: 0.004 stays', () => {
      expect(fixNumberFormatting('tolerance 0.004 in')).toBe('tolerance 0.004 in');
    });

    it('does NOT corrupt a leading-zero decimal with more than 3 fractional digits: 0.0129 stays', () => {
      expect(fixNumberFormatting('spot size 0.0129 in')).toBe('spot size 0.0129 in');
    });

    it('preserves decimal dot with 1 digit (1.5 stays)', () => {
      expect(fixNumberFormatting('nozzle 1.5 mm')).toBe('nozzle 1.5 mm');
    });

    it('preserves decimal dot with 2 digits (1.75 stays)', () => {
      expect(fixNumberFormatting('filament 1.75 mm')).toBe('filament 1.75 mm');
    });
  });
});

describe('fixNumberFormatting — unit spaces', () => {
  it('adds a non-breaking space: 2mm → 2 mm', () => {
    expect(fixNumberFormatting('layer height 2mm')).toBe('layer height 2 mm');
  });

  it('adds a non-breaking space after decimal: 1.75mm → 1.75 mm', () => {
    expect(fixNumberFormatting('diameter 1.75mm')).toBe('diameter 1.75 mm');
  });

  it('adds a non-breaking space for µm', () => {
    expect(fixNumberFormatting('resolution 50µm')).toBe('resolution 50 µm');
  });

  it('adds a non-breaking space for μm (alternate encoding)', () => {
    expect(fixNumberFormatting('resolution 50μm')).toBe('resolution 50 μm');
  });

  it('adds a non-breaking space for °C', () => {
    expect(fixNumberFormatting('max temp 260°C')).toBe('max temp 260 °C');
  });

  it('adds a non-breaking space for °F', () => {
    expect(fixNumberFormatting('max temp 500°F')).toBe('max temp 500 °F');
  });

  it('adds a non-breaking space for W (watts)', () => {
    expect(fixNumberFormatting('power 50W')).toBe('power 50 W');
  });

  it('adds a non-breaking space for mW', () => {
    expect(fixNumberFormatting('laser 500mW')).toBe('laser 500 mW');
  });

  it('adds a non-breaking space for kHz', () => {
    expect(fixNumberFormatting('frequency 20kHz')).toBe('frequency 20 kHz');
  });

  it('does NOT modify already-spaced values (idempotent)', () => {
    expect(fixNumberFormatting('layer height 2 mm')).toBe('layer height 2 mm');
    expect(fixNumberFormatting('temp 260 °C')).toBe('temp 260 °C');
  });

  it('processes alt text values (human-readable spec mentions get the space)', () => {
    const html = '<img alt="2mm layer height sample">';
    expect(fixNumberFormatting(html)).toContain('alt="2 mm layer height sample"');
  });

  it('does NOT add space for display resolution K: 4K stays 4K', () => {
    expect(fixNumberFormatting('4K mono LCD')).toBe('4K mono LCD');
    expect(fixNumberFormatting('8K resolution')).toBe('8K resolution');
  });

  it('does add a non-breaking space for Kelvin K: 6500K → 6500 K', () => {
    expect(fixNumberFormatting('6500K color temp')).toBe('6500 K color temp');
  });

  it('adds a non-breaking space for MPa', () => {
    expect(fixNumberFormatting('tensile 60MPa')).toBe('tensile 60 MPa');
  });

  it('adds a non-breaking space for GPa', () => {
    expect(fixNumberFormatting('modulus 1.93GPa')).toBe('modulus 1.93 GPa');
  });
});

describe('fixNumberFormatting — Cyrillic unit spaces (uk/ru output, [UNIT LOCALIZATION])', () => {
  it('adds a non-breaking space for Вт and кВт (with decimal comma value)', () => {
    expect(fixNumberFormatting('<p>Потужність 10Вт, 1,5кВт</p>')).toBe('<p>Потужність 10 Вт, 1,5 кВт</p>');
  });

  it('adds a non-breaking space for мм in a spec-table cell', () => {
    expect(fixNumberFormatting('<td>200мм</td>')).toBe('<td>200 мм</td>');
  });

  it('adds a non-breaking space for мкм', () => {
    expect(fixNumberFormatting('<td>50мкм</td>')).toBe('<td>50 мкм</td>');
  });

  it('adds a non-breaking space for ГГц', () => {
    expect(fixNumberFormatting('<td>2,4ГГц</td>')).toBe('<td>2,4 ГГц</td>');
  });

  it('adds a non-breaking space for composite мм/с', () => {
    expect(fixNumberFormatting('швидкість 300мм/с')).toBe('швидкість 300 мм/с');
  });

  it('adds a non-breaking space for кг, г, л, мл', () => {
    expect(fixNumberFormatting('вага 2,5кг')).toBe('вага 2,5 кг');
    expect(fixNumberFormatting('маса 500г')).toBe('маса 500 г');
    expect(fixNumberFormatting("об'єм 1л")).toBe("об'єм 1 л");
    expect(fixNumberFormatting('смола 500мл')).toBe('смола 500 мл');
  });

  it('adds a non-breaking space for В, кВ, А, мА·год', () => {
    expect(fixNumberFormatting('напруга 220В')).toBe('напруга 220 В');
    expect(fixNumberFormatting('ізоляція 5кВ')).toBe('ізоляція 5 кВ');
    expect(fixNumberFormatting('струм 2А')).toBe('струм 2 А');
    expect(fixNumberFormatting('акумулятор 5000мА·год')).toBe('акумулятор 5000 мА·год');
  });

  it('adds a non-breaking space for data units ГБ / Мбіт / Мбит', () => {
    expect(fixNumberFormatting("пам'ять 32ГБ")).toBe("пам'ять 32 ГБ");
    expect(fixNumberFormatting('швидкість 100Мбіт')).toBe('швидкість 100 Мбіт');
    expect(fixNumberFormatting('скорость 100Мбит')).toBe('скорость 100 Мбит');
  });

  it('adds a non-breaking space for м² and об/хв', () => {
    expect(fixNumberFormatting('площа 2м²')).toBe('площа 2 м²');
    expect(fixNumberFormatting('оберти 3000об/хв')).toBe('оберти 3000 об/хв');
  });

  it('does NOT split when the letters continue a Cyrillic word (word-boundary guard)', () => {
    // "шт." is not a measurement unit — count abbreviations are handled by the prompt, not the fixer
    expect(fixNumberFormatting('<p>3шт.</p>')).toBe('<p>3шт.</p>');
    // "мм" followed by a Cyrillic letter is part of a token, not a unit
    expect(fixNumberFormatting('код 5ммХ')).toBe('код 5ммХ');
  });

  it('does NOT touch Cyrillic units inside src/href, still fixes alt', () => {
    const html = '<img src="laser-500мВт.jpg" alt="модуль 500мВт">';
    expect(fixNumberFormatting(html)).toBe('<img src="laser-500мВт.jpg" alt="модуль 500 мВт">');
  });

  it('does NOT modify already-spaced Cyrillic values (idempotent)', () => {
    expect(fixNumberFormatting('потужність 10 Вт')).toBe('потужність 10 Вт');
    const once = fixNumberFormatting('<td>10Вт, 200мм, 2,4ГГц</td>');
    expect(fixNumberFormatting(once)).toBe(once);
  });
});

describe('fixNumberFormatting — combined', () => {
  it('strips thousands separator AND adds a non-breaking unit space in one pass', () => {
    expect(fixNumberFormatting('power 1,000mW')).toBe('power 1000 mW');
  });

  it('handles a realistic HTML snippet (EN)', () => {
    const input = '<li><strong>Laser Power:</strong> 1,000 mW, spot size 50µm, max temp 80°C</li>';
    const expected = '<li><strong>Laser Power:</strong> 1000 mW, spot size 50 µm, max temp 80 °C</li>';
    expect(fixNumberFormatting(input)).toBe(expected);
  });

  it('handles a realistic HTML snippet (UA)', () => {
    const input = '<li>Потужність: 1 000 мВт, розмір плями 50µm</li>';
    const expected = '<li>Потужність: 1000 мВт, розмір плями 50 µm</li>';
    expect(fixNumberFormatting(input)).toBe(expected);
  });

  it('handles a realistic cyrillized UA snippet (thousands + Cyrillic unit spacing)', () => {
    const input = '<li>Потужність: 1 000мВт, швидкість 1 250мм/с, темп. 80°C</li>';
    const expected = '<li>Потужність: 1000 мВт, швидкість 1250 мм/с, темп. 80 °C</li>';
    expect(fixNumberFormatting(input)).toBe(expected);
  });

  it('handles a realistic HTML snippet (ES)', () => {
    const input = '<li>Potencia: 1.000 mW, velocidad 1.250 mm/s</li>';
    const expected = '<li>Potencia: 1000 mW, velocidad 1250 mm/s</li>';
    expect(fixNumberFormatting(input)).toBe(expected);
  });

  it('is fully idempotent — running twice gives the same result', () => {
    const input = 'power 1,000mW, speed 1,250 mm/s, temp 80°C';
    const once = fixNumberFormatting(input);
    const twice = fixNumberFormatting(once);
    expect(twice).toBe(once);
  });
});

describe('fixNumberFormatting — tag protection', () => {
  it('leaves src attribute completely unchanged', () => {
    const html = '<img src="impresora-3d-12mm.jpg">';
    expect(fixNumberFormatting(html)).toBe('<img src="impresora-3d-12mm.jpg">');
  });

  it('leaves href attribute completely unchanged', () => {
    const html = '<a href="/categoria/impresora-3d-1.000mm">';
    expect(fixNumberFormatting(html)).toBe('<a href="/categoria/impresora-3d-1.000mm">');
  });

  it('leaves style attribute completely unchanged', () => {
    const html = '<figure style="width:1000px; margin:12mm auto;">';
    expect(fixNumberFormatting(html)).toBe('<figure style="width:1000px; margin:12mm auto;">');
  });

  it('still processes alt attribute value', () => {
    const html = '<img alt="500mW laser spot 50µm">';
    expect(fixNumberFormatting(html)).toBe('<img alt="500 mW laser spot 50 µm">');
  });

  it('processes alt but leaves src untouched in the same tag', () => {
    const html = '<img src="laser-500mW-module.jpg" alt="500mW module" loading="lazy">';
    expect(fixNumberFormatting(html)).toBe('<img src="laser-500mW-module.jpg" alt="500 mW module" loading="lazy">');
  });

  it('still processes text nodes between tags', () => {
    const html = '<figcaption>Spot size: 50µm, power 1,000mW</figcaption>';
    expect(fixNumberFormatting(html)).toBe('<figcaption>Spot size: 50 µm, power 1000 mW</figcaption>');
  });

  it('handles a full figure block: src/href untouched, text and alt formatted', () => {
    const input = [
      '<figure>',
      '<a href="/products/laser-1.000mW-module">',
      '<img src="laser-1.000mW-12mm.jpg" alt="1.000mW laser 12mm spot">',
      '</a>',
      '<figcaption>Laser module — power 1.000mW, spot 12mm</figcaption>',
      '</figure>',
    ].join('');
    const expected = [
      '<figure>',
      '<a href="/products/laser-1.000mW-module">',
      '<img src="laser-1.000mW-12mm.jpg" alt="1000 mW laser 12 mm spot">',
      '</a>',
      '<figcaption>Laser module — power 1000 mW, spot 12 mm</figcaption>',
      '</figure>',
    ].join('');
    expect(fixNumberFormatting(input)).toBe(expected);
  });
});

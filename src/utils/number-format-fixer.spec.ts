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
  });

  describe('space (UA / nbsp format)', () => {
    it('strips a regular-space group: 1 000 → 1000', () => {
      expect(fixNumberFormatting('power 1 000 mW')).toBe('power 1000 mW');
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

    it('preserves decimal dot with 1 digit (1.5 stays)', () => {
      expect(fixNumberFormatting('nozzle 1.5 mm')).toBe('nozzle 1.5 mm');
    });

    it('preserves decimal dot with 2 digits (1.75 stays)', () => {
      expect(fixNumberFormatting('filament 1.75 mm')).toBe('filament 1.75 mm');
    });
  });
});

describe('fixNumberFormatting — unit spaces', () => {
  it('adds space: 2mm → 2 mm', () => {
    expect(fixNumberFormatting('layer height 2mm')).toBe('layer height 2 mm');
  });

  it('adds space after decimal: 1.75mm → 1.75 mm', () => {
    expect(fixNumberFormatting('diameter 1.75mm')).toBe('diameter 1.75 mm');
  });

  it('adds space for µm', () => {
    expect(fixNumberFormatting('resolution 50µm')).toBe('resolution 50 µm');
  });

  it('adds space for μm (alternate encoding)', () => {
    expect(fixNumberFormatting('resolution 50μm')).toBe('resolution 50 μm');
  });

  it('adds space for °C', () => {
    expect(fixNumberFormatting('max temp 260°C')).toBe('max temp 260 °C');
  });

  it('adds space for °F', () => {
    expect(fixNumberFormatting('max temp 500°F')).toBe('max temp 500 °F');
  });

  it('adds space for W (watts)', () => {
    expect(fixNumberFormatting('power 50W')).toBe('power 50 W');
  });

  it('adds space for mW', () => {
    expect(fixNumberFormatting('laser 500mW')).toBe('laser 500 mW');
  });

  it('adds space for kHz', () => {
    expect(fixNumberFormatting('frequency 20kHz')).toBe('frequency 20 kHz');
  });

  it('does NOT modify already-spaced values (idempotent)', () => {
    expect(fixNumberFormatting('layer height 2 mm')).toBe('layer height 2 mm');
    expect(fixNumberFormatting('temp 260 °C')).toBe('temp 260 °C');
  });

  it('processes alt text values (human-readable spec mentions get the space)', () => {
    const html = '<img alt="2mm layer height sample">';
    expect(fixNumberFormatting(html)).toContain('alt="2 mm layer height sample"');
  });

  it('does NOT add space for display resolution K: 4K stays 4K', () => {
    expect(fixNumberFormatting('4K mono LCD')).toBe('4K mono LCD');
    expect(fixNumberFormatting('8K resolution')).toBe('8K resolution');
  });

  it('does add space for Kelvin K: 6500K → 6500 K', () => {
    expect(fixNumberFormatting('6500K color temp')).toBe('6500 K color temp');
  });

  it('adds space for MPa', () => {
    expect(fixNumberFormatting('tensile 60MPa')).toBe('tensile 60 MPa');
  });

  it('adds space for GPa', () => {
    expect(fixNumberFormatting('modulus 1.93GPa')).toBe('modulus 1.93 GPa');
  });
});

describe('fixNumberFormatting — combined', () => {
  it('strips thousands separator AND adds unit space in one pass', () => {
    expect(fixNumberFormatting('power 1,000mW')).toBe('power 1000 mW');
  });

  it('handles a realistic HTML snippet (EN)', () => {
    const input = '<li><strong>Laser Power:</strong> 1,000 mW, spot size 50µm, max temp 80°C</li>';
    const expected = '<li><strong>Laser Power:</strong> 1000 mW, spot size 50 µm, max temp 80 °C</li>';
    expect(fixNumberFormatting(input)).toBe(expected);
  });

  it('handles a realistic HTML snippet (UA)', () => {
    const input = '<li>Потужність: 1 000 мВт, розмір плями 50µm</li>';
    const expected = '<li>Потужність: 1000 мВт, розмір плями 50 µm</li>';
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
    expect(fixNumberFormatting(html)).toBe('<img alt="500 mW laser spot 50 µm">');
  });

  it('processes alt but leaves src untouched in the same tag', () => {
    const html = '<img src="laser-500mW-module.jpg" alt="500mW module" loading="lazy">';
    expect(fixNumberFormatting(html)).toBe('<img src="laser-500mW-module.jpg" alt="500 mW module" loading="lazy">');
  });

  it('still processes text nodes between tags', () => {
    const html = '<figcaption>Spot size: 50µm, power 1,000mW</figcaption>';
    expect(fixNumberFormatting(html)).toBe('<figcaption>Spot size: 50 µm, power 1000 mW</figcaption>');
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
      '<img src="laser-1.000mW-12mm.jpg" alt="1000 mW laser 12 mm spot">',
      '</a>',
      '<figcaption>Laser module — power 1000 mW, spot 12 mm</figcaption>',
      '</figure>',
    ].join('');
    expect(fixNumberFormatting(input)).toBe(expected);
  });
});

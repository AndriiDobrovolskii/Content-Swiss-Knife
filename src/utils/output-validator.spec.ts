/**
 * output-validator.spec.ts
 *
 * Regression guard for src/utils/output-validator.ts.
 *
 * WHY THIS FILE EXISTS
 * output-validator.ts encodes ALL hard acceptance criteria from CLAUDE.md in
 * deterministic code. If Claude Code silently weakens a regex, removes a check,
 * or changes severity from 'error' to 'warning', these tests catch it immediately
 * — before any real LLM call is made.
 *
 * COVERAGE TARGETS (14 rules total)
 *   HTML checks:   empty-output, duplicate-product-schema, no-faqpage-in-body, no-howto-in-body,
 *                  markdown-fence, br-spacing, unit-spacing, decimal-separator,
 *                  thousands-separator, latin-unit-in-cyrillic-text, es-forbidden-calque,
 *                  pt-forbidden-calque, lcp-image-lazy, image-not-lazy
 *   SEO checks:    seo-empty, meta-title-length, meta-description-length,
 *                  meta-description-cta, meta-description-currency
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import {
  validateGeneratedHtml,
  validateSeoMetadata,
  type ValidationIssue,
} from './output-validator';
import type { SeoResponse } from '../app/types';

// ─── helpers ───────────────────────────────────────────────────────────────

/** Find issues with a specific rule name. */
function findRule(issues: ValidationIssue[], rule: string): ValidationIssue | undefined {
  return issues.find(i => i.rule === rule);
}

/** Assert NO issue with a specific rule exists. */
function expectNoRule(issues: ValidationIssue[], rule: string): void {
  const hit = findRule(issues, rule);
  expect(hit, `Rule "${rule}" should NOT fire but got: ${JSON.stringify(hit)}`).toBeUndefined();
}

/** Minimal valid SeoResponse factory. */
function makeSeo(overrides: Partial<{
  meta_title: string;
  meta_description: string;
  language: string;
}>): SeoResponse {
  return {
    site_name: 'TestStore',
    seo_data: [{
      language: overrides.language ?? 'en',
      h1: 'Test Product',
      meta_title: overrides.meta_title ?? 'Short Title | TestStore',
      meta_description: overrides.meta_description ?? 'Buy now for only $199 ➔',
    }],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// validateGeneratedHtml
// ═══════════════════════════════════════════════════════════════════════════

describe('validateGeneratedHtml — Rule: empty-output', () => {
  it('flags empty string', () => {
    const issues = validateGeneratedHtml('', 'test');
    expect(findRule(issues, 'empty-output')?.severity).toBe('error');
  });

  it('flags whitespace-only string', () => {
    const issues = validateGeneratedHtml('   \n\t  ', 'test');
    expect(findRule(issues, 'empty-output')?.severity).toBe('error');
  });

  it('does NOT flag non-empty HTML', () => {
    const issues = validateGeneratedHtml('<p>Hello world</p>', 'test');
    expectNoRule(issues, 'empty-output');
  });

  it('stops all further checks when empty (returns early)', () => {
    const issues = validateGeneratedHtml('', 'test');
    // Only one issue should be returned — no other checks run.
    expect(issues).toHaveLength(1);
  });
});

describe('validateGeneratedHtml — Rule: duplicate-product-schema', () => {
  it('flags itemtype="https://schema.org/Product" (double-quote)', () => {
    const html = `<div itemtype="https://schema.org/Product"><p>x</p></div>`;
    expect(findRule(validateGeneratedHtml(html, 'test'), 'duplicate-product-schema')?.severity).toBe('error');
  });

  it('flags itemtype=\'https://schema.org/Product\' (single-quote)', () => {
    const html = `<div itemtype='https://schema.org/Product'><p>x</p></div>`;
    expect(findRule(validateGeneratedHtml(html, 'test'), 'duplicate-product-schema')?.severity).toBe('error');
  });

  it('flags http:// variant (not just https)', () => {
    const html = `<div itemtype="http://schema.org/Product"><p>x</p></div>`;
    expect(findRule(validateGeneratedHtml(html, 'test'), 'duplicate-product-schema')?.severity).toBe('error');
  });

  it('does NOT flag schema.org/PropertyValue (safe microdata)', () => {
    const html = `<tr itemprop="additionalProperty" itemscope itemtype="https://schema.org/PropertyValue">
      <th scope="row" itemprop="name">Nozzle</th>
      <td itemprop="value">0.4 mm</td></tr>`;
    expectNoRule(validateGeneratedHtml(html, 'test'), 'duplicate-product-schema');
  });

  it('does NOT fire duplicate-product-schema for FAQPage (fires no-faqpage-in-body instead)', () => {
    const html = `<section itemscope itemtype="https://schema.org/FAQPage"><p>FAQ</p></section>`;
    expectNoRule(validateGeneratedHtml(html, 'test'), 'duplicate-product-schema');
  });

  it('does NOT flag schema.org/ProductGroup (no word boundary fire)', () => {
    const html = `<div itemtype="https://schema.org/ProductGroup"><p>x</p></div>`;
    expectNoRule(validateGeneratedHtml(html, 'test'), 'duplicate-product-schema');
  });

  it('does NOT fire duplicate-product-schema for HowTo (fires no-howto-in-body instead)', () => {
    const html = `<section itemscope itemtype="https://schema.org/HowTo"><p>Step 1</p></section>`;
    expectNoRule(validateGeneratedHtml(html, 'test'), 'duplicate-product-schema');
  });
});

describe('validateGeneratedHtml — Rule: no-faqpage-in-body', () => {
  it('flags FAQPage in body with https://', () => {
    const html = `<section itemscope itemtype="https://schema.org/FAQPage"><p>FAQ</p></section>`;
    expect(findRule(validateGeneratedHtml(html, 'test'), 'no-faqpage-in-body')?.severity).toBe('error');
  });

  it('flags FAQPage in body with http://', () => {
    const html = `<section itemscope itemtype="http://schema.org/FAQPage"><p>FAQ</p></section>`;
    expect(findRule(validateGeneratedHtml(html, 'test'), 'no-faqpage-in-body')?.severity).toBe('error');
  });

  it('does NOT flag PropertyValue (safe microdata)', () => {
    const html = `<tr itemprop="additionalProperty" itemscope itemtype="https://schema.org/PropertyValue">
      <th scope="row" itemprop="name">Nozzle</th>
      <td itemprop="value">0.4 mm</td></tr>`;
    expectNoRule(validateGeneratedHtml(html, 'test'), 'no-faqpage-in-body');
  });

  it('does NOT flag clean HTML with no microdata', () => {
    const html = '<section><p>No FAQ here.</p></section>';
    expectNoRule(validateGeneratedHtml(html, 'test'), 'no-faqpage-in-body');
  });

  it('propagates context to the issue', () => {
    const html = `<section itemscope itemtype="https://schema.org/FAQPage"><p>Q?</p></section>`;
    const issue = findRule(validateGeneratedHtml(html, 'HTML (UA)'), 'no-faqpage-in-body');
    expect(issue?.context).toBe('HTML (UA)');
  });
});

describe('validateGeneratedHtml — Rule: no-howto-in-body', () => {
  it('flags HowTo in body with https://', () => {
    const html = `<section itemscope itemtype="https://schema.org/HowTo"><p>Step 1</p></section>`;
    expect(findRule(validateGeneratedHtml(html, 'test'), 'no-howto-in-body')?.severity).toBe('error');
  });

  it('flags HowTo in body with http://', () => {
    const html = `<section itemscope itemtype="http://schema.org/HowTo"><p>Step 1</p></section>`;
    expect(findRule(validateGeneratedHtml(html, 'test'), 'no-howto-in-body')?.severity).toBe('error');
  });

  it('does NOT fire on HowToStep (the (?![A-Za-z]) guard prevents false positives)', () => {
    const html = `<div itemscope itemtype="https://schema.org/HowToStep"><p>Step</p></div>`;
    expectNoRule(validateGeneratedHtml(html, 'test'), 'no-howto-in-body');
  });

  it('does NOT flag clean HTML with no microdata', () => {
    const html = '<ol><li>Step 1</li><li>Step 2</li></ol>';
    expectNoRule(validateGeneratedHtml(html, 'test'), 'no-howto-in-body');
  });

  it('propagates context to the issue', () => {
    const html = `<section itemscope itemtype="https://schema.org/HowTo"><p>Step 1</p></section>`;
    const issue = findRule(validateGeneratedHtml(html, 'HTML (ES)'), 'no-howto-in-body');
    expect(issue?.context).toBe('HTML (ES)');
  });
});

describe('validateGeneratedHtml — Rule: markdown-fence', () => {
  it('flags triple backtick fence', () => {
    const html = '```html\n<p>test</p>\n```';
    expect(findRule(validateGeneratedHtml(html, 'test'), 'markdown-fence')?.severity).toBe('error');
  });

  it('flags bare triple backtick', () => {
    const html = '<p>test</p>```';
    expect(findRule(validateGeneratedHtml(html, 'test'), 'markdown-fence')?.severity).toBe('error');
  });

  it('does NOT flag regular HTML with backtick chars in text', () => {
    // Single backtick is fine; only triple triggers the rule.
    const html = '<p>Press the ` key.</p>';
    expectNoRule(validateGeneratedHtml(html, 'test'), 'markdown-fence');
  });

  it('does NOT flag clean HTML', () => {
    const html = '<section><p>Clean content here.</p></section>';
    expectNoRule(validateGeneratedHtml(html, 'test'), 'markdown-fence');
  });
});

describe('validateGeneratedHtml — Rule: br-spacing', () => {
  it('flags <br> self-closing', () => {
    const html = '<p>line1<br/>line2</p>';
    expect(findRule(validateGeneratedHtml(html, 'test'), 'br-spacing')?.severity).toBe('warning');
  });

  it('flags <br> without slash', () => {
    const html = '<p>line1<br>line2</p>';
    expect(findRule(validateGeneratedHtml(html, 'test'), 'br-spacing')?.severity).toBe('warning');
  });

  it('flags <BR> uppercase', () => {
    const html = '<p>line1<BR>line2</p>';
    expect(findRule(validateGeneratedHtml(html, 'test'), 'br-spacing')?.severity).toBe('warning');
  });

  it('does NOT flag HTML without <br>', () => {
    const html = '<p>paragraph one</p><p>paragraph two</p>';
    expectNoRule(validateGeneratedHtml(html, 'test'), 'br-spacing');
  });
});

describe('validateGeneratedHtml — Rule: unit-spacing', () => {
  // Glued units that MUST be flagged
  const gluedCases: [string, string][] = [
    ['<p>Nozzle: 0.4mm</p>',          'mm'],
    ['<p>Height: 50cm</p>',           'cm'],
    ['<p>Power: 10W</p>',             'W'],
    ['<p>Temp: 200°C</p>',            '°C'],
    ['<p>Weight: 2.5kg</p>',          'kg'],
    ['<p>Resolution: 50µm</p>',       'µm'],
    ['<p>Resolution: 50μm</p>',       'μm'],   // alternative µ character
    ['<p>Speed: 300mm/s</p>',         'mm/s'],
    ['<p>Strength: 44.2MPa</p>',      'MPa'],
    ['<p>Modulus: 1.93GPa</p>',       'GPa'],
  ];

  gluedCases.forEach(([html, unit]) => {
    it(`flags glued unit "${unit}"`, () => {
      const issues = validateGeneratedHtml(html, 'test');
      expect(findRule(issues, 'unit-spacing')?.severity).toBe('warning');
    });
  });

  // Correctly spaced — must NOT be flagged
  const spacedCases: string[] = [
    '<p>Nozzle: 0.4 mm</p>',
    '<p>Power: 10 W</p>',
    '<p>Temp: 200 °C</p>',
    '<p>Weight: 2.5 kg</p>',
    '<p>Resolution: 50 µm</p>',
    '<p>Speed: 300 mm/s</p>',
    '<p>Strength: 44.2 MPa</p>',
  ];

  spacedCases.forEach(html => {
    it(`does NOT flag correctly spaced unit in: "${html}"`, () => {
      expectNoRule(validateGeneratedHtml(html, 'test'), 'unit-spacing');
    });
  });

  it('does NOT flag unit inside product name (false positive guard — "10W" in name)', () => {
    const productName = 'Ortur R2 Smart Laser Engraver 10W';
    const html = `<p>The ${productName} is a laser engraver with a 10W module.</p>`;
    // NOTE: "10W module" is glued but "10W" also appears in productName which gets stripped.
    // The second occurrence "10W module" will STILL fire. Test only the name-stripping behaviour.
    const htmlNameOnly = `<p>${productName} delivers precise cuts.</p>`;
    expectNoRule(validateGeneratedHtml(htmlNameOnly, 'test', productName), 'unit-spacing');
  });

  it('does NOT flag "xTool S1 40W" product name suffix', () => {
    const productName = 'xTool S1 40W Laser Cutter';
    const html = `<p>${productName} features a powerful module.</p>`;
    expectNoRule(validateGeneratedHtml(html, 'test', productName), 'unit-spacing');
  });

  it('still flags genuinely glued unit outside the product name', () => {
    const productName = 'xTool S1 40W Laser Cutter';
    const html = `<p>${productName} has a nozzle of 0.4mm.</p>`;
    expect(findRule(validateGeneratedHtml(html, 'test', productName), 'unit-spacing')).toBeDefined();
  });

  it('does NOT flag glued unit inside href attribute (URL slug)', () => {
    const html = '<a href="/product/300mm-speed">link</a>';
    expectNoRule(validateGeneratedHtml(html, 'test'), 'unit-spacing');
  });

  it('does NOT flag glued unit inside src attribute (URL slug)', () => {
    const html = '<img src="/images/2mm-nozzle.png" alt="nozzle">';
    expectNoRule(validateGeneratedHtml(html, 'test'), 'unit-spacing');
  });
});

describe('validateGeneratedHtml — Rule: decimal-separator', () => {
  it('flags a dot decimal in prose for a comma-decimal locale (es-ES)', () => {
    const html = '<p>Diámetro de 1.75 mm garantiza una reproducción consistente.</p>';
    expect(findRule(validateGeneratedHtml(html, 'test', undefined, 'es-ES'), 'decimal-separator')?.severity).toBe('warning');
  });

  it('flags a dot decimal inside a spec-table <td> for a comma-decimal locale (uk-UA)', () => {
    const html = '<table><tr><td>Diâmetro</td><td>1.75 mm</td></tr></table>';
    expect(findRule(validateGeneratedHtml(html, 'test', undefined, 'uk-UA'), 'decimal-separator')).toBeDefined();
  });

  it('flags a dot decimal embedded in a repeated Product Name heading', () => {
    const productName = 'Bambu Lab PLA Basic Filament, 1.75 mm, 1 kg x 4';
    const html = `<h2>Especificaciones técnicas del ${productName}</h2>`;
    expect(findRule(validateGeneratedHtml(html, 'test', productName, 'es-ES'), 'decimal-separator')).toBeDefined();
  });

  it('does NOT flag a correctly comma-formatted decimal (es-ES)', () => {
    const html = '<p>Diámetro de 1,75 mm garantiza una reproducción consistente.</p>';
    expectNoRule(validateGeneratedHtml(html, 'test', undefined, 'es-ES'), 'decimal-separator');
  });

  it('does NOT flag a multi-part version number (1.2.3)', () => {
    const html = '<p>Compatible con Bambu Studio 1.2.3 y versiones posteriores.</p>';
    expectNoRule(validateGeneratedHtml(html, 'test', undefined, 'es-ES'), 'decimal-separator');
  });

  it('does NOT flag a v-prefixed version number (v1.5)', () => {
    const html = '<p>Requiere firmware v1.5 o superior.</p>';
    expectNoRule(validateGeneratedHtml(html, 'test', undefined, 'es-ES'), 'decimal-separator');
  });

  it('does NOT check dot-decimal locales (es-US)', () => {
    const html = '<p>Diameter of 1.75 mm guarantees consistent reproduction.</p>';
    expectNoRule(validateGeneratedHtml(html, 'test', undefined, 'es-US'), 'decimal-separator');
  });

  it('does NOT check when no locale is passed (backward compatible)', () => {
    const html = '<p>Diameter of 1.75 mm guarantees consistent reproduction.</p>';
    expectNoRule(validateGeneratedHtml(html, 'test'), 'decimal-separator');
  });

  it('does NOT flag a German thousands-separator dot (de-DE) — 1.420 means 1420', () => {
    const html = '<p>Elastizitätsmodul von 1.420 ± 160 MPa.</p>';
    expectNoRule(validateGeneratedHtml(html, 'test', undefined, 'de-DE'), 'decimal-separator');
  });

  it('still flags a genuine dot decimal in de-DE (1.75 mm)', () => {
    const html = '<p>Durchmesser von 1.75 mm garantiert konsistente Extrusion.</p>';
    expect(findRule(validateGeneratedHtml(html, 'test', undefined, 'de-DE'), 'decimal-separator')?.severity).toBe('warning');
  });
});

describe('validateGeneratedHtml — Rule: thousands-separator', () => {
  it('flags unambiguous EN-style comma grouping with 2+ groups (uk-UA)', () => {
    const html = '<p>Об’єм друку: 1,234,567 мм³.</p>';
    expect(findRule(validateGeneratedHtml(html, 'test', undefined, 'uk-UA'), 'thousands-separator')?.severity).toBe('warning');
  });

  it('flags a comma thousands group followed by a dot-decimal tail (uk-UA)', () => {
    const html = '<p>Вартість деталі: 1,234.56 м.</p>';
    expect(findRule(validateGeneratedHtml(html, 'test', undefined, 'uk-UA'), 'thousands-separator')).toBeDefined();
  });

  it('does NOT flag a single comma group — it is a valid decimal in uk-UA ("1,234 kg" = 1.234 kg)', () => {
    const html = '<p>Вага: 1,234 кг.</p>';
    expectNoRule(validateGeneratedHtml(html, 'test', undefined, 'uk-UA'), 'thousands-separator');
  });

  it('does NOT flag a space-grouped number (uk-UA)', () => {
    const html = `<p>Об'єм: 1${' '}234${' '}567 мм³.</p>`; // explicit U+0020, not U+00A0
    expectNoRule(validateGeneratedHtml(html, 'test', undefined, 'uk-UA'), 'thousands-separator');
  });

  it('does NOT flag dot-or-space grouping for de-DE/es-ES (regular space allowed there)', () => {
    const html = '<p>Volumen: 1 234 567 mm³.</p>'; // regular space is valid for de-DE/es-ES thousands
    expectNoRule(validateGeneratedHtml(html, 'test', undefined, 'es-ES'), 'thousands-separator');
  });

  it('does NOT check dot-decimal locales (es-US)', () => {
    const html = '<p>Volume: 1,234,567 mm³.</p>';
    expectNoRule(validateGeneratedHtml(html, 'test', undefined, 'es-US'), 'thousands-separator');
  });
});

describe('validateGeneratedHtml — Rule: latin-unit-in-cyrillic-text', () => {
  it('flags a Latin unit in uk-UA prose', () => {
    const html = '<p>Потужність лазера становить 10 W при безперервній роботі.</p>';
    expect(findRule(validateGeneratedHtml(html, 'test', undefined, 'uk-UA'), 'latin-unit-in-cyrillic-text')?.severity).toBe('warning');
  });

  it('flags a Latin unit in a ru-UA spec-table cell', () => {
    const html = '<table><tr><td>Диаметр сопла</td><td>0,4 mm</td></tr></table>';
    expect(findRule(validateGeneratedHtml(html, 'test', undefined, 'ru-UA'), 'latin-unit-in-cyrillic-text')).toBeDefined();
  });

  it('flags a glued Latin unit too (1.75mm)', () => {
    const html = '<p>Філамент діаметром 1,75mm.</p>';
    expect(findRule(validateGeneratedHtml(html, 'test', undefined, 'uk-UA'), 'latin-unit-in-cyrillic-text')).toBeDefined();
  });

  it('flags multi-char units: GHz, GB, kW, µm, mAh', () => {
    for (const unit of ['2,4 GHz', '32 GB', '1,5 kW', '50 µm', '5000 mAh']) {
      const html = `<p>Параметр: ${unit}.</p>`;
      expect(
        findRule(validateGeneratedHtml(html, 'test', undefined, 'uk-UA'), 'latin-unit-in-cyrillic-text'),
        `expected "${unit}" to flag`,
      ).toBeDefined();
    }
  });

  it('flags the Latin part of a composite unit (kg/h)', () => {
    const html = '<p>Продуктивність: 330 kg/h.</p>';
    expect(findRule(validateGeneratedHtml(html, 'test', undefined, 'uk-UA'), 'latin-unit-in-cyrillic-text')).toBeDefined();
  });

  it('does NOT flag properly cyrillized units', () => {
    const html = '<p>Потужність 10 Вт, вага 2,5 кг, роздільність 50 мкм, швидкість 300 мм/с, 32 ГБ.</p>';
    expectNoRule(validateGeneratedHtml(html, 'test', undefined, 'uk-UA'), 'latin-unit-in-cyrillic-text');
  });

  it('does NOT flag fixed Latin exceptions: °C, VAC, dpi, px, fps, K, ppm', () => {
    const html = '<p>Температура 60 °C, живлення 220 VAC, роздільність 300 dpi, екран 1920 px, 30 fps, 6500 K, точність 5 ppm.</p>';
    expectNoRule(validateGeneratedHtml(html, 'test', undefined, 'uk-UA'), 'latin-unit-in-cyrillic-text');
  });

  it('does NOT flag the "V AC" exception (space-separated form)', () => {
    const html = '<p>Вхідна напруга адаптера 100–240 V AC 50/60 Гц.</p>';
    expectNoRule(validateGeneratedHtml(html, 'test', undefined, 'uk-UA'), 'latin-unit-in-cyrillic-text');
  });

  it('still flags a genuine uncyrillized "V" that is not part of VAC / V AC', () => {
    const html = '<p>Вихідна напруга 5 V на порту USB.</p>';
    expect(findRule(validateGeneratedHtml(html, 'test', undefined, 'uk-UA'), 'latin-unit-in-cyrillic-text')).toBeDefined();
  });

  it('does NOT flag Latin units inside the product name (model suffix "10W")', () => {
    const productName = 'Ortur R2 Smart Laser Engraver 10W';
    const html = `<p>${productName} — потужний гравер для майстерні.</p>`;
    expectNoRule(validateGeneratedHtml(html, 'test', productName, 'uk-UA'), 'latin-unit-in-cyrillic-text');
  });

  it('does NOT flag Latin units inside href/src URL slugs', () => {
    const html = '<a href="/product/laser-10w-300mm-s">посилання</a><img src="/img/2mm-nozzle.png" alt="сопло 2 мм">';
    expectNoRule(validateGeneratedHtml(html, 'test', undefined, 'uk-UA'), 'latin-unit-in-cyrillic-text');
  });

  it('does NOT check Latin-script locales (pl-PL, es-ES, de-DE)', () => {
    const html = '<p>Moc lasera: 10 W, waga 2,5 kg.</p>';
    expectNoRule(validateGeneratedHtml(html, 'test', undefined, 'pl-PL'), 'latin-unit-in-cyrillic-text');
    expectNoRule(validateGeneratedHtml(html, 'test', undefined, 'es-ES'), 'latin-unit-in-cyrillic-text');
    expectNoRule(validateGeneratedHtml(html, 'test', undefined, 'de-DE'), 'latin-unit-in-cyrillic-text');
  });

  it('does NOT check when no locale is passed (backward compatible)', () => {
    const html = '<p>Потужність 10 W.</p>';
    expectNoRule(validateGeneratedHtml(html, 'test'), 'latin-unit-in-cyrillic-text');
  });

  it('does NOT false-positive on 4K/8K display shorthand or model tokens (unit followed by word chars)', () => {
    const html = '<p>Екран 4K, модель S1-40Wx не є юнітом.</p>';
    expectNoRule(validateGeneratedHtml(html, 'test', undefined, 'uk-UA'), 'latin-unit-in-cyrillic-text');
  });

  it('propagates context and names the offending unit in detail', () => {
    const html = '<td>10 W</td>';
    const issue = findRule(validateGeneratedHtml(html, 'HTML (UA)', undefined, 'uk-UA'), 'latin-unit-in-cyrillic-text');
    expect(issue?.context).toBe('HTML (UA)');
    expect(issue?.detail).toContain('"W"');
  });
});

describe('validateGeneratedHtml — Rule: es-forbidden-calque', () => {
  it('flags "huella" in es-ES output (incl. spec-table labels)', () => {
    const html = '<table><tr><td>Huella de la impresora</td><td>450 × 450 mm</td></tr></table>';
    expect(findRule(validateGeneratedHtml(html, 'test', undefined, 'es-ES'), 'es-forbidden-calque')?.severity).toBe('warning');
  });

  it('does NOT flag es-MX or other locales', () => {
    const html = '<p>La huella del equipo es compacta.</p>';
    expectNoRule(validateGeneratedHtml(html, 'test', undefined, 'es-MX'), 'es-forbidden-calque');
  });
});

describe('validateGeneratedHtml — Rule: pt-forbidden-calque', () => {
  it('flags Brazilian Portuguese calques in pt-PT output', () => {
    const html = '<p>Verifique o arquivo antes de imprimir.</p>';
    expect(findRule(validateGeneratedHtml(html, 'test', undefined, 'pt-PT'), 'pt-forbidden-calque')?.severity).toBe('warning');
  });

  it('does NOT flag es-ES or other locales', () => {
    const html = '<p>Verifique o arquivo antes de imprimir.</p>';
    expectNoRule(validateGeneratedHtml(html, 'test', undefined, 'es-ES'), 'pt-forbidden-calque');
  });

  it('flags pre-1990 orthography (silent consonants)', () => {
    const html = '<p>O sistema de arquitectura modular permite um controlo táctil directamente no ecrã electrónico.</p>';
    expect(findRule(validateGeneratedHtml(html, 'test', undefined, 'pt-PT'), 'pt-forbidden-calque')?.severity).toBe('warning');
  });

  it('flags Spanish leakage (utillajes, pantalla, ajustes)', () => {
    const html = '<p>Os utillajes de produção são configurados através dos ajustes na pantalla principal.</p>';
    expect(findRule(validateGeneratedHtml(html, 'test', undefined, 'pt-PT'), 'pt-forbidden-calque')?.severity).toBe('warning');
  });

  it('flags 3D-printing terminology miscalques (pó reclamado, breakout limpo, dezenas de milhar)', () => {
    const html = '<p>O pó reclamado é reintroduzido após um breakout limpo, para dezenas de milhar de peças.</p>';
    expect(findRule(validateGeneratedHtml(html, 'test', undefined, 'pt-PT'), 'pt-forbidden-calque')?.severity).toBe('warning');
  });
});

describe('validateGeneratedHtml — Rules: lcp-image-lazy / image-not-lazy', () => {
  it('flags first image with loading="lazy" (LCP violation)', () => {
    const html = `<p>Intro</p><img src="a.jpg" loading="lazy" alt="A">`;
    expect(findRule(validateGeneratedHtml(html, 'test'), 'lcp-image-lazy')?.severity).toBe('error');
  });

  it('flags second image missing loading="lazy"', () => {
    const html = `<p>A</p><img src="a.jpg" alt="A">
                  <p>B</p><img src="b.jpg" alt="B">`;
    expect(findRule(validateGeneratedHtml(html, 'test'), 'image-not-lazy')?.severity).toBe('error');
  });

  it('does NOT flag correct lazy pattern (first eager, rest lazy)', () => {
    const html = `<p>A</p><img src="a.jpg" alt="A">
                  <p>B</p><img src="b.jpg" loading="lazy" alt="B">
                  <p>C</p><img src="c.jpg" loading="lazy" alt="C">`;
    expectNoRule(validateGeneratedHtml(html, 'test'), 'lcp-image-lazy');
    expectNoRule(validateGeneratedHtml(html, 'test'), 'image-not-lazy');
  });

  it('does NOT flag HTML with NO images (zero images = no lazy rule applies)', () => {
    const html = `<section><p>No images here.</p></section>`;
    expectNoRule(validateGeneratedHtml(html, 'test'), 'lcp-image-lazy');
    expectNoRule(validateGeneratedHtml(html, 'test'), 'image-not-lazy');
  });

  it('does NOT flag single image without lazy (single image = LCP, no subsequent)', () => {
    const html = `<p>A</p><img src="a.jpg" alt="A">`;
    expectNoRule(validateGeneratedHtml(html, 'test'), 'lcp-image-lazy');
    expectNoRule(validateGeneratedHtml(html, 'test'), 'image-not-lazy');
  });
});

describe('validateGeneratedHtml — Rules: img-not-in-figure / figure-missing-figcaption', () => {
  const fig1 = `<figure style="margin:4px auto;"><img src="a.jpg" alt="A" decoding="async"><figcaption>Cap A</figcaption></figure>`;
  const fig2 = `<figure style="margin:4px auto;"><img src="b.jpg" alt="B" loading="lazy" decoding="async"><figcaption>Cap B</figcaption></figure>`;

  it('does NOT flag lazy rules for figure-wrapped images (first eager, rest lazy)', () => {
    const html = `<p>A</p>${fig1}<p>B</p>${fig2}`;
    expectNoRule(validateGeneratedHtml(html, 'test'), 'lcp-image-lazy');
    expectNoRule(validateGeneratedHtml(html, 'test'), 'image-not-lazy');
  });

  it('does NOT flag a correct full figure block', () => {
    const html = `<p>A</p>${fig1}<p>B</p>${fig2}`;
    expectNoRule(validateGeneratedHtml(html, 'test'), 'img-not-in-figure');
    expectNoRule(validateGeneratedHtml(html, 'test'), 'figure-missing-figcaption');
  });

  it('flags an <img> outside any <figure>', () => {
    const html = `<p>A</p><img src="a.jpg" alt="A">`;
    expect(findRule(validateGeneratedHtml(html, 'test'), 'img-not-in-figure')?.severity).toBe('warning');
  });

  it('flags a <figure> with an <img> but no <figcaption>', () => {
    const html = `<p>A</p><figure><img src="a.jpg" alt="A" decoding="async"></figure>`;
    expect(findRule(validateGeneratedHtml(html, 'test'), 'figure-missing-figcaption')?.severity).toBe('warning');
  });
});

describe('validateGeneratedHtml — context label is preserved in issues', () => {
  it('propagates context string to every issue', () => {
    const issues = validateGeneratedHtml('', 'HTML (UA)');
    expect(issues[0].context).toBe('HTML (UA)');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// validateSeoMetadata
// ═══════════════════════════════════════════════════════════════════════════

describe('validateSeoMetadata — Rule: seo-empty', () => {
  it('flags null input', () => {
    expect(findRule(validateSeoMetadata(null, '₴'), 'seo-empty')?.severity).toBe('error');
  });

  it('flags empty seo_data array', () => {
    const seo: SeoResponse = { site_name: 'S', seo_data: [] };
    expect(findRule(validateSeoMetadata(seo, '₴'), 'seo-empty')?.severity).toBe('error');
  });

  it('does NOT flag valid seo object', () => {
    expectNoRule(validateSeoMetadata(makeSeo({}), '$'), 'seo-empty');
  });
});

describe('validateSeoMetadata — Rule: meta-title-length', () => {
  it('flags meta_title of exactly 56 chars', () => {
    const title = 'A'.repeat(56);
    const issues = validateSeoMetadata(makeSeo({ meta_title: title }), '$');
    expect(findRule(issues, 'meta-title-length')?.severity).toBe('error');
  });

  it('flags meta_title of 100 chars', () => {
    expect(findRule(
      validateSeoMetadata(makeSeo({ meta_title: 'X'.repeat(100) }), '$'),
      'meta-title-length',
    )).toBeDefined();
  });

  it('does NOT flag meta_title of exactly 55 chars', () => {
    const title = 'A'.repeat(55);
    expectNoRule(validateSeoMetadata(makeSeo({ meta_title: title }), '$'), 'meta-title-length');
  });

  it('does NOT flag short title', () => {
    expectNoRule(validateSeoMetadata(makeSeo({ meta_title: 'Short Title' }), '$'), 'meta-title-length');
  });

  it('counts emoji as 1 char (➔ is 1 code point)', () => {
    // 54 regular chars + 1 emoji = 55 total — should NOT flag
    const title = 'A'.repeat(54) + '➔';
    expectNoRule(validateSeoMetadata(makeSeo({ meta_title: title }), '$'), 'meta-title-length');
  });
});

describe('validateSeoMetadata — Rule: meta-description-length', () => {
  it('flags meta_description of 156 chars', () => {
    const desc = 'A'.repeat(155) + '➔';   // 156 code points
    const issues = validateSeoMetadata(makeSeo({ meta_description: desc }), '$');
    expect(findRule(issues, 'meta-description-length')?.severity).toBe('error');
  });

  it('does NOT flag meta_description of exactly 155 chars', () => {
    const desc = 'Buy 3D printer for only $499. Nozzle 0.4 mm, layer 0.1 mm. Best UA support since 2012. Fast delivery. Order ➔';
    // this might be under 155 — that's intentional, we just need < 156
    const safeDesc = 'A'.repeat(154) + '➔';
    expectNoRule(validateSeoMetadata(makeSeo({ meta_description: safeDesc }), '$'), 'meta-description-length');
  });
});

describe('validateSeoMetadata — Rule: meta-description-cta', () => {
  it('flags description without ➔ arrow', () => {
    const issues = validateSeoMetadata(makeSeo({ meta_description: 'Buy now for $199.' }), '$');
    expect(findRule(issues, 'meta-description-cta')?.severity).toBe('warning');
  });

  it('does NOT flag description that ends with ➔', () => {
    expectNoRule(
      validateSeoMetadata(makeSeo({ meta_description: 'Buy now for $199 ➔' }), '$'),
      'meta-description-cta',
    );
  });

  it('does NOT flag description with ➔ in the middle', () => {
    // Arrow doesn't have to be the LAST char — just present
    expectNoRule(
      validateSeoMetadata(makeSeo({ meta_description: 'Order ➔ fast delivery.' }), '$'),
      'meta-description-cta',
    );
  });
});

describe('validateSeoMetadata — Rule: meta-description-currency', () => {
  it('flags missing ₴ for UA store', () => {
    const issues = validateSeoMetadata(makeSeo({ meta_description: 'Buy now ➔' }), '₴');
    expect(findRule(issues, 'meta-description-currency')?.severity).toBe('warning');
  });

  it('flags missing € for EU store', () => {
    const issues = validateSeoMetadata(makeSeo({ meta_description: 'Buy now ➔' }), '€');
    expect(findRule(issues, 'meta-description-currency')?.severity).toBe('warning');
  });

  it('flags missing $ for US store', () => {
    const issues = validateSeoMetadata(makeSeo({ meta_description: 'Order now ➔' }), '$');
    expect(findRule(issues, 'meta-description-currency')?.severity).toBe('warning');
  });

  it('does NOT flag when currency symbol is present', () => {
    expectNoRule(
      validateSeoMetadata(makeSeo({ meta_description: 'Buy for ₴12 999 ➔' }), '₴'),
      'meta-description-currency',
    );
  });

  it('does NOT check currency when currencySymbol is empty string', () => {
    // Empty string = no requirement
    expectNoRule(
      validateSeoMetadata(makeSeo({ meta_description: 'No price ➔' }), ''),
      'meta-description-currency',
    );
  });
});

describe('validateSeoMetadata — multi-language entries', () => {
  it('validates all entries and returns issues for each language', () => {
    const seo: SeoResponse = {
      site_name: 'TestStore',
      seo_data: [
        { language: 'en', h1: 'H', meta_title: 'Short', meta_description: 'Buy ₴ ➔' },
        { language: 'uk', h1: 'H', meta_title: 'X'.repeat(60), meta_description: 'Купити ➔' }, // over limit
        { language: 'ru', h1: 'H', meta_title: 'OK', meta_description: 'No currency no arrow' }, // 2 warnings
      ],
    };
    const issues = validateSeoMetadata(seo, '₴');

    // UK entry: meta-title-length error
    const titleErr = issues.find(i => i.rule === 'meta-title-length' && i.context.includes('uk'));
    expect(titleErr?.severity).toBe('error');

    // RU entry: missing currency AND missing arrow
    const ruCurrency = issues.find(i => i.rule === 'meta-description-currency' && i.context.includes('ru'));
    expect(ruCurrency).toBeDefined();
    const ruCta = issues.find(i => i.rule === 'meta-description-cta' && i.context.includes('ru'));
    expect(ruCta).toBeDefined();
  });
});

describe('validateSeoMetadata — context label format', () => {
  it('sets context to "SEO meta (en)" for language "en"', () => {
    const issues = validateSeoMetadata(
      makeSeo({ meta_title: 'X'.repeat(60), meta_description: 'Buy ➔ $' }),
      '$',
    );
    const titleIssue = findRule(issues, 'meta-title-length');
    expect(titleIssue?.context).toBe('SEO meta (en)');
  });
});
/**
 * decimal-separator.spec.ts
 *
 * Two jobs:
 *  1. the fixer converts what it should, and — more important — leaves alone every shape that
 *     is a version, a standard, an aperture or a URL;
 *  2. the ROUND TRIP: output-validator.ts is FROZEN, so the fixer re-states its pattern instead
 *     of importing it. These tests are what stop the two copies drifting apart — after fixing,
 *     the validator must have nothing left to say.
 */

import { describe, it, expect } from 'vitest';
import { fixDecimalSeparator } from './decimal-separator';
import { validateGeneratedHtml } from './output-validator';

const UA = 'uk-UA';

/** decimal-separator issues the validator still reports for `html`. */
function decimalIssues(html: string, locale = UA) {
  return validateGeneratedHtml(html, 'test', undefined, locale)
    .filter(i => i.rule === 'decimal-separator');
}

describe('fixDecimalSeparator — converts genuine decimals', () => {
  it('rewrites a plain dot-decimal', () => {
    expect(fixDecimalSeparator('<p>46.8 Вт-год</p>', UA)).toBe('<p>46,8 Вт-год</p>');
  });

  it('rewrites every occurrence, not just the first', () => {
    expect(fixDecimalSeparator('<p>1.75 мм, 0.5 мм, 46.8 Вт-год</p>', UA))
      .toBe('<p>1,75 мм, 0,5 мм, 46,8 Вт-год</p>');
  });

  it('rewrites a real measurement with a frequency unit', () => {
    expect(fixDecimalSeparator('<p>2.4 ГГц</p>', UA)).toBe('<p>2,4 ГГц</p>');
  });

  it('is idempotent — a comma-decimal is already done', () => {
    const once = fixDecimalSeparator('<p>46.8 Вт-год</p>', UA);
    expect(fixDecimalSeparator(once, UA)).toBe(once);
  });
});

describe('fixDecimalSeparator — never corrupts a non-decimal', () => {
  // Each of these is a spec value or identifier. Converting one is a silent data edit, which is
  // strictly worse than leaving a warning unrepaired — see the DESIGN RULE in the module header.
  const untouched: ReadonlyArray<readonly [string, string]> = [
    ['version in the Lixel manual header', '<p>User Manual (V1.0)</p>'],
    ['semver / multi-part version', '<p>Firmware 1.0.2</p>'],
    ['lens aperture', '<p>Діафрагма F/2.0</p>'],
    ['lowercase aperture', '<p>f/1.8</p>'],
    ['Wi-Fi standard family', '<p>802.11a/b/g/n/ac</p>'],
    ['IEEE-prefixed standard', '<p>IEEE 802.11</p>'],
    ['Wi-Fi-prefixed standard', '<p>Wi-Fi 802.11</p>'],
    ['USB version', '<p>USB 3.0</p>'],
    ['Bluetooth version', '<p>Bluetooth 5.0</p>'],
    ['HDMI version', '<p>HDMI 2.1</p>'],
  ];

  it.each(untouched)('leaves %s byte-identical', (_label, html) => {
    expect(fixDecimalSeparator(html, UA)).toBe(html);
  });

  it('never touches a URL in href or src', () => {
    const html = '<p><a href="https://example.com/a.1/spec-2.5">1.75 мм</a>'
      + '<img src="https://cdn.example.com/v1.5/img-2.75.jpg" alt="2.5 мм"></p>';
    const out = fixDecimalSeparator(html, UA);
    expect(out).toContain('href="https://example.com/a.1/spec-2.5"');
    expect(out).toContain('src="https://cdn.example.com/v1.5/img-2.75.jpg"');
    // …while still fixing the visible text and the alt (mapHtmlText's allow-list).
    expect(out).toContain('>1,75 мм<');
    expect(out).toContain('alt="2,5 мм"');
  });
});

describe('fixDecimalSeparator — locale gating', () => {
  it('is a no-op for a dot-decimal locale', () => {
    const html = '<p>46.8 Wh</p>';
    expect(fixDecimalSeparator(html, 'en-GB')).toBe(html);
    expect(fixDecimalSeparator(html, 'es-MX')).toBe(html);
  });

  it('applies to every comma-decimal locale the validator checks', () => {
    for (const locale of ['uk-UA', 'ru-UA', 'pl-PL', 'de-DE', 'es-ES', 'pt-PT']) {
      expect(fixDecimalSeparator('<p>46.8</p>', locale)).toBe('<p>46,8</p>');
    }
  });

  it('returns the input unchanged for empty html or an unknown locale', () => {
    expect(fixDecimalSeparator('', UA)).toBe('');
    expect(fixDecimalSeparator('<p>46.8</p>', 'xx-XX')).toBe('<p>46.8</p>');
  });
});

describe('round trip — the fixer satisfies the frozen validator', () => {
  it('clears the warning the EXPERT3D L2 Pro FAQ actually produced', () => {
    const html = '<p>Ємність акумулятора — 46.8 Вт-год за напруги 14.4 В.</p>';
    expect(decimalIssues(html)).toHaveLength(1);          // reproduces the reported warning
    expect(decimalIssues(fixDecimalSeparator(html, UA))).toHaveLength(0);
  });

  it('leaves nothing for the validator across a mixed document', () => {
    const html = '<p>1.75 мм, 0.5 мм, 2.4 ГГц, 46.8 Вт-год</p>'
      + '<table><tr><td>Напруга</td><td>14.4 В</td></tr></table>';
    expect(decimalIssues(fixDecimalSeparator(html, UA))).toHaveLength(0);
  });

  it('does not fix what the validator never flagged (fixer is a subset)', () => {
    // If the validator is silent, the fixer must be a no-op — otherwise it is editing values
    // on its own authority.
    for (const [, html] of [
      ['aperture', '<p>Діафрагма F/2.0</p>'],
      ['version', '<p>User Manual (V1.0)</p>'],
      ['standard', '<p>802.11a/b/g/n/ac</p>'],
    ] as const) {
      expect(decimalIssues(html)).toHaveLength(0);
      expect(fixDecimalSeparator(html, UA)).toBe(html);
    }
  });
});

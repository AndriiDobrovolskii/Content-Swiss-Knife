/**
 * identifier-decimal.spec.ts
 *
 * The pass is narrow on purpose, so most of these tests are about what it must NOT touch.
 * The two positive fixtures are quoted from description_uk-UA.html of the EXPERT3D XGRIDS
 * L2 Pro run (2026-07-29), where the model itself wrote the commas.
 */

import { describe, it, expect } from 'vitest';
import { restoreIdentifierDots } from './identifier-decimal';
import { fixDecimalSeparator } from './decimal-separator';

const UA = 'uk-UA';

describe('restoreIdentifierDots — the shapes it fixes', () => {
  it('restores a lens aperture', () => {
    // Quoted: <tr><td>Діафрагма</td><td>F/2,0</td></tr>
    expect(restoreIdentifierDots('<td>Діафрагма</td><td>F/2,0</td>', UA))
      .toBe('<td>Діафрагма</td><td>F/2.0</td>');
    expect(restoreIdentifierDots('<p>f/1,8</p>', UA)).toBe('<p>f/1.8</p>');
  });

  it('restores a Wi-Fi band designator', () => {
    // Quoted: <li>2,4G WiFi 2412–2472 МГц</li>
    expect(restoreIdentifierDots('<li>2,4G WiFi 2412–2472 МГц</li>', UA))
      .toBe('<li>2.4G WiFi 2412–2472 МГц</li>');
    expect(restoreIdentifierDots('<li>5,8G WiFi</li>', UA)).toBe('<li>5.8G WiFi</li>');
  });

  it('restores an 802.11 standard number', () => {
    expect(restoreIdentifierDots('<p>Bluetooth: 802,11a/b/g/n/ac</p>', UA))
      .toBe('<p>Bluetooth: 802.11a/b/g/n/ac</p>');
  });

  it('restores a version token', () => {
    expect(restoreIdentifierDots('<p>User Manual (V1,0)</p>', UA)).toBe('<p>User Manual (V1.0)</p>');
  });

  it('is idempotent', () => {
    const once = restoreIdentifierDots('<td>F/2,0</td><li>2,4G</li>', UA);
    expect(restoreIdentifierDots(once, UA)).toBe(once);
  });
});

describe('restoreIdentifierDots — what it must never touch', () => {
  const untouched: ReadonlyArray<readonly [string, string]> = [
    ['a real frequency in Cyrillic', '<p>2,4 ГГц</p>'],
    ['a real frequency in Latin', '<p>2,4 GHz</p>'],
    ['millimetres', '<p>1,75 мм</p>'],
    ['volts', '<td>14,4 В</td>'],
    ['watt-hours', '<td>46,8 Вт·год</td>'],
    ['kilograms in a dimension chain', '<p>60 см × 60 см × 15 см, 2,5 кг</p>'],
    ['a measurement ending in a G-word', '<p>2,5 Гбіт</p>'],
    ['a bare prose decimal', '<p>коефіцієнт 1,5 у розрахунку</p>'],
    ['gigabytes', '<p>1,5 ГБ</p>'],
  ];

  it.each(untouched)('leaves %s byte-identical', (_label, html) => {
    expect(restoreIdentifierDots(html, UA)).toBe(html);
  });

  it('never touches a URL in href or src', () => {
    const html = '<p><a href="https://example.com/f/2,0">F/2,0</a>'
      + '<img src="https://cdn.example.com/v1,0/x.jpg" alt="F/2,0"></p>';
    const out = restoreIdentifierDots(html, UA);
    expect(out).toContain('href="https://example.com/f/2,0"');
    expect(out).toContain('src="https://cdn.example.com/v1,0/x.jpg"');
    expect(out).toContain('>F/2.0<');       // visible text is fixed
    expect(out).toContain('alt="F/2.0"');   // alt is in mapHtmlText's allow-list
  });

  it('is a no-op for a dot-decimal locale and for empty input', () => {
    expect(restoreIdentifierDots('<td>F/2,0</td>', 'en-GB')).toBe('<td>F/2,0</td>');
    expect(restoreIdentifierDots('', UA)).toBe('');
  });
});

describe('the two passes compose', () => {
  // They run back to back in every orchestrator chain, so the pair has to be stable: the forward
  // pass only converts a decimal followed by a unit, and no identifier shape has one.
  it('reaches a fixed point — fix, restore, fix again changes nothing further', () => {
    const raw = '<p>Діафрагма F/2.0, 2.4G WiFi, кабель USB 3.1, вага 1.7 кг, 46.8 Вт·год</p>';

    const once = restoreIdentifierDots(fixDecimalSeparator(raw, UA), UA);
    const twice = restoreIdentifierDots(fixDecimalSeparator(once, UA), UA);

    expect(once).toBe('<p>Діафрагма F/2.0, 2.4G WiFi, кабель USB 3.1, вага 1,7 кг, 46,8 Вт·год</p>');
    expect(twice).toBe(once);
  });

  it('repairs a comma the model wrote without disturbing the measurements beside it', () => {
    const modelOutput = '<p>Діафрагма F/2,0 при вазі 1,7 кг та ємності 46,8 Вт·год</p>';
    expect(restoreIdentifierDots(fixDecimalSeparator(modelOutput, UA), UA))
      .toBe('<p>Діафрагма F/2.0 при вазі 1,7 кг та ємності 46,8 Вт·год</p>');
  });
});

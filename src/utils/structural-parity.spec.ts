/**
 * structural-parity.spec.ts
 *
 * Regression guard for validateStructuralParity (src/utils/structural-parity.ts).
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { validateStructuralParity } from './structural-parity';

const MASTER = `<section><h2>Hello</h2><p>Lead-in.</p>
<figure><img src="a.jpg" alt="A"><figcaption>Caption A</figcaption></figure>
<hr></section>`;

describe('validateStructuralParity', () => {
  it('returns no issues for identical HTML', () => {
    const issues = validateStructuralParity(MASTER, MASTER, 'HTML (PL)');
    expect(issues).toEqual([]);
  });

  it('returns no issues when only prose changes but markup stays identical (translation case)', () => {
    const translated = `<section><h2>Привіт</h2><p>Вступ.</p>
<figure><img src="a.jpg" alt="A"><figcaption>Підпис A</figcaption></figure>
<hr></section>`;
    const issues = validateStructuralParity(MASTER, translated, 'HTML (UA)');
    expect(issues).toEqual([]);
  });

  it('flags a structural-parity-count issue when an <hr> is dropped', () => {
    const translated = `<section><h2>Hello</h2><p>Lead-in.</p>
<figure><img src="a.jpg" alt="A"><figcaption>Caption A</figcaption></figure>
</section>`;
    const issues = validateStructuralParity(MASTER, translated, 'HTML (PL)');
    expect(issues.some(i => i.rule === 'structural-parity-count' && i.detail.includes('<hr>'))).toBe(true);
  });

  it('flags a structural-parity-media issue when an <img src> is reordered', () => {
    const master = `<figure><img src="a.jpg"></figure><figure><img src="b.jpg"></figure>`;
    const translated = `<figure><img src="b.jpg"></figure><figure><img src="a.jpg"></figure>`;
    const issues = validateStructuralParity(master, translated, 'HTML (DE)');
    expect(issues.some(i => i.rule === 'structural-parity-media')).toBe(true);
  });

  it('flags a structural-parity-media issue when an <img src> is rewritten', () => {
    const master = `<figure><img src="a.jpg"></figure>`;
    const translated = `<figure><img src="a-modified.jpg"></figure>`;
    const issues = validateStructuralParity(master, translated, 'HTML (RU)');
    expect(issues.some(i => i.rule === 'structural-parity-media')).toBe(true);
  });

  // Regression guard for the 2026-07-15 es-ES incident (xTool M1 Ultra SafetyPro): a
  // translation that drops 4 of 5 <h3>+<table> spec categories while keeping everything else
  // intact must be caught by <h3>/<table>/<tr>/<td> count mismatches.
  it('flags a structural-parity-count issue when a translation drops spec-table categories', () => {
    const master = `<section class="specs">
<h3>Processing range</h3><table><tr><td>a</td></tr></table>
<h3>Software</h3><table><tr><td>b</td></tr></table>
<h3>Easy operation</h3><table><tr><td>c</td></tr></table>
<h3>Accuracy</h3><table><tr><td>d</td></tr></table>
<h3>General information</h3><table><tr><td>e</td></tr></table>
</section>`;
    const translated = `<section class="specs">
<h3>Información general</h3><table><tr><td>e</td></tr></table>
</section>`;
    const issues = validateStructuralParity(master, translated, 'HTML (ES)');
    expect(issues.some(i => i.rule === 'structural-parity-count' && i.detail.includes('<h3>'))).toBe(true);
    expect(issues.some(i => i.rule === 'structural-parity-count' && i.detail.includes('<table>'))).toBe(true);
  });
});

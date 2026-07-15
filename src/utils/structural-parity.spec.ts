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
});

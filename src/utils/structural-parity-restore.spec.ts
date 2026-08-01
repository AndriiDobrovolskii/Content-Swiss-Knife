/**
 * structural-parity-restore.spec.ts
 *
 * Deterministic repair for `structural-parity-media`.
 *
 * WHY THIS EXISTS — a real artifact shipped broken. In the 2026-08-01 EXPERT3D run, the es-ES
 * translation came back with the image FOLDER rewritten:
 *
 *   uk-UA / en-ES / pt-PT   …/xgrids/L2-Pro-32-300/…   (U+002D hyphen)
 *   es-ES                   …/xgrids/L2-Pro-32–300/…   (U+2013 EN DASH)
 *
 * Spanish typography uses an en dash for numeric ranges and the model applied it inside a URL. All
 * seven images 404. `task-c.ts` already demands every attribute stay byte-identical including
 * `src`; the model complied everywhere except where a typographic convention overrode it.
 *
 * WHY A DETERMINISTIC REPAIR RATHER THAN A BETTER PROMPT. Detection already worked —
 * validateStructuralParity() named both lists exactly. The repair gate then spent its whole budget
 * and the model never fixed it, because this is a systematic transform rather than a random slip:
 * re-prompting in Spanish reproduces it. (On the same run `video-embed-missing` WAS repaired, so
 * the ladder itself is fine.) The master's src list is known, so the correct value never needs to
 * be asked for.
 */
import { describe, it, expect } from 'vitest';

import { restoreMediaSrcs, validateStructuralParity } from './structural-parity';

const MASTER = `<p>Опис</p>
<figure><img src="https://cdn.example.com/x/L2-Pro-32-300/a.jpg" alt="Опис A"><figcaption>Підпис A</figcaption></figure>
<figure><img src="https://cdn.example.com/x/L2-Pro-32-300/b.jpg" alt="Опис B" loading="lazy"><figcaption>Підпис B</figcaption></figure>
<figure><iframe src="https://www.youtube.com/embed/abc?rel=0" title="Відео"></iframe><figcaption>Відеоогляд</figcaption></figure>`;

/** The real failure: folder mangled by an en dash, everything else correctly translated. */
const MANGLED = `<p>Descripción</p>
<figure><img src="https://cdn.example.com/x/L2-Pro-32–300/a.jpg" alt="Descripción A"><figcaption>Pie A</figcaption></figure>
<figure><img src="https://cdn.example.com/x/L2-Pro-32–300/b.jpg" alt="Descripción B" loading="lazy"><figcaption>Pie B</figcaption></figure>
<figure><iframe src="https://www.youtube.com/embed/abc?rel=0" title="Vídeo"></iframe><figcaption>Reseña</figcaption></figure>`;

describe('restoreMediaSrcs', () => {
  it('restores an en-dash-mangled src back to the master value', () => {
    const { html } = restoreMediaSrcs(MANGLED, MASTER);
    expect(html).toContain('https://cdn.example.com/x/L2-Pro-32-300/a.jpg');
    expect(html).toContain('https://cdn.example.com/x/L2-Pro-32-300/b.jpg');
    expect(html).not.toContain('–'); // no EN DASH anywhere
  });

  /** The whole point: the translation stays a translation. Only `src` is authoritative. */
  it('leaves translated alt, figcaption and title untouched', () => {
    const { html } = restoreMediaSrcs(MANGLED, MASTER);
    expect(html).toContain('alt="Descripción A"');
    expect(html).toContain('<figcaption>Pie B</figcaption>');
    expect(html).toContain('title="Vídeo"');
    expect(html).toContain('<p>Descripción</p>');
    expect(html).not.toContain('Опис');
  });

  it('reports how many srcs it had to restore', () => {
    expect(restoreMediaSrcs(MANGLED, MASTER).restored).toBe(2);
  });

  it('is a no-op on an already-correct translation — byte-identical, zero restored', () => {
    const clean = MANGLED.replace(/L2-Pro-32–300/g, 'L2-Pro-32-300');
    const { html, restored } = restoreMediaSrcs(clean, MASTER);
    expect(html).toBe(clean);
    expect(restored).toBe(0);
  });

  it('preserves other attributes on the same tag, including loading="lazy"', () => {
    const { html } = restoreMediaSrcs(MANGLED, MASTER);
    expect(html).toContain('loading="lazy"');
    expect((html.match(/loading="lazy"/g) ?? [])).toHaveLength(1);
  });

  it('restores an iframe src too, not only images', () => {
    const badVideo = MANGLED.replace('embed/abc?rel=0', 'embed/WRONG?rel=0');
    const { html } = restoreMediaSrcs(badVideo, MASTER);
    expect(html).toContain('embed/abc?rel=0');
    expect(html).not.toContain('WRONG');
  });

  /**
   * REFUSES TO GUESS when the counts differ. Positional restoration is only meaningful when the
   * lists line up — with a dropped or added image there is no defensible mapping, and
   * `structural-parity-count` is the error that actually describes the problem. Silently
   * "restoring" onto a mismatched list would corrupt which caption belongs to which picture.
   */
  it('does nothing when the image counts differ', () => {
    const dropped = MANGLED.replace(/<figure><img src="[^"]*b\.jpg"[^>]*>.*?<\/figure>/s, '');
    const { html, restored } = restoreMediaSrcs(dropped, MASTER);
    expect(html).toBe(dropped);
    expect(restored).toBe(0);
  });

  it('still restores iframes when only the image counts are wrong', () => {
    const dropped = MANGLED
      .replace(/<figure><img src="[^"]*b\.jpg"[^>]*>.*?<\/figure>/s, '')
      .replace('embed/abc?rel=0', 'embed/WRONG?rel=0');
    const { html } = restoreMediaSrcs(dropped, MASTER);
    expect(html).toContain('embed/abc?rel=0');       // iframe lists still line up
    expect(html).toContain('L2-Pro-32–300');    // images left alone
  });
});

describe('restoreMediaSrcs + validateStructuralParity', () => {
  /** End to end: the error that shipped no longer fires after the deterministic pass. */
  it('clears structural-parity-media without an LLM', () => {
    const before = validateStructuralParity(MASTER, MANGLED, 'HTML (es-ES)');
    expect(before.some(i => i.rule === 'structural-parity-media')).toBe(true);

    const { html } = restoreMediaSrcs(MANGLED, MASTER);
    const after = validateStructuralParity(MASTER, html, 'HTML (es-ES)');
    expect(after.some(i => i.rule === 'structural-parity-media')).toBe(false);
  });

  it('does not mask a genuine count mismatch', () => {
    const dropped = MANGLED.replace(/<figure><img src="[^"]*b\.jpg"[^>]*>.*?<\/figure>/s, '');
    const { html } = restoreMediaSrcs(dropped, MASTER);
    const after = validateStructuralParity(MASTER, html, 'HTML (es-ES)');
    expect(after.some(i => i.rule === 'structural-parity-count')).toBe(true);
  });
});

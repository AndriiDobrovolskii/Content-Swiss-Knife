import { describe, it, expect } from 'vitest';
import { invariantCore, productShort } from './product-name-core';

/**
 * A CORPUS, not a set of examples. Both functions are token heuristics over free-form product
 * names, so the only thing that makes them safe is being pinned against names the network
 * actually sells. Every entry below is a real name from a store export, a test fixture, or
 * the prompt corpora in constants.ts.
 *
 * READ THE FAILURE DIRECTION BEFORE LOOSENING ANYTHING HERE. Over-capturing is benign: the
 * mask protects more text than it needs to, and a heading grows a word. Under-capturing on
 * invariantCore is what let `32/300` become `32 300` and then `32300` across every locale.
 */
describe('invariantCore', () => {
  it.each([
    // The case this whole module exists for — the config code MUST survive.
    ['XGRIDS L2 Pro 32/300 Standard Package', 'XGRIDS L2 Pro 32/300'],
    ['XGRIDS L2 Pro 32/300 3D Scanner Standard Package', 'XGRIDS L2 Pro 32/300'],
    // Model words that merely look descriptive still belong to the designator.
    ['Bambu Lab X1 Carbon', 'Bambu Lab X1 Carbon'],
    ['Creality Ender 3 V3 SE', 'Creality Ender 3 V3 SE'],
    ['xTool F2 Ultra', 'xTool F2 Ultra'],
    ['Ortur Laser Master 3', 'Ortur Laser Master 3'],
    // Stops at the generic category noun, so the localizable part is excluded.
    // "Reflective" is an ACCEPTED OVER-CAPTURE: it is capitalized and not a category noun, so
    // the heuristic cannot tell it from "Carbon" in "X1 Carbon". Harmless in both consumers —
    // the mask covers one extra word, the heading gains one. Do not add adjectives to the
    // stopword list to "fix" this; that is how a real model word gets truncated instead.
    ['Shining3D EinScan Reflective Markers 12 mm 1500 pcs', 'Shining3D EinScan Reflective'],
    ['Anycubic Kobra 3 3D Printer', 'Anycubic Kobra 3'],
    ['Formlabs Fuse 1 30W Printer 120V Uptime Kit', 'Formlabs Fuse 1 30W'],
    // Packaging suffixes are never part of the designator.
    ['Ortur H20 20W Bundle', 'Ortur H20 20W'],
    ['xTool F2 Ultra Deluxe Bundle', 'xTool F2 Ultra'],
    // LEADING category/packaging words: the source feed sometimes writes category-first even in
    // English ("3D printer Elegoo …"). These must be skipped, not treated as a scan-ending token
    // that falls through to the whole-name fallback — that fallback is what locked "3D printer"
    // into the invariant core and made the slug validator reject its own correct translation.
    ['3D printer Elegoo Centauri Carbon 2', 'Elegoo Centauri Carbon 2'],
    ['3D scanner Shining3D EinScan Pro', 'Shining3D EinScan Pro'],
    // "mm" is a lowercase unit token, not designator-shaped — excluded the same way "0.4 mm"
    // is excluded from every other case in this table; unrelated to the leading-skip fix.
    ['Filament Bambu Lab PETG 1.75 mm', 'Bambu Lab PETG 1.75'],
    ['3D принтер Elegoo Centauri Carbon 2', 'Elegoo Centauri Carbon 2'],
  ])('%s → %s', (input, expected) => {
    expect(invariantCore(input)).toBe(expected);
  });

  it('falls back to the whole name when nothing looks like a designator', () => {
    // Over-capture on purpose: masking too much is harmless, masking nothing is the bug.
    expect(invariantCore('заміна сопла')).toBe('заміна сопла');
    expect(invariantCore('cleaning kit')).toBe('cleaning kit');
    // Nothing but leading category words, no brand/model at all: still falls back to the whole
    // string rather than to '' — documents the fallback boundary explicitly.
    expect(invariantCore('3D printer')).toBe('3D printer');
  });

  it('returns an empty string for empty input rather than throwing', () => {
    expect(invariantCore('')).toBe('');
    expect(invariantCore('   ')).toBe('');
  });

  it('is idempotent — feeding it its own output changes nothing', () => {
    const once = invariantCore('XGRIDS L2 Pro 32/300 Standard Package');
    expect(invariantCore(once)).toBe(once);
  });
});

describe('productShort', () => {
  it.each([
    // Drops the trailing config code that invariantCore keeps — the one real difference.
    ['XGRIDS L2 Pro 32/300 Standard Package', 'XGRIDS L2 Pro'],
    ['XGRIDS L2 Pro 32/300 3D Scanner Standard Package', 'XGRIDS L2 Pro'],
    // No trailing config token, so short == core.
    ['Bambu Lab X1 Carbon', 'Bambu Lab X1 Carbon'],
    ['Creality Ender 3 V3 SE', 'Creality Ender 3 V3 SE'],
    ['xTool F2 Ultra', 'xTool F2 Ultra'],
    ['Anycubic Kobra 3 3D Printer', 'Anycubic Kobra 3'],
  ])('%s → %s', (input, expected) => {
    expect(productShort(input)).toBe(expected);
  });

  it('never strips the only token it has', () => {
    // "32/300" alone is the whole designator; dropping it would leave an empty heading.
    expect(productShort('32/300')).toBe('32/300');
  });

  it('is idempotent', () => {
    const once = productShort('XGRIDS L2 Pro 32/300 Standard Package');
    expect(productShort(once)).toBe(once);
  });
});

describe('the two differ exactly where it matters', () => {
  it('keeps the config code in the mask and drops it from the heading', () => {
    const name = 'XGRIDS L2 Pro 32/300 Standard Package';
    expect(invariantCore(name)).toContain('32/300');
    expect(productShort(name)).not.toContain('32/300');
  });
});

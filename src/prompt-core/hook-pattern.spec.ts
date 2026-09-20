/**
 * hook-pattern.spec.ts — US-2.1 validation category V5 (FR-14, NFR-5, AC-9).
 *
 * WHY THE IMPORT IS STATIC. Written at TEST_WRITING, before T6 created
 * `src/prompt-core/hook-pattern.ts`, so this file failed to resolve its import in its entirety —
 * the intended TDD state, not a broken test (AGENTS.md §5). There is no honest way to assert
 * against a module that does not exist yet other than to import it; hiding the gap behind a
 * dynamic specifier would have typed every assertion below as `any` and traded a loud, specific
 * failure for a quiet one. T6 has since landed the module and the import resolves.
 *
 * WHAT FR-14 ACTUALLY REQUIRES, AND WHY DETERMINISM ALONE IS NOT IT. A constant selector that
 * returned pattern 1 for every product would satisfy NFR-5 in full — deterministic, service-side,
 * pre-prompt, drawing from a set of at least 4 patterns — while making AC-9 unachievable for ANY
 * batch. So FR-14 states a DISTRIBUTION property as well, and this file asserts it against the
 * function rather than against a curated fixture: every pattern reachable, the selection not
 * constant, not a function of `website` alone, and not a function of any single character of
 * `name`. Each is a separate test, because each is a separately reachable way to get it wrong.
 *
 * AC-9's ROTATION WINDOW — the residual the Specification routed to TEST_WRITING. AC-9 asks for
 * rotation "across a fixture batch", and FR-14 says in so many words that the no-two-consecutive
 * property is "satisfiable for a curated fixture batch" and is "a test-design matter". The decision
 * taken here: assert that an 8-product consecutive-distinct batch can be CURATED out of an ordinary
 * taken here: assert that a consecutive-distinct batch can be CURATED out of an ordinary 24-name
 * catalogue, rather than hard-coding a batch and asserting the property of it directly. The
 * difference matters — a hard-coded batch pins one particular hash, so the first legitimate change
 * to `selectHookPattern` would force whoever made it to edit this test, which is exactly the
 * pressure AGENTS.md §7.7 exists to keep off a suite. Deriving the batch asserts the property AC-9
 * is about (the index rotates well enough that a rotating batch exists) and survives any selector
 * that genuinely distributes. The window length itself is derived from the plan's floor of four
 * patterns — see the comment on that test.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL as NodeURL } from 'node:url';

import { describe, it, expect } from 'vitest';

import { HOOK_PATTERNS, selectHookPattern } from './hook-pattern';

/**
 * A stable identity for a pattern, whatever shape `HookPattern` turns out to be. Comparing by
 * reference would silently pass for a selector that returns array elements and silently fail for
 * one that returns copies; comparing serialised values asserts the CHOICE, which is the subject.
 */
const key = (pattern: unknown): string => JSON.stringify(pattern);

/** A deterministic catalogue — no randomness, no clock, reproducible byte-for-byte on every run. */
const CATALOGUE = [
  'Ortur H20 20 W', 'xTool M1 Ultra', 'Formlabs Fuse 1', 'Bambu Lab X1 Carbon',
  'Creality K2 Plus', 'Raise3D Pro3', 'Anycubic Kobra 3', 'Elegoo Saturn 4',
  'Revopoint MIRACO Plus', 'Shining 3D EinScan H2', 'XGRIDS L2 Pro', 'Artec Leo',
  'Snapmaker Artisan', 'Flashforge Guider 3', 'UltiMaker S7', 'Markforged Mark Two',
  'Prusa Core One', 'Phrozen Sonic Mega 8K', 'Peopoly Magneto X', 'Nexa3D XiP',
  'Sculpfun S30 Ultra', 'Makera Carvera Air', 'Eplus3D EP-M150', 'CraftBot Flow IDEX',
];

const WEBSITES = [
  '3DDevice', '3DPrinter', '3DScanner', 'Center 3D Print',
  'Drukarka 3D', 'EXPERT3D', 'Expert-3DPrinter',
];

describe('V5 / NFR-5 — selectHookPattern is a pure, deterministic function of name + website', () => {
  it('offers at least 4 structural patterns, as v4 §1 «Антиконвеєр» requires', () => {
    expect(Array.isArray(HOOK_PATTERNS)).toBe(true);
    expect(HOOK_PATTERNS.length).toBeGreaterThanOrEqual(4);
  });

  it('always returns one of HOOK_PATTERNS, never an invented value', () => {
    const known = new Set(HOOK_PATTERNS.map(key));
    for (const name of CATALOGUE) {
      for (const website of WEBSITES) {
        expect(known, `${name} @ ${website}`).toContain(key(selectHookPattern(name, website)));
      }
    }
  });

  it('returns the same pattern for the same name + website on every call', () => {
    for (const name of CATALOGUE) {
      for (const website of WEBSITES) {
        const first = key(selectHookPattern(name, website));
        expect(key(selectHookPattern(name, website)), `${name} @ ${website}`).toBe(first);
        expect(key(selectHookPattern(name, website)), `${name} @ ${website}`).toBe(first);
      }
    }
  });

  /**
   * NFR-5 forbids a run counter and a wall clock by name. Both would show up here as a selection
   * that drifts between calls, which the test above already catches — this one catches the subtler
   * form: a selector whose result depends on how many other products were asked for first.
   */
  it('is unaffected by how many other products were selected before it', () => {
    const before = key(selectHookPattern('Ortur H20 20 W', 'EXPERT3D'));
    for (const name of CATALOGUE) selectHookPattern(name, '3DDevice');
    expect(key(selectHookPattern('Ortur H20 20 W', 'EXPERT3D'))).toBe(before);
  });
});

describe('V5 / FR-14 — the index DISTRIBUTES; determinism alone would not deliver the rotation', () => {
  const selections = CATALOGUE.flatMap(name =>
    WEBSITES.map(website => ({ name, website, pattern: key(selectHookPattern(name, website)) })),
  );

  it('reaches every available pattern over a set of distinct name + website pairs', () => {
    const reached = new Set(selections.map(s => s.pattern));
    expect([...reached].sort()).toEqual(HOOK_PATTERNS.map(key).sort());
  });

  /** The constant-selector hole FR-14 was written to close. */
  it('is not constant', () => {
    expect(new Set(selections.map(s => s.pattern)).size).toBeGreaterThan(1);
  });

  /** A selector keyed on the store alone gives every product in a catalogue the same hook shape. */
  it('is not a function of `website` alone — one store’s products draw different patterns', () => {
    for (const website of WEBSITES) {
      const perStore = new Set(CATALOGUE.map(name => key(selectHookPattern(name, website))));
      expect(perStore.size, `every product on ${website} drew the same pattern`).toBeGreaterThan(1);
    }
  });

  /**
   * The cheap hash FR-14 forbids: `name.charCodeAt(0) % 4`, or the same on the last character.
   * Two names that share a first and last character but differ in the middle must be able to draw
   * different patterns, or the "whole name + website pair" requirement is not met.
   */
  it('is not a function of any single character of `name`', () => {
    const sharedEnds = ['Creality K2 Plus', 'Creality Ender-3 V3 Plus', 'Creality Halot Mage Plus'];
    const drawn = new Set(sharedEnds.map(name => key(selectHookPattern(name, 'EXPERT3D'))));
    expect(drawn.size, 'names sharing their first and last character all drew one pattern').toBeGreaterThan(1);
  });

  /** FR-14's explicit consequence: the same product at a different store may draw a different pattern. */
  it('lets the same product draw different patterns at different stores', () => {
    const acrossStores = new Set(WEBSITES.map(website => key(selectHookPattern('Ortur H20 20 W', website))));
    expect(acrossStores.size).toBeGreaterThan(1);
  });
});

describe('AC-9 — a rotating fixture batch can be curated from an ordinary catalogue', () => {
  const patternsInOrder = () => CATALOGUE.map(name => key(selectHookPattern(name, 'EXPERT3D')));

  /**
   * THE RATE, which is the assertion that cannot be dodged. A constant selector repeats on ALL 23
   * adjacent pairs; an index that genuinely distributes over `HOOK_PATTERNS` repeats on a small
   * fraction of them. Requiring fewer than half is far from either edge, so it separates the two
   * without pinning any particular hash.
   */
  it('repeats its predecessor’s pattern on fewer than half the adjacent pairs', () => {
    const patterns = patternsInOrder();
    const adjacent = patterns.length - 1;
    const repeats = patterns.filter((p, i) => i > 0 && p === patterns[i - 1]).length;

    expect(repeats, `${repeats} of ${adjacent} adjacent pairs repeated`).toBeLessThan(adjacent / 2);
  });

  /**
   * THE WINDOW: a batch of 5 consecutive products, none repeating its predecessor's pattern, drawn
   * in catalogue order from 24 candidates. See this file's header for why the batch is derived
   * rather than hard-coded.
   *
   * 🔴 FIVE, NOT EIGHT, AND THE NUMBER IS DERIVED. The plan floors `HOOK_PATTERNS` at 4. For an
   * index that distributes evenly over four patterns, each adjacent pair differs with probability
   * ~3/4, so a run of `k` needs `k-1` consecutive differences: a run of 8 occurs at any given start
   * with probability ~(3/4)^7 ≈ 0.13, and a perfectly correct selector can easily fail to produce
   * one anywhere in 24 items. A run of 5 needs only (3/4)^4 ≈ 0.32 per start across 20 starts and
   * is effectively certain for any distributing index. Requiring 8 would have made this the one
   * test in the suite that can be red AFTER a correct implementation — the exact pressure a derived
   * window exists to avoid. Five is also a faithful reading of AC-9, whose subject is a fixture
   * batch, not a catalogue.
   */
  it('yields a run of 5 consecutive products with no two adjacent hook patterns alike', () => {
    const patterns = patternsInOrder();

    let best = 1;
    let run = 1;
    for (let i = 1; i < patterns.length; i++) {
      run = patterns[i] === patterns[i - 1] ? 1 : run + 1;
      best = Math.max(best, run);
    }

    expect(best, `longest consecutive-distinct run was ${best} of ${patterns.length}`).toBeGreaterThanOrEqual(5);
  });

  /**
   * The same batch must not collapse onto two patterns either — a selector alternating A, B, A, B
   * would satisfy the run above while still giving the catalogue only two hook shapes, which is not
   * the rotation v4 §1 «Антиконвеєр» asks for.
   */
  it('spreads that batch across every available pattern, not just two', () => {
    const used = new Set(CATALOGUE.map(name => key(selectHookPattern(name, 'EXPERT3D'))));
    expect(used.size).toBe(HOOK_PATTERNS.length);
  });
});

describe('V5 — the module is pure: no clock, no randomness, no module-level state', () => {
  /**
   * NFR-5 as a property of the SOURCE, because the behavioural tests above cannot distinguish a
   * seeded PRNG that happens to be stable within one process from a pure function. Reading the file
   * is how the repository already checks a negative it cannot observe — see the `git diff --stat`
   * acceptance checks throughout the task breakdown.
   *
   * 🔴 IT MUST BE `NodeURL`, NOT THE GLOBAL `URL`. `vitest.config.ts:23` runs this suite under
   * happy-dom, whose global `URL` resolves against `http://localhost:3000/` and ignores a `file://`
   * base, so `fileURLToPath(new URL(…, import.meta.url))` throws `ERR_INVALID_URL_SCHEME` before
   * `readFileSync` is ever reached — the module source is never read and the assertions below can
   * neither pass nor fail honestly. `node:url`'s WHATWG `URL` is base-faithful. The repository
   * already carries this precedent at `src/app/components/html-editor/beautify-round-trip.spec.ts:13`.
   * The alternative — a `// @vitest-environment node` pragma — was not taken: it would change the
   * environment of the WHOLE file, including the twelve behavioural tests above, for the sake of one.
   */
  it('contains no Math.random, no Date and no mutable module-level binding', () => {
    const source = readFileSync(fileURLToPath(new NodeURL('./hook-pattern.ts', import.meta.url)), 'utf8');

    // ANTI-VACUITY GUARD, and it is the lesson of the defect above: three negatives over an empty
    // or wrong string all pass. This asserts the file that was read is the module under test before
    // any negative is evaluated.
    expect(source, 'read the wrong file, or an empty one').toContain('export function selectHookPattern');

    expect(source).not.toMatch(/Math\.random/);
    expect(source).not.toMatch(/\bnew Date\b|Date\.now/);
    expect(source).not.toMatch(/^\s*let\s/m);
  });
});

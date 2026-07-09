import { describe, it, expect } from 'vitest';
import { detectLengthOutliers, type LengthEntry } from './length-outlier';

function makeEntry(locale: string, visibleLength: number): LengthEntry {
  // strippedVisibleLength counts visible text after tag-stripping — plain text of the
  // requested length inside a trivial wrapper is enough to hit that exact count.
  return { locale, context: `HTML (${locale})`, html: `<p>${'x'.repeat(visibleLength)}</p>` };
}

describe('detectLengthOutliers', () => {
  it('flags the most severe outlier in a real-world-shaped run (en/es full, pt cut, uk far worse)', () => {
    // Real evidence from one run: en-GB 14067, es-ES 13822, pt-PT 4814 (cut mid-word),
    // uk-UA 169 (cut after the first paragraph). Median of the four is (4814+13822)/2 =
    // 9318, so the 25%-of-median threshold is ~2329.5 — uk-UA (169) is far below it, but
    // pt-PT (4814) is not: its truncation is real, but this is a RELATIVE cross-locale
    // check, not the only truncation signal. output-validator's absolute/structural
    // truncated-output rule (mid-word cutoff, tag imbalance) is what catches pt-PT — the
    // two checks are complementary, not redundant.
    const entries: LengthEntry[] = [
      makeEntry('en-GB', 14067),
      makeEntry('es-ES', 13822),
      makeEntry('pt-PT', 4814),
      makeEntry('uk-UA', 169),
    ];

    const outliers = detectLengthOutliers(entries);
    const flaggedLocales = outliers.map(o => o.locale);

    expect(flaggedLocales).toContain('uk-UA');
    expect(flaggedLocales).not.toContain('pt-PT');
    expect(flaggedLocales).not.toContain('en-GB');
    expect(flaggedLocales).not.toContain('es-ES');
  });

  it('does NOT flag anything when all locales are roughly the same length', () => {
    const entries: LengthEntry[] = [
      makeEntry('en-GB', 14000),
      makeEntry('es-ES', 13500),
      makeEntry('pt-PT', 13800),
      makeEntry('uk-UA', 14200),
    ];

    expect(detectLengthOutliers(entries)).toEqual([]);
  });

  it('does NOT flag anything with fewer than 2 entries (nothing to compare against)', () => {
    expect(detectLengthOutliers([makeEntry('uk-UA', 169)])).toEqual([]);
    expect(detectLengthOutliers([])).toEqual([]);
  });

  it('ignores empty/blank entries when computing the median and when flagging', () => {
    const entries: LengthEntry[] = [
      makeEntry('en-GB', 14000),
      makeEntry('es-ES', 13800),
      { locale: 'de-DE', context: 'HTML (de-DE)', html: '' },
      { locale: 'pl-PL', context: 'HTML (pl-PL)', html: '   ' },
    ];

    const outliers = detectLengthOutliers(entries);
    expect(outliers.map(o => o.locale)).not.toContain('de-DE');
    expect(outliers.map(o => o.locale)).not.toContain('pl-PL');
  });

  it('respects a custom ratio', () => {
    // 6000 is 40% of the 15000 median — flagged at the default 0.25 ratio's sibling 0.5,
    // not flagged at the stricter default 0.25 ratio.
    const entries: LengthEntry[] = [
      makeEntry('en-GB', 15000),
      makeEntry('es-ES', 15000),
      makeEntry('pt-PT', 6000),
    ];

    expect(detectLengthOutliers(entries, 0.25).map(o => o.locale)).not.toContain('pt-PT');
    expect(detectLengthOutliers(entries, 0.5).map(o => o.locale)).toContain('pt-PT');
  });

  it('returns entries with a zero median as a no-op (all effectively empty)', () => {
    const entries: LengthEntry[] = [
      { locale: 'en-GB', context: 'HTML (en-GB)', html: '<p></p>' },
      { locale: 'es-ES', context: 'HTML (es-ES)', html: '<p></p>' },
    ];
    // html.trim() is truthy (non-empty tag soup) even though strippedVisibleLength is 0,
    // so both entries pass the emptiness filter but produce a zero median.
    expect(detectLengthOutliers(entries)).toEqual([]);
  });
});

/**
 * number-format-fixer.v4.spec.ts — the fixer half of FR-16 / AC-10 (task breakdown T10).
 *
 * WHAT THIS ASKS FOR, AND WHY IT IS ALL RED TODAY. `fixNumberFormatting` is locale-BLIND: its own
 * header says it "strips locale-specific thousands separators", and `stripThousandsSeparators`
 * collapses comma groups, space groups AND period groups to bare digits for every locale alike.
 * T10's acceptance check asks for something different — group-3 input arriving as `1.234.567,89`
 * must come out grouped with a non-breaking space, and group-1 and group-2 input must come out
 * byte-unchanged. Every assertion below is therefore red, including the two that read like
 * characterizations, and that is a finding worth stating rather than a surprise: this is a
 * behaviour change to the fixer, not a configuration tweak. Recorded in the test generation report.
 *
 * 🔴 ONE SIGNATURE IS FIXED HERE BY `TEST_WRITING`. The plan says the fixer is "configured for the
 * three FR-16 groups" and names no parameter. A locale-blind function cannot be, so this file fixes
 * `fixNumberFormatting(html, productName, locale)` — the locale appended as a third, optional
 * parameter, for the same C-2 reason the hook-pattern parameter is optional: `fixNumberFormatting`
 * has existing call sites, and a required parameter would break them in the commit that adds it.
 *
 * NOT TOUCHED, DELIBERATELY. `decimal-separator.ts:52` and `identifier-decimal.ts:33` each hold
 * their own copy of `COMMA_DECIMAL_LOCALES`, explicitly mirroring the FROZEN validator, and all
 * three group-3 locales are already correct in them. Editing a mirror of a frozen file to "tidy"
 * it is how the three drift apart. `decimal-separator.spec.ts` stays green, unmodified.
 */
import { describe, it, expect } from 'vitest';

import { fixNumberFormatting } from './number-format-fixer';

const NBSP = ' ';

/** The locale-aware call T10 introduces. See the header for why the signature is fixed here. */
const fix = (html: string, locale: string): string =>
  (fixNumberFormatting as unknown as (h: string, p: string, l: string) => string)(html, '', locale);

describe('FR-16 group 3 — de-DE, es-ES and pt-PT group thousands with a non-breaking space', () => {
  it.each(['de-DE', 'es-ES', 'pt-PT'])('regroups a dot-grouped number for %s', locale => {
    expect(fix('<p>1.234.567,89 мм</p>', locale))
      .toContain(`1${NBSP}234${NBSP}567,89`);
  });

  it.each(['de-DE', 'es-ES', 'pt-PT'])('keeps the decimal comma for %s', locale => {
    expect(fix('<p>1.234.567,89</p>', locale)).toContain(',89');
    expect(fix('<p>1.234.567,89</p>', locale)).not.toContain('.89');
  });

  it('is idempotent — a second pass over already-grouped group-3 text changes nothing', () => {
    const once = fix('<p>1.234.567,89</p>', 'de-DE');
    // Assert the first pass actually produced the grouped form, or the idempotence check below
    // passes for any function at all, including the one that strips grouping entirely.
    expect(once).toContain(`1${NBSP}234${NBSP}567,89`);
    expect(fix(once, 'de-DE')).toBe(once);
  });
});

describe('FR-16 groups 1 and 2 — already correct, and left byte-unchanged', () => {
  it.each(['en-US', 'en-GB', 'en-ES', 'es-MX'])('leaves a group-1 number alone for %s', locale => {
    const html = '<p>1,234,567.89 mm</p>';
    expect(fix(html, locale)).toBe(html);
  });

  it.each(['uk-UA', 'ru-UA', 'pl-PL'])('leaves an already nbsp-grouped number alone for %s', locale => {
    const html = `<p>1${NBSP}234${NBSP}567,89 мм</p>`;
    expect(fix(html, locale)).toBe(html);
  });
});

describe('FR-21 — localization changes punctuation only', () => {
  /** AGENTS.md §4: "Space between number and unit: 1.75 mm, 200 °C (not 1.75mm)." */
  it('never changes a digit or a unit, and keeps the space between them', () => {
    const out = fix('<p>1.75 mm at 200 °C</p>', 'de-DE');
    expect(out).toMatch(/1[.,]75 ?\s?mm/);
    expect(out).toContain('200');
    expect(out).toContain('°C');
    expect(out).not.toMatch(/\d(mm|°C)/);
  });

  /**
   * The failure this repository has already had once: `stripThousandsSeparators` matched a model
   * DESIGNATOR — "XGRIDS L2 Pro 32 300" collapsed to "32300" in every locale. The invariant core of
   * the product name is masked out before the numeric transforms, and adding a locale must not lose
   * that protection.
   */
  it('still masks the product name’s invariant core out of every numeric transform', () => {
    // 🔵 CHARACTERIZATION — green today, because the third argument is simply ignored. Its job is
    // to fail loudly if adding the locale parameter loses the mask; the case itself is the one
    // `number-format-fixer.spec.ts:356-357` already pins, reused rather than re-invented.
    const out = (fixNumberFormatting as unknown as (h: string, p: string, l: string) => string)(
      '<p>Сканер XGRIDS L2 Pro 32 300 працює.</p>',
      'XGRIDS L2 Pro 32 300',
      'de-DE',
    );
    expect(out).toContain('XGRIDS L2 Pro 32 300');
  });

  /** An <img src> and every other attribute is preserved verbatim — the fixer walks text nodes only. */
  it('does not touch numbers inside attributes', () => {
    const html = '<img src="https://cdn.example/1.234.567/a.jpg" alt="Gerät">';
    expect(fix(html, 'de-DE')).toContain('https://cdn.example/1.234.567/a.jpg');
  });
});

/**
 * number-format-rules.v4.spec.ts — US-2.1 validation category V9 (FR-16, AC-10).
 *
 * FR-16 puts every `STORE_REGISTRY` locale into exactly one of three separator groups, and closes
 * OD-11's explicit either/or by placing `es-MX` in group 1. Only two things actually change in
 * `NUMBER_FORMAT_RULES`: `de-DE` and `es-ES` stop being offered "thousands dot (or space)" and are
 * fixed on the non-breaking space, and `pt-PT` gains a rule it has never had.
 *
 * 🔴 THE EDIT IS TARGETED, AND THAT IS A CONSTRAINT RATHER THAN A PREFERENCE.
 * `ua-translation-style-guide.spec.ts:49` asserts the EXACT substring
 * `'uk-UA / ru-UA: decimal comma, thousands non-breaking space'` against this constant, because an
 * earlier draft of the UA style guide said "do NOT insert any thousands separator" and contradicted
 * `NUMBER_FORMAT_RULES` a few thousand characters earlier in the same system prompt. A wholesale
 * rewrite of the block fails that deliberate test. The group-2 tripwire below is the same
 * assertion, restated here so the constraint is visible from the v4 side too.
 *
 * 🔵 ACCEPTED RESIDUAL R3, RECORDED RATHER THAN CLOSED. The group-3 switch ships with NO automated
 * detector: `NBSP_THOUSANDS_LOCALES` (`output-validator.ts:44`) is declared and never referenced
 * anywhere in the repository, and the live `thousands-separator` rule (`:93-102`) only flags
 * English-style comma grouping, so it cannot tell a dot from a non-breaking space. Arming one would
 * mean editing FROZEN `output-validator.ts` for a rule no FR requires, and it would fire on `'3.0'`
 * output and on translated locales alike. A de-DE artifact that keeps `1.234.567,89` therefore
 * produces zero validator issues, and only human review catches it.
 */
import { describe, it, expect } from 'vitest';

import { NUMBER_FORMAT_RULES } from './constants';

describe('V9 / FR-16 — group 2 is unchanged, and that is load-bearing', () => {
  /**
   * 🔵 CHARACTERIZATION — green on arrival, and it must survive T9 byte-identical. This is the
   * tripwire `ua-translation-style-guide.spec.ts:49` already holds; a targeted three-line edit
   * keeps it green, a rewrite does not.
   */
  it('keeps the uk-UA / ru-UA line exactly as the UA style guide asserts it', () => {
    expect(NUMBER_FORMAT_RULES).toContain('uk-UA / ru-UA: decimal comma, thousands non-breaking space');
  });

  it('keeps pl-PL in group 2', () => {
    expect(NUMBER_FORMAT_RULES).toMatch(/pl-PL:\s+decimal comma, thousands non-breaking space/);
  });
});

describe('V9 / FR-16 — group 1 already matches the decision, `es-MX` included', () => {
  /**
   * 🔵 CHARACTERIZATION. FR-16's `es-MX` placement needs NO code delta — `constants.ts` already
   * says "es-US / es-MX (US market, CLDR): decimal dot, thousands comma". The consequence the
   * Specification draws from that is that AC-10's separator clause is not scoped down: every
   * registry locale now has an explicit rule.
   */
  it.each([
    ['en-GB / en-ES', /en-GB \/ en-ES:\s+decimal dot, thousands comma/],
    ['en-US', /en-US:\s+decimal dot, thousands comma/],
    ['es-US / es-MX', /es-US \/ es-MX[^\n]*decimal dot, thousands comma/],
  ])('keeps %s on decimal dot and thousands comma', (_label, pattern) => {
    expect(NUMBER_FORMAT_RULES).toMatch(pattern);
  });
});

describe('V9 / FR-16 — group 3 is corrected and pt-PT is added', () => {
  it('no longer offers de-DE or es-ES a thousands DOT', () => {
    expect(NUMBER_FORMAT_RULES).not.toMatch(/de-DE:[^\n]*thousands dot/);
    expect(NUMBER_FORMAT_RULES).not.toMatch(/es-ES:[^\n]*thousands dot/);
    expect(NUMBER_FORMAT_RULES).not.toContain('1.234.567,89');
  });

  it.each(['de-DE', 'es-ES', 'pt-PT'])('fixes %s on decimal comma + non-breaking space', locale => {
    expect(NUMBER_FORMAT_RULES).toMatch(
      new RegExp(`${locale}:[^\\n]*decimal comma, thousands non-breaking space`),
    );
  });

  /** pt-PT has no rule at all today — the Appendix's Spain section covers es-ES, en-ES and uk-UA only. */
  it('gives pt-PT a rule where the v4 Appendix states none', () => {
    expect(NUMBER_FORMAT_RULES).toContain('pt-PT');
  });

  /**
   * Every group line carries a worked example. Group 3's must become the same one group 2 already
   * shows, since the two groups now specify the same separators.
   *
   * Asserted BY COMPARISON with the pl-PL line rather than against a literal, deliberately: D10
   * permits exactly three changed lines, and pinning the example's own spelling here would force
   * an edit to the group-2 lines that the `ua-translation-style-guide.spec.ts:49` tripwire exists
   * to prevent. (Today that example is written with an ordinary space, not U+00A0 — recorded so it
   * reads as a known fact rather than an oversight.)
   */
  it('gives group 3 the same worked example group 2 already shows', () => {
    const exampleFor = (locale: string) =>
      NUMBER_FORMAT_RULES.match(new RegExp(`${locale}:[^\\n]*→\\s*(\\S[^\\n]*)`))?.[1]?.trim();

    const groupTwo = exampleFor('pl-PL');
    expect(groupTwo, 'the pl-PL example line could not be located').toMatch(/\S/);
    for (const locale of ['de-DE', 'es-ES', 'pt-PT']) {
      expect(exampleFor(locale), locale).toBe(groupTwo);
    }
  });
});

describe('V9 / FR-21 — only the separator punctuation localizes', () => {
  /** 🔵 CHARACTERIZATION — the clause exists today and bounds what T9 may change. */
  it('states that digits and units never change', () => {
    expect(NUMBER_FORMAT_RULES).toMatch(/[Nn]ever change the digits or the\s+unit/);
  });

  it('applies the rule to spec-table cells as well as running text', () => {
    expect(NUMBER_FORMAT_RULES).toMatch(/spec-table <td> cells/);
  });
});

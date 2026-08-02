/**
 * seo-currency-wiring.spec.ts
 *
 * WHY THIS EXISTS. `meta-description-currency` is a well-tested rule in output-validator.ts that
 * had NEVER FIRED in production. Every one of the six `validateSeoMetadata` call sites in
 * content-orchestrator.service.ts passed `''` as the currency symbol, and the validator
 * short-circuits on a falsy symbol:
 *
 *     if (currencySymbol && !desc.includes(currencySymbol)) { … }
 *
 * So the rule was dead code. Both 2026-08-02 EXPERT3D runs shipped meta_descriptions containing no
 * `€` in any of the four locales — a CLAUDE.md acceptance criterion — and nothing reported it,
 * because the check that would have reported it was disabled at every call site.
 *
 * WHY A SOURCE-LEVEL TEST. The defect is in the WIRING, not in either component, and both
 * components pass their own tests today. ContentOrchestratorService has no unit harness — it is a
 * large Angular service with heavy DI — and building one solely to observe an argument would cost
 * far more than it proves. This reads the call sites directly, which is exactly the granularity the
 * regression lives at. The same shape as arch-guard.sh's checks, expressed in vitest.
 *
 * If an orchestrator harness ever exists, replace this with a behavioural test.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = readFileSync(
  join(__dirname, 'content-orchestrator.service.ts'),
  'utf8',
);

/** Every `validateSeoMetadata(...)` call, captured with its argument list. */
const CALLS = [...SOURCE.matchAll(/validateSeoMetadata\(([^;]*?)\)[,;)\s]/g)].map(m => m[1]);

describe('SEO currency validation is actually wired up', () => {
  it('finds the call sites at all — a rename must not silently empty this spec', () => {
    // Guards the vacuous pass: a regex that matches nothing would make every assertion below
    // trivially true.
    expect(CALLS.length).toBeGreaterThanOrEqual(5);
  });

  /** The exact defect: `''` disables the rule. */
  it('no call site passes an empty currency symbol', () => {
    const disabled = CALLS.filter(c => /,\s*''\s*$/.test(c.trim()));
    expect(disabled, `these call sites disable meta-description-currency:\n${disabled.join('\n')}`)
      .toHaveLength(0);
  });

  /**
   * Positive form, so passing some other falsy expression cannot pass this file.
   * currencySymbolFor is the single resolution point — see its comment in constants.ts for why
   * it is not getStore(), which would default an unknown store to `€`.
   */
  it('every call site resolves the symbol through currencySymbolFor', () => {
    for (const call of CALLS) {
      expect(call, call).toContain('currencySymbolFor(');
    }
  });

  it('imports the helper it uses', () => {
    expect(SOURCE).toMatch(/import\s*{[^}]*currencySymbolFor[^}]*}\s*from\s*'\.\.\/prompt-core\/constants'/);
  });
});

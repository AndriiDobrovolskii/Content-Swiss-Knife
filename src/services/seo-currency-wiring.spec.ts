/**
 * seo-currency-wiring.spec.ts
 *
 * THE CURRENCY CHECK IS OFF ON PURPOSE. This spec exists to keep it off.
 *
 * `meta-description-currency` is a real, well-tested rule in output-validator.ts, and every
 * `validateSeoMetadata` call site in content-orchestrator.service.ts passes an empty symbol, which
 * short-circuits it:
 *
 *     if (currencySymbol && !desc.includes(currencySymbol)) { … }
 *
 * That looks exactly like an oversight, and on 2026-08-02 it was read as one and "fixed" by wiring
 * each store's registry symbol through. The result was a rule no model can satisfy — one unfixable
 * warning per locale on every generation, five per run for Center 3D Print. It was reverted the
 * same day. This file is the guard so the next reader does not repeat it.
 *
 * WHY THE RULE CANNOT FIRE HERE — three facts, each sufficient alone:
 *
 *   1. `src/prompts/task-b.ts:61` (FROZEN) instructs the OPPOSITE: "Do NOT invent prices,
 *      discounts, currency values, or availability — not provided here; those are emitted
 *      separately via Schema.org Offer."
 *   2. `resolveCurrencySymbol` in that same file is `@deprecated` and referenced nowhere, with the
 *      reason recorded: "Currency is no longer injected into the Task B prompt. Price is not
 *      available at this pipeline stage."
 *   3. `ProductInput` (src/app/types.ts) has no price field, so nothing in the pipeline could put
 *      a number beside the symbol even if the prompt allowed it.
 *
 * If price ever IS plumbed through to Task B, delete this file and wire the symbol — but change the
 * prompt first, or the model will be told to do the thing it is forbidden from doing.
 *
 * WHY A SOURCE-LEVEL TEST. The property is about the WIRING, and both components pass their own
 * tests either way. ContentOrchestratorService is a large Angular service with heavy DI and no unit
 * harness; building one solely to observe an argument would cost far more than it proves. This
 * reads the call sites directly, which is the granularity the regression lives at — the same shape
 * as arch-guard.sh's checks, expressed in vitest.
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

describe('the SEO currency check stays disabled', () => {
  it('finds the call sites at all — a rename must not silently empty this spec', () => {
    // Guards the vacuous pass: a regex matching nothing would make every assertion below
    // trivially true.
    expect(CALLS.length).toBeGreaterThanOrEqual(5);
  });

  /**
   * The named constant is the point. A bare `''` is what got misread as dead code; a symbol whose
   * definition carries the three facts above cannot be.
   */
  it('every call site disables the check through the named constant', () => {
    for (const call of CALLS) {
      expect(call, call).toMatch(/,\s*NO_CURRENCY_CHECK\s*$/);
    }
  });

  it('the constant is empty, which is what actually disables the rule', () => {
    expect(SOURCE).toMatch(/const NO_CURRENCY_CHECK = '';/);
  });

  /** The reasoning must travel with the code, or the next reader re-derives it wrongly. */
  it('the constant carries the reason, citing the frozen prompt that forbids it', () => {
    const doc = SOURCE.slice(0, SOURCE.indexOf("const NO_CURRENCY_CHECK = '';"));
    expect(doc).toContain('task-b.ts:61');
    expect(doc).toMatch(/no price field|Price is not available/i);
  });

  /** Belt and braces: no call site may resolve a real symbol from the registry. */
  it('no call site resolves a store currency symbol', () => {
    for (const call of CALLS) {
      expect(call, call).not.toMatch(/currencySymbol|STORE_REGISTRY|getStore\(/);
    }
  });
});

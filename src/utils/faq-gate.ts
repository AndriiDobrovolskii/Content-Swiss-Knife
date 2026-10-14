/**
 * faq-gate.ts — US-8.1 T5: the FAQ validation composition and the store-or-skip decision.
 *
 * Pure and deterministic (no DOM, clock or random call, NFR-8). Three exports used by the orchestrator's
 * FAQ pipeline:
 *
 *  - `FAQ_MAX_ATTEMPTS` — the fixed attempt cap per FAQ artifact (AC-16, AC-17). One attempt is one
 *    `produce` call, so the repair gate is run with `maxRepairs = FAQ_MAX_ATTEMPTS - 1`. It is NOT the
 *    user-tunable `maxRepairs()` signal.
 *  - `buildFaqValidator` — the `validate` callback for `runRepairGate<string>`. Contract errors are the
 *    FAQ's own rules: `faq-provider-error`, the five `validateFaqShape` rules and, for a translation,
 *    `structural-parity-count`. Every finding of the FROZEN `validateGeneratedHtml` and the
 *    `non-html-output` check is DEMOTED to `severity: 'warning'` (plan D6): "valid" in FR-10 means FR-9, so
 *    a FR-9-valid master must not be regenerated or discarded because the frozen description validator
 *    objects to its prose.
 *  - `isFaqStorable` — the only store-or-skip decision: true when no contract rule survives at error
 *    severity.
 *
 * Every contract issue is path-less, so `resolveLadder` gives `['full-regen']` and `repair-strategy.ts`
 * needs no registration. `output-validator.ts` (FROZEN) is imported, never edited.
 */
import { validateGeneratedHtml, type ValidationIssue } from './output-validator';
import { FAQ_SHAPE_RULES, validateFaqShape } from './faq-html';
import { validateFaqStructuralParity } from './structural-parity';

/** Attempts per FAQ artifact; one attempt equals one `produce` call. */
export const FAQ_MAX_ATTEMPTS = 3;

const RULE_PROVIDER_ERROR = 'faq-provider-error';
const RULE_STRUCTURAL_PARITY = 'structural-parity-count';

/**
 * Rule ids that are contract errors: `faq-provider-error`, the five `validateFaqShape` ids and
 * `structural-parity-count`.
 */
export const FAQ_CONTRACT_RULES: ReadonlySet<string> = new Set([
  RULE_PROVIDER_ERROR,
  ...FAQ_SHAPE_RULES,
  RULE_STRUCTURAL_PARITY,
]);

export interface FaqValidatorOptions {
  /** Human display string used as `context` on every issue, e.g. 'FAQ (uk-UA)' or 'FAQ (pl-PL)'. */
  context: string;
  /** Passed to the frozen validateGeneratedHtml as its `productName` argument. */
  productName: string;
  /** BCP-47 locale of the artifact being validated; passed as validateGeneratedHtml's `locale`. */
  locale: string;
  /**
   * The stored uk-UA master HTML. PRESENT => the artifact is a translation and
   * validateFaqStructuralParity(master, html, context) is applied. ABSENT => it is the master.
   */
  master?: string;
  /**
   * Read at EVERY validate call. When it returns true the only issue returned is one
   * faq-provider-error (severity 'error', no `path`, so resolveLadder gives ['full-regen']).
   */
  providerFailed?: () => boolean;
}

/** Returns the `validate` callback for runRepairGate<string>. Pure and deterministic. */
export function buildFaqValidator(opts: FaqValidatorOptions): (html: string) => ValidationIssue[] {
  const { context, productName, locale, master, providerFailed } = opts;

  return (html: string): ValidationIssue[] => {
    if (providerFailed?.()) {
      return [{
        severity: 'error',
        rule: RULE_PROVIDER_ERROR,
        detail: 'The provider call failed for this attempt; no usable FAQ text was produced.',
        context,
      }];
    }

    const issues: ValidationIssue[] = [...validateFaqShape(html, context)];
    if (master !== undefined) {
      issues.push(...validateFaqStructuralParity(master, html, context));
    }

    const advisory = validateGeneratedHtml(html, context, productName, locale);
    if (html && !html.trim().startsWith('<')) {
      advisory.push({
        severity: 'error',
        rule: 'non-html-output',
        detail: 'Output is not HTML (does not start with "<").',
        context,
      });
    }
    for (const issue of advisory) {
      issues.push({ ...issue, severity: 'warning' });
    }
    return issues;
  };
}

/**
 * true when finalIssues has no issue with severity 'error' and rule in FAQ_CONTRACT_RULES.
 * Frozen-validator findings (demoted to 'warning') never make an artifact unstorable.
 */
export function isFaqStorable(finalIssues: readonly ValidationIssue[]): boolean {
  return !finalIssues.some(i => i.severity === 'error' && FAQ_CONTRACT_RULES.has(i.rule));
}

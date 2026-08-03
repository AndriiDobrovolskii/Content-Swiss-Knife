/**
 * doc-schema-issues.ts
 *
 * Turns a rejected ProductDescriptionDoc into the `ValidationIssue[]` vocabulary the repair gate
 * already speaks.
 *
 * WHY THIS IS NEEDED AT ALL. `runRepairGate` calls `opts.produce()` at repair-gate.ts:112 and :339,
 * both bare `await` with no try/catch — its only try block (202–219) is the tier-1 field path. On
 * the Doc path `produce` calls `ProductDescriptionDocSchema.parse()`, which THROWS. That throw
 * escaped the gate and killed the whole generation: no retry, no repair, no fallback. The HTML path
 * never had this failure mode, because generateText returns a string and the transforms cannot
 * throw on bad content.
 *
 * The fix belongs at the CALL SITE, not in repair-gate.ts: that module is shared with the HTML, FAQ
 * and SEO paths, and wrapping `produce` there would change failure semantics for all of them.
 *
 * WHY IT CONVERTS RATHER THAN JUST SWALLOWING. `appendRepairFeedback` interpolates each issue's
 * `detail` into the retry prompt. Returning an empty artifact without issues would tell the model
 * only "empty-output: Generated HTML is empty" — true, useless, and about a symptom rather than the
 * cause. Naming the field it got wrong is the difference between a repair that can succeed and one
 * that cannot.
 */
import type { ValidationIssue } from '../utils/output-validator';

/** Stable rule name, so these can be counted and filtered like any other validator finding. */
export const DOC_SCHEMA_RULE = 'doc-schema';

/** Shape-checks a zod error without importing zod — this module stays dependency-free. */
function zodIssues(error: unknown): Array<{ path?: unknown[]; message?: string }> | null {
  const issues = (error as { issues?: unknown })?.issues;
  return Array.isArray(issues) ? (issues as Array<{ path?: unknown[]; message?: string }>) : null;
}

/**
 * Every failure inside the Doc branch of `produce`, expressed as errors.
 *
 * ERROR SEVERITY IS LOAD-BEARING: the repair gate only spends an attempt on `severity: 'error'`.
 * A warning here would mean a rejected Doc silently shipping as an empty description.
 *
 * NEVER RETURNS AN EMPTY ARRAY. An attempt that failed but reported nothing would look clean to the
 * gate, which would then treat an empty artifact as its best result — exactly the outcome this
 * whole module exists to prevent.
 *
 * @param error  a ZodError, or any other throw from the Doc branch (malformed JSON that never
 *               reached the schema, a network failure, anything).
 * @param context the gate label, so the issue reads the same as every other one for that artifact.
 */
export function docSchemaIssues(error: unknown, context: string): ValidationIssue[] {
  const issues = zodIssues(error);

  if (issues && issues.length > 0) {
    return issues.map(i => {
      // Full dotted path, not just the root: "specs.categories.0.rows.0.value" tells the model
      // where to look; "specs" sends it to re-read a section that is mostly fine.
      const path = Array.isArray(i.path) && i.path.length ? i.path.join('.') : '(root)';
      return {
        severity: 'error' as const,
        rule: DOC_SCHEMA_RULE,
        detail: `${path}: ${i.message ?? 'invalid value'}`,
        context,
      };
    });
  }

  // Not a zod error — JSON that never parsed, or any other throw. Still an error, still reportable.
  // Duck-type: Angular's HttpErrorResponse does NOT extend Error, so `instanceof Error` is false
  // even though it carries a `message` property. Without this branch, a server 500 reaches the
  // repair gate as the generic fallback below — useless for the model and invisible in the log.
  const message =
    error instanceof Error ? error.message
    : typeof error === 'string' ? error
    : (typeof error === 'object' && error !== null && 'message' in error && typeof (error as Record<string, unknown>).message === 'string')
      ? (error as Record<string, unknown>).message as string
    : 'The model did not return a usable ProductDescriptionDoc.';

  return [{
    severity: 'error' as const,
    rule: DOC_SCHEMA_RULE,
    detail: `Document could not be parsed or validated — ${message}`,
    context,
  }];
}

/**
 * Refuses to let an empty artifact leave the Doc path.
 *
 * THE SECOND HOLE, and it only appears once the first is fixed. Returning `''` from `produce` makes
 * a failed attempt visible to the gate — which is what enables the retry — but when EVERY attempt
 * fails the gate still returns its least-bad result, and that is the empty string. Downstream it
 * would be saved as the product description. A test in doc-repair-recovery.spec.ts pins that the
 * gate really does behave this way, rather than assuming it.
 *
 * Throwing is the right outcome. The alternative — persisting an empty description — is a silent
 * data loss that surfaces days later as "why is this product blank", with no trace of the cause.
 * The schema issues are folded into the message so the log says which field the model kept getting
 * wrong, not merely that something failed.
 *
 * Only used on the Doc path. The HTML path has no equivalent failure: `generateText` returns a
 * string and the transforms cannot throw on content.
 */
export function assertDocRendered(html: string, context: string, issues: ValidationIssue[]): void {
  if (html.trim()) return;

  const schemaFailures = issues
    .filter(i => i.rule === DOC_SCHEMA_RULE)
    .map(i => `  - ${i.detail}`)
    .join('\n');

  throw new Error(
    `${context}: the model never produced a valid ProductDescriptionDoc within the repair budget, ` +
      `so there is nothing to save.` +
      (schemaFailures ? `\nUnresolved schema failures:\n${schemaFailures}` : ''),
  );
}

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
 * The provider's own words for a failure, dug out of the proxy envelope.
 *
 * WHY THIS IS NOT JUST `error.message`. `sendError` (server/index.js:38) answers every failure as
 * `res.status(...).json({ error: describeError(error) })`, so what the browser holds is an
 * HttpErrorResponse whose `.message` is Angular's own `"Http failure response for
 * /api/llm/generate: 500 Internal Server Error"` and whose real text sits at `.error.error`. Reading
 * `.message` therefore threw away the only sentence worth having: the server log said
 * `hit max_tokens (64000) on claude-sonnet-4-6` while the repair prompt was told "500 Internal
 * Server Error".
 *
 * Duck-typing that envelope rather than importing HttpErrorResponse keeps this module
 * dependency-free, and it is the same shape `isUpstreamTransportFailure` already recognises
 * (src/services/http-retry.ts).
 */
export function providerDetail(error: unknown): string | undefined {
  if (typeof error === 'string') return error;
  if (!error || typeof error !== 'object') return undefined;

  const body = (error as { error?: unknown }).error;
  if (body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string') {
    return (body as { error: string }).error;
  }
  // A plain string body, and finally the generic message — better than nothing when the envelope
  // is absent (a thrown Error inside the Doc branch, a proxy that answered for the server).
  if (typeof body === 'string' && body) return body;

  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' ? message : undefined;
}

/**
 * Deterministic provider guards, which repair cannot fix.
 *
 * A truncation and a safety block are properties of the REQUEST, not of the field the model got
 * wrong: re-issuing the same prompt with "you failed, try again" feedback produces the same
 * truncation, at the same cost, however many attempts are left. On the Doc path that is expensive in
 * a way schema errors are not — `masterRepairBudget` grants up to 3 attempts and a deep Sonnet 4.6
 * call runs for minutes, so one truncation could burn an hour before `assertDocRendered` finally
 * throws with nothing to show for it.
 *
 * This is not a new classification. server/utils/retry.js already names "a truncation guard" and "a
 * safety block" as the errors that must fail fast rather than be retried; the repair gate simply
 * never knew about the rule. Matching is done on the provider's own wording, which both providers
 * share by construction: `[anthropic] output truncated: hit max_tokens` and
 * `[gemini] … truncated: hit maxOutputTokens`.
 *
 * TIMEOUTS ARE DELIBERATELY EXCLUDED. Those are transient — a retry can legitimately succeed, and
 * withRetry has already spent its own attempts on them before the error ever reaches here.
 */
export function isUnrepairableGenerationError(error: unknown): boolean {
  const detail = providerDetail(error);
  if (!detail) return false;

  return detail.includes('truncated: hit')
    || detail.includes('refused by safety classifier')
    || detail.includes('blocked by safety filter');
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
  // providerDetail() unwraps the proxy envelope first, so a server-side failure arrives here as the
  // provider's own sentence rather than Angular's "500 Internal Server Error" — the difference
  // between a repair prompt that names the cause and one that describes the HTTP status.
  const message = providerDetail(error) || 'The model did not return a usable ProductDescriptionDoc.';

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

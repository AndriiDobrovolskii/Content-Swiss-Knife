/**
 * json-parse.js
 *
 * Parses LLM-generated JSON, repairing the syntax defects models actually produce.
 *
 * Shared by all three providers and every JSON call in the app — SEO metadata, slugs, keywords, and
 * the ProductDescriptionDoc — so this is the one place worth hardening.
 *
 * WHY REPAIR AT ALL. Structured-output modes are not infallible. Observed twice on real runs:
 * `Expected ',' or '}' after property value … position 16478 (line 436 column 1)` and `… position
 * 16203 (line 460 column 1)`. Column 1 both times: the model ended a value and omitted the
 * separator before the next line. Neither was truncation — every provider guards that before
 * parsing, and the failing call used 17173 of 65536 available output tokens.
 *
 * Unrepaired, that costs a whole generation after the tokens are already spent: the server 500s,
 * the client sees an opaque HttpErrorResponse, and the repair gate can only say "something failed".
 *
 * WHY A LIBRARY RATHER THAN OUR OWN REPAIR. A hand-rolled pass was tried first. It was string-aware
 * and safe, and it still did not fix the bug above — it repaired trailing commas and control
 * characters, neither of which has ever been observed in this project, and threw on the missing
 * separator that had twice killed a generation. Hand-rolling means the repair set is a guess about
 * what a model will do next. `jsonrepair` covers ~18 defect classes including missing commas,
 * single quotes, unquoted keys, typographic quotes and Python constants.
 *
 * THE LIBRARY IS LENIENT IN TWO DIRECTIONS WE DO NOT WANT, so it is bracketed by two guards of our
 * own — `assertNotTruncated` before it, and a shape check after it. Both are documented at their
 * definitions. Being generous about syntax is what we want; being generous about *meaning* is not.
 */

import { jsonrepair } from 'jsonrepair';

/**
 * Strip code fences and parse, repairing only if the direct parse fails.
 *
 * The happy path is a plain `JSON.parse` and cannot regress — repair is never reached for
 * well-formed input, so a defect in the repair path cannot corrupt a valid document.
 */
export function parseJsonResponse(text) {
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    // Before the library sees it — see assertNotTruncated. This throw is deliberately not caught
    // by the fallback below: a truncated response must fail loudly, not fall through to a repair.
    assertNotTruncated(cleaned);
    try {
      const repaired = JSON.parse(jsonrepair(cleaned));
      // A repaired scalar is not a repair — it is jsonrepair quoting prose. See below.
      if (repaired === null || typeof repaired !== 'object') throw firstError;
      return repaired;
    } catch {
      // The ORIGINAL error, deliberately. It describes the text the model actually produced;
      // an error from the repaired copy would report positions that exist in no artifact anyone
      // can inspect.
      throw firstError;
    }
  }
}

/*
 * THE SHAPE GUARD, explained where there is room for it.
 *
 * jsonrepair will quote arbitrary prose into a valid JSON string. Verified:
 *
 *   in:  I could not complete that request.
 *   out: "I could not complete that request."     ← parses cleanly, as a STRING
 *
 * That is a model refusal, a proxy error page, or a stray apology — never a description. Without
 * the guard it stops being an exception and becomes data: `parseJsonResponse` hands back a string,
 * and callers with no schema (SEO metadata, slugs, keywords) carry it forward as if it were an
 * object. Every JSON call in this app expects an object or an array at the top level, so a repaired
 * scalar means the repair invented something rather than recovering it.
 *
 * Deliberately scoped to the REPAIR path. Valid JSON is returned untouched whatever its shape —
 * the happy path stays exactly as it was, and bare prose is not valid JSON anyway.
 */

/**
 * Throws if the document was cut off rather than merely malformed.
 *
 * THIS IS LOAD-BEARING, AND IT IS THE ONE PLACE WE DO NOT DELEGATE TO THE LIBRARY. Two entries on
 * jsonrepair's own feature list are "Add missing closing brackets" and "Repair truncated JSON", so
 * it will happily turn a cut-off response into a structurally valid object with fields silently
 * gone. Verified against the real thing:
 *
 *   in:  {"hook":"половина речен          (the response stops mid-word)
 *   out: {"hook":"половина речен"}        (parses cleanly, ships a half-sentence)
 *
 * On the Doc path zod would reject that. SEO metadata, slugs and keywords have no schema gate and
 * would ship the partial. A loud failure is worth far more than a quiet wrong answer, so truncation
 * stays fatal and this check runs BEFORE jsonrepair.
 *
 * DEFENCE IN DEPTH, NOT REDUNDANCY. All three providers already throw on a truncated response —
 * `anthropic.js` on `stop_reason === 'max_tokens'`, `gemini.js` on `finishReason === 'MAX_TOKENS'`,
 * `openai.js` on `finish_reason === 'length'`. But those guards depend on the provider reporting
 * it: a cut stream, a proxy timeout or a future provider sets nothing at all.
 *
 * A DETECTOR, NEVER A REWRITER. It returns nothing and modifies nothing. The previous hand-rolled
 * attempt corrupted prose because it edited the text as it walked it; with no output there is
 * nothing to corrupt, and the `inString`/`escaped` walk below — the part of that attempt that was
 * always correct — is all that survives.
 *
 * A SURPLUS closer is NOT truncation. `{"a":1}}` leaves depth at -1, which is a repairable syntax
 * error and jsonrepair's job; only an UNCLOSED container (depth > 0) or an unterminated string
 * means the text stopped early.
 */
function assertNotTruncated(text) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    // Previous character was a backslash inside a string — this one is already escaped.
    if (escaped) { escaped = false; continue; }
    if (inString && ch === '\\') { escaped = true; continue; }

    // An unescaped quote toggles string state. Reached only when `escaped` is false, so \" inside
    // a string does not end it.
    if (ch === '"') { inString = !inString; continue; }

    if (inString) continue;

    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') depth--;
  }

  if (inString) {
    throw new Error(
      `[json-parse] response truncated: unterminated string at end of input ` +
      `(${text.length} chars). The model stopped mid-value — do not trust a partial artifact.`
    );
  }
  if (depth > 0) {
    throw new Error(
      `[json-parse] response truncated: ${depth} unclosed container(s) at end of input ` +
      `(${text.length} chars). The model stopped early — do not trust a partial artifact.`
    );
  }
}

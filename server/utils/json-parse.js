/**
 * json-parse.js
 *
 * Parses LLM-generated JSON, with a narrow repair pass for defects models actually produce.
 *
 * Shared by all three providers and every JSON call in the app — SEO metadata, slugs, keywords, and
 * the ProductDescriptionDoc — so this is the one place worth hardening.
 *
 * WHY REPAIR AT ALL. Structured-output modes are not infallible. Observed twice on real runs:
 * `Expected ',' or '}' … position 16478 (line 436 column 1)` and `… position 16203 (line 460
 * column 1)`. Column 1 both times: the model ended a value and omitted the separator before the
 * next line. Neither was truncation — both providers that guard it (see below) would have thrown a
 * different error first, and the failing call used 17173 of 65536 available output tokens.
 *
 * Unrepaired, that costs a whole generation after the tokens are already spent: the server 500s,
 * the client sees an opaque HttpErrorResponse, and the repair gate can only say "something failed".
 */

/**
 * Strip code fences and parse, repairing only if the direct parse fails.
 *
 * The happy path is a plain `JSON.parse` and cannot regress — repair is never reached for
 * well-formed input, so a bug in the repair pass cannot corrupt a valid document.
 */
export function parseJsonResponse(text) {
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    try {
      return JSON.parse(repairJson(cleaned));
    } catch {
      // The ORIGINAL error, deliberately. It describes the text the model actually produced;
      // an error from the repaired copy would report positions that exist in no artifact anyone
      // can inspect.
      throw firstError;
    }
  }
}

/**
 * ONE string-aware pass. Both repairs happen inside the same character walk, and that is the point.
 *
 * WHY NOT A REGEX. The first implementation did the comma fix as
 * `replace(/,\s*([\]}])/g, '$1')` over the whole document. It is not string-aware, and it silently
 * corrupted prose:
 *
 *   in:  {"hook":"Формати: JPG, ] і PNG"}
 *   out: {"hook":"Формати: JPG] і PNG"}
 *
 * Product descriptions are full of brackets and commas, so that is not a corner case. Tracking
 * `inString` is the only way to know whether a comma is syntax or content, and once the walk exists
 * there is no reason to run a second, blind pass over the result.
 *
 * WHAT IT REPAIRS — exactly two things, both observed:
 *
 *   1. Unescaped control characters inside strings. The model writes multi-line prose into a JSON
 *      string without escaping the newline; the parser ends the string early and fails on the next
 *      token.
 *   2. A trailing comma before `}` or `]`. Typically the model dropped an element while
 *      self-editing and left the separator behind.
 *
 * WHAT IT DELIBERATELY DOES NOT REPAIR — truncation. An earlier version appended missing closers,
 * which turned a cut-off response into a structurally valid object with fields simply gone: a quiet
 * wrong answer in place of a loud failure. On the Doc path zod would catch it, but SEO metadata,
 * slugs and keywords have no such gate and would have shipped the partial. All three providers now
 * throw on truncation BEFORE parsing — `anthropic.js` on `stop_reason === 'max_tokens'`,
 * `gemini.js` on `finishReason === 'MAX_TOKENS'`, `openai.js` on `finish_reason === 'length'` — so
 * nothing legitimate arrives here truncated. If something does, it is a bug worth surfacing.
 */
function repairJson(text) {
  const out = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    // Previous character was a backslash inside a string — this one is already escaped.
    if (escaped) { out.push(ch); escaped = false; continue; }

    if (inString && ch === '\\') { out.push(ch); escaped = true; continue; }

    // An unescaped quote toggles string state. Reached only when `escaped` is false, so \" inside
    // a string does not end it.
    if (ch === '"') { inString = !inString; out.push(ch); continue; }

    if (inString) {
      // Literal control characters are illegal inside a JSON string; escape rather than drop, so
      // the prose keeps its line breaks.
      if (ch === '\n') { out.push('\\n'); continue; }
      if (ch === '\r') { out.push('\\r'); continue; }
      if (ch === '\t') { out.push('\\t'); continue; }
      out.push(ch);
      continue;
    }

    // Outside a string: a comma whose next non-whitespace character closes the container is a
    // trailing comma. Dropping it here is safe precisely because we know we are not in a string.
    if (ch === ',') {
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j++;
      if (text[j] === '}' || text[j] === ']') continue;
    }

    out.push(ch);
  }

  return out.join('');
}

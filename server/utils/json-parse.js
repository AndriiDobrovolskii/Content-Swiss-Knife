/**
 * json-parse.js
 *
 * Parses LLM-generated JSON with lightweight repair for common syntax errors.
 *
 * WHY REPAIR AT ALL. Gemini's `responseMimeType: 'application/json'` is not infallible — the model
 * can still produce trailing commas, unescaped control characters inside strings, or (rarely)
 * truncated output that `JSON.parse` rejects. When that happens the server returns a 500, which
 * the client receives as an Angular HttpErrorResponse — an opaque failure that the repair gate
 * cannot give useful feedback on. Repairing the syntax here converts that opaque 500 into a
 * structurally-valid object that reaches the client's zod schema, where any SEMANTIC issues are
 * diagnosed with field-level detail and fed back to the model as targeted repair instructions.
 *
 * REPAIR ORDER IS LOAD-BEARING. Control-char escaping must run before comma/brace fixes, because
 * a literal newline inside a string shifts every subsequent character position and makes the
 * comma regex match in the wrong places.
 */

/** Strip code fences and parse the LLM response as JSON, with lightweight repair on failure. */
export function parseJsonResponse(text) {
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    // Attempt repair — if it still fails, throw the ORIGINAL error so the message
    // points at the unmodified text and position numbers stay meaningful.
    try {
      return JSON.parse(repairJson(cleaned));
    } catch {
      throw firstError;
    }
  }
}

/**
 * Best-effort repair of the most common LLM JSON defects.
 *
 * This is NOT a general-purpose JSON5 parser. It targets exactly three failure modes
 * observed in production Gemini output:
 *
 *   1. Unescaped control characters inside string values (newlines, tabs, carriage returns).
 *      The model writes multi-line prose into a JSON string without \n escaping — the parser
 *      sees the literal newline as the end of the line and fails on the next token.
 *
 *   2. Trailing commas before `}` or `]`. Common when the model deletes an array element
 *      during self-editing but forgets to remove the preceding comma.
 *
 *   3. Unclosed braces/brackets at the end (output truncation). The model hit the output
 *      token limit or was cut off, leaving valid JSON up to a point but missing closers.
 */
function repairJson(text) {
  let repaired = text;

  // ── Phase 1: escape unescaped control characters inside JSON strings ────
  // Walk the text character-by-character, tracking whether we're inside a string.
  // Any literal \n, \r, or \t inside a string is replaced with its escape sequence.
  repaired = escapeControlCharsInStrings(repaired);

  // ── Phase 2: strip trailing commas before } or ] ───────────────────────
  repaired = repaired.replace(/,\s*([\]}])/g, '$1');

  // ── Phase 3: balance unclosed braces / brackets ────────────────────────
  repaired = balanceClosers(repaired);

  return repaired;
}

/**
 * Character-by-character pass that escapes literal control characters inside JSON strings.
 *
 * The state machine tracks `inString` and `escaped` to avoid touching characters outside
 * strings or already-escaped sequences like `\\n`.
 */
function escapeControlCharsInStrings(text) {
  const out = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      // Previous char was a backslash inside a string — this char is already escaped.
      out.push(ch);
      escaped = false;
      continue;
    }

    if (inString && ch === '\\') {
      out.push(ch);
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      out.push(ch);
      continue;
    }

    if (inString) {
      // Replace literal control characters with their JSON escape sequences.
      if (ch === '\n') { out.push('\\n'); continue; }
      if (ch === '\r') { out.push('\\r'); continue; }
      if (ch === '\t') { out.push('\\t'); continue; }
    }

    out.push(ch);
  }

  return out.join('');
}

/**
 * Count unmatched openers and append the corresponding closers.
 *
 * Uses the same `inString` / `escaped` state machine to skip characters inside strings.
 * Closers are appended in LIFO order (last-opened first-closed), which is correct for
 * truncated JSON where the structure was valid up to the cut point.
 */
function balanceClosers(text) {
  const stack = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escaped) { escaped = false; continue; }
    if (inString && ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }

  // Append closers in reverse (LIFO) order.
  return text + stack.reverse().join('');
}

/**
 * Common self-correction openers observed/plausible in leaked model reasoning. Matched at the
 * very start of a string only (after normalization) — never mid-sentence, to keep false
 * positives near zero (a normal sentence starting with "Actually," is rare but not impossible;
 * scope this to StringStart + a small closed list, not a broad "self-referential" heuristic).
 */
export const LEAKED_PREAMBLE_PATTERN =
  /^\s*(Wait|Actually|Hold on|Correction|Scratch that|On second thought|Let me (?:reconsider|redo|fix|correct)|I need to (?:revise|correct))\s*[,:.\-]\s*/i;

// Named by code point via String.fromCharCode, never pasted as a literal invisible character —
// a pasted zero-width/BOM character is unreadable in a diff and encoding-fragile across
// editors/transports. Building the character from its numeric code point sidesteps that
// failure mode entirely.
const BOM = String.fromCharCode(0xfeff); // byte-order mark
const ZWSP = String.fromCharCode(0x200b); // zero-width space
const ZWNJ = String.fromCharCode(0x200c); // zero-width non-joiner
const ZWJ = String.fromCharCode(0x200d); // zero-width joiner
const NBSP = String.fromCharCode(0x00a0); // non-breaking space
const INVISIBLE_CHARS = [BOM, ZWSP, ZWNJ, ZWJ, NBSP].join('');
const EDGE_INVISIBLES = new RegExp(`^[${INVISIBLE_CHARS}\\s]+|[${INVISIBLE_CHARS}\\s]+$`, 'g');

/**
 * Strips invisible artifacts (BOM, zero-width space/joiners, NBSP) and surrounding whitespace
 * before any structural/pattern check — a model can return a byte-correct answer prefixed with
 * a stray BOM or ZWSP that `.trim()` alone does not remove.
 */
export function normalizeForIntegrityCheck(text: string): string {
  return text.replace(EDGE_INVISIBLES, '');
}

const PLAIN_TEXT_LEAK_SPAN =
  /^\s*(?:Wait|Actually|Hold on|Correction|Scratch that|On second thought|Let me [^.\n]+|I need to [^.\n]+)[,.:\-]?\s*(?:[^.\n]*[.:\n]\s*)?/i;

/**
 * Deterministic, idempotent heuristic: removes an entire leaked-preamble SPAN, not just the
 * opening word. Matching only the opener (e.g. "Wait, ") leaves a dangling remainder like
 * "corrected below. <p>...</p>" that still fails the structural check and defeats the whole
 * point of this fallback. Two modes:
 *
 * - `isMarkup: true` (input started with '<'): once the pattern matches at the start, trust the
 *   markup contract completely — discard everything up to and including the first '<' and keep
 *   the rest verbatim. Safe because real markup output can never legitimately start with
 *   anything other than '<', so there is no real-content case this could wrongly truncate.
 * - `isMarkup: false` (plain text): no reliable delimiter like '<' exists, so fall back to
 *   consuming the leaked clause up through its own sentence-ending punctuation or newline, which
 *   is the best available boundary without a second model call.
 */
export function stripLeakedPreamble(text: string, isMarkup = false): string {
  const normalized = normalizeForIntegrityCheck(text);
  if (!LEAKED_PREAMBLE_PATTERN.test(normalized)) return normalized;

  if (isMarkup) {
    const firstTagIndex = normalized.indexOf('<');
    return firstTagIndex !== -1 ? normalized.slice(firstTagIndex) : normalized;
  }

  return normalized.replace(PLAIN_TEXT_LEAK_SPAN, '');
}

/**
 * Recursively scans a parsed JSON value for string fields matching LEAKED_PREAMBLE_PATTERN.
 * Returns the dotted paths of every match (e.g. ["optimizedText"], ["en-GB.meta_description"]).
 * Used for JSON-shaped outputs where a leak hides inside a field without breaking JSON.parse.
 */
export function scanForLeakedPreamble(value: unknown, path = ''): string[] {
  if (typeof value === 'string') {
    return LEAKED_PREAMBLE_PATTERN.test(normalizeForIntegrityCheck(value)) ? [path || '(root)'] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => scanForLeakedPreamble(v, path ? `${path}[${i}]` : `[${i}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => scanForLeakedPreamble(v, path ? `${path}.${k}` : k));
  }
  return [];
}

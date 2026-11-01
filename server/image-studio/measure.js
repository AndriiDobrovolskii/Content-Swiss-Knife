/**
 * The Image Studio 18 MB measure (FR-39, FR-53; Specification "Size units", OD-27 C-27.1).
 *
 * The measure bounds the inline data the BFF would send to Gemini:
 *   - an inline image part counts as the length of its base64 TEXT (base64 is ASCII, so characters = bytes);
 *   - a `fileData` (file_uri) part counts as ONLY its own serialized part (a few hundred bytes), never the
 *     size of the file it names;
 *   - a text part counts as its UTF-8 byte length.
 * The JSON envelope and field names around the parts are not in the measure; they are the 1 MiB headroom H
 * of FR-53 (`HEADROOM_BYTES`). A thought part and a part carrying a `thoughtSignature` are measured like any
 * other part, because unmodified turns are resent as they are.
 *
 * Pure: no clock, no I/O, no mutation of its arguments.
 */

/** UTF-8 byte length of a string. */
function utf8Length(text) {
  return Buffer.byteLength(text, 'utf8');
}

/**
 * Bytes of one part.
 * @param {{ text?: string, inlineData?: { data?: string }, fileData?: object }} part
 * @returns {number}
 */
export function measurePart(part) {
  if (part === null || typeof part !== 'object') return 0;
  // A file reference weighs its own serialized part, not the referenced file (V-6: about 120 B).
  if (part.fileData !== undefined) return utf8Length(JSON.stringify(part));
  const hasText = typeof part.text === 'string';
  const hasInline = part.inlineData !== undefined && part.inlineData !== null;
  // A part of an unknown shape is still sent, so it weighs its own serialized form.
  if (!hasText && !hasInline) return utf8Length(JSON.stringify(part));
  let bytes = 0;
  if (hasText) bytes += utf8Length(part.text);
  if (hasInline && typeof part.inlineData.data === 'string') bytes += part.inlineData.data.length;
  return bytes;
}

/**
 * Bytes of one turn: the sum of its parts.
 * @param {{ parts?: object[] }} turn
 * @returns {number}
 */
export function measureTurn(turn) {
  let bytes = 0;
  for (const part of turn.parts ?? []) bytes += measurePart(part);
  return bytes;
}

/**
 * Bytes of the whole request the BFF would send: every history turn plus the new user turn.
 * @param {object[]} history
 * @param {object} newTurn
 * @returns {number}
 */
export function measureRequest(history, newTurn) {
  let bytes = measureTurn(newTurn);
  for (const turn of history) bytes += measureTurn(turn);
  return bytes;
}

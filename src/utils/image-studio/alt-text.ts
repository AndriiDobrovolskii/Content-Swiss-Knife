/**
 * The `alt` of a generated image (US-10.1 FR-75, SD-35, D-16, D-35): the prompt that produced it, cut by a
 * deterministic rule. The prompt is trimmed and its whitespace runs collapsed to one space BEFORE measuring; the
 * length is counted in Unicode code points (never UTF-16 units, so no lone surrogate is produced); at most 100 are
 * kept, whitespace left at the end of the cut is removed, and the three ASCII full stops `...` are appended only when
 * the prompt was actually cut.
 *
 * An empty prompt gives a marker for the studio text T-21 instead of a string, so the renderer resolves it in the
 * language current at render time (a prompt-derived alt is never localised, the fallback text is).
 */
export const MAX_ALT_CODE_POINTS = 100;

export type AltText = { kind: 'prompt'; text: string } | { kind: 'fallback'; textId: 'T-21' };

export function buildAlt(prompt: string): AltText {
  const normalised = (prompt ?? '').replace(/\s+/g, ' ').trim();
  if (normalised === '') return { kind: 'fallback', textId: 'T-21' };

  const points = Array.from(normalised);
  if (points.length <= MAX_ALT_CODE_POINTS) return { kind: 'prompt', text: normalised };

  const cut = points.slice(0, MAX_ALT_CODE_POINTS).join('').trimEnd();
  return { kind: 'prompt', text: `${cut}...` };
}

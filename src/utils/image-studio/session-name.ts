/**
 * The session's name (US-10.5 FR-2, FR-12): the one value behind the session-list row name and the archive name.
 *
 * Pure: no host clock, no DOM. The row (FR-2) and the archive name (FR-12) both read it from here so they cannot drift.
 */
import type { Version } from './ports';

/**
 * The prompt of the retained version with the highest number, runs of whitespace collapsed to single spaces and trimmed.
 * Not cut to the alt-text length. An empty string when the session has no version, or when that version's prompt is blank
 * (an images-only send), in which case the row shows no name and the archive stem falls back to its default.
 */
export function sessionName(meta: { versions: ReadonlyArray<Pick<Version, 'number' | 'prompt'>> }): string {
  let latest: Pick<Version, 'number' | 'prompt'> | undefined;
  for (const version of meta.versions) {
    if (latest === undefined || version.number > latest.number) latest = version;
  }
  return latest === undefined ? '' : latest.prompt.replace(/\s+/g, ' ').trim();
}

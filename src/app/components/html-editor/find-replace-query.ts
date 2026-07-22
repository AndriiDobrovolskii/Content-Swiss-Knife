/**
 * find-replace-query.ts
 *
 * Framework-free pieces of FindReplacePanelComponent's logic, kept out of the
 * component so they're testable under this project's vitest scope, which
 * intentionally excludes Angular components (see vitest.config.ts) and
 * targets deterministic utility functions instead.
 */

export interface FindReplaceQuery {
  search: string;
  replace: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  regexp: boolean;
}

/** Empty string is treated as "no query yet", not an error. */
export function isValidRegex(pattern: string): boolean {
  if (!pattern) return true;
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

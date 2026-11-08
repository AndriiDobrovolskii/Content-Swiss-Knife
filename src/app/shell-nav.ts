/**
 * Pure shell-navigation module (US-10.4, plan DD-2 and DD-6). Imports no Angular symbol, so the logic runner tests it directly.
 *
 * It holds the single source of nav-group membership (FR-1), the table that says which modes render the input panel (FR-9),
 * the visibility rule for rail items (FR-2) and the guarded read/write of the persisted rail state (FR-5).
 */
import type { AppMode, NavGroup, NavGroupId } from './types';

/** The three groups in display order; each lists its mode items in display order. The Dashboard is in none (FR-1). */
export const NAV_GROUPS: ReadonlyArray<NavGroup> = [
  {
    id: 'seo-text',
    modes: ['generator', 'ua-generator', 'optimizer', 'translator', 'seo-generator', 'copywriter', 'readability', 'slug-generator', 'faq-generator'],
  },
  { id: 'images', modes: ['image-tools', 'image-studio'] },
  { id: 'code', modes: ['html-editor'] },
];

/** The number shown in a group header: derived from the membership list, never written by hand (plan DD-2). */
export function navGroupCount(id: NavGroupId): number {
  return NAV_GROUPS.find((g) => g.id === id)?.modes.length ?? 0;
}

/** The group a mode belongs to; `undefined` for the Dashboard. */
export function groupOf(mode: AppMode): NavGroupId | undefined {
  return NAV_GROUPS.find((g) => g.modes.includes(mode))?.id;
}

/**
 * Which modes render the input panel (FR-9). A total `Record`, so a future `AppMode` without an entry is a compile error and
 * cannot silently default to rendering a panel.
 */
export const MODE_HAS_PANEL: Record<AppMode, boolean> = {
  generator: true,
  'ua-generator': true,
  optimizer: true,
  translator: true,
  'seo-generator': true,
  copywriter: true,
  readability: true,
  'slug-generator': true,
  'faq-generator': true,
  'image-tools': true,
  'image-studio': false,
  'html-editor': false,
  dashboard: false,
};

export function hasPanelFor(mode: AppMode): boolean {
  return MODE_HAS_PANEL[mode];
}

/**
 * Whether a mode item is rendered in the rail (FR-2): always in the icon-only rail (d); in the expanded rail when its group is
 * open, or when it is the active mode (a), which a collapsed group never removes.
 */
export function isNavItemShown(
  mode: AppMode,
  activeMode: AppMode,
  railExpanded: boolean,
  groupOpen: Record<NavGroupId, boolean>,
): boolean {
  if (!railExpanded) return true;
  if (mode === activeMode) return true;
  const group = groupOf(mode);
  return group === undefined ? true : groupOpen[group];
}

/** localStorage key of the rail state: `'true'` expanded, `'false'` collapsed (FR-5). */
export const RAIL_STORAGE_KEY = 'seo_gen_shell_rail_expanded';

type RailStorage = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * Reads the stored rail state. Exactly `'true'` / `'false'` are accepted; an absent key, any other value, a throwing `getItem`
 * or a throwing storage accessor all mean expanded and never raise (FR-4, FR-5 ii). No `JSON.parse`.
 */
export function readRailExpanded(getStorage: () => RailStorage): boolean {
  try {
    return getStorage().getItem(RAIL_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

/** Persists the rail state; a failing storage (blocked or full) is swallowed so the click handler never throws (FR-5 iii). */
export function writeRailExpanded(getStorage: () => RailStorage, expanded: boolean): void {
  try {
    getStorage().setItem(RAIL_STORAGE_KEY, String(expanded));
  } catch {
    // Storage unavailable or full: the in-memory state still changes for the session.
  }
}

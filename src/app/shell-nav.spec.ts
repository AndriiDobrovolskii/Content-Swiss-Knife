/**
 * shell-nav.spec.ts - US-10.4 TEST_WRITING: the pure shell module `src/app/shell-nav.ts` (plan DD-2, DD-6; task T3).
 *
 * LOGIC runner (`npm run test:logic`); deliberately not a `*.component.spec.ts`: the module is Angular-free.
 *
 * RED BY ABSENT MODULE, BY DESIGN. `./shell-nav` is created by T3, so until then every test here fails with vitest's
 * "Failed to load url ./shell-nav": there is no way to make a test of a module that must be created fail "for a behavioural
 * reason" before the module exists.
 *
 * WHY THE MODULE IS LOADED WITH A DYNAMIC, NON-LITERAL `import()` AND NOT A STATIC `import ... from './shell-nav'`: the Angular
 * component runner (`ng test`) type-checks EVERY file under `src/` in one program. A static import of a module that does not
 * exist is a TS2307 error in this file, and that error fails the build of the component runner, turning every pre-existing
 * component spec red for a reason that has nothing to do with them (AGENTS.md section 5; task breakdown note (i)). The contract
 * is instead declared below as a local interface, so this file stays type-checked against the pinned contract and the real
 * module is exercised at run time. (`tab-descriptors.spec.ts` accepted a red component runner for US-8.1; here it is avoided.)
 *
 * CONTRACT PINNED HERE (the plan names the members and leaves their exact shape open; the choices are stated so the builder
 * and the reviewers can see them, and a different shape is a `changes_required_tests` conversation, not a silent edit):
 *   - `NAV_GROUPS`: an array of three `{ id: NavGroupId, modes: AppMode[] }`, in the order SEO & Text, Images, Code;
 *   - `navGroupCount(id)` = that group's `modes.length`; `groupOf(mode)` = its `NavGroupId`, `undefined` for `dashboard`;
 *   - `MODE_HAS_PANEL`: a total `Record<AppMode, boolean>`; `hasPanelFor(mode)` reads it;
 *   - `isNavItemShown(mode, activeMode, railExpanded, groupOpen)` where `groupOpen` is the per-group open state,
 *     `Record<NavGroupId, boolean>` (plan: "shown if the rail is icon-only, or its group is open, or it is the active mode");
 *   - `readRailExpanded(getStorage)` / `writeRailExpanded(getStorage, expanded)` where `getStorage` is
 *     `() => Pick<Storage, 'getItem' | 'setItem'>` (plan DD-6), key `seo_gen_shell_rail_expanded`, values `'true'` / `'false'`.
 *
 * Every expectation below is written from the Specification (FR-1, FR-2, FR-5, FR-9), not from an implementation.
 */
import { describe, it, expect } from 'vitest';
import type { AppMode } from './types';

type NavGroupId = 'seo-text' | 'images' | 'code';
type RailStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** The contract of `./shell-nav` as pinned by this spec (see the header). */
interface ShellNav {
  NAV_GROUPS: ReadonlyArray<{ id: NavGroupId; modes: AppMode[] }>;
  navGroupCount(id: NavGroupId): number;
  groupOf(mode: AppMode): NavGroupId | undefined;
  MODE_HAS_PANEL: Record<AppMode, boolean>;
  hasPanelFor(mode: AppMode): boolean;
  isNavItemShown(mode: AppMode, activeMode: AppMode, railExpanded: boolean, groupOpen: Record<NavGroupId, boolean>): boolean;
  readRailExpanded(getStorage: () => RailStorage): boolean;
  writeRailExpanded(getStorage: () => RailStorage, expanded: boolean): void;
}
const SHELL_NAV_PATH = './shell-nav';
/** Loaded per test so a missing module fails each test with its own message, not the whole file at collection time. */
const shellNav = async (): Promise<ShellNav> => (await import(/* @vite-ignore */ SHELL_NAV_PATH)) as ShellNav;

const RAIL_KEY = 'seo_gen_shell_rail_expanded';

/** FR-1: the groups and their mode order, hand-written from the Specification. */
const EXPECTED: ReadonlyArray<{ id: NavGroupId; modes: AppMode[] }> = [
  { id: 'seo-text', modes: ['generator', 'ua-generator', 'optimizer', 'translator', 'seo-generator', 'copywriter', 'readability', 'slug-generator', 'faq-generator'] },
  { id: 'images', modes: ['image-tools', 'image-studio'] },
  { id: 'code', modes: ['html-editor'] },
];
const CONTENT_MODES: AppMode[] = EXPECTED.flatMap((g) => g.modes);
/** The 13 AppMode values: the 12 content modes plus the Dashboard. */
const ALL_MODES: AppMode[] = [...CONTENT_MODES, 'dashboard'];
const MODE_CASES = EXPECTED.flatMap((g) => g.modes.map((m) => ({ id: g.id, mode: m })));

describe('FR-1: NAV_GROUPS holds the 12 content modes in three groups, in the stated order', () => {
  it('has exactly three groups: SEO & Text, Images, Code, in that order', async () => {
    const { NAV_GROUPS } = await shellNav();
    expect(NAV_GROUPS.map((g) => g.id)).toEqual(['seo-text', 'images', 'code']);
  });

  it.each(EXPECTED)('group $id lists its modes in the order of the Specification', async ({ id, modes }) => {
    const { NAV_GROUPS } = await shellNav();
    expect(NAV_GROUPS.find((g) => g.id === id)?.modes).toEqual(modes);
  });

  it('every content mode is in exactly one group, and the Dashboard is in none', async () => {
    const { NAV_GROUPS } = await shellNav();
    const flat = NAV_GROUPS.flatMap((g) => g.modes);
    expect(flat).toHaveLength(12);
    expect(new Set(flat).size).toBe(12);
    expect([...flat].sort()).toEqual([...CONTENT_MODES].sort());
    expect(flat).not.toContain('dashboard');
  });

  it('navGroupCount is the number shown in each header: 9, 2 and 1', async () => {
    const { navGroupCount } = await shellNav();
    expect(navGroupCount('seo-text')).toBe(9);
    expect(navGroupCount('images')).toBe(2);
    expect(navGroupCount('code')).toBe(1);
  });

  it('the count always equals the number of modes in the group (derived, not a second copy)', async () => {
    const { NAV_GROUPS, navGroupCount } = await shellNav();
    for (const g of NAV_GROUPS) expect(navGroupCount(g.id), g.id).toBe(g.modes.length);
  });

  it.each(MODE_CASES)('groupOf($mode) is $id', async ({ id, mode }) => {
    const { groupOf } = await shellNav();
    expect(groupOf(mode)).toBe(id);
  });

  it('groupOf("dashboard") is undefined: the Dashboard belongs to no group', async () => {
    const { groupOf } = await shellNav();
    expect(groupOf('dashboard')).toBeUndefined();
  });
});

describe('FR-9: which modes render the input panel', () => {
  const WITH_PANEL: AppMode[] = ['generator', 'ua-generator', 'optimizer', 'translator', 'seo-generator', 'copywriter', 'readability', 'slug-generator', 'faq-generator', 'image-tools'];
  const WITHOUT_PANEL: AppMode[] = ['image-studio', 'html-editor', 'dashboard'];

  it('MODE_HAS_PANEL decides every one of the 13 modes (a total table: no mode silently defaults)', async () => {
    const { MODE_HAS_PANEL } = await shellNav();
    expect(Object.keys(MODE_HAS_PANEL).sort()).toEqual([...ALL_MODES].sort());
  });

  it.each(WITH_PANEL)('%s renders the panel', async (mode) => {
    const { MODE_HAS_PANEL, hasPanelFor } = await shellNav();
    expect(MODE_HAS_PANEL[mode]).toBe(true);
    expect(hasPanelFor(mode)).toBe(true);
  });

  it.each(WITHOUT_PANEL)('%s renders no panel', async (mode) => {
    const { MODE_HAS_PANEL, hasPanelFor } = await shellNav();
    expect(MODE_HAS_PANEL[mode]).toBe(false);
    expect(hasPanelFor(mode)).toBe(false);
  });
});

describe('FR-2: isNavItemShown - which items a collapsed group still shows', () => {
  const allOpen = (): Record<NavGroupId, boolean> => ({ 'seo-text': true, images: true, code: true });
  const withClosed = (id: NavGroupId): Record<NavGroupId, boolean> => ({ ...allOpen(), [id]: false });

  it.each(MODE_CASES)('expanded rail, group open: $mode is shown when it is not the active mode', async ({ mode }) => {
    const { isNavItemShown } = await shellNav();
    const active: AppMode = mode === 'generator' ? 'translator' : 'generator';
    expect(isNavItemShown(mode, active, true, allOpen())).toBe(true);
  });

  it.each(MODE_CASES)('expanded rail, group closed, not the active mode: $mode is hidden (FR-2 a, b)', async ({ id, mode }) => {
    const { isNavItemShown } = await shellNav();
    // The Dashboard is never in a group, so making it the active mode can never be what keeps an item visible.
    expect(isNavItemShown(mode, 'dashboard', true, withClosed(id))).toBe(false);
  });

  it.each(MODE_CASES)('expanded rail, group closed, the active mode: $mode stays shown (FR-2 a)', async ({ id, mode }) => {
    const { isNavItemShown } = await shellNav();
    expect(isNavItemShown(mode, mode, true, withClosed(id))).toBe(true);
  });

  it.each(MODE_CASES)('icon-only rail: $mode is shown whatever its group state (FR-2 d)', async ({ id, mode }) => {
    const { isNavItemShown } = await shellNav();
    expect(isNavItemShown(mode, 'dashboard', false, withClosed(id))).toBe(true);
    expect(isNavItemShown(mode, 'dashboard', false, allOpen())).toBe(true);
  });

  it('collapsing one group hides nothing in the other groups', async () => {
    const { isNavItemShown } = await shellNav();
    const closed = withClosed('seo-text');
    for (const g of EXPECTED.filter((x) => x.id !== 'seo-text')) {
      for (const m of g.modes) expect(isNavItemShown(m, 'generator', true, closed), m).toBe(true);
    }
  });

  it('with SEO & Text collapsed and Translator active, only Translator is left of that group', async () => {
    const { isNavItemShown } = await shellNav();
    const closed = withClosed('seo-text');
    const shown = EXPECTED[0].modes.filter((m) => isNavItemShown(m, 'translator', true, closed));
    expect(shown).toEqual(['translator']);
  });
});

/** A controlled storage double: records every key asked for and every write; can be told to throw. */
function makeStorage(initial: Record<string, string> = {}, opts: { getThrows?: boolean; setThrows?: boolean } = {}) {
  const data = new Map<string, string>(Object.entries(initial));
  const reads: string[] = [];
  const writes: Array<[string, string]> = [];
  const storage: RailStorage = {
    getItem(key: string): string | null {
      reads.push(key);
      if (opts.getThrows) throw new Error('getItem blocked (test double)');
      return data.has(key) ? (data.get(key) as string) : null;
    },
    setItem(key: string, value: string): void {
      writes.push([key, value]);
      if (opts.setThrows) throw new Error('setItem quota exceeded (test double)');
      data.set(key, value);
    },
  };
  return { storage, reads, writes, data };
}

describe('FR-5: reading the stored rail state', () => {
  it('reads exactly the key seo_gen_shell_rail_expanded', async () => {
    const { readRailExpanded } = await shellNav();
    const s = makeStorage({ [RAIL_KEY]: 'false' });
    readRailExpanded(() => s.storage);
    expect(s.reads).toEqual([RAIL_KEY]);
  });

  it('the string "true" means expanded', async () => {
    const { readRailExpanded } = await shellNav();
    expect(readRailExpanded(() => makeStorage({ [RAIL_KEY]: 'true' }).storage)).toBe(true);
  });

  it('the string "false" means collapsed', async () => {
    const { readRailExpanded } = await shellNav();
    expect(readRailExpanded(() => makeStorage({ [RAIL_KEY]: 'false' }).storage)).toBe(false);
  });

  it('an absent key means expanded (FR-4: expanded when no preference exists)', async () => {
    const { readRailExpanded } = await shellNav();
    expect(readRailExpanded(() => makeStorage().storage)).toBe(true);
  });

  it.each(['yes', 'no', '1', '0', '', 'TRUE', 'False', ' true', 'false ', 'null', 'undefined', '{"expanded":false}', '[false]', '"false"'])(
    'any other stored value (%j) means expanded, with no error (FR-5 ii)',
    async (junk) => {
      const { readRailExpanded } = await shellNav();
      expect(readRailExpanded(() => makeStorage({ [RAIL_KEY]: junk }).storage)).toBe(true);
    },
  );

  it('a getItem that throws means expanded, and the error does not escape (FR-5 ii)', async () => {
    const { readRailExpanded } = await shellNav();
    const s = makeStorage({ [RAIL_KEY]: 'false' }, { getThrows: true });
    expect(() => readRailExpanded(() => s.storage)).not.toThrow();
    expect(readRailExpanded(() => s.storage)).toBe(true);
    expect(s.reads.length, 'the read was really attempted').toBeGreaterThanOrEqual(1);
  });

  it('obtaining the storage itself can throw (blocked storage): the answer is still expanded', async () => {
    const { readRailExpanded } = await shellNav();
    const blocked = (): RailStorage => { throw new Error('SecurityError (test double)'); };
    expect(() => readRailExpanded(blocked)).not.toThrow();
    expect(readRailExpanded(blocked)).toBe(true);
  });

  it('reading never writes', async () => {
    const { readRailExpanded } = await shellNav();
    const s = makeStorage({ [RAIL_KEY]: 'false' });
    readRailExpanded(() => s.storage);
    expect(s.writes).toEqual([]);
  });
});

describe('FR-5: writing the rail state', () => {
  it('writes the string "true" under the key when expanded', async () => {
    const { writeRailExpanded } = await shellNav();
    const s = makeStorage();
    writeRailExpanded(() => s.storage, true);
    expect(s.writes).toEqual([[RAIL_KEY, 'true']]);
  });

  it('writes the string "false" under the key when collapsed', async () => {
    const { writeRailExpanded } = await shellNav();
    const s = makeStorage();
    writeRailExpanded(() => s.storage, false);
    expect(s.writes).toEqual([[RAIL_KEY, 'false']]);
  });

  it('what was written is what a later read restores (round trip, both values)', async () => {
    const { readRailExpanded, writeRailExpanded } = await shellNav();
    const s = makeStorage();
    writeRailExpanded(() => s.storage, false);
    expect(readRailExpanded(() => s.storage)).toBe(false);
    writeRailExpanded(() => s.storage, true);
    expect(readRailExpanded(() => s.storage)).toBe(true);
  });

  it('a setItem that throws (storage full or unavailable) does not propagate (FR-5 iii)', async () => {
    const { writeRailExpanded } = await shellNav();
    const s = makeStorage({}, { setThrows: true });
    expect(() => writeRailExpanded(() => s.storage, false)).not.toThrow();
    expect(s.writes, 'the write was really attempted').toEqual([[RAIL_KEY, 'false']]);
  });

  it('obtaining the storage can throw on write too: no exception propagates', async () => {
    const { writeRailExpanded } = await shellNav();
    const blocked = (): RailStorage => { throw new Error('SecurityError (test double)'); };
    expect(() => writeRailExpanded(blocked, true)).not.toThrow();
  });
});

/**
 * US-10.4 TEST_WRITING - the app shell in the real AppComponent: grouped, collapsible navigation rail, panel gating,
 * bottom controls, persistence, accessible names (AC-1, AC-2, AC-3, AC-4, AC-4a..AC-4e, AC-7; FR-1..FR-12, FR-17).
 *
 * Component runner (`npm run test:components`): this file is named `*.component.spec.ts`. It renders the real
 * `AppComponent` (precedent: `app.component.clear-all.component.spec.ts`) with the real root services; only the Image
 * Studio's ports are the fakes of `test/image-studio/helpers/fakes.ts`, because entering studio mode is part of
 * "all 13 modes are reachable".
 *
 * Written from the approved Specification (v2) and the Story's acceptance criteria, not from an implementation:
 *   - queries are by role and accessible name (the way a user or a screen reader finds a control), never by CSS class;
 *     the only class assertions are the two the Specification itself names, `w-64` / `w-16` (FR-4);
 *   - the rail is found as the page's single `navigation` landmark (plan DD-3: a `<nav>`, never an `<aside>`), and the
 *     input panel is found as `<aside>` exactly like the retained clear-all spec does (FR-18: "locate the panel, not
 *     the rail");
 *   - this file imports NOTHING a task of this Story creates (no `shell-nav`), so it compiles today and the whole
 *     component runner keeps building (`ng test` compiles every spec together); it reaches behaviour through the DOM.
 *     The only `AppComponent` members touched by name (`appMode`, `content`, `htmlEditorRef`, `feedbackPopupBlocked`,
 *     `productName`) are existing members, read through `any` like the clear-all spec does;
 *   - Tailwind (the CDN) is not loaded by this runner, so nothing here claims CSS-only behaviour (icon-only label hiding,
 *     colours, contrast, widths in pixels, the History overlay's pixel adjacency): those are the manual evidence
 *     (FR-19), see docs/tests/US-10.4-test-strategy.md. Hidden items are asserted through the accessibility tree
 *     (`queryByRole` does not return `hidden` / `aria-hidden` / `display:none` elements), which is what FR-2 (b) asks.
 *
 * Every absence assertion in a panel-less mode also asserts the panel itself is absent, so it cannot pass vacuously.
 * No wall clock, no sleep: `settle()` is the same promise flush as `test/image-studio/helpers/studio-render.ts`.
 * Storage failures are injected with `vi.stubGlobal('localStorage', ...)` and throw ONLY for the rail key, because the
 * AppComponent constructor reads/writes three other `seo_gen_*` keys unguarded.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TestBed, DeferBlockBehavior } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AppComponent } from './app.component';
import { ContentOrchestratorService } from '../services/content-orchestrator.service';
import { environment } from '../environments/environment';
import {
  makeFakeClock, makeFakeScheduler, makeIdSource, makeAlertPort, makeConfirmPort, makeClipboardPort, makeSavePort,
  makeFakeCodec, makeInMemorySessionStore,
} from '../../test/image-studio/helpers/fakes';
import {
  CLOCK_PORT, SCHEDULER_PORT, ID_SOURCE_PORT, SESSION_STORE_PORT, IMAGE_CODEC_PORT, ALERT_PORT, CONFIRM_PORT,
  CLIPBOARD_PORT, SAVE_PORT,
} from '../services/image-studio/image-studio.tokens';
import { ImageStudioStore } from '../services/image-studio/image-studio.store';
import { t as studioT } from '../../test/image-studio/helpers/studio-render';

type Lang = 'en' | 'uk';

// ── Pinned contract data (Specification FR-1, FR-6, FR-5) ────────────────────────────────────────────────────────────
const RAIL_KEY = 'seo_gen_shell_rail_expanded';
const DOT = '·';
/** A group header's visible text ends in " · N" (middle dot, U+00B7); no mode item and no bottom control does. */
const GROUP_HEADER_TEXT = /\s·\s\d+\s*$/;

/** FR-1: the 12 content modes in group order. */
const SEO_TEXT = ['generator', 'ua-generator', 'optimizer', 'translator', 'seo-generator', 'copywriter', 'readability', 'slug-generator', 'faq-generator'] as const;
const IMAGES = ['image-tools', 'image-studio'] as const;
const CODE = ['html-editor'] as const;
const CONTENT_MODES = [...SEO_TEXT, ...IMAGES, ...CODE] as const;
const ALL_MODES = [...CONTENT_MODES, 'dashboard'] as const;
type Mode = (typeof ALL_MODES)[number];

/** FR-9: the panel is rendered in the nine text modes and Image Tools only. */
const PANEL_MODES: readonly Mode[] = [...SEO_TEXT, 'image-tools'];
const PANEL_LESS_MODES: readonly Mode[] = ['image-studio', 'html-editor', 'dashboard'];

const GROUPS = [
  { id: 'seo-text', modes: SEO_TEXT as readonly Mode[], header: { en: `SEO & Text ${DOT} 9`, uk: `SEO та Текст ${DOT} 9` } },
  { id: 'images', modes: IMAGES as readonly Mode[], header: { en: `Images ${DOT} 2`, uk: `Зображення ${DOT} 2` } },
  { id: 'code', modes: CODE as readonly Mode[], header: { en: `Code ${DOT} 1`, uk: `Код ${DOT} 1` } },
] as const;

/** FR-1: "no mode item is renamed" - the existing TRANSLATIONS mode labels of each interface language. */
const LABEL: Record<Lang, Record<Exclude<Mode, 'dashboard'>, string>> = {
  en: {
    'generator': 'Generator', 'ua-generator': 'UA Description', 'optimizer': 'Optimizer', 'translator': 'Translator',
    'seo-generator': 'SEO Meta', 'copywriter': 'Copywriter', 'readability': 'Readability', 'slug-generator': 'Slugs',
    'faq-generator': 'FAQ Generator', 'image-tools': 'Image Tools', 'image-studio': 'Image Studio', 'html-editor': 'HTML Editor',
  },
  uk: {
    'generator': 'Генератор', 'ua-generator': 'UA Опис', 'optimizer': 'Оптимізатор', 'translator': 'Перекладач',
    'seo-generator': 'SEO Мета', 'copywriter': 'Копірайтер', 'readability': 'Читабельність', 'slug-generator': 'Слаги',
    'faq-generator': 'FAQ Generator', 'image-tools': 'Інструменти зображень', 'image-studio': 'Студія зображень', 'html-editor': 'HTML-редактор',
  },
};

/** FR-6 copy table. The Language name is "<visible code>, <translated name>" (WCAG 2.5.3). */
const NAME = {
  en: { collapse: 'Collapse navigation', expand: 'Expand navigation', dashboard: 'Cost Dashboard', language: 'EN, Switch Language', theme: 'Toggle Dark Mode', ai: 'AI Model Settings' },
  uk: { collapse: 'Згорнути навігацію', expand: 'Розгорнути навігацію', dashboard: 'Дашборд витрат', language: 'UA, Змінити мову', theme: 'Перемкнути темну тему', ai: 'Налаштування моделі ШІ' },
} as const;
const CODE_OF = { en: 'EN', uk: 'UA' } as const;

const modeName = (mode: Mode, lang: Lang): string => (mode === 'dashboard' ? NAME[lang].dashboard : LABEL[lang][mode]);

// ── Harness ──────────────────────────────────────────────────────────────────────────────────────────────────────────
interface ShellOpts {
  lang?: Lang;
  /** Raw value pre-seeded under the rail key before the app starts. */
  rail?: string;
  /** Inject a storage failure for the rail key only. */
  failRailStorage?: 'read' | 'write' | 'both';
  /** Do not clear storage first (a second render in the same test that must see the first one's writes). */
  keepStorage?: boolean;
}

/** A localStorage double that throws ONLY for the rail key; every other key passes through to the real storage. */
function stubRailStorage(mode: 'read' | 'write' | 'both') {
  const real = window.localStorage;
  const calls = { reads: 0, writes: [] as string[] };
  const double = {
    getItem: (k: string) => {
      if (k === RAIL_KEY) { calls.reads += 1; if (mode !== 'write') throw new Error('storage blocked (test double)'); }
      return real.getItem(k);
    },
    setItem: (k: string, v: string) => {
      if (k === RAIL_KEY) { calls.writes.push(v); if (mode !== 'read') throw new Error('quota exceeded (test double)'); }
      real.setItem(k, v);
    },
    removeItem: (k: string) => real.removeItem(k),
    clear: () => real.clear(),
    key: (i: number) => real.key(i),
    get length() { return real.length; },
  };
  vi.stubGlobal('localStorage', double);
  return calls;
}

async function renderShell(opts: ShellOpts = {}) {
  if (!opts.keepStorage) localStorage.clear();
  document.documentElement.classList.remove('dark');
  if (opts.lang === 'uk') localStorage.setItem('seo_gen_ui_lang', 'uk');
  if (opts.rail !== undefined) localStorage.setItem(RAIL_KEY, opts.rail);
  const storageCalls = opts.failRailStorage ? stubRailStorage(opts.failRailStorage) : null;
  const lang = opts.lang ?? 'en';

  const clock = makeFakeClock();
  const view = await render(AppComponent, {
    deferBlockBehavior: DeferBlockBehavior.Playthrough,
    providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: CLOCK_PORT, useValue: clock },
      { provide: SCHEDULER_PORT, useValue: makeFakeScheduler(clock) },
      { provide: ID_SOURCE_PORT, useValue: makeIdSource('t') },
      { provide: SESSION_STORE_PORT, useValue: makeInMemorySessionStore() },
      { provide: IMAGE_CODEC_PORT, useValue: makeFakeCodec() },
      { provide: ALERT_PORT, useValue: makeAlertPort() },
      { provide: CONFIRM_PORT, useValue: makeConfirmPort(true) },
      { provide: CLIPBOARD_PORT, useValue: makeClipboardPort() },
      { provide: SAVE_PORT, useValue: makeSavePort() },
    ],
  });
  const store = TestBed.inject(ImageStudioStore);
  store.setLanguage(lang);
  await store.init();
  view.detectChanges();
  await view.fixture.whenStable();
  view.detectChanges();

  const user = userEvent.setup();
  // A flush, not a sleep: whenStable() plus a zero-delay macrotask yield drains the promise-only work.
  const settle = async () => {
    for (let round = 0; round < 2; round++) {
      await view.fixture.whenStable();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      view.detectChanges();
    }
  };
  const cmp = view.fixture.componentInstance as any;
  return { view, user, settle, cmp, storageCalls };
}
type Shell = Awaited<ReturnType<typeof renderShell>>;

const rail = () => screen.getByRole('navigation');
const inRail = () => within(rail());
const railBtn = (name: string) => inRail().getByRole('button', { name });
const queryRailBtn = (name: string) => inRail().queryByRole('button', { name });
const panelOf = (h: Shell) => h.view.container.querySelector('aside') as HTMLElement | null;
const mainOf = (h: Shell) => h.view.container.querySelector('main') as HTMLElement;
const currentItems = (h: Shell) => Array.from(h.view.container.querySelectorAll('[aria-current="page"]')) as HTMLElement[];
const follows = (a: Element, b: Element) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

/** Click the rail item of `mode` and wait until the mode's main-area view has mounted. */
async function select(h: Shell, mode: Mode, lang: Lang = 'en') {
  await h.user.click(railBtn(modeName(mode, lang)));
  await h.settle();
  if (mode === 'image-studio') await screen.findByRole('textbox', { name: studioT('X-12', lang) });
  if (mode === 'html-editor') await vi.waitFor(() => expect(h.view.container.querySelector('app-html-editor')).not.toBeNull());
  await h.settle();
}

/** FR-6: the names of the mode, header and bottom buttons the rail must hold in a given state (the collapse control is tested separately). */
function expectedRailNames(lang: Lang, expanded: boolean): string[] {
  const n = NAME[lang];
  return [
    ...(expanded ? GROUPS.map((g) => g.header[lang]) : []),
    ...CONTENT_MODES.map((m) => LABEL[lang][m]),
    n.dashboard, n.language, n.theme, n.ai,
  ];
}

/**
 * AC-3 / FR-6: every rail button has one of the expected names, and no two buttons share a name. The collapse/expand control is
 * counted when present but not required here (it has its own tests in AC-3 / FR-4), so this check does not depend on it.
 */
function expectEveryRailButtonNamedAndUnique(lang: Lang, expanded: boolean) {
  const names = expectedRailNames(lang, expanded);
  const found = names.map((nm) => railBtn(nm)); // getByRole throws if a name is missing OR matches two buttons
  expect(new Set(found).size, 'two expected names resolved to the same element').toBe(names.length);
  const collapseControl = [...inRail().queryAllByRole('button', { name: NAME[lang].collapse }), ...inRail().queryAllByRole('button', { name: NAME[lang].expand })];
  expect(collapseControl.length, 'at most one collapse/expand control').toBeLessThanOrEqual(1);
  expect(inRail().getAllByRole('button').length, 'the rail holds a button that is not one of the expected names').toBe(names.length + collapseControl.length);
}

const storedRail = () => localStorage.getItem(RAIL_KEY);
const originalBaseUrl = environment.feedbackForm.baseUrl;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.documentElement.classList.remove('dark');
  environment.feedbackForm.baseUrl = originalBaseUrl;
  localStorage.clear();
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// AC-1 - grouped navigation (FR-1, FR-2)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe.each(['en', 'uk'] as const)('AC-1 / FR-1: grouped navigation content in %s', (lang) => {
  it('shows exactly the three group headers with their counts', async () => {
    await renderShell({ lang });
    for (const g of GROUPS) expect(railBtn(g.header[lang]), g.header[lang]).toBeDefined();
    // A group header is the rail button whose visible text ends in " · N"; the collapse control is not one of them.
    const headers = inRail().getAllByRole('button').filter((b) => GROUP_HEADER_TEXT.test(b.textContent ?? ''));
    expect(headers).toHaveLength(3);
    for (const b of headers) expect(b.hasAttribute('aria-expanded'), `${b.textContent?.trim()} exposes aria-expanded`).toBe(true);
  });

  it('lists the 12 modes in the stated group order, each group followed by its own items', async () => {
    await renderShell({ lang });
    const headers = GROUPS.map((g) => railBtn(g.header[lang]));
    const items = GROUPS.map((g) => g.modes.map((m) => railBtn(modeName(m, lang))));
    const sequence = [headers[0], ...items[0], headers[1], ...items[1], headers[2], ...items[2]];
    for (let i = 1; i < sequence.length; i++) {
      expect(follows(sequence[i - 1], sequence[i]), `item ${i} must follow item ${i - 1} in the DOM`).toBe(true);
    }
  });

  it('the number shown in each header equals the number of mode items rendered under it', async () => {
    await renderShell({ lang });
    const headers = GROUPS.map((g) => railBtn(g.header[lang]));
    const allItems = CONTENT_MODES.map((m) => railBtn(modeName(m, lang)));
    GROUPS.forEach((g, i) => {
      const shown = Number(/(\d+)\s*$/.exec(headers[i].textContent ?? '')?.[1]);
      const under = allItems.filter((b) => follows(headers[i], b) && (i + 1 < headers.length ? follows(b, headers[i + 1]) : true));
      expect(under, `items under ${g.header[lang]}`).toHaveLength(shown);
      expect(under.map((b) => b.textContent?.trim())).toEqual(g.modes.map((m) => modeName(m, lang)));
    });
  });

  it('on first load, with no stored state, all three groups are expanded and all 12 items are rendered', async () => {
    await renderShell({ lang });
    for (const g of GROUPS) expect(railBtn(g.header[lang]).getAttribute('aria-expanded'), g.header[lang]).toBe('true');
    for (const m of CONTENT_MODES) expect(railBtn(modeName(m, lang)), m).toBeDefined();
  });
});

describe('AC-1 / FR-2: groups expand and collapse', () => {
  it('a group header toggles aria-expanded and removes the group\'s items from the accessibility tree, keeping the active item', async () => {
    const h = await renderShell();
    // generator is active and lives in SEO & Text.
    const header = railBtn(GROUPS[0].header.en);
    await h.user.click(header);
    await h.settle();
    expect(railBtn(GROUPS[0].header.en).getAttribute('aria-expanded')).toBe('false');
    expect(railBtn('Generator'), 'the active item stays rendered, visible and focusable (FR-2 a)').toBeDefined();
    for (const m of SEO_TEXT.slice(1)) expect(queryRailBtn(LABEL.en[m]), `${m} must be hidden`).toBeNull();
    // the other two groups are untouched
    for (const m of [...IMAGES, ...CODE]) expect(queryRailBtn(LABEL.en[m]), m).not.toBeNull();

    await h.user.click(railBtn(GROUPS[0].header.en));
    await h.settle();
    expect(railBtn(GROUPS[0].header.en).getAttribute('aria-expanded')).toBe('true');
    for (const m of SEO_TEXT) expect(queryRailBtn(LABEL.en[m]), `${m} must be back`).not.toBeNull();
  });

  it('collapsing a group that does not hold the active mode hides all of its items', async () => {
    const h = await renderShell();
    await h.user.click(railBtn(GROUPS[1].header.en)); // Images
    await h.settle();
    expect(queryRailBtn('Image Tools')).toBeNull();
    expect(queryRailBtn('Image Studio')).toBeNull();
    expect(railBtn(GROUPS[1].header.en).getAttribute('aria-expanded')).toBe('false');
  });

  it('toggling a group never changes the active mode', async () => {
    const h = await renderShell();
    await select(h, 'translator');
    await h.user.click(railBtn(GROUPS[0].header.en));
    await h.user.click(railBtn(GROUPS[2].header.en));
    await h.settle();
    expect(h.cmp.appMode()).toBe('translator');
    expect(queryRailBtn('Translator'), 'the active item survives its group collapsing').not.toBeNull();
  });

  it('the per-group state is not persisted: a reload starts with every group expanded (OD-24)', async () => {
    const h = await renderShell();
    const keysBefore = Object.keys(localStorage).sort();
    await h.user.click(railBtn(GROUPS[1].header.en));
    await h.user.click(railBtn(GROUPS[2].header.en));
    await h.settle();
    expect(Object.keys(localStorage).sort(), 'toggling a group must not write any storage key').toEqual(keysBefore);
    TestBed.resetTestingModule();
    await renderShell({ keepStorage: true });
    for (const g of GROUPS) expect(railBtn(g.header.en).getAttribute('aria-expanded'), g.header.en).toBe('true');
    expect(queryRailBtn('Image Studio')).not.toBeNull();
  });

  it('a group header\'s accessible name is its visible text (name and count)', async () => {
    await renderShell();
    for (const g of GROUPS) {
      const b = railBtn(g.header.en);
      expect((b.textContent ?? '').replace(/\s+/g, ' ').trim()).toBe(g.header.en);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// AC-2 - exactly one aria-current="page" (FR-3)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('AC-2 / FR-3: exactly one item carries aria-current="page"', () => {
  it('for each of the 13 modes the active mode\'s navigation item is the only [aria-current="page"] in the shell', async () => {
    const h = await renderShell();
    for (const mode of ALL_MODES) {
      await select(h, mode);
      const current = currentItems(h);
      expect(current, `${mode}: number of [aria-current="page"]`).toHaveLength(1);
      expect(current[0], `${mode}: which control carries it`).toBe(railBtn(modeName(mode, 'en')));
    }
  });

  it('Dashboard behaves like a mode: it carries aria-current when active, and then no mode item does', async () => {
    const h = await renderShell();
    await select(h, 'dashboard');
    expect(railBtn(NAME.en.dashboard).getAttribute('aria-current')).toBe('page');
    for (const m of CONTENT_MODES) expect(railBtn(LABEL.en[m]).hasAttribute('aria-current'), m).toBe(false);
  });

  it('it holds with the active mode\'s group collapsed (FR-2 a): the kept active item is the one that carries it', async () => {
    const h = await renderShell();
    for (const g of GROUPS) {
      for (const mode of g.modes) {
        await select(h, mode);
        await h.user.click(railBtn(g.header.en));
        await h.settle();
        const current = currentItems(h);
        expect(current, `${mode} with ${g.id} collapsed`).toHaveLength(1);
        expect(current[0]).toBe(railBtn(LABEL.en[mode as Exclude<Mode, 'dashboard'>]));
        await h.user.click(railBtn(g.header.en)); // expand again for the next mode
        await h.settle();
      }
    }
  });

  it('it holds in the icon-only rail for all 13 modes', async () => {
    const h = await renderShell();
    await h.user.click(railBtn(NAME.en.collapse));
    await h.settle();
    for (const mode of ALL_MODES) {
      await select(h, mode);
      const current = currentItems(h);
      expect(current, `${mode} (icon-only)`).toHaveLength(1);
      expect(current[0], `${mode} (icon-only)`).toBe(railBtn(modeName(mode, 'en')));
    }
  });

  it('Language, Theme and AI Settings never carry aria-current', async () => {
    const h = await renderShell();
    for (const mode of ['generator', 'dashboard'] as const) {
      await select(h, mode);
      for (const n of [NAME.en.language, NAME.en.theme, NAME.en.ai]) {
        expect(railBtn(n).hasAttribute('aria-current'), `${n} in ${mode}`).toBe(false);
      }
    }
  });

  it('the rail keeps no active-item state of its own: a cancelled "unsaved changes" confirm in HTML Editor leaves aria-current on HTML Editor', async () => {
    const h = await renderShell();
    await select(h, 'html-editor');
    h.cmp.htmlEditorRef = () => ({ hasUnsavedChanges: () => true }); // the editor reports unsaved edits
    const confirmSpy = vi.fn(() => false); // the user cancels
    vi.stubGlobal('confirm', confirmSpy);
    await h.user.click(railBtn('Generator'));
    await h.settle();
    expect(confirmSpy, 'the existing unsaved-changes guard must still decide').toHaveBeenCalledTimes(1);
    expect(h.cmp.appMode()).toBe('html-editor');
    expect(currentItems(h)).toEqual([railBtn('HTML Editor')]);

    confirmSpy.mockReturnValue(true); // now the user confirms
    await h.user.click(railBtn('Generator'));
    await h.settle();
    expect(h.cmp.appMode()).toBe('generator');
    expect(currentItems(h)).toEqual([railBtn('Generator')]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// AC-3 - collapse control, widths, persistence, accessible names (FR-4, FR-5, FR-6)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('AC-3 / FR-4: the collapse control and the two rails', () => {
  it('the rail is expanded by default: the control offers "Collapse navigation" and the rail carries w-64', async () => {
    await renderShell();
    expect(railBtn(NAME.en.collapse).hasAttribute('aria-current'), 'the collapse control never carries aria-current').toBe(false);
    expect(queryRailBtn(NAME.en.expand)).toBeNull();
    expect(rail().classList.contains('w-64')).toBe(true);
    expect(rail().classList.contains('w-16')).toBe(false);
  });

  it('collapsing switches to the icon-only rail (w-16, no group toggles) and the control now offers "Expand navigation"; expanding returns', async () => {
    const h = await renderShell();
    await h.user.click(railBtn(NAME.en.collapse));
    await h.settle();
    expect(railBtn(NAME.en.expand)).toBeDefined();
    expect(queryRailBtn(NAME.en.collapse)).toBeNull();
    expect(rail().classList.contains('w-16')).toBe(true);
    expect(rail().classList.contains('w-64')).toBe(false);
    for (const g of GROUPS) expect(queryRailBtn(g.header.en), `${g.id} header is not a toggle in the icon-only rail`).toBeNull();
    expect(inRail().getAllByRole('button').filter((b) => GROUP_HEADER_TEXT.test(b.textContent ?? '')), 'no " · N" group header is shown').toHaveLength(0);

    await h.user.click(railBtn(NAME.en.expand));
    await h.settle();
    expect(railBtn(NAME.en.collapse)).toBeDefined();
    expect(rail().classList.contains('w-64')).toBe(true);
  });

  it('the control\'s name is translated in the Ukrainian interface, in both states', async () => {
    const h = await renderShell({ lang: 'uk' });
    expect(railBtn(NAME.uk.collapse)).toBeDefined();
    await h.user.click(railBtn(NAME.uk.collapse));
    await h.settle();
    expect(railBtn(NAME.uk.expand)).toBeDefined();
  });

  it('selecting a mode does not change the rail state, in either state', async () => {
    const h = await renderShell();
    await select(h, 'optimizer');
    expect(railBtn(NAME.en.collapse)).toBeDefined();
    await h.user.click(railBtn(NAME.en.collapse));
    await h.settle();
    await select(h, 'translator');
    await select(h, 'dashboard');
    expect(railBtn(NAME.en.expand)).toBeDefined();
    expect(storedRail()).toBe('false');
    await h.user.click(railBtn(NAME.en.expand));
    await h.settle();
    await select(h, 'generator');
    expect(railBtn(NAME.en.collapse)).toBeDefined();
    expect(storedRail()).toBe('true');
  });

  it('every mode item and every bottom control stays operable by keyboard in the icon-only rail', async () => {
    const h = await renderShell();
    await h.user.click(railBtn(NAME.en.collapse));
    await h.settle();
    railBtn('Optimizer').focus();
    await h.user.keyboard('{Enter}');
    await h.settle();
    expect(h.cmp.appMode()).toBe('optimizer');
    railBtn(NAME.en.dashboard).focus();
    await h.user.keyboard('{Enter}');
    await h.settle();
    expect(h.cmp.appMode()).toBe('dashboard');
    railBtn(NAME.en.language).focus();
    await h.user.keyboard('{Enter}');
    await h.settle();
    expect(railBtn(NAME.uk.language), 'the Language control switched the interface by keyboard').toBeDefined();
  });
});

describe('AC-3 / FR-5: the rail state is persisted under seo_gen_shell_rail_expanded and restored', () => {
  it('writes "false" when collapsed and "true" when expanded (string values, true = expanded)', async () => {
    const h = await renderShell();
    await h.user.click(railBtn(NAME.en.collapse));
    await h.settle();
    expect(storedRail()).toBe('false');
    await h.user.click(railBtn(NAME.en.expand));
    await h.settle();
    expect(storedRail()).toBe('true');
  });

  it('a stored "false" starts the app collapsed; a stored "true" starts it expanded', async () => {
    await renderShell({ rail: 'false' });
    expect(railBtn(NAME.en.expand)).toBeDefined();
    expect(rail().classList.contains('w-16')).toBe(true);
    TestBed.resetTestingModule();
    await renderShell({ rail: 'true' });
    expect(railBtn(NAME.en.collapse)).toBeDefined();
    expect(rail().classList.contains('w-64')).toBe(true);
  });

  it('after a reload the rail is in the state it was left in', async () => {
    const h = await renderShell();
    await h.user.click(railBtn(NAME.en.collapse));
    await h.settle();
    TestBed.resetTestingModule();
    await renderShell({ keepStorage: true });
    expect(railBtn(NAME.en.expand), 'restored collapsed').toBeDefined();
  });

  it.each(['yes', '1', '', 'TRUE', 'null', '{"expanded":false}', ' false'])('a stored value other than "true"/"false" (%j) starts the rail expanded, with no error', async (junk) => {
    await renderShell({ rail: junk });
    expect(railBtn(NAME.en.collapse), `value ${JSON.stringify(junk)}`).toBeDefined();
    expect(rail().classList.contains('w-64')).toBe(true);
  });

  it('if reading the rail key throws, the rail starts expanded and collapse/expand still work', async () => {
    const { storageCalls, ...h } = await renderShell({ failRailStorage: 'read' });
    expect(storageCalls!.reads, 'the rail key must have been read (otherwise this test proves nothing)').toBeGreaterThanOrEqual(1);
    expect(railBtn(NAME.en.collapse)).toBeDefined();
    await h.user.click(railBtn(NAME.en.collapse));
    await h.settle();
    expect(railBtn(NAME.en.expand)).toBeDefined();
  });

  it('if writing the rail key throws, collapse and expand keep working for the session and no exception leaves the click handler', async () => {
    const { storageCalls, ...h } = await renderShell({ failRailStorage: 'write' });
    await h.user.click(railBtn(NAME.en.collapse)); // a throwing handler makes user.click reject, failing the test here
    await h.settle();
    expect(storageCalls!.writes, 'a write of "false" must have been attempted').toContain('false');
    expect(railBtn(NAME.en.expand), 'collapsed despite the failing write').toBeDefined();
    await h.user.click(railBtn(NAME.en.expand));
    await h.settle();
    expect(storageCalls!.writes).toContain('true');
    expect(railBtn(NAME.en.collapse), 'expanded again despite the failing write').toBeDefined();
  });

  it('if both reading and writing throw the app still renders and works', async () => {
    const h = await renderShell({ failRailStorage: 'both' });
    expect(railBtn(NAME.en.collapse)).toBeDefined();
    await h.user.click(railBtn(NAME.en.collapse));
    await h.settle();
    await select(h, 'translator');
    expect(h.cmp.appMode()).toBe('translator');
  });
});

describe.each([
  { lang: 'en', expanded: true }, { lang: 'en', expanded: false },
  { lang: 'uk', expanded: true }, { lang: 'uk', expanded: false },
] as const)('AC-3 / FR-6: accessible names ($lang, rail expanded: $expanded)', ({ lang, expanded }) => {
  it('every rail button has a translated name from the copy table and no two share a name', async () => {
    const h = await renderShell({ lang });
    if (!expanded) { await h.user.click(railBtn(NAME[lang].collapse)); await h.settle(); }
    expectEveryRailButtonNamedAndUnique(lang, expanded);
  });

  it('the Language control\'s accessible name contains its visible code (WCAG 2.5.3)', async () => {
    const h = await renderShell({ lang });
    if (!expanded) { await h.user.click(railBtn(NAME[lang].collapse)); await h.settle(); }
    const language = railBtn(NAME[lang].language);
    expect(language.textContent).toContain(CODE_OF[lang]);
    expect(NAME[lang].language.startsWith(`${CODE_OF[lang]}, `)).toBe(true);
  });
});

describe('AC-3 / FR-6: unique names resolve through a plain role-and-name lookup', () => {
  it.each([true, false])('getByRole("button", { name: /Image Tools/ }) and the exact name "Image Studio" each find exactly one button (rail expanded: %s)', async (expanded) => {
    const h = await renderShell();
    if (!expanded) { await h.user.click(railBtn(NAME.en.collapse)); await h.settle(); }
    const tools = screen.getAllByRole('button', { name: /Image Tools/ });
    const studio = screen.getAllByRole('button', { name: 'Image Studio' });
    expect(tools).toHaveLength(1);
    expect(studio).toHaveLength(1);
    expect(rail().contains(tools[0]) && rail().contains(studio[0]), 'both are rail items').toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// AC-4 / AC-4c - everything stays reachable; bottom controls (FR-7, FR-10)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe.each([true, false])('AC-4 / FR-7: every mode is reachable from the rail (rail expanded: %s)', (expanded) => {
  it('each of the 12 content modes and the Dashboard can be selected and becomes the active mode', async () => {
    const h = await renderShell();
    if (!expanded) { await h.user.click(railBtn(NAME.en.collapse)); await h.settle(); }
    for (const mode of ALL_MODES) {
      await select(h, mode);
      expect(h.cmp.appMode(), mode).toBe(mode);
    }
  });
});

describe('AC-4 / FR-7: selecting a mode shows the same main-area view as before', () => {
  it('Dashboard, HTML Editor, Image Studio and Readability mount their own views; the pre-result Generator shows its form in the main area', async () => {
    const h = await renderShell();
    await select(h, 'dashboard');
    expect(h.view.container.querySelector('app-dashboard')).not.toBeNull();
    await select(h, 'html-editor');
    expect(h.view.container.querySelector('app-html-editor')).not.toBeNull();
    await select(h, 'image-studio');
    expect(h.view.container.querySelector('app-image-studio')).not.toBeNull();
    await select(h, 'readability');
    expect(screen.getByRole('region', { name: 'Readability analysis workspace' })).toBeDefined();
    await select(h, 'generator');
    expect(within(mainOf(h)).getByText(/Target Website/)).toBeDefined();
  });
});

describe.each(['en', 'uk'] as const)('AC-4c / FR-10: bottom controls in %s', (lang) => {
  const bottom = (l: Lang) => [NAME[l].dashboard, NAME[l].language, NAME[l].theme, NAME[l].ai];

  it.each([true, false])('are, in order, Dashboard, Language, Theme, AI Settings, after the mode items (rail expanded: %s)', async (expanded) => {
    const h = await renderShell({ lang });
    if (!expanded) { await h.user.click(railBtn(NAME[lang].collapse)); await h.settle(); }
    const els = bottom(lang).map((n) => railBtn(n));
    for (let i = 1; i < els.length; i++) expect(follows(els[i - 1], els[i]), `${bottom(lang)[i]} follows ${bottom(lang)[i - 1]}`).toBe(true);
    const lastMode = railBtn(LABEL[lang]['html-editor']);
    expect(follows(lastMode, els[0]), 'the bottom controls sit below the last mode item').toBe(true);
  });
});

describe('AC-4c / AC-4 / FR-7, FR-10: the bottom controls work in the icon-only rail and in panel-less modes', () => {
  it('Dashboard selects the dashboard; Language toggles the interface language and re-renders every name; both ways', async () => {
    const h = await renderShell();
    await h.user.click(railBtn(NAME.en.collapse));
    await h.settle();
    await h.user.click(railBtn(NAME.en.dashboard));
    await h.settle();
    expect(h.cmp.appMode()).toBe('dashboard');
    await h.user.click(railBtn(NAME.en.language));
    await h.settle();
    expect(railBtn(NAME.uk.language), 'Language now names itself in Ukrainian').toBeDefined();
    expectEveryRailButtonNamedAndUnique('uk', false);
    await h.user.click(railBtn(NAME.uk.language));
    await h.settle();
    expect(railBtn(NAME.en.language)).toBeDefined();
    expectEveryRailButtonNamedAndUnique('en', false);
  });

  it('switching the interface language re-renders group headers and item names; no English group name remains in the Ukrainian interface', async () => {
    const h = await renderShell();
    await h.user.click(railBtn(NAME.en.language));
    await h.settle();
    for (const g of GROUPS) {
      expect(railBtn(g.header.uk), g.header.uk).toBeDefined();
      expect(queryRailBtn(g.header.en), `${g.header.en} must be gone`).toBeNull();
    }
    for (const m of CONTENT_MODES) expect(railBtn(LABEL.uk[m]), m).toBeDefined();
    expect(localStorage.getItem('seo_gen_ui_lang')).toBe('uk');
  });

  it.each(['image-studio', 'html-editor', 'dashboard'] as const)('AI Settings opens the model settings modal in the panel-less mode %s (the modal does not depend on the panel)', async (mode) => {
    const h = await renderShell();
    await select(h, mode);
    await h.user.click(railBtn(NAME.en.ai));
    await h.settle();
    expect(screen.getByRole('heading', { name: 'AI Model Settings' })).toBeDefined();
  });

  it('AI Settings opens the modal from the icon-only rail, with the Ukrainian title in the Ukrainian interface', async () => {
    const h = await renderShell({ lang: 'uk' });
    await h.user.click(railBtn(NAME.uk.collapse));
    await h.settle();
    await h.user.click(railBtn(NAME.uk.ai));
    await h.settle();
    expect(screen.getByRole('heading', { name: NAME.uk.ai })).toBeDefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// AC-4a - theme toggle in the rail (FR-8)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe.each([true, false])('AC-4a / FR-8: the theme toggle in the rail (rail expanded: %s)', (expanded) => {
  it('shows a moon in the light theme and a sun in the dark theme, keeps its name, and switches the dark class on the document root', async () => {
    const h = await renderShell();
    if (!expanded) { await h.user.click(railBtn(NAME.en.collapse)); await h.settle(); }
    const theme = () => railBtn(NAME.en.theme);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(theme().querySelector('i.fa-moon'), 'moon in the light theme').not.toBeNull();
    expect(theme().querySelector('i.fa-sun')).toBeNull();

    await h.user.click(theme());
    await h.settle();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(theme().querySelector('i.fa-sun'), 'sun in the dark theme').not.toBeNull();
    expect(theme().querySelector('i.fa-moon')).toBeNull();
    expect(localStorage.getItem('seo_gen_dark_mode')).toBe('true');

    await h.user.click(theme());
    await h.settle();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(theme().querySelector('i.fa-moon')).not.toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// AC-4b - the input panel by mode (FR-9)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('AC-4b / FR-9: the input panel is present only in the nine text modes and Image Tools', () => {
  it('the panel (<aside>) is rendered in every panel mode and absent from the DOM in image-studio, html-editor and dashboard', async () => {
    const h = await renderShell();
    for (const mode of ALL_MODES) {
      await select(h, mode);
      if (PANEL_MODES.includes(mode)) expect(panelOf(h), `${mode} must render the panel`).not.toBeNull();
      else expect(panelOf(h), `${mode} must NOT render the panel`).toBeNull();
    }
  });

  it('the panel sits to the right of the rail (rail first in the DOM, then panel, then main)', async () => {
    const h = await renderShell();
    expect(follows(rail(), panelOf(h)!), 'panel follows the rail').toBe(true);
    expect(follows(panelOf(h)!, mainOf(h)), 'main follows the panel').toBe(true);
  });

  it('the rail is never mistaken for the panel: the only <aside> in a panel mode is the panel (it holds the Generate button)', async () => {
    const h = await renderShell();
    expect(h.view.container.querySelectorAll('aside')).toHaveLength(1);
    expect(panelOf(h)!.contains(rail())).toBe(false);
    expect(within(panelOf(h)!).getByRole('button', { name: /Generate/ })).toBeDefined();
  });

  it('there is no mode switcher in any panel: none of the 13 mode names is a button inside the panel', async () => {
    const h = await renderShell();
    for (const mode of PANEL_MODES) {
      await select(h, mode);
      const panel = within(panelOf(h)!);
      for (const m of ALL_MODES) expect(panel.queryByRole('button', { name: modeName(m, 'en') }), `${m} switcher button inside the ${mode} panel`).toBeNull();
    }
  });

  it('the panel header strip carries no mode label and no other text (OD-22)', async () => {
    const h = await renderShell();
    for (const mode of PANEL_MODES) {
      await select(h, mode);
      const panel = panelOf(h)!;
      const strip = panel.firstElementChild as HTMLElement;
      expect((strip.textContent ?? '').trim(), `${mode}: header strip text`).toBe('');
      // Mode interiors may legitimately carry their own heading (the FAQ form's "FAQ Generator"); only the strip is constrained.
      for (const m of CONTENT_MODES) expect(within(strip).queryByText(LABEL.en[m]), `${m} label inside the ${mode} header strip`).toBeNull();
    }
  });

  it('before any result, Generator and UA Description show the centred form in <main> and the panel holds only their Generate and Clear buttons', async () => {
    const h = await renderShell();
    for (const mode of ['generator', 'ua-generator'] as const) {
      await select(h, mode);
      expect(within(mainOf(h)).queryByText(/Target Website/), `${mode}: form in main`).not.toBeNull();
      expect(within(panelOf(h)!).queryByText(/Target Website/), `${mode}: no form in the panel`).toBeNull();
      expect(within(panelOf(h)!).getByRole('button', { name: /Generate/ })).toBeDefined();
      expect(within(panelOf(h)!).getByRole('button', { name: 'Clear All' })).toBeDefined();
    }
  });

  it('after a result exists, Generator moves its form into the panel and the main area no longer holds it', async () => {
    const h = await renderShell();
    await select(h, 'generator');
    (TestBed.inject(ContentOrchestratorService).content as any).update((c: any) => ({ ...c, mainHtmlUa: '<p>generated</p>' }));
    await h.settle();
    expect(within(panelOf(h)!).queryByText(/Target Website/), 'form in the panel').not.toBeNull();
    expect(within(mainOf(h)).queryByText(/Target Website/), 'form no longer in main').toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// AC-4d - History: generator only, in the panel header (FR-11)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('AC-4d / FR-11: the History button and overlay exist only in generator mode', () => {
  const overlay = () => screen.queryByRole('heading', { name: 'Generation History' });

  it('in generator mode the History button is in the panel header and toggles the overlay', async () => {
    const h = await renderShell();
    const panel = panelOf(h)!;
    const history = within(panel).getByRole('button', { name: 'History' });
    const strip = panel.firstElementChild as HTMLElement;
    expect(strip.contains(history), 'the History button sits in the panel header strip').toBe(true);
    // FR-9 / OD-22: in generator mode the strip holds the History button and nothing else (no title, no language/theme/settings/dashboard controls).
    expect(strip.querySelectorAll('button'), 'the header strip holds exactly one button').toHaveLength(1);
    expect((strip.textContent ?? '').trim(), 'the header strip holds no text').toBe('');
    expect(overlay()).toBeNull();
    await h.user.click(history);
    await h.settle();
    expect(overlay(), 'overlay open').not.toBeNull();
    await h.user.click(within(panelOf(h)!).getByRole('button', { name: 'History' }));
    await h.settle();
    expect(overlay(), 'overlay closed again').toBeNull();
  });

  it('no mode other than generator renders a History button, panel mode or not', async () => {
    const h = await renderShell();
    for (const mode of ALL_MODES.filter((m) => m !== 'generator')) {
      await select(h, mode);
      expect(screen.queryByRole('button', { name: 'History' }), `${mode}: History button`).toBeNull();
    }
  });

  it('with the history flag set, leaving generator renders no overlay anywhere; returning to generator shows it again', async () => {
    const h = await renderShell();
    await h.user.click(within(panelOf(h)!).getByRole('button', { name: 'History' }));
    await h.settle();
    expect(overlay()).not.toBeNull();
    for (const mode of ALL_MODES.filter((m) => m !== 'generator')) {
      await select(h, mode);
      expect(overlay(), `${mode}: overlay`).toBeNull();
    }
    await select(h, 'generator');
    expect(overlay(), 'the flag was not reset by leaving generator').not.toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// AC-4e - Clear All gated with the panel (FR-12)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe.each([
  { lang: 'en', clear: 'Clear All' }, { lang: 'uk', clear: 'Очистити все' },
] as const)('AC-4e / FR-12: Clear All is gated with the panel in %s', ({ lang, clear }) => {
  it('is rendered in the panel of each of the ten panel modes and absent (with the panel) in image-studio, html-editor and dashboard', async () => {
    const h = await renderShell({ lang });
    for (const mode of ALL_MODES) {
      await select(h, mode, lang);
      if (PANEL_MODES.includes(mode)) {
        expect(within(panelOf(h)!).getByRole('button', { name: clear }), `${mode}: Clear All in the panel`).toBeDefined();
      } else {
        expect(panelOf(h), `${mode}: no panel`).toBeNull();
        expect(screen.queryByRole('button', { name: clear }), `${mode}: Clear All`).toBeNull();
      }
    }
  });
});

describe('AC-4e / FR-12: Clear All behaves exactly as before in a panel mode', () => {
  it('Generator, reached through the rail: Clear All empties the product name', async () => {
    const h = await renderShell();
    await select(h, 'translator');
    await select(h, 'generator');
    h.cmp.productName.set('Ortur Laser Master 3');
    await h.settle();
    await h.user.click(within(panelOf(h)!).getByRole('button', { name: 'Clear All' }));
    await h.settle();
    expect(h.cmp.productName()).toBe('');
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// AC-7 - the improvement-request block follows the panel (FR-17)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('AC-7 / FR-17: the improvement-request block (button, rename pen, popup-blocked notice) is a unit that follows the panel', () => {
  const BTN = 'Suggest an improvement';
  const PEN = 'Change your name';
  const NOTICE = /The browser blocked the new tab/;

  it('with baseUrl set, all three are rendered together in every panel mode', async () => {
    expect(environment.feedbackForm.baseUrl, 'premise: the development environment configures a feedback form').not.toBe('');
    const h = await renderShell();
    h.cmp.feedbackPopupBlocked.set(true);
    for (const mode of PANEL_MODES) {
      await select(h, mode);
      const panel = within(panelOf(h)!);
      expect(panel.getByRole('button', { name: BTN }), `${mode}: button`).toBeDefined();
      expect(panel.getByRole('button', { name: PEN }), `${mode}: pen`).toBeDefined();
      expect(panel.getByText(NOTICE), `${mode}: notice`).toBeDefined();
    }
  });

  it('with baseUrl set, none of the three is rendered in image-studio, html-editor or dashboard (the panel is absent too)', async () => {
    const h = await renderShell();
    h.cmp.feedbackPopupBlocked.set(true);
    for (const mode of PANEL_LESS_MODES) {
      await select(h, mode);
      expect(panelOf(h), `${mode}: panel`).toBeNull();
      expect(screen.queryByRole('button', { name: BTN }), `${mode}: button`).toBeNull();
      expect(screen.queryByRole('button', { name: PEN }), `${mode}: pen`).toBeNull();
      expect(screen.queryByText(NOTICE), `${mode}: notice`).toBeNull();
    }
    await select(h, 'translator');
    expect(screen.queryByRole('button', { name: BTN }), 'back in a panel mode the block returns').not.toBeNull();
  });

  it('with baseUrl empty nothing of the block is rendered in any mode (as today)', async () => {
    environment.feedbackForm.baseUrl = '';
    const h = await renderShell();
    h.cmp.feedbackPopupBlocked.set(true);
    for (const mode of ALL_MODES) {
      await select(h, mode);
      expect(screen.queryByRole('button', { name: BTN }), `${mode}: button`).toBeNull();
      expect(screen.queryByRole('button', { name: PEN }), `${mode}: pen`).toBeNull();
      expect(screen.queryByText(NOTICE), `${mode}: notice`).toBeNull();
    }
  });

  it('the button keeps working: it asks for the editor name and opens the prefilled form in a new tab', async () => {
    const h = await renderShell();
    await select(h, 'translator');
    vi.stubGlobal('prompt', vi.fn(() => 'Test Editor'));
    const open = vi.fn(() => ({ opener: {} }));
    vi.stubGlobal('open', open);
    await h.user.click(within(panelOf(h)!).getByRole('button', { name: BTN }));
    expect(open).toHaveBeenCalledTimes(1);
    const [url] = open.mock.calls[0] as unknown as [string, string];
    expect(url.startsWith(environment.feedbackForm.baseUrl)).toBe(true);
    expect(url).toContain(`${environment.feedbackForm.entryAuthor}=${encodeURIComponent('Test Editor')}`);
  });

  it('the shell adds no second "Suggest an improvement" control outside the panel', async () => {
    const h = await renderShell();
    expect(inRail().queryByRole('button', { name: BTN })).toBeNull();
    expect(screen.getAllByRole('button', { name: BTN })).toHaveLength(1);
    await select(h, 'dashboard');
    expect(screen.queryAllByRole('button', { name: BTN })).toHaveLength(0);
  });
});

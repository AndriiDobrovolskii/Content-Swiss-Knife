/**
 * US-10.1 T46 - Image Studio inside the real AppComponent: clear-all and the shared chrome (FR-1, SD-12; plan DD-25, C10).
 *
 * US-2.2 rejected an `AppComponent` spec as heavy DI; FR-1 makes the behavioural test the contract ("a test invokes
 * clear-all in the mode and reads the same sessions afterwards"), and the plan forbids silently downgrading it to source
 * pins (R12, choice P-10). Probe 0 (run on the base tree before this spec was written) showed `AppComponent` renders with
 * only `provideHttpClient()` + `provideHttpClientTesting()`; no further stubbing is needed, so this is the real component with
 * the real root services. Only the studio's ports are fakes (the in-memory `SessionStorePort` of fakes.ts behind its token).
 *
 * What is asserted, from FR-1 / SD-12 / DD-25 (not from the implementation):
 *   - the navigation has an Image Studio entry in both languages ("Image Studio" / "Студія зображень", X-28);
 *   - with Image Tools files seeded, studio mode shows NO "Process images" button (neither language) - the footer's final
 *     `@else` must not leak - and no Image Tools sidebar control (`input[type=range]`);
 *   - the existing Image Tools behaviour is unchanged (NFR-6): its button is there and Clear-all still empties its files.
 *
 * US-10.4 TEST_WRITING (Specification FR-18 a, c; OD-30 - the product owner's explicit approval, AC-8). Image Studio no longer
 * renders the input panel (FR-9) and therefore has no Clear All (FR-12, AC-4e). Per the OD-30 disposition table:
 *   - REMOVED: "Clear all in Image Studio mode leaves every stored session exactly as it was" (EN and UA) - it needs a Clear All
 *     button that studio mode no longer has; and ONLY the assertion "the Clear-all button is present" of the DD-25 / R16 test;
 *   - ADAPTED: the `aside(h)` helper no longer assumes a panel exists. In studio mode it asserts the panel is ABSENT (so the
 *     absence checks that follow cannot pass vacuously) and the "no Process-images button" and "no range control" assertions
 *     are kept, the range control now looked up in the whole rendered app;
 *   - KEPT UNCHANGED: the Image Studio entry test, every Image Tools test (the panel lookup finds the panel, not the rail,
 *     because the rail is a <nav>), and the studio / Image Tools / studio round trip.
 * The panel-absent assertion is red until task T6 gates the panel by mode (the panel is still rendered before that).
 *
 * The Image Tools files are seeded on the component instance (the UI path needs a real file chooser); the mode switch and the
 * clear-all go through the real buttons.
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/angular';
import { DeferBlockBehavior } from '@angular/core/testing';
import { AppComponent } from './app.component';
import {
  renderStudio, t, type Harness, type Lang,
} from '../../test/image-studio/helpers/studio-render';
import { makeSession } from '../../test/image-studio/helpers/fakes';

const NAV = { en: 'Image Studio', uk: 'Студія зображень' } as const;
const CLEAR = { en: 'Clear All', uk: 'Очистити все' } as const;
const PROCESS = { en: 'Process Images', uk: 'Обробити' } as const;

const SESSIONS = () => [
  makeSession('s1', { pairs: 2, costUsd: 0.06 }),
  makeSession('s2', { pairs: 1, costUsd: 0.03, lastActivity: 999_000, createdAt: 999_000 }),
  makeSession('s3', { pairs: 0, lastActivity: 998_000, createdAt: 998_000 }),
];

async function renderApp(lang: Lang) {
  const h = await renderStudio(AppComponent, { sessions: SESSIONS(), noLangInput: true, deferBlockBehavior: DeferBlockBehavior.Playthrough });
  const cmp = h.view.fixture.componentInstance as any;
  if (lang === 'uk') { cmp.uiLanguage.set('uk'); h.view.detectChanges(); }
  cmp.imgFiles.set([{ file: new File(['x'], 'photo.png', { type: 'image/png' }), previewUrl: 'blob:seeded' }]);
  h.view.detectChanges();
  return { h, cmp };
}
const enterStudio = async (h: Harness, lang: Lang) => {
  await h.user.click(screen.getByRole('button', { name: NAV[lang] }));
  await screen.findByRole('textbox', { name: t('X-12', lang) }); // the @defer branch has mounted the studio
  await h.settle();
};
/** The input panel, or null when the mode renders none (US-10.4 FR-9: image-studio, html-editor and dashboard have no panel). */
const aside = (h: Harness) => h.view.container.querySelector('aside') as HTMLElement | null;
/** The input panel of a mode that must have one; fails with a message instead of a TypeError when it is missing. */
const panel = (h: Harness): HTMLElement => {
  const el = aside(h);
  expect(el, 'this mode must render the input panel').not.toBeNull();
  return el as HTMLElement;
};

describe.each(['en', 'uk'] as const)('FR-1 / SD-12 / DD-25 in %s', (lang) => {
  it('FR-1: the Mode Switcher has an Image Studio entry and selecting it mounts the studio', async () => {
    const { h, cmp } = await renderApp(lang);
    await enterStudio(h, lang);
    expect(cmp.appMode()).toBe('image-studio');
  });

  it('DD-25 / R16 (US-10.4 OD-30): with Image Tools files seeded, studio mode renders no input panel, no Process-images button and no Image Tools range control', async () => {
    const { h } = await renderApp(lang);
    await enterStudio(h, lang);
    expect(screen.queryByText(PROCESS[lang])).toBeNull();
    expect(screen.queryAllByRole('button', { name: new RegExp(`^${PROCESS[lang]}$`) })).toHaveLength(0);
    expect(aside(h), 'US-10.4 FR-9: studio mode renders no input panel, so the absences above are not vacuous').toBeNull();
    expect(h.view.container.querySelectorAll('input[type="range"]')).toHaveLength(0);
  });
});

describe('NFR-6: the existing Image Tools mode is unchanged by the new mode', () => {
  it('NFR-6 (premise of the DD-25 assertions): in Image Tools mode with a file seeded the Process-images button and the range control ARE rendered', async () => {
    const { h, cmp } = await renderApp('en');
    await h.user.click(screen.getByRole('button', { name: /Image Tools/ }));
    h.view.detectChanges();
    expect(cmp.appMode()).toBe('image-tools');
    expect(screen.getAllByText(PROCESS.en).length).toBeGreaterThan(0);
    expect(panel(h).querySelectorAll('input[type="range"]').length).toBeGreaterThan(0);
  });

  it('NFR-6 / SD-12: Clear all in Image Tools mode still empties its files, and leaves the stored studio sessions alone', async () => {
    const { h, cmp } = await renderApp('en');
    await h.user.click(screen.getByRole('button', { name: /Image Tools/ }));
    const before = JSON.stringify(h.sessionStore.snapshot());
    await h.user.click(screen.getByRole('button', { name: CLEAR.en }));
    h.view.detectChanges();
    expect(cmp.imgFiles()).toHaveLength(0);
    expect(JSON.stringify(h.sessionStore.snapshot())).toBe(before);
  });

  it('NFR-6 / FR-1: leaving the studio for another mode and coming back keeps the stored sessions (state is not owned by AppComponent)', async () => {
    const { h, cmp } = await renderApp('en');
    await enterStudio(h, 'en');
    await h.user.click(screen.getByRole('button', { name: /Image Tools/ }));
    h.view.detectChanges();
    expect(cmp.appMode()).toBe('image-tools');
    await enterStudio(h, 'en');
    expect(Object.keys(h.sessionStore.snapshot().sessions).sort()).toEqual(['s1', 's2', 's3']);
    expect(screen.getByRole('list', { name: t('X-9', 'en') })).toBeDefined();
  });
});

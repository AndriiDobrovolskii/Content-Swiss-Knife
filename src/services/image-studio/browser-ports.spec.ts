/**
 * US-10.5 T18 - the two browser-side defaults that every fake hides (breakdown finding F-8, REQUIRED): the `LOCAL_OFFSET_PORT` root
 * default (a sign convention) and the `ARCHIVE_BUILDER_PORT` root default (the real `buildZip`).
 *
 * Logic runner. The root defaults of the two `InjectionToken`s are resolved the way the app resolves them: through an environment
 * injector with the `root` scope (`createEnvironmentInjector` + the `INJECTOR_SCOPE` provider; a plain `Injector.create` has no root
 * scope and throws NG0201 - observed while writing this spec). The tokens are NOT provided by the test.
 *
 * (1) LOCAL_OFFSET_PORT. `formatRowDate(x, adapter.offsetMinutes(x))` must equal the `dd.MM · HH:mm` assembled from the getters of
 *     `new Date(x)`. The spec deliberately does NOT assert `offsetMinutes(x) === -new Date(x).getTimezoneOffset()`: that repeats the
 *     implementation and cannot catch a wrong sign. It sets a non-zero, daylight-saving zone through `process.env.TZ` (Node resets its
 *     zone cache on assignment; observed: the host offset changes within the process), asserts the precondition
 *     `new Date(x).getTimezoneOffset() !== 0` so a runtime that ignores the change fails LOUDLY instead of passing vacuously, runs a second
 *     pass in a half-hour zone, and restores the variable afterwards. A spec may use `Date`; scan g covers src/utils/image-studio only.
 * (2) ARCHIVE_BUILDER_PORT. Resolved from its root default it builds a zip JSZip opens, with entries named by `buildFileName` and
 *     byte-identical to the inputs when source and target MIME are equal (a codec stub that throws if called proves no conversion),
 *     and returns null for zero versions.
 */
import '@angular/compiler';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { Injector, createEnvironmentInjector, ɵINJECTOR_SCOPE as INJECTOR_SCOPE, type EnvironmentInjector, type InjectionToken } from '@angular/core';
import JSZip from 'jszip';
import { LOCAL_OFFSET_PORT, ARCHIVE_BUILDER_PORT, USER_PRESET_STORAGE_PORT, CLOCK_PORT } from './image-studio.tokens';
import { createBrowserUserPresetStorage, USER_PRESETS_STORAGE_KEY } from './browser-ports';
import { UserPresetsService } from './user-presets.service';
import { createUserPreset, type UserPreset } from '../../utils/image-studio/user-presets';
import { formatRowDate } from '../../utils/image-studio/format';
import { buildFileName } from '../../utils/image-studio/file-name';
import type { LocalOffset } from '../../utils/image-studio/ports';
import { makeFakeLocalOffset, makeFakeClock, makeRaster, type ImageCodec, type ArchiveBuilder } from '../../../test/image-studio/helpers/fakes';

/** The default of a `providedIn: 'root'` token, resolved from a root-scoped environment injector (nothing provided). */
function rootDefault<T>(token: InjectionToken<T>): T {
  const env = createEnvironmentInjector([{ provide: INJECTOR_SCOPE, useValue: 'root' }], Injector.NULL as unknown as EnvironmentInjector);
  return env.get(token);
}

const pad = (n: number) => String(n).padStart(2, '0');
/** `dd.MM · HH:mm` built from the LOCAL getters of the host, i.e. from what the browser itself says the local time is. */
const localRowDate = (epochMs: number) => {
  const d = new Date(epochMs);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Five instants spread over a year: both sides of both daylight-saving changes of a northern zone, and a midnight-sensitive one.
const INSTANTS = [
  Date.UTC(2026, 0, 15, 12, 0), Date.UTC(2026, 3, 15, 3, 30), Date.UTC(2026, 6, 15, 23, 45), Date.UTC(2026, 9, 15, 0, 10), Date.UTC(2026, 11, 31, 22, 59),
];

describe('US-10.5 NFR-4 / DD-13: the LOCAL_OFFSET_PORT root default has the right sign (T18)', () => {
  const originalTz = process.env['TZ'];
  afterAll(() => {
    if (originalTz === undefined) delete process.env['TZ'];
    else process.env['TZ'] = originalTz;
  });

  describe.each([
    ['America/New_York (daylight saving, west of UTC)'],
    ['Asia/Kolkata (a half-hour zone, east of UTC)'],
    ['Pacific/Auckland (daylight saving, far east of UTC)'],
  ])('in %s', (label) => {
    const zone = label.split(' ')[0];
    beforeAll(() => { process.env['TZ'] = zone; });

    it('precondition: the runtime really changed zone (a vacuous pass is not allowed), at every instant', () => {
      for (const x of INSTANTS) expect(new Date(x).getTimezoneOffset(), `${zone} @ ${x}`).not.toBe(0);
    });

    it('formatRowDate(x, adapter.offsetMinutes(x)) equals the dd.MM · HH:mm built from the local getters, at every instant', () => {
      const adapter = rootDefault(LOCAL_OFFSET_PORT) as LocalOffset;
      for (const x of INSTANTS) {
        expect(formatRowDate(x, adapter.offsetMinutes(x)), `${zone} @ ${new Date(x).toISOString()}`).toBe(localRowDate(x));
      }
    });
  });

  it('known zones give the known signed offsets (east of UTC is positive): Kolkata +330 all year; New York -300 in January and -240 in July', () => {
    const adapter = rootDefault(LOCAL_OFFSET_PORT) as LocalOffset;
    process.env['TZ'] = 'Asia/Kolkata';
    expect(new Date(INSTANTS[0]).getTimezoneOffset()).not.toBe(0);
    for (const x of INSTANTS) expect(adapter.offsetMinutes(x)).toBe(330);
    process.env['TZ'] = 'America/New_York';
    expect(new Date(INSTANTS[0]).getTimezoneOffset()).not.toBe(0);
    expect(adapter.offsetMinutes(INSTANTS[0])).toBe(-300);
    expect(adapter.offsetMinutes(INSTANTS[2])).toBe(-240);
  });

  it('the fake used by the component specs fits the production LocalOffset type (a compile-time fit, checked here once)', () => {
    const fake: LocalOffset = makeFakeLocalOffset(120);
    expect(fake.offsetMinutes(0)).toBe(120);
  });
});

describe('US-10.5 DD-6 / D-8: the ARCHIVE_BUILDER_PORT root default builds a valid zip (T18)', () => {
  const throwingCodec: ImageCodec = {
    probe: () => Promise.reject(new Error('codec must not be called')),
    transcode: () => Promise.reject(new Error('codec must not be called')),
  };

  it('two versions whose MIME equals the target give a zip JSZip opens, with entries named by buildFileName and byte-identical to the inputs', async () => {
    const build = rootDefault(ARCHIVE_BUILDER_PORT) as ArchiveBuilder;
    const png = makeRaster({ format: 'png', width: 40, height: 30, size: 300 });
    const jpg = makeRaster({ format: 'jpg', width: 40, height: 30, size: 301 });

    const bytes = await build(
      [
        { number: 1, bytes: png, mime: 'image/png', targetMime: 'image/png', aspectRatio: '1:1' },
        { number: 2, bytes: jpg, mime: 'image/jpeg', targetMime: 'image/jpeg', aspectRatio: '4:5' },
      ],
      { codec: throwingCodec, productName: '' },
    );

    expect(bytes).not.toBeNull();
    const zip = await JSZip.loadAsync(bytes as Uint8Array);
    const n1 = buildFileName({ productName: '', versionNumber: 1, aspectRatio: '1:1', mimeType: 'image/png' });
    const n2 = buildFileName({ productName: '', versionNumber: 2, aspectRatio: '4:5', mimeType: 'image/jpeg' });
    expect(Object.keys(zip.files).sort()).toEqual([n1, n2].sort());
    expect(Array.from(await zip.file(n1)!.async('uint8array'))).toEqual(Array.from(png));
    expect(Array.from(await zip.file(n2)!.async('uint8array'))).toEqual(Array.from(jpg));
  });

  it('zero versions give null (no empty archive is ever produced)', async () => {
    const build = rootDefault(ARCHIVE_BUILDER_PORT) as ArchiveBuilder;
    expect(await build([], { codec: throwingCodec, productName: '' })).toBeNull();
  });
});

/*
 * US-10.6 loop-back 1 (reconciliation B-1): the user-preset localStorage adapter, `createBrowserUserPresetStorage()`.
 *
 * Every other US-10.6 spec injects an in-memory fake port, so the localStorage half of AC-10 ("survives a page reload") and of AC-10a
 * ("removes it ... from localStorage") was unproven. These cases drive the REAL adapter over the happy-dom `window.localStorage` of the
 * logic runner (the runner is `happy-dom`, so `window` exists; no Angular compilation is needed, and this file is not named
 * `*.component.spec.ts`). They are written from the documented contract of the adapter (its doc comment, the port interface and the
 * Specification NFR-10) and are [characterization] cases: the implementation already exists, so they are green on arrival and guard it.
 */
describe('US-10.6 NFR-10 / AC-10 / AC-10a: the user-preset localStorage adapter (loop-back 1, B-1)', () => {
  const KEY = 'image-studio.user-presets.v1';
  const sample = (): UserPreset[] => {
    const a = createUserPreset({ name: 'Mug shot', prompt: 'A mug on a desk', aspectRatio: '4:5', resolution: '2K', model: 'gemini-3-pro-image' }, [], 1_700_000_000_000);
    const b = createUserPreset({ name: 'Lamp', prompt: 'A lamp at night', aspectRatio: '1:1', resolution: '1K', model: 'gemini-3-pro-image' }, a.ok ? [a.preset] : [], 1_700_000_000_500);
    if (!a.ok || !b.ok) throw new Error('fixture presets must be valid');
    return [a.preset, b.preset];
  };

  /*
   * Failure injection: `window.localStorage` is replaced (observed: spying on `Storage.prototype` has NO effect in happy-dom, whose
   * storage object answers its methods itself, so such a spy would let the "throwing" cases pass or fail vacuously). The replacement
   * delegates everything to the real storage except the named methods, and `restoreStorage()` puts the original property back.
   */
  const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
  const realStorage = window.localStorage;
  const failOn = (methods: Partial<Pick<Storage, 'getItem' | 'setItem'>>) => {
    const replacement = {
      getItem: (key: string) => realStorage.getItem(key),
      setItem: (key: string, value: string) => realStorage.setItem(key, value),
      ...methods,
    };
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => replacement });
  };
  const restoreStorage = () => {
    if (originalDescriptor) Object.defineProperty(window, 'localStorage', originalDescriptor);
  };
  const quotaFull = () => { throw new DOMException('quota', 'QuotaExceededError'); };

  beforeEach(() => { realStorage.clear(); });
  afterEach(() => { restoreStorage(); realStorage.clear(); });

  it('[characterization] the storage key is the documented `image-studio.user-presets.v1`', () => {
    expect(USER_PRESETS_STORAGE_KEY).toBe(KEY);
  });

  it('[characterization] AC-10: save(list) writes the list as JSON under the documented key, and a fresh adapter load() returns the same list (a page reload)', () => {
    const list = sample();
    expect(createBrowserUserPresetStorage().save(list)).toEqual({ ok: true });

    const stored = window.localStorage.getItem(KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string)).toEqual(JSON.parse(JSON.stringify(list)));

    const reloaded = createBrowserUserPresetStorage().load();
    expect(reloaded).toEqual({ ok: true, presets: JSON.parse(JSON.stringify(list)) });
  });

  it('[characterization] an empty store loads as { ok: true, presets: [] } and loading writes nothing', () => {
    expect(createBrowserUserPresetStorage().load()).toEqual({ ok: true, presets: [] });
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('[characterization] non-JSON text under the key loads as { ok: false } and the text is left in place, not deleted', () => {
    window.localStorage.setItem(KEY, 'this is {not json');
    expect(createBrowserUserPresetStorage().load()).toEqual({ ok: false });
    expect(window.localStorage.getItem(KEY)).toBe('this is {not json');
  });

  it('[characterization] a throwing getItem gives { ok: false } from load() instead of an exception', () => {
    failOn({ getItem: () => { throw new Error('storage blocked'); } });
    expect(createBrowserUserPresetStorage().load()).toEqual({ ok: false });
  });

  it('[characterization] a throwing setItem (quota full) gives { ok: false } from save() instead of an exception, and nothing is stored', () => {
    failOn({ setItem: quotaFull });
    expect(createBrowserUserPresetStorage().save(sample())).toEqual({ ok: false });
    restoreStorage();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('[characterization] blocked storage where reading window.localStorage itself throws gives { ok: false } for both load() and save()', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => { throw new Error('access denied'); } });
    try {
      const adapter = createBrowserUserPresetStorage();
      expect(adapter.load()).toEqual({ ok: false });
      expect(adapter.save(sample())).toEqual({ ok: false });
    } finally {
      if (descriptor) Object.defineProperty(window, 'localStorage', descriptor);
      else delete (window as unknown as Record<string, unknown>)['localStorage'];
    }
  });

  describe('through UserPresetsService with the REAL adapter (no fake port)', () => {
    const CURRENT = { prompt: 'A mug on a desk', aspectRatio: '4:5', resolution: '2K', model: 'gemini-3-pro-image' };
    const makeService = () =>
      Injector.create({
        providers: [
          { provide: USER_PRESET_STORAGE_PORT, useValue: createBrowserUserPresetStorage() },
          { provide: CLOCK_PORT, useValue: makeFakeClock(1_700_000_000_000) },
          { provide: UserPresetsService, useClass: UserPresetsService },
        ],
      }).get(UserPresetsService);
    const storedIds = (): string[] => (JSON.parse(window.localStorage.getItem(KEY) ?? '[]') as { id: string }[]).map((p) => p.id);

    it('[characterization] AC-10: a saved preset is in localStorage, and a second service created afterwards (a reload) shows it with the same id, name and fields', () => {
      const first = makeService();
      const r = first.save('My mug shot', CURRENT);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(storedIds()).toEqual([r.preset.id]);

      const reloaded = makeService();
      expect(reloaded.presets()).toHaveLength(1);
      expect(reloaded.presets()[0]).toMatchObject({ id: r.preset.id, name: 'My mug shot', ...CURRENT });
    });

    it('[characterization] AC-10a: after save then remove, the stored item no longer contains that preset and a reload shows none', () => {
      const service = makeService();
      const keep = service.save('Keep me', CURRENT);
      const drop = service.save('Delete me', { ...CURRENT, prompt: 'Something else' });
      expect(keep.ok && drop.ok).toBe(true);
      if (!keep.ok || !drop.ok) return;
      expect(storedIds()).toEqual([keep.preset.id, drop.preset.id]);

      expect(service.remove(drop.preset.id)).toEqual({ ok: true });
      expect(storedIds()).toEqual([keep.preset.id]);
      expect(window.localStorage.getItem(KEY)).not.toContain(drop.preset.id);

      expect(service.remove(keep.preset.id)).toEqual({ ok: true });
      expect(storedIds()).toEqual([]);
      expect(makeService().presets()).toEqual([]);
    });

    it('[characterization] AC-10a: a removal the browser could not store reports { ok: false } and the preset stays in localStorage and in the list', () => {
      const service = makeService();
      const saved = service.save('Stays', CURRENT);
      if (!saved.ok) throw new Error('save must succeed');
      failOn({ setItem: quotaFull });
      expect(service.remove(saved.preset.id)).toEqual({ ok: false });
      restoreStorage();
      expect(storedIds()).toEqual([saved.preset.id]);
      expect(service.presets().map((p) => p.id)).toEqual([saved.preset.id]);
    });
  });
});

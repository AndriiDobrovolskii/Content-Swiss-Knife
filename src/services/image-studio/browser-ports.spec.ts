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
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Injector, createEnvironmentInjector, ɵINJECTOR_SCOPE as INJECTOR_SCOPE, type EnvironmentInjector, type InjectionToken } from '@angular/core';
import JSZip from 'jszip';
import { LOCAL_OFFSET_PORT, ARCHIVE_BUILDER_PORT } from './image-studio.tokens';
import { formatRowDate } from '../../utils/image-studio/format';
import { buildFileName } from '../../utils/image-studio/file-name';
import type { LocalOffset } from '../../utils/image-studio/ports';
import { makeFakeLocalOffset, makeRaster, type ImageCodec, type ArchiveBuilder } from '../../../test/image-studio/helpers/fakes';

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

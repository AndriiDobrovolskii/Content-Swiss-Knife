/**
 * user-presets.service.spec.ts - US-10.6 T18 (FR-15 (d), FR-16, FR-17, NFR-10; AC-10, AC-10a, AC-11).
 *
 * Runner: test:logic, `Injector.create` with the real service and an in-memory fake port (no TestBed, no real localStorage). `@angular/compiler` FIRST.
 *
 * PINNED CONTRACT (the plan names the port, a token in image-studio.tokens.ts, an adapter in browser-ports.ts and a service holding a signal with
 * save(name) / remove(id); the token name and the exact parameters are fixed here):
 *   ports.ts      UserPresetStoragePort { load(): { ok: true, presets: unknown } | { ok: false }; save(presets: UserPreset[]): { ok: boolean } }
 *   tokens        USER_PRESET_STORAGE_PORT  (the fake below is provided under it); CLOCK_PORT for the id instant
 *   service       UserPresetsService (`providedIn: 'root'`)
 *                   presets(): readonly UserPreset[]                                     a signal; empty when nothing is stored / storage is unavailable
 *                   save(name: string, current: { prompt, aspectRatio, resolution, model }): { ok: true, preset } | { ok: false, reason: string }
 *                   remove(id: string): { ok: boolean }
 *   - presets() is read from the port ONCE when the service is created (so a second service over the same storage is a "page reload").
 *   - a save / remove that the port could not store reports { ok: false } and leaves presets() as it was ("not shown as saved / deleted").
 *   - merely loading unreadable data never writes to the port (it is ignored, not deleted).
 */
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { Injector } from '@angular/core';
import * as tokens from './image-studio.tokens';
import { PROMPT_PRESETS } from '../../prompt-core/prompt-presets';
import { makeFakeClock } from '../../../test/image-studio/helpers/fakes';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const CURRENT = { prompt: 'A mug on a desk', aspectRatio: '4:5', resolution: '2K', model: 'gemini-3-pro-image' };

/** A spec-local in-memory port with failure switches; the browser adapter itself is not under test here. */
function makePresetPort(initial: { ok: true; presets: unknown } | { ok: false } = { ok: true, presets: [] }) {
  const state = { stored: initial, saveCalls: 0, failSaves: false };
  return {
    state,
    load: () => state.stored,
    save: (presets: unknown[]) => {
      state.saveCalls += 1;
      if (state.failSaves) return { ok: false };
      state.stored = { ok: true, presets: structuredClone(presets) };
      return { ok: true };
    },
  };
}

async function build(port: ReturnType<typeof makePresetPort>, clockStart = 1_700_000_000_000) {
  const { UserPresetsService } = await load('./user-presets.service');
  const clock = makeFakeClock(clockStart);
  const injector = Injector.create({
    providers: [
      { provide: (tokens as any).USER_PRESET_STORAGE_PORT, useValue: port },
      { provide: tokens.CLOCK_PORT, useValue: clock },
      { provide: UserPresetsService, useClass: UserPresetsService },
    ],
  });
  return { service: injector.get(UserPresetsService) as any, clock };
}

describe('UserPresetsService: save and survive a reload (T18, AC-10)', () => {
  it('the token USER_PRESET_STORAGE_PORT exists in image-studio.tokens', () => {
    expect((tokens as any).USER_PRESET_STORAGE_PORT).toBeDefined();
  });

  it('AC-10: a saved preset appears in presets() with the typed name and the current fields', async () => {
    const { service } = await build(makePresetPort());
    const r = service.save('My mug shot', CURRENT);
    expect(r.ok).toBe(true);
    expect(service.presets()).toHaveLength(1);
    expect(service.presets()[0]).toMatchObject({ name: 'My mug shot', ...CURRENT });
  });

  it('AC-10 (survives a reload): a second service created over the same storage shows the saved preset with the same id, name and fields', async () => {
    const port = makePresetPort();
    const first = await build(port);
    first.service.save('Keeps after reload', CURRENT);
    const saved = first.service.presets()[0];
    const second = await build(port);
    expect(second.service.presets()).toEqual([saved]);
  });

  it('FR-15 (c): an empty name is refused with a reason and nothing is written to storage', async () => {
    const port = makePresetPort();
    const { service } = await build(port);
    const r = service.save('   ', CURRENT);
    expect(r.ok).toBe(false);
    expect(typeof r.reason).toBe('string');
    expect(port.state.saveCalls).toBe(0);
    expect(service.presets()).toEqual([]);
  });

  it('FR-15 (c): saving a second preset under an existing name does not replace the first', async () => {
    const { service } = await build(makePresetPort());
    service.save('Same', CURRENT);
    const first = service.presets()[0];
    const r = service.save('Same', { ...CURRENT, prompt: 'different prompt' });
    expect(r.ok).toBe(false);
    expect(service.presets()).toEqual([first]);
  });

  it('two saves at the same clock instant get different ids', async () => {
    const { service } = await build(makePresetPort());
    service.save('one', CURRENT);
    service.save('two', CURRENT);
    const ids = service.presets().map((p: any) => p.id);
    expect(new Set(ids).size).toBe(2);
  });
});

describe('UserPresetsService: delete (T18, AC-10a, FR-16)', () => {
  it('AC-10a: remove() takes the preset out of presets() and out of storage, so it is gone after a reload', async () => {
    const port = makePresetPort();
    const first = await build(port);
    first.service.save('Doomed', CURRENT);
    first.service.save('Survivor', CURRENT);
    const doomed = first.service.presets().find((p: any) => p.name === 'Doomed');
    expect(first.service.remove(doomed.id)).toEqual({ ok: true });
    expect(first.service.presets().map((p: any) => p.name)).toEqual(['Survivor']);
    const reloaded = await build(port);
    expect(reloaded.service.presets().map((p: any) => p.name)).toEqual(['Survivor']);
  });

  it('FR-16 failure path: if removing from storage fails, the preset is NOT shown as deleted and the failure is reported', async () => {
    const port = makePresetPort();
    const { service } = await build(port);
    service.save('Stays', CURRENT);
    const id = service.presets()[0].id;
    port.state.failSaves = true;
    expect(service.remove(id).ok).toBe(false);
    expect(service.presets().map((p: any) => p.id)).toEqual([id]);
  });
});

describe('UserPresetsService: storage that is unavailable, full or corrupt (T18, FR-15 (d))', () => {
  it('FR-15 (d): when storage cannot be read, presets() is empty and the service still works for the session', async () => {
    const port = makePresetPort({ ok: false });
    const { service } = await build(port);
    expect(service.presets()).toEqual([]);
    port.state.stored = { ok: true, presets: [] };
    expect(service.save('Works anyway', CURRENT).ok).toBe(true);
    expect(service.presets()).toHaveLength(1);
  });

  it('FR-15 (d): data that does not parse is ignored, not partly applied, and merely loading it writes nothing (it is not deleted)', async () => {
    const good = { id: 'user-aaa', name: 'good', ...CURRENT };
    const port = makePresetPort({ ok: true, presets: [good, { id: 7 }] });
    const { service } = await build(port);
    expect(service.presets()).toEqual([]);
    expect(port.state.saveCalls).toBe(0);
    expect(port.state.stored).toEqual({ ok: true, presets: [good, { id: 7 }] });
  });

  it('FR-15 (d): a save that cannot be stored reports it was not saved and the preset is not shown', async () => {
    const port = makePresetPort();
    port.state.failSaves = true;
    const { service } = await build(port);
    const r = service.save('Quota exceeded', CURRENT);
    expect(r.ok).toBe(false);
    expect(typeof r.reason).toBe('string');
    expect(service.presets()).toEqual([]);
  });
});

describe('UserPresetsService: registry presets are unaffected (T18, FR-17, AC-11)', () => {
  it('saving, failing to save and deleting never add, remove or change a registry preset, and presets() never contains one', async () => {
    const before = structuredClone(PROMPT_PRESETS);
    const port = makePresetPort();
    const { service } = await build(port);
    service.save('Mine', CURRENT);
    port.state.failSaves = true;
    service.save('Cannot store', CURRENT);
    port.state.failSaves = false;
    service.remove(service.presets()[0].id);
    expect(PROMPT_PRESETS).toEqual(before);
    const registryIds = PROMPT_PRESETS.map((p) => p.id);
    for (const p of service.presets()) expect(registryIds).not.toContain(p.id);
  });
});

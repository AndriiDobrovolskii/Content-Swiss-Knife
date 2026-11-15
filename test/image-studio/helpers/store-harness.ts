/**
 * Store harness for the US-10.6 store specs (image-studio.store.batch.spec.ts, image-studio.store.derived.spec.ts).
 *
 * A NEW logic-only helper, added so the shared `fakes.ts`, `service-setup.ts` and `studio-render.ts` (about 30 existing specs, and the component
 * runner compiles the last one) are not edited. It mirrors `setup()` of image-studio.store.generation.spec.ts: the real ImageStudioStore on
 * `Injector.create` with test doubles for every port token and a stub `LlmService`. `@angular/compiler` MUST be imported first by the spec that
 * imports this file (the specs do), and every not-yet-existing symbol is reached through `import()` so a missing module is one named failure.
 */
import { vi } from 'vitest';
import { Injector } from '@angular/core';
import { LlmService } from '../../../src/services/llm.service';
import {
  makeFakeClock, makeFakeScheduler, makeIdSource, makeInMemorySessionStore, makeAlertPort, makeConfirmPort, makeClipboardPort, makeSavePort, makeFakeCodec,
  type StoredSession,
} from './fakes';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
export const DAY = 86_400_000;

export async function setupStore(opts: { seed?: StoredSession[] } = {}) {
  const tokens = await load('../../../src/services/image-studio/image-studio.tokens');
  const { ImageStudioStore } = await load('../../../src/services/image-studio/image-studio.store');
  const clock = makeFakeClock(100 * DAY);
  const scheduler = makeFakeScheduler(clock);
  const port = makeInMemorySessionStore();
  const llm = { generateImage: vi.fn(), uploadImageFile: vi.fn() };
  for (const s of opts.seed ?? []) port.seed(s);
  const background = { flattenToWhite: vi.fn(async (bytes: Uint8Array) => ({ bytes, mime: 'image/png' })) };
  const providers = [
    { provide: tokens.CLOCK_PORT, useValue: clock },
    { provide: tokens.SCHEDULER_PORT, useValue: scheduler },
    { provide: tokens.ID_SOURCE_PORT, useValue: makeIdSource('gen') },
    { provide: tokens.SESSION_STORE_PORT, useValue: port },
    { provide: tokens.IMAGE_CODEC_PORT, useValue: makeFakeCodec() },
    { provide: tokens.IMAGE_BACKGROUND_PORT, useValue: background },
    { provide: tokens.ALERT_PORT, useValue: makeAlertPort() },
    { provide: tokens.CONFIRM_PORT, useValue: makeConfirmPort(true) },
    { provide: tokens.CLIPBOARD_PORT, useValue: makeClipboardPort() },
    { provide: tokens.SAVE_PORT, useValue: makeSavePort() },
    { provide: LlmService, useValue: llm },
    { provide: ImageStudioStore, useClass: ImageStudioStore },
  ];
  const injector = Injector.create({ providers });
  const store: any = injector.get(ImageStudioStore);
  await store.init();
  return { store, llm, clock, port, background };
}

/** A session aged 1 s at the fake clock, so the 7-day expiry at load keeps it. */
export function activeSession(session: StoredSession): StoredSession {
  session.meta.createdAt = 100 * DAY - 1_000;
  session.meta.lastActivity = 100 * DAY - 1_000;
  return session;
}

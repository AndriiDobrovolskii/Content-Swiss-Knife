/**
 * US-10.5 logic-runner harness for the two container-scoped services (`StudioMediaService`, `StudioDeliveryService`).
 *
 * Same pattern as the store specs: `Injector.create` with the DI tokens bound to the fakes of `fakes.ts` (NOT TestBed), the real root
 * `ImageStudioStore` over the in-memory session store, `LlmService` replaced by a stub (the network boundary). The services under test
 * are real. Every module of the system under test is loaded dynamically, so this helper has no static dependency on a module that a
 * later task creates and is never on the type-check red list (its type owner: none).
 */
import '@angular/compiler';
import { vi } from 'vitest';
import { Injector } from '@angular/core';
import { LlmService } from '../../../src/services/llm.service';
import {
  makeFakeClock, makeFakeScheduler, makeIdSource, makeInMemorySessionStore, makeAlertPort, makeConfirmPort, makeClipboardPort,
  makeSavePort, makeFakeCodec, makeFakeLocalOffset, makeFakeArchiveBuilder,
  type StoredSession, type FakeCodecOptions,
} from './fakes';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);

/** 2026-11-08 18:15:30 UTC: the instant of the Story's archive-name example. */
export const NOW = Date.UTC(2026, 10, 8, 18, 15, 30);

/** Re-stamps a fixture session so it is "active now" for the fake clock (otherwise the 7-day expiry at load deletes it). */
export function activeNow<T extends StoredSession>(session: T): T {
  session.meta.createdAt = NOW;
  session.meta.lastActivity = NOW;
  return session;
}

export async function setupStudioServices(opts: { seed?: StoredSession[]; codec?: FakeCodecOptions } = {}) {
  const tokens = await load('../../../src/services/image-studio/image-studio.tokens');
  const { ImageStudioStore } = await load('../../../src/services/image-studio/image-studio.store');
  const { StudioMediaService } = await load('../../../src/services/image-studio/studio-media.service');
  const { StudioDeliveryService } = await load('../../../src/services/image-studio/studio-delivery.service');
  const { buildZip } = await load('../../../src/utils/image-studio/zip');

  const clock = makeFakeClock(NOW);
  const scheduler = makeFakeScheduler(clock);
  const port = makeInMemorySessionStore();
  const alerts = makeAlertPort();
  const clipboard = makeClipboardPort();
  const save = makeSavePort();
  const codec = makeFakeCodec(opts.codec);
  const offset = makeFakeLocalOffset(0);
  const archive = makeFakeArchiveBuilder(buildZip);
  const llm = { generateImage: vi.fn(), uploadImageFile: vi.fn() };
  for (const s of opts.seed ?? []) port.seed(s);

  const injector = Injector.create({
    providers: [
      { provide: tokens.CLOCK_PORT, useValue: clock },
      { provide: tokens.SCHEDULER_PORT, useValue: scheduler },
      { provide: tokens.ID_SOURCE_PORT, useValue: makeIdSource('svc') },
      { provide: tokens.SESSION_STORE_PORT, useValue: port },
      { provide: tokens.IMAGE_CODEC_PORT, useValue: codec },
      { provide: tokens.ALERT_PORT, useValue: alerts },
      { provide: tokens.CONFIRM_PORT, useValue: makeConfirmPort(true) },
      { provide: tokens.CLIPBOARD_PORT, useValue: clipboard },
      { provide: tokens.SAVE_PORT, useValue: save },
      { provide: tokens.LOCAL_OFFSET_PORT, useValue: offset },
      { provide: tokens.ARCHIVE_BUILDER_PORT, useValue: archive.build },
      { provide: LlmService, useValue: llm },
      { provide: ImageStudioStore, useClass: ImageStudioStore },
      { provide: StudioMediaService, useClass: StudioMediaService },
      { provide: StudioDeliveryService, useClass: StudioDeliveryService },
    ],
  });
  const store: any = injector.get(ImageStudioStore);
  await store.init();
  return {
    store,
    media: injector.get(StudioMediaService) as any,
    delivery: injector.get(StudioDeliveryService) as any,
    clock, port, alerts, clipboard, save, codec, offset, archive, llm,
  };
}

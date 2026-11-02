import { InjectionToken } from '@angular/core';
import type {
  AlertPort, ClipboardPort, Clock, ConfirmPort, IdSource, ImageCodec, SavePort, Scheduler, SessionStorePort,
} from '../../utils/image-studio/ports';
import {
  createBrowserAlertPort, createBrowserClipboardPort, createBrowserClock, createBrowserConfirmPort,
  createBrowserIdSource, createBrowserSavePort, createBrowserScheduler,
} from './browser-ports';

/**
 * Injection tokens for the Image Studio ports (US-10.1 DD-15, NFR-14). The ports whose real adapter is a one-line
 * browser delegation carry a root factory default, so the production app needs no provider list; tests provide
 * in-memory fakes through the same tokens. The session store and the image codec have no default here: their
 * adapters are bound where the root store is defined.
 *
 * The UI language is not a token: it is the `lang` input of the studio components, handed to the store.
 */
export const CLOCK_PORT = new InjectionToken<Clock>('IMAGE_STUDIO_CLOCK', {
  providedIn: 'root',
  factory: () => createBrowserClock(),
});

export const SCHEDULER_PORT = new InjectionToken<Scheduler>('IMAGE_STUDIO_SCHEDULER', {
  providedIn: 'root',
  factory: () => createBrowserScheduler(),
});

export const ID_SOURCE_PORT = new InjectionToken<IdSource>('IMAGE_STUDIO_ID_SOURCE', {
  providedIn: 'root',
  factory: () => createBrowserIdSource(),
});

export const ALERT_PORT = new InjectionToken<AlertPort>('IMAGE_STUDIO_ALERT', {
  providedIn: 'root',
  factory: () => createBrowserAlertPort(),
});

export const CONFIRM_PORT = new InjectionToken<ConfirmPort>('IMAGE_STUDIO_CONFIRM', {
  providedIn: 'root',
  factory: () => createBrowserConfirmPort(),
});

export const CLIPBOARD_PORT = new InjectionToken<ClipboardPort>('IMAGE_STUDIO_CLIPBOARD', {
  providedIn: 'root',
  factory: () => createBrowserClipboardPort(),
});

export const SAVE_PORT = new InjectionToken<SavePort>('IMAGE_STUDIO_SAVE', {
  providedIn: 'root',
  factory: () => createBrowserSavePort(),
});

/** The persistence port. No default here; the IndexedDB adapter is bound with the root store. */
export const SESSION_STORE_PORT = new InjectionToken<SessionStorePort>('IMAGE_STUDIO_SESSION_STORE');

/** The image codec port. No default here; the canvas codec is bound with the root store. */
export const IMAGE_CODEC_PORT = new InjectionToken<ImageCodec>('IMAGE_STUDIO_IMAGE_CODEC');

import saveAs from 'file-saver';
import type { AlertPort, ClipboardPort, Clock, ConfirmPort, IdSource, SavePort, Scheduler } from '../../utils/image-studio/ports';

/**
 * The thin browser implementations of the Image Studio ports (US-10.1 DD-15, NFR-14). Each adapter is a one-statement
 * delegation to the named browser API and carries no decision; every browser global is touched only inside a
 * function, never at module load, so importing this module is safe in the logic runner. The logic that uses these
 * ports is tested against the in-memory fakes.
 */

export function createBrowserClock(): Clock {
  return { now: () => Date.now() };
}

export function createBrowserScheduler(): Scheduler {
  return {
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (handle) => window.clearTimeout(handle as number),
  };
}

/** Turn and session ids (SD-20): a random UUID, with a time-and-random fallback outside a secure context. */
export function createBrowserIdSource(): IdSource {
  return {
    next: () =>
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`,
  };
}

export function createBrowserAlertPort(): AlertPort {
  return { alert: (message) => window.alert(message) };
}

export function createBrowserConfirmPort(): ConfirmPort {
  return { confirm: (message) => window.confirm(message) };
}

export function createBrowserClipboardPort(): ClipboardPort {
  return {
    writePng: (bytes) =>
      navigator.clipboard.write([new ClipboardItem({ 'image/png': new Blob([bytes as BlobPart], { type: 'image/png' }) })]),
  };
}

export function createBrowserSavePort(): SavePort {
  return { save: (bytes, mimeType, fileName) => saveAs(new Blob([bytes as BlobPart], { type: mimeType }), fileName) };
}

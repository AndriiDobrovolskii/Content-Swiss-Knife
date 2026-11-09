/**
 * US-10.5 shared session fixtures (moved out of `studio-version-strip.component.spec.ts` per plan DD-17 / D-7, and extended).
 *
 * Imports ONLY `./fakes` (type owner: none, clean from the start), so a spec that imports this file never reaches a
 * helper whose type owner is a later task (R-S2 import-closure requirement of the task breakdown).
 */
import {
  makeSession, makeRaster, inlineImagePart, filePart, textPart, turn, toBase64,
  type RasterFormat, type ImageMime, type StoredSession, type Turn, type Version,
} from './fakes';

export const MIME_OF: Record<RasterFormat, ImageMime> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

export interface SessionSpec { api: RasterFormat; input?: ImageMime; ratio?: string }

/** A session `s1` whose model turns hold the given API formats; returns the exact API bytes per version. */
export function sessionOf(specs: SessionSpec[]): { session: StoredSession; api: Uint8Array[] } {
  const session = makeSession('s1', { pairs: specs.length });
  const api: Uint8Array[] = [];
  specs.forEach((s, i) => {
    const bytes = makeRaster({ format: s.api, width: 40, height: 30, size: 300 + i });
    api.push(bytes);
    session.turns[i * 2 + 1].parts[0] = inlineImagePart(MIME_OF[s.api], toBase64(bytes), { thoughtSignature: `sig-${i + 1}` });
    session.meta.versions[i].inputFormat = s.input ?? MIME_OF[s.api];
    session.meta.versions[i].aspectRatio = s.ratio ?? '1:1';
  });
  return { session, api };
}

export const bytesEqual = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Merge display metadata (cost, durationMs, presetId, inputRefs) onto the model turn `turnId` of a session (returns the session). */
export function withTurnExtras(session: StoredSession, turnId: string, extras: Partial<Pick<Turn, 'cost' | 'durationMs' | 'presetId' | 'inputRefs'>> & Record<string, unknown>): StoredSession {
  const t = session.turns.find((x) => x.id === turnId);
  if (!t) throw new Error(`fixture: no turn ${turnId}`);
  Object.assign(t, extras);
  return session;
}

/** Merge fields onto the version numbered `n` (returns the session). */
export function withVersionFields(session: StoredSession, n: number, fields: Partial<Version> & Record<string, unknown>): StoredSession {
  const v = session.meta.versions.find((x) => x.number === n);
  if (!v) throw new Error(`fixture: no version ${n}`);
  Object.assign(v, fields);
  return session;
}

/**
 * A generation whose model turn returns FIRST-TEXT, image, SECOND-TEXT, image (API order) and a thought part that must
 * never be shown. Two versions v1, v2 on model turn `m1`; user turn `u1` carries the prompt text and one uploaded file.
 */
export function mixedTextImageSession(prompt = 'order check'): StoredSession {
  const img = (n: number) => inlineImagePart('image/png', toBase64(makeRaster({ format: 'png', width: 8, height: 8, size: 100 + n })));
  const s = makeSession('s1');
  s.turns = [
    turn('u1', 'user', textPart(prompt), filePart('files/in-1')),
    turn('m1', 'model', textPart('FIRST-TEXT'), img(1), textPart('hidden thought', { thought: true }), textPart('SECOND-TEXT'), img(2)),
  ];
  s.meta.turnOrder = ['u1', 'm1'];
  s.meta.nextVersionNumber = 3;
  s.meta.versions = [
    { number: 1, turnId: 'm1', partIndex: 1, model: 'gemini-3.1-flash-image', resolution: '1K', aspectRatio: '1:1', prompt, inputFormat: 'image/png', downloaded: false },
    { number: 2, turnId: 'm1', partIndex: 4, model: 'gemini-3.1-flash-image', resolution: '1K', aspectRatio: '1:1', prompt, inputFormat: 'image/png', downloaded: false },
  ];
  return s;
}

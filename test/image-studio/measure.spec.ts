// @vitest-environment node
/**
 * measure.spec.ts - US-10.1 T11 (FR-39, FR-53): the 18 MB measure.
 *
 * Specification "Size units" fixes the measure (OD-27 C-27.1): each INLINE image counts as its base64 TEXT length, each
 * `file_uri` part counts as ONLY its own serialized part (a few hundred bytes, never the size of the file it names), and
 * text counts as its UTF-8 length. The measure bounds the inline data the BFF would send to Gemini.
 *
 * PINNED CONTRACT (server/image-studio/measure.js, ESM):
 *   export function measurePart(part): number                 // bytes of ONE part
 *   export function measureTurn(turn): number                  // sum of its parts
 *   export function measureRequest(history, newTurn): number   // sum of every turn of the history + the new turn
 * The JSON envelope and field names are NOT part of the measure (they are the 1 MiB headroom H of FR-53 / SD-11).
 *
 * NOT asserted: the vendor's own measuring convention (decoded vs encoded bytes) - that is check V-6, not a gate test.
 */
import { describe, it, expect } from 'vitest';
import { filePart, inlineImagePart, textPart, turn } from './helpers/fakes';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const MODULE = '../../server/image-studio/measure.js';
const utf8 = (s: string) => new TextEncoder().encode(s).length;

describe('measure.js - the 18 MB measure', () => {
  it('FR-39: an inline image part counts as the length of its base64 text, whatever its MIME type', async () => {
    const m = await load(MODULE);
    const data = 'A'.repeat(1234);
    expect(m.measurePart(inlineImagePart('image/png', data))).toBe(1234);
    expect(m.measurePart(inlineImagePart('image/webp', data))).toBe(1234);
  });

  it('FR-39: a text part counts as its UTF-8 byte length (multi-byte characters weigh more than one byte)', async () => {
    const m = await load(MODULE);
    expect(m.measurePart(textPart('abc'))).toBe(3);
    const ukrainian = 'Білий фон';
    expect(m.measurePart(textPart(ukrainian))).toBe(utf8(ukrainian));
    expect(utf8(ukrainian)).toBeGreaterThan(ukrainian.length);
  });

  it('FR-39 / FR-53: a file_uri part counts as only its own serialized part - a few hundred bytes - not the file it names', async () => {
    const m = await load(MODULE);
    const part = filePart('https://generativelanguage.googleapis.com/v1beta/files/abc123', 'image/png');
    expect(m.measurePart(part)).toBe(utf8(JSON.stringify(part)));
    expect(m.measurePart(part)).toBeLessThan(500);
  });

  it('FR-39: a turn weighs the sum of its parts and keeps a thought part (unmodified turns are resent) in the sum', async () => {
    const m = await load(MODULE);
    const t = turn('m1', 'model', textPart('hello'), inlineImagePart('image/png', 'B'.repeat(100), { thoughtSignature: 'sig' }), inlineImagePart('image/png', 'C'.repeat(50), { thought: true }));
    expect(m.measureTurn(t)).toBe(5 + 100 + 50);
  });

  it('FR-39: a request weighs the whole history plus the new user turn (the new turn counts toward every size)', async () => {
    const m = await load(MODULE);
    const history = [
      turn('u1', 'user', textPart('make it white'), filePart('files/1')),
      turn('m1', 'model', inlineImagePart('image/png', 'D'.repeat(1000))),
    ];
    const newTurn = turn('u2', 'user', textPart('softer shadow'), inlineImagePart('image/png', 'E'.repeat(400)));
    const expected = m.measureTurn(history[0]) + 1000 + m.measureTurn(newTurn);
    expect(m.measureRequest(history, newTurn)).toBe(expected);
    expect(m.measureRequest([], newTurn)).toBe(m.measureTurn(newTurn));
  });

  it('FR-53: five file_uri originals weigh only their references, so the measure bounds inline data, not originals', async () => {
    const m = await load(MODULE);
    const history = [turn('u1', 'user', ...Array.from({ length: 5 }, (_, i) => filePart(`files/${i}`)))];
    expect(m.measureRequest(history, turn('u2', 'user', textPart('x')))).toBeLessThan(5 * 500 + 10);
  });
});

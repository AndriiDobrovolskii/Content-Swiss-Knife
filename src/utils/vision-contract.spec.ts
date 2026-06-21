/**
 * vision-contract.spec.ts
 *
 * Regression guard for src/utils/vision-contract.ts — the client-side parser
 * that enforces the Vision pre-pass JSON output contract (PR1). If the parser
 * silently accepts malformed output, a wrong/over-long caption could reach the
 * image manifest and the public page.
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { parseVisionResult } from './vision-contract';

describe('parseVisionResult', () => {
  it('parses valid JSON into a caption-only result', () => {
    const raw = JSON.stringify({
      caption: 'Blue laser engraver with gantry rails and controller box',
    });
    expect(parseVisionResult(raw)).toEqual({
      caption: 'Blue laser engraver with gantry rails and controller box',
    });
  });

  it('ignores extra fields the model may still emit', () => {
    const raw = JSON.stringify({
      caption: 'Compact desktop machine with a moving laser head',
      consistent: 'yes',
      observed: 'laser engraver',
    });
    expect(parseVisionResult(raw)).toEqual({
      caption: 'Compact desktop machine with a moving laser head',
    });
  });

  it('strips ```json code fences before parsing', () => {
    const raw = '```json\n{"caption":"Black resin 3D printer with build plate"}\n```';
    expect(parseVisionResult(raw)).toEqual({
      caption: 'Black resin 3D printer with build plate',
    });
  });

  it('strips bare ``` fences before parsing', () => {
    const raw = '```\n{"caption":"Handheld 3D scanner with blue sensor array"}\n```';
    expect(parseVisionResult(raw).caption).toBe('Handheld 3D scanner with blue sensor array');
  });

  it('throws on missing caption', () => {
    expect(() => parseVisionResult(JSON.stringify({ foo: 'bar' }))).toThrow();
  });

  it('throws on empty caption', () => {
    expect(() => parseVisionResult(JSON.stringify({ caption: '   ' }))).toThrow();
  });

  it('throws on over-length caption (> 20 words)', () => {
    const caption = Array.from({ length: 21 }, () => 'word').join(' ');
    expect(() => parseVisionResult(JSON.stringify({ caption }))).toThrow();
  });

  it('throws on non-JSON garbage', () => {
    expect(() => parseVisionResult('this is not json at all')).toThrow();
  });

  it('throws on a JSON array (not an object)', () => {
    expect(() => parseVisionResult('[1,2,3]')).toThrow();
  });
});

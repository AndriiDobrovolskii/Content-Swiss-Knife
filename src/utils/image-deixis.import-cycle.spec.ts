/**
 * image-deixis.import-cycle.spec.ts - US-9.1 T26 / NFR-7: load-order smoke guard for the new detector module.
 *
 * `image-deixis.ts` is a leaf (type imports only) so that BOTH `output-validator.ts` (FROZEN, T26 adds the call)
 * and `image-placeholder.ts` (T4 adds the figcaption check) can import it without a runtime cycle. A runtime
 * cycle shows up as an `undefined` binding at load time, in whichever order the modules are first imported, so
 * both orders are loaded here, each in a fresh module registry (the pattern of `task-a.import-cycle.spec.ts`).
 *
 * Asserts only that every export is defined and callable, plus one real call per module. RED BY LOAD until T2
 * creates `image-deixis.ts`; it must stay green after T4 and T26.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => { vi.resetModules(); });

describe('image-deixis.ts <-> output-validator.ts <-> image-placeholder.ts load order (no runtime import cycle)', () => {
  it('detector first, then the validator, then the placeholder module: every export is defined and usable', async () => {
    const deixis = await import('./image-deixis');
    const validator = await import('./output-validator');
    const placeholder = await import('./image-placeholder');
    expect(typeof deixis.findImageDeixis).toBe('function');
    expect(typeof deixis.collectFigureDeixis).toBe('function');
    expect(typeof deixis.imageDeixisIssues).toBe('function');
    expect(typeof validator.validateGeneratedHtml).toBe('function');
    expect(typeof placeholder.figureCaptionWarnings).toBe('function');
    expect(deixis.findImageDeixis('Нижче розміщено відео з оглядом пристрою.', 'uk-UA')).not.toBeNull();
    expect(validator.validateGeneratedHtml('<p>Текст.</p>', 'ctx', undefined, 'uk-UA')).toBeInstanceOf(Array);
    expect(placeholder.figureCaptionWarnings([])).toEqual([]);
  });

  it('placeholder module first, then the validator, then the detector: every export is defined and usable', async () => {
    const placeholder = await import('./image-placeholder');
    const validator = await import('./output-validator');
    const deixis = await import('./image-deixis');
    expect(typeof placeholder.figureCaptionWarnings).toBe('function');
    expect(typeof validator.validateGeneratedHtml).toBe('function');
    expect(typeof deixis.findImageDeixis).toBe('function');
    expect(deixis.findImageDeixis('Режим працює від -10 °C.', 'uk-UA')).toBeNull();
    expect(validator.validateGeneratedHtml('<p>Текст.</p>', 'ctx', undefined, 'uk-UA')).toBeInstanceOf(Array);
  });

  it('the validator first, then the detector: the detector\'s type-only import of the validator leaves no runtime edge', async () => {
    const validator = await import('./output-validator');
    const deixis = await import('./image-deixis');
    expect(typeof validator.validateGeneratedHtml).toBe('function');
    expect(typeof deixis.imageDeixisIssues).toBe('function');
    const doc = new DOMParser().parseFromString('<p>Нижче розміщено відео.</p><figure><img src="a.jpg" alt="a"></figure>', 'text/html');
    expect(deixis.imageDeixisIssues(doc, 'uk-UA', 'ctx')).toHaveLength(1);
  });
});

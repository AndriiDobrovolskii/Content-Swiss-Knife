/**
 * task-a.import-cycle.spec.ts
 *
 * US-5.1 T13 — load-smoke guard for the import cycle risk (plan D3, Risk 15). The approved edit of the
 * FROZEN task-a.ts makes it import `preExtractPlaceholders` (from the leaf `utils/image-placeholder`),
 * while `utils/image-placeholder-validate` re-exports it and pulls a wider graph. A runtime cycle
 * between these modules shows up as an `undefined` binding at load time, in whichever order they are
 * first imported, so both orders are loaded here, each in a fresh module registry.
 *
 * Asserts exports are defined and callable only; no marker behaviour (that is T11). Green on arrival,
 * and it must stay green after T14 and T15.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

describe('task-a.ts <-> image-placeholder-validate.ts load order (no runtime import cycle)', () => {
  it('task-a first, then image-placeholder-validate: every export is defined', async () => {
    const taskA = await import('./task-a');
    const validate = await import('../utils/image-placeholder-validate');
    const taskADoc = await import('./task-a-doc');
    expect(typeof taskA.buildPromptA).toBe('function');
    expect(typeof taskADoc.buildPromptADoc).toBe('function');
    expect(typeof validate.preExtractPlaceholders).toBe('function');
    expect(typeof validate.validateDroppedPlaceholders).toBe('function');
    expect(typeof validate.finalizeDroppedPlaceholdersDoc).toBe('function');
    expect(typeof validate.finalizeDroppedPlaceholdersHtml).toBe('function');
  });

  it('image-placeholder-validate first, then task-a: every export is defined', async () => {
    const validate = await import('../utils/image-placeholder-validate');
    const taskA = await import('./task-a');
    const taskADoc = await import('./task-a-doc');
    expect(typeof validate.preExtractPlaceholders).toBe('function');
    expect(typeof validate.validateDroppedPlaceholders).toBe('function');
    expect(typeof validate.finalizeDroppedPlaceholdersDoc).toBe('function');
    expect(typeof validate.finalizeDroppedPlaceholdersHtml).toBe('function');
    expect(typeof taskA.buildPromptA).toBe('function');
    expect(typeof taskADoc.buildPromptADoc).toBe('function');
  });

  it('the functions are usable straight after either load order, not merely defined', async () => {
    const validate = await import('../utils/image-placeholder-validate');
    expect(validate.preExtractPlaceholders('no marker here', [])).toEqual([]);
    const taskA = await import('./task-a');
    const payload = taskA.buildPromptA({
      website: { name: '3DPrinter', group: 'UA', url: '' }, name: 'Test Printer', description: 'Plain.', specs: '',
    } as Parameters<typeof taskA.buildPromptA>[0]);
    expect(payload.systemBlocks.length).toBeGreaterThanOrEqual(2);
    expect(payload.userContent).toContain('[Raw Description]: Plain.');
  });
});

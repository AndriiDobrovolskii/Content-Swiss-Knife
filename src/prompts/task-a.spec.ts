/**
 * task-a.spec.ts
 *
 * Store-scoping guard for the Tone-of-Voice system blocks in buildPromptA (src/prompts/task-a.ts).
 *
 * Both ToV overlays (EXPERT3D, Center 3D Print) are APPENDED after the master + task instruction,
 * never merged into them. That is what keeps the shared cached prefix byte-stable for every other
 * store — so these tests assert both halves: the right store gets its extra block, and everyone
 * else's block sequence is unchanged.
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { buildPromptA } from './task-a';
import { MASTER_SYSTEM_PROMPT } from '../prompt-core/master-system-prompt';
import { EXPERT3D_TOV_BASE_OVERLAY, C3D_TOV_BASE_OVERLAY, STORE_REGISTRY } from '../prompt-core/constants';
import type { ProductInput, WebsiteGroup } from '../app/types';

function inputFor(storeName: string): ProductInput {
  return {
    website: { name: storeName, group: STORE_REGISTRY[storeName].group as WebsiteGroup, url: '' },
    name: 'Formlabs Fuse X1',
    description: 'An SLS 3D printer.',
    specs: 'Build volume | 330 × 330 × 565 mm',
  };
}

const NEUTRAL_STORES = ['3DDevice', '3DPrinter', '3DScanner', 'Drukarka 3D', 'Expert-3DPrinter'];

describe('buildPromptA — ToV system-block scoping', () => {
  it('Center 3D Print gets a third cached block carrying the Style B overlay', () => {
    const { systemBlocks } = buildPromptA(inputFor('Center 3D Print'));
    expect(systemBlocks).toHaveLength(3);
    expect(systemBlocks[2].text).toBe(C3D_TOV_BASE_OVERLAY);
    expect(systemBlocks[2].cache).toBe(true);
  });

  it('EXPERT3D still gets its own overlay, unchanged, and none of the C3D text', () => {
    const { systemBlocks } = buildPromptA(inputFor('EXPERT3D'));
    expect(systemBlocks).toHaveLength(3);
    expect(systemBlocks[2].text).toBe(EXPERT3D_TOV_BASE_OVERLAY);
    expect(systemBlocks.map(b => b.text).join()).not.toContain(C3D_TOV_BASE_OVERLAY);
  });

  it('Impresora-3D (the other ES-group store) also keeps the EXPERT3D overlay only', () => {
    const { systemBlocks } = buildPromptA(inputFor('Impresora-3D'));
    expect(systemBlocks[2].text).toBe(EXPERT3D_TOV_BASE_OVERLAY);
  });

  it('only Center 3D Print sees the §4 verb-led-<ul> override', () => {
    for (const store of Object.keys(STORE_REGISTRY)) {
      const joined = buildPromptA(inputFor(store)).systemBlocks.map(b => b.text).join('\n');
      expect(joined.includes('[ ] Applications is a verb-led <ul>'), store)
        .toBe(store === 'Center 3D Print');
    }
  });

  it('Drukarka 3D shares group EU with C3D but gets NO ToV block — the leak this guards against', () => {
    const { systemBlocks } = buildPromptA(inputFor('Drukarka 3D'));
    expect(systemBlocks).toHaveLength(2);
    expect(systemBlocks.map(b => b.text).join()).not.toContain(C3D_TOV_BASE_OVERLAY);
  });

  it('every other store keeps exactly two system blocks, with no ToV text at all', () => {
    for (const store of NEUTRAL_STORES) {
      const { systemBlocks } = buildPromptA(inputFor(store));
      const joined = systemBlocks.map(b => b.text).join();
      expect(systemBlocks, store).toHaveLength(2);
      expect(joined, store).not.toContain(C3D_TOV_BASE_OVERLAY);
      expect(joined, store).not.toContain(EXPERT3D_TOV_BASE_OVERLAY);
    }
  });

  /**
   * The §7 FLAT SOURCE rule lives in MASTER_SYSTEM_PROMPT, so it reaches all 8 stores. A store ToV
   * overlay is appended AFTER it and can therefore override it — which is exactly how the Center
   * 3D Print collapse happened (its heading rule out-specified the schema). This is the standing
   * cheap guard that no store's voice contradicts §7 again.
   */
  it('every store receives the §7 flat-source grouping rule', () => {
    for (const store of Object.keys(STORE_REGISTRY)) {
      const joined = buildPromptA(inputFor(store)).systemBlocks.map(b => b.text).join('\n');
      expect(joined.replace(/\s+/g, ' '), store)
        .toMatch(/do NOT emit a single catch-all category/i);
    }
  });

  it('no store ToV overlay tells the model to avoid nominal sub-headings', () => {
    for (const store of Object.keys(STORE_REGISTRY)) {
      // The overlay blocks only — the master's own §7 text legitimately discusses categories.
      const overlays = buildPromptA(inputFor(store)).systemBlocks.slice(2).map(b => b.text).join('\n');
      if (!overlays) continue;
      // A blanket "headings are never nominal" line is the exact regression: it must always be
      // scoped to section headings and paired with the <h3> exemption.
      if (/never bare noun/i.test(overlays)) {
        expect(overlays, `${store}: blanket nominal-heading ban without an <h3> carve-out`)
          .toMatch(/<h3>[\s\S]*MUST be CONCISE NOMINAL PHRASES/i);
      }
    }
  });

  it('the two cached prefix blocks are byte-identical across every store (cache stability)', () => {
    const stores = Object.keys(STORE_REGISTRY);
    const prefixes = stores.map(s => buildPromptA(inputFor(s)).systemBlocks.slice(0, 2));
    for (const [i, prefix] of prefixes.entries()) {
      expect(prefix[0].text, stores[i]).toBe(MASTER_SYSTEM_PROMPT);
      expect(prefix[1].text, stores[i]).toBe(prefixes[0][1].text);
    }
  });
});

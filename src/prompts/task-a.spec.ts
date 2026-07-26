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

  it('the two cached prefix blocks are byte-identical across every store (cache stability)', () => {
    const stores = Object.keys(STORE_REGISTRY);
    const prefixes = stores.map(s => buildPromptA(inputFor(s)).systemBlocks.slice(0, 2));
    for (const [i, prefix] of prefixes.entries()) {
      expect(prefix[0].text, stores[i]).toBe(MASTER_SYSTEM_PROMPT);
      expect(prefix[1].text, stores[i]).toBe(prefixes[0][1].text);
    }
  });
});

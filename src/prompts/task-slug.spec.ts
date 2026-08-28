import { describe, it, expect, vi } from 'vitest';
import { buildPromptSlug } from './task-slug';
import * as flagModule from '../prompt-core/slug-context-enrichment-flag';

vi.mock('../prompt-core/slug-context-enrichment-flag', () => ({
  usesSlugContextEnrichment: vi.fn(() => false),
}));

describe('buildPromptSlug — context window', () => {
  it('omits the [CONTEXT] block entirely when no context is passed', () => {
    const payload = buildPromptSlug('EXPERT3D', 'Ortur H20 20 W', ['uk-UA']);
    expect(payload.userContent).not.toContain('[CONTEXT');
  });

  it('includes the context up to 4000 characters, not the old 1000-character cap', () => {
    // Long enough that §1's hook alone would have exhausted the old 1000-char limit before the
    // killer-specs table (§2a) ever appeared — this string simulates that shape.
    const hook = 'A'.repeat(1500);
    const killerSpecsMarker = '<div data-section="killer-specs">KILLER-SPECS-TABLE</div>';
    const html = `<p>${hook}</p>${killerSpecsMarker}`;
    const payload = buildPromptSlug('EXPERT3D', 'Ortur H20 20 W', ['uk-UA'], html);
    expect(payload.userContent).toContain(killerSpecsMarker);
  });

  it('still truncates at 4000 characters, not the whole document', () => {
    const html = 'B'.repeat(5000);
    const payload = buildPromptSlug('EXPERT3D', 'Ortur H20 20 W', ['uk-UA'], html);
    const contextBlock = payload.userContent.split('[CONTEXT')[1];
    expect(contextBlock.match(/B/g)?.length).toBe(4000);
  });
});

describe('buildPromptSlug — context enrichment (Rule 9)', () => {
  it('omits the CONTEXT ENRICHMENT block for a store not on the allow-list (default: every store)', () => {
    const payload = buildPromptSlug('EXPERT3D', 'Ortur H20 20 W', ['uk-UA']);
    expect(payload.systemBlocks.length).toBe(2);
    expect(payload.systemBlocks.map(b => b.text).join('\n')).not.toContain('CONTEXT ENRICHMENT');
  });

  it('includes the CONTEXT ENRICHMENT block as its own cached system block for an allow-listed store', () => {
    vi.mocked(flagModule.usesSlugContextEnrichment).mockReturnValueOnce(true);
    const payload = buildPromptSlug('Center 3D Print', 'Revopoint MetroY Ultra', ['uk-UA']);
    expect(payload.systemBlocks.length).toBe(3);
    expect(payload.systemBlocks[2].text).toContain('CONTEXT ENRICHMENT');
    expect(payload.systemBlocks[2].cache).toBe(true);
  });

  it('leaves the base task-template block byte-identical whether or not enrichment is on', () => {
    const off = buildPromptSlug('EXPERT3D', 'Ortur H20 20 W', ['uk-UA']);
    vi.mocked(flagModule.usesSlugContextEnrichment).mockReturnValueOnce(true);
    const on = buildPromptSlug('EXPERT3D', 'Ortur H20 20 W', ['uk-UA']);
    expect(on.systemBlocks[1].text).toBe(off.systemBlocks[1].text);
  });
});

import { describe, it, expect } from 'vitest';
import { buildPromptSlug } from './task-slug';

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

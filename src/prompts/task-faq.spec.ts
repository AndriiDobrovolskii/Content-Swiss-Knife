import { describe, it, expect } from 'vitest';
import { buildPromptFaq } from './task-faq';

describe('buildPromptFaq', () => {
  const PRODUCT = 'Formlabs Fuse X1';
  const DESCRIPTION = '<p>SLS industrial printer.</p>';
  const SPECS = 'Build volume: 330 x 330 x 565 mm';
  const SUPPLEMENTAL = 'FAQ source notes about cost per part and nitrogen supply.';
  const HUMAN_LANG = 'European Portuguese';
  const CURRENCY = '€';

  it('includes LOCALE OVERLAY block when localeOverlay is provided', () => {
    const payload = buildPromptFaq(
      PRODUCT, DESCRIPTION, SPECS, SUPPLEMENTAL, HUMAN_LANG, CURRENCY,
      '[EXPERT3D ToV — EUROPEAN PORTUGUESE (pt-PT)] use "azoto" not "nitrogénio".',
    );
    expect(payload.userContent).toContain('[LOCALE OVERLAY]');
    expect(payload.userContent).toContain('use "azoto" not "nitrogénio"');
  });

  it('omits LOCALE OVERLAY block when localeOverlay is undefined', () => {
    const payload = buildPromptFaq(PRODUCT, DESCRIPTION, SPECS, SUPPLEMENTAL, HUMAN_LANG, CURRENCY);
    expect(payload.userContent).not.toContain('[LOCALE OVERLAY]');
  });

  it('omits LOCALE OVERLAY block when localeOverlay is an empty/whitespace string', () => {
    const payload = buildPromptFaq(PRODUCT, DESCRIPTION, SPECS, SUPPLEMENTAL, HUMAN_LANG, CURRENCY, '   ');
    expect(payload.userContent).not.toContain('[LOCALE OVERLAY]');
  });

  it('systemBlocks are identical regardless of localeOverlay (cache stability)', () => {
    const without = buildPromptFaq(PRODUCT, DESCRIPTION, SPECS, SUPPLEMENTAL, HUMAN_LANG, CURRENCY);
    const withOverlay = buildPromptFaq(PRODUCT, DESCRIPTION, SPECS, SUPPLEMENTAL, HUMAN_LANG, CURRENCY, 'some overlay');
    expect(without.systemBlocks[0].text).toBe(withOverlay.systemBlocks[0].text);
  });

  it('LOCALE OVERLAY block appears right after [TASK]', () => {
    const payload = buildPromptFaq(
      PRODUCT, DESCRIPTION, SPECS, SUPPLEMENTAL, HUMAN_LANG, CURRENCY, 'overlay text',
    );
    const taskIdx = payload.userContent.indexOf('[TASK]');
    const overlayIdx = payload.userContent.indexOf('[LOCALE OVERLAY]');
    const rulesIdx = payload.userContent.indexOf('[CONTENT RULES]');
    expect(overlayIdx).toBeGreaterThan(taskIdx);
    expect(overlayIdx).toBeLessThan(rulesIdx);
  });
});

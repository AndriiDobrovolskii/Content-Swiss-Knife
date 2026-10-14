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

// ── US-8.1 AC-6 / FR-6 (T2) ──────────────────────────────────────────────────────────────────────────
// "The FAQ prompt text lists <b> and does not list <strong> among the permitted answer tags."
// TABLE B spec: it imports only `buildPromptFaq`, which exists today, so it is red at RUNTIME (the
// contract still lists <strong>) and never carries a compile diagnostic. Written from the criterion,
// not from the planned edit: only the tag list may change (the cache-stability and overlay tests above
// stay as they are).
describe('buildPromptFaq — AC-6: <b> is a permitted answer tag, <strong> is not', () => {
  const build = (overlay?: string) =>
    buildPromptFaq('Formlabs Fuse X1', '<p>SLS industrial printer.</p>', 'Build volume: 330 mm', 'FAQ source notes.', 'Ukrainian', '€', overlay);
  const contractOf = (userContent: string) => {
    const start = userContent.indexOf('[OUTPUT CONTRACT');
    const end = userContent.indexOf('[CONTENT RULES]');
    return userContent.slice(start, end);
  };

  it('premise: the output-contract section is found and non-empty', () => {
    const c = contractOf(build().userContent);
    expect(c.length).toBeGreaterThan(50);
  });

  it('the output contract lists <b> among the permitted tags, with <p>, <ul> and <li>', () => {
    const c = contractOf(build().userContent);
    for (const tag of ['<p>', '<b>', '<ul>', '<li>']) expect(c, tag).toContain(tag);
  });

  it('the output contract does not list <strong>', () => {
    expect(contractOf(build().userContent)).not.toMatch(/<\/?strong\b/i);
  });

  it('no <strong> appears anywhere in the built prompt, system block or user content', () => {
    const p = build();
    const everything = `${p.systemBlocks.map(b => b.text).join('\n')}\n${p.userContent}`;
    expect(everything).not.toMatch(/<\/?strong\b/i);
  });

  it('still absent when a locale overlay is supplied', () => {
    const p = build('[EXPERT3D ToV — EUROPEAN PORTUGUESE (pt-PT)] use "azoto" not "nitrogénio".');
    expect(p.userContent).not.toMatch(/<\/?strong\b/i);
    expect(contractOf(p.userContent)).toContain('<b>');
  });
});

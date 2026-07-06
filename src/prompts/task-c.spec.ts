/**
 * task-c.spec.ts
 *
 * Regression guard for the pt-PT branch in buildPromptC (src/prompts/task-c.ts):
 * confirms the EXPERT3D_PT_INSTRUCTION is selected (not the generic fallback) and
 * that the EXPERT3D_TOV_TRANSLATION_OVERLAY is not double-appended for pt-PT.
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { buildPromptC } from './task-c';

const SAMPLE_HTML = '<p>Sample product description.</p>';

describe('buildPromptC — pt-PT (EXPERT3D)', () => {
  it('selects EXPERT3D_PT_INSTRUCTION via the "PT" task-label branch', () => {
    const payload = buildPromptC(SAMPLE_HTML, 'PT', 'EXPERT3D');
    const taskBlock = payload.systemBlocks[1].text;
    expect(taskBlock).toContain('EUROPEAN PORTUGUESE LOCALIZATION FOR EXPERT3D');
  });

  it('selects EXPERT3D_PT_INSTRUCTION via the literal "Portuguese (EXPERT3D)" label', () => {
    const payload = buildPromptC(SAMPLE_HTML, 'Portuguese (EXPERT3D)', 'EXPERT3D');
    const taskBlock = payload.systemBlocks[1].text;
    expect(taskBlock).toContain('EUROPEAN PORTUGUESE LOCALIZATION FOR EXPERT3D');
  });

  it('does not double-append EXPERT3D_TOV_TRANSLATION_OVERLAY for pt-PT (own ToV embedded already)', () => {
    const payload = buildPromptC(SAMPLE_HTML, 'PT', 'EXPERT3D');
    const taskBlock = payload.systemBlocks[1].text;
    expect(taskBlock).not.toContain('EXPERT3D ToV — TRANSLATION OVERLAY');
  });

  it('embeds the pt-PT locale ToV (register/vocabulary rules)', () => {
    const payload = buildPromptC(SAMPLE_HTML, 'PT', 'EXPERT3D');
    const taskBlock = payload.systemBlocks[1].text;
    expect(taskBlock).toContain('EXPERT3D ToV — EUROPEAN PORTUGUESE (pt-PT)');
  });

  it('falls back to generic instruction for "PT" on a non-EXPERT3D store', () => {
    const payload = buildPromptC(SAMPLE_HTML, 'PT', 'SomeOtherStore');
    const taskBlock = payload.systemBlocks[1].text;
    expect(taskBlock).not.toContain('EUROPEAN PORTUGUESE LOCALIZATION FOR EXPERT3D');
  });
});

describe('buildPromptC — image preservation manifest is conditional on figure markup', () => {
  it('omits the [IMAGE MANIFEST] block when the input has no figure/img/iframe markup', () => {
    const payload = buildPromptC('Estamos presentes en los siguientes mercados', 'Portuguese (EXPERT3D)', '');
    expect(payload.userContent).not.toContain('[IMAGE MANIFEST]');
    expect(payload.userContent).not.toContain('already contains the FINAL, approved');
  });

  it('includes the [IMAGE MANIFEST] block when the input contains a <figure> block', () => {
    const html = '<p>Lead-in.</p><figure><img src="a.jpg" alt="A"><figcaption>Caption</figcaption></figure>';
    const payload = buildPromptC(html, 'Portuguese (EXPERT3D)', '');
    expect(payload.userContent).toContain('[IMAGE MANIFEST]');
  });

  it('includes the [IMAGE MANIFEST] block when the input contains a bare <img> tag', () => {
    const html = '<p>Lead-in.</p><img src="a.jpg" alt="A">';
    const payload = buildPromptC(html, 'Portuguese (EXPERT3D)', '');
    expect(payload.userContent).toContain('[IMAGE MANIFEST]');
  });

  it('includes the [IMAGE MANIFEST] block when the input contains a bare <iframe> tag', () => {
    const html = '<p>Lead-in.</p><iframe src="https://youtube.com/embed/x"></iframe>';
    const payload = buildPromptC(html, 'Portuguese (EXPERT3D)', '');
    expect(payload.userContent).toContain('[IMAGE MANIFEST]');
  });
});

describe('buildPromptC — always supplies [Store Name] and a standalone-snippet note for figure-less input', () => {
  it('derives [Store Name] from the "(EXPERT3D)" suffix in the target-language label when storeName is empty', () => {
    const payload = buildPromptC('Estamos presentes en los siguientes mercados', 'Portuguese (EXPERT3D)', '');
    expect(payload.userContent).toContain('[Store Name]: EXPERT3D');
  });

  it('adds a [STANDALONE SNIPPET] instruction telling the model not to ask for more context, for figure-less input', () => {
    const payload = buildPromptC('Estamos presentes en los siguientes mercados', 'Portuguese (EXPERT3D)', '');
    expect(payload.userContent).toContain('[STANDALONE SNIPPET]');
    expect(payload.userContent).not.toContain('[IMAGE MANIFEST]');
  });

  it('falls back to an explicit N/A [Store Name] when neither storeName nor a "(...)" language suffix is available', () => {
    const payload = buildPromptC('Estamos presentes en los siguientes mercados', 'PT', '');
    expect(payload.userContent).toContain('[Store Name]: N/A');
  });

  it('still includes [Store Name] and [IMAGE MANIFEST] together for figure-bearing input', () => {
    const html = '<p>Lead-in.</p><figure><img src="a.jpg" alt="A"><figcaption>Caption</figcaption></figure>';
    const payload = buildPromptC(html, 'Portuguese (EXPERT3D)', '');
    expect(payload.userContent).toContain('[Store Name]: EXPERT3D');
    expect(payload.userContent).toContain('[IMAGE MANIFEST]');
  });

  it('prefers an explicit storeName argument over deriving one from the target-language label', () => {
    const payload = buildPromptC('Estamos presentes en los siguientes mercados', 'Portuguese (EXPERT3D)', 'SomeOtherStore');
    expect(payload.userContent).toContain('[Store Name]: SomeOtherStore');
  });
});

describe('buildPromptC — forbids inventing wrapping tags/links for figure-less input', () => {
  it('instructs the model not to wrap plain-text output in tags/links absent from the input (CTA-like snippet)', () => {
    const payload = buildPromptC('Перейти до каталогу', 'Portuguese (EXPERT3D)', '');
    expect(payload.userContent).toContain('Do NOT wrap the output');
  });

  it('still supplies [Store Name] and [STANDALONE SNIPPET], and omits [IMAGE MANIFEST], for the CTA-like snippet', () => {
    const payload = buildPromptC('Перейти до каталогу', 'Portuguese (EXPERT3D)', '');
    expect(payload.userContent).toContain('[Store Name]: EXPERT3D');
    expect(payload.userContent).toContain('[STANDALONE SNIPPET]');
    expect(payload.userContent).not.toContain('[IMAGE MANIFEST]');
  });

  it('does not add the no-wrapping instruction to figure-bearing input (still resolves to IMAGE_PRESERVATION_MANIFEST)', () => {
    const html = '<p>Lead-in.</p><figure><img src="a.jpg" alt="A"><figcaption>Caption</figcaption></figure>';
    const payload = buildPromptC(html, 'Portuguese (EXPERT3D)', '');
    expect(payload.userContent).not.toContain('Do NOT wrap the output');
    expect(payload.userContent).toContain('[IMAGE MANIFEST]');
  });
});

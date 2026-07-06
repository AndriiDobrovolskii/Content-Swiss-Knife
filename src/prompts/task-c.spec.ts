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

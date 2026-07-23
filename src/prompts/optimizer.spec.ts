import { describe, it, expect } from 'vitest';
import { buildOptimizerPrompt } from './optimizer';

describe('buildOptimizerPrompt', () => {
  const html = '<p>Some input HTML.</p>';

  it('userContent matches the pre-selector shape: [INPUT HTML] header + the raw input', () => {
    const payload = buildOptimizerPrompt(html);
    expect(payload.userContent).toBe(
      `[INPUT HTML] — existing description to restructure and optimize:\n${html}`,
    );
  });

  it('adds a [Product Name] line when productName is provided', () => {
    const payload = buildOptimizerPrompt(html, 'xTool F2');
    expect(payload.userContent).toBe(
      `[INPUT HTML] — existing description to restructure and optimize:\n[Product Name]: xTool F2\n${html}`,
    );
  });

  it('systemBlocks stay byte-identical across calls (still cache-stable)', () => {
    const noName = buildOptimizerPrompt(html);
    const withName = buildOptimizerPrompt(html, 'xTool F2');
    expect(withName.systemBlocks).toEqual(noName.systemBlocks);
    expect(withName.systemBlocks[0].cache).toBe(true);
    expect(withName.systemBlocks[1].cache).toBe(true);
  });

  it('the cached task instruction carries a hard OUTPUT LANGUAGE constraint', () => {
    const payload = buildOptimizerPrompt(html);
    const taskInstruction = payload.systemBlocks[1].text;
    expect(taskInstruction).toContain('OUTPUT LANGUAGE (HARD CONSTRAINT)');
    expect(taskInstruction).toContain('Write 100% of the');
    expect(taskInstruction).toContain('output in that one language');
    expect(taskInstruction).toContain('zero');
    expect(taskInstruction).toContain('language switching partway through');
  });

  it('the OUTPUT LANGUAGE constraint explicitly excludes brand/domain names as a language signal', () => {
    const payload = buildOptimizerPrompt(html);
    const taskInstruction = payload.systemBlocks[1].text;
    expect(taskInstruction).toContain('Do NOT let brand names, company names, or any URL\'s domain/path');
  });
});

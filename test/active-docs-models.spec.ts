/**
 * US-4.1 — FR-16 / AC-9: active documentation names claude-sonnet-5-5 as the example/default
 * thinking model, and no active doc names the retired claude-sonnet-4-6 as selectable or default.
 *
 * Historical references (server/utils/timeouts.js comments, spec fixtures that imitate past
 * states) are deliberately NOT scanned — FR-16 / OD-8 say they stay.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// vitest runs from the repository root (the same assumption test/render-reconciliation.spec.ts relies on).
const read = (relative: string) => readFileSync(resolve(process.cwd(), relative), 'utf8');

describe('active documentation names the new default model (FR-16)', () => {
  it('README.md shows claude-sonnet-5-5 as the ANTHROPIC_MODEL_THINKING example', () => {
    expect(read('README.md')).toMatch(/^ANTHROPIC_MODEL_THINKING=claude-sonnet-5-5(\s|$)/m);
  });

  it('.env.example sets ANTHROPIC_MODEL_THINKING to claude-sonnet-5-5', () => {
    expect(read('.env.example')).toMatch(/^ANTHROPIC_MODEL_THINKING=claude-sonnet-5-5\s*$/m);
  });

  it('.env.example no longer describes Sonnet 5 on Deep and Gemini 3.7 Flash on Fast as the defaults', () => {
    expect(read('.env.example')).not.toMatch(/Gemini 3\.7 Flash on Fast/i);
  });

  it('AGENTS.md LLM-providers row names claude-sonnet-5-5 as the Anthropic target', () => {
    const row = read('AGENTS.md').split(/\r?\n/).find(l => l.startsWith('| LLM providers'));
    expect(row, 'LLM providers row missing').toBeDefined();
    expect(row).toContain('`claude-sonnet-5-5`');
    expect(row).not.toMatch(/`claude-sonnet-5`/);
  });

  it('names claude-sonnet-4-6 in no active doc or default', () => {
    for (const file of ['README.md', '.env.example', 'AGENTS.md']) {
      expect(read(file), file).not.toContain('claude-sonnet-4-6');
    }
  });
});

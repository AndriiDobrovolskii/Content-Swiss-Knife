/**
 * image-studio-instructions.spec.ts - US-10.6 T10 (FR-13, NFR-2, AC-9; AGENTS.md section 3 Rule 3, section 7.4, section 9).
 *
 * `src/prompt-core/image-studio-instructions.ts` is the NEW non-frozen home of the Style-ref sentence. PINNED CONTRACT:
 *   export const STYLE_REF_INSTRUCTION: string     exactly the sentence quoted in AC-9
 *
 * Not asserted (deferred, SM-12): any Upscale or Variation instruction text. The owner writes and approves it before TEST_WRITING and none exists,
 * so no constant for it is pinned and none is stubbed here.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const load = (p: string): Promise<any> => import(/* @vite-ignore */ p);
const AC9 = 'Use this image purely as a stylistic reference, do not copy the product from it';
const read = (rel: string): string => readFileSync(resolve(process.cwd(), rel), 'utf8');

describe('STYLE_REF_INSTRUCTION (T10, FR-13, AC-9)', () => {
  it('AC-9: the constant is exactly the sentence of the acceptance criterion - no extra words, no trailing full stop, no translation', async () => {
    const m = await load('./image-studio-instructions');
    expect(m.STYLE_REF_INSTRUCTION).toBe(AC9);
  });

  it('NFR-2 / AGENTS.md section 9: the sentence is NOT in master-system-prompt.ts (FROZEN) nor in prompt-presets.ts (the registry presets, AC-11) [characterization]', () => {
    expect(read('src/prompt-core/master-system-prompt.ts')).not.toContain('stylistic reference');
    expect(read('src/prompt-core/prompt-presets.ts')).not.toContain('stylistic reference');
  });

  it('NFR-2 / Rule 3: no non-spec file of the Image Studio services or utils carries the sentence as a string literal [characterization]', () => {
    const roots = ['src/services/image-studio', 'src/utils/image-studio'];
    for (const root of roots) {
      for (const name of readdirSync(resolve(process.cwd(), root))) {
        if (!name.endsWith('.ts') || name.endsWith('.spec.ts')) continue;
        expect(read(join(root, name)), `${root}/${name}`).not.toContain('purely as a stylistic reference');
      }
    }
  });
});

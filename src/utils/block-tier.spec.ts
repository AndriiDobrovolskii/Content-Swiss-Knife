/**
 * block-tier.spec.ts
 *
 * RUN:  npm run test
 */

import { describe, it, expect, vi } from 'vitest';
import { createBlockRepairExecutor } from './block-tier';
import type { ValidationIssue } from './output-validator';

const HTML = '<p>Перше речення тут.</p><p>Друге речення тут, довше за перше.</p>';

const issueAt = (index: number, detail = 'Split it into two shorter sentences.'): ValidationIssue => ({
  severity: 'warning',
  rule: 'sentence-too-long',
  detail,
  context: 'HTML (base)',
  path: `block[${index}]`,
  measured: { actual: 21, limit: 20, unit: 'words' },
});

const executor = (generate: (p: unknown) => Promise<string>, onResult?: never) =>
  createBlockRepairExecutor({ generate: generate as never, languageLabel: 'Ukrainian (uk-UA)', onResult });

describe('createBlockRepairExecutor', () => {
  it('applies a patch that survives verification', async () => {
    const generate = vi.fn().mockResolvedValue('<patch block="1"><p>Друге речення. Довше за перше.</p></patch>');
    const out = await executor(generate)(HTML, [issueAt(1)]);
    expect(out).toBe('<p>Перше речення тут.</p><p>Друге речення. Довше за перше.</p>');
  });

  it('discards a patch that invented a number and leaves the block alone', async () => {
    // rejectPatch is the reason a warning is safe to spend a rewrite on: the worst case is a no-op.
    const generate = vi.fn().mockResolvedValue('<patch block="1"><p>Друге речення про 40 Вт.</p></patch>');
    expect(await executor(generate)(HTML, [issueAt(1)])).toBe(HTML);
  });

  it('discards a patch that split one block into two elements', async () => {
    const generate = vi.fn().mockResolvedValue('<patch block="1"><p>Друге.</p><p>Речення тут.</p></patch>');
    expect(await executor(generate)(HTML, [issueAt(1)])).toBe(HTML);
  });

  it('sends every finding in a block as ONE request', async () => {
    // Two patches for one block would splice against offsets the first already invalidated.
    const generate = vi.fn().mockResolvedValue('<patch block="1"><p>Друге речення тут коротше.</p></patch>');
    await executor(generate)(HTML, [issueAt(1, 'Split the sentence.'), issueAt(1, 'Replace the calque.')]);

    expect(generate).toHaveBeenCalledTimes(1);
    const { userContent } = generate.mock.calls[0][0] as { userContent: string };
    expect(userContent).toContain('Split the sentence.');
    expect(userContent).toContain('Replace the calque.');
    expect(userContent.match(/\[BLOCK block="1"\]/g)).toHaveLength(1);
  });

  it('applies the good patch and drops the bad one from the same response', async () => {
    const generate = vi.fn().mockResolvedValue(
      '<patch block="0"><p>Перше речення.</p></patch>'
      + '<patch block="1"><p>Друге про 99 Вт.</p></patch>',
    );
    const out = await executor(generate)(HTML, [issueAt(0), issueAt(1)]);
    expect(out).toBe('<p>Перше речення.</p><p>Друге речення тут, довше за перше.</p>');
  });

  it('ignores an issue that carries no path', async () => {
    const generate = vi.fn();
    const out = await executor(generate)(HTML, [{ ...issueAt(1), path: undefined }]);
    expect(generate).not.toHaveBeenCalled();
    expect(out).toBe(HTML);
  });

  it('returns the input unchanged when the model returned no patches', async () => {
    const generate = vi.fn().mockResolvedValue('Тут нічого виправляти.');
    expect(await executor(generate)(HTML, [issueAt(1)])).toBe(HTML);
  });

  it('survives a failing generate call rather than losing the artifact', async () => {
    // A repair is best-effort. Throwing here would discard an artifact already generated and paid
    // for, over a warning.
    const generate = vi.fn().mockRejectedValue(new Error('502 from provider'));
    expect(await executor(generate)(HTML, [issueAt(1)])).toBe(HTML);
  });

  it('reports what was applied and why anything was rejected', async () => {
    const onResult = vi.fn();
    const generate = vi.fn().mockResolvedValue(
      '<patch block="0"><p>Перше речення.</p></patch>'
      + '<patch block="1"><p>Друге про 99 Вт.</p></patch>',
    );
    await createBlockRepairExecutor({
      generate: generate as never, languageLabel: 'Ukrainian (uk-UA)', onResult,
    })(HTML, [issueAt(0), issueAt(1)]);

    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ applied: 1, rejected: 1 }));
    expect(onResult.mock.calls[0][0].rejections[0]).toMatch(/number/);
  });
});

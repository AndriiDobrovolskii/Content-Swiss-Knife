/**
 * doc-tier.spec.ts
 *
 * RUN:  npm run test
 */

import { describe, it, expect, vi } from 'vitest';
import { createDocBlockRepairExecutor } from './doc-tier';
import type { ValidationIssue } from './output-validator';
import type { ProductDescriptionDoc } from '../domain/description-doc';

function baseDoc(overrides: Partial<ProductDescriptionDoc> = {}): ProductDescriptionDoc {
  return {
    schemaVersion: '3.0',
    locale: 'uk-UA',
    localizedName: 'Ortur H20',
    hook: 'Коротке речення.',
    killerSpecs: [],
    keyBenefits: [],
    functionality: [{ heading: 'H', blocks: [{ kind: 'paragraph', text: 'Перше речення тут.' }] }],
    applications: { heading: 'Застосування', items: [] },
    specs: { heading: 'Технічні характеристики', categories: [] },
    cta: { heading: 'CTA', text: 'Друге речення тут, довше за перше.' },
    figures: [],
    videos: [],
    ...overrides,
  };
}

const issueAt = (path: string, detail = 'Split it into two shorter sentences.'): ValidationIssue => ({
  severity: 'warning',
  rule: 'sentence-too-long',
  detail,
  context: 'Doc (base)',
  path,
  measured: { actual: 21, limit: 20, unit: 'words' },
});

const executor = (generate: (p: unknown) => Promise<string>, opts: { onResult?: never; maxFieldsPerCall?: number } = {}) =>
  createDocBlockRepairExecutor({ generate: generate as never, languageLabel: 'Ukrainian (uk-UA)', ...opts });

describe('createDocBlockRepairExecutor', () => {
  it('applies a patch that survives verification', async () => {
    const generate = vi.fn().mockResolvedValue('<patch path="cta.text">Друге речення. Довше за перше.</patch>');
    const out = await executor(generate)(baseDoc(), [issueAt('cta.text')]);
    expect(out.cta.text).toBe('Друге речення. Довше за перше.');
  });

  it('discards a patch that invented a number and leaves the field alone', async () => {
    const doc = baseDoc();
    const generate = vi.fn().mockResolvedValue('<patch path="cta.text">Друге речення про 40 Вт.</patch>');
    const out = await executor(generate)(doc, [issueAt('cta.text')]);
    expect(out.cta.text).toBe(doc.cta.text);
  });

  it('discards a patch that introduces a foreign tag', async () => {
    const doc = baseDoc();
    const generate = vi.fn().mockResolvedValue('<patch path="cta.text">Текст <a href="x">лінк</a>.</patch>');
    const out = await executor(generate)(doc, [issueAt('cta.text')]);
    expect(out.cta.text).toBe(doc.cta.text);
  });

  it('sends every finding on one path as ONE request', async () => {
    const generate = vi.fn().mockResolvedValue('<patch path="cta.text">Коротше речення.</patch>');
    await executor(generate)(baseDoc(), [
      issueAt('cta.text', 'Split the sentence.'), issueAt('cta.text', 'Replace the calque.'),
    ]);

    expect(generate).toHaveBeenCalledTimes(1);
    const { userContent } = generate.mock.calls[0][0] as { userContent: string };
    expect(userContent).toContain('Split the sentence.');
    expect(userContent).toContain('Replace the calque.');
    expect(userContent.match(/path="cta\.text"/g)?.length).toBeGreaterThan(0);
  });

  it('ignores an issue that carries no path', async () => {
    const generate = vi.fn();
    const out = await executor(generate)(baseDoc(), [{ ...issueAt('cta.text'), path: undefined }]);
    expect(generate).not.toHaveBeenCalled();
    expect(out).toEqual(baseDoc());
  });

  it('returns the input unchanged when the model returned no patches', async () => {
    const doc = baseDoc();
    const generate = vi.fn().mockResolvedValue('Тут нічого виправляти.');
    const out = await executor(generate)(doc, [issueAt('cta.text')]);
    expect(out).toEqual(doc);
  });

  it('survives a failing generate call rather than losing the artifact', async () => {
    const doc = baseDoc();
    const generate = vi.fn().mockRejectedValue(new Error('502 from provider'));
    const out = await executor(generate)(doc, [issueAt('cta.text')]);
    expect(out).toEqual(doc);
  });

  it('reports what was applied and why anything was rejected', async () => {
    const onResult = vi.fn();
    const generate = vi.fn().mockResolvedValue(
      '<patch path="hook">Новий hook.</patch>'
      + '<patch path="cta.text">Друге речення про 99 Вт.</patch>',
    );
    await createDocBlockRepairExecutor({
      generate: generate as never, languageLabel: 'Ukrainian (uk-UA)', onResult,
    })(baseDoc(), [issueAt('hook'), issueAt('cta.text')]);

    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ applied: 1, rejected: 1 }));
    expect(onResult.mock.calls[0][0].rejections[0]).toMatch(/number/);
  });

  it('resolves the "hook" root-leaf path, which repair-strategy.ts\'s walker alone cannot address', async () => {
    const generate = vi.fn().mockResolvedValue('<patch path="hook">Новий hook, коротший.</patch>');
    const out = await executor(generate)(baseDoc(), [issueAt('hook')]);
    expect(out.hook).toBe('Новий hook, коротший.');
  });

  it('chunks a request list larger than the batch size into multiple sequential generate() calls', async () => {
    const doc = baseDoc({
      // No digit in `text`: rejectDocPatch's number-preservation check would otherwise reject the
      // mock's numberless replacement as a dropped number, which is correct behavior but not what
      // this test is exercising — see doc-block-repair.spec.ts's rejectDocPatch suite for that.
      keyBenefits: Array.from({ length: 7 }, (_, i) => (
        { kind: 'bullets' as const, items: [{ lead: `Лід ${i}:`, text: 'Довге речення пункту, яке потребує скорочення.' }] }
      )),
    });
    const issues = doc.keyBenefits.map((_, i) => issueAt(`keyBenefits[${i}].items[0].text`));

    const generate = vi.fn().mockImplementation(async (payload: { userContent: string }) => {
      // Echo back a valid patch for every field path present in this call's request.
      const paths = [...payload.userContent.matchAll(/path="([^"]+)"/g)].map(m => m[1]);
      return [...new Set(paths)].map(p => `<patch path="${p}">Коротший текст.</patch>`).join('');
    });

    const out = await executor(generate, { maxFieldsPerCall: 3 })(doc, issues);

    expect(generate).toHaveBeenCalledTimes(3); // 7 requests, batches of 3 => 3, 3, 1
    for (const block of out.keyBenefits) {
      if (block.kind === 'bullets') expect(block.items[0].text).toBe('Коротший текст.');
    }
  });
});

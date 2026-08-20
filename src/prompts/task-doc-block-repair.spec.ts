/**
 * task-doc-block-repair.spec.ts
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { buildDocBlockRepairPrompt } from './task-doc-block-repair';
import type { DocPatchRequest } from '../utils/doc-block-repair';

const request = (overrides: Partial<DocPatchRequest> = {}): DocPatchRequest => ({
  path: 'functionality[0].blocks[0]',
  text: 'Триярусна структура Ortur H20 20 Вт поєднує кришку, лазерний модуль та основу.',
  instructions: ['Sentence of 21 words exceeds the uk-UA hard ceiling of 20. Split it into two.'],
  ...overrides,
});

describe('buildDocBlockRepairPrompt', () => {
  it('keeps the system blocks independent of the request, so the cached prefix is stable', () => {
    const a = buildDocBlockRepairPrompt([request()], 'Ukrainian (uk-UA)');
    const b = buildDocBlockRepairPrompt([request({ path: 'hook', text: 'Інше.' })], 'Polish (pl-PL)');
    expect(a.systemBlocks).toEqual(b.systemBlocks);
    expect(a.systemBlocks.every(block => block.cache)).toBe(true);
  });

  it('states the <patch> contract in the cached system block, not per call', () => {
    const [contract] = buildDocBlockRepairPrompt([request()], 'Ukrainian (uk-UA)').systemBlocks;
    expect(contract.text).toContain('<patch path=');
    expect(contract.text).toMatch(/plain text/i);
  });

  it('says a length ceiling is always satisfiable, so skipping one is not a valid answer', () => {
    const [contract] = buildDocBlockRepairPrompt([request()], 'Ukrainian (uk-UA)').systemBlocks;
    expect(contract.text).toMatch(/always.*split|split.*always/i);
  });

  it('tells the model to break the enumeration itself, not an unrelated tail', () => {
    const [contract] = buildDocBlockRepairPrompt([request()], 'Ukrainian (uk-UA)').systemBlocks;
    expect(contract.text).toMatch(/list|enumerat/i);
  });

  it('gives a concrete cutting operation, not another exhortation to be brief', () => {
    const [contract] = buildDocBlockRepairPrompt([request()], 'Ukrainian (uk-UA)').systemBlocks;
    expect(contract.text).toMatch(/semicolon/i);
    expect(contract.text).toMatch(/every\s+sentence[\s\S]{0,40}under the limit/i);
  });

  it('forbids introducing a tag other than <b>/<strong>', () => {
    const [contract] = buildDocBlockRepairPrompt([request()], 'Ukrainian (uk-UA)').systemBlocks;
    expect(contract.text).toMatch(/<b>.*<strong>|nothing else/i);
  });

  it('addresses each field by the path the response must echo back', () => {
    const { userContent } = buildDocBlockRepairPrompt([request({ path: 'cta.text' })], 'Ukrainian (uk-UA)');
    expect(userContent).toContain('path="cta.text"');
  });

  it('carries the field text and every instruction for it', () => {
    const req = request({ instructions: ['Split the sentence.', 'Replace the calque "прінт".'] });
    const { userContent } = buildDocBlockRepairPrompt([req], 'Ukrainian (uk-UA)');
    expect(userContent).toContain(req.text);
    expect(userContent).toContain('Split the sentence.');
    expect(userContent).toContain('Replace the calque "прінт".');
  });

  it('names the output language so the rewrite does not drift to English', () => {
    const { userContent } = buildDocBlockRepairPrompt([request()], 'Ukrainian (uk-UA)');
    expect(userContent).toContain('Ukrainian (uk-UA)');
  });

  it('emits one entry per request', () => {
    const { userContent } = buildDocBlockRepairPrompt(
      [request({ path: 'hook' }), request({ path: 'cta.text' })], 'Ukrainian (uk-UA)',
    );
    expect(userContent).toContain('path="hook"');
    expect(userContent).toContain('path="cta.text"');
  });
});

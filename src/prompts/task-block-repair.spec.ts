/**
 * task-block-repair.spec.ts
 *
 * RUN:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { buildBlockRepairPrompt } from './task-block-repair';
import type { BlockPatchRequest } from '../utils/block-repair';

const request = (overrides: Partial<BlockPatchRequest> = {}): BlockPatchRequest => ({
  index: 3,
  outerHTML: '<p>Триярусна структура Ortur H20 20 Вт поєднує кришку, лазерний модуль та основу.</p>',
  instructions: ['Sentence of 21 words exceeds the uk-UA hard ceiling of 20. Split it into two.'],
  before: 'Попередній абзац про корпус.',
  after: 'Наступний абзац про вентиляцію.',
  ...overrides,
});

describe('buildBlockRepairPrompt', () => {
  it('keeps the system blocks independent of the request, so the cached prefix is stable', () => {
    // Cache economics: the contract is identical for every artifact and every store, so it must
    // not carry per-call text. Same reasoning as repairFieldPayload's systemBlocks-by-reference.
    const a = buildBlockRepairPrompt([request()], 'Ukrainian (uk-UA)');
    const b = buildBlockRepairPrompt([request({ index: 7, outerHTML: '<li>Інше.</li>' })], 'Polish (pl-PL)');
    expect(a.systemBlocks).toEqual(b.systemBlocks);
    expect(a.systemBlocks.every(block => block.cache)).toBe(true);
  });

  it('states the <patch> contract in the cached system block, not per call', () => {
    const [contract] = buildBlockRepairPrompt([request()], 'Ukrainian (uk-UA)').systemBlocks;
    expect(contract.text).toContain('<patch block=');
    expect(contract.text).toMatch(/exactly one element/i);
  });

  it('addresses each block by the index the response must echo back', () => {
    const { userContent } = buildBlockRepairPrompt([request({ index: 3 })], 'Ukrainian (uk-UA)');
    expect(userContent).toContain('block="3"');
  });

  it('carries the block and every instruction for it', () => {
    const req = request({ instructions: ['Split the sentence.', 'Replace the calque "прінт".'] });
    const { userContent } = buildBlockRepairPrompt([req], 'Ukrainian (uk-UA)');
    expect(userContent).toContain(req.outerHTML);
    expect(userContent).toContain('Split the sentence.');
    expect(userContent).toContain('Replace the calque "прінт".');
  });

  it('marks the neighbouring blocks as context that must not be edited', () => {
    const { userContent } = buildBlockRepairPrompt([request()], 'Ukrainian (uk-UA)');
    expect(userContent).toContain('Попередній абзац про корпус.');
    expect(userContent).toContain('Наступний абзац про вентиляцію.');
    expect(userContent).toMatch(/do not (edit|return|change)/i);
  });

  it('omits a neighbour line entirely when there is no neighbour', () => {
    const { userContent } = buildBlockRepairPrompt(
      [request({ before: '', after: '' })], 'Ukrainian (uk-UA)',
    );
    expect(userContent).not.toContain('CONTEXT BEFORE');
    expect(userContent).not.toContain('CONTEXT AFTER');
  });

  it('names the output language so the rewrite does not drift to English', () => {
    const { userContent } = buildBlockRepairPrompt([request()], 'Ukrainian (uk-UA)');
    expect(userContent).toContain('Ukrainian (uk-UA)');
  });

  it('emits one entry per request', () => {
    const { userContent } = buildBlockRepairPrompt(
      [request({ index: 1 }), request({ index: 4 })], 'Ukrainian (uk-UA)',
    );
    expect(userContent).toContain('block="1"');
    expect(userContent).toContain('block="4"');
  });
});

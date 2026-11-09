/**
 * US-10.5 T8 - the one "has sendable content" predicate (FR-17 rules 2-4, owner ruling SQ-1-B; plan DD-11).
 *
 * PINNED CONTRACT (src/utils/image-studio/send-state.ts, owner T8; pure; a structural subset so it does not import the store):
 *   hasSendableContent(d: { text: string; attachments: Array<{ state: 'uploading' | 'ready' | 'failed' }>; attachedVersion: unknown | null }): boolean
 *       = d.text.trim() !== '' || d.attachments.some(a => a.state === 'ready') || d.attachedVersion !== null
 * This is the content clause of `canSend()` and the test of the label ("Generate" versus "Write a prompt to start"): one rule,
 * so enablement and label cannot drift. Written from the Specification's truth table, not from the store.
 * Logic runner. Red until T8.
 */
import { describe, it, expect } from 'vitest';
import { hasSendableContent } from './send-state';

const draft = (over: Partial<{ text: string; attachments: Array<{ state: 'uploading' | 'ready' | 'failed' }>; attachedVersion: unknown }> = {}) => ({
  text: '', attachments: [], attachedVersion: null, ...over,
});
const VERSION = { mimeType: 'image/png', data: 'AAAA', fromVersion: 1 };

describe('FR-17: hasSendableContent truth table (T8)', () => {
  it('a blank draft (empty text, nothing attached) has nothing to send', () => {
    expect(hasSendableContent(draft())).toBe(false);
  });

  it.each([['spaces', '   '], ['a tab and a newline', '\t\n'], ['a non-breaking space only', ' ']])(
    'whitespace-only text (%s) with nothing attached has nothing to send', (_n, text) => {
      expect(hasSendableContent(draft({ text }))).toBe(false);
    });

  it('non-blank text is sendable', () => {
    expect(hasSendableContent(draft({ text: 'a white mug' }))).toBe(true);
    expect(hasSendableContent(draft({ text: '  x ' }))).toBe(true);
  });

  it('a blank prompt with a READY upload is sendable (the images-only send is kept, SQ-1-B)', () => {
    expect(hasSendableContent(draft({ attachments: [{ state: 'ready' }] }))).toBe(true);
  });

  it('a blank prompt with only an UPLOADING attachment has no sendable content yet', () => {
    expect(hasSendableContent(draft({ attachments: [{ state: 'uploading' }] }))).toBe(false);
  });

  it('a blank prompt with only a FAILED attachment has no sendable content', () => {
    expect(hasSendableContent(draft({ attachments: [{ state: 'failed' }] }))).toBe(false);
  });

  it('one ready attachment among failed and uploading ones is enough', () => {
    expect(hasSendableContent(draft({ attachments: [{ state: 'failed' }, { state: 'uploading' }, { state: 'ready' }] }))).toBe(true);
  });

  it('a blank prompt with an attached earlier version is sendable', () => {
    expect(hasSendableContent(draft({ attachedVersion: VERSION }))).toBe(true);
  });

  it('text plus attachments is sendable, and the predicate does not depend on the order of the fields', () => {
    expect(hasSendableContent(draft({ text: 'go', attachments: [{ state: 'uploading' }], attachedVersion: VERSION }))).toBe(true);
  });
});

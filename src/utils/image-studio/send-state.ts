/**
 * The one "has sendable content" predicate of the Image Studio (US-10.5 FR-17 rules 2-4, owner ruling SQ-1-B; plan DD-11).
 *
 * It is the content clause of the store's `canSend()` and the test behind the composer label ("Generate" versus
 * "Write a prompt to start"): one rule, so enablement and label cannot drift.
 *
 * Pure, and typed over a structural subset of the draft so this util does not import the store type.
 */

/** The part of a draft the predicate reads. */
export interface SendableContentDraft {
  readonly text: string;
  readonly attachments: ReadonlyArray<{ readonly state: 'uploading' | 'ready' | 'failed' }>;
  readonly attachedVersion: unknown | null;
}

/**
 * True when the draft carries something to send: non-blank text, at least one READY upload, or an attached earlier
 * version. An uploading or failed attachment alone does not count.
 */
export function hasSendableContent(d: SendableContentDraft): boolean {
  return d.text.trim() !== '' || d.attachments.some(a => a.state === 'ready') || d.attachedVersion !== null;
}

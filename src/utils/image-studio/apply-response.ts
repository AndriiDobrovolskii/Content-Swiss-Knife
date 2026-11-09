import type { CommitBatch, IdSource, ImageMime, Part, SessionMeta, StoredSession, Turn, Version } from './ports';
import type { GenerateResponse } from './schemas';

/**
 * Applies a validated generate response to a session SNAPSHOT and returns ONE commit batch (US-10.1 FR-23, FR-43 to
 * FR-45, FR-84, D-6, D-18, SD-22, SD-27, SD-32).
 *
 * The function is pure: it never mutates the snapshot, and the caller changes in-memory state only after the commit
 * succeeded. The snapshot is the history BEFORE the append (SD-27), so the guard and the notice are evaluated on it.
 *
 *  - `images`: the sent user turn and one new model turn (id from the injected `IdSource`, never from the response,
 *    FR-43) are put; each non-thought image part gets the next version number (a thought image gets none, FR-84,
 *    but its part is stored); the cost is added to the session total.
 *  - `text` / `safety`: non-history events. Nothing is added; only the cut (D-6) is applied, so a batch exists only
 *    when `trimmedTurnIds` removes something.
 *  - the cut: ids listed in `trimmedTurnIds` that exist in the snapshot are deleted together with their versions;
 *    version numbers are never renumbered; unknown ids (including the id of the new user turn) are ignored. A
 *    response that lists a PROTECTED turn (the first user turn, or the model turn holding the latest version) is an
 *    invalid response: `InvalidResponseError`, nothing is applied (FR-44).
 */
export interface ApplyContext {
  /** The user turn exactly as it was sent; it becomes part of the history on an `images` response. */
  userTurn: Turn;
  ids: IdSource;
  /** The injected clock reading; becomes `lastActivity` (SD-32). */
  now: number;
  model: string;
  aspectRatio: string;
  resolution: string;
  /** The text sent in the turn (version label and alt source). */
  prompt: string;
  /** The FR-82 input format stored with each new version (D-22). */
  inputFormat: ImageMime;
  /** US-10.5: the measured generation duration in ms; written on the model turn when given. */
  durationMs?: number;
  /** US-10.5: the id of the preset (chip) the send was made with; written on the model turn when given. */
  presetId?: string;
  /** US-10.5: the number of the retained version this send edits; written on every version the response creates. */
  editOfVersion?: number;
  /** US-10.5: input image references of the send; when omitted they are derived from `userTurn.parts`. */
  inputRefs?: { turnId: string; partIndex: number }[];
}

/** The T-9 counts: generated images V, removed turns M, images attached to removed user turns I (FR-45). */
export interface CutNotice {
  V: number;
  M: number;
  I: number;
}

export interface ApplyResult {
  kind: 'images' | 'text' | 'safety';
  /** ONE object for `SessionStorePort.commit` (FR-44); null when there is nothing to commit. */
  batch: CommitBatch | null;
  newVersionNumbers: number[];
  modelTurnId: string | null;
  notice: CutNotice | null;
}

export class InvalidResponseError extends Error {
  constructor(message = 'The response lists a protected turn') {
    super(message);
    this.name = 'InvalidResponseError';
    Object.setPrototypeOf(this, InvalidResponseError.prototype);
  }
}

/** The ids that may never be removed: the first user turn and the model turn holding the latest version (FR-42). */
export function protectedTurnIds(meta: SessionMeta): string[] {
  if (meta.turnOrder.length === 0) return [];
  const ids = [meta.turnOrder[0]];
  const latest = meta.versions.reduce<Version | undefined>(
    (best, version) => (best === undefined || version.number > best.number ? version : best),
    undefined,
  );
  if (latest && !ids.includes(latest.turnId)) ids.push(latest.turnId);
  return ids;
}

/** True for a final (non-thought) inline image part: the only kind that becomes a version. */
function isVersionPart(part: Part): boolean {
  return (
    part.thought !== true &&
    typeof part.inlineData?.mimeType === 'string' &&
    part.inlineData.mimeType.startsWith('image/') &&
    typeof part.inlineData.data === 'string' &&
    part.inlineData.data.length > 0
  );
}

function attachedImageCount(turn: Turn): number {
  return turn.parts.filter((part) => part.fileData !== undefined || part.inlineData !== undefined).length;
}

/** The (turnId, partIndex) references of the image parts of the sent user turn, in order (US-10.5 FR-3, FR-23). */
function deriveInputRefs(turn: Turn): { turnId: string; partIndex: number }[] {
  const refs: { turnId: string; partIndex: number }[] = [];
  turn.parts.forEach((part, partIndex) => {
    if (part.fileData !== undefined || part.inlineData !== undefined) refs.push({ turnId: turn.id, partIndex });
  });
  return refs;
}

export function applyResponse(snapshot: StoredSession, response: GenerateResponse, ctx: ApplyContext): ApplyResult {
  const turnsById = new Map(snapshot.turns.map((turn) => [turn.id, turn]));
  const known = snapshot.meta.turnOrder.filter((id) => turnsById.has(id));
  const requested = new Set(response.trimmedTurnIds);

  const guarded = protectedTurnIds(snapshot.meta);
  if (guarded.some((id) => requested.has(id))) throw new InvalidResponseError();

  const removed = new Set(known.filter((id) => requested.has(id)));
  const removedTurns = [...removed].map((id) => turnsById.get(id) as Turn);
  const removedVersions = snapshot.meta.versions.filter((version) => removed.has(version.turnId));
  const notice: CutNotice | null =
    removed.size === 0
      ? null
      : {
          V: removedVersions.length,
          M: removed.size,
          I: removedTurns.filter((turn) => turn.role === 'user').reduce((sum, turn) => sum + attachedImageCount(turn), 0),
        };

  const meta: SessionMeta = structuredClone(snapshot.meta);
  meta.turnOrder = meta.turnOrder.filter((id) => !removed.has(id));
  meta.versions = meta.versions.filter((version) => !removed.has(version.turnId));
  meta.lastActivity = ctx.now;

  if (response.kind !== 'images') {
    if (removed.size === 0) {
      return { kind: response.kind, batch: null, newVersionNumbers: [], modelTurnId: null, notice: null };
    }
    return {
      kind: response.kind,
      batch: { putTurns: [], deleteTurnIds: [...removed], meta },
      newVersionNumbers: [],
      modelTurnId: null,
      notice,
    };
  }

  const modelTurnId = ctx.ids.next();
  const modelTurn: Turn = { id: modelTurnId, role: 'model', parts: structuredClone(response.parts) as Part[] };
  // US-10.5: display fields are written only when defined; a key is omitted, never stored as `undefined`.
  modelTurn.cost = response.costUsd;
  if (ctx.durationMs !== undefined) modelTurn.durationMs = ctx.durationMs;
  if (ctx.presetId !== undefined) modelTurn.presetId = ctx.presetId;
  const inputRefs = ctx.inputRefs ?? deriveInputRefs(ctx.userTurn);
  if (inputRefs.length > 0) modelTurn.inputRefs = inputRefs;
  const newVersionNumbers: number[] = [];
  modelTurn.parts.forEach((part, partIndex) => {
    if (!isVersionPart(part)) return;
    const number = meta.nextVersionNumber;
    meta.nextVersionNumber += 1;
    newVersionNumbers.push(number);
    const version: Version = {
      number,
      turnId: modelTurnId,
      partIndex,
      model: ctx.model,
      resolution: ctx.resolution,
      aspectRatio: ctx.aspectRatio,
      prompt: ctx.prompt,
      inputFormat: ctx.inputFormat,
      downloaded: false,
    };
    if (ctx.editOfVersion !== undefined) version.editOfVersion = ctx.editOfVersion;
    meta.versions.push(version);
  });
  meta.turnOrder.push(ctx.userTurn.id, modelTurnId);
  meta.costUsd += response.costUsd;

  return {
    kind: 'images',
    batch: { putTurns: [structuredClone(ctx.userTurn), modelTurn], deleteTurnIds: [...removed], meta },
    newVersionNumbers,
    modelTurnId,
    notice,
  };
}

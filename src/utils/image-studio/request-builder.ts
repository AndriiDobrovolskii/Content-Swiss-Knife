import { CHIP_INSTRUCTIONS } from '../../prompt-core/prompt-presets';
import type { Part, StoredSession, Turn } from './ports';

/**
 * Builds the generate request from a session SNAPSHOT (US-10.1 FR-18, FR-25, FR-34, FR-35, FR-37, SD-27).
 *
 * The snapshot is the session as it is BEFORE the new turn is appended (SD-27). The function never mutates it and the
 * returned request shares no object with it, so a later append to the session cannot change the request. The history
 * is every retained turn in `turnOrder` order with its parts untouched (`thoughtSignature`, thought parts, `fileData`
 * and inline versions all survive, FR-35). The new turn's parts are ordered text, then one `fileData` part per upload,
 * then the attached version inline (FR-25, FR-37). No filler text is ever invented.
 */
export interface BuildInput {
  /** Id of the new user turn, from the IdSource (SD-20). */
  newTurnId: string;
  /** The composer text, verbatim; a part only when it has non-whitespace. */
  text?: string;
  /** A quick-edit chip (FR-31): its English model-facing instruction becomes the text. */
  chipId?: string;
  /** User uploads already on the Files API (FR-16). */
  uploads?: Array<{ fileUri: string; mimeType: string }>;
  /** The version attached under FR-37: inline base64, never a `file_uri`. */
  attachedVersion?: { mimeType: string; data: string };
  model: string;
  aspectRatio: string;
  resolution: string;
  presetId?: string;
}

export interface GenerateRequest {
  model: string;
  aspectRatio: string;
  resolution: string;
  presetId?: string;
  history: Turn[];
  newTurn: { id: string; parts: Part[] };
}

export class EmptyMessageError extends Error {
  constructor() {
    super('A message needs text, an uploaded image or an attached version');
    this.name = 'EmptyMessageError';
    Object.setPrototypeOf(this, EmptyMessageError.prototype);
  }
}

function chipInstruction(chipId: string | undefined): string | undefined {
  if (!chipId) return undefined;
  return CHIP_INSTRUCTIONS.find((chip) => chip.id === chipId)?.instruction;
}

/** The text of the new turn: the composer text, the chip instruction, both (text first) or nothing. */
function turnText(input: BuildInput): string | undefined {
  const typed = input.text !== undefined && input.text.trim() !== '' ? input.text : undefined;
  const chip = chipInstruction(input.chipId);
  if (typed !== undefined && chip !== undefined) return `${typed}\n${chip}`;
  return typed ?? chip;
}

/** The protected set (FR-42): the first user turn and the model turn holding the latest version; [] when empty. */
function protectedIds(snapshot: StoredSession): string[] {
  const order = snapshot.meta.turnOrder;
  if (order.length === 0) return [];
  const ids = [order[0]];
  const latest = snapshot.meta.versions.reduce<{ number: number; turnId: string } | undefined>(
    (best, version) => (best === undefined || version.number > best.number ? version : best),
    undefined,
  );
  if (latest && !ids.includes(latest.turnId)) ids.push(latest.turnId);
  return ids;
}

export function buildGenerateRequest(
  snapshot: StoredSession,
  input: BuildInput,
): { request: GenerateRequest; protectedTurnIds: string[] } {
  const parts: Part[] = [];
  const text = turnText(input);
  if (text !== undefined) parts.push({ text });
  for (const upload of input.uploads ?? []) {
    parts.push({ fileData: { fileUri: upload.fileUri, mimeType: upload.mimeType } });
  }
  if (input.attachedVersion) {
    parts.push({ inlineData: { mimeType: input.attachedVersion.mimeType, data: input.attachedVersion.data } });
  }
  if (parts.length === 0) throw new EmptyMessageError();

  const byId = new Map(snapshot.turns.map((turn) => [turn.id, turn]));
  const history: Turn[] = [];
  for (const id of snapshot.meta.turnOrder) {
    const turn = byId.get(id);
    if (turn) history.push(structuredClone(turn));
  }

  const request: GenerateRequest = {
    model: input.model,
    aspectRatio: input.aspectRatio,
    resolution: input.resolution,
    ...(input.presetId !== undefined ? { presetId: input.presetId } : {}),
    history,
    newTurn: { id: input.newTurnId, parts },
  };
  return { request, protectedTurnIds: protectedIds(snapshot) };
}

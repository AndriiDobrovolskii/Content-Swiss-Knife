/**
 * Request validation for the Image Studio routes (US-10.1, FR-3, FR-18, FR-19, FR-25, FR-35, DD-5).
 *
 * Contract:
 *   parseGenerateRequest(body) -> the validated generate request
 *       { model, aspectRatio, resolution, presetId?, history, newTurn }
 *   parseUploadRequest(body)   -> { data } (base64 text; its bytes are inspected by the upload handler)
 *
 * Both throw `ImageStudioError('INVALID_REQUEST')` (400) for every violation. The error carries only the
 * closed code, never the offending value or a zod message, so no client text can reach a response or a log.
 *
 * Parts are validated for shape only and PASSED ON UNMODIFIED (FR-35): `thought`, `thoughtSignature` and any
 * other unknown field survive parsing, because Gemini needs the signatures echoed back verbatim. The parsed
 * request is a fresh object graph; the caller's body is never mutated.
 *
 * The aspect-ratio and resolution lists come from the shared contract JSON (the one source both runtimes
 * read); the resolutions a model accepts come from its catalogue entry (`resolutions`, DD-3).
 */
import { z } from 'zod';
import contract from '../../src/prompt-core/image-studio-contract.json' with { type: 'json' };
import { findImageModel } from '../providers/model-support.js';
import { ImageStudioError } from './errors.js';

const PRESET_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

const nonEmptyString = z.string().min(1);

const inlineDataSchema = z.object({ mimeType: nonEmptyString, data: nonEmptyString }).passthrough();
const fileDataSchema = z.object({ fileUri: nonEmptyString, mimeType: nonEmptyString }).passthrough();

/** A part carries `text`, `inlineData` or `fileData`; every other field is passed through untouched. */
const partSchema = z
  .object({
    text: z.string().optional(),
    inlineData: inlineDataSchema.optional(),
    fileData: fileDataSchema.optional(),
  })
  .passthrough()
  .refine(
    part => part.text !== undefined || part.inlineData !== undefined || part.fileData !== undefined,
    { message: 'part has no text, inlineData or fileData' },
  );

const turnSchema = z.object({
  id: nonEmptyString,
  role: z.enum(['user', 'model']),
  parts: z.array(partSchema),
});

const newTurnSchema = z.object({
  id: nonEmptyString,
  parts: z.array(partSchema),
});

const generateRequestSchema = z.object({
  model: z.string(),
  aspectRatio: z.enum(contract.aspectRatios),
  resolution: z.enum(contract.resolutions),
  presetId: z.string().regex(PRESET_ID_PATTERN).optional(),
  history: z.array(turnSchema),
  newTurn: newTurnSchema,
});

const uploadRequestSchema = z.object({ data: nonEmptyString });

function invalid() {
  return new ImageStudioError('INVALID_REQUEST');
}

function hasImagePart(part) {
  return part.inlineData !== undefined || part.fileData !== undefined;
}

function hasText(part) {
  return typeof part.text === 'string' && part.text.trim().length > 0;
}

/** Cross-field rules zod's per-field checks cannot express. Throws INVALID_REQUEST on the first violation. */
function assertConsistent(request) {
  const model = findImageModel(request.model);
  if (!model || !model.resolutions.includes(request.resolution)) throw invalid();

  const { history, newTurn } = request;
  if (history.length % 2 !== 0) throw invalid();
  history.forEach((turn, index) => {
    if (turn.role !== (index % 2 === 0 ? 'user' : 'model')) throw invalid();
  });

  const ids = [...history.map(turn => turn.id), newTurn.id];
  if (new Set(ids).size !== ids.length) throw invalid();

  // Text OR at least one image part: an images-only turn is valid (OD-46, V-9).
  if (!newTurn.parts.some(part => hasText(part) || hasImagePart(part))) throw invalid();
}

export function parseGenerateRequest(body) {
  const result = generateRequestSchema.safeParse(body);
  if (!result.success) throw invalid();
  assertConsistent(result.data);
  return result.data;
}

export function parseUploadRequest(body) {
  const result = uploadRequestSchema.safeParse(body);
  if (!result.success) throw invalid();
  return result.data;
}

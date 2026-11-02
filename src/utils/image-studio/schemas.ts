import { z } from 'zod';
import type { SessionMeta, Turn } from './ports';

/**
 * Zod schemas for the Image Studio's two trust boundaries (US-10.1 DD-27): the generate and upload responses that
 * come over HTTP, and the session records read back from local storage. They live here, not in `src/domain/`,
 * because they are API-boundary and local-storage shapes, not description artifacts.
 *
 * A response matching no variant is an invalid response, never an empty image (FR-24). A stored record that fails
 * its schema, or carries an unknown `schemaVersion`, is ignored: it is not listed, not counted and not deleted
 * (P-9), so a future version can read what an older one wrote.
 */

/** A content part. Service fields (`thought`, `thoughtSignature`, unknown keys) pass through untouched (FR-25). */
const PartSchema = z.object({}).passthrough();

const nonEmpty = z.string().min(1);

/** True when the part is a final (non-thought) inline image with a non-empty image MIME type and data. */
function isValidImagePart(part: Record<string, unknown>): boolean {
  if (part['thought'] === true) return false;
  const inline = part['inlineData'];
  if (typeof inline !== 'object' || inline === null) return false;
  const { mimeType, data } = inline as { mimeType?: unknown; data?: unknown };
  return typeof mimeType === 'string' && mimeType.startsWith('image/') && typeof data === 'string' && data.length > 0;
}

/** The ids the BFF dropped from the history; always present, every id a non-empty string (D-6). */
const TrimmedTurnIds = z.array(nonEmpty);

const ImagesResponse = z.object({
  kind: z.literal('images'),
  parts: z.array(PartSchema).refine((parts) => parts.some(isValidImagePart), 'at least one valid image part is required'),
  costUsd: z.number().finite().nonnegative(),
  usage: z.object({ inputTokens: z.number(), outputTokens: z.number() }).passthrough(),
  trimmedTurnIds: TrimmedTurnIds,
});

const TextResponse = z.object({
  kind: z.literal('text'),
  text: z.string(),
  trimmedTurnIds: TrimmedTurnIds,
});

const SafetyResponse = z.object({
  kind: z.literal('safety'),
  reason: nonEmpty,
  trimmedTurnIds: TrimmedTurnIds,
});

/** The 200 body of `POST /api/image-studio/generate`, discriminated on `kind` (SD-1). */
export const GenerateResponseSchema = z.discriminatedUnion('kind', [ImagesResponse, TextResponse, SafetyResponse]);
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;

export type ParsedGenerateResponse = { ok: true; value: GenerateResponse } | { ok: false; error: string };

/**
 * Validates a generate response. `requestTurnIdCount` is the number of turn ids the request carried; a
 * `trimmedTurnIds` longer than that fails the whole response (FR-24). A failure never yields a value.
 */
export function parseGenerateResponse(body: unknown, requestTurnIdCount?: number): ParsedGenerateResponse {
  const parsed = GenerateResponseSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: `Invalid generate response: ${parsed.error.issues[0]?.message ?? 'unrecognised shape'}` };
  }
  if (requestTurnIdCount !== undefined && parsed.data.trimmedTurnIds.length > requestTurnIdCount) {
    return { ok: false, error: 'Invalid generate response: trimmedTurnIds is longer than the request carried' };
  }
  return { ok: true, value: parsed.data };
}

/** The 200 body of `POST /api/image-studio/upload` (FR-16). */
export const UploadResponseSchema = z.object({ fileUri: nonEmpty, mimeType: nonEmpty });
export type UploadResponse = z.infer<typeof UploadResponseSchema>;

const ImageMimeSchema = z.enum(['image/png', 'image/jpeg', 'image/webp']);

const StoredVersionSchema = z
  .object({
    number: z.number().int().min(1),
    turnId: nonEmpty,
    partIndex: z.number().int().min(0),
    model: z.string(),
    resolution: z.string(),
    aspectRatio: z.string(),
    prompt: z.string(),
    inputFormat: ImageMimeSchema,
    downloaded: z.boolean(),
  })
  .passthrough();

/** The persisted session meta record (`sessions` object store), `schemaVersion` 1 (DD-16). */
export const StoredSessionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: nonEmpty,
    createdAt: z.number().finite(),
    lastActivity: z.number().finite(),
    model: z.string(),
    costUsd: z.number().finite().nonnegative(),
    nextVersionNumber: z.number().int().min(1),
    turnOrder: z.array(nonEmpty),
    versions: z.array(StoredVersionSchema),
  })
  .passthrough();

/** One persisted turn (`turns` object store): exactly as it must be resent, service fields included. */
export const StoredTurnSchema = z
  .object({
    id: nonEmpty,
    role: z.enum(['user', 'model']),
    parts: z.array(PartSchema),
  })
  .passthrough();

/** The session meta, or `null` when the record is malformed or of an unknown version. Never throws. */
export function parseStoredSession(value: unknown): SessionMeta | null {
  const parsed = StoredSessionSchema.safeParse(value);
  return parsed.success ? (parsed.data as unknown as SessionMeta) : null;
}

/** The turn, or `null` when the record is malformed. Never throws. */
export function parseStoredTurn(value: unknown): Turn | null {
  const parsed = StoredTurnSchema.safeParse(value);
  return parsed.success ? (parsed.data as unknown as Turn) : null;
}

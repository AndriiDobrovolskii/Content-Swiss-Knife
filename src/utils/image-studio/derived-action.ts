/**
 * What an Upscale 4K or a Variation sends (US-10.6 FR-1, FR-2, FR-3; AC-1, AC-2).
 *
 * `planDerivedAction` is the ONE place that decides the request content of both actions and the single seam for
 * "the model cannot serve the action" (plan 7.3, owner ruling SM-1 ii): the action RUNS ON THE SUPPORTING MODEL (the first
 * catalogue model that offers the resolution) without changing the session's selected model, and the version records the
 * model that served it. The output resolution is never changed to fit a model, and a model / resolution pair the catalogue
 * does not offer is never returned.
 *
 * No instruction text is written for either action (owner ruling SM-12 i): an Upscale sends the image alone; a Variation
 * sends the source version's own prompt when it is not blank, the image alone otherwise. `storedPrompt` is what the store
 * records as the NEW version's prompt - the source version's prompt for both kinds (plan 8, N-8) - so it is not sent anywhere.
 *
 * Pure: no clock, no storage, no mutation of the input. The caller (the store) adds the new turn id and routes the result
 * through the existing request builder.
 */

/** The 4K resolution label of the catalogue. */
const RESOLUTION_4K = '4K';

/** Reason id of an Upscale on a version that is already 4K (FR-2 (d)); a studio text id is the copy task's. */
export const REASON_ALREADY_4K = 'upscale-already-4k';
/** Reason id when no catalogue model offers the needed resolution (a defensive branch: never a request the catalogue rejects). */
export const REASON_NO_SUPPORTING_MODEL = 'derived-no-supporting-model';

export type DerivedActionKind = 'upscale' | 'variation';

/** The image models of `model-catalog.json` as this module needs them. */
export interface DerivedCatalogueModel {
  id: string;
  resolutions: readonly string[];
}

/** The source version with its inline bytes. */
export interface DerivedSourceVersion {
  number: number;
  prompt: string;
  aspectRatio: string;
  resolution: string;
  model: string;
  image: { mimeType: string; data: string };
}

export interface DerivedActionInput {
  kind: DerivedActionKind;
  version: DerivedSourceVersion;
  /** The session's selected model; it is never changed by the action. */
  sessionModel: string;
  /** The Images selector value at the click; used by a Variation only. */
  imageCount: number;
  catalogue: readonly DerivedCatalogueModel[];
}

/** The fields the request builder receives (no `newTurnId`: the store supplies it). */
export interface DerivedBuildInput {
  omitHistory: true;
  attachedVersion: { mimeType: string; data: string };
  aspectRatio: string;
  resolution: string;
  model: string;
  editOfVersion: number;
  imageCount: number;
  /** Absent when nothing is to be sent as text (SM-12 i, FR-3 (a)). */
  text?: string;
}

export type DerivedActionPlan =
  | { enabled: true; buildInput: DerivedBuildInput; storedPrompt: string }
  | { enabled: false; reasonId: string };

/** The session's model when it offers `resolution`, otherwise the first catalogue model that does (SM-1 ii); undefined if none. */
function modelFor(sessionModel: string, resolution: string, catalogue: readonly DerivedCatalogueModel[]): string | undefined {
  const session = catalogue.find((model) => model.id === sessionModel);
  if (session && session.resolutions.includes(resolution)) return session.id;
  return catalogue.find((model) => model.resolutions.includes(resolution))?.id;
}

export function planDerivedAction(input: DerivedActionInput): DerivedActionPlan {
  const { kind, version, sessionModel, imageCount, catalogue } = input;

  if (kind === 'upscale' && version.resolution === RESOLUTION_4K) {
    return { enabled: false, reasonId: REASON_ALREADY_4K };
  }

  const resolution = kind === 'upscale' ? RESOLUTION_4K : version.resolution;
  const model = modelFor(sessionModel, resolution, catalogue);
  if (model === undefined) return { enabled: false, reasonId: REASON_NO_SUPPORTING_MODEL };

  const buildInput: DerivedBuildInput = {
    omitHistory: true,
    attachedVersion: { mimeType: version.image.mimeType, data: version.image.data },
    aspectRatio: version.aspectRatio,
    resolution,
    model,
    editOfVersion: version.number,
    imageCount: kind === 'upscale' ? 1 : imageCount,
  };
  if (kind === 'variation' && version.prompt.trim() !== '') buildInput.text = version.prompt;

  return { enabled: true, buildInput, storedPrompt: version.prompt };
}

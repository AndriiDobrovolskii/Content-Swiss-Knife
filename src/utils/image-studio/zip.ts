import JSZip from 'jszip';
import { deliver } from './delivery';
import { buildFileName } from './file-name';
import type { ImageCodec, ImageMime } from './ports';

/**
 * "Download all versions" (US-10.1 FR-58, SD-28): one ZIP entry per retained version, named per FR-56 and in the
 * version's CURRENT target format. An entry whose API format equals its target is the API bytes untouched; any other
 * is converted once at native size (the rules of `delivery.ts`). Uses the existing `jszip` dependency.
 *
 * Zero versions produce no archive (`null`): an empty ZIP is never produced and the action is disabled. Any
 * conversion failure rejects with a `ZipBuildError`; a partial archive is never returned.
 */
export interface ZipVersion {
  number: number;
  /** The bytes as the API returned them. */
  bytes: Uint8Array;
  /** The format of `bytes`. */
  mime: ImageMime;
  /** The version's current selector value. */
  targetMime: ImageMime;
  aspectRatio: string;
}

export interface ZipDeps {
  codec: ImageCodec;
  productName: string;
}

export class ZipBuildError extends Error {
  constructor(message = 'The ZIP archive could not be built') {
    super(message);
    this.name = 'ZipBuildError';
    Object.setPrototypeOf(this, ZipBuildError.prototype);
  }
}

export async function buildZip(versions: readonly ZipVersion[], deps: ZipDeps): Promise<Uint8Array | null> {
  if (versions.length === 0) return null;

  try {
    const zip = new JSZip();
    for (const version of versions) {
      const file = await deliver({ bytes: version.bytes, mime: version.mime }, version.targetMime, { codec: deps.codec });
      const name = buildFileName({
        productName: deps.productName,
        versionNumber: version.number,
        aspectRatio: version.aspectRatio,
        mimeType: file.mime,
      });
      zip.file(name, file.bytes);
    }
    return await zip.generateAsync({ type: 'uint8array' });
  } catch (error) {
    throw new ZipBuildError(error instanceof Error ? error.message : undefined);
  }
}

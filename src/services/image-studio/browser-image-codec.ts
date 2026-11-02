import type { CodecProbe, CodecTranscodeRequest, CodecTranscodeResult, ImageCodec } from '../../utils/image-studio/ports';

/**
 * The canvas implementation of `ImageCodec` (US-10.1 DD-15, DD-20, DD-21). It contains no decision:
 *
 *  - `probe` decodes through `createImageBitmap`, which applies the EXIF orientation, so the size it returns is the
 *    as-displayed size (D-32). A file that cannot be decoded rejects; an animated image yields its first frame.
 *  - `transcode` draws the decoded image onto a canvas (which drops EXIF, GPS and XMP and any animation) and encodes
 *    it with `toBlob`. The size is scaled down to `maxLongSide` only when that is given and exceeded (never up, and
 *    never at all in the download path, which does not pass it); transparency is flattened onto white only when
 *    `fillWhite` is set. The MIME type returned is the encoder's actual `blob.type`: a browser that cannot encode the
 *    requested type answers another one, and the caller treats the difference as the D-31 failure.
 *
 * Browser globals (`createImageBitmap`, `document`) are touched only inside the methods, never at module load.
 */
export class BrowserImageCodec implements ImageCodec {
  async probe(bytes: Uint8Array): Promise<CodecProbe> {
    const bitmap = await createImageBitmap(new Blob([bytes as BlobPart]));
    try {
      return { width: bitmap.width, height: bitmap.height };
    } finally {
      bitmap.close();
    }
  }

  async transcode(req: CodecTranscodeRequest): Promise<CodecTranscodeResult> {
    const bitmap = await createImageBitmap(new Blob([req.bytes as BlobPart]));
    try {
      const longSide = Math.max(bitmap.width, bitmap.height);
      const scale = req.maxLongSide !== undefined && longSide > req.maxLongSide ? req.maxLongSide / longSide : 1;
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('A 2D canvas context is not available');
      if (req.fillWhite) {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(bitmap, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, req.targetMime, req.quality !== undefined ? req.quality / 100 : undefined),
      );
      if (!blob) throw new Error('The canvas could not be encoded');
      return { bytes: new Uint8Array(await blob.arrayBuffer()), mime: blob.type, width, height };
    } finally {
      bitmap.close();
    }
  }
}

export function createBrowserImageCodec(): ImageCodec {
  return new BrowserImageCodec();
}

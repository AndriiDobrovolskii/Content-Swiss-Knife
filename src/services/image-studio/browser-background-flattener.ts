import type { ImageBackgroundPort } from '../../utils/image-studio/ports';
import { flattenBackgroundToWhite } from '../../utils/image-studio/white-background';

/**
 * The canvas implementation of `ImageBackgroundPort`. It contains no decision: it decodes through `createImageBitmap`,
 * reads the pixels, hands them to the pure `flattenBackgroundToWhite`, writes the result back and encodes it as lossless
 * PNG. Browser globals are touched only inside the method, never at module load.
 */
export class BrowserBackgroundFlattener implements ImageBackgroundPort {
  async flattenToWhite(bytes: Uint8Array, _mime: string): Promise<{ bytes: Uint8Array; mime: string }> {
    const bitmap = await createImageBitmap(new Blob([bytes as BlobPart]));
    try {
      const { width, height } = bitmap;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('A 2D canvas context is not available');
      context.drawImage(bitmap, 0, 0);

      const pixels = context.getImageData(0, 0, width, height);
      pixels.data.set(flattenBackgroundToWhite(pixels.data, width, height));
      context.putImageData(pixels, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob || blob.type !== 'image/png') throw new Error('The canvas could not be encoded as PNG');
      return { bytes: new Uint8Array(await blob.arrayBuffer()), mime: blob.type };
    } finally {
      bitmap.close();
    }
  }
}

export function createBrowserBackgroundFlattener(): ImageBackgroundPort {
  return new BrowserBackgroundFlattener();
}

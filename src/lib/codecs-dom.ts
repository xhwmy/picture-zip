import type { DecodedImage } from './types';
import { CodecError, detectFormat, detectFormatFromHeader } from './codecs';

export function supportsMainThreadCanvas(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof createImageBitmap !== 'undefined'
  );
}

export async function decodeOnMainThread(
  buffer: ArrayBuffer,
  mimeType?: string,
): Promise<DecodedImage> {
  if (!supportsMainThreadCanvas()) {
    throw new CodecError('wasm-unsupported');
  }
  const format = mimeType ? detectFormat(mimeType, buffer) : detectFormatFromHeader(buffer);
  try {
    const blob = new Blob([buffer], mimeType ? { type: mimeType } : undefined);
    const bitmap = await createImageBitmap(blob);
    const width = bitmap.width;
    const height = bitmap.height;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new CodecError('decode-error');
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const imageData = ctx.getImageData(0, 0, width, height);
    return {
      data: imageData.data,
      width: imageData.width,
      height: imageData.height,
      format,
    };
  } catch (err) {
    if (err instanceof CodecError) throw err;
    throw new CodecError('decode-error');
  }
}

export interface SourceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export async function resizeOnMainThread(
  image: DecodedImage,
  newWidth: number,
  newHeight: number,
  sourceRect?: SourceRect,
): Promise<DecodedImage> {
  if (!supportsMainThreadCanvas()) {
    throw new CodecError('wasm-unsupported');
  }
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new CodecError('decode-error');
  const sourceData = new ImageData(
    new Uint8ClampedArray(image.data),
    image.width,
    image.height,
  );
  const sourceBitmap = await createImageBitmap(sourceData);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (sourceRect) {
    ctx.drawImage(
      sourceBitmap,
      sourceRect.sx, sourceRect.sy, sourceRect.sw, sourceRect.sh,
      0, 0, newWidth, newHeight,
    );
  } else {
    ctx.drawImage(sourceBitmap, 0, 0, newWidth, newHeight);
  }
  sourceBitmap.close();
  const resized = ctx.getImageData(0, 0, newWidth, newHeight);
  return {
    data: resized.data,
    width: resized.width,
    height: resized.height,
    format: image.format,
  };
}
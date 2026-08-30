import { decodeBuffer, encodeImage, resizeImage } from './codecs';
import type { CompressionOptions, CompressOutput } from './types';

export async function compressBuffer(
  buffer: ArrayBuffer,
  mimeType: string,
  options: CompressionOptions,
): Promise<CompressOutput> {
  const decoded = await decodeBuffer(buffer, mimeType);
  const resized = await resizeImage(decoded, options.maxWidth, options.maxHeight);
  const encoded = await encodeImage(resized.image, options.format, options.quality);
  return {
    buffer: encoded.buffer,
    mimeType: encoded.mimeType,
    extension: encoded.extension,
    byteLength: encoded.buffer.byteLength,
    width: resized.image.width,
    height: resized.image.height,
    qualityUsed: options.quality,
    resized: resized.resized,
    originalByteLength: buffer.byteLength,
  };
}
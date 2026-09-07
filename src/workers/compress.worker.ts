/// <reference lib="webworker" />
import { compressGifAnimated } from '../lib/compress';
import { compressToTargetSize } from '../lib/targetSize';
import { compressVisuallyLossless } from '../lib/visuallyLossless';
import { decodeBuffer, encodeImage, resizeImage, fastEncodeFromBuffer, autoFormatFromInput, detectFormat } from '../lib/codecs';
import type { CompressOutput, WorkerRequest, WorkerResponse } from '../lib/types';

function isGif(mimeType: string, buffer: ArrayBuffer): boolean {
  if (mimeType === 'image/gif') return true;
  const bytes = new Uint8Array(buffer.slice(0, 4));
  return bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38;
}

function postProgress(id: string, stage: 'decoded' | 'encoded') {
  (self as unknown as Worker).postMessage({ type: 'progress', id, stage } as WorkerResponse);
}

function toCompressOutput(
  buffer: ArrayBuffer,
  mimeType: string,
  extension: string,
  width: number,
  height: number,
  qualityUsed: number,
  resized: boolean,
  originalByteLength: number,
  targetReached?: boolean,
): CompressOutput {
  return {
    buffer,
    mimeType,
    extension,
    byteLength: buffer.byteLength,
    width,
    height,
    qualityUsed,
    resized,
    targetReached,
    originalByteLength,
  };
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  try {
    let result: CompressOutput;

    if (isGif(msg.mimeType, msg.buffer) && msg.type === 'compress') {
      result = await compressGifAnimated(msg.buffer, { quality: msg.quality });
      postProgress(msg.id, 'decoded');
      postProgress(msg.id, 'encoded');
    } else if (msg.type === 'targetSize' && msg.targetKB !== undefined) {
      const r = await compressToTargetSize(msg.buffer, msg.mimeType, msg.targetKB, {
        format: msg.format,
        maxWidth: msg.maxWidth,
        maxHeight: msg.maxHeight,
      });
      result = toCompressOutput(r.buffer, r.mimeType, r.extension, r.width, r.height, r.qualityUsed, r.resized, r.originalByteLength, r.targetReached);
      postProgress(msg.id, 'decoded');
      postProgress(msg.id, 'encoded');
    } else if (msg.type === 'visuallyLossless') {
      const vlFormat = msg.format === 'auto' ? autoFormatFromInput(detectFormat(msg.mimeType, msg.buffer)) : msg.format;
      if (vlFormat === 'png') {
        const decoded = await decodeBuffer(msg.buffer, msg.mimeType);
        postProgress(msg.id, 'decoded');
        const encoded = await encodeImage(decoded, msg.format, 100);
        postProgress(msg.id, 'encoded');
        result = toCompressOutput(encoded.buffer, encoded.mimeType, encoded.extension, decoded.width, decoded.height, 100, false, msg.buffer.byteLength);
      } else {
        result = await compressVisuallyLossless(msg.buffer, msg.mimeType, {
          format: msg.format,
          quality: msg.quality,
          maxWidth: msg.maxWidth,
          maxHeight: msg.maxHeight,
          resizeMode: msg.resizeMode,
          perceptualLevel: msg.perceptualLevel,
        });
        postProgress(msg.id, 'decoded');
        postProgress(msg.id, 'encoded');
      }
    } else if (msg.ultraLossy) {
      const decoded = await decodeBuffer(msg.buffer, msg.mimeType);
      postProgress(msg.id, 'decoded');
      const encoded = await encodeImage(decoded, 'jpeg', 1, true);
      postProgress(msg.id, 'encoded');
      result = toCompressOutput(encoded.buffer, encoded.mimeType, encoded.extension, decoded.width, decoded.height, 1, false, msg.buffer.byteLength);
    } else {
      const resolvedFormat = msg.format === 'auto' ? autoFormatFromInput(detectFormat(msg.mimeType, msg.buffer)) : msg.format;
      const fast = await fastEncodeFromBuffer(msg.buffer, msg.mimeType, resolvedFormat as Exclude<typeof resolvedFormat, 'auto'>, msg.quality);
      if (fast) {
        postProgress(msg.id, 'decoded');
        postProgress(msg.id, 'encoded');
        result = toCompressOutput(fast.buffer, fast.mimeType, fast.extension, fast.width, fast.height, msg.quality, false, msg.buffer.byteLength);
      } else {
        const decoded = await decodeBuffer(msg.buffer, msg.mimeType);
        postProgress(msg.id, 'decoded');
        const resized = await resizeImage(decoded, msg.maxWidth, msg.maxHeight, msg.resizeMode);
        const encoded = await encodeImage(resized.image, msg.format, msg.quality);
        postProgress(msg.id, 'encoded');
        result = toCompressOutput(encoded.buffer, encoded.mimeType, encoded.extension, resized.image.width, resized.image.height, msg.quality, resized.resized, msg.buffer.byteLength);
      }
    }

    const response: WorkerResponse = { type: 'success', id: msg.id, result };
    (self as unknown as Worker).postMessage(response, { transfer: [result.buffer] });
  } catch (err) {
    const code =
      err instanceof Error && 'code' in err ? (err as { code?: string }).code : undefined;
    const response: WorkerResponse = {
      type: 'error',
      id: msg.id,
      error: err instanceof Error ? err.message : String(err),
      code,
    };
    (self as unknown as Worker).postMessage(response);
  }
};

export {};

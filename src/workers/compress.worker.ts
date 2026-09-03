/// <reference lib="webworker" />
import { compressBuffer, compressGifAnimated } from '../lib/compress';
import { compressToTargetSize } from '../lib/targetSize';
import { compressVisuallyLossless } from '../lib/visuallyLossless';
import type { CompressOutput, WorkerRequest, WorkerResponse } from '../lib/types';

function isGif(mimeType: string, buffer: ArrayBuffer): boolean {
  if (mimeType === 'image/gif') return true;
  const bytes = new Uint8Array(buffer.slice(0, 4));
  return bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38;
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
    } else if (msg.type === 'targetSize' && msg.targetKB !== undefined) {
      const r = await compressToTargetSize(msg.buffer, msg.mimeType, msg.targetKB, {
        format: msg.format,
        maxWidth: msg.maxWidth,
        maxHeight: msg.maxHeight,
      });
      result = toCompressOutput(
        r.buffer,
        r.mimeType,
        r.extension,
        r.width,
        r.height,
        r.qualityUsed,
        r.resized,
        r.originalByteLength,
        r.targetReached,
      );
    } else if (msg.type === 'visuallyLossless') {
      const r = await compressVisuallyLossless(msg.buffer, msg.mimeType, {
        format: msg.format,
        quality: msg.quality,
        maxWidth: msg.maxWidth,
        maxHeight: msg.maxHeight,
        resizeMode: msg.resizeMode,
        perceptualLevel: msg.perceptualLevel,
      });
      result = toCompressOutput(
        r.buffer,
        r.mimeType,
        r.extension,
        r.width,
        r.height,
        r.qualityUsed,
        r.resized,
        r.originalByteLength,
      );
    } else {
      const r = await compressBuffer(msg.buffer, msg.mimeType, {
        format: msg.format,
        quality: msg.quality,
        maxWidth: msg.maxWidth,
        maxHeight: msg.maxHeight,
        resizeMode: msg.resizeMode,
      });
      result = toCompressOutput(
        r.buffer,
        r.mimeType,
        r.extension,
        r.width,
        r.height,
        r.qualityUsed,
        r.resized,
        r.originalByteLength,
      );
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
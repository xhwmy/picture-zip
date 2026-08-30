/// <reference lib="webworker" />
import { compressBuffer } from '../lib/compress';
import { compressToTargetSize } from '../lib/targetSize';
import type { CompressOutput, WorkerRequest, WorkerResponse } from '../lib/types';

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

    if (msg.type === 'targetSize' && msg.targetKB !== undefined) {
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
    } else {
      const r = await compressBuffer(msg.buffer, msg.mimeType, {
        format: msg.format,
        quality: msg.quality,
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
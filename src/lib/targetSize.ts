import { decodeBuffer, encodeImage, resizeImage, type ResizeResult } from './codecs';
import type {
  DecodedImage,
  EncodedImage,
  OutputFormat,
  TargetSizeOptions,
  TargetSizeResult,
} from './types';

const MIN_DIMENSION = 300;
const RESIZE_STEP = 0.8;

interface QualityResult {
  achieved: boolean;
  quality: number;
  result: EncodedImage;
}

async function binarySearchQuality(
  image: DecodedImage,
  format: OutputFormat,
  targetBytes: number,
): Promise<QualityResult> {
  const lowest = await encodeImage(image, format, 1);
  if (lowest.buffer.byteLength > targetBytes) {
    return { achieved: false, quality: 1, result: lowest };
  }
  let best: { quality: number; result: EncodedImage } = {
    quality: 1,
    result: lowest,
  };

  let lo = 1;
  let hi = 100;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const encoded = await encodeImage(image, format, mid);
    if (encoded.buffer.byteLength <= targetBytes) {
      best = { quality: mid, result: encoded };
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return { achieved: true, quality: best.quality, result: best.result };
}

function resolveFormats(format: OutputFormat, sourceFormat: string): OutputFormat[] {
  if (format !== 'auto') return [format];
  if (sourceFormat === 'jpeg') return ['jpeg'];
  return ['webp', 'jpeg'];
}

export async function compressToTargetSize(
  buffer: ArrayBuffer,
  mimeType: string,
  targetKB: number,
  options: TargetSizeOptions,
): Promise<TargetSizeResult> {
  const targetBytes = targetKB * 1024;
  const decoded = await decodeBuffer(buffer, mimeType);

  let currentImage = decoded;
  let resized = false;
  const formats = resolveFormats(options.format, decoded.format);

  const buildMinimumResult = async (image: DecodedImage, resizedFlag: boolean) => {
    const encoded = await encodeImage(image, formats[0], 1);
    return {
      buffer: encoded.buffer,
      mimeType: encoded.mimeType,
      extension: encoded.extension,
      byteLength: encoded.buffer.byteLength,
      targetReached: false,
      qualityUsed: 1,
      width: image.width,
      height: image.height,
      resized: resizedFlag,
      originalByteLength: buffer.byteLength,
    };
  };

  while (true) {
    for (const format of formats) {
      const qResult = await binarySearchQuality(currentImage, format, targetBytes);
      if (qResult.achieved) {
        const enc = qResult.result;
        return {
          buffer: enc.buffer,
          mimeType: enc.mimeType,
          extension: enc.extension,
          byteLength: enc.buffer.byteLength,
          targetReached: true,
          qualityUsed: qResult.quality,
          width: currentImage.width,
          height: currentImage.height,
          resized,
          originalByteLength: buffer.byteLength,
        };
      }
    }

    const minDim = Math.min(currentImage.width, currentImage.height);
    if (minDim <= MIN_DIMENSION) {
      return buildMinimumResult(currentImage, resized);
    }

    let nextWidth = Math.round(currentImage.width * RESIZE_STEP);
    let nextHeight = Math.round(currentImage.height * RESIZE_STEP);
    nextWidth = Math.max(nextWidth, MIN_DIMENSION);
    nextHeight = Math.max(nextHeight, MIN_DIMENSION);

    const resizeResult: ResizeResult = await resizeImage(
      currentImage,
      nextWidth,
      nextHeight,
    );
    if (!resizeResult.resized) {
      return buildMinimumResult(currentImage, resized);
    }
    currentImage = resizeResult.image;
    resized = true;
  }
}
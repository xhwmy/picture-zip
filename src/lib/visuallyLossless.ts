import { decodeBuffer, encodeImage, resizeImage } from './codecs';
import { computeSsim } from './ssim';
import type { CompressionOptions, CompressOutput, DecodedImage, EncodedImage } from './types';

export type PerceptualLevel = 'normal' | 'high' | 'maximum';

export const SSIM_THRESHOLDS: Record<PerceptualLevel, number> = {
  normal: 0.95,
  high: 0.97,
  maximum: 0.99,
};

export const PERCEPTUAL_MIN_QUALITY = 20;
export const PERCEPTUAL_MAX_QUALITY = 100;

const SSIM_SAMPLE_SIZE = 512;

function downsampleForSsim(image: DecodedImage): DecodedImage {
  const { width, height, data } = image;
  if (width <= SSIM_SAMPLE_SIZE && height <= SSIM_SAMPLE_SIZE) return image;
  const scale = Math.min(SSIM_SAMPLE_SIZE / width, SSIM_SAMPLE_SIZE / height);
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));
  const out = new Uint8ClampedArray(targetW * targetH * 4);
  for (let y = 0; y < targetH; y++) {
    const srcY = Math.min(height - 1, Math.floor(y / scale));
    for (let x = 0; x < targetW; x++) {
      const srcX = Math.min(width - 1, Math.floor(x / scale));
      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (y * targetW + x) * 4;
      out[dstIdx] = data[srcIdx];
      out[dstIdx + 1] = data[srcIdx + 1];
      out[dstIdx + 2] = data[srcIdx + 2];
      out[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return { data: out, width: targetW, height: targetH, format: image.format };
}

interface RoundTrip {
  encoded: EncodedImage;
  decoded: DecodedImage;
}

async function roundTrip(
  image: DecodedImage,
  format: CompressionOptions['format'],
  quality: number,
): Promise<RoundTrip> {
  const encoded = await encodeImage(image, format, quality);
  const decoded = await decodeBuffer(encoded.buffer, encoded.mimeType);
  return { encoded, decoded };
}

function buildOutput(
  encoded: EncodedImage,
  image: DecodedImage,
  qualityUsed: number,
  resized: boolean,
  originalByteLength: number,
): CompressOutput {
  return {
    buffer: encoded.buffer,
    mimeType: encoded.mimeType,
    extension: encoded.extension,
    byteLength: encoded.buffer.byteLength,
    width: image.width,
    height: image.height,
    qualityUsed,
    resized,
    originalByteLength,
  };
}

export interface VisuallyLosslessOptions extends CompressionOptions {
  perceptualLevel?: PerceptualLevel;
}

export async function compressVisuallyLossless(
  buffer: ArrayBuffer,
  mimeType: string,
  options: VisuallyLosslessOptions,
): Promise<CompressOutput> {
  const threshold = SSIM_THRESHOLDS[options.perceptualLevel ?? 'normal'];
  const decoded = await decodeBuffer(buffer, mimeType);
  const resized = await resizeImage(
    decoded,
    options.maxWidth,
    options.maxHeight,
    options.resizeMode,
  );
  const image = resized.image;
  const sampleImage = downsampleForSsim(image);

  const maxTrip = await roundTrip(image, options.format, PERCEPTUAL_MAX_QUALITY);
  const maxSsim = computeSsim(sampleImage, downsampleForSsim(maxTrip.decoded));
  if (maxSsim < threshold) {
    return buildOutput(
      maxTrip.encoded,
      image,
      PERCEPTUAL_MAX_QUALITY,
      resized.resized,
      buffer.byteLength,
    );
  }

  let lo = PERCEPTUAL_MIN_QUALITY;
  let hi = PERCEPTUAL_MAX_QUALITY;
  let best: RoundTrip | null = null;
  let bestQuality = PERCEPTUAL_MAX_QUALITY;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const trip = await roundTrip(image, options.format, mid);
    const ssim = computeSsim(sampleImage, downsampleForSsim(trip.decoded));
    if (ssim >= threshold) {
      best = trip;
      bestQuality = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }

  if (!best) {
    return buildOutput(
      maxTrip.encoded,
      image,
      PERCEPTUAL_MAX_QUALITY,
      resized.resized,
      buffer.byteLength,
    );
  }

  return buildOutput(best.encoded, image, bestQuality, resized.resized, buffer.byteLength);
}
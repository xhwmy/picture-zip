import { decodeBuffer, encodeImage, resizeImage } from './codecs';
import { computeSsim } from './ssim';
import type { CompressionOptions, CompressOutput, DecodedImage, EncodedImage } from './types';

export type PerceptualLevel = 'normal' | 'high' | 'maximum';

export const SSIM_THRESHOLDS: Record<PerceptualLevel, number> = {
  normal: 0.95,
  high: 0.97,
  maximum: 0.99,
};

export const PERCEPTUAL_MIN_QUALITY = 5;
export const PERCEPTUAL_MAX_QUALITY = 100;

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

  const maxTrip = await roundTrip(image, options.format, PERCEPTUAL_MAX_QUALITY);
  const maxSsim = computeSsim(image, maxTrip.decoded);
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
    const ssim = computeSsim(image, trip.decoded);
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
import { beforeEach, describe, expect, it, vi } from 'vitest';

const encodeImage = vi.fn();
const decodeBuffer = vi.fn();
const resizeImage = vi.fn();
const computeSsim = vi.fn();

vi.mock('./codecs', () => ({
  decodeBuffer,
  encodeImage,
  resizeImage,
  CodecError: class CodecError extends Error {},
}));

vi.mock('./ssim', () => ({
  computeSsim,
}));

const { compressVisuallyLossless, SSIM_THRESHOLDS, PERCEPTUAL_MIN_QUALITY, PERCEPTUAL_MAX_QUALITY } =
  await import('./visuallyLossless');

function decoded(w = 64, h = 64) {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h, format: 'png' as const };
}

describe('SSIM_THRESHOLDS', () => {
  it('maps levels to increasing thresholds', () => {
    expect(SSIM_THRESHOLDS.normal).toBe(0.95);
    expect(SSIM_THRESHOLDS.high).toBe(0.97);
    expect(SSIM_THRESHOLDS.maximum).toBe(0.99);
  });
});

describe('compressVisuallyLossless binary search', () => {
  beforeEach(() => {
    encodeImage.mockReset();
    decodeBuffer.mockReset();
    resizeImage.mockReset();
    computeSsim.mockReset();
    decodeBuffer.mockResolvedValue(decoded());
    resizeImage.mockImplementation(async (image) => ({ image, resized: false }));
  });

  function mockSearch(minPassingQuality: number) {
    let lastQuality = 0;
    encodeImage.mockImplementation(async (_img: unknown, _fmt: unknown, q: number) => {
      lastQuality = q;
      return { buffer: new ArrayBuffer(1000 + q), mimeType: 'image/webp', extension: 'webp' };
    });
    computeSsim.mockImplementation(() =>
      lastQuality >= minPassingQuality ? 0.99 : 0.5,
    );
  }

  it('finds the lowest quality whose ssim meets the threshold', async () => {
    mockSearch(55);
    const result = await compressVisuallyLossless(new ArrayBuffer(10), 'image/png', {
      format: 'webp',
      quality: 75,
      perceptualLevel: 'high',
    });
    expect(result.qualityUsed).toBe(55);
    expect(result.byteLength).toBe(1000 + 55);
    expect(result.mimeType).toBe('image/webp');
    expect(result.resized).toBe(false);
  });

  it('returns min quality when everything passes', async () => {
    mockSearch(PERCEPTUAL_MIN_QUALITY);
    const result = await compressVisuallyLossless(new ArrayBuffer(10), 'image/png', {
      format: 'webp',
      quality: 75,
      perceptualLevel: 'normal',
    });
    expect(result.qualityUsed).toBe(PERCEPTUAL_MIN_QUALITY);
  });

  it('falls back to max quality when nothing meets the threshold', async () => {
    encodeImage.mockImplementation(async (_img: unknown, _fmt: unknown, q: number) => ({
      buffer: new ArrayBuffer(1000 + q),
      mimeType: 'image/webp',
      extension: 'webp',
    }));
    computeSsim.mockReturnValue(0.5);
    const result = await compressVisuallyLossless(new ArrayBuffer(10), 'image/png', {
      format: 'webp',
      quality: 75,
      perceptualLevel: 'maximum',
    });
    expect(result.qualityUsed).toBe(PERCEPTUAL_MAX_QUALITY);
    expect(result.byteLength).toBe(1000 + PERCEPTUAL_MAX_QUALITY);
  });

  it('defaults to normal level when perceptualLevel is omitted', async () => {
    mockSearch(40);
    const result = await compressVisuallyLossless(new ArrayBuffer(10), 'image/png', {
      format: 'webp',
      quality: 75,
    });
    expect(result.qualityUsed).toBe(40);
  });

  it('passes resize options through and reports resized flag', async () => {
    mockSearch(55);
    const resizedImage = { ...decoded(32, 32), format: 'png' as const };
    resizeImage.mockResolvedValue({ image: resizedImage, resized: true });
    await compressVisuallyLossless(new ArrayBuffer(10), 'image/png', {
      format: 'webp',
      quality: 75,
      maxWidth: 32,
      maxHeight: 32,
      resizeMode: 'fit',
    });
    expect(resizeImage).toHaveBeenCalledWith(
      expect.objectContaining({ width: 64, height: 64 }),
      32,
      32,
      'fit',
    );
  });
});
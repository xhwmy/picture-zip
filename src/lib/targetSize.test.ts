import { beforeEach, describe, expect, it, vi } from 'vitest';

const encodeImage = vi.fn();
const decodeBuffer = vi.fn();
const resizeImage = vi.fn();

vi.mock('./codecs', () => ({
  decodeBuffer,
  encodeImage,
  resizeImage,
  CodecError: class CodecError extends Error {},
}));

const { compressToTargetSize } = await import('./targetSize');

function decoded(w = 100, h = 100) {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h, format: 'png' as const };
}

// size = 5000 + quality * 950  (q=1 -> 5950, q=100 -> 100000), monotonic increasing
// (higher quality => larger file, as in real image encoding)
function sizeAtQuality(q: number) {
  return 5000 + Math.round(q * 950);
}

describe('compressToTargetSize binary search', () => {
  beforeEach(() => {
    encodeImage.mockReset();
    decodeBuffer.mockReset();
    resizeImage.mockReset();
    decodeBuffer.mockResolvedValue(decoded());
    resizeImage.mockImplementation(async (image) => ({ image, resized: false }));
  });

  it('reaches target and returns the highest passing quality', async () => {
    encodeImage.mockImplementation(async (_img: unknown, _fmt: unknown, q: number) => ({
      buffer: new ArrayBuffer(sizeAtQuality(q)),
      mimeType: 'image/webp',
      extension: 'webp',
    }));

    const result = await compressToTargetSize(new ArrayBuffer(10), 'image/png', 50, {
      format: 'webp',
    });

    expect(result.targetReached).toBe(true);
    expect(result.byteLength).toBeLessThanOrEqual(50 * 1024);
    // quality should be the highest that still fits
    expect(result.qualityUsed).toBeGreaterThanOrEqual(1);
    expect(sizeAtQuality(result.qualityUsed)).toBeLessThanOrEqual(50 * 1024);
    expect(sizeAtQuality(result.qualityUsed + 1)).toBeGreaterThan(50 * 1024);
  });

  it('hits max quality when target is very loose', async () => {
    encodeImage.mockImplementation(async (_img: unknown, _fmt: unknown, q: number) => ({
      buffer: new ArrayBuffer(sizeAtQuality(q)),
      mimeType: 'image/webp',
      extension: 'webp',
    }));

    const result = await compressToTargetSize(new ArrayBuffer(10), 'image/png', 200, {
      format: 'webp',
    });

    expect(result.targetReached).toBe(true);
    expect(result.qualityUsed).toBe(100);
  });

  it('returns targetReached=false when target is unreachable', async () => {
    encodeImage.mockImplementation(async (_img: unknown, _fmt: unknown, q: number) => ({
      buffer: new ArrayBuffer(sizeAtQuality(q)),
      mimeType: 'image/webp',
      extension: 'webp',
    }));

    const result = await compressToTargetSize(new ArrayBuffer(10), 'image/png', 1, {
      format: 'webp',
    });

    expect(result.targetReached).toBe(false);
  });
});
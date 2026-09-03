import { describe, expect, it } from 'vitest';
import { computeSsim } from './ssim';

function makeImage(width: number, height: number, fill: (x: number, y: number) => [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = fill(x, y);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  return { data, width, height };
}

function gradient(width: number, height: number) {
  return makeImage(width, height, (x, y) => [(x * 255) / width, (y * 255) / height, 128, 255]);
}

describe('computeSsim', () => {
  it('returns 1 for identical images', () => {
    const img = gradient(64, 64);
    expect(computeSsim(img, img)).toBeCloseTo(1, 10);
  });

  it('returns very low ssim for black vs white', () => {
    const black = makeImage(64, 64, () => [0, 0, 0, 255]);
    const white = makeImage(64, 64, () => [255, 255, 255, 255]);
    const ssim = computeSsim(black, white);
    expect(ssim).toBeLessThan(0.01);
    expect(ssim).toBeGreaterThanOrEqual(0);
  });

  it('returns high ssim for slightly noised image', () => {
    const base = gradient(64, 64);
    const noised = makeImage(64, 64, (x, y) => {
      const i = (y * 64 + x) * 4;
      return [base.data[i] + 1, base.data[i + 1] + 1, base.data[i + 2], 255];
    });
    const ssim = computeSsim(base, noised);
    expect(ssim).toBeGreaterThan(0.99);
    expect(ssim).toBeLessThanOrEqual(1);
  });

  it('returns lower ssim for strongly degraded image', () => {
    const base = gradient(64, 64);
    const quantized = makeImage(64, 64, (x, y) => {
      const i = (y * 64 + x) * 4;
      const q = (v: number) => Math.round(v / 32) * 32;
      return [q(base.data[i]), q(base.data[i + 1]), q(base.data[i + 2]), 255];
    });
    const noised = makeImage(64, 64, (x, y) => {
      const i = (y * 64 + x) * 4;
      return [base.data[i] + 1, base.data[i + 1] + 1, base.data[i + 2], 255];
    });
    expect(computeSsim(base, quantized)).toBeLessThan(computeSsim(base, noised));
  });

  it('handles dimensions that are not multiples of the block size', () => {
    const img = gradient(10, 10);
    expect(computeSsim(img, img)).toBeCloseTo(1, 10);
  });

  it('throws on dimension mismatch', () => {
    const a = gradient(64, 64);
    const b = gradient(32, 64);
    expect(() => computeSsim(a, b)).toThrow();
  });

  it('throws on empty image', () => {
    const empty = makeImage(0, 0, () => [0, 0, 0, 0]);
    expect(() => computeSsim(empty, empty)).toThrow();
  });
});
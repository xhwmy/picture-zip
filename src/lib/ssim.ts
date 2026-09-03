export interface SsimInput {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

function toGrayscale(image: SsimInput): Float64Array {
  const { data, width, height } = image;
  const gray = new Float64Array(width * height);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }
  return gray;
}

export function computeSsim(a: SsimInput, b: SsimInput): number {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error('ssim: image dimensions must match');
  }
  if (a.width === 0 || a.height === 0) {
    throw new Error('ssim: image must not be empty');
  }

  const { width, height } = a;
  const grayA = toGrayscale(a);
  const grayB = toGrayscale(b);

  const C1 = (0.01 * 255) ** 2;
  const C2 = (0.03 * 255) ** 2;
  const BLOCK = 8;

  let totalSsim = 0;
  let blockCount = 0;

  for (let by = 0; by + BLOCK <= height; by += BLOCK) {
    for (let bx = 0; bx + BLOCK <= width; bx += BLOCK) {
      let sumA = 0;
      let sumB = 0;
      for (let y = by; y < by + BLOCK; y++) {
        const row = y * width;
        for (let x = bx; x < bx + BLOCK; x++) {
          sumA += grayA[row + x];
          sumB += grayB[row + x];
        }
      }
      const n = BLOCK * BLOCK;
      const meanA = sumA / n;
      const meanB = sumB / n;

      let varA = 0;
      let varB = 0;
      let covAB = 0;
      for (let y = by; y < by + BLOCK; y++) {
        const row = y * width;
        for (let x = bx; x < bx + BLOCK; x++) {
          const da = grayA[row + x] - meanA;
          const db = grayB[row + x] - meanB;
          varA += da * da;
          varB += db * db;
          covAB += da * db;
        }
      }
      varA /= n - 1;
      varB /= n - 1;
      covAB /= n - 1;

      const ssim =
        ((2 * meanA * meanB + C1) * (2 * covAB + C2)) /
        ((meanA * meanA + meanB * meanB + C1) * (varA + varB + C2));
      totalSsim += ssim;
      blockCount++;
    }
  }

  return blockCount > 0 ? totalSsim / blockCount : 1;
}
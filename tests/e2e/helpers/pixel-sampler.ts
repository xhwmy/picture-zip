import { expect } from '@playwright/test';

export interface PixelSampler {
  sampleAlpha(buffer: ArrayBuffer, mimeType: string, points: Array<[number, number]>): Promise<number[]>;
  assertTransparentAt(buffer: ArrayBuffer, mimeType: string, points: Array<[number, number]>): Promise<void>;
}

export function createPixelSampler(): PixelSampler {
  return {
    async sampleAlpha(buffer: ArrayBuffer, mimeType: string, points: Array<[number, number]>): Promise<number[]> {
      const blob = new Blob([buffer], { type: mimeType });
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Cannot get 2d context');
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const alphas: number[] = [];
      for (const [x, y] of points) {
        const idx = (y * imageData.width + x) * 4 + 3;
        alphas.push(imageData.data[idx]);
      }
      return alphas;
    },

    async assertTransparentAt(buffer: ArrayBuffer, mimeType: string, points: Array<[number, number]>) {
      const alphas = await this.sampleAlpha(buffer, mimeType, points);
      for (let i = 0; i < points.length; i++) {
        const [x, y] = points[i];
        expect(alphas[i], `Pixel at (${x}, ${y}) should be transparent (alpha=0), got alpha=${alphas[i]}`).toBe(0);
      }
    },
  };
}
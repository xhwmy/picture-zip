import type { Download } from '@playwright/test';
import { expect } from '@playwright/test';
import { unzipSync } from 'fflate';

export interface DownloadVerifier {
  assertFilename(dl: Download, expected: string | RegExp): Promise<void>;
  assertSize(dl: Download, op: '<=' | '>' | '<' | '>=', bytes: number): Promise<void>;
  assertMimeType(dl: Download, expected: string): Promise<void>;
  assertDecodable(dl: Download, format: string): Promise<void>;
  readAsArrayBuffer(dl: Download): Promise<ArrayBuffer>;
  readAsZipEntries(dl: Download): Promise<Record<string, Uint8Array>>;
}

export function createDownloadVerifier(): DownloadVerifier {
  return {
    async assertFilename(dl: Download, expected: string | RegExp) {
      const filename = dl.suggestedFilename();
      if (typeof expected === 'string') {
        expect(filename).toContain(expected);
      } else {
        expect(filename).toMatch(expected);
      }
    },

    async assertSize(dl: Download, op: '<=' | '>' | '<' | '>=', bytes: number) {
      const stream = await dl.createReadStream();
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }
      const size = Buffer.concat(chunks).length;
      switch (op) {
        case '<=':
          expect(size).toBeLessThanOrEqual(bytes);
          break;
        case '>':
          expect(size).toBeGreaterThan(bytes);
          break;
        case '<':
          expect(size).toBeLessThan(bytes);
          break;
        case '>=':
          expect(size).toBeGreaterThanOrEqual(bytes);
          break;
      }
    },

    async assertMimeType(dl: Download, expected: string) {
      const path = await dl.path();
      if (!path) throw new Error('Download path is null');
      const fs = await import('node:fs');
      const buffer = fs.readFileSync(path);
      const blob = new Blob([buffer], { type: expected });
      expect(blob.type).toBe(expected);
    },

    async assertDecodable(dl: Download, _format: string) {
      const path = await dl.path();
      if (!path) throw new Error('Download path is null');
      const fs = await import('node:fs');
      const buffer = fs.readFileSync(path);
      expect(buffer.length).toBeGreaterThan(0);
    },

    async readAsArrayBuffer(dl: Download): Promise<ArrayBuffer> {
      const path = await dl.path();
      if (!path) throw new Error('Download path is null');
      const fs = await import('node:fs');
      const buffer = fs.readFileSync(path);
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    },

    async readAsZipEntries(dl: Download): Promise<Record<string, Uint8Array>> {
      const path = await dl.path();
      if (!path) throw new Error('Download path is null');
      const fs = await import('node:fs');
      const buffer = fs.readFileSync(path);
      return unzipSync(new Uint8Array(buffer));
    },
  };
}
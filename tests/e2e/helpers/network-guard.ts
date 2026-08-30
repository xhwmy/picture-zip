import type { Page, Route } from '@playwright/test';

export interface NetworkViolation {
  url: string;
  method: string;
  hasImageMagic: boolean;
  nonWhitelisted: boolean;
}

export interface NetworkGuard {
  attach(page: Page): Promise<void>;
  assertNoImageUpload(): void;
  getViolations(): NetworkViolation[];
}

const IMAGE_MAGIC = [
  { bytes: [0xff, 0xd8], name: 'JPEG' },
  { bytes: [0x89, 0x50, 0x4e, 0x47], name: 'PNG' },
  { bytes: [0x47, 0x49, 0x46], name: 'GIF' },
  { bytes: [0x52, 0x49, 0x46, 0x46], name: 'WebP/RIFF' },
];

function hasImageMagic(body: Buffer): boolean {
  for (const sig of IMAGE_MAGIC) {
    if (body.length >= sig.bytes.length) {
      let match = true;
      for (let i = 0; i < sig.bytes.length; i++) {
        if (body[i] !== sig.bytes[i]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
  }
  return false;
}

export function createNetworkGuard(whitelist: RegExp[] = [/^\//, /\/api\/send\//, /\/_astro\//]): NetworkGuard {
  const violations: NetworkViolation[] = [];

  return {
    async attach(page: Page) {
      await page.route('**/*', async (route: Route) => {
        const request = route.request();
        const url = request.url();
        const method = request.method();
        const postData = request.postDataBuffer();

        const isWhitelisted = whitelist.some((pattern) => pattern.test(new URL(url).pathname));
        const imageInBody = postData ? hasImageMagic(postData) : false;

        if (!isWhitelisted || imageInBody) {
          violations.push({
            url,
            method,
            hasImageMagic: imageInBody,
            nonWhitelisted: !isWhitelisted,
          });
        }

        await route.continue();
      });
    },

    assertNoImageUpload() {
      if (violations.length > 0) {
        const details = violations
          .map((v) => `  ${v.method} ${v.url} (imageMagic=${v.hasImageMagic}, nonWhitelisted=${v.nonWhitelisted})`)
          .join('\n');
        throw new Error(`Network violations detected (${violations.length}):\n${details}`);
      }
    },

    getViolations() {
      return [...violations];
    },
  };
}
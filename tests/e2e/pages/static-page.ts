import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export interface StaticPage {
  goto(path: string): Promise<void>;
  assertTitle(text: string | RegExp): Promise<void>;
  assertContainsText(text: string): Promise<void>;
  assertStatusCode200(): Promise<void>;
  getLang(): Promise<string>;
}

export function createStaticPage(page: Page): StaticPage {
  return {
    async goto(path: string) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
    },

    async assertTitle(text: string | RegExp) {
      await expect(page.locator('title')).toHaveText(text);
    },

    async assertContainsText(text: string) {
      await expect(page.locator('body')).toContainText(text);
    },

    async assertStatusCode200() {
      const url = page.url();
      const response = await page.goto(url);
      expect(response?.status()).toBe(200);
    },

    async getLang(): Promise<string> {
      const lang = await page.locator('html').getAttribute('lang');
      return lang ?? '';
    },
  };
}
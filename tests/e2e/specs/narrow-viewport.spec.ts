import { test, expect } from '@playwright/test';

const NARROW_WIDTHS = [320, 375, 390];

test.describe('窄屏视口无横向溢出', () => {
  for (const width of NARROW_WIDTHS) {
    test(`/${width}px 视口访问 / 无横向溢出`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(width);
      const demoOverflow = await page.evaluate(() => {
        const demo = document.querySelector('.hero__demo');
        if (!demo) return 0;
        return demo.scrollWidth - demo.clientWidth;
      });
      expect(demoOverflow).toBeLessThanOrEqual(0);
    });

    test(`/${width}px 视口访问 /zh/ 无横向溢出`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/zh/');
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(width);
      const demoOverflow = await page.evaluate(() => {
        const demo = document.querySelector('.hero__demo');
        if (!demo) return 0;
        return demo.scrollWidth - demo.clientWidth;
      });
      expect(demoOverflow).toBeLessThanOrEqual(0);
    });
  }
});
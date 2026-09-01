import { test, expect } from '@playwright/test';

test.describe('SEO 元数据一致性', () => {
  test('英文页 html lang 为 en-US', async ({ page }) => {
    await page.goto('/');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('en-US');
  });

  test('中文页 html lang 为 zh-CN', async ({ page }) => {
    await page.goto('/zh/');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('zh-CN');
  });

  test('英文页 hreflang 含 en-US zh-CN x-default', async ({ page }) => {
    await page.goto('/');
    const hreflangs = await page.locator('link[rel=alternate]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('hreflang')),
    );
    expect(hreflangs).toContain('en-US');
    expect(hreflangs).toContain('zh-CN');
    expect(hreflangs).toContain('x-default');
  });

  test('中文页 hreflang 含 en-US zh-CN x-default', async ({ page }) => {
    await page.goto('/zh/');
    const hreflangs = await page.locator('link[rel=alternate]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('hreflang')),
    );
    expect(hreflangs).toContain('en-US');
    expect(hreflangs).toContain('zh-CN');
    expect(hreflangs).toContain('x-default');
  });

  test('og:image 为绝对 URL 且为 PNG', async ({ page }) => {
    await page.goto('/');
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage).toMatch(/^https:\/\/picture-zip\.com\//);
    expect(ogImage).toMatch(/\.png$/);
  });
});
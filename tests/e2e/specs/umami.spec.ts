import { test, expect } from '@playwright/test';

test.describe('Umami 统计脚本', () => {
  test('未设 PUBLIC_UMAMI_WEBSITE_ID 时不加载 Umami 脚本', async ({ page }) => {
    await page.goto('/');
    const umamiScript = page.locator('script[data-website-id]');
    await expect(umamiScript).toHaveCount(0);
  });

  test('未设 PUBLIC_UMAMI_WEBSITE_ID 时 /zh/ 也不加载 Umami 脚本', async ({ page }) => {
    await page.goto('/zh/');
    const umamiScript = page.locator('script[data-website-id]');
    await expect(umamiScript).toHaveCount(0);
  });
});
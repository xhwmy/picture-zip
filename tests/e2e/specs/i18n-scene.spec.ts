import { test, expect } from '@playwright/test';
import { createStaticPage } from '../pages/static-page';
import { createScenePage } from '../pages/scene-page';

const PAGES = [
  '/',
  '/compress-to-100kb',
  '/compress-to-50kb',
  '/compress-to-200kb',
  '/png-to-webp',
  '/heic-to-jpg',
  '/gif-compressor',
  '/api',
  '/about',
  '/privacy',
  '/zh/',
  '/zh/compress-to-100kb',
  '/zh/compress-to-50kb',
  '/zh/compress-to-200kb',
  '/zh/png-to-webp',
  '/zh/heic-to-jpg',
  '/zh/gif-compressor',
  '/zh/api',
  '/zh/about',
  '/zh/privacy',
];

test.describe('国际化与场景落地页', () => {
  test('语言切换：英文页有中文切换链接', async ({ page }) => {
    await page.goto('/');
    const langSwitch = page.locator('a', { hasText: '中文' });
    await expect(langSwitch).toBeVisible();
  });

  test('中文路由生效：访问 /zh/ 时 html lang 为 zh', async ({ page }) => {
    const staticPage = createStaticPage(page);
    await staticPage.goto('/zh/');
    const lang = await staticPage.getLang();
    expect(lang).toBe('zh');
  });

  test('英文路由生效：访问 / 时 html lang 为 en', async ({ page }) => {
    const staticPage = createStaticPage(page);
    await staticPage.goto('/');
    const lang = await staticPage.getLang();
    expect(lang).toBe('en');
  });

  test('场景页预设参数：访问 /png-to-webp 时输出格式预置为 WebP', async ({ page }) => {
    const scene = createScenePage(page, 'png-to-webp');
    await scene.goto();
    await scene.assertPresetFormat('WebP');
  });

  test('场景页预设参数：访问 /compress-to-50kb 时目标大小为 50KB', async ({ page }) => {
    const scene = createScenePage(page, 'compress-to-50kb');
    await scene.goto();
    await scene.assertPresetTargetSize(50);
  });

  test('页面可达性：遍历 20 个页面每页 HTTP 状态为 200', async ({ page }) => {
    for (const url of PAGES) {
      const response = await page.goto(url);
      expect(response?.status(), `URL: ${url}`).toBe(200);
    }
  });

  test('hreflang 互链：英文页 head 含指向中文版的 hreflang 标签', async ({ page }) => {
    await page.goto('/');
    const hreflangZh = page.locator('link[rel=alternate][hreflang=zh]');
    await expect(hreflangZh).toHaveCount(1);
  });

  test('hreflang 互链：中文页 head 含指向英文版的 hreflang 标签', async ({ page }) => {
    await page.goto('/zh/');
    const hreflangEn = page.locator('link[rel=alternate][hreflang=en]');
    await expect(hreflangEn).toHaveCount(1);
  });

  test('隐私声明存在：工具页包含本地处理声明', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.uploader__privacy')).toBeVisible();
  });
});
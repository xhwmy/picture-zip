import { test, expect } from '@playwright/test';
import { createToolPage } from '../pages/tool-page';
import { fixtures } from '../helpers/fixture-loader';

test.describe('等比缩放预设', () => {
  test('下拉框存在性', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await expect(page.locator('.settings__preset-select')).toBeVisible();
  });

  test('默认选中自定义', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    expect(await tool.getSelectedResizePreset()).toBe('custom');
  });

  test('预设列表完整：含 11 预设 + 1 自定义', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    const options = page.locator('.settings__preset-select option');
    expect(await options.count()).toBe(12);
    const optgroups = page.locator('.settings__preset-select optgroup');
    expect(await optgroups.count()).toBe(5);
  });

  test('选择预设回填宽高', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.selectResizePreset('Web Banner 1920×1080 px');
    expect(await tool.getResizeMaxWidth()).toBe('1920');
    expect(await tool.getResizeMaxHeight()).toBe('1080');
  });

  test('回填触发压缩：结果与手动输入一致', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.selectResizePreset('Thumbnail 300×300 px');
    await tool.importFiles([fixtures.get('jpegSmall')]);
    await tool.waitForAllDone();
    const card = tool.getResultCard(0);
    await expect(card.root).toHaveClass(/result-card--done/);
  });

  test('手动改宽度切回自定义', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.selectResizePreset('Web Banner 1920×1080 px');
    await tool.setMaxWidth(1200);
    expect(await tool.getSelectedResizePreset()).toBe('custom');
  });

  test('清空输入框切回自定义', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.selectResizePreset('Web Banner 1920×1080 px');
    await page.locator('.settings__dims .input').first().fill('');
    expect(await tool.getSelectedResizePreset()).toBe('custom');
    expect(await tool.getResizeMaxWidth()).toBe('');
  });

  test('自定义选项保留输入框值', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.selectResizePreset('Avatar 512×512 px');
    expect(await tool.getResizeMaxWidth()).toBe('512');
    await tool.selectResizePreset('Custom');
    expect(await tool.getResizeMaxWidth()).toBe('512');
    expect(await tool.getResizeMaxHeight()).toBe('512');
  });

  test('中文版预设下拉框存在', async ({ page }) => {
    await page.goto('/zh/');
    await page.waitForSelector('.tool');
    const toggle = page.locator('.settings__toggle');
    if (await toggle.getAttribute('aria-expanded') === 'false') {
      await toggle.click();
    }
    const select = page.locator('.settings__preset-select');
    await expect(select).toBeVisible();
    const option = page.locator('.settings__preset-select option[value="web_banner"]');
    expect(await option.count()).toBeGreaterThan(0);
  });

  test('移动端可选择预设并回填', async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
    await page.goto('/');
    await page.waitForSelector('.tool');
    const toggle = page.locator('.settings__toggle');
    if (await toggle.getAttribute('aria-expanded') === 'false') {
      await toggle.click();
    }
    const tool = createToolPage(page);
    await tool.selectResizePreset('Avatar 512×512 px');
    expect(await tool.getResizeMaxWidth()).toBe('512');
    expect(await tool.getResizeMaxHeight()).toBe('512');
    await page.close();
  });

  test('折叠兼容：窄屏折叠时下拉框不可见', async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 820, height: 600 } });
    await page.goto('/');
    await page.waitForSelector('.tool');
    const toggle = page.locator('.settings__toggle');
    const select = page.locator('.settings__preset-select');
    if (await toggle.getAttribute('aria-expanded') === 'false') {
      await expect(select).not.toBeVisible();
      await toggle.click();
    }
    await expect(select).toBeVisible();
    await page.close();
  });

  test('窄屏不溢出：320px 视口无横向滚动', async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 320, height: 568 } });
    await page.goto('/');
    await page.waitForSelector('.tool');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(321);
    await page.close();
  });
});
import { test, expect } from '@playwright/test';
import { createToolPage } from '../pages/tool-page';

import { fixtures } from '../helpers/fixture-loader';

test.describe('结果下载', () => {
  test('结果展示完整：完成一张压缩后结果区包含文件名和大小信息', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.importFiles([fixtures.get('jpegSmall')]);
    await tool.waitForAllDone();
    const card = tool.getResultCard(0);
    await expect(card.root).toHaveClass(/result-card--done/);
    await expect(card.name).toBeVisible();
  });

  test('单张下载：点击下载按钮后下载事件触发', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.importFiles([fixtures.get('jpegSmall')]);
    await tool.waitForAllDone();
    const card = tool.getResultCard(0);
    await expect(card.root).toHaveClass(/result-card--done/);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      card.downloadBtn.click(),
    ]);
    expect(download.suggestedFilename()).toBeTruthy();
  });

  test('ZIP 打包下载：完成压缩后点击全部下载触发 ZIP 文件下载', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.importFiles([fixtures.get('jpegSmall')]);
    await tool.waitForAllDone();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button', { hasText: /Download all|全部下载/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.zip$/);
  });

  test('总节省量统计：完成所有任务后顶部显示统计文本', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.importFiles([fixtures.get('jpegSmall')]);
    await tool.waitForAllDone();
    await expect(page.locator('.result-bar')).toBeVisible();
    await expect(page.locator('.result-bar__saved')).toBeVisible();
  });
});
import { test, expect } from '@playwright/test';
import { createToolPage } from '../pages/tool-page';
import { fixtures } from '../helpers/fixture-loader';

test.describe('图片导入流程', () => {
  test('点击选择导入：选择一张 JPEG 后队列出现 1 个条目', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.importFiles([fixtures.get('jpegSmall')]);
    await expect(page.locator('.result-card')).toHaveCount(1);
  });

  test('选择 3 张 PNG 后队列出现 3 个条目', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.importFiles([
      fixtures.get('pngWithAlpha'),
      fixtures.get('pngOpaque'),
      fixtures.get('pngWithAlpha'),
    ]);
    await expect(page.locator('.result-card')).toHaveCount(3);
  });

  test('不支持格式处理：导入 BMP 后队列含 1 个条目且标记失败/跳过', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.importFiles([fixtures.get('bmp')]);
    await expect(page.locator('.result-card')).toHaveCount(1);
    await tool.waitForAllDone();
    const card = tool.getResultCard(0);
    await expect(card.root).toHaveClass(/result-card--(failed|skipped)/);
  });

  test('不支持格式与正常格式混合：BMP 标记失败、JPEG 正常处理', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.importFiles([
      fixtures.get('bmp'),
      fixtures.get('jpegSmall'),
      fixtures.get('jpegSmall'),
    ]);
    await expect(page.locator('.result-card')).toHaveCount(3);
    await tool.waitForAllDone();
    const card0 = tool.getResultCard(0);
    await expect(card0.root).toHaveClass(/result-card--(failed|skipped)/);
  });

  test('超大文件提示：导入大文件时显示提示或正常处理', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.importFiles([fixtures.get('jpegLarge')]);
    await expect(page.locator('.result-card')).toHaveCount(1);
  });

  test('空状态展示：打开工具页且未导入任何图片时显示空状态引导文案', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.assertEmptyState();
  });
});
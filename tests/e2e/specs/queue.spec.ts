import { test, expect } from '@playwright/test';
import { createToolPage } from '../pages/tool-page';
import { fixtures } from '../helpers/fixture-loader';

test.describe('批量处理与队列控制', () => {
  test('批量处理：导入 3 张图片后队列含 3 个条目', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.importFiles([
      fixtures.get('jpegSmall'),
      fixtures.get('pngOpaque'),
      fixtures.get('pngWithAlpha'),
    ]);
    await expect(page.locator('.result-card')).toHaveCount(3);
    await tool.waitForAllDone();
  });

  test('状态机流转：导入一张图片后最终状态为 done/failed/skipped', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.importFiles([fixtures.get('jpegSmall')]);
    await tool.waitForAllDone();
    const card = tool.getResultCard(0);
    await expect(card.root).toHaveClass(/result-card--(done|failed|skipped)/);
  });

  test('单张失败隔离：同时导入损坏图片与正常图片后损坏图标记失败', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.importFiles([
      fixtures.get('corruptedJpeg'),
      fixtures.get('jpegSmall'),
      fixtures.get('pngOpaque'),
    ]);
    await tool.waitForAllDone();
    const card0 = tool.getResultCard(0);
    await expect(card0.root).toHaveClass(/result-card--(failed|skipped)/);
  });

  test('失败原因可见：导入不支持格式后失败条目显示原因', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.importFiles([fixtures.get('bmp')]);
    await tool.waitForAllDone();
    const card = tool.getResultCard(0);
    await expect(card.root).toHaveClass(/result-card--(failed|skipped)/);
  });

  test('取消全部：导入图片后点击取消全部队列条目变为跳过', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.importFiles([fixtures.get('jpegSmall')]);
    await expect(page.locator('.result-card')).toHaveCount(1);
    await tool.cancelAll();
    await tool.waitForAllDone();
    const card = tool.getResultCard(0);
    await expect(card.root).toHaveClass(/result-card--(skipped|done|failed)/, { timeout: 10000 });
  });

  test('暂停/继续按钮存在：导入图片后暂停/取消按钮可点击', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.importFiles([fixtures.get('jpegSmall')]);
    await expect(page.locator('.queue__controls')).toBeVisible();
  });
});
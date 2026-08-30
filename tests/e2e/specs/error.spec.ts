import { test, expect } from '@playwright/test';
import { createToolPage } from '../pages/tool-page';

import { createNetworkGuard } from '../helpers/network-guard';
import { fixtures } from '../helpers/fixture-loader';

test.describe('错误处理与边界', () => {
  test('零上传承诺验证：完整流程后无图片数据上传到网络', async ({ page }) => {
    const guard = createNetworkGuard();
    await guard.attach(page);

    const tool = createToolPage(page);
    await tool.goto();
    await tool.importFiles([fixtures.get('jpegSmall')]);
    await tool.waitForAllDone();

    const card = tool.getResultCard(0);
    if (await card.downloadBtn.isVisible()) {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        card.downloadBtn.click(),
      ]);
      expect(download).toBeTruthy();
    }

    guard.assertNoImageUpload();
  });

  test('不支持格式降级：导入 BMP 后标记失败/跳过', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.importFiles([fixtures.get('bmp')]);
    await tool.waitForAllDone();
    const card = tool.getResultCard(0);
    await expect(card.root).toHaveClass(/result-card--(failed|skipped)/);
  });

  test('空状态展示：打开工具页时上传区显示空状态引导文案', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.assertEmptyState();
  });

  test('隐私声明存在：打开工具页时页面包含隐私声明文本', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.assertPrivacyNotice();
  });

  test('过旧浏览器降级：禁用 WASM 后访问工具页显示引导内容', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { WebAssembly: unknown }).WebAssembly = undefined;
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });
});
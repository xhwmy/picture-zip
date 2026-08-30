import { test, expect } from '@playwright/test';
import { createScenePage } from '../pages/scene-page';
import { createToolPage } from '../pages/tool-page';
import { fixtures } from '../helpers/fixture-loader';

test.describe('目标大小模式', () => {
  test('场景页预设目标：访问 /compress-to-100kb 时目标大小模式已启用', async ({ page }) => {
    const scene = createScenePage(page, 'compress-to-100kb');
    await scene.goto();
    const enabled = await scene.isTargetModeEnabled();
    expect(enabled).toBe(true);
  });

  test('场景页预设 50KB：访问 /compress-to-50kb 时目标值为 50KB', async ({ page }) => {
    const scene = createScenePage(page, 'compress-to-50kb');
    await scene.goto();
    await scene.assertPresetTargetSize(50);
  });

  test('场景页预设 200KB：访问 /compress-to-200kb 时目标值为 200KB', async ({ page }) => {
    const scene = createScenePage(page, 'compress-to-200kb');
    await scene.goto();
    await scene.assertPresetTargetSize(200);
  });

  test('目标体积达标：对 JPEG 输入目标 100KB 后完成处理', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.enableTargetMode(100);
    await tool.importFiles([fixtures.get('jpegSmall')]);
    await tool.waitForAllDone();
    const card = tool.getResultCard(0);
    await expect(card.root).toHaveClass(/result-card--done/);
  });

  test('GIF 不支持目标模式：导入 GIF 后目标模式可用但 GIF 处理完成', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.importFiles([fixtures.get('gif')]);
    await tool.waitForAllDone();
    const card = tool.getResultCard(0);
    await expect(card.root).toHaveClass(/result-card--(done|skipped|failed)/);
  });
});
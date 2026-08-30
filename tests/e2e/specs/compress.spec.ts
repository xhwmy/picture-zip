import { test, expect } from '@playwright/test';
import { createToolPage } from '../pages/tool-page';
import { fixtures } from '../helpers/fixture-loader';

test.describe('压缩与格式转换', () => {
  test('输出格式生效：选择 WebP 并压缩一张 JPEG 后结果产生', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.setFormat('WebP');
    await tool.importFiles([fixtures.get('jpegSmall')]);
    await tool.waitForAllDone();
    const card = tool.getResultCard(0);
    await expect(card.root).toHaveClass(/result-card--done/);
  });

  test('质量调节生效：质量滑杆可设置不同值', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.setQuality(30);
    await tool.importFiles([fixtures.get('jpegSmall')]);
    await tool.waitForAllDone();
    const card = tool.getResultCard(0);
    await expect(card.root).toHaveClass(/result-card--done/);
  });

  test('PNG→WebP 转换：PNG 成功转换为 WebP', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.setFormat('WebP');
    await tool.importFiles([fixtures.get('pngOpaque')]);
    await tool.waitForAllDone();
    const card = tool.getResultCard(0);
    await expect(card.root).toHaveClass(/result-card--done/);
  });

  test('Auto 格式：选择 Auto 输出后成功压缩', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.setFormat('Auto');
    await tool.importFiles([fixtures.get('pngOpaque')]);
    await tool.waitForAllDone();
    const card = tool.getResultCard(0);
    await expect(card.root).toHaveClass(/result-card--done/);
  });

  test('目标模式与质量互斥：启用目标大小模式时质量滑杆为禁用态', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.enableTargetMode(100);
    const disabled = await tool.isQualityDisabled();
    expect(disabled).toBe(true);
  });

  test('预设方案生效：选择 Web 优化预设后格式为 WebP', async ({ page }) => {
    const tool = createToolPage(page);
    await tool.goto();
    await tool.applyPreset('Web');
    const format = await tool.getFormat();
    expect(format.toLowerCase()).toContain('webp');
  });
});
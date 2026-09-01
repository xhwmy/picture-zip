import { test, expect } from '@playwright/test';

test.describe('CSP 合规与外部脚本', () => {
  test('HTML 中不存在内联事件处理属性', async ({ page }) => {
    await page.goto('/');
    const html = await page.content();
    expect(html).not.toMatch(/onclick=/);
    expect(html).not.toMatch(/onload=/);
    expect(html).not.toMatch(/onerror=/);
  });

  test('语言切换写入 localStorage 并跳转', async ({ page }) => {
    await page.goto('/');
    const langSwitch = page.locator('.site-nav--desktop .lang-switch');
    await expect(langSwitch).toBeVisible();
    await langSwitch.click();
    await page.waitForURL(/\/zh\//);
    const pref = await page.evaluate(() => localStorage.getItem('pz-lang-pref'));
    expect(pref).toBe('zh');
  });

  test('移动菜单键盘可操作', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');
    const toggle = page.locator('#menu-toggle');
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const menu = page.locator('#mobile-menu');
    await expect(menu).not.toHaveAttribute('hidden', '');
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('无 CSP 违规控制台消息', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Content-Security-Policy')) {
        violations.push(text);
      }
    });
    await page.goto('/');
    await page.waitForTimeout(1000);
    expect(violations).toEqual([]);
  });
});
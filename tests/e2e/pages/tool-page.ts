import type { Page, Locator, Download } from '@playwright/test';
import { expect } from '@playwright/test';

export interface ToolPage {
  goto(): Promise<void>;
  importFiles(filePaths: string[]): Promise<void>;
  dragDrop(filePaths: string[]): Promise<void>;
  setFormat(format: string): Promise<void>;
  setQuality(quality: number): Promise<void>;
  setMaxWidth(width: number): Promise<void>;
  enableTargetMode(kb: number): Promise<void>;
  disableTargetMode(): Promise<void>;
  applyPreset(preset: string): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  cancelAll(): Promise<void>;
  waitForStatus(index: number, status: string): Promise<void>;
  waitForAllDone(): Promise<void>;
  getResultCard(index: number): ResultCardLocators;
  download(index: number): Promise<Download>;
  downloadAllZip(): Promise<Download>;
  getQueueCount(): Promise<number>;
  getNoticeText(): Promise<string | null>;
  assertEmptyState(): Promise<void>;
  assertPrivacyNotice(): Promise<void>;
  getFormat(): Promise<string>;
  isQualityDisabled(): Promise<boolean>;
  isTargetModeEnabled(): Promise<boolean>;
}

export interface ResultCardLocators {
  root: Locator;
  name: Locator;
  sizes: Locator;
  origSize: Locator;
  targetBadge: Locator;
  error: Locator;
  downloadBtn: Locator;
  thumb: Locator;
}

export function createToolPage(page: Page): ToolPage {
  return {
    async goto() {
      await page.goto('/');
      await page.waitForSelector('.tool');
    },

    async importFiles(filePaths: string[]) {
      const input = page.locator('input[type=file][accept]').first();
      await input.setInputFiles(filePaths);
    },

    async dragDrop(filePaths: string[]) {
      const input = page.locator('input[type=file][accept]').first();
      await input.setInputFiles(filePaths);
    },

    async setFormat(format: string) {
      await page.locator('.segmented__item', { hasText: format }).first().click();
    },

    async setQuality(quality: number) {
      await page.locator('#quality').fill(String(quality));
    },

    async setMaxWidth(width: number) {
      const inputs = page.locator('.settings__dims .input');
      await inputs.first().fill(String(width));
    },

    async enableTargetMode(kb: number) {
      const checkbox = page.locator('.settings__target input[type=checkbox]');
      if (!(await checkbox.isChecked())) {
        await checkbox.check();
      }
      const targetInput = page.locator('.settings__target-input input');
      await targetInput.fill(String(kb));
    },

    async disableTargetMode() {
      const checkbox = page.locator('.settings__target input[type=checkbox]');
      if (await checkbox.isChecked()) {
        await checkbox.uncheck();
      }
    },

    async applyPreset(preset: string) {
      await page.locator('.preset', { hasText: preset }).first().click();
    },

    async pause() {
      await page.locator('.queue__controls button', { hasText: /Pause|暂停/ }).click();
    },

    async resume() {
      await page.locator('.queue__controls button', { hasText: /Resume|继续/ }).click();
    },

    async cancelAll() {
      await page.locator('.queue__controls button', { hasText: /Cancel all|全部取消/ }).click();
    },

    async waitForStatus(index: number, status: string) {
      const card = page.locator('.result-card').nth(index);
      await expect(card).toHaveClass(new RegExp(`result-card--${status}`));
    },

    async waitForAllDone() {
      const cards = page.locator('.result-card');
      const count = await cards.count();
      for (let i = 0; i < count; i++) {
        await expect(cards.nth(i)).toHaveClass(/result-card--(done|failed|skipped)/, { timeout: 60000 });
      }
    },

    getResultCard(index: number): ResultCardLocators {
      const root = page.locator('.result-card').nth(index);
      return {
        root,
        name: root.locator('.result-card__name'),
        sizes: root.locator('.result-card__sizes'),
        origSize: root.locator('.result-card__orig'),
        targetBadge: root.locator('.result-card__target'),
        error: root.locator('.result-card__error'),
        downloadBtn: root.locator('button', { hasText: /Download|下载/ }),
        thumb: root.locator('.result-card__thumb'),
      };
    },

    async download(index: number): Promise<Download> {
      const card = this.getResultCard(index);
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        card.downloadBtn.click(),
      ]);
      return download;
    },

    async downloadAllZip(): Promise<Download> {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('button', { hasText: /Download all|全部下载/ }).click(),
      ]);
      return download;
    },

    async getQueueCount(): Promise<number> {
      const cards = page.locator('.result-card');
      return cards.count();
    },

    async getNoticeText(): Promise<string | null> {
      const notice = page.locator('.uploader__notice');
      if (await notice.count() === 0) return null;
      return notice.textContent();
    },

    async assertEmptyState() {
      await expect(page.locator('.queue__empty')).toBeVisible();
    },

    async assertPrivacyNotice() {
      await expect(page.locator('.uploader__privacy')).toBeVisible();
    },

    async getFormat(): Promise<string> {
      const active = page.locator('.segmented__item--active');
      return (await active.textContent()) || '';
    },

    async isQualityDisabled(): Promise<boolean> {
      return page.locator('#quality').isDisabled();
    },

    async isTargetModeEnabled(): Promise<boolean> {
      return page.locator('.settings__target input[type=checkbox]').isChecked();
    },
  };
}
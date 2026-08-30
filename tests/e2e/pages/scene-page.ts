import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { createToolPage, type ToolPage } from './tool-page';

export interface ScenePage extends ToolPage {
  assertPresetFormat(format: string): Promise<void>;
  assertPresetTargetSize(kb: number): Promise<void>;
  assertTargetModeDisabled(): Promise<void>;
}

export function createScenePage(page: Page, scene: string): ScenePage {
  const toolPage = createToolPage(page);

  return {
    ...toolPage,

    async goto() {
      await page.goto(`/${scene}`);
      await page.waitForSelector('.tool');
    },

    async assertPresetFormat(format: string) {
      const active = page.locator('.segmented__item--active');
      await expect(active).toHaveText(format, { ignoreCase: true });
    },

    async assertPresetTargetSize(kb: number) {
      const checkbox = page.locator('.settings__target input[type=checkbox]');
      await expect(checkbox).toBeChecked();
      const targetInput = page.locator('.settings__target-input input');
      await expect(targetInput).toHaveValue(String(kb));
    },

    async assertTargetModeDisabled() {
      const checkbox = page.locator('.settings__target input[type=checkbox]');
      await expect(checkbox).toBeDisabled();
    },
  };
}
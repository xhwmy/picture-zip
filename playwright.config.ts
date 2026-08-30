import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const browsers = process.env.E2E_BROWSERS?.split(',').map((b) => b.trim()) || (isCI ? ['chromium', 'firefox', 'webkit'] : ['chromium']);

const projects: Array<{ name: string; use: Record<string, unknown> }> = [];
if (browsers.includes('chromium')) {
  projects.push({ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: isCI ? undefined : 'msedge' } });
}
if (browsers.includes('firefox')) {
  projects.push({ name: 'firefox', use: { ...devices['Desktop Firefox'] } });
}
if (browsers.includes('webkit')) {
  projects.push({ name: 'webkit', use: { ...devices['Desktop Safari'] } });
}
if (browsers.includes('iphone-13')) {
  projects.push({ name: 'iphone-13', use: { ...devices['iPhone 13'] } });
}
if (browsers.includes('pixel-5')) {
  projects.push({ name: 'pixel-5', use: { ...devices['Pixel 5'] } });
}

export default defineConfig({
  testDir: './tests/e2e/specs',
  fullyParallel: true,
  retries: 0,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['line'],
  ],
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    console: 'off',
    timeout: 30000,
  },
  projects,
  webServer: {
    command: 'pnpm preview --port 4321',
    port: 4321,
    reuseExistingServer: !isCI,
    timeout: 30000,
  },
});

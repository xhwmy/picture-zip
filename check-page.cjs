const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();

  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleMessages.push(`[PAGE ERROR] ${err.message}`));

  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  const toolExists = await page.locator('.tool').count();
  const dropzoneExists = await page.locator('.dropzone').count();
  const settingsExists = await page.locator('.settings').count();
  const queueExists = await page.locator('.queue').count();

  console.log('=== Page Check ===');
  console.log('.tool count:', toolExists);
  console.log('.dropzone count:', dropzoneExists);
  console.log('.settings count:', settingsExists);
  console.log('.queue count:', queueExists);
  console.log('\n=== Console Messages ===');
  consoleMessages.forEach(m => console.log(m));

  await page.screenshot({ path: 'page-check.png', fullPage: true });
  console.log('\nScreenshot saved');

  await browser.close();
})();
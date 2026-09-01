const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();
  await page.goto('http://localhost:4321/');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'page-screenshot.png', fullPage: true });
  console.log('Screenshot saved to page-screenshot.png');
  await browser.close();
})();
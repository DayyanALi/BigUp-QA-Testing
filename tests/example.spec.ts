import { test, expect } from '@playwright/test';

test('verify config.json cookies are working', async ({ page }) => {
  // 1. We navigate to the site 
  // (Playwright automatically injects the cookies from config.json before this happens because of our playwright.config.ts)
  await page.goto('https://stack-dev2.bigup.com/');

  // 2. We pause the test here. 
  // This will open the Playwright Inspector and keep the browser open. 
  // You can look at the browser window to visually confirm you are logged in!
  await page.pause();
});

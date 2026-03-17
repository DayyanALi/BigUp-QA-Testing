import { chromium } from '@playwright/test';
import path from 'path';

const authFile = path.resolve(__dirname, '../config.json');

async function saveAuthState() {
  // Launch a standard headed chromium window
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Go to BigUp
  await page.goto('https://stack-dev2.bigup.com/');

  console.log('\n--- ⚠️ ACTION REQUIRED ⚠️ ---');
  console.log('1. A Chromium browser has opened.');
  console.log('2. Manually log into your account using the Google Sign-in button.');
  console.log('3. Once you see the BigUp dashboard, come back here and click Resume in the Playwright window.');
  
  // Pause until you finish logging in manually
  await page.pause();

  // Save EVERYTHING (Local Storage + HTTPOnly Cookies) to config.json
  await context.storageState({ path: authFile });
  
  await browser.close();
  console.log('\n✅ Successfully saved complete HttpOnly cookies and Storage to config.json! ✅');
}

saveAuthState();

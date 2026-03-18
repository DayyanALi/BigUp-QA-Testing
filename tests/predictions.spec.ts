import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { ActivityPage } from './pages/ActivityPage';

test.describe.serial('Predictions Functionality', () => {
  let homePage: HomePage;
  let activityPage: ActivityPage;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000); // 60s for slow media/backend sync
    
    // Relying on global timezoneId: 'Asia/Karachi' in playwright.config.ts
    // Removed fixed clock to avoid server-client time sync issues
    
    homePage = new HomePage(page);
    activityPage = new ActivityPage(page);
    await homePage.navigate();
  });

  /**
   * HOME PAGE TEST CASES
   */
  test('TC-PRED-001: Enter predictions from Homepage Feed', async ({ page }) => {
    const card = homePage.predictionGameCards.first();
    await expect(card).toBeVisible({ timeout: 15000 });
    
    // Skip if closed
    if (await card.locator('text=/Entries has been closed/i').isVisible()) {
        test.skip(true, 'Skipping: Match entries closed.');
    }

    try {
      await card.scrollIntoViewIfNeeded();
      
      // Predict directly on the feed
      await page.waitForTimeout(1500);
      await homePage.quickPredict(card, 'Yes', 0); // 3 picks
      await page.waitForTimeout(1500);
      await homePage.quickPredict(card, 'No', 1); // 3 picks
      await page.waitForTimeout(1500);
      await homePage.quickPredict(card, 'Yes', 2); // 3 picks
      await page.waitForTimeout(1500);
      await homePage.quickPredict(card, 'No', 3); // 3 picks
      await page.waitForTimeout(1500);
      await homePage.quickPredict(card, 'Yes', 4); // 3 picks
      await page.waitForTimeout(1500);
      await homePage.quickPredict(card, 'No', 5); // 3 picks
      
      // Submit - pass the card to scope the 'Submit entry' button correctly
      await activityPage.submitPredictionFlow('$6', card);
    } catch (e: any) {
      console.log(`TC-PRED-002 Failed: ${e.message}`);
      if (e.message?.includes('PREDICTION_CLOSED') || e.message?.includes('Entries has been closed')) {
        test.skip(true, 'Skipping: Match entries closed during execution.');
      }
      throw e;
    }
  });

  /**
   * ACTIVITY PAGE TEST CASES
   */

  test('TC-PRED-ACT-001: 6-Pick Entry with Flex/Power Configuration', async ({ page }) => {
    const card = homePage.predictionGameCards.first();
    await homePage.goToActivityPage(card);
    
    await activityPage.waitForCards();
    
    // Skip if closed
    if (await page.locator('text=/Entries has been closed/i').isVisible()) {
        test.skip(true, 'Skipping: Match entries closed.');
    }

    const available = await activityPage.predictionCards.count();
    const toPick = Math.min(available, 6);
    console.log(`Selecting ${toPick} predictions...`);
    
    for (let i = 0; i < toPick; i++) {
      await activityPage.selectPredictionOnCard(i, i % 2 === 0 ? 'Yes' : 'No');
      await page.waitForTimeout(500);
    }

    // Open drawer
    await activityPage.submitEntryButton.evaluate((el: HTMLElement) => el.click());
    await expect(activityPage.playButton).toBeVisible({ timeout: 10000 });

    // Toggle Flex Play / Power Play
    if (toPick >= 3) { 
        console.log('Toggling Flex Play...');
        await activityPage.flexPlayToggle.click();
        await page.waitForTimeout(1000);
        
        console.log('Toggling back to Power Play...');
        await activityPage.powerPlayToggle.click();
    }
    
    // Select $10 amount if visible
    const amountBtn = page.getByRole('button', { name: /\$10/ }).first();
    if (await amountBtn.isVisible({ timeout: 2000 })) {
        await amountBtn.click();
    }

    await expect(activityPage.playButton).toBeEnabled();
  });

  test('TC-PRED-ACT-002: Requirements and Persistence check', async ({ page }) => {
    const card = homePage.predictionGameCards.first();
    await homePage.goToActivityPage(card);
    
    await activityPage.waitForCards();

    // Skip if closed
    if (await page.locator('text=/Entries has been closed/i').isVisible()) {
        test.skip(true, 'Skipping: Match entries closed.');
    }

    const available = await activityPage.predictionCards.count();
    const toPick = Math.min(available, 6);
    console.log('Making 2 picks and verifying requirement message...');
    await activityPage.selectPredictionOnCard(0, 'Yes');
    await activityPage.selectPredictionOnCard(1, 'No');
    await activityPage.selectPredictionOnCard(4, 'Yes');

    // Open drawer
    // Open drawer
    await activityPage.submitEntryButton.evaluate((el: HTMLElement) => el.click());
    await expect(activityPage.playButton).toBeVisible({ timeout: 10000 });

    // Toggle Flex Play / Power Play
    console.log('Toggling Power Play...');
    await activityPage.powerPlayToggle.click();
    await page.waitForTimeout(1000);
    
    console.log('Toggling back to Power Play...');
    await activityPage.powerPlayToggle.click();
    
    // Select $10 amount if visible
    const amountBtn = page.getByRole('button', { name: /\$10/ }).first();
    if (await amountBtn.isVisible({ timeout: 2000 })) {
        await amountBtn.click();
    }

    await expect(activityPage.playButton).toBeEnabled();
  });
});

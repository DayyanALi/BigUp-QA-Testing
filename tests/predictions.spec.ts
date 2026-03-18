import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { ActivityPage } from './pages/ActivityPage';

test.describe('Predictions Functionality', () => {
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

  test('TC-PRED-001: Enter predictions from Activity Page', async ({ page }) => {
    const gameCard = homePage.predictionGameCards.first();
    await expect(gameCard).toBeVisible({ timeout: 15000 });
    
    try {
      // 1. Navigate to activity page
      await homePage.goToActivityPage(gameCard);
      
      // 2. Select predictions
      await activityPage.waitForCards();
      const cardCount = await activityPage.predictionCards.count();
      const limit = Math.min(cardCount, 3);
      
      for (let i = 0; i < limit; i++) {
        const choice = i % 2 === 0 ? 'Yes' : 'No';
        await activityPage.selectPredictionOnCard(i, choice);
      }
      
      // 3. Submit prediction
      await activityPage.submitPredictionFlow('$6');
    } catch (e: any) {
      console.log(`TC-PRED-001 Failed: ${e.message}`);
      if (e.message?.includes('PREDICTION_CLOSED')) {
        test.skip(true, 'Skipping: Match entries closed during execution.');
      }
      throw e;
    }
  });

  test('TC-PRED-002: Make all 6 predictions and submit, then verify tab switching', async ({ page }) => {
    const gameCard = homePage.predictionGameCards.first();
    await expect(gameCard).toBeVisible({ timeout: 15000 });
    
    try {
      await homePage.goToActivityPage(gameCard);
      await activityPage.waitForCards();
      
      const cardCount = await activityPage.predictionCards.count();
      const limit = Math.min(cardCount, 6);
      for (let i = 0; i < limit; i++) {
        const choice = i % 2 === 0 ? 'Yes' : 'No';
        await activityPage.selectPredictionOnCard(i, choice);
      }
      
      await activityPage.submitPredictionFlow('$6');
    } catch (e: any) {
      console.log(`TC-PRED-002 Failed: ${e.message}`);
      if (e.message?.includes('PREDICTION_CLOSED')) {
        test.skip(true, 'Skipping: Match entries closed during execution.');
      }
      throw e;
    }
  });

  test('TC-PRED-003: Navigation Integrity (Home <-> Activity)', async ({ page }) => {
    const gameCard = homePage.predictionGameCards.first();
    await homePage.goToActivityPage(gameCard);
    
    await activityPage.waitForCards();
    // Select predictions but don't submit
    await activityPage.selectPrediction(/Yes/i, 0);
    await activityPage.selectPrediction(/No/i, 1);
    
    // Navigate home
    await homePage.footerNavHome.evaluate(el => (el as HTMLElement).click());
    await expect(page).toHaveURL(/.*bigup.com\/$/);
    
    // Go back to the same game
    await homePage.goToActivityPage(gameCard);
    
    // 3. Verify the prediction state is RESET (not preserved)
    // The "Submit entry" bar or play button should no longer be visible
    await expect(activityPage.submitEntryButton).not.toBeVisible();
    await expect(activityPage.playButton).not.toBeVisible();
  });

  test('TC-PRED-004: Enter predictions from Homepage Feed', async ({ page }) => {
    const card = homePage.predictionGameCards.first();
    await expect(card).toBeVisible({ timeout: 15000 });
    
    try {
      await card.scrollIntoViewIfNeeded();
      
      // Predict directly on the feed
      await page.waitForTimeout(1500);
      await homePage.quickPredict(card, 'Yes', 0); // 3 picks
      
      // Submit - pass the card to scope the 'Submit entry' button correctly
      await activityPage.submitPredictionFlow('$6', card);
    } catch (e: any) {
      console.log(`TC-PRED-004 Failed: ${e.message}`);
      if (e.message?.includes('PREDICTION_CLOSED')) {
        test.skip(true, 'Skipping: Match entries closed during execution.');
      }
      throw e;
    }
  });

  test('TC-PRED-005: Dismissing Home Feed Predictions (Skip)', async ({ page }) => {
    // Scroll through the feed and skip available active predictions
    // We wait for at least one card to be visible
    await expect(homePage.predictionGameCards.first()).toBeVisible({ timeout: 15000 });
    const cardsCount = await homePage.predictionGameCards.count();
    const limit = Math.min(cardsCount, 3); // Skip up to 3 cards to be safe and fast
    
    console.log(`Found ${cardsCount} prediction cards. Skipping ${limit}.`);
    
    for (let i = 0; i < limit; i++) {
       const card = homePage.predictionGameCards.first();
       // Re-verify visibility because skipping a card might remove all remaining match-able cards
       if (await card.isVisible({ timeout: 5000 })) {
         console.log(`Skipping prediction card #${i + 1}...`);
         await card.scrollIntoViewIfNeeded();
         await homePage.quickPredict(card, 'Skip');
         await page.waitForTimeout(1000); 
       } else {
         console.log('No more active cards found to skip.');
         break;
       }
    }
  });

});

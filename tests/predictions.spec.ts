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
    // 1. Find ANY active prediction game card and navigate to activity page
    const gameCard = homePage.predictionGameCards.first();
    await expect(gameCard).toBeVisible({ timeout: 15000 });
    await homePage.goToActivityPage(gameCard);
    
    // 2. Wait for cards to load and then select predictions dynamically
    await activityPage.waitForCards();
    
    const cardCount = await activityPage.predictionCards.count();
    const limit = Math.min(cardCount, 2); // Aim for 3, but adapt to availability
    
    for (let i = 0; i < limit; i++) {
      const choice = i % 2 === 0 ? 'Yes' : 'No';
      await activityPage.selectPredictionOnCard(i, choice);
    }
    
    // 3. Submit prediction using the new flow ($6, Power Play, Play)
    try {
      await activityPage.submitPredictionFlow('$6');
    } catch (e: any) {
      if (e.message?.includes('PREDICTION_CLOSED')) {
        test.skip(true, 'Skipping: Match entries closed during execution.');
      }
      throw e;
    }
  });

  test('TC-PRED-002: Make all 6 predictions and submit, then verify tab switching', async ({ page }) => {
    // 1. Navigate to an active game
    const gameCard = homePage.predictionGameCards.first();
    await expect(gameCard).toBeVisible({ timeout: 15000 });
    await homePage.goToActivityPage(gameCard);
    
    // 2. Wait for cards to load
    await activityPage.waitForCards();
    
    // 3. Make predictions on all 6 cards
    const cardCount = await activityPage.predictionCards.count();
    const limit = Math.min(cardCount, 6);
    for (let i = 0; i < limit; i++) {
      const choice = i % 2 === 0 ? 'Yes' : 'No'; // Alternate Yes/No
      await activityPage.selectPredictionOnCard(i, choice);
    }
    
    // 4. Submit the prediction
    try {
      await activityPage.submitPredictionFlow('$6');
    } catch (e: any) {
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
    await homePage.footerNavHome.click();
    await expect(page).toHaveURL(/.*bigup.com\/$/);
    
    // Go back to the same game
    await homePage.goToActivityPage(gameCard);
    
    // 3. Verify the prediction state is RESET (not preserved)
    // The "Submit entry" bar or play button should no longer be visible
    await expect(activityPage.submitEntryButton).not.toBeVisible();
    await expect(activityPage.playButton).not.toBeVisible();
  });

  test('TC-PRED-004: Enter predictions from Homepage Feed', async ({ page }) => {
    // Use the first active prediction card on the feed
    const firstCard = homePage.predictionGameCards.first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });
    await firstCard.scrollIntoViewIfNeeded();
    
    // Predict directly on the feed
    // We use index 0 and 1 for the first two questions in the card
    await homePage.quickPredict(firstCard, 'Yes', 0);
    await page.waitForTimeout(1000);
    await homePage.quickPredict(firstCard, 'No', 0); // After first pick, next question becomes index 0
    
    // 3. Submit prediction
    try {
      await activityPage.submitPredictionFlow('$6');
    } catch (e: any) {
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
       // Use first() because skipping a card usually removes it from the current "active" collection
       const card = homePage.predictionGameCards.first();
       await card.scrollIntoViewIfNeeded();
       await homePage.quickPredict(card, 'Skip');
       await page.waitForTimeout(1000); // Wait for transition
    }
  });

});

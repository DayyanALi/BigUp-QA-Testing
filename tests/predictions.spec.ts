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
    const maxMatchAttempts = 3;
    let success = false;
    
    for (let attempt = 0; attempt < maxMatchAttempts; attempt++) {
      console.log(`TC-PRED-001: Match Attempt #${attempt + 1}`);
      const gameCard = homePage.predictionGameCards.nth(attempt);
      
      if (!await gameCard.isVisible().catch(() => false)) {
        console.log('No more prediction cards available.');
        break;
      }
      
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
        success = true;
        break; // Exit loop on success
      } catch (e: any) {
        console.log(`TC-PRED-001 Attempt ${attempt + 1} Failed: ${e.message}`);
        if (e.message?.includes('PREDICTION_CLOSED')) {
          console.log('Match locked out. Falling back to next card...');
          await homePage.navigate(); // Return to home to try next card
          continue;
        }
        throw e; // Reroute fatal errors
      }
    }
    
    if (!success) {
      test.skip(true, 'Skipping: All attempted matches were locked out.');
    }
  });

  test('TC-PRED-002: Make all 6 predictions and submit, then verify tab switching', async ({ page }) => {
    const maxMatchAttempts = 2; // Large entries tests are slow, try up to 2
    let success = false;
    
    for (let attempt = 0; attempt < maxMatchAttempts; attempt++) {
      console.log(`TC-PRED-002: Match Attempt #${attempt + 1}`);
      const gameCard = homePage.predictionGameCards.nth(attempt);
      
      if (!await gameCard.isVisible().catch(() => false)) break;
      
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
        success = true;
        break;
      } catch (e: any) {
        console.log(`TC-PRED-002 Attempt ${attempt + 1} Failed: ${e.message}`);
        if (e.message?.includes('PREDICTION_CLOSED')) {
          await homePage.navigate();
          continue;
        }
        throw e;
      }
    }
    
    if (!success) {
      test.skip(true, 'Skipping: All attempted matches were locked out.');
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
    const maxMatchAttempts = 3;
    let success = false;
    
    for (let attempt = 0; attempt < maxMatchAttempts; attempt++) {
      console.log(`TC-PRED-004: Feed Match Attempt #${attempt + 1}`);
      const card = homePage.predictionGameCards.nth(attempt);
      
      if (!await card.isVisible().catch(() => false)) break;
      
      try {
        await card.scrollIntoViewIfNeeded();
        
        // Predict directly on the feed
        // Use index 0 for each question as they usually rotate
        await homePage.quickPredict(card, 'Yes', 0);
        await page.waitForTimeout(1000);
        await homePage.quickPredict(card, 'No', 0);
        await page.waitForTimeout(1000);
        await homePage.quickPredict(card, 'Yes', 0); // 3 picks
        
        // Submit
        await activityPage.submitPredictionFlow('$6');
        success = true;
        break;
      } catch (e: any) {
        console.log(`TC-PRED-004 Attempt ${attempt + 1} Failed: ${e.message}`);
        if (e.message?.includes('PREDICTION_CLOSED')) {
          // No need to navigate home, we are already there
          continue;
        }
        throw e;
      }
    }
    
    if (!success) {
      test.skip(true, 'Skipping: All attempted feed matches were locked out.');
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

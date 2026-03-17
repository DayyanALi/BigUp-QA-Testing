import { test, expect } from '@playwright/test';
import { QuestsPage } from './pages/QuestsPage';
import { HomePage } from './pages/HomePage';
import { ActivityPage } from './pages/ActivityPage';

test.describe('Quests Functionality', () => {
  let questsPage: QuestsPage;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000); // 60s for slow media/backend sync
    questsPage = new QuestsPage(page);
    await questsPage.navigate();
  });

  test('TC-QUEST-001: Verify Quests Hub loads and displays progress', async ({ page }) => {
    // Verify Page Title or Heading
    await expect(questsPage.questTitle).toBeVisible({ timeout: 10000 });
    
    // Verify that quest cards are loaded
    const count = await questsPage.questCards.count();
    expect(count).toBeGreaterThan(0);
    
    // Check for a specific common quest if existence can be assumed, 
    // or just verify that at least one card has progress indicator
    const firstProgress = questsPage.questProgress.first();
    await expect(firstProgress).toBeVisible();
  });

  test('TC-QUEST-002: Quest progress updates after performing a prediction', async ({ page }) => {
    const homePage = new HomePage(page);
    const activityPage = new ActivityPage(page);
    
    // 1. Identify a prediction-related quest and get initial progress
    // We look for quests that mention "Prediction" or "More" to find an active one
    const predictionQuest = questsPage.questCards.filter({ hasText: /Prediction|More/i }).first();
    await expect(predictionQuest).toBeVisible({ timeout: 15000 });
    
    // We use the pattern 'X of Y' which was verified by browser inspection
    // Adding .first() to handle cases where a card might have multiple milestone indicators
    const progressLocator = predictionQuest.locator('div').filter({ hasText: /\d+ of \d+/ }).first();
    const initialProgress = await progressLocator.innerText();
    console.log(`Initial Progress: ${initialProgress}`);

    // 2. Navigate to Home and perform a prediction via Activity Page (more reliable)
    await homePage.navigate();
    const gameCard = homePage.predictionGameCards.first();
    await expect(gameCard).toBeVisible({ timeout: 15000 });
    await homePage.goToActivityPage(gameCard);

    // Make 3 predictions in the activity page
    await activityPage.waitForCards();
    await activityPage.selectPredictionOnCard(0, 'Yes');
    await activityPage.selectPredictionOnCard(1, 'No');
    await activityPage.selectPredictionOnCard(2, 'Yes');
    
    // Submit prediction flow using the $6 strategy
    await activityPage.submitPredictionFlow('$6');
    
    // 3. Return to Quests and verify update
    await questsPage.navigate();
    await expect(predictionQuest).toBeVisible({ timeout: 15000 });
    
    // Verify that progress text has changed (indicating an increment)
    // Using an expect poll to wait for the backend to update if there's latency
    await expect(async () => {
      const newProgress = await progressLocator.innerText();
      console.log(`Current Progress: ${newProgress}`);
      expect(newProgress).not.toBe(initialProgress);
    }).toPass({ timeout: 15000 });
    
    console.log('Quest progress successfully updated!');
  });
});

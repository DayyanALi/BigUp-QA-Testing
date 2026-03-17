import { Page, Locator, expect } from '@playwright/test';

export class QuestsPage {
  readonly page: Page;
  readonly questCards: Locator;
  readonly questTitle: Locator;
  readonly questProgress: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Verified locators from browser inspection
    const contentContainer = this.page.locator('div[class*="contentContainerV2"]');
    this.questTitle = contentContainer.getByText('QUESTS', { exact: true }).or(this.page.getByText('QUESTS')).first();
    this.questCards = contentContainer.locator('> div').filter({ hasText: /BigBucks|Prediction Game|Refer A Friend/i });
    this.questProgress = this.page.locator('div').filter({ hasText: /\d+ of \d+/ });
  }

  async navigate() {
    // Navigation to quests might be via sidebar or direct URL
    await this.page.goto('https://stack-dev2.bigup.com/quests');
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for actual quest content to appear instead of networkidle
    await this.questTitle.waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * Returns a quest card by its name (e.g., "Watch a Replay").
   */
  getQuestCard(name: string): Locator {
    return this.questCards.filter({ hasText: name }).first();
  }

  /**
   * Gets the progress text or value of a specific quest.
   */
  async getProgress(questName: string): Promise<string> {
    const card = this.getQuestCard(questName);
    return await card.locator('.progress-text, [class*="progress"]').innerText();
  }
}

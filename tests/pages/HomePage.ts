import { Page, Locator, expect } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly gameCards: Locator;
  readonly predictionGameCards: Locator;
  readonly predictionButtons: Locator;
  readonly footerNavHome: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Game cards in the feed. They usually contain team names and 'Go to game' links.
    // Based on the user's codegen, they are inside containers with specific flex classes.
    this.gameCards = this.page.locator('div[class*="tifo-flex"][class*="tifo-gap-3"]');
    
    // Prediction-specific cards (identified by text "created a prediction game" and having a Skip button)
    this.predictionGameCards = this.page.locator('div[class*="tifo-flex"][class*="tifo-gap-3"]')
      .filter({ hasText: /created a prediction game/i })
      .filter({ has: this.page.getByRole('button', { name: /Skip/i }) });
    
    // Quick prediction buttons often seen on the feed (Yes/No/Skip)
    this.predictionButtons = this.page.getByRole('button', { name: /Yes|No|Skip/i });
    
    // Generic footer navigation
    this.footerNavHome = this.page.locator('div').filter({ hasText: /^Home$/ }).first();
  }

  async navigate() {
    await this.page.goto('https://stack-dev2.bigup.com/');
    // networkidle is often too strict and times out if background analytics/images are slow.
    await this.page.waitForLoadState('domcontentloaded');
    // Explicitly wait for the main feed to start appearing
    await this.gameCards.first().waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * Finds a game card that contains specific text (like team names).
   */
  getGameCard(searchText: string): Locator {
    return this.gameCards.filter({ hasText: searchText }).first();
  }

  /**
   * Clicks the 'more options' (three dots) button and then 'Go to game' from the menu.
   */
  async goToActivityPage(card: Locator) {
    // 1. Find the more options button (three dots) on the card
    // Based on the screenshot, it has aria-haspopup="dialog"
    const moreOptionsBtn = card.locator('button[aria-haspopup="dialog"]').first();
    await moreOptionsBtn.click();
    
    // 2. Click 'Go to game' from the menu that appears (global overlay)
    await this.page.getByRole('button', { name: /Go to game/i }).click();
  }

  /**
   * Makes a quick prediction directly from the home feed card.
   */
  async quickPredict(card: Locator, option: 'Yes' | 'No' | 'Skip', index: number = 0) {
    const btn = card.getByRole('button', { name: new RegExp(option, 'i') }).nth(index);
    // force: true needed because the navbar sidebar can intercept clicks in desktop viewport
    await btn.click({ force: true });
  }
}

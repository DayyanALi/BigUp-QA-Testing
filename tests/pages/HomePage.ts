import { Page, Locator, expect } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly gameCards: Locator;
  readonly predictionGameCards: Locator;
  readonly predictionButtons: Locator;
  submitEntryBar!: Locator;
  readonly footerNavHome: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // All game cards typically have a 'Go to game' link or three dots menu
    this.gameCards = this.page.locator('div[class*="tifo-flex"][class*="tifo-gap-3"]');
    
    // Prediction-specific cards (look for Yes/No buttons on an active match)
    this.predictionGameCards = this.gameCards.filter({ has: this.page.getByRole('button', { name: /Yes|No/i }) })
      .filter({ hasNotText: /Ended|Concluded|Entries closed/i });
    
    // quick prediction buttons
    this.predictionButtons = this.page.getByRole('button', { name: /Yes|No|Skip/i });
    
    // Floating submission bar that appears at the bottom after selections
    this.submitEntryBar = this.page.getByRole('button', { name: /Submit entry/i }).last();
    
    // Generic footer navigation
    this.footerNavHome = this.page.locator('nav, footer').getByRole('button', { name: /Home/i }).or(this.page.locator('div').filter({ hasText: /^Home$/ })).first();
  }

  async navigate() {
    await this.page.goto('https://stack-dev2.bigup.com/', { timeout: 60000 });
    await this.page.waitForLoadState('domcontentloaded');
    // Explicitly wait for the main feed to start appearing
    await this.gameCards.first().waitFor({ state: 'visible', timeout: 30000 });
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
    const moreOptionsBtn = card.locator('button[aria-haspopup="dialog"], [aria-label*="options"]').first();
    await moreOptionsBtn.evaluate(el => (el as HTMLElement).click());
    
    // 2. Click 'Go to game' from the menu that appears (global overlay)
    await this.page.getByRole('button', { name: /Go to game/i }).click();
  }

  /**
   * Navigates the carousel on a card using the next arrow.
   */
  async nextQuestion(card: Locator) {
    // The arrows are usually the last two buttons with SVGs in the bottom navigation area
    const nextBtn = card.locator('button').filter({ has: this.page.locator('svg') }).last();
    await nextBtn.evaluate(el => (el as HTMLElement).click());
    await this.page.waitForTimeout(800);
  }

  /**
   * Navigates the carousel on a card using the prev arrow.
   */
  async prevQuestion(card: Locator) {
    const prevBtn = card.locator('button').filter({ has: this.page.locator('svg') }).first();
    // Use .nth(1) if first is the menu, but typically the arrows are distinct in the bottom row.
    // Based on subagent, they are near the dots.
    await prevBtn.evaluate(el => (el as HTMLElement).click());
    await this.page.waitForTimeout(800);
  }

  /**
   * Clicks a specific dot in the carousel.
   */
  async clickDot(card: Locator, index: number) {
    const dot = card.locator('div.tifo-flex button').nth(index);
    await dot.click();
    await this.page.waitForTimeout(500);
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

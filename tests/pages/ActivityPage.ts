import { Page, Locator, expect } from '@playwright/test';

export class ActivityPage {
  readonly page: Page;
  
  // Tabs
  readonly leaderboardTab: Locator;
  readonly predictionsTab: Locator;
  readonly gameFeedTab: Locator;
  
  // Prediction Options
  readonly predictionOptions: Locator;
  readonly predictionCards: Locator;
  
  // Prediction Slip / Slipper
  readonly slipContainer: Locator;
  readonly flexPlayButton: Locator;
  readonly powerPlayButton: Locator;
  readonly amountInput: Locator;
  readonly quickAmountButtons: Locator;
  readonly playButton: Locator;
  readonly submitEntryButton: Locator;
  readonly confirmationButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Tabs
    const tabContainer = this.page.locator('#fantasy-competition-info-scroll').or(this.page.locator('body'));
    this.leaderboardTab = tabContainer.getByRole('button', { name: /Leaderboard/i }).first();
    this.predictionsTab = tabContainer.getByRole('button', { name: /Predictions/i }).first();
    this.gameFeedTab = tabContainer.getByRole('button', { name: /Game Feed/i }).first();
    
    // Individual prediction buttons (Yes / No)
    this.predictionOptions = this.page.getByRole('button', { name: /Yes|No/i });
    
    // Prediction cards (the blocks containing Yes/No buttons)
    this.predictionCards = this.page.locator('#fantasy-competition-info-scroll div[class*="tifo-p-2"][class*="tifo-rounded-md"]');
    
    // The betting slip/slipper
    this.slipContainer = this.page.locator('div').filter({ hasText: /Select entry amount/i }).last();
    this.flexPlayButton = this.page.getByRole('button', { name: /Flex Play/i });
    this.powerPlayButton = this.page.getByRole('button', { name: /Power Play/i });
    this.amountInput = this.page.getByRole('textbox');
    this.quickAmountButtons = this.page.locator('button').filter({ hasText: /^\$/ });
    
    // Submission buttons
    this.submitEntryButton = this.page.getByRole('button', { name: /Submit entry/i });
    // The final button in the drawer (can be 'Play', 'Submit', 'Enter', etc.)
    this.playButton = this.page.locator('div[class*="slipper"], div[class*="drawer"], [role="dialog"]')
      .locator('button')
      .filter({ hasNotText: /Flex|Power/i })
      .last();
    this.confirmationButton = this.page.getByRole('button', { name: /BigBucks paid entry/i });
  }

  /**
   * Dismisses any transient overlays like the "Great work" notifications 
   * that might intercept pointer events.
   */
  async dismissOverlays() {
    // Check for "Dismiss" buttons or common "X" close buttons
    const dismissBtn = this.page.getByRole('button', { name: /Dismiss|Close/i }).first();
    if (await dismissBtn.isVisible()) {
      await dismissBtn.click();
    }
    
    // Also try pressing Escape to clear any Radix/UI modals
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500); // Wait for modal animation
  }

  /**
   * Explicitly waits for predictions to load into the feed.
   */
  async waitForCards() {
    await this.predictionCards.first().waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * Selects a specific prediction choice on a specific card index.
   * This ensures we don't click multiple options on the same card.
   */
  async selectPredictionOnCard(cardIndex: number, choice: 'Yes' | 'No') {
    const card = this.predictionCards.nth(cardIndex);
    // await card.scrollIntoViewIfNeeded(); // Ensure it's in view
    const btn = card.getByRole('button', { name: choice, exact: false });
    
    try {
      await btn.click({ timeout: 5000 });
    } catch (e) {
      // If blocked, try to clear overlays and then force click
      await this.dismissOverlays();
      await btn.click({ force: true });
    }
  }

  /**
   * Selects a specific prediction by multiplier or index.
   */
  async selectPrediction(nameOrRegex: string | RegExp, index: number = 0) {
    const btn = this.page.getByRole('button', { name: nameOrRegex }).nth(index);
    
    // We use force: true because notifications (e.g. "Great work!") often pop up 
    // exactly after a prediction and cover the next selection button.
    try {
      await btn.click({ timeout: 5000 });
    } catch (e) {
      // If blocked, try to clear overlays and then force click
      await this.dismissOverlays();
      await btn.click({ force: true });
    }
  }

  /**
   * Sets the bet amount using the textbox.
   */
  async setAmount(amount: string) {
    await this.amountInput.fill(amount);
  }

  /**
   * Selects a quick amount button (e.g., "$5").
   */
  async selectQuickAmount(amountLabel: string) {
    await this.page.getByRole('button', { name: amountLabel, exact: true }).click();
  }

  /**
   * Completes the prediction flow by clicking Play and then the final confirmation.
   */
  async submitPrediction() {
    await this.playButton.click();
    if (await this.confirmationButton.isVisible({ timeout: 2000 })) {
      await this.confirmationButton.click();
    }
  }

  /**
   * Completes the multi-step prediction flow:
   * 1. Click 'Submit entry' (floating bar)
   * 2. Select amount (e.g., $6)
   * 3. Select entry type (Power Play)
   * 4. Click final 'Play'
   */
  async submitPredictionFlow(amount: string = '$6') {
    console.log('Clicking submit entry button...');
    await this.submitEntryButton.click({ force: true });
    
    // Check for "Entries closed" toast with reduced sensitivity to exact wording
    // We look for parts of the common error message
    const errorToast = this.page.locator('div, span, p').filter({ hasText: /Entries (has )?been closed/i });
    
    // Use a slightly longer wait for the toast to appear if the network is slow
    const isClosed = await errorToast.isVisible({ timeout: 4000 }).catch(() => false);
    
    if (isClosed) {
      const msg = await errorToast.innerText();
      console.error(`PREDICTION LOCKOUT DETECTED: ${msg}`);
      throw new Error(`PREDICTION_CLOSED: ${msg}`);
    }
    
    console.log('Proceeding to amount selection and Power Play...');
    
    // Wait for the drawer/slip to be fully visible and stable
    await this.page.waitForTimeout(2000); 
    
    // Amount selection is optional as it's not always required by the UI
    const amountBtn = this.page.getByRole('button', { name: amount, exact: true });
    if (await amountBtn.isVisible({ timeout: 5000 })) {
      console.log(`Selecting amount: ${amount}`);
      await amountBtn.click({ force: true });
    }
    
    // Power Play/Flex Play might be pre-selected or missing depending on pick count
    if (await this.powerPlayButton.isVisible({ timeout: 5000 })) {
      console.log('Clicking Power Play...');
      await this.powerPlayButton.click({ force: true });
    } else {
      console.log('Power Play button not visible, skipping...');
    }
    
    console.log('Clicking final Play button via JS...');
    await this.playButton.evaluate(el => (el as HTMLElement).click());
    
    // Final confirmation if a "Paid Entry" modal appears
    if (await this.confirmationButton.isVisible({ timeout: 5000 })) {
      console.log('Clicking BigBucks confirmation button via JS...');
      await this.confirmationButton.evaluate(el => (el as HTMLElement).click());
    }
    
    // Wait for the drawer to close or a success message
    await this.page.waitForTimeout(2000);
  }
}

import { Page, Locator, expect } from '@playwright/test';
import { FakeFixtureManager } from '../utils/FakeFixtureManager';

/**
 * PredictionGamePage — Modular page object for prediction-games E2E flow.
 *
 * Locators use roles, test IDs, and text patterns for robustness.
 */
export class PredictionGamePage {
  readonly page: Page;

  /* ── prediction cards (home / activity) ── */
  readonly predictionCards: Locator;

  /* ── my-picks / entry drawer ── */
  readonly submitEntryButton: Locator;
  readonly powerPlayButton: Locator;
  readonly flexPlayButton: Locator;
  readonly playButton: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Prediction cards: containers with Yes/No buttons on the activity page
    this.predictionCards = page.locator(
      'div[class*="tifo-p-2"][class*="tifo-rounded-md"]'
    ).filter({ has: page.locator('button:has-text("Yes")') });

    this.submitEntryButton = page.getByRole('button', { name: /Submit entry/i }).first();
    this.powerPlayButton = page.getByRole('button', { name: /Power Play/i }).first();
    this.flexPlayButton = page.getByRole('button', { name: /Flex Play/i }).first();
    this.playButton = page.getByRole('button', { name: /^Play/i }).last();
    this.confirmButton = page.getByRole('button', { name: /BigBucks paid entry|Pay|Confirm/i }).last();
  }

  /* ═══════════════════════════════════════════════════════
   * CREATE ACTIVITY — ensure a prediction game is running
   * ═══════════════════════════════════════════════════════ */

  /**
   * Creates a prediction game. After creation, clicks Share to copy
   * the activity link, extracts the activity UUID, and returns it.
   * e.g. returns "acfb570e-d662-41f1-9edf-7366a8a123a8"
   */
  async createPredictionGame(): Promise<string> {
    const now = new Date();
    const datePart = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    const timePart = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const activityName = `E2E Pred ${datePart} ${timePart}`;

    // Navigate to create page
    await this.page.goto('https://stack-dev2.bigup.com/create', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);

    // 1. Fill activity name
    await this.page.getByTestId('activity-name-input').click();
    await this.page.getByTestId('activity-name-input').fill(activityName);

    // 2. Select Watchalong type (combobox has no accessible name — filter by its displayed text)
    await this.page.getByRole('combobox').filter({ hasText: /Watchalong|Select/i }).first().click();
    await this.page.getByRole('option', { name: 'Watchalong' }).click();
    await this.page.waitForTimeout(500);

    // 3. Choose Fixture tab
    await this.page.getByRole('button', { name: 'Choose Fixture' }).click();
    await this.page.waitForTimeout(500);

    // 4. Open match selector and pick fixture with Prediction tag
    await this.page.getByTestId('match-selector').click();
    await this.page.waitForTimeout(1000);
    await this.selectFixtureWithPredictionTag();
    await this.page.waitForTimeout(500);

    // 5. Click Continue to create
    await this.page.getByRole('button', { name: 'Continue' }).click();

    // 6. Wait for "Successfully created!" page
    await this.page.getByText('Successfully created!').waitFor({ state: 'visible', timeout: 15000 });

    // 7. Grant clipboard permissions and click Share to copy link
    await this.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await this.page.getByRole('button', { name: 'Share' }).click();
    await this.page.waitForTimeout(1000);

    // 8. Read the copied link from clipboard
    const copiedLink = await this.page.evaluate(() => navigator.clipboard.readText());
    console.log(`✅ Created game: "${activityName}" | Link: ${copiedLink}`);

    // 9. Extract activity UUID from the link
    // Link format: https://stack-dev2.bigup.com/activity/<UUID>?type=watch
    const uuidMatch = copiedLink.match(/\/activity\/([a-f0-9-]+)/i);
    const activityId = uuidMatch ? uuidMatch[1] : '';

    if (!activityId) {
      console.warn('⚠️ Could not extract activity ID from link:', copiedLink);
    }

    return activityId;
  }

  /**
   * From the open fixture dropdown, selects the first fixture
   * that has a "Prediction" tag. Falls back to the first fixture.
   */
  private async selectFixtureWithPredictionTag() {
    const options = this.page.locator('div, li').filter({ hasText: /vs/i });
    const count = await options.count();

    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).innerText().catch(() => '');
      if (/prediction/i.test(text)) {
        await options.nth(i).click();
        console.log(`Selected fixture with Prediction tag: ${text.replace(/\n/g, ' ').trim()}`);
        return;
      }
    }

    // Fallback: first match with a time
    console.warn('No fixture with Prediction tag found, selecting first available.');
    const fallback = this.page.locator('div, li').filter({ hasText: /PM|AM/i }).first();
    if (await fallback.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fallback.click();
    }
  }

  /* ═══════════════════════════════════════════════════════
   * NAVIGATION
   * ═══════════════════════════════════════════════════════ */

  async navigateToHome() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.page.locator('div[class*="tifo-flex"][class*="tifo-gap-3"]')
      .first().waitFor({ state: 'visible', timeout: 30000 });
  }

  /**
   * Find the prediction game card on the home feed by its activity UUID.
   * On the home page, cards link to /activity/<UUID>?type=fantasy.
   * We find the card whose anchor href contains the UUID.
   */
  findGameCardByActivityId(activityId: string): Locator {
    return this.page
      .locator(`a[href*="/activity/${activityId}"]`)
      .locator('xpath=ancestor::div[contains(@class, "tifo-flex") and contains(@class, "tifo-gap-3")]')
      .first();
  }

  /** Fallback: first active prediction game card (has Yes/No, not ended). */
  getFirstActivePredictionCard(): Locator {
    return this.page
      .locator('div[class*="tifo-flex"][class*="tifo-gap-3"]')
      .filter({ has: this.page.getByRole('button', { name: /Yes|No/i }) })
      .filter({ hasNotText: /Ended|Concluded|Entries closed/i })
      .first();
  }

  /**
   * Navigate directly to the activity/fantasy page using the UUID.
   * This skips the home feed card lookup entirely.
   */
  async goToActivityPageDirect(activityId: string) {
    await this.page.goto(
      `https://stack-dev2.bigup.com/activity/${activityId}?type=fantasy`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    await this.page.waitForTimeout(2000);
  }

  /** Navigate to Activity Page via three-dot menu → Go to game. */
  async goToActivityPage(card: Locator) {
    const moreBtn = card.locator('button[aria-haspopup="dialog"]').first();
    await moreBtn.evaluate(el => (el as HTMLElement).click());
    await this.page.getByRole('button', { name: /Go to game/i }).click();
    await this.page.waitForTimeout(2000);
  }


  /* ═══════════════════════════════════════════════════════
   * PREDICTION SELECTION
   * ═══════════════════════════════════════════════════════ */

  /**
   * Select predictions on Activity Page cards.
   * Returns captured multiplier values (e.g. ["1.8", "1.4"]).
   */
  async makePredictions(
    picks: Array<{ index: number; choice: 'Yes' | 'No' | 'Skip' }>
  ): Promise<string[]> {
    const multipliers: string[] = [];

    // Wait for at least one prediction card to be visible
    await this.predictionCards.first().waitFor({ state: 'visible', timeout: 15000 });
    const totalCards = await this.predictionCards.count();
    console.log(`Found ${totalCards} prediction cards`);

    for (const pick of picks) {
      if (pick.choice === 'Skip') continue;
      if (pick.index >= totalCards) {
        console.warn(`Card index ${pick.index} out of range (${totalCards} cards), skipping.`);
        continue;
      }

      const card = this.predictionCards.nth(pick.index);
      await card.scrollIntoViewIfNeeded();

      // Find the Yes or No button inside this card
      const choiceBtn = card.locator(`button:has-text("${pick.choice}")`).first();
      await choiceBtn.waitFor({ state: 'visible', timeout: 5000 });

      // Extract multiplier from button text (e.g., "Yes  1.5x" → "1.5")
      const btnText = await choiceBtn.innerText();
      const match = btnText.match(/(\d+(\.\d+)?)x/);
      if (match) {
        multipliers.push(match[1]);
        console.log(`Pick ${pick.index} (${pick.choice}): ${match[1]}x`);
      }

      await choiceBtn.click({ force: true });
      await this.page.waitForTimeout(800);
    }

    return multipliers;
  }

  /**
   * Quick-predict on a Home Feed card carousel.
   */
  async makePredictionsOnHomeFeed(
    card: Locator,
    picks: Array<{ choice: 'Yes' | 'No' | 'Skip' }>
  ): Promise<string[]> {
    const multipliers: string[] = [];

    for (const { choice } of picks) {
      if (choice === 'Skip') {
        const skipBtn = card.getByRole('button', { name: /Skip/i });
        if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await skipBtn.click();
          await this.page.waitForTimeout(800);
        }
        continue;
      }

      const choiceBtn = card.getByRole('button', { name: new RegExp(choice, 'i') }).first();
      const btnText = await choiceBtn.innerText().catch(() => '');
      const match = btnText.match(/(\d+(\.\d+)?)x/);
      if (match) multipliers.push(match[1]);

      await choiceBtn.click({ force: true });
      await this.page.waitForTimeout(1200);
    }

    return multipliers;
  }

  /* ═══════════════════════════════════════════════════════
   * ENTRY SUBMISSION
   * ═══════════════════════════════════════════════════════ */

  /** Open the My Picks / Submit entry drawer. */
  async openEntryDrawer() {
    if (await this.submitEntryButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.submitEntryButton.evaluate(el => (el as HTMLElement).click());
    }
    await this.page.waitForTimeout(1500);
    await expect(
      this.page.locator('div, span, h2, h3').filter({ hasText: /Select entry amount/i }).last()
    ).toBeVisible({ timeout: 10000 });
  }

  /** Select entry amount ($3, $6, $9 or custom). */
  async selectEntryAmount(amount: string) {
    const btn = this.page.getByRole('button', { name: amount, exact: true });
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
    } else {
      await this.page.getByRole('textbox').last().fill(amount.replace('$', ''));
    }
    await this.page.waitForTimeout(500);
  }

  /** Select Power Play or Flex Play. */
  async selectEntryType(type: 'power' | 'flex') {
    const btn = type === 'power' ? this.powerPlayButton : this.flexPlayButton;
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
    }
    await this.page.waitForTimeout(500);
  }

  /** Read combined multiplier from drawer (e.g. "2.5x"). */
  async getCombinedMultiplier(): Promise<string> {
    const badge = this.page.locator('span, div')
      .filter({ hasText: /^\d+(\.\d+)?x$/ }).first();
    if (await badge.isVisible({ timeout: 3000 }).catch(() => false)) {
      return (await badge.innerText()).trim();
    }
    return 'unknown';
  }

  /** Click Play and handle confirmation dialog. */
  async clickPlayAndConfirm() {
    await expect(this.playButton).toBeEnabled({ timeout: 10000 });
    await this.playButton.evaluate(el => (el as HTMLElement).click());
    await this.page.waitForTimeout(2000);

    if (await this.confirmButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.confirmButton.evaluate(el => (el as HTMLElement).click());
    }
    await this.page.waitForTimeout(2000);
  }

  /** Full flow: open drawer → amount → type → play. */
  async submitFullEntry(amount: string = '$6', type: 'power' | 'flex' = 'power') {
    await this.openEntryDrawer();
    await this.selectEntryAmount(amount);
    await this.selectEntryType(type);
    const multiplier = await this.getCombinedMultiplier();
    await this.clickPlayAndConfirm();
    return multiplier;
  }

  /* ═══════════════════════════════════════════════════════
   * VERIFICATION
   * ═══════════════════════════════════════════════════════ */

  /**
   * Navigate to wallet and capture current BigBucks balance.
   * Wallet page at /wallet/bigbucks shows "Bigbucks Balance" followed by a number.
   */
  async captureWalletBalance(): Promise<number> {
    await this.page.goto('https://stack-dev2.bigup.com/wallet/bigbucks', {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });
    await this.page.waitForTimeout(2000);

    // The balance is the large number next to the BigBucks icon
    const balanceText = await this.page
      .locator('text=/^\\d+$/').first()
      .innerText({ timeout: 10000 });

    const balance = parseInt(balanceText.replace(/,/g, ''), 10);
    console.log(`💰 Wallet balance: ${balance} BigBucks`);
    return balance;
  }

  /**
   * Read the submit entry bar at the bottom of the activity page.
   * Returns { multiplier: "3.7x", payoutText: "$10 pays $37" }
   */
  async getSubmitEntryBarInfo(): Promise<{ multiplier: string; payoutText: string }> {
    const bar = this.submitEntryButton;

    // The payout text like "$10 pays $37"
    const payoutText = await bar.locator('span, div')
      .filter({ hasText: /\$\d+(?:\.\d+)?\s+pays\s+\$\d+(?:\.\d+)?/i })
      .first().innerText({ timeout: 5000 }).catch(() => '');

    // The multiplier badge like "3.7x" (separate element beside the bar)
    const multiplierBadge = this.page.locator('span, div')
      .filter({ hasText: /^\d+(\.\d+)?x$/ }).last();
    const multiplier = await multiplierBadge.innerText({ timeout: 5000 }).catch(() => 'unknown');

    console.log(`📊 Submit bar: ${payoutText} | Multiplier: ${multiplier}`);
    return { multiplier: multiplier.trim(), payoutText: payoutText.trim() };
  }

  /**
   * Read Power Play info from the entry drawer.
   * Returns { multiplier: "3.7x", payoutText: "$10 wins $37" }
   */
  async getDrawerPowerPlayInfo(): Promise<{ multiplier: string; payoutText: string }> {
    const powerBtn = this.powerPlayButton;
    const innerText = await powerBtn.innerText({ timeout: 5000 }).catch(() => '');
    // Format: "Power Play\n3.7x   $10 wins $37"
    const multMatch = innerText.match(/(\d+(\.\d+)?x)/);
    const payMatch = innerText.match(/(\$\d+(?:\.\d+)?\s+wins\s+\$\d+(?:\.\d+)?)/);
    return {
      multiplier: multMatch ? multMatch[1] : 'unknown',
      payoutText: payMatch ? payMatch[1] : 'unknown',
    };
  }

  /** Check payment succeeded (drawer closed or success toast). */
  async verifyPaymentSuccess() {
    const drawerOpen = await this.page
      .locator('div, span').filter({ hasText: /Select entry amount/i })
      .isVisible({ timeout: 3000 }).catch(() => false);

    if (!drawerOpen) {
      console.log('✅ Entry drawer closed — payment succeeded.');
    } else {
      console.warn('⚠️ Drawer still open — payment may have failed.');
    }
  }

  /** Dismiss overlays / toasts. */
  async dismissOverlays() {
    const btn = this.page.getByRole('button', { name: /Dismiss|Close|Got it/i }).first();
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) await btn.click();
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
  }

  /* ═══════════════════════════════════════════════════════
   * SETTLEMENT (USING FAKE FIXTURE API)
   * ═══════════════════════════════════════════════════════ */

  async triggerSettlement(fixtureId: number, options: { allCorrect?: boolean; partialCorrect?: boolean } = {}) {
    console.log(`[Settlement] Starting settlement for fixture ${fixtureId}`);
    
    // 1. Start the match
    FakeFixtureManager.startFakeFixture(fixtureId);
    await this.page.waitForTimeout(2000); // Give backend a sec to process state change

    // 2. Add events to satisfy E2E predictions
    // Pick 0 (Yes): Bukayo Saka > 1.5 penalties.
    // Pick 2 (Yes): Arsenal > 1.5 goals. 
    // Player ID 16827155 = Bukayo Saka (Adding goals to him also counts for Arsenal)
    const SAKA_ID = 16827155;
    const EVENT_GOAL = 14;
    const EVENT_PENALTY = 16;

    if (options.allCorrect) {
      FakeFixtureManager.addFakeEvent(fixtureId, 10, EVENT_PENALTY, SAKA_ID);
      FakeFixtureManager.addFakeEvent(fixtureId, 20, EVENT_PENALTY, SAKA_ID);
      FakeFixtureManager.addFakeEvent(fixtureId, 30, EVENT_GOAL, SAKA_ID);
      FakeFixtureManager.addFakeEvent(fixtureId, 40, EVENT_GOAL, SAKA_ID);
    } else if (options.partialCorrect) {
      // Just some events but not all. Example: 1 goal, 1 penalty
      FakeFixtureManager.addFakeEvent(fixtureId, 10, EVENT_PENALTY, SAKA_ID);
      FakeFixtureManager.addFakeEvent(fixtureId, 30, EVENT_GOAL, SAKA_ID);
    }

    await this.page.waitForTimeout(2000);

    // 3. End fixture to trigger final payouts
    FakeFixtureManager.endFakeFixture(fixtureId);
    
    // Wait for the backend chron/worker to process the payout
    console.log(`[Settlement] Waiting 5 seconds for backend to process payouts...`);
    await this.page.waitForTimeout(5000); 
  }

  /* ═══════════════════════════════════════════════════════
   * CALCULATORS
   * ═══════════════════════════════════════════════════════ */

  /** PowerPlay multiplier = product of all multipliers, floored to 1 decimal. */
  static calculatePowerPlayMultiplier(multipliers: string[]): number {
    const product = multipliers.reduce((acc, m) => acc * parseFloat(m), 1);
    return Math.floor(product * 10) / 10;
  }

  static calculatePayout(stake: number, multiplier: number): number {
    return Math.round(stake * multiplier * 100) / 100;
  }
}

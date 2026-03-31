import { test, expect, Locator } from '@playwright/test';
import { PredictionGamePage } from './pages/PredictionGamePage';
import { FakeFixtureManager } from './utils/FakeFixtureManager';

/**
 * E2E Prediction Games — TC_E2E_001 / TC_E2E_002 / TC_E2E_003
 *
 * Each test creates its own prediction game for full isolation.
 */
test.describe('Prediction Games — E2E Validation', () => {
  let pg: PredictionGamePage;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    pg = new PredictionGamePage(page);
  });

  /**
   * Creates a new prediction game, captures the activity UUID from
   * the Share link, then finds the card on the home feed by matching
   * the anchor href containing that UUID (with type=fantasy).
   */
  async function createAndFindGame(): Promise<{ card: Locator; activityId: string }> {
    const activityId = await pg.createPredictionGame();

    // Navigate to home and find the card by its activity link
    await pg.navigateToHome();

    if (activityId) {
      const card = pg.findGameCardByActivityId(activityId);
      if (await card.isVisible({ timeout: 10000 }).catch(() => false)) {
        console.log(`Found game card with activity ID: ${activityId}`);
        return { card, activityId };
      }
      console.warn(`Card for ${activityId} not found on home, will navigate directly.`);
    }

    // Fallback: use first available card
    const card = pg.getFirstActivePredictionCard();
    await expect(card).toBeVisible({ timeout: 15000 });
    return { card, activityId };
  }

  /* ══════════════════════════════════════════════════════
   * TC_E2E_001 — PowerPlay full E2E
   * Balance capture → Selection → Multiplier validation →
   * Payment → Balance verification → Settlement
   * ══════════════════════════════════════════════════════ */
  test('TC_E2E_001: PowerPlay E2E — entry, payment & payout', async ({ page }) => {
    let fixtureId: number | undefined;
    let createdActivityId: string | undefined;

    try {
      const stakeAmount = 6; // $6 entry

      // Phase 0: Capture wallet balance BEFORE payment
      const balanceBefore = await pg.captureWalletBalance();
      console.log("balance before", balanceBefore);

      // Phase 0b: Generate fake fixture in the backend, then create UI game
      fixtureId = FakeFixtureManager.createFakeFixture();
      console.log(`============ [TEST RUN INFO] ============`);
      console.log(`Fixture ID: ${fixtureId}`);

      const { card, activityId } = await createAndFindGame();
      createdActivityId = activityId; 
      console.log(`Activity ID: ${createdActivityId}`);
      console.log(`=========================================`);
      
      await pg.goToActivityPageDirect(activityId);
      await pg.predictionCards.first().waitFor({ state: 'visible', timeout: 15000 });

      // Phase 1: Selection & Validation
      const available = await pg.predictionCards.count();
      const picks: Array<{ index: number; choice: 'Yes' | 'No' | 'Skip' }> = [
        { index: 0, choice: 'Yes' },
        { index: 1, choice: 'No' },
        { index: 2, choice: 'Yes' },
        ...(available > 3 ? [{ index: 3, choice: 'Skip' as const }] : []),
      ];

      const multipliers = await pg.makePredictions(picks);
      expect(multipliers.length).toBeGreaterThanOrEqual(2);
      console.log(`Individual multipliers: [${multipliers.join(', ')}]`);

      // Verify Play button is enabled (at least 2 selections made)
      await expect(pg.submitEntryButton).toBeVisible({ timeout: 5000 });

      // Validate combined multiplier on submit bar
      const barInfo = await pg.getSubmitEntryBarInfo();
      const calculatedMultiplier = PredictionGamePage.calculatePowerPlayMultiplier(multipliers);
      console.log(`Bar multiplier: ${barInfo.multiplier} | Calculated: ${calculatedMultiplier}x`);
      expect(barInfo.multiplier).toBe(`${calculatedMultiplier}x`);

      // Phase 2: Entry Submission & Payment
      await pg.openEntryDrawer();
      await pg.selectEntryAmount(`$${stakeAmount}`);
      await pg.selectEntryType('power');

      // Validate drawer Power Play info
      const drawerInfo = await pg.getDrawerPowerPlayInfo();
      console.log(`Drawer: multiplier=${drawerInfo.multiplier}, payout=${drawerInfo.payoutText}`);
      expect(drawerInfo.multiplier).toBe(`${calculatedMultiplier}x`);

      // Verify expected payout: stake × multiplier
      const expectedPayout = PredictionGamePage.calculatePayout(stakeAmount, calculatedMultiplier);
      const expectedPayoutStr = expectedPayout % 1 === 0 ? expectedPayout.toString() : expectedPayout.toFixed(2);
      expect(drawerInfo.payoutText).toContain(`$${expectedPayoutStr}`);
      console.log(`Expected payout: $${stakeAmount} × ${calculatedMultiplier}x = $${expectedPayoutStr}`);

      // Submit
      await pg.clickPlayAndConfirm();
      console.log("Payment submitted");

      // Phase 3: Payment Verification
      await pg.verifyPaymentSuccess();
      console.log("Payment verified");

      // Capture wallet balance AFTER payment
      const balanceAfterPayment = await pg.captureWalletBalance();
      console.log(`Balance: before=${balanceBefore}, after=${balanceAfterPayment}, stake=${stakeAmount}`);
      expect(balanceAfterPayment).toBe(balanceBefore - stakeAmount);

      // Phase 4: Settlement execution
      // Trigger all-correct settlement via backend fake fixture scripts
      await pg.triggerSettlement(fixtureId, { allCorrect: true });
      
      // Phase 5: Final Payout Verification
      const balanceAfterSettlement = await pg.captureWalletBalance();
      const expectedFinalBalance = Math.round(balanceAfterPayment + expectedPayout);
      console.log(`[Settlement] Expected: balance = ${balanceAfterPayment} + $${expectedPayout} = $${expectedFinalBalance}`);
      console.log(`[Settlement] Actual final balance: ${balanceAfterSettlement}`);
      
      expect(balanceAfterSettlement).toBe(expectedFinalBalance);

    } finally {
      // Phase 6: DB Cleanup
      console.log('🧹 Cleaning up DB resources...');
      if (createdActivityId) {
        try { FakeFixtureManager.deleteActivity(createdActivityId); } catch (e) { console.warn('Failed to delete activity:', e); }
      }
      if (fixtureId) {
        try { FakeFixtureManager.deleteFakeFixture(fixtureId); } catch (e) { console.warn('Failed to delete fake fixture:', e); }
      }
    }
  });

  /* ══════════════════════════════════════════════════════
   * TC_E2E_002 — PowerPlay Loss (One prediction incorrect)
   * ══════════════════════════════════════════════════════ */
  test('TC_E2E_002: PowerPlay E2E — one incorrect prediction yields $0 payout', async ({ page }) => {
    let fixtureId: number | undefined;
    let createdActivityId: string | undefined;

    try {
      const stakeAmount = 3; 
      const balanceBefore = await pg.captureWalletBalance();

      fixtureId = FakeFixtureManager.createFakeFixture();
      console.log(`============ [TEST RUN INFO] ============`);
      console.log(`Fixture ID: ${fixtureId}`);

      const { card, activityId } = await createAndFindGame();
      createdActivityId = activityId; 
      console.log(`Activity ID: ${createdActivityId}`);
      console.log(`=========================================`);

      await pg.goToActivityPageDirect(activityId);
      await pg.predictionCards.first().waitFor({ state: 'visible', timeout: 15000 });

      // Predictions: 1=Yes, 2=No, 3=Yes 
      const available = await pg.predictionCards.count();
      const picks: Array<{ index: number; choice: 'Yes' | 'No' | 'Skip' }> = [
        { index: 0, choice: 'Yes' },
        { index: 1, choice: 'No' },
        { index: 2, choice: 'Yes' },
        ...(available > 3 ? [{ index: 3, choice: 'Skip' as const }] : []),
      ];

      await pg.makePredictions(picks);
      await pg.openEntryDrawer();
      await pg.selectEntryAmount(`$${stakeAmount}`);
      await pg.selectEntryType('power');
      await pg.clickPlayAndConfirm();
      await pg.verifyPaymentSuccess();

      const balanceAfterPayment = await pg.captureWalletBalance();
      
      // Settlement (Partial Correct for PowerPlay = Loss = $0 Payout)
      await pg.triggerSettlement(fixtureId, { partialCorrect: true });
      
      // Verify no payout was added
      const balanceAfterSettlement = await pg.captureWalletBalance();
      console.log(`[Settlement - Loss] Expected: balance = ${balanceAfterPayment}`);
      expect(balanceAfterSettlement).toBe(balanceAfterPayment);
    } finally {
      // Phase 6: DB Cleanup
      console.log('🧹 Cleaning up DB resources...');
      if (createdActivityId) {
        try { FakeFixtureManager.deleteActivity(createdActivityId); } catch (e) { console.warn('Failed to delete activity:', e); }
      }
      if (fixtureId) {
        try { FakeFixtureManager.deleteFakeFixture(fixtureId); } catch (e) { console.warn('Failed to delete fake fixture:', e); }
      }
    }
  });

  /* ══════════════════════════════════════════════════════
   * TC_E2E_003 — FlexPlay Partial Win
   * ══════════════════════════════════════════════════════ */
  test('TC_E2E_003: FlexPlay partial win', async ({ page }) => {
    let fixtureId: number | undefined;
    let createdActivityId: string | undefined;

    try {
      // Phase 0: Create game & navigate
      fixtureId = FakeFixtureManager.createFakeFixture();
      console.log(`============ [TEST RUN INFO] ============`);
      console.log(`Fixture ID: ${fixtureId}`);

      const { card, activityId } = await createAndFindGame();
      createdActivityId = activityId; 
      console.log(`Activity ID: ${createdActivityId}`);
      console.log(`=========================================`);

      await pg.goToActivityPageDirect(activityId);
      await pg.predictionCards.first().waitFor({ state: 'visible', timeout: 15000 });

      // Phase 1: Select ≥3 predictions (required for FlexPlay)
      const available = await pg.predictionCards.count();
      const pickCount = Math.max(3, Math.min(available, 4));
      const picks: Array<{ index: number; choice: 'Yes' | 'No' | 'Skip' }> = [];
      for (let i = 0; i < pickCount; i++) {
        picks.push({ index: i, choice: i % 2 === 0 ? 'Yes' : 'No' });
      }

      const multipliers = await pg.makePredictions(picks);
      expect(multipliers.length).toBeGreaterThanOrEqual(3);

      // Phase 2: Submit FlexPlay entry
      await pg.submitFullEntry('$6', 'flex');

      // Phase 3: Verify payment
      await pg.verifyPaymentSuccess();

      // Phase 4: Settlement — partial correct → WON (Partial)
      await pg.triggerSettlement(fixtureId, { partialCorrect: true });
      console.log('Expected: Status=WON(Partial), payout=FlexPlay tier');
    } finally {
      // Phase 6: DB Cleanup
      console.log('🧹 Cleaning up DB resources...');
      if (createdActivityId) {
        try { FakeFixtureManager.deleteActivity(createdActivityId); } catch (e) { console.warn('Failed to delete activity:', e); }
      }
      if (fixtureId) {
        try { FakeFixtureManager.deleteFakeFixture(fixtureId); } catch (e) { console.warn('Failed to delete fake fixture:', e); }
      }
    }
  });
});

import { Page, Locator, expect } from '@playwright/test';

export class StreamPage {
  readonly page: Page;
  
  readonly videoPlayer: Locator;
  readonly playPauseButton: Locator;
  readonly progressBar: Locator;
  readonly skipForwardButton: Locator;
  readonly skipBackwardButton: Locator;
  readonly timeDisplay: Locator;
  
  readonly overviewTab: Locator;
  readonly gameTab: Locator;
  readonly chatTab: Locator;

  constructor(page: Page) {
    this.page = page;
    
    this.videoPlayer = this.page.locator('video');
    
    this.playPauseButton = this.page.getByRole('button', { name: /play$|pause$/i })
      .or(this.page.locator('[class*="bigPlayButton"]'))
      .or(this.page.locator('.vjs-play-control'))
      .first();

    this.progressBar = this.page.getByRole('slider')
      .or(this.page.locator('input[type="range"]'))
      .or(this.page.locator('[class*="scrubBar"], [class*="scrubBarContainer"]').first())
      .or(this.page.locator('video + div > div').first());
      
    this.skipForwardButton = this.page.getByRole('button', { name: /forward 10|skip forward/i })
      .or(this.page.locator('[class*="bigControls"] > button:last-of-type'))
      .first();
      
    this.skipBackwardButton = this.page.getByRole('button', { name: /backward 10|skip backward|back 10/i })
      .or(this.page.locator('[class*="bigControls"] > button:first-of-type'))
      .first();
      
    this.timeDisplay = this.page.locator('.time-display, .current-time');
    
    this.overviewTab = this.page.getByRole('tab', { name: /overview/i }).or(this.page.locator('text="Overview"'));
    this.gameTab = this.page.getByRole('tab', { name: /game/i }).or(this.page.locator('text="Game"'));
    this.chatTab = this.page.getByRole('tab', { name: /chat/i }).or(this.page.locator('text="Chat"'));
  }

  async navigateToStreamReplay() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    
    await this.page.locator('a[href*="/activity/"]').first().waitFor({ state: 'visible', timeout: 30000 });
    
    const replayCard = this.page.locator('a[href*="/activity/"]').filter({ hasText: 'Replay' }).first();
    
    let found = false;
    for (let i = 0; i < 5; i++) {
      if (await replayCard.isVisible()) {
        found = true;
        break;
      }
      await this.page.mouse.wheel(0, 500);
      await this.page.waitForTimeout(1000);
    }
    
    if (!found) {
      await expect(replayCard).toBeVisible({ timeout: 10000 });
    }
    
    await replayCard.click();
    
    // Only wait for player to exist — do NOT force play here
    await expect(this.videoPlayer).toBeVisible({ timeout: 20000 });
  }

  // Separate helper for playing — only called by tests that need it
  async forcePlay() {
    await this.videoPlayer.evaluate((vid: HTMLVideoElement) => {
      vid.muted = true;
      vid.volume = 0;
      return vid.play().catch(() => {});
    });
    await this.page.waitForTimeout(2000);

    // If still paused (WebKit), try clicking the button directly
    const isPaused = await this.videoPlayer.evaluate((vid: HTMLVideoElement) => vid.paused);
    if (isPaused) {
      await this.playPauseButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async forcePause() {
    await this.videoPlayer.evaluate((vid: HTMLVideoElement) => {
      vid.pause();
    });
  }

  async switchTab(tabName: 'overview' | 'game' | 'chat') {
    let tab: Locator;
    switch (tabName) {
      case 'overview': tab = this.overviewTab; break;
      case 'game': tab = this.gameTab; break;
      case 'chat': tab = this.chatTab; break;
      default: return;
    }

    if (await tab.isVisible()) {
      // Use JS-based click to bypass interception by layout overlays (e.g. landscape mode)
      await tab.evaluate((el: HTMLElement) => el.click());
      await this.page.waitForTimeout(1000);
    }
  }
}
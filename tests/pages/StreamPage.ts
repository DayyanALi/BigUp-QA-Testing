// import { Page, Locator, expect } from '@playwright/test';

// export class StreamPage {
//   readonly page: Page;
  
//   // Video Player Elements
//   readonly videoPlayer: Locator;
//   readonly playPauseButton: Locator;
//   readonly progressBar: Locator;
//   readonly skipForwardButton: Locator;
//   readonly skipBackwardButton: Locator;
//   readonly timeDisplay: Locator;
  
//   // Tab Elements (assuming standard tab structure)
//   readonly overviewTab: Locator;
//   readonly gameTab: Locator;
//   readonly chatTab: Locator;

//   constructor(page: Page) {
//     this.page = page;
    
//     // Video Locators (Generic HTML5 Video + typical custom controls)
//     this.videoPlayer = this.page.locator('video');
    
//     // Play/Pause button
//     // Based on the user screenshot of the "_bigControls" div:
//     this.playPauseButton = this.page.getByRole('button', { name: /play$|pause$/i })
//       .or(this.page.locator('[class*="bigPlayButton"]'))
//       .or(this.page.locator('.vjs-play-control'))
//       .first();
//           // Progress bar/timeline is usually a slider input or an element with role="slider"
//     // The UI screenshot shows they use a custom scrub bar with classes like "_scrubBarContainer_1xxx"
//     this.progressBar = this.page.getByRole('slider')
//       .or(this.page.locator('input[type="range"]'))
//       .or(this.page.locator('[class*="scrubBar"], [class*="scrubBarContainer"]').first())
//       .or(this.page.locator('video + div > div').first());
      
//     // Skip buttons
//     // The screenshot shows these are the first and last generic buttons inside the "_bigControls" div
//     this.skipForwardButton = this.page.getByRole('button', { name: /forward 10|skip forward/i })
//       .or(this.page.locator('[class*="bigControls"] > button:last-of-type'))
//       .first();
      
//     this.skipBackwardButton = this.page.getByRole('button', { name: /backward 10|skip backward|back 10/i })
//       .or(this.page.locator('[class*="bigControls"] > button:first-of-type'))
//       .first();
      
//     // Time display (e.g. "01:23 / 10:00")
//     this.timeDisplay = this.page.locator('.time-display, .current-time');
    
//     // Tabs
//     this.overviewTab = this.page.getByRole('tab', { name: /overview/i }).or(this.page.locator('text="Overview"'));
//     this.gameTab = this.page.getByRole('tab', { name: /game/i }).or(this.page.locator('text="Game"'));
//     this.chatTab = this.page.getByRole('tab', { name: /chat/i }).or(this.page.locator('text="Chat"'));
//   }

//   /**
//    * Navigate to a valid stream replay.
//    * This navigates to the homepage and looks for a post that specifically has a "Replay" badge.
//    */
//   async navigateToStreamReplay() {
//     // Use domcontentloaded instead of default 'load' which times out on media-heavy pages
//     await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    
//     // Wait for at least one feed card to appear (indicates the page has loaded feed data)
//     await this.page.locator('a[href*="/activity/"]').first().waitFor({ state: 'visible', timeout: 30000 });
    
//     // Look for the "Replay" badge or text in the feed
//     const replayCard = this.page.locator('a[href*="/activity/"]').filter({ hasText: 'Replay' }).first();
    
//     // Scroll down to find a replay card if not immediately visible
//     let found = false;
//     for (let i = 0; i < 5; i++) {
//       if (await replayCard.isVisible()) {
//         found = true;
//         break;
//       }
//       await this.page.mouse.wheel(0, 500);
//       await this.page.waitForTimeout(1000);
//     }
    
//     if (!found) {
//       // One more explicit wait in case it just loaded
//       await expect(replayCard).toBeVisible({ timeout: 10000 });
//     }
    
//     await replayCard.click();
    
//     // Wait for the video player to appear
//     await expect(this.videoPlayer).toBeVisible({ timeout: 20000 });
    
//     // Force-play via JS to bypass headless autoplay restrictions
//     await this.videoPlayer.evaluate((vid: HTMLVideoElement) => {
//       vid.muted = true; // Muted autoplay is allowed in all browsers
//       return vid.play().catch(() => {});
//     });
//     await this.page.waitForTimeout(1000);
//   }
// }


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
import { test, expect } from '@playwright/test';
import { BiggiePage } from './pages/BiggiePage';
import { ChatPage } from './pages/ChatPage';
import { StreamPage } from './pages/StreamPage';

test.describe('End-to-End User Journeys', () => {
  
  test('E2E-001: The Engaged Fan Journey (Stream -> Chat -> AI)', async ({ page }) => {
    // 1. Initialize Page Objects
    const streamPage = new StreamPage(page);
    const chatPage = new ChatPage(page);
    const biggiePage = new BiggiePage(page);

    // 2. User starts by finding and watching a stream replay
    await test.step('Navigate to and interact with a Stream Replay', async () => {
      await streamPage.navigateToStreamReplay();
      await expect(streamPage.videoPlayer).toBeVisible({ timeout: 15000 });
      
      // Play the video and skip forward to simulate watching
      await streamPage.playPauseButton.click({ force: true });
      await page.waitForTimeout(2000);
      await streamPage.skipForwardButton.click({ force: true });
      
      const isPlaying = await streamPage.videoPlayer.evaluate((vid: HTMLVideoElement) => !vid.paused);
      expect(isPlaying).toBe(true);
    });

    // 3. While on the stream page, user switches to the Chat tab to discuss the match
    await test.step('Participate in the Stream Community Chat', async () => {
      // Assuming the StreamPage has the ChatTab locator we built earlier
      if (await streamPage.chatTab.isVisible()) {
        await streamPage.chatTab.click();
      }
      
      const chatMessage = `What a play! Timestamp: ${Date.now()}`;
      await chatPage.enterMessage(chatMessage);
      await chatPage.send();
      
      // Verify message sent
      await expect(chatPage.messages.filter({ hasText: chatMessage })).toBeVisible({ timeout: 10000 });
    });

    // 4. User then decides to ask the Biggie AI for detailed stats about the teams playing
    await test.step('Query Biggie AI for Match Stats', async () => {
      // Navigate to Biggie hub directly
      await biggiePage.navigateToBiggieHub();
      await biggiePage.startNewChat();
      
      const beforeCount = await biggiePage.allMessages.count();
      
      // Ask a question
      await biggiePage.promptBiggie('Give me the head-to-head stats for the teams we just watched.');
      
      // Expect both prompt and AI response to appear
      await expect(biggiePage.allMessages).toHaveCount(beforeCount + 2, { timeout: 15000 });
    });
  });

  test('E2E-002: Community AI Integration Journey', async ({ page }) => {
    const chatPage = new ChatPage(page);
    
    // 1. User navigates to their favorite community
    await test.step('Navigate to Community feed', async () => {
      await chatPage.navigateToCommunityChat('alias'); 
      await expect(chatPage.chatInput).toBeVisible({ timeout: 10000 });
    });

    // 2. User tags Biggie directly in the community feed
    await test.step('Tag Biggie in community chat', async () => {
      const prompt = `@Biggie Who is the top scorer globally? - ${Date.now()}`;
      await chatPage.enterMessage(prompt);
      await chatPage.send();

      // Wait for Biggie's response to drop in the community feed
      const biggieResponse = chatPage.messages.filter({ hasText: /Biggie/i }).last();
      await expect(biggieResponse).toBeVisible({ timeout: 15000 });
      
      const responseText = await biggieResponse.textContent() || '';
      expect(responseText.length).toBeGreaterThan(prompt.length); // Ensure it's not just our echo
    });
  });

});
